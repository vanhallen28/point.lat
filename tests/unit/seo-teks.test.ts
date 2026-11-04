import { describe, expect, it } from 'vitest'

import { gambarIsi, isiDenganMedia, judulBagian, tautanIsi, teksIsi } from '@/modules/seo/lexical'
import {
  hitungKata,
  mengandungFrasa,
  normalisasi,
  pecahKalimat,
  potongKata,
  rataPanjangKalimat,
} from '@/modules/seo/teks'

import { h, isiLexical, p, tautan, tautanInternal, unggahan } from './seo-contoh'

describe('normalisasi', () => {
  it('huruf kecil, tanpa diakritik, tanda baca jadi spasi', () => {
    expect(normalisasi('  Cara Hitung THR: Gaji Pokok + Tunjangan  ')).toBe('cara hitung thr gaji pokok tunjangan')
    expect(normalisasi('Café & résumé')).toBe('cafe resume')
    expect(normalisasi('Rp5.000.000')).toBe('rp5 000 000')
  })
})

describe('hitungKata dan kalimat', () => {
  it('menghitung kata yang berisi huruf atau angka', () => {
    expect(hitungKata('Gaji bersih Rp5.000.000 per bulan , ya')).toBe(6)
    expect(hitungKata('   ')).toBe(0)
  })

  it('memecah kalimat di titik, tanda tanya, tanda seru, dan baris baru tanpa memecah angka', () => {
    expect(pecahKalimat('Gaji kamu Rp5.000.000. Berapa pajaknya? Hitung di sini\nLangkah kedua')).toEqual([
      'Gaji kamu Rp5.000.000.',
      'Berapa pajaknya?',
      'Hitung di sini',
      'Langkah kedua',
    ])
  })

  it('rata-rata panjang kalimat dalam kata', () => {
    expect(rataPanjangKalimat('Satu dua tiga. Empat lima.')).toBe(2.5)
    expect(rataPanjangKalimat('')).toBe(0)
  })
})

describe('potongKata', () => {
  it('memotong di batas kata dan menambah elipsis', () => {
    expect(potongKata('Potongan PPh 21 dan BPJS dihitung langkah demi langkah', 30)).toBe('Potongan PPh 21 dan BPJS...')
    expect(potongKata('Pendek saja', 30)).toBe('Pendek saja')
    expect(potongKata('  spasi   ganda  ', 30)).toBe('spasi ganda')
  })
})

describe('mengandungFrasa', () => {
  it('mencocokkan frasa utuh tanpa peduli huruf besar dan tanda baca', () => {
    expect(mengandungFrasa('Cara Hitung Gaji Bersih, lengkap', 'gaji bersih')).toBe(true)
    expect(mengandungFrasa('Penggajian bersih', 'gaji bersih')).toBe(false)
    expect(mengandungFrasa('apa saja', '')).toBe(false)
  })
})

describe('membaca isi Lexical', () => {
  const isi = isiLexical([
    p('Paragraf pembuka dengan ', tautan('https://pajak.go.id/pph21', 'aturan DJP'), '.'),
    h('h2', 'Cara menghitung'),
    p('Lihat ', tautanInternal(42, 'artikel THR'), ' dan ', tautan('/tools/gaji-bersih', 'kalkulator'), '.'),
    h('h3', 'Contoh'),
    unggahan({ id: 7, alt: 'Slip gaji', width: 1600 }),
    p(tautan('https://point.lat/glosarium/ptkp', 'PTKP'), ' dan ', tautan('#contoh', 'lompat')),
  ])

  it('teks per blok, termasuk teks di dalam tautan', () => {
    expect(teksIsi(isi)).toEqual([
      'Paragraf pembuka dengan aturan DJP.',
      'Cara menghitung',
      'Lihat artikel THR dan kalkulator.',
      'Contoh',
      'PTKP dan lompat',
    ])
  })

  it('daftar subjudul dengan levelnya', () => {
    expect(judulBagian(isi)).toEqual([
      { level: 2, teks: 'Cara menghitung' },
      { level: 3, teks: 'Contoh' },
    ])
  })

  it('tautan internal dan eksternal; tautan jangkar diabaikan', () => {
    expect(tautanIsi(isi, 'https://point.lat')).toEqual([
      { internal: false, url: 'https://pajak.go.id/pph21', teks: 'aturan DJP' },
      { internal: true, docId: 42, relationTo: 'artikel', teks: 'artikel THR' },
      { internal: true, url: '/tools/gaji-bersih', teks: 'kalkulator' },
      { internal: true, url: 'https://point.lat/glosarium/ptkp', teks: 'PTKP' },
    ])
  })

  it('gambar di dalam isi', () => {
    expect(gambarIsi(isi)).toEqual([{ id: 7, alt: 'Slip gaji', width: 1600 }])
  })

  it('melengkapi node gambar yang baru berisi ID dengan dokumen media', () => {
    const mentah = isiLexical([p('Pembuka'), unggahan(9), unggahan(10)])
    const terisi = isiDenganMedia(mentah, { 9: { id: 9, alt: 'Grafik', width: 1400 } })
    expect(gambarIsi(terisi)).toEqual([{ id: 9, alt: 'Grafik', width: 1400 }, { id: 10 }])
    expect(gambarIsi(mentah)).toEqual([{ id: 9 }, { id: 10 }])
  })

  it('isi kosong atau tidak valid', () => {
    expect(teksIsi(null)).toEqual([])
    expect(judulBagian(undefined)).toEqual([])
    expect(tautanIsi({ root: { children: [] } }, 'https://point.lat')).toEqual([])
  })
})
