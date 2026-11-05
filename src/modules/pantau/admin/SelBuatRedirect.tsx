import type { Payload } from 'payload'

import { urlAdmin } from '@/lib/admin'

/**
 * Sel kolom "Tindakan" di daftar Log 404 (spesifikasi §8): "Buat redirect" membuka form redirect dengan
 * path terisi, atau "Lihat redirect" bila path itu sudah dialihkan. Nama tautan menyebut path-nya supaya
 * pembaca layar bisa membedakan setiap baris. Server component, satu query kecil per baris.
 */
export async function SelBuatRedirect({ rowData, payload }: { rowData?: { path?: string | null }; payload: Payload }) {
  const path = rowData?.path
  if (!path) return null
  const { docs } = await payload.find({ collection: 'redirect', where: { dari: { equals: path } }, limit: 1, depth: 0, select: { dari: true } })
  if (docs[0]) {
    return (
      <a href={urlAdmin.dokumen('redirect', docs[0].id)} aria-label={`Lihat redirect untuk ${path}`}>
        Lihat redirect
      </a>
    )
  }
  return (
    <a href={urlAdmin.buat('redirect', { dari: path })} aria-label={`Buat redirect untuk ${path}`}>
      Buat redirect
    </a>
  )
}
