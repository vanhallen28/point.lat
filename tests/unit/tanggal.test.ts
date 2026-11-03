import { describe, expect, it } from 'vitest'

import { validasiRentangTanggal } from '@/lib/validasi'

describe('validasiRentangTanggal', () => {
  it('menerima rentang terbuka (tanpa tanggal akhir)', () => {
    expect(validasiRentangTanggal('2026-01-01', undefined)).toBe(true)
    expect(validasiRentangTanggal('2026-01-01', null)).toBe(true)
  })

  it('menerima tanggal akhir yang sama atau sesudah tanggal mulai', () => {
    expect(validasiRentangTanggal('2026-01-01', '2026-01-01')).toBe(true)
    expect(validasiRentangTanggal('2026-01-01', '2026-12-31')).toBe(true)
  })

  it('menolak tanggal akhir sebelum tanggal mulai', () => {
    expect(validasiRentangTanggal('2026-06-01', '2026-01-01')).toBe(
      'Tanggal akhir harus sama atau sesudah tanggal mulai.',
    )
  })
})
