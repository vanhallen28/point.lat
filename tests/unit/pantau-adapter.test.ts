import { generateKeyPairSync } from 'crypto'
import { describe, expect, it } from 'vitest'

import { modeAdapter } from '@/modules/indexer/adapter'
import { SCOPE_WEBMASTERS, URL_TOKEN, type Fetch } from '@/modules/indexer/google'
import { adapterDariEnv } from '@/modules/pantau/adapter'
import { permintaanAnalitik } from '@/modules/pantau/aturan'
import { adapterAsli, AGEN_PEMERIKSA, urlAnalitik } from '@/modules/pantau/asli'
import { adapterPalsu } from '@/modules/pantau/palsu'

// Kunci RSA sekali pakai untuk tes: bentuknya sama dengan `private_key` di file JSON akun layanan.
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } })
const AKUN = { client_email: 'pantau@point-lat.iam.gserviceaccount.com', private_key: privateKey }

type Permintaan = { url: string; method: string; headers: Record<string, string>; body: string | null; redirect?: string }

/** `fetch` tiruan: mencatat permintaan dan menjawab dari daftar, berurutan. */
function fetchTiruan(...jawaban: (Response | Error)[]) {
  const permintaan: Permintaan[] = []
  const ambil: Fetch = async (input, init) => {
    permintaan.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: (init?.body as string | undefined) ?? null,
      redirect: init?.redirect,
    })
    const berikut = jawaban.shift()
    if (!berikut) throw new Error('Permintaan tidak terduga')
    if (berikut instanceof Error) throw berikut
    return berikut
  }
  return { ambil, permintaan }
}

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const token = () => json({ access_token: 'token-1', expires_in: 3599, token_type: 'Bearer' })
const PERMINTAAN = permintaanAnalitik({ startDate: '2026-10-06', endDate: '2026-11-02' }, 'page')
const BARIS = [{ keys: ['https://point.lat/a'], clicks: 3, impressions: 40, ctr: 0.075, position: 5.2 }]

describe('Search Analytics lewat fetch', () => {
  it('POST searchAnalytics/query ke properti (di-encode) dengan token scope webmasters; jawaban rows', async () => {
    const { ambil, permintaan } = fetchTiruan(token(), json({ rows: BARIS, responseAggregationType: 'byPage' }))
    const hasil = await adapterAsli({ akun: AKUN, fetch: ambil }).analitik('sc-domain:point.lat', PERMINTAAN)
    expect(hasil).toEqual({ status: 'berhasil', baris: BARIS })
    expect(permintaan[0].url).toBe(URL_TOKEN)
    expect(new URLSearchParams(permintaan[0].body ?? '').get('assertion')?.split('.')).toHaveLength(3)
    expect(JSON.parse(Buffer.from(new URLSearchParams(permintaan[0].body ?? '').get('assertion')!.split('.')[1], 'base64url').toString()).scope).toBe(SCOPE_WEBMASTERS)
    expect(permintaan[1]).toMatchObject({
      url: 'https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Apoint.lat/searchAnalytics/query',
      method: 'POST',
      headers: { authorization: 'Bearer token-1', 'content-type': 'application/json' },
    })
    expect(JSON.parse(permintaan[1].body ?? '')).toEqual(PERMINTAAN)
    expect(urlAnalitik('https://point.lat/')).toBe('https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fpoint.lat%2F/searchAnalytics/query')
  })

  it('jawaban tanpa rows (belum ada data) menjadi daftar kosong', async () => {
    const { ambil } = fetchTiruan(token(), json({ responseAggregationType: 'auto' }))
    expect(await adapterAsli({ akun: AKUN, fetch: ambil }).analitik('sc-domain:point.lat', PERMINTAAN)).toEqual({ status: 'berhasil', baris: [] })
  })

  it('403 dengan saran izin Owner, 429 sebagai kuota habis, jaringan putus, dan tanpa akun layanan dilewati', async () => {
    const tolak = fetchTiruan(token(), json({ error: { code: 403, message: 'User does not have sufficient permission for site.', status: 'PERMISSION_DENIED' } }, 403))
    const hasil403 = await adapterAsli({ akun: AKUN, fetch: tolak.ambil }).analitik('sc-domain:point.lat', PERMINTAAN)
    expect(hasil403).toMatchObject({ status: 'gagal', kodeHttp: 403, kuotaHabis: false })
    expect(hasil403.status === 'gagal' && hasil403.pesan).toMatch(/^Google menjawab 403: User does not have sufficient permission for site\. Pastikan email akun layanan/)

    const kuota = fetchTiruan(token(), json({ error: { code: 429, message: 'Search Analytics load quota exceeded', status: 'RESOURCE_EXHAUSTED' } }, 429))
    expect(await adapterAsli({ akun: AKUN, fetch: kuota.ambil }).analitik('sc-domain:point.lat', PERMINTAAN)).toEqual({
      status: 'gagal',
      kodeHttp: 429,
      kuotaHabis: true,
      pesan: 'Google menjawab 429: Search Analytics load quota exceeded.',
    })

    const putus = fetchTiruan(token(), new TypeError('fetch failed'))
    expect(await adapterAsli({ akun: AKUN, fetch: putus.ambil }).analitik('sc-domain:point.lat', PERMINTAAN)).toEqual({
      status: 'gagal',
      kodeHttp: null,
      pesan: 'Tidak bisa menghubungi Google: fetch failed.',
    })

    const tanpaAkun = fetchTiruan()
    expect(await adapterAsli({ akun: { alasan: 'Akun layanan belum diatur.' }, fetch: tanpaAkun.ambil }).analitik('sc-domain:point.lat', PERMINTAAN)).toEqual({
      status: 'dilewati',
      pesan: 'Akun layanan belum diatur.',
    })
    expect(tanpaAkun.permintaan).toHaveLength(0)
  })
})

describe('pemeriksa tautan lewat fetch', () => {
  it('HEAD dengan redirect diikuti dan agen pemeriksa; GET bila HEAD ditolak 405', async () => {
    const baik = fetchTiruan(new Response(null, { status: 200 }))
    const adapter = adapterAsli({ akun: AKUN, fetch: baik.ambil })
    expect(await adapter.periksaTautan('https://pajak.go.id/id/pph-21')).toEqual({ kodeHttp: 200, galat: null })
    expect(baik.permintaan[0]).toMatchObject({ method: 'HEAD', redirect: 'follow', headers: { 'user-agent': AGEN_PEMERIKSA } })

    const ditolak = fetchTiruan(new Response(null, { status: 405 }), new Response('isi', { status: 200 }))
    expect(await adapterAsli({ akun: AKUN, fetch: ditolak.ambil }).periksaTautan('https://contoh.example/a')).toEqual({ kodeHttp: 200, galat: null })
    expect(ditolak.permintaan.map((p) => p.method)).toEqual(['HEAD', 'GET'])

    const hilang = fetchTiruan(new Response(null, { status: 404 }))
    expect(await adapterAsli({ akun: AKUN, fetch: hilang.ambil }).periksaTautan('https://contoh.example/hilang')).toEqual({ kodeHttp: 404, galat: null })
  })

  it('batas waktu dan domain yang tidak ada menjadi galat berkode, tidak melempar', async () => {
    const lambat = fetchTiruan(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))
    expect(await adapterAsli({ akun: AKUN, fetch: lambat.ambil }).periksaTautan('https://lambat.example/')).toEqual({
      kodeHttp: null,
      galat: 'The operation was aborted due to timeout',
      kodeGalat: 'TimeoutError',
    })
    const tanpaDomain = fetchTiruan(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } }))
    expect(await adapterAsli({ akun: AKUN, fetch: tanpaDomain.ambil }).periksaTautan('https://hilang.example/')).toEqual({
      kodeHttp: null,
      galat: 'fetch failed',
      kodeGalat: 'ENOTFOUND',
    })
  })
})

describe('adapter palsu dan pilihan dari env', () => {
  it('tanpa data dilewati; dengan data dipotong sesuai startRow dan rowLimit; jawaban galat lebih dulu', async () => {
    const palsu = adapterPalsu()
    expect(await palsu.analitik('sc-domain:point.lat', PERMINTAAN)).toEqual({ status: 'dilewati', pesan: 'Adapter palsu tidak mengambil data Search Console.' })
    palsu.dataAnalitik = () => Array.from({ length: 30_000 }, (_, i) => ({ keys: [`https://point.lat/${i}`], clicks: 1, impressions: 1, ctr: 1, position: 1 }))
    const pertama = await palsu.analitik('sc-domain:point.lat', PERMINTAAN)
    const kedua = await palsu.analitik('sc-domain:point.lat', { ...PERMINTAAN, startRow: 25_000 })
    expect(pertama.status === 'berhasil' && pertama.baris.length).toBe(25_000)
    expect(kedua.status === 'berhasil' && kedua.baris.length).toBe(5_000)
    palsu.jawabAnalitik({ status: 'gagal', kodeHttp: 500, pesan: 'Galat.' })
    expect(await palsu.analitik('sc-domain:point.lat', PERMINTAAN)).toEqual({ status: 'gagal', kodeHttp: 500, pesan: 'Galat.' })
    expect(palsu.permintaan).toHaveLength(4)

    palsu.jawabanTautan.set('https://hilang.example/', { kodeHttp: 404, galat: null })
    expect(await palsu.periksaTautan('https://hilang.example/')).toEqual({ kodeHttp: 404, galat: null })
    expect(await palsu.periksaTautan('https://lain.example/')).toEqual({ kodeHttp: 200, galat: null })
    expect(palsu.dibuka).toEqual(['https://hilang.example/', 'https://lain.example/'])
    palsu.reset()
    expect([palsu.permintaan.length, palsu.dibuka.length, palsu.dataAnalitik]).toEqual([0, 0, null])
  })

  it('saklar INDEXER_ADAPTER yang sama dengan Mesin Indexing; asli tanpa akun layanan melewati Search Analytics', async () => {
    expect(modeAdapter({ INDEXER_ADAPTER: 'asli' })).toBe('asli')
    expect(modeAdapter({ INDEXER_ADAPTER: 'palsu', NODE_ENV: 'production' })).toBe('palsu')
    expect(modeAdapter({ NODE_ENV: 'test' })).toBe('palsu')
    expect(() => modeAdapter({ NODE_ENV: 'production' })).toThrow('INDEXER_ADAPTER wajib diisi di produksi')
    expect(await adapterDariEnv({ INDEXER_ADAPTER: 'asli' }).analitik('sc-domain:point.lat', PERMINTAAN)).toEqual({
      status: 'dilewati',
      pesan: 'Akun layanan Google belum diatur (env GOOGLE_SERVICE_ACCOUNT_JSON kosong).',
    })
    expect(await adapterDariEnv({ INDEXER_ADAPTER: 'palsu' }).analitik('sc-domain:point.lat', PERMINTAAN)).toMatchObject({ status: 'dilewati' })
  })
})
