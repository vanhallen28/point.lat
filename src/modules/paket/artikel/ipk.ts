import type { ArtikelPaket } from '../tipe'

import { SUB, SUMBER } from './bersama'

export const artikelIpk: ArtikelPaket = {
  slug: 'cara-menghitung-ipk',
  judul: 'Cara menghitung IPK dan IP semester, plus konversi nilai huruf',
  tipe: 'panduan',
  pilar: 'belajar',
  subkategori: SUB.kuliah,
  deck: 'IPK adalah rata-rata nilai yang dibobot SKS. Ini rumusnya, tabel konversi nilai huruf, cara menggabungkan dengan IPK lama, dan berapa IPK yang dibutuhkan untuk lulus.',
  intinya: [
    'IP semester = jumlah (SKS x angka mutu) dibagi jumlah SKS semester itu. IPK memakai rumus yang sama untuk semua semester.',
    'A setara 4, B 3, C 2, D 1, E 0. Nilai antara seperti A- dan B+ ditentukan kampusmu.',
    'Syarat lulus diploma dan sarjana minimal IPK 2,00. Predikat seperti cum laude kini ditentukan masing-masing kampus.',
  ],
  isi: `Cara menghitung IPK: ubah setiap nilai huruf menjadi angka mutu, kalikan dengan SKS mata kuliahnya, jumlahkan, lalu bagi dengan total SKS. Hasilnya rata-rata tertimbang. Mata kuliah 4 SKS berpengaruh dua kali lebih besar daripada mata kuliah 2 SKS.

## Rumus IP semester dan IPK

- IP semester (IPS) = jumlah (SKS x angka mutu) semester itu / jumlah SKS semester itu.
- IPK = jumlah (SKS x angka mutu) semua mata kuliah yang sudah ditempuh / jumlah SKS yang sudah ditempuh.

Permendiktisaintek Nomor 39 Tahun 2025 menegaskan IPS dan IPK hanya dihitung dari mata kuliah yang dinilai dengan indeks prestasi. Mata kuliah yang hanya dinilai lulus atau tidak lulus, misalnya sebagian kegiatan di luar kelas, tidak ikut dihitung.

## Konversi nilai huruf ke angka mutu

Tabel: Konversi nilai huruf
| Nilai huruf | Angka mutu | Keterangan |
|---|---|---|
| A | 4 | Ditetapkan peraturan menteri |
| A- | 3,7 | Contoh nilai antara, bisa berbeda per kampus |
| B+ | 3,3 | Contoh nilai antara |
| B | 3 | Ditetapkan peraturan menteri |
| B- | 2,7 | Contoh nilai antara |
| C+ | 2,3 | Contoh nilai antara |
| C | 2 | Ditetapkan peraturan menteri |
| D | 1 | Ditetapkan peraturan menteri |
| E | 0 | Ditetapkan peraturan menteri |

Peraturan menteri hanya menetapkan A sampai E dan membolehkan kampus memberi nilai antara. Karena itu angka A- dan B+ bisa berbeda. UGM, misalnya, memakai A- 3,75 dan B+ 3,25. Cek pedoman akademik kampusmu sebelum menghitung.

## Contoh: IP satu semester

Tabel: Contoh KHS satu semester
| Mata kuliah | SKS | Nilai | Mutu (SKS x angka) |
|---|---|---|---|
| Kalkulus | 3 | A | 12 |
| Statistika | 3 | A- | 11,1 |
| Bahasa Inggris | 2 | B+ | 6,6 |
| Pancasila | 2 | B | 6 |
| Algoritma | 3 | A | 12 |
| Basis data | 3 | B+ | 9,9 |
| Praktikum | 4 | A- | 14,8 |

Total mutu 72,4 dan total SKS 20. IP semesternya 72,4 / 20 = 3,62.

Kamu bisa mengisi KHS-mu sendiri di [kalkulator IPK](/tools/ipk), termasuk menggabungkannya dengan IPK sebelumnya:

[[tool:ipk]]

## Menggabungkan dengan IPK lama

Kalau kamu sudah tahu IPK dan total SKS sebelumnya, tidak perlu menghitung ulang semua mata kuliah:

1. Mutu lama = IPK lama x SKS lama. Misalnya 3,25 x 60 = 195.
2. Total mutu = mutu lama + mutu semester ini = 195 + 72,4 = 267,4.
3. IPK baru = total mutu / total SKS = 267,4 / 80 = 3,34.

Perhatikan, IP semester 3,62 hanya menaikkan IPK dari 3,25 ke 3,34. Makin banyak SKS yang sudah kamu tempuh, makin berat menggeser IPK. Semester awal paling menentukan.

## IP yang kamu butuhkan untuk target IPK

Rumusnya kebalikan dari menggabungkan: IP yang dibutuhkan = (target IPK x total SKS setelah semester depan - mutu sekarang) / SKS semester depan.

Lanjutkan contoh tadi: IPK 3,34 dari 80 SKS, mutu 267,4, dan semester depan 20 SKS.

1. Target IPK 3,40: (3,40 x 100 - 267,4) / 20 = 3,63. Masih mungkin.
2. Target IPK 3,50: (3,50 x 100 - 267,4) / 20 = 4,13. Di atas 4, jadi tidak mungkin tercapai dalam satu semester.

Hasil seperti nomor 2 bukan alasan menyerah. Bagi targetmu ke beberapa semester, lalu hitung lagi setiap kali KHS keluar.

## Berapa IPK untuk lulus

Permendiktisaintek 39 Tahun 2025 mengatur syarat minimal:

- Program diploma, sarjana, dan sarjana terapan: IPK paling rendah 2,00.
- Program profesi, magister, dan doktor: IPK paling rendah 3,00.

Predikat kelulusan seperti dengan pujian (cum laude), sangat memuaskan, dan memuaskan sekarang ditetapkan oleh masing-masing kampus. Aturan lama, Permendikbud 3 Tahun 2020, memakai batas IPK di atas 3,50 untuk pujian. Banyak kampus masih memakai batas itu, ditambah syarat lain seperti lulus tepat waktu dan tanpa nilai mengulang.

## Satu SKS itu berapa jam

Satu SKS setara 45 jam belajar per semester, termasuk tatap muka, tugas, dan belajar mandiri. Mata kuliah 3 SKS berarti sekitar 135 jam dalam satu semester, atau sekitar 8 sampai 9 jam per minggu bila semesternya 16 minggu.

## IPK juga dipakai di luar kampus

Banyak beasiswa dan lowongan kerja memasang syarat IPK minimal. Penerima [KIP Kuliah](/kip-kuliah), misalnya, perlu menjaga prestasi akademiknya agar bantuan terus berlanjut.

Kalau kamu masih di SMA, logika yang sama berlaku untuk nilai rapor. Rata-rata rapor semester 1 sampai 5 menentukan peringkatmu di [SNBP 2027](/snbp-2027), sedangkan skor tes menentukan peluangmu di [UTBK-SNBT 2027](/utbk-snbt-2027).

## Kesalahan yang sering terjadi

- Membagi total mutu dengan jumlah mata kuliah, bukan jumlah SKS.
- Memakai konversi nilai antara dari kampus lain.
- Membulatkan IPK lama terlalu jauh sebelum digabung.
- Ikut menghitung mata kuliah lulus atau tidak lulus.

Satu lagi: sebagian kampus memotong IPK ke dua desimal, bukan membulatkan. IPK 3,496 bisa tertulis 3,49 di transkrip. Kalau selisih kecil itu menentukan predikat, tanyakan aturan pembulatan ke bagian akademik.`,
  faq: [
    {
      pertanyaan: 'Apa beda IP dan IPK?',
      jawaban: 'IP atau IPS dihitung dari satu semester. IPK dihitung dari semua mata kuliah yang sudah kamu tempuh sejak semester pertama.',
    },
    {
      pertanyaan: 'Berapa IPK untuk cum laude?',
      jawaban:
        'Sekarang ditentukan masing-masing kampus. Banyak kampus masih memakai batas lama dari Permendikbud 3 Tahun 2020, yaitu IPK di atas 3,50, ditambah syarat lulus tepat waktu.',
    },
    {
      pertanyaan: 'Kalau mengulang mata kuliah, nilai mana yang dipakai?',
      jawaban:
        'Umumnya nilai terbaik atau nilai terakhir, tergantung pedoman akademik kampusmu. SKS mata kuliah itu hanya dihitung sekali dalam IPK.',
    },
  ],
  sumber: [SUMBER.permen39, SUMBER.sndikti, SUMBER.gradingUgm],
  seo: {
    keyphrase: 'cara menghitung IPK',
    keyphraseSekunder: ['rumus IPK', 'IP semester', 'konversi nilai huruf'],
    judulSEO: 'Cara Menghitung IPK dan IP Semester dengan Contoh KHS',
    metaDeskripsi:
      'Cara menghitung IPK dan IP semester dari SKS dan nilai huruf, tabel konversi A sampai E, cara menggabungkan IPK lama, dan IP yang dibutuhkan untuk target.',
  },
  tools: ['ipk'],
  terkait: ['snbp-2027', 'kip-kuliah', 'utbk-snbt-2027'],
  sampul: { file: 'cara-menghitung-ipk.png', kata: 'IPK', alt: 'Kartu sampul point. bertuliskan IPK di latar kuning pilar Belajar' },
}
