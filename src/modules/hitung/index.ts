import type { ToolId } from '@/lib/konstanta'

import { bmiKalori } from './bmi-kalori'
import { cicilanKpr } from './cicilan-kpr'
import { danaDarurat } from './dana-darurat'
import { gajiBersih } from './gaji-bersih'
import { ipk } from './ipk'
import { tengahKalimat } from './format'
import { bacaMasukan, contohMasukan } from './masukan'
import { buatAturan, ParameterKosong, periksaDokumen, type Aturan, type GalatParameter } from './parameter'
import type { Rumus } from './rumus'
import { thr } from './thr'
import type { DefinisiParameter, Hasil, Isian, Kalkulator, Masukan, ParameterTersimpan, TeksIsian } from './tipe'

/**
 * Modul hitung (spesifikasi §5): `hitung(toolId, masukan, tanggal, parameter)` adalah satu-satunya
 * titik masuk perhitungan. Fungsi murni tanpa akses database, jadi dipakai sama persis di server
 * (hasil contoh, log parameter) dan di browser (kalkulator). Parameter dari CMS dikirim pemanggil;
 * pemilihan parameter sesuai tanggal dan cadangan "parameter terakhir yang valid" ada di sini.
 *
 * - `siapkanKalkulator` untuk halaman: isian form, contoh masukan, teks tombol, parameter yang berlaku.
 * - `teks` (opsional, di kedua fungsi): label dan bantuan isian dari CMS. Pesan galat ikut memakai
 *   label itu, jadi yang dibaca pembaca selalu sama dengan yang tertulis di form.
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

/** Label dan bantuan dari CMS menimpa teks bawaan, termasuk kolom isian baris. Label kosong diabaikan. */
function timpaTeks<T extends Isian>(isian: T, teks: TeksIsian | undefined): T {
  const cms = teks?.[isian.kunci]
  const hasil = cms ? { ...isian, label: cms.label.trim() || isian.label, bantuan: cms.bantuan?.trim() || null } : isian
  if (hasil.jenis !== 'baris') return hasil
  return { ...hasil, kolom: [timpaTeks(hasil.kolom[0], teks), timpaTeks(hasil.kolom[1], teks)] }
}

const isianDengan = (rumus: Rumus, aturan: Aturan, teks: TeksIsian | undefined) =>
  rumus.isian(aturan).map((i) => timpaTeks(i, teks))

const pesanKosong = (galat: ParameterKosong) =>
  `Kalkulator ini sedang diperbarui: angka ${tengahKalimat(galat.label)} belum tersedia. Coba lagi nanti.`

export function hitung(
  toolId: ToolId,
  masukan: Masukan,
  tanggal: Date | string,
  parameter: ParameterTersimpan[],
  teks?: TeksIsian,
): Hasil {
  const rumus = RUMUS[toolId]
  if (!rumus) return { ok: false, galat: {}, pesan: BELUM_TERSEDIA }
  const aturan = aturanUntuk(rumus, parameter, tanggal)
  try {
    const { nilai, galat } = bacaMasukan(isianDengan(rumus, aturan, teks), masukan)
    if (Object.keys(galat).length > 0) return { ok: false, galat, pesan: null }
    const hasil = rumus.hitung(nilai, aturan)
    if ('galat' in hasil) return { ok: false, galat: hasil.galat, pesan: null }
    return { ok: true, ...hasil, peringatan: [...aturan.peringatan] }
  } catch (galat) {
    if (galat instanceof ParameterKosong) return { ok: false, galat: {}, pesan: pesanKosong(galat) }
    throw galat
  }
}

export function siapkanKalkulator(toolId: ToolId, parameter: ParameterTersimpan[], tanggal: Date | string, teks?: TeksIsian): Kalkulator {
  const rumus = RUMUS[toolId]
  if (!rumus) return { isian: [], contoh: {}, tombol: '', lanjutan: null, dasar: [], peringatan: [], pesan: BELUM_TERSEDIA }
  const aturan = aturanUntuk(rumus, parameter, tanggal)
  try {
    const isian = isianDengan(rumus, aturan, teks)
    // Semua parameter wajib ada; yang pertama kosong melempar `ParameterKosong`.
    for (const d of definisiDari(rumus)) {
      if (d.jenis === 'angka') aturan.angka(d.kunci)
      else aturan.tabel(d.kunci)
    }
    const dasar = aturan.tampil()
    const lanjutan = rumus.lanjutan ?? null
    return { isian, contoh: contohMasukan(isian), tombol: rumus.tombol, lanjutan, dasar, peringatan: [...aturan.peringatan], pesan: null }
  } catch (galat) {
    if (!(galat instanceof ParameterKosong)) throw galat
    const dasar = aturan.tampil()
    return { isian: [], contoh: {}, tombol: rumus.tombol, lanjutan: null, dasar, peringatan: [...aturan.peringatan], pesan: pesanKosong(galat) }
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
