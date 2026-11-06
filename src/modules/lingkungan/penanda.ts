import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import type { Penanda } from './aturan'

/** Kunci baris penanda di tabel `payload_kv` (penyimpanan kunci-nilai bawaan Payload). */
export const KUNCI_PENANDA = 'lingkungan-database'

/**
 * Penanda lingkungan database, `null` bila belum ada. `undefined` bila tabel `payload_kv` belum ada
 * (database baru sebelum migrasi pertama), jadi belum ada yang perlu dilindungi.
 */
export async function bacaPenanda(payload: Payload): Promise<string | null | undefined> {
  try {
    const { rows } = await payload.db.drizzle.execute(sql`select data from payload_kv where key = ${KUNCI_PENANDA}`)
    const data = rows[0]?.data as { lingkungan?: unknown } | undefined
    return typeof data?.lingkungan === 'string' ? data.lingkungan : null
  } catch (galat) {
    if (kodePostgres(galat) === '42P01') return undefined
    throw galat
  }
}

/** Kode galat Postgres (`42P01`: tabel tidak ada), juga bila dibungkus galat Drizzle (`cause`). */
function kodePostgres(galat: unknown): string | undefined {
  const g = galat as { code?: unknown; cause?: unknown } | null
  if (typeof g?.code === 'string') return g.code
  return g?.cause ? kodePostgres(g.cause) : undefined
}

/**
 * Menulis penanda bila belum ada. `ON CONFLICT DO NOTHING`: worker build yang berjalan bersamaan tidak
 * saling menimpa, dan penanda yang sudah ada tidak pernah diganti.
 */
export async function tulisPenanda(payload: Payload, lingkungan: Penanda, sekarang = new Date()): Promise<void> {
  const data = JSON.stringify({ lingkungan, ditandai: sekarang.toISOString() })
  await payload.db.drizzle.execute(
    sql`insert into payload_kv (key, data) values (${KUNCI_PENANDA}, ${data}::jsonb) on conflict (key) do nothing`,
  )
}
