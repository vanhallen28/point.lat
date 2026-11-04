'use client'

import { createClientUploadHandler } from '@payloadcms/plugin-cloud-storage/client'
import { formatAdminURL } from 'payload/shared'

import { kirimKeCloudinary, pesanDariRespons, type PersiapanKirim } from './kirim'

/**
 * Pengunggah admin: minta tanda tangan ke server, kirim file langsung dari browser ke Cloudinary,
 * lalu kembalikan receipt ke form Payload. File tidak lewat server Vercel (batas sekitar 4,5 MB).
 * Pesan galat tampil sebagai toast di dialog unggah; dokumen tidak tersimpan bila gagal.
 */
export const UnggahLangsung = createClientUploadHandler({
  handler: async ({ apiRoute, collectionSlug, file, serverHandlerPath, serverURL }) => {
    const respons = await fetch(formatAdminURL({ apiRoute, path: serverHandlerPath, serverURL }), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collectionSlug, filename: file.name, filesize: file.size, mimeType: file.type }),
    })
    const data = (await respons.json().catch(() => null)) as
      | (PersiapanKirim & { clientUploadContext: unknown })
      | null
    if (!respons.ok || !data) {
      throw new Error(pesanDariRespons(data) ?? 'Tanda tangan unggah tidak didapat. Coba lagi.')
    }
    await kirimKeCloudinary(file, data)
    return data.clientUploadContext
  },
})
