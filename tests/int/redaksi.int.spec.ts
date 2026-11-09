import { describe, expect, it } from 'vitest'

import { ambilRuangRedaksi } from '@/modules/redaksi/data'

import { getTestPayload, unik } from './helpers'

describe('data beranda admin', () => {
  it('admin: kartu artikel, kalender per pilar, perlu perhatian lengkap, dan bagian Google', async () => {
    const payload = await getTestPayload()
    const sekarang = new Date()
    const data = await ambilRuangRedaksi(payload, { nama: 'Virgiawan Listanto', peran: 'admin' }, { sekarang, periode: 7 })
    expect(data.admin).toBe(true)
    expect(data.nama).toBe('Virgiawan Listanto')
    expect(data.periode).toBe(7)
    expect(data.artikel.terbit).toBeGreaterThanOrEqual(0)
    expect(data.kalender.kolom).toHaveLength(3)
    expect(data.kalender.baris.every((b) => b.sel.length === 4)).toBe(true)
    expect(data.perhatian.map((p) => p.kunci).sort()).toEqual(['404', 'indexing-gagal', 'pesan', 'review-ai', 'tautan-rusak'])
    expect(data.layanan).not.toBeNull()
    expect(data.indeks).not.toBeNull()
    expect(data.kesehatan?.item.map((i) => i.label)).toEqual([
      'Halaman terindeks',
      'Artikel tanpa tautan rusak',
      'Artikel dengan meta deskripsi',
      'Artikel dengan tautan masuk',
    ])
  })

  it('editor: tanpa data Search Console, status indeks, kesehatan, dan temuan SEO', async () => {
    const payload = await getTestPayload()
    const data = await ambilRuangRedaksi(payload, { email: `${unik('editor')}@point.lat`, peran: 'editor' })
    expect(data).toMatchObject({ admin: false, google: null, indeks: null, kesehatan: null, klikPekan: null, layanan: null, dataSampai: null })
    expect(data.perhatian.map((p) => p.kunci).sort()).toEqual(['pesan', 'review-ai'])
    expect(data.terbitTerbaru.every((a) => a.klik7 === null && a.indeks === null)).toBe(true)
  })

  it('artikel terjadwal dihitung dari job schedulePublish yang belum selesai dan tampil di kolom pekannya', async () => {
    const payload = await getTestPayload()
    const sekarang = new Date()
    const sebelum = await ambilRuangRedaksi(payload, { peran: 'admin' }, { sekarang })
    // Pilar yang tampil di kalender (database tes bisa berisi banyak pilar buatan tes lain).
    const pilar = sebelum.kalender.baris[0].pilar
    const [penulis] = (await payload.find({ collection: 'penulis', limit: 1, depth: 0 })).docs
    const judul = unik('Terjadwal')
    const draf = await payload.create({
      collection: 'artikel',
      draft: true,
      data: { judul, slug: judul.toLowerCase(), deck: 'Deck.', pilar: pilar.id as number, penulis: penulis.id, tipe: 'panduan', _status: 'draft' },
    })
    const nanti = new Date(sekarang.getTime() + 60 * 60 * 1000)
    await payload.jobs.queue({
      task: 'schedulePublish',
      input: { type: 'publish', doc: { relationTo: 'artikel', value: draf.id } },
      waitUntil: nanti,
    })
    const sesudah = await ambilRuangRedaksi(payload, { peran: 'admin' }, { sekarang })
    expect(sesudah.artikel.terjadwal).toBe(sebelum.artikel.terjadwal + 1)
    const baris = sesudah.kalender.baris.find((b) => b.pilar.id === pilar.id)!
    const chip = baris.sel.flatMap((s) => s.chip).find((c) => c.id === draf.id)
    expect(chip?.keadaan).toBe('terjadwal')
  })
})
