import { describe, expect, it } from 'vitest'

import { CONTOH_PALSU } from '@/modules/ai/palsu'
import { CEK_MANUAL, definisiBrief, PANJANG_ACUAN, type KonteksBrief, type MasukanBrief } from '@/modules/ai/prompt/brief'

import { masalahSkema, tandaTerlarang } from './ai-bantu'

const KONTEKS: KonteksBrief = {
  pilar: 'Uang & Karier',
  kanibalisasi: [{ id: 7, judul: 'Cara hitung THR 2026', keyphrase: 'hitung thr', tingkat: 'sama', urlAdmin: '/admin/collections/artikel/7' }],
  linkInternal: [{ id: 8, judul: 'Gaji bersih', path: '/gaji-bersih', alasan: 'sepilar', urlAdmin: '/admin/collections/artikel/8' }],
  sumberResmi: [{ nama: 'Kementerian Ketenagakerjaan', url: 'https://kemnaker.go.id' }],
}
const MASUKAN: MasukanBrief = { keyword: 'hitung thr', tipe: 'explainer', pilar: 3, artikel: 9, konteks: KONTEKS }

describe('brief dari keyword: masukan dan prompt', () => {
  it('keyword wajib; tipe di luar daftar menjadi panduan; ID pilar dan artikel dibaca dari angka atau teks angka', () => {
    expect(definisiBrief.baca({ keyword: ' hitung  thr ', tipe: 'explainer', pilar: '3', artikel: 9 })).toEqual({ keyword: 'hitung thr', tipe: 'explainer', pilar: 3, artikel: 9 })
    expect(definisiBrief.baca({ keyword: 'thr', tipe: 'video', pilar: 'x', artikel: -1 })).toEqual({ keyword: 'thr', tipe: 'panduan', pilar: null, artikel: null })
    expect(definisiBrief.baca({ keyword: '  ' })).toBe('Isi keyword dulu, lalu buat brief.')
    expect(definisiBrief.baca(null)).toBe('Masukan brief tidak terbaca.')
  })

  it('prompt jujur: model tidak membuka Google dan tidak menulis URL; artikel terkait dan keyword yang sudah dipakai dikirim sebagai bahan bertag', () => {
    const { sistem, pesan, ringkasan } = definisiBrief.prompt(MASUKAN)
    expect(sistem).toContain('Kamu tidak bisa membuka hasil pencarian Google atau situs apa pun.')
    expect(sistem).toContain('Jangan menulis URL')
    expect(tandaTerlarang(sistem)).toEqual([])
    expect(pesan).toContain('Keyword: hitung thr\n\nPilar: Uang & Karier\n\nFormat yang dipilih editor sekarang: explainer (Explainer)')
    expect(pesan).toContain('- explainer: 600 sampai 900 kata')
    expect(pesan).toContain('<artikel_terkait>\nArtikel point. yang terkait:\n- Gaji bersih\n</artikel_terkait>')
    expect(pesan).toContain('<keyword_sudah_dipakai>\nArtikel point. yang sudah memakai keyword ini atau yang sangat mirip:\n- Cara hitung THR 2026 (keyphrase "hitung thr")\n</keyword_sudah_dipakai>')
    expect(pesan).not.toContain('kemnaker.go.id')
    expect(ringkasan).toBe('hitung thr')
  })

  it('skema keluaran sesuai batasan structured outputs, intent dan format sebagai enum', () => {
    expect(masalahSkema(definisiBrief.skema)).toEqual([])
    const p = (definisiBrief.skema as { properties: Record<string, { enum?: string[] }> }).properties
    expect(p.intent.enum).toEqual(['informasional', 'komersial', 'transaksional', 'navigasional'])
    expect(p.format.enum).toEqual(['panduan', 'explainer', 'daftar', 'glosarium'])
  })
})

describe('brief dari keyword: pemeriksa jawaban', () => {
  it('perkiraan model dan data point. dipisah; panjang acuan dari format; langkah manual selalu ada', () => {
    const hasil = definisiBrief.periksa(CONTOH_PALSU.brief, MASUKAN)
    if (typeof hasil === 'string') throw new Error(hasil)
    expect(hasil.dariModel.format).toBe('panduan')
    expect(hasil.dariPoint).toEqual({ ...KONTEKS, panjangAcuan: PANJANG_ACUAN.panduan })
    expect(hasil.cekManual).toEqual(CEK_MANUAL)
    expect(hasil.catatan).toEqual([
      'Brief menyarankan format Panduan, sedangkan tipe artikel sekarang Explainer.',
      'Keyword ini sudah dipakai artikel lain. Bedakan sudutnya, atau gabungkan ke artikel yang sudah ada.',
    ])
  })

  it('URL buatan model dibuang, em dash dibersihkan, dan daftar dipotong sesuai batas', () => {
    const hasil = definisiBrief.periksa(
      {
        judulKerja: 'Cara hitung THR \u2014 lengkap',
        intent: 'informasional',
        alasanIntent: 'Pencari ingin tahu caranya.',
        format: 'explainer',
        alasanFormat: 'Singkat.',
        keyphraseSekunder: ['a', 'b', 'c', 'd', 'e', 'f'],
        outline: [{ h2: 'Rumus THR', h3: ['Masa kerja', 'Pegawai baru', 'Kontrak', 'Harian', 'Lepas'], catatan: 'Lihat https://contoh.go.id/thr untuk aturannya.' }, { h2: '', h3: [], catatan: '' }],
        pertanyaan: ['Kapan THR dibayar?'],
        sudutPembeda: 'Contoh hitungan.',
        perluDicek: ['Batas pembayaran THR', 'https://contoh.go.id'],
      },
      { ...MASUKAN, konteks: undefined },
    )
    expect(hasil).toMatchObject({
      dariModel: {
        judulKerja: 'Cara hitung THR, lengkap',
        keyphraseSekunder: ['a', 'b', 'c', 'd', 'e'],
        outline: [{ h2: 'Rumus THR', h3: ['Masa kerja', 'Pegawai baru', 'Kontrak', 'Harian'], catatan: 'Lihat untuk aturannya.' }],
        perluDicek: ['Batas pembayaran THR'],
      },
      dariPoint: { pilar: null, kanibalisasi: [], linkInternal: [], sumberResmi: [], panjangAcuan: '600 sampai 900 kata' },
      catatan: ['1 em dash atau en dash diganti koma atau tanda hubung.'],
    })
  })

  it('jawaban tanpa outline atau dengan intent di luar daftar ditolak', () => {
    const dasar = CONTOH_PALSU.brief as Record<string, unknown>
    expect(definisiBrief.periksa({ ...dasar, outline: [] }, MASUKAN)).toBe('judul, intent, format, atau outline kosong atau salah bentuk')
    expect(definisiBrief.periksa({ ...dasar, intent: 'hiburan' }, MASUKAN)).toBe('judul, intent, format, atau outline kosong atau salah bentuk')
    expect(definisiBrief.periksa('bukan objek', MASUKAN)).toBe('jawaban bukan objek')
  })
})
