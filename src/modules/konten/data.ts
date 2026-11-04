import type { Payload, Where } from 'payload'

import type { Artikel } from '@/payload-types'
import { validasiFormatSlug } from '@/lib/slug'

import { gabungTerkait, kartuArtikel, MAKS_TERKAIT, susunArtikel } from './artikel'
import { MAKS_TERBARU_BERANDA, MAKS_VIDEO_BERANDA, susunBeranda, susunNewsletter } from './beranda'
import { kataKueri, MAKS_HASIL_CARI, urutkanHasil } from './cari'
import { kelompokkanIstilah } from './glosarium'
import { susunHalaman } from './halaman'
import { MAKS_ARTIKEL_PENULIS, susunPenulis } from './penulis'
import { MAKS_PATH } from './log404'
import type { RedirectTersimpan } from './redirect'
import { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
import { susunFooter, susunHeader } from './tampilan'
import { kelompokkanTools } from './tools'
import { kartuVideo, MAKS_VIDEO_INDEKS, MAKS_VIDEO_LAIN, susunVideo } from './video'
import type {
  BagianBeranda,
  DataArtikel,
  DataFooter,
  DataHalaman,
  DataHeader,
  DataPenulis,
  DataRubrik,
  DataVideo,
  KartuArtikel,
  KartuVideo,
  KelompokIstilah,
  KelompokTools,
} from './tipe'

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

/**
 * Kartu artikel terbit (bukan glosarium) yang memenuhi `syarat`, terbaru dulu. Dipakai semua daftar
 * kartu: 404, rubrik, dan seterusnya.
 */
async function kartuTerbit(payload: Payload, syarat: Where[], jumlah: number): Promise<KartuArtikel[]> {
  const { docs } = await payload.find({
    collection: 'artikel',
    where: { and: [terbit, { tipe: { not_equals: 'glosarium' } }, ...syarat] },
    sort: '-terbitPada',
    limit: jumlah,
    depth: 1,
    pagination: false,
    select: { judul: true, slug: true, tipe: true, pilar: true, intinya: true },
    populate: { pilar: POPULATE_ARTIKEL.pilar },
  })
  return docs.map(kartuArtikel).filter((k): k is KartuArtikel => k !== null)
}

/** Artikel terbit terbaru (bukan glosarium) untuk halaman 404. */
export async function ambilTerbaru(payload: Payload, jumlah: number): Promise<KartuArtikel[]> {
  return kartuTerbit(payload, [], jumlah)
}

/**
 * Halaman rubrik `/{pilar}` (`subSlug` `null`) atau `/{pilar}/{subkategori}`. `null` bila pilar
 * tidak ada, atau subkategori tidak ada atau milik pilar lain. Intro pilar dimuat seperti isi
 * artikel (depth 2) supaya tautan dan gambar di dalamnya bisa dirender.
 */
export async function ambilRubrik(payload: Payload, pilarSlug: string, subSlug: string | null): Promise<DataRubrik | null> {
  if (validasiFormatSlug(pilarSlug) !== true || (subSlug !== null && validasiFormatSlug(subSlug) !== true)) return null
  const { docs } = await payload.find({
    collection: 'pilar',
    where: { slug: { equals: pilarSlug } },
    depth: 2,
    limit: 1,
    pagination: false,
    populate: POPULATE_ARTIKEL,
  })
  const pilar = docs[0]
  if (!pilar) return null
  // Subkategori sedikit per pilar: semuanya dimuat sekali untuk navigasi dan untuk halaman subkategori.
  const { docs: daftarSub } = await payload.find({
    collection: 'subkategori',
    where: { pilar: { equals: pilar.id } },
    sort: 'nama',
    depth: 1,
    limit: 100,
    pagination: false,
    populate: { pilar: POPULATE_ARTIKEL.pilar, media: POPULATE_ARTIKEL.media },
  })
  const sub = subSlug === null ? null : daftarSub.find((s) => s.slug === subSlug)
  if (sub === undefined) return null
  const syarat: Where[] = [{ pilar: { equals: pilar.id } }, ...(sub ? [{ subkategori: { equals: sub.id } }] : [])]
  return susunRubrik(pilar, sub, daftarSub, await kartuTerbit(payload, syarat, MAKS_ARTIKEL_RUBRIK))
}

/** Halaman statis terbit dengan slug ini. Blok dimuat seperti isi artikel (depth 2) untuk tautan, gambar, dan tool. */
export async function ambilHalaman(payload: Payload, slug: string): Promise<DataHalaman | null> {
  if (validasiFormatSlug(slug) !== true) return null
  const { docs } = await payload.find({
    collection: 'halaman',
    where: { and: [{ slug: { equals: slug } }, terbit] },
    depth: 2,
    limit: 1,
    pagination: false,
    populate: POPULATE_ARTIKEL,
  })
  return docs[0] ? susunHalaman(docs[0]) : null
}

/** Profil penulis dengan tulisan terbitnya (bukan glosarium), terbaru dulu. Penulis tidak punya draf. */
export async function ambilPenulis(payload: Payload, slug: string): Promise<DataPenulis | null> {
  if (validasiFormatSlug(slug) !== true) return null
  const { docs } = await payload.find({
    collection: 'penulis',
    where: { slug: { equals: slug } },
    depth: 1,
    limit: 1,
    pagination: false,
    populate: { media: POPULATE_ARTIKEL.media },
  })
  const penulis = docs[0]
  if (!penulis) return null
  return susunPenulis(penulis, await kartuTerbit(payload, [{ penulis: { equals: penulis.id } }], MAKS_ARTIKEL_PENULIS))
}

/** Media video ikut membawa durasi file (cadangan bila editor tidak mengisi durasi). */
const POPULATE_VIDEO = { pilar: POPULATE_ARTIKEL.pilar, media: { ...POPULATE_ARTIKEL.media, durasi: true } } as const

/** Kartu video terbit yang memenuhi `syarat`, terbaru dulu (video tidak punya tanggal terbit sendiri). */
async function kartuVideoTerbit(payload: Payload, syarat: Where[], jumlah: number): Promise<KartuVideo[]> {
  const { docs } = await payload.find({
    collection: 'video',
    where: { and: [terbit, ...syarat] },
    sort: '-createdAt',
    limit: jumlah,
    depth: 1,
    pagination: false,
    select: { judul: true, slug: true, durasiDetik: true, pilar: true, file: true, poster: true },
    populate: POPULATE_VIDEO,
  })
  return docs.map(kartuVideo).filter((k): k is KartuVideo => k !== null)
}

/** Semua video terbit untuk `/video`. */
export async function ambilDaftarVideo(payload: Payload): Promise<KartuVideo[]> {
  return kartuVideoTerbit(payload, [], MAKS_VIDEO_INDEKS)
}

/** Video terbit dengan slug ini, artikel induknya (yang `videoTerkait`-nya video ini), dan video lain. */
export async function ambilVideo(payload: Payload, slug: string): Promise<DataVideo | null> {
  if (validasiFormatSlug(slug) !== true) return null
  const { docs } = await payload.find({
    collection: 'video',
    where: { and: [{ slug: { equals: slug } }, terbit] },
    depth: 1,
    limit: 1,
    pagination: false,
    populate: POPULATE_VIDEO,
  })
  const doc = docs[0]
  if (!doc) return null
  const [induk] = await kartuTerbit(payload, [{ videoTerkait: { equals: doc.id } }], 1)
  return susunVideo(doc, induk ?? null, await kartuVideoTerbit(payload, [{ id: { not_equals: doc.id } }], MAKS_VIDEO_LAIN))
}

/** Semua tools terbit untuk `/tools`, dikelompokkan per pilar. */
export async function ambilTools(payload: Payload): Promise<KelompokTools[]> {
  const { docs } = await payload.find({
    collection: 'tools',
    where: terbit,
    depth: 1,
    limit: 100,
    pagination: false,
    select: { nama: true, slug: true, ringkasan: true, pilar: true },
    populate: { pilar: { ...POPULATE_ARTIKEL.pilar, urutan: true } },
  })
  return kelompokkanTools(docs)
}

/** Kolom yang dicari `/cari`: judul, deck, poin Intinya, dan keyphrase SEO. */
const KOLOM_CARI = ['judul', 'deck', 'intinya.poin', 'seo.keyphrase'] as const

/**
 * Pencarian `/cari`: artikel terbit (termasuk glosarium) yang memuat setiap kata kueri di salah satu
 * kolom `KOLOM_CARI` (tanpa beda huruf besar), judul yang memuat semua kata di atas. Pencarian teks
 * penuh Postgres bisa menggantikannya bila jumlah artikel sudah ribuan.
 */
export async function cariArtikel(payload: Payload, kueri: string): Promise<KartuArtikel[]> {
  const kata = kataKueri(kueri)
  if (kata.length === 0) return []
  const { docs } = await payload.find({
    collection: 'artikel',
    where: { and: [terbit, ...kata.map((k) => ({ or: KOLOM_CARI.map((kolom) => ({ [kolom]: { like: k } })) }))] },
    sort: '-terbitPada',
    limit: MAKS_HASIL_CARI,
    depth: 1,
    pagination: false,
    select: { judul: true, slug: true, tipe: true, pilar: true, intinya: true },
    populate: { pilar: POPULATE_ARTIKEL.pilar },
  })
  return urutkanHasil(kueri, docs.map(kartuArtikel).filter((k): k is KartuArtikel => k !== null))
}

/** Relasi blok beranda (depth 2): kartu artikel dengan pilarnya, video dengan file dan posternya. */
const POPULATE_BERANDA = {
  artikel: POPULATE_ARTIKEL.artikel,
  video: { judul: true, slug: true, durasiDetik: true, pilar: true, file: true, poster: true, _status: true },
  pilar: POPULATE_ARTIKEL.pilar,
  media: POPULATE_VIDEO.media,
} as const

/**
 * Beranda: blok global `beranda` (versi yang tersimpan tanpa draf) ditambah data yang tidak disimpan
 * di global itu: tulisan terbaru, video terbaru (cadangan strip video), tools terbit, dan newsletter.
 */
export async function ambilBeranda(payload: Payload): Promise<BagianBeranda[]> {
  const beranda = await payload.findGlobal({ slug: 'beranda', depth: 2, populate: POPULATE_BERANDA })
  const newsletter = await payload.findGlobal({ slug: 'newsletter', depth: 0 })
  return susunBeranda(beranda.tataLetak ?? [], {
    terbaru: await kartuTerbit(payload, [], MAKS_TERBARU_BERANDA),
    video: await kartuVideoTerbit(payload, [], MAKS_VIDEO_BERANDA),
    tools: (await ambilTools(payload)).flatMap((k) => k.tools),
    newsletter: susunNewsletter(newsletter),
  })
}
