import type { Metadata } from 'next'

import { Beranda } from '@/components/beranda/Beranda'
import { muatBeranda, muatSitus } from '@/modules/konten'
import { metadata } from '@/modules/seo'

export async function generateMetadata(): Promise<Metadata> {
  return metadata({ jenis: 'beranda' }, await muatSitus())
}

/**
 * Beranda dari global `beranda` (spesifikasi §4 "Pola tata letak"). Dirender statis saat build lalu
 * dibuang tag `beranda` setiap kali global beranda atau newsletter disimpan dan setiap kali artikel,
 * pilar, video, atau tools terbit.
 */
export default async function HalamanBeranda() {
  const [bagian, situs] = await Promise.all([muatBeranda(), muatSitus()])
  return <Beranda bagian={bagian} situs={situs} />
}
