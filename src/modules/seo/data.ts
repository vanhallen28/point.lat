import type { Payload, Where } from 'payload'

import { TAG } from '@/lib/tag'

import { entriFeed, entriNews, entriSitemap } from './sitemap'
import type { ArtikelSeo, MasukanSeo, PengaturanSitus } from './tipe'
import {
  JENDELA_NEWS_MS,
  JENIS_SITEMAP,
  MAKS_URL_NEWS,
  MAKS_URL_SITEMAP,
  pathSitemap,
  terbaru,
  type EntriFeed,
  type EntriIndex,
  type EntriNews,
  type EntriSitemap,
  type JenisSitemap,
} from './xml'

/**
 * Data untuk rute teknis. Fungsi di sini membaca Payload; pembentukan XML ada di `xml.ts`.
 * Rute membungkusnya dengan `unstable_cache` bertag (lihat `cache.ts`).
 */

/** Koleksi dengan draf: hanya versi terbit yang masuk sitemap. Pilar dan penulis tanpa draf. */
const PAKAI_DRAF: Record<JenisSitemap, boolean> = {
  artikel: true,
  pilar: false,
  tools: true,
  video: true,
  penulis: false,
  halaman: true,
}

/** Jumlah artikel di RSS. */
export const JUMLAH_FEED = 30

/** Filter query sitemap: terbit dan tidak noindex. Disaring lagi di `layakSitemap` (canonical). */
export function syaratSitemap(jenis: JenisSitemap): Where {
  const syarat: Where[] = [{ 'seo.noindex': { not_equals: true } }]
  if (PAKAI_DRAF[jenis]) syarat.push({ _status: { equals: 'published' } })
  return { and: syarat }
}

/** Artikel terbit (non-glosarium tetap ikut) dalam jendela news sitemap. */
export function syaratNews(sekarang: Date): Where {
  return {
    and: [
      { _status: { equals: 'published' } },
      { 'seo.noindex': { not_equals: true } },
      { terbitPada: { greater_than_equal: new Date(sekarang.getTime() - JENDELA_NEWS_MS).toISOString() } },
      { terbitPada: { less_than_equal: sekarang.toISOString() } },
    ],
  }
}

export async function ambilPengaturan(payload: Payload): Promise<PengaturanSitus> {
  return (await payload.findGlobal({ slug: 'pengaturan-seo', depth: 1 })) as PengaturanSitus
}

const tipePath: Record<JenisSitemap, MasukanSeo['jenis']> = {
  artikel: 'artikel',
  pilar: 'pilar',
  tools: 'tools',
  video: 'video',
  penulis: 'penulis',
  halaman: 'halaman',
}

/** Entri satu sitemap jenis. Depth 0 cukup: path artikel hanya butuh slug dan tipe. */
export async function ambilEntriSitemap(payload: Payload, jenis: JenisSitemap, situs: Pick<PengaturanSitus, 'urlSitus'>): Promise<EntriSitemap[]> {
  const { docs } = await payload.find({
    collection: jenis,
    where: syaratSitemap(jenis),
    depth: 0,
    limit: MAKS_URL_SITEMAP,
    pagination: false,
    sort: '-updatedAt',
  })
  const masukan = docs.map((doc) => ({ jenis: tipePath[jenis], doc }) as MasukanSeo)
  return entriSitemap(masukan, situs)
}

/** Isi sitemap index: semua jenis, `lastmod` = entri terbaru jenis itu. Jenis kosong tetap dicantumkan. */
export async function ambilIndexSitemap(payload: Payload, situs: Pick<PengaturanSitus, 'urlSitus'>): Promise<EntriIndex[]> {
  const hasil: EntriIndex[] = []
  for (const jenis of JENIS_SITEMAP) {
    const entri = await ambilEntriSitemap(payload, jenis, situs)
    hasil.push({ loc: new URL(pathSitemap(jenis), situs.urlSitus).toString(), lastmod: terbaru(entri.map((e) => e.lastmod)) })
  }
  return hasil
}

export async function ambilEntriNews(payload: Payload, situs: Pick<PengaturanSitus, 'urlSitus'>, sekarang: Date): Promise<EntriNews[]> {
  const { docs } = await payload.find({
    collection: 'artikel',
    where: syaratNews(sekarang),
    depth: 0,
    limit: MAKS_URL_NEWS,
    pagination: false,
    sort: '-terbitPada',
  })
  return entriNews(docs as ArtikelSeo[], situs)
}

/**
 * RSS hanya butuh teks, nama penulis, dan nama pilar. `select` dan `populate` membatasi relasi supaya
 * media (gambar utama, foto penulis, gambar OG) tidak ikut dimuat: lebih ringan, dan URL media tidak
 * dibangun sama sekali.
 */
export async function ambilEntriFeed(payload: Payload, situs: PengaturanSitus): Promise<EntriFeed[]> {
  const { docs } = await payload.find({
    collection: 'artikel',
    where: { and: [{ _status: { equals: 'published' } }, { 'seo.noindex': { not_equals: true } }] },
    depth: 1,
    limit: JUMLAH_FEED,
    sort: '-terbitPada',
    select: {
      judul: true,
      slug: true,
      tipe: true,
      deck: true,
      terbitPada: true,
      penulis: true,
      pilar: true,
      seo: { metaDeskripsi: true, canonical: true, noindex: true },
    },
    populate: { penulis: { nama: true }, pilar: { nama: true } },
  })
  return entriFeed(docs as ArtikelSeo[], situs)
}

/** Tag cache tiap rute teknis. `sitemap` direvalidasi setiap konten publik berubah (Task 6). */
export const TAG_RUTE = {
  sitemap: [TAG.sitemap, TAG.pengaturanSeo],
  robots: [TAG.pengaturanSeo],
} as const
