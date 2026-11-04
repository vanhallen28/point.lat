import { describe, expect, it } from 'vitest'

import { cariKanibalisasi, jaccard, kataKunci, sarankanLink, tingkatMirip, type ArtikelLain } from '@/modules/seo/kemiripan'

const lain: ArtikelLain[] = [
  { id: 1, judul: 'Gaji bersih 2025', path: '/gaji-bersih-2025', pilarId: 1, keyphrase: 'Gaji Bersih 2025' },
  { id: 2, judul: 'Gaji bersih karyawan', path: '/gaji-bersih-karyawan', pilarId: 1, keyphrase: 'gaji bersih karyawan' },
  { id: 3, judul: 'Cara hitung PPh 21', path: '/pph-21', pilarId: 1, keyphrase: 'hitung pph 21', keyphraseSekunder: ['potongan gaji'] },
  { id: 4, judul: 'Tabungan darurat', path: '/dana-darurat', pilarId: 1, keyphrase: 'dana darurat' },
  { id: 5, judul: 'Belajar Python', path: '/python', pilarId: 2, keyphrase: 'belajar python' },
  { id: 6, judul: 'BPJS Kesehatan', path: '/bpjs', pilarId: 4, keyphrase: 'iuran bpjs', keyphraseSekunder: ['gaji'] },
]

describe('kataKunci dan jaccard', () => {
  it('membuang kata umum dan angka tahun', () => {
    expect([...kataKunci('Cara Hitung Gaji Bersih 2026 untuk Karyawan')]).toEqual(['hitung', 'gaji', 'bersih', 'karyawan'])
  })

  it('jaccard', () => {
    expect(jaccard(new Set(['a', 'b']), new Set(['a', 'b']))).toBe(1)
    expect(jaccard(new Set(['a', 'b']), new Set(['b', 'c']))).toBeCloseTo(1 / 3)
    expect(jaccard(new Set(), new Set(['a']))).toBe(0)
  })
})

describe('tingkatMirip', () => {
  it('sama: urutan, huruf besar, tahun, dan kata umum diabaikan', () => {
    expect(tingkatMirip('gaji bersih', 'Gaji Bersih 2025')).toBe('sama')
    expect(tingkatMirip('cara hitung THR', 'hitung thr')).toBe('sama')
    expect(tingkatMirip('bersih gaji', 'gaji bersih')).toBe('sama')
  })

  it('mirip: satu frasa memuat frasa lain, atau Jaccard minimal 0,6', () => {
    expect(tingkatMirip('gaji bersih', 'gaji bersih karyawan')).toBe('mirip')
    expect(tingkatMirip('hitung gaji bersih bulanan', 'hitung gaji bersih tahunan')).toBe('mirip')
  })

  it('tidak mirip: satu kata sama tidak cukup', () => {
    expect(tingkatMirip('gaji bersih', 'gaji pokok')).toBeNull()
    expect(tingkatMirip('gaji', 'gaji bersih')).toBeNull()
    expect(tingkatMirip('', 'gaji')).toBeNull()
  })
})

describe('cariKanibalisasi', () => {
  it('daftar artikel yang keyphrase-nya sama di atas yang mirip', () => {
    expect(cariKanibalisasi('gaji bersih', lain).map((a) => [a.id, a.tingkat])).toEqual([
      [1, 'sama'],
      [2, 'mirip'],
    ])
  })

  it('keyphrase kosong tidak memeriksa apa pun', () => {
    expect(cariKanibalisasi(' ', lain)).toEqual([])
  })
})

describe('sarankanLink', () => {
  const doc = { pilarId: 1, keyphrase: 'gaji bersih', keyphraseSekunder: ['potongan pph 21'] }

  it('mengurutkan keyphrase terkait lalu sepilar; kandidat kanibalisasi tidak disarankan', () => {
    expect(sarankanLink(doc, lain).map((s) => [s.id, s.skor, s.alasan])).toEqual([
      [3, 9, 'keyphrase terkait: gaji, potongan, pph, 21, sepilar'],
      [6, 2, 'keyphrase terkait: gaji'],
      [4, 1, 'sepilar'],
    ])
  })

  it('artikel yang sudah ditautkan dilewati dan jumlah saran dibatasi', () => {
    expect(sarankanLink(doc, lain, { sudahDitautkan: [3] }).map((s) => s.id)).toEqual([6, 4])
    expect(sarankanLink(doc, lain, { jumlah: 1 }).map((s) => s.id)).toEqual([3])
  })

  it('tanpa pilar dan keyphrase tidak ada saran', () => {
    expect(sarankanLink({}, lain)).toEqual([])
  })
})
