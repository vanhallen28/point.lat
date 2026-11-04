import sharp from 'sharp'

import type { KlienCloudinary } from './klien'
import { KANVAS_OG } from './og'

export type HasilSiapkan = { kanvas: 'dibuat' | 'sudah-ada' }

/**
 * Menyiapkan aset sistem di Cloudinary. Aman dijalankan berkali-kali. Saat ini hanya kanvas
 * PNG 1x1 putih untuk gambar OG (diregangkan dan diwarnai di URL, lihat `og.ts`).
 */
export async function siapkanCloudinary(klien: KlienCloudinary): Promise<HasilSiapkan> {
  if (await klien.ambil(KANVAS_OG, 'image')) return { kanvas: 'sudah-ada' }
  const buffer = await sharp({
    create: { width: 1, height: 1, channels: 3, background: '#FFFFFF' },
  })
    .png()
    .toBuffer()
  await klien.unggah(
    { buffer, mimeType: 'image/png', width: 1, height: 1 },
    {
      public_id: KANVAS_OG,
      resource_type: 'image',
      overwrite: false,
      transformation: '',
      allowed_formats: 'png',
    },
  )
  return { kanvas: 'dibuat' }
}
