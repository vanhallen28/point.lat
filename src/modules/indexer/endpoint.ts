import { timingSafeEqual } from 'crypto'
import type { Endpoint, Payload } from 'payload'

import { jalankanPantau, type AdapterPantau, type RingkasanPantau } from '@/modules/pantau'

import { jalankanIndexer, type RingkasanJalan } from './jalan'

/**
 * Header dari Vercel Cron: `Authorization: Bearer <CRON_SECRET>` (dokumentasi Vercel "Securing cron
 * jobs"). Tanpa `CRON_SECRET` di env, permintaan tanpa login admin selalu ditolak. Dibandingkan dengan
 * waktu tetap supaya rahasia tidak bisa ditebak dari lama jawaban.
 */
export function izinCron(header: string | null | undefined, rahasia: string | undefined): boolean {
  if (!rahasia || !header) return false
  const diterima = Buffer.from(header)
  const diharapkan = Buffer.from(`Bearer ${rahasia}`)
  return diterima.length === diharapkan.length && timingSafeEqual(diterima, diharapkan)
}

export type HasilJadwal = { jadwalTerbit: number; indexer: RingkasanJalan; pantau: RingkasanPantau }

export type OpsiJadwal = NonNullable<Parameters<typeof jalankanIndexer>[1]> & { adapterPantau?: AdapterPantau }

/**
 * Pekerjaan berkala (spesifikasi §5 "Penjadwal"): job Payload yang jatuh tempo (jadwal terbit artikel,
 * `schedulePublish`), lalu antrean Mesin Indexing, lalu tugas Pantau SEO yang jatuh tempo (sinkron
 * Search Analytics harian). Urutan ini membuat artikel yang terbit terjadwal langsung dikabarkan pada
 * jalan yang sama.
 */
export async function jalankanJadwal(payload: Payload, opsi: OpsiJadwal = {}): Promise<HasilJadwal> {
  const job = await payload.jobs.run({ allQueues: true, overrideAccess: true, silent: true })
  const indexer = await jalankanIndexer(payload, { sekarang: opsi.sekarang, adapter: opsi.adapter })
  const pantau = await jalankanPantau(payload, { sekarang: opsi.sekarang, adapter: opsi.adapterPantau })
  return { jadwalTerbit: Object.keys(job.jobStatus ?? {}).length, indexer, pantau }
}

/**
 * `GET /api/jobs/run`: dipanggil Vercel Cron setiap 10 menit (`vercel.json`). GET karena Vercel Cron
 * hanya mengirim GET. Boleh juga dibuka admin yang sedang masuk (menjalankan antrean sekarang).
 */
export const endpointJalankanJob: Endpoint = {
  path: '/jobs/run',
  method: 'get',
  handler: async (req) => {
    const admin = (req.user as { peran?: string | null } | null | undefined)?.peran === 'admin'
    if (!admin && !izinCron(req.headers.get('authorization'), process.env.CRON_SECRET)) {
      return Response.json({ pesan: 'Butuh header Authorization: Bearer CRON_SECRET, atau masuk sebagai admin.' }, { status: 401 })
    }
    return Response.json(await jalankanJadwal(req.payload))
  },
}
