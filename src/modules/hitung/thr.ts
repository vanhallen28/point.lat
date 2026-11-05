import { angka, brutoDanTer, isianRupiah, rp } from './gaji-bersih'
import { teksAngka } from './format'
import { isianBpjsKesehatan, isianBpjsKetenagakerjaan, isianStatus, type StatusPtkp } from './pajak'
import type { Rumus } from './rumus'

/**
 * THR keagamaan (Permenaker 6/2016 Pasal 3, SE Menaker M/3/HK.04.00/III/2026): masa kerja 12 bulan
 * atau lebih mendapat 1 bulan upah; 1 sampai kurang dari 12 bulan proporsional masa kerja/12. PPh 21
 * bulan THR memakai TER atas gaji ditambah THR (PP 58/2023), dengan parameter milik Gaji Bersih.
 */

/** Masa kerja minimal dan masa kerja untuk THR penuh, dalam bulan (Permenaker 6/2016 Pasal 2 dan 3). */
const MASA_MINIMAL = 1
const MASA_PENUH = 12

export const thr: Rumus = {
  tombol: 'Hitung THR',
  lanjutan: 'Atur kepesertaan BPJS',
  sumber: ['gaji-bersih'],
  parameter: [],
  isian: () => [
    isianRupiah({
      kunci: 'upah',
      label: 'Upah sebulan',
      bantuan: 'Gaji pokok ditambah tunjangan tetap. Pekerja harian lepas memakai rata-rata upah sebulan.',
      wajib: true,
      min: 1,
      contoh: '6.500.000',
    }),
    {
      jenis: 'angka',
      kunci: 'masaKerja',
      label: 'Masa kerja sampai hari raya',
      bantuan: 'Dalam bulan penuh. Sudah setahun atau lebih? Tulis 12.',
      satuan: 'bulan',
      desimal: false,
      wajib: true,
      min: 0,
      maks: 600,
      contoh: '12',
    },
    isianStatus,
    isianBpjsKesehatan,
    isianBpjsKetenagakerjaan,
  ],
  hitung(nilai, aturan) {
    const upah = nilai.upah as number
    const masa = nilai.masaKerja as number
    const status = nilai.status as StatusPtkp
    const catatan =
      'PPh 21 bulan THR memakai TER atas gaji ditambah THR. Di bulan Desember pajak setahun dihitung ulang, jadi potongan tambahan ini bukan pajak baru.'
    if (masa < MASA_MINIMAL) {
      return {
        utama: { ...angka('THR kamu', 0), keterangan: 'Masa kerja belum 1 bulan, jadi kamu belum berhak THR keagamaan.' },
        ringkasan: [],
        rincian: [
          {
            judul: 'Besar THR',
            langkah: [
              { label: 'Masa kerja', teks: teksAngka(masa, 'bulan') },
              { label: 'Syarat', teks: 'Masa kerja 1 bulan terus-menerus atau lebih' },
            ],
          },
        ],
        catatan,
      }
    }
    const bulan = Math.min(masa, MASA_PENUH)
    const besar = Math.round((upah * bulan) / MASA_PENUH)
    const ikut = { kesehatan: nilai.bpjsKesehatan === true, ketenagakerjaan: nilai.bpjsKetenagakerjaan === true }
    const biasa = brutoDanTer(upah, 0, status, ikut, aturan)
    const denganThr = brutoDanTer(upah, besar, status, ikut, aturan)
    const tambahan = denganThr.ter.pajak - biasa.ter.pajak
    const penuh = masa >= MASA_PENUH
    return {
      utama: {
        ...angka('THR kamu', besar),
        keterangan: penuh
          ? '1 bulan upah, karena masa kerjamu 12 bulan atau lebih.'
          : `${bulan}/12 dari upah sebulan, karena masa kerjamu ${bulan} bulan.`,
      },
      ringkasan: [angka('Tambahan PPh 21 di bulan THR', tambahan), angka('Perkiraan THR yang kamu terima', besar - tambahan)],
      rincian: [
        {
          judul: 'Besar THR',
          langkah: [
            { label: 'Upah sebulan', teks: rp(upah) },
            { label: 'Masa kerja', teks: teksAngka(masa, 'bulan') },
            { label: 'THR', teks: rp(besar), catatan: penuh ? '1 bulan upah' : `${bulan}/12 x ${rp(upah)}` },
          ],
        },
        {
          judul: 'PPh 21 di bulan THR',
          langkah: [
            { label: 'Bruto bulan biasa', teks: rp(biasa.bruto), catatan: 'Upah ditambah premi yang dibayar kantor.' },
            { label: 'PPh 21 bulan biasa', teks: rp(biasa.ter.pajak), catatan: `TER ${biasa.ter.kategori} ${teksAngka(biasa.ter.tarif, 'persen')}` },
            { label: 'Bruto bulan THR', teks: rp(denganThr.bruto), catatan: `${rp(biasa.bruto)} + THR ${rp(besar)}` },
            {
              label: 'PPh 21 bulan THR',
              teks: rp(denganThr.ter.pajak),
              catatan: `TER ${denganThr.ter.kategori} ${teksAngka(denganThr.ter.tarif, 'persen')}`,
            },
            { label: 'Tambahan PPh 21 karena THR', teks: rp(tambahan) },
            { label: 'Perkiraan THR yang kamu terima', teks: rp(besar - tambahan) },
          ],
        },
      ],
      catatan,
    }
  },
}
