import { describe, expect, it } from 'vitest'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload, pesanGalat, unik } from './helpers'

describe('slug tingkat atas', () => {
  it('halaman dan artikel non-glosarium tidak boleh memakai slug pilar', async () => {
    const payload = await getTestPayload()
    const slug = unik('bentrok')
    await payload.create({
      collection: 'pilar',
      data: { nama: 'Bentrok', slug, warna: 'koral', deskripsi: 'x' },
    })

    const pesanHalaman = await pesanGalat(
      payload.create({ collection: 'halaman', data: { _status: 'published', judul: 'Tentang', slug } }),
    )
    expect(pesanHalaman).toMatch(/slug: .*sudah dipakai pilar/)

    const relasi = await siapkanRelasiArtikel(payload)
    const pesanArtikel = await pesanGalat(
      payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), slug } }),
    )
    expect(pesanArtikel).toMatch(/slug: .*sudah dipakai pilar/)
  })

  it('artikel glosarium boleh memakai slug yang sama karena berada di /glosarium', async () => {
    const payload = await getTestPayload()
    const slug = unik('istilah')
    await payload.create({
      collection: 'pilar',
      data: { nama: 'Istilah', slug, warna: 'kuning', deskripsi: 'x' },
    })
    const relasi = await siapkanRelasiArtikel(payload)
    const glosarium = await payload.create({
      collection: 'artikel',
      data: { ...dataArtikelTerbit(relasi), slug, tipe: 'glosarium' },
    })
    expect(glosarium.slug).toBe(slug)
  })
})

describe('redirect otomatis', () => {
  it('mengganti slug artikel terbit membuat redirect 301', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const artikel = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    const slugBaru = unik('judul-baru')

    await payload.update({
      collection: 'artikel',
      id: artikel.id,
      data: { _status: 'published', slug: slugBaru },
    })

    const { docs } = await payload.find({
      collection: 'redirect',
      where: { dari: { equals: `/${artikel.slug}` } },
    })
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({ ke: `/${slugBaru}`, kode: '301', sumber: 'otomatis' })
  })

  it('slug yang berubah lewat draf baru membuat redirect saat diterbitkan', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const artikel = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    const slugBaru = unik('lewat-draf')

    await payload.update({ collection: 'artikel', id: artikel.id, draft: true, data: { slug: slugBaru } })
    const sebelumTerbit = await payload.find({
      collection: 'redirect',
      where: { dari: { equals: `/${artikel.slug}` } },
    })
    expect(sebelumTerbit.docs).toHaveLength(0)

    await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'published' } })
    const setelahTerbit = await payload.find({
      collection: 'redirect',
      where: { dari: { equals: `/${artikel.slug}` } },
    })
    expect(setelahTerbit.docs[0]?.ke).toBe(`/${slugBaru}`)
  })
})
