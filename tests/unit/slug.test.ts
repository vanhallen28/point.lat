import { describe, expect, it } from 'vitest'

import { isReservedSlug, slugify } from '@/lib/slug'

describe('slugify', () => {
  it('mengubah judul menjadi huruf kecil dengan tanda hubung', () => {
    expect(slugify('Cara Hitung Gaji Bersih')).toBe('cara-hitung-gaji-bersih')
  })

  it('mengganti & dengan "dan"', () => {
    expect(slugify('Uang & Karier')).toBe('uang-dan-karier')
  })

  it('membuang tanda baca, apostrof, dan aksen', () => {
    expect(slugify("Apa itu PPh 21? Ini jawabannya!")).toBe('apa-itu-pph-21-ini-jawabannya')
    expect(slugify("Jum'at Café")).toBe('jumat-cafe')
  })

  it('merapikan spasi dan tanda hubung berlebih', () => {
    expect(slugify('  --Gaji   Rp8 juta--  ')).toBe('gaji-rp8-juta')
  })

  it('memotong di batas kata saat lebih dari 80 karakter', () => {
    const judul = 'kata '.repeat(30)
    const hasil = slugify(judul)
    expect(hasil.length).toBeLessThanOrEqual(80)
    expect(hasil.endsWith('-')).toBe(false)
    expect(hasil).toMatch(/^kata(-kata)*$/)
  })

  it('mengembalikan string kosong untuk input kosong', () => {
    expect(slugify('')).toBe('')
    expect(slugify('???')).toBe('')
  })
})

describe('isReservedSlug', () => {
  it('menolak segmen yang dipakai rute sistem', () => {
    for (const s of ['admin', 'api', 'tools', 'glosarium', 'video', 'penulis', 'cari', 'sitemap']) {
      expect(isReservedSlug(s)).toBe(true)
    }
  })

  it('mengizinkan slug konten biasa', () => {
    expect(isReservedSlug('cara-hitung-gaji-bersih')).toBe(false)
  })
})
