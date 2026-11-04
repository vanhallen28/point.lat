import type { Redirect } from '@/payload-types'

export type RedirectTersimpan = Pick<Redirect, 'kode' | 'ke'>

/** Path dari segmen rute catch-all (`['a', 'b']` menjadi `/a/b`). */
export function pathDariSegmen(segmen: string[]): string {
  return `/${segmen.join('/')}`
}

/**
 * Tujuan redirect permanen, atau `null` bila path harus menjawab 404: tidak ada redirect, kode 410,
 * atau tujuan kosong. Redirect ke dirinya sendiri juga diabaikan supaya tidak berputar.
 */
export function tujuanRedirect(path: string, redirect: RedirectTersimpan | null): string | null {
  const ke = redirect?.ke?.trim()
  if (redirect?.kode !== '301' || !ke || ke === path) return null
  return ke
}
