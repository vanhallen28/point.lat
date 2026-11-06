import { describe, expect, it } from 'vitest'

import { BATAS_SAMBUNG_MS, databaseLokal, JEDA_IDLE_POOL_MS, MAKS_KONEKSI_POOL, opsiPool, pushSkema } from '@/lib/database'

/** Bentuk connection string Supabase dari dashboard (Connect), dengan nilai tiruan. */
const SUPABASE_TRANSAKSI = 'postgresql://postgres.abcdefghijklmnopqrst:kata-sandi-tiruan@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
const SUPABASE_SESI = 'postgresql://postgres.abcdefghijklmnopqrst:kata-sandi-tiruan@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres'
const LOKAL = 'postgres://postgres:postgres@127.0.0.1:5432/pointlat'
const CA = '-----BEGIN CERTIFICATE-----\nMIIDtiruan\n-----END CERTIFICATE-----'

describe('databaseLokal', () => {
  it('localhost, 127.0.0.1, ::1, soket Unix, dan URL kosong adalah database lokal', () => {
    for (const url of [
      LOKAL,
      'postgres://postgres:postgres@localhost:5432/pointlat_test?application_name=pointlat_test',
      'postgres://postgres@[::1]:5432/pointlat',
      'postgres:///pointlat?host=/var/run/postgresql',
      '',
      undefined,
    ]) {
      expect(databaseLokal(url), String(url)).toBe(true)
    }
  })

  it('host lain (pooler dan koneksi langsung Supabase, nama host jaringan) bukan lokal; URL rusak juga bukan lokal', () => {
    for (const url of [
      SUPABASE_TRANSAKSI,
      SUPABASE_SESI,
      'postgresql://postgres:kata-sandi-tiruan@db.abcdefghijklmnopqrst.supabase.co:5432/postgres',
      'postgres://postgres:postgres@db:5432/pointlat',
      'postgres:///pointlat?host=db.contoh.test',
      'bukan url',
    ]) {
      expect(databaseLokal(url), url).toBe(false)
    }
  })
})

describe('pushSkema', () => {
  it('push skema Payload hanya ke database lokal', () => {
    expect(pushSkema({ DATABASE_URL: LOKAL })).toBe(true)
    expect(pushSkema({})).toBe(true)
    expect(pushSkema({ DATABASE_URL: SUPABASE_TRANSAKSI })).toBe(false)
    expect(pushSkema({ DATABASE_URL: SUPABASE_SESI, NODE_ENV: 'development' })).toBe(false)
  })
})

describe('opsiPool', () => {
  it('database lokal memakai bawaan driver', () => {
    expect(opsiPool({ DATABASE_URL: LOKAL, DATABASE_CA: CA })).toEqual({ connectionString: LOKAL })
    expect(opsiPool({})).toEqual({ connectionString: '' })
  })

  it('database bersama: pool kecil, koneksi menganggur cepat ditutup, batas menunggu koneksi', () => {
    expect(opsiPool({ DATABASE_URL: SUPABASE_TRANSAKSI })).toEqual({
      connectionString: SUPABASE_TRANSAKSI,
      max: MAKS_KONEKSI_POOL,
      idleTimeoutMillis: JEDA_IDLE_POOL_MS,
      connectionTimeoutMillis: BATAS_SAMBUNG_MS,
    })
    expect([MAKS_KONEKSI_POOL, JEDA_IDLE_POOL_MS, BATAS_SAMBUNG_MS]).toEqual([5, 5_000, 10_000])
  })

  it('DATABASE_CA menyalakan TLS dengan verifikasi sertifikat; baris baru yang ditulis sebagai \\n dipulihkan', () => {
    expect(opsiPool({ DATABASE_URL: SUPABASE_TRANSAKSI, DATABASE_CA: CA }).ssl).toEqual({ ca: CA, rejectUnauthorized: true })
    expect(opsiPool({ DATABASE_URL: SUPABASE_TRANSAKSI, DATABASE_CA: CA.replace(/\n/g, '\\n') }).ssl).toEqual({ ca: CA, rejectUnauthorized: true })
    expect(opsiPool({ DATABASE_URL: SUPABASE_TRANSAKSI, DATABASE_CA: '  ' }).ssl).toBeUndefined()
  })
})
