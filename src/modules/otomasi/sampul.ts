import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { createElement as h } from 'react'

import { WARNA_PILAR, type WarnaPilar } from '@/lib/konstanta'
import { LOGO_BIRU, LOGO_TINTA, LOGO_VIEWBOX } from '@/lib/merek'

import { aturKataSampul } from './aturan'

/**
 * Kartu sampul draf otomatis (spesifikasi §27): PNG 1920 x 1080 bergaya sama dengan kartu paket konten (§24),
 * yaitu warna pilar, dua cincin dari tanda logo, label pilar, kata besar, dan logo point. Digambar di server
 * dengan `next/og` (Satori dan resvg bawaan Next.js, tanpa dependensi baru) memakai Archivo statis lebar 72% tebal
 * 900 dan lebar 100% tebal 800 di `font/` (OFL, dibuat dari Archivo variable `@fontsource-variable/archivo`),
 * karena Satori tidak membaca font variable dan WOFF2. Folder font ikut dikemas ke fungsi API lewat
 * `outputFileTracingIncludes` di `next.config.ts`. `next/og` dimuat saat dipakai saja, supaya CLI Payload
 * (migrasi, generate types) yang memuat config tidak ikut memuatnya.
 */

export const FOLDER_FONT = 'src/modules/otomasi/font'

let font: Promise<{ kata: Buffer; label: Buffer }> | undefined

function muatFont() {
  font ??= Promise.all([
    readFile(path.join(process.cwd(), FOLDER_FONT, 'archivo-sampul.ttf')),
    readFile(path.join(process.cwd(), FOLDER_FONT, 'archivo-label.ttf')),
  ]).then(([kata, label]) => ({ kata, label }))
  return font
}

/** Cincin tipis di atas warna pilar: putih di pilar gelap, tinta di pilar terang (sama dengan kartu paket). */
const warnaCincin = (teks: string) => (teks === '#FFFFFF' ? 'rgba(255,255,255,0.12)' : 'rgba(17,17,17,0.08)')

export type MasukanSampul = { kata: string; label: string; warna: WarnaPilar | null | undefined }

/** Elemen kartu untuk Satori (hanya flexbox dan gaya sebaris). */
export function elemenSampul({ kata, label, warna }: MasukanSampul) {
  const w = WARNA_PILAR[warna ?? 'hijau'] ?? WARNA_PILAR.hijau
  const { baris, ukuran } = aturKataSampul(kata)
  const cincin = warnaCincin(w.teks)
  return h(
    'div',
    {
      style: {
        width: 1920,
        height: 1080,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        background: w.hex,
        color: w.teks,
        fontFamily: 'Kata',
      },
    },
    h('div', { style: { position: 'absolute', left: 210, top: -210, width: 1500, height: 1500, borderRadius: 750, border: `34px solid ${cincin}` } }),
    h('div', { style: { position: 'absolute', left: 470, top: 50, width: 980, height: 980, borderRadius: 490, border: `10px solid ${cincin}` } }),
    h(
      'div',
      { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 44, width: 1000 } },
      h(
        'div',
        {
          style: {
            display: 'flex',
            padding: '14px 34px',
            border: `5px solid ${w.teks}`,
            borderRadius: 999,
            fontFamily: 'Label',
            fontSize: 34,
            letterSpacing: 2,
            textTransform: 'uppercase',
          },
        },
        label,
      ),
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'column', alignItems: 'center' } },
        ...baris.map((b) => h('div', { key: b, style: { display: 'flex', fontSize: ukuran, lineHeight: 0.86, whiteSpace: 'nowrap' } }, b)),
      ),
      h('svg', { width: 262, height: 64, viewBox: LOGO_VIEWBOX }, h('path', { fill: w.teks, d: LOGO_TINTA }), h('path', { fill: w.teks, d: LOGO_BIRU })),
    ),
  )
}

export async function gambarSampul(masukan: MasukanSampul): Promise<Buffer> {
  const [{ ImageResponse }, f] = await Promise.all([import('next/og'), muatFont()])
  const gambar = new ImageResponse(elemenSampul(masukan), {
    width: 1920,
    height: 1080,
    fonts: [
      { name: 'Kata', data: f.kata, weight: 900, style: 'normal' },
      { name: 'Label', data: f.label, weight: 800, style: 'normal' },
    ],
  })
  return Buffer.from(await gambar.arrayBuffer())
}
