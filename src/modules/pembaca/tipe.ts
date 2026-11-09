/**
 * Fitur pembaca (spesifikasi §23): form kontak (koleksi `pesan-masuk`) dan newsletter tersimpan (koleksi
 * `pelanggan-newsletter`). Nilai `select` koleksi diambil dari daftar di sini supaya kode dan skema sama.
 */

export const TOPIK_PESAN = ['koreksi', 'hak-jawab', 'kerja-sama', 'lainnya'] as const
export type TopikPesan = (typeof TOPIK_PESAN)[number]

export const LABEL_TOPIK: Record<TopikPesan, string> = {
  koreksi: 'Koreksi',
  'hak-jawab': 'Hak jawab',
  'kerja-sama': 'Kerja sama',
  lainnya: 'Lainnya',
}

export const STATUS_PESAN = ['baru', 'dibaca', 'selesai'] as const
export type StatusPesan = (typeof STATUS_PESAN)[number]

export const LABEL_STATUS_PESAN: Record<StatusPesan, string> = {
  baru: 'Baru',
  dibaca: 'Dibaca',
  selesai: 'Selesai',
}

/** Batas isian form kontak. */
export const BATAS_PESAN = { nama: 100, email: 254, pesanMin: 20, pesanMaks: 5000 } as const

/** Ukuran badan permintaan form paling besar (byte). */
export const MAKS_ISIAN_FORM = 10 * 1024

/** Kiriman paling banyak per sidik pengirim dalam satu jam (form kontak dan newsletter masing-masing). */
export const MAKS_KIRIMAN_PER_JAM = 5

/** Sidik pengirim dihapus setelah 24 jam; pesan masuk dihapus setelah 12 bulan. */
export const UMUR_SIDIK_JAM = 24
export const UMUR_PESAN_BULAN = 12

/** Nama kolom jebakan (harus kosong). Namanya wajar supaya bot mengisinya, disembunyikan dari pembaca. */
export const KOLOM_JEBAKAN = 'situs_web'

/** Fragmen tujuan form tanpa JavaScript: pesan hasil tampil lewat CSS `:target`. */
export const FRAGMEN = {
  pesanTerkirim: 'pesan-terkirim',
  pesanGagal: 'pesan-gagal',
  daftarBerhasil: 'newsletter-terdaftar',
  daftarGagal: 'newsletter-gagal',
  berhentiBerhasil: 'berhenti-berhasil',
  berhentiGagal: 'berhenti-gagal',
} as const

export type IsianKontak = { nama: string; email: string; topik: TopikPesan; pesan: string }

/** Hasil pemeriksaan isian: data bersih, atau pesan galat per kolom (siap tampil). */
export type HasilPeriksa<T> = { ok: true; data: T } | { ok: false; galat: Record<string, string> }
