const PESAN_URL = 'Tulis URL lengkap yang diawali https://'

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
