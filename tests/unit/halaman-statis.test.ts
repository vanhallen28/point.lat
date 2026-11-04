import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { HalamanStatis } from '@/components/halaman/HalamanStatis'
import { susunHalaman } from '@/modules/konten/halaman'
import type { Halaman } from '@/payload-types'

import { gambarUtama, isiLexical, h as judul, p, situs } from './seo-contoh'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => h('img', { src: props.src, alt: props.alt, width: props.width, height: props.height }),
}))

const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
const tool = { id: 4, nama: 'Gaji Bersih', slug: 'gaji-bersih', ringkasan: 'Hitung gaji bersih setelah PPh 21 dan BPJS.', toolId: 'gaji-bersih' as const, pilar: 1, ...waktu }

const tentang: Halaman = {
  id: 1,
  judul: 'Tentang',
  slug: 'tentang',
  _status: 'published',
  ...waktu,
  tataLetak: [
    { blockType: 'hero', id: 'h1', judul: 'Intinya dulu, lalu hitung sendiri', subjudul: 'point. menjelaskan uang dan karier.', gambar: { ...gambarUtama, ...waktu } },
    { blockType: 'teks', id: 't1', isi: isiLexical([judul('h1', 'Siapa kami'), p('Redaksi kecil.')]) as never },
    {
      blockType: 'kartu',
      id: 'k1',
      judul: 'Prinsip kami',
      kartu: [
        { judul: 'Lugas', teks: 'Jawaban di kalimat pertama.', tautan: '/kebijakan-redaksi' },
        { judul: 'Cermat', teks: null, tautan: ' ' },
      ],
    },
    { blockType: 'cta', id: 'c1', judul: 'Punya koreksi?', teks: 'Kabari redaksi.', labelTombol: 'Kirim koreksi', tautan: ' /kontak ' },
    { blockType: 'faqBlok', id: 'f1', judul: null, faq: [{ pertanyaan: 'Apakah gratis?', jawaban: 'Ya.' }] },
    { blockType: 'faqBlok', id: 'f2', judul: 'Kosong', faq: [] },
    { blockType: 'embedTool', id: 'e1', tool: { ...tool, _status: 'published' } },
    { blockType: 'embedTool', id: 'e2', tool: { ...tool, _status: 'draft' } },
    { blockType: 'hero', id: 'h2', judul: 'Bergabung', subjudul: null, gambar: null },
  ],
}

describe('susunHalaman', () => {
  it('hero pertama memegang H1, hero berikutnya H2; FAQ kosong dan tool draf dilewati', () => {
    const halaman = susunHalaman(tentang)
    expect(halaman.heroUtama).toBe(true)
    expect(halaman.href).toBe('/tentang')
    expect(halaman.blok.map((b) => b.jenis)).toEqual(['hero', 'teks', 'kartu', 'cta', 'faq', 'tool', 'hero'])
    expect(halaman.blok.filter((b) => b.jenis === 'hero').map((b) => b.utama)).toEqual([true, false])
    expect(halaman.blok[2]).toMatchObject({ kartu: [{ href: '/kebijakan-redaksi' }, { teks: null, href: null }] })
    expect(halaman.blok[3]).toMatchObject({ label: 'Kirim koreksi', href: '/kontak' })
    expect(halaman.blok[4]).toMatchObject({ judul: 'Pertanyaan yang sering muncul' })
    expect(halaman.blok[5]).toEqual({ jenis: 'tool', id: 'e1', nama: 'Gaji Bersih', ringkasan: tool.ringkasan, href: '/tools/gaji-bersih' })
  })

  it('tanpa hero di atas: judul halaman menjadi H1', () => {
    const halaman = susunHalaman({ ...tentang, tataLetak: tentang.tataLetak?.slice(1, 2) })
    expect(halaman.heroUtama).toBe(false)
    expect(susunHalaman({ ...tentang, tataLetak: null }).blok).toEqual([])
  })
})

describe('HalamanStatis', () => {
  it('satu H1 dari hero, remah roti, kartu bertautan, CTA, FAQ, dan tool', () => {
    const html = renderToStaticMarkup(h(HalamanStatis, { halaman: susunHalaman(tentang), situs }))
    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toMatch(/<h1 class="[^"]*">Intinya dulu, lalu hitung sendiri<\/h1>/)
    expect(html).toMatch(/<span aria-current="page" class="[^"]*">Tentang<\/span>/)
    expect(html).toContain('alt="Slip gaji karyawan"')
    expect(html).toContain('<h2 id="siapa-kami">Siapa kami</h2>')
    expect(html).toContain('<h3 class="')
    expect(html).toContain('<a href="/kebijakan-redaksi">Lugas</a>')
    expect(html).toMatch(/<a class="[^"]*" href="\/kontak">Kirim koreksi/)
    expect(html).toContain('<h2 id="f1-faq"')
    expect(html).toContain('Hitung Gaji Bersih')
    expect(html).toMatch(/<h2 class="[^"]*">Bergabung<\/h2>/)
  })

  it('tanpa hero: judul halaman sebagai H1', () => {
    const html = renderToStaticMarkup(h(HalamanStatis, { halaman: susunHalaman({ ...tentang, tataLetak: [] }), situs }))
    expect(html).toMatch(/<h1 class="[^"]*">Tentang<\/h1>/)
  })
})
