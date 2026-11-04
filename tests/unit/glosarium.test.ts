import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { IndeksGlosarium } from '@/components/glosarium/IndeksGlosarium'
import { kelompokkanIstilah } from '@/modules/konten/glosarium'

import { situs } from './seo-contoh'

const istilah = (judul: string, slug: string | null, definisi?: string) => ({
  judul,
  slug,
  deck: `Deck ${judul}.`,
  intinya: definisi ? [{ poin: definisi }] : [],
})

describe('kelompokkanIstilah', () => {
  it('urut abjad tanpa beda huruf besar, dikelompokkan per huruf, selain huruf di akhir', () => {
    const kelompok = kelompokkanIstilah([
      istilah('TER', 'ter', 'TER adalah tarif efektif rata-rata.'),
      istilah('bunga majemuk', 'bunga-majemuk', 'Bunga atas bunga.'),
      istilah('3 in 1', '3-in-1'),
      istilah('BPJS', 'bpjs', 'Badan penyelenggara jaminan sosial.'),
      istilah('Tanpa slug', null, 'Dilewati.'),
    ])
    expect(kelompok.map((k) => [k.huruf, k.id, k.istilah.map((i) => i.judul)])).toEqual([
      ['B', 'huruf-b', ['BPJS', 'bunga majemuk']],
      ['T', 'huruf-t', ['TER']],
      ['#', 'huruf-lain', ['3 in 1']],
    ])
    expect(kelompok[1].istilah[0]).toEqual({ judul: 'TER', href: '/glosarium/ter', definisi: 'TER adalah tarif efektif rata-rata.' })
    expect(kelompok[2].istilah[0].definisi).toBe('Deck 3 in 1.')
  })
})

describe('IndeksGlosarium', () => {
  const masukan = { jenis: 'statis', judul: 'Glosarium', path: '/glosarium' } as const

  it('navigasi huruf, daftar definisi, dan remah roti', () => {
    const kelompok = kelompokkanIstilah([istilah('BPJS', 'bpjs', 'Jaminan sosial.'), istilah('TER', 'ter', 'Tarif efektif.')])
    const html = renderToStaticMarkup(h(IndeksGlosarium, { kelompok, masukan, situs }))
    expect(html).toContain('<nav aria-label="Huruf"')
    expect(html).toContain('<a href="#huruf-b">B</a>')
    expect(html).toMatch(/<section id="huruf-t" aria-labelledby="huruf-t-judul"/)
    expect(html).toMatch(/<dt><a href="\/glosarium\/ter">TER<\/a><\/dt><dd>Tarif efektif\.<\/dd>/)
    expect(html).toMatch(/<span aria-current="page" class="[^"]*">Glosarium<\/span>/)
  })

  it('pesan kosong bila belum ada istilah', () => {
    const html = renderToStaticMarkup(h(IndeksGlosarium, { kelompok: [], masukan, situs }))
    expect(html).toContain('Belum ada istilah. Istilah baru tampil di sini setelah terbit.')
    expect(html).not.toContain('aria-label="Huruf"')
  })
})
