/**
 * Tipe Mesin Indexing (spesifikasi §8). Nilai `select` koleksi `antrean-indexing`, `log-indexing`, dan
 * `status-indeks` diambil dari daftar di sini supaya kode dan skema tidak berbeda.
 */

/**
 * Jenis kabar. Spesifikasi menulis `terbit`, `ubah-besar`, dan `hapus`; `pindah` ditambahkan untuk path
 * lama setelah slug berganti: path itu kini dialihkan (308), jadi IndexNow dan sitemap dikabari, tetapi
 * Indexing API tidak (`URL_DELETED` hanya untuk halaman 404, 410, atau noindex).
 */
export const JENIS_KABAR = ['terbit', 'ubah-besar', 'pindah', 'hapus'] as const
export type JenisKabar = (typeof JENIS_KABAR)[number]

/** Satu perubahan URL publik yang dikabarkan ke mesin pencari. Path selalu dari `pathFor()`. */
export type Kabar = { path: string; jenis: JenisKabar }

/** Versi publik sebuah dokumen: path-nya, dan tanda perubahan besar (artikel: `diperbaruiBesar`). */
export type VersiPublik = { path: string; tanda: string | null }

export const LANGKAH = ['revalidasi', 'sitemap', 'indexnow', 'indexing-api', 'cek-status'] as const
export type Langkah = (typeof LANGKAH)[number]

/** Langkah yang lewat antrean. Revalidasi terjadi saat dokumen disimpan, jadi langsung dicatat. */
export type LangkahAntrean = Exclude<Langkah, 'revalidasi'>

/** Nama adapter di log (spesifikasi §5: `searchConsole`, `indexNow`, `googleIndexing`, `palsu`). */
export const NAMA_ADAPTER = ['next', 'searchConsole', 'indexNow', 'googleIndexing', 'palsu'] as const
export type NamaAdapter = (typeof NAMA_ADAPTER)[number]

export const STATUS_LOG = ['berhasil', 'diulang', 'gagal', 'dilewati', 'ditunda'] as const
export type StatusLog = (typeof STATUS_LOG)[number]

export const STATUS_INDEKS = ['belum-dicek', 'tidak-dikenal', 'ditemukan', 'dirayapi', 'terindeks', 'dikecualikan', 'galat'] as const
export type StatusIndeks = (typeof STATUS_INDEKS)[number]

export const LABEL_JENIS: Record<JenisKabar, string> = {
  terbit: 'Terbit',
  'ubah-besar': 'Perubahan besar',
  pindah: 'Pindah alamat',
  hapus: 'Dihapus',
}

export const LABEL_LANGKAH: Record<Langkah, string> = {
  revalidasi: 'Revalidasi cache',
  sitemap: 'Kirim sitemap ke Search Console',
  indexnow: 'IndexNow',
  'indexing-api': 'Google Indexing API',
  'cek-status': 'Cek status indeks',
}

export const LABEL_STATUS_LOG: Record<StatusLog, string> = {
  berhasil: 'Berhasil',
  diulang: 'Gagal, dicoba lagi',
  gagal: 'Gagal',
  dilewati: 'Dilewati',
  ditunda: 'Ditunda',
}

export const LABEL_STATUS_INDEKS: Record<StatusIndeks, string> = {
  'belum-dicek': 'Belum dicek',
  'tidak-dikenal': 'Belum dikenal Google',
  ditemukan: 'Ditemukan, belum dirayapi',
  dirayapi: 'Dirayapi, belum diindeks',
  terindeks: 'Terindeks',
  dikecualikan: 'Dikecualikan Google',
  galat: 'Error',
}

/** Satu baris antrean. Satu baris per langkah dan path (dedup), dihapus setelah selesai. */
export type BarisAntrean = {
  langkah: LangkahAntrean
  path: string
  jenis: JenisKabar
  jadwal: Date
  /** Jumlah percobaan yang sudah gagal. */
  percobaan: number
  /** Cek status: urutan jadwal berikutnya (0 = +6 jam). */
  tahap: number
  /** Cek status: waktu kabar, dasar jadwal +6 jam sampai +7 hari. */
  dasar: Date | null
}

/** Pengaturan Mesin Indexing dari global `pengaturan-seo`, sudah diberi nilai bawaan. */
export type PengaturanIndexing = {
  urlSitus: string
  kunciIndexNow: string | null
  propertiSearchConsole: string
  kuotaInspeksi: number
  pakaiIndexingApi: boolean
  kuotaIndexingApi: number
}

/** Hasil index status dari URL Inspection API (`indexStatusResult`), hanya yang dipakai. */
export type HasilIndeks = {
  verdict?: string | null
  coverageState?: string | null
  pageFetchState?: string | null
  lastCrawlTime?: string | null
  tautan?: string | null
}

/** Hasil satu panggilan adapter. `dilewati`: tidak dipanggil (kredensial atau kunci belum diatur). */
export type HasilPanggilan =
  | { status: 'berhasil'; kodeHttp: number | null; pesan: string; indeks?: HasilIndeks }
  | { status: 'gagal'; kodeHttp: number | null; pesan: string; kuotaHabis?: boolean }
  | { status: 'dilewati'; pesan: string }
