import { angka, isianRupiah, rp } from './gaji-bersih'
import { teksAngka } from './format'
import { persenDari, type Rumus } from './rumus'

/**
 * Cicilan pinjaman dengan bunga tetap sepanjang tenor. Anuitas (umum untuk KPR): cicilan sama setiap
 * bulan, P x r / (1 - (1 + r)^-n) dengan r bunga per bulan. Flat (umum untuk kendaraan dan KTA): bunga
 * dihitung dari pokok awal, P / n + P x r. Bunga mengambang dan biaya lain di luar perhitungan.
 */

const PERSEN_BULANAN = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 })

export const cicilanKpr: Rumus = {
  tombol: 'Hitung cicilan',
  sumber: ['cicilan-kpr'],
  parameter: [],
  isian: () => [
    isianRupiah({ kunci: 'harga', label: 'Harga rumah atau barang', bantuan: 'Harga jual sebelum dikurangi uang muka.', wajib: true, min: 1, contoh: '500.000.000' }),
    {
      jenis: 'angka',
      kunci: 'uangMuka',
      label: 'Uang muka',
      bantuan: 'Persen dari harga. Tulis 0 bila tanpa uang muka.',
      satuan: 'persen',
      desimal: true,
      wajib: true,
      min: 0,
      maks: 99,
      contoh: '20',
    },
    {
      jenis: 'angka',
      kunci: 'bunga',
      label: 'Bunga per tahun',
      bantuan: 'Lihat di penawaran bank atau leasing. Tulis 0 untuk cicilan tanpa bunga.',
      satuan: 'persen',
      desimal: true,
      wajib: true,
      min: 0,
      maks: 50,
      contoh: '7,5',
    },
    { jenis: 'angka', kunci: 'tenor', label: 'Lama cicilan', bantuan: null, satuan: 'tahun', desimal: false, wajib: true, min: 1, maks: 30, contoh: '15' },
    {
      jenis: 'pilihan',
      kunci: 'metode',
      label: 'Cara hitung bunga',
      bantuan: 'Anuitas umum untuk KPR, flat umum untuk kendaraan dan pinjaman tanpa agunan. Tanyakan ke pemberi pinjaman bila ragu.',
      opsi: [
        { nilai: 'anuitas', label: 'Anuitas: cicilan tetap, porsi bunga besar di awal' },
        { nilai: 'flat', label: 'Flat: bunga dari pokok awal setiap bulan' },
      ],
      contoh: 'anuitas',
    },
  ],
  hitung(nilai) {
    const harga = nilai.harga as number
    const uangMuka = nilai.uangMuka as number
    const bunga = nilai.bunga as number
    const tenor = nilai.tenor as number
    const anuitas = nilai.metode === 'anuitas'

    const muka = Math.round(persenDari(harga, uangMuka))
    const pokok = harga - muka
    const n = tenor * 12
    const r = bunga / 100 / 12
    const tepat = anuitas ? (r === 0 ? pokok / n : (pokok * r) / (1 - Math.pow(1 + r, -n))) : pokok / n + pokok * r
    const cicilan = Math.round(tepat)
    const bungaPertama = Math.round(pokok * r)
    const total = cicilan * n
    const totalBunga = total - pokok
    const tarif = teksAngka(bunga, 'persen')

    return {
      utama: {
        ...angka('Cicilan per bulan', cicilan),
        keterangan: `Selama ${n} bulan dengan bunga ${anuitas ? 'anuitas' : 'flat'} ${tarif} per tahun yang tetap.`,
      },
      ringkasan: [angka('Pokok pinjaman', pokok), angka('Total bunga', totalBunga), angka('Total yang dibayar', total)],
      rincian: [
        {
          judul: 'Pokok pinjaman',
          langkah: [
            { label: 'Harga', teks: rp(harga) },
            { label: `Uang muka ${teksAngka(uangMuka, 'persen')}`, teks: rp(muka) },
            { label: 'Pokok pinjaman', teks: rp(pokok) },
          ],
        },
        {
          judul: 'Cicilan',
          langkah: [
            { label: 'Bunga per bulan', teks: `${PERSEN_BULANAN.format(bunga / 12)}%`, catatan: `${tarif} dibagi 12` },
            { label: 'Jumlah cicilan', teks: teksAngka(n, 'bulan'), catatan: `${teksAngka(tenor, 'tahun')} x 12` },
            {
              label: 'Cicilan per bulan',
              teks: rp(cicilan),
              catatan: anuitas
                ? 'Pokok x bunga per bulan / (1 - (1 + bunga per bulan) pangkat minus jumlah cicilan)'
                : 'Pokok / jumlah cicilan + pokok x bunga per bulan',
            },
            {
              label: anuitas ? 'Bunga bulan pertama' : 'Bunga setiap bulan',
              teks: rp(bungaPertama),
              ...(anuitas ? { catatan: 'Turun setiap bulan karena sisa pokok berkurang.' } : {}),
            },
            { label: anuitas ? 'Pokok bulan pertama' : 'Pokok setiap bulan', teks: rp(cicilan - bungaPertama) },
          ],
        },
        {
          judul: 'Total',
          langkah: [
            { label: 'Total yang dibayar', teks: rp(total), catatan: `${n} x ${rp(cicilan)}` },
            { label: 'Total bunga', teks: rp(totalBunga) },
          ],
        },
      ],
      catatan:
        'Bunga dianggap tetap sepanjang tenor. Bunga mengambang (floating) setelah masa bunga tetap mengubah cicilan. Biaya provisi, administrasi, asuransi, dan notaris belum dihitung.',
    }
  },
}
