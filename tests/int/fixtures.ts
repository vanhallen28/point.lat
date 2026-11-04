import type { Payload } from 'payload'
import sharp from 'sharp'

import { paragrafLexical } from '@/lib/lexical'

import { unik } from './helpers'

export async function gambarPng(lebar: number, tinggi: number) {
  const data = await sharp({
    create: { width: lebar, height: tinggi, channels: 3, background: '#1F7A4D' },
  })
    .png()
    .toBuffer()
  return { data, mimetype: 'image/png', name: `${unik('tes')}.png`, size: data.length }
}

/**
 * MP4 terkecil yang lolos pemeriksaan Payload (kotak `ftyp` lalu `free`). Isinya tidak diputar:
 * klien palsu tidak mentranskode, cukup jenis file yang benar.
 */
export function videoMp4() {
  const data = Buffer.concat([
    Buffer.from([0, 0, 0, 24]),
    Buffer.from('ftypisom'),
    Buffer.from([0, 0, 2, 0]),
    Buffer.from('isommp41'),
    Buffer.from([0, 0, 0, 8]),
    Buffer.from('free'),
  ])
  return { data, mimetype: 'video/mp4', name: `${unik('video')}.mp4`, size: data.length }
}

export async function buatGambar(payload: Payload, lebar = 1600, tinggi = 900) {
  return payload.create({
    collection: 'media',
    data: { alt: `Gambar contoh ${lebar}px` },
    file: await gambarPng(lebar, tinggi),
  })
}

/** Pilar, penulis, dan gambar yang dibutuhkan artikel terbit. */
export async function siapkanRelasiArtikel(payload: Payload, lebarGambar = 1600) {
  const pilar = await payload.create({
    collection: 'pilar',
    data: { nama: unik('Uang'), warna: 'hijau', deskripsi: 'Uang dan karier.' },
  })
  const penulis = await payload.create({
    collection: 'penulis',
    data: { nama: unik('Redaksi'), bio: 'Tim redaksi.' },
  })
  const gambar = await buatGambar(payload, lebarGambar)
  return { pilar, penulis, gambar }
}

export function dataArtikelTerbit(relasi: { pilar: { id: number }; penulis: { id: number }; gambar: { id: number } }) {
  return {
    _status: 'published' as const,
    judul: unik('Cara hitung gaji bersih'),
    tipe: 'panduan' as const,
    pilar: relasi.pilar.id,
    penulis: relasi.penulis.id,
    deck: 'Potongan PPh 21 dan BPJS dihitung langkah demi langkah.',
    intinya: [
      { poin: 'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS.' },
      { poin: 'Besar PPh 21 bergantung pada status dan tanggungan.' },
    ],
    gambarUtama: relasi.gambar.id,
    isi: paragrafLexical(['Paragraf pembuka artikel contoh.']),
  }
}
