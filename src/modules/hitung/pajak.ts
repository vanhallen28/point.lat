import { teksAngka } from './format'
import type { Aturan } from './parameter'
import { persenDari } from './rumus'
import type { DefinisiParameter, IsianCentang, IsianPilihan } from './tipe'

/**
 * PPh 21 pegawai tetap dan iuran BPJS bagian karyawan, dipakai Gaji Bersih dan THR. Semua angka
 * aturan dibaca dari parameter (milik kalkulator Gaji Bersih); yang ada di kode hanya cara hitungnya:
 * PP 58/2023 (TER bulanan), PMK 168/2023 (bruto, biaya jabatan, Desember), UU PPh Pasal 17.
 */

export const STATUS_PTKP = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'] as const
export type StatusPtkp = (typeof STATUS_PTKP)[number]
export type KategoriTer = 'A' | 'B' | 'C'

/** Kategori TER per status PTKP (PP 58/2023 dan lampirannya). */
const KATEGORI_TER: Record<StatusPtkp, KategoriTer> = {
  'TK/0': 'A',
  'TK/1': 'A',
  'K/0': 'A',
  'TK/2': 'B',
  'TK/3': 'B',
  'K/1': 'B',
  'K/2': 'B',
  'K/3': 'C',
}

const tabelTer = (judul: string): DefinisiParameter => ({
  kunci: `ter-${judul.toLowerCase()}`,
  label: `Tarif efektif bulanan kategori ${judul}`,
  jenis: 'tabel',
  kolom: { batas: { judul: 'Bruto sebulan sampai', satuan: 'rupiah' }, nilai: { judul: 'Tarif', satuan: 'persen' } },
})

export const PARAMETER_PAJAK: DefinisiParameter[] = [
  { kunci: 'ptkp-dasar', label: 'PTKP wajib pajak', jenis: 'angka', satuan: 'rupiah' },
  { kunci: 'ptkp-kawin', label: 'Tambahan PTKP kawin', jenis: 'angka', satuan: 'rupiah' },
  { kunci: 'ptkp-tanggungan', label: 'Tambahan PTKP per tanggungan', jenis: 'angka', satuan: 'rupiah' },
  tabelTer('A'),
  tabelTer('B'),
  tabelTer('C'),
  {
    kunci: 'tarif-pasal-17',
    label: 'Tarif Pasal 17',
    jenis: 'tabel',
    kolom: { batas: { judul: 'PKP setahun sampai', satuan: 'rupiah' }, nilai: { judul: 'Tarif', satuan: 'persen' } },
  },
  { kunci: 'biaya-jabatan', label: 'Biaya jabatan', jenis: 'angka', satuan: 'persen' },
  { kunci: 'biaya-jabatan-maks', label: 'Batas biaya jabatan setahun', jenis: 'angka', satuan: 'rupiah' },
  { kunci: 'bpjs-kesehatan-kantor', label: 'Iuran BPJS Kesehatan dari kantor', jenis: 'angka', satuan: 'persen' },
  { kunci: 'bpjs-kesehatan-karyawan', label: 'Iuran BPJS Kesehatan dari gaji', jenis: 'angka', satuan: 'persen' },
  { kunci: 'bpjs-kesehatan-batas', label: 'Batas upah iuran BPJS Kesehatan', jenis: 'angka', satuan: 'rupiah' },
  { kunci: 'jht-karyawan', label: 'Iuran JHT dari gaji', jenis: 'angka', satuan: 'persen' },
  { kunci: 'jp-karyawan', label: 'Iuran JP dari gaji', jenis: 'angka', satuan: 'persen' },
  { kunci: 'jp-batas', label: 'Batas upah iuran JP', jenis: 'angka', satuan: 'rupiah' },
  { kunci: 'jkk', label: 'Premi JKK dari kantor', jenis: 'angka', satuan: 'persen' },
  { kunci: 'jkm', label: 'Premi JKM dari kantor', jenis: 'angka', satuan: 'persen' },
]

const LABEL_STATUS: Record<StatusPtkp, string> = {
  'TK/0': 'TK/0: tidak kawin, tanpa tanggungan',
  'TK/1': 'TK/1: tidak kawin, 1 tanggungan',
  'TK/2': 'TK/2: tidak kawin, 2 tanggungan',
  'TK/3': 'TK/3: tidak kawin, 3 tanggungan',
  'K/0': 'K/0: kawin, tanpa tanggungan',
  'K/1': 'K/1: kawin, 1 tanggungan',
  'K/2': 'K/2: kawin, 2 tanggungan',
  'K/3': 'K/3: kawin, 3 tanggungan',
}

export const isianStatus: IsianPilihan = {
  jenis: 'pilihan',
  kunci: 'status',
  label: 'Status PTKP',
  bantuan: 'TK berarti tidak kawin, K berarti kawin. Angka di belakangnya jumlah tanggungan keluarga yang kamu biayai, paling banyak 3.',
  tampilan: 'kisi',
  opsi: STATUS_PTKP.map((s) => ({ nilai: s, label: LABEL_STATUS[s] })),
  contoh: 'TK/0',
}

export const isianBpjsKesehatan: IsianCentang = {
  jenis: 'centang',
  kunci: 'bpjsKesehatan',
  label: 'Ikut BPJS Kesehatan lewat kantor',
  bantuan: null,
  lanjutan: true,
  contoh: true,
}

export const isianBpjsKetenagakerjaan: IsianCentang = {
  jenis: 'centang',
  kunci: 'bpjsKetenagakerjaan',
  label: 'Ikut BPJS Ketenagakerjaan lewat kantor',
  bantuan: 'Jaminan Hari Tua (JHT), Jaminan Pensiun (JP), Jaminan Kecelakaan Kerja (JKK), dan Jaminan Kematian (JKM).',
  lanjutan: true,
  contoh: true,
}

export const kategoriTer = (status: StatusPtkp): KategoriTer => KATEGORI_TER[status]

/** Tarif efektif bulanan untuk bruto sebulan: baris pertama yang batasnya mencakup bruto. */
export function tarifTer(status: StatusPtkp, bruto: number, aturan: Aturan): { kategori: KategoriTer; tarif: number; pajak: number } {
  const kategori = kategoriTer(status)
  const baris = aturan.tabel(`ter-${kategori.toLowerCase()}`).find((b) => typeof b.batas !== 'number' || bruto <= b.batas)
  const tarif = baris?.nilai ?? 0
  return { kategori, tarif, pajak: Math.floor(persenDari(bruto, tarif)) }
}

export function ptkpSetahun(status: StatusPtkp, aturan: Aturan): number {
  const [kawin, tanggungan] = status.split('/')
  return aturan.angka('ptkp-dasar') + (kawin === 'K' ? aturan.angka('ptkp-kawin') : 0) + Number(tanggungan) * aturan.angka('ptkp-tanggungan')
}

/** PPh 21 setahun dengan tarif berlapis Pasal 17 atas PKP, beserta uraian lapisannya. */
export function pajakPasal17(pkp: number, aturan: Aturan): { pajak: number; uraian: string } {
  let bawah = 0
  let pajak = 0
  const uraian: string[] = []
  for (const b of aturan.tabel('tarif-pasal-17')) {
    const atas = typeof b.batas === 'number' ? b.batas : Infinity
    const lapisan = Math.min(pkp, atas) - bawah
    if (lapisan <= 0) break
    pajak += persenDari(lapisan, b.nilai ?? 0)
    uraian.push(`${teksAngka(b.nilai ?? 0, 'persen')} x ${teksAngka(lapisan, 'rupiah')}`)
    bawah = atas
  }
  return { pajak: Math.floor(pajak), uraian: uraian.join(' + ') || 'PKP nol' }
}

export type Ikut = { kesehatan: boolean; ketenagakerjaan: boolean }

/**
 * Premi yang dibayar kantor (masuk bruto PPh 21, PMK 168/2023 Pasal 5) dan iuran yang dipotong dari
 * gaji. Dasar iuran adalah gaji pokok + tunjangan tetap, dengan batas upah BPJS Kesehatan dan JP.
 */
export function premiDanIuran(upah: number, ikut: Ikut, aturan: Aturan) {
  const upahKesehatan = Math.min(upah, aturan.angka('bpjs-kesehatan-batas'))
  const upahJp = Math.min(upah, aturan.angka('jp-batas'))
  const kes = ikut.kesehatan
  const tk = ikut.ketenagakerjaan
  return {
    jkk: tk ? Math.round(persenDari(upah, aturan.angka('jkk'))) : 0,
    jkm: tk ? Math.round(persenDari(upah, aturan.angka('jkm'))) : 0,
    kesehatanKantor: kes ? Math.round(persenDari(upahKesehatan, aturan.angka('bpjs-kesehatan-kantor'))) : 0,
    kesehatan: kes ? Math.round(persenDari(upahKesehatan, aturan.angka('bpjs-kesehatan-karyawan'))) : 0,
    jht: tk ? Math.round(persenDari(upah, aturan.angka('jht-karyawan'))) : 0,
    jp: tk ? Math.round(persenDari(upahJp, aturan.angka('jp-karyawan'))) : 0,
  }
}
