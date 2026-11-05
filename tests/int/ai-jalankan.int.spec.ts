import config from '@payload-config'
import { handleEndpoints, type Payload } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { adapterPalsu, jalankan, pakaiAdapterAi, type StatusAsisten } from '@/modules/ai'
import { terpakaiBulan } from '@/modules/ai/anggaran'
import { ANGGARAN_BAWAAN, HARGA_BAWAAN } from '@/modules/ai/aturan'
import { CONTOH_PALSU } from '@/modules/ai/palsu'

import { getTestPayload, unik } from './helpers'

const palsu = adapterPalsu()
const ADAPTER = { mode: 'palsu' as const, adapter: palsu }
const BAWAAN = { aktif: true, anggaranBulanan: ANGGARAN_BAWAAN, harga: HARGA_BAWAAN, frasaKlise: [] as string[] }
const MASUKAN = { judul: 'Cara hitung gaji bersih', keyphrase: 'gaji bersih', teks: 'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan BPJS.' }
const BASIS = 'http://localhost:3000/api'

/** Bulan lampau milik satu tes: baris anggarannya dihapus dulu supaya tes bisa diulang di database berisi. */
async function waktuUji(payload: Payload, bulan: string) {
  await payload.delete({ collection: 'pemakaian-ai', where: { bulan: { equals: bulan } } })
  return new Date(`${bulan}-15T05:00:00.000Z`)
}

async function pengguna(payload: Payload, peran: 'admin' | 'editor' = 'editor') {
  const email = `${unik(peran)}@tes.local`
  const doc = await payload.create({ collection: 'pengguna', data: { email, password: 'rahasia-123', nama: peran, peran } })
  const { token } = await payload.login({ collection: 'pengguna', data: { email, password: 'rahasia-123' } })
  return { doc, token: token! }
}

async function logMilik(payload: Payload, penggunaId: number) {
  const { docs } = await payload.find({ collection: 'log-ai', where: { pengguna: { equals: penggunaId } }, sort: 'id', depth: 0, limit: 20 })
  return docs
}

async function panggil(method: 'GET' | 'POST', token?: string, body?: unknown) {
  const headers = new Headers({ 'Content-Type': 'application/json' })
  if (token) headers.set('Authorization', `JWT ${token}`)
  const respons = await handleEndpoints({
    config,
    request: new Request(`${BASIS}/artikel/asisten`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }),
  })
  return { status: respons.status, data: (await respons.json()) as Record<string, unknown> }
}

describe('jalankan tugas AI', () => {
  beforeAll(() => pakaiAdapterAi(palsu))
  beforeEach(async () => {
    palsu.reset()
    await (await getTestPayload()).updateGlobal({ slug: 'asisten-ai', data: BAWAAN })
  })
  afterAll(async () => {
    pakaiAdapterAi(null)
    await (await getTestPayload()).updateGlobal({ slug: 'asisten-ai', data: BAWAAN })
  })

  it('berhasil: saran meta dari model meta bawaan, log berisi pengguna, artikel, token, dan biaya, dan anggaran bertambah sebesar biaya', async () => {
    const payload = await getTestPayload()
    const sekarang = await waktuUji(payload, '1998-01')
    const { doc: editor } = await pengguna(payload)
    const artikel = await payload.create({ collection: 'artikel', draft: true, data: { judul: unik('Draf meta'), _status: 'draft' } })
    const hasil = await jalankan(payload, 'meta', MASUKAN, { pengguna: editor, dokumen: artikel.id, adapter: ADAPTER, sekarang })

    expect(hasil).toMatchObject({ status: 'berhasil', tugas: 'meta', model: 'claude-haiku-5-5', mode: 'palsu', hasil: { slug: 'contoh-slug-adapter-palsu', catatan: [] } })
    if (hasil.status !== 'berhasil') throw new Error('harus berhasil')
    expect(palsu.permintaan).toHaveLength(1)
    expect(palsu.permintaan[0]).toMatchObject({ tugas: 'meta', model: 'claude-haiku-5-5', maksToken: 4_000, effort: 'low' })
    expect(palsu.permintaan[0].pesan).toContain('<artikel>\nGaji bersih adalah gaji kotor')
    expect(hasil.biaya).toBeCloseTo((hasil.token.masuk * 0.1 + hasil.token.keluar * 0.5) / 1_000_000, 6)
    expect(await terpakaiBulan(payload, '1998-01')).toBe(hasil.biaya)

    const [log] = await logMilik(payload, editor.id)
    expect(log).toMatchObject({
      waktu: sekarang.toISOString(),
      tugas: 'meta',
      status: 'berhasil',
      pengguna: editor.id,
      dokumen: artikel.id,
      ringkasan: 'Cara hitung gaji bersih',
      model: 'claude-haiku-5-5',
      mode: 'palsu',
      tokenMasuk: hasil.token.masuk,
      tokenKeluar: hasil.token.keluar,
      biaya: hasil.biaya,
      pesan: null,
    })
    expect(log.durasiMs).toBeGreaterThanOrEqual(0)
  })

  it('galat Claude: pesan untuk editor, log gagal, dan token yang sudah ditagih tetap masuk anggaran', async () => {
    const payload = await getTestPayload()
    const sekarang = await waktuUji(payload, '1998-02')
    const { doc: editor } = await pengguna(payload)
    palsu.jawab(
      { status: 'gagal', jenis: 'sibuk', pesan: 'Claude sedang sibuk atau bermasalah (529, overloaded_error). Coba lagi beberapa menit lagi.', kodeHttp: 529, token: { masuk: 0, keluar: 0 }, idPermintaan: null },
      { status: 'gagal', jenis: 'terpotong', pesan: 'Jawaban Claude terpotong sebelum selesai. Coba lagi, atau persingkat masukannya.', kodeHttp: 200, token: { masuk: 1_000, keluar: 4_000 }, idPermintaan: null },
    )
    expect(await jalankan(payload, 'meta', MASUKAN, { pengguna: editor, adapter: ADAPTER, sekarang })).toEqual({
      status: 'gagal',
      alasan: 'claude',
      kodeHttp: 502,
      pesan: 'Claude sedang sibuk atau bermasalah (529, overloaded_error). Coba lagi beberapa menit lagi.',
    })
    expect(await terpakaiBulan(payload, '1998-02')).toBe(0)
    expect(await jalankan(payload, 'meta', MASUKAN, { pengguna: editor, adapter: ADAPTER, sekarang })).toMatchObject({ alasan: 'claude', kodeHttp: 502 })
    expect(await terpakaiBulan(payload, '1998-02')).toBe(0.0021)

    palsu.contoh.meta = { judulSeo: 'Hanya judul' }
    expect(await jalankan(payload, 'meta', MASUKAN, { pengguna: editor, adapter: ADAPTER, sekarang })).toMatchObject({
      alasan: 'claude',
      pesan: 'Jawaban Claude tidak sesuai bentuk yang diminta. Coba lagi.',
    })
    const log = await logMilik(payload, editor.id)
    expect(log.map((l) => [l.status, l.biaya])).toEqual([
      ['gagal', 0],
      ['gagal', 0.0021],
      ['gagal', expect.any(Number)],
    ])
    expect(log[2].pesan).toBe('Jawaban Claude tidak sesuai bentuk yang diminta. Coba lagi. (isian wajib kosong atau salah bentuk)')
  })

  it('anggaran tidak cukup: Claude tidak dipanggil, pesan menyebut sisa dan perkiraan biaya, dan log mencatat anggaran habis', async () => {
    const payload = await getTestPayload()
    const sekarang = await waktuUji(payload, '1998-03')
    const { doc: editor } = await pengguna(payload)
    await payload.updateGlobal({ slug: 'asisten-ai', data: { anggaranBulanan: 0.001 } })
    const hasil = await jalankan(payload, 'meta', MASUKAN, { pengguna: editor, adapter: ADAPTER, sekarang })
    expect(hasil).toMatchObject({ status: 'gagal', alasan: 'anggaran', kodeHttp: 402 })
    if (hasil.status !== 'gagal') throw new Error('harus gagal')
    expect(hasil.pesan).toMatch(/^Anggaran AI bulan ini tidak cukup: sisa US\$0,001, sedangkan permintaan ini bisa memakai sampai US\$0,00\d+\. Tombol AI aktif lagi awal bulan depan, atau setelah admin menaikkan anggaran\.$/)
    expect(palsu.permintaan).toEqual([])
    expect((await logMilik(payload, editor.id)).map((l) => [l.status, l.pesan])).toEqual([['anggaran-habis', hasil.pesan]])
    expect(await terpakaiBulan(payload, '1998-03')).toBe(0)
  })

  it('asisten mati, belum dipasang, harga model kosong, atau masukan salah: ditolak tanpa memanggil Claude dan tanpa log', async () => {
    const payload = await getTestPayload()
    const sekarang = await waktuUji(payload, '1998-04')
    const { doc: editor } = await pengguna(payload)
    const opsi = { pengguna: editor, adapter: ADAPTER, sekarang }

    await payload.updateGlobal({ slug: 'asisten-ai', data: { aktif: false } })
    expect(await jalankan(payload, 'meta', MASUKAN, opsi)).toEqual({ status: 'gagal', alasan: 'mati', kodeHttp: 503, pesan: 'Asisten AI sedang dimatikan admin di Pengaturan, Asisten AI.' })
    await payload.updateGlobal({ slug: 'asisten-ai', data: { aktif: true } })

    expect(await jalankan(payload, 'meta', MASUKAN, { ...opsi, adapter: { mode: null, pesan: 'ANTHROPIC_API_KEY belum diisi di env server.' } })).toMatchObject({
      alasan: 'belum-dipasang',
      kodeHttp: 503,
      pesan: 'Asisten AI belum dipasang: ANTHROPIC_API_KEY belum diisi di env server.',
    })
    expect(await jalankan(payload, 'meta', MASUKAN, { ...opsi, env: { AI_MODEL_META: 'claude-fable-5-1' } })).toMatchObject({
      alasan: 'harga',
      kodeHttp: 503,
      pesan: 'Harga model claude-fable-5-1 belum ada di Pengaturan, Asisten AI, jadi biayanya tidak bisa dihitung. Minta admin mengisinya.',
    })
    expect(await jalankan(payload, 'meta', { ...MASUKAN, teks: '' }, opsi)).toMatchObject({ alasan: 'masukan', kodeHttp: 400, pesan: 'Isi artikel masih kosong. Tulis isinya dulu, lalu buat saran meta.' })
    expect(palsu.permintaan).toEqual([])
    expect(await logMilik(payload, editor.id)).toEqual([])
  })

  it('paling banyak enam permintaan per menit per pengguna; pengguna lain tidak terpengaruh', async () => {
    const payload = await getTestPayload()
    const sekarang = await waktuUji(payload, '1998-05')
    const { doc: editor } = await pengguna(payload)
    const { doc: lain } = await pengguna(payload)
    for (let i = 0; i < 6; i++) expect(await jalankan(payload, 'meta', MASUKAN, { pengguna: editor, adapter: ADAPTER, sekarang })).toMatchObject({ status: 'berhasil' })
    expect(await jalankan(payload, 'meta', MASUKAN, { pengguna: editor, adapter: ADAPTER, sekarang })).toEqual({
      status: 'gagal',
      alasan: 'batas',
      kodeHttp: 429,
      pesan: 'Paling banyak 6 permintaan AI per menit. Tunggu sebentar lalu coba lagi.',
    })
    expect(await jalankan(payload, 'meta', MASUKAN, { pengguna: lain, adapter: ADAPTER, sekarang })).toMatchObject({ status: 'berhasil' })
    const semenitLagi = new Date(sekarang.getTime() + 61_000)
    expect(await jalankan(payload, 'meta', MASUKAN, { pengguna: editor, adapter: ADAPTER, sekarang: semenitLagi })).toMatchObject({ status: 'berhasil' })
  })
})

describe('endpoint asisten AI', () => {
  beforeAll(() => pakaiAdapterAi(palsu))
  afterAll(() => pakaiAdapterAi(null))

  it('belum masuk ditolak 401; tugas tidak dikenal 400; editor mendapat saran meta dan status asisten', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'asisten-ai', data: BAWAAN })
    expect(await panggil('POST', undefined, { tugas: 'meta', masukan: MASUKAN })).toEqual({ status: 401, data: { status: 'gagal', pesan: 'Masuk dulu untuk memakai asisten AI.' } })
    expect((await panggil('GET')).status).toBe(401)

    const { token } = await pengguna(payload)
    expect(await panggil('POST', token, { tugas: 'naskah-video', masukan: {} })).toEqual({ status: 400, data: { status: 'gagal', pesan: 'Tugas asisten tidak dikenal.' } })
    const berhasil = await panggil('POST', token, { tugas: 'meta', masukan: MASUKAN, dokumen: 'bukan-id' })
    expect(berhasil.status).toBe(200)
    expect(berhasil.data).toMatchObject({ status: 'berhasil', tugas: 'meta', mode: 'palsu', hasil: { judulSeo: (CONTOH_PALSU.meta as { judulSeo: string }).judulSeo } })
    expect(await panggil('POST', token, { tugas: 'meta', masukan: { teks: '' } })).toMatchObject({ status: 400, data: { alasan: 'masukan' } })

    const status = await panggil('GET', token)
    expect(status.status).toBe(200)
    expect(status.data as StatusAsisten).toMatchObject({ aktif: true, mode: 'palsu', pesan: null, tugas: { meta: { model: 'claude-haiku-5-5', adaHarga: true } }, frasaKlise: [] })
  })
})
