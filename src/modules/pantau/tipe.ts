/**
 * Tipe Pantau SEO (spesifikasi §8 "Dashboard SEO"). Nilai `select` koleksi `tugas-seo`, `tautan-luar`,
 * dan `temuan-tautan` diambil dari daftar di sini supaya kode dan skema tidak berbeda.
 */

/** Tugas berkala yang dijalankan cron: sinkron Search Analytics dan pindai tautan, masing-masing sekali sehari. */
export const JENIS_TUGAS = ['analitik', 'tautan'] as const
export type JenisTugas = (typeof JENIS_TUGAS)[number]

export const STATUS_TUGAS = ['berjalan', 'berhasil', 'gagal', 'dilewati'] as const
export type StatusTugas = (typeof STATUS_TUGAS)[number]

export const LABEL_TUGAS: Record<JenisTugas, string> = {
  analitik: 'Sinkron Search Console',
  tautan: 'Pindai tautan',
}

export const LABEL_STATUS_TUGAS: Record<StatusTugas, string> = {
  berjalan: 'Sedang berjalan',
  berhasil: 'Berhasil',
  gagal: 'Gagal',
  dilewati: 'Dilewati',
}

/** Status tautan ke situs lain: `belum` dicek, `baik`, `rusak` (404, 410, domain hilang), atau `tidak-pasti`. */
export const STATUS_TAUTAN = ['belum', 'baik', 'rusak', 'tidak-pasti'] as const
export type StatusTautan = (typeof STATUS_TAUTAN)[number]

export const LABEL_STATUS_TAUTAN: Record<StatusTautan, string> = {
  belum: 'Belum dicek',
  baik: 'Bisa dibuka',
  rusak: 'Rusak',
  'tidak-pasti': 'Perlu dicek manual',
}

/** Temuan pindai isi: tautan internal rusak, tautan ke path yang dialihkan, dan halaman yatim. */
export const JENIS_TEMUAN = ['rusak', 'dialihkan', 'yatim'] as const
export type JenisTemuan = (typeof JENIS_TEMUAN)[number]

export const LABEL_JENIS_TEMUAN: Record<JenisTemuan, string> = {
  rusak: 'Tautan internal rusak',
  dialihkan: 'Tautan ke alamat lama',
  yatim: 'Halaman yatim',
}

/** Satu baris jawaban Search Analytics (nama field sama dengan API). */
export type BarisAnalitik = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }

/** Badan `searchanalytics.query` yang dipakai (nama field sama dengan API). */
export type PermintaanAnalitik = {
  startDate: string
  endDate: string
  dimensions: ('date' | 'page')[]
  type: 'web'
  dataState: 'final'
  rowLimit: number
  startRow: number
}

/** Ringkasan satu path untuk 28 dan 7 hari terakhir yang datanya sudah final. */
export type RingkasanHalaman = {
  path: string
  klik7: number
  impresi7: number
  klik28: number
  impresi28: number
  /** 0 sampai 1. */
  ctr28: number
  /** Posisi rata-rata, ditimbang impresi. */
  posisi28: number
}

/** Total seluruh properti untuk satu hari (dimensi `date`). */
export type HariSitus = { tanggal: string; klik: number; impresi: number; ctr: number; posisi: number }

/** Jawaban mentah pemeriksa tautan: kode HTTP, atau galat jaringan beserta kodenya (`ENOTFOUND`, `TimeoutError`). */
export type JawabanTautan = { kodeHttp: number | null; galat: string | null; kodeGalat?: string | null }

export type HasilTautan = { status: Exclude<StatusTautan, 'belum'>; kodeHttp: number | null; pesan: string }

/** Tautan dari dalam situs (`/path`) atau ke situs lain (URL lengkap). */
export type Href = { jenis: 'internal'; path: string } | { jenis: 'luar'; url: string }
