import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'
import { ambilTerbaru, cariRedirect } from '@/modules/konten/data'
import { catat404 } from '@/modules/konten/log404'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload, unik } from './helpers'

describe('redirect dan log 404 untuk halaman publik', () => {
  let tag: string[] = []

  beforeAll(() => {
    pakaiPemicuRevalidasi((t) => tag.push(t))
  })

  afterAll(() => {
    pakaiPemicuRevalidasi(null)
  })

  it('slug artikel terbit berganti: path lama punya redirect 301 dan tag redirect direvalidasi', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const artikel = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    tag = []
    const slugBaru = unik('judul-baru')
    await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'published', slug: slugBaru } })
    expect(tag).toContain('redirect')
    expect(await cariRedirect(payload, `/${artikel.slug}`)).toEqual({ kode: '301', ke: `/${slugBaru}` })
    expect(await cariRedirect(payload, `/${unik('tidak-ada')}`)).toBeNull()
  })

  it('redirect 410 tetap terbaca dengan kodenya', async () => {
    const payload = await getTestPayload()
    const dari = `/${unik('dihapus')}`
    await payload.create({ collection: 'redirect', data: { dari, kode: '410' } })
    expect(await cariRedirect(payload, dari)).toEqual({ kode: '410', ke: null })
  })

  it('catat404 menambah hitungan per path dan menyimpan referer terakhir', async () => {
    const payload = await getTestPayload()
    const path = `/${unik('jalan-buntu')}`
    await catat404(payload, { path, referer: null }, new Date('2026-11-04T01:00:00.000Z'))
    await catat404(payload, { path, referer: 'https://www.google.com/' }, new Date('2026-11-04T02:00:00.000Z'))
    const { docs } = await payload.find({ collection: 'log-404', where: { path: { equals: path } } })
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({ jumlah: 2, terakhir: '2026-11-04T02:00:00.000Z', referer: 'https://www.google.com/' })
  })

  it('tulisan terbaru: artikel terbit selain glosarium, terbaru dulu', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const lama = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    const baru = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium' } })
    const kartu = await ambilTerbaru(payload, 2)
    expect(kartu.map((k) => k.id)).toEqual([baru.id, lama.id])
  })
})
