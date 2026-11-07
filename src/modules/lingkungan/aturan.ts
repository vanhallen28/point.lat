import { databaseLokal } from '@/lib/database'

/**
 * Aturan env per lingkungan deploy Vercel (fungsi murni). Lingkungan dibaca dari `VERCEL_ENV`, yang diisi
 * Vercel saat build dan runtime: `production` (situs live) dan `preview` (deploy pratinjau setiap branch dan
 * pull request). Di luar Vercel (lokal, CI, E2E) dan di `development` (`vercel env pull`) tidak ada aturan
 * tambahan, karena data dan alamatnya tidak terbuka.
 */

type Env = Record<string, string | undefined>

export type JenisLingkungan = 'produksi' | 'pratinjau'

/** Nilai contoh di `.env.example` yang tidak boleh terbawa ke deploy (tes unit membandingkannya dengan file itu). */
export const CONTOH_ENV = {
  PAYLOAD_SECRET: 'ganti-dengan-string-acak-minimal-32-karakter',
  SEED_ADMIN_PASSWORD: 'ganti-password-ini',
} as const

export const MIN_PAYLOAD_SECRET = 32
export const MIN_CRON_SECRET = 16

const NAMA: Record<JenisLingkungan, string> = { produksi: 'Production', pratinjau: 'Preview' }

/** `produksi` atau `pratinjau` dari `VERCEL_ENV`; `null` di luar deploy Vercel. */
export function jenisLingkungan(env: Env = process.env): JenisLingkungan | null {
  if (env.VERCEL_ENV === 'production') return 'produksi'
  if (env.VERCEL_ENV === 'preview') return 'pratinjau'
  return null
}

/**
 * Lingkungan yang datanya nyata atau alamatnya terbuka: deploy produksi dan pratinjau, atau database bukan
 * lokal (juga `npm run seed` dari komputer pemilik ke Supabase). Aturan password admin berlaku di sini.
 */
export function lingkunganTerbuka(env: Env = process.env): boolean {
  return jenisLingkungan(env) !== null || !databaseLokal(env.DATABASE_URL)
}

/**
 * Daftar masalah env untuk deploy produksi dan pratinjau, kosong bila siap. Produksi wajib memilih adapter
 * (`asli` atau `palsu`) dan punya `CRON_SECRET`; pratinjau wajib adapter `palsu` dan tidak boleh memegang
 * kredensial Google atau kunci Claude (nilai yang tidak sengaja dicentang untuk semua lingkungan di Vercel).
 */
export function masalahLingkungan(env: Env = process.env): string[] {
  const jenis = jenisLingkungan(env)
  if (!jenis) return []
  const isi = (kunci: string) => env[kunci]?.trim() ?? ''
  const masalah: string[] = []

  const url = isi('DATABASE_URL')
  if (!url) masalah.push('DATABASE_URL belum diisi.')
  else if (databaseLokal(url)) masalah.push('DATABASE_URL menunjuk database lokal. Isi connection string pooler Supabase mode transaksi (port 6543).')
  else if (!isi('DATABASE_CA') && !/[?&]sslmode=/.test(url)) {
    masalah.push('Koneksi database belum terenkripsi. Isi DATABASE_CA dengan sertifikat CA dari Supabase (Database Settings, SSL Configuration).')
  }

  const secret = isi('PAYLOAD_SECRET')
  if (secret.length < MIN_PAYLOAD_SECRET || secret === CONTOH_ENV.PAYLOAD_SECRET) {
    masalah.push(`PAYLOAD_SECRET wajib string acak minimal ${MIN_PAYLOAD_SECRET} karakter, bukan contoh dari .env.example.`)
  }
  if (!isi('CLOUDINARY_CLOUD_NAME') || !isi('CLOUDINARY_API_KEY') || !isi('CLOUDINARY_API_SECRET')) {
    masalah.push('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET wajib diisi.')
  }

  if (jenis === 'produksi') {
    for (const kunci of ['INDEXER_ADAPTER', 'AI_ADAPTER']) {
      if (isi(kunci) !== 'asli' && isi(kunci) !== 'palsu') masalah.push(`${kunci} wajib diisi di Production: asli atau palsu.`)
    }
    if (isi('CRON_SECRET').length < MIN_CRON_SECRET) {
      masalah.push(`CRON_SECRET wajib string acak minimal ${MIN_CRON_SECRET} karakter (Vercel Cron mengirimnya sebagai Bearer).`)
    }
  } else {
    if (isi('INDEXER_ADAPTER') !== 'palsu') masalah.push('INDEXER_ADAPTER wajib palsu di Preview: deploy pratinjau tidak boleh mengabari Google dan IndexNow.')
    if (isi('AI_ADAPTER') !== 'palsu') masalah.push('AI_ADAPTER wajib palsu di Preview: deploy pratinjau tidak memakai kunci Claude.')
    for (const kunci of ['GOOGLE_SERVICE_ACCOUNT_JSON', 'ANTHROPIC_API_KEY']) {
      if (isi(kunci)) masalah.push(`${kunci} hanya untuk Production. Hapus centang Preview di Vercel (Settings, Environment Variables).`)
    }
  }
  return masalah
}

/** Nilai penanda database (`payload_kv`, kunci `KUNCI_PENANDA`): lingkungan pertama yang memakai database itu. */
export type Penanda = JenisLingkungan

export type KeputusanPenanda = { tulis: Penanda | null; tolak: string | null }

/**
 * Database produksi dan pratinjau ditandai oleh deploy pertama yang memakainya. Deploy pratinjau menolak
 * database bertanda produksi (dan sebaliknya), jadi DATABASE_URL yang tertukar menghentikan build sebelum
 * migrasi, bukan mengubah data produksi. Di luar Vercel penanda tidak dibaca dan tidak ditulis.
 */
export function keputusanPenanda(jenis: JenisLingkungan | null, penanda: string | null): KeputusanPenanda {
  if (!jenis) return { tulis: null, tolak: null }
  if (penanda === null) return { tulis: jenis, tolak: null }
  if (penanda === jenis) return { tulis: null, tolak: null }
  const milik = penanda === 'produksi' || penanda === 'pratinjau' ? NAMA[penanda] : `"${penanda}"`
  return {
    tulis: null,
    tolak: `Database ini milik ${milik}, tetapi deploy ini ${NAMA[jenis]}. Ganti DATABASE_URL di ${NAMA[jenis]} (Vercel, Settings, Environment Variables).`,
  }
}
