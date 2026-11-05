import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { adapterPalsu, pakaiAdapterIndexer } from '@/modules/indexer'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload, unik } from './helpers'

/**
 * Hook dokumen yang berjalan bersamaan. Payload menjalankan hook setiap dokumen dalam hapus dan update
 * massal secara paralel di satu transaksi, dan dua simpan terpisah bisa berjalan di dua transaksi
 * sekaligus. Kabar mereka berbagi baris sitemap (`sitemap /sitemap.xml`), jadi antrean harus
 * menggabungkannya tanpa galat unik yang membatalkan simpan.
 */
const palsu = adapterPalsu()

type Relasi = Awaited<ReturnType<typeof siapkanRelasiArtikel>>

function buatArtikel(payload: Payload, relasi: Relasi, judul: string, draf = false) {
  const data = { ...dataArtikelTerbit(relasi), judul: unik(judul) }
  return draf
    ? payload.create({ collection: 'artikel', draft: true, data: { ...data, _status: 'draft' } })
    : payload.create({ collection: 'artikel', data })
}

/** Baris sitemap yang sudah antre menutupi tabrakan, jadi antrean dikosongkan sebelum operasi yang diuji. */
async function kosongkanAntrean(payload: Payload) {
  await payload.delete({ collection: 'antrean-indexing', where: { id: { exists: true } } })
}

async function jumlahBarisSitemap(payload: Payload) {
  return (await payload.count({ collection: 'antrean-indexing', where: { langkah: { equals: 'sitemap' } } })).totalDocs
}

async function barisIndexNow(payload: Payload, daftarPath: string[]) {
  const { docs } = await payload.find({
    collection: 'antrean-indexing',
    where: { and: [{ langkah: { equals: 'indexnow' } }, { path: { in: daftarPath } }] },
    limit: 10,
    depth: 0,
  })
  return docs.map((d) => `${d.path} ${d.jenis}`).sort()
}

describe('kabar dari hook yang berjalan bersamaan', () => {
  beforeAll(() => {
    pakaiAdapterIndexer(palsu)
  })

  afterAll(() => {
    pakaiAdapterIndexer(null)
  })

  it('hapus massal dua artikel terbit: keduanya terhapus, satu baris sitemap, dan IndexNow untuk kedua path', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const a = await buatArtikel(payload, relasi, 'Hapus massal A')
    const b = await buatArtikel(payload, relasi, 'Hapus massal B')
    await kosongkanAntrean(payload)

    const hasil = await payload.delete({ collection: 'artikel', where: { id: { in: [a.id, b.id] } } })
    expect(hasil.errors).toEqual([])
    expect((await payload.find({ collection: 'artikel', where: { id: { in: [a.id, b.id] } }, depth: 0 })).docs).toEqual([])
    expect(await jumlahBarisSitemap(payload)).toBe(1)
    expect(await barisIndexNow(payload, [`/${a.slug}`, `/${b.slug}`])).toEqual([`/${a.slug} hapus`, `/${b.slug} hapus`].sort())
  })

  it('terbit massal dua draf: keduanya terbit dan antrean berisi kabar keduanya', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const a = await buatArtikel(payload, relasi, 'Terbit massal A', true)
    const b = await buatArtikel(payload, relasi, 'Terbit massal B', true)
    await kosongkanAntrean(payload)

    const hasil = await payload.update({ collection: 'artikel', where: { id: { in: [a.id, b.id] } }, data: { _status: 'published' } })
    expect(hasil.errors).toEqual([])
    for (const { id } of [a, b]) expect((await payload.findByID({ collection: 'artikel', id, depth: 0 }))._status).toBe('published')
    expect(await jumlahBarisSitemap(payload)).toBe(1)
    expect(await barisIndexNow(payload, [`/${a.slug}`, `/${b.slug}`])).toEqual([`/${a.slug} terbit`, `/${b.slug} terbit`].sort())
  })

  it('dua penerbitan terpisah yang berjalan bersamaan (dua transaksi): keduanya berhasil tanpa galat unik', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const a = await buatArtikel(payload, relasi, 'Terbit bersamaan A', true)
    const b = await buatArtikel(payload, relasi, 'Terbit bersamaan B', true)
    await kosongkanAntrean(payload)

    // Tanpa `req` bersama: setiap `update` membuka transaksinya sendiri.
    await Promise.all([a, b].map(({ id }) => payload.update({ collection: 'artikel', id, data: { _status: 'published' } })))
    for (const { id } of [a, b]) expect((await payload.findByID({ collection: 'artikel', id, depth: 0 }))._status).toBe('published')
    expect(await jumlahBarisSitemap(payload)).toBe(1)
    expect(await barisIndexNow(payload, [`/${a.slug}`, `/${b.slug}`])).toEqual([`/${a.slug} terbit`, `/${b.slug} terbit`].sort())
  })
})
