import { describe, expect, it } from 'vitest'

import { daftarPopuler, HERO_BAWAAN, JUDUL_POPULER, JUDUL_TERBARU, susunBeranda, susunNewsletter, type SumberBeranda } from '@/modules/konten/beranda'
import type { KartuArtikel, KartuVideo } from '@/modules/konten/tipe'
import type { Artikel, Beranda, Media, Pilar, Video } from '@/payload-types'

type Blok = NonNullable<Beranda['tataLetak']>[number]

const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
const pilar: Pilar = { id: 1, nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau', deskripsi: 'Uang.', ...waktu }

const artikel = (id: number, status: 'published' | 'draft' = 'published'): Artikel =>
  ({ id, judul: `Artikel ${id}`, slug: `artikel-${id}`, tipe: 'panduan', pilar, intinya: [{ poin: `Intinya ${id}.` }], _status: status, ...waktu }) as Artikel

const kartu = (id: number): KartuArtikel => ({ id, judul: `Artikel ${id}`, href: `/artikel-${id}`, tipe: 'panduan', pilar: null, intinya: null })

const file: Media = { id: 30, publicId: 'point/video/a', jenis: 'video', alt: null, width: 1080, height: 1920, durasi: 40, ...waktu }
const video = (id: number, status: 'published' | 'draft' = 'published'): Video =>
  ({ id, judul: `Video ${id}`, slug: `video-${id}`, file, pilar, transkrip: 'T.', _status: status, ...waktu }) as Video
const kartuVid = (id: number): KartuVideo => ({ id, judul: `Video ${id}`, href: `/video/video-${id}`, durasi: 40, pilar: null, poster: null })

const newsletter = { judul: 'Intinya, tiap Senin.', teks: 'Lima tulisan terbaik pekan ini.', href: 'https://contoh.kit.com/point' }

const sumber: SumberBeranda = {
  terbaru: [1, 2, 3, 4, 5, 6].map(kartu),
  populer: [],
  video: [7, 8].map(kartuVid),
  tools: [{ id: 9, nama: 'Gaji Bersih', href: '/tools/gaji-bersih', ringkasan: 'Hitung gaji bersih.' }],
  newsletter,
}

const blok = {
  hero: { blockType: 'heroBeranda', id: 'h', judul: 'Intinya dulu.', subjudul: ' Uang, karier, dan kesehatan. ', placeholderCari: 'misal: cara hitung THR' },
  mozaik: { blockType: 'mozaikPilihan', id: 'm', artikel: [artikel(2), artikel(5, 'draft'), artikel(3)], tampilkanTools: true },
  video: { blockType: 'stripVideo', id: 'v', judul: 'Intinya dalam 45 detik', video: [] },
  palingDibaca: { blockType: 'palingDibaca', id: 'p', judul: 'Paling dibaca pekan ini', jumlah: 2 },
  newsletter: { blockType: 'newsletterBlok', id: 'n', judul: null, teks: null },
  iklan: { blockType: 'slotIklan', id: 'i', idSlot: 'beranda-samping' },
} satisfies Record<string, Blok>

describe('susunNewsletter', () => {
  it('hanya bila aktif dan URL form penyedia https', () => {
    expect(susunNewsletter({ aktif: true, urlForm: ' https://contoh.kit.com/point ', judul: '', deskripsi: null })).toEqual({
      judul: 'Intinya, tiap Senin.',
      teks: null,
      href: 'https://contoh.kit.com/point',
    })
    expect(susunNewsletter({ aktif: false, urlForm: 'https://contoh.kit.com/point' })).toBeNull()
    expect(susunNewsletter({ aktif: true, urlForm: 'javascript:alert(1)' })).toBeNull()
    expect(susunNewsletter({ aktif: true, urlForm: null })).toBeNull()
  })
})

describe('susunBeranda', () => {
  it('urutan editor dipertahankan; mozaik tanpa draf, dengan tools; video cadangan terbaru; iklan belum dirender', () => {
    const bagian = susunBeranda([blok.hero, blok.mozaik, blok.video, blok.palingDibaca, blok.newsletter, blok.iklan], sumber)
    expect(bagian.map((b) => b.jenis)).toEqual(['hero', 'mozaik', 'video', 'terbaru'])
    expect(bagian[0]).toEqual({ jenis: 'hero', id: 'h', judul: 'Intinya dulu.', subjudul: 'Uang, karier, dan kesehatan.', placeholder: 'misal: cara hitung THR' })
    expect(bagian[1]).toMatchObject({ jenis: 'mozaik', judul: null, tools: sumber.tools })
    expect(bagian[1].jenis === 'mozaik' && bagian[1].artikel.map((k) => k.href)).toEqual(['/artikel-2', '/artikel-3'])
    expect(bagian[2].jenis === 'video' && bagian[2].video.map((v) => v.id)).toEqual([7, 8])
  })

  it('"Paling dibaca" jujur: tulisan terbaru di luar mozaik, berjudul tulisan terbaru; newsletter jadi kolom sampingnya', () => {
    const [, , terbaru] = susunBeranda([blok.hero, blok.mozaik, blok.palingDibaca, blok.newsletter], sumber)
    expect(terbaru).toMatchObject({ jenis: 'terbaru', judul: JUDUL_TERBARU, newsletter })
    expect(terbaru.jenis === 'terbaru' && terbaru.artikel.map((k) => k.id)).toEqual([1, 4])
  })

  it('"Paling dibaca pekan ini" bila klik 7 hari cukup untuk semua tempat: urutan peringkat, judul editor, artikel mozaik boleh ikut', () => {
    const [, , populer] = susunBeranda([blok.hero, blok.mozaik, blok.palingDibaca, blok.newsletter], { ...sumber, populer: [3, 6, 1].map(kartu) })
    expect(populer).toMatchObject({ jenis: 'terbaru', judul: 'Paling dibaca pekan ini', newsletter })
    expect(populer.jenis === 'terbaru' && populer.artikel.map((k) => k.id)).toEqual([3, 6])
    const [, tanpaJudul] = susunBeranda([blok.hero, { ...blok.palingDibaca, judul: ' ' }], { ...sumber, populer: [3, 6].map(kartu) })
    expect(tanpaJudul).toMatchObject({ judul: JUDUL_POPULER })
  })

  it('klik 7 hari belum cukup untuk semua tempat: tetap tulisan terbaru, tidak dicampur', () => {
    const [, , terbaru] = susunBeranda([blok.hero, blok.mozaik, blok.palingDibaca], { ...sumber, populer: [6].map(kartu) })
    expect(terbaru).toMatchObject({ judul: JUDUL_TERBARU })
    expect(terbaru.jenis === 'terbaru' && terbaru.artikel.map((k) => k.id)).toEqual([1, 4])
    expect(daftarPopuler([kartu(9)], [kartu(1), kartu(2), kartu(3)], 3)).toEqual({ judul: 'Tulisan terbaru', artikel: [1, 2, 3].map(kartu) })
    expect(daftarPopuler([9, 8, 7, 6].map(kartu), [], 3)).toEqual({ judul: 'Paling dibaca pekan ini', artikel: [9, 8, 7].map(kartu) })
  })

  it('newsletter berdiri sendiri bila tidak tepat setelah tulisan terbaru, judul blok mengganti judul global', () => {
    const bagian = susunBeranda([blok.hero, { ...blok.newsletter, judul: 'Langganan intinya' }], sumber)
    expect(bagian[1]).toEqual({ jenis: 'newsletter', id: 'n', newsletter: { ...newsletter, judul: 'Langganan intinya' } })
    expect(susunBeranda([blok.hero, blok.newsletter], { ...sumber, newsletter: null })).toHaveLength(1)
  })

  it('tanpa hero: hero bawaan di atas; hero kedua dibuang; blok kosong dilewati', () => {
    const kosong: SumberBeranda = { terbaru: [], populer: [], video: [], tools: [], newsletter: null }
    const bagian = susunBeranda([blok.video, blok.palingDibaca, { ...blok.mozaik, artikel: [artikel(5, 'draft')] }], kosong)
    expect(bagian).toEqual([{ jenis: 'hero', id: 'hero-bawaan', ...HERO_BAWAAN }])
    expect(susunBeranda([blok.hero, { ...blok.hero, id: 'h2' }], kosong).filter((b) => b.jenis === 'hero')).toHaveLength(1)
  })

  it('pilihan video editor dipakai bila ada yang terbit; kotak tools bisa dimatikan', () => {
    const bagian = susunBeranda([blok.hero, { ...blok.video, video: [video(11), video(12, 'draft')] }, { ...blok.mozaik, tampilkanTools: false }], sumber)
    expect(bagian[1].jenis === 'video' && bagian[1].video.map((v) => v.href)).toEqual(['/video/video-11'])
    expect(bagian[2]).toMatchObject({ jenis: 'mozaik', tools: [] })
  })
})
