import config from '@payload-config'
import { getPayload, ValidationError } from 'payload'

import { seed } from './seed'

const payload = await getPayload({ config })
try {
  const hasil = await seed(payload, {
    emailAdmin: process.env.SEED_ADMIN_EMAIL,
    passwordAdmin: process.env.SEED_ADMIN_PASSWORD,
  })
  payload.logger.info(
    `Seed selesai. Admin: ${hasil.admin}. Pilar: ${hasil.pilar}. Halaman draf: ${hasil.halaman}. Tools baru: ${hasil.tools}. Parameter baru: ${hasil.parameter}.`,
  )
} catch (galat) {
  if (!(galat instanceof ValidationError)) throw galat
  // Pesan per isian (misalnya password admin yang ditolak di database Supabase), bukan hanya nama isiannya.
  payload.logger.error(`Seed dihentikan. ${galat.data.errors.map((e) => `${e.path}: ${e.message}`).join(' ')}`)
  process.exit(1)
}
process.exit(0)
