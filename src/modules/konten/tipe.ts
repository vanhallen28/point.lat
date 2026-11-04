import type { TipeArtikel, WarnaPilar } from '@/lib/konstanta'
import type { IsiDokumen } from '@/modules/seo/lexical'
import type { ArtikelSeo } from '@/modules/seo/tipe'

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
