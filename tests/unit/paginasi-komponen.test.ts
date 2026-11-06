import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Paginasi } from '@/components/dasar/Paginasi'
import { HalamanRubrik } from '@/components/rubrik/HalamanRubrik'
import { susunPaginasi, UKURAN_HALAMAN } from '@/modules/konten/paginasi'
import { susunRubrik } from '@/modules/konten/rubrik'
import type { Pilar } from '@/payload-types'

import { isiLexical, p, situs } from './seo-contoh'

const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
const pilar: Pilar = {
  id: 1,
  nama: 'Belajar',
  slug: 'belajar',
  warna: 'kuning',
  deskripsi: 'Ujian, kuliah, dan beasiswa.',
  intro: isiLexical([p('Persiapan ujian dan kuliah.')]) as Pilar['intro'],
  ...waktu,
}
const kartu = {
  id: 10,
  judul: 'Latihan soal penalaran umum',
  href: '/latihan-soal-penalaran-umum',
  tipe: 'panduan' as const,
  pilar: { nama: 'Belajar', slug: 'belajar', href: '/belajar', warna: 'kuning' as const, disclaimer: null },
  intinya: 'Kerjakan satu paket soal setiap hari.',
}

describe('Paginasi', () => {
  it('tautan biasa yang bisa ditelusuri: posisi halaman, sebelumnya dan berikutnya, lalu nomor dibacakan "Halaman N" dengan jeda tersembunyi', () => {
    const html = renderToStaticMarkup(h(Paginasi, { paginasi: susunPaginasi('/belajar', 2, 9 * UKURAN_HALAMAN)! }))
    expect(html).toMatch(/^<nav aria-label="Halaman tulisan" class="[^"]*"><p class="[^"]*">Halaman 2 dari 9<\/p><div class="[^"]*"><ul class="[^"]*"><li>/)
    expect(html).toMatch(/<a rel="prev" class="[^"]*" href="\/belajar"><svg[^>]*aria-hidden="true"[^>]*><path d="m15 18-6-6 6-6"><\/path><\/svg>Sebelumnya<\/a><\/li><li><a rel="next" class="[^"]*" href="\/belajar\/halaman\/3">Berikutnya<svg/)
    expect(html).toMatch(/<\/ul><ul class="[^"]*"><li><a class="[^"]*" href="\/belajar"><span class="sr">Halaman <\/span>1<\/a>/)
    expect(html).toMatch(/<a aria-current="page" class="[^"]*" href="\/belajar\/halaman\/2"><span class="sr">Halaman <\/span>2<\/a>/)
    expect(html).toMatch(/<li aria-hidden="true" class="[^"]*">\u2026<\/li><li><a class="[^"]*" href="\/belajar\/halaman\/9">/)
  })

  it('halaman pertama tanpa "Sebelumnya", halaman terakhir tanpa "Berikutnya", satu halaman tanpa navigasi', () => {
    expect(renderToStaticMarkup(h(Paginasi, { paginasi: susunPaginasi('/belajar', 1, 50)! }))).not.toContain('Sebelumnya')
    expect(renderToStaticMarkup(h(Paginasi, { paginasi: susunPaginasi('/belajar', 3, 50)! }))).not.toContain('Berikutnya')
    expect(renderToStaticMarkup(h(Paginasi, { paginasi: susunPaginasi('/belajar', 1, UKURAN_HALAMAN)! }))).toBe('')
  })
})

describe('HalamanRubrik berhalaman', () => {
  it('halaman 2: tanpa intro, judul bagian "Tulisan lebih lama", navigasi di dalam bagian tulisan, remah roti "Halaman 2"', () => {
    const rubrik = susunRubrik(pilar, null, [], [kartu], { nomor: 2, total: 50 })!
    const html = renderToStaticMarkup(h(HalamanRubrik, { rubrik, situs }))
    expect(html).not.toContain('Persiapan ujian dan kuliah.')
    expect(html).toMatch(/<h2 id="tulisan-rubrik" class="[^"]*">Tulisan lebih lama<\/h2>/)
    expect(html).toMatch(/<nav aria-label="Halaman tulisan"[\s\S]*<\/nav><\/section>/)
    expect(html).toMatch(/<span aria-current="page" class="[^"]*">Halaman 2<\/span>/)
    expect(html).toContain('"name":"Halaman 2","item":"https://point.lat/belajar/halaman/2"')
  })

  it('halaman 1 dengan satu halaman tulisan: judul bagian "Tulisan terbaru" tanpa navigasi halaman', () => {
    const html = renderToStaticMarkup(h(HalamanRubrik, { rubrik: susunRubrik(pilar, null, [], [kartu])!, situs }))
    expect(html).toMatch(/<h2 id="tulisan-rubrik" class="[^"]*">Tulisan terbaru<\/h2>/)
    expect(html).not.toContain('aria-label="Halaman tulisan"')
  })
})
