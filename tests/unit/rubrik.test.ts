import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { HalamanRubrik } from '@/components/rubrik/HalamanRubrik'
import { susunRubrik } from '@/modules/konten/rubrik'
import type { KartuArtikel } from '@/modules/konten/tipe'
import type { Pilar, Subkategori } from '@/payload-types'

import { isiLexical, p, situs } from './seo-contoh'

const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }

const pilar: Pilar = {
  id: 1,
  nama: 'Uang & Karier',
  slug: 'uang-karier',
  warna: 'hijau',
  deskripsi: 'Gaji, pajak, tabungan, utang, dan karier.',
  intro: isiLexical([p('Mulai dari gaji bersih, lalu atur tabungan.')]) as Pilar['intro'],
  disclaimer: 'Bukan saran keuangan.',
  ...waktu,
}

const pajak: Subkategori = { id: 7, nama: 'Pajak', slug: 'pajak', pilar: 1, deskripsi: 'PPh 21, PTKP, dan lapor SPT.', ...waktu }
const daftarSub = [pajak, { id: 8, nama: 'Tabungan', slug: 'tabungan' }]

const kartu: KartuArtikel = {
  id: 10,
  judul: 'Cara hitung gaji bersih',
  href: '/cara-hitung-gaji-bersih',
  tipe: 'panduan',
  pilar: { nama: 'Uang & Karier', slug: 'uang-karier', href: '/uang-karier', warna: 'hijau', disclaimer: null },
  intinya: 'Gaji kotor dikurangi PPh 21 dan BPJS.',
  gambar: null,
  terbit: null,
  penulis: null,
}

describe('susunRubrik', () => {
  it('pilar: intro, navigasi subkategori dengan "Semua" aktif, dan masukan SEO pilar', () => {
    const rubrik = susunRubrik(pilar, null, daftarSub, [kartu])
    expect(rubrik).toMatchObject({ judul: 'Uang & Karier', href: '/uang-karier', deskripsi: 'Gaji, pajak, tabungan, utang, dan karier.' })
    expect(rubrik?.intro).toEqual(pilar.intro)
    expect(rubrik?.subkategori).toEqual([
      { label: 'Semua', href: '/uang-karier', aktif: true },
      { label: 'Pajak', href: '/uang-karier/pajak', aktif: false },
      { label: 'Tabungan', href: '/uang-karier/tabungan', aktif: false },
    ])
    expect(rubrik?.seo).toMatchObject({ jenis: 'pilar', doc: { slug: 'uang-karier' } })
  })

  it('subkategori: tanpa intro pilar, subkategori aktif, dan SEO subkategori di bawah pilarnya', () => {
    const rubrik = susunRubrik(pilar, pajak, daftarSub, [])
    expect(rubrik).toMatchObject({ judul: 'Pajak', href: '/uang-karier/pajak', deskripsi: 'PPh 21, PTKP, dan lapor SPT.', intro: null, artikel: [] })
    expect(rubrik?.subkategori.filter((s) => s.aktif).map((s) => s.label)).toEqual(['Pajak'])
    expect(rubrik?.seo).toMatchObject({ jenis: 'subkategori', doc: { slug: 'pajak', pilar: { slug: 'uang-karier' } } })
  })

  it('intro kosong tidak ditampilkan; pilar tanpa slug tidak punya halaman', () => {
    expect(susunRubrik({ ...pilar, intro: isiLexical([p('  ')]) as Pilar['intro'] }, null, [], [])?.intro).toBeNull()
    expect(susunRubrik({ ...pilar, slug: null }, null, [], [])).toBeNull()
  })

  it('halaman berikutnya: intro pilar hanya di halaman 1, paginasi dan nomor halaman SEO, nomor di luar jangkauan null', () => {
    const satu = susunRubrik(pilar, null, daftarSub, [kartu], { nomor: 1, total: 30 })
    expect(satu?.paginasi).toMatchObject({ nomor: 1, jumlah: 2, berikutnya: '/uang-karier/halaman/2' })
    const dua = susunRubrik(pilar, null, daftarSub, [kartu], { nomor: 2, total: 30 })
    expect(dua).toMatchObject({ href: '/uang-karier', intro: null, paginasi: { nomor: 2, sebelumnya: '/uang-karier' }, seo: { jenis: 'pilar', halaman: 2 } })
    expect(susunRubrik(pilar, pajak, daftarSub, [kartu], { nomor: 2, total: 30 })?.paginasi.sebelumnya).toBe('/uang-karier/pajak')
    expect(susunRubrik(pilar, null, daftarSub, [], { nomor: 3, total: 30 })).toBeNull()
  })
})

describe('HalamanRubrik', () => {
  it('remah roti, kepala berwarna pilar, navigasi subkategori, intro, dan kartu', () => {
    const rubrik = susunRubrik(pilar, null, daftarSub, [kartu])!
    const html = renderToStaticMarkup(h(HalamanRubrik, { rubrik, situs }))
    expect(html).toMatch(/<header class="[^"]*" data-warna="hijau"><p class="[^"]*">Rubrik<\/p><h1 class="[^"]*">Uang &amp; Karier<\/h1>/)
    expect(html).toContain('<nav aria-label="Subkategori Uang &amp; Karier"')
    expect(html).toMatch(/<a aria-current="page" class="[^"]*" href="\/uang-karier">Semua<\/a>/)
    expect(html).toContain('Mulai dari gaji bersih, lalu atur tabungan.')
    expect(html).toContain('<h2 id="tulisan-rubrik"')
    expect(html).toContain('href="/cara-hitung-gaji-bersih"')
    expect(html).toContain('"@type":"BreadcrumbList"')
  })

  it('subkategori tanpa tulisan: kicker nama pilar dan pesan kosong', () => {
    const rubrik = susunRubrik(pilar, pajak, [], [])!
    const html = renderToStaticMarkup(h(HalamanRubrik, { rubrik, situs }))
    expect(html).toMatch(/<p class="[^"]*">Uang &amp; Karier<\/p><h1 class="[^"]*">Pajak<\/h1>/)
    expect(html).not.toContain('aria-label="Subkategori')
    expect(html).toContain('Belum ada tulisan di rubrik ini. Tulisan baru tampil di sini setelah terbit.')
  })
})
