import { describe, expect, it } from 'vitest'

import { durasiIso, jsonLd, remahRoti, serialisasiJsonLd, tipeSchemaArtikel } from '@/modules/seo/jsonld'

import { artikel, penulis, pilarUang, situs } from './seo-contoh'

const GAMBAR = 'https://res.cloudinary.com/demo/image/upload'

describe('jsonLd artikel', () => {
  it('graf lengkap: Organization, WebSite, Article, BreadcrumbList', () => {
    expect(jsonLd({ jenis: 'artikel', doc: artikel }, situs)).toEqual({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': 'https://point.lat/#organisasi',
          name: 'point.lat',
          url: 'https://point.lat/',
          logo: { '@type': 'ImageObject', url: `${GAMBAR}/f_auto,q_auto/point/gambar/logo`, width: 512, height: 512 },
          sameAs: ['https://www.instagram.com/point.lat'],
        },
        {
          '@type': 'WebSite',
          '@id': 'https://point.lat/#situs',
          url: 'https://point.lat/',
          name: 'point.',
          alternateName: 'point.lat',
          inLanguage: 'id-ID',
          publisher: { '@id': 'https://point.lat/#organisasi' },
        },
        {
          '@type': 'Article',
          '@id': 'https://point.lat/cara-hitung-gaji-bersih#artikel',
          headline: 'Cara hitung gaji bersih',
          description:
            'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS. Begini cara menghitungnya langkah demi langkah, lengkap dengan contoh untuk karyawan tetap...',
          url: 'https://point.lat/cara-hitung-gaji-bersih',
          mainEntityOfPage: 'https://point.lat/cara-hitung-gaji-bersih',
          inLanguage: 'id-ID',
          image: [
            `${GAMBAR}/c_fill,g_auto,ar_16:9/c_limit,w_1200,f_auto,q_auto/point/gambar/slip-gaji-1a2b3c4d`,
            `${GAMBAR}/c_fill,g_auto,ar_4:3/c_limit,w_1200,f_auto,q_auto/point/gambar/slip-gaji-1a2b3c4d`,
            `${GAMBAR}/c_fill,g_auto,ar_1:1/c_limit,w_1200,f_auto,q_auto/point/gambar/slip-gaji-1a2b3c4d`,
          ],
          datePublished: '2026-11-02T03:00:00.000Z',
          dateModified: '2026-11-02T03:00:00.000Z',
          author: [
            {
              '@type': 'Person',
              '@id': 'https://point.lat/penulis/rani-wulandari#orang',
              name: 'Rani Wulandari',
              url: 'https://point.lat/penulis/rani-wulandari',
            },
          ],
          publisher: { '@id': 'https://point.lat/#organisasi' },
          isPartOf: { '@id': 'https://point.lat/#situs' },
          articleSection: 'Uang & Karier',
        },
        {
          '@type': 'BreadcrumbList',
          '@id': 'https://point.lat/cara-hitung-gaji-bersih#remah',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Beranda', item: 'https://point.lat/' },
            { '@type': 'ListItem', position: 2, name: 'Uang & Karier', item: 'https://point.lat/uang-karier' },
            { '@type': 'ListItem', position: 3, name: 'Pajak', item: 'https://point.lat/uang-karier/pajak' },
            { '@type': 'ListItem', position: 4, name: 'Cara hitung gaji bersih', item: 'https://point.lat/cara-hitung-gaji-bersih' },
          ],
        },
      ],
    })
  })

  it('explainer otomatis NewsArticle; editor bisa memaksa tipe schema', () => {
    expect(tipeSchemaArtikel({ tipe: 'explainer', seo: { tipeSchema: 'otomatis' } })).toBe('NewsArticle')
    expect(tipeSchemaArtikel({ tipe: 'panduan', seo: null })).toBe('Article')
    expect(tipeSchemaArtikel({ tipe: 'explainer', seo: { tipeSchema: 'Article' } })).toBe('Article')
    expect(tipeSchemaArtikel({ tipe: 'daftar', seo: { tipeSchema: 'NewsArticle' } })).toBe('NewsArticle')
  })

  it('dateModified memakai diperbaruiBesar', () => {
    const graf = jsonLd({ jenis: 'artikel', doc: { ...artikel, diperbaruiBesar: '2026-11-04T01:00:00.000Z' } }, situs)['@graph']
    expect(graf[2]).toMatchObject({ datePublished: '2026-11-02T03:00:00.000Z', dateModified: '2026-11-04T01:00:00.000Z' })
  })

  it('tidak membuat FAQPage atau HowTo', () => {
    const tipe = jsonLd({ jenis: 'artikel', doc: artikel }, situs)['@graph'].map((n) => n['@type'])
    expect(tipe).not.toContain('FAQPage')
    expect(tipe).not.toContain('HowTo')
  })
})

describe('jsonLd jenis lain', () => {
  it('tools: WebApplication gratis tanpa rating palsu', () => {
    const graf = jsonLd(
      { jenis: 'tools', doc: { nama: 'Kalkulator BMI', slug: 'bmi', toolId: 'bmi-kalori', ringkasan: 'Hitung BMI.', pilar: pilarUang } },
      situs,
    )['@graph']
    expect(graf[2]).toEqual({
      '@type': 'WebApplication',
      '@id': 'https://point.lat/tools/bmi#aplikasi',
      name: 'Kalkulator BMI',
      url: 'https://point.lat/tools/bmi',
      description: 'Hitung BMI.',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Semua',
      browserRequirements: 'Membutuhkan JavaScript',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: 0 },
      inLanguage: 'id-ID',
      publisher: { '@id': 'https://point.lat/#organisasi' },
    })
    expect(graf[3]['itemListElement']).toHaveLength(3)
  })

  it('video: VideoObject dengan poster, durasi ISO 8601, dan MP4', () => {
    const graf = jsonLd(
      {
        jenis: 'video',
        doc: {
          judul: 'PPh 21 dalam 45 detik',
          slug: 'pph-21',
          transkrip: 'PPh 21 dipotong pemberi kerja.',
          durasiDetik: 45,
          file: { publicId: 'point/video/pph-21-aa11bb22', jenis: 'video', durasi: 44.8 },
          pilar: pilarUang,
          createdAt: '2026-11-01T02:00:00.000Z',
        },
      },
      situs,
    )['@graph']
    expect(graf[2]).toEqual({
      '@type': 'VideoObject',
      '@id': 'https://point.lat/video/pph-21#video',
      name: 'PPh 21 dalam 45 detik',
      description: 'PPh 21 dipotong pemberi kerja.',
      thumbnailUrl: ['https://res.cloudinary.com/demo/video/upload/so_auto/q_auto/point/video/pph-21-aa11bb22.jpg'],
      uploadDate: '2026-11-01T02:00:00.000Z',
      duration: 'PT45S',
      contentUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto/point/video/pph-21-aa11bb22.mp4',
      transcript: 'PPh 21 dipotong pemberi kerja.',
      inLanguage: 'id-ID',
      publisher: { '@id': 'https://point.lat/#organisasi' },
    })
  })

  it('penulis: ProfilePage dengan Person', () => {
    const graf = jsonLd({ jenis: 'penulis', doc: penulis }, situs)['@graph']
    expect(graf[2]).toEqual({
      '@type': 'ProfilePage',
      '@id': 'https://point.lat/penulis/rani-wulandari',
      url: 'https://point.lat/penulis/rani-wulandari',
      inLanguage: 'id-ID',
      mainEntity: {
        '@type': 'Person',
        '@id': 'https://point.lat/penulis/rani-wulandari#orang',
        name: 'Rani Wulandari',
        url: 'https://point.lat/penulis/rani-wulandari',
        description: 'Menulis soal pajak dan gaji.',
        knowsAbout: ['Pajak penghasilan'],
        sameAs: ['https://www.linkedin.com/in/rani'],
        worksFor: { '@id': 'https://point.lat/#organisasi' },
      },
    })
  })

  it('beranda hanya Organization dan WebSite; logo opsional', () => {
    const graf = jsonLd({ jenis: 'beranda' }, { ...situs, organisasi: null })['@graph']
    expect(graf.map((n) => n['@type'])).toEqual(['Organization', 'WebSite'])
    expect(graf[0]).toEqual({ '@type': 'Organization', '@id': 'https://point.lat/#organisasi', name: 'point.', url: 'https://point.lat/' })
  })
})

describe('remahRoti', () => {
  it('glosarium, halaman, dan statis', () => {
    expect(remahRoti({ jenis: 'artikel', doc: { ...artikel, tipe: 'glosarium', slug: 'ptkp', judul: 'PTKP' } })).toEqual([
      { nama: 'Beranda', path: '/' },
      { nama: 'Glosarium', path: '/glosarium' },
      { nama: 'PTKP', path: '/glosarium/ptkp' },
    ])
    expect(remahRoti({ jenis: 'halaman', doc: { judul: 'Tentang', slug: 'tentang' } })).toEqual([
      { nama: 'Beranda', path: '/' },
      { nama: 'Tentang', path: '/tentang' },
    ])
    expect(remahRoti({ jenis: 'beranda' })).toEqual([])
  })

  it('artikel tanpa subkategori: beranda, pilar, artikel', () => {
    expect(remahRoti({ jenis: 'artikel', doc: { ...artikel, subkategori: null } }).map((r) => r.path)).toEqual([
      '/',
      '/uang-karier',
      '/cara-hitung-gaji-bersih',
    ])
  })
})

describe('utilitas', () => {
  it('durasiIso', () => {
    expect(durasiIso(45)).toBe('PT45S')
    expect(durasiIso(65)).toBe('PT1M5S')
    expect(durasiIso(120)).toBe('PT2M')
    expect(durasiIso(0)).toBe('PT0S')
  })

  it('serialisasiJsonLd meng-escape < supaya tidak bisa menutup tag script', () => {
    const teks = serialisasiJsonLd({
      '@context': 'https://schema.org',
      '@graph': [{ '@type': 'Thing', name: '</script><script>alert(1)</script>' }],
    })
    expect(teks).not.toContain('</script>')
    expect(JSON.parse(teks)['@graph'][0].name).toBe('</script><script>alert(1)</script>')
  })
})
