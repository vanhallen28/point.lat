import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'
import { ambilBeranda } from '@/modules/konten/data'

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
    await payload.updateGlobal({ slug: 'newsletter', data: { aktif: true, urlForm: 'https://contoh.kit.com/point', judul: 'Intinya, tiap Senin.' } })
    await payload.updateGlobal({
      slug: 'beranda',
      data: {
        tataLetak: [
          { blockType: 'heroBeranda', judul: 'Intinya dulu.', subjudul: 'Dijelaskan dari intinya.' },
          { blockType: 'mozaikPilihan', artikel: [pilihan.id, draf.id] },
          { blockType: 'palingDibaca', judul: 'Paling dibaca pekan ini', jumlah: 3 },
          { blockType: 'newsletterBlok' },
        ],
      },
    })

    const bagian = await ambilBeranda(payload)
    expect(bagian.map((b) => b.jenis)).toEqual(['hero', 'mozaik', 'terbaru'])
    const [, mozaik, terbaru] = bagian
    expect(mozaik.jenis === 'mozaik' && mozaik.artikel.map((k) => k.id)).toEqual([pilihan.id])
    expect(mozaik).toMatchObject({ tools: expect.any(Array) })
    expect(terbaru).toMatchObject({ judul: 'Tulisan terbaru', newsletter: { href: 'https://contoh.kit.com/point' } })
    expect(terbaru.jenis === 'terbaru' && terbaru.artikel[0].id).toBe(baru.id)
    expect(terbaru.jenis === 'terbaru' && terbaru.artikel.map((k) => k.id)).not.toContain(pilihan.id)
    await payload.updateGlobal({ slug: 'newsletter', data: { aktif: false } })
  })
})
