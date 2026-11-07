import { ValidationError, type CollectionBeforeValidateHook } from 'payload'

import { lingkunganTerbuka } from '@/modules/lingkungan/aturan'
import { periksaPassword } from '@/modules/lingkungan/password'

/**
 * Password baru atau yang diganti di lingkungan terbuka (deploy Vercel, atau `npm run seed` dan skrip ke database
 * Supabase) wajib lolos `periksaPassword`; berlaku juga untuk halaman buat admin pertama dan ganti password di
 * akun. Lokal, tes, dan E2E (database lokal di luar Vercel) tidak diperiksa.
 */
export const tolakPasswordLemah: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
  const password: unknown = data?.password
  if (typeof password !== 'string' || !lingkunganTerbuka()) return data
  const hasil = periksaPassword(password, { email: data?.email ?? originalDoc?.email })
  if (hasil !== true) {
    throw new ValidationError({ collection: 'pengguna', errors: [{ path: 'password', message: hasil }], req }, req.t)
  }
  return data
}
