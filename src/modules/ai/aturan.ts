import type { Effort, HargaModel, Token, TugasAi } from './tipe'

/**
 * Aturan asisten AI sebagai fungsi murni (waktu dan env sebagai argumen): bulan anggaran, model per
 * tugas, harga dan biaya, cadangan anggaran, batas panjang, dan pembersih tanda pisah. Aman dipakai di
 * server dan di komponen admin.
 */

/** Anggaran direset setiap awal bulan kalender waktu Jakarta. */
export const ZONA_ANGGARAN = 'Asia/Jakarta'

/**
 * Model bawaan per tugas. Brief dan draf butuh penalaran dan bahasa Indonesia yang rapi (Sonnet);
 * generator meta meringkas teks yang sudah ada menjadi isian pendek, cukup model termurah (Haiku).
 * Diganti lewat env `AI_MODEL_BRIEF`, `AI_MODEL_DRAF`, `AI_MODEL_META`, atau `AI_MODEL` untuk semua tugas.
 */
export const MODEL_BAWAAN: Record<TugasAi, string> = {
  brief: 'claude-sonnet-5-5',
  draf: 'claude-sonnet-5-5',
  meta: 'claude-haiku-5-5',
  usulan: 'claude-sonnet-5-5',
  artikel: 'claude-sonnet-5-5',
}

/**
 * Harga awal per juta token (US$) dari halaman Pricing Claude, dibaca 5 November 2026. Haiku 5.5 memakai
 * harga prompt sampai 100.000 token; masukan asisten jauh di bawah itu. Harga bisa berubah, jadi
 * disimpan dan diubah di global Asisten AI.
 */
export const HARGA_BAWAAN: HargaModel[] = [
  { model: 'claude-haiku-5-5', masuk: 0.1, keluar: 0.5 },
  { model: 'claude-sonnet-5-5', masuk: 2, keluar: 10 },
  { model: 'claude-opus-5-5', masuk: 4, keluar: 20 },
]

/** Anggaran bulanan awal (US$). */
export const ANGGARAN_BAWAAN = 10

/**
 * Batas per tugas: panjang masukan (karakter, setelah dirapikan), `max_tokens` (keluaran termasuk
 * thinking, batas keras API), dan tingkat usaha. Masukan yang lebih panjang dipotong di batas kata.
 */
export const BATAS_TUGAS: Record<TugasAi, { maksKarakter: number; maksToken: number; effort: Effort; batasMs?: number; tanpaUlang?: boolean }> = {
  brief: { maksKarakter: 6_000, maksToken: 8_000, effort: 'medium' },
  draf: { maksKarakter: 12_000, maksToken: 8_000, effort: 'medium' },
  meta: { maksKarakter: 30_000, maksToken: 4_000, effort: 'low' },
  // Otomasi (spesifikasi §27): satu draf lengkap per panggilan, jadi tunggu lebih lama dan tanpa kirim ulang
  // supaya satu jalan cron tetap di bawah batas 300 detik fungsi Vercel Hobby.
  usulan: { maksKarakter: 40_000, maksToken: 8_000, effort: 'medium', batasMs: 150_000, tanpaUlang: true },
  artikel: { maksKarakter: 40_000, maksToken: 16_000, effort: 'medium', batasMs: 200_000, tanpaUlang: true },
}

/** Permintaan per pengguna per menit (dihitung dari log AI, jadi berlaku di semua instance server). */
export const BATAS_PER_MENIT = 6

/** Log AI disimpan 13 bulan: cukup untuk membandingkan pemakaian dengan bulan yang sama tahun lalu. */
export const RETENSI_LOG_BULAN = 13

/** Tambahan token untuk pembungkus pesan di luar teks prompt (peran, pemisah), dibulatkan ke atas. */
const TOKEN_PEMBUNGKUS = 100

/** Bulan anggaran `YYYY-MM` waktu Jakarta. */
export function bulanJakarta(t: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_ANGGARAN, year: 'numeric', month: '2-digit' }).format(t)
}

/** Bulan anggaran yang `n` bulan sebelum `bulan` (`YYYY-MM`). */
export function bulanSebelum(bulan: string, n: number): string {
  const [tahun, bln] = bulan.split('-').map(Number)
  const indeks = tahun * 12 + (bln - 1) - n
  return `${Math.floor(indeks / 12)}-${String((indeks % 12) + 1).padStart(2, '0')}`
}

/** Awal bulan `YYYY-MM` waktu Jakarta (UTC+7 sepanjang tahun) sebagai `Date`. */
export function awalBulanJakarta(bulan: string): Date {
  return new Date(`${bulan}-01T00:00:00+07:00`)
}

export type SumberModel = 'env-tugas' | 'env' | 'bawaan'

/** Model untuk satu tugas: `AI_MODEL_{TUGAS}`, lalu `AI_MODEL`, lalu bawaan. */
export function modelTugas(tugas: TugasAi, env: Record<string, string | undefined>): { model: string; sumber: SumberModel } {
  const khusus = env[`AI_MODEL_${tugas.toUpperCase()}`]?.trim()
  if (khusus) return { model: khusus, sumber: 'env-tugas' }
  const umum = env.AI_MODEL?.trim()
  if (umum) return { model: umum, sumber: 'env' }
  return { model: MODEL_BAWAAN[tugas], sumber: 'bawaan' }
}

/** Harga model dari daftar di global Asisten AI, atau `null` bila belum diisi (asisten menolak memanggil). */
export function hargaModel(model: string, daftar: HargaModel[] | null | undefined): HargaModel | null {
  const cocok = (daftar ?? []).find((h) => h.model?.trim() === model)
  if (!cocok || !(cocok.masuk >= 0) || !(cocok.keluar >= 0)) return null
  return { model, masuk: cocok.masuk, keluar: cocok.keluar }
}

/** Dibulatkan ke sepersejuta dolar supaya penjumlahan di database tidak menumpuk sisa pecahan. */
const bulatkan = (usd: number) => Math.round(usd * 1_000_000) / 1_000_000

/** Biaya satu panggilan dalam US$ dari token `usage` dan harga per juta token. */
export function biaya(token: Token, harga: HargaModel): number {
  return bulatkan((token.masuk * harga.masuk + token.keluar * harga.keluar) / 1_000_000)
}

/**
 * Batas atas biaya satu panggilan, dicadangkan dari anggaran sebelum Claude dipanggil. Token masukan
 * tidak lebih banyak dari byte UTF-8 prompt (setiap token paling sedikit satu byte) ditambah pembungkus,
 * dan token keluaran tidak lebih dari `max_tokens`. Jadi anggaran tidak pernah terlewati, termasuk saat
 * dua permintaan berjalan bersamaan.
 */
export function cadanganBiaya(bytePrompt: number, maksToken: number, harga: HargaModel): number {
  return biaya({ masuk: bytePrompt + TOKEN_PEMBUNGKUS, keluar: maksToken }, harga)
}

/** Panjang prompt dalam byte UTF-8. */
export function bytePrompt(...bagian: string[]): number {
  return bagian.reduce((n, teks) => n + new TextEncoder().encode(teks).length, 0)
}

/**
 * Mengganti em dash dan en dash (aturan copy point.) di keluaran model: di antara angka menjadi tanda
 * hubung (rentang "150-160"), selain itu menjadi koma. Mengembalikan jumlah yang diganti supaya editor
 * diberi tahu.
 */
export function bersihkanTanda(teks: string): { teks: string; diganti: number } {
  let diganti = 0
  const hasil = teks
    .replace(/(\d)\s*[\u2013\u2014]\s*(\d)/g, (_, a: string, b: string) => {
      diganti++
      return `${a}-${b}`
    })
    .replace(/\s*[\u2013\u2014]+\s*/g, () => {
      diganti++
      return ', '
    })
    .replace(/^, /, '')
    .replace(/, ([.,;:?])/g, '$1')
  return { teks: hasil, diganti }
}

/** Merapikan spasi dan memotong teks di batas kata bila lebih dari `maks` karakter. */
export function potongTeks(teks: string, maks: number): { teks: string; dipotong: boolean } {
  const rapi = teks.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
  if (rapi.length <= maks) return { teks: rapi, dipotong: false }
  const potong = rapi.slice(0, maks)
  const batas = Math.max(potong.lastIndexOf(' '), potong.lastIndexOf('\n'))
  return { teks: (batas > maks * 0.8 ? potong.slice(0, batas) : potong).trimEnd(), dipotong: true }
}

/** Biaya dalam US$ untuk admin: dua angka desimal, atau empat untuk biaya di bawah satu sen. */
export function teksBiaya(usd: number): string {
  const desimal = usd > 0 && usd < 0.01 ? 4 : 2
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: desimal }).format(usd)
}

export type KeadaanAnggaran = { batas: number; terpakai: number; sisa: number; cukup: boolean }

/** Sisa anggaran bulan ini dan apakah masih cukup untuk cadangan satu permintaan. */
export function keadaanAnggaran(batas: number, terpakai: number, cadangan: number): KeadaanAnggaran {
  const sisa = bulatkan(Math.max(0, batas - terpakai))
  return { batas, terpakai: bulatkan(terpakai), sisa, cukup: batas > 0 && terpakai + cadangan <= batas }
}
