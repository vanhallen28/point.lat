import type { PayloadRequest } from 'payload'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { tolakPasswordLemah } from '@/hooks/tolakPasswordLemah'
import { CONTOH_ENV } from '@/modules/lingkungan'
import { KATA_DITOLAK, MIN_PASSWORD, periksaPassword } from '@/modules/lingkungan/password'

const KUAT = 'kopi-hujan-sepeda-jendela'

describe('periksaPassword', () => {
  it('frasa panjang lolos tanpa aturan huruf besar, angka, atau simbol', () => {
    expect(periksaPassword(KUAT, { email: 'redaksi@point.lat' })).toBe(true)
    expect(periksaPassword('x'.repeat(200) + 'abcd')).toBe(true)
  })

  it('password contoh .env.example dan password pendek ditolak dengan cara memperbaikinya', () => {
    expect(periksaPassword(CONTOH_ENV.SEED_ADMIN_PASSWORD)).toBe('Password ini contoh dari .env.example. Buat password baru.')
    expect(MIN_PASSWORD).toBe(15)
    expect(periksaPassword('kopi-hujan-sep')).toBe(
      'Password minimal 15 karakter. Pakai frasa panjang yang mudah kamu ingat, misalnya empat kata acak.',
    )
    expect(periksaPassword('kopi-hujan-sepe')).toBe(true)
  })

  it('kata yang terkait situs atau akun dan password yang berulang ditolak', () => {
    expect(KATA_DITOLAK).toEqual(['point', 'password', 'admin', 'qwerty', '123456'])
    expect(periksaPassword('Point-lat-hujan-sepeda')).toBe(
      'Password tidak boleh memuat "point". Pakai kata yang tidak berhubungan dengan situs atau akunmu.',
    )
    expect(periksaPassword('kopi-ADMIN-sepeda-jendela')).toBe(
      'Password tidak boleh memuat "admin". Pakai kata yang tidak berhubungan dengan situs atau akunmu.',
    )
    expect(periksaPassword('kopi-redaksi-sepeda-jendela', { email: 'redaksi@point.lat' })).toBe(
      'Password tidak boleh memuat "redaksi". Pakai kata yang tidak berhubungan dengan situs atau akunmu.',
    )
    expect(periksaPassword('ababababababababab')).toBe('Password terlalu mudah ditebak. Pakai frasa dengan kata yang berbeda-beda.')
  })
})

describe('tolakPasswordLemah', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  const req = { t: (k: string) => k } as unknown as PayloadRequest
  const jalankan = (data: Record<string, unknown>, originalDoc?: Record<string, unknown>) =>
    tolakPasswordLemah({ data, originalDoc, req, operation: originalDoc ? 'update' : 'create' } as unknown as Parameters<typeof tolakPasswordLemah>[0])

  it('lokal dan tes (database lokal di luar Vercel) tidak diperiksa', () => {
    vi.stubEnv('VERCEL_ENV', '')
    vi.stubEnv('DATABASE_URL', 'postgres://postgres:postgres@127.0.0.1:5432/pointlat_test')
    expect(jalankan({ email: 'e@tes.local', password: 'rahasia-123' })).toEqual({ email: 'e@tes.local', password: 'rahasia-123' })
  })

  it('deploy Vercel atau database Supabase: password lemah ditolak di field password, tanpa password tidak diperiksa', () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    expect(() => jalankan({ email: 'redaksi@point.lat', password: CONTOH_ENV.SEED_ADMIN_PASSWORD })).toThrow(
      expect.objectContaining({ data: expect.objectContaining({ errors: [{ path: 'password', message: 'Password ini contoh dari .env.example. Buat password baru.' }] }) }),
    )
    expect(jalankan({ email: 'redaksi@point.lat', password: KUAT })).toMatchObject({ password: KUAT })
    expect(jalankan({ nama: 'Redaksi' }, { email: 'redaksi@point.lat' })).toEqual({ nama: 'Redaksi' })

    vi.stubEnv('VERCEL_ENV', '')
    vi.stubEnv('DATABASE_URL', 'postgresql://postgres.abcdefghijklmnopqrst:kata-sandi-tiruan@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres')
    expect(() => jalankan({ password: 'kopi-redaksi-sepeda' }, { email: 'redaksi@point.lat' })).toThrow(
      expect.objectContaining({ data: expect.objectContaining({ errors: [expect.objectContaining({ path: 'password' })] }) }),
    )
  })
})
