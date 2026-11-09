import { describe, expect, it } from 'vitest'

import { adaPerubahanTertunda, rencanaBeranda } from '@/modules/paket/beranda'
import { alasanLewatiTools } from '@/modules/paket/impor'
import { LABEL_KOLOM_KOSONG, perbaikiKolomKosong } from '@/modules/paket/perbaiki'

describe('impor paket: tools', () => {
  const isi = (teks: string) => ({ root: { children: [{ type: 'paragraph', children: [{ type: 'text', text: teks }] }] } })
  const dibuat = '2026-11-07T10:00:00.000Z'
  const doc = { _status: 'draft' as const, penjelasan: isi('Lama.'), createdAt: dibuat, updatedAt: dibuat }
  const baru = isi('Baru.')

  it('draf dari seed yang belum disentuh boleh diperbarui', () => {
    expect(alasanLewatiTools(doc, baru, false)).toBeNull()
    // Simpan otomatis beberapa detik setelah dibuat masih dianggap belum disunting.
    expect(alasanLewatiTools({ ...doc, updatedAt: '2026-11-07T10:00:30.000Z' }, baru, false)).toBeNull()
  })

  it('tidak menimpa tools yang belum ada, pernah terbit, sudah sama, atau sudah disunting', () => {
    expect(alasanLewatiTools(undefined, baru, false)).toMatch(/Belum ada/)
    expect(alasanLewatiTools({ ...doc, _status: 'published' }, baru, false)).toMatch(/pernah terbit/)
    expect(alasanLewatiTools(doc, baru, true)).toMatch(/pernah terbit/)
    expect(alasanLewatiTools(doc, isi('Lama.'), false)).toMatch(/sudah terbaru/)
    expect(alasanLewatiTools({ ...doc, updatedAt: '2026-11-08T09:00:00.000Z' }, baru, false)).toMatch(/sunting/)
  })

  it('isi yang sudah diperbarui impor sebelumnya dianggap sama walau Payload menambah properti saat menyimpan', () => {
    const tersimpan = { root: { children: [{ type: 'paragraph', textFormat: 0, children: [{ type: 'text', text: 'Baru.', format: 0 }] }] } }
    expect(alasanLewatiTools({ ...doc, penjelasan: tersimpan, updatedAt: '2026-11-08T09:00:00.000Z' }, baru, false)).toMatch(/sudah terbaru/)
  })
})

describe('beranda portal', () => {
  const hero = { blockType: 'heroBeranda' }
  const populer = { blockType: 'palingDibaca' }
  const surat = { blockType: 'newsletterBlok' }

  it('mozaik tepat setelah hero, strip kalkulator setelah Paling dicari, baris rubrik setelahnya', () => {
    const r = rencanaBeranda([hero, populer, surat], false, [3, 4])
    expect(r).toEqual({
      jenis: 'tambah',
      ditambah: ['mozaikPilihan', 'stripTools', 'barisRubrik'],
      tataLetak: [
        hero,
        { blockType: 'mozaikPilihan', judul: 'Pilihan redaksi', artikel: [3, 4], tampilkanTools: false },
        populer,
        { blockType: 'stripTools', judul: 'Hitung sendiri' },
        { blockType: 'barisRubrik', jumlah: 4 },
        surat,
      ],
    })
    const tanpaHero = rencanaBeranda([populer], false, [3])
    expect(tanpaHero.jenis === 'tambah' && tanpaHero.tataLetak.map((b) => b.blockType)).toEqual(['mozaikPilihan', 'palingDibaca', 'stripTools', 'barisRubrik'])
  })

  it('tanpa artikel pilihan hanya strip dan baris rubrik; blok yang sudah ada tidak digandakan atau dipindah', () => {
    const r = rencanaBeranda([hero, populer], false, [])
    expect(r.jenis === 'tambah' && r.ditambah).toEqual(['stripTools', 'barisRubrik'])
    const sebagian = rencanaBeranda([hero, { blockType: 'barisRubrik' }, populer], false, [])
    expect(sebagian.jenis === 'tambah' && sebagian.tataLetak.map((b) => b.blockType)).toEqual(['heroBeranda', 'barisRubrik', 'palingDibaca', 'stripTools'])
  })

  it('tidak mengubah beranda yang sudah lengkap atau punya perubahan belum terbit', () => {
    const lengkap = [hero, { blockType: 'mozaikPilihan' }, populer, { blockType: 'stripTools' }, { blockType: 'barisRubrik' }]
    expect(rencanaBeranda(lengkap, false, [3])).toEqual({ jenis: 'sudah-ada' })
    expect(rencanaBeranda([hero], true, [3])).toEqual({ jenis: 'dilewati' })
  })

  it('perubahan tertunda dibaca dari perbedaan tata letak versi terakhir dan versi yang tampil', () => {
    const tata = [{ id: 'a', blockType: 'heroBeranda', judul: 'Intinya dulu.' }]
    expect(adaPerubahanTertunda(tata, structuredClone(tata))).toBe(false)
    expect(adaPerubahanTertunda(tata, [{ ...tata[0], judul: 'Baru' }])).toBe(true)
    expect(adaPerubahanTertunda(null, [])).toBe(false)
  })
})

describe('perbaikan draf paket v1.3.0', () => {
  const tabel = (labels: string[]) => ({ type: 'block', fields: { blockType: 'tabelPerbandingan', kolom: labels.map((label) => ({ label })) } })
  const isi = (...anak: unknown[]) => ({ root: { type: 'root', children: anak } })

  it('kolom tabel tanpa judul diisi, kolom lain dan isi asli tidak berubah', () => {
    const asli = isi({ type: 'paragraph', children: [] }, tabel(['', 'Bulan biasa', 'Bulan THR']))
    const baru = perbaikiKolomKosong(asli)
    expect(baru).toEqual(isi({ type: 'paragraph', children: [] }, tabel([LABEL_KOLOM_KOSONG, 'Bulan biasa', 'Bulan THR'])))
    expect(asli.root.children[1]).toEqual(tabel(['', 'Bulan biasa', 'Bulan THR']))
  })

  it('isi tanpa kolom kosong atau tanpa tabel tidak diubah', () => {
    expect(perbaikiKolomKosong(isi(tabel(['A', 'B'])))).toBeNull()
    expect(perbaikiKolomKosong(isi({ type: 'paragraph', children: [] }))).toBeNull()
    expect(perbaikiKolomKosong(null)).toBeNull()
  })
})
