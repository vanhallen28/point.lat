import type { Artikel, Beranda, Newsletter, Video } from '@/payload-types'

import { kartuArtikel } from './artikel'
import type { BagianBeranda, DataNewsletter, ItemTools, KartuArtikel, KartuVideo } from './tipe'
import { kartuVideo } from './video'

/** Hero bila editor menghapus blok hero: beranda tetap punya H1 dan pencarian. */
export const HERO_BAWAAN = { judul: 'Intinya dulu.', subjudul: null, placeholder: 'misal: cara hitung THR' } as const

/**
 * Judul blok "Paling dibaca" selama data klik belum cukup: isinya tulisan terbaru, jadi judulnya juga
 * jujur menyebut itu, apa pun isian editor (keputusan pemilik di Rencana 4B).
 */
export const JUDUL_TERBARU = 'Tulisan terbaru'

/** Judul daftar tulisan dengan klik Google terbanyak 7 hari terakhir (spesifikasi §4). */
export const JUDUL_POPULER = 'Paling dibaca pekan ini'

export type DaftarPopuler = { judul: string; artikel: KartuArtikel[] }

/**
 * "Paling dibaca pekan ini" hanya bila klik Google 7 hari terakhir cukup untuk mengisi semua tempat
 * (`jumlah`); selain itu tulisan terbaru berjudul `JUDUL_TERBARU`. Dipakai blok beranda dan halaman 404.
 */
export function daftarPopuler(populer: KartuArtikel[], terbaru: KartuArtikel[], jumlah: number, judulPopuler = JUDUL_POPULER): DaftarPopuler {
  if (populer.length >= jumlah) return { judul: judulPopuler, artikel: populer.slice(0, jumlah) }
  return { judul: JUDUL_TERBARU, artikel: terbaru.slice(0, jumlah) }
}

export const JUDUL_VIDEO_BAWAAN = 'Intinya dalam 45 detik'
export const MAKS_VIDEO_BERANDA = 4
export const JUMLAH_TERBARU_BAWAAN = 4

/** Kartu terbaru yang dimuat untuk beranda: blok terbaru terbesar (10) ditambah mozaik terbesar (5). */
export const MAKS_TERBARU_BERANDA = 15

/** Data yang tidak disimpan di global `beranda` tetapi ditampilkan bloknya. */
export type SumberBeranda = {
  terbaru: KartuArtikel[]
  /** Artikel dengan klik Google terbanyak 7 hari terakhir, terbanyak dulu (sinkron Search Analytics). */
  populer: KartuArtikel[]
  video: KartuVideo[]
  tools: ItemTools[]
  newsletter: DataNewsletter | null
}

type Blok = NonNullable<Beranda['tataLetak']>[number]

const ambil = <T extends object>(relasi: T | number | null | undefined): T | null => (relasi && typeof relasi === 'object' ? relasi : null)

/** Newsletter tampil hanya bila aktif dan punya URL form penyedia (spesifikasi §17: penyedia eksternal). */
export function susunNewsletter(global: Pick<Newsletter, 'aktif' | 'urlForm' | 'judul' | 'deskripsi'>): DataNewsletter | null {
  const href = global.urlForm?.trim()
  if (!global.aktif || !href || !/^https:\/\//.test(href)) return null
  return { judul: global.judul?.trim() || 'Intinya, tiap Senin.', teks: global.deskripsi?.trim() || null, href }
}

function kartuMozaik(relasi: (number | Artikel)[]): KartuArtikel[] {
  return relasi
    .map((r) => ambil(r))
    .filter((d): d is Artikel => d?._status === 'published')
    .map(kartuArtikel)
    .filter((k): k is KartuArtikel => k !== null)
}

function kartuStrip(relasi: (number | Video)[] | null | undefined): KartuVideo[] {
  return (relasi ?? [])
    .map((r) => ambil(r))
    .filter((v): v is Video => v?._status === 'published')
    .map(kartuVideo)
    .filter((k): k is KartuVideo => k !== null)
}

/**
 * Blok global `beranda` (depth 2) menjadi bagian yang siap dirender, dengan urutan dari editor.
 *
 * - Hanya hero pertama yang dipakai (satu H1); tanpa hero, `HERO_BAWAAN` dipasang paling atas.
 * - Mozaik memakai artikel terbit pilihan editor; kotak "Hitung sendiri" berisi tools terbit.
 * - Strip video memakai pilihan editor, cadangannya video terbit terbaru.
 * - "Paling dibaca" menampilkan artikel dengan klik Google terbanyak 7 hari terakhir (judul editor, bawaan
 *   `JUDUL_POPULER`) bila datanya cukup untuk semua tempat; peringkat apa adanya, jadi artikel mozaik bisa
 *   ikut. Bila belum cukup: tulisan terbaru di luar mozaik dengan judul `JUDUL_TERBARU`.
 * - Newsletter hanya bila global `newsletter` aktif; bila tepat setelah tulisan terbaru, ia menjadi
 *   kolom samping blok itu (seperti mockup).
 * - Slot iklan belum dirender (Rencana 8) supaya tidak ada ruang kosong.
 * - Blok yang isinya kosong dilewati.
 */
export function susunBeranda(tataLetak: Blok[], sumber: SumberBeranda): BagianBeranda[] {
  const diMozaik = new Set(
    tataLetak.flatMap((b) => (b.blockType === 'mozaikPilihan' ? kartuMozaik(b.artikel).map((k) => k.id) : [])),
  )
  const bagian: BagianBeranda[] = []
  let adaHero = false
  for (const [i, blok] of tataLetak.entries()) {
    const id = blok.id ?? `blok-${i}`
    switch (blok.blockType) {
      case 'heroBeranda':
        if (adaHero) break
        adaHero = true
        bagian.push({
          jenis: 'hero',
          id,
          judul: blok.judul.trim() || HERO_BAWAAN.judul,
          subjudul: blok.subjudul?.trim() || null,
          placeholder: blok.placeholderCari?.trim() || HERO_BAWAAN.placeholder,
        })
        break
      case 'mozaikPilihan': {
        const artikel = kartuMozaik(blok.artikel)
        if (artikel.length === 0) break
        bagian.push({ jenis: 'mozaik', id, judul: blok.judul?.trim() || null, artikel, tools: blok.tampilkanTools === false ? [] : sumber.tools })
        break
      }
      case 'stripVideo': {
        const pilihan = kartuStrip(blok.video)
        const video = pilihan.length > 0 ? pilihan : sumber.video.slice(0, MAKS_VIDEO_BERANDA)
        if (video.length > 0) bagian.push({ jenis: 'video', id, judul: blok.judul?.trim() || JUDUL_VIDEO_BAWAAN, video })
        break
      }
      case 'palingDibaca': {
        const terbaru = sumber.terbaru.filter((k) => !diMozaik.has(k.id))
        const daftar = daftarPopuler(sumber.populer, terbaru, blok.jumlah ?? JUMLAH_TERBARU_BAWAAN, blok.judul?.trim() || JUDUL_POPULER)
        if (daftar.artikel.length > 0) bagian.push({ jenis: 'terbaru', id, ...daftar, newsletter: null })
        break
      }
      case 'newsletterBlok': {
        if (!sumber.newsletter) break
        const newsletter = {
          ...sumber.newsletter,
          judul: blok.judul?.trim() || sumber.newsletter.judul,
          teks: blok.teks?.trim() || sumber.newsletter.teks,
        }
        const sebelumnya = bagian.at(-1)
        if (sebelumnya?.jenis === 'terbaru' && !sebelumnya.newsletter) sebelumnya.newsletter = newsletter
        else bagian.push({ jenis: 'newsletter', id, newsletter })
        break
      }
      case 'slotIklan':
        break
    }
  }
  if (!adaHero) bagian.unshift({ jenis: 'hero', id: 'hero-bawaan', ...HERO_BAWAAN })
  return bagian
}
