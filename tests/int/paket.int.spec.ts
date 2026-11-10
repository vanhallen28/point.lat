import type { PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import {
  ambilKunci,
  bacaSampul,
  endpointImporPaket,
  endpointStatusPaket,
  imporPaket,
  lepasKunci,
  PAKET_AWAL,
  sedangBerjalan,
  type ArtikelPaket,
} from '@/modules/paket'
import { BATAS_JALAN_MS } from '@/modules/paket/kunci'

import { getTestPayload, pesanGalat, unik } from './helpers'

/** Penulis "Redaksi point." (slug `redaksi`) yang dipakai impor; database tes belum tentu sudah di-seed. */
async function siapkanPenulis() {
  const payload = await getTestPayload()
  const { totalDocs } = await payload.count({ collection: 'penulis', where: { slug: { equals: 'redaksi' } } })
  if (totalDocs === 0) await payload.create({ collection: 'penulis', data: { nama: 'Redaksi point.', slug: 'redaksi', bio: 'Tim redaksi.' } })
}

/**
 * Dua artikel paket dengan slug, pilar, dan subkategori unik per run, supaya tes tidak bergantung pada isi
 * database tes. Isinya saling menautkan dan menyematkan kalkulator.
 */
async function paketUji(): Promise<{ paket: ArtikelPaket[]; pilarSlug: string }> {
  const payload = await getTestPayload()
  const pilarSlug = unik('pilar-paket')
  await payload.create({ collection: 'pilar', data: { nama: pilarSlug, slug: pilarSlug, warna: 'hijau', deskripsi: 'Pilar uji paket.' } })
  const sub = { slug: unik('sub-paket'), nama: 'Sub paket', deskripsi: 'Subkategori uji.' }
  const [a, b] = PAKET_AWAL
  const slugA = unik('paket-a')
  const slugB = unik('paket-b')
  const isi = (lain: string) => `## Bagian satu\n\nLihat [artikel lain](/${lain}) dan [kalkulator](/tools/gaji-bersih).\n\n[[tool:gaji-bersih]]`
  return {
    pilarSlug,
    paket: [
      { ...a, slug: slugA, pilar: pilarSlug, subkategori: sub, isi: isi(slugB), terkait: [slugB] },
      { ...b, slug: slugB, pilar: pilarSlug, subkategori: sub, isi: isi(slugA), terkait: [slugA] },
    ],
  }
}

describe('impor paket konten', () => {
  it('membuat draf lengkap dengan sampul, subkategori, tautan internal, dan tanda draf AI; impor ulang tidak menggandakan', async () => {
    const payload = await getTestPayload()
    await siapkanPenulis()
    const { paket } = await paketUji()
    const [a, b] = paket

    const hasil = await imporPaket(payload, { bacaSampul, paket, mozaik: [], perbaruiTools: false })
    expect(hasil.galat).toEqual([])
    expect(hasil.artikel.dibuat).toEqual([a.slug, b.slug])
    expect(hasil.subkategori.dibuat).toEqual([a.subkategori!.slug])
    expect(hasil.beranda).toBe('dilewati')

    const { docs } = await payload.find({ collection: 'artikel', draft: true, where: { slug: { in: [a.slug, b.slug] } }, depth: 1, sort: 'slug' })
    expect(docs).toHaveLength(2)
    const docA = docs.find((d) => d.slug === a.slug)!
    const docB = docs.find((d) => d.slug === b.slug)!
    expect(docA).toMatchObject({ _status: 'draft', judul: a.judul, deck: a.deck, pakaiDrafAi: true, tipe: a.tipe })
    expect(docA.intinya?.map((i) => i.poin)).toEqual(a.intinya)
    expect(docA.faq).toHaveLength(a.faq.length)
    expect(docA.sumber?.map((s) => s.url)).toEqual(a.sumber.map((s) => s.url))
    expect(docA.seo).toMatchObject({ keyphrase: a.seo.keyphrase, judulSEO: a.seo.judulSEO, metaDeskripsi: a.seo.metaDeskripsi })
    expect(docA.gambarUtama).toMatchObject({ alt: a.sampul.alt, width: 1920 })
    expect(docA.subkategori).toMatchObject({ slug: a.subkategori!.slug })
    expect((docA.artikelTerkait ?? []).map((t) => (typeof t === 'object' ? t.id : t))).toEqual([docB.id])

    // Tautan internal ke artikel paket lain menunjuk dokumennya, bukan teks biasa (depth 0: relasi berupa id).
    const mentahA = await payload.findByID({ collection: 'artikel', id: docA.id, draft: true, depth: 0 })
    const teksJson = JSON.stringify(mentahA.isi)
    const tautan: unknown[] = []
    JSON.parse(teksJson, (_k, v) => (v?.type === 'link' && tautan.push(v.fields), v))
    expect(tautan).toContainEqual({ linkType: 'internal', newTab: false, doc: { relationTo: 'artikel', value: docB.id } })
    const { docs: tools } = await payload.find({ collection: 'tools', draft: true, where: { toolId: { equals: 'gaji-bersih' } }, limit: 1, depth: 0 })
    if (tools[0]) {
      expect(teksJson).toContain('"blockType":"embedTool"')
      expect((docA.toolsTerkait ?? []).map((t) => (typeof t === 'object' ? t.id : t))).toContain(tools[0].id)
    }

    const mediaSebelum = (await payload.count({ collection: 'media' })).totalDocs
    const ulang = await imporPaket(payload, { bacaSampul, paket, mozaik: [], perbaruiTools: false })
    expect(ulang.artikel).toEqual({ dibuat: [], sudahAda: [a.slug, b.slug] })
    expect(ulang.subkategori.dibuat).toEqual([])
    expect((await payload.count({ collection: 'media' })).totalDocs).toBe(mediaSebelum)
  })

  it('artikel paket tidak bisa terbit sebelum checklist review dicentang', async () => {
    const payload = await getTestPayload()
    await siapkanPenulis()
    const { paket } = await paketUji()
    await imporPaket(payload, { bacaSampul, paket: [paket[0]], mozaik: [], perbaruiTools: false })
    const { docs } = await payload.find({ collection: 'artikel', draft: true, where: { slug: { equals: paket[0].slug } }, limit: 1, depth: 0 })
    const galat = await pesanGalat(payload.update({ collection: 'artikel', id: docs[0].id, data: { _status: 'published' } }))
    expect(galat).toMatch(/reviewAi/)
  })

  it('setiap artikel paket lolos validasi koleksi saat diterbitkan setelah checklist review dicentang', async () => {
    const payload = await getTestPayload()
    await siapkanPenulis()
    const { paket } = await paketUji()
    const [contoh] = paket
    // Isi, FAQ, sumber, dan SEO asli setiap artikel paket, dengan slug dan pilar uji supaya tidak bergantung isi database.
    const semua = PAKET_AWAL.map((a) => ({ ...a, slug: unik(`terbit-${a.slug}`).slice(0, 80), pilar: contoh.pilar, subkategori: contoh.subkategori, terkait: [] }))
    const hasil = await imporPaket(payload, { bacaSampul, paket: semua, mozaik: [], perbaruiTools: false })
    expect(hasil.galat).toEqual([])
    const { docs } = await payload.find({ collection: 'artikel', draft: true, where: { slug: { in: semua.map((a) => a.slug) } }, limit: 20, depth: 0 })
    expect(docs).toHaveLength(PAKET_AWAL.length)
    const gagal: string[] = []
    for (const doc of docs) {
      try {
        await payload.update({
          collection: 'artikel',
          id: doc.id,
          data: { _status: 'published', reviewAi: { sumberDicek: true, angkaDicek: true, pengalamanDitambah: true } },
        })
      } catch (galat) {
        const rinci = (galat as { data?: { errors?: { path?: string; message: string }[] } }).data?.errors
        gagal.push(`${doc.slug}: ${rinci?.map((e) => `${e.path}: ${e.message}`).join(' | ') ?? (galat as Error).message}`)
      }
    }
    expect(gagal).toEqual([])
  })

  it('pilar atau penulis yang belum ada dicatat sebagai galat, tanpa dokumen setengah jadi', async () => {
    const payload = await getTestPayload()
    const { paket } = await paketUji()
    const tanpaPilar = paket.map((a) => ({ ...a, slug: unik('paket-tanpa-pilar'), pilar: unik('pilar-hilang') }))
    const hasil = await imporPaket(payload, { bacaSampul, paket: tanpaPilar, mozaik: [], perbaruiTools: false })
    expect(hasil.artikel.dibuat).toEqual([])
    expect(hasil.galat.join(' ')).toMatch(/Pilar pilar-hilang/)
  })
})

describe('kunci impor', () => {
  it('hanya satu impor berjalan; kunci kedaluwarsa setelah 15 menit dan bisa dilepas', async () => {
    const payload = await getTestPayload()
    await lepasKunci(payload)
    const t0 = new Date('2031-02-01T00:00:00.000Z')
    expect(await ambilKunci(payload, t0)).toBe(true)
    expect(await ambilKunci(payload, new Date(t0.getTime() + 60_000))).toBe(false)
    expect(await sedangBerjalan(payload, new Date(t0.getTime() + 60_000))).toBe(t0.toISOString())
    expect(await sedangBerjalan(payload, new Date(t0.getTime() + BATAS_JALAN_MS + 1))).toBeNull()
    expect(await ambilKunci(payload, new Date(t0.getTime() + BATAS_JALAN_MS + 1))).toBe(true)
    await lepasKunci(payload)
    expect(await ambilKunci(payload, t0)).toBe(true)
    await lepasKunci(payload)
  })
})

describe('endpoint paket', () => {
  async function panggil(endpoint: typeof endpointImporPaket, user: unknown, headers: Record<string, string> = {}) {
    const payload = await getTestPayload()
    const req = { payload, headers: new Headers(headers), user } as unknown as PayloadRequest
    return endpoint.handler(req)
  }

  it('hanya admin, dari situs sendiri; status berisi jumlah paket', async () => {
    expect((await panggil(endpointImporPaket, null)).status).toBe(401)
    expect((await panggil(endpointImporPaket, { id: 1, peran: 'editor' })).status).toBe(403)
    expect((await panggil(endpointImporPaket, { id: 1, peran: 'admin' }, { 'sec-fetch-site': 'cross-site' })).status).toBe(403)
    expect((await panggil(endpointStatusPaket, { id: 1, peran: 'editor' })).status).toBe(403)
    const status = await (await panggil(endpointStatusPaket, { id: 1, peran: 'admin' })).json()
    expect(status).toMatchObject({ nama: 'Paket konten awal', total: 12 })
    expect(status.slug).toHaveLength(12)
  })

  it('menolak impor kedua selama impor lain berjalan', async () => {
    const payload = await getTestPayload()
    await lepasKunci(payload)
    expect(await ambilKunci(payload)).toBe(true)
    const jawaban = await panggil(endpointImporPaket, { id: 1, peran: 'admin' })
    expect(jawaban.status).toBe(429)
    expect((await jawaban.json()).status).toBe('berjalan')
    await lepasKunci(payload)
  })
})
