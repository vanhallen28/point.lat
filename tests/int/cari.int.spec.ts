import { describe, expect, it } from 'vitest'

import { cariArtikel } from '@/modules/konten/data'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload, unik } from './helpers'

describe('cariArtikel', () => {
  it('semua kata harus ada di judul, deck, poin Intinya, atau keyphrase; hanya yang terbit, termasuk glosarium', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const kode = unik('zebra').replace(/-/g, '')
    const judul = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), judul: `Cara menabung ${kode} harian` } })
    const deck = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), deck: `Potongan ${kode} dijelaskan.` } })
    const intinya = await payload.create({
      collection: 'artikel',
      data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium', intinya: [{ poin: `${kode} adalah contoh.` }, { poin: 'Poin kedua.' }] },
    })
    const keyphrase = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), seo: { keyphrase: `${kode} bulanan` } } })
    await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft', judul: `Draf ${kode}` } })

    const id = async (kueri: string) => (await cariArtikel(payload, kueri)).map((k) => k.id)
    expect((await id(kode)).sort()).toEqual([judul.id, deck.id, intinya.id, keyphrase.id].sort())
    expect(await id(`${kode.toUpperCase()} harian`)).toEqual([judul.id])
    expect(await id(`${kode} bulanan`)).toEqual([keyphrase.id])
    expect(await id('')).toEqual([])
  })
})
