import type { Payload } from 'payload'

import type { ToolId } from '@/lib/konstanta'
import type { Tool } from '@/payload-types'
import { teksIsi, type IsiDokumen } from '@/modules/seo/lexical'
import { TOOLS_AWAL } from '@/seed/tools'

import { pasangBerandaPortal } from './beranda'
import { markdownKeLexical, type CariDokumen } from './markdown'
import { MOZAIK_PAKET, PAKET_AWAL } from './paket-awal'
import type { ArtikelPaket, HasilImpor } from './tipe'

/** Pembaca file sampul. Bawaan membaca `src/modules/paket/sampul/` (`sampul.ts`); tes memakai pembaca sendiri. */
export type BacaSampul = (file: string) => Promise<Buffer>

export type OpsiImpor = {
  bacaSampul: BacaSampul
  paket?: ArtikelPaket[]
  /** Slug artikel untuk blok mozaik beranda; daftar kosong berarti beranda tidak disentuh. */
  mozaik?: string[]
  /** Perbarui penjelasan tools dari data awal (bawaan menyala). Tes mematikannya supaya tools bersama tidak berubah. */
  perbaruiTools?: boolean
  /** Id penulis artikel; bawaan Redaksi point. (slug `redaksi`). Dipakai Otomasi artikel. */
  penulis?: number | null
  sekarang?: Date
}

/** Tools yang diubah lebih dari semenit setelah dibuat seed dianggap sudah disunting pemilik, jadi tidak ditimpa. */
const JEDA_SUNTING_MS = 60 * 1000

type Id = number

/**
 * Impor paket konten (spesifikasi §24). Aman diulang: artikel dicari lewat slug (termasuk draf) dan yang sudah
 * ada tidak disentuh; subkategori dibuat bila slug-nya belum ada di pilar itu; tools hanya diperbarui bila
 * masih draf, belum pernah terbit, dan belum disunting; blok mozaik beranda hanya ditambahkan bila belum ada.
 *
 * Artikel baru masuk sebagai draf dengan tanda `pakaiDrafAi`, jadi checklist "Review sebelum terbit" wajib
 * dicentang sebelum terbit (spesifikasi §10). Draf tidak merevalidasi halaman dan tidak dikabarkan ke mesin
 * pencari; itu terjadi saat pemilik menerbitkannya.
 */
export async function imporPaket(payload: Payload, opsi: OpsiImpor): Promise<HasilImpor> {
  const paket = opsi.paket ?? PAKET_AWAL
  const hasil: HasilImpor = {
    selesaiPada: '',
    artikel: { dibuat: [], sudahAda: [] },
    subkategori: { dibuat: [] },
    tools: { diperbarui: [], dilewati: [] },
    beranda: 'dilewati',
    galat: [],
  }

  const idPilar = await petaPilar(payload, paket)
  const penulis = opsi.penulis ?? (await cariPenulis(payload))
  if (!penulis) hasil.galat.push('Penulis "Redaksi point." (slug redaksi) belum ada. Jalankan data awal dulu.')
  const pilarHilang = [...new Set(paket.map((a) => a.pilar))].filter((p) => !idPilar.has(p))
  for (const p of pilarHilang) hasil.galat.push(`Pilar ${p} belum ada.`)

  const idSub = await siapkanSubkategori(payload, paket, idPilar, hasil)
  const idTools = await petaTools(payload)
  const idArtikel = await petaArtikel(payload, [...paket.map((a) => a.slug), ...paket.flatMap((a) => a.terkait)])

  // Tahap 1: dokumen baru dengan semua isian kecuali isi dan artikel terkait (id tujuan tautan belum lengkap).
  const baru: ArtikelPaket[] = []
  for (const a of paket) {
    if (idArtikel.has(a.slug)) {
      hasil.artikel.sudahAda.push(a.slug)
      continue
    }
    const pilar = idPilar.get(a.pilar)
    if (!pilar || !penulis) continue
    try {
      const gambar = await unggahSampul(payload, a, opsi.bacaSampul)
      const doc = await payload.create({
        collection: 'artikel',
        draft: true,
        data: {
          _status: 'draft',
          judul: a.judul,
          slug: a.slug,
          tipe: a.tipe,
          pilar,
          subkategori: a.subkategori ? (idSub.get(`${a.pilar}/${a.subkategori.slug}`) ?? null) : null,
          penulis,
          deck: a.deck,
          intinya: a.intinya.map((poin) => ({ poin })),
          gambarUtama: gambar,
          faq: a.faq,
          sumber: a.sumber,
          seo: { ...a.seo, keyphraseSekunder: a.seo.keyphraseSekunder ?? [] },
          toolsTerkait: a.tools.map((t) => idTools.get(t)).filter((id): id is Id => id !== undefined),
          pakaiDrafAi: true,
        },
      })
      idArtikel.set(a.slug, doc.id)
      baru.push(a)
      hasil.artikel.dibuat.push(a.slug)
    } catch (galat) {
      hasil.galat.push(`${a.slug}: ${(galat as Error).message}`)
    }
  }

  // Tahap 2: isi dan artikel terkait, setelah semua id artikel paket diketahui.
  const cari: CariDokumen = {
    artikel: (slug) => idArtikel.get(slug) ?? null,
    tools: (toolId) => idTools.get(toolId as ToolId) ?? null,
  }
  for (const a of baru) {
    const id = idArtikel.get(a.slug)!
    try {
      await payload.update({
        collection: 'artikel',
        id,
        draft: true,
        data: {
          isi: markdownKeLexical(a.isi, cari, a.slug) as never,
          artikelTerkait: a.terkait.map((s) => idArtikel.get(s)).filter((t): t is Id => t !== undefined && t !== id),
        },
      })
    } catch (galat) {
      hasil.galat.push(`${a.slug}: ${(galat as Error).message}`)
    }
  }

  if (opsi.perbaruiTools !== false) await perbaruiTools(payload, hasil)
  hasil.beranda = await tambahMozaik(payload, opsi.mozaik ?? MOZAIK_PAKET, idArtikel, hasil)
  hasil.selesaiPada = (opsi.sekarang ?? new Date()).toISOString()
  return hasil
}

async function petaPilar(payload: Payload, paket: ArtikelPaket[]): Promise<Map<string, Id>> {
  const slug = [...new Set(paket.map((a) => a.pilar))]
  const { docs } = await payload.find({ collection: 'pilar', where: { slug: { in: slug } }, limit: slug.length, depth: 0, select: { slug: true } })
  return new Map(docs.map((d) => [d.slug as string, d.id]))
}

async function cariPenulis(payload: Payload): Promise<Id | null> {
  const { docs } = await payload.find({ collection: 'penulis', where: { slug: { equals: 'redaksi' } }, limit: 1, depth: 0, select: {} })
  return docs[0]?.id ?? null
}

/** Subkategori paket per `pilar/slug`. Slug yang sudah dipakai subkategori pilar lain dicatat sebagai galat. */
async function siapkanSubkategori(payload: Payload, paket: ArtikelPaket[], idPilar: Map<string, Id>, hasil: HasilImpor): Promise<Map<string, Id>> {
  const peta = new Map<string, Id>()
  for (const a of paket) {
    if (!a.subkategori) continue
    const kunci = `${a.pilar}/${a.subkategori.slug}`
    const pilar = idPilar.get(a.pilar)
    if (peta.has(kunci) || !pilar) continue
    const { docs } = await payload.find({
      collection: 'subkategori',
      where: { slug: { equals: a.subkategori.slug } },
      limit: 1,
      depth: 0,
      select: { pilar: true },
    })
    const ada = docs[0]
    if (ada) {
      const pilarAda = typeof ada.pilar === 'object' && ada.pilar ? ada.pilar.id : ada.pilar
      if (pilarAda === pilar) peta.set(kunci, ada.id)
      else hasil.galat.push(`Subkategori ${a.subkategori.slug} sudah dipakai pilar lain; artikel ${a.slug} masuk tanpa subkategori.`)
      continue
    }
    try {
      const doc = await payload.create({ collection: 'subkategori', data: { ...a.subkategori, pilar } })
      peta.set(kunci, doc.id)
      hasil.subkategori.dibuat.push(a.subkategori.slug)
    } catch (galat) {
      hasil.galat.push(`Subkategori ${a.subkategori.slug}: ${(galat as Error).message}`)
    }
  }
  return peta
}

async function petaTools(payload: Payload): Promise<Map<ToolId, Id>> {
  const { docs } = await payload.find({ collection: 'tools', draft: true, limit: 50, depth: 0, select: { toolId: true } })
  return new Map(docs.map((d) => [d.toolId as ToolId, d.id]))
}

async function petaArtikel(payload: Payload, slug: string[]): Promise<Map<string, Id>> {
  const unik = [...new Set(slug)]
  const { docs } = await payload.find({ collection: 'artikel', draft: true, where: { slug: { in: unik } }, limit: unik.length, depth: 0, select: { slug: true } })
  return new Map(docs.map((d) => [d.slug as string, d.id]))
}

async function unggahSampul(payload: Payload, a: ArtikelPaket, baca: BacaSampul): Promise<Id> {
  const data = await baca(a.sampul.file)
  const media = await payload.create({
    collection: 'media',
    data: { alt: a.sampul.alt, kredit: 'Kartu sampul point.' },
    file: { data, mimetype: 'image/png', name: a.sampul.file, size: data.length },
  })
  return media.id
}

/**
 * Penjelasan sama bila teks per blok sama. Payload menambah properti bawaan ke node Lexical saat menyimpan
 * (misalnya `textFormat`), jadi JSON yang tersimpan tidak pernah sama persis dengan data awal.
 */
function samaIsi(a: unknown, b: unknown): boolean {
  if (!a || !b) return a === b
  return JSON.stringify(teksIsi(a as IsiDokumen)) === JSON.stringify(teksIsi(b as IsiDokumen))
}

/**
 * Alasan tools tidak diperbarui impor, atau `null` bila boleh diperbarui. Tools yang pernah terbit atau sudah
 * disunting pemilik tidak pernah ditimpa; versi lama tetap bisa dipulihkan dari riwayat versi Payload.
 */
export function alasanLewatiTools(
  doc: { _status?: Tool['_status']; penjelasan?: unknown; createdAt: string; updatedAt: string } | undefined,
  penjelasanBaru: unknown,
  pernahTerbit: boolean,
): string | null {
  if (!doc) return 'Belum ada. Jalankan data awal dulu.'
  if (doc._status === 'published' || pernahTerbit) return 'Sudah pernah terbit, jadi tidak ditimpa.'
  if (samaIsi(doc.penjelasan, penjelasanBaru)) return 'Isinya sudah terbaru.'
  if (Date.parse(doc.updatedAt) - Date.parse(doc.createdAt) > JEDA_SUNTING_MS) return 'Sudah kamu sunting, jadi tidak ditimpa.'
  return null
}

/** Penjelasan, FAQ, sumber, ringkasan, dan SEO tools dari data awal terbaru, hanya untuk tools yang belum disentuh pemilik. */
async function perbaruiTools(payload: Payload, hasil: HasilImpor): Promise<void> {
  for (const t of TOOLS_AWAL) {
    const { docs } = await payload.find({ collection: 'tools', draft: true, where: { toolId: { equals: t.toolId } }, limit: 1, depth: 0 })
    const doc = docs[0] as Tool | undefined
    const alasan = alasanLewatiTools(doc, t.penjelasan, doc ? await pernahTerbit(payload, doc.id) : false)
    if (alasan || !doc) {
      hasil.tools.dilewati.push({ toolId: t.toolId, alasan: alasan ?? '' })
      continue
    }
    try {
      await payload.update({
        collection: 'tools',
        id: doc.id,
        draft: true,
        data: { ringkasan: t.ringkasan, penjelasan: t.penjelasan as never, faq: t.faq, sumberAturan: t.sumberAturan, seo: t.seo },
      })
      hasil.tools.diperbarui.push(t.toolId)
    } catch (galat) {
      hasil.galat.push(`Tools ${t.toolId}: ${(galat as Error).message}`)
    }
  }
}

async function pernahTerbit(payload: Payload, id: Id): Promise<boolean> {
  const { totalDocs } = await payload.findVersions({
    collection: 'tools',
    where: { and: [{ parent: { equals: id } }, { 'version._status': { equals: 'published' } }] },
    limit: 1,
    depth: 0,
  })
  return totalDocs > 0
}

/**
 * Tata letak beranda bergaya portal (`pasangBerandaPortal`): mozaik "Pilihan redaksi" berisi artikel pilihan paket,
 * strip kalkulator, dan baris rubrik, hanya yang belum ada dan hanya bila beranda tidak punya perubahan yang belum
 * diterbitkan. Mozaik baru tampil di situs setelah artikel pilihannya terbit (`susunBeranda` hanya memakai artikel terbit).
 */
async function tambahMozaik(payload: Payload, mozaik: string[], idArtikel: Map<string, Id>, hasil: HasilImpor): Promise<HasilImpor['beranda']> {
  if (mozaik.length === 0) return 'dilewati'
  const artikel = mozaik.map((s) => idArtikel.get(s)).filter((id): id is Id => id !== undefined)
  try {
    return await pasangBerandaPortal(payload, artikel)
  } catch (galat) {
    hasil.galat.push(`Beranda: ${(galat as Error).message}`)
    return 'dilewati'
  }
}
