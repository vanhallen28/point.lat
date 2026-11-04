import { judulHalaman } from '@/lib/seo-dasar'
import type { WarnaPilar } from '@/lib/konstanta'
import { pathFor } from '@/lib/paths'
import { urlOg } from '@/modules/media/og'
import { bangunUrl, UKURAN_OG } from '@/modules/media/url'

import { potongKata } from './teks'
import type { MasukanSeo, MediaSeo, PengaturanSitus, PilarSeo, Relasi, Situs } from './tipe'

/** Batas meta description yang dipakai saat membuat deskripsi otomatis (spesifikasi §8: 150-160). */
export const MAKS_DESKRIPSI = 160

/** Isi relasi bila sudah di-populate, `null` bila masih ID atau kosong. */
export function ambil<T extends object>(relasi: Relasi<T>): T | null {
  return relasi && typeof relasi === 'object' ? relasi : null
}

/** URL absolut dari path publik, berdasarkan `urlSitus` di pengaturan SEO. */
export function urlAbsolut(situs: Pick<PengaturanSitus, 'urlSitus'>, path: string): string {
  return new URL(path, situs.urlSitus).toString()
}

/** Path publik dokumen, selalu lewat `pathFor()`. */
export function pathDokumen(masukan: MasukanSeo): string {
  switch (masukan.jenis) {
    case 'beranda':
      return '/'
    case 'statis':
      return masukan.path
    case 'artikel':
      return pathFor({ jenis: 'artikel', slug: masukan.doc.slug ?? '', tipe: masukan.doc.tipe })
    case 'subkategori':
      return pathFor({
        jenis: 'subkategori',
        slug: masukan.doc.slug ?? '',
        pilarSlug: ambil(masukan.doc.pilar)?.slug ?? '',
      })
    default:
      return pathFor({ jenis: masukan.jenis, slug: masukan.doc.slug ?? '' })
  }
}

/** Judul dokumen tanpa pola situs: judul SEO bila diisi, selain itu judul atau nama. */
export function judulDokumen(masukan: MasukanSeo, situs: PengaturanSitus): string {
  if (masukan.jenis === 'beranda') return situs.judulDefault || situs.namaSitus
  if (masukan.jenis === 'statis') return masukan.judul
  const doc = masukan.doc
  const seo = doc.seo?.judulSEO?.trim()
  if (seo) return seo
  return 'judul' in doc ? doc.judul : doc.nama
}

/**
 * Judul `<title>` yang tampil di Google. Judul SEO dipakai apa adanya (editor mengatur judul lengkap);
 * judul biasa dibungkus pola judul situs (`%s · point.`). Beranda memakai judul default.
 */
export function judulSeo(masukan: MasukanSeo, situs: PengaturanSitus): string {
  if (masukan.jenis === 'beranda') return judulDokumen(masukan, situs)
  if (masukan.jenis !== 'statis' && masukan.doc.seo?.judulSEO?.trim()) return judulDokumen(masukan, situs)
  return judulHalaman(situs.polaJudul, judulDokumen(masukan, situs))
}

function deskripsiCadangan(masukan: MasukanSeo, situs: PengaturanSitus): string | null | undefined {
  switch (masukan.jenis) {
    case 'artikel':
      return masukan.doc.deck
    case 'pilar':
      return masukan.doc.deskripsi
    case 'subkategori':
      return masukan.doc.deskripsi || ambil(masukan.doc.pilar)?.deskripsi
    case 'tools':
      return masukan.doc.ringkasan
    case 'video':
      return masukan.doc.transkrip
    case 'penulis':
      return masukan.doc.bio
    case 'statis':
      return masukan.deskripsi
    default:
      return situs.metaDefault
  }
}

/** Meta description: isian editor, atau deck/ringkasan/deskripsi yang dipotong di batas kata. */
export function deskripsiDokumen(masukan: MasukanSeo, situs: PengaturanSitus): string {
  const isian = masukan.jenis === 'beranda' || masukan.jenis === 'statis' ? null : masukan.doc.seo?.metaDeskripsi
  const teks = isian?.trim() || deskripsiCadangan(masukan, situs)?.trim() || situs.metaDefault?.trim() || ''
  return isian?.trim() ? teks : potongKata(teks, MAKS_DESKRIPSI)
}

/** Warna pilar dokumen untuk gambar OG otomatis. `null` untuk dokumen tanpa pilar. */
export function warnaDokumen(masukan: MasukanSeo): WarnaPilar | null {
  switch (masukan.jenis) {
    case 'pilar':
      return masukan.doc.warna
    case 'artikel':
    case 'tools':
    case 'video':
    case 'subkategori':
      return ambil<PilarSeo>(masukan.doc.pilar)?.warna ?? null
    default:
      return null
  }
}

export function noindexDokumen(masukan: MasukanSeo): boolean {
  if (masukan.jenis === 'beranda') return false
  if (masukan.jenis === 'statis') return Boolean(masukan.noindex)
  return Boolean(masukan.doc.seo?.noindex)
}

export type GambarOg = { url: string; width: number; height: number; alt: string }

function dariMedia(media: MediaSeo | null, situs: Situs, alt: string): GambarOg | null {
  if (!media?.publicId) return null
  return {
    url: bangunUrl(situs.cloudName, media.publicId, media.jenis === 'video' ? 'poster' : 'og'),
    ...UKURAN_OG,
    alt: media.alt || alt,
  }
}

/**
 * Gambar OG: unggahan editor di grup SEO, lalu (untuk dokumen tanpa pilar) gambar OG default situs,
 * lalu gambar teks otomatis Cloudinary dengan warna pilar (hijau bila tanpa pilar).
 */
export function gambarOgDokumen(masukan: MasukanSeo, situs: Situs): GambarOg {
  const judul = judulDokumen(masukan, situs)
  const unggahan = masukan.jenis === 'beranda' || masukan.jenis === 'statis' ? null : ambil(masukan.doc.seo?.gambarOG ?? null)
  const warna = warnaDokumen(masukan)
  return (
    dariMedia(unggahan, situs, judul) ??
    (warna ? null : dariMedia(ambil(situs.gambarOgDefault ?? null), situs, judul)) ?? {
      url: urlOg(situs.cloudName, { judul, warna: warna ?? 'hijau' }),
      ...UKURAN_OG,
      alt: judul,
    }
  )
}
