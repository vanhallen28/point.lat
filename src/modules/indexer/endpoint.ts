import { timingSafeEqual } from 'crypto'
import type { Endpoint, Payload } from 'payload'

import { tolakSelainAdmin } from '@/lib/aksiAdmin'
import { jalankanPantau, type AdapterPantau, type RingkasanPantau } from '@/modules/pantau'
import { bersihkanPembaca } from '@/modules/pembaca/data'

import { mintaCekStatus } from './cek'
import { jalankanIndexer, jalankanSetelahRespons, type RingkasanJalan } from './jalan'

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

export type HasilJadwal = { jadwalTerbit: number; indexer: RingkasanJalan; pantau: RingkasanPantau; pembaca: { sidik: number; pesan: number } }

export type OpsiJadwal = NonNullable<Parameters<typeof jalankanIndexer>[1]> & { adapterPantau?: AdapterPantau }

/**
 * Pekerjaan berkala (spesifikasi §5 "Penjadwal"): job Payload yang jatuh tempo (jadwal terbit artikel,
 * `schedulePublish`), lalu antrean Mesin Indexing, lalu tugas Pantau SEO yang jatuh tempo (sinkron
 * Search Analytics dan pindai tautan harian, cek tautan luar), lalu pembersihan data form pembaca. Urutan ini membuat artikel yang terbit terjadwal langsung dikabarkan pada
 * jalan yang sama.
 */
export async function jalankanJadwal(payload: Payload, opsi: OpsiJadwal = {}): Promise<HasilJadwal> {
  const job = await payload.jobs.run({ allQueues: true, overrideAccess: true, silent: true })
  const indexer = await jalankanIndexer(payload, { sekarang: opsi.sekarang, adapter: opsi.adapter })
  const pantau = await jalankanPantau(payload, { sekarang: opsi.sekarang, adapter: opsi.adapterPantau })
  // Sidik pengirim form lebih dari 24 jam dan pesan masuk lebih dari 12 bulan (spesifikasi §23).
  const pembaca = await bersihkanPembaca(payload, opsi.sekarang)
  return { jadwalTerbit: Object.keys(job.jobStatus ?? {}).length, indexer, pantau, pembaca }
}

/**
 * `GET /api/jobs/run`: dipanggil Vercel Cron sesuai jadwal di `vercel.json`. GET karena Vercel Cron
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

/** Path endpoint di bawah `/api/status-indeks`, dipanggil tombol "Cek sekarang" di daftar Status indeks. */
export const PATH_CEK_SEKARANG = '/:id/cek'

/**
 * `POST /api/status-indeks/{id}/cek`: "Cek sekarang" (hanya admin, dari admin situs sendiri). Cek dimasukkan
 * ke antrean lalu antrean dijalankan setelah respons terkirim (`after()`), jadi permintaan admin tidak
 * menunggu Google. Jawaban 202 (antre), 429 (kuota harian habis atau jeda 10 menit), atau 404.
 */
export const endpointCekSekarang: Endpoint = {
  path: PATH_CEK_SEKARANG,
  method: 'post',
  handler: async (req) => {
    const tolak = tolakSelainAdmin(req)
    if (tolak) return tolak
    const id = Number(req.routeParams?.id)
    if (!Number.isInteger(id) || id <= 0) return Response.json({ status: 'tidak-ada', pesan: 'Status indeks tidak dikenal.' }, { status: 404 })
    const hasil = await mintaCekStatus(req.payload, id)
    if (hasil.status === 'antre') jalankanSetelahRespons(req.payload)
    return Response.json(hasil, { status: hasil.status === 'antre' ? 202 : hasil.status === 'dibatasi' ? 429 : 404 })
  },
}
