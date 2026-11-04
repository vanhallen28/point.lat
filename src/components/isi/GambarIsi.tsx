import Image from 'next/image'

import type { MediaTampil } from '@/modules/konten/tipe'
import { propsGambar } from '@/modules/media/props'

import gaya from './Isi.module.css'

/** Lebar kolom isi artikel di desktop; HP memakai hampir selebar layar. */
export const UKURAN_KOLOM_ISI = '(min-width: 64rem) 720px, 92vw'

export function Keterangan({ media }: { media: Pick<MediaTampil, 'caption' | 'kredit'> }) {
  const teks = [media.caption, media.kredit].filter(Boolean).join(' · ')
  return teks ? <figcaption className={gaya.keterangan}>{teks}</figcaption> : null
}

/** Gambar di isi artikel: lazy (di bawah lipatan), ukuran dari Cloudinary, keterangan dan kredit. */
export function GambarIsi({ media, cloudName }: { media: MediaTampil | null; cloudName: string }) {
  const props = propsGambar(media, 'asli', { cloudName, lebar: 1440 })
  if (!media || !props) return null
  return (
    <figure className={gaya.gambar}>
      <Image {...props} alt={props.alt} sizes={UKURAN_KOLOM_ISI} />
      <Keterangan media={media} />
    </figure>
  )
}
