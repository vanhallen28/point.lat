import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { HalamanVideo, IndeksVideo } from '@/components/video/HalamanVideo'
import type { KartuArtikel } from '@/modules/konten/tipe'
import { kartuVideo, labelDurasi, susunVideo } from '@/modules/konten/video'
import type { Media, Video } from '@/payload-types'

import { situs } from './seo-contoh'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => h('img', { src: props.src, alt: props.alt, width: props.width, height: props.height }),
}))

const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
const file: Media = { id: 20, publicId: 'point/video/slip', jenis: 'video', alt: null, width: 1080, height: 1920, durasi: 44.6, ...waktu }
const pilar = { id: 1, nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau' as const, deskripsi: 'Uang.', ...waktu }

const video: Video = {
  id: 5,
  judul: 'PPh 21 dijelaskan dengan satu slip gaji',
  slug: 'pph-21-satu-slip-gaji',
  file,
  poster: null,
  pilar,
  durasiDetik: null,
  transkrip: 'Ambil slip gajimu.\n\nCari baris PPh 21.',
  _status: 'published',
  ...waktu,
}

const induk: KartuArtikel = {
  id: 10,
  judul: 'Cara hitung gaji bersih',
  href: '/cara-hitung-gaji-bersih',
  tipe: 'panduan',
  pilar: { nama: 'Uang & Karier', slug: 'uang-karier', href: '/uang-karier', warna: 'hijau', disclaimer: null },
  intinya: 'Gaji kotor dikurangi PPh 21 dan BPJS.',
  gambar: null,
  terbit: null,
  penulis: null,
}

describe('labelDurasi', () => {
  it('detik dan menit dalam bahasa Indonesia', () => {
    expect([labelDurasi(45), labelDurasi(60), labelDurasi(65), labelDurasi(0.4)]).toEqual(['45 detik', '1 menit', '1 menit 5 detik', '1 detik'])
  })
})

describe('kartuVideo dan susunVideo', () => {
  it('poster dari frame video bila tanpa poster unggahan; durasi file sebagai cadangan', () => {
    const kartu = kartuVideo(video)
    expect(kartu).toMatchObject({ href: '/video/pph-21-satu-slip-gaji', durasi: 44.6, pilar: { warna: 'hijau' } })
    expect(kartu?.poster).toMatchObject({ publicId: 'point/video/slip', jenis: 'video' })
    const poster: Media = { id: 21, publicId: 'point/gambar/poster', jenis: 'gambar', alt: 'Slip', width: 900, height: 1600, ...waktu }
    expect(kartuVideo({ ...video, poster, durasiDetik: 45 })).toMatchObject({ durasi: 45, poster: { publicId: 'point/gambar/poster' } })
    expect(kartuVideo({ ...video, slug: null })).toBeNull()
  })

  it('halaman video membawa dokumen untuk pemutar, artikel induk, dan video lain', () => {
    const data = susunVideo(video, induk, [])
    expect(data?.semat).toMatchObject({ judul: video.judul, transkrip: video.transkrip, _status: 'published' })
    expect(data?.induk?.href).toBe('/cara-hitung-gaji-bersih')
    expect(data?.seo.slug).toBe('pph-21-satu-slip-gaji')
  })
})

describe('IndeksVideo dan HalamanVideo', () => {
  it('indeks: kartu 9:16 dengan judul H2 dan durasi', () => {
    const masukan = { jenis: 'statis', judul: 'Video', path: '/video' } as const
    const html = renderToStaticMarkup(h(IndeksVideo, { video: [kartuVideo(video)!], masukan, situs }))
    expect(html).toMatch(/<h1 class="[^"]*">Video<\/h1>/)
    expect(html).toMatch(/<a class="[^"]*" data-warna="hijau" href="\/video\/pph-21-satu-slip-gaji">/)
    expect(html).toContain('src="https://res.cloudinary.com/demo/video/upload/so_auto/c_limit,w_480,q_auto/point/video/slip.jpg"')
    expect(html).toContain('45 detik')
    expect(html).toMatch(/<h2 class="[^"]*">PPh 21 dijelaskan dengan satu slip gaji<\/h2>/)
    expect(renderToStaticMarkup(h(IndeksVideo, { video: [], masukan, situs }))).toContain('Belum ada video. Video baru tampil di sini setelah terbit.')
  })

  it('halaman: H1, pemutar tanpa keterangan ganda, transkrip terbuka, penjelasan, dan JSON-LD VideoObject', () => {
    const html = renderToStaticMarkup(h(HalamanVideo, { video: susunVideo(video, induk, [kartuVideo({ ...video, id: 6, slug: 'lain' })!])!, situs }))
    expect(html).toMatch(/<h1 class="[^"]*">PPh 21 dijelaskan dengan satu slip gaji<\/h1>/)
    expect(html).toContain('<video controls="" playsInline="" preload="none"')
    expect(html).not.toContain('<figcaption')
    expect(html).toMatch(/<details class="[^"]*" open="">/)
    expect(html).toContain('<h2 id="penjelasan"')
    expect(html).toContain('href="/cara-hitung-gaji-bersih"')
    expect(html).toContain('href="/video/lain"')
    expect(html).toContain('"@type":"VideoObject"')
  })
})
