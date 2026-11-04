import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { TAG } from '@/lib/tag'

import { ambilFooter, ambilHeader } from './data'

/**
 * Data halaman publik yang di-cache dengan tag (spesifikasi §5 "Rendering"). Halaman dirender statis
 * saat pertama diminta (ISR) dan tag cache data ikut tercatat di halaman itu, jadi `revalidateTag`
 * dari hook Payload membuang data dan halamannya sekaligus. `revalidate: 3600` adalah jaring pengaman
 * bila ada perubahan yang tidak memicu hook (sama dengan rute teknis Rencana 3).
 */
const SEJAM = 3600

const payload = () => getPayload({ config })

/** Menu header memakai nama, slug, dan warna pilar, jadi ikut dibuang saat pilar mana pun berubah. */
export const muatHeader = unstable_cache(async () => ambilHeader(await payload()), ['konten', 'header'], {
  tags: [TAG.header, TAG.koleksi('pilar')],
  revalidate: SEJAM,
})

export const muatFooter = unstable_cache(async () => ambilFooter(await payload()), ['konten', 'footer'], {
  tags: [TAG.footer],
  revalidate: SEJAM,
})
