import type { KartuArtikel } from './tipe'

/** Panjang kueri (karakter), jumlah kata yang dicari, dan jumlah hasil `/cari`. */
export const MAKS_KUERI = 80
export const MAKS_KATA = 6
export const MAKS_HASIL_CARI = 20

/**
 * Kueri dari `?q=`: nilai pertama bila parameter diulang, karakter wildcard (`%`, `_`, `\`) diganti
 * spasi karena operator `like` Payload meneruskannya ke ILIKE, spasi dirapikan, lalu dipotong.
 */
export function rapikanKueri(nilai: string | string[] | undefined): string {
  const teks = Array.isArray(nilai) ? nilai[0] : nilai
  return (teks ?? '')
    .replace(/[%_\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAKS_KUERI)
    .trim()
}

/** Kata unik (huruf kecil) yang semuanya harus ditemukan di salah satu kolom pencarian. */
export function kataKueri(kueri: string): string[] {
  return [...new Set(kueri.toLowerCase().split(' ').filter(Boolean))].slice(0, MAKS_KATA)
}

/** Hasil yang judulnya memuat semua kata naik ke atas; urutan terbaru tetap di dalam tiap kelompok. */
export function urutkanHasil(kueri: string, hasil: KartuArtikel[]): KartuArtikel[] {
  const kata = kataKueri(kueri)
  const diJudul = (k: KartuArtikel) => kata.every((w) => k.judul.toLowerCase().includes(w))
  return [...hasil.filter(diJudul), ...hasil.filter((k) => !diJudul(k))]
}
