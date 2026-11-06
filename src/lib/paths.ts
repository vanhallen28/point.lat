import type { TipeArtikel } from './konstanta'

export type TargetPath =
  | { jenis: 'artikel'; slug: string; tipe: TipeArtikel }
  | { jenis: 'subkategori'; slug: string; pilarSlug: string }
  | { jenis: 'pilar' | 'tools' | 'video' | 'penulis' | 'halaman'; slug: string }

/** Halaman indeks yang tidak mewakili satu dokumen. */
export const PATH_INDEKS = { cari: '/cari', glosarium: '/glosarium', tools: '/tools', video: '/video' } as const

/** Segmen paginasi: halaman ke-n sebuah daftar ada di `{path}/halaman/{n}` (slug `halaman` dicadangkan). */
export const SEGMEN_HALAMAN = 'halaman'

/** Path halaman ke-`nomor` dari daftar di `dasar`. Halaman 1 adalah alamat daftar itu sendiri, tanpa akhiran. */
export function pathHalaman(dasar: string, nomor: number): string {
  return nomor > 1 ? `${dasar}/${SEGMEN_HALAMAN}/${nomor}` : dasar
}

/** Satu-satunya tempat path publik dirangkai. Dipakai redirect, SEO, sitemap, dan indexer. */
export function pathFor(target: TargetPath): string {
  switch (target.jenis) {
    case 'artikel':
      return target.tipe === 'glosarium' ? `${PATH_INDEKS.glosarium}/${target.slug}` : `/${target.slug}`
    case 'subkategori':
      return `/${target.pilarSlug}/${target.slug}`
    case 'tools':
      return `${PATH_INDEKS.tools}/${target.slug}`
    case 'video':
      return `${PATH_INDEKS.video}/${target.slug}`
    case 'penulis':
      return `/penulis/${target.slug}`
    case 'pilar':
    case 'halaman':
      return `/${target.slug}`
  }
}
