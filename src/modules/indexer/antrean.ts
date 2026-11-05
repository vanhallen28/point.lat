import type { Payload, PayloadRequest } from 'payload'

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
  if (!ada) {
    await payload.create({ collection: ANTREAN, data: { kunci, ...keData(baris), versi: 0 }, req })
    return
  }
  const lama = dariDokumen(ada)
  await payload.update({ collection: ANTREAN, id: ada.id, data: { ...keData(gabungBaris(lama, baris)), versi: lama.versi + 1 }, req })
}

export async function batalkanBaris(payload: Payload, langkah: LangkahAntrean, path: string, req?: PayloadRequest): Promise<void> {
  await payload.delete({ collection: ANTREAN, where: { kunci: { equals: kunciAntrean(langkah, path) } }, req })
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
