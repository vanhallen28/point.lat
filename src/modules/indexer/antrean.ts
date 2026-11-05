import { sql } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest, Where } from 'payload'

import type { AntreanIndexing } from '@/payload-types'

import { gabungBaris } from './aturan'
import type {
  BarisAntrean,
  JenisKabar,
  Langkah,
  LangkahAntrean,
  NamaAdapter,
  PengaturanIndexing,
  StatusIndeks,
  StatusLog,
} from './tipe'

/**
 * Penyimpanan Mesin Indexing di koleksi Payload: antrean (`antrean-indexing`), log (`log-indexing`),
 * dan status indeks (`status-indeks`). `req` diteruskan supaya kabar dari hook ikut transaksi simpan
 * dokumen: bila simpan gagal, antrean dan log ikut batal.
 */

const ANTREAN = 'antrean-indexing' as const

/** Kunci dedup antrean: satu baris per langkah dan path. */
export const kunciAntrean = (langkah: LangkahAntrean, path: string) => `${langkah} ${path}`

/** Baris antrean tersimpan, dengan `versi` yang naik setiap kabar baru tergabung ke baris ini. */
export type BarisTersimpan = BarisAntrean & { id: number; versi: number }

export function dariDokumen(doc: AntreanIndexing): BarisTersimpan {
  return {
    id: doc.id,
    versi: doc.versi ?? 0,
    langkah: doc.langkah,
    path: doc.path,
    jenis: doc.jenis,
    jadwal: new Date(doc.jadwal),
    percobaan: doc.percobaan ?? 0,
    tahap: doc.tahap ?? 0,
    dasar: doc.dasar ? new Date(doc.dasar) : null,
  }
}

const keData = (baris: BarisAntrean) => ({
  langkah: baris.langkah,
  path: baris.path,
  jenis: baris.jenis,
  jadwal: baris.jadwal.toISOString(),
  percobaan: baris.percobaan,
  tahap: baris.tahap,
  dasar: baris.dasar?.toISOString() ?? null,
})

/** Menambah baris, atau menggabungkannya ke baris yang sudah antre untuk langkah dan path yang sama. */
export async function simpanBaris(payload: Payload, baris: BarisAntrean, req?: PayloadRequest): Promise<void> {
  const kunci = kunciAntrean(baris.langkah, baris.path)
  const { docs } = await payload.find({ collection: ANTREAN, where: { kunci: { equals: kunci } }, limit: 1, depth: 0, req })
  const ada = docs[0]
  if (ada) {
    const lama = dariDokumen(ada)
    // `where`, bukan `id`: bila pelari antrean baru saja menyelesaikan baris ini, tidak ada galat dan baris dibuat lagi.
    const { docs: diubah } = await payload.update({
      collection: ANTREAN,
      where: { id: { equals: ada.id } },
      data: { ...keData(gabungBaris(lama, baris)), versi: lama.versi + 1 },
      depth: 0,
      req,
    })
    if (diubah.length) return
  }
  await payload.create({ collection: ANTREAN, data: { kunci, ...keData(baris), versi: 0 }, req })
}

export async function batalkanBaris(payload: Payload, langkah: LangkahAntrean, path: string, req?: PayloadRequest): Promise<void> {
  await payload.delete({ collection: ANTREAN, where: { kunci: { equals: kunciAntrean(langkah, path) } }, req })
}

/** Baris yang jatuh tempo, paling lama dulu; jadwal yang sama menurut urutan masuk antrean. */
export async function barisJatuhTempo(payload: Payload, sekarang: Date, batas: number): Promise<BarisTersimpan[]> {
  const { docs } = await payload.find({
    collection: ANTREAN,
    where: { jadwal: { less_than_equal: sekarang.toISOString() } },
    sort: ['jadwal', 'id'],
    limit: batas,
    depth: 0,
  })
  return docs.map(dariDokumen)
}

/** Syarat baris yang belum berubah sejak diambil (tidak diklaim proses lain, tidak tergabung kabar baru). */
const tetap = (baris: BarisTersimpan): Where => ({ and: [{ id: { equals: baris.id } }, { versi: { equals: baris.versi } }] })

/**
 * Mengklaim baris sebelum adapter dipanggil: jadwalnya dimundurkan sebentar (sewa) supaya proses lain
 * (cron yang terkirim dua kali, `after()` saat terbit) tidak mengirim baris yang sama. Klaim memakai satu
 * `UPDATE ... WHERE versi = ... RETURNING` di Postgres karena update Payload dengan `where` mencari dulu
 * lalu menulis, sehingga dua proses bisa sama-sama merasa menang. Bila proses berhenti di tengah jalan,
 * baris muncul lagi setelah sewa habis.
 */
export async function klaimBaris(payload: Payload, daftar: BarisTersimpan[], sampai: Date): Promise<BarisTersimpan[]> {
  const hasil: BarisTersimpan[] = []
  for (const baris of daftar) {
    const { rows } = await payload.db.drizzle.execute(sql`
      update antrean_indexing set jadwal = ${sampai.toISOString()}, versi = versi + 1, updated_at = now()
      where id = ${baris.id} and versi = ${baris.versi}
      returning id`)
    if (rows.length) hasil.push({ ...baris, jadwal: sampai, versi: baris.versi + 1 })
  }
  return hasil
}

/**
 * Menyelesaikan baris yang sudah diklaim: dihapus (`berikut: null`) atau dijadwalkan lagi. Bila kabar
 * baru tergabung selama adapter dipanggil (versi berubah), baris dibiarkan supaya kabar itu tetap dikirim.
 */
export async function selesaikanBaris(
  payload: Payload,
  baris: BarisTersimpan,
  berikut: Pick<BarisAntrean, 'jadwal' | 'percobaan' | 'tahap'> | null,
): Promise<void> {
  if (berikut) {
    const data = { jadwal: berikut.jadwal.toISOString(), percobaan: berikut.percobaan, tahap: berikut.tahap }
    await payload.update({ collection: ANTREAN, where: tetap(baris), data, depth: 0 })
  }
  else await payload.delete({ collection: ANTREAN, where: tetap(baris) })
}

/** Menunda baris tanpa memanggil adapter (jendela kirim atau kuota). */
export async function tundaBaris(payload: Payload, baris: BarisTersimpan, jadwal: Date): Promise<void> {
  await payload.update({ collection: ANTREAN, where: tetap(baris), data: { jadwal: jadwal.toISOString() }, depth: 0 })
}

export type EntriLog = {
  url: string
  jenis?: JenisKabar | null
  langkah: Langkah
  adapter: NamaAdapter
  status: StatusLog
  kodeHttp?: number | null
  pesan: string
  percobaan: number
  waktu: Date
}

export async function catatLog(payload: Payload, entri: EntriLog, req?: PayloadRequest): Promise<void> {
  await payload.create({ collection: 'log-indexing', data: { ...entri, waktu: entri.waktu.toISOString() }, req })
}

/**
 * Waktu kiriman terakhir yang berhasil untuk jendela kirim (sitemap 30 menit, IndexNow 5 menit). Kiriman
 * yang gagal tidak dihitung: ulangannya mengikuti jeda 1, 5, dan 30 menit.
 */
export async function kirimanBerhasilTerakhir(payload: Payload, langkah: Langkah): Promise<Date | null> {
  const { docs } = await payload.find({
    collection: 'log-indexing',
    where: { and: [{ langkah: { equals: langkah } }, { status: { equals: 'berhasil' } }] },
    sort: '-waktu',
    limit: 1,
    depth: 0,
  })
  return docs[0] ? new Date(docs[0].waktu) : null
}

/** Jumlah panggilan (berhasil atau gagal) untuk satu langkah sejak `sejak`, untuk kuota harian. */
export async function panggilanSejak(payload: Payload, langkah: Langkah, sejak: Date): Promise<number> {
  const { totalDocs } = await payload.count({
    collection: 'log-indexing',
    where: {
      and: [
        { langkah: { equals: langkah } },
        { status: { in: ['berhasil', 'diulang', 'gagal'] } },
        { waktu: { greater_than_equal: sejak.toISOString() } },
      ],
    },
  })
  return totalDocs
}

export type DataStatus = Partial<{
  status: StatusIndeks
  detail: string | null
  tautanInspeksi: string | null
  dirayapiPada: string | null
  cekTerakhir: string | null
  cekBerikutnya: string | null
}>

/** Menyimpan status indeks satu path (dibuat bila belum ada, dengan status Belum dicek). */
export async function catatStatus(payload: Payload, path: string, data: DataStatus, req?: PayloadRequest): Promise<void> {
  const { docs } = await payload.find({ collection: 'status-indeks', where: { path: { equals: path } }, limit: 1, depth: 0, req })
  if (docs[0]) await payload.update({ collection: 'status-indeks', id: docs[0].id, data, req })
  else await payload.create({ collection: 'status-indeks', data: { path, status: 'belum-dicek', ...data }, req })
}

/** Memperbarui status indeks path yang masih tercatat (path yang sudah dihapus tidak dibuat lagi). */
export async function perbaruiStatus(payload: Payload, path: string, data: DataStatus): Promise<void> {
  await payload.update({ collection: 'status-indeks', where: { path: { equals: path } }, data, depth: 0 })
}

export async function hapusStatus(payload: Payload, path: string, req?: PayloadRequest): Promise<void> {
  await payload.delete({ collection: 'status-indeks', where: { path: { equals: path } }, req })
}

/**
 * Pengaturan Mesin Indexing dari global `pengaturan-seo`. Nilai cadangan sama dengan `defaultValue`
 * field-nya, untuk isian yang dikosongkan editor.
 */
export async function ambilPengaturanIndexing(payload: Payload, req?: PayloadRequest): Promise<PengaturanIndexing> {
  const global = await payload.findGlobal({ slug: 'pengaturan-seo', depth: 0, req })
  const isian = global.indexing ?? {}
  return {
    urlSitus: global.urlSitus,
    kunciIndexNow: isian.kunciIndexNow?.trim() || null,
    propertiSearchConsole: isian.propertiSearchConsole?.trim() || 'sc-domain:point.lat',
    kuotaInspeksi: isian.kuotaInspeksi ?? 1000,
    pakaiIndexingApi: isian.pakaiIndexingApi === true,
    kuotaIndexingApi: isian.kuotaIndexingApi ?? 200,
  }
}
