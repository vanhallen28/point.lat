import { describe, expect, it } from 'vitest'

import { urlAdmin } from '@/lib/admin'
import { pathDariKueri, rencanaRedirect, validasiPathRedirect } from '@/lib/redirect'

describe('validasiPathRedirect', () => {
  it('menerima path yang diawali garis miring', () => {
    expect(validasiPathRedirect('/judul-lama')).toBe(true)
    expect(validasiPathRedirect('/')).toBe(true)
  })

  it('menolak URL lengkap, path tanpa garis miring, dan garis miring di akhir', () => {
    expect(validasiPathRedirect('https://point.lat/a')).toBe(
      'Tulis path yang diawali "/", contoh: /judul-lama',
    )
    expect(validasiPathRedirect('judul')).toBe('Tulis path yang diawali "/", contoh: /judul-lama')
    expect(validasiPathRedirect('//evil.com')).toBe('Tulis path yang diawali "/", contoh: /judul-lama')
    expect(validasiPathRedirect('/judul/')).toBe('Hapus garis miring di akhir path.')
  })
})

describe('rencanaRedirect', () => {
  it('tidak melakukan apa pun bila path tidak berubah', () => {
    expect(rencanaRedirect('/a', '/a', [])).toEqual({ buat: [], ubah: [], hapus: [] })
  })

  it('membuat redirect dari path lama ke path baru', () => {
    expect(rencanaRedirect('/lama', '/baru', [])).toEqual({
      buat: [{ dari: '/lama', ke: '/baru' }],
      ubah: [],
      hapus: [],
    })
  })

  it('meratakan rantai: redirect lama yang menuju path lama diarahkan ke path baru', () => {
    const ada = [{ id: 1, dari: '/pertama', ke: '/lama' }]
    expect(rencanaRedirect('/lama', '/baru', ada)).toEqual({
      buat: [{ dari: '/lama', ke: '/baru' }],
      ubah: [{ id: 1, ke: '/baru' }],
      hapus: [],
    })
  })

  it('menghapus redirect yang berasal dari path baru supaya tidak berputar', () => {
    const ada = [{ id: 5, dari: '/a', ke: '/b' }]
    expect(rencanaRedirect('/b', '/a', ada)).toEqual({
      buat: [{ dari: '/b', ke: '/a' }],
      ubah: [],
      hapus: [5],
    })
  })

  it('memperbarui redirect yang sudah berasal dari path lama, bukan membuat duplikat', () => {
    const ada = [{ id: 9, dari: '/lama', ke: '/entah' }]
    expect(rencanaRedirect('/lama', '/baru', ada)).toEqual({
      buat: [],
      ubah: [{ id: 9, ke: '/baru' }],
      hapus: [],
    })
  })
})

describe('tombol "Buat redirect"', () => {
  it('form redirect baru dengan path asal di kueri; path di kueri hanya dipakai bila sah', () => {
    expect(urlAdmin.buat('redirect', { dari: '/jalan-lama' })).toBe('/admin/collections/redirect/create?dari=%2Fjalan-lama')
    expect(urlAdmin.buat('redirect')).toBe('/admin/collections/redirect/create')
    expect(urlAdmin.dokumen('redirect', 7)).toBe('/admin/collections/redirect/7')
    expect(urlAdmin.global('header')).toBe('/admin/globals/header')
    expect(pathDariKueri('/jalan-lama')).toBe('/jalan-lama')
    for (const nilai of ['jalan-lama', '//evil.example', '/jalan-lama/', ['/a'], undefined]) expect(pathDariKueri(nilai)).toBeUndefined()
  })
})
