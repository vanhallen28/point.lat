import { readFileSync } from 'fs'
import type { Payload } from 'payload'
import { describe, expect, it, vi } from 'vitest'

import {
  bacaPenanda,
  CONTOH_ENV,
  jagaDatabase,
  jenisLingkungan,
  keputusanPenanda,
  lingkunganTerbuka,
  masalahLingkungan,
  tolakEnvSalah,
} from '@/modules/lingkungan'

/** Env Production lengkap dengan nilai tiruan (bentuknya sama dengan yang diisi pemilik di Vercel). */
const PRODUKSI = {
  VERCEL_ENV: 'production',
  DATABASE_URL: 'postgresql://postgres.abcdefghijklmnopqrst:kata-sandi-tiruan@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  DATABASE_CA: '-----BEGIN CERTIFICATE-----\nMIIDtiruan\n-----END CERTIFICATE-----',
  PAYLOAD_SECRET: 'tiruan-0123456789abcdef0123456789abcdef',
  CLOUDINARY_CLOUD_NAME: 'tiruan',
  CLOUDINARY_API_KEY: '000000000000000',
  CLOUDINARY_API_SECRET: 'rahasia-cloudinary-tiruan',
  INDEXER_ADAPTER: 'asli',
  AI_ADAPTER: 'asli',
  CRON_SECRET: 'cron-tiruan-0123456789',
  GOOGLE_SERVICE_ACCOUNT_JSON: '{"client_email":"indexer@tiruan.iam.gserviceaccount.com"}',
  ANTHROPIC_API_KEY: 'kunci-claude-tiruan',
}

/** Env Preview: database pratinjau sendiri, adapter palsu, tanpa kredensial Google dan Claude. */
const PRATINJAU = {
  VERCEL_ENV: 'preview',
  DATABASE_URL: 'postgresql://postgres.zyxwvutsrqponmlkjihg:kata-sandi-tiruan@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  DATABASE_CA: PRODUKSI.DATABASE_CA,
  PAYLOAD_SECRET: 'tiruan-pratinjau-0123456789abcdef0123',
  CLOUDINARY_CLOUD_NAME: 'tiruan',
  CLOUDINARY_API_KEY: '000000000000000',
  CLOUDINARY_API_SECRET: 'rahasia-cloudinary-tiruan',
  INDEXER_ADAPTER: 'palsu',
  AI_ADAPTER: 'palsu',
}

describe('jenisLingkungan dan lingkunganTerbuka', () => {
  it('VERCEL_ENV production dan preview; di luar Vercel dan development null', () => {
    expect(jenisLingkungan({ VERCEL_ENV: 'production' })).toBe('produksi')
    expect(jenisLingkungan({ VERCEL_ENV: 'preview' })).toBe('pratinjau')
    expect(jenisLingkungan({ VERCEL_ENV: 'development' })).toBeNull()
    expect(jenisLingkungan({})).toBeNull()
  })

  it('terbuka: deploy Vercel atau database bukan lokal (skrip dari komputer pemilik ke Supabase)', () => {
    expect(lingkunganTerbuka({ VERCEL_ENV: 'preview', DATABASE_URL: 'postgres://postgres@127.0.0.1:5432/x' })).toBe(true)
    expect(lingkunganTerbuka({ DATABASE_URL: PRODUKSI.DATABASE_URL })).toBe(true)
    expect(lingkunganTerbuka({ DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/pointlat' })).toBe(false)
    expect(lingkunganTerbuka({})).toBe(false)
  })

  it('nilai contoh sama dengan .env.example', () => {
    const contoh = readFileSync('.env.example', 'utf8')
    expect(contoh).toContain(`PAYLOAD_SECRET=${CONTOH_ENV.PAYLOAD_SECRET}\n`)
    expect(contoh).toContain(`SEED_ADMIN_PASSWORD=${CONTOH_ENV.SEED_ADMIN_PASSWORD}\n`)
  })
})

describe('masalahLingkungan', () => {
  it('di luar deploy Vercel tidak ada aturan tambahan', () => {
    expect(masalahLingkungan({})).toEqual([])
    expect(masalahLingkungan({ VERCEL_ENV: 'development', INDEXER_ADAPTER: 'asli' })).toEqual([])
  })

  it('Production dan Preview yang lengkap lolos', () => {
    expect(masalahLingkungan(PRODUKSI)).toEqual([])
    expect(masalahLingkungan({ ...PRODUKSI, INDEXER_ADAPTER: 'palsu', AI_ADAPTER: 'palsu' })).toEqual([])
    expect(masalahLingkungan(PRATINJAU)).toEqual([])
  })

  it('Production tanpa env wajib', () => {
    expect(masalahLingkungan({ VERCEL_ENV: 'production' })).toEqual([
      'DATABASE_URL belum diisi.',
      'PAYLOAD_SECRET wajib string acak minimal 32 karakter, bukan contoh dari .env.example.',
      'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET wajib diisi.',
      'INDEXER_ADAPTER wajib diisi di Production: asli atau palsu.',
      'AI_ADAPTER wajib diisi di Production: asli atau palsu.',
      'CRON_SECRET wajib string acak minimal 16 karakter (Vercel Cron mengirimnya sebagai Bearer).',
    ])
  })

  it('database lokal, koneksi tanpa TLS, dan secret contoh ditolak; sslmode di URL menggantikan DATABASE_CA', () => {
    expect(masalahLingkungan({ ...PRODUKSI, DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/pointlat' })).toEqual([
      'DATABASE_URL menunjuk database lokal. Isi connection string pooler Supabase mode transaksi (port 6543).',
    ])
    expect(masalahLingkungan({ ...PRODUKSI, DATABASE_CA: '' })).toEqual([
      'Koneksi database belum terenkripsi. Isi DATABASE_CA dengan sertifikat CA dari Supabase (Database Settings, SSL Configuration).',
    ])
    expect(masalahLingkungan({ ...PRODUKSI, DATABASE_CA: '', DATABASE_URL: `${PRODUKSI.DATABASE_URL}?sslmode=no-verify` })).toEqual([])
    expect(masalahLingkungan({ ...PRODUKSI, PAYLOAD_SECRET: CONTOH_ENV.PAYLOAD_SECRET })).toHaveLength(1)
    expect(masalahLingkungan({ ...PRODUKSI, CRON_SECRET: 'pendek' })).toHaveLength(1)
  })

  it('Preview dengan adapter asli atau kredensial Production ditolak', () => {
    expect(
      masalahLingkungan({
        ...PRATINJAU,
        INDEXER_ADAPTER: 'asli',
        AI_ADAPTER: '',
        GOOGLE_SERVICE_ACCOUNT_JSON: PRODUKSI.GOOGLE_SERVICE_ACCOUNT_JSON,
        ANTHROPIC_API_KEY: PRODUKSI.ANTHROPIC_API_KEY,
      }),
    ).toEqual([
      'INDEXER_ADAPTER wajib palsu di Preview: deploy pratinjau tidak boleh mengabari Google dan IndexNow.',
      'AI_ADAPTER wajib palsu di Preview: deploy pratinjau tidak memakai kunci Claude.',
      'GOOGLE_SERVICE_ACCOUNT_JSON hanya untuk Production. Hapus centang Preview di Vercel (Settings, Environment Variables).',
      'ANTHROPIC_API_KEY hanya untuk Production. Hapus centang Preview di Vercel (Settings, Environment Variables).',
    ])
  })

  it('tolakEnvSalah melempar semua masalah sekaligus', () => {
    expect(() => tolakEnvSalah(PRODUKSI)).not.toThrow()
    expect(() => tolakEnvSalah({ ...PRATINJAU, AI_ADAPTER: 'asli', PAYLOAD_SECRET: '' })).toThrow(
      'Env deploy belum benar:\n- PAYLOAD_SECRET wajib string acak minimal 32 karakter, bukan contoh dari .env.example.\n- AI_ADAPTER wajib palsu di Preview: deploy pratinjau tidak memakai kunci Claude.',
    )
  })
})

describe('penanda database', () => {
  it('deploy pertama menandai; lingkungan yang sama lolos; lingkungan lain ditolak; di luar Vercel diabaikan', () => {
    expect(keputusanPenanda('produksi', null)).toEqual({ tulis: 'produksi', tolak: null })
    expect(keputusanPenanda('pratinjau', null)).toEqual({ tulis: 'pratinjau', tolak: null })
    expect(keputusanPenanda('produksi', 'produksi')).toEqual({ tulis: null, tolak: null })
    expect(keputusanPenanda('pratinjau', 'produksi')).toEqual({
      tulis: null,
      tolak: 'Database ini milik Production, tetapi deploy ini Preview. Ganti DATABASE_URL di Preview (Vercel, Settings, Environment Variables).',
    })
    expect(keputusanPenanda('produksi', 'pratinjau').tolak).toBe(
      'Database ini milik Preview, tetapi deploy ini Production. Ganti DATABASE_URL di Production (Vercel, Settings, Environment Variables).',
    )
    expect(keputusanPenanda('produksi', 'staging').tolak).toContain('Database ini milik "staging"')
    expect(keputusanPenanda(null, 'produksi')).toEqual({ tulis: null, tolak: null })
  })

  it('database tanpa tabel payload_kv (sebelum migrasi pertama) belum perlu dilindungi; galat lain diteruskan', async () => {
    const payloadDengan = (galat: unknown) => ({ db: { drizzle: { execute: async () => Promise.reject(galat) } } }) as unknown as Payload
    const tanpaTabel = Object.assign(new Error('Failed query'), { cause: Object.assign(new Error('relation "payload_kv" does not exist'), { code: '42P01' }) })
    await expect(bacaPenanda(payloadDengan(tanpaTabel))).resolves.toBeUndefined()
    await expect(bacaPenanda(payloadDengan(Object.assign(new Error('password authentication failed'), { code: '28P01' })))).rejects.toThrow(
      'password authentication failed',
    )
  })

  it('jagaDatabase menghentikan proses bila database milik lingkungan lain (onInit tidak dipanggil lagi setelah init gagal)', async () => {
    const execute = vi.fn(async () => ({ rows: [{ data: { lingkungan: 'produksi' } }] }))
    const fatal = vi.fn()
    const payload = { db: { drizzle: { execute } }, logger: { fatal } } as unknown as Payload
    const keluar = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    try {
      await jagaDatabase(payload, { VERCEL_ENV: 'preview' })
      expect(fatal).toHaveBeenCalledWith(
        'Database ini milik Production, tetapi deploy ini Preview. Ganti DATABASE_URL di Preview (Vercel, Settings, Environment Variables).',
      )
      expect(keluar).toHaveBeenCalledWith(1)
      keluar.mockClear()
      await jagaDatabase(payload, { VERCEL_ENV: 'production' })
      await jagaDatabase(payload, {})
      expect(keluar).not.toHaveBeenCalled()
      execute.mockRejectedValueOnce(new Error('connection terminated'))
      await expect(jagaDatabase(payload, { VERCEL_ENV: 'preview' })).rejects.toThrow('connection terminated')
      expect(keluar).not.toHaveBeenCalled()
    } finally {
      keluar.mockRestore()
    }
  })
})
