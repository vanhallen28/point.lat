import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { PATH_FEED } from './metadata'
import { ambilEntriFeed, ambilEntriNews, ambilEntriSitemap, ambilIndexSitemap, ambilPengaturan, TAG_RUTE } from './data'
import {
  saringNews,
  teksRobots,
  xmlFeed,
  xmlNewsSitemap,
  xmlSitemap,
  xmlSitemapIndex,
  type JenisSitemap,
} from './xml'

/**
 * Isi rute teknis, di-cache dengan tag supaya hook revalidasi (Task 6) dan Mesin Indexing
 * (Rencana 6) bisa membuangnya. `unstable_cache` dipakai karena proyek belum memakai Cache
 * Components; saat beralih ke `'use cache'`, cukup ganti pembungkus di file ini.
 *
 * `revalidate: 3600` adalah jaring pengaman: news sitemap bergantung pada jam (jendela 48 jam),
 * jadi isinya tetap segar walau tidak ada artikel baru yang memicu revalidasi.
 */
const SEJAM = 3600

const payload = () => getPayload({ config })

export const isiSitemapIndex = unstable_cache(
  async () => {
    const p = await payload()
    const situs = await ambilPengaturan(p)
    return xmlSitemapIndex(await ambilIndexSitemap(p, situs))
  },
  ['seo', 'sitemap-index'],
  { tags: [...TAG_RUTE.sitemap], revalidate: SEJAM },
)

export const isiSitemap = unstable_cache(
  async (jenis: JenisSitemap) => {
    const p = await payload()
    const situs = await ambilPengaturan(p)
    return xmlSitemap(await ambilEntriSitemap(p, jenis, situs))
  },
  ['seo', 'sitemap-jenis'],
  { tags: [...TAG_RUTE.sitemap], revalidate: SEJAM },
)

export const isiNewsSitemap = unstable_cache(
  async () => {
    const p = await payload()
    const situs = await ambilPengaturan(p)
    const sekarang = new Date()
    const entri = saringNews(await ambilEntriNews(p, situs, sekarang), sekarang)
    return xmlNewsSitemap(entri, { nama: situs.namaSitus })
  },
  ['seo', 'news-sitemap'],
  { tags: [...TAG_RUTE.sitemap], revalidate: SEJAM },
)

export const isiRobots = unstable_cache(
  async () => {
    const situs = await ambilPengaturan(await payload())
    return teksRobots({ urlSitus: situs.urlSitus, tambahan: situs.robotsTambahan })
  },
  ['seo', 'robots'],
  { tags: [...TAG_RUTE.robots], revalidate: SEJAM },
)

export const isiFeed = unstable_cache(
  async () => {
    const p = await payload()
    const situs = await ambilPengaturan(p)
    const beranda = new URL('/', situs.urlSitus).toString()
    return xmlFeed(
      {
        judul: situs.namaSitus,
        link: beranda,
        deskripsi: situs.metaDefault ?? situs.namaSitus,
        urlFeed: new URL(PATH_FEED, situs.urlSitus).toString(),
      },
      await ambilEntriFeed(p, situs),
    )
  },
  ['seo', 'feed'],
  { tags: [...TAG_RUTE.sitemap], revalidate: SEJAM },
)

/** Header respons rute teknis. CDN boleh menyimpan sebentar; isi sebenarnya dijaga cache bertag. */
export function respons(isi: string, jenis: 'xml' | 'rss' | 'teks'): Response {
  const tipe = { xml: 'application/xml', rss: 'application/rss+xml', teks: 'text/plain' }[jenis]
  return new Response(isi, {
    headers: {
      'Content-Type': `${tipe}; charset=utf-8`,
      'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
    },
  })
}
