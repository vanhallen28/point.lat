import { describe, expect, it } from 'vitest'

import { bangunUrl, dimensiPreset, EAGER_VIDEO, lebarkan, urlDokumen } from '@/modules/media/url'

const GAMBAR = 'https://res.cloudinary.com/demo/image/upload'
const VIDEO = 'https://res.cloudinary.com/demo/video/upload'
const ID = 'point/gambar/slip-gaji-1a2b3c4d'
const ID_VIDEO = 'point/video/cara-hitung-thr-5e6f7a8b'

describe('bangunUrl untuk gambar', () => {
  it('tanpa preset mengirim gambar utuh dengan f_auto,q_auto', () => {
    expect(bangunUrl('demo', ID)).toBe(`${GAMBAR}/f_auto,q_auto/${ID}`)
  })

  it('membangun URL untuk setiap preset', () => {
    expect(bangunUrl('demo', ID, 'kartu')).toBe(`${GAMBAR}/c_fill,g_auto,ar_4:3/f_auto,q_auto/${ID}`)
    expect(bangunUrl('demo', ID, 'hero')).toBe(`${GAMBAR}/c_fill,g_auto,ar_16:9/f_auto,q_auto/${ID}`)
    expect(bangunUrl('demo', ID, 'thumbnail')).toBe(`${GAMBAR}/c_fill,g_auto,ar_1:1/f_auto,q_auto/${ID}`)
    expect(bangunUrl('demo', ID, 'og')).toBe(`${GAMBAR}/c_fill,g_auto,w_1200,h_630/f_auto,q_auto/${ID}`)
  })

  it('membatasi lebar tanpa memperbesar gambar', () => {
    expect(bangunUrl('demo', ID, 'kartu', { lebar: 640 })).toBe(
      `${GAMBAR}/c_fill,g_auto,ar_4:3/c_limit,w_640,f_auto,q_auto/${ID}`,
    )
  })
})

describe('bangunUrl untuk video', () => {
  it('menyediakan HLS adaptif, MP4 cadangan, dan poster dari frame otomatis', () => {
    expect(bangunUrl('demo', ID_VIDEO, 'hls')).toBe(`${VIDEO}/sp_auto/${ID_VIDEO}.m3u8`)
    expect(bangunUrl('demo', ID_VIDEO, 'mp4')).toBe(`${VIDEO}/q_auto/${ID_VIDEO}.mp4`)
    expect(bangunUrl('demo', ID_VIDEO, 'poster')).toBe(`${VIDEO}/so_auto/q_auto/${ID_VIDEO}.jpg`)
  })

  it('turunan eager sama persis dengan URL pengiriman', () => {
    expect(EAGER_VIDEO).toBe('sp_auto/m3u8|so_auto/q_auto/jpg|q_auto/mp4')
  })

  it('poster bisa dibatasi lebarnya', () => {
    expect(bangunUrl('demo', ID_VIDEO, 'poster', { lebar: 300 })).toBe(
      `${VIDEO}/so_auto/c_limit,w_300,q_auto/${ID_VIDEO}.jpg`,
    )
  })
})

describe('lebarkan (dipakai image loader Next.js)', () => {
  it('menyisipkan lebar dan kualitas ke URL Cloudinary', () => {
    const kartu = bangunUrl('demo', ID, 'kartu')
    expect(lebarkan(kartu, 640)).toBe(`${GAMBAR}/c_fill,g_auto,ar_4:3/c_limit,w_640,f_auto,q_auto/${ID}`)
    expect(lebarkan(kartu, 640, 60)).toBe(`${GAMBAR}/c_fill,g_auto,ar_4:3/c_limit,w_640,f_auto,q_60/${ID}`)
    expect(lebarkan(bangunUrl('demo', ID, 'kartu', { lebar: 1200 }), 320)).toBe(
      `${GAMBAR}/c_fill,g_auto,ar_4:3/c_limit,w_320,f_auto,q_auto/${ID}`,
    )
    expect(lebarkan(bangunUrl('demo', ID_VIDEO, 'poster'), 480)).toBe(
      `${VIDEO}/so_auto/c_limit,w_480,q_auto/${ID_VIDEO}.jpg`,
    )
  })

  it('menambah parameter w ke URL di luar Cloudinary', () => {
    expect(lebarkan('/logo.svg', 640)).toBe('/logo.svg?w=640')
    expect(lebarkan('/gambar.png?v=2', 320)).toBe('/gambar.png?v=2&w=320')
  })
})

describe('urlDokumen', () => {
  it('memilih URL sesuai jenis media, kosong bila belum ada publicId', () => {
    expect(urlDokumen('demo', { publicId: ID, jenis: 'gambar' })).toBe(`${GAMBAR}/f_auto,q_auto/${ID}`)
    expect(urlDokumen('demo', { publicId: ID_VIDEO, jenis: 'video' })).toBe(
      `${VIDEO}/q_auto/${ID_VIDEO}.mp4`,
    )
    expect(urlDokumen('demo', { publicId: null, jenis: null })).toBe('')
  })
})

describe('dimensiPreset', () => {
  it('menghitung ukuran hasil potong sesuai rasio preset', () => {
    expect(dimensiPreset('kartu', { width: 1600, height: 900 })).toEqual({ width: 1200, height: 900 })
    expect(dimensiPreset('hero', { width: 1200, height: 1600 })).toEqual({ width: 1200, height: 675 })
    expect(dimensiPreset('thumbnail', { width: 800, height: 600 })).toEqual({ width: 600, height: 600 })
    expect(dimensiPreset('asli', { width: 800, height: 600 })).toEqual({ width: 800, height: 600 })
  })

  it('memakai ukuran tetap untuk og dan menyesuaikan lebar yang diminta', () => {
    expect(dimensiPreset('og', { width: 400, height: 300 })).toEqual({ width: 1200, height: 630 })
    expect(dimensiPreset('hero', { width: 2560, height: 1440 }, { lebar: 800 })).toEqual({ width: 800, height: 450 })
    expect(dimensiPreset('kartu', { width: 400, height: 300 }, { lebar: 800 })).toEqual({ width: 400, height: 300 })
  })
})
