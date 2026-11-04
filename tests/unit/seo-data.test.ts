import { describe, expect, it } from 'vitest'

import { syaratNews, syaratSitemap, TAG_RUTE } from '@/modules/seo/data'

describe('query rute teknis', () => {
  it('koleksi dengan draf hanya mengambil versi terbit; semua menolak noindex', () => {
    expect(syaratSitemap('artikel')).toEqual({
      and: [{ 'seo.noindex': { not_equals: true } }, { _status: { equals: 'published' } }],
    })
    expect(syaratSitemap('pilar')).toEqual({ and: [{ 'seo.noindex': { not_equals: true } }] })
    expect(syaratSitemap('penulis')).toEqual({ and: [{ 'seo.noindex': { not_equals: true } }] })
  })

  it('news sitemap: 48 jam terakhir sampai sekarang', () => {
    expect(syaratNews(new Date('2026-11-04T03:00:00.000Z'))).toEqual({
      and: [
        { _status: { equals: 'published' } },
        { 'seo.noindex': { not_equals: true } },
        { terbitPada: { greater_than_equal: '2026-11-02T03:00:00.000Z' } },
        { terbitPada: { less_than_equal: '2026-11-04T03:00:00.000Z' } },
      ],
    })
  })

  it('rute sitemap dan RSS ikut tag sitemap; robots ikut pengaturan SEO', () => {
    expect(TAG_RUTE).toEqual({ sitemap: ['sitemap', 'pengaturan-seo'], robots: ['pengaturan-seo'] })
  })
})
