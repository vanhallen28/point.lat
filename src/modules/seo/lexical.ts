/**
 * Pembaca JSON Lexical (Payload 3.92) untuk analisis SEO: teks per blok, subjudul, tautan, gambar.
 * Tidak bergantung pada paket Lexical supaya bisa dipakai di komponen admin tanpa menambah bundel.
 *
 * Node yang dikenali: `heading` (`tag` h1-h6), `link`/`autolink` (`fields.linkType` custom/internal,
 * `fields.url`, `fields.doc`), `upload` (`relationTo`, `value` berupa ID atau dokumen media),
 * `text`, `linebreak`, `tab`. Node lain (paragraf, list, quote, blok) ditelusuri anaknya.
 */

type NodeLexical = {
  type?: string
  text?: string
  tag?: string
  children?: NodeLexical[]
  fields?: { linkType?: string; url?: string; doc?: { relationTo?: string; value?: unknown } | null }
  relationTo?: string
  value?: unknown
}

export type IsiDokumen = { root?: { children?: unknown[] } } | null | undefined

export type Subjudul = { level: number; teks: string }

export type TautanIsi =
  | { internal: true; teks: string; url: string }
  | { internal: true; teks: string; docId: number | string; relationTo: string }
  | { internal: false; teks: string; url: string }

export type GambarIsi = { id?: number | string; alt?: string | null; width?: number | null }

const BLOK = new Set(['paragraph', 'heading', 'quote', 'listitem'])

function akar(isi: IsiDokumen): NodeLexical[] {
  const anak = isi?.root?.children
  return Array.isArray(anak) ? (anak as NodeLexical[]) : []
}

function jelajah(nodes: NodeLexical[], kunjungi: (node: NodeLexical) => boolean | void): void {
  for (const node of nodes) {
    if (kunjungi(node) === false) continue
    if (Array.isArray(node.children)) jelajah(node.children, kunjungi)
  }
}

/** Teks polos sebuah node beserta seluruh anaknya. */
export function teksNode(node: NodeLexical): string {
  if (node.type === 'text') return node.text ?? ''
  if (node.type === 'linebreak') return '\n'
  if (node.type === 'tab') return ' '
  return (node.children ?? []).map(teksNode).join('')
}

/** Teks per blok (paragraf, subjudul, kutipan, butir list), sesuai urutan tampil. */
export function teksIsi(isi: IsiDokumen): string[] {
  const hasil: string[] = []
  jelajah(akar(isi), (node) => {
    if (!node.type || !BLOK.has(node.type)) return
    const teks = teksNode(node).trim()
    if (teks) hasil.push(teks)
    return false
  })
  return hasil
}

export function judulBagian(isi: IsiDokumen): Subjudul[] {
  const hasil: Subjudul[] = []
  jelajah(akar(isi), (node) => {
    if (node.type !== 'heading') return
    const level = Number(/^h([1-6])$/.exec(node.tag ?? '')?.[1])
    if (level) hasil.push({ level, teks: teksNode(node).trim() })
    return false
  })
  return hasil
}

function asalSitus(urlSitus: string): string | null {
  try {
    return new URL(urlSitus).origin
  } catch {
    return null
  }
}

/**
 * Tautan di isi. Internal bila menunjuk dokumen (linkType internal), path relatif, atau domain situs.
 * Tautan jangkar (`#...`), `mailto:`, dan `tel:` diabaikan.
 */
export function tautanIsi(isi: IsiDokumen, urlSitus: string): TautanIsi[] {
  const asal = asalSitus(urlSitus)
  const hasil: TautanIsi[] = []
  jelajah(akar(isi), (node) => {
    if (node.type !== 'link' && node.type !== 'autolink') return
    const teks = teksNode(node).trim()
    const fields = node.fields ?? {}
    if (fields.linkType === 'internal' && fields.doc?.relationTo) {
      const nilai = fields.doc.value
      const docId = typeof nilai === 'object' && nilai ? (nilai as { id: number | string }).id : (nilai as number | string)
      if (docId !== undefined && docId !== null) {
        hasil.push({ internal: true, docId, relationTo: fields.doc.relationTo, teks })
      }
      return false
    }
    const url = (fields.url ?? '').trim()
    if (!url || url.startsWith('#') || /^(mailto|tel):/i.test(url)) return false
    if (url.startsWith('/') && !url.startsWith('//')) {
      hasil.push({ internal: true, url, teks })
      return false
    }
    try {
      const tujuan = new URL(url)
      hasil.push({ internal: tujuan.origin === asal, url, teks } as TautanIsi)
    } catch {
      // URL tidak valid tidak dihitung.
    }
    return false
  })
  return hasil
}

/** Gambar di isi. Node yang baru berisi ID (belum di-populate) hanya mengembalikan `id`. */
export function gambarIsi(isi: IsiDokumen): GambarIsi[] {
  const hasil: GambarIsi[] = []
  jelajah(akar(isi), (node) => {
    if (node.type !== 'upload' || node.relationTo !== 'media') return
    const nilai = node.value
    if (nilai && typeof nilai === 'object') {
      const media = nilai as GambarIsi
      hasil.push({ id: media.id, alt: media.alt, width: media.width })
    } else if (nilai !== undefined && nilai !== null) {
      hasil.push({ id: nilai as number | string })
    }
    return false
  })
  return hasil
}

/** ID media yang dipakai node gambar di isi dan belum di-populate. */
export function idGambarIsi(isi: IsiDokumen): (number | string)[] {
  return gambarIsi(isi)
    .filter((g) => g.alt === undefined && g.width === undefined && g.id !== undefined)
    .map((g) => g.id as number | string)
}

/**
 * Salinan isi dengan node gambar yang berisi ID diganti dokumen media dari `media`. Dipakai panel
 * SEO: form admin menyimpan upload Lexical sebagai ID, sedangkan analisis butuh alt dan lebar.
 */
export function isiDenganMedia<T extends IsiDokumen>(isi: T, media: Record<string, GambarIsi>): T {
  if (!isi?.root) return isi
  const ganti = (node: NodeLexical): NodeLexical => {
    if (node.type === 'upload' && node.relationTo === 'media' && (typeof node.value === 'number' || typeof node.value === 'string')) {
      const doc = media[String(node.value)]
      return doc ? { ...node, value: doc } : node
    }
    return Array.isArray(node.children) ? { ...node, children: node.children.map(ganti) } : node
  }
  return { ...isi, root: { ...isi.root, children: akar(isi).map(ganti) } }
}
