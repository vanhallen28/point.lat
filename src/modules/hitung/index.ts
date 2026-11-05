import type { ToolId } from '@/lib/konstanta'

import { bmiKalori } from './bmi-kalori'
import { cicilanKpr } from './cicilan-kpr'
import { danaDarurat } from './dana-darurat'
import { gajiBersih } from './gaji-bersih'
import { ipk } from './ipk'
import { tengahKalimat } from './format'
import { bacaMasukan, contohMasukan } from './masukan'
import { buatAturan, ParameterKosong, periksaDokumen, type GalatParameter } from './parameter'
import type { Rumus } from './rumus'
import { thr } from './thr'
import type { DefinisiParameter, Hasil, Kalkulator, Masukan, ParameterTersimpan } from './tipe'

/**
 * Modul hitung (spesifikasi §5): `hitung(toolId, masukan, tanggal, parameter)` adalah satu-satunya
 * titik masuk perhitungan. Fungsi murni tanpa akses database, jadi dipakai sama persis di server
 * (hasil contoh, log parameter) dan di browser (kalkulator). Parameter dari CMS dikirim pemanggil;
 * pemilihan parameter sesuai tanggal dan cadangan "parameter terakhir yang valid" ada di sini.
 *
 * - `siapkanKalkulator` untuk halaman: isian form, contoh masukan, teks tombol, parameter yang berlaku.
 * - `periksaParameter` untuk validasi koleksi `parameter-tools`.
 * - `sumberParameter` untuk pemuat data: kalkulator mana saja yang dokumen parameternya dibaca.
 */

const RUMUS: Record<ToolId, Rumus> = {
  'gaji-bersih': gajiBersih,
  thr,
  'cicilan-kpr': cicilanKpr,
  'dana-darurat': danaDarurat,
  'bmi-kalori': bmiKalori,
  ipk,
}

const BELUM_TERSEDIA = 'Kalkulator ini belum tersedia.'

const definisiDari = (rumus: Rumus): DefinisiParameter[] => rumus.sumber.flatMap((id) => RUMUS[id]?.parameter ?? [])

function aturanUntuk(rumus: Rumus, parameter: ParameterTersimpan[], tanggal: Date | string) {
  return buatAturan(definisiDari(rumus), parameter.filter((p) => rumus.sumber.includes(p.toolId)), tanggal)
}

const pesanKosong = (galat: ParameterKosong) =>
  `Kalkulator ini sedang diperbarui: angka ${tengahKalimat(galat.label)} belum tersedia. Coba lagi nanti.`

export function hitung(toolId: ToolId, masukan: Masukan, tanggal: Date | string, parameter: ParameterTersimpan[]): Hasil {
  const rumus = RUMUS[toolId]
  if (!rumus) return { ok: false, galat: {}, pesan: BELUM_TERSEDIA }
  const aturan = aturanUntuk(rumus, parameter, tanggal)
  try {
    const { nilai, galat } = bacaMasukan(rumus.isian(aturan), masukan)
    if (Object.keys(galat).length > 0) return { ok: false, galat, pesan: null }
    const hasil = rumus.hitung(nilai, aturan)
    if ('galat' in hasil) return { ok: false, galat: hasil.galat, pesan: null }
    return { ok: true, ...hasil, peringatan: [...aturan.peringatan] }
  } catch (galat) {
    if (galat instanceof ParameterKosong) return { ok: false, galat: {}, pesan: pesanKosong(galat) }
    throw galat
  }
}

export function siapkanKalkulator(toolId: ToolId, parameter: ParameterTersimpan[], tanggal: Date | string): Kalkulator {
  const rumus = RUMUS[toolId]
  if (!rumus) return { isian: [], contoh: {}, tombol: '', dasar: [], peringatan: [], pesan: BELUM_TERSEDIA }
  const aturan = aturanUntuk(rumus, parameter, tanggal)
  try {
    const isian = rumus.isian(aturan)
    const dasar = aturan.tampil()
    return { isian, contoh: contohMasukan(isian), tombol: rumus.tombol, dasar, peringatan: [...aturan.peringatan], pesan: null }
  } catch (galat) {
    if (!(galat instanceof ParameterKosong)) throw galat
    return { isian: [], contoh: {}, tombol: rumus.tombol, dasar: aturan.tampil(), peringatan: [...aturan.peringatan], pesan: pesanKosong(galat) }
  }
}

/** Kalkulator yang dokumen parameternya dibaca `toolId` (untuk query `parameter-tools`). */
export function sumberParameter(toolId: ToolId): ToolId[] {
  return RUMUS[toolId]?.sumber ?? [toolId]
}

/** Validasi satu dokumen `parameter-tools`: kunci dikenal kalkulatornya dan bentuk nilai atau tabelnya cocok. */
export function periksaParameter(doc: Pick<ParameterTersimpan, 'toolId' | 'kunci' | 'nilai' | 'tabel'>): GalatParameter {
  const definisi = RUMUS[doc.toolId]?.parameter ?? []
  return periksaDokumen(
    definisi.find((d) => d.kunci === doc.kunci),
    doc,
    definisi.map((d) => d.kunci),
  )
}

export { teksAngka, teksRibuan } from './format'
export type * from './tipe'
