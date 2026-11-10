import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

import { bolehTulis, JEDA_USULAN_MS, masihSempat, perluUsulan } from './aturan'
import { ambilPengaturanOtomasi, antrekanTerbit, bacaTerakhir, drafHariIni, mintaUsulan, tulisDraf } from './data'
import type { RingkasanOtomasi } from './tipe'

/** Kunci di `payload_kv`: satu jalan otomasi (cron atau tombol) pada satu waktu. */
export const KUNCI_JALAN = 'otomasi:berjalan'
/** Jalan yang tidak selesai dalam 6 menit (fungsi Vercel berhenti di 300 detik) dianggap mati. */
export const BATAS_JALAN_MS = 6 * 60 * 1000

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

/** Waktu mulai jalan yang sedang berlangsung, atau `null`. */
export async function sedangBerjalan(payload: Payload, sekarang = new Date()): Promise<string | null> {
  const { rows } = await payload.db.drizzle.execute(sql`select data from payload_kv where key = ${KUNCI_JALAN}`)
  const mulai = (rows[0]?.data as { mulai?: string } | undefined)?.mulai
  if (!mulai || sekarang.getTime() - Date.parse(mulai) > BATAS_JALAN_MS) return null
  return mulai
}

export type OpsiOtomasi = {
  sekarang?: Date
  /** Waktu mulai jalan ini (ms), untuk anggaran waktu fungsi; bawaan sekarang. */
  mulai?: number
  /** Paksa satu langkah dari tombol admin, tanpa menunggu syarat jadwal. */
  paksa?: 'usulan' | 'tulis'
  /** Jam sekarang untuk anggaran waktu (tes). */
  jam?: () => number
}

/**
 * Satu jalan Otomasi artikel (spesifikasi §27), dari cron `/api/usulan-topik/jalan` (lima kali sehari) atau tombol
 * admin: antrekan draf yang sudah direview, minta usulan bila yang menunggu habis (paling sering sekali per 20 jam),
 * lalu tulis paling banyak satu draf bila kuota hari ini belum habis dan jalan ini belum lewat 70 detik. Dijaga
 * kunci `payload_kv`, jadi cron dan tombol yang bersamaan tidak menulis dua kali.
 */
export async function jalankanOtomasi(payload: Payload, opsi: OpsiOtomasi = {}): Promise<RingkasanOtomasi> {
  const sekarang = opsi.sekarang ?? new Date()
  const jam = opsi.jam ?? Date.now
  const mulai = opsi.mulai ?? jam()
  const kosong: RingkasanOtomasi = { status: 'selesai', antre: { diantre: 0, terbit: 0, kembali: 0 }, usulan: null, tulis: null }
  const pengaturan = await ambilPengaturanOtomasi(payload)
  if (!pengaturan.aktif && !opsi.paksa) return { ...kosong, status: 'mati' }
  if (!(await ambilKunci(payload, sekarang))) return { ...kosong, status: 'berjalan-lain' }
  try {
    const antre = await antrekanTerbit(payload, { sekarang, paksa: Boolean(opsi.paksa) })
    const ringkas: RingkasanOtomasi = { ...kosong, antre: { diantre: antre.diantre.length, terbit: antre.terbit, kembali: antre.kembali } }

    const [menunggu, disetujui, terakhir] = await Promise.all([
      payload.count({ collection: 'usulan-topik', where: { status: { equals: 'usulan' } }, overrideAccess: true }),
      payload.count({ collection: 'usulan-topik', where: { status: { equals: 'disetujui' } }, overrideAccess: true }),
      bacaTerakhir(payload),
    ])
    const lamaUsulan = terakhir.usulan ? sekarang.getTime() - Date.parse(terakhir.usulan) : Infinity
    const mintaSekarang =
      opsi.paksa === 'usulan' ||
      (!opsi.paksa && perluUsulan(menunggu.totalDocs, disetujui.totalDocs, pengaturan.drafPerHari) && lamaUsulan >= JEDA_USULAN_MS)
    if (mintaSekarang) ringkas.usulan = await mintaUsulan(payload, { sekarang })

    const tulisSekarang =
      opsi.paksa === 'tulis' || (!opsi.paksa && bolehTulis(await drafHariIni(payload, sekarang), pengaturan.drafPerHari))
    if (tulisSekarang && masihSempat(mulai, jam())) {
      const t = await tulisDraf(payload, { sekarang })
      ringkas.tulis =
        t.status === 'berhasil'
          ? { slug: t.slug, pesan: null }
          : { slug: null, pesan: t.status === 'kosong' ? 'Belum ada topik yang disetujui.' : t.pesan }
    }
    return ringkas
  } finally {
    await lepasKunci(payload)
  }
}
