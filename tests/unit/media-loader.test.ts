import { describe, expect, it } from 'vitest'

import loaderCloudinary from '@/modules/media/loader'
import { propsGambar } from '@/modules/media/props'
import { bangunUrl } from '@/modules/media/url'

const ID = 'point/gambar/slip-gaji-1a2b3c4d'

describe('image loader Next.js', () => {
  it('menyisipkan lebar srcset ke URL Cloudinary dan memakai q_auto bila kualitas default', () => {
    const src = bangunUrl('demo', ID, 'kartu')
    expect(loaderCloudinary({ src, width: 640 })).toBe(
      `https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,ar_4:3/c_limit,w_640,f_auto,q_auto/${ID}`,
    )
    expect(loaderCloudinary({ src, width: 640, quality: 75 })).toContain('/c_limit,w_640,f_auto,q_auto/')
    expect(loaderCloudinary({ src, width: 640, quality: 50 })).toContain('/c_limit,w_640,f_auto,q_50/')
  })

  it('URL lokal tetap diberi lebar', () => {
    expect(loaderCloudinary({ src: '/logo.png', width: 256 })).toBe('/logo.png?w=256')
  })
})

describe('propsGambar', () => {
  const media = { publicId: ID, jenis: 'gambar' as const, alt: 'Slip gaji', width: 2560, height: 1440 }

  it('selalu mengisi width, height, dan alt untuk next/image', () => {
    expect(propsGambar(media, 'hero', { cloudName: 'demo' })).toEqual({
      src: `https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,ar_16:9/f_auto,q_auto/${ID}`,
      width: 2560,
      height: 1440,
      alt: 'Slip gaji',
    })
    expect(propsGambar(media, 'kartu', { cloudName: 'demo' })).toMatchObject({ width: 1920, height: 1440 })
    expect(propsGambar(media, 'og', { cloudName: 'demo' })).toMatchObject({ width: 1200, height: 630 })
  })

  it('video memakai poster sebagai gambar', () => {
    const video = { publicId: 'point/video/thr-1', jenis: 'video' as const, alt: null, width: 1080, height: 1920 }
    expect(propsGambar(video, 'asli', { cloudName: 'demo' })).toEqual({
      src: 'https://res.cloudinary.com/demo/video/upload/so_auto/q_auto/point/video/thr-1.jpg',
      width: 1080,
      height: 1920,
      alt: '',
    })
  })

  it('null bila media belum punya publicId atau ukuran', () => {
    expect(propsGambar({ ...media, publicId: null }, 'hero', { cloudName: 'demo' })).toBeNull()
    expect(propsGambar({ ...media, width: null }, 'hero', { cloudName: 'demo' })).toBeNull()
    expect(propsGambar(null, 'hero', { cloudName: 'demo' })).toBeNull()
  })
})
