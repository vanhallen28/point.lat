import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { bacaPenanda, KUNCI_PENANDA, periksaDatabase, tulisPenanda } from '@/modules/lingkungan'

import { getTestPayload } from './helpers'

let payload: Payload

const PRODUKSI = { VERCEL_ENV: 'production' }
const PRATINJAU = { VERCEL_ENV: 'preview' }

beforeAll(async () => {
  payload = await getTestPayload()
})

// Penanda milik tes ini saja: tes lain dan server lokal tidak membacanya (di luar Vercel penanda diabaikan).
beforeEach(async () => {
  await payload.db.drizzle.execute(sql`delete from payload_kv where key = ${KUNCI_PENANDA}`)
})

describe('penanda lingkungan database', () => {
  it('di luar deploy Vercel penanda tidak dibaca dan tidak ditulis', async () => {
    await periksaDatabase(payload, {})
    await periksaDatabase(payload, { VERCEL_ENV: 'development' })
    expect(await bacaPenanda(payload)).toBeNull()
  })

  it('deploy produksi pertama menandai database, deploy produksi berikutnya lolos', async () => {
    await periksaDatabase(payload, PRODUKSI)
    expect(await bacaPenanda(payload)).toBe('produksi')
    await expect(periksaDatabase(payload, PRODUKSI)).resolves.toBeUndefined()
    expect(await payload.kv.get(KUNCI_PENANDA)).toMatchObject({ lingkungan: 'produksi' })
  })

  it('deploy pratinjau menolak database produksi, deploy produksi menolak database pratinjau', async () => {
    await tulisPenanda(payload, 'produksi')
    await expect(periksaDatabase(payload, PRATINJAU)).rejects.toThrow(
      'Database ini milik Production, tetapi deploy ini Preview. Ganti DATABASE_URL di Preview (Vercel, Settings, Environment Variables).',
    )
    await payload.db.drizzle.execute(sql`delete from payload_kv where key = ${KUNCI_PENANDA}`)
    await periksaDatabase(payload, PRATINJAU)
    await expect(periksaDatabase(payload, PRODUKSI)).rejects.toThrow('Database ini milik Preview, tetapi deploy ini Production.')
  })

  it('worker build yang berjalan bersamaan menulis satu penanda, dan penanda tidak pernah ditimpa', async () => {
    await Promise.all(Array.from({ length: 6 }, () => periksaDatabase(payload, PRODUKSI)))
    const { rows } = await payload.db.drizzle.execute(sql`select count(*)::int as jumlah from payload_kv where key = ${KUNCI_PENANDA}`)
    expect(rows[0]).toEqual({ jumlah: 1 })
    await tulisPenanda(payload, 'pratinjau')
    expect(await bacaPenanda(payload)).toBe('produksi')
  })
})
