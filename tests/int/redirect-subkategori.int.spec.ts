import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import { getTestPayload, unik } from './helpers'

async function buatPilar(payload: Payload) {
  return payload.create({ collection: 'pilar', data: { nama: unik('Pilar'), warna: 'hijau', deskripsi: 'Pilar tes.' } })
}

async function buatSub(payload: Payload, pilar: number) {
  return payload.create({ collection: 'subkategori', data: { nama: unik('Sub'), pilar } })
}

/** Redirect yang berasal dari path di `dari`, sebagai `dari -> ke`. */
async function redirect(payload: Payload, dari: string[]) {
  const { docs } = await payload.find({ collection: 'redirect', where: { dari: { in: dari } }, sort: 'dari', depth: 0, limit: 100 })
  return docs.map((d) => `${d.dari} -> ${d.ke} ${d.kode} ${d.sumber}`)
}

describe('redirect otomatis halaman subkategori /{pilar}/{subkategori}', () => {
  it('ganti slug subkategori: path lama dialihkan ke path baru', async () => {
    const payload = await getTestPayload()
    const pilar = await buatPilar(payload)
    const sub = await buatSub(payload, pilar.id)
    const slugBaru = unik('sub-baru')
    await payload.update({ collection: 'subkategori', id: sub.id, data: { slug: slugBaru } })
    expect(await redirect(payload, [`/${pilar.slug}/${sub.slug}`])).toEqual([`/${pilar.slug}/${sub.slug} -> /${pilar.slug}/${slugBaru} 301 otomatis`])
  })

  it('subkategori pindah pilar: path lama dialihkan ke pilar baru; simpan tanpa perubahan path tidak membuat redirect', async () => {
    const payload = await getTestPayload()
    const [lama, baru] = [await buatPilar(payload), await buatPilar(payload)]
    const sub = await buatSub(payload, lama.id)
    await payload.update({ collection: 'subkategori', id: sub.id, data: { deskripsi: 'Hanya deskripsi.' } })
    expect(await redirect(payload, [`/${lama.slug}/${sub.slug}`])).toEqual([])
    await payload.update({ collection: 'subkategori', id: sub.id, data: { pilar: baru.id } })
    expect(await redirect(payload, [`/${lama.slug}/${sub.slug}`])).toEqual([`/${lama.slug}/${sub.slug} -> /${baru.slug}/${sub.slug} 301 otomatis`])
  })

  it('pilar ganti slug: setiap subkategorinya dialihkan, dan redirect lama ke path subkategori diperbarui tanpa rantai', async () => {
    const payload = await getTestPayload()
    const pilar = await buatPilar(payload)
    const [a, b] = [await buatSub(payload, pilar.id), await buatSub(payload, pilar.id)]
    const alamatLama = `/${unik('alamat-lama')}`
    await payload.create({ collection: 'redirect', data: { dari: alamatLama, ke: `/${pilar.slug}/${a.slug}`, kode: '301' } })
    const slugBaru = unik('pilar-baru')
    await payload.update({ collection: 'pilar', id: pilar.id, data: { slug: slugBaru } })
    expect(await redirect(payload, [`/${pilar.slug}`, `/${pilar.slug}/${a.slug}`, `/${pilar.slug}/${b.slug}`, alamatLama])).toEqual(
      [
        `/${pilar.slug} -> /${slugBaru} 301 otomatis`,
        `/${pilar.slug}/${a.slug} -> /${slugBaru}/${a.slug} 301 otomatis`,
        `/${pilar.slug}/${b.slug} -> /${slugBaru}/${b.slug} 301 otomatis`,
        `${alamatLama} -> /${slugBaru}/${a.slug} 301 manual`,
      ].sort(),
    )
  })

  it('operasi massal: dua subkategori pindah pilar dalam satu update (hook paralel dalam satu transaksi) dan dua pilar diubah lalu dihapus sekaligus', async () => {
    const payload = await getTestPayload()
    const [lama, baru] = [await buatPilar(payload), await buatPilar(payload)]
    const [a, b] = [await buatSub(payload, lama.id), await buatSub(payload, lama.id)]
    const pindah = await payload.update({ collection: 'subkategori', where: { id: { in: [a.id, b.id] } }, data: { pilar: baru.id } })
    expect([pindah.errors, pindah.docs.length]).toEqual([[], 2])
    expect(await redirect(payload, [`/${lama.slug}/${a.slug}`, `/${lama.slug}/${b.slug}`])).toEqual(
      [`/${lama.slug}/${a.slug} -> /${baru.slug}/${a.slug} 301 otomatis`, `/${lama.slug}/${b.slug} -> /${baru.slug}/${b.slug} 301 otomatis`].sort(),
    )

    const ubah = await payload.update({ collection: 'pilar', where: { id: { in: [lama.id, baru.id] } }, data: { urutan: 9 } })
    expect([ubah.errors, ubah.docs.length]).toEqual([[], 2])
    const hapusSub = await payload.delete({ collection: 'subkategori', where: { id: { in: [a.id, b.id] } } })
    expect([hapusSub.errors, hapusSub.docs.length]).toEqual([[], 2])
    const hapusPilar = await payload.delete({ collection: 'pilar', where: { id: { in: [lama.id, baru.id] } } })
    expect([hapusPilar.errors, hapusPilar.docs.length]).toEqual([[], 2])
  })
})
