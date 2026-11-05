import { modeAdapter } from '@/modules/indexer/adapter'
import { bacaAkunLayanan } from '@/modules/indexer/google'

import { adapterAsli } from './asli'
import { adapterPalsu } from './palsu'
import type { BarisAnalitik, JawabanTautan, PermintaanAnalitik } from './tipe'

/** Jawaban satu permintaan Search Analytics. `dilewati`: tidak dipanggil (akun layanan belum diatur, atau adapter palsu). */
export type HasilAnalitik =
  | { status: 'berhasil'; baris: BarisAnalitik[] }
  | { status: 'gagal'; kodeHttp: number | null; pesan: string; kuotaHabis?: boolean }
  | { status: 'dilewati'; pesan: string }

/**
 * Seam modul pantau: dua panggilan ke luar dengan versi asli (`asli.ts`, lewat `fetch`) dan palsu
 * (`palsu.ts`, dalam memori untuk tes dan dev). Keduanya tidak pernah melempar galat.
 */
export type AdapterPantau = {
  /** `searchanalytics.query`: satu halaman jawaban (paling banyak `rowLimit` baris mulai `startRow`). */
  analitik(properti: string, permintaan: PermintaanAnalitik): Promise<HasilAnalitik>
  /** Membuka satu URL situs lain (HEAD, atau GET bila HEAD ditolak) dengan batas waktu. */
  periksaTautan(url: string): Promise<JawabanTautan>
}

/** Adapter dari env server, dengan saklar yang sama dengan Mesin Indexing (`INDEXER_ADAPTER`). */
export function adapterDariEnv(env: Record<string, string | undefined> = process.env): AdapterPantau {
  return modeAdapter(env) === 'asli' ? adapterAsli({ akun: bacaAkunLayanan(env.GOOGLE_SERVICE_ACCOUNT_JSON) }) : adapterPalsu()
}

let adapter: AdapterPantau | undefined

/** Adapter bersama untuk satu proses. Tes menggantinya lewat `pakaiAdapterPantau`. */
export function adapterPantau(): AdapterPantau {
  adapter ??= adapterDariEnv()
  return adapter
}

/** Mengganti adapter (tes). `null` kembali ke adapter dari env. */
export function pakaiAdapterPantau(baru: AdapterPantau | null): void {
  adapter = baru ?? undefined
}
