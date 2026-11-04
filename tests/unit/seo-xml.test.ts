import { describe, expect, it } from 'vitest'

import { entriFeed, entriNews, entriSitemap, lastmodDokumen, layakSitemap } from '@/modules/seo/sitemap'
import {
  escapeXml,
  isJenisSitemap,
  saringNews,
  tanggalW3c,
  teksRobots,
  terbaru,
  xmlFeed,
  xmlNewsSitemap,
  xmlSitemap,
  xmlSitemapIndex,
} from '@/modules/seo/xml'

import { artikel, pilarUang, situs } from './seo-contoh'

describe('utilitas XML', () => {
  it('escapeXml mengamankan karakter khusus dan membuang karakter kontrol', () => {
    expect(escapeXml(`Gaji & "THR" <2026> it's\u0007`)).toBe('Gaji &amp; &quot;THR&quot; &lt;2026&gt; it&apos;s')
  })

  it('tanggalW3c tanpa milidetik, null bila tidak valid', () => {
    expect(tanggalW3c('2026-11-02T03:00:00.123Z')).toBe('2026-11-02T03:00:00Z')
    expect(tanggalW3c('bukan tanggal')).toBeNull()
    expect(tanggalW3c(null)).toBeNull()
  })

  it('terbaru memilih tanggal paling akhir', () => {
    expect(terbaru(['2026-11-01T00:00:00Z', null, '2026-11-03T00:00:00Z', '2026-11-02T00:00:00Z'])).toBe('2026-11-03T00:00:00Z')
    expect(terbaru([])).toBeNull()
  })

  it('isJenisSitemap hanya menerima enam jenis', () => {
    expect(['artikel', 'pilar', 'tools', 'video', 'penulis', 'halaman'].every(isJenisSitemap)).toBe(true)
    expect(isJenisSitemap('subkategori')).toBe(false)
  })
})

describe('sitemap', () => {
  it('index menunjuk sitemap per jenis dengan lastmod', () => {
    expect(
      xmlSitemapIndex([
        { loc: 'https://point.lat/sitemap/artikel.xml', lastmod: '2026-11-02T03:00:00.000Z' },
        { loc: 'https://point.lat/sitemap/penulis.xml', lastmod: null },
      ]),
    ).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        '<sitemap><loc>https://point.lat/sitemap/artikel.xml</loc><lastmod>2026-11-02T03:00:00Z</lastmod></sitemap>' +
        '<sitemap><loc>https://point.lat/sitemap/penulis.xml</loc></sitemap></sitemapindex>\n',
    )
  })

  it('urlset tanpa changefreq dan priority', () => {
    const xml = xmlSitemap([{ loc: 'https://point.lat/a?x=1&y=2', lastmod: '2026-11-02T03:00:00Z' }])
    expect(xml).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
        '<url><loc>https://point.lat/a?x=1&amp;y=2</loc><lastmod>2026-11-02T03:00:00Z</lastmod></url></urlset>\n',
    )
    expect(xml).not.toMatch(/changefreq|priority/)
  })
})

describe('entri sitemap dari dokumen', () => {
  it('lastmod artikel = diperbaruiBesar ?? terbitPada; koleksi lain updatedAt', () => {
    expect(lastmodDokumen({ jenis: 'artikel', doc: artikel })).toBe('2026-11-02T03:00:00.000Z')
    expect(lastmodDokumen({ jenis: 'artikel', doc: { ...artikel, diperbaruiBesar: '2026-11-04T00:00:00.000Z' } })).toBe(
      '2026-11-04T00:00:00.000Z',
    )
    expect(lastmodDokumen({ jenis: 'pilar', doc: { ...pilarUang, updatedAt: '2026-11-01T00:00:00.000Z' } })).toBe(
      '2026-11-01T00:00:00.000Z',
    )
  })

  it('dokumen noindex, tanpa slug, atau ber-canonical ke URL lain tidak masuk sitemap', () => {
    expect(layakSitemap({ jenis: 'artikel', doc: artikel }, situs)).toBe(true)
    expect(layakSitemap({ jenis: 'artikel', doc: { ...artikel, seo: { noindex: true } } }, situs)).toBe(false)
    expect(layakSitemap({ jenis: 'artikel', doc: { ...artikel, slug: null } }, situs)).toBe(false)
    expect(layakSitemap({ jenis: 'artikel', doc: { ...artikel, seo: { canonical: 'https://contoh.id/asli' } } }, situs)).toBe(false)
    expect(
      layakSitemap({ jenis: 'artikel', doc: { ...artikel, seo: { canonical: 'https://point.lat/cara-hitung-gaji-bersih' } } }, situs),
    ).toBe(true)
  })

  it('entriSitemap memakai pathFor (glosarium di /glosarium)', () => {
    expect(
      entriSitemap(
        [
          { jenis: 'artikel', doc: artikel },
          { jenis: 'artikel', doc: { ...artikel, tipe: 'glosarium', slug: 'ptkp' } },
          { jenis: 'artikel', doc: { ...artikel, slug: 'rahasia', seo: { noindex: true } } },
        ],
        situs,
      ),
    ).toEqual([
      { loc: 'https://point.lat/cara-hitung-gaji-bersih', lastmod: '2026-11-02T03:00:00.000Z' },
      { loc: 'https://point.lat/glosarium/ptkp', lastmod: '2026-11-02T03:00:00.000Z' },
    ])
  })
})

describe('news sitemap', () => {
  const sekarang = new Date('2026-11-04T03:00:00Z')
  const entri = [
    { loc: 'https://point.lat/lama', judul: 'Lama', terbitPada: '2026-11-01T03:00:00Z' },
    { loc: 'https://point.lat/kemarin', judul: 'Kemarin', terbitPada: '2026-11-03T03:00:00Z' },
    { loc: 'https://point.lat/baru', judul: 'Baru & hangat', terbitPada: '2026-11-04T02:00:00Z' },
    { loc: 'https://point.lat/jadwal', judul: 'Terjadwal', terbitPada: '2026-11-05T03:00:00Z' },
  ]

  it('hanya artikel 48 jam terakhir, terbaru dulu, tanpa yang dijadwalkan', () => {
    expect(saringNews(entri, sekarang).map((e) => e.judul)).toEqual(['Baru & hangat', 'Kemarin'])
  })

  it('format Google News dengan bahasa id', () => {
    expect(xmlNewsSitemap(saringNews(entri, sekarang).slice(0, 1), { nama: 'point.' })).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
        'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"><url><loc>https://point.lat/baru</loc>' +
        '<news:news><news:publication><news:name>point.</news:name><news:language>id</news:language></news:publication>' +
        '<news:publication_date>2026-11-04T02:00:00Z</news:publication_date><news:title>Baru &amp; hangat</news:title>' +
        '</news:news></url></urlset>\n',
    )
  })

  it('entriNews dari dokumen: hanya yang punya terbitPada dan layak sitemap', () => {
    expect(
      entriNews([artikel, { ...artikel, slug: 'draf', terbitPada: null }, { ...artikel, slug: 'x', seo: { noindex: true } }], situs),
    ).toEqual([{ loc: 'https://point.lat/cara-hitung-gaji-bersih', judul: 'Cara hitung gaji bersih', terbitPada: '2026-11-02T03:00:00.000Z' }])
  })
})

describe('robots.txt', () => {
  it('aturan bawaan, tambahan CMS, lalu sitemap', () => {
    expect(teksRobots({ urlSitus: 'https://point.lat', tambahan: 'User-agent: GPTBot\r\nDisallow: /\n\nSitemap: https://lain.id/s.xml' })).toBe(
      [
        'User-agent: *',
        'Allow: /',
        'Allow: /api/media/file/',
        'Disallow: /admin',
        'Disallow: /api/',
        'Disallow: /cari',
        '',
        'User-agent: GPTBot',
        'Disallow: /',
        '',
        'Sitemap: https://point.lat/sitemap.xml',
        'Sitemap: https://point.lat/news-sitemap.xml',
        '',
      ].join('\n'),
    )
  })

  it('tanpa tambahan', () => {
    expect(teksRobots({ urlSitus: 'https://point.lat', tambahan: null })).toContain('Disallow: /cari\n\nSitemap: https://point.lat/sitemap.xml')
  })
})

describe('RSS', () => {
  it('kanal dan item dari artikel', () => {
    const entri = entriFeed([artikel], situs)
    expect(entri).toEqual([
      {
        judul: 'Cara hitung gaji bersih',
        link: 'https://point.lat/cara-hitung-gaji-bersih',
        deskripsi:
          'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS. Begini cara menghitungnya langkah demi langkah, lengkap dengan contoh untuk karyawan tetap...',
        terbitPada: '2026-11-02T03:00:00.000Z',
        penulis: 'Rani Wulandari',
        kategori: 'Uang & Karier',
      },
    ])
    expect(
      xmlFeed(
        { judul: 'point.', link: 'https://point.lat/', deskripsi: 'Intinya dulu.', urlFeed: 'https://point.lat/feed.xml' },
        [{ ...entri[0], deskripsi: 'Ringkas.' }],
      ),
    ).toBe(
      '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">' +
        '<channel><title>point.</title><link>https://point.lat/</link><description>Intinya dulu.</description><language>id-ID</language>' +
        '<atom:link href="https://point.lat/feed.xml" rel="self" type="application/rss+xml"/>' +
        '<lastBuildDate>Mon, 02 Nov 2026 03:00:00 GMT</lastBuildDate>' +
        '<item><title>Cara hitung gaji bersih</title><link>https://point.lat/cara-hitung-gaji-bersih</link>' +
        '<guid isPermaLink="true">https://point.lat/cara-hitung-gaji-bersih</guid><description>Ringkas.</description>' +
        '<pubDate>Mon, 02 Nov 2026 03:00:00 GMT</pubDate><dc:creator>Rani Wulandari</dc:creator><category>Uang &amp; Karier</category></item>' +
        '</channel></rss>\n',
    )
  })
})
