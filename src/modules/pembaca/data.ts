import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { isiCsv, type BarisPelanggan } from './aturan'
import { UMUR_PESAN_BULAN, UMUR_SIDIK_JAM, type IsianKontak } from './tipe'

const SEJAM_MS = 60 * 60 * 1000

/** Koleksi yang menyimpan kiriman form pembaca, dengan sidik pengirim untuk batas kiriman. */
export type KoleksiPembaca = 'pesan-masuk' | 'pelanggan-newsletter'

/** Jumlah kiriman dari sidik yang sama dalam satu jam terakhir. */
export async function kirimanSejam(payload: Payload, koleksi: KoleksiPembaca, sidik: string, sekarang: Date): Promise<number> {
  const { totalDocs } = await payload.count({
    collection: koleksi,
    where: { and: [{ sidik: { equals: sidik } }, { createdAt: { greater_than: new Date(sekarang.getTime() - SEJAM_MS).toISOString() } }] },
    overrideAccess: true,
  })
  return totalDocs
}

/** Menyimpan pesan dari form kontak (status Baru). */
export async function simpanPesan(payload: Payload, isian: IsianKontak, asal: string, sidik: string): Promise<void> {
  await payload.create({
    collection: 'pesan-masuk',
    data: { ...isian, asal, sidik, status: 'baru' },
    overrideAccess: true,
    depth: 0,
  })
}

/**
 * Menyimpan pelanggan newsletter. Email yang sudah terdaftar tidak diubah dan tidak dibedakan dari pendaftar baru
 * (`INSERT ... ON CONFLICT DO NOTHING`), supaya form tidak membocorkan siapa yang terdaftar.
 */
export async function simpanPelanggan(payload: Payload, email: string, sumber: string, sidik: string, sekarang: Date): Promise<void> {
  const waktu = sekarang.toISOString()
  await payload.db.drizzle.execute(sql`
    insert into pelanggan_newsletter (email, sumber, disetujui_pada, sidik, created_at, updated_at)
    values (${email}, ${sumber}, ${waktu}, ${sidik}, ${waktu}, ${waktu})
    on conflict (email) do nothing`)
}

/** Berhenti langganan: baris email itu dihapus (bukan ditandai). Tidak memberi tahu apakah email itu terdaftar. */
export async function hapusPelanggan(payload: Payload, email: string): Promise<void> {
  await payload.delete({ collection: 'pelanggan-newsletter', where: { email: { equals: email } }, overrideAccess: true, depth: 0 })
}

/** Semua pelanggan untuk CSV, urut tanggal daftar. Dibaca per 1.000 baris. */
export async function csvPelanggan(payload: Payload): Promise<string> {
  const baris: BarisPelanggan[] = []
  for (let halaman = 1; ; halaman++) {
    const hasil = await payload.find({
      collection: 'pelanggan-newsletter',
      sort: ['createdAt', 'id'],
      limit: 1000,
      page: halaman,
      depth: 0,
      overrideAccess: true,
      select: { email: true, sumber: true, createdAt: true },
    })
    for (const d of hasil.docs) baris.push({ email: d.email, sumber: d.sumber ?? null, terdaftar: d.createdAt })
    if (!hasil.hasNextPage) break
  }
  return isiCsv(baris)
}

/**
 * Pemeliharaan harian (dipanggil cron): sidik pengirim lebih dari 24 jam dikosongkan di kedua koleksi, dan pesan
 * masuk lebih dari 12 bulan dihapus (spesifikasi §23). Lewat SQL supaya satu pernyataan per tabel.
 */
export async function bersihkanPembaca(payload: Payload, sekarang = new Date()): Promise<{ sidik: number; pesan: number }> {
  const db = payload.db.drizzle
  const batasSidik = new Date(sekarang.getTime() - UMUR_SIDIK_JAM * SEJAM_MS).toISOString()
  const batasPesan = new Date(sekarang)
  batasPesan.setUTCMonth(batasPesan.getUTCMonth() - UMUR_PESAN_BULAN)
  const a = await db.execute(sql`update pesan_masuk set sidik = null where sidik is not null and created_at < ${batasSidik}`)
  const b = await db.execute(sql`update pelanggan_newsletter set sidik = null where sidik is not null and created_at < ${batasSidik}`)
  const c = await db.execute(sql`delete from pesan_masuk where created_at < ${batasPesan.toISOString()}`)
  return { sidik: (a.rowCount ?? 0) + (b.rowCount ?? 0), pesan: c.rowCount ?? 0 }
}
