import type { TipeArtikel, ToolId, WarnaPilar } from '@/lib/konstanta'
import type { ParameterTersimpan, TeksIsian } from '@/modules/hitung'
import type { SlotSiap } from '@/modules/iklan/tipe'
import type { IsiDokumen } from '@/modules/seo/lexical'
import type { ArtikelSeo, HalamanSeo, PenulisSeo, PilarSeo, SubkategoriSeo, ToolsSeo, VideoSeo } from '@/modules/seo/tipe'
import type { Video } from '@/payload-types'

import type { Paginasi } from './paginasi'

/**
 * Data tampilan yang sudah siap dirender komponen publik. Komponen tidak membaca dokumen Payload
 * mentah: modul ini yang menerjemahkan relasi, path (`pathFor`), dan nilai bawaan.
 */

export type Tautan = { label: string; href: string }

export type ItemMenu = Tautan & { warna: WarnaPilar | null }

export type DataHeader = { menu: ItemMenu[]; tools: Tautan }

export type DataFooter = { tautan: Tautan[]; sosial: Tautan[]; whatsapp: string | null; hakCipta: string }

export type PilarRingkas = { nama: string; slug: string; href: string; warna: WarnaPilar; disclaimer: string | null }

/** Media siap untuk `propsGambar` (publicId, ukuran asli) ditambah teks pendamping. */
export type MediaTampil = {
  publicId: string
  jenis: 'gambar' | 'video'
  alt: string
  width: number
  height: number
  caption: string | null
  kredit: string | null
}

export type PenulisRingkas = {
  nama: string
  href: string
  bio: string | null
  keahlian: string[]
  foto: MediaTampil | null
}

export type KartuArtikel = {
  id: number
  judul: string
  href: string
  tipe: TipeArtikel
  pilar: PilarRingkas | null
  intinya: string | null
}

/** Subjudul H2 untuk daftar isi; `id` sama dengan atribut `id` heading di isi. */
export type Subjudul = { id: string; teks: string }

export type Faq = { pertanyaan: string; jawaban: string }

export type Sumber = { judul: string; url: string; penerbit: string | null; diaksesPada: string | null }

/** Semua yang dibutuhkan halaman artikel dan glosarium. `seo` dipakai `metadata()`, `jsonLd()`, `remahRoti()`. */
export type DataArtikel = {
  id: number
  judul: string
  tipe: TipeArtikel
  href: string
  deck: string
  intinya: string[]
  diperbarui: string | null
  waktuBaca: number
  pilar: PilarRingkas | null
  penulis: PenulisRingkas | null
  gambar: MediaTampil | null
  isi: IsiDokumen
  daftarIsi: Subjudul[]
  faq: Faq[]
  sumber: Sumber[]
  terkait: KartuArtikel[]
  seo: ArtikelSeo
}

export type Istilah = { judul: string; href: string; definisi: string }

/** Istilah glosarium per huruf awal; `id` dipakai jangkar navigasi huruf. */
export type KelompokIstilah = { huruf: string; id: string; istilah: Istilah[] }

/** Tautan navigasi subkategori di halaman rubrik; `aktif` untuk halaman yang sedang dibuka. */
export type TautanRubrik = Tautan & { aktif: boolean }

/**
 * Halaman rubrik `/{pilar}` dan `/{pilar}/{subkategori}`, atau halaman berikutnya (`/halaman/{n}`). `href`
 * selalu alamat halaman 1. `seo` dipakai `metadata()`, `jsonLd()`, `remahRoti()`.
 */
export type DataRubrik = {
  judul: string
  href: string
  deskripsi: string | null
  intro: IsiDokumen
  pilar: PilarRingkas
  subkategori: TautanRubrik[]
  artikel: KartuArtikel[]
  paginasi: Paginasi
  seo: { jenis: 'pilar'; doc: PilarSeo; halaman: number } | { jenis: 'subkategori'; doc: SubkategoriSeo; halaman: number }
}

export type KartuHalaman = { judul: string; teks: string | null; href: string | null }

/** Blok page builder halaman statis yang siap dirender. `utama`: hero yang memegang H1 halaman. */
export type BlokTampil =
  | { jenis: 'hero'; id: string; judul: string; subjudul: string | null; gambar: MediaTampil | null; utama: boolean }
  | { jenis: 'teks'; id: string; isi: IsiDokumen }
  | { jenis: 'kartu'; id: string; judul: string | null; kartu: KartuHalaman[] }
  | { jenis: 'cta'; id: string; judul: string; teks: string | null; label: string; href: string }
  | { jenis: 'faq'; id: string; judul: string; faq: Faq[] }
  | { jenis: 'tool'; id: string; nama: string; ringkasan: string; href: string }

/** Halaman statis dari koleksi `halaman`. `heroUtama`: blok pertama hero, jadi judul tidak ditulis ulang. */
export type DataHalaman = { judul: string; href: string; heroUtama: boolean; blok: BlokTampil[]; seo: HalamanSeo }

/** Profil penulis `/penulis/{slug}` (rambu kredibilitas, spesifikasi §3) dengan tulisan terbitnya. */
/** Profil penulis `/penulis/{slug}` dan halaman tulisan berikutnya (`/halaman/{n}`); `href` alamat halaman 1. */
export type DataPenulis = PenulisRingkas & { tautan: Tautan[]; artikel: KartuArtikel[]; paginasi: Paginasi; seo: PenulisSeo }

/** Kartu video vertikal 9:16 untuk indeks `/video` dan "Video lain". `poster`: unggahan editor atau frame video. */
export type KartuVideo = { id: number; judul: string; href: string; durasi: number | null; pilar: PilarRingkas | null; poster: MediaTampil | null }

/** Dokumen video yang diputar `VideoSemat` (sumber HLS dan MP4, poster, transkrip, takarir). */
export type VideoUntukSemat = Pick<Video, 'judul' | 'slug' | 'file' | 'poster' | 'transkrip' | 'takarir' | '_status'>

/** Halaman `/video/{slug}`: video, artikel induknya (yang `videoTerkait`-nya video ini), dan video lain. */
export type DataVideo = KartuVideo & { semat: VideoUntukSemat; induk: KartuArtikel | null; lain: KartuVideo[]; seo: VideoSeo }

/** Satu kalkulator di indeks `/tools` dan kotak "Hitung sendiri" beranda. */
export type ItemTools = { id: number; nama: string; href: string; ringkasan: string }

/** Kalkulator per pilar di `/tools`, urut sesuai urutan pilar di CMS. */
export type KelompokTools = { pilar: PilarRingkas; tools: ItemTools[] }

/**
 * Halaman `/tools/{slug}`: dokumen tools terbit dan semua dokumen parameter yang dibaca kalkulatornya.
 * Parameter dikirim utuh (semua tanggal berlaku) karena modul hitung memilihnya sesuai tanggal hitung.
 */
export type DataTool = {
  id: number
  nama: string
  toolId: ToolId
  href: string
  ringkasan: string
  pilar: PilarRingkas | null
  /** Label dan bantuan isian dari `bantuanInput`, per kunci isian. */
  bantuan: TeksIsian
  penjelasan: IsiDokumen
  faq: Faq[]
  sumber: Sumber[]
  /** Tanggal akses sumber aturan yang paling baru: kapan aturannya terakhir diperiksa. */
  diperiksa: string | null
  parameter: ParameterTersimpan[]
  seo: ToolsSeo
}

/** Ajakan newsletter: pendaftaran di form penyedia (global `newsletter`), bukan di point. */
export type DataNewsletter = { judul: string; teks: string | null; href: string }

/** Bagian beranda siap render, urut sesuai global `beranda`. `id` dari blok Payload. */
export type BagianBeranda =
  | { jenis: 'hero'; id: string; judul: string; subjudul: string | null; placeholder: string }
  | { jenis: 'mozaik'; id: string; judul: string | null; artikel: KartuArtikel[]; tools: ItemTools[] }
  | { jenis: 'video'; id: string; judul: string; video: KartuVideo[] }
  | { jenis: 'terbaru'; id: string; judul: string; artikel: KartuArtikel[]; newsletter: DataNewsletter | null }
  | { jenis: 'newsletter'; id: string; newsletter: DataNewsletter }
  | { jenis: 'iklan'; id: string; slot: SlotSiap }
