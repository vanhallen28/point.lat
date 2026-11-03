import { describe, expect, it } from 'vitest'

import { gambarPng } from './fixtures'
import { getTestPayload, pesanGalat } from './helpers'

describe('koleksi media', () => {
  it('menyimpan gambar beserta ukurannya', async () => {
    const payload = await getTestPayload()
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'Kotak hijau contoh' },
      file: await gambarPng(1300, 800),
    })
    expect(media.width).toBe(1300)
    expect(media.mimeType).toBe('image/png')
  })

  it('menolak gambar tanpa alt', async () => {
    const payload = await getTestPayload()
    const pesan = await pesanGalat(
      payload.create({ collection: 'media', data: {}, file: await gambarPng(400, 300) }),
    )
    expect(pesan).toMatch(/Alt wajib/)
  })
})
