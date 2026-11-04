import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { IndeksTools } from '@/components/tools/IndeksTools'
import { kelompokkanTools } from '@/modules/konten/tools'
import type { Pilar } from '@/payload-types'

import { situs } from './seo-contoh'

const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
const uang: Pilar = { id: 1, nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau', deskripsi: 'Uang.', urutan: 1, ...waktu }
const sehat: Pilar = { id: 4, nama: 'Sehat', slug: 'sehat', warna: 'koral', deskripsi: 'Sehat.', urutan: 4, ...waktu }

const tool = (id: number, nama: string, slug: string | null, pilar: Pilar | number) => ({ id, nama, slug, ringkasan: `Hitung ${nama}.`, pilar })

describe('kelompokkanTools', () => {
  it('per pilar sesuai urutan pilar, di dalamnya urut nama; tanpa slug atau pilar dilewati', () => {
    const kelompok = kelompokkanTools([
      tool(1, 'BMI & Kalori', 'bmi-kalori', sehat),
      tool(2, 'THR', 'thr', uang),
      tool(3, 'Gaji Bersih', 'gaji-bersih', uang),
      tool(4, 'Tanpa slug', null, uang),
      tool(5, 'Pilar belum dimuat', 'ipk', 9),
    ])
    expect(kelompok.map((k) => [k.pilar.nama, k.tools.map((t) => t.nama)])).toEqual([
      ['Uang & Karier', ['Gaji Bersih', 'THR']],
      ['Sehat', ['BMI & Kalori']],
    ])
    expect(kelompok[0].tools[0]).toEqual({ id: 3, nama: 'Gaji Bersih', href: '/tools/gaji-bersih', ringkasan: 'Hitung Gaji Bersih.' })
  })
})

describe('IndeksTools', () => {
  const masukan = { jenis: 'statis', judul: 'Tools', path: '/tools' } as const

  it('H2 per pilar dengan titik warna, kartu H3 dengan ajakan menyebut hasilnya', () => {
    const html = renderToStaticMarkup(h(IndeksTools, { kelompok: kelompokkanTools([tool(3, 'Gaji Bersih', 'gaji-bersih', uang)]), masukan, situs }))
    expect(html).toMatch(/<h1 class="[^"]*">Tools<\/h1>/)
    expect(html).toMatch(/<h2 id="tools-uang-karier" class="[^"]*"><span class="[^"]*" data-warna="hijau" aria-hidden="true"><\/span>Uang &amp; Karier<\/h2>/)
    expect(html).toMatch(/<a class="[^"]*" href="\/tools\/gaji-bersih">/)
    expect(html).toMatch(/<h3 class="[^"]*">Gaji Bersih<\/h3>/)
    expect(html).toContain('Hitung Gaji Bersih')
  })

  it('pesan kosong bila belum ada kalkulator terbit', () => {
    const html = renderToStaticMarkup(h(IndeksTools, { kelompok: [], masukan, situs }))
    expect(html).toContain('Belum ada kalkulator yang terbit. Kalkulator baru tampil di sini setelah terbit.')
  })
})
