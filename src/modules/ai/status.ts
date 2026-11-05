import type { Payload } from 'payload'

import { adapterAi, type KeadaanAdapter } from './adapter'
import { terpakaiBulan } from './anggaran'
import { bulanJakarta, hargaModel, keadaanAnggaran, modelTugas, type KeadaanAnggaran, type SumberModel } from './aturan'
import { TUGAS_AI, type HargaModel, type ModeAi, type TugasAi } from './tipe'

/** Isian global Asisten AI yang dipakai modul. */
export type PengaturanAi = { aktif: boolean; anggaranBulanan: number; harga: HargaModel[]; frasaKlise: string[] }

export async function ambilPengaturanAi(payload: Payload): Promise<PengaturanAi> {
  const g = (await payload.findGlobal({ slug: 'asisten-ai', depth: 0 })) as Partial<{
    aktif: boolean | null
    anggaranBulanan: number | null
    harga: { model?: string | null; masuk?: number | null; keluar?: number | null }[] | null
    frasaKlise: string[] | null
  }>
  return {
    aktif: g.aktif !== false,
    anggaranBulanan: typeof g.anggaranBulanan === 'number' ? g.anggaranBulanan : 0,
    harga: (g.harga ?? []).map((h) => ({ model: h.model ?? '', masuk: Number(h.masuk), keluar: Number(h.keluar) })),
    frasaKlise: (g.frasaKlise ?? []).filter((f): f is string => typeof f === 'string' && f.trim() !== ''),
  }
}

export type StatusTugas = { model: string; sumber: SumberModel; adaHarga: boolean }

/** Keadaan asisten untuk editor (sidebar) dan admin (global): bisa dipakai atau tidak, dan kenapa. */
export type StatusAsisten = {
  aktif: boolean
  mode: ModeAi | null
  /** Penjelasan untuk editor bila tombol AI nonaktif; `null` bila siap. */
  pesan: string | null
  bulan: string
  anggaran: KeadaanAnggaran
  tugas: Record<TugasAi, StatusTugas>
  frasaKlise: string[]
}

export function susunStatus(
  pengaturan: PengaturanAi,
  adapter: KeadaanAdapter,
  env: Record<string, string | undefined>,
  terpakai: number,
  bulan: string,
): StatusAsisten {
  const anggaran = keadaanAnggaran(pengaturan.anggaranBulanan, terpakai, 0)
  const tugas = Object.fromEntries(
    TUGAS_AI.map((t) => {
      const { model, sumber } = modelTugas(t, env)
      return [t, { model, sumber, adaHarga: hargaModel(model, pengaturan.harga) !== null }]
    }),
  ) as Record<TugasAi, StatusTugas>
  let pesan: string | null = null
  if (!pengaturan.aktif) pesan = 'Asisten AI sedang dimatikan admin di Pengaturan, Asisten AI.'
  else if (adapter.mode === null) pesan = `Asisten AI belum dipasang: ${adapter.pesan}`
  else if (anggaran.sisa <= 0) pesan = 'Anggaran AI bulan ini sudah habis. Tombol AI aktif lagi awal bulan depan, atau setelah admin menaikkan anggaran.'
  return {
    aktif: pengaturan.aktif,
    mode: adapter.mode,
    pesan,
    bulan,
    anggaran: { ...anggaran, cukup: anggaran.sisa > 0 },
    tugas,
    frasaKlise: pengaturan.frasaKlise,
  }
}

/** Status dengan adapter yang sama dengan yang dipakai `jalankan` (dari env, atau pengganti di tes). */
export async function statusAsisten(
  payload: Payload,
  opsi: { adapter?: KeadaanAdapter; env?: Record<string, string | undefined>; sekarang?: Date } = {},
): Promise<StatusAsisten> {
  const bulan = bulanJakarta(opsi.sekarang ?? new Date())
  const [pengaturan, terpakai] = await Promise.all([ambilPengaturanAi(payload), terpakaiBulan(payload, bulan)])
  return susunStatus(pengaturan, opsi.adapter ?? adapterAi(), opsi.env ?? process.env, terpakai, bulan)
}
