import type { Penuli } from '@/payload-types'
import type { PenulisSeo } from '@/modules/seo/tipe'

import { penulisRingkas } from './artikel'
import { susunPaginasi } from './paginasi'
import type { DataPenulis, KartuArtikel } from './tipe'

/**
 * Profil penulis (spesifikasi §3, rambu kredibilitas): data ringkas, tautan profesional, dan satu halaman
 * tulisannya. `halaman`: nomor halaman dan jumlah seluruh tulisan penulis itu. `null` bila penulis belum
 * punya slug atau nomor halaman di luar jangkauan (404).
 */
export function susunPenulis(
  doc: Penuli,
  artikel: KartuArtikel[],
  halaman: { nomor: number; total: number } = { nomor: 1, total: artikel.length },
): DataPenulis | null {
  const ringkas = penulisRingkas(doc)
  if (!ringkas) return null
  const paginasi = susunPaginasi(ringkas.href, halaman.nomor, halaman.total)
  if (!paginasi) return null
  return {
    ...ringkas,
    tautan: (doc.tautan ?? []).filter((t) => t.url?.trim()).map((t) => ({ label: t.label, href: t.url.trim() })),
    artikel,
    paginasi,
    seo: doc as PenulisSeo,
  }
}
