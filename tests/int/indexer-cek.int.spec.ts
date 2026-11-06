import type { Payload, PayloadRequest } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { adapterPalsu, jalankanIndexer, kabari, mintaCekStatus } from '@/modules/indexer'
import { catatStatus } from '@/modules/indexer/antrean'
import { endpointCekSekarang } from '@/modules/indexer/endpoint'

import { getTestPayload, unik } from './helpers'

const T0 = new Date('2026-11-05T03:00:00.000Z')
const nanti = (menit: number) => new Date(T0.getTime() + menit * 60_000)
const palsu = adapterPalsu()

async function kosongkan(payload: Payload) {
  for (const collection of ['antrean-indexing', 'log-indexing', 'status-indeks'] as const) {
    await payload.delete({ collection, where: { id: { exists: true } } })
  }
}

async function statusBaru(payload: Payload, path: string) {
  await catatStatus(payload, path, {})
  const { docs } = await payload.find({ collection: 'status-indeks', where: { path: { equals: path } }, limit: 1, depth: 0 })
  return docs[0]
}

async function barisCek(payload: Payload, path: string) {
  const { docs } = await payload.find({ collection: 'antrean-indexing', where: { kunci: { equals: `cek-status ${path}` } }, depth: 0 })
  return docs.map((d) => ({ jadwal: d.jadwal, tahap: d.tahap, dasar: d.dasar ?? null }))
}

async function panggil(id: number | string, user: unknown, headers: Record<string, string> = {}) {
  const payload = await getTestPayload()
  const req = { payload, headers: new Headers(headers), user, routeParams: { id: String(id) } } as unknown as PayloadRequest
  return endpointCekSekarang.handler(req)
}

describe('"Cek sekarang" status indeks', () => {
  beforeAll(async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kuotaInspeksi: 1000, pakaiIndexingApi: false } } })
  })

  afterAll(async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kuotaInspeksi: 1000 } } })
    await kosongkan(payload)
  })

  beforeEach(async () => {
    palsu.reset()
    await kosongkan(await getTestPayload())
  })

  it('memajukan cek ke antrean tanpa memanggil Google; dicek sekali di jalan berikutnya; jeda 10 menit per halaman', async () => {
    const payload = await getTestPayload()
    const path = `/${unik('cek')}`
    const doc = await statusBaru(payload, path)

    expect(await mintaCekStatus(payload, doc.id, { sekarang: T0 })).toEqual({
      status: 'antre',
      path,
      dimintaPada: T0.toISOString(),
      pesan: `Cek status ${path} dijalankan sekarang.`,
    })
    expect(palsu.panggilan).toEqual([])
    // Siklus cek otomatis sudah selesai (tanpa baris antrean): baris baru tanpa tahap lanjutan.
    expect(await barisCek(payload, path)).toEqual([{ jadwal: T0.toISOString(), tahap: 6, dasar: null }])

    const dibatasi = await mintaCekStatus(payload, doc.id, { sekarang: nanti(4) })
    expect(dibatasi).toMatchObject({ status: 'dibatasi', alasan: 'jeda', bolehLagi: nanti(10).toISOString() })
    expect(dibatasi.pesan).toMatch(/^Halaman ini baru saja diminta dicek\. Bisa dicek lagi mulai 5 Nov 2026, 10\.10 WIB\.$/)

    await jalankanIndexer(payload, { sekarang: nanti(4), adapter: palsu })
    expect(palsu.panggilan).toEqual([{ aksi: 'periksaUrl', properti: 'sc-domain:point.lat', url: `https://point.lat${path}` }])
    const sesudah = await payload.findByID({ collection: 'status-indeks', id: doc.id })
    expect(sesudah).toMatchObject({ status: 'tidak-dikenal', cekTerakhir: nanti(4).toISOString(), dimintaPada: T0.toISOString() })
    expect(await barisCek(payload, path)).toEqual([])

    expect((await mintaCekStatus(payload, doc.id, { sekarang: nanti(10) })).status).toBe('antre')
  })

  it('cek yang sudah terjadwal dimajukan dengan tahap dan dasarnya, jadi siklus +6 jam sampai +30 hari berlanjut', async () => {
    const payload = await getTestPayload()
    const path = `/${unik('terjadwal')}`
    await kabari(payload, [{ path, jenis: 'terbit' }], { sekarang: T0 })
    const { docs } = await payload.find({ collection: 'status-indeks', where: { path: { equals: path } }, depth: 0 })
    expect(await barisCek(payload, path)).toEqual([{ jadwal: nanti(6 * 60).toISOString(), tahap: 0, dasar: T0.toISOString() }])

    expect((await mintaCekStatus(payload, docs[0].id, { sekarang: nanti(30) })).status).toBe('antre')
    expect(await barisCek(payload, path)).toEqual([{ jadwal: nanti(30).toISOString(), tahap: 0, dasar: T0.toISOString() }])
    await jalankanIndexer(payload, { sekarang: nanti(30), adapter: palsu })
    expect(palsu.panggilan.filter((p) => p.aksi === 'periksaUrl')).toHaveLength(1)
    // Belum terindeks: tahap berikutnya +24 jam dari dasar.
    expect(await barisCek(payload, path)).toEqual([{ jadwal: nanti(24 * 60).toISOString(), tahap: 1, dasar: T0.toISOString() }])
  })

  it('kuota cek harian di Pengaturan SEO habis: ditolak sampai hari kuota berikutnya; permintaan bersamaan hanya satu yang masuk', async () => {
    const payload = await getTestPayload()
    const [a, b] = [await statusBaru(payload, `/${unik('a')}`), await statusBaru(payload, `/${unik('b')}`)]
    const hasil = await Promise.all([mintaCekStatus(payload, a.id, { sekarang: T0 }), mintaCekStatus(payload, a.id, { sekarang: T0 })])
    expect(hasil.map((h) => h.status).sort()).toEqual(['antre', 'dibatasi'])
    expect(await barisCek(payload, a.path)).toHaveLength(1)

    await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kuotaInspeksi: 1 } } })
    await jalankanIndexer(payload, { sekarang: T0, adapter: palsu })
    const kuota = await mintaCekStatus(payload, b.id, { sekarang: nanti(1) })
    expect(kuota).toMatchObject({ status: 'dibatasi', alasan: 'kuota', bolehLagi: '2026-11-05T08:00:00.000Z' })
    expect(kuota.pesan).toBe('Batas 1 cek status per hari sudah tercapai. Bisa dicek lagi mulai 5 Nov 2026, 15.00 WIB.')
    expect(await barisCek(payload, b.path)).toEqual([])
    await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kuotaInspeksi: 1000 } } })
  })

  it('endpoint POST /api/status-indeks/{id}/cek: hanya admin, hanya dari situs sendiri; 202, 429, dan 404', async () => {
    const payload = await getTestPayload()
    const doc = await statusBaru(payload, `/${unik('endpoint')}`)
    const admin = { id: 1, peran: 'admin', collection: 'pengguna' }
    expect((await panggil(doc.id, null)).status).toBe(401)
    expect((await panggil(doc.id, { ...admin, peran: 'editor' })).status).toBe(403)
    const lintas = await panggil(doc.id, admin, { 'sec-fetch-site': 'cross-site' })
    expect(lintas.status).toBe(403)
    expect(await lintas.json()).toEqual({ status: 'gagal', pesan: 'Permintaan dari situs lain ditolak.' })

    const jawaban = await panggil(doc.id, admin, { 'sec-fetch-site': 'same-origin' })
    expect(jawaban.status).toBe(202)
    expect(await jawaban.json()).toMatchObject({ status: 'antre', path: doc.path })
    expect((await panggil(doc.id, admin)).status).toBe(429)
    expect((await panggil(999_999_999, admin)).status).toBe(404)
    expect((await panggil('bukan-angka', admin)).status).toBe(404)
  })
})
