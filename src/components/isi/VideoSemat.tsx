import { mediaTampil } from '@/modules/konten/artikel'
import { paragrafTeks } from '@/modules/konten/isi'
import type { VideoUntukSemat } from '@/modules/konten/tipe'
import { pathTakarir } from '@/modules/konten/video'
import { bangunUrl } from '@/modules/media/url'

import gaya from './Isi.module.css'

/**
 * Video vertikal di isi tanpa JavaScript: HLS untuk browser yang memutarnya langsung (Safari, Chrome
 * Android), MP4 cadangan untuk yang lain. Tidak dimuat sebelum diputar (`preload="none"`), dan
 * transkrip selalu tersedia di bawahnya. Video yang punya takarir WebVTT mendapat `<track>` takarir
 * bahasa Indonesia (WCAG 2.2 1.2.2), bisa dinyalakan dari tombol CC pemutar. `utama`: video adalah isi utama halaman `/video/{slug}`,
 * jadi judulnya sudah menjadi H1 (tanpa keterangan) dan transkrip langsung terbuka.
 */
export function VideoSemat({ video, cloudName, utama = false }: { video: number | VideoUntukSemat; cloudName: string; utama?: boolean }) {
  if (typeof video !== 'object' || video._status !== 'published') return null
  const file = mediaTampil(video.file)
  if (!file) return null
  const poster = mediaTampil(video.poster)
  const urlPoster = poster
    ? bangunUrl(cloudName, poster.publicId, 'asli', { lebar: 720 })
    : bangunUrl(cloudName, file.publicId, 'poster', { lebar: 720 })
  return (
    <figure className={gaya.video}>
      <video
        controls
        playsInline
        preload="none"
        poster={urlPoster}
        width={file.width}
        height={file.height}
        // Rasio dari ukuran file, bukan dari poster: ruang video tetap benar sebelum diputar (tanpa CLS).
        style={{ aspectRatio: `${file.width} / ${file.height}` }}
        aria-label={video.judul}
      >
        <source src={bangunUrl(cloudName, file.publicId, 'hls')} type="application/vnd.apple.mpegurl" />
        <source src={bangunUrl(cloudName, file.publicId, 'mp4')} type="video/mp4" />
        {video.slug && video.takarir?.trim() && <track kind="captions" src={pathTakarir(video.slug)} srcLang="id" label="Bahasa Indonesia" />}
      </video>
      {!utama && <figcaption className={gaya.keterangan}>{video.judul}</figcaption>}
      <details className={gaya.transkrip} open={utama}>
        <summary>Baca transkrip</summary>
        {paragrafTeks(video.transkrip).map((teks, i) => (
          <p key={i}>{teks}</p>
        ))}
      </details>
    </figure>
  )
}
