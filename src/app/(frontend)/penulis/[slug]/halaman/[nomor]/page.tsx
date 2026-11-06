import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import { cache } from 'react'

import { HalamanPenulis } from '@/components/penulis/HalamanPenulis'
import { SEGMEN_HALAMAN } from '@/lib/paths'
import { bacaNomor, muatPenulis, muatSitus, pathDariSegmen, tanganiTidakAda } from '@/modules/konten'
import { metadata, metadataTidakDitemukan } from '@/modules/seo'

type Props = { params: Promise<{ slug: string; nomor: string }> }

/**
 * `/penulis/{slug}/halaman/{n}`: halaman ke-n tulisan penulis (ISR, tag cache sama dengan profilnya).
 * `/halaman/1` dialihkan permanen ke profil; nomor tidak sah atau di luar jangkauan diteruskan ke
 * `tanganiTidakAda` (redirect dari CMS atau 404).
 */
export function generateStaticParams() {
  return []
}

const cari = cache(async (slug: string, nomor: string) => {
  const n = bacaNomor(nomor)
  return n === null ? null : muatPenulis(slug, n)
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, nomor } = await params
  const penulis = await cari(slug, nomor)
  if (!penulis || penulis.paginasi.nomor === 1) return metadataTidakDitemukan(await muatSitus())
  return metadata({ jenis: 'penulis', doc: penulis.seo, halaman: penulis.paginasi.nomor }, await muatSitus())
}

export default async function HalamanTulisanPenulis({ params }: Props) {
  const { slug, nomor } = await params
  const penulis = await cari(slug, nomor)
  // Path yang diminta apa adanya (nomor bisa tidak sah), untuk redirect dari CMS.
  if (!penulis) return tanganiTidakAda(pathDariSegmen(['penulis', slug, SEGMEN_HALAMAN, nomor]))
  if (penulis.paginasi.nomor === 1) permanentRedirect(penulis.href)
  return <HalamanPenulis penulis={penulis} situs={await muatSitus()} />
}
