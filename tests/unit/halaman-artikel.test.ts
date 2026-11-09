import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { HalamanArtikel } from '@/components/artikel/HalamanArtikel'
import { RemahRoti } from '@/components/dasar/RemahRoti'
import type { DataArtikel } from '@/modules/konten/tipe'

import { artikel as dokumen, isiLexical, p, situs } from './seo-contoh'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => h('img', { src: props.src, alt: props.alt, width: props.width, height: props.height }),
}))

const pilar = { nama: 'Uang & Karier', slug: 'uang-karier', href: '/uang-karier', warna: 'hijau' as const, disclaimer: 'Bukan saran keuangan.' }

const data: DataArtikel = {
  id: 10,
  judul: 'Cara hitung gaji bersih',
  tipe: 'panduan',
  href: '/cara-hitung-gaji-bersih',
  deck: 'Gaji kotor dikurangi PPh 21 dan BPJS.',
  intinya: ['Poin satu.', 'Poin dua.'],
  terbit: '2026-11-01T02:00:00.000Z',
  diperbarui: '2026-11-03T18:30:00.000Z',
  waktuBaca: 7,
  pilar,
  penulis: { nama: 'Rani Wulandari', href: '/penulis/rani-wulandari', bio: 'Menulis soal pajak.', keahlian: ['Pajak'], foto: null },
  gambar: { publicId: 'point/gambar/slip', jenis: 'gambar', alt: 'Slip gaji', width: 1600, height: 900, caption: null, kredit: 'Foto: Redaksi' },
  isi: isiLexical([{ type: 'heading', tag: 'h2', idJangkar: 'komponen', version: 1, children: [{ type: 'text', text: 'Komponen', version: 1 }] }, p('Isi.')]),
  daftarIsi: [
    { id: 'komponen', teks: 'Komponen' },
    { id: 'cara', teks: 'Cara' },
    { id: 'contoh', teks: 'Contoh' },
  ],
  faq: [{ pertanyaan: 'Apakah THR kena pajak?', jawaban: 'Ya.' }],
  sumber: [{ judul: 'DJP', url: 'https://www.pajak.go.id/', penerbit: 'DJP', diaksesPada: null }],
  terkait: [{ id: 11, judul: 'Apa itu TER', href: '/apa-itu-ter', tipe: 'explainer', pilar, intinya: 'TER adalah tarif efektif.', gambar: null, terbit: null, penulis: null }],
  seo: dokumen,
}

const render = (artikel: DataArtikel) => renderToStaticMarkup(h(HalamanArtikel, { artikel, situs }))

describe('HalamanArtikel', () => {
  it('bagian tampil dengan urutan spesifikasi §4', () => {
    const html = render(data)
    const urutan = [
      'aria-label="Remah roti"',
      '>Uang &amp; Karier</span><span>Panduan</span>',
      '<h1',
      'Gaji kotor dikurangi PPh 21 dan BPJS.',
      'href="/penulis/rani-wulandari"',
      'Diperbarui <time dateTime="2026-11-03T18:30:00.000Z">4 November 2026</time>',
      '7 menit baca',
      'aria-labelledby="intinya"',
      'aria-labelledby="daftar-isi"',
      'alt="Slip gaji"',
      '<h2 id="komponen">Komponen</h2>',
      'Bukan saran keuangan.',
      'aria-labelledby="sumber"',
      'aria-labelledby="faq"',
      'aria-labelledby="terkait"',
      'aria-labelledby="penulis"',
    ]
    const posisi = urutan.map((teks) => html.indexOf(teks))
    expect(posisi.every((p) => p >= 0), urutan.filter((_, i) => posisi[i] < 0).join(' | ')).toBe(true)
    expect([...posisi].sort((a, b) => a - b)).toEqual(posisi)
  })

  it('JSON-LD Article dan BreadcrumbList dari modul SEO; kartu terkait berlatar pilar', () => {
    const html = render(data)
    const json = /<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)?.[1] ?? '{}'
    expect(JSON.parse(json)['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual(['Organization', 'WebSite', 'Article', 'BreadcrumbList'])
    expect(html).toMatch(/<a class="[^"]*" data-warna="hijau" href="\/apa-itu-ter">/)
  })

  it('tanpa daftar isi, disclaimer, sumber, FAQ, terkait, dan penulis bila datanya kosong', () => {
    const html = render({ ...data, daftarIsi: [], pilar: { ...pilar, disclaimer: null }, sumber: [], faq: [], terkait: [], penulis: null })
    for (const id of ['daftar-isi', 'sumber', 'faq', 'terkait', 'penulis']) expect(html).not.toContain(`aria-labelledby="${id}"`)
    expect(html).not.toContain('role="note"')
    expect(html).not.toContain('Oleh')
  })
})

describe('RemahRoti', () => {
  it('item terakhir adalah halaman ini; satu item saja tidak dirender', () => {
    const html = renderToStaticMarkup(
      h(RemahRoti, {
        remah: [
          { nama: 'Beranda', path: '/' },
          { nama: 'Glosarium', path: '/glosarium' },
          { nama: 'PTKP', path: '/glosarium/ptkp' },
        ],
      }),
    )
    expect(html).toContain('<a href="/">Beranda</a>')
    expect(html).toContain('<a href="/glosarium">Glosarium</a>')
    expect(html).toMatch(/<span aria-current="page" class="[^"]*">PTKP<\/span>/)
    expect(renderToStaticMarkup(h(RemahRoti, { remah: [{ nama: 'Beranda', path: '/' }] }))).toBe('')
  })
})
