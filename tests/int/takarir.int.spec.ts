import { describe, expect, it } from 'vitest'

import { ambilTakarir } from '@/modules/konten/data'

import { siapkanRelasiArtikel, videoMp4 } from './fixtures'
import { getTestPayload, pesanGalat, unik } from './helpers'

const VTT = 'WEBVTT\n\n00:00.000 --> 00:04.000\nAmbil slip gaji bulan lalu.'

describe('takarir video', () => {
  it('disimpan sebagai teks WebVTT; hanya video terbit yang takarirnya dilayani', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    const file = await payload.create({ collection: 'media', data: {}, file: videoMp4() })
    const data = () => ({ _status: 'published' as const, judul: unik('Video'), file: file.id, pilar: relasi.pilar.id, transkrip: 'Transkrip.' })

    expect(await pesanGalat(payload.create({ collection: 'video', data: { ...data(), takarir: 'Bukan VTT' } }))).toBe(
      'takarir: Takarir harus diawali baris WEBVTT.',
    )
    const terbit = await payload.create({ collection: 'video', data: { ...data(), takarir: VTT } })
    const tanpa = await payload.create({ collection: 'video', data: data() })
    const draf = await payload.create({ collection: 'video', draft: true, data: { ...data(), _status: 'draft', takarir: VTT } })

    expect(await ambilTakarir(payload, terbit.slug as string)).toBe(VTT)
    expect(await ambilTakarir(payload, tanpa.slug as string)).toBeNull()
    expect(await ambilTakarir(payload, draf.slug as string)).toBeNull()
  })
})
