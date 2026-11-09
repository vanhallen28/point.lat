import { existsSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { TOOL_IDS } from '@/lib/konstanta'
import { GalatMarkdown, markdownKeLexical, teksBaris, type CariDokumen } from '@/modules/paket/markdown'
import { MOZAIK_PAKET, PAKET_AWAL } from '@/modules/paket/paket-awal'
import { analisis } from '@/modules/seo/analisis'
import { hitungKata } from '@/modules/seo/teks'

/** Artikel di situs yang boleh ditautkan paket walau bukan bagian paket (sudah terbit di produksi). */
const DI_LUAR_PAKET = new Set(['dana-darurat'])

const idPaket = new Map(PAKET_AWAL.map((a, i) => [a.slug, i + 1]))
const cari: CariDokumen = {
  artikel: (slug) => idPaket.get(slug) ?? null,
  tools: (toolId) => ((TOOL_IDS as readonly string[]).includes(toolId) ? 100 + TOOL_IDS.indexOf(toolId as never) : null),
}

/** Semua teks paket yang dibaca pembaca, per artikel. */
function teksArtikel(a: (typeof PAKET_AWAL)[number]): string[] {
  return [a.judul, a.deck, ...a.intinya, a.isi, ...a.faq.flatMap((f) => [f.pertanyaan, f.jawaban]), a.seo.judulSEO, a.seo.metaDeskripsi, a.sampul.alt]
}

/** Teks tanpa URL tautan dan penanda callout (`[!tips]`), yang memang memuat tanda seru. */
const tanpaUrl = (t: string) => t.replace(/\]\([^)]*\)/g, ']()').replace(/\[!(info|tips|peringatan)\]/g, '')

describe('markdown paket ke Lexical', () => {
  it('judul, paragraf dengan tebal, miring, dan tautan internal, eksternal, serta yang tidak ditemukan', () => {
    const isi = markdownKeLexical(
      ['## Judul dua', '', 'Baris **tebal** dan *miring*,', 'lanjut [panduan](/ptkp-2026), [kalkulator](/tools/thr), [DJP](https://pajak.go.id) dan [hilang](/tidak-ada).'].join('\n'),
      cari,
      'uji',
    )
    const [h2, p] = isi.root.children as unknown as { type: string; tag?: string; children: { type: string; text?: string; format?: number; fields?: unknown }[] }[]
    expect(h2).toMatchObject({ type: 'heading', tag: 'h2' })
    expect(p.children.map((n) => n.type)).toEqual(['text', 'text', 'text', 'text', 'text', 'link', 'text', 'link', 'text', 'link', 'text', 'text', 'text'])
    expect(p.children[1]).toMatchObject({ text: 'tebal', format: 1 })
    expect(p.children[3]).toMatchObject({ text: 'miring', format: 2 })
    expect(p.children[5].fields).toEqual({ linkType: 'internal', newTab: false, doc: { relationTo: 'artikel', value: idPaket.get('ptkp-2026') } })
    expect(p.children[7].fields).toEqual({ linkType: 'internal', newTab: false, doc: { relationTo: 'tools', value: cari.tools('thr') } })
    expect(p.children[9].fields).toEqual({ linkType: 'custom', url: 'https://pajak.go.id', newTab: false })
    // Tujuan yang tidak ditemukan menjadi teks biasa, bukan tautan rusak.
    expect(p.children[11]).toMatchObject({ type: 'text', text: 'hilang' })
  })

  it('daftar, tabel bergelar, callout, embed tool, dan Baca juga; id blok stabil', () => {
    const md = [
      '- satu',
      '- dua',
      '',
      '1. pertama',
      '2. kedua',
      '',
      'Tabel: Contoh',
      '| A | B |',
      '|---|---|',
      '| **1** | 2 |',
      '',
      '> [!tips] Judul tips',
      '> Isi baris satu',
      '> baris dua.',
      '',
      '[[tool:gaji-bersih]]',
      '',
      '[[baca:pph-21-ter]]',
    ].join('\n')
    const isi = markdownKeLexical(md, cari, 'uji')
    const [ul, ol, tabel, callout, tool, baca] = isi.root.children as Record<string, unknown>[]
    expect(ul).toMatchObject({ type: 'list', listType: 'bullet', tag: 'ul' })
    expect(ol).toMatchObject({ type: 'list', listType: 'number', tag: 'ol' })
    expect(tabel).toMatchObject({
      type: 'block',
      fields: { blockType: 'tabelPerbandingan', judul: 'Contoh', kolom: [{ label: 'A' }, { label: 'B' }], baris: [{ sel: [{ teks: '1' }, { teks: '2' }] }] },
    })
    expect(callout).toMatchObject({ fields: { blockType: 'callout', gaya: 'tips', judul: 'Judul tips', isi: 'Isi baris satu baris dua.' } })
    expect(tool).toMatchObject({ fields: { blockType: 'embedTool', tool: cari.tools('gaji-bersih') } })
    expect(baca).toEqual({ type: 'relationship', version: 2, format: '', relationTo: 'artikel', value: idPaket.get('pph-21-ter') })
    expect(markdownKeLexical(md, cari, 'uji')).toEqual(isi)
    expect((markdownKeLexical(md, cari, 'lain').root.children[2] as unknown as { fields: { id: string } }).fields.id).not.toBe((tabel as { fields: { id: string } }).fields.id)
  })

  it('menolak H1, tabel tanpa pemisah atau sel kurang, callout tak dikenal, dan tautan di callout atau tabel', () => {
    expect(() => markdownKeLexical('# Judul', cari)).toThrow(GalatMarkdown)
    expect(() => markdownKeLexical('| A | B |\n| 1 | 2 |', cari)).toThrow(GalatMarkdown)
    expect(() => markdownKeLexical('| A | B |\n|---|---|\n| 1 |', cari)).toThrow(GalatMarkdown)
    expect(() => markdownKeLexical('> [!catatan] X\n> isi', cari)).toThrow(GalatMarkdown)
    expect(() => markdownKeLexical('> [!info] X\n> lihat [ini](/ptkp-2026)', cari)).toThrow(GalatMarkdown)
    expect(() => markdownKeLexical('| A | B |\n|---|---|\n| [x](/ptkp-2026) | 2 |', cari)).toThrow(GalatMarkdown)
  })

  it('teks tanpa format tetap satu node', () => {
    expect(teksBaris('Biasa saja.', cari)).toEqual([{ type: 'text', text: 'Biasa saja.', format: 0, detail: 0, mode: 'normal', style: '', version: 1 }])
  })
})

describe('paket konten awal', () => {
  it('12 artikel unik di pilar Uang & Karier dan Belajar; mozaik dan terkait menunjuk artikel yang ada', () => {
    expect(PAKET_AWAL).toHaveLength(12)
    expect(new Set(PAKET_AWAL.map((a) => a.slug)).size).toBe(12)
    expect(new Set(PAKET_AWAL.map((a) => a.pilar))).toEqual(new Set(['uang-karier', 'belajar']))
    for (const slug of MOZAIK_PAKET) expect(idPaket.has(slug), slug).toBe(true)
    for (const a of PAKET_AWAL) {
      for (const t of a.terkait) expect(idPaket.has(t) || DI_LUAR_PAKET.has(t), `${a.slug} -> ${t}`).toBe(true)
      for (const t of a.tools) expect(TOOL_IDS, a.slug).toContain(t)
    }
  })

  for (const a of PAKET_AWAL) {
    describe(a.slug, () => {
      const isi = markdownKeLexical(a.isi, cari, a.slug)

      it('lolos semua cek panel SEO', () => {
        const cek = analisis(
          {
            judul: a.judul,
            slug: a.slug,
            intinya: a.intinya.map((poin) => ({ poin })),
            isi,
            sumber: a.sumber,
            gambarUtama: { id: 1, alt: a.sampul.alt, width: 1920 },
            seo: a.seo,
          },
          { urlSitus: 'https://point.lat' },
        )
        expect(cek.filter((c) => c.status !== 'hijau').map((c) => `${c.id}: ${c.pesan}`)).toEqual([])
      })

      it('aturan copy: tanpa em dash, en dash, tanda seru, dan sapaan "Anda"', () => {
        for (const t of teksArtikel(a).map(tanpaUrl)) {
          expect(t).not.toMatch(/[—–!]/)
          expect(t).not.toMatch(/\bAnda\b/)
        }
      })

      it('isian sesuai field koleksi: Intinya 2-4 poin maksimal 220 karakter, sumber https bertanggal, sampul ada', () => {
        expect(a.intinya.length).toBeGreaterThanOrEqual(2)
        expect(a.intinya.length).toBeLessThanOrEqual(4)
        for (const poin of a.intinya) expect(poin.length, poin).toBeLessThanOrEqual(220)
        expect(a.sumber.length).toBeGreaterThanOrEqual(2)
        for (const s of a.sumber) expect(s.url).toMatch(/^https:\/\//)
        expect(a.faq.length).toBeGreaterThanOrEqual(3)
        expect(existsSync(path.join(process.cwd(), 'src/modules/paket/sampul', a.sampul.file)), a.sampul.file).toBe(true)
        expect(a.sampul.kata.length).toBeLessThanOrEqual(12)
      })

      it('panjang sesuai jenis tulisan dan semua tautan internal menunjuk artikel atau kalkulator yang ada', () => {
        const kata = hitungKata(a.isi)
        expect(kata).toBeGreaterThanOrEqual(a.tipe === 'explainer' ? 550 : 600)
        for (const [, tujuan] of a.isi.matchAll(/\]\((\/[^)]*)\)/g)) {
          const tools = /^\/tools\/(.+)$/.exec(tujuan)
          const ada = tools ? cari.tools(tools[1]) !== null : idPaket.has(tujuan.slice(1)) || DI_LUAR_PAKET.has(tujuan.slice(1))
          expect(ada, `${a.slug}: ${tujuan}`).toBe(true)
        }
      })
    })
  }
})
