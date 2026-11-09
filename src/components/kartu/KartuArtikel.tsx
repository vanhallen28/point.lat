import Image from 'next/image'

import { Tautan } from '@/components/dasar/Tautan'
import { JudulBersama } from '@/components/motion/JudulBersama'
import { LABEL_TIPE_ARTIKEL } from '@/lib/konstanta'
import { tanggalIndonesia } from '@/modules/konten/artikel'
import type { KartuArtikel as DataKartu } from '@/modules/konten/tipe'
import { klienMedia } from '@/modules/media'
import { propsGambar } from '@/modules/media/props'

import gaya from './KartuArtikel.module.css'

export type UkuranKartu = 'besar' | 'sedang' | 'baris'

/** Lebar gambar yang diminta ke Cloudinary dan atribut `sizes` per ukuran kartu (srcset dari loader). */
const GAMBAR: Record<UkuranKartu | 'biasa', { lebar: number; sizes: string; preset: 'hero' | 'kartu' }> = {
  besar: { lebar: 1280, sizes: '(min-width: 64rem) 760px, 100vw', preset: 'hero' },
  sedang: { lebar: 800, sizes: '(min-width: 64rem) 380px, (min-width: 48rem) 50vw, 100vw', preset: 'hero' },
  biasa: { lebar: 800, sizes: '(min-width: 64rem) 380px, (min-width: 48rem) 50vw, 100vw', preset: 'hero' },
  baris: { lebar: 320, sizes: '128px', preset: 'kartu' },
}

/**
 * Kartu artikel bergambar (spesifikasi §25): gambar utama 16:9 (atau panel warna pilar bila belum ada gambar),
 * baris pilar dan tipe, judul, Intinya, lalu tanggal terbit dan penulis. Seluruh kartu satu tautan; judulnya
 * heading supaya daftar kartu bisa dinavigasi. Warna pilar selalu bersama namanya.
 *
 * `ukuran`: `besar` (berita utama beranda: judul seukuran H1, gambar dimuat lebih dulu), `sedang` (kartu
 * samping mozaik), `baris` (daftar ringkas: gambar kecil di kiri, tanpa Intinya).
 */
export function KartuArtikel({
  kartu,
  tingkat = 'h3',
  ukuran,
  utama = false,
}: {
  kartu: DataKartu
  tingkat?: 'h2' | 'h3'
  ukuran?: UkuranKartu
  /** Gambar di atas lipatan (berita utama beranda): dimuat lebih dulu untuk LCP. */
  utama?: boolean
}) {
  const Judul = tingkat
  const atur = GAMBAR[ukuran ?? 'biasa']
  const gambar = propsGambar(kartu.gambar, atur.preset, { cloudName: klienMedia().cloudName, lebar: atur.lebar })
  const kelas = [gaya.kartu, ukuran ? gaya[ukuran] : ''].filter(Boolean).join(' ')
  return (
    <Tautan href={kartu.href} className={kelas} data-warna={kartu.pilar?.warna}>
      <span className={gaya.media}>
        {gambar ? (
          <Image {...gambar} alt="" sizes={atur.sizes} preload={utama} loading={utama ? 'eager' : 'lazy'} className={gaya.gambar} />
        ) : (
          <span className={gaya.panel} aria-hidden="true">
            <span className={gaya.panelKata}>{kartu.pilar?.nama ?? 'point.'}</span>
          </span>
        )}
      </span>
      <span className={gaya.teks}>
        <span className={gaya.kicker}>
          {kartu.pilar && (
            <>
              <span className={gaya.titik} aria-hidden="true" />
              <span className={gaya.pilar}>{kartu.pilar.nama}</span>
            </>
          )}
          <span className={gaya.tipe}>{LABEL_TIPE_ARTIKEL[kartu.tipe]}</span>
        </span>
        <JudulBersama id={kartu.id}>
          <Judul className={gaya.judul}>{kartu.judul}</Judul>
        </JudulBersama>
        {kartu.intinya && ukuran !== 'baris' && (
          <span className={gaya.intinya}>
            <strong>Intinya:</strong> {kartu.intinya}
          </span>
        )}
        {(kartu.terbit || kartu.penulis) && (
          <span className={gaya.meta}>
            {kartu.terbit && <time dateTime={kartu.terbit}>{tanggalIndonesia(kartu.terbit)}</time>}
            {kartu.penulis && <span>{kartu.penulis}</span>}
          </span>
        )}
      </span>
    </Tautan>
  )
}

export function DaftarKartu({ kartu }: { kartu: DataKartu[] }) {
  return (
    <ul className={gaya.daftar}>
      {kartu.map((k) => (
        <li key={k.id} data-masuk="">
          <KartuArtikel kartu={k} />
        </li>
      ))}
    </ul>
  )
}
