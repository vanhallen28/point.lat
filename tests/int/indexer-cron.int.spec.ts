import type { PayloadRequest } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { adapterPalsu, pakaiAdapterIndexer } from '@/modules/indexer'
import { endpointJalankanJob } from '@/modules/indexer/endpoint'

import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
import { getTestPayload } from './helpers'

const RAHASIA = 'rahasia-cron-tes-yang-cukup-panjang'
const palsu = adapterPalsu()

async function panggil(headers: Record<string, string>, user: PayloadRequest['user'] = null) {
  const payload = await getTestPayload()
  const req = { payload, headers: new Headers(headers), user } as unknown as PayloadRequest
  return endpointJalankanJob.handler(req)
}

describe('GET /api/jobs/run (Vercel Cron)', () => {
  beforeAll(() => {
    pakaiAdapterIndexer(palsu)
  })

  afterAll(() => {
    pakaiAdapterIndexer(null)
    delete process.env.CRON_SECRET
  })

  it('menolak tanpa CRON_SECRET yang cocok; menerima Bearer CRON_SECRET dan admin yang masuk', async () => {
    delete process.env.CRON_SECRET
    expect((await panggil({ authorization: 'Bearer ' })).status).toBe(401)
    process.env.CRON_SECRET = RAHASIA
    const ditolak = await panggil({ authorization: 'Bearer salah' })
    expect(ditolak.status).toBe(401)
    expect(await ditolak.json()).toEqual({ pesan: 'Butuh header Authorization: Bearer CRON_SECRET, atau masuk sebagai admin.' })
    expect((await panggil({ authorization: `Bearer ${RAHASIA}` })).status).toBe(200)
    expect((await panggil({}, { id: 1, peran: 'admin', collection: 'pengguna' } as unknown as PayloadRequest['user'])).status).toBe(200)
  })

  it('jadwal terbit artikel berjalan lewat cron, lalu artikelnya langsung dikabarkan', async () => {
    const payload = await getTestPayload()
    process.env.CRON_SECRET = RAHASIA
    // Antrean sisa tes lain dikosongkan supaya artikel ini masuk batas satu jalan.
    await payload.delete({ collection: 'antrean-indexing', where: { id: { exists: true } } })
    const relasi = await siapkanRelasiArtikel(payload)
    const draf = await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft' } })
    await payload.jobs.queue({
      task: 'schedulePublish',
      input: { type: 'publish', doc: { relationTo: 'artikel', value: draf.id } },
      waitUntil: new Date(Date.now() - 60_000),
    })
    palsu.reset()

    const jawaban = await panggil({ authorization: `Bearer ${RAHASIA}` })
    const hasil = await jawaban.json()
    expect(hasil.jadwalTerbit).toBeGreaterThanOrEqual(1)
    expect((await payload.findByID({ collection: 'artikel', id: draf.id }))._status).toBe('published')
    const url = `https://point.lat/${draf.slug}`
    const { docs } = await payload.find({ collection: 'log-indexing', where: { url: { equals: url } }, sort: ['waktu', 'id'] })
    expect(docs.map((d) => [d.langkah, d.status])).toEqual([
      ['revalidasi', 'berhasil'],
      ['indexnow', 'dilewati'],
    ])
    expect(palsu.panggilan.filter((p) => p.aksi === 'kirimIndexNow')).toEqual([])
  })
})
