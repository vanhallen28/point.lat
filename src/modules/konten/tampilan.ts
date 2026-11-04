import type { Footer, Header } from '@/payload-types'
import { PATH_INDEKS, pathFor } from '@/lib/paths'

import type { DataFooter, DataHeader, ItemMenu, Tautan } from './tipe'

export const TOOLS_BAWAAN: Tautan = { label: 'Tools', href: PATH_INDEKS.tools }
export const HAK_CIPTA_BAWAAN = '© 2026 point.lat'

/** Nama platform sosial seperti ditulis pemiliknya. */
export const LABEL_SOSIAL: Record<NonNullable<Footer['sosial']>[number]['platform'], string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X',
  facebook: 'Facebook',
  threads: 'Threads',
  linkedin: 'LinkedIn',
}

/**
 * Menu header dari global `header` (depth 1). Item pilar memakai path dan warna pilarnya; item yang
 * relasinya belum di-populate, pilarnya terhapus, atau tautannya kosong dilewati.
 */
export function susunHeader(header: Pick<Header, 'menu' | 'tombolTools'>): DataHeader {
  const menu: ItemMenu[] = []
  for (const item of header.menu ?? []) {
    if (item.jenis === 'pilar') {
      const pilar = item.pilar && typeof item.pilar === 'object' ? item.pilar : null
      if (pilar?.slug) menu.push({ label: item.label, href: pathFor({ jenis: 'pilar', slug: pilar.slug }), warna: pilar.warna })
    } else if (item.url?.trim()) {
      menu.push({ label: item.label, href: item.url.trim(), warna: null })
    }
  }
  const tools = header.tombolTools
  return {
    menu,
    tools: { label: tools?.label?.trim() || TOOLS_BAWAAN.label, href: tools?.url?.trim() || TOOLS_BAWAAN.href },
  }
}

export function susunFooter(footer: Pick<Footer, 'tautan' | 'sosial' | 'saluranWhatsApp' | 'teksHakCipta'>): DataFooter {
  return {
    tautan: (footer.tautan ?? []).filter((t) => t.url?.trim()).map((t) => ({ label: t.label, href: t.url.trim() })),
    sosial: (footer.sosial ?? []).map((s) => ({ label: LABEL_SOSIAL[s.platform], href: s.url })),
    whatsapp: footer.saluranWhatsApp?.trim() || null,
    hakCipta: footer.teksHakCipta?.trim() || HAK_CIPTA_BAWAAN,
  }
}

/** Tautan internal (path situs) dirender dengan `next/link`; selain itu `<a>` biasa. */
export function tautanInternal(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//')
}
