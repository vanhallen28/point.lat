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
import { Kunjungan } from './collections/Kunjungan'
import { KunjunganHarian } from './collections/KunjunganHarian'
import { Log404 } from './collections/Log404'
import { LogAi } from './collections/LogAi'
import { LogIndexing } from './collections/LogIndexing'
import { Media } from './collections/Media'
import { PemakaianAi } from './collections/PemakaianAi'
import { ParameterTools } from './collections/ParameterTools'
import { PelangganNewsletter } from './collections/PelangganNewsletter'
import { Pengguna } from './collections/Pengguna'
import { Penulis } from './collections/Penulis'
import { PesanMasuk } from './collections/PesanMasuk'
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
import { Fitur } from './globals/Fitur'
import { Footer } from './globals/Footer'
import { Header } from './globals/Header'
import { Iklan } from './globals/Iklan'
import { KodeSematan } from './globals/KodeSematan'
import { Newsletter } from './globals/Newsletter'
import { PengaturanSEO } from './globals/PengaturanSEO'
import { BAHASA_ADMIN } from './lib/bahasa-admin'
import { opsiPool, pushSkema } from './lib/database'
import { endpointJalankanJob } from './modules/indexer/endpoint'
import { jagaDatabase, tolakEnvSalah } from './modules/lingkungan'
import { klienMedia } from './modules/media'
import { mediaCloudinary } from './modules/media/plugin'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Deploy Vercel dengan env yang salah berhenti di sini: sebelum migrasi, build, atau fungsi menyentuh database.
tolakEnvSalah()

export default buildConfig({
  admin: {
    user: Pengguna.slug,
    // Avatar bawaan Payload memanggil Gravatar dengan hash email admin (pihak ketiga); ikon bawaan cukup.
    avatar: 'default',
    // Tanggal di admin seperti tulisan Indonesia (6 November 2026, 08.21), bukan bawaan "November ke-6 2026, 8:21 AM".
    dateFormat: 'd MMMM yyyy, HH.mm',
    importMap: { baseDir: path.resolve(dirname) },
    components: {
      // Tema ruang redaksi (spesifikasi §23): logo point. di halaman masuk dan remah roti, logo terbalik dan grup
      // Ringkasan (Beranda admin, Dashboard SEO) di atas menu, kartu Sinkron Google dan pengguna di bawahnya.
      graphics: {
        Logo: '@/modules/redaksi/admin/Grafik#LogoAdmin',
        Icon: '@/modules/redaksi/admin/Grafik#IkonAdmin',
      },
      beforeNavLinks: ['@/modules/redaksi/admin/MenuRingkasan#MenuRingkasan'],
      afterNavLinks: ['@/modules/redaksi/admin/KakiMenu#KakiMenu'],
      views: {
        // Beranda admin menggantikan daftar koleksi bawaan: angka, kalender konten, status Google, perlu perhatian.
        dashboard: { Component: '@/modules/redaksi/admin/BerandaAdmin#BerandaAdmin' },
        // Dashboard SEO (spesifikasi §8) di /admin/seo.
        dashboardSeo: {
          Component: '@/modules/pantau/admin/DashboardSeo#DashboardSeo',
          path: '/seo',
          exact: true,
          meta: { title: 'Dashboard SEO' },
        },
      },
    },
  },
  // Urutan menentukan urutan grup menu admin: Konten, Pembaca, Tools, SEO, Pengaturan (koleksi), lalu grup yang
  // hanya berisi global (Tampilan).
  collections: [
    Artikel,
    Video,
    Halaman,
    Media,
    Pilar,
    Subkategori,
    Penulis,
    PesanMasuk,
    PelangganNewsletter,
    Tools,
    ParameterTools,
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
    Pengguna,
    LogAi,
    PemakaianAi,
    Kunjungan,
    KunjunganHarian,
  ],
  globals: [Beranda, Header, Footer, Newsletter, Iklan, PengaturanSEO, Fitur, KodeSematan, AsistenAi],
  // `GET /api/jobs/run`: cron Vercel (jadwal di vercel.json), jadwal terbit, Mesin Indexing, dan Pantau SEO.
  endpoints: [endpointJalankanJob],
  editor: lexicalEditor(),
  // Admin hanya berbahasa Indonesia (keputusan pemilik, Rencana 8A).
  i18n: BAHASA_ADMIN,
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  // Lokal dan tes: push skema ke Postgres sendiri. Supabase (produksi, pratinjau): hanya migrasi
  // (`src/migrations`, `npm run migrate`), lewat pooler mode transaksi dengan pool kecil (`src/lib/database.ts`).
  db: postgresAdapter({
    pool: opsiPool(),
    push: pushSkema(),
  }),
  // Deploy produksi dan pratinjau menandai databasenya; database milik lingkungan lain menghentikan proses.
  onInit: (payload) => jagaDatabase(payload),
  sharp,
  plugins: [mediaCloudinary({ klien: klienMedia })],
})
