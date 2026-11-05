import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload, pesanGalat, unik } from './helpers'

/**
 * Checklist review manusia untuk artikel yang memakai draf AI (spesifikasi §10): draf tetap bisa disimpan,
 * terbit ditolak sampai ketiga butir dicentang, termasuk terbit massal dari daftar artikel.
 */
type Relasi = Awaited<ReturnType<typeof siapkanRelasiArtikel>>

const LENGKAP = { sumberDicek: true, angkaDicek: true, pengalamanDitambah: true }
const PESAN = 'Centang sebelum terbit: artikel ini memakai draf AI.'

function draf(payload: Payload, relasi: Relasi, data: Record<string, unknown> = {}) {
  return payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft', pakaiDrafAi: true, ...data } })
}

describe('checklist review draf AI', () => {
  let relasi: Relasi

  beforeAll(async () => {
    relasi = await siapkanRelasiArtikel(await getTestPayload())
  })

  it('draf yang memakai draf AI tetap bisa disimpan tanpa checklist; terbit ditolak dengan pesan di butir yang belum dicentang', async () => {
    const payload = await getTestPayload()
    const doc = await draf(payload, relasi)
    expect(doc).toMatchObject({ _status: 'draft', pakaiDrafAi: true, reviewAi: { sumberDicek: false, angkaDicek: false, pengalamanDitambah: false } })
    expect(await pesanGalat(payload.update({ collection: 'artikel', id: doc.id, data: { _status: 'published', reviewAi: { sumberDicek: true } } }))).toBe(
      `reviewAi.angkaDicek: ${PESAN} | reviewAi.pengalamanDitambah: ${PESAN}`,
    )
    const terbit = await payload.update({ collection: 'artikel', id: doc.id, data: { _status: 'published', reviewAi: LENGKAP } })
    expect(terbit).toMatchObject({ _status: 'published', reviewAi: LENGKAP })
  })

  it('artikel tanpa draf AI terbit tanpa checklist', async () => {
    const payload = await getTestPayload()
    const doc = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    expect(doc).toMatchObject({ _status: 'published', pakaiDrafAi: false })
  })

  it('terbit massal dua draf AI ditolak per dokumen sampai checklist lengkap; hapus massal tetap bisa', async () => {
    const payload = await getTestPayload()
    const kelompok = unik('massal-ai')
    const a = await draf(payload, relasi, { deck: kelompok })
    const b = await draf(payload, relasi, { deck: kelompok })
    const where = { deck: { equals: kelompok } }

    const ditolak = await payload.update({ collection: 'artikel', where, data: { _status: 'published' } })
    expect(ditolak.docs).toEqual([])
    expect(ditolak.errors.map((e) => e.id).sort()).toEqual([a.id, b.id].sort())
    expect(ditolak.errors[0].message).toContain('Review sebelum terbit')

    const terbit = await payload.update({ collection: 'artikel', where, data: { _status: 'published', reviewAi: LENGKAP } })
    expect([terbit.docs.map((d) => d._status), terbit.errors]).toEqual([['published', 'published'], []])

    const dihapus = await payload.delete({ collection: 'artikel', where })
    expect([dihapus.docs.length, dihapus.errors]).toEqual([2, []])
  })
})
