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

/** Jumlah topik paling banyak di baris "Topik hangat" header. */
export const MAKS_TOPIK = 5

/** Subkategori tulisan terbit terbaru, urut kemunculan pertama, tanpa duplikat. */
export type SubkategoriTulisan = { nama: string; slug: string; pilarSlug: string }

/**
 * Baris "Topik hangat" header: subkategori dari tulisan terbaru (urutan terbaru dulu), paling banyak `MAKS_TOPIK`,
 * jadi topiknya ikut bergeser setiap ada tulisan baru tanpa diatur editor.
 */
export function susunTopik(sub: SubkategoriTulisan[]): Tautan[] {
  const hasil: Tautan[] = []
  const terpakai = new Set<string>()
  for (const s of sub) {
    const href = pathFor({ jenis: 'subkategori', slug: s.slug, pilarSlug: s.pilarSlug })
    if (terpakai.has(href)) continue
    terpakai.add(href)
    hasil.push({ label: s.nama, href })
    if (hasil.length >= MAKS_TOPIK) break
  }
  return hasil
}

/**
 * Menu header dari global `header` (depth 1). Item pilar memakai path dan warna pilarnya; item yang
 * relasinya belum di-populate, pilarnya terhapus, atau tautannya kosong dilewati. `pilarTerisi`: slug pilar
 * yang punya tulisan terbit; bila diisi, pilar lain disembunyikan supaya pembaca tidak membuka rubrik kosong.
 */
export function susunHeader(
  header: Pick<Header, 'menu' | 'tombolTools'>,
  opsi: { pilarTerisi?: ReadonlySet<string>; topik?: Tautan[] } = {},
): DataHeader {
  const menu: ItemMenu[] = []
  for (const item of header.menu ?? []) {
    if (item.jenis === 'pilar') {
      const pilar = item.pilar && typeof item.pilar === 'object' ? item.pilar : null
      if (pilar?.slug && opsi.pilarTerisi && !opsi.pilarTerisi.has(pilar.slug)) continue
      if (pilar?.slug) menu.push({ label: item.label, href: pathFor({ jenis: 'pilar', slug: pilar.slug }), warna: pilar.warna })
    } else if (item.url?.trim()) {
      menu.push({ label: item.label, href: item.url.trim(), warna: null })
    }
  }
  const tools = header.tombolTools
  return {
    menu,
    tools: { label: tools?.label?.trim() || TOOLS_BAWAAN.label, href: tools?.url?.trim() || TOOLS_BAWAAN.href },
    topik: opsi.topik ?? [],
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

export { tandaAktif, tautanInternal } from './tautan'
