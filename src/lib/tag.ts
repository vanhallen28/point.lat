/**
 * Tag cache halaman publik dan rute teknis (spesifikasi §5 "Rendering"). Halaman dan rute memberi
 * tag ini pada data yang di-cache; hook koleksi memanggil `revalidateTag` untuk tag yang terdampak.
 *
 * - `{koleksi}`: daftar dokumen koleksi itu (indeks tools, glosarium, video).
 * - `{koleksi}:{id}`: satu dokumen (halaman artikel, tools, video, penulis, halaman statis).
 * - `pilar:{slug}`: halaman rubrik `/{pilar}` dan `/{pilar}/{subkategori}`.
 * - `beranda`, `sitemap` (sitemap, news sitemap, RSS), `pengaturan-seo` (robots.txt, metadata situs).
 * - `header`, `footer`: global tampilan yang dirender layout di setiap halaman publik.
 * - `media`: dokumen media (alt, caption, kredit, ukuran) yang ditampilkan halaman.
 * - `redirect`: tabel redirect yang dibaca halaman saat path tidak cocok dengan dokumen.
 * - `parameter-tools`: angka aturan kalkulator yang dibaca halaman `/tools/{slug}`.
 */

export const KOLEKSI_PUBLIK = ['artikel', 'pilar', 'subkategori', 'penulis', 'tools', 'video', 'halaman'] as const
export type KoleksiPublik = (typeof KOLEKSI_PUBLIK)[number]

export const TAG = {
  beranda: 'beranda',
  sitemap: 'sitemap',
  pengaturanSeo: 'pengaturan-seo',
  header: 'header',
  footer: 'footer',
  media: 'media',
  redirect: 'redirect',
  parameterTools: 'parameter-tools',
  koleksi: (koleksi: KoleksiPublik) => koleksi,
  dokumen: (koleksi: KoleksiPublik, id: number | string) => `${koleksi}:${id}`,
  pilar: (slug: string) => `pilar:${slug}`,
} as const

/** Koleksi yang tampil di beranda (mozaik dan tulisan terbaru, strip video, warna pilar, kotak "Hitung sendiri"). */
const DI_BERANDA: ReadonlySet<KoleksiPublik> = new Set(['artikel', 'pilar', 'video', 'tools'])

export type DokumenTag = { id: number | string; slug?: string | null }

/**
 * Tag yang harus direvalidasi saat dokumen berubah. `slugPilar` berisi slug pilar dokumen sekarang
 * dan sebelumnya (artikel pindah pilar, pilar ganti slug), sudah di-resolve pemanggil.
 */
export function tagRevalidasi(koleksi: KoleksiPublik, doc: DokumenTag, slugPilar: (string | null | undefined)[] = []): string[] {
  const tag = new Set<string>([koleksi, TAG.dokumen(koleksi, doc.id)])
  for (const slug of slugPilar) if (slug) tag.add(TAG.pilar(slug))
  if (DI_BERANDA.has(koleksi)) tag.add(TAG.beranda)
  tag.add(TAG.sitemap)
  return [...tag]
}
