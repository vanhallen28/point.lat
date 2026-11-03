import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

let cached: Payload | undefined

export async function getTestPayload(): Promise<Payload> {
  if (!cached) {
    cached = await getPayload({ config: await config })
  }
  return cached
}

/**
 * Menjalankan operasi yang diharapkan gagal validasi.
 * Mengembalikan "path: pesan" per field yang gagal, dipisah " | ".
 */
export async function pesanGalat(operasi: Promise<unknown>): Promise<string> {
  try {
    await operasi
  } catch (galat) {
    const data = (galat as { data?: { errors?: { path?: string; message: string }[] } }).data
    return (
      data?.errors?.map((e) => `${e.path ?? '?'}: ${e.message}`).join(' | ') ??
      String((galat as Error).message)
    )
  }
  throw new Error('Operasi diharapkan gagal, tetapi berhasil.')
}

/** Akhiran unik supaya data antar-run tidak bentrok di database tes. */
export function unik(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
