import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

import { atributUnit, urlSkrip } from '@/modules/iklan/adsense'
import {
  bacaPersetujuan,
  hapusKuki,
  nilaiKuki,
  sinyalPersetujuan,
  skripAwal,
  teksPersetujuan,
  tulisKuki,
  versiPersetujuan,
  type Sinyal,
} from '@/modules/iklan/persetujuan'

const SEKARANG = new Date('2026-11-06T08:00:00.000Z')

/** Menjalankan skrip awal di lingkungan tiruan: atribut `<html>` dan isi `dataLayer` setelahnya. */
function jalankanSkripAwal(kuki: string, sekarang = SEKARANG, analitik = false) {
  const atribut: Record<string, string> = {}
  const window: { dataLayer?: ArrayLike<unknown>[] } = {}
  const document = { cookie: kuki, documentElement: { setAttribute: (nama: string, nilai: string) => (atribut[nama] = nilai) } }
  class Tanggal extends Date {
    static now() {
      return sekarang.getTime()
    }
  }
  runInNewContext(skripAwal(analitik), { window, document, Date: Tanggal })
  return { atribut, dataLayer: (window.dataLayer ?? []).map((a) => Array.from(a)) }
}

const DITOLAK: Sinyal = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }
const IKLAN_DIIZINKAN: Sinyal = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'denied' }

describe('cookie persetujuan', () => {
  it('menyimpan versi, pilihan, dan tanggal; berlaku 12 bulan, Secure hanya di HTTPS', () => {
    expect(nilaiKuki('semua', SEKARANG)).toBe('1.semua.2026-11-06')
    expect(tulisKuki('perlu', SEKARANG, true)).toBe('persetujuan=1.perlu.2026-11-06; Path=/; Max-Age=31536000; SameSite=Lax; Secure')
    expect(tulisKuki('semua', SEKARANG, false)).toBe('persetujuan=1.semua.2026-11-06; Path=/; Max-Age=31536000; SameSite=Lax')
    expect(hapusKuki('__gads')).toBe('__gads=; Path=/; Max-Age=0; SameSite=Lax')
  })

  it('pilihan dibaca dari document.cookie; versi lama, kedaluwarsa, dan nilai rusak dianggap belum memilih', () => {
    expect(bacaPersetujuan('a=1; persetujuan=1.semua.2026-11-01; b=2', SEKARANG)).toEqual({ versi: 1, pilihan: 'semua', tanggal: '2026-11-01' })
    expect(bacaPersetujuan('persetujuan=1.perlu.2025-11-07', SEKARANG)?.pilihan).toBe('perlu')
    expect(bacaPersetujuan('persetujuan=1.perlu.2025-11-05', SEKARANG)).toBeNull()
    expect(bacaPersetujuan('persetujuan=0.semua.2026-11-01', SEKARANG)).toBeNull()
    expect(bacaPersetujuan('persetujuan=1.semuanya.2026-11-01', SEKARANG)).toBeNull()
    expect(bacaPersetujuan('xpersetujuan=1.semua.2026-11-01', SEKARANG)).toBeNull()
    expect(bacaPersetujuan('', SEKARANG)).toBeNull()
  })

  it('Consent Mode v2: semua sinyal ditolak sebelum memilih dan untuk Hanya yang perlu; Izinkan semua membuka sinyal iklan saja', () => {
    expect(sinyalPersetujuan('belum')).toEqual(DITOLAK)
    expect(sinyalPersetujuan('perlu')).toEqual(DITOLAK)
    expect(sinyalPersetujuan('semua')).toEqual(IKLAN_DIIZINKAN)
  })
})

describe('skrip awal di head', () => {
  it('consent default ditolak lebih dulu, lalu atribut html dari cookie; update hanya untuk Izinkan semua', () => {
    expect(jalankanSkripAwal('')).toEqual({ atribut: { 'data-persetujuan': 'belum' }, dataLayer: [['consent', 'default', DITOLAK]] })
    expect(jalankanSkripAwal('persetujuan=1.perlu.2026-11-01')).toEqual({ atribut: { 'data-persetujuan': 'perlu' }, dataLayer: [['consent', 'default', DITOLAK]] })
    expect(jalankanSkripAwal('x=1; persetujuan=1.semua.2026-11-01')).toEqual({
      atribut: { 'data-persetujuan': 'semua' },
      dataLayer: [
        ['consent', 'default', DITOLAK],
        ['consent', 'update', IKLAN_DIIZINKAN],
      ],
    })
  })

  it('aturan skrip sama dengan bacaPersetujuan untuk versi, umur, dan nilai rusak', () => {
    for (const kuki of ['persetujuan=1.semua.2025-11-07', 'persetujuan=1.semua.2025-11-05', 'persetujuan=1.perlu.2026-11-07', 'persetujuan=1.perlu.2026-11-09', 'persetujuan=2.semua.2026-11-01', 'persetujuan=1.semua.20261101']) {
      expect(jalankanSkripAwal(kuki).atribut['data-persetujuan'], kuki).toBe(bacaPersetujuan(kuki, SEKARANG)?.pilihan ?? 'belum')
    }
  })
})

describe('kode AdSense', () => {
  it('satu skrip adsbygoogle.js per ID penerbit dan elemen ins berukuran tetap; data-adtest hanya di mode uji', () => {
    expect(urlSkrip('ca-pub-0000000000000000')).toBe('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0000000000000000')
    const slot = { lebar: 300, tinggi: 250, klien: 'ca-pub-0000000000000000', unit: '1111111111', uji: false }
    expect(atributUnit(slot)).toEqual({
      class: 'adsbygoogle',
      style: 'display:inline-block;width:300px;height:250px',
      'data-ad-client': 'ca-pub-0000000000000000',
      'data-ad-slot': '1111111111',
    })
    expect(atributUnit({ ...slot, uji: true })['data-adtest']).toBe('on')
  })
})

describe('persetujuan dengan Kode sematan (analitik, spesifikasi §23)', () => {
  const SEMUA_ANALITIK: Sinyal = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'granted' }

  it('analytics_storage hanya dibuka bila ada kode yang menunggu persetujuan; versi pilihan ikut cakupan', () => {
    expect(sinyalPersetujuan('semua', true)).toEqual(SEMUA_ANALITIK)
    expect(sinyalPersetujuan('perlu', true)).toEqual(DITOLAK)
    expect(sinyalPersetujuan('semua')).toEqual(IKLAN_DIIZINKAN)
    expect(versiPersetujuan(false)).toBe(1)
    expect(versiPersetujuan(true)).toBe(2)
    expect(tulisKuki('semua', SEKARANG, true, 2)).toBe('persetujuan=2.semua.2026-11-06; Path=/; Max-Age=31536000; SameSite=Lax; Secure')
    expect(bacaPersetujuan('persetujuan=2.semua.2026-11-01', SEKARANG, 2)?.pilihan).toBe('semua')
    expect(bacaPersetujuan('persetujuan=1.semua.2026-11-01', SEKARANG, 2)).toBeNull()
  })

  it('skrip awal dengan analitik: pilihan versi 1 (hanya iklan) tidak berlaku lagi, versi 2 membuka analitik', () => {
    expect(jalankanSkripAwal('persetujuan=1.semua.2026-11-01', SEKARANG, true).atribut['data-persetujuan']).toBe('belum')
    const { atribut, dataLayer } = jalankanSkripAwal('persetujuan=2.semua.2026-11-01', SEKARANG, true)
    expect(atribut['data-persetujuan']).toBe('semua')
    expect(dataLayer).toEqual([
      ['consent', 'default', DITOLAK],
      ['consent', 'update', SEMUA_ANALITIK],
    ])
  })

  it('teks banner menyebut yang benar-benar dimuat setelah Izinkan semua', () => {
    expect(teksPersetujuan({ iklan: true, layanan: [] })).toEqual({
      judul: 'Cookie dan iklan',
      isi:
        'point. memakai cookie yang perlu supaya situs berjalan, termasuk untuk mengingat pilihanmu. Bila kamu pilih Izinkan semua, ' +
        'Google AdSense memakai cookie untuk menampilkan iklan, termasuk iklan yang disesuaikan dengan minatmu. Dengan Hanya yang perlu, iklan tidak dimuat.',
    })
    expect(teksPersetujuan({ iklan: false, layanan: ['Google Analytics'] })).toEqual({
      judul: 'Cookie',
      isi:
        'point. memakai cookie yang perlu supaya situs berjalan, termasuk untuk mengingat pilihanmu. Bila kamu pilih Izinkan semua, ' +
        'Google Analytics dimuat dan bisa memakai cookie untuk mengukur kunjungan. Dengan Hanya yang perlu, layanan itu tidak dimuat.',
    })
    expect(teksPersetujuan({ iklan: true, layanan: ['Google Analytics', 'Meta Pixel', 'Crisp'] }).isi).toContain(
      '; Google Analytics, Meta Pixel dan Crisp juga dimuat dan bisa memakai cookie untuk mengukur kunjungan. Dengan Hanya yang perlu, iklan dan layanan itu tidak dimuat.',
    )
  })
})
