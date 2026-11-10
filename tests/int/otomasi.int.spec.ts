import type { PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { adapterPalsu, pakaiAdapterAi } from '@/modules/ai'
import { CONTOH_PALSU } from '@/modules/ai/palsu'
import { antrekanTerbit, keluarkanDariAntrean, mintaUsulan, tulisDraf } from '@/modules/otomasi/data'
import { endpointOtomasi } from '@/modules/otomasi/endpoint'
import { ambilKunci, jalankanOtomasi, lepasKunci } from '@/modules/otomasi/jalan'

import { getTestPayload, unik } from './helpers'

const palsu = adapterPalsu()
/** Bulan lampau supaya baris anggaran AI milik tes ini sendiri. */
const sekarang = new Date('2025-03-04T03:00:00.000Z') // Selasa 4 Maret 2025, 10.00 WIB

let pilarId = 0
let pilarSlug = ''

async function aturOtomasi(data: Record<string, unknown>) {
  const payload = await getTestPayload()
  await payload.updateGlobal({ slug: 'otomasi-artikel', data: data as never, overrideAccess: true })
}

async function hapusUsulanPilar() {
  const payload = await getTestPayload()
  await payload.delete({ collection: 'usulan-topik', where: { pilar: { equals: pilarId } }, overrideAccess: true })
}

/** Usulan disetujui di pilar uji, dengan kata kunci unik. */
async function usulanDisetujui(isi: Record<string, unknown> = {}) {
  const payload = await getTestPayload()
  return payload.create({
    collection: 'usulan-topik',
    overrideAccess: true,
    data: { judul: unik('Topik uji'), kataKunci: unik('topik uji otomasi'), pilar: pilarId, tipe: 'panduan', alasan: 'Uji.', status: 'disetujui', ...isi } as never,
  })
}

/** Contoh artikel palsu dengan slug unik. */
function artikelUnik() {
  const slug = unik('artikel-otomasi')
  palsu.contoh.artikel = { ...(CONTOH_PALSU.artikel as Record<string, unknown>), slug }
  return slug
}

beforeAll(async () => {
  const payload = await getTestPayload()
  pakaiAdapterAi(palsu)
  pilarSlug = unik('pilar-otomasi')
  pilarId = (await payload.create({ collection: 'pilar', data: { nama: 'Pilar Otomasi', slug: pilarSlug, warna: 'kuning', deskripsi: 'Pilar uji otomasi.' } })).id
  const { totalDocs } = await payload.count({ collection: 'penulis', where: { slug: { equals: 'redaksi' } } })
  if (totalDocs === 0) await payload.create({ collection: 'penulis', data: { nama: 'Redaksi point.', slug: 'redaksi', bio: 'Tim redaksi.' } })
  await aturOtomasi({ aktif: true, drafPerHari: 2, jumlahUsulan: 5, pilar: [pilarId], slotTerbit: { hari: ['rabu', 'jumat'], jam: ['06', '18'] }, antreOtomatis: true })
  await lepasKunci(payload)
})

afterAll(async () => {
  pakaiAdapterAi(null)
  await aturOtomasi({ aktif: false, pilar: [] })
})

describe('usulan topik', () => {
  it('usulan Claude disimpan menunggu persetujuan; topik yang sudah pernah diusulkan tidak masuk lagi', async () => {
    const payload = await getTestPayload()
    await hapusUsulanPilar()
    const kunci = unik('kata kunci usulan')
    palsu.contoh.usulan = {
      usulan: [
        { ...(CONTOH_PALSU.usulan as { usulan: Record<string, unknown>[] }).usulan[0], pilar: pilarSlug, kataKunci: kunci, subkategoriBaru: { slug: '', nama: 'Sub Otomasi', deskripsi: 'Uji.' } },
        { ...(CONTOH_PALSU.usulan as { usulan: Record<string, unknown>[] }).usulan[0], pilar: 'pilar-tidak-ada', kataKunci: unik('dibuang') },
      ],
    }
    expect(await mintaUsulan(payload, { sekarang })).toEqual({ dibuat: 1, pesan: null })
    const { docs } = await payload.find({ collection: 'usulan-topik', where: { pilar: { equals: pilarId } }, depth: 0, overrideAccess: true })
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({ kataKunci: kunci, status: 'usulan', sumber: 'ai', subkategoriBaru: { nama: 'Sub Otomasi', slug: 'sub-otomasi' }, tools: ['gaji-bersih'] })
    const permintaan = palsu.permintaan.at(-1)!
    expect(permintaan).toMatchObject({ tugas: 'usulan', model: 'claude-sonnet-5-5', tanpaUlang: true, batasMs: 150_000 })
    expect(permintaan.pesan).toContain(`${pilarSlug} (Pilar Otomasi)`)

    const ulang = await mintaUsulan(payload, { sekarang })
    expect(ulang).toEqual({ dibuat: 0, pesan: 'Tidak ada usulan yang sah atau semuanya sudah pernah ada.' })
  })
})

describe('draf otomatis', () => {
  it('menulis draf lengkap dari usulan disetujui tertua: sampul, subkategori baru, draf AI, catatan review, skor panel SEO', async () => {
    const payload = await getTestPayload()
    await hapusUsulanPilar()
    const u = await usulanDisetujui({ subkategoriBaru: { nama: unik('Sub Baru'), slug: unik('sub-baru'), deskripsi: 'Sub uji.' } })
    const slug = artikelUnik()
    const hasil = await tulisDraf(payload, { sekarang })
    expect(hasil).toMatchObject({ status: 'berhasil', slug })

    const { docs } = await payload.find({ collection: 'artikel', draft: true, where: { slug: { equals: slug } }, depth: 1, overrideAccess: true })
    const a = docs[0]
    expect(a).toMatchObject({ _status: 'draft', pakaiDrafAi: true, judul: 'Contoh artikel otomatis dari adapter palsu' })
    expect(a.gambarUtama).toMatchObject({ width: 1920, height: 1080, alt: 'Kartu sampul contoh dari adapter palsu' })
    expect(a.subkategori).toMatchObject({ slug: (u.subkategoriBaru as { slug: string }).slug })
    expect(a.penulis).toMatchObject({ slug: 'redaksi' })

    const usulan = await payload.findByID({ collection: 'usulan-topik', id: u.id, depth: 0, overrideAccess: true })
    expect(usulan).toMatchObject({ status: 'ditulis', artikel: a.id, cekAngka: 1, catatan: '- Contoh angka yang harus dicek.', waktuDitulis: sekarang.toISOString() })
    expect(usulan.skorSeo).toMatch(/^\d+\/\d+$/)
    expect(palsu.permintaan.at(-1)).toMatchObject({ tugas: 'artikel', maksToken: 16_000, batasMs: 200_000 })
  })

  it('jawaban yang tidak bisa dipakai: usulan kembali disetujui dengan pesannya, lalu gagal setelah tiga kali', async () => {
    const payload = await getTestPayload()
    await hapusUsulanPilar()
    const u = await usulanDisetujui()
    palsu.contoh.artikel = { ...(CONTOH_PALSU.artikel as Record<string, unknown>), isi: '## Pendek\n\nTerlalu pendek.' }
    for (let i = 1; i <= 3; i++) {
      const hasil = await tulisDraf(payload, { sekarang })
      expect(hasil).toMatchObject({ status: 'gagal', pesan: 'Jawaban Claude tidak bisa dipakai: isi terlalu pendek (3 kata, 1 subjudul H2).' })
      const sesudah = await payload.findByID({ collection: 'usulan-topik', id: u.id, depth: 0, overrideAccess: true })
      expect(sesudah).toMatchObject({ status: i < 3 ? 'disetujui' : 'gagal', percobaan: i })
    }
    expect(await tulisDraf(payload, { sekarang })).toEqual({ status: 'kosong' })
  })

  it('Asisten AI mati: topik kembali disetujui tanpa menambah percobaan', async () => {
    const payload = await getTestPayload()
    await hapusUsulanPilar()
    const u = await usulanDisetujui()
    await payload.updateGlobal({ slug: 'asisten-ai', data: { aktif: false } as never, overrideAccess: true })
    try {
      expect(await tulisDraf(payload, { sekarang })).toMatchObject({ status: 'gagal', pesan: 'Asisten AI sedang dimatikan admin di Pengaturan, Asisten AI.' })
      expect(await payload.findByID({ collection: 'usulan-topik', id: u.id, depth: 0, overrideAccess: true })).toMatchObject({ status: 'disetujui', percobaan: 0 })
    } finally {
      await payload.updateGlobal({ slug: 'asisten-ai', data: { aktif: true } as never, overrideAccess: true })
    }
  })
})

describe('antrean terbit', () => {
  it('draf masuk slot kosong berikutnya setelah review lengkap dan tanpa [cek angka]; bisa dikeluarkan lagi', async () => {
    const payload = await getTestPayload()
    await hapusUsulanPilar()
    const u = await usulanDisetujui()
    artikelUnik()
    const ditulis = await tulisDraf(payload, { sekarang })
    if (ditulis.status !== 'berhasil') throw new Error(JSON.stringify(ditulis))

    // Belum direview: tidak diantre.
    expect(await antrekanTerbit(payload, { sekarang })).toMatchObject({ diantre: [], belumSiap: 1 })

    const doc = await payload.findByID({ collection: 'artikel', id: ditulis.artikel, draft: true, depth: 0, overrideAccess: true })
    const isi = JSON.parse(JSON.stringify(doc.isi).replaceAll(' [cek angka]', ''))
    await payload.update({
      collection: 'artikel',
      id: ditulis.artikel,
      draft: true,
      overrideAccess: true,
      data: { isi, reviewAi: { sumberDicek: true, angkaDicek: true, pengalamanDitambah: true } } as never,
    })
    const antre = await antrekanTerbit(payload, { sekarang })
    // Rabu 5 Maret 2025 06.00 WIB = 4 Maret 23.00 UTC (slot jam 06 dan 18 pada Rabu dan Jumat).
    expect(antre.diantre).toEqual([{ judul: 'Contoh artikel otomatis dari adapter palsu', waktu: '2025-03-04T23:00:00.000Z' }])
    const { docs: jobs } = await payload.find({
      collection: 'payload-jobs',
      where: { and: [{ taskSlug: { equals: 'schedulePublish' } }, { 'input.doc.value': { equals: ditulis.artikel } }] },
      overrideAccess: true,
    })
    expect(jobs).toHaveLength(1)
    expect(new Date(jobs[0].waitUntil as string).toISOString()).toBe('2025-03-04T23:00:00.000Z')
    expect(await payload.findByID({ collection: 'usulan-topik', id: u.id, depth: 0, overrideAccess: true })).toMatchObject({ status: 'terjadwal' })

    expect(await keluarkanDariAntrean(payload, u.id)).toBe(true)
    expect(await payload.findByID({ collection: 'usulan-topik', id: u.id, depth: 0, overrideAccess: true })).toMatchObject({ status: 'ditulis', jadwal: null })
    const sisa = await payload.count({ collection: 'payload-jobs', where: { id: { equals: jobs[0].id } }, overrideAccess: true })
    expect(sisa.totalDocs).toBe(0)

    // Artikel yang sudah terbit (misalnya diterbitkan pemilik sendiri) menjadikan usulannya terbit.
    await payload.update({ collection: 'artikel', id: ditulis.artikel, overrideAccess: true, data: { _status: 'published' } as never })
    expect(await antrekanTerbit(payload, { sekarang })).toMatchObject({ terbit: 1 })
    expect(await payload.findByID({ collection: 'usulan-topik', id: u.id, depth: 0, overrideAccess: true })).toMatchObject({ status: 'terbit' })
  })
})

describe('jalan otomasi', () => {
  it('mati tidak berbuat apa-apa; kunci mencegah jalan ganda; kuota harian dihormati', async () => {
    const payload = await getTestPayload()
    await hapusUsulanPilar()
    await aturOtomasi({ aktif: false })
    expect(await jalankanOtomasi(payload, { sekarang })).toMatchObject({ status: 'mati' })
    await aturOtomasi({ aktif: true, drafPerHari: 1 })

    expect(await ambilKunci(payload, sekarang)).toBe(true)
    expect(await jalankanOtomasi(payload, { sekarang })).toMatchObject({ status: 'berjalan-lain' })
    await lepasKunci(payload)

    // Hari lain supaya kuota dan jeda usulan milik tes ini; ada satu topik disetujui, jadi tidak minta usulan.
    const besok = new Date('2025-03-06T03:00:00.000Z')
    await usulanDisetujui()
    await usulanDisetujui()
    artikelUnik()
    const pertama = await jalankanOtomasi(payload, { sekarang: besok })
    expect(pertama).toMatchObject({ status: 'selesai', tulis: { pesan: null } })
    const kedua = await jalankanOtomasi(payload, { sekarang: new Date(besok.getTime() + 3_600_000) })
    expect(kedua.tulis).toBeNull()
  })
})

describe('endpoint otomasi', () => {
  const endpoint = (path: string, method: string) => endpointOtomasi.find((e) => e.path === path && e.method === method)!

  async function panggil(path: string, method: string, user: unknown, body: unknown = {}, routeParams: Record<string, string> = {}, headers: Record<string, string> = {}) {
    const payload = await getTestPayload()
    const req = { payload, user, routeParams, headers: new Headers(headers), json: async () => body } as unknown as PayloadRequest
    return endpoint(path, method).handler(req)
  }

  it('setujui dan tolak hanya admin dari situs sendiri; cron tanpa rahasia ditolak', async () => {
    const payload = await getTestPayload()
    await hapusUsulanPilar()
    const u = await payload.create({
      collection: 'usulan-topik',
      overrideAccess: true,
      data: { judul: 'Usulan endpoint', kataKunci: unik('usulan endpoint'), pilar: pilarId, tipe: 'panduan', status: 'usulan', sumber: 'ai' } as never,
    })
    const admin = { id: 1, peran: 'admin' }
    expect((await panggil('/:id/status', 'post', null, { status: 'disetujui' }, { id: String(u.id) })).status).toBe(401)
    expect((await panggil('/:id/status', 'post', { id: 1, peran: 'editor' }, { status: 'disetujui' }, { id: String(u.id) })).status).toBe(403)
    expect((await panggil('/:id/status', 'post', admin, { status: 'disetujui' }, { id: String(u.id) }, { 'sec-fetch-site': 'cross-site' })).status).toBe(403)
    expect((await panggil('/:id/status', 'post', admin, { status: 'aneh' }, { id: String(u.id) })).status).toBe(400)
    const ok = await panggil('/:id/status', 'post', admin, { status: 'disetujui' }, { id: String(u.id) })
    expect(ok.status).toBe(200)
    expect(await payload.findByID({ collection: 'usulan-topik', id: u.id, depth: 0, overrideAccess: true })).toMatchObject({ status: 'disetujui' })
    expect((await panggil('/:id/status', 'post', admin, { status: 'ditolak' }, { id: String(u.id) })).status).toBe(200)
    expect((await panggil('/jalan', 'get', null)).status).toBe(401)
    expect((await panggil('/aksi', 'post', admin, { aksi: 'hapus' })).status).toBe(400)
  })
})
