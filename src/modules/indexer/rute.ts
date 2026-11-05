import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { TAG } from '@/lib/tag'

/**
 * Kunci IndexNow dari pengaturan SEO untuk rute `/{kunci}.txt`, di-cache dengan tag `pengaturan-seo`
 * (dibuang saat pengaturan disimpan), sama dengan robots.txt.
 */
export const isiKunciIndexNow = unstable_cache(
  async (): Promise<string | null> => {
    const payload = await getPayload({ config })
    const pengaturan = await payload.findGlobal({ slug: 'pengaturan-seo', depth: 0 })
    return pengaturan.indexing?.kunciIndexNow?.trim() || null
  },
  ['indexer', 'kunci-indexnow'],
  { tags: [TAG.pengaturanSeo], revalidate: 3600 },
)
