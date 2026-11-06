import { describe, expect, it } from 'vitest'

import {
  barisAdsense,
  iklanSiap,
  isiAdsTxt,
  letakIklanTengah,
  periksaAdsTxt,
  pilihSlot,
  sisipkanIklanTengah,
  validasiAdsTxt,
  validasiDaftarSlot,
  validasiIdPenerbit,
  validasiIdSlot,
  validasiUnit,
} from '@/modules/iklan/aturan'
import { POSISI_IKLAN, type PengaturanIklan } from '@/modules/iklan/tipe'

import { h, isiLexical, p } from './seo-contoh'

/** ID penerbit tiruan yang jelas palsu (bukan milik siapa pun). */
const PENERBIT = 'ca-pub-0000000000000000'

const pengaturan = (ubah: Partial<PengaturanIklan> = {}): PengaturanIklan => ({
  aktif: true,
  penyedia: 'adsense',
  idPenerbit: PENERBIT,
  modeUji: false,
  adsTxtTambahan: null,
  slot: [
    { id: 'artikel-tengah', posisi: 'artikel-tengah', ukuran: 'persegi', unit: '1111111111', setelahParagraf: 3, aktif: true },
    { id: 'artikel-akhir', posisi: 'artikel-akhir', ukuran: 'persegi-besar', unit: '2222222222', aktif: true },
    { id: 'beranda-samping', posisi: 'beranda', ukuran: 'banner', unit: '3333333333', aktif: true },
    { id: 'beranda-mati', posisi: 'beranda', ukuran: 'banner', unit: '4444444444', aktif: false },
  ],
  ...ubah,
})

describe('slot yang tampil', () => {
  it('slot aktif menjadi slot siap dengan ukuran tetap, ID penerbit, unit, dan mode uji', () => {
    expect(pilihSlot(pengaturan({ modeUji: true }), 'artikel-akhir')).toEqual({
      id: 'artikel-akhir',
      posisi: 'artikel-akhir',
      lebar: 336,
      tinggi: 280,
      klien: PENERBIT,
      unit: '2222222222',
      uji: true,
      setelahParagraf: 3,
    })
    expect(pilihSlot(pengaturan(), 'beranda', 'beranda-samping')).toMatchObject({ lebar: 320, tinggi: 100, unit: '3333333333' })
  })

  it('tanpa iklan bila global mati, ID penerbit kosong atau salah, slot nonaktif, unit salah, atau posisi tidak cocok', () => {
    expect(pilihSlot(pengaturan({ aktif: false }), 'artikel-akhir')).toBeNull()
    expect(pilihSlot(pengaturan({ idPenerbit: null }), 'artikel-akhir')).toBeNull()
    expect(pilihSlot(pengaturan({ idPenerbit: 'pub-0000000000000000' }), 'artikel-akhir')).toBeNull()
    expect(pilihSlot(pengaturan(), 'beranda', 'beranda-mati')).toBeNull()
    expect(pilihSlot(pengaturan(), 'beranda', 'tidak-ada')).toBeNull()
    expect(pilihSlot(pengaturan(), 'rubrik')).toBeNull()
    expect(pilihSlot(pengaturan({ slot: [{ id: 'a', posisi: 'tools', ukuran: 'persegi', unit: 'abc', aktif: true }] }), 'tools')).toBeNull()
    expect(pilihSlot(null, 'artikel-akhir')).toBeNull()
    expect(iklanSiap(pengaturan())).toBe(true)
  })

  it('tidak ada posisi di dalam kotak Intinya, di atas H1, atau di dalam kalkulator', () => {
    expect(POSISI_IKLAN).toEqual(['artikel-tengah', 'artikel-akhir', 'rubrik', 'tools', 'beranda'])
    expect(POSISI_IKLAN.filter((posisi) => /intinya|atas|judul|kalkulator|header/.test(posisi))).toEqual([])
  })
})

describe('iklan di tengah isi artikel', () => {
  const isi = isiLexical([
    p('Satu.'),
    h('h2', 'Bagian'),
    p('Dua.'),
    { type: 'block', version: 2, fields: { blockType: 'callout' } },
    p('Tiga.'),
    p(''),
    p('Empat.'),
    { type: 'list', version: 1, children: [{ type: 'listitem', version: 1, children: [{ type: 'text', text: 'Butir', version: 1 }] }] },
    p('Lima.'),
  ])

  it('setelah paragraf berteks ke-N di tingkat atas, asal masih ada dua paragraf sesudahnya', () => {
    expect(letakIklanTengah(isi, 3)).toBe(4)
    expect(letakIklanTengah(isi, 2)).toBe(2)
    expect(letakIklanTengah(isi, 4)).toBeNull()
    expect(letakIklanTengah(isiLexical([p('Satu.'), p('Dua.')]), 2)).toBeNull()
    expect(letakIklanTengah(null, 3)).toBeNull()
  })

  it('node slotIklan membawa slotnya; isi pendek atau tanpa slot tidak berubah', () => {
    const slot = pilihSlot(pengaturan(), 'artikel-tengah')!
    const hasil = sisipkanIklanTengah(isi, slot)!.root!.children!
    expect(hasil).toHaveLength(10)
    expect(hasil[5]).toEqual({ type: 'slotIklan', version: 1, slot })
    expect(sisipkanIklanTengah(isi, null)).toBe(isi)
    const pendek = isiLexical([p('Satu.'), p('Dua.'), p('Tiga.')])
    expect(sisipkanIklanTengah(pendek, slot)).toBe(pendek)
  })

  it('posisi paragraf dari editor dibatasi 2 sampai 10, bawaan 3', () => {
    const satu = (setelahParagraf: number | null) =>
      pilihSlot(pengaturan({ slot: [{ id: 't', posisi: 'artikel-tengah', ukuran: 'persegi', unit: '1111111111', setelahParagraf, aktif: true }] }), 'artikel-tengah')
    expect(satu(1)?.setelahParagraf).toBe(2)
    expect(satu(25)?.setelahParagraf).toBe(10)
    expect(satu(null)?.setelahParagraf).toBe(3)
  })
})

describe('validasi global iklan', () => {
  it('ID penerbit ca-pub- dengan 16 angka, wajib saat iklan dinyalakan', () => {
    expect(validasiIdPenerbit(PENERBIT, true)).toBe(true)
    expect(validasiIdPenerbit('', false)).toBe(true)
    expect(validasiIdPenerbit('', true)).toBe('Isi ID penerbit AdSense sebelum menyalakan iklan.')
    expect(validasiIdPenerbit('pub-0000000000000000', false)).toBe('ID penerbit AdSense berbentuk ca-pub- diikuti 16 angka. Salin dari Akun, Informasi akun di AdSense.')
  })

  it('ID slot, unit iklan, dan daftar slot', () => {
    expect(validasiIdSlot('artikel-akhir')).toBe(true)
    expect(validasiIdSlot('Artikel Akhir')).toBe('ID slot 2 sampai 40 karakter: huruf kecil, angka, dan tanda hubung, misalnya artikel-akhir.')
    expect(validasiUnit('1234567890')).toBe(true)
    expect(validasiUnit('12ab')).toBe('Unit iklan berupa angka data-ad-slot dari kode unit iklan di AdSense.')
    const baris = pengaturan().slot.map(({ id, ...s }) => ({ idSlot: id, ...s }))
    expect(validasiDaftarSlot(baris)).toBe(true)
    expect(validasiDaftarSlot([...baris, { idSlot: 'artikel-akhir', posisi: 'rubrik', aktif: false }])).toBe(
      'ID slot "artikel-akhir" dipakai lebih dari sekali. Beri setiap slot ID sendiri.',
    )
    expect(validasiDaftarSlot([...baris, { idSlot: 'akhir-2', posisi: 'artikel-akhir', aktif: true }])).toBe(
      'Posisi "Artikel: setelah isi, sebelum sumber dan FAQ" sudah dipakai slot "artikel-akhir". Matikan salah satunya.',
    )
  })
})

describe('ads.txt', () => {
  it('baris AdSense dari ID penerbit, lalu baris tambahan tanpa duplikat; tanpa baris sama sekali berarti tidak ada file', () => {
    expect(barisAdsense(PENERBIT)).toBe('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0')
    expect(isiAdsTxt({ penyedia: 'adsense', idPenerbit: PENERBIT, adsTxtTambahan: null })).toBe('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n')
    expect(
      isiAdsTxt({
        penyedia: 'adsense',
        idPenerbit: PENERBIT,
        adsTxtTambahan: '# jaringan lain\ngoogle.com,pub-0000000000000000,DIRECT,f08c47fec0942fa0\ncontoh-iklan.test, 12345, RESELLER\n\ncontact=redaksi@point.lat',
      }),
    ).toBe('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n# jaringan lain\ncontoh-iklan.test, 12345, RESELLER\ncontact=redaksi@point.lat\n')
    expect(isiAdsTxt({ penyedia: 'adsense', idPenerbit: null, adsTxtTambahan: '' })).toBeNull()
    expect(isiAdsTxt({ penyedia: 'adsense', idPenerbit: null, adsTxtTambahan: '# hanya komentar' })).toBeNull()
    expect(isiAdsTxt(null)).toBeNull()
  })

  it('baris tambahan diperiksa per baris dengan nomor barisnya', () => {
    expect(periksaAdsTxt('# komentar\n\ngoogle.com, pub-1, DIRECT # catatan\nOWNERDOMAIN=point.lat')).toEqual([])
    expect(periksaAdsTxt('google.com pub-1 DIRECT\ngoogle.com, pub-1, LANGSUNG\nbukan domain, 1, DIRECT\nwarna=biru\ngoogle.com, , DIRECT')).toEqual([
      'Baris 1: tulis 3 atau 4 isian dipisah koma, misalnya google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0.',
      'Baris 2: isian ketiga harus DIRECT atau RESELLER.',
      'Baris 3: isian pertama harus domain sistem iklan, misalnya google.com.',
      'Baris 4: variabel "warna" tidak dikenal ads.txt.',
      'Baris 5: isian kedua harus ID akun tanpa spasi.',
    ])
    expect(validasiAdsTxt('')).toBe(true)
    expect(validasiAdsTxt('google.com, pub-1, direct, ')).toBe('Baris 1: isian keempat (ID otoritas) kosong. Hapus koma terakhir atau isi ID-nya.')
  })
})
