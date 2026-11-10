import { timingSafeEqual } from 'crypto'

/**
 * Header dari Vercel Cron: `Authorization: Bearer <CRON_SECRET>` (dokumentasi Vercel "Securing cron
 * jobs"). Tanpa `CRON_SECRET` di env, permintaan tanpa login admin selalu ditolak. Dibandingkan dengan
 * waktu tetap supaya rahasia tidak bisa ditebak dari lama jawaban. Dipakai `/api/jobs/run` dan
 * `/api/usulan-topik/jalan` (Otomasi artikel).
 */
export function izinCron(header: string | null | undefined, rahasia: string | undefined): boolean {
  if (!rahasia || !header) return false
  const diterima = Buffer.from(header)
  const diharapkan = Buffer.from(`Bearer ${rahasia}`)
  return diterima.length === diharapkan.length && timingSafeEqual(diterima, diharapkan)
}
