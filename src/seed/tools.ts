import type { Payload } from 'payload'

import type { ToolId } from '@/lib/konstanta'
import type { IsiLexical } from '@/lib/lexical'
import { siapkanKalkulator, type Isian } from '@/modules/hitung'
import type { Tool } from '@/payload-types'

import { PARAMETER_AWAL } from './parameter-tools'

/**
 * Enam kalkulator MVP (spesifikasi §3) sebagai draf: ringkasan, bantuan input, penjelasan rumus,
 * contoh hitung, FAQ, dan sumber aturan yang sudah diverifikasi 5 November 2026. Pemilik membaca
 * ulang lalu menerbitkannya dari admin. Angka contoh sama dengan hasil kalkulator untuk isi form awal.
 */

type Node = IsiLexical['root']['children'][number]

const teks = (text: string): Node => ({ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 })
const dasar = { format: '', indent: 0, version: 1, direction: 'ltr' }
const p = (isi: string): Node => ({ type: 'paragraph', ...dasar, textFormat: 0, textStyle: '', children: [teks(isi)] })
const h2 = (judul: string): Node => ({ type: 'heading', tag: 'h2', ...dasar, children: [teks(judul)] })
const daftar = (butir: string[], urut = false): Node => ({
  type: 'list',
  listType: urut ? 'number' : 'bullet',
  start: 1,
  tag: urut ? 'ol' : 'ul',
  ...dasar,
  children: butir.map((b, i) => ({ type: 'listitem', value: i + 1, ...dasar, children: [teks(b)] })),
})
const isi = (...children: Node[]): IsiLexical => ({ root: { type: 'root', ...dasar, direction: 'ltr', format: '', children } })

const DIAKSES = '2026-11-05T00:00:00.000Z'

type Sumber = NonNullable<Tool['sumberAturan']>[number]
const sumber = (judul: string, url: string, penerbit: string): Sumber => ({ judul, url, penerbit, diaksesPada: DIAKSES })

const S = {
  ter: sumber('Lampiran PP 58 Tahun 2023: tarif efektif PPh Pasal 21', 'https://www.pajak.go.id/sites/default/files/lampiran/Lampiran%20PP58TAHUN2023.pdf', 'DJP'),
  leaflet: sumber('Leaflet PPh 21 dengan tarif efektif rata-rata', 'https://pajak.go.id/sites/default/files/2024-02/Leaflet%20PPh%2021%20TER.pdf', 'DJP'),
  pmk168: sumber('PMK 168 Tahun 2023 tentang pemotongan pajak atas penghasilan', 'https://peraturan.go.id/files/permenkeu-no-168-tahun-2023.pdf', 'Kementerian Keuangan'),
  ptkp: sumber('Penghasilan Tidak Kena Pajak', 'https://pajak.go.id/penghasilan-tidak-kena-pajak', 'DJP'),
  pasal17: sumber('Memotret Keberpihakan UU HPP pada Rakyat Kecil', 'https://www.pajak.go.id/id/artikel/memotret-keberpihakan-uu-hpp-pada-rakyat-kecil', 'DJP'),
  perpres64: sumber(
    'Perpres 64 Tahun 2020 tentang Jaminan Kesehatan',
    'https://jdih.kemenkeu.go.id/download/179608f7-a2a0-41c0-aaec-e7d60eb36054/64TAHUN2020PERPRES.pdf',
    'JDIH Kementerian Keuangan',
  ),
  iuranTk: sumber(
    'Berapa Besaran Iuran JHT, JKK, JKM, JP dan JKP?',
    'https://www.bpjsketenagakerjaan.go.id/artikel/18913/artikel-berapa-besaran-iuran-jht,-jkk,-jkm,-jp-dan-jkp',
    'BPJS Ketenagakerjaan',
  ),
  jp2026: sumber(
    'Surat B/1226/022026: Ketentuan Batas Upah dan Manfaat Jaminan Pensiun Tahun 2026',
    'https://494075.fs1.hubspotusercontent-na1.net/hubfs/494075/compliance-portal/notification-number-b1226022026.pdf',
    'BPJS Ketenagakerjaan',
  ),
  permenaker6: sumber('Permenaker Nomor 6 Tahun 2016 tentang THR Keagamaan', 'https://peraturan.bpk.go.id/Download/252116/Kemnaker%20No.%206%20Tahun%202016.pdf', 'JDIH BPK'),
  seThr: sumber(
    'Surat Edaran Menaker Nomor M/3/HK.04.00/III/2026',
    'https://jdih.kemnaker.go.id/peraturan/detail/2983/surat-edaran-menteri-nomor-m-3-hk-04-00-iii-2026',
    'Kementerian Ketenagakerjaan',
  ),
  setneg: sumber(
    'Terbitkan Edaran THR Keagamaan 2026, Menaker: Harus Dibayar Penuh, Tak Boleh Dicicil',
    'https://www.setneg.go.id/baca/index/terbitkan_edaran_thr_keagamaan_2026_menaker_harus_dibayar_penuh_tak_boleh_dicicil',
    'Kementerian Sekretariat Negara',
  ),
  indonesiabaik: sumber('Yuk Hitung, Kamu Bakal Dapat THR Lebaran Berapa?', 'https://indonesiabaik.id/infografis/yuk-hitung-kamu-bakal-dapat-thr-lebaran-berapa', 'Indonesiabaik.id'),
  djpThr: sumber('DJP Jelaskan Soal PPh 21 untuk THR dengan Skema TER', 'https://ikpi.or.id/djp-jelaskan-soal-pph-21-untuk-thr-dengan-skema-ter/', 'IKPI'),
  kompasAnuitas: sumber(
    'Bunga Anuitas: Pengertian, Contoh, dan Cara Hitung',
    'https://money.kompas.com/read/2021/09/30/183144426/bunga-anuitas-pengertian-contoh-dan-cara-hitung?page=all',
    'Kompas.com',
  ),
  ojkDarurat: sumber('Tidak Ada Kata Terlambat untuk Dana Darurat', 'https://sikapiuangmu.ojk.go.id/FrontEnd/CMS/Article/20586', 'OJK, Sikapi Uangmu'),
  bps: sumber('Metadata indikator Indeks Massa Tubuh (IMT)', 'https://sirusa.web.bps.go.id/metadata/indikator/21524', 'BPS'),
  who: sumber('BMI among adults', 'https://www.who.int/data/gho/data/themes/topics/indicator-groups/indicator-group-details/GHO/bmi-among-adults', 'WHO'),
  mifflin: sumber(
    'A new predictive equation for resting energy expenditure in healthy individuals (Mifflin dkk., 1990)',
    'https://agris.fao.org/search/ar/records/65de26fe7c7033e84be9ee76',
    'American Journal of Clinical Nutrition',
  ),
  fao: sumber('Human Energy Requirements, bab 5', 'https://www.fao.org/4/Y5686e/y5686e07.htm', 'FAO, WHO, UNU'),
  sndikti: sumber(
    'Permendikbud Nomor 3 Tahun 2020 tentang Standar Nasional Pendidikan Tinggi',
    'https://lldikti3.kemdiktisaintek.go.id/wp-content/uploads/2024/07/Permendikbud-No.-3-Tahun-2020-Standar-Nasional-Pendidikan-Tinggi.pdf',
    'LLDIKTI Wilayah III',
  ),
  permen39: sumber(
    'Materi Permendiktisaintek Nomor 39 Tahun 2025 tentang Penjaminan Mutu Pendidikan Tinggi',
    'https://lldikti6.id/wp-content/uploads/2025/11/01.-MATERI-1-SNDIKTI-Permen-39-2025.pdf',
    'LLDIKTI Wilayah VI',
  ),
  ugm: sumber('Grading System', 'https://admission.ugm.ac.id/wp-content/uploads/sites/330/2025/04/Grading-System.pdf', 'Universitas Gadjah Mada'),
}

type ToolAwal = {
  toolId: ToolId
  nama: string
  pilar: string
  ringkasan: string
  penjelasan: IsiLexical
  faq: { pertanyaan: string; jawaban: string }[]
  sumberAturan: Sumber[]
  seo: { keyphrase: string; judulSEO: string; metaDeskripsi: string }
}

export const TOOLS_AWAL: ToolAwal[] = [
  {
    toolId: 'gaji-bersih',
    nama: 'Gaji Bersih',
    pilar: 'uang-karier',
    ringkasan: 'Hitung gaji yang masuk rekening setelah PPh 21 dan iuran BPJS, lengkap dengan potongan di bulan Desember.',
    penjelasan: isi(
      h2('Rumus gaji bersih'),
      p(
        'Gaji bersih adalah gaji pokok dan tunjangan dikurangi PPh 21 dan iuran yang dipotong dari gajimu. Kalkulator ini menghitungnya untuk pegawai tetap dengan aturan yang berlaku pada tanggal kamu menghitung.',
      ),
      daftar([
        'Gaji bersih per bulan = gaji pokok + tunjangan tetap + tunjangan tidak tetap - PPh 21 bulanan - iuran BPJS bagian karyawan - iuran pensiun lain atau zakat.',
        'PPh 21 Januari sampai November = tarif efektif bulanan (TER) x penghasilan bruto sebulan.',
        'PPh 21 Desember = PPh 21 setahun dengan tarif Pasal 17 - PPh 21 yang sudah dipotong Januari sampai November.',
      ]),
      h2('Apa saja yang masuk penghasilan bruto'),
      p(
        'Sejak 2024, PPh 21 bulanan pegawai tetap dihitung dengan TER sesuai PP 58 Tahun 2023 dan PMK 168 Tahun 2023. Penghasilan bruto bukan hanya gaji: premi Jaminan Kecelakaan Kerja (JKK), Jaminan Kematian (JKM), dan iuran BPJS Kesehatan yang dibayar kantor ikut dihitung. Iuran Jaminan Hari Tua dan Jaminan Pensiun bagian kantor tidak ikut.',
      ),
      p(
        'Kategori TER mengikuti status PTKP: kategori A untuk TK/0, TK/1, dan K/0; kategori B untuk TK/2, TK/3, K/1, dan K/2; kategori C untuk K/3. Setiap kategori punya tabel tarif dari 0% sampai 34% menurut besar penghasilan bruto sebulan.',
      ),
      h2('Iuran yang dipotong dari gajimu'),
      daftar([
        'BPJS Kesehatan 1% dari gaji, dengan batas upah Rp12.000.000 sebulan. Kantor menambah 4%.',
        'Jaminan Hari Tua (JHT) 2% dari gaji. Kantor menambah 3,7%.',
        'Jaminan Pensiun (JP) 1% dari gaji, dengan batas upah Rp11.086.300 sebulan mulai Maret 2026. Kantor menambah 2%.',
      ]),
      p('Premi JKK (0,24% untuk pekerjaan berisiko sangat rendah) dan JKM (0,3%) dibayar penuh oleh kantor.'),
      h2('Kenapa gaji Desember berbeda'),
      p(
        'TER hanya cara memotong pajak setiap bulan. Di masa pajak terakhir, kantor menghitung ulang pajak setahun: penghasilan bruto setahun dikurangi biaya jabatan 5% (paling banyak Rp6.000.000 setahun) serta iuran JHT dan JP yang kamu bayar, lalu dikurangi PTKP. Hasilnya, penghasilan kena pajak, dibulatkan ke bawah ke ribuan penuh dan dikenai tarif Pasal 17: 5% sampai Rp60 juta, 15% sampai Rp250 juta, 25% sampai Rp500 juta, 30% sampai Rp5 miliar, dan 35% di atasnya.',
      ),
      p('PPh 21 Desember adalah selisih pajak setahun dengan yang sudah dipotong. Bila hasilnya minus, kelebihan potong itu dikembalikan kantor.'),
      h2('Contoh hitung'),
      p('Gaji Rp8.000.000 sebulan, status TK/0, ikut BPJS Kesehatan dan BPJS Ketenagakerjaan:'),
      daftar(
        [
          'Penghasilan bruto: Rp8.000.000 + JKK Rp19.200 + JKM Rp24.000 + BPJS Kesehatan dari kantor Rp320.000 = Rp8.363.200.',
          'TER kategori A untuk bruto di atas Rp7.500.000 sampai Rp8.550.000 adalah 1,5%, jadi PPh 21 sebulan Rp125.448.',
          'Iuran yang dipotong: BPJS Kesehatan Rp80.000, JHT Rp160.000, dan JP Rp80.000, total Rp320.000.',
          'Gaji bersih Januari sampai November: Rp8.000.000 - Rp125.448 - Rp320.000 = Rp7.554.552.',
          'Desember: penghasilan kena pajak setahun Rp38.460.000, PPh 21 setahun Rp1.923.000, sudah dipotong Rp1.379.928, jadi PPh 21 Desember Rp543.072 dan gaji bersih Desember Rp7.136.928.',
        ],
        true,
      ),
      p(
        'Contoh resmi DJP untuk pegawai berstatus K/0 dengan gaji Rp15.000.000 dan iuran pensiun Rp150.000 sebulan menghasilkan PPh 21 Rp900.000 sebulan (TER 6%) dan Rp1.155.000 di bulan Desember. Kamu bisa mencobanya: matikan kedua pilihan BPJS dan isi iuran pensiun lain Rp150.000.',
      ),
      h2('Batasan kalkulator'),
      daftar([
        'Untuk pegawai tetap dengan gaji yang sama setiap bulan. Bonus, lembur, dan THR menaikkan PPh 21 di bulan diterimanya.',
        'Premi JKK memakai tingkat risiko sangat rendah. Bila tempat kerjamu berisiko lebih tinggi, tarif JKK 0,54% sampai 1,74% dan penghasilan brutomu sedikit lebih besar.',
        'Pegawai di industri alas kaki, tekstil dan pakaian jadi, furnitur, kulit dan barang dari kulit, serta pariwisata yang penghasilan brutonya paling banyak Rp10 juta sebulan bisa mendapat PPh 21 ditanggung pemerintah selama 2026 (PMK 105 Tahun 2025). Kalkulator ini menghitung PPh 21 sebelum insentif itu.',
        'Angka di sini perkiraan. Slip gajimu bisa berbeda karena komponen lain, misalnya potongan koperasi.',
      ]),
    ),
    faq: [
      {
        pertanyaan: 'Kenapa potongan PPh 21 di slip gajiku berbeda dengan hitungan ini?',
        jawaban:
          'Kantor menghitung dari semua komponen gaji bulan itu, termasuk lembur, bonus, dan tunjangan tidak tetap, serta tarif JKK sesuai risiko tempat kerja. Cocokkan setiap komponen di slip gajimu dengan isian kalkulator.',
      },
      {
        pertanyaan: 'Apakah iuran BPJS mengurangi pajak?',
        jawaban:
          'Iuran JHT dan JP yang dipotong dari gajimu mengurangi penghasilan neto saat pajak setahun dihitung di bulan Desember. Iuran BPJS Kesehatan bagian karyawan tidak mengurangi pajak.',
      },
      {
        pertanyaan: 'Apa beda TK/0 dan K/0?',
        jawaban:
          'TK berarti tidak kawin dan K berarti kawin. Angka di belakangnya jumlah tanggungan keluarga, paling banyak 3. PTKP TK/0 Rp54.000.000 setahun, dan setiap status kawin atau tanggungan menambah Rp4.500.000.',
      },
    ],
    sumberAturan: [S.ter, S.leaflet, S.pmk168, S.ptkp, S.pasal17, S.perpres64, S.iuranTk, S.jp2026],
    seo: {
      keyphrase: 'kalkulator gaji bersih',
      judulSEO: 'Kalkulator Gaji Bersih 2026 dengan PPh 21 TER dan BPJS',
      metaDeskripsi:
        'Hitung gaji bersih setelah PPh 21 TER dan iuran BPJS 2026, termasuk potongan di bulan Desember. Lengkap dengan rumus, contoh hitung, dan sumber aturan resmi.',
    },
  },
  {
    toolId: 'thr',
    nama: 'THR',
    pilar: 'uang-karier',
    ringkasan: 'Hitung THR keagamaan sesuai masa kerja, termasuk THR proporsional dan tambahan PPh 21 di bulan THR.',
    penjelasan: isi(
      h2('Rumus THR'),
      p(
        'Tunjangan hari raya (THR) keagamaan wajib dibayar kantor kepada pekerja yang sudah bekerja 1 bulan terus-menerus atau lebih, baik dengan perjanjian kerja waktu tidak tertentu maupun waktu tertentu (kontrak). Besarnya diatur Permenaker Nomor 6 Tahun 2016 dan ditegaskan lagi dalam Surat Edaran Menteri Ketenagakerjaan Nomor M/3/HK.04.00/III/2026.',
      ),
      daftar([
        'Masa kerja 12 bulan atau lebih: THR = 1 bulan upah.',
        'Masa kerja 1 bulan sampai kurang dari 12 bulan: THR = masa kerja (bulan) / 12 x 1 bulan upah.',
        'Masa kerja kurang dari 1 bulan: belum berhak THR.',
      ]),
      h2('Upah yang dipakai'),
      p(
        'Upah 1 bulan adalah upah tanpa tunjangan (upah bersih) atau upah pokok ditambah tunjangan tetap. Untuk pekerja harian lepas dengan masa kerja 12 bulan atau lebih, upah sebulan adalah rata-rata upah 12 bulan terakhir sebelum hari raya; bila kurang dari 12 bulan, rata-rata upah setiap bulan selama masa kerja.',
      ),
      p('Bila perjanjian kerja, peraturan perusahaan, perjanjian kerja bersama, atau kebiasaan di kantormu memberi THR lebih besar, yang berlaku adalah yang lebih besar.'),
      h2('Kapan THR dibayar'),
      p('THR wajib dibayar paling lambat 7 hari sebelum hari raya keagamaan. Surat edaran 2026 menegaskan THR dibayar penuh dan tidak boleh dicicil.'),
      h2('PPh 21 atas THR'),
      p(
        'THR adalah penghasilan, jadi ikut dipotong PPh 21. Di bulan THR dibayar, kantor menjumlahkan gaji dan THR, lalu memakai tarif efektif bulanan (TER) untuk jumlah itu. Karena brutonya lebih besar, tarifnya ikut naik. Contoh dari DJP: pegawai TK/0 dengan bruto Rp6.500.000 dipotong 1% di bulan biasa; di bulan THR brutonya Rp13.000.000 sehingga tarifnya 5%.',
      ),
      p('Potongan yang lebih besar itu bukan pajak baru. Di bulan Desember pajak setahun dihitung ulang dengan tarif Pasal 17, jadi beban pajak setahunmu tidak bertambah karena cara potong ini.'),
      h2('Contoh hitung'),
      daftar(
        [
          'Upah Rp6.500.000, masa kerja 12 bulan: THR Rp6.500.000.',
          'Upah Rp5.000.000, masa kerja 6 bulan: THR 6/12 x Rp5.000.000 = Rp2.500.000.',
          'PPh 21 untuk status TK/0 yang ikut BPJS: bruto bulan biasa Rp6.795.100 dipotong 1,25% atau Rp84.938. Di bulan THR brutonya Rp13.295.100 dan dipotong 5% atau Rp664.755. Tambahan potongannya Rp579.817, jadi THR yang kamu terima sekitar Rp5.920.183.',
        ],
        true,
      ),
      h2('Batasan kalkulator'),
      daftar([
        'Masa kerja dihitung dalam bulan penuh sampai hari raya.',
        'Perkiraan PPh 21 memakai gaji bulanan yang sama dengan upah THR. Bila bulan itu ada lembur atau bonus, potongannya lebih besar.',
      ]),
    ),
    faq: [
      {
        pertanyaan: 'Apakah pekerja kontrak berhak THR?',
        jawaban: 'Berhak. Permenaker 6/2016 berlaku untuk pekerja dengan perjanjian kerja waktu tidak tertentu maupun waktu tertentu, asalkan masa kerjanya sudah 1 bulan atau lebih.',
      },
      { pertanyaan: 'Apakah THR boleh dicicil?', jawaban: 'Tidak. Surat Edaran Menaker 2026 menegaskan THR dibayar penuh, paling lambat 7 hari sebelum hari raya.' },
      {
        pertanyaan: 'Kenapa THR yang masuk rekening lebih kecil dari satu bulan gaji?',
        jawaban: 'Karena PPh 21 bulan itu dihitung dari gaji ditambah THR dengan tarif TER yang lebih tinggi. Selisihnya disesuaikan saat pajak setahun dihitung ulang di bulan Desember.',
      },
    ],
    sumberAturan: [S.permenaker6, S.seThr, S.setneg, S.indonesiabaik, S.djpThr, S.ter],
    seo: {
      keyphrase: 'kalkulator THR',
      judulSEO: 'Kalkulator THR 2026: THR Proporsional dan Potongan PPh 21',
      metaDeskripsi:
        'Hitung THR keagamaan 2026 sesuai masa kerja, termasuk THR proporsional untuk karyawan baru dan tambahan PPh 21 di bulan THR, dengan rumus dari Permenaker.',
    },
  },
  {
    toolId: 'cicilan-kpr',
    nama: 'Cicilan & KPR',
    pilar: 'uang-karier',
    ringkasan: 'Hitung cicilan bulanan KPR, kendaraan, atau pinjaman dengan bunga anuitas atau flat, beserta total bunganya.',
    penjelasan: isi(
      h2('Rumus cicilan'),
      p('Cicilan bulanan bergantung pada pokok pinjaman, bunga, lama cicilan, dan cara pemberi pinjaman menghitung bunga. Pokok pinjaman adalah harga dikurangi uang muka.'),
      daftar([
        'Anuitas: cicilan = P x r / (1 - (1 + r) pangkat -n). P pokok pinjaman, r bunga per bulan (bunga per tahun dibagi 12), n jumlah bulan. Cicilan sama setiap bulan; di awal sebagian besar untuk bunga, lalu porsi pokok makin besar.',
        'Flat: cicilan = P / n + P x r. Bunga selalu dihitung dari pokok awal, jadi total bunganya lebih besar daripada anuitas dengan angka bunga yang sama.',
      ]),
      h2('Contoh hitung'),
      p('Pinjaman Rp120.000.000 dengan bunga 11% per tahun selama 10 tahun (120 bulan):'),
      daftar([
        'Anuitas: cicilan Rp1.653.000. Bunga bulan pertama Rp120.000.000 x 11% / 12 = Rp1.100.000, jadi pokok yang terbayar Rp553.000. Total bunga selama 10 tahun Rp78.360.000.',
        'Flat: cicilan Rp1.000.000 pokok + Rp1.100.000 bunga = Rp2.100.000 setiap bulan. Total bunganya Rp132.000.000.',
      ]),
      p('Contoh di form: rumah Rp500.000.000 dengan uang muka 20% berarti pokok Rp400.000.000. Dengan bunga anuitas 7,5% per tahun selama 15 tahun, cicilannya Rp3.708.049 dan total bunganya Rp267.448.820.'),
      h2('Bunga tetap dan mengambang'),
      p(
        'Banyak KPR memakai bunga tetap untuk beberapa tahun pertama, lalu bunga mengambang yang mengikuti suku bunga pasar. Kalkulator ini menganggap bunga tetap sepanjang tenor. Untuk memperkirakan cicilan setelah masa bunga tetap, hitung lagi dengan bunga mengambang yang tertulis di perjanjian kreditmu.',
      ),
      h2('Sebelum mengambil pinjaman'),
      daftar([
        'Tanyakan cara hitung bunganya. Dengan angka bunga yang sama, bunga flat jauh lebih mahal daripada anuitas, seperti di contoh di atas.',
        'Hitung juga biaya lain: provisi, administrasi, asuransi, appraisal, dan notaris.',
        'Pastikan pemberi pinjaman berizin dan diawasi OJK.',
      ]),
    ),
    faq: [
      {
        pertanyaan: 'Apa beda bunga anuitas dan bunga efektif?',
        jawaban: 'Keduanya menghitung bunga dari sisa pokok. Pada anuitas cicilannya dibuat sama setiap bulan; pada bunga efektif biasa angsuran pokoknya yang sama, sehingga cicilan turun setiap bulan.',
      },
      {
        pertanyaan: 'Bisakah kalkulator ini dipakai untuk kredit motor?',
        jawaban: 'Bisa. Kredit kendaraan dan pinjaman tanpa agunan sering memakai bunga flat. Pilih Flat, lalu isi harga, uang muka, bunga, dan lama cicilannya.',
      },
    ],
    sumberAturan: [S.kompasAnuitas],
    seo: {
      keyphrase: 'kalkulator cicilan KPR',
      judulSEO: 'Kalkulator Cicilan KPR: Bunga Anuitas dan Flat per Bulan',
      metaDeskripsi:
        'Hitung cicilan KPR, kredit kendaraan, atau pinjaman per bulan dengan bunga anuitas atau flat, lengkap dengan total bunga, rumus, dan contoh hitungnya.',
    },
  },
  {
    toolId: 'dana-darurat',
    nama: 'Dana Darurat',
    pilar: 'uang-karier',
    ringkasan: 'Hitung target dana darurat dari pengeluaran wajib dan kondisimu, lalu berapa yang perlu disisihkan tiap bulan.',
    penjelasan: isi(
      h2('Rumus dana darurat'),
      p('Dana darurat adalah tabungan untuk kejadian mendadak, misalnya kehilangan penghasilan, sakit, atau perbaikan yang tidak bisa ditunda. Besarnya diukur dari pengeluaran wajib sebulan, bukan dari gaji.'),
      daftar([
        'Target = pengeluaran wajib per bulan x kelipatan sesuai kondisimu.',
        'Setoran per bulan = (target - dana yang sudah ada) / jumlah bulan, dibulatkan ke atas.',
      ]),
      h2('Berapa kali pengeluaran'),
      p(
        'OJK lewat Sikapi Uangmu menyarankan dana darurat 6 kali pengeluaran bulanan untuk yang masih lajang, dan 9 sampai 12 kali untuk yang sudah berkeluarga atau punya tanggungan. Kalkulator ini memakai 9 kali untuk menikah tanpa anak dan 12 kali untuk yang punya anak atau tanggungan lain.',
      ),
      h2('Pengeluaran wajib itu apa saja'),
      daftar([
        'Makan dan kebutuhan rumah tangga.',
        'Sewa atau cicilan rumah.',
        'Transport untuk bekerja dan sekolah.',
        'Tagihan listrik, air, internet, dan pulsa.',
        'Cicilan utang dan premi asuransi.',
        'Biaya sekolah atau pengasuhan anak.',
      ]),
      p('Belanja yang bisa ditunda, seperti hiburan dan langganan, tidak perlu dihitung.'),
      h2('Di mana menyimpannya'),
      p(
        'OJK menyarankan rekening tabungan terpisah yang mudah dicairkan dan setoran awalnya kecil, di produk keuangan yang legal dan diawasi OJK. Hindari menaruh dana darurat di investasi berisiko seperti saham, karena nilainya bisa turun tepat saat kamu membutuhkannya.',
      ),
      h2('Contoh hitung'),
      p('Pengeluaran wajib Rp5.000.000 sebulan, lajang, sudah punya Rp5.000.000, target terkumpul dalam 12 bulan:'),
      daftar(
        [
          'Target: 6 x Rp5.000.000 = Rp30.000.000.',
          'Kekurangan: Rp30.000.000 - Rp5.000.000 = Rp25.000.000.',
          'Setoran: Rp25.000.000 / 12 = Rp2.083.334 per bulan, dibulatkan ke atas.',
        ],
        true,
      ),
    ),
    faq: [
      {
        pertanyaan: 'Apakah dana darurat sama dengan tabungan biasa?',
        jawaban: 'Tidak. Dana darurat hanya untuk kejadian mendadak dan disimpan terpisah supaya tidak terpakai untuk belanja atau tujuan lain.',
      },
      {
        pertanyaan: 'Bagaimana kalau targetnya terasa terlalu besar?',
        jawaban: 'Mulai dari target kecil, misalnya satu bulan pengeluaran, lalu tambah sedikit demi sedikit. Perpanjang jangka di kalkulator untuk melihat setoran yang lebih ringan.',
      },
    ],
    sumberAturan: [S.ojkDarurat],
    seo: {
      keyphrase: 'kalkulator dana darurat',
      judulSEO: 'Kalkulator Dana Darurat: Berapa yang Perlu Kamu Siapkan',
      metaDeskripsi:
        'Hitung target dana darurat dari pengeluaran wajib sebulan dan kondisimu, sesuai saran OJK, lalu berapa yang perlu disisihkan setiap bulan untuk mencapainya.',
    },
  },
  {
    toolId: 'bmi-kalori',
    nama: 'BMI & Kalori',
    pilar: 'sehat',
    ringkasan: 'Hitung indeks massa tubuh dengan kategori dewasa Indonesia dan perkiraan kebutuhan kalori harianmu.',
    penjelasan: isi(
      h2('Rumus IMT'),
      p('Indeks massa tubuh (IMT, atau BMI dalam bahasa Inggris) adalah berat badan dalam kilogram dibagi kuadrat tinggi badan dalam meter. IMT dipakai untuk skrining status gizi orang dewasa, bukan untuk diagnosis.'),
      daftar(['IMT = berat (kg) / (tinggi (m) x tinggi (m)).']),
      h2('Kategori IMT dewasa Indonesia'),
      p(
        'Kalkulator memakai batas IMT dewasa yang dipakai di Indonesia: sangat kurus di bawah 17,0; kurus 17,0 sampai 18,4; normal 18,5 sampai 25,0; gemuk 25,1 sampai 27,0; dan obesitas di atas 27,0. IMT dibulatkan satu desimal sebelum dikategorikan.',
      ),
      p(
        'WHO memakai batas lain untuk perbandingan antarnegara: berat badan kurang di bawah 18,5, berat badan lebih mulai 25, dan obesitas mulai 30. Karena itu IMT 28 sudah termasuk obesitas menurut batas Indonesia, tetapi masih berat badan lebih menurut WHO.',
      ),
      h2('Kebutuhan kalori'),
      p('Kebutuhan kalori harian diperkirakan dari energi basal (BMR), yaitu energi untuk fungsi tubuh saat istirahat, dikali faktor aktivitas.'),
      daftar([
        'Laki-laki: BMR = 10 x berat (kg) + 6,25 x tinggi (cm) - 5 x usia (tahun) + 5.',
        'Perempuan: BMR = 10 x berat (kg) + 6,25 x tinggi (cm) - 5 x usia (tahun) - 161.',
      ]),
      p(
        'Rumus energi basal ini dari Mifflin dan St Jeor (American Journal of Clinical Nutrition, 1990). Faktor aktivitasnya memakai tingkat aktivitas fisik (PAL) dari laporan FAO, WHO, dan UNU tentang kebutuhan energi manusia: 1,53 untuk aktivitas ringan, 1,76 untuk sedang, dan 2,25 untuk berat.',
      ),
      h2('Contoh hitung'),
      p('Perempuan 25 tahun, berat 60 kg, tinggi 165 cm, aktivitas ringan:'),
      daftar(
        [
          'IMT = 60 / (1,65 x 1,65) = 22,0, kategori normal.',
          'BMR = 10 x 60 + 6,25 x 165 - 5 x 25 - 161 = 1.345 kkal.',
          'Kebutuhan kalori = 1.345,25 x 1,53 = sekitar 2.058 kkal per hari.',
          'Berat normal untuk tinggi 165 cm: 18,5 x 1,65 x 1,65 sampai 25,0 x 1,65 x 1,65, yaitu 50,4 sampai 68,1 kg.',
        ],
        true,
      ),
      h2('Batasan kalkulator'),
      daftar([
        'Untuk orang dewasa 18 tahun ke atas. Anak dan remaja dinilai dengan grafik IMT menurut umur.',
        'IMT tidak membedakan otot dan lemak, jadi orang yang sangat berotot bisa tergolong gemuk.',
        'Tidak dipakai untuk ibu hamil.',
        'Angka kalori adalah perkiraan. Kebutuhan yang tepat, terutama bila kamu punya penyakit tertentu, sebaiknya ditentukan bersama dokter atau ahli gizi.',
      ]),
    ),
    faq: [
      { pertanyaan: 'Berapa IMT yang normal?', jawaban: 'Untuk orang dewasa di Indonesia, IMT normal 18,5 sampai 25,0. WHO memakai 18,5 sampai di bawah 25.' },
      {
        pertanyaan: 'Apakah kebutuhan kalori ini untuk menurunkan berat badan?',
        jawaban: 'Angka ini perkiraan untuk mempertahankan berat badan saat ini. Untuk menurunkan atau menaikkan berat badan, bicarakan target yang aman dengan tenaga kesehatan.',
      },
    ],
    sumberAturan: [S.bps, S.who, S.mifflin, S.fao],
    seo: {
      keyphrase: 'kalkulator BMI',
      judulSEO: 'Kalkulator BMI dan Kebutuhan Kalori Harian Orang Dewasa',
      metaDeskripsi:
        'Hitung indeks massa tubuh (BMI) dengan kategori dewasa Indonesia dan perkiraan kebutuhan kalori harian dengan rumus Mifflin-St Jeor dan faktor aktivitas.',
    },
  },
  {
    toolId: 'ipk',
    nama: 'IPK',
    pilar: 'belajar',
    ringkasan: 'Hitung IP semester dan IPK dari SKS dan nilai huruf, atau gabungkan dengan IPK sebelumnya.',
    penjelasan: isi(
      h2('Rumus IP dan IPK'),
      p('Indeks prestasi (IP) adalah rata-rata nilai yang dibobot SKS. Setiap nilai huruf diubah menjadi angka mutu, dikali SKS mata kuliahnya, lalu dijumlahkan dan dibagi jumlah SKS.'),
      daftar([
        'IP semester = jumlah (SKS x angka mutu) semester itu / jumlah SKS semester itu.',
        'IPK = jumlah (SKS x angka mutu) semua mata kuliah yang sudah ditempuh / jumlah SKS yang sudah ditempuh.',
      ]),
      p(
        'Rumus ini tertulis di Permendikbud Nomor 3 Tahun 2020 tentang Standar Nasional Pendidikan Tinggi. Peraturan yang berlaku sekarang, Permendiktisaintek Nomor 39 Tahun 2025, tetap memakai nilai huruf A sampai E dan membolehkan nilai antara.',
      ),
      h2('Konversi nilai huruf'),
      p(
        'Permendikbud 3/2020 menetapkan A setara 4, B setara 3, C setara 2, D setara 1, dan E setara 0. Nilai antara seperti A- atau B+ ditentukan masing-masing kampus. Kalkulator ini memakai A- 3,7; B+ 3,3; B- 2,7; dan C+ 2,3. Kampus lain bisa berbeda, misalnya UGM memakai A- 3,75 dan B+ 3,25.',
      ),
      h2('Menggabungkan dengan IPK sebelumnya'),
      p(
        'Bila kamu tahu IPK dan jumlah SKS sebelumnya, kalkulator menggabungkannya: mutu lama (IPK x SKS lama) ditambah mutu semester ini, lalu dibagi total SKS. Hasilnya sama dengan menghitung ulang semua mata kuliah, selama IPK lama yang kamu isi tidak dibulatkan terlalu jauh.',
      ),
      h2('Contoh hitung'),
      daftar(
        [
          'Lima mata kuliah: 3 SKS nilai A, 3 SKS B+, 2 SKS A-, 3 SKS B, dan 2 SKS A.',
          'Mutu: 3 x 4 + 3 x 3,3 + 2 x 3,7 + 3 x 3 + 2 x 4 = 46,3.',
          'IP = 46,3 / 13 = 3,56.',
          'Dengan IPK sebelumnya 3,40 dari 40 SKS: (3,40 x 40 + 46,3) / 53 = 3,44.',
        ],
        true,
      ),
      h2('Batasan kalkulator'),
      daftar([
        'Mata kuliah yang hanya dinilai lulus atau tidak lulus, tanpa nilai huruf, tidak dihitung dalam IP dan IPK.',
        'Sebagian kampus memotong IPK ke dua desimal, bukan membulatkan. Kalkulator ini membulatkan.',
      ]),
    ),
    faq: [
      {
        pertanyaan: 'Berapa IPK minimal untuk lulus?',
        jawaban: 'Permendiktisaintek 39/2025 mensyaratkan IPK paling rendah 2,00 untuk program diploma, sarjana, dan sarjana terapan, dan 3,00 untuk program profesi, magister, dan doktor.',
      },
      {
        pertanyaan: 'Kenapa IPK di sini berbeda dengan sistem akademik kampusku?',
        jawaban: 'Biasanya karena konversi nilai antara atau cara pembulatan. Cocokkan tabel konversi nilai huruf di halaman ini dengan peraturan akademik kampusmu.',
      },
    ],
    sumberAturan: [S.sndikti, S.permen39, S.ugm],
    seo: {
      keyphrase: 'kalkulator IPK',
      judulSEO: 'Kalkulator IPK: Hitung IP Semester dan IPK dari Nilai SKS',
      metaDeskripsi:
        'Hitung IP semester dan IPK dari SKS dan nilai huruf, atau gabungkan dengan IPK sebelumnya. Lengkap dengan rumus, konversi nilai huruf, dan contoh hitung.',
    },
  },
]

/** Bantuan input awal dari definisi isian modul hitung; pemilik bisa mengubah label dan bantuannya di CMS. */
function bantuanAwal(toolId: ToolId): NonNullable<Tool['bantuanInput']> {
  const { isian } = siapkanKalkulator(toolId, PARAMETER_AWAL, '2026-11-05')
  return isian
    .flatMap((i): Isian[] => (i.jenis === 'baris' ? [i, ...i.kolom] : [i]))
    .map((i) => ({ kunci: i.kunci, label: i.label, bantuan: i.bantuan }))
}

/**
 * Membuat tools yang belum ada (dicari lewat `toolId`, termasuk draf) dan parameter yang belum ada
 * (dicari lewat `toolId`, `kunci`, dan `berlakuMulai`). Aman dijalankan berkali-kali dan tidak menimpa
 * isian pemilik.
 */
export async function seedTools(payload: Payload): Promise<{ tools: number; parameter: number }> {
  const slugPilar = [...new Set(TOOLS_AWAL.map((t) => t.pilar))]
  const { docs: daftarPilar } = await payload.find({
    collection: 'pilar',
    where: { slug: { in: slugPilar } },
    limit: slugPilar.length,
    depth: 0,
    select: { slug: true },
  })
  const idPilar = new Map(daftarPilar.map((d) => [d.slug, d.id]))
  let tools = 0
  for (const t of TOOLS_AWAL) {
    const ada = await payload.find({ collection: 'tools', where: { toolId: { equals: t.toolId } }, draft: true, limit: 1, depth: 0 })
    const pilar = idPilar.get(t.pilar)
    if (ada.totalDocs > 0 || !pilar) continue
    await payload.create({
      collection: 'tools',
      draft: true,
      data: { ...t, _status: 'draft', slug: t.toolId, pilar, bantuanInput: bantuanAwal(t.toolId) },
    })
    tools++
  }
  let parameter = 0
  for (const p of PARAMETER_AWAL) {
    const ada = await payload.find({
      collection: 'parameter-tools',
      where: { and: [{ toolId: { equals: p.toolId } }, { kunci: { equals: p.kunci } }, { berlakuMulai: { equals: p.berlakuMulai } }] },
      limit: 1,
      depth: 0,
    })
    if (ada.totalDocs > 0) continue
    await payload.create({ collection: 'parameter-tools', data: p })
    parameter++
  }
  return { tools, parameter }
}
