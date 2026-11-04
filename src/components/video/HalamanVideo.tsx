import { ChipPilar } from '@/components/dasar/ChipPilar'
import { Ikon } from '@/components/dasar/Ikon'
import { JsonLd } from '@/components/dasar/JsonLd'
import { RemahRoti } from '@/components/dasar/RemahRoti'
import { VideoSemat } from '@/components/isi/VideoSemat'
import { KartuArtikel } from '@/components/kartu/KartuArtikel'
import type { DataVideo, KartuVideo } from '@/modules/konten/tipe'
import { labelDurasi } from '@/modules/konten/video'
import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
import type { MasukanSeo, Situs } from '@/modules/seo/tipe'

import { DaftarVideo } from './KartuVideo'
import gaya from './Video.module.css'

export const JUDUL_VIDEO = 'Video'
export const DESKRIPSI_VIDEO = 'Intinya dalam 45 detik: video vertikal singkat, lengkap dengan transkrip dan tulisan penjelasannya.'

/** Indeks `/video`: semua video terbit, terbaru dulu. */
export function IndeksVideo({ video, masukan, situs }: { video: KartuVideo[]; masukan: MasukanSeo; situs: Situs }) {
  return (
    <div className={`kontainer ${gaya.halaman}`}>
      <JsonLd data={jsonLd(masukan, situs)} />
      <header className={gaya.kepala}>
        <RemahRoti remah={remahRoti(masukan)} />
        <h1 className={gaya.judulHalaman}>{JUDUL_VIDEO}</h1>
        <p className={gaya.deck}>{DESKRIPSI_VIDEO}</p>
      </header>
      {video.length > 0 ? (
        <DaftarVideo video={video} cloudName={situs.cloudName} tingkat="h2" />
      ) : (
        <p className={gaya.kosong}>Belum ada video. Video baru tampil di sini setelah terbit.</p>
      )}
    </div>
  )
}

/**
 * Halaman `/video/{slug}`: video diputar tanpa JavaScript tambahan (`VideoSemat`) dengan transkrip
 * terbuka, tulisan penjelasannya bila ada (di samping video mulai 1024px), lalu video lain. JSON-LD
 * VideoObject dari modul SEO.
 */
export function HalamanVideo({ video, situs }: { video: DataVideo; situs: Situs }) {
  const masukan = { jenis: 'video', doc: video.seo } as const
  return (
    <article className={`kontainer ${gaya.halaman}`}>
      <JsonLd data={jsonLd(masukan, situs)} />
      <header className={gaya.kepala}>
        <RemahRoti remah={remahRoti(masukan)} />
        <p className={gaya.kicker}>
          {video.pilar && <ChipPilar pilar={video.pilar} />}
          {video.durasi && (
            <span>
              <Ikon nama="clock" ukuran={18} /> {labelDurasi(video.durasi)}
            </span>
          )}
        </p>
        <h1 className={gaya.judulHalaman}>{video.judul}</h1>
      </header>
      <div className={gaya.utama}>
        <VideoSemat video={video.semat} cloudName={situs.cloudName} utama />
        {video.induk && (
          <section aria-labelledby="penjelasan" className={gaya.penjelasan}>
            <h2 id="penjelasan" className={gaya.subjudul}>
              Baca penjelasan lengkap
            </h2>
            <div className={gaya.induk}>
              <KartuArtikel kartu={video.induk} />
            </div>
          </section>
        )}
      </div>
      {video.lain.length > 0 && (
        <section aria-labelledby="video-lain" className={gaya.bagian}>
          <h2 id="video-lain" className={gaya.subjudul}>
            Video lain
          </h2>
          <DaftarVideo video={video.lain} cloudName={situs.cloudName} />
        </section>
      )}
    </article>
  )
}
