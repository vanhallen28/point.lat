import { describe, expect, it } from 'vitest'

import { paragrafLexical } from '@/lib/lexical'
import { ambilHalaman } from '@/modules/konten/data'

import { siapkanRelasiArtikel } from './fixtures'
import { getTestPayload, unik } from './helpers'

describe('ambilHalaman', () => {
  it('hanya halaman terbit; blok tool dimuat lengkap untuk tautan', async () => {
    const payload = await getTestPayload()
    const relasi = await siapkanRelasiArtikel(payload)
    // `toolId` unik: sisa tes sebelumnya dibersihkan dulu, dan tool dihapus di akhir tes.
    await payload.delete({ collection: 'tools', where: { toolId: { equals: 'thr' } } })
    const tool = await payload.create({
      collection: 'tools',
      data: { _status: 'published', nama: unik('THR'), toolId: 'thr', pilar: relasi.pilar.id, ringkasan: 'Hitung THR.' },
    })
    const terbit = await payload.create({
      collection: 'halaman',
      data: {
        _status: 'published',
        judul: unik('Tentang'),
        tataLetak: [
          { blockType: 'teks', isi: paragrafLexical(['Redaksi kecil yang menulis dari intinya.']) },
          { blockType: 'embedTool', tool: tool.id },
        ],
      },
    })
    const draf = await payload.create({ collection: 'halaman', draft: true, data: { _status: 'draft', judul: unik('Kontak') } })

    const halaman = await ambilHalaman(payload, terbit.slug as string)
    expect(halaman).toMatchObject({ judul: terbit.judul, heroUtama: false })
    expect(halaman?.blok[1]).toMatchObject({ jenis: 'tool', nama: tool.nama, href: `/tools/${tool.slug}` })
    expect(await ambilHalaman(payload, draf.slug as string)).toBeNull()
    await payload.delete({ collection: 'tools', id: tool.id })
  })
})
