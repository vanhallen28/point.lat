import { sql } from '@payloadcms/db-postgres'
import type { Payload, PayloadRequest } from 'payload'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'
import { bersihkanPembaca } from '@/modules/pembaca/data'
import { endpointBerhenti, endpointCsv, endpointDaftar, endpointKirimPesan } from '@/modules/pembaca/endpoint'
import { MAKS_KIRIMAN_PER_JAM, MAKS_ISIAN_FORM } from '@/modules/pembaca/tipe'

import { getTestPayload, unik } from './helpers'

type Endpoint = typeof endpointKirimPesan

/** Memanggil endpoint seperti browser: JSON (dengan JavaScript) atau form biasa, dengan IP dan header tertentu. */
async function panggil(
  endpoint: Endpoint,
  isi: Record<string, string> | string,
  opsi: { json?: boolean; ip?: string; header?: Record<string, string>; user?: unknown } = {},
) {
  const payload = await getTestPayload()
  const json = opsi.json ?? true
  const badan = typeof isi === 'string' ? isi : json ? JSON.stringify(isi) : new URLSearchParams(isi).toString()
  const headers = new Headers({
    'content-type': json ? 'application/json' : 'application/x-www-form-urlencoded',
    'x-forwarded-for': opsi.ip ?? `198.51.100.${Math.floor(Math.random() * 250)}`,
    ...opsi.header,
  })
  const req = { payload, headers, user: opsi.user ?? null, text: async () => badan } as unknown as PayloadRequest
  return endpoint.handler(req)
}

const pesanSah = (nama = unik('Pembaca')) => ({
  nama,
  email: `${nama.toLowerCase()}@contoh.com`,
  topik: 'koreksi',
  pesan: 'Angka PTKP di paragraf kedua sepertinya keliru.',
  setuju: 'on',
  asal: '/kontak',
})

async function pesanBernama(payload: Payload, nama: string) {
  return (await payload.find({ collection: 'pesan-masuk', where: { nama: { equals: nama } }, depth: 0, overrideAccess: true })).docs
}

async function pelanggan(payload: Payload, email: string) {
  return (await payload.find({ collection: 'pelanggan-newsletter', where: { email: { equals: email } }, depth: 0, overrideAccess: true })).docs
}

let tag: string[] = []

beforeAll(() => {
  pakaiPemicuRevalidasi((t) => tag.push(t))
})

afterAll(async () => {
  pakaiPemicuRevalidasi(null)
  const payload = await getTestPayload()
  await payload.updateGlobal({ slug: 'fitur', data: { formKontak: false, newsletter: false } })
  await payload.updateGlobal({ slug: 'newsletter', data: { cara: 'form' } })
})

beforeEach(async () => {
  const payload = await getTestPayload()
  await payload.updateGlobal({ slug: 'fitur', data: { formKontak: true, newsletter: true } })
  await payload.updateGlobal({ slug: 'newsletter', data: { cara: 'form' } })
  tag = []
})

describe('form kontak (pesan masuk)', () => {
  it('JSON: pesan tersimpan berstatus Baru dengan sidik pengirim, tanpa IP mentah', async () => {
    const payload = await getTestPayload()
    const isi = pesanSah()
    const r = await panggil(endpointKirimPesan, isi, { ip: '203.0.113.77' })
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ status: 'berhasil', pesan: 'Pesanmu sudah kami terima. Terima kasih.' })
    const [doc] = await pesanBernama(payload, isi.nama)
    expect(doc).toMatchObject({ status: 'baru', email: isi.email, topik: 'koreksi', asal: '/kontak' })
    expect(doc.sidik).toMatch(/^[0-9a-f]{32}$/)
    expect(JSON.stringify(doc)).not.toContain('203.0.113.77')
  })

  it('form tanpa JavaScript: dialihkan 303 ke #pesan-terkirim atau #pesan-gagal di halaman asal', async () => {
    const berhasil = await panggil(endpointKirimPesan, pesanSah(), { json: false })
    expect(berhasil.status).toBe(303)
    expect(berhasil.headers.get('location')).toBe('/kontak#pesan-terkirim')
    const gagal = await panggil(endpointKirimPesan, { ...pesanSah(), pesan: 'pendek', asal: 'https://jahat.com' }, { json: false })
    expect(gagal.status).toBe(303)
    expect(gagal.headers.get('location')).toBe('/#pesan-gagal')
  })

  it('isian salah dijawab 400 dengan pesan per kolom; tidak disimpan', async () => {
    const payload = await getTestPayload()
    const nama = unik('Salah')
    const r = await panggil(endpointKirimPesan, { ...pesanSah(nama), email: 'bukan-email', setuju: '' })
    expect(r.status).toBe(400)
    expect((await r.json()).galat).toEqual({ email: 'Tulis alamat email yang benar, misalnya nama@contoh.com.', setuju: 'Centang persetujuan dulu.' })
    expect(await pesanBernama(payload, nama)).toEqual([])
  })

  it('kolom jebakan terisi: dijawab berhasil tanpa disimpan', async () => {
    const payload = await getTestPayload()
    const isi = { ...pesanSah(), situs_web: 'http://spam.example' }
    expect((await panggil(endpointKirimPesan, isi)).status).toBe(200)
    expect(await pesanBernama(payload, isi.nama)).toEqual([])
  })

  it(`paling banyak ${MAKS_KIRIMAN_PER_JAM} kiriman per jam dari pengirim yang sama; pengirim lain tetap bisa`, async () => {
    const ip = `192.0.2.${Math.floor(Math.random() * 250)}`
    for (let i = 0; i < MAKS_KIRIMAN_PER_JAM; i++) expect((await panggil(endpointKirimPesan, pesanSah(), { ip })).status).toBe(200)
    const lewat = await panggil(endpointKirimPesan, pesanSah(), { ip })
    expect(lewat.status).toBe(429)
    expect((await lewat.json()).pesan).toBe('Terlalu banyak kiriman dari perangkatmu. Coba lagi satu jam lagi.')
    expect((await panggil(endpointKirimPesan, pesanSah(), { ip: '192.0.2.251' })).status).toBe(200)
  })

  it('kiriman dari situs lain dan isian di atas 10 KB ditolak; form mati menjawab 404', async () => {
    const payload = await getTestPayload()
    expect((await panggil(endpointKirimPesan, pesanSah(), { header: { 'sec-fetch-site': 'cross-site' } })).status).toBe(403)
    expect((await panggil(endpointKirimPesan, pesanSah(), { header: { 'content-length': String(MAKS_ISIAN_FORM + 1) } })).status).toBe(413)
    expect((await panggil(endpointKirimPesan, JSON.stringify({ ...pesanSah(), pesan: 'x'.repeat(MAKS_ISIAN_FORM) }))).status).toBe(413)
    await payload.updateGlobal({ slug: 'fitur', data: { formKontak: false } })
    expect((await panggil(endpointKirimPesan, pesanSah())).status).toBe(404)
  })

  it('isi pesan tidak bisa diubah lewat API; editor bisa mengubah status, hanya admin yang menghapus', async () => {
    const payload = await getTestPayload()
    const isi = pesanSah()
    await panggil(endpointKirimPesan, isi)
    const [doc] = await pesanBernama(payload, isi.nama)
    const editor = await payload.create({
      collection: 'pengguna',
      data: { nama: 'Editor', email: `${unik('editor')}@point.lat`, password: 'rahasia-editor-123', peran: 'editor' },
    })
    const diubah = await payload.update({ collection: 'pesan-masuk', id: doc.id, data: { status: 'dibaca', pesan: 'diganti' }, user: editor, overrideAccess: false })
    expect(diubah).toMatchObject({ status: 'dibaca', pesan: isi.pesan })
    await expect(payload.delete({ collection: 'pesan-masuk', id: doc.id, user: editor, overrideAccess: false })).rejects.toThrow()
    await expect(
      payload.create({ collection: 'pesan-masuk', data: { nama: isi.nama, email: isi.email, topik: 'koreksi', pesan: isi.pesan, status: 'baru' }, user: editor, overrideAccess: false }),
    ).rejects.toThrow()
  })
})

describe('newsletter tersimpan', () => {
  it('daftar: email huruf kecil dengan persetujuan; daftar ulang tidak membedakan dan tidak menggandakan', async () => {
    const payload = await getTestPayload()
    const email = `${unik('pembaca')}@contoh.com`
    const r1 = await panggil(endpointDaftar, { email: email.toUpperCase(), setuju: 'on', asal: '/' })
    const r2 = await panggil(endpointDaftar, { email, setuju: 'on', asal: '/artikel' })
    expect([r1.status, r2.status]).toEqual([200, 200])
    expect(await r2.json()).toEqual(await r1.json())
    const docs = await pelanggan(payload, email)
    expect(docs).toHaveLength(1)
    expect(docs[0]).toMatchObject({ email, sumber: '/' })
    expect(docs[0].disetujuiPada).toBeTruthy()
  })

  it('tanpa persetujuan ditolak; cara tautan penyedia atau saklar mati: 404', async () => {
    const payload = await getTestPayload()
    expect((await panggil(endpointDaftar, { email: `${unik('a')}@contoh.com` })).status).toBe(400)
    await payload.updateGlobal({ slug: 'newsletter', data: { cara: 'penyedia' } })
    expect((await panggil(endpointDaftar, { email: `${unik('a')}@contoh.com`, setuju: 'on' })).status).toBe(404)
    await payload.updateGlobal({ slug: 'newsletter', data: { cara: 'form' } })
    await payload.updateGlobal({ slug: 'fitur', data: { newsletter: false } })
    expect((await panggil(endpointDaftar, { email: `${unik('a')}@contoh.com`, setuju: 'on' })).status).toBe(404)
  })

  it('berhenti langganan menghapus email itu; email yang tidak terdaftar dijawab sama', async () => {
    const payload = await getTestPayload()
    const email = `${unik('berhenti')}@contoh.com`
    await panggil(endpointDaftar, { email, setuju: 'on' })
    const r = await panggil(endpointBerhenti, { email: email.toUpperCase(), asal: '/newsletter/berhenti' }, { json: false })
    expect(r.headers.get('location')).toBe('/newsletter/berhenti#berhenti-berhasil')
    expect(await pelanggan(payload, email)).toEqual([])
    const lain = await panggil(endpointBerhenti, { email: `${unik('tidak-ada')}@contoh.com` })
    expect(await lain.json()).toEqual({ status: 'berhasil', pesan: 'Email itu sudah tidak ada di daftar newsletter.' })
  })

  it('CSV hanya untuk admin, dengan BOM UTF-8 dan nama file bertanggal', async () => {
    const payload = await getTestPayload()
    const email = `${unik('csv')}@contoh.com`
    await panggil(endpointDaftar, { email, setuju: 'on', asal: '/' })
    expect((await panggil(endpointCsv, '', { user: null })).status).toBe(401)
    expect((await panggil(endpointCsv, '', { user: { peran: 'editor' } })).status).toBe(403)
    const r = await panggil(endpointCsv, '', { user: { peran: 'admin' } })
    expect(r.headers.get('content-type')).toBe('text/csv; charset=utf-8')
    expect(r.headers.get('content-disposition')).toMatch(/^attachment; filename="pelanggan-newsletter-\d{4}-\d{2}-\d{2}\.csv"$/)
    const bita = new Uint8Array(await r.arrayBuffer())
    expect([...bita.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])
    const isi = new TextDecoder().decode(bita)
    expect(isi.startsWith('email,sumber,terdaftar\r\n')).toBe(true)
    expect(isi).toContain(`${email},/,`)
    expect(await payload.find({ collection: 'pelanggan-newsletter', user: { peran: 'editor' } as never, overrideAccess: false }).catch(() => 'ditolak')).toBe('ditolak')
  })
})

describe('pemeliharaan dan revalidasi', () => {
  it('cron: sidik lebih dari 24 jam dikosongkan, pesan lebih dari 12 bulan dihapus', async () => {
    const payload = await getTestPayload()
    const lama = pesanSah()
    const baru = pesanSah()
    await panggil(endpointKirimPesan, lama)
    await panggil(endpointKirimPesan, baru)
    const [docLama] = await pesanBernama(payload, lama.nama)
    const [docBaru] = await pesanBernama(payload, baru.nama)
    await payload.db.drizzle.execute(sql`update pesan_masuk set created_at = now() - interval '13 months' where id = ${docLama.id}`)
    await payload.db.drizzle.execute(sql`update pesan_masuk set created_at = now() - interval '2 days' where id = ${docBaru.id}`)
    const hasil = await bersihkanPembaca(payload)
    expect(hasil.pesan).toBeGreaterThanOrEqual(1)
    expect(await pesanBernama(payload, lama.nama)).toEqual([])
    const [sesudah] = await pesanBernama(payload, baru.nama)
    expect(sesudah.sidik ?? null).toBeNull()
  })

  it('global Fitur membuang tag fitur, Kode sematan membuang tag kode-sematan; kode sematan hanya admin', async () => {
    const payload = await getTestPayload()
    await payload.updateGlobal({ slug: 'fitur', data: { tombolBagikan: true } })
    await payload.updateGlobal({ slug: 'kode-sematan', data: { kode: [] } })
    expect(tag).toEqual(expect.arrayContaining(['fitur', 'kode-sematan']))
    const editor = { peran: 'editor' } as never
    await expect(payload.findGlobal({ slug: 'kode-sematan', user: editor, overrideAccess: false })).rejects.toThrow()
    await expect(payload.updateGlobal({ slug: 'fitur', data: { formKontak: true }, user: editor, overrideAccess: false })).rejects.toThrow()
    await payload.updateGlobal({ slug: 'fitur', data: { tombolBagikan: false } })
  })
})
