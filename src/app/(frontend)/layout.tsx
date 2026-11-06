import type { Metadata } from 'next'
import React from 'react'

import '@/styles/tokens.css'
import '@/styles/dasar.css'

import { PanelPersetujuan } from '@/components/iklan/PanelPersetujuan'
import { PemuatIklan } from '@/components/iklan/PemuatIklan'
import { SkripPersetujuan } from '@/components/iklan/SkripPersetujuan'
import { PemicuMasuk } from '@/components/motion/PemicuMasuk'
import { Footer } from '@/components/tata-letak/Footer'
import { Header } from '@/components/tata-letak/Header'
import { pathFor } from '@/lib/paths'
import { iklanSiap, muatIklan } from '@/modules/iklan'
import { muatFooter, muatHeader } from '@/modules/konten'

import { archivo } from './font'

export const metadata: Metadata = {
  title: 'point.',
  description: 'Intinya dulu.',
}

/**
 * Banner persetujuan cookie dan pemuat iklan hanya bila iklan dinyalakan dengan ID penerbit yang valid: tanpa iklan, situs
 * hanya memakai yang perlu. Pilihan pengunjung dibaca skrip awal di browser, jadi halaman tetap ISR;
 * `suppressHydrationWarning` karena skrip itu menulis atribut `<html>` sebelum React hidrasi.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [header, footer, iklan] = await Promise.all([muatHeader(), muatFooter(), muatIklan()])
  const persetujuan = iklanSiap(iklan)
  return (
    <html lang="id" className={archivo.variable} suppressHydrationWarning>
      {persetujuan && (
        <head>
          <SkripPersetujuan />
        </head>
      )}
      <body>
        <a className="lewati" href="#isi">
          Langsung ke isi
        </a>
        {persetujuan && <PanelPersetujuan kebijakan={pathFor({ jenis: 'halaman', slug: 'kebijakan-privasi' })} />}
        <Header data={header} />
        <main id="isi">{children}</main>
        <Footer data={footer} persetujuan={persetujuan} />
        <PemicuMasuk />
        {persetujuan && <PemuatIklan />}
      </body>
    </html>
  )
}
