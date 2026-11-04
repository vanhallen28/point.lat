/**
 * Pembentuk XML dan teks untuk rute teknis (spesifikasi §7, §8 "Tingkat situs"). Fungsi murni:
 * rute di `src/app/(frontend)/` hanya mengambil data lalu memanggil fungsi ini.
 */

export const JENIS_SITEMAP = ['artikel', 'pilar', 'tools', 'video', 'penulis', 'halaman'] as const
export type JenisSitemap = (typeof JENIS_SITEMAP)[number]

export function isJenisSitemap(nilai: string): nilai is JenisSitemap {
  return (JENIS_SITEMAP as readonly string[]).includes(nilai)
}

export const PATH_SITEMAP_INDEX = '/sitemap.xml'
export const PATH_NEWS_SITEMAP = '/news-sitemap.xml'
export const pathSitemap = (jenis: JenisSitemap) => `/sitemap/${jenis}.xml`

/** Batas protokol sitemap per file. */
export const MAKS_URL_SITEMAP = 50_000
/** Batas Google News per sitemap. */
export const MAKS_URL_NEWS = 1_000
/** Google News: hanya artikel yang terbit dua hari terakhir. */
export const JENDELA_NEWS_MS = 48 * 60 * 60 * 1000

export type EntriSitemap = { loc: string; lastmod?: string | null }
export type EntriIndex = { loc: string; lastmod?: string | null }
export type EntriNews = { loc: string; judul: string; terbitPada: string }
export type EntriFeed = { judul: string; link: string; deskripsi: string; terbitPada: string; penulis?: string | null; kategori?: string | null }

const DEKLARASI = '<?xml version="1.0" encoding="UTF-8"?>'
const NS_SITEMAP = 'http://www.sitemaps.org/schemas/sitemap/0.9'
const NS_NEWS = 'http://www.google.com/schemas/sitemap-news/0.9'

/** Escape teks untuk isi elemen XML. Karakter kontrol yang dilarang XML 1.0 dibuang. */
export function escapeXml(teks: string): string {
  return teks
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Tanggal W3C Datetime (ISO 8601 UTC tanpa milidetik), `null` bila tidak valid. */
export function tanggalW3c(nilai: string | Date | null | undefined): string | null {
  if (!nilai) return null
  const waktu = new Date(nilai)
  if (Number.isNaN(waktu.getTime())) return null
  return waktu.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/** Tanggal terbaru dari daftar, untuk `lastmod` sitemap index. */
export function terbaru(tanggal: (string | null | undefined)[]): string | null {
  let hasil: number | null = null
  for (const t of tanggal) {
    const waktu = t ? new Date(t).getTime() : Number.NaN
    if (!Number.isNaN(waktu) && (hasil === null || waktu > hasil)) hasil = waktu
  }
  return hasil === null ? null : tanggalW3c(new Date(hasil))
}

const lastmod = (nilai?: string | null) => {
  const t = tanggalW3c(nilai)
  return t ? `<lastmod>${t}</lastmod>` : ''
}

/** Sitemap index yang menunjuk sitemap per jenis. */
export function xmlSitemapIndex(entri: EntriIndex[]): string {
  const isi = entri.map((e) => `<sitemap><loc>${escapeXml(e.loc)}</loc>${lastmod(e.lastmod)}</sitemap>`).join('')
  return `${DEKLARASI}\n<sitemapindex xmlns="${NS_SITEMAP}">${isi}</sitemapindex>\n`
}

/**
 * Sitemap URL. `changefreq` dan `priority` tidak ditulis karena diabaikan Google; `lastmod` hanya
 * bila diketahui.
 */
export function xmlSitemap(entri: EntriSitemap[]): string {
  const isi = entri
    .slice(0, MAKS_URL_SITEMAP)
    .map((e) => `<url><loc>${escapeXml(e.loc)}</loc>${lastmod(e.lastmod)}</url>`)
    .join('')
  return `${DEKLARASI}\n<urlset xmlns="${NS_SITEMAP}">${isi}</urlset>\n`
}

/** Artikel untuk news sitemap: terbit dalam 48 jam terakhir (dan tidak di masa depan), terbaru dulu. */
export function saringNews(entri: EntriNews[], sekarang: Date): EntriNews[] {
  const batas = sekarang.getTime() - JENDELA_NEWS_MS
  return entri
    .filter((e) => {
      const waktu = new Date(e.terbitPada).getTime()
      return waktu >= batas && waktu <= sekarang.getTime()
    })
    .sort((a, b) => new Date(b.terbitPada).getTime() - new Date(a.terbitPada).getTime())
    .slice(0, MAKS_URL_NEWS)
}

/** News sitemap Google. `news:language` memakai kode ISO 639 bahasa Indonesia (`id`). */
export function xmlNewsSitemap(entri: EntriNews[], publikasi: { nama: string; bahasa?: string }): string {
  const nama = escapeXml(publikasi.nama)
  const bahasa = publikasi.bahasa ?? 'id'
  const isi = entri
    .map(
      (e) =>
        `<url><loc>${escapeXml(e.loc)}</loc><news:news><news:publication><news:name>${nama}</news:name>` +
        `<news:language>${bahasa}</news:language></news:publication>` +
        `<news:publication_date>${tanggalW3c(e.terbitPada)}</news:publication_date>` +
        `<news:title>${escapeXml(e.judul)}</news:title></news:news></url>`,
    )
    .join('')
  return `${DEKLARASI}\n<urlset xmlns="${NS_SITEMAP}" xmlns:news="${NS_NEWS}">${isi}</urlset>\n`
}

/**
 * Aturan bawaan robots.txt: semua boleh dirayapi kecuali admin, API, dan pencarian internal.
 * `/api/media/file/` tetap boleh karena mengarah ke gambar.
 */
export const ROBOTS_BAWAAN = ['User-agent: *', 'Allow: /', 'Allow: /api/media/file/', 'Disallow: /admin', 'Disallow: /api/', 'Disallow: /cari']

/** robots.txt: aturan bawaan, aturan tambahan dari CMS, lalu rujukan sitemap index dan news sitemap. */
export function teksRobots(opsi: { urlSitus: string; tambahan?: string | null }): string {
  const tambahan = (opsi.tambahan ?? '')
    .split(/\r?\n/)
    .map((baris) => baris.trim())
    .filter((baris) => baris && !/^sitemap\s*:/i.test(baris))
  const sitemap = [PATH_SITEMAP_INDEX, PATH_NEWS_SITEMAP].map((p) => `Sitemap: ${new URL(p, opsi.urlSitus).toString()}`)
  return [...ROBOTS_BAWAAN, ...(tambahan.length ? ['', ...tambahan] : []), '', ...sitemap, ''].join('\n')
}

/** Tanggal RFC 822 untuk RSS (`Mon, 02 Nov 2026 03:00:00 GMT`). */
export function tanggalRss(nilai: string): string {
  return new Date(nilai).toUTCString()
}

/** RSS 2.0 untuk `/feed.xml`. */
export function xmlFeed(
  kanal: { judul: string; link: string; deskripsi: string; urlFeed: string; bahasa?: string },
  entri: EntriFeed[],
): string {
  const item = entri
    .map(
      (e) =>
        `<item><title>${escapeXml(e.judul)}</title><link>${escapeXml(e.link)}</link>` +
        `<guid isPermaLink="true">${escapeXml(e.link)}</guid>` +
        `<description>${escapeXml(e.deskripsi)}</description><pubDate>${tanggalRss(e.terbitPada)}</pubDate>` +
        (e.penulis ? `<dc:creator>${escapeXml(e.penulis)}</dc:creator>` : '') +
        (e.kategori ? `<category>${escapeXml(e.kategori)}</category>` : '') +
        '</item>',
    )
    .join('')
  const terakhir = entri[0] ? `<lastBuildDate>${tanggalRss(entri[0].terbitPada)}</lastBuildDate>` : ''
  return (
    `${DEKLARASI}\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">` +
    `<channel><title>${escapeXml(kanal.judul)}</title><link>${escapeXml(kanal.link)}</link>` +
    `<description>${escapeXml(kanal.deskripsi)}</description><language>${kanal.bahasa ?? 'id-ID'}</language>` +
    `<atom:link href="${escapeXml(kanal.urlFeed)}" rel="self" type="application/rss+xml"/>${terakhir}${item}</channel></rss>\n`
  )
}
