import type { JenisRentang, Kanal, Rentang } from './aturan'

/** Tayangan (halaman dibuka) dan kunjungan (pengunjung unik per hari, dijumlahkan). */
export type Angka = { tayangan: number; kunjungan: number }

export type AngkaBanding = Angka & { sebelumnya: Angka | null }

export type RingkasPilihan = { jenis: Exclude<JenisRentang, 'kustom'>; label: string; angka: AngkaBanding }

/** Satu titik grafik: tanggal `YYYY-MM-DD` (rentang beberapa hari) atau jam `00` sampai `23` (satu hari). */
export type TitikSeri = { kunci: string; label: string; tayangan: number; kunjungan: number }

/** Satu baris tabel rincian: label siap tampil, keterangan kecil (path, negara, kanal), dan angkanya. */
export type BarisRincian = { kunci: string; label: string; ket: string | null; ikon: string | null; tayangan: number; kunjungan: number }

export type DataKunjungan = {
  rentang: Rentang
  hariIni: string
  /** Tanggal data pertama (`kunjungan-harian`), atau `null` bila belum ada kunjungan sama sekali. */
  dataPertama: string | null
  ringkas: RingkasPilihan[]
  /** Total semua waktu dari `kunjungan-harian`. */
  total: Angka
  /** Angka rentang terpilih dan rentang sebelumnya dengan panjang sama. */
  angka: AngkaBanding
  seri: TitikSeri[]
  /** Pengunjung yang membuka halaman dalam `MENIT_ONLINE` menit terakhir, dan halaman yang sedang dibaca. */
  online: { pengunjung: number; halaman: BarisRincian[] }
  negara: BarisRincian[]
  kota: BarisRincian[]
  kanal: (BarisRincian & { kanal: Kanal })[]
  sumber: BarisRincian[]
  perujuk: BarisRincian[]
  halaman: BarisRincian[]
  masuk: BarisRincian[]
  perangkat: BarisRincian[]
  peramban: BarisRincian[]
  /** Rincian (negara, sumber, halaman) hanya ada untuk 13 bulan terakhir; `true` bila rentang melewatinya. */
  rincianTerpotong: boolean
}
