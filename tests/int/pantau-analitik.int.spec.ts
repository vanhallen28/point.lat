import type { Payload } from 'payload'
import { beforeEach, describe, expect, it } from 'vitest'

import { jalankanJadwal } from '@/modules/indexer/endpoint'
import { adapterPalsu as adapterIndexerPalsu } from '@/modules/indexer/palsu'
import { adapterPalsu, jalankanPantau } from '@/modules/pantau'
import { kueriSemua } from '@/modules/pantau/analitik'
import { permintaanAnalitik } from '@/modules/pantau/aturan'
import type { BarisAnalitik, PermintaanAnalitik } from '@/modules/pantau/tipe'

import { getTestPayload } from './helpers'

/** 5 November 03.00 UTC = 4 November malam waktu Pasifik; data final terakhir 2 November. */
const T0 = new Date('2026-11-05T03:00:00.000Z')
const jam = (n: number) => new Date(T0.getTime() + n * 3_600_000)
const palsu = adapterPalsu()

const baris = (kunci: string, clicks: number, impressions: number, position: number): BarisAnalitik => ({
  keys: [kunci],
  clicks,
  impressions,
  ctr: clicks / impressions,
  position,
})

/** Search Console tiruan: total harian, lalu halaman untuk 28 hari (mulai 6 Oktober) dan 7 hari (mulai 27 Oktober). */
const dataContoh = (p: PermintaanAnalitik): BarisAnalitik[] => {
  if (p.dimensions[0] === 'date') return [baris('2026-11-01', 4, 100, 10), baris('2026-11-02', 6, 300, 6)]
  if (p.startDate === '2026-10-06') return [baris('https://point.lat/b', 30, 600, 2.5), baris('https://point.lat/a/', 5, 50, 4)]
  return [baris('https://point.lat/a', 2, 20, 3)]
}

async function kosongkan(payload: Payload) {
  for (const collection of ['tugas-seo', 'analitik-halaman', 'analitik-situs'] as const) {
    await payload.delete({ collection, where: { id: { exists: true } } })
  }
  palsu.reset()
}

async function halaman(payload: Payload) {
  const { docs } = await payload.find({ collection: 'analitik-halaman', sort: '-klik28', limit: 100, depth: 0 })
  return docs.map(({ path, klik7, impresi7, klik28, impresi28, ctr28, posisi28, sampai }) => ({ path, klik7, impresi7, klik28, impresi28, ctr28, posisi28, sampai }))
}

async function situs(payload: Payload) {
  const { docs } = await payload.find({ collection: 'analitik-situs', sort: 'tanggal', limit: 100, depth: 0 })
  return docs.map((d) => `${d.tanggal} ${d.klik}/${d.impresi}`)
}

async function tugas(payload: Payload) {
  const { docs } = await payload.find({ collection: 'tugas-seo', where: { jenis: { equals: 'analitik' } }, limit: 1, depth: 0 })
  return docs[0]
}

const jalan = (payload: Payload, waktu: Date) => jalankanPantau(payload, { sekarang: waktu, adapter: palsu, tugas: ['analitik'] })

describe('sinkron Search Analytics harian', () => {
  beforeEach(async () => {
    await kosongkan(await getTestPayload())
  })

  it('total per hari, ringkasan 28 dan 7 hari per path, status Berhasil, dan jadwal berikutnya awal hari Pasifik', async () => {
    const payload = await getTestPayload()
    palsu.dataAnalitik = dataContoh
    expect(await jalan(payload, T0)).toEqual({ analitik: { status: 'berhasil', pesan: 'Data sampai 2026-11-02: 2 halaman, 35 klik dalam 28 hari.' } })
    expect(palsu.permintaan.map((p) => [p.properti, p.permintaan.dimensions[0], p.permintaan.startDate, p.permintaan.endDate, p.permintaan.startRow])).toEqual([
      ['sc-domain:point.lat', 'date', '2026-09-30', '2026-11-03', 0],
      ['sc-domain:point.lat', 'page', '2026-10-06', '2026-11-02', 0],
      ['sc-domain:point.lat', 'page', '2026-10-27', '2026-11-02', 0],
    ])
    expect(await halaman(payload)).toEqual([
      { path: '/b', klik7: 0, impresi7: 0, klik28: 30, impresi28: 600, ctr28: 0.05, posisi28: 2.5, sampai: '2026-11-02' },
      { path: '/a', klik7: 2, impresi7: 20, klik28: 5, impresi28: 50, ctr28: 0.1, posisi28: 4, sampai: '2026-11-02' },
    ])
    expect(await situs(payload)).toEqual(['2026-11-01 4/100', '2026-11-02 6/300'])
    expect(await tugas(payload)).toMatchObject({
      status: 'berhasil',
      mulai: T0.toISOString(),
      selesai: T0.toISOString(),
      berikutnya: '2026-11-05T08:00:00.000Z',
    })
  })

  it('tidak berjalan lagi sebelum jadwal; sinkron berikutnya mengganti ringkasan dan memperbarui total harian tanpa baris ganda', async () => {
    const payload = await getTestPayload()
    palsu.dataAnalitik = dataContoh
    await jalan(payload, T0)
    expect(await jalan(payload, jam(1))).toEqual({})
    expect(palsu.permintaan).toHaveLength(3)

    palsu.dataAnalitik = (p) =>
      p.dimensions[0] === 'date'
        ? [baris('2026-11-02', 7, 310, 6), baris('2026-11-03', 1, 50, 9)]
        : [baris('https://point.lat/a', 8, 80, 3)]
    expect((await jalan(payload, jam(6))).analitik?.status).toBe('berhasil')
    expect((await halaman(payload)).map((h) => [h.path, h.klik28, h.sampai])).toEqual([['/a', 8, '2026-11-03']])
    expect(await situs(payload)).toEqual(['2026-11-01 4/100', '2026-11-02 7/310', '2026-11-03 1/50'])
  })

  it('dilewati dan gagal tidak menyentuh data lama; gagal dicoba lagi sejam kemudian, kuota habis besok', async () => {
    const payload = await getTestPayload()
    palsu.dataAnalitik = dataContoh
    await jalan(payload, T0)
    const sebelum = await halaman(payload)

    palsu.dataAnalitik = null
    expect(await jalan(payload, jam(6))).toEqual({ analitik: { status: 'dilewati', pesan: 'Adapter palsu tidak mengambil data Search Console.' } })
    expect(await tugas(payload)).toMatchObject({ status: 'dilewati', berikutnya: '2026-11-06T08:00:00.000Z' })

    palsu.jawabAnalitik({ status: 'gagal', kodeHttp: 503, pesan: 'Google menjawab 503.' })
    expect(await jalan(payload, jam(30))).toEqual({ analitik: { status: 'gagal', pesan: 'Google menjawab 503.' } })
    expect((await tugas(payload))?.berikutnya).toBe(jam(31).toISOString())

    palsu.jawabAnalitik({ status: 'gagal', kodeHttp: 429, kuotaHabis: true, pesan: 'Google menjawab 429: quota exceeded.' })
    expect((await jalan(payload, jam(31))).analitik?.status).toBe('gagal')
    expect((await tugas(payload))?.berikutnya).toBe('2026-11-07T08:00:00.000Z')
    expect(await halaman(payload)).toEqual(sebelum)
  })

  it('tanpa data final 35 hari: ringkasan halaman dikosongkan dan pesannya menjelaskan', async () => {
    const payload = await getTestPayload()
    palsu.dataAnalitik = dataContoh
    await jalan(payload, T0)
    palsu.dataAnalitik = () => []
    expect(await jalan(payload, jam(6))).toEqual({
      analitik: { status: 'berhasil', pesan: 'Search Console belum punya data final untuk 35 hari terakhir.' },
    })
    expect(await halaman(payload)).toEqual([])
  })

  it('dua pelari bersamaan (cron terkirim dua kali): tugas hanya berjalan sekali', async () => {
    const payload = await getTestPayload()
    palsu.dataAnalitik = dataContoh
    const hasil = await Promise.all([jalan(payload, T0), jalan(payload, T0)])
    expect(hasil.filter((h) => h.analitik)).toHaveLength(1)
    expect(palsu.permintaan).toHaveLength(3)
    expect(await halaman(payload)).toHaveLength(2)
  })

  it('retensi harian: log indexing lebih dari 90 hari dan total harian lebih dari 16 bulan dihapus', async () => {
    const payload = await getTestPayload()
    const log = (hari: number, url: string) =>
      payload.create({
        collection: 'log-indexing',
        data: { url, langkah: 'revalidasi', adapter: 'next', status: 'berhasil', pesan: 'Tes retensi.', percobaan: 1, waktu: new Date(T0.getTime() - hari * 86_400_000).toISOString() },
      })
    const lama = await log(91, 'https://point.lat/retensi-lama')
    const baru = await log(89, 'https://point.lat/retensi-baru')
    for (const tanggal of ['2025-07-11', '2025-07-12']) {
      await payload.create({ collection: 'analitik-situs', data: { tanggal, klik: 1, impresi: 1, ctr: 1, posisi: 1 } })
    }
    await jalan(payload, T0)
    const ada = await payload.find({ collection: 'log-indexing', where: { id: { in: [lama.id, baru.id] } }, depth: 0 })
    expect(ada.docs.map((d) => d.url)).toEqual(['https://point.lat/retensi-baru'])
    expect(await situs(payload)).toEqual(['2025-07-12 1/1'])
    await payload.delete({ collection: 'log-indexing', where: { id: { equals: baru.id } } })
  })

  it('cron GET /api/jobs/run ikut menjalankan Pantau SEO', async () => {
    const payload = await getTestPayload()
    const hasil = await jalankanJadwal(payload, { sekarang: T0, adapter: adapterIndexerPalsu(), adapterPantau: palsu })
    expect(hasil.pantau).toMatchObject({
      analitik: { status: 'dilewati', pesan: 'Adapter palsu tidak mengambil data Search Console.' },
      tautan: { status: 'berhasil' },
    })
  })

  it('kueri berhalaman: startRow 0, lalu 25.000, sampai jawaban kurang dari 25.000 baris', async () => {
    const lokal = adapterPalsu()
    lokal.dataAnalitik = () => Array.from({ length: 30_000 }, (_, i) => baris(`https://point.lat/${i}`, 1, 1, 1))
    const hasil = await kueriSemua(lokal, 'sc-domain:point.lat', permintaanAnalitik({ startDate: '2026-10-06', endDate: '2026-11-02' }, 'page'))
    expect(hasil.status === 'berhasil' && hasil.baris.length).toBe(30_000)
    expect(lokal.permintaan.map((p) => p.permintaan.startRow)).toEqual([0, 25_000])
  })

  it('operasi massal di koleksi Pantau SEO: dua baris atau lebih diubah dan dihapus dalam satu operasi', async () => {
    const payload = await getTestPayload()
    palsu.dataAnalitik = dataContoh
    await jalan(payload, T0)
    await payload.create({ collection: 'tugas-seo', data: { jenis: 'tautan', berikutnya: T0.toISOString() } })
    const ubah = await payload.update({ collection: 'tugas-seo', where: { id: { exists: true } }, data: { berikutnya: jam(2).toISOString() } })
    expect(ubah.errors).toEqual([])
    expect(ubah.docs).toHaveLength(2)
    for (const collection of ['analitik-halaman', 'analitik-situs', 'tugas-seo'] as const) {
      const hapus = await payload.delete({ collection, where: { id: { exists: true } } })
      expect(hapus.errors).toEqual([])
      expect(hapus.docs.length).toBeGreaterThanOrEqual(2)
    }
  })
})
