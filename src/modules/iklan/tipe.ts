/**
 * Tipe bersama modul iklan (spesifikasi §11). Aman dipakai di server, komponen publik, dan admin.
 */

/**
 * Tempat slot iklan. Setiap posisi milik satu jenis halaman, jadi editor tidak bisa memilih pasangan
 * halaman dan posisi yang tidak ada. Tidak ada posisi di dalam kotak Intinya, di atas H1, atau di dalam
 * kalkulator (spesifikasi §11).
 */
export const POSISI_IKLAN = ['artikel-tengah', 'artikel-akhir', 'rubrik', 'tools', 'beranda'] as const
export type PosisiIklan = (typeof POSISI_IKLAN)[number]

export const LABEL_POSISI_IKLAN: Record<PosisiIklan, string> = {
  'artikel-tengah': 'Artikel: di tengah isi, setelah paragraf ke-N',
  'artikel-akhir': 'Artikel: setelah isi, sebelum sumber dan FAQ',
  rubrik: 'Rubrik: setelah daftar tulisan',
  tools: 'Tools: setelah penjelasan, di luar kalkulator',
  beranda: 'Beranda: di tempat blok Slot iklan',
}

/**
 * Ukuran tetap dari daftar ukuran iklan display AdSense. Lebar paling besar 336 px supaya muat di layar
 * 375 px (kontainer 343 px), dan tinggi tetap supaya ruangnya bisa dipesan tanpa pergeseran tata letak.
 */
export const UKURAN_IKLAN = ['persegi', 'persegi-besar', 'banner'] as const
export type UkuranIklan = (typeof UKURAN_IKLAN)[number]

export const DIMENSI_IKLAN: Record<UkuranIklan, { lebar: number; tinggi: number }> = {
  persegi: { lebar: 300, tinggi: 250 },
  'persegi-besar': { lebar: 336, tinggi: 280 },
  banner: { lebar: 320, tinggi: 100 },
}

export const LABEL_UKURAN_IKLAN: Record<UkuranIklan, string> = {
  persegi: 'Persegi 300 x 250',
  'persegi-besar': 'Persegi besar 336 x 280',
  banner: 'Banner 320 x 100',
}

/** Satu slot di global `iklan`. */
export type PengaturanSlot = {
  id: string
  posisi: PosisiIklan
  ukuran: UkuranIklan
  /** `data-ad-slot` unit iklan AdSense. */
  unit: string
  /** Hanya untuk `artikel-tengah`: iklan dipasang setelah paragraf ke berapa. */
  setelahParagraf?: number | null
  aktif: boolean
}

/** Isi global `iklan` yang dipakai situs. */
export type PengaturanIklan = {
  aktif: boolean
  penyedia: 'adsense'
  /** ID penerbit AdSense, `ca-pub-` diikuti 16 angka. */
  idPenerbit: string | null
  /** `data-adtest="on"`: permintaan uji (pratinjau), bukan tayangan sungguhan. */
  modeUji: boolean
  slot: PengaturanSlot[]
  adsTxtTambahan: string | null
}

/** Slot yang lolos semua syarat dan siap dirender `SlotIklan`. */
export type SlotSiap = {
  id: string
  posisi: PosisiIklan
  lebar: number
  tinggi: number
  /** `data-ad-client`: ID penerbit. */
  klien: string
  unit: string
  uji: boolean
  setelahParagraf: number
}
