# Rencana 8C: Persiapan rilis produksi point.lat (Next 16.3.8, migrasi Payload, penjaga lingkungan, header keamanan, CI, Lighthouse CI, backup mingguan, dan runbook rilis)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyiapkan point.lat untuk produksi di Vercel Pro dan Supabase Pro (Singapura): Next naik ke 16.3.8; skema Supabase hanya lewat migrasi Payload yang dijalankan build Vercel, dengan koneksi pooler mode transaksi yang terverifikasi TLS; deploy produksi dan pratinjau menolak env yang salah dan database milik lingkungan lain; password admin di lingkungan terbuka tidak bisa lemah atau contoh; header keamanan di semua jawaban tanpa mematikan ISR; CI GitHub Actions dengan E2E dan Lighthouse; backup mingguan terenkripsi yang pemulihannya sudah diuji; dan runbook pemilik dari nol sampai live beserta uji langsung layanan luar. Tes tetap tanpa jaringan.

**Architecture:** `src/lib/database.ts` memutuskan dua hal dari `DATABASE_URL`: push skema Payload hanya untuk database lokal (`databaseLokal`), dan opsi pool `pg` (lokal memakai bawaan driver; database bersama memakai pool 5, idle 5 detik, batas sambung 10 detik, TLS dengan `DATABASE_CA`). Migrasi Payload di `src/migrations` (awal dari skema sekarang, lalu `kunci_data_api`) dijalankan `pnpm build:vercel` (`periksa:rilis`, `migrate`, `periksa:rilis`, `build`) sebelum `next build`. Modul `src/modules/lingkungan` membaca `VERCEL_ENV`: aturan env murni (`masalahLingkungan`) diperiksa saat config Payload dimuat (`tolakEnvSalah`), penanda database di `payload_kv` (`lingkungan-database`) ditulis lingkungan pertama yang memakainya dan diperiksa di `onInit` (`jagaDatabase`, yang menghentikan proses bila database milik lingkungan lain), dan aturan password (`periksaPassword`) dipasang di hook `beforeValidate` koleksi `pengguna`. Header keamanan satu konstanta (`HEADER_KEAMANAN`) dipasang `headers()` di `next.config.ts`. Operasional di luar aplikasi: `.github/workflows/ci.yml`, `lighthouserc.json`, `.github/workflows/backup.yml` dengan `scripts/cadangkan-database.sh` dan `scripts/pulihkan-database.sh`, serta runbook `docs/operasional/pemulihan-database.md` dan `docs/operasional/rilis.md`.

**Tech Stack:** Next.js 16.3.8 (App Router, ISR, `headers()` di `next.config.ts`), Payload 3.92.1 (`@payloadcms/db-postgres` dengan `push`, `pool`, `onInit`, `payload migrate`, `migrate:create`, `payload_kv`, `ValidationError`), PostgreSQL 16 (lokal dan CI) dan 17 (Supabase), node-postgres lewat Supavisor mode transaksi, Vercel Pro (`vercel.json` `buildCommand`, `regions`, `crons`; fluid compute), GitHub Actions (service container `postgres:16`, `schedule`, artifact), `@lhci/cli` 0.15.1 (Lighthouse 12.6.1), GnuPG 2.4, Vitest 4, Playwright 1.63 + `@axe-core/playwright` 4.14, pnpm 10, Node 22.23.4+.

**Spesifikasi:** `docs/superpowers/specs/2026-11-03-point-lat-design.md` (§5 arsitektur, penjadwal, dan koneksi database; §12 performa dan Lighthouse CI; §15 penanganan galat dan backup database; §16 testing; §18 setup pemilik; §19 risiko).

**Rencana sebelumnya:** `docs/superpowers/plans/2026-11-04-rencana-1-fondasi.md` sampai `docs/superpowers/plans/2026-11-06-rencana-8b-paginasi-pemeliharaan.md` (master `f96a983`). Rencana ini memakai config Payload dan `postgresAdapter` (Rencana 1), adapter Cloudinary dan `pnpm media:siapkan` (Rencana 2), rute SEO dan `robots.txt` (Rencana 3), ISR bertag dan halaman 404 (Rencana 4A dan 4B), adapter `INDEXER_ADAPTER` dan cron `GET /api/jobs/run` di `vercel.json` (Rencana 6A), adapter `AI_ADAPTER` (Rencana 7), banner persetujuan dan iklan (Rencana 8A), dan `tests/e2e/siapkan.ts` beserta aturan E2E Rencana 8B. Baseline di `f96a983`: 523 tes unit (76 file), 158 tes integrasi (47 file), 150 tes E2E.

**Pembagian Rencana 8 (keputusan pengawas):** 8A (selesai): iklan, persetujuan cookie, admin berbahasa Indonesia. 8B (selesai): paginasi, Cek sekarang dan Pindai ulang sekarang, penjaga beacon 404. 8C (rencana ini): rilis. Semua cakupan 8C muat dalam 12 task (patokan 8 sampai 12), jadi tidak ada Rencana 8D; runbook rilis dan uji langsung adalah Task 12, dan langkah layanan luarnya dijalankan pemilik (Setup dari pemilik).

## Dependensi baru (butuh persetujuan pemilik)

| Paket | Keputusan rencana ini |
|---|---|
| `next` 16.3.8 dan `eslint-config-next` 16.3.8 (sekarang 16.3.3) | **Disetujui pemilik (6 November 2026).** Task 1: `package.json` 2 baris, `pnpm-lock.yaml` 64 baris tambah dan 64 baris hapus (66 dan 66 bersama `package.json`; koreksi saat eksekusi). Alasan: perbaikan keamanan 16.3.4 sampai 16.3.8 (Keputusan teknis). Tidak terbukti memperbaiki isi 404 yang kadang kosong (aturan "ulangi sekali" tetap). |
| `@lhci/cli` 0.15.1 (devDependency, versi persis) | **Disetujui pemilik (7 November 2026).** Rilis 25 Juni 2025, membawa Lighthouse 12.6.1. Di proyek ini menambah 239 paket di lockfile (`pnpm-lock.yaml` +2.025 baris, sekitar 150 MB di `node_modules`; npm mencatat 165 MB dan 295 paket bila dipasang sendiri). Hanya dipakai `pnpm lighthouse` dan job E2E CI; tidak masuk bundle situs. Alternatif yang dinilai: `lighthouse` 13.5.0 langsung dengan Chromium Playwright (170 MB, 115 paket, Node 22.19+) tanpa runner, median, dan assertion, jadi butuh sekitar 100 baris skrip sendiri; `@lhci/cli` 0.16.0 (Lighthouse 13.6.0, 217 MB) dirilis 2 November 2026, terlalu baru untuk dikunci; PageSpeed Insights API butuh jaringan dan URL publik, jadi tidak bisa menjaga pull request; tanpa Lighthouse, anggaran JS tetap dijaga `motion.spec.ts`. **Bila ditolak:** lepas Task 10 (catatan pelepasan ada di awal Task 10). |
| GitHub Actions pihak ketiga: `actions/checkout` v7.0.1, `pnpm/action-setup` v6.1.0, `actions/setup-node` v7.1.0, `actions/upload-artifact` v7.0.2 | Bukan dependensi aplikasi; kode yang berjalan di runner CI dan backup. Dikunci ke SHA commit rilisnya (diperiksa lewat `git ls-remote` ke tag rilis), dengan komentar versi. |
| Klien PostgreSQL 17 dari repositori resmi PostgreSQL (`apt.postgresql.org`) | Dipasang di runner oleh workflow backup (`postgresql-client-17`), karena `pg_dump` harus sama atau lebih baru dari server Supabase dan runner Ubuntu 24.04 membawa Postgres 16. Bukan dependensi repo. |
| Alat probe, tidak masuk repo | PgBouncer 1.22.0 (apt) sebagai pengganti Supavisor mode transaksi dengan TLS dan CA tiruan; `check-jsonschema` 0.39.0 dan `shellcheck` 0.11.0 di virtualenv scratchpad untuk memvalidasi workflow dan skrip. Executor rencana ini tidak memasangnya. |

## Global Constraints

- Node `^22.23.4 || >=24.22.1`, pnpm 10. Versi dikunci: Next `16.3.8` (setelah Task 1), Payload `3.92.1`, `@playwright/test` `1.63.0`, `@lhci/cli` `0.15.1` (Task 10). Tanpa dependensi lain.
- Nama domain berbahasa Indonesia (`databaseLokal`, `pushSkema`, `opsiPool`, `masalahLingkungan`, `tolakEnvSalah`, `jagaDatabase`, `periksaPassword`, `tolakPasswordLemah`, `HEADER_KEAMANAN`). Nama dari pihak luar tetap seperti aslinya (`VERCEL_ENV`, `DATABASE_CA`, `payload_kv`, `frame-ancestors`).
- Pesan, komentar, dan dokumen buatan rencana ini: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru.
- **Tes dan probe tidak pernah memanggil Vercel, Supabase, GitHub, Google, IndexNow, Cloudinary, atau Anthropic.** Database "Supabase" di tes adalah Postgres lokal; adapter tetap palsu; header diuji terhadap server lokal.
- **Database proyek.** Tes unit dan integrasi memakai `.env.test` (`pointlat_test`), E2E memakai `pointlat_test_e2e`, dan `pnpm build` memakai `.env` (`pointlat`). Database Supabase tidak pernah dihubungi dari workspace ini; langkah yang menyentuhnya ada di runbook pemilik.
- **Push skema hanya ke database lokal** (setelah Task 2): `pushSkema()` bernilai `true` untuk `localhost`, `127.0.0.1`, `::1`, dan soket Unix. Dev, tes, dan E2E tetap memakai push seperti rencana sebelumnya. Jangan menjalankan `pnpm migrate` di database dev yang dibuat push (Payload bertanya soal data loss karena ada baris migrasi `dev`); uji migrasi di database terpisah yang dibuat baru, misalnya `pointlat_migrasi`.
- **Perubahan skema harus aditif.** Rencana ini tidak mengubah field. Task 3 menulis migrasi awal dari skema sekarang; CI (Task 7) gagal bila skema berubah tanpa migrasi.
- `pnpm build` membaca database dev (`pointlat` dari `.env`). Postgres harus jalan (`pg_ctlcluster 16 main start` bila mati). Halaman yang sudah ada di `.next/cache/fetch-cache` tidak membaca database lagi saat build ulang, jadi uji build terhadap database lain selalu diawali `rm -rf .next`.
- E2E menjalankan `next build` sendiri di port 3100 (database `pointlat_test_e2e`, dibuat dan diisi ulang `tests/e2e/siapkan.ts`), jadi isi `.next/` diganti; jalankan `pnpm build` lagi sebelum `pnpm start` biasa. Server manual memakai port 3200 dan dihentikan dengan `fuser -k 3200/tcp`. Menunggu server: `timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'`. Jangan meninggalkan proses latar belakang.
- `next dev` dan `next build` di Next 16.3 bisa menambahkan blok "nextjs-agent-rules" ke `CLAUDE.md`. Periksa `git status` sebelum commit; buang blok itu dengan `git checkout CLAUDE.md` (Task 11 dan 12 sengaja mengubah `CLAUDE.md`; di task itu buang blok itu saja). Build yang tertinggal dari commit lain bisa meninggalkan `.next/types` yang menunjuk rute yang tidak ada (`TS2307`); hapus `.next` lalu ulangi `pnpm typecheck`.
- Jalankan `pnpm typecheck` dan `pnpm lint` di setiap task; keduanya harus bersih (tanpa error dan tanpa warning). Setiap task diakhiri unit, integrasi, dan E2E yang hijau. Keluaran tes integrasi ditulis ke file log dan dibaca utuh (jangan disaring `tail`), supaya pertanyaan DATA LOSS tidak tersembunyi.
- Tes integrasi berbagi database dan berjalan berurutan dengan urutan file yang tidak pasti. Tes rencana ini mencari datanya sendiri (`unik()`), mengosongkan penanda `lingkungan-database` sebelum setiap tes penanda (lingkungan diberikan sebagai argumen, bukan lewat `process.env`; di luar Vercel penanda yang tersisa diabaikan), dan tes password mengembalikan env lewat `vi.unstubAllEnvs()`.
- E2E berjalan berurutan di satu database. `header.spec.ts` (Task 6) tidak menerbitkan, membatalkan terbit, atau menghapus dokumen, jadi urutannya bebas; spec yang melakukannya tetap berjalan setelah `indexing.spec.ts`.
- **Isi 404 Next 16.3 yang kadang tidak dirender (warisan Rencana 4A dan 8B, masih terjadi di 16.3.8).** Tes yang membuka path 404 (`galat.spec.ts`, `motion.spec.ts` "kartu ke artikel memakai View Transitions", `cari.spec.ts` "cari dari halaman 404", dan `paginasi.spec.ts` untuk nomor di luar jangkauan; `header.spec.ts` memeriksa path 404 lewat `request`, bukan browser) sesekali gagal dengan `locator resolved to <html id="__next_error__">`, atribut `lang` kosong, atau beacon `/api/log-404/catat` yang tidak terkirim. Bila salah satu tes itu gagal dengan gejala tersebut, jalankan `pnpm test:e2e` sekali lagi; bila gagal lagi, atau tes lain yang gagal, berhenti dan laporkan. Jangan menaikkan timeout atau melemahkan tesnya.
- Next 16.3 kadang mengirim header `Location` dua kali pada redirect pertama sebuah path ISR; tes redirect memakai `toContain`, bukan `toBe`.
- **Rahasia.** Rencana, workflow, runbook, log, dan commit tidak pernah memuat kunci API, password database, token, ID penerbit, atau kredensial asli; contoh memakai nilai yang jelas palsu (`ci-hanya-untuk-build-0123456789abcdef`, `cadangan@contoh.test`). Jangan menampilkan nilai `SEED_ADMIN_*` atau `PAYLOAD_SECRET` dari `.env`.
- Karakter yang dibutuhkan kode (spasi tak putus, em dash, en dash, elipsis) ditulis sebagai escape `\u00a0`, `\u2014`, `\u2013`, `\u2026`; rencana ini tanpa karakter asli em dash, en dash, dan spasi tak putus. Salin blok kode rencana ini apa adanya.

## Keputusan teknis (hasil riset dan probe, dipakai di semua task)

| Topik | Keputusan | Dasar |
|---|---|---|
| Batas rencana | 12 task: Next 16.3.8 (1), koneksi dan push (2), migrasi awal (3), penjaga lingkungan (4), password admin (5), header keamanan (6), CI (7), backup dan runbook pemulihan (8), migrasi `kunci_data_api` (9), Lighthouse CI (10, bisa dilepas), dokumentasi (11), runbook rilis dan uji langsung (12). | Patokan 8 sampai 12 task per file. Semua task diverifikasi di probe per commit. |
| Next 16.3.8 | Naik di task pertama yang berdiri sendiri, tanpa perubahan kode. | Rilis v16.3.4 sampai v16.3.8 (GitHub, `git log v16.3.3..v16.3.8`; 16.3.8 terbit 30 September 2026): perbaikan keamanan dan ketahanan, antara lain pin DNS optimasi `next/image`, perlindungan DNS rebinding server MCP dev, path data peka huruf besar, kunci cache respons per rute, CSP nonce di `loading` dan `template`, dan SVG `next/og`. Proyek ini tidak memakai optimasi gambar Next (loader Cloudinary) dan tidak memakai `use cache`; probe: semua tes lulus (unit 523, integrasi 158, E2E 150) dan anggaran JS `motion.spec.ts` tetap. |
| Push atau migrasi | Push skema Payload hanya ke database lokal (`pushSkema()` dari host `DATABASE_URL`), bukan dari `NODE_ENV`. Dev, tes, E2E, dan service Postgres CI tetap push. Supabase hanya lewat migrasi. | Kode `@payloadcms/db-postgres` 3.92.1: push berjalan bila `NODE_ENV` bukan `production`, `PAYLOAD_MIGRATING` bukan `true`, dan `push` tidak `false`. `pnpm seed` atau `payload run` dari komputer pemilik ke Supabase berjalan dengan `NODE_ENV` development, jadi tanpa opsi ini Payload mendorong skema ke produksi. Dokumentasi migrasi Payload: jangan mencampur push dan migrasi di database yang sama; push menulis baris migrasi `dev` (batch -1) yang membuat `payload migrate` bertanya soal data loss. Push di dev dan tes mempertahankan semua rencana sebelumnya; CI menjaga agar migrasi ikut setiap perubahan skema. |
| Kapan migrasi berjalan | `vercel.json` `buildCommand` = `pnpm build:vercel`: `periksa:rilis` (env dan penanda), `migrate`, `periksa:rilis` lagi (menandai database yang baru dimigrasi), lalu `pnpm build`. Bukan `prodMigrations`. | Dokumentasi migrasi Payload: produksi wajib migrasi; contoh perintah build `payload migrate && pnpm build` membuat deploy gagal bila migrasi gagal (deploy lama tetap melayani); `prodMigrations` menjalankan migrasi saat init dan memperlambat cold start serverless. `vercel.json` `buildCommand` menimpa setelan dashboard. `pnpm build` membaca database (halaman statis), jadi skema harus sudah ada sebelum build. Probe: build bisa mengambil data dari `.next/cache/fetch-cache` tanpa menyentuh database, jadi penanda tidak bisa mengandalkan `next build`; `periksa:rilis` kedua menandai database yang baru dibuat migrasi. |
| Koneksi | Runtime dan migrasi lewat **Transaction pooler** Supavisor (port 6543, IPv4). Pool `pg` 5 koneksi per instance, koneksi menganggur ditutup 5 detik, batas sambung 10 detik. Backup lewat **Session pooler** (port 5432). | Dokumentasi Supabase: koneksi langsung hanya IPv6 (IPv4 add-on berbayar), Vercel dan GitHub Actions hanya IPv4; mode transaksi untuk fungsi serverless dan tidak mendukung prepared statement bernama. `pg` (dipakai Drizzle) mengirim statement tanpa nama. Compute Micro (bawaan Pro): 60 koneksi langsung, 200 klien pooler. Panduan pooling Vercel: satu pool global per instance fluid compute dengan idle pendek, bukan `max: 1`. Probe: 158 tes integrasi dan `payload migrate` lulus lewat PgBouncer mode transaksi dengan TLS terverifikasi (pool 5, tanpa push). `pg_dump` butuh sesi utuh, jadi backup memakai session pooler. |
| TLS database | `DATABASE_CA` (PEM sertifikat CA Supabase, `\n` tertulis juga diterima) menyalakan `ssl: { ca, rejectUnauthorized: true }` (verifikasi sertifikat dan nama host). Penjaga produksi dan pratinjau menolak koneksi tanpa `DATABASE_CA` dan tanpa `sslmode` di URL. | Dokumentasi Supabase SSL enforcement: `verify-full` butuh sertifikat CA yang diunduh dari dashboard (`prod-ca-2021.crt`). `pg-connection-string` 2.14.1: `sslmode=require` berarti `verify-full` dengan CA sistem kecuali `uselibpqcompat`, sehingga sertifikat Supabase ditolak tanpa CA. Probe: CA benar tersambung, CA lain `unable to verify the first certificate`, tanpa CA `SSL required`. |
| Sinyal lingkungan | `VERCEL_ENV` (`production`, `preview`); `development` dan di luar Vercel tanpa aturan tambahan. | Dokumentasi Vercel System Environment Variables: `VERCEL_ENV` tersedia saat build dan runtime bila System Environment Variables diekspos (setelan proyek). Runbook memeriksanya dari log build (`Lingkungan produksi siap`). |
| Penjaga env | `masalahLingkungan` (fungsi murni) dipanggil saat config dimuat (`tolakEnvSalah`), jadi `payload migrate`, `next build`, dan fungsi berhenti sebelum menyentuh database. Keduanya: `DATABASE_URL` bukan lokal dengan TLS, `PAYLOAD_SECRET` acak minimal 32 karakter dan bukan contoh, kredensial Cloudinary. Production: `INDEXER_ADAPTER` dan `AI_ADAPTER` diisi (`asli` atau `palsu`), `CRON_SECRET` minimal 16 karakter. Preview: kedua adapter `palsu`, tanpa `GOOGLE_SERVICE_ACCOUNT_JSON` dan `ANTHROPIC_API_KEY`. | Brief pengawas (pratinjau tidak boleh memakai adapter asli). Env Vercel dicentang per lingkungan; nilai yang tidak sengaja dicentang untuk Preview tertangkap saat build. Semua masalah dilaporkan sekaligus. |
| Penanda database | `payload_kv` kunci `lingkungan-database` berisi `{ lingkungan, ditandai }`, ditulis `ON CONFLICT (key) DO NOTHING` oleh deploy pertama yang memakainya; deploy lain ditolak. `onInit` memanggil `jagaDatabase`, yang menghentikan proses (`process.exit(1)`) bila database milik lingkungan lain. | `payload_kv` adalah tabel kunci-nilai bawaan Payload 3.92 (kunci unik), jadi tanpa field atau koleksi baru. Kode `getPayload` 3.92.1: setelah init gagal, panggilan berikutnya membuat Payload lagi dengan `disableOnInit`, sehingga galat dari `onInit` hanya menghentikan permintaan pertama; probe membuktikan server pratinjau dengan database produksi berhenti pada permintaan Payload pertama. URL database tidak dibandingkan antarlingkungan karena Vercel tidak memberi akses ke env lingkungan lain. |
| Database pratinjau | Proyek Supabase kedua di **organisasi Free terpisah** (Singapura). | Pilihan yang dinilai: branching Supabase (US$0,01344 per jam per branch Micro, sekitar US$10 per bulan untuk branch tetap, tidak tertutup spend cap dan kredit compute); proyek kedua di organisasi Pro (compute sekitar US$10 per bulan); organisasi Free (US$0, dua proyek Free per akun, dijeda setelah 7 hari aktivitas rendah dan bisa dilanjutkan dalam 90 hari); database produksi bersama (ditolak: pratinjau bisa mengubah data dan antrean produksi, Rencana 6A). Organisasi Pro tidak bisa berisi proyek Free. Risiko jeda dicatat di runbook. |
| Password admin | Di lingkungan terbuka (deploy Vercel, atau `DATABASE_URL` bukan lokal) password baru minimal 15 karakter, bukan contoh `.env.example`, tanpa kata `point`, `password`, `admin`, `qwerty`, `123456`, atau bagian depan email (4 karakter ke atas), dan minimal 4 karakter berbeda. Hook `beforeValidate` di `pengguna` melempar `ValidationError` di field `password`; seed mencetak pesan per isian. | NIST SP 800-63B-4: password sebagai satu-satunya faktor minimal 15 karakter, daftar tolak (nilai yang diketahui dan kata terkait layanan atau akun), tanpa aturan komposisi. Hook berlaku untuk seed, halaman buat admin pertama, buat pengguna, dan ganti password (probe: halaman buat admin pertama menolak password contoh lalu menerima frasa kuat). Lokal dan tes tidak diperiksa supaya data tes lama tetap berjalan. |
| Region dan durasi fungsi | `vercel.json` `"regions": ["sin1"]`. Tanpa `maxDuration`. | Dokumentasi Vercel: region bawaan `iad1`; fungsi sebaiknya dekat sumber data (Supabase `ap-southeast-1`). Fluid compute bawaan sejak 23 April 2025; Pro: durasi bawaan 300 detik, maksimum 800. Satu jalan cron dibatasi 200 baris dan 15 detik per permintaan keluar (Rencana 6A), jauh di bawah 300 detik; runbook I5 mengukur durasi nyata. |
| Header keamanan | Semua path lewat `headers()`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`, dan CSP `base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'`. `poweredByHeader: false`. Tanpa HSTS di aplikasi. | OWASP HTTP Headers Cheat Sheet dan dokumentasi `headers()` Next. Bantuan AdSense: hanya CSP ketat berbasis nonce yang didukung; panduan CSP Next: nonce membutuhkan render dinamis, yang mematikan ISR. Jadi CSP hanya memuat arahan yang tidak menyentuh skrip (tanpa `script-src`), dan CSP penuh ditunda. Vercel memasang HSTS `max-age=63072000` untuk domain kustom. `frame-ancestors 'self'` dan `SAMEORIGIN` tetap mengizinkan pratinjau langsung admin di situs sendiri. Permissions-Policy tidak menyentuh API privasi iklan. Probe: halaman ISR tetap `x-nextjs-cache: HIT` dan `s-maxage=3600`; E2E tanpa pelanggaran CSP di artikel dengan banner, iklan setelah persetujuan, dan admin. |
| CI | `.github/workflows/ci.yml`, dua job: `cek` (install, type check, lint, unit, cek migrasi, integrasi dengan service `postgres:16`, migrasi di database kosong lalu build) dan `e2e` (build produksi, Playwright, axe, lalu Lighthouse). Tanpa secret; `permissions: contents: read`; action dikunci SHA; `concurrency` membatalkan run lama di ref yang sama. | Brief pengawas (E2E di CI diputuskan dengan dasar): E2E sekitar 5 menit ditambah build, sepadan karena E2E menangkap regresi yang tidak terlihat unit (ISR, banner, iklan, admin). `.env.test` sudah di-commit; database tes dari service container. Cek migrasi: `payload migrate:create periksa --skip-empty` tidak membuat file bila skema sama; probe: field baru tanpa migrasi membuat langkah itu gagal dengan pesan `::error::`. Typegen Next tidak dibutuhkan type check di checkout bersih (probe). |
| Lighthouse CI | `@lhci/cli` 0.15.1, `lighthouserc.json`: mode HP bawaan, median 3 kali, beranda, artikel, rubrik, dan tools pada build dan database E2E, domain Cloudinary dan iklan diblokir. Gagal bila Performance < 0,9, CLS > 0,1, atau TBT > 200 ms; LCP > 2,5 detik hanya peringatan. | Spesifikasi §12. Probe, dua putaran (kedua lewat langkah CI lokal di commit akhir): Performance median 0,94 sampai 0,99, CLS 0, TBT median 54 sampai 72 ms, LCP median 1,86 sampai 3,02 detik. LCP kunjungan pertama adalah teks banner persetujuan; simulasi Lantern menghitung font Archivo 90 KB dan JS sebelum paint pertama, jadi artikel di sekitar 2,5 sampai 2,7 detik walau LCP terukur di browser sama dengan FCP (0,44 detik). Font hanya sumbu `wght` (35 KB) menurunkan artikel ke 2,45 detik tetapi menghilangkan judul ramping (`font-stretch`), jadi keputusan font ada di pemilik (Risiko). Berat JS tetap dijaga `motion.spec.ts`. |
| Backup mingguan | `.github/workflows/backup.yml` Minggu 02.23 WIB: `pg_dump` format custom skema `public` lewat session pooler dengan role `cadangan_baca` (baca saja), dienkripsi GPG ke kunci publik pemilik, `sha256`, artifact privat 90 hari. Pemulihan lewat `scripts/pulihkan-database.sh` ke database kosong. Spesifikasi §15 diubah dari bucket Supabase Storage. | Dokumentasi Supabase: backup harian Pro 7 hari dan ikut terhapus bersama proyek; dump mentah memuat skema internal Supabase, jadi hanya `public`. Runner Ubuntu 24.04: `gnupg2` 2.4.4 tersedia, `age` tidak. Artifact: bawaan 90 hari, repo privat bisa sampai 400 hari. Jadwal `schedule` dalam UTC dan bisa tertunda di awal jam. Bucket Storage di proyek yang sama ikut hilang bersama proyek dan butuh kunci service role. Probe: putaran penuh dump, enkripsi, dekripsi, pulih, build, dan E2E lulus. |
| Data API Supabase | Migrasi `kunci_data_api` mencabut hak `anon` dan `authenticated` atas tabel, sequence, dan fungsi `public` (juga hak bawaan untuk migrasi berikutnya) bila kedua role ada; pemilik juga mematikan Data API. | Dokumentasi Supabase "Securing your API": tabel di `public` otomatis diberi hak untuk `anon` dan `authenticated`; Data API yang dimatikan tidak menjawab endpoint REST apa pun. Payload tidak memakai RLS, jadi tanpa ini kunci publik proyek bisa membaca `pengguna` lewat REST bila Data API menyala. Probe: 108 tabel terbuka menjadi 0, `permission denied for table pengguna`. |
| Runbook rilis | `docs/operasional/rilis.md`: Supabase (produksi lalu pratinjau), migrasi dan seed dari komputer pemilik sebelum deploy pertama, Vercel (deploy pertama sengaja gagal di penjaga), env per lingkungan, domain, layanan luar, cek pasca-rilis, AdSense. Adapter produksi `palsu` sampai kunci Google dan Claude siap. | Seed lewat `payload run` di luar Vercel tidak bisa merevalidasi cache Vercel, jadi data awal harus ada sebelum build pertama. Probe: migrasi dan seed dari shell ke database pooler TLS dengan env shell yang mengalahkan `.env`, login dengan `PAYLOAD_SECRET` lain, dan `build:vercel` setelahnya. |

## Struktur file setelah rencana ini

```
package.json, pnpm-lock.yaml       next dan eslint-config-next 16.3.8; skrip migrate, periksa:rilis, build:vercel, lighthouse; @lhci/cli 0.15.1
vercel.json                        + buildCommand pnpm build:vercel, regions sin1
next.config.ts                     headers() dengan HEADER_KEAMANAN, poweredByHeader false
eslint.config.mjs                  src/migrations/ tidak di-lint (hasil generator)
lighthouserc.json                  Lighthouse CI: 4 halaman, median 3, anggaran
.gitignore                         + /.lighthouseci/, /lighthouse-laporan/
.env.example                       + DATABASE_CA dan catatan VERCEL_ENV, aturan password admin
src/lib/database.ts                databaseLokal, pushSkema, opsiPool, MAKS_KONEKSI_POOL, JEDA_IDLE_POOL_MS, BATAS_SAMBUNG_MS
src/lib/header-keamanan.ts         KEBIJAKAN_KONTEN, HEADER_KEAMANAN
src/migrations/
  20261106_152942_awal.ts, .json   migrasi awal (hasil migrate:create dari skema Rencana 8B)
  20261106_163351_kunci_data_api.ts, .json   cabut hak anon dan authenticated Supabase
  index.ts
src/modules/lingkungan/
  aturan.ts        JenisLingkungan, CONTOH_ENV, jenisLingkungan, lingkunganTerbuka, masalahLingkungan, keputusanPenanda
  penanda.ts       KUNCI_PENANDA, bacaPenanda, tulisPenanda (payload_kv)
  password.ts      MIN_PASSWORD, KATA_DITOLAK, periksaPassword
  index.ts         tolakEnvSalah, DatabaseLingkunganLain, periksaDatabase, jagaDatabase
src/hooks/tolakPasswordLemah.ts    hook beforeValidate koleksi pengguna
src/collections/Pengguna.ts        + beforeValidate tolakPasswordLemah
src/seed/run.ts                    pesan per isian saat ValidationError
src/scripts/periksa-rilis.ts       pnpm periksa:rilis
src/payload.config.ts              opsiPool, pushSkema, tolakEnvSalah, onInit jagaDatabase
scripts/cadangkan-database.sh, scripts/pulihkan-database.sh
.github/workflows/ci.yml, .github/workflows/backup.yml
docs/operasional/pemulihan-database.md, docs/operasional/rilis.md
tests/unit/database.test.ts, lingkungan.test.ts, password.test.ts, header-keamanan.test.ts
tests/int/lingkungan.int.spec.ts, password.int.spec.ts
tests/e2e/header.spec.ts
```

Diubah juga: `CLAUDE.md` dan spesifikasi (§5, §12, §15, §16, §18, §19). `src/payload-types.ts` dan import map admin tidak berubah (tanpa field dan komponen admin baru).

## Jumlah tes yang diharapkan

| Setelah task | Unit | Integrasi | E2E |
|---|---|---|---|
| Baseline (`f96a983`) | 523 tes (76 file) | 158 tes (47 file) | 150 tes |
| 1 Next 16.3.8 | 523 tes (76 file) | 158 tes (47 file) | 150 tes |
| 2 Koneksi database dan push | 529 tes (77 file) | 158 tes (47 file) | 150 tes |
| 3 Migrasi awal | 529 tes (77 file) | 158 tes (47 file) | 150 tes |
| 4 Penjaga lingkungan | 541 tes (78 file) | 162 tes (48 file) | 150 tes |
| 5 Password admin | 546 tes (79 file) | 164 tes (49 file) | 150 tes |
| 6 Header keamanan | 550 tes (80 file) | 164 tes (49 file) | 153 tes |
| 7 CI | 550 tes (80 file) | 164 tes (49 file) | 153 tes |
| 8 Backup mingguan | 550 tes (80 file) | 164 tes (49 file) | 153 tes |
| 9 Migrasi kunci_data_api | 550 tes (80 file) | 164 tes (49 file) | 153 tes |
| 10 Lighthouse CI | 550 tes (80 file) | 164 tes (49 file) | 153 tes |
| 11 Dokumentasi | 550 tes (80 file) | 164 tes (49 file) | 153 tes |
| 12 Runbook rilis | 550 tes (80 file) | 164 tes (49 file) | 153 tes |

---

### Task 1: Naik ke Next 16.3.8 dan eslint-config-next 16.3.8

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml`

**Interfaces:**
- Consumes: semua kode yang sudah ada (tanpa perubahan kode).
- Produces: Next `16.3.8` dan `eslint-config-next` `16.3.8` untuk semua task berikutnya.

Task ini berdiri sendiri supaya kegagalan karena versi Next terlihat terpisah dari perubahan rilis lain. Tidak ada tes baru: bukti task ini adalah seluruh tes yang sudah ada dan anggaran JS `motion.spec.ts` tetap lulus.

- [ ] **Langkah 1: Catat versi sekarang**

  ```bash
  pnpm ls next eslint-config-next --depth 0
  ```

  Hasil yang diharapkan: `next 16.3.3` di dependencies dan `eslint-config-next 16.3.3` di devDependencies.

- [ ] **Langkah 2: Naikkan versi**

  ```bash
  pnpm add -E next@16.3.8
  pnpm add -D -E eslint-config-next@16.3.8
  ```

  Hasil yang diharapkan: `package.json` berisi `"next": "16.3.8"` dan `"eslint-config-next": "16.3.8"`; `git diff --stat` menampilkan `package.json` (2 baris tambah, 2 hapus) dan `pnpm-lock.yaml` (64 baris tambah, 64 hapus; total 66 dan 66). pnpm boleh menyebut versi yang lebih baru tersedia; jangan dipakai.

- [ ] **Langkah 3: Jalankan semua tes**

  ```bash
  rm -rf .next
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int > /tmp/int-task1.log 2>&1; grep -E "Test Files|Tests " /tmp/int-task1.log
  pnpm test:e2e
  pnpm build
  ```

  Hasil yang diharapkan: type check dan lint bersih; unit 523 tes (76 file); integrasi 158 tes (47 file; baca log utuh, tanpa pertanyaan DATA LOSS); E2E 150 tes, termasuk anggaran JS di `motion.spec.ts`; build berhasil dengan `next-build (v16.3.8)`. Di probe, satu putaran E2E gagal sekali di `galat.spec.ts` dengan beacon 404 yang tidak terkirim (gejala isi 404 Next yang dikenal, Global Constraints) dan lulus 150 tes saat diulang.

- [ ] **Langkah 4: Commit**

  ```bash
  git add package.json pnpm-lock.yaml
  git commit -m "build: naik ke Next 16.3.8 dan eslint-config-next 16.3.8 (perbaikan keamanan 16.3.4 sampai 16.3.8)"
  ```

---

### Task 2: Koneksi database untuk Supabase dan push skema hanya ke database lokal

**Files:**
- Create: `src/lib/database.ts`, `tests/unit/database.test.ts`
- Modify: `src/payload.config.ts`
- Test: `tests/unit/database.test.ts`

**Interfaces:**
- Consumes: `postgresAdapter` (opsi `pool` dan `push`) dari `@payloadcms/db-postgres` 3.92.1.
- Produces:
  - `MAKS_KONEKSI_POOL = 5`, `JEDA_IDLE_POOL_MS = 5_000`, `BATAS_SAMBUNG_MS = 10_000`.
  - `databaseLokal(url: string | undefined): boolean`: `true` untuk URL kosong, `localhost`, `127.0.0.1`, `[::1]`, dan soket Unix (host kosong dengan parameter `host` berawalan `/`); URL rusak dianggap bukan lokal.
  - `pushSkema(env = process.env): boolean` = `databaseLokal(env.DATABASE_URL)`.
  - `type OpsiPool` dan `opsiPool(env = process.env): OpsiPool`: lokal `{ connectionString }`; bukan lokal ditambah `max`, `idleTimeoutMillis`, `connectionTimeoutMillis`, dan bila `DATABASE_CA` diisi `ssl: { ca, rejectUnauthorized: true }` (`\n` tertulis dipulihkan menjadi baris baru).

Tanpa opsi `push`, Payload mendorong skema ke database apa pun selama `NODE_ENV` bukan `production`, termasuk saat pemilik menjalankan `pnpm seed` dari komputernya ke Supabase. Dengan `pushSkema()`, dev, tes, E2E, dan CI tetap memakai push seperti sebelumnya, sedangkan database bersama hanya berubah lewat migrasi (Task 3).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/database.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { BATAS_SAMBUNG_MS, databaseLokal, JEDA_IDLE_POOL_MS, MAKS_KONEKSI_POOL, opsiPool, pushSkema } from '@/lib/database'

  /** Bentuk connection string Supabase dari dashboard (Connect), dengan nilai tiruan. */
  const SUPABASE_TRANSAKSI = 'postgresql://postgres.abcdefghijklmnopqrst:kata-sandi-tiruan@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres'
  const SUPABASE_SESI = 'postgresql://postgres.abcdefghijklmnopqrst:kata-sandi-tiruan@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres'
  const LOKAL = 'postgres://postgres:postgres@127.0.0.1:5432/pointlat'
  const CA = '-----BEGIN CERTIFICATE-----\nMIIDtiruan\n-----END CERTIFICATE-----'

  describe('databaseLokal', () => {
    it('localhost, 127.0.0.1, ::1, soket Unix, dan URL kosong adalah database lokal', () => {
      for (const url of [
        LOKAL,
        'postgres://postgres:postgres@localhost:5432/pointlat_test?application_name=pointlat_test',
        'postgres://postgres@[::1]:5432/pointlat',
        'postgres:///pointlat?host=/var/run/postgresql',
        '',
        undefined,
      ]) {
        expect(databaseLokal(url), String(url)).toBe(true)
      }
    })

    it('host lain (pooler dan koneksi langsung Supabase, nama host jaringan) bukan lokal; URL rusak juga bukan lokal', () => {
      for (const url of [
        SUPABASE_TRANSAKSI,
        SUPABASE_SESI,
        'postgresql://postgres:kata-sandi-tiruan@db.abcdefghijklmnopqrst.supabase.co:5432/postgres',
        'postgres://postgres:postgres@db:5432/pointlat',
        'postgres:///pointlat?host=db.contoh.test',
        'bukan url',
      ]) {
        expect(databaseLokal(url), url).toBe(false)
      }
    })
  })

  describe('pushSkema', () => {
    it('push skema Payload hanya ke database lokal', () => {
      expect(pushSkema({ DATABASE_URL: LOKAL })).toBe(true)
      expect(pushSkema({})).toBe(true)
      expect(pushSkema({ DATABASE_URL: SUPABASE_TRANSAKSI })).toBe(false)
      expect(pushSkema({ DATABASE_URL: SUPABASE_SESI, NODE_ENV: 'development' })).toBe(false)
    })
  })

  describe('opsiPool', () => {
    it('database lokal memakai bawaan driver', () => {
      expect(opsiPool({ DATABASE_URL: LOKAL, DATABASE_CA: CA })).toEqual({ connectionString: LOKAL })
      expect(opsiPool({})).toEqual({ connectionString: '' })
    })

    it('database bersama: pool kecil, koneksi menganggur cepat ditutup, batas menunggu koneksi', () => {
      expect(opsiPool({ DATABASE_URL: SUPABASE_TRANSAKSI })).toEqual({
        connectionString: SUPABASE_TRANSAKSI,
        max: MAKS_KONEKSI_POOL,
        idleTimeoutMillis: JEDA_IDLE_POOL_MS,
        connectionTimeoutMillis: BATAS_SAMBUNG_MS,
      })
      expect([MAKS_KONEKSI_POOL, JEDA_IDLE_POOL_MS, BATAS_SAMBUNG_MS]).toEqual([5, 5_000, 10_000])
    })

    it('DATABASE_CA menyalakan TLS dengan verifikasi sertifikat; baris baru yang ditulis sebagai \\n dipulihkan', () => {
      expect(opsiPool({ DATABASE_URL: SUPABASE_TRANSAKSI, DATABASE_CA: CA }).ssl).toEqual({ ca: CA, rejectUnauthorized: true })
      expect(opsiPool({ DATABASE_URL: SUPABASE_TRANSAKSI, DATABASE_CA: CA.replace(/\n/g, '\\n') }).ssl).toEqual({ ca: CA, rejectUnauthorized: true })
      expect(opsiPool({ DATABASE_URL: SUPABASE_TRANSAKSI, DATABASE_CA: '  ' }).ssl).toBeUndefined()
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  ```bash
  pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/database.test.ts
  ```

  Hasil yang diharapkan: FAIL `tests/unit/database.test.ts` dengan `Error: Cannot find package '@/lib/database'` (diimpor dari `tests/unit/database.test.ts`), `Tests  no tests`.

- [ ] **Langkah 3: Modul koneksi dan config Payload**

  `src/lib/database.ts`

  ```ts
  /**
   * Koneksi Postgres untuk adapter Payload (`postgresAdapter` di `payload.config.ts`). Lokal, tes, E2E, dan CI
   * memakai Postgres di mesin sendiri dengan push skema Payload; database bersama (Supabase produksi dan
   * pratinjau) hanya diubah lewat migrasi (`pnpm migrate`) dan dihubungi lewat pooler Supavisor mode transaksi.
   */

  type Env = Record<string, string | undefined>

  /** Koneksi per instance fungsi Vercel. Fluid compute berbagi satu pool untuk permintaan bersamaan di instance yang sama. */
  export const MAKS_KONEKSI_POOL = 5

  /** Koneksi menganggur ditutup cepat supaya instance yang ditangguhkan tidak menahan klien pooler. */
  export const JEDA_IDLE_POOL_MS = 5_000

  /** Batas menunggu koneksi, supaya fungsi tidak menggantung sampai batas durasinya saat pooler penuh. */
  export const BATAS_SAMBUNG_MS = 10_000

  const HOST_LOKAL = new Set(['', 'localhost', '127.0.0.1', '[::1]'])

  /**
   * Database di mesin sendiri (dev, tes, E2E, service Postgres CI): host `localhost`, `127.0.0.1`, `::1`, atau
   * soket Unix. Tanpa URL juga dianggap lokal (driver memakai `localhost`). URL yang tidak bisa dibaca dianggap
   * bukan lokal, jadi aturan yang lebih ketat yang berlaku.
   */
  export function databaseLokal(url: string | undefined): boolean {
    if (!url) return true
    try {
      const { hostname, searchParams } = new URL(url)
      const soket = searchParams.get('host')
      if (hostname === '') return !soket || soket.startsWith('/')
      return HOST_LOKAL.has(hostname)
    } catch {
      return false
    }
  }

  /**
   * Push skema Payload (Drizzle) hanya ke database lokal. Database bersama tidak pernah didorong, juga saat
   * `pnpm seed` atau skrip `payload run` dijalankan dari komputer dengan `DATABASE_URL` Supabase (tanpa
   * `NODE_ENV=production`, Payload mendorong skema bila opsi ini tidak dimatikan).
   */
  export function pushSkema(env: Env = process.env): boolean {
    return databaseLokal(env.DATABASE_URL)
  }

  export type OpsiPool = {
    connectionString: string
    max?: number
    idleTimeoutMillis?: number
    connectionTimeoutMillis?: number
    ssl?: { ca: string; rejectUnauthorized: true }
  }

  /**
   * Opsi pool `pg` untuk `postgresAdapter`. Database lokal memakai bawaan driver. Database bersama: pool kecil
   * (`MAKS_KONEKSI_POOL`), koneksi menganggur ditutup setelah `JEDA_IDLE_POOL_MS`, dan bila `DATABASE_CA`
   * (sertifikat CA Supabase, PEM) diisi, TLS dengan verifikasi sertifikat dan nama host. Statement `pg` tanpa
   * nama, jadi mode transaksi Supavisor (tanpa prepared statement bernama) tidak perlu opsi tambahan.
   */
  export function opsiPool(env: Env = process.env): OpsiPool {
    const connectionString = env.DATABASE_URL ?? ''
    if (databaseLokal(connectionString)) return { connectionString }
    const ca = env.DATABASE_CA?.replace(/\\n/g, '\n').trim()
    return {
      connectionString,
      max: MAKS_KONEKSI_POOL,
      idleTimeoutMillis: JEDA_IDLE_POOL_MS,
      connectionTimeoutMillis: BATAS_SAMBUNG_MS,
      ...(ca ? { ssl: { ca, rejectUnauthorized: true as const } } : {}),
    }
  }
  ```

  ```diff
  diff --git a/src/payload.config.ts b/src/payload.config.ts
  index 1c98e90..ef43bc2 100644
  --- a/src/payload.config.ts
  +++ b/src/payload.config.ts
  @@ -35,6 +35,7 @@ import { Iklan } from './globals/Iklan'
   import { Newsletter } from './globals/Newsletter'
   import { PengaturanSEO } from './globals/PengaturanSEO'
   import { BAHASA_ADMIN } from './lib/bahasa-admin'
  +import { opsiPool, pushSkema } from './lib/database'
   import { endpointJalankanJob } from './modules/indexer/endpoint'
   import { klienMedia } from './modules/media'
   import { mediaCloudinary } from './modules/media/plugin'
  @@ -97,8 +98,11 @@ export default buildConfig({
     i18n: BAHASA_ADMIN,
     secret: process.env.PAYLOAD_SECRET || '',
     typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  +  // Lokal dan tes: push skema ke Postgres sendiri. Supabase (produksi, pratinjau): hanya migrasi
  +  // (`src/migrations`, `pnpm migrate`), lewat pooler mode transaksi dengan pool kecil (`src/lib/database.ts`).
     db: postgresAdapter({
  -    pool: { connectionString: process.env.DATABASE_URL || '' },
  +    pool: opsiPool(),
  +    push: pushSkema(),
     }),
     sharp,
     plugins: [mediaCloudinary({ klien: klienMedia })],
  ```

- [ ] **Langkah 4: Jalankan semua tes**

  ```bash
  rm -rf .next
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int > /tmp/int-task2.log 2>&1; grep -E "Test Files|Tests " /tmp/int-task2.log
  pnpm test:e2e
  pnpm build
  ```

  Hasil yang diharapkan: bersih; unit 529 tes (77 file); integrasi 158 tes (47 file; database tes lokal tetap memakai push); E2E 150 tes; build berhasil. Di probe, 158 tes integrasi juga lulus lewat PgBouncer mode transaksi dengan TLS terverifikasi (`DATABASE_URL` ke host non-lokal dan `DATABASE_CA` tiruan, pool 5, tanpa push): bukti bahwa Payload berjalan di mode transaksi tanpa prepared statement bernama.

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/lib/database.ts src/payload.config.ts tests/unit/database.test.ts
  git commit -m "feat(database): koneksi Supabase lewat pooler mode transaksi dengan pool kecil, koneksi menganggur ditutup 5 detik, TLS terverifikasi lewat DATABASE_CA, dan push skema Payload hanya ke database lokal"
  ```

---

### Task 3: Migrasi awal Payload dari skema sekarang

**Files:**
- Create: `src/migrations/20261106_152942_awal.ts`, `src/migrations/20261106_152942_awal.json`, `src/migrations/index.ts` (hasil `payload migrate:create`)
- Modify: `package.json` (skrip `migrate`), `eslint.config.mjs` (`src/migrations/` tidak di-lint)

**Interfaces:**
- Consumes: skema Payload Rencana 8B (semua koleksi dan global, termasuk `pilar.disclaimer`, `tampilkan_tools`, `takarir`, dan `status_indeks.diminta_pada` yang ditunda ke rencana ini), `pushSkema` (Task 2).
- Produces: migrasi `20261106_152942_awal` (membuat 108 tabel), skrip `pnpm migrate`. Database kosong yang dimigrasi punya skema yang sama dengan database hasil push.

`payload migrate:create` membandingkan skema config dengan snapshot JSON migrasi terakhir (tanpa koneksi database) dan menulis SQL Drizzle. Hasilnya deterministik kecuali nama file (waktu pembuatan) dan `"id"` acak di akhir snapshot JSON, jadi langkah 1 menetapkan keduanya supaya hasil sama persis dengan commit probe. File migrasi hasil generator tidak diubah tangan dan tidak di-lint.

- [ ] **Langkah 1: Buat migrasi dan tetapkan nama serta id snapshot**

  ```bash
  pnpm payload migrate:create awal
  mv src/migrations/*_awal.ts src/migrations/20261106_152942_awal.ts
  mv src/migrations/*_awal.json src/migrations/20261106_152942_awal.json
  sed -i -E 's/^  "id": "[0-9a-f-]{36}",$/  "id": "2c404645-c208-41c7-bb9b-8f80aadf469a",/' src/migrations/20261106_152942_awal.json
  ```

  Hasil yang diharapkan: `src/migrations` berisi `20261106_152942_awal.ts` (1.997 baris), `20261106_152942_awal.json` (15.427 baris), dan `index.ts` yang masih menunjuk nama file asli.

- [ ] **Langkah 2: Indeks migrasi**

  `src/migrations/index.ts`

  ```ts
  import * as migration_20261106_152942_awal from './20261106_152942_awal';

  export const migrations = [
    {
      up: migration_20261106_152942_awal.up,
      down: migration_20261106_152942_awal.down,
      name: '20261106_152942_awal'
    },
  ];
  ```

- [ ] **Langkah 3: Periksa isi migrasi**

  ```bash
  sha256sum src/migrations/*
  ```

  Hasil yang diharapkan:

  ```
  029e03a3ba236d181d1eecd9326550d336f17b4d76d8a1f38913703cdc7db2f7  src/migrations/20261106_152942_awal.json
  bdf28f043784802e30ea58a6b5398959bd0b0bae867fb4903e7f836bccba45cf  src/migrations/20261106_152942_awal.ts
  cd416fc5de96547e034ce52109923cfb823b3402356ca20f07028bea25891eba  src/migrations/index.ts
  ```

  Bila hash `.ts` atau `.json` berbeda, skema config tidak sama dengan skema probe (misalnya ada perubahan koleksi yang belum ada di rencana ini): berhenti dan laporkan.

- [ ] **Langkah 4: Skrip `migrate` dan lint**

  ```diff
  diff --git a/package.json b/package.json
  index 6e88a4a..8c88b7e 100644
  --- a/package.json
  +++ b/package.json
  @@ -20,7 +20,8 @@
       "typecheck": "tsc --noEmit",
       "seed": "cross-env NODE_OPTIONS=--no-deprecation payload run src/seed/run.ts",
       "media:siapkan": "cross-env NODE_OPTIONS=--no-deprecation payload run src/scripts/siapkan-media.ts",
  -    "indexer": "cross-env NODE_OPTIONS=--no-deprecation payload run src/scripts/jalankan-indexer.ts"
  +    "indexer": "cross-env NODE_OPTIONS=--no-deprecation payload run src/scripts/jalankan-indexer.ts",
  +    "migrate": "cross-env NODE_OPTIONS=--no-deprecation payload migrate"
     },
     "dependencies": {
       "@payloadcms/db-postgres": "3.92.1",
  ```

  ```diff
  diff --git a/eslint.config.mjs b/eslint.config.mjs
  index 56491a4..6bf708e 100644
  --- a/eslint.config.mjs
  +++ b/eslint.config.mjs
  @@ -28,6 +28,7 @@ const eslintConfig = [
         '.next/',
         'media/',
         'src/payload-types.ts',
  +      'src/migrations/',
         'src/payload-generated-schema.ts',
         'src/app/(payload)/admin/importMap.js',
       ],
  ```

- [ ] **Langkah 5: Bukti skema migrasi sama dengan skema push, dan build dari database hasil migrasi**

  ```bash
  P=postgres://postgres:postgres@127.0.0.1:5432
  psql -q $P/postgres -c "DROP DATABASE IF EXISTS pointlat_migrasi WITH (FORCE)" -c "CREATE DATABASE pointlat_migrasi" -c "DROP DATABASE IF EXISTS pointlat_push WITH (FORCE)" -c "CREATE DATABASE pointlat_push"
  DATABASE_URL=$P/pointlat_migrasi pnpm migrate
  DATABASE_URL=$P/pointlat_push pnpm seed
  D=$(mktemp -d)
  for db in pointlat_migrasi pointlat_push; do
    pg_dump --schema-only --no-owner --no-privileges $P/$db | grep -vE '^\\(restrict|unrestrict) |^--' > $D/$db.sql
  done
  grep -c '^CREATE TABLE' $D/pointlat_migrasi.sql
  diff $D/pointlat_migrasi.sql $D/pointlat_push.sql && echo "skema sama"
  rm -rf .next
  DATABASE_URL=$P/pointlat_migrasi pnpm build > $D/build.log 2>&1 && echo "build berhasil"
  psql -tA $P/pointlat_migrasi -c "select name, batch from payload_migrations"
  psql -q $P/postgres -c "DROP DATABASE pointlat_migrasi WITH (FORCE)" -c "DROP DATABASE pointlat_push WITH (FORCE)"
  rm -rf .next $D
  ```

  `pg_dump` 16.15 menulis baris `\restrict` dan `\unrestrict` berkunci acak; baris itu dan komentar dibuang sebelum dibandingkan. `pnpm seed` ke database lokal membuat skema lewat push.

  Hasil yang diharapkan: `pnpm migrate` mencetak `Migrating: 20261106_152942_awal`, `Migrated:  20261106_152942_awal (...ms)`, dan `Done.`; `108` tabel; `skema sama`; `build berhasil`; satu baris `20261106_152942_awal|1` (tanpa baris `dev`, jadi build tidak mendorong skema).

- [ ] **Langkah 6: Skema dan migrasi selaras**

  ```bash
  pnpm payload migrate:create periksa --skip-empty
  git status --porcelain src/migrations
  ```

  Hasil yang diharapkan: tidak ada file baru (perintah kedua tidak mencetak apa pun). Ini pemeriksaan yang sama dengan CI (Task 7).

- [ ] **Langkah 7: Jalankan semua tes**

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int > /tmp/int-task3.log 2>&1; grep -E "Test Files|Tests " /tmp/int-task3.log
  pnpm test:e2e
  pnpm build
  ```

  Hasil yang diharapkan: bersih (lint tidak membaca `src/migrations/`); unit 529 tes (77 file); integrasi 158 tes (47 file); E2E 150 tes; build berhasil.

- [ ] **Langkah 8: Commit**

  ```bash
  git add eslint.config.mjs package.json src/migrations
  git commit -m "feat(database): migrasi awal Payload dari skema sekarang (produksi hanya lewat migrasi), skrip pnpm migrate, dan migrasi hasil generator tidak diperiksa lint"
  ```

---

### Task 4: Penjaga lingkungan deploy (env Production dan Preview, penanda database, build Vercel)

**Files:**
- Create: `src/modules/lingkungan/aturan.ts`, `src/modules/lingkungan/penanda.ts`, `src/modules/lingkungan/index.ts`, `src/scripts/periksa-rilis.ts`, `tests/unit/lingkungan.test.ts`, `tests/int/lingkungan.int.spec.ts`
- Modify: `src/payload.config.ts`, `package.json` (skrip `periksa:rilis` dan `build:vercel`), `vercel.json` (`buildCommand`, `regions`)
- Test: `tests/unit/lingkungan.test.ts`, `tests/int/lingkungan.int.spec.ts`

**Interfaces:**
- Consumes: `databaseLokal` (Task 2), tabel `payload_kv` bawaan Payload (kunci unik), `sql` dari `@payloadcms/db-postgres`, skrip `pnpm migrate` (Task 3).
- Produces:
  - `aturan.ts` (fungsi murni): `type JenisLingkungan = 'produksi' | 'pratinjau'`, `CONTOH_ENV` (nilai contoh `.env.example` untuk `PAYLOAD_SECRET` dan `SEED_ADMIN_PASSWORD`), `MIN_PAYLOAD_SECRET = 32`, `MIN_CRON_SECRET = 16`, `jenisLingkungan(env)`, `lingkunganTerbuka(env)` (deploy Vercel atau database bukan lokal), `masalahLingkungan(env): string[]`, `type Penanda`, `type KeputusanPenanda = { tulis; tolak }`, `keputusanPenanda(jenis, penanda)`.
  - `penanda.ts`: `KUNCI_PENANDA = 'lingkungan-database'`, `bacaPenanda(payload)` (`undefined` bila `payload_kv` belum ada), `tulisPenanda(payload, lingkungan, sekarang)` (`ON CONFLICT (key) DO NOTHING`).
  - `index.ts`: ekspor ulang, `tolakEnvSalah(env)` (melempar `Env deploy belum benar:` dengan semua masalah), `class DatabaseLingkunganLain`, `periksaDatabase(payload, env)`, `jagaDatabase(payload, env)` (`logger.fatal` lalu `process.exit(1)` untuk database milik lingkungan lain).
  - `pnpm periksa:rilis` mencetak `Lingkungan {produksi|pratinjau|lokal} siap: env dan database cocok.`; `pnpm build:vercel` = `periksa:rilis`, `migrate`, `periksa:rilis`, `build`.

Pesan penjaga ditulis untuk pemilik yang membaca log build Vercel: setiap pesan menyebut env yang salah dan cara memperbaikinya. Pratinjau yang memakai database produksi ditolak sebelum migrasi, jadi database produksi tidak pernah diubah oleh deploy pratinjau. `jagaDatabase` menghentikan proses karena `getPayload` 3.92.1 membuat ulang Payload tanpa `onInit` setelah init gagal (probe: tanpa `process.exit`, permintaan kedua ke server pratinjau dengan database produksi berhasil).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/lingkungan.test.ts`

  ```ts
  import { readFileSync } from 'fs'
  import type { Payload } from 'payload'
  import { describe, expect, it, vi } from 'vitest'

  import {
    bacaPenanda,
    CONTOH_ENV,
    jagaDatabase,
    jenisLingkungan,
    keputusanPenanda,
    lingkunganTerbuka,
    masalahLingkungan,
    tolakEnvSalah,
  } from '@/modules/lingkungan'

  /** Env Production lengkap dengan nilai tiruan (bentuknya sama dengan yang diisi pemilik di Vercel). */
  const PRODUKSI = {
    VERCEL_ENV: 'production',
    DATABASE_URL: 'postgresql://postgres.abcdefghijklmnopqrst:kata-sandi-tiruan@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
    DATABASE_CA: '-----BEGIN CERTIFICATE-----\nMIIDtiruan\n-----END CERTIFICATE-----',
    PAYLOAD_SECRET: 'tiruan-0123456789abcdef0123456789abcdef',
    CLOUDINARY_CLOUD_NAME: 'tiruan',
    CLOUDINARY_API_KEY: '000000000000000',
    CLOUDINARY_API_SECRET: 'rahasia-cloudinary-tiruan',
    INDEXER_ADAPTER: 'asli',
    AI_ADAPTER: 'asli',
    CRON_SECRET: 'cron-tiruan-0123456789',
    GOOGLE_SERVICE_ACCOUNT_JSON: '{"client_email":"indexer@tiruan.iam.gserviceaccount.com"}',
    ANTHROPIC_API_KEY: 'kunci-claude-tiruan',
  }

  /** Env Preview: database pratinjau sendiri, adapter palsu, tanpa kredensial Google dan Claude. */
  const PRATINJAU = {
    VERCEL_ENV: 'preview',
    DATABASE_URL: 'postgresql://postgres.zyxwvutsrqponmlkjihg:kata-sandi-tiruan@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
    DATABASE_CA: PRODUKSI.DATABASE_CA,
    PAYLOAD_SECRET: 'tiruan-pratinjau-0123456789abcdef0123',
    CLOUDINARY_CLOUD_NAME: 'tiruan',
    CLOUDINARY_API_KEY: '000000000000000',
    CLOUDINARY_API_SECRET: 'rahasia-cloudinary-tiruan',
    INDEXER_ADAPTER: 'palsu',
    AI_ADAPTER: 'palsu',
  }

  describe('jenisLingkungan dan lingkunganTerbuka', () => {
    it('VERCEL_ENV production dan preview; di luar Vercel dan development null', () => {
      expect(jenisLingkungan({ VERCEL_ENV: 'production' })).toBe('produksi')
      expect(jenisLingkungan({ VERCEL_ENV: 'preview' })).toBe('pratinjau')
      expect(jenisLingkungan({ VERCEL_ENV: 'development' })).toBeNull()
      expect(jenisLingkungan({})).toBeNull()
    })

    it('terbuka: deploy Vercel atau database bukan lokal (skrip dari komputer pemilik ke Supabase)', () => {
      expect(lingkunganTerbuka({ VERCEL_ENV: 'preview', DATABASE_URL: 'postgres://postgres@127.0.0.1:5432/x' })).toBe(true)
      expect(lingkunganTerbuka({ DATABASE_URL: PRODUKSI.DATABASE_URL })).toBe(true)
      expect(lingkunganTerbuka({ DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/pointlat' })).toBe(false)
      expect(lingkunganTerbuka({})).toBe(false)
    })

    it('nilai contoh sama dengan .env.example', () => {
      const contoh = readFileSync('.env.example', 'utf8')
      expect(contoh).toContain(`PAYLOAD_SECRET=${CONTOH_ENV.PAYLOAD_SECRET}\n`)
      expect(contoh).toContain(`SEED_ADMIN_PASSWORD=${CONTOH_ENV.SEED_ADMIN_PASSWORD}\n`)
    })
  })

  describe('masalahLingkungan', () => {
    it('di luar deploy Vercel tidak ada aturan tambahan', () => {
      expect(masalahLingkungan({})).toEqual([])
      expect(masalahLingkungan({ VERCEL_ENV: 'development', INDEXER_ADAPTER: 'asli' })).toEqual([])
    })

    it('Production dan Preview yang lengkap lolos', () => {
      expect(masalahLingkungan(PRODUKSI)).toEqual([])
      expect(masalahLingkungan({ ...PRODUKSI, INDEXER_ADAPTER: 'palsu', AI_ADAPTER: 'palsu' })).toEqual([])
      expect(masalahLingkungan(PRATINJAU)).toEqual([])
    })

    it('Production tanpa env wajib', () => {
      expect(masalahLingkungan({ VERCEL_ENV: 'production' })).toEqual([
        'DATABASE_URL belum diisi.',
        'PAYLOAD_SECRET wajib string acak minimal 32 karakter, bukan contoh dari .env.example.',
        'CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET wajib diisi.',
        'INDEXER_ADAPTER wajib diisi di Production: asli atau palsu.',
        'AI_ADAPTER wajib diisi di Production: asli atau palsu.',
        'CRON_SECRET wajib string acak minimal 16 karakter (Vercel Cron mengirimnya sebagai Bearer).',
      ])
    })

    it('database lokal, koneksi tanpa TLS, dan secret contoh ditolak; sslmode di URL menggantikan DATABASE_CA', () => {
      expect(masalahLingkungan({ ...PRODUKSI, DATABASE_URL: 'postgres://postgres:postgres@127.0.0.1:5432/pointlat' })).toEqual([
        'DATABASE_URL menunjuk database lokal. Isi connection string pooler Supabase mode transaksi (port 6543).',
      ])
      expect(masalahLingkungan({ ...PRODUKSI, DATABASE_CA: '' })).toEqual([
        'Koneksi database belum terenkripsi. Isi DATABASE_CA dengan sertifikat CA dari Supabase (Database Settings, SSL Configuration).',
      ])
      expect(masalahLingkungan({ ...PRODUKSI, DATABASE_CA: '', DATABASE_URL: `${PRODUKSI.DATABASE_URL}?sslmode=no-verify` })).toEqual([])
      expect(masalahLingkungan({ ...PRODUKSI, PAYLOAD_SECRET: CONTOH_ENV.PAYLOAD_SECRET })).toHaveLength(1)
      expect(masalahLingkungan({ ...PRODUKSI, CRON_SECRET: 'pendek' })).toHaveLength(1)
    })

    it('Preview dengan adapter asli atau kredensial Production ditolak', () => {
      expect(
        masalahLingkungan({
          ...PRATINJAU,
          INDEXER_ADAPTER: 'asli',
          AI_ADAPTER: '',
          GOOGLE_SERVICE_ACCOUNT_JSON: PRODUKSI.GOOGLE_SERVICE_ACCOUNT_JSON,
          ANTHROPIC_API_KEY: PRODUKSI.ANTHROPIC_API_KEY,
        }),
      ).toEqual([
        'INDEXER_ADAPTER wajib palsu di Preview: deploy pratinjau tidak boleh mengabari Google dan IndexNow.',
        'AI_ADAPTER wajib palsu di Preview: deploy pratinjau tidak memakai kunci Claude.',
        'GOOGLE_SERVICE_ACCOUNT_JSON hanya untuk Production. Hapus centang Preview di Vercel (Settings, Environment Variables).',
        'ANTHROPIC_API_KEY hanya untuk Production. Hapus centang Preview di Vercel (Settings, Environment Variables).',
      ])
    })

    it('tolakEnvSalah melempar semua masalah sekaligus', () => {
      expect(() => tolakEnvSalah(PRODUKSI)).not.toThrow()
      expect(() => tolakEnvSalah({ ...PRATINJAU, AI_ADAPTER: 'asli', PAYLOAD_SECRET: '' })).toThrow(
        'Env deploy belum benar:\n- PAYLOAD_SECRET wajib string acak minimal 32 karakter, bukan contoh dari .env.example.\n- AI_ADAPTER wajib palsu di Preview: deploy pratinjau tidak memakai kunci Claude.',
      )
    })
  })

  describe('penanda database', () => {
    it('deploy pertama menandai; lingkungan yang sama lolos; lingkungan lain ditolak; di luar Vercel diabaikan', () => {
      expect(keputusanPenanda('produksi', null)).toEqual({ tulis: 'produksi', tolak: null })
      expect(keputusanPenanda('pratinjau', null)).toEqual({ tulis: 'pratinjau', tolak: null })
      expect(keputusanPenanda('produksi', 'produksi')).toEqual({ tulis: null, tolak: null })
      expect(keputusanPenanda('pratinjau', 'produksi')).toEqual({
        tulis: null,
        tolak: 'Database ini milik Production, tetapi deploy ini Preview. Ganti DATABASE_URL di Preview (Vercel, Settings, Environment Variables).',
      })
      expect(keputusanPenanda('produksi', 'pratinjau').tolak).toBe(
        'Database ini milik Preview, tetapi deploy ini Production. Ganti DATABASE_URL di Production (Vercel, Settings, Environment Variables).',
      )
      expect(keputusanPenanda('produksi', 'staging').tolak).toContain('Database ini milik "staging"')
      expect(keputusanPenanda(null, 'produksi')).toEqual({ tulis: null, tolak: null })
    })

    it('database tanpa tabel payload_kv (sebelum migrasi pertama) belum perlu dilindungi; galat lain diteruskan', async () => {
      const payloadDengan = (galat: unknown) => ({ db: { drizzle: { execute: async () => Promise.reject(galat) } } }) as unknown as Payload
      const tanpaTabel = Object.assign(new Error('Failed query'), { cause: Object.assign(new Error('relation "payload_kv" does not exist'), { code: '42P01' }) })
      await expect(bacaPenanda(payloadDengan(tanpaTabel))).resolves.toBeUndefined()
      await expect(bacaPenanda(payloadDengan(Object.assign(new Error('password authentication failed'), { code: '28P01' })))).rejects.toThrow(
        'password authentication failed',
      )
    })

    it('jagaDatabase menghentikan proses bila database milik lingkungan lain (onInit tidak dipanggil lagi setelah init gagal)', async () => {
      const execute = vi.fn(async () => ({ rows: [{ data: { lingkungan: 'produksi' } }] }))
      const fatal = vi.fn()
      const payload = { db: { drizzle: { execute } }, logger: { fatal } } as unknown as Payload
      const keluar = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
      try {
        await jagaDatabase(payload, { VERCEL_ENV: 'preview' })
        expect(fatal).toHaveBeenCalledWith(
          'Database ini milik Production, tetapi deploy ini Preview. Ganti DATABASE_URL di Preview (Vercel, Settings, Environment Variables).',
        )
        expect(keluar).toHaveBeenCalledWith(1)
        keluar.mockClear()
        await jagaDatabase(payload, { VERCEL_ENV: 'production' })
        await jagaDatabase(payload, {})
        expect(keluar).not.toHaveBeenCalled()
        execute.mockRejectedValueOnce(new Error('connection terminated'))
        await expect(jagaDatabase(payload, { VERCEL_ENV: 'preview' })).rejects.toThrow('connection terminated')
        expect(keluar).not.toHaveBeenCalled()
      } finally {
        keluar.mockRestore()
      }
    })
  })
  ```

  `tests/int/lingkungan.int.spec.ts`

  ```ts
  import { sql } from '@payloadcms/db-postgres'
  import type { Payload } from 'payload'
  import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

  import { bacaPenanda, KUNCI_PENANDA, periksaDatabase, tulisPenanda } from '@/modules/lingkungan'

  import { getTestPayload } from './helpers'

  let payload: Payload

  const PRODUKSI = { VERCEL_ENV: 'production' }
  const PRATINJAU = { VERCEL_ENV: 'preview' }

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  // Penanda milik tes ini saja: tes lain dan server lokal tidak membacanya (di luar Vercel penanda diabaikan).
  beforeEach(async () => {
    await payload.db.drizzle.execute(sql`delete from payload_kv where key = ${KUNCI_PENANDA}`)
  })

  describe('penanda lingkungan database', () => {
    it('di luar deploy Vercel penanda tidak dibaca dan tidak ditulis', async () => {
      await periksaDatabase(payload, {})
      await periksaDatabase(payload, { VERCEL_ENV: 'development' })
      expect(await bacaPenanda(payload)).toBeNull()
    })

    it('deploy produksi pertama menandai database, deploy produksi berikutnya lolos', async () => {
      await periksaDatabase(payload, PRODUKSI)
      expect(await bacaPenanda(payload)).toBe('produksi')
      await expect(periksaDatabase(payload, PRODUKSI)).resolves.toBeUndefined()
      expect(await payload.kv.get(KUNCI_PENANDA)).toMatchObject({ lingkungan: 'produksi' })
    })

    it('deploy pratinjau menolak database produksi, deploy produksi menolak database pratinjau', async () => {
      await tulisPenanda(payload, 'produksi')
      await expect(periksaDatabase(payload, PRATINJAU)).rejects.toThrow(
        'Database ini milik Production, tetapi deploy ini Preview. Ganti DATABASE_URL di Preview (Vercel, Settings, Environment Variables).',
      )
      await payload.db.drizzle.execute(sql`delete from payload_kv where key = ${KUNCI_PENANDA}`)
      await periksaDatabase(payload, PRATINJAU)
      await expect(periksaDatabase(payload, PRODUKSI)).rejects.toThrow('Database ini milik Preview, tetapi deploy ini Production.')
    })

    it('worker build yang berjalan bersamaan menulis satu penanda, dan penanda tidak pernah ditimpa', async () => {
      await Promise.all(Array.from({ length: 6 }, () => periksaDatabase(payload, PRODUKSI)))
      const { rows } = await payload.db.drizzle.execute(sql`select count(*)::int as jumlah from payload_kv where key = ${KUNCI_PENANDA}`)
      expect(rows[0]).toEqual({ jumlah: 1 })
      await tulisPenanda(payload, 'pratinjau')
      expect(await bacaPenanda(payload)).toBe('produksi')
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  ```bash
  pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/lingkungan.test.ts
  pnpm exec cross-env NODE_OPTIONS=--no-deprecation vitest run --config ./vitest.int.config.mts tests/int/lingkungan.int.spec.ts
  ```

  Hasil yang diharapkan: keduanya FAIL dengan `Error: Cannot find package '@/modules/lingkungan'` (diimpor dari file tes masing-masing), `Tests  no tests`.

- [ ] **Langkah 3: Modul lingkungan**

  `src/modules/lingkungan/aturan.ts`

  ```ts
  import { databaseLokal } from '@/lib/database'

  /**
   * Aturan env per lingkungan deploy Vercel (fungsi murni). Lingkungan dibaca dari `VERCEL_ENV`, yang diisi
   * Vercel saat build dan runtime: `production` (situs live) dan `preview` (deploy pratinjau setiap branch dan
   * pull request). Di luar Vercel (lokal, CI, E2E) dan di `development` (`vercel env pull`) tidak ada aturan
   * tambahan, karena data dan alamatnya tidak terbuka.
   */

  type Env = Record<string, string | undefined>

  export type JenisLingkungan = 'produksi' | 'pratinjau'

  /** Nilai contoh di `.env.example` yang tidak boleh terbawa ke deploy (tes unit membandingkannya dengan file itu). */
  export const CONTOH_ENV = {
    PAYLOAD_SECRET: 'ganti-dengan-string-acak-minimal-32-karakter',
    SEED_ADMIN_PASSWORD: 'ganti-password-ini',
  } as const

  export const MIN_PAYLOAD_SECRET = 32
  export const MIN_CRON_SECRET = 16

  const NAMA: Record<JenisLingkungan, string> = { produksi: 'Production', pratinjau: 'Preview' }

  /** `produksi` atau `pratinjau` dari `VERCEL_ENV`; `null` di luar deploy Vercel. */
  export function jenisLingkungan(env: Env = process.env): JenisLingkungan | null {
    if (env.VERCEL_ENV === 'production') return 'produksi'
    if (env.VERCEL_ENV === 'preview') return 'pratinjau'
    return null
  }

  /**
   * Lingkungan yang datanya nyata atau alamatnya terbuka: deploy produksi dan pratinjau, atau database bukan
   * lokal (juga `pnpm seed` dari komputer pemilik ke Supabase). Aturan password admin berlaku di sini.
   */
  export function lingkunganTerbuka(env: Env = process.env): boolean {
    return jenisLingkungan(env) !== null || !databaseLokal(env.DATABASE_URL)
  }

  /**
   * Daftar masalah env untuk deploy produksi dan pratinjau, kosong bila siap. Produksi wajib memilih adapter
   * (`asli` atau `palsu`) dan punya `CRON_SECRET`; pratinjau wajib adapter `palsu` dan tidak boleh memegang
   * kredensial Google atau kunci Claude (nilai yang tidak sengaja dicentang untuk semua lingkungan di Vercel).
   */
  export function masalahLingkungan(env: Env = process.env): string[] {
    const jenis = jenisLingkungan(env)
    if (!jenis) return []
    const isi = (kunci: string) => env[kunci]?.trim() ?? ''
    const masalah: string[] = []

    const url = isi('DATABASE_URL')
    if (!url) masalah.push('DATABASE_URL belum diisi.')
    else if (databaseLokal(url)) masalah.push('DATABASE_URL menunjuk database lokal. Isi connection string pooler Supabase mode transaksi (port 6543).')
    else if (!isi('DATABASE_CA') && !/[?&]sslmode=/.test(url)) {
      masalah.push('Koneksi database belum terenkripsi. Isi DATABASE_CA dengan sertifikat CA dari Supabase (Database Settings, SSL Configuration).')
    }

    const secret = isi('PAYLOAD_SECRET')
    if (secret.length < MIN_PAYLOAD_SECRET || secret === CONTOH_ENV.PAYLOAD_SECRET) {
      masalah.push(`PAYLOAD_SECRET wajib string acak minimal ${MIN_PAYLOAD_SECRET} karakter, bukan contoh dari .env.example.`)
    }
    if (!isi('CLOUDINARY_CLOUD_NAME') || !isi('CLOUDINARY_API_KEY') || !isi('CLOUDINARY_API_SECRET')) {
      masalah.push('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET wajib diisi.')
    }

    if (jenis === 'produksi') {
      for (const kunci of ['INDEXER_ADAPTER', 'AI_ADAPTER']) {
        if (isi(kunci) !== 'asli' && isi(kunci) !== 'palsu') masalah.push(`${kunci} wajib diisi di Production: asli atau palsu.`)
      }
      if (isi('CRON_SECRET').length < MIN_CRON_SECRET) {
        masalah.push(`CRON_SECRET wajib string acak minimal ${MIN_CRON_SECRET} karakter (Vercel Cron mengirimnya sebagai Bearer).`)
      }
    } else {
      if (isi('INDEXER_ADAPTER') !== 'palsu') masalah.push('INDEXER_ADAPTER wajib palsu di Preview: deploy pratinjau tidak boleh mengabari Google dan IndexNow.')
      if (isi('AI_ADAPTER') !== 'palsu') masalah.push('AI_ADAPTER wajib palsu di Preview: deploy pratinjau tidak memakai kunci Claude.')
      for (const kunci of ['GOOGLE_SERVICE_ACCOUNT_JSON', 'ANTHROPIC_API_KEY']) {
        if (isi(kunci)) masalah.push(`${kunci} hanya untuk Production. Hapus centang Preview di Vercel (Settings, Environment Variables).`)
      }
    }
    return masalah
  }

  /** Nilai penanda database (`payload_kv`, kunci `KUNCI_PENANDA`): lingkungan pertama yang memakai database itu. */
  export type Penanda = JenisLingkungan

  export type KeputusanPenanda = { tulis: Penanda | null; tolak: string | null }

  /**
   * Database produksi dan pratinjau ditandai oleh deploy pertama yang memakainya. Deploy pratinjau menolak
   * database bertanda produksi (dan sebaliknya), jadi DATABASE_URL yang tertukar menghentikan build sebelum
   * migrasi, bukan mengubah data produksi. Di luar Vercel penanda tidak dibaca dan tidak ditulis.
   */
  export function keputusanPenanda(jenis: JenisLingkungan | null, penanda: string | null): KeputusanPenanda {
    if (!jenis) return { tulis: null, tolak: null }
    if (penanda === null) return { tulis: jenis, tolak: null }
    if (penanda === jenis) return { tulis: null, tolak: null }
    const milik = penanda === 'produksi' || penanda === 'pratinjau' ? NAMA[penanda] : `"${penanda}"`
    return {
      tulis: null,
      tolak: `Database ini milik ${milik}, tetapi deploy ini ${NAMA[jenis]}. Ganti DATABASE_URL di ${NAMA[jenis]} (Vercel, Settings, Environment Variables).`,
    }
  }
  ```

  `src/modules/lingkungan/penanda.ts`

  ```ts
  import { sql } from '@payloadcms/db-postgres'
  import type { Payload } from 'payload'

  import type { Penanda } from './aturan'

  /** Kunci baris penanda di tabel `payload_kv` (penyimpanan kunci-nilai bawaan Payload). */
  export const KUNCI_PENANDA = 'lingkungan-database'

  /**
   * Penanda lingkungan database, `null` bila belum ada. `undefined` bila tabel `payload_kv` belum ada
   * (database baru sebelum migrasi pertama), jadi belum ada yang perlu dilindungi.
   */
  export async function bacaPenanda(payload: Payload): Promise<string | null | undefined> {
    try {
      const { rows } = await payload.db.drizzle.execute(sql`select data from payload_kv where key = ${KUNCI_PENANDA}`)
      const data = rows[0]?.data as { lingkungan?: unknown } | undefined
      return typeof data?.lingkungan === 'string' ? data.lingkungan : null
    } catch (galat) {
      if (kodePostgres(galat) === '42P01') return undefined
      throw galat
    }
  }

  /** Kode galat Postgres (`42P01`: tabel tidak ada), juga bila dibungkus galat Drizzle (`cause`). */
  function kodePostgres(galat: unknown): string | undefined {
    const g = galat as { code?: unknown; cause?: unknown } | null
    if (typeof g?.code === 'string') return g.code
    return g?.cause ? kodePostgres(g.cause) : undefined
  }

  /**
   * Menulis penanda bila belum ada. `ON CONFLICT DO NOTHING`: worker build yang berjalan bersamaan tidak
   * saling menimpa, dan penanda yang sudah ada tidak pernah diganti.
   */
  export async function tulisPenanda(payload: Payload, lingkungan: Penanda, sekarang = new Date()): Promise<void> {
    const data = JSON.stringify({ lingkungan, ditandai: sekarang.toISOString() })
    await payload.db.drizzle.execute(
      sql`insert into payload_kv (key, data) values (${KUNCI_PENANDA}, ${data}::jsonb) on conflict (key) do nothing`,
    )
  }
  ```

  `src/modules/lingkungan/index.ts`

  ```ts
  import type { Payload } from 'payload'

  import { jenisLingkungan, keputusanPenanda, masalahLingkungan } from './aturan'
  import { bacaPenanda, tulisPenanda } from './penanda'

  export {
    CONTOH_ENV,
    jenisLingkungan,
    keputusanPenanda,
    lingkunganTerbuka,
    masalahLingkungan,
    MIN_CRON_SECRET,
    MIN_PAYLOAD_SECRET,
    type JenisLingkungan,
    type KeputusanPenanda,
    type Penanda,
  } from './aturan'
  export { bacaPenanda, KUNCI_PENANDA, tulisPenanda } from './penanda'

  type Env = Record<string, string | undefined>

  /**
   * Menolak config Payload yang dimuat dengan env deploy yang salah (dipanggil di `payload.config.ts`), jadi
   * `payload migrate`, `next build`, dan setiap fungsi Vercel berhenti sebelum menyentuh database.
   */
  export function tolakEnvSalah(env: Env = process.env): void {
    const masalah = masalahLingkungan(env)
    if (masalah.length) throw new Error(`Env deploy belum benar:\n- ${masalah.join('\n- ')}`)
  }

  /** Penolakan karena penanda database milik lingkungan lain (bukan galat koneksi atau query). */
  export class DatabaseLingkunganLain extends Error {}

  /**
   * Membaca penanda database: menolak database milik lingkungan lain (`DatabaseLingkunganLain`) atau menandai
   * database yang belum bertanda. Di luar deploy Vercel tidak melakukan apa pun (tanpa query).
   */
  export async function periksaDatabase(payload: Payload, env: Env = process.env): Promise<void> {
    const jenis = jenisLingkungan(env)
    if (!jenis) return
    const penanda = await bacaPenanda(payload)
    if (penanda === undefined) return
    const { tulis, tolak } = keputusanPenanda(jenis, penanda)
    if (tolak) throw new DatabaseLingkunganLain(tolak)
    if (tulis) await tulisPenanda(payload, tulis)
  }

  /**
   * `onInit` di `payload.config.ts`. Setelah init gagal, `getPayload` berikutnya membuat Payload lagi tanpa
   * `onInit`, jadi penolakan yang hanya melempar galat lolos di permintaan kedua. Karena itu database milik
   * lingkungan lain menghentikan proses: skrip dan build gagal, fungsi Vercel tidak melayani permintaan.
   * Galat lain (misalnya koneksi) diteruskan seperti init yang gagal biasa.
   */
  export async function jagaDatabase(payload: Payload, env: Env = process.env): Promise<void> {
    try {
      await periksaDatabase(payload, env)
    } catch (galat) {
      if (!(galat instanceof DatabaseLingkunganLain)) throw galat
      payload.logger.fatal(galat.message)
      process.exit(1)
    }
  }
  ```

- [ ] **Langkah 4: Config Payload, skrip periksa, dan build Vercel**

  ```diff
  diff --git a/src/payload.config.ts b/src/payload.config.ts
  index ef43bc2..889eaa4 100644
  --- a/src/payload.config.ts
  +++ b/src/payload.config.ts
  @@ -37,12 +37,16 @@ import { PengaturanSEO } from './globals/PengaturanSEO'
   import { BAHASA_ADMIN } from './lib/bahasa-admin'
   import { opsiPool, pushSkema } from './lib/database'
   import { endpointJalankanJob } from './modules/indexer/endpoint'
  +import { jagaDatabase, tolakEnvSalah } from './modules/lingkungan'
   import { klienMedia } from './modules/media'
   import { mediaCloudinary } from './modules/media/plugin'
   
   const filename = fileURLToPath(import.meta.url)
   const dirname = path.dirname(filename)
   
  +// Deploy Vercel dengan env yang salah berhenti di sini: sebelum migrasi, build, atau fungsi menyentuh database.
  +tolakEnvSalah()
  +
   export default buildConfig({
     admin: {
       user: Pengguna.slug,
  @@ -104,6 +108,8 @@ export default buildConfig({
       pool: opsiPool(),
       push: pushSkema(),
     }),
  +  // Deploy produksi dan pratinjau menandai databasenya; database milik lingkungan lain menghentikan proses.
  +  onInit: (payload) => jagaDatabase(payload),
     sharp,
     plugins: [mediaCloudinary({ klien: klienMedia })],
   })
  ```

  `src/scripts/periksa-rilis.ts`

  ```ts
  import config from '@payload-config'
  import { getPayload } from 'payload'

  import { jenisLingkungan } from '@/modules/lingkungan'

  /**
   * `pnpm periksa:rilis`, langkah pertama build Vercel (`pnpm build:vercel`), sebelum migrasi. Memuat config
   * (`tolakEnvSalah`: env deploy yang salah ditolak) dan menjalankan `onInit` (`periksaDatabase`: database milik
   * lingkungan lain ditolak, database baru ditandai), jadi migrasi tidak pernah menyentuh database yang salah.
   */
  const payload = await getPayload({ config })
  payload.logger.info(`Lingkungan ${jenisLingkungan() ?? 'lokal'} siap: env dan database cocok.`)
  process.exit(0)
  ```

  ```diff
  diff --git a/package.json b/package.json
  index 8c88b7e..be6f8a2 100644
  --- a/package.json
  +++ b/package.json
  @@ -21,7 +21,9 @@
       "seed": "cross-env NODE_OPTIONS=--no-deprecation payload run src/seed/run.ts",
       "media:siapkan": "cross-env NODE_OPTIONS=--no-deprecation payload run src/scripts/siapkan-media.ts",
       "indexer": "cross-env NODE_OPTIONS=--no-deprecation payload run src/scripts/jalankan-indexer.ts",
  -    "migrate": "cross-env NODE_OPTIONS=--no-deprecation payload migrate"
  +    "migrate": "cross-env NODE_OPTIONS=--no-deprecation payload migrate",
  +    "periksa:rilis": "cross-env NODE_OPTIONS=--no-deprecation payload run src/scripts/periksa-rilis.ts",
  +    "build:vercel": "pnpm periksa:rilis && pnpm migrate && pnpm periksa:rilis && pnpm build"
     },
     "dependencies": {
       "@payloadcms/db-postgres": "3.92.1",
  ```

  ```diff
  diff --git a/vercel.json b/vercel.json
  index 8751a9b..340380c 100644
  --- a/vercel.json
  +++ b/vercel.json
  @@ -1,4 +1,6 @@
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
  +  "buildCommand": "pnpm build:vercel",
  +  "regions": ["sin1"],
     "crons": [{ "path": "/api/jobs/run", "schedule": "*/10 * * * *" }]
   }
  ```

- [ ] **Langkah 5: Periksa penjaga dari terminal**

  ```bash
  pnpm periksa:rilis
  VERCEL_ENV=production pnpm periksa:rilis
  ```

  Hasil yang diharapkan: perintah pertama mencetak `Lingkungan lokal siap: env dan database cocok.` (di luar Vercel tanpa aturan tambahan); perintah kedua gagal (exit 1) dengan `Env deploy belum benar:` yang memuat `- DATABASE_URL menunjuk database lokal. Isi connection string pooler Supabase mode transaksi (port 6543).`, `- INDEXER_ADAPTER wajib diisi di Production: asli atau palsu.`, `- AI_ADAPTER wajib diisi di Production: asli atau palsu.`, dan `- CRON_SECRET wajib string acak minimal 16 karakter (Vercel Cron mengirimnya sebagai Bearer).` (butir lain tergantung isi `.env` lokal). Database dev tidak berubah.

- [ ] **Langkah 6: Jalankan semua tes**

  ```bash
  rm -rf .next
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int > /tmp/int-task4.log 2>&1; grep -E "Test Files|Tests " /tmp/int-task4.log
  pnpm test:e2e
  pnpm build
  ```

  Hasil yang diharapkan: bersih; unit 541 tes (78 file); integrasi 162 tes (48 file); E2E 150 tes (di luar Vercel penjaga tidak menambah query); build berhasil. Bukti probe di luar tes otomatis (Postgres lokal lewat PgBouncer mode transaksi dengan TLS sebagai pengganti Supabase): Production tanpa env wajib ditolak di `periksa:rilis`, `migrate`, dan `next build` dengan enam pesan tanpa satu tabel pun dibuat; Preview dengan adapter asli dan kunci Claude ditolak; `build:vercel` Production di database kosong menjalankan periksa, migrasi, periksa lagi (menandai `produksi`), lalu build; `build:vercel` dan `next build` Preview ke database itu berhenti dengan `FATAL: Database ini milik Production, tetapi deploy ini Preview. Ganti DATABASE_URL di Preview (Vercel, Settings, Environment Variables).` sebelum migrasi; server Preview berhenti pada permintaan Payload pertama; penanda tetap `produksi`.

- [ ] **Langkah 7: Commit**

  ```bash
  git add package.json src/modules/lingkungan src/payload.config.ts src/scripts/periksa-rilis.ts tests/int/lingkungan.int.spec.ts tests/unit/lingkungan.test.ts vercel.json
  git commit -m "feat(lingkungan): penjaga deploy Vercel (VERCEL_ENV): env Production dan Preview diperiksa saat config dimuat, database ditandai produksi atau pratinjau dan lingkungan lain menghentikan proses, build Vercel memeriksa sebelum dan sesudah migrasi, fungsi di sin1"
  ```

---

### Task 5: Password admin di lingkungan terbuka

**Files:**
- Create: `src/modules/lingkungan/password.ts`, `src/hooks/tolakPasswordLemah.ts`, `tests/unit/password.test.ts`, `tests/int/password.int.spec.ts`
- Modify: `src/collections/Pengguna.ts`, `src/seed/run.ts`
- Test: `tests/unit/password.test.ts`, `tests/int/password.int.spec.ts`

**Interfaces:**
- Consumes: `CONTOH_ENV` dan `lingkunganTerbuka` (Task 4), `ValidationError` dan `CollectionBeforeValidateHook` dari `payload`, `pesanGalat` dan `unik` dari `tests/int/helpers.ts`.
- Produces:
  - `MIN_PASSWORD = 15`, `KATA_DITOLAK = ['point', 'password', 'admin', 'qwerty', '123456']`.
  - `periksaPassword(password, { email }): true | string`, dengan pesan: `Password ini contoh dari .env.example. Buat password baru.`; `Password minimal 15 karakter. Pakai frasa panjang yang mudah kamu ingat, misalnya empat kata acak.`; `Password tidak boleh memuat "{kata}". Pakai kata yang tidak berhubungan dengan situs atau akunmu.` (juga bagian depan email bila 4 karakter ke atas); `Password terlalu mudah ditebak. Pakai frasa dengan kata yang berbeda-beda.` (kurang dari 4 karakter berbeda).
  - Hook `tolakPasswordLemah` (`beforeValidate` koleksi `pengguna`): bila `data.password` ada dan `lingkunganTerbuka()`, password yang ditolak menjadi `ValidationError` di field `password`.
  - `pnpm seed` yang ditolak mencetak `Seed dihentikan. password: {pesan}` lalu keluar dengan kode 1.

Aturan ini berlaku di deploy Vercel (halaman buat admin pertama, buat pengguna, ganti password) dan saat `pnpm seed` atau skrip lain dijalankan dari komputer pemilik ke database Supabase (database bukan lokal). Lokal, tes, dan E2E tidak diperiksa. Payload tanpa adapter email tidak mengirim tautan lupa password, jadi password diganti lewat halaman akun (diperiksa hook ini).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/password.test.ts`

  ```ts
  import type { PayloadRequest } from 'payload'
  import { afterEach, describe, expect, it, vi } from 'vitest'

  import { tolakPasswordLemah } from '@/hooks/tolakPasswordLemah'
  import { CONTOH_ENV } from '@/modules/lingkungan'
  import { KATA_DITOLAK, MIN_PASSWORD, periksaPassword } from '@/modules/lingkungan/password'

  const KUAT = 'kopi-hujan-sepeda-jendela'

  describe('periksaPassword', () => {
    it('frasa panjang lolos tanpa aturan huruf besar, angka, atau simbol', () => {
      expect(periksaPassword(KUAT, { email: 'redaksi@point.lat' })).toBe(true)
      expect(periksaPassword('x'.repeat(200) + 'abcd')).toBe(true)
    })

    it('password contoh .env.example dan password pendek ditolak dengan cara memperbaikinya', () => {
      expect(periksaPassword(CONTOH_ENV.SEED_ADMIN_PASSWORD)).toBe('Password ini contoh dari .env.example. Buat password baru.')
      expect(MIN_PASSWORD).toBe(15)
      expect(periksaPassword('kopi-hujan-sep')).toBe(
        'Password minimal 15 karakter. Pakai frasa panjang yang mudah kamu ingat, misalnya empat kata acak.',
      )
      expect(periksaPassword('kopi-hujan-sepe')).toBe(true)
    })

    it('kata yang terkait situs atau akun dan password yang berulang ditolak', () => {
      expect(KATA_DITOLAK).toEqual(['point', 'password', 'admin', 'qwerty', '123456'])
      expect(periksaPassword('Point-lat-hujan-sepeda')).toBe(
        'Password tidak boleh memuat "point". Pakai kata yang tidak berhubungan dengan situs atau akunmu.',
      )
      expect(periksaPassword('kopi-ADMIN-sepeda-jendela')).toBe(
        'Password tidak boleh memuat "admin". Pakai kata yang tidak berhubungan dengan situs atau akunmu.',
      )
      expect(periksaPassword('kopi-redaksi-sepeda-jendela', { email: 'redaksi@point.lat' })).toBe(
        'Password tidak boleh memuat "redaksi". Pakai kata yang tidak berhubungan dengan situs atau akunmu.',
      )
      expect(periksaPassword('ababababababababab')).toBe('Password terlalu mudah ditebak. Pakai frasa dengan kata yang berbeda-beda.')
    })
  })

  describe('tolakPasswordLemah', () => {
    afterEach(() => {
      vi.unstubAllEnvs()
    })

    const req = { t: (k: string) => k } as unknown as PayloadRequest
    const jalankan = (data: Record<string, unknown>, originalDoc?: Record<string, unknown>) =>
      tolakPasswordLemah({ data, originalDoc, req, operation: originalDoc ? 'update' : 'create' } as unknown as Parameters<typeof tolakPasswordLemah>[0])

    it('lokal dan tes (database lokal di luar Vercel) tidak diperiksa', () => {
      vi.stubEnv('VERCEL_ENV', '')
      vi.stubEnv('DATABASE_URL', 'postgres://postgres:postgres@127.0.0.1:5432/pointlat_test')
      expect(jalankan({ email: 'e@tes.local', password: 'rahasia-123' })).toEqual({ email: 'e@tes.local', password: 'rahasia-123' })
    })

    it('deploy Vercel atau database Supabase: password lemah ditolak di field password, tanpa password tidak diperiksa', () => {
      vi.stubEnv('VERCEL_ENV', 'production')
      expect(() => jalankan({ email: 'redaksi@point.lat', password: CONTOH_ENV.SEED_ADMIN_PASSWORD })).toThrow(
        expect.objectContaining({ data: expect.objectContaining({ errors: [{ path: 'password', message: 'Password ini contoh dari .env.example. Buat password baru.' }] }) }),
      )
      expect(jalankan({ email: 'redaksi@point.lat', password: KUAT })).toMatchObject({ password: KUAT })
      expect(jalankan({ nama: 'Redaksi' }, { email: 'redaksi@point.lat' })).toEqual({ nama: 'Redaksi' })

      vi.stubEnv('VERCEL_ENV', '')
      vi.stubEnv('DATABASE_URL', 'postgresql://postgres.abcdefghijklmnopqrst:kata-sandi-tiruan@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres')
      expect(() => jalankan({ password: 'kopi-redaksi-sepeda' }, { email: 'redaksi@point.lat' })).toThrow(
        expect.objectContaining({ data: expect.objectContaining({ errors: [expect.objectContaining({ path: 'password' })] }) }),
      )
    })
  })
  ```

  `tests/int/password.int.spec.ts`

  ```ts
  import type { Payload } from 'payload'
  import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

  import { getTestPayload, pesanGalat, unik } from './helpers'

  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  const pengguna = (password: string) => ({ email: `${unik('sandi')}@tes.local`, password, nama: 'Penguji password', peran: 'editor' as const })

  describe('password pengguna di lingkungan terbuka', () => {
    it('lokal dan tes tetap menerima password pendek (database tes lokal di luar Vercel)', async () => {
      const dibuat = await payload.create({ collection: 'pengguna', data: pengguna('rahasia-123') })
      await payload.delete({ collection: 'pengguna', id: dibuat.id })
    })

    it('deploy Vercel: buat pengguna dan ganti password menolak password contoh dan password lemah', async () => {
      vi.stubEnv('VERCEL_ENV', 'production')
      expect(await pesanGalat(payload.create({ collection: 'pengguna', data: pengguna('ganti-password-ini') }))).toBe(
        'password: Password ini contoh dari .env.example. Buat password baru.',
      )
      expect(await pesanGalat(payload.create({ collection: 'pengguna', data: pengguna('rahasia-123') }))).toBe(
        'password: Password minimal 15 karakter. Pakai frasa panjang yang mudah kamu ingat, misalnya empat kata acak.',
      )

      const dibuat = await payload.create({ collection: 'pengguna', data: pengguna('kopi-hujan-sepeda-jendela') })
      expect(await pesanGalat(payload.update({ collection: 'pengguna', id: dibuat.id, data: { password: 'kopi-admin-sepeda-jendela' } }))).toBe(
        'password: Password tidak boleh memuat "admin". Pakai kata yang tidak berhubungan dengan situs atau akunmu.',
      )
      await payload.update({ collection: 'pengguna', id: dibuat.id, data: { nama: 'Ganti nama tanpa password' } })
      await payload.update({ collection: 'pengguna', id: dibuat.id, data: { password: 'teh-pagi-kereta-jembatan' } })
      const masuk = await payload.login({ collection: 'pengguna', data: { email: dibuat.email, password: 'teh-pagi-kereta-jembatan' } })
      expect(masuk.user?.id).toBe(dibuat.id)
      await payload.delete({ collection: 'pengguna', id: dibuat.id })
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  ```bash
  pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/password.test.ts
  pnpm exec cross-env NODE_OPTIONS=--no-deprecation vitest run --config ./vitest.int.config.mts tests/int/password.int.spec.ts
  ```

  Hasil yang diharapkan: unit FAIL dengan `Error: Cannot find package '@/hooks/tolakPasswordLemah'` (diimpor dari `tests/unit/password.test.ts`), `Tests  no tests`; integrasi `1 failed | 1 passed (2)`: "lokal dan tes tetap menerima password pendek" lulus, "deploy Vercel: buat pengguna dan ganti password menolak password contoh dan password lemah" gagal dengan `Error: Operasi diharapkan gagal, tetapi berhasil.`

- [ ] **Langkah 3: Aturan password dan hook**

  `src/modules/lingkungan/password.ts`

  ```ts
  import { CONTOH_ENV } from './aturan'

  /**
   * Password pengguna admin di lingkungan terbuka (deploy produksi dan pratinjau, atau database Supabase).
   * Mengikuti NIST SP 800-63B-4: password sebagai satu-satunya faktor minimal 15 karakter, diperiksa terhadap
   * daftar tolak (nilai contoh dan kata yang terkait layanan atau akun), tanpa aturan komposisi (huruf besar,
   * angka, simbol) dan tanpa batas panjang yang rendah.
   */

  export const MIN_PASSWORD = 15

  /** Kata yang mudah ditebak untuk akun admin situs ini (daftar tolak konteks). */
  export const KATA_DITOLAK = ['point', 'password', 'admin', 'qwerty', '123456'] as const

  /** `true` bila password boleh dipakai, atau pesan yang menjelaskan cara memperbaikinya. */
  export function periksaPassword(password: string, opsi: { email?: string | null } = {}): true | string {
    if (password === CONTOH_ENV.SEED_ADMIN_PASSWORD) return 'Password ini contoh dari .env.example. Buat password baru.'
    if (password.length < MIN_PASSWORD) {
      return `Password minimal ${MIN_PASSWORD} karakter. Pakai frasa panjang yang mudah kamu ingat, misalnya empat kata acak.`
    }
    const kecil = password.toLowerCase()
    const namaAkun = opsi.email?.split('@')[0]?.toLowerCase() ?? ''
    const ditolak = [...KATA_DITOLAK, ...(namaAkun.length >= 4 ? [namaAkun] : [])].find((kata) => kecil.includes(kata))
    if (ditolak) return `Password tidak boleh memuat "${ditolak}". Pakai kata yang tidak berhubungan dengan situs atau akunmu.`
    if (new Set(kecil).size < 4) return 'Password terlalu mudah ditebak. Pakai frasa dengan kata yang berbeda-beda.'
    return true
  }
  ```

  `src/hooks/tolakPasswordLemah.ts`

  ```ts
  import { ValidationError, type CollectionBeforeValidateHook } from 'payload'

  import { lingkunganTerbuka } from '@/modules/lingkungan/aturan'
  import { periksaPassword } from '@/modules/lingkungan/password'

  /**
   * Password baru atau yang diganti di lingkungan terbuka (deploy Vercel, atau `pnpm seed` dan skrip ke database
   * Supabase) wajib lolos `periksaPassword`; berlaku juga untuk halaman buat admin pertama dan ganti password di
   * akun. Lokal, tes, dan E2E (database lokal di luar Vercel) tidak diperiksa.
   */
  export const tolakPasswordLemah: CollectionBeforeValidateHook = ({ data, originalDoc, req }) => {
    const password: unknown = data?.password
    if (typeof password !== 'string' || !lingkunganTerbuka()) return data
    const hasil = periksaPassword(password, { email: data?.email ?? originalDoc?.email })
    if (hasil !== true) {
      throw new ValidationError({ collection: 'pengguna', errors: [{ path: 'password', message: hasil }], req }, req.t)
    }
    return data
  }
  ```

  ```diff
  diff --git a/src/collections/Pengguna.ts b/src/collections/Pengguna.ts
  index a3ea657..07ccb45 100644
  --- a/src/collections/Pengguna.ts
  +++ b/src/collections/Pengguna.ts
  @@ -2,6 +2,7 @@ import type { CollectionConfig } from 'payload'
   
   import { isAdmin, isAdminField, isAdminOrSelf, isLoggedIn } from '@/access'
   import { tetapkanPeranAwal } from '@/hooks/tetapkanPeranAwal'
  +import { tolakPasswordLemah } from '@/hooks/tolakPasswordLemah'
   
   export const Pengguna: CollectionConfig = {
     slug: 'pengguna',
  @@ -19,6 +20,8 @@ export const Pengguna: CollectionConfig = {
       delete: isAdmin,
     },
     hooks: {
  +    // Deploy Vercel dan database Supabase: password minimal 15 karakter, bukan contoh .env.example (Rencana 8C).
  +    beforeValidate: [tolakPasswordLemah],
       beforeChange: [tetapkanPeranAwal],
     },
     fields: [
  ```

- [ ] **Langkah 4: Pesan seed per isian**

  ```diff
  diff --git a/src/seed/run.ts b/src/seed/run.ts
  index ecc8c3c..79bc1d6 100644
  --- a/src/seed/run.ts
  +++ b/src/seed/run.ts
  @@ -1,15 +1,21 @@
   import config from '@payload-config'
  -import { getPayload } from 'payload'
  +import { getPayload, ValidationError } from 'payload'
   
   import { seed } from './seed'
   
   const payload = await getPayload({ config })
  -const hasil = await seed(payload, {
  -  emailAdmin: process.env.SEED_ADMIN_EMAIL,
  -  passwordAdmin: process.env.SEED_ADMIN_PASSWORD,
  -})
  -
  -payload.logger.info(
  -  `Seed selesai. Admin: ${hasil.admin}. Pilar: ${hasil.pilar}. Halaman draf: ${hasil.halaman}. Tools baru: ${hasil.tools}. Parameter baru: ${hasil.parameter}.`,
  -)
  +try {
  +  const hasil = await seed(payload, {
  +    emailAdmin: process.env.SEED_ADMIN_EMAIL,
  +    passwordAdmin: process.env.SEED_ADMIN_PASSWORD,
  +  })
  +  payload.logger.info(
  +    `Seed selesai. Admin: ${hasil.admin}. Pilar: ${hasil.pilar}. Halaman draf: ${hasil.halaman}. Tools baru: ${hasil.tools}. Parameter baru: ${hasil.parameter}.`,
  +  )
  +} catch (galat) {
  +  if (!(galat instanceof ValidationError)) throw galat
  +  // Pesan per isian (misalnya password admin yang ditolak di database Supabase), bukan hanya nama isiannya.
  +  payload.logger.error(`Seed dihentikan. ${galat.data.errors.map((e) => `${e.path}: ${e.message}`).join(' ')}`)
  +  process.exit(1)
  +}
   process.exit(0)
  ```

- [ ] **Langkah 5: Jalankan semua tes**

  ```bash
  rm -rf .next
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int > /tmp/int-task5.log 2>&1; grep -E "Test Files|Tests " /tmp/int-task5.log
  pnpm test:e2e
  pnpm build
  ```

  Hasil yang diharapkan: bersih; unit 546 tes (79 file); integrasi 164 tes (49 file); E2E 150 tes (password E2E dan seed lokal tidak diperiksa); build berhasil. Bukti probe di luar tes otomatis (server Production tiruan lewat PgBouncer TLS): `pnpm seed` ke database non-lokal dengan password contoh mencetak `Seed dihentikan. password: Password ini contoh dari .env.example. Buat password baru.` tanpa membuat data; halaman `/admin/create-first-user` menolak password contoh (tetap di halaman itu; pesan aturan tampil di bawah isian di satu dari dua putaran probe, ringkasan `Isian berikut tidak valid: password` di putaran lain) lalu menerima frasa empat kata (`POST /api/pengguna/first-register` 200, admin dibuat); seed dengan frasa kuat mencetak `Seed selesai. Admin: dibuat. Pilar: 4. Halaman draf: 6. Tools baru: 6. Parameter baru: 22.` tanpa baris push `dev`.

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/collections/Pengguna.ts src/hooks/tolakPasswordLemah.ts src/modules/lingkungan/password.ts src/seed/run.ts tests/int/password.int.spec.ts tests/unit/password.test.ts
  git commit -m "feat(pengguna): password pengguna di deploy Vercel dan database Supabase minimal 15 karakter, bukan contoh .env.example, tanpa kata terkait situs atau akun; seed menampilkan alasan penolakan"
  ```

---

### Task 6: Header keamanan di semua jawaban

**Files:**
- Create: `src/lib/header-keamanan.ts`, `tests/unit/header-keamanan.test.ts`, `tests/e2e/header.spec.ts`
- Modify: `next.config.ts`
- Test: `tests/unit/header-keamanan.test.ts`, `tests/e2e/header.spec.ts`

**Interfaces:**
- Consumes: `headers()` dan `poweredByHeader` di config Next; `cegatCloudinary`, `cegatIklan`, dan data E2E yang sudah ada (banner persetujuan dan iklan menyala di E2E).
- Produces: `KEBIJAKAN_KONTEN` (CSP `base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'`) dan `HEADER_KEAMANAN: { key, value }[]` (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`, `Content-Security-Policy`), dipasang untuk `source: '/:path*'`.

Header dipasang lewat config, bukan dengan membaca permintaan di halaman, jadi halaman publik tetap ISR (E2E memeriksa `s-maxage` di beranda, artikel, dan rubrik). CSP tidak memuat arahan skrip karena AdSense hanya mendukung CSP ketat dengan nonce per permintaan; HSTS dipasang Vercel untuk domain kustom. Tes E2E ketiga membuka situs dari asal lain (`127.0.0.1` membingkai `localhost`) untuk membuktikan `frame-ancestors` menolak bingkai lintas asal.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/header-keamanan.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { HEADER_KEAMANAN, KEBIJAKAN_KONTEN } from '@/lib/header-keamanan'
  import nextConfig from '../../next.config'

  const header = (key: string) => HEADER_KEAMANAN.find((h) => h.key === key)?.value

  describe('header keamanan', () => {
    it('nosniff, referrer origin lintas situs, bingkai hanya situs sendiri, fitur perangkat dimatikan', () => {
      expect(HEADER_KEAMANAN.map((h) => h.key)).toEqual([
        'X-Content-Type-Options',
        'Referrer-Policy',
        'X-Frame-Options',
        'Permissions-Policy',
        'Content-Security-Policy',
      ])
      expect(header('X-Content-Type-Options')).toBe('nosniff')
      expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(header('X-Frame-Options')).toBe('SAMEORIGIN')
      expect(header('Permissions-Policy')).toBe('camera=(), microphone=(), geolocation=(), payment=(), usb=()')
    })

    it('CSP tanpa arahan skrip (AdSense hanya mendukung nonce per permintaan, yang mematikan ISR)', () => {
      expect(KEBIJAKAN_KONTEN).toBe("base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'")
      expect(KEBIJAKAN_KONTEN).not.toMatch(/script-src|default-src|unsafe/)
    })

    it('API privasi iklan dan HSTS tidak disentuh (HSTS dari Vercel)', () => {
      for (const fitur of ['browsing-topics', 'attribution-reporting', 'run-ad-auction', 'join-ad-interest-group']) {
        expect(header('Permissions-Policy')).not.toContain(fitur)
      }
      expect(header('Strict-Transport-Security')).toBeUndefined()
    })

    it('next.config memasang header di semua path dan tidak mengirim X-Powered-By', async () => {
      expect(nextConfig.poweredByHeader).toBe(false)
      const aturan = await nextConfig.headers!()
      expect(aturan[0]).toEqual({ source: '/:path*', headers: HEADER_KEAMANAN })
      expect(aturan.flatMap((a) => a.headers).some((h) => h.key.toLowerCase() === 'x-powered-by')).toBe(false)
    })
  })
  ```

  `tests/e2e/header.spec.ts`

  ```ts
  import { expect, test, type Page } from '@playwright/test'

  import { HEADER_KEAMANAN } from '@/lib/header-keamanan'

  import { cegatCloudinary, cegatIklan } from './bantu'
  import { ADMIN_E2E, SLUG, SLUG_SUB, TOOLS_CONTOH } from './data'

  /** Setiap header keamanan ada dengan nilai yang sama, dan teknologi situs tidak diumumkan (`X-Powered-By`). */
  function periksaHeader(header: Record<string, string>, path: string) {
    for (const { key, value } of HEADER_KEAMANAN) expect(header[key.toLowerCase()], `${path} ${key}`).toBe(value)
    expect(header['x-powered-by'], path).toBeUndefined()
  }

  /** Pesan konsol browser tentang Content Security Policy (permintaan atau bingkai yang ditolak). */
  function catatPelanggaranCsp(page: Page): string[] {
    const pesan: string[] = []
    page.on('console', (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text())) pesan.push(m.text())
    })
    return pesan
  }

  test('header keamanan di halaman publik, rute teknis, API, admin, dan 404; halaman publik tetap statis', async ({ request }) => {
    const statis = ['/', `/${SLUG.panduan}`, `/uang-karier/${SLUG_SUB.pajak}`, `/tools/${TOOLS_CONTOH[0].slug}`]
    for (const path of statis) {
      for (let kunjungan = 0; kunjungan < 2; kunjungan++) {
        const jawaban = await request.get(path)
        expect(jawaban.status(), path).toBe(200)
        periksaHeader(jawaban.headers(), path)
        // ISR: dilayani dari cache dengan s-maxage, bukan dirender per permintaan.
        expect(jawaban.headers()['cache-control'], path).toMatch(/s-maxage=\d+/)
      }
    }
    for (const [path, status] of [
      ['/robots.txt', 200],
      ['/sitemap.xml', 200],
      ['/api/pengguna/me', 200],
      ['/admin/login', 200],
      ['/tidak-ada-di-situs-ini', 404],
    ] as const) {
      const jawaban = await request.get(path)
      expect(jawaban.status(), path).toBe(status)
      periksaHeader(jawaban.headers(), path)
    }
  })

  test('CSP tidak menahan apa pun: artikel dengan banner, iklan setelah Izinkan semua, dan admin', async ({ page }) => {
    const pelanggaran = catatPelanggaranCsp(page)
    await cegatCloudinary(page)
    await cegatIklan(page)
    await page.goto(`/${SLUG.panduan}`)
    await page.getByRole('region', { name: 'Cookie dan iklan' }).getByRole('button', { name: 'Izinkan semua' }).click()
    const akhir = page.locator('[data-slot-iklan="artikel-akhir"]')
    await akhir.scrollIntoViewIfNeeded()
    await expect(akhir.locator('ins.adsbygoogle')).toHaveAttribute('data-ad-status', 'filled')

    await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
    await page.goto('/admin/collections/artikel')
    await expect(page.locator('.nav')).toHaveClass(/nav--nav-hydrated/)
    await expect(page.getByRole('link', { name: 'Buat Artikel baru' })).toBeVisible()
    expect(pelanggaran).toEqual([])
  })

  test('situs hanya bisa dibingkai situs sendiri: asal lain ditolak frame-ancestors', async ({ page, baseURL }) => {
    const pelanggaran = catatPelanggaranCsp(page)
    const bingkai = (asal: string) => `<!doctype html><title>bingkai</title><iframe title="artikel" src="${asal}/${SLUG.panduan}"></iframe>`

    await page.goto('/robots.txt')
    await page.setContent(bingkai(baseURL!))
    await expect(page.frameLocator('iframe').locator('h1')).toBeVisible()
    expect(pelanggaran).toEqual([])

    // Server yang sama lewat 127.0.0.1 adalah asal (origin) lain bagi localhost.
    await page.goto(`${baseURL!.replace('localhost', '127.0.0.1')}/robots.txt`)
    await page.setContent(bingkai(baseURL!))
    await expect.poll(() => pelanggaran.some((p) => p.includes("frame-ancestors 'self'"))).toBe(true)
    await expect(page.frameLocator('iframe').locator('h1')).toHaveCount(0)
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  ```bash
  pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/header-keamanan.test.ts
  ```

  Hasil yang diharapkan: FAIL dengan `Error: Cannot find package '@/lib/header-keamanan'` (diimpor dari `tests/unit/header-keamanan.test.ts`), `Tests  no tests`.

- [ ] **Langkah 3: Header keamanan dan config Next**

  `src/lib/header-keamanan.ts`

  ```ts
  /**
   * Header keamanan untuk semua jawaban (halaman publik ISR, admin Payload, API, rute teknis), dipasang lewat
   * `headers()` di `next.config.ts` supaya halaman publik tetap statis: header ditambahkan CDN, bukan dibaca
   * atau ditulis saat render.
   *
   * - HSTS tidak ditulis di sini: Vercel mengirim `Strict-Transport-Security: max-age=63072000` untuk domain
   *   sendiri dan mengalihkan HTTP ke HTTPS (308). `includeSubDomains` dan `preload` keputusan pemilik nanti,
   *   karena berlaku untuk semua subdomain `point.lat` (misalnya domain pelacak tautan penyedia newsletter).
   * - CSP hanya arahan yang tidak menyentuh skrip. AdSense hanya mendukung CSP ketat dengan nonce per
   *   permintaan, dan nonce membuat semua halaman dirender per permintaan (tanpa ISR dan cache CDN).
   * - `Permissions-Policy` hanya mematikan fitur perangkat yang tidak dipakai situs dan iklan; API privasi
   *   iklan (Topics, Attribution Reporting, Protected Audience) dibiarkan karena dipakai AdSense.
   */

  export type HeaderJawaban = { key: string; value: string }

  /** Arahan CSP yang ditegakkan: tanpa `<base>` asing, tanpa plugin, hanya dibingkai situs sendiri, form ke situs sendiri. */
  export const KEBIJAKAN_KONTEN = ["base-uri 'self'", "object-src 'none'", "frame-ancestors 'self'", "form-action 'self'"].join('; ')

  export const HEADER_KEAMANAN: HeaderJawaban[] = [
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
    { key: 'Content-Security-Policy', value: KEBIJAKAN_KONTEN },
  ]
  ```

  ```diff
  diff --git a/next.config.ts b/next.config.ts
  index c1a6312..8e8f6da 100644
  --- a/next.config.ts
  +++ b/next.config.ts
  @@ -3,10 +3,19 @@ import type { NextConfig } from 'next'
   import path from 'path'
   import { fileURLToPath } from 'url'
   
  +import { HEADER_KEAMANAN } from './src/lib/header-keamanan'
  +
   const __filename = fileURLToPath(import.meta.url)
   const dirname = path.dirname(__filename)
   
   const nextConfig: NextConfig = {
  +  // Tanpa `X-Powered-By` (Next dan Payload): teknologi situs tidak diumumkan di setiap jawaban.
  +  poweredByHeader: false,
  +  // Header keamanan di semua jawaban (`src/lib/header-keamanan.ts`). Lewat konfigurasi, bukan dibaca atau
  +  // ditulis saat render, jadi halaman publik tetap ISR.
  +  async headers() {
  +    return [{ source: '/:path*', headers: HEADER_KEAMANAN }]
  +  },
     images: {
       // Semua gambar dikirim Cloudinary (f_auto,q_auto, lebar srcset lewat c_limit). Next tidak
       // mengoptimasi ulang, jadi tidak ada /_next/image dan tidak ada biaya Image Optimization Vercel.
  ```

- [ ] **Langkah 4: Jalankan semua tes**

  ```bash
  rm -rf .next
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int > /tmp/int-task6.log 2>&1; grep -E "Test Files|Tests " /tmp/int-task6.log
  pnpm test:e2e
  pnpm build
  ```

  Hasil yang diharapkan: bersih; unit 550 tes (80 file); integrasi 164 tes (49 file); E2E 153 tes (3 tes `header.spec.ts` baru; tes banner, iklan, dan admin yang lama tetap lulus); build berhasil.

- [ ] **Langkah 5: Periksa header dan cache di server produksi lokal**

  ```bash
  PORT=3200 pnpm start > /tmp/server-task6.log 2>&1 &
  timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'
  curl -s -o /dev/null http://localhost:3200/
  curl -sI http://localhost:3200/ | grep -iE '^(x-content-type-options|referrer-policy|x-frame-options|permissions-policy|content-security-policy|cache-control|x-nextjs-cache|x-powered-by):'
  fuser -k 3200/tcp
  ```

  Hasil yang diharapkan: lima header keamanan dengan nilai di atas, `Cache-Control: s-maxage=3600, stale-while-revalidate=31532400`, `x-nextjs-cache: HIT`, dan tanpa `X-Powered-By`.

- [ ] **Langkah 6: Commit**

  ```bash
  git add next.config.ts src/lib/header-keamanan.ts tests/e2e/header.spec.ts tests/unit/header-keamanan.test.ts
  git commit -m "feat(keamanan): header keamanan di semua jawaban lewat next.config (nosniff, Referrer-Policy, X-Frame-Options dan frame-ancestors situs sendiri, Permissions-Policy perangkat, CSP tanpa arahan skrip) dan tanpa X-Powered-By; halaman publik tetap ISR"
  ```

---

### Task 7: CI GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `.env.test` yang sudah di-commit (database `pointlat_test` di service container), skrip `typecheck`, `lint`, `test:unit`, `test:int`, `test:e2e`, `migrate`, `build`, dan `payload migrate:create --skip-empty` (Task 3).
- Produces: workflow **CI** untuk push ke `master`, pull request, dan jalan manual. Job `cek` ("Type check, lint, unit, migrasi, integrasi, build") lalu job `e2e` ("E2E (build produksi, Playwright, axe)"; Task 10 menambah Lighthouse dan mengganti namanya).

Workflow tanpa secret: `PAYLOAD_SECRET` di workflow hanya untuk build CI dan sengaja tampak palsu. Service container `postgres:16` memakai port 5432 dan kredensial yang sama dengan `.env.test`, jadi tes tidak butuh konfigurasi tambahan. Langkah "Migrasi di database kosong" membuktikan di setiap commit bahwa migrasi membangun skema yang cukup untuk `next build` (Payload membuat database `pointlat_ci` sendiri bila belum ada). Action pihak ketiga dikunci ke SHA commit rilisnya; `actions/checkout` tanpa menyimpan kredensial.

- [ ] **Langkah 1: Workflow**

  `.github/workflows/ci.yml`

  ```yaml
  # CI point.lat: setiap push ke master dan setiap pull request. Tanpa rahasia: database tes dari service
  # Postgres 16 dan `.env.test` yang di-commit; kredensial layanan luar tidak pernah ada di sini (tes memakai
  # adapter palsu). Action dikunci ke SHA commit rilisnya.
  name: CI

  on:
    push:
      branches: [master]
    pull_request:
    workflow_dispatch:

  permissions:
    contents: read

  concurrency:
    group: ci-${{ github.ref }}
    cancel-in-progress: true

  env:
    # Hanya untuk `next build` di CI (bukan rahasia; produksi memakai nilai acak di env Vercel).
    PAYLOAD_SECRET: ci-hanya-untuk-build-0123456789abcdef

  jobs:
    cek:
      name: Type check, lint, unit, migrasi, integrasi, build
      runs-on: ubuntu-24.04
      timeout-minutes: 30
      services:
        postgres:
          image: postgres:16
          env:
            POSTGRES_USER: postgres
            POSTGRES_PASSWORD: postgres
            POSTGRES_DB: pointlat_test
          ports:
            - 5432:5432
          options: >-
            --health-cmd pg_isready
            --health-interval 5s
            --health-timeout 5s
            --health-retries 10
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            persist-credentials: false
        - uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0
          with:
            version: 10.28.0
        - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
          with:
            node-version: 22.23.4
            cache: pnpm
        - name: Pasang dependensi
          run: pnpm install --frozen-lockfile
        - name: Type check
          run: pnpm typecheck
        - name: Lint
          run: pnpm lint
        - name: Tes unit
          run: pnpm test:unit
        - name: Migrasi sesuai skema
          run: |
            pnpm payload migrate:create periksa --skip-empty
            if [ -n "$(git status --porcelain -- src/migrations)" ]; then
              git status --porcelain -- src/migrations
              echo "::error::Skema Payload berubah tanpa migrasi. Jalankan pnpm payload migrate:create <nama>, periksa SQL-nya, lalu commit file di src/migrations."
              exit 1
            fi
        - name: Tes integrasi
          run: pnpm test:int
        - name: Migrasi di database kosong, lalu build terhadap database itu
          env:
            DATABASE_URL: postgres://postgres:postgres@127.0.0.1:5432/pointlat_ci
          run: |
            pnpm migrate
            pnpm build

    e2e:
      name: E2E (build produksi, Playwright, axe)
      needs: cek
      runs-on: ubuntu-24.04
      timeout-minutes: 45
      services:
        postgres:
          image: postgres:16
          env:
            POSTGRES_USER: postgres
            POSTGRES_PASSWORD: postgres
            POSTGRES_DB: pointlat_test
          ports:
            - 5432:5432
          options: >-
            --health-cmd pg_isready
            --health-interval 5s
            --health-timeout 5s
            --health-retries 10
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            persist-credentials: false
        - uses: pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413 # v6.1.0
          with:
            version: 10.28.0
        - uses: actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1 # v7.1.0
          with:
            node-version: 22.23.4
            cache: pnpm
        - name: Pasang dependensi
          run: pnpm install --frozen-lockfile
        - name: Pasang Chromium Playwright
          run: pnpm exec playwright install --with-deps chromium
        - name: Tes E2E
          run: pnpm test:e2e
        - name: Simpan jejak tes yang gagal
          if: failure()
          uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
          with:
            name: jejak-e2e
            path: test-results/
            retention-days: 14
            if-no-files-found: ignore
  ```

- [ ] **Langkah 2: Jalankan langkah job `cek` secara lokal**

  Postgres lokal menggantikan service container; `.env.test` tetap menunjuk `pointlat_test`.

  ```bash
  rm -rf .next
  pnpm install --frozen-lockfile
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm payload migrate:create periksa --skip-empty
  git status --porcelain -- src/migrations
  pnpm test:int > /tmp/int-task7.log 2>&1; grep -E "Test Files|Tests " /tmp/int-task7.log
  psql -q postgres://postgres:postgres@127.0.0.1:5432/postgres -c "DROP DATABASE IF EXISTS pointlat_ci WITH (FORCE)"
  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pointlat_ci PAYLOAD_SECRET=ci-hanya-untuk-build-0123456789abcdef pnpm migrate
  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pointlat_ci PAYLOAD_SECRET=ci-hanya-untuk-build-0123456789abcdef pnpm build
  psql -q postgres://postgres:postgres@127.0.0.1:5432/postgres -c "DROP DATABASE pointlat_ci WITH (FORCE)"
  ```

  Hasil yang diharapkan: semua berhasil; `git status` tanpa keluaran; unit 550 tes (80 file); integrasi 164 tes (49 file); `pnpm migrate` mencetak `Database "pointlat_ci" does not exist, creating...` lalu `Migrated:  20261106_152942_awal`; build berhasil.

- [ ] **Langkah 3: Pastikan cek migrasi menangkap skema yang berubah tanpa migrasi**

  ```bash
  sed -i "s|^    { name: 'namaSitus', type: 'text', required: true, defaultValue: 'point.' },$|&\n    { name: 'ujiDrift', type: 'text' },|" src/globals/PengaturanSEO.ts
  pnpm payload migrate:create periksa --skip-empty
  git status --porcelain -- src/migrations
  git checkout src/globals/PengaturanSEO.ts src/migrations/index.ts
  rm src/migrations/*_periksa.ts src/migrations/*_periksa.json
  git status --porcelain
  ```

  Hasil yang diharapkan: `migrate:create` menulis migrasi `<waktu>_periksa`; `git status` pertama menampilkan ` M src/migrations/index.ts` dan dua file `?? src/migrations/<waktu>_periksa.json` dan `.ts` (di CI, langkah "Migrasi sesuai skema" lalu gagal dengan `::error::Skema Payload berubah tanpa migrasi. ...`); `git status` terakhir tanpa keluaran.

- [ ] **Langkah 4: Jalankan E2E**

  ```bash
  pnpm test:e2e
  pnpm build
  ```

  Hasil yang diharapkan: E2E 153 tes (langkah job `e2e`; `playwright install` di CI tidak dijalankan lokal karena Chromium sudah terpasang); build berhasil.

- [ ] **Langkah 5: Commit**

  ```bash
  git add .github/workflows/ci.yml
  git commit -m "ci: workflow GitHub Actions untuk push ke master dan pull request: type check, lint, unit, migrasi sesuai skema, integrasi dengan Postgres 16, build terhadap database hasil migrasi, lalu E2E; tanpa rahasia, action dikunci ke SHA"
  ```

---

### Task 8: Backup mingguan terenkripsi dan runbook pemulihan

**Files:**
- Create: `scripts/cadangkan-database.sh`, `scripts/pulihkan-database.sh` (keduanya executable), `.github/workflows/backup.yml`, `docs/operasional/pemulihan-database.md`

**Interfaces:**
- Consumes: migrasi (Task 3) dan `pnpm migrate` untuk database hasil pulih; `pg_dump`, `pg_restore`, `psql`, `gpg`, `sha256sum`.
- Produces:
  - `scripts/cadangkan-database.sh <folder>` dengan env `BACKUP_DATABASE_URL`, `BACKUP_KUNCI_PUBLIK` (kunci publik GPG ASCII armor), dan `PG_BIN` opsional: menolak `pg_dump` yang lebih lama dari server, `pg_dump --schema=public --no-owner --no-privileges --format=custom`, menolak cadangan tanpa data tabel, mengenkripsi ke kunci publik di `GNUPGHOME` sementara, menulis `pointlat-<waktu UTC>.dump.gpg` dan `.sha256`, lalu mencetak `Cadangan <berkas>: data <n> tabel, <ukuran> byte terenkripsi.`
  - `scripts/pulihkan-database.sh <berkas.dump.gpg> <url-database-kosong>`: memeriksa checksum, mendekripsi dengan kunci rahasia di keyring, menolak database tujuan yang sudah berisi tabel di `public`, memulihkan dalam satu transaksi, lalu mencetak `Dipulihkan: <n> tabel. Migrasi tercatat: <nama migrasi>.`
  - Workflow **Backup mingguan** (Minggu 02.23 WIB dan jalan manual) dengan secret `BACKUP_DATABASE_URL` dan `BACKUP_KUNCI_PUBLIK`, artifact `cadangan-database-<nomor run>` 90 hari.
  - Runbook pemulihan: penyiapan sekali (kunci GPG, role `cadangan_baca`, session pooler, secret), uji pulih setiap 3 bulan, dan pemulihan produksi (backup harian Supabase atau cadangan mingguan ke proyek baru).

Kunci rahasia GPG tidak pernah ada di GitHub, jadi artifact yang bocor tidak terbaca. Dump hanya skema `public` karena dump penuh proyek Supabase memuat skema internal platform yang tidak bisa dipulihkan ke proyek lain. Pemulihan membuang entri `SCHEMA - public` dari daftar `pg_restore` karena skema `public` sudah ada di database tujuan.

- [ ] **Langkah 1: Skrip cadangkan dan pulihkan**

  `scripts/cadangkan-database.sh`

  ```bash
  #!/usr/bin/env bash
  # Cadangan database point.lat: pg_dump skema public (format custom), daftar isinya diperiksa pg_restore, lalu
  # dienkripsi ke kunci publik GPG pemilik. Kunci rahasia untuk membukanya tidak pernah ada di GitHub.
  # Dipakai workflow "Backup mingguan" (.github/workflows/backup.yml) dan bisa dijalankan manual.
  #
  # Pemakaian: scripts/cadangkan-database.sh <folder-keluaran>
  #   BACKUP_DATABASE_URL  koneksi session pooler Supabase (port 5432; pg_dump butuh sesi utuh, mode transaksi tidak cukup)
  #   BACKUP_KUNCI_PUBLIK  kunci publik GPG pemilik (teks berzirah ASCII)
  #   PG_BIN               opsional: folder pg_dump, pg_restore, dan psql dengan versi sama atau lebih baru dari server
  set -euo pipefail

  folder=${1:?Pemakaian: scripts/cadangkan-database.sh <folder-keluaran>}
  : "${BACKUP_DATABASE_URL:?BACKUP_DATABASE_URL belum diisi}"
  : "${BACKUP_KUNCI_PUBLIK:?BACKUP_KUNCI_PUBLIK belum diisi}"
  bin=${PG_BIN:+$PG_BIN/}

  umask 077
  mkdir -p "$folder"
  kerja=$(mktemp -d)
  trap 'rm -rf "$kerja"' EXIT

  server=$("${bin}psql" "$BACKUP_DATABASE_URL" -XtAc 'show server_version_num')
  klien=$("${bin}pg_dump" --version | sed -E 's/^[^0-9]*([0-9]+).*/\1/')
  if (( server / 10000 > klien )); then
    echo "pg_dump $klien lebih lama dari server Postgres $(( server / 10000 )). Pasang klien versi server dan isi PG_BIN." >&2
    exit 1
  fi

  nama="pointlat-$(date -u +%Y%m%dT%H%M%SZ)"
  "${bin}pg_dump" --dbname="$BACKUP_DATABASE_URL" --schema=public --no-owner --no-privileges --format=custom --file="$kerja/$nama.dump"
  tabel=$("${bin}pg_restore" --list "$kerja/$nama.dump" | grep -c ' TABLE DATA ' || true)
  if (( tabel == 0 )); then
    echo "Cadangan tidak berisi data tabel. Periksa BACKUP_DATABASE_URL (database dan hak baca role)." >&2
    exit 1
  fi

  export GNUPGHOME="$kerja/gnupg"
  mkdir -m 700 "$GNUPGHOME"
  printf '%s\n' "$BACKUP_KUNCI_PUBLIK" > "$kerja/kunci-publik.asc"
  gpg --batch --quiet --trust-model always --recipient-file "$kerja/kunci-publik.asc" \
    --output "$folder/$nama.dump.gpg" --encrypt "$kerja/$nama.dump"
  (cd "$folder" && sha256sum "$nama.dump.gpg" > "$nama.dump.gpg.sha256")
  echo "Cadangan $folder/$nama.dump.gpg: data $tabel tabel, $(stat -c %s "$folder/$nama.dump.gpg") byte terenkripsi."
  ```

  `scripts/pulihkan-database.sh`

  ```bash
  #!/usr/bin/env bash
  # Memulihkan cadangan dari scripts/cadangkan-database.sh ke database kosong (lokal untuk uji pulih, atau proyek
  # Supabase baru). Kunci rahasia GPG pemilik harus sudah diimpor (gpg --import) di komputer ini; gpg meminta
  # passphrase-nya bila ada.
  #
  # Pemakaian: scripts/pulihkan-database.sh <cadangan.dump.gpg> <URL database tujuan yang kosong>
  #   PG_BIN  opsional: folder pg_restore dan psql dengan versi sama atau lebih baru dari pg_dump pembuat cadangan
  set -euo pipefail

  cadangan=${1:?Pemakaian: scripts/pulihkan-database.sh <cadangan.dump.gpg> <URL database tujuan>}
  tujuan=${2:?Pemakaian: scripts/pulihkan-database.sh <cadangan.dump.gpg> <URL database tujuan>}
  bin=${PG_BIN:+$PG_BIN/}

  if [ -f "$cadangan.sha256" ]; then
    (cd "$(dirname "$cadangan")" && sha256sum --check --quiet "$(basename "$cadangan").sha256")
  fi

  umask 077
  kerja=$(mktemp -d)
  trap 'rm -rf "$kerja"' EXIT
  gpg --quiet --output "$kerja/cadangan.dump" --decrypt "$cadangan"

  ada=$("${bin}psql" "$tujuan" -XtAc "select count(*) from information_schema.tables where table_schema = 'public'")
  if [ "$ada" != 0 ]; then
    echo "Database tujuan sudah berisi $ada tabel di skema public. Pulihkan ke database kosong." >&2
    exit 1
  fi

  # Skema public sudah ada di database baru (Postgres dan Supabase), jadi entri pembuatnya dilewati.
  "${bin}pg_restore" --list "$kerja/cadangan.dump" | grep -vE ' SCHEMA - public | COMMENT - SCHEMA public ' > "$kerja/daftar"
  "${bin}pg_restore" --use-list="$kerja/daftar" --dbname="$tujuan" --no-owner --no-privileges --exit-on-error --single-transaction \
    "$kerja/cadangan.dump"

  tabel=$("${bin}psql" "$tujuan" -XtAc "select count(*) from information_schema.tables where table_schema = 'public'")
  migrasi=$("${bin}psql" "$tujuan" -XtAc "select coalesce(string_agg(name, ', ' order by name), '-') from payload_migrations where batch > 0")
  echo "Dipulihkan: $tabel tabel. Migrasi tercatat: $migrasi."
  ```

  ```bash
  chmod +x scripts/cadangkan-database.sh scripts/pulihkan-database.sh
  ```

- [ ] **Langkah 2: Workflow backup**

  `.github/workflows/backup.yml`

  ```yaml
  # Backup mingguan database produksi (spesifikasi §15), di luar backup harian Supabase Pro (7 hari). pg_dump
  # lewat session pooler Supabase (IPv4), dienkripsi ke kunci publik GPG pemilik, lalu disimpan sebagai artifact
  # privat repo selama 90 hari. Rahasia hanya di GitHub Actions secrets: BACKUP_DATABASE_URL (role baca saja)
  # dan BACKUP_KUNCI_PUBLIK. Kunci rahasia untuk membuka cadangan disimpan pemilik di luar GitHub.
  name: Backup mingguan

  on:
    schedule:
      # Minggu 02.23 WIB (Sabtu 19.23 UTC): lalu lintas rendah, bukan awal jam (jadwal awal jam sering tertunda).
      - cron: '23 19 * * 6'
    workflow_dispatch:

  permissions:
    contents: read

  concurrency:
    group: backup
    cancel-in-progress: false

  jobs:
    backup:
      name: pg_dump, enkripsi, simpan
      runs-on: ubuntu-24.04
      timeout-minutes: 20
      env:
        # Versi utama Postgres proyek Supabase (Settings, Infrastructure). pg_dump harus sama atau lebih baru.
        PG_MAJOR: '17'
      steps:
        - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
          with:
            persist-credentials: false
        - name: Pasang klien PostgreSQL dari repositori resmi PostgreSQL
          run: |
            sudo apt-get install -y -qq postgresql-common
            sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
            sudo apt-get install -y -qq "postgresql-client-${PG_MAJOR}"
        - name: Dump dan enkripsi
          env:
            BACKUP_DATABASE_URL: ${{ secrets.BACKUP_DATABASE_URL }}
            BACKUP_KUNCI_PUBLIK: ${{ secrets.BACKUP_KUNCI_PUBLIK }}
            PG_BIN: /usr/lib/postgresql/${{ env.PG_MAJOR }}/bin
          run: scripts/cadangkan-database.sh cadangan
        - uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
          with:
            name: cadangan-database-${{ github.run_number }}
            path: cadangan/
            retention-days: 90
            compression-level: 0
            if-no-files-found: error
  ```

- [ ] **Langkah 3: Runbook pemulihan**

  `docs/operasional/pemulihan-database.md`

  ````markdown
  # Runbook: Cadangan dan pemulihan database point.lat

  **Pemilik:** pemilik point.lat | **Frekuensi:** cadangan otomatis setiap minggu; uji pulih setiap 3 bulan dan setelah Postgres Supabase dinaikkan versinya; pemulihan saat dibutuhkan.
  **Diperbarui:** 6 November 2026 (Rencana 8C) | **Uji pulih terakhir:** 6 November 2026, probe Rencana 8C (lihat Riwayat).

  ## Tujuan

  Database produksi (Supabase Pro, Singapura) punya dua lapis cadangan:

  | Lapis | Isi | Disimpan | Dipakai bila |
  |---|---|---|---|
  | Backup harian bawaan Supabase Pro | Seluruh proyek (fisik) | 7 hari, di Supabase | Data salah atau terhapus dalam 7 hari terakhir dan proyek Supabase masih ada |
  | Cadangan mingguan GitHub Actions (`.github/workflows/backup.yml`) | Skema `public` (semua tabel Payload), `pg_dump` format custom, terenkripsi GPG | 90 hari, artifact privat repo `vanhallen28/point.lat` | Proyek Supabase hilang atau terhapus (backup harian ikut terhapus bersama proyek), atau data yang dibutuhkan lebih lama dari 7 hari |

  Cadangan mingguan dienkripsi ke kunci publik GPG pemilik sebelum disimpan. Kunci rahasia untuk membukanya tidak pernah ada di GitHub, jadi artifact yang bocor tidak bisa dibaca. Media (gambar dan video) ada di Cloudinary, bukan di database; cadangan ini hanya menyimpan URL dan metadatanya.

  ## Prasyarat

  - [ ] Akses Owner di organisasi Supabase dan admin di repo GitHub `vanhallen28/point.lat`.
  - [ ] Komputer dengan `gpg` (GnuPG 2.2 atau lebih baru), `psql` dan `pg_restore` versi sama dengan Postgres Supabase (lihat Settings, Infrastructure), Node dan pnpm, serta salinan repo.
  - [ ] Kunci rahasia GPG cadangan di pengelola password pemilik (dibuat di bagian A).

  ## A. Penyiapan sekali

  ### A1. Buat kunci GPG khusus cadangan

  ```bash
  gpg --quick-generate-key "Cadangan point.lat <email-pemilik>" ed25519 sign never
  gpg --list-keys --with-colons "Cadangan point.lat" | awk -F: '/^fpr/{print $10; exit}'
  gpg --quick-add-key <sidik-jari-dari-perintah-sebelumnya> cv25519 encr never
  gpg --armor --export "Cadangan point.lat" > kunci-publik-cadangan.asc
  gpg --armor --export-secret-keys "Cadangan point.lat" > kunci-rahasia-cadangan.asc
  ```

  GPG meminta passphrase; buat passphrase panjang dan simpan di pengelola password. Simpan isi `kunci-rahasia-cadangan.asc` sebagai catatan aman di pengelola password, lalu hapus file itu dari disk.

  **Hasil yang diharapkan:** `gpg --list-keys "Cadangan point.lat"` menampilkan baris `sub cv25519 ... [E]`.
  **Bila gagal:** pastikan versi GnuPG 2.2 atau lebih baru (`gpg --version`).

  ### A2. Role baca saja untuk cadangan di Supabase

  Supabase menyarankan satu role untuk setiap layanan luar, bukan password `postgres`. Di dashboard Supabase proyek produksi, buka SQL Editor dan jalankan (password dibuat pengelola password; hindari simbol supaya tidak perlu di-encode di URL):

  ```sql
  create role cadangan_baca with login password '<password-acak-dari-pengelola-password>';
  grant usage on schema public to cadangan_baca;
  grant select on all tables in schema public to cadangan_baca;
  grant select on all sequences in schema public to cadangan_baca;
  alter default privileges for role postgres in schema public grant select on tables to cadangan_baca;
  alter default privileges for role postgres in schema public grant select on sequences to cadangan_baca;
  ```

  `alter default privileges` membuat tabel dari migrasi berikutnya ikut terbaca role ini.

  **Hasil yang diharapkan:** setiap pernyataan selesai tanpa galat.

  ### A3. Connection string session pooler role itu

  Di Supabase, Connect, pilih **Session pooler** (port 5432, IPv4; runner GitHub hanya IPv4, dan `pg_dump` butuh sesi utuh sehingga mode transaksi port 6543 tidak cukup). Ganti nama pengguna `postgres.<ref>` dengan `cadangan_baca.<ref>` dan passwordnya dengan password A2. Periksa dari komputer:

  ```bash
  psql "<url-session-pooler-cadangan_baca>" -c "select count(*) from artikel"
  psql "<url-session-pooler-cadangan_baca>" -c "insert into pilar (nama) values ('uji')"
  ```

  **Hasil yang diharapkan:** perintah pertama mencetak jumlah artikel; perintah kedua ditolak `permission denied for table pilar`.

  ### A4. Secret GitHub Actions

  Di repo `vanhallen28/point.lat`: Settings, Secrets and variables, Actions, **New repository secret**:

  | Nama | Isi |
  |---|---|
  | `BACKUP_DATABASE_URL` | URL session pooler `cadangan_baca` dari A3 |
  | `BACKUP_KUNCI_PUBLIK` | seluruh isi `kunci-publik-cadangan.asc` (dari `-----BEGIN PGP PUBLIC KEY BLOCK-----` sampai `-----END PGP PUBLIC KEY BLOCK-----`) |

  ### A5. Versi Postgres

  Bila Supabase menampilkan versi utama selain 17 (Settings, Infrastructure), ubah `PG_MAJOR` di `.github/workflows/backup.yml` lewat commit biasa. Skrip menolak `pg_dump` yang lebih lama dari server dengan pesan yang menyebut kedua versi.

  ### A6. Jalankan sekali dari GitHub

  Actions, **Backup mingguan**, **Run workflow** (branch `master`).

  **Hasil yang diharapkan:** run hijau; log langkah "Dump dan enkripsi" berakhir dengan `Cadangan cadangan/pointlat-<waktu UTC>.dump.gpg: data <n> tabel, <ukuran> byte terenkripsi.`; di halaman run ada artifact `cadangan-database-<nomor run>` berisi `pointlat-<waktu>.dump.gpg` dan `.sha256`.
  **Bila gagal:** lihat Pemecahan masalah.

  Jadwal otomatis: setiap Minggu pukul 02.23 WIB (GitHub dapat menundanya saat sibuk). Artifact disimpan 90 hari (13 cadangan); batas repo privat bisa dinaikkan sampai 400 hari di Settings, Actions, General.

  ## B. Uji pulih (setiap 3 bulan)

  Uji ini memakai database lokal, jadi tidak menyentuh produksi.

  ### B1. Unduh cadangan terbaru

  Actions, run **Backup mingguan** terakhir yang hijau, Artifacts, unduh `cadangan-database-<nomor>`, lalu ekstrak zip-nya ke folder kerja.

  ### B2. Impor kunci rahasia

  ```bash
  gpg --import kunci-rahasia-cadangan.asc
  ```

  (salin isi catatan pengelola password ke file sementara, impor, lalu hapus file itu.)

  ### B3. Pulihkan ke database lokal kosong

  ```bash
  psql postgres://postgres:postgres@127.0.0.1:5432/postgres -c "create database pointlat_pulih"
  scripts/pulihkan-database.sh pointlat-<waktu>.dump.gpg postgres://postgres:postgres@127.0.0.1:5432/pointlat_pulih
  ```

  Bila `pg_restore` lokal lebih lama dari versi Postgres Supabase, isi `PG_BIN` dengan folder klien versi itu (misalnya `PG_BIN=/usr/lib/postgresql/17/bin`). GPG meminta passphrase kunci.

  **Hasil yang diharapkan:** checksum cocok, lalu `Dipulihkan: <n> tabel. Migrasi tercatat: <daftar migrasi>.` dengan daftar migrasi sama dengan isi `src/migrations/index.ts` saat cadangan dibuat.
  **Bila gagal:** `Database tujuan sudah berisi ...` berarti database tidak kosong; buat database baru.

  ### B4. Jalankan situs dari database hasil pulih

  ```bash
  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pointlat_pulih pnpm migrate
  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pointlat_pulih pnpm build
  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pointlat_pulih INDEXER_ADAPTER=palsu AI_ADAPTER=palsu \
    CLOUDINARY_CLOUD_NAME=<cloud-name-produksi> CLOUDINARY_API_KEY=uji-pulih CLOUDINARY_API_SECRET=uji-pulih PORT=3200 pnpm start
  ```

  Cloud name asli membuat gambar tampil dari CDN Cloudinary; API key dan secret tiruan cukup karena uji pulih tidak mengunggah apa pun. Adapter palsu memastikan uji ini tidak mengabari Google atau memanggil Claude.

  **Hasil yang diharapkan:** `pnpm migrate` hanya mencetak `Done.` (semua migrasi sudah tercatat, kecuali migrasi yang lebih baru dari cadangan); build berhasil; `http://localhost:3200/`, satu artikel, satu rubrik, satu tools, `/sitemap.xml`, dan `/admin/login` menjawab 200; login admin dengan akun produksi berhasil; jumlah artikel di admin sama dengan produksi saat cadangan dibuat.

  ### B5. Bersihkan

  ```bash
  psql postgres://postgres:postgres@127.0.0.1:5432/postgres -c "drop database pointlat_pulih"
  gpg --delete-secret-keys "Cadangan point.lat"
  ```

  Hapus file cadangan yang diunduh. Catat hasilnya di Riwayat.

  ## C. Pemulihan produksi

  ### C1. Data salah atau terhapus dalam 7 hari terakhir, proyek Supabase masih ada

  Supabase, Database, Backups, pilih backup harian sebelum kejadian, **Restore**. Proyek tidak bisa diakses selama pemulihan (situs publik tetap tampil dari cache ISR, admin dan halaman yang belum tercache galat).

  Setelah selesai: Vercel, Deployments, deployment produksi terakhir, **Redeploy**. Build menjalankan `pnpm build:vercel`, jadi migrasi yang lebih baru dari backup diterapkan ulang.

  **Periksa:** beranda, satu artikel, admin login, dan Dashboard SEO (cron berjalan dalam 10 menit).

  ### C2. Proyek Supabase hilang, atau backup harian tidak cukup

  1. Buat proyek Supabase baru (organisasi Pro, region Singapura `ap-southeast-1`), lalu matikan Data API seperti saat rilis (Integrations, Data API, **Enable Data API** dimatikan).
  2. Pulihkan cadangan mingguan terbaru ke proyek baru lewat session pooler role `postgres` (skema `public` proyek baru masih kosong):

     ```bash
     scripts/pulihkan-database.sh pointlat-<waktu>.dump.gpg "<url-session-pooler-postgres-proyek-baru>"
     ```

  3. Ulangi A2 sampai A4 untuk proyek baru (role tidak ikut tercadang).
  4. Di Vercel, ganti `DATABASE_URL` Production (transaction pooler proyek baru, port 6543) dan `DATABASE_CA` (sertifikat proyek baru), lalu **Redeploy** produksi.

  **Periksa:** sama dengan C1. Penanda `lingkungan-database` ikut terpulihkan sebagai produksi, jadi deploy produksi lolos dan deploy pratinjau tetap ditolak memakai database ini. Data sejak cadangan mingguan itu hilang; terbitkan ulang perubahan yang dibuat sesudahnya.

  ## Verifikasi

  - [ ] Run Backup mingguan terakhir hijau dan berumur paling lama 7 hari.
  - [ ] Artifact berisi `.dump.gpg` dan `.sha256`.
  - [ ] Uji pulih B dalam 3 bulan terakhir tercatat di Riwayat dan hasilnya sesuai.

  ## Pemecahan masalah

  | Gejala | Kemungkinan penyebab | Perbaikan |
  |---|---|---|
  | `pg_dump 16 lebih lama dari server Postgres 17` | Supabase dinaikkan versinya | Ubah `PG_MAJOR` di `backup.yml` (A5) |
  | `permission denied for table ...` saat dump | Tabel dibuat role lain atau sebelum `alter default privileges` | Jalankan ulang tiga `grant` di A2 |
  | `password authentication failed` | Password role atau format pengguna `cadangan_baca.<ref>` salah | Periksa URL di A3, lalu perbarui secret |
  | `Cadangan tidak berisi data tabel.` | URL menunjuk database lain atau role tanpa hak baca | Periksa URL dan A2 |
  | `gpg: public key decryption failed: No secret key` saat pulih | Kunci rahasia belum diimpor atau kunci berbeda | Ulangi B2 dengan kunci dari pengelola password |
  | `Database tujuan sudah berisi ...` | Database tujuan tidak kosong | Pakai database baru |
  | Run terjadwal tidak muncul tepat waktu | Jadwal GitHub tertunda saat sibuk | Tunggu, atau Run workflow manual |
  | Artifact hilang | Lewat 90 hari | Wajar; cadangan baru dibuat setiap minggu |

  ## Rollback

  Pemulihan C1 dan C2 bisa diulang dari cadangan lain yang lebih lama. Sebelum C1, unduh dulu cadangan mingguan terbaru (A6 atau Run workflow) supaya keadaan sekarang ikut tersimpan.

  ## Eskalasi

  | Situasi | Kontak | Cara |
  |---|---|---|
  | Restore dashboard Supabase gagal atau macet | Dukungan Supabase (paket Pro) | Dashboard Supabase, Support, tiket baru |
  | Run workflow atau artifact bermasalah di sisi GitHub | Dukungan GitHub | support.github.com |

  ## Riwayat

  | Tanggal | Oleh | Catatan |
  |---|---|---|
  | 6 November 2026 | Probe Rencana 8C (Postgres 16 lokal, kunci GPG uji) | Sumber: database hasil migrasi berisi data contoh E2E (108 tabel, 1.244 baris, 60 artikel). Langkah workflow dijalankan lokal: cadangan 101.783 byte, terenkripsi ke subkunci pemilik, tanpa teks tabel terbaca. Kunci lain ditolak (`No secret key`); `pg_dump` yang lebih lama dari server ditolak. Pulih ke database kosong: 108 tabel, jumlah baris setiap tabel dan skema sama dengan sumber; `pnpm migrate` tanpa langkah; build dan server dari database hasil pulih menjawab 200 untuk enam path dan lulus 23 tes E2E (header, artikel, rubrik, tools). |
  ````

- [ ] **Langkah 4: Latihan cadangkan dan pulihkan lokal**

  Kunci GPG uji tanpa passphrase di folder sementara (folder pendek di `/tmp`, karena soket `gpg-agent` gagal dibuat di path yang panjang), database sumber dari seed lokal.

  ```bash
  P=postgres://postgres:postgres@127.0.0.1:5432
  D=$(mktemp -d /tmp/cadangan.XXXXXX)
  export GNUPGHOME=$D/gpg
  mkdir -m 700 $GNUPGHOME
  gpg --batch --pinentry-mode loopback --passphrase '' --quick-generate-key "Cadangan uji <cadangan@contoh.test>" ed25519 sign never
  gpg --batch --pinentry-mode loopback --passphrase '' --quick-add-key "$(gpg --list-keys --with-colons cadangan@contoh.test | awk -F: '/^fpr/{print $10; exit}')" cv25519 encr never
  psql -q $P/postgres -c "DROP DATABASE IF EXISTS pointlat_cadangan_uji WITH (FORCE)" -c "CREATE DATABASE pointlat_cadangan_uji" -c "DROP DATABASE IF EXISTS pointlat_pulih_uji WITH (FORCE)" -c "CREATE DATABASE pointlat_pulih_uji"
  DATABASE_URL=$P/pointlat_cadangan_uji pnpm seed
  BACKUP_DATABASE_URL=$P/pointlat_cadangan_uji BACKUP_KUNCI_PUBLIK="$(gpg --armor --export cadangan@contoh.test)" scripts/cadangkan-database.sh $D/cadangan
  scripts/pulihkan-database.sh $D/cadangan/pointlat-*.dump.gpg $P/pointlat_pulih_uji
  scripts/pulihkan-database.sh $D/cadangan/pointlat-*.dump.gpg $P/pointlat_pulih_uji
  for db in pointlat_cadangan_uji pointlat_pulih_uji; do
    psql -tA $P/$db -c "select (select count(*) from pilar) || ' pilar, ' || (select count(*) from halaman) || ' halaman, ' || (select count(*) from tools) || ' tools'"
  done
  psql -q $P/postgres -c "DROP DATABASE pointlat_cadangan_uji WITH (FORCE)" -c "DROP DATABASE pointlat_pulih_uji WITH (FORCE)"
  gpgconf --kill gpg-agent
  unset GNUPGHOME
  rm -rf $D
  ```

  Hasil yang diharapkan:

  ```
  INFO: Seed selesai. Admin: dibuat. Pilar: 4. Halaman draf: 6. Tools baru: 6. Parameter baru: 22.
  Cadangan /tmp/cadangan.<acak>/cadangan/pointlat-<waktu UTC>.dump.gpg: data 108 tabel, <ukuran> byte terenkripsi.
  Dipulihkan: 108 tabel. Migrasi tercatat: -.
  Database tujuan sudah berisi 108 tabel di skema public. Pulihkan ke database kosong.
  4 pilar, 6 halaman, 6 tools
  4 pilar, 6 halaman, 6 tools
  ```

  Ukuran di probe sekitar 78.500 byte. `Migrasi tercatat: -` karena database sumber latihan ini dibuat push (seed lokal), bukan migrasi; cadangan produksi mencetak nama migrasinya. `Admin: dilewati` bila `.env` tanpa `SEED_ADMIN_EMAIL`.

  Pemulihan kedua ditolak karena database tujuan sudah berisi (`exit 1`). Latihan penuh di probe (Riwayat runbook): sumber hasil migrasi berisi data E2E (108 tabel, 1.244 baris) lewat pooler, langkah workflow dijalankan lokal, cadangan terenkripsi ke subkunci pemilik tanpa teks tabel terbaca, kunci lain ditolak (`No secret key`), `pg_dump` yang lebih lama dari server ditolak, hasil pulih sama baris per baris dan skemanya sama, `pnpm migrate` tanpa langkah, lalu build, server, dan 23 tes E2E lulus terhadap database hasil pulih.

- [ ] **Langkah 5: Jalankan semua tes**

  ```bash
  rm -rf .next
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int > /tmp/int-task8.log 2>&1; grep -E "Test Files|Tests " /tmp/int-task8.log
  pnpm test:e2e
  pnpm build
  ```

  Hasil yang diharapkan: bersih; unit 550 tes (80 file); integrasi 164 tes (49 file); E2E 153 tes; build berhasil.

- [ ] **Langkah 6: Commit**

  ```bash
  git add .github/workflows/backup.yml docs/operasional/pemulihan-database.md scripts/cadangkan-database.sh scripts/pulihkan-database.sh
  git commit -m "feat(operasional): backup mingguan GitHub Actions (pg_dump skema public lewat session pooler dengan role baca saja, dienkripsi ke kunci publik GPG pemilik, artifact privat 90 hari), skrip cadangkan dan pulihkan, dan runbook pemulihan yang sudah diuji"
  ```

---

### Task 9: Migrasi `kunci_data_api` (Data API Supabase tidak menjangkau tabel Payload)

**Files:**
- Create: `src/migrations/20261106_163351_kunci_data_api.ts`, `src/migrations/20261106_163351_kunci_data_api.json`
- Modify: `src/migrations/index.ts`

**Interfaces:**
- Consumes: migrasi awal (Task 3), `MigrateUpArgs`, `MigrateDownArgs`, dan `sql` dari `@payloadcms/db-postgres`.
- Produces: migrasi `20261106_163351_kunci_data_api` yang, bila role `anon` dan `authenticated` ada (proyek Supabase), mencabut semua hak keduanya atas tabel, sequence, dan fungsi skema `public`, juga hak bawaan (`ALTER DEFAULT PRIVILEGES FOR ROLE postgres`) untuk objek dari migrasi berikutnya. Di database tanpa role itu (lokal, tes, CI) migrasi tidak mengubah apa pun. `down` sengaja kosong.

Payload tidak memakai Row Level Security, jadi hak bawaan Supabase membuat setiap tabel Payload (termasuk `pengguna` dan sesi login) terbaca siapa pun yang memegang publishable key proyek bila Data API menyala. Migrasi ini menutupnya walau pemilik lupa mematikan Data API (runbook rilis C3). Migrasi dibuat kosong dengan `--force-accept-warning` (skema Payload tidak berubah), lalu isinya ditulis tangan; snapshot JSON-nya sama dengan migrasi awal kecuali `"id"`.

- [ ] **Langkah 1: Buat migrasi kosong dan tetapkan nama serta id snapshot**

  ```bash
  pnpm payload migrate:create kunci_data_api --force-accept-warning
  mv src/migrations/*_kunci_data_api.ts src/migrations/20261106_163351_kunci_data_api.ts
  mv src/migrations/*_kunci_data_api.json src/migrations/20261106_163351_kunci_data_api.json
  sed -i -E 's/^  "id": "[0-9a-f-]{36}",$/  "id": "05a54461-729b-49e3-bb86-bb8a7c205a71",/' src/migrations/20261106_163351_kunci_data_api.json
  ```

- [ ] **Langkah 2: Isi migrasi dan indeks**

  `src/migrations/20261106_163351_kunci_data_api.ts`

  ```ts
  import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

  /**
   * Data API Supabase (PostgREST) tidak boleh menjangkau tabel Payload. Di proyek Supabase, tabel yang dibuat
   * `postgres` di skema `public` otomatis diberi hak baca dan tulis untuk `anon` dan `authenticated`, jadi siapa pun
   * yang memegang kunci publik proyek bisa membaca tabel seperti `pengguna` lewat REST bila Data API menyala.
   * Migrasi ini mencabut hak itu untuk tabel, sequence, dan fungsi yang ada, juga hak bawaan untuk yang dibuat
   * migrasi berikutnya. Database tanpa role Supabase (lokal, tes, CI) tidak diubah. Pemilik juga mematikan Data
   * API di dashboard (runbook rilis).
   */
  export async function up({ db }: MigrateUpArgs): Promise<void> {
    await db.execute(sql`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
          AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
          REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
          REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
          ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
          ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
          ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
        END IF;
      END $$;
    `)
  }

  /** Hak Data API tidak dikembalikan: membukanya lagi harus keputusan sadar, bukan efek `migrate:down`. */
  export async function down(_args: MigrateDownArgs): Promise<void> {}
  ```

  `src/migrations/index.ts`

  ```ts
  import * as migration_20261106_152942_awal from './20261106_152942_awal';
  import * as migration_20261106_163351_kunci_data_api from './20261106_163351_kunci_data_api';

  export const migrations = [
    {
      up: migration_20261106_152942_awal.up,
      down: migration_20261106_152942_awal.down,
      name: '20261106_152942_awal',
    },
    {
      up: migration_20261106_163351_kunci_data_api.up,
      down: migration_20261106_163351_kunci_data_api.down,
      name: '20261106_163351_kunci_data_api'
    },
  ];
  ```

  ```bash
  sha256sum src/migrations/*
  ```

  Hasil yang diharapkan:

  ```
  029e03a3ba236d181d1eecd9326550d336f17b4d76d8a1f38913703cdc7db2f7  src/migrations/20261106_152942_awal.json
  bdf28f043784802e30ea58a6b5398959bd0b0bae867fb4903e7f836bccba45cf  src/migrations/20261106_152942_awal.ts
  7b689a50decb4dadfde276b6469af70feb694dd9877454058e0101b37b5953e3  src/migrations/20261106_163351_kunci_data_api.json
  5074a860253a98b6e694521cd3dc615c7c90b9495bbb1aaaa6cb607caf7e9f37  src/migrations/20261106_163351_kunci_data_api.ts
  de9eb8c26fe15df38673b278d94a1767ac5657dd990ab6f9340a071c699cd0d1  src/migrations/index.ts
  ```

- [ ] **Langkah 3: Bukti dengan role seperti Supabase**

  Membuat role `anon` dan `authenticated` sementara di Postgres lokal, dengan hak bawaan seperti proyek Supabase, lalu menghapusnya lagi.

  ```bash
  P=postgres://postgres:postgres@127.0.0.1:5432
  psql -q $P/postgres -c "DROP DATABASE IF EXISTS pointlat_data_api WITH (FORCE)" -c "CREATE DATABASE pointlat_data_api" -c "CREATE ROLE anon NOLOGIN" -c "CREATE ROLE authenticated NOLOGIN"
  psql -q $P/pointlat_data_api -c "GRANT USAGE ON SCHEMA public TO anon, authenticated" -c "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated" -c "ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated"
  psql -tA $P/pointlat_data_api -c "CREATE TABLE sebelum_migrasi (id int)" -c "select has_table_privilege('anon', 'public.sebelum_migrasi', 'select')" -c "DROP TABLE sebelum_migrasi"
  DATABASE_URL=$P/pointlat_data_api pnpm migrate
  psql -tA $P/pointlat_data_api -c "with t as materialized (select tablename from pg_tables where schemaname = 'public') select count(*) || ' tabel, ' || count(*) filter (where has_table_privilege('anon', 'public.' || quote_ident(tablename), 'select') or has_table_privilege('authenticated', 'public.' || quote_ident(tablename), 'select')) || ' terbuka' from t"
  psql -tA $P/pointlat_data_api -c "CREATE TABLE setelah_migrasi (id int)" -c "select has_table_privilege('anon', 'public.setelah_migrasi', 'select')"
  psql -q $P/postgres -c "DROP DATABASE pointlat_data_api WITH (FORCE)" -c "DROP ROLE anon" -c "DROP ROLE authenticated"
  ```

  Hasil yang diharapkan:

  ```
  CREATE TABLE
  t
  DROP TABLE
  INFO: Migrated:  20261106_152942_awal (...ms)
  INFO: Migrated:  20261106_163351_kunci_data_api (...ms)
  INFO: Done.
  108 tabel, 0 terbuka
  CREATE TABLE
  f
  ```

  (Keluaran `pnpm migrate` juga memuat baris `Reading migration files` dan `Migrating`.)

  Artinya: sebelum migrasi, tabel baru langsung terbaca `anon`; setelah kedua migrasi, tidak ada tabel Payload yang terbuka dan tabel dari migrasi berikutnya juga tidak. Di probe, `SET ROLE anon` lalu membaca `pengguna` dijawab `permission denied for table pengguna`, dan migrasi yang sama di database tanpa role `anon` tidak mengubah apa pun.

- [ ] **Langkah 4: Jalankan semua tes**

  ```bash
  rm -rf .next
  pnpm typecheck
  pnpm lint
  pnpm payload migrate:create periksa --skip-empty
  git status --porcelain src/migrations
  pnpm test:unit
  pnpm test:int > /tmp/int-task9.log 2>&1; grep -E "Test Files|Tests " /tmp/int-task9.log
  pnpm test:e2e
  pnpm build
  ```

  Hasil yang diharapkan: bersih; tidak ada migrasi baru; unit 550 tes (80 file); integrasi 164 tes (49 file); E2E 153 tes; build berhasil.

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/migrations
  git commit -m "feat(database): migrasi kunci_data_api mencabut hak anon dan authenticated Supabase atas tabel, sequence, dan fungsi skema public (juga hak bawaan untuk migrasi berikutnya), jadi Data API Supabase tidak menjangkau tabel Payload"
  ```

---

### Task 10: Lighthouse CI (bisa dilepas)

> **Bila pemilik menolak `@lhci/cli`:** lewati task ini. Akibatnya di task berikutnya: Task 11, buang baris "Lighthouse CI" dari daftar Perintah `CLAUDE.md`, buang ", Lighthouse" dan kalimat "Lighthouse (`lighthouserc.json`, ...) ... peringatan." dari butir "CI dan operasional", jangan menambah kalimat kedua di spesifikasi §12, dan tulis "E2E" tanpa ", dan Lighthouse" di butir CI §16; Task 12, nama job E2E di runbook B1 menjadi "E2E (build produksi, Playwright, axe)" dan I4 tanpa ", sama dengan Lighthouse CI". Tree Task 11 dan 12 lalu berbeda dari commit probe hanya di baris-baris itu.

**Files:**
- Create: `lighthouserc.json`
- Modify: `package.json` (devDependency `@lhci/cli` 0.15.1, skrip `lighthouse`), `pnpm-lock.yaml`, `.github/workflows/ci.yml` (langkah Lighthouse di job `e2e`), `.gitignore`

**Interfaces:**
- Consumes: build dan database E2E dari `pnpm test:e2e` (`pointlat_test_e2e`, data `tests/e2e/siapkan.ts`, port 3100), Chromium Playwright (`CHROME_PATH`).
- Produces: `pnpm lighthouse` (`lhci autorun --config=lighthouserc.json`) dan langkah "Lighthouse (beranda, artikel, rubrik, tools)" di CI; laporan di `lighthouse-laporan/` (artifact `laporan-lighthouse` 14 hari).

Lighthouse berjalan setelah E2E di job yang sama, memakai build produksi dan database yang baru diisi E2E, tanpa jaringan: gambar Cloudinary dan domain iklan Google diblokir (`blockedUrlPatterns`), jadi angka ini mengukur kode situs sendiri; iklan nyata diukur pemilik di produksi (runbook J3). Mode HP bawaan Lighthouse (jaringan 4G lambat dan CPU 4x lebih lambat disimulasikan), median 3 kali per halaman. LCP hanya peringatan karena LCP lab kunjungan pertama adalah teks banner persetujuan yang dihitung Lantern setelah font dan JS (Keputusan teknis; Risiko).

- [ ] **Langkah 1: Pasang `@lhci/cli`**

  ```bash
  pnpm add -D -E @lhci/cli@0.15.1
  ```

  Hasil yang diharapkan: `devDependencies: + @lhci/cli 0.15.1` dan `Packages: +239`; `pnpm-lock.yaml` bertambah 2.025 baris (`git diff --stat`). pnpm boleh menyebut 0.16.0 tersedia; jangan dipakai.

- [ ] **Langkah 2: Skrip dan konfigurasi**

  ```diff
  diff --git a/package.json b/package.json
  index be6f8a2..66bb7ed 100644
  --- a/package.json
  +++ b/package.json
  @@ -23,7 +23,8 @@
       "indexer": "cross-env NODE_OPTIONS=--no-deprecation payload run src/scripts/jalankan-indexer.ts",
       "migrate": "cross-env NODE_OPTIONS=--no-deprecation payload migrate",
       "periksa:rilis": "cross-env NODE_OPTIONS=--no-deprecation payload run src/scripts/periksa-rilis.ts",
  -    "build:vercel": "pnpm periksa:rilis && pnpm migrate && pnpm periksa:rilis && pnpm build"
  +    "build:vercel": "pnpm periksa:rilis && pnpm migrate && pnpm periksa:rilis && pnpm build",
  +    "lighthouse": "lhci autorun --config=lighthouserc.json"
     },
     "dependencies": {
       "@payloadcms/db-postgres": "3.92.1",
  ```

  `lighthouserc.json`

  ```json
  {
    "ci": {
      "collect": {
        "startServerCommand": "pnpm start",
        "startServerReadyPattern": "Ready in",
        "url": [
          "http://localhost:3100/",
          "http://localhost:3100/cara-hitung-gaji-bersih",
          "http://localhost:3100/uang-karier",
          "http://localhost:3100/tools/gaji-bersih"
        ],
        "numberOfRuns": 3,
        "settings": {
          "chromeFlags": "--headless=new --no-sandbox",
          "blockedUrlPatterns": [
            "*res.cloudinary.com*",
            "*googlesyndication.com*",
            "*doubleclick.net*",
            "*googletagmanager.com*",
            "*google.com*"
          ]
        }
      },
      "assert": {
        "assertions": {
          "categories:performance": [
            "error",
            {
              "minScore": 0.9,
              "aggregationMethod": "median-run"
            }
          ],
          "cumulative-layout-shift": [
            "error",
            {
              "maxNumericValue": 0.1,
              "aggregationMethod": "median-run"
            }
          ],
          "total-blocking-time": [
            "error",
            {
              "maxNumericValue": 200,
              "aggregationMethod": "median-run"
            }
          ],
          "largest-contentful-paint": [
            "warn",
            {
              "maxNumericValue": 2500,
              "aggregationMethod": "median-run"
            }
          ]
        }
      },
      "upload": {
        "target": "filesystem",
        "outputDir": "lighthouse-laporan"
      }
    }
  }
  ```

  ```diff
  diff --git a/.gitignore b/.gitignore
  index 93c7f25..9dcd22f 100644
  --- a/.gitignore
  +++ b/.gitignore
  @@ -42,6 +42,10 @@ next-env.d.ts
   
   /media
   
  +# Lighthouse CI
  +/.lighthouseci/
  +/lighthouse-laporan/
  +
   # Playwright
   node_modules/
   /test-results/
  ```

- [ ] **Langkah 3: Langkah Lighthouse di CI**

  ```diff
  diff --git a/.github/workflows/ci.yml b/.github/workflows/ci.yml
  index ed4fb56..008cd91 100644
  --- a/.github/workflows/ci.yml
  +++ b/.github/workflows/ci.yml
  @@ -76,7 +76,7 @@ jobs:
             pnpm build
   
     e2e:
  -    name: E2E (build produksi, Playwright, axe)
  +    name: E2E (build produksi, Playwright, axe) dan Lighthouse
       needs: cek
       runs-on: ubuntu-24.04
       timeout-minutes: 45
  @@ -111,6 +111,29 @@ jobs:
           run: pnpm exec playwright install --with-deps chromium
         - name: Tes E2E
           run: pnpm test:e2e
  +      # Build dan database E2E yang sama, tanpa jaringan: gambar Cloudinary dan domain iklan diblokir di
  +      # lighthouserc.json. Mode HP Lighthouse (4G lambat disimulasikan, CPU 4x lebih lambat).
  +      - name: Lighthouse (beranda, artikel, rubrik, tools)
  +        env:
  +          DATABASE_URL: postgres://postgres:postgres@127.0.0.1:5432/pointlat_test_e2e
  +          PORT: '3100'
  +          NEXT_PUBLIC_SITE_URL: http://localhost:3100
  +          CLOUDINARY_CLOUD_NAME: e2e
  +          CLOUDINARY_API_KEY: e2e
  +          CLOUDINARY_API_SECRET: e2e
  +          INDEXER_ADAPTER: palsu
  +          AI_ADAPTER: palsu
  +        run: |
  +          export CHROME_PATH="$(node -e "console.log(require('@playwright/test').chromium.executablePath())")"
  +          pnpm lighthouse
  +      - name: Simpan laporan Lighthouse
  +        if: always()
  +        uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
  +        with:
  +          name: laporan-lighthouse
  +          path: lighthouse-laporan/
  +          retention-days: 14
  +          if-no-files-found: ignore
         - name: Simpan jejak tes yang gagal
           if: failure()
           uses: actions/upload-artifact@cf430e030ddbb5b0abf93d22962f4752f3646cd9 # v7.0.2
  ```

- [ ] **Langkah 4: Jalankan E2E lalu Lighthouse seperti di CI**

  ```bash
  rm -rf .next
  pnpm test:e2e
  DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pointlat_test_e2e PORT=3100 NEXT_PUBLIC_SITE_URL=http://localhost:3100 CLOUDINARY_CLOUD_NAME=e2e CLOUDINARY_API_KEY=e2e CLOUDINARY_API_SECRET=e2e INDEXER_ADAPTER=palsu AI_ADAPTER=palsu CHROME_PATH="$(node -e "console.log(require('@playwright/test').chromium.executablePath())")" pnpm lighthouse
  ```

  Hasil yang diharapkan: E2E 153 tes; Lighthouse menjalankan 12 kali (4 halaman, 3 kali), lalu `Checking assertions against 4 URL(s), 12 total run(s)` tanpa baris `failure`. Peringatan `largest-contentful-paint warning for maxNumericValue assertion` boleh muncul untuk artikel atau tools (probe: LCP median artikel 2,6 dan 3,0 detik di dua putaran, tools 1,9 dan 2,6 detik). Keluaran diakhiri `All results processed!` dan `Done running autorun.`, dengan kode keluar 0. Laporan HTML ada di `lighthouse-laporan/` (diabaikan git).

- [ ] **Langkah 5: Jalankan semua tes**

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int > /tmp/int-task10.log 2>&1; grep -E "Test Files|Tests " /tmp/int-task10.log
  pnpm build
  git status --porcelain
  ```

  Hasil yang diharapkan: bersih; unit 550 tes (80 file); integrasi 164 tes (49 file); build berhasil; `git status` hanya menampilkan file task ini (tanpa `.lighthouseci/` dan `lighthouse-laporan/`).

- [ ] **Langkah 6: Commit**

  ```bash
  git add .github/workflows/ci.yml .gitignore lighthouserc.json package.json pnpm-lock.yaml
  git commit -m "ci: Lighthouse CI di job E2E (beranda, artikel, rubrik, tools; mode HP; build dan data E2E tanpa jaringan): skor Performance minimal 90, CLS paling banyak 0,1, dan TBT paling lama 200 ms menggagalkan CI, LCP di atas 2,5 detik diperingatkan"
  ```

---

### Task 11: CLAUDE.md, spesifikasi, dan .env.example

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-11-03-point-lat-design.md`, `.env.example`

**Interfaces:**
- Consumes: semua keputusan Task 1 sampai 10.
- Produces: aturan kerja untuk perubahan skema berikutnya (migrasi wajib bersama perubahan field, perubahan aditif, uji migrasi di database terpisah), aturan lingkungan deploy, header, CI, dan backup di `CLAUDE.md`; spesifikasi §5 (koneksi), §12 (Lighthouse CI), §15 (backup), §16 (CI), §18 (setup pemilik 9 dan 10), §19 (risiko LCP dan jeda proyek Free); `DATABASE_CA` di `.env.example`.

`tests/unit/lingkungan.test.ts` dan `tests/unit/password.test.ts` membaca nilai contoh dari `.env.example`, jadi baris contoh yang sudah ada tidak diubah; task ini hanya menambah komentar dan `DATABASE_CA=` kosong.

- [ ] **Langkah 1: CLAUDE.md**

  ```diff
  diff --git a/CLAUDE.md b/CLAUDE.md
  index 9e3bec0..0ddbb33 100644
  --- a/CLAUDE.md
  +++ b/CLAUDE.md
  @@ -4,7 +4,8 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   
   ## Tech stack
   - Next.js 16 (App Router) + Payload CMS 3.92 dalam satu aplikasi
  -- PostgreSQL (lokal lewat Docker, produksi di Supabase lewat pooler) dengan `@payloadcms/db-postgres`
  +- PostgreSQL dengan `@payloadcms/db-postgres`: lokal lewat Docker dengan push skema; produksi dan pratinjau di Supabase (Singapura) lewat pooler Supavisor mode transaksi, skema hanya lewat migrasi Payload
  +- Hosting Vercel Pro (fungsi di `sin1`), CI dan backup mingguan di GitHub Actions (repo privat `vanhallen28/point.lat`)
   - Editor Lexical (`@payloadcms/richtext-lexical`)
   - Vitest (unit + integrasi), Playwright + axe (e2e)
   - Frontend: CSS Module + token CSS (`src/styles/tokens.css`), font Archivo variable lewat `next/font/local`
  @@ -23,6 +24,10 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Data awal: `pnpm seed` (pilar, penulis, halaman draf, global, dan enam kalkulator draf beserta parameternya; dokumen yang sudah ada tidak ditimpa)
   - Aset sistem Cloudinary (sekali per akun, butuh kredensial): `pnpm media:siapkan`
   - Pekerjaan cron sekali jalan tanpa Vercel (jadwal terbit, antrean Mesin Indexing, dan tugas Pantau SEO yang jatuh tempo): `pnpm indexer`
  +- Migrasi Payload ke database di `DATABASE_URL`: `pnpm migrate`. Migrasi baru setelah skema berubah: `pnpm payload migrate:create <nama>` (lihat Konvensi, database dan migrasi)
  +- Build Vercel (`buildCommand` di `vercel.json`): `pnpm build:vercel`, yaitu `pnpm periksa:rilis` (env dan penanda database), `pnpm migrate`, `pnpm periksa:rilis` lagi (database baru ditandai), lalu `pnpm build`
  +- Lighthouse CI (setelah build E2E, port 3100 kosong, `CHROME_PATH` ke Chromium Playwright, env server seperti langkah Lighthouse di `ci.yml`): `pnpm lighthouse`
  +- Cadangan dan pemulihan database: `scripts/cadangkan-database.sh` dan `scripts/pulihkan-database.sh` (runbook `docs/operasional/pemulihan-database.md`)
   
   ## Konvensi
   - Nama domain memakai bahasa Indonesia, sama dengan spesifikasi: slug koleksi (`artikel`, `pilar`), nama field (`judul`, `intinya`), nama fungsi modul (`kabari`, `hitung`, `pathFor` adalah pengecualian yang sudah ada).
  @@ -53,11 +58,16 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Tautan internal lewat komponen `Tautan` (`next/link` untuk path situs). Warna pilar lewat atribut `data-warna` (nilai field `warna` pilar) dan selalu bersama nama pilarnya. Ikon lewat `Ikon` (path Lucide yang disalin, tanpa paket ikon).
   - Copy UI: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru. Angka lewat `Intl.NumberFormat('id-ID')` (`teksAngka` modul hitung); rupiah dari `Intl` memakai spasi tak putus setelah "Rp", jadi di kode dan tes tulis `\u00a0`, jangan karakter aslinya. Begitu juga em dash dan en dash yang dibutuhkan kode dan tes (pembersih dan cek pola asisten AI): tulis `\u2014` dan `\u2013`.
   - Tes unit di `tests/unit/*.test.ts`, tes integrasi di `tests/int/*.int.spec.ts` dan memakai `getTestPayload()` + `unik()` dari `tests/int/helpers.ts`.
  -- Tes E2E di `tests/e2e/*.spec.ts` memakai `cegatCloudinary()` (gambar tanpa jaringan) dan `periksaAxe()` (WCAG 2.2 AA) dari `tests/e2e/bantu.ts`; data contohnya di `tests/e2e/siapkan.ts` (termasuk klik Google contoh `KLIK_CONTOH` dan total harian `HARI_CONTOH` untuk "Paling dicari" dan dashboard SEO, dan `PAGINASI_E2E`: 50 tulisan lama di subkategori Persiapan ujian pilar Belajar, bertanggal terbit 2025 dan dibuat sebelum tulisan lain, supaya daftar artikel admin halaman pertama, tulisan terbaru, dan rubrik Uang & Karier tidak berubah). Isi 404 Next 16.3.3 kadang tidak dirender (cangkang `<html id="__next_error__">`, sekitar 0,5% kunjungan 404 di E2E penuh; stylesheet yang dibatalkan saat React mengganti dokumen tidak diminta ulang): tes yang membuka path 404 dan gagal dengan cangkang itu atau beacon `/api/log-404/catat` yang tidak terkirim diulang sekali lewat `pnpm test:e2e`, tanpa menaikkan timeout. `pantau-aksi.spec.ts` (Cek sekarang dan Pindai ulang sekarang menjalankan antrean Mesin Indexing) berjalan setelah `indexing.spec.ts`. Anggaran JavaScript (total di bawah 160 KiB per halaman, hanya skrip dari situs sendiri, spesifikasi §12) dijaga `motion.spec.ts` untuk setiap jenis halaman; jenis halaman baru ditambahkan ke daftarnya. JS kalkulator di atas JS artikel dijaga di bawah 25 KB, chunk JS tata letak milik point. (banner persetujuan, pemuat iklan, animasi masuk, menu aktif) di bawah 8 KiB, dan keduanya bersama di bawah 25 KB. Kalkulator diuji di `kalkulator.spec.ts` (enam tools dari `TOOLS_CONTOH` di tiga ukuran layar) dan `hitung.spec.ts` (contoh resmi DJP lewat form).
  +- Tes E2E di `tests/e2e/*.spec.ts` memakai `cegatCloudinary()` (gambar tanpa jaringan) dan `periksaAxe()` (WCAG 2.2 AA) dari `tests/e2e/bantu.ts`; data contohnya di `tests/e2e/siapkan.ts` (termasuk klik Google contoh `KLIK_CONTOH` dan total harian `HARI_CONTOH` untuk "Paling dicari" dan dashboard SEO, dan `PAGINASI_E2E`: 50 tulisan lama di subkategori Persiapan ujian pilar Belajar, bertanggal terbit 2025 dan dibuat sebelum tulisan lain, supaya daftar artikel admin halaman pertama, tulisan terbaru, dan rubrik Uang & Karier tidak berubah). Isi 404 Next 16.3 (16.3.3 sampai 16.3.8) kadang tidak dirender (cangkang `<html id="__next_error__">`, sekitar 0,5% kunjungan 404 di E2E penuh; stylesheet yang dibatalkan saat React mengganti dokumen tidak diminta ulang): tes yang membuka path 404 dan gagal dengan cangkang itu atau beacon `/api/log-404/catat` yang tidak terkirim diulang sekali lewat `pnpm test:e2e`, tanpa menaikkan timeout. `pantau-aksi.spec.ts` (Cek sekarang dan Pindai ulang sekarang menjalankan antrean Mesin Indexing) berjalan setelah `indexing.spec.ts`. Anggaran JavaScript (total di bawah 160 KiB per halaman, hanya skrip dari situs sendiri, spesifikasi §12) dijaga `motion.spec.ts` untuk setiap jenis halaman; jenis halaman baru ditambahkan ke daftarnya. JS kalkulator di atas JS artikel dijaga di bawah 25 KB, chunk JS tata letak milik point. (banner persetujuan, pemuat iklan, animasi masuk, menu aktif) di bawah 8 KiB, dan keduanya bersama di bawah 25 KB. Kalkulator diuji di `kalkulator.spec.ts` (enam tools dari `TOOLS_CONTOH` di tiga ukuran layar) dan `hitung.spec.ts` (contoh resmi DJP lewat form).
  +- Database dan migrasi (Rencana 8C): `postgresAdapter` memakai `opsiPool()` dan `pushSkema()` dari `src/lib/database.ts`. Push skema Payload hanya ke database lokal (`databaseLokal`: `localhost`, `127.0.0.1`, `::1`, soket Unix), tidak pernah ke Supabase, termasuk saat `pnpm seed` atau skrip `payload run` dijalankan dari komputer pemilik. Database bersama hanya diubah migrasi di `src/migrations` (`20261106_152942_awal` dari skema Rencana 8B, `20261106_163351_kunci_data_api` mencabut hak `anon` dan `authenticated` Supabase atas skema `public`), yang dijalankan build Vercel sebelum `next build`; deploy lama masih melayani saat migrasi berjalan, jadi perubahan skema harus aditif (hapus atau ganti nama kolom lewat dua deploy). Setelah mengubah field: `pnpm generate:types`, uji dengan push seperti biasa, lalu `pnpm payload migrate:create <nama>`, baca SQL-nya (tanpa `DROP` yang tidak direncanakan), dan commit `.ts`, `.json`, dan `index.ts` migrasi bersama perubahan field. CI gagal bila skema berubah tanpa migrasi. Jangan menjalankan `pnpm migrate` di database dev lokal hasil push (Payload bertanya soal data loss); uji migrasi di database terpisah (`DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pointlat_migrasi pnpm migrate`). Koneksi Supabase: pooler mode transaksi port 6543 (IPv4; statement `pg` tanpa nama), pool 5 koneksi per instance, koneksi menganggur ditutup 5 detik, batas sambung 10 detik, TLS terverifikasi lewat `DATABASE_CA`.
  +- Lingkungan deploy (`src/modules/lingkungan`): `VERCEL_ENV` `production` dan `preview` menyalakan `masalahLingkungan`, yang diperiksa saat config Payload dimuat (`tolakEnvSalah`, jadi `payload migrate`, `next build`, dan fungsi berhenti sebelum menyentuh database). Keduanya wajib `DATABASE_URL` bukan lokal dengan TLS (`DATABASE_CA` atau `sslmode`), `PAYLOAD_SECRET` acak minimal 32 karakter, dan kredensial Cloudinary; Production juga wajib `INDEXER_ADAPTER` dan `AI_ADAPTER` (`asli` atau `palsu`) dan `CRON_SECRET` minimal 16 karakter; Preview wajib kedua adapter `palsu`, tanpa `GOOGLE_SERVICE_ACCOUNT_JSON` dan `ANTHROPIC_API_KEY`. `onInit` (`jagaDatabase`) menandai database (`payload_kv`, kunci `lingkungan-database`) dengan lingkungan pertama yang memakainya dan menghentikan proses bila database milik lingkungan lain (setelah init gagal, `getPayload` berikutnya melewati `onInit`). Di luar Vercel (lokal, tes, E2E, CI) tidak ada aturan tambahan. Password pengguna di lingkungan terbuka (deploy Vercel atau database bukan lokal) wajib lolos `periksaPassword` lewat hook `tolakPasswordLemah` (minimal 15 karakter, bukan contoh `.env.example`, tanpa kata terkait situs atau akun); tes memakai `vi.stubEnv('VERCEL_ENV', 'production')`.
  +- Header keamanan: `HEADER_KEAMANAN` (`src/lib/header-keamanan.ts`) dipasang `headers()` di `next.config.ts` untuk semua path, dengan `poweredByHeader: false`. Jangan menulis header dengan membaca permintaan di halaman (halaman publik tetap ISR). CSP hanya `base-uri`, `object-src`, `frame-ancestors`, dan `form-action`: AdSense hanya mendukung CSP skrip dengan nonce per permintaan, yang mematikan ISR. HSTS dari Vercel. Dijaga `tests/e2e/header.spec.ts`.
  +- CI dan operasional: `.github/workflows/ci.yml` setiap push ke `master` dan pull request (type check, lint, unit, cek migrasi, integrasi dengan service Postgres 16, migrasi di database kosong lalu build, E2E, Lighthouse), tanpa rahasia dan dengan action dikunci ke SHA commit; bila E2E gagal hanya karena isi 404 Next yang dikenal di atas, jalankan ulang sekali lewat Re-run failed jobs. Lighthouse (`lighthouserc.json`, mode HP, median 3 kali di beranda, artikel, rubrik, dan tools): skor Performance di bawah 90, CLS di atas 0,1, atau TBT di atas 200 ms menggagalkan CI; LCP di atas 2,5 detik peringatan. `.github/workflows/backup.yml` setiap Minggu 02.23 WIB menyimpan dump terenkripsi GPG sebagai artifact 90 hari.
   
   ## Batasan
   - Jangan commit `.env`. `.env.test` boleh di-commit karena hanya untuk database tes lokal dan tidak boleh berisi `CLOUDINARY_*`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `CRON_SECRET`, `INDEXER_ADAPTER=asli`, `ANTHROPIC_API_KEY`, atau `AI_ADAPTER=asli`. Kredensial Google dan kunci API Claude hanya di env server Vercel, tidak pernah di CMS, log, atau tes.
   - Tanya dulu sebelum menambah dependensi baru di luar rencana.
  +- Database Supabase (produksi dan pratinjau) hanya diubah lewat migrasi dan build Vercel. Connection string Supabase hanya di env Vercel, secret GitHub Actions, atau shell pemilik untuk satu perintah, tidak pernah di file yang di-commit. Secret GitHub Actions hanya `BACKUP_DATABASE_URL` (role baca saja) dan `BACKUP_KUNCI_PUBLIK`.
   - Jalankan `pnpm generate:types` lalu `pnpm typecheck` setelah mengubah koleksi atau global.
   - Jalankan `pnpm test` sebelum commit, dan `pnpm test:e2e` bila halaman publik berubah.
   - `pnpm build` membaca database dev untuk halaman statis (layout, `/`, `/glosarium`, `/tools`, `/video`, 404). Setelah skema berubah, jalankan `pnpm seed` dulu supaya kolom baru terdorong ke database dev.
  ```

- [ ] **Langkah 2: Spesifikasi**

  ```diff
  diff --git a/docs/superpowers/specs/2026-11-03-point-lat-design.md b/docs/superpowers/specs/2026-11-03-point-lat-design.md
  index 0799e8f..b603f48 100644
  --- a/docs/superpowers/specs/2026-11-03-point-lat-design.md
  +++ b/docs/superpowers/specs/2026-11-03-point-lat-design.md
  @@ -134,7 +134,7 @@ Vercel Cron ──► /api/jobs/run setiap 10 menit (header rahasia)
   
   **Penjadwal:** Vercel Cron (paket Pro, interval minimal per menit) memanggil endpoint job runner Payload setiap 10 menit untuk pekerjaan berulang: retry indexing, cek status, sinkron Search Analytics harian, cek link rusak mingguan. Saat publikasi, job pertama langsung dijalankan lewat `after()` Next.js supaya tidak menunggu jadwal. Paket Hobby tidak dipakai karena cron-nya hanya sekali sehari dan paket itu untuk penggunaan non-komersial.
   
  -**Koneksi database:** Supabase pooler (mode transaksi) untuk serverless, `max` koneksi kecil per instance.
  +**Koneksi database:** Supabase pooler Supavisor mode transaksi (port 6543, IPv4) untuk fungsi Vercel di `sin1` (dekat Supabase Singapura), pool 5 koneksi per instance, koneksi menganggur ditutup 5 detik, TLS terverifikasi dengan sertifikat CA Supabase (`DATABASE_CA`). Skema produksi dan pratinjau hanya lewat migrasi Payload (`src/migrations`) yang dijalankan build Vercel sebelum `next build`; push skema hanya ke database lokal. Data API Supabase dimatikan dan hak `anon` dan `authenticated` atas skema `public` dicabut migrasi. Deploy produksi dan pratinjau menandai databasenya dan menolak database milik lingkungan lain; pratinjau memakai proyek Supabase sendiri. (Rencana 8C)
   
   ### Modul (antarmuka kecil, implementasi dalam)
   
  @@ -328,7 +328,7 @@ Pengaman:
   | Font | 1 file variable Archivo subset, `font-display: swap`, preload satu file |
   | Gambar hero | prioritas tinggi, ukuran tepat, AVIF/WebP |
   
  -Lighthouse CI menolak build bila skor Performance HP < 90 di halaman contoh (beranda, artikel, tools).
  +Lighthouse CI menolak build bila skor Performance HP < 90 di halaman contoh (beranda, artikel, tools). Dijalankan Rencana 8C di job E2E GitHub Actions (`lighthouserc.json`): beranda, artikel, rubrik, dan tools, median 3 kali, data E2E tanpa gambar Cloudinary dan iklan; skor < 90, CLS > 0,1, atau TBT > 200 ms menggagalkan CI, LCP > 2,5 dtk diperingatkan (LCP halaman pertama kunjungan adalah teks banner persetujuan; lihat §19).
   
   ## 13. Motion
   
  @@ -358,7 +358,7 @@ WCAG 2.2 AA: kontras sesuai §4, fokus terlihat (`:focus-visible`, ring 2px ink
   | AI gagal / anggaran habis | pesan jelas di sidebar, editor tetap bisa menulis |
   | 404 | halaman 404 dengan pencarian dan artikel populer, dicatat di `log404` |
   | 500 | halaman error statis; error dikirim ke log Vercel |
  -| Database | backup bawaan Supabase sesuai paket + GitHub Actions mingguan menjalankan `pg_dump` dan menyimpannya ke bucket privat Supabase Storage (khusus backup, bukan media) |
  +| Database | backup harian Supabase Pro (7 hari) + GitHub Actions mingguan: `pg_dump` skema `public` lewat session pooler dengan role baca saja, dienkripsi ke kunci publik GPG pemilik, disimpan sebagai artifact privat repo 90 hari; runbook pemulihan `docs/operasional/pemulihan-database.md`. Diubah Rencana 8C dari bucket Supabase Storage: backup di proyek yang sama ikut hilang bila proyek dihapus, dan unggah ke Storage butuh kunci service role |
   
   ## 16. Testing & verifikasi
   
  @@ -366,6 +366,7 @@ WCAG 2.2 AA: kontras sesuai §4, fokus terlihat (`:focus-visible`, ring 2px ink
   - **Integrasi:** hook Payload memicu revalidasi dan job; validasi koleksi.
   - **E2E (Playwright):** buat artikel → terbitkan → URL ada di sitemap dan news sitemap → log indexing tercatat; ganti slug → redirect 301 bekerja; kalkulator gaji menghasilkan angka contoh resmi; banner persetujuan menahan iklan.
   - **Kualitas:** Lighthouse CI (§12), axe untuk aksesibilitas, skrip design-audit (tanpa temuan Critical), uji layar 375 / 768 / 1440 dan reduced motion.
  +- **CI:** GitHub Actions setiap push ke `master` dan pull request: type check, lint, unit, migrasi sesuai skema, integrasi (Postgres 16), migrasi di database kosong lalu build, E2E, dan Lighthouse, tanpa rahasia produksi (Rencana 8C).
   
   ## 17. Cakupan
   
  @@ -385,6 +386,8 @@ WCAG 2.2 AA: kontras sesuai §4, fokus terlihat (`:focus-visible`, ring 2px ink
   6. Env Vercel untuk Mesin Indexing: `INDEXER_ADAPTER=asli` (Production) dan `palsu` (Preview), `GOOGLE_SERVICE_ACCOUNT_JSON` berisi seluruh file kunci JSON (Production saja), `CRON_SECRET` acak minimal 16 karakter. Kunci IndexNow diisi di Pengaturan SEO; status pemasangan tampil di halaman yang sama.
   7. Kunci Claude API: env Vercel `AI_ADAPTER=asli` dan `ANTHROPIC_API_KEY` (Production), `AI_ADAPTER=palsu` (Preview). Anggaran bulanan, harga per model, dan sumber resmi per pilar di Pengaturan, Asisten AI.
   8. Akun AdSense (setelah konten cukup): ID penerbit dan unit iklan display berukuran tetap di global Iklan, pesan European regulations di Privacy & messaging, Kebijakan Privasi terbit sebelum iklan dinyalakan. Penyedia newsletter.
  +9. Database pratinjau: proyek Supabase kedua di organisasi Free terpisah (Singapura), env Preview Vercel menunjuk ke sana. Data API Supabase dimatikan di kedua proyek.
  +10. Backup mingguan: kunci GPG khusus cadangan (kunci rahasia di pengelola password), role baca saja `cadangan_baca`, dan secret GitHub Actions `BACKUP_DATABASE_URL` dan `BACKUP_KUNCI_PUBLIK` (runbook pemulihan).
   
   ## 19. Risiko & mitigasi
   
  @@ -398,6 +401,8 @@ WCAG 2.2 AA: kontras sesuai §4, fokus terlihat (`:focus-visible`, ring 2px ink
   | Indexing lambat untuk domain baru | sitemap bersih, link internal kuat, distribusi (WhatsApp, newsletter), konten berkualitas; status dipantau |
   | Biaya Cloudinary/Claude API naik | incoming transformation, preset terbatas, anggaran AI bulanan, pantau pemakaian |
   | Cold start admin di serverless | halaman publik tetap statis; admin hanya dipakai pemilik |
  +| LCP lab HP kunjungan pertama di sekitar 2,5 dtk (artikel median 2,6 dtk di probe Rencana 8C): elemen LCP adalah teks banner persetujuan, dan font Archivo 90 KB ikut dimuat sebelum paint pertama | Lighthouse CI memperingatkan LCP > 2,5 dtk; font hanya sumbu `wght` (35 KB) menurunkannya ke 2,45 dtk tetapi menghilangkan judul ramping (`font-stretch`); font yang dipangkas ke rentang `wdth` yang dipakai menunggu keputusan pemilik |
  +| Database pratinjau di organisasi Free dijeda setelah 7 hari sepi | build pratinjau gagal sampai proyek dilanjutkan dari dashboard (data tetap ada 90 hari) |
   
   ## 20. Skill per tahap
   
  ```

- [ ] **Langkah 3: .env.example**

  ```diff
  diff --git a/.env.example b/.env.example
  index c99244e..3d69589 100644
  --- a/.env.example
  +++ b/.env.example
  @@ -1,8 +1,13 @@
   DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/pointlat
  +# Produksi dan pratinjau Vercel: DATABASE_URL = connection string Supabase Transaction pooler (port 6543), dan
  +# DATABASE_CA = isi sertifikat CA dari Supabase (Database Settings, SSL Configuration). Lokal dan tes: kosong.
  +# VERCEL_ENV diisi Vercel sendiri (production atau preview) dan menyalakan pemeriksaan src/modules/lingkungan.
  +DATABASE_CA=
   PAYLOAD_SECRET=ganti-dengan-string-acak-minimal-32-karakter
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   SEED_ADMIN_EMAIL=admin@point.lat
   SEED_ADMIN_PASSWORD=ganti-password-ini
  +# Password admin di Supabase (produksi dan pratinjau) wajib minimal 15 karakter dan bukan contoh di atas.
   # Cloudinary (hanya server). Kosongkan di lokal/tes: aplikasi memakai klien palsu dalam memori.
   # Wajib diisi di produksi (Vercel). Lalu jalankan sekali: pnpm media:siapkan
   CLOUDINARY_CLOUD_NAME=
  ```

- [ ] **Langkah 4: Periksa**

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  python3 -c "import sys; t=open('CLAUDE.md',encoding='utf-8').read()+open('docs/superpowers/specs/2026-11-03-point-lat-design.md',encoding='utf-8').read(); sys.exit(any(c in t for c in (chr(0x2014), chr(0x2013), chr(0xa0))))" && echo "tanpa em dash, en dash, dan spasi tak putus"
  git status --porcelain
  ```

  Hasil yang diharapkan: bersih; unit 550 tes (80 file; tes yang membaca `.env.example` tetap lulus); pesan pemeriksaan karakter tercetak; `git status` hanya menampilkan tiga file task ini (tanpa blok "nextjs-agent-rules"). Task ini hanya mengubah dokumen, jadi integrasi (164 tes) dan E2E (153 tes) tidak berubah dari Task 10; keduanya dijalankan lagi di Task 12.

- [ ] **Langkah 5: Commit**

  ```bash
  git add .env.example CLAUDE.md docs/superpowers/specs/2026-11-03-point-lat-design.md
  git commit -m "docs: aturan migrasi, lingkungan deploy, header, CI, dan backup"
  ```

---

### Task 12: Runbook rilis dan uji langsung, lalu pemeriksaan akhir

**Files:**
- Create: `docs/operasional/rilis.md`
- Modify: `docs/operasional/pemulihan-database.md` (password role setelah pemulihan dashboard), `CLAUDE.md` (perintah runbook)

**Interfaces:**
- Consumes: semua task sebelumnya; Setup dari pemilik Rencana 2 (Task 8 uji langsung Cloudinary), 6A, 6B, 7, 8A, dan 8B.
- Produces: runbook pemilik dari nol sampai live (bagian A sampai J), setiap langkah dengan hasil yang diharapkan dan tanpa rahasia; Riwayat runbook mencatat bagian yang sudah diuji di probe.

Urutan runbook dirancang supaya setiap langkah bisa diperiksa sebelum lanjut: proyek Supabase produksi dan pratinjau dibuat dulu, migrasi dan data awal dijalankan dari komputer pemilik (seed lewat `payload run` di luar Vercel tidak bisa merevalidasi cache halaman di Vercel, jadi data awal harus ada sebelum build pertama), deploy Vercel pertama sengaja gagal di penjaga sebagai bukti `VERCEL_ENV` terbaca, adapter produksi tetap `palsu` sampai kunci Google dan Claude siap, dan cek pasca-rilis mencakup `robots.txt`, sitemap, Rich Results Test, PageSpeed Insights, log indexing, cron, dan Data API. Backup harian Supabase tidak menyimpan password role buatan sendiri, jadi runbook pemulihan kini menyebut pengaturan ulang password `cadangan_baca`.

- [ ] **Langkah 1: Runbook rilis**

  `docs/operasional/rilis.md`

  ````markdown
  # Runbook: Rilis point.lat dan uji langsung

  **Pemilik:** pemilik point.lat | **Frekuensi:** sekali saat rilis (bagian A sampai I); bagian J saat AdSense menyetujui situs; cek di bagian I diulang setelah perubahan besar di layanan luar.
  **Diperbarui:** 7 November 2026 (Rencana 8C) | **Dijalankan terakhir:** belum (lihat Riwayat).

  ## Tujuan

  Membawa point.lat dari repo `vanhallen28/point.lat` sampai live di `https://point.lat`, lalu menguji langsung semua layanan luar yang di tes otomatis hanya memakai tiruan (Supabase, Vercel, Cloudinary, Google, IndexNow, Claude, AdSense). Setiap langkah punya hasil yang diharapkan; lanjut ke langkah berikutnya hanya bila hasilnya sesuai.

  | Bagian | Isi |
  |---|---|
  | A | Prasyarat |
  | B | Repo dan CI |
  | C | Supabase produksi dan pratinjau (termasuk migrasi dan data awal) |
  | D | Proyek Vercel, env, dan deploy produksi pertama |
  | E | Domain `point.lat` |
  | F | Admin, Cloudinary, dan halaman wajib |
  | G | Google Search Console, akun layanan, dan IndexNow |
  | H | Asisten AI, Firewall, backup, dan deploy pratinjau |
  | I | Rilis dan cek pasca-rilis |
  | J | AdSense |

  **Aturan rahasia.** Password database, connection string, kunci API, `PAYLOAD_SECRET`, `CRON_SECRET`, dan isi kunci JSON Google hanya diketik di dashboard layanan, di pengelola password, atau di shell pemilik lewat `read -rs` (tidak tampil di layar dan tidak masuk riwayat shell). Jangan menempelnya di file repo, tiket, chat, atau email. Sertifikat CA Supabase dan publishable key Supabase bukan rahasia.

  ## A. Prasyarat

  - [ ] Akses Owner di organisasi Supabase berpaket Pro, tim Vercel berpaket Pro, admin repo GitHub `vanhallen28/point.lat`, dan pengelola DNS domain `point.lat`.
  - [ ] Akun Cloudinary, akun Google (Search Console dan Google Cloud), Claude Console, dan nanti AdSense.
  - [ ] Komputer dengan `git`, Node 22.23.4 atau lebih baru (atau 24.22.1 ke atas), `pnpm`, `psql`, `openssl`, `curl`, dan `gpg`, serta salinan repo yang biasa dipakai untuk pengembangan lokal (berisi `.env` lokal; bila belum ada, `cp .env.example .env`).
  - [ ] Pengelola password untuk menyimpan setiap rahasia yang dibuat di runbook ini.

  ## B. Repo dan CI

  ### B1. Master hijau

  Di GitHub, repo `vanhallen28/point.lat`, tab Actions, workflow **CI**: run terakhir di `master` hijau untuk kedua job, "Type check, lint, unit, migrasi, integrasi, build" dan "E2E (build produksi, Playwright, axe) dan Lighthouse".

  **Hasil yang diharapkan:** kedua job hijau di commit yang akan dirilis.
  **Bila gagal:** buka log job. E2E yang gagal hanya karena isi 404 Next yang dikenal (cangkang `__next_error__` atau beacon 404 yang tidak terkirim) dijalankan ulang sekali lewat **Re-run failed jobs**; kegagalan lain diperbaiki dulu.

  ### B2. Salinan lokal sama dengan master

  ```bash
  git switch master
  git pull
  pnpm install
  ```

  **Hasil yang diharapkan:** `git log -1 --oneline` sama dengan commit yang hijau di B1, dan `ls src/migrations` menampilkan `20261106_152942_awal.ts` dan `20261106_163351_kunci_data_api.ts`.

  ### B3. Aturan branch `master` (opsional)

  Aturan branch untuk repo privat butuh GitHub Pro, Team, atau Enterprise. Bila tersedia: Settings, Branches (atau Rules, Rulesets), aturan baru untuk `master`, nyalakan **Require status checks to pass** dengan kedua job di B1.

  **Hasil yang diharapkan:** pull request ke `master` menampilkan kedua pemeriksaan sebagai wajib. Bila paket tidak mendukung, lewati langkah ini; CI tetap berjalan di setiap push dan pull request.

  ## C. Supabase produksi dan pratinjau

  Fungsi Vercel berjalan di `sin1` (Singapura, `vercel.json`), dekat database. Aplikasi terhubung lewat **Transaction pooler** (Supavisor, port 6543, IPv4); koneksi langsung Supabase hanya IPv6 dan tidak dipakai.

  ### C1. Proyek produksi

  Di organisasi Supabase berpaket Pro: **New project**, nama `point-lat`, region **Southeast Asia (Singapore)** (`ap-southeast-1`). Buat password database dengan tombol generate, simpan di pengelola password sebagai "Supabase produksi, password postgres".

  **Hasil yang diharapkan:** proyek aktif; Settings, Infrastructure menampilkan region Singapura dan versi Postgres. Bila versi utamanya bukan 17, ubah `PG_MAJOR` di `.github/workflows/backup.yml` (runbook pemulihan A5).

  ### C2. Wajibkan SSL dan unduh sertifikat CA

  Database Settings, bagian SSL Configuration: nyalakan **Enforce SSL on incoming connections** (database restart singkat), lalu **Download certificate**. Simpan file itu sebagai `~/point-lat-ca-produksi.crt`.

  **Hasil yang diharapkan:** setelan menyatakan SSL diwajibkan; `head -1 ~/point-lat-ca-produksi.crt` mencetak `-----BEGIN CERTIFICATE-----`.

  ### C3. Matikan Data API

  Aplikasi tidak memakai Data API Supabase (REST dan GraphQL otomatis). Integrations, Data API, Overview: matikan **Enable Data API**. Migrasi `20261106_163351_kunci_data_api` juga mencabut hak `anon` dan `authenticated` atas tabel Payload, jadi dua lapis ini saling menjaga.

  **Hasil yang diharapkan:** halaman Data API menyatakan Data API mati. Pemeriksaan dari luar ada di I7.

  ### C4. Connection string transaction pooler

  Tombol **Connect** di dashboard proyek, pilih **Transaction pooler**, salin URI (port 6543), ganti `[YOUR-PASSWORD]` dengan password C1, lalu simpan di pengelola password sebagai "DATABASE_URL produksi". Periksa dari komputer:

  ```bash
  read -rs DATABASE_URL && export DATABASE_URL
  psql "$DATABASE_URL" -c "select version()"
  ```

  (tempel URI setelah perintah pertama, lalu Enter; tidak ada yang tampil.)

  **Hasil yang diharapkan:** satu baris `PostgreSQL 17...`.
  **Bila gagal:** `password authentication failed` berarti password di URI salah.

  ### C5. Migrasi dan data awal produksi dari komputer pemilik

  Migrasi pertama dan seed dijalankan dari komputer sebelum deploy pertama, supaya build pertama langsung merender halaman dari data awal (halaman yang dibangun dari database kosong baru berganti setelah revalidasi). Setelah ini, migrasi hanya berjalan lewat build Vercel. Di shell yang sama dengan C4 (`DATABASE_URL` masih ter-export), dari root repo:

  ```bash
  export DATABASE_CA="$(cat ~/point-lat-ca-produksi.crt)"
  pnpm migrate
  read -r SEED_ADMIN_EMAIL && export SEED_ADMIN_EMAIL
  read -rs SEED_ADMIN_PASSWORD && export SEED_ADMIN_PASSWORD
  pnpm seed
  unset DATABASE_URL DATABASE_CA SEED_ADMIN_EMAIL SEED_ADMIN_PASSWORD
  ```

  Email admin diketik setelah perintah `read -r`, password setelah `read -rs`. Password admin: frasa baru minimal 15 karakter dari pengelola password (misalnya empat kata acak), tanpa kata `point`, `password`, `admin`, atau bagian depan email. Env di shell mengalahkan `.env` lokal, jadi `.env` tidak perlu diubah.

  **Hasil yang diharapkan:** keluaran memuat baris berikut (waktu dan durasi berbeda):

  ```
  INFO: Reading migration files from .../src/migrations
  INFO: Migrating: 20261106_152942_awal
  INFO: Migrated:  20261106_152942_awal (...ms)
  INFO: Migrating: 20261106_163351_kunci_data_api
  INFO: Migrated:  20261106_163351_kunci_data_api (...ms)
  INFO: Done.
  INFO: Seed selesai. Admin: dibuat. Pilar: 4. Halaman draf: 6. Tools baru: 6. Parameter baru: 22.
  ```

  **Bila gagal:** `Seed dihentikan. password: ...` berarti password ditolak aturan password produksi; buat frasa lain dan ulangi dua perintah `read` dan `pnpm seed`. Bila `pnpm migrate` bertanya soal data loss atau migrasi `dev`, hentikan (Ctrl+C) dan pastikan `DATABASE_URL` menunjuk proyek Supabase yang baru dibuat, bukan database lokal.

  ### C6. Proyek pratinjau di organisasi Free terpisah

  Deploy pratinjau Vercel memakai database sendiri, tidak pernah database produksi. Buat organisasi Supabase baru berpaket **Free** (paket organisasi Pro tidak bisa berisi proyek Free), lalu proyek `point-lat-pratinjau` di region **Southeast Asia (Singapore)**. Ulangi C2 (simpan sertifikat sebagai `~/point-lat-ca-pratinjau.crt`), C3, dan C4 (simpan sebagai "DATABASE_URL pratinjau"), lalu C5 dengan `~/point-lat-ca-pratinjau.crt` dan password admin pratinjau yang berbeda dari produksi.

  **Hasil yang diharapkan:** keluaran sama dengan C5 di proyek pratinjau.
  Proyek Free dijeda bila aktivitas database selama 7 hari terlalu sedikit (Supabase mengirim email peringatan sekitar seminggu sebelumnya); build pratinjau gagal sampai proyek dilanjutkan lewat **Resume project** di dashboard (bisa sampai 90 hari setelah dijeda, data dan setelan kembali utuh).

  ## D. Proyek Vercel, env, dan deploy produksi pertama

  ### D1. Impor repo

  Di tim Vercel berpaket Pro: **Add New**, **Project**, **Import Git Repository**. Bila diminta, pasang Vercel GitHub App hanya untuk repo `vanhallen28/point.lat`. Framework terdeteksi Next.js; perintah build diambil dari `vercel.json` (`pnpm build:vercel`). Jangan isi env di layar impor. Pilih **Deploy**.

  **Hasil yang diharapkan:** deploy pertama **gagal** di langkah `pnpm periksa:rilis` dengan `Env deploy belum benar:` dan daftar yang diawali `DATABASE_URL belum diisi.` Ini bukti penjaga lingkungan aktif dan `VERCEL_ENV` terbaca; database belum tersentuh.
  **Bila gagal dengan galat lain:** `missing secret key. A secret key is needed to secure Payload.` berarti `VERCEL_ENV` tidak terbaca (penjaga mati); lanjutkan ke D2 dulu.

  ### D2. System Environment Variables

  Settings, Environment Variables: pastikan **Automatically expose System Environment Variables** dicentang. `VERCEL_ENV` (`production` atau `preview`) menyalakan semua pemeriksaan di `src/modules/lingkungan`.

  **Hasil yang diharapkan:** kotak tercentang.

  ### D3. Env per lingkungan

  Settings, Environment Variables, **Add New**, satu per baris, dengan centang lingkungan sesuai kolom. Tandai **Sensitive** untuk `DATABASE_URL`, `PAYLOAD_SECRET`, `CLOUDINARY_API_SECRET`, `CRON_SECRET`, `GOOGLE_SERVICE_ACCOUNT_JSON`, dan `ANTHROPIC_API_KEY`. Nilai acak dibuat dengan `openssl rand -hex 32` (satu nilai baru untuk setiap baris yang memintanya; jangan dipakai ulang antarlingkungan).

  | Nama | Production | Preview | Development |
  |---|---|---|---|
  | `DATABASE_URL` | "DATABASE_URL produksi" (C4) | "DATABASE_URL pratinjau" (C6) | tidak diisi |
  | `DATABASE_CA` | seluruh isi `~/point-lat-ca-produksi.crt` | seluruh isi `~/point-lat-ca-pratinjau.crt` | tidak diisi |
  | `PAYLOAD_SECRET` | hasil `openssl rand -hex 32` | hasil `openssl rand -hex 32` yang lain | tidak diisi |
  | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | dari Cloudinary, Settings, API Keys | sama dengan Production | tidak diisi |
  | `INDEXER_ADAPTER` | `palsu` dulu, diganti `asli` di G4 | `palsu` | tidak diisi |
  | `AI_ADAPTER` | `palsu` dulu, diganti `asli` di H1 | `palsu` | tidak diisi |
  | `CRON_SECRET` | hasil `openssl rand -hex 32` | tidak diisi | tidak diisi |
  | `GOOGLE_SERVICE_ACCOUNT_JSON` | ditambahkan di G4 | **tidak pernah** | tidak diisi |
  | `ANTHROPIC_API_KEY` | ditambahkan di H1 | **tidak pernah** | tidak diisi |

  Development tidak dipakai: pengembangan lokal memakai `.env` dan database lokal. `NEXT_PUBLIC_SITE_URL`, `SEED_ADMIN_EMAIL`, dan `SEED_ADMIN_PASSWORD` tidak diisi di Vercel (URL situs dibaca dari Pengaturan SEO; akun admin dibuat di C5). Iklan di pratinjau mati karena database pratinjau punya global Iklan sendiri dengan "Tampilkan iklan" mati.

  **Hasil yang diharapkan:** daftar env menampilkan setiap nama dengan lingkungan sesuai tabel. Penjaga menolak deploy pratinjau yang memegang `GOOGLE_SERVICE_ACCOUNT_JSON`, `ANTHROPIC_API_KEY`, atau adapter `asli`.

  ### D4. Deploy produksi

  Deployments, deploy yang gagal di D1, menu titik tiga, **Redeploy**.

  **Hasil yang diharapkan:** log build memuat urutan ini, lalu build Next selesai dan deploy berstatus **Ready** sebagai Production:

  ```
  INFO: Lingkungan produksi siap: env dan database cocok.
  INFO: Reading migration files from .../src/migrations
  INFO: Done.
  INFO: Lingkungan produksi siap: env dan database cocok.
  ```

  (`Done.` tanpa baris `Migrating`, karena kedua migrasi sudah dijalankan di C5.) Di Supabase produksi, SQL Editor:

  ```sql
  select name, batch from payload_migrations order by name;
  select data->>'lingkungan' as lingkungan from payload_kv where key = 'lingkungan-database';
  select has_table_privilege('anon', 'public.artikel', 'select') as anon_bisa_baca;
  ```

  hasilnya dua migrasi dengan batch 1, `produksi`, dan `false`.
  **Bila gagal:** lihat Pemecahan masalah. `Lingkungan lokal siap` di log berarti `VERCEL_ENV` tidak terbaca (D2).

  ### D5. Cron, region, dan perlindungan pratinjau

  - Settings, Cron Jobs: `/api/jobs/run` dengan jadwal `*/10 * * * *`. Cron hanya berjalan untuk deploy Production.
  - Settings, Functions: region fungsi Singapura (`sin1`).
  - Settings, Deployment Protection: **Vercel Authentication** aktif untuk deploy pratinjau, jadi URL pratinjau hanya bisa dibuka anggota tim.

  **Hasil yang diharapkan:** ketiganya sesuai. Dalam 10 menit, Logs dengan filter path `/api/jobs/run` menampilkan permintaan berstatus 200.

  ## E. Domain point.lat

  ### E1. Tambah domain

  Settings, Domains: tambahkan `point.lat`, lalu `www.point.lat` dengan pilihan redirect ke `point.lat`. Isi record DNS di pengelola domain persis seperti yang ditampilkan Vercel untuk masing-masing domain.

  **Hasil yang diharapkan:** kedua domain berstatus **Valid Configuration** dan sertifikat terbit (bisa beberapa menit sampai beberapa jam setelah DNS menyebar).

  ### E2. Periksa HTTPS dan header keamanan

  ```bash
  curl -sI https://point.lat/ | grep -iE '^(HTTP|strict-transport-security|x-content-type-options|referrer-policy|x-frame-options|permissions-policy|content-security-policy)'
  curl -sI http://point.lat/ | grep -iE '^(HTTP|location)'
  curl -sI https://www.point.lat/ | grep -iE '^(HTTP|location)'
  ```

  **Hasil yang diharapkan:** perintah pertama `HTTP/2 200` dengan `strict-transport-security: max-age=63072000` (dipasang Vercel untuk domain kustom), `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`, `x-frame-options: SAMEORIGIN`, `permissions-policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`, dan `content-security-policy: base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'`. Perintah kedua dan ketiga mengalihkan (status 3xx) ke `https://point.lat/`.

  ## F. Admin, Cloudinary, dan halaman wajib

  ### F1. Masuk admin

  Buka `https://point.lat/admin`, masuk dengan akun C5.

  **Hasil yang diharapkan:** dashboard admin berbahasa Indonesia. Global Pengaturan SEO berisi URL situs `https://point.lat` (bawaan; tidak perlu diubah).

  ### F2. Aset sistem Cloudinary (sekali per akun)

  Dari root repo di komputer:

  ```bash
  read -r CLOUDINARY_CLOUD_NAME && export CLOUDINARY_CLOUD_NAME
  read -rs CLOUDINARY_API_KEY && export CLOUDINARY_API_KEY
  read -rs CLOUDINARY_API_SECRET && export CLOUDINARY_API_SECRET
  pnpm media:siapkan
  pnpm media:siapkan
  unset CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET
  ```

  **Hasil yang diharapkan:** `Cloudinary siap. Kanvas OG: dibuat.` lalu `Cloudinary siap. Kanvas OG: sudah-ada.`

  ### F3. Uji langsung Cloudinary

  Ikuti Rencana 2 Task 8 langkah 2 sampai 6 (`docs/superpowers/plans/2026-11-04-rencana-2-media-cloudinary.md`) dengan `https://point.lat/admin` sebagai alamat admin: unggah gambar di atas 4,5 MB, periksa URL dan `f_auto`, unggah video kecil dan periksa poster serta HLS, periksa gambar OG, lalu hapus kedua dokumen uji.

  **Hasil yang diharapkan:** sesuai hasil yang diharapkan di setiap langkah Task 8; catat hasilnya di log keputusan.

  ### F4. Halaman wajib dan footer

  Seed membuat halaman statis sebagai draf (antara lain `/kontak`, `/pasang-iklan`, `/pedoman-media-siber`, dan `/kebijakan-privasi`). Tulis isinya lalu terbitkan. Kebijakan Privasi wajib terbit sebelum iklan dinyalakan; cakupan isinya ada di Setup dari pemilik Rencana 8A. Tambahkan juga kebijakan penggunaan AI ke Kebijakan Redaksi (Setup dari pemilik Rencana 7).

  **Hasil yang diharapkan:** setiap tautan di footer menjawab 200 di `https://point.lat`.

  ## G. Google Search Console, akun layanan, dan IndexNow

  Urutan rinci dan alasannya ada di Setup dari pemilik Rencana 6A dan 6B.

  ### G1. Properti Search Console

  Tambahkan properti **domain** `point.lat` dan verifikasi lewat record TXT di pengelola domain.

  **Hasil yang diharapkan:** properti `point.lat` terverifikasi. Pengaturan SEO tetap memakai properti `sc-domain:point.lat`.

  ### G2. Akun layanan

  Di Google Cloud: buat proyek, aktifkan **Google Search Console API**, buat akun layanan, lalu buat dan unduh **kunci JSON** (Google hanya memberikannya sekali; simpan di pengelola password, hapus file unduhannya). Biarkan Web Search Indexing API mati.

  **Hasil yang diharapkan:** kunci JSON tersimpan; field `client_email` berakhiran `iam.gserviceaccount.com`.

  ### G3. Akun layanan sebagai Owner

  Search Console, properti `point.lat`, Setelan, Pengguna dan izin: tambahkan `client_email` akun layanan sebagai **Pemilik** (Owner).

  **Hasil yang diharapkan:** akun layanan tercantum sebagai Pemilik.

  ### G4. Env Google dan adapter asli

  Vercel, Environment Variables, Production saja: tambahkan `GOOGLE_SERVICE_ACCOUNT_JSON` berisi seluruh isi kunci JSON (Sensitive), dan ubah `INDEXER_ADAPTER` Production menjadi `asli`. Lalu Redeploy produksi.

  **Hasil yang diharapkan:** log build `Lingkungan produksi siap`; Admin, Pengaturan SEO, Mesin Indexing, Status pemasangan menandai butir Google sebagai "Siap".

  ### G5. Kunci IndexNow

  ```bash
  openssl rand -hex 16
  ```

  Isi hasilnya di Admin, Pengaturan SEO, Mesin Indexing, **Kunci IndexNow**, lalu Simpan. Jangan mengganti kunci setelah dipakai.

  **Hasil yang diharapkan:** `https://point.lat/<kunci>.txt` berisi kunci itu, dan keempat butir Status pemasangan berstatus "Siap". Biarkan saklar "Kabari Google lewat Indexing API" mati.

  ## H. Asisten AI, Firewall, backup, dan deploy pratinjau

  ### H1. Kunci Claude dengan batas belanja

  Di Claude Console: buat workspace untuk point.lat, pasang batas belanja bulanan workspace sedikit di atas anggaran Asisten AI, lalu buat kunci API di workspace itu. Di Vercel, Production saja: tambahkan `ANTHROPIC_API_KEY` (Sensitive) dan ubah `AI_ADAPTER` menjadi `asli`, lalu Redeploy produksi.

  **Hasil yang diharapkan:** Admin, Pengaturan, Asisten AI: Status pemasangan "Siap" untuk Mode (Asli), Kunci API Claude, dan ketiga tugas. Cocokkan tabel harga dengan halaman harga Claude saat itu dan atur anggaran bulanan (Setup dari pemilik Rencana 7).

  ### H2. Aturan Firewall

  Vercel, proyek point.lat, **Firewall**, **Configure**, **+ New Rule**, dua aturan:

  | Nama | Kondisi **If** (semua benar) | **Then** |
  |---|---|---|
  | Batas beacon log 404 | path sama dengan `/api/log-404/catat`, metode `POST` | Rate Limit, Fixed Window, 60 detik, 10 permintaan, kunci IP |
  | Batas pencarian | path sama dengan `/cari`, metode `GET` | Rate Limit, Fixed Window, 60 detik, 30 permintaan, kunci IP |

  Mulai dengan aksi **Log** selama beberapa hari, lalu ganti ke **Default (429)**. Setiap perubahan: **Save Rule**, **Review Changes**, **Publish** (berlaku tanpa deploy ulang). `/cari` satu-satunya halaman yang dirender per permintaan; 30 pencarian per menit per IP longgar untuk pembaca biasa.

  **Hasil yang diharapkan:** kedua aturan tampil aktif; setelah beberapa hari, Firewall menampilkan lalu lintas yang cocok dengan setiap aturan.

  ### H3. Backup mingguan

  Jalankan bagian A runbook `docs/operasional/pemulihan-database.md` (kunci GPG, role baca saja, secret GitHub Actions, run pertama), lalu bagian B (uji pulih) dalam minggu pertama.

  **Hasil yang diharapkan:** run **Backup mingguan** hijau dengan artifact `cadangan-database-<nomor>`, dan uji pulih tercatat di Riwayat runbook itu.

  ### H4. Deploy pratinjau pertama

  ```bash
  git switch -c uji-pratinjau
  git commit --allow-empty -m "chore: uji deploy pratinjau"
  git push -u origin uji-pratinjau
  ```

  **Hasil yang diharapkan:** Vercel membuat deploy **Preview**; log build memuat `Lingkungan pratinjau siap: env dan database cocok.` dua kali. URL pratinjau meminta login Vercel; setelah login, `/admin` menerima akun admin pratinjau (C6), bukan akun produksi. Di Supabase pratinjau, `select data->>'lingkungan' from payload_kv where key = 'lingkungan-database';` menghasilkan `pratinjau`.

  Lalu hapus branch uji:

  ```bash
  git switch master
  git push origin --delete uji-pratinjau
  git branch -D uji-pratinjau
  ```

  ## I. Rilis dan cek pasca-rilis

  ### I1. Terbitkan tulisan pertama

  Terbitkan satu artikel, lalu buka Admin, Log indexing.

  **Hasil yang diharapkan:** baris "Revalidasi cache", "Kirim sitemap ke Search Console" (adapter `searchConsole`), dan "IndexNow" (adapter `indexNow`) berstatus Berhasil. Artikel tampil di beranda dan rubriknya.
  **Bila gagal:** Google 403 berarti akun layanan belum Owner (G3); IndexNow 403 berarti file kunci tidak cocok (G5).

  ### I2. robots.txt dan sitemap

  ```bash
  curl -s https://point.lat/robots.txt
  curl -s https://point.lat/sitemap.xml | head -20
  curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://point.lat/news-sitemap.xml
  ```

  **Hasil yang diharapkan:** robots memuat `User-agent: *`, `Allow: /`, `Allow: /api/media/file/`, `Disallow: /admin`, `Disallow: /api/`, `Disallow: /cari`, lalu `Sitemap: https://point.lat/sitemap.xml` dan `Sitemap: https://point.lat/news-sitemap.xml`. Sitemap index berisi `https://point.lat/sitemap/...xml`; news sitemap menjawab `200` dengan tipe XML. Di Search Console, Sitemaps, status sitemap "Berhasil".

  ### I3. Rich Results Test

  Uji URL artikel I1 di Rich Results Test Google.

  **Hasil yang diharapkan:** item Artikel (Article atau NewsArticle untuk explainer) dan Breadcrumb valid tanpa galat.

  ### I4. Performa di produksi

  PageSpeed Insights, mode seluler, untuk beranda, artikel I1, satu rubrik, dan `https://point.lat/tools/gaji-bersih`.

  **Hasil yang diharapkan:** Performance minimal 90 dan CLS paling banyak 0,1 (anggaran spesifikasi §12, sama dengan Lighthouse CI). LCP sekitar 2,5 detik wajar untuk kunjungan pertama (teks banner persetujuan; spesifikasi §19). Data lapangan baru muncul setelah situs cukup ramai.

  ### I5. Cron dan durasi fungsi

  Vercel, Logs, filter path `/api/jobs/run`, satu jam terakhir. Admin, Dashboard SEO.

  **Hasil yang diharapkan:** enam permintaan per jam berstatus 200, masing-masing jauh di bawah batas 300 detik fungsi Vercel Pro. Dalam satu jalan cron, baris "Sinkron Search Console" dan "Pindai tautan" di Dashboard SEO berhasil (data Google untuk domain baru muncul beberapa hari kemudian). Bila durasi mendekati 300 detik, catat untuk Fase 2 (`maxDuration` di `vercel.json`).

  ### I6. Log 404

  Buka `https://point.lat/halaman-uji-404-rilis` di browser.

  **Hasil yang diharapkan:** halaman 404 point. dengan form cari; dalam satu menit path itu muncul di Admin, Log 404.

  ### I7. Data API Supabase tertutup

  Project URL dan publishable key ada di dashboard Supabase produksi (tombol Connect, atau Settings, API Keys). Keduanya bukan rahasia.

  ```bash
  read -r SUPABASE_URL
  read -r KUNCI_PUBLIK
  curl -s -o /dev/null -w "%{http_code}\n" "$SUPABASE_URL/rest/v1/artikel?select=id&limit=1" -H "apikey: $KUNCI_PUBLIK"
  ```

  **Hasil yang diharapkan:** kode selain `200`. Bila `200`, ulangi C3 dan periksa kueri D4 (`anon_bisa_baca` harus `false`).

  ### I8. Asisten AI dengan kunci asli

  Di artikel draf: buat brief, satu draf bagian, dan saran meta.

  **Hasil yang diharapkan:** ketiganya menjawab; Admin, log AI mencatat token, biaya, dan durasi; pemakaian bulan ini di global Asisten AI bertambah sesuai biaya.

  ### I9. Backup dan CI setelah rilis

  **Hasil yang diharapkan:** run Backup mingguan berikutnya (Minggu 02.23 WIB) hijau; CI tetap hijau di commit `master` berikutnya.

  ## J. AdSense

  Ikuti Setup dari pemilik Rencana 8A setelah Kebijakan Privasi terbit (F4) dan konten cukup.

  ### J1. Daftarkan situs dan ID penerbit

  Daftarkan `point.lat` di AdSense, Sites. Isi ID penerbit di Admin, global Iklan, dengan "Tampilkan iklan" tetap mati.

  **Hasil yang diharapkan:** `https://point.lat/ads.txt` memuat baris AdSense; status ads.txt di AdSense, Sites menjadi "Authorized".

  ### J2. Unit iklan dan menyalakan

  Buat unit display berukuran tetap (300 x 250, 336 x 280, atau 320 x 100) sesuai slot, isi ID unitnya di global Iklan, biarkan Auto ads mati. Setelah AdSense menyetujui situs, nyalakan "Tampilkan iklan" dengan "Mode uji" mati.

  **Hasil yang diharapkan:** di jendela privat, banner persetujuan tampil; setelah "Izinkan semua", kotak berlabel "Advertisements" muncul dan terisi.

  ### J3. Lighthouse dengan iklan nyata

  Di Chrome biasa (bukan privat), buka satu artikel, pilih "Izinkan semua", lalu DevTools, Lighthouse, mode Mobile, kategori Performance, dengan **Clear storage** dimatikan di setelan Lighthouse supaya pilihan persetujuan tetap ada. Jalankan **Analyze page load**.

  **Hasil yang diharapkan:** iklan termuat selama pengukuran dan CLS paling banyak 0,1 (slot memesan tinggi). Catat skor Performance; skor di bawah 90 karena skrip iklan dicatat di log keputusan untuk dibahas, bukan alasan mematikan iklan.

  ## Verifikasi

  - [ ] Deploy Production terakhir **Ready** dan log build memuat `Lingkungan produksi siap: env dan database cocok.`
  - [ ] `https://point.lat` menjawab 200 dengan HSTS dan lima header keamanan (E2).
  - [ ] Log indexing tulisan pertama Berhasil untuk Search Console dan IndexNow (I1).
  - [ ] Cron `/api/jobs/run` 200 setiap 10 menit (I5).
  - [ ] Data API Supabase tidak menjawab data (I7).
  - [ ] Backup mingguan hijau dan uji pulih tercatat (H3).
  - [ ] Deploy pratinjau memakai database pratinjau (H4).

  ## Pemecahan masalah

  | Gejala | Kemungkinan penyebab | Perbaikan |
  |---|---|---|
  | Build: `Env deploy belum benar:` dengan daftar | Env lingkungan itu belum lengkap atau salah | Perbaiki setiap butir sesuai pesannya (D3), lalu Redeploy |
  | Build: `Database ini milik Production, tetapi deploy ini Preview` | `DATABASE_URL` Preview menunjuk database produksi | Ganti `DATABASE_URL` dan `DATABASE_CA` Preview ke proyek pratinjau (C6), lalu Redeploy. Database produksi tidak diubah karena penjaga berhenti sebelum migrasi |
  | Build: `Lingkungan lokal siap`, atau `missing secret key` sebelum env diisi | `VERCEL_ENV` tidak terbaca, jadi penjaga lingkungan mati | Centang Automatically expose System Environment Variables (D2), lalu Redeploy |
  | Build: `unable to verify the first certificate` atau `self-signed certificate in certificate chain` | `DATABASE_CA` bukan sertifikat proyek itu, atau terpotong | Tempel ulang seluruh isi file sertifikat proyek yang sama dengan `DATABASE_URL` |
  | Build: `password authentication failed` | Password di `DATABASE_URL` salah | Salin ulang URI transaction pooler (C4) |
  | Build pratinjau gagal terhubung setelah lama tidak dipakai | Proyek Free dijeda | Dashboard Supabase, organisasi pratinjau, proyek pratinjau, **Resume project** |
  | `pnpm seed` mencetak `Seed dihentikan. password: ...` | Password admin ditolak | Pakai frasa lain minimal 15 karakter (C5) |
  | Cron di Logs berstatus 401 | `CRON_SECRET` berubah tanpa deploy ulang | Redeploy produksi |
  | Log indexing: Google 403 | Akun layanan belum Owner | G3 |
  | Log indexing: IndexNow 403 | File kunci tidak cocok | Buka `https://point.lat/<kunci>.txt`, cocokkan dengan Pengaturan SEO (G5) |
  | AdSense: ads.txt "Not found" atau "Unauthorized" | ID penerbit belum diisi atau salah | Cocokkan isi `https://point.lat/ads.txt` dengan ID penerbit (J1) |

  ## Rollback

  - **Kode:** Vercel, Deployments, deploy Production sebelumnya, **Instant Rollback**. Migrasi yang sudah berjalan tetap ada; perubahan skema selalu aditif (CLAUDE.md), jadi kode lama tetap berjalan di skema baru.
  - **Env:** kembalikan nilai lama di Settings, Environment Variables, lalu Redeploy.
  - **Data:** runbook `docs/operasional/pemulihan-database.md`, bagian C.
  - **Iklan, Indexing API, atau Asisten AI bermasalah:** matikan saklarnya di admin (global Iklan, Pengaturan SEO, global Asisten AI); berlaku tanpa deploy.
  - **Situs harus turun total:** Settings, Domains, hapus `point.lat` dari proyek (DNS tetap di pengelola domain untuk dipasang lagi).

  ## Eskalasi

  | Situasi | Kontak | Cara |
  |---|---|---|
  | Build, domain, cron, atau Firewall bermasalah di sisi Vercel | Dukungan Vercel (paket Pro) | Dashboard Vercel, Help |
  | Database, pooler, atau SSL bermasalah di sisi Supabase | Dukungan Supabase (paket Pro) | Dashboard Supabase, Support, tiket baru |
  | Search Console atau akun layanan | Bantuan Search Console | support.google.com/webmasters |
  | Cloudinary menolak unggah atau transformasi | Dukungan Cloudinary | Dashboard Cloudinary, Support |
  | Claude API galat terus-menerus | Dukungan Anthropic | Claude Console, Help |

  ## Riwayat

  | Tanggal | Oleh | Catatan |
  |---|---|---|
  | 7 November 2026 | Probe Rencana 8C (Postgres 16 lokal, PgBouncer mode transaksi dengan TLS dan CA tiruan sebagai pengganti Supabase) | C5 diuji: `pnpm migrate` dan `pnpm seed` dari shell dengan `DATABASE_URL` dan `DATABASE_CA` ter-export (nilai lewat `read -rs`) mengenai database pooler, bukan database di `.env` lokal; tanpa baris push `dev`; admin hasil seed bisa login dengan `PAYLOAD_SECRET` lain (seperti runtime Vercel), password salah ditolak. D1 diuji tanpa `.env`: dengan `VERCEL_ENV=production` dan tanpa env lain `pnpm periksa:rilis` menolak dengan enam butir yang diawali `DATABASE_URL belum diisi.`; tanpa `VERCEL_ENV` galatnya `missing secret key`. D4 diuji dengan `pnpm build:vercel` ber-`VERCEL_ENV=production` setelah C5: penanda `produksi`, migrasi hanya `Done.`, build berhasil, server menjawab 200 untuk beranda, rubrik, `/tools`, robots, sitemap, dan login admin dengan menu pilar dari seed, header keamanan, dan robots persis seperti I2. Penjaga, header, migrasi, dan backup juga diuji di task kode Rencana 8C. Langkah di layanan luar belum dijalankan. |
  ````

- [ ] **Langkah 2: Runbook pemulihan dan CLAUDE.md**

  ```diff
  diff --git a/docs/operasional/pemulihan-database.md b/docs/operasional/pemulihan-database.md
  index bb7b698..207e644 100644
  --- a/docs/operasional/pemulihan-database.md
  +++ b/docs/operasional/pemulihan-database.md
  @@ -145,6 +145,8 @@ Supabase, Database, Backups, pilih backup harian sebelum kejadian, **Restore**.
   
   Setelah selesai: Vercel, Deployments, deployment produksi terakhir, **Redeploy**. Build menjalankan `pnpm build:vercel`, jadi migrasi yang lebih baru dari backup diterapkan ulang.
   
  +Password role buatan sendiri tidak ikut backup Supabase. Setelah pemulihan, di SQL Editor jalankan `alter role cadangan_baca with password '<password-cadangan_baca-dari-pengelola-password>';` dengan password yang sama seperti di A2, supaya secret `BACKUP_DATABASE_URL` tetap berlaku.
  +
   **Periksa:** beranda, satu artikel, admin login, dan Dashboard SEO (cron berjalan dalam 10 menit).
   
   ### C2. Proyek Supabase hilang, atau backup harian tidak cukup
  ```

  ```diff
  diff --git a/CLAUDE.md b/CLAUDE.md
  index 0ddbb33..bc69217 100644
  --- a/CLAUDE.md
  +++ b/CLAUDE.md
  @@ -28,6 +28,7 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Build Vercel (`buildCommand` di `vercel.json`): `pnpm build:vercel`, yaitu `pnpm periksa:rilis` (env dan penanda database), `pnpm migrate`, `pnpm periksa:rilis` lagi (database baru ditandai), lalu `pnpm build`
   - Lighthouse CI (setelah build E2E, port 3100 kosong, `CHROME_PATH` ke Chromium Playwright, env server seperti langkah Lighthouse di `ci.yml`): `pnpm lighthouse`
   - Cadangan dan pemulihan database: `scripts/cadangkan-database.sh` dan `scripts/pulihkan-database.sh` (runbook `docs/operasional/pemulihan-database.md`)
  +- Rilis dan uji langsung (langkah pemilik dari nol sampai live, lalu uji layanan luar): runbook `docs/operasional/rilis.md`
   
   ## Konvensi
   - Nama domain memakai bahasa Indonesia, sama dengan spesifikasi: slug koleksi (`artikel`, `pilar`), nama field (`judul`, `intinya`), nama fungsi modul (`kabari`, `hitung`, `pathFor` adalah pengecualian yang sudah ada).
  ```

- [ ] **Langkah 3: Pemeriksaan akhir di database tes yang dibuat ulang**

  ```bash
  psql -q postgres://postgres:postgres@127.0.0.1:5432/postgres -c "DROP DATABASE IF EXISTS pointlat_test WITH (FORCE)" -c "CREATE DATABASE pointlat_test" -c "DROP DATABASE IF EXISTS pointlat_test_e2e WITH (FORCE)"
  rm -rf .next
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int > /tmp/int-task12.log 2>&1; grep -E "Test Files|Tests " /tmp/int-task12.log
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 550 tes (80 file); integrasi 164 tes (49 file); E2E 153 tes.

- [ ] **Langkah 4: Putaran kedua tanpa membuat ulang database**

  ```bash
  pnpm test:e2e
  pnpm test:int > /tmp/int-task12-2.log 2>&1; grep -E "Test Files|Tests " /tmp/int-task12-2.log
  pnpm build
  git status --porcelain
  ```

  Hasil yang diharapkan: E2E 153 tes lagi di database E2E yang sama; integrasi 164 tes di database tes yang sudah berisi data putaran pertama (tes penanda mengosongkan penandanya sendiri, tes password memakai email `unik()`); build berhasil; `git status` hanya menampilkan tiga file task ini.

- [ ] **Langkah 5: Commit**

  ```bash
  git add CLAUDE.md docs/operasional/pemulihan-database.md docs/operasional/rilis.md
  git commit -m "docs: runbook rilis dan uji langsung (Supabase, Vercel, domain, layanan luar, cek pasca-rilis)"
  ```

---

## Selesai bila

- Dua belas commit, satu per task, masing-masing hijau saat dibuat: type check dan lint bersih, unit, integrasi, dan E2E sesuai tabel Jumlah tes (akhir: unit 550 tes di 80 file, integrasi 164 tes di 49 file, E2E 153 tes), dan `pnpm build` berhasil.
- Di commit terakhir, integrasi dan E2E lulus dua kali tanpa membuat ulang database (Task 12 langkah 4).
- `pnpm payload migrate:create periksa --skip-empty` tidak membuat file; skema database hasil `pnpm migrate` sama dengan skema hasil push, dan `pnpm build` berhasil dari database yang hanya dimigrasi tanpa baris `dev` (Task 3).
- `pnpm periksa:rilis` mencetak `Lingkungan lokal siap: env dan database cocok.` dan menolak `VERCEL_ENV=production` dengan env lokal (Task 4); password contoh ditolak di lingkungan terbuka (Task 5).
- Server produksi lokal mengirim lima header keamanan tanpa `X-Powered-By`, dan beranda tetap `x-nextjs-cache: HIT` (Task 6).
- Langkah job `cek` dan `e2e` CI berjalan lokal tanpa galat, dan cek migrasi gagal bila skema berubah tanpa migrasi (Task 7); latihan cadangkan dan pulihkan lokal sesuai Task 8; migrasi `kunci_data_api` menutup semua tabel dari `anon` dan `authenticated` (Task 9); Lighthouse lulus anggaran bila Task 10 tidak dilepas.
- Rencana, workflow, runbook, dan commit tanpa rahasia asli, tanpa em dash dan en dash.

## Setup dari pemilik

Kode rencana ini tidak menghubungi layanan luar. Langkah pemilik, berurutan:

- [x] **Persetujuan dependensi:** `@lhci/cli` 0.15.1 disetujui pemilik (7 November 2026), Task 10 dijalankan. Next 16.3.8 disetujui 6 November 2026.
- [ ] **Push dan CI:** setelah rencana ini selesai dan direview, sesi utama mem-push `master` ke `vanhallen28/point.lat`; pastikan workflow CI hijau (runbook rilis B1). Repo belum punya secret Actions; CI tidak membutuhkannya.
- [ ] **Rilis:** ikuti `docs/operasional/rilis.md` dari bagian A sampai I secara berurutan: Supabase produksi (Pro, Singapura, SSL wajib, Data API mati, migrasi dan seed dari komputer), Supabase pratinjau (organisasi Free terpisah), proyek Vercel (deploy pertama gagal di penjaga sebagai bukti), env per lingkungan, deploy produksi, domain `point.lat`, admin dan Cloudinary (termasuk Rencana 2 Task 8), halaman wajib dan Kebijakan Privasi, Search Console dan akun layanan, IndexNow, Claude Console dengan batas belanja, aturan Firewall beacon 404 dan `/cari`, backup mingguan (runbook pemulihan A dan B), deploy pratinjau, lalu cek pasca-rilis.
- [ ] **AdSense:** bagian J runbook rilis setelah Kebijakan Privasi terbit dan situs disetujui, termasuk Lighthouse dengan iklan nyata.
- [ ] **Catat hasil** uji langsung (Cloudinary, Google, IndexNow, Claude, AdSense, durasi cron) di log keputusan dan di Riwayat runbook.

## Cakupan yang ditunda

| Butir | Tujuan | Alasan |
|---|---|---|
| CSP penuh (arahan skrip) atau `Content-Security-Policy-Report-Only` | Fase 2 | AdSense hanya mendukung CSP ketat dengan nonce per permintaan, yang mematikan ISR; Report-Only butuh endpoint penampung laporan dan penyimpanannya. CSP sekarang menutup bingkai, `base-uri`, `object-src`, dan `form-action`. |
| HSTS `includeSubDomains` dan daftar preload | Fase 2, setelah semua subdomain point.lat pasti HTTPS | Vercel sudah memasang HSTS untuk domain kustom; preload sulit dibatalkan. |
| `maxDuration` cron dan rute berat | Fase 2, bila runbook I5 menunjukkan durasi mendekati 300 detik | Batas bawaan Pro 300 detik jauh di atas perkiraan satu jalan cron. |
| Pemantauan galat dan uptime (alert) | Fase 2 | Butuh layanan pihak ketiga dan dependensi baru; log Vercel dan Dashboard SEO cukup untuk awal. |
| Point-in-time recovery Supabase | Fase 2, bila data berubah cukup sering | Add-on sekitar US$100 per bulan; backup harian 7 hari dan cadangan mingguan 90 hari cukup untuk awal. |
| Uji pulih otomatis di CI | Fase 2 | Butuh kunci rahasia GPG di CI, yang justru dihindari; uji pulih manual setiap 3 bulan (runbook pemulihan B). |
| Pembaruan otomatis SHA action (Dependabot atau Renovate) | Fase 2 | Menambah pull request otomatis; SHA dikunci manual sekarang. |
| Pembersihan aset Cloudinary yatim (Rencana 6A) | Fase 2 | Butuh kredensial Cloudinary asli untuk diuji. |
| Pencarian `tsvector` (Rencana 4B) dan form newsletter penyedia | Fase 2 | Butuh keputusan pemilik dan migrasi baru; aturan migrasi sekarang sudah siap. |
| Font yang dipangkas untuk LCP | Diputuskan lagi dari data lapangan Search Console (keputusan pemilik 7 November 2026: terima LCP lab dulu) | Menghilangkan judul ramping bila hanya sumbu `wght`. |

## Risiko dan pertanyaan terbuka

| Risiko atau pertanyaan | Mitigasi |
|---|---|
| `VERCEL_ENV` tidak terbaca (System Environment Variables tidak diekspos) mematikan semua penjaga tanpa galat. | Runbook D1 dan D4 memeriksanya dari log build (`Env deploy belum benar` di deploy pertama, `Lingkungan produksi siap` sesudahnya); D2 meminta pemilik memeriksa setelannya. |
| Proyek pratinjau Free dijeda setelah 7 hari aktivitas rendah. | Build pratinjau gagal dengan galat koneksi; runbook menjelaskan **Resume project** (data utuh sampai 90 hari). Produksi tidak terpengaruh. |
| CI dan dev memakai Postgres 16, Supabase memakai 17. | SQL migrasi Drizzle standar dan sudah diuji lewat pooler di 16; workflow backup memakai klien 17; uji pulih pertama (runbook pemulihan B, minggu pertama) memakai cadangan dari server 17. |
| LCP lab HP kunjungan pertama sekitar 1,9 sampai 3,0 detik tergantung halaman dan putaran (teks banner persetujuan; font Archivo 90 KB dihitung Lantern sebelum paint pertama). Skor Performance artikel 0,94 di putaran kedua probe, jadi runner yang lebih lambat bisa mendekati batas 0,9. | Lighthouse CI hanya memperingatkan LCP; median 3 kali meredam variasi. Bila CI gagal hanya karena skor Performance sedikit di bawah 0,9, jalankan ulang sekali; bila berulang, putuskan soal font. **Keputusan pemilik (7 November 2026): terima LCP lab ini dulu**; LCP tetap peringatan, font tidak dipangkas, dan keputusan diulang dari data lapangan Search Console setelah situs ramai. Eksekusi Task 10: median Performance 0,98 sampai 0,99, LCP 1,98 sampai 2,42 detik, tanpa peringatan LCP. |
| Menit GitHub Actions repo privat terbatas sesuai paket GitHub pemilik; satu push ke `master` memakai sekitar 20 sampai 25 menit runner (di probe: job `cek` sekitar 14 menit, job `e2e` sekitar 8 menit ditambah pemasangan Chromium). | CI hanya berjalan untuk push ke `master`, pull request, dan jalan manual (bukan setiap push branch), dan `concurrency` membatalkan run lama di ref yang sama. **Keputusan pemilik (7 November 2026): job `e2e` tetap otomatis** di setiap push ke `master` dan pull request (GitHub Free 2.000 menit per bulan untuk repo privat; push dilakukan sekali per rencana); diubah ke manual bila menit menipis. |
| Migrasi berjalan saat deploy lama masih melayani. | Aturan CLAUDE.md: perubahan skema aditif; hapus atau ganti nama kolom lewat dua deploy. Migrasi gagal membuat deploy gagal dan deploy lama tetap melayani. |
| `payload migrate` lewat pooler mode transaksi bisa gagal bila versi Payload berikutnya memakai fitur sesi (advisory lock atau prepared statement bernama). | Probe 3.92.1 lulus. Bila terjadi setelah upgrade Payload, ganti `DATABASE_URL` build sementara ke session pooler (port 5432) dan catat; runtime tetap mode transaksi. |
| Halaman buat admin pertama tidak selalu menampilkan pesan aturan password di bawah isian (hanya ringkasan "Isian berikut tidak valid"). | Runbook membuat admin lewat `pnpm seed` yang mencetak pesan lengkap; halaman itu tetap menolak password lemah. |
| `vercel.json` `crons` disebut fitur lama di dokumentasi Vercel (penggantinya Schedules). | Masih didukung; runbook D5 memeriksa cron terdaftar dan berjalan. Pindah ke Schedules bila Vercel mengumumkan batas waktu. |
| Cloudinary pratinjau memakai akun yang sama dengan produksi. | Database pratinjau terpisah, jadi hanya aset unggahan pratinjau yang bisa dihapus dari pratinjau; jangan memulihkan data produksi ke database pratinjau (penanda juga menolaknya). Bawaan rencana dipakai (pengawas, 7 November 2026): akun yang sama dulu; product environment terpisah bisa dipakai kapan saja dengan mengganti env `CLOUDINARY_*` Preview di Vercel, tanpa ubah kode. |
| Supabase tidak menyimpan password role buatan sendiri di backup harian. | Runbook pemulihan C1 meminta pengaturan ulang password `cadangan_baca`. |
| Lighthouse CI memakai Lighthouse 12.6.1, PageSpeed Insights memakai versi yang lebih baru. | Angka bisa sedikit berbeda; anggaran sama di kedua tempat (runbook I4). |

## Temuan review sebelum eksekusi

| Temuan | Tindakan |
|---|---|
| `next build` dengan `.next/cache/fetch-cache` yang tersisa tidak menyentuh database, jadi penanda tidak tertulis di deploy produksi pertama. | `build:vercel` menjalankan `periksa:rilis` sebelum dan sesudah migrasi (Task 4); uji build lain selalu diawali `rm -rf .next`. |
| Setelah `onInit` melempar galat, `getPayload` berikutnya membuat Payload tanpa `onInit`, sehingga server pratinjau dengan database produksi melayani permintaan kedua. | `jagaDatabase` menghentikan proses (Task 4); tes unit memeriksa `process.exit(1)`. |
| Push Payload bergantung `NODE_ENV`, jadi `pnpm seed` dari komputer pemilik ke Supabase akan mendorong skema produksi. | Push ditentukan host `DATABASE_URL` (Task 2). |
| `migrate:create` menulis `"id"` acak di snapshot JSON dan nama berwaktu. | Nama dan id ditetapkan lewat `mv` dan `sed`, isi diperiksa dengan `sha256sum` (Task 3 dan 9). |
| Pesan seed yang ditolak hanya menyebut nama isian. | Seed mencetak pesan per isian (Task 5). |
| `pg_restore` gagal karena skema `public` sudah ada di database tujuan. | Daftar pemulihan membuang entri skema `public` (Task 8). |
| Socket `gpg-agent` gagal dibuat di folder sementara yang path-nya panjang. | Latihan Task 8 memakai `mktemp -d /tmp/cadangan.XXXXXX`. |
| Lighthouse awalnya juga menilai berat skrip dan menjadikan LCP galat; artikel LCP 2,58 detik menggagalkan CI walau skor 0,96. | Berat JS tetap di `motion.spec.ts`; LCP menjadi peringatan dengan alasan tercatat (Task 10). |
| Langkah typegen Next di CI ternyata tidak dibutuhkan type check di checkout bersih. | Dibuang dari workflow (Task 7). |
| Kueri hak tabel dengan `has_table_privilege` gagal karena perencana kueri mengevaluasinya untuk tabel sistem. | Kueri bukti memakai CTE `materialized` (Task 9). |
| Seed lewat `payload run` tidak bisa merevalidasi cache halaman di Vercel. | Runbook menjalankan migrasi dan seed sebelum build pertama (rilis C5). |
| Penjaga Preview mewajibkan kredensial Cloudinary. | Runbook memakai akun Cloudinary yang sama untuk Preview (Risiko). |
| Satu putaran E2E Task 1 gagal di `galat.spec.ts` (isi 404 Next yang dikenal) dan lulus saat diulang. | Aturan ulang sekali di Global Constraints mencakup Next 16.3.8. |
| Keputusan pemilik setelah rencana selesai (7 November 2026): jalankan sekarang dengan Lighthouse CI (`@lhci/cli` 0.15.1 disetujui); runbook tetap memakai terminal pemilik (git, Node, pnpm, psql, openssl, curl, gpg); LCP lab diterima dulu; job `e2e` CI otomatis. | Rencana diikuti apa adanya. Review pengawas sebelum eksekusi: tanpa rahasia asli (contoh `kata-sandi-tiruan`, proyek `abcdefghijklmnopqrst`), tanpa em dash dan en dash; skema hasil migrasi dan push dibandingkan ulang (108 tabel, beda 0 byte); hitungan baris dan skema latihan pulih dibandingkan ulang (sama); `npm view` memastikan `@lhci/cli` 0.15.1 (25 Juni 2025) dan `next` 16.3.8; GitHub Free 2.000 menit Actions per bulan, aturan branch repo privat hanya di GitHub Pro. |
| Eksekusi (subagen per kelompok task 1 sampai 3, 4 dan 5, 6 dan 7, 8 dan 9, 10 sampai 12). | Setiap commit identik dengan commit probe (diff kosong di luar file rencana); jumlah tes sama dengan tabel di setiap task; tidak ada kegagalan sekali jalan. Pemeriksaan akhir Task 12: unit 550, integrasi 164 dua kali di database yang sama, E2E 153 dua kali. Lighthouse Task 10 (median 3 run): beranda 0,98 (LCP 2,33 detik), artikel 0,98 (2,28 detik), rubrik 0,99 (1,98 detik), tools 0,98 (2,42 detik); CLS 0; TBT 50 sampai 54 ms. Catatan teks rencana: lockfile Task 1 64 dan 64 baris (dikoreksi di atas); `git status` antara di Task 3 Langkah 6 dan Task 7 Langkah 3 juga menampilkan file task yang belum di-commit (`?? src/migrations/`, `?? .github/`), kosong setelah commit. |

## Sumber riset

Diakses 6 November 2026 kecuali disebut lain.

- Payload migrasi: https://payloadcms.com/docs/database/migrations dan https://payloadcms.com/docs/v3/database/migrations.md (`migrate:create`, `migrate`, `--skip-empty`, `prodMigrations`, push dan migrasi, perintah build produksi)
- Payload Postgres: https://www.payloadcms.com/docs/database/postgres (opsi `pool`, `push`, `migrationDir`)
- Kode terpasang `payload` 3.92.1 dan `@payloadcms/db-postgres` 3.92.1 (`connect`, `pushDevSchema`, `migrate`, `migrate:create`, `getPayload` dengan `disableOnInit`, `payload_kv`, `resetPassword`)
- Supabase (lewat `search_docs`): https://supabase.com/docs/guides/database/connecting-to-postgres, https://supabase.com/docs/guides/platform/ipv4-address, https://supabase.com/docs/guides/platform/compute-and-disk, https://supabase.com/docs/guides/platform/backups, https://supabase.com/docs/guides/platform/manage-your-usage/branching, https://supabase.com/docs/guides/platform/manage-your-usage/compute, https://supabase.com/docs/guides/platform/billing-faq, https://supabase.com/docs/guides/platform/billing-on-supabase, https://supabase.com/docs/guides/platform/ssl-enforcement, https://supabase.com/docs/guides/database/postgres/roles, https://supabase.com/docs/guides/database/postgres/roles-superuser, https://supabase.com/docs/guides/database/postgres/which-version-of-postgres, https://supabase.com/docs/guides/self-hosting/restore-from-platform, https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- Supabase, diakses 7 November 2026: https://supabase.com/docs/guides/api/securing-your-api (hak bawaan `anon` dan `authenticated`, mematikan Data API), https://supabase.com/docs/guides/platform/free-project-pausing (jeda 7 hari, Resume project, 90 hari), https://supabase.com/docs/guides/platform/upgrading (password role buatan sendiri tidak ikut backup)
- Sertifikat CA Supabase dengan node-postgres: https://github.com/orgs/supabase/discussions/18710
- `pg-connection-string` 2.14.1 terpasang (`sslmode=require` sebagai `verify-full`, `uselibpqcompat`, `no-verify`)
- Vercel: https://vercel.com/docs/environment-variables/system-environment-variables, https://vercel.com/docs/functions/configuring-functions/duration, https://vercel.com/docs/functions/limitations, https://vercel.com/docs/functions/configuring-functions/region, https://vercel.com/docs/project-configuration/vercel-json, https://vercel.com/docs/cdn-security/encryption (HSTS domain kustom), https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines.md, https://vercel.com/kb/guide/connection-pooling-with-functions
- Next.js: https://github.com/vercel/next.js/releases/tag/v16.3.8 dan `git log v16.3.3..v16.3.8` (repo https://github.com/vercel/next.js), https://nextjs.org/docs/app/api-reference/config/next-config-js/headers, https://nextjs.org/docs/app/guides/content-security-policy
- Header keamanan: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html; CSP AdSense: https://support.google.com/adsense/answer/16283098?hl=en
- Password: https://pages.nist.gov/800-63-4/sp800-63b.html, ringkasan https://www.enzoic.com/blog/nist-sp-800-63b-rev4/
- GitHub Actions: https://docs.github.com/en/actions/tutorials/store-and-share-data, https://docs.github.com/en/organizations/managing-organization-settings/configuring-the-retention-period-for-github-actions-artifacts-and-logs-in-your-organization, https://github.com/actions/upload-artifact/pull/126, https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20260906.298 (gnupg2 2.4.4, tanpa `age`, PostgreSQL 16), https://cronuru.com/guides/github-actions-scheduled-workflows (jadwal UTC dan penundaan di awal jam); SHA tag rilis `actions/checkout`, `actions/setup-node`, `pnpm/action-setup`, `actions/upload-artifact` lewat `git ls-remote --tags`
- Klien PostgreSQL di Ubuntu: https://www.postgresql.org/download/linux/ubuntu/
- Registry npm (`npm view`): `@lhci/cli` 0.15.1 dan 0.16.0, `lighthouse` 12.6.1 dan 13.5.0 (versi, tanggal rilis, ukuran, `engines`)

Rencana berikutnya: tidak ada rencana kode lanjutan untuk rilis; pemilik menjalankan `docs/operasional/rilis.md`, lalu Fase 2.
