import { describe, expect, it } from 'vitest'

import {
  batasPindaiManual,
  geserTanggal,
  hariSitus,
  hrefDari,
  JEDA_PINDAI_MANUAL_MS,
  jadwalCekTautan,
  jadwalTugas,
  pathDariUrl,
  permintaanAnalitik,
  rentang,
  rentangHarian,
  ringkasHalaman,
  ringkasSitus,
  statusTautan,
  tanggalPasifik,
} from '@/modules/pantau/aturan'

const SITUS = 'https://point.lat'
const baris = (kunci: string, clicks: number, impressions: number, position: number) => ({
  keys: [kunci],
  clicks,
  impressions,
  ctr: impressions ? clicks / impressions : 0,
  position,
})

describe('tanggal Search Analytics (waktu Pasifik)', () => {
  it('tanggal kalender Pasifik: 5 November 03.00 UTC masih 4 November di Pasifik', () => {
    expect(tanggalPasifik(new Date('2026-11-05T03:00:00.000Z'))).toBe('2026-11-04')
    expect(tanggalPasifik(new Date('2026-11-05T08:00:00.000Z'))).toBe('2026-11-05')
    // Musim panas (PDT, UTC-7): tengah malam Pasifik = 07.00 UTC.
    expect(tanggalPasifik(new Date('2026-07-01T06:59:00.000Z'))).toBe('2026-06-30')
    expect(tanggalPasifik(new Date('2026-07-01T07:00:00.000Z'))).toBe('2026-07-01')
  })

  it('geser tanggal melewati akhir bulan dan tahun; rentang termasuk kedua ujungnya', () => {
    expect(geserTanggal('2026-03-01', -1)).toBe('2026-02-28')
    expect(geserTanggal('2026-12-31', 1)).toBe('2027-01-01')
    expect(rentang('2026-11-02', 28)).toEqual({ startDate: '2026-10-06', endDate: '2026-11-02' })
    expect(rentang('2026-11-02', 7)).toEqual({ startDate: '2026-10-27', endDate: '2026-11-02' })
  })

  it('kueri total harian: 35 hari sampai kemarin; permintaan hanya data final pencarian web', () => {
    expect(rentangHarian(new Date('2026-11-05T03:00:00.000Z'))).toEqual({ startDate: '2026-09-30', endDate: '2026-11-03' })
    expect(permintaanAnalitik({ startDate: '2026-10-06', endDate: '2026-11-02' }, 'page', 25_000)).toEqual({
      startDate: '2026-10-06',
      endDate: '2026-11-02',
      dimensions: ['page'],
      type: 'web',
      dataState: 'final',
      rowLimit: 25_000,
      startRow: 25_000,
    })
  })
})

describe('ringkasan klik, impresi, CTR, dan posisi', () => {
  it('path dari URL laporan: host situs dengan atau tanpa www dan http; host lain diabaikan', () => {
    expect(pathDariUrl('https://point.lat/cara-hitung-thr', SITUS)).toBe('/cara-hitung-thr')
    expect(pathDariUrl('http://www.point.lat/cara-hitung-thr/?utm_source=x#a', SITUS)).toBe('/cara-hitung-thr')
    expect(pathDariUrl('https://point.lat/', SITUS)).toBe('/')
    expect(pathDariUrl('https://staging.point.lat/cara-hitung-thr', SITUS)).toBeNull()
    expect(pathDariUrl('bukan url', SITUS)).toBeNull()
  })

  it('URL yang menjadi path yang sama digabung: klik dan impresi dijumlah, posisi ditimbang impresi; urut klik 28 hari', () => {
    const r = ringkasHalaman(
      [
        baris('https://point.lat/a', 10, 100, 4),
        baris('https://www.point.lat/a/', 2, 100, 8),
        baris('https://point.lat/b', 30, 600, 2.5),
        baris('https://point.lat/c', 0, 50, 30),
        baris('https://lain.example/x', 99, 999, 1),
      ],
      [baris('https://point.lat/a', 5, 40, 3), baris('https://point.lat/b', 1, 90, 2)],
      SITUS,
    )
    expect(r).toEqual([
      { path: '/b', klik7: 1, impresi7: 90, klik28: 30, impresi28: 600, ctr28: 0.05, posisi28: 2.5 },
      { path: '/a', klik7: 5, impresi7: 40, klik28: 12, impresi28: 200, ctr28: 0.06, posisi28: 6 },
      { path: '/c', klik7: 0, impresi7: 0, klik28: 0, impresi28: 50, ctr28: 0, posisi28: 30 },
    ])
  })

  it('total harian properti dan ringkasan 28 hari: hari tanpa data bernilai 0, posisi ditimbang impresi', () => {
    const hari = hariSitus([baris('2026-11-01', 4, 100, 10), baris('2026-11-02', 6, 300, 6), baris('2026-10-01', 50, 500, 1)])
    expect(hari[0]).toEqual({ tanggal: '2026-11-01', klik: 4, impresi: 100, ctr: 0.04, posisi: 10 })
    const r = ringkasSitus(hari, '2026-11-02')
    expect(r).toMatchObject({ klik: 10, impresi: 400, ctr: 0.025, posisi: 7 })
    expect(r.seri).toHaveLength(28)
    expect(r.seri[0]).toEqual({ tanggal: '2026-10-06', klik: 0, impresi: 0 })
    expect(r.seri.at(-1)).toEqual({ tanggal: '2026-11-02', klik: 6, impresi: 300 })
    expect(ringkasSitus([], '2026-11-02')).toMatchObject({ klik: 0, impresi: 0, ctr: 0, posisi: null })
  })
})

describe('jadwal tugas harian', () => {
  const sekarang = new Date('2026-11-05T03:00:00.000Z')

  it('berhasil, dilewati, dan kuota habis: awal hari Pasifik berikutnya; gagal: satu jam lagi', () => {
    expect(jadwalTugas('berhasil', sekarang).toISOString()).toBe('2026-11-05T08:00:00.000Z')
    expect(jadwalTugas('dilewati', sekarang).toISOString()).toBe('2026-11-05T08:00:00.000Z')
    expect(jadwalTugas('kuota-habis', sekarang).toISOString()).toBe('2026-11-05T08:00:00.000Z')
    expect(jadwalTugas('gagal', sekarang).toISOString()).toBe('2026-11-05T04:00:00.000Z')
  })

  it('"Pindai ulang sekarang": boleh bila tidak sedang berjalan dan pindai terakhir dimulai lebih dari 10 menit lalu', () => {
    expect(JEDA_PINDAI_MANUAL_MS).toBe(10 * 60_000)
    expect(batasPindaiManual(null, sekarang)).toEqual({ boleh: true })
    expect(batasPindaiManual({ status: 'berhasil', mulai: '2026-11-05T02:50:00.000Z', berikutnya: '2026-11-05T08:00:00.000Z' }, sekarang)).toEqual({ boleh: true })
    expect(batasPindaiManual({ status: 'berhasil', mulai: '2026-11-05T02:55:00.000Z', berikutnya: '2026-11-05T08:00:00.000Z' }, sekarang)).toEqual({
      boleh: false,
      alasan: 'jeda',
      bolehLagi: new Date('2026-11-05T03:05:00.000Z'),
    })
    // Sedang berjalan selama sewa berlaku; sewa yang habis (proses berhenti) tidak menahan.
    expect(batasPindaiManual({ status: 'berjalan', mulai: '2026-11-05T02:58:00.000Z', berikutnya: '2026-11-05T03:13:00.000Z' }, sekarang)).toEqual({
      boleh: false,
      alasan: 'berjalan',
      bolehLagi: new Date('2026-11-05T03:13:00.000Z'),
    })
    expect(batasPindaiManual({ status: 'berjalan', mulai: '2026-11-05T02:40:00.000Z', berikutnya: '2026-11-05T02:55:00.000Z' }, sekarang)).toEqual({ boleh: true })
  })

  it('tautan luar dicek ulang seminggu sekali, atau besok bila hasilnya belum pasti', () => {
    expect(jadwalCekTautan('baik', sekarang).toISOString()).toBe('2026-11-12T03:00:00.000Z')
    expect(jadwalCekTautan('rusak', sekarang).toISOString()).toBe('2026-11-12T03:00:00.000Z')
    expect(jadwalCekTautan('tidak-pasti', sekarang).toISOString()).toBe('2026-11-06T03:00:00.000Z')
  })
})

describe('tautan di isian CMS', () => {
  it('path situs dan URL ke host situs adalah internal; http(s) lain luar; jangkar, mailto, tel, dan isian aneh diabaikan', () => {
    expect(hrefDari('/cara-hitung-thr/', SITUS)).toEqual({ jenis: 'internal', path: '/cara-hitung-thr' })
    expect(hrefDari('/tools?ref=menu#atas', SITUS)).toEqual({ jenis: 'internal', path: '/tools' })
    expect(hrefDari('https://www.point.lat/glosarium/ptkp', SITUS)).toEqual({ jenis: 'internal', path: '/glosarium/ptkp' })
    expect(hrefDari(' https://pajak.go.id/id/pph-21 ', SITUS)).toEqual({ jenis: 'luar', url: 'https://pajak.go.id/id/pph-21' })
    for (const nilai of ['#faq', 'mailto:redaksi@point.lat', 'tel:+6221', '//cdn.example/x', 'ftp://x.example/a', 'bukan url', '', null, 3]) {
      expect(hrefDari(nilai, SITUS)).toBeNull()
    }
  })
})

describe('arti jawaban pemeriksa tautan', () => {
  it('2xx dan 3xx bisa dibuka; 404, 410, dan domain hilang rusak', () => {
    expect(statusTautan({ kodeHttp: 200, galat: null })).toEqual({ status: 'baik', kodeHttp: 200, pesan: 'Bisa dibuka (200).' })
    expect(statusTautan({ kodeHttp: 404, galat: null })).toEqual({
      status: 'rusak',
      kodeHttp: 404,
      pesan: 'Halaman tidak ditemukan (404). Ganti atau hapus tautannya.',
    })
    expect(statusTautan({ kodeHttp: 410, galat: null }).status).toBe('rusak')
    expect(statusTautan({ kodeHttp: null, galat: 'getaddrinfo ENOTFOUND hilang.example', kodeGalat: 'ENOTFOUND' })).toEqual({
      status: 'rusak',
      kodeHttp: null,
      pesan: 'Domain tidak ditemukan. Ganti atau hapus tautannya.',
    })
  })

  it('403, 429, 5xx, batas waktu, dan galat jaringan lain belum tentu rusak: minta dicek manual', () => {
    expect(statusTautan({ kodeHttp: 403, galat: null })).toEqual({
      status: 'tidak-pasti',
      kodeHttp: 403,
      pesan: 'Server menjawab 403. Buka tautannya untuk memastikan; sebagian situs menolak pemeriksa otomatis.',
    })
    expect(statusTautan({ kodeHttp: 503, galat: null }).status).toBe('tidak-pasti')
    expect(statusTautan({ kodeHttp: null, galat: 'The operation was aborted due to timeout', kodeGalat: 'TimeoutError' })).toEqual({
      status: 'tidak-pasti',
      kodeHttp: null,
      pesan: 'Situs tidak menjawab dalam 10 detik.',
    })
    expect(statusTautan({ kodeHttp: null, galat: 'fetch failed.', kodeGalat: 'ECONNRESET' }).pesan).toBe('Tidak bisa dihubungi: fetch failed.')
  })
})
