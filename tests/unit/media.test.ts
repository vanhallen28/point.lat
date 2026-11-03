import { describe, expect, it } from 'vitest'

import { LEBAR_MINIMAL_GAMBAR_UTAMA, validasiAlt, validasiLebarGambar } from '@/lib/media'

describe('validasiAlt', () => {
  it('mewajibkan alt untuk gambar', () => {
    expect(validasiAlt('', 'image/png')).toBe('Alt wajib diisi untuk gambar.')
    expect(validasiAlt('   ', 'image/jpeg')).toBe('Alt wajib diisi untuk gambar.')
    expect(validasiAlt('Slip gaji contoh', 'image/png')).toBe(true)
  })

  it('tidak mewajibkan alt untuk video', () => {
    expect(validasiAlt('', 'video/mp4')).toBe(true)
  })
})

describe('validasiLebarGambar', () => {
  it('memakai batas 1200px untuk gambar utama', () => {
    expect(LEBAR_MINIMAL_GAMBAR_UTAMA).toBe(1200)
  })

  it('menerima gambar yang cukup lebar', () => {
    expect(validasiLebarGambar(1200)).toBe(true)
    expect(validasiLebarGambar(2400)).toBe(true)
  })

  it('menolak gambar yang terlalu kecil atau tanpa ukuran', () => {
    expect(validasiLebarGambar(800)).toBe(
      'Gambar utama minimal 1200px lebarnya (sekarang 800px), syarat tampil besar di Google Discover.',
    )
    expect(validasiLebarGambar(undefined)).toBe('Ukuran gambar tidak diketahui. Unggah ulang gambarnya.')
  })
})
