import type { Payload, Where } from 'payload'

import type { Artikel } from '@/payload-types'
import { validasiFormatSlug } from '@/lib/slug'

import { gabungTerkait, kartuArtikel, MAKS_TERKAIT, susunArtikel } from './artikel'
import { kelompokkanIstilah } from './glosarium'
import { MAKS_PATH } from './log404'
import type { RedirectTersimpan } from './redirect'
import { susunFooter, susunHeader } from './tampilan'
import type { DataArtikel, DataFooter, DataHeader, KartuArtikel, KelompokIstilah } from './tipe'

/**
 * Query Payload untuk halaman publik. Fungsi di sini menerima `payload` supaya bisa diuji integrasi;
 * halaman memakai versi bertag cache di `cache.ts`.
 */

export async function ambilHeader(payload: Payload): Promise<DataHeader> {
  const header = await payload.findGlobal({
    slug: 'header',
    depth: 1,
    populate: { pilar: { nama: true, slug: true, warna: true } },
  })
  return susunHeader(header)
}

export async function ambilFooter(payload: Payload): Promise<DataFooter> {
  return susunFooter(await payload.findGlobal({ slug: 'footer', depth: 0 }))
}

/**
 * Field dokumen relasi yang dimuat halaman artikel (depth 2). Membatasi field menjaga data cache
 * kecil; media hanya membawa field untuk `propsGambar` dan teks pendamping.
 */
const POPULATE_ARTIKEL = {
  pilar: { nama: true, slug: true, warna: true, disclaimer: true },
  subkategori: { nama: true, slug: true, pilar: true },
  penulis: { nama: true, slug: true, bio: true, keahlian: true, foto: true },
  media: { alt: true, publicId: true, jenis: true, width: true, height: true, caption: true, kredit: true },
  artikel: { judul: true, slug: true, tipe: true, pilar: true, intinya: true, _status: true },
  tools: { nama: true, slug: true, ringkasan: true, _status: true },
  video: { judul: true, slug: true, file: true, poster: true, transkrip: true, _status: true },
  halaman: { judul: true, slug: true, _status: true },
} as const

const terbit: Where = { _status: { equals: 'published' } }

/**
 * Artikel terbit dengan slug ini, siap dirender. `glosarium: true` hanya mencari tipe glosarium
 * (`/glosarium/{slug}`), selain itu semua tipe lain (`/{slug}`). Slug yang formatnya tidak mungkin
 * (misalnya `favicon.ico`) langsung `null` tanpa query.
 */
export async function ambilArtikel(payload: Payload, slug: string, opsi: { glosarium: boolean }): Promise<DataArtikel | null> {
  if (validasiFormatSlug(slug) !== true) return null
  const { docs } = await payload.find({
    collection: 'artikel',
    where: {
      and: [
        { slug: { equals: slug } },
        terbit,
        { tipe: opsi.glosarium ? { equals: 'glosarium' } : { not_equals: 'glosarium' } },
      ],
    },
    depth: 2,
    limit: 1,
    pagination: false,
    populate: POPULATE_ARTIKEL,
  })
  const doc = docs[0]
  if (!doc) return null
  return susunArtikel(doc, await ambilTerkait(payload, doc))
}

const idRelasi = (relasi: number | { id: number } | null | undefined) =>
  relasi && typeof relasi === 'object' ? relasi.id : (relasi ?? null)

/** Pilihan editor dulu, lalu artikel sepilar terbaru (bukan glosarium) untuk melengkapi. */
async function ambilTerkait(payload: Payload, doc: Artikel): Promise<KartuArtikel[]> {
  const manual = doc.artikelTerkait ?? []
  const kecuali = [doc.id, ...manual.map(idRelasi).filter((id): id is number => id !== null)]
  const { docs } = await payload.find({
    collection: 'artikel',
    where: {
      and: [
        terbit,
        { pilar: { equals: idRelasi(doc.pilar) } },
        { tipe: { not_equals: 'glosarium' } },
        { id: { not_in: kecuali } },
      ],
    },
    sort: '-terbitPada',
    limit: MAKS_TERKAIT,
    depth: 1,
    pagination: false,
    select: { judul: true, slug: true, tipe: true, pilar: true, intinya: true },
    populate: { pilar: POPULATE_ARTIKEL.pilar },
  })
  return gabungTerkait(doc.id, manual, docs)
}

/** Semua istilah glosarium terbit untuk `/glosarium`. */
export async function ambilGlosarium(payload: Payload): Promise<KelompokIstilah[]> {
  const { docs } = await payload.find({
    collection: 'artikel',
    where: { and: [terbit, { tipe: { equals: 'glosarium' } }] },
    depth: 0,
    limit: 2000,
    pagination: false,
    select: { judul: true, slug: true, deck: true, intinya: true },
  })
  return kelompokkanIstilah(docs)
}

/** Redirect untuk path ini dari koleksi `redirect` (Local API, jadi akses admin tidak berlaku). */
export async function cariRedirect(payload: Payload, path: string): Promise<RedirectTersimpan | null> {
  if (path.length > MAKS_PATH) return null
  const { docs } = await payload.find({
    collection: 'redirect',
    where: { dari: { equals: path } },
    limit: 1,
    depth: 0,
    pagination: false,
    select: { kode: true, ke: true },
  })
  return docs[0] ? { kode: docs[0].kode, ke: docs[0].ke ?? null } : null
}

/** Artikel terbit terbaru (bukan glosarium) untuk halaman 404. */
export async function ambilTerbaru(payload: Payload, jumlah: number): Promise<KartuArtikel[]> {
  const { docs } = await payload.find({
    collection: 'artikel',
    where: { and: [terbit, { tipe: { not_equals: 'glosarium' } }] },
    sort: '-terbitPada',
    limit: jumlah,
    depth: 1,
    pagination: false,
    select: { judul: true, slug: true, tipe: true, pilar: true, intinya: true },
    populate: { pilar: POPULATE_ARTIKEL.pilar },
  })
  return docs.map(kartuArtikel).filter((k): k is KartuArtikel => k !== null)
}
