import { isiKunciIndexNow } from '@/modules/indexer/rute'
import { respons } from '@/modules/seo/rute'

/**
 * File kunci IndexNow `/{kunci}.txt` (spesifikasi §7). `next.config.ts` menulis ulang path itu ke
 * rute ini. Isinya kunci dari pengaturan SEO; kunci lain, atau kunci yang belum diisi, menjawab 404.
 */
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ kunci: string }> }) {
  const { kunci } = await params
  const tersimpan = await isiKunciIndexNow()
  if (!tersimpan || kunci !== tersimpan) return new Response('Tidak ditemukan.', { status: 404 })
  return respons(tersimpan, 'teks')
}
