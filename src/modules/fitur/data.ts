import type { Payload } from 'payload'

import { susunNewsletter } from '@/modules/konten/beranda'
import type { DataNewsletter } from '@/modules/konten/tipe'
import type { Fitur as DokFitur, Newsletter } from '@/payload-types'

/** Saklar fitur pembaca dari global `fitur` (spesifikasi §23), dengan nilai bawaan bila belum pernah disimpan. */
export type Fitur = {
  formKontak: boolean
  newsletter: boolean
  tombolBagikan: boolean
  daftarIsi: boolean
  waktuBaca: boolean
  /** Skrip Statistik kunjungan di halaman publik (spesifikasi §26); bisa dimatikan bila kuota Vercel menipis. */
  statistikKunjungan: boolean
}

export const FITUR_BAWAAN: Fitur = {
  formKontak: false,
  newsletter: false,
  tombolBagikan: false,
  daftarIsi: true,
  waktuBaca: true,
  statistikKunjungan: true,
}

/** Dokumen global `fitur` menjadi `Fitur`; kolom kosong memakai nilai bawaan. */
export function susunFitur(doc: Partial<DokFitur> | null | undefined): Fitur {
  const d = doc ?? {}
  const pilih = (k: keyof Fitur) => (typeof d[k] === 'boolean' ? (d[k] as boolean) : FITUR_BAWAAN[k])
  return {
    formKontak: pilih('formKontak'),
    newsletter: pilih('newsletter'),
    tombolBagikan: pilih('tombolBagikan'),
    daftarIsi: pilih('daftarIsi'),
    waktuBaca: pilih('waktuBaca'),
    statistikKunjungan: pilih('statistikKunjungan'),
  }
}

/** Saklar fitur dari database, tanpa cache (endpoint dan admin). Halaman publik memakai `muatFitur`. */
export async function ambilFitur(payload: Payload): Promise<Fitur> {
  return susunFitur(await payload.findGlobal({ slug: 'fitur', depth: 0 }))
}

/** Cara newsletter: form point. (disimpan di database) atau tautan ke form penyedia. */
export type CaraNewsletter = 'form' | 'penyedia'

/** Newsletter menerima pendaftaran lewat form point.: saklar Fitur menyala dan caranya form point. */
export function newsletterFormAktif(fitur: Fitur, newsletter: Partial<Newsletter> | null | undefined): boolean {
  return fitur.newsletter && (newsletter?.cara ?? 'form') === 'form'
}

/** Fitur halaman artikel: daftar isi, waktu baca, tombol bagikan, dan kotak newsletter di akhir artikel (bila dipilih). */
export type FiturArtikel = { daftarIsi: boolean; waktuBaca: boolean; tombolBagikan: boolean; newsletter: DataNewsletter | null }

export const FITUR_ARTIKEL_BAWAAN: FiturArtikel = { daftarIsi: true, waktuBaca: true, tombolBagikan: false, newsletter: null }

/** Fitur halaman artikel dari database, tanpa cache. Halaman memakai `muatFiturArtikel`. */
export async function ambilFiturArtikel(payload: Payload): Promise<FiturArtikel> {
  const [fitur, newsletter] = await Promise.all([ambilFitur(payload), payload.findGlobal({ slug: 'newsletter', depth: 0 })])
  return {
    daftarIsi: fitur.daftarIsi,
    waktuBaca: fitur.waktuBaca,
    tombolBagikan: fitur.tombolBagikan,
    newsletter: newsletter.diArtikel ? susunNewsletter(newsletter, fitur.newsletter) : null,
  }
}
