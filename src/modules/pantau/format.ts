/**
 * Format angka dan waktu dashboard SEO (`Intl` id-ID). Angka ringkas memakai spasi tak putus dari `Intl`
 * ("182,4\u00a0rb"); waktu tampil di zona WIB karena pemilik di Indonesia, sedangkan tanggal data Search
 * Console adalah tanggal kalender waktu Pasifik apa adanya.
 */

const BULAT = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })
const RINGKAS = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 })
const PERSEN = new Intl.NumberFormat('id-ID', { style: 'percent', maximumFractionDigits: 1 })
const SATU_DESIMAL = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const WAKTU = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })
const TANGGAL = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const TANGGAL_PENDEK = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' })

/** Angka utuh dengan pemisah ribuan: 1.284. */
export const teksJumlah = (n: number) => BULAT.format(n)

/** Angka besar diringkas untuk kartu angka: 1.284, 12,9 rb, 2,5 jt. Di bawah 10.000 ditulis utuh. */
export const teksRingkas = (n: number) => (Math.abs(n) < 10_000 ? BULAT.format(n) : RINGKAS.format(n))

/** CTR 0 sampai 1 sebagai persen satu desimal: 6,1%. */
export const teksPersen = (rasio: number) => PERSEN.format(rasio)

/** Posisi rata-rata satu desimal: 6,4. */
export const teksPosisi = (posisi: number | null) => (posisi === null ? '-' : SATU_DESIMAL.format(posisi))

/** Waktu ISO di zona WIB: 5 Nov 2026, 10.12 WIB. */
export const teksWaktu = (iso: string) => `${WAKTU.format(new Date(iso))} WIB`

/** Tanggal kalender `YYYY-MM-DD`: 2 Nov 2026, atau 2 Nov tanpa tahun. */
export const teksTanggal = (tanggal: string, pendek = false) => (pendek ? TANGGAL_PENDEK : TANGGAL).format(new Date(`${tanggal}T00:00:00.000Z`))

/** Batas atas sumbu yang bulat (1, 2, 5 kali pangkat 10) supaya garis bantu jatuh di angka rapi. */
export function batasSumbu(maks: number): number {
  if (maks <= 0) return 1
  const pangkat = 10 ** Math.floor(Math.log10(maks))
  return ([1, 2, 5, 10].find((k) => k * pangkat >= maks) ?? 10) * pangkat
}
