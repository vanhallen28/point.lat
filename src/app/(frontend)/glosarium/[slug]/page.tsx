import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { HalamanArtikel } from '@/components/artikel/HalamanArtikel'
import { muatArtikel, muatSitus } from '@/modules/konten'
import { metadata } from '@/modules/seo'

type Props = { params: Promise<{ slug: string }> }

/** `/glosarium/{slug}`: artikel bertipe glosarium, tata letak sama dengan artikel lain (ISR). */
export function generateStaticParams() {
  return []
}

const cari = cache(async (slug: string) => muatArtikel(slug, true))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const istilah = await cari((await params).slug)
  if (!istilah) notFound()
  return metadata({ jenis: 'artikel', doc: istilah.seo }, await muatSitus())
}

export default async function Istilah({ params }: Props) {
  const istilah = await cari((await params).slug)
  if (!istilah) notFound()
  return <HalamanArtikel artikel={istilah} situs={await muatSitus()} />
}
