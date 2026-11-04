import { isiFeed, respons } from '@/modules/seo/rute'

/** RSS 2.0: 30 artikel terbit terbaru. */
export const dynamic = 'force-dynamic'

export async function GET() {
  return respons(await isiFeed(), 'rss')
}
