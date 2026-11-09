import type { ArtikelPaket } from '../tipe'

import { SUB, SUMBER } from './bersama'

export const artikelSptCoretax: ArtikelPaket = {
  slug: 'cara-lapor-spt-tahunan-coretax',
  judul: 'Cara lapor SPT Tahunan karyawan di Coretax, langkah demi langkah',
  tipe: 'panduan',
  pilar: 'uang-karier',
  subkategori: SUB.gajiPajak,
  deck: 'SPT Tahunan tahun pajak 2026 dilaporkan lewat Coretax paling lambat 31 Maret 2027. Untuk karyawan dengan satu kantor, sebagian besar isinya sudah terisi dari bukti potong.',
  intinya: [
    'Lapor SPT Tahunan tahun pajak 2026 dibuka Januari dan ditutup 31 Maret 2027. Terlambat kena denda Rp100.000.',
    'Di Coretax hanya ada satu formulir SPT orang pribadi. Formulir 1770 S dan 1770 SS tidak dipakai lagi.',
    'Bukti potong BPA1 dari kantor otomatis masuk akun Coretax-mu dan mengisi bagian penghasilan serta kredit pajak.',
  ],
  isi: `Cara lapor SPT Tahunan karyawan di Coretax terdiri dari empat tahap: siapkan akun, buat konsep SPT, periksa isian yang sudah terisi otomatis, lalu tanda tangani dan kirim. Untuk tahun pajak 2026, batasnya **31 Maret 2027**. Panduan ini untuk karyawan dengan satu pemberi kerja dan tanpa usaha sampingan.

## Yang berubah di Coretax

- **Satu formulir untuk semua.** Formulir 1770, 1770 S, dan 1770 SS tidak dibedakan lagi. Coretax menampilkan bagian yang relevan sesuai jawabanmu di formulir induk.
- **NIK menjadi NPWP.** Kamu masuk dengan NIK 16 digit.
- **Bukti potong otomatis.** Bukti potong PPh 21 tahunan dari kantor, sekarang disebut BPA1, tersimpan di akunmu dan mengisi SPT secara otomatis.

## Tahap 1: siapkan akun

1. Masuk ke coretaxdjp.pajak.go.id dengan NIK dan kata sandi. Kalau belum pernah, aktivasi akun dulu dan verifikasi email serta nomor ponselmu.
2. Buat **kode otorisasi DJP**. Kode ini menjadi tanda tangan elektronik SPT-mu, jadi simpan passphrase-nya.
3. Cek data keluarga di Portal Saya, Profil Saya, Unit Pajak Keluarga. Data ini menentukan status PTKP di SPT.

Bagian keluarga penting karena PTKP diambil dari sana. Kalau kamu belum yakin statusmu, baca dulu [daftar PTKP 2026](/ptkp-2026).

## Tahap 2: cek bukti potong BPA1

Buka Portal Saya, lalu Dokumen Saya. Unduh BPA1 dari kantormu dan periksa angkanya:

- Penghasilan bruto setahun.
- Penghasilan neto setahun.
- PPh 21 yang sudah dipotong setahun.

Angka PPh 21 di BPA1 adalah total potongan bulananmu ditambah penyesuaian Desember. Kalau kamu ingin memahami asal angka itu, lihat [panduan menghitung gaji bersih](/cara-menghitung-gaji-bersih) dan [penjelasan PPh 21 TER](/pph-21-ter).

> [!peringatan] BPA1 belum muncul?
> Tanyakan ke HR apakah bukti potong Desember sudah diterbitkan lewat Coretax. Bukti potong dari aplikasi lain berisiko kreditnya tidak diakui. Bila terpaksa melapor dengan formulir lama, DJP menyarankan pembetulan SPT setelah BPA1 terbit.

## Tahap 3: buat dan isi konsep SPT

1. Buka menu Surat Pemberitahuan (SPT), lalu klik Buat Konsep SPT.
2. Pilih PPh Orang Pribadi, SPT Tahunan, periode Januari sampai Desember 2026, model Normal.
3. Klik ikon pensil untuk mulai mengisi.
4. Di formulir induk, centang sumber penghasilan Pekerjaan. Jawab Ya untuk penghasilan dari pekerjaan dalam negeri dan untuk pajak yang dipotong pihak lain.
5. Periksa lampiran penghasilan neto dari pekerjaan dan daftar bukti potong. Untuk satu pemberi kerja, angkanya terisi dari BPA1.
6. Isi daftar harta dan utang per 31 Desember 2026: rekening, kendaraan, rumah, dan pinjaman seperti KPR. Bagian ini tidak terisi otomatis.

## Tahap 4: cek status, tanda tangan, kirim

Coretax menghitung sendiri statusnya:

Tabel: Status SPT dan artinya
| Status | Artinya | Yang perlu kamu lakukan |
|---|---|---|
| Nihil | Pajak setahun sama dengan yang sudah dipotong | Langsung tanda tangan dan kirim |
| Kurang bayar | Pajak setahun lebih besar dari yang dipotong | Bayar dengan kode billing, lalu kirim |
| Lebih bayar | Pajak yang dipotong lebih besar | Kirim, lalu tunggu proses dari kantor pajak |

Karyawan dengan satu kantor dan tanpa penghasilan lain biasanya berstatus nihil. Setelah itu centang pernyataan, pilih tanda tangan dengan kode otorisasi DJP, masukkan passphrase, dan kirim. Unduh **Bukti Penerimaan Elektronik** sebagai tanda SPT-mu sudah diterima.

## Kalau statusnya tidak nihil

Status kurang bayar sering muncul karena kamu punya dua pemberi kerja dalam setahun, misalnya pindah kerja di tengah tahun. Masing-masing kantor memotong pajak seolah-olah hanya mereka yang membayarmu, sehingga potongan setahunnya kurang.

Status lebih bayar perlu dicek ulang. Kalau ternyata kantor memotong terlalu banyak, aturan mewajibkan kantor mengembalikan kelebihannya paling lambat akhir bulan berikutnya setelah masa pajak terakhir. Bicarakan dengan HR sebelum mengirim SPT.

## Kalau ada yang salah setelah dikirim

Kamu boleh membetulkan SPT selama kantor pajak belum memulai pemeriksaan. Caranya, buat konsep SPT baru untuk tahun pajak yang sama dengan model pembetulan, perbaiki bagian yang salah, lalu kirim lagi. Kesalahan yang sering dibetulkan:

- BPA1 dari kantor kedua belum dimasukkan.
- Harta atau utang lupa dicantumkan.
- Data keluarga belum diperbarui, sehingga PTKP keliru.

## Batas waktu dan denda

SPT Tahunan orang pribadi wajib disampaikan paling lambat tiga bulan setelah tahun pajak berakhir. Untuk tahun pajak 2026, batasnya 31 Maret 2027. Terlambat lapor dikenai denda administrasi Rp100.000.

Karyawan yang penghasilan netonya setahun tidak lebih dari PTKP tidak wajib menyampaikan SPT Tahunan. Kalau penghasilanmu di atas PTKP, tetap lapor walaupun pajaknya sudah dipotong kantor.

## Contoh daftar harta dan utang

Tabel: Contoh isian harta dan utang per 31 Desember 2026
| Jenis | Keterangan | Nilai yang dilaporkan |
|---|---|---|
| Kas dan setara kas | Tabungan di bank | Saldo per 31 Desember |
| Harta bergerak | Sepeda motor, tahun beli 2023 | Harga perolehan |
| Harta tidak bergerak | Rumah, dibeli dengan KPR | Harga perolehan |
| Investasi | Reksa dana | Harga perolehan |
| Utang | Sisa pokok KPR | Saldo pinjaman per 31 Desember |

Harta dilaporkan sebesar harga perolehan, kecuali kas dan tabungan yang memakai saldo akhir tahun. Utang dilaporkan sebesar sisa pokoknya.

## Siapkan sebelum Januari

- Pastikan data keluarga di Coretax sudah benar.
- Kumpulkan saldo rekening dan sisa pinjaman per 31 Desember.
- Simpan bukti pembayaran zakat lewat lembaga resmi bila ada, karena bisa mengurangi penghasilan neto.

Iuran BPJS yang dipotong dari gajimu sudah ikut diperhitungkan di BPA1. Rinciannya ada di [panduan potongan BPJS](/potongan-bpjs-di-slip-gaji).`,
  faq: [
    {
      pertanyaan: 'Kapan batas lapor SPT Tahunan karyawan untuk tahun pajak 2026?',
      jawaban: 'Paling lambat 31 Maret 2027. Terlambat menyampaikan SPT Tahunan orang pribadi dikenai denda Rp100.000.',
    },
    {
      pertanyaan: 'Apakah masih ada formulir 1770 S di Coretax?',
      jawaban:
        'Tidak. Di Coretax hanya ada satu formulir SPT Tahunan orang pribadi. Bagian yang perlu diisi muncul sesuai jawabanmu di formulir induk.',
    },
    {
      pertanyaan: 'Gajiku sudah dipotong pajak. Kenapa tetap harus lapor SPT?',
      jawaban:
        'Pemotongan oleh kantor dan pelaporan SPT adalah dua kewajiban yang berbeda. SPT menjadi laporanmu sendiri tentang penghasilan, harta, dan pajak setahun. Yang dikecualikan hanya yang penghasilan netonya tidak melebihi PTKP.',
    },
    {
      pertanyaan: 'Bagaimana kalau aku pindah kerja di tengah tahun?',
      jawaban:
        'Kamu akan punya dua BPA1. Pastikan keduanya masuk daftar bukti potong di SPT. Status SPT-mu kemungkinan kurang bayar, karena setiap kantor menghitung pajak seolah-olah hanya mereka yang membayarmu.',
    },
  ],
  sumber: [SUMBER.coretaxDjp, SUMBER.pengumumanBpa, SUMBER.formatSptCoretax, SUMBER.faqSptCoretax],
  seo: {
    keyphrase: 'lapor SPT Tahunan',
    keyphraseSekunder: ['SPT Tahunan Coretax', 'BPA1', 'SPT karyawan'],
    judulSEO: 'Cara Lapor SPT Tahunan Karyawan di Coretax untuk Pajak 2026',
    metaDeskripsi:
      'Cara lapor SPT Tahunan karyawan di Coretax untuk tahun pajak 2026: aktivasi akun, cek BPA1, isi konsep SPT, status nihil atau kurang bayar, batas 31 Maret 2027.',
  },
  tools: ['gaji-bersih'],
  terkait: ['ptkp-2026', 'cara-menghitung-gaji-bersih', 'pph-21-ter'],
  sampul: { file: 'cara-lapor-spt-tahunan-coretax.png', kata: 'SPT Tahunan', alt: 'Kartu sampul point. bertuliskan SPT Tahunan di latar hijau pilar Uang & Karier' },
}
