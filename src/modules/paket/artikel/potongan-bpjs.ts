import type { ArtikelPaket } from '../tipe'

import { SUB, SUMBER } from './bersama'

export const artikelPotonganBpjs: ArtikelPaket = {
  slug: 'potongan-bpjs-di-slip-gaji',
  judul: 'Potongan BPJS di slip gaji: besaran iuran dan batas upah 2026',
  tipe: 'panduan',
  pilar: 'uang-karier',
  subkategori: SUB.bpjs,
  deck: 'Dari lima program BPJS, hanya tiga yang dipotong dari gajimu. Ini besaran setiap iuran, batas upahnya, dan cara mengecek apakah kantor sudah menyetorkannya.',
  intinya: [
    'Potongan BPJS dari gajimu: BPJS Kesehatan 1%, JHT 2%, dan JP 1%, total 4% bila gajimu di bawah semua batas upah.',
    'Kantor menanggung bagian yang lebih besar: BPJS Kesehatan 4%, JHT 3,7%, JP 2%, serta seluruh premi JKK dan JKM.',
    'Batas upah 2026: BPJS Kesehatan Rp12.000.000 dan JP Rp11.086.300 sebulan. JHT tidak punya batas.',
  ],
  isi: `Potongan BPJS di slip gaji terdiri dari tiga iuran: BPJS Kesehatan, Jaminan Hari Tua (JHT), dan Jaminan Pensiun (JP). Totalnya 4% dari gaji pokok dan tunjangan tetap, selama gajimu di bawah batas upah. Program lain, yaitu Jaminan Kecelakaan Kerja (JKK), Jaminan Kematian (JKM), dan Jaminan Kehilangan Pekerjaan (JKP), tidak dipotong dari gajimu.

## Tabel iuran 2026

Tabel: Iuran BPJS pekerja penerima upah, 2026
| Program | Dipotong dari gajimu | Dibayar kantor | Batas upah |
|---|---|---|---|
| BPJS Kesehatan | 1% | 4% | Rp12.000.000 |
| Jaminan Hari Tua (JHT) | 2% | 3,7% | Tidak ada |
| Jaminan Pensiun (JP) | 1% | 2% | Rp11.086.300 |
| Jaminan Kecelakaan Kerja (JKK) | 0% | 0,24% sampai 1,74% | Tidak ada |
| Jaminan Kematian (JKM) | 0% | 0,3% | Tidak ada |

Batas upah JP Rp11.086.300 berlaku Maret 2026 sampai Februari 2027. Angkanya disesuaikan setiap Maret mengikuti pertumbuhan ekonomi. Tarif JKK bergantung pada tingkat risiko tempat kerja, dari sangat rendah 0,24% sampai sangat tinggi 1,74%.

## Upah apa yang jadi dasar iuran

Dasarnya gaji pokok ditambah tunjangan tetap. Tunjangan tidak tetap, seperti uang makan harian, dan [upah lembur](/cara-menghitung-upah-lembur) tidak dihitung. Karena itu iuran BPJS-mu biasanya sama setiap bulan, walaupun gaji yang diterima naik turun.

Untuk BPJS Kesehatan ada juga batas bawah: upah minimum kabupaten atau kota tempatmu bekerja, atau upah minimum provinsi bila daerahmu tidak punya upah minimum kabupaten atau kota. Kantor tidak boleh menghitung iuran dari angka yang lebih kecil.

## Contoh potongan di slip

Tabel: Potongan BPJS bagian karyawan per bulan
| Gaji pokok dan tunjangan tetap | BPJS Kesehatan 1% | JHT 2% | JP 1% | Total dipotong |
|---|---|---|---|---|
| Rp5.000.000 | Rp50.000 | Rp100.000 | Rp50.000 | Rp200.000 |
| Rp8.000.000 | Rp80.000 | Rp160.000 | Rp80.000 | Rp320.000 |
| Rp15.000.000 | Rp120.000 | Rp300.000 | Rp110.863 | Rp530.863 |

Lihat baris terakhir. Gaji Rp15.000.000 melewati dua batas. BPJS Kesehatan dihitung dari Rp12.000.000 dan JP dari Rp11.086.300. JHT tetap 2% dari seluruh gaji.

Mau melihat potongan ini bersama PPh 21 dalam satu slip? Gunakan [kalkulator gaji bersih](/tools/gaji-bersih). Penjelasan langkah demi langkahnya ada di [panduan menghitung gaji bersih](/cara-menghitung-gaji-bersih).

## Berapa yang dibayar kantor

Kantor membayar jauh lebih besar daripada yang dipotong dari gajimu. Untuk gaji Rp8.000.000 dengan tarif JKK terendah:

Tabel: Iuran BPJS sebulan untuk gaji Rp8.000.000
| Program | Dibayar kantor | Dipotong dari gajimu |
|---|---|---|
| BPJS Kesehatan | Rp320.000 | Rp80.000 |
| JHT | Rp296.000 | Rp160.000 |
| JP | Rp160.000 | Rp80.000 |
| JKK 0,24% | Rp19.200 | Rp0 |
| JKM 0,3% | Rp24.000 | Rp0 |
| Total | Rp819.200 | Rp320.000 |

Total iurannya Rp1.139.200 sebulan, atau sekitar 14% dari gaji. Itu sebabnya iuran yang tidak disetor merupakan masalah besar.

## Iuran yang dibayar kantor ikut kena pajak

Ini yang sering mengejutkan. Iuran BPJS Kesehatan 4%, premi JKK, dan premi JKM yang dibayar kantor tidak masuk rekeningmu. Tetapi aturan PPh 21 menganggapnya penghasilan, jadi ikut menambah penghasilan bruto saat mencari [tarif PPh 21 TER](/pph-21-ter).

Sebaliknya, iuran JHT dan JP yang dipotong dari gajimu mengurangi penghasilan neto saat pajak setahun dihitung ulang di bulan Desember. Iuran BPJS Kesehatan 1% bagianmu tidak mengurangi pajak.

## Keluarga yang ikut ditanggung

Iuran BPJS Kesehatan 5% itu sudah menanggung kamu, suami atau istri, dan paling banyak tiga anak. Anak keempat dan seterusnya, ayah, ibu, atau mertua bisa didaftarkan dengan tambahan iuran 1% dari upah per orang setiap bulan, dipotong dari gajimu.

## Cara mengecek setoran kantor

> [!tips] Cek sendiri, jangan menunggu klaim
> Pasang aplikasi JMO untuk BPJS Ketenagakerjaan dan Mobile JKN untuk BPJS Kesehatan. Di JMO, saldo JHT seharusnya bertambah setiap bulan. Kalau berhenti bertambah padahal slip gajimu tetap memotong iuran, tanyakan ke HR lalu laporkan ke kantor cabang BPJS Ketenagakerjaan.

Iuran yang tidak disetor merugikanmu dua kali: saldo JHT dan JP berkurang, dan klaim kecelakaan kerja bisa terhambat.

## Kalau gajimu naik atau pindah kerja

- **Gaji naik:** iuran ikut naik mulai bulan gaji baru berlaku, sampai menyentuh batas upah.
- **Pindah kerja:** nomor peserta BPJS Ketenagakerjaan tetap sama. Saldo JHT dari kantor lama tetap tercatat dan bertambah dari kantor baru.
- **BPJS Kesehatan:** kantor baru mendaftarkanmu sebagai pekerja penerima upah. Pastikan tidak ada bulan yang kosong di antara kantor lama dan baru.
- **Berhenti bekerja:** BPJS Kesehatan perlu dipindahkan ke peserta mandiri atau segmen lain supaya tetap aktif. Tanyakan pilihannya di aplikasi Mobile JKN atau kantor cabang.

## Bagaimana dengan JKP

Jaminan Kehilangan Pekerjaan memberi uang tunai dan pelatihan bila kamu terkena PHK. Iurannya tidak dipotong dari gaji. Dananya berasal dari pemerintah dan dari pengalihan sebagian iuran JKK dan JKM yang dibayar kantor. Syaratnya, kantormu harus mendaftarkanmu di semua program BPJS yang wajib.`,
  faq: [
    {
      pertanyaan: 'Berapa total potongan BPJS dari gaji?',
      jawaban:
        'Untuk gaji di bawah semua batas upah, totalnya 4%: BPJS Kesehatan 1%, JHT 2%, dan JP 1%. Gaji Rp8.000.000 dipotong Rp320.000 sebulan.',
    },
    {
      pertanyaan: 'Apakah iuran BPJS dihitung dari gaji yang diterima atau gaji pokok?',
      jawaban: 'Dari gaji pokok ditambah tunjangan tetap. Uang makan harian, uang transport, dan lembur tidak menjadi dasar iuran.',
    },
    {
      pertanyaan: 'Kalau aku resign, apa yang terjadi dengan JHT?',
      jawaban:
        'Saldo JHT tetap milikmu. Kamu bisa mencairkannya setelah berhenti bekerja sesuai syarat BPJS Ketenagakerjaan, atau melanjutkannya di tempat kerja baru dengan nomor peserta yang sama.',
    },
  ],
  sumber: [SUMBER.iuranBpjsTk, SUMBER.jp2026, SUMBER.perpres64, SUMBER.iuranBpjsKes2026],
  seo: {
    keyphrase: 'potongan BPJS',
    keyphraseSekunder: ['iuran BPJS Kesehatan', 'iuran JHT', 'batas upah JP'],
    judulSEO: 'Potongan BPJS di Slip Gaji 2026: Besaran dan Batas Upahnya',
    metaDeskripsi:
      'Potongan BPJS di slip gaji 2026: iuran BPJS Kesehatan 1%, JHT 2%, dan JP 1%, batas upah Rp12 juta dan Rp11.086.300, contoh hitung, dan cara cek setoran kantor.',
  },
  tools: ['gaji-bersih'],
  terkait: ['cara-menghitung-gaji-bersih', 'pph-21-ter', 'cara-menghitung-upah-lembur'],
  sampul: { file: 'potongan-bpjs-di-slip-gaji.png', kata: 'BPJS', alt: 'Kartu sampul point. bertuliskan BPJS di latar hijau pilar Uang & Karier' },
}
