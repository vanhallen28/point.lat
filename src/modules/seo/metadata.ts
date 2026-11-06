import type { Metadata } from 'next'

import { pathFor } from '@/lib/paths'
import { judulHalaman } from '@/lib/seo-dasar'

import {
  ambil,
  deskripsiDokumen,
  gambarOgDokumen,
  judulSeo,
  noindexDokumen,
  nomorHalaman,
  pathDokumen,
  urlAbsolut,
} from './dokumen'
import type { MasukanSeo, PengaturanSitus, Situs } from './tipe'

/** Path RSS, dirujuk dari beranda lewat `<link rel="alternate" type="application/rss+xml">`. */
export const PATH_FEED = '/feed.xml'

/**
 * Canonical: isian editor bila ada, selain itu URL absolut dokumen sendiri. Halaman ke-2 dan seterusnya
 * sebuah daftar selalu menunjuk dirinya sendiri (panduan paginasi Google: jangan jadikan halaman pertama
 * canonical seluruh urutan), jadi isian editor hanya berlaku untuk halaman 1.
 */
export function canonicalDokumen(masukan: MasukanSeo, situs: Pick<PengaturanSitus, 'urlSitus'>): string {
  const isian = masukan.jenis === 'beranda' || masukan.jenis === 'statis' || nomorHalaman(masukan) > 1 ? null : masukan.doc.seo?.canonical?.trim()
  return isian || urlAbsolut(situs, pathDokumen(masukan))
}

function openGraph(masukan: MasukanSeo, situs: PengaturanSitus, dasar: NonNullable<Metadata['openGraph']>): Metadata['openGraph'] {
  if (masukan.jenis === 'artikel') {
    const { doc } = masukan
    const penulis = ambil(doc.penulis)
    const pilar = ambil(doc.pilar)
    return {
      ...dasar,
      type: 'article',
      publishedTime: doc.terbitPada ?? undefined,
      modifiedTime: doc.diperbaruiBesar ?? doc.terbitPada ?? undefined,
      authors: penulis?.slug ? [urlAbsolut(situs, pathFor({ jenis: 'penulis', slug: penulis.slug }))] : undefined,
      section: pilar?.nama,
    }
  }
  if (masukan.jenis === 'penulis') return { ...dasar, type: 'profile' }
  if (masukan.jenis === 'video') return { ...dasar, type: 'video.other' }
  return { ...dasar, type: 'website' }
}

/**
 * `Metadata` Next.js untuk satu halaman. Dipanggil `generateMetadata` halaman publik (Rencana 4)
 * dengan dokumen yang sudah di-populate (depth 1) dan pengaturan situs dari `ambilSitus()`.
 */
export function metadata(masukan: MasukanSeo, situs: Situs): Metadata {
  const judul = judulSeo(masukan, situs)
  const deskripsi = deskripsiDokumen(masukan, situs)
  const canonical = canonicalDokumen(masukan, situs)
  const gambar = gambarOgDokumen(masukan, situs)
  const noindex = noindexDokumen(masukan)

  const hasil: Metadata = {
    metadataBase: new URL(situs.urlSitus),
    title: { absolute: judul },
    description: deskripsi,
    alternates: { canonical },
    robots: noindex
      ? { index: false, follow: true }
      : { index: true, follow: true, 'max-image-preview': 'large' },
    openGraph: openGraph(masukan, situs, {
      title: judul,
      description: deskripsi,
      url: canonical,
      siteName: situs.namaSitus,
      locale: 'id_ID',
      images: [gambar],
    }),
    twitter: { card: 'summary_large_image', title: judul, description: deskripsi, images: [gambar.url] },
  }

  if (masukan.jenis === 'beranda') {
    hasil.alternates = { canonical, types: { 'application/rss+xml': urlAbsolut(situs, PATH_FEED) } }
    const google = situs.verifikasi?.google?.trim()
    const bing = situs.verifikasi?.bing?.trim()
    if (google || bing) {
      hasil.verification = { ...(google ? { google } : {}), ...(bing ? { other: { 'msvalidate.01': bing } } : {}) }
    }
  }
  return hasil
}

export const JUDUL_TIDAK_DITEMUKAN = 'Halaman tidak ditemukan'

/**
 * Metadata halaman 404 (`not-found.tsx`). Tanpa canonical dan Open Graph karena halaman ini tidak
 * diindeks; Next menambahkan `noindex` sendiri untuk status 404.
 */
export function metadataTidakDitemukan(situs: Pick<PengaturanSitus, 'urlSitus' | 'polaJudul'>): Metadata {
  return {
    metadataBase: new URL(situs.urlSitus),
    title: { absolute: judulHalaman(situs.polaJudul, JUDUL_TIDAK_DITEMUKAN) },
  }
}
