import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, PayloadRequest } from 'payload'

import { pathFor, type TargetPath } from '@/lib/paths'
import { rencanaRedirect } from '@/lib/redirect'

type DokumenBerpath = { slug?: string | null; _status?: 'draft' | 'published' | null } & Record<
  string,
  unknown
>

export type KeTarget = (doc: DokumenBerpath) => TargetPath | null

const kunciKonteks = (koleksi: string, id: unknown) => `pathPublik:${koleksi}:${String(id)}`

/**
 * Menulis redirect untuk path yang berubah (`rencanaRedirect`: path lama ke path baru, tanpa rantai dan
 * tanpa putaran). Dipakai juga hook subkategori dan pilar (`redirectSubkategori.ts`). Update massal
 * menjalankan hook setiap dokumen secara paralel dalam satu transaksi; itu aman di sini karena setiap
 * dokumen hanya membaca dan menulis baris redirect untuk path miliknya sendiri (slug unik per koleksi).
 */
export async function terapkanRedirect(req: PayloadRequest, pathLama: string, pathBaru: string): Promise<void> {
  if (pathLama === pathBaru) return
  const { docs } = await req.payload.find({
    collection: 'redirect',
    where: {
      or: [{ dari: { equals: pathBaru } }, { dari: { equals: pathLama } }, { ke: { equals: pathLama } }],
    },
    limit: 100,
    depth: 0,
    req,
  })
  const rencana = rencanaRedirect(pathLama, pathBaru, docs)

  for (const id of rencana.hapus) {
    await req.payload.delete({ collection: 'redirect', id, req })
  }
  for (const { id, ke } of rencana.ubah) {
    await req.payload.update({ collection: 'redirect', id, data: { ke, kode: '301' }, req })
  }
  for (const { dari, ke } of rencana.buat) {
    await req.payload.create({
      collection: 'redirect',
      data: { dari, ke, kode: '301', sumber: 'otomatis' },
      req,
    })
  }
}

/**
 * Membuat redirect 301 saat dokumen yang sudah publik diterbitkan dengan path berbeda.
 *
 * Dua hook karena saat terbit setelah draf, `previousDoc` di afterChange berisi draf terakhir,
 * bukan versi yang sedang publik. Jadi path publik dicatat di beforeChange (dokumen utama belum
 * ditimpa), lalu dibandingkan di afterChange.
 */
export function redirectSaatPathBerubah(keTarget: KeTarget): {
  catatPathPublik: CollectionBeforeChangeHook
  buatRedirect: CollectionAfterChangeHook
} {
  const catatPathPublik: CollectionBeforeChangeHook = async ({
    data,
    originalDoc,
    operation,
    req,
    collection,
  }) => {
    const pakaiDraf = Boolean(collection.versions?.drafts)
    if (operation !== 'update' || !originalDoc) return data
    if (pakaiDraf && data._status !== 'published') return data

    const publik = pakaiDraf
      ? await req.payload.findByID({
          collection: collection.slug as 'artikel',
          id: originalDoc.id,
          draft: false,
          depth: 0,
          req,
          disableErrors: true,
        })
      : originalDoc
    if (!publik || (pakaiDraf && publik._status !== 'published')) return data

    const target = keTarget(publik as DokumenBerpath)
    if (target) req.context[kunciKonteks(collection.slug, originalDoc.id)] = pathFor(target)
    return data
  }

  const buatRedirect: CollectionAfterChangeHook = async ({ doc, req, collection }) => {
    const kunci = kunciKonteks(collection.slug, doc.id)
    const pathLama = req.context[kunci] as string | undefined
    if (!pathLama) return doc
    delete req.context[kunci]

    const targetBaru = keTarget(doc)
    if (!targetBaru) return doc
    await terapkanRedirect(req, pathLama, pathFor(targetBaru))
    return doc
  }

  return { catatPathPublik, buatRedirect }
}

/** Target untuk koleksi berpath sederhana (`pilar`, `halaman`, `tools`, `video`, `penulis`). */
export const targetSederhana =
  (jenis: 'pilar' | 'halaman' | 'tools' | 'video' | 'penulis'): KeTarget =>
  (doc) =>
    doc.slug ? { jenis, slug: doc.slug } : null
