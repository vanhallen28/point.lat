import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'
import { ambilIklan, iklanSiap, isiAdsTxt, pilihSlot } from '@/modules/iklan'

import { getTestPayload, pesanGalat, unik } from './helpers'

/** ID penerbit tiruan yang jelas palsu. */
const PENERBIT = 'ca-pub-0000000000000000'
const BAWAAN = { aktif: false, idPenerbit: '', modeUji: false, slot: [], adsTxtTambahan: '' }

/**
 * Halaman Kebijakan Privasi (slug tetap, ditautkan banner) diatur ke status tertentu: dibuat bila belum ada (seed
 * membuatnya sebagai draf). Mengembalikan fungsi untuk memulihkan keadaan semula.
 */
async function aturKebijakan(payload: Payload, status: 'draft' | 'published') {
  const { docs } = await payload.find({ collection: 'halaman', where: { slug: { equals: 'kebijakan-privasi' } }, draft: true, depth: 0, limit: 1 })
  const lama = docs[0]
  if (!lama) {
    const baru = await payload.create({ collection: 'halaman', draft: status === 'draft', data: { judul: 'Kebijakan Privasi', slug: 'kebijakan-privasi', _status: status } })
    return () => payload.delete({ collection: 'halaman', id: baru.id })
  }
  const utama = await payload.findByID({ collection: 'halaman', id: lama.id, depth: 0 })
  await payload.update({ collection: 'halaman', id: lama.id, data: { _status: status } })
  return () => payload.update({ collection: 'halaman', id: lama.id, data: { _status: utama._status ?? 'draft' } })
}

async function pengguna(payload: Payload, peran: 'admin' | 'editor') {
  const buat = (p: 'admin' | 'editor') =>
    payload.create({ collection: 'pengguna', data: { email: `${unik(p)}@tes.local`, password: 'rahasia-123', nama: p, peran: p } })
  if (peran === 'editor') await buat('admin')
  const doc = await buat(peran)
  expect(doc.peran).toBe(peran)
  return doc
}

describe('global iklan', () => {
  let pulihkan: () => Promise<unknown>

  // Saklar Tampilkan iklan hanya bisa dinyalakan setelah Kebijakan Privasi terbit (keputusan pemilik).
  beforeAll(async () => {
    pulihkan = await aturKebijakan(await getTestPayload(), 'published')
  })

  afterAll(async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'iklan', data: BAWAAN })
    await pulihkan()
  })

  it('bawaan aman: iklan mati dan penyedia AdSense; dibaca siapa saja, diubah admin saja', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'iklan', data: BAWAAN })
    await expect(payload.findGlobal({ slug: 'iklan', overrideAccess: false })).resolves.toMatchObject({ aktif: false, penyedia: 'adsense', slot: [] })
    const editor = await pengguna(payload, 'editor')
    await expect(payload.updateGlobal({ slug: 'iklan', data: { modeUji: true }, user: editor, overrideAccess: false })).rejects.toThrow('Anda tidak diizinkan melakukan tindakan ini.')
    const admin = await pengguna(payload, 'admin')
    await expect(payload.updateGlobal({ slug: 'iklan', data: { modeUji: true }, user: admin, overrideAccess: false })).resolves.toMatchObject({ modeUji: true })
  })

  it('validasi: ID penerbit wajib saat iklan menyala, ID slot, unit, satu slot aktif per posisi, dan baris ads.txt', async () => {
    const payload = await getTestPayload()
    expect(await pesanGalat(payload.updateGlobal({ slug: 'iklan', data: { aktif: true, idPenerbit: '' } }))).toBe(
      'idPenerbit: Isi ID penerbit AdSense sebelum menyalakan iklan.',
    )
    const slot = (idSlot: string, posisi: 'artikel-akhir' | 'rubrik') => ({ idSlot, posisi, ukuran: 'persegi' as const, unit: '1111111111', aktif: true })
    expect(await pesanGalat(payload.updateGlobal({ slug: 'iklan', data: { slot: [slot('akhir', 'artikel-akhir'), slot('akhir-2', 'artikel-akhir')] } }))).toBe(
      'slot: Posisi "Artikel: setelah isi, sebelum sumber dan FAQ" sudah dipakai slot "akhir". Matikan salah satunya.',
    )
    expect(await pesanGalat(payload.updateGlobal({ slug: 'iklan', data: { slot: [{ ...slot('Slot Satu', 'rubrik'), unit: 'abc' }] } }))).toBe(
      'slot.0.idSlot: ID slot 2 sampai 40 karakter: huruf kecil, angka, dan tanda hubung, misalnya artikel-akhir. | slot.0.unit: Unit iklan berupa angka data-ad-slot dari kode unit iklan di AdSense.',
    )
    expect(await pesanGalat(payload.updateGlobal({ slug: 'iklan', data: { adsTxtTambahan: 'google.com, pub-1, LANGSUNG' } }))).toBe(
      'adsTxtTambahan: Baris 1: isian ketiga harus DIRECT atau RESELLER.',
    )
  })

  it('menyimpan global membuang tag iklan; slot dan ads.txt dibaca dari isian tersimpan', async () => {
    const payload = await getTestPayload()
    const tag: string[] = []
    const lama = pakaiPemicuRevalidasi((t) => tag.push(t))
    try {
      await payload.updateGlobal({
        slug: 'iklan',
        data: {
          aktif: true,
          idPenerbit: PENERBIT,
          slot: [
            { idSlot: 'tengah', posisi: 'artikel-tengah', setelahParagraf: 4, ukuran: 'persegi', unit: '1111111111', aktif: true },
            { idSlot: 'beranda-1', posisi: 'beranda', ukuran: 'banner', unit: '2222222222', aktif: true },
          ],
          adsTxtTambahan: 'contoh-iklan.test, 12345, RESELLER',
        },
      })
    } finally {
      pakaiPemicuRevalidasi(lama)
    }
    expect(tag).toEqual(['iklan'])
    const pengaturan = await ambilIklan(payload)
    expect(pilihSlot(pengaturan, 'artikel-tengah')).toMatchObject({ id: 'tengah', setelahParagraf: 4, lebar: 300, tinggi: 250, klien: PENERBIT })
    expect(pilihSlot(pengaturan, 'beranda', 'beranda-1')).toMatchObject({ lebar: 320, tinggi: 100 })
    expect(pilihSlot(pengaturan, 'artikel-akhir')).toBeNull()
    expect(isiAdsTxt(pengaturan)).toBe('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\ncontoh-iklan.test, 12345, RESELLER\n')
  })

  it('Tampilkan iklan ditolak selama Kebijakan Privasi belum terbit; ditarik dari terbit, iklan dan banner berhenti', async () => {
    const payload = await getTestPayload()
    const nyala = { aktif: true, idPenerbit: PENERBIT, slot: [{ idSlot: 'akhir', posisi: 'artikel-akhir' as const, ukuran: 'persegi' as const, unit: '1111111111', aktif: true }] }
    await payload.updateGlobal({ slug: 'iklan', data: BAWAAN })
    const kembali = await aturKebijakan(payload, 'draft')
    try {
      expect(await pesanGalat(payload.updateGlobal({ slug: 'iklan', data: nyala }))).toBe(
        'aktif: Terbitkan halaman Kebijakan Privasi dulu. Banner cookie menautkan halaman itu, jadi iklan baru bisa dinyalakan setelah halaman itu terbit.',
      )
      expect((await payload.findGlobal({ slug: 'iklan' })).aktif).toBe(false)
    } finally {
      await kembali()
    }

    // Kembali terbit (keadaan beforeAll): saklar bisa dinyalakan.
    await payload.updateGlobal({ slug: 'iklan', data: nyala })
    expect([iklanSiap(await ambilIklan(payload)), pilihSlot(await ambilIklan(payload), 'artikel-akhir')?.id]).toEqual([true, 'akhir'])

    const tarik = await aturKebijakan(payload, 'draft')
    try {
      const pengaturan = await ambilIklan(payload)
      expect([pengaturan.aktif, pengaturan.kebijakanTerbit, iklanSiap(pengaturan), pilihSlot(pengaturan, 'artikel-akhir')]).toEqual([true, false, false, null])
    } finally {
      await tarik()
    }
  })
})
