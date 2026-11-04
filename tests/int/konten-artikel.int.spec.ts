import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'
import type { IsiLexical } from '@/lib/lexical'
import { ambilArtikel } from '@/modules/konten/data'

import { h, isiLexical, kalimatPanjang, p, tautanInternal, unggahan } from '../unit/seo-contoh'
import { buatGambar, dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload, unik } from './helpers'

const blok = (fields: Record<string, unknown>) => ({ type: 'block', version: 2, format: '', fields: { id: unik('blok'), blockName: '', ...fields } })

describe('ambilArtikel', () => {
  let tag: string[] = []

  beforeAll(() => {
    pakaiPemicuRevalidasi((t) => tag.push(t))
  })

  afterAll(() => {
    pakaiPemicuRevalidasi(null)
  })

  it('data halaman: relasi, disclaimer pilar, isi bertanda, daftar isi, waktu baca, dan terkait', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    await payload.update({ collection: 'pilar', id: relasi.pilar.id, data: { disclaimer: 'Bukan saran keuangan.' } })
    const foto = await buatGambar(payload, 800, 800)
    await payload.update({ collection: 'penulis', id: relasi.penulis.id, data: { foto: foto.id, keahlian: ['Pajak'] } })
    // `toolId` unik: sisa tes sebelumnya yang gagal dibersihkan dulu, dan tool dihapus di akhir tes.
    await payload.delete({ collection: 'tools', where: { toolId: { equals: 'ipk' } } })
    const tool = await payload.create({
      collection: 'tools',
      data: { _status: 'published', nama: unik('IPK'), toolId: 'ipk', pilar: relasi.pilar.id, ringkasan: 'Hitung IPK.' },
    })
    const lama = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    const draf = await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft' } })
    const isi = isiLexical([
      p(kalimatPanjang(250)),
      h('h2', 'Cara menghitung'),
      p('Baca juga ', tautanInternal(lama.id, 'panduan lama'), '.'),
      h('h3', 'Contoh'),
      unggahan(relasi.gambar.id),
      h('h2', 'Cara menghitung'),
      blok({ blockType: 'embedTool', tool: tool.id }),
      h('h1', 'Isi'),
    ]) as IsiLexical
    const artikel = await payload.create({
      collection: 'artikel',
      data: {
        ...dataArtikelTerbit(relasi),
        isi,
        faq: [{ pertanyaan: 'Apa itu PTKP?', jawaban: 'Penghasilan tidak kena pajak.' }],
        sumber: [{ judul: 'PMK 168/2023', url: 'https://jdih.kemenkeu.go.id/', penerbit: 'Kemenkeu' }],
        artikelTerkait: [draf.id, lama.id],
      },
    })

    const data = await ambilArtikel(payload, artikel.slug as string, { glosarium: false })
    expect(data).not.toBeNull()
    if (!data) return
    expect(data.href).toBe(`/${artikel.slug}`)
    expect(data.pilar).toEqual({
      nama: relasi.pilar.nama,
      slug: relasi.pilar.slug,
      href: `/${relasi.pilar.slug}`,
      warna: 'hijau',
      disclaimer: 'Bukan saran keuangan.',
    })
    expect(data.penulis).toMatchObject({ nama: relasi.penulis.nama, href: `/penulis/${relasi.penulis.slug}`, keahlian: ['Pajak'] })
    expect(data.penulis?.foto).toMatchObject({ width: 800, height: 800, alt: 'Gambar contoh 800px' })
    expect(data.gambar).toMatchObject({ jenis: 'gambar', width: 1600, height: 900 })
    expect(data.gambar?.publicId).toMatch(/^point\/gambar\//)
    expect(data.waktuBaca).toBe(2)
    expect(data.daftarIsi).toEqual([
      { id: 'cara-menghitung', teks: 'Cara menghitung' },
      { id: 'cara-menghitung-2', teks: 'Cara menghitung' },
      { id: 'isi-2', teks: 'Isi' },
    ])
    expect(data.faq).toEqual([{ pertanyaan: 'Apa itu PTKP?', jawaban: 'Penghasilan tidak kena pajak.' }])
    expect(data.sumber).toEqual([{ judul: 'PMK 168/2023', url: 'https://jdih.kemenkeu.go.id/', penerbit: 'Kemenkeu', diaksesPada: null }])
    expect(data.terkait.map((k) => k.id)).toEqual([lama.id])
    expect(data.terkait[0]).toMatchObject({ href: `/${lama.slug}`, tipe: 'panduan', intinya: lama.intinya[0].poin })
    expect(data.seo).toMatchObject({ judul: artikel.judul, slug: artikel.slug, tipe: 'panduan' })
    expect(data.seo).not.toHaveProperty('isi')

    // Relasi di isi ikut dimuat: tautan internal, gambar, dan tool yang disematkan.
    const node = (data.isi?.root?.children ?? []) as Record<string, unknown>[]
    expect(node[1]).toMatchObject({ tag: 'h2', idJangkar: 'cara-menghitung' })
    expect(node[7]).toMatchObject({ tag: 'h2', idJangkar: 'isi-2' })
    const tautan = (node[2].children as Record<string, unknown>[])[1] as { fields: { doc: { value: unknown } } }
    expect(tautan.fields.doc.value).toMatchObject({ id: lama.id, slug: lama.slug, tipe: 'panduan', _status: 'published' })
    expect(node[4]).toMatchObject({ value: { id: relasi.gambar.id, width: 1600, alt: 'Gambar contoh 1600px' } })
    expect(node[6]).toMatchObject({ fields: { tool: { id: tool.id, slug: tool.slug, ringkasan: 'Hitung IPK.' } } })
    await payload.delete({ collection: 'tools', id: tool.id })
  })

  it('hanya artikel terbit; glosarium terpisah dari artikel biasa; slug tidak valid langsung null', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const draf = await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft' } })
    const istilah = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium' } })

    expect(await ambilArtikel(payload, draf.slug as string, { glosarium: false })).toBeNull()
    expect(await ambilArtikel(payload, istilah.slug as string, { glosarium: false })).toBeNull()
    expect((await ambilArtikel(payload, istilah.slug as string, { glosarium: true }))?.href).toBe(`/glosarium/${istilah.slug}`)
    expect(await ambilArtikel(payload, 'favicon.ico', { glosarium: false })).toBeNull()
  })

  it('mengubah media merevalidasi tag media', async () => {
    const payload = await getTestPayload()
    const gambar = await buatGambar(payload)
    tag = []
    await payload.update({ collection: 'media', id: gambar.id, data: { alt: 'Alt baru' } })
    expect(tag).toEqual(['media'])
  })
})
