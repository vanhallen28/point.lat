'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { Tautan } from '@/components/dasar/Tautan'
import { tandaAktif } from '@/modules/konten/tautan'

/**
 * Tautan header yang menandai rubrik atau bagian yang sedang dibuka (`aria-current`). Path dibaca di
 * klien lewat `usePathname`, karena layout yang merender header tidak tahu path halaman; saat
 * prerender, path halaman sudah tersedia, jadi penandanya ada di HTML awal.
 */
export function TautanAktif({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Tautan href={href} className={className} aria-current={tandaAktif(usePathname(), href)}>
      {children}
    </Tautan>
  )
}
