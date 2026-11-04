import { describe, expect, it } from 'vitest'

import { periksaParameter } from '@/modules/hitung'
import { kunciTanggal, teksAngka, teksTanggal } from '@/modules/hitung/format'
import { bacaMasukan } from '@/modules/hitung/masukan'
import { buatAturan, ParameterKosong } from '@/modules/hitung/parameter'
import type { DefinisiParameter, IsianAngka, IsianBaris, ParameterTersimpan } from '@/modules/hitung'

import { rp } from './hitung-bantu'

describe('format Indonesia', () => {
  it('rupiah, persen, satuan, dan desimal dengan koma', () => {
    expect(teksAngka(7_554_552, 'rupiah')).toBe(rp('Rp 7.554.552'))
    expect(teksAngka(-375_000, 'rupiah')).toBe('-' + rp('Rp 375.000'))
    expect(teksAngka(0.24, 'persen')).toBe('0,24%')
    expect(teksAngka(65.5, 'kg')).toBe('65,5 kg')
    expect(teksAngka(22.04, 'imt')).toBe('22,0')
    expect(teksAngka(3.5615, 'ipk')).toBe('3,56')
    expect(teksAngka(2058.2, 'kkal')).toBe('2.058 kkal')
    expect(teksAngka(9, 'kali')).toBe('9 kali')
  })

  it('tanggal kalender WIB dari waktu UTC yang disimpan Payload', () => {
    expect(kunciTanggal('2026-03-01T00:00:00.000Z')).toBe('2026-03-01')
    expect(kunciTanggal('2026-02-28T17:00:00.000Z')).toBe('2026-03-01')
    expect(kunciTanggal(new Date('2026-11-04T18:30:00.000Z'))).toBe('2026-11-05')
    expect(kunciTanggal('2026-11-05')).toBe('2026-11-05')
    expect(teksTanggal('2027-02-28')).toBe('28 Februari 2027')
  })
})

const berat: IsianAngka = { jenis: 'angka', kunci: 'berat', label: 'Berat badan', bantuan: null, satuan: 'kg', desimal: true, wajib: true, min: 20, maks: 300, contoh: '60' }
const usia: IsianAngka = { ...berat, kunci: 'usia', label: 'Usia', satuan: 'tahun', desimal: false, min: 18, maks: 100, contoh: '25' }
const matkul: IsianBaris = {
  jenis: 'baris',
  kunci: 'matkul',
  label: 'Mata kuliah',
  bantuan: null,
  labelBaris: 'Mata kuliah',
  maks: 30,
  contoh: [['3', 'A']],
  kolom: [
    { ...usia, kunci: 'sks', label: 'SKS', satuan: 'sks', min: 1, maks: 24, contoh: '3' },
    { jenis: 'pilihan', kunci: 'nilai', label: 'Nilai huruf', bantuan: null, opsi: [{ nilai: 'A', label: 'A' }, { nilai: 'B', label: 'B' }], contoh: 'A' },
  ],
}

describe('bacaMasukan', () => {
  it('desimal dengan koma atau titik, satuan di belakang angka diabaikan, angka bulat', () => {
    expect(bacaMasukan([berat, usia], { berat: '65,5 kg', usia: '30' })).toEqual({ nilai: { berat: 65.5, usia: 30 }, galat: {} })
    expect(bacaMasukan([berat], { berat: '65.5' }).nilai.berat).toBe(65.5)
    expect(bacaMasukan([usia], { usia: '30,5' }).galat).toEqual({ usia: 'Tulis usia dengan angka bulat, misalnya 25.' })
    expect(bacaMasukan([usia], { usia: '15' }).galat).toEqual({ usia: 'Usia paling sedikit 18 tahun.' })
    expect(bacaMasukan([berat], { berat: 'enam puluh' }).galat).toEqual({
      berat: 'Tulis berat badan dengan angka, misalnya 60. Pakai koma untuk desimal.',
    })
  })

  it('isian baris: baris kosong dilewati, galat per sel, minimal satu baris', () => {
    expect(bacaMasukan([matkul], { sks: ['3', '', '2'], nilai: ['A', '', 'B'] })).toEqual({ nilai: { sks: [3, 2], nilai: ['A', 'B'] }, galat: {} })
    expect(bacaMasukan([matkul], { sks: ['3', ''], nilai: ['A', 'B'] }).galat).toEqual({
      'sks.1': 'SKS mata kuliah 2 belum diisi. Tulis angkanya, misalnya 3.',
    })
    expect(bacaMasukan([matkul], { sks: ['3'], nilai: ['C'] }).galat).toEqual({ 'nilai.0': 'Pilih nilai huruf mata kuliah 1 dari daftar.' })
    expect(bacaMasukan([matkul], { sks: [''], nilai: [''] }).galat).toEqual({ 'sks.0': 'Isi minimal satu mata kuliah: SKS dan nilai huruf.' })
  })
})

const DEFINISI: DefinisiParameter[] = [
  { kunci: 'batas', label: 'Batas upah', jenis: 'angka', satuan: 'rupiah' },
  { kunci: 'tarif', label: 'Tarif', jenis: 'tabel', kolom: { batas: { judul: 'Sampai', satuan: 'rupiah' }, nilai: { judul: 'Tarif', satuan: 'persen' } } },
]
const doc = (nilai: number, berlakuMulai: string, berlakuSampai?: string): ParameterTersimpan => ({
  toolId: 'gaji-bersih',
  kunci: 'batas',
  nilai,
  berlakuMulai,
  berlakuSampai,
})

describe('pemilihan parameter sesuai tanggal', () => {
  const daftar = [doc(1, '2025-03-01', '2026-02-28'), doc(2, '2026-03-01'), doc(3, '2026-06-01', '2026-06-30')]

  it('memilih yang berlaku; bila tumpang tindih, yang mulai berlaku paling baru', () => {
    expect(buatAturan(DEFINISI, daftar, '2025-12-31').angka('batas')).toBe(1)
    expect(buatAturan(DEFINISI, daftar, '2026-03-01').angka('batas')).toBe(2)
    expect(buatAturan(DEFINISI, daftar, '2026-06-15').angka('batas')).toBe(3)
    expect(buatAturan(DEFINISI, daftar, '2026-07-01').angka('batas')).toBe(2)
  })

  it('sebelum semua parameter berlaku: yang paling awal, dengan peringatan', () => {
    const aturan = buatAturan(DEFINISI, daftar, '2024-01-01')
    expect(aturan.angka('batas')).toBe(1)
    expect(aturan.peringatan).toEqual([
      'Angka batas upah untuk 1 Januari 2024 belum diperbarui. Hitungan ini memakai angka yang berlaku 1 Maret 2025 sampai 28 Februari 2026.',
    ])
  })

  it('dokumen yang bentuknya tidak cocok diabaikan; tanpa dokumen sah melempar ParameterKosong', () => {
    const rusak = { ...doc(9, '2026-01-01'), nilai: null }
    expect(() => buatAturan(DEFINISI, [rusak], '2026-11-05').angka('batas')).toThrow(ParameterKosong)
    expect(buatAturan(DEFINISI, [rusak, doc(4, '2020-01-01')], '2026-11-05').angka('batas')).toBe(4)
  })
})

describe('periksaParameter (validasi CMS)', () => {
  const ter = (tabel: ParameterTersimpan['tabel']) => periksaParameter({ toolId: 'gaji-bersih', kunci: 'ter-a', tabel })

  it('kunci harus dikenal kalkulatornya', () => {
    expect(periksaParameter({ toolId: 'gaji-bersih', kunci: 'ptkp', nilai: 1 }).kunci).toMatch(/^Kunci "ptkp" tidak dipakai kalkulator ini\. Pilih salah satu: ptkp-dasar, ptkp-kawin/)
  })

  it('angka tunggal butuh nilai dan tabel kosong', () => {
    expect(periksaParameter({ toolId: 'gaji-bersih', kunci: 'jkk', nilai: 0.24 })).toEqual({})
    expect(periksaParameter({ toolId: 'gaji-bersih', kunci: 'jkk', nilai: null, tabel: [{ nilai: 1 }] })).toEqual({
      nilai: 'Isi nilai premi JKK dari kantor.',
      tabel: 'Parameter ini berupa satu angka. Kosongkan tabel dan isi Nilai.',
    })
  })

  it('tabel: kolom wajib, batas naik, batas boleh kosong hanya di baris terakhir', () => {
    expect(ter([{ batas: 100, nilai: 0 }, { batas: null, nilai: 1 }])).toEqual({})
    expect(ter([])).toEqual({ tabel: 'Isi baris tabel tarif efektif bulanan kategori A.' })
    expect(ter([{ batas: 100 }, { batas: null, nilai: 1 }])).toEqual({ tabel: 'Baris 1: isi kolom Tarif.' })
    expect(ter([{ batas: null, nilai: 0 }, { batas: null, nilai: 1 }])).toEqual({ tabel: 'Baris 1: isi kolom Bruto sebulan sampai.' })
    expect(ter([{ batas: 100, nilai: 0 }, { batas: 100, nilai: 1 }])).toEqual({
      tabel: 'Baris 2: Bruto sebulan sampai harus lebih besar dari baris sebelumnya.',
    })
  })
})
