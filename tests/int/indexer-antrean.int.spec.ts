import type { Payload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { kabari } from '@/modules/indexer'

import { getTestPayload, unik } from './helpers'

const SEKARANG = new Date('2026-11-05T03:00:00.000Z')

async function antrean(payload: Payload, path: string) {
  const { docs } = await payload.find({ collection: 'antrean-indexing', where: { path: { in: [path, '/sitemap.xml'] } }, depth: 0 })
  return docs
    .map((d) => ({ langkah: d.langkah, path: d.path, jenis: d.jenis, jadwal: d.jadwal, versi: d.versi }))
    .sort((a, b) => a.langkah.localeCompare(b.langkah))
}

async function status(payload: Payload, path: string) {
  return (await payload.find({ collection: 'status-indeks', where: { path: { equals: path } }, depth: 0 })).docs[0]
}

describe('kabari: antrean, log revalidasi, dan status indeks', () => {
  afterAll(async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { pakaiIndexingApi: false } } })
  })

  it('terbit: log revalidasi, antrean sitemap, IndexNow, dan cek status +6 jam, status Belum dicek', async () => {
    const payload = await getTestPayload()
    const path = `/${unik('gaji')}`
    await kabari(payload, [{ path, jenis: 'terbit' }], { sekarang: SEKARANG })

    const { docs: log } = await payload.find({ collection: 'log-indexing', where: { url: { equals: `https://point.lat${path}` } }, depth: 0 })
    expect(log.map((l) => [l.langkah, l.adapter, l.status, l.jenis, l.waktu])).toEqual([['revalidasi', 'next', 'berhasil', 'terbit', SEKARANG.toISOString()]])

    const baris = await antrean(payload, path)
    expect(baris.filter((b) => b.path === path)).toEqual([
      { langkah: 'cek-status', path, jenis: 'terbit', jadwal: '2026-11-05T09:00:00.000Z', versi: 0 },
      { langkah: 'indexnow', path, jenis: 'terbit', jadwal: SEKARANG.toISOString(), versi: 0 },
    ])
    expect(baris.filter((b) => b.langkah === 'sitemap')).toHaveLength(1)
    expect(await status(payload, path)).toMatchObject({ status: 'belum-dicek', cekBerikutnya: '2026-11-05T09:00:00.000Z' })
  })

  it('dedup: kabar berulang untuk path yang sama tergabung ke satu baris per langkah', async () => {
    const payload = await getTestPayload()
    const path = `/${unik('thr')}`
    await kabari(payload, [{ path, jenis: 'terbit' }], { sekarang: SEKARANG })
    await kabari(payload, [{ path, jenis: 'ubah-besar' }], { sekarang: new Date('2026-11-05T03:02:00.000Z') })
    const baris = (await antrean(payload, path)).filter((b) => b.path === path)
    expect(baris).toEqual([
      { langkah: 'cek-status', path, jenis: 'ubah-besar', jadwal: '2026-11-05T09:02:00.000Z', versi: 1 },
      { langkah: 'indexnow', path, jenis: 'ubah-besar', jadwal: SEKARANG.toISOString(), versi: 1 },
    ])
  })

  it('hapus: IndexNow tetap dikabari, cek status dan status indeks dibuang; Indexing API mengikuti saklar', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { pakaiIndexingApi: true } } })
    const path = `/${unik('kpr')}`
    await kabari(payload, [{ path, jenis: 'terbit' }], { sekarang: SEKARANG })
    expect((await antrean(payload, path)).map((b) => b.langkah)).toContain('indexing-api')

    await kabari(payload, [{ path, jenis: 'hapus' }], { sekarang: SEKARANG })
    const baris = (await antrean(payload, path)).filter((b) => b.path === path)
    expect(baris.map((b) => [b.langkah, b.jenis])).toEqual([
      ['indexing-api', 'hapus'],
      ['indexnow', 'hapus'],
    ])
    expect(await status(payload, path)).toBeUndefined()

    const pindah = `/${unik('lama')}`
    await kabari(payload, [{ path: pindah, jenis: 'terbit' }], { sekarang: SEKARANG })
    await kabari(payload, [{ path: pindah, jenis: 'pindah' }], { sekarang: SEKARANG })
    expect((await antrean(payload, pindah)).filter((b) => b.path === pindah).map((b) => [b.langkah, b.jenis])).toEqual([['indexnow', 'pindah']])
  })

  it('log, antrean, dan status indeks hanya untuk admin', async () => {
    const payload = await getTestPayload()
    // Pengguna pertama database selalu admin (tetapkanPeranAwal), jadi editor dibuat sesudah satu pengguna lain.
    const pengguna = () => ({ nama: 'Editor', email: `${unik('editor')}@point.lat`, password: 'rahasia-editor-123', peran: 'editor' as const })
    await payload.create({ collection: 'pengguna', data: pengguna() })
    const editor = await payload.create({ collection: 'pengguna', data: pengguna() })
    expect(editor.peran).toBe('editor')
    for (const collection of ['log-indexing', 'antrean-indexing', 'status-indeks'] as const) {
      await expect(payload.find({ collection, overrideAccess: false, user: { ...editor, collection: 'pengguna' } })).rejects.toThrow('Anda tidak diizinkan melakukan tindakan ini.')
      await expect(payload.find({ collection, overrideAccess: false })).rejects.toThrow('Anda tidak diizinkan melakukan tindakan ini.')
    }
  })
})
