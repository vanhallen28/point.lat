import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, PayloadRequest } from 'payload'

import { pathFor } from '@/lib/paths'

import { terapkanRedirect } from './redirectSaatPathBerubah'

type DokumenSubkategori = { id: number | string; slug?: string | null; pilar?: unknown }

/** Slug pilar dari relasi (ID atau dokumen). ID dibaca dengan `req` supaya ikut transaksi simpan. */
async function slugPilar(req: PayloadRequest, pilar: unknown): Promise<string | null> {
  if (pilar && typeof pilar === 'object') return (pilar as { slug?: string | null }).slug ?? null
  if (typeof pilar !== 'number' && typeof pilar !== 'string') return null
  const doc = await req.payload.findByID({ collection: 'pilar', id: pilar, depth: 0, req, disableErrors: true, select: { slug: true } })
  return doc?.slug ?? null
}

/** Path `/{pilar}/{subkategori}`, atau `null` bila slug subkategori atau pilarnya belum ada. */
export async function pathSubkategori(req: PayloadRequest, doc: DokumenSubkategori): Promise<string | null> {
  const pilarSlug = await slugPilar(req, doc.pilar)
  return doc.slug && pilarSlug ? pathFor({ jenis: 'subkategori', slug: doc.slug, pilarSlug }) : null
}

const kunciKonteks = (id: unknown) => `pathSubkategori:${String(id)}`

/**
 * Redirect otomatis halaman subkategori (spesifikasi §7: mengganti slug membuat redirect 301). Path
 * subkategori bergantung pada slug pilarnya, jadi tidak bisa memakai `redirectSaatPathBerubah` yang
 * membangun path tanpa query. Pola sama: path lama dicatat di `beforeChange`, dibandingkan setelah simpan.
 * Subkategori tidak punya draf, jadi `originalDoc` adalah versi publik.
 */
export const catatPathSubkategori: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
  if (operation !== 'update' || !originalDoc) return data
  const path = await pathSubkategori(req, originalDoc as DokumenSubkategori)
  // Ditulis setelah `await`: operasi Payload dengan `req` bisa mengganti objek `req.context`.
  req.context[kunciKonteks(originalDoc.id)] = path
  return data
}

/** Slug berganti atau subkategori pindah pilar: path lama dialihkan ke path baru. */
export const buatRedirectSubkategori: CollectionAfterChangeHook = async ({ doc, req }) => {
  const kunci = kunciKonteks(doc.id)
  const pathLama = req.context[kunci] as string | null | undefined
  delete req.context[kunci]
  if (!pathLama) return doc
  const pathBaru = await pathSubkategori(req, doc as DokumenSubkategori)
  if (pathBaru) await terapkanRedirect(req, pathLama, pathBaru)
  return doc
}

/**
 * Pilar berganti slug: path setiap subkategorinya ikut berubah, jadi setiap `/{slug-lama}/{subkategori}`
 * dialihkan ke `/{slug-baru}/{subkategori}`. Pilar tidak punya draf, jadi `previousDoc` adalah versi publik
 * sebelumnya. Path pilar sendiri ditangani `redirectSaatPathBerubah`.
 */
export const redirectSubkategoriPilar: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  const lama = previousDoc?.slug as string | null | undefined
  const baru = doc.slug as string | null | undefined
  if (operation !== 'update' || !lama || !baru || lama === baru) return doc
  const { docs } = await req.payload.find({
    collection: 'subkategori',
    where: { pilar: { equals: doc.id } },
    depth: 0,
    limit: 1000,
    pagination: false,
    select: { slug: true },
    req,
  })
  for (const sub of docs) {
    if (!sub.slug) continue
    await terapkanRedirect(req, pathFor({ jenis: 'subkategori', slug: sub.slug, pilarSlug: lama }), pathFor({ jenis: 'subkategori', slug: sub.slug, pilarSlug: baru }))
  }
  return doc
}
