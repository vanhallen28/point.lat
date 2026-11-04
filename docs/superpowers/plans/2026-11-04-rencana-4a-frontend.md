# Rencana 4A: Frontend publik inti point.lat (design system, tata letak, artikel, glosarium, redirect, 404)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun fondasi frontend publik point.lat sesuai Arah 3 "Kartu Intinya": token desain dan font Archivo variable yang di-host sendiri, tata letak (header dengan pill rubrik, footer, skip link), halaman artikel untuk keempat tipe dan glosarium, redirect 301 dari CMS di runtime, halaman 404 yang mencatat ke `log-404`, motion (View Transitions, kartu masuk, reduced motion), serta E2E Playwright + axe di build produksi, semuanya tanpa jaringan dan tanpa kredensial Cloudinary.

**Architecture:** Halaman publik di `src/app/(frontend)/` adalah server component yang dirender ISR (`generateStaticParams` mengembalikan `[]`): dirender saat pertama diminta, disimpan, lalu dibuang oleh `revalidateTag` dari hook Payload. Semua data halaman lewat modul baru `src/modules/konten` (`muat*()` = query Payload di `unstable_cache` bertag `TAG`, `ambil*(payload)` versi tanpa cache untuk tes, fungsi murni `susun*` yang menerjemahkan dokumen Payload ke tipe tampilan). SEO tetap lewat `src/modules/seo` (`metadata`, `jsonLd`, `remahRoti`, `ambilSitus`). Komponen UI di `src/components/` memakai CSS Module dan token CSS tiga lapis di `src/styles/tokens.css`; JavaScript klien hanya untuk beacon log 404 dan pemicu animasi kartu. Rute catch-all `[...jalur]` menangani artikel sekarang dan pilar, subkategori, serta halaman statis di Rencana 4B; path tanpa dokumen diakhiri `tanganiTidakAda()` (redirect dari koleksi `redirect` atau 404).

**Tech Stack:** Next.js 16.3.3 (App Router, ISR, `next/font/local`, `next/image` dengan loader Cloudinary Rencana 2, React `ViewTransition` dari React canary bawaan Next), Payload 3.92.1 (`@payloadcms/richtext-lexical/react` untuk render isi), CSS Module + custom properties, Vitest 4 (unit + integrasi, `react-dom/server` untuk tes render), Playwright 1.63 + `@axe-core/playwright` 4.14, PostgreSQL 16/17, pnpm 10, Node 22.23.4+.

**Spesifikasi:** `docs/superpowers/specs/2026-11-03-point-lat-design.md` (§3 rambu kredibilitas dan disclaimer, §4 Visual "Kartu Intinya", §5 Arsitektur dan "Rendering", §6 `pilar`, `redirect`, `log404`, §7 URL `/{slug}` dan `/glosarium`, §12 Performa, §13 Motion, §14 Aksesibilitas, §15 404, §16 E2E dan axe, §20 skill tahap UI).

**Rencana sebelumnya:** `docs/superpowers/plans/2026-11-04-rencana-1-fondasi.md`, `docs/superpowers/plans/2026-11-04-rencana-2-media-cloudinary.md`, `docs/superpowers/plans/2026-11-04-rencana-3-seo.md` (baseline: 203 tes unit di 27 file, 49 tes integrasi di 13 file).

**Pembagian Rencana 4:** cakupan frontend publik terlalu besar untuk satu rencana (lebih dari 20 task). Rencana ini (4A) membangun fondasi yang dipakai semua halaman plus halaman artikel dan glosarium; Rencana 4B (beranda, rubrik pilar dan subkategori, penulis, video, pencarian, halaman statis, indeks tools, GSAP beranda) ditulis setelah 4A selesai dieksekusi. Rinciannya di bagian "Cakupan yang ditunda".

## Dependensi baru (butuh persetujuan pemilik)

Rencana ini menambah dua devDependency. **Jangan mulai Task 1 sebelum pemilik menyetujui keduanya.** Bila pemilik memilih alternatif, langkah yang terdampak disebut di kolom terakhir.

| Paket | Versi persis | Alasan | Alternatif tanpa dependensi |
|---|---|---|---|
| `@fontsource-variable/archivo` | 5.3.0 (devDependency, lisensi font OFL 1.1) | Spesifikasi §4 dan §12: Archivo variable (sumbu `wdth` dan `wght`), di-host sendiri, subset Latin, satu file. Paket ini berisi `archivo-latin-standard-normal.woff2` (90 KB, kedua sumbu, subset Latin) yang dibaca `next/font/local` saat build; tidak ada kode yang ikut ke browser. | Unduh file yang sama sekali (`npm pack @fontsource-variable/archivo@5.3.0`, ambil `package/files/archivo-latin-standard-normal.woff2`), commit ke `src/app/(frontend)/fonts/`, lalu ganti `src` di `src/app/(frontend)/font.ts` (Task 1) menjadi `./fonts/archivo-latin-standard-normal.woff2`. Hasil tampilan sama; pembaruan font menjadi manual. |
| `@axe-core/playwright` | 4.14.0 (devDependency, memakai `axe-core` 4.14.0 yang sudah ada di lockfile lewat `eslint-plugin-jsx-a11y`) | Spesifikasi §16: axe untuk aksesibilitas, dijalankan di setiap halaman E2E pada 375, 768, dan 1440 px dengan aturan WCAG 2.2 AA. | Tanpa paket ini, `periksaAxe` di `tests/e2e/bantu.ts` (Task 3) harus menyuntik `axe-core` sendiri lewat `page.addScriptTag`, dan itu tetap butuh `axe-core` sebagai dependensi langsung. Tanpa axe sama sekali, aksesibilitas hanya dicek tes peran ARIA di E2E dan review manual. |

Yang sengaja **tidak** ditambah: `lucide-react` (ikon Lucide disalin sebagai path SVG di satu komponen server, lihat Task 2), `gsap` (hanya untuk reveal judul beranda dan angka kalkulator, jadi masuk Rencana 4B dan 5), Tailwind (tidak perlu, lihat Keputusan teknis), `hls.js` (video memakai sumber HLS + MP4 bawaan browser).

## Global Constraints

- Node `^22.23.4 || >=24.22.1`, pnpm 10. Versi dikunci: Next `16.3.3`, Payload `3.92.1`, `@playwright/test` `1.63.0`. Dependensi baru hanya dua paket di atas, dipasang dengan `--save-exact`.
- Nama domain berbahasa Indonesia seperti rencana sebelumnya (`muatArtikel`, `susunHeader`, `tanganiTidakAda`, `KotakIntinya`, `RemahRoti`, token `--teks`, `--permukaan`, `--ruang-4`). Nama teknis framework dan ikon Lucide tetap bahasa Inggris.
- Copy UI dan pesan: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru. CTA menyebut hasilnya ("Hitung Gaji Bersih", "Kembali ke beranda").
- Path publik selalu lewat `pathFor()` (`src/lib/paths.ts`) atau `PATH_INDEKS` (Task 7); URL media lewat `src/modules/media` (`propsGambar`, `bangunUrl`); SEO lewat `src/modules/seo` (`metadata`, `jsonLd`, `remahRoti`, `metadataTidakDitemukan` dari Task 8). Tidak ada `<title>`, canonical, robots, atau JSON-LD manual di halaman.
- Warna sesuai spesifikasi §4 dan dikunci tes: `ink #111111`, `paper #FFFFFF`, `sand #F4F1EC`, `muted #5C5852`, pilar `#1F7A4D`, `#C2410C`, `#F2C230`, `#FF8A80`. Kuning dan koral tidak dipakai sebagai warna teks di latar terang; warna pilar selalu didampingi nama pilar. Dilarang: gradien biru-ungu, teks gradien, efek kaca, glow.
- Tipografi: Archivo variable satu file, `font-display: swap`, di-preload. Display `clamp(72px, 14vw, 196px)` 900 wdth 68; H1 `clamp(34px, 4.4vw, 58px)` 900 wdth 80; body 18px (minimal 16px di HP), leading 1,6, lebar baris 68ch; label 13px 800 uppercase.
- Radius 14px (kontrol) dan 24px (kartu); target sentuh minimal 44px untuk tautan navigasi; spasi kelipatan 4px; kontainer 1200px, gutter `clamp(16px, 4vw, 40px)`; breakpoint 375 / 768 / 1024 / 1440.
- Motion: kurva `cubic-bezier(0.2, 0, 0, 1)`, durasi 150 / 250 / 400 ms, hanya `transform` dan `opacity`, tanpa animasi yang berjalan terus; `prefers-reduced-motion: reduce` mematikan semua animasi dan View Transitions.
- **Perubahan skema harus aditif.** Rencana ini hanya menambah kolom `disclaimer` (textarea) di `pilar` (Task 4). Setelah itu jalankan `pnpm generate:types`. Bila Payload macet di "Pulling schema from database..." (pertanyaan DATA LOSS), jangan menjawab; reset database yang bersangkutan seperti Rencana 2: `docker compose exec postgres psql -U postgres -c "DROP DATABASE pointlat_test WITH (FORCE)" -c "CREATE DATABASE pointlat_test"` (tanpa Docker: `PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -c ...`).
- **`pnpm build` sekarang membaca database dev** (`pointlat` dari `.env`): layout memuat header dan footer, dan `/`, `/_not-found`, `/glosarium` dirender saat build. Postgres harus jalan, dan setelah Task 4 jalankan `pnpm seed` sekali sebelum build supaya kolom `pilar.disclaimer` terdorong ke database dev (mode produksi tidak mendorong skema).
- Tes tidak memanggil jaringan. Unit dan integrasi memakai `.env.test` (database `pointlat_test`). E2E (mulai Task 3) memakai database `pointlat_test_e2e` (nama database tes ditambah `_e2e`, dibuat otomatis oleh Payload), build produksi di port 3100, kredensial Cloudinary palsu `e2e`, dan semua permintaan gambar ke `res.cloudinary.com` dicegat browser tes.
- E2E menjalankan `next build` sendiri sehingga isi `.next/` diganti build E2E. Setelah E2E, jalankan `pnpm build` lagi sebelum `pnpm start` biasa.
- Server manual untuk uji asap memakai port 3200 dan dihentikan dengan `fuser -k 3200/tcp`. Jangan memakai `pkill -f` dengan pola luas. Menunggu server: `timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'`.
- `next dev` di Next 16.3 menambahkan blok "nextjs-agent-rules" ke `CLAUDE.md` bila mendeteksi agen AI. Kembalikan dengan `git checkout CLAUDE.md` sebelum commit (Task 10 sengaja mengubah `CLAUDE.md`; buang blok itu saja).
- Jalankan `pnpm typecheck` dan `pnpm lint` di setiap task; keduanya harus bersih (lint tanpa error dan tanpa warning baru).

## Keputusan teknis (hasil riset dan probe, dipakai di semua task)

| Topik | Keputusan | Dasar |
|---|---|---|
| Styling | CSS Module bawaan Next + custom properties tiga lapis (primitif, semantik, komponen) di `src/styles/tokens.css`, gaya dasar di `src/styles/dasar.css`. Tanpa Tailwind. Komponen hanya memakai token semantik supaya mode gelap (Fase 2) cukup mengganti lapis semantik. | Tanpa dependensi dan tanpa runtime; spesifikasi §5 menyebut `src/styles/tokens.css`; anggaran JS §12 |
| Font | `next/font/local` dengan `archivo-latin-standard-normal.woff2` (90 KB, `wght` 100-900 dan `wdth` 62-125, subset Latin), `weight: '400 900'`, `font-stretch: 62% 125%`, `display: 'swap'`, cadangan Arial yang diukur ulang (tanpa CLS). Lebar memakai `font-stretch` (bukan `font-variation-settings`) supaya font cadangan ikut menyempit. Hanya satu file normal, jadi `font-synthesis: style` (miring disintesis, tebal dari sumbu). | Spesifikasi §4, §12; dokumentasi `next/font` di `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`; isi paket fontsource 5.3.0 |
| Rendering | ISR: rute dinamis `generateStaticParams() { return [] }`, data di `unstable_cache(fn, key, { tags, revalidate: 3600 })`. Probe membuktikan pada `next start`: respons 200, 308, dan 404 disimpan (`x-nextjs-cache: HIT`), dan `revalidateTag` pada tag `unstable_cache` membuang halaman yang memakainya (`MISS` berikutnya). `revalidate: 3600` jaring pengaman seperti Rencana 3. | Spesifikasi §5 "Rendering"; `caching-without-cache-components.md`, `incremental-static-regeneration.md` |
| Tag halaman | Header: `header` + `pilar`; footer: `footer`; situs: `pengaturan-seo` + `media`; artikel: tag koleksi `artikel`, `pilar`, `subkategori`, `penulis`, `tools`, `video`, `halaman` + `media` (halaman artikel bergantung pada banyak dokumen, invalidasi berlebih murah, halaman basi tidak); glosarium dan tulisan terbaru: `artikel` (+ `pilar`); redirect: `redirect`. Tag baru `header`, `footer`, `media`, `redirect` dengan hook di global Header, Footer dan koleksi Media, Redirect. | Konvensi `TAG` Rencana 3 |
| Rute | Satu catch-all `src/app/(frontend)/[...jalur]/page.tsx` untuk path tingkat atas (artikel di 4A; pilar, halaman, subkategori di 4B) + `glosarium/page.tsx` dan `glosarium/[slug]/page.tsx`. Catch-all dipilih karena Next menolak segmen dinamis bersaudara dengan nama berbeda (`[slug]` dan `[...sisa]`), dan supaya semua path yang tidak dikenal (berapa pun segmennya) tetap melewati pencarian redirect. Rute statis (`/glosarium`, `/sitemap.xml`, `/admin`, `/api`) tetap didahulukan Next. | `dynamic-routes.md`; galat Next "You cannot use different slug names for the same dynamic path" (`shared/lib/router/utils/sorted-routes.js`); build probe mencantumkan `● /[...jalur]` di samping rute statis |
| Redirect | Path tanpa dokumen terbit memanggil `tanganiTidakAda(path)`: redirect dari koleksi `redirect` (cache per path, tag `redirect`) lewat `permanentRedirect()` (status 308), selain itu `notFound()`. Kode 410 menjawab 404. Tidak memakai `proxy.ts` karena proxy jalan di setiap permintaan (termasuk halaman dari cache) dan dokumentasi Next melarang mengandalkan modul atau global bersama di proxy; Google memperlakukan 308 sama dengan 301 dan 404 sama dengan 410. Konsekuensi: `jumlahHit` tidak diisi (respons redirect disimpan cache). | `redirecting.md` (tabel status, "Managing redirects at scale"), `proxy.md`; probe ISR |
| Log 404 | Halaman 404 juga disimpan cache, jadi server tidak merender ulang setiap kunjungan. Komponen klien `Catat404` mengirim `navigator.sendBeacon` ke `POST /api/log-404/catat` (endpoint koleksi `log-404`, tanpa login) setiap kunjungan; isi dirapikan `rapikanLog404` (path situs, tanpa query, maks 300 karakter, tanpa rute sistem; referer hanya URL http(s)). Pemindai tanpa JavaScript tidak tercatat; 404 dari Googlebot tetap terlihat di Search Console. | Spesifikasi §15; probe ISR (`after()` hanya berjalan saat render) |
| Metadata 404 | `metadataTidakDitemukan(situs)` di modul SEO (judul dengan pola situs, tanpa canonical; Next menambah `noindex` untuk status 404). Dipakai `not-found.tsx` dan juga `generateMetadata` halaman saat path tidak ada: probe menunjukkan bila `generateMetadata` mengembalikan `{}`, judul berubah menjadi "point." setelah hidrasi. `tanganiTidakAda` hanya dipanggil di komponen halaman; memanggilnya juga di `generateMetadata` membuat header `Location` terkirim dua kali. | Probe browser; dokumentasi `not-found.md`, `generate-metadata.md` |
| Halaman 404 di Next 16.3.3 | `notFound()` dari halaman (statis, ISR, maupun dinamis) dikirim sebagai cangkang `<html id="__next_error__">` + status 404 + judul + `noindex`, lalu `not-found.tsx` dirender di browser dari data RSC di HTML yang sama. Tidak ada opsi untuk mengubahnya; diterima karena status dan judul sudah benar di HTML awal. Tes axe 404 menunggu layout terpasang (`lang="id"`). | Aplikasi Next 16.3.3 minimal di probe (satu dan dua root layout, `not-found.tsx` di root dan di segmen); sumber `app-render.js` ("For metadata notFound error there's no global not found boundary") |
| Isi artikel | `RichText` dari `@payloadcms/richtext-lexical/react` (sudah terpasang, server component) dengan converter sendiri: heading dengan `id` jangkar dari `tandaiSubjudul` (H1 di isi diturunkan ke H2), tautan internal lewat `pathFor` (dokumen draf menjadi teks), gambar lewat `next/image` + `propsGambar`, blok `callout`, `tabelPerbandingan`, `embedTool`, `embedVideo`, node `relationship` menjadi "Baca juga", node tak dikenal tidak dirender. | Sumber `@payloadcms/richtext-lexical@3.92.1` (`features/converters/lexicalToJSX`) |
| Video di isi | `<video controls preload="none">` dengan sumber HLS (`sp_auto`, untuk Safari dan Chrome Android) lalu MP4 cadangan, poster Cloudinary, transkrip di `<details>`. Tanpa `hls.js`. | Spesifikasi §9; anggaran JS §12 |
| Ikon | Path SVG Lucide 1.68.0 disalin ke `src/components/dasar/Ikon.tsx` (lisensi ISC, sebagian MIT Feather, dicantumkan di file). Ikon dekoratif `aria-hidden`, ikon tanpa teks wajib `label`. | Spesifikasi §4 "Ikon: satu set stroke (Lucide)", §14 |
| Disclaimer | Field baru `pilar.disclaimer` (textarea, bisa diedit di CMS), diisi seed untuk Uang & Karier dan Sehat, tampil otomatis sebagai catatan di akhir isi setiap artikel pilar itu. | Spesifikasi §3 "disclaimer otomatis", kriteria sukses 1 dan 4 |
| Tanggal dan waktu baca | "Diperbarui" = `diperbaruiBesar ?? terbitPada` (sama dengan `dateModified` JSON-LD dan `lastmod` sitemap), format `id-ID` zona `Asia/Jakarta`. Waktu baca = kata isi / 200, dibulatkan ke atas, minimal 1. Daftar isi tampil bila ada minimal 3 H2. | Spesifikasi §4, §8 |
| Motion | View Transitions lewat React `<ViewTransition name share="morph" default="none">` (ada di React canary bawaan Next; tipe dari `react/canary`) untuk judul kartu menjadi H1 artikel, 400 ms kurva khas; kartu di bawah layar masuk sekali (naik 12px + opacity, 200 ms, jeda 40 ms, maks 2 jeda = 280 ms) lewat `IntersectionObserver` di `PemicuMasuk`; hover dan tekan memakai `transform` 150 ms. Reduced motion: CSS mematikan transisi dan animasi pseudo-element View Transitions, `PemicuMasuk` tidak menyembunyikan apa pun. GSAP tidak dipakai di 4A. | Spesifikasi §13; `view-transitions.md` Next 16 |
| Anggaran JS | Diukur di probe (byte gzip yang diunduh, tanpa polyfill `noModule`): halaman kosong 139,5 KB (react-dom 70 KB, router Next 42 KB), artikel 145,4 KB. Batas 70 KB di spesifikasi §12 tidak tercapai oleh kerangka Next 16 + React 19 saja. E2E menjaga artikel di bawah 160 KiB supaya JS milik point. tetap kecil; angka final diputuskan pemilik (lihat Risiko). | Probe `next start` |
| E2E | Playwright di build produksi: `webServer` menjalankan `tests/e2e/siapkan.ts` (hapus dan isi ulang konten contoh di database `_e2e`), menghapus `.next/cache/fetch-cache`, `pnpm build`, lalu `pnpm start` di port 3100. Server memakai kredensial Cloudinary palsu `e2e` sehingga pengaman produksi Rencana 2 (`klienMedia()` melempar galat di produksi tanpa `CLOUDINARY_*`) tetap utuh; server hanya membangun URL, tidak pernah memanggil Cloudinary. Skrip pengisi memakai `pakaiKlien(klienPalsu('e2e'))`. Browser tes mencegat `res.cloudinary.com` dan menjawab SVG. | Spesifikasi §16; `src/modules/media/index.ts` |
| Halaman tanpa kredensial | `ambilSitus()` dan URL media butuh `cloudName`, dan `next start` tanpa `CLOUDINARY_*` sengaja menolak jalan (Rencana 2). Keputusan: perlindungan itu tidak diubah. Lokal memakai `pnpm dev` (klien palsu otomatis) atau, untuk build produksi lokal dan E2E, kredensial palsu yang jelas (`e2e`); produksi wajib kredensial asli. | Rencana 2 Task 3, Rencana 3 Risiko |

## Struktur file setelah rencana ini

```
src/styles/tokens.css, dasar.css           token tiga lapis, gaya dasar, fokus, skip link, motion, reduced motion
src/types/react-canary.d.ts                tipe ViewTransition dari React canary bawaan Next
src/app/(frontend)/
  font.ts                                  Archivo lewat next/font/local
  layout.tsx                               lang id, skip link, Header, main#isi, Footer, PemicuMasuk
  icon.svg                                 ikon situs (titik)
  page.tsx, page.module.css                beranda sementara (Rencana 4B)
  [...jalur]/page.tsx                      artikel /{slug} (pilar, halaman, subkategori di 4B), redirect, 404
  glosarium/page.tsx, glosarium/[slug]/page.tsx
  not-found.tsx                            404 dengan tulisan terbaru dan beacon log
src/components/
  dasar/        Ikon, Logo, Tautan, ChipPilar, RemahRoti, JsonLd (+ CSS Module)
  tata-letak/   Header, Footer
  isi/          IsiArtikel (converter Lexical), GambarIsi, Callout, TabelPerbandingan, KartuTool, VideoSemat
  artikel/      HalamanArtikel, KotakIntinya, DaftarIsi, BlokSumber, Faq, Catatan, ProfilPenulis
  kartu/        KartuArtikel, DaftarKartu
  glosarium/    IndeksGlosarium
  galat/        TidakDitemukan, Catat404 (klien)
  motion/       JudulBersama, PemicuMasuk (klien)
src/modules/konten/
  tipe.ts       tipe tampilan (DataHeader, DataArtikel, KartuArtikel, KelompokIstilah, ...)
  tampilan.ts   susunHeader, susunFooter, tautanInternal
  artikel.ts    tandaiSubjudul, waktuBaca, tanggalIndonesia, pilarRingkas, mediaTampil, susunArtikel, gabungTerkait
  isi.ts        hrefDokumen, paragrafTeks
  glosarium.ts  kelompokkanIstilah
  redirect.ts   pathDariSegmen, tujuanRedirect
  log404.ts     rapikanLog404, catat404
  data.ts       ambilHeader, ambilFooter, ambilArtikel, ambilGlosarium, cariRedirect, ambilTerbaru
  cache.ts      muatHeader, muatFooter, muatSitus, muatArtikel, muatGlosarium, muatRedirect, muatTerbaru
  navigasi.ts   tanganiTidakAda
  endpoint.ts   POST /api/log-404/catat
  index.ts
src/collections/Pilar.ts (+ disclaimer), Media.ts (+ revalidasi media), Redirect.ts (+ revalidasi redirect), Log404.ts (+ endpoint)
src/globals/Header.ts, Footer.ts (+ revalidasi)
src/lib/tag.ts (+ header, footer, media, redirect, koleksi), src/lib/paths.ts (+ PATH_INDEKS)
src/modules/seo/metadata.ts (+ metadataTidakDitemukan), src/modules/seo/data.ts (+ /glosarium di sitemap halaman)
playwright.config.ts, tests/e2e/{data,bantu,siapkan}.ts, tests/e2e/*.spec.ts
tests/unit/*.test.ts, tests/int/*.int.spec.ts (baru dan diperluas)
```

## Jumlah tes yang diharapkan

| Setelah task | Unit (file) | Integrasi (file) | E2E |
|---|---|---|---|
| Baseline Rencana 3 | 203 (27) | 49 (13) | belum ada |
| 1 Token dan font | 211 (28) | 49 (13) | belum ada |
| 2 Header, footer, data tampilan | 221 (30) | 51 (14) | belum ada |
| 3 Playwright dan axe | 221 (30) | 51 (14) | 6 |
| 4 Data artikel dan disclaimer | 228 (31) | 54 (15) | 6 |
| 5 Render isi Lexical | 235 (32) | 54 (15) | 6 |
| 6 Halaman artikel | 239 (33) | 54 (15) | 15 |
| 7 Glosarium | 242 (34) | 56 (16) | 20 |
| 8 Redirect dan 404 | 248 (35) | 60 (17) | 26 |
| 9 Motion dan anggaran JS | 248 (35) | 60 (17) | 30 |
| 10 CLAUDE.md dan pemeriksaan akhir | 248 (35) | 60 (17) | 30 |

---

### Task 1: Token desain, font Archivo variable, dan gaya dasar

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/dasar.css`, `src/app/(frontend)/font.ts`, `src/app/(frontend)/page.module.css`
- Modify: `src/app/(frontend)/layout.tsx`, `src/app/(frontend)/page.tsx`, `package.json`, `pnpm-lock.yaml`
- Delete: `src/app/(frontend)/styles.css`
- Test: `tests/unit/token.test.ts`

**Interfaces:**
- Consumes: `WARNA_PILAR` (`src/lib/konstanta.ts`, Rencana 1).
- Produces:
  - Token CSS di `:root` (`src/styles/tokens.css`). Primitif: `--ink`, `--paper`, `--sand`, `--muted`, `--pilar-uang|tekno|belajar|sehat` dan versi `-lembut`. Semantik: `--latar`, `--permukaan`, `--teks`, `--teks-sekunder`, `--garis`, `--tombol`, `--tombol-teks`, `--fokus`. Tipografi: `--font-sans`, `--teks-display|h1|h2|h3|deck|isi|kecil|label`, `--lebar-display|h1|h2|h3|logo` (nilai `font-stretch`), `--tinggi-display|h1|judul|isi`, `--jarak-label`, `--baris-isi`. Spasi `--ruang-1` sampai `--ruang-16`. Bentuk `--radius-kontrol|kartu|pil`, `--garis-tebal|tipis`, `--sentuh-min`, `--fokus-tebal|jarak`. Tata letak `--lebar-kontainer`, `--gutter`. Motion `--kurva`, `--kurva-keluar`, `--durasi-cepat|sedang|halaman`, `--jeda-urut`, `--geser-masuk`.
  - Atribut `data-warna="hijau|oranye|kuning|koral"` (nilai field `warna` pilar) mengisi `--pilar`, `--pilar-lembut`, `--pilar-teks` untuk elemen itu dan anaknya.
  - Kelas global di `dasar.css`: `.kontainer` (lebar maks 1200px + gutter), `.lewati` (skip link), `.sr` (hanya pembaca layar).
  - `src/app/(frontend)/font.ts`: `archivo` (`next/font/local`, `archivo.variable` mengisi `--font-archivo`).

Token adalah kontrak design system: semua komponen berikutnya hanya memakai token semantik. Tes membaca `tokens.css` dan mengunci nilai primitif ke spesifikasi §4 (termasuk tabel kontras terukur yang dihitung ulang dengan rumus WCAG), mencocokkan warna pilar CSS dengan pilihan warna di CMS (`WARNA_PILAR`), dan memastikan teks ink serta muted di latar pilar lembut lolos 4,5:1. Versi lembut dibuat 16% warna pilar di atas putih: `#DBEAE3` (ink 15,19:1), `#F5E1D8` (14,97:1), `#FDF5DE` (17,35:1), `#FFECEB` (16,59:1).

Font dibaca dari paket fontsource oleh `next/font/local` saat build: Next menyalin file ke `/_next/static/media`, menulis `@font-face` (dengan `font-stretch: 62% 125%` lewat `declarations`), menambahkan `<link rel="preload" as="font">`, dan membuat font cadangan Arial berukuran sama. Tidak ada request ke Google Fonts.

`styles.css` sementara dari Rencana 1 diganti `tokens.css` + `dasar.css`; beranda sementara dipertahankan (beranda sebenarnya di Rencana 4B) dan memakai CSS Module.

- [ ] **Langkah 1: Pasang paket font (setelah disetujui pemilik)**

  Jalankan:

  ```bash
  pnpm add -D --save-exact @fontsource-variable/archivo@5.3.0
  ls node_modules/@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2
  ```

  Hasil yang diharapkan: `package.json` mendapat `"@fontsource-variable/archivo": "5.3.0"` di `devDependencies`, lockfile bertambah satu paket, dan file `.woff2` ada.

- [ ] **Langkah 2: Tulis tes yang gagal**

  `tests/unit/token.test.ts`

  ```ts
  import { readFileSync } from 'fs'
  import path from 'path'
  import { describe, expect, it } from 'vitest'

  import { WARNA_PILAR } from '@/lib/konstanta'

  /** Token `--nama: nilai;` di blok `:root` tokens.css. */
  function bacaToken(): Record<string, string> {
    const css = readFileSync(path.resolve('src/styles/tokens.css'), 'utf8')
    const root = /:root\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? ''
    return Object.fromEntries([...root.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
  }

  /** Rasio kontras WCAG 2.x antara dua warna hex. */
  function kontras(a: string, b: string): number {
    const luminans = (hex: string) => {
      const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      const f = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl)
    }
    const [terang, gelap] = [luminans(a), luminans(b)].sort((x, y) => y - x)
    return (terang + 0.05) / (gelap + 0.05)
  }

  const token = bacaToken()
  const t = (nama: string) => token[nama]?.toLowerCase()

  describe('token warna', () => {
    it('nilai primitif sama dengan spesifikasi §4', () => {
      expect([t('ink'), t('paper'), t('sand'), t('muted')]).toEqual(['#111111', '#ffffff', '#f4f1ec', '#5c5852'])
      expect([t('pilar-uang'), t('pilar-tekno'), t('pilar-belajar'), t('pilar-sehat')]).toEqual([
        '#1f7a4d',
        '#c2410c',
        '#f2c230',
        '#ff8a80',
      ])
    })

    it('warna pilar di CSS sama dengan pilihan warna di CMS', () => {
      const peta = { hijau: 'pilar-uang', oranye: 'pilar-tekno', kuning: 'pilar-belajar', koral: 'pilar-sehat' } as const
      for (const [warna, nama] of Object.entries(peta)) {
        expect(t(nama)).toBe(WARNA_PILAR[warna as keyof typeof peta].hex.toLowerCase())
      }
    })

    it('kontras terukur sama dengan tabel spesifikasi', () => {
      const r = (a: string, b: string) => Math.round(kontras(t(a), t(b)) * 100) / 100
      expect(r('ink', 'paper')).toBe(18.88)
      expect(r('ink', 'sand')).toBe(16.76)
      expect(r('muted', 'paper')).toBe(7.06)
      expect(r('muted', 'sand')).toBe(6.27)
      expect(r('paper', 'pilar-uang')).toBe(5.32)
      expect(r('paper', 'pilar-tekno')).toBe(5.18)
      expect(r('ink', 'pilar-belajar')).toBe(11.27)
      expect(r('ink', 'pilar-sehat')).toBe(8.27)
      expect(r('pilar-uang', 'sand')).toBe(4.72)
    })

    it('teks ink dan muted di latar pilar lembut lolos AA (4,5:1)', () => {
      for (const pilar of ['uang', 'tekno', 'belajar', 'sehat']) {
        const latar = t(`pilar-${pilar}-lembut`)
        expect(kontras(t('ink'), latar)).toBeGreaterThanOrEqual(4.5)
        expect(kontras(t('muted'), latar)).toBeGreaterThanOrEqual(4.5)
      }
    })
  })

  describe('token tipografi, bentuk, dan motion', () => {
    it('skala judul dan isi sesuai spesifikasi §4', () => {
      expect(token['teks-display']).toBe('clamp(72px, 14vw, 196px)')
      expect(token['teks-h1']).toBe('clamp(34px, 4.4vw, 58px)')
      expect(token['teks-label']).toBe('13px')
      expect(token['tinggi-isi']).toBe('1.6')
      expect([token['lebar-display'], token['lebar-h1']]).toEqual(['68%', '80%'])
    })

    it('radius, target sentuh, kontainer, dan gutter', () => {
      expect([token['radius-kontrol'], token['radius-kartu']]).toEqual(['14px', '24px'])
      expect(token['sentuh-min']).toBe('44px')
      expect(token['lebar-kontainer']).toBe('1200px')
      expect(token['gutter']).toBe('clamp(16px, 4vw, 40px)')
    })

    it('spasi kelipatan 4px', () => {
      const spasi = Object.entries(token).filter(([nama]) => nama.startsWith('ruang-'))
      expect(spasi.length).toBeGreaterThan(5)
      for (const [, nilai] of spasi) expect(parseInt(nilai, 10) % 4).toBe(0)
    })

    it('kurva dan durasi motion sesuai spesifikasi §13', () => {
      expect(token['kurva']).toBe('cubic-bezier(0.2, 0, 0, 1)')
      expect(token['kurva-keluar']).toBe('cubic-bezier(0.3, 0, 1, 1)')
      expect([token['durasi-cepat'], token['durasi-sedang'], token['durasi-halaman']]).toEqual(['150ms', '250ms', '400ms'])
      expect([token['jeda-urut'], token['geser-masuk']]).toEqual(['40ms', '12px'])
    })
  })
  ```

- [ ] **Langkah 3: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm vitest run --config ./vitest.unit.config.mts tests/unit/token.test.ts
  ```

  Hasil yang diharapkan: FAIL dengan `ENOENT: no such file or directory, open '.../src/styles/tokens.css'`.

- [ ] **Langkah 4: Tulis token dan gaya dasar**

  `src/styles/tokens.css`

  ```css
  /*
   * Token desain point. (spesifikasi §4 "Kartu Intinya", §13 Motion).
   *
   * Tiga lapis: primitif (nilai mentah dari spesifikasi), semantik (peran di UI), dan komponen
   * (dipakai di CSS Module). Komponen hanya memakai token semantik supaya mode gelap (Fase 2) cukup
   * mengganti lapis semantik. Nilai primitif dikunci `tests/unit/token.test.ts`.
   *
   * Breakpoint (tidak bisa jadi custom property di media query): 48rem (768px), 64rem (1024px),
   * 90rem (1440px). Desain dasar untuk 375px.
   */
  :root {
    /* Primitif: warna */
    --ink: #111111;
    --paper: #ffffff;
    --sand: #f4f1ec;
    --muted: #5c5852;
    --pilar-uang: #1f7a4d;
    --pilar-tekno: #c2410c;
    --pilar-belajar: #f2c230;
    --pilar-sehat: #ff8a80;
    /* Versi lembut (16% warna pilar di atas putih) untuk latar kotak Intinya. Teks di atasnya ink. */
    --pilar-uang-lembut: #dbeae3;
    --pilar-tekno-lembut: #f5e1d8;
    --pilar-belajar-lembut: #fdf5de;
    --pilar-sehat-lembut: #ffeceb;

    /* Semantik: warna */
    --latar: var(--paper);
    --permukaan: var(--sand);
    --teks: var(--ink);
    --teks-sekunder: var(--muted);
    --garis: var(--ink);
    --tombol: var(--ink);
    --tombol-teks: var(--paper);
    --fokus: var(--ink);

    /* Tipografi: satu keluarga variable (Archivo, sumbu wdth dan wght), di-host sendiri */
    --font-sans: var(--font-archivo), system-ui, sans-serif;
    --teks-display: clamp(72px, 14vw, 196px);
    --teks-h1: clamp(34px, 4.4vw, 58px);
    --teks-h2: clamp(28px, 2.4vw, 34px);
    --teks-h3: 22px;
    --teks-deck: clamp(19px, 1.6vw, 22px);
    --teks-isi: clamp(16px, 15.2px + 0.4vw, 18px);
    --teks-kecil: 15px;
    --teks-label: 13px;
    --lebar-display: 68%;
    --lebar-h1: 80%;
    --lebar-h2: 82%;
    --lebar-h3: 90%;
    --lebar-logo: 75%;
    --tinggi-display: 0.86;
    --tinggi-h1: 0.98;
    --tinggi-judul: 1.05;
    --tinggi-isi: 1.6;
    --jarak-label: 0.04em;
    --baris-isi: 68ch;

    /* Spasi: kelipatan 4px */
    --ruang-1: 4px;
    --ruang-2: 8px;
    --ruang-3: 12px;
    --ruang-4: 16px;
    --ruang-5: 20px;
    --ruang-6: 24px;
    --ruang-8: 32px;
    --ruang-10: 40px;
    --ruang-12: 48px;
    --ruang-14: 56px;
    --ruang-16: 64px;

    /* Bentuk */
    --radius-kontrol: 14px;
    --radius-kartu: 24px;
    --radius-pil: 999px;
    --garis-tebal: 2px;
    --garis-tipis: 1.5px;
    --sentuh-min: 44px;
    --fokus-tebal: 2px;
    --fokus-jarak: 2px;

    /* Tata letak */
    --lebar-kontainer: 1200px;
    --gutter: clamp(16px, 4vw, 40px);

    /* Motion: hanya transform dan opacity, tanpa animasi yang berjalan terus */
    --kurva: cubic-bezier(0.2, 0, 0, 1);
    --kurva-keluar: cubic-bezier(0.3, 0, 1, 1);
    --durasi-cepat: 150ms;
    --durasi-sedang: 250ms;
    --durasi-halaman: 400ms;
    --jeda-urut: 40ms;
    --geser-masuk: 12px;
  }

  /* Warna pilar per dokumen: komponen memberi `data-warna` dari field `warna` pilar di CMS. */
  [data-warna='hijau'] {
    --pilar: var(--pilar-uang);
    --pilar-lembut: var(--pilar-uang-lembut);
    --pilar-teks: var(--paper);
  }

  [data-warna='oranye'] {
    --pilar: var(--pilar-tekno);
    --pilar-lembut: var(--pilar-tekno-lembut);
    --pilar-teks: var(--paper);
  }

  [data-warna='kuning'] {
    --pilar: var(--pilar-belajar);
    --pilar-lembut: var(--pilar-belajar-lembut);
    --pilar-teks: var(--ink);
  }

  [data-warna='koral'] {
    --pilar: var(--pilar-sehat);
    --pilar-lembut: var(--pilar-sehat-lembut);
    --pilar-teks: var(--ink);
  }
  ```

  `src/styles/dasar.css`

  ```css
  /*
   * Gaya dasar situs publik: reset ringan, elemen HTML, fokus, skip link, kontainer, dan reduced
   * motion. Gaya komponen ada di CSS Module masing-masing. Dilarang: gradien biru-ungu, teks
   * gradien, efek kaca, glow (spesifikasi §4).
   */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  body {
    margin: 0;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    background: var(--latar);
    color: var(--teks);
    font-family: var(--font-sans);
    font-size: var(--teks-isi);
    font-weight: 400;
    line-height: var(--tinggi-isi);
    /* Satu file font tanpa versi italic (§12): miring boleh disintesis, tebal sudah dari sumbu wght. */
    font-synthesis: style;
    -webkit-font-smoothing: antialiased;
  }

  main {
    flex: 1 0 auto;
  }

  img,
  svg,
  video {
    display: block;
    max-width: 100%;
  }

  img,
  video {
    height: auto;
  }

  a {
    color: inherit;
    text-decoration-thickness: var(--garis-tipis);
    text-underline-offset: 0.18em;
  }

  h1,
  h2,
  h3,
  h4 {
    margin: 0;
    font-weight: 900;
    line-height: var(--tinggi-judul);
    text-wrap: balance;
  }

  p,
  ul,
  ol,
  figure,
  blockquote {
    margin: 0;
  }

  p {
    text-wrap: pretty;
  }

  button,
  input,
  select,
  textarea {
    font: inherit;
    color: inherit;
  }

  /* Fokus selalu terlihat: ring 2px ink dengan jarak (spesifikasi §14). */
  :focus-visible {
    outline: var(--fokus-tebal) solid var(--fokus);
    outline-offset: var(--fokus-jarak);
  }

  /* Skip link: tersembunyi sampai mendapat fokus keyboard. */
  .lewati {
    position: absolute;
    top: var(--ruang-2);
    left: var(--ruang-2);
    z-index: 10;
    padding: var(--ruang-3) var(--ruang-4);
    border-radius: var(--radius-kontrol);
    background: var(--tombol);
    color: var(--tombol-teks);
    font-weight: 700;
    text-decoration: none;
    transform: translateY(-200%);
  }

  .lewati:focus-visible {
    transform: none;
    outline-color: var(--tombol);
  }

  /* Teks hanya untuk pembaca layar. */
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }

  .kontainer {
    width: 100%;
    max-width: var(--lebar-kontainer);
    margin-inline: auto;
    padding-inline: var(--gutter);
  }

  /* Reduced motion mematikan semua animasi dan View Transitions; konten tetap utuh (spesifikasi §13). */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      transition-delay: 0ms !important;
    }

    ::view-transition-group(*),
    ::view-transition-old(*),
    ::view-transition-new(*) {
      animation: none !important;
    }
  }
  ```

- [ ] **Langkah 5: Font, layout, dan beranda sementara**

  `src/app/(frontend)/font.ts`

  ```ts
  import localFont from 'next/font/local'

  /**
   * Archivo variable (sumbu `wdth` 62-125 dan `wght`), satu file subset Latin dari paket
   * `@fontsource-variable/archivo` (lisensi OFL). `next/font` menyalinnya ke `/_next/static/media`,
   * membuat `@font-face` dengan `font-display: swap`, mem-preload file itu, dan membuat font cadangan
   * berukuran sama supaya tidak ada CLS saat font selesai dimuat (spesifikasi §4, §12).
   */
  export const archivo = localFont({
    src: '../../../node_modules/@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2',
    variable: '--font-archivo',
    weight: '400 900',
    style: 'normal',
    display: 'swap',
    declarations: [{ prop: 'font-stretch', value: '62% 125%' }],
    adjustFontFallback: 'Arial',
  })
  ```

  Ganti seluruh isi `src/app/(frontend)/layout.tsx`:

  `src/app/(frontend)/layout.tsx`

  ```tsx
  import type { Metadata } from 'next'
  import React from 'react'

  import '@/styles/tokens.css'
  import '@/styles/dasar.css'

  import { archivo } from './font'

  export const metadata: Metadata = {
    title: 'point.',
    description: 'Intinya dulu.',
  }

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="id" className={archivo.variable}>
        <body>
          <main id="isi">{children}</main>
        </body>
      </html>
    )
  }
  ```

  `src/app/(frontend)/page.module.css`

  ```css
  .sementara {
    padding-block: var(--ruang-16);
  }

  .judul {
    font-size: var(--teks-display);
    font-stretch: var(--lebar-display);
    line-height: var(--tinggi-display);
    letter-spacing: -0.035em;
    text-transform: uppercase;
  }

  .teks {
    margin-top: var(--ruang-6);
    max-width: 34ch;
    font-size: var(--teks-deck);
  }
  ```

  Ganti seluruh isi `src/app/(frontend)/page.tsx`:

  `src/app/(frontend)/page.tsx`

  ```tsx
  import gaya from './page.module.css'

  /** Beranda sementara. Blok beranda dari global `beranda` dibangun di Rencana 4B. */
  export default function BerandaSementara() {
    return (
      <section className={`kontainer ${gaya.sementara}`}>
        <h1 className={gaya.judul}>Intinya dulu.</h1>
        <p className={gaya.teks}>Situs sedang dibangun.</p>
      </section>
    )
  }
  ```

  Hapus gaya lama:

  ```bash
  git rm "src/app/(frontend)/styles.css"
  ```

- [ ] **Langkah 6: Jalankan tes, type check, lint, build**

  Jalankan:

  ```bash
  pnpm test:unit
  pnpm typecheck
  pnpm lint
  pnpm build
  ```

  Hasil yang diharapkan: unit `Test Files 28 passed (28)`, `Tests 211 passed (211)`; type check dan lint bersih; build berhasil dan `ls .next/static/media | grep archivo` menampilkan satu file `archivo_latin_standard_normal-*.woff2`.

- [ ] **Langkah 7: Commit**

  ```bash
  git add package.json pnpm-lock.yaml src/styles "src/app/(frontend)/font.ts" "src/app/(frontend)/layout.tsx" "src/app/(frontend)/page.tsx" "src/app/(frontend)/page.module.css" tests/unit/token.test.ts
  git commit -m "feat(ui): token desain, font Archivo variable, dan gaya dasar"
  ```

### Task 2: Header, footer, skip link, dan data tampilan bertag cache

**Files:**
- Create: `src/modules/konten/tipe.ts`, `src/modules/konten/tampilan.ts`, `src/modules/konten/data.ts`, `src/modules/konten/cache.ts`, `src/modules/konten/index.ts`, `src/components/dasar/Ikon.tsx`, `src/components/dasar/Logo.tsx`, `src/components/dasar/Logo.module.css`, `src/components/dasar/Tautan.tsx`, `src/components/tata-letak/Header.tsx`, `src/components/tata-letak/Header.module.css`, `src/components/tata-letak/Footer.tsx`, `src/components/tata-letak/Footer.module.css`, `src/app/(frontend)/icon.svg`
- Modify: `src/lib/tag.ts`, `src/hooks/revalidasiPublik.ts`, `src/globals/Header.ts`, `src/globals/Footer.ts`, `src/app/(frontend)/layout.tsx`, `tests/unit/tag.test.ts`
- Test: `tests/unit/konten-tampilan.test.ts`, `tests/unit/komponen-tata-letak.test.ts`, `tests/int/tampilan.int.spec.ts`

**Interfaces:**
- Consumes: `pathFor` (Rencana 1), `TAG`, `revalidasi()` (Rencana 3), token dan `.kontainer`, `.lewati`, `.sr` (Task 1).
- Produces:
  - `src/lib/tag.ts`: `TAG.header = 'header'`, `TAG.footer = 'footer'`, `TAG.koleksi(koleksi) => koleksi`.
  - `src/hooks/revalidasiPublik.ts`: `revalidasiGlobal(tag: string[]): GlobalAfterChangeHook`, `revalidasiHeader`, `revalidasiFooter` (`revalidasiPengaturanSeo` sekarang dibuat dengan `revalidasiGlobal`).
  - `src/modules/konten/tipe.ts`: `Tautan = { label; href }`, `ItemMenu = Tautan & { warna: WarnaPilar | null }`, `DataHeader = { menu: ItemMenu[]; tools: Tautan }`, `DataFooter = { tautan; sosial: Tautan[]; whatsapp: string | null; hakCipta: string }`.
  - `src/modules/konten/tampilan.ts`: `susunHeader(header): DataHeader`, `susunFooter(footer): DataFooter`, `tautanInternal(href): boolean`, `LABEL_SOSIAL`, `TOOLS_BAWAAN`, `HAK_CIPTA_BAWAAN`.
  - `src/modules/konten/data.ts`: `ambilHeader(payload)`, `ambilFooter(payload)`. `cache.ts`: `muatHeader()` (tag `header` + `pilar`), `muatFooter()` (tag `footer`), revalidasi 3600 detik.
  - Komponen: `Ikon({ nama, label?, ukuran?, className? })` dengan `NamaIkon` = `arrow-right`, `arrow-up-right`, `calculator`, `calendar`, `chevron-right`, `clock`, `info`, `lightbulb`, `play`, `triangle-alert`; `Logo({ ukuran? })`; `Tautan(props <a> + href)` (`next/link` untuk path situs, `<a rel="noopener">` untuk URL luar, atribut lain diteruskan); `Header({ data })`; `Footer({ data })`.
  - Layout: skip link "Langsung ke isi" ke `#isi`, `<main id="isi">`.

Header mengikuti mockup Kartu Intinya: logo `point.`, pill rubrik bergaris dengan titik warna pilar (dekoratif, `aria-hidden`, selalu di samping nama), tombol Tools hitam. Mulai 1024px semuanya satu baris; di bawahnya logo dan Tools di baris pertama dan pill rubrik di baris kedua yang bisa digeser (tanpa membuat halaman bergeser horizontal). Semua tautan navigasi minimal 44px. Footer: logo, tagline "Intinya dulu.", tautan situs, akun sosial, saluran WhatsApp, dan teks hak cipta dari global `footer`.

Data header dan footer dibaca layout di setiap halaman, jadi keduanya di-cache dengan tag sendiri dan global `header`/`footer` sekarang merevalidasi tag itu saat disimpan. Menu header ikut tag `pilar` karena memakai nama, slug, dan warna pilar. Modul `src/modules/konten` adalah pintu data semua halaman publik: komponen hanya menerima tipe tampilan dari `tipe.ts`, tidak membaca relasi Payload mentah.

`Tautan` memakai `next/link` untuk path situs supaya navigasi klien (dan View Transitions di Task 9) bekerja; URL luar tetap `<a>`. Ikon Lucide disalin sebagai path SVG di satu komponen server: tanpa paket ikon dan tanpa JavaScript klien. `icon.svg` (kotak ink dengan titik putih) menjadi ikon situs lewat konvensi file Next.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/konten-tampilan.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { susunFooter, susunHeader, tautanInternal } from '@/modules/konten/tampilan'

  const pilar = (id: number, slug: string | null, warna: 'hijau' | 'kuning') =>
    ({ id, nama: slug ?? 'Tanpa slug', slug, warna, deskripsi: 'Deskripsi.', createdAt: '', updatedAt: '' }) as const

  describe('susunHeader', () => {
    it('item pilar memakai path dan warna pilar; tautan bebas apa adanya', () => {
      const data = susunHeader({
        menu: [
          { label: 'Uang & Karier', jenis: 'pilar', pilar: pilar(1, 'uang-karier', 'hijau') },
          { label: 'Belajar', jenis: 'pilar', pilar: pilar(2, 'belajar', 'kuning') },
          { label: 'Tentang', jenis: 'tautan', url: ' /tentang ' },
        ],
        tombolTools: { label: 'Tools', url: '/tools' },
      })
      expect(data.menu).toEqual([
        { label: 'Uang & Karier', href: '/uang-karier', warna: 'hijau' },
        { label: 'Belajar', href: '/belajar', warna: 'kuning' },
        { label: 'Tentang', href: '/tentang', warna: null },
      ])
      expect(data.tools).toEqual({ label: 'Tools', href: '/tools' })
    })

    it('melewati pilar yang belum di-populate, tanpa slug, atau tautan kosong', () => {
      const data = susunHeader({
        menu: [
          { label: 'ID saja', jenis: 'pilar', pilar: 7 },
          { label: 'Terhapus', jenis: 'pilar', pilar: null },
          { label: 'Tanpa slug', jenis: 'pilar', pilar: pilar(3, null, 'hijau') },
          { label: 'Kosong', jenis: 'tautan', url: '  ' },
        ],
      })
      expect(data.menu).toEqual([])
    })

    it('tombol Tools memakai nilai bawaan bila dikosongkan', () => {
      expect(susunHeader({ tombolTools: { label: '', url: null } }).tools).toEqual({ label: 'Tools', href: '/tools' })
    })
  })

  describe('susunFooter', () => {
    it('tautan, sosial dengan nama platform, saluran WhatsApp, dan hak cipta', () => {
      const data = susunFooter({
        tautan: [
          { label: 'Tentang', url: '/tentang' },
          { label: 'Kosong', url: ' ' },
        ],
        sosial: [
          { platform: 'tiktok', url: 'https://www.tiktok.com/@point.lat' },
          { platform: 'linkedin', url: 'https://www.linkedin.com/company/point-lat' },
        ],
        saluranWhatsApp: 'https://whatsapp.com/channel/abc',
        teksHakCipta: null,
      })
      expect(data).toEqual({
        tautan: [{ label: 'Tentang', href: '/tentang' }],
        sosial: [
          { label: 'TikTok', href: 'https://www.tiktok.com/@point.lat' },
          { label: 'LinkedIn', href: 'https://www.linkedin.com/company/point-lat' },
        ],
        whatsapp: 'https://whatsapp.com/channel/abc',
        hakCipta: '© 2026 point.lat',
      })
    })
  })

  describe('tautanInternal', () => {
    it('hanya path situs yang dianggap internal', () => {
      expect(tautanInternal('/tentang')).toBe(true)
      expect(tautanInternal('//cdn.contoh.com/x')).toBe(false)
      expect(tautanInternal('https://point.lat/tentang')).toBe(false)
    })
  })
  ```

  `tests/unit/komponen-tata-letak.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it } from 'vitest'

  import { Ikon } from '@/components/dasar/Ikon'
  import { Footer } from '@/components/tata-letak/Footer'
  import { Header } from '@/components/tata-letak/Header'

  describe('Ikon', () => {
    it('dekoratif disembunyikan dari pembaca layar; dengan label dibaca sebagai gambar', () => {
      const dekoratif = renderToStaticMarkup(h(Ikon, { nama: 'clock' }))
      expect(dekoratif).toContain('aria-hidden="true"')
      expect(dekoratif).not.toContain('role=')
      const berlabel = renderToStaticMarkup(h(Ikon, { nama: 'info', label: 'Info' }))
      expect(berlabel).toContain('role="img"')
      expect(berlabel).toContain('aria-label="Info"')
    })
  })

  describe('Header', () => {
    it('logo ke beranda, pill rubrik dengan titik warna, dan tombol Tools', () => {
      const html = renderToStaticMarkup(
        h(Header, {
          data: {
            menu: [
              { label: 'Uang & Karier', href: '/uang-karier', warna: 'hijau' },
              { label: 'Tentang', href: '/tentang', warna: null },
            ],
            tools: { label: 'Tools', href: '/tools' },
          },
        }),
      )
      expect(html).toContain('<nav aria-label="Rubrik"')
      expect(html).toMatch(/<a [^>]*href="\/"[^>]*>.*point\..*, ke beranda/)
      expect(html).toMatch(/href="\/uang-karier"[^>]*><span [^>]*data-warna="hijau" aria-hidden="true"><\/span>Uang &amp; Karier/)
      expect(html).toMatch(/href="\/tentang"[^>]*>Tentang<\/a>/)
      expect(html).toMatch(/href="\/tools"[^>]*>Tools<\/a>/)
    })

    it('tanpa menu tidak merender nav kosong', () => {
      const html = renderToStaticMarkup(h(Header, { data: { menu: [], tools: { label: 'Tools', href: '/tools' } } }))
      expect(html).not.toContain('<nav')
    })
  })

  describe('Footer', () => {
    it('tautan situs, sosial, saluran WhatsApp, dan hak cipta', () => {
      const html = renderToStaticMarkup(
        h(Footer, {
          data: {
            tautan: [{ label: 'Tentang', href: '/tentang' }],
            sosial: [{ label: 'Instagram', href: 'https://instagram.com/point.lat' }],
            whatsapp: 'https://whatsapp.com/channel/abc',
            hakCipta: '© 2026 point.lat',
          },
        }),
      )
      expect(html).toContain('<nav aria-label="Tentang point."')
      expect(html).toContain('<a href="https://instagram.com/point.lat" rel="noopener">Instagram</a>')
      expect(html).toContain('<a href="https://whatsapp.com/channel/abc" rel="noopener">Saluran WhatsApp</a>')
      expect(html).toContain('© 2026 point.lat')
    })
  })
  ```

  Tambahkan satu tes di `tests/unit/tag.test.ts`:

  ```diff
  diff --git a/tests/unit/tag.test.ts b/tests/unit/tag.test.ts
  index 5d7d85c..32dcc58 100644
  --- a/tests/unit/tag.test.ts
  +++ b/tests/unit/tag.test.ts
  @@ -9,6 +9,11 @@ describe('TAG', () => {
       expect(TAG.pilar('uang-karier')).toBe('pilar:uang-karier')
       expect([TAG.beranda, TAG.sitemap, TAG.pengaturanSeo]).toEqual(['beranda', 'sitemap', 'pengaturan-seo'])
     })
  +
  +  it('tag tampilan dan tag koleksi untuk data halaman publik', () => {
  +    expect([TAG.header, TAG.footer]).toEqual(['header', 'footer'])
  +    expect(TAG.koleksi('penulis')).toBe('penulis')
  +  })
   })
   
   describe('tagRevalidasi', () => {
  ```

  `tests/int/tampilan.int.spec.ts`

  ```ts
  import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

  import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'
  import { ambilFooter, ambilHeader } from '@/modules/konten/data'

  import { getTestPayload, unik } from './helpers'

  let tag: string[] = []

  describe('data tampilan header dan footer', () => {
    beforeAll(() => {
      pakaiPemicuRevalidasi((t) => tag.push(t))
    })

    afterAll(() => {
      pakaiPemicuRevalidasi(null)
    })

    beforeEach(() => {
      tag = []
    })

    it('menyimpan header merevalidasi tag header; menu pilar membawa path dan warna', async () => {
      const payload = await getTestPayload()
      const pilar = await payload.create({ collection: 'pilar', data: { nama: unik('Belajar'), warna: 'kuning', deskripsi: 'Belajar.' } })
      tag = []
      await payload.updateGlobal({
        slug: 'header',
        data: {
          menu: [
            { label: 'Belajar', jenis: 'pilar', pilar: pilar.id },
            { label: 'Tentang', jenis: 'tautan', url: '/tentang' },
          ],
          tombolTools: { label: 'Tools', url: '/tools' },
        },
      })
      expect(tag).toEqual(['header'])
      const header = await ambilHeader(payload)
      expect(header.menu).toEqual([
        { label: 'Belajar', href: `/${pilar.slug}`, warna: 'kuning' },
        { label: 'Tentang', href: '/tentang', warna: null },
      ])
    })

    it('menyimpan footer merevalidasi tag footer', async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({
        slug: 'footer',
        data: { tautan: [{ label: 'Kontak', url: '/kontak' }], sosial: [{ platform: 'instagram', url: 'https://instagram.com/point.lat' }] },
      })
      expect(tag).toEqual(['footer'])
      const footer = await ambilFooter(payload)
      expect(footer.tautan).toEqual([{ label: 'Kontak', href: '/kontak' }])
      expect(footer.sosial).toEqual([{ label: 'Instagram', href: 'https://instagram.com/point.lat' }])
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm test:unit
  ```

  Hasil yang diharapkan: FAIL di `konten-tampilan.test.ts` (`Cannot find package '@/modules/konten/tampilan'`), `komponen-tata-letak.test.ts` (`Cannot find package '@/components/dasar/Ikon'`), dan `tag.test.ts` (`expected [ undefined, undefined ] to deeply equal [ 'header', 'footer' ]`).

- [ ] **Langkah 3: Tag dan hook revalidasi global**

  ```diff
  diff --git a/src/lib/tag.ts b/src/lib/tag.ts
  index 8b48871..8d0cb40 100644
  --- a/src/lib/tag.ts
  +++ b/src/lib/tag.ts
  @@ -6,6 +6,7 @@
    * - `{koleksi}:{id}`: satu dokumen (halaman artikel, tools, video, penulis, halaman statis).
    * - `pilar:{slug}`: halaman rubrik `/{pilar}` dan `/{pilar}/{subkategori}`.
    * - `beranda`, `sitemap` (sitemap, news sitemap, RSS), `pengaturan-seo` (robots.txt, metadata situs).
  + * - `header`, `footer`: global tampilan yang dirender layout di setiap halaman publik.
    */
   
   export const KOLEKSI_PUBLIK = ['artikel', 'pilar', 'subkategori', 'penulis', 'tools', 'video', 'halaman'] as const
  @@ -15,6 +16,9 @@ export const TAG = {
     beranda: 'beranda',
     sitemap: 'sitemap',
     pengaturanSeo: 'pengaturan-seo',
  +  header: 'header',
  +  footer: 'footer',
  +  koleksi: (koleksi: KoleksiPublik) => koleksi,
     dokumen: (koleksi: KoleksiPublik, id: number | string) => `${koleksi}:${id}`,
     pilar: (slug: string) => `pilar:${slug}`,
   } as const
  ```

  ```diff
  diff --git a/src/hooks/revalidasiPublik.ts b/src/hooks/revalidasiPublik.ts
  index d3a9b14..b0ba18e 100644
  --- a/src/hooks/revalidasiPublik.ts
  +++ b/src/hooks/revalidasiPublik.ts
  @@ -134,8 +134,17 @@ export function revalidasiPublik(koleksi: KoleksiPublik): {
     return { beforeChange, afterChange, afterDelete }
   }
   
  -/** Pengaturan SEO memengaruhi robots.txt, metadata semua halaman, dan URL absolut di sitemap. */
  -export const revalidasiPengaturanSeo: GlobalAfterChangeHook = ({ doc }) => {
  -  revalidasi([TAG.pengaturanSeo, TAG.sitemap])
  -  return doc
  +/** Hook global: merevalidasi tag tetap setiap kali global disimpan. */
  +export function revalidasiGlobal(tag: string[]): GlobalAfterChangeHook {
  +  return ({ doc }) => {
  +    revalidasi(tag)
  +    return doc
  +  }
   }
  +
  +/** Pengaturan SEO memengaruhi robots.txt, metadata semua halaman, dan URL absolut di sitemap. */
  +export const revalidasiPengaturanSeo = revalidasiGlobal([TAG.pengaturanSeo, TAG.sitemap])
  +
  +/** Header dan footer dirender layout di semua halaman publik. */
  +export const revalidasiHeader = revalidasiGlobal([TAG.header])
  +export const revalidasiFooter = revalidasiGlobal([TAG.footer])
  ```

  ```diff
  diff --git a/src/globals/Header.ts b/src/globals/Header.ts
  index de815cb..4aa5291 100644
  --- a/src/globals/Header.ts
  +++ b/src/globals/Header.ts
  @@ -1,12 +1,14 @@
   import type { GlobalConfig } from 'payload'
   
   import { anyone, isAdmin } from '@/access'
  +import { revalidasiHeader } from '@/hooks/revalidasiPublik'
   
   export const Header: GlobalConfig = {
     slug: 'header',
     label: 'Header',
     admin: { group: 'Tampilan' },
     access: { read: anyone, update: isAdmin },
  +  hooks: { afterChange: [revalidasiHeader] },
     fields: [
       {
         name: 'menu',
  ```

  ```diff
  diff --git a/src/globals/Footer.ts b/src/globals/Footer.ts
  index 3829bbe..fbe6df8 100644
  --- a/src/globals/Footer.ts
  +++ b/src/globals/Footer.ts
  @@ -1,6 +1,7 @@
   import type { GlobalConfig } from 'payload'
   
   import { anyone, isAdmin } from '@/access'
  +import { revalidasiFooter } from '@/hooks/revalidasiPublik'
   import { validasiUrlOpsional } from '@/lib/validasi'
   
   export const Footer: GlobalConfig = {
  @@ -8,6 +9,7 @@ export const Footer: GlobalConfig = {
     label: 'Footer',
     admin: { group: 'Tampilan' },
     access: { read: anyone, update: isAdmin },
  +  hooks: { afterChange: [revalidasiFooter] },
     fields: [
       {
         name: 'tautan',
  ```

- [ ] **Langkah 4: Modul konten (data tampilan)**

  `src/modules/konten/tipe.ts`

  ```ts
  import type { WarnaPilar } from '@/lib/konstanta'

  /**
   * Data tampilan yang sudah siap dirender komponen publik. Komponen tidak membaca dokumen Payload
   * mentah: modul ini yang menerjemahkan relasi, path (`pathFor`), dan nilai bawaan.
   */

  export type Tautan = { label: string; href: string }

  export type ItemMenu = Tautan & { warna: WarnaPilar | null }

  export type DataHeader = { menu: ItemMenu[]; tools: Tautan }

  export type DataFooter = { tautan: Tautan[]; sosial: Tautan[]; whatsapp: string | null; hakCipta: string }
  ```

  `src/modules/konten/tampilan.ts`

  ```ts
  import type { Footer, Header } from '@/payload-types'
  import { pathFor } from '@/lib/paths'

  import type { DataFooter, DataHeader, ItemMenu, Tautan } from './tipe'

  export const TOOLS_BAWAAN: Tautan = { label: 'Tools', href: '/tools' }
  export const HAK_CIPTA_BAWAAN = '© 2026 point.lat'

  /** Nama platform sosial seperti ditulis pemiliknya. */
  export const LABEL_SOSIAL: Record<NonNullable<Footer['sosial']>[number]['platform'], string> = {
    instagram: 'Instagram',
    tiktok: 'TikTok',
    youtube: 'YouTube',
    x: 'X',
    facebook: 'Facebook',
    threads: 'Threads',
    linkedin: 'LinkedIn',
  }

  /**
   * Menu header dari global `header` (depth 1). Item pilar memakai path dan warna pilarnya; item yang
   * relasinya belum di-populate, pilarnya terhapus, atau tautannya kosong dilewati.
   */
  export function susunHeader(header: Pick<Header, 'menu' | 'tombolTools'>): DataHeader {
    const menu: ItemMenu[] = []
    for (const item of header.menu ?? []) {
      if (item.jenis === 'pilar') {
        const pilar = item.pilar && typeof item.pilar === 'object' ? item.pilar : null
        if (pilar?.slug) menu.push({ label: item.label, href: pathFor({ jenis: 'pilar', slug: pilar.slug }), warna: pilar.warna })
      } else if (item.url?.trim()) {
        menu.push({ label: item.label, href: item.url.trim(), warna: null })
      }
    }
    const tools = header.tombolTools
    return {
      menu,
      tools: { label: tools?.label?.trim() || TOOLS_BAWAAN.label, href: tools?.url?.trim() || TOOLS_BAWAAN.href },
    }
  }

  export function susunFooter(footer: Pick<Footer, 'tautan' | 'sosial' | 'saluranWhatsApp' | 'teksHakCipta'>): DataFooter {
    return {
      tautan: (footer.tautan ?? []).filter((t) => t.url?.trim()).map((t) => ({ label: t.label, href: t.url.trim() })),
      sosial: (footer.sosial ?? []).map((s) => ({ label: LABEL_SOSIAL[s.platform], href: s.url })),
      whatsapp: footer.saluranWhatsApp?.trim() || null,
      hakCipta: footer.teksHakCipta?.trim() || HAK_CIPTA_BAWAAN,
    }
  }

  /** Tautan internal (path situs) dirender dengan `next/link`; selain itu `<a>` biasa. */
  export function tautanInternal(href: string): boolean {
    return href.startsWith('/') && !href.startsWith('//')
  }
  ```

  `src/modules/konten/data.ts`

  ```ts
  import type { Payload } from 'payload'

  import { susunFooter, susunHeader } from './tampilan'
  import type { DataFooter, DataHeader } from './tipe'

  /**
   * Query Payload untuk halaman publik. Fungsi di sini menerima `payload` supaya bisa diuji integrasi;
   * halaman memakai versi bertag cache di `cache.ts`.
   */

  export async function ambilHeader(payload: Payload): Promise<DataHeader> {
    const header = await payload.findGlobal({
      slug: 'header',
      depth: 1,
      populate: { pilar: { nama: true, slug: true, warna: true } },
    })
    return susunHeader(header)
  }

  export async function ambilFooter(payload: Payload): Promise<DataFooter> {
    return susunFooter(await payload.findGlobal({ slug: 'footer', depth: 0 }))
  }
  ```

  `src/modules/konten/cache.ts`

  ```ts
  import config from '@payload-config'
  import { unstable_cache } from 'next/cache'
  import { getPayload } from 'payload'

  import { TAG } from '@/lib/tag'

  import { ambilFooter, ambilHeader } from './data'

  /**
   * Data halaman publik yang di-cache dengan tag (spesifikasi §5 "Rendering"). Halaman dirender statis
   * saat pertama diminta (ISR) dan tag cache data ikut tercatat di halaman itu, jadi `revalidateTag`
   * dari hook Payload membuang data dan halamannya sekaligus. `revalidate: 3600` adalah jaring pengaman
   * bila ada perubahan yang tidak memicu hook (sama dengan rute teknis Rencana 3).
   */
  const SEJAM = 3600

  const payload = () => getPayload({ config })

  /** Menu header memakai nama, slug, dan warna pilar, jadi ikut dibuang saat pilar mana pun berubah. */
  export const muatHeader = unstable_cache(async () => ambilHeader(await payload()), ['konten', 'header'], {
    tags: [TAG.header, TAG.koleksi('pilar')],
    revalidate: SEJAM,
  })

  export const muatFooter = unstable_cache(async () => ambilFooter(await payload()), ['konten', 'footer'], {
    tags: [TAG.footer],
    revalidate: SEJAM,
  })
  ```

  `src/modules/konten/index.ts`

  ```ts
  /**
   * Modul konten publik: data siap render untuk halaman situs (Rencana 4).
   *
   * - `muat*()` dipanggil halaman dan layout: query Payload yang di-cache dengan tag `TAG`.
   * - `ambil*(payload)` versi tanpa cache untuk tes integrasi dan skrip.
   * - Fungsi murni (`susunHeader`, `susunFooter`, ...) menerjemahkan dokumen Payload ke tipe di `tipe.ts`.
   */
  export { muatFooter, muatHeader } from './cache'
  export { ambilFooter, ambilHeader } from './data'
  export { HAK_CIPTA_BAWAAN, LABEL_SOSIAL, susunFooter, susunHeader, tautanInternal, TOOLS_BAWAAN } from './tampilan'
  export type * from './tipe'
  ```

- [ ] **Langkah 5: Komponen dasar dan tata letak**

  `src/components/dasar/Ikon.tsx`

  ```tsx
  import type { ReactNode } from 'react'

  /*
   * Ikon stroke dari Lucide 1.68.0 (https://lucide.dev), disalin sebagai path supaya tanpa dependensi
   * dan tanpa JavaScript klien. Lisensi: ISC, Copyright (c) 2026 Lucide Icons and Contributors;
   * arrow-right, arrow-up-right, calendar, chevron-right, clock, dan info berasal dari Feather
   * (MIT, Copyright (c) 2013-present Cole Bemis). Teks lisensi lengkap: paket `lucide-static`.
   */
  const PATH = {
    'arrow-right': (
      <>
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </>
    ),
    'arrow-up-right': (
      <>
        <path d="M7 7h10v10" />
        <path d="M7 17 17 7" />
      </>
    ),
    calculator: (
      <>
        <rect width="16" height="20" x="4" y="2" rx="2" />
        <line x1="8" x2="16" y1="6" y2="6" />
        <line x1="16" x2="16" y1="14" y2="18" />
        <path d="M16 10h.01" />
        <path d="M12 10h.01" />
        <path d="M8 10h.01" />
        <path d="M12 14h.01" />
        <path d="M8 14h.01" />
        <path d="M12 18h.01" />
        <path d="M8 18h.01" />
      </>
    ),
    calendar: (
      <>
        <path d="M8 2v3" />
        <path d="M16 2v3" />
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
      </>
    ),
    'chevron-right': <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </>
    ),
    lightbulb: (
      <>
        <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </>
    ),
    play: <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />,
    'triangle-alert': (
      <>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </>
    ),
  } satisfies Record<string, ReactNode>

  export type NamaIkon = keyof typeof PATH

  /**
   * Ikon dekoratif disembunyikan dari pembaca layar. Ikon yang berdiri sendiri tanpa teks wajib diberi
   * `label` (spesifikasi §14), lalu dibaca sebagai gambar dengan nama itu.
   */
  export function Ikon({ nama, label, ukuran = 20, className }: { nama: NamaIkon; label?: string; ukuran?: number; className?: string }) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={ukuran}
        height={ukuran}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: false })}
      >
        {PATH[nama]}
      </svg>
    )
  }
  ```

  `src/components/dasar/Logo.module.css`

  ```css
  .logo {
    font-weight: 900;
    font-stretch: var(--lebar-logo);
    letter-spacing: -0.03em;
    line-height: 1;
  }

  .besar {
    font-size: 36px;
  }

  .kecil {
    font-size: 30px;
  }
  ```

  `src/components/dasar/Logo.tsx`

  ```tsx
  import gaya from './Logo.module.css'

  /** Tanda `point.`: titik adalah logonya (spesifikasi §3). */
  export function Logo({ ukuran = 'besar' }: { ukuran?: 'besar' | 'kecil' }) {
    return <span className={`${gaya.logo} ${gaya[ukuran]}`}>point.</span>
  }
  ```

  `src/components/dasar/Tautan.tsx`

  ```tsx
  import Link from 'next/link'
  import type { AnchorHTMLAttributes } from 'react'

  import { tautanInternal } from '@/modules/konten/tampilan'

  type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

  /** Path situs lewat `next/link` (navigasi klien dan View Transitions); URL luar lewat `<a>`. */
  export function Tautan({ href, children, ...atribut }: Props) {
    if (tautanInternal(href)) {
      return (
        <Link href={href} {...atribut}>
          {children}
        </Link>
      )
    }
    return (
      <a href={href} rel="noopener" {...atribut}>
        {children}
      </a>
    )
  }
  ```

  `src/components/tata-letak/Header.module.css`

  ```css
  .header {
    border-bottom: var(--garis-tebal) solid var(--garis);
  }

  /* HP dan tablet: logo dan tombol Tools di baris pertama, pill rubrik bisa digeser di baris kedua. */
  .baris {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'logo tools'
      'nav nav';
    align-items: center;
    gap: var(--ruang-3) var(--ruang-4);
    padding-block: var(--ruang-4);
  }

  .logo {
    grid-area: logo;
    justify-self: start;
    display: inline-flex;
    align-items: center;
    min-height: var(--sentuh-min);
    text-decoration: none;
  }

  .nav {
    grid-area: nav;
    min-width: 0;
    margin-inline: calc(var(--gutter) * -1);
    padding-inline: var(--gutter);
    overflow-x: auto;
    scrollbar-width: none;
  }

  .daftar {
    display: flex;
    gap: var(--ruang-2);
    width: max-content;
    padding: var(--ruang-1) 0;
    list-style: none;
  }

  .pil,
  .tools {
    display: inline-flex;
    align-items: center;
    gap: var(--ruang-2);
    min-height: var(--sentuh-min);
    padding: 0 var(--ruang-4);
    border-radius: var(--radius-pil);
    font-size: var(--teks-kecil);
    font-weight: 600;
    line-height: 1;
    white-space: nowrap;
    text-decoration: none;
    transition: transform var(--durasi-cepat) var(--kurva);
  }

  .pil {
    border: var(--garis-tipis) solid var(--garis);
  }

  .titik {
    flex: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--pilar);
    box-shadow: inset 0 0 0 1px var(--garis);
  }

  .tools {
    grid-area: tools;
    padding-inline: 18px;
    background: var(--tombol);
    color: var(--tombol-teks);
    font-weight: 700;
  }

  .pil:hover,
  .tools:hover {
    text-decoration: underline;
  }

  .pil:active,
  .tools:active {
    transform: scale(0.97);
  }

  @media (min-width: 64rem) {
    .baris {
      grid-template-columns: auto 1fr auto;
      grid-template-areas: 'logo nav tools';
      padding-block: var(--ruang-5);
    }

    .nav {
      justify-self: end;
      margin-inline: 0;
      padding-inline: 0;
      overflow: visible;
    }
  }
  ```

  `src/components/tata-letak/Header.tsx`

  ```tsx
  import { Logo } from '@/components/dasar/Logo'
  import { Tautan } from '@/components/dasar/Tautan'
  import type { DataHeader } from '@/modules/konten/tipe'

  import gaya from './Header.module.css'

  /** Header situs: logo, pill rubrik dengan titik warna pilar, dan tombol Tools hitam (spesifikasi §4). */
  export function Header({ data }: { data: DataHeader }) {
    return (
      <header className={gaya.header}>
        <div className={`kontainer ${gaya.baris}`}>
          <Tautan href="/" className={gaya.logo}>
            <Logo />
            <span className="sr">, ke beranda</span>
          </Tautan>
          {data.menu.length > 0 && (
            <nav aria-label="Rubrik" className={gaya.nav}>
              <ul className={gaya.daftar}>
                {data.menu.map((item) => (
                  <li key={item.href}>
                    <Tautan href={item.href} className={gaya.pil}>
                      {item.warna && <span className={gaya.titik} data-warna={item.warna} aria-hidden="true" />}
                      {item.label}
                    </Tautan>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <Tautan href={data.tools.href} className={gaya.tools}>
            {data.tools.label}
          </Tautan>
        </div>
      </header>
    )
  }
  ```

  `src/components/tata-letak/Footer.module.css`

  ```css
  .footer {
    margin-top: var(--ruang-16);
    border-top: var(--garis-tebal) solid var(--garis);
  }

  .isi {
    display: grid;
    gap: var(--ruang-6);
    padding-block: var(--ruang-8) var(--ruang-10);
    font-size: var(--teks-kecil);
  }

  .merek {
    display: grid;
    gap: var(--ruang-1);
  }

  .tagline {
    color: var(--teks-sekunder);
  }

  .daftar {
    display: flex;
    flex-wrap: wrap;
    gap: 0 var(--ruang-5);
    list-style: none;
    padding: 0;
  }

  .daftar a {
    display: inline-flex;
    align-items: center;
    min-height: var(--sentuh-min);
    text-decoration: none;
  }

  .daftar a:hover {
    text-decoration: underline;
  }

  .hakCipta {
    color: var(--teks-sekunder);
  }

  @media (min-width: 64rem) {
    .isi {
      grid-template-columns: auto 1fr auto;
      align-items: start;
      column-gap: var(--ruang-10);
    }

    .tautan {
      justify-self: center;
    }

    .hakCipta {
      grid-column: 1 / -1;
    }
  }
  ```

  `src/components/tata-letak/Footer.tsx`

  ```tsx
  import { Logo } from '@/components/dasar/Logo'
  import { Tautan } from '@/components/dasar/Tautan'
  import type { DataFooter } from '@/modules/konten/tipe'

  import gaya from './Footer.module.css'

  export function Footer({ data }: { data: DataFooter }) {
    const sosial = data.whatsapp ? [...data.sosial, { label: 'Saluran WhatsApp', href: data.whatsapp }] : data.sosial
    return (
      <footer className={gaya.footer}>
        <div className={`kontainer ${gaya.isi}`}>
          <div className={gaya.merek}>
            <Logo ukuran="kecil" />
            <p className={gaya.tagline}>Intinya dulu.</p>
          </div>
          {data.tautan.length > 0 && (
            <nav aria-label="Tentang point." className={gaya.tautan}>
              <ul className={gaya.daftar}>
                {data.tautan.map((t) => (
                  <li key={t.href}>
                    <Tautan href={t.href}>{t.label}</Tautan>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          {sosial.length > 0 && (
            <ul aria-label="Ikuti point." className={gaya.daftar}>
              {sosial.map((s) => (
                <li key={s.href}>
                  <Tautan href={s.href}>{s.label}</Tautan>
                </li>
              ))}
            </ul>
          )}
          <p className={gaya.hakCipta}>{data.hakCipta}</p>
        </div>
      </footer>
    )
  }
  ```

  `src/app/(frontend)/icon.svg`

  ```svg
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#111111"/><circle cx="16" cy="16" r="6" fill="#ffffff"/></svg>
  ```

  Ganti seluruh isi `src/app/(frontend)/layout.tsx`:

  `src/app/(frontend)/layout.tsx`

  ```tsx
  import type { Metadata } from 'next'
  import React from 'react'

  import '@/styles/tokens.css'
  import '@/styles/dasar.css'

  import { Footer } from '@/components/tata-letak/Footer'
  import { Header } from '@/components/tata-letak/Header'
  import { muatFooter, muatHeader } from '@/modules/konten'

  import { archivo } from './font'

  export const metadata: Metadata = {
    title: 'point.',
    description: 'Intinya dulu.',
  }

  export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const [header, footer] = await Promise.all([muatHeader(), muatFooter()])
    return (
      <html lang="id" className={archivo.variable}>
        <body>
          <a className="lewati" href="#isi">
            Langsung ke isi
          </a>
          <Header data={header} />
          <main id="isi">{children}</main>
          <Footer data={footer} />
        </body>
      </html>
    )
  }
  ```

- [ ] **Langkah 6: Jalankan semua tes dan pemeriksaan**

  Jalankan:

  ```bash
  pnpm generate:types && git diff --stat src/payload-types.ts
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  ```

  Hasil yang diharapkan: `payload-types.ts` tidak berubah (hanya hook); type check dan lint bersih; unit `Test Files 30 passed (30)`, `Tests 221 passed (221)`; integrasi `Test Files 14 passed (14)`, `Tests 51 passed (51)`.

- [ ] **Langkah 7: Uji asap tata letak**

  Mulai task ini layout membaca database saat build. Jalankan (database dev `pointlat`, seed mengisi menu header dan tautan footer):

  ```bash
  pnpm seed
  pnpm build
  (PORT=3200 pnpm start > /tmp/point-lat-start.log 2>&1 &)
  timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'
  curl -s http://localhost:3200/ | grep -oE '<html[^>]*>|class="lewati" href="#isi"|<nav aria-label="[^"]*"|<link rel="icon"[^>]*>|<link rel="preload"[^>]*font[^>]*>' 
  fuser -k 3200/tcp
  ```

  Hasil yang diharapkan: `<html lang="id" class="archivo_...variable">`, skip link `class="lewati" href="#isi"`, `<nav aria-label="Rubrik"`, `<nav aria-label="Tentang point."`, satu `<link rel="icon" href="/icon-....svg?..." type="image/svg+xml">`, dan satu preload font `archivo_latin_standard_normal-*.woff2`. Buka http://localhost:3200 di browser (sebelum `fuser -k`) bila ingin melihat: header seperti mockup Kartu Intinya di 1440px, dan di 375px logo + Tools di baris pertama dengan pill rubrik bisa digeser di baris kedua.

- [ ] **Langkah 8: Commit**

  ```bash
  git add src/lib/tag.ts src/hooks/revalidasiPublik.ts src/globals/Header.ts src/globals/Footer.ts src/modules/konten src/components "src/app/(frontend)/layout.tsx" "src/app/(frontend)/icon.svg" tests/unit/tag.test.ts tests/unit/konten-tampilan.test.ts tests/unit/komponen-tata-letak.test.ts tests/int/tampilan.int.spec.ts
  git commit -m "feat(ui): header, footer, skip link, dan data tampilan bertag cache"
  ```

### Task 3: Playwright di build produksi, database E2E, dan axe

**Files:**
- Create: `tests/e2e/data.ts`, `tests/e2e/siapkan.ts`, `tests/e2e/bantu.ts`
- Modify: `playwright.config.ts` (ganti seluruh isi), `package.json` (skrip `test:e2e`), `pnpm-lock.yaml`
- Test: `tests/e2e/tata-letak.spec.ts`

**Interfaces:**
- Consumes: `seed()` (Rencana 1), `pakaiKlien`, `klienPalsu` (Rencana 2), layout Task 2.
- Produces:
  - `pnpm test:e2e` (Playwright, `reporter: 'list'`, satu project Chromium).
  - `tests/e2e/data.ts`: `ADMIN_E2E = { email, password }`, `UKURAN_LAYAR` (375x812, 768x1024, 1440x900). Task 6 menambah slug dan pembuat JSON Lexical.
  - `tests/e2e/bantu.ts`: `cegatCloudinary(page)`, `periksaAxe(page)` (tag `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, pelanggaran harus kosong), `periksaTanpaGeserHorizontal(page)`.
  - `tests/e2e/siapkan.ts`: mengisi database E2E sebelum server dibangun (Task 6 sampai 8 menambah konten contoh).

E2E memakai build produksi supaya ISR, kode status, cache, dan ukuran JavaScript sama dengan yang dilihat pembaca. `webServer` di `playwright.config.ts` menjalankan berurutan: `tests/e2e/siapkan.ts` lewat `payload run` (mode dev, jadi skema terdorong ke database E2E), menghapus `.next/cache/fetch-cache` (cache data `unstable_cache` dari run sebelumnya), `pnpm build`, lalu `pnpm start` di port 3100. Database E2E = `DATABASE_URL` dari `.env.test` dengan nama database ditambah `_e2e` (`pointlat_test_e2e`); Payload membuatnya otomatis bila belum ada, jadi `docker/init-test-db.sql` tidak perlu diubah.

Server E2E memakai kredensial Cloudinary palsu (`e2e`). Pengaman produksi Rencana 2 tetap utuh: tanpa kredensial, `next start` menolak jalan; dengan kredensial palsu, server hanya membangun URL `https://res.cloudinary.com/e2e/...` dan tidak pernah memanggil Cloudinary (tidak ada unggah atau hapus di E2E). Skrip pengisi memaksa klien palsu bernama sama (`pakaiKlien(klienPalsu('e2e'))`), dan browser tes mencegat semua permintaan ke `res.cloudinary.com` lalu menjawab SVG berukuran sama. Tes tidak memanggil jaringan.

Chromium yang dipakai adalah yang sudah terpasang untuk `@playwright/test` 1.63.0. Bila belum ada di mesin, jalankan sekali `pnpm exec playwright install chromium`.

- [ ] **Langkah 1: Pasang axe untuk Playwright (setelah disetujui pemilik)**

  Jalankan:

  ```bash
  pnpm add -D --save-exact @axe-core/playwright@4.14.0
  ```

  Hasil yang diharapkan: `package.json` mendapat `"@axe-core/playwright": "4.14.0"`; lockfile memakai `playwright-core@1.63.0` dan `axe-core@4.14.0` yang sudah ada.

- [ ] **Langkah 2: Konfigurasi dan bantuan E2E**

  Ganti seluruh isi `playwright.config.ts` (bawaan template memakai `pnpm dev` dan reporter HTML):

  `playwright.config.ts`

  ```ts
  import { defineConfig, devices } from '@playwright/test'
  import { config as muatEnv } from 'dotenv'

  /**
   * E2E memakai build produksi (`next build` + `next start`) supaya cache ISR, kode status, dan ukuran
   * JavaScript sama dengan produksi. Database: nama database tes ditambah `_e2e` (dibuat otomatis oleh
   * Payload), diisi ulang `tests/e2e/siapkan.ts` setiap kali server E2E dinyalakan. Cache data Next
   * (`.next/cache/fetch-cache`) dihapus sebelum build supaya data dari run sebelumnya tidak terbawa.
   */
  muatEnv({ path: '.env.test' })

  const PORT = 3100
  const BASE_URL = `http://localhost:${PORT}`

  function urlDatabaseE2E(): string {
    const url = new URL(process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/pointlat_test')
    url.pathname = `${url.pathname}_e2e`
    return url.toString()
  }

  export default defineConfig({
    testDir: './tests/e2e',
    forbidOnly: !!process.env.CI,
    retries: 0,
    reporter: 'list',
    use: {
      baseURL: BASE_URL,
      trace: 'retain-on-failure',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
      command: 'pnpm payload run tests/e2e/siapkan.ts && rm -rf .next/cache/fetch-cache && pnpm build && pnpm start',
      url: `${BASE_URL}/robots.txt`,
      reuseExistingServer: false,
      timeout: 600_000,
      env: {
        PORT: String(PORT),
        DATABASE_URL: urlDatabaseE2E(),
        PAYLOAD_SECRET: process.env.PAYLOAD_SECRET ?? '',
        NEXT_PUBLIC_SITE_URL: BASE_URL,
        // Kredensial palsu: memenuhi pengaman produksi modul media (Rencana 2) tanpa memanggil
        // Cloudinary. Server hanya membangun URL gambar; browser tes mencegat res.cloudinary.com.
        CLOUDINARY_CLOUD_NAME: 'e2e',
        CLOUDINARY_API_KEY: 'e2e',
        CLOUDINARY_API_SECRET: 'e2e',
      },
    },
  })
  ```

  Tambahkan skrip di `package.json`, tepat setelah baris `"test:unit"`:

  ```json
      "test:e2e": "playwright test",
  ```

  `tests/e2e/data.ts`

  ```ts
  /** Data tetap untuk E2E. Database E2E hanya untuk tes lokal, jadi kredensial ini bukan rahasia. */
  export const ADMIN_E2E = { email: 'e2e@point.lat', password: 'e2e-hanya-untuk-tes-lokal' }

  export const UKURAN_LAYAR = [
    { lebar: 375, tinggi: 812 },
    { lebar: 768, tinggi: 1024 },
    { lebar: 1440, tinggi: 900 },
  ] as const
  ```

  `tests/e2e/siapkan.ts`

  ```ts
  import config from '@payload-config'
  import { getPayload } from 'payload'

  import { pakaiKlien } from '@/modules/media'
  import { klienPalsu } from '@/modules/media/palsu'
  import { seed } from '@/seed/seed'

  import { ADMIN_E2E } from './data'

  /**
   * Mengisi database E2E sebelum server dibangun dan dinyalakan (`webServer` di playwright.config.ts).
   * Media disimpan lewat klien palsu bernama `e2e` (sama dengan `CLOUDINARY_CLOUD_NAME` server E2E),
   * jadi tidak ada panggilan jaringan.
   */
  pakaiKlien(klienPalsu('e2e'))
  const payload = await getPayload({ config })
  await seed(payload, { emailAdmin: ADMIN_E2E.email, passwordAdmin: ADMIN_E2E.password })
  payload.logger.info('Data E2E siap.')
  process.exit(0)
  ```

  `tests/e2e/bantu.ts`

  ```ts
  import AxeBuilder from '@axe-core/playwright'
  import { expect, type Page } from '@playwright/test'

  /** Aturan axe untuk WCAG 2.2 AA (spesifikasi §14). */
  const TAG_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

  /**
   * Gambar Cloudinary dilayani dari tes: server E2E membangun URL `res.cloudinary.com/e2e/...`, dan
   * tes tidak boleh memanggil jaringan. Gambar pengganti berukuran sama sehingga tata letak tetap.
   */
  export async function cegatCloudinary(page: Page): Promise<void> {
    await page.route('https://res.cloudinary.com/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="100%" height="100%" fill="#c9c3b8"/></svg>',
      }),
    )
  }

  export async function periksaAxe(page: Page): Promise<void> {
    const hasil = await new AxeBuilder({ page }).withTags(TAG_WCAG).analyze()
    expect(hasil.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
  }

  /** Halaman tidak boleh bergeser horizontal (spesifikasi §4: uji layar 375/768/1440). */
  export async function periksaTanpaGeserHorizontal(page: Page): Promise<void> {
    const [lebarIsi, lebarLayar] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
    expect(lebarIsi).toBeLessThanOrEqual(lebarLayar)
  }
  ```

- [ ] **Langkah 3: Tulis tes tata letak**

  `tests/e2e/tata-letak.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  import { UKURAN_LAYAR } from './data'

  test.beforeEach(async ({ page }) => {
    await cegatCloudinary(page)
  })

  test('header berisi rubrik dari CMS, tombol Tools, dan bahasa halaman Indonesia', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('lang', 'id')
    const rubrik = page.getByRole('navigation', { name: 'Rubrik' }).getByRole('link')
    await expect(rubrik).toHaveText(['Uang & Karier', 'Tekno', 'Belajar', 'Sehat'])
    await expect(rubrik.first()).toHaveAttribute('href', '/uang-karier')
    await expect(page.getByRole('banner').getByRole('link', { name: 'Tools' })).toHaveAttribute('href', '/tools')
    await expect(page.getByRole('contentinfo').getByRole('navigation', { name: 'Tentang point.' }).getByRole('link')).toHaveCount(6)
  })

  test('skip link muncul saat Tab pertama dan menuju isi', async ({ page }) => {
    await page.goto('/')
    await page.keyboard.press('Tab')
    const lewati = page.getByRole('link', { name: 'Langsung ke isi' })
    await expect(lewati).toBeFocused()
    await expect(lewati).toBeInViewport()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#isi$/)
  })

  test('font Archivo satu file subset, di-preload', async ({ page }) => {
    const font: string[] = []
    page.on('response', (r) => {
      if (r.request().resourceType() === 'font') font.push(r.url())
    })
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(1)
    expect(font).toHaveLength(1)
    expect(font[0]).toMatch(/archivo_latin_standard_normal.*\.woff2$/)
  })

  for (const { lebar, tinggi } of UKURAN_LAYAR) {
    test(`tata letak ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: tinggi })
      await page.goto('/')
      await periksaTanpaGeserHorizontal(page)
      await periksaAxe(page)
    })
  }
  ```

- [ ] **Langkah 4: Jalankan E2E**

  Jalankan (Postgres harus jalan; build butuh 1 sampai 2 menit):

  ```bash
  pnpm test:e2e
  ```

  Hasil yang diharapkan: `6 passed`: header dari CMS, skip link, satu file font di-preload, dan tata letak 375, 768, 1440 px tanpa geser horizontal dengan axe tanpa pelanggaran. Bila gagal karena port 3100 dipakai, hentikan prosesnya dengan `fuser -k 3100/tcp`.

- [ ] **Langkah 5: Jalankan semua pemeriksaan**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  ```

  Hasil yang diharapkan: bersih; unit tetap `Tests 221 passed (221)`.

- [ ] **Langkah 6: Commit**

  ```bash
  git add package.json pnpm-lock.yaml playwright.config.ts tests/e2e
  git commit -m "test(e2e): Playwright dengan build produksi, database E2E, dan axe"
  ```

### Task 4: Data halaman artikel bertag cache, disclaimer pilar, dan revalidasi media

**Files:**
- Create: `src/modules/konten/artikel.ts`
- Modify: `src/collections/Pilar.ts` (field `disclaimer`), `src/payload-types.ts` (generate), `src/seed/seed.ts`, `src/collections/Media.ts`, `src/hooks/revalidasiPublik.ts`, `src/lib/tag.ts`, `src/modules/konten/tipe.ts`, `src/modules/konten/data.ts`, `src/modules/konten/cache.ts`, `src/modules/konten/index.ts`, `tests/int/seed.int.spec.ts`
- Test: `tests/unit/konten-artikel.test.ts`, `tests/int/konten-artikel.int.spec.ts`

**Interfaces:**
- Consumes: `teksIsi`, `teksNode`, `IsiDokumen` (`src/modules/seo/lexical.ts`), `hitungKata` (`src/modules/seo/teks.ts`), `ambilSitus` (`src/modules/seo/situs.ts`), `ArtikelSeo` (`src/modules/seo/tipe.ts`), `slugify`, `validasiFormatSlug` (`src/lib/slug.ts`), `pathFor`, tipe Payload `Artikel`, `Media`, `Penuli`, `Pilar`.
- Produces:
  - Field `pilar.disclaimer` (textarea, opsional). Seed mengisinya untuk `uang-karier` dan `sehat`, termasuk di database lama yang field-nya masih kosong.
  - `TAG.media = 'media'`; `revalidasiKoleksi(tag: string[]): { afterChange; afterDelete }` (hook koleksi pendukung), dipasang di `Media`.
  - `src/modules/konten/tipe.ts` (tambahan): `PilarRingkas = { nama; slug; href; warna; disclaimer: string | null }`, `MediaTampil = { publicId; jenis: 'gambar' | 'video'; alt; width; height; caption: string | null; kredit: string | null }`, `PenulisRingkas = { nama; href; bio; keahlian: string[]; foto: MediaTampil | null }`, `KartuArtikel = { id; judul; href; tipe; pilar: PilarRingkas | null; intinya: string | null }`, `Subjudul = { id; teks }`, `Faq`, `Sumber = { judul; url; penerbit: string | null; diaksesPada: string | null }`, `DataArtikel` (lihat kode; `seo: ArtikelSeo` untuk `metadata()`, `jsonLd()`, `remahRoti()`).
  - `src/modules/konten/artikel.ts`: `KATA_PER_MENIT = 200`, `MAKS_TERKAIT = 3`, `MIN_DAFTAR_ISI = 3`, `waktuBaca(isi): number`, `tandaiSubjudul(isi): { isi; daftarIsi: Subjudul[] }` (menambah `idJangkar` di node heading), `tanggalIndonesia(iso): string`, `pilarRingkas(relasi)`, `mediaTampil(relasi)`, `penulisRingkas(relasi)`, `kartuArtikel(doc)`, `gabungTerkait(id, manual, sepilar): KartuArtikel[]`, `susunArtikel(doc, terkait): DataArtikel`.
  - `src/modules/konten/data.ts`: `ambilArtikel(payload, slug, { glosarium }): Promise<DataArtikel | null>` (depth 2 dengan `populate` terbatas, plus artikel terkait).
  - `src/modules/konten/cache.ts`: `muatSitus()` (tag `pengaturan-seo` + `media`), `TAG_ARTIKEL`, `muatArtikel(slug, glosarium)` (tag koleksi artikel, pilar, subkategori, penulis, tools, video, halaman + `media`).

Halaman artikel butuh dokumen terbit dengan relasi dua tingkat: pilar (nama, warna, disclaimer), penulis dan fotonya, gambar utama, dokumen yang ditautkan di isi, tool dan video yang disematkan, serta artikel terkait dan pilarnya. Query memakai `depth: 2` dengan `populate` per koleksi supaya data cache tetap kecil (media hanya field untuk `propsGambar` dan teks pendamping). `susunArtikel` menerjemahkan dokumen itu ke `DataArtikel`; tes integrasi memastikan relasi di isi Lexical (tautan internal, gambar, blok `embedTool`) ikut ter-populate.

Artikel terkait: pilihan editor (`artikelTerkait`) yang sudah terbit lebih dulu, lalu dilengkapi artikel sepilar terbaru (bukan glosarium) sampai tiga. Slug yang formatnya mustahil (misalnya `favicon.ico`) langsung `null` tanpa query, sehingga permintaan aset yang tidak ada tidak menyentuh database.

Daftar isi memakai `id` dari teks heading (`slugify`), unik di halaman: heading kembar diberi akhiran `-2`, dan id elemen halaman (`isi`, `intinya`, `daftar-isi`, `sumber`, `faq`, `terkait`, `penulis`) tidak dipakai heading. H1 di isi diturunkan ke H2 karena H1 halaman adalah judul.

Disclaimer otomatis (spesifikasi §3) disimpan di pilar supaya teksnya bisa diubah dari CMS. Ini satu-satunya perubahan skema rencana ini dan aditif (kolom baru `disclaimer` di tabel `pilar`). Media sekarang merevalidasi tag `media` karena alt, caption, dan kredit tampil di halaman.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/konten-artikel.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import type { Artikel } from '@/payload-types'
  import { gabungTerkait, kartuArtikel, mediaTampil, pilarRingkas, tandaiSubjudul, tanggalIndonesia, waktuBaca } from '@/modules/konten/artikel'

  import { h, isiLexical, kalimatPanjang, p } from './seo-contoh'

  const pilar = { id: 1, nama: 'Belajar', slug: 'belajar', warna: 'kuning' as const, deskripsi: 'Belajar.', createdAt: '', updatedAt: '' }

  const artikel = (id: number, extra: Partial<Artikel> = {}) =>
    ({ id, judul: `Artikel ${id}`, slug: `artikel-${id}`, tipe: 'panduan', pilar, intinya: [{ poin: `Poin ${id}.` }], _status: 'published', ...extra }) as Artikel

  describe('tandaiSubjudul', () => {
    it('id dari teks heading, unik, tidak bentrok dengan id halaman; H1 di isi menjadi H2', () => {
      const { isi, daftarIsi } = tandaiSubjudul(
        isiLexical([h('h2', 'Cara Hitung PPh 21'), p('Teks.'), h('h3', 'Contoh'), h('h2', 'Cara hitung PPh 21'), h('h1', 'Sumber'), h('h2', '')]),
      )
      expect(daftarIsi).toEqual([
        { id: 'cara-hitung-pph-21', teks: 'Cara Hitung PPh 21' },
        { id: 'cara-hitung-pph-21-2', teks: 'Cara hitung PPh 21' },
        { id: 'sumber-2', teks: 'Sumber' },
      ])
      const node = isi?.root?.children as { tag?: string; idJangkar?: string }[]
      expect(node.map((n) => n.idJangkar)).toEqual(['cara-hitung-pph-21', undefined, 'contoh', 'cara-hitung-pph-21-2', 'sumber-2', 'bagian'])
      expect(node[4].tag).toBe('h2')
    })

    it('isi kosong tetap aman', () => {
      expect(tandaiSubjudul(null)).toEqual({ isi: null, daftarIsi: [] })
    })
  })

  describe('waktuBaca', () => {
    it('200 kata per menit, dibulatkan ke atas, minimal satu menit', () => {
      expect(waktuBaca(isiLexical([p('Pendek.')]))).toBe(1)
      expect(waktuBaca(isiLexical([p(kalimatPanjang(200))]))).toBe(1)
      expect(waktuBaca(isiLexical([p(kalimatPanjang(150)), h('h2', 'Dua kata'), p(kalimatPanjang(49))]))).toBe(2)
    })
  })

  describe('tanggalIndonesia', () => {
    it('memakai zona WIB dan nama bulan Indonesia', () => {
      expect(tanggalIndonesia('2026-11-03T18:30:00.000Z')).toBe('4 November 2026')
      expect(tanggalIndonesia('2026-08-17T01:00:00.000Z')).toBe('17 Agustus 2026')
    })
  })

  describe('pemetaan relasi', () => {
    it('pilar dan media yang belum di-populate atau tidak lengkap menjadi null', () => {
      expect(pilarRingkas(1)).toBeNull()
      expect(pilarRingkas({ ...pilar, disclaimer: '  ' })).toEqual({ nama: 'Belajar', slug: 'belajar', href: '/belajar', warna: 'kuning', disclaimer: null })
      expect(mediaTampil({ id: 1, publicId: 'point/gambar/a', width: null, height: 600 } as never)).toBeNull()
      expect(mediaTampil({ id: 1, publicId: 'point/gambar/a', width: 800, height: 600, alt: null } as never)).toEqual({
        publicId: 'point/gambar/a',
        jenis: 'gambar',
        alt: '',
        width: 800,
        height: 600,
        caption: null,
        kredit: null,
      })
    })

    it('kartu glosarium memakai path /glosarium', () => {
      expect(kartuArtikel(artikel(5, { tipe: 'glosarium', slug: 'ptkp' }))?.href).toBe('/glosarium/ptkp')
      expect(kartuArtikel(artikel(6, { slug: null }))).toBeNull()
    })
  })

  describe('gabungTerkait', () => {
    it('pilihan editor yang terbit dulu, lalu sepilar, tanpa diri sendiri dan duplikat, maksimal tiga', () => {
      const manual = [artikel(2, { _status: 'draft' }), artikel(3), 4, artikel(1)]
      const sepilar = [artikel(3), artikel(7), artikel(8), artikel(9)]
      expect(gabungTerkait(1, manual, sepilar).map((k) => k.id)).toEqual([3, 7, 8])
    })
  })
  ```

  `tests/int/konten-artikel.int.spec.ts`

  ```ts
  import { afterAll, beforeAll, describe, expect, it } from 'vitest'

  import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'
  import type { IsiLexical } from '@/lib/lexical'
  import { ambilArtikel } from '@/modules/konten/data'

  import { h, isiLexical, kalimatPanjang, p, tautanInternal, unggahan } from '../unit/seo-contoh'
  import { buatGambar, dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
  import { getTestPayload, unik } from './helpers'

  const blok = (fields: Record<string, unknown>) => ({ type: 'block', version: 2, format: '', fields: { id: unik('blok'), blockName: '', ...fields } })

  describe('ambilArtikel', () => {
    let tag: string[] = []

    beforeAll(() => {
      pakaiPemicuRevalidasi((t) => tag.push(t))
    })

    afterAll(() => {
      pakaiPemicuRevalidasi(null)
    })

    it('data halaman: relasi, disclaimer pilar, isi bertanda, daftar isi, waktu baca, dan terkait', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      await payload.update({ collection: 'pilar', id: relasi.pilar.id, data: { disclaimer: 'Bukan saran keuangan.' } })
      const foto = await buatGambar(payload, 800, 800)
      await payload.update({ collection: 'penulis', id: relasi.penulis.id, data: { foto: foto.id, keahlian: ['Pajak'] } })
      // `toolId` unik: sisa tes sebelumnya yang gagal dibersihkan dulu, dan tool dihapus di akhir tes.
      await payload.delete({ collection: 'tools', where: { toolId: { equals: 'ipk' } } })
      const tool = await payload.create({
        collection: 'tools',
        data: { _status: 'published', nama: unik('IPK'), toolId: 'ipk', pilar: relasi.pilar.id, ringkasan: 'Hitung IPK.' },
      })
      const lama = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      const draf = await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft' } })
      const isi = isiLexical([
        p(kalimatPanjang(250)),
        h('h2', 'Cara menghitung'),
        p('Baca juga ', tautanInternal(lama.id, 'panduan lama'), '.'),
        h('h3', 'Contoh'),
        unggahan(relasi.gambar.id),
        h('h2', 'Cara menghitung'),
        blok({ blockType: 'embedTool', tool: tool.id }),
        h('h1', 'Isi'),
      ]) as IsiLexical
      const artikel = await payload.create({
        collection: 'artikel',
        data: {
          ...dataArtikelTerbit(relasi),
          isi,
          faq: [{ pertanyaan: 'Apa itu PTKP?', jawaban: 'Penghasilan tidak kena pajak.' }],
          sumber: [{ judul: 'PMK 168/2023', url: 'https://jdih.kemenkeu.go.id/', penerbit: 'Kemenkeu' }],
          artikelTerkait: [draf.id, lama.id],
        },
      })

      const data = await ambilArtikel(payload, artikel.slug as string, { glosarium: false })
      expect(data).not.toBeNull()
      if (!data) return
      expect(data.href).toBe(`/${artikel.slug}`)
      expect(data.pilar).toEqual({
        nama: relasi.pilar.nama,
        slug: relasi.pilar.slug,
        href: `/${relasi.pilar.slug}`,
        warna: 'hijau',
        disclaimer: 'Bukan saran keuangan.',
      })
      expect(data.penulis).toMatchObject({ nama: relasi.penulis.nama, href: `/penulis/${relasi.penulis.slug}`, keahlian: ['Pajak'] })
      expect(data.penulis?.foto).toMatchObject({ width: 800, height: 800, alt: 'Gambar contoh 800px' })
      expect(data.gambar).toMatchObject({ jenis: 'gambar', width: 1600, height: 900 })
      expect(data.gambar?.publicId).toMatch(/^point\/gambar\//)
      expect(data.waktuBaca).toBe(2)
      expect(data.daftarIsi).toEqual([
        { id: 'cara-menghitung', teks: 'Cara menghitung' },
        { id: 'cara-menghitung-2', teks: 'Cara menghitung' },
        { id: 'isi-2', teks: 'Isi' },
      ])
      expect(data.faq).toEqual([{ pertanyaan: 'Apa itu PTKP?', jawaban: 'Penghasilan tidak kena pajak.' }])
      expect(data.sumber).toEqual([{ judul: 'PMK 168/2023', url: 'https://jdih.kemenkeu.go.id/', penerbit: 'Kemenkeu', diaksesPada: null }])
      expect(data.terkait.map((k) => k.id)).toEqual([lama.id])
      expect(data.terkait[0]).toMatchObject({ href: `/${lama.slug}`, tipe: 'panduan', intinya: lama.intinya[0].poin })
      expect(data.seo).toMatchObject({ judul: artikel.judul, slug: artikel.slug, tipe: 'panduan' })
      expect(data.seo).not.toHaveProperty('isi')

      // Relasi di isi ikut dimuat: tautan internal, gambar, dan tool yang disematkan.
      const node = (data.isi?.root?.children ?? []) as Record<string, unknown>[]
      expect(node[1]).toMatchObject({ tag: 'h2', idJangkar: 'cara-menghitung' })
      expect(node[7]).toMatchObject({ tag: 'h2', idJangkar: 'isi-2' })
      const tautan = (node[2].children as Record<string, unknown>[])[1] as { fields: { doc: { value: unknown } } }
      expect(tautan.fields.doc.value).toMatchObject({ id: lama.id, slug: lama.slug, tipe: 'panduan', _status: 'published' })
      expect(node[4]).toMatchObject({ value: { id: relasi.gambar.id, width: 1600, alt: 'Gambar contoh 1600px' } })
      expect(node[6]).toMatchObject({ fields: { tool: { id: tool.id, slug: tool.slug, ringkasan: 'Hitung IPK.' } } })
      await payload.delete({ collection: 'tools', id: tool.id })
    })

    it('hanya artikel terbit; glosarium terpisah dari artikel biasa; slug tidak valid langsung null', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const draf = await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft' } })
      const istilah = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium' } })

      expect(await ambilArtikel(payload, draf.slug as string, { glosarium: false })).toBeNull()
      expect(await ambilArtikel(payload, istilah.slug as string, { glosarium: false })).toBeNull()
      expect((await ambilArtikel(payload, istilah.slug as string, { glosarium: true }))?.href).toBe(`/glosarium/${istilah.slug}`)
      expect(await ambilArtikel(payload, 'favicon.ico', { glosarium: false })).toBeNull()
    })

    it('mengubah media merevalidasi tag media', async () => {
      const payload = await getTestPayload()
      const gambar = await buatGambar(payload)
      tag = []
      await payload.update({ collection: 'media', id: gambar.id, data: { alt: 'Alt baru' } })
      expect(tag).toEqual(['media'])
    })
  })
  ```

  Tambahkan pemeriksaan disclaimer di `tests/int/seed.int.spec.ts`:

  ```diff
  diff --git a/tests/int/seed.int.spec.ts b/tests/int/seed.int.spec.ts
  index 9cd09d7..95af266 100644
  --- a/tests/int/seed.int.spec.ts
  +++ b/tests/int/seed.int.spec.ts
  @@ -19,6 +19,9 @@ describe('seed', () => {
         expect(totalDocs).toBe(1)
       }
   
  +    const pilar = await payload.find({ collection: 'pilar', where: { slug: { in: ['uang-karier', 'tekno', 'sehat'] } }, sort: 'urutan' })
  +    expect(pilar.docs.map((p) => Boolean(p.disclaimer))).toEqual([true, false, true])
  +
       const redaksi = await payload.count({ collection: 'penulis', where: { slug: { equals: 'redaksi' } } })
       expect(redaksi.totalDocs).toBe(1)
   
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/konten-artikel.test.ts` dengan `Cannot find package '@/modules/konten/artikel'`.

- [ ] **Langkah 3: Field disclaimer, seed, dan tipe**

  ```diff
  diff --git a/src/collections/Pilar.ts b/src/collections/Pilar.ts
  index 147816d..b6363f9 100644
  --- a/src/collections/Pilar.ts
  +++ b/src/collections/Pilar.ts
  @@ -36,6 +36,11 @@ export const Pilar: CollectionConfig = {
       },
       { name: 'deskripsi', type: 'textarea', required: true },
       { name: 'intro', type: 'richText', label: 'Intro halaman rubrik' },
  +    {
  +      name: 'disclaimer',
  +      type: 'textarea',
  +      admin: { description: 'Tampil di akhir setiap artikel pilar ini (wajib untuk Uang & Karier dan Sehat). Kosongkan bila tidak perlu.' },
  +    },
       { name: 'urutan', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
       seoField,
     ],
  ```

  ```diff
  diff --git a/src/seed/seed.ts b/src/seed/seed.ts
  index 3e699ab..817ae05 100644
  --- a/src/seed/seed.ts
  +++ b/src/seed/seed.ts
  @@ -9,11 +9,28 @@ export const PILAR_AWAL: {
     warna: WarnaPilar
     deskripsi: string
     urutan: number
  +  disclaimer?: string
   }[] = [
  -  { nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau', deskripsi: 'Gaji, pajak, tabungan, utang, dan karier.', urutan: 1 },
  +  {
  +    nama: 'Uang & Karier',
  +    slug: 'uang-karier',
  +    warna: 'hijau',
  +    deskripsi: 'Gaji, pajak, tabungan, utang, dan karier.',
  +    urutan: 1,
  +    disclaimer:
  +      'Tulisan ini untuk edukasi, bukan saran keuangan, pajak, atau hukum untuk kondisimu. Aturan dan angka bisa berubah, jadi cek sumber resmi atau tanya ahli sebelum mengambil keputusan.',
  +  },
     { nama: 'Tekno', slug: 'tekno', warna: 'oranye', deskripsi: 'AI, aplikasi, gadget, dan keamanan digital.', urutan: 2 },
     { nama: 'Belajar', slug: 'belajar', warna: 'kuning', deskripsi: 'Sekolah, kuliah, ujian masuk, dan beasiswa.', urutan: 3 },
  -  { nama: 'Sehat', slug: 'sehat', warna: 'koral', deskripsi: 'Gizi, olahraga, tidur, dan kebiasaan sehat.', urutan: 4 },
  +  {
  +    nama: 'Sehat',
  +    slug: 'sehat',
  +    warna: 'koral',
  +    deskripsi: 'Gizi, olahraga, tidur, dan kebiasaan sehat.',
  +    urutan: 4,
  +    disclaimer:
  +      'Tulisan ini untuk edukasi, bukan pengganti diagnosis atau saran tenaga kesehatan. Bila kamu punya keluhan, periksakan diri ke dokter atau fasilitas kesehatan terdekat.',
  +  },
   ]
   
   /** Halaman wajib. Dibuat sebagai draf: isinya harus ditulis pemilik sebelum terbit. */
  @@ -37,7 +54,12 @@ export async function seed(payload: Payload, opsi: OpsiSeed = {}): Promise<Hasil
     const idPilar: number[] = []
     for (const pilar of PILAR_AWAL) {
       const ada = await payload.find({ collection: 'pilar', where: { slug: { equals: pilar.slug } }, limit: 1 })
  -    const doc = ada.docs[0] ?? (await payload.create({ collection: 'pilar', data: pilar }))
  +    const lama = ada.docs[0]
  +    const doc = lama ?? (await payload.create({ collection: 'pilar', data: pilar }))
  +    // Database yang dibuat sebelum field disclaimer ada ikut mendapat teks bawaan, tanpa menimpa isian editor.
  +    if (lama && pilar.disclaimer && !lama.disclaimer) {
  +      await payload.update({ collection: 'pilar', id: lama.id, data: { disclaimer: pilar.disclaimer } })
  +    }
       idPilar.push(doc.id)
     }
   
  ```

  Jalankan:

  ```bash
  pnpm generate:types
  git diff src/payload-types.ts
  ```

  Hasil yang diharapkan: `payload-types.ts` hanya bertambah `disclaimer?: string | null;` di `Pilar` (dengan komentar deskripsi) dan `disclaimer?: T;` di `PilarSelect`.

- [ ] **Langkah 4: Revalidasi media**

  ```diff
  diff --git a/src/lib/tag.ts b/src/lib/tag.ts
  index 8d0cb40..dddc7a9 100644
  --- a/src/lib/tag.ts
  +++ b/src/lib/tag.ts
  @@ -7,6 +7,7 @@
    * - `pilar:{slug}`: halaman rubrik `/{pilar}` dan `/{pilar}/{subkategori}`.
    * - `beranda`, `sitemap` (sitemap, news sitemap, RSS), `pengaturan-seo` (robots.txt, metadata situs).
    * - `header`, `footer`: global tampilan yang dirender layout di setiap halaman publik.
  + * - `media`: dokumen media (alt, caption, kredit, ukuran) yang ditampilkan halaman.
    */
   
   export const KOLEKSI_PUBLIK = ['artikel', 'pilar', 'subkategori', 'penulis', 'tools', 'video', 'halaman'] as const
  @@ -18,6 +19,7 @@ export const TAG = {
     pengaturanSeo: 'pengaturan-seo',
     header: 'header',
     footer: 'footer',
  +  media: 'media',
     koleksi: (koleksi: KoleksiPublik) => koleksi,
     dokumen: (koleksi: KoleksiPublik, id: number | string) => `${koleksi}:${id}`,
     pilar: (slug: string) => `pilar:${slug}`,
  ```

  ```diff
  diff --git a/src/hooks/revalidasiPublik.ts b/src/hooks/revalidasiPublik.ts
  index b0ba18e..8499ed1 100644
  --- a/src/hooks/revalidasiPublik.ts
  +++ b/src/hooks/revalidasiPublik.ts
  @@ -134,6 +134,23 @@ export function revalidasiPublik(koleksi: KoleksiPublik): {
     return { beforeChange, afterChange, afterDelete }
   }
   
  +/** Hook koleksi pendukung (media): merevalidasi tag tetap setiap kali dokumen disimpan atau dihapus. */
  +export function revalidasiKoleksi(tag: string[]): {
  +  afterChange: CollectionAfterChangeHook
  +  afterDelete: CollectionAfterDeleteHook
  +} {
  +  return {
  +    afterChange: ({ doc }) => {
  +      revalidasi(tag)
  +      return doc
  +    },
  +    afterDelete: ({ doc }) => {
  +      revalidasi(tag)
  +      return doc
  +    },
  +  }
  +}
  +
   /** Hook global: merevalidasi tag tetap setiap kali global disimpan. */
   export function revalidasiGlobal(tag: string[]): GlobalAfterChangeHook {
     return ({ doc }) => {
  ```

  ```diff
  diff --git a/src/collections/Media.ts b/src/collections/Media.ts
  index 813c358..6f242b4 100644
  --- a/src/collections/Media.ts
  +++ b/src/collections/Media.ts
  @@ -1,12 +1,17 @@
   import type { CollectionConfig, FieldAccess } from 'payload'
   
   import { anyone, isLoggedIn } from '@/access'
  +import { revalidasiKoleksi } from '@/hooks/revalidasiPublik'
   import { validasiAlt } from '@/lib/media'
  +import { TAG } from '@/lib/tag'
   import { JENIS_FILE } from '@/modules/media/unggah'
   
   /** Field yang hanya boleh diisi sistem (adapter Cloudinary), tidak lewat API atau form admin. */
   const hanyaSistem: FieldAccess = () => false
   
  +/** Alt, caption, dan kredit tampil di halaman publik: perubahan media membuang cache halaman. */
  +const revalidasi = revalidasiKoleksi([TAG.media])
  +
   /**
    * File disimpan di Cloudinary lewat adapter `src/modules/media/adapter.ts` yang dipasang di
    * `payload.config.ts` (plugin cloud storage, `disableLocalStorage: true`). Field lama tetap.
  @@ -20,6 +25,7 @@ export const Media: CollectionConfig = {
       group: 'Konten',
     },
     access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  +  hooks: { afterChange: [revalidasi.afterChange], afterDelete: [revalidasi.afterDelete] },
     upload: {
       mimeTypes: [...JENIS_FILE],
       // Potongan dibuat Cloudinary (g_auto), bukan sharp. Focal point dibiarkan aktif supaya kolom
  ```

- [ ] **Langkah 5: Data artikel**

  `src/modules/konten/artikel.ts`

  ```ts
  import type { Artikel, Media, Penuli, Pilar } from '@/payload-types'
  import { pathFor } from '@/lib/paths'
  import { slugify } from '@/lib/slug'
  import { teksIsi, teksNode, type IsiDokumen } from '@/modules/seo/lexical'
  import { hitungKata } from '@/modules/seo/teks'
  import type { ArtikelSeo } from '@/modules/seo/tipe'

  import type { DataArtikel, KartuArtikel, MediaTampil, PenulisRingkas, PilarRingkas, Subjudul } from './tipe'

  /** Kecepatan baca untuk label "N menit baca". */
  export const KATA_PER_MENIT = 200

  /** Jumlah artikel terkait di bawah artikel. */
  export const MAKS_TERKAIT = 3

  /** Daftar isi tampil bila artikel punya minimal sekian H2. */
  export const MIN_DAFTAR_ISI = 3

  /** Id elemen halaman yang tidak boleh dipakai jangkar subjudul. */
  const ID_HALAMAN = ['isi', 'intinya', 'daftar-isi', 'sumber', 'faq', 'terkait', 'penulis']

  type Relasi<T> = T | number | null | undefined

  const ambil = <T extends object>(relasi: Relasi<T>): T | null => (relasi && typeof relasi === 'object' ? relasi : null)

  export function waktuBaca(isi: IsiDokumen): number {
    const kata = teksIsi(isi).reduce((jumlah, teks) => jumlah + hitungKata(teks), 0)
    return Math.max(1, Math.ceil(kata / KATA_PER_MENIT))
  }

  type NodeIsi = Parameters<typeof teksNode>[0] & Record<string, unknown>

  /**
   * Memberi setiap heading isi atribut `idJangkar` (dari teksnya, unik di halaman) dan mengumpulkan H2
   * untuk daftar isi. H1 di isi diturunkan menjadi H2 karena H1 halaman adalah judul artikel.
   */
  export function tandaiSubjudul(isi: IsiDokumen): { isi: IsiDokumen; daftarIsi: Subjudul[] } {
    const anak = isi?.root?.children
    if (!isi?.root || !Array.isArray(anak)) return { isi, daftarIsi: [] }
    const terpakai = new Map<string, number>(ID_HALAMAN.map((id) => [id, 1]))
    const daftarIsi: Subjudul[] = []
    const children = (anak as NodeIsi[]).map((node) => {
      if (node.type !== 'heading') return node
      const teks = teksNode(node).trim()
      const dasar = slugify(teks) || 'bagian'
      const urutan = (terpakai.get(dasar) ?? 0) + 1
      terpakai.set(dasar, urutan)
      const id = urutan === 1 ? dasar : `${dasar}-${urutan}`
      const tag = node.tag === 'h1' ? 'h2' : node.tag
      if (tag === 'h2' && teks) daftarIsi.push({ id, teks })
      return { ...node, tag, idJangkar: id }
    })
    return { isi: { ...isi, root: { ...isi.root, children } }, daftarIsi }
  }

  const FORMAT_TANGGAL = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  })

  /** Tanggal untuk pembaca Indonesia (WIB), contoh "4 November 2026". */
  export function tanggalIndonesia(iso: string): string {
    return FORMAT_TANGGAL.format(new Date(iso))
  }

  export function pilarRingkas(relasi: Relasi<Pilar>): PilarRingkas | null {
    const pilar = ambil(relasi)
    if (!pilar?.slug) return null
    return {
      nama: pilar.nama,
      slug: pilar.slug,
      href: pathFor({ jenis: 'pilar', slug: pilar.slug }),
      warna: pilar.warna,
      disclaimer: pilar.disclaimer?.trim() || null,
    }
  }

  /** Media yang belum lengkap (tanpa publicId atau ukuran) tidak ditampilkan, supaya tidak ada CLS. */
  export function mediaTampil(relasi: Relasi<Media>): MediaTampil | null {
    const media = ambil(relasi)
    if (!media?.publicId || !media.width || !media.height) return null
    return {
      publicId: media.publicId,
      jenis: media.jenis === 'video' ? 'video' : 'gambar',
      alt: media.alt ?? '',
      width: media.width,
      height: media.height,
      caption: media.caption?.trim() || null,
      kredit: media.kredit?.trim() || null,
    }
  }

  export function penulisRingkas(relasi: Relasi<Penuli>): PenulisRingkas | null {
    const penulis = ambil(relasi)
    if (!penulis?.slug) return null
    return {
      nama: penulis.nama,
      href: pathFor({ jenis: 'penulis', slug: penulis.slug }),
      bio: penulis.bio?.trim() || null,
      keahlian: penulis.keahlian ?? [],
      foto: mediaTampil(penulis.foto),
    }
  }

  type ArtikelUntukKartu = Pick<Artikel, 'id' | 'judul' | 'slug' | 'tipe' | 'pilar' | 'intinya'>

  export function kartuArtikel(doc: ArtikelUntukKartu): KartuArtikel | null {
    if (!doc.slug) return null
    return {
      id: doc.id,
      judul: doc.judul,
      href: pathFor({ jenis: 'artikel', slug: doc.slug, tipe: doc.tipe }),
      tipe: doc.tipe,
      pilar: pilarRingkas(doc.pilar),
      intinya: doc.intinya?.[0]?.poin ?? null,
    }
  }

  /** Artikel terkait pilihan editor yang sudah terbit, lalu artikel sepilar terbaru, tanpa duplikat. */
  export function gabungTerkait(id: number, manual: Relasi<Artikel>[], sepilar: ArtikelUntukKartu[]): KartuArtikel[] {
    const hasil: KartuArtikel[] = []
    const terpakai = new Set<number>([id])
    const pilihan = manual.map((r) => ambil(r)).filter((d): d is Artikel => d?._status === 'published')
    for (const doc of [...pilihan, ...sepilar]) {
      if (hasil.length >= MAKS_TERKAIT || terpakai.has(doc.id)) continue
      const kartu = kartuArtikel(doc)
      if (!kartu) continue
      terpakai.add(doc.id)
      hasil.push(kartu)
    }
    return hasil
  }

  /** Field dokumen artikel yang dibaca modul SEO (tanpa isi, FAQ, sumber). */
  function untukSeo(doc: Artikel): ArtikelSeo {
    const { id, judul, slug, tipe, deck, pilar, subkategori, penulis, gambarUtama, terbitPada, diperbaruiBesar, seo, createdAt, updatedAt } =
      doc
    return { id, judul, slug, tipe, deck, pilar, subkategori, penulis, gambarUtama, terbitPada, diperbaruiBesar, seo, createdAt, updatedAt } as ArtikelSeo
  }

  /** Dokumen artikel terbit (depth 2) menjadi data halaman. */
  export function susunArtikel(doc: Artikel, terkait: KartuArtikel[]): DataArtikel {
    const { isi, daftarIsi } = tandaiSubjudul(doc.isi as IsiDokumen)
    return {
      id: doc.id,
      judul: doc.judul,
      tipe: doc.tipe,
      href: pathFor({ jenis: 'artikel', slug: doc.slug ?? '', tipe: doc.tipe }),
      deck: doc.deck,
      intinya: (doc.intinya ?? []).map((i) => i.poin),
      diperbarui: doc.diperbaruiBesar ?? doc.terbitPada ?? null,
      waktuBaca: waktuBaca(doc.isi as IsiDokumen),
      pilar: pilarRingkas(doc.pilar),
      penulis: penulisRingkas(doc.penulis),
      gambar: mediaTampil(doc.gambarUtama),
      isi,
      daftarIsi: daftarIsi.length >= MIN_DAFTAR_ISI ? daftarIsi : [],
      faq: (doc.faq ?? []).map(({ pertanyaan, jawaban }) => ({ pertanyaan, jawaban })),
      sumber: (doc.sumber ?? []).map((s) => ({
        judul: s.judul,
        url: s.url,
        penerbit: s.penerbit?.trim() || null,
        diaksesPada: s.diaksesPada ?? null,
      })),
      terkait,
      seo: untukSeo(doc),
    }
  }
  ```

  Ganti seluruh isi empat file modul konten berikut:

  `src/modules/konten/tipe.ts`

  ```ts
  import type { TipeArtikel, WarnaPilar } from '@/lib/konstanta'
  import type { IsiDokumen } from '@/modules/seo/lexical'
  import type { ArtikelSeo } from '@/modules/seo/tipe'

  /**
   * Data tampilan yang sudah siap dirender komponen publik. Komponen tidak membaca dokumen Payload
   * mentah: modul ini yang menerjemahkan relasi, path (`pathFor`), dan nilai bawaan.
   */

  export type Tautan = { label: string; href: string }

  export type ItemMenu = Tautan & { warna: WarnaPilar | null }

  export type DataHeader = { menu: ItemMenu[]; tools: Tautan }

  export type DataFooter = { tautan: Tautan[]; sosial: Tautan[]; whatsapp: string | null; hakCipta: string }

  export type PilarRingkas = { nama: string; slug: string; href: string; warna: WarnaPilar; disclaimer: string | null }

  /** Media siap untuk `propsGambar` (publicId, ukuran asli) ditambah teks pendamping. */
  export type MediaTampil = {
    publicId: string
    jenis: 'gambar' | 'video'
    alt: string
    width: number
    height: number
    caption: string | null
    kredit: string | null
  }

  export type PenulisRingkas = {
    nama: string
    href: string
    bio: string | null
    keahlian: string[]
    foto: MediaTampil | null
  }

  export type KartuArtikel = {
    id: number
    judul: string
    href: string
    tipe: TipeArtikel
    pilar: PilarRingkas | null
    intinya: string | null
  }

  /** Subjudul H2 untuk daftar isi; `id` sama dengan atribut `id` heading di isi. */
  export type Subjudul = { id: string; teks: string }

  export type Faq = { pertanyaan: string; jawaban: string }

  export type Sumber = { judul: string; url: string; penerbit: string | null; diaksesPada: string | null }

  /** Semua yang dibutuhkan halaman artikel dan glosarium. `seo` dipakai `metadata()`, `jsonLd()`, `remahRoti()`. */
  export type DataArtikel = {
    id: number
    judul: string
    tipe: TipeArtikel
    href: string
    deck: string
    intinya: string[]
    diperbarui: string | null
    waktuBaca: number
    pilar: PilarRingkas | null
    penulis: PenulisRingkas | null
    gambar: MediaTampil | null
    isi: IsiDokumen
    daftarIsi: Subjudul[]
    faq: Faq[]
    sumber: Sumber[]
    terkait: KartuArtikel[]
    seo: ArtikelSeo
  }
  ```

  `src/modules/konten/data.ts`

  ```ts
  import type { Payload, Where } from 'payload'

  import type { Artikel } from '@/payload-types'
  import { validasiFormatSlug } from '@/lib/slug'

  import { gabungTerkait, MAKS_TERKAIT, susunArtikel } from './artikel'
  import { susunFooter, susunHeader } from './tampilan'
  import type { DataArtikel, DataFooter, DataHeader, KartuArtikel } from './tipe'

  /**
   * Query Payload untuk halaman publik. Fungsi di sini menerima `payload` supaya bisa diuji integrasi;
   * halaman memakai versi bertag cache di `cache.ts`.
   */

  export async function ambilHeader(payload: Payload): Promise<DataHeader> {
    const header = await payload.findGlobal({
      slug: 'header',
      depth: 1,
      populate: { pilar: { nama: true, slug: true, warna: true } },
    })
    return susunHeader(header)
  }

  export async function ambilFooter(payload: Payload): Promise<DataFooter> {
    return susunFooter(await payload.findGlobal({ slug: 'footer', depth: 0 }))
  }

  /**
   * Field dokumen relasi yang dimuat halaman artikel (depth 2). Membatasi field menjaga data cache
   * kecil; media hanya membawa field untuk `propsGambar` dan teks pendamping.
   */
  const POPULATE_ARTIKEL = {
    pilar: { nama: true, slug: true, warna: true, disclaimer: true },
    subkategori: { nama: true, slug: true, pilar: true },
    penulis: { nama: true, slug: true, bio: true, keahlian: true, foto: true },
    media: { alt: true, publicId: true, jenis: true, width: true, height: true, caption: true, kredit: true },
    artikel: { judul: true, slug: true, tipe: true, pilar: true, intinya: true, _status: true },
    tools: { nama: true, slug: true, ringkasan: true, _status: true },
    video: { judul: true, slug: true, file: true, poster: true, transkrip: true, _status: true },
    halaman: { judul: true, slug: true, _status: true },
  } as const

  const terbit: Where = { _status: { equals: 'published' } }

  /**
   * Artikel terbit dengan slug ini, siap dirender. `glosarium: true` hanya mencari tipe glosarium
   * (`/glosarium/{slug}`), selain itu semua tipe lain (`/{slug}`). Slug yang formatnya tidak mungkin
   * (misalnya `favicon.ico`) langsung `null` tanpa query.
   */
  export async function ambilArtikel(payload: Payload, slug: string, opsi: { glosarium: boolean }): Promise<DataArtikel | null> {
    if (validasiFormatSlug(slug) !== true) return null
    const { docs } = await payload.find({
      collection: 'artikel',
      where: {
        and: [
          { slug: { equals: slug } },
          terbit,
          { tipe: opsi.glosarium ? { equals: 'glosarium' } : { not_equals: 'glosarium' } },
        ],
      },
      depth: 2,
      limit: 1,
      pagination: false,
      populate: POPULATE_ARTIKEL,
    })
    const doc = docs[0]
    if (!doc) return null
    return susunArtikel(doc, await ambilTerkait(payload, doc))
  }

  const idRelasi = (relasi: number | { id: number } | null | undefined) =>
    relasi && typeof relasi === 'object' ? relasi.id : (relasi ?? null)

  /** Pilihan editor dulu, lalu artikel sepilar terbaru (bukan glosarium) untuk melengkapi. */
  async function ambilTerkait(payload: Payload, doc: Artikel): Promise<KartuArtikel[]> {
    const manual = doc.artikelTerkait ?? []
    const kecuali = [doc.id, ...manual.map(idRelasi).filter((id): id is number => id !== null)]
    const { docs } = await payload.find({
      collection: 'artikel',
      where: {
        and: [
          terbit,
          { pilar: { equals: idRelasi(doc.pilar) } },
          { tipe: { not_equals: 'glosarium' } },
          { id: { not_in: kecuali } },
        ],
      },
      sort: '-terbitPada',
      limit: MAKS_TERKAIT,
      depth: 1,
      pagination: false,
      select: { judul: true, slug: true, tipe: true, pilar: true, intinya: true },
      populate: { pilar: POPULATE_ARTIKEL.pilar },
    })
    return gabungTerkait(doc.id, manual, docs)
  }
  ```

  `src/modules/konten/cache.ts`

  ```ts
  import config from '@payload-config'
  import { unstable_cache } from 'next/cache'
  import { getPayload } from 'payload'

  import { TAG } from '@/lib/tag'
  import { ambilSitus } from '@/modules/seo/situs'

  import { ambilArtikel, ambilFooter, ambilHeader } from './data'

  /**
   * Data halaman publik yang di-cache dengan tag (spesifikasi §5 "Rendering"). Halaman dirender statis
   * saat pertama diminta (ISR) dan tag cache data ikut tercatat di halaman itu, jadi `revalidateTag`
   * dari hook Payload membuang data dan halamannya sekaligus. `revalidate: 3600` adalah jaring pengaman
   * bila ada perubahan yang tidak memicu hook (sama dengan rute teknis Rencana 3).
   */
  const SEJAM = 3600

  const payload = () => getPayload({ config })

  /** Menu header memakai nama, slug, dan warna pilar, jadi ikut dibuang saat pilar mana pun berubah. */
  export const muatHeader = unstable_cache(async () => ambilHeader(await payload()), ['konten', 'header'], {
    tags: [TAG.header, TAG.koleksi('pilar')],
    revalidate: SEJAM,
  })

  export const muatFooter = unstable_cache(async () => ambilFooter(await payload()), ['konten', 'footer'], {
    tags: [TAG.footer],
    revalidate: SEJAM,
  })

  /** Pengaturan SEO + cloud name untuk `metadata()`, `jsonLd()`, dan URL gambar. */
  export const muatSitus = unstable_cache(async () => ambilSitus(await payload()), ['konten', 'situs'], {
    tags: [TAG.pengaturanSeo, TAG.media],
    revalidate: SEJAM,
  })

  /**
   * Halaman artikel bergantung pada banyak dokumen: pilar, subkategori, penulis, media, artikel
   * terkait, tools dan video yang disematkan, serta dokumen yang ditautkan di isi. Karena itu dipakai
   * tag koleksi, bukan tag per dokumen: perubahan di koleksi itu membuang cache semua halaman artikel
   * (dirender ulang saat diminta berikutnya), sehingga tidak ada halaman yang basi. Tag `artikel` juga
   * membuang halaman 404 yang tersimpan saat artikel dengan slug itu terbit.
   */
  export const TAG_ARTIKEL = [
    TAG.koleksi('artikel'),
    TAG.koleksi('pilar'),
    TAG.koleksi('subkategori'),
    TAG.koleksi('penulis'),
    TAG.koleksi('tools'),
    TAG.koleksi('video'),
    TAG.koleksi('halaman'),
    TAG.media,
  ]

  export const muatArtikel = unstable_cache(
    async (slug: string, glosarium: boolean) => ambilArtikel(await payload(), slug, { glosarium }),
    ['konten', 'artikel'],
    { tags: TAG_ARTIKEL, revalidate: SEJAM },
  )
  ```

  `src/modules/konten/index.ts`

  ```ts
  /**
   * Modul konten publik: data siap render untuk halaman situs (Rencana 4).
   *
   * - `muat*()` dipanggil halaman dan layout: query Payload yang di-cache dengan tag `TAG`.
   * - `ambil*(payload)` versi tanpa cache untuk tes integrasi dan skrip.
   * - Fungsi murni (`susunHeader`, `susunArtikel`, `tanggalIndonesia`, ...) menerjemahkan dokumen
   *   Payload ke tipe di `tipe.ts`, supaya komponen tidak membaca relasi Payload mentah.
   */
  export { muatArtikel, muatFooter, muatHeader, muatSitus, TAG_ARTIKEL } from './cache'
  export { ambilArtikel, ambilFooter, ambilHeader } from './data'
  export { HAK_CIPTA_BAWAAN, LABEL_SOSIAL, susunFooter, susunHeader, tautanInternal, TOOLS_BAWAAN } from './tampilan'
  export {
    gabungTerkait,
    kartuArtikel,
    KATA_PER_MENIT,
    MAKS_TERKAIT,
    mediaTampil,
    MIN_DAFTAR_ISI,
    penulisRingkas,
    pilarRingkas,
    susunArtikel,
    tandaiSubjudul,
    tanggalIndonesia,
    waktuBaca,
  } from './artikel'
  export type * from './tipe'
  ```

- [ ] **Langkah 6: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 31 passed (31)`, `Tests 228 passed (228)`; integrasi `Test Files 15 passed (15)`, `Tests 54 passed (54)`. Tes integrasi ini membuat tool `ipk` lalu menghapusnya; bila run sebelumnya gagal di tengah, sisa tool itu dihapus di awal tes.

- [ ] **Langkah 7: Dorong skema ke database dev**

  Mode produksi (`pnpm build`, `pnpm start`) tidak mendorong skema. Jalankan seed sekali supaya kolom `pilar.disclaimer` ada di database dev dan teks disclaimer terisi:

  ```bash
  pnpm seed
  PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -d pointlat -Atc "select slug, disclaimer is not null from pilar order by urutan"
  ```

  Hasil yang diharapkan: `Seed selesai.`, lalu `uang-karier|t`, `tekno|f`, `belajar|f`, `sehat|t` (dengan Docker: `docker compose exec postgres psql -U postgres -d pointlat -Atc "..."`).

- [ ] **Langkah 8: Commit**

  ```bash
  git add src/collections/Pilar.ts src/collections/Media.ts src/payload-types.ts src/seed/seed.ts src/hooks/revalidasiPublik.ts src/lib/tag.ts src/modules/konten tests/unit/konten-artikel.test.ts tests/int/konten-artikel.int.spec.ts tests/int/seed.int.spec.ts
  git commit -m "feat(konten): data halaman artikel bertag cache, disclaimer pilar, dan revalidasi media"
  ```

### Task 5: Render isi artikel dari Lexical dengan blok callout, tabel, tool, dan video

**Files:**
- Create: `src/modules/konten/isi.ts`, `src/components/isi/IsiArtikel.tsx`, `src/components/isi/GambarIsi.tsx`, `src/components/isi/Callout.tsx`, `src/components/isi/TabelPerbandingan.tsx`, `src/components/isi/KartuTool.tsx`, `src/components/isi/VideoSemat.tsx`, `src/components/isi/Isi.module.css`
- Test: `tests/unit/isi-artikel.test.ts`

**Interfaces:**
- Consumes: `mediaTampil` (Task 4), `Ikon`, `Tautan` (Task 2), `propsGambar`, `bangunUrl` (Rencana 2), `IsiDokumen` (Rencana 3), tipe blok Payload `BlokCallout`, `BlokTabelPerbandingan`, `BlokEmbedTool`, `BlokEmbedVideo`, `Tool`, `Video`, `Media`.
- Produces:
  - `src/modules/konten/isi.ts`: `hrefDokumen(relationTo, value): string | null` (path dokumen ter-populate yang terbit; `artikel`, `pilar`, `halaman`, `tools`, `video`, `penulis`), `paragrafTeks(teks): string[]` (pecah di baris kosong).
  - `IsiArtikel({ isi, cloudName })` (server component), `GambarIsi({ media, cloudName })`, `Keterangan({ media })`, `UKURAN_KOLOM_ISI = '(min-width: 64rem) 720px, 92vw'`, `Callout({ blok })`, `TabelPerbandingan({ blok })`, `KartuTool({ tool })`, `VideoSemat({ video, cloudName })`.

`RichText` Payload dipakai dengan converter sendiri, semuanya server component sehingga isi artikel tidak menambah JavaScript klien:

- **heading**: `id` dari `idJangkar` (Task 4) untuk daftar isi; tag di luar H2-H6 menjadi H2.
- **link/autolink**: tautan internal ke dokumen terbit lewat `pathFor`; ke dokumen yang belum terbit, terhapus, atau tidak ter-populate menjadi teks biasa (pembaca tidak mendarat di 404). `newTab` memberi `target="_blank" rel="noopener noreferrer"` dan keterangan "(tab baru)" untuk pembaca layar. Path situs lewat `next/link`.
- **upload**: gambar lewat `next/image` (lazy, ukuran dari `propsGambar` preset `asli` maks 1440px, `sizes` kolom isi) dengan keterangan dan kredit; unggahan video di isi dilewati (video dipasang lewat blok `embedVideo`).
- **relationship**: "Baca juga: {judul}" ke dokumen terbit.
- **blok**: `callout` (label teks Info/Tips/Perhatian, tidak hanya ikon atau garis, `role="note"`), `tabelPerbandingan` (kolom pertama menjadi kepala baris, pembungkus bisa digeser dan difokus keyboard sebagai region berlabel), `embedTool` (kartu ajakan "Hitung {nama}" ke `/tools/{slug}`; kalkulatornya Rencana 5), `embedVideo` (`<video>` HLS + MP4, `preload="none"`, transkrip di `<details>`).
- Node lain yang tidak dikenal tidak dirender (bawaan Payload menulis teks "unknown node").

Tes merender komponen dengan `renderToStaticMarkup` dan mengganti `next/image` dengan `<img>` biasa (konfigurasi loader hanya ada di dalam Next).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/isi-artikel.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it, vi } from 'vitest'

  import { IsiArtikel } from '@/components/isi/IsiArtikel'
  import { hrefDokumen, paragrafTeks } from '@/modules/konten/isi'

  import { isiLexical, p, tautan, tautanInternal, unggahan } from './seo-contoh'

  // next/image butuh konfigurasi loader dari next.config; di tes cukup <img> biasa dengan props yang sama.
  vi.mock('next/image', () => ({
    default: (props: Record<string, unknown>) => h('img', { src: props.src, alt: props.alt, width: props.width, height: props.height, sizes: props.sizes }),
  }))

  const gambar = { id: 5, publicId: 'point/gambar/slip', jenis: 'gambar', alt: 'Slip gaji', width: 1600, height: 900, caption: 'Contoh slip gaji', kredit: 'Foto: Redaksi' }
  const blok = (fields: Record<string, unknown>) => ({ type: 'block', version: 2, format: '', fields: { id: 'b', blockName: '', ...fields } })
  const render = (children: Record<string, unknown>[]) => renderToStaticMarkup(h(IsiArtikel, { isi: isiLexical(children), cloudName: 'demo' }))

  describe('IsiArtikel', () => {
    it('heading memakai id jangkar; tautan internal ke dokumen terbit memakai pathFor', () => {
      const html = render([
        { type: 'heading', tag: 'h2', idJangkar: 'cara-hitung', version: 1, children: [{ type: 'text', text: 'Cara hitung', version: 1 }] },
        p(
          tautanInternal({ id: 1, slug: 'ptkp', tipe: 'glosarium', _status: 'published' } as never, 'PTKP'),
          ' dan ',
          tautanInternal({ id: 2, slug: 'draf', tipe: 'panduan', _status: 'draft' } as never, 'draf'),
          ' dan ',
          tautan('/tentang', 'tentang kami'),
        ),
      ])
      expect(html).toContain('<h2 id="cara-hitung">Cara hitung</h2>')
      expect(html).toContain('<a href="/glosarium/ptkp">PTKP</a>')
      expect(html).toContain(' dan draf dan ')
      expect(html).toContain('<a href="/tentang">tentang kami</a>')
    })

    it('tautan tab baru diberi rel dan keterangan untuk pembaca layar', () => {
      const html = render([p({ ...tautan('https://pajak.go.id', 'DJP'), fields: { linkType: 'custom', newTab: true, url: 'https://pajak.go.id' } })])
      expect(html).toContain('<a href="https://pajak.go.id" target="_blank" rel="noopener noreferrer">DJP<span class="sr"> (tab baru)</span></a>')
    })

    it('gambar di isi memakai URL Cloudinary, ukuran asli, keterangan, dan kredit; video unggahan dilewati', () => {
      const html = render([unggahan(gambar as never), unggahan({ ...gambar, jenis: 'video' } as never), unggahan(9)])
      expect(html).toContain(
        '<img src="https://res.cloudinary.com/demo/image/upload/c_limit,w_1440,f_auto,q_auto/point/gambar/slip" alt="Slip gaji" width="1440" height="810" sizes="(min-width: 64rem) 720px, 92vw"/>',
      )
      expect(html).toContain('Contoh slip gaji · Foto: Redaksi')
      expect(html.match(/<img/g)).toHaveLength(1)
    })

    it('blok callout, tabel perbandingan, embed tool, dan embed video', () => {
      const html = render([
        blok({ blockType: 'callout', gaya: 'peringatan', judul: 'Cek status PTKP', isi: 'Paragraf satu.\n\nParagraf dua.' }),
        blok({
          blockType: 'tabelPerbandingan',
          judul: 'TER A vs TER B',
          kolom: [{ label: 'Status' }, { label: 'Kategori' }],
          baris: [{ sel: [{ teks: 'TK/0' }, { teks: 'A' }] }],
        }),
        blok({ blockType: 'embedTool', tool: { id: 3, nama: 'Gaji Bersih', slug: 'gaji-bersih', ringkasan: 'Hitung gaji bersih.', _status: 'published' } }),
        blok({ blockType: 'embedTool', tool: { id: 4, nama: 'THR', slug: 'thr', ringkasan: 'Hitung THR.', _status: 'draft' } }),
        blok({
          blockType: 'embedVideo',
          video: { judul: 'PPh 21 dalam 45 detik', transkrip: 'Baris satu.', _status: 'published', file: { ...gambar, publicId: 'point/video/pph', jenis: 'video', width: 1080, height: 1920 } },
        }),
      ])
      expect(html).toMatch(/<div role="note" class="[^"]*" data-gaya="peringatan">.*<p class="[^"]*">Perhatian<\/p><p class="[^"]*">Cek status PTKP<\/p><p>Paragraf satu\.<\/p><p>Paragraf dua\.<\/p>/)
      expect(html).toMatch(/<div class="[^"]*" role="region" aria-label="TER A vs TER B" tabindex="0"><table><caption>TER A vs TER B<\/caption>/)
      expect(html).toContain('<th scope="col">Status</th>')
      expect(html).toContain('<th scope="row">TK/0</th><td>A</td>')
      expect(html).toMatch(/<a class="[^"]*" href="\/tools\/gaji-bersih">.*Hitung Gaji Bersih/)
      expect(html).not.toContain('/tools/thr')
      expect(html).toContain('poster="https://res.cloudinary.com/demo/video/upload/so_auto/c_limit,w_720,q_auto/point/video/pph.jpg"')
      expect(html).toContain('<source src="https://res.cloudinary.com/demo/video/upload/sp_auto/point/video/pph.m3u8" type="application/vnd.apple.mpegurl"/>')
      expect(html).toContain('<source src="https://res.cloudinary.com/demo/video/upload/q_auto/point/video/pph.mp4" type="video/mp4"/>')
      expect(html).toContain('<summary>Baca transkrip</summary><p>Baris satu.</p>')
    })

    it('relationship menjadi "Baca juga"; node dan blok yang tidak dikenal tidak dirender', () => {
      const html = render([
        { type: 'relationship', version: 2, relationTo: 'artikel', value: { id: 7, judul: 'Cara hitung THR', slug: 'cara-hitung-thr', tipe: 'panduan', _status: 'published' } },
        blok({ blockType: 'blokBaru' }),
        { type: 'nodeAsing', version: 1 },
      ])
      expect(html).toMatch(/Baca juga: <a href="\/cara-hitung-thr">Cara hitung THR<\/a>/)
      expect(html).not.toContain('unknown')
    })
  })

  describe('hrefDokumen dan paragrafTeks', () => {
    it('hanya dokumen ter-populate dan terbit yang punya path', () => {
      expect(hrefDokumen('pilar', { slug: 'tekno' })).toBe('/tekno')
      expect(hrefDokumen('video', { slug: 'pph', _status: 'published' })).toBe('/video/pph')
      expect(hrefDokumen('artikel', 12)).toBeNull()
      expect(hrefDokumen('subkategori', { slug: 'pajak' })).toBeNull()
    })

    it('memecah teks di baris kosong', () => {
      expect(paragrafTeks('Satu.\n\n  Dua.\n\n\n')).toEqual(['Satu.', 'Dua.'])
      expect(paragrafTeks(null)).toEqual([])
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/isi-artikel.test.ts` dengan `Cannot find package '@/components/isi/IsiArtikel'`.

- [ ] **Langkah 3: Bantuan isi**

  `src/modules/konten/isi.ts`

  ```ts
  import type { TipeArtikel } from '@/lib/konstanta'
  import { pathFor } from '@/lib/paths'

  type DokumenTertaut = { slug?: string | null; tipe?: TipeArtikel | null; _status?: string | null }

  /**
   * Path dokumen yang ditautkan di isi (tautan internal Lexical, node relationship, blok embed).
   * `null` bila relasi belum di-populate, tidak punya slug, atau dokumennya belum terbit: tautan itu
   * dirender sebagai teks biasa supaya pembaca tidak mendarat di 404.
   */
  export function hrefDokumen(relationTo: string | null | undefined, value: unknown): string | null {
    if (!value || typeof value !== 'object') return null
    const doc = value as DokumenTertaut
    if (!doc.slug) return null
    if ('_status' in doc && doc._status !== 'published') return null
    switch (relationTo) {
      case 'artikel':
        return doc.tipe ? pathFor({ jenis: 'artikel', slug: doc.slug, tipe: doc.tipe }) : null
      case 'pilar':
      case 'halaman':
      case 'tools':
      case 'video':
      case 'penulis':
        return pathFor({ jenis: relationTo, slug: doc.slug })
      default:
        return null
    }
  }

  /** Teks area (callout, transkrip) dipecah menjadi paragraf di baris kosong. */
  export function paragrafTeks(teks: string | null | undefined): string[] {
    return (teks ?? '')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
  }
  ```

- [ ] **Langkah 4: Komponen isi**

  `src/components/isi/Isi.module.css`

  ```css
  /* Isi artikel: lebar baris 60-75 karakter, body 18px (min 16px di HP), leading 1,6 (spesifikasi §4). */
  .prosa {
    max-width: var(--baris-isi);
    font-size: var(--teks-isi);
    line-height: var(--tinggi-isi);
  }

  .prosa > * + * {
    margin-top: 1.1em;
  }

  .prosa h2 {
    margin-top: var(--ruang-12);
    font-size: var(--teks-h2);
    font-stretch: var(--lebar-h2);
    font-weight: 900;
    letter-spacing: -0.01em;
    scroll-margin-top: var(--ruang-6);
  }

  .prosa h3,
  .prosa h4 {
    margin-top: var(--ruang-8);
    font-size: var(--teks-h3);
    font-stretch: var(--lebar-h3);
    font-weight: 800;
    scroll-margin-top: var(--ruang-6);
  }

  .prosa h2 + *,
  .prosa h3 + *,
  .prosa h4 + * {
    margin-top: var(--ruang-3);
  }

  .prosa a {
    text-decoration: underline;
    text-decoration-thickness: var(--garis-tipis);
  }

  .prosa ul,
  .prosa ol {
    padding-left: 1.4em;
  }

  .prosa li + li {
    margin-top: var(--ruang-2);
  }

  .prosa blockquote {
    padding-left: var(--ruang-5);
    border-left: 4px solid var(--garis);
    font-size: var(--teks-deck);
    font-weight: 600;
  }

  .prosa hr {
    margin-block: var(--ruang-10);
    border: 0;
    border-top: var(--garis-tebal) solid var(--garis);
  }

  .prosa code {
    padding: 0.1em 0.3em;
    border-radius: 6px;
    background: var(--permukaan);
    font-size: 0.9em;
  }

  .gambar img {
    width: 100%;
    height: auto;
    border-radius: var(--radius-kontrol);
  }

  .keterangan {
    margin-top: var(--ruang-2);
    color: var(--teks-sekunder);
    font-size: var(--teks-kecil);
    line-height: 1.45;
  }

  .callout {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--ruang-1) var(--ruang-3);
    padding: var(--ruang-5);
    border-radius: var(--radius-kontrol);
    background: var(--permukaan);
  }

  .callout[data-gaya='peringatan'] {
    border: var(--garis-tebal) solid var(--garis);
  }

  .callout svg {
    margin-top: 3px;
  }

  .callout > div > * + * {
    margin-top: var(--ruang-2);
  }

  .label {
    font-size: var(--teks-label);
    font-weight: 800;
    letter-spacing: var(--jarak-label);
    text-transform: uppercase;
  }

  .calloutJudul {
    font-weight: 800;
  }

  .tabel {
    max-width: 100%;
    overflow-x: auto;
    border: var(--garis-tipis) solid var(--garis);
    border-radius: var(--radius-kontrol);
  }

  .tabel table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--teks-kecil);
    line-height: 1.45;
  }

  .tabel caption {
    padding: var(--ruang-3) var(--ruang-4);
    font-weight: 800;
    text-align: left;
  }

  .tabel th,
  .tabel td {
    padding: var(--ruang-3) var(--ruang-4);
    border-top: 1px solid var(--garis);
    text-align: left;
    vertical-align: top;
  }

  .tabel thead th {
    background: var(--permukaan);
    font-weight: 800;
  }

  .kartuTool {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
    gap: var(--ruang-2) var(--ruang-4);
    padding: var(--ruang-5);
    border: var(--garis-tebal) solid var(--garis);
    border-radius: var(--radius-kartu);
    text-decoration: none;
    transition: transform var(--durasi-cepat) var(--kurva);
  }

  .prosa .kartuTool {
    text-decoration: none;
  }

  .kartuTool:hover {
    transform: translateY(-2px);
  }

  .kartuTool strong {
    display: block;
    font-size: var(--teks-h3);
    font-stretch: var(--lebar-h3);
    font-weight: 800;
    line-height: var(--tinggi-judul);
  }

  .ajakan {
    grid-column: 2;
    display: inline-flex;
    align-items: center;
    gap: var(--ruang-2);
    font-weight: 700;
  }

  .video {
    width: min(100%, 360px);
  }

  .video video {
    width: 100%;
    height: auto;
    border-radius: 18px;
  }

  .transkrip summary {
    min-height: var(--sentuh-min);
    display: flex;
    align-items: center;
    font-weight: 700;
    cursor: pointer;
  }

  .bacaJuga {
    font-weight: 700;
  }
  ```

  `src/components/isi/GambarIsi.tsx`

  ```tsx
  import Image from 'next/image'

  import type { MediaTampil } from '@/modules/konten/tipe'
  import { propsGambar } from '@/modules/media/props'

  import gaya from './Isi.module.css'

  /** Lebar kolom isi artikel di desktop; HP memakai hampir selebar layar. */
  export const UKURAN_KOLOM_ISI = '(min-width: 64rem) 720px, 92vw'

  export function Keterangan({ media }: { media: Pick<MediaTampil, 'caption' | 'kredit'> }) {
    const teks = [media.caption, media.kredit].filter(Boolean).join(' · ')
    return teks ? <figcaption className={gaya.keterangan}>{teks}</figcaption> : null
  }

  /** Gambar di isi artikel: lazy (di bawah lipatan), ukuran dari Cloudinary, keterangan dan kredit. */
  export function GambarIsi({ media, cloudName }: { media: MediaTampil | null; cloudName: string }) {
    const props = propsGambar(media, 'asli', { cloudName, lebar: 1440 })
    if (!media || !props) return null
    return (
      <figure className={gaya.gambar}>
        <Image {...props} alt={props.alt} sizes={UKURAN_KOLOM_ISI} />
        <Keterangan media={media} />
      </figure>
    )
  }
  ```

  `src/components/isi/Callout.tsx`

  ```tsx
  import { Ikon, type NamaIkon } from '@/components/dasar/Ikon'
  import { paragrafTeks } from '@/modules/konten/isi'
  import type { BlokCallout } from '@/payload-types'

  import gaya from './Isi.module.css'

  const GAYA: Record<BlokCallout['gaya'], { label: string; ikon: NamaIkon }> = {
    info: { label: 'Info', ikon: 'info' },
    tips: { label: 'Tips', ikon: 'lightbulb' },
    peringatan: { label: 'Perhatian', ikon: 'triangle-alert' },
  }

  /** Kotak catatan di isi. Jenisnya ditulis sebagai label, tidak hanya lewat ikon atau garis. */
  export function Callout({ blok }: { blok: Pick<BlokCallout, 'gaya' | 'judul' | 'isi'> }) {
    const { label, ikon } = GAYA[blok.gaya] ?? GAYA.info
    return (
      <div role="note" className={gaya.callout} data-gaya={blok.gaya}>
        <Ikon nama={ikon} />
        <div>
          <p className={gaya.label}>{label}</p>
          {blok.judul && <p className={gaya.calloutJudul}>{blok.judul}</p>}
          {paragrafTeks(blok.isi).map((teks, i) => (
            <p key={i}>{teks}</p>
          ))}
        </div>
      </div>
    )
  }
  ```

  `src/components/isi/TabelPerbandingan.tsx`

  ```tsx
  import type { BlokTabelPerbandingan } from '@/payload-types'

  import gaya from './Isi.module.css'

  /**
   * Tabel perbandingan: kolom pertama menjadi kepala baris. Pembungkusnya bisa digeser di HP dan
   * bisa difokus keyboard (region berlabel) supaya isinya tetap terjangkau.
   */
  export function TabelPerbandingan({ blok }: { blok: Pick<BlokTabelPerbandingan, 'judul' | 'kolom' | 'baris'> }) {
    const label = blok.judul?.trim() || 'Tabel perbandingan'
    return (
      <div className={gaya.tabel} role="region" aria-label={label} tabIndex={0}>
        <table>
          {blok.judul && <caption>{blok.judul}</caption>}
          <thead>
            <tr>
              {blok.kolom.map((k, i) => (
                <th key={k.id ?? i} scope="col">
                  {k.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {blok.baris.map((b, i) => (
              <tr key={b.id ?? i}>
                {b.sel.map((s, j) =>
                  j === 0 ? (
                    <th key={s.id ?? j} scope="row">
                      {s.teks}
                    </th>
                  ) : (
                    <td key={s.id ?? j}>{s.teks}</td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }
  ```

  `src/components/isi/KartuTool.tsx`

  ```tsx
  import { Ikon } from '@/components/dasar/Ikon'
  import { Tautan } from '@/components/dasar/Tautan'
  import { hrefDokumen } from '@/modules/konten/isi'
  import type { Tool } from '@/payload-types'

  import gaya from './Isi.module.css'

  /** Blok "embed tool": ajakan ke kalkulator. Kalkulator sendiri ada di halaman tools (Rencana 5). */
  export function KartuTool({ tool }: { tool: number | Pick<Tool, 'nama' | 'slug' | 'ringkasan' | '_status'> }) {
    const href = hrefDokumen('tools', tool)
    if (!href || typeof tool !== 'object') return null
    return (
      <Tautan href={href} className={gaya.kartuTool}>
        <Ikon nama="calculator" ukuran={28} />
        <span>
          <strong>{tool.nama}</strong>
          {tool.ringkasan}
        </span>
        <span className={gaya.ajakan}>
          Hitung {tool.nama}
          <Ikon nama="arrow-right" />
        </span>
      </Tautan>
    )
  }
  ```

  `src/components/isi/VideoSemat.tsx`

  ```tsx
  import { mediaTampil } from '@/modules/konten/artikel'
  import { paragrafTeks } from '@/modules/konten/isi'
  import { bangunUrl } from '@/modules/media/url'
  import type { Video } from '@/payload-types'

  import gaya from './Isi.module.css'

  type VideoUntukSemat = Pick<Video, 'judul' | 'file' | 'poster' | 'transkrip' | '_status'>

  /**
   * Video vertikal di isi tanpa JavaScript: HLS untuk browser yang memutarnya langsung (Safari, Chrome
   * Android), MP4 cadangan untuk yang lain. Tidak dimuat sebelum diputar (`preload="none"`), dan
   * transkrip selalu tersedia di bawahnya.
   */
  export function VideoSemat({ video, cloudName }: { video: number | VideoUntukSemat; cloudName: string }) {
    if (typeof video !== 'object' || video._status !== 'published') return null
    const file = mediaTampil(video.file)
    if (!file) return null
    const poster = mediaTampil(video.poster)
    const urlPoster = poster
      ? bangunUrl(cloudName, poster.publicId, 'asli', { lebar: 720 })
      : bangunUrl(cloudName, file.publicId, 'poster', { lebar: 720 })
    return (
      <figure className={gaya.video}>
        <video controls playsInline preload="none" poster={urlPoster} width={file.width} height={file.height} aria-label={video.judul}>
          <source src={bangunUrl(cloudName, file.publicId, 'hls')} type="application/vnd.apple.mpegurl" />
          <source src={bangunUrl(cloudName, file.publicId, 'mp4')} type="video/mp4" />
        </video>
        <figcaption className={gaya.keterangan}>{video.judul}</figcaption>
        <details className={gaya.transkrip}>
          <summary>Baca transkrip</summary>
          {paragrafTeks(video.transkrip).map((teks, i) => (
            <p key={i}>{teks}</p>
          ))}
        </details>
      </figure>
    )
  }
  ```

  `src/components/isi/IsiArtikel.tsx`

  ```tsx
  import type { SerializedAutoLinkNode, SerializedLinkNode } from '@payloadcms/richtext-lexical'
  import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
  import { RichText, type JSXConverter, type JSXConvertersFunction } from '@payloadcms/richtext-lexical/react'
  import type { ReactNode } from 'react'

  import { Tautan } from '@/components/dasar/Tautan'
  import { mediaTampil } from '@/modules/konten/artikel'
  import { hrefDokumen } from '@/modules/konten/isi'
  import type { IsiDokumen } from '@/modules/seo/lexical'
  import type { BlokCallout, BlokEmbedTool, BlokEmbedVideo, BlokTabelPerbandingan, Media } from '@/payload-types'

  import { Callout } from './Callout'
  import { GambarIsi } from './GambarIsi'
  import gaya from './Isi.module.css'
  import { KartuTool } from './KartuTool'
  import { TabelPerbandingan } from './TabelPerbandingan'
  import { VideoSemat } from './VideoSemat'

  const HEADING = new Set(['h2', 'h3', 'h4', 'h5', 'h6'])

  /** Tautan internal ke dokumen terbit memakai path `pathFor`; tautan ke dokumen yang belum terbit menjadi teks. */
  const tautan: JSXConverter<SerializedLinkNode | SerializedAutoLinkNode> = ({ node, nodesToJSX }) => {
    const anak = nodesToJSX({ nodes: node.children })
    const { fields } = node
    const href = fields.linkType === 'internal' ? hrefDokumen(fields.doc?.relationTo, fields.doc?.value) : fields.url?.trim()
    if (!href) return <>{anak}</>
    if (fields.newTab) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {anak}
          <span className="sr"> (tab baru)</span>
        </a>
      )
    }
    return <Tautan href={href}>{anak}</Tautan>
  }

  function konverter(cloudName: string): JSXConvertersFunction {
    return ({ defaultConverters }) => ({
      ...defaultConverters,
      // Id jangkar dari `tandaiSubjudul` dipakai daftar isi. H1 di isi sudah diturunkan ke H2.
      heading: ({ node, nodesToJSX }) => {
        const { tag, idJangkar } = node as unknown as { tag: string; idJangkar?: string }
        const Tag = (HEADING.has(tag) ? tag : 'h2') as 'h2'
        return <Tag id={idJangkar}>{nodesToJSX({ nodes: node.children })}</Tag>
      },
      link: tautan,
      autolink: tautan,
      upload: ({ node }) => {
        const media = mediaTampil((node as unknown as { value: Media | number }).value)
        return media?.jenis === 'gambar' ? <GambarIsi media={media} cloudName={cloudName} /> : null
      },
      relationship: ({ node }) => {
        const { relationTo, value } = node as unknown as { relationTo: string; value: { judul?: string; nama?: string } | number }
        const href = hrefDokumen(relationTo, value)
        if (!href || typeof value !== 'object') return null
        return (
          <p className={gaya.bacaJuga}>
            Baca juga: <Tautan href={href}>{value.judul ?? value.nama}</Tautan>
          </p>
        )
      },
      blocks: {
        callout: ({ node }: { node: { fields: BlokCallout } }) => <Callout blok={node.fields} />,
        tabelPerbandingan: ({ node }: { node: { fields: BlokTabelPerbandingan } }) => <TabelPerbandingan blok={node.fields} />,
        embedTool: ({ node }: { node: { fields: BlokEmbedTool } }) => <KartuTool tool={node.fields.tool} />,
        embedVideo: ({ node }: { node: { fields: BlokEmbedVideo } }) => <VideoSemat video={node.fields.video} cloudName={cloudName} />,
      },
      // Node yang tidak dikenal tidak dirender (bawaan Payload menulis "unknown node").
      unknown: () => null,
    })
  }

  /** Isi artikel dari JSON Lexical (sudah ditandai `tandaiSubjudul`), dirender di server tanpa JavaScript klien. */
  export function IsiArtikel({ isi, cloudName }: { isi: IsiDokumen; cloudName: string }): ReactNode {
    if (!isi?.root) return null
    return <RichText data={isi as unknown as SerializedEditorState} converters={konverter(cloudName)} className={gaya.prosa} />
  }
  ```

- [ ] **Langkah 5: Jalankan tes, type check, lint**

  Jalankan:

  ```bash
  pnpm test:unit
  pnpm typecheck
  pnpm lint
  ```

  Hasil yang diharapkan: unit `Test Files 32 passed (32)`, `Tests 235 passed (235)`; type check dan lint bersih.

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/modules/konten/isi.ts src/components/isi tests/unit/isi-artikel.test.ts
  git commit -m "feat(ui): render isi artikel dari Lexical dengan blok callout, tabel, tool, dan video"
  ```

### Task 6: Halaman artikel dengan Intinya, daftar isi, sumber, FAQ, terkait, dan penulis

**Files:**
- Create: `src/app/(frontend)/[...jalur]/page.tsx`, `src/components/artikel/HalamanArtikel.tsx`, `src/components/artikel/KotakIntinya.tsx`, `src/components/artikel/DaftarIsi.tsx`, `src/components/artikel/BlokSumber.tsx`, `src/components/artikel/Faq.tsx`, `src/components/artikel/Catatan.tsx`, `src/components/artikel/ProfilPenulis.tsx`, `src/components/artikel/Artikel.module.css`, `src/components/kartu/KartuArtikel.tsx`, `src/components/kartu/KartuArtikel.module.css`, `src/components/dasar/ChipPilar.tsx`, `src/components/dasar/ChipPilar.module.css`, `src/components/dasar/RemahRoti.tsx`, `src/components/dasar/RemahRoti.module.css`, `src/components/dasar/JsonLd.tsx`
- Modify: `tests/e2e/data.ts`, `tests/e2e/siapkan.ts` (ganti seluruh isi keduanya)
- Test: `tests/unit/halaman-artikel.test.ts`, `tests/e2e/artikel.spec.ts`

**Interfaces:**
- Consumes: `muatArtikel`, `muatSitus`, `tanggalIndonesia`, tipe `DataArtikel`, `KartuArtikel`, `Subjudul`, `Sumber`, `Faq`, `PenulisRingkas`, `PilarRingkas` (Task 4), `IsiArtikel`, `Keterangan`, `UKURAN_KOLOM_ISI` (Task 5), `Ikon`, `Tautan` (Task 2), `metadata`, `jsonLd`, `remahRoti`, `serialisasiJsonLd` (Rencana 3), `LABEL_TIPE_ARTIKEL`.
- Produces:
  - Rute `/{slug}` lewat `src/app/(frontend)/[...jalur]/page.tsx` (ISR, `generateStaticParams` kosong). Path yang tidak cocok dengan artikel terbit sementara `notFound()`; Task 8 menggantinya dengan `tanganiTidakAda`.
  - `HalamanArtikel({ artikel, situs })` (dipakai lagi untuk glosarium di Task 7).
  - `KartuArtikel({ kartu, tingkat? })`, `DaftarKartu({ kartu })`, `ChipPilar({ pilar })`, `RemahRoti({ remah })`, `JsonLd({ data })`, `KotakIntinya({ poin, warna })`, `DaftarIsi({ subjudul })`, `BlokSumber({ sumber })`, `Faq({ faq })`, `Catatan({ teks })`, `ProfilPenulis({ penulis, cloudName })`.
  - `tests/e2e/data.ts`: `SLUG` (`panduan`, `explainer`, `sehat`, `draf`), `JUDUL_PANDUAN`, pembuat JSON Lexical `p`, `h2`, `tautanKe`, `gambar`, `blok`, `isi`.

Urutan halaman mengikuti spesifikasi §4: remah roti (dari `remahRoti()`, sama dengan schema BreadcrumbList), kicker (chip pilar + tipe), H1, deck, byline (penulis, "Diperbarui {tanggal}", "N menit baca"), kotak Intinya, daftar isi, gambar utama, isi, catatan disclaimer pilar, sumber, FAQ, artikel terkait ("Baca juga"), profil penulis. Mulai 1024px isi berada di kolom 720px dan daftar isi menempel di kolom kanan 280px; di bawahnya satu kolom dengan daftar isi tepat setelah Intinya. Gambar utama memakai preset `hero` (16:9) dengan `loading="eager"` dan `fetchPriority="high"` karena biasanya elemen LCP; gambar lain lazy.

Kartu artikel berlatar warna pilar seperti mockup Kartu Intinya: label pilar, judul (heading supaya daftar kartu bisa dinavigasi), "Intinya:" poin pertama, dan tipe. Seluruh kartu satu tautan; `data-warna` di tautan mengisi warna pilar. Teks putih di hijau dan oranye, ink di kuning dan koral (kontras di tabel spesifikasi §4).

`generateMetadata` dan halaman memakai satu pemanggilan data per permintaan lewat `cache()` React. Metadata dan JSON-LD dibangun modul SEO dari `artikel.seo`.

Konten contoh E2E dibuat ulang setiap run: panduan Uang & Karier (tiga H2, callout, tabel, tautan internal, gambar di isi, FAQ, dua sumber, artikel terkait pilihan editor), explainer Uang & Karier, explainer Sehat (disclaimer Sehat), dan satu draf.

- [ ] **Langkah 1: Tulis tes unit yang gagal**

  `tests/unit/halaman-artikel.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it, vi } from 'vitest'

  import { HalamanArtikel } from '@/components/artikel/HalamanArtikel'
  import { RemahRoti } from '@/components/dasar/RemahRoti'
  import type { DataArtikel } from '@/modules/konten/tipe'

  import { artikel as dokumen, isiLexical, p, situs } from './seo-contoh'

  vi.mock('next/image', () => ({
    default: (props: Record<string, unknown>) => h('img', { src: props.src, alt: props.alt, width: props.width, height: props.height }),
  }))

  const pilar = { nama: 'Uang & Karier', slug: 'uang-karier', href: '/uang-karier', warna: 'hijau' as const, disclaimer: 'Bukan saran keuangan.' }

  const data: DataArtikel = {
    id: 10,
    judul: 'Cara hitung gaji bersih',
    tipe: 'panduan',
    href: '/cara-hitung-gaji-bersih',
    deck: 'Gaji kotor dikurangi PPh 21 dan BPJS.',
    intinya: ['Poin satu.', 'Poin dua.'],
    diperbarui: '2026-11-03T18:30:00.000Z',
    waktuBaca: 7,
    pilar,
    penulis: { nama: 'Rani Wulandari', href: '/penulis/rani-wulandari', bio: 'Menulis soal pajak.', keahlian: ['Pajak'], foto: null },
    gambar: { publicId: 'point/gambar/slip', jenis: 'gambar', alt: 'Slip gaji', width: 1600, height: 900, caption: null, kredit: 'Foto: Redaksi' },
    isi: isiLexical([{ type: 'heading', tag: 'h2', idJangkar: 'komponen', version: 1, children: [{ type: 'text', text: 'Komponen', version: 1 }] }, p('Isi.')]),
    daftarIsi: [
      { id: 'komponen', teks: 'Komponen' },
      { id: 'cara', teks: 'Cara' },
      { id: 'contoh', teks: 'Contoh' },
    ],
    faq: [{ pertanyaan: 'Apakah THR kena pajak?', jawaban: 'Ya.' }],
    sumber: [{ judul: 'DJP', url: 'https://www.pajak.go.id/', penerbit: 'DJP', diaksesPada: null }],
    terkait: [{ id: 11, judul: 'Apa itu TER', href: '/apa-itu-ter', tipe: 'explainer', pilar, intinya: 'TER adalah tarif efektif.' }],
    seo: dokumen,
  }

  const render = (artikel: DataArtikel) => renderToStaticMarkup(h(HalamanArtikel, { artikel, situs }))

  describe('HalamanArtikel', () => {
    it('bagian tampil dengan urutan spesifikasi §4', () => {
      const html = render(data)
      const urutan = [
        'aria-label="Remah roti"',
        '>Uang &amp; Karier</span><span>Panduan</span>',
        '<h1',
        'Gaji kotor dikurangi PPh 21 dan BPJS.',
        'href="/penulis/rani-wulandari"',
        'Diperbarui <time dateTime="2026-11-03T18:30:00.000Z">4 November 2026</time>',
        '7 menit baca',
        'aria-labelledby="intinya"',
        'aria-labelledby="daftar-isi"',
        'alt="Slip gaji"',
        '<h2 id="komponen">Komponen</h2>',
        'Bukan saran keuangan.',
        'aria-labelledby="sumber"',
        'aria-labelledby="faq"',
        'aria-labelledby="terkait"',
        'aria-labelledby="penulis"',
      ]
      const posisi = urutan.map((teks) => html.indexOf(teks))
      expect(posisi.every((p) => p >= 0), urutan.filter((_, i) => posisi[i] < 0).join(' | ')).toBe(true)
      expect([...posisi].sort((a, b) => a - b)).toEqual(posisi)
    })

    it('JSON-LD Article dan BreadcrumbList dari modul SEO; kartu terkait berlatar pilar', () => {
      const html = render(data)
      const json = /<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)?.[1] ?? '{}'
      expect(JSON.parse(json)['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual(['Organization', 'WebSite', 'Article', 'BreadcrumbList'])
      expect(html).toMatch(/<a class="[^"]*" data-warna="hijau" href="\/apa-itu-ter">/)
    })

    it('tanpa daftar isi, disclaimer, sumber, FAQ, terkait, dan penulis bila datanya kosong', () => {
      const html = render({ ...data, daftarIsi: [], pilar: { ...pilar, disclaimer: null }, sumber: [], faq: [], terkait: [], penulis: null })
      for (const id of ['daftar-isi', 'sumber', 'faq', 'terkait', 'penulis']) expect(html).not.toContain(`aria-labelledby="${id}"`)
      expect(html).not.toContain('role="note"')
      expect(html).not.toContain('Oleh')
    })
  })

  describe('RemahRoti', () => {
    it('item terakhir adalah halaman ini; satu item saja tidak dirender', () => {
      const html = renderToStaticMarkup(
        h(RemahRoti, {
          remah: [
            { nama: 'Beranda', path: '/' },
            { nama: 'Glosarium', path: '/glosarium' },
            { nama: 'PTKP', path: '/glosarium/ptkp' },
          ],
        }),
      )
      expect(html).toContain('<a href="/">Beranda</a>')
      expect(html).toContain('<a href="/glosarium">Glosarium</a>')
      expect(html).toMatch(/<span aria-current="page" class="[^"]*">PTKP<\/span>/)
      expect(renderToStaticMarkup(h(RemahRoti, { remah: [{ nama: 'Beranda', path: '/' }] }))).toBe('')
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/halaman-artikel.test.ts` dengan `Cannot find package '@/components/artikel/HalamanArtikel'`.

- [ ] **Langkah 3: Komponen dasar halaman**

  `src/components/dasar/ChipPilar.module.css`

  ```css
  .chip {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: var(--ruang-1) var(--ruang-3);
    border-radius: var(--radius-pil);
    background: var(--pilar);
    color: var(--pilar-teks);
    font-size: var(--teks-label);
    font-weight: 800;
    letter-spacing: var(--jarak-label);
    line-height: 1.2;
    text-transform: uppercase;
  }
  ```

  `src/components/dasar/ChipPilar.tsx`

  ```tsx
  import type { PilarRingkas } from '@/modules/konten/tipe'

  import gaya from './ChipPilar.module.css'

  /** Label pilar berlatar warna pilar. Warna selalu didampingi nama pilar (spesifikasi §4). */
  export function ChipPilar({ pilar }: { pilar: Pick<PilarRingkas, 'nama' | 'warna'> }) {
    return (
      <span className={gaya.chip} data-warna={pilar.warna}>
        {pilar.nama}
      </span>
    )
  }
  ```

  `src/components/dasar/RemahRoti.module.css`

  ```css
  .remah ol {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 var(--ruang-1);
    padding: 0;
    list-style: none;
    font-size: var(--teks-kecil);
  }

  .remah li {
    display: inline-flex;
    align-items: center;
    gap: var(--ruang-1);
    min-width: 0;
  }

  .remah a {
    display: inline-flex;
    align-items: center;
    min-height: var(--sentuh-min);
    text-decoration: none;
  }

  .remah a:hover {
    text-decoration: underline;
  }

  .remah svg {
    flex: none;
    color: var(--teks-sekunder);
  }

  .sekarang {
    color: var(--teks-sekunder);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 32ch;
  }
  ```

  `src/components/dasar/RemahRoti.tsx`

  ```tsx
  import type { RemahRoti as Remah } from '@/modules/seo/jsonld'

  import { Ikon } from './Ikon'
  import gaya from './RemahRoti.module.css'
  import { Tautan } from './Tautan'

  /**
   * Breadcrumb tampil. Datanya dari `remahRoti()` modul SEO, sama dengan schema BreadcrumbList
   * (spesifikasi §8). Item terakhir adalah halaman ini.
   */
  export function RemahRoti({ remah }: { remah: Remah[] }) {
    if (remah.length < 2) return null
    return (
      <nav aria-label="Remah roti" className={gaya.remah}>
        <ol>
          {remah.map((r, i) => {
            const terakhir = i === remah.length - 1
            return (
              <li key={r.path}>
                {i > 0 && <Ikon nama="chevron-right" ukuran={16} />}
                {terakhir ? (
                  <span aria-current="page" className={gaya.sekarang}>
                    {r.nama}
                  </span>
                ) : (
                  <Tautan href={r.path}>{r.nama}</Tautan>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    )
  }
  ```

  `src/components/dasar/JsonLd.tsx`

  ```tsx
  import { serialisasiJsonLd, type JsonLd as DataJsonLd } from '@/modules/seo/jsonld'

  /** JSON-LD dari `jsonLd()` modul SEO. Isi di-escape `serialisasiJsonLd` supaya tidak bisa menutup tag skrip. */
  export function JsonLd({ data }: { data: DataJsonLd }) {
    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialisasiJsonLd(data) }} />
  }
  ```

  `src/components/kartu/KartuArtikel.module.css`

  ```css
  .daftar {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    gap: var(--ruang-4);
    padding: 0;
    list-style: none;
  }

  .kartu {
    display: flex;
    flex-direction: column;
    gap: var(--ruang-3);
    height: 100%;
    min-height: 220px;
    padding: 26px;
    border-radius: var(--radius-kartu);
    background: var(--pilar, var(--permukaan));
    color: var(--pilar-teks, var(--teks));
    text-decoration: none;
    transition: transform var(--durasi-cepat) var(--kurva);
  }

  .kartu:hover {
    transform: translateY(-2px);
  }

  .kartu:active {
    transform: scale(0.99);
  }

  .label {
    font-size: var(--teks-label);
    font-weight: 800;
    letter-spacing: var(--jarak-label);
    text-transform: uppercase;
  }

  .judul {
    font-size: 26px;
    font-weight: 800;
    font-stretch: 85%;
    line-height: var(--tinggi-judul);
  }

  .kartu:hover .judul {
    text-decoration: underline;
    text-decoration-thickness: var(--garis-tebal);
  }

  .intinya {
    font-size: 16px;
    line-height: 1.45;
  }

  .tipe {
    margin-top: auto;
    font-size: var(--teks-kecil);
    font-weight: 600;
  }
  ```

  `src/components/kartu/KartuArtikel.tsx`

  ```tsx
  import { Tautan } from '@/components/dasar/Tautan'
  import { LABEL_TIPE_ARTIKEL } from '@/lib/konstanta'
  import type { KartuArtikel as DataKartu } from '@/modules/konten/tipe'

  import gaya from './KartuArtikel.module.css'

  /**
   * Kartu artikel berlatar warna pilar (Arah 3 "Kartu Intinya"): label pilar, judul, dan poin Intinya
   * pertama. Seluruh kartu satu tautan; judulnya heading supaya daftar kartu bisa dinavigasi.
   */
  export function KartuArtikel({ kartu, tingkat = 'h3' }: { kartu: DataKartu; tingkat?: 'h2' | 'h3' }) {
    const Judul = tingkat
    return (
      <Tautan href={kartu.href} className={gaya.kartu} data-warna={kartu.pilar?.warna}>
        {kartu.pilar && <span className={gaya.label}>{kartu.pilar.nama}</span>}
        <Judul className={gaya.judul}>{kartu.judul}</Judul>
        {kartu.intinya && (
          <p className={gaya.intinya}>
            <strong>Intinya:</strong> {kartu.intinya}
          </p>
        )}
        <span className={gaya.tipe}>{LABEL_TIPE_ARTIKEL[kartu.tipe]}</span>
      </Tautan>
    )
  }

  export function DaftarKartu({ kartu }: { kartu: DataKartu[] }) {
    return (
      <ul className={gaya.daftar}>
        {kartu.map((k) => (
          <li key={k.id}>
            <KartuArtikel kartu={k} />
          </li>
        ))}
      </ul>
    )
  }
  ```

- [ ] **Langkah 4: Bagian halaman artikel**

  `src/components/artikel/Artikel.module.css`

  ```css
  /* Halaman artikel (spesifikasi §4): kicker pilar, H1, deck, byline, kotak Intinya, daftar isi, isi,
     sumber, FAQ, artikel terkait, profil penulis. */
  .halaman {
    padding-top: var(--ruang-4);
  }

  .kepala {
    display: grid;
    gap: var(--ruang-4);
    max-width: 880px;
    padding-bottom: var(--ruang-8);
  }

  .kicker {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ruang-3);
    margin-top: var(--ruang-4);
    font-size: var(--teks-kecil);
    font-weight: 600;
  }

  .judul {
    font-size: var(--teks-h1);
    font-stretch: var(--lebar-h1);
    font-weight: 900;
    line-height: var(--tinggi-h1);
    letter-spacing: -0.02em;
  }

  .deck {
    max-width: 60ch;
    font-size: var(--teks-deck);
    line-height: 1.45;
  }

  .byline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ruang-2) var(--ruang-5);
    color: var(--teks-sekunder);
    font-size: var(--teks-kecil);
  }

  .byline > * {
    display: inline-flex;
    align-items: center;
    gap: var(--ruang-2);
  }

  .byline a {
    display: inline-flex;
    align-items: center;
    min-height: var(--sentuh-min);
    color: var(--teks);
    font-weight: 700;
  }

  /* Satu kolom di HP dan tablet; mulai 1024px daftar isi menempel di kolom kanan. */
  .badan {
    display: grid;
    gap: var(--ruang-10);
  }

  .badan > * {
    min-width: 0;
  }

  @media (min-width: 64rem) {
    .badan {
      grid-template-columns: minmax(0, 720px) 280px;
      justify-content: space-between;
      column-gap: var(--ruang-16);
    }

    .badan > * {
      grid-column: 1;
    }

    .badan > .samping {
      grid-column: 2;
      grid-row: 1 / span 9;
      align-self: start;
      position: sticky;
      top: var(--ruang-6);
    }
  }

  .intinya {
    padding: var(--ruang-6);
    border-radius: var(--radius-kartu);
    background: var(--pilar-lembut, var(--permukaan));
  }

  .label {
    display: flex;
    align-items: center;
    gap: var(--ruang-2);
    font-size: var(--teks-label);
    font-weight: 800;
    letter-spacing: var(--jarak-label);
    line-height: 1.2;
    text-transform: uppercase;
  }

  .titik {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--pilar, var(--teks));
    box-shadow: inset 0 0 0 1px var(--garis);
  }

  .poin {
    display: grid;
    gap: var(--ruang-3);
    margin-top: var(--ruang-4);
    padding-left: 1.2em;
    font-size: 19px;
    font-weight: 600;
    line-height: 1.45;
  }

  .poin li::marker {
    color: var(--teks);
  }

  .daftarIsi ol {
    margin-top: var(--ruang-2);
    padding: 0;
    list-style: none;
    counter-reset: bagian;
  }

  .daftarIsi li {
    counter-increment: bagian;
    border-top: 1px solid var(--garis);
  }

  .daftarIsi a {
    display: grid;
    grid-template-columns: 2ch 1fr;
    align-items: center;
    gap: var(--ruang-2);
    min-height: var(--sentuh-min);
    padding-block: var(--ruang-2);
    font-size: var(--teks-kecil);
    font-weight: 600;
    line-height: 1.4;
    text-decoration: none;
  }

  .daftarIsi a::before {
    content: counter(bagian);
    color: var(--teks-sekunder);
  }

  .daftarIsi a:hover {
    text-decoration: underline;
  }

  .gambar img {
    width: 100%;
    height: auto;
    border-radius: var(--radius-kartu);
  }

  .catatan {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--ruang-1) var(--ruang-3);
    max-width: var(--baris-isi);
    padding: var(--ruang-5);
    border: var(--garis-tipis) solid var(--garis);
    border-radius: var(--radius-kontrol);
    font-size: var(--teks-kecil);
    line-height: 1.5;
  }

  .catatan svg {
    margin-top: 2px;
  }

  .bagian {
    max-width: var(--baris-isi);
  }

  .subjudul {
    font-size: var(--teks-h2);
    font-stretch: var(--lebar-h2);
    font-weight: 900;
  }

  .sumber {
    margin-top: var(--ruang-4);
    padding-left: 1.4em;
    font-size: var(--teks-kecil);
    line-height: 1.5;
  }

  .sumber li + li {
    margin-top: var(--ruang-3);
  }

  .sumber a {
    font-weight: 700;
  }

  .sumber svg {
    display: inline;
    vertical-align: -3px;
    margin-left: 2px;
  }

  .meta {
    color: var(--teks-sekunder);
  }

  .faq {
    margin-top: var(--ruang-4);
    border-bottom: var(--garis-tipis) solid var(--garis);
  }

  .faq details {
    border-top: var(--garis-tipis) solid var(--garis);
  }

  .faq summary {
    display: flex;
    align-items: center;
    min-height: 56px;
    padding-block: var(--ruang-3);
    font-weight: 700;
    line-height: 1.35;
    cursor: pointer;
  }

  .faq details p {
    padding-bottom: var(--ruang-4);
  }

  .terkait {
    display: grid;
    gap: var(--ruang-6);
    margin-top: var(--ruang-16);
  }

  .penulis {
    display: grid;
    align-items: start;
    gap: var(--ruang-5);
    max-width: 880px;
    margin-top: var(--ruang-12);
    padding: var(--ruang-6);
    border-radius: var(--radius-kartu);
    background: var(--permukaan);
  }

  .penulis:has(> img) {
    grid-template-columns: 72px minmax(0, 1fr);
  }

  .penulis img {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    object-fit: cover;
  }

  .penulisIsi {
    display: grid;
    gap: var(--ruang-2);
  }

  .penulisNama {
    font-size: var(--teks-h3);
    font-stretch: var(--lebar-h3);
    font-weight: 800;
  }

  .keahlian {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ruang-2);
    padding: 0;
    list-style: none;
    font-size: var(--teks-label);
    font-weight: 700;
  }

  .keahlian li {
    padding: var(--ruang-1) var(--ruang-3);
    border-radius: var(--radius-pil);
    background: var(--latar);
  }
  ```

  `src/components/artikel/KotakIntinya.tsx`

  ```tsx
  import type { WarnaPilar } from '@/lib/konstanta'

  import gaya from './Artikel.module.css'

  /** Kotak Intinya: jawaban langsung di atas isi, berlatar warna pilar versi lembut (spesifikasi §4). */
  export function KotakIntinya({ poin, warna }: { poin: string[]; warna: WarnaPilar | null }) {
    if (poin.length === 0) return null
    return (
      <section aria-labelledby="intinya" className={gaya.intinya} data-warna={warna ?? undefined}>
        <h2 id="intinya" className={gaya.label}>
          <span className={gaya.titik} aria-hidden="true" />
          Intinya
        </h2>
        <ul className={gaya.poin}>
          {poin.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </section>
    )
  }
  ```

  `src/components/artikel/DaftarIsi.tsx`

  ```tsx
  import type { Subjudul } from '@/modules/konten/tipe'

  import gaya from './Artikel.module.css'

  /** Daftar isi dari H2 isi artikel. Tautannya jangkar ke `id` heading yang sama. */
  export function DaftarIsi({ subjudul }: { subjudul: Subjudul[] }) {
    if (subjudul.length === 0) return null
    return (
      <nav aria-labelledby="daftar-isi" className={gaya.daftarIsi}>
        <h2 id="daftar-isi" className={gaya.label}>
          Daftar isi
        </h2>
        <ol>
          {subjudul.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`}>{s.teks}</a>
            </li>
          ))}
        </ol>
      </nav>
    )
  }
  ```

  `src/components/artikel/BlokSumber.tsx`

  ```tsx
  import { Ikon } from '@/components/dasar/Ikon'
  import { tanggalIndonesia } from '@/modules/konten/artikel'
  import type { Sumber } from '@/modules/konten/tipe'

  import gaya from './Artikel.module.css'

  /** Blok sumber di setiap artikel (rambu kredibilitas YMYL, spesifikasi §3). */
  export function BlokSumber({ sumber }: { sumber: Sumber[] }) {
    if (sumber.length === 0) return null
    return (
      <section aria-labelledby="sumber" className={gaya.bagian}>
        <h2 id="sumber" className={gaya.subjudul}>
          Sumber
        </h2>
        <ol className={gaya.sumber}>
          {sumber.map((s, i) => (
            <li key={i}>
              <a href={s.url} rel="noopener">
                {s.judul}
                <Ikon nama="arrow-up-right" ukuran={16} />
              </a>
              {(s.penerbit || s.diaksesPada) && (
                <span className={gaya.meta}>
                  {s.penerbit && `, ${s.penerbit}`}
                  {s.diaksesPada && `, diakses ${tanggalIndonesia(s.diaksesPada)}`}
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>
    )
  }
  ```

  `src/components/artikel/Faq.tsx`

  ```tsx
  import { paragrafTeks } from '@/modules/konten/isi'
  import type { Faq as DataFaq } from '@/modules/konten/tipe'

  import gaya from './Artikel.module.css'

  /** FAQ sebagai isi biasa (rich result FAQ sudah dihapus Google), bisa dibuka tanpa JavaScript. */
  export function Faq({ faq }: { faq: DataFaq[] }) {
    if (faq.length === 0) return null
    return (
      <section aria-labelledby="faq" className={gaya.bagian}>
        <h2 id="faq" className={gaya.subjudul}>
          Pertanyaan yang sering muncul
        </h2>
        <div className={gaya.faq}>
          {faq.map((f, i) => (
            <details key={i}>
              <summary>{f.pertanyaan}</summary>
              {paragrafTeks(f.jawaban).map((teks, j) => (
                <p key={j}>{teks}</p>
              ))}
            </details>
          ))}
        </div>
      </section>
    )
  }
  ```

  `src/components/artikel/Catatan.tsx`

  ```tsx
  import { Ikon } from '@/components/dasar/Ikon'

  import gaya from './Artikel.module.css'

  /** Disclaimer pilar (Uang & Karier, Sehat) yang tampil otomatis di akhir isi artikel. */
  export function Catatan({ teks }: { teks: string | null }) {
    if (!teks) return null
    return (
      <div role="note" className={gaya.catatan}>
        <Ikon nama="info" />
        <div>
          <p className={gaya.label}>Catatan</p>
          <p>{teks}</p>
        </div>
      </div>
    )
  }
  ```

  `src/components/artikel/ProfilPenulis.tsx`

  ```tsx
  import Image from 'next/image'

  import { Tautan } from '@/components/dasar/Tautan'
  import type { PenulisRingkas } from '@/modules/konten/tipe'
  import { propsGambar } from '@/modules/media/props'

  import gaya from './Artikel.module.css'

  /** Profil penulis di akhir artikel: foto, nama, bio, dan keahlian (rambu kredibilitas, spesifikasi §3). */
  export function ProfilPenulis({ penulis, cloudName }: { penulis: PenulisRingkas | null; cloudName: string }) {
    if (!penulis) return null
    const foto = propsGambar(penulis.foto, 'thumbnail', { cloudName, lebar: 144 })
    return (
      <section aria-labelledby="penulis" className={gaya.penulis}>
        {foto && <Image {...foto} alt="" sizes="72px" />}
        <div className={gaya.penulisIsi}>
          <h2 id="penulis" className={gaya.label}>
            Tentang penulis
          </h2>
          <p className={gaya.penulisNama}>
            <Tautan href={penulis.href}>{penulis.nama}</Tautan>
          </p>
          {penulis.bio && <p>{penulis.bio}</p>}
          {penulis.keahlian.length > 0 && (
            <ul className={gaya.keahlian} aria-label="Keahlian">
              {penulis.keahlian.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    )
  }
  ```

  `src/components/artikel/HalamanArtikel.tsx`

  ```tsx
  import Image from 'next/image'

  import { ChipPilar } from '@/components/dasar/ChipPilar'
  import { Ikon } from '@/components/dasar/Ikon'
  import { JsonLd } from '@/components/dasar/JsonLd'
  import { RemahRoti } from '@/components/dasar/RemahRoti'
  import { Tautan } from '@/components/dasar/Tautan'
  import { Keterangan, UKURAN_KOLOM_ISI } from '@/components/isi/GambarIsi'
  import { IsiArtikel } from '@/components/isi/IsiArtikel'
  import { DaftarKartu } from '@/components/kartu/KartuArtikel'
  import { LABEL_TIPE_ARTIKEL } from '@/lib/konstanta'
  import { tanggalIndonesia } from '@/modules/konten/artikel'
  import type { DataArtikel } from '@/modules/konten/tipe'
  import { propsGambar } from '@/modules/media/props'
  import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
  import type { Situs } from '@/modules/seo/tipe'

  import gaya from './Artikel.module.css'
  import { BlokSumber } from './BlokSumber'
  import { Catatan } from './Catatan'
  import { DaftarIsi } from './DaftarIsi'
  import { Faq } from './Faq'
  import { KotakIntinya } from './KotakIntinya'
  import { ProfilPenulis } from './ProfilPenulis'

  /**
   * Halaman artikel (keempat tipe, termasuk glosarium) dengan urutan dari spesifikasi §4: kicker
   * pilar, H1, deck, byline, kotak Intinya, daftar isi, isi, sumber, FAQ, artikel terkait, profil
   * penulis. Breadcrumb dan JSON-LD dibangun modul SEO dari dokumen yang sama.
   */
  export function HalamanArtikel({ artikel, situs }: { artikel: DataArtikel; situs: Situs }) {
    const masukan = { jenis: 'artikel', doc: artikel.seo } as const
    const gambar = propsGambar(artikel.gambar, 'hero', { cloudName: situs.cloudName, lebar: 1440 })
    return (
      <article className={`kontainer ${gaya.halaman}`}>
        <JsonLd data={jsonLd(masukan, situs)} />
        <header className={gaya.kepala}>
          <RemahRoti remah={remahRoti(masukan)} />
          <p className={gaya.kicker}>
            {artikel.pilar && <ChipPilar pilar={artikel.pilar} />}
            <span>{LABEL_TIPE_ARTIKEL[artikel.tipe]}</span>
          </p>
          <h1 className={gaya.judul}>{artikel.judul}</h1>
          <p className={gaya.deck}>{artikel.deck}</p>
          <p className={gaya.byline}>
            {artikel.penulis && (
              <span>
                Oleh <Tautan href={artikel.penulis.href}>{artikel.penulis.nama}</Tautan>
              </span>
            )}
            {artikel.diperbarui && (
              <span>
                <Ikon nama="calendar" ukuran={18} />
                Diperbarui <time dateTime={artikel.diperbarui}>{tanggalIndonesia(artikel.diperbarui)}</time>
              </span>
            )}
            <span>
              <Ikon nama="clock" ukuran={18} />
              {artikel.waktuBaca} menit baca
            </span>
          </p>
        </header>

        <div className={gaya.badan}>
          <KotakIntinya poin={artikel.intinya} warna={artikel.pilar?.warna ?? null} />
          {artikel.daftarIsi.length > 0 && (
            <div className={gaya.samping}>
              <DaftarIsi subjudul={artikel.daftarIsi} />
            </div>
          )}
          {gambar && artikel.gambar && (
            <figure className={gaya.gambar}>
              <Image {...gambar} alt={gambar.alt} sizes={UKURAN_KOLOM_ISI} fetchPriority="high" loading="eager" />
              <Keterangan media={artikel.gambar} />
            </figure>
          )}
          <IsiArtikel isi={artikel.isi} cloudName={situs.cloudName} />
          <Catatan teks={artikel.pilar?.disclaimer ?? null} />
          <BlokSumber sumber={artikel.sumber} />
          <Faq faq={artikel.faq} />
        </div>

        {artikel.terkait.length > 0 && (
          <section aria-labelledby="terkait" className={gaya.terkait}>
            <h2 id="terkait" className={gaya.subjudul}>
              Baca juga
            </h2>
            <DaftarKartu kartu={artikel.terkait} />
          </section>
        )}
        <ProfilPenulis penulis={artikel.penulis} cloudName={situs.cloudName} />
      </article>
    )
  }
  ```

- [ ] **Langkah 5: Rute artikel**

  `src/app/(frontend)/[...jalur]/page.tsx`

  ```tsx
  import type { Metadata } from 'next'
  import { notFound } from 'next/navigation'
  import { cache } from 'react'

  import { HalamanArtikel } from '@/components/artikel/HalamanArtikel'
  import { muatArtikel, muatSitus } from '@/modules/konten'
  import { metadata } from '@/modules/seo'

  type Props = { params: Promise<{ jalur: string[] }> }

  /**
   * Semua path publik yang tidak ditangani rute yang lebih spesifik: artikel `/{slug}` di Rencana 4A;
   * pilar, subkategori, dan halaman statis menyusul di Rencana 4B. Halaman dirender saat pertama
   * diminta lalu disimpan (ISR); tag cache data membuangnya saat konten berubah.
   */
  export function generateStaticParams() {
    return []
  }

  /** Satu query per permintaan untuk `generateMetadata` dan halaman. */
  const cari = cache(async (jalur: string[]) => (jalur.length === 1 ? muatArtikel(jalur[0], false) : null))

  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { jalur } = await params
    const artikel = await cari(jalur)
    if (!artikel) notFound()
    return metadata({ jenis: 'artikel', doc: artikel.seo }, await muatSitus())
  }

  export default async function Halaman({ params }: Props) {
    const { jalur } = await params
    const artikel = await cari(jalur)
    if (!artikel) notFound()
    return <HalamanArtikel artikel={artikel} situs={await muatSitus()} />
  }
  ```

- [ ] **Langkah 6: Jalankan tes unit, type check, lint**

  Jalankan:

  ```bash
  pnpm test:unit
  pnpm typecheck
  pnpm lint
  ```

  Hasil yang diharapkan: unit `Test Files 33 passed (33)`, `Tests 239 passed (239)`; type check dan lint bersih.

- [ ] **Langkah 7: Konten contoh dan tes E2E artikel**

  Ganti seluruh isi `tests/e2e/data.ts` dan `tests/e2e/siapkan.ts`:

  `tests/e2e/data.ts`

  ```ts
  /** Data tetap untuk E2E. Database E2E hanya untuk tes lokal, jadi kredensial ini bukan rahasia. */
  export const ADMIN_E2E = { email: 'e2e@point.lat', password: 'e2e-hanya-untuk-tes-lokal' }

  export const UKURAN_LAYAR = [
    { lebar: 375, tinggi: 812 },
    { lebar: 768, tinggi: 1024 },
    { lebar: 1440, tinggi: 900 },
  ] as const

  /** Slug konten contoh yang dibuat `siapkan.ts`. */
  export const SLUG = {
    panduan: 'cara-hitung-gaji-bersih',
    explainer: 'apa-itu-ter-pph-21',
    sehat: 'butuh-tidur-berapa-jam',
    draf: 'draf-belum-terbit',
  } as const

  export const JUDUL_PANDUAN = 'Cara hitung gaji bersih setelah PPh 21 dan BPJS'

  // Pembuat JSON Lexical minimal (bentuk yang disimpan Payload 3.92).
  type Node = Record<string, unknown>

  const teks = (text: string): Node => ({ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 })

  const anak = (isi: (string | Node)[]) => isi.map((a) => (typeof a === 'string' ? teks(a) : a))

  export const p = (...isi: (string | Node)[]): Node => ({
    type: 'paragraph',
    format: '',
    indent: 0,
    version: 1,
    direction: 'ltr',
    textFormat: 0,
    children: anak(isi),
  })

  export const h2 = (judul: string): Node => ({ type: 'heading', tag: 'h2', format: '', indent: 0, version: 1, direction: 'ltr', children: [teks(judul)] })

  export const tautanKe = (relationTo: string, id: number, label: string): Node => ({
    type: 'link',
    format: '',
    indent: 0,
    version: 3,
    direction: 'ltr',
    fields: { linkType: 'internal', newTab: false, doc: { relationTo, value: id } },
    children: [teks(label)],
  })

  export const gambar = (id: number): Node => ({ type: 'upload', version: 3, format: '', id: `unggahan-${id}`, fields: null, relationTo: 'media', value: id })

  export const blok = (fields: Node): Node => ({ type: 'block', version: 2, format: '', fields: { id: `blok-${String(fields.blockType)}`, blockName: '', ...fields } })

  export const isi = (...children: Node[]) => ({
    root: { type: 'root', format: '' as const, indent: 0, version: 1, direction: 'ltr' as const, children: children as { type: string; version: number }[] },
  })
  ```

  `tests/e2e/siapkan.ts`

  ```ts
  import config from '@payload-config'
  import { getPayload } from 'payload'
  import sharp from 'sharp'

  import { pakaiKlien } from '@/modules/media'
  import { klienPalsu } from '@/modules/media/palsu'
  import { seed } from '@/seed/seed'

  import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, p, SLUG, tautanKe } from './data'

  /**
   * Mengisi database E2E sebelum server dibangun dan dinyalakan (`webServer` di playwright.config.ts).
   * Konten lama dihapus dulu supaya setiap run sama. Media disimpan lewat klien palsu bernama `e2e`
   * (sama dengan `CLOUDINARY_CLOUD_NAME` server E2E), jadi tidak ada panggilan jaringan.
   */
  pakaiKlien(klienPalsu('e2e'))
  const payload = await getPayload({ config })

  for (const koleksi of ['artikel', 'redirect', 'log-404', 'media'] as const) {
    await payload.delete({ collection: koleksi, where: { id: { exists: true } } })
  }
  await seed(payload, { emailAdmin: ADMIN_E2E.email, passwordAdmin: ADMIN_E2E.password })

  const pilar = Object.fromEntries((await payload.find({ collection: 'pilar', limit: 10 })).docs.map((d) => [d.slug, d.id]))
  const redaksi = (await payload.find({ collection: 'penulis', where: { slug: { equals: 'redaksi' } }, limit: 1 })).docs[0]

  async function buatGambar(alt: string, warna: string) {
    const data = await sharp({ create: { width: 1600, height: 900, channels: 3, background: warna } }).png().toBuffer()
    return payload.create({
      collection: 'media',
      data: { alt, caption: 'Ilustrasi', kredit: 'Foto: Redaksi point.' },
      file: { data, mimetype: 'image/png', name: `${alt.toLowerCase().replace(/\W+/g, '-')}.png`, size: data.length },
    })
  }

  const slip = await buatGambar('Slip gaji karyawan', '#1F7A4D')
  const kasur = await buatGambar('Kamar tidur yang gelap', '#FF8A80')

  const dasar = { _status: 'published' as const, penulis: redaksi.id, gambarUtama: slip.id }

  const explainer = await payload.create({
    collection: 'artikel',
    data: {
      ...dasar,
      judul: 'Apa itu TER PPh 21 dan kenapa potongan gajimu berubah',
      slug: SLUG.explainer,
      tipe: 'explainer',
      pilar: pilar['uang-karier'],
      deck: 'Sejak 2024 pemotongan PPh 21 bulanan memakai tarif efektif rata-rata. Ini yang berubah di slip gajimu.',
      intinya: [
        { poin: 'TER adalah tarif efektif rata-rata untuk memotong PPh 21 setiap bulan.' },
        { poin: 'Di bulan Desember pajak setahun dihitung ulang dengan tarif Pasal 17.' },
      ],
      isi: isi(p('TER membuat potongan bulanan lebih sederhana: satu persentase dikalikan penghasilan bruto sebulan.')),
    },
  })

  await payload.create({
    collection: 'artikel',
    data: {
      ...dasar,
      judul: JUDUL_PANDUAN,
      slug: SLUG.panduan,
      tipe: 'panduan',
      pilar: pilar['uang-karier'],
      deck: 'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS. Begini cara menghitungnya langkah demi langkah.',
      intinya: [
        { poin: 'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS yang ditanggung karyawan.' },
        { poin: 'PPh 21 bulanan memakai tarif efektif rata-rata (TER) sesuai status PTKP.' },
        { poin: 'Iuran BPJS karyawan: Kesehatan 1%, JHT 2%, dan JP 1% dari gaji.' },
      ],
      isi: isi(
        p('Angka di slip gaji sering membingungkan. Panduan ini menjelaskan setiap potongan dari gaji kotor sampai yang masuk rekening.'),
        h2('Komponen potongan gaji'),
        p('Ada dua kelompok potongan: pajak penghasilan (PPh 21) dan iuran jaminan sosial (BPJS Kesehatan dan BPJS Ketenagakerjaan).'),
        blok({ blockType: 'callout', gaya: 'tips', judul: 'Siapkan slip gaji', isi: 'Cocokkan setiap angka di panduan ini dengan slip gajimu bulan lalu.' }),
        h2('Cara menghitung PPh 21 dengan TER'),
        p('Kategori TER ditentukan status PTKP. Penjelasan lengkapnya ada di ', tautanKe('artikel', explainer.id, 'artikel tentang TER'), '.'),
        blok({
          blockType: 'tabelPerbandingan',
          judul: 'Status PTKP dan kategori TER',
          kolom: [{ label: 'Status PTKP' }, { label: 'Kategori TER' }],
          baris: [{ sel: [{ teks: 'TK/0' }, { teks: 'A' }] }, { sel: [{ teks: 'K/1' }, { teks: 'B' }] }, { sel: [{ teks: 'K/3' }, { teks: 'C' }] }],
        }),
        h2('Contoh hitung'),
        p('Misalnya gaji kotor Rp8.000.000 dengan status TK/0. Iuran BPJS karyawan 4% atau Rp320.000.'),
        gambar(slip.id),
        p('Sisa setelah iuran dan PPh 21 bulanan itulah gaji bersihmu.'),
      ),
      faq: [{ pertanyaan: 'Apakah THR ikut dipotong PPh 21?', jawaban: 'Ya. THR menambah penghasilan bruto bulan dibayarkan, jadi PPh 21 bulan itu ikut naik.' }],
      sumber: [
        { judul: 'Direktorat Jenderal Pajak', url: 'https://www.pajak.go.id/', penerbit: 'DJP', diaksesPada: '2026-11-01T00:00:00.000Z' },
        { judul: 'BPJS Ketenagakerjaan', url: 'https://www.bpjsketenagakerjaan.go.id/', penerbit: 'BPJS Ketenagakerjaan' },
      ],
      artikelTerkait: [explainer.id],
    },
  })

  await payload.create({
    collection: 'artikel',
    data: {
      ...dasar,
      gambarUtama: kasur.id,
      judul: 'Butuh tidur berapa jam? Beda per usia',
      slug: SLUG.sehat,
      tipe: 'explainer',
      pilar: pilar.sehat,
      deck: 'Kebutuhan tidur berubah sesuai usia. Orang dewasa umumnya butuh tujuh jam atau lebih setiap malam.',
      intinya: [{ poin: 'Dewasa umumnya butuh 7 jam atau lebih per malam.' }, { poin: 'Remaja butuh lebih banyak, sekitar 8 sampai 10 jam.' }],
      isi: isi(p('Tidur cukup membantu konsentrasi, suasana hati, dan daya tahan tubuh.')),
    },
  })

  await payload.create({
    collection: 'artikel',
    draft: true,
    data: { ...dasar, _status: 'draft', judul: 'Draf yang belum terbit', slug: SLUG.draf, tipe: 'panduan', pilar: pilar['uang-karier'], deck: 'Draf.', intinya: [{ poin: 'Satu.' }, { poin: 'Dua.' }], isi: isi(p('Draf.')) },
  })

  payload.logger.info('Data E2E siap.')
  process.exit(0)
  ```

  `tests/e2e/artikel.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  import { JUDUL_PANDUAN, SLUG, UKURAN_LAYAR } from './data'

  test.beforeEach(async ({ page }) => {
    await cegatCloudinary(page)
  })

  test('artikel panduan: urutan bagian sesuai spesifikasi §4', async ({ page }) => {
    await page.goto(`/${SLUG.panduan}`)
    const remah = page.getByRole('navigation', { name: 'Remah roti' })
    await expect(remah.getByRole('link')).toHaveText(['Beranda', 'Uang & Karier'])
    await expect(remah.locator('[aria-current="page"]')).toHaveText(JUDUL_PANDUAN)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(JUDUL_PANDUAN)
    await expect(page.getByText('Panduan', { exact: true })).toBeVisible()
    await expect(page.getByText(/^Diperbarui \d{1,2} \w+ 20\d\d$/)).toBeVisible()
    await expect(page.getByText('1 menit baca')).toBeVisible()

    const intinya = page.getByRole('region', { name: 'Intinya' })
    await expect(intinya.getByRole('listitem')).toHaveCount(3)

    const daftarIsi = page.getByRole('navigation', { name: 'Daftar isi' })
    await expect(daftarIsi.getByRole('link')).toHaveText(['Komponen potongan gaji', 'Cara menghitung PPh 21 dengan TER', 'Contoh hitung'])

    await expect(page.getByRole('note').filter({ hasText: 'Tips' })).toContainText('Siapkan slip gaji')
    await expect(page.getByRole('region', { name: 'Status PTKP dan kategori TER' }).getByRole('rowheader')).toHaveText(['TK/0', 'K/1', 'K/3'])
    await expect(page.getByRole('link', { name: 'artikel tentang TER' })).toHaveAttribute('href', `/${SLUG.explainer}`)
    await expect(page.getByRole('note').filter({ hasText: 'Catatan' })).toContainText('bukan saran keuangan')

    const sumber = page.getByRole('region', { name: 'Sumber' })
    await expect(sumber.getByRole('link')).toHaveText(['Direktorat Jenderal Pajak', 'BPJS Ketenagakerjaan'])
    await expect(sumber).toContainText('DJP, diakses 1 November 2026')

    const faq = page.getByRole('region', { name: 'Pertanyaan yang sering muncul' })
    await faq.getByText('Apakah THR ikut dipotong PPh 21?').click()
    await expect(faq.getByText(/THR menambah penghasilan bruto/)).toBeVisible()

    await expect(page.getByRole('region', { name: 'Baca juga' }).getByRole('link')).toHaveAttribute('href', `/${SLUG.explainer}`)
    const penulis = page.getByRole('region', { name: 'Tentang penulis' })
    await expect(penulis.getByRole('link', { name: 'Redaksi point.' })).toHaveAttribute('href', '/penulis/redaksi')
  })

  test('daftar isi melompat ke subjudul', async ({ page }) => {
    await page.goto(`/${SLUG.panduan}`)
    await page.getByRole('navigation', { name: 'Daftar isi' }).getByRole('link', { name: 'Contoh hitung' }).click()
    await expect(page).toHaveURL(/#contoh-hitung$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Contoh hitung' })).toBeInViewport()
  })

  test('metadata, canonical, robots, dan JSON-LD dari modul SEO', async ({ page }) => {
    await page.goto(`/${SLUG.panduan}`)
    await expect(page).toHaveTitle(`${JUDUL_PANDUAN} · point.`)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://point.lat/${SLUG.panduan}`)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow, max-image-preview:large')
    const graf = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}')
    expect(graf['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual(['Organization', 'WebSite', 'Article', 'BreadcrumbList'])
  })

  test('gambar utama dari Cloudinary dengan ukuran tetap', async ({ page }) => {
    await page.goto(`/${SLUG.panduan}`)
    const gambar = page.getByRole('img', { name: 'Slip gaji karyawan' }).first()
    await expect(gambar).toHaveAttribute('src', /^https:\/\/res\.cloudinary\.com\/e2e\/image\/upload\/c_fill,g_auto,ar_16:9\//)
    await expect(gambar).toHaveAttribute('width', '1440')
    await expect(gambar).toHaveAttribute('height', '810')
  })

  test('artikel pilar Sehat menampilkan disclaimer pilarnya', async ({ page }) => {
    await page.goto(`/${SLUG.sehat}`)
    await expect(page.getByRole('note').filter({ hasText: 'Catatan' })).toContainText('bukan pengganti diagnosis')
  })

  test('draf dan path yang tidak ada menjawab 404', async ({ request }) => {
    for (const path of [`/${SLUG.draf}`, '/tidak/ada/sama-sekali', '/favicon.ico']) {
      expect((await request.get(path)).status(), path).toBe(404)
    }
  })

  for (const { lebar, tinggi } of UKURAN_LAYAR) {
    test(`artikel ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: tinggi })
      await page.goto(`/${SLUG.panduan}`)
      await periksaTanpaGeserHorizontal(page)
      await periksaAxe(page)
    })
  }
  ```

  Jalankan:

  ```bash
  pnpm test:e2e
  ```

  Hasil yang diharapkan: `15 passed` (6 tata letak + 9 artikel): urutan bagian, lompatan daftar isi, judul `Cara hitung gaji bersih setelah PPh 21 dan BPJS · point.`, canonical `https://point.lat/cara-hitung-gaji-bersih`, robots `index, follow, max-image-preview:large`, JSON-LD `Organization`, `WebSite`, `Article`, `BreadcrumbList`, gambar `res.cloudinary.com/e2e/image/upload/c_fill,g_auto,ar_16:9/...` 1440x810, disclaimer Sehat, 404 untuk draf dan path asing, dan axe bersih di 375, 768, 1440 px.

- [ ] **Langkah 8: Commit**

  ```bash
  git add "src/app/(frontend)/[...jalur]" src/components tests/unit/halaman-artikel.test.ts tests/e2e
  git commit -m "feat(ui): halaman artikel dengan Intinya, daftar isi, sumber, FAQ, terkait, dan penulis"
  ```

### Task 7: Indeks dan halaman glosarium, `/glosarium` di sitemap halaman

**Files:**
- Create: `src/modules/konten/glosarium.ts`, `src/components/glosarium/IndeksGlosarium.tsx`, `src/components/glosarium/Glosarium.module.css`, `src/app/(frontend)/glosarium/page.tsx`, `src/app/(frontend)/glosarium/[slug]/page.tsx`
- Modify: `src/lib/paths.ts`, `src/modules/seo/data.ts`, `src/modules/konten/tipe.ts`, `src/modules/konten/data.ts`, `src/modules/konten/cache.ts`, `src/modules/konten/index.ts`, `tests/int/sitemap.int.spec.ts`, `tests/e2e/siapkan.ts`
- Test: `tests/unit/glosarium.test.ts`, `tests/int/glosarium.int.spec.ts`, `tests/e2e/glosarium.spec.ts`

**Interfaces:**
- Consumes: `HalamanArtikel` (Task 6), `muatArtikel`, `muatSitus` (Task 4), `RemahRoti`, `JsonLd`, `Tautan`, `terbaru`, `syaratSitemap` (Rencana 3).
- Produces:
  - `src/lib/paths.ts`: `PATH_INDEKS = { glosarium: '/glosarium' }` (dipakai `pathFor` untuk glosarium).
  - `src/modules/konten/tipe.ts`: `Istilah = { judul; href; definisi }`, `KelompokIstilah = { huruf; id; istilah: Istilah[] }`.
  - `src/modules/konten/glosarium.ts`: `kelompokkanIstilah(docs): KelompokIstilah[]`.
  - `ambilGlosarium(payload)`, `muatGlosarium()` (tag `artikel`).
  - Komponen `IndeksGlosarium({ kelompok, masukan, situs })`, `JUDUL_GLOSARIUM`, `DESKRIPSI_GLOSARIUM`.
  - Rute `/glosarium` (statis, dirender saat build lalu ISR) dan `/glosarium/{slug}` (ISR).
  - Sitemap `halaman.xml` memuat `https://point.lat/glosarium` dengan `lastmod` istilah terbaru, hanya bila ada istilah terbit.

Istilah glosarium adalah artikel bertipe `glosarium` dan memakai halaman artikel yang sama (Task 6) di `/glosarium/{slug}`; remah rotinya Beranda, Glosarium, istilah (dari `remahRoti()` Rencana 3). Artikel bertipe lain tidak terbuka di `/glosarium/...` dan istilah tidak terbuka di `/{slug}`.

Indeks `/glosarium` mengurutkan istilah dengan aturan bahasa Indonesia tanpa membedakan huruf besar, mengelompokkannya per huruf awal (selain A-Z masuk kelompok "#" di akhir), dan menampilkan definisi langsung (poin Intinya pertama, cadangannya deck) dalam `<dl>`. Navigasi huruf berupa tautan jangkar 44px. Metadata dan JSON-LD memakai masukan `statis` modul SEO.

Rencana 3 menunda `/glosarium` di sitemap sampai halamannya ada. Sekarang `ambilEntriSitemap(payload, 'halaman', situs)` menambahkan entri indeks itu di depan halaman statis, dengan aturan `lastmod` yang sama dengan artikel (`diperbaruiBesar ?? terbitPada` istilah terbaru).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/glosarium.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it } from 'vitest'

  import { IndeksGlosarium } from '@/components/glosarium/IndeksGlosarium'
  import { kelompokkanIstilah } from '@/modules/konten/glosarium'

  import { situs } from './seo-contoh'

  const istilah = (judul: string, slug: string | null, definisi?: string) => ({
    judul,
    slug,
    deck: `Deck ${judul}.`,
    intinya: definisi ? [{ poin: definisi }] : [],
  })

  describe('kelompokkanIstilah', () => {
    it('urut abjad tanpa beda huruf besar, dikelompokkan per huruf, selain huruf di akhir', () => {
      const kelompok = kelompokkanIstilah([
        istilah('TER', 'ter', 'TER adalah tarif efektif rata-rata.'),
        istilah('bunga majemuk', 'bunga-majemuk', 'Bunga atas bunga.'),
        istilah('3 in 1', '3-in-1'),
        istilah('BPJS', 'bpjs', 'Badan penyelenggara jaminan sosial.'),
        istilah('Tanpa slug', null, 'Dilewati.'),
      ])
      expect(kelompok.map((k) => [k.huruf, k.id, k.istilah.map((i) => i.judul)])).toEqual([
        ['B', 'huruf-b', ['BPJS', 'bunga majemuk']],
        ['T', 'huruf-t', ['TER']],
        ['#', 'huruf-lain', ['3 in 1']],
      ])
      expect(kelompok[1].istilah[0]).toEqual({ judul: 'TER', href: '/glosarium/ter', definisi: 'TER adalah tarif efektif rata-rata.' })
      expect(kelompok[2].istilah[0].definisi).toBe('Deck 3 in 1.')
    })
  })

  describe('IndeksGlosarium', () => {
    const masukan = { jenis: 'statis', judul: 'Glosarium', path: '/glosarium' } as const

    it('navigasi huruf, daftar definisi, dan remah roti', () => {
      const kelompok = kelompokkanIstilah([istilah('BPJS', 'bpjs', 'Jaminan sosial.'), istilah('TER', 'ter', 'Tarif efektif.')])
      const html = renderToStaticMarkup(h(IndeksGlosarium, { kelompok, masukan, situs }))
      expect(html).toContain('<nav aria-label="Huruf"')
      expect(html).toContain('<a href="#huruf-b">B</a>')
      expect(html).toMatch(/<section id="huruf-t" aria-labelledby="huruf-t-judul"/)
      expect(html).toMatch(/<dt><a href="\/glosarium\/ter">TER<\/a><\/dt><dd>Tarif efektif\.<\/dd>/)
      expect(html).toMatch(/<span aria-current="page" class="[^"]*">Glosarium<\/span>/)
    })

    it('pesan kosong bila belum ada istilah', () => {
      const html = renderToStaticMarkup(h(IndeksGlosarium, { kelompok: [], masukan, situs }))
      expect(html).toContain('Belum ada istilah. Istilah baru tampil di sini setelah terbit.')
      expect(html).not.toContain('aria-label="Huruf"')
    })
  })
  ```

  `tests/int/glosarium.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { ambilGlosarium } from '@/modules/konten/data'

  import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
  import { getTestPayload, unik } from './helpers'

  describe('ambilGlosarium', () => {
    it('hanya istilah glosarium yang terbit', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const terbit = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium', judul: unik('Zakat') } })
      const draf = await payload.create({
        collection: 'artikel',
        draft: true,
        data: { ...dataArtikelTerbit(relasi), _status: 'draft', tipe: 'glosarium', judul: unik('Zona') },
      })
      const panduan = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), judul: unik('Zebra') } })

      const href = (await ambilGlosarium(payload)).flatMap((k) => k.istilah.map((i) => i.href))
      expect(href).toContain(`/glosarium/${terbit.slug}`)
      expect(href).not.toContain(`/glosarium/${draf.slug}`)
      expect(href.some((h) => h.endsWith(`/${panduan.slug}`))).toBe(false)
    })
  })
  ```

  Tambahkan tes sitemap di `tests/int/sitemap.int.spec.ts`:

  ```diff
  diff --git a/tests/int/sitemap.int.spec.ts b/tests/int/sitemap.int.spec.ts
  index 2ea8f29..5754b89 100644
  --- a/tests/int/sitemap.int.spec.ts
  +++ b/tests/int/sitemap.int.spec.ts
  @@ -3,7 +3,7 @@ import { beforeAll, describe, expect, it } from 'vitest'
   import { ambilEntriFeed, ambilEntriNews, ambilEntriSitemap, ambilIndexSitemap, ambilPengaturan } from '@/modules/seo/data'
   import { ambilSitus } from '@/modules/seo/situs'
   import type { PengaturanSitus } from '@/modules/seo/tipe'
  -import { saringNews } from '@/modules/seo/xml'
  +import { saringNews, terbaru } from '@/modules/seo/xml'
   
   import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
   import { getTestPayload, unik } from './helpers'
  @@ -76,6 +76,14 @@ describe('data rute teknis dari Payload', () => {
       expect(index[0].lastmod).toBeTruthy()
     })
   
  +  it('sitemap halaman memuat indeks /glosarium dengan lastmod istilah terbaru', async () => {
  +    const payload = await getTestPayload()
  +    const relasi = await siapkanRelasiArtikel(payload)
  +    const istilah = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium', judul: unik('TER') } })
  +    const entri = (await ambilEntriSitemap(payload, 'halaman', situs)).find((e) => e.loc === url('/glosarium'))
  +    expect(entri?.lastmod).toBe(terbaru([istilah.terbitPada]))
  +  })
  +
     it('halaman draf dari seed tidak masuk sitemap halaman', async () => {
       const payload = await getTestPayload()
       const halaman = await payload.create({ collection: 'halaman', draft: true, data: { judul: unik('Draf halaman') } })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/glosarium.test.ts` dengan `Cannot find package '@/components/glosarium/IndeksGlosarium'`.

- [ ] **Langkah 3: Path indeks dan sitemap**

  ```diff
  diff --git a/src/lib/paths.ts b/src/lib/paths.ts
  index ce3247e..78d38c0 100644
  --- a/src/lib/paths.ts
  +++ b/src/lib/paths.ts
  @@ -5,11 +5,14 @@ export type TargetPath =
     | { jenis: 'subkategori'; slug: string; pilarSlug: string }
     | { jenis: 'pilar' | 'tools' | 'video' | 'penulis' | 'halaman'; slug: string }
   
  +/** Halaman indeks yang tidak mewakili satu dokumen. */
  +export const PATH_INDEKS = { glosarium: '/glosarium' } as const
  +
   /** Satu-satunya tempat path publik dirangkai. Dipakai redirect, SEO, sitemap, dan indexer. */
   export function pathFor(target: TargetPath): string {
     switch (target.jenis) {
       case 'artikel':
  -      return target.tipe === 'glosarium' ? `/glosarium/${target.slug}` : `/${target.slug}`
  +      return target.tipe === 'glosarium' ? `${PATH_INDEKS.glosarium}/${target.slug}` : `/${target.slug}`
       case 'subkategori':
         return `/${target.pilarSlug}/${target.slug}`
       case 'tools':
  ```

  ```diff
  diff --git a/src/modules/seo/data.ts b/src/modules/seo/data.ts
  index f183c6c..c83355e 100644
  --- a/src/modules/seo/data.ts
  +++ b/src/modules/seo/data.ts
  @@ -1,5 +1,6 @@
   import type { Payload, Where } from 'payload'
   
  +import { PATH_INDEKS } from '@/lib/paths'
   import { TAG } from '@/lib/tag'
   
   import { entriFeed, entriNews, entriSitemap } from './sitemap'
  @@ -79,7 +80,30 @@ export async function ambilEntriSitemap(payload: Payload, jenis: JenisSitemap, s
       sort: '-updatedAt',
     })
     const masukan = docs.map((doc) => ({ jenis: tipePath[jenis], doc }) as MasukanSeo)
  -  return entriSitemap(masukan, situs)
  +  const entri = entriSitemap(masukan, situs)
  +  return jenis === 'halaman' ? [...(await ambilEntriIndeks(payload, situs)), ...entri] : entri
  +}
  +
  +/**
  + * Halaman indeks tanpa dokumen sendiri ikut sitemap halaman bila ada isinya. `/glosarium`:
  + * `lastmod` = istilah terbaru (`diperbaruiBesar ?? terbitPada`), sama dengan aturan artikel.
  + */
  +async function ambilEntriIndeks(payload: Payload, situs: Pick<PengaturanSitus, 'urlSitus'>): Promise<EntriSitemap[]> {
  +  const { docs } = await payload.find({
  +    collection: 'artikel',
  +    where: { and: [syaratSitemap('artikel'), { tipe: { equals: 'glosarium' } }] },
  +    depth: 0,
  +    limit: MAKS_URL_SITEMAP,
  +    pagination: false,
  +    select: { terbitPada: true, diperbaruiBesar: true },
  +  })
  +  if (docs.length === 0) return []
  +  return [
  +    {
  +      loc: new URL(PATH_INDEKS.glosarium, situs.urlSitus).toString(),
  +      lastmod: terbaru(docs.map((d) => d.diperbaruiBesar ?? d.terbitPada)),
  +    },
  +  ]
   }
   
   /** Isi sitemap index: semua jenis, `lastmod` = entri terbaru jenis itu. Jenis kosong tetap dicantumkan. */
  ```

- [ ] **Langkah 4: Data glosarium**

  `src/modules/konten/glosarium.ts`

  ```ts
  import type { Artikel } from '@/payload-types'
  import { pathFor } from '@/lib/paths'

  import type { Istilah, KelompokIstilah } from './tipe'

  type DokumenIstilah = Pick<Artikel, 'judul' | 'slug' | 'deck' | 'intinya'>

  /** Huruf awal tanpa diakritik; selain A-Z masuk kelompok "#" di akhir. */
  function hurufAwal(judul: string): string {
    const huruf = judul.normalize('NFD').trim().charAt(0).toUpperCase()
    return /^[A-Z]$/.test(huruf) ? huruf : '#'
  }

  /**
   * Indeks glosarium: istilah diurutkan abjad (aturan bahasa Indonesia, tanpa beda huruf besar) dan
   * dikelompokkan per huruf awal. Definisi = poin Intinya pertama (kalimat definisi), cadangannya deck.
   */
  export function kelompokkanIstilah(docs: DokumenIstilah[]): KelompokIstilah[] {
    const istilah: Istilah[] = docs
      .filter((d) => d.slug)
      .map((d) => ({
        judul: d.judul,
        href: pathFor({ jenis: 'artikel', slug: d.slug as string, tipe: 'glosarium' }),
        definisi: d.intinya?.[0]?.poin ?? d.deck,
      }))
      .sort((a, b) => a.judul.localeCompare(b.judul, 'id', { sensitivity: 'base' }))
    const kelompok = new Map<string, Istilah[]>()
    for (const i of istilah) {
      const huruf = hurufAwal(i.judul)
      kelompok.set(huruf, [...(kelompok.get(huruf) ?? []), i])
    }
    return [...kelompok.entries()]
      .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
      .map(([huruf, daftar]) => ({ huruf, id: huruf === '#' ? 'huruf-lain' : `huruf-${huruf.toLowerCase()}`, istilah: daftar }))
  }
  ```

  Tambahkan di akhir `src/modules/konten/tipe.ts`:

  ```diff
  diff --git a/src/modules/konten/tipe.ts b/src/modules/konten/tipe.ts
  index 8634302..f4bb589 100644
  --- a/src/modules/konten/tipe.ts
  +++ b/src/modules/konten/tipe.ts
  @@ -72,3 +72,8 @@ export type DataArtikel = {
     terkait: KartuArtikel[]
     seo: ArtikelSeo
   }
  +
  +export type Istilah = { judul: string; href: string; definisi: string }
  +
  +/** Istilah glosarium per huruf awal; `id` dipakai jangkar navigasi huruf. */
  +export type KelompokIstilah = { huruf: string; id: string; istilah: Istilah[] }
  ```

  ```diff
  diff --git a/src/modules/konten/data.ts b/src/modules/konten/data.ts
  index 242fc5e..83701a7 100644
  --- a/src/modules/konten/data.ts
  +++ b/src/modules/konten/data.ts
  @@ -4,8 +4,9 @@ import type { Artikel } from '@/payload-types'
   import { validasiFormatSlug } from '@/lib/slug'
   
   import { gabungTerkait, MAKS_TERKAIT, susunArtikel } from './artikel'
  +import { kelompokkanIstilah } from './glosarium'
   import { susunFooter, susunHeader } from './tampilan'
  -import type { DataArtikel, DataFooter, DataHeader, KartuArtikel } from './tipe'
  +import type { DataArtikel, DataFooter, DataHeader, KartuArtikel, KelompokIstilah } from './tipe'
   
   /**
    * Query Payload untuk halaman publik. Fungsi di sini menerima `payload` supaya bisa diuji integrasi;
  @@ -94,3 +95,16 @@ async function ambilTerkait(payload: Payload, doc: Artikel): Promise<KartuArtike
     })
     return gabungTerkait(doc.id, manual, docs)
   }
  +
  +/** Semua istilah glosarium terbit untuk `/glosarium`. */
  +export async function ambilGlosarium(payload: Payload): Promise<KelompokIstilah[]> {
  +  const { docs } = await payload.find({
  +    collection: 'artikel',
  +    where: { and: [terbit, { tipe: { equals: 'glosarium' } }] },
  +    depth: 0,
  +    limit: 2000,
  +    pagination: false,
  +    select: { judul: true, slug: true, deck: true, intinya: true },
  +  })
  +  return kelompokkanIstilah(docs)
  +}
  ```

  ```diff
  diff --git a/src/modules/konten/cache.ts b/src/modules/konten/cache.ts
  index 4f0b1d8..aee291a 100644
  --- a/src/modules/konten/cache.ts
  +++ b/src/modules/konten/cache.ts
  @@ -5,7 +5,7 @@ import { getPayload } from 'payload'
   import { TAG } from '@/lib/tag'
   import { ambilSitus } from '@/modules/seo/situs'
   
  -import { ambilArtikel, ambilFooter, ambilHeader } from './data'
  +import { ambilArtikel, ambilFooter, ambilGlosarium, ambilHeader } from './data'
   
   /**
    * Data halaman publik yang di-cache dengan tag (spesifikasi §5 "Rendering"). Halaman dirender statis
  @@ -57,3 +57,9 @@ export const muatArtikel = unstable_cache(
     ['konten', 'artikel'],
     { tags: TAG_ARTIKEL, revalidate: SEJAM },
   )
  +
  +/** Indeks glosarium hanya berisi artikel bertipe glosarium. */
  +export const muatGlosarium = unstable_cache(async () => ambilGlosarium(await payload()), ['konten', 'glosarium'], {
  +  tags: [TAG.koleksi('artikel')],
  +  revalidate: SEJAM,
  +})
  ```

  ```diff
  diff --git a/src/modules/konten/index.ts b/src/modules/konten/index.ts
  index e16e9d0..b21d9c2 100644
  --- a/src/modules/konten/index.ts
  +++ b/src/modules/konten/index.ts
  @@ -6,8 +6,9 @@
    * - Fungsi murni (`susunHeader`, `susunArtikel`, `tanggalIndonesia`, ...) menerjemahkan dokumen
    *   Payload ke tipe di `tipe.ts`, supaya komponen tidak membaca relasi Payload mentah.
    */
  -export { muatArtikel, muatFooter, muatHeader, muatSitus, TAG_ARTIKEL } from './cache'
  -export { ambilArtikel, ambilFooter, ambilHeader } from './data'
  +export { muatArtikel, muatFooter, muatGlosarium, muatHeader, muatSitus, TAG_ARTIKEL } from './cache'
  +export { ambilArtikel, ambilFooter, ambilGlosarium, ambilHeader } from './data'
  +export { kelompokkanIstilah } from './glosarium'
   export { HAK_CIPTA_BAWAAN, LABEL_SOSIAL, susunFooter, susunHeader, tautanInternal, TOOLS_BAWAAN } from './tampilan'
   export {
     gabungTerkait,
  ```

- [ ] **Langkah 5: Komponen dan rute**

  `src/components/glosarium/Glosarium.module.css`

  ```css
  .halaman {
    padding-top: var(--ruang-4);
  }

  .kepala {
    display: grid;
    gap: var(--ruang-4);
    max-width: 880px;
    padding-bottom: var(--ruang-8);
  }

  .judul {
    margin-top: var(--ruang-4);
    font-size: var(--teks-h1);
    font-stretch: var(--lebar-h1);
    line-height: var(--tinggi-h1);
    letter-spacing: -0.02em;
  }

  .deck {
    max-width: 60ch;
    font-size: var(--teks-deck);
    line-height: 1.45;
  }

  .huruf ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ruang-2);
    padding: 0;
    list-style: none;
  }

  .huruf a {
    display: inline-grid;
    place-items: center;
    min-width: var(--sentuh-min);
    min-height: var(--sentuh-min);
    border-radius: var(--radius-kontrol);
    background: var(--permukaan);
    font-weight: 800;
    text-decoration: none;
  }

  .huruf a:hover {
    text-decoration: underline;
  }

  .kelompok {
    display: grid;
    gap: var(--ruang-4);
    max-width: 880px;
    margin-top: var(--ruang-10);
    scroll-margin-top: var(--ruang-6);
  }

  .kelompokJudul {
    font-size: var(--teks-h2);
    font-stretch: var(--lebar-h2);
  }

  .daftar {
    display: grid;
    border-top: var(--garis-tipis) solid var(--garis);
  }

  .istilah {
    display: grid;
    padding-block: var(--ruang-3) var(--ruang-4);
    border-bottom: var(--garis-tipis) solid var(--garis);
  }

  .istilah dt a {
    display: inline-flex;
    align-items: center;
    min-height: var(--sentuh-min);
    font-size: var(--teks-h3);
    font-stretch: var(--lebar-h3);
    font-weight: 800;
    text-decoration: none;
  }

  .istilah dt a:hover {
    text-decoration: underline;
  }

  .istilah dd {
    margin: 0;
    color: var(--teks-sekunder);
  }

  .kosong {
    max-width: 60ch;
    padding: var(--ruang-6);
    border-radius: var(--radius-kartu);
    background: var(--permukaan);
  }
  ```

  `src/components/glosarium/IndeksGlosarium.tsx`

  ```tsx
  import { JsonLd } from '@/components/dasar/JsonLd'
  import { RemahRoti } from '@/components/dasar/RemahRoti'
  import { Tautan } from '@/components/dasar/Tautan'
  import type { KelompokIstilah } from '@/modules/konten/tipe'
  import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
  import type { MasukanSeo, Situs } from '@/modules/seo/tipe'

  import gaya from './Glosarium.module.css'

  export const JUDUL_GLOSARIUM = 'Glosarium'
  export const DESKRIPSI_GLOSARIUM =
    'Istilah uang, karier, teknologi, pendidikan, dan kesehatan, dijelaskan dalam satu kalimat dulu lalu ditautkan ke panduannya.'

  /** `/glosarium`: istilah per huruf dengan navigasi huruf. Definisi tampil langsung di indeks. */
  export function IndeksGlosarium({ kelompok, masukan, situs }: { kelompok: KelompokIstilah[]; masukan: MasukanSeo; situs: Situs }) {
    return (
      <div className={`kontainer ${gaya.halaman}`}>
        <JsonLd data={jsonLd(masukan, situs)} />
        <header className={gaya.kepala}>
          <RemahRoti remah={remahRoti(masukan)} />
          <h1 className={gaya.judul}>{JUDUL_GLOSARIUM}</h1>
          <p className={gaya.deck}>{DESKRIPSI_GLOSARIUM}</p>
          {kelompok.length > 1 && (
            <nav aria-label="Huruf" className={gaya.huruf}>
              <ul>
                {kelompok.map((k) => (
                  <li key={k.id}>
                    <a href={`#${k.id}`}>{k.huruf}</a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </header>
        {kelompok.length === 0 && <p className={gaya.kosong}>Belum ada istilah. Istilah baru tampil di sini setelah terbit.</p>}
        {kelompok.map((k) => (
          <section key={k.id} id={k.id} aria-labelledby={`${k.id}-judul`} className={gaya.kelompok}>
            <h2 id={`${k.id}-judul`} className={gaya.kelompokJudul}>
              {k.huruf}
            </h2>
            <dl className={gaya.daftar}>
              {k.istilah.map((i) => (
                <div key={i.href} className={gaya.istilah}>
                  <dt>
                    <Tautan href={i.href}>{i.judul}</Tautan>
                  </dt>
                  <dd>{i.definisi}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    )
  }
  ```

  `src/app/(frontend)/glosarium/page.tsx`

  ```tsx
  import type { Metadata } from 'next'

  import { DESKRIPSI_GLOSARIUM, IndeksGlosarium, JUDUL_GLOSARIUM } from '@/components/glosarium/IndeksGlosarium'
  import { PATH_INDEKS } from '@/lib/paths'
  import { muatGlosarium, muatSitus } from '@/modules/konten'
  import { metadata, type MasukanSeo } from '@/modules/seo'

  const masukan: MasukanSeo = { jenis: 'statis', judul: JUDUL_GLOSARIUM, path: PATH_INDEKS.glosarium, deskripsi: DESKRIPSI_GLOSARIUM }

  export async function generateMetadata(): Promise<Metadata> {
    return metadata(masukan, await muatSitus())
  }

  export default async function Glosarium() {
    const [kelompok, situs] = await Promise.all([muatGlosarium(), muatSitus()])
    return <IndeksGlosarium kelompok={kelompok} masukan={masukan} situs={situs} />
  }
  ```

  `src/app/(frontend)/glosarium/[slug]/page.tsx`

  ```tsx
  import type { Metadata } from 'next'
  import { notFound } from 'next/navigation'
  import { cache } from 'react'

  import { HalamanArtikel } from '@/components/artikel/HalamanArtikel'
  import { muatArtikel, muatSitus } from '@/modules/konten'
  import { metadata } from '@/modules/seo'

  type Props = { params: Promise<{ slug: string }> }

  /** `/glosarium/{slug}`: artikel bertipe glosarium, tata letak sama dengan artikel lain (ISR). */
  export function generateStaticParams() {
    return []
  }

  const cari = cache(async (slug: string) => muatArtikel(slug, true))

  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const istilah = await cari((await params).slug)
    if (!istilah) notFound()
    return metadata({ jenis: 'artikel', doc: istilah.seo }, await muatSitus())
  }

  export default async function Istilah({ params }: Props) {
    const istilah = await cari((await params).slug)
    if (!istilah) notFound()
    return <HalamanArtikel artikel={istilah} situs={await muatSitus()} />
  }
  ```

- [ ] **Langkah 6: Jalankan tes unit dan integrasi**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 34 passed (34)`, `Tests 242 passed (242)`; integrasi `Test Files 16 passed (16)`, `Tests 56 passed (56)`.

- [ ] **Langkah 7: Istilah contoh dan tes E2E glosarium**

  Tambahkan tiga istilah di `tests/e2e/siapkan.ts` (panduan disimpan ke variabel supaya bisa menjadi artikel terkait):

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index c65dcf8..9e673f6 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -55,7 +55,7 @@ const explainer = await payload.create({
     },
   })
   
  -await payload.create({
  +const panduan = await payload.create({
     collection: 'artikel',
     data: {
       ...dasar,
  @@ -111,6 +111,28 @@ await payload.create({
     },
   })
   
  +const istilah = [
  +  { judul: 'PTKP', slug: 'ptkp', pilar: 'uang-karier', definisi: 'PTKP adalah penghasilan tidak kena pajak, bagian penghasilan yang tidak dipotong PPh 21.' },
  +  { judul: 'TER', slug: 'ter', pilar: 'uang-karier', definisi: 'TER adalah tarif efektif rata-rata untuk memotong PPh 21 setiap bulan.' },
  +  { judul: 'BMI', slug: 'bmi', pilar: 'sehat', definisi: 'BMI adalah indeks massa tubuh, berat badan dibagi kuadrat tinggi badan.' },
  +]
  +for (const i of istilah) {
  +  await payload.create({
  +    collection: 'artikel',
  +    data: {
  +      ...dasar,
  +      judul: i.judul,
  +      slug: i.slug,
  +      tipe: 'glosarium',
  +      pilar: pilar[i.pilar],
  +      deck: i.definisi,
  +      intinya: [{ poin: i.definisi }, { poin: 'Penjelasan lengkap dan contohnya ada di panduan terkait.' }],
  +      isi: isi(p(i.definisi)),
  +      artikelTerkait: [panduan.id],
  +    },
  +  })
  +}
  +
   await payload.create({
     collection: 'artikel',
     draft: true,
  ```

  `tests/e2e/glosarium.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  import { SLUG, UKURAN_LAYAR } from './data'

  test.beforeEach(async ({ page }) => {
    await cegatCloudinary(page)
  })

  test('indeks glosarium: istilah per huruf dengan definisi', async ({ page }) => {
    await page.goto('/glosarium')
    await expect(page).toHaveTitle('Glosarium · point.')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Glosarium')
    await expect(page.getByRole('navigation', { name: 'Huruf' }).getByRole('link')).toHaveText(['B', 'P', 'T'])
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['B', 'P', 'T'])
    await expect(page.getByRole('definition').first()).toHaveText(/^BMI adalah indeks massa tubuh/)
    await page.getByRole('navigation', { name: 'Huruf' }).getByRole('link', { name: 'T' }).click()
    await expect(page).toHaveURL(/#huruf-t$/)
  })

  test('istilah glosarium di /glosarium/{slug}, tidak di /{slug}', async ({ page, request }) => {
    await page.goto('/glosarium/ptkp')
    await expect(page.getByRole('navigation', { name: 'Remah roti' }).getByRole('link')).toHaveText(['Beranda', 'Glosarium'])
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('PTKP')
    await expect(page.getByText('Glosarium', { exact: true }).first()).toBeVisible()
    // Pilihan editor (panduan) dulu, lalu artikel sepilar terbaru melengkapi.
    await expect(page.getByRole('region', { name: 'Baca juga' }).getByRole('link')).toHaveCount(2)
    await expect(page.getByRole('region', { name: 'Baca juga' }).getByRole('link').first()).toHaveAttribute('href', `/${SLUG.panduan}`)
    expect((await request.get('/ptkp')).status()).toBe(404)
    expect((await request.get(`/glosarium/${SLUG.panduan}`)).status()).toBe(404)
  })

  for (const { lebar, tinggi } of UKURAN_LAYAR) {
    test(`glosarium ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: tinggi })
      for (const path of ['/glosarium', '/glosarium/ter']) {
        await page.goto(path)
        await periksaTanpaGeserHorizontal(page)
        await periksaAxe(page)
      }
    })
  }
  ```

  Jalankan:

  ```bash
  pnpm test:e2e
  ```

  Hasil yang diharapkan: `20 passed`. Indeks menampilkan huruf B, P, T dengan definisi; `/glosarium/ptkp` berremah roti Beranda, Glosarium dan punya dua artikel terkait (panduan pilihan editor dulu, lalu explainer sepilar); `/ptkp` dan `/glosarium/cara-hitung-gaji-bersih` menjawab 404.

- [ ] **Langkah 8: Commit**

  ```bash
  git add src/lib/paths.ts src/modules/seo/data.ts src/modules/konten src/components/glosarium "src/app/(frontend)/glosarium" tests/unit/glosarium.test.ts tests/int/glosarium.int.spec.ts tests/int/sitemap.int.spec.ts tests/e2e
  git commit -m "feat(ui): indeks dan halaman glosarium, /glosarium di sitemap halaman"
  ```

### Task 8: Redirect 301 dari CMS di runtime, halaman 404, dan log 404 lewat beacon

**Files:**
- Create: `src/modules/konten/redirect.ts`, `src/modules/konten/log404.ts`, `src/modules/konten/endpoint.ts`, `src/modules/konten/navigasi.ts`, `src/components/galat/TidakDitemukan.tsx`, `src/components/galat/TidakDitemukan.module.css`, `src/components/galat/Catat404.tsx`, `src/app/(frontend)/not-found.tsx`
- Modify: `src/lib/tag.ts`, `src/hooks/revalidasiPublik.ts`, `src/collections/Redirect.ts`, `src/collections/Log404.ts`, `src/modules/seo/metadata.ts`, `src/modules/seo/index.ts`, `src/modules/konten/data.ts`, `src/modules/konten/cache.ts`, `src/modules/konten/index.ts`, `src/app/(frontend)/[...jalur]/page.tsx`, `src/app/(frontend)/glosarium/[slug]/page.tsx`, `tests/int/revalidasi.int.spec.ts`, `tests/e2e/data.ts`, `tests/e2e/siapkan.ts`, `tests/e2e/artikel.spec.ts`, `tests/e2e/glosarium.spec.ts`
- Test: `tests/unit/konten-galat.test.ts`, `tests/int/redirect-404.int.spec.ts`, `tests/e2e/galat.spec.ts`

**Interfaces:**
- Consumes: `revalidasiKoleksi` (Task 4), `kartuArtikel`, `POPULATE_ARTIKEL` (Task 4, `data.ts`), `DaftarKartu` (Task 6), `judulHalaman` (`src/lib/seo-dasar.ts`), hook `redirectSaatPathBerubah` (Rencana 1, membuat redirect otomatis saat slug berubah).
- Produces:
  - `TAG.redirect = 'redirect'`; koleksi `redirect` merevalidasi tag itu saat berubah atau dihapus.
  - `src/modules/konten/redirect.ts`: `type RedirectTersimpan = Pick<Redirect, 'kode' | 'ke'>`, `pathDariSegmen(segmen): string`, `tujuanRedirect(path, redirect): string | null`.
  - `src/modules/konten/log404.ts`: `MAKS_PATH = 300`, `MAKS_REFERER = 500`, `type Catatan404 = { path; referer: string | null }`, `rapikanLog404(body): Catatan404 | null`, `catat404(payload, catatan, sekarang?)`.
  - `src/modules/konten/data.ts`: `cariRedirect(payload, path)`, `ambilTerbaru(payload, jumlah)`. `cache.ts`: `muatRedirect(path)` (tag `redirect`), `muatTerbaru(jumlah)` (tag `artikel`, `pilar`).
  - `src/modules/konten/navigasi.ts`: `tanganiTidakAda(path): Promise<never>` (redirect permanen atau `notFound()`).
  - `src/modules/konten/endpoint.ts`: `PATH_CATAT_404 = '/catat'`, `endpointCatat404` (`POST /api/log-404/catat`, tanpa login, 400 untuk kiriman yang tidak layak, 204 bila tercatat).
  - `src/modules/seo/metadata.ts`: `JUDUL_TIDAK_DITEMUKAN`, `metadataTidakDitemukan(situs): Metadata`.
  - Komponen `TidakDitemukan({ terbaru })`, `Catat404()` (klien).

**Redirect.** Path yang tidak cocok dengan dokumen terbit sekarang diakhiri `tanganiTidakAda(path)` di komponen halaman (`[...jalur]` dan `glosarium/[slug]`). Fungsi itu mencari path di koleksi `redirect` (cache per path, tag `redirect`): kode 301 dengan tujuan mengarah lewat `permanentRedirect()` (status 308; Google memperlakukannya sama dengan 301), selain itu `notFound()` (kode 410 juga 404, karena halaman App Router tidak bisa memilih 410). Hasilnya ikut disimpan ISR, dan hook koleksi `redirect` membuangnya saat tabel berubah; redirect otomatis Rencana 1 (slug artikel terbit diganti) langsung berlaku. Karena respons redirect disimpan cache, `jumlahHit` tidak diisi.

**Metadata 404.** `generateMetadata` halaman mengembalikan `metadataTidakDitemukan()` untuk path yang tidak ada, dan `not-found.tsx` memakai fungsi yang sama. Bila `generateMetadata` mengembalikan `{}`, probe menunjukkan judul berubah menjadi "point." setelah hidrasi. `tanganiTidakAda` sengaja tidak dipanggil di `generateMetadata`: memanggilnya di dua tempat membuat header `Location` terkirim dua kali.

**Halaman 404** (spesifikasi §15): "Galat 404", judul display "Halaman ini tidak ada.", penjelasan singkat, tombol "Kembali ke beranda", dan tiga tulisan terbaru (bukan glosarium). "Artikel populer" butuh data klik yang baru ada di Rencana 6, dan form pencarian butuh `/cari` dari Rencana 4B; keduanya ditunda. Catatan perilaku Next 16.3.3 (diperiksa dengan aplikasi Next minimal di probe, tanpa Payload): `notFound()` yang dilempar halaman selalu dikirim sebagai cangkang `<html id="__next_error__">` dengan status 404, judul, dan `noindex`, lalu isi `not-found.tsx` dirender di browser dari data RSC yang ikut di HTML. Halaman `/_not-found` statis tidak terpengaruh, tetapi rute catch-all membuat semua path melewati `notFound()`. Akibatnya isi 404 baru tampil setelah JavaScript jalan; tes axe 404 menunggu `<html lang="id">` dari layout sebelum memeriksa. Lihat Risiko.

**Log 404.** Halaman 404 disimpan ISR, jadi server tidak merender setiap kunjungan. `Catat404` (komponen klien kecil) mengirim `navigator.sendBeacon` berisi `{ path, referer }` ke `POST /api/log-404/catat` di setiap kunjungan (termasuk navigasi klien), dengan `fetch` `keepalive` sebagai cadangan. Endpoint merapikan kiriman (`rapikanLog404`: path situs saja, query dan fragmen dibuang, maks 300 karakter, tanpa karakter kontrol, tanpa `/api/`, `/admin`, `/_next/`; referer hanya URL http(s) maks 500 karakter) lalu menambah `jumlah`, `terakhir`, dan referer terakhir di koleksi `log-404` lewat Local API (satu baris per path; bentrok indeks unik saat dua kiriman pertama bersamaan ditangani dengan menambah baris yang sudah ada).

Satu catatan dari Next 16.3.3: pada render ISR pertama sebuah redirect, header `Location` terkirim dua kali dengan nilai sama (`app-page-runtime.js` menambahkan header dari entri cache setelah render sudah memasang header itu); respons berikutnya dari cache hanya sekali. Browser menerimanya, jadi tes E2E memeriksa nilai unik header itu. Lihat Risiko.

- [ ] **Langkah 1: Tulis tes unit dan integrasi yang gagal**

  `tests/unit/konten-galat.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it } from 'vitest'

  import { TidakDitemukan } from '@/components/galat/TidakDitemukan'
  import { rapikanLog404 } from '@/modules/konten/log404'
  import { pathDariSegmen, tujuanRedirect } from '@/modules/konten/redirect'
  import { metadataTidakDitemukan } from '@/modules/seo/metadata'

  describe('tujuanRedirect', () => {
    it('hanya 301 dengan tujuan yang bukan dirinya sendiri', () => {
      expect(tujuanRedirect('/lama', { kode: '301', ke: ' /baru ' })).toBe('/baru')
      expect(tujuanRedirect('/lama', { kode: '301', ke: 'https://contoh.id/x' })).toBe('https://contoh.id/x')
      expect(tujuanRedirect('/lama', { kode: '410', ke: null })).toBeNull()
      expect(tujuanRedirect('/lama', { kode: '301', ke: '' })).toBeNull()
      expect(tujuanRedirect('/lama', { kode: '301', ke: '/lama' })).toBeNull()
      expect(tujuanRedirect('/lama', null)).toBeNull()
    })

    it('path dari segmen catch-all', () => {
      expect(pathDariSegmen(['uang-karier', 'pajak'])).toBe('/uang-karier/pajak')
    })
  })

  describe('rapikanLog404', () => {
    it('membuang query dan fragmen; referer hanya URL http(s)', () => {
      expect(rapikanLog404({ path: '/jalan-buntu?utm=wa#atas', referer: 'https://www.google.com/' })).toEqual({
        path: '/jalan-buntu',
        referer: 'https://www.google.com/',
      })
      expect(rapikanLog404({ path: '/x', referer: 'javascript:alert(1)' })).toEqual({ path: '/x', referer: null })
      expect(rapikanLog404({ path: '/x', referer: 12 })).toEqual({ path: '/x', referer: null })
    })

    it('menolak yang bukan path situs, terlalu panjang, berkarakter kontrol, atau rute sistem', () => {
      for (const path of ['jalan', '//evil.com', `/${'a'.repeat(300)}`, '/a\nb', '/api/x', '/admin/collections', '/_next/static/x.js', 12]) {
        expect(rapikanLog404({ path }), String(path)).toBeNull()
      }
      expect(rapikanLog404(null)).toBeNull()
    })
  })

  describe('halaman 404', () => {
    it('metadata: judul dengan pola situs, tanpa canonical', () => {
      const meta = metadataTidakDitemukan({ urlSitus: 'https://point.lat', polaJudul: '%s · point.' })
      expect(meta.title).toEqual({ absolute: 'Halaman tidak ditemukan · point.' })
      expect(meta).not.toHaveProperty('alternates')
    })

    it('jalan kembali ke beranda dan tulisan terbaru', () => {
      const html = renderToStaticMarkup(
        h(TidakDitemukan, {
          terbaru: [{ id: 1, judul: 'Cara hitung THR', href: '/cara-hitung-thr', tipe: 'panduan', pilar: null, intinya: null }],
        }),
      )
      expect(html).toMatch(/<h1 class="[^"]*">Halaman ini tidak ada\.<\/h1>/)
      expect(html).toMatch(/<a class="[^"]*" href="\/">Kembali ke beranda/)
      expect(html).toContain('href="/cara-hitung-thr"')
      expect(renderToStaticMarkup(h(TidakDitemukan, { terbaru: [] }))).not.toContain('Tulisan terbaru')
    })
  })
  ```

  `tests/int/redirect-404.int.spec.ts`

  ```ts
  import { afterAll, beforeAll, describe, expect, it } from 'vitest'

  import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'
  import { ambilTerbaru, cariRedirect } from '@/modules/konten/data'
  import { catat404 } from '@/modules/konten/log404'

  import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
  import { getTestPayload, unik } from './helpers'

  describe('redirect dan log 404 untuk halaman publik', () => {
    let tag: string[] = []

    beforeAll(() => {
      pakaiPemicuRevalidasi((t) => tag.push(t))
    })

    afterAll(() => {
      pakaiPemicuRevalidasi(null)
    })

    it('slug artikel terbit berganti: path lama punya redirect 301 dan tag redirect direvalidasi', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const artikel = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      tag = []
      const slugBaru = unik('judul-baru')
      await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'published', slug: slugBaru } })
      expect(tag).toContain('redirect')
      expect(await cariRedirect(payload, `/${artikel.slug}`)).toEqual({ kode: '301', ke: `/${slugBaru}` })
      expect(await cariRedirect(payload, `/${unik('tidak-ada')}`)).toBeNull()
    })

    it('redirect 410 tetap terbaca dengan kodenya', async () => {
      const payload = await getTestPayload()
      const dari = `/${unik('dihapus')}`
      await payload.create({ collection: 'redirect', data: { dari, kode: '410' } })
      expect(await cariRedirect(payload, dari)).toEqual({ kode: '410', ke: null })
    })

    it('catat404 menambah hitungan per path dan menyimpan referer terakhir', async () => {
      const payload = await getTestPayload()
      const path = `/${unik('jalan-buntu')}`
      await catat404(payload, { path, referer: null }, new Date('2026-11-04T01:00:00.000Z'))
      await catat404(payload, { path, referer: 'https://www.google.com/' }, new Date('2026-11-04T02:00:00.000Z'))
      const { docs } = await payload.find({ collection: 'log-404', where: { path: { equals: path } } })
      expect(docs).toHaveLength(1)
      expect(docs[0]).toMatchObject({ jumlah: 2, terakhir: '2026-11-04T02:00:00.000Z', referer: 'https://www.google.com/' })
    })

    it('tulisan terbaru: artikel terbit selain glosarium, terbaru dulu', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const lama = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      const baru = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium' } })
      const kartu = await ambilTerbaru(payload, 2)
      expect(kartu.map((k) => k.id)).toEqual([baru.id, lama.id])
    })
  })
  ```

  Ganti slug pilar sekarang juga merevalidasi tag `redirect` (redirect otomatis dibuat lebih dulu). Sesuaikan `tests/int/revalidasi.int.spec.ts`:

  ```diff
  diff --git a/tests/int/revalidasi.int.spec.ts b/tests/int/revalidasi.int.spec.ts
  index 7f67f7f..40f4ef8 100644
  --- a/tests/int/revalidasi.int.spec.ts
  +++ b/tests/int/revalidasi.int.spec.ts
  @@ -64,7 +64,8 @@ describe('revalidasi tag saat konten berubah', () => {
       tag = []
       const slugBaru = unik('sehat-baru')
       await payload.update({ collection: 'pilar', id: pilar.id, data: { slug: slugBaru } })
  -    expect(tag).toEqual(['pilar', `pilar:${pilar.id}`, `pilar:${slugBaru}`, `pilar:${pilar.slug}`, 'beranda', 'sitemap'])
  +    // Ganti slug membuat redirect otomatis, jadi tag `redirect` ikut direvalidasi lebih dulu.
  +    expect(tag).toEqual(['redirect', 'pilar', `pilar:${pilar.id}`, `pilar:${slugBaru}`, `pilar:${pilar.slug}`, 'beranda', 'sitemap'])
   
       tag = []
       const penulis = await payload.create({ collection: 'penulis', data: { nama: unik('Penulis'), bio: 'Bio.' } })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/konten-galat.test.ts` dengan `Cannot find package '@/components/galat/TidakDitemukan'`.

- [ ] **Langkah 3: Tag dan hook redirect, metadata 404**

  ```diff
  diff --git a/src/lib/tag.ts b/src/lib/tag.ts
  index dddc7a9..0d1e57c 100644
  --- a/src/lib/tag.ts
  +++ b/src/lib/tag.ts
  @@ -8,6 +8,7 @@
    * - `beranda`, `sitemap` (sitemap, news sitemap, RSS), `pengaturan-seo` (robots.txt, metadata situs).
    * - `header`, `footer`: global tampilan yang dirender layout di setiap halaman publik.
    * - `media`: dokumen media (alt, caption, kredit, ukuran) yang ditampilkan halaman.
  + * - `redirect`: tabel redirect yang dibaca halaman saat path tidak cocok dengan dokumen.
    */
   
   export const KOLEKSI_PUBLIK = ['artikel', 'pilar', 'subkategori', 'penulis', 'tools', 'video', 'halaman'] as const
  @@ -20,6 +21,7 @@ export const TAG = {
     header: 'header',
     footer: 'footer',
     media: 'media',
  +  redirect: 'redirect',
     koleksi: (koleksi: KoleksiPublik) => koleksi,
     dokumen: (koleksi: KoleksiPublik, id: number | string) => `${koleksi}:${id}`,
     pilar: (slug: string) => `pilar:${slug}`,
  ```

  ```diff
  diff --git a/src/hooks/revalidasiPublik.ts b/src/hooks/revalidasiPublik.ts
  index 8499ed1..996ea02 100644
  --- a/src/hooks/revalidasiPublik.ts
  +++ b/src/hooks/revalidasiPublik.ts
  @@ -134,7 +134,7 @@ export function revalidasiPublik(koleksi: KoleksiPublik): {
     return { beforeChange, afterChange, afterDelete }
   }
   
  -/** Hook koleksi pendukung (media): merevalidasi tag tetap setiap kali dokumen disimpan atau dihapus. */
  +/** Hook koleksi pendukung (media, redirect): merevalidasi tag tetap setiap kali dokumen disimpan atau dihapus. */
   export function revalidasiKoleksi(tag: string[]): {
     afterChange: CollectionAfterChangeHook
     afterDelete: CollectionAfterDeleteHook
  ```

  ```diff
  diff --git a/src/collections/Redirect.ts b/src/collections/Redirect.ts
  index f5f7419..ff68c39 100644
  --- a/src/collections/Redirect.ts
  +++ b/src/collections/Redirect.ts
  @@ -1,14 +1,20 @@
   import type { CollectionConfig } from 'payload'
   
   import { isLoggedIn } from '@/access'
  +import { revalidasiKoleksi } from '@/hooks/revalidasiPublik'
   import { validasiPathRedirect } from '@/lib/redirect'
  +import { TAG } from '@/lib/tag'
   import { validasiUrlOpsional } from '@/lib/validasi'
   
  +/** Halaman 404 dan redirect yang sudah tersimpan (ISR) dibuang saat tabel redirect berubah. */
  +const revalidasi = revalidasiKoleksi([TAG.redirect])
  +
   export const Redirect: CollectionConfig = {
     slug: 'redirect',
     labels: { singular: 'Redirect', plural: 'Redirect' },
     admin: { useAsTitle: 'dari', defaultColumns: ['dari', 'ke', 'kode', 'sumber', 'jumlahHit'], group: 'SEO' },
     access: { read: isLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  +  hooks: { afterChange: [revalidasi.afterChange], afterDelete: [revalidasi.afterDelete] },
     fields: [
       {
         name: 'dari',
  ```

  ```diff
  diff --git a/src/modules/seo/metadata.ts b/src/modules/seo/metadata.ts
  index d0e38ff..e39da1a 100644
  --- a/src/modules/seo/metadata.ts
  +++ b/src/modules/seo/metadata.ts
  @@ -1,6 +1,7 @@
   import type { Metadata } from 'next'
   
   import { pathFor } from '@/lib/paths'
  +import { judulHalaman } from '@/lib/seo-dasar'
   
   import {
     ambil,
  @@ -81,3 +82,16 @@ export function metadata(masukan: MasukanSeo, situs: Situs): Metadata {
     }
     return hasil
   }
  +
  +export const JUDUL_TIDAK_DITEMUKAN = 'Halaman tidak ditemukan'
  +
  +/**
  + * Metadata halaman 404 (`not-found.tsx`). Tanpa canonical dan Open Graph karena halaman ini tidak
  + * diindeks; Next menambahkan `noindex` sendiri untuk status 404.
  + */
  +export function metadataTidakDitemukan(situs: Pick<PengaturanSitus, 'urlSitus' | 'polaJudul'>): Metadata {
  +  return {
  +    metadataBase: new URL(situs.urlSitus),
  +    title: { absolute: judulHalaman(situs.polaJudul, JUDUL_TIDAK_DITEMUKAN) },
  +  }
  +}
  ```

  ```diff
  diff --git a/src/modules/seo/index.ts b/src/modules/seo/index.ts
  index a5fcea8..4abe2a8 100644
  --- a/src/modules/seo/index.ts
  +++ b/src/modules/seo/index.ts
  @@ -11,7 +11,7 @@
    * `/feed.xml`) ada di `src/app/(frontend)/` dan memakai `rute.ts`. Ekspor ini aman untuk server;
    * komponen admin mengimpor `panel.ts` langsung.
    */
  -export { metadata, canonicalDokumen, PATH_FEED } from './metadata'
  +export { metadata, canonicalDokumen, JUDUL_TIDAK_DITEMUKAN, metadataTidakDitemukan, PATH_FEED } from './metadata'
   export { jsonLd, remahRoti, serialisasiJsonLd, tipeSchemaArtikel } from './jsonld'
   export type { JsonLd, NodeJsonLd, RemahRoti } from './jsonld'
   export { analisis, skor, BATAS } from './analisis'
  ```

- [ ] **Langkah 4: Redirect, log 404, dan endpoint**

  `src/modules/konten/redirect.ts`

  ```ts
  import type { Redirect } from '@/payload-types'

  export type RedirectTersimpan = Pick<Redirect, 'kode' | 'ke'>

  /** Path dari segmen rute catch-all (`['a', 'b']` menjadi `/a/b`). */
  export function pathDariSegmen(segmen: string[]): string {
    return `/${segmen.join('/')}`
  }

  /**
   * Tujuan redirect permanen, atau `null` bila path harus menjawab 404: tidak ada redirect, kode 410,
   * atau tujuan kosong. Redirect ke dirinya sendiri juga diabaikan supaya tidak berputar.
   */
  export function tujuanRedirect(path: string, redirect: RedirectTersimpan | null): string | null {
    const ke = redirect?.ke?.trim()
    if (redirect?.kode !== '301' || !ke || ke === path) return null
    return ke
  }
  ```

  `src/modules/konten/log404.ts`

  ```ts
  import type { Payload } from 'payload'

  /** Batas panjang supaya log tidak bisa diisi teks sembarang yang sangat panjang. */
  export const MAKS_PATH = 300
  export const MAKS_REFERER = 500

  /** Path yang bukan halaman publik tidak dicatat. */
  const AWALAN_SISTEM = ['/api/', '/admin', '/_next/']

  export type Catatan404 = { path: string; referer: string | null }

  /**
   * Merapikan kiriman beacon halaman 404. `null` bila path tidak layak dicatat: bukan path situs,
   * terlalu panjang, berisi karakter kontrol, atau milik rute sistem. Query dan fragmen dibuang supaya
   * satu halaman hilang tercatat satu baris.
   */
  export function rapikanLog404(body: unknown): Catatan404 | null {
    const data = (body ?? {}) as { path?: unknown; referer?: unknown }
    if (typeof data.path !== 'string') return null
    const path = data.path.trim().split(/[?#]/)[0]
    if (!path.startsWith('/') || path.startsWith('//') || path.length > MAKS_PATH) return null
    if (/[\u0000-\u001f\u007f]/.test(path)) return null
    if (AWALAN_SISTEM.some((awalan) => path.startsWith(awalan))) return null
    return { path, referer: rapikanReferer(data.referer) }
  }

  function rapikanReferer(nilai: unknown): string | null {
    if (typeof nilai !== 'string' || !nilai || nilai.length > MAKS_REFERER) return null
    try {
      const url = new URL(nilai)
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
    } catch {
      return null
    }
  }

  /**
   * Menambah hitungan path di koleksi `log-404` (satu baris per path). Referer terakhir disimpan bila
   * ada, karena itu yang menunjukkan tautan rusak yang perlu dibetulkan. Dua kiriman bersamaan untuk
   * path baru bisa bentrok di indeks unik `path`; kiriman kedua lalu menambah baris yang sudah ada.
   */
  export async function catat404(payload: Payload, catatan: Catatan404, sekarang = new Date()): Promise<void> {
    const tambah = async () => {
      const { docs } = await payload.find({ collection: 'log-404', where: { path: { equals: catatan.path } }, limit: 1, depth: 0 })
      const lama = docs[0]
      if (!lama) return false
      await payload.update({
        collection: 'log-404',
        id: lama.id,
        data: { jumlah: (lama.jumlah ?? 0) + 1, terakhir: sekarang.toISOString(), ...(catatan.referer ? { referer: catatan.referer } : {}) },
      })
      return true
    }
    if (await tambah()) return
    try {
      await payload.create({
        collection: 'log-404',
        data: { path: catatan.path, jumlah: 1, terakhir: sekarang.toISOString(), referer: catatan.referer },
      })
    } catch (galat) {
      if (!(await tambah())) throw galat
    }
  }
  ```

  `src/modules/konten/endpoint.ts`

  ```ts
  import type { Endpoint } from 'payload'

  import { catat404, rapikanLog404 } from './log404'

  /** Path endpoint di bawah `/api/log-404`, dipanggil beacon halaman 404. */
  export const PATH_CATAT_404 = '/catat'

  /**
   * `POST /api/log-404/catat`: dipanggil browser pembaca dari halaman 404 (`navigator.sendBeacon`).
   * Terbuka tanpa login karena pembacanya anonim; isi dirapikan `rapikanLog404` dan ditulis lewat Local
   * API. Pencatatan dari browser dipilih karena halaman 404 disimpan cache (ISR), jadi server tidak
   * merender ulang setiap kunjungan.
   */
  export const endpointCatat404: Endpoint = {
    path: PATH_CATAT_404,
    method: 'post',
    handler: async (req) => {
      const catatan = rapikanLog404(await req.json?.().catch(() => null))
      if (!catatan) return Response.json({ pesan: 'Path tidak dicatat.' }, { status: 400 })
      await catat404(req.payload, catatan)
      return new Response(null, { status: 204 })
    },
  }
  ```

  ```diff
  diff --git a/src/collections/Log404.ts b/src/collections/Log404.ts
  index a8ff31f..07bd6f1 100644
  --- a/src/collections/Log404.ts
  +++ b/src/collections/Log404.ts
  @@ -1,14 +1,16 @@
   import type { CollectionConfig } from 'payload'
   
   import { isLoggedIn } from '@/access'
  +import { endpointCatat404 } from '@/modules/konten/endpoint'
   
  -/** Diisi server saat halaman 404 dirender (Rencana 4). Editor bisa menjadikannya redirect. */
  +/** Diisi beacon halaman 404 lewat `POST /api/log-404/catat` (Rencana 4). Editor bisa menjadikannya redirect. */
   export const Log404: CollectionConfig = {
     slug: 'log-404',
     labels: { singular: 'Log 404', plural: 'Log 404' },
     defaultSort: '-jumlah',
     admin: { useAsTitle: 'path', defaultColumns: ['path', 'jumlah', 'terakhir', 'referer'], group: 'SEO' },
     access: { read: isLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  +  endpoints: [endpointCatat404],
     fields: [
       { name: 'path', type: 'text', required: true, unique: true, index: true },
       { name: 'jumlah', type: 'number', defaultValue: 1 },
  ```

  ```diff
  diff --git a/src/modules/konten/data.ts b/src/modules/konten/data.ts
  index 83701a7..7334894 100644
  --- a/src/modules/konten/data.ts
  +++ b/src/modules/konten/data.ts
  @@ -3,8 +3,10 @@ import type { Payload, Where } from 'payload'
   import type { Artikel } from '@/payload-types'
   import { validasiFormatSlug } from '@/lib/slug'
   
  -import { gabungTerkait, MAKS_TERKAIT, susunArtikel } from './artikel'
  +import { gabungTerkait, kartuArtikel, MAKS_TERKAIT, susunArtikel } from './artikel'
   import { kelompokkanIstilah } from './glosarium'
  +import { MAKS_PATH } from './log404'
  +import type { RedirectTersimpan } from './redirect'
   import { susunFooter, susunHeader } from './tampilan'
   import type { DataArtikel, DataFooter, DataHeader, KartuArtikel, KelompokIstilah } from './tipe'
   
  @@ -108,3 +110,32 @@ export async function ambilGlosarium(payload: Payload): Promise<KelompokIstilah[
     })
     return kelompokkanIstilah(docs)
   }
  +
  +/** Redirect untuk path ini dari koleksi `redirect` (Local API, jadi akses admin tidak berlaku). */
  +export async function cariRedirect(payload: Payload, path: string): Promise<RedirectTersimpan | null> {
  +  if (path.length > MAKS_PATH) return null
  +  const { docs } = await payload.find({
  +    collection: 'redirect',
  +    where: { dari: { equals: path } },
  +    limit: 1,
  +    depth: 0,
  +    pagination: false,
  +    select: { kode: true, ke: true },
  +  })
  +  return docs[0] ? { kode: docs[0].kode, ke: docs[0].ke ?? null } : null
  +}
  +
  +/** Artikel terbit terbaru (bukan glosarium) untuk halaman 404. */
  +export async function ambilTerbaru(payload: Payload, jumlah: number): Promise<KartuArtikel[]> {
  +  const { docs } = await payload.find({
  +    collection: 'artikel',
  +    where: { and: [terbit, { tipe: { not_equals: 'glosarium' } }] },
  +    sort: '-terbitPada',
  +    limit: jumlah,
  +    depth: 1,
  +    pagination: false,
  +    select: { judul: true, slug: true, tipe: true, pilar: true, intinya: true },
  +    populate: { pilar: POPULATE_ARTIKEL.pilar },
  +  })
  +  return docs.map(kartuArtikel).filter((k): k is KartuArtikel => k !== null)
  +}
  ```

  ```diff
  diff --git a/src/modules/konten/cache.ts b/src/modules/konten/cache.ts
  index aee291a..54c1664 100644
  --- a/src/modules/konten/cache.ts
  +++ b/src/modules/konten/cache.ts
  @@ -5,7 +5,7 @@ import { getPayload } from 'payload'
   import { TAG } from '@/lib/tag'
   import { ambilSitus } from '@/modules/seo/situs'
   
  -import { ambilArtikel, ambilFooter, ambilGlosarium, ambilHeader } from './data'
  +import { ambilArtikel, ambilFooter, ambilGlosarium, ambilHeader, ambilTerbaru, cariRedirect } from './data'
   
   /**
    * Data halaman publik yang di-cache dengan tag (spesifikasi §5 "Rendering"). Halaman dirender statis
  @@ -63,3 +63,15 @@ export const muatGlosarium = unstable_cache(async () => ambilGlosarium(await pay
     tags: [TAG.koleksi('artikel')],
     revalidate: SEJAM,
   })
  +
  +/** Redirect per path. Hook koleksi `redirect` membuang cache ini beserta halaman yang memakainya. */
  +export const muatRedirect = unstable_cache(async (path: string) => cariRedirect(await payload(), path), ['konten', 'redirect'], {
  +  tags: [TAG.redirect],
  +  revalidate: SEJAM,
  +})
  +
  +/** Kartu tulisan terbaru di halaman 404. */
  +export const muatTerbaru = unstable_cache(async (jumlah: number) => ambilTerbaru(await payload(), jumlah), ['konten', 'terbaru'], {
  +  tags: [TAG.koleksi('artikel'), TAG.koleksi('pilar')],
  +  revalidate: SEJAM,
  +})
  ```

  `src/modules/konten/navigasi.ts`

  ```ts
  import { notFound, permanentRedirect } from 'next/navigation'

  import { muatRedirect } from './cache'
  import { tujuanRedirect } from './redirect'

  /**
   * Dipanggil halaman saat path tidak cocok dengan dokumen terbit. Redirect permanen dari koleksi
   * `redirect` bila ada (dibuat otomatis saat slug berubah, atau manual oleh editor); selain itu 404.
   * `permanentRedirect` menjawab 308, yang diperlakukan Google sama dengan 301. Kode 410 menjawab 404
   * karena halaman App Router tidak bisa memilih status 410; bagi Google keduanya sama.
   */
  export async function tanganiTidakAda(path: string): Promise<never> {
    const tujuan = tujuanRedirect(path, await muatRedirect(path))
    if (tujuan) permanentRedirect(tujuan)
    notFound()
  }
  ```

  Ganti seluruh isi `src/modules/konten/index.ts`:

  `src/modules/konten/index.ts`

  ```ts
  /**
   * Modul konten publik: data siap render untuk halaman situs (Rencana 4).
   *
   * - `muat*()` dipanggil halaman dan layout: query Payload yang di-cache dengan tag `TAG`.
   * - `ambil*(payload)` versi tanpa cache untuk tes integrasi dan skrip.
   * - `tanganiTidakAda(path)` untuk path tanpa dokumen: redirect 301 dari CMS atau 404.
   * - Fungsi murni (`susunHeader`, `susunArtikel`, `tanggalIndonesia`, ...) menerjemahkan dokumen
   *   Payload ke tipe di `tipe.ts`, supaya komponen tidak membaca relasi Payload mentah.
   */
  export { muatArtikel, muatFooter, muatGlosarium, muatHeader, muatRedirect, muatSitus, muatTerbaru, TAG_ARTIKEL } from './cache'
  export { ambilArtikel, ambilFooter, ambilGlosarium, ambilHeader, ambilTerbaru, cariRedirect } from './data'
  export { tanganiTidakAda } from './navigasi'
  export { pathDariSegmen, tujuanRedirect } from './redirect'
  export { catat404, rapikanLog404 } from './log404'
  export { kelompokkanIstilah } from './glosarium'
  export { HAK_CIPTA_BAWAAN, LABEL_SOSIAL, susunFooter, susunHeader, tautanInternal, TOOLS_BAWAAN } from './tampilan'
  export {
    gabungTerkait,
    kartuArtikel,
    KATA_PER_MENIT,
    MAKS_TERKAIT,
    mediaTampil,
    MIN_DAFTAR_ISI,
    penulisRingkas,
    pilarRingkas,
    susunArtikel,
    tandaiSubjudul,
    tanggalIndonesia,
    waktuBaca,
  } from './artikel'
  export type * from './tipe'
  ```

- [ ] **Langkah 5: Halaman 404 dan rute**

  `src/components/galat/Catat404.tsx`

  ```tsx
  'use client'

  import { usePathname } from 'next/navigation'
  import { useEffect } from 'react'

  const ENDPOINT = '/api/log-404/catat'

  /**
   * Mencatat kunjungan ke halaman 404 ke koleksi `log-404` lewat beacon. Halaman 404 disimpan cache
   * (ISR), jadi pencatatan dilakukan dari browser di setiap kunjungan, termasuk navigasi klien.
   */
  export function Catat404() {
    const path = usePathname()
    useEffect(() => {
      const data = JSON.stringify({ path: window.location.pathname, referer: document.referrer || null })
      const terkirim = navigator.sendBeacon?.(ENDPOINT, new Blob([data], { type: 'application/json' }))
      if (!terkirim) {
        void fetch(ENDPOINT, { method: 'POST', body: data, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {})
      }
    }, [path])
    return null
  }
  ```

  `src/components/galat/TidakDitemukan.module.css`

  ```css
  .halaman {
    display: grid;
    gap: var(--ruang-6);
    padding-top: var(--ruang-12);
  }

  .kode {
    font-size: var(--teks-label);
    font-weight: 800;
    letter-spacing: var(--jarak-label);
    text-transform: uppercase;
  }

  .judul {
    max-width: 14ch;
    /* Gaya display beranda, sedikit lebih kecil supaya jalan kembali tetap di atas lipatan. */
    font-size: clamp(56px, 9vw, 128px);
    font-stretch: var(--lebar-display);
    line-height: var(--tinggi-display);
    letter-spacing: -0.035em;
    text-transform: uppercase;
  }

  .teks {
    max-width: 46ch;
    font-size: var(--teks-deck);
    line-height: 1.45;
  }

  .tombol {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: var(--ruang-2);
    min-height: 52px;
    padding: 0 var(--ruang-6);
    border-radius: var(--radius-kontrol);
    background: var(--tombol);
    color: var(--tombol-teks);
    font-weight: 700;
    text-decoration: none;
    transition: transform var(--durasi-cepat) var(--kurva);
  }

  .tombol:active {
    transform: scale(0.98);
  }

  .terbaru {
    display: grid;
    gap: var(--ruang-6);
    margin-top: var(--ruang-10);
  }

  .subjudul {
    font-size: var(--teks-h2);
    font-stretch: var(--lebar-h2);
  }
  ```

  `src/components/galat/TidakDitemukan.tsx`

  ```tsx
  import { Ikon } from '@/components/dasar/Ikon'
  import { Tautan } from '@/components/dasar/Tautan'
  import { DaftarKartu } from '@/components/kartu/KartuArtikel'
  import type { KartuArtikel } from '@/modules/konten/tipe'

  import { Catat404 } from './Catat404'
  import gaya from './TidakDitemukan.module.css'

  /** Isi halaman 404 (spesifikasi §15): penjelasan singkat, jalan kembali, dan tulisan terbaru. */
  export function TidakDitemukan({ terbaru }: { terbaru: KartuArtikel[] }) {
    return (
      <div className={`kontainer ${gaya.halaman}`}>
        <p className={gaya.kode}>Galat 404</p>
        <h1 className={gaya.judul}>Halaman ini tidak ada.</h1>
        <p className={gaya.teks}>
          Mungkin tautannya salah ketik, atau tulisannya sudah pindah alamat. Mulai lagi dari beranda, atau baca tulisan terbaru
          di bawah.
        </p>
        <Tautan href="/" className={gaya.tombol}>
          Kembali ke beranda
          <Ikon nama="arrow-right" />
        </Tautan>
        {terbaru.length > 0 && (
          <section aria-labelledby="terbaru" className={gaya.terbaru}>
            <h2 id="terbaru" className={gaya.subjudul}>
              Tulisan terbaru
            </h2>
            <DaftarKartu kartu={terbaru} />
          </section>
        )}
        <Catat404 />
      </div>
    )
  }
  ```

  `src/app/(frontend)/not-found.tsx`

  ```tsx
  import type { Metadata } from 'next'

  import { TidakDitemukan } from '@/components/galat/TidakDitemukan'
  import { muatSitus, muatTerbaru } from '@/modules/konten'
  import { metadataTidakDitemukan } from '@/modules/seo'

  /** Jumlah tulisan terbaru di halaman 404. Rencana 6 bisa menggantinya dengan yang paling banyak diklik. */
  const JUMLAH_TERBARU = 3

  export async function generateMetadata(): Promise<Metadata> {
    return metadataTidakDitemukan(await muatSitus())
  }

  /** Dipakai untuk setiap `notFound()` di halaman publik dan path yang tidak cocok dengan rute mana pun. */
  export default async function HalamanTidakDitemukan() {
    return <TidakDitemukan terbaru={await muatTerbaru(JUMLAH_TERBARU)} />
  }
  ```

  Ganti seluruh isi kedua halaman dinamis:

  `src/app/(frontend)/[...jalur]/page.tsx`

  ```tsx
  import type { Metadata } from 'next'
  import { cache } from 'react'

  import { HalamanArtikel } from '@/components/artikel/HalamanArtikel'
  import { muatArtikel, muatSitus, pathDariSegmen, tanganiTidakAda } from '@/modules/konten'
  import { metadata, metadataTidakDitemukan } from '@/modules/seo'

  type Props = { params: Promise<{ jalur: string[] }> }

  /**
   * Semua path publik yang tidak ditangani rute yang lebih spesifik: artikel `/{slug}` di Rencana 4A;
   * pilar, subkategori, dan halaman statis menyusul di Rencana 4B. Halaman dirender saat pertama
   * diminta lalu disimpan (ISR); tag cache data membuangnya saat konten berubah. Path tanpa dokumen
   * diteruskan ke `tanganiTidakAda` (redirect dari CMS atau 404), hasilnya juga disimpan.
   */
  export function generateStaticParams() {
    return []
  }

  /** Satu query per permintaan untuk `generateMetadata` dan halaman. */
  const cari = cache(async (jalur: string[]) => (jalur.length === 1 ? muatArtikel(jalur[0], false) : null))

  /**
   * Path tanpa dokumen: metadata 404 di sini (sama dengan `not-found.tsx`, supaya judul tetap setelah
   * hidrasi), sedangkan keputusan redirect atau 404 hanya di halaman.
   */
  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { jalur } = await params
    const artikel = await cari(jalur)
    if (!artikel) return metadataTidakDitemukan(await muatSitus())
    return metadata({ jenis: 'artikel', doc: artikel.seo }, await muatSitus())
  }

  export default async function Halaman({ params }: Props) {
    const { jalur } = await params
    const artikel = await cari(jalur)
    if (!artikel) return tanganiTidakAda(pathDariSegmen(jalur))
    return <HalamanArtikel artikel={artikel} situs={await muatSitus()} />
  }
  ```

  `src/app/(frontend)/glosarium/[slug]/page.tsx`

  ```tsx
  import type { Metadata } from 'next'
  import { cache } from 'react'

  import { HalamanArtikel } from '@/components/artikel/HalamanArtikel'
  import { pathFor } from '@/lib/paths'
  import { muatArtikel, muatSitus, tanganiTidakAda } from '@/modules/konten'
  import { metadata, metadataTidakDitemukan } from '@/modules/seo'

  type Props = { params: Promise<{ slug: string }> }

  /** `/glosarium/{slug}`: artikel bertipe glosarium, tata letak sama dengan artikel lain (ISR). */
  export function generateStaticParams() {
    return []
  }

  const cari = cache(async (slug: string) => muatArtikel(slug, true))

  const pathIstilah = (slug: string) => pathFor({ jenis: 'artikel', slug, tipe: 'glosarium' })

  /**
   * Path tanpa dokumen: metadata 404 di sini (sama dengan `not-found.tsx`, supaya judul tetap setelah
   * hidrasi), sedangkan keputusan redirect atau 404 hanya di halaman.
   */
  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const istilah = await cari((await params).slug)
    if (!istilah) return metadataTidakDitemukan(await muatSitus())
    return metadata({ jenis: 'artikel', doc: istilah.seo }, await muatSitus())
  }

  export default async function Istilah({ params }: Props) {
    const { slug } = await params
    const istilah = await cari(slug)
    if (!istilah) return tanganiTidakAda(pathIstilah(slug))
    return <HalamanArtikel artikel={istilah} situs={await muatSitus()} />
  }
  ```

- [ ] **Langkah 6: Jalankan tes unit dan integrasi**

  Jalankan:

  ```bash
  pnpm generate:types && git diff --stat src/payload-types.ts
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  ```

  Hasil yang diharapkan: `payload-types.ts` tidak berubah (endpoint dan hook tidak menambah kolom); bersih; unit `Test Files 35 passed (35)`, `Tests 248 passed (248)`; integrasi `Test Files 17 passed (17)`, `Tests 60 passed (60)`.

- [ ] **Langkah 7: Redirect contoh dan tes E2E**

  Tambahkan artikel yang slug-nya diganti dan tiga redirect manual di data E2E:

  ```diff
  diff --git a/tests/e2e/data.ts b/tests/e2e/data.ts
  index d1c32b8..589af39 100644
  --- a/tests/e2e/data.ts
  +++ b/tests/e2e/data.ts
  @@ -13,6 +13,8 @@ export const SLUG = {
     explainer: 'apa-itu-ter-pph-21',
     sehat: 'butuh-tidur-berapa-jam',
     draf: 'draf-belum-terbit',
  +  danaDarurat: 'cara-menyiapkan-dana-darurat',
  +  danaDaruratLama: 'dana-darurat-lama',
   } as const
   
   export const JUDUL_PANDUAN = 'Cara hitung gaji bersih setelah PPh 21 dan BPJS'
  ```

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index 9e673f6..6a05ca3 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -139,5 +139,25 @@ await payload.create({
     data: { ...dasar, _status: 'draft', judul: 'Draf yang belum terbit', slug: SLUG.draf, tipe: 'panduan', pilar: pilar['uang-karier'], deck: 'Draf.', intinya: [{ poin: 'Satu.' }, { poin: 'Dua.' }], isi: isi(p('Draf.')) },
   })
   
  +// Slug artikel terbit diganti: hook Rencana 1 membuat redirect otomatis dari path lama.
  +const danaDarurat = await payload.create({
  +  collection: 'artikel',
  +  data: {
  +    ...dasar,
  +    judul: 'Cara menyiapkan dana darurat',
  +    slug: SLUG.danaDaruratLama,
  +    tipe: 'panduan',
  +    pilar: pilar['uang-karier'],
  +    deck: 'Dana darurat idealnya tiga sampai enam kali pengeluaran bulanan.',
  +    intinya: [{ poin: 'Dana darurat untuk kebutuhan mendadak, bukan untuk belanja.' }, { poin: 'Simpan di tempat yang mudah dicairkan.' }],
  +    isi: isi(p('Mulai dari target kecil, lalu tambah setiap bulan.')),
  +  },
  +})
  +await payload.update({ collection: 'artikel', id: danaDarurat.id, data: { _status: 'published', slug: SLUG.danaDarurat } })
  +
  +await payload.create({ collection: 'redirect', data: { dari: '/promo-lama', ke: '/glosarium', kode: '301' } })
  +await payload.create({ collection: 'redirect', data: { dari: '/glosarium/ptkp-lama', ke: '/glosarium/ptkp', kode: '301' } })
  +await payload.create({ collection: 'redirect', data: { dari: '/tulisan-dihapus', kode: '410' } })
  +
   payload.logger.info('Data E2E siap.')
   process.exit(0)
  ```

  Artikel baru itu ikut menjadi artikel terkait sepilar, jadi sesuaikan dua tes lama:

  ```diff
  diff --git a/tests/e2e/artikel.spec.ts b/tests/e2e/artikel.spec.ts
  index 06c3edf..00e202a 100644
  --- a/tests/e2e/artikel.spec.ts
  +++ b/tests/e2e/artikel.spec.ts
  @@ -13,7 +13,7 @@ test('artikel panduan: urutan bagian sesuai spesifikasi §4', async ({ page }) =
     await expect(remah.getByRole('link')).toHaveText(['Beranda', 'Uang & Karier'])
     await expect(remah.locator('[aria-current="page"]')).toHaveText(JUDUL_PANDUAN)
     await expect(page.getByRole('heading', { level: 1 })).toHaveText(JUDUL_PANDUAN)
  -  await expect(page.getByText('Panduan', { exact: true })).toBeVisible()
  +  await expect(page.getByRole('article').locator('header').getByText('Panduan', { exact: true })).toBeVisible()
     await expect(page.getByText(/^Diperbarui \d{1,2} \w+ 20\d\d$/)).toBeVisible()
     await expect(page.getByText('1 menit baca')).toBeVisible()
   
  @@ -36,7 +36,9 @@ test('artikel panduan: urutan bagian sesuai spesifikasi §4', async ({ page }) =
     await faq.getByText('Apakah THR ikut dipotong PPh 21?').click()
     await expect(faq.getByText(/THR menambah penghasilan bruto/)).toBeVisible()
   
  -  await expect(page.getByRole('region', { name: 'Baca juga' }).getByRole('link')).toHaveAttribute('href', `/${SLUG.explainer}`)
  +  // Pilihan editor dulu, lalu artikel sepilar terbaru.
  +  await expect(page.getByRole('region', { name: 'Baca juga' }).getByRole('link')).toHaveCount(2)
  +  await expect(page.getByRole('region', { name: 'Baca juga' }).getByRole('link').first()).toHaveAttribute('href', `/${SLUG.explainer}`)
     const penulis = page.getByRole('region', { name: 'Tentang penulis' })
     await expect(penulis.getByRole('link', { name: 'Redaksi point.' })).toHaveAttribute('href', '/penulis/redaksi')
   })
  ```

  ```diff
  diff --git a/tests/e2e/glosarium.spec.ts b/tests/e2e/glosarium.spec.ts
  index 3c895c0..57c31ce 100644
  --- a/tests/e2e/glosarium.spec.ts
  +++ b/tests/e2e/glosarium.spec.ts
  @@ -24,7 +24,7 @@ test('istilah glosarium di /glosarium/{slug}, tidak di /{slug}', async ({ page,
     await expect(page.getByRole('heading', { level: 1 })).toHaveText('PTKP')
     await expect(page.getByText('Glosarium', { exact: true }).first()).toBeVisible()
     // Pilihan editor (panduan) dulu, lalu artikel sepilar terbaru melengkapi.
  -  await expect(page.getByRole('region', { name: 'Baca juga' }).getByRole('link')).toHaveCount(2)
  +  await expect(page.getByRole('region', { name: 'Baca juga' }).getByRole('link')).toHaveCount(3)
     await expect(page.getByRole('region', { name: 'Baca juga' }).getByRole('link').first()).toHaveAttribute('href', `/${SLUG.panduan}`)
     expect((await request.get('/ptkp')).status()).toBe(404)
     expect((await request.get(`/glosarium/${SLUG.panduan}`)).status()).toBe(404)
  ```

  `tests/e2e/galat.spec.ts`

  ```ts
  import { expect, test, type APIRequestContext } from '@playwright/test'

  import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  import { ADMIN_E2E, SLUG, UKURAN_LAYAR } from './data'

  test.beforeEach(async ({ page }) => {
    await cegatCloudinary(page)
  })

  /**
   * Tujuan redirect dari header `Location`. Next 16.3.3 mengirim header ini dua kali (nilainya sama)
   * pada render ISR pertama sebuah redirect; respons dari cache berikutnya hanya sekali. Browser
   * menerima keduanya, jadi tes memeriksa nilainya saja.
   */
  function tujuan(lokasi: string | undefined): string[] {
    return [...new Set((lokasi ?? '').split(', '))]
  }

  test('slug lama mengarah permanen ke slug baru', async ({ page, request }) => {
    const jawaban = await request.get(`/${SLUG.danaDaruratLama}`, { maxRedirects: 0 })
    expect(jawaban.status()).toBe(308)
    expect(tujuan(jawaban.headers()['location'])).toEqual([`/${SLUG.danaDarurat}`])
    await page.goto(`/${SLUG.danaDaruratLama}`)
    await expect(page).toHaveURL(`/${SLUG.danaDarurat}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cara menyiapkan dana darurat')
  })

  test('redirect manual dari CMS, termasuk di bawah /glosarium; kode 410 menjawab 404', async ({ request }) => {
    for (const [dari, ke] of [
      ['/promo-lama', '/glosarium'],
      ['/glosarium/ptkp-lama', '/glosarium/ptkp'],
    ]) {
      const jawaban = await request.get(dari, { maxRedirects: 0 })
      expect(jawaban.status(), dari).toBe(308)
      expect(tujuan(jawaban.headers()['location'])).toEqual([ke])
    }
    expect((await request.get('/tulisan-dihapus', { maxRedirects: 0 })).status()).toBe(404)
  })

  async function jumlahLog(request: APIRequestContext, path: string): Promise<number> {
    const masuk = await request.post('/api/pengguna/login', { data: ADMIN_E2E })
    const { token } = await masuk.json()
    const log = await request.get(`/api/log-404?where[path][equals]=${encodeURIComponent(path)}`, {
      headers: { Authorization: `JWT ${token}` },
    })
    return (await log.json()).docs[0]?.jumlah ?? 0
  }

  test('halaman 404: judul, jalan kembali, tulisan terbaru, dan setiap kunjungan tercatat', async ({ page, request }) => {
    const path = `/jalan-buntu-${Date.now()}`
    for (let i = 0; i < 2; i++) {
      const beacon = page.waitForRequest((r) => r.url().endsWith('/api/log-404/catat') && r.method() === 'POST')
      const jawaban = await page.goto(path)
      expect(jawaban?.status()).toBe(404)
      expect((await beacon).postDataJSON()).toMatchObject({ path })
    }
    await expect(page).toHaveTitle('Halaman tidak ditemukan · point.')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Halaman ini tidak ada.')
    await expect(page.getByRole('link', { name: 'Kembali ke beranda' })).toHaveAttribute('href', '/')
    await expect(page.getByRole('region', { name: 'Tulisan terbaru' }).getByRole('link')).toHaveCount(3)
    await expect.poll(() => jumlahLog(request, path)).toBe(2)
  })

  for (const { lebar, tinggi } of UKURAN_LAYAR) {
    test(`halaman 404 ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: tinggi })
      await page.goto('/halaman-yang-tidak-ada')
      // Next 16.3.3 mengirim `notFound()` sebagai cangkang `<html id="__next_error__">` lalu merender
      // halaman 404 di browser; tunggu layout point. (lang id) terpasang sebelum diperiksa.
      await expect(page.locator('html')).toHaveAttribute('lang', 'id')
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await periksaTanpaGeserHorizontal(page)
      await periksaAxe(page)
    })
  }
  ```

  Jalankan:

  ```bash
  pnpm test:e2e
  ```

  Hasil yang diharapkan: `26 passed`: `/dana-darurat-lama` menjawab 308 ke `/cara-menyiapkan-dana-darurat`; `/promo-lama` ke `/glosarium` dan `/glosarium/ptkp-lama` ke `/glosarium/ptkp` menjawab 308; `/tulisan-dihapus` (410) menjawab 404; halaman 404 berjudul `Halaman tidak ditemukan · point.` dengan `noindex`, tombol ke beranda, tiga tulisan terbaru; dua kunjungan ke path yang sama tercatat `jumlah: 2` di `log-404`; axe bersih di tiga ukuran layar.

- [ ] **Langkah 8: Commit**

  ```bash
  git add src/lib/tag.ts src/hooks/revalidasiPublik.ts src/collections/Redirect.ts src/collections/Log404.ts src/modules/seo src/modules/konten src/components/galat "src/app/(frontend)" tests/unit/konten-galat.test.ts tests/int/redirect-404.int.spec.ts tests/int/revalidasi.int.spec.ts tests/e2e
  git commit -m "feat(ui): redirect 301 dari CMS di runtime, halaman 404, dan log 404 lewat beacon"
  ```

### Task 9: View Transitions judul kartu ke artikel, kartu masuk sekali, reduced motion, dan anggaran JS

**Files:**
- Create: `src/types/react-canary.d.ts`, `src/components/motion/JudulBersama.tsx`, `src/components/motion/PemicuMasuk.tsx`
- Modify: `src/styles/tokens.css`, `src/styles/dasar.css`, `src/components/kartu/KartuArtikel.tsx`, `src/components/artikel/HalamanArtikel.tsx`, `src/app/(frontend)/layout.tsx`, `tests/unit/token.test.ts`
- Test: `tests/e2e/motion.spec.ts`

**Interfaces:**
- Consumes: token motion (Task 1), `KartuArtikel`, `DaftarKartu` (Task 6), `HalamanArtikel` (Task 6), layout (Task 2).
- Produces:
  - Token `--durasi-masuk: 200ms`.
  - `JudulBersama({ id, children })`, `namaJudulBersama(id) = 'judul-artikel-{id}'`.
  - `PemicuMasuk()` (klien, di layout), `MAKS_URUTAN = 2`. Elemen yang ingin masuk saat pertama terlihat cukup diberi atribut `data-masuk=""` (dipakai `DaftarKartu`; mozaik beranda Rencana 4B memakai cara yang sama).

**Perpindahan halaman** (spesifikasi §13): judul kartu artikel dan H1 artikel dibungkus `JudulBersama` dengan nama yang sama, sehingga saat pembaca mengeklik kartu, judulnya berpindah dan membesar menjadi H1 (React `<ViewTransition share="morph" default="none">`, navigasi App Router adalah transition sehingga animasi aktif otomatis). Halaman lain memudar. Keduanya 400 ms dengan kurva khas. `ViewTransition` ada di React canary bawaan Next; tipenya diaktifkan lewat `/// <reference types="react/canary" />`. React stabil di tes unit belum punya komponen ini, jadi `JudulBersama` merender anaknya apa adanya bila `ViewTransition` tidak ada.

**Kartu masuk:** naik 12px + opacity, sekali saat pertama terlihat, berurutan 40 ms. Supaya total di bawah 300 ms, durasinya 200 ms dan jeda maksimal dua langkah (200 + 2 × 40 = 280 ms). `PemicuMasuk` hanya menyiapkan (`data-masuk="tunggu"`) elemen yang masih di bawah layar saat halaman tampil, supaya kartu yang sudah terlihat tidak berkedip; `IntersectionObserver` mengubahnya menjadi `terlihat` sekali lalu berhenti mengamati. Tanpa JavaScript, dengan reduced motion, atau tanpa `IntersectionObserver`, kartu tampil biasa.

**Reduced motion:** `dasar.css` (Task 1) sudah mematikan durasi animasi dan transisi serta animasi pseudo-element View Transitions; tes E2E memastikannya di HP.

**Anggaran JS:** tes mengukur `encodedBodySize` skrip di halaman artikel (byte gzip yang diunduh browser modern, tanpa polyfill `noModule`). Probe: 145,4 KB, kerangka Next + React sendiri 139,5 KB. Batas tes 160 KiB menjaga JS milik point. tetap kecil; target 70 KB di spesifikasi tidak bisa dicapai App Router (lihat Risiko).

- [ ] **Langkah 1: Tulis tes E2E yang gagal**

  `tests/e2e/motion.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { cegatCloudinary } from './bantu'
  import { SLUG } from './data'

  /**
   * Anggaran JavaScript halaman artikel (byte gzip yang diunduh). Spesifikasi §12 menulis 70 KB, tetapi
   * kerangka Next 16 + React 19 saja sudah sekitar 135 KB; angka ini menjaga supaya JS milik point.
   * tetap kecil di atas kerangka itu. Lihat bagian Risiko Rencana 4A.
   */
  const ANGGARAN_JS_ARTIKEL = 160 * 1024

  test.beforeEach(async ({ page }) => {
    await cegatCloudinary(page)
  })

  test('kartu di bawah layar masuk sekali saat pertama terlihat', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(`/${SLUG.panduan}`)
    const kartu = page.getByRole('region', { name: 'Baca juga' }).getByRole('listitem').first()
    await expect(kartu).toHaveAttribute('data-masuk', 'tunggu')
    await expect(kartu).toHaveCSS('opacity', '0')
    await kartu.scrollIntoViewIfNeeded()
    await expect(kartu).toHaveAttribute('data-masuk', 'terlihat')
    await expect(kartu).toHaveCSS('opacity', '1')
  })

  test('reduced motion: kartu langsung tampil dan transisi dimatikan', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`/${SLUG.panduan}`)
    const kartu = page.getByRole('region', { name: 'Baca juga' }).getByRole('listitem').first()
    await expect(kartu).toHaveAttribute('data-masuk', '')
    await expect(kartu).toHaveCSS('opacity', '1')
    await expect(kartu.getByRole('link')).toHaveCSS('transition-duration', /^(0s|1e-05s)$/)
  })

  test('kartu ke artikel memakai View Transitions dengan judul sebagai elemen bersama', async ({ page }) => {
    await page.goto('/halaman-yang-tidak-ada')
    await page.evaluate(() => {
      const w = window as Window & { namaTransisi?: string[] }
      const asli = document.startViewTransition.bind(document)
      document.startViewTransition = ((...arg: Parameters<typeof asli>) => {
        w.namaTransisi = [...document.querySelectorAll('h1, h2, h3')]
          .map((el) => getComputedStyle(el).viewTransitionName)
          .filter((nama) => nama && nama !== 'none')
        return asli(...arg)
      }) as typeof document.startViewTransition
    })
    const kartu = page.getByRole('region', { name: 'Tulisan terbaru' }).getByRole('link').first()
    const judul = await kartu.getByRole('heading').textContent()
    await kartu.click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(judul ?? '')
    const nama = await page.evaluate(() => (window as Window & { namaTransisi?: string[] }).namaTransisi ?? [])
    expect(nama.some((n) => n.startsWith('judul-artikel-'))).toBe(true)
  })

  test('JavaScript halaman artikel di bawah anggaran', async ({ page }) => {
    await page.goto(`/${SLUG.panduan}`)
    const byte = await page.evaluate(() =>
      performance
        .getEntriesByType('resource')
        .filter((e) => (e as PerformanceResourceTiming).initiatorType === 'script')
        .reduce((jumlah, e) => jumlah + (e as PerformanceResourceTiming).encodedBodySize, 0),
    )
    test.info().annotations.push({ type: 'JS artikel (gzip)', description: `${Math.round(byte / 1024)} KB` })
    expect(byte).toBeGreaterThan(0)
    expect(byte).toBeLessThan(ANGGARAN_JS_ARTIKEL)
  })
  ```

  Tambahkan token yang dipakai animasi kartu ke tes token:

  ```diff
  diff --git a/tests/unit/token.test.ts b/tests/unit/token.test.ts
  index 950be06..2611ccf 100644
  --- a/tests/unit/token.test.ts
  +++ b/tests/unit/token.test.ts
  @@ -91,6 +91,8 @@ describe('token tipografi, bentuk, dan motion', () => {
       expect(token['kurva']).toBe('cubic-bezier(0.2, 0, 0, 1)')
       expect(token['kurva-keluar']).toBe('cubic-bezier(0.3, 0, 1, 1)')
       expect([token['durasi-cepat'], token['durasi-sedang'], token['durasi-halaman']]).toEqual(['150ms', '250ms', '400ms'])
  +    // Kartu masuk berurutan: 200 ms + 2 jeda 40 ms = 280 ms, di bawah total 300 ms.
  +    expect(token['durasi-masuk']).toBe('200ms')
       expect([token['jeda-urut'], token['geser-masuk']]).toEqual(['40ms', '12px'])
     })
   })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/token.test.ts` (`expected undefined to be '200ms'`). E2E motion juga gagal sampai langkah berikut selesai (`data-masuk` belum ada), jadi tidak perlu dijalankan sekarang.

- [ ] **Langkah 3: Token dan CSS motion**

  ```diff
  diff --git a/src/styles/tokens.css b/src/styles/tokens.css
  index 6bfc177..253bbac 100644
  --- a/src/styles/tokens.css
  +++ b/src/styles/tokens.css
  @@ -89,6 +89,7 @@
     --durasi-cepat: 150ms;
     --durasi-sedang: 250ms;
     --durasi-halaman: 400ms;
  +  --durasi-masuk: 200ms;
     --jeda-urut: 40ms;
     --geser-masuk: 12px;
   }
  ```

  ```diff
  diff --git a/src/styles/dasar.css b/src/styles/dasar.css
  index aaae9ea..b802b10 100644
  --- a/src/styles/dasar.css
  +++ b/src/styles/dasar.css
  @@ -128,6 +128,32 @@ textarea {
     padding-inline: var(--gutter);
   }
   
  +/* Perpindahan halaman: judul kartu berpindah menjadi H1 artikel (`JudulBersama`), halaman lain
  +   memudar. Durasi 400 ms dengan kurva khas (spesifikasi §13). */
  +::view-transition-group(.morph) {
  +  animation-duration: var(--durasi-halaman);
  +  animation-timing-function: var(--kurva);
  +}
  +
  +::view-transition-old(root),
  +::view-transition-new(root) {
  +  animation-duration: var(--durasi-halaman);
  +  animation-timing-function: var(--kurva);
  +}
  +
  +/* Kartu masuk sekali saat pertama terlihat (`PemicuMasuk`). */
  +[data-masuk='tunggu'] {
  +  opacity: 0;
  +  transform: translateY(var(--geser-masuk));
  +}
  +
  +[data-masuk='terlihat'] {
  +  transition:
  +    opacity var(--durasi-masuk) var(--kurva),
  +    transform var(--durasi-masuk) var(--kurva);
  +  transition-delay: calc(var(--urutan, 0) * var(--jeda-urut));
  +}
  +
   /* Reduced motion mematikan semua animasi dan View Transitions; konten tetap utuh (spesifikasi §13). */
   @media (prefers-reduced-motion: reduce) {
     *,
  ```

- [ ] **Langkah 4: Komponen motion**

  `src/types/react-canary.d.ts`

  ```ts
  // Next.js App Router memakai React canary bawaannya, yang sudah punya `ViewTransition`.
  /// <reference types="react/canary" />
  ```

  `src/components/motion/JudulBersama.tsx`

  ```tsx
  import { ViewTransition, type ReactNode } from 'react'

  /**
   * React di Next memakai versi canary yang punya `ViewTransition`; React stabil di tes unit belum,
   * jadi komponen ini merender anaknya apa adanya bila `ViewTransition` tidak ada.
   */
  const Transisi: typeof ViewTransition | undefined = ViewTransition

  export const namaJudulBersama = (id: number | string) => `judul-artikel-${id}`

  /**
   * Elemen bersama View Transitions (spesifikasi §13): judul kartu artikel berpindah menjadi H1
   * artikel saat navigasi klien. `default="none"` supaya hanya pasangan kartu dan judul yang
   * beranimasi; kelas `morph` diatur di `dasar.css` (400 ms, kurva khas).
   */
  export function JudulBersama({ id, children }: { id: number | string; children: ReactNode }) {
    if (!Transisi) return <>{children}</>
    return (
      <Transisi name={namaJudulBersama(id)} share="morph" default="none">
        {children}
      </Transisi>
    )
  }
  ```

  `src/components/motion/PemicuMasuk.tsx`

  ```tsx
  'use client'

  import { usePathname } from 'next/navigation'
  import { useEffect } from 'react'

  /** 200 ms per kartu + 2 jeda 40 ms = 280 ms, di bawah batas 300 ms spesifikasi §13. */
  export const MAKS_URUTAN = 2

  /**
   * Animasi masuk kartu (spesifikasi §13): naik 12px + opacity, berurutan 40 ms, sekali saat pertama
   * terlihat. Hanya elemen `[data-masuk]` yang masih di bawah layar saat halaman tampil yang disiapkan
   * (`tunggu`), supaya yang sudah terlihat tidak berkedip. Tanpa JavaScript atau dengan reduced motion,
   * kartu tampil biasa.
   */
  export function PemicuMasuk() {
    const path = usePathname()
    useEffect(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
      const tinggi = window.innerHeight
      const kartu = [...document.querySelectorAll<HTMLElement>('[data-masuk=""]')].filter(
        (el) => el.getBoundingClientRect().top > tinggi,
      )
      const pengamat = new IntersectionObserver((entri) => {
        let urutan = 0
        for (const e of entri) {
          if (!e.isIntersecting) continue
          const el = e.target as HTMLElement
          el.style.setProperty('--urutan', String(Math.min(urutan++, MAKS_URUTAN)))
          el.dataset.masuk = 'terlihat'
          pengamat.unobserve(el)
        }
      })
      for (const el of kartu) {
        el.dataset.masuk = 'tunggu'
        pengamat.observe(el)
      }
      return () => pengamat.disconnect()
    }, [path])
    return null
  }
  ```

  ```diff
  diff --git a/src/components/kartu/KartuArtikel.tsx b/src/components/kartu/KartuArtikel.tsx
  index 6a26d0f..90a7f1e 100644
  --- a/src/components/kartu/KartuArtikel.tsx
  +++ b/src/components/kartu/KartuArtikel.tsx
  @@ -1,4 +1,5 @@
   import { Tautan } from '@/components/dasar/Tautan'
  +import { JudulBersama } from '@/components/motion/JudulBersama'
   import { LABEL_TIPE_ARTIKEL } from '@/lib/konstanta'
   import type { KartuArtikel as DataKartu } from '@/modules/konten/tipe'
   
  @@ -13,7 +14,9 @@ export function KartuArtikel({ kartu, tingkat = 'h3' }: { kartu: DataKartu; ting
     return (
       <Tautan href={kartu.href} className={gaya.kartu} data-warna={kartu.pilar?.warna}>
         {kartu.pilar && <span className={gaya.label}>{kartu.pilar.nama}</span>}
  -      <Judul className={gaya.judul}>{kartu.judul}</Judul>
  +      <JudulBersama id={kartu.id}>
  +        <Judul className={gaya.judul}>{kartu.judul}</Judul>
  +      </JudulBersama>
         {kartu.intinya && (
           <p className={gaya.intinya}>
             <strong>Intinya:</strong> {kartu.intinya}
  @@ -28,7 +31,7 @@ export function DaftarKartu({ kartu }: { kartu: DataKartu[] }) {
     return (
       <ul className={gaya.daftar}>
         {kartu.map((k) => (
  -        <li key={k.id}>
  +        <li key={k.id} data-masuk="">
             <KartuArtikel kartu={k} />
           </li>
         ))}
  ```

  ```diff
  diff --git a/src/components/artikel/HalamanArtikel.tsx b/src/components/artikel/HalamanArtikel.tsx
  index 28d6ca6..93bcbca 100644
  --- a/src/components/artikel/HalamanArtikel.tsx
  +++ b/src/components/artikel/HalamanArtikel.tsx
  @@ -8,6 +8,7 @@ import { Tautan } from '@/components/dasar/Tautan'
   import { Keterangan, UKURAN_KOLOM_ISI } from '@/components/isi/GambarIsi'
   import { IsiArtikel } from '@/components/isi/IsiArtikel'
   import { DaftarKartu } from '@/components/kartu/KartuArtikel'
  +import { JudulBersama } from '@/components/motion/JudulBersama'
   import { LABEL_TIPE_ARTIKEL } from '@/lib/konstanta'
   import { tanggalIndonesia } from '@/modules/konten/artikel'
   import type { DataArtikel } from '@/modules/konten/tipe'
  @@ -40,7 +41,9 @@ export function HalamanArtikel({ artikel, situs }: { artikel: DataArtikel; situs
             {artikel.pilar && <ChipPilar pilar={artikel.pilar} />}
             <span>{LABEL_TIPE_ARTIKEL[artikel.tipe]}</span>
           </p>
  -        <h1 className={gaya.judul}>{artikel.judul}</h1>
  +        <JudulBersama id={artikel.id}>
  +          <h1 className={gaya.judul}>{artikel.judul}</h1>
  +        </JudulBersama>
           <p className={gaya.deck}>{artikel.deck}</p>
           <p className={gaya.byline}>
             {artikel.penulis && (
  ```

  ```diff
  diff --git a/src/app/(frontend)/layout.tsx b/src/app/(frontend)/layout.tsx
  index ffe71a2..ac15759 100644
  --- a/src/app/(frontend)/layout.tsx
  +++ b/src/app/(frontend)/layout.tsx
  @@ -4,6 +4,7 @@ import React from 'react'
   import '@/styles/tokens.css'
   import '@/styles/dasar.css'
   
  +import { PemicuMasuk } from '@/components/motion/PemicuMasuk'
   import { Footer } from '@/components/tata-letak/Footer'
   import { Header } from '@/components/tata-letak/Header'
   import { muatFooter, muatHeader } from '@/modules/konten'
  @@ -26,6 +27,7 @@ export default async function RootLayout({ children }: { children: React.ReactNo
           <Header data={header} />
           <main id="isi">{children}</main>
           <Footer data={footer} />
  +        <PemicuMasuk />
         </body>
       </html>
     )
  ```

- [ ] **Langkah 5: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 35 passed (35)`, `Tests 248 passed (248)`; integrasi `Tests 60 passed (60)`; E2E `30 passed`, termasuk kartu terkait di 1440px yang mulai `tunggu` (opacity 0) lalu `terlihat` (opacity 1) setelah digulir, reduced motion di 375px (kartu langsung tampil, transisi 0), nama `judul-artikel-{id}` terpasang saat `document.startViewTransition` dipanggil dari kartu di halaman 404, dan JS artikel di bawah 160 KiB.

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/types src/styles src/components "src/app/(frontend)/layout.tsx" tests/unit/token.test.ts tests/e2e/motion.spec.ts
  git commit -m "feat(ui): View Transitions judul kartu ke artikel, kartu masuk sekali, reduced motion, dan anggaran JS"
  ```

### Task 10: Aturan frontend di CLAUDE.md dan pemeriksaan akhir

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: semua task sebelumnya.
- Produces: aturan proyek untuk agen dan pengembang berikutnya (Rencana 4B dan seterusnya): pola halaman ISR, `src/modules/konten`, `tanganiTidakAda`, komponen dan token, `Tautan`, `data-warna`, `Ikon`, E2E, dan catatan bahwa build membaca database dev.

- [ ] **Langkah 1: Perbarui CLAUDE.md**

  ```diff
  diff --git a/CLAUDE.md b/CLAUDE.md
  index d2ecf51..02aea4f 100644
  --- a/CLAUDE.md
  +++ b/CLAUDE.md
  @@ -6,7 +6,8 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Next.js 16 (App Router) + Payload CMS 3.92 dalam satu aplikasi
   - PostgreSQL (lokal lewat Docker, produksi di Supabase lewat pooler) dengan `@payloadcms/db-postgres`
   - Editor Lexical (`@payloadcms/richtext-lexical`)
  -- Vitest (unit + integrasi), Playwright (e2e, mulai Rencana 4)
  +- Vitest (unit + integrasi), Playwright + axe (e2e)
  +- Frontend: CSS Module + token CSS (`src/styles/tokens.css`), font Archivo variable lewat `next/font/local`
   - Node `^22.23.4 || >=24.22.1`, pnpm 10
   
   ## Perintah
  @@ -15,6 +16,7 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Tes unit: `pnpm test:unit`
   - Tes integrasi (butuh Postgres): `pnpm test:int`
   - Semua tes: `pnpm test`
  +- Tes E2E (butuh Postgres, membangun build produksi dulu): `pnpm test:e2e`. Database E2E = nama database tes ditambah `_e2e`, dibuat dan diisi ulang otomatis oleh `tests/e2e/siapkan.ts`.
   - Type check: `pnpm typecheck`
   - Tipe Payload: `pnpm generate:types` (jalankan setiap kali field berubah)
   - Import map admin: `pnpm generate:importmap` (jalankan setiap kali menambah fitur Lexical atau komponen admin)
  @@ -28,14 +30,19 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Satu file satu tanggung jawab. Koleksi di `src/collections/`, global di `src/globals/`, blok di `src/blocks/`, field bersama di `src/fields/`, hook di `src/hooks/`, akses di `src/access/`.
   - Path publik selalu dibangun lewat `pathFor()` di `src/lib/paths.ts`, jangan merangkai string URL manual.
   - SEO selalu lewat `src/modules/seo`: `metadata()` untuk `generateMetadata`, `jsonLd()` + `serialisasiJsonLd()` untuk JSON-LD, `remahRoti()` untuk breadcrumb, `ambilSitus()` untuk pengaturan situs. Jangan menulis `<title>`, canonical, robots, atau JSON-LD manual di halaman. Rute teknis (`/sitemap.xml`, `/sitemap/{jenis}.xml`, `/news-sitemap.xml`, `/robots.txt`, `/feed.xml`) ada di `src/app/(frontend)/` dan hanya merangkai fungsi modul.
  -- Tag cache di `src/lib/tag.ts` (`TAG`): data halaman publik di-cache dengan tag yang sama dengan yang direvalidasi hook `revalidasiPublik` (`{koleksi}:{id}`, `pilar:{slug}`, `beranda`, `sitemap`, `pengaturan-seo`). Koleksi publik baru wajib memasang `revalidasiPublik(koleksi)`.
  +- Tag cache di `src/lib/tag.ts` (`TAG`): data halaman publik di-cache dengan tag yang sama dengan yang direvalidasi hook `revalidasiPublik` (`{koleksi}`, `{koleksi}:{id}`, `pilar:{slug}`, `beranda`, `sitemap`, `pengaturan-seo`, `header`, `footer`, `media`, `redirect`). Koleksi publik baru wajib memasang `revalidasiPublik(koleksi)`.
   - URL media selalu lewat `src/modules/media` (`bangunUrl`, `propsGambar`, `urlOg`), jangan merangkai URL Cloudinary manual. `next/image` memakai loader kustom Cloudinary, jadi `src` harus URL dari `bangunUrl`/`propsGambar` dan `width`/`height` wajib diisi.
   - Media disimpan di Cloudinary (folder `point/gambar`, `point/video`). Tanpa `CLOUDINARY_*` di env (lokal, tes) dipakai klien palsu dalam memori: file tidak tersimpan permanen. Tes tidak boleh memanggil jaringan.
  +- Halaman publik di `src/app/(frontend)/` dirender ISR: rute dinamis memakai `generateStaticParams` yang mengembalikan `[]`, dan data diambil lewat `muat*()` dari `src/modules/konten` (cache bertag `TAG`). Path tanpa dokumen diakhiri `tanganiTidakAda(path)` di komponen halaman (redirect dari koleksi `redirect` atau 404), sedangkan `generateMetadata` mengembalikan `metadataTidakDitemukan()` untuk path itu.
  +- Komponen UI publik di `src/components/`, server component kecuali benar-benar butuh browser (`'use client'` seperti `Catat404` dan `PemicuMasuk`). Gaya di CSS Module di sebelah komponen dan memakai token semantik dari `src/styles/tokens.css` (`--teks`, `--latar`, `--permukaan`, `--pilar`, `--ruang-*`, `--durasi-*`), bukan hex atau token primitif. Animasi hanya `transform` dan `opacity`, dan semuanya mati di `prefers-reduced-motion: reduce`.
  +- Tautan internal lewat komponen `Tautan` (`next/link` untuk path situs). Warna pilar lewat atribut `data-warna` (nilai field `warna` pilar) dan selalu bersama nama pilarnya. Ikon lewat `Ikon` (path Lucide yang disalin, tanpa paket ikon).
   - Copy UI: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru.
   - Tes unit di `tests/unit/*.test.ts`, tes integrasi di `tests/int/*.int.spec.ts` dan memakai `getTestPayload()` + `unik()` dari `tests/int/helpers.ts`.
  +- Tes E2E di `tests/e2e/*.spec.ts` memakai `cegatCloudinary()` (gambar tanpa jaringan) dan `periksaAxe()` (WCAG 2.2 AA) dari `tests/e2e/bantu.ts`; data contohnya di `tests/e2e/siapkan.ts`.
   
   ## Batasan
   - Jangan commit `.env`. `.env.test` boleh di-commit karena hanya untuk database tes lokal dan tidak boleh berisi `CLOUDINARY_*`.
   - Tanya dulu sebelum menambah dependensi baru di luar rencana.
   - Jalankan `pnpm generate:types` lalu `pnpm typecheck` setelah mengubah koleksi atau global.
  -- Jalankan `pnpm test` sebelum commit.
  +- Jalankan `pnpm test` sebelum commit, dan `pnpm test:e2e` bila halaman publik berubah.
  +- `pnpm build` membaca database dev untuk halaman statis (layout, `/glosarium`, 404). Setelah skema berubah, jalankan `pnpm seed` dulu supaya kolom baru terdorong ke database dev.
  ```

- [ ] **Langkah 2: Pemeriksaan lengkap**

  Jalankan:

  ```bash
  pnpm generate:types && git diff --stat src/payload-types.ts
  pnpm generate:importmap && git diff --stat "src/app/(payload)/admin/importMap.js"
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  pnpm build
  ```

  Hasil yang diharapkan: `payload-types.ts` dan import map tidak berubah; type check dan lint bersih; unit `Test Files 35 passed (35)`, `Tests 248 passed (248)`; integrasi `Test Files 17 passed (17)`, `Tests 60 passed (60)`; E2E `30 passed`; build mencantumkan `○ /`, `○ /glosarium`, `● /[...jalur]`, `● /glosarium/[slug]`, `○ /icon-....svg`, dan `ƒ` untuk lima rute teknis Rencana 3.

- [ ] **Langkah 3: Uji visual di tiga ukuran layar**

  Bangun dan jalankan build dengan database E2E, yang sudah berisi konten contoh dari `pnpm test:e2e` di langkah 2 (`set -a` memuat `PAYLOAD_SECRET` dari `.env.test`; nama database diambil dari `DATABASE_URL` tes tanpa query lalu ditambah `_e2e`):

  ```bash
  set -a && . ./.env.test && set +a
  DATABASE_URL="${DATABASE_URL%%\?*}_e2e" CLOUDINARY_CLOUD_NAME=e2e CLOUDINARY_API_KEY=e2e CLOUDINARY_API_SECRET=e2e pnpm build
  (DATABASE_URL="${DATABASE_URL%%\?*}_e2e" CLOUDINARY_CLOUD_NAME=e2e CLOUDINARY_API_KEY=e2e CLOUDINARY_API_SECRET=e2e PORT=3200 pnpm start > /tmp/point-lat-start.log 2>&1 &)
  timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'
  ```

  Buka di browser dan periksa `/`, `/cara-hitung-gaji-bersih`, `/glosarium`, `/glosarium/ter`, dan `/tidak-ada` di 375, 768, dan 1440 px (DevTools) dan dengan "Emulate CSS prefers-reduced-motion: reduce". Gambar Cloudinary tidak tampil karena cloud `e2e` palsu; sisanya harus sesuai mockup Kartu Intinya: garis header 2px ink, pill rubrik dengan titik warna, judul tebal menyempit (wdth 80), kotak Intinya hijau lembut, kartu terkait berlatar warna pilar, tidak ada geser horizontal. Hentikan server dengan `fuser -k 3200/tcp`, lalu jalankan `pnpm build` lagi dengan env biasa.

- [ ] **Langkah 4: Commit**

  ```bash
  git add CLAUDE.md
  git commit -m "docs(ui): aturan halaman publik, komponen, token, dan E2E di CLAUDE.md"
  ```

---

## Selesai bila

- `pnpm test` lulus (248 unit di 35 file, 60 integrasi di 17 file), `pnpm test:e2e` lulus (30 tes, axe tanpa pelanggaran WCAG 2.2 AA di 375, 768, dan 1440 px untuk tata letak, artikel, glosarium, dan 404), `pnpm typecheck` dan `pnpm lint` bersih, `pnpm build` berhasil, semuanya tanpa jaringan dan tanpa kredensial Cloudinary asli.
- `/cara-hitung-gaji-bersih` (atau artikel terbit apa pun) tampil dengan urutan spesifikasi §4 dan metadata, canonical, robots, serta JSON-LD dari modul SEO; `/glosarium` dan `/glosarium/{slug}` tampil; slug lama menjawab redirect permanen ke slug baru; path yang tidak ada menjawab 404 dengan halaman 404 point. dan tercatat di `log-404`.
- Tampilan sesuai mockup "Kartu Intinya" di tiga ukuran layar, tanpa geser horizontal; reduced motion mematikan semua animasi.
- Skema hanya bertambah satu kolom (`pilar.disclaimer`); `payload-types.ts` hanya berubah di Task 4.

## Cakupan yang ditunda (dengan alasan)

| Butir spesifikasi | Ditunda ke | Alasan |
|---|---|---|
| Beranda dari global `beranda` (hero "INTINYA DULU." + pencarian besar, mozaik pilihan redaksi, strip video 9:16 gelap, "Paling dibaca pekan ini", newsletter, tempat slot iklan), hook revalidasi global `beranda`, `/` di sitemap | Rencana 4B | Batas ukuran rencana. Fondasi siap: token display, `KartuArtikel` dengan `data-warna`, `data-masuk`, `JudulBersama`. |
| Reveal judul raksasa beranda dengan GSAP (dimuat dinamis hanya di beranda) | Rencana 4B | Bagian beranda; butuh persetujuan dependensi `gsap`. Angka hasil kalkulator memakai GSAP di Rencana 5. |
| Rubrik pilar `/{pilar}` dan subkategori `/{pilar}/{subkategori}`, subkategori di sitemap | Rencana 4B | Ditambahkan sebagai cabang baru di `[...jalur]` (satu segmen: artikel, lalu pilar, lalu halaman; dua segmen: subkategori). Pill rubrik di header sudah menunjuk ke path pilar. |
| Halaman statis dari koleksi `halaman` (page builder: hero, teks, kartu, CTA, FAQ, embed tool) | Rencana 4B | Cabang `[...jalur]` yang sama; footer seed sudah menautkan `/tentang`, `/kebijakan-redaksi`, dan seterusnya (halaman seed masih draf). |
| Profil penulis `/penulis/{slug}` | Rencana 4B | Byline dan profil di artikel sudah menautkannya; sitemap penulis dari Rencana 3 sudah memuat URL-nya. |
| Video `/video` dan `/video/{slug}`, `/video` di sitemap | Rencana 4B | `VideoSemat` (HLS + MP4 + transkrip) siap dipakai ulang. |
| Pencarian `/cari` (noindex) dan form cari di halaman 404 | Rencana 4B | Halaman 404 sekarang memberi jalan kembali ke beranda dan tulisan terbaru; form ditambahkan saat `/cari` ada supaya tidak menunjuk ke 404. |
| Indeks `/tools` | Rencana 4B (indeks sederhana dari koleksi `tools`) | Tombol Tools di header menunjuk `/tools` (nilai global `header`) dan menjawab 404 sampai indeks itu ada; situs belum live. Kalkulator dan `/tools/{slug}` di Rencana 5. |
| "Artikel populer" di halaman 404 dan blok "Paling dibaca pekan ini" | Rencana 6 | Butuh data klik per URL (Search Analytics). 4A memakai tulisan terbaru. |
| `jumlahHit` di koleksi `redirect` | tidak direncanakan | Respons redirect disimpan ISR, server tidak melihat setiap hit. Bila perlu, pakai analitik Vercel atau laporan Search Console. |
| Slot iklan, banner persetujuan, `ads.txt`, Lighthouse CI, design-audit sebelum rilis | Rencana 8 | Sesuai peta rencana. |
| E2E alur editor (buat artikel, terbitkan, sitemap, log indexing) dan "kalkulator gaji" dari spesifikasi §16 | Rencana 6 dan 5 | Butuh Mesin Indexing dan modul `hitung`. 4A menguji redirect setelah ganti slug dan halaman publik. |
| Takarir video (VTT) | belum direncanakan | Model `video` belum punya field takarir; transkrip selalu tampil di bawah video. Lihat Risiko. |
| Mode gelap | Fase 2 | Komponen hanya memakai token semantik, jadi cukup menambah nilai lapis semantik. |

## Risiko dan pertanyaan terbuka

| Risiko | Mitigasi |
|---|---|
| **Anggaran JS 70 KB (spesifikasi §12) tidak tercapai.** Kerangka Next 16.3.3 + React 19 saja 139,5 KB gzip (react-dom 70 KB, router 42 KB) di halaman kosong; artikel 145,4 KB. | Tes E2E menjaga artikel di bawah 160 KiB sehingga JS tambahan point. tetap terlihat. **Pertanyaan untuk pemilik:** setuju anggaran diganti "JS di luar kerangka Next/React maksimal 25 KB, total maksimal 160 KiB"? Penghematan kecil yang masih mungkin: `<img srcset>` dari server sebagai ganti `next/image` (sekitar 6 KB). |
| Redirect memakai 308, bukan 301 persis; kode 410 menjawab 404. | Google memperlakukan 308 sama dengan 301 dan 404 sama dengan 410. **Pertanyaan:** bila 301/410 persis wajib (misalnya untuk alat SEO tertentu), dibutuhkan `proxy.ts` yang berjalan di setiap permintaan, dengan biaya latensi dan pemanggilan fungsi Vercel. |
| Next 16.3.3 mengirim header `Location` dua kali (nilai sama) pada render ISR pertama sebuah redirect. | Browser dan crawler umum menerima header ganda yang identik; respons berikutnya dari cache hanya sekali. Periksa ulang saat upgrade Next (tes E2E `galat.spec.ts` memakai nilai unik) dan laporkan ke Next bila masih ada. |
| Isi halaman 404 baru tampil setelah JavaScript jalan: Next 16.3.3 mengirim `notFound()` sebagai cangkang galat (status 404, judul, `noindex`) dan merender `not-found.tsx` di browser. Sebelum hidrasi `<html>` belum punya `lang`. | Crawler mendapat status dan judul yang benar dari HTML awal; pembaca dengan JavaScript melihat halaman 404 lengkap. Periksa ulang setiap upgrade Next (tes `galat.spec.ts` sudah menunggu hidrasi); bila diperbaiki Next, tidak ada kode yang perlu diubah. |
| Log 404 hanya dari browser yang menjalankan JavaScript; endpoint `POST /api/log-404/catat` terbuka. | Pemindai tanpa JS justru tidak mencemari log; 404 dari Googlebot ada di Search Console. Kiriman dirapikan dan dibatasi panjangnya. Bila disalahgunakan, tambahkan rate limit (Vercel Firewall) di Rencana 8. |
| `pnpm build` membutuhkan database (dev lokal, CI, dan build Vercel). | Dicatat di CLAUDE.md. Build Vercel punya akses Supabase. Produksi tidak mendorong skema: Rencana 8 wajib menyiapkan migrasi Payload (termasuk `pilar.disclaimer`) sebelum deploy. |
| Tag koleksi di halaman artikel: setiap terbit atau ubah artikel, pilar, penulis, media membuang cache semua halaman artikel. | Halaman dirender ulang saat diminta (murah, data per halaman satu query). Bila artikel mencapai ribuan dan beban terasa, ganti ke tag per dokumen di `cache.ts`. |
| Video tanpa takarir (WCAG 2.2 1.2.2) | Transkrip lengkap selalu tersedia. **Pertanyaan:** perlu field takarir (`.vtt` di Cloudinary) di koleksi `video` untuk Rencana 4B? Itu perubahan skema aditif. |
| `ViewTransition` berasal dari React canary bawaan Next; API-nya bisa berubah. | Dipakai di satu komponen (`JudulBersama`) dengan cadangan render biasa; tanpa dukungan browser, navigasi tetap normal tanpa animasi. |
| E2E membangun ulang `.next` dengan database E2E dan kredensial palsu `e2e`. | Jalankan `pnpm build` lagi sebelum `pnpm start` biasa. Kredensial palsu hanya ada di `playwright.config.ts`; jangan diisi di Vercel. |
| Font 90 KB karena memuat sumbu `wght` 100-900 dan `wdth` 62-125. | Satu file, di-preload, `swap`, cadangan berukuran sama. Bisa diperkecil dengan instancing `wght` 400-900 (fonttools) bila Lighthouse Rencana 8 memintanya. |
| Rute catch-all memeriksa tabel redirect untuk setiap path asing. | Slug yang formatnya mustahil tidak menyentuh tabel artikel; hasil per path di-cache dan disimpan ISR, jadi path yang sama hanya diperiksa sekali per revalidasi. |

## Temuan review sebelum eksekusi

| Temuan | Tindakan |
|---|---|
| Di 1440 px ada jarak kosong sekitar 180 px antara FAQ dan "Baca juga" (screenshot probe `akhir_cara-hitung-gaji-bersih-1440.png`). Penyebab: `.badan > .samping` memakai `grid-row: 1 / span 9`, jadi artikel dengan kurang dari 9 blok di kolom utama mendapat baris grid kosong yang masing-masing tetap menambah `gap` 40 px. | Setelah Task 10, satu commit tambahan `fix(ui)`: daftar isi tidak lagi bergantung pada jumlah baris (misalnya kolom utama dibungkus satu elemen, atau jarak antarblok memakai margin), plus tes E2E yang memastikan jarak FAQ ke "Baca juga" sama di 768 dan 1440 px. Jumlah tes E2E menjadi 31. |

## Sumber riset

- Next.js 16.3.3 (dokumentasi terpasang di `node_modules/next/dist/docs/`, sama dengan nextjs.org): Caching (Previous Model) (https://nextjs.org/docs/app/guides/caching-without-cache-components), ISR (https://nextjs.org/docs/app/guides/incremental-static-regeneration), Redirecting (https://nextjs.org/docs/app/guides/redirecting), `proxy.js` (https://nextjs.org/docs/app/api-reference/file-conventions/proxy), `not-found.js` (https://nextjs.org/docs/app/api-reference/file-conventions/not-found), `generateMetadata` (https://nextjs.org/docs/app/api-reference/functions/generate-metadata), Fonts (https://nextjs.org/docs/app/getting-started/fonts), View transitions (https://nextjs.org/docs/app/guides/view-transitions), Dynamic Routes (https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes); sumber `next@16.3.3` `server/app-render/app-render.js` dan `build/templates/app-page-runtime.js` (header `Location` ganda).
- Probe `next start` di workspace: status dan `x-nextjs-cache` untuk 200, 308, 404 sebelum dan sesudah `revalidateTag`; judul halaman 404 sebelum dan sesudah hidrasi; ukuran JS per halaman dari Resource Timing.
- Payload 3.92.1: RichText dan converter JSX (`@payloadcms/richtext-lexical/react`, sumber `features/converters/lexicalToJSX`), custom endpoint koleksi, opsi query `select` dan `populate` (dokumentasi Payload 3, bagian Queries), pembuatan database otomatis di `@payloadcms/db-postgres` (`connect.js`).
- React `ViewTransition`: https://react.dev/reference/react/ViewTransition; tipe `@types/react/canary.d.ts`.
- Google Search Central: redirect dan 308 (https://developers.google.com/search/docs/crawling-indexing/301-redirects), status HTTP dan 404/410 (https://developers.google.com/search/docs/crawling-indexing/http-network-errors).
- WCAG 2.2 (https://www.w3.org/TR/WCAG22/), axe-core aturan per tag (https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md).
- Fontsource Archivo variable 5.3.0 (registry npm, `metadata.json`: sumbu `wdth` 62-125 dan `wght` 100-900, lisensi OFL 1.1); Lucide 1.68.0 (`lucide-static`, lisensi ISC dan MIT Feather).
- Mockup arah visual "Arah 3 · Kartu Intinya" (kanvas "point.lat · Arah Visual", `Kartu.dc.html`).

Rencana berikutnya: **Rencana 4B (beranda, rubrik, penulis, video, pencarian, halaman statis, indeks tools)**, memakai `src/modules/konten`, komponen, dan token dari rencana ini.
