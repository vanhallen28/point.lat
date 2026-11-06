import type { Metadata } from 'next'
import { cache } from 'react'

import { HalamanPenulis } from '@/components/penulis/HalamanPenulis'
import { pathFor } from '@/lib/paths'
import { muatPenulis, muatSitus, tanganiTidakAda } from '@/modules/konten'
import { metadata, metadataTidakDitemukan } from '@/modules/seo'

type Props = { params: Promise<{ slug: string }> }

/** `/penulis/{slug}`: profil penulis dan halaman 1 tulisannya (ISR); halaman berikutnya di `halaman/[nomor]`. */
export function generateStaticParams() {
  return []
}

const cari = cache(async (slug: string) => muatPenulis(slug, 1))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const penulis = await cari((await params).slug)
  if (!penulis) return metadataTidakDitemukan(await muatSitus())
  return metadata({ jenis: 'penulis', doc: penulis.seo }, await muatSitus())
}

export default async function Penulis({ params }: Props) {
  const { slug } = await params
  const penulis = await cari(slug)
  if (!penulis) return tanganiTidakAda(pathFor({ jenis: 'penulis', slug }))
  return <HalamanPenulis penulis={penulis} situs={await muatSitus()} />
}
