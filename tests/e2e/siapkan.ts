import config from '@payload-config'
import { getPayload } from 'payload'

import { pakaiKlien } from '@/modules/media'
import { klienPalsu } from '@/modules/media/palsu'
import { seed } from '@/seed/seed'

import { ADMIN_E2E } from './data'

/**
 * Mengisi database E2E sebelum server dibangun dan dinyalakan (`webServer` di playwright.config.ts).
 * Media disimpan lewat klien palsu bernama `e2e` (sama dengan `CLOUDINARY_CLOUD_NAME` server E2E),
 * jadi tidak ada panggilan jaringan.
 */
pakaiKlien(klienPalsu('e2e'))
const payload = await getPayload({ config })
await seed(payload, { emailAdmin: ADMIN_E2E.email, passwordAdmin: ADMIN_E2E.password })
payload.logger.info('Data E2E siap.')
process.exit(0)
