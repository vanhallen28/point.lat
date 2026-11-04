import { readFileSync } from 'fs'
import path from 'path'
import { describe, expect, it } from 'vitest'

import { WARNA_PILAR } from '@/lib/konstanta'

/** Token `--nama: nilai;` di blok `:root` tokens.css. */
function bacaToken(): Record<string, string> {
  const css = readFileSync(path.resolve('src/styles/tokens.css'), 'utf8')
  const root = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
  return Object.fromEntries([...root.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
}

/** Rasio kontras WCAG 2.x antara dua warna hex. */
function kontras(a: string, b: string): number {
  const luminans = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    const f = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl)
  }
  const [terang, gelap] = [luminans(a), luminans(b)].sort((x, y) => y - x)
  return (terang + 0.05) / (gelap + 0.05)
}

const token = bacaToken()
const t = (nama: string) => token[nama]?.toLowerCase()

describe('token warna', () => {
  it('nilai primitif sama dengan spesifikasi §4', () => {
    expect([t('ink'), t('paper'), t('sand'), t('muted')]).toEqual(['#111111', '#ffffff', '#f4f1ec', '#5c5852'])
    expect([t('pilar-uang'), t('pilar-tekno'), t('pilar-belajar'), t('pilar-sehat')]).toEqual([
      '#1f7a4d',
      '#c2410c',
      '#f2c230',
      '#ff8a80',
    ])
  })

  it('warna pilar di CSS sama dengan pilihan warna di CMS', () => {
    const peta = { hijau: 'pilar-uang', oranye: 'pilar-tekno', kuning: 'pilar-belajar', koral: 'pilar-sehat' } as const
    for (const [warna, nama] of Object.entries(peta)) {
      expect(t(nama)).toBe(WARNA_PILAR[warna as keyof typeof peta].hex.toLowerCase())
    }
  })

  it('kontras terukur sama dengan tabel spesifikasi', () => {
    const r = (a: string, b: string) => Math.round(kontras(t(a), t(b)) * 100) / 100
    expect(r('ink', 'paper')).toBe(18.88)
    expect(r('ink', 'sand')).toBe(16.76)
    expect(r('muted', 'paper')).toBe(7.06)
    expect(r('muted', 'sand')).toBe(6.27)
    expect(r('paper', 'pilar-uang')).toBe(5.32)
    expect(r('paper', 'pilar-tekno')).toBe(5.18)
    expect(r('ink', 'pilar-belajar')).toBe(11.27)
    expect(r('ink', 'pilar-sehat')).toBe(8.27)
    expect(r('pilar-uang', 'sand')).toBe(4.72)
  })

  it('teks ink dan muted di latar pilar lembut lolos AA (4,5:1)', () => {
    for (const pilar of ['uang', 'tekno', 'belajar', 'sehat']) {
      const latar = t(`pilar-${pilar}-lembut`)
      expect(kontras(t('ink'), latar)).toBeGreaterThanOrEqual(4.5)
      expect(kontras(t('muted'), latar)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('token tipografi, bentuk, dan motion', () => {
  it('skala judul dan isi sesuai spesifikasi §4', () => {
    expect(token['teks-display']).toBe('clamp(72px, 14vw, 196px)')
    expect(token['teks-h1']).toBe('clamp(34px, 4.4vw, 58px)')
    expect(token['teks-label']).toBe('13px')
    expect(token['tinggi-isi']).toBe('1.6')
    expect([token['lebar-display'], token['lebar-h1']]).toEqual(['68%', '80%'])
  })

  it('radius, target sentuh, kontainer, dan gutter', () => {
    expect([token['radius-kontrol'], token['radius-kartu']]).toEqual(['14px', '24px'])
    expect(token['sentuh-min']).toBe('44px')
    expect(token['lebar-kontainer']).toBe('1200px')
    expect(token['gutter']).toBe('clamp(16px, 4vw, 40px)')
  })

  it('spasi kelipatan 4px', () => {
    const spasi = Object.entries(token).filter(([nama]) => nama.startsWith('ruang-'))
    expect(spasi.length).toBeGreaterThan(5)
    for (const [, nilai] of spasi) expect(parseInt(nilai, 10) % 4).toBe(0)
  })

  it('kurva dan durasi motion sesuai spesifikasi §13', () => {
    expect(token['kurva']).toBe('cubic-bezier(0.2, 0, 0, 1)')
    expect(token['kurva-keluar']).toBe('cubic-bezier(0.3, 0, 1, 1)')
    expect([token['durasi-cepat'], token['durasi-sedang'], token['durasi-halaman']]).toEqual(['150ms', '250ms', '400ms'])
    // Kartu masuk berurutan: 200 ms + 2 jeda 40 ms = 280 ms, di bawah total 300 ms.
    expect(token['durasi-masuk']).toBe('200ms')
    expect([token['jeda-urut'], token['geser-masuk']]).toEqual(['40ms', '12px'])
  })
})
