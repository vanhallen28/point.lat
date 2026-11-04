const PESAN_URL = 'Tulis URL lengkap yang diawali https://'

export function validasiRentangTanggal(
  mulai: string | Date | null | undefined,
  sampai: string | Date | null | undefined,
): true | string {
  if (!mulai || !sampai) return true
  return new Date(sampai).getTime() >= new Date(mulai).getTime()
    ? true
    : 'Tanggal akhir harus sama atau sesudah tanggal mulai.'
}

export function validasiUrlOpsional(nilai: unknown): true | string {
  if (nilai === undefined || nilai === null || nilai === '') return true
  if (typeof nilai !== 'string') return PESAN_URL
  try {
    const url = new URL(nilai)
    return url.protocol === 'https:' || url.protocol === 'http:' ? true : PESAN_URL
  } catch {
    return PESAN_URL
  }
}

/** Batas isi takarir WebVTT yang disimpan di CMS (cukup untuk video 30-60 detik). */
export const MAKS_TAKARIR = 20_000

/**
 * Takarir opsional berformat WebVTT: baris pertama harus `WEBVTT` (spesifikasi WebVTT), dengan minimal
 * satu cue bertanda waktu `-->`. Kosong berarti video belum punya takarir.
 */
export function validasiVtt(nilai: unknown): true | string {
  if (nilai === undefined || nilai === null || nilai === '') return true
  if (typeof nilai !== 'string') return 'Takarir harus berupa teks WebVTT.'
  const teks = nilai.replace(/^\uFEFF/, '').trim()
  if (!/^WEBVTT(?:[ \t].*)?(?:\r?\n|$)/.test(teks)) return 'Takarir harus diawali baris WEBVTT.'
  if (!teks.includes('-->')) return 'Takarir belum punya cue bertanda waktu (contoh: 00:00.000 --> 00:04.000).'
  if (teks.length > MAKS_TAKARIR) return `Takarir terlalu panjang (maksimal ${MAKS_TAKARIR} karakter).`
  return true
}
