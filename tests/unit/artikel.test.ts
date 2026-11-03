import { describe, expect, it } from 'vitest'

import { hitungTanggal } from '@/hooks/catatTanggalArtikel'

const SEKARANG = '2026-11-04T08:00:00.000Z'

describe('hitungTanggal', () => {
  it('mengisi terbitPada saat pertama kali terbit', () => {
    expect(hitungTanggal({ _status: 'published' }, undefined, SEKARANG)).toEqual({
      terbitPada: SEKARANG,
    })
  })

  it('tidak mengubah terbitPada pada penerbitan berikutnya', () => {
    expect(
      hitungTanggal({ _status: 'published' }, { terbitPada: '2026-01-01T00:00:00.000Z' }, SEKARANG),
    ).toEqual({})
  })

  it('perubahan besar mengisi diperbaruiBesar dan mematikan saklarnya', () => {
    expect(
      hitungTanggal(
        { _status: 'published', perubahanBesar: true },
        { terbitPada: '2026-01-01T00:00:00.000Z' },
        SEKARANG,
      ),
    ).toEqual({ diperbaruiBesar: SEKARANG, perubahanBesar: false })
  })

  it('tidak melakukan apa pun saat menyimpan draf', () => {
    expect(hitungTanggal({ _status: 'draft', perubahanBesar: true }, undefined, SEKARANG)).toEqual(
      {},
    )
  })
})
