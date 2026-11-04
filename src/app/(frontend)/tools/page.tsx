import type { Metadata } from 'next'

import { DESKRIPSI_TOOLS, IndeksTools, JUDUL_TOOLS } from '@/components/tools/IndeksTools'
import { PATH_INDEKS } from '@/lib/paths'
import { muatSitus, muatTools } from '@/modules/konten'
import { metadata, type MasukanSeo } from '@/modules/seo'

const masukan: MasukanSeo = { jenis: 'statis', judul: JUDUL_TOOLS, path: PATH_INDEKS.tools, deskripsi: DESKRIPSI_TOOLS }

export async function generateMetadata(): Promise<Metadata> {
  return metadata(masukan, await muatSitus())
}

export default async function Tools() {
  const [kelompok, situs] = await Promise.all([muatTools(), muatSitus()])
  return <IndeksTools kelompok={kelompok} masukan={masukan} situs={situs} />
}
