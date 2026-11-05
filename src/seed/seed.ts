import type { Payload } from 'payload'

import type { WarnaPilar } from '@/lib/konstanta'
import { paragrafLexical } from '@/lib/lexical'

import { seedTools } from './tools'

export const PILAR_AWAL: {
  nama: string
  slug: string
  warna: WarnaPilar
  deskripsi: string
  urutan: number
  disclaimer?: string
}[] = [
  {
    nama: 'Uang & Karier',
    slug: 'uang-karier',
    warna: 'hijau',
    deskripsi: 'Gaji, pajak, tabungan, utang, dan karier.',
    urutan: 1,
    disclaimer:
      'Tulisan ini untuk edukasi, bukan saran keuangan, pajak, atau hukum untuk kondisimu. Aturan dan angka bisa berubah, jadi cek sumber resmi atau tanya ahli sebelum mengambil keputusan.',
  },
  { nama: 'Tekno', slug: 'tekno', warna: 'oranye', deskripsi: 'AI, aplikasi, gadget, dan keamanan digital.', urutan: 2 },
  { nama: 'Belajar', slug: 'belajar', warna: 'kuning', deskripsi: 'Sekolah, kuliah, ujian masuk, dan beasiswa.', urutan: 3 },
  {
    nama: 'Sehat',
    slug: 'sehat',
    warna: 'koral',
    deskripsi: 'Gizi, olahraga, tidur, dan kebiasaan sehat.',
    urutan: 4,
    disclaimer:
      'Tulisan ini untuk edukasi, bukan pengganti diagnosis atau saran tenaga kesehatan. Bila kamu punya keluhan, periksakan diri ke dokter atau fasilitas kesehatan terdekat.',
  },
]

/** Halaman wajib. Dibuat sebagai draf: isinya harus ditulis pemilik sebelum terbit. */
export const HALAMAN_AWAL = [
  { judul: 'Tentang', slug: 'tentang' },
  { judul: 'Kebijakan Redaksi', slug: 'kebijakan-redaksi' },
  { judul: 'Pedoman Media Siber', slug: 'pedoman-media-siber' },
  { judul: 'Kebijakan Privasi', slug: 'kebijakan-privasi' },
  { judul: 'Pasang Iklan', slug: 'pasang-iklan' },
  { judul: 'Kontak', slug: 'kontak' },
] as const

export type OpsiSeed = { emailAdmin?: string; passwordAdmin?: string }

export type HasilSeed = { admin: 'dibuat' | 'sudah-ada' | 'dilewati'; pilar: number; halaman: number; tools: number; parameter: number }

/** Mengisi data awal. Aman dijalankan berkali-kali: dokumen dicari lewat slug dulu. */
export async function seed(payload: Payload, opsi: OpsiSeed = {}): Promise<HasilSeed> {
  const admin = await siapkanAdmin(payload, opsi)

  const idPilar: number[] = []
  for (const pilar of PILAR_AWAL) {
    const ada = await payload.find({ collection: 'pilar', where: { slug: { equals: pilar.slug } }, limit: 1 })
    const lama = ada.docs[0]
    const doc = lama ?? (await payload.create({ collection: 'pilar', data: pilar }))
    // Database yang dibuat sebelum field disclaimer ada ikut mendapat teks bawaan, tanpa menimpa isian editor.
    if (lama && pilar.disclaimer && !lama.disclaimer) {
      await payload.update({ collection: 'pilar', id: lama.id, data: { disclaimer: pilar.disclaimer } })
    }
    idPilar.push(doc.id)
  }

  // Kalkulator (draf) dan parameternya; tools butuh pilar yang sudah ada.
  const kalkulator = await seedTools(payload)

  const redaksi = await payload.find({ collection: 'penulis', where: { slug: { equals: 'redaksi' } }, limit: 1 })
  if (redaksi.totalDocs === 0) {
    await payload.create({
      collection: 'penulis',
      data: {
        nama: 'Redaksi point.',
        slug: 'redaksi',
        bio: 'Tim redaksi point.lat. Menulis dan memeriksa setiap tulisan sebelum terbit.',
      },
    })
  }

  for (const halaman of HALAMAN_AWAL) {
    const ada = await payload.find({
      collection: 'halaman',
      where: { slug: { equals: halaman.slug } },
      limit: 1,
      draft: true,
    })
    if (ada.totalDocs === 0) {
      await payload.create({
        collection: 'halaman',
        draft: true,
        data: {
          ...halaman,
          tataLetak: [
            { blockType: 'teks', isi: paragrafLexical([`Tulis isi halaman ${halaman.judul} di sini sebelum terbit.`]) },
          ],
        },
      })
    }
  }

  await payload.updateGlobal({
    slug: 'header',
    data: {
      menu: PILAR_AWAL.map((pilar, i) => ({ label: pilar.nama, jenis: 'pilar' as const, pilar: idPilar[i] })),
      tombolTools: { label: 'Tools', url: '/tools' },
    },
  })

  await payload.updateGlobal({
    slug: 'footer',
    data: {
      tautan: HALAMAN_AWAL.map((h) => ({ label: h.judul, url: `/${h.slug}` })),
      teksHakCipta: '© 2026 point.lat',
    },
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
        { blockType: 'palingDibaca', judul: 'Paling dicari pekan ini', jumlah: 4 },
        { blockType: 'newsletterBlok', judul: 'Intinya, tiap Senin.' },
      ],
    },
  })

  return { admin, pilar: PILAR_AWAL.length, halaman: HALAMAN_AWAL.length, ...kalkulator }
}

async function siapkanAdmin(payload: Payload, opsi: OpsiSeed): Promise<HasilSeed['admin']> {
  const { totalDocs } = await payload.count({ collection: 'pengguna' })
  if (totalDocs > 0) return 'sudah-ada'
  if (!opsi.emailAdmin || !opsi.passwordAdmin) return 'dilewati'
  await payload.create({
    collection: 'pengguna',
    data: { email: opsi.emailAdmin, password: opsi.passwordAdmin, nama: 'Admin point.', peran: 'admin' },
  })
  return 'dibuat'
}
