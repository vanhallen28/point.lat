import type { AdapterIndexer, KirimanIndexNow } from './adapter'
import { BATAS_TUNGGU_MS, penyediaToken, SCOPE_INDEXING, SCOPE_WEBMASTERS, type AkunLayanan, type Fetch } from './google'
import type { HasilIndeks, HasilPanggilan } from './tipe'

/**
 * Adapter asli (lewat `fetch`, tanpa pustaka Google). Bentuk permintaan dan jawaban mengikuti
 * dokumentasi resmi: Search Console API (`sitemaps.submit`, `urlInspection.index.inspect`), Indexing
 * API (`urlNotifications.publish`), dan IndexNow (POST JSON ke api.indexnow.org).
 */

export const URL_SEARCH_CONSOLE = 'https://www.googleapis.com/webmasters/v3'
export const URL_INSPEKSI = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'
export const URL_INDEXING_API = 'https://indexing.googleapis.com/v3/urlNotifications:publish'
export const URL_INDEXNOW = 'https://api.indexnow.org/indexnow'

export type GalatGoogle = { error?: { code?: number; message?: string; status?: string } }

const SARAN_403 =
  ' Pastikan email akun layanan terdaftar sebagai pemilik (Owner) properti di Search Console dan API-nya sudah diaktifkan di Google Cloud.'

/**
 * Galat dari API Google. 429 atau `RESOURCE_EXHAUSTED` berarti kuota habis (ditunda ke hari berikutnya).
 * Dipakai juga adapter Search Analytics modul pantau.
 */
export function galatGoogle(kodeHttp: number, data: GalatGoogle): Extract<HasilPanggilan, { status: 'gagal' }> {
  const pesan = data.error?.message?.slice(0, 300).replace(/\.$/, '')
  const kuotaHabis = kodeHttp === 429 || data.error?.status === 'RESOURCE_EXHAUSTED'
  return {
    status: 'gagal',
    kodeHttp,
    kuotaHabis,
    pesan: `Google menjawab ${kodeHttp}${pesan ? `: ${pesan}` : ''}.${kodeHttp === 403 ? SARAN_403 : ''}`,
  }
}

const PESAN_INDEXNOW: Record<number, string> = {
  200: 'IndexNow menerima daftar URL.',
  202: 'IndexNow menerima daftar URL; kunci sedang divalidasi.',
  400: 'IndexNow menolak format kiriman (400).',
  403: 'IndexNow menolak kunci (403). Pastikan file kunci bisa dibuka dan isinya sama dengan kunci di pengaturan SEO.',
  422: 'IndexNow menolak URL (422): URL harus di host situs dan kunci harus cocok.',
  429: 'IndexNow membatasi kiriman (429). Dicoba lagi nanti.',
}

export type OpsiAdapterAsli = {
  /** Akun layanan dari `bacaAkunLayanan`, atau alasan tidak ada (langkah Google dilewati). */
  akun: AkunLayanan | { alasan: string }
  fetch?: Fetch
  sekarang?: () => number
}

export function adapterAsli(opsi: OpsiAdapterAsli): AdapterIndexer {
  const ambil = opsi.fetch ?? fetch
  const token = 'alasan' in opsi.akun ? null : penyediaToken(opsi.akun, { fetch: ambil, sekarang: opsi.sekarang })
  const alasan = 'alasan' in opsi.akun ? opsi.akun.alasan : ''

  async function google(
    scope: string,
    url: string,
    metode: 'PUT' | 'POST',
    badan: unknown,
    berhasil: (data: Record<string, unknown>, kodeHttp: number) => HasilPanggilan,
  ): Promise<HasilPanggilan> {
    if (!token) return { status: 'dilewati', pesan: alasan }
    const akses = await token(scope)
    if ('galat' in akses) return { status: 'gagal', kodeHttp: akses.kodeHttp, pesan: akses.galat }
    try {
      const jawaban = await ambil(url, {
        method: metode,
        headers: { Authorization: `Bearer ${akses.token}`, ...(badan ? { 'Content-Type': 'application/json' } : {}) },
        body: badan ? JSON.stringify(badan) : undefined,
        signal: AbortSignal.timeout(BATAS_TUNGGU_MS),
      })
      const teks = await jawaban.text()
      let data: Record<string, unknown> = {}
      try {
        data = teks ? (JSON.parse(teks) as Record<string, unknown>) : {}
      } catch {
        // jawaban bukan JSON: cukup kode HTTP-nya
      }
      return jawaban.ok ? berhasil(data, jawaban.status) : galatGoogle(jawaban.status, data as GalatGoogle)
    } catch (galat) {
      return { status: 'gagal', kodeHttp: null, pesan: `Tidak bisa menghubungi Google: ${(galat as Error).message}.` }
    }
  }

  return {
    searchConsole: {
      nama: 'searchConsole',
      kirimSitemap: (properti, urlSitemap) =>
        google(
          SCOPE_WEBMASTERS,
          `${URL_SEARCH_CONSOLE}/sites/${encodeURIComponent(properti)}/sitemaps/${encodeURIComponent(urlSitemap)}`,
          'PUT',
          null,
          (_data, kodeHttp) => ({ status: 'berhasil', kodeHttp, pesan: 'Search Console menerima sitemap index.' }),
        ),
      periksaUrl: (properti, url) =>
        google(SCOPE_WEBMASTERS, URL_INSPEKSI, 'POST', { inspectionUrl: url, siteUrl: properti }, (data, kodeHttp) => {
          const hasil = (data.inspectionResult ?? {}) as { inspectionResultLink?: string; indexStatusResult?: Record<string, string> }
          const status = hasil.indexStatusResult ?? {}
          const indeks: HasilIndeks = {
            verdict: status.verdict ?? null,
            coverageState: status.coverageState ?? null,
            pageFetchState: status.pageFetchState ?? null,
            lastCrawlTime: status.lastCrawlTime ?? null,
            tautan: hasil.inspectionResultLink ?? null,
          }
          return { status: 'berhasil', kodeHttp, pesan: 'Hasil inspeksi diterima.', indeks }
        }),
    },
    indexNow: {
      nama: 'indexNow',
      async kirim(kiriman: KirimanIndexNow) {
        try {
          const jawaban = await ambil(URL_INDEXNOW, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(kiriman),
            signal: AbortSignal.timeout(BATAS_TUNGGU_MS),
          })
          const pesan = PESAN_INDEXNOW[jawaban.status] ?? `IndexNow menjawab ${jawaban.status}.`
          return jawaban.ok ? { status: 'berhasil', kodeHttp: jawaban.status, pesan } : { status: 'gagal', kodeHttp: jawaban.status, pesan }
        } catch (galat) {
          return { status: 'gagal', kodeHttp: null, pesan: `Tidak bisa menghubungi IndexNow: ${(galat as Error).message}.` }
        }
      },
    },
    googleIndexing: {
      nama: 'googleIndexing',
      kabari: (url, jenis) =>
        google(SCOPE_INDEXING, URL_INDEXING_API, 'POST', { url, type: jenis }, (_data, kodeHttp) => ({
          status: 'berhasil',
          kodeHttp,
          pesan: `Indexing API menerima ${jenis}.`,
        })),
    },
  }
}
