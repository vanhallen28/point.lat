import { describe, expect, it } from 'vitest'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload, pesanGalat, unik } from './helpers'

describe('koleksi artikel', () => {
  it('draf boleh belum lengkap dan belum punya tanggal terbit', async () => {
    const payload = await getTestPayload()
    const draf = await payload.create({
      collection: 'artikel',
      draft: true,
      data: { judul: unik('Draf setengah jadi') },
    })
    expect(draf._status).toBe('draft')
    expect(draf.terbitPada).toBeFalsy()
  })

  it('terbit mengisi terbitPada; perubahan besar mengisi diperbaruiBesar', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const artikel = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    expect(artikel.terbitPada).toBeTruthy()
    expect(artikel.diperbaruiBesar).toBeFalsy()

    const diperbarui = await payload.update({
      collection: 'artikel',
      id: artikel.id,
      data: { _status: 'published', perubahanBesar: true },
    })
    expect(diperbarui.terbitPada).toBe(artikel.terbitPada)
    expect(diperbarui.diperbaruiBesar).toBeTruthy()
    expect(diperbarui.perubahanBesar).toBe(false)
  })

  it('menolak terbit dengan kotak Intinya kurang dari 2 poin', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const pesan = await pesanGalat(
      payload.create({
        collection: 'artikel',
        data: { ...dataArtikelTerbit(relasi), intinya: [{ poin: 'Hanya satu poin.' }] },
      }),
    )
    expect(pesan).toMatch(/^intinya:/)
  })

  it('menolak terbit dengan gambar utama di bawah 1200px', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload, 800)
    const pesan = await pesanGalat(
      payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) }),
    )
    expect(pesan).toMatch(/gambarUtama: Gambar utama minimal 1200px/)
  })
})
