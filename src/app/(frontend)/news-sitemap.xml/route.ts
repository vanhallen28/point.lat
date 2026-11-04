import { isiNewsSitemap, respons } from '@/modules/seo/rute'

/** Google News sitemap: artikel terbit 48 jam terakhir. */
export const dynamic = 'force-dynamic'

export async function GET() {
  return respons(await isiNewsSitemap(), 'xml')
}
