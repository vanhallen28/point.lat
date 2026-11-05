import { describe, expect, it } from 'vitest'

import { izinCron } from '@/modules/indexer/endpoint'

describe('izinCron: header Vercel Cron', () => {
  it('menerima Authorization: Bearer CRON_SECRET yang persis sama', () => {
    expect(izinCron('Bearer rahasia-cron-panjang-2026', 'rahasia-cron-panjang-2026')).toBe(true)
  })

  it('menolak rahasia lain, tanpa awalan Bearer, tanpa header, dan bila CRON_SECRET belum diatur', () => {
    expect(izinCron('Bearer rahasia-lain-panjang-2026', 'rahasia-cron-panjang-2026')).toBe(false)
    expect(izinCron('rahasia-cron-panjang-2026', 'rahasia-cron-panjang-2026')).toBe(false)
    expect(izinCron(null, 'rahasia-cron-panjang-2026')).toBe(false)
    expect(izinCron('Bearer ', '')).toBe(false)
    expect(izinCron('Bearer undefined', undefined)).toBe(false)
  })
})
