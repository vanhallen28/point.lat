import { describe, expect, it } from 'vitest'

import { PARAMETER_AWAL } from '@/seed/parameter-tools'
import { PILAR_AWAL, seed } from '@/seed/seed'
import { TOOLS_AWAL } from '@/seed/tools'

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

    const pilar = await payload.find({ collection: 'pilar', where: { slug: { in: ['uang-karier', 'tekno', 'sehat'] } }, sort: 'urutan' })
    expect(pilar.docs.map((p) => Boolean(p.disclaimer))).toEqual([true, false, true])

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

  it('membuat enam tools draf dan parameternya sekali saja', async () => {
    const payload = await getTestPayload()
    // Tes lain membuat dan menghapus tools dengan toolId yang sama, jadi seed diulang dari keadaan bersih.
    await payload.delete({ collection: 'tools', where: { toolId: { in: TOOLS_AWAL.map((t) => t.toolId) } } })
    await payload.delete({ collection: 'parameter-tools', where: { id: { exists: true } } })

    const pertama = await seed(payload)
    expect([pertama.tools, pertama.parameter]).toEqual([6, PARAMETER_AWAL.length])
    const kedua = await seed(payload)
    expect([kedua.tools, kedua.parameter]).toEqual([0, 0])

    const { docs } = await payload.find({ collection: 'tools', draft: true, depth: 1, sort: 'slug', limit: 10 })
    expect(docs.map((d) => [d.slug, d._status, typeof d.pilar === 'object' ? d.pilar.slug : null])).toEqual([
      ['bmi-kalori', 'draft', 'sehat'],
      ['cicilan-kpr', 'draft', 'uang-karier'],
      ['dana-darurat', 'draft', 'uang-karier'],
      ['gaji-bersih', 'draft', 'uang-karier'],
      ['ipk', 'draft', 'belajar'],
      ['thr', 'draft', 'uang-karier'],
    ])
    const gaji = docs.find((d) => d.slug === 'gaji-bersih')
    expect(gaji?.bantuanInput?.map((b) => b.kunci)).toEqual(['gaji', 'status', 'tunjanganLain', 'bpjsKesehatan', 'bpjsKetenagakerjaan', 'iuranLain'])
    expect(gaji?.sumberAturan?.[0]?.url).toBe('https://www.pajak.go.id/sites/default/files/lampiran/Lampiran%20PP58TAHUN2023.pdf')
    expect(gaji?.seo?.judulSEO).toBe('Kalkulator Gaji Bersih 2026 dengan PPh 21 TER dan BPJS')
    const ipk = docs.find((d) => d.slug === 'ipk')
    expect(ipk?.bantuanInput?.map((b) => b.kunci)).toEqual(['matkul', 'sks', 'nilai', 'ipkLama', 'sksLama'])

    const terA = await payload.find({ collection: 'parameter-tools', where: { kunci: { equals: 'ter-a' } }, limit: 1 })
    expect(terA.docs[0]?.tabel).toHaveLength(44)
    const jp = await payload.find({ collection: 'parameter-tools', where: { kunci: { equals: 'jp-batas' } }, sort: 'berlakuMulai' })
    expect(jp.docs.map((d) => [d.nilai, d.berlakuMulai.slice(0, 10)])).toEqual([
      [10_547_400, '2025-03-01'],
      [11_086_300, '2026-03-01'],
    ])
  })
})
