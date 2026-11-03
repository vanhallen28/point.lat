import { describe, expect, it } from 'vitest'

import { getTestPayload, pesanGalat, unik } from './helpers'

describe('global situs', () => {
  it('menu header bisa menunjuk pilar dan tautan bebas', async () => {
    const payload = await getTestPayload()
    const pilar = await payload.create({
      collection: 'pilar',
      data: { nama: unik('Sehat'), warna: 'koral', deskripsi: 'Sehat.' },
    })
    const header = await payload.updateGlobal({
      slug: 'header',
      data: {
        menu: [
          { label: 'Sehat', jenis: 'pilar', pilar: pilar.id },
          { label: 'Tentang', jenis: 'tautan', url: '/tentang' },
        ],
      },
    })
    expect(header.menu).toHaveLength(2)
    expect(header.tombolTools?.url).toBe('/tools')
  })

  it('pengaturan SEO menolak pola judul tanpa %s', async () => {
    const payload = await getTestPayload()
    const pesan = await pesanGalat(
      payload.updateGlobal({ slug: 'pengaturan-seo', data: { polaJudul: 'point.' } }),
    )
    expect(pesan).toMatch(/^polaJudul:/)
  })

  it('beranda menyimpan urutan blok', async () => {
    const payload = await getTestPayload()
    const beranda = await payload.updateGlobal({
      slug: 'beranda',
      data: {
        tataLetak: [
          { blockType: 'heroBeranda', judul: 'Intinya dulu.' },
          { blockType: 'palingDibaca', judul: 'Paling dibaca pekan ini', jumlah: 4 },
        ],
      },
    })
    expect(beranda.tataLetak?.map((b) => b.blockType)).toEqual(['heroBeranda', 'palingDibaca'])
  })
})
