import { adapterAsli } from './asli'
import { bacaAkunLayanan } from './google'
import { adapterPalsu } from './palsu'
import type { HasilPanggilan, NamaAdapter } from './tipe'

/**
 * Seam modul indexer (spesifikasi §5): tiga adapter layanan luar dengan antarmuka yang sama untuk
 * versi asli (`asli.ts`, lewat `fetch`) dan versi palsu (`palsu.ts`, dalam memori untuk tes dan dev).
 * Adapter tidak pernah melempar galat: semua jawaban, termasuk galat jaringan, menjadi `HasilPanggilan`.
 */

/** Badan POST IndexNow (dokumentasi IndexNow, nama field sama dengan API). */
export type KirimanIndexNow = { host: string; key: string; keyLocation: string; urlList: string[] }

export type JenisIndexingApi = 'URL_UPDATED' | 'URL_DELETED'

export type AdapterIndexer = {
  searchConsole: {
    nama: NamaAdapter
    /** `sitemaps.submit`: mendaftarkan atau mengirim ulang sitemap index ke properti. */
    kirimSitemap(properti: string, urlSitemap: string): Promise<HasilPanggilan>
    /** `urlInspection.index.inspect`: status indeks satu URL, hasilnya di `indeks`. */
    periksaUrl(properti: string, url: string): Promise<HasilPanggilan>
  }
  indexNow: {
    nama: NamaAdapter
    kirim(kiriman: KirimanIndexNow): Promise<HasilPanggilan>
  }
  googleIndexing: {
    nama: NamaAdapter
    /** `urlNotifications.publish`. */
    kabari(url: string, jenis: JenisIndexingApi): Promise<HasilPanggilan>
  }
}

/**
 * Memilih adapter dari env server. `INDEXER_ADAPTER=asli` (produksi Vercel) memanggil Google dan
 * IndexNow; akun layanan dibaca dari `GOOGLE_SERVICE_ACCOUNT_JSON`, dan tanpa akun itu langkah Google
 * dilewati dengan pesan di log. `palsu` (atau kosong di dev dan tes) tidak memanggil jaringan. Di build
 * produksi yang dijalankan (`next start`, termasuk deploy pratinjau) env ini wajib diisi supaya mode
 * tidak pernah tertebak.
 */
export function adapterDariEnv(env: Record<string, string | undefined> = process.env): AdapterIndexer {
  if (env.INDEXER_ADAPTER === 'asli') return adapterAsli({ akun: bacaAkunLayanan(env.GOOGLE_SERVICE_ACCOUNT_JSON) })
  if (env.INDEXER_ADAPTER === 'palsu') return adapterPalsu()
  if (env.NODE_ENV === 'production' && env.NEXT_PHASE !== 'phase-production-build') {
    throw new Error('INDEXER_ADAPTER wajib diisi di produksi: asli (situs live) atau palsu (pratinjau dan uji lokal).')
  }
  return adapterPalsu()
}

let adapter: AdapterIndexer | undefined

/** Adapter bersama untuk satu proses. Tes menggantinya lewat `pakaiAdapterIndexer`. */
export function adapterIndexer(): AdapterIndexer {
  adapter ??= adapterDariEnv()
  return adapter
}

/** Mengganti adapter (tes). `null` kembali ke adapter dari env. */
export function pakaiAdapterIndexer(baru: AdapterIndexer | null): void {
  adapter = baru ?? undefined
}
