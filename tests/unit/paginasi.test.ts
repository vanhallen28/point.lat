import { describe, expect, it } from 'vitest'

import { pathHalaman, SEGMEN_HALAMAN } from '@/lib/paths'
import { validasiFormatSlug } from '@/lib/slug'
import { bacaNomor, pisahHalaman, susunPaginasi, UKURAN_HALAMAN } from '@/modules/konten/paginasi'

/** Nomor yang ditampilkan navigasi, jeda sebagai "...". */
const nomor = (dasar: string, n: number, total: number) =>
  susunPaginasi(dasar, n, total)?.halaman.map((h) => (h ? (h.aktif ? `[${h.nomor}]` : String(h.nomor)) : '...'))

describe('path halaman daftar', () => {
  it('halaman 1 di alamat daftar itu sendiri, halaman berikutnya di /halaman/{n}', () => {
    expect(pathHalaman('/uang-karier', 1)).toBe('/uang-karier')
    expect(pathHalaman('/uang-karier', 2)).toBe('/uang-karier/halaman/2')
    expect(pathHalaman('/uang-karier/pajak', 12)).toBe('/uang-karier/pajak/halaman/12')
    expect(pathHalaman('/penulis/redaksi', 3)).toBe('/penulis/redaksi/halaman/3')
  })

  it('slug "halaman" dicadangkan untuk semua koleksi', () => {
    expect(SEGMEN_HALAMAN).toBe('halaman')
    expect(validasiFormatSlug('halaman')).toBe('"halaman" dipakai sistem. Pilih slug lain.')
    expect(validasiFormatSlug('halaman-depan')).toBe(true)
  })
})

describe('bacaNomor dan pisahHalaman', () => {
  it('nomor hanya bilangan bulat 1 sampai 9999 tanpa nol di depan', () => {
    expect(bacaNomor('2')).toBe(2)
    expect(bacaNomor('9999')).toBe(9999)
    for (const teks of ['0', '01', '+2', '2.0', '1e3', '10000', 'dua', '', ' 2']) expect(bacaNomor(teks), teks).toBeNull()
  })

  it('tanpa akhiran berarti halaman 1; akhiran /halaman/{n} dipisahkan; nomor tidak sah berarti 404', () => {
    expect(pisahHalaman(['uang-karier'])).toEqual({ jalur: ['uang-karier'], nomor: 1, tertulis: false })
    expect(pisahHalaman(['uang-karier', 'pajak'])).toEqual({ jalur: ['uang-karier', 'pajak'], nomor: 1, tertulis: false })
    expect(pisahHalaman(['uang-karier', 'halaman', '2'])).toEqual({ jalur: ['uang-karier'], nomor: 2, tertulis: true })
    expect(pisahHalaman(['uang-karier', 'pajak', 'halaman', '3'])).toEqual({ jalur: ['uang-karier', 'pajak'], nomor: 3, tertulis: true })
    expect(pisahHalaman(['uang-karier', 'halaman', '1'])).toEqual({ jalur: ['uang-karier'], nomor: 1, tertulis: true })
    expect(pisahHalaman(['uang-karier', 'halaman'])).toEqual({ jalur: ['uang-karier', 'halaman'], nomor: 1, tertulis: false })
    expect(pisahHalaman(['uang-karier', 'halaman', '02'])).toBeNull()
    expect(pisahHalaman(['uang-karier', 'halaman', 'dua'])).toBeNull()
  })
})

describe('susunPaginasi', () => {
  it(`satu halaman ${UKURAN_HALAMAN} kartu; daftar kosong tetap punya halaman 1; nomor di luar jangkauan berarti 404`, () => {
    expect(susunPaginasi('/belajar', 1, 0)).toEqual({ nomor: 1, jumlah: 1, sebelumnya: null, berikutnya: null, halaman: [{ nomor: 1, href: '/belajar', aktif: true }] })
    expect(susunPaginasi('/belajar', 1, UKURAN_HALAMAN)?.jumlah).toBe(1)
    expect(susunPaginasi('/belajar', 2, UKURAN_HALAMAN)).toBeNull()
    expect(susunPaginasi('/belajar', 2, UKURAN_HALAMAN + 1)?.jumlah).toBe(2)
    expect(susunPaginasi('/belajar', 0, 100)).toBeNull()
    expect(susunPaginasi('/belajar', 5, 100)?.jumlah).toBe(5)
    expect(susunPaginasi('/belajar', 6, 100)).toBeNull()
  })

  it('tautan sebelumnya dan berikutnya memakai path halaman (halaman 1 tanpa akhiran)', () => {
    expect(susunPaginasi('/belajar', 1, 50)).toMatchObject({ jumlah: 3, sebelumnya: null, berikutnya: '/belajar/halaman/2' })
    expect(susunPaginasi('/belajar', 2, 50)).toMatchObject({ sebelumnya: '/belajar', berikutnya: '/belajar/halaman/3' })
    expect(susunPaginasi('/belajar', 3, 50)).toMatchObject({ sebelumnya: '/belajar/halaman/2', berikutnya: null })
    expect(susunPaginasi('/belajar', 2, 50)?.halaman).toEqual([
      { nomor: 1, href: '/belajar', aktif: false },
      { nomor: 2, href: '/belajar/halaman/2', aktif: true },
      { nomor: 3, href: '/belajar/halaman/3', aktif: false },
    ])
  })

  it('nomor pertama, terakhir, dan tetangga halaman ini; satu nomor terlewat ditulis, lebih dari satu menjadi jeda', () => {
    const total = 10 * UKURAN_HALAMAN
    expect(nomor('/x', 1, total)).toEqual(['[1]', '2', '...', '10'])
    expect(nomor('/x', 3, total)).toEqual(['1', '2', '[3]', '4', '...', '10'])
    expect(nomor('/x', 4, total)).toEqual(['1', '2', '3', '[4]', '5', '...', '10'])
    expect(nomor('/x', 5, total)).toEqual(['1', '...', '4', '[5]', '6', '...', '10'])
    expect(nomor('/x', 10, total)).toEqual(['1', '...', '9', '[10]'])
    expect(nomor('/x', 4, 5 * UKURAN_HALAMAN)).toEqual(['1', '2', '3', '[4]', '5'])
  })
})
