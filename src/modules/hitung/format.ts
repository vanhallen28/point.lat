import type { Satuan } from './tipe'

/** Format angka dan tanggal Indonesia untuk hasil kalkulator (spesifikasi §3: angka ditulis cara Indonesia). */

const RUPIAH = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const BULAT = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })
const SAMPAI_SATU = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 })
const SAMPAI_DUA = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
const SATU = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const DUA = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Teks tampilan satu angka, misalnya "Rp 8.000.000", "1,5%", "65,5 kg", "3,56". */
export function teksAngka(nilai: number, satuan: Satuan): string {
  switch (satuan) {
    case 'rupiah':
      return RUPIAH.format(nilai)
    case 'persen':
      return `${SAMPAI_DUA.format(nilai)}%`
    case 'kali':
      return `${SAMPAI_DUA.format(nilai)} kali`
    case 'bulan':
      return `${BULAT.format(nilai)} bulan`
    case 'tahun':
      return `${BULAT.format(nilai)} tahun`
    case 'kg':
      return `${SAMPAI_SATU.format(nilai)} kg`
    case 'cm':
      return `${SAMPAI_SATU.format(nilai)} cm`
    case 'kkal':
      return `${BULAT.format(nilai)} kkal`
    case 'imt':
      return SATU.format(nilai)
    case 'ipk':
      return DUA.format(nilai)
    case 'sks':
      return `${BULAT.format(nilai)} SKS`
    case 'angka':
      return SAMPAI_DUA.format(nilai)
  }
}

/** Huruf pertama label dikecilkan di tengah kalimat, kecuali singkatan ("SKS", "IPK sebelumnya", "PTKP"). */
export function tengahKalimat(label: string): string {
  return /^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label
}

/** Angka tanpa satuan dengan pemisah ribuan, untuk isian rupiah yang dirapikan saat blur ("8.000.000"). */
export function teksRibuan(nilai: number): string {
  return BULAT.format(nilai)
}

const FORMAT_KUNCI = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })
const FORMAT_TANGGAL = new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })

/**
 * Tanggal kalender WIB (`YYYY-MM-DD`). Field tanggal Payload menyimpan waktu UTC (misalnya
 * `2026-03-01T00:00:00.000Z`, atau pukul 17.00 hari sebelumnya bila dipilih dari zona WIB), jadi
 * perbandingan berlaku mulai/sampai selalu memakai tanggal kalender di Jakarta.
 */
export function kunciTanggal(nilai: Date | string): string {
  if (typeof nilai === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(nilai)) return nilai
  return FORMAT_KUNCI.format(new Date(nilai))
}

/** "1 Maret 2026" dari kunci tanggal. */
export function teksTanggal(kunci: string): string {
  return FORMAT_TANGGAL.format(new Date(`${kunci}T00:00:00Z`))
}
