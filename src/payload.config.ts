import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { fileURLToPath } from 'url'

import { Artikel } from './collections/Artikel'
import { Media } from './collections/Media'
import { ParameterTools } from './collections/ParameterTools'
import { Pengguna } from './collections/Pengguna'
import { Penulis } from './collections/Penulis'
import { Pilar } from './collections/Pilar'
import { Subkategori } from './collections/Subkategori'
import { Tools } from './collections/Tools'
import { Video } from './collections/Video'

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
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL || '' },
  }),
  sharp,
  plugins: [],
})
