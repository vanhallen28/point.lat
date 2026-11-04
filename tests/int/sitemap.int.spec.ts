import { beforeAll, describe, expect, it } from 'vitest'

import { ambilEntriFeed, ambilEntriNews, ambilEntriSitemap, ambilIndexSitemap, ambilPengaturan } from '@/modules/seo/data'
import type { PengaturanSitus } from '@/modules/seo/tipe'
import { saringNews } from '@/modules/seo/xml'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload, unik } from './helpers'

let situs: PengaturanSitus
const url = (path: string) => new URL(path, situs.urlSitus).toString()

describe('data rute teknis dari Payload', () => {
  let terbit: { slug?: string | null; id: number }
  let glosarium: { slug?: string | null }
  let noindex: { slug?: string | null }
  let draf: { slug?: string | null }

  beforeAll(async () => {
    const payload = await getTestPayload()
    situs = await ambilPengaturan(payload)
    const relasi = await siapkanRelasiArtikel(payload)
    terbit = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    glosarium = await payload.create({
      collection: 'artikel',
      data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium', judul: unik('PTKP') },
    })
    noindex = await payload.create({
      collection: 'artikel',
      data: { ...dataArtikelTerbit(relasi), seo: { noindex: true } },
    })
    draf = await payload.create({ collection: 'artikel', draft: true, data: { judul: unik('Draf sitemap') } })
  })

  it('pengaturan SEO memakai nilai bawaan global', () => {
    expect(situs).toMatchObject({ namaSitus: 'point.', urlSitus: 'https://point.lat', polaJudul: '%s · point.' })
  })

  it('sitemap artikel: hanya terbit dan tidak noindex, glosarium di /glosarium', async () => {
    const payload = await getTestPayload()
    const entri = await ambilEntriSitemap(payload, 'artikel', situs)
    const loc = entri.map((e) => e.loc)
    expect(loc).toContain(url(`/${terbit.slug}`))
    expect(loc).toContain(url(`/glosarium/${glosarium.slug}`))
    expect(loc).not.toContain(url(`/${noindex.slug}`))
    expect(loc).not.toContain(url(`/${draf.slug}`))
    expect(entri.find((e) => e.loc === url(`/${terbit.slug}`))?.lastmod).toBeTruthy()
  })

  it('perubahan besar menggeser lastmod; simpan biasa tidak', async () => {
    const payload = await getTestPayload()
    const sebelum = (await ambilEntriSitemap(payload, 'artikel', situs)).find((e) => e.loc === url(`/${terbit.slug}`))
    await payload.update({ collection: 'artikel', id: terbit.id, data: { _status: 'published', deck: 'Deck baru.' } })
    const biasa = (await ambilEntriSitemap(payload, 'artikel', situs)).find((e) => e.loc === url(`/${terbit.slug}`))
    expect(biasa?.lastmod).toBe(sebelum?.lastmod)

    await payload.update({ collection: 'artikel', id: terbit.id, data: { _status: 'published', perubahanBesar: true } })
    const besar = (await ambilEntriSitemap(payload, 'artikel', situs)).find((e) => e.loc === url(`/${terbit.slug}`))
    expect(new Date(besar?.lastmod as string).getTime()).toBeGreaterThan(new Date(sebelum?.lastmod as string).getTime())
  })

  it('draf yang ditulis di atas versi terbit tidak menghapus URL dari sitemap', async () => {
    const payload = await getTestPayload()
    await payload.update({ collection: 'artikel', id: terbit.id, draft: true, data: { judul: 'Revisi belum terbit' } })
    const loc = (await ambilEntriSitemap(payload, 'artikel', situs)).map((e) => e.loc)
    expect(loc).toContain(url(`/${terbit.slug}`))
  })

  it('sitemap index mencantumkan enam jenis', async () => {
    const payload = await getTestPayload()
    const index = await ambilIndexSitemap(payload, situs)
    expect(index.map((e) => e.loc)).toEqual(
      ['artikel', 'pilar', 'tools', 'video', 'penulis', 'halaman'].map((j) => url(`/sitemap/${j}.xml`)),
    )
    expect(index[0].lastmod).toBeTruthy()
  })

  it('halaman draf dari seed tidak masuk sitemap halaman', async () => {
    const payload = await getTestPayload()
    const halaman = await payload.create({ collection: 'halaman', draft: true, data: { judul: unik('Draf halaman') } })
    const loc = (await ambilEntriSitemap(payload, 'halaman', situs)).map((e) => e.loc)
    expect(loc).not.toContain(url(`/${halaman.slug}`))
  })

  it('news sitemap dan RSS memuat artikel baru', async () => {
    const payload = await getTestPayload()
    const sekarang = new Date()
    const news = saringNews(await ambilEntriNews(payload, situs, sekarang), sekarang)
    expect(news.map((e) => e.loc)).toContain(url(`/${terbit.slug}`))
    expect(news.map((e) => e.loc)).not.toContain(url(`/${noindex.slug}`))

    const feed = await ambilEntriFeed(payload, situs)
    const item = feed.find((e) => e.link === url(`/glosarium/${glosarium.slug}`))
    expect(item?.penulis).toBeTruthy()
    expect(item?.kategori).toBeTruthy()
  })
})
