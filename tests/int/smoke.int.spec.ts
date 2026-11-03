import { describe, expect, it } from 'vitest'

import { getTestPayload } from './helpers'

describe('fondasi', () => {
  it('Payload menyala dan terhubung ke database tes', async () => {
    const payload = await getTestPayload()
    expect(process.env.DATABASE_URL).toContain('pointlat_test')
    const hasil = await payload.find({ collection: 'pengguna', limit: 1 })
    expect(hasil.totalDocs).toBeGreaterThanOrEqual(0)
  })
})
