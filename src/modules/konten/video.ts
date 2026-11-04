import type { Video } from '@/payload-types'
import { pathFor } from '@/lib/paths'
import type { VideoSeo } from '@/modules/seo/tipe'

import { mediaTampil, pilarRingkas } from './artikel'
import type { DataVideo, KartuArtikel, KartuVideo } from './tipe'

/** Jumlah video di indeks `/video` dan di bagian "Video lain" halaman video. */
export const MAKS_VIDEO_INDEKS = 60
export const MAKS_VIDEO_LAIN = 4

type VideoUntukKartu = Pick<Video, 'id' | 'judul' | 'slug' | 'durasiDetik' | 'pilar' | 'file' | 'poster'>

/** Lama video untuk pembaca: "45 detik", "1 menit", "1 menit 5 detik". */
export function labelDurasi(detik: number): string {
  const total = Math.max(1, Math.round(detik))
  const menit = Math.floor(total / 60)
  const sisa = total % 60
  if (!menit) return `${sisa} detik`
  return sisa ? `${menit} menit ${sisa} detik` : `${menit} menit`
}

/**
 * Kartu video 9:16. Poster unggahan editor dipakai bila ada, selain itu frame video dari Cloudinary
 * (`propsGambar` membuat URL poster untuk media video). Durasi isian editor, cadangannya durasi file.
 */
export function kartuVideo(doc: VideoUntukKartu): KartuVideo | null {
  if (!doc.slug) return null
  const file = mediaTampil(doc.file)
  const durasi = doc.durasiDetik ?? (typeof doc.file === 'object' ? doc.file.durasi : null) ?? null
  return {
    id: doc.id,
    judul: doc.judul,
    href: pathFor({ jenis: 'video', slug: doc.slug }),
    durasi,
    pilar: pilarRingkas(doc.pilar),
    poster: mediaTampil(doc.poster) ?? file,
  }
}

/** Halaman `/video/{slug}`: video terbit (depth 1), artikel induknya, dan video lain. */
export function susunVideo(doc: Video, induk: KartuArtikel | null, lain: KartuVideo[]): DataVideo | null {
  const kartu = kartuVideo(doc)
  if (!kartu) return null
  return {
    ...kartu,
    semat: { judul: doc.judul, file: doc.file, poster: doc.poster, transkrip: doc.transkrip, _status: doc._status },
    induk,
    lain,
    seo: doc as VideoSeo,
  }
}
