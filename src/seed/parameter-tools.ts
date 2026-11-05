import type { ParameterTersimpan } from '@/modules/hitung'

/**
 * Parameter awal kalkulator (spesifikasi §3: aturan pajak dan iuran diverifikasi ke sumber resmi dan
 * disimpan sebagai parameter bertanggal). Persen ditulis seperti di peraturan (1,5 berarti 1,5%).
 * Diverifikasi 5 November 2026; sumber dan catatan ikut tersimpan di CMS supaya pemilik tahu kapan
 * harus memperbarui. Tes unit modul hitung memakai data yang sama.
 */
export type ParameterAwal = ParameterTersimpan & { sumber: { judul: string; url: string }; catatan?: string }

const SUMBER = {
  ter: {
    judul: 'Lampiran PP 58 Tahun 2023 tentang Tarif Pemotongan PPh Pasal 21 (DJP)',
    url: 'https://www.pajak.go.id/sites/default/files/lampiran/Lampiran%20PP58TAHUN2023.pdf',
  },
  ptkp: { judul: 'Penghasilan Tidak Kena Pajak (DJP)', url: 'https://pajak.go.id/penghasilan-tidak-kena-pajak' },
  pasal17: {
    judul: 'Memotret Keberpihakan UU HPP pada Rakyat Kecil (DJP)',
    url: 'https://www.pajak.go.id/id/artikel/memotret-keberpihakan-uu-hpp-pada-rakyat-kecil',
  },
  pmk168: { judul: 'PMK 168 Tahun 2023 Pasal 10 (JDIH)', url: 'https://peraturan.go.id/files/permenkeu-no-168-tahun-2023.pdf' },
  bpjsKesehatan: {
    judul: 'Perpres 64 Tahun 2020 Pasal 30 dan 32 (JDIH Kemenkeu)',
    url: 'https://jdih.kemenkeu.go.id/download/179608f7-a2a0-41c0-aaec-e7d60eb36054/64TAHUN2020PERPRES.pdf',
  },
  bpjsTk: {
    judul: 'Berapa Besaran Iuran JHT, JKK, JKM, JP dan JKP? (BPJS Ketenagakerjaan)',
    url: 'https://www.bpjsketenagakerjaan.go.id/artikel/18913/artikel-berapa-besaran-iuran-jht,-jkk,-jkm,-jp-dan-jkp',
  },
  jp2026: {
    judul: 'Surat BPJS Ketenagakerjaan B/1226/022026: Batas Upah dan Manfaat Jaminan Pensiun 2026',
    url: 'https://494075.fs1.hubspotusercontent-na1.net/hubfs/494075/compliance-portal/notification-number-b1226022026.pdf',
  },
}

/** Baris tabel dari pasangan [batas atas, tarif]; batas `null` berarti tanpa batas. */
const tabel = (baris: [number | null, number][]) => baris.map(([batas, nilai]) => ({ batas: batas === null ? null : Math.round(batas), nilai }))

const JT = 1_000_000

export const PARAMETER_GAJI: ParameterAwal[] = [
  { toolId: 'gaji-bersih', kunci: 'ptkp-dasar', nilai: 54 * JT, berlakuMulai: '2016-01-01', sumber: SUMBER.ptkp, catatan: 'PMK 101/PMK.010/2016, berlaku sejak tahun pajak 2016.' },
  { toolId: 'gaji-bersih', kunci: 'ptkp-kawin', nilai: 4_500_000, berlakuMulai: '2016-01-01', sumber: SUMBER.ptkp },
  { toolId: 'gaji-bersih', kunci: 'ptkp-tanggungan', nilai: 4_500_000, berlakuMulai: '2016-01-01', sumber: SUMBER.ptkp, catatan: 'Paling banyak 3 tanggungan.' },
  {
    toolId: 'gaji-bersih',
    kunci: 'ter-a',
    berlakuMulai: '2024-01-01',
    sumber: SUMBER.ter,
    catatan: 'Status TK/0, TK/1, dan K/0.',
    tabel: tabel([
      [5.4 * JT, 0], [5.65 * JT, 0.25], [5.95 * JT, 0.5], [6.3 * JT, 0.75], [6.75 * JT, 1], [7.5 * JT, 1.25], [8.55 * JT, 1.5],
      [9.65 * JT, 1.75], [10.05 * JT, 2], [10.35 * JT, 2.25], [10.7 * JT, 2.5], [11.05 * JT, 3], [11.6 * JT, 3.5], [12.5 * JT, 4],
      [13.75 * JT, 5], [15.1 * JT, 6], [16.95 * JT, 7], [19.75 * JT, 8], [24.15 * JT, 9], [26.45 * JT, 10], [28 * JT, 11],
      [30.05 * JT, 12], [32.4 * JT, 13], [35.4 * JT, 14], [39.1 * JT, 15], [43.85 * JT, 16], [47.8 * JT, 17], [51.4 * JT, 18],
      [56.3 * JT, 19], [62.2 * JT, 20], [68.6 * JT, 21], [77.5 * JT, 22], [89 * JT, 23], [103 * JT, 24], [125 * JT, 25],
      [157 * JT, 26], [206 * JT, 27], [337 * JT, 28], [454 * JT, 29], [550 * JT, 30], [695 * JT, 31], [910 * JT, 32],
      [1400 * JT, 33], [null, 34],
    ]),
  },
  {
    toolId: 'gaji-bersih',
    kunci: 'ter-b',
    berlakuMulai: '2024-01-01',
    sumber: SUMBER.ter,
    catatan: 'Status TK/2, TK/3, K/1, dan K/2.',
    tabel: tabel([
      [6.2 * JT, 0], [6.5 * JT, 0.25], [6.85 * JT, 0.5], [7.3 * JT, 0.75], [9.2 * JT, 1], [10.75 * JT, 1.5], [11.25 * JT, 2],
      [11.6 * JT, 2.5], [12.6 * JT, 3], [13.6 * JT, 4], [14.95 * JT, 5], [16.4 * JT, 6], [18.45 * JT, 7], [21.85 * JT, 8],
      [26 * JT, 9], [27.7 * JT, 10], [29.35 * JT, 11], [31.45 * JT, 12], [33.95 * JT, 13], [37.1 * JT, 14], [41.1 * JT, 15],
      [45.8 * JT, 16], [49.5 * JT, 17], [53.8 * JT, 18], [58.5 * JT, 19], [64 * JT, 20], [71 * JT, 21], [80 * JT, 22],
      [93 * JT, 23], [109 * JT, 24], [129 * JT, 25], [163 * JT, 26], [211 * JT, 27], [374 * JT, 28], [459 * JT, 29],
      [555 * JT, 30], [704 * JT, 31], [957 * JT, 32], [1405 * JT, 33], [null, 34],
    ]),
  },
  {
    toolId: 'gaji-bersih',
    kunci: 'ter-c',
    berlakuMulai: '2024-01-01',
    sumber: SUMBER.ter,
    catatan: 'Status K/3.',
    tabel: tabel([
      [6.6 * JT, 0], [6.95 * JT, 0.25], [7.35 * JT, 0.5], [7.8 * JT, 0.75], [8.85 * JT, 1], [9.8 * JT, 1.25], [10.95 * JT, 1.5],
      [11.2 * JT, 1.75], [12.05 * JT, 2], [12.95 * JT, 3], [14.15 * JT, 4], [15.55 * JT, 5], [17.05 * JT, 6], [19.5 * JT, 7],
      [22.7 * JT, 8], [26.6 * JT, 9], [28.1 * JT, 10], [30.1 * JT, 11], [32.6 * JT, 12], [35.4 * JT, 13], [38.9 * JT, 14],
      [43 * JT, 15], [47.4 * JT, 16], [51.2 * JT, 17], [55.8 * JT, 18], [60.4 * JT, 19], [66.7 * JT, 20], [74.5 * JT, 21],
      [83.2 * JT, 22], [95.6 * JT, 23], [110 * JT, 24], [134 * JT, 25], [169 * JT, 26], [221 * JT, 27], [390 * JT, 28],
      [463 * JT, 29], [561 * JT, 30], [709 * JT, 31], [965 * JT, 32], [1419 * JT, 33], [null, 34],
    ]),
  },
  {
    toolId: 'gaji-bersih',
    kunci: 'tarif-pasal-17',
    berlakuMulai: '2022-01-01',
    sumber: SUMBER.pasal17,
    catatan: 'UU 7/2021 (HPP), berlaku sejak tahun pajak 2022.',
    tabel: tabel([[60 * JT, 5], [250 * JT, 15], [500 * JT, 25], [5000 * JT, 30], [null, 35]]),
  },
  { toolId: 'gaji-bersih', kunci: 'biaya-jabatan', nilai: 5, berlakuMulai: '2024-01-01', sumber: SUMBER.pmk168 },
  { toolId: 'gaji-bersih', kunci: 'biaya-jabatan-maks', nilai: 6 * JT, berlakuMulai: '2024-01-01', sumber: SUMBER.pmk168, catatan: 'Rp500.000 sebulan.' },
  { toolId: 'gaji-bersih', kunci: 'bpjs-kesehatan-kantor', nilai: 4, berlakuMulai: '2020-05-06', sumber: SUMBER.bpjsKesehatan },
  { toolId: 'gaji-bersih', kunci: 'bpjs-kesehatan-karyawan', nilai: 1, berlakuMulai: '2020-05-06', sumber: SUMBER.bpjsKesehatan },
  {
    toolId: 'gaji-bersih',
    kunci: 'bpjs-kesehatan-batas',
    nilai: 12 * JT,
    berlakuMulai: '2020-05-06',
    sumber: SUMBER.bpjsKesehatan,
    catatan: 'Batas bawahnya upah minimum kabupaten atau kota. Per Oktober 2026 iuran belum berubah.',
  },
  { toolId: 'gaji-bersih', kunci: 'jht-karyawan', nilai: 2, berlakuMulai: '2015-07-01', sumber: SUMBER.bpjsTk, catatan: 'Kantor menambah 3,7%.' },
  { toolId: 'gaji-bersih', kunci: 'jp-karyawan', nilai: 1, berlakuMulai: '2015-07-01', sumber: SUMBER.bpjsTk, catatan: 'Kantor menambah 2%.' },
  {
    toolId: 'gaji-bersih',
    kunci: 'jp-batas',
    nilai: 10_547_400,
    berlakuMulai: '2025-03-01',
    berlakuSampai: '2026-02-28',
    sumber: SUMBER.jp2026,
    catatan: 'Batas tahun 2025, disebut di surat batas upah 2026.',
  },
  {
    toolId: 'gaji-bersih',
    kunci: 'jp-batas',
    nilai: 11_086_300,
    berlakuMulai: '2026-03-01',
    berlakuSampai: '2027-02-28',
    sumber: SUMBER.jp2026,
    catatan: 'Disesuaikan setiap Maret dengan pertumbuhan PDB (PP 45/2015 Pasal 29). Tambahkan batas 2027 setelah BPJS Ketenagakerjaan mengumumkannya.',
  },
  {
    toolId: 'gaji-bersih',
    kunci: 'jkk',
    nilai: 0.24,
    berlakuMulai: '2015-07-01',
    sumber: SUMBER.bpjsTk,
    catatan: 'Tingkat risiko sangat rendah (kerja kantor). Tingkat lain: 0,54%, 0,89%, 1,27%, 1,74%.',
  },
  { toolId: 'gaji-bersih', kunci: 'jkm', nilai: 0.3, berlakuMulai: '2015-07-01', sumber: SUMBER.bpjsTk },
]

export const PARAMETER_DANA_DARURAT: ParameterAwal[] = [
  {
    toolId: 'dana-darurat',
    kunci: 'kelipatan',
    berlakuMulai: '2026-01-01',
    sumber: {
      judul: 'Tidak Ada Kata Terlambat untuk Dana Darurat (OJK, Sikapi Uangmu)',
      url: 'https://sikapiuangmu.ojk.go.id/FrontEnd/CMS/Article/20586',
    },
    catatan: 'Aturan praktis, bukan peraturan. OJK: lajang 6 kali, berkeluarga atau punya tanggungan 9 sampai 12 kali pengeluaran bulanan.',
    tabel: [
      { label: 'Lajang tanpa tanggungan', nilai: 6 },
      { label: 'Menikah tanpa anak', nilai: 9 },
      { label: 'Menikah dengan anak atau punya tanggungan', nilai: 12 },
    ],
  },
]

export const PARAMETER_BMI: ParameterAwal[] = [
  {
    toolId: 'bmi-kalori',
    kunci: 'kategori-imt',
    berlakuMulai: '2026-01-01',
    sumber: { judul: 'Metadata indikator Indeks Massa Tubuh (BPS SIRUSA)', url: 'https://sirusa.web.bps.go.id/metadata/indikator/21524' },
    catatan:
      'Klasifikasi IMT dewasa Indonesia (Kemenkes): batas atas termasuk, IMT dibulatkan satu desimal. WHO memakai 25 untuk berat badan lebih dan 30 untuk obesitas. Label Normal dipakai untuk rentang berat normal.',
    tabel: [
      { label: 'Sangat kurus', batas: 16.9 },
      { label: 'Kurus', batas: 18.4 },
      { label: 'Normal', batas: 25 },
      { label: 'Gemuk', batas: 27 },
      { label: 'Obesitas', batas: null },
    ],
  },
  {
    toolId: 'bmi-kalori',
    kunci: 'faktor-aktivitas',
    berlakuMulai: '2026-01-01',
    sumber: { judul: 'Human Energy Requirements, FAO/WHO/UNU Expert Consultation, bab 5', url: 'https://www.fao.org/4/Y5686e/y5686e07.htm' },
    catatan: 'Nilai PAL contoh FAO untuk gaya hidup ringan (1,40 sampai 1,69), sedang (1,70 sampai 1,99), dan berat (2,00 sampai 2,40).',
    tabel: [
      { label: 'Ringan: kerja duduk, jarang olahraga', nilai: 1.53 },
      { label: 'Sedang: kerja tidak berat, olahraga sekitar satu jam sehari', nilai: 1.76 },
      { label: 'Berat: kerja fisik berat atau olahraga berat sekitar dua jam sehari', nilai: 2.25 },
    ],
  },
]

export const PARAMETER_IPK: ParameterAwal[] = [
  {
    toolId: 'ipk',
    kunci: 'konversi-nilai',
    berlakuMulai: '2026-01-01',
    sumber: {
      judul: 'Permendikbud 3 Tahun 2020 Pasal 26 (LLDIKTI Wilayah III)',
      url: 'https://lldikti3.kemdiktisaintek.go.id/wp-content/uploads/2024/07/Permendikbud-No.-3-Tahun-2020-Standar-Nasional-Pendidikan-Tinggi.pdf',
    },
    catatan:
      'A = 4 sampai E = 0 dari Permendikbud 3/2020; Permendiktisaintek 39/2025 tetap membolehkan nilai antara. Nilai antara di sini pola yang umum, sesuaikan dengan kampus.',
    tabel: [
      { label: 'A', nilai: 4 },
      { label: 'A-', nilai: 3.7 },
      { label: 'B+', nilai: 3.3 },
      { label: 'B', nilai: 3 },
      { label: 'B-', nilai: 2.7 },
      { label: 'C+', nilai: 2.3 },
      { label: 'C', nilai: 2 },
      { label: 'D', nilai: 1 },
      { label: 'E', nilai: 0 },
    ],
  },
]

export const PARAMETER_AWAL: ParameterAwal[] = [...PARAMETER_GAJI, ...PARAMETER_DANA_DARURAT, ...PARAMETER_BMI, ...PARAMETER_IPK]
