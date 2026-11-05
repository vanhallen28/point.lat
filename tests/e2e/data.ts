/** Data tetap untuk E2E. Database E2E hanya untuk tes lokal, jadi kredensial ini bukan rahasia. */
export const ADMIN_E2E = { email: 'e2e@point.lat', password: 'e2e-hanya-untuk-tes-lokal' }

export const UKURAN_LAYAR = [
  { lebar: 375, tinggi: 812 },
  { lebar: 768, tinggi: 1024 },
  { lebar: 1440, tinggi: 900 },
] as const

/** Slug konten contoh yang dibuat `siapkan.ts`. */
export const SLUG = {
  panduan: 'cara-hitung-gaji-bersih',
  explainer: 'apa-itu-ter-pph-21',
  sehat: 'butuh-tidur-berapa-jam',
  draf: 'draf-belum-terbit',
  danaDarurat: 'cara-menyiapkan-dana-darurat',
  belajar: 'jadwal-snbt-2027',
  tekno: 'penipuan-suara-ai',
  danaDaruratLama: 'dana-darurat-lama',
} as const

/** Enam kalkulator dari seed, diterbitkan `siapkan.ts`, dengan angka utama hasil contoh dari server. */
export const TOOLS_CONTOH = [
  { slug: 'gaji-bersih', nama: 'Gaji Bersih', utama: 'Rp\u00a07.554.552' },
  { slug: 'thr', nama: 'THR', utama: 'Rp\u00a06.500.000' },
  { slug: 'cicilan-kpr', nama: 'Cicilan & KPR', utama: 'Rp\u00a03.708.049' },
  { slug: 'dana-darurat', nama: 'Dana Darurat', utama: 'Rp\u00a030.000.000' },
  { slug: 'bmi-kalori', nama: 'BMI & Kalori', utama: '22,0' },
  { slug: 'ipk', nama: 'IPK', utama: '3,56' },
] as const

/** Subkategori contoh di bawah pilar Uang & Karier. */
export const SLUG_SUB = { pajak: 'pajak' } as const

/** Halaman statis dari seed yang diterbitkan `siapkan.ts`; halaman seed lain tetap draf. */
export const SLUG_HALAMAN = { tentang: 'tentang', kebijakanRedaksi: 'kebijakan-redaksi', draf: 'pasang-iklan' } as const

/** Video contoh: dua terbit (PPh 21 lebih dulu dibuat), satu draf. */
export const SLUG_VIDEO = { pph21: 'pph-21-satu-slip-gaji', otp: 'kode-otp-jangan-dibagikan', draf: 'video-draf' } as const

/**
 * Klik Google 7 hari contoh (bentuk hasil sinkron Search Analytics) yang diisi `siapkan.ts`. Beranda
 * dan halaman 404 menampilkan "Paling dicari pekan ini" dengan urutan `POPULER`; glosarium, beranda,
 * dan tools tidak ikut karena bukan tulisan.
 */
export const KLIK_CONTOH: [path: string, klik7: number][] = [
  ['/', 90],
  ['/glosarium/ptkp', 60],
  [`/${SLUG.danaDarurat}`, 40],
  ['/tools/gaji-bersih', 30],
  [`/${SLUG.explainer}`, 25],
  [`/${SLUG.tekno}`, 12],
  [`/${SLUG.panduan}`, 7],
]
export const POPULER = [SLUG.danaDarurat, SLUG.explainer, SLUG.tekno, SLUG.panduan] as const

/** Total harian properti 28 hari sampai 2 November 2026 (data final terakhir) untuk dashboard SEO. */
export const HARI_CONTOH = Array.from({ length: 28 }, (_, i) => {
  const tanggal = new Date(Date.UTC(2026, 9, 6 + i)).toISOString().slice(0, 10)
  const klik = 40 + ((i * 37) % 60)
  return { tanggal, klik, impresi: klik * 150, ctr: 1 / 150, posisi: 8 - i / 10 }
})

/** Kunci IndexNow di pengaturan SEO database E2E, dilayani di `/{kunci}.txt`. */
export const KUNCI_INDEXNOW = 'e2e-kunci-indexnow-2026'

export const JUDUL_PANDUAN = 'Cara hitung gaji bersih setelah PPh 21 dan BPJS'

// Pembuat JSON Lexical minimal (bentuk yang disimpan Payload 3.92).
type Node = Record<string, unknown>

const teks = (text: string): Node => ({ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 })

const anak = (isi: (string | Node)[]) => isi.map((a) => (typeof a === 'string' ? teks(a) : a))

export const p = (...isi: (string | Node)[]): Node => ({
  type: 'paragraph',
  format: '',
  indent: 0,
  version: 1,
  direction: 'ltr',
  textFormat: 0,
  children: anak(isi),
})

export const h2 = (judul: string): Node => ({ type: 'heading', tag: 'h2', format: '', indent: 0, version: 1, direction: 'ltr', children: [teks(judul)] })

export const tautanKe = (relationTo: string, id: number, label: string): Node => ({
  type: 'link',
  format: '',
  indent: 0,
  version: 3,
  direction: 'ltr',
  fields: { linkType: 'internal', newTab: false, doc: { relationTo, value: id } },
  children: [teks(label)],
})

export const gambar = (id: number): Node => ({ type: 'upload', version: 3, format: '', id: `unggahan-${id}`, fields: null, relationTo: 'media', value: id })

export const blok = (fields: Node): Node => ({ type: 'block', version: 2, format: '', fields: { id: `blok-${String(fields.blockType)}`, blockName: '', ...fields } })

export const isi = (...children: Node[]) => ({
  root: { type: 'root', format: '' as const, indent: 0, version: 1, direction: 'ltr' as const, children: children as { type: string; version: number }[] },
})
