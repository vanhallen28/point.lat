import type { Penuli } from '@/payload-types'
import type { PenulisSeo } from '@/modules/seo/tipe'

import { penulisRingkas } from './artikel'
import type { DataPenulis, KartuArtikel } from './tipe'

/** Jumlah tulisan terbaru di profil penulis. Paginasi menyusul bila satu penulis melewati angka ini. */
export const MAKS_ARTIKEL_PENULIS = 24

/** Profil penulis (spesifikasi §3, rambu kredibilitas): data ringkas, tautan profesional, dan tulisannya. */
export function susunPenulis(doc: Penuli, artikel: KartuArtikel[]): DataPenulis | null {
  const ringkas = penulisRingkas(doc)
  if (!ringkas) return null
  return {
    ...ringkas,
    tautan: (doc.tautan ?? []).filter((t) => t.url?.trim()).map((t) => ({ label: t.label, href: t.url.trim() })),
    artikel,
    seo: doc as PenulisSeo,
  }
}
