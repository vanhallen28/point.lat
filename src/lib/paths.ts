import type { TipeArtikel } from './konstanta'

export type TargetPath =
  | { jenis: 'artikel'; slug: string; tipe: TipeArtikel }
  | { jenis: 'subkategori'; slug: string; pilarSlug: string }
  | { jenis: 'pilar' | 'tools' | 'video' | 'penulis' | 'halaman'; slug: string }

/** Satu-satunya tempat path publik dirangkai. Dipakai redirect, SEO, sitemap, dan indexer. */
export function pathFor(target: TargetPath): string {
  switch (target.jenis) {
    case 'artikel':
      return target.tipe === 'glosarium' ? `/glosarium/${target.slug}` : `/${target.slug}`
    case 'subkategori':
      return `/${target.pilarSlug}/${target.slug}`
    case 'tools':
      return `/tools/${target.slug}`
    case 'video':
      return `/video/${target.slug}`
    case 'penulis':
      return `/penulis/${target.slug}`
    case 'pilar':
    case 'halaman':
      return `/${target.slug}`
  }
}
