import { describe, expect, it } from 'vitest'

import { ambilPenulis, ambilRubrik } from '@/modules/konten/data'
import { UKURAN_HALAMAN } from '@/modules/konten/paginasi'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload, unik } from './helpers'

describe('daftar berhalaman: rubrik dan profil penulis', () => {
  it(`${UKURAN_HALAMAN} tulisan per halaman, terbaru dulu, urutan tetap walau tanggal terbit sama, dan nomor di luar jangkauan null`, async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const sub = await payload.create({ collection: 'subkategori', data: { nama: unik('Persiapan ujian'), pilar: relasi.pilar.id } })
    const id: number[] = []
    // 27 tulisan: 26 di subkategori, satu tanpa subkategori. Dua tulisan pertama terbit di detik yang sama.
    for (let i = 0; i < UKURAN_HALAMAN + 3; i++) {
      const terbitPada = new Date(Date.UTC(2026, 0, 1, 0, 0, Math.max(i, 1))).toISOString()
      const doc = await payload.create({
        collection: 'artikel',
        data: { ...dataArtikelTerbit(relasi), terbitPada, ...(i === UKURAN_HALAMAN + 2 ? {} : { subkategori: sub.id }) },
      })
      id.push(doc.id)
    }
    await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium', subkategori: sub.id } })
    // Terbaru dulu; tanggal sama (dua tulisan pertama): ID lebih besar dulu.
    const urut = [...id].reverse()
    const pilarSlug = relasi.pilar.slug as string

    const satu = await ambilRubrik(payload, pilarSlug, null)
    expect(satu?.artikel.map((k) => k.id)).toEqual(urut.slice(0, UKURAN_HALAMAN))
    expect(satu?.paginasi).toMatchObject({ nomor: 1, jumlah: 2, sebelumnya: null, berikutnya: `/${pilarSlug}/halaman/2` })
    expect(satu?.seo).toMatchObject({ jenis: 'pilar', halaman: 1 })

    const dua = await ambilRubrik(payload, pilarSlug, null, 2)
    expect(dua?.artikel.map((k) => k.id)).toEqual(urut.slice(UKURAN_HALAMAN))
    expect(dua?.paginasi).toMatchObject({ nomor: 2, jumlah: 2, sebelumnya: `/${pilarSlug}`, berikutnya: null })
    expect(dua?.href).toBe(`/${pilarSlug}`)
    expect(dua?.seo).toMatchObject({ jenis: 'pilar', halaman: 2 })
    expect(await ambilRubrik(payload, pilarSlug, null, 3)).toBeNull()

    const subDua = await ambilRubrik(payload, pilarSlug, sub.slug as string, 2)
    expect(subDua?.artikel.map((k) => k.id)).toEqual(urut.slice(UKURAN_HALAMAN + 1).filter((n) => n !== id[UKURAN_HALAMAN + 2]))
    expect(subDua?.paginasi.sebelumnya).toBe(`/${pilarSlug}/${sub.slug}`)
    expect(subDua?.seo).toMatchObject({ jenis: 'subkategori', halaman: 2 })

    const penulis = await ambilPenulis(payload, relasi.penulis.slug as string, 2)
    expect(penulis?.artikel.map((k) => k.id)).toEqual(urut.slice(UKURAN_HALAMAN))
    expect(penulis?.paginasi).toMatchObject({ nomor: 2, jumlah: 2, sebelumnya: `/penulis/${relasi.penulis.slug}` })
    expect(await ambilPenulis(payload, relasi.penulis.slug as string, 3)).toBeNull()
  })

  it('daftar kosong tetap punya halaman 1; halaman 2 null', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const pilar = await ambilRubrik(payload, relasi.pilar.slug as string, null)
    expect(pilar?.artikel).toEqual([])
    expect(pilar?.paginasi).toMatchObject({ nomor: 1, jumlah: 1 })
    expect(await ambilRubrik(payload, relasi.pilar.slug as string, null, 2)).toBeNull()
    expect((await ambilPenulis(payload, relasi.penulis.slug as string))?.paginasi.jumlah).toBe(1)
  })
})
