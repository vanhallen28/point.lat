import { createVerify, generateKeyPairSync } from 'crypto'
import { describe, expect, it } from 'vitest'

import { adapterDariEnv } from '@/modules/indexer/adapter'
import { adapterAsli, URL_INDEXING_API, URL_INDEXNOW, URL_INSPEKSI } from '@/modules/indexer/asli'
import { bacaAkunLayanan, buatJwt, SCOPE_INDEXING, SCOPE_WEBMASTERS, URL_TOKEN, type Fetch } from '@/modules/indexer/google'
import { adapterPalsu } from '@/modules/indexer/palsu'

// Kunci RSA sekali pakai untuk tes: bentuknya sama dengan `private_key` di file JSON akun layanan.
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
})
const AKUN = { client_email: 'indexer@point-lat.iam.gserviceaccount.com', private_key: privateKey }

type Permintaan = { url: string; method: string; headers: Record<string, string>; body: string | null }

/** `fetch` tiruan: mencatat permintaan dan menjawab dari daftar (token dulu, lalu API). */
function fetchTiruan(...jawaban: (Response | Error)[]) {
  const permintaan: Permintaan[] = []
  const ambil: Fetch = async (input, init) => {
    permintaan.push({
      url: String(input),
      method: init?.method ?? 'GET',
      headers: Object.fromEntries(new Headers(init?.headers).entries()),
      body: (init?.body as string | undefined) ?? null,
    })
    const berikut = jawaban.shift()
    if (!berikut) throw new Error('Permintaan tidak terduga')
    if (berikut instanceof Error) throw berikut
    return berikut
  }
  return { ambil, permintaan }
}

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
const token = (access_token = 'token-1') => json({ access_token, expires_in: 3599, token_type: 'Bearer' })

describe('akun layanan Google tanpa pustaka', () => {
  it('membaca file kunci JSON dari env, atau menjelaskan kenapa tidak bisa', () => {
    expect(bacaAkunLayanan(JSON.stringify({ type: 'service_account', ...AKUN }))).toEqual(AKUN)
    expect(bacaAkunLayanan(undefined)).toEqual({ alasan: 'Akun layanan Google belum diatur (env GOOGLE_SERVICE_ACCOUNT_JSON kosong).' })
    expect(bacaAkunLayanan('{"client_email":"a@b"}')).toEqual({
      alasan: 'GOOGLE_SERVICE_ACCOUNT_JSON bukan file kunci JSON akun layanan (client_email dan private_key tidak ditemukan).',
    })
  })

  it('JWT RS256: klaim iss, scope, aud, iat, exp 1 jam, dan tanda tangan sah', () => {
    const jwt = buatJwt(AKUN, SCOPE_WEBMASTERS, 1_793_000_000)
    const [kepala, klaim, tanda] = jwt.split('.')
    expect(JSON.parse(Buffer.from(kepala, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'JWT' })
    expect(JSON.parse(Buffer.from(klaim, 'base64url').toString())).toEqual({
      iss: AKUN.client_email,
      scope: SCOPE_WEBMASTERS,
      aud: URL_TOKEN,
      iat: 1_793_000_000,
      exp: 1_793_003_600,
    })
    expect(createVerify('RSA-SHA256').update(`${kepala}.${klaim}`).verify(publicKey, tanda, 'base64url')).toBe(true)
  })

  it('token ditukar sekali per scope dan dipakai ulang sampai hampir kedaluwarsa', async () => {
    let jam = 1_793_000_000_000
    const { ambil, permintaan } = fetchTiruan(token('token-1'), new Response(null, { status: 200 }), new Response(null, { status: 200 }), token('token-2'), new Response(null, { status: 200 }))
    const adapter = adapterAsli({ akun: AKUN, fetch: ambil, sekarang: () => jam })
    await adapter.searchConsole.kirimSitemap('sc-domain:point.lat', 'https://point.lat/sitemap.xml')
    await adapter.searchConsole.kirimSitemap('sc-domain:point.lat', 'https://point.lat/sitemap.xml')
    jam += 3600 * 1000
    await adapter.searchConsole.kirimSitemap('sc-domain:point.lat', 'https://point.lat/sitemap.xml')
    expect(permintaan.map((p) => p.url.split('?')[0].slice(0, 40))).toEqual([
      URL_TOKEN,
      'https://www.googleapis.com/webmasters/v3',
      'https://www.googleapis.com/webmasters/v3',
      URL_TOKEN,
      'https://www.googleapis.com/webmasters/v3',
    ])
    expect(permintaan[0]).toMatchObject({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' } })
    const form = new URLSearchParams(permintaan[0].body ?? '')
    expect(form.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer')
    expect(form.get('assertion')?.split('.')).toHaveLength(3)
    expect(permintaan[4].headers.authorization).toBe('Bearer token-2')
  })

  it('akun ditolak Google: gagal dengan pesan yang menunjuk env', async () => {
    const { ambil } = fetchTiruan(json({ error: 'invalid_grant', error_description: 'Invalid JWT Signature.' }, 400))
    const hasil = await adapterAsli({ akun: AKUN, fetch: ambil }).searchConsole.kirimSitemap('sc-domain:point.lat', 'https://point.lat/sitemap.xml')
    expect(hasil).toEqual({
      status: 'gagal',
      kodeHttp: 400,
      pesan: 'Google menolak akun layanan (400 invalid_grant: Invalid JWT Signature). Periksa isi GOOGLE_SERVICE_ACCOUNT_JSON.',
    })
  })
})

describe('Search Console API', () => {
  it('sitemaps.submit: PUT ke sites/{siteUrl}/sitemaps/{feedpath} tanpa badan', async () => {
    const { ambil, permintaan } = fetchTiruan(token(), new Response(null, { status: 200 }))
    const hasil = await adapterAsli({ akun: AKUN, fetch: ambil }).searchConsole.kirimSitemap('sc-domain:point.lat', 'https://point.lat/sitemap.xml')
    expect(permintaan[1]).toEqual({
      url: 'https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Apoint.lat/sitemaps/https%3A%2F%2Fpoint.lat%2Fsitemap.xml',
      method: 'PUT',
      headers: { authorization: 'Bearer token-1' },
      body: null,
    })
    expect(hasil).toEqual({ status: 'berhasil', kodeHttp: 200, pesan: 'Search Console menerima sitemap index.' })
  })

  it('urlInspection.index.inspect: POST inspectionUrl dan siteUrl, hasil indexStatusResult', async () => {
    const { ambil, permintaan } = fetchTiruan(
      token(),
      json({
        inspectionResult: {
          inspectionResultLink: 'https://search.google.com/search-console/inspect?resource_id=sc-domain:point.lat&id=abc',
          indexStatusResult: {
            verdict: 'NEUTRAL',
            coverageState: 'Discovered - currently not indexed',
            robotsTxtState: 'ALLOWED',
            indexingState: 'INDEXING_ALLOWED',
            pageFetchState: 'PAGE_FETCH_STATE_UNSPECIFIED',
          },
        },
      }),
    )
    const hasil = await adapterAsli({ akun: AKUN, fetch: ambil }).searchConsole.periksaUrl('sc-domain:point.lat', 'https://point.lat/gaji')
    expect(permintaan[1]).toMatchObject({ url: URL_INSPEKSI, method: 'POST', headers: { 'content-type': 'application/json' } })
    expect(JSON.parse(permintaan[1].body ?? '')).toEqual({ inspectionUrl: 'https://point.lat/gaji', siteUrl: 'sc-domain:point.lat' })
    expect(hasil).toEqual({
      status: 'berhasil',
      kodeHttp: 200,
      pesan: 'Hasil inspeksi diterima.',
      indeks: {
        verdict: 'NEUTRAL',
        coverageState: 'Discovered - currently not indexed',
        pageFetchState: 'PAGE_FETCH_STATE_UNSPECIFIED',
        lastCrawlTime: null,
        tautan: 'https://search.google.com/search-console/inspect?resource_id=sc-domain:point.lat&id=abc',
      },
    })
  })

  it('403 memberi saran pemilik properti; galat jaringan tanpa kode HTTP', async () => {
    const { ambil } = fetchTiruan(token(), json({ error: { code: 403, message: 'User does not have sufficient permission for site.', status: 'PERMISSION_DENIED' } }, 403), new Error('connect ETIMEDOUT'))
    const adapter = adapterAsli({ akun: AKUN, fetch: ambil })
    expect(await adapter.searchConsole.periksaUrl('sc-domain:point.lat', 'https://point.lat/gaji')).toEqual({
      status: 'gagal',
      kodeHttp: 403,
      kuotaHabis: false,
      pesan:
        'Google menjawab 403: User does not have sufficient permission for site. Pastikan email akun layanan terdaftar sebagai pemilik (Owner) properti di Search Console dan API-nya sudah diaktifkan di Google Cloud.',
    })
    expect(await adapter.searchConsole.periksaUrl('sc-domain:point.lat', 'https://point.lat/gaji')).toEqual({
      status: 'gagal',
      kodeHttp: null,
      pesan: 'Tidak bisa menghubungi Google: connect ETIMEDOUT.',
    })
  })
})

describe('Google Indexing API', () => {
  it('urlNotifications.publish: POST url dan type; 429 berarti kuota habis', async () => {
    const { ambil, permintaan } = fetchTiruan(token(), json({ urlNotificationMetadata: { url: 'https://point.lat/gaji' } }), json({ error: { code: 429, message: 'Quota exceeded', status: 'RESOURCE_EXHAUSTED' } }, 429))
    const adapter = adapterAsli({ akun: AKUN, fetch: ambil })
    expect(await adapter.googleIndexing.kabari('https://point.lat/gaji', 'URL_UPDATED')).toEqual({ status: 'berhasil', kodeHttp: 200, pesan: 'Indexing API menerima URL_UPDATED.' })
    const assertion = new URLSearchParams(permintaan[0].body ?? '').get('assertion') ?? ''
    expect(JSON.parse(Buffer.from(assertion.split('.')[1], 'base64url').toString()).scope).toBe(SCOPE_INDEXING)
    expect(permintaan[1]).toMatchObject({ url: URL_INDEXING_API, method: 'POST' })
    expect(JSON.parse(permintaan[1].body ?? '')).toEqual({ url: 'https://point.lat/gaji', type: 'URL_UPDATED' })
    expect(await adapter.googleIndexing.kabari('https://point.lat/lama', 'URL_DELETED')).toMatchObject({ status: 'gagal', kodeHttp: 429, kuotaHabis: true })
  })

  it('tanpa akun layanan: semua langkah Google dilewati tanpa permintaan', async () => {
    const { ambil, permintaan } = fetchTiruan()
    const adapter = adapterAsli({ akun: bacaAkunLayanan(''), fetch: ambil })
    const dilewati = { status: 'dilewati', pesan: 'Akun layanan Google belum diatur (env GOOGLE_SERVICE_ACCOUNT_JSON kosong).' }
    expect(await adapter.googleIndexing.kabari('https://point.lat/gaji', 'URL_UPDATED')).toEqual(dilewati)
    expect(await adapter.searchConsole.kirimSitemap('sc-domain:point.lat', 'https://point.lat/sitemap.xml')).toEqual(dilewati)
    expect(permintaan).toEqual([])
  })
})

describe('IndexNow', () => {
  const kiriman = { host: 'point.lat', key: 'kunci-point-2026', keyLocation: 'https://point.lat/kunci-point-2026.txt', urlList: ['https://point.lat/gaji', 'https://point.lat/thr'] }

  it('POST JSON ke api.indexnow.org/indexnow; 202 berarti kunci sedang divalidasi', async () => {
    const { ambil, permintaan } = fetchTiruan(new Response(null, { status: 202 }))
    expect(await adapterAsli({ akun: AKUN, fetch: ambil }).indexNow.kirim(kiriman)).toEqual({
      status: 'berhasil',
      kodeHttp: 202,
      pesan: 'IndexNow menerima daftar URL; kunci sedang divalidasi.',
    })
    expect(permintaan).toEqual([{ url: URL_INDEXNOW, method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(kiriman) }])
  })

  it('403 dan 422 dijelaskan', async () => {
    const { ambil } = fetchTiruan(new Response(null, { status: 403 }), new Response(null, { status: 422 }))
    const adapter = adapterAsli({ akun: AKUN, fetch: ambil })
    expect((await adapter.indexNow.kirim(kiriman)).pesan).toBe('IndexNow menolak kunci (403). Pastikan file kunci bisa dibuka dan isinya sama dengan kunci di pengaturan SEO.')
    expect(await adapter.indexNow.kirim(kiriman)).toEqual({ status: 'gagal', kodeHttp: 422, pesan: 'IndexNow menolak URL (422): URL harus di host situs dan kunci harus cocok.' })
  })
})

describe('adapter palsu dan pemilihan adapter', () => {
  it('palsu mencatat panggilan, menjawab berhasil, dan bisa diatur gagal per aksi', async () => {
    const palsu = adapterPalsu()
    palsu.jawab('kirimIndexNow', { status: 'gagal', kodeHttp: 503, pesan: 'Tidak tersedia' })
    expect((await palsu.indexNow.kirim({ host: 'point.lat', key: 'k', keyLocation: 'l', urlList: ['u'] })).status).toBe('gagal')
    expect((await palsu.indexNow.kirim({ host: 'point.lat', key: 'k', keyLocation: 'l', urlList: ['u'] })).status).toBe('berhasil')
    const inspeksi = await palsu.searchConsole.periksaUrl('sc-domain:point.lat', 'https://point.lat/gaji')
    expect(inspeksi.status === 'berhasil' && inspeksi.indeks?.coverageState).toBe('URL is unknown to Google')
    expect(palsu.panggilan.map((p) => p.aksi)).toEqual(['kirimIndexNow', 'kirimIndexNow', 'periksaUrl'])
    expect(palsu.searchConsole.nama).toBe('palsu')
  })

  it('INDEXER_ADAPTER memilih asli atau palsu; produksi tanpa pilihan ditolak', () => {
    expect(adapterDariEnv({ INDEXER_ADAPTER: 'asli' }).searchConsole.nama).toBe('searchConsole')
    expect(adapterDariEnv({ INDEXER_ADAPTER: 'palsu', NODE_ENV: 'production' }).searchConsole.nama).toBe('palsu')
    expect(adapterDariEnv({ NODE_ENV: 'test' }).indexNow.nama).toBe('palsu')
    expect(() => adapterDariEnv({ NODE_ENV: 'production' })).toThrow('INDEXER_ADAPTER wajib diisi di produksi')
  })
})
