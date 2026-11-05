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
import { LogIndexing } from './collections/LogIndexing'
import { Media } from './collections/Media'
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
import { Beranda } from './globals/Beranda'
import { Footer } from './globals/Footer'
import { Header } from './globals/Header'
import { Newsletter } from './globals/Newsletter'
import { PengaturanSEO } from './globals/PengaturanSEO'
import { endpointJalankanJob } from './modules/indexer/endpoint'
import { klienMedia } from './modules/media'
import { mediaCloudinary } from './modules/media/plugin'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Pengguna.slug,
    importMap: { baseDir: path.resolve(dirname) },
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
  ],
  globals: [Header, Footer, Beranda, PengaturanSEO, Newsletter],
  // `GET /api/jobs/run`: cron Vercel setiap 10 menit (vercel.json), jadwal terbit, Mesin Indexing, dan Pantau SEO.
  endpoints: [endpointJalankanJob],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
  }),
  sharp,
  plugins: [mediaCloudinary({ klien: klienMedia })],
})
