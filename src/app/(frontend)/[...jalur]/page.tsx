import type { Metadata } from 'next'
import { cache } from 'react'

import { HalamanArtikel } from '@/components/artikel/HalamanArtikel'
import { muatArtikel, muatSitus, pathDariSegmen, tanganiTidakAda } from '@/modules/konten'
import { metadata, metadataTidakDitemukan } from '@/modules/seo'

type Props = { params: Promise<{ jalur: string[] }> }

/**
 * Semua path publik yang tidak ditangani rute yang lebih spesifik: artikel `/{slug}` di Rencana 4A;
 * pilar, subkategori, dan halaman statis menyusul di Rencana 4B. Halaman dirender saat pertama
 * diminta lalu disimpan (ISR); tag cache data membuangnya saat konten berubah. Path tanpa dokumen
 * diteruskan ke `tanganiTidakAda` (redirect dari CMS atau 404), hasilnya juga disimpan.
 */
export function generateStaticParams() {
  return []
}

/** Satu query per permintaan untuk `generateMetadata` dan halaman. */
const cari = cache(async (jalur: string[]) => (jalur.length === 1 ? muatArtikel(jalur[0], false) : null))

/**
 * Path tanpa dokumen: metadata 404 di sini (sama dengan `not-found.tsx`, supaya judul tetap setelah
 * hidrasi), sedangkan keputusan redirect atau 404 hanya di halaman.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { jalur } = await params
  const artikel = await cari(jalur)
  if (!artikel) return metadataTidakDitemukan(await muatSitus())
  return metadata({ jenis: 'artikel', doc: artikel.seo }, await muatSitus())
}

export default async function Halaman({ params }: Props) {
  const { jalur } = await params
  const artikel = await cari(jalur)
  if (!artikel) return tanganiTidakAda(pathDariSegmen(jalur))
  return <HalamanArtikel artikel={artikel} situs={await muatSitus()} />
}
