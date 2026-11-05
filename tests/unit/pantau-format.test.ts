import { describe, expect, it } from 'vitest'

import { hrefSumber } from '@/modules/pantau/dashboard'
import { batasSumbu, teksJumlah, teksPersen, teksPosisi, teksRingkas, teksTanggal, teksWaktu } from '@/modules/pantau/format'

describe('format dashboard SEO', () => {
  it('angka: utuh dengan titik ribuan; ringkas mulai 10.000 dengan spasi tak putus dari Intl', () => {
    expect(teksJumlah(1284)).toBe('1.284')
    expect(teksRingkas(9_999)).toBe('9.999')
    expect(teksRingkas(182_400)).toBe('182,4\u00a0rb')
    expect(teksRingkas(2_500_000)).toBe('2,5\u00a0jt')
    expect(teksPersen(0.0612)).toBe('6,1%')
    expect(teksPersen(0)).toBe('0%')
    expect(teksPosisi(6.43)).toBe('6,4')
    expect(teksPosisi(null)).toBe('-')
  })

  it('waktu di WIB dan tanggal kalender data Search Console', () => {
    expect(teksWaktu('2026-11-05T03:12:00.000Z')).toBe('5 Nov 2026, 10.12 WIB')
    expect(teksTanggal('2026-11-02')).toBe('2 Nov 2026')
    expect(teksTanggal('2026-10-06', true)).toBe('6 Okt')
  })

  it('batas sumbu grafik dibulatkan ke 1, 2, atau 5 kali pangkat sepuluh', () => {
    expect([0, 3, 12, 41, 82, 100, 101, 4_380].map(batasSumbu)).toEqual([1, 5, 20, 50, 100, 100, 200, 5_000])
  })

  it('tautan perbaikan: dokumen koleksi, atau global untuk menu dan beranda', () => {
    expect(hrefSumber({ koleksi: 'artikel', id: 12 })).toBe('/admin/collections/artikel/12')
    expect(hrefSumber({ koleksi: 'header', id: null })).toBe('/admin/globals/header')
    expect(hrefSumber({ koleksi: 'beranda', id: null })).toBe('/admin/globals/beranda')
  })
})
