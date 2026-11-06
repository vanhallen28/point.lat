import { pathHalaman, SEGMEN_HALAMAN } from '@/lib/paths'

/**
 * Paginasi berbasis path untuk daftar kartu (rubrik pilar dan subkategori, profil penulis). Halaman 1 di
 * alamat daftar itu sendiri, halaman berikutnya di `{path}/halaman/{n}` (`pathHalaman`). Fungsi murni:
 * membaca nomor dari URL, menolak nomor yang tidak sah atau di luar jangkauan, dan menyusun navigasinya.
 */

/** Jumlah kartu per halaman daftar, sama dengan batas daftar sebelum ada paginasi. */
export const UKURAN_HALAMAN = 24

/** Nomor dari segmen URL: bilangan bulat 1 sampai 9999 tanpa nol di depan ("2", bukan "02", "+2", atau "2.0"). */
export function bacaNomor(teks: string): number | null {
  return /^[1-9]\d{0,3}$/.test(teks) ? Number(teks) : null
}

/** Segmen path tanpa akhiran halaman. `tertulis`: URL memuat `/halaman/{n}` (termasuk `/halaman/1`, yang dialihkan). */
export type SegmenBerhalaman = { jalur: string[]; nomor: number; tertulis: boolean }

/**
 * Memisahkan akhiran `/halaman/{n}` dari segmen path rute catch-all. Tanpa akhiran: halaman 1. `null` bila
 * akhirannya ada tetapi nomornya tidak sah (path itu 404).
 */
export function pisahHalaman(jalur: string[]): SegmenBerhalaman | null {
  if (jalur.length < 2 || jalur[jalur.length - 2] !== SEGMEN_HALAMAN) return { jalur, nomor: 1, tertulis: false }
  const nomor = bacaNomor(jalur[jalur.length - 1])
  return nomor === null ? null : { jalur: jalur.slice(0, -2), nomor, tertulis: true }
}

export type TautanHalaman = { nomor: number; href: string; aktif: boolean }

export type Paginasi = {
  nomor: number
  /** Jumlah halaman, paling sedikit 1 (daftar kosong tetap punya halaman 1). */
  jumlah: number
  sebelumnya: string | null
  berikutnya: string | null
  /** Nomor yang ditampilkan berurutan: pertama, terakhir, dan tetangga halaman ini; `null` adalah jeda. */
  halaman: (TautanHalaman | null)[]
}

/**
 * Navigasi halaman ke-`nomor` dari daftar berisi `total` dokumen di alamat `dasar`, atau `null` bila nomor itu
 * di luar jangkauan (path itu 404). Nomor yang ditampilkan: halaman pertama, terakhir, halaman ini dan
 * tetangganya; satu nomor yang terlewat ditulis, lebih dari satu menjadi jeda.
 */
export function susunPaginasi(dasar: string, nomor: number, total: number, ukuran = UKURAN_HALAMAN): Paginasi | null {
  const jumlah = Math.max(1, Math.ceil(total / ukuran))
  if (!Number.isInteger(nomor) || nomor < 1 || nomor > jumlah) return null
  const tampil = [...new Set([1, nomor - 1, nomor, nomor + 1, jumlah])].filter((n) => n >= 1 && n <= jumlah).sort((a, b) => a - b)
  const halaman: (TautanHalaman | null)[] = []
  const tautan = (n: number): TautanHalaman => ({ nomor: n, href: pathHalaman(dasar, n), aktif: n === nomor })
  tampil.forEach((n, i) => {
    const lalu = tampil[i - 1]
    if (lalu !== undefined && n - lalu === 2) halaman.push(tautan(n - 1))
    else if (lalu !== undefined && n - lalu > 2) halaman.push(null)
    halaman.push(tautan(n))
  })
  return {
    nomor,
    jumlah,
    sebelumnya: nomor > 1 ? pathHalaman(dasar, nomor - 1) : null,
    berikutnya: nomor < jumlah ? pathHalaman(dasar, nomor + 1) : null,
    halaman,
  }
}
