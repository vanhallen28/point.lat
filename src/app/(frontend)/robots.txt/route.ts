import { isiRobots, respons } from '@/modules/seo/rute'

/** robots.txt: aturan bawaan + `robotsTambahan` dari pengaturan SEO + rujukan sitemap. */
export const dynamic = 'force-dynamic'

export async function GET() {
  return respons(await isiRobots(), 'teks')
}
