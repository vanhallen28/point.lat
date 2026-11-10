/**
 * Tipe bersama modul asisten AI (spesifikasi §10). Aman dipakai di server dan di komponen admin.
 */

/**
 * Tugas yang memanggil Claude dari sidebar editor: brief dari keyword, draf per bagian, dan generator meta
 * (spesifikasi §10 butir 1 sampai 3). Cek pola tulisan AI dan cek klaim (butir 4 dan 5) adalah fungsi murni
 * tanpa API. Hanya tugas ini yang boleh diminta lewat `POST /api/artikel/asisten`.
 */
export const TUGAS_EDITOR = ['brief', 'draf', 'meta'] as const

/**
 * Tugas Otomasi artikel (spesifikasi §27): usulan topik dan draf artikel lengkap. Dijalankan server (cron dan
 * tombol admin), tidak pernah dari sidebar editor, karena satu draf lengkap jauh lebih mahal.
 */
export const TUGAS_OTOMASI = ['usulan', 'artikel'] as const

export const TUGAS_AI = [...TUGAS_EDITOR, ...TUGAS_OTOMASI] as const
export type TugasAi = (typeof TUGAS_AI)[number]
export type TugasEditor = (typeof TUGAS_EDITOR)[number]

export const LABEL_TUGAS_AI: Record<TugasAi, string> = {
  brief: 'Brief dari keyword',
  draf: 'Draf per bagian',
  meta: 'Generator meta',
  usulan: 'Usulan topik otomatis',
  artikel: 'Draf artikel otomatis',
}

/** Status satu baris log AI. `berjalan` ditulis sebelum Claude dipanggil, lalu diganti hasilnya. */
export const STATUS_LOG_AI = ['berjalan', 'berhasil', 'gagal', 'anggaran-habis'] as const
export type StatusLogAi = (typeof STATUS_LOG_AI)[number]

export const LABEL_STATUS_LOG_AI: Record<StatusLogAi, string> = {
  berjalan: 'Berjalan',
  berhasil: 'Berhasil',
  gagal: 'Gagal',
  'anggaran-habis': 'Anggaran habis',
}

/** Tingkat usaha model (`output_config.effort` Messages API). */
export type Effort = 'low' | 'medium' | 'high'

/** Token satu panggilan dari `usage` jawaban API: masukan (termasuk cache) dan keluaran (termasuk thinking). */
export type Token = { masuk: number; keluar: number }

/** Harga satu model dalam US$ per juta token, diisi di global Asisten AI. */
export type HargaModel = { model: string; masuk: number; keluar: number }

/** Mode adapter dari env `AI_ADAPTER`: `asli` memanggil API Claude, `palsu` menjawab contoh tanpa jaringan. */
export type ModeAi = 'asli' | 'palsu'
