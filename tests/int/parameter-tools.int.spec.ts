import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'

import { getTestPayload, pesanGalat } from './helpers'

let tag: string[] = []

describe('parameter-tools: angka dan tabel bertanggal', () => {
  beforeAll(() => {
    pakaiPemicuRevalidasi((t) => tag.push(t))
  })

  afterAll(() => {
    pakaiPemicuRevalidasi(null)
  })

  beforeEach(() => {
    tag = []
  })

  it('menyimpan tabel berurutan dengan batas kosong di baris terakhir', async () => {
    const payload = await getTestPayload()
    const doc = await payload.create({
      collection: 'parameter-tools',
      data: {
        toolId: 'gaji-bersih',
        kunci: 'tarif-pasal-17',
        berlakuMulai: '2022-01-01',
        tabel: [
          { batas: 60_000_000, nilai: 5 },
          { batas: 250_000_000, nilai: 15 },
          { batas: null, nilai: 35 },
        ],
        sumber: { judul: 'UU HPP', url: 'https://www.pajak.go.id/' },
      },
    })
    const dibaca = await payload.findByID({ collection: 'parameter-tools', id: doc.id })
    expect(dibaca.nilai).toBeNull()
    expect(dibaca.tabel?.map((b) => [b.batas, b.nilai])).toEqual([
      [60_000_000, 5],
      [250_000_000, 15],
      [null, 35],
    ])
    await payload.delete({ collection: 'parameter-tools', id: doc.id })
  })

  it('menolak kunci yang tidak dikenal, angka tanpa nilai, dan baris tabel tanpa tarif', async () => {
    const payload = await getTestPayload()
    const dasar = { toolId: 'gaji-bersih' as const, berlakuMulai: '2026-01-01' }
    expect(await pesanGalat(payload.create({ collection: 'parameter-tools', data: { ...dasar, kunci: 'ptkp-tk0', nilai: 1 } }))).toMatch(
      /^kunci: Kunci "ptkp-tk0" tidak dipakai kalkulator ini\. Pilih salah satu: ptkp-dasar, ptkp-kawin, ptkp-tanggungan, ter-a/,
    )
    expect(await pesanGalat(payload.create({ collection: 'parameter-tools', data: { ...dasar, kunci: 'jkm' } }))).toBe(
      'nilai: Isi nilai premi JKM dari kantor.',
    )
    expect(
      await pesanGalat(
        payload.create({ collection: 'parameter-tools', data: { ...dasar, kunci: 'ter-c', tabel: [{ batas: 6_600_000 }, { nilai: 0.25 }] } }),
      ),
    ).toBe('tabel: Baris 1: isi kolom Tarif.')
  })

  it('mengubah satu field memeriksa dokumen lengkap; simpan dan hapus merevalidasi halaman tools', async () => {
    const payload = await getTestPayload()
    const doc = await payload.create({
      collection: 'parameter-tools',
      data: { toolId: 'gaji-bersih', kunci: 'jp-batas', nilai: 11_086_300, berlakuMulai: '2026-03-01', berlakuSampai: '2027-02-28' },
    })
    expect(tag).toEqual(['parameter-tools'])
    const ubah = await payload.update({ collection: 'parameter-tools', id: doc.id, data: { nilai: 11_086_400 } })
    expect(ubah.nilai).toBe(11_086_400)
    expect(await pesanGalat(payload.update({ collection: 'parameter-tools', id: doc.id, data: { tabel: [{ batas: 1, nilai: 1 }] } }))).toBe(
      'tabel: Parameter ini berupa satu angka. Kosongkan tabel dan isi Nilai.',
    )
    tag = []
    await payload.delete({ collection: 'parameter-tools', id: doc.id })
    expect(tag).toEqual(['parameter-tools'])
  })
})
