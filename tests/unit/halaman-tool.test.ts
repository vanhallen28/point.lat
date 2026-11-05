import { createElement as h } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { HalamanTool } from '@/components/tools/HalamanTool'
import type { ToolId } from '@/lib/konstanta'
import { susunKalkulator, susunTool } from '@/modules/konten/tools'
import type { Pilar, Tool } from '@/payload-types'
import { PARAMETER_AWAL } from '@/seed/parameter-tools'
import { TOOLS_AWAL } from '@/seed/tools'

import { situs } from './seo-contoh'

const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
const PILAR: Record<string, Pilar> = {
  'uang-karier': { id: 1, nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau', deskripsi: 'Uang.', urutan: 1, disclaimer: 'Bukan saran keuangan.', ...waktu },
  belajar: { id: 3, nama: 'Belajar', slug: 'belajar', warna: 'kuning', deskripsi: 'Belajar.', urutan: 3, ...waktu },
}

/** Dokumen tools terbit dari data seed, dirender seperti halaman `/tools/{slug}` pada 5 November 2026. */
function render(toolId: ToolId, parameter = PARAMETER_AWAL) {
  const awal = TOOLS_AWAL.find((t) => t.toolId === toolId)!
  const doc = { id: 9, ...awal, slug: toolId, pilar: PILAR[awal.pilar], _status: 'published', ...waktu } as unknown as Tool
  const tool = susunTool(
    doc,
    parameter.map((p, i) => ({ ...p, id: i, ...waktu, tabel: p.tabel?.map((b, j) => ({ ...b, id: `${i}-${j}` })) })),
  )
  const { kalkulator, contoh } = susunKalkulator(tool, '2026-11-05')
  return renderToStaticMarkup(h(HalamanTool, { tool, kalkulator, contoh, situs }))
}

describe('HalamanTool', () => {
  const html = render('gaji-bersih')

  it('kepala: remah roti, chip pilar, H1 kalkulator, ringkasan, tanggal aturan diperiksa, JSON-LD WebApplication', () => {
    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toMatch(/<h1 class="[^"]*">Kalkulator Gaji Bersih<\/h1>/)
    expect(html).toContain('<span aria-current="page"')
    expect(html).toMatch(/data-warna="hijau">Uang &amp; Karier<\/span><span>Kalkulator<\/span>/)
    expect(html).toContain('Aturan diperiksa <time dateTime="2026-11-05T00:00:00.000Z">5 November 2026</time>')
    expect(html).toContain('"@type":"WebApplication"')
    expect(html).toContain('"applicationCategory":"FinanceApplication"')
  })

  it('form: label terlihat, satuan dibacakan, kisi status PTKP, isian tambahan di details, tombol menyebut hasil', () => {
    expect(html).toMatch(
      /<label for="kalkulator-gaji" class="[^"]*">Gaji pokok dan tunjangan tetap per bulan<span class="sr"> dalam rupiah<\/span><\/label>/,
    )
    expect(html).toMatch(/<input id="kalkulator-gaji" type="text" inputMode="numeric" autoComplete="off" required="" aria-describedby="kalkulator-gaji-bantuan kalkulator-gaji-galat" name="gaji" value="8.000.000"\/>/)
    expect(html).toMatch(/<p id="kalkulator-gaji-galat" class="[^"]*" aria-live="polite"><\/p>/)
    expect(html).toMatch(/<input id="kalkulator-status" type="radio" name="status" checked="" value="TK\/0"\/><span aria-hidden="true">TK\/0<\/span><span class="sr">TK\/0: tidak kawin, tanpa tanggungan<\/span>/)
    expect(html.match(/name="status"/g)).toHaveLength(8)
    expect(html).toMatch(/<summary>Atur tunjangan, BPJS, dan iuran lain<svg/)
    expect(html).toMatch(/<input id="kalkulator-bpjsKesehatan" type="checkbox" name="bpjsKesehatan" checked="" value="ya"\/>/)
    expect(html).toMatch(/<button type="submit" class="[^"]*">Hitung gaji bersih<\/button>/)
    expect(html).toContain('<noscript>')
  })

  it('hasil contoh dari server: angka besar dengan panjang teks, ringkasan, dan rincian langkah', () => {
    expect(html).toMatch(/<h2 id="kalkulator-hasil" class="[^"]*"><span class="[^"]*" aria-hidden="true"><\/span>Contoh hasil<\/h2>/)
    expect(html).toContain('Untuk angka contoh di form. Ganti angkanya, lalu tekan Hitung gaji bersih.')
    expect(html).toMatch(/<p class="[^"]*" style="--panjang:12">Rp\u00a07.554.552<\/p>/)
    expect(html).toContain('<dt>PPh 21 per bulan (TER 1,5%)</dt><dd>Rp\u00a0125.448</dd>')
    expect(html).toMatch(/<summary>Lihat rincian hitungan<svg/)
    expect(html).toContain('<h3>PPh 21 Desember: dihitung ulang setahun</h3>')
  })

  it('artikel: penjelasan rumus, angka aturan dengan tabel TER, catatan pilar, sumber, FAQ', () => {
    expect(html).toContain('<h2 id="rumus-gaji-bersih">Rumus gaji bersih</h2>')
    expect(html).toMatch(/<h2 id="angka-aturan" class="[^"]*">Angka aturan yang dipakai<\/h2>/)
    expect(html).toContain('<dt>Batas upah iuran JP</dt>')
    expect(html).toContain('Berlaku 1 Maret 2026 sampai 28 Februari 2027.')
    expect(html).toMatch(/<caption class="sr">Tarif efektif bulanan kategori A<\/caption><thead><tr><th scope="col">Bruto sebulan sampai<\/th><th scope="col">Tarif<\/th><\/tr><\/thead><tbody>(<tr>.*?<\/tr>){44}<\/tbody>/)
    expect(html).toContain('Bukan saran keuangan.')
    expect(html).toMatch(/<h2 id="sumber" class="[^"]*">Sumber<\/h2>/)
    expect(html).toMatch(/<h2 id="faq" class="[^"]*">Pertanyaan yang sering muncul<\/h2>/)
  })

  it('IPK: baris mata kuliah dengan nama isian per kolom dan tombol tambah; pilar Belajar', () => {
    const ipk = render('ipk')
    expect(ipk).toMatch(/<span id="kalkulator-matkul-0-judul" class="[^"]*">Mata kuliah 1<\/span>/)
    expect(ipk).toMatch(/<input id="kalkulator-sks-0" type="text" inputMode="numeric" autoComplete="off" required="" aria-labelledby="kalkulator-matkul-0-judul kalkulator-sks-0-label" aria-describedby="kalkulator-matkul-0-galat" name="sks" value="3"\/>/)
    expect(ipk.match(/name="nilai"/g)).toHaveLength(5)
    expect(ipk).toMatch(/aria-label="Hapus mata kuliah 5"/)
    expect(ipk).toMatch(/<button type="button" class="[^"]*"><svg[^>]*>.*?<\/svg>Tambah mata kuliah<\/button>/)
    expect(ipk).toMatch(/<p class="[^"]*" style="--panjang:4">3,56<\/p>/)
    expect(ipk).toContain('data-warna="kuning"')
  })

  it('tanpa parameter: pesan pengganti kalkulator, artikel tetap tampil', () => {
    const kosong = render('gaji-bersih', [])
    expect(kosong).not.toContain('<form')
    expect(kosong).toMatch(/<p role="note" class="[^"]*"><svg[^>]*>.*?<\/svg>Kalkulator ini sedang diperbarui: angka/)
    expect(kosong).toContain('<h2 id="rumus-gaji-bersih">Rumus gaji bersih</h2>')
  })
})
