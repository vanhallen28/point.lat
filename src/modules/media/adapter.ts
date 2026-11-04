import type { Adapter, GeneratedAdapter } from '@payloadcms/plugin-cloud-storage/types'
import { APIError } from 'payload'

import type { KlienCloudinary } from './klien'
import { jenisDariMime, jenisDariPublicId, resourceType, unggah } from './unggah'
import { urlDokumen } from './url'

export const NAMA_ADAPTER = 'cloudinary'

export const PESAN_UNGGAH_GAGAL = 'Unggahan ke Cloudinary gagal. Coba unggah ulang filenya.'

/** Field dokumen media yang dibaca adapter. */
type DokumenMedia = {
  publicId?: string | null
  jenis?: 'gambar' | 'video' | null
  mimeType?: string | null
  width?: number | null
  height?: number | null
}

/**
 * Adapter penyimpanan Cloudinary untuk `@payloadcms/plugin-cloud-storage` (antarmuka
 * `GeneratedAdapter`). Klien disuntikkan lewat fungsi supaya tes memakai klien palsu dan klien
 * sungguhan baru dibuat saat dibutuhkan.
 *
 * Unggahan langsung dari browser tidak lewat `handleUpload`: plugin melewatinya bila file membawa
 * `clientUploadContext`. Metadata unggahan itu diisi hook koleksi (Task 5).
 */
export function adapterCloudinary({ klien }: { klien: () => KlienCloudinary }): Adapter {
  return (): GeneratedAdapter => ({
    name: NAMA_ADAPTER,

    generateURL: ({ data }) => urlDokumen(klien().cloudName, (data ?? {}) as DokumenMedia),

    handleUpload: async ({ data, file, req }) => {
      const doc = data as DokumenMedia
      try {
        const { publicId, meta } = await unggah(klien(), {
          namaFile: file.filename,
          mimeType: file.mimeType,
          buffer: file.buffer,
          tempFilePath: file.tempFilePath,
          width: doc.width,
          height: doc.height,
        })
        return {
          publicId,
          jenis: meta.jenis,
          durasi: meta.durasi,
          filesize: meta.bytes,
          ...(meta.width && meta.height ? { width: meta.width, height: meta.height } : {}),
          url: urlDokumen(klien().cloudName, { publicId, jenis: meta.jenis }),
        }
      } catch (galat) {
        req.payload.logger.error({ err: galat, msg: `Unggah ${file.filename} ke Cloudinary gagal` })
        throw new APIError(PESAN_UNGGAH_GAGAL, 502)
      }
    },

    handleDelete: async ({ doc, req }) => {
      const { publicId, mimeType } = doc as DokumenMedia
      if (!publicId) return
      const jenis = mimeType ? jenisDariMime(mimeType) : jenisDariPublicId(publicId)
      try {
        await klien().hapus(publicId, resourceType(jenis))
      } catch (galat) {
        // Dokumen tetap terhapus; aset yatim di Cloudinary tidak merusak situs.
        req.payload.logger.warn({ err: galat, msg: `Gagal menghapus ${publicId} dari Cloudinary` })
      }
    },

    /** `/api/media/file/<nama>` diarahkan ke CDN Cloudinary, file tidak pernah dialirkan lewat server. */
    staticHandler: async (_req, { doc }) => {
      const publicId = (doc as DokumenMedia | undefined)?.publicId
      if (!publicId) return new Response(null, { status: 404 })
      return Response.redirect(urlDokumen(klien().cloudName, { publicId, jenis: jenisDariPublicId(publicId) }), 302)
    },
  })
}
