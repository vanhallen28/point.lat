import sharp from 'sharp'

import { unik } from './helpers'

export async function gambarPng(lebar: number, tinggi: number) {
  const data = await sharp({
    create: { width: lebar, height: tinggi, channels: 3, background: '#1F7A4D' },
  })
    .png()
    .toBuffer()
  return { data, mimetype: 'image/png', name: `${unik('tes')}.png`, size: data.length }
}
