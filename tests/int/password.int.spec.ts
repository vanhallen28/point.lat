import type { Payload } from 'payload'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { getTestPayload, pesanGalat, unik } from './helpers'

let payload: Payload

beforeAll(async () => {
  payload = await getTestPayload()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const pengguna = (password: string) => ({ email: `${unik('sandi')}@tes.local`, password, nama: 'Penguji password', peran: 'editor' as const })

describe('password pengguna di lingkungan terbuka', () => {
  it('lokal dan tes tetap menerima password pendek (database tes lokal di luar Vercel)', async () => {
    const dibuat = await payload.create({ collection: 'pengguna', data: pengguna('rahasia-123') })
    await payload.delete({ collection: 'pengguna', id: dibuat.id })
  })

  it('deploy Vercel: buat pengguna dan ganti password menolak password contoh dan password lemah', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    expect(await pesanGalat(payload.create({ collection: 'pengguna', data: pengguna('ganti-password-ini') }))).toBe(
      'password: Password ini contoh dari .env.example. Buat password baru.',
    )
    expect(await pesanGalat(payload.create({ collection: 'pengguna', data: pengguna('rahasia-123') }))).toBe(
      'password: Password minimal 15 karakter. Pakai frasa panjang yang mudah kamu ingat, misalnya empat kata acak.',
    )

    const dibuat = await payload.create({ collection: 'pengguna', data: pengguna('kopi-hujan-sepeda-jendela') })
    expect(await pesanGalat(payload.update({ collection: 'pengguna', id: dibuat.id, data: { password: 'kopi-admin-sepeda-jendela' } }))).toBe(
      'password: Password tidak boleh memuat "admin". Pakai kata yang tidak berhubungan dengan situs atau akunmu.',
    )
    await payload.update({ collection: 'pengguna', id: dibuat.id, data: { nama: 'Ganti nama tanpa password' } })
    await payload.update({ collection: 'pengguna', id: dibuat.id, data: { password: 'teh-pagi-kereta-jembatan' } })
    const masuk = await payload.login({ collection: 'pengguna', data: { email: dibuat.email, password: 'teh-pagi-kereta-jembatan' } })
    expect(masuk.user?.id).toBe(dibuat.id)
    await payload.delete({ collection: 'pengguna', id: dibuat.id })
  })
})
