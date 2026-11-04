import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Ikon } from '@/components/dasar/Ikon'
import { Footer } from '@/components/tata-letak/Footer'
import { Header } from '@/components/tata-letak/Header'

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
        },
      }),
    )
    expect(html).toContain('<nav aria-label="Rubrik"')
    expect(html).toMatch(/<a [^>]*href="\/"[^>]*>.*point\..*, ke beranda/)
    expect(html).toMatch(/href="\/uang-karier"[^>]*><span [^>]*data-warna="hijau" aria-hidden="true"><\/span>Uang &amp; Karier/)
    expect(html).toMatch(/href="\/tentang"[^>]*>Tentang<\/a>/)
    expect(html).toMatch(/href="\/tools"[^>]*>Tools<\/a>/)
  })

  it('tanpa menu tidak merender nav kosong', () => {
    const html = renderToStaticMarkup(h(Header, { data: { menu: [], tools: { label: 'Tools', href: '/tools' } } }))
    expect(html).not.toContain('<nav')
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
    expect(html).toContain('<nav aria-label="Tentang point."')
    expect(html).toContain('<a href="https://instagram.com/point.lat" rel="noopener">Instagram</a>')
    expect(html).toContain('<a href="https://whatsapp.com/channel/abc" rel="noopener">Saluran WhatsApp</a>')
    expect(html).toContain('© 2026 point.lat')
  })
})
