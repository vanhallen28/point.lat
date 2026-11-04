import config from '@payload-config'
import { getPayload } from 'payload'
import sharp from 'sharp'

import { pakaiKlien } from '@/modules/media'
import { klienPalsu } from '@/modules/media/palsu'
import { seed } from '@/seed/seed'

import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, p, SLUG, SLUG_SUB, tautanKe } from './data'

/**
 * Mengisi database E2E sebelum server dibangun dan dinyalakan (`webServer` di playwright.config.ts).
 * Konten lama dihapus dulu supaya setiap run sama. Media disimpan lewat klien palsu bernama `e2e`
 * (sama dengan `CLOUDINARY_CLOUD_NAME` server E2E), jadi tidak ada panggilan jaringan.
 */
pakaiKlien(klienPalsu('e2e'))
const payload = await getPayload({ config })

for (const koleksi of ['artikel', 'subkategori', 'redirect', 'log-404', 'media'] as const) {
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

const dasar = { _status: 'published' as const, penulis: redaksi.id, gambarUtama: slip.id }

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
  },
})

await payload.create({
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

await payload.create({ collection: 'redirect', data: { dari: '/promo-lama', ke: '/glosarium', kode: '301' } })
await payload.create({ collection: 'redirect', data: { dari: '/glosarium/ptkp-lama', ke: '/glosarium/ptkp', kode: '301' } })
await payload.create({ collection: 'redirect', data: { dari: '/tulisan-dihapus', kode: '410' } })

payload.logger.info('Data E2E siap.')
process.exit(0)
