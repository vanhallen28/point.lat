import type { Metadata } from 'next'

import { TidakDitemukan } from '@/components/galat/TidakDitemukan'
import { muatSitus, muatTerbaru } from '@/modules/konten'
import { metadataTidakDitemukan } from '@/modules/seo'

/** Jumlah tulisan terbaru di halaman 404. Rencana 6 bisa menggantinya dengan yang paling banyak diklik. */
const JUMLAH_TERBARU = 3

export async function generateMetadata(): Promise<Metadata> {
  return metadataTidakDitemukan(await muatSitus())
}

/** Dipakai untuk setiap `notFound()` di halaman publik dan path yang tidak cocok dengan rute mana pun. */
export default async function HalamanTidakDitemukan() {
  return <TidakDitemukan terbaru={await muatTerbaru(JUMLAH_TERBARU)} />
}
