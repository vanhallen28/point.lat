import { after } from 'next/server'
import type { Payload } from 'payload'

import { ambilPengaturanIndexing } from '@/modules/indexer/antrean'
import type { PengaturanIndexing } from '@/modules/indexer/tipe'

import { adapterPantau, type AdapterPantau } from './adapter'
import { hapusDataLama, sinkronAnalitik } from './analitik'
import { batasPindaiManual, jadwalTugas, JEDA_PINDAI_MANUAL_MS, type HasilTugas } from './aturan'
import { teksWaktu } from './format'
import { periksaTautanLuar, pindaiTautan } from './pindai'
import { klaimTugas, majukanTugas, selesaikanTugas } from './tugas'
import { JENIS_TUGAS, type JenisTugas, type StatusTugas } from './tipe'

/**
 * Pantau SEO (spesifikasi §8 "Tingkat situs" dan "Dashboard SEO"). Antarmuka modul:
 *
 * - `jalankanPantau(payload, opsi)`: dipanggil cron `GET /api/jobs/run` (jadwal di `vercel.json`). Menjalankan
 *   tugas yang jatuh tempo (masing-masing sekali sehari): sinkron Search Analytics beserta retensi data,
 *   dan pindai tautan (tautan internal rusak, halaman yatim, daftar tautan luar). Setiap jalan juga
 *   memeriksa beberapa tautan luar yang jatuh tempo (masing-masing seminggu sekali).
 *
 * Semua panggilan ke luar lewat adapter (`adapter.ts`), dipilih env `INDEXER_ADAPTER` yang sama dengan
 * Mesin Indexing. Hasil setiap tugas tersimpan di `tugas-seo` dan tampil di dashboard SEO.
 */

type Konteks = { payload: Payload; adapter: AdapterPantau; pengaturan: PengaturanIndexing; sekarang: Date }

type Pelaksana = (k: Konteks) => Promise<{ hasil: HasilTugas; pesan: string }>

/** Sinkron Search Analytics, lalu retensi (apa pun hasil sinkronnya). */
const analitik: Pelaksana = async (k) => {
  const hasil = await sinkronAnalitik(k.payload, k.adapter, k.pengaturan, k.sekarang)
  await hapusDataLama(k.payload, k.sekarang)
  return hasil
}

const tautan: Pelaksana = (k) => pindaiTautan(k.payload, k.pengaturan.urlSitus, k.sekarang)

const PELAKSANA: Record<JenisTugas, Pelaksana> = { analitik, tautan }

const STATUS: Record<HasilTugas, Exclude<StatusTugas, 'berjalan'>> = {
  berhasil: 'berhasil',
  dilewati: 'dilewati',
  gagal: 'gagal',
  'kuota-habis': 'gagal',
}

export type RingkasanPantau = Partial<Record<JenisTugas, { status: Exclude<StatusTugas, 'berjalan'>; pesan: string }>> & {
  /** Jumlah tautan luar yang dicek jalan ini (hanya bila ada). */
  tautanDicek?: number
}

/**
 * Menjalankan tugas Pantau SEO yang jatuh tempo. Aman dipanggil berulang atau bersamaan: tugas diklaim
 * atomik dan hanya berjalan sekali per jadwal. Galat tak terduga dicatat sebagai Gagal (dicoba lagi sejam
 * kemudian) dan tidak menghentikan tugas lain. `tugas` membatasi tugas yang dijalankan (tes).
 */
export async function jalankanPantau(
  payload: Payload,
  opsi: { sekarang?: Date; adapter?: AdapterPantau; tugas?: readonly JenisTugas[] } = {},
): Promise<RingkasanPantau> {
  const k: Konteks = {
    payload,
    adapter: opsi.adapter ?? adapterPantau(),
    pengaturan: await ambilPengaturanIndexing(payload),
    sekarang: opsi.sekarang ?? new Date(),
  }
  const ringkasan: RingkasanPantau = {}
  const tugas = opsi.tugas ?? JENIS_TUGAS
  for (const jenis of tugas) {
    const pelaksana = PELAKSANA[jenis]
    const klaim = await klaimTugas(payload, jenis, k.sekarang)
    if (!klaim) continue
    let hasil: { hasil: HasilTugas; pesan: string }
    try {
      hasil = await pelaksana(k)
    } catch (galat) {
      payload.logger.error({ err: galat, msg: `Pantau SEO: tugas ${jenis} gagal.` })
      hasil = { hasil: 'gagal', pesan: `Galat di server: ${(galat as Error).message}` }
    }
    const status = STATUS[hasil.hasil]
    await selesaikanTugas(payload, klaim, { status, pesan: hasil.pesan, berikutnya: jadwalTugas(hasil.hasil, k.sekarang) }, k.sekarang)
    ringkasan[jenis] = { status, pesan: hasil.pesan }
  }
  if (tugas.includes('tautan')) {
    const dicek = await periksaTautanLuar(payload, k.adapter, k.sekarang)
    if (dicek) ringkasan.tautanDicek = dicek
  }
  return ringkasan
}

/** Jawaban "Pindai ulang sekarang"; `pesan` siap tampil di dashboard. */
export type HasilMintaPindai =
  | { status: 'antre'; diminta: string; pesan: string }
  | { status: 'dibatasi'; alasan: 'berjalan' | 'jeda'; bolehLagi: string; pesan: string }

/** Pesan untuk pindai yang belum boleh dijalankan lagi. */
export function pesanBatasPindai(alasan: 'berjalan' | 'jeda', bolehLagi: Date): string {
  return alasan === 'berjalan'
    ? 'Pindai tautan sedang berjalan. Hasilnya tampil di sini setelah selesai.'
    : `Pindai tautan baru saja dijalankan. Bisa dipindai lagi mulai ${teksWaktu(bolehLagi.toISOString())}.`
}

/**
 * Tombol "Pindai ulang sekarang" di dashboard SEO (Rencana 8B): memajukan tugas pindai tautan ke sekarang
 * supaya dijalankan setelah respons (`jalankanPantauSetelahRespons`), bukan di dalam permintaan admin.
 * Ditolak selama pindai sedang berjalan atau dimulai kurang dari 10 menit lalu.
 */
export async function mintaPindai(payload: Payload, opsi: { sekarang?: Date } = {}): Promise<HasilMintaPindai> {
  const sekarang = opsi.sekarang ?? new Date()
  if (await majukanTugas(payload, 'tautan', sekarang, JEDA_PINDAI_MANUAL_MS)) {
    return { status: 'antre', diminta: sekarang.toISOString(), pesan: 'Pindai tautan dijalankan sekarang.' }
  }
  const { docs } = await payload.find({ collection: 'tugas-seo', where: { jenis: { equals: 'tautan' } }, limit: 1, depth: 0 })
  const batas = batasPindaiManual(docs[0] ?? null, sekarang)
  const alasan = batas.boleh ? 'berjalan' : batas.alasan
  const bolehLagi = batas.boleh ? new Date(sekarang.getTime() + JEDA_PINDAI_MANUAL_MS) : batas.bolehLagi
  return { status: 'dibatasi', alasan, bolehLagi: bolehLagi.toISOString(), pesan: pesanBatasPindai(alasan, bolehLagi) }
}

/**
 * Menjalankan tugas Pantau SEO setelah respons terkirim (`after()` Next), seperti `jalankanSetelahRespons`
 * Mesin Indexing. Di luar permintaan Next (tes, skrip) galat "outside a request scope" diabaikan dan tugas
 * menunggu cron; galat tugas dicatat ke log server.
 */
export function jalankanPantauSetelahRespons(payload: Payload, tugas: readonly JenisTugas[]): void {
  try {
    after(async () => {
      try {
        await jalankanPantau(payload, { tugas })
      } catch (galat) {
        payload.logger.error({ err: galat, msg: 'Pantau SEO gagal dijalankan setelah permintaan admin.' })
      }
    })
  } catch (galat) {
    if (!String((galat as Error)?.message).includes('outside a request scope')) throw galat
  }
}

export { adapterPantau, pakaiAdapterPantau, type AdapterPantau, type HasilAnalitik } from './adapter'
export { adapterPalsu, type AdapterPantauPalsu } from './palsu'
export type { JenisTugas, RingkasanHalaman, StatusTugas } from './tipe'
