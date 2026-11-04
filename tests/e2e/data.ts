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
  danaDaruratLama: 'dana-darurat-lama',
} as const

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
