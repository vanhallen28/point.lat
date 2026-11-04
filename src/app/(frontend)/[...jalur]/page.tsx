import type { Metadata } from 'next'
import { cache } from 'react'

import { HalamanArtikel } from '@/components/artikel/HalamanArtikel'
import { HalamanRubrik } from '@/components/rubrik/HalamanRubrik'
import { muatJalur, muatSitus, pathDariSegmen, tanganiTidakAda } from '@/modules/konten'
import { metadata, metadataTidakDitemukan } from '@/modules/seo'

type Props = { params: Promise<{ jalur: string[] }> }

/**
 * Semua path publik yang tidak ditangani rute yang lebih spesifik: artikel `/{slug}`, rubrik
 * `/{pilar}` dan `/{pilar}/{subkategori}`. Halaman dirender saat pertama diminta lalu disimpan
 * (ISR); tag cache data membuangnya saat konten berubah. Path tanpa dokumen diteruskan ke
 * `tanganiTidakAda` (redirect dari CMS atau 404), hasilnya juga disimpan.
 */
export function generateStaticParams() {
  return []
}

/** Satu pencarian per permintaan untuk `generateMetadata` dan halaman. */
const cari = cache(muatJalur)

/**
 * Path tanpa dokumen: metadata 404 di sini (sama dengan `not-found.tsx`, supaya judul tetap setelah
 * hidrasi), sedangkan keputusan redirect atau 404 hanya di halaman.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const hasil = await cari((await params).jalur)
  const situs = await muatSitus()
  switch (hasil?.jenis) {
    case 'artikel':
      return metadata({ jenis: 'artikel', doc: hasil.artikel.seo }, situs)
    case 'rubrik':
      return metadata(hasil.rubrik.seo, situs)
    default:
      return metadataTidakDitemukan(situs)
  }
}

export default async function Halaman({ params }: Props) {
  const { jalur } = await params
  const hasil = await cari(jalur)
  switch (hasil?.jenis) {
    case 'artikel':
      return <HalamanArtikel artikel={hasil.artikel} situs={await muatSitus()} />
    case 'rubrik':
      return <HalamanRubrik rubrik={hasil.rubrik} situs={await muatSitus()} />
    default:
      return tanganiTidakAda(pathDariSegmen(jalur))
  }
}
