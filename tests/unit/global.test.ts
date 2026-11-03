import { describe, expect, it } from 'vitest'

import { judulHalaman, validasiPolaJudul } from '@/lib/seo-dasar'

describe('validasiPolaJudul', () => {
  it('mewajibkan penanda %s satu kali', () => {
    expect(validasiPolaJudul('%s · point.')).toBe(true)
    expect(validasiPolaJudul('point.')).toBe('Pola judul harus memuat %s satu kali, contoh: %s · point.')
    expect(validasiPolaJudul('%s %s')).toBe('Pola judul harus memuat %s satu kali, contoh: %s · point.')
  })
})

describe('judulHalaman', () => {
  it('menyisipkan judul ke pola', () => {
    expect(judulHalaman('%s · point.', 'Cara hitung THR')).toBe('Cara hitung THR · point.')
  })
})
