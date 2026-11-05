import { defineConfig, devices } from '@playwright/test'
import { config as muatEnv } from 'dotenv'

/**
 * E2E memakai build produksi (`next build` + `next start`) supaya cache ISR, kode status, dan ukuran
 * JavaScript sama dengan produksi. Database: nama database tes ditambah `_e2e` (dibuat otomatis oleh
 * Payload), diisi ulang `tests/e2e/siapkan.ts` setiap kali server E2E dinyalakan. Cache data Next
 * (`.next/cache/fetch-cache`) dihapus sebelum build supaya data dari run sebelumnya tidak terbawa.
 */
muatEnv({ path: '.env.test' })

const PORT = 3100
const BASE_URL = `http://localhost:${PORT}`

function urlDatabaseE2E(): string {
  const url = new URL(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/pointlat_test')
  url.pathname = `${url.pathname}_e2e`
  return url.toString()
}

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm payload run tests/e2e/siapkan.ts && rm -rf .next/cache/fetch-cache && pnpm build && pnpm start',
    url: `${BASE_URL}/robots.txt`,
    reuseExistingServer: false,
    timeout: 600_000,
    env: {
      PORT: String(PORT),
      DATABASE_URL: urlDatabaseE2E(),
      PAYLOAD_SECRET: process.env.PAYLOAD_SECRET ?? '',
      NEXT_PUBLIC_SITE_URL: BASE_URL,
      // Kredensial palsu: memenuhi pengaman produksi modul media (Rencana 2) tanpa memanggil
      // Cloudinary. Server hanya membangun URL gambar; browser tes mencegat res.cloudinary.com.
      CLOUDINARY_CLOUD_NAME: 'e2e',
      CLOUDINARY_API_KEY: 'e2e',
      CLOUDINARY_API_SECRET: 'e2e',
      // Mesin Indexing tanpa jaringan: kabar dikirim ke adapter palsu dan tercatat di log dengan adapter `palsu`.
      INDEXER_ADAPTER: 'palsu',
      // Asisten AI tanpa jaringan: jawaban contoh dari adapter palsu, anggaran dan log tetap tercatat.
      AI_ADAPTER: 'palsu',
    },
  },
})
