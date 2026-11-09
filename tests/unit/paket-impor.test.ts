import { describe, expect, it } from 'vitest'

import { alasanLewatiTools, rencanaMozaik } from '@/modules/paket/impor'

describe('impor paket: tools', () => {
  const dibuat = '2026-11-07T10:00:00.000Z'
  const doc = { _status: 'draft' as const, penjelasan: { lama: true }, createdAt: dibuat, updatedAt: dibuat }

  it('draf dari seed yang belum disentuh boleh diperbarui', () => {
    expect(alasanLewatiTools(doc, { baru: true }, false)).toBeNull()
    // Simpan otomatis beberapa detik setelah dibuat masih dianggap belum disunting.
    expect(alasanLewatiTools({ ...doc, updatedAt: '2026-11-07T10:00:30.000Z' }, { baru: true }, false)).toBeNull()
  })

  it('tidak menimpa tools yang belum ada, pernah terbit, sudah sama, atau sudah disunting', () => {
    expect(alasanLewatiTools(undefined, {}, false)).toMatch(/Belum ada/)
    expect(alasanLewatiTools({ ...doc, _status: 'published' }, { baru: true }, false)).toMatch(/pernah terbit/)
    expect(alasanLewatiTools(doc, { baru: true }, true)).toMatch(/pernah terbit/)
    expect(alasanLewatiTools(doc, { lama: true }, false)).toMatch(/sudah terbaru/)
    expect(alasanLewatiTools({ ...doc, updatedAt: '2026-11-08T09:00:00.000Z' }, { baru: true }, false)).toMatch(/sunting/)
  })
})

describe('impor paket: mozaik beranda', () => {
  const hero = { blockType: 'heroBeranda' }
  const populer = { blockType: 'palingDibaca' }

  it('mozaik baru tepat setelah hero, atau paling atas bila tidak ada hero', () => {
    const r = rencanaMozaik([hero, populer], 'published', [3, 4])
    expect(r).toEqual({
      jenis: 'tambah',
      tataLetak: [hero, { blockType: 'mozaikPilihan', judul: 'Pilihan redaksi', artikel: [3, 4], tampilkanTools: true }, populer],
    })
    const tanpaHero = rencanaMozaik([populer], 'published', [3])
    expect(tanpaHero.jenis === 'tambah' && tanpaHero.tataLetak[0].blockType).toBe('mozaikPilihan')
  })

  it('tidak mengubah beranda yang sudah punya mozaik, punya perubahan belum terbit, atau tanpa artikel pilihan', () => {
    expect(rencanaMozaik([hero, { blockType: 'mozaikPilihan' }], 'published', [3])).toEqual({ jenis: 'sudah-ada' })
    expect(rencanaMozaik([hero], 'draft', [3])).toEqual({ jenis: 'dilewati' })
    expect(rencanaMozaik([hero], 'published', [])).toEqual({ jenis: 'dilewati' })
  })
})
