/**
 * Pembuat data contoh untuk tes modul SEO. Bukan file tes (tidak berakhiran `.test.ts`).
 * Bentuk node mengikuti JSON Lexical yang disimpan Payload 3.92 (`paragraph`, `heading`,
 * `link`, `upload`).
 */

type Anak = string | Record<string, unknown>

const teks = (text: string) => ({ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 })

const anak = (isi: Anak[]) => isi.map((a) => (typeof a === 'string' ? teks(a) : a))

export const p = (...isi: Anak[]) => ({ type: 'paragraph', version: 1, children: anak(isi) })

export const h = (tag: 'h1' | 'h2' | 'h3' | 'h4', ...isi: Anak[]) => ({ type: 'heading', tag, version: 1, children: anak(isi) })

export const tautan = (url: string, label: string) => ({
  type: 'link',
  version: 3,
  fields: { linkType: 'custom', newTab: false, url },
  children: [teks(label)],
})

export const tautanInternal = (id: number, label: string, relationTo = 'artikel') => ({
  type: 'link',
  version: 3,
  fields: { linkType: 'internal', newTab: false, doc: { relationTo, value: id } },
  children: [teks(label)],
})

export const unggahan = (media: number | { id: number; alt?: string | null; width?: number | null }) => ({
  type: 'upload',
  version: 3,
  id: 'node-unggahan',
  fields: {},
  relationTo: 'media',
  value: media,
})

export const isiLexical = (children: Record<string, unknown>[]) => ({
  root: { type: 'root', version: 1, direction: 'ltr' as const, format: '' as const, indent: 0, children },
})

/** Paragraf berisi `jumlah` kata "kata". */
export const kalimatPanjang = (jumlah: number) => `${Array.from({ length: jumlah }, () => 'kata').join(' ')}.`

// Dokumen contoh (bentuk hasil `find` Payload dengan depth 1).

export const situs = {
  namaSitus: 'point.',
  urlSitus: 'https://point.lat',
  polaJudul: '%s · point.',
  metaDefault: 'Intinya dulu. Uang, karier, teknologi, pendidikan, dan kesehatan dijelaskan dari intinya.',
  organisasi: { nama: 'point.lat', logo: { id: 1, publicId: 'point/gambar/logo', alt: 'Logo point.', width: 512, height: 512 }, sameAs: ['https://www.instagram.com/point.lat'] },
  verifikasi: { google: 'kode-google', bing: null },
  cloudName: 'demo',
}

export const pilarUang = { id: 1, nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau' as const, deskripsi: 'Gaji, pajak, tabungan, utang, dan karier.' }

export const penulis = { id: 3, nama: 'Rani Wulandari', slug: 'rani-wulandari', bio: 'Menulis soal pajak dan gaji.', keahlian: ['Pajak penghasilan'], tautan: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/in/rani' }] }

export const gambarUtama = { id: 5, publicId: 'point/gambar/slip-gaji-1a2b3c4d', jenis: 'gambar' as const, alt: 'Slip gaji karyawan', width: 1600, height: 900 }

export const artikel = {
  id: 10,
  judul: 'Cara hitung gaji bersih',
  slug: 'cara-hitung-gaji-bersih',
  tipe: 'panduan' as const,
  deck: 'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS. Begini cara menghitungnya langkah demi langkah, lengkap dengan contoh untuk karyawan tetap berstatus lajang tanpa tanggungan.',
  pilar: pilarUang,
  subkategori: { id: 2, nama: 'Pajak', slug: 'pajak', pilar: pilarUang },
  penulis,
  gambarUtama,
  terbitPada: '2026-11-02T03:00:00.000Z',
  diperbaruiBesar: null,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-03T08:00:00.000Z',
  seo: { keyphrase: 'gaji bersih', tipeSchema: 'otomatis' as const },
}
