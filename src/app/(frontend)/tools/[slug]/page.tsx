import type { Metadata } from 'next'
import { cache } from 'react'

import { HalamanTool } from '@/components/tools/HalamanTool'
import { pathFor } from '@/lib/paths'
import { muatIklan } from '@/modules/iklan'
import { muatSitus, muatTool, susunKalkulator, tanganiTidakAda } from '@/modules/konten'
import { metadata, metadataTidakDitemukan } from '@/modules/seo'

type Props = { params: Promise<{ slug: string }> }

/** `/tools/{slug}`: satu kalkulator (ISR). */
export function generateStaticParams() {
  return []
}

const cari = cache(async (slug: string) => muatTool(slug))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tool = await cari((await params).slug)
  if (!tool) return metadataTidakDitemukan(await muatSitus())
  return metadata({ jenis: 'tools', doc: tool.seo }, await muatSitus())
}

export default async function Tool({ params }: Props) {
  const { slug } = await params
  const tool = await cari(slug)
  if (!tool) return tanganiTidakAda(pathFor({ jenis: 'tools', slug }))
  // Hasil contoh memakai aturan yang berlaku saat halaman dirender. Parameter yang tidak berlaku
  // untuk tanggal ini (dipakai parameter terakhir yang valid) dicatat ke log server (spesifikasi §15).
  const { kalkulator, contoh } = susunKalkulator(tool, new Date())
  for (const peringatan of kalkulator.peringatan) console.warn(`[hitung] ${tool.toolId}: ${peringatan}`)
  if (kalkulator.pesan) console.error(`[hitung] ${tool.toolId}: ${kalkulator.pesan}`)
  return <HalamanTool tool={tool} kalkulator={kalkulator} contoh={contoh} situs={await muatSitus()} iklan={await muatIklan()} />
}
