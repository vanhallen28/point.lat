import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { HalamanPenulis } from '@/components/penulis/HalamanPenulis'
import { susunPenulis } from '@/modules/konten/penulis'
import type { KartuArtikel } from '@/modules/konten/tipe'
import type { Penuli } from '@/payload-types'

import { situs } from './seo-contoh'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => h('img', { src: props.src, alt: props.alt, width: props.width, height: props.height }),
}))

const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }

const rani: Penuli = {
  id: 3,
  nama: 'Rani Wulandari',
  slug: 'rani-wulandari',
  bio: 'Menulis soal pajak dan gaji.',
  keahlian: ['Pajak penghasilan', 'BPJS'],
  foto: { id: 9, publicId: 'point/gambar/rani', jenis: 'gambar', alt: 'Rani', width: 800, height: 800, ...waktu },
  tautan: [
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/rani' },
    { label: 'Kosong', url: ' ' },
  ],
  ...waktu,
}

const kartu: KartuArtikel = {
  id: 10,
  judul: 'Cara hitung gaji bersih',
  href: '/cara-hitung-gaji-bersih',
  tipe: 'panduan',
  pilar: { nama: 'Uang & Karier', slug: 'uang-karier', href: '/uang-karier', warna: 'hijau', disclaimer: null },
  intinya: 'Gaji kotor dikurangi PPh 21 dan BPJS.',
}

describe('susunPenulis', () => {
  it('data ringkas, tautan berisi URL, tulisan, dan dokumen SEO', () => {
    const penulis = susunPenulis(rani, [kartu])
    expect(penulis).toMatchObject({ nama: 'Rani Wulandari', href: '/penulis/rani-wulandari', keahlian: ['Pajak penghasilan', 'BPJS'] })
    expect(penulis?.tautan).toEqual([{ label: 'LinkedIn', href: 'https://www.linkedin.com/in/rani' }])
    expect(penulis?.foto?.publicId).toBe('point/gambar/rani')
    expect(penulis?.seo.slug).toBe('rani-wulandari')
    expect(susunPenulis({ ...rani, slug: null }, [])).toBeNull()
  })
})

describe('HalamanPenulis', () => {
  it('H1 nama, bio, keahlian, tautan rel="me", tulisan, dan JSON-LD ProfilePage', () => {
    const html = renderToStaticMarkup(h(HalamanPenulis, { penulis: susunPenulis(rani, [kartu])!, situs }))
    expect(html).toMatch(/<h1 class="[^"]*">Rani Wulandari<\/h1>/)
    expect(html).toContain('Menulis soal pajak dan gaji.')
    expect(html).toContain('<ul aria-label="Keahlian"')
    expect(html).toMatch(/<a href="https:\/\/www\.linkedin\.com\/in\/rani" rel="me noopener">LinkedIn/)
    expect(html).toContain('<h2 id="tulisan-penulis" class="')
    expect(html).toContain('href="/cara-hitung-gaji-bersih"')
    expect(html).toContain('"@type":"ProfilePage"')
  })

  it('penulis tanpa tulisan terbit', () => {
    const html = renderToStaticMarkup(h(HalamanPenulis, { penulis: susunPenulis({ ...rani, foto: null, tautan: [] }, [])!, situs }))
    expect(html).toContain('Belum ada tulisan yang terbit. Tulisan baru tampil di sini setelah terbit.')
    expect(html).not.toContain('<img')
  })
})
