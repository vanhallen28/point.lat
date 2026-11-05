import type { Metadata } from 'next'

import { TidakDitemukan } from '@/components/galat/TidakDitemukan'
import { daftarPopuler, muatPopuler, muatSitus, muatTerbaru } from '@/modules/konten'
import { metadataTidakDitemukan } from '@/modules/seo'

/** Jumlah artikel di halaman 404: paling banyak diklik pekan ini bila datanya cukup, selain itu tulisan terbaru. */
const JUMLAH_ARTIKEL = 3

export async function generateMetadata(): Promise<Metadata> {
  return metadataTidakDitemukan(await muatSitus())
}

/** Dipakai untuk setiap `notFound()` di halaman publik dan path yang tidak cocok dengan rute mana pun. */
export default async function HalamanTidakDitemukan() {
  const [populer, terbaru] = await Promise.all([muatPopuler(JUMLAH_ARTIKEL), muatTerbaru(JUMLAH_ARTIKEL)])
  return <TidakDitemukan daftar={daftarPopuler(populer, terbaru, JUMLAH_ARTIKEL)} />
}
