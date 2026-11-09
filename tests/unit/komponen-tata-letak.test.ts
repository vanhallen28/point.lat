import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { Ikon } from '@/components/dasar/Ikon'
import { Footer } from '@/components/tata-letak/Footer'
import { Header } from '@/components/tata-letak/Header'
import { tandaAktif } from '@/modules/konten/tampilan'

const path = vi.hoisted(() => ({ sekarang: null as string | null }))
vi.mock('next/navigation', () => ({ usePathname: () => path.sekarang }))

describe('Ikon', () => {
  it('dekoratif disembunyikan dari pembaca layar; dengan label dibaca sebagai gambar', () => {
    const dekoratif = renderToStaticMarkup(h(Ikon, { nama: 'clock' }))
    expect(dekoratif).toContain('aria-hidden="true"')
    expect(dekoratif).not.toContain('role=')
    const berlabel = renderToStaticMarkup(h(Ikon, { nama: 'info', label: 'Info' }))
    expect(berlabel).toContain('role="img"')
    expect(berlabel).toContain('aria-label="Info"')
  })
})

describe('Header', () => {
  it('logo ke beranda, pill rubrik dengan titik warna, dan tombol Tools', () => {
    const html = renderToStaticMarkup(
      h(Header, {
        data: {
          menu: [
            { label: 'Uang & Karier', href: '/uang-karier', warna: 'hijau' },
            { label: 'Tentang', href: '/tentang', warna: null },
          ],
          tools: { label: 'Tools', href: '/tools' },
          topik: [{ label: 'Gaji & Pajak', href: '/uang-karier/gaji-pajak' }],
        },
      }),
    )
    expect(html).toContain('<nav aria-label="Rubrik"')
    expect(html).toMatch(/<nav aria-label="Topik hangat"[^>]*>.*href="\/uang-karier\/gaji-pajak"[^>]*>Gaji &amp; Pajak<\/a>/)
    // Tanggal hari ini ditulis skrip sebaris ke atribut, bukan dirender server (header ISR).
    expect(html).toMatch(/<p id="tanggal-hari-ini" class="[^"]*"><\/p><script>\(function\(\)\{var e=document\.getElementById\("tanggal-hari-ini"\)/)
    expect(html).toMatch(/<a [^>]*href="\/"[^>]*>.*point\..*, ke beranda/)
    expect(html).toMatch(/href="\/uang-karier"[^>]*><span [^>]*data-warna="hijau" aria-hidden="true"><\/span>Uang &amp; Karier/)
    expect(html).toMatch(/href="\/tentang"[^>]*>Tentang<\/a>/)
    expect(html).toMatch(/href="\/tools"[^>]*>Tools<\/a>/)
  })

  it('menandai rubrik dan Tools yang sedang dibuka dengan aria-current', () => {
    const data = {
      menu: [
        { label: 'Uang & Karier', href: '/uang-karier', warna: 'hijau' as const },
        { label: 'Sehat', href: '/sehat', warna: 'koral' as const },
      ],
      tools: { label: 'Tools', href: '/tools' },
      topik: [],
    }
    path.sekarang = '/uang-karier/pajak'
    expect(renderToStaticMarkup(h(Header, { data })).match(/aria-current="[^"]*"/g)).toEqual(['aria-current="true"'])
    path.sekarang = '/tools/gaji-bersih'
    expect(renderToStaticMarkup(h(Header, { data }))).toMatch(/aria-current="true" href="\/tools">Tools<\/a>/)
    path.sekarang = null
  })

  it('tanpa menu tidak merender nav kosong', () => {
    const html = renderToStaticMarkup(h(Header, { data: { menu: [], tools: { label: 'Tools', href: '/tools' }, topik: [] } }))
    expect(html).not.toContain('<nav')
  })
})

describe('tandaAktif', () => {
  it('page untuk path yang sama, true untuk path di bawahnya, kosong untuk beranda dan URL luar', () => {
    expect(tandaAktif('/uang-karier', '/uang-karier')).toBe('page')
    expect(tandaAktif('/uang-karier/pajak', '/uang-karier')).toBe('true')
    expect(tandaAktif('/uang-karierku', '/uang-karier')).toBeUndefined()
    expect(tandaAktif('/tools', '/')).toBeUndefined()
    expect(tandaAktif('/', '/')).toBe('page')
    expect(tandaAktif('/tools', 'https://point.kit.com/tools')).toBeUndefined()
    expect(tandaAktif(null, '/tools')).toBeUndefined()
  })
})

describe('Footer', () => {
  it('tautan situs, sosial, saluran WhatsApp, dan hak cipta', () => {
    const html = renderToStaticMarkup(
      h(Footer, {
        data: {
          tautan: [{ label: 'Tentang', href: '/tentang' }],
          sosial: [{ label: 'Instagram', href: 'https://instagram.com/point.lat' }],
          whatsapp: 'https://whatsapp.com/channel/abc',
          hakCipta: '© 2026 point.lat',
        },
      }),
    )
    expect(html).toMatch(/<nav aria-labelledby="kaki-tentang-point" class="[^"]*"><p id="kaki-tentang-point" class="[^"]*">Tentang point\.<\/p>/)
    expect(html).toContain('<p id="kaki-ikuti-point" class="')
    expect(html).not.toContain('kaki-jelajahi')
    expect(html).not.toContain('<h2')
    expect(html).toContain('<a href="https://instagram.com/point.lat" rel="noopener">Instagram</a>')
    expect(html).toContain('<a href="https://whatsapp.com/channel/abc" rel="noopener">Saluran WhatsApp</a>')
    expect(html).toContain('© 2026 point.lat')
  })

  it('kolom Rubrik dari menu header bila diberikan', () => {
    const html = renderToStaticMarkup(
      h(Footer, {
        data: { tautan: [], sosial: [], whatsapp: null, hakCipta: '© 2026 point.lat' },
        rubrik: [
          { label: 'Uang & Karier', href: '/uang-karier' },
          { label: 'Tools', href: '/tools' },
        ],
      }),
    )
    expect(html).toMatch(/<p id="kaki-jelajahi" class="[^"]*">Jelajahi<\/p><ul class="[^"]*"><li><a href="\/uang-karier">Uang &amp; Karier<\/a><\/li><li><a href="\/tools">Tools<\/a>/)
    expect(html).not.toContain('kaki-tentang')
  })
})
