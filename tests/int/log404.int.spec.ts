import type { Payload, PayloadRequest } from 'payload'
import { describe, expect, it } from 'vitest'

import { endpointCatat404 } from '@/modules/konten/endpoint'
import { catat404, MAKS_ISIAN_404, MAKS_PATH_BARU_24_JAM } from '@/modules/konten/log404'

import { getTestPayload, unik } from './helpers'

async function baris(payload: Payload, path: string) {
  const { docs } = await payload.find({ collection: 'log-404', where: { path: { equals: path } }, depth: 0 })
  return docs.map((d) => ({ jumlah: d.jumlah, referer: d.referer ?? null }))
}

/** Path baru yang tercatat dalam 24 jam sampai `sekarang` (jendela batas path baru). */
async function pathBaru(payload: Payload, sekarang: Date) {
  const { totalDocs } = await payload.count({
    collection: 'log-404',
    where: { and: [{ createdAt: { greater_than: new Date(sekarang.getTime() - 86_400_000).toISOString() } }, { createdAt: { less_than_equal: sekarang.toISOString() } }] },
  })
  return totalDocs
}

async function kirim(isi: string, headers: Record<string, string> = {}) {
  const payload = await getTestPayload()
  const req = { payload, headers: new Headers(headers), text: async () => isi } as unknown as PayloadRequest
  return endpointCatat404.handler(req)
}

describe('beacon log 404: penjaga di aplikasi', () => {
  it(`path baru dibatasi ${MAKS_PATH_BARU_24_JAM} per 24 jam; kunjungan ke path yang sudah tercatat tetap dihitung`, async () => {
    const payload = await getTestPayload()
    const sekarang = new Date()
    const batas = (await pathBaru(payload, sekarang)) + 1
    const [lama, baru] = [`/${unik('lama')}`, `/${unik('baru')}`]

    expect(await catat404(payload, { path: lama, referer: null }, sekarang, batas)).toBe(true)
    expect(await catat404(payload, { path: baru, referer: null }, sekarang, batas)).toBe(false)
    expect(await catat404(payload, { path: lama, referer: 'https://www.google.com/' }, sekarang, batas)).toBe(true)
    expect(await baris(payload, baru)).toEqual([])
    expect(await baris(payload, lama)).toEqual([{ jumlah: 2, referer: 'https://www.google.com/' }])
    // Path yang tercatat lebih dari 24 jam lalu tidak dihitung batas.
    expect(await catat404(payload, { path: baru, referer: null }, new Date(sekarang.getTime() + 86_400_001), batas)).toBe(true)
  })

  it('kunjungan bersamaan ke path yang sama tidak saling menimpa hitungan dan tidak membuat dua baris', async () => {
    const payload = await getTestPayload()
    const path = `/${unik('bersamaan')}`
    const hasil = await Promise.all(Array.from({ length: 6 }, () => catat404(payload, { path, referer: null })))
    expect(hasil).toEqual(Array(6).fill(true))
    expect(await baris(payload, path)).toEqual([{ jumlah: 6, referer: null }])
  })

  it('endpoint: isian lebih dari 2 KB dan path tidak sah 400; kiriman dari situs lain diabaikan dengan 204 yang sama', async () => {
    const payload = await getTestPayload()
    const path = `/${unik('beacon')}`
    expect((await kirim(JSON.stringify({ path, referer: 'x'.repeat(MAKS_ISIAN_404) }))).status).toBe(400)
    expect((await kirim('{}', { 'content-length': String(MAKS_ISIAN_404 + 1) })).status).toBe(400)
    expect((await kirim('bukan json')).status).toBe(400)
    expect((await kirim(JSON.stringify({ path: '/api/rahasia' }))).status).toBe(400)

    const lintas = await kirim(JSON.stringify({ path }), { 'sec-fetch-site': 'cross-site' })
    expect(lintas.status).toBe(204)
    expect(await baris(payload, path)).toEqual([])

    const dicatat = await kirim(JSON.stringify({ path, referer: 'https://point.lat/tautan-lama' }), { 'sec-fetch-site': 'same-origin' })
    expect(dicatat.status).toBe(204)
    expect(await baris(payload, path)).toEqual([{ jumlah: 1, referer: 'https://point.lat/tautan-lama' }])
  })
})
