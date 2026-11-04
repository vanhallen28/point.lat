# Proyek: point.lat

Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/2026-11-03-point-lat-design.md`. Rencana: `docs/superpowers/plans/`.

## Tech stack
- Next.js 16 (App Router) + Payload CMS 3.92 dalam satu aplikasi
- PostgreSQL (lokal lewat Docker, produksi di Supabase lewat pooler) dengan `@payloadcms/db-postgres`
- Editor Lexical (`@payloadcms/richtext-lexical`)
- Vitest (unit + integrasi), Playwright + axe (e2e)
- Frontend: CSS Module + token CSS (`src/styles/tokens.css`), font Archivo variable lewat `next/font/local`
- Node `^22.23.4 || >=24.22.1`, pnpm 10

## Perintah
- Database lokal: `docker compose up -d` (membuat database `pointlat` dan `pointlat_test`)
- Dev: `pnpm dev` (admin di http://localhost:3000/admin)
- Tes unit: `pnpm test:unit`
- Tes integrasi (butuh Postgres): `pnpm test:int`
- Semua tes: `pnpm test`
- Tes E2E (butuh Postgres, membangun build produksi dulu): `pnpm test:e2e`. Database E2E = nama database tes ditambah `_e2e`, dibuat dan diisi ulang otomatis oleh `tests/e2e/siapkan.ts`.
- Type check: `pnpm typecheck`
- Tipe Payload: `pnpm generate:types` (jalankan setiap kali field berubah)
- Import map admin: `pnpm generate:importmap` (jalankan setiap kali menambah fitur Lexical atau komponen admin)
- Data awal: `pnpm seed`
- Aset sistem Cloudinary (sekali per akun, butuh kredensial): `pnpm media:siapkan`

## Konvensi
- Nama domain memakai bahasa Indonesia, sama dengan spesifikasi: slug koleksi (`artikel`, `pilar`), nama field (`judul`, `intinya`), nama fungsi modul (`kabari`, `hitung`, `pathFor` adalah pengecualian yang sudah ada).
- Nama teknis framework tetap bahasa Inggris (hook, access, config).
- Logika bisnis ditulis sebagai fungsi murni di `src/lib/` atau `src/modules/` dan diuji unit. Config Payload hanya merangkai.
- Satu file satu tanggung jawab. Koleksi di `src/collections/`, global di `src/globals/`, blok di `src/blocks/`, field bersama di `src/fields/`, hook di `src/hooks/`, akses di `src/access/`.
- Path publik selalu dibangun lewat `pathFor()` di `src/lib/paths.ts`, jangan merangkai string URL manual.
- SEO selalu lewat `src/modules/seo`: `metadata()` untuk `generateMetadata`, `jsonLd()` + `serialisasiJsonLd()` untuk JSON-LD, `remahRoti()` untuk breadcrumb, `ambilSitus()` untuk pengaturan situs. Jangan menulis `<title>`, canonical, robots, atau JSON-LD manual di halaman. Rute teknis (`/sitemap.xml`, `/sitemap/{jenis}.xml`, `/news-sitemap.xml`, `/robots.txt`, `/feed.xml`) ada di `src/app/(frontend)/` dan hanya merangkai fungsi modul.
- Tag cache di `src/lib/tag.ts` (`TAG`): data halaman publik di-cache dengan tag yang sama dengan yang direvalidasi hook `revalidasiPublik` (`{koleksi}`, `{koleksi}:{id}`, `pilar:{slug}`, `beranda`, `sitemap`, `pengaturan-seo`, `header`, `footer`, `media`, `redirect`). Koleksi publik baru wajib memasang `revalidasiPublik(koleksi)`.
- URL media selalu lewat `src/modules/media` (`bangunUrl`, `propsGambar`, `urlOg`), jangan merangkai URL Cloudinary manual. `next/image` memakai loader kustom Cloudinary, jadi `src` harus URL dari `bangunUrl`/`propsGambar` dan `width`/`height` wajib diisi.
- Media disimpan di Cloudinary (folder `point/gambar`, `point/video`). Tanpa `CLOUDINARY_*` di env (lokal, tes) dipakai klien palsu dalam memori: file tidak tersimpan permanen. Tes tidak boleh memanggil jaringan.
- Halaman publik di `src/app/(frontend)/` dirender ISR: rute dinamis memakai `generateStaticParams` yang mengembalikan `[]`, dan data diambil lewat `muat*()` dari `src/modules/konten` (cache bertag `TAG`). Path tanpa dokumen diakhiri `tanganiTidakAda(path)` di komponen halaman (redirect dari koleksi `redirect` atau 404), sedangkan `generateMetadata` mengembalikan `metadataTidakDitemukan()` untuk path itu.
- Komponen UI publik di `src/components/`, server component kecuali benar-benar butuh browser (`'use client'` seperti `Catat404` dan `PemicuMasuk`). Gaya di CSS Module di sebelah komponen dan memakai token semantik dari `src/styles/tokens.css` (`--teks`, `--latar`, `--permukaan`, `--pilar`, `--ruang-*`, `--durasi-*`), bukan hex atau token primitif. Animasi hanya `transform` dan `opacity`, dan semuanya mati di `prefers-reduced-motion: reduce`.
- Tautan internal lewat komponen `Tautan` (`next/link` untuk path situs). Warna pilar lewat atribut `data-warna` (nilai field `warna` pilar) dan selalu bersama nama pilarnya. Ikon lewat `Ikon` (path Lucide yang disalin, tanpa paket ikon).
- Copy UI: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru.
- Tes unit di `tests/unit/*.test.ts`, tes integrasi di `tests/int/*.int.spec.ts` dan memakai `getTestPayload()` + `unik()` dari `tests/int/helpers.ts`.
- Tes E2E di `tests/e2e/*.spec.ts` memakai `cegatCloudinary()` (gambar tanpa jaringan) dan `periksaAxe()` (WCAG 2.2 AA) dari `tests/e2e/bantu.ts`; data contohnya di `tests/e2e/siapkan.ts`.

## Batasan
- Jangan commit `.env`. `.env.test` boleh di-commit karena hanya untuk database tes lokal dan tidak boleh berisi `CLOUDINARY_*`.
- Tanya dulu sebelum menambah dependensi baru di luar rencana.
- Jalankan `pnpm generate:types` lalu `pnpm typecheck` setelah mengubah koleksi atau global.
- Jalankan `pnpm test` sebelum commit, dan `pnpm test:e2e` bila halaman publik berubah.
- `pnpm build` membaca database dev untuk halaman statis (layout, `/glosarium`, 404). Setelah skema berubah, jalankan `pnpm seed` dulu supaya kolom baru terdorong ke database dev.
