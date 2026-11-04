import type { Metadata } from 'next'
import { cache } from 'react'

import { HalamanArtikel } from '@/components/artikel/HalamanArtikel'
import { pathFor } from '@/lib/paths'
import { muatArtikel, muatSitus, tanganiTidakAda } from '@/modules/konten'
import { metadata, metadataTidakDitemukan } from '@/modules/seo'

type Props = { params: Promise<{ slug: string }> }

/** `/glosarium/{slug}`: artikel bertipe glosarium, tata letak sama dengan artikel lain (ISR). */
export function generateStaticParams() {
  return []
}

const cari = cache(async (slug: string) => muatArtikel(slug, true))

const pathIstilah = (slug: string) => pathFor({ jenis: 'artikel', slug, tipe: 'glosarium' })

/**
 * Path tanpa dokumen: metadata 404 di sini (sama dengan `not-found.tsx`, supaya judul tetap setelah
 * hidrasi), sedangkan keputusan redirect atau 404 hanya di halaman.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const istilah = await cari((await params).slug)
  if (!istilah) return metadataTidakDitemukan(await muatSitus())
  return metadata({ jenis: 'artikel', doc: istilah.seo }, await muatSitus())
}

export default async function Istilah({ params }: Props) {
  const { slug } = await params
  const istilah = await cari(slug)
  if (!istilah) return tanganiTidakAda(pathIstilah(slug))
  return <HalamanArtikel artikel={istilah} situs={await muatSitus()} />
}
