import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { Beranda } from '@/components/beranda/Beranda'
import type { BagianBeranda, KartuArtikel } from '@/modules/konten/tipe'

import { situs } from './seo-contoh'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => h('img', { src: props.src, alt: props.alt, width: props.width, height: props.height }),
}))

const pilar = { nama: 'Uang & Karier', slug: 'uang-karier', href: '/uang-karier', warna: 'hijau' as const, disclaimer: null }
const kartu = (id: number): KartuArtikel => ({ id, judul: `Artikel ${id}`, href: `/artikel-${id}`, tipe: 'panduan', pilar, intinya: `Intinya ${id}.` })
const newsletter = { judul: 'Intinya, tiap Senin.', teks: 'Lima tulisan terbaik pekan ini.', href: 'https://point.kit.com/intinya' }

const bagian: BagianBeranda[] = [
  { jenis: 'hero', id: 'h', judul: 'Intinya dulu.', subjudul: 'Dijelaskan dari intinya.', placeholder: 'misal: cara hitung THR' },
  {
    jenis: 'mozaik',
    id: 'm',
    judul: null,
    artikel: [1, 2, 3, 4].map(kartu),
    tools: [{ id: 9, nama: 'Gaji Bersih', href: '/tools/gaji-bersih', ringkasan: 'Hitung gaji bersih.' }],
  },
  { jenis: 'video', id: 'v', judul: 'Intinya dalam 45 detik', video: [{ id: 7, judul: 'Video 7', href: '/video/video-7', durasi: 45, pilar, poster: null }] },
  { jenis: 'terbaru', id: 't', judul: 'Tulisan terbaru', artikel: [kartu(5)], newsletter },
  { jenis: 'newsletter', id: 'n', newsletter },
]

const html = renderToStaticMarkup(h(Beranda, { bagian, situs }))

describe('Beranda', () => {
  it('hero: satu H1 dan form cari besar dengan placeholder dari CMS', () => {
    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toMatch(/<section aria-labelledby="judul-beranda" class="kontainer [^"]*"><h1 id="judul-beranda" class="[^"]*">Intinya dulu\.<\/h1>/)
    expect(html).toContain('placeholder="misal: cara hitung THR"')
    expect(html).toContain('"@type":"WebSite"')
  })

  it('mozaik: kartu besar, dua kartu samping, kartu sedang, dan kotak Hitung sendiri', () => {
    expect(html).toContain('<section aria-label="Pilihan redaksi"')
    expect(html.match(/class="[^"]*kartu[^"]* [^"]*besar[^"]*"/g)).toHaveLength(1)
    expect(html.match(/class="[^"]*kartu[^"]* [^"]*sedang[^"]*"/g)).toHaveLength(1)
    expect(html).toMatch(/<h2 class="[^"]*">Hitung sendiri<\/h2><a class="[^"]*" href="\/tools">Semua tools/)
    expect(html).toContain('<a href="/tools/gaji-bersih">Gaji Bersih</a>')
  })

  it('strip video gelap dengan tautan ke semua video', () => {
    expect(html).toMatch(/<section aria-labelledby="v-judul" class="[^"]*strip[^"]*">/)
    expect(html).toMatch(/<a class="[^"]*kartu[^"]* [^"]*gelap[^"]*" data-warna="hijau" href="\/video\/video-7">/)
    expect(html).toMatch(/href="\/video">Semua video/)
  })

  it('tulisan terbaru bertitik warna dengan nama pilar, newsletter di samping dan berdiri sendiri', () => {
    expect(html).toMatch(/<span class="[^"]*" data-warna="hijau" aria-hidden="true"><\/span><span class="[^"]*"><span class="[^"]*">Artikel 5<\/span><span class="[^"]*">Uang &amp; Karier<\/span>/)
    expect(html).toContain('<aside class="')
    expect(html.match(/href="https:\/\/point\.kit\.com\/intinya" rel="noopener"/g)).toHaveLength(2)
    expect(html).toContain('Langganan gratis<span class="sr"> (form penyedia newsletter)</span>')
  })
})
