import { describe, expect, it } from 'vitest'

import { CONTOH_PALSU } from '@/modules/ai/palsu'
import { definisiDraf, htmlDraf, teksDraf, type MasukanDraf } from '@/modules/ai/prompt/draf'

import { masalahSkema, tandaTerlarang } from './ai-bantu'

const MASUKAN: MasukanDraf = {
  judul: 'Cara hitung THR',
  keyphrase: 'hitung thr',
  h2: 'Rumus THR karyawan tetap',
  poin: ['Masa kerja 12 bulan', 'Upah sebulan'],
  outline: ['Apa itu THR', 'Rumus THR karyawan tetap'],
  catatan: 'THR = 1 bulan upah untuk masa kerja 12 bulan, Permenaker 6/2016.',
}

describe('draf per bagian: masukan dan prompt', () => {
  it('subjudul wajib; poin, outline, dan catatan dirapikan dan dibatasi', () => {
    expect(definisiDraf.baca({ ...MASUKAN, poin: [' a ', '', 1] })).toEqual({ ...MASUKAN, poin: ['a'] })
    expect(definisiDraf.baca({ h2: ' ', catatan: 'x' })).toBe('Isi subjudul (H2) bagian yang mau ditulis dulu.')
    expect(definisiDraf.baca([])).toBe('Masukan draf tidak terbaca.')
    const panjang = definisiDraf.baca({ h2: 'A', catatan: 'kata '.repeat(2_000), outline: Array.from({ length: 20 }, (_, i) => `H2 ${i}`) })
    expect(typeof panjang === 'object' && [panjang.catatan.length <= 4_000, panjang.outline.length]).toEqual([true, 12])
  })

  it('prompt: hanya bagian yang diminta, angka hanya dari catatan penulis, tanpa pengalaman karangan dan tanpa URL', () => {
    const { sistem, pesan, ringkasan } = definisiDraf.prompt(MASUKAN)
    expect(sistem).toContain('Tulis hanya bagian yang diminta.')
    expect(sistem).toContain('Angka, tarif, tanggal, dan aturan hanya boleh diambil dari catatan penulis; selain itu tulis [cek angka]')
    expect(sistem).toContain('Jangan mengarang pengalaman pribadi')
    expect(tandaTerlarang(sistem)).toEqual([])
    expect(pesan).toContain('Bagian yang ditulis (H2): Rumus THR karyawan tetap')
    expect(pesan).toContain('<poin_brief>\n- Masa kerja 12 bulan\n- Upah sebulan\n</poin_brief>')
    expect(pesan).toContain('<catatan_penulis>\nTHR = 1 bulan upah untuk masa kerja 12 bulan, Permenaker 6/2016.\n</catatan_penulis>')
    expect(ringkasan).toBe('Rumus THR karyawan tetap')
  })

  it('skema keluaran sesuai batasan structured outputs', () => {
    expect(masalahSkema(definisiDraf.skema)).toEqual([])
  })
})

describe('draf per bagian: pemeriksa jawaban dan papan klip', () => {
  it('subjudul tetap yang diminta editor; em dash dibersihkan; URL dibuang; penanda [cek angka] dihitung', () => {
    expect(
      definisiDraf.periksa(
        {
          blok: [
            { jenis: 'paragraf', teks: 'THR dihitung dari upah \u2014 bukan gaji kotor. Besarnya [cek angka] bulan, lihat https://contoh.go.id.' },
            { jenis: 'h3', teks: 'Pegawai baru' },
            { jenis: 'butir', teks: 'Masa kerja kurang dari 12 bulan: [cek angka].' },
            { jenis: 'video', teks: 'Tidak dikenal' },
            { jenis: 'paragraf', teks: '' },
          ],
          perluDicek: ['Besar THR pegawai baru'],
        },
        MASUKAN,
      ),
    ).toEqual({
      h2: 'Rumus THR karyawan tetap',
      blok: [
        { jenis: 'paragraf', teks: 'THR dihitung dari upah, bukan gaji kotor. Besarnya [cek angka] bulan, lihat' },
        { jenis: 'h3', teks: 'Pegawai baru' },
        { jenis: 'butir', teks: 'Masa kerja kurang dari 12 bulan: [cek angka].' },
      ],
      perluDicek: ['Besar THR pegawai baru'],
      catatan: ['1 em dash atau en dash diganti koma atau tanda hubung.', '2 penanda [cek angka] perlu kamu isi dari sumber resmi.'],
    })
  })

  it('jawaban adapter palsu lolos; draf tanpa paragraf ditolak', () => {
    expect(definisiDraf.periksa(CONTOH_PALSU.draf, MASUKAN)).toMatchObject({ h2: MASUKAN.h2, catatan: ['1 em dash atau en dash diganti koma atau tanda hubung.'] })
    expect(definisiDraf.periksa({ blok: [{ jenis: 'h3', teks: 'Saja' }], perluDicek: [] }, MASUKAN)).toBe('draf tanpa paragraf')
    expect(definisiDraf.periksa({ perluDicek: [] }, MASUKAN)).toBe('blok kosong atau salah bentuk')
  })

  it('HTML papan klip: H2, H3, paragraf, dan butir berurutan dalam satu daftar, dengan karakter HTML di-escape; teks polos untuk tempel biasa', () => {
    const draf = {
      h2: 'Rumus <THR>',
      blok: [
        { jenis: 'paragraf' as const, teks: 'Upah & tunjangan tetap.' },
        { jenis: 'butir' as const, teks: 'Satu' },
        { jenis: 'butir' as const, teks: 'Dua' },
        { jenis: 'h3' as const, teks: 'Contoh' },
        { jenis: 'butir' as const, teks: 'Tiga' },
      ],
    }
    expect(htmlDraf(draf)).toBe('<h2>Rumus &lt;THR&gt;</h2><p>Upah &amp; tunjangan tetap.</p><ul><li>Satu</li><li>Dua</li></ul><h3>Contoh</h3><ul><li>Tiga</li></ul>')
    expect(teksDraf(draf)).toBe('Rumus <THR>\n\nUpah & tunjangan tetap.\n\n- Satu\n\n- Dua\n\nContoh\n\n- Tiga')
  })
})
