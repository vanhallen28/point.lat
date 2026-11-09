import type { ArtikelPaket } from '../tipe'

import { SUB, SUMBER } from './bersama'

export const artikelPph21Ter: ArtikelPaket = {
  slug: 'pph-21-ter',
  judul: 'PPh 21 TER: cara membaca kategori A, B, C dan tarifnya',
  tipe: 'explainer',
  pilar: 'uang-karier',
  subkategori: SUB.gajiPajak,
  deck: 'TER membuat potongan pajak bulanan cukup dihitung dengan satu perkalian. Ini cara memilih kategori dan membaca tabelnya, plus kenapa Desember tetap dihitung ulang.',
  intinya: [
    'PPh 21 TER = penghasilan bruto sebulan x tarif efektif bulanan dari tabel PP 58 Tahun 2023.',
    'Kategori A untuk TK/0, TK/1, dan K/0; kategori B untuk TK/2, TK/3, K/1, dan K/2; kategori C untuk K/3.',
    'TER dipakai Januari sampai November. Desember dihitung ulang setahun dengan tarif Pasal 17.',
  ],
  isi: `PPh 21 TER adalah cara memotong pajak gaji bulanan pegawai tetap dengan tarif efektif rata-rata. Aturannya PP 58 Tahun 2023 dan PMK 168 Tahun 2023, berlaku sejak Januari 2024. Kantor cukup mengalikan penghasilan bruto sebulan dengan satu persentase dari tabel.

Dulu kantor harus menyetahunkan gaji setiap bulan, mengurangi biaya jabatan dan PTKP, lalu membaginya lagi. TER memangkas semua itu menjadi satu perkalian.

## Rumusnya

PPh 21 bulanan = penghasilan bruto sebulan x TER.

Penghasilan bruto mencakup gaji, tunjangan tetap dan tidak tetap, lembur, serta premi JKK, JKM, dan iuran BPJS Kesehatan yang dibayar kantor. Bonus dan THR juga masuk bruto di bulan dibayarnya.

## Langkah 1: tentukan kategori dari status PTKP

Tabel: Kategori TER menurut status PTKP
| Kategori | Status PTKP | PTKP setahun |
|---|---|---|
| A | TK/0, TK/1, K/0 | Rp54.000.000 sampai Rp58.500.000 |
| B | TK/2, TK/3, K/1, K/2 | Rp63.000.000 sampai Rp67.500.000 |
| C | K/3 | Rp72.000.000 |

Pengelompokan ini mengikuti besar PTKP. Status yang PTKP-nya mirip masuk kategori yang sama, sehingga cukup tiga tabel. Cara menentukan statusmu ada di [artikel PTKP 2026](/ptkp-2026).

## Langkah 2: cari baris yang sesuai bruto

Setiap kategori punya puluhan baris, dari 0% sampai 34%. Ini potongan awal tabel kategori A:

Tabel: Potongan tabel TER kategori A (PP 58 Tahun 2023)
| Bruto sebulan | TER |
|---|---|
| Sampai Rp5.400.000 | 0% |
| Di atas Rp5.400.000 sampai Rp5.650.000 | 0,25% |
| Di atas Rp5.650.000 sampai Rp5.950.000 | 0,5% |
| Di atas Rp5.950.000 sampai Rp6.300.000 | 0,75% |
| Di atas Rp6.300.000 sampai Rp6.750.000 | 1% |
| Di atas Rp6.750.000 sampai Rp7.500.000 | 1,25% |
| Di atas Rp7.500.000 sampai Rp8.550.000 | 1,5% |

Batas 0% berbeda untuk tiap kategori: Rp5.400.000 untuk A, Rp6.200.000 untuk B, dan Rp6.600.000 untuk C. Tabel lengkapnya ada di lampiran PP 58 Tahun 2023 di bagian sumber.

## Contoh membaca tabel

Gaji Rp6.500.000, status TK/0, ikut BPJS Kesehatan dan BPJS Ketenagakerjaan:

1. Bruto: gaji Rp6.500.000 ditambah premi dan iuran dari kantor, total Rp6.795.100.
2. Status TK/0 berarti kategori A.
3. Rp6.795.100 ada di baris "di atas Rp6.750.000 sampai Rp7.500.000", jadi TER 1,25%.
4. PPh 21 sebulan: 1,25% x Rp6.795.100 = Rp84.938. Angka yang sama keluar di [kalkulator gaji bersih](/tools/gaji-bersih).

Perhatikan langkah 3. Kalau kamu memakai gaji Rp6.500.000 saja, baris yang terpilih adalah 1% dan potongannya terlihat lebih kecil. Kesalahan ini sering membuat orang mengira slip gajinya keliru. Langkah lengkap dari bruto sampai gaji yang masuk rekening ada di [panduan menghitung gaji bersih](/cara-menghitung-gaji-bersih).

## Contoh kategori B

Gaji Rp8.000.000 dengan status K/1, ikut BPJS. Brutonya Rp8.363.200. Status K/1 masuk kategori B, dan bruto itu ada di baris "di atas Rp7.300.000 sampai Rp9.200.000" dengan TER 1%. PPh 21 sebulannya Rp83.632.

Bandingkan dengan gaji yang sama berstatus TK/0. Kategori A untuk bruto Rp8.363.200 adalah 1,5%, sehingga potongannya Rp125.448. Selisihnya datang dari PTKP K/1 yang lebih besar Rp9.000.000 setahun.

## Kenapa Desember berbeda

TER sengaja dibuat sedikit kasar supaya mudah. Agar pajak setahunnya tetap tepat, masa pajak Desember (atau bulan terakhir kamu bekerja) dihitung ulang dengan cara lama:

- Bruto setahun dikurangi biaya jabatan 5%, paling banyak Rp6.000.000.
- Dikurangi iuran JHT dan JP yang kamu bayar.
- Dikurangi PTKP, lalu dikenai tarif Pasal 17: 5% sampai Rp60 juta, 15% sampai Rp250 juta, 25% sampai Rp500 juta, 30% sampai Rp5 miliar, dan 35% di atasnya.

PPh 21 Desember adalah pajak setahun dikurangi potongan Januari sampai November. Bisa lebih besar dari bulan biasa, bisa juga minus. Kalau minus, kantor mengembalikan kelebihannya.

## Bulan THR dan bonus

Di bulan THR, gaji dan THR dijumlahkan dulu, baru dicari TER-nya. Bruto yang lebih besar jatuh di baris yang tarifnya lebih tinggi, sehingga potongan bulan itu melonjak. Ini bukan pajak tambahan. Selisihnya ikut diperhitungkan di Desember. Contoh angkanya ada di [panduan menghitung THR](/cara-menghitung-thr).

> [!tips] Cek cepat slip gajimu
> Jumlahkan semua komponen penghasilan di slip, tambahkan premi JKK, JKM, dan BPJS Kesehatan bagian kantor, lalu cocokkan barisnya di tabel kategori statusmu. Atau masukkan angkanya ke kalkulator gaji bersih point.

## TER 0% bukan berarti bebas pajak

Gaji Rp5.000.000 berstatus TK/0 dan ikut BPJS menghasilkan bruto Rp5.227.000. Angka ini di bawah Rp5.400.000, jadi TER-nya 0% dan tidak ada potongan setiap bulan.

Tetapi bruto setahunnya Rp62.724.000. Setelah dikurangi biaya jabatan, iuran JHT dan JP, serta PTKP, masih ada penghasilan kena pajak Rp3.787.000. Pajaknya 5%, yaitu Rp189.350, dan semuanya dipotong di bulan Desember. Jadi jangan kaget kalau gaji Desember lebih kecil walau sebelas bulan sebelumnya tidak ada potongan.

## Siapa yang tidak memakai TER

TER bulanan untuk pegawai tetap dan pensiunan berkala. Pegawai tidak tetap yang dibayar harian memakai TER harian, sedangkan peserta kegiatan, tenaga ahli, dan penerima pesangon memakai cara lain yang diatur PMK 168 Tahun 2023.`,
  faq: [
    {
      pertanyaan: 'Apakah TER membuat pajakku naik?',
      jawaban:
        'Tidak. TER hanya mengubah cara memotong pajak setiap bulan. Pajak setahunnya tetap dihitung dengan tarif Pasal 17 di bulan Desember, jadi bebannya sama dengan cara lama.',
    },
    {
      pertanyaan: 'Kenapa potonganku di bulan THR besar sekali?',
      jawaban:
        'Karena gaji dan THR dijumlahkan sehingga bruto bulan itu masuk baris TER yang lebih tinggi. Kelebihan potong itu diperhitungkan saat pajak setahun dihitung ulang di Desember.',
    },
    {
      pertanyaan: 'Aku menikah bulan Juni. Kapan kategoriku berubah?',
      jawaban: 'Status PTKP mengikuti keadaanmu pada awal tahun pajak, jadi perubahannya berlaku mulai Januari tahun berikutnya.',
    },
  ],
  sumber: [SUMBER.lampiranPp58, SUMBER.leafletTer, SUMBER.pmk168, SUMBER.pasal17],
  seo: {
    keyphrase: 'PPh 21 TER',
    keyphraseSekunder: ['tarif efektif rata-rata', 'kategori TER'],
    judulSEO: 'PPh 21 TER: Kategori A, B, C dan Cara Membaca Tabelnya',
    metaDeskripsi:
      'PPh 21 TER dijelaskan dari intinya: cara memilih kategori A, B, atau C, membaca tabel tarif PP 58/2023, contoh hitung, dan kenapa pajak Desember berbeda.',
  },
  tools: ['gaji-bersih'],
  terkait: ['cara-menghitung-gaji-bersih', 'ptkp-2026', 'cara-menghitung-thr'],
  sampul: { file: 'pph-21-ter.png', kata: 'PPh 21 TER', alt: 'Kartu sampul point. bertuliskan PPh 21 TER di latar hijau pilar Uang & Karier' },
}
