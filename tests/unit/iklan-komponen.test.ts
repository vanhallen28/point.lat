import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { PanelPersetujuan } from '@/components/iklan/PanelPersetujuan'
import { SkripPersetujuan } from '@/components/iklan/SkripPersetujuan'
import { Footer } from '@/components/tata-letak/Footer'
import { skripAwal } from '@/modules/iklan/persetujuan'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

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
