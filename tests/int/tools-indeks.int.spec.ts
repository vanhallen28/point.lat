import { describe, expect, it } from 'vitest'

import { ambilTools } from '@/modules/konten/data'

import { getTestPayload, unik } from './helpers'

describe('ambilTools', () => {
  it('hanya tools terbit, dikelompokkan per pilar', async () => {
    const payload = await getTestPayload()
    const pilar = await payload.create({ collection: 'pilar', data: { nama: unik('Uang'), warna: 'hijau', deskripsi: 'Uang.' } })
    // `toolId` unik: sisa tes sebelumnya dibersihkan dulu, dan tools dihapus di akhir tes.
    await payload.delete({ collection: 'tools', where: { toolId: { in: ['dana-darurat', 'cicilan-kpr'] } } })
    const terbit = await payload.create({
      collection: 'tools',
      data: { _status: 'published', nama: unik('Dana Darurat'), toolId: 'dana-darurat', pilar: pilar.id, ringkasan: 'Hitung dana darurat.' },
    })
    const draf = await payload.create({
      collection: 'tools',
      draft: true,
      data: { _status: 'draft', nama: unik('Cicilan'), toolId: 'cicilan-kpr', pilar: pilar.id, ringkasan: 'Hitung cicilan.' },
    })

    const kelompok = (await ambilTools(payload)).find((k) => k.pilar.slug === pilar.slug)
    expect(kelompok?.tools.map((t) => t.href)).toEqual([`/tools/${terbit.slug}`])
    await payload.delete({ collection: 'tools', where: { id: { in: [terbit.id, draf.id] } } })
  })
})
