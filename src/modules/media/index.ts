import { klienCloudinary } from './cloudinary'
import type { KlienCloudinary } from './klien'
import { klienPalsu } from './palsu'

export type { JenisMedia, Preset, PresetGambar, PresetVideo } from './url'
export { bangunUrl, dimensiPreset, lebarkan, UKURAN_OG } from './url'
export { urlOg } from './og'

/**
 * Memilih klien dari env server. Tanpa ketiga kredensial (mis. `.env.test`, CI, mesin tanpa
 * akses Cloudinary) dipakai klien palsu dalam memori supaya tes dan dev tidak memanggil jaringan.
 * Produksi wajib mengisi kredensial: klien palsu tidak menyimpan file secara permanen.
 */
export function klienDariEnv(env: Record<string, string | undefined> = process.env): KlienCloudinary {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env
  if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
    return klienCloudinary({
      cloudName: CLOUDINARY_CLOUD_NAME,
      apiKey: CLOUDINARY_API_KEY,
      apiSecret: CLOUDINARY_API_SECRET,
    })
  }
  if (env.NODE_ENV === 'production' && env.NEXT_PHASE !== 'phase-production-build') {
    throw new Error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET wajib diisi di produksi.')
  }
  return klienPalsu()
}

let klien: KlienCloudinary | undefined

/** Klien bersama untuk satu proses. Tes bisa menggantinya lewat `pakaiKlien`. */
export function klienMedia(): KlienCloudinary {
  klien ??= klienDariEnv()
  return klien
}

export function pakaiKlien(baru: KlienCloudinary): void {
  klien = baru
}
