import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionBeforeChangeHook, PayloadRequest } from 'payload'

import { TOOL_IDS, type ToolId } from '@/lib/konstanta'
import { pathFor } from '@/lib/paths'
import { sumberParameter } from '@/modules/hitung'
import { bandingkanVersi, jalankanSetelahRespons, kabari, type Kabar, type VersiPublik } from '@/modules/indexer'

import type { KeTarget } from './redirectSaatPathBerubah'

type DokumenPublik = {
  id: number | string
  slug?: string | null
  _status?: 'draft' | 'published' | null
  seo?: { noindex?: boolean | null } | null
} & Record<string, unknown>

const kunciKonteks = (koleksi: string, id: unknown) => `indexerSebelumnya:${koleksi}:${String(id)}`

async function kirim(req: PayloadRequest, kabar: Kabar[]): Promise<void> {
  if (!kabar.length) return
  await kabari(req.payload, kabar, { req })
  jalankanSetelahRespons(req.payload)
}

/**
 * Pemicu Mesin Indexing (spesifikasi §8: terbit, ubah besar, hapus) untuk koleksi berhalaman publik.
 *
 * Polanya sama dengan `redirectSaatPathBerubah` dan `revalidasiPublik`: versi publik dokumen (path dan
 * tanda perubahan besar) dicatat di `req.context` saat `beforeChange`, karena di `afterChange` dokumen
 * utama sudah tertimpa dan `previousDoc` bisa berisi draf. Setelah simpan, kedua versi dibandingkan
 * (`bandingkanVersi`): terbit pertama, batal terbit, ganti slug (path lama pindah), dan perubahan besar
 * menjadi kabar; simpan draf dan suntingan kecil tidak. Dokumen noindex tidak dianggap publik.
 * Dipasang setelah hook revalidasi, jadi langkah 1 (revalidasi) sudah terjadi saat kabar dicatat.
 */
export function kabariMesinPencari(
  keTarget: KeTarget,
  opsi: { tanda?: (doc: DokumenPublik) => string | null | undefined } = {},
): {
  beforeChange: CollectionBeforeChangeHook
  afterChange: CollectionAfterChangeHook
  afterDelete: CollectionAfterDeleteHook
} {
  function versiPublik(doc: DokumenPublik | null | undefined, pakaiDraf: boolean): VersiPublik | null {
    if (!doc || (pakaiDraf && doc._status !== 'published') || doc.seo?.noindex) return null
    const target = keTarget(doc)
    return target ? { path: pathFor(target), tanda: opsi.tanda?.(doc) ?? null } : null
  }

  async function versiUtama(req: PayloadRequest, koleksi: string, id: number | string) {
    const utama = await req.payload.findByID({ collection: koleksi as 'artikel', id, draft: false, depth: 0, req, disableErrors: true })
    return versiPublik(utama as DokumenPublik | null, true)
  }

  const beforeChange: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req, collection }) => {
    if (operation !== 'update' || !originalDoc) return data
    const pakaiDraf = Boolean(collection.versions?.drafts)
    // `originalDoc` adalah versi terakhir. Bila versi itu terbit (atau koleksi tanpa draf), itulah versi publik.
    const versi =
      !pakaiDraf || originalDoc._status === 'published' ? versiPublik(originalDoc, pakaiDraf) : await versiUtama(req, collection.slug, originalDoc.id)
    // Ditulis setelah `await`: operasi Payload dengan `req` bisa mengganti objek `req.context`.
    req.context[kunciKonteks(collection.slug, originalDoc.id)] = versi
    return data
  }

  const afterChange: CollectionAfterChangeHook = async ({ doc, req, collection }) => {
    const kunci = kunciKonteks(collection.slug, doc.id)
    const lama = (req.context[kunci] as VersiPublik | null | undefined) ?? null
    delete req.context[kunci]
    const pakaiDraf = Boolean(collection.versions?.drafts)
    // Simpan draf atau batal terbit: versi publik sekarang adalah dokumen utama.
    const baru = pakaiDraf && doc._status !== 'published' ? (lama ? await versiUtama(req, collection.slug, doc.id) : null) : versiPublik(doc, pakaiDraf)
    await kirim(req, bandingkanVersi(lama, baru))
    return doc
  }

  const afterDelete: CollectionAfterDeleteHook = async ({ doc, req, collection }) => {
    const lama = versiPublik(doc, Boolean(collection.versions?.drafts))
    if (lama) await kirim(req, [{ path: lama.path, jenis: 'hapus' }])
    return doc
  }

  return { beforeChange, afterChange, afterDelete }
}

/**
 * Angka aturan berubah: halaman kalkulator terbit yang memakai parameter itu berubah isinya (angka
 * aturan dan hasil contoh), jadi dikabarkan sebagai perubahan besar. THR ikut Gaji Bersih (`sumberParameter`).
 */
async function kabariToolsTerdampak(req: PayloadRequest, toolId: (ToolId | null | undefined)[]): Promise<void> {
  const terdampak = TOOL_IDS.filter((t) => sumberParameter(t).some((s) => toolId.includes(s)))
  if (!terdampak.length) return
  const { docs } = await req.payload.find({
    collection: 'tools',
    where: { and: [{ toolId: { in: terdampak } }, { _status: { equals: 'published' } }, { 'seo.noindex': { not_equals: true } }] },
    depth: 0,
    limit: TOOL_IDS.length,
    select: { slug: true },
    req,
  })
  await kirim(
    req,
    docs.flatMap((d) => (d.slug ? [{ path: pathFor({ jenis: 'tools', slug: d.slug }), jenis: 'ubah-besar' as const }] : [])),
  )
}

export const kabariParameterTools: { afterChange: CollectionAfterChangeHook; afterDelete: CollectionAfterDeleteHook } = {
  afterChange: async ({ doc, previousDoc, req }) => {
    await kabariToolsTerdampak(req, [doc.toolId, previousDoc?.toolId])
    return doc
  },
  afterDelete: async ({ doc, req }) => {
    await kabariToolsTerdampak(req, [doc.toolId])
    return doc
  },
}
