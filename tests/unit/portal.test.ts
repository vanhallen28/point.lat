import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { RubrikBeranda } from '@/components/beranda/RubrikBeranda'
import { StripTools } from '@/components/beranda/StripTools'
import { TerbaruBeranda } from '@/components/beranda/TerbaruBeranda'
import { KartuArtikel } from '@/components/kartu/KartuArtikel'
import { kartuArtikel } from '@/modules/konten/artikel'
import { susunBarisRubrik, susunBeranda, type SumberBeranda } from '@/modules/konten/beranda'
import { MAKS_TOPIK, susunHeader, susunTopik } from '@/modules/konten/tampilan'
import type { BarisRubrik, KartuArtikel as DataKartu, PilarRingkas } from '@/modules/konten/tipe'
import type { Artikel, Beranda, Header, Media, Penuli, Pilar } from '@/payload-types'

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) =>
    h('img', { src: props.src, alt: props.alt, width: props.width, height: props.height, sizes: props.sizes, loading: props.loading }),
}))

type Blok = NonNullable<Beranda['tataLetak']>[number]

const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
const uang: PilarRingkas = { nama: 'Uang & Karier', slug: 'uang-karier', href: '/uang-karier', warna: 'hijau', disclaimer: null }
const belajar: PilarRingkas = { nama: 'Belajar', slug: 'belajar', href: '/belajar', warna: 'kuning', disclaimer: null }
const kartu = (id: number, pilar: PilarRingkas | null = uang): DataKartu => ({
  id,
  judul: `Artikel ${id}`,
  href: `/artikel-${id}`,
  tipe: 'panduan',
  pilar,
  intinya: `Intinya ${id}.`,
  gambar: null,
  terbit: '2026-11-10T02:00:00.000Z',
  penulis: 'Redaksi point.',
})

describe('kartuArtikel: gambar, tanggal terbit, dan penulis', () => {
  const pilar: Pilar = { id: 1, nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau', deskripsi: 'Uang.', ...waktu }
  const gambar: Media = { id: 5, publicId: 'point/gambar/sampul', jenis: 'gambar', alt: 'Kartu sampul', width: 1920, height: 1080, ...waktu }
  const penulis = { id: 3, nama: 'Redaksi point.', slug: 'redaksi', ...waktu } as Penuli
  const doc = { id: 9, judul: 'Gaji bersih', slug: 'gaji-bersih', tipe: 'panduan', pilar, intinya: [{ poin: 'Intinya.' }] } as Artikel

  it('membaca gambar utama, tanggal terbit, dan nama penulis bila query memuatnya', () => {
    expect(kartuArtikel({ ...doc, gambarUtama: gambar, terbitPada: '2026-11-10T02:00:00.000Z', penulis })).toMatchObject({
      gambar: { publicId: 'point/gambar/sampul', alt: 'Kartu sampul', width: 1920, height: 1080 },
      terbit: '2026-11-10T02:00:00.000Z',
      penulis: 'Redaksi point.',
    })
  })

  it('tanpa relasi yang dimuat (id saja) atau gambar berupa video: panel warna pilar, tanpa meta', () => {
    expect(kartuArtikel({ ...doc, gambarUtama: 5, penulis: 3 })).toMatchObject({ gambar: null, terbit: null, penulis: null })
    expect(kartuArtikel({ ...doc, gambarUtama: { ...gambar, jenis: 'video' } })?.gambar).toBeNull()
  })
})

describe('KartuArtikel', () => {
  it('bergambar: gambar 16:9 dari Cloudinary tanpa teks alt (judul sudah di kartu), pilar, tipe, Intinya, tanggal, dan penulis', () => {
    const html = renderToStaticMarkup(
      h(KartuArtikel, {
        kartu: { ...kartu(1), gambar: { publicId: 'point/gambar/a', jenis: 'gambar', alt: 'Sampul', width: 1920, height: 1080, caption: null, kredit: null } },
      }),
    )
    expect(html).toMatch(/<img src="https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/c_fill,g_auto,ar_16:9\/[^"]*point\/gambar\/a" alt="" width="800" height="450"/)
    expect(html).toContain('loading="lazy"')
    expect(html).toMatch(/Uang &amp; Karier<\/span><span class="[^"]*">Panduan<\/span>/)
    expect(html).toContain('<strong>Intinya:</strong> Intinya 1.')
    expect(html).toMatch(/<time dateTime="2026-11-10T02:00:00.000Z">10 November 2026<\/time><span>Redaksi point\.<\/span>/)
  })

  it('berita utama memuat gambarnya lebih dulu; kartu ringkas memakai gambar kecil 4:3 tanpa Intinya', () => {
    const gambar = { publicId: 'point/gambar/a', jenis: 'gambar' as const, alt: '', width: 1920, height: 1080, caption: null, kredit: null }
    expect(renderToStaticMarkup(h(KartuArtikel, { kartu: { ...kartu(1), gambar }, ukuran: 'besar', utama: true }))).toContain('loading="eager"')
    const baris = renderToStaticMarkup(h(KartuArtikel, { kartu: { ...kartu(1), gambar }, ukuran: 'baris' }))
    expect(baris).toMatch(/ar_4:3[^"]*" alt="" width="320" height="240" sizes="128px"/)
    expect(baris).not.toContain('Intinya:')
  })
})

describe('susunBarisRubrik', () => {
  const rubrik: BarisRubrik[] = [
    { pilar: uang, artikel: [1, 2, 3, 4, 5].map((id) => kartu(id)) },
    { pilar: belajar, artikel: [6, 7].map((id) => kartu(id, belajar)) },
  ]

  it('semua pilar sesuai urutan pilar bila editor tidak memilih; tulisan di mozaik tidak diulang', () => {
    const baris = susunBarisRubrik(null, 3, rubrik, new Set([1]))
    expect(baris.map((b) => [b.pilar.slug, b.artikel.map((k) => k.id)])).toEqual([
      ['uang-karier', [2, 3, 4]],
      ['belajar', [6, 7]],
    ])
  })

  it('pilar pilihan editor sesuai urutan editor; pilar yang semua tulisannya di mozaik dilewati', () => {
    const pilihan = [{ id: 2, slug: 'belajar' }, { id: 1, slug: 'uang-karier' }]
    expect(susunBarisRubrik(pilihan, 4, rubrik, new Set()).map((b) => b.pilar.slug)).toEqual(['belajar', 'uang-karier'])
    expect(susunBarisRubrik(pilihan, 4, rubrik, new Set([6, 7])).map((b) => b.pilar.slug)).toEqual(['uang-karier'])
  })
})

describe('susunBeranda: blok portal', () => {
  const sumber: SumberBeranda = {
    terbaru: [1, 2].map((id) => kartu(id)),
    populer: [],
    video: [],
    tools: [],
    toolsPilar: [{ id: 9, nama: 'Gaji Bersih', href: '/tools/gaji-bersih', ringkasan: 'Hitung gaji bersih.', pilar: uang }],
    rubrik: [{ pilar: uang, artikel: [1, 2].map((id) => kartu(id)) }],
    newsletter: null,
  }

  it('baris rubrik dan strip kalkulator menjadi bagian; terbaru tanpa nomor peringkat', () => {
    const tata = [
      { blockType: 'palingDibaca', jumlah: 4 },
      { blockType: 'stripTools', judul: '' },
      { blockType: 'barisRubrik', jumlah: 4 },
    ] as Blok[]
    const bagian = susunBeranda(tata, sumber).slice(1)
    expect(bagian.map((b) => b.jenis)).toEqual(['terbaru', 'tools', 'rubrik'])
    expect(bagian[0]).toMatchObject({ judul: 'Tulisan terbaru', peringkat: false })
    expect(bagian[1]).toMatchObject({ judul: 'Hitung sendiri', teks: null })
  })

  it('tanpa kalkulator terbit atau tulisan rubrik, kedua blok dilewati', () => {
    const tata = [{ blockType: 'stripTools' }, { blockType: 'barisRubrik' }] as Blok[]
    expect(susunBeranda(tata, { ...sumber, toolsPilar: [], rubrik: [] }).map((b) => b.jenis)).toEqual(['hero'])
  })

  it('Paling dicari bernomor peringkat bila data klik cukup', () => {
    const tata = [{ blockType: 'palingDibaca', jumlah: 2 }] as Blok[]
    const [, populer] = susunBeranda(tata, { ...sumber, populer: [2, 1].map((id) => kartu(id)) })
    expect(populer).toMatchObject({ jenis: 'terbaru', judul: 'Paling dicari pekan ini', peringkat: true })
  })
})

describe('komponen beranda portal', () => {
  it('Paling dicari berupa daftar bernomor (ol)', () => {
    const html = renderToStaticMarkup(
      h(TerbaruBeranda, { terbaru: { jenis: 'terbaru', id: 't', judul: 'Paling dicari pekan ini', artikel: [kartu(1)], newsletter: null, peringkat: true } }),
    )
    expect(html).toMatch(/<ol class="[^"]*peringkat[^"]*"><li/)
  })

  it('baris rubrik: judul bertitik warna pilar, tautan ke rubrik, dan kartu tulisannya', () => {
    const html = renderToStaticMarkup(h(RubrikBeranda, { rubrik: { jenis: 'rubrik', id: 'r', baris: [{ pilar: uang, artikel: [kartu(1)] }] } }))
    expect(html).toMatch(/<section aria-labelledby="r-uang-karier" class="[^"]*" data-warna="hijau"><div class="[^"]*"><h2 id="r-uang-karier" class="[^"]*"><span class="[^"]*" aria-hidden="true"><\/span>Uang &amp; Karier<\/h2>/)
    expect(html).toMatch(/href="\/uang-karier">Semua tulisan Uang &amp; Karier/)
    expect(html).toContain('href="/artikel-1"')
  })

  it('strip kalkulator: kartu per kalkulator dengan nama pilar, ringkasan, dan tautan ke semua kalkulator', () => {
    const html = renderToStaticMarkup(
      h(StripTools, {
        strip: { jenis: 'tools', id: 's', judul: 'Hitung sendiri', teks: 'Gratis.', tools: [{ id: 9, nama: 'Gaji Bersih', href: '/tools/gaji-bersih', ringkasan: 'Hitung gaji.', pilar: uang }] },
      }),
    )
    expect(html).toMatch(/<h2 id="s-judul" class="[^"]*">Hitung sendiri<\/h2><p class="[^"]*">Gratis\.<\/p>/)
    expect(html).toMatch(/<a class="[^"]*" data-warna="hijau" href="\/tools\/gaji-bersih">.*Uang &amp; Karier.*Gaji Bersih.*Hitung gaji\./)
    expect(html).toMatch(/href="\/tools">Semua kalkulator/)
  })
})

describe('header media', () => {
  it('Topik hangat: subkategori tulisan terbaru tanpa duplikat, paling banyak lima', () => {
    const sub = (slug: string, pilarSlug = 'uang-karier') => ({ nama: slug.toUpperCase(), slug, pilarSlug })
    const topik = susunTopik([sub('gaji-pajak'), sub('bpjs'), sub('gaji-pajak'), sub('masuk-ptn', 'belajar'), sub('a'), sub('b'), sub('c')])
    expect(topik).toHaveLength(MAKS_TOPIK)
    expect(topik.slice(0, 3)).toEqual([
      { label: 'GAJI-PAJAK', href: '/uang-karier/gaji-pajak' },
      { label: 'BPJS', href: '/uang-karier/bpjs' },
      { label: 'MASUK-PTN', href: '/belajar/masuk-ptn' },
    ])
  })

  it('pilar tanpa tulisan terbit disembunyikan dari menu; tautan biasa tetap tampil', () => {
    const pilar = (slug: string) => ({ id: 1, nama: slug, slug, warna: 'hijau', deskripsi: '', ...waktu }) as Pilar
    const header = {
      menu: [
        { label: 'Uang & Karier', jenis: 'pilar', pilar: pilar('uang-karier') },
        { label: 'Tekno', jenis: 'pilar', pilar: pilar('tekno') },
        { label: 'Tentang', jenis: 'tautan', url: '/tentang' },
      ],
    } as Pick<Header, 'menu' | 'tombolTools'>
    expect(susunHeader(header, { pilarTerisi: new Set(['uang-karier']) }).menu.map((m) => m.label)).toEqual(['Uang & Karier', 'Tentang'])
    // Tanpa data jumlah tulisan (tes lama, pratinjau) semua pilar tetap tampil.
    expect(susunHeader(header).menu).toHaveLength(3)
  })
})
