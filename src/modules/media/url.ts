/**
 * Pembangun URL pengiriman Cloudinary. Fungsi murni tanpa SDK supaya aman dipakai di server,
 * di komponen klien, dan di image loader Next.js.
 *
 * Dokumentasi: https://cloudinary.com/documentation/image_optimization,
 * https://cloudinary.com/documentation/adaptive_bitrate_streaming,
 * https://cloudinary.com/documentation/video_previews_and_posters
 */

export type JenisMedia = 'gambar' | 'video'

export type PresetGambar = 'asli' | 'kartu' | 'hero' | 'thumbnail' | 'og'
export type PresetVideo = 'hls' | 'mp4' | 'poster'
export type Preset = PresetGambar | PresetVideo

export const UKURAN_OG = { width: 1200, height: 630 } as const

/** Potongan transformasi per preset gambar. Segmen pengiriman (f_auto,q_auto) selalu terakhir. */
const POTONGAN_GAMBAR: Record<PresetGambar, string | null> = {
  asli: null,
  kartu: 'c_fill,g_auto,ar_4:3',
  hero: 'c_fill,g_auto,ar_16:9',
  thumbnail: 'c_fill,g_auto,ar_1:1',
  og: `c_fill,g_auto,w_${UKURAN_OG.width},h_${UKURAN_OG.height}`,
}

const RASIO: Record<'kartu' | 'hero' | 'thumbnail', number> = {
  kartu: 4 / 3,
  hero: 16 / 9,
  thumbnail: 1,
}

/**
 * Turunan video. `hls` memakai sp_auto (Cloudinary memilih profil streaming, maks 1080p),
 * `mp4` cadangan progresif, `poster` frame yang dipilih otomatis (so_auto). Resolusi dan bitrate
 * asli sudah dibatasi incoming transformation saat unggah.
 */
const VIDEO: Record<PresetVideo, { transformasi: string; format: string }> = {
  hls: { transformasi: 'sp_auto', format: 'm3u8' },
  mp4: { transformasi: 'q_auto', format: 'mp4' },
  poster: { transformasi: 'so_auto/q_auto', format: 'jpg' },
}

/**
 * Turunan yang dibuat Cloudinary di latar belakang saat video diunggah (eager, async). Teksnya
 * sama persis dengan URL pengiriman supaya permintaan pertama pembaca langsung kena cache.
 * Dokumentasi adaptive streaming menyarankan eager untuk produksi.
 */
export const EAGER_VIDEO = (['hls', 'poster', 'mp4'] as const)
  .map((preset) => `${VIDEO[preset].transformasi}/${VIDEO[preset].format}`)
  .join('|')

const PRESET_VIDEO: ReadonlySet<string> = new Set(Object.keys(VIDEO))

export function isPresetVideo(preset: Preset): preset is PresetVideo {
  return PRESET_VIDEO.has(preset)
}

export function asal(cloudName: string, jenis: JenisMedia): string {
  return `https://res.cloudinary.com/${cloudName}/${jenis === 'video' ? 'video' : 'image'}/upload`
}

/** Segmen pengiriman: `c_limit,w_<lebar>` (tidak pernah memperbesar), format, lalu kualitas. */
function segmenKirim(opsi: { lebar?: number; kualitas?: number; format: boolean }): string {
  return [
    opsi.lebar ? `c_limit,w_${Math.round(opsi.lebar)}` : null,
    opsi.format ? 'f_auto' : null,
    opsi.kualitas ? `q_${Math.round(opsi.kualitas)}` : 'q_auto',
  ]
    .filter(Boolean)
    .join(',')
}

/**
 * `url(publicId, preset)` dari spesifikasi §5. Gambar selalu `f_auto,q_auto`. Video: `hls`
 * (adaptive streaming), `mp4` (cadangan), `poster` (gambar dari frame video).
 */
export function bangunUrl(
  cloudName: string,
  publicId: string,
  preset: Preset = 'asli',
  opsi: { lebar?: number } = {},
): string {
  if (isPresetVideo(preset)) {
    const { format } = VIDEO[preset]
    const transformasi =
      preset === 'poster' && opsi.lebar
        ? `so_auto/${segmenKirim({ lebar: opsi.lebar, format: false })}`
        : VIDEO[preset].transformasi
    return `${asal(cloudName, 'video')}/${transformasi}/${publicId}.${format}`
  }
  const kirim = segmenKirim({ lebar: opsi.lebar, format: true })
  return [asal(cloudName, 'gambar'), POTONGAN_GAMBAR[preset], kirim, publicId].filter(Boolean).join('/')
}

const POLA_KIRIM = /\/(?:c_limit,w_\d+,)?(f_auto,)?q_(?:auto|\d+)\//

/**
 * Mengganti segmen pengiriman dengan lebar (dan kualitas) baru. Dipakai image loader Next.js untuk
 * `srcset`. URL di luar Cloudinary diberi parameter `w` supaya loader tetap memakai lebar.
 */
export function lebarkan(src: string, lebar: number, kualitas?: number): string {
  if (src.startsWith('https://res.cloudinary.com/') && POLA_KIRIM.test(src)) {
    return src.replace(POLA_KIRIM, (_semua, format?: string) => {
      return `/${segmenKirim({ lebar, kualitas, format: Boolean(format) })}/`
    })
  }
  return `${src}${src.includes('?') ? '&' : '?'}w=${lebar}`
}

/** URL utama yang disimpan di field `url` dokumen media: gambar utuh atau MP4 cadangan. */
export function urlDokumen(
  cloudName: string,
  doc: { publicId?: string | null; jenis?: JenisMedia | null },
): string {
  if (!doc.publicId) return ''
  return bangunUrl(cloudName, doc.publicId, doc.jenis === 'video' ? 'mp4' : 'asli')
}

/** Ukuran hasil preset untuk atribut `width`/`height` supaya tidak ada CLS. */
export function dimensiPreset(
  preset: PresetGambar,
  asli: { width: number; height: number },
  opsi: { lebar?: number } = {},
): { width: number; height: number } {
  if (preset === 'og') return { ...UKURAN_OG }
  let { width, height } = asli
  if (preset !== 'asli') {
    const target = RASIO[preset]
    if (width / height > target) width = Math.round(height * target)
    else height = Math.round(width / target)
  }
  if (opsi.lebar && opsi.lebar < width) {
    height = Math.round((height * opsi.lebar) / width)
    width = opsi.lebar
  }
  return { width, height }
}
