import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
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
