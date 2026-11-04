import { bangunUrl, dimensiPreset, type JenisMedia, type PresetGambar } from './url'

export type MediaUntukGambar = {
  publicId?: string | null
  jenis?: JenisMedia | null
  alt?: string | null
  width?: number | null
  height?: number | null
}

export type PropsGambar = { src: string; width: number; height: number; alt: string }

/**
 * Props untuk `next/image` dari dokumen media. `width`/`height` selalu terisi dari ukuran hasil
 * preset supaya tidak ada CLS (spesifikasi §9). Video memakai posternya. `null` bila media belum
 * lengkap, supaya halaman tidak merender gambar tanpa ukuran.
 */
export function propsGambar(
  media: MediaUntukGambar | null | undefined,
  preset: PresetGambar,
  opsi: { cloudName: string; lebar?: number },
): PropsGambar | null {
  if (!media?.publicId || !media.width || !media.height) return null
  const video = media.jenis === 'video'
  const src = video
    ? bangunUrl(opsi.cloudName, media.publicId, 'poster', { lebar: opsi.lebar })
    : bangunUrl(opsi.cloudName, media.publicId, preset, { lebar: opsi.lebar })
  const ukuran = dimensiPreset(video ? 'asli' : preset, { width: media.width, height: media.height }, opsi)
  return { src, ...ukuran, alt: media.alt ?? '' }
}
