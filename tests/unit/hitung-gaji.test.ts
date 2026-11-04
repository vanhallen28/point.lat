import { describe, expect, it } from 'vitest'

import { hitung, siapkanKalkulator } from '@/modules/hitung'
import { PARAMETER_AWAL } from '@/seed/parameter-tools'

import { berhasil, langkah, ringkasan, rp } from './hitung-bantu'

const HARI_INI = '2026-11-05'
const tanpaBpjs = { bpjsKesehatan: '', bpjsKetenagakerjaan: '' }
const gaji = (masukan: Record<string, string>, tanggal = HARI_INI) => hitung('gaji-bersih', masukan, tanggal, PARAMETER_AWAL)

describe('Gaji Bersih: contoh resmi DJP', () => {
  it('leaflet PPh 21 TER (Tuan R, K/0, gaji Rp15.000.000, iuran pensiun Rp150.000): 900.000 per bulan, Desember 1.155.000', () => {
    const h = berhasil(gaji({ gaji: '15.000.000', status: 'K/0', ...tanpaBpjs, iuranLain: '150.000' }))
    expect(langkah(h, 'Kategori TER')).toBe('A (status K/0)')
    expect(langkah(h, 'Tarif efektif bulanan')).toBe('6%')
    expect(ringkasan(h, 'PPh 21 per bulan')).toBe(900_000)
    expect(langkah(h, 'Biaya jabatan 5%')).toBe(rp('Rp 6.000.000'))
    expect(langkah(h, 'Penghasilan neto setahun')).toBe(rp('Rp 172.200.000'))
    expect(langkah(h, 'PTKP K/0')).toBe(rp('Rp 58.500.000'))
    expect(langkah(h, 'Penghasilan kena pajak')).toBe(rp('Rp 113.700.000'))
    expect(ringkasan(h, 'PPh 21 setahun')).toBe(11_055_000)
    expect(langkah(h, 'Sudah dipotong Januari sampai November')).toBe(rp('Rp 9.900.000'))
    expect(langkah(h, 'PPh 21 Desember')).toBe(rp('Rp 1.155.000'))
  })

  it('penjelasan DJP (gaji Rp10.000.000, K/0, iuran pensiun Rp100.000): TER 2% = 200.000, setahun 2.715.000, Desember 515.000', () => {
    const h = berhasil(gaji({ gaji: '10.000.000', status: 'K/0', ...tanpaBpjs, iuranLain: '100.000' }))
    expect(langkah(h, 'Tarif efektif bulanan')).toBe('2%')
    expect(ringkasan(h, 'PPh 21 per bulan')).toBe(200_000)
    expect(langkah(h, 'Penghasilan kena pajak')).toBe(rp('Rp 54.300.000'))
    expect(ringkasan(h, 'PPh 21 setahun')).toBe(2_715_000)
    expect(langkah(h, 'PPh 21 Desember')).toBe(rp('Rp 515.000'))
    expect(h.utama.nilai).toBe(10_000_000 - 200_000 - 100_000)
  })
})

describe('Gaji Bersih: premi dan iuran BPJS', () => {
  it('Rp8.000.000 TK/0: premi kantor masuk bruto, iuran karyawan 4%, gaji bersih dan Desember', () => {
    const h = berhasil(gaji({ gaji: '8.000.000', status: 'TK/0', bpjsKesehatan: 'ya', bpjsKetenagakerjaan: 'ya' }))
    // Bruto = 8.000.000 + JKK 0,24% (19.200) + JKM 0,3% (24.000) + BPJS Kesehatan 4% (320.000).
    expect(langkah(h, 'Penghasilan bruto')).toBe(rp('Rp 8.363.200'))
    expect(langkah(h, 'Tarif efektif bulanan')).toBe('1,5%')
    expect(ringkasan(h, 'PPh 21 per bulan')).toBe(125_448)
    expect(ringkasan(h, 'Iuran yang dipotong')).toBe(80_000 + 160_000 + 80_000)
    expect(h.utama).toMatchObject({ label: 'Gaji bersih per bulan', nilai: 7_554_552, teks: rp('Rp 7.554.552') })
    // Setahun: bruto 100.358.400, biaya jabatan 5.017.920, JHT+JP 2.880.000, PTKP 54.000.000, PKP 38.460.000.
    expect(langkah(h, 'Penghasilan kena pajak')).toBe(rp('Rp 38.460.000'))
    expect(ringkasan(h, 'PPh 21 setahun')).toBe(1_923_000)
    expect(langkah(h, 'PPh 21 Desember')).toBe(rp('Rp 543.072'))
    expect(ringkasan(h, 'Gaji bersih Desember')).toBe(7_136_928)
    expect(h.peringatan).toEqual([])
  })

  it('batas upah BPJS Kesehatan Rp12 juta dan batas upah JP sesuai tanggal berlaku', () => {
    const masukan = { gaji: '20.000.000', status: 'K/1', bpjsKesehatan: 'ya', bpjsKetenagakerjaan: 'ya' }
    const sekarang = berhasil(gaji(masukan))
    expect(langkah(sekarang, 'BPJS Kesehatan 1%')).toBe(rp('Rp 120.000'))
    expect(langkah(sekarang, 'Jaminan Pensiun 1%')).toBe(rp('Rp 110.863'))
    expect(langkah(sekarang, 'Kategori TER')).toBe('B (status K/1)')
    const februari = berhasil(gaji(masukan, '2026-02-15'))
    expect(langkah(februari, 'Jaminan Pensiun 1%')).toBe(rp('Rp 105.474'))
  })

  it('tanpa parameter yang berlaku memakai parameter terakhir yang valid dengan peringatan', () => {
    const h = berhasil(gaji({ gaji: '20.000.000', status: 'TK/0', bpjsKesehatan: 'ya', bpjsKetenagakerjaan: 'ya' }, '2027-03-15'))
    expect(langkah(h, 'Jaminan Pensiun 1%')).toBe(rp('Rp 110.863'))
    expect(h.peringatan).toEqual([
      'Angka batas upah iuran JP untuk 15 Maret 2027 belum diperbarui. Hitungan ini memakai angka yang berlaku 1 Maret 2026 sampai 28 Februari 2027.',
    ])
  })

  it('PPh 21 Desember minus menjadi kelebihan potong yang dikembalikan', () => {
    const h = berhasil(gaji({ gaji: '6.000.000', status: 'TK/0', ...tanpaBpjs, iuranLain: '1.000.000' }))
    expect(langkah(h, 'PPh 21 Desember')).toBe('-' + rp('Rp 375.000'))
    expect(h.rincian.flatMap((b) => b.langkah).find((l) => l.label === 'PPh 21 Desember')?.catatan).toMatch(/kelebihan potong/)
  })
})

describe('Gaji Bersih: tabel TER dan isian', () => {
  it('tabel TER sesuai lampiran PP 58/2023: 44, 40, dan 41 baris; batas atas termasuk', () => {
    const jumlah = ['ter-a', 'ter-b', 'ter-c'].map((k) => PARAMETER_AWAL.find((p) => p.kunci === k)?.tabel?.length)
    expect(jumlah).toEqual([44, 40, 41])
    const tarif = (bruto: string) => langkah(berhasil(gaji({ gaji: bruto, status: 'TK/0', ...tanpaBpjs })), 'Tarif efektif bulanan')
    expect(tarif('5.400.000')).toBe('0%')
    expect(tarif('5.400.001')).toBe('0,25%')
    expect(tarif('1.400.000.001')).toBe('34%')
  })

  it('pesan galat di bawah field: kosong, bukan angka, terlalu besar, status di luar daftar', () => {
    expect(gaji({ gaji: '', status: 'TK/0' })).toEqual({
      ok: false,
      pesan: null,
      galat: { gaji: 'Gaji pokok dan tunjangan tetap per bulan belum diisi. Tulis angkanya, misalnya 8.000.000.' },
    })
    const galat = (masukan: Record<string, string>) => {
      const h = gaji(masukan)
      return h.ok ? null : h.galat
    }
    expect(galat({ gaji: 'delapan juta', status: 'TK/0' })?.gaji).toBe(
      'Tulis gaji pokok dan tunjangan tetap per bulan dengan angka saja, misalnya 8.000.000.',
    )
    expect(galat({ gaji: '20.000.000.000', status: 'TK/0' })?.gaji).toBe(
      `Gaji pokok dan tunjangan tetap per bulan paling banyak ${rp('Rp 10.000.000.000')}.`,
    )
    expect(galat({ gaji: '8.000.000', status: 'K/4' })).toEqual({ status: 'Pilih status PTKP dari daftar.' })
    expect(ringkasan(berhasil(gaji({ gaji: 'Rp 8.000.000', status: 'TK/0' })), 'PPh 21 per bulan')).toBe(
      ringkasan(berhasil(gaji({ gaji: '8000000', status: 'TK/0' })), 'PPh 21 per bulan'),
    )
  })

  it('tanpa parameter di CMS: pesan, bukan hasil', () => {
    expect(hitung('gaji-bersih', { gaji: '8.000.000', status: 'TK/0' }, HARI_INI, [])).toEqual({
      ok: false,
      galat: {},
      pesan: 'Kalkulator ini sedang diperbarui: angka batas upah iuran BPJS Kesehatan belum tersedia. Coba lagi nanti.',
    })
  })

  it('siapkanKalkulator: isian, contoh, tombol, dan angka aturan yang berlaku', () => {
    const k = siapkanKalkulator('gaji-bersih', PARAMETER_AWAL, HARI_INI)
    expect(k.isian.map((i) => [i.kunci, i.lanjutan ?? false])).toEqual([
      ['gaji', false],
      ['status', false],
      ['tunjanganLain', true],
      ['bpjsKesehatan', true],
      ['bpjsKetenagakerjaan', true],
      ['iuranLain', true],
    ])
    expect(k.contoh).toEqual({ gaji: '8.000.000', status: 'TK/0', tunjanganLain: '0', bpjsKesehatan: 'ya', bpjsKetenagakerjaan: 'ya', iuranLain: '0' })
    expect(k.tombol).toBe('Hitung gaji bersih')
    expect(k.pesan).toBeNull()
    const terA = k.dasar.find((d) => d.kunci === 'ter-a')
    expect(terA).toMatchObject({ label: 'Tarif efektif bulanan kategori A', berlaku: 'mulai 1 Januari 2024', kolom: ['Bruto sebulan sampai', 'Tarif'] })
    expect(terA?.jenis === 'tabel' && terA.baris.at(-1)).toEqual(['tanpa batas', '34%'])
    expect(k.dasar.find((d) => d.kunci === 'jp-batas')).toMatchObject({
      jenis: 'angka',
      teks: rp('Rp 11.086.300'),
      berlaku: '1 Maret 2026 sampai 28 Februari 2027',
    })
    expect(k.dasar).toHaveLength(17)
  })
})
