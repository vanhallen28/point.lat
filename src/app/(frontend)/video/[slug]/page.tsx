import type { Metadata } from 'next'
import { cache } from 'react'

import { HalamanVideo } from '@/components/video/HalamanVideo'
import { pathFor } from '@/lib/paths'
import { muatSitus, muatVideo, tanganiTidakAda } from '@/modules/konten'
import { metadata, metadataTidakDitemukan } from '@/modules/seo'

type Props = { params: Promise<{ slug: string }> }

/** `/video/{slug}`: satu video (ISR). */
export function generateStaticParams() {
  return []
}

const cari = cache(async (slug: string) => muatVideo(slug))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const video = await cari((await params).slug)
  if (!video) return metadataTidakDitemukan(await muatSitus())
  return metadata({ jenis: 'video', doc: video.seo }, await muatSitus())
}

export default async function Video({ params }: Props) {
  const { slug } = await params
  const video = await cari(slug)
  if (!video) return tanganiTidakAda(pathFor({ jenis: 'video', slug }))
  return <HalamanVideo video={video} situs={await muatSitus()} />
}
