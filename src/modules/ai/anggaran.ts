import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { awalBulanJakarta, bulanSebelum, RETENSI_LOG_BULAN } from './aturan'

/**
 * Anggaran bulanan asisten AI di Postgres (koleksi `pemakaian-ai`, satu baris per bulan waktu Jakarta).
 * Sebelum Claude dipanggil, perkiraan biaya maksimal permintaan dicadangkan dengan satu
 * `UPDATE ... WHERE terpakai + cadangan <= batas RETURNING`, jadi dua permintaan yang berjalan bersamaan
 * tidak bisa sama-sama lolos melewati batas (pola klaim atomik Mesin Indexing dan Pantau SEO). Setelah
 * jawaban datang, cadangan diganti biaya sebenarnya. SQL memakai koneksi pool, di luar transaksi
 * permintaan, supaya cadangan langsung terlihat permintaan lain selama Claude berpikir.
 */

export type HasilCadangan = { berhasil: boolean; terpakai: number }

const angka = (v: unknown) => Number(v ?? 0)

/**
 * Membuat baris bulan bila belum ada. Bulan baru juga membuang log AI yang lebih tua dari 13 bulan (sekali
 * per bulan, oleh permintaan yang membuat barisnya).
 */
async function siapkanBulan(payload: Payload, bulan: string): Promise<void> {
  const db = payload.db.drizzle
  const { rows } = await db.execute(sql`
    insert into pemakaian_ai (bulan, terpakai, updated_at, created_at) values (${bulan}, 0, now(), now())
    on conflict (bulan) do nothing
    returning id`)
  if (rows.length === 0) return
  const batas = awalBulanJakarta(bulanSebelum(bulan, RETENSI_LOG_BULAN - 1)).toISOString()
  await db.execute(sql`delete from log_ai where waktu < ${batas}`)
}

/** Total yang terpakai pada bulan itu (0 bila belum ada permintaan). */
export async function terpakaiBulan(payload: Payload, bulan: string): Promise<number> {
  const { rows } = await payload.db.drizzle.execute(sql`select terpakai from pemakaian_ai where bulan = ${bulan}`)
  return angka((rows[0] as { terpakai?: unknown } | undefined)?.terpakai)
}

/** Mencadangkan `cadangan` US$ dari anggaran bulan itu. Gagal (tanpa mengubah apa pun) bila melewati `batas`. */
export async function cadangkanAnggaran(payload: Payload, opsi: { bulan: string; cadangan: number; batas: number }): Promise<HasilCadangan> {
  await siapkanBulan(payload, opsi.bulan)
  const { rows } = await payload.db.drizzle.execute(sql`
    update pemakaian_ai set terpakai = terpakai + ${opsi.cadangan}, updated_at = now()
    where bulan = ${opsi.bulan} and terpakai + ${opsi.cadangan} <= ${opsi.batas}
    returning terpakai`)
  const baris = rows[0] as { terpakai?: unknown } | undefined
  if (baris) return { berhasil: true, terpakai: angka(baris.terpakai) }
  return { berhasil: false, terpakai: await terpakaiBulan(payload, opsi.bulan) }
}

/** Mengganti cadangan dengan biaya sebenarnya (biaya 0 bila Claude tidak dipanggil atau tidak menagih). */
export async function selesaikanAnggaran(payload: Payload, opsi: { bulan: string; cadangan: number; biaya: number }): Promise<void> {
  await payload.db.drizzle.execute(sql`
    update pemakaian_ai set terpakai = greatest(0, terpakai - ${opsi.cadangan} + ${opsi.biaya}), updated_at = now()
    where bulan = ${opsi.bulan}`)
}
