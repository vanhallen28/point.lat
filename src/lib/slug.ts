const MAKS_PANJANG = 80

/** Segmen tingkat atas yang dipakai rute sistem dan tidak boleh menjadi slug konten. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'admin',
  'api',
  'tools',
  'glosarium',
  'video',
  'penulis',
  'cari',
  'sitemap',
  'sitemap-xml',
  'news-sitemap',
  'feed',
  'robots',
  'ads',
  'media',
  'next',
])

export function slugify(input: string): string {
  const dasar = input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' dan ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (dasar.length <= MAKS_PANJANG) return dasar

  const potong = dasar.slice(0, MAKS_PANJANG + 1)
  const batas = potong.lastIndexOf('-')
  return (batas > 0 ? potong.slice(0, batas) : dasar.slice(0, MAKS_PANJANG)).replace(/-+$/g, '')
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug)
}
