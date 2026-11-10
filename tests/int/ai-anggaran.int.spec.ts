import type { Payload } from 'payload'
import { afterAll, describe, expect, it } from 'vitest'

import { cadangkanAnggaran, selesaikanAnggaran, terpakaiBulan } from '@/modules/ai/anggaran'
import { ANGGARAN_BAWAAN, HARGA_BAWAAN } from '@/modules/ai/aturan'
import { adapterPalsu } from '@/modules/ai/palsu'
import { statusAsisten } from '@/modules/ai/status'

import { getTestPayload, unik } from './helpers'

/**
 * Anggaran bulanan asisten AI. Tes memakai bulan lampau (1990 sampai 2000) supaya baris bulannya milik
 * tes ini sendiri, dan menghapus baris bulan itu dulu supaya bisa diulang di database yang sudah berisi.
 */
const BAWAAN = { aktif: true, anggaranBulanan: ANGGARAN_BAWAAN, harga: HARGA_BAWAAN, frasaKlise: [] as string[] }

async function bulanBaru(payload: Payload, bulan: string) {
  await payload.delete({ collection: 'pemakaian-ai', where: { bulan: { equals: bulan } } })
  return bulan
}

/** Pengguna pertama di database selalu admin (`tetapkanPeranAwal`), jadi admin dibuat dulu supaya editor benar editor. */
async function pengguna(payload: Payload, peran: 'admin' | 'editor') {
  const buat = (p: 'admin' | 'editor') =>
    payload.create({ collection: 'pengguna', data: { email: `${unik(p)}@tes.local`, password: 'rahasia-123', nama: p, peran: p } })
  if (peran === 'editor') await buat('admin')
  const doc = await buat(peran)
  expect(doc.peran).toBe(peran)
  return doc
}

describe('anggaran asisten AI', () => {
  afterAll(async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'asisten-ai', data: BAWAAN })
  })

  it('global Asisten AI: saklar, anggaran US$10, harga tiga model bawaan, dan frasa tambahan; editor membaca, hanya admin yang mengubah', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'asisten-ai', data: BAWAAN })
    const global = await payload.findGlobal({ slug: 'asisten-ai' })
    expect(global).toMatchObject({ aktif: true, anggaranBulanan: 10, frasaKlise: [] })
    expect(global.harga?.map(({ model, masuk, keluar }) => ({ model, masuk, keluar }))).toEqual(HARGA_BAWAAN)

    const editor = await pengguna(payload, 'editor')
    await expect(payload.findGlobal({ slug: 'asisten-ai', user: editor, overrideAccess: false })).resolves.toMatchObject({ aktif: true })
    await expect(payload.updateGlobal({ slug: 'asisten-ai', data: { anggaranBulanan: 99 }, user: editor, overrideAccess: false })).rejects.toThrow()
    const admin = await pengguna(payload, 'admin')
    await expect(payload.updateGlobal({ slug: 'asisten-ai', data: { anggaranBulanan: 12 }, user: admin, overrideAccess: false })).resolves.toMatchObject({ anggaranBulanan: 12 })
  })

  it('cadangan atomik: sepuluh permintaan bersamaan dengan anggaran cukup untuk lima hanya meloloskan lima', async () => {
    const payload = await getTestPayload()
    const bulan = await bulanBaru(payload, '1999-01')
    const hasil = await Promise.all(Array.from({ length: 10 }, () => cadangkanAnggaran(payload, { bulan, cadangan: 0.01, batas: 0.05 })))
    expect(hasil.filter((h) => h.berhasil)).toHaveLength(5)
    expect(await terpakaiBulan(payload, bulan)).toBe(0.05)
    expect(hasil.find((h) => !h.berhasil)).toEqual({ berhasil: false, terpakai: 0.05 })
  })

  it('setelah jawaban datang cadangan diganti biaya sebenarnya, dan pemakaian tidak pernah di bawah nol', async () => {
    const payload = await getTestPayload()
    const bulan = await bulanBaru(payload, '1999-02')
    expect(await cadangkanAnggaran(payload, { bulan, cadangan: 0.1, batas: 1 })).toEqual({ berhasil: true, terpakai: 0.1 })
    await selesaikanAnggaran(payload, { bulan, cadangan: 0.1, biaya: 0.004 })
    expect(await terpakaiBulan(payload, bulan)).toBe(0.004)
    await selesaikanAnggaran(payload, { bulan, cadangan: 0.5, biaya: 0 })
    expect(await terpakaiBulan(payload, bulan)).toBe(0)
    expect(await terpakaiBulan(payload, '1990-12')).toBe(0)
  })

  it('bulan baru membuang log AI yang lebih tua dari 13 bulan, sekali saja', async () => {
    const payload = await getTestPayload()
    const bulan = await bulanBaru(payload, '2000-01')
    const log = (waktu: string) =>
      payload.create({ collection: 'log-ai', data: { waktu, tugas: 'meta', status: 'berhasil', ringkasan: unik('retensi') } })
    const lama = await log('1980-01-15T00:00:00.000Z')
    const masih = await log('1999-01-01T00:00:00.000Z')
    await cadangkanAnggaran(payload, { bulan, cadangan: 0, batas: 1 })
    const ada = async (id: number) => (await payload.count({ collection: 'log-ai', where: { id: { equals: id } } })).totalDocs
    expect(await ada(lama.id)).toBe(0)
    expect(await ada(masih.id)).toBe(1)

    const lagi = await log('1980-02-15T00:00:00.000Z')
    await cadangkanAnggaran(payload, { bulan, cadangan: 0, batas: 1 })
    expect(await ada(lagi.id)).toBe(1)
    await payload.delete({ collection: 'log-ai', where: { id: { in: [masih.id, lagi.id] } } })
  })

  it('operasi massal: update dan hapus massal dua baris pemakaian dan dua baris log AI', async () => {
    const payload = await getTestPayload()
    const daftarBulan = [await bulanBaru(payload, '1990-03'), await bulanBaru(payload, '1990-04')]
    for (const bulan of daftarBulan) await payload.create({ collection: 'pemakaian-ai', data: { bulan, terpakai: 1 } })
    const diubah = await payload.update({ collection: 'pemakaian-ai', where: { bulan: { in: daftarBulan } }, data: { terpakai: 0.5 } })
    expect(diubah.errors).toEqual([])
    expect(diubah.docs.map((d) => d.terpakai)).toEqual([0.5, 0.5])
    const dihapus = await payload.delete({ collection: 'pemakaian-ai', where: { bulan: { in: daftarBulan } } })
    expect([dihapus.docs.length, dihapus.errors]).toEqual([2, []])

    const ringkasan = unik('massal')
    for (const tugas of ['meta', 'brief'] as const) await payload.create({ collection: 'log-ai', data: { waktu: new Date().toISOString(), tugas, status: 'berjalan', ringkasan } })
    const logDiubah = await payload.update({ collection: 'log-ai', where: { ringkasan: { equals: ringkasan } }, data: { status: 'gagal' } })
    expect([logDiubah.docs.map((d) => d.status), logDiubah.errors]).toEqual([['gagal', 'gagal'], []])
    const logDihapus = await payload.delete({ collection: 'log-ai', where: { ringkasan: { equals: ringkasan } } })
    expect([logDihapus.docs.length, logDihapus.errors]).toEqual([2, []])
  })

  it('log AI dan pemakaian hanya dibaca admin', async () => {
    const payload = await getTestPayload()
    const editor = await pengguna(payload, 'editor')
    const admin = await pengguna(payload, 'admin')
    await expect(payload.find({ collection: 'log-ai', user: editor, overrideAccess: false })).rejects.toThrow()
    await expect(payload.find({ collection: 'pemakaian-ai', user: editor, overrideAccess: false })).rejects.toThrow()
    await expect(payload.find({ collection: 'log-ai', user: admin, overrideAccess: false, limit: 1 })).resolves.toBeTruthy()
    await expect(payload.create({ collection: 'log-ai', user: admin, overrideAccess: false, data: { waktu: new Date().toISOString(), tugas: 'meta', status: 'berhasil' } })).rejects.toThrow()
  })

  it('status asisten: mode, model per tugas, harga, pemakaian bulan itu, dan alasan tombol AI nonaktif', async () => {
    const payload = await getTestPayload()
    const bulan = await bulanBaru(payload, '1999-03')
    const sekarang = new Date('1999-03-15T05:00:00.000Z')
    const adapter = { mode: 'palsu' as const, adapter: adapterPalsu() }
    await payload.updateGlobal({ slug: 'asisten-ai', data: { ...BAWAAN, anggaranBulanan: 0.05, harga: HARGA_BAWAAN.slice(0, 1) } })
    await cadangkanAnggaran(payload, { bulan, cadangan: 0.02, batas: 0.05 })

    const status = await statusAsisten(payload, { adapter, env: {}, sekarang })
    expect(status).toMatchObject({ aktif: true, mode: 'palsu', pesan: null, bulan, anggaran: { batas: 0.05, terpakai: 0.02, sisa: 0.03, cukup: true } })
    expect(status.tugas).toEqual({
      brief: { model: 'claude-sonnet-5-5', sumber: 'bawaan', adaHarga: false },
      draf: { model: 'claude-sonnet-5-5', sumber: 'bawaan', adaHarga: false },
      meta: { model: 'claude-haiku-5-5', sumber: 'bawaan', adaHarga: true },
      usulan: { model: 'claude-sonnet-5-5', sumber: 'bawaan', adaHarga: false },
      artikel: { model: 'claude-sonnet-5-5', sumber: 'bawaan', adaHarga: false },
    })

    await cadangkanAnggaran(payload, { bulan, cadangan: 0.03, batas: 0.05 })
    expect((await statusAsisten(payload, { adapter, env: {}, sekarang })).pesan).toBe(
      'Anggaran AI bulan ini sudah habis. Tombol AI aktif lagi awal bulan depan, atau setelah admin menaikkan anggaran.',
    )
    await payload.updateGlobal({ slug: 'asisten-ai', data: { aktif: false } })
    expect((await statusAsisten(payload, { adapter, env: {}, sekarang })).pesan).toBe('Asisten AI sedang dimatikan admin di Pengaturan, Asisten AI.')
    expect((await statusAsisten(payload, { adapter: { mode: null, pesan: 'ANTHROPIC_API_KEY belum diisi di env server.' }, env: {}, sekarang })).mode).toBeNull()
    await payload.updateGlobal({ slug: 'asisten-ai', data: { aktif: true } })
    expect((await statusAsisten(payload, { adapter: { mode: null, pesan: 'ANTHROPIC_API_KEY belum diisi di env server.' }, env: {}, sekarang })).pesan).toBe(
      'Asisten AI belum dipasang: ANTHROPIC_API_KEY belum diisi di env server.',
    )
  })
})
