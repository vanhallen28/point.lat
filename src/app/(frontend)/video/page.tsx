import type { Metadata } from 'next'

import { DESKRIPSI_VIDEO, IndeksVideo, JUDUL_VIDEO } from '@/components/video/HalamanVideo'
import { PATH_INDEKS } from '@/lib/paths'
import { muatDaftarVideo, muatSitus } from '@/modules/konten'
import { metadata, type MasukanSeo } from '@/modules/seo'

const masukan: MasukanSeo = { jenis: 'statis', judul: JUDUL_VIDEO, path: PATH_INDEKS.video, deskripsi: DESKRIPSI_VIDEO }

export async function generateMetadata(): Promise<Metadata> {
  return metadata(masukan, await muatSitus())
}

export default async function Video() {
  const [video, situs] = await Promise.all([muatDaftarVideo(), muatSitus()])
  return <IndeksVideo video={video} masukan={masukan} situs={situs} />
}
