import { describe, expect, it } from 'vitest'

import {
  apakahBot,
  bacaKiriman,
  bacaRentang,
  benderaNegara,
  daftarTanggal,
  isiCsvKunjungan,
  jenisPerangkat,
  MAKS_RENTANG_HARI,
  namaNegara,
  namaPeramban,
  panjangRentang,
  paramRentang,
  PATH_CATAT,
  PENANDA_404,
  rapikanKota,
  rapikanNegara,
  rapikanPath,
  rentangSebelumnya,
  sidikKunjungan,
  skripKunjungan,
  sumberKunjungan,
  tanggalWib,
  urlCsvKunjungan,
} from '@/modules/kunjungan/aturan'
import { indeksLabel, labelTitik, satuanSeri } from '@/modules/kunjungan/admin/GrafikKunjungan'

const UA = {
  chromeAndroid: 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  samsung: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  tabletAndroid: 'Mozilla/5.0 (Linux; Android 13; SM-X200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  firefox: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:132.0) Gecko/20100101 Firefox/132.0',
  googlebot: 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
}

describe('pengenal pengunjung', () => {
  it('bot, pratinjau tautan, alat otomatis, dan UA kosong diabaikan; peramban biasa dihitung', () => {
    for (const ua of [UA.googlebot, 'facebookexternalhit/1.1', 'WhatsApp/2.24.1 A', 'curl/8.5.0', 'Mozilla/5.0 HeadlessChrome/130.0 Safari/537.36', 'Mozilla/5.0 Chrome-Lighthouse', '', null, 'pendek'])
      expect(apakahBot(ua), String(ua)).toBe(true)
    for (const ua of [UA.chromeAndroid, UA.iphone, UA.edge, UA.firefox, UA.samsung]) expect(apakahBot(ua), ua).toBe(false)
  })

  it('perangkat dan peramban', () => {
    expect([UA.chromeAndroid, UA.iphone, UA.ipad, UA.tabletAndroid, UA.edge].map(jenisPerangkat)).toEqual(['hp', 'hp', 'tablet', 'tablet', 'desktop'])
    expect([UA.chromeAndroid, UA.samsung, UA.iphone, UA.edge, UA.firefox, 'Mozilla/5.0 aneh sekali tanpa nama'].map(namaPeramban)).toEqual([
      'Chrome',
      'Samsung Internet',
      'Safari',
      'Edge',
      'Firefox',
      'Lainnya',
    ])
  })

  it('sidik berganti setiap hari dan tidak memuat IP', () => {
    const a = sidikKunjungan('203.0.113.9', UA.iphone, 'rahasia', '2026-11-10')
    expect(a).toHaveLength(24)
    expect(a).not.toContain('203')
    expect(sidikKunjungan('203.0.113.9', UA.iphone, 'rahasia', '2026-11-10')).toBe(a)
    expect(sidikKunjungan('203.0.113.9', UA.iphone, 'rahasia', '2026-11-11')).not.toBe(a)
    expect(sidikKunjungan('203.0.113.9', UA.chromeAndroid, 'rahasia', '2026-11-10')).not.toBe(a)
  })

  it('negara, kota, nama negara, dan bendera', () => {
    expect([rapikanNegara('id'), rapikanNegara('XX'), rapikanNegara('IDN'), rapikanNegara(null)]).toEqual(['ID', null, null, null])
    expect([rapikanKota('South%20Jakarta'), rapikanKota('%E0%A4%A'), rapikanKota('')]).toEqual(['South Jakarta', null, null])
    expect([namaNegara('ID'), namaNegara('SG'), namaNegara(null)]).toEqual(['Indonesia', 'Singapura', 'Tidak diketahui'])
    expect(benderaNegara('ID')).toBe('🇮🇩')
    expect(benderaNegara(null)).toBe('')
  })
})

describe('sumber kunjungan', () => {
  const situs = ['point.lat']
  it('mesin pencari, media sosial, asisten AI, situs lain, langsung, dan internal', () => {
    const cek = (perujuk: string | null, utm: string | null = null) => sumberKunjungan(perujuk, utm, situs)
    expect(cek('https://www.google.co.id/')).toEqual({ kanal: 'pencarian', sumber: 'Google', perujuk: 'google.co.id' })
    expect(cek('https://www.bing.com/search?q=gaji')).toMatchObject({ kanal: 'pencarian', sumber: 'Bing' })
    expect(cek('https://gemini.google.com/app')).toMatchObject({ kanal: 'ai', sumber: 'Gemini' })
    expect(cek('https://chatgpt.com/')).toMatchObject({ kanal: 'ai', sumber: 'ChatGPT' })
    expect(cek('https://www.perplexity.ai/search')).toMatchObject({ kanal: 'ai', sumber: 'Perplexity' })
    expect(cek('https://l.facebook.com/l.php?u=x')).toMatchObject({ kanal: 'sosial', sumber: 'Facebook', perujuk: 'l.facebook.com' })
    expect(cek('https://t.co/abc')).toMatchObject({ kanal: 'sosial', sumber: 'X' })
    expect(cek('https://kompas.com/read/1')).toEqual({ kanal: 'rujukan', sumber: 'kompas.com', perujuk: 'kompas.com' })
    expect(cek(null)).toEqual({ kanal: 'langsung', sumber: 'Langsung', perujuk: null })
    expect(cek('')).toMatchObject({ kanal: 'langsung' })
    expect(cek('https://www.point.lat/tools')).toMatchObject({ kanal: 'internal' })
  })

  it('aplikasi Android: Google (Discover) bukan Gmail atau YouTube', () => {
    const cek = (paket: string) => sumberKunjungan(`android-app://${paket}/`, null, situs)
    expect(cek('com.google.android.googlequicksearchbox')).toMatchObject({ kanal: 'pencarian', sumber: 'Google' })
    expect(cek('com.google.android.gm')).toMatchObject({ kanal: 'rujukan', sumber: 'Gmail' })
    expect(cek('com.google.android.youtube')).toMatchObject({ kanal: 'sosial', sumber: 'YouTube' })
    expect(cek('com.whatsapp')).toMatchObject({ kanal: 'sosial', sumber: 'WhatsApp' })
    expect(cek('id.aplikasi.lain')).toEqual({ kanal: 'rujukan', sumber: 'id.aplikasi.lain', perujuk: 'id.aplikasi.lain' })
  })

  it('utm_source mengalahkan perujuk', () => {
    expect(sumberKunjungan('https://www.google.com/', 'instagram', situs)).toMatchObject({ kanal: 'sosial', sumber: 'Instagram' })
    expect(sumberKunjungan(null, 'IG', situs)).toMatchObject({ kanal: 'sosial', sumber: 'Ig' })
    expect(sumberKunjungan(null, 'newsletter', situs)).toEqual({ kanal: 'kampanye', sumber: 'newsletter', perujuk: null })
  })
})

describe('kiriman beacon', () => {
  it('path publik saja, query dan garis miring akhir dibuang', () => {
    expect(rapikanPath('/gaji-bersih/?utm=1#a')).toBe('/gaji-bersih')
    expect(rapikanPath('/')).toBe('/')
    for (const p of ['/admin', '/admin/collections', '/api/kunjungan/catat', '/_next/static/x.js', '//evil.com', 'https://x.com/a', '/a b', 5, null])
      expect(rapikanPath(p), String(p)).toBeNull()
  })

  it('JSON { p, r, s } dengan batas ukuran', () => {
    expect(bacaKiriman(JSON.stringify({ p: '/tools', r: 'https://google.com/', s: 'fb' }))).toEqual({ path: '/tools', perujuk: 'https://google.com/', utm: 'fb' })
    expect(bacaKiriman(JSON.stringify({ p: '/tools', r: '', s: '' }))).toEqual({ path: '/tools', perujuk: null, utm: null })
    expect(bacaKiriman('bukan json')).toBeNull()
    expect(bacaKiriman(JSON.stringify({ p: '/admin' }))).toBeNull()
    expect(bacaKiriman(JSON.stringify({ p: `/${'a'.repeat(1100)}` }))).toBeNull()
  })

  it('skrip pelacak: lewati webdriver, GPC, dan DNT, kirim lewat sendBeacon, ikuti navigasi klien, lewati halaman 404', () => {
    const skrip = skripKunjungan()
    expect(skrip).toContain(JSON.stringify(PATH_CATAT))
    expect(skrip).toContain(`[${PENANDA_404}]`)
    for (const bagian of ['n.webdriver', 'globalPrivacyControl', 'doNotTrack', 'sendBeacon', 'pushState', 'popstate', 'utm_source']) expect(skrip).toContain(bagian)
    expect(skrip).not.toMatch(/cookie|localStorage/)
    expect(() => new Function(skrip)).not.toThrow()
  })
})

describe('rentang laporan', () => {
  const sekarang = new Date('2026-11-10T03:00:00.000Z') // 10.00 WIB
  it('tanggal WIB berganti pukul 00.00 WIB', () => {
    expect(tanggalWib(new Date('2026-11-09T16:59:59.000Z'))).toBe('2026-11-09')
    expect(tanggalWib(new Date('2026-11-09T17:00:00.000Z'))).toBe('2026-11-10')
    expect(panjangRentang('2026-11-01', '2026-11-30')).toBe(30)
    expect(daftarTanggal('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'])
  })

  it('pilihan bawaan 7 hari, Hari ini, 30 hari, dan Semua sejak data pertama', () => {
    expect(bacaRentang({}, sekarang)).toEqual({ jenis: '7', dari: '2026-11-04', sampai: '2026-11-10' })
    expect(bacaRentang({ kunjungan: 'hari-ini' }, sekarang)).toEqual({ jenis: 'hari-ini', dari: '2026-11-10', sampai: '2026-11-10' })
    expect(bacaRentang({ kunjungan: '30' }, sekarang)).toMatchObject({ dari: '2026-10-12', sampai: '2026-11-10' })
    expect(bacaRentang({ kunjungan: 'semua' }, sekarang, '2026-09-01')).toEqual({ jenis: 'semua', dari: '2026-09-01', sampai: '2026-11-10' })
    expect(bacaRentang({ kunjungan: 'semua' }, sekarang, null)).toMatchObject({ dari: '2026-11-10' })
    expect(bacaRentang({ kunjungan: 'aneh' }, sekarang)).toMatchObject({ jenis: '7' })
  })

  it('kalender: tertukar dibalik, masa depan dipotong ke hari ini, paling panjang 400 hari, tanggal cacat diabaikan', () => {
    expect(bacaRentang({ dari: '2026-11-05', sampai: '2026-11-01' }, sekarang)).toEqual({ jenis: 'kustom', dari: '2026-11-01', sampai: '2026-11-05' })
    expect(bacaRentang({ dari: '2026-11-08', sampai: '2027-01-01' }, sekarang)).toEqual({ jenis: 'kustom', dari: '2026-11-08', sampai: '2026-11-10' })
    expect(bacaRentang({ dari: '2026-12-01' }, sekarang)).toEqual({ jenis: 'kustom', dari: '2026-11-10', sampai: '2026-11-10' })
    const panjang = bacaRentang({ dari: '2020-01-01', sampai: '2026-11-10' }, sekarang)
    expect(panjangRentang(panjang.dari, panjang.sampai)).toBe(MAKS_RENTANG_HARI)
    expect(bacaRentang({ dari: '2026-13-45', sampai: 'x' }, sekarang)).toMatchObject({ jenis: '7' })
  })

  it('rentang sebelumnya sama panjang; Semua tanpa pembanding', () => {
    expect(rentangSebelumnya({ jenis: '7', dari: '2026-11-04', sampai: '2026-11-10' })).toMatchObject({ dari: '2026-10-28', sampai: '2026-11-03' })
    expect(rentangSebelumnya({ jenis: 'semua', dari: '2026-09-01', sampai: '2026-11-10' })).toBeNull()
  })

  it('parameter URL dan tautan CSV', () => {
    expect(paramRentang({ jenis: '7', dari: '2026-11-04', sampai: '2026-11-10' })).toEqual({})
    expect(paramRentang({ jenis: '30', dari: '2026-10-12', sampai: '2026-11-10' })).toEqual({ kunjungan: '30' })
    expect(paramRentang({ jenis: 'kustom', dari: '2026-11-01', sampai: '2026-11-05' })).toEqual({ dari: '2026-11-01', sampai: '2026-11-05' })
    expect(urlCsvKunjungan({ jenis: 'hari-ini', dari: '2026-11-10', sampai: '2026-11-10' })).toBe('/api/kunjungan/csv?dari=2026-11-10&sampai=2026-11-10')
  })
})

describe('CSV kunjungan', () => {
  it('kepala tetap, sel berisi koma dikutip, rumus spreadsheet dinetralkan', () => {
    const csv = isiCsvKunjungan([
      {
        tanggal: '2026-11-10',
        path: '/gaji-bersih',
        negara: 'ID',
        kota: 'Jakarta, Selatan',
        kanal: 'rujukan',
        sumber: '=HYPERLINK("x")',
        perujuk: null,
        perangkat: 'hp',
        peramban: 'Chrome',
        tayangan: 3,
        kunjungan: 1,
      },
    ])
    const [kepala, baris] = csv.trim().split(/\r?\n/)
    expect(kepala).toBe('tanggal,halaman,negara,kota,kanal,sumber,perujuk,perangkat,peramban,tayangan,kunjungan')
    expect(baris).toContain('"Jakarta, Selatan"')
    expect(baris).not.toMatch(/,=HYPERLINK/)
    expect(baris).toMatch(/,3,1$/)
  })
})

describe('grafik kunjungan', () => {
  it('satuan dari kunci titik, label sumbu paling banyak 7 dan titik terakhir berlabel', () => {
    expect(satuanSeri([{ kunci: '00', label: '', tayangan: 0, kunjungan: 0 }])).toBe('jam')
    expect(satuanSeri([{ kunci: '2026-11-01', label: '', tayangan: 0, kunjungan: 0 }])).toBe('hari')
    expect(satuanSeri([{ kunci: '2026-11', label: '', tayangan: 0, kunjungan: 0 }])).toBe('bulan')
    for (const n of [7, 24, 30, 92]) {
      const label = indeksLabel(n)
      expect(label.size, String(n)).toBeLessThanOrEqual(8)
      expect(label.has(n - 1)).toBe(true)
    }
    expect(labelTitik({ kunci: '14', label: '', tayangan: 0, kunjungan: 0 }, 'jam', 24, true)).toBe('pukul 14.00 sampai 14.59 WIB')
    expect(labelTitik({ kunci: '2026-11', label: '', tayangan: 0, kunjungan: 0 }, 'bulan', 5, true)).toBe('November 2026')
  })
})
