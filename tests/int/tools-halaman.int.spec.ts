import { describe, expect, it } from 'vitest'

import { ambilTool } from '@/modules/konten/data'

import { getTestPayload, unik } from './helpers'

describe('ambilTool', () => {
  it('tools terbit dengan parameter kalkulator sumbernya; draf dan slug tidak dikenal null', async () => {
    const payload = await getTestPayload()
    const pilar = await payload.create({ collection: 'pilar', data: { nama: unik('Uang'), warna: 'hijau', deskripsi: 'Uang.' } })
    // `toolId` unik: tools THR dari seed atau sisa tes sebelumnya dibersihkan dulu.
    await payload.delete({ collection: 'tools', where: { toolId: { equals: 'thr' } } })
    const thr = await payload.create({
      collection: 'tools',
      data: {
        _status: 'published',
        nama: unik('THR'),
        toolId: 'thr',
        pilar: pilar.id,
        ringkasan: 'Hitung THR.',
        bantuanInput: [{ kunci: 'upah', label: 'Upah sebulan', bantuan: 'Gaji pokok dan tunjangan tetap.' }],
      },
    })
    // Tanggal berlaku 2001 tidak dipakai seed, jadi dokumen ini bisa dikenali, termasuk sisa tes yang gagal.
    await payload.delete({ collection: 'parameter-tools', where: { berlakuMulai: { equals: '2001-01-01' } } })
    const milikGaji = await payload.create({
      collection: 'parameter-tools',
      data: { toolId: 'gaji-bersih', kunci: 'jkm', nilai: 0.3, berlakuMulai: '2001-01-01', sumber: { judul: 'BPJS', url: 'https://www.bpjsketenagakerjaan.go.id/' } },
    })
    const milikIpk = await payload.create({
      collection: 'parameter-tools',
      data: { toolId: 'ipk', kunci: 'konversi-nilai', berlakuMulai: '2001-01-01', tabel: [{ label: 'A', nilai: 4 }] },
    })

    const data = await ambilTool(payload, thr.slug ?? '')
    expect(data).toMatchObject({ nama: thr.nama, toolId: 'thr', href: `/tools/${thr.slug}`, bantuan: { upah: { label: 'Upah sebulan' } } })
    expect(data?.pilar?.slug).toBe(pilar.slug)
    const tahun2001 = data?.parameter.filter((p) => p.berlakuMulai.startsWith('2001-01-01'))
    expect(tahun2001).toEqual([
      {
        toolId: 'gaji-bersih',
        kunci: 'jkm',
        nilai: 0.3,
        tabel: null,
        berlakuMulai: '2001-01-01T00:00:00.000Z',
        berlakuSampai: null,
        sumber: { judul: 'BPJS', url: 'https://www.bpjsketenagakerjaan.go.id/' },
      },
    ])

    expect(await ambilTool(payload, 'tidak-ada-tools-ini')).toBeNull()
    await payload.update({ collection: 'tools', id: thr.id, data: { _status: 'draft' } })
    expect(await ambilTool(payload, thr.slug ?? '')).toBeNull()

    await payload.delete({ collection: 'tools', id: thr.id })
    await payload.delete({ collection: 'parameter-tools', where: { id: { in: [milikGaji.id, milikIpk.id] } } })
  })
})
