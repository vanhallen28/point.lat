import type { Metadata } from 'next'
import React from 'react'

import '@/styles/tokens.css'
import '@/styles/dasar.css'

import { PanelPersetujuan } from '@/components/iklan/PanelPersetujuan'
import { PemuatIklan } from '@/components/iklan/PemuatIklan'
import { SkripPersetujuan } from '@/components/iklan/SkripPersetujuan'
import { PemicuMasuk } from '@/components/motion/PemicuMasuk'
import { KodeSematan } from '@/components/sematan/KodeSematan'
import { Footer } from '@/components/tata-letak/Footer'
import { Header } from '@/components/tata-letak/Header'
import { pathFor } from '@/lib/paths'
import { iklanSiap, muatIklan, SLUG_KEBIJAKAN_PRIVASI } from '@/modules/iklan'
import { muatFooter, muatHeader } from '@/modules/konten'
import { butuhPersetujuan, layananPersetujuan } from '@/modules/sematan'
import { muatKodeSematan } from '@/modules/sematan/cache'

import { archivo } from './font'

export const metadata: Metadata = {
  title: 'point.',
  description: 'Intinya dulu.',
}

/**
 * Banner persetujuan cookie bila ada yang membutuhkannya: iklan dinyalakan dengan ID penerbit yang valid dan
 * Kebijakan Privasi terbit (`iklanSiap`), atau ada Kode sematan jenis "Butuh persetujuan" (spesifikasi §23, juga
 * hanya bila Kebijakan Privasi terbit). Tanpa keduanya situs hanya memakai yang perlu. Pemuat iklan hanya bila
 * iklan siap. Pilihan pengunjung dibaca skrip awal di browser, jadi halaman tetap ISR; `suppressHydrationWarning`
 * karena skrip itu menulis atribut `<html>` sebelum React hidrasi.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [header, footer, iklan, sematan] = await Promise.all([muatHeader(), muatFooter(), muatIklan(), muatKodeSematan()])
  const adaIklan = iklanSiap(iklan)
  const analitik = butuhPersetujuan(sematan)
  const persetujuan = adaIklan || analitik
  return (
    <html lang="id" className={archivo.variable} suppressHydrationWarning>
      {persetujuan && (
        <head>
          <SkripPersetujuan analitik={analitik} />
        </head>
      )}
      <body>
        <a className="lewati" href="#isi">
          Langsung ke isi
        </a>
        {persetujuan && (
          <PanelPersetujuan
            kebijakan={pathFor({ jenis: 'halaman', slug: SLUG_KEBIJAKAN_PRIVASI })}
            iklan={adaIklan}
            layanan={layananPersetujuan(sematan)}
          />
        )}
        <Header data={header} />
        <main id="isi">{children}</main>
        <Footer data={footer} persetujuan={persetujuan} />
        <PemicuMasuk />
        {adaIklan && <PemuatIklan />}
        <KodeSematan kode={sematan} />
      </body>
    </html>
  )
}
