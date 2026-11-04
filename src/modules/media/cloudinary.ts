import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary'
import { createReadStream } from 'fs'
import { Readable } from 'stream'

import type { AsetCloudinary, BerkasUnggahan, KlienCloudinary, OpsiUnggahan, ResourceType } from './klien'

export type KredensialCloudinary = { cloudName: string; apiKey: string; apiSecret: string }

/** Di atas ini dipakai unggah bertahap (Upload API mewajibkan chunk untuk file > 100 MB). */
const AMBANG_CHUNK = 99 * 1024 * 1024

function keAset(hasil: UploadApiResponse | Record<string, unknown>): AsetCloudinary {
  const r = hasil as Record<string, unknown>
  return {
    publicId: String(r.public_id),
    resourceType: r.resource_type === 'video' ? 'video' : 'image',
    version: Number(r.version),
    format: String(r.format ?? ''),
    bytes: Number(r.bytes ?? 0),
    width: typeof r.width === 'number' ? r.width : undefined,
    height: typeof r.height === 'number' ? r.height : undefined,
    duration: typeof r.duration === 'number' ? r.duration : undefined,
  }
}

/** Klien Cloudinary sungguhan di atas SDK `cloudinary` v2. Hanya dipakai di server. */
export function klienCloudinary({ cloudName, apiKey, apiSecret }: KredensialCloudinary): KlienCloudinary {
  const auth = { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true }

  return {
    cloudName,
    apiKey,

    unggah(berkas: BerkasUnggahan, opsi: OpsiUnggahan) {
      const besar = berkas.tempFilePath ? true : berkas.buffer.length > AMBANG_CHUNK
      // `raw_transformation` dikirim apa adanya; `transformation` berupa string akan dianggap nama
      // transformasi tersimpan (`t_...`) oleh SDK.
      const { transformation, ...lain } = opsi
      const opsiSdk: Record<string, unknown> = { ...auth, ...lain, raw_transformation: transformation }
      return new Promise<AsetCloudinary>((selesai, gagal) => {
        const tujuan = (besar ? cloudinary.uploader.upload_chunked_stream : cloudinary.uploader.upload_stream)(
          opsiSdk as UploadApiOptions,
          (galat, hasil) => (galat || !hasil ? gagal(galat ?? new Error('Hasil unggah kosong')) : selesai(keAset(hasil))),
        )
        const sumber = berkas.tempFilePath ? createReadStream(berkas.tempFilePath) : Readable.from(berkas.buffer)
        sumber.on('error', gagal).pipe(tujuan)
      })
    },

    async ambil(publicId: string, resourceType: ResourceType) {
      try {
        return keAset(await cloudinary.api.resource(publicId, { ...auth, resource_type: resourceType }))
      } catch (galat) {
        if ((galat as { error?: { http_code?: number } }).error?.http_code === 404) return null
        throw galat
      }
    },

    async hapus(publicId: string, resourceType: ResourceType) {
      await cloudinary.uploader.destroy(publicId, { ...auth, resource_type: resourceType, invalidate: true })
    },

    unduh(aset: AsetCloudinary) {
      const url = cloudinary.url(aset.publicId, {
        ...auth,
        resource_type: aset.resourceType,
        version: aset.version,
        format: aset.format,
      })
      return fetch(url)
    },

    tandaTangan(parameter: Record<string, string>) {
      return cloudinary.utils.api_sign_request(parameter, apiSecret)
    },
  }
}
