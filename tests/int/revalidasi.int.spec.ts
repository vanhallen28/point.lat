import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload, unik } from './helpers'

let tag: string[] = []

describe('revalidasi tag saat konten berubah', () => {
  beforeAll(() => {
    pakaiPemicuRevalidasi((t) => tag.push(t))
  })

  afterAll(() => {
    pakaiPemicuRevalidasi(null)
  })

  beforeEach(() => {
    tag = []
  })

  it('terbit artikel merevalidasi artikel, pilarnya, beranda, dan sitemap', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    tag = []
    const artikel = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    expect(tag).toEqual(['artikel', `artikel:${artikel.id}`, `pilar:${relasi.pilar.slug}`, 'beranda', 'sitemap'])
  })

  it('menyimpan draf tidak merevalidasi; batal terbit dan hapus merevalidasi', async () => {
    const payload = await getTestPayload()
    const draf = await payload.create({ collection: 'artikel', draft: true, data: { judul: unik('Draf') } })
    expect(tag).toEqual([])

    const relasi = await siapkanRelasiArtikel(payload)
    const terbit = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    tag = []
    await payload.update({ collection: 'artikel', id: terbit.id, draft: true, data: { judul: `${terbit.judul} revisi` } })
    expect(tag).toEqual([])

    await payload.update({ collection: 'artikel', id: terbit.id, data: { _status: 'draft' } })
    expect(tag).toContain(`artikel:${terbit.id}`)
    expect(tag).toContain('sitemap')

    tag = []
    await payload.delete({ collection: 'artikel', id: draf.id })
    expect(tag).toContain(`artikel:${draf.id}`)
  })

  it('artikel pindah pilar merevalidasi pilar lama dan baru', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const artikel = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    const pilarBaru = await payload.create({ collection: 'pilar', data: { nama: unik('Tekno'), warna: 'oranye', deskripsi: 'Tekno.' } })
    tag = []
    await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'published', pilar: pilarBaru.id } })
    expect(tag).toEqual(expect.arrayContaining([`pilar:${relasi.pilar.slug}`, `pilar:${pilarBaru.slug}`]))
  })

  it('pilar ganti slug merevalidasi slug lama dan baru; penulis tidak menyentuh beranda', async () => {
    const payload = await getTestPayload()
    const pilar = await payload.create({ collection: 'pilar', data: { nama: unik('Sehat'), warna: 'koral', deskripsi: 'Sehat.' } })
    tag = []
    const slugBaru = unik('sehat-baru')
    await payload.update({ collection: 'pilar', id: pilar.id, data: { slug: slugBaru } })
    expect(tag).toEqual(['pilar', `pilar:${pilar.id}`, `pilar:${slugBaru}`, `pilar:${pilar.slug}`, 'beranda', 'sitemap'])

    tag = []
    const penulis = await payload.create({ collection: 'penulis', data: { nama: unik('Penulis'), bio: 'Bio.' } })
    expect(tag).toEqual(['penulis', `penulis:${penulis.id}`, 'sitemap'])
  })

  it('pengaturan SEO merevalidasi robots dan sitemap', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'pengaturan-seo', data: { robotsTambahan: 'User-agent: GPTBot\nDisallow: /' } })
    expect(tag).toEqual(['pengaturan-seo', 'sitemap'])
  })
})
