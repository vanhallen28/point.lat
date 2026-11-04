import { afterEach, describe, expect, it } from 'vitest'

import { pakaiPemicuRevalidasi, revalidasi } from '@/hooks/revalidasiPublik'
import { TAG, tagRevalidasi } from '@/lib/tag'

describe('TAG', () => {
  it('nama tag tetap supaya halaman dan hook memakai string yang sama', () => {
    expect(TAG.dokumen('artikel', 12)).toBe('artikel:12')
    expect(TAG.pilar('uang-karier')).toBe('pilar:uang-karier')
    expect([TAG.beranda, TAG.sitemap, TAG.pengaturanSeo]).toEqual(['beranda', 'sitemap', 'pengaturan-seo'])
  })
})

describe('tagRevalidasi', () => {
  it('artikel: daftar, dokumen, pilar lama dan baru, beranda, sitemap', () => {
    expect(tagRevalidasi('artikel', { id: 12 }, ['uang-karier', 'tekno', 'uang-karier', null])).toEqual([
      'artikel',
      'artikel:12',
      'pilar:uang-karier',
      'pilar:tekno',
      'beranda',
      'sitemap',
    ])
  })

  it('koleksi yang tidak tampil di beranda tidak merevalidasi beranda', () => {
    expect(tagRevalidasi('penulis', { id: 3 })).toEqual(['penulis', 'penulis:3', 'sitemap'])
    expect(tagRevalidasi('halaman', { id: 4 })).toEqual(['halaman', 'halaman:4', 'sitemap'])
    expect(tagRevalidasi('tools', { id: 5 }, ['uang-karier'])).toEqual(['tools', 'tools:5', 'pilar:uang-karier', 'sitemap'])
  })
})

describe('revalidasi', () => {
  afterEach(() => {
    pakaiPemicuRevalidasi(null)
  })

  it('memanggil pemicu sekali per tag', () => {
    const terpanggil: string[] = []
    pakaiPemicuRevalidasi((tag) => terpanggil.push(tag))
    revalidasi(['sitemap', 'artikel:1', 'sitemap'])
    expect(terpanggil).toEqual(['sitemap', 'artikel:1'])
  })

  it('di luar server Next (tes, seed) pemicu bawaan tidak melempar galat', () => {
    expect(() => revalidasi(['sitemap'])).not.toThrow()
  })
})
