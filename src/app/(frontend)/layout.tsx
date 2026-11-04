import type { Metadata } from 'next'
import React from 'react'

import '@/styles/tokens.css'
import '@/styles/dasar.css'

import { PemicuMasuk } from '@/components/motion/PemicuMasuk'
import { Footer } from '@/components/tata-letak/Footer'
import { Header } from '@/components/tata-letak/Header'
import { muatFooter, muatHeader } from '@/modules/konten'

import { archivo } from './font'

export const metadata: Metadata = {
  title: 'point.',
  description: 'Intinya dulu.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [header, footer] = await Promise.all([muatHeader(), muatFooter()])
  return (
    <html lang="id" className={archivo.variable}>
      <body>
        <a className="lewati" href="#isi">
          Langsung ke isi
        </a>
        <Header data={header} />
        <main id="isi">{children}</main>
        <Footer data={footer} />
        <PemicuMasuk />
      </body>
    </html>
  )
}
