import { createHmac } from 'node:crypto'

import {
  BATAS_PESAN,
  KOLOM_JEBAKAN,
  MAKS_KIRIMAN_PER_JAM,
  TOPIK_PESAN,
  type HasilPeriksa,
  type IsianKontak,
  type TopikPesan,
} from './tipe'

/** Isian form sebagai teks per nama kolom; nilai yang bukan teks diabaikan. */
export type Isian = Record<string, string>

/**
 * Badan permintaan form menjadi isian: JSON (form dengan JavaScript) atau `application/x-www-form-urlencoded`
 * (form biasa tanpa JavaScript). Badan yang tidak bisa dibaca menjadi isian kosong.
 */
export function bacaIsian(teks: string, jenisKonten: string | null): Isian {
  const hasil: Isian = {}
  if ((jenisKonten ?? '').includes('application/json')) {
    try {
      const data = JSON.parse(teks) as unknown
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        for (const [k, v] of Object.entries(data)) {
          if (typeof v === 'string') hasil[k] = v
          else if (typeof v === 'boolean') hasil[k] = v ? 'ya' : ''
        }
      }
    } catch {
      return {}
    }
    return hasil
  }
  for (const [k, v] of new URLSearchParams(teks)) hasil[k] = v
  return hasil
}

/** Kolom jebakan terisi: kiriman dari bot. Dijawab seperti berhasil, tanpa disimpan. */
export function kenaJebakan(isian: Isian): boolean {
  return (isian[KOLOM_JEBAKAN] ?? '').trim() !== ''
}

const KARAKTER_KONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/

/** Email dirapikan (tanpa spasi tepi, huruf kecil), atau `null` bila bentuknya tidak wajar. */
export function rapikanEmail(nilai: string | undefined): string | null {
  const email = (nilai ?? '').trim().toLowerCase()
  if (!email || email.length > BATAS_PESAN.email || KARAKTER_KONTROL.test(email)) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) ? email : null
}

/** Centang persetujuan: kotak centang HTML mengirim `on` (atau nilai `value`), JSON mengirim `true`. */
function disetujui(isian: Isian): boolean {
  const v = (isian.setuju ?? '').trim().toLowerCase()
  return v !== '' && v !== 'false' && v !== '0'
}

const PESAN_EMAIL = 'Tulis alamat email yang benar, misalnya nama@contoh.com.'
const PESAN_SETUJU = 'Centang persetujuan dulu.'

/** Isian form kontak: data bersih, atau pesan galat per kolom yang siap tampil. */
export function periksaKontak(isian: Isian): HasilPeriksa<IsianKontak> {
  const galat: Record<string, string> = {}
  const nama = (isian.nama ?? '').trim().replace(/\s+/g, ' ')
  if (!nama) galat.nama = 'Tulis nama kamu.'
  else if (nama.length > BATAS_PESAN.nama || KARAKTER_KONTROL.test(nama)) galat.nama = `Nama paling panjang ${BATAS_PESAN.nama} karakter.`
  const email = rapikanEmail(isian.email)
  if (!email) galat.email = PESAN_EMAIL
  const topik = (isian.topik ?? '') as TopikPesan
  if (!TOPIK_PESAN.includes(topik)) galat.topik = 'Pilih topik pesan.'
  const pesan = (isian.pesan ?? '').replace(/\r\n?/g, '\n').trim()
  if (pesan.length < BATAS_PESAN.pesanMin) galat.pesan = `Pesan paling sedikit ${BATAS_PESAN.pesanMin} karakter.`
  else if (pesan.length > BATAS_PESAN.pesanMaks) galat.pesan = `Pesan paling panjang ${BATAS_PESAN.pesanMaks.toLocaleString('id-ID')} karakter.`
  else if (KARAKTER_KONTROL.test(pesan)) galat.pesan = 'Pesan berisi karakter yang tidak bisa disimpan.'
  if (!disetujui(isian)) galat.setuju = PESAN_SETUJU
  if (Object.keys(galat).length) return { ok: false, galat }
  return { ok: true, data: { nama, email: email!, topik, pesan } }
}

/** Isian form newsletter (daftar): email dan persetujuan. */
export function periksaDaftar(isian: Isian): HasilPeriksa<{ email: string }> {
  const galat: Record<string, string> = {}
  const email = rapikanEmail(isian.email)
  if (!email) galat.email = PESAN_EMAIL
  if (!disetujui(isian)) galat.setuju = PESAN_SETUJU
  return email && !Object.keys(galat).length ? { ok: true, data: { email } } : { ok: false, galat }
}

/** Isian form berhenti langganan: email saja. */
export function periksaBerhenti(isian: Isian): HasilPeriksa<{ email: string }> {
  const email = rapikanEmail(isian.email)
  return email ? { ok: true, data: { email } } : { ok: false, galat: { email: PESAN_EMAIL } }
}

/**
 * Path halaman asal form untuk dialihkan kembali (form tanpa JavaScript). Hanya path situs sendiri, supaya
 * endpoint tidak bisa dipakai mengalihkan ke situs lain; selain itu beranda.
 */
export function rapikanAsal(nilai: string | undefined): string {
  const path = (nilai ?? '').trim().split(/[?#]/)[0]
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') || path.length > 300) return '/'
  if (KARAKTER_KONTROL.test(path) || /\s/.test(path)) return '/'
  return path
}

/** Alamat IP pengirim dari header Vercel (`x-forwarded-for` paling kiri, lalu `x-real-ip`), atau `null`. */
export function ambilIp(header: Headers): string | null {
  const diteruskan = header.get('x-forwarded-for')?.split(',')[0]?.trim()
  return diteruskan || header.get('x-real-ip')?.trim() || null
}

/**
 * Sidik pengirim untuk batas kiriman: HMAC-SHA256 alamat IP dengan rahasia server dan tanggal UTC, jadi IP
 * mentah tidak disimpan dan sidik hari berbeda tidak bisa dicocokkan. Pengirim tanpa IP (lokal) berbagi satu
 * sidik per hari.
 */
export function sidikPengirim(ip: string | null, rahasia: string, sekarang: Date): string {
  const tanggal = sekarang.toISOString().slice(0, 10)
  return createHmac('sha256', rahasia).update(`${tanggal}|${ip ?? 'tanpa-ip'}`).digest('hex').slice(0, 32)
}

/** Kiriman ditolak bila pengirim yang sama sudah mengirim sebanyak batas dalam satu jam terakhir. */
export function lewatBatas(jumlahSejamTerakhir: number, batas = MAKS_KIRIMAN_PER_JAM): boolean {
  return jumlahSejamTerakhir >= batas
}

/**
 * Satu sel CSV: dikutip bila berisi koma, kutip, atau baris baru; diawali `'` bila diawali `=`, `+`, `-`, `@`,
 * tab, atau CR supaya spreadsheet tidak menjalankannya sebagai rumus.
 */
export function selCsv(nilai: string): string {
  let s = nilai
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export type BarisPelanggan = { email: string; sumber: string | null; terdaftar: string }

/** Isi file CSV pelanggan newsletter (UTF-8, baris CRLF seperti RFC 4180). */
export function isiCsv(baris: BarisPelanggan[]): string {
  const kepala = ['email', 'sumber', 'terdaftar']
  return [kepala, ...baris.map((b) => [b.email, b.sumber ?? '', b.terdaftar])].map((kolom) => kolom.map(selCsv).join(',')).join('\r\n') + '\r\n'
}
