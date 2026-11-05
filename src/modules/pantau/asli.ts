import { galatGoogle, URL_SEARCH_CONSOLE, type GalatGoogle } from '@/modules/indexer/asli'
import { BATAS_TUNGGU_MS, penyediaToken, SCOPE_WEBMASTERS, type AkunLayanan, type Fetch } from '@/modules/indexer/google'

import type { AdapterPantau, HasilAnalitik } from './adapter'
import { BATAS_TUNGGU_TAUTAN_MS } from './aturan'
import type { BarisAnalitik, JawabanTautan } from './tipe'

/**
 * Adapter asli (lewat `fetch`, tanpa pustaka Google). Search Analytics memakai akun layanan dan token
 * yang sama dengan Mesin Indexing (`google.ts`); bentuk permintaan dan jawaban mengikuti dokumentasi
 * `searchanalytics.query`. Pemeriksa tautan membuka URL dengan HEAD, lalu GET bila HEAD ditolak.
 */

export const urlAnalitik = (properti: string) => `${URL_SEARCH_CONSOLE}/sites/${encodeURIComponent(properti)}/searchAnalytics/query`

/** Identitas pemeriksa tautan di log server situs lain. */
export const AGEN_PEMERIKSA = 'Mozilla/5.0 (compatible; point.lat-pemeriksa-tautan/1.0; +https://point.lat)'

/** HEAD ditolak sebagian server (tidak didukung atau diblokir); dicoba sekali lagi dengan GET. */
const ULANG_DENGAN_GET = new Set([403, 405, 501])

export type OpsiAdapterAsli = {
  akun: AkunLayanan | { alasan: string }
  fetch?: Fetch
  sekarang?: () => number
}

export function adapterAsli(opsi: OpsiAdapterAsli): AdapterPantau {
  const ambil = opsi.fetch ?? fetch
  const token = 'alasan' in opsi.akun ? null : penyediaToken(opsi.akun, { fetch: ambil, sekarang: opsi.sekarang })
  const alasan = 'alasan' in opsi.akun ? opsi.akun.alasan : ''

  async function buka(url: string, method: 'HEAD' | 'GET'): Promise<number> {
    const jawaban = await ambil(url, {
      method,
      redirect: 'follow',
      headers: { 'User-Agent': AGEN_PEMERIKSA },
      signal: AbortSignal.timeout(BATAS_TUNGGU_TAUTAN_MS),
    })
    // Isi halaman tidak dibutuhkan, hanya kodenya.
    await jawaban.body?.cancel().catch(() => undefined)
    return jawaban.status
  }

  return {
    async analitik(properti, permintaan): Promise<HasilAnalitik> {
      if (!token) return { status: 'dilewati', pesan: alasan }
      const akses = await token(SCOPE_WEBMASTERS)
      if ('galat' in akses) return { status: 'gagal', kodeHttp: akses.kodeHttp, pesan: akses.galat }
      try {
        const jawaban = await ambil(urlAnalitik(properti), {
          method: 'POST',
          headers: { Authorization: `Bearer ${akses.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(permintaan),
          signal: AbortSignal.timeout(BATAS_TUNGGU_MS),
        })
        const data = (await jawaban.json().catch(() => ({}))) as { rows?: BarisAnalitik[] } & GalatGoogle
        if (!jawaban.ok) return galatGoogle(jawaban.status, data)
        return { status: 'berhasil', baris: Array.isArray(data.rows) ? data.rows : [] }
      } catch (galat) {
        return { status: 'gagal', kodeHttp: null, pesan: `Tidak bisa menghubungi Google: ${(galat as Error).message}.` }
      }
    },

    async periksaTautan(url): Promise<JawabanTautan> {
      try {
        let kodeHttp = await buka(url, 'HEAD')
        if (ULANG_DENGAN_GET.has(kodeHttp)) kodeHttp = await buka(url, 'GET')
        return { kodeHttp, galat: null }
      } catch (galat) {
        const g = galat as Error & { cause?: { code?: string } }
        return { kodeHttp: null, galat: g.message, kodeGalat: g.name === 'TimeoutError' ? 'TimeoutError' : (g.cause?.code ?? null) }
      }
    },
  }
}
