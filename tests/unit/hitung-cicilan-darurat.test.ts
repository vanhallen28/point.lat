import { describe, expect, it } from 'vitest'

import { hitung, siapkanKalkulator, type ParameterTersimpan } from '@/modules/hitung'
import { PARAMETER_AWAL } from '@/seed/parameter-tools'

import { berhasil, langkah, ringkasan, rp } from './hitung-bantu'

const HARI_INI = '2026-11-05'

describe('Cicilan & KPR', () => {
  const kpr = (masukan: Record<string, string>) => hitung('cicilan-kpr', masukan, HARI_INI, PARAMETER_AWAL)

  it('anuitas, contoh Kompas: pokok Rp120.000.000, bunga 11%, 120 bulan: cicilan Rp1.653.000, bunga bulan pertama Rp1.100.000', () => {
    const h = berhasil(kpr({ harga: '120.000.000', uangMuka: '0', bunga: '11', tenor: '10', metode: 'anuitas' }))
    expect(h.utama.nilai).toBe(1_653_000)
    expect(langkah(h, 'Bunga bulan pertama')).toBe(rp('Rp 1.100.000'))
    expect(langkah(h, 'Pokok bulan pertama')).toBe(rp('Rp 553.000'))
    expect(ringkasan(h, 'Total yang dibayar')).toBe(1_653_000 * 120)
  })

  it('flat: bunga dari pokok awal, Rp1.000.000 pokok + Rp1.100.000 bunga', () => {
    const h = berhasil(kpr({ harga: '120.000.000', uangMuka: '0', bunga: '11', tenor: '10', metode: 'flat' }))
    expect(h.utama.nilai).toBe(2_100_000)
    expect(langkah(h, 'Bunga setiap bulan')).toBe(rp('Rp 1.100.000'))
    expect(ringkasan(h, 'Total bunga')).toBe(132_000_000)
  })

  it('contoh form: harga Rp500.000.000, uang muka 20%, bunga 7,5%, 15 tahun', () => {
    const k = siapkanKalkulator('cicilan-kpr', PARAMETER_AWAL, HARI_INI)
    expect(k.tombol).toBe('Hitung cicilan')
    expect(k.dasar).toEqual([])
    const h = berhasil(hitung('cicilan-kpr', k.contoh, HARI_INI, []))
    expect(ringkasan(h, 'Pokok pinjaman')).toBe(400_000_000)
    expect(h.utama.nilai).toBe(3_708_049)
    expect(langkah(h, 'Bunga per bulan')).toBe('0,625%')
    expect(h.utama.keterangan).toBe('Selama 180 bulan dengan bunga anuitas 7,5% per tahun yang tetap.')
  })

  it('bunga 0: pokok dibagi rata; uang muka 100% ditolak', () => {
    expect(berhasil(kpr({ harga: '12.000.000', uangMuka: '0', bunga: '0', tenor: '1', metode: 'anuitas' })).utama.nilai).toBe(1_000_000)
    expect(kpr({ harga: '12.000.000', uangMuka: '100', bunga: '0', tenor: '1', metode: 'flat' })).toEqual({
      ok: false,
      pesan: null,
      galat: { uangMuka: 'Uang muka paling banyak 99%.' },
    })
  })
})

describe('Dana Darurat', () => {
  const darurat = (masukan: Record<string, string>, parameter: ParameterTersimpan[] = PARAMETER_AWAL) =>
    hitung('dana-darurat', masukan, HARI_INI, parameter)

  it('lajang 6 kali pengeluaran (OJK); kekurangan dibagi jangka, dibulatkan ke atas', () => {
    const h = berhasil(darurat({ pengeluaran: '5.000.000', kondisi: 'Lajang tanpa tanggungan', terkumpul: '5.000.000', jangka: '12' }))
    expect(h.utama).toMatchObject({ nilai: 30_000_000, keterangan: '6 kali pengeluaran wajib sebulan.' })
    expect(ringkasan(h, 'Sudah terkumpul')).toBe(16)
    expect(ringkasan(h, 'Kekurangan')).toBe(25_000_000)
    expect(ringkasan(h, 'Sisihkan per bulan')).toBe(2_083_334)
  })

  it('berkeluarga 9 dan 12 kali; target tercapai tanpa setoran', () => {
    expect(berhasil(darurat({ pengeluaran: '8.000.000', kondisi: 'Menikah tanpa anak', jangka: '24' })).utama.nilai).toBe(72_000_000)
    const h = berhasil(darurat({ pengeluaran: '8.000.000', kondisi: 'Menikah dengan anak atau punya tanggungan', terkumpul: '100.000.000', jangka: '6' }))
    expect(h.utama).toMatchObject({ nilai: 96_000_000, keterangan: 'Dana daruratmu sudah mencapai target.' })
    expect(ringkasan(h, 'Sisihkan per bulan')).toBe(0)
  })

  it('pilihan kondisi berasal dari tabel parameter, jadi bisa diubah dari CMS', () => {
    const ubahan: ParameterTersimpan[] = [
      { toolId: 'dana-darurat', kunci: 'kelipatan', berlakuMulai: '2026-01-01', tabel: [{ label: 'Pekerja lepas', nilai: 12 }] },
    ]
    const k = siapkanKalkulator('dana-darurat', ubahan, HARI_INI)
    expect(k.isian.find((i) => i.kunci === 'kondisi')).toMatchObject({ opsi: [{ nilai: 'Pekerja lepas', label: 'Pekerja lepas' }], contoh: 'Pekerja lepas' })
    expect(berhasil(darurat({ pengeluaran: '4.000.000', kondisi: 'Pekerja lepas', jangka: '12' }, ubahan)).utama.nilai).toBe(48_000_000)
    expect(darurat({ pengeluaran: '4.000.000', kondisi: 'Lajang tanpa tanggungan', jangka: '12' }, ubahan)).toEqual({
      ok: false,
      pesan: null,
      galat: { kondisi: 'Pilih kondisimu dari daftar.' },
    })
  })

  it('tanpa tabel kelipatan: kalkulator tidak bisa dipakai, dengan pesan', () => {
    expect(siapkanKalkulator('dana-darurat', [], HARI_INI)).toMatchObject({
      isian: [],
      pesan: 'Kalkulator ini sedang diperbarui: angka kelipatan dana darurat belum tersedia. Coba lagi nanti.',
    })
  })
})
