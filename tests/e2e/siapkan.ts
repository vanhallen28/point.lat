import config from '@payload-config'
import { getPayload } from 'payload'
import sharp from 'sharp'

import { pakaiKlien } from '@/modules/media'
import type { Halaman } from '@/payload-types'
import { klienPalsu } from '@/modules/media/palsu'
import { seed } from '@/seed/seed'

import {
  ADMIN_E2E,
  ADS_TXT_E2E,
  blok,
  gambar,
  h2,
  HARI_CONTOH,
  isi,
  JUDUL_PANDUAN,
  KLIK_CONTOH,
  KUNCI_INDEXNOW,
  p,
  PENERBIT_E2E,
  SLUG,
  SLUG_HALAMAN,
  SLUG_SUB,
  SLUG_VIDEO,
  tautanKe,
} from './data'

/**
 * Mengisi database E2E sebelum server dibangun dan dinyalakan (`webServer` di playwright.config.ts).
 * Konten lama dihapus dulu supaya setiap run sama. Media disimpan lewat klien palsu bernama `e2e`
 * (sama dengan `CLOUDINARY_CLOUD_NAME` server E2E), jadi tidak ada panggilan jaringan.
 */
pakaiKlien(klienPalsu('e2e'))
const payload = await getPayload({ config })

const KOLEKSI_DIBERSIHKAN = [
  'artikel',
  'tools',
  'parameter-tools',
  'video',
  'subkategori',
  'redirect',
  'log-404',
  'media',
  'antrean-indexing',
  'log-indexing',
  'status-indeks',
  'analitik-halaman',
  'analitik-situs',
  'tugas-seo',
  'log-ai',
  'pemakaian-ai',
] as const
for (const koleksi of KOLEKSI_DIBERSIHKAN) {
  await payload.delete({ collection: koleksi, where: { id: { exists: true } } })
}
await seed(payload, { emailAdmin: ADMIN_E2E.email, passwordAdmin: ADMIN_E2E.password })

const pilar = Object.fromEntries((await payload.find({ collection: 'pilar', limit: 10 })).docs.map((d) => [d.slug, d.id]))
const redaksi = (await payload.find({ collection: 'penulis', where: { slug: { equals: 'redaksi' } }, limit: 1 })).docs[0]

await payload.update({
  collection: 'pilar',
  id: pilar['uang-karier'],
  data: { intro: isi(p('Mulai dari gaji bersih, lalu atur tabungan dan utang. Setiap panduan punya contoh hitung.')) },
})
const pajak = await payload.create({
  collection: 'subkategori',
  data: { nama: 'Pajak', slug: SLUG_SUB.pajak, pilar: pilar['uang-karier'], deskripsi: 'PPh 21, PTKP, dan lapor SPT tahunan.' },
})

async function buatGambar(alt: string, warna: string) {
  const data = await sharp({ create: { width: 1600, height: 900, channels: 3, background: warna } }).png().toBuffer()
  return payload.create({
    collection: 'media',
    data: { alt, caption: 'Ilustrasi', kredit: 'Foto: Redaksi point.' },
    file: { data, mimetype: 'image/png', name: `${alt.toLowerCase().replace(/\W+/g, '-')}.png`, size: data.length },
  })
}

const slip = await buatGambar('Slip gaji karyawan', '#1F7A4D')
const kasur = await buatGambar('Kamar tidur yang gelap', '#FF8A80')
const logo = await buatGambar('Logo redaksi point.', '#111111')

// Profil penulis lengkap untuk halaman /penulis/redaksi.
await payload.update({
  collection: 'penulis',
  id: redaksi.id,
  data: { foto: logo.id, keahlian: ['Pajak penghasilan', 'Gizi'], tautan: [{ label: 'Instagram', url: 'https://www.instagram.com/point.lat' }] },
})

const dasar = { _status: 'published' as const, penulis: redaksi.id, gambarUtama: slip.id }

// Video vertikal: file MP4 kecil lewat klien palsu (1080x1920, 30 detik). Tanpa poster unggahan,
// kartu memakai frame video dari Cloudinary.
async function buatVideo({
  pilar: slugPilar,
  draf = false,
  ...data
}: {
  judul: string
  slug: string
  pilar: string
  durasiDetik: number
  transkrip: string
  takarir?: string
  draf?: boolean
}) {
  const isiMp4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.from([0, 0, 2, 0]), Buffer.from('isommp41'), Buffer.from([0, 0, 0, 8]), Buffer.from('free')])
  const file = await payload.create({ collection: 'media', data: {}, file: { data: isiMp4, mimetype: 'video/mp4', name: `${data.slug}.mp4`, size: isiMp4.length } })
  return payload.create({
    collection: 'video',
    draft: draf,
    data: { ...data, _status: draf ? 'draft' : 'published', pilar: pilar[slugPilar], file: file.id },
  })
}

const videoPph21 = await buatVideo({
  judul: 'PPh 21 dijelaskan dengan satu slip gaji',
  slug: SLUG_VIDEO.pph21,
  pilar: 'uang-karier',
  durasiDetik: 45,
  transkrip: 'Ambil slip gaji bulan lalu.\n\nCari baris PPh 21 di slip gajimu. Angka itu dipotong setiap bulan memakai tarif efektif.',
  takarir: 'WEBVTT\n\n00:00.000 --> 00:03.000\nAmbil slip gaji bulan lalu.\n\n00:03.000 --> 00:08.000\nCari baris PPh 21 di slip gajimu.',
})
await buatVideo({
  judul: 'Kenapa kode OTP tidak boleh dibagikan',
  slug: SLUG_VIDEO.otp,
  pilar: 'tekno',
  durasiDetik: 38,
  transkrip: 'Kode OTP adalah kunci terakhir akunmu.\n\nPetugas resmi tidak pernah memintanya.',
})
await buatVideo({ judul: 'Video yang belum terbit', slug: SLUG_VIDEO.draf, pilar: 'sehat', durasiDetik: 30, transkrip: 'Draf.', draf: true })

const explainer = await payload.create({
  collection: 'artikel',
  data: {
    ...dasar,
    judul: 'Apa itu TER PPh 21 dan kenapa potongan gajimu berubah',
    slug: SLUG.explainer,
    tipe: 'explainer',
    pilar: pilar['uang-karier'],
    subkategori: pajak.id,
    deck: 'Sejak 2024 pemotongan PPh 21 bulanan memakai tarif efektif rata-rata. Ini yang berubah di slip gajimu.',
    intinya: [
      { poin: 'TER adalah tarif efektif rata-rata untuk memotong PPh 21 setiap bulan.' },
      { poin: 'Di bulan Desember pajak setahun dihitung ulang dengan tarif Pasal 17.' },
    ],
    isi: isi(p('TER membuat potongan bulanan lebih sederhana: satu persentase dikalikan penghasilan bruto sebulan.')),
  },
})

const panduan = await payload.create({
  collection: 'artikel',
  data: {
    ...dasar,
    judul: JUDUL_PANDUAN,
    slug: SLUG.panduan,
    tipe: 'panduan',
    pilar: pilar['uang-karier'],
    subkategori: pajak.id,
    deck: 'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS. Begini cara menghitungnya langkah demi langkah.',
    intinya: [
      { poin: 'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS yang ditanggung karyawan.' },
      { poin: 'PPh 21 bulanan memakai tarif efektif rata-rata (TER) sesuai status PTKP.' },
      { poin: 'Iuran BPJS karyawan: Kesehatan 1%, JHT 2%, dan JP 1% dari gaji.' },
    ],
    isi: isi(
      p('Angka di slip gaji sering membingungkan. Panduan ini menjelaskan setiap potongan dari gaji kotor sampai yang masuk rekening.'),
      h2('Komponen potongan gaji'),
      p('Ada dua kelompok potongan: pajak penghasilan (PPh 21) dan iuran jaminan sosial (BPJS Kesehatan dan BPJS Ketenagakerjaan).'),
      blok({ blockType: 'callout', gaya: 'tips', judul: 'Siapkan slip gaji', isi: 'Cocokkan setiap angka di panduan ini dengan slip gajimu bulan lalu.' }),
      h2('Cara menghitung PPh 21 dengan TER'),
      p('Kategori TER ditentukan status PTKP. Penjelasan lengkapnya ada di ', tautanKe('artikel', explainer.id, 'artikel tentang TER'), '.'),
      blok({
        blockType: 'tabelPerbandingan',
        judul: 'Status PTKP dan kategori TER',
        kolom: [{ label: 'Status PTKP' }, { label: 'Kategori TER' }],
        baris: [{ sel: [{ teks: 'TK/0' }, { teks: 'A' }] }, { sel: [{ teks: 'K/1' }, { teks: 'B' }] }, { sel: [{ teks: 'K/3' }, { teks: 'C' }] }],
      }),
      h2('Contoh hitung'),
      p('Misalnya gaji kotor Rp8.000.000 dengan status TK/0. Iuran BPJS karyawan 4% atau Rp320.000.'),
      gambar(slip.id),
      p('Sisa setelah iuran dan PPh 21 bulanan itulah gaji bersihmu.'),
    ),
    faq: [{ pertanyaan: 'Apakah THR ikut dipotong PPh 21?', jawaban: 'Ya. THR menambah penghasilan bruto bulan dibayarkan, jadi PPh 21 bulan itu ikut naik.' }],
    sumber: [
      { judul: 'Direktorat Jenderal Pajak', url: 'https://www.pajak.go.id/', penerbit: 'DJP', diaksesPada: '2026-11-01T00:00:00.000Z' },
      { judul: 'BPJS Ketenagakerjaan', url: 'https://www.bpjsketenagakerjaan.go.id/', penerbit: 'BPJS Ketenagakerjaan' },
    ],
    artikelTerkait: [explainer.id],
    videoTerkait: videoPph21.id,
  },
})

const sehat = await payload.create({
  collection: 'artikel',
  data: {
    ...dasar,
    gambarUtama: kasur.id,
    judul: 'Butuh tidur berapa jam? Beda per usia',
    slug: SLUG.sehat,
    tipe: 'explainer',
    pilar: pilar.sehat,
    deck: 'Kebutuhan tidur berubah sesuai usia. Orang dewasa umumnya butuh tujuh jam atau lebih setiap malam.',
    intinya: [{ poin: 'Dewasa umumnya butuh 7 jam atau lebih per malam.' }, { poin: 'Remaja butuh lebih banyak, sekitar 8 sampai 10 jam.' }],
    isi: isi(p('Tidur cukup membantu konsentrasi, suasana hati, dan daya tahan tubuh.')),
  },
})

const istilah = [
  { judul: 'PTKP', slug: 'ptkp', pilar: 'uang-karier', definisi: 'PTKP adalah penghasilan tidak kena pajak, bagian penghasilan yang tidak dipotong PPh 21.' },
  { judul: 'TER', slug: 'ter', pilar: 'uang-karier', definisi: 'TER adalah tarif efektif rata-rata untuk memotong PPh 21 setiap bulan.' },
  { judul: 'BMI', slug: 'bmi', pilar: 'sehat', definisi: 'BMI adalah indeks massa tubuh, berat badan dibagi kuadrat tinggi badan.' },
]
for (const i of istilah) {
  await payload.create({
    collection: 'artikel',
    data: {
      ...dasar,
      judul: i.judul,
      slug: i.slug,
      tipe: 'glosarium',
      pilar: pilar[i.pilar],
      deck: i.definisi,
      intinya: [{ poin: i.definisi }, { poin: 'Penjelasan lengkap dan contohnya ada di panduan terkait.' }],
      isi: isi(p(i.definisi)),
      artikelTerkait: [panduan.id],
    },
  })
}

await payload.create({
  collection: 'artikel',
  draft: true,
  data: { ...dasar, _status: 'draft', judul: 'Draf yang belum terbit', slug: SLUG.draf, tipe: 'panduan', pilar: pilar['uang-karier'], deck: 'Draf.', intinya: [{ poin: 'Satu.' }, { poin: 'Dua.' }], isi: isi(p('Draf.')) },
})

// Slug artikel terbit diganti: hook Rencana 1 membuat redirect otomatis dari path lama.
const danaDarurat = await payload.create({
  collection: 'artikel',
  data: {
    ...dasar,
    judul: 'Cara menyiapkan dana darurat',
    slug: SLUG.danaDaruratLama,
    tipe: 'panduan',
    pilar: pilar['uang-karier'],
    deck: 'Dana darurat idealnya tiga sampai enam kali pengeluaran bulanan.',
    intinya: [{ poin: 'Dana darurat untuk kebutuhan mendadak, bukan untuk belanja.' }, { poin: 'Simpan di tempat yang mudah dicairkan.' }],
    isi: isi(p('Mulai dari target kecil, lalu tambah setiap bulan.')),
  },
})
await payload.update({ collection: 'artikel', id: danaDarurat.id, data: { _status: 'published', slug: SLUG.danaDarurat } })

// Kalkulator dari seed (draf, lengkap dengan penjelasan dan parameter): keenamnya diterbitkan.
for (const toolId of ['gaji-bersih', 'thr', 'cicilan-kpr', 'dana-darurat', 'bmi-kalori', 'ipk']) {
  const { docs } = await payload.find({ collection: 'tools', where: { toolId: { equals: toolId } }, draft: true, limit: 1 })
  await payload.update({ collection: 'tools', id: docs[0].id, data: { _status: 'published' } })
}

// Halaman statis dari seed (draf) diterbitkan dengan blok page builder.
async function terbitkanHalaman(slug: string, tataLetak: NonNullable<Halaman['tataLetak']>) {
  const { docs } = await payload.find({ collection: 'halaman', where: { slug: { equals: slug } }, draft: true, limit: 1 })
  await payload.update({ collection: 'halaman', id: docs[0].id, data: { _status: 'published', tataLetak } })
}

await terbitkanHalaman(SLUG_HALAMAN.tentang, [
  {
    blockType: 'hero',
    judul: 'Intinya dulu, lalu bisa kamu hitung sendiri',
    subjudul: 'point. menjelaskan uang, karier, teknologi, pendidikan, dan kesehatan untuk pembaca Indonesia.',
  },
  { blockType: 'teks', isi: isi(h2('Siapa kami'), p('Redaksi kecil yang menulis dari intinya, dengan sumber yang bisa kamu periksa.')) },
  {
    blockType: 'kartu',
    judul: 'Prinsip kami',
    kartu: [
      { judul: 'Lugas', teks: 'Jawaban ada di kalimat pertama.' },
      { judul: 'Cermat', teks: 'Angka bersumber dan bertanggal.' },
      { judul: 'Akrab', teks: 'Bahasa sehari-hari, tanpa istilah yang tidak perlu.' },
    ],
  },
  { blockType: 'cta', judul: 'Ada yang keliru?', teks: 'Kabari redaksi, kami periksa dan perbaiki.', labelTombol: 'Baca kebijakan redaksi', tautan: '/kebijakan-redaksi' },
  { blockType: 'faqBlok', judul: 'Tanya jawab', faq: [{ pertanyaan: 'Apakah point. menerima tulisan tamu?', jawaban: 'Belum. Semua tulisan ditulis dan diperiksa redaksi.' }] },
])
await terbitkanHalaman(SLUG_HALAMAN.kebijakanRedaksi, [
  { blockType: 'teks', isi: isi(h2('Sumber dan koreksi'), p('Setiap angka di point. punya sumber. Koreksi dicatat di akhir tulisan.')) },
])

// Beranda: artikel Belajar dan Tekno untuk mozaik, newsletter aktif ke form penyedia (tidak pernah dibuka tes).
const belajar = await payload.create({
  collection: 'artikel',
  data: {
    ...dasar,
    judul: 'Jadwal SNBT 2027 dan apa yang berubah',
    slug: SLUG.belajar,
    tipe: 'explainer',
    pilar: pilar.belajar,
    deck: 'Pendaftaran SNBT 2027 punya tiga tanggal penting. Ini yang perlu kamu catat.',
    intinya: [{ poin: 'Catat tiga tanggal ini sebelum mendaftar.' }, { poin: 'Siapkan akun SNPMB lebih awal.' }],
    isi: isi(p('Jadwal resmi diumumkan panitia SNPMB.')),
  },
})
const tekno = await payload.create({
  collection: 'artikel',
  data: {
    ...dasar,
    judul: 'Cara mengenali penipuan yang memakai suara AI',
    slug: SLUG.tekno,
    tipe: 'panduan',
    pilar: pilar.tekno,
    deck: 'Suara keluarga bisa ditiru AI. Begini cara memastikan yang menelepon benar-benar dia.',
    intinya: [{ poin: 'Tutup telepon, lalu hubungi balik lewat nomor resmi.' }, { poin: 'Sepakati kata sandi keluarga.' }],
    isi: isi(p('Penipu cukup butuh beberapa detik rekaman suara.')),
  },
})
await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kunciIndexNow: KUNCI_INDEXNOW } } })
// Asisten AI menyala dengan anggaran bawaan, apa pun yang diubah tes sebelumnya (E2E kedua memakai database yang sama).
await payload.updateGlobal({ slug: 'asisten-ai', data: { aktif: true, anggaranBulanan: 10 } })
// Iklan menyala dengan ID penerbit tiruan, apa pun yang diubah tes sebelumnya (E2E kedua memakai database yang
// sama). Semua spec berjalan dengan banner persetujuan; skrip AdSense hanya dimuat setelah Izinkan semua, dan
// tes yang memilihnya mencegat domain Google, jadi tidak ada permintaan jaringan.
await payload.updateGlobal({
  slug: 'iklan',
  data: {
    aktif: true,
    penyedia: 'adsense',
    idPenerbit: PENERBIT_E2E,
    modeUji: true,
    slot: [
      { idSlot: 'artikel-tengah', posisi: 'artikel-tengah', setelahParagraf: 3, ukuran: 'persegi', unit: '1111111111', aktif: true },
      { idSlot: 'artikel-akhir', posisi: 'artikel-akhir', ukuran: 'persegi-besar', unit: '2222222222', aktif: true },
    ],
    adsTxtTambahan: ADS_TXT_E2E,
  },
})
await payload.updateGlobal({
  slug: 'newsletter',
  data: { aktif: true, penyedia: 'kit', urlForm: 'https://point.kit.com/intinya', judul: 'Intinya, tiap Senin.', deskripsi: 'Lima tulisan terbaik pekan ini, langsung ke email.' },
})
await payload.updateGlobal({
  slug: 'beranda',
  data: {
    tataLetak: [
      {
        blockType: 'heroBeranda',
        judul: 'Intinya dulu.',
        subjudul: 'Uang, karier, teknologi, pendidikan, dan kesehatan. Dijelaskan dari intinya, lalu bisa langsung kamu hitung.',
        placeholderCari: 'misal: cara hitung THR',
      },
      { blockType: 'mozaikPilihan', artikel: [panduan.id, belajar.id, sehat.id, tekno.id] },
      { blockType: 'stripVideo', judul: 'Intinya dalam 45 detik' },
      { blockType: 'palingDibaca', judul: 'Paling dicari pekan ini', jumlah: 4 },
      { blockType: 'slotIklan', idSlot: 'beranda-samping' },
      { blockType: 'newsletterBlok' },
    ],
  },
})

for (const [path, klik7] of KLIK_CONTOH) {
  await payload.create({
    collection: 'analitik-halaman',
    data: { path, klik7, impresi7: klik7 * 10, klik28: klik7 * 4, impresi28: klik7 * 40, ctr28: 0.1, posisi28: 6.4, sampai: '2026-11-02' },
  })
}
for (const hari of HARI_CONTOH) await payload.create({ collection: 'analitik-situs', data: hari })
// Seolah sinkron hari ini sudah berhasil: cron selama E2E tidak menjalankannya lagi (adapter palsu melewatinya).
await payload.create({
  collection: 'tugas-seo',
  data: {
    jenis: 'analitik',
    status: 'berhasil',
    pesan: 'Data sampai 2026-11-02: 7 halaman.',
    selesai: new Date().toISOString(),
    berikutnya: new Date(Date.now() + 86_400_000).toISOString(),
  },
})

await payload.create({ collection: 'redirect', data: { dari: '/promo-lama', ke: '/glosarium', kode: '301' } })
await payload.create({ collection: 'redirect', data: { dari: '/glosarium/ptkp-lama', ke: '/glosarium/ptkp', kode: '301' } })
await payload.create({ collection: 'redirect', data: { dari: '/tulisan-dihapus', kode: '410' } })

payload.logger.info('Data E2E siap.')
process.exit(0)
