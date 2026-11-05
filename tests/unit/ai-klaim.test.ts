import { describe, expect, it } from 'vitest'

import { periksaKlaim } from '@/modules/ai/klaim'
import { blokArtikel } from '@/modules/ai/teks'

import { h, isiLexical, p, tautan } from './seo-contoh'

const SUMBER = [
  { judul: 'Peraturan Pemerintah 58 Tahun 2023', url: 'https://peraturan.bpk.go.id/Details/267431', penerbit: 'JDIH BPK' },
  { judul: 'Tarif efektif rata-rata PPh 21', url: 'https://www.pajak.go.id/id/ter', penerbit: 'DJP' },
  { judul: '', url: '', penerbit: '' },
]

const cek = (sumber: Parameters<typeof periksaKlaim>[1], ...isi: Record<string, unknown>[]) => periksaKlaim(blokArtikel({ isi: isiLexical(isi) }), sumber)

describe('cek klaim', () => {
  it('kalimat berangka atau beratribusi diperiksa: bertaut, menyebut sumber, atribusi kabur, atau tanpa sumber', () => {
    const hasil = cek(
      SUMBER,
      h('h2', 'Tarif PPh 21 tahun 2024'),
      p('Sejak 2024 pemotongan memakai ', tautan('https://www.pajak.go.id/id/ter', 'tarif efektif rata-rata'), '. PPh 21 dipotong tiap bulan.'),
      p('Menurut DJP, sekitar 60 persen karyawan memakai kategori TER A.'),
      p('Para ahli menyarankan dana darurat enam kali gaji.'),
      p('Gaji Rp10.000.000 dipotong sekitar Rp700.000 untuk iuran BPJS.'),
    )
    expect(hasil.klaim.map((k) => [k.letak, k.pemicu, k.status])).toEqual([
      ['Paragraf 1', ['tanggal'], 'bertaut'],
      ['Paragraf 2', ['persen', 'atribusi'], 'cocok-sumber'],
      ['Paragraf 3', ['atribusi'], 'atribusi-kabur'],
      ['Paragraf 4', ['rupiah', 'jumlah'], 'tanpa-sumber'],
    ])
    expect(hasil.klaim.map((k) => k.alasan)).toEqual([
      'Bertaut ke sumber lewat "tarif efektif rata-rata".',
      'Menyebut sumber di blok Sumber (DJP). Pastikan angkanya sama dengan sumbernya.',
      '"Para ahli" tidak menyebut siapa. Tulis nama lembaga atau penelitinya, tahunnya, dan tautkan sumbernya.',
      'Belum terhubung ke sumber. Tautkan sumbernya di kalimat ini, atau sebut penerbitnya seperti di blok Sumber.',
    ])
    expect(hasil.perluDicek).toBe(2)
    expect(hasil.jumlahSumber).toBe(2)
  })

  it('tanpa blok Sumber: setiap klaim tanpa tautan diminta sumbernya', () => {
    const hasil = cek(null, p('Inflasi Oktober 2026 tercatat 2,1% secara tahunan. Penelitian menunjukkan tidur 7 jam cukup.'))
    expect(hasil.klaim.map((k) => [k.pemicu, k.status, k.alasan])).toEqual([
      [['persen', 'tanggal'], 'tanpa-sumber', 'Belum ada sumber. Isi blok Sumber dan tautkan sumbernya di kalimat ini.'],
      [['jumlah', 'atribusi'], 'atribusi-kabur', '"Penelitian menunjukkan" tidak menyebut siapa. Tulis nama lembaga atau penelitinya, tahunnya, dan tautkan sumbernya.'],
    ])
    expect(hasil).toMatchObject({ perluDicek: 2, jumlahSumber: 0 })
  })

  it('judul sumber juga dihitung; kalimat tanpa angka dan tanpa atribusi tidak ditandai', () => {
    const hasil = cek(SUMBER, p('Peraturan Pemerintah 58 Tahun 2023 mengatur tarif itu. Cek slip gajimu setiap bulan. PPh 21 memakai formulir 1721 A1.'))
    expect(hasil.klaim.map((k) => [k.kutipan, k.status])).toEqual([['Peraturan Pemerintah 58 Tahun 2023 mengatur tarif itu.', 'cocok-sumber']])
  })

  it('deck, Intinya, dan jawaban FAQ ikut diperiksa', () => {
    const hasil = periksaKlaim(
      blokArtikel({ deck: 'THR wajib dibayar paling lambat 7 hari sebelum Lebaran.', intinya: [{ poin: 'Besarnya 1 bulan gaji.' }], faq: [{ jawaban: 'Denda 5% dari total THR.' }] }),
      [],
    )
    expect(hasil.klaim.map((k) => [k.letak, k.status])).toEqual([
      ['Deck', 'tanpa-sumber'],
      ['FAQ 1', 'tanpa-sumber'],
    ])
  })
})
