import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'
import { ambilFooter, ambilHeader } from '@/modules/konten/data'

import { getTestPayload, unik } from './helpers'

let tag: string[] = []

describe('data tampilan header dan footer', () => {
  beforeAll(() => {
    pakaiPemicuRevalidasi((t) => tag.push(t))
  })

  afterAll(() => {
    pakaiPemicuRevalidasi(null)
  })

  beforeEach(() => {
    tag = []
  })

  it('menyimpan header merevalidasi tag header; menu pilar membawa path dan warna', async () => {
    const payload = await getTestPayload()
    const pilar = await payload.create({ collection: 'pilar', data: { nama: unik('Belajar'), warna: 'kuning', deskripsi: 'Belajar.' } })
    tag = []
    await payload.updateGlobal({
      slug: 'header',
      data: {
        menu: [
          { label: 'Belajar', jenis: 'pilar', pilar: pilar.id },
          { label: 'Tentang', jenis: 'tautan', url: '/tentang' },
        ],
        tombolTools: { label: 'Tools', url: '/tools' },
      },
    })
    expect(tag).toEqual(['header'])
    const header = await ambilHeader(payload)
    expect(header.menu).toEqual([
      { label: 'Belajar', href: `/${pilar.slug}`, warna: 'kuning' },
      { label: 'Tentang', href: '/tentang', warna: null },
    ])
  })

  it('menyimpan footer merevalidasi tag footer', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({
      slug: 'footer',
      data: { tautan: [{ label: 'Kontak', url: '/kontak' }], sosial: [{ platform: 'instagram', url: 'https://instagram.com/point.lat' }] },
    })
    expect(tag).toEqual(['footer'])
    const footer = await ambilFooter(payload)
    expect(footer.tautan).toEqual([{ label: 'Kontak', href: '/kontak' }])
    expect(footer.sosial).toEqual([{ label: 'Instagram', href: 'https://instagram.com/point.lat' }])
  })
})
