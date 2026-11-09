import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Folder kartu sampul paket. Dibaca dari disk saat impor; di Vercel folder ini ikut dikemas ke fungsi API
 * Payload lewat `outputFileTracingIncludes` di `next.config.ts` (path yang dirangkai dari `process.cwd()` tidak
 * dilacak otomatis).
 */
export const FOLDER_SAMPUL = 'src/modules/paket/sampul'

export function bacaSampul(file: string): Promise<Buffer> {
  if (!/^[a-z0-9-]+\.png$/.test(file)) return Promise.reject(new Error(`Nama file sampul tidak sah: ${file}`))
  return readFile(path.join(process.cwd(), FOLDER_SAMPUL, file))
}
