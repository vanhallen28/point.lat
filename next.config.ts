import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

import { HEADER_KEAMANAN } from './src/lib/header-keamanan'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  // Tanpa `X-Powered-By` (Next dan Payload): teknologi situs tidak diumumkan di setiap jawaban.
  poweredByHeader: false,
  // `next dev` 16.3 menambahkan blok aturan agen berbahasa Inggris ke CLAUDE.md di setiap jalan; CLAUDE.md proyek
  // ditulis sendiri, jadi dimatikan.
  agentRules: false,
  // Kartu sampul paket konten (`src/modules/paket/sampul`) dibaca dari disk oleh endpoint impor di API Payload.
  // Path yang dirangkai dari `process.cwd()` tidak dilacak otomatis, jadi folder itu dikemas ke fungsi API.
  outputFileTracingIncludes: {
    '/api/[...slug]': ['./src/modules/paket/sampul/*.png'],
  },
  // Header keamanan di semua jawaban (`src/lib/header-keamanan.ts`). Lewat konfigurasi, bukan dibaca atau
  // ditulis saat render, jadi halaman publik tetap ISR.
  async headers() {
    return [{ source: '/:path*', headers: HEADER_KEAMANAN }]
  },
  images: {
    // Semua gambar dikirim Cloudinary (f_auto,q_auto, lebar srcset lewat c_limit). Next tidak
    // mengoptimasi ulang, jadi tidak ada /_next/image dan tidak ada biaya Image Optimization Vercel.
    loader: 'custom',
    loaderFile: './src/modules/media/loader.ts',
  },
  // File kunci IndexNow `/{kunci}.txt` di akar situs (spesifikasi §7). Pola kunci sama dengan
  // `POLA_KUNCI_INDEXNOW` (8 sampai 128 karakter), jadi `/robots.txt` tidak ikut tertulis ulang.
  async rewrites() {
    return [{ source: '/:kunci([A-Za-z0-9-]{8,128})\\.txt', destination: '/kunci-indexnow/:kunci' }]
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
