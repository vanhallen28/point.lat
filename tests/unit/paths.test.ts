import { describe, expect, it } from 'vitest'

import { pathFor } from '@/lib/paths'

describe('pathFor', () => {
  it('artikel non-glosarium berada di tingkat atas', () => {
    expect(pathFor({ jenis: 'artikel', slug: 'cara-hitung-gaji-bersih', tipe: 'panduan' })).toBe(
      '/cara-hitung-gaji-bersih',
    )
    expect(pathFor({ jenis: 'artikel', slug: 'snbt-2027', tipe: 'explainer' })).toBe('/snbt-2027')
  })

  it('artikel glosarium berada di /glosarium', () => {
    expect(pathFor({ jenis: 'artikel', slug: 'ptkp', tipe: 'glosarium' })).toBe('/glosarium/ptkp')
  })

  it('pilar dan halaman berada di tingkat atas', () => {
    expect(pathFor({ jenis: 'pilar', slug: 'uang-karier' })).toBe('/uang-karier')
    expect(pathFor({ jenis: 'halaman', slug: 'tentang' })).toBe('/tentang')
  })

  it('subkategori berada di bawah pilarnya', () => {
    expect(pathFor({ jenis: 'subkategori', slug: 'pajak', pilarSlug: 'uang-karier' })).toBe(
      '/uang-karier/pajak',
    )
  })

  it('tools, video, dan penulis punya prefiks sendiri', () => {
    expect(pathFor({ jenis: 'tools', slug: 'gaji-bersih' })).toBe('/tools/gaji-bersih')
    expect(pathFor({ jenis: 'video', slug: 'pph-21' })).toBe('/video/pph-21')
    expect(pathFor({ jenis: 'penulis', slug: 'redaksi' })).toBe('/penulis/redaksi')
  })
})
