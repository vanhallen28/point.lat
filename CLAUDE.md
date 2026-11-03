# Proyek: point.lat

Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/2026-11-03-point-lat-design.md`. Rencana: `docs/superpowers/plans/`.

## Tech stack
- Next.js 16 (App Router) + Payload CMS 3.92 dalam satu aplikasi
- PostgreSQL (lokal lewat Docker, produksi di Supabase lewat pooler) dengan `@payloadcms/db-postgres`
- Editor Lexical (`@payloadcms/richtext-lexical`)
- Vitest (unit + integrasi), Playwright (e2e, mulai Rencana 4)
- Node `^22.23.4 || >=24.22.1`, pnpm 10

## Perintah
- Database lokal: `docker compose up -d` (membuat database `pointlat` dan `pointlat_test`)
- Dev: `pnpm dev` (admin di http://localhost:3000/admin)
- Tes unit: `pnpm test:unit`
- Tes integrasi (butuh Postgres): `pnpm test:int`
- Semua tes: `pnpm test`
- Type check: `pnpm typecheck`
- Tipe Payload: `pnpm generate:types` (jalankan setiap kali field berubah)
- Import map admin: `pnpm generate:importmap` (jalankan setiap kali menambah fitur Lexical atau komponen admin)
- Data awal: `pnpm seed`

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
- Jalankan `pnpm generate:types` lalu `pnpm typecheck` setelah mengubah koleksi atau global.
- Jalankan `pnpm test` sebelum commit.
