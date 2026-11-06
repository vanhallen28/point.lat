import { describe, expect, it } from 'vitest'

import { HEADER_KEAMANAN, KEBIJAKAN_KONTEN } from '@/lib/header-keamanan'
import nextConfig from '../../next.config'

const header = (key: string) => HEADER_KEAMANAN.find((h) => h.key === key)?.value

describe('header keamanan', () => {
  it('nosniff, referrer origin lintas situs, bingkai hanya situs sendiri, fitur perangkat dimatikan', () => {
    expect(HEADER_KEAMANAN.map((h) => h.key)).toEqual([
      'X-Content-Type-Options',
      'Referrer-Policy',
      'X-Frame-Options',
      'Permissions-Policy',
      'Content-Security-Policy',
    ])
    expect(header('X-Content-Type-Options')).toBe('nosniff')
    expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    expect(header('X-Frame-Options')).toBe('SAMEORIGIN')
    expect(header('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=(), payment=(), usb=()')
  })

  it('CSP tanpa arahan skrip (AdSense hanya mendukung nonce per permintaan, yang mematikan ISR)', () => {
    expect(KEBIJAKAN_KONTEN).toBe("base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'")
    expect(KEBIJAKAN_KONTEN).not.toMatch(/script-src|default-src|unsafe/)
  })

  it('API privasi iklan dan HSTS tidak disentuh (HSTS dari Vercel)', () => {
    for (const fitur of ['browsing-topics', 'attribution-reporting', 'run-ad-auction', 'join-ad-interest-group']) {
      expect(header('Permissions-Policy')).not.toContain(fitur)
    }
    expect(header('Strict-Transport-Security')).toBeUndefined()
  })

  it('next.config memasang header di semua path dan tidak mengirim X-Powered-By', async () => {
    expect(nextConfig.poweredByHeader).toBe(false)
    const aturan = await nextConfig.headers!()
    expect(aturan[0]).toEqual({ source: '/:path*', headers: HEADER_KEAMANAN })
    expect(aturan.flatMap((a) => a.headers).some((h) => h.key.toLowerCase() === 'x-powered-by')).toBe(false)
  })
})
