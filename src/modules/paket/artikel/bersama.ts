import type { SubkategoriPaket, SumberPaket } from '../tipe'

/** Subkategori paket konten awal. Dibuat saat impor bila slug-nya belum ada di pilarnya. */
export const SUB = {
  gajiPajak: { slug: 'gaji-pajak', nama: 'Gaji & Pajak', deskripsi: 'Slip gaji, PPh 21, PTKP, dan lapor SPT Tahunan.' },
  bpjs: { slug: 'bpjs', nama: 'BPJS', deskripsi: 'Iuran dan manfaat BPJS Kesehatan dan BPJS Ketenagakerjaan.' },
  hakPekerja: { slug: 'hak-pekerja', nama: 'Hak Pekerja', deskripsi: 'THR, lembur, cuti, dan hak lain yang diatur undang-undang.' },
  kpr: { slug: 'kpr-kredit', nama: 'KPR & Kredit', deskripsi: 'Cicilan rumah, kendaraan, dan pinjaman: cara hitung dan biayanya.' },
  kuliah: { slug: 'kuliah', nama: 'Kuliah', deskripsi: 'SKS, IPK, dan urusan akademik selama kuliah.' },
  masukPtn: { slug: 'masuk-ptn', nama: 'Masuk PTN', deskripsi: 'SNBP, UTBK-SNBT, dan jalur mandiri ke perguruan tinggi negeri.' },
  beasiswa: { slug: 'beasiswa', nama: 'Beasiswa', deskripsi: 'KIP Kuliah dan beasiswa lain: syarat, cara daftar, dan besarannya.' },
} satisfies Record<string, SubkategoriPaket>

/** Tanggal paket ini diperiksa: semua sumber dibuka dan dicocokkan pada hari yang sama. */
const DIAKSES = '2026-11-10T00:00:00.000Z'

const s = (judul: string, url: string, penerbit: string): SumberPaket => ({ judul, url, penerbit, diaksesPada: DIAKSES })

export const SUMBER = {
  lampiranPp58: s(
    'Lampiran PP 58 Tahun 2023: tarif efektif PPh Pasal 21',
    'https://www.pajak.go.id/sites/default/files/lampiran/Lampiran%20PP58TAHUN2023.pdf',
    'DJP',
  ),
  leafletTer: s('Leaflet PPh 21 dengan tarif efektif rata-rata', 'https://pajak.go.id/sites/default/files/2024-02/Leaflet%20PPh%2021%20TER.pdf', 'DJP'),
  pmk168: s('PMK 168 Tahun 2023 tentang pemotongan pajak atas penghasilan', 'https://peraturan.go.id/files/permenkeu-no-168-tahun-2023.pdf', 'Kementerian Keuangan'),
  ptkpDjp: s('Penghasilan Tidak Kena Pajak', 'https://pajak.go.id/penghasilan-tidak-kena-pajak', 'DJP'),
  pasal17: s('Memotret Keberpihakan UU HPP pada Rakyat Kecil', 'https://www.pajak.go.id/id/artikel/memotret-keberpihakan-uu-hpp-pada-rakyat-kecil', 'DJP'),
  ptkp2027: s('Kabar Baik! Batas PTKP Berpotensi Naik pada 2027', 'https://nasional.kontan.co.id/news/kabar-baik-batas-ptkp-berpotensi-naik-pada-2027', 'Kontan'),
  iuranBpjsTk: s(
    'Berapa Besaran Iuran JHT, JKK, JKM, JP dan JKP?',
    'https://www.bpjsketenagakerjaan.go.id/artikel/18913/artikel-berapa-besaran-iuran-jht,-jkk,-jkm,-jp-dan-jkp',
    'BPJS Ketenagakerjaan',
  ),
  jp2026: s(
    'Surat B/1226/022026: Ketentuan Batas Upah dan Manfaat Jaminan Pensiun Tahun 2026',
    'https://494075.fs1.hubspotusercontent-na1.net/hubfs/494075/compliance-portal/notification-number-b1226022026.pdf',
    'BPJS Ketenagakerjaan',
  ),
  perpres64: s(
    'Perpres 64 Tahun 2020 tentang Jaminan Kesehatan',
    'https://jdih.kemenkeu.go.id/download/179608f7-a2a0-41c0-aaec-e7d60eb36054/64TAHUN2020PERPRES.pdf',
    'JDIH Kementerian Keuangan',
  ),
  iuranBpjsKes2026: s(
    'Cek Iuran Semua Kelas BPJS Kesehatan Oktober 2026',
    'https://www.metrotvnews.com/read/KYVC0xMZ-cek-iuran-semua-kelas-bpjs-kesehatan-oktober-2026',
    'Metro TV',
  ),
  permenaker6: s('Permenaker Nomor 6 Tahun 2016 tentang THR Keagamaan', 'https://peraturan.bpk.go.id/Download/252116/Kemnaker%20No.%206%20Tahun%202016.pdf', 'JDIH BPK'),
  seThr2026: s(
    'Surat Edaran Menaker Nomor M/3/HK.04.00/III/2026',
    'https://jdih.kemnaker.go.id/peraturan/detail/2983/surat-edaran-menteri-nomor-m-3-hk-04-00-iii-2026',
    'Kementerian Ketenagakerjaan',
  ),
  libur2027: s(
    'Inilah SKB 3 Menteri Libur Nasional dan Cuti Bersama 2027',
    'https://setneg.go.id/baca/index/inilah_skb_3_menteri_libur_nasional_dan_cuti_bersama_2027',
    'Kementerian Sekretariat Negara',
  ),
  uu27Antara: s(
    'UU Pelindungan Ketenagakerjaan resmi berlaku sejak 28 Oktober 2026',
    'https://sultra.antaranews.com/berita/545839/uu-pelindungan-ketenagakerjaan-resmi-berlaku-sejak-28-oktober-2026',
    'ANTARA',
  ),
  uu27Cnbc: s(
    'UU Pelindungan Ketenagakerjaan Terbit, Ada Aturan Baru Cuti-Pesangon',
    'https://www.cnbcindonesia.com/entrepreneur/20261107145202-25-783186/uu-pelindungan-ketenagakerjaan-terbit-ada-aturan-baru-cuti-pesangon',
    'CNBC Indonesia',
  ),
  pp35: s('PP Nomor 35 Tahun 2021', 'https://peraturan.bpk.go.id/Details/161904/pp-no-35-tahun-2021', 'JDIH BPK'),
  coretaxDjp: s(
    'Anda Karyawan? Simak Tips Pelaporan SPT Tahunan Perdana di Coretax DJP',
    'https://pajak.go.id/index.php/id/artikel/anda-karyawan-simak-tips-pelaporan-spt-tahunan-perdana-di-coretax-djp',
    'DJP',
  ),
  pengumumanBpa: s(
    'Pengumuman PENG-25/PJ.09/2026: penerbitan bukti potong untuk SPT Tahunan PPh Orang Pribadi',
    'https://pajak.go.id/sites/default/files/2026-03/Imbauan%20Penerbitan%20Bukti%20Potong%20Pajak%20Penghasilan%20dalam%20Rangka%20Pelaporan%20SPT%20Tahunan%20Pajak%20Penghasilan%20Orang%20Pribadi%20melalui%20Coretax%20DJP.pdf',
    'DJP',
  ),
  formatSptCoretax: s('Bentuk SPT Tahunan PPh Orang Pribadi Era Coretax', 'https://ortax.org/bentuk-spt-tahunan-pph-orang-pribadi-era-coretax', 'Ortax'),
  faqSptCoretax: s('FAQ SPT Tahunan: Panduan Coretax untuk Karyawan', 'https://www.gadjian.com/blog/2026/01/14/faq-spt-tahunan-coretax-karyawan/', 'Gadjian'),
  anuitas: s(
    'Bunga Anuitas: Pengertian, Contoh, dan Cara Hitung',
    'https://money.kompas.com/read/2021/09/30/183144426/bunga-anuitas-pengertian-contoh-dan-cara-hitung?page=all',
    'Kompas.com',
  ),
  tipsKprOjk: s('Tips Memilih KPR dari OJK', 'https://momsmoney.kontan.co.id/news/tips-memilih-kpr-dari-ojk', 'Kontan'),
  flpp2026: s(
    'KPR Subsidi Tenor 40 Tahun Resmi Berlaku, Bunga Tetap 5%',
    'https://wartaekonomi.co.id/read618898/kpr-subsidi-tenor-40-tahun-resmi-berlaku-bunga-tetap-5',
    'Warta Ekonomi',
  ),
  sndikti: s(
    'Permendikbud Nomor 3 Tahun 2020 tentang Standar Nasional Pendidikan Tinggi',
    'https://lldikti3.kemdiktisaintek.go.id/wp-content/uploads/2024/07/Permendikbud-No.-3-Tahun-2020-Standar-Nasional-Pendidikan-Tinggi.pdf',
    'LLDIKTI Wilayah III',
  ),
  permen39: s(
    'Permendiktisaintek Nomor 39 Tahun 2025 tentang Penjaminan Mutu Pendidikan Tinggi',
    'https://peraturan.go.id/files/permendiktisaintek-no-39-tahun-2025.pdf',
    'Kementerian Hukum',
  ),
  gradingUgm: s('Grading System', 'https://admission.ugm.ac.id/wp-content/uploads/sites/330/2025/04/Grading-System.pdf', 'Universitas Gadjah Mada'),
  snpmb2026: s(
    'Paparan Informasi SNPMB 2026 untuk Peluncuran',
    'https://files.snpmb.id/web2026/Paparan%20Informasi%20SNPMB%202026%20untuk%20Peluncuran.pdf',
    'Panitia SNPMB',
  ),
  informasiSnbp2026: s('Papan Informasi SNBP 2026', 'https://asset.uinjkt.ac.id/uploads/fmXyXwZY/2025/10/papan-informasi-snbp-2026.pdf', 'UIN Syarif Hidayatullah Jakarta'),
  skorUtbk: s(
    'Tak Bisa Jawab Soal UTBK, Lebih Baik Diisi atau Dikosongkan?',
    'https://www.idntimes.com/life/education/tak-bisa-jawab-soal-utbk-lebih-baik-diisi-atau-dikosongkan-01-7cxy7-fy01ww',
    'IDN Times',
  ),
  tka2026: s('Simak Jadwal Pelaksanaan TKA SMA 2026', 'https://news.detik.com/berita/d-8538784/simak-jadwal-pelaksanaan-tka-sma-2026', 'detikNews'),
  kipBesaran2026: s(
    'Update: Inilah Besaran Uang KIP Kuliah 2026 per Semester yang Diterima Mahasiswa',
    'https://katadata.co.id/lifestyle/varia/6a47a63f9fea1/update-inilah-besaran-uang-kip-kuliah-2026-per-semester-yang-diterima-mahasiswa',
    'Katadata',
  ),
  kipPanduanKampus: s(
    'Panduan Pendaftaran KIP Kuliah 2026',
    'https://www.dinamika.ac.id/wp-content/uploads/2026/06/PANDUAN-PENDAFTARAN-KIP-KULIAH-2026.pdf',
    'Universitas Dinamika',
  ),
  kipPengumumanKampus: s(
    'Pengumuman Pendaftaran KIP Kuliah 2026',
    'https://uinsatu.ac.id/wp-content/uploads/2026/09/4449_Pengumuman-Pendaftaran-KIP-Kuliah-2026.pdf',
    'UIN Sayyid Ali Rahmatullah Tulungagung',
  ),
} satisfies Record<string, SumberPaket>
