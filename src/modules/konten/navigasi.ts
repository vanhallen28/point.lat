import { notFound, permanentRedirect } from 'next/navigation'

import { muatRedirect } from './cache'
import { tujuanRedirect } from './redirect'

/**
 * Dipanggil halaman saat path tidak cocok dengan dokumen terbit. Redirect permanen dari koleksi
 * `redirect` bila ada (dibuat otomatis saat slug berubah, atau manual oleh editor); selain itu 404.
 * `permanentRedirect` menjawab 308, yang diperlakukan Google sama dengan 301. Kode 410 menjawab 404
 * karena halaman App Router tidak bisa memilih status 410; bagi Google keduanya sama.
 */
export async function tanganiTidakAda(path: string): Promise<never> {
  const tujuan = tujuanRedirect(path, await muatRedirect(path))
  if (tujuan) permanentRedirect(tujuan)
  notFound()
}
