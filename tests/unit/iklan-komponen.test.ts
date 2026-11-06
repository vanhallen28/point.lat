import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { PanelPersetujuan } from '@/components/iklan/PanelPersetujuan'
import { SkripPersetujuan } from '@/components/iklan/SkripPersetujuan'
import { SlotIklan } from '@/components/iklan/SlotIklan'
import { IsiArtikel } from '@/components/isi/IsiArtikel'
import { Footer } from '@/components/tata-letak/Footer'
import { sisipkanIklanTengah } from '@/modules/iklan/aturan'
import { skripAwal } from '@/modules/iklan/persetujuan'
import type { SlotSiap } from '@/modules/iklan/tipe'

import { isiLexical, p } from './seo-contoh'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
// next/image butuh konfigurasi loader dari next.config; isi tes ini tanpa gambar.
vi.mock('next/image', () => ({ default: () => null }))

const footer = { tautan: [], sosial: [], whatsapp: null, hakCipta: '© 2026 point.lat' }

describe('banner persetujuan cookie', () => {
  it('region bernama, penjelasan tujuan, tautan Kebijakan Privasi, dan dua tombol setara berurutan', () => {
    const html = renderToStaticMarkup(h(PanelPersetujuan, { kebijakan: '/kebijakan-privasi' }))
    expect(html).toMatch(/^<section tabindex="-1" aria-labelledby="persetujuan-judul" class="[^"]+">/)
    expect(html).toContain('<p id="persetujuan-judul" class="')
    expect(html).toContain('>Cookie dan iklan</p>')
    expect(html).toContain('Google AdSense memakai cookie untuk menampilkan iklan')
    expect(html).toContain('Dengan Hanya yang perlu, iklan tidak dimuat.')
    expect(html).toMatch(/<a href="\/kebijakan-privasi">Baca Kebijakan Privasi<\/a>/)
    expect([...html.matchAll(/<button type="button" class="([^"]+)">([^<]+)<\/button>/g)].map((m) => [m[1], m[2]])).toEqual([
      [expect.any(String), 'Hanya yang perlu'],
      [expect.any(String), 'Izinkan semua'],
    ])
    expect(new Set([...html.matchAll(/<button type="button" class="([^"]+)">/g)].map((m) => m[1])).size).toBe(1)
  })

  it('skrip awal sebaris di head, tanpa berkas terpisah', () => {
    expect(renderToStaticMarkup(h(SkripPersetujuan))).toBe(`<script>${skripAwal()}</script>`)
  })

  it('footer memuat tombol Pengaturan cookie hanya bila banner aktif', () => {
    expect(renderToStaticMarkup(h(Footer, { data: footer, persetujuan: true }))).toMatch(
      /<button type="button" class="[^"]+" data-buka-persetujuan="">Pengaturan cookie<\/button>/,
    )
    expect(renderToStaticMarkup(h(Footer, { data: footer }))).not.toContain('Pengaturan cookie')
  })
})

describe('slot iklan', () => {
  const slot: SlotSiap = { id: 'artikel-akhir', posisi: 'artikel-akhir', lebar: 336, tinggi: 280, klien: 'ca-pub-0000000000000000', unit: '2222222222', uji: true, setelahParagraf: 3 }

  it('wadah berlabel Advertisements (bahasa Inggris, kebijakan AdSense) dengan kotak berukuran tetap dan data untuk pemuat; tanpa slot tidak merender apa pun', () => {
    expect(renderToStaticMarkup(h(SlotIklan, { slot }))).toMatch(
      /^<div class="[^"]+" data-slot-iklan="artikel-akhir" data-lebar="336"><p class="[^"]+" lang="en">Advertisements<\/p><div class="[^"]+" style="width:336px;height:280px" data-kotak-iklan="" data-klien="ca-pub-0000000000000000" data-unit="2222222222" data-lebar="336" data-tinggi="280" data-uji="on"><\/div><\/div>$/,
    )
    expect(renderToStaticMarkup(h(SlotIklan, { slot: { ...slot, uji: false } }))).not.toContain('data-uji')
    expect(renderToStaticMarkup(h(SlotIklan, { slot: null }))).toBe('')
  })

  it('iklan tengah dirender IsiArtikel di antara paragraf tingkat atas, bukan di dalamnya', () => {
    const isi = sisipkanIklanTengah(isiLexical([p('Satu.'), p('Dua.'), p('Tiga.'), p('Empat.'), p('Lima.')]), { ...slot, id: 'tengah', posisi: 'artikel-tengah' })
    expect(renderToStaticMarkup(h(IsiArtikel, { isi, cloudName: 'demo' }))).toMatch(/<p>Tiga\.<\/p><div class="[^"]+" data-slot-iklan="tengah" data-lebar="336">/)
  })
})
