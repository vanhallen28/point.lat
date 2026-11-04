import { describe, expect, it } from 'vitest'

import { analisis, skor, type ArtikelAnalisis, type Cek } from '@/modules/seo/analisis'

import { gambarUtama, h, isiLexical, kalimatPanjang, p, tautan, tautanInternal, unggahan } from './seo-contoh'

const OPSI = { urlSitus: 'https://point.lat' }

/** Artikel yang lolos semua cek. Tes lain mengubah satu bagian saja. */
const lengkap: ArtikelAnalisis = {
  judul: 'Cara hitung gaji bersih karyawan tetap 2026',
  slug: 'cara-hitung-gaji-bersih',
  intinya: [{ poin: 'Gaji bersih = gaji kotor dikurangi PPh 21 dan BPJS.' }, { poin: 'Tarif PPh 21 memakai TER.' }],
  gambarUtama,
  sumber: [{ url: 'https://pajak.go.id/pph21' }, { url: 'https://bpjs-kesehatan.go.id/iuran' }],
  seo: {
    keyphrase: 'gaji bersih',
    judulSEO: 'Cara hitung gaji bersih 2026: potongan PPh 21 TER dan BPJS',
    metaDeskripsi:
      'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS. Pelajari rumus TER 2026, contoh hitungan, dan kalkulator gratis untuk karyawan tetap di sini.',
  },
  isi: isiLexical([
    p('Gaji bersih adalah uang yang benar-benar kamu terima. Hitungannya sederhana.'),
    h('h2', 'Rumus gaji bersih'),
    p('Kurangi gaji kotor dengan ', tautanInternal(11, 'PPh 21'), ' dan ', tautan('/glosarium/bpjs', 'BPJS'), '.'),
    h('h3', 'Contoh'),
    unggahan({ id: 8, alt: 'Tabel contoh', width: 1400 }),
    p('Lihat ', tautan('https://point.lat/tools/gaji-bersih', 'kalkulator'), ' dan ', tautan('https://kemnaker.go.id', 'Kemnaker'), '.'),
    h('h2', 'Kesalahan umum'),
    p('Jangan lupa iuran pensiun.'),
  ]),
}

const cari = (hasil: Cek[], id: Cek['id']) => hasil.find((c) => c.id === id) as Cek

describe('analisis (checklist panel SEO)', () => {
  it('artikel lengkap: semua hijau, urutan sesuai spesifikasi', () => {
    const hasil = analisis(lengkap, OPSI)
    expect(hasil.map((c) => c.id)).toEqual([
      'judul-seo',
      'meta',
      'keyphrase-h1',
      'keyphrase-slug',
      'keyphrase-pembuka',
      'hierarki',
      'intinya',
      'link-internal',
      'sumber-eksternal',
      'alt-gambar',
      'panjang-kalimat',
      'gambar-utama',
    ])
    expect(hasil.filter((c) => c.status === 'kuning')).toEqual([])
    expect(skor(hasil)).toEqual({ hijau: 12, total: 12 })
  })

  it('pesan hijau menyebut angka', () => {
    const hasil = analisis(lengkap, OPSI)
    expect(cari(hasil, 'judul-seo').pesan).toBe('58 karakter. Pas.')
    expect(cari(hasil, 'meta').pesan).toBe('156 karakter. Pas.')
    expect(cari(hasil, 'link-internal').pesan).toBe('3 link internal.')
    expect(cari(hasil, 'sumber-eksternal').pesan).toBe('3 sumber eksternal.')
    expect(cari(hasil, 'alt-gambar').pesan).toBe('Semua 2 gambar punya alt.')
    expect(cari(hasil, 'gambar-utama').pesan).toBe('Lebar 1600px.')
  })

  it('judul SEO dan meta di luar rentang menjadi kuning, tidak memblokir', () => {
    const hasil = analisis({ ...lengkap, seo: { ...lengkap.seo, judulSEO: null, metaDeskripsi: 'Terlalu pendek.' } }, OPSI)
    expect(cari(hasil, 'judul-seo')).toMatchObject({
      status: 'kuning',
      pesan: '43 karakter (dari judul artikel). Tambah sampai 50-60 karakter.',
    })
    expect(cari(hasil, 'meta')).toMatchObject({ status: 'kuning', pesan: '15 karakter. Tambah sampai 150-160 karakter.' })

    const panjang = analisis({ ...lengkap, seo: { ...lengkap.seo, judulSEO: 'x'.repeat(61), metaDeskripsi: '' } }, OPSI)
    expect(cari(panjang, 'judul-seo').pesan).toBe('61 karakter. Pangkas ke 50-60 karakter supaya tidak terpotong di Google.')
    expect(cari(panjang, 'meta').pesan).toBe('Meta description masih kosong. Tulis 150-160 karakter yang menjawab pencarian.')
  })

  it('keyphrase belum ada di judul, slug, atau pembuka', () => {
    const hasil = analisis({ ...lengkap, judul: 'Cara hitung take home pay', slug: 'take-home-pay', isi: isiLexical([p('Pembuka tanpa frasanya.')]) }, OPSI)
    expect(cari(hasil, 'keyphrase-h1').pesan).toBe('"gaji bersih" belum ada di judul artikel.')
    expect(cari(hasil, 'keyphrase-slug').pesan).toBe('Slug belum memuat "gaji-bersih".')
    expect(cari(hasil, 'keyphrase-pembuka').pesan).toBe('Sebut "gaji bersih" di paragraf pembuka.')
  })

  it('keyphrase setelah 100 kata pertama tidak dihitung', () => {
    const isi = isiLexical([p(kalimatPanjang(100)), p('Baru sekarang gaji bersih disebut.')])
    expect(cari(analisis({ ...lengkap, isi }, OPSI), 'keyphrase-pembuka').status).toBe('kuning')
  })

  it('keyphrase kosong membuat tiga cek keyphrase kuning', () => {
    const hasil = analisis({ ...lengkap, seo: { ...lengkap.seo, keyphrase: '' } }, OPSI)
    expect(hasil.filter((c) => c.id.startsWith('keyphrase')).map((c) => c.pesan)).toEqual([
      'Isi keyphrase utama dulu.',
      'Isi keyphrase utama dulu.',
      'Isi keyphrase utama dulu.',
    ])
  })

  it('hierarki: loncat H2 ke H4, H1 di isi, atau tanpa subjudul', () => {
    const loncat = isiLexical([p('gaji bersih'), h('h2', 'Rumus'), h('h4', 'Detail')])
    expect(cari(analisis({ ...lengkap, isi: loncat }, OPSI), 'hierarki').pesan).toBe('"Detail" melompat dari H2 ke H4. Pakai H3.')
    const h1 = isiLexical([h('h1', 'Judul lagi')])
    expect(cari(analisis({ ...lengkap, isi: h1 }, OPSI), 'hierarki').pesan).toBe('"Judul lagi" memakai H1. Judul artikel sudah H1, pakai H2 di isi.')
    const h3dulu = isiLexical([h('h3', 'Langsung H3')])
    expect(cari(analisis({ ...lengkap, isi: h3dulu }, OPSI), 'hierarki').pesan).toBe('"Langsung H3" melompat dari H1 ke H3. Pakai H2.')
    expect(cari(analisis({ ...lengkap, isi: isiLexical([p('Tanpa subjudul.')]) }, OPSI), 'hierarki').pesan).toBe(
      'Belum ada subjudul. Pecah isi dengan H2 supaya mudah dipindai.',
    )
  })

  it('kotak Intinya kosong atau terlalu banyak', () => {
    expect(cari(analisis({ ...lengkap, intinya: [] }, OPSI), 'intinya').pesan).toBe('Isi 2-4 poin (sekarang 0).')
    expect(cari(analisis({ ...lengkap, intinya: [{ poin: 'satu' }, { poin: ' ' }] }, OPSI), 'intinya').status).toBe('kuning')
  })

  it('link internal kurang atau berlebih', () => {
    const sedikit = isiLexical([p('gaji bersih ', tautan('/a', 'a'))])
    expect(cari(analisis({ ...lengkap, isi: sedikit }, OPSI), 'link-internal').pesan).toBe(
      '1 link internal. Tambah sampai 3-5, lihat saran di bawah.',
    )
    const banyak = isiLexical([p(...['/a', '/b', '/c', '/d', '/e', '/f'].map((u) => tautan(u, u)))])
    expect(cari(analisis({ ...lengkap, isi: banyak }, OPSI), 'link-internal').pesan).toBe(
      '6 link internal. Cukup 3-5 yang paling relevan.',
    )
  })

  it('sumber eksternal: blok sumber dan link keluar digabung tanpa duplikat', () => {
    const satu = { ...lengkap, sumber: [{ url: 'https://pajak.go.id/pph21' }], isi: isiLexical([p(tautan('https://pajak.go.id/pph21', 'DJP'))]) }
    expect(cari(analisis(satu, OPSI), 'sumber-eksternal').pesan).toBe('1 sumber. Rujuk 2-3 sumber resmi atau tepercaya.')
    const empat = { ...lengkap, sumber: [{ url: 'https://a.id' }, { url: 'https://b.id' }, { url: 'https://c.id' }, { url: 'https://d.id' }] }
    expect(cari(analisis(empat, OPSI), 'sumber-eksternal').pesan).toBe('5 sumber eksternal, sudah lebih dari cukup.')
  })

  it('alt gambar kosong, atau gambar yang belum bisa diperiksa', () => {
    const tanpaAlt = isiLexical([unggahan({ id: 9, alt: '', width: 1300 })])
    expect(cari(analisis({ ...lengkap, isi: tanpaAlt }, OPSI), 'alt-gambar').pesan).toBe('1 gambar belum punya alt.')
    const belum = isiLexical([unggahan(9)])
    expect(cari(analisis({ ...lengkap, isi: belum }, OPSI), 'alt-gambar').pesan).toBe(
      '1 gambar belum bisa diperiksa. Simpan dulu lalu muat ulang.',
    )
  })

  it('kalimat terlalu panjang rata-ratanya', () => {
    const isi = isiLexical([p(`gaji bersih ${kalimatPanjang(30)}`)])
    expect(cari(analisis({ ...lengkap, isi }, OPSI), 'panjang-kalimat').pesan).toBe(
      '32 kata per kalimat. Pecah kalimat panjang, usahakan di bawah 20.',
    )
    expect(cari(analisis({ ...lengkap, isi: isiLexical([p('Satu dua tiga. Empat lima.')]) }, OPSI), 'panjang-kalimat').pesan).toBe(
      '2,5 kata per kalimat. Enak dibaca.',
    )
  })

  it('gambar utama kecil, belum dimuat, atau kosong', () => {
    expect(cari(analisis({ ...lengkap, gambarUtama: { ...gambarUtama, width: 1000 } }, OPSI), 'gambar-utama').pesan).toBe(
      'Lebar 1000px. Minimal 1200px supaya tampil besar di Google Discover.',
    )
    expect(cari(analisis({ ...lengkap, gambarUtama: 5 }, OPSI), 'gambar-utama').pesan).toBe(
      'Ukuran gambar belum terbaca. Simpan dulu lalu muat ulang.',
    )
    expect(cari(analisis({ ...lengkap, gambarUtama: null }, OPSI), 'gambar-utama').pesan).toBe('Belum ada gambar utama.')
  })

  it('draf kosong tidak melempar galat', () => {
    const hasil = analisis({}, OPSI)
    expect(hasil).toHaveLength(12)
    expect(skor(hasil).hijau).toBe(0)
  })

  it('pesan tanpa em dash, en dash, dan tanda seru', () => {
    const semua = [analisis(lengkap, OPSI), analisis({}, OPSI)].flat().map((c) => `${c.label} ${c.pesan}`)
    for (const pesan of semua) expect(pesan).not.toMatch(/[\u2013\u2014!]/)
  })
})
