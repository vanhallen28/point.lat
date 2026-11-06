import type { Payload, PayloadRequest } from 'payload'
import { beforeEach, describe, expect, it } from 'vitest'

import { adapterPalsu, jalankanPantau, mintaPindai } from '@/modules/pantau'
import { endpointPindaiUlang } from '@/modules/pantau/endpoint'
import { klaimTugas } from '@/modules/pantau/tugas'

import { getTestPayload } from './helpers'

const T0 = new Date('2026-11-05T03:00:00.000Z')
const menit = (n: number) => new Date(T0.getTime() + n * 60_000)
const palsu = adapterPalsu()

async function kosongkan(payload: Payload) {
  await payload.delete({ collection: 'tugas-seo', where: { id: { exists: true } } })
  palsu.reset()
}

async function tugasTautan(payload: Payload) {
  const { docs } = await payload.find({ collection: 'tugas-seo', where: { jenis: { equals: 'tautan' } }, depth: 0 })
  return docs.map((d) => ({ status: d.status ?? null, mulai: d.mulai ?? null, berikutnya: d.berikutnya }))
}

async function panggil(user: unknown, headers: Record<string, string> = {}) {
  const payload = await getTestPayload()
  return endpointPindaiUlang.handler({ payload, headers: new Headers(headers), user } as unknown as PayloadRequest)
}

describe('"Pindai ulang sekarang" di dashboard SEO', () => {
  beforeEach(async () => {
    await kosongkan(await getTestPayload())
  })

  it('memajukan tugas pindai ke sekarang; cron atau after() menjalankannya sekali; lalu jeda 10 menit sejak mulai', async () => {
    const payload = await getTestPayload()
    // Pindai harian sudah berjalan tadi pagi: jadwal berikutnya besok.
    await payload.create({ collection: 'tugas-seo', data: { jenis: 'tautan', status: 'berhasil', mulai: menit(-120).toISOString(), selesai: menit(-119).toISOString(), berikutnya: '2026-11-05T08:00:00.000Z' } })

    expect(await mintaPindai(payload, { sekarang: T0 })).toEqual({ status: 'antre', diminta: T0.toISOString(), pesan: 'Pindai tautan dijalankan sekarang.' })
    expect(await tugasTautan(payload)).toEqual([{ status: 'berhasil', mulai: menit(-120).toISOString(), berikutnya: T0.toISOString() }])

    // Dua pelari bersamaan (dua klik, atau cron dan after()): tugas diklaim atomik, pindai hanya sekali.
    const [satu, dua] = await Promise.all([
      jalankanPantau(payload, { sekarang: T0, adapter: palsu, tugas: ['tautan'] }),
      jalankanPantau(payload, { sekarang: T0, adapter: palsu, tugas: ['tautan'] }),
    ])
    expect([satu.tautan?.status, dua.tautan?.status].filter(Boolean)).toEqual(['berhasil'])
    expect(await tugasTautan(payload)).toEqual([{ status: 'berhasil', mulai: T0.toISOString(), berikutnya: '2026-11-05T08:00:00.000Z' }])

    const jeda = await mintaPindai(payload, { sekarang: menit(5) })
    expect(jeda).toEqual({
      status: 'dibatasi',
      alasan: 'jeda',
      bolehLagi: menit(10).toISOString(),
      pesan: 'Pindai tautan baru saja dijalankan. Bisa dipindai lagi mulai 5 Nov 2026, 10.10 WIB.',
    })
    expect((await mintaPindai(payload, { sekarang: menit(10) })).status).toBe('antre')
  })

  it('tugas yang belum pernah berjalan langsung dijalankan; tugas yang sedang berjalan (sewa berlaku) ditolak', async () => {
    const payload = await getTestPayload()
    expect((await mintaPindai(payload, { sekarang: T0 })).status).toBe('antre')
    expect(await tugasTautan(payload)).toEqual([{ status: null, mulai: null, berikutnya: T0.toISOString() }])

    expect(await klaimTugas(payload, 'tautan', menit(20))).not.toBeNull()
    expect(await mintaPindai(payload, { sekarang: menit(31) })).toMatchObject({
      status: 'dibatasi',
      alasan: 'berjalan',
      pesan: 'Pindai tautan sedang berjalan. Hasilnya tampil di sini setelah selesai.',
    })
    // Sewa 15 menit habis (proses berhenti): boleh lagi.
    expect((await mintaPindai(payload, { sekarang: menit(36) })).status).toBe('antre')
  })

  it('endpoint POST /api/tugas-seo/pindai: hanya admin dari situs sendiri; 202 lalu 429', async () => {
    const admin = { id: 1, peran: 'admin', collection: 'pengguna' }
    expect((await panggil(null)).status).toBe(401)
    expect((await panggil({ ...admin, peran: 'editor' })).status).toBe(403)
    expect((await panggil(admin, { 'sec-fetch-site': 'same-site' })).status).toBe(403)
    const jawaban = await panggil(admin, { 'sec-fetch-site': 'same-origin' })
    expect(jawaban.status).toBe(202)
    expect(await jawaban.json()).toMatchObject({ status: 'antre', pesan: 'Pindai tautan dijalankan sekarang.' })
    // Belum dijalankan (di luar permintaan Next, after() tidak berjalan): tetap antre, tidak menolak.
    expect((await panggil(admin)).status).toBe(202)
    const payload = await getTestPayload()
    await jalankanPantau(payload, { adapter: palsu, tugas: ['tautan'] })
    const ditolak = await panggil(admin)
    expect(ditolak.status).toBe(429)
    expect(await ditolak.json()).toMatchObject({ status: 'dibatasi', alasan: 'jeda' })
  })
})
