import type { Payload } from 'payload'
import { describe, expect, it } from 'vitest'

import { ambilEntriSitemap } from '@/modules/seo/data'

import { dataArtikelTerbit, siapkanRelasiArtikel, videoMp4 } from './fixtures'
import { getTestPayload, unik } from './helpers'

/** Jenis kabar untuk satu path, berurutan: setiap kabar mencatat satu langkah revalidasi. */
async function kabarUntuk(payload: Payload, path: string): Promise<string[]> {
  const { docs } = await payload.find({
    collection: 'log-indexing',
    where: { and: [{ url: { equals: `https://point.lat${path}` } }, { langkah: { equals: 'revalidasi' } }] },
    sort: ['waktu', 'id'],
    limit: 50,
    depth: 0,
  })
  return docs.map((d) => d.jenis ?? '')
}

async function diSitemap(payload: Payload, path: string): Promise<boolean> {
  const entri = await ambilEntriSitemap(payload, 'artikel', { urlSitus: 'https://point.lat' })
  return entri.some((e) => e.loc === `https://point.lat${path}`)
}

describe('pemicu Mesin Indexing di koleksi', () => {
  it('artikel: terbit, simpan draf dan suntingan kecil tidak, perubahan besar, batal terbit, terbit lagi, hapus', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const artikel = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    const path = `/${artikel.slug}`
    expect(await kabarUntuk(payload, path)).toEqual(['terbit'])

    await payload.update({ collection: 'artikel', id: artikel.id, draft: true, data: { judul: `${artikel.judul} draf` } })
    await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'published', deck: 'Deck baru yang sedikit berbeda.' } })
    expect(await kabarUntuk(payload, path)).toEqual(['terbit'])

    await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'published', perubahanBesar: true } })
    expect(await kabarUntuk(payload, path)).toEqual(['terbit', 'ubah-besar'])

    await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'draft' } })
    expect(await kabarUntuk(payload, path)).toEqual(['terbit', 'ubah-besar', 'hapus'])
    expect(await diSitemap(payload, path)).toBe(false)
    expect((await payload.find({ collection: 'status-indeks', where: { path: { equals: path } } })).docs).toEqual([])

    await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'published' } })
    expect(await diSitemap(payload, path)).toBe(true)
    await payload.delete({ collection: 'artikel', id: artikel.id })
    expect(await kabarUntuk(payload, path)).toEqual(['terbit', 'ubah-besar', 'hapus', 'terbit', 'hapus'])
    const { docs } = await payload.find({ collection: 'antrean-indexing', where: { path: { equals: path } }, depth: 0 })
    expect(docs.map((d) => [d.langkah, d.jenis])).toEqual([['indexnow', 'hapus']])
  })

  it('ganti slug: path lama pindah dan path baru terbit; noindex berarti keluar dari indeks', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const artikel = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
    const slugBaru = unik('gaji-bersih-baru')
    await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'published', slug: slugBaru } })
    expect(await kabarUntuk(payload, `/${artikel.slug}`)).toEqual(['terbit', 'pindah'])
    expect(await kabarUntuk(payload, `/${slugBaru}`)).toEqual(['terbit'])

    await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'published', seo: { noindex: true } } })
    expect(await kabarUntuk(payload, `/${slugBaru}`)).toEqual(['terbit', 'hapus'])
  })

  it('pilar, halaman, video, dan tools ikut dikabarkan; angka aturan berubah mengabari kalkulator yang memakainya', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    expect(await kabarUntuk(payload, `/${relasi.pilar.slug}`)).toEqual(['terbit'])

    const halaman = await payload.create({ collection: 'halaman', data: { _status: 'published', judul: unik('Tentang') } })
    expect(await kabarUntuk(payload, `/${halaman.slug}`)).toEqual(['terbit'])

    const file = await payload.create({ collection: 'media', data: {}, file: videoMp4() })
    const video = await payload.create({
      collection: 'video',
      data: { _status: 'published', judul: unik('Video PPh 21'), file: file.id, pilar: relasi.pilar.id, transkrip: 'Transkrip.' },
    })
    expect(await kabarUntuk(payload, `/video/${video.slug}`)).toEqual(['terbit'])

    // `toolId` unik: tools Dana Darurat dari seed atau sisa tes sebelumnya dibersihkan dulu.
    await payload.delete({ collection: 'tools', where: { toolId: { equals: 'dana-darurat' } } })
    const tools = await payload.create({
      collection: 'tools',
      data: { _status: 'published', nama: unik('Dana Darurat'), toolId: 'dana-darurat', pilar: relasi.pilar.id, ringkasan: 'Hitung dana darurat.' },
    })
    const parameter = await payload.create({
      collection: 'parameter-tools',
      data: { toolId: 'dana-darurat', kunci: 'kelipatan', berlakuMulai: '2001-01-01', tabel: [{ label: 'Lajang tanpa tanggungan', nilai: 6 }] },
    })
    expect(await kabarUntuk(payload, `/tools/${tools.slug}`)).toEqual(['terbit', 'ubah-besar'])
    await payload.delete({ collection: 'parameter-tools', id: parameter.id })
    await payload.delete({ collection: 'tools', id: tools.id })
    expect(await kabarUntuk(payload, `/tools/${tools.slug}`)).toEqual(['terbit', 'ubah-besar', 'ubah-besar', 'hapus'])
  })
})
