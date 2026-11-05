import config from '@payload-config'
import { getPayload } from 'payload'

import { jalankanJadwal } from '@/modules/indexer/endpoint'
import { JENIS_TUGAS, LABEL_STATUS_TUGAS, LABEL_TUGAS } from '@/modules/pantau/tipe'

/**
 * `pnpm indexer`: menjalankan sekali pekerjaan cron (jadwal terbit, antrean Mesin Indexing, dan tugas
 * Pantau SEO yang jatuh tempo) tanpa Vercel. Adapter mengikuti `INDEXER_ADAPTER` (lokal: palsu, tanpa jaringan).
 */
const payload = await getPayload({ config })
const { jadwalTerbit, indexer, pantau } = await jalankanJadwal(payload)
const tugas = JENIS_TUGAS.flatMap((jenis) => {
  const h = pantau[jenis]
  return h ? [`${LABEL_TUGAS[jenis]} ${LABEL_STATUS_TUGAS[h.status].toLowerCase()} (${h.pesan})`] : []
})
if (pantau.tautanDicek) tugas.push(`${pantau.tautanDicek} tautan luar dicek`)
payload.logger.info(
  `Jadwal terbit: ${jadwalTerbit} job. Mesin Indexing: ${indexer.diproses} langkah (berhasil ${indexer.berhasil}, ` +
    `dicoba lagi ${indexer.diulang}, gagal ${indexer.gagal}, dilewati ${indexer.dilewati}, ditunda ${indexer.ditunda}). ` +
    `Pantau SEO: ${tugas.join('; ') || 'belum ada tugas yang jatuh tempo'}.`,
)
process.exit(0)
