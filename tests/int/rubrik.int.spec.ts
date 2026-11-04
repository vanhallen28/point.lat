import { describe, expect, it } from 'vitest'

import { ambilRubrik } from '@/modules/konten/data'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload, unik } from './helpers'

describe('ambilRubrik', () => {
  it('pilar dan subkategori: tulisan terbit terbaru tanpa glosarium dan draf, subkategori milik pilar itu saja', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const lain = await payload.create({ collection: 'pilar', data: { nama: unik('Tekno'), warna: 'oranye', deskripsi: 'Tekno.' } })
    const pajak = await payload.create({ collection: 'subkategori', data: { nama: unik('Pajak'), pilar: relasi.pilar.id } })
    const subLain = await payload.create({ collection: 'subkategori', data: { nama: unik('AI'), pilar: lain.id } })

    const lama = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), subkategori: pajak.id } })
    const baru = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium' } })
    await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft', subkategori: pajak.id } })

    const pilar = await ambilRubrik(payload, relasi.pilar.slug as string, null)
    expect(pilar?.judul).toBe(relasi.pilar.nama)
    expect(pilar?.artikel.map((k) => k.id)).toEqual([baru.id, lama.id])
    expect(pilar?.subkategori.map((s) => s.label)).toEqual(['Semua', pajak.nama])

    const sub = await ambilRubrik(payload, relasi.pilar.slug as string, pajak.slug as string)
    expect(sub?.judul).toBe(pajak.nama)
    expect(sub?.artikel.map((k) => k.id)).toEqual([lama.id])

    expect(await ambilRubrik(payload, relasi.pilar.slug as string, subLain.slug as string)).toBeNull()
    expect(await ambilRubrik(payload, relasi.pilar.slug as string, 'tidak-ada')).toBeNull()
    expect(await ambilRubrik(payload, 'favicon.ico', null)).toBeNull()
  })
})
