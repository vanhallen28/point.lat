import type { ToolId } from '@/lib/konstanta'

import type { NilaiMasukan } from './masukan'
import type { Aturan } from './parameter'
import type { DefinisiParameter, HasilBerhasil, Isian } from './tipe'

export type HasilRumus = Omit<HasilBerhasil, 'ok' | 'peringatan'>

/** Satu kalkulator di dalam modul: isian form, parameter yang dibacanya, dan rumusnya. */
export type Rumus = {
  /** Teks tombol yang menyebut hasilnya, misalnya "Hitung gaji bersih". */
  tombol: string
  /** Judul bagian isian tambahan (`lanjutan`), misalnya "Atur tunjangan, BPJS, dan iuran lain". */
  lanjutan?: string
  /** Kalkulator yang dokumen parameternya dibaca (THR memakai PTKP dan TER milik Gaji Bersih). */
  sumber: ToolId[]
  /** Parameter milik kalkulator ini di koleksi `parameter-tools`. */
  parameter: DefinisiParameter[]
  isian(aturan: Aturan): Isian[]
  /** Dipanggil setelah semua isian lolos dibaca; `galat` untuk aturan yang melibatkan beberapa isian. */
  hitung(nilai: NilaiMasukan, aturan: Aturan): HasilRumus | { galat: Record<string, string> }
}

/** Bagian dari persen dengan pembulatan 4 desimal, supaya 0,24% x 8.000.000 tepat 19.200 (bukan 19199,999...). */
export function persenDari(nilai: number, persen: number): number {
  return Math.round(nilai * persen * 100) / 10_000
}
