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
