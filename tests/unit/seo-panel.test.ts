import { describe, expect, it } from 'vitest'

import { bacaMasukan } from '@/modules/seo/endpoint'
import { hasilPanel, masukanPanel, rapikanIsian, type DataPanel, type IsianArtikel } from '@/modules/seo/panel'

import { h, isiLexical, p, tautan, tautanInternal, unggahan } from './seo-contoh'

const isian: IsianArtikel = {
  id: 10,
  judul: 'Cara hitung gaji bersih',
  slug: 'cara-hitung-gaji-bersih',
  tipe: 'panduan',
  deck: 'Potongan PPh 21 dan BPJS dihitung langkah demi langkah.',
  pilar: 1,
  gambarUtama: 5,
  intinya: [{ poin: 'Satu.' }, { poin: 'Dua.' }],
  isi: isiLexical([
    p('Gaji bersih dihitung dari gaji kotor.'),
    h('h2', 'Rumus'),
    p(tautanInternal(11, 'PPh 21'), tautanInternal(11, 'lagi'), tautanInternal(3, 'tools', 'tools'), tautan('/a', 'a')),
    unggahan(7),
  ]),
  seo: { keyphrase: 'gaji bersih', keyphraseSekunder: ['pph 21'], gambarOG: 8 },
}

const data: DataPanel = {
  situs: { namaSitus: 'point.', urlSitus: 'https://point.lat', polaJudul: '%s · point.', metaDefault: 'Intinya dulu.', cloudName: 'demo' },
  pilar: { id: 1, nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau' },
  media: {
    5: { id: 5, alt: 'Slip gaji', width: 1600, height: 900, publicId: 'point/gambar/slip-gaji', jenis: 'gambar' },
    7: { id: 7, alt: '', width: 800, height: 600, publicId: 'point/gambar/tabel', jenis: 'gambar' },
  },
  kanibalisasi: [],
  saran: [],
}

describe('masukanPanel', () => {
  it('mengambil ID dari isian form: artikel yang ditautkan dan media yang dipakai', () => {
    expect(masukanPanel(isian)).toEqual({
      id: 10,
      pilar: 1,
      keyphrase: 'gaji bersih',
      keyphraseSekunder: ['pph 21'],
      tertaut: [11],
      media: [5, 8, 7],
    })
  })

  it('relasi yang sudah berupa dokumen juga dikenali', () => {
    expect(masukanPanel({ pilar: { id: 2 }, gambarUtama: { id: 9 } })).toMatchObject({ pilar: 2, media: [9] })
  })
})

describe('rapikanIsian', () => {
  it('array kosong dari form admin tersimpan sebagai angka 0: diubah ke []', () => {
    expect(rapikanIsian({ judul: 'Draf', intinya: 0, sumber: 0, seo: { keyphrase: 'gaji' } })).toEqual({
      judul: 'Draf',
      intinya: [],
      sumber: [],
      seo: { keyphrase: 'gaji', keyphraseSekunder: [] },
    })
    expect(rapikanIsian({}).seo).toEqual({ keyphraseSekunder: [] })
  })

  it('isian yang sudah dirapikan bisa dianalisis tanpa galat', () => {
    expect(() => hasilPanel(rapikanIsian({ judul: 'Draf', intinya: 0, sumber: 0 }), data)).not.toThrow()
  })
})

describe('bacaMasukan (endpoint)', () => {
  it('membuang ID yang tidak valid dan nilai yang bukan teks', () => {
    expect(bacaMasukan({ id: '12', pilar: 'x', keyphrase: 5, keyphraseSekunder: ['a', 3], tertaut: [1, '2', 'x', -1], media: [3.5, 4] })).toEqual({
      id: 12,
      pilar: null,
      keyphrase: null,
      keyphraseSekunder: ['a'],
      tertaut: [1, 2],
      media: [4],
    })
    expect(bacaMasukan(null)).toMatchObject({ id: null, tertaut: [], media: [] })
  })
})

describe('hasilPanel', () => {
  const hasil = hasilPanel(isian, data)

  it('checklist memakai alt dan lebar media dari server', () => {
    const alt = hasil.cek.find((c) => c.id === 'alt-gambar')
    expect(alt).toMatchObject({ status: 'kuning', pesan: '1 gambar belum punya alt.' })
    expect(hasil.cek.find((c) => c.id === 'gambar-utama')).toMatchObject({ status: 'hijau', pesan: 'Lebar 1600px.' })
    expect(hasil.cek.find((c) => c.id === 'link-internal')?.pesan).toBe('4 link internal.')
  })

  it('pratinjau Google dan kartu sosial dari judul, meta, dan URL dokumen', () => {
    expect(hasil.pratinjau.desktop).toEqual({
      judul: 'Cara hitung gaji bersih · point.',
      deskripsi: 'Potongan PPh 21 dan BPJS dihitung langkah demi langkah.',
      url: 'point.lat › cara-hitung-gaji-bersih',
      domain: 'point.lat',
    })
    expect(hasil.pratinjau.sosial.url).toBe('POINT.LAT')
    expect(hasil.canonical).toBe('https://point.lat/cara-hitung-gaji-bersih')
    expect(hasil.noindex).toBe(false)
  })

  it('gambar OG otomatis warna pilar bila gambar OG unggahan belum terbaca', () => {
    expect(hasil.gambarOg.url).toContain('co_rgb:1F7A4D')
    const denganOg = hasilPanel(isian, {
      ...data,
      media: { ...data.media, 8: { id: 8, alt: 'OG', width: 1200, height: 630, publicId: 'point/gambar/og', jenis: 'gambar' } },
    })
    expect(denganOg.gambarOg.url).toBe('https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1200,h_630/f_auto,q_auto/point/gambar/og')
  })

  it('draf baru tanpa slug tetap bisa dipratinjau', () => {
    const baru = hasilPanel({ judul: 'Draf' }, { ...data, pilar: null })
    expect(baru.pratinjau.desktop.url).toBe('point.lat')
    expect(baru.cek).toHaveLength(12)
  })
})
