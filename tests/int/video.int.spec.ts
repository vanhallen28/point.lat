import { describe, expect, it } from 'vitest'

import { ambilDaftarVideo, ambilVideo } from '@/modules/konten/data'

import { dataArtikelTerbit, siapkanRelasiArtikel, videoMp4 } from './fixtures'
import { getTestPayload, unik } from './helpers'

describe('ambilVideo dan ambilDaftarVideo', () => {
  it('video terbit saja, artikel induk dari videoTerkait, dan video lain tanpa dirinya', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const file = await payload.create({ collection: 'media', data: {}, file: videoMp4() })
    const dataVideo = () => ({ _status: 'published' as const, judul: unik('Video PPh 21'), file: file.id, pilar: relasi.pilar.id, transkrip: 'Transkrip.' })
    const pertama = await payload.create({ collection: 'video', data: dataVideo() })
    const kedua = await payload.create({ collection: 'video', data: { ...dataVideo(), durasiDetik: 45 } })
    const draf = await payload.create({ collection: 'video', draft: true, data: { ...dataVideo(), _status: 'draft' } })
    const induk = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), videoTerkait: pertama.id } })

    const daftar = (await ambilDaftarVideo(payload)).map((v) => v.id)
    expect(daftar.indexOf(kedua.id)).toBeLessThan(daftar.indexOf(pertama.id))
    expect(daftar).not.toContain(draf.id)

    const video = await ambilVideo(payload, pertama.slug as string)
    expect(video).toMatchObject({ judul: pertama.judul, durasi: 30, poster: { jenis: 'video' } })
    expect(video?.induk?.id).toBe(induk.id)
    expect(video?.lain.map((v) => v.id)).toContain(kedua.id)
    expect(video?.lain.map((v) => v.id)).not.toContain(pertama.id)
    expect((await ambilVideo(payload, kedua.slug as string))?.durasi).toBe(45)
    expect(await ambilVideo(payload, draf.slug as string)).toBeNull()
  })
})
