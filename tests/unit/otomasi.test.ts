import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { CONTOH_PALSU } from '@/modules/ai/palsu'
import { definisiArtikel, hitungCekAngka, pilihKandidat, PENANDA_CEK_ANGKA, type MasukanArtikel } from '@/modules/ai/prompt/artikel'
import { definisiUsulan, type MasukanUsulan } from '@/modules/ai/prompt/usulan'
import { TUGAS_EDITOR } from '@/modules/ai/tipe'
import {
  alasanBelumSiap,
  aturKataSampul,
  awalHariWib,
  bolehTulis,
  masihSempat,
  perluUsulan,
  rapikanSlot,
  sisaCekAngka,
  slotBerikutnya,
  tanggalWib,
  waktuSlot,
  MULAI_TULIS_MAKS_MS,
} from '@/modules/otomasi/aturan'
import { gambarSampul } from '@/modules/otomasi/sampul'

describe('slot jadwal terbit', () => {
  // Selasa 10 November 2026, 10.00 WIB.
  const sekarang = new Date('2026-11-10T03:00:00.000Z')

  it('tanggal dan jam WIB', () => {
    expect(tanggalWib(new Date('2026-11-09T17:30:00.000Z'))).toBe('2026-11-10')
    expect(awalHariWib(sekarang).toISOString()).toBe('2026-11-09T17:00:00.000Z')
    expect(waktuSlot('2026-11-11', '06').toISOString()).toBe('2026-11-10T23:00:00.000Z')
  })

  it('slot kosong berikutnya: hari dan jam terpilih, paling cepat 30 menit lagi, melewati slot terpakai', () => {
    const slot = { hari: ['senin', 'rabu', 'jumat'] as const, jam: ['06', '18'] as const }
    const s = (x: Date[]) => x.map((d) => d.toISOString())
    expect(s(slotBerikutnya({ hari: [...slot.hari], jam: [...slot.jam] }, [], sekarang, 3))).toEqual([
      '2026-11-10T23:00:00.000Z', // Rabu 06.00 WIB
      '2026-11-11T11:00:00.000Z', // Rabu 18.00 WIB
      '2026-11-12T23:00:00.000Z', // Jumat 06.00 WIB
    ])
    expect(s(slotBerikutnya({ hari: ['rabu'], jam: ['06'] }, ['2026-11-10T23:00:00.000Z'], sekarang))).toEqual(['2026-11-17T23:00:00.000Z'])
    // Hari ini (Selasa) jam 12.00 masih bisa, karena lebih dari 30 menit lagi; 09.00 sudah lewat.
    expect(s(slotBerikutnya({ hari: ['selasa'], jam: ['09', '12'] }, [], sekarang))).toEqual(['2026-11-10T05:00:00.000Z'])
    expect(slotBerikutnya({ hari: ['selasa'], jam: ['12'] }, [], new Date('2026-11-10T04:45:00.000Z'))[0].toISOString()).toBe('2026-11-17T05:00:00.000Z')
    expect(slotBerikutnya({ hari: [], jam: ['06'] }, [], sekarang)).toEqual([])
  })

  it('isian global dirapikan: nilai asing dibuang, urutan tetap', () => {
    expect(rapikanSlot(['jumat', 'x', 'senin'], ['21', '06', '07'])).toEqual({ hari: ['senin', 'jumat'], jam: ['06', '21'] })
    expect(rapikanSlot(null, 0)).toEqual({ hari: [], jam: [] })
  })
})

describe('syarat antrean terbit', () => {
  const siap = {
    judul: 'Cara hitung',
    deck: 'Deck',
    intinya: [{ poin: 'Satu' }],
    isi: { root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Isi rapi.' }] }] } },
    faq: [{ pertanyaan: 'Apa?', jawaban: 'Itu.' }],
    gambarUtama: 12,
    pakaiDrafAi: true,
    reviewAi: { sumberDicek: true, angkaDicek: true, pengalamanDitambah: true },
  }

  it('siap bila review lengkap, tanpa [cek angka], dan bergambar utama', () => {
    expect(alasanBelumSiap(siap)).toEqual([])
  })

  it('penanda [cek angka] di mana pun (termasuk blok tabel) dan review belum lengkap menahan antrean', () => {
    const tabel = { root: { children: [{ type: 'block', fields: { baris: [{ sel: [{ teks: `5% ${PENANDA_CEK_ANGKA}` }] }] } }] } }
    const belum = { ...siap, isi: tabel, faq: [{ pertanyaan: 'Berapa?', jawaban: `Rp1 juta ${PENANDA_CEK_ANGKA}` }], reviewAi: { sumberDicek: true }, gambarUtama: null }
    expect(sisaCekAngka(belum)).toBe(2)
    expect(alasanBelumSiap(belum)).toEqual(['Checklist review belum lengkap.', 'Masih ada 2 penanda [cek angka].', 'Belum ada gambar utama.'])
  })
})

describe('kuota dan waktu jalan', () => {
  it('draf per hari, usulan saat habis, dan batas mulai menulis', () => {
    expect([bolehTulis(0, 1), bolehTulis(1, 1), bolehTulis(4, 9), bolehTulis(5, 9), bolehTulis(0, 0)]).toEqual([true, false, true, false, false])
    expect([perluUsulan(0, 1, 1), perluUsulan(0, 2, 1), perluUsulan(3, 0, 1), perluUsulan(0, 5, 3)]).toEqual([true, false, false, true])
    expect([masihSempat(0, MULAI_TULIS_MAKS_MS), masihSempat(0, MULAI_TULIS_MAKS_MS + 1)]).toEqual([true, false])
  })
})

describe('kartu sampul', () => {
  it('kata dipecah seimbang paling banyak dua baris; ukuran mengecil untuk kata panjang', () => {
    expect(aturKataSampul('dana darurat')).toEqual({ baris: ['DANA', 'DARURAT'], ukuran: 238 })
    expect(aturKataSampul('THR')).toEqual({ baris: ['THR'], ukuran: 300 })
    const panjang = aturKataSampul('pajak penghasilan karyawan')
    expect(panjang.baris).toHaveLength(2)
    expect(panjang.ukuran).toBeLessThan(200)
    expect(aturKataSampul('   ')).toEqual({ baris: ['POINT.'], ukuran: 300 })
  })

  it('PNG 1920 x 1080 dari next/og dengan Archivo statis', async () => {
    const png = await gambarSampul({ kata: 'Dana darurat', label: 'Uang & Karier', warna: 'hijau' })
    const meta = await sharp(png).metadata()
    expect(meta).toMatchObject({ format: 'png', width: 1920, height: 1080 })
  })
})

const pilar = [
  { slug: 'uang-karier', nama: 'Uang & Karier', subkategori: [{ slug: 'pajak', nama: 'Pajak' }] },
  { slug: 'belajar', nama: 'Belajar', subkategori: [] },
]

function masukanUsulan(isi: Partial<MasukanUsulan> = {}): MasukanUsulan {
  return { tanggal: '2026-11-10', jumlah: 8, pilar, artikelAda: [], usulanAda: [], populer: [], tools: [{ id: 'gaji-bersih', nama: 'Gaji Bersih' }], arahan: '', ...isi }
}

describe('usulan topik (prompt dan pemeriksa)', () => {
  it('tugas otomasi tidak bisa diminta dari sidebar editor', () => {
    expect(TUGAS_EDITOR).toEqual(['brief', 'draf', 'meta'])
  })

  it('prompt memuat tanggal, pilar, tulisan yang ada, dan arahan; bahan dibungkus tag', () => {
    const m = definisiUsulan.baca(masukanUsulan({ artikelAda: [{ judul: 'Dana darurat', keyphrase: 'dana darurat' }], arahan: 'Fokus pekerja baru.', jumlah: 99 }))
    if (typeof m === 'string') throw new Error(m)
    expect(m.jumlah).toBe(15)
    const { pesan, sistem } = definisiUsulan.prompt(m)
    expect(pesan).toContain('Tanggal hari ini: 2026-11-10. Buat 15 usulan.')
    expect(pesan).toContain('uang-karier (Uang & Karier): subkategori pajak (Pajak)')
    expect(pesan).toContain('<tulisan_yang_sudah_ada>\n- Dana darurat [dana darurat]')
    expect(pesan).toContain('<arahan_pemilik>\nFokus pekerja baru.')
    expect(sistem).not.toMatch(/[–—!]/)
  })

  it('pemeriksa membuang pilar asing, topik yang sudah ada atau kembar, dan merapikan subkategori baru serta tools', () => {
    const m = definisiUsulan.baca(masukanUsulan({ artikelAda: [{ judul: 'x', keyphrase: 'cara hitung thr' }] }))
    if (typeof m === 'string') throw new Error(m)
    const dasar = { subkategori: '', subkategoriBaru: { slug: '', nama: '', deskripsi: '' }, tipe: 'panduan', alasan: 'Dicari.', tools: [] }
    const hasil = definisiUsulan.periksa(
      {
        usulan: [
          { ...dasar, judul: 'THR 2027', kataKunci: 'Cara Hitung THR', pilar: 'uang-karier' },
          { ...dasar, judul: 'Pajak freelancer', kataKunci: 'pajak freelancer', pilar: 'uang-karier', subkategori: 'pajak', tools: ['gaji-bersih', 'asing'] },
          { ...dasar, judul: 'Pajak freelancer lagi', kataKunci: 'pajak freelancer', pilar: 'uang-karier' },
          { ...dasar, judul: 'Topik sehat', kataKunci: 'tidur cukup', pilar: 'sehat' },
          { ...dasar, judul: 'Beasiswa LPDP', kataKunci: 'syarat lpdp', pilar: 'belajar', tipe: 'aneh', subkategoriBaru: { slug: '', nama: 'Beasiswa Luar Negeri', deskripsi: '' } },
        ],
      },
      m,
    )
    if (typeof hasil === 'string') throw new Error(hasil)
    expect(hasil.usulan.map((u) => u.kataKunci)).toEqual(['pajak freelancer', 'syarat lpdp'])
    expect(hasil.usulan[0]).toMatchObject({ subkategori: 'pajak', subkategoriBaru: null, tools: ['gaji-bersih'] })
    expect(hasil.usulan[1]).toMatchObject({ subkategori: null, subkategoriBaru: { slug: 'beasiswa-luar-negeri', nama: 'Beasiswa Luar Negeri', deskripsi: 'Beasiswa Luar Negeri' }, tipe: 'panduan' })
    expect(hasil.catatan).toEqual(['3 usulan dibuang karena tidak lengkap atau sudah pernah ada.'])
    expect(definisiUsulan.periksa({ usulan: [] }, m)).toBe('tidak ada usulan yang sah atau semuanya sudah pernah ada')
  })

  it('contoh adapter palsu lolos pemeriksa', () => {
    const m = definisiUsulan.baca(masukanUsulan())
    if (typeof m === 'string') throw new Error(m)
    const hasil = definisiUsulan.periksa(CONTOH_PALSU.usulan, m)
    expect(typeof hasil === 'string' ? hasil : hasil.usulan).toHaveLength(2)
  })
})

function masukanArtikel(): MasukanArtikel {
  return {
    tanggal: '2026-11-10',
    topik: { judul: 'Contoh', kataKunci: 'contoh keyphrase adapter palsu', tipe: 'panduan', alasan: 'Uji.', pilar: { slug: 'uang-karier', nama: 'Uang & Karier' }, subkategori: null },
    linkInternal: [{ slug: 'dana-darurat', judul: 'Dana darurat' }],
    tools: [{ id: 'gaji-bersih', nama: 'Gaji Bersih' }],
    toolsUtama: ['gaji-bersih'],
    sumberResmi: [{ nama: 'DJP', url: 'https://www.pajak.go.id/' }],
    arahan: '',
  }
}

describe('draf artikel otomatis (prompt dan pemeriksa)', () => {
  it('prompt memuat aturan [cek angka], format isi, tautan internal, kalkulator, dan sumber resmi', () => {
    const m = masukanArtikel()
    const { sistem, pesan } = definisiArtikel.prompt(m)
    expect(sistem).toContain(PENANDA_CEK_ANGKA)
    expect(sistem).toContain('[[tool:ID]]')
    expect(pesan).toContain('/dana-darurat: Dana darurat')
    expect(pesan).toContain('gaji-bersih: Gaji Bersih (paling relevan)')
    expect(pesan).toContain('DJP: https://www.pajak.go.id/')
    expect(sistem).not.toMatch(/[–—]/)
  })

  it('contoh adapter palsu lolos: kandidat SEO terdekat dipilih, terkait dari tautan isi, [cek angka] dihitung', () => {
    const hasil = definisiArtikel.periksa(CONTOH_PALSU.artikel, masukanArtikel())
    if (typeof hasil === 'string') throw new Error(hasil)
    expect(hasil.slug).toBe('contoh-artikel-otomatis-adapter-palsu')
    expect(hasil.seo.judulSEO).toBe('Contoh judul SEO artikel otomatis dari adapter palsu')
    expect(hasil.seo.keyphrase).toBe('contoh keyphrase adapter palsu')
    expect(hasil.terkait).toEqual(['dana-darurat'])
    expect(hasil.tools).toEqual(['gaji-bersih'])
    expect(hasil.cekAngka).toBe(1)
    expect(hasil.sampul).toEqual({ kata: 'Contoh palsu', alt: 'Kartu sampul contoh dari adapter palsu' })
  })

  it('isi yang tidak sesuai format, terlalu pendek, atau tanpa Intinya ditolak; em dash di isi diganti', () => {
    const m = masukanArtikel()
    const dasar = CONTOH_PALSU.artikel as Record<string, unknown>
    expect(definisiArtikel.periksa({ ...dasar, isi: '# Judul H1\n\nIsi.' }, m)).toMatch(/^isi tidak sesuai format/)
    expect(definisiArtikel.periksa({ ...dasar, isi: '## Satu\n\nPendek.' }, m)).toMatch(/^isi terlalu pendek/)
    expect(definisiArtikel.periksa({ ...dasar, intinya: [] }, m)).toBe('Intinya atau FAQ kurang')
    const dash = definisiArtikel.periksa({ ...dasar, isi: `${String(dasar.isi)}\n\nKalimat — dengan tanda pisah.` }, m)
    if (typeof dash === 'string') throw new Error(dash)
    expect(dash.isi).toContain('Kalimat, dengan tanda pisah.')
    expect(dash.catatan).toContain('1 em dash atau en dash di isi diganti.')
  })

  it('kandidat panjang terdekat ke rentang', () => {
    expect(pilihKandidat(['pendek', 'x'.repeat(55), 'y'.repeat(70)], { min: 50, maks: 60 })).toBe('x'.repeat(55))
    expect(pilihKandidat([], { min: 1, maks: 2 })).toBeNull()
    expect(hitungCekAngka('a [cek angka] b [cek angka]', 'c')).toBe(2)
  })
})
