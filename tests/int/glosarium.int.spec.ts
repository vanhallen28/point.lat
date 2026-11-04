import { describe, expect, it } from 'vitest'

import { ambilGlosarium } from '@/modules/konten/data'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload, unik } from './helpers'

describe('ambilGlosarium', () => {
  it('hanya istilah glosarium yang terbit', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const terbit = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium', judul: unik('Zakat') } })
    const draf = await payload.create({
      collection: 'artikel',
      draft: true,
      data: { ...dataArtikelTerbit(relasi), _status: 'draft', tipe: 'glosarium', judul: unik('Zona') },
    })
    const panduan = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), judul: unik('Zebra') } })

    const href = (await ambilGlosarium(payload)).flatMap((k) => k.istilah.map((i) => i.href))
    expect(href).toContain(`/glosarium/${terbit.slug}`)
    expect(href).not.toContain(`/glosarium/${draf.slug}`)
    expect(href.some((h) => h.endsWith(`/${panduan.slug}`))).toBe(false)
  })
})
