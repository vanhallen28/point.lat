import { describe, expect, it } from 'vitest'

import { nilaiTautan, PESAN_TEMUAN, type PetaSitus, type Sumber } from '@/modules/pantau/tautan'
import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
import { metadata } from '@/modules/seo/metadata'

import { penulis, pilarUang, situs } from './seo-contoh'

const pajak = { id: 7, nama: 'Pajak', slug: 'pajak', pilar: pilarUang }

describe('SEO halaman daftar berhalaman (rubrik dan profil penulis)', () => {
  it('halaman 1 tetap seperti sebelumnya; halaman berikutnya punya judul, canonical, dan URL Open Graph sendiri', () => {
    const satu = metadata({ jenis: 'pilar', doc: pilarUang, halaman: 1 }, situs)
    expect(satu.title).toEqual({ absolute: 'Uang & Karier · point.' })
    expect(satu.alternates).toEqual({ canonical: 'https://point.lat/uang-karier' })

    const dua = metadata({ jenis: 'pilar', doc: pilarUang, halaman: 2 }, situs)
    expect(dua.title).toEqual({ absolute: 'Uang & Karier, halaman 2 · point.' })
    expect(dua.alternates).toEqual({ canonical: 'https://point.lat/uang-karier/halaman/2' })
    expect(dua.openGraph).toMatchObject({ url: 'https://point.lat/uang-karier/halaman/2', title: 'Uang & Karier, halaman 2 · point.' })
    // Deskripsi sama dengan halaman 1 dan tetap diindeks (panduan paginasi Google).
    expect(dua.description).toBe(satu.description)
    expect(dua.robots).toEqual({ index: true, follow: true, 'max-image-preview': 'large' })
  })

  it('canonical isian editor dan judul SEO: canonical hanya untuk halaman 1, judul SEO diberi akhiran halaman', () => {
    const doc = { ...pajak, seo: { canonical: 'https://point.lat/pajak-lama', judulSEO: 'Pajak penghasilan untuk karyawan' } }
    expect(metadata({ jenis: 'subkategori', doc }, situs).alternates).toEqual({ canonical: 'https://point.lat/pajak-lama' })
    const tiga = metadata({ jenis: 'subkategori', doc, halaman: 3 }, situs)
    expect(tiga.alternates).toEqual({ canonical: 'https://point.lat/uang-karier/pajak/halaman/3' })
    expect(tiga.title).toEqual({ absolute: 'Pajak penghasilan untuk karyawan, halaman 3' })
  })

  it('remah roti dan BreadcrumbList menambah "Halaman N" setelah daftarnya', () => {
    expect(remahRoti({ jenis: 'subkategori', doc: pajak, halaman: 2 })).toEqual([
      { nama: 'Beranda', path: '/' },
      { nama: 'Uang & Karier', path: '/uang-karier' },
      { nama: 'Pajak', path: '/uang-karier/pajak' },
      { nama: 'Halaman 2', path: '/uang-karier/pajak/halaman/2' },
    ])
    const remah = jsonLd({ jenis: 'pilar', doc: pilarUang, halaman: 2 }, situs)['@graph'].find((n) => n['@type'] === 'BreadcrumbList')
    expect(remah?.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Beranda', item: 'https://point.lat/' },
      { '@type': 'ListItem', position: 2, name: 'Uang & Karier', item: 'https://point.lat/uang-karier' },
      { '@type': 'ListItem', position: 3, name: 'Halaman 2', item: 'https://point.lat/uang-karier/halaman/2' },
    ])
  })

  it('profil penulis: ProfilePage hanya di halaman 1, halaman berikutnya hanya daftar tulisan', () => {
    const jenis = (halaman: number) => jsonLd({ jenis: 'penulis', doc: penulis, halaman }, situs)['@graph'].map((n) => n['@type'])
    expect(jenis(1)).toEqual(['Organization', 'WebSite', 'ProfilePage', 'BreadcrumbList'])
    expect(jenis(2)).toEqual(['Organization', 'WebSite', 'BreadcrumbList'])
    expect(metadata({ jenis: 'penulis', doc: penulis, halaman: 2 }, situs).alternates).toEqual({ canonical: 'https://point.lat/penulis/rani-wulandari/halaman/2' })
  })
})

describe('pindai tautan: tautan ke halaman bernomor sebuah daftar', () => {
  const a: Sumber = { koleksi: 'artikel', id: 1, judul: 'Artikel 1', path: '/a' }
  const peta: PetaSitus = { path: new Set(['/', '/a', '/belajar', '/penulis/redaksi']), dokumen: new Map([['artikel:1', '/a']]), redirect: new Map() }

  it('ada bila daftarnya ada (nomornya tidak diperiksa); daftar yang tidak ada atau nomor tidak sah tetap rusak', () => {
    const tujuan = ['/belajar/halaman/2', '/belajar/halaman/40', '/penulis/redaksi/halaman/3', '/tidak-ada/halaman/2', '/belajar/halaman/02', '/halaman/2']
    const { temuan } = nilaiTautan(
      tujuan.map((path) => ({ sumber: a, tujuan: { jenis: 'internal' as const, path } })),
      peta,
      [],
    )
    expect(temuan).toEqual(
      ['/tidak-ada/halaman/2', '/belajar/halaman/02', '/halaman/2'].map((t) => ({ jenis: 'rusak', tujuan: t, pesan: PESAN_TEMUAN.tidakAda, sumber: a })),
    )
  })
})
