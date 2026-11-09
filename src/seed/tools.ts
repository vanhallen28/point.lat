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
/** Sumber yang ditambahkan saat penjelasan dilengkapi untuk paket konten v1.3.0. */
const DIAKSES_V130 = '2026-11-10T00:00:00.000Z'

type Sumber = NonNullable<Tool['sumberAturan']>[number]
const sumber = (judul: string, url: string, penerbit: string): Sumber => ({ judul, url, penerbit, diaksesPada: DIAKSES })
const sumberBaru = (judul: string, url: string, penerbit: string): Sumber => ({ judul, url, penerbit, diaksesPada: DIAKSES_V130 })

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
  permen39: sumberBaru(
    'Permendiktisaintek Nomor 39 Tahun 2025 tentang Penjaminan Mutu Pendidikan Tinggi',
    'https://peraturan.go.id/files/permendiktisaintek-no-39-tahun-2025.pdf',
    'Kementerian Hukum',
  ),
  libur2027: sumberBaru(
    'Inilah SKB 3 Menteri Libur Nasional dan Cuti Bersama 2027',
    'https://setneg.go.id/baca/index/inilah_skb_3_menteri_libur_nasional_dan_cuti_bersama_2027',
    'Kementerian Sekretariat Negara',
  ),
  uu27: sumberBaru(
    'UU Pelindungan Ketenagakerjaan resmi berlaku sejak 28 Oktober 2026',
    'https://sultra.antaranews.com/berita/545839/uu-pelindungan-ketenagakerjaan-resmi-berlaku-sejak-28-oktober-2026',
    'ANTARA',
  ),
  tipsKprOjk: sumberBaru('Tips Memilih KPR dari OJK', 'https://momsmoney.kontan.co.id/news/tips-memilih-kpr-dari-ojk', 'Kontan'),
  flpp2026: sumberBaru(
    'KPR Subsidi Tenor 40 Tahun Resmi Berlaku, Bunga Tetap 5%',
    'https://wartaekonomi.co.id/read618898/kpr-subsidi-tenor-40-tahun-resmi-berlaku-bunga-tetap-5',
    'Warta Ekonomi',
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
      h2('Cara memakai kalkulator ini'),
      daftar(
        [
          'Isi gaji pokok ditambah tunjangan tetap per bulan, sebelum dipotong apa pun.',
          'Pilih status PTKP sesuai keadaanmu pada 1 Januari tahun ini.',
          'Buka pengaturan lanjutan bila kamu punya tunjangan tidak tetap, tidak ikut salah satu BPJS, atau membayar iuran pensiun lain dan zakat lewat kantor.',
          'Baca rincian di bawah hasil: penghasilan bruto, tarif TER, setiap potongan, lalu hitungan ulang bulan Desember.',
        ],
        true,
      ),
      p('Cocokkan rincian itu dengan slip gajimu baris demi baris. Kalau ada selisih, biasanya datang dari lembur, bonus, atau tarif JKK yang berbeda.'),
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
      h2('Siapa yang berhak'),
      daftar([
        'Pekerja tetap dan pekerja kontrak yang sudah bekerja minimal satu bulan terus-menerus.',
        'Pekerja harian lepas yang memenuhi syarat masa kerja, dengan upah sebulan dari rata-rata upahnya.',
        'Pekerja tetap yang terkena PHK dalam 30 hari sebelum hari raya.',
      ]),
      p('Pekerja kontrak yang kontraknya berakhir sebelum hari raya tidak berhak atas THR hari raya itu. THR dibayar dalam bentuk uang rupiah, bukan barang.'),
      h2('Batas bayar THR Idul Fitri 2027'),
      p(
        'SKB tiga menteri tentang hari libur 2027 menetapkan Idul Fitri 1448 H pada 10 dan 11 Maret 2027. THR wajib dibayar paling lambat tujuh hari sebelum hari raya, jadi batasnya 3 Maret 2027. Tanggal pasti Idul Fitri tetap menunggu sidang isbat, dan batas THR ikut bergeser bila hari raya bergeser.',
      ),
      p(
        'Permenaker 6 Tahun 2016 tetap berlaku setelah UU Nomor 27 Tahun 2026 tentang Pelindungan Ketenagakerjaan terbit, selama tidak bertentangan dengan undang-undang itu. Aturan pelaksana yang baru wajib terbit paling lama setahun sejak 28 Oktober 2026.',
      ),
      h2('Contoh THR proporsional'),
      p('Untuk upah Rp5.000.000 sebulan:'),
      daftar([
        'Masa kerja 1 bulan: 1/12 x Rp5.000.000 = Rp416.667.',
        'Masa kerja 3 bulan: Rp1.250.000.',
        'Masa kerja 6 bulan: Rp2.500.000.',
        'Masa kerja 9 bulan: Rp3.750.000.',
        'Masa kerja 11 bulan: Rp4.583.333.',
        'Masa kerja 12 bulan atau lebih: Rp5.000.000.',
      ]),
      h2('Kalau THR terlambat'),
      p(
        'Pengusaha yang terlambat membayar THR dikenai denda 5% dari total THR, dan denda itu tidak menghapus kewajiban membayar THR. Simpan slip gaji dan perjanjian kerjamu, tanyakan ke HR secara tertulis, lalu laporkan ke posko THR Kemnaker atau dinas ketenagakerjaan bila belum juga dibayar.',
      ),
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
    sumberAturan: [S.permenaker6, S.seThr, S.setneg, S.indonesiabaik, S.djpThr, S.ter, S.libur2027, S.uu27],
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
      h2('Cara memakai kalkulator ini'),
      daftar(
        [
          'Isi harga rumah atau barang dan persentase uang muka.',
          'Isi bunga per tahun dan lama cicilan sesuai penawaran bank atau leasing.',
          'Pilih cara hitung bunga. KPR bank hampir selalu anuitas; kredit kendaraan dan pinjaman tanpa agunan sering flat.',
          'Baca total bunga, bukan hanya cicilan per bulan, sebelum memutuskan.',
        ],
        true,
      ),
      h2('Bunga tetap lalu mengambang'),
      p(
        'Promosi KPR biasanya menawarkan bunga tetap selama 1 sampai 5 tahun pertama. Setelah itu bunga mengambang mengikuti suku bunga pasar, dan banyak bank memakai suku bunga dasar kredit (SBDK) yang diumumkan di situs bank masing-masing. Untuk memperkirakan cicilan setelah masa bunga tetap, hitung lagi dengan sisa pokok, sisa tenor, dan kisaran bunga mengambang bank itu.',
      ),
      h2('Pengaruh tenor dan bunga'),
      p('Untuk pokok pinjaman Rp405.000.000 dengan bunga anuitas tetap:'),
      daftar([
        'Bunga 7,5%, tenor 15 tahun: cicilan Rp3.754.400, total bunga Rp270.792.000.',
        'Bunga 7,5%, tenor 20 tahun: cicilan Rp3.262.652, total bunga Rp378.036.480.',
        'Bunga 10,5%, tenor 20 tahun: cicilan Rp4.043.439, total bunga Rp565.425.360.',
      ]),
      p(
        'Tenor yang lebih panjang membuat cicilan lebih ringan, tetapi total bunganya jauh lebih besar. Kenaikan bunga tiga persen setelah masa bunga tetap menaikkan cicilan sekitar 24%, jadi hitung juga skenario bunga mengambang sebelum akad.',
      ),
      h2('Berapa cicilan yang aman'),
      p(
        'Panduan OJK menyarankan total cicilan tidak lebih dari 30% penghasilan. Dengan gaji bersih Rp12.000.000, semua cicilan sebaiknya di bawah Rp3.600.000. Cicilan sebesar itu, dengan bunga 7,5% selama 20 tahun, cukup untuk pokok pinjaman sekitar Rp446 juta.',
      ),
      h2('Biaya di luar cicilan'),
      daftar([
        'Uang muka.',
        'Provisi dan biaya administrasi bank.',
        'Appraisal, asuransi jiwa, dan asuransi kebakaran.',
        'Notaris atau PPAT, serta BPHTB yang tarifnya ditetapkan pemerintah daerah.',
      ]),
      h2('Pelunasan dipercepat'),
      p(
        'Melunasi sebagian pokok lebih cepat mengurangi total bunga, karena bunga anuitas dihitung dari sisa pokok. Tetapi banyak bank mengenakan penalti pelunasan dipercepat, terutama selama masa bunga tetap. Tanyakan besarnya sebelum akad, lalu bandingkan dengan bunga yang bisa kamu hemat.',
      ),
      h2('KPR subsidi'),
      p(
        'KPR subsidi FLPP memakai bunga tetap 5% sepanjang tenor untuk rumah tapak, dan sejak Juni 2026 tenornya bisa sampai 40 tahun. Kalkulator ini menerima tenor sampai 30 tahun. Contohnya, rumah Rp185.000.000 dengan uang muka 1% dan tenor 20 tahun: cicilan Rp1.208.709 per bulan.',
      ),
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
    sumberAturan: [S.kompasAnuitas, S.tipsKprOjk, S.flpp2026],
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
      h2('Contoh untuk keluarga'),
      p('Pengeluaran wajib Rp8.000.000 sebulan, menikah dengan anak, sudah punya Rp20.000.000, target terkumpul dalam 24 bulan:'),
      daftar(
        [
          'Target: 12 x Rp8.000.000 = Rp96.000.000.',
          'Kekurangan: Rp96.000.000 - Rp20.000.000 = Rp76.000.000.',
          'Setoran: Rp76.000.000 / 24 = Rp3.166.667 per bulan.',
        ],
        true,
      ),
      p('Kalau setoran itu terlalu berat, perpanjang jangkanya. Target yang tercapai pelan-pelan lebih baik daripada target besar yang ditinggalkan di bulan ketiga.'),
      h2('Cara mengumpulkannya'),
      daftar([
        'Pasang transfer otomatis ke rekening dana darurat setiap tanggal gajian, sebelum uangnya terpakai.',
        'Sisihkan sebagian THR, bonus, atau penghasilan tambahan.',
        'Mulai dari target satu bulan pengeluaran, lalu naikkan bertahap sampai target penuh.',
      ]),
      h2('Kapan boleh dipakai'),
      p(
        'Pakai dana darurat untuk kejadian yang tidak direncanakan dan tidak bisa ditunda: kehilangan penghasilan, biaya kesehatan yang tidak ditanggung, atau perbaikan rumah dan kendaraan yang mendesak. Setelah terpakai, isi ulang lebih dulu sebelum menabung untuk tujuan lain.',
      ),
      h2('Berapa lama mengumpulkannya'),
      p(
        'Tidak ada aturan baku. Jangka 12 sampai 24 bulan biasanya membuat setoran tetap terasa ringan tanpa membuat target terlalu jauh. Yang penting setorannya rutin. Setoran kecil yang konsisten setiap gajian lebih berguna daripada setoran besar sesekali yang mudah terlewat ketika ada kebutuhan lain.',
      ),
      h2('Dana darurat dan utang'),
      p(
        'Kalau kamu punya utang berbunga tinggi, seperti kartu kredit atau pinjaman online, kumpulkan dulu dana darurat kecil, misalnya satu bulan pengeluaran. Setelah itu fokus melunasi utang tersebut, lalu lanjutkan dana darurat sampai target penuh. Tanpa dana darurat sama sekali, kejadian mendadak berikutnya biasanya kembali dibayar dengan utang.',
      ),
      h2('Bukan untuk investasi'),
      p(
        'Dana darurat harus bisa dicairkan cepat tanpa rugi. Simpan di tabungan atau produk sejenis yang diawasi OJK. Simpanan di bank yang ikut program penjaminan LPS dijamin sampai Rp2 miliar per nasabah per bank, selama bunganya tidak melebihi tingkat bunga penjaminan LPS.',
      ),
      h2('Cara memakai kalkulator ini'),
      daftar(
        [
          'Jumlahkan pengeluaran wajibmu sebulan: makan, tempat tinggal, transport, tagihan, cicilan, dan biaya anak.',
          'Pilih kondisi yang paling sesuai.',
          'Isi dana yang sudah terkumpul dan berapa bulan kamu ingin mencapainya.',
        ],
        true,
      ),
      h2('Batasan kalkulator'),
      daftar([
        'Target dihitung dari pengeluaran hari ini. Hitung ulang setahun sekali atau saat kondisimu berubah, misalnya menikah atau punya anak.',
        'Bunga tabungan tidak dihitung, jadi setoran yang sebenarnya dibutuhkan sedikit lebih kecil.',
        'Kelipatan 6, 9, dan 12 kali adalah patokan umum. Pekerja lepas atau yang penghasilannya tidak tetap sebaiknya memakai target lebih besar.',
      ]),
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
      h2('Contoh lain'),
      p('Laki-laki 30 tahun, berat 75 kg, tinggi 170 cm, aktivitas sedang:'),
      daftar(
        [
          'IMT = 75 / (1,70 x 1,70) = 26,0, kategori gemuk menurut batas dewasa Indonesia, dan berat badan lebih menurut batas WHO.',
          'BMR = 10 x 75 + 6,25 x 170 - 5 x 30 + 5 = 1.668 kkal.',
          'Kebutuhan kalori = 1.667,5 x 1,76 = sekitar 2.935 kkal per hari.',
          'Berat normal untuk tinggi 170 cm: 53,5 sampai 72,3 kg.',
        ],
        true,
      ),
      h2('Cara membaca hasilnya'),
      p(
        'IMT adalah alat skrining yang cepat, bukan diagnosis. Hasil di luar kategori normal adalah tanda untuk memeriksakan diri, bukan kesimpulan tentang kesehatanmu. Orang yang berotot bisa tergolong gemuk, sementara orang dengan IMT normal tetap bisa punya lemak perut berlebih.',
      ),
      h2('Cara memakai kalkulator ini'),
      daftar(
        [
          'Isi berat badan dalam kilogram dan tinggi badan dalam sentimeter.',
          'Isi usia dan jenis kelamin untuk menghitung energi basal.',
          'Pilih tingkat aktivitas yang paling sesuai dengan keseharianmu.',
        ],
        true,
      ),
      h2('Kapan perlu ke tenaga kesehatan'),
      p(
        'Periksakan diri ke puskesmas atau dokter bila IMT-mu di luar kategori normal, berat badanmu berubah banyak tanpa sebab yang jelas, atau kamu ingin menurunkan maupun menaikkan berat badan dengan aman. Kebutuhan kalori untuk program penurunan berat badan sebaiknya ditentukan bersama tenaga kesehatan.',
      ),
      h2('Untuk anak dan remaja'),
      p(
        'Kalkulator ini hanya untuk usia 18 tahun ke atas. Pada anak dan remaja, angka IMT yang sama bisa berarti hal berbeda tergantung umur dan jenis kelamin, sehingga penilaiannya memakai grafik IMT menurut umur yang dipakai tenaga kesehatan di posyandu dan puskesmas.',
      ),
      h2('Supaya angkanya akurat'),
      daftar([
        'Timbang berat badan di pagi hari dengan pakaian ringan dan tanpa alas kaki.',
        'Ukur tinggi badan sambil berdiri tegak tanpa alas kaki.',
        'Pilih tingkat aktivitas yang jujur. Kebanyakan pekerja kantor masuk kategori ringan.',
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
      h2('IP yang dibutuhkan untuk target IPK'),
      p('IP yang dibutuhkan = (target IPK x total SKS setelah semester depan - mutu sekarang) / SKS semester depan.'),
      daftar(
        [
          'IPK 3,34 dari 80 SKS berarti mutu 267,4. Semester depan 20 SKS.',
          'Target IPK 3,40: (3,40 x 100 - 267,4) / 20 = 3,63. Masih mungkin.',
          'Target IPK 3,50: (3,50 x 100 - 267,4) / 20 = 4,13. Di atas 4, jadi tidak mungkin dalam satu semester.',
        ],
        true,
      ),
      h2('Predikat kelulusan'),
      p(
        'Permendiktisaintek 39 Tahun 2025 menyerahkan kriteria predikat kelulusan, seperti dengan pujian, kepada masing-masing kampus. Aturan lama, Permendikbud 3 Tahun 2020, memakai IPK di atas 3,50 untuk predikat pujian, dan banyak kampus masih memakai batas itu ditambah syarat lulus tepat waktu.',
      ),
      h2('Beban satu SKS'),
      p(
        'Satu SKS setara 45 jam belajar per semester, termasuk tatap muka, tugas, dan belajar mandiri. Karena itu mata kuliah ber-SKS besar paling berpengaruh pada IPK, dan sebaiknya mendapat porsi belajar terbesar.',
      ),
      h2('Kesalahan yang sering terjadi'),
      daftar([
        'Membagi total mutu dengan jumlah mata kuliah, bukan jumlah SKS.',
        'Memakai konversi nilai antara dari kampus lain.',
        'Membulatkan IPK lama terlalu jauh sebelum digabung.',
        'Ikut menghitung mata kuliah yang hanya dinilai lulus atau tidak lulus.',
      ]),
      h2('IPS, IPK, dan transkrip'),
      p(
        'IP semester tercantum di kartu hasil studi (KHS) setiap akhir semester. IPK adalah angka yang dibawa terus sampai lulus dan tercetak di transkrip. Kalau kamu mengulang mata kuliah, cek di pedoman akademik apakah nilai yang dipakai adalah nilai terbaik atau nilai terakhir, karena SKS mata kuliah itu hanya dihitung sekali.',
      ),
      h2('IPK di luar kampus'),
      p(
        'Banyak beasiswa dan lowongan kerja memasang syarat IPK minimal. Penerima beasiswa seperti KIP Kuliah juga dievaluasi setiap semester, jadi menjaga IP semester tetap stabil sama pentingnya dengan IPK akhir.',
      ),
      h2('Cara memakai kalkulator ini'),
      daftar(
        [
          'Isi SKS dan nilai huruf setiap mata kuliah dari KHS-mu. Tambah baris sesuai jumlah mata kuliah.',
          'Isi IPK dan total SKS sebelumnya bila ingin melihat IPK gabungan.',
          'Cocokkan tabel konversi nilai antara dengan pedoman akademik kampusmu.',
        ],
        true,
      ),
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
