import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { AnalitikHalaman } from './collections/AnalitikHalaman'
import { AnalitikSitus } from './collections/AnalitikSitus'
import { AntreanIndexing } from './collections/AntreanIndexing'
import { Artikel } from './collections/Artikel'
import { Halaman } from './collections/Halaman'
import { Log404 } from './collections/Log404'
import { LogAi } from './collections/LogAi'
import { LogIndexing } from './collections/LogIndexing'
import { Media } from './collections/Media'
import { PemakaianAi } from './collections/PemakaianAi'
import { ParameterTools } from './collections/ParameterTools'
import { Pengguna } from './collections/Pengguna'
import { Penulis } from './collections/Penulis'
import { Pilar } from './collections/Pilar'
import { Redirect } from './collections/Redirect'
import { StatusIndeks } from './collections/StatusIndeks'
import { Subkategori } from './collections/Subkategori'
import { TautanLuar } from './collections/TautanLuar'
import { TemuanTautan } from './collections/TemuanTautan'
import { Tools } from './collections/Tools'
import { TugasSeo } from './collections/TugasSeo'
import { Video } from './collections/Video'
import { AsistenAi } from './globals/AsistenAi'
import { Beranda } from './globals/Beranda'
import { Footer } from './globals/Footer'
import { Header } from './globals/Header'
import { Newsletter } from './globals/Newsletter'
import { PengaturanSEO } from './globals/PengaturanSEO'
import { BAHASA_ADMIN } from './lib/bahasa-admin'
import { endpointJalankanJob } from './modules/indexer/endpoint'
import { klienMedia } from './modules/media'
import { mediaCloudinary } from './modules/media/plugin'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Pengguna.slug,
    // Avatar bawaan Payload memanggil Gravatar dengan hash email admin (pihak ketiga); ikon bawaan cukup.
    avatar: 'default',
    // Tanggal di admin seperti tulisan Indonesia (6 November 2026, 08.21), bukan bawaan "November ke-6 2026, 8:21 AM".
    dateFormat: 'd MMMM yyyy, HH.mm',
    importMap: { baseDir: path.resolve(dirname) },
    components: {
      // Dashboard SEO (spesifikasi §8) di /admin/seo, dengan tautan di atas menu admin.
      beforeNavLinks: ['@/modules/pantau/admin/TautanDashboard#TautanDashboard'],
      // Kartu di halaman awal admin, karena di layar laptop menu admin tertutup (keputusan pemilik 6B).
      beforeDashboard: ['@/modules/pantau/admin/KartuDashboard#KartuDashboard'],
      views: {
        dashboardSeo: {
          Component: '@/modules/pantau/admin/DashboardSeo#DashboardSeo',
          path: '/seo',
          exact: true,
          meta: { title: 'Dashboard SEO' },
        },
      },
    },
  },
  collections: [
    Pengguna,
    Media,
    Pilar,
    Subkategori,
    Penulis,
    Artikel,
    Tools,
    ParameterTools,
    Video,
    Halaman,
    Redirect,
    Log404,
    AntreanIndexing,
    LogIndexing,
    StatusIndeks,
    AnalitikHalaman,
    AnalitikSitus,
    TugasSeo,
    TemuanTautan,
    TautanLuar,
    LogAi,
    PemakaianAi,
  ],
  globals: [Header, Footer, Beranda, PengaturanSEO, Newsletter, AsistenAi],
  // `GET /api/jobs/run`: cron Vercel setiap 10 menit (vercel.json), jadwal terbit, Mesin Indexing, dan Pantau SEO.
  endpoints: [endpointJalankanJob],
  editor: lexicalEditor(),
  // Admin hanya berbahasa Indonesia (keputusan pemilik, Rencana 8A).
  i18n: BAHASA_ADMIN,
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
  }),
  sharp,
  plugins: [mediaCloudinary({ klien: klienMedia })],
})
