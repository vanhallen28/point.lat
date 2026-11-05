import { describe, expect, it } from 'vitest'

import { periksaPola } from '@/modules/ai/pola'
import { blokArtikel, teksPolos } from '@/modules/ai/teks'

import { h, isiLexical, p, tautan } from './seo-contoh'

/** Kalimat `n` kata. */
const kal = (n: number) => `${['Gaji', ...Array.from({ length: n - 1 }, () => 'bersih')].join(' ')}.`

const daftar = (...butir: (string | Record<string, unknown>)[]) => ({
  type: 'list',
  listType: 'bullet',
  version: 1,
  children: butir.map((b) => (typeof b === 'string' ? { type: 'listitem', version: 1, children: [{ type: 'text', text: b, version: 1 }] } : b)),
})

const cek = (...paragraf: string[]) => periksaPola(blokArtikel({ isi: isiLexical(paragraf.map((t) => p(t))) }))

describe('teks artikel per blok', () => {
  it('deck, poin Intinya, subjudul, paragraf, butir daftar bertingkat, kutipan, dan jawaban FAQ sesuai urutan, dengan teks tautannya', () => {
    const blok = blokArtikel({
      deck: ' Cara cepat menghitung gaji bersih. ',
      intinya: [{ poin: 'PPh 21 dipotong tiap bulan.' }, { poin: '' }, { poin: 'BPJS dipotong juga.' }],
      isi: isiLexical([
        h('h2', 'Apa itu gaji bersih'),
        p('Menurut ', tautan('https://www.pajak.go.id', 'DJP'), ', TER berlaku sejak 2024.'),
        daftar('Gaji pokok', { type: 'listitem', version: 1, children: [{ type: 'text', text: 'Potongan', version: 1 }, daftar('BPJS Kesehatan')] }),
        { type: 'quote', version: 1, children: [{ type: 'text', text: 'Kutipan pendek.', version: 1 }] },
        p(''),
      ]),
      faq: [{ pertanyaan: 'Kapan dipotong?', jawaban: 'Setiap bulan.' }],
    })
    expect(blok.map((b) => [b.jenis, b.label, b.teks, b.tautan])).toEqual([
      ['deck', 'Deck', 'Cara cepat menghitung gaji bersih.', []],
      ['intinya', 'Intinya poin 1', 'PPh 21 dipotong tiap bulan.', []],
      ['intinya', 'Intinya poin 3', 'BPJS dipotong juga.', []],
      ['subjudul', 'Subjudul "Apa itu gaji bersih"', 'Apa itu gaji bersih', []],
      ['paragraf', 'Paragraf 1', 'Menurut DJP, TER berlaku sejak 2024.', ['DJP']],
      ['paragraf', 'Paragraf 2', 'Gaji pokok', []],
      ['paragraf', 'Paragraf 3', 'Potongan', []],
      ['paragraf', 'Paragraf 4', 'BPJS Kesehatan', []],
      ['paragraf', 'Paragraf 5', 'Kutipan pendek.', []],
      ['faq', 'FAQ 1', 'Setiap bulan.', []],
    ])
  })

  it('teks polos untuk prompt: subjudul bertanda ##, poin Intinya bertanda -, tanpa FAQ', () => {
    expect(teksPolos({ deck: 'Deck.', intinya: [{ poin: 'Poin.' }], isi: isiLexical([h('h2', 'Bagian'), p('Isi.')]), faq: [{ jawaban: 'Jawab.' }] })).toBe(
      'Deck.\n\n- Poin.\n\n## Bagian\n\nIsi.',
    )
  })
})

describe('cek pola tulisan AI', () => {
  it('frasa klise dari spesifikasi ditandai per kalimat dengan letak dan alasan, tanpa membedakan huruf besar', () => {
    const { temuan } = cek(
      'Di era digital ini, gaji dibayar lewat bank. Tak hanya itu, slip gaji juga digital.',
      'Mari kita bahas cara menghitungnya.',
      'Memahami PPh 21 sangat penting untuk karyawan baru.',
      'Kesimpulannya, cek slip gajimu setiap bulan.',
    )
    expect(temuan.map((t) => [t.jenis, t.letak, t.alasan.split(':')[0]])).toEqual([
      ['klise', 'Paragraf 1', '"Di era digital ini"'],
      ['klise', 'Paragraf 1', '"Tak hanya itu"'],
      ['klise', 'Paragraf 2', '"Mari kita bahas"'],
      ['klise', 'Paragraf 3', '"sangat penting untuk"'],
      ['kesimpulan', 'Paragraf 4', '"Kesimpulannya"'],
    ])
    expect(temuan[0]).toEqual({
      jenis: 'klise',
      letak: 'Paragraf 1',
      kutipan: 'Di era digital ini, gaji dibayar lewat bank.',
      alasan: '"Di era digital ini": Pembuka klise yang sering muncul di tulisan AI. Langsung ke jawabannya.',
    })
  })

  it('frasa di dalam tanda kutip dan potongan kata tidak ditandai', () => {
    expect(cek('Hindari pembuka "di era digital ini" di tulisanmu.', 'Lanskapnya hijau, tapi langkah ini esensial.').temuan.map((t) => t.alasan.split(':')[0])).toEqual(['"esensial"'])
  })

  it('em dash, en dash, dan dua tanda hubung berspasi ditandai', () => {
    const { temuan } = cek('Gaji naik \u2014 pajak ikut naik.', 'Rentang 150\u2013160 karakter.', 'Cek slip -- lalu simpan.', 'Gaji-gaji aman.')
    expect(temuan.map((t) => [t.jenis, t.letak])).toEqual([
      ['tanda-pisah', 'Paragraf 1'],
      ['tanda-pisah', 'Paragraf 2'],
      ['tanda-pisah', 'Paragraf 3'],
    ])
  })

  it('pola "bukan hanya X, tetapi Y" ditandai', () => {
    const { temuan } = cek('THR bukan hanya bonus, tetapi juga hak pekerja.', 'Ini tidak sekadar angka, melainkan janji.', 'Bukan begitu caranya.')
    expect(temuan.map((t) => [t.jenis, t.letak])).toEqual([
      ['paralel-negatif', 'Paragraf 1'],
      ['paralel-negatif', 'Paragraf 2'],
    ])
  })

  it('serba tiga: blok dengan dua daftar tiga hal ditandai, satu daftar tidak', () => {
    const { temuan } = cek(
      'Gaji, tunjangan, dan bonus dihitung bersama. Hasilnya cepat, akurat, dan transparan.',
      'Siapkan slip gaji, NPWP, dan formulir 1721 A1.',
    )
    expect(temuan.map((t) => [t.jenis, t.letak, t.alasan])).toEqual([
      ['serba-tiga', 'Paragraf 1', '2 daftar tiga hal dalam satu blok. Pola serba tiga terasa dibuat-buat; pertahankan yang memang tiga.'],
    ])
  })

  it('subjudul penutup dan kalimat penutup generik ditandai', () => {
    const { temuan } = periksaPola(blokArtikel({ isi: isiLexical([h('h2', 'Kesimpulan'), p('Semoga bermanfaat dan sampai jumpa.')]) }))
    expect(temuan.map((t) => [t.jenis, t.letak])).toEqual([
      ['kesimpulan', 'Subjudul "Kesimpulan"'],
      ['kesimpulan', 'Paragraf 1'],
    ])
  })

  it('paragraf dengan kalimat yang panjangnya hampir sama ditandai beserta jumlah katanya; kalimat berselang-seling tidak', () => {
    const seragam = cek([kal(10), kal(11), kal(10), kal(10)].join(' '))
    expect(seragam.temuan).toEqual([
      expect.objectContaining({ jenis: 'kalimat-seragam', letak: 'Paragraf 1', alasan: 'Panjang kalimat hampir sama (10, 11, 10, 10 kata). Selingi kalimat pendek dan panjang.' }),
    ])
    expect(cek([kal(5), kal(18), kal(7), kal(25)].join(' ')).temuan).toEqual([])
  })

  it('seluruh tulisan dengan kalimat seragam ditandai sekali di akhir, selain per paragraf', () => {
    const paragraf = [kal(10), kal(12), kal(10)].join(' ')
    const { temuan } = cek(paragraf, paragraf, paragraf, paragraf)
    expect(temuan.map((t) => [t.jenis, t.letak])).toEqual([['kalimat-seragam', 'Seluruh tulisan']])
    expect(temuan[0].kutipan).toBe('12 kalimat, rata-rata 11 kata')
  })

  it('frasa tambahan dari global Asisten AI ikut ditandai', () => {
    const blok = blokArtikel({ isi: isiLexical([p('Solusi tepat untuk keuanganmu.')]) })
    expect(periksaPola(blok, { frasaTambahan: [' solusi tepat ', ''] }).temuan).toEqual([
      { jenis: 'frasa-tambahan', letak: 'Paragraf 1', kutipan: 'Solusi tepat untuk keuanganmu.', alasan: '"Solusi tepat": Ada di daftar frasa Asisten AI.' },
    ])
  })

  it('tulisan tanpa tanda: daftar kosong; ringkasan menghitung temuan per jenis dan jumlah kalimat', () => {
    const bersih = cek('Gaji bersihmu adalah gaji kotor dikurangi PPh 21 dan iuran BPJS.', 'Contohnya begini. Gaji Rp10 juta dipotong sekitar Rp700 ribu untuk BPJS dan pajak.')
    expect(bersih).toEqual({ temuan: [], jumlahKalimat: 3, ringkasan: {} })
    expect(cek('Di era digital ini \u2014 semua cepat.').ringkasan).toEqual({ klise: 1, 'tanda-pisah': 1 })
  })
})
