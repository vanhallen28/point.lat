import type { JamSlot, SlotTerbit } from './aturan'

/**
 * Status satu usulan topik (spesifikasi §27). Alurnya: `usulan` (dari AI, menunggu pemilik) atau `disetujui`
 * (ditambah pemilik sendiri), lalu `menulis`, `ditulis` (draf menunggu review), `terjadwal` (masuk slot terbit),
 * dan `terbit`. `ditolak` tidak pernah ditulis; `gagal` setelah tiga kali gagal menulis.
 */
export const STATUS_USULAN = ['usulan', 'disetujui', 'ditolak', 'menulis', 'ditulis', 'terjadwal', 'terbit', 'gagal'] as const
export type StatusUsulan = (typeof STATUS_USULAN)[number]

export const LABEL_STATUS_USULAN: Record<StatusUsulan, string> = {
  usulan: 'Menunggu persetujuan',
  disetujui: 'Disetujui, antre ditulis',
  ditolak: 'Ditolak',
  menulis: 'Sedang ditulis',
  ditulis: 'Draf menunggu review',
  terjadwal: 'Terjadwal terbit',
  terbit: 'Terbit',
  gagal: 'Gagal ditulis',
}

/** Percobaan menulis sebelum usulan ditandai gagal. */
export const MAKS_PERCOBAAN = 3

export type PengaturanOtomasi = {
  aktif: boolean
  drafPerHari: number
  jumlahUsulan: number
  /** Id pilar yang ikut; kosong berarti semua pilar. */
  pilar: number[]
  /** Id penulis draf; `null` berarti Redaksi point. (slug `redaksi`). */
  penulis: number | null
  arahan: string
  slot: SlotTerbit
  antreOtomatis: boolean
}

export type JamSlotLabel = { jam: JamSlot; label: string }

/** Hasil satu jalan cron atau tombol admin, untuk log dan jawaban endpoint. */
export type RingkasanOtomasi = {
  status: 'mati' | 'berjalan-lain' | 'selesai'
  antre: { diantre: number; terbit: number; kembali: number }
  usulan: { dibuat: number; pesan: string | null } | null
  tulis: { slug: string | null; pesan: string | null } | null
}
