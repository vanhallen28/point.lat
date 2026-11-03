export const TIPE_ARTIKEL = ['panduan', 'explainer', 'daftar', 'glosarium'] as const
export type TipeArtikel = (typeof TIPE_ARTIKEL)[number]

export const LABEL_TIPE_ARTIKEL: Record<TipeArtikel, string> = {
  panduan: 'Panduan',
  explainer: 'Explainer',
  daftar: 'Daftar & Perbandingan',
  glosarium: 'Glosarium',
}

/** Token warna pilar dari spesifikasi §4. Nilai hex dipakai frontend lewat token CSS. */
export const WARNA_PILAR = {
  hijau: { label: 'Hijau (Uang & Karier)', hex: '#1F7A4D', teks: '#FFFFFF' },
  oranye: { label: 'Oranye (Tekno)', hex: '#C2410C', teks: '#FFFFFF' },
  kuning: { label: 'Kuning (Belajar)', hex: '#F2C230', teks: '#111111' },
  koral: { label: 'Koral (Sehat)', hex: '#FF8A80', teks: '#111111' },
} as const
export type WarnaPilar = keyof typeof WARNA_PILAR

export const TOOL_IDS = [
  'gaji-bersih',
  'thr',
  'cicilan-kpr',
  'dana-darurat',
  'bmi-kalori',
  'ipk',
] as const
export type ToolId = (typeof TOOL_IDS)[number]

export const LABEL_TOOL: Record<ToolId, string> = {
  'gaji-bersih': 'Gaji Bersih',
  thr: 'THR',
  'cicilan-kpr': 'Cicilan & KPR',
  'dana-darurat': 'Dana Darurat',
  'bmi-kalori': 'BMI & Kalori',
  ipk: 'IPK',
}
