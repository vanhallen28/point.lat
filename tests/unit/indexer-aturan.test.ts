import { describe, expect, it } from 'vitest'

import {
  awalHariPasifik,
  bandingkanVersi,
  besokPasifik,
  gabungBaris,
  jadwalCek,
  jadwalUlang,
  rencanaKabar,
  setelahPanggilan,
  statusDariInspeksi,
  tundaSampai,
} from '@/modules/indexer/aturan'
import type { BarisAntrean } from '@/modules/indexer/tipe'

const t = (iso: string) => new Date(iso)
const SEKARANG = t('2026-11-05T03:00:00.000Z')

describe('bandingkanVersi: kabar dari versi publik sebelum dan sesudah simpan', () => {
  const v = (path: string, tanda: string | null = null) => ({ path, tanda })

  it('terbit, batal terbit atau hapus, dan simpan draf', () => {
    expect(bandingkanVersi(null, v('/gaji'))).toEqual([{ path: '/gaji', jenis: 'terbit' }])
    expect(bandingkanVersi(v('/gaji'), null)).toEqual([{ path: '/gaji', jenis: 'hapus' }])
    expect(bandingkanVersi(null, null)).toEqual([])
  })

  it('ganti slug: path lama pindah, path baru terbit', () => {
    expect(bandingkanVersi(v('/gaji'), v('/gaji-bersih'))).toEqual([
      { path: '/gaji', jenis: 'pindah' },
      { path: '/gaji-bersih', jenis: 'terbit' },
    ])
  })

  it('perubahan besar hanya bila tanda berubah; suntingan kecil tidak dikabarkan', () => {
    expect(bandingkanVersi(v('/gaji', '2026-11-01'), v('/gaji', '2026-11-05'))).toEqual([{ path: '/gaji', jenis: 'ubah-besar' }])
    expect(bandingkanVersi(v('/gaji', '2026-11-01'), v('/gaji', '2026-11-01'))).toEqual([])
    expect(bandingkanVersi(v('/tools/thr'), v('/tools/thr'))).toEqual([])
  })
})

describe('rencanaKabar: langkah antrean per jenis kabar', () => {
  const langkah = (r: ReturnType<typeof rencanaKabar>) => r.simpan.map((b) => `${b.langkah} ${b.path}`)

  it('terbit: sitemap index, IndexNow, dan cek status +6 jam; Indexing API hanya bila saklarnya aktif', () => {
    const mati = rencanaKabar({ path: '/gaji', jenis: 'terbit' }, { pakaiIndexingApi: false }, SEKARANG)
    expect(langkah(mati)).toEqual(['sitemap /sitemap.xml', 'indexnow /gaji', 'cek-status /gaji'])
    expect(mati.simpan[2]).toMatchObject({ jadwal: t('2026-11-05T09:00:00.000Z'), dasar: SEKARANG, tahap: 0 })
    expect(mati.batal).toEqual([])
    const aktif = rencanaKabar({ path: '/gaji', jenis: 'ubah-besar' }, { pakaiIndexingApi: true }, SEKARANG)
    expect(langkah(aktif)).toEqual(['sitemap /sitemap.xml', 'indexnow /gaji', 'indexing-api /gaji', 'cek-status /gaji'])
  })

  it('hapus membatalkan cek status; pindah juga tanpa Indexing API (path lama dialihkan, bukan 404)', () => {
    const hapus = rencanaKabar({ path: '/gaji', jenis: 'hapus' }, { pakaiIndexingApi: true }, SEKARANG)
    expect(langkah(hapus)).toEqual(['sitemap /sitemap.xml', 'indexnow /gaji', 'indexing-api /gaji'])
    expect(hapus.batal).toEqual(['cek-status'])
    const pindah = rencanaKabar({ path: '/gaji', jenis: 'pindah' }, { pakaiIndexingApi: true }, SEKARANG)
    expect(langkah(pindah)).toEqual(['sitemap /sitemap.xml', 'indexnow /gaji'])
    expect(pindah.batal).toEqual(['indexing-api', 'cek-status'])
  })
})

const baris = (isi: Partial<BarisAntrean>): BarisAntrean => ({
  langkah: 'indexnow',
  path: '/gaji',
  jenis: 'terbit',
  jadwal: SEKARANG,
  percobaan: 0,
  tahap: 0,
  dasar: null,
  ...isi,
})

describe('gabungBaris: dedup per langkah dan path', () => {
  it('jenis ikut kabar terbaru, jadwal dan percobaan lama tetap (jeda ulang dan penundaan kuota berlaku)', () => {
    const lama = baris({ langkah: 'indexing-api', jadwal: t('2026-11-05T03:05:00.000Z'), percobaan: 2 })
    expect(gabungBaris(lama, baris({ langkah: 'indexing-api', jenis: 'hapus', jadwal: SEKARANG }))).toEqual({ ...lama, jenis: 'hapus' })
  })

  it('cek status mulai lagi dari +6 jam', () => {
    const lama = baris({ langkah: 'cek-status', tahap: 2, dasar: t('2026-11-01T00:00:00.000Z') })
    const baru = baris({ langkah: 'cek-status', jenis: 'ubah-besar', jadwal: t('2026-11-05T09:00:00.000Z'), dasar: SEKARANG })
    expect(gabungBaris(lama, baru)).toEqual(baru)
  })
})

describe('jadwal ulang dan jadwal cek status', () => {
  it('gagal diulang 1, 5, lalu 30 menit kemudian, lalu berhenti', () => {
    expect([0, 1, 2, 3].map((p) => jadwalUlang(p, SEKARANG)?.toISOString() ?? null)).toEqual([
      '2026-11-05T03:01:00.000Z',
      '2026-11-05T03:05:00.000Z',
      '2026-11-05T03:30:00.000Z',
      null,
    ])
  })

  it('cek status +6 jam, +24 jam, +3 hari, +7 hari, +14 hari, +30 hari dari waktu kabar', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((tahap) => jadwalCek(SEKARANG, tahap)?.toISOString() ?? null)).toEqual([
      '2026-11-05T09:00:00.000Z',
      '2026-11-06T03:00:00.000Z',
      '2026-11-08T03:00:00.000Z',
      '2026-11-12T03:00:00.000Z',
      '2026-11-19T03:00:00.000Z',
      '2026-12-05T03:00:00.000Z',
      null,
    ])
  })

  it('jendela kirim: sitemap 30 menit, IndexNow 5 menit sejak kiriman terakhir', () => {
    expect(tundaSampai(null, 30 * 60_000, SEKARANG)).toBeNull()
    expect(tundaSampai(t('2026-11-05T02:40:00.000Z'), 30 * 60_000, SEKARANG)).toEqual(t('2026-11-05T03:10:00.000Z'))
    expect(tundaSampai(t('2026-11-05T02:55:00.000Z'), 5 * 60_000, SEKARANG)).toBeNull()
  })
})

describe('hari kuota Google: tengah malam waktu Pasifik', () => {
  it('PST (UTC-8) dan PDT (UTC-7)', () => {
    expect(awalHariPasifik(t('2026-11-05T12:00:00Z'))).toEqual(t('2026-11-05T08:00:00Z'))
    expect(awalHariPasifik(t('2026-11-05T07:59:00Z'))).toEqual(t('2026-11-04T08:00:00Z'))
    expect(awalHariPasifik(t('2026-07-01T10:00:00Z'))).toEqual(t('2026-07-01T07:00:00Z'))
  })

  it('hari pergantian jam musim panas (8 Maret dan 1 November 2026)', () => {
    expect(awalHariPasifik(t('2026-03-08T20:00:00Z'))).toEqual(t('2026-03-08T08:00:00Z'))
    expect(besokPasifik(t('2026-03-08T20:00:00Z'))).toEqual(t('2026-03-09T07:00:00Z'))
    expect(awalHariPasifik(t('2026-11-01T20:00:00Z'))).toEqual(t('2026-11-01T07:00:00Z'))
    expect(besokPasifik(t('2026-11-01T20:00:00Z'))).toEqual(t('2026-11-02T08:00:00Z'))
  })
})

describe('statusDariInspeksi: hasil URL Inspection API', () => {
  it('verdict PASS terindeks; coverageState menentukan ditemukan, dirayapi, dan belum dikenal', () => {
    expect(statusDariInspeksi({ verdict: 'PASS', coverageState: 'Submitted and indexed' })).toEqual({ status: 'terindeks', detail: 'Submitted and indexed' })
    expect(statusDariInspeksi({ verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' }).status).toBe('ditemukan')
    expect(statusDariInspeksi({ verdict: 'NEUTRAL', coverageState: 'Crawled - currently not indexed' }).status).toBe('dirayapi')
    expect(statusDariInspeksi({ verdict: 'NEUTRAL', coverageState: 'URL is unknown to Google' }).status).toBe('tidak-dikenal')
  })

  it('FAIL menjadi Error, NEUTRAL lain dikecualikan, detail menyebut masalah pengambilan halaman', () => {
    expect(statusDariInspeksi({ verdict: 'FAIL', coverageState: 'Server error (5xx)', pageFetchState: 'SERVER_ERROR' })).toEqual({
      status: 'galat',
      detail: 'Server error (5xx); pengambilan halaman: SERVER_ERROR',
    })
    expect(statusDariInspeksi({ verdict: 'NEUTRAL', coverageState: "Excluded by 'noindex' tag" }).status).toBe('dikecualikan')
    expect(statusDariInspeksi(undefined)).toEqual({ status: 'belum-dicek', detail: '' })
  })
})

describe('setelahPanggilan: keadaan antrean setelah adapter menjawab', () => {
  const berhasil = { status: 'berhasil' as const, kodeHttp: 200, pesan: 'OK' }
  const gagal = { status: 'gagal' as const, kodeHttp: 503, pesan: 'Tidak tersedia' }

  it('berhasil dan dilewati menyelesaikan baris', () => {
    expect(setelahPanggilan(baris({}), berhasil, SEKARANG)).toEqual({ log: 'berhasil', berikut: null })
    expect(setelahPanggilan(baris({}), { status: 'dilewati', pesan: 'Kunci belum diisi.' }, SEKARANG)).toEqual({ log: 'dilewati', berikut: null })
  })

  it('gagal diulang tiga kali, lalu Gagal', () => {
    expect(setelahPanggilan(baris({ percobaan: 0 }), gagal, SEKARANG)).toEqual({
      log: 'diulang',
      berikut: { jadwal: t('2026-11-05T03:01:00.000Z'), percobaan: 1, tahap: 0 },
    })
    expect(setelahPanggilan(baris({ percobaan: 2 }), gagal, SEKARANG).berikut?.jadwal).toEqual(t('2026-11-05T03:30:00.000Z'))
    expect(setelahPanggilan(baris({ percobaan: 3 }), gagal, SEKARANG)).toEqual({ log: 'gagal', berikut: null })
  })

  it('kuota Google habis: ditunda ke awal hari kuota berikutnya tanpa menambah percobaan', () => {
    const habis = { ...gagal, kodeHttp: 429, kuotaHabis: true }
    expect(setelahPanggilan(baris({ langkah: 'indexing-api', percobaan: 1 }), habis, SEKARANG)).toEqual({
      log: 'ditunda',
      berikut: { jadwal: t('2026-11-05T08:00:00.000Z'), percobaan: 1, tahap: 0 },
    })
  })

  it('cek status: lanjut ke jadwal berikutnya sampai Terindeks atau sampai +30 hari', () => {
    const cek = (tahap: number) => baris({ langkah: 'cek-status', tahap, dasar: SEKARANG })
    const ditemukan = { ...berhasil, indeks: { verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' } }
    const terindeks = { ...berhasil, indeks: { verdict: 'PASS', coverageState: 'Submitted and indexed' } }
    expect(setelahPanggilan(cek(0), ditemukan, SEKARANG).berikut).toEqual({ jadwal: t('2026-11-06T03:00:00.000Z'), percobaan: 0, tahap: 1 })
    expect(setelahPanggilan(cek(1), terindeks, SEKARANG)).toEqual({ log: 'berhasil', berikut: null })
    // Domain baru sering belum dikenal Google lebih dari 7 hari: cek berlanjut ke +14 dan +30 hari.
    expect(setelahPanggilan(cek(3), ditemukan, SEKARANG).berikut).toEqual({ jadwal: t('2026-11-19T03:00:00.000Z'), percobaan: 0, tahap: 4 })
    expect(setelahPanggilan(cek(5), ditemukan, SEKARANG)).toEqual({ log: 'berhasil', berikut: null })
    // Cek yang gagal tiga kali tidak menghentikan jadwal berikutnya.
    expect(setelahPanggilan({ ...cek(1), percobaan: 3 }, gagal, SEKARANG)).toEqual({
      log: 'gagal',
      berikut: { jadwal: t('2026-11-08T03:00:00.000Z'), percobaan: 0, tahap: 2 },
    })
  })
})
