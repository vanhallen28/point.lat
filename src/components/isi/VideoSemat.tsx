import { mediaTampil } from '@/modules/konten/artikel'
import { paragrafTeks } from '@/modules/konten/isi'
import { bangunUrl } from '@/modules/media/url'
import type { Video } from '@/payload-types'

import gaya from './Isi.module.css'

type VideoUntukSemat = Pick<Video, 'judul' | 'file' | 'poster' | 'transkrip' | '_status'>

/**
 * Video vertikal di isi tanpa JavaScript: HLS untuk browser yang memutarnya langsung (Safari, Chrome
 * Android), MP4 cadangan untuk yang lain. Tidak dimuat sebelum diputar (`preload="none"`), dan
 * transkrip selalu tersedia di bawahnya.
 */
export function VideoSemat({ video, cloudName }: { video: number | VideoUntukSemat; cloudName: string }) {
  if (typeof video !== 'object' || video._status !== 'published') return null
  const file = mediaTampil(video.file)
  if (!file) return null
  const poster = mediaTampil(video.poster)
  const urlPoster = poster
    ? bangunUrl(cloudName, poster.publicId, 'asli', { lebar: 720 })
    : bangunUrl(cloudName, file.publicId, 'poster', { lebar: 720 })
  return (
    <figure className={gaya.video}>
      <video controls playsInline preload="none" poster={urlPoster} width={file.width} height={file.height} aria-label={video.judul}>
        <source src={bangunUrl(cloudName, file.publicId, 'hls')} type="application/vnd.apple.mpegurl" />
        <source src={bangunUrl(cloudName, file.publicId, 'mp4')} type="video/mp4" />
      </video>
      <figcaption className={gaya.keterangan}>{video.judul}</figcaption>
      <details className={gaya.transkrip}>
        <summary>Baca transkrip</summary>
        {paragrafTeks(video.transkrip).map((teks, i) => (
          <p key={i}>{teks}</p>
        ))}
      </details>
    </figure>
  )
}
