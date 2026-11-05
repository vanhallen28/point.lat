import { describe, expect, it } from 'vitest'

import { susunKalkulator, susunTool } from '@/modules/konten/tools'
import type { DataTool } from '@/modules/konten/tipe'
import type { ParameterTool, Pilar, Tool } from '@/payload-types'
import { PARAMETER_AWAL } from '@/seed/parameter-tools'

const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
const uang: Pilar = { id: 1, nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau', deskripsi: 'Uang.', urutan: 1, disclaimer: 'Bukan saran keuangan.', ...waktu }

const tool: Tool = {
  id: 7,
  nama: 'Gaji Bersih',
  slug: 'gaji-bersih',
  pilar: uang,
  toolId: 'gaji-bersih',
  ringkasan: 'Hitung gaji bersih.',
  bantuanInput: [
    { id: 'a', kunci: 'gaji', label: 'Gaji kotor sebulan', bantuan: 'Dari slip gaji.' },
    { id: 'b', kunci: 'status', label: 'Status PTKP', bantuan: '' },
  ],
  penjelasan: {
    root: {
      type: 'root',
      format: '',
      indent: 0,
      version: 1,
      direction: 'ltr',
      children: [{ type: 'heading', tag: 'h2', version: 1, children: [{ type: 'text', text: 'Rumus gaji bersih', version: 1 }] }],
    },
  },
  faq: [{ id: 'f', pertanyaan: 'Apa itu TER?', jawaban: 'Tarif efektif rata-rata.' }],
  sumberAturan: [
    { id: 's1', judul: 'PP 58/2023', url: 'https://www.pajak.go.id/', penerbit: 'DJP', diaksesPada: '2026-10-01T00:00:00.000Z' },
    { id: 's2', judul: 'BPJS', url: 'https://www.bpjsketenagakerjaan.go.id/', penerbit: ' ', diaksesPada: '2026-11-05T00:00:00.000Z' },
  ],
  seo: { judulSEO: 'Kalkulator Gaji Bersih' },
  _status: 'published',
  ...waktu,
}

const parameterDoc = (p: (typeof PARAMETER_AWAL)[number], i: number): ParameterTool => ({
  id: i + 1,
  ...p,
  tabel: p.tabel?.map((b, j) => ({ id: `${i}-${j}`, label: b.label ?? null, batas: b.batas ?? null, nilai: b.nilai ?? null })) ?? null,
  ...waktu,
})

describe('susunTool', () => {
  it('data halaman: path, pilar, bantuan per kunci, subjudul bertanda, sumber, tanggal diperiksa, SEO', () => {
    const data = susunTool(tool, [])
    expect(data).toMatchObject({ id: 7, nama: 'Gaji Bersih', toolId: 'gaji-bersih', href: '/tools/gaji-bersih', ringkasan: 'Hitung gaji bersih.' })
    expect(data.pilar).toEqual({ nama: 'Uang & Karier', slug: 'uang-karier', href: '/uang-karier', warna: 'hijau', disclaimer: 'Bukan saran keuangan.' })
    expect(data.bantuan).toEqual({ gaji: { label: 'Gaji kotor sebulan', bantuan: 'Dari slip gaji.' }, status: { label: 'Status PTKP', bantuan: null } })
    expect(JSON.stringify(data.penjelasan)).toContain('"idJangkar":"rumus-gaji-bersih"')
    expect(data.sumber[1]).toEqual({ judul: 'BPJS', url: 'https://www.bpjsketenagakerjaan.go.id/', penerbit: null, diaksesPada: '2026-11-05T00:00:00.000Z' })
    expect(data.diperiksa).toBe('2026-11-05T00:00:00.000Z')
    expect(data.seo).toMatchObject({ nama: 'Gaji Bersih', toolId: 'gaji-bersih', slug: 'gaji-bersih', seo: { judulSEO: 'Kalkulator Gaji Bersih' } })
  })

  it('parameter tanpa id dan cap waktu, baris tabel tanpa id', () => {
    const data = susunTool(tool, PARAMETER_AWAL.map(parameterDoc))
    expect(data.parameter).toHaveLength(PARAMETER_AWAL.length)
    expect(data.parameter.find((p) => p.kunci === 'tarif-pasal-17')).toEqual({
      toolId: 'gaji-bersih',
      kunci: 'tarif-pasal-17',
      nilai: null,
      tabel: [
        { label: null, batas: 60_000_000, nilai: 5 },
        { label: null, batas: 250_000_000, nilai: 15 },
        { label: null, batas: 500_000_000, nilai: 25 },
        { label: null, batas: 5_000_000_000, nilai: 30 },
        { label: null, batas: null, nilai: 35 },
      ],
      berlakuMulai: '2022-01-01',
      berlakuSampai: null,
      sumber: {
        judul: 'Memotret Keberpihakan UU HPP pada Rakyat Kecil (DJP)',
        url: 'https://www.pajak.go.id/id/artikel/memotret-keberpihakan-uu-hpp-pada-rakyat-kecil',
      },
    })
  })
})

describe('susunKalkulator', () => {
  const data: DataTool = susunTool(tool, PARAMETER_AWAL.map(parameterDoc))

  it('label dan bantuan dari CMS dipakai di isian dan di pesan galat; bantuan kosong berarti tanpa bantuan', () => {
    const { kalkulator, contoh } = susunKalkulator(data, '2026-11-05')
    expect(kalkulator.isian.slice(0, 2).map((i) => [i.label, i.bantuan])).toEqual([
      ['Gaji kotor sebulan', 'Dari slip gaji.'],
      ['Status PTKP', null],
    ])
    expect(contoh?.ok && contoh.utama.nilai).toBe(7_554_552)
  })

  it('hitung memakai label CMS untuk pesan galat', async () => {
    const { hitung } = await import('@/modules/hitung')
    expect(hitung('gaji-bersih', { gaji: '', status: 'TK/0' }, '2026-11-05', data.parameter, data.bantuan)).toMatchObject({
      galat: { gaji: 'Gaji kotor sebulan belum diisi. Tulis angkanya, misalnya 8.000.000.' },
    })
  })

  it('tanpa parameter: pesan, tanpa hasil contoh', () => {
    const { kalkulator, contoh } = susunKalkulator({ ...data, parameter: [] }, '2026-11-05')
    expect(kalkulator.pesan).toMatch(/^Kalkulator ini sedang diperbarui/)
    expect(contoh).toBeNull()
  })
})
