import type { Payload } from 'payload'

import type { TipeArtikel } from '@/lib/konstanta'
import { pathFor } from '@/lib/paths'

import { LABEL_STATUS_INDEKS } from '../tipe'

type BarisArtikel = {
  slug?: string | null
  tipe?: TipeArtikel | null
  _status?: string | null
  seo?: { noindex?: boolean | null } | null
}

/**
 * Sel kolom "Status indeks" di daftar artikel (spesifikasi §1 kriteria sukses 2): status Google dari
 * koleksi `status-indeks` untuk path publik artikel. Server component, satu query kecil per baris.
 */
export async function SelStatusIndeks({ rowData, payload }: { rowData?: BarisArtikel; payload: Payload }) {
  if (rowData?.seo?.noindex) return <span>Noindex</span>
  if (!rowData?.slug || !rowData.tipe) return <span>Belum terbit</span>
  const path = pathFor({ jenis: 'artikel', slug: rowData.slug, tipe: rowData.tipe })
  const { docs } = await payload.find({ collection: 'status-indeks', where: { path: { equals: path } }, limit: 1, depth: 0, select: { status: true } })
  const status = docs[0]?.status
  return <span>{status ? LABEL_STATUS_INDEKS[status] : rowData._status === 'published' ? 'Belum dicek' : 'Belum terbit'}</span>
}
