import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'
import { ambilFooter, ambilHeader } from '@/modules/konten/data'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
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

  it('menyimpan header merevalidasi tag header; menu pilar membawa path dan warna, pilar tanpa tulisan terbit disembunyikan', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const pilar = await payload.create({ collection: 'pilar', data: { nama: unik('Belajar'), warna: 'kuning', deskripsi: 'Belajar.' } })
    const kosong = await payload.create({ collection: 'pilar', data: { nama: unik('Sehat'), warna: 'koral', deskripsi: 'Sehat.' } })
    const sub = await payload.create({ collection: 'subkategori', data: { nama: unik('Masuk PTN'), pilar: pilar.id } })
    await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit({ ...relasi, pilar }), subkategori: sub.id } })
    // Draf dan glosarium tidak membuat pilar tampil.
    await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit({ ...relasi, pilar: kosong }), _status: 'draft' } })
    await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit({ ...relasi, pilar: kosong }), tipe: 'glosarium' } })
    tag = []
    await payload.updateGlobal({
      slug: 'header',
      data: {
        menu: [
          { label: 'Belajar', jenis: 'pilar', pilar: pilar.id },
          { label: 'Sehat', jenis: 'pilar', pilar: kosong.id },
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
    // Topik hangat: subkategori tulisan terbit terbaru berupa path subkategori di bawah pilarnya, tanpa duplikat. Isinya
    // bergantung tulisan lain di database tes, jadi yang diperiksa bentuknya; aturan urutan diuji unit (`susunTopik`).
    expect(header.topik.length).toBeGreaterThan(0)
    expect(header.topik.length).toBeLessThanOrEqual(5)
    for (const t of header.topik) expect(t.href).toMatch(/^\/[a-z0-9-]+\/[a-z0-9-]+$/)
    expect(new Set(header.topik.map((t) => t.href)).size).toBe(header.topik.length)
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
