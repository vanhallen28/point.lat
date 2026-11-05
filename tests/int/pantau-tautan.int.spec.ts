import type { Payload } from 'payload'
import { beforeEach, describe, expect, it } from 'vitest'

import { adapterPalsu, jalankanPantau } from '@/modules/pantau'
import { periksaTautanLuar } from '@/modules/pantau/pindai'
import { PESAN_TEMUAN } from '@/modules/pantau/tautan'
import type { Artikel } from '@/payload-types'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload, unik } from './helpers'

const T0 = new Date('2026-11-05T03:00:00.000Z')
const menit = (n: number) => new Date(T0.getTime() + n * 60_000)
const palsu = adapterPalsu()

const teks = (t: string) => ({ type: 'text', text: t, format: 0, detail: 0, mode: 'normal', style: '', version: 1 })
const tautan = (fields: Record<string, unknown>) => ({ type: 'link', fields, children: [teks('tautan')], direction: null, format: '', indent: 0, version: 3 })
const isi = (...anak: unknown[]) =>
  ({
    root: { type: 'root', direction: null, format: '', indent: 0, version: 1, children: [{ type: 'paragraph', children: anak, direction: null, format: '', indent: 0, version: 1 }] },
  }) as Artikel['isi']

async function kosongkan(payload: Payload) {
  for (const collection of ['tugas-seo', 'temuan-tautan', 'tautan-luar'] as const) {
    await payload.delete({ collection, where: { id: { exists: true } } })
  }
  palsu.reset()
}

describe('pindai tautan dan pemeriksa tautan luar', () => {
  beforeEach(async () => {
    await kosongkan(await getTestPayload())
  })

  it('pindai harian: tautan internal rusak, ke alamat lama, halaman yatim, dan URL situs lain tercatat dengan sumbernya', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const tujuan = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    const yatim = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    const draf = await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft' } })
    const lama = `/${unik('alamat-lama')}`
    const hilang = `/${unik('tidak-ada')}`
    const luar = `https://${unik('sumber')}.example/pph-21`
    await payload.create({ collection: 'redirect', data: { dari: lama, ke: `/${tujuan.slug}`, kode: '301' } })
    const sumber = await payload.create({
      collection: 'artikel',
      data: {
        ...dataArtikelTerbit(relasi),
        isi: isi(
          tautan({ linkType: 'custom', url: `https://point.lat/${tujuan.slug}` }),
          tautan({ linkType: 'internal', doc: { relationTo: 'artikel', value: draf.id } }),
          tautan({ linkType: 'custom', url: hilang }),
          tautan({ linkType: 'custom', url: lama }),
          tautan({ linkType: 'custom', url: luar }),
        ),
        sumber: [{ judul: 'Sumber contoh', url: luar }],
      },
    })

    const hasil = await jalankanPantau(payload, { sekarang: T0, adapter: palsu, tugas: ['tautan'] })
    expect(hasil.tautan?.status).toBe('berhasil')
    expect(hasil.tautan?.pesan).toMatch(/^[\d.]+ tautan dipindai: [\d.]+ tautan internal rusak, [\d.]+ ke alamat lama, [\d.]+ halaman yatim, [\d.]+ URL situs lain\.$/)

    const { docs: dariSumber } = await payload.find({ collection: 'temuan-tautan', where: { sumberId: { equals: String(sumber.id) }, sumberKoleksi: { equals: 'artikel' } }, sort: 'id', depth: 0 })
    expect(dariSumber.map((t) => [t.jenis, t.tujuan, t.pesan, t.sumberKoleksi, t.sumberJudul, t.sumberPath])).toEqual([
      ['rusak', `artikel #${draf.id}`, PESAN_TEMUAN.dokumen, 'artikel', sumber.judul, `/${sumber.slug}`],
      ['rusak', hilang, PESAN_TEMUAN.tidakAda, 'artikel', sumber.judul, `/${sumber.slug}`],
      ['dialihkan', lama, PESAN_TEMUAN.dialihkan(`/${tujuan.slug}`), 'artikel', sumber.judul, `/${sumber.slug}`],
      ['yatim', `/${sumber.slug}`, PESAN_TEMUAN.yatim, 'artikel', sumber.judul, `/${sumber.slug}`],
    ])
    // Dicari lewat path, bukan halaman pertama semua temuan: database tes bisa menyimpan ribuan dokumen dari putaran lain.
    const { docs: yatimSemua } = await payload.find({
      collection: 'temuan-tautan',
      where: { and: [{ jenis: { equals: 'yatim' } }, { tujuan: { in: [`/${yatim.slug}`, `/${tujuan.slug}`] } }] },
      depth: 0,
    })
    expect(yatimSemua.map((t) => t.tujuan)).toContain(`/${yatim.slug}`)
    expect(yatimSemua.map((t) => t.tujuan)).not.toContain(`/${tujuan.slug}`)

    const { docs: barisLuar } = await payload.find({ collection: 'tautan-luar', where: { url: { equals: luar } }, depth: 0 })
    expect(barisLuar).toHaveLength(1)
    expect(barisLuar[0]).toMatchObject({ sumber: [{ koleksi: 'artikel', id: sumber.id, judul: sumber.judul, path: `/${sumber.slug}` }] })
    expect(['belum', 'baik']).toContain(barisLuar[0].status)

    expect((await jalankanPantau(payload, { sekarang: menit(60), adapter: palsu, tugas: ['tautan'] })).tautan).toBeUndefined()
  })

  it('pemeriksa tautan luar: 10 per jalan, 404 rusak, 403 dan batas waktu perlu dicek manual, dicek ulang seminggu atau besok', async () => {
    const payload = await getTestPayload()
    const url = (i: number) => `https://cek-${i}.example/`
    for (let i = 0; i < 12; i++) {
      await payload.create({ collection: 'tautan-luar', data: { url: url(i), status: 'belum', berikutnya: menit(i - 12).toISOString(), sumber: [] } })
    }
    palsu.jawabanTautan.set(url(0), { kodeHttp: 404, galat: null })
    palsu.jawabanTautan.set(url(1), { kodeHttp: 403, galat: null })
    palsu.jawabanTautan.set(url(2), { kodeHttp: null, galat: 'The operation was aborted due to timeout', kodeGalat: 'TimeoutError' })

    expect(await periksaTautanLuar(payload, palsu, T0)).toBe(10)
    expect([...palsu.dibuka].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(url).sort())
    const { docs } = await payload.find({ collection: 'tautan-luar', where: { url: { in: [0, 1, 2, 3, 10].map(url) } }, sort: 'url', depth: 0 })
    expect(docs.map((d) => [d.url, d.status, d.kodeHttp, d.berikutnya])).toEqual([
      [url(0), 'rusak', 404, '2026-11-12T03:00:00.000Z'],
      [url(1), 'tidak-pasti', 403, '2026-11-06T03:00:00.000Z'],
      [url(10), 'belum', null, menit(-2).toISOString()],
      [url(2), 'tidak-pasti', null, '2026-11-06T03:00:00.000Z'],
      [url(3), 'baik', 200, '2026-11-12T03:00:00.000Z'],
    ])
    expect(docs.find((d) => d.url === url(2))?.pesan).toBe('Situs tidak menjawab dalam 10 detik.')
    expect(await periksaTautanLuar(payload, palsu, T0)).toBe(2)
    expect(await periksaTautanLuar(payload, palsu, T0)).toBe(0)

    // URL yang tidak lagi dipakai konten terbit dibuang saat pindai berikutnya.
    await jalankanPantau(payload, { sekarang: T0, adapter: palsu, tugas: ['tautan'] })
    expect((await payload.find({ collection: 'tautan-luar', where: { url: { in: [0, 11].map(url) } }, depth: 0 })).docs).toEqual([])
  })

  it('operasi massal di koleksi tautan: dua baris atau lebih diubah dan dihapus dalam satu operasi', async () => {
    const payload = await getTestPayload()
    for (const i of [1, 2]) {
      await payload.create({ collection: 'tautan-luar', data: { url: `https://massal-${i}.example/`, status: 'belum', berikutnya: T0.toISOString() } })
      await payload.create({
        collection: 'temuan-tautan',
        data: { jenis: 'yatim', tujuan: `/massal-${i}`, pesan: PESAN_TEMUAN.yatim, sumberKoleksi: 'artikel', sumberJudul: 'Massal', ditemukan: T0.toISOString() },
      })
    }
    const ubah = await payload.update({ collection: 'tautan-luar', where: { url: { like: 'massal-' } }, data: { berikutnya: menit(5).toISOString() } })
    expect([ubah.errors, ubah.docs.length]).toEqual([[], 2])
    for (const collection of ['tautan-luar', 'temuan-tautan'] as const) {
      const hapus = await payload.delete({ collection, where: { id: { exists: true } } })
      expect([hapus.errors, hapus.docs.length]).toEqual([[], 2])
    }
  })
})
