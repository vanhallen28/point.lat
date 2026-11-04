import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { HalamanArtikel } from '@/components/artikel/HalamanArtikel'
import { muatArtikel, muatSitus } from '@/modules/konten'
import { metadata } from '@/modules/seo'

type Props = { params: Promise<{ jalur: string[] }> }

/**
 * Semua path publik yang tidak ditangani rute yang lebih spesifik: artikel `/{slug}` di Rencana 4A;
 * pilar, subkategori, dan halaman statis menyusul di Rencana 4B. Halaman dirender saat pertama
 * diminta lalu disimpan (ISR); tag cache data membuangnya saat konten berubah.
 */
export function generateStaticParams() {
  return []
}

/** Satu query per permintaan untuk `generateMetadata` dan halaman. */
const cari = cache(async (jalur: string[]) => (jalur.length === 1 ? muatArtikel(jalur[0], false) : null))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jalur } = await params
  const artikel = await cari(jalur)
  if (!artikel) notFound()
  return metadata({ jenis: 'artikel', doc: artikel.seo }, await muatSitus())
}

export default async function Halaman({ params }: Props) {
  const { jalur } = await params
  const artikel = await cari(jalur)
  if (!artikel) notFound()
  return <HalamanArtikel artikel={artikel} situs={await muatSitus()} />
}
