import type { Payload } from 'payload'

import { bersihkanTanda, potongTeks } from '../aturan'

/**
 * Bentuk satu tugas AI: membaca masukan editor, menyusun prompt, skema JSON keluaran, dan memeriksa
 * jawaban model. `lengkapi` (opsional) menambah data dari database sebelum prompt disusun. Semua fungsi
 * murni kecuali `lengkapi`, jadi prompt dan pemeriksa diuji unit tanpa database dan tanpa jaringan.
 */
export type DefinisiTugas<M, H> = {
  /** Merapikan body permintaan; teks berarti masukan ditolak dengan pesan itu. */
  baca(body: unknown): M | string
  lengkapi?(payload: Payload, masukan: M): Promise<M>
  /** `ringkasan`: teks pendek untuk log AI (keyword, subjudul, atau judul). */
  prompt(masukan: M): { sistem: string; pesan: string; ringkasan: string }
  skema: Record<string, unknown>
  /** Hasil yang sudah dibersihkan, atau teks yang menjelaskan kenapa jawaban tidak sesuai bentuk. */
  periksa(json: unknown, masukan: M): H | string
}

/** Objek JSON (bukan array), atau `null`. */
export const objek = (v: unknown): Record<string, unknown> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null

/** Teks masukan editor: dirapikan dan dipotong di batas kata. */
export function teksMasukan(v: unknown, maks: number): { teks: string; dipotong: boolean } {
  return potongTeks(typeof v === 'string' ? v : '', maks)
}

/**
 * Pembersih keluaran model: em dash dan en dash diganti (aturan copy point.) dan dihitung, spasi
 * dirapikan. Teks kosong atau bukan string menjadi `null`.
 */
export function pembersih() {
  let diganti = 0
  const teks = (v: unknown, maks = 2_000): string | null => {
    if (typeof v !== 'string') return null
    const hasil = bersihkanTanda(v.replace(/\s+/g, ' ').trim())
    diganti += hasil.diganti
    const rapi = potongTeks(hasil.teks, maks).teks
    return rapi || null
  }
  const daftar = (v: unknown, maks?: number): string[] =>
    Array.isArray(v) ? v.map((x) => teks(x, maks)).filter((x): x is string => x !== null) : []
  return {
    teks,
    daftar,
    /** Catatan untuk editor bila ada tanda pisah yang diganti. */
    catatan: (): string[] => (diganti > 0 ? [`${diganti} em dash atau en dash diganti koma atau tanda hubung.`] : []),
  }
}

/** Skema objek structured outputs: semua properti wajib dan tanpa properti tambahan (syarat API). */
export function skemaObjek(properti: Record<string, unknown>): Record<string, unknown> {
  return { type: 'object', properties: properti, required: Object.keys(properti), additionalProperties: false }
}

export const SKEMA_TEKS = { type: 'string' } as const
export const daftarTeks = (keterangan?: string) => ({ type: 'array', items: SKEMA_TEKS, ...(keterangan ? { description: keterangan } : {}) })
