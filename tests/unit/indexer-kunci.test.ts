import { describe, expect, it } from 'vitest'

import { validasiKunciIndexNow, validasiPropertiSearchConsole } from '@/modules/indexer/kunci'

describe('validasiKunciIndexNow', () => {
  it('kosong boleh (IndexNow dilewati); isi 8 sampai 128 huruf, angka, atau tanda hubung', () => {
    expect(validasiKunciIndexNow('')).toBe(true)
    expect(validasiKunciIndexNow(null)).toBe(true)
    expect(validasiKunciIndexNow('a1b2c3d4')).toBe(true)
    expect(validasiKunciIndexNow('Kunci-Point-2026-' + 'x'.repeat(111))).toBe(true)
  })

  it('menolak kunci terlalu pendek, terlalu panjang, atau berkarakter lain', () => {
    const pesan = 'Kunci IndexNow harus 8 sampai 128 karakter: huruf, angka, atau tanda hubung (-).'
    expect(validasiKunciIndexNow('abc123')).toBe(pesan)
    expect(validasiKunciIndexNow('x'.repeat(129))).toBe(pesan)
    expect(validasiKunciIndexNow('kunci_point_2026')).toBe(pesan)
    expect(validasiKunciIndexNow('kunci point 2026')).toBe(pesan)
  })
})

describe('validasiPropertiSearchConsole', () => {
  it('menerima properti domain dan properti awalan URL dengan garis miring di akhir', () => {
    expect(validasiPropertiSearchConsole('sc-domain:point.lat')).toBe(true)
    expect(validasiPropertiSearchConsole('https://point.lat/')).toBe(true)
  })

  it('menjelaskan bentuk yang benar untuk isian lain', () => {
    const pesan = 'Tulis properti domain (sc-domain:point.lat) atau awalan URL lengkap yang diakhiri garis miring (https://point.lat/).'
    expect(validasiPropertiSearchConsole('point.lat')).toBe(pesan)
    expect(validasiPropertiSearchConsole('https://point.lat')).toBe(pesan)
    expect(validasiPropertiSearchConsole('sc-domain:')).toBe(pesan)
    expect(validasiPropertiSearchConsole('')).toBe(pesan)
  })
})
