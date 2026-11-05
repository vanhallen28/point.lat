import config from '@payload-config'
import { getPayload } from 'payload'

import { seed } from './seed'

const payload = await getPayload({ config })
const hasil = await seed(payload, {
  emailAdmin: process.env.SEED_ADMIN_EMAIL,
  passwordAdmin: process.env.SEED_ADMIN_PASSWORD,
})

payload.logger.info(
  `Seed selesai. Admin: ${hasil.admin}. Pilar: ${hasil.pilar}. Halaman draf: ${hasil.halaman}. Tools baru: ${hasil.tools}. Parameter baru: ${hasil.parameter}.`,
)
process.exit(0)
