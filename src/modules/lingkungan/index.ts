import type { Payload } from 'payload'

import { jenisLingkungan, keputusanPenanda, masalahLingkungan } from './aturan'
import { bacaPenanda, tulisPenanda } from './penanda'

export {
  CONTOH_ENV,
  jenisLingkungan,
  keputusanPenanda,
  lingkunganTerbuka,
  masalahLingkungan,
  MIN_CRON_SECRET,
  MIN_PAYLOAD_SECRET,
  type JenisLingkungan,
  type KeputusanPenanda,
  type Penanda,
} from './aturan'
export { bacaPenanda, KUNCI_PENANDA, tulisPenanda } from './penanda'

type Env = Record<string, string | undefined>

/**
 * Menolak config Payload yang dimuat dengan env deploy yang salah (dipanggil di `payload.config.ts`), jadi
 * `payload migrate`, `next build`, dan setiap fungsi Vercel berhenti sebelum menyentuh database.
 */
export function tolakEnvSalah(env: Env = process.env): void {
  const masalah = masalahLingkungan(env)
  if (masalah.length) throw new Error(`Env deploy belum benar:\n- ${masalah.join('\n- ')}`)
}

/** Penolakan karena penanda database milik lingkungan lain (bukan galat koneksi atau query). */
export class DatabaseLingkunganLain extends Error {}

/**
 * Membaca penanda database: menolak database milik lingkungan lain (`DatabaseLingkunganLain`) atau menandai
 * database yang belum bertanda. Di luar deploy Vercel tidak melakukan apa pun (tanpa query).
 */
export async function periksaDatabase(payload: Payload, env: Env = process.env): Promise<void> {
  const jenis = jenisLingkungan(env)
  if (!jenis) return
  const penanda = await bacaPenanda(payload)
  if (penanda === undefined) return
  const { tulis, tolak } = keputusanPenanda(jenis, penanda)
  if (tolak) throw new DatabaseLingkunganLain(tolak)
  if (tulis) await tulisPenanda(payload, tulis)
}

/**
 * `onInit` di `payload.config.ts`. Setelah init gagal, `getPayload` berikutnya membuat Payload lagi tanpa
 * `onInit`, jadi penolakan yang hanya melempar galat lolos di permintaan kedua. Karena itu database milik
 * lingkungan lain menghentikan proses: skrip dan build gagal, fungsi Vercel tidak melayani permintaan.
 * Galat lain (misalnya koneksi) diteruskan seperti init yang gagal biasa.
 */
export async function jagaDatabase(payload: Payload, env: Env = process.env): Promise<void> {
  try {
    await periksaDatabase(payload, env)
  } catch (galat) {
    if (!(galat instanceof DatabaseLingkunganLain)) throw galat
    payload.logger.fatal(galat.message)
    process.exit(1)
  }
}
