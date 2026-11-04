import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'
import {
  assertClientUploadAccess,
  assertClientUploadAllowed,
  assertClientUploadFileSize,
  createClientUploadReceipt,
} from 'payload/internal'

import type { KlienCloudinary } from './klien'
import { mimeDiizinkan, PESAN_JENIS_DITOLAK, siapkanUnggahan } from './unggah'

export const PATH_TANDA_TANGAN = '/media-cloudinary-tanda-tangan'

/**
 * Konteks unggahan langsung yang dibawa receipt Payload. Payload menandatangani receipt dengan
 * PAYLOAD_SECRET, mengikatnya ke pengguna, koleksi, dan nama file, lalu memverifikasinya saat
 * dokumen dibuat (`requiresClientUploadReceipt`). Browser tidak bisa memalsukan publicId.
 */
export type KonteksUnggahLangsung = { publicId: string }

export function isKonteksUnggahLangsung(nilai: unknown): nilai is KonteksUnggahLangsung {
  const publicId = (nilai as Partial<KonteksUnggahLangsung> | null)?.publicId
  return typeof publicId === 'string' && /^point\/(gambar|video)\/[a-z0-9-]+$/.test(publicId)
}

type Masukan = { collectionSlug?: unknown; filename?: unknown; filesize?: unknown; mimeType?: unknown }

/**
 * Endpoint `POST /api/media-cloudinary-tanda-tangan`, pola yang sama dengan generateSignedURL di
 * `@payloadcms/storage-s3`: cek akses, cek jenis file, buat kunci di server, terbitkan receipt.
 * Bedanya, yang dikembalikan adalah field signed upload Cloudinary, bukan presigned URL S3.
 */
export function endpointTandaTangan({ klien }: { klien: () => KlienCloudinary }): PayloadHandler {
  return async (req: PayloadRequest) => {
    const masukan = ((await req.json?.().catch(() => null)) ?? {}) as Masukan
    const { collectionSlug, filename, filesize, mimeType } = masukan
    if (collectionSlug !== 'media' || typeof filename !== 'string') {
      throw new APIError('Permintaan tanda tangan tidak valid.', 400)
    }
    await assertClientUploadAccess({ collectionSlug, req })
    assertClientUploadAllowed({ collection: req.payload.collections.media.config, filename, mimeType })
    assertClientUploadFileSize(filesize)
    if (!mimeDiizinkan(mimeType)) throw new APIError(PESAN_JENIS_DITOLAK, 400)

    const persiapan = siapkanUnggahan(klien(), {
      namaFile: filename,
      mimeType,
      waktu: Math.floor(Date.now() / 1000),
    })
    const konteks: KonteksUnggahLangsung = { publicId: persiapan.publicId }
    const signedReceipt = createClientUploadReceipt({ collectionSlug, context: konteks, filename, req })

    return Response.json({
      urlUnggah: persiapan.urlUnggah,
      field: persiapan.field,
      clientUploadContext: { ...konteks, signedReceipt },
    })
  }
}
