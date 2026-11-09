# Rencana 1: Fondasi & Model Konten point.lat

> **Catatan revisi 9 November 2026 (v1.1.0, keputusan pemilik).** Rencana ini sudah selesai dieksekusi; teksnya disesuaikan supaya tidak bertentangan dengan keputusan terbaru:
> 1. Hosting **Vercel paket gratis (Hobby)**: cron Vercel sekali sehari, jadwal 10 menit opsional lewat Supabase Cron (runbook rilis H5), Pro hanya saat iklan dinyalakan.
> 2. **Full Next.js dengan perintah npm**: semua perintah `pnpm` diganti padanan npm (`npm run <skrip>`, `npm run <skrip> -- <argumen>`, `npx`, `npm install`, `npm ci`), `pnpm-lock.yaml` menjadi `package-lock.json`. Potongan `package.json` lama yang masih memuat pengaturan khusus pnpm (`onlyBuiltDependencies`) adalah catatan sejarah; versi sekarang memakai `allowScripts`.
> 3. **Setiap pembaruan dikirim sebagai zip + perintah terminal** (spesifikasi §21).
> 4. **Tanpa Docker, hanya Next.js, Vercel, dan Supabase**: `docker-compose.yml`, `Dockerfile`, dan `docker/` dihapus di v1.1.0. Langkah yang dulu membuat file itu dibiarkan sebagai sejarah. Tes memakai Postgres di mesin itu sendiri (Postgres bawaan runner GitHub di CI, Postgres sistem di sesi Claude); komputer pemilik memakai proyek Supabase pratinjau.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun aplikasi Next.js + Payload CMS 3 dengan seluruh model konten point.lat (koleksi, global, validasi, slug, redirect otomatis, data awal) yang bisa dijalankan, diedit di `/admin`, dan diuji.

**Architecture:** Satu aplikasi Next.js App Router yang menjalankan Payload 3 (admin di `/admin`, API di `/api`). Database PostgreSQL (lokal, produksi Supabase; Docker dihapus di v1.1.0). Logika bisnis berupa fungsi murni di `src/lib/` dan `src/hooks/` yang diuji unit; config Payload di `src/collections/`, `src/globals/`, `src/blocks/`, `src/fields/` hanya merangkai. Tes integrasi menyalakan Payload sungguhan terhadap database `pointlat_test`.

**Tech Stack:** Next.js 16.3.3, Payload 3.92.1 (`@payloadcms/db-postgres`, `@payloadcms/richtext-lexical`), React 19.2, TypeScript 5.7, Vitest 4, PostgreSQL 17 (lokal; Docker dihapus di v1.1.0), npm 11, Node 22.23.4+.

**Spesifikasi:** `docs/superpowers/specs/2026-11-03-point-lat-design.md` (§2, §3, §6, §7 dicakup rencana ini).

## Global Constraints

- Node `^22.23.4 || >=24.22.1`, npm 11. Versi Payload dikunci `3.92.1`, Next `16.3.3` (bawaan template).
- Nama domain berbahasa Indonesia, sama dengan spesifikasi: slug koleksi `pengguna`, `media`, `pilar`, `subkategori`, `penulis`, `artikel`, `tools`, `parameter-tools`, `video`, `halaman`, `redirect`, `log-404`; global `header`, `footer`, `beranda`, `pengaturan-seo`, `newsletter`.
- Tipe artikel: `panduan`, `explainer`, `daftar`, `glosarium`. Warna pilar: `hijau` #1F7A4D, `oranye` #C2410C, `kuning` #F2C230, `koral` #FF8A80. Tool ID: `gaji-bersih`, `thr`, `cicilan-kpr`, `dana-darurat`, `bmi-kalori`, `ipk`.
- URL: artikel `/{slug}`, glosarium `/glosarium/{slug}`, pilar `/{slug}`, subkategori `/{pilar}/{slug}`, tools `/tools/{slug}`, video `/video/{slug}`, penulis `/penulis/{slug}`, halaman `/{slug}`. Selalu lewat `pathFor()`.
- Kotak Intinya 2-4 poin, maks 220 karakter per poin. Gambar utama artikel minimal 1200px lebarnya. Alt wajib untuk gambar.
- Copy UI dan pesan validasi: bahasa Indonesia, sapaan "kamu" untuk pembaca, tanpa em dash dan en dash, tanpa tanda seru.
- **Perubahan skema harus aditif.** Payload mendorong skema ke database dev/tes secara otomatis dan **berhenti menunggu jawaban** bila mendeteksi rename atau penghapusan kolom/tabel (terlihat macet di "Pulling schema from database..."). Bila itu terjadi, reset database yang bersangkutan:
  `PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -c "DROP DATABASE pointlat_test WITH (FORCE)" -c "CREATE DATABASE pointlat_test"` (ganti `pointlat_test` dengan `pointlat` untuk database dev).
- Setiap kali field koleksi/global berubah: `npm run generate:types`, lalu `npm run typecheck`. Setiap kali menambah fitur Lexical (BlocksFeature): `npm run generate:importmap`.
- Tes integrasi butuh Postgres lokal jalan (Postgres sistem, tanpa Docker) dan memakai `.env.test` (database `pointlat_test`).

## Peta rencana point.lat

Spesifikasi dipecah menjadi 8 rencana. Masing-masing menghasilkan perangkat lunak yang berjalan dan teruji, ditulis tepat sebelum dikerjakan supaya mengikuti kode yang benar-benar ada.

| # | Rencana | Isi | Bergantung pada |
|---|---|---|---|
| **1** | **Fondasi & model konten (dokumen ini)** | proyek, koleksi, global, validasi, slug, redirect otomatis, seed | - |
| 2 | Media Cloudinary | adapter `media`, signed upload langsung dari browser, preset, loader gambar Next.js, OG image | 1 |
| 3 | Modul SEO inti | `seo.metadata`, `seo.jsonLd`, `seo.analisis`, sitemap, news sitemap, robots, RSS, panel SEO di editor | 1, 2 |
| 4 | Frontend publik & design system | token Kartu Intinya, Archivo, layout, beranda, rubrik, artikel, tools, glosarium, video, penulis, cari, 404 + log, motion, e2e | 1-3 |
| 5 | Modul `hitung` & 6 tools | rumus murni + parameter bertanggal (diverifikasi ke DJP/BPJS), UI kalkulator | 1, 4 |
| 6 | Mesin Indexing & dashboard SEO | `indexer.kabari`, Search Console, IndexNow, URL Inspection, log, Vercel Cron, dashboard | 1, 3 |
| 7 | Asisten AI | brief, draf per bagian, meta, cek pola AI, cek klaim, anggaran, checklist review | 1, 3 |
| 8 | Iklan, privasi, performa & rilis | `SlotIklan`, banner persetujuan UU PDP, `ads.txt`, Lighthouse CI, design-audit, deploy Vercel + Supabase | 1-7 |

## Struktur file setelah rencana ini

```
CLAUDE.md                         aturan proyek untuk agen
docker-compose.yml                Postgres 17 + database tes
docker/init-test-db.sql
.env.example  .env.test
vitest.unit.config.mts            tes unit (tests/unit/*.test.ts)
vitest.int.config.mts             tes integrasi (tests/int/*.int.spec.ts)
eslint.config.mjs                 flat config native eslint-config-next
src/payload.config.ts             merangkai koleksi & global
src/lib/                          fungsi murni: slug, paths, konstanta, validasi, media, lexical, redirect, seo-dasar
src/access/index.ts               aturan akses
src/hooks/                        tetapkanPeranAwal, catatTanggalArtikel, slugTingkatAtas, redirectSaatPathBerubah
src/fields/                       slug, seo, konten (faq, sumber)
src/blocks/                       artikel, halaman, beranda
src/collections/                  12 koleksi
src/globals/                      5 global
src/seed/                         seed.ts (fungsi), run.ts (CLI)
src/app/(frontend)/               halaman sementara
tests/unit/  tests/int/           tes
```

---

### Task 1: Kerangka proyek

**Files:**
- Create (dari template): seluruh isi template `blank` Payload di root repo
- Create: `vitest.unit.config.mts`, `vitest.int.config.mts`, `tests/int/setup.ts`, `tests/int/helpers.ts`, `.env.test`, `docker/init-test-db.sql`, `CLAUDE.md`, `src/collections/Pengguna.ts`
- Modify: `package.json`, `.env.example`, `docker-compose.yml`, `eslint.config.mjs`, `src/payload.config.ts`, `src/app/(frontend)/layout.tsx`, `src/app/(frontend)/page.tsx`, `src/app/(frontend)/styles.css`
- Delete: `src/app/my-route/`, `tests/e2e/`, `tests/helpers/`, `tests/int/api.int.spec.ts`, `vitest.config.mts`, `vitest.setup.ts`, `src/collections/Users.ts`
- Test: `tests/int/smoke.int.spec.ts`

**Interfaces:**
- Produces: `getTestPayload(): Promise<Payload>` dan `unik(prefix: string): string` di `tests/int/helpers.ts`; koleksi auth `pengguna` (field `nama`); skrip `npm run test:unit`, `npm run test:int`, `npm run typecheck`, `npm run seed`.

Catatan: koleksi auth langsung bernama `pengguna` di task ini. Mengganti nama `users` belakangan membuat Payload bertanya interaktif soal rename tabel dan prosesnya macet.

- [ ] **Langkah 1: Buat template Payload di folder sementara lalu salin ke repo**

  Jalankan:

  ```bash
  REPO="$(pwd)"   # jalankan dari root repo point-lat (folder yang berisi docs/)
  rm -rf /tmp/point-lat-scaffold && mkdir /tmp/point-lat-scaffold && cd /tmp/point-lat-scaffold
  CI=1 npx -y create-payload-app@3.92.1 -n point-lat -t blank --db postgres \
    --db-connection-string "postgres://postgres:postgres@127.0.0.1:5432/pointlat" \
    --no-deps --no-agent --use-npm
  cd point-lat && rm -rf .git .env && cp -a . "$REPO/" && cd "$REPO"
  ls
  ```

  Hasil yang diharapkan: terlihat `package.json`, `src/`, `tests/`, `docs/` (docs tetap ada), `docker-compose.yml`.


- [ ] **Langkah 2: Hapus bagian template yang tidak dipakai**

  Jalankan:

  ```bash
  rm -rf src/app/my-route tests/e2e tests/helpers tests/int/api.int.spec.ts vitest.config.mts vitest.setup.ts src/collections/Users.ts
  mkdir -p docker tests/unit
  ```

  Hasil yang diharapkan: tidak ada output.


- [ ] **Langkah 3: Atur nama dan skrip di `package.json`**

  Jalankan:

  ```bash
  node -e '
  const fs = require("fs")
  const p = JSON.parse(fs.readFileSync("package.json", "utf8"))
  p.name = "point-lat"
  p.description = "point.lat: media edukasi praktis"
  p.scripts.test = "npm run test:unit && npm run test:int"
  p.scripts["test:unit"] = "vitest run --config ./vitest.unit.config.mts"
  p.scripts["test:int"] = "cross-env NODE_OPTIONS=--no-deprecation vitest run --config ./vitest.int.config.mts"
  p.scripts.typecheck = "tsc --noEmit"
  p.scripts.seed = "cross-env NODE_OPTIONS=--no-deprecation payload run src/seed/run.ts"
  delete p.scripts["test:e2e"]
  fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n")
  '
  grep -n '"test\|typecheck\|seed' package.json
  ```

  Hasil yang diharapkan: lima baris skrip: `test`, `test:int`, `test:unit`, `typecheck`, `seed`. Skrip `test:e2e` sudah hilang (Playwright dipakai mulai Rencana 4).


- [ ] **Langkah 4: Tulis konfigurasi Vitest, env, dan Docker**

  `vitest.unit.config.mts`

  ```js
  import tsconfigPaths from 'vite-tsconfig-paths'
  import { defineConfig } from 'vitest/config'

  export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
      environment: 'node',
      include: ['tests/unit/**/*.test.ts'],
    },
  })
  ```

  `vitest.int.config.mts`

  ```js
  import tsconfigPaths from 'vite-tsconfig-paths'
  import { defineConfig } from 'vitest/config'

  export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
      environment: 'node',
      include: ['tests/int/**/*.int.spec.ts'],
      setupFiles: ['./tests/int/setup.ts'],
      fileParallelism: false,
      testTimeout: 60_000,
      hookTimeout: 120_000,
    },
  })
  ```

  `tests/int/setup.ts`

  ```ts
  import { config } from 'dotenv'

  // Tes integrasi selalu memakai database tes, tidak pernah database dev.
  config({ path: '.env.test', override: true })
  ```

  `.env.test`

  ```text
  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pointlat_test
  PAYLOAD_SECRET=rahasia-khusus-tes-jangan-dipakai-di-produksi
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  ```

  `.env.example`

  ```text
  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pointlat
  PAYLOAD_SECRET=ganti-dengan-string-acak-minimal-32-karakter
  NEXT_PUBLIC_SITE_URL=http://localhost:3000
  SEED_ADMIN_EMAIL=admin@point.lat
  SEED_ADMIN_PASSWORD=ganti-password-ini
  ```

  `docker-compose.yml`

  ```yaml
  services:
    postgres:
      image: postgres:17
      restart: unless-stopped
      environment:
        POSTGRES_USER: postgres
        POSTGRES_PASSWORD: postgres
        POSTGRES_DB: pointlat
      ports:
        - '5432:5432'
      volumes:
        - pgdata:/var/lib/postgresql/data
        - ./docker/init-test-db.sql:/docker-entrypoint-initdb.d/init-test-db.sql:ro

  volumes:
    pgdata:
  ```

  `docker/init-test-db.sql`

  ```sql
  CREATE DATABASE pointlat_test;
  ```


- [ ] **Langkah 5: Ganti `eslint.config.mjs` dengan flat config native**

  Konfigurasi bawaan template memakai `FlatCompat` dari `@eslint/eslintrc` yang tidak terpasang dan tidak cocok dengan `eslint-config-next` 16.

  `eslint.config.mjs`

  ```js
  import nextVitals from 'eslint-config-next/core-web-vitals'
  import nextTs from 'eslint-config-next/typescript'

  const eslintConfig = [
    ...nextVitals,
    ...nextTs,
    {
      rules: {
        '@typescript-eslint/ban-ts-comment': 'warn',
        '@typescript-eslint/no-empty-object-type': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-unused-vars': [
          'warn',
          {
            vars: 'all',
            args: 'after-used',
            ignoreRestSiblings: false,
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            destructuredArrayIgnorePattern: '^_',
            caughtErrorsIgnorePattern: '^(_|ignore)',
          },
        ],
      },
    },
    {
      ignores: [
        '.next/',
        'media/',
        'src/payload-types.ts',
        'src/payload-generated-schema.ts',
        'src/app/(payload)/admin/importMap.js',
      ],
    },
  ]

  export default eslintConfig
  ```


- [ ] **Langkah 6: Buat koleksi `pengguna` versi awal dan rangkai config**

  `src/collections/Pengguna.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  /** Versi awal. Peran dan akses ditambahkan di Task 3. */
  export const Pengguna: CollectionConfig = {
    slug: 'pengguna',
    labels: { singular: 'Pengguna', plural: 'Pengguna' },
    auth: true,
    admin: { useAsTitle: 'email', group: 'Pengaturan' },
    fields: [{ name: 'nama', type: 'text', required: true }],
  }
  ```

  `src/payload.config.ts`

  ```ts
  import { postgresAdapter } from '@payloadcms/db-postgres'
  import { lexicalEditor } from '@payloadcms/richtext-lexical'
  import path from 'path'
  import { buildConfig } from 'payload'
  import sharp from 'sharp'
  import { fileURLToPath } from 'url'

  import { Media } from './collections/Media'
  import { Pengguna } from './collections/Pengguna'

  const filename = fileURLToPath(import.meta.url)
  const dirname = path.dirname(filename)

  export default buildConfig({
    admin: {
      user: Pengguna.slug,
      importMap: { baseDir: path.resolve(dirname) },
    },
    collections: [Pengguna, Media],
    editor: lexicalEditor(),
    secret: process.env.PAYLOAD_SECRET || '',
    typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
    db: postgresAdapter({
      pool: { connectionString: process.env.DATABASE_URL || '' },
    }),
    sharp,
    plugins: [],
  })
  ```


- [ ] **Langkah 7: Ganti halaman frontend template dengan halaman sementara**

  `src/app/(frontend)/layout.tsx`

  ```ts
  import type { Metadata } from 'next'
  import React from 'react'

  import './styles.css'

  export const metadata: Metadata = {
    title: 'point.',
    description: 'Intinya dulu.',
  }

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="id">
        <body>
          <main>{children}</main>
        </body>
      </html>
    )
  }
  ```

  `src/app/(frontend)/page.tsx`

  ```ts
  export default function BerandaSementara() {
    return (
      <section className="sementara">
        <h1>point.</h1>
        <p>Intinya dulu. Situs sedang dibangun.</p>
      </section>
    )
  }
  ```

  `src/app/(frontend)/styles.css`

  ```css
  body {
    margin: 0;
    background: #ffffff;
    color: #111111;
    font-family: system-ui, sans-serif;
  }

  .sementara {
    max-width: 1200px;
    margin: 0 auto;
    padding: 64px clamp(16px, 4vw, 40px);
  }

  .sementara h1 {
    margin: 0;
    font-size: clamp(56px, 12vw, 160px);
    font-weight: 900;
    letter-spacing: -0.03em;
  }
  ```


- [ ] **Langkah 8: Tulis helper tes dan tes asap**

  `tests/int/helpers.ts`

  ```ts
  import config from '@payload-config'
  import { getPayload, type Payload } from 'payload'

  let cached: Payload | undefined

  export async function getTestPayload(): Promise<Payload> {
    if (!cached) {
      cached = await getPayload({ config: await config })
    }
    return cached
  }

  /** Akhiran unik supaya data antar-run tidak bentrok di database tes. */
  export function unik(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  }
  ```

  `tests/int/smoke.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { getTestPayload } from './helpers'

  describe('fondasi', () => {
    it('Payload menyala dan terhubung ke database tes', async () => {
      const payload = await getTestPayload()
      expect(process.env.DATABASE_URL).toContain('pointlat_test')
      const hasil = await payload.find({ collection: 'pengguna', limit: 1 })
      expect(hasil.totalDocs).toBeGreaterThanOrEqual(0)
    })
  })
  ```


- [ ] **Langkah 9: Tulis `CLAUDE.md`**

  `CLAUDE.md`

  ```markdown
  # Proyek: point.lat

  Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/2026-11-03-point-lat-design.md`. Rencana: `docs/superpowers/plans/`.

  ## Tech stack
  - Next.js 16 (App Router) + Payload CMS 3.92 dalam satu aplikasi
  - PostgreSQL (lokal lewat Docker, produksi di Supabase lewat pooler) dengan `@payloadcms/db-postgres`
  - Editor Lexical (`@payloadcms/richtext-lexical`)
  - Vitest (unit + integrasi), Playwright (e2e, mulai Rencana 4)
  - Node `^22.23.4 || >=24.22.1`, npm 11

  ## Perintah
  - Database lokal: Postgres sistem (tanpa Docker; sejak v1.1.0 komputer pemilik memakai proyek Supabase pratinjau)
  - Dev: `npm run dev` (admin di http://localhost:3000/admin)
  - Tes unit: `npm run test:unit`
  - Tes integrasi (butuh Postgres): `npm run test:int`
  - Semua tes: `npm test`
  - Type check: `npm run typecheck`
  - Tipe Payload: `npm run generate:types` (jalankan setiap kali field berubah)
  - Import map admin: `npm run generate:importmap` (jalankan setiap kali menambah fitur Lexical atau komponen admin)
  - Data awal: `npm run seed`

  ## Konvensi
  - Nama domain memakai bahasa Indonesia, sama dengan spesifikasi: slug koleksi (`artikel`, `pilar`), nama field (`judul`, `intinya`), nama fungsi modul (`kabari`, `hitung`, `pathFor` adalah pengecualian yang sudah ada).
  - Nama teknis framework tetap bahasa Inggris (hook, access, config).
  - Logika bisnis ditulis sebagai fungsi murni di `src/lib/` atau `src/modules/` dan diuji unit. Config Payload hanya merangkai.
  - Satu file satu tanggung jawab. Koleksi di `src/collections/`, global di `src/globals/`, blok di `src/blocks/`, field bersama di `src/fields/`, hook di `src/hooks/`, akses di `src/access/`.
  - Path publik selalu dibangun lewat `pathFor()` di `src/lib/paths.ts`, jangan merangkai string URL manual.
  - Copy UI: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru.
  - Tes unit di `tests/unit/*.test.ts`, tes integrasi di `tests/int/*.int.spec.ts` dan memakai `getTestPayload()` + `unik()` dari `tests/int/helpers.ts`.

  ## Batasan
  - Jangan commit `.env`. `.env.test` boleh di-commit karena hanya untuk database tes lokal.
  - Tanya dulu sebelum menambah dependensi baru di luar rencana.
  - Jalankan `npm run generate:types` lalu `npm run typecheck` setelah mengubah koleksi atau global.
  - Jalankan `npm test` sebelum commit.
  ```


- [ ] **Langkah 10: Pasang dependensi, nyalakan Postgres, siapkan `.env`**

  Jalankan:

  ```bash
  npm install
  pg_ctlcluster 16 main start   # sejak v1.1.0 tanpa Docker
  cp .env.example .env
  sed -i "s/^PAYLOAD_SECRET=.*/PAYLOAD_SECRET=$(openssl rand -hex 24)/" .env
  PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -lqt | cut -d"|" -f1 | grep pointlat
  ```

  Hasil yang diharapkan: dua baris: `pointlat` dan `pointlat_test`.


- [ ] **Langkah 11: Jalankan tes asap, type check, dan lint**

  Jalankan:

  ```bash
  npm run test:int
  npm run generate:types && npm run typecheck
  npm run lint
  ```

  Hasil yang diharapkan: `Test Files 1 passed (1)`, `Tests 1 passed (1)`; `tsc --noEmit` tanpa error; lint tanpa output error.


- [ ] **Langkah 12: Commit**

  ```bash
  git add -A
  git commit -m "chore: kerangka Next.js + Payload 3 dengan Postgres, Vitest, dan CLAUDE.md"
  ```


### Task 2: Slug, path publik, dan konstanta domain

**Files:**
- Create: `src/lib/slug.ts`, `src/lib/paths.ts`, `src/lib/konstanta.ts`
- Test: `tests/unit/slug.test.ts`, `tests/unit/paths.test.ts`

**Interfaces:**
- Produces: `slugify(input: string): string`; `isReservedSlug(slug: string): boolean`; `RESERVED_SLUGS: ReadonlySet<string>`; `pathFor(target: TargetPath): string` dengan `TargetPath = { jenis: 'artikel'; slug: string; tipe: TipeArtikel } | { jenis: 'subkategori'; slug: string; pilarSlug: string } | { jenis: 'pilar' | 'tools' | 'video' | 'penulis' | 'halaman'; slug: string }`; konstanta `TIPE_ARTIKEL`, `LABEL_TIPE_ARTIKEL`, `WARNA_PILAR`, `TOOL_IDS`, `LABEL_TOOL` dan tipe `TipeArtikel`, `WarnaPilar`, `ToolId`.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/slug.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { isReservedSlug, slugify } from '@/lib/slug'

  describe('slugify', () => {
    it('mengubah judul menjadi huruf kecil dengan tanda hubung', () => {
      expect(slugify('Cara Hitung Gaji Bersih')).toBe('cara-hitung-gaji-bersih')
    })

    it('mengganti & dengan "dan"', () => {
      expect(slugify('Uang & Karier')).toBe('uang-dan-karier')
    })

    it('membuang tanda baca, apostrof, dan aksen', () => {
      expect(slugify("Apa itu PPh 21? Ini jawabannya!")).toBe('apa-itu-pph-21-ini-jawabannya')
      expect(slugify("Jum'at Café")).toBe('jumat-cafe')
    })

    it('merapikan spasi dan tanda hubung berlebih', () => {
      expect(slugify('  --Gaji   Rp8 juta--  ')).toBe('gaji-rp8-juta')
    })

    it('memotong di batas kata saat lebih dari 80 karakter', () => {
      const judul = 'kata '.repeat(30)
      const hasil = slugify(judul)
      expect(hasil.length).toBeLessThanOrEqual(80)
      expect(hasil.endsWith('-')).toBe(false)
      expect(hasil).toMatch(/^kata(-kata)*$/)
    })

    it('mengembalikan string kosong untuk input kosong', () => {
      expect(slugify('')).toBe('')
      expect(slugify('???')).toBe('')
    })
  })

  describe('isReservedSlug', () => {
    it('menolak segmen yang dipakai rute sistem', () => {
      for (const s of ['admin', 'api', 'tools', 'glosarium', 'video', 'penulis', 'cari', 'sitemap']) {
        expect(isReservedSlug(s)).toBe(true)
      }
    })

    it('mengizinkan slug konten biasa', () => {
      expect(isReservedSlug('cara-hitung-gaji-bersih')).toBe(false)
    })
  })
  ```

  `tests/unit/paths.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { pathFor } from '@/lib/paths'

  describe('pathFor', () => {
    it('artikel non-glosarium berada di tingkat atas', () => {
      expect(pathFor({ jenis: 'artikel', slug: 'cara-hitung-gaji-bersih', tipe: 'panduan' })).toBe(
        '/cara-hitung-gaji-bersih',
      )
      expect(pathFor({ jenis: 'artikel', slug: 'snbt-2027', tipe: 'explainer' })).toBe('/snbt-2027')
    })

    it('artikel glosarium berada di /glosarium', () => {
      expect(pathFor({ jenis: 'artikel', slug: 'ptkp', tipe: 'glosarium' })).toBe('/glosarium/ptkp')
    })

    it('pilar dan halaman berada di tingkat atas', () => {
      expect(pathFor({ jenis: 'pilar', slug: 'uang-karier' })).toBe('/uang-karier')
      expect(pathFor({ jenis: 'halaman', slug: 'tentang' })).toBe('/tentang')
    })

    it('subkategori berada di bawah pilarnya', () => {
      expect(pathFor({ jenis: 'subkategori', slug: 'pajak', pilarSlug: 'uang-karier' })).toBe(
        '/uang-karier/pajak',
      )
    })

    it('tools, video, dan penulis punya prefiks sendiri', () => {
      expect(pathFor({ jenis: 'tools', slug: 'gaji-bersih' })).toBe('/tools/gaji-bersih')
      expect(pathFor({ jenis: 'video', slug: 'pph-21' })).toBe('/video/pph-21')
      expect(pathFor({ jenis: 'penulis', slug: 'redaksi' })).toBe('/penulis/redaksi')
    })
  })
  ```


- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL dengan `Cannot find package '@/lib/slug'` dan `'@/lib/paths'`.


- [ ] **Langkah 3: Implementasi**

  `src/lib/slug.ts`

  ```ts
  const MAKS_PANJANG = 80

  /** Segmen tingkat atas yang dipakai rute sistem dan tidak boleh menjadi slug konten. */
  export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
    'admin',
    'api',
    'tools',
    'glosarium',
    'video',
    'penulis',
    'cari',
    'sitemap',
    'sitemap-xml',
    'news-sitemap',
    'feed',
    'robots',
    'ads',
    'media',
    'next',
  ])

  export function slugify(input: string): string {
    const dasar = input
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/&/g, ' dan ')
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (dasar.length <= MAKS_PANJANG) return dasar

    const potong = dasar.slice(0, MAKS_PANJANG + 1)
    const batas = potong.lastIndexOf('-')
    return (batas > 0 ? potong.slice(0, batas) : dasar.slice(0, MAKS_PANJANG)).replace(/-+$/g, '')
  }

  export function isReservedSlug(slug: string): boolean {
    return RESERVED_SLUGS.has(slug)
  }
  ```

  `src/lib/konstanta.ts`

  ```ts
  export const TIPE_ARTIKEL = ['panduan', 'explainer', 'daftar', 'glosarium'] as const
  export type TipeArtikel = (typeof TIPE_ARTIKEL)[number]

  export const LABEL_TIPE_ARTIKEL: Record<TipeArtikel, string> = {
    panduan: 'Panduan',
    explainer: 'Explainer',
    daftar: 'Daftar & Perbandingan',
    glosarium: 'Glosarium',
  }

  /** Token warna pilar dari spesifikasi §4. Nilai hex dipakai frontend lewat token CSS. */
  export const WARNA_PILAR = {
    hijau: { label: 'Hijau (Uang & Karier)', hex: '#1F7A4D', teks: '#FFFFFF' },
    oranye: { label: 'Oranye (Tekno)', hex: '#C2410C', teks: '#FFFFFF' },
    kuning: { label: 'Kuning (Belajar)', hex: '#F2C230', teks: '#111111' },
    koral: { label: 'Koral (Sehat)', hex: '#FF8A80', teks: '#111111' },
  } as const
  export type WarnaPilar = keyof typeof WARNA_PILAR

  export const TOOL_IDS = [
    'gaji-bersih',
    'thr',
    'cicilan-kpr',
    'dana-darurat',
    'bmi-kalori',
    'ipk',
  ] as const
  export type ToolId = (typeof TOOL_IDS)[number]

  export const LABEL_TOOL: Record<ToolId, string> = {
    'gaji-bersih': 'Gaji Bersih',
    thr: 'THR',
    'cicilan-kpr': 'Cicilan & KPR',
    'dana-darurat': 'Dana Darurat',
    'bmi-kalori': 'BMI & Kalori',
    ipk: 'IPK',
  }
  ```

  `src/lib/paths.ts`

  ```ts
  import type { TipeArtikel } from './konstanta'

  export type TargetPath =
    | { jenis: 'artikel'; slug: string; tipe: TipeArtikel }
    | { jenis: 'subkategori'; slug: string; pilarSlug: string }
    | { jenis: 'pilar' | 'tools' | 'video' | 'penulis' | 'halaman'; slug: string }

  /** Satu-satunya tempat path publik dirangkai. Dipakai redirect, SEO, sitemap, dan indexer. */
  export function pathFor(target: TargetPath): string {
    switch (target.jenis) {
      case 'artikel':
        return target.tipe === 'glosarium' ? `/glosarium/${target.slug}` : `/${target.slug}`
      case 'subkategori':
        return `/${target.pilarSlug}/${target.slug}`
      case 'tools':
        return `/tools/${target.slug}`
      case 'video':
        return `/video/${target.slug}`
      case 'penulis':
        return `/penulis/${target.slug}`
      case 'pilar':
      case 'halaman':
        return `/${target.slug}`
    }
  }
  ```


- [ ] **Langkah 4: Pastikan tes lulus**

  Jalankan:

  ```bash
  npm run test:unit
  npm run typecheck
  ```

  Hasil yang diharapkan: `Test Files 2 passed (2)`, `Tests 13 passed (13)`; type check bersih.


- [ ] **Langkah 5: Commit**

  ```bash
  git add src/lib tests/unit
  git commit -m "feat: slugify, pathFor, dan konstanta domain"
  ```


### Task 3: Akses dan peran pengguna

**Files:**
- Create: `src/access/index.ts`, `src/hooks/tetapkanPeranAwal.ts`
- Modify: `src/collections/Pengguna.ts` (ganti seluruh isi)
- Test: `tests/unit/access.test.ts`, `tests/int/pengguna.int.spec.ts`

**Interfaces:**
- Consumes: koleksi `pengguna` dari Task 1.
- Produces: `anyone`, `isLoggedIn`, `isAdmin`, `isAdminOrSelf`, `publishedOrLoggedIn` (tipe `Access`), `isAdminField` (tipe `FieldAccess`); `peranAwal(jumlahPenggunaSebelumnya: number, diminta?: string | null): 'admin' | 'editor'`; field `peran` (`'admin' | 'editor'`, default `editor`, disimpan di JWT).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/access.test.ts`

  ```ts
  import type { Access } from 'payload'
  import { describe, expect, it } from 'vitest'

  import { isAdmin, isAdminOrSelf, isLoggedIn, publishedOrLoggedIn } from '@/access'
  import { peranAwal } from '@/hooks/tetapkanPeranAwal'

  type Args = Parameters<Access>[0]
  const args = (user?: Record<string, unknown>): Args => ({ req: { user } }) as unknown as Args

  describe('akses', () => {
    it('isLoggedIn hanya untuk pengguna yang masuk', () => {
      expect(isLoggedIn(args())).toBe(false)
      expect(isLoggedIn(args({ id: 1, peran: 'editor' }))).toBe(true)
    })

    it('isAdmin hanya untuk peran admin', () => {
      expect(isAdmin(args({ id: 1, peran: 'editor' }))).toBe(false)
      expect(isAdmin(args({ id: 1, peran: 'admin' }))).toBe(true)
    })

    it('isAdminOrSelf membatasi editor ke dokumennya sendiri', () => {
      expect(isAdminOrSelf(args({ id: 1, peran: 'admin' }))).toBe(true)
      expect(isAdminOrSelf(args({ id: 7, peran: 'editor' }))).toEqual({ id: { equals: 7 } })
      expect(isAdminOrSelf(args())).toBe(false)
    })

    it('publishedOrLoggedIn menyaring draf untuk pengunjung', () => {
      expect(publishedOrLoggedIn(args())).toEqual({ _status: { equals: 'published' } })
      expect(publishedOrLoggedIn(args({ id: 1, peran: 'editor' }))).toBe(true)
    })
  })

  describe('peranAwal', () => {
    it('pengguna pertama selalu admin', () => {
      expect(peranAwal(0, 'editor')).toBe('admin')
      expect(peranAwal(0, undefined)).toBe('admin')
    })

    it('pengguna berikutnya memakai peran yang diminta, default editor', () => {
      expect(peranAwal(3, 'admin')).toBe('admin')
      expect(peranAwal(3, 'editor')).toBe('editor')
      expect(peranAwal(3, undefined)).toBe('editor')
    })
  })
  ```

  `tests/int/pengguna.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { getTestPayload, unik } from './helpers'

  describe('koleksi pengguna', () => {
    it('pengguna baru setelah yang pertama mendapat peran editor', async () => {
      const payload = await getTestPayload()

      await payload.create({
        collection: 'pengguna',
        data: { email: `${unik('a')}@tes.local`, password: 'rahasia-123', nama: 'Satu', peran: 'admin' },
      })
      const kedua = await payload.create({
        collection: 'pengguna',
        data: { email: `${unik('b')}@tes.local`, password: 'rahasia-123', nama: 'Dua' },
      })

      expect(kedua.peran).toBe('editor')
    })
  })
  ```


- [ ] **Langkah 2: Pastikan tes unit gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/access.test.ts` karena `@/access` belum ada.


- [ ] **Langkah 3: Implementasi**

  `src/access/index.ts`

  ```ts
  import type { Access, FieldAccess } from 'payload'

  type PenggunaMasuk = { id: number | string; peran?: string | null }

  const pengguna = (user: unknown): PenggunaMasuk | undefined =>
    user ? (user as PenggunaMasuk) : undefined

  export const anyone: Access = () => true

  export const isLoggedIn: Access = ({ req }) => Boolean(req.user)

  export const isAdmin: Access = ({ req }) => pengguna(req.user)?.peran === 'admin'

  export const isAdminField: FieldAccess = ({ req }) => pengguna(req.user)?.peran === 'admin'

  export const isAdminOrSelf: Access = ({ req }) => {
    const user = pengguna(req.user)
    if (!user) return false
    if (user.peran === 'admin') return true
    return { id: { equals: user.id } }
  }

  /** Pengunjung hanya melihat dokumen terbit; pengguna yang masuk melihat draf juga. */
  export const publishedOrLoggedIn: Access = ({ req }) =>
    req.user ? true : { _status: { equals: 'published' } }
  ```

  `src/hooks/tetapkanPeranAwal.ts`

  ```ts
  import type { CollectionBeforeChangeHook } from 'payload'

  export type Peran = 'admin' | 'editor'

  export function peranAwal(jumlahPenggunaSebelumnya: number, diminta?: string | null): Peran {
    if (jumlahPenggunaSebelumnya === 0) return 'admin'
    return diminta === 'admin' ? 'admin' : 'editor'
  }

  /** Pengguna pertama otomatis admin supaya pemilik tidak terkunci dari panel. */
  export const tetapkanPeranAwal: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
    if (operation !== 'create') return data
    const { totalDocs } = await req.payload.count({ collection: 'pengguna', req })
    return { ...data, peran: peranAwal(totalDocs, data.peran) }
  }
  ```

  `src/collections/Pengguna.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isAdmin, isAdminField, isAdminOrSelf, isLoggedIn } from '@/access'
  import { tetapkanPeranAwal } from '@/hooks/tetapkanPeranAwal'

  export const Pengguna: CollectionConfig = {
    slug: 'pengguna',
    labels: { singular: 'Pengguna', plural: 'Pengguna' },
    auth: true,
    admin: {
      useAsTitle: 'email',
      defaultColumns: ['nama', 'email', 'peran'],
      group: 'Pengaturan',
    },
    access: {
      read: isLoggedIn,
      create: isAdmin,
      update: isAdminOrSelf,
      delete: isAdmin,
    },
    hooks: {
      beforeChange: [tetapkanPeranAwal],
    },
    fields: [
      { name: 'nama', type: 'text', required: true },
      {
        name: 'peran',
        type: 'select',
        defaultValue: 'editor',
        saveToJWT: true,
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Editor', value: 'editor' },
        ],
        access: { update: isAdminField },
      },
    ],
  }
  ```

  Field `peran` sengaja tanpa `required`: hook `tetapkanPeranAwal` selalu mengisinya saat create, dan tanpa `required` tipe `payload.create` tidak memaksa pemanggil mengisi peran.


- [ ] **Langkah 4: Perbarui tipe, jalankan semua tes**

  Jalankan:

  ```bash
  npm run generate:types && npm run typecheck
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: type check bersih; unit `Tests 19 passed (19)`; integrasi `Test Files 2 passed (2)`, `Tests 2 passed (2)`.


- [ ] **Langkah 5: Commit**

  ```bash
  git add -A
  git commit -m "feat: peran admin/editor dan aturan akses"
  ```


### Task 4: Field bersama, pilar, subkategori, penulis

**Files:**
- Create: `src/lib/validasi.ts`, `src/fields/slug.ts`, `src/fields/seo.ts`, `src/collections/Pilar.ts`, `src/collections/Subkategori.ts`, `src/collections/Penulis.ts`
- Modify: `src/lib/slug.ts` (tambah `buatSlug`, `validasiFormatSlug`), `src/payload.config.ts`, `tests/int/helpers.ts` (tambah `pesanGalat`)
- Test: `tests/unit/fields.test.ts`, `tests/int/taksonomi.int.spec.ts`

**Interfaces:**
- Consumes: `slugify`, `isReservedSlug` (Task 2); `anyone`, `isAdmin`, `isLoggedIn` (Task 3); `WARNA_PILAR` (Task 2).
- Produces: `buatSlug(nilai: unknown, sumber: unknown): string | undefined`; `validasiFormatSlug(nilai: unknown): true | string`; `validasiUrlOpsional(nilai: unknown): true | string`; `slugField(sumber = 'judul'): Field` (Task 8 menambah parameter opsi); `seoField: Field` (grup `seo` berisi `keyphrase`, `keyphraseSekunder`, `judulSEO`, `metaDeskripsi`, `gambarOG`, `canonical`, `tipeSchema`, `noindex`); helper tes `pesanGalat(operasi: Promise<unknown>): Promise<string>` yang mengembalikan `"path: pesan"` per field gagal, dipisah ` | `.

- [ ] **Langkah 1: Tulis tes yang gagal dan helper `pesanGalat`**

  `tests/unit/fields.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { buatSlug, validasiFormatSlug } from '@/lib/slug'
  import { validasiUrlOpsional } from '@/lib/validasi'

  describe('buatSlug', () => {
    it('memakai slug yang diketik editor, dirapikan', () => {
      expect(buatSlug('Gaji Bersih ', 'Judul Lain')).toBe('gaji-bersih')
    })

    it('membuat slug dari field sumber bila slug kosong', () => {
      expect(buatSlug('', 'Uang & Karier')).toBe('uang-dan-karier')
      expect(buatSlug(undefined, 'Tekno')).toBe('tekno')
    })

    it('mengembalikan undefined bila slug dan sumber sama-sama kosong', () => {
      expect(buatSlug(undefined, undefined)).toBeUndefined()
      expect(buatSlug('', '')).toBeUndefined()
    })
  })

  describe('validasiFormatSlug', () => {
    it('menerima slug yang rapi', () => {
      expect(validasiFormatSlug('cara-hitung-thr')).toBe(true)
    })

    it('menolak slug kosong, berformat salah, atau milik sistem', () => {
      expect(validasiFormatSlug('')).toBe('Slug wajib diisi.')
      expect(validasiFormatSlug('Huruf Besar')).toBe(
        'Slug hanya boleh huruf kecil, angka, dan tanda hubung.',
      )
      expect(validasiFormatSlug('tools')).toBe('"tools" dipakai sistem. Pilih slug lain.')
    })
  })

  describe('validasiUrlOpsional', () => {
    it('menerima nilai kosong', () => {
      expect(validasiUrlOpsional(undefined)).toBe(true)
      expect(validasiUrlOpsional('')).toBe(true)
    })

    it('menerima URL http atau https lengkap', () => {
      expect(validasiUrlOpsional('https://pajak.go.id/id/pph-21')).toBe(true)
    })

    it('menolak teks yang bukan URL', () => {
      expect(validasiUrlOpsional('pajak.go.id')).toBe('Tulis URL lengkap yang diawali https://')
      expect(validasiUrlOpsional('ftp://contoh.com')).toBe('Tulis URL lengkap yang diawali https://')
    })
  })
  ```

  `tests/int/taksonomi.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { slugify } from '@/lib/slug'

  import { getTestPayload, pesanGalat, unik } from './helpers'

  describe('pilar, subkategori, penulis', () => {
    it('membuat slug pilar otomatis dari nama', async () => {
      const payload = await getTestPayload()
      const nama = unik('Uang & Karier')
      const pilar = await payload.create({
        collection: 'pilar',
        data: { nama, warna: 'hijau', deskripsi: 'Gaji, pajak, dan karier.' },
      })
      expect(pilar.slug).toBe(slugify(nama))
    })

    it('menolak slug milik sistem', async () => {
      const payload = await getTestPayload()
      const pesan = await pesanGalat(
        payload.create({
          collection: 'pilar',
          data: { nama: unik('Tools'), slug: 'tools', warna: 'oranye', deskripsi: 'x' },
        }),
      )
      expect(pesan).toMatch(/dipakai sistem/)
    })

    it('subkategori terhubung ke pilar dan penulis punya slug', async () => {
      const payload = await getTestPayload()
      const pilar = await payload.create({
        collection: 'pilar',
        data: { nama: unik('Belajar'), warna: 'kuning', deskripsi: 'Sekolah dan kuliah.' },
      })
      const sub = await payload.create({
        collection: 'subkategori',
        data: { nama: unik('Beasiswa'), pilar: pilar.id },
      })
      const penulis = await payload.create({
        collection: 'penulis',
        data: { nama: unik('Redaksi point'), bio: 'Tim redaksi point.lat.' },
      })

      expect(typeof sub.pilar === 'object' ? sub.pilar?.id : sub.pilar).toBe(pilar.id)
      expect(penulis.slug).toMatch(/^redaksi-point-/)
    })
  })
  ```

  Ganti seluruh `tests/int/helpers.ts`:

  `tests/int/helpers.ts`

  ```ts
  import config from '@payload-config'
  import { getPayload, type Payload } from 'payload'

  let cached: Payload | undefined

  export async function getTestPayload(): Promise<Payload> {
    if (!cached) {
      cached = await getPayload({ config: await config })
    }
    return cached
  }

  /**
   * Menjalankan operasi yang diharapkan gagal validasi.
   * Mengembalikan "path: pesan" per field yang gagal, dipisah " | ".
   */
  export async function pesanGalat(operasi: Promise<unknown>): Promise<string> {
    try {
      await operasi
    } catch (galat) {
      const data = (galat as { data?: { errors?: { path?: string; message: string }[] } }).data
      return (
        data?.errors?.map((e) => `${e.path ?? '?'}: ${e.message}`).join(' | ') ??
        String((galat as Error).message)
      )
    }
    throw new Error('Operasi diharapkan gagal, tetapi berhasil.')
  }

  /** Akhiran unik supaya data antar-run tidak bentrok di database tes. */
  export function unik(prefix: string): string {
    return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  }
  ```


- [ ] **Langkah 2: Pastikan tes unit gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/fields.test.ts` (`buatSlug` dan `@/lib/validasi` belum ada).


- [ ] **Langkah 3: Tambah fungsi slug dan validasi**

  Ganti seluruh `src/lib/slug.ts`:

  `src/lib/slug.ts`

  ```ts
  const MAKS_PANJANG = 80

  /** Segmen tingkat atas yang dipakai rute sistem dan tidak boleh menjadi slug konten. */
  export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
    'admin',
    'api',
    'tools',
    'glosarium',
    'video',
    'penulis',
    'cari',
    'sitemap',
    'sitemap-xml',
    'news-sitemap',
    'feed',
    'robots',
    'ads',
    'media',
    'next',
  ])

  export function slugify(input: string): string {
    const dasar = input
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/&/g, ' dan ')
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    if (dasar.length <= MAKS_PANJANG) return dasar

    const potong = dasar.slice(0, MAKS_PANJANG + 1)
    const batas = potong.lastIndexOf('-')
    return (batas > 0 ? potong.slice(0, batas) : dasar.slice(0, MAKS_PANJANG)).replace(/-+$/g, '')
  }

  export function isReservedSlug(slug: string): boolean {
    return RESERVED_SLUGS.has(slug)
  }

  /** Slug yang diketik editor diutamakan; bila kosong, dibuat dari field sumber (biasanya judul). */
  export function buatSlug(nilai: unknown, sumber: unknown): string | undefined {
    if (typeof nilai === 'string' && nilai.trim()) return slugify(nilai) || undefined
    if (typeof sumber === 'string' && sumber.trim()) return slugify(sumber) || undefined
    return undefined
  }

  const POLA_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

  export function validasiFormatSlug(nilai: unknown): true | string {
    if (typeof nilai !== 'string' || nilai === '') return 'Slug wajib diisi.'
    if (!POLA_SLUG.test(nilai)) return 'Slug hanya boleh huruf kecil, angka, dan tanda hubung.'
    if (isReservedSlug(nilai)) return `"${nilai}" dipakai sistem. Pilih slug lain.`
    return true
  }
  ```

  `src/lib/validasi.ts`

  ```ts
  const PESAN_URL = 'Tulis URL lengkap yang diawali https://'

  export function validasiUrlOpsional(nilai: unknown): true | string {
    if (nilai === undefined || nilai === null || nilai === '') return true
    if (typeof nilai !== 'string') return PESAN_URL
    try {
      const url = new URL(nilai)
      return url.protocol === 'https:' || url.protocol === 'http:' ? true : PESAN_URL
    } catch {
      return PESAN_URL
    }
  }
  ```


- [ ] **Langkah 4: Buat field bersama**

  `src/fields/slug.ts`

  ```ts
  import type { Field } from 'payload'

  import { buatSlug, validasiFormatSlug } from '@/lib/slug'

  /**
   * Field slug standar: dibuat dari `sumber` bila kosong, unik per koleksi, format divalidasi.
   * Tidak memakai `required` supaya tipe data boleh tanpa slug; `validasiFormatSlug` yang menolak slug kosong.
   */
  export function slugField(sumber = 'judul'): Field {
    return {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Dibuat otomatis dari judul. Mengubahnya setelah terbit membuat redirect 301.',
      },
      hooks: {
        beforeValidate: [
          ({ value, data, originalDoc }) =>
            buatSlug(value, data?.[sumber] ?? originalDoc?.[sumber]),
        ],
      },
      validate: (value: unknown) => validasiFormatSlug(value),
    }
  }
  ```

  Slug tidak memakai `required`: hook membuatnya dari judul, dan `validasiFormatSlug` menolak slug kosong saat dokumen disimpan non-draf. Tanpa `required`, tipe `payload.create` tidak memaksa pemanggil mengirim slug.

  `src/fields/seo.ts`

  ```ts
  import type { Field } from 'payload'

  import { validasiUrlOpsional } from '@/lib/validasi'

  /** Grup SEO yang dipakai semua dokumen publik. Analisis & pratinjau ditambahkan di Rencana 3. */
  export const seoField: Field = {
    name: 'seo',
    type: 'group',
    label: 'SEO',
    fields: [
      { name: 'keyphrase', type: 'text', label: 'Keyphrase utama' },
      { name: 'keyphraseSekunder', type: 'text', hasMany: true, label: 'Keyphrase sekunder' },
      {
        name: 'judulSEO',
        type: 'text',
        label: 'Judul SEO',
        admin: { description: 'Ideal 50-60 karakter. Kosongkan untuk memakai judul.' },
      },
      {
        name: 'metaDeskripsi',
        type: 'textarea',
        label: 'Meta description',
        admin: { description: 'Ideal 150-160 karakter.' },
      },
      {
        name: 'gambarOG',
        type: 'upload',
        relationTo: 'media',
        label: 'Gambar OG',
        admin: { description: 'Kosongkan untuk dibuat otomatis.' },
      },
      {
        name: 'canonical',
        type: 'text',
        label: 'Canonical URL',
        validate: (value: unknown) => validasiUrlOpsional(value),
      },
      {
        name: 'tipeSchema',
        type: 'select',
        label: 'Tipe schema',
        defaultValue: 'otomatis',
        options: [
          { label: 'Otomatis', value: 'otomatis' },
          { label: 'Article', value: 'Article' },
          { label: 'NewsArticle', value: 'NewsArticle' },
        ],
      },
      { name: 'noindex', type: 'checkbox', label: 'Jangan indeks halaman ini', defaultValue: false },
    ],
  }
  ```


- [ ] **Langkah 5: Buat koleksi pilar, subkategori, penulis**

  `src/collections/Pilar.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { anyone, isAdmin } from '@/access'
  import { seoField } from '@/fields/seo'
  import { slugField } from '@/fields/slug'
  import { WARNA_PILAR } from '@/lib/konstanta'

  export const Pilar: CollectionConfig = {
    slug: 'pilar',
    labels: { singular: 'Pilar', plural: 'Pilar' },
    defaultSort: 'urutan',
    admin: {
      useAsTitle: 'nama',
      defaultColumns: ['nama', 'slug', 'warna', 'urutan'],
      group: 'Konten',
    },
    access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
    fields: [
      { name: 'nama', type: 'text', required: true },
      slugField('nama'),
      {
        name: 'warna',
        type: 'select',
        required: true,
        options: Object.entries(WARNA_PILAR).map(([value, warna]) => ({ value, label: warna.label })),
      },
      { name: 'deskripsi', type: 'textarea', required: true },
      { name: 'intro', type: 'richText', label: 'Intro halaman rubrik' },
      { name: 'urutan', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
      seoField,
    ],
  }
  ```

  `src/collections/Subkategori.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { anyone, isAdmin } from '@/access'
  import { seoField } from '@/fields/seo'
  import { slugField } from '@/fields/slug'

  export const Subkategori: CollectionConfig = {
    slug: 'subkategori',
    labels: { singular: 'Subkategori', plural: 'Subkategori' },
    admin: { useAsTitle: 'nama', defaultColumns: ['nama', 'pilar', 'slug'], group: 'Konten' },
    access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
    fields: [
      { name: 'nama', type: 'text', required: true },
      slugField('nama'),
      { name: 'pilar', type: 'relationship', relationTo: 'pilar', required: true },
      { name: 'deskripsi', type: 'textarea' },
      seoField,
    ],
  }
  ```

  `src/collections/Penulis.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { anyone, isLoggedIn } from '@/access'
  import { seoField } from '@/fields/seo'
  import { slugField } from '@/fields/slug'
  import { validasiUrlOpsional } from '@/lib/validasi'

  export const Penulis: CollectionConfig = {
    slug: 'penulis',
    labels: { singular: 'Penulis', plural: 'Penulis' },
    admin: { useAsTitle: 'nama', defaultColumns: ['nama', 'slug'], group: 'Konten' },
    access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
    fields: [
      { name: 'nama', type: 'text', required: true },
      slugField('nama'),
      { name: 'foto', type: 'upload', relationTo: 'media' },
      { name: 'bio', type: 'textarea', required: true },
      { name: 'keahlian', type: 'text', hasMany: true },
      {
        name: 'tautan',
        type: 'array',
        fields: [
          { name: 'label', type: 'text', required: true },
          { name: 'url', type: 'text', required: true, validate: (value: unknown) => validasiUrlOpsional(value) },
        ],
      },
      seoField,
    ],
  }
  ```


- [ ] **Langkah 6: Daftarkan di config**

  Ganti seluruh `src/payload.config.ts`:

  `src/payload.config.ts`

  ```ts
  import { postgresAdapter } from '@payloadcms/db-postgres'
  import { lexicalEditor } from '@payloadcms/richtext-lexical'
  import path from 'path'
  import { buildConfig } from 'payload'
  import sharp from 'sharp'
  import { fileURLToPath } from 'url'

  import { Media } from './collections/Media'
  import { Pengguna } from './collections/Pengguna'
  import { Penulis } from './collections/Penulis'
  import { Pilar } from './collections/Pilar'
  import { Subkategori } from './collections/Subkategori'

  const filename = fileURLToPath(import.meta.url)
  const dirname = path.dirname(filename)

  export default buildConfig({
    admin: {
      user: Pengguna.slug,
      importMap: { baseDir: path.resolve(dirname) },
    },
    collections: [Pengguna, Media, Pilar, Subkategori, Penulis],
    editor: lexicalEditor(),
    secret: process.env.PAYLOAD_SECRET || '',
    typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
    db: postgresAdapter({
      pool: { connectionString: process.env.DATABASE_URL || '' },
    }),
    sharp,
    plugins: [],
  })
  ```


- [ ] **Langkah 7: Perbarui tipe, jalankan semua tes**

  Jalankan:

  ```bash
  npm run generate:types && npm run typecheck
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: type check bersih; unit `Tests 27 passed (27)`; integrasi `Test Files 3 passed (3)`, `Tests 5 passed (5)`.


- [ ] **Langkah 8: Commit**

  ```bash
  git add -A
  git commit -m "feat: field slug & SEO, koleksi pilar, subkategori, penulis"
  ```


### Task 5: Media (alt wajib untuk gambar, cek lebar)

**Files:**
- Create: `src/lib/media.ts`, `tests/int/fixtures.ts`
- Modify: `src/collections/Media.ts` (ganti seluruh isi)
- Test: `tests/unit/media.test.ts`, `tests/int/media.int.spec.ts`

**Interfaces:**
- Consumes: `anyone`, `isLoggedIn` (Task 3).
- Produces: `LEBAR_MINIMAL_GAMBAR_UTAMA = 1200`; `validasiAlt(alt: unknown, mimeType: unknown): true | string`; `validasiLebarGambar(lebar: number | null | undefined, minimal?: number): true | string`; fixture `gambarPng(lebar: number, tinggi: number)` yang mengembalikan objek `file` untuk `payload.create`.

Penyimpanan sementara di disk lokal (`media/`, sudah di `.gitignore`). Rencana 2 memindahkannya ke Cloudinary tanpa mengubah field.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/media.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { LEBAR_MINIMAL_GAMBAR_UTAMA, validasiAlt, validasiLebarGambar } from '@/lib/media'

  describe('validasiAlt', () => {
    it('mewajibkan alt untuk gambar', () => {
      expect(validasiAlt('', 'image/png')).toBe('Alt wajib diisi untuk gambar.')
      expect(validasiAlt('   ', 'image/jpeg')).toBe('Alt wajib diisi untuk gambar.')
      expect(validasiAlt('Slip gaji contoh', 'image/png')).toBe(true)
    })

    it('tidak mewajibkan alt untuk video', () => {
      expect(validasiAlt('', 'video/mp4')).toBe(true)
    })
  })

  describe('validasiLebarGambar', () => {
    it('memakai batas 1200px untuk gambar utama', () => {
      expect(LEBAR_MINIMAL_GAMBAR_UTAMA).toBe(1200)
    })

    it('menerima gambar yang cukup lebar', () => {
      expect(validasiLebarGambar(1200)).toBe(true)
      expect(validasiLebarGambar(2400)).toBe(true)
    })

    it('menolak gambar yang terlalu kecil atau tanpa ukuran', () => {
      expect(validasiLebarGambar(800)).toBe(
        'Gambar utama minimal 1200px lebarnya (sekarang 800px), syarat tampil besar di Google Discover.',
      )
      expect(validasiLebarGambar(undefined)).toBe('Ukuran gambar tidak diketahui. Unggah ulang gambarnya.')
    })
  })
  ```

  `tests/int/fixtures.ts`

  ```ts
  import sharp from 'sharp'

  import { unik } from './helpers'

  export async function gambarPng(lebar: number, tinggi: number) {
    const data = await sharp({
      create: { width: lebar, height: tinggi, channels: 3, background: '#1F7A4D' },
    })
      .png()
      .toBuffer()
    return { data, mimetype: 'image/png', name: `${unik('tes')}.png`, size: data.length }
  }
  ```

  `tests/int/media.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { gambarPng } from './fixtures'
  import { getTestPayload, pesanGalat } from './helpers'

  describe('koleksi media', () => {
    it('menyimpan gambar beserta ukurannya', async () => {
      const payload = await getTestPayload()
      const media = await payload.create({
        collection: 'media',
        data: { alt: 'Kotak hijau contoh' },
        file: await gambarPng(1300, 800),
      })
      expect(media.width).toBe(1300)
      expect(media.mimeType).toBe('image/png')
    })

    it('menolak gambar tanpa alt', async () => {
      const payload = await getTestPayload()
      const pesan = await pesanGalat(
        payload.create({ collection: 'media', data: {}, file: await gambarPng(400, 300) }),
      )
      expect(pesan).toMatch(/Alt wajib/)
    })
  })
  ```


- [ ] **Langkah 2: Pastikan tes unit gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/media.test.ts` (`@/lib/media` belum ada).


- [ ] **Langkah 3: Implementasi**

  `src/lib/media.ts`

  ```ts
  export const LEBAR_MINIMAL_GAMBAR_UTAMA = 1200

  export function validasiAlt(alt: unknown, mimeType: unknown): true | string {
    const gambar = typeof mimeType === 'string' && mimeType.startsWith('image/')
    if (!gambar) return true
    return typeof alt === 'string' && alt.trim() ? true : 'Alt wajib diisi untuk gambar.'
  }

  export function validasiLebarGambar(
    lebar: number | null | undefined,
    minimal = LEBAR_MINIMAL_GAMBAR_UTAMA,
  ): true | string {
    if (typeof lebar !== 'number') return 'Ukuran gambar tidak diketahui. Unggah ulang gambarnya.'
    if (lebar >= minimal) return true
    return `Gambar utama minimal ${minimal}px lebarnya (sekarang ${lebar}px), syarat tampil besar di Google Discover.`
  }
  ```

  `src/collections/Media.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { anyone, isLoggedIn } from '@/access'
  import { validasiAlt } from '@/lib/media'

  /**
   * Sementara menyimpan file di disk lokal (folder `media/`, tidak di-commit).
   * Rencana 2 memindahkan penyimpanan ke Cloudinary tanpa mengubah field di sini.
   */
  export const Media: CollectionConfig = {
    slug: 'media',
    labels: { singular: 'Media', plural: 'Media' },
    admin: { useAsTitle: 'alt', defaultColumns: ['filename', 'alt', 'width', 'mimeType'], group: 'Konten' },
    access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
    upload: {
      mimeTypes: ['image/*', 'video/mp4', 'video/webm'],
    },
    fields: [
      {
        name: 'alt',
        type: 'text',
        label: 'Teks alternatif',
        admin: { description: 'Jelaskan isi gambar untuk pembaca layar. Wajib untuk gambar.' },
        validate: (value: unknown, { data }: { data: Partial<{ mimeType: string | null }> }) =>
          validasiAlt(value, data?.mimeType),
      },
      { name: 'caption', type: 'text' },
      { name: 'kredit', type: 'text', admin: { description: 'Contoh: Foto: Nama Fotografer / Sumber' } },
    ],
  }
  ```


- [ ] **Langkah 4: Perbarui tipe, jalankan semua tes**

  Jalankan:

  ```bash
  npm run generate:types && npm run typecheck
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: type check bersih; unit `Tests 32 passed (32)`; integrasi `Test Files 4 passed (4)`, `Tests 7 passed (7)`.


- [ ] **Langkah 5: Commit**

  ```bash
  git add -A
  git commit -m "feat: koleksi media dengan alt wajib untuk gambar"
  ```


### Task 6: Tools, parameter tools, video

**Files:**
- Create: `src/fields/konten.ts`, `src/collections/Tools.ts`, `src/collections/ParameterTools.ts`, `src/collections/Video.ts`
- Modify: `src/lib/validasi.ts` (tambah `validasiRentangTanggal`), `src/payload.config.ts`
- Test: `tests/unit/tanggal.test.ts`, `tests/int/tools.int.spec.ts`

**Interfaces:**
- Consumes: `slugField`, `seoField`, `validasiUrlOpsional` (Task 4); `publishedOrLoggedIn`, `isLoggedIn` (Task 3); `TOOL_IDS`, `LABEL_TOOL` (Task 2).
- Produces: `faqField: Field` (array `faq` berisi `pertanyaan`, `jawaban`); `sumberField(name = 'sumber', label = 'Sumber'): Field` (array berisi `judul`, `url`, `penerbit`, `diaksesPada`); `validasiRentangTanggal(mulai, sampai): true | string`; koleksi `tools` (draf, `toolId` unik), `parameter-tools` (`toolId`, `kunci`, `nilai`, `berlakuMulai`, `berlakuSampai`, `sumber`, `catatan`), `video` (draf, `file`, `poster`, `pilar`, `durasiDetik`, `transkrip`).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/tanggal.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { validasiRentangTanggal } from '@/lib/validasi'

  describe('validasiRentangTanggal', () => {
    it('menerima rentang terbuka (tanpa tanggal akhir)', () => {
      expect(validasiRentangTanggal('2026-01-01', undefined)).toBe(true)
      expect(validasiRentangTanggal('2026-01-01', null)).toBe(true)
    })

    it('menerima tanggal akhir yang sama atau sesudah tanggal mulai', () => {
      expect(validasiRentangTanggal('2026-01-01', '2026-01-01')).toBe(true)
      expect(validasiRentangTanggal('2026-01-01', '2026-12-31')).toBe(true)
    })

    it('menolak tanggal akhir sebelum tanggal mulai', () => {
      expect(validasiRentangTanggal('2026-06-01', '2026-01-01')).toBe(
        'Tanggal akhir harus sama atau sesudah tanggal mulai.',
      )
    })
  })
  ```

  `tests/int/tools.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { getTestPayload, pesanGalat, unik } from './helpers'

  describe('tools dan parameter', () => {
    it('menyimpan tools sebagai draf lalu menerbitkannya', async () => {
      const payload = await getTestPayload()
      const pilar = await payload.create({
        collection: 'pilar',
        data: { nama: unik('Uang'), warna: 'hijau', deskripsi: 'Uang.' },
      })
      const draf = await payload.create({
        collection: 'tools',
        draft: true,
        data: { nama: unik('Gaji Bersih') },
      })
      expect(draf._status).toBe('draft')

      const terbit = await payload.update({
        collection: 'tools',
        id: draf.id,
        data: {
          _status: 'published',
          pilar: pilar.id,
          toolId: 'gaji-bersih',
          ringkasan: 'Hitung gaji bersih setelah PPh 21 dan BPJS.',
        },
      })
      expect(terbit._status).toBe('published')
      expect(terbit.slug).toMatch(/^gaji-bersih-/)

      await payload.delete({ collection: 'tools', id: draf.id })
    })

    it('menolak parameter dengan tanggal akhir sebelum tanggal mulai', async () => {
      const payload = await getTestPayload()
      const pesan = await pesanGalat(
        payload.create({
          collection: 'parameter-tools',
          data: {
            toolId: 'thr',
            kunci: unik('contoh'),
            nilai: 1,
            berlakuMulai: '2026-06-01',
            berlakuSampai: '2026-01-01',
          },
        }),
      )
      expect(pesan).toMatch(/Tanggal akhir/)
    })
  })
  ```


- [ ] **Langkah 2: Pastikan tes unit gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/tanggal.test.ts` (`validasiRentangTanggal` belum diekspor).


- [ ] **Langkah 3: Tambah validasi rentang tanggal**

  Ganti seluruh `src/lib/validasi.ts`:

  `src/lib/validasi.ts`

  ```ts
  const PESAN_URL = 'Tulis URL lengkap yang diawali https://'

  export function validasiRentangTanggal(
    mulai: string | Date | null | undefined,
    sampai: string | Date | null | undefined,
  ): true | string {
    if (!mulai || !sampai) return true
    return new Date(sampai).getTime() >= new Date(mulai).getTime()
      ? true
      : 'Tanggal akhir harus sama atau sesudah tanggal mulai.'
  }

  export function validasiUrlOpsional(nilai: unknown): true | string {
    if (nilai === undefined || nilai === null || nilai === '') return true
    if (typeof nilai !== 'string') return PESAN_URL
    try {
      const url = new URL(nilai)
      return url.protocol === 'https:' || url.protocol === 'http:' ? true : PESAN_URL
    } catch {
      return PESAN_URL
    }
  }
  ```


- [ ] **Langkah 4: Buat field konten bersama dan tiga koleksi**

  `src/fields/konten.ts`

  ```ts
  import type { Field } from 'payload'

  import { validasiUrlOpsional } from '@/lib/validasi'

  export const faqField: Field = {
    name: 'faq',
    type: 'array',
    label: 'FAQ',
    labels: { singular: 'Pertanyaan', plural: 'Pertanyaan' },
    fields: [
      { name: 'pertanyaan', type: 'text', required: true },
      { name: 'jawaban', type: 'textarea', required: true },
    ],
  }

  export function sumberField(name = 'sumber', label = 'Sumber'): Field {
    return {
      name,
      type: 'array',
      label,
      labels: { singular: 'Sumber', plural: 'Sumber' },
      admin: { description: 'Sumber resmi atau tepercaya yang dipakai di tulisan ini.' },
      fields: [
        { name: 'judul', type: 'text', required: true },
        {
          name: 'url',
          type: 'text',
          required: true,
          validate: (value: unknown) => validasiUrlOpsional(value),
        },
        { name: 'penerbit', type: 'text', admin: { description: 'Contoh: DJP, BPJS Kesehatan' } },
        { name: 'diaksesPada', type: 'date', label: 'Diakses pada' },
      ],
    }
  }
  ```

  `src/collections/Tools.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isLoggedIn, publishedOrLoggedIn } from '@/access'
  import { faqField, sumberField } from '@/fields/konten'
  import { seoField } from '@/fields/seo'
  import { slugField } from '@/fields/slug'
  import { LABEL_TOOL, TOOL_IDS } from '@/lib/konstanta'

  export const Tools: CollectionConfig = {
    slug: 'tools',
    labels: { singular: 'Tool', plural: 'Tools' },
    admin: { useAsTitle: 'nama', defaultColumns: ['nama', 'toolId', 'pilar', '_status'], group: 'Tools' },
    access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
    versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 50 },
    fields: [
      { name: 'nama', type: 'text', required: true },
      slugField('nama'),
      { name: 'pilar', type: 'relationship', relationTo: 'pilar', required: true },
      {
        name: 'toolId',
        type: 'select',
        label: 'Kalkulator',
        required: true,
        unique: true,
        options: TOOL_IDS.map((id) => ({ value: id, label: LABEL_TOOL[id] })),
        admin: { description: 'Rumus kalkulator yang dipakai halaman ini (modul hitung, Rencana 5).' },
      },
      {
        name: 'ringkasan',
        type: 'textarea',
        required: true,
        admin: { description: 'Satu-dua kalimat di atas kalkulator. Dipakai juga sebagai meta default.' },
      },
      {
        name: 'bantuanInput',
        type: 'array',
        label: 'Bantuan per input',
        fields: [
          { name: 'kunci', type: 'text', required: true, admin: { description: 'Nama input di modul hitung.' } },
          { name: 'label', type: 'text', required: true },
          { name: 'bantuan', type: 'textarea' },
        ],
      },
      { name: 'penjelasan', type: 'richText', label: 'Penjelasan rumus' },
      faqField,
      sumberField('sumberAturan', 'Sumber aturan'),
      seoField,
    ],
  }
  ```

  `src/collections/ParameterTools.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isLoggedIn } from '@/access'
  import { LABEL_TOOL, TOOL_IDS } from '@/lib/konstanta'
  import { validasiRentangTanggal, validasiUrlOpsional } from '@/lib/validasi'

  /** Angka aturan (PTKP, tarif, batas iuran) yang bisa berubah. Dibaca modul hitung sesuai tanggal. */
  export const ParameterTools: CollectionConfig = {
    slug: 'parameter-tools',
    labels: { singular: 'Parameter tools', plural: 'Parameter tools' },
    admin: {
      useAsTitle: 'kunci',
      defaultColumns: ['toolId', 'kunci', 'nilai', 'berlakuMulai', 'berlakuSampai'],
      group: 'Tools',
    },
    access: { read: isLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
    fields: [
      {
        name: 'toolId',
        type: 'select',
        required: true,
        options: TOOL_IDS.map((id) => ({ value: id, label: LABEL_TOOL[id] })),
      },
      { name: 'kunci', type: 'text', required: true, admin: { description: 'Contoh: ptkp-tk0' } },
      { name: 'nilai', type: 'number', required: true },
      { name: 'berlakuMulai', type: 'date', required: true },
      {
        name: 'berlakuSampai',
        type: 'date',
        admin: { description: 'Kosongkan bila masih berlaku.' },
        validate: (
          value: unknown,
          { siblingData }: { siblingData: Partial<{ berlakuMulai: string | null }> },
        ) => validasiRentangTanggal(siblingData?.berlakuMulai, value as string | null | undefined),
      },
      {
        name: 'sumber',
        type: 'group',
        fields: [
          { name: 'judul', type: 'text' },
          { name: 'url', type: 'text', validate: (value: unknown) => validasiUrlOpsional(value) },
        ],
      },
      { name: 'catatan', type: 'textarea' },
    ],
  }
  ```

  `src/collections/Video.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isLoggedIn, publishedOrLoggedIn } from '@/access'
  import { seoField } from '@/fields/seo'
  import { slugField } from '@/fields/slug'

  /** Artikel induk tidak disimpan di sini: frontend mencari artikel yang `videoTerkait`-nya video ini. */
  export const Video: CollectionConfig = {
    slug: 'video',
    labels: { singular: 'Video', plural: 'Video' },
    admin: { useAsTitle: 'judul', defaultColumns: ['judul', 'pilar', 'durasiDetik', '_status'], group: 'Konten' },
    access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
    versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 30 },
    fields: [
      { name: 'judul', type: 'text', required: true },
      slugField('judul'),
      {
        name: 'file',
        type: 'upload',
        relationTo: 'media',
        required: true,
        filterOptions: { mimeType: { contains: 'video' } },
        admin: { description: 'Video vertikal 9:16, 30-60 detik.' },
      },
      {
        name: 'poster',
        type: 'upload',
        relationTo: 'media',
        filterOptions: { mimeType: { contains: 'image' } },
      },
      { name: 'pilar', type: 'relationship', relationTo: 'pilar', required: true },
      { name: 'durasiDetik', type: 'number', label: 'Durasi (detik)', min: 1 },
      { name: 'transkrip', type: 'textarea', required: true },
      seoField,
    ],
  }
  ```


- [ ] **Langkah 5: Daftarkan di config**

  Ganti seluruh `src/payload.config.ts`:

  `src/payload.config.ts`

  ```ts
  import { postgresAdapter } from '@payloadcms/db-postgres'
  import { lexicalEditor } from '@payloadcms/richtext-lexical'
  import path from 'path'
  import { buildConfig } from 'payload'
  import sharp from 'sharp'
  import { fileURLToPath } from 'url'

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
    collections: [Pengguna, Media, Pilar, Subkategori, Penulis, Tools, ParameterTools, Video],
    editor: lexicalEditor(),
    secret: process.env.PAYLOAD_SECRET || '',
    typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
    db: postgresAdapter({
      pool: { connectionString: process.env.DATABASE_URL || '' },
    }),
    sharp,
    plugins: [],
  })
  ```


- [ ] **Langkah 6: Perbarui tipe, jalankan semua tes**

  Jalankan:

  ```bash
  npm run generate:types && npm run typecheck
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: type check bersih; unit `Tests 35 passed (35)`; integrasi `Test Files 5 passed (5)`, `Tests 9 passed (9)`.


- [ ] **Langkah 7: Commit**

  ```bash
  git add -A
  git commit -m "feat: koleksi tools, parameter tools, dan video"
  ```


### Task 7: Artikel

**Files:**
- Create: `src/lib/lexical.ts`, `src/hooks/catatTanggalArtikel.ts`, `src/blocks/artikel.ts`, `src/collections/Artikel.ts`
- Modify: `tests/int/fixtures.ts` (ganti seluruh isi), `src/payload.config.ts`
- Test: `tests/unit/artikel.test.ts`, `tests/unit/lexical.test.ts`, `tests/int/artikel.int.spec.ts`

**Interfaces:**
- Consumes: `slugField`, `seoField` (Task 4); `faqField`, `sumberField` (Task 6); `validasiLebarGambar` (Task 5); `TIPE_ARTIKEL`, `LABEL_TIPE_ARTIKEL` (Task 2); koleksi `video`, `tools` (Task 6).
- Produces: `paragrafLexical(daftarTeks: string[]): IsiLexical`; `hitungTanggal(data, sebelumnya, sekarang: string): { terbitPada?: string; diperbaruiBesar?: string; perubahanBesar?: false }`; blok `callout`, `embedTool`, `embedVideo`, `tabelPerbandingan` (`blokArtikel: Block[]`, juga diekspor satu per satu: `BlokCallout`, `BlokEmbedTool`, `BlokEmbedVideo`, `BlokTabelPerbandingan`); koleksi `artikel` dengan field `judul`, `deck`, `intinya[].poin`, `gambarUtama`, `isi`, `faq`, `sumber`, `videoTerkait`, `toolsTerkait`, `artikelTerkait`, `seo`, `slug`, `tipe`, `pilar`, `subkategori`, `penulis`, `perubahanBesar`, `terbitPada`, `diperbaruiBesar`; fixture `buatGambar`, `siapkanRelasiArtikel`, `dataArtikelTerbit`.

Validasi Payload tidak berjalan saat menyimpan draf, jadi aturan wajib (Intinya 2-4 poin, gambar ≥1200px) berlaku saat terbit.

- [ ] **Langkah 1: Tulis tes yang gagal dan fixture artikel**

  `tests/unit/artikel.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { hitungTanggal } from '@/hooks/catatTanggalArtikel'

  const SEKARANG = '2026-11-04T08:00:00.000Z'

  describe('hitungTanggal', () => {
    it('mengisi terbitPada saat pertama kali terbit', () => {
      expect(hitungTanggal({ _status: 'published' }, undefined, SEKARANG)).toEqual({
        terbitPada: SEKARANG,
      })
    })

    it('tidak mengubah terbitPada pada penerbitan berikutnya', () => {
      expect(
        hitungTanggal({ _status: 'published' }, { terbitPada: '2026-01-01T00:00:00.000Z' }, SEKARANG),
      ).toEqual({})
    })

    it('perubahan besar mengisi diperbaruiBesar dan mematikan saklarnya', () => {
      expect(
        hitungTanggal(
          { _status: 'published', perubahanBesar: true },
          { terbitPada: '2026-01-01T00:00:00.000Z' },
          SEKARANG,
        ),
      ).toEqual({ diperbaruiBesar: SEKARANG, perubahanBesar: false })
    })

    it('tidak melakukan apa pun saat menyimpan draf', () => {
      expect(hitungTanggal({ _status: 'draft', perubahanBesar: true }, undefined, SEKARANG)).toEqual(
        {},
      )
    })
  })
  ```

  `tests/unit/lexical.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { paragrafLexical } from '@/lib/lexical'

  describe('paragrafLexical', () => {
    it('membuat satu paragraf Lexical per teks', () => {
      const isi = paragrafLexical(['Paragraf pertama.', 'Paragraf kedua.'])
      expect(isi.root.type).toBe('root')
      expect(isi.root.children).toHaveLength(2)
      expect(isi.root.children[1]).toMatchObject({
        type: 'paragraph',
        children: [{ type: 'text', text: 'Paragraf kedua.' }],
      })
    })
  })
  ```

  Ganti seluruh `tests/int/fixtures.ts`:

  `tests/int/fixtures.ts`

  ```ts
  import type { Payload } from 'payload'
  import sharp from 'sharp'

  import { paragrafLexical } from '@/lib/lexical'

  import { unik } from './helpers'

  export async function gambarPng(lebar: number, tinggi: number) {
    const data = await sharp({
      create: { width: lebar, height: tinggi, channels: 3, background: '#1F7A4D' },
    })
      .png()
      .toBuffer()
    return { data, mimetype: 'image/png', name: `${unik('tes')}.png`, size: data.length }
  }

  export async function buatGambar(payload: Payload, lebar = 1600, tinggi = 900) {
    return payload.create({
      collection: 'media',
      data: { alt: `Gambar contoh ${lebar}px` },
      file: await gambarPng(lebar, tinggi),
    })
  }

  /** Pilar, penulis, dan gambar yang dibutuhkan artikel terbit. */
  export async function siapkanRelasiArtikel(payload: Payload, lebarGambar = 1600) {
    const pilar = await payload.create({
      collection: 'pilar',
      data: { nama: unik('Uang'), warna: 'hijau', deskripsi: 'Uang dan karier.' },
    })
    const penulis = await payload.create({
      collection: 'penulis',
      data: { nama: unik('Redaksi'), bio: 'Tim redaksi.' },
    })
    const gambar = await buatGambar(payload, lebarGambar)
    return { pilar, penulis, gambar }
  }

  export function dataArtikelTerbit(relasi: { pilar: { id: number }; penulis: { id: number }; gambar: { id: number } }) {
    return {
      _status: 'published' as const,
      judul: unik('Cara hitung gaji bersih'),
      tipe: 'panduan' as const,
      pilar: relasi.pilar.id,
      penulis: relasi.penulis.id,
      deck: 'Potongan PPh 21 dan BPJS dihitung langkah demi langkah.',
      intinya: [
        { poin: 'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS.' },
        { poin: 'Besar PPh 21 bergantung pada status dan tanggungan.' },
      ],
      gambarUtama: relasi.gambar.id,
      isi: paragrafLexical(['Paragraf pembuka artikel contoh.']),
    }
  }
  ```

  `tests/int/artikel.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
  import { getTestPayload, pesanGalat, unik } from './helpers'

  describe('koleksi artikel', () => {
    it('draf boleh belum lengkap dan belum punya tanggal terbit', async () => {
      const payload = await getTestPayload()
      const draf = await payload.create({
        collection: 'artikel',
        draft: true,
        data: { judul: unik('Draf setengah jadi') },
      })
      expect(draf._status).toBe('draft')
      expect(draf.terbitPada).toBeFalsy()
    })

    it('terbit mengisi terbitPada; perubahan besar mengisi diperbaruiBesar', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const artikel = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      expect(artikel.terbitPada).toBeTruthy()
      expect(artikel.diperbaruiBesar).toBeFalsy()

      const diperbarui = await payload.update({
        collection: 'artikel',
        id: artikel.id,
        data: { _status: 'published', perubahanBesar: true },
      })
      expect(diperbarui.terbitPada).toBe(artikel.terbitPada)
      expect(diperbarui.diperbaruiBesar).toBeTruthy()
      expect(diperbarui.perubahanBesar).toBe(false)
    })

    it('menolak terbit dengan kotak Intinya kurang dari 2 poin', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const pesan = await pesanGalat(
        payload.create({
          collection: 'artikel',
          data: { ...dataArtikelTerbit(relasi), intinya: [{ poin: 'Hanya satu poin.' }] },
        }),
      )
      expect(pesan).toMatch(/^intinya:/)
    })

    it('menolak terbit dengan gambar utama di bawah 1200px', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload, 800)
      const pesan = await pesanGalat(
        payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) }),
      )
      expect(pesan).toMatch(/gambarUtama: Gambar utama minimal 1200px/)
    })
  })
  ```


- [ ] **Langkah 2: Pastikan tes unit gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/artikel.test.ts` dan `tests/unit/lexical.test.ts` (modul belum ada).


- [ ] **Langkah 3: Implementasi helper, hook, dan blok**

  `src/lib/lexical.ts`

  ```ts
  /** Struktur minimal Lexical yang diterima field richText Payload. Dipakai seed dan tes. */
  export type IsiLexical = {
    root: {
      type: string
      children: { type: string; version: number; [k: string]: unknown }[]
      direction: 'ltr' | 'rtl' | null
      format: 'left' | 'start' | 'center' | 'right' | 'end' | 'justify' | ''
      indent: number
      version: number
    }
    [k: string]: unknown
  }

  export function paragrafLexical(daftarTeks: string[]): IsiLexical {
    return {
      root: {
        type: 'root',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: daftarTeks.map((text) => ({
          type: 'paragraph',
          format: '',
          indent: 0,
          version: 1,
          direction: 'ltr',
          textFormat: 0,
          textStyle: '',
          children: [{ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 }],
        })),
      },
    }
  }
  ```

  `src/hooks/catatTanggalArtikel.ts`

  ```ts
  import type { CollectionBeforeChangeHook } from 'payload'

  type DataTanggal = {
    _status?: 'draft' | 'published' | null
    perubahanBesar?: boolean | null
    terbitPada?: string | null
  }

  type PerubahanTanggal = {
    terbitPada?: string
    diperbaruiBesar?: string
    perubahanBesar?: false
  }

  /**
   * Tanggal hanya berubah saat dokumen diterbitkan.
   * `diperbaruiBesar` menjadi `lastmod` sitemap, jadi hanya diisi bila editor menandai perubahan besar.
   */
  export function hitungTanggal(
    data: DataTanggal,
    sebelumnya: DataTanggal | undefined,
    sekarang: string,
  ): PerubahanTanggal {
    if (data._status !== 'published') return {}
    const hasil: PerubahanTanggal = {}
    if (!sebelumnya?.terbitPada && !data.terbitPada) hasil.terbitPada = sekarang
    if (data.perubahanBesar === true) {
      hasil.diperbaruiBesar = sekarang
      hasil.perubahanBesar = false
    }
    return hasil
  }

  export const catatTanggalArtikel: CollectionBeforeChangeHook = ({ data, originalDoc }) => ({
    ...data,
    ...hitungTanggal(data, originalDoc, new Date().toISOString()),
  })
  ```

  `src/blocks/artikel.ts`

  ```ts
  import type { Block } from 'payload'

  export const BlokCallout: Block = {
    slug: 'callout',
    interfaceName: 'BlokCallout',
    labels: { singular: 'Callout', plural: 'Callout' },
    fields: [
      {
        name: 'gaya',
        type: 'select',
        required: true,
        defaultValue: 'info',
        options: [
          { label: 'Info', value: 'info' },
          { label: 'Tips', value: 'tips' },
          { label: 'Peringatan', value: 'peringatan' },
        ],
      },
      { name: 'judul', type: 'text' },
      { name: 'isi', type: 'textarea', required: true },
    ],
  }

  export const BlokEmbedTool: Block = {
    slug: 'embedTool',
    interfaceName: 'BlokEmbedTool',
    labels: { singular: 'Embed tool', plural: 'Embed tool' },
    fields: [{ name: 'tool', type: 'relationship', relationTo: 'tools', required: true }],
  }

  export const BlokEmbedVideo: Block = {
    slug: 'embedVideo',
    interfaceName: 'BlokEmbedVideo',
    labels: { singular: 'Embed video', plural: 'Embed video' },
    fields: [{ name: 'video', type: 'relationship', relationTo: 'video', required: true }],
  }

  export const BlokTabelPerbandingan: Block = {
    slug: 'tabelPerbandingan',
    interfaceName: 'BlokTabelPerbandingan',
    labels: { singular: 'Tabel perbandingan', plural: 'Tabel perbandingan' },
    fields: [
      { name: 'judul', type: 'text' },
      {
        name: 'kolom',
        type: 'array',
        required: true,
        minRows: 2,
        fields: [{ name: 'label', type: 'text', required: true }],
      },
      {
        name: 'baris',
        type: 'array',
        required: true,
        minRows: 1,
        fields: [
          {
            name: 'sel',
            type: 'array',
            required: true,
            fields: [{ name: 'teks', type: 'text', required: true }],
          },
        ],
      },
    ],
  }

  /** Blok yang bisa disisipkan di tengah isi artikel. */
  export const blokArtikel: Block[] = [BlokCallout, BlokEmbedTool, BlokEmbedVideo, BlokTabelPerbandingan]
  ```


- [ ] **Langkah 4: Buat koleksi artikel**

  `src/collections/Artikel.ts`

  ```ts
  import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
  import type { CollectionConfig, PayloadRequest } from 'payload'

  import { isLoggedIn, publishedOrLoggedIn } from '@/access'
  import { blokArtikel } from '@/blocks/artikel'
  import { faqField, sumberField } from '@/fields/konten'
  import { seoField } from '@/fields/seo'
  import { slugField } from '@/fields/slug'
  import { catatTanggalArtikel } from '@/hooks/catatTanggalArtikel'
  import { LABEL_TIPE_ARTIKEL, TIPE_ARTIKEL } from '@/lib/konstanta'
  import { validasiLebarGambar } from '@/lib/media'

  async function validasiGambarUtama(value: unknown, { req }: { req: PayloadRequest }) {
    if (!value) return 'Gambar utama wajib diisi.'
    const id = typeof value === 'object' ? (value as { id: number }).id : (value as number)
    const media = await req.payload.findByID({ collection: 'media', id, depth: 0, req })
    return validasiLebarGambar(media.width)
  }

  export const Artikel: CollectionConfig = {
    slug: 'artikel',
    labels: { singular: 'Artikel', plural: 'Artikel' },
    admin: {
      useAsTitle: 'judul',
      defaultColumns: ['judul', 'tipe', 'pilar', '_status', 'updatedAt'],
      group: 'Konten',
    },
    access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
    versions: {
      drafts: { autosave: { interval: 1500 }, schedulePublish: true },
      maxPerDoc: 50,
    },
    hooks: {
      beforeChange: [catatTanggalArtikel],
    },
    fields: [
      { name: 'judul', type: 'text', required: true },
      {
        type: 'tabs',
        tabs: [
          {
            label: 'Konten',
            fields: [
              { name: 'deck', type: 'textarea', required: true, admin: { description: 'Satu-dua kalimat di bawah judul.' } },
              {
                name: 'intinya',
                type: 'array',
                label: 'Intinya',
                required: true,
                minRows: 2,
                maxRows: 4,
                labels: { singular: 'Poin', plural: 'Poin' },
                admin: { description: 'Dua sampai empat poin jawaban langsung. Wajib sebelum terbit.' },
                fields: [{ name: 'poin', type: 'text', required: true, maxLength: 220 }],
              },
              {
                name: 'gambarUtama',
                type: 'upload',
                relationTo: 'media',
                required: true,
                filterOptions: { mimeType: { contains: 'image' } },
                admin: { description: 'Minimal 1200px lebarnya.' },
                validate: validasiGambarUtama,
              },
              {
                name: 'isi',
                type: 'richText',
                required: true,
                editor: lexicalEditor({
                  features: ({ defaultFeatures }) => [
                    ...defaultFeatures,
                    BlocksFeature({ blocks: blokArtikel }),
                  ],
                }),
              },
              faqField,
              sumberField(),
            ],
          },
          {
            label: 'Relasi',
            fields: [
              { name: 'videoTerkait', type: 'relationship', relationTo: 'video' },
              { name: 'toolsTerkait', type: 'relationship', relationTo: 'tools', hasMany: true },
              {
                name: 'artikelTerkait',
                type: 'relationship',
                relationTo: 'artikel',
                hasMany: true,
                filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
              },
            ],
          },
          { label: 'SEO', fields: [seoField] },
        ],
      },
      slugField('judul'),
      {
        name: 'tipe',
        type: 'select',
        required: true,
        defaultValue: 'panduan',
        options: TIPE_ARTIKEL.map((value) => ({ value, label: LABEL_TIPE_ARTIKEL[value] })),
        admin: { position: 'sidebar' },
      },
      { name: 'pilar', type: 'relationship', relationTo: 'pilar', required: true, admin: { position: 'sidebar' } },
      {
        name: 'subkategori',
        type: 'relationship',
        relationTo: 'subkategori',
        admin: { position: 'sidebar' },
        filterOptions: ({ data }) => (data?.pilar ? { pilar: { equals: data.pilar } } : true),
      },
      { name: 'penulis', type: 'relationship', relationTo: 'penulis', required: true, admin: { position: 'sidebar' } },
      {
        name: 'perubahanBesar',
        type: 'checkbox',
        label: 'Perubahan besar',
        defaultValue: false,
        admin: {
          position: 'sidebar',
          description: 'Centang bila isi berubah signifikan. Tanggal "Diperbarui" dan lastmod sitemap ikut berubah saat terbit.',
        },
      },
      { name: 'terbitPada', type: 'date', admin: { position: 'sidebar', readOnly: true } },
      { name: 'diperbaruiBesar', type: 'date', label: 'Diperbarui', admin: { position: 'sidebar', readOnly: true } },
    ],
  }
  ```


- [ ] **Langkah 5: Daftarkan di config**

  Ganti seluruh `src/payload.config.ts`:

  `src/payload.config.ts`

  ```ts
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
  ```


- [ ] **Langkah 6: Perbarui tipe dan import map, jalankan semua tes**

  Jalankan:

  ```bash
  npm run generate:types && npm run generate:importmap && npm run typecheck
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: import map ditulis ke `src/app/(payload)/admin/importMap.js`; type check bersih; unit `Tests 40 passed (40)`; integrasi `Test Files 6 passed (6)`, `Tests 13 passed (13)`.


- [ ] **Langkah 7: Commit**

  ```bash
  git add -A
  git commit -m "feat: koleksi artikel dengan kotak Intinya, blok isi, dan tanggal terbit"
  ```


### Task 8: Halaman, redirect otomatis, slug tingkat atas

**Files:**
- Create: `src/lib/redirect.ts`, `src/hooks/slugTingkatAtas.ts`, `src/hooks/redirectSaatPathBerubah.ts`, `src/blocks/halaman.ts`, `src/collections/Halaman.ts`, `src/collections/Redirect.ts`, `src/collections/Log404.ts`
- Modify (ganti seluruh isi): `src/fields/slug.ts`, `src/collections/Artikel.ts`, `src/collections/Pilar.ts`, `src/collections/Tools.ts`, `src/collections/Video.ts`, `src/collections/Penulis.ts`, `src/payload.config.ts`
- Test: `tests/unit/redirect.test.ts`, `tests/int/slug-redirect.int.spec.ts`

**Interfaces:**
- Consumes: `pathFor`, `TargetPath` (Task 2); `slugField` (Task 4); semua koleksi Task 4-7; fixture `siapkanRelasiArtikel`, `dataArtikelTerbit` (Task 7).
- Produces: `rencanaRedirect(pathLama: string, pathBaru: string, ada: RedirectAda[]): RencanaRedirect` dengan `RencanaRedirect = { buat: { dari: string; ke: string }[]; ubah: { id; ke: string }[]; hapus: id[] }`; `validasiPathRedirect(nilai: unknown): true | string`; `KOLEKSI_TINGKAT_ATAS = ['artikel', 'pilar', 'halaman']`; `cariBentrokTingkatAtas(req, slug, sendiri: { koleksi; id? }): Promise<string | null>`; `slugField(sumber = 'judul', opsi: OpsiSlug = {})` dengan `OpsiSlug = { tingkatAtas?: { koleksi: KoleksiTingkatAtas; berlaku?: (data) => boolean } }`; `redirectSaatPathBerubah(keTarget): { catatPathPublik: CollectionBeforeChangeHook; buatRedirect: CollectionAfterChangeHook }`; `targetSederhana(jenis)`; koleksi `halaman` (blok `hero`, `teks`, `kartu`, `cta`, `faqBlok`, `embedTool`), `redirect` (`dari`, `kode` 301/410, `ke`, `sumber`, `jumlahHit`), `log-404` (`path`, `jumlah`, `terakhir`, `referer`).

Kenapa dua hook: saat dokumen diterbitkan setelah ada draf, `previousDoc` di afterChange berisi draf terakhir, bukan versi yang sedang publik (sudah diverifikasi). Path publik dicatat di beforeChange (dokumen utama belum ditimpa) lewat `req.context`, lalu dibandingkan di afterChange.

Subkategori tidak mendapat redirect otomatis di MVP (path-nya bergantung pada slug pilar). Redirect manual tetap bisa dibuat di koleksi `redirect`.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/redirect.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { rencanaRedirect, validasiPathRedirect } from '@/lib/redirect'

  describe('validasiPathRedirect', () => {
    it('menerima path yang diawali garis miring', () => {
      expect(validasiPathRedirect('/judul-lama')).toBe(true)
      expect(validasiPathRedirect('/')).toBe(true)
    })

    it('menolak URL lengkap, path tanpa garis miring, dan garis miring di akhir', () => {
      expect(validasiPathRedirect('https://point.lat/a')).toBe(
        'Tulis path yang diawali "/", contoh: /judul-lama',
      )
      expect(validasiPathRedirect('judul')).toBe('Tulis path yang diawali "/", contoh: /judul-lama')
      expect(validasiPathRedirect('//evil.com')).toBe('Tulis path yang diawali "/", contoh: /judul-lama')
      expect(validasiPathRedirect('/judul/')).toBe('Hapus garis miring di akhir path.')
    })
  })

  describe('rencanaRedirect', () => {
    it('tidak melakukan apa pun bila path tidak berubah', () => {
      expect(rencanaRedirect('/a', '/a', [])).toEqual({ buat: [], ubah: [], hapus: [] })
    })

    it('membuat redirect dari path lama ke path baru', () => {
      expect(rencanaRedirect('/lama', '/baru', [])).toEqual({
        buat: [{ dari: '/lama', ke: '/baru' }],
        ubah: [],
        hapus: [],
      })
    })

    it('meratakan rantai: redirect lama yang menuju path lama diarahkan ke path baru', () => {
      const ada = [{ id: 1, dari: '/pertama', ke: '/lama' }]
      expect(rencanaRedirect('/lama', '/baru', ada)).toEqual({
        buat: [{ dari: '/lama', ke: '/baru' }],
        ubah: [{ id: 1, ke: '/baru' }],
        hapus: [],
      })
    })

    it('menghapus redirect yang berasal dari path baru supaya tidak berputar', () => {
      const ada = [{ id: 5, dari: '/a', ke: '/b' }]
      expect(rencanaRedirect('/b', '/a', ada)).toEqual({
        buat: [{ dari: '/b', ke: '/a' }],
        ubah: [],
        hapus: [5],
      })
    })

    it('memperbarui redirect yang sudah berasal dari path lama, bukan membuat duplikat', () => {
      const ada = [{ id: 9, dari: '/lama', ke: '/entah' }]
      expect(rencanaRedirect('/lama', '/baru', ada)).toEqual({
        buat: [],
        ubah: [{ id: 9, ke: '/baru' }],
        hapus: [],
      })
    })
  })
  ```

  `tests/int/slug-redirect.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
  import { getTestPayload, pesanGalat, unik } from './helpers'

  describe('slug tingkat atas', () => {
    it('halaman dan artikel non-glosarium tidak boleh memakai slug pilar', async () => {
      const payload = await getTestPayload()
      const slug = unik('bentrok')
      await payload.create({
        collection: 'pilar',
        data: { nama: 'Bentrok', slug, warna: 'koral', deskripsi: 'x' },
      })

      const pesanHalaman = await pesanGalat(
        payload.create({ collection: 'halaman', data: { _status: 'published', judul: 'Tentang', slug } }),
      )
      expect(pesanHalaman).toMatch(/slug: .*sudah dipakai pilar/)

      const relasi = await siapkanRelasiArtikel(payload)
      const pesanArtikel = await pesanGalat(
        payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), slug } }),
      )
      expect(pesanArtikel).toMatch(/slug: .*sudah dipakai pilar/)
    })

    it('artikel glosarium boleh memakai slug yang sama karena berada di /glosarium', async () => {
      const payload = await getTestPayload()
      const slug = unik('istilah')
      await payload.create({
        collection: 'pilar',
        data: { nama: 'Istilah', slug, warna: 'kuning', deskripsi: 'x' },
      })
      const relasi = await siapkanRelasiArtikel(payload)
      const glosarium = await payload.create({
        collection: 'artikel',
        data: { ...dataArtikelTerbit(relasi), slug, tipe: 'glosarium' },
      })
      expect(glosarium.slug).toBe(slug)
    })
  })

  describe('redirect otomatis', () => {
    it('mengganti slug artikel terbit membuat redirect 301', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const artikel = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      const slugBaru = unik('judul-baru')

      await payload.update({
        collection: 'artikel',
        id: artikel.id,
        data: { _status: 'published', slug: slugBaru },
      })

      const { docs } = await payload.find({
        collection: 'redirect',
        where: { dari: { equals: `/${artikel.slug}` } },
      })
      expect(docs).toHaveLength(1)
      expect(docs[0]).toMatchObject({ ke: `/${slugBaru}`, kode: '301', sumber: 'otomatis' })
    })

    it('slug yang berubah lewat draf baru membuat redirect saat diterbitkan', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const artikel = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      const slugBaru = unik('lewat-draf')

      await payload.update({ collection: 'artikel', id: artikel.id, draft: true, data: { slug: slugBaru } })
      const sebelumTerbit = await payload.find({
        collection: 'redirect',
        where: { dari: { equals: `/${artikel.slug}` } },
      })
      expect(sebelumTerbit.docs).toHaveLength(0)

      await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'published' } })
      const setelahTerbit = await payload.find({
        collection: 'redirect',
        where: { dari: { equals: `/${artikel.slug}` } },
      })
      expect(setelahTerbit.docs[0]?.ke).toBe(`/${slugBaru}`)
    })
  })
  ```


- [ ] **Langkah 2: Pastikan tes unit gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/redirect.test.ts` (`@/lib/redirect` belum ada).


- [ ] **Langkah 3: Implementasi rencana redirect dan cek slug lintas koleksi**

  `src/lib/redirect.ts`

  ```ts
  export type RedirectAda = { id: number | string; dari: string; ke?: string | null }

  export type RencanaRedirect = {
    buat: { dari: string; ke: string }[]
    ubah: { id: RedirectAda['id']; ke: string }[]
    hapus: RedirectAda['id'][]
  }

  /**
   * Menghitung perubahan tabel redirect saat path publik sebuah dokumen berubah.
   * Menjaga tiga hal: path lama mengarah ke path baru, tidak ada rantai redirect, tidak ada putaran.
   */
  export function rencanaRedirect(
    pathLama: string,
    pathBaru: string,
    ada: RedirectAda[],
  ): RencanaRedirect {
    const rencana: RencanaRedirect = { buat: [], ubah: [], hapus: [] }
    if (pathLama === pathBaru) return rencana

    for (const r of ada) {
      if (r.dari === pathBaru) rencana.hapus.push(r.id)
    }

    const tersisa = ada.filter((r) => r.dari !== pathBaru)
    for (const r of tersisa) {
      if (r.dari === pathLama || r.ke === pathLama) {
        if (r.ke !== pathBaru) rencana.ubah.push({ id: r.id, ke: pathBaru })
      }
    }

    if (!tersisa.some((r) => r.dari === pathLama)) {
      rencana.buat.push({ dari: pathLama, ke: pathBaru })
    }

    return rencana
  }

  export function validasiPathRedirect(nilai: unknown): true | string {
    if (typeof nilai !== 'string' || !nilai.startsWith('/') || nilai.startsWith('//')) {
      return 'Tulis path yang diawali "/", contoh: /judul-lama'
    }
    if (nilai.length > 1 && nilai.endsWith('/')) return 'Hapus garis miring di akhir path.'
    return true
  }
  ```

  `src/hooks/slugTingkatAtas.ts`

  ```ts
  import type { PayloadRequest, Where } from 'payload'

  /** Koleksi yang path-nya `/{slug}` sehingga slugnya harus unik lintas koleksi. */
  export const KOLEKSI_TINGKAT_ATAS = ['artikel', 'pilar', 'halaman'] as const
  export type KoleksiTingkatAtas = (typeof KOLEKSI_TINGKAT_ATAS)[number]

  export async function cariBentrokTingkatAtas(
    req: PayloadRequest,
    slug: string,
    sendiri: { koleksi: KoleksiTingkatAtas; id?: number | string },
  ): Promise<string | null> {
    for (const koleksi of KOLEKSI_TINGKAT_ATAS) {
      const syarat: Where[] = [{ slug: { equals: slug } }]
      if (koleksi === sendiri.koleksi && sendiri.id !== undefined) {
        syarat.push({ id: { not_equals: sendiri.id } })
      }
      if (koleksi === 'artikel') syarat.push({ tipe: { not_equals: 'glosarium' } })

      const { totalDocs } = await req.payload.count({ collection: koleksi, where: { and: syarat }, req })
      if (totalDocs > 0) return `Slug "${slug}" sudah dipakai ${koleksi} lain. Pilih slug lain.`
    }
    return null
  }
  ```

  `src/hooks/redirectSaatPathBerubah.ts`

  ```ts
  import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'

  import { pathFor, type TargetPath } from '@/lib/paths'
  import { rencanaRedirect } from '@/lib/redirect'

  type DokumenBerpath = { slug?: string | null; _status?: 'draft' | 'published' | null } & Record<
    string,
    unknown
  >

  type KeTarget = (doc: DokumenBerpath) => TargetPath | null

  const kunciKonteks = (koleksi: string, id: unknown) => `pathPublik:${koleksi}:${String(id)}`

  /**
   * Membuat redirect 301 saat dokumen yang sudah publik diterbitkan dengan path berbeda.
   *
   * Dua hook karena saat terbit setelah draf, `previousDoc` di afterChange berisi draf terakhir,
   * bukan versi yang sedang publik. Jadi path publik dicatat di beforeChange (dokumen utama belum
   * ditimpa), lalu dibandingkan di afterChange.
   */
  export function redirectSaatPathBerubah(keTarget: KeTarget): {
    catatPathPublik: CollectionBeforeChangeHook
    buatRedirect: CollectionAfterChangeHook
  } {
    const catatPathPublik: CollectionBeforeChangeHook = async ({
      data,
      originalDoc,
      operation,
      req,
      collection,
    }) => {
      const pakaiDraf = Boolean(collection.versions?.drafts)
      if (operation !== 'update' || !originalDoc) return data
      if (pakaiDraf && data._status !== 'published') return data

      const publik = pakaiDraf
        ? await req.payload.findByID({
            collection: collection.slug as 'artikel',
            id: originalDoc.id,
            draft: false,
            depth: 0,
            req,
            disableErrors: true,
          })
        : originalDoc
      if (!publik || (pakaiDraf && publik._status !== 'published')) return data

      const target = keTarget(publik as DokumenBerpath)
      if (target) req.context[kunciKonteks(collection.slug, originalDoc.id)] = pathFor(target)
      return data
    }

    const buatRedirect: CollectionAfterChangeHook = async ({ doc, req, collection }) => {
      const kunci = kunciKonteks(collection.slug, doc.id)
      const pathLama = req.context[kunci] as string | undefined
      if (!pathLama) return doc
      delete req.context[kunci]

      const targetBaru = keTarget(doc)
      if (!targetBaru) return doc
      const pathBaru = pathFor(targetBaru)
      if (pathLama === pathBaru) return doc

      const { docs } = await req.payload.find({
        collection: 'redirect',
        where: {
          or: [{ dari: { equals: pathBaru } }, { dari: { equals: pathLama } }, { ke: { equals: pathLama } }],
        },
        limit: 100,
        depth: 0,
        req,
      })
      const rencana = rencanaRedirect(pathLama, pathBaru, docs)

      for (const id of rencana.hapus) {
        await req.payload.delete({ collection: 'redirect', id, req })
      }
      for (const { id, ke } of rencana.ubah) {
        await req.payload.update({ collection: 'redirect', id, data: { ke, kode: '301' }, req })
      }
      for (const { dari, ke } of rencana.buat) {
        await req.payload.create({
          collection: 'redirect',
          data: { dari, ke, kode: '301', sumber: 'otomatis' },
          req,
        })
      }
      return doc
    }

    return { catatPathPublik, buatRedirect }
  }

  /** Target untuk koleksi berpath sederhana (`pilar`, `halaman`, `tools`, `video`, `penulis`). */
  export const targetSederhana =
    (jenis: 'pilar' | 'halaman' | 'tools' | 'video' | 'penulis'): KeTarget =>
    (doc) =>
      doc.slug ? { jenis, slug: doc.slug } : null
  ```


- [ ] **Langkah 4: Perluas `slugField` dengan opsi tingkat atas**

  Ganti seluruh `src/fields/slug.ts`. Cek database dilewati saat `event === 'onChange'` supaya admin tidak menembak query di setiap ketikan.

  `src/fields/slug.ts`

  ```ts
  import type { Field, PayloadRequest } from 'payload'

  import { cariBentrokTingkatAtas, type KoleksiTingkatAtas } from '@/hooks/slugTingkatAtas'
  import { buatSlug, validasiFormatSlug } from '@/lib/slug'

  export type OpsiSlug = {
    /** Isi untuk koleksi yang path-nya `/{slug}`. `berlaku` menentukan dokumen mana yang dicek. */
    tingkatAtas?: {
      koleksi: KoleksiTingkatAtas
      berlaku?: (data: Partial<Record<string, unknown>>) => boolean
    }
  }

  type OpsiValidasi = {
    data: Partial<Record<string, unknown>>
    id?: number | string
    req: PayloadRequest
    event?: 'onChange' | 'submit'
  }

  /**
   * Field slug standar: dibuat dari `sumber` bila kosong, unik per koleksi, format divalidasi.
   * Tidak memakai `required` supaya tipe data boleh tanpa slug; `validasiFormatSlug` yang menolak slug kosong.
   */
  export function slugField(sumber = 'judul', opsi: OpsiSlug = {}): Field {
    return {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Dibuat otomatis dari judul. Mengubahnya setelah terbit membuat redirect 301.',
      },
      hooks: {
        beforeValidate: [
          ({ value, data, originalDoc }) =>
            buatSlug(value, data?.[sumber] ?? originalDoc?.[sumber]),
        ],
      },
      validate: async (value: unknown, { data, id, req, event }: OpsiValidasi) => {
        const format = validasiFormatSlug(value)
        if (format !== true) return format

        const tingkatAtas = opsi.tingkatAtas
        if (!tingkatAtas || event === 'onChange') return true
        if (tingkatAtas.berlaku && !tingkatAtas.berlaku(data)) return true

        const bentrok = await cariBentrokTingkatAtas(req, value as string, {
          koleksi: tingkatAtas.koleksi,
          id,
        })
        return bentrok ?? true
      },
    }
  }
  ```


- [ ] **Langkah 5: Buat koleksi halaman, redirect, log 404**

  `src/blocks/halaman.ts`

  ```ts
  import type { Block } from 'payload'

  import { faqField } from '@/fields/konten'

  import { BlokEmbedTool } from './artikel'

  export const BlokHero: Block = {
    slug: 'hero',
    interfaceName: 'BlokHero',
    labels: { singular: 'Hero', plural: 'Hero' },
    fields: [
      { name: 'judul', type: 'text', required: true },
      { name: 'subjudul', type: 'textarea' },
      { name: 'gambar', type: 'upload', relationTo: 'media' },
    ],
  }

  export const BlokTeks: Block = {
    slug: 'teks',
    interfaceName: 'BlokTeks',
    labels: { singular: 'Teks', plural: 'Teks' },
    fields: [{ name: 'isi', type: 'richText', required: true }],
  }

  export const BlokKartu: Block = {
    slug: 'kartu',
    interfaceName: 'BlokKartu',
    labels: { singular: 'Kartu', plural: 'Kartu' },
    fields: [
      { name: 'judul', type: 'text' },
      {
        name: 'kartu',
        type: 'array',
        required: true,
        minRows: 1,
        fields: [
          { name: 'judul', type: 'text', required: true },
          { name: 'teks', type: 'textarea' },
          { name: 'tautan', type: 'text' },
        ],
      },
    ],
  }

  export const BlokCta: Block = {
    slug: 'cta',
    interfaceName: 'BlokCta',
    labels: { singular: 'Ajakan (CTA)', plural: 'Ajakan (CTA)' },
    fields: [
      { name: 'judul', type: 'text', required: true },
      { name: 'teks', type: 'textarea' },
      { name: 'labelTombol', type: 'text', required: true },
      { name: 'tautan', type: 'text', required: true },
    ],
  }

  export const BlokFaq: Block = {
    slug: 'faqBlok',
    interfaceName: 'BlokFaq',
    labels: { singular: 'FAQ', plural: 'FAQ' },
    fields: [{ name: 'judul', type: 'text' }, faqField],
  }

  /** Blok page builder untuk koleksi halaman. */
  export const blokHalaman: Block[] = [BlokHero, BlokTeks, BlokKartu, BlokCta, BlokFaq, BlokEmbedTool]
  ```

  `src/collections/Halaman.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isLoggedIn, publishedOrLoggedIn } from '@/access'
  import { blokHalaman } from '@/blocks/halaman'
  import { seoField } from '@/fields/seo'
  import { slugField } from '@/fields/slug'
  import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'

  const redirect = redirectSaatPathBerubah(targetSederhana('halaman'))

  export const Halaman: CollectionConfig = {
    slug: 'halaman',
    labels: { singular: 'Halaman', plural: 'Halaman' },
    admin: { useAsTitle: 'judul', defaultColumns: ['judul', 'slug', '_status'], group: 'Konten' },
    access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
    versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 30 },
    hooks: {
      beforeChange: [redirect.catatPathPublik],
      afterChange: [redirect.buatRedirect],
    },
    fields: [
      { name: 'judul', type: 'text', required: true },
      slugField('judul', { tingkatAtas: { koleksi: 'halaman' } }),
      { name: 'tataLetak', type: 'blocks', label: 'Tata letak', blocks: blokHalaman },
      seoField,
    ],
  }
  ```

  `src/collections/Redirect.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isLoggedIn } from '@/access'
  import { validasiPathRedirect } from '@/lib/redirect'
  import { validasiUrlOpsional } from '@/lib/validasi'

  export const Redirect: CollectionConfig = {
    slug: 'redirect',
    labels: { singular: 'Redirect', plural: 'Redirect' },
    admin: { useAsTitle: 'dari', defaultColumns: ['dari', 'ke', 'kode', 'sumber', 'jumlahHit'], group: 'SEO' },
    access: { read: isLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
    fields: [
      {
        name: 'dari',
        type: 'text',
        required: true,
        unique: true,
        index: true,
        validate: (value: unknown) => validasiPathRedirect(value),
      },
      {
        name: 'kode',
        type: 'select',
        required: true,
        defaultValue: '301',
        options: [
          { label: '301 Pindah permanen', value: '301' },
          { label: '410 Dihapus permanen', value: '410' },
        ],
      },
      {
        name: 'ke',
        type: 'text',
        admin: { condition: (_, siblingData) => siblingData?.kode !== '410' },
        validate: (value: unknown, { siblingData }: { siblingData: Partial<{ kode: string }> }) => {
          if (siblingData?.kode === '410') return true
          if (typeof value === 'string' && value.startsWith('http')) return validasiUrlOpsional(value)
          return validasiPathRedirect(value)
        },
      },
      {
        name: 'sumber',
        type: 'select',
        defaultValue: 'manual',
        options: [
          { label: 'Otomatis', value: 'otomatis' },
          { label: 'Manual', value: 'manual' },
        ],
        admin: { position: 'sidebar', readOnly: true },
      },
      { name: 'jumlahHit', type: 'number', defaultValue: 0, admin: { position: 'sidebar', readOnly: true } },
    ],
  }
  ```

  `src/collections/Log404.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isLoggedIn } from '@/access'

  /** Diisi server saat halaman 404 dirender (Rencana 4). Editor bisa menjadikannya redirect. */
  export const Log404: CollectionConfig = {
    slug: 'log-404',
    labels: { singular: 'Log 404', plural: 'Log 404' },
    defaultSort: '-jumlah',
    admin: { useAsTitle: 'path', defaultColumns: ['path', 'jumlah', 'terakhir', 'referer'], group: 'SEO' },
    access: { read: isLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
    fields: [
      { name: 'path', type: 'text', required: true, unique: true, index: true },
      { name: 'jumlah', type: 'number', defaultValue: 1 },
      { name: 'terakhir', type: 'date' },
      { name: 'referer', type: 'text' },
    ],
  }
  ```


- [ ] **Langkah 6: Pasang hook redirect dan slug tingkat atas di koleksi yang sudah ada**

  Ganti seluruh isi kelima file berikut.

  `src/collections/Artikel.ts`

  ```ts
  import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
  import type { CollectionConfig, PayloadRequest } from 'payload'

  import { isLoggedIn, publishedOrLoggedIn } from '@/access'
  import { blokArtikel } from '@/blocks/artikel'
  import { faqField, sumberField } from '@/fields/konten'
  import { seoField } from '@/fields/seo'
  import { slugField } from '@/fields/slug'
  import { catatTanggalArtikel } from '@/hooks/catatTanggalArtikel'
  import { redirectSaatPathBerubah } from '@/hooks/redirectSaatPathBerubah'
  import { LABEL_TIPE_ARTIKEL, TIPE_ARTIKEL, type TipeArtikel } from '@/lib/konstanta'
  import { validasiLebarGambar } from '@/lib/media'
  import type { TargetPath } from '@/lib/paths'

  async function validasiGambarUtama(value: unknown, { req }: { req: PayloadRequest }) {
    if (!value) return 'Gambar utama wajib diisi.'
    const id = typeof value === 'object' ? (value as { id: number }).id : (value as number)
    const media = await req.payload.findByID({ collection: 'media', id, depth: 0, req })
    return validasiLebarGambar(media.width)
  }

  const targetArtikel = (doc: { slug?: string | null; tipe?: unknown }): TargetPath | null =>
    doc.slug && doc.tipe ? { jenis: 'artikel', slug: doc.slug, tipe: doc.tipe as TipeArtikel } : null

  const redirect = redirectSaatPathBerubah(targetArtikel)

  export const Artikel: CollectionConfig = {
    slug: 'artikel',
    labels: { singular: 'Artikel', plural: 'Artikel' },
    admin: {
      useAsTitle: 'judul',
      defaultColumns: ['judul', 'tipe', 'pilar', '_status', 'updatedAt'],
      group: 'Konten',
    },
    access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
    versions: {
      drafts: { autosave: { interval: 1500 }, schedulePublish: true },
      maxPerDoc: 50,
    },
    hooks: {
      beforeChange: [catatTanggalArtikel, redirect.catatPathPublik],
      afterChange: [redirect.buatRedirect],
    },
    fields: [
      { name: 'judul', type: 'text', required: true },
      {
        type: 'tabs',
        tabs: [
          {
            label: 'Konten',
            fields: [
              { name: 'deck', type: 'textarea', required: true, admin: { description: 'Satu-dua kalimat di bawah judul.' } },
              {
                name: 'intinya',
                type: 'array',
                label: 'Intinya',
                required: true,
                minRows: 2,
                maxRows: 4,
                labels: { singular: 'Poin', plural: 'Poin' },
                admin: { description: 'Dua sampai empat poin jawaban langsung. Wajib sebelum terbit.' },
                fields: [{ name: 'poin', type: 'text', required: true, maxLength: 220 }],
              },
              {
                name: 'gambarUtama',
                type: 'upload',
                relationTo: 'media',
                required: true,
                filterOptions: { mimeType: { contains: 'image' } },
                admin: { description: 'Minimal 1200px lebarnya.' },
                validate: validasiGambarUtama,
              },
              {
                name: 'isi',
                type: 'richText',
                required: true,
                editor: lexicalEditor({
                  features: ({ defaultFeatures }) => [
                    ...defaultFeatures,
                    BlocksFeature({ blocks: blokArtikel }),
                  ],
                }),
              },
              faqField,
              sumberField(),
            ],
          },
          {
            label: 'Relasi',
            fields: [
              { name: 'videoTerkait', type: 'relationship', relationTo: 'video' },
              { name: 'toolsTerkait', type: 'relationship', relationTo: 'tools', hasMany: true },
              {
                name: 'artikelTerkait',
                type: 'relationship',
                relationTo: 'artikel',
                hasMany: true,
                filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
              },
            ],
          },
          { label: 'SEO', fields: [seoField] },
        ],
      },
      slugField('judul', {
        tingkatAtas: { koleksi: 'artikel', berlaku: (data) => data?.tipe !== 'glosarium' },
      }),
      {
        name: 'tipe',
        type: 'select',
        required: true,
        defaultValue: 'panduan',
        options: TIPE_ARTIKEL.map((value) => ({ value, label: LABEL_TIPE_ARTIKEL[value] })),
        admin: { position: 'sidebar' },
      },
      { name: 'pilar', type: 'relationship', relationTo: 'pilar', required: true, admin: { position: 'sidebar' } },
      {
        name: 'subkategori',
        type: 'relationship',
        relationTo: 'subkategori',
        admin: { position: 'sidebar' },
        filterOptions: ({ data }) => (data?.pilar ? { pilar: { equals: data.pilar } } : true),
      },
      { name: 'penulis', type: 'relationship', relationTo: 'penulis', required: true, admin: { position: 'sidebar' } },
      {
        name: 'perubahanBesar',
        type: 'checkbox',
        label: 'Perubahan besar',
        defaultValue: false,
        admin: {
          position: 'sidebar',
          description: 'Centang bila isi berubah signifikan. Tanggal "Diperbarui" dan lastmod sitemap ikut berubah saat terbit.',
        },
      },
      { name: 'terbitPada', type: 'date', admin: { position: 'sidebar', readOnly: true } },
      { name: 'diperbaruiBesar', type: 'date', label: 'Diperbarui', admin: { position: 'sidebar', readOnly: true } },
    ],
  }
  ```

  `src/collections/Pilar.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { anyone, isAdmin } from '@/access'
  import { seoField } from '@/fields/seo'
  import { slugField } from '@/fields/slug'
  import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
  import { WARNA_PILAR } from '@/lib/konstanta'

  const redirect = redirectSaatPathBerubah(targetSederhana('pilar'))

  export const Pilar: CollectionConfig = {
    slug: 'pilar',
    labels: { singular: 'Pilar', plural: 'Pilar' },
    defaultSort: 'urutan',
    admin: {
      useAsTitle: 'nama',
      defaultColumns: ['nama', 'slug', 'warna', 'urutan'],
      group: 'Konten',
    },
    access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
    hooks: {
      beforeChange: [redirect.catatPathPublik],
      afterChange: [redirect.buatRedirect],
    },
    fields: [
      { name: 'nama', type: 'text', required: true },
      slugField('nama', { tingkatAtas: { koleksi: 'pilar' } }),
      {
        name: 'warna',
        type: 'select',
        required: true,
        options: Object.entries(WARNA_PILAR).map(([value, warna]) => ({ value, label: warna.label })),
      },
      { name: 'deskripsi', type: 'textarea', required: true },
      { name: 'intro', type: 'richText', label: 'Intro halaman rubrik' },
      { name: 'urutan', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
      seoField,
    ],
  }
  ```

  `src/collections/Tools.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isLoggedIn, publishedOrLoggedIn } from '@/access'
  import { faqField, sumberField } from '@/fields/konten'
  import { seoField } from '@/fields/seo'
  import { slugField } from '@/fields/slug'
  import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
  import { LABEL_TOOL, TOOL_IDS } from '@/lib/konstanta'

  const redirect = redirectSaatPathBerubah(targetSederhana('tools'))

  export const Tools: CollectionConfig = {
    slug: 'tools',
    labels: { singular: 'Tool', plural: 'Tools' },
    admin: { useAsTitle: 'nama', defaultColumns: ['nama', 'toolId', 'pilar', '_status'], group: 'Tools' },
    access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
    hooks: {
      beforeChange: [redirect.catatPathPublik],
      afterChange: [redirect.buatRedirect],
    },
    versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 50 },
    fields: [
      { name: 'nama', type: 'text', required: true },
      slugField('nama'),
      { name: 'pilar', type: 'relationship', relationTo: 'pilar', required: true },
      {
        name: 'toolId',
        type: 'select',
        label: 'Kalkulator',
        required: true,
        unique: true,
        options: TOOL_IDS.map((id) => ({ value: id, label: LABEL_TOOL[id] })),
        admin: { description: 'Rumus kalkulator yang dipakai halaman ini (modul hitung, Rencana 5).' },
      },
      {
        name: 'ringkasan',
        type: 'textarea',
        required: true,
        admin: { description: 'Satu-dua kalimat di atas kalkulator. Dipakai juga sebagai meta default.' },
      },
      {
        name: 'bantuanInput',
        type: 'array',
        label: 'Bantuan per input',
        fields: [
          { name: 'kunci', type: 'text', required: true, admin: { description: 'Nama input di modul hitung.' } },
          { name: 'label', type: 'text', required: true },
          { name: 'bantuan', type: 'textarea' },
        ],
      },
      { name: 'penjelasan', type: 'richText', label: 'Penjelasan rumus' },
      faqField,
      sumberField('sumberAturan', 'Sumber aturan'),
      seoField,
    ],
  }
  ```

  `src/collections/Video.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isLoggedIn, publishedOrLoggedIn } from '@/access'
  import { seoField } from '@/fields/seo'
  import { slugField } from '@/fields/slug'
  import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'

  /** Artikel induk tidak disimpan di sini: frontend mencari artikel yang `videoTerkait`-nya video ini. */
  const redirect = redirectSaatPathBerubah(targetSederhana('video'))

  export const Video: CollectionConfig = {
    slug: 'video',
    labels: { singular: 'Video', plural: 'Video' },
    admin: { useAsTitle: 'judul', defaultColumns: ['judul', 'pilar', 'durasiDetik', '_status'], group: 'Konten' },
    access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
    hooks: {
      beforeChange: [redirect.catatPathPublik],
      afterChange: [redirect.buatRedirect],
    },
    versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 30 },
    fields: [
      { name: 'judul', type: 'text', required: true },
      slugField('judul'),
      {
        name: 'file',
        type: 'upload',
        relationTo: 'media',
        required: true,
        filterOptions: { mimeType: { contains: 'video' } },
        admin: { description: 'Video vertikal 9:16, 30-60 detik.' },
      },
      {
        name: 'poster',
        type: 'upload',
        relationTo: 'media',
        filterOptions: { mimeType: { contains: 'image' } },
      },
      { name: 'pilar', type: 'relationship', relationTo: 'pilar', required: true },
      { name: 'durasiDetik', type: 'number', label: 'Durasi (detik)', min: 1 },
      { name: 'transkrip', type: 'textarea', required: true },
      seoField,
    ],
  }
  ```

  `src/collections/Penulis.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { anyone, isLoggedIn } from '@/access'
  import { seoField } from '@/fields/seo'
  import { slugField } from '@/fields/slug'
  import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
  import { validasiUrlOpsional } from '@/lib/validasi'

  const redirect = redirectSaatPathBerubah(targetSederhana('penulis'))

  export const Penulis: CollectionConfig = {
    slug: 'penulis',
    labels: { singular: 'Penulis', plural: 'Penulis' },
    admin: { useAsTitle: 'nama', defaultColumns: ['nama', 'slug'], group: 'Konten' },
    access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
    hooks: {
      beforeChange: [redirect.catatPathPublik],
      afterChange: [redirect.buatRedirect],
    },
    fields: [
      { name: 'nama', type: 'text', required: true },
      slugField('nama'),
      { name: 'foto', type: 'upload', relationTo: 'media' },
      { name: 'bio', type: 'textarea', required: true },
      { name: 'keahlian', type: 'text', hasMany: true },
      {
        name: 'tautan',
        type: 'array',
        fields: [
          { name: 'label', type: 'text', required: true },
          { name: 'url', type: 'text', required: true, validate: (value: unknown) => validasiUrlOpsional(value) },
        ],
      },
      seoField,
    ],
  }
  ```


- [ ] **Langkah 7: Daftarkan di config**

  Ganti seluruh `src/payload.config.ts`:

  `src/payload.config.ts`

  ```ts
  import { postgresAdapter } from '@payloadcms/db-postgres'
  import { lexicalEditor } from '@payloadcms/richtext-lexical'
  import path from 'path'
  import { buildConfig } from 'payload'
  import sharp from 'sharp'
  import { fileURLToPath } from 'url'

  import { Artikel } from './collections/Artikel'
  import { Halaman } from './collections/Halaman'
  import { Log404 } from './collections/Log404'
  import { Media } from './collections/Media'
  import { ParameterTools } from './collections/ParameterTools'
  import { Pengguna } from './collections/Pengguna'
  import { Penulis } from './collections/Penulis'
  import { Pilar } from './collections/Pilar'
  import { Redirect } from './collections/Redirect'
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
      Halaman,
      Redirect,
      Log404,
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
  ```


- [ ] **Langkah 8: Perbarui tipe dan import map, jalankan semua tes**

  Jalankan:

  ```bash
  npm run generate:types && npm run generate:importmap && npm run typecheck
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: type check bersih; unit `Tests 47 passed (47)`; integrasi `Test Files 7 passed (7)`, `Tests 17 passed (17)`.


- [ ] **Langkah 9: Commit**

  ```bash
  git add -A
  git commit -m "feat: halaman, redirect 301 otomatis, dan slug unik lintas koleksi tingkat atas"
  ```


### Task 9: Global situs

**Files:**
- Create: `src/lib/seo-dasar.ts`, `src/blocks/beranda.ts`, `src/globals/Header.ts`, `src/globals/Footer.ts`, `src/globals/Beranda.ts`, `src/globals/PengaturanSEO.ts`, `src/globals/Newsletter.ts`
- Modify: `src/payload.config.ts`
- Test: `tests/unit/global.test.ts`, `tests/int/global.int.spec.ts`

**Interfaces:**
- Consumes: `anyone`, `isAdmin` (Task 3); `validasiUrlOpsional` (Task 4).
- Produces: `validasiPolaJudul(nilai: unknown): true | string`; `judulHalaman(pola: string, judul: string): string`; blok beranda `heroBeranda`, `mozaikPilihan`, `stripVideo`, `palingDibaca`, `newsletterBlok`, `slotIklan` (`blokBeranda`); global `header` (`menu[]` dengan `label`, `jenis` pilar/tautan, `pilar`, `url`; `tombolTools`), `footer` (`tautan[]`, `sosial[]`, `saluranWhatsApp`, `teksHakCipta`), `beranda` (`tataLetak`, berdraf), `pengaturan-seo` (`namaSitus`, `urlSitus`, `polaJudul`, `metaDefault`, `gambarOgDefault`, `organisasi`, `verifikasi`, `robotsTambahan`), `newsletter` (`aktif`, `penyedia`, `urlForm`, `judul`, `deskripsi`, `tautanArsip`).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/global.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { judulHalaman, validasiPolaJudul } from '@/lib/seo-dasar'

  describe('validasiPolaJudul', () => {
    it('mewajibkan penanda %s satu kali', () => {
      expect(validasiPolaJudul('%s · point.')).toBe(true)
      expect(validasiPolaJudul('point.')).toBe('Pola judul harus memuat %s satu kali, contoh: %s · point.')
      expect(validasiPolaJudul('%s %s')).toBe('Pola judul harus memuat %s satu kali, contoh: %s · point.')
    })
  })

  describe('judulHalaman', () => {
    it('menyisipkan judul ke pola', () => {
      expect(judulHalaman('%s · point.', 'Cara hitung THR')).toBe('Cara hitung THR · point.')
    })
  })
  ```

  `tests/int/global.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { getTestPayload, pesanGalat, unik } from './helpers'

  describe('global situs', () => {
    it('menu header bisa menunjuk pilar dan tautan bebas', async () => {
      const payload = await getTestPayload()
      const pilar = await payload.create({
        collection: 'pilar',
        data: { nama: unik('Sehat'), warna: 'koral', deskripsi: 'Sehat.' },
      })
      const header = await payload.updateGlobal({
        slug: 'header',
        data: {
          menu: [
            { label: 'Sehat', jenis: 'pilar', pilar: pilar.id },
            { label: 'Tentang', jenis: 'tautan', url: '/tentang' },
          ],
        },
      })
      expect(header.menu).toHaveLength(2)
      expect(header.tombolTools?.url).toBe('/tools')
    })

    it('pengaturan SEO menolak pola judul tanpa %s', async () => {
      const payload = await getTestPayload()
      const pesan = await pesanGalat(
        payload.updateGlobal({ slug: 'pengaturan-seo', data: { polaJudul: 'point.' } }),
      )
      expect(pesan).toMatch(/^polaJudul:/)
    })

    it('beranda menyimpan urutan blok', async () => {
      const payload = await getTestPayload()
      const beranda = await payload.updateGlobal({
        slug: 'beranda',
        data: {
          tataLetak: [
            { blockType: 'heroBeranda', judul: 'Intinya dulu.' },
            { blockType: 'palingDibaca', judul: 'Paling dibaca pekan ini', jumlah: 4 },
          ],
        },
      })
      expect(beranda.tataLetak?.map((b) => b.blockType)).toEqual(['heroBeranda', 'palingDibaca'])
    })
  })
  ```


- [ ] **Langkah 2: Pastikan tes unit gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/global.test.ts` (`@/lib/seo-dasar` belum ada).


- [ ] **Langkah 3: Implementasi helper dan blok beranda**

  `src/lib/seo-dasar.ts`

  ```ts
  const PESAN_POLA = 'Pola judul harus memuat %s satu kali, contoh: %s · point.'

  export function validasiPolaJudul(nilai: unknown): true | string {
    if (typeof nilai !== 'string') return PESAN_POLA
    return nilai.split('%s').length === 2 ? true : PESAN_POLA
  }

  export function judulHalaman(pola: string, judul: string): string {
    return pola.replace('%s', judul)
  }
  ```

  `src/blocks/beranda.ts`

  ```ts
  import type { Block } from 'payload'

  export const BlokHeroBeranda: Block = {
    slug: 'heroBeranda',
    interfaceName: 'BlokHeroBeranda',
    labels: { singular: 'Hero beranda', plural: 'Hero beranda' },
    fields: [
      { name: 'judul', type: 'text', required: true, defaultValue: 'Intinya dulu.' },
      { name: 'subjudul', type: 'textarea' },
      { name: 'placeholderCari', type: 'text', defaultValue: 'misal: cara hitung THR' },
    ],
  }

  export const BlokMozaikPilihan: Block = {
    slug: 'mozaikPilihan',
    interfaceName: 'BlokMozaikPilihan',
    labels: { singular: 'Mozaik pilihan redaksi', plural: 'Mozaik pilihan redaksi' },
    fields: [
      { name: 'judul', type: 'text' },
      {
        name: 'artikel',
        type: 'relationship',
        relationTo: 'artikel',
        hasMany: true,
        required: true,
        minRows: 1,
        maxRows: 5,
        admin: { description: 'Urutan pertama tampil paling besar.' },
      },
    ],
  }

  export const BlokStripVideo: Block = {
    slug: 'stripVideo',
    interfaceName: 'BlokStripVideo',
    labels: { singular: 'Strip video', plural: 'Strip video' },
    fields: [
      { name: 'judul', type: 'text', defaultValue: 'Intinya dalam 45 detik' },
      { name: 'video', type: 'relationship', relationTo: 'video', hasMany: true, maxRows: 4 },
    ],
  }

  export const BlokPalingDibaca: Block = {
    slug: 'palingDibaca',
    interfaceName: 'BlokPalingDibaca',
    labels: { singular: 'Paling dibaca', plural: 'Paling dibaca' },
    fields: [
      { name: 'judul', type: 'text', defaultValue: 'Paling dibaca pekan ini' },
      { name: 'jumlah', type: 'number', defaultValue: 4, min: 1, max: 10 },
    ],
  }

  export const BlokNewsletter: Block = {
    slug: 'newsletterBlok',
    interfaceName: 'BlokNewsletter',
    labels: { singular: 'Newsletter', plural: 'Newsletter' },
    fields: [
      { name: 'judul', type: 'text', defaultValue: 'Intinya, tiap Senin.' },
      { name: 'teks', type: 'textarea' },
    ],
  }

  export const BlokSlotIklan: Block = {
    slug: 'slotIklan',
    interfaceName: 'BlokSlotIklan',
    labels: { singular: 'Slot iklan', plural: 'Slot iklan' },
    fields: [
      {
        name: 'idSlot',
        type: 'text',
        required: true,
        admin: { description: 'ID slot dari pengaturan iklan (Rencana 8).' },
      },
    ],
  }

  /** Blok yang menyusun beranda. Urutannya bisa diubah editor. */
  export const blokBeranda: Block[] = [
    BlokHeroBeranda,
    BlokMozaikPilihan,
    BlokStripVideo,
    BlokPalingDibaca,
    BlokNewsletter,
    BlokSlotIklan,
  ]
  ```


- [ ] **Langkah 4: Buat lima global**

  `src/globals/Header.ts`

  ```ts
  import type { GlobalConfig } from 'payload'

  import { anyone, isAdmin } from '@/access'

  export const Header: GlobalConfig = {
    slug: 'header',
    label: 'Header',
    admin: { group: 'Tampilan' },
    access: { read: anyone, update: isAdmin },
    fields: [
      {
        name: 'menu',
        type: 'array',
        labels: { singular: 'Menu', plural: 'Menu' },
        fields: [
          { name: 'label', type: 'text', required: true },
          {
            name: 'jenis',
            type: 'select',
            required: true,
            defaultValue: 'pilar',
            options: [
              { label: 'Pilar', value: 'pilar' },
              { label: 'Tautan', value: 'tautan' },
            ],
          },
          {
            name: 'pilar',
            type: 'relationship',
            relationTo: 'pilar',
            admin: { condition: (_, siblingData) => siblingData?.jenis === 'pilar' },
          },
          {
            name: 'url',
            type: 'text',
            admin: { condition: (_, siblingData) => siblingData?.jenis === 'tautan' },
          },
        ],
      },
      {
        name: 'tombolTools',
        type: 'group',
        fields: [
          { name: 'label', type: 'text', defaultValue: 'Tools' },
          { name: 'url', type: 'text', defaultValue: '/tools' },
        ],
      },
    ],
  }
  ```

  `src/globals/Footer.ts`

  ```ts
  import type { GlobalConfig } from 'payload'

  import { anyone, isAdmin } from '@/access'
  import { validasiUrlOpsional } from '@/lib/validasi'

  export const Footer: GlobalConfig = {
    slug: 'footer',
    label: 'Footer',
    admin: { group: 'Tampilan' },
    access: { read: anyone, update: isAdmin },
    fields: [
      {
        name: 'tautan',
        type: 'array',
        labels: { singular: 'Tautan', plural: 'Tautan' },
        fields: [
          { name: 'label', type: 'text', required: true },
          { name: 'url', type: 'text', required: true },
        ],
      },
      {
        name: 'sosial',
        type: 'array',
        labels: { singular: 'Akun sosial', plural: 'Akun sosial' },
        fields: [
          {
            name: 'platform',
            type: 'select',
            required: true,
            options: ['instagram', 'tiktok', 'youtube', 'x', 'facebook', 'threads', 'linkedin'].map(
              (value) => ({ value, label: value }),
            ),
          },
          { name: 'url', type: 'text', required: true, validate: (value: unknown) => validasiUrlOpsional(value) },
        ],
      },
      {
        name: 'saluranWhatsApp',
        type: 'text',
        label: 'Saluran WhatsApp',
        validate: (value: unknown) => validasiUrlOpsional(value),
      },
      { name: 'teksHakCipta', type: 'text', defaultValue: '© 2026 point.lat' },
    ],
  }
  ```

  `src/globals/Beranda.ts`

  ```ts
  import type { GlobalConfig } from 'payload'

  import { anyone, isAdmin } from '@/access'
  import { blokBeranda } from '@/blocks/beranda'

  export const Beranda: GlobalConfig = {
    slug: 'beranda',
    label: 'Beranda',
    admin: { group: 'Tampilan' },
    access: { read: anyone, update: isAdmin },
    versions: { drafts: true, max: 20 },
    fields: [{ name: 'tataLetak', type: 'blocks', label: 'Tata letak', blocks: blokBeranda }],
  }
  ```

  `src/globals/PengaturanSEO.ts`

  ```ts
  import type { GlobalConfig } from 'payload'

  import { anyone, isAdmin } from '@/access'
  import { validasiPolaJudul } from '@/lib/seo-dasar'
  import { validasiUrlOpsional } from '@/lib/validasi'

  /** Pengaturan SEO tingkat situs. Rencana 6 menambahkan pengaturan Mesin Indexing di sini. */
  export const PengaturanSEO: GlobalConfig = {
    slug: 'pengaturan-seo',
    label: 'Pengaturan SEO',
    admin: { group: 'SEO' },
    access: { read: anyone, update: isAdmin },
    fields: [
      { name: 'namaSitus', type: 'text', required: true, defaultValue: 'point.' },
      {
        name: 'urlSitus',
        type: 'text',
        required: true,
        defaultValue: 'https://point.lat',
        validate: (value: unknown) => validasiUrlOpsional(value),
      },
      {
        name: 'polaJudul',
        type: 'text',
        required: true,
        defaultValue: '%s · point.',
        validate: (value: unknown) => validasiPolaJudul(value),
        admin: { description: '%s diganti judul halaman.' },
      },
      { name: 'metaDefault', type: 'textarea', defaultValue: 'Intinya dulu. Uang, karier, teknologi, pendidikan, dan kesehatan dijelaskan dari intinya.' },
      { name: 'gambarOgDefault', type: 'upload', relationTo: 'media' },
      {
        name: 'organisasi',
        type: 'group',
        fields: [
          { name: 'nama', type: 'text', defaultValue: 'point.lat' },
          { name: 'logo', type: 'upload', relationTo: 'media' },
          { name: 'sameAs', type: 'text', hasMany: true, admin: { description: 'URL akun resmi point.' } },
        ],
      },
      {
        name: 'verifikasi',
        type: 'group',
        fields: [
          { name: 'google', type: 'text', label: 'Kode verifikasi Google' },
          { name: 'bing', type: 'text', label: 'Kode verifikasi Bing' },
        ],
      },
      {
        name: 'robotsTambahan',
        type: 'textarea',
        label: 'Aturan robots.txt tambahan',
        admin: { description: 'Ditambahkan di bawah aturan bawaan (Rencana 3).' },
      },
    ],
  }
  ```

  `src/globals/Newsletter.ts`

  ```ts
  import type { GlobalConfig } from 'payload'

  import { anyone, isAdmin } from '@/access'
  import { validasiUrlOpsional } from '@/lib/validasi'

  export const Newsletter: GlobalConfig = {
    slug: 'newsletter',
    label: 'Newsletter',
    admin: { group: 'Tampilan' },
    access: { read: anyone, update: isAdmin },
    fields: [
      { name: 'aktif', type: 'checkbox', defaultValue: false },
      {
        name: 'penyedia',
        type: 'select',
        defaultValue: 'belum',
        options: [
          { label: 'Belum dipilih', value: 'belum' },
          { label: 'Kit', value: 'kit' },
          { label: 'Mailchimp', value: 'mailchimp' },
          { label: 'Brevo', value: 'brevo' },
          { label: 'Lainnya', value: 'lainnya' },
        ],
      },
      {
        name: 'urlForm',
        type: 'text',
        label: 'URL form penyedia',
        validate: (value: unknown) => validasiUrlOpsional(value),
      },
      { name: 'judul', type: 'text', defaultValue: 'Intinya, tiap Senin.' },
      { name: 'deskripsi', type: 'textarea', defaultValue: 'Lima tulisan terbaik pekan ini, langsung ke email.' },
      { name: 'tautanArsip', type: 'text', validate: (value: unknown) => validasiUrlOpsional(value) },
    ],
  }
  ```


- [ ] **Langkah 5: Daftarkan di config**

  Ganti seluruh `src/payload.config.ts` (versi akhir rencana ini):

  `src/payload.config.ts`

  ```ts
  import { postgresAdapter } from '@payloadcms/db-postgres'
  import { lexicalEditor } from '@payloadcms/richtext-lexical'
  import path from 'path'
  import { buildConfig } from 'payload'
  import sharp from 'sharp'
  import { fileURLToPath } from 'url'

  import { Artikel } from './collections/Artikel'
  import { Halaman } from './collections/Halaman'
  import { Log404 } from './collections/Log404'
  import { Media } from './collections/Media'
  import { ParameterTools } from './collections/ParameterTools'
  import { Pengguna } from './collections/Pengguna'
  import { Penulis } from './collections/Penulis'
  import { Pilar } from './collections/Pilar'
  import { Redirect } from './collections/Redirect'
  import { Subkategori } from './collections/Subkategori'
  import { Tools } from './collections/Tools'
  import { Video } from './collections/Video'
  import { Beranda } from './globals/Beranda'
  import { Footer } from './globals/Footer'
  import { Header } from './globals/Header'
  import { Newsletter } from './globals/Newsletter'
  import { PengaturanSEO } from './globals/PengaturanSEO'

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
    ],
    globals: [Header, Footer, Beranda, PengaturanSEO, Newsletter],
    editor: lexicalEditor(),
    secret: process.env.PAYLOAD_SECRET || '',
    typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
    db: postgresAdapter({
      pool: { connectionString: process.env.DATABASE_URL || '' },
    }),
    sharp,
    plugins: [],
  })
  ```


- [ ] **Langkah 6: Perbarui tipe, jalankan semua tes**

  Jalankan:

  ```bash
  npm run generate:types && npm run generate:importmap && npm run typecheck
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: type check bersih; unit `Test Files 10 passed (10)`, `Tests 49 passed (49)`; integrasi `Test Files 8 passed (8)`, `Tests 20 passed (20)`.


- [ ] **Langkah 7: Commit**

  ```bash
  git add -A
  git commit -m "feat: global header, footer, beranda, pengaturan SEO, newsletter"
  ```


### Task 10: Data awal dan verifikasi akhir

**Files:**
- Create: `src/seed/seed.ts`, `src/seed/run.ts`
- Test: `tests/int/seed.int.spec.ts`

**Interfaces:**
- Consumes: semua koleksi & global; `paragrafLexical` (Task 7); `WarnaPilar` (Task 2).
- Produces: `PILAR_AWAL` (4 pilar: `uang-karier`, `tekno`, `belajar`, `sehat`); `HALAMAN_AWAL` (6 halaman statis, dibuat sebagai draf); `seed(payload: Payload, opsi?: { emailAdmin?: string; passwordAdmin?: string }): Promise<{ admin: 'dibuat' | 'sudah-ada' | 'dilewati'; pilar: number; halaman: number }>`; perintah `npm run seed` (membaca `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` dari `.env`).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/int/seed.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { PILAR_AWAL, seed } from '@/seed/seed'

  import { getTestPayload } from './helpers'

  describe('seed', () => {
    it('membuat 4 pilar, penulis redaksi, halaman statis, dan global, dan aman dijalankan ulang', async () => {
      const payload = await getTestPayload()

      await seed(payload)
      await seed(payload)

      for (const pilar of PILAR_AWAL) {
        const { totalDocs } = await payload.count({
          collection: 'pilar',
          where: { slug: { equals: pilar.slug } },
        })
        expect(totalDocs).toBe(1)
      }

      const redaksi = await payload.count({ collection: 'penulis', where: { slug: { equals: 'redaksi' } } })
      expect(redaksi.totalDocs).toBe(1)

      const tentang = await payload.find({
        collection: 'halaman',
        where: { slug: { equals: 'tentang' } },
        draft: true,
      })
      expect(tentang.docs).toHaveLength(1)
      expect(tentang.docs[0]?._status).toBe('draft')

      const header = await payload.findGlobal({ slug: 'header' })
      expect(header.menu?.map((m) => m.label)).toEqual(PILAR_AWAL.map((p) => p.nama))

      const beranda = await payload.findGlobal({ slug: 'beranda' })
      expect(beranda.tataLetak?.[0]?.blockType).toBe('heroBeranda')
    })
  })
  ```


- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npx vitest run --config ./vitest.int.config.mts tests/int/seed.int.spec.ts
  ```

  Hasil yang diharapkan: FAIL karena `@/seed/seed` belum ada.


- [ ] **Langkah 3: Implementasi seed**

  `src/seed/seed.ts`

  ```ts
  import type { Payload } from 'payload'

  import type { WarnaPilar } from '@/lib/konstanta'
  import { paragrafLexical } from '@/lib/lexical'

  export const PILAR_AWAL: {
    nama: string
    slug: string
    warna: WarnaPilar
    deskripsi: string
    urutan: number
  }[] = [
    { nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau', deskripsi: 'Gaji, pajak, tabungan, utang, dan karier.', urutan: 1 },
    { nama: 'Tekno', slug: 'tekno', warna: 'oranye', deskripsi: 'AI, aplikasi, gadget, dan keamanan digital.', urutan: 2 },
    { nama: 'Belajar', slug: 'belajar', warna: 'kuning', deskripsi: 'Sekolah, kuliah, ujian masuk, dan beasiswa.', urutan: 3 },
    { nama: 'Sehat', slug: 'sehat', warna: 'koral', deskripsi: 'Gizi, olahraga, tidur, dan kebiasaan sehat.', urutan: 4 },
  ]

  /** Halaman wajib. Dibuat sebagai draf: isinya harus ditulis pemilik sebelum terbit. */
  export const HALAMAN_AWAL = [
    { judul: 'Tentang', slug: 'tentang' },
    { judul: 'Kebijakan Redaksi', slug: 'kebijakan-redaksi' },
    { judul: 'Pedoman Media Siber', slug: 'pedoman-media-siber' },
    { judul: 'Kebijakan Privasi', slug: 'kebijakan-privasi' },
    { judul: 'Pasang Iklan', slug: 'pasang-iklan' },
    { judul: 'Kontak', slug: 'kontak' },
  ] as const

  export type OpsiSeed = { emailAdmin?: string; passwordAdmin?: string }

  export type HasilSeed = { admin: 'dibuat' | 'sudah-ada' | 'dilewati'; pilar: number; halaman: number }

  /** Mengisi data awal. Aman dijalankan berkali-kali: dokumen dicari lewat slug dulu. */
  export async function seed(payload: Payload, opsi: OpsiSeed = {}): Promise<HasilSeed> {
    const admin = await siapkanAdmin(payload, opsi)

    const idPilar: number[] = []
    for (const pilar of PILAR_AWAL) {
      const ada = await payload.find({ collection: 'pilar', where: { slug: { equals: pilar.slug } }, limit: 1 })
      const doc = ada.docs[0] ?? (await payload.create({ collection: 'pilar', data: pilar }))
      idPilar.push(doc.id)
    }

    const redaksi = await payload.find({ collection: 'penulis', where: { slug: { equals: 'redaksi' } }, limit: 1 })
    if (redaksi.totalDocs === 0) {
      await payload.create({
        collection: 'penulis',
        data: {
          nama: 'Redaksi point.',
          slug: 'redaksi',
          bio: 'Tim redaksi point.lat. Menulis dan memeriksa setiap tulisan sebelum terbit.',
        },
      })
    }

    for (const halaman of HALAMAN_AWAL) {
      const ada = await payload.find({
        collection: 'halaman',
        where: { slug: { equals: halaman.slug } },
        limit: 1,
        draft: true,
      })
      if (ada.totalDocs === 0) {
        await payload.create({
          collection: 'halaman',
          draft: true,
          data: {
            ...halaman,
            tataLetak: [
              { blockType: 'teks', isi: paragrafLexical([`Tulis isi halaman ${halaman.judul} di sini sebelum terbit.`]) },
            ],
          },
        })
      }
    }

    await payload.updateGlobal({
      slug: 'header',
      data: {
        menu: PILAR_AWAL.map((pilar, i) => ({ label: pilar.nama, jenis: 'pilar' as const, pilar: idPilar[i] })),
        tombolTools: { label: 'Tools', url: '/tools' },
      },
    })

    await payload.updateGlobal({
      slug: 'footer',
      data: {
        tautan: HALAMAN_AWAL.map((h) => ({ label: h.judul, url: `/${h.slug}` })),
        teksHakCipta: '© 2026 point.lat',
      },
    })

    await payload.updateGlobal({
      slug: 'beranda',
      data: {
        tataLetak: [
          {
            blockType: 'heroBeranda',
            judul: 'Intinya dulu.',
            subjudul: 'Uang, karier, teknologi, pendidikan, dan kesehatan. Dijelaskan dari intinya, lalu bisa langsung kamu hitung.',
            placeholderCari: 'misal: cara hitung THR',
          },
          { blockType: 'palingDibaca', judul: 'Paling dibaca pekan ini', jumlah: 4 },
          { blockType: 'newsletterBlok', judul: 'Intinya, tiap Senin.' },
        ],
      },
    })

    return { admin, pilar: PILAR_AWAL.length, halaman: HALAMAN_AWAL.length }
  }

  async function siapkanAdmin(payload: Payload, opsi: OpsiSeed): Promise<HasilSeed['admin']> {
    const { totalDocs } = await payload.count({ collection: 'pengguna' })
    if (totalDocs > 0) return 'sudah-ada'
    if (!opsi.emailAdmin || !opsi.passwordAdmin) return 'dilewati'
    await payload.create({
      collection: 'pengguna',
      data: { email: opsi.emailAdmin, password: opsi.passwordAdmin, nama: 'Admin point.', peran: 'admin' },
    })
    return 'dibuat'
  }
  ```

  `src/seed/run.ts`

  ```ts
  import config from '@payload-config'
  import { getPayload } from 'payload'

  import { seed } from './seed'

  const payload = await getPayload({ config })
  const hasil = await seed(payload, {
    emailAdmin: process.env.SEED_ADMIN_EMAIL,
    passwordAdmin: process.env.SEED_ADMIN_PASSWORD,
  })

  payload.logger.info(
    `Seed selesai. Admin: ${hasil.admin}. Pilar: ${hasil.pilar}. Halaman draf: ${hasil.halaman}.`,
  )
  process.exit(0)
  ```


- [ ] **Langkah 4: Jalankan semua pemeriksaan**

  Jalankan:

  ```bash
  npm run typecheck
  npm run test:unit
  npm run test:int
  npm run lint
  ```

  Hasil yang diharapkan: type check bersih; unit `Tests 49 passed (49)`; integrasi `Test Files 9 passed (9)`, `Tests 21 passed (21)`; lint tanpa error.


- [ ] **Langkah 5: Isi database dev dua kali (harus aman diulang)**

  Jalankan:

  ```bash
  npm run seed
  npm run seed
  ```

  Hasil yang diharapkan: baris pertama `Seed selesai. Admin: dibuat. Pilar: 4. Halaman draf: 6.`, baris kedua `Admin: sudah-ada`.


- [ ] **Langkah 6: Build produksi dan uji asap**

  Jalankan:

  ```bash
  npm run build
  (npm run start > /tmp/point-lat-start.log 2>&1 &) && sleep 20
  curl -s -o /dev/null -w "beranda %{http_code}\n" http://localhost:3000/
  curl -s -o /dev/null -w "admin %{http_code}\n" http://localhost:3000/admin/login
  curl -s "http://localhost:3000/api/pilar?sort=urutan" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).docs.map(p=>p.slug).join(',')))"
  curl -s -X POST http://localhost:3000/api/pengguna/login -H "Content-Type: application/json" \
    -d "{\"email\":\"$(grep SEED_ADMIN_EMAIL .env | cut -d= -f2)\",\"password\":\"$(grep SEED_ADMIN_PASSWORD .env | cut -d= -f2)\"}" \
    | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log('peran',JSON.parse(s).user.peran))"
  pkill -f "next start"
  ```

  Hasil yang diharapkan: build selesai dengan rute `/`, `/admin/[[...segments]]`, `/api/[...slug]`; lalu `beranda 200`, `admin 200`, `uang-karier,tekno,belajar,sehat`, `peran admin`.


- [ ] **Langkah 7: Commit**

  ```bash
  git add -A
  git commit -m "feat: seed data awal (pilar, redaksi, halaman statis, global)"
  ```


---

## Selesai bila

- `npm test` lulus (49 unit, 21 integrasi), `npm run typecheck` dan `npm run lint` bersih, `npm run build` berhasil.
- Admin bisa masuk di `/admin`, melihat grup Konten (Pilar, Subkategori, Penulis, Artikel, Video, Halaman, Media), Tools (Tools, Parameter tools), SEO (Redirect, Log 404, Pengaturan SEO), Tampilan (Header, Footer, Beranda, Newsletter), Pengaturan (Pengguna).
- Artikel tidak bisa terbit tanpa 2-4 poin Intinya dan gambar utama ≥1200px; mengganti slug artikel terbit membuat redirect 301 otomatis.

Rencana berikutnya: **Rencana 2 (Media Cloudinary)**, ditulis setelah rencana ini selesai dieksekusi supaya mengikuti kode yang ada.
