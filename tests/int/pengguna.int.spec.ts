import { describe, expect, it } from 'vitest'

import { getTestPayload, unik } from './helpers'

describe('koleksi pengguna', () => {
  it('pengguna baru setelah yang pertama mendapat peran editor', async () => {
    const payload = await getTestPayload()

    await payload.create({
      collection: 'pengguna',
      data: { email: `${unik('a')}@tes.local`, password: 'rahasia-123', nama: 'Satu', peran: 'admin' },
    })
    const kedua = await payload.create({
      collection: 'pengguna',
      data: { email: `${unik('b')}@tes.local`, password: 'rahasia-123', nama: 'Dua' },
    })

    expect(kedua.peran).toBe('editor')
  })
})
