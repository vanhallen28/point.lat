import type { ArtikelPaket } from '../tipe'

import { SUB, SUMBER } from './bersama'

export const artikelKpr: ArtikelPaket = {
  slug: 'cara-menghitung-cicilan-kpr',
  judul: 'Cara menghitung cicilan KPR: anuitas, bunga tetap, dan biaya lain',
  tipe: 'panduan',
  pilar: 'uang-karier',
  subkategori: SUB.kpr,
  deck: 'Cicilan KPR ditentukan pokok pinjaman, bunga, dan tenor. Ini rumus anuitas yang dipakai bank, cara membaca masa bunga tetap, dan biaya yang sering terlupa.',
  intinya: [
    'Cicilan KPR anuitas = P x r / (1 - (1 + r) pangkat -n), dengan P pokok, r bunga per bulan, dan n jumlah bulan.',
    'Bunga tetap biasanya hanya beberapa tahun pertama. Setelah itu bunga mengambang dan cicilan bisa naik.',
    'Usahakan semua cicilan tidak lebih dari 30% penghasilan, dan siapkan biaya awal di luar uang muka.',
  ],
  isi: `Cicilan KPR yang ditawarkan bank hampir selalu memakai bunga anuitas: cicilan sama setiap bulan, porsi bunga besar di awal, lalu porsi pokok makin besar. Untuk menghitungnya kamu butuh tiga angka: pokok pinjaman, bunga per tahun, dan lama cicilan atau tenor.

## Langkah 1: hitung pokok pinjaman

Pokok pinjaman = harga rumah - uang muka.

Rumah Rp450.000.000 dengan uang muka 10% berarti uang muka Rp45.000.000 dan pokok pinjaman Rp405.000.000.

## Langkah 2: pakai rumus anuitas

Cicilan = P x r / (1 - (1 + r) pangkat -n)

- P: pokok pinjaman.
- r: bunga per bulan, yaitu bunga per tahun dibagi 12. Bunga 7,5% per tahun berarti 0,625% per bulan.
- n: jumlah bulan. Tenor 20 tahun berarti 240 bulan.

Untuk pokok Rp405.000.000, bunga 7,5%, tenor 20 tahun, cicilannya Rp3.262.652 per bulan. Di bulan pertama, Rp2.531.250 di antaranya bunga dan hanya Rp731.402 yang mengurangi pokok.

Kamu tidak perlu menghitung pangkatnya dengan tangan. Masukkan angkamu ke kalkulator ini:

[[tool:cicilan-kpr]]

## Tenor dan bunga mengubah total yang kamu bayar

Tabel: Pokok Rp405.000.000, bunga anuitas tetap sepanjang tenor
| Bunga per tahun | Tenor | Cicilan per bulan | Total bunga |
|---|---|---|---|
| 7,5% | 15 tahun | Rp3.754.400 | Rp270.792.000 |
| 7,5% | 20 tahun | Rp3.262.652 | Rp378.036.480 |
| 10,5% | 20 tahun | Rp4.043.439 | Rp565.425.360 |

Tenor lebih panjang membuat cicilan lebih ringan, tetapi total bunganya jauh lebih besar. Selisih tiga persen bunga di tenor 20 tahun menambah cicilan sekitar Rp780.000 sebulan.

## Bunga tetap, lalu mengambang

Promosi KPR biasanya menawarkan bunga tetap selama 1 sampai 5 tahun pertama. Setelah masa itu bunganya mengambang, mengikuti suku bunga pasar. Banyak bank memakai suku bunga dasar kredit (SBDK) yang diumumkan setiap bank dan bisa dicek di situs OJK atau situs bank.

Cara memperkirakan cicilan setelah masa bunga tetap:

1. Tanyakan ke bank kisaran bunga mengambang KPR mereka saat ini.
2. Hitung ulang di [kalkulator cicilan KPR](/tools/cicilan-kpr) dengan sisa pokok dan sisa tenor, memakai bunga itu.
3. Pastikan cicilan baru itu masih muat di anggaranmu.

Contoh tabel di atas menunjukkan risikonya. Kalau bunga naik dari 7,5% ke 10,5%, cicilan untuk pokok yang sama naik sekitar 24%.

## Hati-hati dengan bunga flat

Kredit kendaraan dan pinjaman tanpa agunan sering memakai bunga flat: bunga selalu dihitung dari pokok awal. Dengan angka bunga yang sama, flat jauh lebih mahal. Pokok Rp405.000.000, bunga flat 7,5%, tenor 20 tahun menghasilkan cicilan Rp4.218.750 dan total bunga Rp607.500.000. Bandingkan dengan anuitas yang total bunganya Rp378.036.480.

## Biaya di luar uang muka

Saat akad, siapkan juga:

- Provisi dan biaya administrasi bank.
- Biaya appraisal atau penilaian rumah.
- Asuransi jiwa dan asuransi kebakaran selama tenor.
- Biaya notaris atau PPAT untuk akta jual beli dan hak tanggungan.
- BPHTB, pajak pembeli yang tarifnya ditetapkan pemerintah daerah.

Jumlahnya bisa mencapai beberapa persen dari harga rumah. Tanyakan rinciannya tertulis sebelum tanda tangan. Setelah akad, sisa pokok KPR kamu laporkan sebagai utang setiap kali [lapor SPT Tahunan](/cara-lapor-spt-tahunan-coretax).

## Berapa cicilan yang aman

Panduan OJK menyarankan cicilan tidak lebih dari 30% dari total penghasilan. Hitung semua cicilan, bukan hanya KPR. Kalau gaji bersihmu Rp12.000.000, total cicilan sebaiknya di bawah Rp3.600.000. Cara menghitung gaji bersih yang benar ada di [panduan gaji bersih](/cara-menghitung-gaji-bersih).

Hitungan sebaliknya juga berguna. Cicilan Rp3.600.000 dengan bunga tetap 7,5% selama 20 tahun cukup untuk pokok pinjaman sekitar Rp446 juta. Dengan uang muka 10%, itu setara rumah seharga sekitar Rp496 juta. Kalau bunga naik setelah masa promosi, batas itu turun, jadi beri ruang aman.

Sebelum akad, pastikan [dana darurat](/dana-darurat) tetap ada. Uang muka yang menguras seluruh tabungan membuatmu rentan saat penghasilan terganggu. Kalkulator [dana darurat](/tools/dana-darurat) membantu menentukan targetnya.

## Dokumen yang biasanya diminta bank

- KTP, kartu keluarga, dan surat nikah bila sudah menikah.
- NPWP atau NIK yang sudah terdaftar sebagai NPWP.
- Slip gaji tiga bulan terakhir dan surat keterangan kerja.
- Rekening koran tiga sampai enam bulan terakhir.
- Dokumen rumah dari penjual atau pengembang, misalnya salinan sertifikat dan PBG.

Pekerja lepas biasanya diminta rekening koran lebih panjang dan bukti penghasilan lain, seperti kontrak kerja atau SPT Tahunan.

## Bagaimana dengan KPR subsidi

KPR subsidi FLPP untuk masyarakat berpenghasilan rendah memakai bunga tetap 5% sepanjang tenor untuk rumah tapak. Sejak Juni 2026 tenornya bisa sampai 40 tahun. Rumah Rp185.000.000 dengan uang muka 1% dan tenor 20 tahun, misalnya, cicilannya Rp1.208.709 per bulan. Syarat penghasilan dan harga rumahnya diatur pemerintah dan berbeda menurut wilayah, jadi cek ke bank penyalur sebelum mengajukan.`,
  faq: [
    {
      pertanyaan: 'Apa itu bunga anuitas?',
      jawaban:
        'Bunga anuitas dihitung dari sisa pokok, dengan cicilan yang dibuat sama setiap bulan. Di awal tenor sebagian besar cicilan untuk bunga, lalu porsi pokok makin besar.',
    },
    {
      pertanyaan: 'Lebih baik tenor pendek atau panjang?',
      jawaban:
        'Tenor panjang membuat cicilan ringan tetapi total bunganya besar. Pilih tenor terpendek yang cicilannya masih di bawah 30% penghasilanmu dan tidak menghabiskan dana darurat.',
    },
    {
      pertanyaan: 'Apakah boleh melunasi KPR lebih cepat?',
      jawaban:
        'Biasanya boleh, tetapi banyak bank mengenakan penalti pelunasan dipercepat, terutama selama masa bunga tetap. Tanyakan besarnya sebelum akad.',
    },
  ],
  sumber: [SUMBER.anuitas, SUMBER.tipsKprOjk, SUMBER.flpp2026],
  seo: {
    keyphrase: 'cicilan KPR',
    keyphraseSekunder: ['menghitung cicilan KPR', 'bunga anuitas', 'bunga fixed floating'],
    judulSEO: 'Cara Menghitung Cicilan KPR: Rumus Anuitas dan Contohnya',
    metaDeskripsi:
      'Cara menghitung cicilan KPR dengan rumus anuitas, pengaruh tenor dan bunga mengambang, bahaya bunga flat, biaya akad, dan batas cicilan aman 30% penghasilan.',
  },
  tools: ['cicilan-kpr', 'dana-darurat'],
  terkait: ['dana-darurat', 'cara-menghitung-gaji-bersih', 'cara-lapor-spt-tahunan-coretax'],
  sampul: { file: 'cara-menghitung-cicilan-kpr.png', kata: 'KPR', alt: 'Kartu sampul point. bertuliskan KPR di latar hijau pilar Uang & Karier' },
}
