import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { MENIT } from '@/modules/indexer/aturan'

import type { JenisTugas, StatusTugas } from './tipe'

/** Sewa tugas yang sedang berjalan; bila proses berhenti di tengah jalan, tugas dicoba lagi setelahnya. */
const SEWA_MS = 15 * MENIT

export type KlaimTugas = { id: number; versi: number }

/**
 * Mengklaim tugas yang sudah jatuh tempo (`berikutnya <= sekarang`), atau `null` bila belum jatuh tempo
 * atau sedang dijalankan proses lain. Baris dibuat sekali lewat `INSERT ... ON CONFLICT DO NOTHING`
 * (jatuh tempo saat itu juga), lalu diklaim dengan satu `UPDATE ... RETURNING` supaya dua cron yang
 * berjalan bersamaan tidak sama-sama menang (pola yang sama dengan klaim antrean Mesin Indexing).
 */
export async function klaimTugas(payload: Payload, jenis: JenisTugas, sekarang: Date): Promise<KlaimTugas | null> {
  const db = payload.db.drizzle
  await db.execute(sql`
    insert into tugas_seo (jenis, berikutnya, versi) values (${jenis}, ${sekarang.toISOString()}, 0)
    on conflict (jenis) do nothing`)
  const { rows } = await db.execute(sql`
    update tugas_seo set status = 'berjalan', mulai = ${sekarang.toISOString()}, versi = versi + 1, updated_at = now(),
      berikutnya = ${new Date(sekarang.getTime() + SEWA_MS).toISOString()}
    where jenis = ${jenis} and berikutnya <= ${sekarang.toISOString()}
    returning id, versi`)
  const baris = rows[0] as { id: number; versi: number } | undefined
  return baris ? { id: Number(baris.id), versi: Number(baris.versi) } : null
}

/** Mencatat hasil tugas yang sudah diklaim dan jadwal berikutnya. */
export async function selesaikanTugas(
  payload: Payload,
  klaim: KlaimTugas,
  hasil: { status: Exclude<StatusTugas, 'berjalan'>; pesan: string; berikutnya: Date },
  sekarang: Date,
): Promise<void> {
  await payload.update({
    collection: 'tugas-seo',
    where: { and: [{ id: { equals: klaim.id } }, { versi: { equals: klaim.versi } }] },
    data: { status: hasil.status, pesan: hasil.pesan, selesai: sekarang.toISOString(), berikutnya: hasil.berikutnya.toISOString() },
    depth: 0,
  })
}
