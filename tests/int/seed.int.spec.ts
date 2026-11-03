import { describe, expect, it } from 'vitest'

import { PILAR_AWAL, seed } from '@/seed/seed'

import { getTestPayload } from './helpers'

describe('seed', () => {
  it('membuat 4 pilar, penulis redaksi, halaman statis, dan global, dan aman dijalankan ulang', async () => {
    const payload = await getTestPayload()

    await seed(payload)
    await seed(payload)

    for (const pilar of PILAR_AWAL) {
      const { totalDocs } = await payload.count({
        collection: 'pilar',
        where: { slug: { equals: pilar.slug } },
      })
      expect(totalDocs).toBe(1)
    }

    const redaksi = await payload.count({ collection: 'penulis', where: { slug: { equals: 'redaksi' } } })
    expect(redaksi.totalDocs).toBe(1)

    const tentang = await payload.find({
      collection: 'halaman',
      where: { slug: { equals: 'tentang' } },
      draft: true,
    })
    expect(tentang.docs).toHaveLength(1)
    expect(tentang.docs[0]?._status).toBe('draft')

    const header = await payload.findGlobal({ slug: 'header' })
    expect(header.menu?.map((m) => m.label)).toEqual(PILAR_AWAL.map((p) => p.nama))

    const beranda = await payload.findGlobal({ slug: 'beranda' })
    expect(beranda.tataLetak?.[0]?.blockType).toBe('heroBeranda')
  })
})
