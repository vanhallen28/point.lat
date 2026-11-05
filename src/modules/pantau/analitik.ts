import type { Payload, PayloadRequest } from 'payload'

import { revalidasi } from '@/hooks/revalidasiPublik'
import { TAG } from '@/lib/tag'
import { HARI } from '@/modules/indexer/aturan'
import type { PengaturanIndexing } from '@/modules/indexer/tipe'

import type { AdapterPantau, HasilAnalitik } from './adapter'
import {
  BARIS_PER_PERMINTAAN,
  geserTanggal,
  HARI_PEKAN,
  HARI_RINGKASAN,
  hariSitus,
  MAKS_PERMINTAAN_PER_KUERI,
  permintaanAnalitik,
  RENTANG_HARIAN,
  rentang,
  rentangHarian,
  RETENSI_ANALITIK_SITUS_HARI,
  RETENSI_LOG_INDEXING_HARI,
  ringkasHalaman,
  tanggalPasifik,
  type HasilTugas,
} from './aturan'
import type { BarisAnalitik, HariSitus, PermintaanAnalitik, RingkasanHalaman } from './tipe'

/**
 * Semua baris satu kueri: halaman berikutnya diminta dengan `startRow` + 25.000 sampai jawaban berisi
 * kurang dari 25.000 baris (dokumentasi "Getting all your data"), paling banyak empat permintaan.
 */
export async function kueriSemua(adapter: AdapterPantau, properti: string, permintaan: PermintaanAnalitik): Promise<HasilAnalitik> {
  const baris: BarisAnalitik[] = []
  for (let i = 0; i < MAKS_PERMINTAAN_PER_KUERI; i++) {
    const hasil = await adapter.analitik(properti, { ...permintaan, startRow: i * BARIS_PER_PERMINTAAN })
    if (hasil.status !== 'berhasil') return hasil
    baris.push(...hasil.baris)
    if (hasil.baris.length < BARIS_PER_PERMINTAAN) break
  }
  return { status: 'berhasil', baris }
}

export type HasilSinkron = { hasil: HasilTugas; pesan: string }

const gagal = (h: Exclude<HasilAnalitik, { status: 'berhasil' }>): HasilSinkron =>
  h.status === 'dilewati' ? { hasil: 'dilewati', pesan: h.pesan } : { hasil: h.kuotaHabis ? 'kuota-habis' : 'gagal', pesan: h.pesan }

/**
 * Menyimpan hasil sinkron dalam satu transaksi: total harian di-upsert per tanggal, ringkasan per
 * halaman diganti seluruhnya. Pembaca (dashboard, beranda) tidak pernah melihat tabel setengah terisi.
 */
async function simpan(payload: Payload, hari: HariSitus[], halaman: RingkasanHalaman[], sampai: string | null): Promise<void> {
  const transaksi = await payload.db.beginTransaction()
  const req: Partial<PayloadRequest> = transaksi ? { transactionID: transaksi } : {}
  try {
    for (const h of hari) {
      await payload.db.upsert({ collection: 'analitik-situs', where: { tanggal: { equals: h.tanggal } }, data: { ...h }, req, returning: false })
    }
    await payload.db.deleteMany({ collection: 'analitik-halaman', where: { id: { exists: true } }, req })
    for (const h of halaman) {
      await payload.db.create({ collection: 'analitik-halaman', data: { ...h, sampai }, req, returning: false })
    }
    if (transaksi) await payload.db.commitTransaction(transaksi)
  } catch (galat) {
    if (transaksi) await payload.db.rollbackTransaction(transaksi)
    throw galat
  }
}

const angka = new Intl.NumberFormat('id-ID')

/**
 * Sinkron Search Analytics harian (spesifikasi §5 "Penjadwal", §8 "Dashboard SEO"):
 *
 * 1. Total harian properti 35 hari sampai kemarin (dimensi `date`, data final). Data Search Console
 *    biasanya baru final 2 sampai 3 hari kemudian, jadi tanggal terakhir yang berisi menjadi `sampai`.
 * 2. Klik, impresi, CTR, dan posisi per halaman untuk 28 hari dan 7 hari sampai tanggal itu.
 * 3. Disimpan dalam satu transaksi, lalu cache "Paling dicari pekan ini" dibuang (tag `analitik`).
 *
 * Bila Google tidak dipanggil (akun layanan belum diatur, adapter palsu) atau gagal, data lama tidak
 * disentuh. Bila tidak ada data final sama sekali dalam 35 hari, ringkasan halaman dikosongkan.
 */
export async function sinkronAnalitik(
  payload: Payload,
  adapter: AdapterPantau,
  pengaturan: Pick<PengaturanIndexing, 'urlSitus' | 'propertiSearchConsole'>,
  sekarang: Date,
): Promise<HasilSinkron> {
  const properti = pengaturan.propertiSearchConsole
  const harian = await kueriSemua(adapter, properti, permintaanAnalitik(rentangHarian(sekarang), 'date'))
  if (harian.status !== 'berhasil') return gagal(harian)
  const hari = hariSitus(harian.baris)
  const sampai = hari.map((h) => h.tanggal).sort().at(-1) ?? null
  let halaman: RingkasanHalaman[] = []
  if (sampai) {
    const baris28 = await kueriSemua(adapter, properti, permintaanAnalitik(rentang(sampai, HARI_RINGKASAN), 'page'))
    if (baris28.status !== 'berhasil') return gagal(baris28)
    const baris7 = await kueriSemua(adapter, properti, permintaanAnalitik(rentang(sampai, HARI_PEKAN), 'page'))
    if (baris7.status !== 'berhasil') return gagal(baris7)
    halaman = ringkasHalaman(baris28.baris, baris7.baris, pengaturan.urlSitus)
  }
  await simpan(payload, hari, halaman, sampai)
  revalidasi([TAG.analitik])
  if (!sampai) return { hasil: 'berhasil', pesan: `Search Console belum punya data final untuk ${RENTANG_HARIAN} hari terakhir.` }
  const klik = halaman.reduce((n, h) => n + h.klik28, 0)
  return { hasil: 'berhasil', pesan: `Data sampai ${sampai}: ${angka.format(halaman.length)} halaman, ${angka.format(klik)} klik dalam 28 hari.` }
}

/**
 * Retensi harian: log indexing lebih dari 90 hari dan total harian lebih dari 16 bulan dihapus dengan satu
 * `DELETE` masing-masing (lewat adapter database, tanpa hook per dokumen).
 */
export async function hapusDataLama(payload: Payload, sekarang: Date): Promise<void> {
  const batasLog = new Date(sekarang.getTime() - RETENSI_LOG_INDEXING_HARI * HARI).toISOString()
  await payload.db.deleteMany({ collection: 'log-indexing', where: { waktu: { less_than: batasLog } } })
  const batasSitus = geserTanggal(tanggalPasifik(sekarang), -RETENSI_ANALITIK_SITUS_HARI)
  await payload.db.deleteMany({ collection: 'analitik-situs', where: { tanggal: { less_than: batasSitus } } })
}
