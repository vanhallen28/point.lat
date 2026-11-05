import { teksAngka } from './format'
import type { NilaiMasukan } from './masukan'
import {
  isianBpjsKesehatan,
  isianBpjsKetenagakerjaan,
  isianStatus,
  PARAMETER_PAJAK,
  pajakPasal17,
  premiDanIuran,
  ptkpSetahun,
  tarifTer,
  type Ikut,
  type StatusPtkp,
} from './pajak'
import type { Aturan } from './parameter'
import { persenDari, type Rumus } from './rumus'
import type { Angka, IsianAngka, Satuan } from './tipe'

/**
 * Gaji bersih pegawai tetap: gaji dikurangi PPh 21 (TER bulanan Januari sampai November, hitung ulang
 * setahun dengan tarif Pasal 17 di Desember) dan iuran BPJS bagian karyawan.
 */

export const rp = (nilai: number) => teksAngka(nilai, 'rupiah')

export const angka = (label: string, nilai: number, satuan: Satuan = 'rupiah'): Angka => ({ label, nilai, satuan, teks: teksAngka(nilai, satuan) })

/** Batas atas isian rupiah: cukup untuk gaji sangat besar, tetap muat di layar 375 px. */
export const MAKS_RUPIAH = 10_000_000_000

export const isianRupiah = (isian: Omit<IsianAngka, 'jenis' | 'satuan' | 'desimal' | 'maks'> & { maks?: number }): IsianAngka => ({
  jenis: 'angka',
  satuan: 'rupiah',
  desimal: false,
  maks: MAKS_RUPIAH,
  ...isian,
})

/** Bruto sebulan (gaji, tunjangan tidak tetap, premi yang dibayar kantor) dan PPh 21 TER-nya. */
export function brutoDanTer(upah: number, tambahan: number, status: StatusPtkp, ikut: Ikut, aturan: Aturan) {
  const premi = premiDanIuran(upah, ikut, aturan)
  const bruto = upah + tambahan + premi.jkk + premi.jkm + premi.kesehatanKantor
  return { premi, bruto, ter: tarifTer(status, bruto, aturan) }
}

const persen = (aturan: Aturan, kunci: string) => teksAngka(aturan.angka(kunci), 'persen')

function hitungGajiBersih(nilai: NilaiMasukan, aturan: Aturan) {
  const gaji = nilai.gaji as number
  const tunjangan = (nilai.tunjanganLain as number | null) ?? 0
  const iuranLain = (nilai.iuranLain as number | null) ?? 0
  const status = nilai.status as StatusPtkp
  const ikut = { kesehatan: nilai.bpjsKesehatan === true, ketenagakerjaan: nilai.bpjsKetenagakerjaan === true }

  const { premi, bruto, ter } = brutoDanTer(gaji, tunjangan, status, ikut, aturan)
  const iuranBpjs = premi.kesehatan + premi.jht + premi.jp
  const potongan = iuranBpjs + iuranLain
  const bersih = gaji + tunjangan - ter.pajak - potongan

  const brutoSetahun = bruto * 12
  const biayaJabatan = Math.min(Math.floor(persenDari(brutoSetahun, aturan.angka('biaya-jabatan'))), aturan.angka('biaya-jabatan-maks'))
  const pengurang = (premi.jht + premi.jp + iuranLain) * 12
  const neto = brutoSetahun - biayaJabatan - pengurang
  const ptkp = ptkpSetahun(status, aturan)
  const pkp = Math.max(0, Math.floor((neto - ptkp) / 1000) * 1000)
  const setahun = pajakPasal17(pkp, aturan)
  const sudahDipotong = ter.pajak * 11
  const desember = setahun.pajak - sudahDipotong
  const bersihDesember = gaji + tunjangan - desember - potongan

  const bulanan = { gaji, tunjangan, iuranLain, status, ikut, premi, bruto, ter, iuranBpjs, bersih }
  return { ...bulanan, brutoSetahun, biayaJabatan, pengurang, neto, ptkp, pkp, setahun, sudahDipotong, desember, bersihDesember }
}

export const gajiBersih: Rumus = {
  tombol: 'Hitung gaji bersih',
  lanjutan: 'Atur tunjangan, BPJS, dan iuran lain',
  sumber: ['gaji-bersih'],
  parameter: PARAMETER_PAJAK,
  isian: () => [
    isianRupiah({
      kunci: 'gaji',
      label: 'Gaji pokok dan tunjangan tetap per bulan',
      bantuan: 'Angka sebelum dipotong apa pun, seperti di kontrak kerja atau slip gaji.',
      wajib: true,
      min: 1,
      contoh: '8.000.000',
    }),
    isianStatus,
    isianRupiah({
      kunci: 'tunjanganLain',
      label: 'Tunjangan tidak tetap per bulan',
      bantuan: 'Misalnya uang makan atau transport yang dibayar menurut hari masuk. Ikut kena PPh 21, tetapi bukan dasar iuran BPJS.',
      lanjutan: true,
      wajib: false,
      min: 0,
      contoh: '0',
    }),
    isianBpjsKesehatan,
    isianBpjsKetenagakerjaan,
    isianRupiah({
      kunci: 'iuranLain',
      label: 'Iuran pensiun lain atau zakat lewat kantor per bulan',
      bantuan: 'Misalnya iuran DPLK atau zakat yang dipotong dari gaji. Mengurangi PPh 21 setahun.',
      lanjutan: true,
      wajib: false,
      min: 0,
      contoh: '0',
    }),
  ],
  hitung(nilai, aturan) {
    const h = hitungGajiBersih(nilai, aturan)
    const { premi } = h
    const tarif = teksAngka(h.ter.tarif, 'persen')
    const kesehatan = h.ikut.kesehatan
    const tk = h.ikut.ketenagakerjaan
    return {
      utama: { ...angka('Gaji bersih per bulan', h.bersih), keterangan: 'Januari sampai November, setelah PPh 21 dan iuran.' },
      ringkasan: [
        angka(`PPh 21 per bulan (TER ${tarif})`, h.ter.pajak),
        angka('Iuran yang dipotong dari gajimu', h.iuranBpjs + h.iuranLain),
        angka('Gaji bersih Desember', h.bersihDesember),
        angka('PPh 21 setahun', h.setahun.pajak),
      ],
      rincian: [
        {
          judul: 'Penghasilan bruto sebulan',
          langkah: [
            { label: 'Gaji pokok dan tunjangan tetap', teks: rp(h.gaji) },
            ...(h.tunjangan > 0 ? [{ label: 'Tunjangan tidak tetap', teks: rp(h.tunjangan) }] : []),
            ...(tk
              ? [
                  { label: `Premi JKK ${persen(aturan, 'jkk')} dibayar kantor`, teks: rp(premi.jkk) },
                  { label: `Premi JKM ${persen(aturan, 'jkm')} dibayar kantor`, teks: rp(premi.jkm) },
                ]
              : []),
            ...(kesehatan
              ? [
                  {
                    label: `BPJS Kesehatan ${persen(aturan, 'bpjs-kesehatan-kantor')} dibayar kantor`,
                    teks: rp(premi.kesehatanKantor),
                    catatan: `Dari upah paling tinggi ${rp(aturan.angka('bpjs-kesehatan-batas'))}.`,
                  },
                ]
              : []),
            { label: 'Penghasilan bruto', teks: rp(h.bruto), catatan: 'Premi yang dibayar kantor ikut dihitung sebagai penghasilan.' },
          ],
        },
        {
          judul: 'PPh 21 Januari sampai November',
          langkah: [
            { label: 'Kategori TER', teks: `${h.ter.kategori} (status ${h.status})` },
            { label: 'Tarif efektif bulanan', teks: tarif },
            { label: 'PPh 21 per bulan', teks: rp(h.ter.pajak), catatan: `${tarif} x ${rp(h.bruto)}` },
          ],
        },
        {
          judul: 'Potongan dari gajimu',
          langkah: [
            ...(kesehatan ? [{ label: `BPJS Kesehatan ${persen(aturan, 'bpjs-kesehatan-karyawan')}`, teks: rp(premi.kesehatan) }] : []),
            ...(tk
              ? [
                  { label: `Jaminan Hari Tua ${persen(aturan, 'jht-karyawan')}`, teks: rp(premi.jht) },
                  {
                    label: `Jaminan Pensiun ${persen(aturan, 'jp-karyawan')}`,
                    teks: rp(premi.jp),
                    catatan: `Dari upah paling tinggi ${rp(aturan.angka('jp-batas'))}.`,
                  },
                ]
              : []),
            ...(h.iuranLain > 0 ? [{ label: 'Iuran pensiun lain atau zakat', teks: rp(h.iuranLain) }] : []),
            { label: 'PPh 21 per bulan', teks: rp(h.ter.pajak) },
            { label: 'Gaji bersih per bulan', teks: rp(h.bersih), catatan: 'Gaji dan tunjangan dikurangi PPh 21 dan semua potongan.' },
          ],
        },
        {
          judul: 'PPh 21 Desember: dihitung ulang setahun',
          langkah: [
            { label: 'Penghasilan bruto setahun', teks: rp(h.brutoSetahun), catatan: `12 x ${rp(h.bruto)}` },
            {
              label: `Biaya jabatan ${persen(aturan, 'biaya-jabatan')}`,
              teks: rp(h.biayaJabatan),
              catatan: `Paling banyak ${rp(aturan.angka('biaya-jabatan-maks'))} setahun.`,
            },
            ...(h.pengurang > 0 ? [{ label: 'Iuran JHT, JP, dan pensiun lain setahun', teks: rp(h.pengurang) }] : []),
            { label: 'Penghasilan neto setahun', teks: rp(h.neto) },
            { label: `PTKP ${h.status}`, teks: rp(h.ptkp) },
            { label: 'Penghasilan kena pajak', teks: rp(h.pkp), catatan: 'Dibulatkan ke bawah ke ribuan penuh.' },
            { label: 'PPh 21 setahun (tarif Pasal 17)', teks: rp(h.setahun.pajak), catatan: h.setahun.uraian },
            { label: 'Sudah dipotong Januari sampai November', teks: rp(h.sudahDipotong), catatan: `11 x ${rp(h.ter.pajak)}` },
            {
              label: 'PPh 21 Desember',
              teks: rp(h.desember),
              ...(h.desember < 0 ? { catatan: 'Minus berarti kelebihan potong yang dikembalikan kantor di bulan Desember.' } : {}),
            },
            { label: 'Gaji bersih Desember', teks: rp(h.bersihDesember) },
          ],
        },
      ],
      catatan: 'Untuk pegawai tetap dengan gaji yang sama setiap bulan. Bonus, lembur, dan THR menaikkan PPh 21 di bulan diterimanya.',
    }
  },
}
