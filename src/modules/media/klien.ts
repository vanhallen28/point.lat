/**
 * Seam modul media: semua akses ke Cloudinary lewat antarmuka kecil ini supaya adapter
 * penyimpanan bisa diuji dengan klien palsu tanpa jaringan.
 */

export type ResourceType = 'image' | 'video'

/** Opsi Upload API Cloudinary yang dipakai point. (nama parameter sama dengan API). */
export type OpsiUnggahan = {
  public_id: string
  resource_type: ResourceType
  overwrite: false
  /** Incoming transformation: diterapkan ke file asli sebelum disimpan. */
  transformation: string
  /** Cloudinary menolak file di luar format ini, termasuk unggahan langsung dari browser. */
  allowed_formats: string
  eager?: string
  eager_async?: true
}

export type BerkasUnggahan = {
  buffer: Buffer
  mimeType: string
  /** Bila diisi, file dibaca dari disk dan `buffer` diabaikan. */
  tempFilePath?: string
  /** Ukuran asli yang sudah dibaca Payload; klien palsu memakainya untuk meniru incoming transformation. */
  width?: number | null
  height?: number | null
}

export type AsetCloudinary = {
  publicId: string
  resourceType: ResourceType
  version: number
  format: string
  bytes: number
  width?: number
  height?: number
  /** Detik, hanya untuk video. */
  duration?: number
}

export interface KlienCloudinary {
  readonly cloudName: string
  readonly apiKey: string
  /** Upload API dari server. */
  unggah(berkas: BerkasUnggahan, opsi: OpsiUnggahan): Promise<AsetCloudinary>
  /** Admin API: metadata aset, `null` bila tidak ada. */
  ambil(publicId: string, resourceType: ResourceType): Promise<AsetCloudinary | null>
  hapus(publicId: string, resourceType: ResourceType): Promise<void>
  /** Mengambil file asli yang tersimpan. Payload memakainya untuk memeriksa isi unggahan langsung dari browser. */
  unduh(aset: AsetCloudinary): Promise<Response>
  /** Tanda tangan Upload API: SHA-1 atas parameter terurut ditambah API secret. */
  tandaTangan(parameter: Record<string, string>): string
}
