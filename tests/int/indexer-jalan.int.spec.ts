import type { Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { adapterPalsu, jalankanIndexer, kabari } from '@/modules/indexer'

import { getTestPayload, unik } from './helpers'

const T0 = new Date('2026-11-05T03:00:00.000Z')
const nanti = (menit: number) => new Date(T0.getTime() + menit * 60_000)
const KUNCI = 'kunci-tes-indexnow-2026'
const palsu = adapterPalsu()
const url = (path: string) => `https://point.lat${path}`

async function kosongkan(payload: Payload) {
  for (const collection of ['antrean-indexing', 'log-indexing', 'status-indeks'] as const) {
    await payload.delete({ collection, where: { id: { exists: true } } })
  }
}

async function log(payload: Payload, langkah: string) {
  const { docs } = await payload.find({ collection: 'log-indexing', where: { langkah: { equals: langkah } }, sort: ['waktu', 'id'], limit: 100, depth: 0 })
  return docs.map((d) => ({ url: d.url, status: d.status, percobaan: d.percobaan, waktu: d.waktu, adapter: d.adapter }))
}

async function antrean(payload: Payload) {
  const { docs } = await payload.find({ collection: 'antrean-indexing', limit: 100, depth: 0 })
  return docs.map((d) => `${d.langkah} ${d.path} ${d.jadwal}`).sort()
}

const jalan = (payload: Payload, menit: number) => jalankanIndexer(payload, { sekarang: nanti(menit), adapter: palsu })

describe('jalankanIndexer dengan adapter palsu dan waktu tiruan', () => {
  beforeAll(async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kunciIndexNow: KUNCI, kuotaInspeksi: 1000, pakaiIndexingApi: false } } })
  })

  afterAll(async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kunciIndexNow: '', kuotaInspeksi: 1000, pakaiIndexingApi: false, kuotaIndexingApi: 200 } } })
    await kosongkan(payload)
  })

  beforeEach(async () => {
    palsu.reset()
    await kosongkan(await getTestPayload())
  })

  it('terbit: sitemap index ke Search Console dan semua URL dalam satu POST IndexNow; cek status menunggu +6 jam', async () => {
    const payload = await getTestPayload()
    const [a, b] = [`/${unik('gaji')}`, `/${unik('thr')}`]
    await kabari(payload, [{ path: a, jenis: 'terbit' }, { path: b, jenis: 'terbit' }], { sekarang: T0 })

    const ringkasan = await jalan(payload, 0)
    expect(palsu.panggilan).toEqual([
      { aksi: 'kirimSitemap', properti: 'sc-domain:point.lat', url: 'https://point.lat/sitemap.xml' },
      { aksi: 'kirimIndexNow', kiriman: { host: 'point.lat', key: KUNCI, keyLocation: `https://point.lat/${KUNCI}.txt`, urlList: [url(a), url(b)] } },
    ])
    expect(ringkasan).toEqual({ diproses: 3, berhasil: 3, diulang: 0, gagal: 0, dilewati: 0, ditunda: 0 })
    expect((await log(payload, 'indexnow')).map((l) => [l.url, l.status, l.adapter])).toEqual([
      [url(a), 'berhasil', 'palsu'],
      [url(b), 'berhasil', 'palsu'],
    ])
    expect(await antrean(payload)).toEqual([`cek-status ${a} 2026-11-05T09:00:00.000Z`, `cek-status ${b} 2026-11-05T09:00:00.000Z`].sort())
  })

  it('jendela kirim: kabar baru ditahan sampai 5 menit (IndexNow) dan 30 menit (sitemap) sejak kiriman terakhir, lalu digabung', async () => {
    const payload = await getTestPayload()
    const [a, b, c] = [`/${unik('a')}`, `/${unik('b')}`, `/${unik('c')}`]
    await kabari(payload, [{ path: a, jenis: 'terbit' }], { sekarang: T0 })
    await jalan(payload, 0)
    await kabari(payload, [{ path: b, jenis: 'terbit' }], { sekarang: nanti(2) })
    await jalan(payload, 2)
    await kabari(payload, [{ path: c, jenis: 'ubah-besar' }], { sekarang: nanti(3) })
    await jalan(payload, 3)
    expect(palsu.panggilan.map((p) => p.aksi)).toEqual(['kirimSitemap', 'kirimIndexNow'])
    expect((await antrean(payload)).filter((b) => !b.startsWith('cek-status'))).toEqual(
      [`indexnow ${b} 2026-11-05T03:05:00.000Z`, `indexnow ${c} 2026-11-05T03:05:00.000Z`, 'sitemap /sitemap.xml 2026-11-05T03:30:00.000Z'].sort(),
    )

    await jalan(payload, 5)
    await jalan(payload, 30)
    expect(palsu.panggilan.map((p) => (p.aksi === 'kirimIndexNow' ? p.kiriman.urlList.length : p.aksi))).toEqual(['kirimSitemap', 1, 2, 'kirimSitemap'])
  })

  it('gagal: diulang 1, 5, lalu 30 menit kemudian, lalu Gagal; publikasi lain tetap jalan', async () => {
    const payload = await getTestPayload()
    const path = `/${unik('kpr')}`
    const gagal = { status: 'gagal' as const, kodeHttp: 503, pesan: 'IndexNow menjawab 503.' }
    palsu.jawab('kirimIndexNow', gagal, gagal, gagal, gagal)
    await kabari(payload, [{ path, jenis: 'terbit' }], { sekarang: T0 })
    for (const menit of [0, 1, 6, 36]) await jalan(payload, menit)

    const hasil = await log(payload, 'indexnow')
    expect(hasil.map((l) => [l.status, l.percobaan, l.waktu])).toEqual([
      ['diulang', 1, '2026-11-05T03:00:00.000Z'],
      ['diulang', 2, '2026-11-05T03:01:00.000Z'],
      ['diulang', 3, '2026-11-05T03:06:00.000Z'],
      ['gagal', 4, '2026-11-05T03:36:00.000Z'],
    ])
    const { docs } = await payload.find({ collection: 'log-indexing', where: { status: { equals: 'diulang' } }, sort: 'waktu', limit: 1 })
    expect(docs[0].pesan).toBe('IndexNow menjawab 503. Dicoba lagi 1 menit lagi.')
    expect((await antrean(payload)).filter((b) => b.startsWith('indexnow'))).toEqual([])
    expect((await log(payload, 'sitemap')).map((l) => l.status)).toEqual(['berhasil'])
  })

  it('cek status: +6 jam lalu +24 jam, berhenti saat Terindeks, status indeks tercatat', async () => {
    const payload = await getTestPayload()
    const path = `/${unik('dana-darurat')}`
    await kabari(payload, [{ path, jenis: 'terbit' }], { sekarang: T0 })
    palsu.indeks.set(url(path), { verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' })
    await jalan(payload, 0)
    await jalan(payload, 6 * 60)
    await jalan(payload, 7 * 60)
    let status = (await payload.find({ collection: 'status-indeks', where: { path: { equals: path } } })).docs[0]
    expect(status).toMatchObject({ status: 'ditemukan', detail: 'Discovered - currently not indexed', cekTerakhir: '2026-11-05T09:00:00.000Z', cekBerikutnya: '2026-11-06T03:00:00.000Z' })

    palsu.indeks.set(url(path), { verdict: 'PASS', coverageState: 'Submitted and indexed', lastCrawlTime: '2026-11-05T20:11:00Z', tautan: 'https://search.google.com/search-console/inspect?id=1' })
    await jalan(payload, 24 * 60)
    status = (await payload.find({ collection: 'status-indeks', where: { path: { equals: path } } })).docs[0]
    expect(status).toMatchObject({
      status: 'terindeks',
      dirayapiPada: '2026-11-05T20:11:00.000Z',
      tautanInspeksi: 'https://search.google.com/search-console/inspect?id=1',
      cekBerikutnya: null,
    })
    expect(palsu.panggilan.filter((p) => p.aksi === 'periksaUrl')).toHaveLength(2)
    expect((await log(payload, 'cek-status')).map((l) => l.status)).toEqual(['berhasil', 'berhasil'])
    const { docs } = await payload.find({ collection: 'log-indexing', where: { langkah: { equals: 'cek-status' } }, sort: ['waktu', 'id'] })
    expect(docs.map((d) => d.pesan)).toEqual(['Ditemukan, belum dirayapi: Discovered - currently not indexed.', 'Terindeks: Submitted and indexed.'])
    expect(await antrean(payload)).toEqual([])
  })

  it('kuota harian: cek status di atas batas ditunda ke tengah malam waktu Pasifik', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kuotaInspeksi: 2 } } })
    const daftar = [`/${unik('k1')}`, `/${unik('k2')}`, `/${unik('k3')}`]
    await kabari(payload, daftar.map((path) => ({ path, jenis: 'terbit' as const })), { sekarang: T0 })
    const ringkasan = await jalan(payload, 6 * 60)
    expect(ringkasan.ditunda).toBe(1)
    expect(palsu.panggilan.filter((p) => p.aksi === 'periksaUrl')).toHaveLength(2)
    // 09.00 UTC 5 November = 01.00 PST; hari kuota berikutnya mulai 6 November 00.00 PST (08.00 UTC).
    expect((await antrean(payload)).filter((b) => b.startsWith(`cek-status ${daftar[2]}`))).toEqual([`cek-status ${daftar[2]} 2026-11-06T08:00:00.000Z`])
    const ditunda = (await log(payload, 'cek-status')).filter((l) => l.status === 'ditunda')
    expect(ditunda.map((l) => l.url)).toEqual([url(daftar[2])])
    await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kuotaInspeksi: 1000 } } })
  })

  it('Indexing API: URL_UPDATED saat terbit, URL_DELETED saat dihapus; dilewati bila saklar dimatikan', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { pakaiIndexingApi: true, kuotaIndexingApi: 200 } } })
    const [a, b, c] = [`/${unik('lowongan')}`, `/${unik('siaran')}`, `/${unik('acara')}`]
    await kabari(payload, [{ path: a, jenis: 'terbit' }], { sekarang: T0 })
    await jalan(payload, 0)
    await kabari(payload, [{ path: a, jenis: 'hapus' }, { path: b, jenis: 'terbit' }], { sekarang: nanti(10) })
    await jalan(payload, 10)
    await kabari(payload, [{ path: c, jenis: 'terbit' }], { sekarang: nanti(20) })
    await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { pakaiIndexingApi: false } } })
    await jalan(payload, 20)
    expect(palsu.panggilan.filter((p) => p.aksi === 'kabariGoogle')).toEqual([
      { aksi: 'kabariGoogle', url: url(a), jenis: 'URL_UPDATED' },
      { aksi: 'kabariGoogle', url: url(a), jenis: 'URL_DELETED' },
      { aksi: 'kabariGoogle', url: url(b), jenis: 'URL_UPDATED' },
    ])
    expect((await log(payload, 'indexing-api')).map((l) => [l.url, l.status])).toEqual([
      [url(a), 'berhasil'],
      [url(a), 'berhasil'],
      [url(b), 'berhasil'],
      [url(c), 'dilewati'],
    ])
  })

  it('dua pelari bersamaan (cron terkirim dua kali) tidak mengirim baris yang sama dua kali', async () => {
    const payload = await getTestPayload()
    await kabari(payload, [{ path: `/${unik('ganda')}`, jenis: 'terbit' }], { sekarang: T0 })
    const [satu, dua] = await Promise.all([jalan(payload, 0), jalan(payload, 0)])
    expect(satu.diproses + dua.diproses).toBe(2)
    expect(palsu.panggilan.map((p) => p.aksi).sort()).toEqual(['kirimIndexNow', 'kirimSitemap'])
  })
})
