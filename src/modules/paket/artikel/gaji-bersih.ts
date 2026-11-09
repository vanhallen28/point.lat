import type { ArtikelPaket } from '../tipe'

import { SUB, SUMBER } from './bersama'

export const artikelGajiBersih: ArtikelPaket = {
  slug: 'cara-menghitung-gaji-bersih',
  judul: 'Cara menghitung gaji bersih: PPh 21 TER, BPJS, dan potongan Desember',
  tipe: 'panduan',
  pilar: 'uang-karier',
  subkategori: SUB.gajiPajak,
  deck: 'Gaji di kontrak bukan gaji yang masuk rekening. Begini cara menghitung potongan PPh 21 dan iuran BPJS, lengkap dengan contoh angka 2026.',
  intinya: [
    'Gaji bersih = gaji pokok dan tunjangan dikurangi PPh 21 bulanan dan iuran BPJS bagian karyawan.',
    'PPh 21 Januari sampai November memakai tarif efektif (TER) dari penghasilan bruto, termasuk premi yang dibayar kantor.',
    'Iuran yang dipotong dari gajimu: BPJS Kesehatan 1%, JHT 2%, dan JP 1%, masing-masing dengan batas upah.',
    'Di bulan Desember pajak dihitung ulang setahun, jadi gaji bersih Desember bisa lebih kecil atau lebih besar.',
  ],
  isi: `Cara menghitung gaji bersih sebenarnya hanya tiga langkah: hitung penghasilan bruto, kurangi PPh 21 bulanan, lalu kurangi iuran BPJS bagian karyawan. Yang sering membingungkan adalah detailnya. Ada premi yang dibayar kantor tetapi ikut menambah bruto. Ada juga batas upah iuran, dan pajak Desember yang dihitung ulang.

Panduan ini memakai aturan yang berlaku untuk pegawai tetap pada 2026. Siapkan slip gajimu, lalu cocokkan setiap angkanya.

## Langkah 1: hitung penghasilan bruto sebulan

Penghasilan bruto untuk PPh 21 bukan hanya gaji pokok. Isinya:

- Gaji pokok dan tunjangan tetap, misalnya tunjangan jabatan.
- Tunjangan tidak tetap, misalnya uang makan atau transport yang dibayar menurut hari masuk.
- Premi Jaminan Kecelakaan Kerja (JKK) dan Jaminan Kematian (JKM) yang dibayar kantor.
- Iuran BPJS Kesehatan bagian kantor, yaitu 4% dari gaji.

Premi dan iuran bagian kantor tidak pernah masuk rekeningmu. Tetapi aturan pajak menganggapnya penghasilan, jadi ikut menambah bruto.

> [!info] Kenapa bruto lebih besar dari gaji
> Gaji Rp6.500.000 dengan JKK 0,24%, JKM 0,3%, dan BPJS Kesehatan 4% dari kantor menghasilkan bruto Rp6.795.100. Angka inilah yang dipakai untuk mencari tarif PPh 21.

## Langkah 2: cari tarif PPh 21 bulanan (TER)

Sejak 2024 pajak bulanan pegawai tetap dipotong dengan tarif efektif rata-rata atau TER. Caranya sederhana: bruto sebulan dikali satu persentase dari tabel. Tabelnya ada tiga, kategori A, B, dan C, dan kategorinya ditentukan status PTKP-mu.

Tabel: Status PTKP dan kategori TER
| Status PTKP | Kategori TER |
|---|---|
| TK/0, TK/1, K/0 | A |
| TK/2, TK/3, K/1, K/2 | B |
| K/3 | C |

TK berarti tidak kawin dan K berarti kawin. Angka di belakangnya jumlah tanggungan, paling banyak tiga. Penjelasan lengkap setiap tabel ada di [panduan PPh 21 TER](/pph-21-ter), dan besaran PTKP per status ada di [artikel PTKP 2026](/ptkp-2026).

Untuk bruto Rp6.795.100 dengan status TK/0, tarif kategori A adalah 1,25%. PPh 21 sebulannya Rp84.938.

## Langkah 3: kurangi iuran BPJS bagian karyawan

Ada tiga iuran yang dipotong langsung dari gajimu:

Tabel: Iuran BPJS yang dipotong dari gaji (2026)
| Iuran | Bagian karyawan | Bagian kantor | Batas upah |
|---|---|---|---|
| BPJS Kesehatan | 1% | 4% | Rp12.000.000 |
| Jaminan Hari Tua (JHT) | 2% | 3,7% | Tanpa batas |
| Jaminan Pensiun (JP) | 1% | 2% | Rp11.086.300 (Maret 2026 sampai Februari 2027) |

Batas upah berarti iuran dihitung paling tinggi dari angka itu. Gaji Rp15.000.000 tetap kena iuran JP 1% dari Rp11.086.300, yaitu Rp110.863. Rincian semua iuran ada di [panduan potongan BPJS di slip gaji](/potongan-bpjs-di-slip-gaji).

## Contoh lengkap: gaji Rp6.500.000, status TK/0

1. Bruto: Rp6.500.000 + JKK Rp15.600 + JKM Rp19.500 + BPJS Kesehatan dari kantor Rp260.000 = Rp6.795.100.
2. PPh 21 bulanan: 1,25% x Rp6.795.100 = Rp84.938.
3. Iuran karyawan: BPJS Kesehatan Rp65.000 + JHT Rp130.000 + JP Rp65.000 = Rp260.000.
4. Gaji bersih Januari sampai November: Rp6.500.000 - Rp84.938 - Rp260.000 = Rp6.155.062.

Mau mencoba dengan angkamu sendiri? Pakai kalkulator di bawah. Hasilnya lengkap dengan rincian setiap langkah.

[[tool:gaji-bersih]]

## Kenapa gaji Desember berbeda

TER hanya cara memotong pajak setiap bulan. Di masa pajak terakhir, kantor menghitung ulang pajak setahun dengan tarif Pasal 17 UU HPP:

1. Jumlahkan bruto setahun.
2. Kurangi biaya jabatan 5%, paling banyak Rp6.000.000 setahun.
3. Kurangi iuran JHT dan JP yang kamu bayar setahun.
4. Kurangi PTKP sesuai statusmu, lalu bulatkan ke ribuan.
5. Hitung pajak setahun dengan tarif berlapis 5%, 15%, 25%, 30%, dan 35%.
6. PPh 21 Desember adalah pajak setahun dikurangi yang sudah dipotong Januari sampai November.

Untuk contoh tadi, pajak setahunnya Rp1.056.200. Yang sudah dipotong 11 bulan Rp934.318, jadi PPh 21 Desember Rp121.882 dan gaji bersih Desember Rp6.118.118.

Bila hasil langkah 6 minus, kantor wajib mengembalikan kelebihan potong itu. Bukti potong tahunan dari kantor (BPA1) nanti kamu pakai saat [lapor SPT Tahunan di Coretax](/cara-lapor-spt-tahunan-coretax).

## Tiga contoh lain

Tabel: Gaji bersih per bulan, Januari sampai November 2026, ikut BPJS Kesehatan dan BPJS Ketenagakerjaan
| Gaji | Status | TER | PPh 21 sebulan | Iuran karyawan | Gaji bersih |
|---|---|---|---|---|---|
| Rp5.000.000 | TK/0 | 0% | Rp0 | Rp200.000 | Rp4.800.000 |
| Rp8.000.000 | K/1 | 1% | Rp83.632 | Rp320.000 | Rp7.596.368 |
| Rp15.000.000 | TK/0 | 7% | Rp1.089.270 | Rp530.863 | Rp13.379.867 |

Perhatikan baris pertama. TER-nya 0% sehingga tidak ada potongan pajak bulanan. Tetapi di bulan Desember tetap ada PPh 21 Rp189.350, karena penghasilan setahunnya di atas PTKP.

## Kalau ada tunjangan tidak tetap

Tunjangan tidak tetap, misalnya uang makan Rp1.000.000 yang dibayar menurut hari masuk, ikut menambah penghasilan bruto. Tetapi tunjangan ini bukan dasar iuran BPJS. Lanjutkan contoh gaji Rp6.500.000 berstatus TK/0:

1. Bruto: Rp6.795.100 + Rp1.000.000 = Rp7.795.100.
2. Baris TER kategori A untuk bruto itu 1,5%, jadi PPh 21 sebulan Rp116.926.
3. Iuran karyawan tetap Rp260.000, karena dihitung dari gaji pokok dan tunjangan tetap saja.
4. Gaji bersih: Rp6.500.000 + Rp1.000.000 - Rp116.926 - Rp260.000 = Rp7.123.074.

Tunjangan Rp1.000.000 menambah gaji bersih sekitar Rp968.000, bukan Rp1.000.000. Sisanya terpakai untuk pajak, karena tarif TER naik satu tingkat.

## Cara membaca slip gaji

Slip gaji yang rapi biasanya punya dua kolom. Cocokkan dengan urutan ini:

1. **Penerimaan:** gaji pokok, tunjangan tetap, tunjangan tidak tetap, lembur. Jumlahkan.
2. **Potongan iuran:** BPJS Kesehatan, JHT, dan JP. Bandingkan dengan 1%, 2%, dan 1% dari gaji pokok ditambah tunjangan tetap.
3. **Potongan pajak:** PPh 21. Cari baris TER dari bruto, bukan dari total penerimaan saja.
4. **Potongan lain:** koperasi, pinjaman kantor, atau zakat. Potongan ini harus berdasarkan persetujuanmu.
5. **Gaji bersih:** penerimaan dikurangi semua potongan. Angka ini yang masuk rekening.

Kalau ada potongan yang tidak kamu kenali, minta penjelasan tertulis dari HR.

## Kesalahan yang sering terjadi

- **Menghitung pajak dari gaji pokok saja.** Premi JKK, JKM, dan BPJS Kesehatan bagian kantor ikut bruto.
- **Lupa batas upah.** Iuran BPJS Kesehatan dan JP berhenti naik di batasnya.
- **Mengira THR atau bonus kena pajak baru.** Potongan di bulan THR memang lebih besar, tetapi beban setahunnya tetap sama karena dihitung ulang di Desember.
- **Memakai status PTKP yang salah.** Status ditentukan keadaanmu pada awal tahun pajak. Menikah di bulan Juni baru berpengaruh tahun depan.

## Kalau slip gajimu berbeda

Selisih kecil biasanya datang dari komponen yang tidak ada di contoh ini: lembur, tunjangan tidak tetap yang berubah setiap bulan, tarif JKK yang lebih tinggi untuk pekerjaan berisiko, atau potongan koperasi. Tanyakan rinciannya ke bagian HR. Kamu berhak tahu dasar setiap potongan di slip gajimu.`,
  faq: [
    {
      pertanyaan: 'Apakah gaji di bawah Rp5 juta kena PPh 21?',
      jawaban:
        'Bisa tidak dipotong setiap bulan karena TER-nya 0%, tetapi bisa tetap kena di bulan Desember bila penghasilan neto setahun di atas PTKP. Contohnya gaji Rp5.000.000 berstatus TK/0 kena PPh 21 Desember Rp189.350.',
    },
    {
      pertanyaan: 'Apakah iuran BPJS mengurangi pajak?',
      jawaban:
        'Iuran JHT dan JP yang dipotong dari gajimu mengurangi penghasilan neto saat pajak setahun dihitung di Desember. Iuran BPJS Kesehatan bagian karyawan tidak mengurangi pajak.',
    },
    {
      pertanyaan: 'Kenapa PPh 21 bulan THR lebih besar?',
      jawaban:
        'Di bulan THR, gaji dan THR dijumlahkan sehingga bruto bulan itu naik dan tarif TER-nya ikut naik. Kelebihannya diperhitungkan saat pajak setahun dihitung ulang di Desember.',
    },
    {
      pertanyaan: 'Siapa yang menentukan status PTKP-ku di kantor?',
      jawaban:
        'Kantor memakai data yang kamu laporkan, biasanya lewat formulir saat masuk kerja. Laporkan perubahan status, misalnya menikah atau punya anak, supaya tahun pajak berikutnya memakai status yang benar.',
    },
  ],
  sumber: [SUMBER.lampiranPp58, SUMBER.pmk168, SUMBER.ptkpDjp, SUMBER.iuranBpjsTk, SUMBER.jp2026],
  seo: {
    keyphrase: 'cara menghitung gaji bersih',
    keyphraseSekunder: ['gaji bersih', 'potongan PPh 21', 'potongan BPJS'],
    judulSEO: 'Cara Menghitung Gaji Bersih 2026: PPh 21 TER dan BPJS',
    metaDeskripsi:
      'Cara menghitung gaji bersih 2026: penghasilan bruto, PPh 21 TER, iuran BPJS karyawan, dan pajak Desember, lengkap dengan contoh gaji Rp5 juta sampai Rp15 juta.',
  },
  tools: ['gaji-bersih'],
  terkait: ['pph-21-ter', 'potongan-bpjs-di-slip-gaji', 'ptkp-2026'],
  sampul: { file: 'cara-menghitung-gaji-bersih.png', kata: 'Gaji bersih', alt: 'Kartu sampul point. bertuliskan Gaji bersih di latar hijau pilar Uang & Karier' },
}
