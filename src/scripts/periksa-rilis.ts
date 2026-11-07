import config from '@payload-config'
import { getPayload } from 'payload'

import { jenisLingkungan } from '@/modules/lingkungan'

/**
 * `npm run periksa:rilis`, langkah pertama build Vercel (`npm run build:vercel`), sebelum migrasi. Memuat config
 * (`tolakEnvSalah`: env deploy yang salah ditolak) dan menjalankan `onInit` (`periksaDatabase`: database milik
 * lingkungan lain ditolak, database baru ditandai), jadi migrasi tidak pernah menyentuh database yang salah.
 */
const payload = await getPayload({ config })
payload.logger.info(`Lingkungan ${jenisLingkungan() ?? 'lokal'} siap: env dan database cocok.`)
process.exit(0)
