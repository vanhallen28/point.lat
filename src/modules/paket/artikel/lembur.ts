import type { ArtikelPaket } from '../tipe'

import { SUB, SUMBER } from './bersama'

export const artikelLembur: ArtikelPaket = {
  slug: 'cara-menghitung-upah-lembur',
  judul: 'Cara menghitung upah lembur karyawan menurut aturan terbaru',
  tipe: 'panduan',
  pilar: 'uang-karier',
  subkategori: SUB.hakPekerja,
  deck: 'Upah lembur per jam adalah 1/173 dari upah sebulan, lalu dikali 1,5 sampai 4 tergantung jam dan harinya. Ini rumus lengkap dan contohnya.',
  intinya: [
    'Upah lembur per jam = 1/173 x upah sebulan (upah pokok ditambah tunjangan tetap).',
    'Hari kerja biasa: jam pertama 1,5 kali, jam berikutnya 2 kali upah per jam.',
    'Lembur di hari istirahat atau hari libur resmi dibayar 2 sampai 4 kali, dan batas lembur tetap 4 jam sehari serta 18 jam seminggu.',
  ],
  isi: `Cara menghitung upah lembur dimulai dari satu angka: upah per jam, yaitu upah sebulan dibagi 173. Angka ini lalu dikali pengali sesuai jam ke berapa dan hari apa kamu lembur. Rumusnya ada di PP 35 Tahun 2021, dan UU Nomor 27 Tahun 2026 tentang Pelindungan Ketenagakerjaan memakai pengali dan batas yang sama.

## Syarat lembur yang sah

- Ada perintah lembur dari pengusaha, tertulis atau lewat sistem digital.
- Ada persetujuanmu. Kamu boleh menolak.
- Paling lama 4 jam sehari dan 18 jam seminggu.

Pengusaha juga wajib memberi waktu istirahat yang cukup. Kalau lembur 4 jam atau lebih, pengusaha wajib menyediakan makan dan minum paling sedikit 1.400 kilokalori.

## Langkah 1: cari upah per jam

Upah per jam = 1/173 x upah sebulan.

Upah sebulan adalah upah pokok ditambah tunjangan tetap. Kalau upahmu juga berisi tunjangan tidak tetap dan upah pokok ditambah tunjangan tetap kurang dari 75% dari seluruh upah, PP 35 Tahun 2021 memakai 75% dari seluruh upah sebagai dasar.

Untuk pekerja harian, upah sebulan = upah sehari x 25 (enam hari kerja seminggu) atau x 21 (lima hari kerja seminggu). Kalau upah sebulanmu di bawah upah minimum, dasar perhitungannya upah minimum.

> [!peringatan] Aturan pelaksana UU baru belum terbit
> UU 27 Tahun 2026 menyebut dasar upah lembur adalah upah pokok ditambah tunjangan tetap dibagi 173. Aturan pelaksananya wajib terbit paling lama setahun sejak 28 Oktober 2026. Sampai saat itu PP 35 Tahun 2021 tetap berlaku selama tidak bertentangan, termasuk aturan 75% di atas.

## Langkah 2: kalikan dengan pengali

Tabel: Pengali upah lembur di hari kerja biasa
| Jam lembur | Pengali |
|---|---|
| Jam pertama | 1,5 x upah per jam |
| Jam kedua dan seterusnya | 2 x upah per jam |

Lembur di hari istirahat mingguan atau hari libur resmi punya pengali lebih besar, dan bergantung pola kerjamu:

Tabel: Pengali lembur di hari istirahat dan hari libur resmi
| Pola kerja | 2 x upah per jam | 3 x upah per jam | 4 x upah per jam |
|---|---|---|---|
| 6 hari kerja, 40 jam seminggu | Jam 1 sampai 7 | Jam 8 | Jam 9 sampai 11 |
| 6 hari kerja, libur jatuh di hari kerja terpendek | Jam 1 sampai 5 | Jam 6 | Jam 7 sampai 9 |
| 5 hari kerja, 40 jam seminggu | Jam 1 sampai 8 | Jam 9 | Jam 10 sampai 12 |

## Contoh 1: lembur 3 jam di hari kerja

Upah pokok dan tunjangan tetap Rp5.190.000, jadi upah per jam Rp5.190.000 / 173 = Rp30.000.

1. Jam pertama: 1,5 x Rp30.000 = Rp45.000.
2. Jam kedua dan ketiga: 2 x 2 x Rp30.000 = Rp120.000.
3. Upah lembur hari itu: Rp165.000.

## Contoh 2: masuk 10 jam di hari libur, pola lima hari kerja

Upah per jam tetap Rp30.000.

1. Jam 1 sampai 8: 8 x 2 x Rp30.000 = Rp480.000.
2. Jam 9: 3 x Rp30.000 = Rp90.000.
3. Jam 10: 4 x Rp30.000 = Rp120.000.
4. Total: Rp690.000.

Contoh ini relevan untuk libur panjang Lebaran. Kalau kamu tetap masuk di tanggal merah, upahmu dihitung sebagai lembur hari libur, bukan hari kerja biasa. Hakmu yang lain menjelang Lebaran ada di [panduan menghitung THR](/cara-menghitung-thr).

## Contoh 3: hari libur, pola enam hari kerja

Pekerja dengan enam hari kerja seminggu masuk 9 jam di hari libur resmi. Upah per jam Rp30.000.

1. Jam 1 sampai 7: 7 x 2 x Rp30.000 = Rp420.000.
2. Jam 8: 3 x Rp30.000 = Rp90.000.
3. Jam 9: 4 x Rp30.000 = Rp120.000.
4. Total: Rp630.000.

## Contoh 4: aturan 75%

Upah pokok Rp3.000.000, tunjangan tetap Rp500.000, dan tunjangan tidak tetap Rp1.500.000. Seluruh upah Rp5.000.000.

1. Upah pokok ditambah tunjangan tetap: Rp3.500.000, atau 70% dari seluruh upah.
2. Karena di bawah 75%, dasar lembur memakai 75% x Rp5.000.000 = Rp3.750.000.
3. Upah per jam: Rp3.750.000 / 173 = Rp21.676.

## Lembur ikut kena pajak

Upah lembur menambah penghasilan bruto bulan itu, jadi ikut dipotong PPh 21. Bila lemburnya banyak, bruto bisa masuk baris [tarif PPh 21 TER](/pph-21-ter) yang lebih tinggi. Selisihnya diperhitungkan saat pajak setahun dihitung ulang di Desember. Lembur tidak menjadi dasar iuran BPJS, karena iuran dihitung dari upah pokok dan tunjangan tetap.

Untuk melihat gaji bersih bulan biasa tanpa lembur, gunakan [kalkulator gaji bersih](/tools/gaji-bersih).

## Siapa yang tidak dapat upah lembur

Aturan memberi pengecualian untuk pekerja dengan jabatan tertentu, misalnya pemimpin atau pengendali yang waktu kerjanya tidak bisa dibatasi, asalkan upahnya lebih tinggi dan hal itu tertulis di perjanjian kerja. Selain itu, perusahaan boleh memakai cara hitung sendiri hanya bila hasilnya lebih menguntungkan pekerja.

## Kalau upah lembur tidak dibayar

1. Kumpulkan bukti: perintah lembur, catatan jam, dan slip gaji bulan itu.
2. Tanyakan ke HR atau atasan secara tertulis. Simpan jawabannya.
3. Bila tidak selesai, minta perundingan bipartit dengan pengusaha. Serikat pekerja bisa mendampingimu.
4. Bila masih buntu, laporkan ke dinas ketenagakerjaan setempat atau pengawas ketenagakerjaan.

Upah lembur adalah upah. Kewajiban membayarnya tidak hilang hanya karena tidak ada di perjanjian kerja.

> [!tips] Catat jam lemburmu sendiri
> Simpan perintah lembur dan catat jam mulai serta selesai setiap kali lembur. Catatan ini memudahkan kamu mencocokkan slip gaji, dan menjadi bukti bila ada selisih.`,
  faq: [
    {
      pertanyaan: 'Berapa upah lembur per jam?',
      jawaban:
        'Upah per jam adalah upah sebulan dibagi 173. Di hari kerja biasa, jam pertama dibayar 1,5 kali dan jam berikutnya 2 kali upah per jam. Dengan upah Rp5.190.000, lembur jam pertama Rp45.000.',
    },
    {
      pertanyaan: 'Apakah boleh menolak lembur?',
      jawaban: 'Boleh. Lembur hanya sah bila ada perintah dari pengusaha dan persetujuan dari pekerja, tertulis atau digital.',
    },
    {
      pertanyaan: 'Apakah aturan lembur berubah karena UU Pelindungan Ketenagakerjaan?',
      jawaban:
        'Pengali dan batasnya sama: 1,5 kali jam pertama, 2 kali jam berikutnya, maksimal 4 jam sehari dan 18 jam seminggu. Aturan pelaksana UU 27 Tahun 2026 masih disusun, jadi PP 35 Tahun 2021 tetap dipakai selama tidak bertentangan.',
    },
  ],
  sumber: [SUMBER.pp35, SUMBER.uu27Cnbc, SUMBER.uu27Antara],
  seo: {
    keyphrase: 'cara menghitung upah lembur',
    keyphraseSekunder: ['upah lembur per jam', 'lembur hari libur', 'rumus lembur 1/173'],
    judulSEO: 'Cara Menghitung Upah Lembur: Rumus 1/173 dan Contohnya',
    metaDeskripsi:
      'Cara menghitung upah lembur karyawan: upah per jam 1/173, pengali hari kerja dan hari libur, aturan 75%, batas jam lembur, dan contoh hitung sesuai UU terbaru.',
  },
  tools: ['gaji-bersih'],
  terkait: ['cara-menghitung-thr', 'cara-menghitung-gaji-bersih', 'potongan-bpjs-di-slip-gaji'],
  sampul: { file: 'cara-menghitung-upah-lembur.png', kata: 'Lembur', alt: 'Kartu sampul point. bertuliskan Lembur di latar hijau pilar Uang & Karier' },
}
