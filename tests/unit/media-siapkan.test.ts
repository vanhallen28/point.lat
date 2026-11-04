import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { KANVAS_OG } from '@/modules/media/og'
import { klienPalsu } from '@/modules/media/palsu'
import { siapkanCloudinary } from '@/modules/media/siapkan'

describe('siapkanCloudinary', () => {
  it('mengunggah kanvas OG 1x1 putih sekali, lalu melewatinya bila sudah ada', async () => {
    const klien = klienPalsu()
    expect(await siapkanCloudinary(klien)).toEqual({ kanvas: 'dibuat' })

    const kanvas = klien.aset.get(KANVAS_OG)
    expect(kanvas).toMatchObject({ resourceType: 'image', format: 'png', lewat: 'server' })
    expect(kanvas?.opsi.transformation).toBe('')
    const meta = await sharp(kanvas!.isi).metadata()
    expect([meta.width, meta.height]).toEqual([1, 1])

    expect(await siapkanCloudinary(klien)).toEqual({ kanvas: 'sudah-ada' })
    expect(klien.aset.size).toBe(1)
  })
})
