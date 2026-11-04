import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { IsiArtikel } from '@/components/isi/IsiArtikel'
import { hrefDokumen, paragrafTeks } from '@/modules/konten/isi'

import { isiLexical, p, tautan, tautanInternal, unggahan } from './seo-contoh'

// next/image butuh konfigurasi loader dari next.config; di tes cukup <img> biasa dengan props yang sama.
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => h('img', { src: props.src, alt: props.alt, width: props.width, height: props.height, sizes: props.sizes }),
}))

const gambar = { id: 5, publicId: 'point/gambar/slip', jenis: 'gambar', alt: 'Slip gaji', width: 1600, height: 900, caption: 'Contoh slip gaji', kredit: 'Foto: Redaksi' }
const blok = (fields: Record<string, unknown>) => ({ type: 'block', version: 2, format: '', fields: { id: 'b', blockName: '', ...fields } })
const render = (children: Record<string, unknown>[]) => renderToStaticMarkup(h(IsiArtikel, { isi: isiLexical(children), cloudName: 'demo' }))

describe('IsiArtikel', () => {
  it('heading memakai id jangkar; tautan internal ke dokumen terbit memakai pathFor', () => {
    const html = render([
      { type: 'heading', tag: 'h2', idJangkar: 'cara-hitung', version: 1, children: [{ type: 'text', text: 'Cara hitung', version: 1 }] },
      p(
        tautanInternal({ id: 1, slug: 'ptkp', tipe: 'glosarium', _status: 'published' } as never, 'PTKP'),
        ' dan ',
        tautanInternal({ id: 2, slug: 'draf', tipe: 'panduan', _status: 'draft' } as never, 'draf'),
        ' dan ',
        tautan('/tentang', 'tentang kami'),
      ),
    ])
    expect(html).toContain('<h2 id="cara-hitung">Cara hitung</h2>')
    expect(html).toContain('<a href="/glosarium/ptkp">PTKP</a>')
    expect(html).toContain(' dan draf dan ')
    expect(html).toContain('<a href="/tentang">tentang kami</a>')
  })

  it('tautan tab baru diberi rel dan keterangan untuk pembaca layar', () => {
    const html = render([p({ ...tautan('https://pajak.go.id', 'DJP'), fields: { linkType: 'custom', newTab: true, url: 'https://pajak.go.id' } })])
    expect(html).toContain('<a href="https://pajak.go.id" target="_blank" rel="noopener noreferrer">DJP<span class="sr"> (tab baru)</span></a>')
  })

  it('gambar di isi memakai URL Cloudinary, ukuran asli, keterangan, dan kredit; video unggahan dilewati', () => {
    const html = render([unggahan(gambar as never), unggahan({ ...gambar, jenis: 'video' } as never), unggahan(9)])
    expect(html).toContain(
      '<img src="https://res.cloudinary.com/demo/image/upload/c_limit,w_1440,f_auto,q_auto/point/gambar/slip" alt="Slip gaji" width="1440" height="810" sizes="(min-width: 64rem) 720px, 92vw"/>',
    )
    expect(html).toContain('Contoh slip gaji · Foto: Redaksi')
    expect(html.match(/<img/g)).toHaveLength(1)
  })

  it('blok callout, tabel perbandingan, embed tool, dan embed video', () => {
    const html = render([
      blok({ blockType: 'callout', gaya: 'peringatan', judul: 'Cek status PTKP', isi: 'Paragraf satu.\n\nParagraf dua.' }),
      blok({
        blockType: 'tabelPerbandingan',
        judul: 'TER A vs TER B',
        kolom: [{ label: 'Status' }, { label: 'Kategori' }],
        baris: [{ sel: [{ teks: 'TK/0' }, { teks: 'A' }] }],
      }),
      blok({ blockType: 'embedTool', tool: { id: 3, nama: 'Gaji Bersih', slug: 'gaji-bersih', ringkasan: 'Hitung gaji bersih.', _status: 'published' } }),
      blok({ blockType: 'embedTool', tool: { id: 4, nama: 'THR', slug: 'thr', ringkasan: 'Hitung THR.', _status: 'draft' } }),
      blok({
        blockType: 'embedVideo',
        video: { judul: 'PPh 21 dalam 45 detik', transkrip: 'Baris satu.', _status: 'published', file: { ...gambar, publicId: 'point/video/pph', jenis: 'video', width: 1080, height: 1920 } },
      }),
    ])
    expect(html).toMatch(/<div role="note" class="[^"]*" data-gaya="peringatan">.*<p class="[^"]*">Perhatian<\/p><p class="[^"]*">Cek status PTKP<\/p><p>Paragraf satu\.<\/p><p>Paragraf dua\.<\/p>/)
    expect(html).toMatch(/<div class="[^"]*" role="region" aria-label="TER A vs TER B" tabindex="0"><table><caption>TER A vs TER B<\/caption>/)
    expect(html).toContain('<th scope="col">Status</th>')
    expect(html).toContain('<th scope="row">TK/0</th><td>A</td>')
    expect(html).toMatch(/<a class="[^"]*" href="\/tools\/gaji-bersih">.*Hitung Gaji Bersih/)
    expect(html).not.toContain('/tools/thr')
    expect(html).toContain('poster="https://res.cloudinary.com/demo/video/upload/so_auto/c_limit,w_720,q_auto/point/video/pph.jpg"')
    expect(html).toContain('<source src="https://res.cloudinary.com/demo/video/upload/sp_auto/point/video/pph.m3u8" type="application/vnd.apple.mpegurl"/>')
    expect(html).toContain('<source src="https://res.cloudinary.com/demo/video/upload/q_auto/point/video/pph.mp4" type="video/mp4"/>')
    expect(html).toContain('<summary>Baca transkrip</summary><p>Baris satu.</p>')
  })

  it('relationship menjadi "Baca juga"; node dan blok yang tidak dikenal tidak dirender', () => {
    const html = render([
      { type: 'relationship', version: 2, relationTo: 'artikel', value: { id: 7, judul: 'Cara hitung THR', slug: 'cara-hitung-thr', tipe: 'panduan', _status: 'published' } },
      blok({ blockType: 'blokBaru' }),
      { type: 'nodeAsing', version: 1 },
    ])
    expect(html).toMatch(/Baca juga: <a href="\/cara-hitung-thr">Cara hitung THR<\/a>/)
    expect(html).not.toContain('unknown')
  })
})

describe('hrefDokumen dan paragrafTeks', () => {
  it('hanya dokumen ter-populate dan terbit yang punya path', () => {
    expect(hrefDokumen('pilar', { slug: 'tekno' })).toBe('/tekno')
    expect(hrefDokumen('video', { slug: 'pph', _status: 'published' })).toBe('/video/pph')
    expect(hrefDokumen('artikel', 12)).toBeNull()
    expect(hrefDokumen('subkategori', { slug: 'pajak' })).toBeNull()
  })

  it('memecah teks di baris kosong', () => {
    expect(paragrafTeks('Satu.\n\n  Dua.\n\n\n')).toEqual(['Satu.', 'Dua.'])
    expect(paragrafTeks(null)).toEqual([])
  })
})
