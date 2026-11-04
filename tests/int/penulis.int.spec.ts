import { describe, expect, it } from 'vitest'

import { ambilPenulis } from '@/modules/konten/data'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload } from './helpers'

describe('ambilPenulis', () => {
  it('profil dengan tulisan terbitnya saja, terbaru dulu', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const lain = await siapkanRelasiArtikel(payload)
    const lama = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    const baru = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft' } })
    await payload.create({ collection: 'artikel', data: dataArtikelTerbit(lain) })

    const penulis = await ambilPenulis(payload, relasi.penulis.slug as string)
    expect(penulis?.nama).toBe(relasi.penulis.nama)
    expect(penulis?.artikel.map((k) => k.id)).toEqual([baru.id, lama.id])
    expect(await ambilPenulis(payload, 'tidak-ada-penulis-ini')).toBeNull()
  })
})
