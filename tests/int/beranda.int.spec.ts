import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'
import { ambilBeranda, ambilPopuler } from '@/modules/konten/data'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload } from './helpers'

describe('beranda dari global', () => {
  let tag: string[] = []

  beforeAll(() => {
    pakaiPemicuRevalidasi((t) => tag.push(t))
  })

  afterAll(() => {
    pakaiPemicuRevalidasi(null)
  })

  it('global beranda merevalidasi beranda dan sitemap; global newsletter merevalidasi beranda', async () => {
    const payload = await getTestPayload()
    tag = []
    await payload.updateGlobal({ slug: 'beranda', data: { tataLetak: [{ blockType: 'heroBeranda', judul: 'Intinya dulu.' }] } })
    expect(tag).toEqual(['beranda', 'sitemap'])
    tag = []
    await payload.updateGlobal({ slug: 'newsletter', data: { aktif: false } })
    expect(tag).toEqual(['beranda'])
  })

  it('blok editor dengan artikel terbit, tulisan terbaru di luar mozaik, dan newsletter di sampingnya', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const pilihan = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    const draf = await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft' } })
    const baru = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    await payload.updateGlobal({ slug: 'newsletter', data: { cara: 'penyedia', urlForm: 'https://contoh.kit.com/point', judul: 'Intinya, tiap Senin.' } })
    await payload.updateGlobal({ slug: 'fitur', data: { newsletter: true } })
    await payload.updateGlobal({
      slug: 'beranda',
      data: {
        tataLetak: [
          { blockType: 'heroBeranda', judul: 'Intinya dulu.', subjudul: 'Dijelaskan dari intinya.' },
          { blockType: 'mozaikPilihan', artikel: [pilihan.id, draf.id] },
          { blockType: 'palingDibaca', judul: 'Paling dicari pekan ini', jumlah: 3 },
          { blockType: 'newsletterBlok' },
        ],
      },
    })

    const bagian = await ambilBeranda(payload)
    expect(bagian.map((b) => b.jenis)).toEqual(['hero', 'mozaik', 'terbaru'])
    const [, mozaik, terbaru] = bagian
    expect(mozaik.jenis === 'mozaik' && mozaik.artikel.map((k) => k.id)).toEqual([pilihan.id])
    expect(mozaik).toMatchObject({ tools: expect.any(Array) })
    expect(terbaru).toMatchObject({ judul: 'Tulisan terbaru', newsletter: { cara: 'penyedia', href: 'https://contoh.kit.com/point' } })
    expect(terbaru.jenis === 'terbaru' && terbaru.artikel[0].id).toBe(baru.id)
    expect(terbaru.jenis === 'terbaru' && terbaru.artikel.map((k) => k.id)).not.toContain(pilihan.id)
    await payload.updateGlobal({ slug: 'newsletter', data: { cara: 'form' } })
    await payload.updateGlobal({ slug: 'fitur', data: { newsletter: false } })
  })

  it('baris rubrik pilar pilihan: tulisan terbit pilarnya di luar mozaik, kartu membawa gambar, tanggal, dan penulis', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const pilihan = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    const lain = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    await payload.updateGlobal({
      slug: 'beranda',
      data: {
        tataLetak: [
          { blockType: 'heroBeranda', judul: 'Intinya dulu.' },
          { blockType: 'mozaikPilihan', artikel: [pilihan.id] },
          { blockType: 'barisRubrik', pilar: [relasi.pilar.id], jumlah: 4 },
        ],
      },
    })
    const bagian = await ambilBeranda(payload)
    const rubrik = bagian.find((b) => b.jenis === 'rubrik')
    expect(rubrik?.jenis === 'rubrik' && rubrik.baris.map((b) => b.pilar.slug)).toEqual([relasi.pilar.slug])
    const kartu = rubrik?.jenis === 'rubrik' ? rubrik.baris[0].artikel : []
    expect(kartu.map((k) => k.id)).toEqual([lain.id])
    expect(kartu[0]).toMatchObject({ gambar: { publicId: expect.any(String), width: 1600 }, terbit: expect.any(String), penulis: relasi.penulis.nama })
  })

  it('paling dibaca pekan ini: artikel terbit dengan klik 7 hari terbanyak, tanpa draf, glosarium, dan path lain', async () => {
    const payload = await getTestPayload()
    await payload.delete({ collection: 'analitik-halaman', where: { id: { exists: true } } })
    const relasi = await siapkanRelasiArtikel(payload)
    const a = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    const b = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    const c = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    const draf = await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft' } })
    const istilah = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium' } })
    const klik = (path: string, klik7: number, klik28 = klik7) =>
      payload.create({ collection: 'analitik-halaman', data: { path, klik7, impresi7: 100, klik28, impresi28: 400, ctr28: 0.1, posisi28: 5, sampai: '2026-11-02' } })
    await klik(`/${b.slug}`, 30)
    await klik(`/${a.slug}`, 12, 50)
    await klik(`/${c.slug}`, 12, 20)
    await klik(`/${draf.slug}`, 90)
    await klik(`/glosarium/${istilah.slug}`, 80)
    await klik('/', 70)
    await klik('/tools/gaji-bersih', 60)
    await klik(`/${a.slug}-lama`, 0, 9)

    expect((await ambilPopuler(payload, 5)).map((k) => k.id)).toEqual([b.id, a.id, c.id])
    expect((await ambilPopuler(payload, 2)).map((k) => k.id)).toEqual([b.id, a.id])

    await payload.updateGlobal({ slug: 'beranda', data: { tataLetak: [{ blockType: 'palingDibaca', judul: 'Paling dicari pekan ini', jumlah: 3 }] } })
    const [, populer] = await ambilBeranda(payload)
    expect(populer).toMatchObject({ jenis: 'terbaru', judul: 'Paling dicari pekan ini' })
    expect(populer.jenis === 'terbaru' && populer.artikel.map((k) => k.id)).toEqual([b.id, a.id, c.id])
    await payload.delete({ collection: 'analitik-halaman', where: { id: { exists: true } } })
  })
})
