import type { Metadata } from 'next'

import { DESKRIPSI_CARI, HalamanCari, JUDUL_CARI } from '@/components/cari/HalamanCari'
import { PATH_INDEKS } from '@/lib/paths'
import { muatCari, muatSitus, rapikanKueri } from '@/modules/konten'
import { metadata, type MasukanSeo } from '@/modules/seo'

type Props = { searchParams: Promise<{ q?: string | string[] }> }

/** Halaman hasil pencarian tidak diindeks (spesifikasi §7), tetapi tautannya tetap diikuti. */
const masukan: MasukanSeo = { jenis: 'statis', judul: JUDUL_CARI, path: PATH_INDEKS.cari, deskripsi: DESKRIPSI_CARI, noindex: true }

export async function generateMetadata(): Promise<Metadata> {
  return metadata(masukan, await muatSitus())
}

/** Dirender per permintaan karena membaca `searchParams`; hasil per kueri di-cache bertag `artikel`. */
export default async function Cari({ searchParams }: Props) {
  const kueri = rapikanKueri((await searchParams).q)
  const hasil = kueri ? await muatCari(kueri) : []
  return <HalamanCari kueri={kueri} hasil={hasil} masukan={masukan} />
}
