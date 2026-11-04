import { APIError, type CollectionBeforeChangeHook, type CollectionBeforeOperationHook } from 'payload'

import type { AsetCloudinary } from './klien'
import { isKonteksUnggahLangsung } from './tandaTangan'
import { metaDariAset } from './unggah'

/**
 * Kunci `req.context` berisi aset Cloudinary dari unggahan langsung pada permintaan ini. Diisi
 * `staticHandler` adapter saat Payload mengambil file untuk diperiksa, sebelum operasi berjalan.
 */
export const KUNCI_ASET_LANGSUNG = 'mediaAsetLangsung'

export const PESAN_BELUM_ADA = 'File belum sampai di Cloudinary. Unggah ulang filenya.'

export function asetLangsung(context: Record<string, unknown>): AsetCloudinary | undefined {
  return context[KUNCI_ASET_LANGSUNG] as AsetCloudinary | undefined
}

/**
 * beforeOperation: unggahan langsung hanya diterima bila asetnya benar-benar ada di Cloudinary
 * dengan publicId dari receipt. Dokumen tidak pernah menyimpan media rusak (spesifikasi §15).
 * Operasi tanpa unggahan langsung (unggah lewat server, update metadata) membersihkan kuncinya.
 */
export const periksaUnggahLangsung: CollectionBeforeOperationHook = ({ operation, req }) => {
  if (operation !== 'create' && operation !== 'update') return
  const konteks = req.file?.clientUploadContext
  if (!isKonteksUnggahLangsung(konteks)) {
    delete req.context[KUNCI_ASET_LANGSUNG]
    return
  }
  if (asetLangsung(req.context)?.publicId !== konteks.publicId) throw new APIError(PESAN_BELUM_ADA, 400)
}

/** beforeChange: metadata dokumen diambil dari aset Cloudinary (ukuran setelah incoming transformation). */
export const isiMetaUnggahLangsung: CollectionBeforeChangeHook = ({ data, req }) => {
  const aset = asetLangsung(req.context)
  if (!aset) return data
  const meta = metaDariAset(aset)
  return {
    ...data,
    publicId: aset.publicId,
    jenis: meta.jenis,
    durasi: meta.durasi,
    filesize: meta.bytes,
    ...(meta.width && meta.height ? { width: meta.width, height: meta.height } : {}),
  }
}
