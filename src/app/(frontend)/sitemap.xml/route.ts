import { isiSitemapIndex, respons } from '@/modules/seo/rute'

/** Sitemap index (spesifikasi §7): menunjuk `/sitemap/{jenis}.xml`. Dirujuk dari robots.txt. */
export const dynamic = 'force-dynamic'

export async function GET() {
  return respons(await isiSitemapIndex(), 'xml')
}
