/*
 * Aturan tautan yang juga dipakai komponen klien (`Tautan`, `TautanAktif`). Dipisah dari `tampilan.ts` tanpa impor
 * lain supaya bundel klien setiap halaman tidak ikut memuat penyusun header dan footer (anggaran JavaScript,
 * spesifikasi §12).
 */

/**
 * Penanda tautan header untuk path yang sedang dibuka: `page` bila path sama persis, `true` bila path
 * berada di bawahnya (rubrik `/uang-karier` saat membuka `/uang-karier/pajak`, Tools saat membuka
 * `/tools/gaji-bersih`). Beranda dan URL luar tidak pernah ditandai sebagai induk.
 */
export function tandaAktif(path: string | null, href: string): 'page' | 'true' | undefined {
  if (!path || !tautanInternal(href)) return undefined
  if (path === href) return 'page'
  return href !== '/' && path.startsWith(`${href}/`) ? 'true' : undefined
}

/** Tautan internal (path situs) dirender dengan `next/link`; selain itu `<a>` biasa. */
export function tautanInternal(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//')
}
