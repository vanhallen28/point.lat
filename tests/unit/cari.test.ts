import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FormCari } from '@/components/cari/FormCari'
import { HalamanCari } from '@/components/cari/HalamanCari'
import { TidakDitemukan } from '@/components/galat/TidakDitemukan'
import { kataKueri, MAKS_KUERI, rapikanKueri, urutkanHasil } from '@/modules/konten/cari'
import type { KartuArtikel } from '@/modules/konten/tipe'

const kartu = (id: number, judul: string): KartuArtikel => ({ id, judul, href: `/artikel-${id}`, tipe: 'panduan', pilar: null, intinya: null })

describe('kueri pencarian', () => {
  it('nilai pertama, wildcard dibuang, spasi dirapikan, dan dipotong', () => {
    expect(rapikanKueri(['  gaji   bersih ', 'thr'])).toBe('gaji bersih')
    expect(rapikanKueri('100%_aman\\')).toBe('100 aman')
    expect(rapikanKueri(undefined)).toBe('')
    expect(rapikanKueri('a'.repeat(200))).toHaveLength(MAKS_KUERI)
  })

  it('kata unik huruf kecil, maksimal enam', () => {
    expect(kataKueri('Gaji gaji BERSIH')).toEqual(['gaji', 'bersih'])
    expect(kataKueri('a b c d e f g h')).toHaveLength(6)
    expect(kataKueri('')).toEqual([])
  })

  it('judul yang memuat semua kata naik ke atas, sisanya tetap urut', () => {
    const hasil = urutkanHasil('gaji bersih', [kartu(1, 'Apa itu TER'), kartu(2, 'Cara hitung gaji bersih'), kartu(3, 'Gaji pokok')])
    expect(hasil.map((k) => k.id)).toEqual([2, 1, 3])
  })
})

describe('FormCari dan HalamanCari', () => {
  const masukan = { jenis: 'statis', judul: 'Cari', path: '/cari', noindex: true } as const

  it('form GET ke /cari dengan label yang terlihat', () => {
    const html = renderToStaticMarkup(h(FormCari, { nilai: 'thr' }))
    expect(html).toMatch(/^<form role="search" class="[^"]*" action="\/cari" method="get">/)
    expect(html).toMatch(/<label class="[^"]*">Cari topik<input type="search" placeholder="misal: cara hitung THR" enterKeyHint="search" class="[^"]*" name="q" value="thr"\/><\/label>/)
    expect(html).toContain('<button type="submit" class="')
  })

  it('tanpa kueri: contoh topik; dengan hasil: jumlah dan kartu; tanpa hasil: saran', () => {
    expect(renderToStaticMarkup(h(HalamanCari, { kueri: '', hasil: [], masukan }))).toContain('misalnya gaji bersih, BPJS, atau beasiswa.')
    const ada = renderToStaticMarkup(h(HalamanCari, { kueri: 'gaji', hasil: [kartu(2, 'Cara hitung gaji bersih')], masukan }))
    expect(ada).toContain('<h2 id="hasil-cari" class="')
    expect(ada).toContain('1 tulisan untuk “gaji”')
    expect(ada).toContain('href="/artikel-2"')
    const kosong = renderToStaticMarkup(h(HalamanCari, { kueri: 'zzz', hasil: [], masukan }))
    expect(kosong).toContain('Tidak ada tulisan untuk “zzz”')
    expect(kosong).toContain('Coba kata yang lebih umum')
  })

  it('halaman 404 punya form cari', () => {
    expect(renderToStaticMarkup(h(TidakDitemukan, { daftar: { judul: 'Tulisan terbaru', artikel: [] } }))).toMatch(/<form role="search" class="[^"]*" action="\/cari" method="get">/)
  })
})
