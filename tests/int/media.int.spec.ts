import { existsSync, readdirSync } from 'fs'
import path from 'path'
import { beforeAll, describe, expect, it } from 'vitest'

import { klienMedia } from '@/modules/media'
import type { KlienPalsu } from '@/modules/media/palsu'

import { gambarPng, videoMp4 } from './fixtures'
import { getTestPayload, pesanGalat } from './helpers'

/** `.env.test` tidak berisi kredensial Cloudinary, jadi Payload memakai klien palsu. */
const klien = () => klienMedia() as KlienPalsu

const isiFolderMedia = () => {
  const folder = path.resolve('media')
  return existsSync(folder) ? readdirSync(folder) : []
}

describe('koleksi media', () => {
  let sebelum: string[]
  beforeAll(async () => {
    await getTestPayload()
    sebelum = isiFolderMedia()
  })

  it('memakai klien palsu karena env Cloudinary kosong', () => {
    expect(process.env.CLOUDINARY_API_SECRET).toBeUndefined()
    expect(klien().cloudName).toBe('palsu')
    expect(klien().aset).toBeInstanceOf(Map)
  })

  it('menyimpan gambar lewat adapter Cloudinary, bukan disk lokal', async () => {
    const payload = await getTestPayload()
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'Kotak hijau contoh' },
      file: await gambarPng(1300, 800),
    })

    expect(media.publicId).toMatch(/^point\/gambar\/tes-[a-z0-9-]+-[0-9a-f]{8}$/)
    expect(media.jenis).toBe('gambar')
    expect(media.width).toBe(1300)
    expect(media.height).toBe(800)
    expect(media.mimeType).toBe('image/png')
    expect(media.url).toBe(`https://res.cloudinary.com/palsu/image/upload/f_auto,q_auto/${media.publicId}`)

    const tersimpan = klien().aset.get(media.publicId!)
    expect(tersimpan?.lewat).toBe('server')
    expect(tersimpan?.opsi.transformation).toBe('c_limit,w_2560,q_auto')
    expect(isiFolderMedia()).toEqual(sebelum)
  })

  it('gambar di atas 2560px disimpan dengan ukuran hasil incoming transformation', async () => {
    const payload = await getTestPayload()
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'Gambar besar' },
      file: await gambarPng(3200, 1800),
    })
    expect(media.width).toBe(2560)
    expect(media.height).toBe(1440)
  })

  it('menyimpan video dengan jenis, durasi, dan URL MP4', async () => {
    const payload = await getTestPayload()
    const media = await payload.create({ collection: 'media', data: {}, file: videoMp4() })
    expect(media.jenis).toBe('video')
    expect(media.publicId).toMatch(/^point\/video\//)
    expect(media.durasi).toBe(30)
    expect(media.url).toBe(`https://res.cloudinary.com/palsu/video/upload/q_auto/${media.publicId}.mp4`)
    expect(klien().aset.get(media.publicId!)?.opsi.eager).toBe('sp_auto/m3u8|so_auto/q_auto/jpg|q_auto/mp4')
  })

  it('menghapus aset di Cloudinary saat dokumen dihapus', async () => {
    const payload = await getTestPayload()
    const media = await payload.create({
      collection: 'media',
      data: { alt: 'Akan dihapus' },
      file: await gambarPng(400, 300),
    })
    expect(klien().aset.has(media.publicId!)).toBe(true)
    await payload.delete({ collection: 'media', id: media.id })
    expect(klien().aset.has(media.publicId!)).toBe(false)
  })

  it('menolak gambar tanpa alt', async () => {
    const payload = await getTestPayload()
    const pesan = await pesanGalat(
      payload.create({ collection: 'media', data: {}, file: await gambarPng(400, 300) }),
    )
    expect(pesan).toMatch(/Alt wajib/)
  })
})
