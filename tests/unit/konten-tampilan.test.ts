import { describe, expect, it } from 'vitest'

import { susunFooter, susunHeader, tautanInternal } from '@/modules/konten/tampilan'

const pilar = (id: number, slug: string | null, warna: 'hijau' | 'kuning') =>
  ({ id, nama: slug ?? 'Tanpa slug', slug, warna, deskripsi: 'Deskripsi.', createdAt: '', updatedAt: '' }) as const

describe('susunHeader', () => {
  it('item pilar memakai path dan warna pilar; tautan bebas apa adanya', () => {
    const data = susunHeader({
      menu: [
        { label: 'Uang & Karier', jenis: 'pilar', pilar: pilar(1, 'uang-karier', 'hijau') },
        { label: 'Belajar', jenis: 'pilar', pilar: pilar(2, 'belajar', 'kuning') },
        { label: 'Tentang', jenis: 'tautan', url: ' /tentang ' },
      ],
      tombolTools: { label: 'Tools', url: '/tools' },
    })
    expect(data.menu).toEqual([
      { label: 'Uang & Karier', href: '/uang-karier', warna: 'hijau' },
      { label: 'Belajar', href: '/belajar', warna: 'kuning' },
      { label: 'Tentang', href: '/tentang', warna: null },
    ])
    expect(data.tools).toEqual({ label: 'Tools', href: '/tools' })
  })

  it('melewati pilar yang belum di-populate, tanpa slug, atau tautan kosong', () => {
    const data = susunHeader({
      menu: [
        { label: 'ID saja', jenis: 'pilar', pilar: 7 },
        { label: 'Terhapus', jenis: 'pilar', pilar: null },
        { label: 'Tanpa slug', jenis: 'pilar', pilar: pilar(3, null, 'hijau') },
        { label: 'Kosong', jenis: 'tautan', url: '  ' },
      ],
    })
    expect(data.menu).toEqual([])
  })

  it('tombol Tools memakai nilai bawaan bila dikosongkan', () => {
    expect(susunHeader({ tombolTools: { label: '', url: null } }).tools).toEqual({ label: 'Tools', href: '/tools' })
  })
})

describe('susunFooter', () => {
  it('tautan, sosial dengan nama platform, saluran WhatsApp, dan hak cipta', () => {
    const data = susunFooter({
      tautan: [
        { label: 'Tentang', url: '/tentang' },
        { label: 'Kosong', url: ' ' },
      ],
      sosial: [
        { platform: 'tiktok', url: 'https://www.tiktok.com/@point.lat' },
        { platform: 'linkedin', url: 'https://www.linkedin.com/company/point-lat' },
      ],
      saluranWhatsApp: 'https://whatsapp.com/channel/abc',
      teksHakCipta: null,
    })
    expect(data).toEqual({
      tautan: [{ label: 'Tentang', href: '/tentang' }],
      sosial: [
        { label: 'TikTok', href: 'https://www.tiktok.com/@point.lat' },
        { label: 'LinkedIn', href: 'https://www.linkedin.com/company/point-lat' },
      ],
      whatsapp: 'https://whatsapp.com/channel/abc',
      hakCipta: '© 2026 point.lat',
    })
  })
})

describe('tautanInternal', () => {
  it('hanya path situs yang dianggap internal', () => {
    expect(tautanInternal('/tentang')).toBe(true)
    expect(tautanInternal('//cdn.contoh.com/x')).toBe(false)
    expect(tautanInternal('https://point.lat/tentang')).toBe(false)
  })
})
