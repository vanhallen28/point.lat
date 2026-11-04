import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { VideoSemat } from '@/components/isi/VideoSemat'
import { validasiVtt } from '@/lib/validasi'
import { pathTakarir } from '@/modules/konten/video'
import type { Media } from '@/payload-types'

const VTT = 'WEBVTT\n\n00:00.000 --> 00:04.000\nAmbil slip gaji bulan lalu.'

const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
const file: Media = { id: 20, publicId: 'point/video/slip', jenis: 'video', alt: null, width: 1080, height: 1920, ...waktu }
const video = { judul: 'PPh 21 dijelaskan', slug: 'pph-21', file, poster: null, transkrip: 'Transkrip.', _status: 'published' as const }

describe('validasiVtt', () => {
  it('kosong boleh; isi harus diawali WEBVTT dan punya cue bertanda waktu', () => {
    expect(validasiVtt('')).toBe(true)
    expect(validasiVtt(null)).toBe(true)
    expect(validasiVtt(VTT)).toBe(true)
    expect(validasiVtt('﻿WEBVTT - takarir\n\n00:01.000 --> 00:02.000\nHai')).toBe(true)
    expect(validasiVtt('00:00.000 --> 00:04.000\nTanpa kepala')).toBe('Takarir harus diawali baris WEBVTT.')
    expect(validasiVtt('WEBVTTX\n\n00:00.000 --> 00:01.000\nA')).toBe('Takarir harus diawali baris WEBVTT.')
    expect(validasiVtt('WEBVTT\n\nHanya teks.')).toBe('Takarir belum punya cue bertanda waktu (contoh: 00:00.000 --> 00:04.000).')
    expect(validasiVtt(`WEBVTT\n\n00:00.000 --> 00:01.000\n${'a'.repeat(20_000)}`)).toMatch(/^Takarir terlalu panjang/)
  })
})

describe('takarir di pemutar', () => {
  it('track takarir bahasa Indonesia hanya bila video punya takarir', () => {
    expect(pathTakarir('pph-21')).toBe('/video/pph-21/takarir.vtt')
    const dengan = renderToStaticMarkup(h(VideoSemat, { video: { ...video, takarir: VTT }, cloudName: 'demo' }))
    expect(dengan).toContain('<track kind="captions" src="/video/pph-21/takarir.vtt" srcLang="id" label="Bahasa Indonesia"/>')
    const tanpa = renderToStaticMarkup(h(VideoSemat, { video: { ...video, takarir: ' ' }, cloudName: 'demo' }))
    expect(tanpa).not.toContain('<track')
  })
})
