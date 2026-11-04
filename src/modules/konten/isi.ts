import type { TipeArtikel } from '@/lib/konstanta'
import { pathFor } from '@/lib/paths'

type DokumenTertaut = { slug?: string | null; tipe?: TipeArtikel | null; _status?: string | null }

/**
 * Path dokumen yang ditautkan di isi (tautan internal Lexical, node relationship, blok embed).
 * `null` bila relasi belum di-populate, tidak punya slug, atau dokumennya belum terbit: tautan itu
 * dirender sebagai teks biasa supaya pembaca tidak mendarat di 404.
 */
export function hrefDokumen(relationTo: string | null | undefined, value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const doc = value as DokumenTertaut
  if (!doc.slug) return null
  if ('_status' in doc && doc._status !== 'published') return null
  switch (relationTo) {
    case 'artikel':
      return doc.tipe ? pathFor({ jenis: 'artikel', slug: doc.slug, tipe: doc.tipe }) : null
    case 'pilar':
    case 'halaman':
    case 'tools':
    case 'video':
    case 'penulis':
      return pathFor({ jenis: relationTo, slug: doc.slug })
    default:
      return null
  }
}

/** Teks area (callout, transkrip) dipecah menjadi paragraf di baris kosong. */
export function paragrafTeks(teks: string | null | undefined): string[] {
  return (teks ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}
