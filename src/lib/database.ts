/**
 * Koneksi Postgres untuk adapter Payload (`postgresAdapter` di `payload.config.ts`). Lokal, tes, E2E, dan CI
 * memakai Postgres di mesin sendiri dengan push skema Payload; database bersama (Supabase produksi dan
 * pratinjau) hanya diubah lewat migrasi (`pnpm migrate`) dan dihubungi lewat pooler Supavisor mode transaksi.
 */

type Env = Record<string, string | undefined>

/** Koneksi per instance fungsi Vercel. Fluid compute berbagi satu pool untuk permintaan bersamaan di instance yang sama. */
export const MAKS_KONEKSI_POOL = 5

/** Koneksi menganggur ditutup cepat supaya instance yang ditangguhkan tidak menahan klien pooler. */
export const JEDA_IDLE_POOL_MS = 5_000

/** Batas menunggu koneksi, supaya fungsi tidak menggantung sampai batas durasinya saat pooler penuh. */
export const BATAS_SAMBUNG_MS = 10_000

const HOST_LOKAL = new Set(['', 'localhost', '127.0.0.1', '[::1]'])

/**
 * Database di mesin sendiri (dev, tes, E2E, service Postgres CI): host `localhost`, `127.0.0.1`, `::1`, atau
 * soket Unix. Tanpa URL juga dianggap lokal (driver memakai `localhost`). URL yang tidak bisa dibaca dianggap
 * bukan lokal, jadi aturan yang lebih ketat yang berlaku.
 */
export function databaseLokal(url: string | undefined): boolean {
  if (!url) return true
  try {
    const { hostname, searchParams } = new URL(url)
    const soket = searchParams.get('host')
    if (hostname === '') return !soket || soket.startsWith('/')
    return HOST_LOKAL.has(hostname)
  } catch {
    return false
  }
}

/**
 * Push skema Payload (Drizzle) hanya ke database lokal. Database bersama tidak pernah didorong, juga saat
 * `pnpm seed` atau skrip `payload run` dijalankan dari komputer dengan `DATABASE_URL` Supabase (tanpa
 * `NODE_ENV=production`, Payload mendorong skema bila opsi ini tidak dimatikan).
 */
export function pushSkema(env: Env = process.env): boolean {
  return databaseLokal(env.DATABASE_URL)
}

export type OpsiPool = {
  connectionString: string
  max?: number
  idleTimeoutMillis?: number
  connectionTimeoutMillis?: number
  ssl?: { ca: string; rejectUnauthorized: true }
}

/**
 * Opsi pool `pg` untuk `postgresAdapter`. Database lokal memakai bawaan driver. Database bersama: pool kecil
 * (`MAKS_KONEKSI_POOL`), koneksi menganggur ditutup setelah `JEDA_IDLE_POOL_MS`, dan bila `DATABASE_CA`
 * (sertifikat CA Supabase, PEM) diisi, TLS dengan verifikasi sertifikat dan nama host. Statement `pg` tanpa
 * nama, jadi mode transaksi Supavisor (tanpa prepared statement bernama) tidak perlu opsi tambahan.
 */
export function opsiPool(env: Env = process.env): OpsiPool {
  const connectionString = env.DATABASE_URL ?? ''
  if (databaseLokal(connectionString)) return { connectionString }
  const ca = env.DATABASE_CA?.replace(/\\n/g, '\n').trim()
  return {
    connectionString,
    max: MAKS_KONEKSI_POOL,
    idleTimeoutMillis: JEDA_IDLE_POOL_MS,
    connectionTimeoutMillis: BATAS_SAMBUNG_MS,
    ...(ca ? { ssl: { ca, rejectUnauthorized: true as const } } : {}),
  }
}
