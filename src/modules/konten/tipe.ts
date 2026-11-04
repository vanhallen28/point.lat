import type { TipeArtikel, WarnaPilar } from '@/lib/konstanta'
import type { IsiDokumen } from '@/modules/seo/lexical'
import type { ArtikelSeo, HalamanSeo, PenulisSeo, PilarSeo, SubkategoriSeo, VideoSeo } from '@/modules/seo/tipe'
import type { Video } from '@/payload-types'

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

/** Halaman rubrik `/{pilar}` dan `/{pilar}/{subkategori}`. `seo` dipakai `metadata()`, `jsonLd()`, `remahRoti()`. */
export type DataRubrik = {
  judul: string
  href: string
  deskripsi: string | null
  intro: IsiDokumen
  pilar: PilarRingkas
  subkategori: TautanRubrik[]
  artikel: KartuArtikel[]
  seo: { jenis: 'pilar'; doc: PilarSeo } | { jenis: 'subkategori'; doc: SubkategoriSeo }
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
export type DataPenulis = PenulisRingkas & { tautan: Tautan[]; artikel: KartuArtikel[]; seo: PenulisSeo }

/** Kartu video vertikal 9:16 untuk indeks `/video` dan "Video lain". `poster`: unggahan editor atau frame video. */
export type KartuVideo = { id: number; judul: string; href: string; durasi: number | null; pilar: PilarRingkas | null; poster: MediaTampil | null }

/** Dokumen video yang diputar `VideoSemat` (sumber HLS dan MP4, poster, transkrip). */
export type VideoUntukSemat = Pick<Video, 'judul' | 'file' | 'poster' | 'transkrip' | '_status'>

/** Halaman `/video/{slug}`: video, artikel induknya (yang `videoTerkait`-nya video ini), dan video lain. */
export type DataVideo = KartuVideo & { semat: VideoUntukSemat; induk: KartuArtikel | null; lain: KartuVideo[]; seo: VideoSeo }
