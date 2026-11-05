import { adapterAsli } from './asli'
import { adapterPalsu } from './palsu'
import type { Effort, ModeAi, Token, TugasAi } from './tipe'

/**
 * Seam modul AI (spesifikasi §5): satu panggilan Messages API Claude dengan versi asli (`asli.ts`, lewat
 * `fetch`) dan palsu (`palsu.ts`, dalam memori untuk tes, dev, dan pratinjau). Adapter tidak pernah
 * melempar galat: semua jawaban, termasuk galat jaringan, menjadi `JawabanClaude`.
 */

/** Satu permintaan ke Claude. `tugas` tidak dikirim ke API; adapter palsu memakainya untuk memilih contoh. */
export type PermintaanClaude = {
  tugas: TugasAi
  model: string
  sistem: string
  pesan: string
  /** JSON Schema keluaran (`output_config.format`, structured outputs). */
  skema: Record<string, unknown>
  maksToken: number
  effort: Effort
}

export type JenisGalatAi =
  | 'kunci'
  | 'izin'
  | 'tagihan'
  | 'batas'
  | 'sibuk'
  | 'permintaan'
  | 'model'
  | 'ditolak'
  | 'terpotong'
  | 'format'
  | 'jaringan'

/** Token tetap dicatat pada galat yang sudah ditagih (misalnya jawaban terpotong atau ditolak model). */
export type JawabanClaude =
  | { status: 'berhasil'; json: unknown; token: Token; idPermintaan: string | null }
  | { status: 'gagal'; jenis: JenisGalatAi; pesan: string; kodeHttp: number | null; token: Token; idPermintaan: string | null }

export type AdapterAi = { nama: ModeAi; kirim(permintaan: PermintaanClaude): Promise<JawabanClaude> }

/** Adapter siap dipakai, atau pesan untuk admin bila env server belum lengkap. */
export type KeadaanAdapter = { mode: ModeAi; adapter: AdapterAi } | { mode: null; pesan: string }

/**
 * Memilih adapter dari env server `AI_ADAPTER`, terpisah dari `INDEXER_ADAPTER`: AI berbayar per token
 * dan kuncinya milik akun lain, jadi pemilik bisa menyalakan Claude tanpa menyalakan Google (atau
 * sebaliknya). `asli` butuh `ANTHROPIC_API_KEY`. Kosong di dev dan tes berarti `palsu`; di build
 * produksi yang dijalankan (`next start`, termasuk pratinjau) wajib diisi, dan tanpa nilai itu asisten
 * menolak dengan pesan, tidak menebak mode.
 */
export function adapterDariEnv(env: Record<string, string | undefined> = process.env): KeadaanAdapter {
  const nilai = env.AI_ADAPTER?.trim()
  if (nilai === 'asli') {
    const kunci = env.ANTHROPIC_API_KEY?.trim()
    if (!kunci) return { mode: null, pesan: 'ANTHROPIC_API_KEY belum diisi di env server.' }
    return { mode: 'asli', adapter: adapterAsli({ kunci }) }
  }
  if (nilai === 'palsu') return { mode: 'palsu', adapter: adapterPalsu() }
  if (nilai) return { mode: null, pesan: `AI_ADAPTER "${nilai}" tidak dikenal. Isi asli atau palsu.` }
  if (env.NODE_ENV === 'production' && env.NEXT_PHASE !== 'phase-production-build') {
    return { mode: null, pesan: 'AI_ADAPTER belum diisi di env server: asli (situs live) atau palsu (pratinjau dan uji lokal).' }
  }
  return { mode: 'palsu', adapter: adapterPalsu() }
}

let keadaan: KeadaanAdapter | undefined

/** Adapter bersama untuk satu proses. Tes menggantinya lewat `pakaiAdapterAi`. */
export function adapterAi(): KeadaanAdapter {
  keadaan ??= adapterDariEnv()
  return keadaan
}

/** Mengganti adapter (tes). `null` kembali ke adapter dari env. */
export function pakaiAdapterAi(baru: AdapterAi | null): void {
  keadaan = baru ? { mode: baru.nama, adapter: baru } : undefined
}
