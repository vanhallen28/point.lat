import { isiSitemap, respons } from '@/modules/seo/rute'
import { isJenisSitemap } from '@/modules/seo/xml'

/**
 * `/sitemap/{jenis}.xml`. Segmen `[jenis]` menerima `artikel.xml` dan seterusnya; akhiran `.xml`
 * dibuang lalu dicocokkan dengan `JENIS_SITEMAP`. Jenis lain menjawab 404.
 */
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ jenis: string }> }) {
  const { jenis: segmen } = await params
  const jenis = segmen.replace(/\.xml$/, '')
  if (!segmen.endsWith('.xml') || !isJenisSitemap(jenis)) return new Response('Sitemap tidak ditemukan.', { status: 404 })
  return respons(await isiSitemap(jenis), 'xml')
}
