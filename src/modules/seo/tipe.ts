import type { TipeArtikel, ToolId, WarnaPilar } from '@/lib/konstanta'
import type { JenisMedia } from '@/modules/media/url'

/**
 * Tipe masukan modul SEO. Sengaja lebih longgar dari `payload-types.ts` supaya dokumen Payload
 * (hasil `find` dengan depth 1) dan data form admin sama-sama bisa dipakai tanpa konversi.
 */

/** Relasi Payload: dokumen bila di-populate (depth >= 1), ID bila tidak. */
export type Relasi<T> = T | number | string | null | undefined

export type MediaSeo = {
  id?: number | string
  publicId?: string | null
  jenis?: JenisMedia | null
  alt?: string | null
  width?: number | null
  height?: number | null
}

export type TipeSchema = 'otomatis' | 'Article' | 'NewsArticle'

export type GrupSeo = {
  keyphrase?: string | null
  keyphraseSekunder?: string[] | null
  judulSEO?: string | null
  metaDeskripsi?: string | null
  gambarOG?: Relasi<MediaSeo>
  canonical?: string | null
  tipeSchema?: TipeSchema | null
  noindex?: boolean | null
}

type Dasar = { id?: number | string; slug?: string | null; seo?: GrupSeo | null; createdAt?: string; updatedAt?: string }

export type PilarSeo = Dasar & { nama: string; warna: WarnaPilar; deskripsi?: string | null }

export type SubkategoriSeo = Dasar & { nama: string; deskripsi?: string | null; pilar: Relasi<PilarSeo> }

export type PenulisSeo = Dasar & {
  nama: string
  bio?: string | null
  foto?: Relasi<MediaSeo>
  keahlian?: string[] | null
  tautan?: { label: string; url: string }[] | null
}

export type ArtikelSeo = Dasar & {
  judul: string
  tipe: TipeArtikel
  deck?: string | null
  pilar: Relasi<PilarSeo>
  subkategori?: Relasi<SubkategoriSeo>
  penulis: Relasi<PenulisSeo>
  gambarUtama?: Relasi<MediaSeo>
  terbitPada?: string | null
  diperbaruiBesar?: string | null
}

export type ToolsSeo = Dasar & { nama: string; toolId: ToolId; ringkasan?: string | null; pilar: Relasi<PilarSeo> }

export type VideoSeo = Dasar & {
  judul: string
  transkrip?: string | null
  durasiDetik?: number | null
  file?: Relasi<MediaSeo & { durasi?: number | null }>
  poster?: Relasi<MediaSeo>
  pilar: Relasi<PilarSeo>
}

export type HalamanSeo = Dasar & { judul: string }

/** Halaman yang SEO-nya dibangun modul ini. `statis` untuk halaman indeks tanpa dokumen (`/tools`, `/cari`). */
export type MasukanSeo =
  | { jenis: 'artikel'; doc: ArtikelSeo }
  | { jenis: 'pilar'; doc: PilarSeo }
  | { jenis: 'subkategori'; doc: SubkategoriSeo }
  | { jenis: 'tools'; doc: ToolsSeo }
  | { jenis: 'video'; doc: VideoSeo }
  | { jenis: 'penulis'; doc: PenulisSeo }
  | { jenis: 'halaman'; doc: HalamanSeo }
  | { jenis: 'beranda' }
  | { jenis: 'statis'; judul: string; path: string; deskripsi?: string | null; noindex?: boolean }

/** Isi global `pengaturan-seo` yang dipakai modul ini (hasil `findGlobal` depth 1). */
export type PengaturanSitus = {
  namaSitus: string
  urlSitus: string
  polaJudul: string
  judulDefault?: string | null
  metaDefault?: string | null
  gambarOgDefault?: Relasi<MediaSeo>
  organisasi?: { nama?: string | null; logo?: Relasi<MediaSeo>; sameAs?: string[] | null } | null
  verifikasi?: { google?: string | null; bing?: string | null } | null
  robotsTambahan?: string | null
}

/**
 * Pengaturan situs ditambah cloud name Cloudinary (`klienMedia().cloudName`) untuk URL gambar OG,
 * logo, dan gambar JSON-LD. Rute teknis (sitemap, robots, RSS) cukup memakai `PengaturanSitus`.
 */
export type Situs = PengaturanSitus & { cloudName: string }
