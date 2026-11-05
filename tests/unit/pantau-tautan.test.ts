import { describe, expect, it } from 'vitest'

import { nilaiTautan, PESAN_TEMUAN, tautanDokumen, type PetaSitus, type Sumber } from '@/modules/pantau/tautan'

const SITUS = 'https://point.lat'

// Pembuat JSON Lexical minimal (bentuk yang disimpan Payload 3.92).
const teks = (t: string) => ({ type: 'text', text: t })
const tautanUrl = (url: string, t = 'tautan') => ({ type: 'link', fields: { linkType: 'custom', url }, children: [teks(t)] })
const tautanDok = (relationTo: string, value: number) => ({ type: 'link', fields: { linkType: 'internal', doc: { relationTo, value } }, children: [teks('dok')] })
const blok = (fields: Record<string, unknown>) => ({ type: 'block', fields })
const isi = (...anak: unknown[]) => ({ root: { type: 'root', children: [{ type: 'paragraph', children: anak }] } })

describe('tautanDokumen: tautan yang dihitung per jenis sumber', () => {
  it('artikel: link Lexical (path, URL situs, dokumen, situs lain), sematan tools dan video, sumber, dan relasi pilihan editor', () => {
    const tujuan = tautanDokumen(
      'artikel',
      {
        isi: isi(
          tautanUrl('/cara-hitung-thr/'),
          tautanUrl('https://www.point.lat/glosarium/ptkp'),
          tautanDok('artikel', 12),
          tautanUrl('https://pajak.go.id/id/pph-21'),
          tautanUrl('#faq'),
          tautanUrl('mailto:redaksi@point.lat'),
          blok({ blockType: 'embedTool', tool: 3 }),
          blok({ blockType: 'callout', isi: 'Bukan tautan.' }),
        ),
        sumber: [{ judul: 'PMK', url: 'https://jdih.kemenkeu.go.id/pmk-168' }],
        artikelTerkait: [7, { id: 8 }],
        toolsTerkait: [3],
        videoTerkait: 5,
      },
      SITUS,
    )
    expect(tujuan).toEqual([
      { jenis: 'internal', path: '/cara-hitung-thr' },
      { jenis: 'internal', path: '/glosarium/ptkp' },
      { jenis: 'dokumen', koleksi: 'artikel', id: 12 },
      { jenis: 'luar', url: 'https://pajak.go.id/id/pph-21' },
      { jenis: 'dokumen', koleksi: 'tools', id: 3 },
      { jenis: 'luar', url: 'https://jdih.kemenkeu.go.id/pmk-168' },
      { jenis: 'dokumen', koleksi: 'artikel', id: 7 },
      { jenis: 'dokumen', koleksi: 'artikel', id: 8 },
      { jenis: 'dokumen', koleksi: 'tools', id: 3 },
      { jenis: 'dokumen', koleksi: 'video', id: 5 },
    ])
  })

  it('halaman (blok teks, kartu, CTA, sematan tools), menu header dan footer, beranda (mozaik dan strip video)', () => {
    expect(
      tautanDokumen(
        'halaman',
        {
          tataLetak: [
            { blockType: 'hero', judul: 'Tentang' },
            { blockType: 'teks', isi: isi(tautanUrl('/kebijakan-redaksi')) },
            { blockType: 'kartu', kartu: [{ judul: 'A', tautan: '/tools' }, { judul: 'B' }] },
            { blockType: 'cta', tautan: 'https://wa.me/62811' },
            { blockType: 'embedTool', tool: 2 },
          ],
        },
        SITUS,
      ),
    ).toEqual([
      { jenis: 'internal', path: '/kebijakan-redaksi' },
      { jenis: 'internal', path: '/tools' },
      { jenis: 'luar', url: 'https://wa.me/62811' },
      { jenis: 'dokumen', koleksi: 'tools', id: 2 },
    ])
    expect(
      tautanDokumen('header', { menu: [{ jenis: 'pilar', pilar: 1 }, { jenis: 'tautan', url: '/video' }], tombolTools: { url: '/tools' } }, SITUS),
    ).toEqual([
      { jenis: 'dokumen', koleksi: 'pilar', id: 1 },
      { jenis: 'internal', path: '/video' },
      { jenis: 'internal', path: '/tools' },
    ])
    expect(tautanDokumen('footer', { tautan: [{ url: '/tentang' }], sosial: [{ url: 'https://instagram.com/point' }], saluranWhatsApp: null }, SITUS)).toEqual([
      { jenis: 'internal', path: '/tentang' },
      { jenis: 'luar', url: 'https://instagram.com/point' },
    ])
    expect(
      tautanDokumen('beranda', { tataLetak: [{ blockType: 'mozaikPilihan', artikel: [4, 6] }, { blockType: 'stripVideo', video: [9] }, { blockType: 'palingDibaca' }] }, SITUS),
    ).toEqual([
      { jenis: 'dokumen', koleksi: 'artikel', id: 4 },
      { jenis: 'dokumen', koleksi: 'artikel', id: 6 },
      { jenis: 'dokumen', koleksi: 'video', id: 9 },
    ])
  })
})

describe('nilaiTautan: rusak, alamat lama, yatim, dan tautan luar', () => {
  const sumber = (id: number, path: string): Sumber => ({ koleksi: 'artikel', id, judul: `Artikel ${id}`, path })
  const menu: Sumber = { koleksi: 'header', id: null, judul: 'Menu header', path: null }
  const a = sumber(1, '/a')
  const b = sumber(2, '/b')
  const c = sumber(3, '/c')
  const peta: PetaSitus = {
    path: new Set(['/', '/a', '/b', '/c', '/tentang', '/tools']),
    dokumen: new Map([
      ['artikel:1', '/a'],
      ['artikel:2', '/b'],
      ['artikel:3', '/c'],
    ]),
    redirect: new Map([
      ['/c-lama', { kode: '301', ke: '/c' }],
      ['/dihapus', { kode: '410', ke: null }],
    ]),
  }
  const sasaran = [
    { path: '/a', sumber: a },
    { path: '/b', sumber: b },
    { path: '/c', sumber: c },
    { path: '/tentang', sumber: { koleksi: 'halaman' as const, id: 10, judul: 'Tentang', path: '/tentang' } },
  ]

  it('dokumen belum terbit, path tanpa halaman, 410 rusak; 301 dialihkan dan tujuannya tetap tautan masuk; tautan ke diri sendiri tidak dihitung', () => {
    const { temuan } = nilaiTautan(
      [
        { sumber: a, tujuan: { jenis: 'dokumen', koleksi: 'artikel', id: 99 } },
        { sumber: a, tujuan: { jenis: 'internal', path: '/tidak-ada' } },
        { sumber: a, tujuan: { jenis: 'internal', path: '/dihapus' } },
        { sumber: a, tujuan: { jenis: 'internal', path: '/c-lama' } },
        { sumber: a, tujuan: { jenis: 'internal', path: '/c-lama' } },
        { sumber: b, tujuan: { jenis: 'internal', path: '/b' } },
        { sumber: c, tujuan: { jenis: 'dokumen', koleksi: 'artikel', id: 1 } },
        { sumber: menu, tujuan: { jenis: 'internal', path: '/tentang' } },
      ],
      peta,
      sasaran,
    )
    expect(temuan).toEqual([
      { jenis: 'rusak', tujuan: 'artikel #99', pesan: PESAN_TEMUAN.dokumen, sumber: a },
      { jenis: 'rusak', tujuan: '/tidak-ada', pesan: PESAN_TEMUAN.tidakAda, sumber: a },
      { jenis: 'rusak', tujuan: '/dihapus', pesan: PESAN_TEMUAN.dihapus, sumber: a },
      { jenis: 'dialihkan', tujuan: '/c-lama', pesan: 'Alamat lama, dialihkan ke /c. Ganti tautannya ke alamat baru supaya pembaca dan Google tidak dialihkan.', sumber: a },
      { jenis: 'yatim', tujuan: '/b', pesan: PESAN_TEMUAN.yatim, sumber: b },
    ])
  })

  it('URL situs lain dikumpulkan sekali per URL dengan semua sumbernya (tanpa sumber ganda)', () => {
    const { luar } = nilaiTautan(
      [
        { sumber: a, tujuan: { jenis: 'luar', url: 'https://pajak.go.id/' } },
        { sumber: a, tujuan: { jenis: 'luar', url: 'https://pajak.go.id/' } },
        { sumber: menu, tujuan: { jenis: 'luar', url: 'https://pajak.go.id/' } },
        { sumber: b, tujuan: { jenis: 'luar', url: 'https://bpjs.go.id/' } },
      ],
      peta,
      [],
    )
    expect([...luar]).toEqual([
      ['https://pajak.go.id/', [a, menu]],
      ['https://bpjs.go.id/', [b]],
    ])
  })
})
