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
