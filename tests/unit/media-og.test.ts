import { describe, expect, it } from 'vitest'

import { kodekanTeks, urlOg } from '@/modules/media/og'

describe('kodekanTeks (teks untuk layer l_text Cloudinary)', () => {
  it('mengodekan ganda karakter khusus sesuai aturan Cloudinary', () => {
    expect(kodekanTeks('Gaji 5,5 juta?')).toBe('Gaji%205%252C5%20juta%253F')
    expect(kodekanTeks('PPh 21/2026: 100%')).toBe('PPh%2021%252F2026%253A%20100%2525')
    expect(kodekanTeks('Gaji (bersih)!')).toBe('Gaji%20%2528bersih%2529%2521')
  })

  it('membuang em dash, en dash, dan emoji yang tidak bisa dirender', () => {
    expect(kodekanTeks('THR — cara hitung – cepat 💸')).toBe('THR%20cara%20hitung%20cepat')
  })
})

describe('urlOg', () => {
  const awal = 'https://res.cloudinary.com/demo/image/upload'

  it('pilar hijau: latar #1F7A4D, teks putih, judul Archivo 900, logo point.', () => {
    expect(urlOg('demo', { judul: 'Cara hitung gaji bersih', warna: 'hijau' })).toBe(
      `${awal}/w_1200,h_630,c_scale,e_colorize:100,co_rgb:1F7A4D` +
        '/l_text:Archivo@google_72_900:Cara%20hitung%20gaji%20bersih,co_rgb:FFFFFF,c_fit,w_1040' +
        '/fl_layer_apply,g_north_west,x_80,y_96' +
        '/l_text:Archivo@google_44_900:point.,co_rgb:FFFFFF/fl_layer_apply,g_south_west,x_80,y_64' +
        '/f_png/point/sistem/kanvas',
    )
  })

  it('pilar kuning dan koral memakai teks ink', () => {
    const kuning = urlOg('demo', { judul: 'IPK', warna: 'kuning' })
    expect(kuning).toContain('co_rgb:F2C230/')
    expect(kuning).toContain(':IPK,co_rgb:111111,')
    expect(urlOg('demo', { judul: 'BMI', warna: 'koral' })).toContain('co_rgb:FF8A80/')
  })

  it('memotong judul yang terlalu panjang di batas kata', () => {
    const judul = 'Panduan lengkap menghitung PPh 21 untuk karyawan tetap dengan status kawin dan dua tanggungan anak'
    const url = urlOg('demo', { judul, warna: 'oranye' })
    expect(url).toContain(
      ':Panduan%20lengkap%20menghitung%20PPh%2021%20untuk%20karyawan%20tetap%20dengan%20status%20kawin%20dan...,',
    )
    expect(url).toContain('co_rgb:C2410C/')
  })

  it('bisa memakai kanvas lain', () => {
    expect(urlOg('demo', { judul: 'Tes', warna: 'hijau' }, { kanvas: 'lain/kanvas' })).toMatch(/\/f_png\/lain\/kanvas$/)
  })
})
