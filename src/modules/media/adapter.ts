import type { Adapter, GeneratedAdapter } from '@payloadcms/plugin-cloud-storage/types'
import { APIError } from 'payload'

import type { KlienCloudinary } from './klien'
import { isKonteksUnggahLangsung } from './tandaTangan'
import { jenisDariMime, jenisDariPublicId, resourceType, unggah } from './unggah'
import { asetLangsung, KUNCI_ASET_LANGSUNG } from './unggahLangsung'
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
 */
export function adapterCloudinary({ klien }: { klien: () => KlienCloudinary }): Adapter {
  return (): GeneratedAdapter => ({
    name: NAMA_ADAPTER,
    clientUploads: true,
    // Payload memverifikasi receipt dari endpoint tanda tangan sebelum menerima unggahan langsung.
    requiresClientUploadReceipt: true,

    generateURL: ({ data }) => urlDokumen(klien().cloudName, (data ?? {}) as DokumenMedia),

    handleUpload: async ({ data, file, req }) => {
      // Unggahan langsung sudah ada di Cloudinary. Plugin melewatinya, kecuali bila sharp
      // memproses ulang GIF/WebP dan menghapus konteksnya; aset dari browser tetap dipakai.
      if (asetLangsung(req.context)) return {}

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

    staticHandler: async (req, { doc, params }) => {
      // Unggahan langsung: Payload mengambil file untuk memeriksa jenis dan ukurannya sebelum
      // dokumen dibuat. Aset dicatat di req.context supaya hook tidak memanggil Admin API lagi.
      if (!doc && isKonteksUnggahLangsung(params.clientUploadContext)) {
        const { publicId } = params.clientUploadContext
        const aset = await klien().ambil(publicId, resourceType(jenisDariPublicId(publicId)))
        if (!aset) return new Response(null, { status: 404 })
        req.context[KUNCI_ASET_LANGSUNG] = aset
        return klien().unduh(aset)
      }
      // `/api/media/file/<nama>` diarahkan ke CDN Cloudinary, file tidak dialirkan lewat server.
      const publicId = (doc as DokumenMedia | undefined)?.publicId
      if (!publicId) return new Response(null, { status: 404 })
      return Response.redirect(urlDokumen(klien().cloudName, { publicId, jenis: jenisDariPublicId(publicId) }), 302)
    },
  })
}
