import { describe, expect, it } from 'vitest'

import { buatSlug, validasiFormatSlug } from '@/lib/slug'
import { validasiUrlOpsional } from '@/lib/validasi'

describe('buatSlug', () => {
  it('memakai slug yang diketik editor, dirapikan', () => {
    expect(buatSlug('Gaji Bersih ', 'Judul Lain')).toBe('gaji-bersih')
  })

  it('membuat slug dari field sumber bila slug kosong', () => {
    expect(buatSlug('', 'Uang & Karier')).toBe('uang-dan-karier')
    expect(buatSlug(undefined, 'Tekno')).toBe('tekno')
  })

  it('mengembalikan undefined bila slug dan sumber sama-sama kosong', () => {
    expect(buatSlug(undefined, undefined)).toBeUndefined()
    expect(buatSlug('', '')).toBeUndefined()
  })
})

describe('validasiFormatSlug', () => {
  it('menerima slug yang rapi', () => {
    expect(validasiFormatSlug('cara-hitung-thr')).toBe(true)
  })

  it('menolak slug kosong, berformat salah, atau milik sistem', () => {
    expect(validasiFormatSlug('')).toBe('Slug wajib diisi.')
    expect(validasiFormatSlug('Huruf Besar')).toBe(
      'Slug hanya boleh huruf kecil, angka, dan tanda hubung.',
    )
    expect(validasiFormatSlug('tools')).toBe('"tools" dipakai sistem. Pilih slug lain.')
  })
})

describe('validasiUrlOpsional', () => {
  it('menerima nilai kosong', () => {
    expect(validasiUrlOpsional(undefined)).toBe(true)
    expect(validasiUrlOpsional('')).toBe(true)
  })

  it('menerima URL http atau https lengkap', () => {
    expect(validasiUrlOpsional('https://pajak.go.id/id/pph-21')).toBe(true)
  })

  it('menolak teks yang bukan URL', () => {
    expect(validasiUrlOpsional('pajak.go.id')).toBe('Tulis URL lengkap yang diawali https://')
    expect(validasiUrlOpsional('ftp://contoh.com')).toBe('Tulis URL lengkap yang diawali https://')
  })
})
