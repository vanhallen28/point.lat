import type { Payload } from 'payload'

import { ambilPengaturanIndexing } from '@/modules/indexer/antrean'
import type { PengaturanIndexing } from '@/modules/indexer/tipe'

import { adapterPantau, type AdapterPantau } from './adapter'
import { hapusDataLama, sinkronAnalitik } from './analitik'
import { jadwalTugas, type HasilTugas } from './aturan'
import { klaimTugas, selesaikanTugas } from './tugas'
import type { JenisTugas, StatusTugas } from './tipe'

/**
 * Pantau SEO (spesifikasi §8 "Tingkat situs" dan "Dashboard SEO"). Antarmuka modul:
 *
 * - `jalankanPantau(payload, opsi)`: dipanggil cron `GET /api/jobs/run` setiap 10 menit. Menjalankan
 *   tugas yang jatuh tempo (masing-masing sekali sehari): sinkron Search Analytics beserta retensi data.
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

const PELAKSANA: Partial<Record<JenisTugas, Pelaksana>> = { analitik }

const STATUS: Record<HasilTugas, Exclude<StatusTugas, 'berjalan'>> = {
  berhasil: 'berhasil',
  dilewati: 'dilewati',
  gagal: 'gagal',
  'kuota-habis': 'gagal',
}

export type RingkasanPantau = Partial<Record<JenisTugas, { status: Exclude<StatusTugas, 'berjalan'>; pesan: string }>>

/**
 * Menjalankan tugas Pantau SEO yang jatuh tempo. Aman dipanggil berulang atau bersamaan: tugas diklaim
 * atomik dan hanya berjalan sekali per jadwal. Galat tak terduga dicatat sebagai Gagal (dicoba lagi sejam
 * kemudian) dan tidak menghentikan tugas lain.
 */
export async function jalankanPantau(payload: Payload, opsi: { sekarang?: Date; adapter?: AdapterPantau } = {}): Promise<RingkasanPantau> {
  const k: Konteks = {
    payload,
    adapter: opsi.adapter ?? adapterPantau(),
    pengaturan: await ambilPengaturanIndexing(payload),
    sekarang: opsi.sekarang ?? new Date(),
  }
  const ringkasan: RingkasanPantau = {}
  for (const [jenis, pelaksana] of Object.entries(PELAKSANA) as [JenisTugas, Pelaksana][]) {
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
  return ringkasan
}

export { adapterPantau, pakaiAdapterPantau, type AdapterPantau, type HasilAnalitik } from './adapter'
export { adapterPalsu, type AdapterPantauPalsu } from './palsu'
export type { JenisTugas, RingkasanHalaman, StatusTugas } from './tipe'
