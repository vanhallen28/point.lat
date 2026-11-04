import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TidakDitemukan } from '@/components/galat/TidakDitemukan'
import { rapikanLog404 } from '@/modules/konten/log404'
import { pathDariSegmen, tujuanRedirect } from '@/modules/konten/redirect'
import { metadataTidakDitemukan } from '@/modules/seo/metadata'

describe('tujuanRedirect', () => {
  it('hanya 301 dengan tujuan yang bukan dirinya sendiri', () => {
    expect(tujuanRedirect('/lama', { kode: '301', ke: ' /baru ' })).toBe('/baru')
    expect(tujuanRedirect('/lama', { kode: '301', ke: 'https://contoh.id/x' })).toBe('https://contoh.id/x')
    expect(tujuanRedirect('/lama', { kode: '410', ke: null })).toBeNull()
    expect(tujuanRedirect('/lama', { kode: '301', ke: '' })).toBeNull()
    expect(tujuanRedirect('/lama', { kode: '301', ke: '/lama' })).toBeNull()
    expect(tujuanRedirect('/lama', null)).toBeNull()
  })

  it('path dari segmen catch-all', () => {
    expect(pathDariSegmen(['uang-karier', 'pajak'])).toBe('/uang-karier/pajak')
  })
})

describe('rapikanLog404', () => {
  it('membuang query dan fragmen; referer hanya URL http(s)', () => {
    expect(rapikanLog404({ path: '/jalan-buntu?utm=wa#atas', referer: 'https://www.google.com/' })).toEqual({
      path: '/jalan-buntu',
      referer: 'https://www.google.com/',
    })
    expect(rapikanLog404({ path: '/x', referer: 'javascript:alert(1)' })).toEqual({ path: '/x', referer: null })
    expect(rapikanLog404({ path: '/x', referer: 12 })).toEqual({ path: '/x', referer: null })
  })

  it('menolak yang bukan path situs, terlalu panjang, berkarakter kontrol, atau rute sistem', () => {
    for (const path of ['jalan', '//evil.com', `/${'a'.repeat(300)}`, '/a\nb', '/api/x', '/admin/collections', '/_next/static/x.js', 12]) {
      expect(rapikanLog404({ path }), String(path)).toBeNull()
    }
    expect(rapikanLog404(null)).toBeNull()
  })
})

describe('halaman 404', () => {
  it('metadata: judul dengan pola situs, tanpa canonical', () => {
    const meta = metadataTidakDitemukan({ urlSitus: 'https://point.lat', polaJudul: '%s · point.' })
    expect(meta.title).toEqual({ absolute: 'Halaman tidak ditemukan · point.' })
    expect(meta).not.toHaveProperty('alternates')
  })

  it('jalan kembali ke beranda dan tulisan terbaru', () => {
    const html = renderToStaticMarkup(
      h(TidakDitemukan, {
        terbaru: [{ id: 1, judul: 'Cara hitung THR', href: '/cara-hitung-thr', tipe: 'panduan', pilar: null, intinya: null }],
      }),
    )
    expect(html).toMatch(/<h1 class="[^"]*">Halaman ini tidak ada\.<\/h1>/)
    expect(html).toMatch(/<a class="[^"]*" href="\/">Kembali ke beranda/)
    expect(html).toContain('href="/cara-hitung-thr"')
    expect(renderToStaticMarkup(h(TidakDitemukan, { terbaru: [] }))).not.toContain('Tulisan terbaru')
  })
})
