import { describe, expect, it } from 'vitest'

import { getTestPayload, pesanGalat, unik } from './helpers'

describe('tools dan parameter', () => {
  it('menyimpan tools sebagai draf lalu menerbitkannya', async () => {
    const payload = await getTestPayload()
    const pilar = await payload.create({
      collection: 'pilar',
      data: { nama: unik('Uang'), warna: 'hijau', deskripsi: 'Uang.' },
    })
    const draf = await payload.create({
      collection: 'tools',
      draft: true,
      data: { nama: unik('Gaji Bersih') },
    })
    expect(draf._status).toBe('draft')

    const terbit = await payload.update({
      collection: 'tools',
      id: draf.id,
      data: {
        _status: 'published',
        pilar: pilar.id,
        toolId: 'gaji-bersih',
        ringkasan: 'Hitung gaji bersih setelah PPh 21 dan BPJS.',
      },
    })
    expect(terbit._status).toBe('published')
    expect(terbit.slug).toMatch(/^gaji-bersih-/)

    await payload.delete({ collection: 'tools', id: draf.id })
  })

  it('menolak parameter dengan tanggal akhir sebelum tanggal mulai', async () => {
    const payload = await getTestPayload()
    const pesan = await pesanGalat(
      payload.create({
        collection: 'parameter-tools',
        data: {
          toolId: 'thr',
          kunci: unik('contoh'),
          nilai: 1,
          berlakuMulai: '2026-06-01',
          berlakuSampai: '2026-01-01',
        },
      }),
    )
    expect(pesan).toMatch(/Tanggal akhir/)
  })
})
