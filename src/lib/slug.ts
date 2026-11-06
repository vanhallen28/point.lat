import { SEGMEN_HALAMAN } from './paths'

const MAKS_PANJANG = 80

/**
 * Segmen yang dipakai rute sistem dan tidak boleh menjadi slug konten: rute tingkat atas, dan segmen paginasi
 * (`/{pilar}/halaman/2` tidak boleh tertukar dengan subkategori bernama `halaman`).
 */
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
  SEGMEN_HALAMAN,
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

/** Slug yang diketik editor diutamakan; bila kosong, dibuat dari field sumber (biasanya judul). */
export function buatSlug(nilai: unknown, sumber: unknown): string | undefined {
  if (typeof nilai === 'string' && nilai.trim()) return slugify(nilai) || undefined
  if (typeof sumber === 'string' && sumber.trim()) return slugify(sumber) || undefined
  return undefined
}

const POLA_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function validasiFormatSlug(nilai: unknown): true | string {
  if (typeof nilai !== 'string' || nilai === '') return 'Slug wajib diisi.'
  if (!POLA_SLUG.test(nilai)) return 'Slug hanya boleh huruf kecil, angka, dan tanda hubung.'
  if (isReservedSlug(nilai)) return `"${nilai}" dipakai sistem. Pilih slug lain.`
  return true
}
