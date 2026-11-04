import type { Payload } from 'payload'

/** Batas panjang supaya log tidak bisa diisi teks sembarang yang sangat panjang. */
export const MAKS_PATH = 300
export const MAKS_REFERER = 500

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
 * Menambah hitungan path di koleksi `log-404` (satu baris per path). Referer terakhir disimpan bila
 * ada, karena itu yang menunjukkan tautan rusak yang perlu dibetulkan. Dua kiriman bersamaan untuk
 * path baru bisa bentrok di indeks unik `path`; kiriman kedua lalu menambah baris yang sudah ada.
 */
export async function catat404(payload: Payload, catatan: Catatan404, sekarang = new Date()): Promise<void> {
  const tambah = async () => {
    const { docs } = await payload.find({ collection: 'log-404', where: { path: { equals: catatan.path } }, limit: 1, depth: 0 })
    const lama = docs[0]
    if (!lama) return false
    await payload.update({
      collection: 'log-404',
      id: lama.id,
      data: { jumlah: (lama.jumlah ?? 0) + 1, terakhir: sekarang.toISOString(), ...(catatan.referer ? { referer: catatan.referer } : {}) },
    })
    return true
  }
  if (await tambah()) return
  try {
    await payload.create({
      collection: 'log-404',
      data: { path: catatan.path, jumlah: 1, terakhir: sekarang.toISOString(), referer: catatan.referer },
    })
  } catch (galat) {
    if (!(await tambah())) throw galat
  }
}
