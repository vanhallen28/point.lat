import { sql } from '@payloadcms/db-postgres'
import type { PayloadRequest } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { MAKS_PER_MENIT, type Kiriman, type Rentang } from '@/modules/kunjungan/aturan'
import { ambilKunjungan, bersihkanKunjungan, catatKunjungan, judulHalaman, type KonteksKunjungan } from '@/modules/kunjungan/data'
import { endpointCatatKunjungan, endpointCsvKunjungan } from '@/modules/kunjungan/endpoint'

import { getTestPayload, unik } from './helpers'

const UA_HP = 'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36'
const UA_LAPTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0'
const RAHASIA = 'rahasia-uji-kunjungan'

/**
 * Tanggal uji di masa lalu (CSV memotong rentang di hari ini) dan tidak dipakai tes lain; dibersihkan sebelum dipakai.
 * `LAMA` untuk baris yang sudah lewat masa simpan.
 */
const TAHUN = '2024'
const LAMA = '2022-12-01'
const db = async () => (await getTestPayload()).db.drizzle

async function kosongkanTahunUji() {
  const d = await db()
  await d.execute(sql`delete from kunjungan where tanggal like ${`${TAHUN}-%`} or tanggal = ${LAMA}`)
  await d.execute(sql`delete from kunjungan_harian where tanggal like ${`${TAHUN}-%`} or tanggal = ${LAMA}`)
}

function konteks(isi: Partial<KonteksKunjungan> = {}): KonteksKunjungan {
  return { ua: UA_HP, ip: '203.0.113.10', negara: 'ID', kota: 'Jakarta', hostSitus: ['point.lat'], perangkat: 'hp', peramban: 'Chrome', ...isi }
}

const kiriman = (path: string, perujuk: string | null = null, utm: string | null = null): Kiriman => ({ path, perujuk, utm })

async function hitungPath(path: string) {
  const { rows } = await (await db()).execute(sql`select count(*) as n from kunjungan where path = ${path}`)
  return Number(rows[0].n)
}

async function harian(tanggal: string) {
  const { rows } = await (await db()).execute(sql`select tayangan, pengunjung from kunjungan_harian where tanggal = ${tanggal}`)
  return rows[0] ? { tayangan: Number(rows[0].tayangan), pengunjung: Number(rows[0].pengunjung) } : null
}

describe('mencatat kunjungan', () => {
  beforeAll(kosongkanTahunUji)

  it('baris mentah dan total harian dalam satu pernyataan; pengunjung baru dihitung sekali per hari', async () => {
    const payload = await getTestPayload()
    const t = new Date(`${TAHUN}-01-05T02:00:00.000Z`)
    expect(await catatKunjungan(payload, kiriman('/a', 'https://www.google.com/'), konteks(), RAHASIA, t)).toBe(true)
    expect(await catatKunjungan(payload, kiriman('/b', 'https://point.lat/a'), konteks(), RAHASIA, new Date(t.getTime() + 60_000))).toBe(true)
    expect(await catatKunjungan(payload, kiriman('/a'), konteks({ ip: '198.51.100.7', ua: UA_LAPTOP }), RAHASIA, t)).toBe(true)
    expect(await harian(`${TAHUN}-01-05`)).toEqual({ tayangan: 3, pengunjung: 2 })
    const { rows } = await (await db()).execute(
      sql`select path, kanal, sumber, perujuk, baru, masuk from kunjungan where tanggal = ${`${TAHUN}-01-05`} order by id`,
    )
    expect(rows).toEqual([
      { path: '/a', kanal: 'pencarian', sumber: 'Google', perujuk: 'google.com', baru: true, masuk: true },
      { path: '/b', kanal: 'internal', sumber: 'point.', perujuk: 'point.lat', baru: false, masuk: false },
      { path: '/a', kanal: 'langsung', sumber: 'Langsung', perujuk: null, baru: true, masuk: true },
    ])
  })

  it(`lebih dari ${MAKS_PER_MENIT} tayangan per menit dari pengunjung yang sama diabaikan`, async () => {
    const payload = await getTestPayload()
    const t = new Date(`${TAHUN}-01-06T02:00:00.000Z`)
    const hasil: boolean[] = []
    for (let i = 0; i < MAKS_PER_MENIT + 3; i++) hasil.push(await catatKunjungan(payload, kiriman(`/x${i}`), konteks({ ip: '192.0.2.1' }), RAHASIA, t))
    expect(hasil.filter(Boolean)).toHaveLength(MAKS_PER_MENIT)
    expect(await harian(`${TAHUN}-01-06`)).toEqual({ tayangan: MAKS_PER_MENIT, pengunjung: 1 })
    // Semenit kemudian tercatat lagi.
    expect(await catatKunjungan(payload, kiriman('/lagi'), konteks({ ip: '192.0.2.1' }), RAHASIA, new Date(t.getTime() + 61_000))).toBe(true)
  })

  it('baris mentah lebih dari 13 bulan dihapus cron harian; total harian tetap', async () => {
    const payload = await getTestPayload()
    await catatKunjungan(payload, kiriman('/lama'), konteks(), RAHASIA, new Date(`${LAMA}T02:00:00.000Z`))
    const dihapus = await bersihkanKunjungan(payload, new Date(`${TAHUN}-01-10T02:00:00.000Z`))
    expect(dihapus).toBeGreaterThanOrEqual(1)
    const { rows } = await (await db()).execute(sql`select count(*) as n from kunjungan where tanggal = ${LAMA}`)
    expect(Number(rows[0].n)).toBe(0)
    expect(await harian(LAMA)).toEqual({ tayangan: 1, pengunjung: 1 })
  })
})

describe('endpoint catat', () => {
  async function kirim(body: string, headers: Record<string, string> = {}) {
    const payload = await getTestPayload()
    const req = {
      payload,
      headers: new Headers({ 'user-agent': UA_HP, 'sec-fetch-site': 'same-origin', 'x-forwarded-for': '203.0.113.50', ...headers }),
      text: async () => body,
    } as unknown as PayloadRequest
    return endpointCatatKunjungan.handler(req)
  }

  it('mencatat negara dan kota dari header Vercel; selalu 204 dan mengabaikan bot, situs lain, admin yang masuk, dan isian cacat', async () => {
    const path = `/${unik('uji-catat')}`
    const isi = JSON.stringify({ p: path, r: 'https://chatgpt.com/', s: '' })
    const jawab = await kirim(isi, { 'x-vercel-ip-country': 'SG', 'x-vercel-ip-city': 'Singapore' })
    expect(jawab.status).toBe(204)
    const { rows } = await (await db()).execute(sql`select negara, kota, kanal, sumber, perangkat, peramban from kunjungan where path = ${path}`)
    expect(rows).toEqual([{ negara: 'SG', kota: 'Singapore', kanal: 'ai', sumber: 'ChatGPT', perangkat: 'hp', peramban: 'Chrome' }])

    const abaikan = [
      kirim(isi, { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' }),
      kirim(isi, { 'sec-fetch-site': 'cross-site' }),
      kirim(isi, { cookie: 'payload-theme=light; payload-token=abc' }),
      kirim(isi, { 'content-length': '5000' }),
      kirim('bukan json'),
      kirim(JSON.stringify({ p: '/admin/collections/artikel' })),
    ]
    for (const j of await Promise.all(abaikan)) expect(j.status).toBe(204)
    expect(await hitungPath(path)).toBe(1)
    expect(await hitungPath('/admin/collections/artikel')).toBe(0)
  })
})

describe('statistik beranda admin', () => {
  const rentang: Rentang = { jenis: '7', dari: `${TAHUN}-03-01`, sampai: `${TAHUN}-03-07` }
  const sekarang = new Date(`${TAHUN}-03-07T05:00:00.000Z`) // 12.00 WIB, hari terakhir rentang
  let pilarSlug = ''

  beforeAll(async () => {
    await kosongkanTahunUji()
    const payload = await getTestPayload()
    pilarSlug = unik('pilar-kunjungan')
    await payload.create({ collection: 'pilar', data: { nama: 'Pilar Kunjungan', slug: pilarSlug, warna: 'hijau', deskripsi: 'Pilar uji statistik.' } })
    const catat = (hari: number, jam: number, k: Kiriman, isi: Partial<KonteksKunjungan> = {}) =>
      catatKunjungan(payload, k, konteks(isi), RAHASIA, new Date(Date.UTC(Number(TAHUN), 2, hari, jam - 7)))
    // Kemarin (6 Maret): dua pengunjung sebelum pukul 12.00 WIB, satu sesudahnya.
    await catat(6, 9, kiriman('/', 'https://www.google.com/'), { ip: '10.0.0.1' })
    await catat(6, 10, kiriman(`/${pilarSlug}`, 'https://l.facebook.com/'), { ip: '10.0.0.2', negara: 'MY', kota: 'Kuala Lumpur' })
    await catat(6, 20, kiriman('/'), { ip: '10.0.0.3' })
    // Hari ini (7 Maret) sampai 12.00 WIB: tiga pengunjung, satu pindah halaman, satu dari laptop.
    await catat(7, 8, kiriman(`/${pilarSlug}`, 'https://www.google.co.id/'), { ip: '10.0.0.4' })
    await catat(7, 8, kiriman('/tools', `https://point.lat/${pilarSlug}`), { ip: '10.0.0.4' })
    await catat(7, 9, kiriman('/tools', 'https://kompas.com/berita'), { ip: '10.0.0.5', ua: UA_LAPTOP, perangkat: 'desktop', peramban: 'Edge', negara: null, kota: null })
    await catat(7, 11, kiriman('/', null, 'instagram'), { ip: '10.0.0.6' })
    // Sedang online: tayangan dua menit sebelum `sekarang`.
    await catatKunjungan(payload, kiriman('/tools'), konteks({ ip: '10.0.0.7' }), RAHASIA, new Date(sekarang.getTime() - 120_000))
    // Rentang sebelumnya (23 sampai 29 Februari): satu kunjungan.
    await catat(0, 10, kiriman('/'), { ip: '10.0.0.8' }) // hari ke-0 Maret = 29 Februari 2024
  })

  it('angka rentang dan pembanding, grafik per hari, dan kartu Hari ini dibanding kemarin di jam yang sama', async () => {
    const payload = await getTestPayload()
    const data = await ambilKunjungan(payload, () => rentang, sekarang)
    expect(data.rentang).toEqual(rentang)
    expect(data.angka).toEqual({ tayangan: 8, kunjungan: 7, sebelumnya: { tayangan: 1, kunjungan: 1 } })
    expect(data.seri).toHaveLength(7)
    expect(data.seri.at(-2)).toMatchObject({ kunci: `${TAHUN}-03-06`, tayangan: 3, kunjungan: 3 })
    expect(data.seri.at(-1)).toMatchObject({ kunci: `${TAHUN}-03-07`, tayangan: 5, kunjungan: 4 })
    const hariIni = data.ringkas.find((r) => r.jenis === 'hari-ini')!
    expect(hariIni.angka).toEqual({ tayangan: 5, kunjungan: 4, sebelumnya: { tayangan: 2, kunjungan: 2 } })
    expect(data.online).toMatchObject({ pengunjung: 1, halaman: [{ kunci: '/tools', label: 'Semua kalkulator', kunjungan: 1 }] })
  })

  it('rincian negara, kota, sumber dari halaman masuk, perujuk, halaman berjudul, perangkat, dan peramban', async () => {
    const payload = await getTestPayload()
    const data = await ambilKunjungan(payload, () => rentang, sekarang)
    expect(data.negara[0]).toMatchObject({ kunci: 'ID', label: 'Indonesia', ikon: '🇮🇩', kunjungan: 5 })
    expect(data.negara.map((n) => n.label)).toEqual(['Indonesia', 'Malaysia', 'Tidak diketahui'])
    expect(data.kota.find((k) => k.label === 'Kuala Lumpur')).toMatchObject({ ket: 'Malaysia', kunjungan: 1 })
    // Pindah halaman (perujuk point.lat) bukan sumber: kanal dihitung dari 7 halaman masuk.
    expect(Object.fromEntries(data.kanal.map((k) => [k.kanal, k.kunjungan]))).toEqual({ langsung: 2, pencarian: 2, sosial: 2, rujukan: 1 })
    expect(data.kanal.reduce((a, k) => a + k.tayangan, 0)).toBe(7)
    expect(data.sumber.map((s) => [s.label, s.ket])).toEqual(
      expect.arrayContaining([
        ['Google', 'Mesin pencari'],
        ['Facebook', 'Media sosial'],
        ['Instagram', 'Media sosial'],
        ['kompas.com', 'Situs lain'],
      ]),
    )
    expect(data.perujuk.map((p) => p.label)).toEqual(expect.arrayContaining(['google.com', 'google.co.id', 'l.facebook.com', 'kompas.com']))
    expect(data.perujuk.map((p) => p.label)).not.toContain('point.lat')
    expect(data.halaman.find((h) => h.kunci === `/${pilarSlug}`)).toMatchObject({ label: 'Pilar Kunjungan', ket: `/${pilarSlug}`, tayangan: 2 })
    expect(data.halaman.find((h) => h.kunci === '/')).toMatchObject({ label: 'Beranda', ket: '/' })
    expect(data.masuk.find((h) => h.kunci === '/tools')).toMatchObject({ tayangan: 2 })
    expect(data.perangkat.map((p) => [p.label, p.kunjungan])).toEqual([
      ['HP', 6],
      ['Desktop', 1],
    ])
    expect(data.peramban.map((p) => p.label)).toEqual(['Chrome', 'Edge'])
    expect(data.rincianTerpotong).toBe(false)
  })

  it('rentang satu hari digambar per jam WIB; judul halaman untuk path dikenal', async () => {
    const payload = await getTestPayload()
    const data = await ambilKunjungan(payload, () => ({ jenis: 'kustom', dari: `${TAHUN}-03-07`, sampai: `${TAHUN}-03-07` }), sekarang)
    expect(data.seri).toHaveLength(24)
    expect(data.seri[8]).toMatchObject({ kunci: '08', tayangan: 2, kunjungan: 1 })
    expect(data.seri[9]).toMatchObject({ kunci: '09', tayangan: 1, kunjungan: 1 })
    const judul = await judulHalaman(payload, ['/', '/tools', '/cari', `/${pilarSlug}`, '/tidak-ada'])
    expect(Object.fromEntries(judul)).toMatchObject({ '/': 'Beranda', '/tools': 'Semua kalkulator', '/cari': 'Pencarian', [`/${pilarSlug}`]: 'Pilar Kunjungan' })
    expect(judul.has('/tidak-ada')).toBe(false)
  })

  it('CSV hanya untuk admin, berisi baris rentang yang diminta', async () => {
    const payload = await getTestPayload()
    const panggil = (user: unknown) =>
      endpointCsvKunjungan.handler({ payload, user, url: `http://localhost/api/kunjungan/csv?dari=${rentang.dari}&sampai=${rentang.sampai}`, headers: new Headers() } as unknown as PayloadRequest)
    expect((await panggil(null)).status).toBe(401)
    expect((await panggil({ id: 1, peran: 'editor' })).status).toBe(403)
    const jawab = await panggil({ id: 1, peran: 'admin' })
    expect(jawab.status).toBe(200)
    expect(jawab.headers.get('content-disposition')).toBe(`attachment; filename="kunjungan-point-${rentang.dari}-sampai-${rentang.sampai}.csv"`)
    const baris = (await jawab.text()).replace(/^﻿/, '').trim().split(/\r?\n/)
    expect(baris[0]).toBe('tanggal,halaman,negara,kota,kanal,sumber,perujuk,perangkat,peramban,tayangan,kunjungan')
    expect(baris.slice(1).every((b) => b.startsWith(`${TAHUN}-03-0`))).toBe(true)
    expect(baris.slice(1).reduce((a, b) => a + Number(b.split(',').at(-2)), 0)).toBe(8)
  })
})
