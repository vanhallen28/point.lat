import { WARNA_PILAR, type WarnaPilar } from '@/lib/konstanta'

import { asal, UKURAN_OG } from './url'

/**
 * Gambar OG otomatis lewat transformasi teks Cloudinary (spesifikasi §9).
 *
 * Basis gambar adalah kanvas PNG 1x1 putih (`point/sistem/kanvas`, diunggah sekali dengan
 * `npm run media:siapkan`) yang diregangkan ke 1200x630 lalu diwarnai warna pilar.
 * Judul memakai Google Font Archivo lewat sintaks `@google` dengan berat numerik 900
 * (https://cloudinary.com/documentation/image_text_layer_fonts). Sumbu lebar (`wdth`) font
 * variable tidak bisa diatur di text overlay, jadi OG memakai Archivo lebar normal.
 */
export const KANVAS_OG = 'point/sistem/kanvas'

const FONT = 'Archivo@google'
const MAKS_JUDUL = 80
const TEPI_X = 80

/**
 * Teks layer harus dikodekan UTF-8 dan karakter khusus (koma, garis miring, titik dua, persen,
 * tanda tanya) dikodekan ganda (https://cloudinary.com/documentation/image_text_layers).
 * Spasi cukup `%20`. Emoji tidak bisa dirender, dan copy point. tidak memakai em dash atau en dash.
 */
export function kodekanTeks(teks: string): string {
  const bersih = teks
    .replace(/[–—]/g, ' ')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  return encodeURIComponent(bersih)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%(?!20)/g, '%25')
}

function potongJudul(judul: string): string {
  const rapi = judul.replace(/\s+/g, ' ').trim()
  if (rapi.length <= MAKS_JUDUL) return rapi
  const potong = rapi.slice(0, MAKS_JUDUL + 1)
  const batas = potong.lastIndexOf(' ')
  return `${(batas > 0 ? potong.slice(0, batas) : rapi.slice(0, MAKS_JUDUL)).replace(/[\s.,:;]+$/, '')}...`
}

const hex = (warna: string) => warna.replace('#', '').toUpperCase()

export type DataOg = { judul: string; warna: WarnaPilar }

export function urlOg(cloudName: string, data: DataOg, opsi: { kanvas?: string } = {}): string {
  const pilar = WARNA_PILAR[data.warna]
  const latar = hex(pilar.hex)
  const teks = hex(pilar.teks)
  const lebarJudul = UKURAN_OG.width - TEPI_X * 2
  return [
    asal(cloudName, 'gambar'),
    `w_${UKURAN_OG.width},h_${UKURAN_OG.height},c_scale,e_colorize:100,co_rgb:${latar}`,
    `l_text:${FONT}_72_900:${kodekanTeks(potongJudul(data.judul))},co_rgb:${teks},c_fit,w_${lebarJudul}`,
    `fl_layer_apply,g_north_west,x_${TEPI_X},y_96`,
    `l_text:${FONT}_44_900:point.,co_rgb:${teks}`,
    `fl_layer_apply,g_south_west,x_${TEPI_X},y_64`,
    'f_png',
    opsi.kanvas ?? KANVAS_OG,
  ].join('/')
}
