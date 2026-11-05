import type { Payload, PayloadRequest, Where } from 'payload'

import type { TipeArtikel } from '@/lib/konstanta'
import { PATH_INDEKS, pathFor } from '@/lib/paths'
import { PATH_FEED } from '@/modules/seo/metadata'
import { JENIS_SITEMAP, PATH_NEWS_SITEMAP, PATH_SITEMAP_INDEX, pathSitemap } from '@/modules/seo/xml'

import type { AdapterPantau } from './adapter'
import { BATAS_TAUTAN_PER_JALAN, jadwalCekTautan, statusTautan, TAUTAN_BERSAMAAN, type HasilTugas } from './aturan'
import { nilaiTautan, tautanDokumen, type KoleksiSumber, type Sasaran, type Sumber, type Tautan, type Temuan } from './tautan'

/** Batas dokumen per koleksi yang dipindai sekali jalan; jauh di atas jumlah konten MVP. */
const MAKS_DOKUMEN = 10_000

const terbit: Where = { _status: { equals: 'published' } }

/** Rute yang selalu ada tanpa dokumen: beranda, halaman indeks, dan rute teknis. */
const PATH_TETAP = ['/', ...Object.values(PATH_INDEKS), PATH_FEED, PATH_SITEMAP_INDEX, PATH_NEWS_SITEMAP, '/robots.txt', ...JENIS_SITEMAP.map(pathSitemap)]

type Dok = { id: number | string } & Record<string, unknown>

async function semua(payload: Payload, collection: 'artikel' | 'halaman' | 'pilar' | 'subkategori' | 'tools' | 'video' | 'penulis' | 'redirect', where?: Where): Promise<Dok[]> {
  const { docs } = await payload.find({ collection, where, depth: collection === 'subkategori' ? 1 : 0, limit: MAKS_DOKUMEN, pagination: false, populate: { pilar: { slug: true } } })
  return docs as unknown as Dok[]
}

const noindex = (doc: Dok) => (doc.seo as { noindex?: boolean | null } | null | undefined)?.noindex === true

/**
 * Membaca semua konten terbit, menu, dan beranda, lalu menyusun daftar tautan, peta situs, dan halaman
 * yang diharapkan punya tautan masuk (artikel dan halaman statis terbit yang tidak noindex).
 */
async function kumpulkan(payload: Payload, urlSitus: string) {
  const dokumen = new Map<string, string>()
  const tautan: Tautan[] = []
  const sasaran: Sasaran[] = []
  const tambah = (koleksi: KoleksiSumber, doc: Dok, sumber: Sumber) => {
    for (const tujuan of tautanDokumen(koleksi, doc, urlSitus)) tautan.push({ sumber, tujuan })
  }
  const daftarkan = (koleksi: string, doc: Dok, path: string | null) => {
    if (path) dokumen.set(`${koleksi}:${doc.id}`, path)
    return path
  }

  for (const doc of await semua(payload, 'artikel', terbit)) {
    const path = daftarkan('artikel', doc, doc.slug && doc.tipe ? pathFor({ jenis: 'artikel', slug: String(doc.slug), tipe: doc.tipe as TipeArtikel }) : null)
    const sumber: Sumber = { koleksi: 'artikel', id: doc.id, judul: String(doc.judul), path }
    tambah('artikel', doc, sumber)
    if (path && !noindex(doc)) sasaran.push({ path, sumber })
  }
  for (const doc of await semua(payload, 'halaman', terbit)) {
    const path = daftarkan('halaman', doc, doc.slug ? pathFor({ jenis: 'halaman', slug: String(doc.slug) }) : null)
    const sumber: Sumber = { koleksi: 'halaman', id: doc.id, judul: String(doc.judul), path }
    tambah('halaman', doc, sumber)
    if (path && !noindex(doc)) sasaran.push({ path, sumber })
  }
  for (const doc of await semua(payload, 'pilar')) {
    const path = daftarkan('pilar', doc, doc.slug ? pathFor({ jenis: 'pilar', slug: String(doc.slug) }) : null)
    tambah('pilar', doc, { koleksi: 'pilar', id: doc.id, judul: String(doc.nama), path })
  }
  for (const doc of await semua(payload, 'subkategori')) {
    const pilarSlug = (doc.pilar as { slug?: string | null } | null)?.slug
    daftarkan('subkategori', doc, doc.slug && pilarSlug ? pathFor({ jenis: 'subkategori', slug: String(doc.slug), pilarSlug }) : null)
  }
  for (const doc of await semua(payload, 'tools', terbit)) {
    const path = daftarkan('tools', doc, doc.slug ? pathFor({ jenis: 'tools', slug: String(doc.slug) }) : null)
    tambah('tools', doc, { koleksi: 'tools', id: doc.id, judul: String(doc.nama), path })
  }
  for (const doc of await semua(payload, 'video', terbit)) {
    daftarkan('video', doc, doc.slug ? pathFor({ jenis: 'video', slug: String(doc.slug) }) : null)
  }
  for (const doc of await semua(payload, 'penulis')) {
    const path = daftarkan('penulis', doc, doc.slug ? pathFor({ jenis: 'penulis', slug: String(doc.slug) }) : null)
    tambah('penulis', doc, { koleksi: 'penulis', id: doc.id, judul: String(doc.nama), path })
  }
  const global: [KoleksiSumber & ('header' | 'footer' | 'beranda'), string, string | null][] = [
    ['header', 'Menu header', null],
    ['footer', 'Footer', null],
    ['beranda', 'Beranda', '/'],
  ]
  for (const [slug, judul, path] of global) {
    const doc = (await payload.findGlobal({ slug, depth: 0 })) as unknown as Dok
    tambah(slug, doc, { koleksi: slug, id: null, judul, path })
  }
  const redirect = new Map(
    (await semua(payload, 'redirect')).map((r) => [String(r.dari), { kode: String(r.kode), ke: (r.ke as string | null | undefined) ?? null }]),
  )
  return { tautan, sasaran, peta: { path: new Set([...PATH_TETAP, ...dokumen.values()]), dokumen, redirect } }
}

const dataSumber = (s: Sumber) => ({ sumberKoleksi: s.koleksi, sumberId: s.id === null ? null : String(s.id), sumberJudul: s.judul, sumberPath: s.path })

/**
 * Menyimpan hasil pindai dalam satu transaksi: temuan diganti seluruhnya; URL situs lain yang baru
 * ditambahkan (jatuh tempo dicek sekarang), yang masih dipakai diperbarui sumbernya, dan yang tidak lagi
 * dipakai dibuang.
 */
async function simpan(payload: Payload, temuan: Temuan[], luar: Map<string, Sumber[]>, sekarang: Date): Promise<void> {
  const { docs: ada } = await payload.find({ collection: 'tautan-luar', depth: 0, limit: MAKS_DOKUMEN * 10, pagination: false, select: { url: true } })
  const idUrl = new Map(ada.map((d) => [d.url, d.id]))
  const transaksi = await payload.db.beginTransaction()
  const req: Partial<PayloadRequest> = transaksi ? { transactionID: transaksi } : {}
  try {
    await payload.db.deleteMany({ collection: 'temuan-tautan', where: { id: { exists: true } }, req })
    for (const t of temuan) {
      await payload.db.create({
        collection: 'temuan-tautan',
        data: { jenis: t.jenis, tujuan: t.tujuan, pesan: t.pesan, ...dataSumber(t.sumber), ditemukan: sekarang.toISOString() },
        req,
        returning: false,
      })
    }
    const usang = ada.filter((d) => !luar.has(d.url)).map((d) => d.id)
    if (usang.length) await payload.db.deleteMany({ collection: 'tautan-luar', where: { id: { in: usang } }, req })
    for (const [url, sumber] of luar) {
      const id = idUrl.get(url)
      if (id) await payload.db.updateOne({ collection: 'tautan-luar', id, data: { sumber }, req, returning: false })
      else await payload.db.create({ collection: 'tautan-luar', data: { url, status: 'belum', berikutnya: sekarang.toISOString(), sumber }, req, returning: false })
    }
    if (transaksi) await payload.db.commitTransaction(transaksi)
  } catch (galat) {
    if (transaksi) await payload.db.rollbackTransaction(transaksi)
    throw galat
  }
}

const angka = new Intl.NumberFormat('id-ID')

/**
 * Pindai tautan harian (spesifikasi §8 "Tingkat situs"): tautan internal dicocokkan dengan database
 * (dokumen terbit, halaman indeks, redirect), halaman yatim dihitung dari tautan masuk di isi dokumen
 * terbit, menu, dan beranda, dan URL situs lain dikumpulkan untuk `periksaTautanLuar`. Daftar otomatis
 * (rubrik, tulisan terbaru, artikel terkait otomatis, sitemap) tidak dihitung sebagai tautan masuk karena
 * isinya berganti setiap ada tulisan baru.
 */
export async function pindaiTautan(payload: Payload, urlSitus: string, sekarang: Date): Promise<{ hasil: HasilTugas; pesan: string }> {
  const { tautan, sasaran, peta } = await kumpulkan(payload, urlSitus)
  const { temuan, luar } = nilaiTautan(tautan, peta, sasaran)
  await simpan(payload, temuan, luar, sekarang)
  const jumlah = (jenis: Temuan['jenis']) => angka.format(temuan.filter((t) => t.jenis === jenis).length)
  return {
    hasil: 'berhasil',
    pesan:
      `${angka.format(tautan.length)} tautan dipindai: ${jumlah('rusak')} tautan internal rusak, ${jumlah('dialihkan')} ke alamat lama, ` +
      `${jumlah('yatim')} halaman yatim, ${angka.format(luar.size)} URL situs lain.`,
  }
}

/**
 * Memeriksa tautan ke situs lain yang jatuh tempo, paling banyak 10 per jalan cron dan 5 bersamaan, supaya
 * satu jalan tetap singkat. Hasil dan jadwal cek berikutnya (seminggu, atau besok bila belum pasti)
 * disimpan per URL. Mengembalikan jumlah URL yang dicek.
 */
export async function periksaTautanLuar(payload: Payload, adapter: AdapterPantau, sekarang: Date): Promise<number> {
  const { docs } = await payload.find({
    collection: 'tautan-luar',
    where: { berikutnya: { less_than_equal: sekarang.toISOString() } },
    sort: ['berikutnya', 'id'],
    limit: BATAS_TAUTAN_PER_JALAN,
    depth: 0,
    pagination: false,
    select: { url: true },
  })
  for (let i = 0; i < docs.length; i += TAUTAN_BERSAMAAN) {
    await Promise.all(
      docs.slice(i, i + TAUTAN_BERSAMAAN).map(async (d) => {
        const hasil = statusTautan(await adapter.periksaTautan(d.url))
        await payload.update({
          collection: 'tautan-luar',
          where: { id: { equals: d.id } },
          data: { ...hasil, dicekPada: sekarang.toISOString(), berikutnya: jadwalCekTautan(hasil.status, sekarang).toISOString() },
          depth: 0,
        })
      }),
    )
  }
  return docs.length
}
