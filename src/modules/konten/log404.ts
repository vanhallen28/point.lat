import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

/** Batas panjang supaya log tidak bisa diisi teks sembarang yang sangat panjang. */
export const MAKS_PATH = 300
export const MAKS_REFERER = 500

/** Batas ukuran isian beacon (byte): cukup untuk path dan referer terpanjang beserta JSON-nya. */
export const MAKS_ISIAN_404 = 2048

/**
 * Batas path baru yang dicatat dalam 24 jam terakhir. Kunjungan ke path yang sudah tercatat tetap dihitung;
 * di atas batas ini path baru diabaikan, jadi kiriman sembarang tidak bisa membanjiri log dan dashboard.
 * Jauh di atas jumlah tautan rusak yang wajar untuk situs sebesar point.
 */
export const MAKS_PATH_BARU_24_JAM = 200

const SEHARI_MS = 24 * 60 * 60 * 1000

/** Path yang bukan halaman publik tidak dicatat. */
const AWALAN_SISTEM = ['/api/', '/admin', '/_next/']

export type Catatan404 = { path: string; referer: string | null }

/**
 * Merapikan kiriman beacon halaman 404. `null` bila path tidak layak dicatat: bukan path situs,
 * terlalu panjang, berisi karakter kontrol, atau milik rute sistem. Query dan fragmen dibuang supaya
 * satu halaman hilang tercatat satu baris.
 */
export function rapikanLog404(body: unknown): Catatan404 | null {
  const data = (body ?? {}) as { path?: unknown; referer?: unknown }
  if (typeof data.path !== 'string') return null
  const path = data.path.trim().split(/[?#]/)[0]
  if (!path.startsWith('/') || path.startsWith('//') || path.length > MAKS_PATH) return null
  if (/[\u0000-\u001f\u007f]/.test(path)) return null
  if (AWALAN_SISTEM.some((awalan) => path.startsWith(awalan))) return null
  return { path, referer: rapikanReferer(data.referer) }
}

function rapikanReferer(nilai: unknown): string | null {
  if (typeof nilai !== 'string' || !nilai || nilai.length > MAKS_REFERER) return null
  try {
    const url = new URL(nilai)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

/**
 * Menambah hitungan path di koleksi `log-404` (satu baris per path), dengan referer terakhir bila ada (itu
 * yang menunjukkan tautan rusak yang perlu dibetulkan). Hitungan naik lewat satu `UPDATE` di Postgres, jadi
 * kunjungan bersamaan tidak saling menimpa. Path baru dibuat lewat `INSERT ... SELECT ... WHERE` yang
 * sekaligus memeriksa batas path baru 24 jam terakhir (`batas`); `ON CONFLICT` menangani path yang baru saja
 * dibuat kiriman lain. Mengembalikan `false` bila path baru diabaikan karena batas itu.
 */
export async function catat404(payload: Payload, catatan: Catatan404, sekarang = new Date(), batas = MAKS_PATH_BARU_24_JAM): Promise<boolean> {
  const db = payload.db.drizzle
  const waktu = sekarang.toISOString()
  const { rows: ada } = await db.execute(sql`
    update log_404 set jumlah = coalesce(jumlah, 0) + 1, terakhir = ${waktu}, referer = coalesce(${catatan.referer}, referer), updated_at = now()
    where path = ${catatan.path}
    returning id`)
  if (ada.length) return true
  const { rows: baru } = await db.execute(sql`
    insert into log_404 (path, jumlah, terakhir, referer, created_at, updated_at)
    select ${catatan.path}, 1, ${waktu}, ${catatan.referer}, ${waktu}, now()
    where (select count(*) from log_404 where created_at > ${new Date(sekarang.getTime() - SEHARI_MS).toISOString()} and created_at <= ${waktu}) < ${batas}
    on conflict (path) do update set jumlah = coalesce(log_404.jumlah, 0) + 1, terakhir = excluded.terakhir,
      referer = coalesce(excluded.referer, log_404.referer), updated_at = now()
    returning id`)
  return baru.length > 0
}
