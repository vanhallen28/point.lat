import { createHash } from 'node:crypto'

import type { IsiLexical } from '@/lib/lexical'

/**
 * Markdown ringkas paket konten (spesifikasi §24) ke JSON Lexical yang diterima field `isi` artikel. Fungsi
 * murni: dokumen tujuan tautan internal dicari lewat `cari`, jadi hasilnya sama di tes dan saat impor.
 *
 * Yang dikenali (satu blok per baris kosong):
 * - `## Judul` dan `### Judul` menjadi H2 dan H3.
 * - Baris `- ` menjadi daftar butir, baris `1. ` menjadi daftar bernomor.
 * - Tabel pipa (`| a | b |`, baris kedua `|---|---|`) menjadi blok Tabel perbandingan; baris `Tabel: Judul`
 *   tepat di atasnya menjadi judul tabel.
 * - `> [!info|tips|peringatan] Judul` lalu baris `> isi` menjadi blok Callout.
 * - `[[tool:gaji-bersih]]` di baris sendiri menjadi blok Embed tool; `[[baca:slug]]` menjadi "Baca juga".
 * - Paragraf: baris yang berurutan digabung. Di dalam teks: `**tebal**`, `*miring*`, dan `[teks](tujuan)`.
 *
 * Tujuan tautan: `https://...` menjadi tautan biasa, `/tools/{toolId}` tautan internal ke tools, `/{slug}`
 * tautan internal ke artikel. Tujuan internal yang tidak ditemukan menjadi teks biasa, bukan tautan rusak.
 */

type Node = IsiLexical['root']['children'][number]

export type CariDokumen = {
  artikel: (slug: string) => number | string | null
  tools: (toolId: string) => number | string | null
}

export const GAYA_CALLOUT = ['info', 'tips', 'peringatan'] as const
type GayaCallout = (typeof GAYA_CALLOUT)[number]

const FORMAT_TEBAL = 1
const FORMAT_MIRING = 2

const dasar = { format: '' as const, indent: 0, version: 1, direction: 'ltr' as const }

function teks(text: string, format = 0): Node {
  return { type: 'text', text, format, detail: 0, mode: 'normal', style: '', version: 1 }
}

/** Id blok yang stabil: impor ulang dokumen yang sama menghasilkan JSON yang sama. */
function idBlok(benih: string): string {
  return createHash('sha1').update(benih).digest('hex').slice(0, 24)
}

/** Teks satu baris dengan `**tebal**`, `*miring*`, dan `[teks](tujuan)` menjadi node teks dan tautan. */
export function teksBaris(baris: string, cari: CariDokumen): Node[] {
  const hasil: Node[] = []
  const pola = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g
  let sisa = 0
  for (const cocok of baris.matchAll(pola)) {
    const awal = cocok.index ?? 0
    if (awal > sisa) hasil.push(teks(baris.slice(sisa, awal)))
    const [, label, tujuan, tebal, miring] = cocok
    if (label !== undefined && tujuan !== undefined) hasil.push(...tautan(label, tujuan, cari))
    else if (tebal !== undefined) hasil.push(teks(tebal, FORMAT_TEBAL))
    else if (miring !== undefined) hasil.push(teks(miring, FORMAT_MIRING))
    sisa = awal + cocok[0].length
  }
  if (sisa < baris.length) hasil.push(teks(baris.slice(sisa)))
  return hasil
}

function tautan(label: string, tujuan: string, cari: CariDokumen): Node[] {
  const anak = teksBaris(label, cari)
  if (/^https?:\/\//.test(tujuan)) {
    return [{ type: 'link', ...dasar, version: 3, fields: { linkType: 'custom', url: tujuan, newTab: false }, children: anak }]
  }
  const tools = /^\/tools\/([a-z0-9-]+)$/.exec(tujuan)
  const artikel = /^\/([a-z0-9-]+)$/.exec(tujuan)
  const doc = tools
    ? { relationTo: 'tools', value: cari.tools(tools[1]) }
    : artikel
      ? { relationTo: 'artikel', value: cari.artikel(artikel[1]) }
      : null
  if (!doc || doc.value === null) return anak
  return [{ type: 'link', ...dasar, version: 3, fields: { linkType: 'internal', newTab: false, doc }, children: anak }]
}

function paragraf(baris: string, cari: CariDokumen): Node {
  return { type: 'paragraph', ...dasar, textFormat: 0, textStyle: '', children: teksBaris(baris, cari) }
}

function judul(tag: 'h2' | 'h3', isi: string, cari: CariDokumen): Node {
  return { type: 'heading', tag, ...dasar, children: teksBaris(isi, cari) }
}

function daftar(butir: string[], urut: boolean, cari: CariDokumen): Node {
  return {
    type: 'list',
    listType: urut ? 'number' : 'bullet',
    start: 1,
    tag: urut ? 'ol' : 'ul',
    ...dasar,
    children: butir.map((b, i) => ({ type: 'listitem', value: i + 1, ...dasar, children: teksBaris(b, cari) })),
  }
}

function blok(benih: string, fields: Record<string, unknown>): Node {
  return { type: 'block', version: 2, format: '', fields: { id: idBlok(benih), blockName: '', ...fields } }
}

const selTabel = (baris: string) =>
  baris
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((s) => s.trim())

/**
 * Teks polos untuk isian blok: Callout dan sel tabel menyimpan teks, bukan rich text. Huruf tebal dan miring
 * dibuang; tautan ditolak, karena tautan yang hilang diam-diam mengurangi tautan internal artikel.
 */
function polos(baris: string): string {
  if (/\[[^\]]+\]\([^)\s]+\)/.test(baris)) throw new GalatMarkdown(`Tautan tidak bisa dipakai di callout atau tabel: "${baris}"`)
  return baris.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1')
}

/** Blok mentah: baris-baris yang dipisah baris kosong. */
function pecahBlok(markdown: string): string[][] {
  const hasil: string[][] = []
  let kini: string[] = []
  for (const baris of markdown.replace(/\r\n/g, '\n').split('\n')) {
    if (baris.trim() === '') {
      if (kini.length > 0) hasil.push(kini)
      kini = []
    } else {
      kini.push(baris.trimEnd())
    }
  }
  if (kini.length > 0) hasil.push(kini)
  return hasil
}

export class GalatMarkdown extends Error {}

/** Markdown paket ke isi Lexical. `benih` (biasanya slug) membuat id blok stabil dan unik per dokumen. */
export function markdownKeLexical(markdown: string, cari: CariDokumen, benih = ''): IsiLexical {
  const anak: Node[] = []
  for (const [i, baris] of pecahBlok(markdown).entries()) {
    const pertama = baris[0]
    const benihBlok = `${benih}:${i}`
    if (/^### /.test(pertama) && baris.length === 1) {
      anak.push(judul('h3', pertama.slice(4).trim(), cari))
    } else if (/^## /.test(pertama) && baris.length === 1) {
      anak.push(judul('h2', pertama.slice(3).trim(), cari))
    } else if (/^#{1}\s|^#{4,}\s/.test(pertama)) {
      throw new GalatMarkdown(`Hanya H2 (##) dan H3 (###) yang dipakai di isi: "${pertama}"`)
    } else if (baris.every((b) => /^- /.test(b))) {
      anak.push(daftar(baris.map((b) => b.slice(2).trim()), false, cari))
    } else if (baris.every((b) => /^\d+\. /.test(b))) {
      anak.push(daftar(baris.map((b) => b.replace(/^\d+\. /, '').trim()), true, cari))
    } else if (baris.some((b) => b.trim().startsWith('|'))) {
      anak.push(tabel(baris, benihBlok))
    } else if (/^> \[!/.test(pertama)) {
      anak.push(callout(baris, benihBlok))
    } else if (/^\[\[tool:[a-z0-9-]+\]\]$/.test(pertama) && baris.length === 1) {
      const toolId = pertama.slice(7, -2)
      const id = cari.tools(toolId)
      if (id !== null) anak.push(blok(benihBlok, { blockType: 'embedTool', tool: id }))
    } else if (/^\[\[baca:[a-z0-9-]+\]\]$/.test(pertama) && baris.length === 1) {
      const id = cari.artikel(pertama.slice(7, -2))
      if (id !== null) anak.push({ type: 'relationship', version: 2, format: '', relationTo: 'artikel', value: id })
    } else {
      anak.push(paragraf(baris.join(' '), cari))
    }
  }
  return { root: { type: 'root', ...dasar, children: anak } }
}

function tabel(baris: string[], benih: string): Node {
  const judulTabel = /^Tabel: /.test(baris[0]) ? baris[0].slice(7).trim() : null
  const isi = judulTabel ? baris.slice(1) : baris
  if (isi.length < 3 || !isi.every((b) => b.trim().startsWith('|')) || !/^\|?\s*:?-{3,}/.test(isi[1].trim())) {
    throw new GalatMarkdown(`Tabel harus punya baris judul kolom, baris pemisah, dan minimal satu baris isi: "${baris[0]}"`)
  }
  const kolom = selTabel(isi[0])
  if (kolom.length < 2) throw new GalatMarkdown(`Tabel minimal dua kolom: "${isi[0]}"`)
  const barisIsi = isi.slice(2).map(selTabel)
  for (const b of barisIsi) {
    if (b.length !== kolom.length) throw new GalatMarkdown(`Jumlah sel tidak sama dengan jumlah kolom: "${b.join(' | ')}"`)
  }
  return blok(benih, {
    blockType: 'tabelPerbandingan',
    ...(judulTabel ? { judul: judulTabel } : {}),
    kolom: kolom.map((label) => ({ label: polos(label) })),
    baris: barisIsi.map((sel) => ({ sel: sel.map((t) => ({ teks: polos(t) })) })),
  })
}

function callout(baris: string[], benih: string): Node {
  const kepala = /^> \[!([a-z]+)\]\s*(.*)$/.exec(baris[0])
  const gaya = kepala?.[1] as GayaCallout | undefined
  if (!kepala || !gaya || !GAYA_CALLOUT.includes(gaya)) throw new GalatMarkdown(`Callout harus [!info], [!tips], atau [!peringatan]: "${baris[0]}"`)
  const isi = baris.slice(1).map((b) => {
    if (!b.startsWith('>')) throw new GalatMarkdown(`Setiap baris callout diawali ">": "${b}"`)
    return b.replace(/^>\s?/, '')
  })
  if (isi.length === 0) throw new GalatMarkdown(`Callout tanpa isi: "${baris[0]}"`)
  return blok(benih, { blockType: 'callout', gaya, ...(kepala[2].trim() ? { judul: polos(kepala[2].trim()) } : {}), isi: polos(isi.join(' ')) })
}
