import { describe, expect, it } from 'vitest'

import { hitung, periksaParameter, siapkanKalkulator } from '@/modules/hitung'
import { PARAMETER_AWAL } from '@/seed/parameter-tools'

import { berhasil, langkah, ringkasan } from './hitung-bantu'

const HARI_INI = '2026-11-05'

describe('BMI & Kalori', () => {
  const bmi = (masukan: Record<string, string>) => hitung('bmi-kalori', masukan, HARI_INI, PARAMETER_AWAL)
  const ringan = 'Ringan: kerja duduk, jarang olahraga'

  it('contoh form: 60 kg, 165 cm, 25 tahun, perempuan, aktivitas ringan', () => {
    const k = siapkanKalkulator('bmi-kalori', PARAMETER_AWAL, HARI_INI)
    expect(k.contoh).toEqual({ berat: '60', tinggi: '165', usia: '25', jenisKelamin: 'perempuan', aktivitas: ringan })
    const h = berhasil(hitung('bmi-kalori', k.contoh, HARI_INI, PARAMETER_AWAL))
    // IMT 60 / 1,65^2 = 22,04; energi basal 10 x 60 + 6,25 x 165 - 5 x 25 - 161 = 1.345,25; x 1,53 = 2.058.
    expect(h.utama).toMatchObject({ label: 'IMT kamu', teks: '22,0', keterangan: 'Kategori: normal.' })
    expect(ringkasan(h, 'Energi basal')).toBe(1_345)
    expect(ringkasan(h, 'Kebutuhan kalori per hari')).toBe(2_058)
    expect(h.ringkasan.find((a) => a.label === 'Berat badan normal untuk tinggimu')?.teks).toBe('50,4 sampai 68,1 kg')
  })

  it('Mifflin-St Jeor: laki-laki 166 kkal lebih tinggi dari perempuan dengan data sama', () => {
    const dasar = { berat: '70', tinggi: '175', usia: '30', aktivitas: ringan }
    const pria = ringkasan(berhasil(bmi({ ...dasar, jenisKelamin: 'laki-laki' })), 'Energi basal')
    const wanita = ringkasan(berhasil(bmi({ ...dasar, jenisKelamin: 'perempuan' })), 'Energi basal')
    expect(pria).toBe(1_649)
    expect((pria ?? 0) - (wanita ?? 0)).toBe(166)
  })

  it('batas kategori IMT dewasa Indonesia: batas atas termasuk setelah dibulatkan satu desimal', () => {
    // Tinggi 200 cm: IMT = berat / 4.
    const kategori = (berat: string) => langkah(berhasil(bmi({ berat, tinggi: '200', usia: '30', jenisKelamin: 'perempuan', aktivitas: ringan })), 'Kategori')
    expect(['67,6', '68', '73,6', '74', '100', '100,4', '108', '108,4'].map(kategori)).toEqual([
      'Sangat kurus',
      'Kurus',
      'Kurus',
      'Normal',
      'Normal',
      'Gemuk',
      'Gemuk',
      'Obesitas',
    ])
  })

  it('usia di bawah 18 tahun ditolak dengan penjelasan', () => {
    expect(bmi({ berat: '50', tinggi: '160', usia: '16', jenisKelamin: 'perempuan', aktivitas: ringan })).toEqual({
      ok: false,
      pesan: null,
      galat: { usia: 'Usia paling sedikit 18 tahun.' },
    })
  })
})

describe('IPK', () => {
  const ipk = (masukan: Record<string, string | string[]>) => hitung('ipk', masukan, HARI_INI, PARAMETER_AWAL)

  it('rata-rata berbobot SKS: contoh form 13 SKS, mutu 46,3, IPK 3,56', () => {
    const k = siapkanKalkulator('ipk', PARAMETER_AWAL, HARI_INI)
    expect(k.contoh).toEqual({ sks: ['3', '3', '2', '3', '2'], nilai: ['A', 'B+', 'A-', 'B', 'A'], ipkLama: '', sksLama: '' })
    const h = berhasil(hitung('ipk', k.contoh, HARI_INI, PARAMETER_AWAL))
    expect(h.utama).toMatchObject({ label: 'IPK', teks: '3,56', keterangan: 'Dari 13 SKS yang kamu isi.' })
    expect(ringkasan(h, 'Total mutu')).toBe(46.3)
    expect(langkah(h, 'Mata kuliah 2: 3 SKS, nilai B+')).toBe('9,9')
  })

  it('digabung dengan IPK sebelumnya: (3,40 x 40 + 46,3) / 53 = 3,44', () => {
    const h = berhasil(ipk({ sks: ['3', '3', '2', '3', '2'], nilai: ['A', 'B+', 'A-', 'B', 'A'], ipkLama: '3,40', sksLama: '40' }))
    expect(h.utama).toMatchObject({ label: 'IPK baru', teks: '3,44', keterangan: 'Gabungan 53 SKS.' })
    expect(ringkasan(h, 'IP semester ini')).toBe(3.56)
  })

  it('IPK sebelumnya dan SKS sebelumnya harus diisi berdua', () => {
    expect(ipk({ sks: ['3'], nilai: ['A'], ipkLama: '3,4', sksLama: '' })).toEqual({
      ok: false,
      pesan: null,
      galat: { sksLama: 'Isi SKS yang sudah ditempuh, atau kosongkan IPK sebelumnya.' },
    })
    expect(ipk({ sks: ['3'], nilai: ['A'], ipkLama: '4,5', sksLama: '40' })).toMatchObject({ galat: { ipkLama: 'IPK sebelumnya paling banyak 4,00.' } })
    expect(ipk({ sks: ['3'], nilai: ['A'], ipkLama: 'tiga', sksLama: '40' })).toMatchObject({
      galat: { ipkLama: 'Tulis IPK sebelumnya dengan angka, misalnya 3,40. Pakai koma untuk desimal.' },
    })
  })

  it('pilihan nilai huruf dan validasi CMS dari tabel konversi', () => {
    const k = siapkanKalkulator('ipk', PARAMETER_AWAL, HARI_INI)
    const baris = k.isian.find((i) => i.jenis === 'baris')
    expect(baris?.jenis === 'baris' && baris.kolom[1].opsi.map((o) => o.nilai)).toEqual(['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'E'])
    expect(periksaParameter({ toolId: 'ipk', kunci: 'konversi-nilai', tabel: [{ label: 'A' }] })).toEqual({ tabel: 'Baris 1: isi kolom Angka mutu.' })
  })
})

describe('semua parameter awal sah', () => {
  it('setiap dokumen seed lolos validasi CMS', () => {
    expect(PARAMETER_AWAL.map((p) => [p.kunci, periksaParameter(p)]).filter(([, g]) => Object.keys(g).length > 0)).toEqual([])
    expect(PARAMETER_AWAL).toHaveLength(22)
  })
})
