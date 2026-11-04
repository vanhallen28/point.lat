import { describe, expect, it } from 'vitest'

import { metadata } from '@/modules/seo/metadata'

import { artikel, gambarUtama, penulis, pilarUang, situs } from './seo-contoh'

const OG_HIJAU = 'https://res.cloudinary.com/demo/image/upload/w_1200,h_630,c_scale,e_colorize:100,co_rgb:1F7A4D'

describe('metadata artikel', () => {
  const m = metadata({ jenis: 'artikel', doc: artikel }, situs)

  it('judul memakai pola judul situs', () => {
    expect(m.title).toEqual({ absolute: 'Cara hitung gaji bersih · point.' })
  })

  it('meta description jatuh ke deck yang dipotong di batas kata (maks 160 karakter)', () => {
    expect(m.description).toBe(
      'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS. Begini cara menghitungnya langkah demi langkah, lengkap dengan contoh untuk karyawan tetap...',
    )
    expect((m.description as string).length).toBeLessThanOrEqual(160)
  })

  it('canonical absolut dari urlSitus dan pathFor', () => {
    expect(m.alternates).toEqual({ canonical: 'https://point.lat/cara-hitung-gaji-bersih' })
    expect(m.metadataBase?.toString()).toBe('https://point.lat/')
  })

  it('robots index dengan max-image-preview:large', () => {
    expect(m.robots).toEqual({ index: true, follow: true, 'max-image-preview': 'large' })
  })

  it('Open Graph artikel dengan gambar otomatis warna pilar', () => {
    expect(m.openGraph).toMatchObject({
      type: 'article',
      title: 'Cara hitung gaji bersih · point.',
      url: 'https://point.lat/cara-hitung-gaji-bersih',
      siteName: 'point.',
      locale: 'id_ID',
      publishedTime: '2026-11-02T03:00:00.000Z',
      modifiedTime: '2026-11-02T03:00:00.000Z',
      authors: ['https://point.lat/penulis/rani-wulandari'],
      section: 'Uang & Karier',
    })
    const [gambar] = (m.openGraph as { images: { url: string; width: number; height: number; alt: string }[] }).images
    expect(gambar.url.startsWith(OG_HIJAU)).toBe(true)
    expect(gambar).toMatchObject({ width: 1200, height: 630, alt: 'Cara hitung gaji bersih' })
  })

  it('kartu X summary_large_image memakai gambar yang sama', () => {
    expect(m.twitter).toMatchObject({ card: 'summary_large_image', title: 'Cara hitung gaji bersih · point.' })
    expect((m.twitter as { images: string[] }).images[0].startsWith(OG_HIJAU)).toBe(true)
  })
})

describe('metadata dengan isian SEO editor', () => {
  const doc = {
    ...artikel,
    tipe: 'glosarium' as const,
    slug: 'ptkp',
    diperbaruiBesar: '2026-11-03T05:00:00.000Z',
    seo: {
      judulSEO: 'PTKP 2026: arti, besaran, dan cara pakainya',
      metaDeskripsi: 'Penghasilan Tidak Kena Pajak.',
      canonical: 'https://contoh.id/ptkp',
      noindex: true,
      gambarOG: gambarUtama,
    },
  }
  const m = metadata({ jenis: 'artikel', doc }, situs)

  it('judul SEO dipakai apa adanya tanpa pola', () => {
    expect(m.title).toEqual({ absolute: 'PTKP 2026: arti, besaran, dan cara pakainya' })
  })

  it('meta, canonical, dan noindex dari editor', () => {
    expect(m.description).toBe('Penghasilan Tidak Kena Pajak.')
    expect(m.alternates).toEqual({ canonical: 'https://contoh.id/ptkp' })
    expect(m.robots).toEqual({ index: false, follow: true })
  })

  it('gambar OG unggahan memakai preset og Cloudinary', () => {
    expect((m.openGraph as { images: unknown[] }).images[0]).toEqual({
      url: 'https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1200,h_630/f_auto,q_auto/point/gambar/slip-gaji-1a2b3c4d',
      width: 1200,
      height: 630,
      alt: 'Slip gaji karyawan',
    })
    expect(m.openGraph).toMatchObject({ modifiedTime: '2026-11-03T05:00:00.000Z' })
  })

  it('canonical glosarium dari pathFor bila editor tidak mengisi', () => {
    const tanpa = metadata({ jenis: 'artikel', doc: { ...doc, seo: {} } }, situs)
    expect(tanpa.alternates).toEqual({ canonical: 'https://point.lat/glosarium/ptkp' })
  })
})

describe('metadata jenis lain', () => {
  it('pilar: deskripsi pilar, path tingkat atas, warna pilar sendiri', () => {
    const m = metadata({ jenis: 'pilar', doc: { ...pilarUang, warna: 'kuning', nama: 'Belajar', slug: 'belajar' } }, situs)
    expect(m.title).toEqual({ absolute: 'Belajar · point.' })
    expect(m.description).toBe('Gaji, pajak, tabungan, utang, dan karier.')
    expect(m.alternates).toEqual({ canonical: 'https://point.lat/belajar' })
    expect((m.openGraph as { images: { url: string }[] }).images[0].url).toContain('co_rgb:F2C230/')
  })

  it('subkategori berada di bawah pilarnya', () => {
    const m = metadata({ jenis: 'subkategori', doc: { nama: 'Pajak', slug: 'pajak', pilar: pilarUang } }, situs)
    expect(m.alternates).toEqual({ canonical: 'https://point.lat/uang-karier/pajak' })
    expect(m.description).toBe('Gaji, pajak, tabungan, utang, dan karier.')
  })

  it('tools memakai ringkasan sebagai meta default', () => {
    const m = metadata(
      { jenis: 'tools', doc: { nama: 'Kalkulator Gaji Bersih', slug: 'gaji-bersih', toolId: 'gaji-bersih', ringkasan: 'Hitung gaji bersih setelah PPh 21 dan BPJS.', pilar: pilarUang } },
      situs,
    )
    expect(m.alternates).toEqual({ canonical: 'https://point.lat/tools/gaji-bersih' })
    expect(m.description).toBe('Hitung gaji bersih setelah PPh 21 dan BPJS.')
    expect(m.openGraph).toMatchObject({ type: 'website' })
  })

  it('penulis: Open Graph profile, gambar OG default situs bila ada', () => {
    const dengan = { ...situs, gambarOgDefault: gambarUtama }
    const m = metadata({ jenis: 'penulis', doc: penulis }, dengan)
    expect(m.openGraph).toMatchObject({ type: 'profile', url: 'https://point.lat/penulis/rani-wulandari' })
    expect((m.openGraph as { images: { url: string }[] }).images[0].url).toContain('/c_fill,g_auto,w_1200,h_630/')
  })

  it('video: poster unggahan memakai so_auto', () => {
    const m = metadata(
      {
        jenis: 'video',
        doc: {
          judul: 'PPh 21 dalam 45 detik',
          slug: 'pph-21',
          transkrip: 'Halo.',
          pilar: pilarUang,
          seo: { gambarOG: { publicId: 'point/video/pph-21-aa11bb22', jenis: 'video' } },
        },
      },
      situs,
    )
    expect(m.openGraph).toMatchObject({ type: 'video.other' })
    expect((m.openGraph as { images: { url: string }[] }).images[0].url).toBe(
      'https://res.cloudinary.com/demo/video/upload/so_auto/q_auto/point/video/pph-21-aa11bb22.jpg',
    )
  })

  it('beranda: judul default, meta default, RSS, dan kode verifikasi', () => {
    const m = metadata({ jenis: 'beranda' }, { ...situs, judulDefault: 'point. Intinya dulu.', verifikasi: { google: 'kode-google', bing: 'kode-bing' } })
    expect(m.title).toEqual({ absolute: 'point. Intinya dulu.' })
    expect(m.description).toBe(situs.metaDefault)
    expect(m.alternates).toEqual({
      canonical: 'https://point.lat/',
      types: { 'application/rss+xml': 'https://point.lat/feed.xml' },
    })
    expect(m.verification).toEqual({ google: 'kode-google', other: { 'msvalidate.01': 'kode-bing' } })
  })

  it('halaman statis tanpa dokumen, misal pencarian noindex', () => {
    const m = metadata({ jenis: 'statis', judul: 'Cari', path: '/cari', noindex: true }, situs)
    expect(m.title).toEqual({ absolute: 'Cari · point.' })
    expect(m.alternates).toEqual({ canonical: 'https://point.lat/cari' })
    expect(m.robots).toEqual({ index: false, follow: true })
    expect(m.description).toBe(situs.metaDefault)
  })
})
