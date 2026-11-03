import { describe, expect, it } from 'vitest'

import { slugify } from '@/lib/slug'

import { getTestPayload, pesanGalat, unik } from './helpers'

describe('pilar, subkategori, penulis', () => {
  it('membuat slug pilar otomatis dari nama', async () => {
    const payload = await getTestPayload()
    const nama = unik('Uang & Karier')
    const pilar = await payload.create({
      collection: 'pilar',
      data: { nama, warna: 'hijau', deskripsi: 'Gaji, pajak, dan karier.' },
    })
    expect(pilar.slug).toBe(slugify(nama))
  })

  it('menolak slug milik sistem', async () => {
    const payload = await getTestPayload()
    const pesan = await pesanGalat(
      payload.create({
        collection: 'pilar',
        data: { nama: unik('Tools'), slug: 'tools', warna: 'oranye', deskripsi: 'x' },
      }),
    )
    expect(pesan).toMatch(/dipakai sistem/)
  })

  it('subkategori terhubung ke pilar dan penulis punya slug', async () => {
    const payload = await getTestPayload()
    const pilar = await payload.create({
      collection: 'pilar',
      data: { nama: unik('Belajar'), warna: 'kuning', deskripsi: 'Sekolah dan kuliah.' },
    })
    const sub = await payload.create({
      collection: 'subkategori',
      data: { nama: unik('Beasiswa'), pilar: pilar.id },
    })
    const penulis = await payload.create({
      collection: 'penulis',
      data: { nama: unik('Redaksi point'), bio: 'Tim redaksi point.lat.' },
    })

    expect(typeof sub.pilar === 'object' ? sub.pilar?.id : sub.pilar).toBe(pilar.id)
    expect(penulis.slug).toMatch(/^redaksi-point-/)
  })
})
