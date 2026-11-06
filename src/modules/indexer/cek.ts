import type { Payload } from 'payload'

import { teksWaktu } from '@/modules/pantau/format'

import { ambilPengaturanIndexing, klaimCekManual, majukanCek, panggilanSejak } from './antrean'
import { awalHariPasifik, batasCekManual, JEDA_CEK_MANUAL_MS } from './aturan'

/** Jawaban "Cek sekarang"; `pesan` siap tampil di admin. */
export type HasilMintaCek =
  | { status: 'antre'; path: string; dimintaPada: string; pesan: string }
  | { status: 'dibatasi'; alasan: 'kuota' | 'jeda'; bolehLagi: string; pesan: string }
  | { status: 'tidak-ada'; pesan: string }

/**
 * Tombol "Cek sekarang" di daftar Status indeks (Rencana 8B): memajukan cek URL Inspection satu halaman ke
 * antrean Mesin Indexing, tanpa memanggil Google dari permintaan admin (pemanggil menjalankan antrean lewat
 * `after()`). Ditolak bila kuota cek harian di Pengaturan SEO sudah habis, atau URL itu baru diminta dicek
 * kurang dari 10 menit lalu; klaimnya atomik, jadi klik ganda hanya menghasilkan satu cek.
 */
export async function mintaCekStatus(payload: Payload, id: number, opsi: { sekarang?: Date } = {}): Promise<HasilMintaCek> {
  const sekarang = opsi.sekarang ?? new Date()
  const { docs } = await payload.find({ collection: 'status-indeks', where: { id: { equals: id } }, limit: 1, depth: 0, select: { path: true, dimintaPada: true } })
  const doc = docs[0]
  if (!doc) return { status: 'tidak-ada', pesan: 'Status indeks ini sudah tidak ada. Muat ulang daftarnya.' }
  const { kuotaInspeksi } = await ambilPengaturanIndexing(payload)
  const terpakai = await panggilanSejak(payload, 'cek-status', awalHariPasifik(sekarang))
  const batas = batasCekManual({ terpakai, kuota: kuotaInspeksi, dimintaPada: doc.dimintaPada ? new Date(doc.dimintaPada) : null }, sekarang)
  const path = batas.boleh ? await klaimCekManual(payload, id, sekarang, JEDA_CEK_MANUAL_MS) : null
  if (!path) {
    const alasan = batas.boleh ? 'jeda' : batas.alasan
    const bolehLagi = batas.boleh ? new Date(sekarang.getTime() + JEDA_CEK_MANUAL_MS) : batas.bolehLagi
    return {
      status: 'dibatasi',
      alasan,
      bolehLagi: bolehLagi.toISOString(),
      pesan:
        alasan === 'kuota'
          ? `Batas ${kuotaInspeksi.toLocaleString('id-ID')} cek status per hari sudah tercapai. Bisa dicek lagi mulai ${teksWaktu(bolehLagi.toISOString())}.`
          : `Halaman ini baru saja diminta dicek. Bisa dicek lagi mulai ${teksWaktu(bolehLagi.toISOString())}.`,
    }
  }
  await majukanCek(payload, path, sekarang)
  return { status: 'antre', path, dimintaPada: sekarang.toISOString(), pesan: `Cek status ${path} dijalankan sekarang.` }
}
