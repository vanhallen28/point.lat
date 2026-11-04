import type { Metadata } from 'next'
import React from 'react'

import '@/styles/tokens.css'
import '@/styles/dasar.css'

import { archivo } from './font'

export const metadata: Metadata = {
  title: 'point.',
  description: 'Intinya dulu.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={archivo.variable}>
      <body>
        <main id="isi">{children}</main>
      </body>
    </html>
  )
}
