import type { Metadata } from 'next'

import { DESKRIPSI_GLOSARIUM, IndeksGlosarium, JUDUL_GLOSARIUM } from '@/components/glosarium/IndeksGlosarium'
import { PATH_INDEKS } from '@/lib/paths'
import { muatGlosarium, muatSitus } from '@/modules/konten'
import { metadata, type MasukanSeo } from '@/modules/seo'

const masukan: MasukanSeo = { jenis: 'statis', judul: JUDUL_GLOSARIUM, path: PATH_INDEKS.glosarium, deskripsi: DESKRIPSI_GLOSARIUM }

export async function generateMetadata(): Promise<Metadata> {
  return metadata(masukan, await muatSitus())
}

export default async function Glosarium() {
  const [kelompok, situs] = await Promise.all([muatGlosarium(), muatSitus()])
  return <IndeksGlosarium kelompok={kelompok} masukan={masukan} situs={situs} />
}
