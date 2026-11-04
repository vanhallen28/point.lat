import Image from 'next/image'

import { Ikon } from '@/components/dasar/Ikon'
import { Tautan } from '@/components/dasar/Tautan'
import { labelDurasi } from '@/modules/konten/video'
import type { KartuVideo as DataKartu } from '@/modules/konten/tipe'
import { propsGambar } from '@/modules/media/props'

import gaya from './Video.module.css'

/** Lebar kartu video di grid: dua kolom di HP, empat kolom mulai tablet. */
const UKURAN_KARTU = '(min-width: 48rem) 280px, 50vw'

/**
 * Kartu video vertikal 9:16 (mockup "Intinya dalam 45 detik"): poster, judul, dan durasi. Tanpa
 * poster, kotak berwarna pilar menggantikannya.
 */
export function KartuVideo({ video, cloudName, tingkat = 'h3' }: { video: DataKartu; cloudName: string; tingkat?: 'h2' | 'h3' }) {
  const Judul = tingkat
  const poster = propsGambar(video.poster, 'asli', { cloudName, lebar: 480 })
  return (
    <Tautan href={video.href} className={gaya.kartu} data-warna={video.pilar?.warna}>
      <span className={gaya.poster}>
        {poster && <Image {...poster} alt="" sizes={UKURAN_KARTU} />}
        <span className={gaya.putar}>
          <Ikon nama="play" ukuran={18} />
          {video.durasi ? labelDurasi(video.durasi) : 'Putar'}
        </span>
      </span>
      <Judul className={gaya.judul}>{video.judul}</Judul>
    </Tautan>
  )
}

export function DaftarVideo({ video, cloudName, tingkat }: { video: DataKartu[]; cloudName: string; tingkat?: 'h2' | 'h3' }) {
  return (
    <ul className={gaya.daftar}>
      {video.map((v) => (
        <li key={v.id} data-masuk="">
          <KartuVideo video={v} cloudName={cloudName} tingkat={tingkat} />
        </li>
      ))}
    </ul>
  )
}
