import { randomBytes } from 'crypto'

import { slugify } from '@/lib/slug'

import type { AsetCloudinary, BerkasUnggahan, KlienCloudinary, OpsiUnggahan, ResourceType } from './klien'
import { EAGER_VIDEO, type JenisMedia } from './url'

/**
 * Folder Cloudinary per jenis. Penyederhanaan dari daftar folder di spesifikasi §9
 * (`point/artikel`, `point/video`, `point/penulis`, `point/og`): koleksi `media` dipakai bersama
 * oleh artikel, penulis, dan SEO, jadi saat unggah belum diketahui dipakai di mana. OG dibuat
 * sebagai URL transformasi, tidak diunggah.
 */
export const FOLDER: Record<JenisMedia, string> = {
  gambar: 'point/gambar',
  video: 'point/video',
}

/**
 * Incoming transformation (https://cloudinary.com/documentation/eager_and_incoming_transformations).
 * Gambar: lebar maks 2560px, q_auto (tinggi bebas supaya gambar potret tidak jatuh di bawah syarat
 * lebar 1200px). Video: sisi terpanjang maks 1920px (9:16 menjadi 1080x1920, sama dengan batas
 * default sp_auto 1080p) dan bitrate maks 6 Mbps (sedikit di atas 5,5 Mbps representasi 1080p di
 * tabel adaptive streaming Cloudinary). c_limit tidak pernah memperbesar.
 */
export const TRANSFORMASI_MASUK: Record<JenisMedia, string> = {
  gambar: 'c_limit,w_2560,q_auto',
  video: 'c_limit,w_1920,h_1920,br_6m,q_auto',
}

/**
 * Jenis file koleksi media. Daftar eksplisit (bukan `image/*`) supaya SVG, HEIC, dan format lain
 * yang tidak bisa diproses tidak lolos lewat unggahan langsung.
 */
export const JENIS_FILE = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'video/mp4',
  'video/webm',
] as const

/** Format yang sama dalam penamaan Cloudinary, ditandatangani sebagai `allowed_formats`. */
export const FORMAT_DIIZINKAN: Record<JenisMedia, string> = {
  gambar: 'jpg,png,webp,avif,gif',
  video: 'mp4,webm',
}

export function mimeDiizinkan(mimeType: unknown): mimeType is (typeof JENIS_FILE)[number] {
  return typeof mimeType === 'string' && (JENIS_FILE as readonly string[]).includes(mimeType)
}

export const PESAN_JENIS_DITOLAK =
  'Jenis file tidak didukung. Unggah gambar JPG, PNG, WebP, AVIF, atau GIF, atau video MP4 atau WebM.'

export function jenisDariMime(mimeType: string): JenisMedia {
  return mimeType.startsWith('video/') ? 'video' : 'gambar'
}

export function resourceType(jenis: JenisMedia): ResourceType {
  return jenis === 'video' ? 'video' : 'image'
}

/** Jenis dibaca dari folder publicId (`point/video/...` atau `point/gambar/...`). */
export function jenisDariPublicId(publicId: string): JenisMedia {
  return publicId.startsWith(`${FOLDER.video}/`) ? 'video' : 'gambar'
}

const acak = () => randomBytes(4).toString('hex')

/** `point/<jenis>/<slug-nama-file>-<8 hex>`. Akhiran acak mencegah tabrakan antarunggahan. */
export function publicIdBaru(namaFile: string, mimeType: string, akhiran: () => string = acak): string {
  const dasar = slugify(namaFile.replace(/\.[^.]+$/, '')).slice(0, 60).replace(/-+$/, '') || 'media'
  return `${FOLDER[jenisDariMime(mimeType)]}/${dasar}-${akhiran()}`
}

/** Opsi unggah dari server. Video juga meminta turunan HLS, poster, dan MP4 secara eager async. */
export function opsiUnggahan(publicId: string, jenis: JenisMedia): OpsiUnggahan {
  const dasar: OpsiUnggahan = {
    public_id: publicId,
    resource_type: resourceType(jenis),
    overwrite: false,
    transformation: TRANSFORMASI_MASUK[jenis],
    allowed_formats: FORMAT_DIIZINKAN[jenis],
  }
  return jenis === 'video' ? { ...dasar, eager: EAGER_VIDEO, eager_async: true } : dasar
}

/**
 * Parameter yang ditandatangani server dan dikirim apa adanya oleh browser. Sesuai
 * https://cloudinary.com/documentation/authentication_signatures: semua parameter kecuali
 * `file`, `cloud_name`, `resource_type`, dan `api_key` ikut ditandatangani.
 */
export function parameterTandaTangan(
  publicId: string,
  jenis: JenisMedia,
  timestamp: number,
): Record<string, string> {
  const opsi = opsiUnggahan(publicId, jenis)
  const parameter: Record<string, string> = {
    allowed_formats: opsi.allowed_formats,
    overwrite: 'false',
    public_id: opsi.public_id,
    timestamp: String(timestamp),
    transformation: opsi.transformation,
  }
  if (opsi.eager) {
    parameter.eager = opsi.eager
    parameter.eager_async = 'true'
  }
  return parameter
}

export type PersiapanUnggahan = {
  publicId: string
  jenis: JenisMedia
  /** `https://api.cloudinary.com/v1_1/<cloud>/<image|video>/upload` */
  urlUnggah: string
  /** Field form yang dikirim browser bersama file. */
  field: Record<string, string>
}

/** Semua yang dibutuhkan browser untuk signed upload langsung ke Cloudinary. */
export function siapkanUnggahan(
  klien: Pick<KlienCloudinary, 'cloudName' | 'apiKey' | 'tandaTangan'>,
  masukan: { namaFile: string; mimeType: string; waktu: number; akhiran?: () => string },
): PersiapanUnggahan {
  const jenis = jenisDariMime(masukan.mimeType)
  const publicId = publicIdBaru(masukan.namaFile, masukan.mimeType, masukan.akhiran)
  const parameter = parameterTandaTangan(publicId, jenis, masukan.waktu)
  return {
    publicId,
    jenis,
    urlUnggah: `https://api.cloudinary.com/v1_1/${klien.cloudName}/${resourceType(jenis)}/upload`,
    field: { ...parameter, api_key: klien.apiKey, signature: klien.tandaTangan(parameter) },
  }
}

/** Metadata yang disimpan di dokumen media, diambil dari hasil Cloudinary (sesudah incoming transformation). */
export type MetaMedia = {
  jenis: JenisMedia
  width: number | null
  height: number | null
  bytes: number
  /** Detik, dibulatkan ke 0,1. Hanya video. */
  durasi: number | null
  format: string
}

export function metaDariAset(aset: AsetCloudinary): MetaMedia {
  return {
    jenis: aset.resourceType === 'video' ? 'video' : 'gambar',
    width: aset.width ?? null,
    height: aset.height ?? null,
    bytes: aset.bytes,
    durasi: typeof aset.duration === 'number' ? Math.round(aset.duration * 10) / 10 : null,
    format: aset.format,
  }
}

/**
 * `unggah(file) → { publicId, meta }` dari spesifikasi §5, untuk unggahan lewat server
 * (Local API, seed, file kecil dari admin). `publicId` boleh sudah ditentukan pemanggil.
 */
export async function unggah(
  klien: KlienCloudinary,
  berkas: BerkasUnggahan & { namaFile: string; publicId?: string },
): Promise<{ publicId: string; meta: MetaMedia }> {
  const jenis = jenisDariMime(berkas.mimeType)
  const publicId = berkas.publicId ?? publicIdBaru(berkas.namaFile, berkas.mimeType)
  const aset = await klien.unggah(berkas, opsiUnggahan(publicId, jenis))
  return { publicId: aset.publicId, meta: metaDariAset(aset) }
}
