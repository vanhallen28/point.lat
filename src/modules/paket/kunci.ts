import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import type { HasilImpor } from './tipe'

/** Kunci baris di `payload_kv`: impor yang sedang berjalan, dan hasil impor terakhir. */
export const KUNCI_JALAN = 'paket-awal:berjalan'
export const KUNCI_HASIL = 'paket-awal:hasil'

/** Impor yang tidak selesai dalam 15 menit (fungsi Vercel berhenti, misalnya) dianggap mati; kuncinya boleh diambil lagi. */
export const BATAS_JALAN_MS = 15 * 60 * 1000

/**
 * Mengambil kunci impor secara atomik: `INSERT ... ON CONFLICT DO UPDATE ... WHERE` hanya menimpa kunci yang
 * sudah kedaluwarsa. `true` berarti permintaan ini yang menjalankan impor; klik ganda mendapat `false`.
 */
export async function ambilKunci(payload: Payload, sekarang = new Date()): Promise<boolean> {
  const data = JSON.stringify({ mulai: sekarang.toISOString() })
  const batas = new Date(sekarang.getTime() - BATAS_JALAN_MS).toISOString()
  const { rows } = await payload.db.drizzle.execute(
    sql`insert into payload_kv (key, data) values (${KUNCI_JALAN}, ${data}::jsonb)
        on conflict (key) do update set data = excluded.data
        where (payload_kv.data->>'mulai')::timestamptz < ${batas}::timestamptz
        returning key`,
  )
  return rows.length > 0
}

export async function lepasKunci(payload: Payload): Promise<void> {
  await payload.db.drizzle.execute(sql`delete from payload_kv where key = ${KUNCI_JALAN}`)
}

/** Waktu mulai impor yang sedang berjalan, `null` bila tidak ada atau sudah kedaluwarsa. */
export async function sedangBerjalan(payload: Payload, sekarang = new Date()): Promise<string | null> {
  const { rows } = await payload.db.drizzle.execute(sql`select data from payload_kv where key = ${KUNCI_JALAN}`)
  const mulai = (rows[0]?.data as { mulai?: string } | undefined)?.mulai
  if (!mulai || sekarang.getTime() - Date.parse(mulai) > BATAS_JALAN_MS) return null
  return mulai
}

export async function simpanHasil(payload: Payload, hasil: HasilImpor): Promise<void> {
  const data = JSON.stringify(hasil)
  await payload.db.drizzle.execute(
    sql`insert into payload_kv (key, data) values (${KUNCI_HASIL}, ${data}::jsonb) on conflict (key) do update set data = excluded.data`,
  )
}

export async function bacaHasil(payload: Payload): Promise<HasilImpor | null> {
  const { rows } = await payload.db.drizzle.execute(sql`select data from payload_kv where key = ${KUNCI_HASIL}`)
  return (rows[0]?.data as HasilImpor | undefined) ?? null
}
