import { revalidateTag } from 'next/cache'
import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  GlobalAfterChangeHook,
  PayloadRequest,
} from 'payload'

import { TAG, tagRevalidasi, type KoleksiPublik } from '@/lib/tag'

export type PemicuRevalidasi = (tag: string) => void

/**
 * `{ expire: 0 }`: data langsung kedaluwarsa, permintaan berikutnya (termasuk crawler yang dipanggil
 * Mesin Indexing tepat setelah terbit) menunggu data baru, bukan menerima versi lama. Dokumentasi
 * Next 16 menyarankan bentuk ini untuk revalidasi dari luar Server Action (route handler Payload).
 *
 * Di luar server Next (`pnpm seed`, tes, skrip `payload run`) tidak ada cache yang perlu dibuang dan
 * `revalidateTag` melempar "static generation store missing"; galat itu sengaja diabaikan.
 */
const pemicuNext: PemicuRevalidasi = (tag) => {
  try {
    revalidateTag(tag, { expire: 0 })
  } catch (galat) {
    if (!String((galat as Error)?.message).includes('static generation store missing')) throw galat
  }
}

let pemicu: PemicuRevalidasi = pemicuNext

/** Mengganti pemicu (tes). Mengembalikan pemicu sebelumnya supaya bisa dipulihkan. */
export function pakaiPemicuRevalidasi(baru: PemicuRevalidasi | null): PemicuRevalidasi {
  const lama = pemicu
  pemicu = baru ?? pemicuNext
  return lama
}

export function revalidasi(tag: string[]): void {
  for (const t of new Set(tag)) pemicu(t)
}

type DokumenPublik = {
  id: number | string
  slug?: string | null
  _status?: 'draft' | 'published' | null
  pilar?: unknown
}

/** Slug pilar dari relasi (ID atau dokumen). ID di-resolve dengan satu query kecil. */
async function slugPilar(req: PayloadRequest, relasi: unknown[]): Promise<string[]> {
  const slug: string[] = []
  const id: (number | string)[] = []
  for (const r of relasi) {
    if (r && typeof r === 'object') {
      const s = (r as { slug?: string | null }).slug
      if (s) slug.push(s)
    } else if (typeof r === 'number' || typeof r === 'string') {
      id.push(r)
    }
  }
  if (id.length) {
    const { docs } = await req.payload.find({
      collection: 'pilar',
      where: { id: { in: id } },
      depth: 0,
      limit: id.length,
      select: { slug: true },
      req,
    })
    for (const d of docs) if (d.slug) slug.push(d.slug)
  }
  return slug
}

async function tagDokumen(koleksi: KoleksiPublik, doc: DokumenPublik, sebelumnya: DokumenPublik | undefined, req: PayloadRequest) {
  const pilar =
    koleksi === 'pilar'
      ? [doc.slug, sebelumnya?.slug]
      : await slugPilar(req, [doc.pilar, sebelumnya?.pilar])
  return tagRevalidasi(koleksi, doc, pilar)
}

const kunciKonteks = (koleksi: string, id: unknown) => `publikSebelumnya:${koleksi}:${String(id)}`

/** Status dokumen utama (versi publik), bukan versi draf terakhir. */
async function statusUtama(req: PayloadRequest, koleksi: string, id: number | string) {
  const utama = await req.payload.findByID({ collection: koleksi as 'artikel', id, draft: false, depth: 0, req, disableErrors: true })
  return utama?._status
}

/**
 * Hook revalidasi untuk koleksi publik.
 *
 * Koleksi dengan draf: menyimpan draf (termasuk autosave) tidak mengubah halaman publik, jadi tidak
 * merevalidasi. Yang merevalidasi hanya terbit, batal terbit, dan hapus. Status dokumen utama (versi
 * publik) dicatat di `beforeChange` karena di `afterChange` dokumen utama sudah tertimpa dan
 * `previousDoc` berisi versi terakhir (bisa draf), pola yang sama dengan `redirectSaatPathBerubah`.
 */
export function revalidasiPublik(koleksi: KoleksiPublik): {
  beforeChange: CollectionBeforeChangeHook
  afterChange: CollectionAfterChangeHook
  afterDelete: CollectionAfterDeleteHook
} {
  const beforeChange: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req, collection }) => {
    if (!collection.versions?.drafts || operation !== 'update' || !originalDoc) return data
    if (data._status === 'published') return data
    // `originalDoc` adalah versi terakhir. Bila versi itu terbit, dokumen utama pasti terbit.
    const tadinyaPublik =
      originalDoc._status === 'published' || (await statusUtama(req, collection.slug, originalDoc.id)) === 'published'
    req.context[kunciKonteks(collection.slug, originalDoc.id)] = tadinyaPublik
    return data
  }

  const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req, collection, operation }) => {
    const publik = doc as DokumenPublik
    const lama = previousDoc as DokumenPublik | undefined
    if (collection.versions?.drafts && publik._status !== 'published') {
      const kunci = kunciKonteks(collection.slug, publik.id)
      const tadinyaPublik = req.context[kunci] === true
      delete req.context[kunci]
      // Batal terbit: dokumen utama tadinya terbit dan sekarang draf. Selain itu hanya simpan draf.
      if (operation === 'create' || !tadinyaPublik || (await statusUtama(req, collection.slug, publik.id)) === 'published') return doc
    }
    revalidasi(await tagDokumen(koleksi, publik, lama, req))
    return doc
  }

  const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
    revalidasi(await tagDokumen(koleksi, doc as DokumenPublik, undefined, req))
    return doc
  }

  return { beforeChange, afterChange, afterDelete }
}

/** Hook koleksi pendukung (media, redirect): merevalidasi tag tetap setiap kali dokumen disimpan atau dihapus. */
export function revalidasiKoleksi(tag: string[]): {
  afterChange: CollectionAfterChangeHook
  afterDelete: CollectionAfterDeleteHook
} {
  return {
    afterChange: ({ doc }) => {
      revalidasi(tag)
      return doc
    },
    afterDelete: ({ doc }) => {
      revalidasi(tag)
      return doc
    },
  }
}

/** Hook global: merevalidasi tag tetap setiap kali global disimpan. */
export function revalidasiGlobal(tag: string[]): GlobalAfterChangeHook {
  return ({ doc }) => {
    revalidasi(tag)
    return doc
  }
}

/** Pengaturan SEO memengaruhi robots.txt, metadata semua halaman, dan URL absolut di sitemap. */
export const revalidasiPengaturanSeo = revalidasiGlobal([TAG.pengaturanSeo, TAG.sitemap])

/**
 * Beranda dirender dari global `beranda`; `lastmod` beranda di sitemap halaman ikut tanggal global itu.
 * Menyimpan draf global juga memicu ini, dan itu murah: beranda hanya dirender ulang sekali.
 */
export const revalidasiBeranda = revalidasiGlobal([TAG.beranda, TAG.sitemap])

/** Blok newsletter beranda membaca global `newsletter`. */
export const revalidasiNewsletter = revalidasiGlobal([TAG.beranda])

/** Header dan footer dirender layout di semua halaman publik. */
export const revalidasiHeader = revalidasiGlobal([TAG.header])
export const revalidasiFooter = revalidasiGlobal([TAG.footer])

/** Global iklan dibaca layout (banner persetujuan), halaman berslot iklan, beranda, dan `/ads.txt`. */
export const revalidasiIklan = revalidasiGlobal([TAG.iklan])
