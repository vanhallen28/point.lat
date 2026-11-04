import { describe, expect, it } from 'vitest'

import type { Artikel } from '@/payload-types'
import { gabungTerkait, kartuArtikel, mediaTampil, pilarRingkas, tandaiSubjudul, tanggalIndonesia, waktuBaca } from '@/modules/konten/artikel'

import { h, isiLexical, kalimatPanjang, p } from './seo-contoh'

const pilar = { id: 1, nama: 'Belajar', slug: 'belajar', warna: 'kuning' as const, deskripsi: 'Belajar.', createdAt: '', updatedAt: '' }

const artikel = (id: number, extra: Partial<Artikel> = {}) =>
  ({ id, judul: `Artikel ${id}`, slug: `artikel-${id}`, tipe: 'panduan', pilar, intinya: [{ poin: `Poin ${id}.` }], _status: 'published', ...extra }) as Artikel

describe('tandaiSubjudul', () => {
  it('id dari teks heading, unik, tidak bentrok dengan id halaman; H1 di isi menjadi H2', () => {
    const { isi, daftarIsi } = tandaiSubjudul(
      isiLexical([h('h2', 'Cara Hitung PPh 21'), p('Teks.'), h('h3', 'Contoh'), h('h2', 'Cara hitung PPh 21'), h('h1', 'Sumber'), h('h2', '')]),
    )
    expect(daftarIsi).toEqual([
      { id: 'cara-hitung-pph-21', teks: 'Cara Hitung PPh 21' },
      { id: 'cara-hitung-pph-21-2', teks: 'Cara hitung PPh 21' },
      { id: 'sumber-2', teks: 'Sumber' },
    ])
    const node = isi?.root?.children as { tag?: string; idJangkar?: string }[]
    expect(node.map((n) => n.idJangkar)).toEqual(['cara-hitung-pph-21', undefined, 'contoh', 'cara-hitung-pph-21-2', 'sumber-2', 'bagian'])
    expect(node[4].tag).toBe('h2')
  })

  it('isi kosong tetap aman', () => {
    expect(tandaiSubjudul(null)).toEqual({ isi: null, daftarIsi: [] })
  })
})

describe('waktuBaca', () => {
  it('200 kata per menit, dibulatkan ke atas, minimal satu menit', () => {
    expect(waktuBaca(isiLexical([p('Pendek.')]))).toBe(1)
    expect(waktuBaca(isiLexical([p(kalimatPanjang(200))]))).toBe(1)
    expect(waktuBaca(isiLexical([p(kalimatPanjang(150)), h('h2', 'Dua kata'), p(kalimatPanjang(49))]))).toBe(2)
  })
})

describe('tanggalIndonesia', () => {
  it('memakai zona WIB dan nama bulan Indonesia', () => {
    expect(tanggalIndonesia('2026-11-03T18:30:00.000Z')).toBe('4 November 2026')
    expect(tanggalIndonesia('2026-08-17T01:00:00.000Z')).toBe('17 Agustus 2026')
  })
})

describe('pemetaan relasi', () => {
  it('pilar dan media yang belum di-populate atau tidak lengkap menjadi null', () => {
    expect(pilarRingkas(1)).toBeNull()
    expect(pilarRingkas({ ...pilar, disclaimer: '  ' })).toEqual({ nama: 'Belajar', slug: 'belajar', href: '/belajar', warna: 'kuning', disclaimer: null })
    expect(mediaTampil({ id: 1, publicId: 'point/gambar/a', width: null, height: 600 } as never)).toBeNull()
    expect(mediaTampil({ id: 1, publicId: 'point/gambar/a', width: 800, height: 600, alt: null } as never)).toEqual({
      publicId: 'point/gambar/a',
      jenis: 'gambar',
      alt: '',
      width: 800,
      height: 600,
      caption: null,
      kredit: null,
    })
  })

  it('kartu glosarium memakai path /glosarium', () => {
    expect(kartuArtikel(artikel(5, { tipe: 'glosarium', slug: 'ptkp' }))?.href).toBe('/glosarium/ptkp')
    expect(kartuArtikel(artikel(6, { slug: null }))).toBeNull()
  })
})

describe('gabungTerkait', () => {
  it('pilihan editor yang terbit dulu, lalu sepilar, tanpa diri sendiri dan duplikat, maksimal tiga', () => {
    const manual = [artikel(2, { _status: 'draft' }), artikel(3), 4, artikel(1)]
    const sepilar = [artikel(3), artikel(7), artikel(8), artikel(9)]
    expect(gabungTerkait(1, manual, sepilar).map((k) => k.id)).toEqual([3, 7, 8])
  })
})
