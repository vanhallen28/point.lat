import config from '@payload-config'
import { getPayload } from 'payload'

import { jalankanJadwal } from '@/modules/indexer/endpoint'

/**
 * `pnpm indexer`: menjalankan sekali pekerjaan cron (jadwal terbit dan antrean Mesin Indexing) tanpa
 * Vercel. Adapter mengikuti `INDEXER_ADAPTER` (lokal: palsu, tanpa jaringan).
 */
const payload = await getPayload({ config })
const { jadwalTerbit, indexer } = await jalankanJadwal(payload)
payload.logger.info(
  `Jadwal terbit: ${jadwalTerbit} job. Mesin Indexing: ${indexer.diproses} langkah (berhasil ${indexer.berhasil}, ` +
    `dicoba lagi ${indexer.diulang}, gagal ${indexer.gagal}, dilewati ${indexer.dilewati}, ditunda ${indexer.ditunda}).`,
)
process.exit(0)
