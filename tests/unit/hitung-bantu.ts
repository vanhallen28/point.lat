import { expect } from 'vitest'

import type { Hasil, HasilBerhasil } from '@/modules/hitung'

/** Hasil yang diharapkan berhasil (gagal tes dengan galatnya bila tidak). */
export function berhasil(hasil: Hasil): HasilBerhasil {
  if (!hasil.ok) expect.fail(`hitung gagal: ${JSON.stringify(hasil)}`)
  return hasil
}

/** Nilai angka ringkasan yang labelnya diawali `label`. */
export function ringkasan(hasil: HasilBerhasil, label: string): number | undefined {
  return hasil.ringkasan.find((a) => a.label.startsWith(label))?.nilai
}

/** Teks langkah rincian dengan label persis `label` (bagian pertama yang memuatnya). */
export function langkah(hasil: HasilBerhasil, label: string): string | undefined {
  return hasil.rincian.flatMap((b) => b.langkah).find((l) => l.label === label)?.teks
}

/** Teks rupiah Intl memakai spasi tak putus setelah "Rp". */
export const rp = (teks: string) => teks.replace('Rp ', 'Rp\u00a0')
