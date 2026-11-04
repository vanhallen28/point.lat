import type { Payload } from 'payload'

import { susunFooter, susunHeader } from './tampilan'
import type { DataFooter, DataHeader } from './tipe'

/**
 * Query Payload untuk halaman publik. Fungsi di sini menerima `payload` supaya bisa diuji integrasi;
 * halaman memakai versi bertag cache di `cache.ts`.
 */

export async function ambilHeader(payload: Payload): Promise<DataHeader> {
  const header = await payload.findGlobal({
    slug: 'header',
    depth: 1,
    populate: { pilar: { nama: true, slug: true, warna: true } },
  })
  return susunHeader(header)
}

export async function ambilFooter(payload: Payload): Promise<DataFooter> {
  return susunFooter(await payload.findGlobal({ slug: 'footer', depth: 0 }))
}
