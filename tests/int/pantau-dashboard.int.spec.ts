import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import { ambilDashboard, MAKS_HALAMAN_DASHBOARD } from '@/modules/pantau/dashboard'
import { PESAN_TEMUAN } from '@/modules/pantau/tautan'

import { getTestPayload, unik } from './helpers'

const T0 = new Date('2026-11-05T03:00:00.000Z')
const hariLalu = (n: number) => new Date(T0.getTime() - n * 86_400_000).toISOString()

async function kosongkan(payload: Payload) {
  const koleksi = ['tugas-seo', 'analitik-situs', 'analitik-halaman', 'status-indeks', 'log-indexing', 'temuan-tautan', 'tautan-luar', 'log-404'] as const
  for (const collection of koleksi) await payload.delete({ collection, where: { id: { exists: true } } })
}

describe('data dashboard SEO', () => {
  it('kosong: tugas belum pernah berjalan, tanpa data Search Console, dan semua daftar kosong', async () => {
    const payload = await getTestPayload()
    await kosongkan(payload)
    expect(await ambilDashboard(payload, T0)).toEqual({
      tugas: { analitik: null, tautan: null },
      analitik: { sampai: null, situs: null, halaman: [], jumlahHalaman: 0 },
      statusIndeks: [],
      log: { gagal7Hari: 0, terbaru: [] },
      tautan: [],
      yatim: [],
      log404: [],
    })
  })

  it('terisi: ringkasan 28 hari, 20 halaman teratas, status indeks, log, tautan bermasalah, halaman yatim, dan 404 teratas', async () => {
    const payload = await getTestPayload()
    await kosongkan(payload)
    await payload.create({
      collection: 'tugas-seo',
      data: { jenis: 'analitik', status: 'berhasil', pesan: 'Data sampai 2026-11-02.', selesai: T0.toISOString(), berikutnya: '2026-11-05T08:00:00.000Z' },
    })
    for (const [tanggal, klik, impresi, posisi] of [
      ['2026-10-31', 10, 1000, 8],
      ['2026-11-01', 20, 1000, 6],
      ['2026-11-02', 30, 2000, 5],
    ] as const) {
      await payload.create({ collection: 'analitik-situs', data: { tanggal, klik, impresi, ctr: klik / impresi, posisi } })
    }
    for (let i = 1; i <= MAKS_HALAMAN_DASHBOARD + 2; i++) {
      await payload.create({
        collection: 'analitik-halaman',
        data: { path: `/halaman-${i}`, klik7: i, impresi7: 10 * i, klik28: 100 - i, impresi28: 1000, ctr28: (100 - i) / 1000, posisi28: 5, sampai: '2026-11-02' },
      })
    }
    for (const [path, status] of [
      ['/a', 'terindeks'],
      ['/b', 'terindeks'],
      ['/c', 'tidak-dikenal'],
    ] as const) {
      await payload.create({ collection: 'status-indeks', data: { path, status } })
    }
    const log = (waktu: string, status: 'berhasil' | 'gagal', url: string) =>
      payload.create({ collection: 'log-indexing', data: { waktu, url, langkah: 'indexnow', adapter: 'palsu', status, pesan: `Tes ${status}.`, percobaan: 1 } })
    await log(hariLalu(10), 'gagal', 'https://point.lat/lama')
    await log(hariLalu(2), 'gagal', 'https://point.lat/gagal')
    await log(hariLalu(1), 'berhasil', 'https://point.lat/berhasil')
    const temuan = (jenis: 'rusak' | 'dialihkan' | 'yatim', tujuan: string, sumberKoleksi: string, sumberId: string | null, sumberJudul: string) =>
      payload.create({ collection: 'temuan-tautan', data: { jenis, tujuan, pesan: `Pesan ${jenis}.`, sumberKoleksi, sumberId, sumberJudul, ditemukan: T0.toISOString() } })
    await temuan('dialihkan', '/alamat-lama', 'header', null, 'Menu header')
    await temuan('rusak', '/tidak-ada', 'artikel', '5', 'Cara hitung THR')
    await temuan('yatim', '/tentang', 'halaman', '3', 'Tentang')
    const sumberLuar = [{ koleksi: 'artikel', id: 5, judul: 'Cara hitung THR', path: '/cara-hitung-thr' }]
    await payload.create({ collection: 'tautan-luar', data: { url: 'https://a.example/', status: 'baik', berikutnya: T0.toISOString(), sumber: sumberLuar } })
    await payload.create({ collection: 'tautan-luar', data: { url: 'https://b.example/', status: 'tidak-pasti', pesan: 'Server menjawab 403.', berikutnya: T0.toISOString(), sumber: sumberLuar } })
    await payload.create({ collection: 'tautan-luar', data: { url: 'https://c.example/', status: 'rusak', pesan: PESAN_TEMUAN.tidakAda, berikutnya: T0.toISOString(), sumber: sumberLuar } })
    const sering = `/${unik('sering')}`
    const jarang = `/${unik('jarang')}`
    await payload.create({ collection: 'log-404', data: { path: jarang, jumlah: 2, terakhir: hariLalu(1) } })
    await payload.create({ collection: 'log-404', data: { path: sering, jumlah: 9, terakhir: hariLalu(3) } })
    const redirect = await payload.create({ collection: 'redirect', data: { dari: sering, ke: '/tentang', kode: '301' } })

    const data = await ambilDashboard(payload, T0)
    expect(data.tugas).toEqual({
      analitik: { status: 'berhasil', pesan: 'Data sampai 2026-11-02.', selesai: T0.toISOString(), berikutnya: '2026-11-05T08:00:00.000Z' },
      tautan: null,
    })
    expect(data.analitik).toMatchObject({ sampai: '2026-11-02', jumlahHalaman: 22, situs: { klik: 60, impresi: 4000, ctr: 0.015, posisi: 6 } })
    expect(data.analitik.situs?.seri).toHaveLength(28)
    expect(data.analitik.halaman).toHaveLength(MAKS_HALAMAN_DASHBOARD)
    expect(data.analitik.halaman[0]).toEqual({ path: '/halaman-1', klik7: 1, impresi7: 10, klik28: 99, impresi28: 1000, ctr28: 0.099, posisi28: 5 })
    expect(data.statusIndeks).toEqual([
      { status: 'terindeks', label: 'Terindeks', jumlah: 2 },
      { status: 'tidak-dikenal', label: 'Belum dikenal Google', jumlah: 1 },
    ])
    expect(data.log.gagal7Hari).toBe(1)
    expect(data.log.terbaru.map((l) => [l.url, l.langkah, l.labelStatus])).toEqual([
      ['https://point.lat/berhasil', 'IndexNow', 'Berhasil'],
      ['https://point.lat/gagal', 'IndexNow', 'Gagal'],
      ['https://point.lat/lama', 'IndexNow', 'Gagal'],
    ])
    expect(data.tautan).toEqual([
      { jenis: 'rusak', tujuan: '/tidak-ada', pesan: 'Pesan rusak.', sumber: [{ judul: 'Cara hitung THR', href: '/admin/collections/artikel/5' }] },
      { jenis: 'luar-rusak', tujuan: 'https://c.example/', pesan: PESAN_TEMUAN.tidakAda, sumber: [{ judul: 'Cara hitung THR', href: '/admin/collections/artikel/5' }] },
      { jenis: 'dialihkan', tujuan: '/alamat-lama', pesan: 'Pesan dialihkan.', sumber: [{ judul: 'Menu header', href: '/admin/globals/header' }] },
      { jenis: 'luar-cek', tujuan: 'https://b.example/', pesan: 'Server menjawab 403.', sumber: [{ judul: 'Cara hitung THR', href: '/admin/collections/artikel/5' }] },
    ])
    expect(data.yatim).toEqual([{ path: '/tentang', judul: 'Tentang', href: '/admin/collections/halaman/3' }])
    expect(data.log404).toEqual([
      { path: sering, jumlah: 9, terakhir: hariLalu(3), redirect: `/admin/collections/redirect/${redirect.id}` },
      { path: jarang, jumlah: 2, terakhir: hariLalu(1), redirect: null },
    ])
    await kosongkan(payload)
    await payload.delete({ collection: 'redirect', where: { id: { equals: redirect.id } } })
  })
})
