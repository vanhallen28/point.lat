# Rencana 8B: Paginasi berbasis path, Cek sekarang dan Pindai ulang sekarang, penjaga beacon log 404, dan pemeriksaan ulang render 404 point.lat

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membuka jalan ke tulisan lama di rubrik dan profil penulis lewat halaman berikutnya berbasis path (`/{pilar}/halaman/{n}`, `/{pilar}/{subkategori}/halaman/{n}`, `/penulis/{slug}/halaman/{n}`) yang tetap ISR dan bisa dirayapi, memberi admin tombol "Cek sekarang" (status indeks per URL) dan "Pindai ulang sekarang" (pindai tautan) yang lewat antrean dan `after()` dengan batas yang tidak bisa diakali klik berulang, membatasi beacon log 404 tanpa menyimpan IP, dan mencatat hasil pemeriksaan ulang isi 404 Next yang kadang tidak dirender; tanpa dependensi baru dan tanpa jaringan di tes.

**Architecture:** Aturan paginasi satu modul murni `src/modules/konten/paginasi.ts` (`bacaNomor`, `pisahHalaman`, `susunPaginasi`, `UKURAN_HALAMAN` 24) dan satu pembangun path (`pathHalaman` di `src/lib/paths.ts`); data (`ambilRubrik`, `ambilPenulis`) memuat satu halaman lewat `page` dan `limit` Payload dengan urutan `-terbitPada`, `-id`, dan `susunPaginasi` yang sama menolak nomor di luar jangkauan (404). Rubrik tetap lewat catch-all `[...jalur]` (`muatJalur` membaca akhiran `/halaman/{n}`, `/halaman/1` menjadi `{ jenis: 'alihkan' }` lalu `permanentRedirect`), profil penulis lewat rute bersarang `penulis/[slug]/halaman/[nomor]`; keduanya ISR dengan tag cache halaman 1. SEO halaman berikutnya (judul, canonical, remah roti, JSON-LD) dari `MasukanSeo` dengan `halaman`, jadi `metadata()` dan `jsonLd()` tetap satu pintu. Aksi admin: endpoint Payload di koleksinya (`POST /api/status-indeks/{id}/cek`, `POST /api/tugas-seo/pindai`) dengan penjaga bersama `tolakSelainAdmin`, aturan batas sebagai fungsi murni di `aturan.ts` modulnya, klaim lewat satu pernyataan SQL atomik, pekerjaan berat lewat `after()`, dan tombol klien dengan `aria-disabled` dan `role="status"`. Beacon 404: batas ukuran dan asal di endpoint, batas path baru 24 jam dan hitungan atomik di `catat404` (Postgres); batas laju per IP di Vercel Firewall milik pemilik.

**Tech Stack:** Next.js 16.3.3 (App Router, ISR dengan `generateStaticParams` `[]`, `unstable_cache` bertag, `permanentRedirect`, `notFound`, `after()`), Payload 3.92.1 (endpoint kustom di koleksi, field `ui` dengan komponen sel, `admin.components.RowLabel` dan `useRowLabel`, `payload.db.drizzle.execute` dengan `sql` dari `@payloadcms/db-postgres`), PostgreSQL 16, Search Console URL Inspection API (lewat antrean Mesin Indexing yang sudah ada), Vercel Firewall WAF rate limiting (diatur pemilik, bukan kode), Vitest 4, Playwright 1.63 + `@axe-core/playwright` 4.14, pnpm 10, Node 22.23.4+.

**Spesifikasi:** `docs/superpowers/specs/2026-11-03-point-lat-design.md` (§3 aturan copy; §7 struktur URL dan halaman; §8 Mesin Indexing langkah 5 Cek status, log 404, dan Dashboard SEO; §12 performa (anggaran JS); §14 aksesibilitas; §16 testing).

**Rencana sebelumnya:** `docs/superpowers/plans/2026-11-04-rencana-1-fondasi.md` sampai `docs/superpowers/plans/2026-11-06-rencana-8a-iklan-privasi.md`, ditambah commit lanjutan Rencana 8A sampai `becb67d`. Rencana ini memakai `muatJalur` dan catch-all `[...jalur]` (Rencana 4A), `tanganiTidakAda`, `MasukanSeo`, `metadata()`, `jsonLd()`, `remahRoti()` (Rencana 3), `HalamanRubrik`, `HalamanPenulis`, `Tautan`, `Ikon`, token desain (Rencana 4A dan 4B), antrean dan `status-indeks` Mesin Indexing (Rencana 6A), `tugas-seo`, `klaimTugas`, `jalankanPantau`, dashboard SEO (Rencana 6B), `log-404` dan beacon `Catat404` (Rencana 4B), global Iklan dan slot rubrik (Rencana 8A). Baseline: 500 tes unit di 73 file, 146 tes integrasi di 43 file, 136 tes E2E.

**Pembagian Rencana 8 (keputusan pengawas):** 8A (selesai): iklan, persetujuan cookie, dan admin berbahasa Indonesia. 8B (rencana ini): paginasi berbasis path, "Cek sekarang" dan "Pindai ulang sekarang", rate limit beacon 404, pemeriksaan ulang render 404, ditambah label baris slot di global Iklan (butir tunda 8A). 8C: rilis (migrasi Payload produksi, Vercel dan Supabase, Lighthouse CI, backup mingguan, database pratinjau, password admin produksi, runbook uji langsung).

## Dependensi baru (butuh persetujuan pemilik)

**Rencana ini tidak menambah dependensi dan tidak menaikkan versi.**

| Paket | Keputusan rencana ini |
|---|---|
| `next` 16.3.8 dan `eslint-config-next` 16.3.8 (sekarang 16.3.3) | **Tidak dinaikkan di rencana ini; diusulkan untuk Rencana 8C.** Probe (hanya di worktree terpisah): perubahan `package.json` 2 baris, `pnpm-lock.yaml` 66 baris tambah dan 66 baris hapus; E2E penuh 136 tes lulus; reproduksi 404 terisolasi 0 gagal dari 200 kunjungan. Tetapi 16.3.3 juga 0 gagal di reproduksi yang sama, dan `git log v16.3.3..v16.3.8` tidak memuat perbaikan `notFound`, `__next_error__`, atau stylesheet, jadi naik versi tidak terbukti memperbaiki isi 404 yang kadang kosong. Alasan menaikkannya di 8C adalah perbaikan keamanan di 16.3.4 sampai 16.3.8 (lihat Keputusan teknis), yang lebih tepat diuji bersama persiapan rilis. Rentang peer Payload 3.92.1 (`next >=16.3.3 <17`) menerima 16.3.8. |
| `@vercel/firewall` 1.2.6 (SDK rate limit Vercel) | **Tidak dipasang.** `checkRateLimit` dari SDK itu tetap membutuhkan aturan rate limit yang dibuat di dashboard Firewall (kondisi `@vercel/firewall`), jadi tidak menghilangkan langkah pemilik. Aturan dashboard dengan kondisi path `/api/log-404/catat` cukup dan bekerja sebelum permintaan sampai ke fungsi (tanpa biaya eksekusi). Penjaga yang tidak bergantung IP ditulis di aplikasi tanpa paket. |
| Pustaka paginasi atau komponen paginasi siap pakai | **Tidak dipasang.** Aturannya tiga fungsi murni (sekitar 60 baris) dan komponennya server component kecil yang memakai `Tautan`, `Ikon`, dan token desain point. |

## Global Constraints

- Node `^22.23.4 || >=24.22.1`, pnpm 10. Versi dikunci: Next `16.3.3`, Payload `3.92.1`, `@playwright/test` `1.63.0`. **Tanpa dependensi baru.**
- Nama domain berbahasa Indonesia (`paginasi`, `pisahHalaman`, `susunPaginasi`, `pathHalaman`, `mintaCekStatus`, `mintaPindai`, `tolakSelainAdmin`, `catat404`, `labelBarisSlot`). Nama dari pihak luar tetap seperti aslinya (`Sec-Fetch-Site`, `same-origin`, `aria-current`, `rel="next"`, `after`).
- Copy situs dan admin buatan rencana ini: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash (juga di komentar), tanpa tanda seru. Waktu di pesan admin memakai `teksWaktu` ("6 Nov 2026, 15.10 WIB").
- **Tes tidak pernah memanggil jaringan.** "Cek sekarang" dan "Pindai ulang sekarang" berjalan dengan adapter palsu (`INDEXER_ADAPTER=palsu`; URL Inspection palsu menjawab "URL is unknown to Google"); gambar lewat `cegatCloudinary`, iklan lewat `cegatIklan`.
- **Halaman publik tetap ISR.** Nomor halaman dibaca dari segmen path, bukan `searchParams` (membaca `searchParams` membuat halaman dinamis; `/cari` tetap satu-satunya halaman dinamis). Rute baru memakai `generateStaticParams` yang mengembalikan `[]`.
- Path publik lewat `pathFor` dan `pathHalaman` (jangan merangkai `/halaman/` manual). Warna dari token semantik `src/styles/tokens.css`; animasi hanya `transform` dan mati di reduced motion.
- **Perubahan skema harus aditif.** Rencana ini menambah satu kolom boleh kosong `diminta_pada` di `status_indeks` (Task 6). Setelah mengubah field: `pnpm generate:types`, lalu `pnpm seed` sebelum `pnpm build` (build membaca database dev). Bila Payload macet di "Pulling schema from database..." (pertanyaan DATA LOSS), jangan menjawab; reset database yang bersangkutan seperti Rencana 2 (`DROP DATABASE ... WITH (FORCE)` lalu `CREATE DATABASE`). Menjalankan E2E di commit yang lebih lama dari skema database E2E membuat server E2E menunggu pertanyaan itu sampai `webServer` habis waktu (600 detik); buang database `_e2e` dulu.
- **Operasi massal.** Rencana ini tidak menambah koleksi atau hook. Tulisan baru ke tabel berkunci unik lewat endpoint dengan satu pernyataan SQL atomik (`majukanCek`: `INSERT ... ON CONFLICT (kunci) DO UPDATE` di `antrean_indexing`; `catat404`: `UPDATE` lalu `INSERT ... ON CONFLICT (path) DO UPDATE` di `log_404`), dan klaim lewat `UPDATE ... WHERE ... RETURNING` (`klaimCekManual`, `majukanTugas`). Tes integrasi menjalankan permintaan bersamaan (dua klaim cek, dua pelari pindai, enam beacon ke path yang sama); uji operasi massal lama (`indexer-bersamaan.int.spec.ts`) tetap lulus.
- `pnpm build` membaca database dev (`pointlat` dari `.env`). Postgres harus jalan (`pg_ctlcluster 16 main start` bila mati).
- Tes unit dan integrasi memakai `.env.test` (database `pointlat_test`). E2E memakai `pointlat_test_e2e` (dibuat dan diisi ulang `tests/e2e/siapkan.ts`), build produksi di port 3100, dengan global Iklan menyala (banner persetujuan di semua spec). E2E menjalankan `next build` sendiri sehingga isi `.next/` diganti; setelah E2E, jalankan `pnpm build` lagi sebelum `pnpm start` biasa.
- Server manual memakai port 3200 dan dihentikan dengan `fuser -k 3200/tcp`, jangan `pkill -f` dengan pola luas. Menunggu server: `timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'`. Jangan meninggalkan proses latar belakang setelah task selesai.
- `next dev` dan `next build` di Next 16.3 bisa menambahkan blok "nextjs-agent-rules" ke `CLAUDE.md`. Periksa `git status` sebelum commit; buang blok itu dengan `git checkout CLAUDE.md` (Task 10 sengaja mengubah `CLAUDE.md`; di task itu buang blok itu saja). Build yang tertinggal dari commit lain bisa meninggalkan `.next/types` yang menunjuk rute yang tidak ada (`TS2307`); hapus `.next` lalu ulangi `pnpm typecheck`.
- Jalankan `pnpm typecheck` dan `pnpm lint` di setiap task; keduanya harus bersih (tanpa error dan tanpa warning). Setiap task diakhiri unit, integrasi, dan E2E yang hijau. Keluaran tes integrasi ditulis ke file log dan dibaca utuh (jangan disaring `tail`), supaya pertanyaan DATA LOSS tidak tersembunyi.
- **Tulis `req.context` setelah `await`** (Rencana 6A); rencana ini tidak menulis `req.context`.
- Tes integrasi berbagi database dan berjalan berurutan dengan urutan file yang tidak pasti. Pengguna pertama di database selalu admin (`tetapkanPeranAwal`). Tes mencari dokumennya sendiri lewat ID, path, atau `unik()`; tes yang memakai `tugas-seo` mengosongkannya di `beforeEach`; tes batas 24 jam `catat404` menghitung batasnya dari baris yang sudah ada.
- E2E berjalan berurutan di satu database. Spec lain membaca daftar artikel admin halaman pertama (10 baris, urut `-createdAt`), tulisan terbaru, news sitemap 48 jam, "Paling dicari pekan ini", dan rubrik Uang & Karier: 50 tulisan paginasi (Task 4) dibuat sebelum tulisan lain, bertanggal terbit 2025, di subkategori khusus. `pantau-aksi.spec.ts` menjalankan antrean Mesin Indexing, jadi namanya berjalan setelah `indexing.spec.ts`; spec rencana ini tidak menerbitkan atau membatalkan terbit dokumen.
- **Isi 404 Next 16.3.3 yang kadang tidak dirender (warisan Rencana 4A, diperiksa ulang di rencana ini).** Tes yang membuka path 404 (`galat.spec.ts`, `motion.spec.ts` "kartu ke artikel memakai View Transitions", `cari.spec.ts` "cari dari halaman 404", `paginasi.spec.ts` untuk nomor di luar jangkauan lewat browser) sesekali gagal dengan `locator resolved to <html id="__next_error__">`, atribut `lang` kosong, atau beacon `/api/log-404/catat` yang tidak terkirim. Bila salah satu tes itu gagal dengan gejala tersebut, jalankan `pnpm test:e2e` sekali lagi; bila gagal lagi, atau tes lain yang gagal, berhenti dan laporkan. Jangan menaikkan timeout atau melemahkan tesnya.
- Next 16.3.3 kadang mengirim header `Location` dua kali pada redirect pertama sebuah path ISR (`/a, /a`); tes redirect membaca tujuan per nilai (`tujuan()` di `paginasi.spec.ts`) atau memakai `toContain`, bukan `toBe`.
- **Admin Payload 3.92.** CSS admin menghapus outline (cincin fokus tombol aksi ditulis sendiri); menu admin dirender terbuka lalu ditutup saat hidrasi (tunggu `nav--nav-hydrated`); ukuran huruf dasar admin lebih kecil dari 16 px (tombol aksi setinggi 44 px); tema admin dipilih cookie `payload-theme` (`light` atau `dark`). Komponen klien admin yang memakai `useRouter` diuji unit dengan `vi.mock('next/navigation')`. Lint `react-hooks/purity` menolak `Date.now()` di render komponen; waktu sekarang dihitung lewat argumen bawaan fungsi murni (`jedaCekManual(dimintaPada, sekarang = new Date())`).
- Karakter yang dibutuhkan kode (spasi tak putus, em dash, en dash, elipsis) ditulis sebagai escape `\u00a0`, `\u2014`, `\u2013`, `\u2026`; rencana ini tanpa karakter asli em dash, en dash, dan spasi tak putus. Salin blok kode rencana ini apa adanya.

## Keputusan teknis (hasil riset dan probe, dipakai di semua task)

| Topik | Keputusan | Dasar |
|---|---|---|
| Batas rencana | 10 task: aturan paginasi (1), SEO dan Pantau untuk halaman berikutnya (2), data berhalaman (3), rute dan navigasi rubrik (4), profil penulis (5), Cek sekarang (6), Pindai ulang sekarang (7), beacon 404 (8), label baris slot (9), dokumentasi dan pemeriksaan akhir (10). Pemeriksaan ulang render 404 tidak menjadi task kode (lihat baris "Isi 404 Next"). | Patokan 8 sampai 11 task dari pengawas. Probe menulis semua task dan memverifikasinya per commit. |
| Bentuk URL | Halaman 1 tetap di alamatnya (`/belajar`, `/belajar/persiapan-ujian`, `/penulis/redaksi`); halaman berikutnya `{path}/halaman/{n}`. `/halaman/1` dialihkan 308 ke alamat daftar; nomor tidak kanonik (`02`, `0`, `+2`, lebih dari 4 angka) dan di luar jangkauan 404, bukan dialihkan, supaya satu halaman punya satu alamat. | Panduan paginasi Google: setiap halaman butuh URL sendiri, jangan pakai fragmen `#`. Path, bukan `?halaman=`, karena halaman publik ISR (membaca `searchParams` membuat halaman dinamis). |
| Slug cadangan | `halaman` (`SEGMEN_HALAMAN`) masuk `RESERVED_SLUGS`, jadi ditolak di semua koleksi berslug (validasi CMS yang sudah ada). | Rute catch-all membaca `/{pilar}/halaman/{n}` sebagai halaman ke-n pilar; subkategori atau artikel bernama `halaman` akan membuat `/belajar/halaman` dan `/belajar/halaman/2` milik dua daftar berbeda. Satu aturan untuk semua koleksi lebih sederhana daripada aturan per koleksi. |
| Ukuran dan urutan | 24 kartu per halaman (sama dengan `MAKS_ARTIKEL_RUBRIK` dan `MAKS_ARTIKEL_PENULIS` lama, keduanya dihapus), urut `-terbitPada` lalu `-id`. Navigasi menampilkan halaman pertama, terakhir, halaman ini, dan tetangganya; satu nomor terlewat ditulis, lebih dari satu menjadi jeda. | Urutan kedua `-id` membuat urutan tetap walau tanggal terbit sama, jadi tidak ada kartu di dua halaman atau terlewat (tes integrasi Task 3 dan E2E Task 4 memeriksa setiap tulisan tampil sekali). Urutan bawaan Payload `-createdAt` tidak dipakai karena tanggal terbit bisa diatur editor. |
| Canonical, judul, robots | Canonical setiap halaman ke dirinya sendiri; isian canonical editor hanya berlaku di halaman 1. Judul halaman berikutnya berakhiran ", halaman N" (juga untuk judul SEO editor). Robots sama dengan halaman 1 (`noindexDokumen` dokumennya; probe: `index, follow, max-image-preview:large`). Remah roti dan BreadcrumbList bertambah "Halaman N". Intro pilar, bio penulis, dan JSON-LD ProfilePage hanya di halaman 1. | Panduan paginasi Google: "Don't use the first page of a paginated sequence as the canonical page"; judul dan deskripsi boleh sama, tetapi judul berbeda membantu pembaca membedakan tab dan hasil cari. Halaman berikutnya tetap diindeks supaya tulisan lama punya jalur rayapan. |
| Sitemap | Halaman berikutnya tidak masuk sitemap; setiap artikel sudah ada di sitemap. | Panduan sitemap Google: "Include the URLs in your sitemap that you want to see in Google's search results" dan `lastmod` hanya dipakai bila konsisten bisa diverifikasi; isi halaman paginasi bergeser setiap ada tulisan baru, jadi tidak punya `lastmod` yang jujur. Panduan paginasi tidak membahas sitemap; tautan `<a href>` dari halaman 1 cukup untuk perayapan. |
| Mesin Indexing dan Pantau SEO | Halaman berikutnya tidak dikabarkan (bukan dokumen, tidak punya hook). Pindai tautan menganggap tautan ke `/{daftar}/halaman/{n}` ada bila daftarnya ada (nomornya tidak diperiksa), dan daftar otomatis tetap tidak dihitung sebagai tautan masuk halaman yatim. | Kuota Indexing API dan URL Inspection dipakai untuk dokumen yang berubah; halaman paginasi berubah setiap ada tulisan baru, jadi mengabarkannya hanya membuang kuota. Jumlah halaman berubah, jadi tautan editor ke halaman tertentu tidak boleh dilaporkan rusak hanya karena nomornya sudah bergeser. |
| Rute | Rubrik lewat catch-all `[...jalur]`: `muatJalur` memakai `pisahHalaman` (akhiran hanya untuk rubrik; artikel dan halaman statis dengan akhiran 404). Profil penulis lewat rute bersarang `penulis/[slug]/halaman/[nomor]` dengan komponen yang sama. Data halaman ke-n lewat `muatRubrik(p, s, n)` dan `muatPenulis(slug, n)` bertag cache yang sama dengan halaman 1 (`TAG_ARTIKEL` untuk rubrik; `penulis`, `artikel`, `pilar`, dan `media` untuk profil), jadi terbit atau hapus artikel membuang semua halaman. | Aturan proyek (CLAUDE.md): jenis halaman tingkat atas lewat `muatJalur`, bukan rute bersaudara. Profil penulis sudah di rute `penulis/[slug]` sendiri sejak Rencana 4B. Build probe: `● /[...jalur]`, `● /penulis/[slug]`, dan rute baru `● /penulis/[slug]/halaman/[nomor]`, tanpa rute dinamis baru. |
| Daftar lain | Ikut: profil penulis (24 tulisan; semua tulisan MVP ditulis Redaksi point., jadi daftar ini paling dulu penuh). Tidak ikut: `/glosarium` (semua istilah di satu halaman berkelompok abjad, batas 2.000), `/tools` (semua tools, batas 100; sekarang 6), `/video` (60 video terbaru, `MAKS_VIDEO_INDEKS`), `/cari` (20 hasil, dinamis dan noindex). | Glosarium dan tools adalah indeks lengkap yang dibaca dengan lompatan huruf atau pilar, bukan daftar kronologis. Video baru sedikit di MVP; slug `halaman` yang dicadangkan sudah membuat `/video/halaman/{n}` aman bila kelak dibutuhkan (dicatat di Cakupan yang ditunda). |
| Navigasi halaman | `Paginasi` (server component): `nav` bernama "Halaman tulisan", posisi "Halaman N dari M", "Sebelumnya" dan "Berikutnya" (`rel="prev"`/`rel="next"`, ikon chevron) lewat `Tautan` (`<a href>`), nomor dengan teks pembaca layar "Halaman ", `aria-current="page"`, jeda `aria-hidden` (elipsis `\u2026`); tidak dirender bila satu halaman. Di 375 px arah berbagi satu baris dan nomor di baris kedua; mulai 768 px arah di kiri dan nomor di kanan; setiap tautan paling kecil 44 x 44 px; halaman yang dibuka memakai `--tombol`. Slot iklan rubrik tetap setelah bagian tulisan, jadi di bawah navigasi. | Panduan paginasi Google (`<a href>` antarhalaman; `rel=prev/next` tidak dipakai Google tetapi mungkin dipakai mesin pencari lain). WCAG 2.2: 2.4.4 tujuan tautan (teks "Halaman 2", bukan "2"), 2.5.8 target sentuh (point. memakai 44 px seperti semua kontrol), 1.3.2 urutan bermakna (urutan fokus sama dengan urutan tampilan di semua lebar). Kebijakan penempatan AdSense: iklan jangan terlalu dekat tombol navigasi (slot dengan label dan jarak `.bagian` sendiri). |
| Cek sekarang | Kolom "Cek sekarang" di daftar Status indeks. `POST /api/status-indeks/{id}/cek` memeriksa kuota cek harian (`kuotaInspeksi` dari Pengaturan SEO, dihitung dari log sejak tengah malam waktu Pasifik), lalu mengklaim halaman lewat `UPDATE status_indeks SET diminta_pada = sekarang WHERE id = ? AND (diminta_pada IS NULL OR diminta_pada <= sekarang - 10 menit) RETURNING path`, memajukan baris `cek-status` antrean ke sekarang (`INSERT ... ON CONFLICT DO UPDATE`, tahap dan dasar jadwal tetap), lalu `after()` menjalankan antrean. 202, 429 dengan waktu boleh lagi, atau 404. | Brief pengawas: lewat antrean dan `after()`, bukan memanggil Google dari permintaan. Batas URL Inspection API: 2.000 kueri per hari dan 600 per menit per properti; kuota bawaan point. 1.000 per hari, jadi cek manual memakai kuota yang sama dengan cek terjadwal. Kuota diperiksa sebelum klaim supaya penolakan kuota tidak mengunci halaman 10 menit. |
| Pindai ulang sekarang | Tombol di bagian Tautan rusak dashboard SEO. `POST /api/tugas-seo/pindai` memajukan `berikutnya` tugas `tautan` ke sekarang lewat satu `UPDATE ... WHERE` (ditolak bila sedang berjalan dengan sewa yang masih berlaku, atau dimulai kurang dari 10 menit lalu), lalu `after()` menjalankan `jalankanPantau` untuk tugas itu saja. Klaim tetap lewat `klaimTugas`. | Pindai membaca semua konten terbit dan memeriksa sampai 10 tautan luar; jeda 10 menit cukup untuk melihat hasil perbaikan tanpa membuat pindai berulang. Klaim atomik yang sudah ada (Rencana 6B) membuat dua klik atau klik dan cron bersamaan memindai sekali (tes integrasi dua pelari). |
| Akses aksi admin | `tolakSelainAdmin(req)`: 401 tanpa login, 403 bukan admin, 403 bila `Sec-Fetch-Site` ada dan bukan `same-origin`. | Cookie login Payload ber-SameSite Lax (bawaan) dan `csrf` kosong (Payload menerima cookie dari asal mana pun), jadi browser tidak mengirim cookie pada `POST` lintas situs; `Sec-Fetch-Site` menolak sisanya (misalnya subdomain lain). |
| Umpan balik tombol | Tombol tetap fokus dan memakai `aria-disabled` (bukan `disabled`) saat berjalan dan dibatasi; pesan di `role="status"` ("Sedang dicek di Google.", "Selesai dicek: {label status}.", "Memindai tautan di semua konten terbit.", "Pindai selesai. {ringkasan}", pesan batas berwaktu WIB); tombol menanyakan hasil (cek: `GET` status setiap detik, paling banyak 20 kali; pindai: `GET` tugas setiap 1,5 detik, paling banyak 40 kali) lalu `router.refresh()`; bila belum selesai, pesannya meminta memuat ulang halaman sebentar lagi. Keadaan awal dibatasi dihitung server dari data baris. | WCAG 2.2: 4.1.3 pesan status tanpa memindah fokus; tombol `disabled` kehilangan fokus keyboard. Skill ux-copy: label tindakan ("Cek sekarang", "Pindai ulang sekarang"), pesan yang menyebut kapan bisa dicoba lagi. |
| Beacon log 404 | Pemilik: aturan rate limit Vercel Firewall per IP untuk `POST /api/log-404/catat`. Aplikasi: isian lebih dari 2 KB dan isian tidak sah 400; kiriman dengan `Sec-Fetch-Site` selain `same-origin` diabaikan; paling banyak 200 path baru per 24 jam (dihitung di Postgres dari `created_at`), path yang sudah tercatat tetap dihitung; semua yang diabaikan dijawab 204 sama dengan yang dicatat; tanpa IP. Hitungan lewat SQL atomik. | Dokumentasi Vercel WAF rate limiting: tersedia di semua paket (Hobby 1 aturan per proyek, jendela tetap 10 detik sampai 10 menit, kunci IP atau JA4; Pro 40 aturan), diatur dashboard atau `vercel firewall` CLI, dihitung per region. Serverless: memori proses tidak bisa diandalkan untuk hitungan. UU PDP: IP adalah data pribadi, jadi tidak disimpan. Jawaban yang sama tidak membocorkan batas; `sendBeacon` tidak membaca jawabannya. |
| Isi 404 Next | Tidak ada task upgrade dan tidak ada penanganan di aplikasi. Aturan "ulangi sekali" diperluas ke semua tes yang membuka path 404. Upgrade ke 16.3.8 diusulkan di 8C karena perbaikan keamanan, bukan karena 404. | Reproduksi probe: 0 gagal dari 200 kunjungan 404 terisolasi di 16.3.3 dalam empat mode (path unik 4 paralel, path sama, CPU 4x lebih lambat, jaringan 150 ms dan 200 kBps) dan di 16.3.8; 200 tes runner (galat dan View Transitions, `--repeat-each`) lulus di keduanya. Riwayat: 4 kegagalan dari 143 log E2E penuh (sekitar 0,5% kunjungan 404). Satu kegagalan alami saat verifikasi Task 4 terekam jejaknya (Temuan review): dua stylesheet dibatalkan sekitar 33 ms setelah diminta, satu diminta ulang dan yang lain tidak, lalu isi 404 tidak pernah dirender. `git log v16.3.3..v16.3.8` tanpa perbaikan terkait; isinya antara lain perbaikan keamanan (DNS rebinding server MCP, kebocoran `use cache` di draft mode, kunci cache respons per rute, DNS pinning `next/image`, SVG `next/og`, path data peka huruf besar). Penanganan di aplikasi (memuat ulang halaman dari skrip) berisiko loop dan tidak bisa diuji pasti. |
| Label baris slot | Baris array Slot iklan berlabel ID slot dan posisi singkat ("beranda-samping · Beranda", ditambah "nonaktif"), lewat `RowLabel` dan `useRowLabel`; aturannya fungsi murni `labelBarisSlot`. | Butir tunda Rencana 8A. Payload 3.92.1 (kode terpasang): `admin.components.RowLabel` di field array dan hook `useRowLabel` dari `@payloadcms/ui` (`data`, `rowNumber`). Tanpa field baru, jadi tipe Payload tidak berubah. |

## Struktur file setelah rencana ini

```
src/lib/paths.ts                       + SEGMEN_HALAMAN, pathHalaman(dasar, nomor)
src/lib/slug.ts                        + 'halaman' di RESERVED_SLUGS
src/lib/aksiAdmin.ts                   tolakSelainAdmin(req): penjaga endpoint aksi admin
src/modules/konten/
  paginasi.ts      UKURAN_HALAMAN, bacaNomor, pisahHalaman, susunPaginasi, tipe Paginasi (fungsi murni)
  data.ts          halamanKartu (satu halaman kartu, -terbitPada, -id), ambilRubrik(..., nomor), ambilPenulis(..., nomor)
  rubrik.ts, penulis.ts, tipe.ts       paginasi di DataRubrik dan DataPenulis; intro dan bio hanya di halaman 1
  jalur.ts         muatJalur membaca /halaman/{n}; HasilJalur { jenis: 'alihkan'; ke }
  cache.ts         muatRubrik(pilar, sub, nomor), muatPenulis(slug, nomor) (tag sama dengan halaman 1)
  log404.ts        MAKS_ISIAN_404, MAKS_PATH_BARU_24_JAM, catat404 (SQL atomik, batas path baru 24 jam)
  endpoint.ts      endpointCatat404: ukuran isian, Sec-Fetch-Site, jawaban 204 yang sama
src/modules/seo/   halaman di MasukanSeo (pilar, subkategori, penulis); nomorHalaman; judul ", halaman N";
                   canonical ke diri sendiri; remah roti "Halaman N"; ProfilePage hanya halaman 1
src/modules/pantau/
  tautan.ts        tautan ke /{daftar}/halaman/{n} dianggap ada bila daftarnya ada
  aturan.ts        JEDA_PINDAI_MANUAL_MS, batasPindaiManual
  tugas.ts         majukanTugas (UPDATE ... RETURNING)
  index.ts         mintaPindai, pesanBatasPindai, jalankanPantauSetelahRespons (after())
  endpoint.ts      endpointPindaiUlang (POST /api/tugas-seo/pindai)
  dashboard.ts     DataDashboard.pindai, InfoTugas.mulai
  admin/TombolPindaiUlang.tsx, BagianDashboard.tsx, DashboardSeo.tsx, dashboard.scss
src/modules/indexer/
  aturan.ts        JEDA_CEK_MANUAL_MS, jedaCekManual, batasCekManual
  antrean.ts       majukanCek (INSERT ... ON CONFLICT DO UPDATE), klaimCekManual (UPDATE ... RETURNING), DataStatus.dimintaPada
  cek.ts           mintaCekStatus (kuota, klaim, antrean)
  endpoint.ts      endpointCekSekarang (POST /api/status-indeks/{id}/cek)
  admin/SelCekSekarang.tsx, TombolCekSekarang.tsx, indexing.scss
src/modules/iklan/ LABEL_POSISI_SINGKAT, labelBarisSlot, admin/LabelSlot.tsx
src/collections/StatusIndeks.ts        field dimintaPada (hanya baca), kolom ui cekSekarang, endpoint cek
src/collections/TugasSeo.ts            endpoint pindai
src/globals/Iklan.ts                   RowLabel baris slot
src/components/dasar/Paginasi.tsx, Paginasi.module.css   navigasi halaman (server component)
src/components/dasar/Ikon.tsx          + chevron-left
src/components/rubrik/HalamanRubrik.tsx, src/components/penulis/HalamanPenulis.tsx   Paginasi di bagian tulisan
src/app/(frontend)/[...jalur]/page.tsx                    alihkan (308) untuk /halaman/1
src/app/(frontend)/penulis/[slug]/halaman/[nomor]/page.tsx  profil penulis halaman ke-n (ISR)
tests/unit/paginasi.test.ts, seo-paginasi.test.ts, paginasi-komponen.test.ts
tests/int/paginasi.int.spec.ts, indexer-cek.int.spec.ts, pantau-pindai.int.spec.ts, log404.int.spec.ts
tests/e2e/paginasi.spec.ts, pantau-aksi.spec.ts, PAGINASI_E2E di tests/e2e/data.ts dan siapkan.ts
```

Diubah juga: `src/payload-types.ts` (`dimintaPada`), import map admin (`SelCekSekarang`, `LabelSlot`), tes lama yang membaca bentuk data dashboard dan label admin global Iklan, `motion.spec.ts` (anggaran JS halaman berikutnya), `CLAUDE.md`, dan spesifikasi.

## Jumlah tes yang diharapkan

| Setelah task | Unit | Integrasi | E2E |
|---|---|---|---|
| Baseline (`becb67d`) | 500 tes (73 file) | 146 tes (43 file) | 136 tes |
| 1 Aturan paginasi | 507 tes (74 file) | 146 tes (43 file) | 136 tes |
| 2 SEO dan Pantau untuk halaman berikutnya | 512 tes (75 file) | 146 tes (43 file) | 136 tes |
| 3 Data rubrik dan penulis berhalaman | 513 tes (75 file) | 148 tes (44 file) | 136 tes |
| 4 Rute dan navigasi rubrik | 517 tes (76 file) | 148 tes (44 file) | 142 tes |
| 5 Profil penulis berhalaman | 518 tes (76 file) | 148 tes (44 file) | 146 tes |
| 6 Cek sekarang | 520 tes (76 file) | 152 tes (45 file) | 149 tes |
| 7 Pindai ulang sekarang | 522 tes (76 file) | 155 tes (46 file) | 150 tes |
| 8 Penjaga beacon log 404 | 522 tes (76 file) | 158 tes (47 file) | 150 tes |
| 9 Label baris slot | 523 tes (76 file) | 158 tes (47 file) | 150 tes |
| 10 CLAUDE.md, spesifikasi, anggaran JS, pemeriksaan akhir | 523 tes (76 file) | 158 tes (47 file) | 150 tes |

---

### Task 1: Aturan paginasi berbasis path

**Files:**
- Create: `src/modules/konten/paginasi.ts`, `tests/unit/paginasi.test.ts`
- Modify: `src/lib/paths.ts`, `src/lib/slug.ts`, `src/modules/konten/index.ts`
- Test: `tests/unit/paginasi.test.ts`

**Interfaces:**
- Consumes: `RESERVED_SLUGS` dan `validasiFormatSlug` (`src/lib/slug.ts`), `pathFor` (`src/lib/paths.ts`).
- Produces:
  - `SEGMEN_HALAMAN = 'halaman'` dan `pathHalaman(dasar: string, nomor: number): string` di `src/lib/paths.ts` (halaman 1 tanpa akhiran, berikutnya `${dasar}/halaman/${nomor}`); `SEGMEN_HALAMAN` masuk `RESERVED_SLUGS`, jadi slug `halaman` ditolak di semua koleksi.
  - `src/modules/konten/paginasi.ts`: `UKURAN_HALAMAN = 24`; `bacaNomor(teks: string): number | null` (1 sampai 9999 tanpa nol di depan); `pisahHalaman(jalur: string[]): SegmenBerhalaman | null` dengan `SegmenBerhalaman = { jalur: string[]; nomor: number; tertulis: boolean }` (`null` bila akhiran `/halaman/{n}` ada tetapi nomornya tidak sah); `susunPaginasi(dasar: string, nomor: number, total: number, ukuran = UKURAN_HALAMAN): Paginasi | null` (`null` bila nomor di luar jangkauan); tipe `Paginasi = { nomor; jumlah; sebelumnya: string | null; berikutnya: string | null; halaman: (TautanHalaman | null)[] }` dan `TautanHalaman = { nomor; href; aktif }`. Semua diekspor juga dari `@/modules/konten`.

Halaman 1 setiap daftar tetap di alamatnya sekarang (`/belajar`), halaman berikutnya di segmen tambahan `/halaman/{n}`. Segmen path, bukan `?halaman=`, karena halaman publik dirender ISR dan membaca `searchParams` membuat halaman dinamis (`/cari` satu-satunya halaman dinamis). Nomor yang tidak kanonik (`02`, `0`, `+2`, lebih dari empat angka) tidak dialihkan tetapi 404, supaya satu halaman hanya punya satu alamat. Navigasi menampilkan halaman pertama, terakhir, halaman ini, dan tetangganya; satu nomor yang terlewat ditulis, lebih dari satu menjadi jeda.

Slug `halaman` dicadangkan lewat `RESERVED_SLUGS`, satu aturan untuk semua koleksi: rute catch-all membaca `/{pilar}/halaman/{n}` sebagai halaman ke-n pilar, jadi subkategori bernama `halaman` akan membingungkan (`/belajar/halaman` dan `/belajar/halaman/2` milik dua daftar berbeda). Seed dan data contoh tidak memakai slug itu.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/paginasi.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { pathHalaman, SEGMEN_HALAMAN } from '@/lib/paths'
  import { validasiFormatSlug } from '@/lib/slug'
  import { bacaNomor, pisahHalaman, susunPaginasi, UKURAN_HALAMAN } from '@/modules/konten/paginasi'

  /** Nomor yang ditampilkan navigasi, jeda sebagai "...". */
  const nomor = (dasar: string, n: number, total: number) =>
    susunPaginasi(dasar, n, total)?.halaman.map((h) => (h ? (h.aktif ? `[${h.nomor}]` : String(h.nomor)) : '...'))

  describe('path halaman daftar', () => {
    it('halaman 1 di alamat daftar itu sendiri, halaman berikutnya di /halaman/{n}', () => {
      expect(pathHalaman('/uang-karier', 1)).toBe('/uang-karier')
      expect(pathHalaman('/uang-karier', 2)).toBe('/uang-karier/halaman/2')
      expect(pathHalaman('/uang-karier/pajak', 12)).toBe('/uang-karier/pajak/halaman/12')
      expect(pathHalaman('/penulis/redaksi', 3)).toBe('/penulis/redaksi/halaman/3')
    })

    it('slug "halaman" dicadangkan untuk semua koleksi', () => {
      expect(SEGMEN_HALAMAN).toBe('halaman')
      expect(validasiFormatSlug('halaman')).toBe('"halaman" dipakai sistem. Pilih slug lain.')
      expect(validasiFormatSlug('halaman-depan')).toBe(true)
    })
  })

  describe('bacaNomor dan pisahHalaman', () => {
    it('nomor hanya bilangan bulat 1 sampai 9999 tanpa nol di depan', () => {
      expect(bacaNomor('2')).toBe(2)
      expect(bacaNomor('9999')).toBe(9999)
      for (const teks of ['0', '01', '+2', '2.0', '1e3', '10000', 'dua', '', ' 2']) expect(bacaNomor(teks), teks).toBeNull()
    })

    it('tanpa akhiran berarti halaman 1; akhiran /halaman/{n} dipisahkan; nomor tidak sah berarti 404', () => {
      expect(pisahHalaman(['uang-karier'])).toEqual({ jalur: ['uang-karier'], nomor: 1, tertulis: false })
      expect(pisahHalaman(['uang-karier', 'pajak'])).toEqual({ jalur: ['uang-karier', 'pajak'], nomor: 1, tertulis: false })
      expect(pisahHalaman(['uang-karier', 'halaman', '2'])).toEqual({ jalur: ['uang-karier'], nomor: 2, tertulis: true })
      expect(pisahHalaman(['uang-karier', 'pajak', 'halaman', '3'])).toEqual({ jalur: ['uang-karier', 'pajak'], nomor: 3, tertulis: true })
      expect(pisahHalaman(['uang-karier', 'halaman', '1'])).toEqual({ jalur: ['uang-karier'], nomor: 1, tertulis: true })
      expect(pisahHalaman(['uang-karier', 'halaman'])).toEqual({ jalur: ['uang-karier', 'halaman'], nomor: 1, tertulis: false })
      expect(pisahHalaman(['uang-karier', 'halaman', '02'])).toBeNull()
      expect(pisahHalaman(['uang-karier', 'halaman', 'dua'])).toBeNull()
    })
  })

  describe('susunPaginasi', () => {
    it(`satu halaman ${UKURAN_HALAMAN} kartu; daftar kosong tetap punya halaman 1; nomor di luar jangkauan berarti 404`, () => {
      expect(susunPaginasi('/belajar', 1, 0)).toEqual({ nomor: 1, jumlah: 1, sebelumnya: null, berikutnya: null, halaman: [{ nomor: 1, href: '/belajar', aktif: true }] })
      expect(susunPaginasi('/belajar', 1, UKURAN_HALAMAN)?.jumlah).toBe(1)
      expect(susunPaginasi('/belajar', 2, UKURAN_HALAMAN)).toBeNull()
      expect(susunPaginasi('/belajar', 2, UKURAN_HALAMAN + 1)?.jumlah).toBe(2)
      expect(susunPaginasi('/belajar', 0, 100)).toBeNull()
      expect(susunPaginasi('/belajar', 5, 100)?.jumlah).toBe(5)
      expect(susunPaginasi('/belajar', 6, 100)).toBeNull()
    })

    it('tautan sebelumnya dan berikutnya memakai path halaman (halaman 1 tanpa akhiran)', () => {
      expect(susunPaginasi('/belajar', 1, 50)).toMatchObject({ jumlah: 3, sebelumnya: null, berikutnya: '/belajar/halaman/2' })
      expect(susunPaginasi('/belajar', 2, 50)).toMatchObject({ sebelumnya: '/belajar', berikutnya: '/belajar/halaman/3' })
      expect(susunPaginasi('/belajar', 3, 50)).toMatchObject({ sebelumnya: '/belajar/halaman/2', berikutnya: null })
      expect(susunPaginasi('/belajar', 2, 50)?.halaman).toEqual([
        { nomor: 1, href: '/belajar', aktif: false },
        { nomor: 2, href: '/belajar/halaman/2', aktif: true },
        { nomor: 3, href: '/belajar/halaman/3', aktif: false },
      ])
    })

    it('nomor pertama, terakhir, dan tetangga halaman ini; satu nomor terlewat ditulis, lebih dari satu menjadi jeda', () => {
      const total = 10 * UKURAN_HALAMAN
      expect(nomor('/x', 1, total)).toEqual(['[1]', '2', '...', '10'])
      expect(nomor('/x', 3, total)).toEqual(['1', '2', '[3]', '4', '...', '10'])
      expect(nomor('/x', 4, total)).toEqual(['1', '2', '3', '[4]', '5', '...', '10'])
      expect(nomor('/x', 5, total)).toEqual(['1', '...', '4', '[5]', '6', '...', '10'])
      expect(nomor('/x', 10, total)).toEqual(['1', '...', '9', '[10]'])
      expect(nomor('/x', 4, 5 * UKURAN_HALAMAN)).toEqual(['1', '2', '3', '[4]', '5'])
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/paginasi.test.ts
  ```

  Hasil yang diharapkan: FAIL `tests/unit/paginasi.test.ts` dengan `Error: Cannot find package '@/modules/konten/paginasi' imported from '.../tests/unit/paginasi.test.ts'` (Tests: no tests).

- [ ] **Langkah 3: Path halaman, slug cadangan, dan modul paginasi**

  ```diff
  diff --git a/src/lib/paths.ts b/src/lib/paths.ts
  index 6ab3a21..9c8cd3a 100644
  --- a/src/lib/paths.ts
  +++ b/src/lib/paths.ts
  @@ -8,6 +8,14 @@ export type TargetPath =
   /** Halaman indeks yang tidak mewakili satu dokumen. */
   export const PATH_INDEKS = { cari: '/cari', glosarium: '/glosarium', tools: '/tools', video: '/video' } as const
   
  +/** Segmen paginasi: halaman ke-n sebuah daftar ada di `{path}/halaman/{n}` (slug `halaman` dicadangkan). */
  +export const SEGMEN_HALAMAN = 'halaman'
  +
  +/** Path halaman ke-`nomor` dari daftar di `dasar`. Halaman 1 adalah alamat daftar itu sendiri, tanpa akhiran. */
  +export function pathHalaman(dasar: string, nomor: number): string {
  +  return nomor > 1 ? `${dasar}/${SEGMEN_HALAMAN}/${nomor}` : dasar
  +}
  +
   /** Satu-satunya tempat path publik dirangkai. Dipakai redirect, SEO, sitemap, dan indexer. */
   export function pathFor(target: TargetPath): string {
     switch (target.jenis) {
  ```

  ```diff
  diff --git a/src/lib/slug.ts b/src/lib/slug.ts
  index 795cfde..c95aceb 100644
  --- a/src/lib/slug.ts
  +++ b/src/lib/slug.ts
  @@ -1,6 +1,11 @@
  +import { SEGMEN_HALAMAN } from './paths'
  +
   const MAKS_PANJANG = 80
   
  -/** Segmen tingkat atas yang dipakai rute sistem dan tidak boleh menjadi slug konten. */
  +/**
  + * Segmen yang dipakai rute sistem dan tidak boleh menjadi slug konten: rute tingkat atas, dan segmen paginasi
  + * (`/{pilar}/halaman/2` tidak boleh tertukar dengan subkategori bernama `halaman`).
  + */
   export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
     'admin',
     'api',
  @@ -17,6 +22,7 @@ export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
     'ads',
     'media',
     'next',
  +  SEGMEN_HALAMAN,
   ])
   
   export function slugify(input: string): string {
  ```

  `src/modules/konten/paginasi.ts`

  ```ts
  import { pathHalaman, SEGMEN_HALAMAN } from '@/lib/paths'

  /**
   * Paginasi berbasis path untuk daftar kartu (rubrik pilar dan subkategori, profil penulis). Halaman 1 di
   * alamat daftar itu sendiri, halaman berikutnya di `{path}/halaman/{n}` (`pathHalaman`). Fungsi murni:
   * membaca nomor dari URL, menolak nomor yang tidak sah atau di luar jangkauan, dan menyusun navigasinya.
   */

  /** Jumlah kartu per halaman daftar, sama dengan batas daftar sebelum ada paginasi. */
  export const UKURAN_HALAMAN = 24

  /** Nomor dari segmen URL: bilangan bulat 1 sampai 9999 tanpa nol di depan ("2", bukan "02", "+2", atau "2.0"). */
  export function bacaNomor(teks: string): number | null {
    return /^[1-9]\d{0,3}$/.test(teks) ? Number(teks) : null
  }

  /** Segmen path tanpa akhiran halaman. `tertulis`: URL memuat `/halaman/{n}` (termasuk `/halaman/1`, yang dialihkan). */
  export type SegmenBerhalaman = { jalur: string[]; nomor: number; tertulis: boolean }

  /**
   * Memisahkan akhiran `/halaman/{n}` dari segmen path rute catch-all. Tanpa akhiran: halaman 1. `null` bila
   * akhirannya ada tetapi nomornya tidak sah (path itu 404).
   */
  export function pisahHalaman(jalur: string[]): SegmenBerhalaman | null {
    if (jalur.length < 2 || jalur[jalur.length - 2] !== SEGMEN_HALAMAN) return { jalur, nomor: 1, tertulis: false }
    const nomor = bacaNomor(jalur[jalur.length - 1])
    return nomor === null ? null : { jalur: jalur.slice(0, -2), nomor, tertulis: true }
  }

  export type TautanHalaman = { nomor: number; href: string; aktif: boolean }

  export type Paginasi = {
    nomor: number
    /** Jumlah halaman, paling sedikit 1 (daftar kosong tetap punya halaman 1). */
    jumlah: number
    sebelumnya: string | null
    berikutnya: string | null
    /** Nomor yang ditampilkan berurutan: pertama, terakhir, dan tetangga halaman ini; `null` adalah jeda. */
    halaman: (TautanHalaman | null)[]
  }

  /**
   * Navigasi halaman ke-`nomor` dari daftar berisi `total` dokumen di alamat `dasar`, atau `null` bila nomor itu
   * di luar jangkauan (path itu 404). Nomor yang ditampilkan: halaman pertama, terakhir, halaman ini dan
   * tetangganya; satu nomor yang terlewat ditulis, lebih dari satu menjadi jeda.
   */
  export function susunPaginasi(dasar: string, nomor: number, total: number, ukuran = UKURAN_HALAMAN): Paginasi | null {
    const jumlah = Math.max(1, Math.ceil(total / ukuran))
    if (!Number.isInteger(nomor) || nomor < 1 || nomor > jumlah) return null
    const tampil = [...new Set([1, nomor - 1, nomor, nomor + 1, jumlah])].filter((n) => n >= 1 && n <= jumlah).sort((a, b) => a - b)
    const halaman: (TautanHalaman | null)[] = []
    const tautan = (n: number): TautanHalaman => ({ nomor: n, href: pathHalaman(dasar, n), aktif: n === nomor })
    tampil.forEach((n, i) => {
      const lalu = tampil[i - 1]
      if (lalu !== undefined && n - lalu === 2) halaman.push(tautan(n - 1))
      else if (lalu !== undefined && n - lalu > 2) halaman.push(null)
      halaman.push(tautan(n))
    })
    return {
      nomor,
      jumlah,
      sebelumnya: nomor > 1 ? pathHalaman(dasar, nomor - 1) : null,
      berikutnya: nomor < jumlah ? pathHalaman(dasar, nomor + 1) : null,
      halaman,
    }
  }
  ```

  ```diff
  diff --git a/src/modules/konten/index.ts b/src/modules/konten/index.ts
  index 5d90a59..377a367 100644
  --- a/src/modules/konten/index.ts
  +++ b/src/modules/konten/index.ts
  @@ -4,6 +4,7 @@
    * - `muat*()` dipanggil halaman dan layout: query Payload yang di-cache dengan tag `TAG`.
    * - `ambil*(payload)` versi tanpa cache untuk tes integrasi dan skrip.
    * - `muatJalur(jalur)` untuk rute catch-all: artikel, rubrik pilar dan subkategori, halaman statis.
  + * - `susunPaginasi`, `pisahHalaman`, `bacaNomor`: paginasi berbasis path (`{path}/halaman/{n}`) untuk daftar kartu.
    * - `tanganiTidakAda(path)` untuk path tanpa dokumen: redirect 301 dari CMS atau 404.
    * - Fungsi murni (`susunHeader`, `susunArtikel`, `tanggalIndonesia`, ...) menerjemahkan dokumen
    *   Payload ke tipe di `tipe.ts`, supaya komponen tidak membaca relasi Payload mentah.
  @@ -68,6 +69,7 @@ export { kartuVideo, labelDurasi, MAKS_VIDEO_INDEKS, MAKS_VIDEO_LAIN, pathTakari
   export { MAKS_ARTIKEL_PENULIS, susunPenulis } from './penulis'
   export { JUDUL_FAQ, susunHalaman } from './halaman'
   export { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
  +export { bacaNomor, pisahHalaman, susunPaginasi, UKURAN_HALAMAN, type Paginasi, type SegmenBerhalaman, type TautanHalaman } from './paginasi'
   export { muatJalur, type HasilJalur } from './jalur'
   export { tanganiTidakAda } from './navigasi'
   export { pathDariSegmen, tujuanRedirect } from './redirect'
  ```

- [ ] **Langkah 4: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 507 tes (74 file); integrasi 146 tes (43 file); E2E 136 tes.

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/lib/paths.ts src/lib/slug.ts src/modules/konten/paginasi.ts src/modules/konten/index.ts tests/unit/paginasi.test.ts
  git commit -m "feat(konten): aturan paginasi berbasis path (halaman 1 di alamat daftar, berikutnya di /halaman/{n}), nomor halaman dari URL, navigasi dengan jeda, dan slug halaman dicadangkan"
  ```

---

### Task 2: SEO halaman berhalaman dan tautan ke halaman bernomor di pindai tautan

**Files:**
- Create: `tests/unit/seo-paginasi.test.ts`
- Modify: `src/modules/seo/tipe.ts`, `src/modules/seo/dokumen.ts`, `src/modules/seo/metadata.ts`, `src/modules/seo/jsonld.ts`, `src/modules/pantau/tautan.ts`
- Test: `tests/unit/seo-paginasi.test.ts`

**Interfaces:**
- Consumes: `pathHalaman`, `pisahHalaman` (Task 1); `metadata`, `jsonLd`, `remahRoti`, `canonicalDokumen`, `nilaiTautan` yang sudah ada; `penulis`, `pilarUang`, `situs` dari `tests/unit/seo-contoh.ts`.
- Produces: `MasukanSeo` varian `pilar`, `subkategori`, dan `penulis` menerima `halaman?: number` (bawaan 1); `nomorHalaman(masukan: MasukanSeo): number` di `seo/dokumen.ts`. Untuk halaman 2 dan seterusnya: `pathDokumen` memakai `pathHalaman`, `judulSeo` menambah ", halaman N" (juga pada judul SEO isian editor), `canonicalDokumen` mengabaikan canonical isian editor (selalu dirinya sendiri), `remahRoti` menambah butir "Halaman N", dan `jsonLd` penulis tanpa ProfilePage. `nilaiTautan` menganggap `/{daftar}/halaman/{n}` ada bila `/{daftar}` ada di peta situs, tanpa menghitungnya sebagai tautan masuk.

Halaman berikutnya punya URL, judul, dan canonical sendiri, tetap diindeks, dengan deskripsi yang sama dengan halaman 1. Panduan paginasi Google: setiap halaman dalam urutan diperlakukan sebagai halaman terpisah, jangan jadikan halaman pertama canonical seluruh urutan, judul dan deskripsi boleh sama. Judul tetap diberi akhiran ", halaman N" supaya tab browser, hasil pencarian, dan laporan judul ganda membedakannya. Halaman berikutnya profil penulis hanya daftar tulisan, jadi ProfilePage (dan Person di dalamnya) hanya di halaman 1.

Pindai tautan harian tidak membaca halaman yang dirender, jadi halaman berikutnya rubrik tidak pernah dihitung sebagai sumber tautan masuk (spesifikasi §8: daftar otomatis tidak dihitung). Tautan yang ditulis editor ke `/belajar/halaman/2` dianggap ada bila `/belajar` ada; nomornya tidak diperiksa karena jumlah halaman berubah setiap ada tulisan baru.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/seo-paginasi.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { nilaiTautan, PESAN_TEMUAN, type PetaSitus, type Sumber } from '@/modules/pantau/tautan'
  import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
  import { metadata } from '@/modules/seo/metadata'

  import { penulis, pilarUang, situs } from './seo-contoh'

  const pajak = { id: 7, nama: 'Pajak', slug: 'pajak', pilar: pilarUang }

  describe('SEO halaman daftar berhalaman (rubrik dan profil penulis)', () => {
    it('halaman 1 tetap seperti sebelumnya; halaman berikutnya punya judul, canonical, dan URL Open Graph sendiri', () => {
      const satu = metadata({ jenis: 'pilar', doc: pilarUang, halaman: 1 }, situs)
      expect(satu.title).toEqual({ absolute: 'Uang & Karier · point.' })
      expect(satu.alternates).toEqual({ canonical: 'https://point.lat/uang-karier' })

      const dua = metadata({ jenis: 'pilar', doc: pilarUang, halaman: 2 }, situs)
      expect(dua.title).toEqual({ absolute: 'Uang & Karier, halaman 2 · point.' })
      expect(dua.alternates).toEqual({ canonical: 'https://point.lat/uang-karier/halaman/2' })
      expect(dua.openGraph).toMatchObject({ url: 'https://point.lat/uang-karier/halaman/2', title: 'Uang & Karier, halaman 2 · point.' })
      // Deskripsi sama dengan halaman 1 dan tetap diindeks (panduan paginasi Google).
      expect(dua.description).toBe(satu.description)
      expect(dua.robots).toEqual({ index: true, follow: true, 'max-image-preview': 'large' })
    })

    it('canonical isian editor dan judul SEO: canonical hanya untuk halaman 1, judul SEO diberi akhiran halaman', () => {
      const doc = { ...pajak, seo: { canonical: 'https://point.lat/pajak-lama', judulSEO: 'Pajak penghasilan untuk karyawan' } }
      expect(metadata({ jenis: 'subkategori', doc }, situs).alternates).toEqual({ canonical: 'https://point.lat/pajak-lama' })
      const tiga = metadata({ jenis: 'subkategori', doc, halaman: 3 }, situs)
      expect(tiga.alternates).toEqual({ canonical: 'https://point.lat/uang-karier/pajak/halaman/3' })
      expect(tiga.title).toEqual({ absolute: 'Pajak penghasilan untuk karyawan, halaman 3' })
    })

    it('remah roti dan BreadcrumbList menambah "Halaman N" setelah daftarnya', () => {
      expect(remahRoti({ jenis: 'subkategori', doc: pajak, halaman: 2 })).toEqual([
        { nama: 'Beranda', path: '/' },
        { nama: 'Uang & Karier', path: '/uang-karier' },
        { nama: 'Pajak', path: '/uang-karier/pajak' },
        { nama: 'Halaman 2', path: '/uang-karier/pajak/halaman/2' },
      ])
      const remah = jsonLd({ jenis: 'pilar', doc: pilarUang, halaman: 2 }, situs)['@graph'].find((n) => n['@type'] === 'BreadcrumbList')
      expect(remah?.itemListElement).toEqual([
        { '@type': 'ListItem', position: 1, name: 'Beranda', item: 'https://point.lat/' },
        { '@type': 'ListItem', position: 2, name: 'Uang & Karier', item: 'https://point.lat/uang-karier' },
        { '@type': 'ListItem', position: 3, name: 'Halaman 2', item: 'https://point.lat/uang-karier/halaman/2' },
      ])
    })

    it('profil penulis: ProfilePage hanya di halaman 1, halaman berikutnya hanya daftar tulisan', () => {
      const jenis = (halaman: number) => jsonLd({ jenis: 'penulis', doc: penulis, halaman }, situs)['@graph'].map((n) => n['@type'])
      expect(jenis(1)).toEqual(['Organization', 'WebSite', 'ProfilePage', 'BreadcrumbList'])
      expect(jenis(2)).toEqual(['Organization', 'WebSite', 'BreadcrumbList'])
      expect(metadata({ jenis: 'penulis', doc: penulis, halaman: 2 }, situs).alternates).toEqual({ canonical: 'https://point.lat/penulis/rani-wulandari/halaman/2' })
    })
  })

  describe('pindai tautan: tautan ke halaman bernomor sebuah daftar', () => {
    const a: Sumber = { koleksi: 'artikel', id: 1, judul: 'Artikel 1', path: '/a' }
    const peta: PetaSitus = { path: new Set(['/', '/a', '/belajar', '/penulis/redaksi']), dokumen: new Map([['artikel:1', '/a']]), redirect: new Map() }

    it('ada bila daftarnya ada (nomornya tidak diperiksa); daftar yang tidak ada atau nomor tidak sah tetap rusak', () => {
      const tujuan = ['/belajar/halaman/2', '/belajar/halaman/40', '/penulis/redaksi/halaman/3', '/tidak-ada/halaman/2', '/belajar/halaman/02', '/halaman/2']
      const { temuan } = nilaiTautan(
        tujuan.map((path) => ({ sumber: a, tujuan: { jenis: 'internal' as const, path } })),
        peta,
        [],
      )
      expect(temuan).toEqual(
        ['/tidak-ada/halaman/2', '/belajar/halaman/02', '/halaman/2'].map((t) => ({ jenis: 'rusak', tujuan: t, pesan: PESAN_TEMUAN.tidakAda, sumber: a })),
      )
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/seo-paginasi.test.ts
  ```

  Hasil yang diharapkan: FAIL, kelima tes gagal; yang pertama dengan `AssertionError: expected { absolute: 'Uang & Karier · point.' } to deeply equal { Object (absolute) }`, yang ketiga dengan `AssertionError: expected [ Array(3) ] to deeply equal [ Array(4) ]`, dan tes pindai tautan dengan `AssertionError: expected [ { jenis: 'rusak', …(3) }, …(5) ] to deeply equal [ { jenis: 'rusak', …(3) }, …(2) ]`.

- [ ] **Langkah 3: Nomor halaman di masukan SEO dan di pindai tautan**

  ```diff
  diff --git a/src/modules/seo/tipe.ts b/src/modules/seo/tipe.ts
  index b811569..85e902e 100644
  --- a/src/modules/seo/tipe.ts
  +++ b/src/modules/seo/tipe.ts
  @@ -70,14 +70,17 @@ export type VideoSeo = Dasar & {
   
   export type HalamanSeo = Dasar & { judul: string }
   
  -/** Halaman yang SEO-nya dibangun modul ini. `statis` untuk halaman indeks tanpa dokumen (`/tools`, `/cari`). */
  +/**
  + * Halaman yang SEO-nya dibangun modul ini. `statis` untuk halaman indeks tanpa dokumen (`/tools`, `/cari`).
  + * `halaman`: nomor halaman daftar berhalaman (rubrik dan profil penulis), bawaan 1.
  + */
   export type MasukanSeo =
     | { jenis: 'artikel'; doc: ArtikelSeo }
  -  | { jenis: 'pilar'; doc: PilarSeo }
  -  | { jenis: 'subkategori'; doc: SubkategoriSeo }
  +  | { jenis: 'pilar'; doc: PilarSeo; halaman?: number }
  +  | { jenis: 'subkategori'; doc: SubkategoriSeo; halaman?: number }
     | { jenis: 'tools'; doc: ToolsSeo }
     | { jenis: 'video'; doc: VideoSeo }
  -  | { jenis: 'penulis'; doc: PenulisSeo }
  +  | { jenis: 'penulis'; doc: PenulisSeo; halaman?: number }
     | { jenis: 'halaman'; doc: HalamanSeo }
     | { jenis: 'beranda' }
     | { jenis: 'statis'; judul: string; path: string; deskripsi?: string | null; noindex?: boolean }
  ```

  ```diff
  diff --git a/src/modules/seo/dokumen.ts b/src/modules/seo/dokumen.ts
  index f8639b3..c530ad6 100644
  --- a/src/modules/seo/dokumen.ts
  +++ b/src/modules/seo/dokumen.ts
  @@ -1,6 +1,6 @@
   import { judulHalaman } from '@/lib/seo-dasar'
   import type { WarnaPilar } from '@/lib/konstanta'
  -import { pathFor } from '@/lib/paths'
  +import { pathFor, pathHalaman } from '@/lib/paths'
   import { urlOg } from '@/modules/media/og'
   import { bangunUrl, UKURAN_OG } from '@/modules/media/url'
   
  @@ -20,7 +20,12 @@ export function urlAbsolut(situs: Pick<PengaturanSitus, 'urlSitus'>, path: strin
     return new URL(path, situs.urlSitus).toString()
   }
   
  -/** Path publik dokumen, selalu lewat `pathFor()`. */
  +/** Nomor halaman daftar berhalaman (rubrik dan profil penulis); 1 untuk halaman lain. */
  +export function nomorHalaman(masukan: MasukanSeo): number {
  +  return 'halaman' in masukan && masukan.halaman && masukan.halaman > 1 ? masukan.halaman : 1
  +}
  +
  +/** Path publik dokumen, selalu lewat `pathFor()`; halaman ke-2 dan seterusnya lewat `pathHalaman()`. */
   export function pathDokumen(masukan: MasukanSeo): string {
     switch (masukan.jenis) {
       case 'beranda':
  @@ -30,13 +35,12 @@ export function pathDokumen(masukan: MasukanSeo): string {
       case 'artikel':
         return pathFor({ jenis: 'artikel', slug: masukan.doc.slug ?? '', tipe: masukan.doc.tipe })
       case 'subkategori':
  -      return pathFor({
  -        jenis: 'subkategori',
  -        slug: masukan.doc.slug ?? '',
  -        pilarSlug: ambil(masukan.doc.pilar)?.slug ?? '',
  -      })
  +      return pathHalaman(
  +        pathFor({ jenis: 'subkategori', slug: masukan.doc.slug ?? '', pilarSlug: ambil(masukan.doc.pilar)?.slug ?? '' }),
  +        nomorHalaman(masukan),
  +      )
       default:
  -      return pathFor({ jenis: masukan.jenis, slug: masukan.doc.slug ?? '' })
  +      return pathHalaman(pathFor({ jenis: masukan.jenis, slug: masukan.doc.slug ?? '' }), nomorHalaman(masukan))
     }
   }
   
  @@ -52,12 +56,15 @@ export function judulDokumen(masukan: MasukanSeo, situs: PengaturanSitus): strin
   
   /**
    * Judul `<title>` yang tampil di Google. Judul SEO dipakai apa adanya (editor mengatur judul lengkap);
  - * judul biasa dibungkus pola judul situs (`%s · point.`). Beranda memakai judul default.
  + * judul biasa dibungkus pola judul situs (`%s · point.`). Beranda memakai judul default. Halaman ke-2 dan
  + * seterusnya sebuah daftar diberi akhiran ", halaman N" supaya setiap halaman punya judul sendiri.
    */
   export function judulSeo(masukan: MasukanSeo, situs: PengaturanSitus): string {
     if (masukan.jenis === 'beranda') return judulDokumen(masukan, situs)
  -  if (masukan.jenis !== 'statis' && masukan.doc.seo?.judulSEO?.trim()) return judulDokumen(masukan, situs)
  -  return judulHalaman(situs.polaJudul, judulDokumen(masukan, situs))
  +  const nomor = nomorHalaman(masukan)
  +  const judul = `${judulDokumen(masukan, situs)}${nomor > 1 ? `, halaman ${nomor}` : ''}`
  +  if (masukan.jenis !== 'statis' && masukan.doc.seo?.judulSEO?.trim()) return judul
  +  return judulHalaman(situs.polaJudul, judul)
   }
   
   function deskripsiCadangan(masukan: MasukanSeo, situs: PengaturanSitus): string | null | undefined {
  ```

  ```diff
  diff --git a/src/modules/seo/metadata.ts b/src/modules/seo/metadata.ts
  index e39da1a..ffd302a 100644
  --- a/src/modules/seo/metadata.ts
  +++ b/src/modules/seo/metadata.ts
  @@ -9,6 +9,7 @@ import {
     gambarOgDokumen,
     judulSeo,
     noindexDokumen,
  +  nomorHalaman,
     pathDokumen,
     urlAbsolut,
   } from './dokumen'
  @@ -17,9 +18,13 @@ import type { MasukanSeo, PengaturanSitus, Situs } from './tipe'
   /** Path RSS, dirujuk dari beranda lewat `<link rel="alternate" type="application/rss+xml">`. */
   export const PATH_FEED = '/feed.xml'
   
  -/** Canonical: isian editor bila ada, selain itu URL absolut dokumen sendiri. */
  +/**
  + * Canonical: isian editor bila ada, selain itu URL absolut dokumen sendiri. Halaman ke-2 dan seterusnya
  + * sebuah daftar selalu menunjuk dirinya sendiri (panduan paginasi Google: jangan jadikan halaman pertama
  + * canonical seluruh urutan), jadi isian editor hanya berlaku untuk halaman 1.
  + */
   export function canonicalDokumen(masukan: MasukanSeo, situs: Pick<PengaturanSitus, 'urlSitus'>): string {
  -  const isian = masukan.jenis === 'beranda' || masukan.jenis === 'statis' ? null : masukan.doc.seo?.canonical?.trim()
  +  const isian = masukan.jenis === 'beranda' || masukan.jenis === 'statis' || nomorHalaman(masukan) > 1 ? null : masukan.doc.seo?.canonical?.trim()
     return isian || urlAbsolut(situs, pathDokumen(masukan))
   }
   
  ```

  ```diff
  diff --git a/src/modules/seo/jsonld.ts b/src/modules/seo/jsonld.ts
  index ecdf490..dbc5d39 100644
  --- a/src/modules/seo/jsonld.ts
  +++ b/src/modules/seo/jsonld.ts
  @@ -2,7 +2,7 @@ import type { ToolId } from '@/lib/konstanta'
   import { pathFor } from '@/lib/paths'
   import { bangunUrl } from '@/modules/media/url'
   
  -import { ambil, deskripsiDokumen, pathDokumen, urlAbsolut } from './dokumen'
  +import { ambil, deskripsiDokumen, nomorHalaman, pathDokumen, urlAbsolut } from './dokumen'
   import { canonicalDokumen } from './metadata'
   import type { ArtikelSeo, MasukanSeo, PenulisSeo, Situs, ToolsSeo, VideoSeo } from './tipe'
   
  @@ -43,9 +43,16 @@ export function durasiIso(detik: number): string {
   
   /**
    * Remah roti dari beranda sampai dokumen. Dipakai untuk schema BreadcrumbList dan untuk tampilan
  - * di halaman (Rencana 4), jadi keduanya selalu sama.
  + * di halaman (Rencana 4), jadi keduanya selalu sama. Halaman ke-2 dan seterusnya sebuah daftar menambah
  + * "Halaman N" setelah daftarnya (halaman 1).
    */
   export function remahRoti(masukan: MasukanSeo): RemahRoti[] {
  +  const nomor = nomorHalaman(masukan)
  +  if (nomor === 1) return remahDokumen(masukan)
  +  return [...remahDokumen({ ...masukan, halaman: 1 } as MasukanSeo), { nama: `Halaman ${nomor}`, path: pathDokumen(masukan) }]
  +}
  +
  +function remahDokumen(masukan: MasukanSeo): RemahRoti[] {
     const beranda: RemahRoti = { nama: 'Beranda', path: '/' }
     switch (masukan.jenis) {
       case 'beranda':
  @@ -255,6 +262,8 @@ export function jsonLd(masukan: MasukanSeo, situs: Situs): JsonLd {
         case 'video':
           return nodeVideo(masukan.doc, masukan, situs)
         case 'penulis': {
  +        // ProfilePage hanya di halaman 1 profil; halaman berikutnya hanya daftar tulisan.
  +        if (nomorHalaman(masukan) > 1) return []
           const url = canonicalDokumen(masukan, situs)
           return [{ '@type': 'ProfilePage', '@id': url, url, inLanguage: BAHASA, mainEntity: orang(masukan.doc, situs) }]
         }
  ```

  ```diff
  diff --git a/src/modules/pantau/tautan.ts b/src/modules/pantau/tautan.ts
  index 152f52b..841ba2f 100644
  --- a/src/modules/pantau/tautan.ts
  +++ b/src/modules/pantau/tautan.ts
  @@ -1,3 +1,4 @@
  +import { pisahHalaman } from '@/modules/konten/paginasi'
   import { tautanIsi, type IsiDokumen } from '@/modules/seo/lexical'
   
   import { hrefDari } from './aturan'
  @@ -128,6 +129,15 @@ export const PESAN_TEMUAN = {
   
   const kunciSumber = (s: Sumber) => `${s.koleksi}:${s.id ?? ''}`
   
  +/**
  + * Halaman bernomor sebuah daftar (`/belajar/halaman/2`) ada bila daftarnya ada. Nomornya tidak diperiksa karena
  + * jumlah halaman berubah setiap ada tulisan baru, dan tautan ke sana bukan tautan masuk (daftar otomatis).
  + */
  +function halamanDaftar(path: string, peta: PetaSitus): boolean {
  +  const hasil = pisahHalaman(path.split('/').filter(Boolean))
  +  return Boolean(hasil?.tertulis && hasil.jalur.length > 0 && peta.path.has(`/${hasil.jalur.join('/')}`))
  +}
  +
   /**
    * Mencocokkan tautan dengan peta situs. Tautan ke dokumen yang belum terbit dan path tanpa halaman
    * adalah `rusak`; path dengan redirect 301 adalah `dialihkan` (tujuannya tetap dihitung sebagai tautan
  @@ -158,6 +168,7 @@ export function nilaiTautan(tautan: Tautan[], peta: PetaSitus, sasaran: Sasaran[
         tandaiMasuk(tujuan.path, sumber)
         continue
       }
  +    if (halamanDaftar(tujuan.path, peta)) continue
       const redirect = peta.redirect.get(tujuan.path)
       if (redirect?.kode === '301' && redirect.ke) {
         catat({ jenis: 'dialihkan', tujuan: tujuan.path, pesan: PESAN_TEMUAN.dialihkan(redirect.ke), sumber })
  ```

- [ ] **Langkah 4: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 512 tes (75 file); integrasi 146 tes (43 file); E2E 136 tes (halaman 1 tidak berubah: judul, canonical, dan remah roti sama dengan sebelumnya).

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/modules/seo/tipe.ts src/modules/seo/dokumen.ts src/modules/seo/metadata.ts src/modules/seo/jsonld.ts src/modules/pantau/tautan.ts tests/unit/seo-paginasi.test.ts
  git commit -m "feat(seo): halaman daftar berhalaman punya judul, canonical, dan remah roti sendiri (canonical isian editor dan ProfilePage hanya di halaman 1), dan pindai tautan menerima tautan ke halaman bernomor daftar yang ada"
  ```

---

### Task 3: Data rubrik dan profil penulis per halaman

**Files:**
- Create: `tests/int/paginasi.int.spec.ts`
- Modify: `src/modules/konten/data.ts`, `src/modules/konten/rubrik.ts`, `src/modules/konten/penulis.ts`, `src/modules/konten/tipe.ts`, `src/modules/konten/index.ts`, `tests/unit/rubrik.test.ts`
- Test: `tests/int/paginasi.int.spec.ts`, `tests/unit/rubrik.test.ts`

**Interfaces:**
- Consumes: `susunPaginasi`, `UKURAN_HALAMAN`, `Paginasi` (Task 1); `MasukanSeo` dengan `halaman` (Task 2); `dataArtikelTerbit`, `siapkanRelasiArtikel`, `getTestPayload`, `unik` (tes integrasi).
- Produces:
  - `ambilRubrik(payload, pilarSlug, subSlug, nomor = 1): Promise<DataRubrik | null>` dan `ambilPenulis(payload, slug, nomor = 1): Promise<DataPenulis | null>`: satu halaman 24 kartu (`halamanKartu`, urutan `-terbitPada` lalu `-id`) beserta jumlah seluruhnya; `null` bila nomor di luar jangkauan.
  - `susunRubrik(pilar, sub, daftarSub, artikel, halaman = { nomor: 1, total: artikel.length })` dan `susunPenulis(doc, artikel, halaman = ...)`: `DataRubrik.paginasi` dan `DataPenulis.paginasi` (`Paginasi`), `DataRubrik.seo.halaman`, intro pilar hanya di halaman 1, `href` selalu alamat halaman 1; `null` bila nomor di luar jangkauan.
  - `MAKS_ARTIKEL_RUBRIK` dan `MAKS_ARTIKEL_PENULIS` dihapus (diganti `UKURAN_HALAMAN`).

Payload `find` dengan `page` dan `limit` mengembalikan `totalDocs` sekaligus, jadi satu query per halaman. Urutan kedua `-id` wajib: dua tulisan dengan tanggal terbit sama (misalnya impor) bisa bertukar tempat di antara dua query, sehingga satu kartu muncul di halaman 1 dan 2 sementara kartu lain hilang. Nomor di luar jangkauan diputuskan `susunPaginasi`, jadi `/belajar/halaman/9` dan `/penulis/redaksi/halaman/9` menjawab 404 lewat jalur yang sama dengan rubrik yang tidak ada. Daftar kosong tetap punya halaman 1 (pesan "Belum ada tulisan").

Rute belum berubah di task ini (`muatRubrik` dan `muatPenulis` tetap memuat halaman 1), jadi E2E sama.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/int/paginasi.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { ambilPenulis, ambilRubrik } from '@/modules/konten/data'
  import { UKURAN_HALAMAN } from '@/modules/konten/paginasi'

  import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
  import { getTestPayload, unik } from './helpers'

  describe('daftar berhalaman: rubrik dan profil penulis', () => {
    it(`${UKURAN_HALAMAN} tulisan per halaman, terbaru dulu, urutan tetap walau tanggal terbit sama, dan nomor di luar jangkauan null`, async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const sub = await payload.create({ collection: 'subkategori', data: { nama: unik('Persiapan ujian'), pilar: relasi.pilar.id } })
      const id: number[] = []
      // 27 tulisan: 26 di subkategori, satu tanpa subkategori. Dua tulisan pertama terbit di detik yang sama.
      for (let i = 0; i < UKURAN_HALAMAN + 3; i++) {
        const terbitPada = new Date(Date.UTC(2026, 0, 1, 0, 0, Math.max(i, 1))).toISOString()
        const doc = await payload.create({
          collection: 'artikel',
          data: { ...dataArtikelTerbit(relasi), terbitPada, ...(i === UKURAN_HALAMAN + 2 ? {} : { subkategori: sub.id }) },
        })
        id.push(doc.id)
      }
      await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium', subkategori: sub.id } })
      // Terbaru dulu; tanggal sama (dua tulisan pertama): ID lebih besar dulu.
      const urut = [...id].reverse()
      const pilarSlug = relasi.pilar.slug as string

      const satu = await ambilRubrik(payload, pilarSlug, null)
      expect(satu?.artikel.map((k) => k.id)).toEqual(urut.slice(0, UKURAN_HALAMAN))
      expect(satu?.paginasi).toMatchObject({ nomor: 1, jumlah: 2, sebelumnya: null, berikutnya: `/${pilarSlug}/halaman/2` })
      expect(satu?.seo).toMatchObject({ jenis: 'pilar', halaman: 1 })

      const dua = await ambilRubrik(payload, pilarSlug, null, 2)
      expect(dua?.artikel.map((k) => k.id)).toEqual(urut.slice(UKURAN_HALAMAN))
      expect(dua?.paginasi).toMatchObject({ nomor: 2, jumlah: 2, sebelumnya: `/${pilarSlug}`, berikutnya: null })
      expect(dua?.href).toBe(`/${pilarSlug}`)
      expect(dua?.seo).toMatchObject({ jenis: 'pilar', halaman: 2 })
      expect(await ambilRubrik(payload, pilarSlug, null, 3)).toBeNull()

      const subDua = await ambilRubrik(payload, pilarSlug, sub.slug as string, 2)
      expect(subDua?.artikel.map((k) => k.id)).toEqual(urut.slice(UKURAN_HALAMAN + 1).filter((n) => n !== id[UKURAN_HALAMAN + 2]))
      expect(subDua?.paginasi.sebelumnya).toBe(`/${pilarSlug}/${sub.slug}`)
      expect(subDua?.seo).toMatchObject({ jenis: 'subkategori', halaman: 2 })

      const penulis = await ambilPenulis(payload, relasi.penulis.slug as string, 2)
      expect(penulis?.artikel.map((k) => k.id)).toEqual(urut.slice(UKURAN_HALAMAN))
      expect(penulis?.paginasi).toMatchObject({ nomor: 2, jumlah: 2, sebelumnya: `/penulis/${relasi.penulis.slug}` })
      expect(await ambilPenulis(payload, relasi.penulis.slug as string, 3)).toBeNull()
    })

    it('daftar kosong tetap punya halaman 1; halaman 2 null', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const pilar = await ambilRubrik(payload, relasi.pilar.slug as string, null)
      expect(pilar?.artikel).toEqual([])
      expect(pilar?.paginasi).toMatchObject({ nomor: 1, jumlah: 1 })
      expect(await ambilRubrik(payload, relasi.pilar.slug as string, null, 2)).toBeNull()
      expect((await ambilPenulis(payload, relasi.penulis.slug as string))?.paginasi.jumlah).toBe(1)
    })
  })
  ```

  ```diff
  diff --git a/tests/unit/rubrik.test.ts b/tests/unit/rubrik.test.ts
  index 175c16b..ba1a051 100644
  --- a/tests/unit/rubrik.test.ts
  +++ b/tests/unit/rubrik.test.ts
  @@ -58,6 +58,15 @@ describe('susunRubrik', () => {
       expect(susunRubrik({ ...pilar, intro: isiLexical([p('  ')]) as Pilar['intro'] }, null, [], [])?.intro).toBeNull()
       expect(susunRubrik({ ...pilar, slug: null }, null, [], [])).toBeNull()
     })
  +
  +  it('halaman berikutnya: intro pilar hanya di halaman 1, paginasi dan nomor halaman SEO, nomor di luar jangkauan null', () => {
  +    const satu = susunRubrik(pilar, null, daftarSub, [kartu], { nomor: 1, total: 30 })
  +    expect(satu?.paginasi).toMatchObject({ nomor: 1, jumlah: 2, berikutnya: '/uang-karier/halaman/2' })
  +    const dua = susunRubrik(pilar, null, daftarSub, [kartu], { nomor: 2, total: 30 })
  +    expect(dua).toMatchObject({ href: '/uang-karier', intro: null, paginasi: { nomor: 2, sebelumnya: '/uang-karier' }, seo: { jenis: 'pilar', halaman: 2 } })
  +    expect(susunRubrik(pilar, pajak, daftarSub, [kartu], { nomor: 2, total: 30 })?.paginasi.sebelumnya).toBe('/uang-karier/pajak')
  +    expect(susunRubrik(pilar, null, daftarSub, [], { nomor: 3, total: 30 })).toBeNull()
  +  })
   })
   
   describe('HalamanRubrik', () => {
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/rubrik.test.ts
  pnpm exec cross-env NODE_OPTIONS=--no-deprecation vitest run --config ./vitest.int.config.mts tests/int/paginasi.int.spec.ts
  ```

  Hasil yang diharapkan: unit FAIL di tes "halaman berikutnya: intro pilar hanya di halaman 1, ..." dengan `AssertionError: expected undefined to match object { nomor: 1, jumlah: 2, …(1) }` (5 tes lain lulus); integrasi FAIL, kedua tes gagal dengan `AssertionError: expected undefined to match object { nomor: 1, jumlah: 2, …(2) }` dan `AssertionError: expected undefined to match object { nomor: 1, jumlah: 1 }`.

- [ ] **Langkah 3: Satu halaman tulisan beserta jumlahnya**

  ```diff
  diff --git a/src/modules/konten/tipe.ts b/src/modules/konten/tipe.ts
  index d9518f9..601386a 100644
  --- a/src/modules/konten/tipe.ts
  +++ b/src/modules/konten/tipe.ts
  @@ -5,6 +5,8 @@ import type { IsiDokumen } from '@/modules/seo/lexical'
   import type { ArtikelSeo, HalamanSeo, PenulisSeo, PilarSeo, SubkategoriSeo, ToolsSeo, VideoSeo } from '@/modules/seo/tipe'
   import type { Video } from '@/payload-types'
   
  +import type { Paginasi } from './paginasi'
  +
   /**
    * Data tampilan yang sudah siap dirender komponen publik. Komponen tidak membaca dokumen Payload
    * mentah: modul ini yang menerjemahkan relasi, path (`pathFor`), dan nilai bawaan.
  @@ -84,7 +86,10 @@ export type KelompokIstilah = { huruf: string; id: string; istilah: Istilah[] }
   /** Tautan navigasi subkategori di halaman rubrik; `aktif` untuk halaman yang sedang dibuka. */
   export type TautanRubrik = Tautan & { aktif: boolean }
   
  -/** Halaman rubrik `/{pilar}` dan `/{pilar}/{subkategori}`. `seo` dipakai `metadata()`, `jsonLd()`, `remahRoti()`. */
  +/**
  + * Halaman rubrik `/{pilar}` dan `/{pilar}/{subkategori}`, atau halaman berikutnya (`/halaman/{n}`). `href`
  + * selalu alamat halaman 1. `seo` dipakai `metadata()`, `jsonLd()`, `remahRoti()`.
  + */
   export type DataRubrik = {
     judul: string
     href: string
  @@ -93,7 +98,8 @@ export type DataRubrik = {
     pilar: PilarRingkas
     subkategori: TautanRubrik[]
     artikel: KartuArtikel[]
  -  seo: { jenis: 'pilar'; doc: PilarSeo } | { jenis: 'subkategori'; doc: SubkategoriSeo }
  +  paginasi: Paginasi
  +  seo: { jenis: 'pilar'; doc: PilarSeo; halaman: number } | { jenis: 'subkategori'; doc: SubkategoriSeo; halaman: number }
   }
   
   export type KartuHalaman = { judul: string; teks: string | null; href: string | null }
  @@ -111,7 +117,8 @@ export type BlokTampil =
   export type DataHalaman = { judul: string; href: string; heroUtama: boolean; blok: BlokTampil[]; seo: HalamanSeo }
   
   /** Profil penulis `/penulis/{slug}` (rambu kredibilitas, spesifikasi §3) dengan tulisan terbitnya. */
  -export type DataPenulis = PenulisRingkas & { tautan: Tautan[]; artikel: KartuArtikel[]; seo: PenulisSeo }
  +/** Profil penulis `/penulis/{slug}` dan halaman tulisan berikutnya (`/halaman/{n}`); `href` alamat halaman 1. */
  +export type DataPenulis = PenulisRingkas & { tautan: Tautan[]; artikel: KartuArtikel[]; paginasi: Paginasi; seo: PenulisSeo }
   
   /** Kartu video vertikal 9:16 untuk indeks `/video` dan "Video lain". `poster`: unggahan editor atau frame video. */
   export type KartuVideo = { id: number; judul: string; href: string; durasi: number | null; pilar: PilarRingkas | null; poster: MediaTampil | null }
  ```

  ```diff
  diff --git a/src/modules/konten/rubrik.ts b/src/modules/konten/rubrik.ts
  index 367b22b..10ed028 100644
  --- a/src/modules/konten/rubrik.ts
  +++ b/src/modules/konten/rubrik.ts
  @@ -4,11 +4,9 @@ import { teksIsi, type IsiDokumen } from '@/modules/seo/lexical'
   import type { PilarSeo, SubkategoriSeo } from '@/modules/seo/tipe'
   
   import { pilarRingkas } from './artikel'
  +import { susunPaginasi } from './paginasi'
   import type { DataRubrik, KartuArtikel } from './tipe'
   
  -/** Jumlah tulisan terbaru di halaman rubrik. Paginasi menyusul bila satu pilar melewati angka ini. */
  -export const MAKS_ARTIKEL_RUBRIK = 24
  -
   type SubkategoriRingkas = Pick<Subkategori, 'id' | 'nama' | 'slug'>
   
   /** Intro rubrik hanya tampil bila ada teksnya (editor bisa menyisakan paragraf kosong). */
  @@ -19,16 +17,21 @@ function introBerisi(intro: IsiDokumen): IsiDokumen {
   /**
    * Data halaman rubrik pilar (`sub` `null`) atau subkategori. Navigasi berisi "Semua" (pilar) lalu
    * semua subkategori pilar itu, dengan halaman yang sedang dibuka ditandai `aktif`. Intro pilar
  - * hanya tampil di halaman pilar. `null` bila pilar belum punya slug.
  + * hanya tampil di halaman 1 pilar. `halaman`: nomor halaman dan jumlah seluruh tulisan rubrik itu.
  + * `null` bila pilar belum punya slug atau nomor halaman di luar jangkauan (404).
    */
   export function susunRubrik(
     pilar: Pilar,
     sub: Subkategori | null,
     daftarSub: SubkategoriRingkas[],
     artikel: KartuArtikel[],
  +  halaman: { nomor: number; total: number } = { nomor: 1, total: artikel.length },
   ): DataRubrik | null {
     const ringkas = pilarRingkas(pilar)
     if (!ringkas) return null
  +  const href = sub?.slug ? pathFor({ jenis: 'subkategori', slug: sub.slug, pilarSlug: ringkas.slug }) : ringkas.href
  +  const paginasi = susunPaginasi(href, halaman.nomor, halaman.total)
  +  if (!paginasi) return null
     const subkategori = daftarSub
       .filter((s) => s.slug)
       .map((s) => ({
  @@ -41,23 +44,25 @@ export function susunRubrik(
       const doc = { ...sub, pilar } as SubkategoriSeo
       return {
         judul: sub.nama,
  -      href: pathFor({ jenis: 'subkategori', slug: sub.slug, pilarSlug: ringkas.slug }),
  +      href,
         deskripsi: sub.deskripsi?.trim() || null,
         intro: null,
         pilar: ringkas,
         subkategori: navigasi,
         artikel,
  -      seo: { jenis: 'subkategori', doc },
  +      paginasi,
  +      seo: { jenis: 'subkategori', doc, halaman: paginasi.nomor },
       }
     }
     return {
       judul: pilar.nama,
  -    href: ringkas.href,
  +    href,
       deskripsi: pilar.deskripsi?.trim() || null,
  -    intro: introBerisi(pilar.intro as IsiDokumen),
  +    intro: paginasi.nomor === 1 ? introBerisi(pilar.intro as IsiDokumen) : null,
       pilar: ringkas,
       subkategori: navigasi,
       artikel,
  -    seo: { jenis: 'pilar', doc: pilar as PilarSeo },
  +    paginasi,
  +    seo: { jenis: 'pilar', doc: pilar as PilarSeo, halaman: paginasi.nomor },
     }
   }
  ```

  ```diff
  diff --git a/src/modules/konten/penulis.ts b/src/modules/konten/penulis.ts
  index 955ac85..70857a4 100644
  --- a/src/modules/konten/penulis.ts
  +++ b/src/modules/konten/penulis.ts
  @@ -2,19 +2,28 @@ import type { Penuli } from '@/payload-types'
   import type { PenulisSeo } from '@/modules/seo/tipe'
   
   import { penulisRingkas } from './artikel'
  +import { susunPaginasi } from './paginasi'
   import type { DataPenulis, KartuArtikel } from './tipe'
   
  -/** Jumlah tulisan terbaru di profil penulis. Paginasi menyusul bila satu penulis melewati angka ini. */
  -export const MAKS_ARTIKEL_PENULIS = 24
  -
  -/** Profil penulis (spesifikasi §3, rambu kredibilitas): data ringkas, tautan profesional, dan tulisannya. */
  -export function susunPenulis(doc: Penuli, artikel: KartuArtikel[]): DataPenulis | null {
  +/**
  + * Profil penulis (spesifikasi §3, rambu kredibilitas): data ringkas, tautan profesional, dan satu halaman
  + * tulisannya. `halaman`: nomor halaman dan jumlah seluruh tulisan penulis itu. `null` bila penulis belum
  + * punya slug atau nomor halaman di luar jangkauan (404).
  + */
  +export function susunPenulis(
  +  doc: Penuli,
  +  artikel: KartuArtikel[],
  +  halaman: { nomor: number; total: number } = { nomor: 1, total: artikel.length },
  +): DataPenulis | null {
     const ringkas = penulisRingkas(doc)
     if (!ringkas) return null
  +  const paginasi = susunPaginasi(ringkas.href, halaman.nomor, halaman.total)
  +  if (!paginasi) return null
     return {
       ...ringkas,
       tautan: (doc.tautan ?? []).filter((t) => t.url?.trim()).map((t) => ({ label: t.label, href: t.url.trim() })),
       artikel,
  +    paginasi,
       seo: doc as PenulisSeo,
     }
   }
  ```

  ```diff
  diff --git a/src/modules/konten/data.ts b/src/modules/konten/data.ts
  index c61f9fb..e9ca000 100644
  --- a/src/modules/konten/data.ts
  +++ b/src/modules/konten/data.ts
  @@ -10,10 +10,11 @@ import { MAKS_TERBARU_BERANDA, MAKS_VIDEO_BERANDA, susunBeranda, susunNewsletter
   import { kataKueri, MAKS_HASIL_CARI, urutkanHasil } from './cari'
   import { kelompokkanIstilah } from './glosarium'
   import { susunHalaman } from './halaman'
  -import { MAKS_ARTIKEL_PENULIS, susunPenulis } from './penulis'
  +import { UKURAN_HALAMAN } from './paginasi'
  +import { susunPenulis } from './penulis'
   import { MAKS_PATH } from './log404'
   import type { RedirectTersimpan } from './redirect'
  -import { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
  +import { susunRubrik } from './rubrik'
   import { susunFooter, susunHeader } from './tampilan'
   import { kelompokkanTools, susunTool } from './tools'
   import { kartuVideo, MAKS_VIDEO_INDEKS, MAKS_VIDEO_LAIN, susunVideo } from './video'
  @@ -166,6 +167,25 @@ async function kartuTerbit(payload: Payload, syarat: Where[], jumlah: number): P
     return docs.map(kartuArtikel).filter((k): k is KartuArtikel => k !== null)
   }
   
  +/**
  + * Satu halaman kartu artikel terbit (bukan glosarium) yang memenuhi `syarat`, terbaru dulu, beserta jumlah
  + * seluruhnya untuk paginasi (`UKURAN_HALAMAN` kartu per halaman). Urutan kedua `-id` membuat urutan tetap
  + * walau tanggal terbitnya sama, jadi tidak ada kartu yang muncul di dua halaman atau terlewat.
  + */
  +async function halamanKartu(payload: Payload, syarat: Where[], nomor: number): Promise<{ kartu: KartuArtikel[]; total: number }> {
  +  const { docs, totalDocs } = await payload.find({
  +    collection: 'artikel',
  +    where: { and: [terbit, { tipe: { not_equals: 'glosarium' } }, ...syarat] },
  +    sort: ['-terbitPada', '-id'],
  +    page: nomor,
  +    limit: UKURAN_HALAMAN,
  +    depth: 1,
  +    select: { judul: true, slug: true, tipe: true, pilar: true, intinya: true },
  +    populate: { pilar: POPULATE_ARTIKEL.pilar },
  +  })
  +  return { kartu: docs.map(kartuArtikel).filter((k): k is KartuArtikel => k !== null), total: totalDocs }
  +}
  +
   /** Artikel terbit terbaru (bukan glosarium) untuk halaman 404. */
   export async function ambilTerbaru(payload: Payload, jumlah: number): Promise<KartuArtikel[]> {
     return kartuTerbit(payload, [], jumlah)
  @@ -200,11 +220,11 @@ export async function ambilPopuler(payload: Payload, jumlah: number): Promise<Ka
   }
   
   /**
  - * Halaman rubrik `/{pilar}` (`subSlug` `null`) atau `/{pilar}/{subkategori}`. `null` bila pilar
  - * tidak ada, atau subkategori tidak ada atau milik pilar lain. Intro pilar dimuat seperti isi
  - * artikel (depth 2) supaya tautan dan gambar di dalamnya bisa dirender.
  + * Halaman rubrik `/{pilar}` (`subSlug` `null`) atau `/{pilar}/{subkategori}`, halaman ke-`nomor`. `null` bila
  + * pilar tidak ada, subkategori tidak ada atau milik pilar lain, atau nomor halaman di luar jangkauan. Intro
  + * pilar dimuat seperti isi artikel (depth 2) supaya tautan dan gambar di dalamnya bisa dirender.
    */
  -export async function ambilRubrik(payload: Payload, pilarSlug: string, subSlug: string | null): Promise<DataRubrik | null> {
  +export async function ambilRubrik(payload: Payload, pilarSlug: string, subSlug: string | null, nomor = 1): Promise<DataRubrik | null> {
     if (validasiFormatSlug(pilarSlug) !== true || (subSlug !== null && validasiFormatSlug(subSlug) !== true)) return null
     const { docs } = await payload.find({
       collection: 'pilar',
  @@ -229,7 +249,8 @@ export async function ambilRubrik(payload: Payload, pilarSlug: string, subSlug:
     const sub = subSlug === null ? null : daftarSub.find((s) => s.slug === subSlug)
     if (sub === undefined) return null
     const syarat: Where[] = [{ pilar: { equals: pilar.id } }, ...(sub ? [{ subkategori: { equals: sub.id } }] : [])]
  -  return susunRubrik(pilar, sub, daftarSub, await kartuTerbit(payload, syarat, MAKS_ARTIKEL_RUBRIK))
  +  const { kartu, total } = await halamanKartu(payload, syarat, nomor)
  +  return susunRubrik(pilar, sub, daftarSub, kartu, { nomor, total })
   }
   
   /** Halaman statis terbit dengan slug ini. Blok dimuat seperti isi artikel (depth 2) untuk tautan, gambar, dan tool. */
  @@ -246,8 +267,11 @@ export async function ambilHalaman(payload: Payload, slug: string): Promise<Data
     return docs[0] ? susunHalaman(docs[0]) : null
   }
   
  -/** Profil penulis dengan tulisan terbitnya (bukan glosarium), terbaru dulu. Penulis tidak punya draf. */
  -export async function ambilPenulis(payload: Payload, slug: string): Promise<DataPenulis | null> {
  +/**
  + * Profil penulis dengan halaman ke-`nomor` tulisan terbitnya (bukan glosarium), terbaru dulu. Penulis tidak
  + * punya draf. `null` bila penulis tidak ada atau nomor halaman di luar jangkauan.
  + */
  +export async function ambilPenulis(payload: Payload, slug: string, nomor = 1): Promise<DataPenulis | null> {
     if (validasiFormatSlug(slug) !== true) return null
     const { docs } = await payload.find({
       collection: 'penulis',
  @@ -259,7 +283,8 @@ export async function ambilPenulis(payload: Payload, slug: string): Promise<Data
     })
     const penulis = docs[0]
     if (!penulis) return null
  -  return susunPenulis(penulis, await kartuTerbit(payload, [{ penulis: { equals: penulis.id } }], MAKS_ARTIKEL_PENULIS))
  +  const { kartu, total } = await halamanKartu(payload, [{ penulis: { equals: penulis.id } }], nomor)
  +  return susunPenulis(penulis, kartu, { nomor, total })
   }
   
   /** Media video ikut membawa durasi file (cadangan bila editor tidak mengisi durasi). */
  ```

  ```diff
  diff --git a/src/modules/konten/index.ts b/src/modules/konten/index.ts
  index 377a367..26417d8 100644
  --- a/src/modules/konten/index.ts
  +++ b/src/modules/konten/index.ts
  @@ -66,9 +66,9 @@ export {
   } from './beranda'
   export { itemTools, kelompokkanTools, parameterTersimpan, susunKalkulator, susunTool } from './tools'
   export { kartuVideo, labelDurasi, MAKS_VIDEO_INDEKS, MAKS_VIDEO_LAIN, pathTakarir, susunVideo } from './video'
  -export { MAKS_ARTIKEL_PENULIS, susunPenulis } from './penulis'
  +export { susunPenulis } from './penulis'
   export { JUDUL_FAQ, susunHalaman } from './halaman'
  -export { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
  +export { susunRubrik } from './rubrik'
   export { bacaNomor, pisahHalaman, susunPaginasi, UKURAN_HALAMAN, type Paginasi, type SegmenBerhalaman, type TautanHalaman } from './paginasi'
   export { muatJalur, type HasilJalur } from './jalur'
   export { tanganiTidakAda } from './navigasi'
  ```

- [ ] **Langkah 4: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 513 tes (75 file); integrasi 148 tes (44 file); E2E 136 tes.

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/modules/konten/data.ts src/modules/konten/index.ts src/modules/konten/penulis.ts src/modules/konten/rubrik.ts src/modules/konten/tipe.ts tests/int/paginasi.int.spec.ts tests/unit/rubrik.test.ts
  git commit -m "feat(konten): rubrik dan profil penulis memuat satu halaman 24 tulisan beserta jumlah seluruhnya (urutan tetap dengan -id), intro pilar hanya di halaman 1, dan nomor halaman di luar jangkauan tidak punya data"
  ```

---

### Task 4: Rute halaman rubrik berikutnya dan navigasi halaman

**Files:**
- Create: `src/components/dasar/Paginasi.tsx`, `src/components/dasar/Paginasi.module.css`, `tests/unit/paginasi-komponen.test.ts`, `tests/e2e/paginasi.spec.ts`
- Modify: `src/modules/konten/jalur.ts`, `src/modules/konten/cache.ts`, `src/app/(frontend)/[...jalur]/page.tsx`, `src/components/rubrik/HalamanRubrik.tsx`, `src/components/dasar/Ikon.tsx`, `tests/e2e/data.ts`, `tests/e2e/siapkan.ts`
- Test: `tests/unit/paginasi-komponen.test.ts`, `tests/e2e/paginasi.spec.ts`

**Interfaces:**
- Consumes: `pisahHalaman`, `susunPaginasi`, `Paginasi` (Task 1); `ambilRubrik(…, nomor)` dan `DataRubrik.paginasi` (Task 3); `Tautan`, `Ikon`, kelas `.sr` (`src/styles/dasar.css`); `cegatCloudinary`, `cegatIklan`, `periksaAxe`, `periksaTanpaGeserHorizontal`, `UKURAN_LAYAR` (E2E).
- Produces:
  - `muatRubrik(pilarSlug, subSlug, nomor: number)` (tag cache sama: `TAG_ARTIKEL`).
  - `HasilJalur` varian `{ jenis: 'alihkan'; ke: string }`; `muatJalur` membaca `/{pilar}/halaman/{n}` dan `/{pilar}/{subkategori}/halaman/{n}` (akhiran hanya untuk rubrik; `/halaman/1` menjadi `alihkan` ke alamat rubrik, dijawab `permanentRedirect` (308) oleh halaman catch-all).
  - Komponen `Paginasi({ paginasi, label = 'Halaman tulisan' })` (server component, `src/components/dasar/Paginasi.tsx`): `nav` bernama, posisi "Halaman N dari M", "Sebelumnya" dan "Berikutnya" (`rel="prev"`/`rel="next"`), nomor dengan teks pembaca layar "Halaman ", `aria-current="page"`, jeda `aria-hidden`; tidak dirender bila satu halaman. Ikon `chevron-left`.
  - `HalamanRubrik`: judul bagian "Tulisan lebih lama" mulai halaman 2, `Paginasi` di dalam bagian tulisan (sebelum slot iklan rubrik).
  - Data E2E `PAGINASI_E2E = { pilar: 'belajar', sub: 'persiapan-ujian', namaSub: 'Persiapan ujian', jumlah: 50 }` di `tests/e2e/data.ts`; `siapkan.ts` membuat subkategori Persiapan ujian dan 50 tulisan bertanggal terbit Januari sampai Februari 2025 sebelum tulisan lain.

Rute tetap catch-all `[...jalur]` (aturan proyek: jenis halaman tingkat atas lewat `muatJalur`, bukan rute bersaudara), dengan `generateStaticParams` yang mengembalikan `[]` sehingga setiap halaman dirender saat pertama diminta lalu disimpan (ISR). `muatRubrik` memakai tag yang sama dengan halaman 1, jadi tulisan yang terbit atau dihapus membuang semua halaman sekaligus dan isinya bergeser.

Navigasi memakai `Tautan` (`next/link`, tetap `<a href>` biasa yang bisa dirayapi; panduan Google: tautkan setiap halaman ke halaman berikutnya dengan `<a href>`). Di layar sempit "Sebelumnya" dan "Berikutnya" berbagi satu baris selebar kontainer dan nomor turun ke baris kedua, jadi urutan fokus sama dengan urutan tampilan di semua lebar; mulai 768 px arah di kiri dan nomor di kanan. Setiap tautan paling kecil 44 x 44 px (`--sentuh-min`), halaman yang dibuka memakai warna tombol (`--tombol`), animasi tekan hanya `transform` (mati di reduced motion lewat aturan global). Slot iklan rubrik tetap setelah bagian tulisan, jadi berada di bawah navigasi halaman dengan labelnya sendiri (kebijakan penempatan AdSense: jangan terlalu dekat tombol navigasi; E2E memastikan slot di bawah navigasi).

Data E2E: 50 tulisan di subkategori Persiapan ujian pilar Belajar (subkategori tiga halaman: 24, 24, 2; pilar Belajar tiga halaman: 24, 24, 3; profil Redaksi point. tiga halaman untuk Task 5). Dibuat sebelum tulisan lain dan bertanggal terbit 2025, sehingga daftar artikel admin halaman pertama (urut `-createdAt`), tulisan terbaru, news sitemap (48 jam), "Paling dicari pekan ini", dan rubrik Uang & Karier yang dibaca spec lain tidak berubah. Spec ini tidak menerbitkan atau membatalkan terbit dokumen, jadi tidak memicu IndexNow.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/paginasi-komponen.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it } from 'vitest'

  import { Paginasi } from '@/components/dasar/Paginasi'
  import { HalamanRubrik } from '@/components/rubrik/HalamanRubrik'
  import { susunPaginasi, UKURAN_HALAMAN } from '@/modules/konten/paginasi'
  import { susunRubrik } from '@/modules/konten/rubrik'
  import type { Pilar } from '@/payload-types'

  import { isiLexical, p, situs } from './seo-contoh'

  const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
  const pilar: Pilar = {
    id: 1,
    nama: 'Belajar',
    slug: 'belajar',
    warna: 'kuning',
    deskripsi: 'Ujian, kuliah, dan beasiswa.',
    intro: isiLexical([p('Persiapan ujian dan kuliah.')]) as Pilar['intro'],
    ...waktu,
  }
  const kartu = {
    id: 10,
    judul: 'Latihan soal penalaran umum',
    href: '/latihan-soal-penalaran-umum',
    tipe: 'panduan' as const,
    pilar: { nama: 'Belajar', slug: 'belajar', href: '/belajar', warna: 'kuning' as const, disclaimer: null },
    intinya: 'Kerjakan satu paket soal setiap hari.',
  }

  describe('Paginasi', () => {
    it('tautan biasa yang bisa ditelusuri: posisi halaman, sebelumnya dan berikutnya, lalu nomor dibacakan "Halaman N" dengan jeda tersembunyi', () => {
      const html = renderToStaticMarkup(h(Paginasi, { paginasi: susunPaginasi('/belajar', 2, 9 * UKURAN_HALAMAN)! }))
      expect(html).toMatch(/^<nav aria-label="Halaman tulisan" class="[^"]*"><p class="[^"]*">Halaman 2 dari 9<\/p><div class="[^"]*"><ul class="[^"]*"><li>/)
      expect(html).toMatch(/<a rel="prev" class="[^"]*" href="\/belajar"><svg[^>]*aria-hidden="true"[^>]*><path d="m15 18-6-6 6-6"><\/path><\/svg>Sebelumnya<\/a><\/li><li><a rel="next" class="[^"]*" href="\/belajar\/halaman\/3">Berikutnya<svg/)
      expect(html).toMatch(/<\/ul><ul class="[^"]*"><li><a class="[^"]*" href="\/belajar"><span class="sr">Halaman <\/span>1<\/a>/)
      expect(html).toMatch(/<a aria-current="page" class="[^"]*" href="\/belajar\/halaman\/2"><span class="sr">Halaman <\/span>2<\/a>/)
      expect(html).toMatch(/<li aria-hidden="true" class="[^"]*">\u2026<\/li><li><a class="[^"]*" href="\/belajar\/halaman\/9">/)
    })

    it('halaman pertama tanpa "Sebelumnya", halaman terakhir tanpa "Berikutnya", satu halaman tanpa navigasi', () => {
      expect(renderToStaticMarkup(h(Paginasi, { paginasi: susunPaginasi('/belajar', 1, 50)! }))).not.toContain('Sebelumnya')
      expect(renderToStaticMarkup(h(Paginasi, { paginasi: susunPaginasi('/belajar', 3, 50)! }))).not.toContain('Berikutnya')
      expect(renderToStaticMarkup(h(Paginasi, { paginasi: susunPaginasi('/belajar', 1, UKURAN_HALAMAN)! }))).toBe('')
    })
  })

  describe('HalamanRubrik berhalaman', () => {
    it('halaman 2: tanpa intro, judul bagian "Tulisan lebih lama", navigasi di dalam bagian tulisan, remah roti "Halaman 2"', () => {
      const rubrik = susunRubrik(pilar, null, [], [kartu], { nomor: 2, total: 50 })!
      const html = renderToStaticMarkup(h(HalamanRubrik, { rubrik, situs }))
      expect(html).not.toContain('Persiapan ujian dan kuliah.')
      expect(html).toMatch(/<h2 id="tulisan-rubrik" class="[^"]*">Tulisan lebih lama<\/h2>/)
      expect(html).toMatch(/<nav aria-label="Halaman tulisan"[\s\S]*<\/nav><\/section>/)
      expect(html).toMatch(/<span aria-current="page" class="[^"]*">Halaman 2<\/span>/)
      expect(html).toContain('"name":"Halaman 2","item":"https://point.lat/belajar/halaman/2"')
    })

    it('halaman 1 dengan satu halaman tulisan: judul bagian "Tulisan terbaru" tanpa navigasi halaman', () => {
      const html = renderToStaticMarkup(h(HalamanRubrik, { rubrik: susunRubrik(pilar, null, [], [kartu])!, situs }))
      expect(html).toMatch(/<h2 id="tulisan-rubrik" class="[^"]*">Tulisan terbaru<\/h2>/)
      expect(html).not.toContain('aria-label="Halaman tulisan"')
    })
  })
  ```

  `tests/e2e/paginasi.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { cegatCloudinary, cegatIklan, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  import { PAGINASI_E2E, UKURAN_LAYAR } from './data'

  test.beforeEach(async ({ page }) => {
    await cegatCloudinary(page)
  })

  const SUB = `/${PAGINASI_E2E.pilar}/${PAGINASI_E2E.sub}`

  /**
   * Tujuan redirect dari header `Location`. Next 16.3.3 mengirim header ini dua kali (nilainya sama) pada render
   * ISR pertama sebuah redirect; respons dari cache berikutnya hanya sekali.
   */
  const tujuan = (lokasi: string | undefined) => [...new Set((lokasi ?? '').split(', '))]

  test('rubrik subkategori tiga halaman: navigasi halaman, judul, canonical, remah roti, dan setiap tulisan tampil sekali', async ({ page }) => {
    const dilihat: string[] = []
    // Kartu saja: navigasi halaman juga ada di dalam bagian tulisan.
    const kartu = page.getByRole('region', { name: /^Tulisan (terbaru|lebih lama)$/ }).locator('ul').first().getByRole('link')
    const nav = page.getByRole('navigation', { name: 'Halaman tulisan' })

    await page.goto(SUB)
    await expect(page).toHaveTitle(`${PAGINASI_E2E.namaSub} · point.`)
    await expect(page.getByRole('heading', { level: 2, name: 'Tulisan terbaru' })).toBeVisible()
    await expect(kartu).toHaveCount(24)
    dilihat.push(...(await kartu.evaluateAll((a) => a.map((el) => el.getAttribute('href') ?? ''))))
    await expect(nav).toContainText('Halaman 1 dari 3')
    await expect(nav.getByRole('link', { name: 'Halaman 1', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Sebelumnya' })).toHaveCount(0)

    await nav.getByRole('link', { name: 'Berikutnya' }).click()
    await expect(page).toHaveURL(`${SUB}/halaman/2`)
    await expect(page).toHaveTitle(`${PAGINASI_E2E.namaSub}, halaman 2 · point.`)
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://point.lat${SUB}/halaman/2`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(PAGINASI_E2E.namaSub)
    await expect(page.getByRole('heading', { level: 2, name: 'Tulisan lebih lama' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Remah roti' }).getByRole('listitem').last()).toHaveText('Halaman 2')
    await expect(nav.getByRole('link', { name: 'Halaman 2', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Sebelumnya' })).toHaveAttribute('href', SUB)
    await expect(kartu).toHaveCount(24)
    dilihat.push(...(await kartu.evaluateAll((a) => a.map((el) => el.getAttribute('href') ?? ''))))

    await nav.getByRole('link', { name: 'Halaman 3', exact: true }).click()
    await expect(page).toHaveURL(`${SUB}/halaman/3`)
    await expect(nav).toContainText('Halaman 3 dari 3')
    await expect(nav.getByRole('link', { name: 'Berikutnya' })).toHaveCount(0)
    await expect(kartu).toHaveCount(2)
    dilihat.push(...(await kartu.evaluateAll((a) => a.map((el) => el.getAttribute('href') ?? ''))))
    expect(new Set(dilihat).size).toBe(PAGINASI_E2E.jumlah)
    // Tulisan tertua (terbit paling awal) ada di halaman terakhir.
    expect(dilihat.at(-1)).toBe('/latihan-soal-penalaran-umum-01')
  })

  test('halaman 1 dialihkan permanen ke alamat rubrik; nomor di luar jangkauan atau tidak sah menjawab 404; sitemap hanya halaman 1', async ({ request }) => {
    for (const [dari, ke] of [
      [`/${PAGINASI_E2E.pilar}/halaman/1`, `/${PAGINASI_E2E.pilar}`],
      [`${SUB}/halaman/1`, SUB],
    ]) {
      const jawaban = await request.get(dari, { maxRedirects: 0 })
      expect(jawaban.status(), dari).toBe(308)
      expect(tujuan(jawaban.headers()['location'])).toEqual([ke])
    }
    expect((await request.get(`/${PAGINASI_E2E.pilar}/halaman/3`)).status()).toBe(200)
    for (const path of [`/${PAGINASI_E2E.pilar}/halaman/4`, `${SUB}/halaman/4`, `${SUB}/halaman/02`, `${SUB}/halaman/0`, '/uang-karier/halaman/2', `/${PAGINASI_E2E.pilar}/halaman`, '/halaman/2']) {
      expect((await request.get(path)).status(), path).toBe(404)
    }
    const sitemap = await (await request.get('/sitemap/pilar.xml')).text()
    expect(sitemap).toContain(`<loc>https://point.lat/${PAGINASI_E2E.pilar}</loc>`)
    expect(sitemap).not.toContain('/halaman/')
  })

  for (const { lebar, tinggi } of UKURAN_LAYAR) {
    test(`rubrik berhalaman ${lebar}px: halaman pertama, tengah, dan terakhir tanpa geser horizontal dan lolos axe, tautan setinggi target sentuh`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: tinggi })
      for (const path of [SUB, `${SUB}/halaman/2`, `/${PAGINASI_E2E.pilar}/halaman/3`]) {
        await page.goto(path)
        const tautan = page.getByRole('navigation', { name: 'Halaman tulisan' }).getByRole('link')
        await expect(tautan.first()).toBeVisible()
        for (const kotak of await tautan.evaluateAll((a) => a.map((el) => el.getBoundingClientRect().toJSON() as DOMRect))) {
          expect(kotak.height, path).toBeGreaterThanOrEqual(44)
          expect(kotak.width, path).toBeGreaterThanOrEqual(44)
        }
        await periksaTanpaGeserHorizontal(page)
        await periksaAxe(page)
      }
    })
  }

  test('rubrik halaman tengah dengan iklan terisi di 375 px: slot setelah navigasi halaman, lolos axe, tanpa geser horizontal', async ({ page }) => {
    await page.context().addCookies([{ name: 'persetujuan', value: `1.semua.${new Date().toISOString().slice(0, 10)}`, domain: 'localhost', path: '/' }])
    await cegatIklan(page)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(`${SUB}/halaman/2`)
    const slot = page.locator('[data-slot-iklan="rubrik"]')
    await slot.scrollIntoViewIfNeeded()
    await expect(slot.locator('ins[data-ad-status="filled"]')).toBeAttached()
    const nav = (await page.getByRole('navigation', { name: 'Halaman tulisan' }).boundingBox())!
    expect((await slot.boundingBox())!.y).toBeGreaterThan(nav.y + nav.height)
    await periksaTanpaGeserHorizontal(page)
    await periksaAxe(page)
  })
  ```

  ```diff
  diff --git a/tests/e2e/data.ts b/tests/e2e/data.ts
  index b3ff229..cca41db 100644
  --- a/tests/e2e/data.ts
  +++ b/tests/e2e/data.ts
  @@ -32,6 +32,13 @@ export const TOOLS_CONTOH = [
   /** Subkategori contoh di bawah pilar Uang & Karier. */
   export const SLUG_SUB = { pajak: 'pajak' } as const
   
  +/**
  + * Tulisan lama untuk paginasi (Rencana 8B): 50 tulisan di subkategori Persiapan ujian pilar Belajar, bertanggal
  + * terbit 2025, jadi rubrik subkategori itu tiga halaman (24, 24, 2), pilar Belajar tiga halaman (24, 24, 3), dan
  + * profil Redaksi point. tiga halaman.
  + */
  +export const PAGINASI_E2E = { pilar: 'belajar', sub: 'persiapan-ujian', namaSub: 'Persiapan ujian', jumlah: 50 } as const
  +
   /** Halaman statis dari seed yang diterbitkan `siapkan.ts`; halaman seed lain tetap draf. */
   export const SLUG_HALAMAN = { tentang: 'tentang', kebijakanRedaksi: 'kebijakan-redaksi', kebijakanPrivasi: 'kebijakan-privasi', draf: 'pasang-iklan' } as const
   
  ```

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index 3d77d0d..8d5abea 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -19,6 +19,7 @@ import {
     KLIK_CONTOH,
     KUNCI_INDEXNOW,
     p,
  +  PAGINASI_E2E,
     PENERBIT_E2E,
     SLUG,
     SLUG_HALAMAN,
  @@ -93,6 +94,31 @@ await payload.update({
   
   const dasar = { _status: 'published' as const, penulis: redaksi.id, gambarUtama: slip.id }
   
  +// Tulisan lama untuk paginasi, dibuat sebelum tulisan lain dan bertanggal terbit 2025: daftar artikel admin halaman
  +// pertama, tulisan terbaru, news sitemap, dan rubrik Uang & Karier tetap sama seperti sebelum Rencana 8B.
  +const persiapan = await payload.create({
  +  collection: 'subkategori',
  +  data: { nama: PAGINASI_E2E.namaSub, slug: PAGINASI_E2E.sub, pilar: pilar[PAGINASI_E2E.pilar], deskripsi: 'Latihan soal dan strategi ujian masuk kuliah.' },
  +})
  +for (let i = 1; i <= PAGINASI_E2E.jumlah; i++) {
  +  const nomor = String(i).padStart(2, '0')
  +  await payload.create({
  +    collection: 'artikel',
  +    data: {
  +      ...dasar,
  +      judul: `Latihan soal penalaran umum ${nomor}`,
  +      slug: `latihan-soal-penalaran-umum-${nomor}`,
  +      tipe: 'panduan',
  +      pilar: pilar[PAGINASI_E2E.pilar],
  +      subkategori: persiapan.id,
  +      terbitPada: new Date(Date.UTC(2025, 0, i)).toISOString(),
  +      deck: `Paket latihan ke-${i}: sepuluh soal penalaran umum beserta pembahasannya.`,
  +      intinya: [{ poin: 'Kerjakan dalam 15 menit tanpa kalkulator.' }, { poin: 'Cocokkan jawaban dengan pembahasan di akhir.' }],
  +      isi: isi(p('Baca setiap soal sampai selesai sebelum memilih jawaban.')),
  +    },
  +  })
  +}
  +
   // Video vertikal: file MP4 kecil lewat klien palsu (1080x1920, 30 detik). Tanpa poster unggahan,
   // kartu memakai frame video dari Cloudinary.
   async function buatVideo({
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/paginasi-komponen.test.ts
  ```

  Hasil yang diharapkan: FAIL `tests/unit/paginasi-komponen.test.ts` dengan `Error: Cannot find package '@/components/dasar/Paginasi' imported from '.../tests/unit/paginasi-komponen.test.ts'` (Tests: no tests).

- [ ] **Langkah 3: Komponen Paginasi**

  ```diff
  diff --git a/src/components/dasar/Ikon.tsx b/src/components/dasar/Ikon.tsx
  index 88e6fe0..98bfc5b 100644
  --- a/src/components/dasar/Ikon.tsx
  +++ b/src/components/dasar/Ikon.tsx
  @@ -3,7 +3,7 @@ import type { ReactNode } from 'react'
   /*
    * Ikon stroke dari Lucide 1.68.0 (https://lucide.dev), disalin sebagai path supaya tanpa dependensi
    * dan tanpa JavaScript klien. Lisensi: ISC, Copyright (c) 2026 Lucide Icons and Contributors;
  - * arrow-right, arrow-up-right, calendar, chevron-down, chevron-right, clock, info, plus, dan x berasal dari Feather
  + * arrow-right, arrow-up-right, calendar, chevron-down, chevron-left, chevron-right, clock, info, plus, dan x berasal dari Feather
    * (MIT, Copyright (c) 2013-present Cole Bemis). Teks lisensi lengkap: paket `lucide-static`.
    */
   const PATH = {
  @@ -42,6 +42,7 @@ const PATH = {
       </>
     ),
     'chevron-down': <path d="m6 9 6 6 6-6" />,
  +  'chevron-left': <path d="m15 18-6-6 6-6" />,
     'chevron-right': <path d="m9 18 6-6-6-6" />,
     clock: (
       <>
  ```

  `src/components/dasar/Paginasi.tsx`

  ```tsx
  import type { Paginasi as DataPaginasi } from '@/modules/konten/paginasi'

  import { Ikon } from './Ikon'
  import gaya from './Paginasi.module.css'
  import { Tautan } from './Tautan'

  /**
   * Navigasi halaman daftar tulisan (rubrik dan profil penulis): posisi halaman, "Sebelumnya" dan
   * "Berikutnya", lalu nomor halaman, dalam urutan yang sama di semua lebar layar (di layar sempit nomor turun
   * ke baris kedua). Semua tautan `<a href>` biasa supaya mesin pencari bisa menelusuri setiap halaman
   * (panduan paginasi Google); halaman yang sedang dibuka ditandai `aria-current`, nomor dibacakan
   * "Halaman 2", dan setiap tautan setinggi target sentuh 44 px. Tidak dirender bila daftar hanya satu halaman.
   */
  export function Paginasi({ paginasi, label = 'Halaman tulisan' }: { paginasi: DataPaginasi; label?: string }) {
    if (paginasi.jumlah < 2) return null
    return (
      <nav aria-label={label} className={gaya.paginasi}>
        <p className={gaya.posisi}>
          Halaman {paginasi.nomor} dari {paginasi.jumlah}
        </p>
        <div className={gaya.baris}>
          <ul className={gaya.arah}>
            {paginasi.sebelumnya && (
              <li>
                <Tautan href={paginasi.sebelumnya} rel="prev" className={gaya.tombol}>
                  <Ikon nama="chevron-left" ukuran={18} />
                  Sebelumnya
                </Tautan>
              </li>
            )}
            {paginasi.berikutnya && (
              <li>
                <Tautan href={paginasi.berikutnya} rel="next" className={gaya.tombol}>
                  Berikutnya
                  <Ikon nama="chevron-right" ukuran={18} />
                </Tautan>
              </li>
            )}
          </ul>
          <ul className={gaya.nomor}>
            {paginasi.halaman.map((h, i) =>
              h ? (
                <li key={h.nomor}>
                  <Tautan href={h.href} aria-current={h.aktif ? 'page' : undefined} className={gaya.tombol}>
                    <span className="sr">Halaman </span>
                    {h.nomor}
                  </Tautan>
                </li>
              ) : (
                <li key={`jeda-${i}`} aria-hidden="true" className={gaya.jeda}>
                  {'\u2026'}
                </li>
              ),
            )}
          </ul>
        </div>
      </nav>
    )
  }
  ```

  `src/components/dasar/Paginasi.module.css`

  ```css
  /*
   * Navigasi halaman daftar tulisan. Layar sempit: "Sebelumnya" dan "Berikutnya" berbagi satu baris selebar
   * kontainer, nomor halaman di baris berikutnya. Mulai 768 px: arah di kiri, nomor di kanan, satu baris.
   */
  .paginasi {
    display: grid;
    gap: var(--ruang-3);
  }

  .posisi {
    color: var(--teks-sekunder);
    font-size: var(--teks-kecil);
  }

  .baris {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: var(--ruang-3) var(--ruang-4);
  }

  .arah,
  .nomor {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ruang-2);
    padding: 0;
    list-style: none;
  }

  .arah {
    flex: 1 1 100%;
  }

  .arah li {
    flex: 1 1 0;
  }

  .arah .tombol {
    width: 100%;
    gap: var(--ruang-1);
    padding: 0 var(--ruang-4);
  }

  .tombol {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: var(--sentuh-min);
    min-height: var(--sentuh-min);
    padding: 0 var(--ruang-3);
    border: var(--garis-tipis) solid var(--garis);
    border-radius: var(--radius-pil);
    font-size: var(--teks-kecil);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    text-decoration: none;
    transition: transform var(--durasi-cepat) var(--kurva);
  }

  .tombol:hover {
    text-decoration: underline;
  }

  .tombol:active {
    transform: scale(0.97);
  }

  .tombol[aria-current='page'] {
    background: var(--tombol);
    color: var(--tombol-teks);
  }

  .jeda {
    min-width: var(--ruang-6);
    color: var(--teks-sekunder);
    text-align: center;
  }

  @media (min-width: 48rem) {
    .arah,
    .arah li {
      flex: none;
    }
  }
  ```

  ```diff
  diff --git a/src/components/rubrik/HalamanRubrik.tsx b/src/components/rubrik/HalamanRubrik.tsx
  index 6a5413f..69c793d 100644
  --- a/src/components/rubrik/HalamanRubrik.tsx
  +++ b/src/components/rubrik/HalamanRubrik.tsx
  @@ -1,4 +1,5 @@
   import { JsonLd } from '@/components/dasar/JsonLd'
  +import { Paginasi } from '@/components/dasar/Paginasi'
   import { RemahRoti } from '@/components/dasar/RemahRoti'
   import { Tautan } from '@/components/dasar/Tautan'
   import { SlotIklan } from '@/components/iklan/SlotIklan'
  @@ -14,8 +15,9 @@ import gaya from './Rubrik.module.css'
   
   /**
    * Halaman rubrik `/{pilar}` dan `/{pilar}/{subkategori}`: kepala berwarna pilar (nama selalu
  - * tertulis), navigasi subkategori, intro pilar dari CMS, lalu kartu tulisan terbaru. Slot iklan rubrik
  - * (spesifikasi §11) setelah daftar tulisan, jauh dari navigasi subkategori.
  + * tertulis), navigasi subkategori, intro pilar dari CMS, lalu kartu tulisan terbaru dan navigasi halaman
  + * tulisan (`/halaman/{n}`, judul bagian "Tulisan lebih lama" mulai halaman 2). Slot iklan rubrik
  + * (spesifikasi §11) setelah daftar tulisan dan navigasinya, jauh dari navigasi subkategori.
    */
   export function HalamanRubrik({ rubrik, situs, iklan = null }: { rubrik: DataRubrik; situs: Situs; iklan?: PengaturanIklan | null }) {
     const subkategori = rubrik.seo.jenis === 'subkategori'
  @@ -44,13 +46,14 @@ export function HalamanRubrik({ rubrik, situs, iklan = null }: { rubrik: DataRub
         {rubrik.intro && <IsiArtikel isi={rubrik.intro} cloudName={situs.cloudName} />}
         <section aria-labelledby="tulisan-rubrik" className={gaya.tulisan}>
           <h2 id="tulisan-rubrik" className={gaya.subjudul}>
  -          Tulisan terbaru
  +          {rubrik.paginasi.nomor > 1 ? 'Tulisan lebih lama' : 'Tulisan terbaru'}
           </h2>
           {rubrik.artikel.length > 0 ? (
             <DaftarKartu kartu={rubrik.artikel} />
           ) : (
             <p className={gaya.kosong}>Belum ada tulisan di rubrik ini. Tulisan baru tampil di sini setelah terbit.</p>
           )}
  +        <Paginasi paginasi={rubrik.paginasi} />
         </section>
         <SlotIklan slot={pilihSlot(iklan, 'rubrik')} />
       </div>
  ```

- [ ] **Langkah 4: Rute `/halaman/{n}` lewat `muatJalur`**

  ```diff
  diff --git a/src/modules/konten/cache.ts b/src/modules/konten/cache.ts
  index 4f43380..3e87af7 100644
  --- a/src/modules/konten/cache.ts
  +++ b/src/modules/konten/cache.ts
  @@ -101,11 +101,12 @@ export const muatPopuler = unstable_cache(async (jumlah: number) => ambilPopuler
   })
   
   /**
  - * Halaman rubrik pilar dan subkategori. Intro pilar bisa menautkan dokumen apa pun, jadi tagnya sama
  - * dengan halaman artikel.
  + * Halaman rubrik pilar dan subkategori, halaman ke-`nomor` tulisannya. Intro pilar bisa menautkan dokumen
  + * apa pun, jadi tagnya sama dengan halaman artikel; tag `artikel` juga menggeser semua halaman tulisan
  + * saat ada tulisan terbit atau dihapus.
    */
   export const muatRubrik = unstable_cache(
  -  async (pilarSlug: string, subSlug: string | null) => ambilRubrik(await payload(), pilarSlug, subSlug),
  +  async (pilarSlug: string, subSlug: string | null, nomor: number) => ambilRubrik(await payload(), pilarSlug, subSlug, nomor),
     ['konten', 'rubrik'],
     { tags: TAG_ARTIKEL, revalidate: SEJAM },
   )
  ```

  ```diff
  diff --git a/src/modules/konten/jalur.ts b/src/modules/konten/jalur.ts
  index 459ce54..48161a7 100644
  --- a/src/modules/konten/jalur.ts
  +++ b/src/modules/konten/jalur.ts
  @@ -1,29 +1,42 @@
   import { muatArtikel, muatHalaman, muatRubrik } from './cache'
  +import { pisahHalaman } from './paginasi'
   import type { DataArtikel, DataHalaman, DataRubrik } from './tipe'
   
  -/** Dokumen di balik path rute catch-all `[...jalur]`. */
  +/** Dokumen di balik path rute catch-all `[...jalur]`, atau alamat tujuan untuk `/halaman/1` (308). */
   export type HasilJalur =
     | { jenis: 'artikel'; artikel: DataArtikel }
     | { jenis: 'rubrik'; rubrik: DataRubrik }
     | { jenis: 'halaman'; halaman: DataHalaman }
  +  | { jenis: 'alihkan'; ke: string }
   
   /**
    * Mencari dokumen untuk path tingkat atas. Satu segmen: artikel (bukan glosarium), pilar, lalu
    * halaman statis. Dua segmen: subkategori di bawah pilarnya. Slug artikel, pilar, dan halaman unik
    * lintas koleksi (validasi CMS), jadi urutan hanya menentukan query mana yang dijalankan dulu: yang
  - * paling sering diminta lebih dulu. `null` berarti redirect atau 404.
  + * paling sering diminta lebih dulu. Akhiran `/halaman/{n}` hanya untuk rubrik: halaman ke-n tulisannya,
  + * `/halaman/1` dialihkan ke alamat rubrik, nomor tidak sah atau di luar jangkauan 404. `null` berarti
  + * redirect atau 404.
    */
  -export async function muatJalur(jalur: string[]): Promise<HasilJalur | null> {
  +export async function muatJalur(segmen: string[]): Promise<HasilJalur | null> {
  +  const halaman = pisahHalaman(segmen)
  +  if (!halaman) return null
  +  const { jalur, nomor, tertulis } = halaman
  +  if (tertulis) {
  +    if (jalur.length !== 1 && jalur.length !== 2) return null
  +    const rubrik = await muatRubrik(jalur[0], jalur[1] ?? null, nomor)
  +    if (!rubrik) return null
  +    return nomor === 1 ? { jenis: 'alihkan', ke: rubrik.href } : { jenis: 'rubrik', rubrik }
  +  }
     if (jalur.length === 1) {
       const artikel = await muatArtikel(jalur[0], false)
       if (artikel) return { jenis: 'artikel', artikel }
  -    const rubrik = await muatRubrik(jalur[0], null)
  +    const rubrik = await muatRubrik(jalur[0], null, 1)
       if (rubrik) return { jenis: 'rubrik', rubrik }
       const halaman = await muatHalaman(jalur[0])
       return halaman ? { jenis: 'halaman', halaman } : null
     }
     if (jalur.length === 2) {
  -    const rubrik = await muatRubrik(jalur[0], jalur[1])
  +    const rubrik = await muatRubrik(jalur[0], jalur[1], 1)
       return rubrik ? { jenis: 'rubrik', rubrik } : null
     }
     return null
  ```

  ```diff
  diff --git a/src/app/(frontend)/[...jalur]/page.tsx b/src/app/(frontend)/[...jalur]/page.tsx
  index 3a72b9a..812be3f 100644
  --- a/src/app/(frontend)/[...jalur]/page.tsx
  +++ b/src/app/(frontend)/[...jalur]/page.tsx
  @@ -1,4 +1,5 @@
   import type { Metadata } from 'next'
  +import { permanentRedirect } from 'next/navigation'
   import { cache } from 'react'
   
   import { HalamanArtikel } from '@/components/artikel/HalamanArtikel'
  @@ -12,8 +13,9 @@ type Props = { params: Promise<{ jalur: string[] }> }
   
   /**
    * Semua path publik yang tidak ditangani rute yang lebih spesifik: artikel `/{slug}`, rubrik
  - * `/{pilar}` dan `/{pilar}/{subkategori}`, halaman statis `/{slug}`. Halaman dirender saat pertama diminta lalu disimpan
  - * (ISR); tag cache data membuangnya saat konten berubah. Path tanpa dokumen diteruskan ke
  + * `/{pilar}` dan `/{pilar}/{subkategori}` beserta halaman tulisan berikutnya (`/halaman/{n}`), halaman statis
  + * `/{slug}`. Halaman dirender saat pertama diminta lalu disimpan (ISR); tag cache data membuangnya saat
  + * konten berubah. `/halaman/1` dialihkan permanen ke alamat rubrik. Path tanpa dokumen diteruskan ke
    * `tanganiTidakAda` (redirect dari CMS atau 404), hasilnya juga disimpan.
    */
   export function generateStaticParams() {
  @@ -52,6 +54,8 @@ export default async function Halaman({ params }: Props) {
         return <HalamanRubrik rubrik={hasil.rubrik} situs={await muatSitus()} iklan={await muatIklan()} />
       case 'halaman':
         return <HalamanStatis halaman={hasil.halaman} situs={await muatSitus()} />
  +    case 'alihkan':
  +      return permanentRedirect(hasil.ke)
       default:
         return tanganiTidakAda(pathDariSegmen(jalur))
     }
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

  Hasil yang diharapkan: bersih; unit 517 tes (76 file); integrasi 148 tes (44 file); E2E 142 tes (enam tes baru di `paginasi.spec.ts`; spec lain yang membaca daftar artikel admin, rubrik Uang & Karier, dan profil Redaksi point. halaman 1 tetap lulus).

- [ ] **Langkah 6: Commit**

  ```bash
  git add "src/app/(frontend)/[...jalur]/page.tsx" src/components/dasar/Ikon.tsx src/components/dasar/Paginasi.tsx src/components/dasar/Paginasi.module.css src/components/rubrik/HalamanRubrik.tsx src/modules/konten/cache.ts src/modules/konten/jalur.ts tests/e2e/data.ts tests/e2e/siapkan.ts tests/e2e/paginasi.spec.ts tests/unit/paginasi-komponen.test.ts
  git commit -m "feat(rubrik): halaman tulisan berikutnya di /{pilar}/halaman/{n} dan /{pilar}/{subkategori}/halaman/{n} lewat rute catch-all (ISR, tag cache sama), /halaman/1 dialihkan 308, navigasi halaman yang bisa ditelusuri dengan aria-current dan target sentuh 44 px"
  ```

---

### Task 5: Halaman tulisan berikutnya di profil penulis

**Files:**
- Create: `src/app/(frontend)/penulis/[slug]/halaman/[nomor]/page.tsx`
- Modify: `src/app/(frontend)/penulis/[slug]/page.tsx`, `src/components/penulis/HalamanPenulis.tsx`, `src/modules/konten/cache.ts`, `tests/unit/penulis.test.ts`, `tests/e2e/paginasi.spec.ts`
- Test: `tests/unit/penulis.test.ts`, `tests/e2e/paginasi.spec.ts`

**Interfaces:**
- Consumes: `bacaNomor`, `SEGMEN_HALAMAN` (Task 1); `MasukanSeo` penulis dengan `halaman` (Task 2); `ambilPenulis(…, nomor)` dan `DataPenulis.paginasi` (Task 3); `Paginasi` (Task 4); `pathDariSegmen`, `tanganiTidakAda`, `muatSitus`.
- Produces: `muatPenulis(slug, nomor: number)`; rute `/penulis/{slug}/halaman/{n}` (ISR, `generateStaticParams` `[]`, `/halaman/1` dialihkan 308 ke profil, nomor tidak sah atau di luar jangkauan lewat `tanganiTidakAda`); `HalamanPenulis` dengan bio, keahlian, dan tautan profesional hanya di halaman 1 dan `Paginasi` di bagian tulisan.

Profil penulis bukan bagian rute catch-all, jadi halaman berikutnya di rute bersarang `penulis/[slug]/halaman/[nomor]` yang memakai komponen yang sama. Semua tulisan MVP ditulis Redaksi point., jadi daftar inilah yang paling dulu melewati 24 tulisan. Halaman berikutnya hanya menampilkan foto, nama, dan daftar tulisan (rambu kredibilitas lengkap di halaman 1); JSON-LD ProfilePage hanya di halaman 1 (Task 2).

- [ ] **Langkah 1: Tulis tes yang gagal**

  ```diff
  diff --git a/tests/unit/penulis.test.ts b/tests/unit/penulis.test.ts
  index 640aa69..9fcbe82 100644
  --- a/tests/unit/penulis.test.ts
  +++ b/tests/unit/penulis.test.ts
  @@ -61,6 +61,20 @@ describe('HalamanPenulis', () => {
       expect(html).toContain('"@type":"ProfilePage"')
     })
   
  +  it('halaman 2: foto dan nama saja (tanpa bio, keahlian, tautan, dan ProfilePage), navigasi halaman, remah roti "Halaman 2"', () => {
  +    const penulis = susunPenulis(rani, [kartu], { nomor: 2, total: 30 })!
  +    const html = renderToStaticMarkup(h(HalamanPenulis, { penulis, situs }))
  +    expect(html).toMatch(/<h1 class="[^"]*">Rani Wulandari<\/h1>/)
  +    expect(html).toContain('<img')
  +    expect(html).not.toContain('Menulis soal pajak dan gaji.')
  +    expect(html).not.toContain('aria-label="Keahlian"')
  +    expect(html).not.toContain('rel="me noopener"')
  +    expect(html).not.toContain('"@type":"ProfilePage"')
  +    expect(html).toMatch(/<nav aria-label="Halaman tulisan"[\s\S]*<\/nav><\/section>/)
  +    expect(html).toMatch(/<span aria-current="page" class="[^"]*">Halaman 2<\/span>/)
  +    expect(susunPenulis(rani, [], { nomor: 3, total: 30 })).toBeNull()
  +  })
  +
     it('penulis tanpa tulisan terbit', () => {
       const html = renderToStaticMarkup(h(HalamanPenulis, { penulis: susunPenulis({ ...rani, foto: null, tautan: [] }, [])!, situs }))
       expect(html).toContain('Belum ada tulisan yang terbit. Tulisan baru tampil di sini setelah terbit.')
  ```

  ```diff
  diff --git a/tests/e2e/paginasi.spec.ts b/tests/e2e/paginasi.spec.ts
  index ff6e25d..d9883b4 100644
  --- a/tests/e2e/paginasi.spec.ts
  +++ b/tests/e2e/paginasi.spec.ts
  @@ -88,6 +88,41 @@ for (const { lebar, tinggi } of UKURAN_LAYAR) {
     })
   }
   
  +test('profil penulis berhalaman: profil lengkap di halaman 1, halaman berikutnya hanya daftar tulisan; /halaman/1 dialihkan, di luar jangkauan 404', async ({ page, request }) => {
  +  await page.goto('/penulis/redaksi')
  +  const nav = page.getByRole('navigation', { name: 'Halaman tulisan' })
  +  await expect(nav).toContainText('Halaman 1 dari 3')
  +  await expect(page.getByRole('list', { name: 'Keahlian' })).toBeVisible()
  +  await nav.getByRole('link', { name: 'Berikutnya' }).click()
  +  await expect(page).toHaveURL('/penulis/redaksi/halaman/2')
  +  await expect(page).toHaveTitle('Redaksi point., halaman 2 · point.')
  +  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://point.lat/penulis/redaksi/halaman/2')
  +  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Redaksi point.')
  +  await expect(page.getByRole('list', { name: 'Keahlian' })).toHaveCount(0)
  +  await expect(nav.getByRole('link', { name: 'Halaman 2', exact: true })).toHaveAttribute('aria-current', 'page')
  +  await expect(page.getByRole('region', { name: 'Tulisan Redaksi point.' }).locator('ul').first().getByRole('link')).toHaveCount(24)
  +  expect(await page.locator('script[type="application/ld+json"]').textContent()).not.toContain('ProfilePage')
  +
  +  const jawaban = await request.get('/penulis/redaksi/halaman/1', { maxRedirects: 0 })
  +  expect(jawaban.status()).toBe(308)
  +  expect(tujuan(jawaban.headers()['location'])).toEqual(['/penulis/redaksi'])
  +  for (const path of ['/penulis/redaksi/halaman/4', '/penulis/redaksi/halaman/01', '/penulis/tidak-ada/halaman/2']) {
  +    expect((await request.get(path)).status(), path).toBe(404)
  +  }
  +})
  +
  +for (const { lebar, tinggi } of UKURAN_LAYAR) {
  +  test(`profil penulis halaman 2 dan 3 ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
  +    await page.setViewportSize({ width: lebar, height: tinggi })
  +    for (const path of ['/penulis/redaksi/halaman/2', '/penulis/redaksi/halaman/3']) {
  +      await page.goto(path)
  +      await expect(page.getByRole('navigation', { name: 'Halaman tulisan' })).toBeVisible()
  +      await periksaTanpaGeserHorizontal(page)
  +      await periksaAxe(page)
  +    }
  +  })
  +}
  +
   test('rubrik halaman tengah dengan iklan terisi di 375 px: slot setelah navigasi halaman, lolos axe, tanpa geser horizontal', async ({ page }) => {
     await page.context().addCookies([{ name: 'persetujuan', value: `1.semua.${new Date().toISOString().slice(0, 10)}`, domain: 'localhost', path: '/' }])
     await cegatIklan(page)
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/penulis.test.ts
  ```

  Hasil yang diharapkan: FAIL di tes "halaman 2: foto dan nama saja (tanpa bio, keahlian, tautan, dan ProfilePage), ..." dengan `AssertionError: expected '<link rel="preload" as="image" href="…' not to contain 'Menulis soal pajak dan gaji.'` (3 tes lain lulus).

- [ ] **Langkah 3: Rute dan halaman penulis berhalaman**

  ```diff
  diff --git a/src/modules/konten/cache.ts b/src/modules/konten/cache.ts
  index 3e87af7..5c896d8 100644
  --- a/src/modules/konten/cache.ts
  +++ b/src/modules/konten/cache.ts
  @@ -117,8 +117,8 @@ export const muatHalaman = unstable_cache(async (slug: string) => ambilHalaman(a
     revalidate: SEJAM,
   })
   
  -/** Profil penulis: foto (media), kartu tulisan (artikel dan pilar), dan data penulis sendiri. */
  -export const muatPenulis = unstable_cache(async (slug: string) => ambilPenulis(await payload(), slug), ['konten', 'penulis'], {
  +/** Profil penulis dan halaman ke-`nomor` tulisannya: foto (media), kartu tulisan (artikel dan pilar), dan data penulis sendiri. */
  +export const muatPenulis = unstable_cache(async (slug: string, nomor: number) => ambilPenulis(await payload(), slug, nomor), ['konten', 'penulis'], {
     tags: [TAG.koleksi('penulis'), TAG.koleksi('artikel'), TAG.koleksi('pilar'), TAG.media],
     revalidate: SEJAM,
   })
  ```

  ```diff
  diff --git a/src/app/(frontend)/penulis/[slug]/page.tsx b/src/app/(frontend)/penulis/[slug]/page.tsx
  index 8c6ab7e..241e3e6 100644
  --- a/src/app/(frontend)/penulis/[slug]/page.tsx
  +++ b/src/app/(frontend)/penulis/[slug]/page.tsx
  @@ -8,12 +8,12 @@ import { metadata, metadataTidakDitemukan } from '@/modules/seo'
   
   type Props = { params: Promise<{ slug: string }> }
   
  -/** `/penulis/{slug}`: profil penulis (ISR). */
  +/** `/penulis/{slug}`: profil penulis dan halaman 1 tulisannya (ISR); halaman berikutnya di `halaman/[nomor]`. */
   export function generateStaticParams() {
     return []
   }
   
  -const cari = cache(async (slug: string) => muatPenulis(slug))
  +const cari = cache(async (slug: string) => muatPenulis(slug, 1))
   
   export async function generateMetadata({ params }: Props): Promise<Metadata> {
     const penulis = await cari((await params).slug)
  ```

  `src/app/(frontend)/penulis/[slug]/halaman/[nomor]/page.tsx`

  ```tsx
  import type { Metadata } from 'next'
  import { permanentRedirect } from 'next/navigation'
  import { cache } from 'react'

  import { HalamanPenulis } from '@/components/penulis/HalamanPenulis'
  import { SEGMEN_HALAMAN } from '@/lib/paths'
  import { bacaNomor, muatPenulis, muatSitus, pathDariSegmen, tanganiTidakAda } from '@/modules/konten'
  import { metadata, metadataTidakDitemukan } from '@/modules/seo'

  type Props = { params: Promise<{ slug: string; nomor: string }> }

  /**
   * `/penulis/{slug}/halaman/{n}`: halaman ke-n tulisan penulis (ISR, tag cache sama dengan profilnya).
   * `/halaman/1` dialihkan permanen ke profil; nomor tidak sah atau di luar jangkauan diteruskan ke
   * `tanganiTidakAda` (redirect dari CMS atau 404).
   */
  export function generateStaticParams() {
    return []
  }

  const cari = cache(async (slug: string, nomor: string) => {
    const n = bacaNomor(nomor)
    return n === null ? null : muatPenulis(slug, n)
  })

  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug, nomor } = await params
    const penulis = await cari(slug, nomor)
    if (!penulis || penulis.paginasi.nomor === 1) return metadataTidakDitemukan(await muatSitus())
    return metadata({ jenis: 'penulis', doc: penulis.seo, halaman: penulis.paginasi.nomor }, await muatSitus())
  }

  export default async function HalamanTulisanPenulis({ params }: Props) {
    const { slug, nomor } = await params
    const penulis = await cari(slug, nomor)
    // Path yang diminta apa adanya (nomor bisa tidak sah), untuk redirect dari CMS.
    if (!penulis) return tanganiTidakAda(pathDariSegmen(['penulis', slug, SEGMEN_HALAMAN, nomor]))
    if (penulis.paginasi.nomor === 1) permanentRedirect(penulis.href)
    return <HalamanPenulis penulis={penulis} situs={await muatSitus()} />
  }
  ```

  ```diff
  diff --git a/src/components/penulis/HalamanPenulis.tsx b/src/components/penulis/HalamanPenulis.tsx
  index 78bbfa8..efead9e 100644
  --- a/src/components/penulis/HalamanPenulis.tsx
  +++ b/src/components/penulis/HalamanPenulis.tsx
  @@ -2,6 +2,7 @@ import Image from 'next/image'
   
   import { Ikon } from '@/components/dasar/Ikon'
   import { JsonLd } from '@/components/dasar/JsonLd'
  +import { Paginasi } from '@/components/dasar/Paginasi'
   import { RemahRoti } from '@/components/dasar/RemahRoti'
   import { Tautan } from '@/components/dasar/Tautan'
   import { DaftarKartu } from '@/components/kartu/KartuArtikel'
  @@ -14,10 +15,13 @@ import gaya from './Penulis.module.css'
   
   /**
    * Profil penulis `/penulis/{slug}`: foto, nama, bio, keahlian, tautan profesional (`rel="me"`), dan
  - * tulisan terbarunya. JSON-LD ProfilePage + Person dari modul SEO.
  + * tulisan terbarunya, dengan navigasi halaman tulisan (`/halaman/{n}`). Bio, keahlian, dan tautan hanya di
  + * halaman 1; halaman berikutnya hanya foto, nama, dan daftar tulisan. JSON-LD ProfilePage + Person dari modul
  + * SEO (hanya halaman 1).
    */
   export function HalamanPenulis({ penulis, situs }: { penulis: DataPenulis; situs: Situs }) {
  -  const masukan = { jenis: 'penulis', doc: penulis.seo } as const
  +  const halaman = penulis.paginasi.nomor
  +  const masukan = { jenis: 'penulis', doc: penulis.seo, halaman } as const
     const foto = propsGambar(penulis.foto, 'thumbnail', { cloudName: situs.cloudName, lebar: 320 })
     return (
       <div className={`kontainer ${gaya.halaman}`}>
  @@ -28,15 +32,15 @@ export function HalamanPenulis({ penulis, situs }: { penulis: DataPenulis; situs
           <div className={gaya.identitas}>
             <p className={gaya.label}>Penulis</p>
             <h1 className={gaya.judul}>{penulis.nama}</h1>
  -          {penulis.bio && <p className={gaya.bio}>{penulis.bio}</p>}
  -          {penulis.keahlian.length > 0 && (
  +          {halaman === 1 && penulis.bio && <p className={gaya.bio}>{penulis.bio}</p>}
  +          {halaman === 1 && penulis.keahlian.length > 0 && (
               <ul aria-label="Keahlian" className={gaya.keahlian}>
                 {penulis.keahlian.map((k) => (
                   <li key={k}>{k}</li>
                 ))}
               </ul>
             )}
  -          {penulis.tautan.length > 0 && (
  +          {halaman === 1 && penulis.tautan.length > 0 && (
               <ul aria-label={`Tautan ${penulis.nama}`} className={gaya.tautan}>
                 {penulis.tautan.map((t) => (
                   <li key={t.href}>
  @@ -59,6 +63,7 @@ export function HalamanPenulis({ penulis, situs }: { penulis: DataPenulis; situs
           ) : (
             <p className={gaya.kosong}>Belum ada tulisan yang terbit. Tulisan baru tampil di sini setelah terbit.</p>
           )}
  +        <Paginasi paginasi={penulis.paginasi} />
         </section>
       </div>
     )
  ```

- [ ] **Langkah 4: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 518 tes (76 file); integrasi 148 tes (44 file); E2E 146 tes. Bila `pnpm typecheck` gagal dengan `TS2307` ke rute yang tidak ada di `.next/types`, hapus `.next` lalu ulangi.

- [ ] **Langkah 5: Commit**

  ```bash
  git add "src/app/(frontend)/penulis/[slug]/page.tsx" "src/app/(frontend)/penulis/[slug]/halaman/[nomor]/page.tsx" src/components/penulis/HalamanPenulis.tsx src/modules/konten/cache.ts tests/e2e/paginasi.spec.ts tests/unit/penulis.test.ts
  git commit -m "feat(penulis): halaman tulisan berikutnya di /penulis/{slug}/halaman/{n} (ISR), /halaman/1 dialihkan 308, profil lengkap dan ProfilePage hanya di halaman 1"
  ```

---

### Task 6: Tombol "Cek sekarang" di daftar Status indeks

**Files:**
- Create: `src/lib/aksiAdmin.ts`, `src/modules/indexer/cek.ts`, `src/modules/indexer/admin/SelCekSekarang.tsx`, `src/modules/indexer/admin/TombolCekSekarang.tsx`, `tests/int/indexer-cek.int.spec.ts`, `tests/e2e/pantau-aksi.spec.ts`
- Modify: `src/modules/indexer/aturan.ts`, `src/modules/indexer/antrean.ts`, `src/modules/indexer/endpoint.ts`, `src/modules/indexer/index.ts`, `src/modules/indexer/admin/indexing.scss`, `src/collections/StatusIndeks.ts`, `src/payload-types.ts` (dibuat ulang), `src/app/(payload)/admin/importMap.js` (dibuat ulang), `tests/unit/indexer-aturan.test.ts`
- Test: `tests/unit/indexer-aturan.test.ts`, `tests/int/indexer-cek.int.spec.ts`, `tests/e2e/pantau-aksi.spec.ts`

**Interfaces:**
- Consumes: `panggilanSejak`, `ambilPengaturanIndexing`, `kunciAntrean`, `catatStatus` (`indexer/antrean.ts`); `awalHariPasifik`, `besokPasifik`, `JADWAL_CEK_MS`, `MENIT` (`indexer/aturan.ts`); `jalankanSetelahRespons`, `jalankanIndexer`, `adapterPalsu` (`indexer`); `teksWaktu` (`pantau/format.ts`); `LABEL_STATUS_INDEKS`.
- Produces:
  - `src/lib/aksiAdmin.ts`: `tolakSelainAdmin(req: PayloadRequest): Response | null` (401 tanpa login, 403 bukan admin, 403 bila `Sec-Fetch-Site` ada dan bukan `same-origin`); dipakai juga Task 7.
  - `indexer/aturan.ts`: `JEDA_CEK_MANUAL_MS` (10 menit), `jedaCekManual(dimintaPada, sekarang = new Date()): Date | null`, `batasCekManual({ terpakai, kuota, dimintaPada }, sekarang): BatasCek`.
  - `indexer/antrean.ts`: `majukanCek(payload, path, sekarang)` (satu `INSERT ... ON CONFLICT (kunci) DO UPDATE`), `klaimCekManual(payload, id, sekarang, jedaMs): Promise<string | null>` (satu `UPDATE ... RETURNING path`); `DataStatus.dimintaPada`.
  - `indexer/cek.ts`: `mintaCekStatus(payload, id, opsi?): Promise<HasilMintaCek>` dengan `HasilMintaCek = { status: 'antre'; path; dimintaPada; pesan } | { status: 'dibatasi'; alasan: 'kuota' | 'jeda'; bolehLagi; pesan } | { status: 'tidak-ada'; pesan }`; diekspor dari `@/modules/indexer`.
  - `indexer/endpoint.ts`: `endpointCekSekarang` (`POST /api/status-indeks/:id/cek`, 202, 429, 404) dan `PATH_CEK_SEKARANG`.
  - Koleksi `status-indeks`: field `dimintaPada` (tanggal, hanya baca di admin; kolom `diminta_pada`, aditif), field `ui` `cekSekarang` (sel `SelCekSekarang`), `endpoints: [endpointCekSekarang]`, kolom bawaan bertambah "Cek sekarang".
  - `TombolCekSekarang({ id, path, bolehLagi })` (klien): tombol "Cek sekarang" (nama aksesibel "Cek sekarang {path}"), `aria-disabled` saat berjalan dan dibatasi, pesan di `role="status"`, menanyakan `GET /api/status-indeks/{id}` setiap detik (paling banyak 20 kali) sampai `cekTerakhir` tidak lebih lama dari permintaan ini, lalu `router.refresh()`.

Cek otomatis +6 jam sampai +30 hari (Rencana 6A) tetap berjalan; tombol ini untuk pemilik yang baru meminta pengindeksan di Search Console atau memperbaiki halaman. Alurnya lewat antrean yang sama, jadi semua aturan Mesin Indexing tetap berlaku (kuota harian `kirimPerUrl`, jeda ulang, log, `catatHasilCek`) dan Google tidak dipanggil dari permintaan admin: endpoint hanya memajukan baris `cek-status` ke sekarang lalu menjalankan antrean lewat `after()`.

- **Baris yang sudah antre** (siklus +6 jam sampai +30 hari) dimajukan dengan tahap dan dasar jadwalnya, jadi setelah dicek manual siklus berlanjut ke tahap berikutnya; tanpa baris (siklus selesai), baris baru dibuat dengan tahap 6 dan tanpa dasar, sehingga hanya dicek sekali. Jenis baris baru `terbit` (status indeks hanya ada untuk halaman yang terbit), supaya enum `jenis` tidak berubah.
- **Batas:** kuota cek harian dari Pengaturan SEO (`kuotaInspeksi`, bawaan 1.000 dari kuota URL Inspection 2.000 per hari per properti; per menit 600, jauh di atas kebutuhan) dihitung dari log sejak tengah malam waktu Pasifik, sama dengan pelari antrean; dan jeda 10 menit per halaman lewat kolom `diminta_pada` dengan satu `UPDATE ... WHERE diminta_pada <= sekarang - 10 menit RETURNING`, jadi klik ganda atau dua admin bersamaan hanya menghasilkan satu cek. Kuota diperiksa sebelum klaim supaya penolakan kuota tidak mengunci halaman 10 menit.
- **Akses:** hanya admin (`tolakSelainAdmin`). Cookie login Payload ber-SameSite Lax (bawaan `auth.cookies.sameSite`), dan `csrf` kosong berarti Payload menerima cookie dari asal mana pun (`extractJWT`); browser tidak mengirim cookie Lax pada `POST` dari situs lain, dan `Sec-Fetch-Site` selain `same-origin` ditolak sebagai lapisan kedua.
- **Umpan balik:** "Sedang dicek di Google." lalu "Selesai dicek: Belum dikenal Google." (label status), atau pesan batas dengan waktu WIB ("Halaman ini baru saja diminta dicek. Bisa dicek lagi mulai 6 Nov 2026, 15.10 WIB."). Tombol memakai `aria-disabled`, bukan `disabled`, supaya fokus keyboard tidak hilang dari tombol yang baru ditekan; cincin fokus ditulis sendiri (CSS admin Payload menghapus outline).
- **Tes:** adapter palsu menjawab "URL is unknown to Google" (status Belum dikenal Google); tes integrasi memakai waktu tiruan dan memanggil handler endpoint langsung.

Satu kolom baru (`diminta_pada`, boleh kosong) dan tanpa hook baru: tulisannya lewat endpoint ini saja. Hapus massal status indeks oleh admin tidak menyentuh kolom itu, dan uji operasi massal lama (`indexer-bersamaan.int.spec.ts`) tetap lulus.

- [ ] **Langkah 1: Tulis tes yang gagal**

  ```diff
  diff --git a/tests/unit/indexer-aturan.test.ts b/tests/unit/indexer-aturan.test.ts
  index 47b1833..85234b4 100644
  --- a/tests/unit/indexer-aturan.test.ts
  +++ b/tests/unit/indexer-aturan.test.ts
  @@ -3,10 +3,13 @@ import { describe, expect, it } from 'vitest'
   import {
     awalHariPasifik,
     bandingkanVersi,
  +  batasCekManual,
     besokPasifik,
     gabungBaris,
  +  JEDA_CEK_MANUAL_MS,
     jadwalCek,
     jadwalUlang,
  +  jedaCekManual,
     rencanaKabar,
     setelahPanggilan,
     statusDariInspeksi,
  @@ -190,3 +193,23 @@ describe('setelahPanggilan: keadaan antrean setelah adapter menjawab', () => {
       })
     })
   })
  +
  +describe('batasCekManual: tombol "Cek sekarang"', () => {
  +  it('boleh selama kuota harian belum habis dan permintaan manual terakhir lebih dari 10 menit lalu', () => {
  +    expect(JEDA_CEK_MANUAL_MS).toBe(10 * 60_000)
  +    expect(batasCekManual({ terpakai: 0, kuota: 1000, dimintaPada: null }, SEKARANG)).toEqual({ boleh: true })
  +    expect(batasCekManual({ terpakai: 999, kuota: 1000, dimintaPada: t('2026-11-05T02:50:00.000Z') }, SEKARANG)).toEqual({ boleh: true })
  +  })
  +
  +  it('jeda 10 menit sejak permintaan terakhir; kuota habis berarti tunggu hari kuota berikutnya (tengah malam Pasifik)', () => {
  +    expect(batasCekManual({ terpakai: 3, kuota: 1000, dimintaPada: t('2026-11-05T02:55:00.000Z') }, SEKARANG)).toEqual({
  +      boleh: false,
  +      alasan: 'jeda',
  +      bolehLagi: t('2026-11-05T03:05:00.000Z'),
  +    })
  +    expect(batasCekManual({ terpakai: 1000, kuota: 1000, dimintaPada: null }, SEKARANG)).toEqual({ boleh: false, alasan: 'kuota', bolehLagi: besokPasifik(SEKARANG) })
  +    expect(jedaCekManual('2026-11-05T02:55:00.000Z', SEKARANG)).toEqual(t('2026-11-05T03:05:00.000Z'))
  +    expect(jedaCekManual(null, SEKARANG)).toBeNull()
  +    expect(jedaCekManual('2026-11-05T02:50:00.000Z', SEKARANG)).toBeNull()
  +  })
  +})
  ```

  `tests/int/indexer-cek.int.spec.ts`

  ```ts
  import type { Payload, PayloadRequest } from 'payload'
  import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

  import { adapterPalsu, jalankanIndexer, kabari, mintaCekStatus } from '@/modules/indexer'
  import { catatStatus } from '@/modules/indexer/antrean'
  import { endpointCekSekarang } from '@/modules/indexer/endpoint'

  import { getTestPayload, unik } from './helpers'

  const T0 = new Date('2026-11-05T03:00:00.000Z')
  const nanti = (menit: number) => new Date(T0.getTime() + menit * 60_000)
  const palsu = adapterPalsu()

  async function kosongkan(payload: Payload) {
    for (const collection of ['antrean-indexing', 'log-indexing', 'status-indeks'] as const) {
      await payload.delete({ collection, where: { id: { exists: true } } })
    }
  }

  async function statusBaru(payload: Payload, path: string) {
    await catatStatus(payload, path, {})
    const { docs } = await payload.find({ collection: 'status-indeks', where: { path: { equals: path } }, limit: 1, depth: 0 })
    return docs[0]
  }

  async function barisCek(payload: Payload, path: string) {
    const { docs } = await payload.find({ collection: 'antrean-indexing', where: { kunci: { equals: `cek-status ${path}` } }, depth: 0 })
    return docs.map((d) => ({ jadwal: d.jadwal, tahap: d.tahap, dasar: d.dasar ?? null }))
  }

  async function panggil(id: number | string, user: unknown, headers: Record<string, string> = {}) {
    const payload = await getTestPayload()
    const req = { payload, headers: new Headers(headers), user, routeParams: { id: String(id) } } as unknown as PayloadRequest
    return endpointCekSekarang.handler(req)
  }

  describe('"Cek sekarang" status indeks', () => {
    beforeAll(async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kuotaInspeksi: 1000, pakaiIndexingApi: false } } })
    })

    afterAll(async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kuotaInspeksi: 1000 } } })
      await kosongkan(payload)
    })

    beforeEach(async () => {
      palsu.reset()
      await kosongkan(await getTestPayload())
    })

    it('memajukan cek ke antrean tanpa memanggil Google; dicek sekali di jalan berikutnya; jeda 10 menit per halaman', async () => {
      const payload = await getTestPayload()
      const path = `/${unik('cek')}`
      const doc = await statusBaru(payload, path)

      expect(await mintaCekStatus(payload, doc.id, { sekarang: T0 })).toEqual({
        status: 'antre',
        path,
        dimintaPada: T0.toISOString(),
        pesan: `Cek status ${path} dijalankan sekarang.`,
      })
      expect(palsu.panggilan).toEqual([])
      // Siklus cek otomatis sudah selesai (tanpa baris antrean): baris baru tanpa tahap lanjutan.
      expect(await barisCek(payload, path)).toEqual([{ jadwal: T0.toISOString(), tahap: 6, dasar: null }])

      const dibatasi = await mintaCekStatus(payload, doc.id, { sekarang: nanti(4) })
      expect(dibatasi).toMatchObject({ status: 'dibatasi', alasan: 'jeda', bolehLagi: nanti(10).toISOString() })
      expect(dibatasi.pesan).toMatch(/^Halaman ini baru saja diminta dicek\. Bisa dicek lagi mulai 5 Nov 2026, 10\.10 WIB\.$/)

      await jalankanIndexer(payload, { sekarang: nanti(4), adapter: palsu })
      expect(palsu.panggilan).toEqual([{ aksi: 'periksaUrl', properti: 'sc-domain:point.lat', url: `https://point.lat${path}` }])
      const sesudah = await payload.findByID({ collection: 'status-indeks', id: doc.id })
      expect(sesudah).toMatchObject({ status: 'tidak-dikenal', cekTerakhir: nanti(4).toISOString(), dimintaPada: T0.toISOString() })
      expect(await barisCek(payload, path)).toEqual([])

      expect((await mintaCekStatus(payload, doc.id, { sekarang: nanti(10) })).status).toBe('antre')
    })

    it('cek yang sudah terjadwal dimajukan dengan tahap dan dasarnya, jadi siklus +6 jam sampai +30 hari berlanjut', async () => {
      const payload = await getTestPayload()
      const path = `/${unik('terjadwal')}`
      await kabari(payload, [{ path, jenis: 'terbit' }], { sekarang: T0 })
      const { docs } = await payload.find({ collection: 'status-indeks', where: { path: { equals: path } }, depth: 0 })
      expect(await barisCek(payload, path)).toEqual([{ jadwal: nanti(6 * 60).toISOString(), tahap: 0, dasar: T0.toISOString() }])

      expect((await mintaCekStatus(payload, docs[0].id, { sekarang: nanti(30) })).status).toBe('antre')
      expect(await barisCek(payload, path)).toEqual([{ jadwal: nanti(30).toISOString(), tahap: 0, dasar: T0.toISOString() }])
      await jalankanIndexer(payload, { sekarang: nanti(30), adapter: palsu })
      expect(palsu.panggilan.filter((p) => p.aksi === 'periksaUrl')).toHaveLength(1)
      // Belum terindeks: tahap berikutnya +24 jam dari dasar.
      expect(await barisCek(payload, path)).toEqual([{ jadwal: nanti(24 * 60).toISOString(), tahap: 1, dasar: T0.toISOString() }])
    })

    it('kuota cek harian di Pengaturan SEO habis: ditolak sampai hari kuota berikutnya; permintaan bersamaan hanya satu yang masuk', async () => {
      const payload = await getTestPayload()
      const [a, b] = [await statusBaru(payload, `/${unik('a')}`), await statusBaru(payload, `/${unik('b')}`)]
      const hasil = await Promise.all([mintaCekStatus(payload, a.id, { sekarang: T0 }), mintaCekStatus(payload, a.id, { sekarang: T0 })])
      expect(hasil.map((h) => h.status).sort()).toEqual(['antre', 'dibatasi'])
      expect(await barisCek(payload, a.path)).toHaveLength(1)

      await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kuotaInspeksi: 1 } } })
      await jalankanIndexer(payload, { sekarang: T0, adapter: palsu })
      const kuota = await mintaCekStatus(payload, b.id, { sekarang: nanti(1) })
      expect(kuota).toMatchObject({ status: 'dibatasi', alasan: 'kuota', bolehLagi: '2026-11-05T08:00:00.000Z' })
      expect(kuota.pesan).toBe('Batas 1 cek status per hari sudah tercapai. Bisa dicek lagi mulai 5 Nov 2026, 15.00 WIB.')
      expect(await barisCek(payload, b.path)).toEqual([])
      await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kuotaInspeksi: 1000 } } })
    })

    it('endpoint POST /api/status-indeks/{id}/cek: hanya admin, hanya dari situs sendiri; 202, 429, dan 404', async () => {
      const payload = await getTestPayload()
      const doc = await statusBaru(payload, `/${unik('endpoint')}`)
      const admin = { id: 1, peran: 'admin', collection: 'pengguna' }
      expect((await panggil(doc.id, null)).status).toBe(401)
      expect((await panggil(doc.id, { ...admin, peran: 'editor' })).status).toBe(403)
      const lintas = await panggil(doc.id, admin, { 'sec-fetch-site': 'cross-site' })
      expect(lintas.status).toBe(403)
      expect(await lintas.json()).toEqual({ status: 'gagal', pesan: 'Permintaan dari situs lain ditolak.' })

      const jawaban = await panggil(doc.id, admin, { 'sec-fetch-site': 'same-origin' })
      expect(jawaban.status).toBe(202)
      expect(await jawaban.json()).toMatchObject({ status: 'antre', path: doc.path })
      expect((await panggil(doc.id, admin)).status).toBe(429)
      expect((await panggil(999_999_999, admin)).status).toBe(404)
      expect((await panggil('bukan-angka', admin)).status).toBe(404)
    })
  })
  ```

  `tests/e2e/pantau-aksi.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  import { ADMIN_E2E, SLUG } from './data'

  /**
   * Aksi admin Pantau SEO (Rencana 8B). Nama file berjalan setelah `indexing.spec.ts`: "Cek sekarang" menjalankan
   * antrean Mesin Indexing setelah respons, termasuk kiriman IndexNow yang masih antre, dan jendela kirim 5 menit
   * akan menunda kiriman yang ditunggu `indexing.spec.ts`.
   */

  test('daftar Status indeks: "Cek sekarang" mengecek satu halaman lewat antrean, hasilnya tampil, lalu dibatasi 10 menit', async ({ page }) => {
    await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
    const path = `/${SLUG.sehat}`
    const { docs } = await (await page.request.get(`/api/status-indeks?where[path][equals]=${path}&depth=0`)).json()
    const daftar = `/admin/collections/status-indeks?where[path][equals]=${encodeURIComponent(path)}`
    await page.goto(daftar)
    await expect(page.getByRole('columnheader', { name: 'Cek sekarang' })).toBeVisible()
    const baris = page.getByRole('row').filter({ hasText: path })
    const tombol = baris.getByRole('button', { name: `Cek sekarang ${path}` })
    await expect(tombol).toHaveAttribute('aria-disabled', 'false')
    await periksaAxe(page, '.indexing-cek')

    await tombol.click()
    await expect(baris.getByRole('status')).toHaveText('Selesai dicek: Belum dikenal Google.')
    await expect(baris).toContainText('Belum dikenal Google')
    await expect(tombol).toHaveAttribute('aria-disabled', 'true')
    await expect(tombol).toBeFocused()

    // Jeda 10 menit berlaku juga setelah halaman dimuat ulang dan untuk permintaan langsung ke endpoint.
    await page.reload()
    await expect(baris.getByRole('status')).toHaveText(/^Baru saja diminta dicek\. Bisa dicek lagi mulai \d{1,2} \w{3} \d{4}, \d{2}\.\d{2} WIB\.$/)
    await expect(baris.getByRole('button', { name: `Cek sekarang ${path}` })).toHaveAttribute('aria-disabled', 'true')
    const ulang = await page.request.post(`/api/status-indeks/${docs[0].id}/cek`)
    expect(ulang.status()).toBe(429)
    expect((await ulang.json()).alasan).toBe('jeda')
    await periksaAxe(page, '.indexing-cek')

    // Tanpa login: ditolak.
    await page.context().clearCookies()
    expect((await page.request.post(`/api/status-indeks/${docs[0].id}/cek`)).status()).toBe(401)
  })

  for (const tema of ['light', 'dark'] as const) {
    test(`tombol "Cek sekarang" tema ${tema}: lolos axe dan cincin fokus terlihat, daftar tanpa geser horizontal di 375 px`, async ({ page }) => {
      await page.context().addCookies([{ name: 'payload-theme', value: tema, domain: 'localhost', path: '/' }])
      await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
      await page.goto(`/admin/collections/status-indeks?where[path][equals]=${encodeURIComponent(`/${SLUG.tekno}`)}`)
      const tombol = page.getByRole('button', { name: `Cek sekarang /${SLUG.tekno}` })
      await tombol.focus()
      expect(await tombol.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid')
      await periksaAxe(page, '.indexing-cek')
      await page.setViewportSize({ width: 375, height: 812 })
      await periksaTanpaGeserHorizontal(page)
    })
  }
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/indexer-aturan.test.ts
  pnpm exec cross-env NODE_OPTIONS=--no-deprecation vitest run --config ./vitest.int.config.mts tests/int/indexer-cek.int.spec.ts
  ```

  Hasil yang diharapkan: unit FAIL di dua tes `batasCekManual` (18 tes lain lulus), yang pertama dengan `AssertionError: expected undefined to be 600000 // Object.is equality`, yang kedua dengan `TypeError: (0 , __vite_ssr_import_1__.batasCekManual) is not a function`; integrasi FAIL, keempat tes gagal, tiga dengan `TypeError: (0 , __vite_ssr_import_1__.mintaCekStatus) is not a function` dan tes endpoint dengan `TypeError: Cannot read properties of undefined (reading 'handler')`.

- [ ] **Langkah 3: Aturan, klaim atomik, dan permintaan cek**

  ```diff
  diff --git a/src/modules/indexer/aturan.ts b/src/modules/indexer/aturan.ts
  index e8b7409..226fdff 100644
  --- a/src/modules/indexer/aturan.ts
  +++ b/src/modules/indexer/aturan.ts
  @@ -34,6 +34,13 @@ export const JADWAL_CEK_MS = [6 * JAM, 24 * JAM, 3 * HARI, 7 * HARI, 14 * HARI,
   /** Jarak minimal antarpengiriman: sitemap paling sering 30 menit sekali, IndexNow 5 menit sekali. */
   export const JENDELA_KIRIM_MS = { sitemap: 30 * MENIT, indexnow: 5 * MENIT } as const
   
  +/**
  + * Jeda minimal antara dua permintaan "Cek sekarang" untuk URL yang sama. Data indeks Google tidak berubah
  + * dalam hitungan menit, jadi jeda ini menjaga kuota URL Inspection (2.000 per hari per properti) dari klik
  + * berulang tanpa menghalangi pengecekan ulang setelah pemilik meminta pengindeksan di Search Console.
  + */
  +export const JEDA_CEK_MANUAL_MS = 10 * MENIT
  +
   /** Baris sitemap di antrean: satu untuk seluruh situs, yang dikirim adalah sitemap index. */
   export const PATH_SITEMAP = PATH_SITEMAP_INDEX
   
  @@ -139,6 +146,29 @@ export function besokPasifik(t: Date): Date {
     return awalHariPasifik(new Date(awalHariPasifik(t).getTime() + 25 * JAM))
   }
   
  +export type BatasCek = { boleh: true } | { boleh: false; alasan: 'kuota' | 'jeda'; bolehLagi: Date }
  +
  +/** Kapan "Cek sekarang" boleh dipakai lagi untuk URL yang terakhir diminta dicek pada `dimintaPada`; `null` bila sudah boleh. */
  +export function jedaCekManual(dimintaPada: Date | string | null | undefined, sekarang: Date = new Date()): Date | null {
  +  if (!dimintaPada) return null
  +  const boleh = new Date(dimintaPada).getTime() + JEDA_CEK_MANUAL_MS
  +  return boleh > sekarang.getTime() ? new Date(boleh) : null
  +}
  +
  +/**
  + * Apakah "Cek sekarang" boleh dijalankan: kuota cek harian (dari Pengaturan SEO) belum habis, dan permintaan
  + * manual terakhir untuk URL ini sudah lewat `JEDA_CEK_MANUAL_MS`. `terpakai`: panggilan cek status sejak awal
  + * hari kuota (tengah malam waktu Pasifik).
  + */
  +export function batasCekManual(
  +  a: { terpakai: number; kuota: number; dimintaPada: Date | null },
  +  sekarang: Date,
  +): BatasCek {
  +  if (a.terpakai >= a.kuota) return { boleh: false, alasan: 'kuota', bolehLagi: besokPasifik(sekarang) }
  +  const jeda = jedaCekManual(a.dimintaPada, sekarang)
  +  return jeda ? { boleh: false, alasan: 'jeda', bolehLagi: jeda } : { boleh: true }
  +}
  +
   /**
    * Status indeks dari `indexStatusResult` URL Inspection API. `verdict` adalah enum resmi; `coverageState`
    * berupa teks bebas berbahasa Inggris (permintaan memakai bahasa bawaan en-US), jadi dicocokkan dengan
  ```

  ```diff
  diff --git a/src/modules/indexer/antrean.ts b/src/modules/indexer/antrean.ts
  index 5741a33..7550d98 100644
  --- a/src/modules/indexer/antrean.ts
  +++ b/src/modules/indexer/antrean.ts
  @@ -3,7 +3,7 @@ import type { Payload, PayloadRequest, Where } from 'payload'
   
   import type { AntreanIndexing } from '@/payload-types'
   
  -import { gabungBaris } from './aturan'
  +import { gabungBaris, JADWAL_CEK_MS } from './aturan'
   import type {
     BarisAntrean,
     JenisKabar,
  @@ -104,6 +104,33 @@ async function tambahBaris(payload: Payload, kunci: string, baris: BarisAntrean,
     return rows.length > 0
   }
   
  +/**
  + * Memajukan cek status satu path ke `sekarang` (tombol "Cek sekarang"). Baris cek yang sudah antre dipakai
  + * dengan tahap dan dasar jadwalnya, jadi siklus +6 jam sampai +30 hari berlanjut setelahnya; tanpa baris
  + * (siklus selesai), baris baru dibuat tanpa tahap lanjutan sehingga hanya dicek sekali. Satu
  + * `INSERT ... ON CONFLICT (kunci) DO UPDATE`: dua permintaan bersamaan tidak membuat dua baris, dan versi naik
  + * supaya pelari yang sedang memegang baris lama tidak menimpa jadwal baru.
  + */
  +export async function majukanCek(payload: Payload, path: string, sekarang: Date): Promise<void> {
  +  await payload.db.drizzle.execute(sql`
  +    insert into antrean_indexing (kunci, langkah, path, jenis, jadwal, percobaan, tahap, dasar, versi)
  +    values (${kunciAntrean('cek-status', path)}, 'cek-status', ${path}, 'terbit', ${sekarang.toISOString()}, 0, ${JADWAL_CEK_MS.length}, null, 0)
  +    on conflict (kunci) do update set jadwal = excluded.jadwal, versi = antrean_indexing.versi + 1, updated_at = now()`)
  +}
  +
  +/**
  + * Mengklaim "Cek sekarang" untuk satu status indeks: `diminta_pada` diisi `sekarang` hanya bila permintaan
  + * manual sebelumnya sudah lewat `jedaMs`. Satu `UPDATE ... RETURNING`, jadi klik ganda atau dua admin
  + * bersamaan hanya menghasilkan satu cek. Mengembalikan path-nya, atau `null` bila masih dalam jeda.
  + */
  +export async function klaimCekManual(payload: Payload, id: number, sekarang: Date, jedaMs: number): Promise<string | null> {
  +  const { rows } = await payload.db.drizzle.execute(sql`
  +    update status_indeks set diminta_pada = ${sekarang.toISOString()}, updated_at = now()
  +    where id = ${id} and (diminta_pada is null or diminta_pada <= ${new Date(sekarang.getTime() - jedaMs).toISOString()})
  +    returning path`)
  +  return (rows[0] as { path?: string } | undefined)?.path ?? null
  +}
  +
   export async function batalkanBaris(payload: Payload, langkah: LangkahAntrean, path: string, req?: PayloadRequest): Promise<void> {
     await payload.delete({ collection: ANTREAN, where: { kunci: { equals: kunciAntrean(langkah, path) } }, req })
   }
  @@ -216,6 +243,7 @@ export type DataStatus = Partial<{
     dirayapiPada: string | null
     cekTerakhir: string | null
     cekBerikutnya: string | null
  +  dimintaPada: string | null
   }>
   
   /** Menyimpan status indeks satu path (dibuat bila belum ada, dengan status Belum dicek). */
  ```

  `src/modules/indexer/cek.ts`

  ```ts
  import type { Payload } from 'payload'

  import { teksWaktu } from '@/modules/pantau/format'

  import { ambilPengaturanIndexing, klaimCekManual, majukanCek, panggilanSejak } from './antrean'
  import { awalHariPasifik, batasCekManual, JEDA_CEK_MANUAL_MS } from './aturan'

  /** Jawaban "Cek sekarang"; `pesan` siap tampil di admin. */
  export type HasilMintaCek =
    | { status: 'antre'; path: string; dimintaPada: string; pesan: string }
    | { status: 'dibatasi'; alasan: 'kuota' | 'jeda'; bolehLagi: string; pesan: string }
    | { status: 'tidak-ada'; pesan: string }

  /**
   * Tombol "Cek sekarang" di daftar Status indeks (Rencana 8B): memajukan cek URL Inspection satu halaman ke
   * antrean Mesin Indexing, tanpa memanggil Google dari permintaan admin (pemanggil menjalankan antrean lewat
   * `after()`). Ditolak bila kuota cek harian di Pengaturan SEO sudah habis, atau URL itu baru diminta dicek
   * kurang dari 10 menit lalu; klaimnya atomik, jadi klik ganda hanya menghasilkan satu cek.
   */
  export async function mintaCekStatus(payload: Payload, id: number, opsi: { sekarang?: Date } = {}): Promise<HasilMintaCek> {
    const sekarang = opsi.sekarang ?? new Date()
    const { docs } = await payload.find({ collection: 'status-indeks', where: { id: { equals: id } }, limit: 1, depth: 0, select: { path: true, dimintaPada: true } })
    const doc = docs[0]
    if (!doc) return { status: 'tidak-ada', pesan: 'Status indeks ini sudah tidak ada. Muat ulang daftarnya.' }
    const { kuotaInspeksi } = await ambilPengaturanIndexing(payload)
    const terpakai = await panggilanSejak(payload, 'cek-status', awalHariPasifik(sekarang))
    const batas = batasCekManual({ terpakai, kuota: kuotaInspeksi, dimintaPada: doc.dimintaPada ? new Date(doc.dimintaPada) : null }, sekarang)
    const path = batas.boleh ? await klaimCekManual(payload, id, sekarang, JEDA_CEK_MANUAL_MS) : null
    if (!path) {
      const alasan = batas.boleh ? 'jeda' : batas.alasan
      const bolehLagi = batas.boleh ? new Date(sekarang.getTime() + JEDA_CEK_MANUAL_MS) : batas.bolehLagi
      return {
        status: 'dibatasi',
        alasan,
        bolehLagi: bolehLagi.toISOString(),
        pesan:
          alasan === 'kuota'
            ? `Batas ${kuotaInspeksi.toLocaleString('id-ID')} cek status per hari sudah tercapai. Bisa dicek lagi mulai ${teksWaktu(bolehLagi.toISOString())}.`
            : `Halaman ini baru saja diminta dicek. Bisa dicek lagi mulai ${teksWaktu(bolehLagi.toISOString())}.`,
      }
    }
    await majukanCek(payload, path, sekarang)
    return { status: 'antre', path, dimintaPada: sekarang.toISOString(), pesan: `Cek status ${path} dijalankan sekarang.` }
  }
  ```

  `src/lib/aksiAdmin.ts`

  ```ts
  import type { PayloadRequest } from 'payload'

  /**
   * Penjaga endpoint aksi admin (`POST` dari tombol di admin, misalnya "Cek sekarang"): hanya admin yang
   * masuk, dan hanya dari halaman situs sendiri. Cookie login Payload ber-SameSite Lax sehingga browser tidak
   * mengirimnya pada `POST` dari situs lain; `Sec-Fetch-Site` menolak sisanya (misalnya subdomain lain).
   * Klien tanpa header itu (skrip, tes) tetap butuh login admin. `null` berarti boleh lanjut.
   */
  export function tolakSelainAdmin(req: PayloadRequest): Response | null {
    const galat = (status: number, pesan: string) => Response.json({ status: 'gagal', pesan }, { status })
    if (!req.user) return galat(401, 'Masuk dulu sebagai admin.')
    if ((req.user as { peran?: string | null }).peran !== 'admin') return galat(403, 'Hanya admin yang bisa menjalankan aksi ini.')
    const asal = req.headers.get('sec-fetch-site')
    if (asal && asal !== 'same-origin') return galat(403, 'Permintaan dari situs lain ditolak.')
    return null
  }
  ```

  ```diff
  diff --git a/src/modules/indexer/endpoint.ts b/src/modules/indexer/endpoint.ts
  index f5187df..2c155b9 100644
  --- a/src/modules/indexer/endpoint.ts
  +++ b/src/modules/indexer/endpoint.ts
  @@ -1,9 +1,11 @@
   import { timingSafeEqual } from 'crypto'
   import type { Endpoint, Payload } from 'payload'
   
  +import { tolakSelainAdmin } from '@/lib/aksiAdmin'
   import { jalankanPantau, type AdapterPantau, type RingkasanPantau } from '@/modules/pantau'
   
  -import { jalankanIndexer, type RingkasanJalan } from './jalan'
  +import { mintaCekStatus } from './cek'
  +import { jalankanIndexer, jalankanSetelahRespons, type RingkasanJalan } from './jalan'
   
   /**
    * Header dari Vercel Cron: `Authorization: Bearer <CRON_SECRET>` (dokumentasi Vercel "Securing cron
  @@ -49,3 +51,25 @@ export const endpointJalankanJob: Endpoint = {
       return Response.json(await jalankanJadwal(req.payload))
     },
   }
  +
  +/** Path endpoint di bawah `/api/status-indeks`, dipanggil tombol "Cek sekarang" di daftar Status indeks. */
  +export const PATH_CEK_SEKARANG = '/:id/cek'
  +
  +/**
  + * `POST /api/status-indeks/{id}/cek`: "Cek sekarang" (hanya admin, dari admin situs sendiri). Cek dimasukkan
  + * ke antrean lalu antrean dijalankan setelah respons terkirim (`after()`), jadi permintaan admin tidak
  + * menunggu Google. Jawaban 202 (antre), 429 (kuota harian habis atau jeda 10 menit), atau 404.
  + */
  +export const endpointCekSekarang: Endpoint = {
  +  path: PATH_CEK_SEKARANG,
  +  method: 'post',
  +  handler: async (req) => {
  +    const tolak = tolakSelainAdmin(req)
  +    if (tolak) return tolak
  +    const id = Number(req.routeParams?.id)
  +    if (!Number.isInteger(id) || id <= 0) return Response.json({ status: 'tidak-ada', pesan: 'Status indeks tidak dikenal.' }, { status: 404 })
  +    const hasil = await mintaCekStatus(req.payload, id)
  +    if (hasil.status === 'antre') jalankanSetelahRespons(req.payload)
  +    return Response.json(hasil, { status: hasil.status === 'antre' ? 202 : hasil.status === 'dibatasi' ? 429 : 404 })
  +  },
  +}
  ```

  ```diff
  diff --git a/src/modules/indexer/index.ts b/src/modules/indexer/index.ts
  index 45a23d7..9732325 100644
  --- a/src/modules/indexer/index.ts
  +++ b/src/modules/indexer/index.ts
  @@ -65,6 +65,7 @@ async function catatKabar(payload: Payload, daftar: Kabar[], opsi: { req?: Paylo
   }
   
   export { jalankanIndexer, jalankanSetelahRespons, type RingkasanJalan } from './jalan'
  +export { mintaCekStatus, type HasilMintaCek } from './cek'
   export { bandingkanVersi } from './aturan'
   export { adapterIndexer, pakaiAdapterIndexer, type AdapterIndexer } from './adapter'
   export { adapterPalsu, type AdapterPalsu } from './palsu'
  ```

- [ ] **Langkah 4: Kolom dan tombol di daftar Status indeks**

  `src/modules/indexer/admin/SelCekSekarang.tsx`

  ```tsx
  import { jedaCekManual } from '../aturan'
  import { TombolCekSekarang } from './TombolCekSekarang'

  type BarisStatus = { id?: number | string; path?: string | null; dimintaPada?: string | null }

  /**
   * Sel kolom "Cek sekarang" di daftar Status indeks: tombol yang memajukan cek URL Inspection halaman itu.
   * Bila halaman itu baru diminta dicek (jeda 10 menit), tombol langsung tampil dibatasi dengan waktu boleh
   * lagi; kuota harian diperiksa saat tombol ditekan.
   */
  export function SelCekSekarang({ rowData }: { rowData?: BarisStatus }) {
    if (!rowData?.id || !rowData.path) return null
    const jeda = jedaCekManual(rowData.dimintaPada)
    return <TombolCekSekarang id={Number(rowData.id)} path={rowData.path} bolehLagi={jeda?.toISOString() ?? null} />
  }
  ```

  `src/modules/indexer/admin/TombolCekSekarang.tsx`

  ```tsx
  'use client'

  import { useRouter } from 'next/navigation'
  import { useState } from 'react'

  import { teksWaktu } from '@/modules/pantau/format'

  import { LABEL_STATUS_INDEKS, type StatusIndeks } from '../tipe'

  import './indexing.scss'

  type Keadaan = { tahap: 'siap' | 'berjalan' | 'dibatasi'; pesan: string }

  /** Jeda dan jumlah pemeriksaan hasil: cek dijalankan setelah respons (`after()`), biasanya selesai dalam beberapa detik. */
  const JEDA_TANYA_MS = 1000
  const MAKS_TANYA = 20

  const tunggu = (ms: number) => new Promise((selesai) => setTimeout(selesai, ms))

  /**
   * Tombol "Cek sekarang" satu status indeks (Rencana 8B): `POST /api/status-indeks/{id}/cek`, lalu menanyakan
   * hasilnya sampai cek terakhir lebih baru dari permintaan ini dan menyegarkan daftar. Keadaan (sedang dicek,
   * selesai, dibatasi, galat) dibacakan pembaca layar lewat `role="status"`. Selama berjalan tombol
   * `aria-disabled` supaya fokus keyboard tidak hilang.
   */
  export function TombolCekSekarang({ id, path, bolehLagi }: { id: number; path: string; bolehLagi: string | null }) {
    const router = useRouter()
    const [keadaan, setKeadaan] = useState<Keadaan>(
      bolehLagi ? { tahap: 'dibatasi', pesan: `Baru saja diminta dicek. Bisa dicek lagi mulai ${teksWaktu(bolehLagi)}.` } : { tahap: 'siap', pesan: '' },
    )

    async function cek() {
      if (keadaan.tahap !== 'siap') return
      setKeadaan({ tahap: 'berjalan', pesan: 'Sedang dicek di Google.' })
      try {
        const jawaban = await fetch(`/api/status-indeks/${id}/cek`, { method: 'POST', credentials: 'same-origin' })
        const hasil = (await jawaban.json()) as { status: string; pesan: string; dimintaPada?: string }
        if (hasil.status !== 'antre' || !hasil.dimintaPada) {
          setKeadaan({ tahap: hasil.status === 'dibatasi' ? 'dibatasi' : 'siap', pesan: hasil.pesan })
          return
        }
        for (let i = 0; i < MAKS_TANYA; i++) {
          await tunggu(JEDA_TANYA_MS)
          const doc = (await (await fetch(`/api/status-indeks/${id}?depth=0`, { credentials: 'same-origin' })).json()) as {
            status?: StatusIndeks
            cekTerakhir?: string | null
          }
          if (doc.cekTerakhir && doc.status && doc.cekTerakhir >= hasil.dimintaPada) {
            setKeadaan({ tahap: 'dibatasi', pesan: `Selesai dicek: ${LABEL_STATUS_INDEKS[doc.status]}.` })
            router.refresh()
            return
          }
        }
        setKeadaan({ tahap: 'dibatasi', pesan: 'Cek masih menunggu giliran. Muat ulang daftar ini sebentar lagi untuk melihat hasilnya.' })
      } catch {
        setKeadaan({ tahap: 'siap', pesan: 'Permintaan gagal. Periksa koneksi, lalu coba lagi.' })
      }
    }

    return (
      <div className="indexing-cek">
        <button
          type="button"
          className="indexing-cek__tombol"
          aria-disabled={keadaan.tahap !== 'siap'}
          onClick={cek}
        >
          {keadaan.tahap === 'berjalan' ? 'Mengecek' : 'Cek sekarang'}
          <span className="indexing-cek__sr"> {path}</span>
        </button>
        <p role="status" className="indexing-cek__pesan">
          {keadaan.pesan}
        </p>
      </div>
    )
  }
  ```

  ```diff
  diff --git a/src/modules/indexer/admin/indexing.scss b/src/modules/indexer/admin/indexing.scss
  index 2b99176..ad7b73a 100644
  --- a/src/modules/indexer/admin/indexing.scss
  +++ b/src/modules/indexer/admin/indexing.scss
  @@ -97,3 +97,61 @@
       margin-bottom: calc(var(--base) * 0.5);
     }
   }
  +
  +// Tombol "Cek sekarang" di daftar Status indeks. Cincin fokus ditulis sendiri karena CSS admin Payload
  +// menghapus outline; keadaan dibatasi dan berjalan memakai aria-disabled (fokus tetap di tombol).
  +.indexing-cek {
  +  display: grid;
  +  gap: 4px;
  +  justify-items: start;
  +  max-width: 22rem;
  +}
  +
  +.indexing-cek__tombol {
  +  min-height: 44px;
  +  padding: 0 14px;
  +  border: 1px solid var(--theme-elevation-800);
  +  border-radius: 999px;
  +  background: var(--theme-elevation-0);
  +  color: var(--theme-text);
  +  font: inherit;
  +  font-weight: 600;
  +  white-space: nowrap;
  +  cursor: pointer;
  +
  +  &:hover {
  +    background: var(--theme-elevation-100);
  +  }
  +
  +  &:focus-visible {
  +    outline: 2px solid var(--theme-text);
  +    outline-offset: 2px;
  +  }
  +
  +  &[aria-disabled='true'] {
  +    border-color: var(--theme-elevation-400);
  +    color: var(--theme-elevation-650);
  +    cursor: not-allowed;
  +  }
  +}
  +
  +.indexing-cek__sr {
  +  position: absolute;
  +  width: 1px;
  +  height: 1px;
  +  overflow: hidden;
  +  clip-path: inset(50%);
  +  white-space: nowrap;
  +}
  +
  +.indexing-cek__pesan {
  +  margin: 0;
  +  color: var(--theme-text);
  +  font-size: 13px;
  +  line-height: 1.4;
  +  white-space: normal;
  +
  +  &:empty {
  +    display: none;
  +  }
  +}
  ```

  ```diff
  diff --git a/src/collections/StatusIndeks.ts b/src/collections/StatusIndeks.ts
  index e18fcc3..079944e 100644
  --- a/src/collections/StatusIndeks.ts
  +++ b/src/collections/StatusIndeks.ts
  @@ -1,11 +1,13 @@
   import type { CollectionConfig } from 'payload'
   
   import { isAdmin, nobody } from '@/access'
  +import { endpointCekSekarang } from '@/modules/indexer/endpoint'
   import { LABEL_STATUS_INDEKS, STATUS_INDEKS } from '@/modules/indexer/tipe'
   
   /**
    * Status indeks Google per path publik (spesifikasi §6 `statusIndeks`), diisi cek status URL
    * Inspection +6 jam sampai +30 hari setelah terbit. Path yang dihapus atau pindah keluar dari sini.
  + * Kolom "Cek sekarang" memajukan cek satu halaman lewat `POST /api/status-indeks/{id}/cek` (Rencana 8B).
    */
   export const StatusIndeks: CollectionConfig = {
     slug: 'status-indeks',
  @@ -13,11 +15,12 @@ export const StatusIndeks: CollectionConfig = {
     defaultSort: '-updatedAt',
     admin: {
       useAsTitle: 'path',
  -    defaultColumns: ['path', 'status', 'cekTerakhir', 'cekBerikutnya', 'detail'],
  +    defaultColumns: ['path', 'status', 'cekTerakhir', 'cekBerikutnya', 'cekSekarang', 'detail'],
       group: 'SEO',
       description: 'Status di Google untuk setiap halaman yang terbit, dicek otomatis sampai 30 hari setelah terbit atau perubahan besar.',
     },
     access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  +  endpoints: [endpointCekSekarang],
     fields: [
       { name: 'path', type: 'text', required: true, unique: true, index: true },
       {
  @@ -33,5 +36,13 @@ export const StatusIndeks: CollectionConfig = {
       { name: 'dirayapiPada', type: 'date', label: 'Dirayapi Google', admin: { date: { pickerAppearance: 'dayAndTime' } } },
       { name: 'cekTerakhir', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
       { name: 'cekBerikutnya', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
  +    // Permintaan "Cek sekarang" terakhir; jeda 10 menit dihitung dari sini (klaim atomik di modul indexer).
  +    { name: 'dimintaPada', type: 'date', label: 'Cek manual terakhir', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
  +    {
  +      name: 'cekSekarang',
  +      type: 'ui',
  +      label: 'Cek sekarang',
  +      admin: { components: { Cell: '@/modules/indexer/admin/SelCekSekarang#SelCekSekarang' } },
  +    },
     ],
   }
  ```

  Lalu buat ulang tipe dan import map, dan dorong kolom baru ke database dev sebelum build:

  ```bash
  pnpm generate:types
  pnpm generate:importmap
  pnpm seed
  ```

  `src/payload-types.ts` bertambah `dimintaPada` di `StatusIndek` dan `StatusIndeksSelect`; import map bertambah `SelCekSekarang`.

- [ ] **Langkah 5: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 520 tes (76 file); integrasi 152 tes (45 file); E2E 149 tes. Tes integrasi menambah kolom `diminta_pada` ke database tes tanpa pertanyaan DATA LOSS (perubahan aditif); bila pertanyaan itu muncul, jangan jawab, buang database yang bersangkutan.

- [ ] **Langkah 6: Commit**

  ```bash
  git add "src/app/(payload)/admin/importMap.js" src/collections/StatusIndeks.ts src/lib/aksiAdmin.ts src/modules/indexer/admin/SelCekSekarang.tsx src/modules/indexer/admin/TombolCekSekarang.tsx src/modules/indexer/admin/indexing.scss src/modules/indexer/antrean.ts src/modules/indexer/aturan.ts src/modules/indexer/cek.ts src/modules/indexer/endpoint.ts src/modules/indexer/index.ts src/payload-types.ts tests/e2e/pantau-aksi.spec.ts tests/int/indexer-cek.int.spec.ts tests/unit/indexer-aturan.test.ts
  git commit -m "feat(indexer): tombol Cek sekarang di daftar Status indeks memajukan cek URL Inspection lewat antrean dan after() (hanya admin dari situs sendiri), dibatasi kuota cek harian dan jeda 10 menit per halaman dengan klaim atomik, umpan balik role=status"
  ```

---

### Task 7: Tombol "Pindai ulang sekarang" di dashboard SEO

**Files:**
- Create: `src/modules/pantau/endpoint.ts`, `src/modules/pantau/admin/TombolPindaiUlang.tsx`, `tests/int/pantau-pindai.int.spec.ts`
- Modify: `src/modules/pantau/aturan.ts`, `src/modules/pantau/tugas.ts`, `src/modules/pantau/index.ts`, `src/modules/pantau/dashboard.ts`, `src/modules/pantau/admin/BagianDashboard.tsx`, `src/modules/pantau/admin/DashboardSeo.tsx`, `src/modules/pantau/admin/dashboard.scss`, `src/collections/TugasSeo.ts`, `tests/unit/pantau-aturan.test.ts`, `tests/unit/pantau-dashboard.test.ts`, `tests/int/pantau-dashboard.int.spec.ts`, `tests/e2e/pantau-aksi.spec.ts`
- Test: `tests/unit/pantau-aturan.test.ts`, `tests/unit/pantau-dashboard.test.ts`, `tests/int/pantau-pindai.int.spec.ts`, `tests/int/pantau-dashboard.int.spec.ts`, `tests/e2e/pantau-aksi.spec.ts`

**Interfaces:**
- Consumes: `tolakSelainAdmin` (Task 6); `klaimTugas`, `selesaikanTugas`, `jalankanPantau`, `adapterPalsu` (`pantau`); `teksWaktu` (`pantau/format.ts`); `MENIT` (`indexer/aturan.ts`).
- Produces:
  - `pantau/aturan.ts`: `JEDA_PINDAI_MANUAL_MS` (10 menit), `batasPindaiManual(tugas, sekarang): BatasPindai` (`{ boleh: true }` atau `{ boleh: false; alasan: 'berjalan' | 'jeda'; bolehLagi: Date }`).
  - `pantau/tugas.ts`: `majukanTugas(payload, jenis, sekarang, jedaMs): Promise<boolean>` (satu `UPDATE ... RETURNING`).
  - `pantau/index.ts`: `mintaPindai(payload, opsi?): Promise<HasilMintaPindai>`, `pesanBatasPindai(alasan, bolehLagi)`, `jalankanPantauSetelahRespons(payload, tugas)`.
  - `pantau/endpoint.ts`: `endpointPindaiUlang` (`POST /api/tugas-seo/pindai`, 202 atau 429), dipasang di koleksi `tugas-seo`.
  - `DataDashboard.pindai` (boleh, atau alasan dan waktu boleh lagi sebagai ISO) dan `InfoTugas.mulai`; `BagianTautan` menerima `pindai` dan menampilkan `TombolPindaiUlang({ batas })`.

Pindai tautan harian (Rencana 6B) membaca semua konten terbit, menu, dan beranda, lalu memeriksa sampai 10 tautan ke situs lain. Tombol ini untuk melihat hasil setelah tautan diperbaiki tanpa menunggu besok: endpoint memajukan `berikutnya` tugas `tautan` ke sekarang, lalu `after()` menjalankan `jalankanPantau(payload, { tugas: ['tautan'] })`. Klaim tugas tetap lewat `klaimTugas` (atomik), jadi dua klik cepat, atau klik dan cron bersamaan, hanya memindai sekali (tes integrasi menjalankan dua pelari bersamaan).

Permintaan ditolak (429) selama tugas sedang berjalan dengan sewa yang masih berlaku, atau bila pindai terakhir (manual atau cron) dimulai kurang dari 10 menit lalu; sewa yang habis (proses berhenti di tengah jalan) tidak menahan. Keadaan awal tombol dihitung server dari baris tugas (`ambilDashboard` sudah menerima `sekarang`), jadi tombol langsung tampil dibatasi dengan waktu boleh lagi. Umpan balik di `role="status"`: "Memindai tautan di semua konten terbit.", lalu "Pindai selesai. {ringkasan pindai}" dan dashboard disegarkan (`router.refresh()`), atau "Pindai tautan baru saja dijalankan. Bisa dipindai lagi mulai {waktu} WIB."

E2E memulai dari keadaan belum pernah dipindai (menghapus baris tugas lewat REST sebagai admin), karena `pantau.spec.ts` dan cron bisa sudah menjalankan pindai.

- [ ] **Langkah 1: Tulis tes yang gagal**

  ```diff
  diff --git a/tests/unit/pantau-aturan.test.ts b/tests/unit/pantau-aturan.test.ts
  index 6aa4291..5ea8fb6 100644
  --- a/tests/unit/pantau-aturan.test.ts
  +++ b/tests/unit/pantau-aturan.test.ts
  @@ -1,9 +1,11 @@
   import { describe, expect, it } from 'vitest'
   
   import {
  +  batasPindaiManual,
     geserTanggal,
     hariSitus,
     hrefDari,
  +  JEDA_PINDAI_MANUAL_MS,
     jadwalCekTautan,
     jadwalTugas,
     pathDariUrl,
  @@ -105,6 +107,24 @@ describe('jadwal tugas harian', () => {
       expect(jadwalTugas('gagal', sekarang).toISOString()).toBe('2026-11-05T04:00:00.000Z')
     })
   
  +  it('"Pindai ulang sekarang": boleh bila tidak sedang berjalan dan pindai terakhir dimulai lebih dari 10 menit lalu', () => {
  +    expect(JEDA_PINDAI_MANUAL_MS).toBe(10 * 60_000)
  +    expect(batasPindaiManual(null, sekarang)).toEqual({ boleh: true })
  +    expect(batasPindaiManual({ status: 'berhasil', mulai: '2026-11-05T02:50:00.000Z', berikutnya: '2026-11-05T08:00:00.000Z' }, sekarang)).toEqual({ boleh: true })
  +    expect(batasPindaiManual({ status: 'berhasil', mulai: '2026-11-05T02:55:00.000Z', berikutnya: '2026-11-05T08:00:00.000Z' }, sekarang)).toEqual({
  +      boleh: false,
  +      alasan: 'jeda',
  +      bolehLagi: new Date('2026-11-05T03:05:00.000Z'),
  +    })
  +    // Sedang berjalan selama sewa berlaku; sewa yang habis (proses berhenti) tidak menahan.
  +    expect(batasPindaiManual({ status: 'berjalan', mulai: '2026-11-05T02:58:00.000Z', berikutnya: '2026-11-05T03:13:00.000Z' }, sekarang)).toEqual({
  +      boleh: false,
  +      alasan: 'berjalan',
  +      bolehLagi: new Date('2026-11-05T03:13:00.000Z'),
  +    })
  +    expect(batasPindaiManual({ status: 'berjalan', mulai: '2026-11-05T02:40:00.000Z', berikutnya: '2026-11-05T02:55:00.000Z' }, sekarang)).toEqual({ boleh: true })
  +  })
  +
     it('tautan luar dicek ulang seminggu sekali, atau besok bila hasilnya belum pasti', () => {
       expect(jadwalCekTautan('baik', sekarang).toISOString()).toBe('2026-11-12T03:00:00.000Z')
       expect(jadwalCekTautan('rusak', sekarang).toISOString()).toBe('2026-11-12T03:00:00.000Z')
  ```

  ```diff
  diff --git a/tests/unit/pantau-dashboard.test.ts b/tests/unit/pantau-dashboard.test.ts
  index fe2dc15..f2398b8 100644
  --- a/tests/unit/pantau-dashboard.test.ts
  +++ b/tests/unit/pantau-dashboard.test.ts
  @@ -1,11 +1,14 @@
   import { createElement as h } from 'react'
   import { renderToStaticMarkup } from 'react-dom/server'
  -import { describe, expect, it } from 'vitest'
  +import { describe, expect, it, vi } from 'vitest'
   
   import { Bagian404, BagianSearchConsole, BagianTautan, BagianYatim } from '@/modules/pantau/admin/BagianDashboard'
   import { ringkasSitus } from '@/modules/pantau/aturan'
   import type { DataDashboard, InfoTugas } from '@/modules/pantau/dashboard'
   
  +// Tombol Pindai ulang sekarang (komponen klien) memakai router App Router untuk menyegarkan dashboard.
  +vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }))
  +
   /** Teks yang terlihat: tag dibuang, spasi biasa dirapikan (spasi tak putus dari `Intl` dipertahankan). */
   const teks = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[ \t\r\n]+/g, ' ').trim()
   
  @@ -13,6 +16,7 @@ const KOSONG: DataDashboard['analitik'] = { sampai: null, situs: null, halaman:
   const info = (status: InfoTugas['status'], pesan: string): InfoTugas => ({
     status,
     pesan,
  +  mulai: '2026-11-05T02:59:00.000Z',
     selesai: '2026-11-05T03:00:00.000Z',
     berikutnya: '2026-11-05T04:00:00.000Z',
   })
  @@ -62,14 +66,29 @@ describe('keadaan dashboard SEO', () => {
     it('tautan rusak, halaman yatim, dan 404: daftar dengan tautan perbaikan, atau keadaan kosong yang jelas', () => {
       const t = tugas(null, info('berhasil', '12 tautan dipindai.'))
       const rusak = renderToStaticMarkup(
  -      h(BagianTautan, { tautan: [{ jenis: 'rusak', tujuan: '/tidak-ada', pesan: 'Tidak ada halaman.', sumber: [{ judul: 'Cara hitung THR', href: '/admin/collections/artikel/5' }] }], tugas: t }),
  +      h(BagianTautan, {
  +        tautan: [{ jenis: 'rusak', tujuan: '/tidak-ada', pesan: 'Tidak ada halaman.', sumber: [{ judul: 'Cara hitung THR', href: '/admin/collections/artikel/5' }] }],
  +        tugas: t,
  +        pindai: { boleh: true },
  +      }),
       )
       expect(teks(rusak)).toContain('Rusak /tidak-ada Tidak ada halaman. Ada di Cara hitung THR')
  -    expect(teks(renderToStaticMarkup(h(BagianTautan, { tautan: [], tugas: t })))).toContain('Tidak ada tautan rusak di konten terbit.')
  +    expect(teks(renderToStaticMarkup(h(BagianTautan, { tautan: [], tugas: t, pindai: { boleh: true } })))).toContain('Tidak ada tautan rusak di konten terbit.')
       expect(teks(renderToStaticMarkup(h(BagianYatim, { yatim: [], tugas: tugas(null) })))).toContain('Belum dipindai. Pindai tautan berjalan otomatis sekali sehari.')
       expect(teks(renderToStaticMarkup(h(BagianYatim, { yatim: [], tugas: t })))).toContain('Semua artikel dan halaman terbit sudah punya tautan masuk.')
       const log404 = renderToStaticMarkup(h(Bagian404, { log404: [{ path: '/jalan-lama', jumlah: 3, terakhir: null, redirect: null }] }))
       expect(log404).toContain('<a href="/admin/collections/redirect/create?dari=%2Fjalan-lama" aria-label="Buat redirect untuk /jalan-lama">Buat redirect</a>')
       expect(teks(renderToStaticMarkup(h(Bagian404, { log404: [] })))).toContain('Belum ada kunjungan ke halaman yang tidak ada.')
     })
  +
  +  it('tombol "Pindai ulang sekarang": siap, atau dibatasi dengan alasan dan waktu boleh lagi yang dibacakan role="status"', () => {
  +    const t = tugas(null, info('berhasil', '12 tautan dipindai.'))
  +    const siap = renderToStaticMarkup(h(BagianTautan, { tautan: [], tugas: t, pindai: { boleh: true } }))
  +    expect(siap).toMatch(/<button type="button" class="pantau-aksi__tombol" aria-disabled="false">Pindai ulang sekarang<\/button><p role="status" class="pantau-aksi__pesan"><\/p>/)
  +    const jeda = renderToStaticMarkup(h(BagianTautan, { tautan: [], tugas: t, pindai: { boleh: false, alasan: 'jeda', bolehLagi: '2026-11-05T03:09:00.000Z' } }))
  +    expect(jeda).toContain('aria-disabled="true"')
  +    expect(teks(jeda)).toContain('Pindai tautan baru saja dijalankan. Bisa dipindai lagi mulai 5 Nov 2026, 10.09 WIB.')
  +    const berjalan = renderToStaticMarkup(h(BagianTautan, { tautan: [], tugas: t, pindai: { boleh: false, alasan: 'berjalan', bolehLagi: '2026-11-05T03:14:00.000Z' } }))
  +    expect(teks(berjalan)).toContain('Pindai tautan sedang berjalan. Hasilnya tampil di sini setelah selesai.')
  +  })
   })
  ```

  `tests/int/pantau-pindai.int.spec.ts`

  ```ts
  import type { Payload, PayloadRequest } from 'payload'
  import { beforeEach, describe, expect, it } from 'vitest'

  import { adapterPalsu, jalankanPantau, mintaPindai } from '@/modules/pantau'
  import { endpointPindaiUlang } from '@/modules/pantau/endpoint'
  import { klaimTugas } from '@/modules/pantau/tugas'

  import { getTestPayload } from './helpers'

  const T0 = new Date('2026-11-05T03:00:00.000Z')
  const menit = (n: number) => new Date(T0.getTime() + n * 60_000)
  const palsu = adapterPalsu()

  async function kosongkan(payload: Payload) {
    await payload.delete({ collection: 'tugas-seo', where: { id: { exists: true } } })
    palsu.reset()
  }

  async function tugasTautan(payload: Payload) {
    const { docs } = await payload.find({ collection: 'tugas-seo', where: { jenis: { equals: 'tautan' } }, depth: 0 })
    return docs.map((d) => ({ status: d.status ?? null, mulai: d.mulai ?? null, berikutnya: d.berikutnya }))
  }

  async function panggil(user: unknown, headers: Record<string, string> = {}) {
    const payload = await getTestPayload()
    return endpointPindaiUlang.handler({ payload, headers: new Headers(headers), user } as unknown as PayloadRequest)
  }

  describe('"Pindai ulang sekarang" di dashboard SEO', () => {
    beforeEach(async () => {
      await kosongkan(await getTestPayload())
    })

    it('memajukan tugas pindai ke sekarang; cron atau after() menjalankannya sekali; lalu jeda 10 menit sejak mulai', async () => {
      const payload = await getTestPayload()
      // Pindai harian sudah berjalan tadi pagi: jadwal berikutnya besok.
      await payload.create({ collection: 'tugas-seo', data: { jenis: 'tautan', status: 'berhasil', mulai: menit(-120).toISOString(), selesai: menit(-119).toISOString(), berikutnya: '2026-11-05T08:00:00.000Z' } })

      expect(await mintaPindai(payload, { sekarang: T0 })).toEqual({ status: 'antre', diminta: T0.toISOString(), pesan: 'Pindai tautan dijalankan sekarang.' })
      expect(await tugasTautan(payload)).toEqual([{ status: 'berhasil', mulai: menit(-120).toISOString(), berikutnya: T0.toISOString() }])

      // Dua pelari bersamaan (dua klik, atau cron dan after()): tugas diklaim atomik, pindai hanya sekali.
      const [satu, dua] = await Promise.all([
        jalankanPantau(payload, { sekarang: T0, adapter: palsu, tugas: ['tautan'] }),
        jalankanPantau(payload, { sekarang: T0, adapter: palsu, tugas: ['tautan'] }),
      ])
      expect([satu.tautan?.status, dua.tautan?.status].filter(Boolean)).toEqual(['berhasil'])
      expect(await tugasTautan(payload)).toEqual([{ status: 'berhasil', mulai: T0.toISOString(), berikutnya: '2026-11-05T08:00:00.000Z' }])

      const jeda = await mintaPindai(payload, { sekarang: menit(5) })
      expect(jeda).toEqual({
        status: 'dibatasi',
        alasan: 'jeda',
        bolehLagi: menit(10).toISOString(),
        pesan: 'Pindai tautan baru saja dijalankan. Bisa dipindai lagi mulai 5 Nov 2026, 10.10 WIB.',
      })
      expect((await mintaPindai(payload, { sekarang: menit(10) })).status).toBe('antre')
    })

    it('tugas yang belum pernah berjalan langsung dijalankan; tugas yang sedang berjalan (sewa berlaku) ditolak', async () => {
      const payload = await getTestPayload()
      expect((await mintaPindai(payload, { sekarang: T0 })).status).toBe('antre')
      expect(await tugasTautan(payload)).toEqual([{ status: null, mulai: null, berikutnya: T0.toISOString() }])

      expect(await klaimTugas(payload, 'tautan', menit(20))).not.toBeNull()
      expect(await mintaPindai(payload, { sekarang: menit(31) })).toMatchObject({
        status: 'dibatasi',
        alasan: 'berjalan',
        pesan: 'Pindai tautan sedang berjalan. Hasilnya tampil di sini setelah selesai.',
      })
      // Sewa 15 menit habis (proses berhenti): boleh lagi.
      expect((await mintaPindai(payload, { sekarang: menit(36) })).status).toBe('antre')
    })

    it('endpoint POST /api/tugas-seo/pindai: hanya admin dari situs sendiri; 202 lalu 429', async () => {
      const admin = { id: 1, peran: 'admin', collection: 'pengguna' }
      expect((await panggil(null)).status).toBe(401)
      expect((await panggil({ ...admin, peran: 'editor' })).status).toBe(403)
      expect((await panggil(admin, { 'sec-fetch-site': 'same-site' })).status).toBe(403)
      const jawaban = await panggil(admin, { 'sec-fetch-site': 'same-origin' })
      expect(jawaban.status).toBe(202)
      expect(await jawaban.json()).toMatchObject({ status: 'antre', pesan: 'Pindai tautan dijalankan sekarang.' })
      // Belum dijalankan (di luar permintaan Next, after() tidak berjalan): tetap antre, tidak menolak.
      expect((await panggil(admin)).status).toBe(202)
      const payload = await getTestPayload()
      await jalankanPantau(payload, { adapter: palsu, tugas: ['tautan'] })
      const ditolak = await panggil(admin)
      expect(ditolak.status).toBe(429)
      expect(await ditolak.json()).toMatchObject({ status: 'dibatasi', alasan: 'jeda' })
    })
  })
  ```

  ```diff
  diff --git a/tests/int/pantau-dashboard.int.spec.ts b/tests/int/pantau-dashboard.int.spec.ts
  index 905cd60..c1b15d1 100644
  --- a/tests/int/pantau-dashboard.int.spec.ts
  +++ b/tests/int/pantau-dashboard.int.spec.ts
  @@ -20,6 +20,7 @@ describe('data dashboard SEO', () => {
       await kosongkan(payload)
       expect(await ambilDashboard(payload, T0)).toEqual({
         tugas: { analitik: null, tautan: null },
  +      pindai: { boleh: true },
         analitik: { sampai: null, situs: null, halaman: [], jumlahHalaman: 0 },
         statusIndeks: [],
         log: { gagal7Hari: 0, terbaru: [] },
  @@ -78,7 +79,7 @@ describe('data dashboard SEO', () => {
   
       const data = await ambilDashboard(payload, T0)
       expect(data.tugas).toEqual({
  -      analitik: { status: 'berhasil', pesan: 'Data sampai 2026-11-02.', selesai: T0.toISOString(), berikutnya: '2026-11-05T08:00:00.000Z' },
  +      analitik: { status: 'berhasil', pesan: 'Data sampai 2026-11-02.', mulai: null, selesai: T0.toISOString(), berikutnya: '2026-11-05T08:00:00.000Z' },
         tautan: null,
       })
       expect(data.analitik).toMatchObject({ sampai: '2026-11-02', jumlahHalaman: 22, situs: { klik: 60, impresi: 4000, ctr: 0.015, posisi: 6 } })
  ```

  ```diff
  diff --git a/tests/e2e/pantau-aksi.spec.ts b/tests/e2e/pantau-aksi.spec.ts
  index b64e729..0a8e581 100644
  --- a/tests/e2e/pantau-aksi.spec.ts
  +++ b/tests/e2e/pantau-aksi.spec.ts
  @@ -41,8 +41,33 @@ test('daftar Status indeks: "Cek sekarang" mengecek satu halaman lewat antrean,
     expect((await page.request.post(`/api/status-indeks/${docs[0].id}/cek`)).status()).toBe(401)
   })
   
  +test('dashboard SEO: "Pindai ulang sekarang" memindai tautan setelah respons, hasilnya tampil, lalu dibatasi 10 menit', async ({ page }) => {
  +  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  +  // Mulai dari keadaan belum pernah dipindai (spec lain bisa sudah menjalankan cron).
  +  expect((await page.request.delete('/api/tugas-seo?where[jenis][equals]=tautan')).ok()).toBe(true)
  +  await page.goto('/admin/seo')
  +  const bagian = page.getByRole('region', { name: 'Tautan rusak' })
  +  await expect(bagian).toContainText('Pindai tautan: belum pernah berjalan.')
  +  const tombol = bagian.getByRole('button', { name: 'Pindai ulang sekarang' })
  +  await expect(tombol).toHaveAttribute('aria-disabled', 'false')
  +  await periksaAxe(page, '.pantau-aksi')
  +
  +  await tombol.click()
  +  await expect(bagian.getByRole('status')).toHaveText(/^Pindai selesai\. \d+ tautan dipindai: /)
  +  await expect(bagian).toContainText('Pindai tautan: berhasil')
  +  await expect(tombol).toHaveAttribute('aria-disabled', 'true')
  +  await expect(tombol).toBeFocused()
  +
  +  await page.reload()
  +  await expect(bagian.getByRole('status')).toHaveText(/^Pindai tautan baru saja dijalankan\. Bisa dipindai lagi mulai \d{1,2} \w{3} \d{4}, \d{2}\.\d{2} WIB\.$/)
  +  const ulang = await page.request.post('/api/tugas-seo/pindai')
  +  expect(ulang.status()).toBe(429)
  +  expect((await ulang.json()).alasan).toBe('jeda')
  +  await periksaAxe(page, '.pantau-aksi')
  +})
  +
   for (const tema of ['light', 'dark'] as const) {
  -  test(`tombol "Cek sekarang" tema ${tema}: lolos axe dan cincin fokus terlihat, daftar tanpa geser horizontal di 375 px`, async ({ page }) => {
  +  test(`tombol "Cek sekarang" dan "Pindai ulang sekarang" tema ${tema}: lolos axe dan cincin fokus terlihat, tanpa geser horizontal di 375 px`, async ({ page }) => {
       await page.context().addCookies([{ name: 'payload-theme', value: tema, domain: 'localhost', path: '/' }])
       await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
       await page.goto(`/admin/collections/status-indeks?where[path][equals]=${encodeURIComponent(`/${SLUG.tekno}`)}`)
  @@ -52,5 +77,14 @@ for (const tema of ['light', 'dark'] as const) {
       await periksaAxe(page, '.indexing-cek')
       await page.setViewportSize({ width: 375, height: 812 })
       await periksaTanpaGeserHorizontal(page)
  +
  +    await page.setViewportSize({ width: 1440, height: 900 })
  +    await page.goto('/admin/seo')
  +    const pindai = page.getByRole('button', { name: /^(Pindai ulang sekarang|Memindai)$/ })
  +    await pindai.focus()
  +    expect(await pindai.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid')
  +    await periksaAxe(page, '.pantau-aksi')
  +    await page.setViewportSize({ width: 375, height: 812 })
  +    await periksaTanpaGeserHorizontal(page)
     })
   }
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/pantau-aturan.test.ts tests/unit/pantau-dashboard.test.ts
  pnpm exec cross-env NODE_OPTIONS=--no-deprecation vitest run --config ./vitest.int.config.mts tests/int/pantau-pindai.int.spec.ts tests/int/pantau-dashboard.int.spec.ts
  ```

  Hasil yang diharapkan: unit FAIL di dua tes (16 lain lulus): `AssertionError: expected undefined to be 600000 // Object.is equality` (aturan) dan pesan yang diawali `AssertionError: expected '<section class="pantau-bagian pantau-…' to match /…/button><p role="status" class="pantau-aksi__pesan">` (tombol belum ada); integrasi FAIL: `tests/int/pantau-pindai.int.spec.ts` dengan `Error: Cannot find package '@/modules/pantau/endpoint' imported from '.../tests/int/pantau-pindai.int.spec.ts'`, dan kedua tes `pantau-dashboard.int.spec.ts` dengan `AssertionError: expected { …(7) } to deeply equal { …(8) }` dan `AssertionError: expected { analitik: { …(4) }, tautan: null } to deeply equal { analitik: { …(5) }, tautan: null }`.

- [ ] **Langkah 3: Aturan, klaim, dan permintaan pindai**

  ```diff
  diff --git a/src/modules/pantau/aturan.ts b/src/modules/pantau/aturan.ts
  index 492543d..6f0941c 100644
  --- a/src/modules/pantau/aturan.ts
  +++ b/src/modules/pantau/aturan.ts
  @@ -1,4 +1,4 @@
  -import { besokPasifik, HARI, JAM } from '@/modules/indexer/aturan'
  +import { besokPasifik, HARI, JAM, MENIT } from '@/modules/indexer/aturan'
   
   import type {
     BarisAnalitik,
  @@ -188,6 +188,29 @@ export function jadwalTugas(hasil: HasilTugas, sekarang: Date): Date {
     return besokPasifik(sekarang)
   }
   
  +/**
  + * Jeda minimal antara dua pindai tautan yang diminta manual ("Pindai ulang sekarang"), dihitung dari mulai
  + * pindai terakhir (manual atau cron). Satu pindai membaca semua konten terbit dan memeriksa sampai 10 tautan
  + * luar, jadi klik berulang dibatasi tanpa menghalangi pemeriksaan ulang setelah tautan diperbaiki.
  + */
  +export const JEDA_PINDAI_MANUAL_MS = 10 * MENIT
  +
  +export type BatasPindai = { boleh: true } | { boleh: false; alasan: 'berjalan' | 'jeda'; bolehLagi: Date }
  +
  +/**
  + * Apakah "Pindai ulang sekarang" boleh dijalankan: tidak sedang berjalan (sewa tugas masih berlaku), dan
  + * pindai terakhir dimulai lebih dari `JEDA_PINDAI_MANUAL_MS` lalu. `tugas`: baris `tugas-seo` jenis `tautan`.
  + */
  +export function batasPindaiManual(
  +  tugas: { status?: string | null; mulai?: string | null; berikutnya?: string | null } | null,
  +  sekarang: Date,
  +): BatasPindai {
  +  const berikutnya = tugas?.berikutnya ? new Date(tugas.berikutnya) : null
  +  if (tugas?.status === 'berjalan' && berikutnya && berikutnya > sekarang) return { boleh: false, alasan: 'berjalan', bolehLagi: berikutnya }
  +  const jeda = tugas?.mulai ? new Date(tugas.mulai).getTime() + JEDA_PINDAI_MANUAL_MS : 0
  +  return jeda > sekarang.getTime() ? { boleh: false, alasan: 'jeda', bolehLagi: new Date(jeda) } : { boleh: true }
  +}
  +
   /**
    * Tujuan tautan dari isian CMS (URL menu, tombol, sumber, tautan Lexical). Path situs dan URL lengkap
    * ke host situs menjadi `internal`; `http(s)` lain menjadi `luar`. Jangkar, `mailto:`, `tel:`, dan isian
  ```

  ```diff
  diff --git a/src/modules/pantau/tugas.ts b/src/modules/pantau/tugas.ts
  index 25a367b..f2d7cdc 100644
  --- a/src/modules/pantau/tugas.ts
  +++ b/src/modules/pantau/tugas.ts
  @@ -44,3 +44,23 @@ export async function selesaikanTugas(
       depth: 0,
     })
   }
  +
  +/**
  + * Memajukan tugas ke `sekarang` atas permintaan admin ("Pindai ulang sekarang"): `berikutnya` diisi `sekarang`
  + * hanya bila tugas tidak sedang berjalan (sewa masih berlaku) dan mulai terakhirnya lebih dari `jedaMs` lalu.
  + * Satu `UPDATE ... RETURNING`; tugasnya sendiri tetap diklaim atomik oleh `klaimTugas`, jadi dua permintaan
  + * bersamaan tidak menjalankan pindai dua kali. `false` bila ditolak.
  + */
  +export async function majukanTugas(payload: Payload, jenis: JenisTugas, sekarang: Date, jedaMs: number): Promise<boolean> {
  +  const db = payload.db.drizzle
  +  await db.execute(sql`
  +    insert into tugas_seo (jenis, berikutnya, versi) values (${jenis}, ${sekarang.toISOString()}, 0)
  +    on conflict (jenis) do nothing`)
  +  const { rows } = await db.execute(sql`
  +    update tugas_seo set berikutnya = ${sekarang.toISOString()}, updated_at = now()
  +    where jenis = ${jenis}
  +      and not (status = 'berjalan' and berikutnya > ${sekarang.toISOString()})
  +      and (mulai is null or mulai <= ${new Date(sekarang.getTime() - jedaMs).toISOString()})
  +    returning id`)
  +  return rows.length > 0
  +}
  ```

  ```diff
  diff --git a/src/modules/pantau/index.ts b/src/modules/pantau/index.ts
  index d272089..70c0a46 100644
  --- a/src/modules/pantau/index.ts
  +++ b/src/modules/pantau/index.ts
  @@ -1,3 +1,4 @@
  +import { after } from 'next/server'
   import type { Payload } from 'payload'
   
   import { ambilPengaturanIndexing } from '@/modules/indexer/antrean'
  @@ -5,9 +6,10 @@ import type { PengaturanIndexing } from '@/modules/indexer/tipe'
   
   import { adapterPantau, type AdapterPantau } from './adapter'
   import { hapusDataLama, sinkronAnalitik } from './analitik'
  -import { jadwalTugas, type HasilTugas } from './aturan'
  +import { batasPindaiManual, jadwalTugas, JEDA_PINDAI_MANUAL_MS, type HasilTugas } from './aturan'
  +import { teksWaktu } from './format'
   import { periksaTautanLuar, pindaiTautan } from './pindai'
  -import { klaimTugas, selesaikanTugas } from './tugas'
  +import { klaimTugas, majukanTugas, selesaikanTugas } from './tugas'
   import { JENIS_TUGAS, type JenisTugas, type StatusTugas } from './tipe'
   
   /**
  @@ -88,6 +90,54 @@ export async function jalankanPantau(
     return ringkasan
   }
   
  +/** Jawaban "Pindai ulang sekarang"; `pesan` siap tampil di dashboard. */
  +export type HasilMintaPindai =
  +  | { status: 'antre'; diminta: string; pesan: string }
  +  | { status: 'dibatasi'; alasan: 'berjalan' | 'jeda'; bolehLagi: string; pesan: string }
  +
  +/** Pesan untuk pindai yang belum boleh dijalankan lagi. */
  +export function pesanBatasPindai(alasan: 'berjalan' | 'jeda', bolehLagi: Date): string {
  +  return alasan === 'berjalan'
  +    ? 'Pindai tautan sedang berjalan. Hasilnya tampil di sini setelah selesai.'
  +    : `Pindai tautan baru saja dijalankan. Bisa dipindai lagi mulai ${teksWaktu(bolehLagi.toISOString())}.`
  +}
  +
  +/**
  + * Tombol "Pindai ulang sekarang" di dashboard SEO (Rencana 8B): memajukan tugas pindai tautan ke sekarang
  + * supaya dijalankan setelah respons (`jalankanPantauSetelahRespons`), bukan di dalam permintaan admin.
  + * Ditolak selama pindai sedang berjalan atau dimulai kurang dari 10 menit lalu.
  + */
  +export async function mintaPindai(payload: Payload, opsi: { sekarang?: Date } = {}): Promise<HasilMintaPindai> {
  +  const sekarang = opsi.sekarang ?? new Date()
  +  if (await majukanTugas(payload, 'tautan', sekarang, JEDA_PINDAI_MANUAL_MS)) {
  +    return { status: 'antre', diminta: sekarang.toISOString(), pesan: 'Pindai tautan dijalankan sekarang.' }
  +  }
  +  const { docs } = await payload.find({ collection: 'tugas-seo', where: { jenis: { equals: 'tautan' } }, limit: 1, depth: 0 })
  +  const batas = batasPindaiManual(docs[0] ?? null, sekarang)
  +  const alasan = batas.boleh ? 'berjalan' : batas.alasan
  +  const bolehLagi = batas.boleh ? new Date(sekarang.getTime() + JEDA_PINDAI_MANUAL_MS) : batas.bolehLagi
  +  return { status: 'dibatasi', alasan, bolehLagi: bolehLagi.toISOString(), pesan: pesanBatasPindai(alasan, bolehLagi) }
  +}
  +
  +/**
  + * Menjalankan tugas Pantau SEO setelah respons terkirim (`after()` Next), seperti `jalankanSetelahRespons`
  + * Mesin Indexing. Di luar permintaan Next (tes, skrip) galat "outside a request scope" diabaikan dan tugas
  + * menunggu cron; galat tugas dicatat ke log server.
  + */
  +export function jalankanPantauSetelahRespons(payload: Payload, tugas: readonly JenisTugas[]): void {
  +  try {
  +    after(async () => {
  +      try {
  +        await jalankanPantau(payload, { tugas })
  +      } catch (galat) {
  +        payload.logger.error({ err: galat, msg: 'Pantau SEO gagal dijalankan setelah permintaan admin.' })
  +      }
  +    })
  +  } catch (galat) {
  +    if (!String((galat as Error)?.message).includes('outside a request scope')) throw galat
  +  }
  +}
  +
   export { adapterPantau, pakaiAdapterPantau, type AdapterPantau, type HasilAnalitik } from './adapter'
   export { adapterPalsu, type AdapterPantauPalsu } from './palsu'
   export type { JenisTugas, RingkasanHalaman, StatusTugas } from './tipe'
  ```

  `src/modules/pantau/endpoint.ts`

  ```ts
  import type { Endpoint } from 'payload'

  import { tolakSelainAdmin } from '@/lib/aksiAdmin'

  import { jalankanPantauSetelahRespons, mintaPindai } from './index'

  /** Path endpoint di bawah `/api/tugas-seo`, dipanggil tombol "Pindai ulang sekarang" di dashboard SEO. */
  export const PATH_PINDAI_ULANG = '/pindai'

  /**
   * `POST /api/tugas-seo/pindai`: "Pindai ulang sekarang" (hanya admin, dari admin situs sendiri). Tugas pindai
   * tautan dimajukan lalu dijalankan setelah respons terkirim (`after()`). Jawaban 202 (antre) atau 429
   * (sedang berjalan, atau jeda 10 menit sejak pindai terakhir dimulai).
   */
  export const endpointPindaiUlang: Endpoint = {
    path: PATH_PINDAI_ULANG,
    method: 'post',
    handler: async (req) => {
      const tolak = tolakSelainAdmin(req)
      if (tolak) return tolak
      const hasil = await mintaPindai(req.payload)
      if (hasil.status === 'antre') jalankanPantauSetelahRespons(req.payload, ['tautan'])
      return Response.json(hasil, { status: hasil.status === 'antre' ? 202 : 429 })
    },
  }
  ```

  ```diff
  diff --git a/src/collections/TugasSeo.ts b/src/collections/TugasSeo.ts
  index 52251b7..2f68747 100644
  --- a/src/collections/TugasSeo.ts
  +++ b/src/collections/TugasSeo.ts
  @@ -1,18 +1,21 @@
   import type { CollectionConfig } from 'payload'
   
   import { isAdmin, nobody } from '@/access'
  +import { endpointPindaiUlang } from '@/modules/pantau/endpoint'
   import { JENIS_TUGAS, LABEL_STATUS_TUGAS, LABEL_TUGAS, STATUS_TUGAS } from '@/modules/pantau/tipe'
   
   /**
    * Tugas berkala Pantau SEO (satu baris per jenis): kapan terakhir berjalan, hasilnya, dan kapan
    * berikutnya. Cron mengklaim baris ini secara atomik, jadi cron yang terkirim dua kali tidak menjalankan
  - * tugas yang sama dua kali. Hasilnya tampil di dashboard SEO.
  + * tugas yang sama dua kali. Hasilnya tampil di dashboard SEO, dengan tombol "Pindai ulang sekarang"
  + * (`POST /api/tugas-seo/pindai`, Rencana 8B).
    */
   export const TugasSeo: CollectionConfig = {
     slug: 'tugas-seo',
     labels: { singular: 'Tugas SEO', plural: 'Tugas SEO' },
     admin: { useAsTitle: 'jenis', group: 'SEO', hidden: true },
     access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  +  endpoints: [endpointPindaiUlang],
     fields: [
       { name: 'jenis', type: 'select', required: true, unique: true, options: JENIS_TUGAS.map((value) => ({ value, label: LABEL_TUGAS[value] })) },
       { name: 'status', type: 'select', options: STATUS_TUGAS.map((value) => ({ value, label: LABEL_STATUS_TUGAS[value] })) },
  ```

- [ ] **Langkah 4: Tombol di dashboard SEO**

  ```diff
  diff --git a/src/modules/pantau/dashboard.ts b/src/modules/pantau/dashboard.ts
  index bbca289..2a2b416 100644
  --- a/src/modules/pantau/dashboard.ts
  +++ b/src/modules/pantau/dashboard.ts
  @@ -4,7 +4,7 @@ import { urlAdmin } from '@/lib/admin'
   import { HARI } from '@/modules/indexer/aturan'
   import { LABEL_LANGKAH, LABEL_STATUS_INDEKS, LABEL_STATUS_LOG, STATUS_INDEKS, type StatusIndeks, type StatusLog } from '@/modules/indexer/tipe'
   
  -import { geserTanggal, ringkasSitus, tanggalPasifik, type RingkasanSitus } from './aturan'
  +import { batasPindaiManual, geserTanggal, ringkasSitus, tanggalPasifik, type RingkasanSitus } from './aturan'
   import type { KoleksiSumber, Sumber } from './tautan'
   import { JENIS_TUGAS, type JenisTugas, type RingkasanHalaman, type StatusTugas } from './tipe'
   
  @@ -14,7 +14,7 @@ export const MAKS_LOG_DASHBOARD = 8
   export const MAKS_404_DASHBOARD = 10
   export const MAKS_TEMUAN_DASHBOARD = 50
   
  -export type InfoTugas = { status: StatusTugas | null; pesan: string | null; selesai: string | null; berikutnya: string }
  +export type InfoTugas = { status: StatusTugas | null; pesan: string | null; mulai: string | null; selesai: string | null; berikutnya: string }
   
   export type TautanSumber = { judul: string; href: string }
   
  @@ -28,6 +28,8 @@ export type TautanBermasalah = {
   
   export type DataDashboard = {
     tugas: Record<JenisTugas, InfoTugas | null>
  +  /** Tombol "Pindai ulang sekarang": boleh, atau kenapa belum dan kapan boleh lagi (ISO). */
  +  pindai: { boleh: true } | { boleh: false; alasan: 'berjalan' | 'jeda'; bolehLagi: string }
     analitik: { sampai: string | null; situs: RingkasanSitus | null; halaman: RingkasanHalaman[]; jumlahHalaman: number }
     statusIndeks: { status: StatusIndeks; label: string; jumlah: number }[]
     log: {
  @@ -59,7 +61,7 @@ export async function ambilDashboard(payload: Payload, sekarang = new Date()): P
     const tugas = Object.fromEntries(
       JENIS_TUGAS.map((jenis) => {
         const d = tugasDocs.find((t) => t.jenis === jenis)
  -      return [jenis, d ? { status: d.status ?? null, pesan: d.pesan ?? null, selesai: d.selesai ?? null, berikutnya: d.berikutnya } : null]
  +      return [jenis, d ? { status: d.status ?? null, pesan: d.pesan ?? null, mulai: d.mulai ?? null, selesai: d.selesai ?? null, berikutnya: d.berikutnya } : null]
       }),
     ) as Record<JenisTugas, InfoTugas | null>
   
  @@ -124,8 +126,11 @@ export async function ambilDashboard(payload: Payload, sekarang = new Date()): P
       select: { dari: true },
     })
   
  +  const pindai = batasPindaiManual(tugas.tautan, sekarang)
  +
     return {
       tugas,
  +    pindai: pindai.boleh ? pindai : { ...pindai, bolehLagi: pindai.bolehLagi.toISOString() },
       analitik: {
         sampai,
         situs: sampai ? ringkasSitus(hari.map(({ tanggal, klik, impresi, ctr, posisi }) => ({ tanggal, klik, impresi, ctr, posisi })), sampai) : null,
  ```

  `src/modules/pantau/admin/TombolPindaiUlang.tsx`

  ```tsx
  'use client'

  import { useRouter } from 'next/navigation'
  import { useState } from 'react'

  import { teksWaktu } from '../format'

  type Batas = { boleh: true } | { boleh: false; alasan: 'berjalan' | 'jeda'; bolehLagi: string }
  type Keadaan = { tahap: 'siap' | 'berjalan' | 'dibatasi'; pesan: string }

  /** Jeda dan jumlah pemeriksaan hasil: pindai dijalankan setelah respons (`after()`), biasanya beberapa detik. */
  const JEDA_TANYA_MS = 1500
  const MAKS_TANYA = 40

  const tunggu = (ms: number) => new Promise((selesai) => setTimeout(selesai, ms))

  /** Pesan awal bila pindai belum boleh dijalankan lagi (sama dengan `pesanBatasPindai` di server). */
  function pesanBatas(batas: Exclude<Batas, { boleh: true }>): string {
    return batas.alasan === 'berjalan'
      ? 'Pindai tautan sedang berjalan. Hasilnya tampil di sini setelah selesai.'
      : `Pindai tautan baru saja dijalankan. Bisa dipindai lagi mulai ${teksWaktu(batas.bolehLagi)}.`
  }

  /**
   * Tombol "Pindai ulang sekarang" di bagian Tautan rusak dashboard SEO (Rencana 8B): `POST /api/tugas-seo/pindai`,
   * lalu menanyakan tugas pindai sampai selesai setelah permintaan ini dan menyegarkan dashboard. Keadaan dibacakan
   * lewat `role="status"`; selama berjalan dan dibatasi tombol `aria-disabled` supaya fokus keyboard tidak hilang.
   */
  export function TombolPindaiUlang({ batas }: { batas: Batas }) {
    const router = useRouter()
    const [keadaan, setKeadaan] = useState<Keadaan>(batas.boleh ? { tahap: 'siap', pesan: '' } : { tahap: 'dibatasi', pesan: pesanBatas(batas) })

    async function pindai() {
      if (keadaan.tahap !== 'siap') return
      setKeadaan({ tahap: 'berjalan', pesan: 'Memindai tautan di semua konten terbit.' })
      try {
        const jawaban = await fetch('/api/tugas-seo/pindai', { method: 'POST', credentials: 'same-origin' })
        const hasil = (await jawaban.json()) as { status: string; pesan: string; diminta?: string }
        if (hasil.status !== 'antre' || !hasil.diminta) {
          setKeadaan({ tahap: hasil.status === 'dibatasi' ? 'dibatasi' : 'siap', pesan: hasil.pesan })
          return
        }
        for (let i = 0; i < MAKS_TANYA; i++) {
          await tunggu(JEDA_TANYA_MS)
          const { docs } = (await (await fetch('/api/tugas-seo?where[jenis][equals]=tautan&depth=0&limit=1', { credentials: 'same-origin' })).json()) as {
            docs: { status?: string | null; pesan?: string | null; selesai?: string | null }[]
          }
          const tugas = docs[0]
          if (tugas?.selesai && tugas.status !== 'berjalan' && tugas.selesai >= hasil.diminta) {
            setKeadaan({ tahap: 'dibatasi', pesan: `Pindai selesai. ${tugas.pesan ?? ''}`.trim() })
            router.refresh()
            return
          }
        }
        setKeadaan({ tahap: 'dibatasi', pesan: 'Pindai tautan masih berjalan. Muat ulang halaman ini sebentar lagi untuk melihat hasilnya.' })
      } catch {
        setKeadaan({ tahap: 'siap', pesan: 'Permintaan gagal. Periksa koneksi, lalu coba lagi.' })
      }
    }

    return (
      <div className="pantau-aksi">
        <button type="button" className="pantau-aksi__tombol" aria-disabled={keadaan.tahap !== 'siap'} onClick={pindai}>
          {keadaan.tahap === 'berjalan' ? 'Memindai' : 'Pindai ulang sekarang'}
        </button>
        <p role="status" className="pantau-aksi__pesan">
          {keadaan.pesan}
        </p>
      </div>
    )
  }
  ```

  ```diff
  diff --git a/src/modules/pantau/admin/BagianDashboard.tsx b/src/modules/pantau/admin/BagianDashboard.tsx
  index c67ffad..131336f 100644
  --- a/src/modules/pantau/admin/BagianDashboard.tsx
  +++ b/src/modules/pantau/admin/BagianDashboard.tsx
  @@ -4,6 +4,7 @@ import type { DataDashboard, InfoTugas, TautanBermasalah } from '../dashboard'
   import { teksJumlah, teksPersen, teksPosisi, teksRingkas, teksTanggal, teksWaktu } from '../format'
   import { LABEL_STATUS_TUGAS, LABEL_TUGAS, type JenisTugas } from '../tipe'
   import { GrafikKlik } from './GrafikKlik'
  +import { TombolPindaiUlang } from './TombolPindaiUlang'
   
   /** Status tugas harian: kapan terakhir berjalan dan kapan berikutnya; gagal tampil sebagai kotak galat. */
   function StatusTugas({ jenis, info }: { jenis: JenisTugas; info: InfoTugas | null }) {
  @@ -193,11 +194,16 @@ const LABEL_TAUTAN: Record<TautanBermasalah['jenis'], string> = {
     'luar-cek': 'Perlu dicek manual',
   }
   
  -export function BagianTautan({ tautan, tugas }: Pick<DataDashboard, 'tautan' | 'tugas'>) {
  +/**
  + * Tautan rusak dan alamat lama dari pindai harian, dengan tombol "Pindai ulang sekarang" (Rencana 8B) untuk
  + * memeriksa lagi setelah tautan diperbaiki; hasilnya juga memperbarui Halaman yatim.
  + */
  +export function BagianTautan({ tautan, tugas, pindai }: Pick<DataDashboard, 'tautan' | 'tugas' | 'pindai'>) {
     return (
       <section className="pantau-bagian pantau-bagian--lebar" aria-labelledby="pantau-tautan">
         <h2 id="pantau-tautan">Tautan rusak</h2>
         <StatusTugas jenis="tautan" info={tugas.tautan} />
  +      <TombolPindaiUlang batas={pindai} />
         {tautan.length > 0 ? (
           <ul className="pantau-daftar">
             {tautan.map((t) => (
  ```

  ```diff
  diff --git a/src/modules/pantau/admin/DashboardSeo.tsx b/src/modules/pantau/admin/DashboardSeo.tsx
  index cc2f075..7dca685 100644
  --- a/src/modules/pantau/admin/DashboardSeo.tsx
  +++ b/src/modules/pantau/admin/DashboardSeo.tsx
  @@ -45,7 +45,7 @@ export async function DashboardSeo({ initPageResult, params, searchParams }: Adm
               <BagianSearchConsole analitik={data.analitik} tugas={data.tugas} />
               <BagianStatusIndeks statusIndeks={data.statusIndeks} />
               <BagianLog log={data.log} />
  -            <BagianTautan tautan={data.tautan} tugas={data.tugas} />
  +            <BagianTautan tautan={data.tautan} tugas={data.tugas} pindai={data.pindai} />
               <BagianYatim yatim={data.yatim} tugas={data.tugas} />
               <Bagian404 log404={data.log404} />
             </div>
  ```

  ```diff
  diff --git a/src/modules/pantau/admin/dashboard.scss b/src/modules/pantau/admin/dashboard.scss
  index bbc555f..82dc63b 100644
  --- a/src/modules/pantau/admin/dashboard.scss
  +++ b/src/modules/pantau/admin/dashboard.scss
  @@ -346,3 +346,50 @@ html[data-theme='dark'] .pantau {
       font-size: 24px;
     }
   }
  +
  +// Tombol "Pindai ulang sekarang" (Rencana 8B). Keadaan berjalan dan dibatasi memakai aria-disabled supaya fokus
  +// keyboard tetap di tombol; pesannya di role="status".
  +.pantau-aksi {
  +  display: flex;
  +  flex-wrap: wrap;
  +  align-items: center;
  +  gap: calc(var(--base) * 0.5) calc(var(--base) * 0.75);
  +  margin: 0 0 calc(var(--base) * 0.75);
  +}
  +
  +.pantau-aksi__tombol {
  +  min-height: 44px;
  +  padding: 0 16px;
  +  border: 1px solid var(--theme-elevation-800);
  +  border-radius: 999px;
  +  background: var(--theme-elevation-0);
  +  color: var(--theme-text);
  +  font: inherit;
  +  font-weight: 600;
  +  cursor: pointer;
  +
  +  &:hover {
  +    background: var(--theme-elevation-100);
  +  }
  +
  +  &:focus-visible {
  +    outline: 2px solid var(--theme-text);
  +    outline-offset: 2px;
  +  }
  +
  +  &[aria-disabled='true'] {
  +    border-color: var(--theme-elevation-400);
  +    color: var(--theme-elevation-650);
  +    cursor: not-allowed;
  +  }
  +}
  +
  +.pantau-aksi__pesan {
  +  margin: 0;
  +  flex: 1 1 16rem;
  +  color: var(--theme-text);
  +
  +  &:empty {
  +    display: none;
  +  }
  +}
  ```

  Lalu jalankan:

  ```bash
  pnpm generate:types
  pnpm generate:importmap
  ```

  Keduanya tidak mengubah apa pun (tanpa field baru; tombol diimpor langsung oleh komponen server dashboard).

- [ ] **Langkah 5: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 522 tes (76 file); integrasi 155 tes (46 file); E2E 150 tes.

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/collections/TugasSeo.ts src/modules/pantau/admin/BagianDashboard.tsx src/modules/pantau/admin/DashboardSeo.tsx src/modules/pantau/admin/TombolPindaiUlang.tsx src/modules/pantau/admin/dashboard.scss src/modules/pantau/aturan.ts src/modules/pantau/dashboard.ts src/modules/pantau/endpoint.ts src/modules/pantau/index.ts src/modules/pantau/tugas.ts tests/e2e/pantau-aksi.spec.ts tests/int/pantau-dashboard.int.spec.ts tests/int/pantau-pindai.int.spec.ts tests/unit/pantau-aturan.test.ts tests/unit/pantau-dashboard.test.ts
  git commit -m "feat(pantau): tombol Pindai ulang sekarang di dashboard SEO memajukan pindai tautan lewat after() (hanya admin dari situs sendiri), ditolak selama berjalan atau 10 menit sejak pindai terakhir dimulai, umpan balik role=status"
  ```

---

### Task 8: Penjaga beacon log 404 di aplikasi

**Files:**
- Create: `tests/int/log404.int.spec.ts`
- Modify: `src/modules/konten/log404.ts`, `src/modules/konten/endpoint.ts`
- Test: `tests/int/log404.int.spec.ts`

**Interfaces:**
- Consumes: `rapikanLog404` dan koleksi `log-404` yang sudah ada; `sql` dari `@payloadcms/db-postgres`.
- Produces:
  - `MAKS_ISIAN_404 = 2048` (byte) dan `MAKS_PATH_BARU_24_JAM = 200` di `konten/log404.ts`.
  - `catat404(payload, catatan, sekarang = new Date(), batas = MAKS_PATH_BARU_24_JAM): Promise<boolean>`: kunjungan ke path yang sudah tercatat menambah hitungan lewat satu `UPDATE`; path baru dibuat lewat `INSERT ... SELECT ... WHERE (jumlah path baru 24 jam terakhir) < batas ON CONFLICT (path) DO UPDATE`; `false` bila path baru diabaikan karena batas.
  - `endpointCatat404`: isian lebih dari 2 KB (header `content-length` atau isi yang dibaca) dan isian tidak sah dijawab 400; kiriman dengan `Sec-Fetch-Site` selain `same-origin` dan path baru di atas batas dijawab 204 yang sama dengan kiriman yang dicatat.

Endpoint `POST /api/log-404/catat` terbuka tanpa login karena dipanggil browser pembaca dari halaman 404. Pembagiannya:

- **Pemilik (Vercel Firewall):** batas laju per IP. WAF Rate Limiting tersedia di semua paket (Hobby satu aturan per proyek dengan jendela tetap 10 detik sampai 10 menit dan kunci IP atau JA4; Pro 40 aturan), diatur dari dashboard Firewall atau `vercel firewall rules add` (perubahan berlaku setelah `vercel firewall publish`, tanpa deploy ulang), bukan dari `vercel.json`. Aturannya di "Setup dari pemilik". Hitungan Vercel per region, jadi batasnya perkiraan, bukan jaminan.
- **Aplikasi (task ini):** batas yang tidak bergantung IP, karena memori proses serverless tidak bisa diandalkan untuk hitungan dan IP mentah tidak disimpan (UU PDP): ukuran isian, asal kiriman, dan jumlah path baru per 24 jam yang dihitung di Postgres (indeks `created_at` sudah ada). Path yang sudah tercatat tetap dihitung tanpa batas, karena itu yang menunjukkan tautan rusak yang dikunjungi orang. Kiriman yang diabaikan dijawab sama dengan yang dicatat (204), jadi pengirim tidak bisa mengukur batasnya; beacon browser tidak membaca jawabannya.

Hitungan sebelumnya memakai cari lalu ubah lewat Local API, sehingga dua kunjungan bersamaan ke path yang sama bisa kehilangan satu hitungan. Task ini menggantinya dengan SQL atomik (tanpa hook di koleksi `log-404`, jadi tidak ada hook yang dilewati). Batas 24 jam dihitung dengan `created_at` antara `sekarang - 24 jam` dan `sekarang`, sehingga tes bisa memakai waktu tiruan. Di bawah beban bersamaan, batas bisa terlewati beberapa baris (dua transaksi menghitung sebelum keduanya menulis); batas ini rem, bukan kuota pasti.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/int/log404.int.spec.ts`

  ```ts
  import type { Payload, PayloadRequest } from 'payload'
  import { describe, expect, it } from 'vitest'

  import { endpointCatat404 } from '@/modules/konten/endpoint'
  import { catat404, MAKS_ISIAN_404, MAKS_PATH_BARU_24_JAM } from '@/modules/konten/log404'

  import { getTestPayload, unik } from './helpers'

  async function baris(payload: Payload, path: string) {
    const { docs } = await payload.find({ collection: 'log-404', where: { path: { equals: path } }, depth: 0 })
    return docs.map((d) => ({ jumlah: d.jumlah, referer: d.referer ?? null }))
  }

  /** Path baru yang tercatat dalam 24 jam sampai `sekarang` (jendela batas path baru). */
  async function pathBaru(payload: Payload, sekarang: Date) {
    const { totalDocs } = await payload.count({
      collection: 'log-404',
      where: { and: [{ createdAt: { greater_than: new Date(sekarang.getTime() - 86_400_000).toISOString() } }, { createdAt: { less_than_equal: sekarang.toISOString() } }] },
    })
    return totalDocs
  }

  async function kirim(isi: string, headers: Record<string, string> = {}) {
    const payload = await getTestPayload()
    const req = { payload, headers: new Headers(headers), text: async () => isi } as unknown as PayloadRequest
    return endpointCatat404.handler(req)
  }

  describe('beacon log 404: penjaga di aplikasi', () => {
    it(`path baru dibatasi ${MAKS_PATH_BARU_24_JAM} per 24 jam; kunjungan ke path yang sudah tercatat tetap dihitung`, async () => {
      const payload = await getTestPayload()
      const sekarang = new Date()
      const batas = (await pathBaru(payload, sekarang)) + 1
      const [lama, baru] = [`/${unik('lama')}`, `/${unik('baru')}`]

      expect(await catat404(payload, { path: lama, referer: null }, sekarang, batas)).toBe(true)
      expect(await catat404(payload, { path: baru, referer: null }, sekarang, batas)).toBe(false)
      expect(await catat404(payload, { path: lama, referer: 'https://www.google.com/' }, sekarang, batas)).toBe(true)
      expect(await baris(payload, baru)).toEqual([])
      expect(await baris(payload, lama)).toEqual([{ jumlah: 2, referer: 'https://www.google.com/' }])
      // Path yang tercatat lebih dari 24 jam lalu tidak dihitung batas.
      expect(await catat404(payload, { path: baru, referer: null }, new Date(sekarang.getTime() + 86_400_001), batas)).toBe(true)
    })

    it('kunjungan bersamaan ke path yang sama tidak saling menimpa hitungan dan tidak membuat dua baris', async () => {
      const payload = await getTestPayload()
      const path = `/${unik('bersamaan')}`
      const hasil = await Promise.all(Array.from({ length: 6 }, () => catat404(payload, { path, referer: null })))
      expect(hasil).toEqual(Array(6).fill(true))
      expect(await baris(payload, path)).toEqual([{ jumlah: 6, referer: null }])
    })

    it('endpoint: isian lebih dari 2 KB dan path tidak sah 400; kiriman dari situs lain diabaikan dengan 204 yang sama', async () => {
      const payload = await getTestPayload()
      const path = `/${unik('beacon')}`
      expect((await kirim(JSON.stringify({ path, referer: 'x'.repeat(MAKS_ISIAN_404) }))).status).toBe(400)
      expect((await kirim('{}', { 'content-length': String(MAKS_ISIAN_404 + 1) })).status).toBe(400)
      expect((await kirim('bukan json')).status).toBe(400)
      expect((await kirim(JSON.stringify({ path: '/api/rahasia' }))).status).toBe(400)

      const lintas = await kirim(JSON.stringify({ path }), { 'sec-fetch-site': 'cross-site' })
      expect(lintas.status).toBe(204)
      expect(await baris(payload, path)).toEqual([])

      const dicatat = await kirim(JSON.stringify({ path, referer: 'https://point.lat/tautan-lama' }), { 'sec-fetch-site': 'same-origin' })
      expect(dicatat.status).toBe(204)
      expect(await baris(payload, path)).toEqual([{ jumlah: 1, referer: 'https://point.lat/tautan-lama' }])
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm exec cross-env NODE_OPTIONS=--no-deprecation vitest run --config ./vitest.int.config.mts tests/int/log404.int.spec.ts
  ```

  Hasil yang diharapkan: FAIL, ketiga tes gagal: `AssertionError: expected undefined to be true // Object.is equality` (nama tesnya "path baru dibatasi undefined per 24 jam ..." karena konstantanya belum ada), `AssertionError: expected [ undefined, undefined, …(4) ] to deeply equal [ true, true, true, true, true, true ]`, dan `AssertionError: expected 400 to be 204 // Object.is equality`.

- [ ] **Langkah 3: Batas di `catat404` dan endpoint**

  ```diff
  diff --git a/src/modules/konten/log404.ts b/src/modules/konten/log404.ts
  index a395676..96bf793 100644
  --- a/src/modules/konten/log404.ts
  +++ b/src/modules/konten/log404.ts
  @@ -1,9 +1,22 @@
  +import { sql } from '@payloadcms/db-postgres'
   import type { Payload } from 'payload'
   
   /** Batas panjang supaya log tidak bisa diisi teks sembarang yang sangat panjang. */
   export const MAKS_PATH = 300
   export const MAKS_REFERER = 500
   
  +/** Batas ukuran isian beacon (byte): cukup untuk path dan referer terpanjang beserta JSON-nya. */
  +export const MAKS_ISIAN_404 = 2048
  +
  +/**
  + * Batas path baru yang dicatat dalam 24 jam terakhir. Kunjungan ke path yang sudah tercatat tetap dihitung;
  + * di atas batas ini path baru diabaikan, jadi kiriman sembarang tidak bisa membanjiri log dan dashboard.
  + * Jauh di atas jumlah tautan rusak yang wajar untuk situs sebesar point.
  + */
  +export const MAKS_PATH_BARU_24_JAM = 200
  +
  +const SEHARI_MS = 24 * 60 * 60 * 1000
  +
   /** Path yang bukan halaman publik tidak dicatat. */
   const AWALAN_SISTEM = ['/api/', '/admin', '/_next/']
   
  @@ -35,29 +48,26 @@ function rapikanReferer(nilai: unknown): string | null {
   }
   
   /**
  - * Menambah hitungan path di koleksi `log-404` (satu baris per path). Referer terakhir disimpan bila
  - * ada, karena itu yang menunjukkan tautan rusak yang perlu dibetulkan. Dua kiriman bersamaan untuk
  - * path baru bisa bentrok di indeks unik `path`; kiriman kedua lalu menambah baris yang sudah ada.
  + * Menambah hitungan path di koleksi `log-404` (satu baris per path), dengan referer terakhir bila ada (itu
  + * yang menunjukkan tautan rusak yang perlu dibetulkan). Hitungan naik lewat satu `UPDATE` di Postgres, jadi
  + * kunjungan bersamaan tidak saling menimpa. Path baru dibuat lewat `INSERT ... SELECT ... WHERE` yang
  + * sekaligus memeriksa batas path baru 24 jam terakhir (`batas`); `ON CONFLICT` menangani path yang baru saja
  + * dibuat kiriman lain. Mengembalikan `false` bila path baru diabaikan karena batas itu.
    */
  -export async function catat404(payload: Payload, catatan: Catatan404, sekarang = new Date()): Promise<void> {
  -  const tambah = async () => {
  -    const { docs } = await payload.find({ collection: 'log-404', where: { path: { equals: catatan.path } }, limit: 1, depth: 0 })
  -    const lama = docs[0]
  -    if (!lama) return false
  -    await payload.update({
  -      collection: 'log-404',
  -      id: lama.id,
  -      data: { jumlah: (lama.jumlah ?? 0) + 1, terakhir: sekarang.toISOString(), ...(catatan.referer ? { referer: catatan.referer } : {}) },
  -    })
  -    return true
  -  }
  -  if (await tambah()) return
  -  try {
  -    await payload.create({
  -      collection: 'log-404',
  -      data: { path: catatan.path, jumlah: 1, terakhir: sekarang.toISOString(), referer: catatan.referer },
  -    })
  -  } catch (galat) {
  -    if (!(await tambah())) throw galat
  -  }
  +export async function catat404(payload: Payload, catatan: Catatan404, sekarang = new Date(), batas = MAKS_PATH_BARU_24_JAM): Promise<boolean> {
  +  const db = payload.db.drizzle
  +  const waktu = sekarang.toISOString()
  +  const { rows: ada } = await db.execute(sql`
  +    update log_404 set jumlah = coalesce(jumlah, 0) + 1, terakhir = ${waktu}, referer = coalesce(${catatan.referer}, referer), updated_at = now()
  +    where path = ${catatan.path}
  +    returning id`)
  +  if (ada.length) return true
  +  const { rows: baru } = await db.execute(sql`
  +    insert into log_404 (path, jumlah, terakhir, referer, created_at, updated_at)
  +    select ${catatan.path}, 1, ${waktu}, ${catatan.referer}, ${waktu}, now()
  +    where (select count(*) from log_404 where created_at > ${new Date(sekarang.getTime() - SEHARI_MS).toISOString()} and created_at <= ${waktu}) < ${batas}
  +    on conflict (path) do update set jumlah = coalesce(log_404.jumlah, 0) + 1, terakhir = excluded.terakhir,
  +      referer = coalesce(excluded.referer, log_404.referer), updated_at = now()
  +    returning id`)
  +  return baru.length > 0
   }
  ```

  ```diff
  diff --git a/src/modules/konten/endpoint.ts b/src/modules/konten/endpoint.ts
  index 59708ae..9d2d476 100644
  --- a/src/modules/konten/endpoint.ts
  +++ b/src/modules/konten/endpoint.ts
  @@ -1,22 +1,43 @@
   import type { Endpoint } from 'payload'
   
  -import { catat404, rapikanLog404 } from './log404'
  +import { catat404, MAKS_ISIAN_404, rapikanLog404 } from './log404'
   
   /** Path endpoint di bawah `/api/log-404`, dipanggil beacon halaman 404. */
   export const PATH_CATAT_404 = '/catat'
   
  +const tidakDicatat = () => Response.json({ pesan: 'Path tidak dicatat.' }, { status: 400 })
  +
  +/** Isi JSON beacon, atau `null` bila bukan JSON. */
  +function bacaJson(teks: string): unknown {
  +  try {
  +    return JSON.parse(teks)
  +  } catch {
  +    return null
  +  }
  +}
  +
   /**
    * `POST /api/log-404/catat`: dipanggil browser pembaca dari halaman 404 (`navigator.sendBeacon`).
  - * Terbuka tanpa login karena pembacanya anonim; isi dirapikan `rapikanLog404` dan ditulis lewat Local
  - * API. Pencatatan dari browser dipilih karena halaman 404 disimpan cache (ISR), jadi server tidak
  - * merender ulang setiap kunjungan.
  + * Terbuka tanpa login karena pembacanya anonim; isi dirapikan `rapikanLog404` dan ditulis lewat SQL
  + * atomik `catat404`. Pencatatan dari browser dipilih karena halaman 404 disimpan cache (ISR), jadi server
  + * tidak merender ulang setiap kunjungan.
  + *
  + * Penjaga di aplikasi (Rencana 8B), tanpa menyimpan IP: isian lebih dari 2 KB ditolak sebelum dibaca
  + * utuh; kiriman dari halaman situs lain (`Sec-Fetch-Site` selain `same-origin`) dan path baru di atas batas
  + * 24 jam diabaikan dengan jawaban yang sama dengan kiriman yang dicatat (204), jadi pengirim tidak tahu
  + * batasnya. Batas laju per IP diatur di Vercel Firewall (lihat Setup dari pemilik Rencana 8B).
    */
   export const endpointCatat404: Endpoint = {
     path: PATH_CATAT_404,
     method: 'post',
     handler: async (req) => {
  -    const catatan = rapikanLog404(await req.json?.().catch(() => null))
  -    if (!catatan) return Response.json({ pesan: 'Path tidak dicatat.' }, { status: 400 })
  +    const asal = req.headers.get('sec-fetch-site')
  +    if (asal && asal !== 'same-origin') return new Response(null, { status: 204 })
  +    if (Number(req.headers.get('content-length') ?? 0) > MAKS_ISIAN_404) return tidakDicatat()
  +    const teks = (await req.text?.().catch(() => '')) ?? ''
  +    if (teks.length > MAKS_ISIAN_404) return tidakDicatat()
  +    const catatan = rapikanLog404(bacaJson(teks))
  +    if (!catatan) return tidakDicatat()
       await catat404(req.payload, catatan)
       return new Response(null, { status: 204 })
     },
  ```

- [ ] **Langkah 4: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 522 tes (76 file); integrasi 158 tes (47 file; tes `catat404` lama di `redirect-404.int.spec.ts` tetap lulus); E2E 150 tes (beacon `galat.spec.ts` dari browser dan `POST` langsung di `pantau.spec.ts` tetap tercatat).

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/modules/konten/endpoint.ts src/modules/konten/log404.ts tests/int/log404.int.spec.ts
  git commit -m "feat(konten): penjaga beacon log 404 tanpa menyimpan IP: isian maksimal 2 KB, kiriman dari situs lain diabaikan, paling banyak 200 path baru per 24 jam dengan jawaban yang sama, dan hitungan lewat SQL atomik"
  ```

---

### Task 9: Label baris slot di global Iklan

**Files:**
- Create: `src/modules/iklan/admin/LabelSlot.tsx`
- Modify: `src/modules/iklan/tipe.ts`, `src/modules/iklan/aturan.ts`, `src/globals/Iklan.ts`, `src/app/(payload)/admin/importMap.js` (dibuat ulang), `tests/unit/iklan-aturan.test.ts`, `tests/e2e/iklan.spec.ts`
- Test: `tests/unit/iklan-aturan.test.ts`, `tests/e2e/iklan.spec.ts`

**Interfaces:**
- Consumes: `POSISI_IKLAN`, `PosisiIklan` (`iklan/tipe.ts`); `useRowLabel` dari `@payloadcms/ui`.
- Produces: `LABEL_POSISI_SINGKAT: Record<PosisiIklan, string>` (`iklan/tipe.ts`); `labelBarisSlot(slot, nomor): string` (`iklan/aturan.ts`; `nomor` indeks baris mulai 0); komponen klien `LabelSlot` dipasang sebagai `admin.components.RowLabel` field array `slot` di global Iklan.

Butir tunda Rencana 8A ("Label baris slot di admin"). Baris array Slot iklan sekarang berjudul "Slot 01", "Slot 02", jadi editor harus membuka setiap baris untuk tahu slot mana yang diubah. Labelnya menjadi ID slot dan posisi singkat ("beranda-samping · Beranda"), ditambah "nonaktif" bila slot dimatikan. Baris yang belum punya ID slot tetap memakai nomor baris seperti bawaan Payload, dan posisi lama yang tidak dikenal tidak ditampilkan. Aturannya fungsi murni di `aturan.ts` (diuji unit), komponennya hanya membaca data baris lewat `useRowLabel`. Tanpa field baru, jadi `payload-types.ts` tidak berubah.

- [ ] **Langkah 1: Tulis tes yang gagal**

  ```diff
  diff --git a/tests/unit/iklan-aturan.test.ts b/tests/unit/iklan-aturan.test.ts
  index cd9ace0..5392826 100644
  --- a/tests/unit/iklan-aturan.test.ts
  +++ b/tests/unit/iklan-aturan.test.ts
  @@ -4,6 +4,7 @@ import {
     barisAdsense,
     iklanSiap,
     isiAdsTxt,
  +  labelBarisSlot,
     letakIklanTengah,
     periksaAdsTxt,
     pilihSlot,
  @@ -175,3 +176,13 @@ describe('ads.txt', () => {
       expect(validasiAdsTxt('google.com, pub-1, direct, ')).toBe('Baris 1: isian keempat (ID otoritas) kosong. Hapus koma terakhir atau isi ID-nya.')
     })
   })
  +
  +describe('label baris slot di admin', () => {
  +  it('ID slot dan posisi singkat, "nonaktif" bila dimatikan; tanpa ID slot memakai nomor baris', () => {
  +    expect(labelBarisSlot({ idSlot: 'beranda-samping', posisi: 'beranda', aktif: true }, 4)).toBe('beranda-samping \u00b7 Beranda')
  +    expect(labelBarisSlot({ idSlot: 'artikel-tengah', posisi: 'artikel-tengah', aktif: false }, 0)).toBe('artikel-tengah \u00b7 Artikel, tengah isi \u00b7 nonaktif')
  +    expect(labelBarisSlot({ idSlot: '  ', posisi: 'rubrik' }, 2)).toBe('Slot 03 \u00b7 Rubrik')
  +    expect(labelBarisSlot(undefined, 0)).toBe('Slot 01')
  +    expect(labelBarisSlot({ idSlot: 'lama', posisi: 'sidebar' }, 0)).toBe('lama')
  +  })
  +})
  ```

  ```diff
  diff --git a/tests/e2e/iklan.spec.ts b/tests/e2e/iklan.spec.ts
  index 93aa405..355f159 100644
  --- a/tests/e2e/iklan.spec.ts
  +++ b/tests/e2e/iklan.spec.ts
  @@ -57,6 +57,13 @@ test('admin global Iklan: petunjuk terbaca dan pratinjau ads.txt mengikuti isian
     await expect(pratinjau).toContainText('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0')
     await expect(pratinjau).toContainText(ADS_TXT_E2E)
   
  +  // Label baris slot: ID slot dan posisinya, bukan "Slot 01" (Rencana 8B).
  +  const slot = page.locator('#field-slot')
  +  await slot.scrollIntoViewIfNeeded()
  +  await expect(slot.getByText('artikel-tengah · Artikel, tengah isi', { exact: true })).toBeVisible()
  +  await expect(slot.getByText('beranda-samping · Beranda', { exact: true })).toBeVisible()
  +  await expect(slot.getByText(/^Slot \d{2}$/)).toHaveCount(0)
  +
     await idPenerbit.fill('')
     await expect(pratinjau).not.toContainText('google.com')
     await page.getByLabel('Baris ads.txt tambahan').fill('')
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm exec vitest run --config ./vitest.unit.config.mts tests/unit/iklan-aturan.test.ts
  ```

  Hasil yang diharapkan: FAIL di tes "ID slot dan posisi singkat, ..." dengan `TypeError: (0 , __vite_ssr_import_1__.labelBarisSlot) is not a function` (1 gagal, 11 lulus).

- [ ] **Langkah 3: Aturan label dan komponen baris**

  ```diff
  diff --git a/src/modules/iklan/tipe.ts b/src/modules/iklan/tipe.ts
  index 675487a..5bb8975 100644
  --- a/src/modules/iklan/tipe.ts
  +++ b/src/modules/iklan/tipe.ts
  @@ -18,6 +18,15 @@ export const LABEL_POSISI_IKLAN: Record<PosisiIklan, string> = {
     beranda: 'Beranda: di tempat blok Slot iklan',
   }
   
  +/** Nama posisi singkat untuk label baris slot di admin. */
  +export const LABEL_POSISI_SINGKAT: Record<PosisiIklan, string> = {
  +  'artikel-tengah': 'Artikel, tengah isi',
  +  'artikel-akhir': 'Artikel, setelah isi',
  +  rubrik: 'Rubrik',
  +  tools: 'Tools',
  +  beranda: 'Beranda',
  +}
  +
   /**
    * Ukuran tetap dari daftar ukuran iklan display AdSense. Lebar paling besar 336 px supaya muat di layar
    * 375 px (kontainer 343 px), dan tinggi tetap supaya ruangnya bisa dipesan tanpa pergeseran tata letak.
  ```

  ```diff
  diff --git a/src/modules/iklan/aturan.ts b/src/modules/iklan/aturan.ts
  index 0ecd01f..47f4d58 100644
  --- a/src/modules/iklan/aturan.ts
  +++ b/src/modules/iklan/aturan.ts
  @@ -1,6 +1,6 @@
   import type { IsiDokumen } from '@/modules/seo/lexical'
   
  -import { DIMENSI_IKLAN, LABEL_POSISI_IKLAN, type PengaturanIklan, type PosisiIklan, type SlotSiap } from './tipe'
  +import { DIMENSI_IKLAN, LABEL_POSISI_IKLAN, LABEL_POSISI_SINGKAT, POSISI_IKLAN, type PengaturanIklan, type PosisiIklan, type SlotSiap } from './tipe'
   
   /**
    * Aturan iklan sebagai fungsi murni (spesifikasi §11): syarat slot tampil, penempatan di isi artikel,
  @@ -97,6 +97,17 @@ export function sisipkanIklanTengah(isi: IsiDokumen, slot: SlotSiap | null): Isi
     return { ...isi, root: { ...isi.root, children: anak } }
   }
   
  +/**
  + * Label baris slot di global Iklan (admin): ID slot dan posisinya, misalnya "beranda-samping · Beranda", supaya
  + * editor mengenali slot tanpa membuka setiap baris. Slot yang dimatikan diberi "nonaktif". Baris yang belum
  + * punya ID slot memakai nomor baris seperti bawaan Payload ("Slot 01"). `nomor`: indeks baris mulai 0.
  + */
  +export function labelBarisSlot(slot: { idSlot?: unknown; posisi?: unknown; aktif?: unknown } | null | undefined, nomor: number): string {
  +  const id = typeof slot?.idSlot === 'string' && slot.idSlot.trim() ? slot.idSlot.trim() : `Slot ${String(nomor + 1).padStart(2, '0')}`
  +  const posisi = POSISI_IKLAN.includes(slot?.posisi as PosisiIklan) ? LABEL_POSISI_SINGKAT[slot?.posisi as PosisiIklan] : null
  +  return [id, posisi, slot?.aktif === false ? 'nonaktif' : null].filter(Boolean).join(' · ')
  +}
  +
   /** Validasi field global `iklan`: ID penerbit wajib dan berformat benar saat iklan dinyalakan. */
   export function validasiIdPenerbit(nilai: unknown, aktif: unknown): true | string {
     const teks = typeof nilai === 'string' ? nilai.trim() : ''
  ```

  `src/modules/iklan/admin/LabelSlot.tsx`

  ```tsx
  'use client'

  import { useRowLabel } from '@payloadcms/ui'

  import { labelBarisSlot } from '../aturan'

  /** Label baris array Slot iklan di global Iklan: ID slot dan posisinya, bukan "Slot 01" (Rencana 8B). */
  export function LabelSlot() {
    const { data, rowNumber } = useRowLabel<{ idSlot?: string; posisi?: string; aktif?: boolean }>()
    return <span>{labelBarisSlot(data, rowNumber ?? 0)}</span>
  }
  ```

  ```diff
  diff --git a/src/globals/Iklan.ts b/src/globals/Iklan.ts
  index bb78b84..e91e3b8 100644
  --- a/src/globals/Iklan.ts
  +++ b/src/globals/Iklan.ts
  @@ -57,6 +57,8 @@ export const Iklan: GlobalConfig = {
         type: 'array',
         label: 'Slot iklan',
         labels: { singular: 'Slot', plural: 'Slot' },
  +      // Label baris: ID slot dan posisi ("beranda-samping · Beranda"), bukan "Slot 01".
  +      admin: { components: { RowLabel: '@/modules/iklan/admin/LabelSlot#LabelSlot' } },
         validate: (nilai: unknown) => validasiDaftarSlot(nilai),
         fields: [
           // Bukan `id`: nama itu dipakai Payload sebagai kunci baris array.
  ```

  Lalu jalankan:

  ```bash
  pnpm generate:types
  pnpm generate:importmap
  ```

  `src/payload-types.ts` tidak berubah; import map bertambah `LabelSlot`.

- [ ] **Langkah 4: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 523 tes (76 file); integrasi 158 tes (47 file); E2E 150 tes (tes admin global Iklan di `iklan.spec.ts` membaca label baris baru).

- [ ] **Langkah 5: Commit**

  ```bash
  git add "src/app/(payload)/admin/importMap.js" src/globals/Iklan.ts src/modules/iklan/admin/LabelSlot.tsx src/modules/iklan/aturan.ts src/modules/iklan/tipe.ts tests/e2e/iklan.spec.ts tests/unit/iklan-aturan.test.ts
  git commit -m "feat(iklan): baris slot di global Iklan berlabel ID slot dan posisinya, bukan Slot 01"
  ```

---

### Task 10: Paginasi, aksi admin, dan beacon 404 di CLAUDE.md dan spesifikasi, anggaran JS halaman berikutnya, lalu pemeriksaan akhir

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-11-03-point-lat-design.md`, `tests/e2e/motion.spec.ts`
- Test: `tests/e2e/motion.spec.ts`

**Interfaces:**
- Consumes: semua task sebelumnya.
- Produces: aturan proyek untuk agen dan pengembang berikutnya (`pathHalaman` dan slug `halaman` yang dicadangkan; akhiran `/halaman/{n}` di `muatJalur` dan rute penulis bersarang, `/halaman/1` 308, nomor tidak sah 404, paginasi tidak masuk sitemap dan tidak dikabarkan, canonical ke dirinya sendiri; `tolakSelainAdmin`, `after()`, 202 atau 429, `aria-disabled` dan `role="status"` untuk aksi admin; "Cek sekarang" dan "Pindai ulang sekarang"; penjaga beacon log 404 dan aturan rate limit Vercel Firewall; data E2E `PAGINASI_E2E`; isi 404 Next yang kadang tidak dirender dan aturan ulang sekali), spesifikasi yang sesuai (§7 tabel URL dan slug cadangan, §8 langkah 5 Cek status, log 404, dan Dashboard SEO), dan anggaran JS yang juga menjaga halaman berikutnya rubrik dan profil penulis (aturan proyek: jenis halaman baru masuk daftar `motion.spec.ts`; profil penulis berhalaman punya rute sendiri).

- [ ] **Langkah 1: Perbarui CLAUDE.md dan spesifikasi**

  ```diff
  diff --git a/CLAUDE.md b/CLAUDE.md
  index 75e3bcf..9e3bec0 100644
  --- a/CLAUDE.md
  +++ b/CLAUDE.md
  @@ -29,20 +29,22 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Nama teknis framework tetap bahasa Inggris (hook, access, config).
   - Logika bisnis ditulis sebagai fungsi murni di `src/lib/` atau `src/modules/` dan diuji unit. Config Payload hanya merangkai.
   - Satu file satu tanggung jawab. Koleksi di `src/collections/`, global di `src/globals/`, blok di `src/blocks/`, field bersama di `src/fields/`, hook di `src/hooks/`, akses di `src/access/`.
  -- Path publik selalu dibangun lewat `pathFor()` di `src/lib/paths.ts`, jangan merangkai string URL manual. Halaman indeks memakai `PATH_INDEKS` (`/cari`, `/glosarium`, `/tools`, `/video`).
  +- Path publik selalu dibangun lewat `pathFor()` di `src/lib/paths.ts`, jangan merangkai string URL manual. Halaman indeks memakai `PATH_INDEKS` (`/cari`, `/glosarium`, `/tools`, `/video`). Halaman ke-n sebuah daftar lewat `pathHalaman(dasar, n)` (`{path}/halaman/{n}`, halaman 1 tanpa akhiran); slug `halaman` (`SEGMEN_HALAMAN`) dicadangkan untuk semua koleksi.
   - SEO selalu lewat `src/modules/seo`: `metadata()` untuk `generateMetadata`, `jsonLd()` + `serialisasiJsonLd()` untuk JSON-LD, `remahRoti()` untuk breadcrumb, `ambilSitus()` untuk pengaturan situs. Jangan menulis `<title>`, canonical, robots, atau JSON-LD manual di halaman. Rute teknis (`/sitemap.xml`, `/sitemap/{jenis}.xml`, `/news-sitemap.xml`, `/robots.txt`, `/feed.xml`) ada di `src/app/(frontend)/` dan hanya merangkai fungsi modul.
   - Tag cache di `src/lib/tag.ts` (`TAG`): data halaman publik di-cache dengan tag yang sama dengan yang direvalidasi hook `revalidasiPublik` (`{koleksi}`, `{koleksi}:{id}`, `pilar:{slug}`, `beranda`, `sitemap`, `pengaturan-seo`, `header`, `footer`, `media`, `redirect`, `parameter-tools`, `analitik`, `iklan`). Koleksi publik baru wajib memasang `revalidasiPublik(koleksi)`. Tag `beranda` dibuang global `beranda` dan `newsletter` serta terbitnya artikel, pilar, video, dan tools; koleksi yang baru tampil di beranda ditambahkan ke `DI_BERANDA`. Tag `iklan` dibuang global `iklan` (layout, halaman berslot iklan, beranda, `/ads.txt`).
  -- Mesin Indexing di `src/modules/indexer`: `kabari(payload, kabar, { req })` memasukkan kabar ke antrean Postgres (koleksi `antrean-indexing`), `jalankanIndexer(payload)` mengirimnya (cron `GET /api/jobs/run` dengan `CRON_SECRET` setiap 10 menit, dan `after()` setelah simpan), log di `log-indexing`, status Google di `status-indeks`. Ketiga koleksi itu hanya ditulis modul indexer dan hanya dibaca admin. Koleksi berhalaman publik baru memasang `kabariMesinPencari(keTarget)` dari `src/hooks/kabariMesinPencari.ts` setelah hook revalidasi (beforeChange, afterChange, afterDelete). Aturan (jendela kirim, jeda ulang, kuota, jadwal cek) sebagai fungsi murni di `aturan.ts` dengan waktu sebagai argumen. Semua panggilan ke Google dan IndexNow lewat adapter (`asli.ts` dengan `fetch` dan JWT akun layanan tanpa pustaka, `palsu.ts` dalam memori), dipilih env `INDEXER_ADAPTER` (`asli` hanya di produksi; dev dan tes memakai palsu; build produksi yang dijalankan tanpa nilai itu ditolak). Tes memakai `adapterPalsu()` + `pakaiAdapterIndexer()` dan opsi `sekarang`. Hapus dan update massal Payload menjalankan hook setiap dokumen secara paralel dalam satu transaksi: `kabari` dengan `req` yang sama berjalan bergiliran, baris antrean baru dibuat lewat `INSERT ... ON CONFLICT DO NOTHING` di sesi transaksi `req` (jangan `payload.create` untuk koleksi dengan kunci unik yang bisa ditulis bersamaan), dan SQL langsung di dalam hook wajib memakai sesi transaksi itu, bukan koneksi pool lain (deadlock). Tes `indexer-bersamaan.int.spec.ts` menjaganya.
  -- Pantau SEO di `src/modules/pantau` (spesifikasi §8 "Dashboard SEO"): `jalankanPantau(payload)` dipanggil cron yang sama setelah Mesin Indexing dan menjalankan tugas harian yang jatuh tempo (sinkron Search Analytics beserta retensi log indexing 90 hari, dan pindai tautan), lalu memeriksa paling banyak 10 tautan luar yang jatuh tempo per jalan (masing-masing seminggu sekali). Tugas diklaim atomik di `tugas-seo` (cron dobel tidak menjalankan dua kali). Data di koleksi tersembunyi `analitik-halaman`, `analitik-situs`, `tugas-seo`, `temuan-tautan`, dan `tautan-luar`: hanya ditulis modul pantau, dibaca dashboard admin `/admin/seo` lewat `ambilDashboard()` (tautan di atas menu admin dan kartu di halaman awal admin lewat `beforeDashboard`; kisi dashboard paling banyak dua kolom), kecuali `analitik-halaman` yang juga dibaca modul konten (`ambilPopuler`, tag `analitik`) untuk "Paling dicari pekan ini". Search Analytics dan pemeriksa tautan lewat adapter pantau (`asli.ts` memakai token akun layanan dari `indexer/google.ts`, `palsu.ts` dalam memori), dengan saklar `INDEXER_ADAPTER` yang sama; adapter palsu melewati sinkron (data tersimpan tidak tertimpa). Tes memakai `adapterPalsu()` (`dataAnalitik`, `jawabanTautan`), opsi `sekarang`, dan opsi `tugas`. Tanggal Search Analytics adalah tanggal kalender waktu Pasifik (`tanggalPasifik`). Tautan masuk untuk halaman yatim dihitung dari isi Lexical dokumen terbit, relasi pilihan editor, menu header dan footer, dan pilihan beranda; daftar otomatis (rubrik, terbaru, terkait otomatis) tidak dihitung. URL halaman admin lewat `urlAdmin` di `src/lib/admin.ts`.
  +- Mesin Indexing di `src/modules/indexer`: `kabari(payload, kabar, { req })` memasukkan kabar ke antrean Postgres (koleksi `antrean-indexing`), `jalankanIndexer(payload)` mengirimnya (cron `GET /api/jobs/run` dengan `CRON_SECRET` setiap 10 menit, dan `after()` setelah simpan), log di `log-indexing`, status Google di `status-indeks`. Ketiga koleksi itu hanya ditulis modul indexer dan hanya dibaca admin. Koleksi berhalaman publik baru memasang `kabariMesinPencari(keTarget)` dari `src/hooks/kabariMesinPencari.ts` setelah hook revalidasi (beforeChange, afterChange, afterDelete). Tombol "Cek sekarang" di daftar Status indeks memanggil `POST /api/status-indeks/{id}/cek`: `mintaCekStatus` memeriksa kuota cek harian (`kuotaInspeksi`) dan jeda 10 menit per halaman (`batasCekManual`, klaim atomik lewat kolom `dimintaPada`), memajukan baris `cek-status` ke sekarang (`majukanCek`, tahap dan dasar jadwal tetap), lalu antrean dijalankan lewat `after()`; Google tidak pernah dipanggil langsung dari permintaan admin. Aturan (jendela kirim, jeda ulang, kuota, jadwal cek) sebagai fungsi murni di `aturan.ts` dengan waktu sebagai argumen. Semua panggilan ke Google dan IndexNow lewat adapter (`asli.ts` dengan `fetch` dan JWT akun layanan tanpa pustaka, `palsu.ts` dalam memori), dipilih env `INDEXER_ADAPTER` (`asli` hanya di produksi; dev dan tes memakai palsu; build produksi yang dijalankan tanpa nilai itu ditolak). Tes memakai `adapterPalsu()` + `pakaiAdapterIndexer()` dan opsi `sekarang`. Hapus dan update massal Payload menjalankan hook setiap dokumen secara paralel dalam satu transaksi: `kabari` dengan `req` yang sama berjalan bergiliran, baris antrean baru dibuat lewat `INSERT ... ON CONFLICT DO NOTHING` di sesi transaksi `req` (jangan `payload.create` untuk koleksi dengan kunci unik yang bisa ditulis bersamaan), dan SQL langsung di dalam hook wajib memakai sesi transaksi itu, bukan koneksi pool lain (deadlock). Tes `indexer-bersamaan.int.spec.ts` menjaganya.
  +- Pantau SEO di `src/modules/pantau` (spesifikasi §8 "Dashboard SEO"): `jalankanPantau(payload)` dipanggil cron yang sama setelah Mesin Indexing dan menjalankan tugas harian yang jatuh tempo (sinkron Search Analytics beserta retensi log indexing 90 hari, dan pindai tautan), lalu memeriksa paling banyak 10 tautan luar yang jatuh tempo per jalan (masing-masing seminggu sekali). Tugas diklaim atomik di `tugas-seo` (cron dobel tidak menjalankan dua kali). Data di koleksi tersembunyi `analitik-halaman`, `analitik-situs`, `tugas-seo`, `temuan-tautan`, dan `tautan-luar`: hanya ditulis modul pantau, dibaca dashboard admin `/admin/seo` lewat `ambilDashboard()` (tautan di atas menu admin dan kartu di halaman awal admin lewat `beforeDashboard`; kisi dashboard paling banyak dua kolom), kecuali `analitik-halaman` yang juga dibaca modul konten (`ambilPopuler`, tag `analitik`) untuk "Paling dicari pekan ini". Search Analytics dan pemeriksa tautan lewat adapter pantau (`asli.ts` memakai token akun layanan dari `indexer/google.ts`, `palsu.ts` dalam memori), dengan saklar `INDEXER_ADAPTER` yang sama; adapter palsu melewati sinkron (data tersimpan tidak tertimpa). Tes memakai `adapterPalsu()` (`dataAnalitik`, `jawabanTautan`), opsi `sekarang`, dan opsi `tugas`. Tanggal Search Analytics adalah tanggal kalender waktu Pasifik (`tanggalPasifik`). Tombol "Pindai ulang sekarang" di bagian Tautan rusak memanggil `POST /api/tugas-seo/pindai`: `mintaPindai` memajukan tugas `tautan` ke sekarang kecuali sedang berjalan atau dimulai kurang dari 10 menit lalu (`batasPindaiManual`, `majukanTugas` satu `UPDATE`), lalu `jalankanPantauSetelahRespons` menjalankannya lewat `after()`; klaim tugas tetap atomik, jadi klik ganda tidak memindai dua kali. Tautan masuk untuk halaman yatim dihitung dari isi Lexical dokumen terbit, relasi pilihan editor, menu header dan footer, dan pilihan beranda; daftar otomatis (rubrik dan halaman berikutnya, terbaru, terkait otomatis) tidak dihitung; tautan ke `/{daftar}/halaman/{n}` dianggap ada bila daftarnya ada (nomornya berubah setiap ada tulisan baru). URL halaman admin lewat `urlAdmin` di `src/lib/admin.ts`.
   - Asisten AI di `src/modules/ai` (spesifikasi §10): `jalankan(payload, tugas, masukan, opsi)` satu-satunya pintu ke Claude untuk tugas `brief`, `draf`, dan `meta` (endpoint `POST /api/artikel/asisten`, status di `GET /api/artikel/asisten`, hanya admin dan editor). Di dalamnya: saklar global `asisten-ai`, batas 6 permintaan per menit per pengguna (dihitung dari `log-ai`), harga model dari global, cadangan anggaran atomik di koleksi tersembunyi `pemakaian-ai` (satu baris per bulan waktu Jakarta, `UPDATE ... WHERE terpakai + cadangan <= batas RETURNING` lewat koneksi pool, bukan transaksi `req`), log `log-ai` (tanpa teks masukan dan keluaran, disimpan 13 bulan), lalu pemeriksa jawaban. Prompt, skema JSON (structured outputs: semua properti wajib, `additionalProperties: false`, tanpa batasan panjang), dan pemeriksa per tugas di `prompt/{brief,draf,meta}.ts` sebagai fungsi murni; data database untuk brief di `brief-data.ts` (memakai `artikelLain`, `cariKanibalisasi`, dan `sarankanLink` panel SEO). Prompt dan keluaran mengikuti aturan copy: keluaran model dibersihkan dari em dash dan en dash (`bersihkanTanda`) dan editor diberi tahu jumlahnya. Cek pola tulisan AI (`pola.ts`) dan cek klaim (`klaim.ts`) fungsi murni yang berjalan di browser dari isian form (`blokArtikel`), tanpa API dan tanpa log. Adapter dipilih env `AI_ADAPTER` (`asli` lewat `fetch` ke Messages API dengan `ANTHROPIC_API_KEY`, `palsu` dalam memori; dev dan tes palsu, produksi tanpa nilai itu ditolak dengan pesan), terpisah dari `INDEXER_ADAPTER`. Model per tugas lewat `AI_MODEL_{BRIEF,DRAF,META}` atau `AI_MODEL` (bawaan Sonnet untuk brief dan draf, Haiku untuk meta). Tes memakai `adapterPalsu()` + `pakaiAdapterAi()` dan opsi `sekarang` (bulan lampau supaya baris anggaran milik tes sendiri); E2E memakai pengguna editor baru per tes yang memanggil AI dan menghapus draf buatannya setelah setiap tes (spec lain membaca daftar artikel admin). AI hanya memberi saran: sidebar (`admin/AsistenAi.tsx`) menerapkan isian hanya lewat tombol dengan Batalkan, draf per bagian disalin (bukan disisipkan), dan menerapkan Intinya atau FAQ atau menyalin draf menyalakan `pakaiDrafAi` (setelah tersimpan menyala tidak bisa dimatikan lagi, juga lewat API dan update massal: hook `beforeValidate` `tetapPakaiDrafAi`); artikel itu wajib mencentang checklist `reviewAi` sebelum terbit (validasi field, jadi berlaku juga untuk terbit massal dan terjadwal) dan tombol terbit nonaktif sampai lengkap (`admin/TombolTerbit.tsx`). Sidebar menyebut bahwa teks dikirim ke Claude (Anthropic).
   - Iklan dan persetujuan cookie di `src/modules/iklan` (spesifikasi §11): pengaturan dari global `iklan` lewat `muatIklan()` (cache bertag `iklan` dan `halaman`), dan `pilihSlot(pengaturan, posisi, id?)` satu-satunya aturan apakah slot tampil (global menyala, halaman Kebijakan Privasi terbit, AdSense, ID penerbit `ca-pub-` 16 angka, slot aktif, unit angka). Keputusan pemilik: saklar Tampilkan iklan divalidasi `validasiTampilkanIklan` (ditolak selama halaman `SLUG_KEBIJAKAN_PRIVASI` belum terbit, dibaca `kebijakanPrivasiTerbit` dari dokumen utama), dan `iklanSiap` ikut memeriksa `kebijakanTerbit`, jadi banner, skrip awal, pemuat, dan slot berhenti tampil bila halaman itu ditarik dari terbit (karena itu `muatIklan` dan `muatBeranda` juga bertag `halaman`). Label slot "Advertisements" dengan `lang="en"` (keputusan pemilik, pengecualian aturan copy: kebijakan penempatan AdSense hanya mengizinkan "Advertisements" atau "Sponsored links"). Posisi tetap per jenis halaman (`artikel-tengah` setelah paragraf ke-N lewat `sisipkanIklanTengah` dan node Lexical `slotIklan`, `artikel-akhir`, `rubrik`, `tools`, dan `beranda` lewat blok Slot iklan); tidak ada posisi di kotak Intinya, di atas H1, atau di dalam kalkulator. Ukuran tetap (300 x 250, 336 x 280, 320 x 100), jadi `SlotIklan` memesan ruangnya dan iklan tidak menggeser isi (CLS 0); halaman meneruskan `iklan={await muatIklan()}` ke komponennya, beranda lewat `susunBeranda` (`sumber.iklan`). Persetujuan dibaca di browser, bukan di server, supaya halaman tetap ISR: skrip awal di `<head>` (`SkripPersetujuan`, `skripAwal()`) menolak semua sinyal Consent Mode v2 lalu menandai `<html data-persetujuan="belum|perlu|semua">` dari cookie `persetujuan` (versi, pilihan, tanggal; 12 bulan), dan CSS menampilkan banner atau slot dari atribut itu sejak paint pertama. Banner (`PanelPersetujuan`) di atas header, dua pilihan setara; "Hanya yang perlu" berarti tanpa skrip iklan sama sekali; "Pengaturan cookie" di footer membukanya lagi, dan menarik persetujuan menghapus cookie AdSense di domain situs (`KUKI_IKLAN_SITUS`: `__gads`, `__gpi`, `__gpi_optout`, `__eoi`) lalu memuat ulang halaman. `PemuatIklan` (layout) memuat `adsbygoogle.js` hanya setelah "Izinkan semua" dan saat slot hampir terlihat; kode penyedia hanya di `adsense.ts`. Banner, skrip awal, dan pemuat hanya ada bila `iklanSiap`. `/ads.txt` dari global (baris AdSense otomatis dari ID penerbit dan baris tambahan editor), 404 bila tidak ada baris. Tes tidak memanggil Google: E2E memakai `cegatIklan()` (skrip AdSense tiruan yang mencatat `dataLayer` dan mengisi unit) dan ID penerbit tiruan `ca-pub-0000000000000000`; database E2E menerbitkan Kebijakan Privasi lalu menyalakan iklan, jadi semua spec berjalan dengan banner. Spec E2E yang menerbitkan, membatalkan terbit, atau menghapus dokumen publik memicu kiriman IndexNow, dan jendela kirim 5 menit menunda kiriman yang ditunggu `indexing.spec.ts`; spec seperti itu diberi nama yang berjalan setelah `indexing.spec.ts` (contoh `privasi.spec.ts`).
   - Admin Payload hanya berbahasa Indonesia (`src/lib/bahasa-admin.ts`, `payload/i18n/id`); teks editor Lexical yang belum diterjemahkan Payload ditambahkan di sana (tes integrasi `admin-bahasa` menjaga tidak ada kunci mentah). Tes E2E admin memakai label Indonesia ("Simpan", "Buka Menu", "Publikasikan perubahan"), dan `getByLabel` dengan `exact` bila label pendek (tautan menu "Keluar"). Avatar admin `'default'` (admin tidak memanggil Gravatar) dan tanggal admin `d MMMM yyyy, HH.mm`.
   - Deskripsi field bawaan Payload (`admin.description`) memakai warna redup (`--theme-elevation-400`) yang gagal kontras axe; satu aturan `.field-description` di `src/app/(payload)/custom.scss` menggantinya dengan `--theme-elevation-650` di semua form admin (dijaga axe di `admin.spec.ts`, tema terang dan gelap). Teks penjelasan di komponen admin buatan sendiri tetap memakai warna tema `--theme-text` atau `--theme-elevation-650`. Axe E2E untuk deskripsi satu field memakai kelas `.field-description-{nama}`: id `field-{nama}` pada checkbox ada di input, bukan di pembungkus field. State form admin menyimpan field array tanpa baris sebagai angka 0, bukan array kosong: periksa `Array.isArray` sebelum memakai nilai dari `getData()`. Isi grup di sidebar Payload baru dirender saat terlihat (`RenderIfInViewport`), jadi tes E2E menggulirnya dulu.
  +- Endpoint aksi admin (`POST` dari tombol di admin) memanggil `tolakSelainAdmin(req)` dari `src/lib/aksiAdmin.ts` (hanya admin, `Sec-Fetch-Site` harus `same-origin`; cookie login Payload SameSite Lax), mengerjakan pekerjaan beratnya lewat `after()`, dan menjawab 202 atau 429 dengan `pesan` siap tampil. Tombol klien memakai `aria-disabled` (bukan `disabled`, supaya fokus keyboard tidak hilang) dan umpan balik di `role="status"`, lalu menanyakan hasilnya dan `router.refresh()`.
  +- Log 404: beacon `POST /api/log-404/catat` (terbuka tanpa login) menolak isian lebih dari 2 KB (`MAKS_ISIAN_404`), mengabaikan kiriman dengan `Sec-Fetch-Site` selain `same-origin`, dan mencatat paling banyak 200 path baru per 24 jam (`MAKS_PATH_BARU_24_JAM`); yang diabaikan dijawab 204 yang sama. `catat404` menulis lewat SQL atomik (`UPDATE` lalu `INSERT ... SELECT ... WHERE` dengan `ON CONFLICT`), tanpa menyimpan IP. Batas laju per IP di Vercel Firewall (aturan rate limit pemilik, bukan kode).
   - Nilai di `req.context` yang dihitung dengan `await` operasi Payload ditulis setelah `await` selesai (simpan ke variabel dulu): operasi Payload dengan `req` bisa mengganti objek `req.context`, sehingga `req.context[k] = await ...` hilang.
   - URL media selalu lewat `src/modules/media` (`bangunUrl`, `propsGambar`, `urlOg`), jangan merangkai URL Cloudinary manual. `next/image` memakai loader kustom Cloudinary, jadi `src` harus URL dari `bangunUrl`/`propsGambar` dan `width`/`height` wajib diisi.
   - Media disimpan di Cloudinary (folder `point/gambar`, `point/video`). Tanpa `CLOUDINARY_*` di env (lokal, tes) dipakai klien palsu dalam memori: file tidak tersimpan permanen. Tes tidak boleh memanggil jaringan.
   - Halaman publik di `src/app/(frontend)/` dirender ISR: rute dinamis memakai `generateStaticParams` yang mengembalikan `[]`, dan data diambil lewat `muat*()` dari `src/modules/konten` (cache bertag `TAG`). Path tanpa dokumen diakhiri `tanganiTidakAda(path)` di komponen halaman (redirect dari koleksi `redirect` atau 404), sedangkan `generateMetadata` mengembalikan `metadataTidakDitemukan()` untuk path itu.
  -- Rute catch-all `[...jalur]` mencari dokumen lewat `muatJalur()`: satu segmen artikel, pilar, lalu halaman statis; dua segmen subkategori di bawah pilarnya. Redirect otomatis saat path berubah lewat `terapkanRedirect` (`src/hooks/redirectSaatPathBerubah.ts`): koleksi berpath sederhana memakai `redirectSaatPathBerubah`, subkategori (path bergantung slug pilar) memakai `src/hooks/redirectSubkategori.ts`, termasuk saat pilar berganti slug. Jenis halaman tingkat atas baru ditambahkan di `muatJalur`, bukan sebagai rute bersaudara. `/cari` satu-satunya halaman dinamis (membaca `searchParams`, noindex); hasilnya di-cache per kueri.
  +- Rute catch-all `[...jalur]` mencari dokumen lewat `muatJalur()`: satu segmen artikel, pilar, lalu halaman statis; dua segmen subkategori di bawah pilarnya; akhiran `/halaman/{n}` (`pisahHalaman`) hanya untuk rubrik, `/halaman/1` dialihkan 308 (`{ jenis: 'alihkan' }`), nomor tidak sah atau di luar jangkauan 404. Paginasi berbasis path di `src/modules/konten/paginasi.ts` (`UKURAN_HALAMAN` 24, `susunPaginasi` yang juga menolak nomor di luar jangkauan) dan komponen `Paginasi` (tautan `<a href>` biasa, `aria-current`, target 44 px): data `ambilRubrik(payload, pilar, sub, nomor)` dan `ambilPenulis(payload, slug, nomor)` memuat satu halaman dengan urutan `-terbitPada`, `-id`; profil penulis berhalaman di rute bersarang `penulis/[slug]/halaman/[nomor]`. Halaman berikutnya bertag cache sama dengan halaman 1, judul berakhiran ", halaman N", canonical ke dirinya sendiri, tetap diindeks, tidak masuk sitemap, dan tidak dikabarkan Mesin Indexing; intro pilar, bio penulis, dan ProfilePage hanya di halaman 1. Redirect otomatis saat path berubah lewat `terapkanRedirect` (`src/hooks/redirectSaatPathBerubah.ts`): koleksi berpath sederhana memakai `redirectSaatPathBerubah`, subkategori (path bergantung slug pilar) memakai `src/hooks/redirectSubkategori.ts`, termasuk saat pilar berganti slug. Jenis halaman tingkat atas baru ditambahkan di `muatJalur`, bukan sebagai rute bersaudara. `/cari` satu-satunya halaman dinamis (membaca `searchParams`, noindex); hasilnya di-cache per kueri.
   - Beranda dirender dari global `beranda` lewat `susunBeranda()`: urutan blok dari editor, tanpa data palsu (blok "Paling dicari" menampilkan artikel dengan klik Google 7 hari terbanyak bila datanya cukup untuk semua tempat, selain itu tulisan terbaru dengan judul "Tulisan terbaru", aturan `daftarPopuler` yang juga dipakai halaman 404; newsletter hanya tautan ke form penyedia, blok Slot iklan dirender bila slotnya aktif di global `iklan`).
   - Kalkulator: semua rumus di `src/modules/hitung` sebagai fungsi murni. `hitung(toolId, masukan, tanggal, parameter, teks)` satu-satunya titik masuk perhitungan (dipakai sama di server dan browser), `siapkanKalkulator` untuk halaman, `periksaParameter` untuk validasi koleksi `parameter-tools`. Rumus per tool di file sendiri (`gaji-bersih.ts`, `thr.ts`, ...). Angka aturan (tarif, PTKP, batas iuran, kategori, konversi) tidak pernah ditulis sebagai konstanta di kode: definisikan kuncinya di `parameter` rumusnya, isi nilainya lewat `src/seed/parameter-tools.ts` dengan sumber resmi dan tanggal berlaku, dan uji dengan contoh perhitungan dari sumber resmi. Parameter yang tidak berlaku untuk tanggal hitung memakai parameter terakhir yang valid dengan peringatan.
   - Halaman `/tools/{slug}` ISR: hasil contoh untuk isi form awal dirender server (tampil tanpa JavaScript), `Kalkulator` (klien) menghitung di browser. Label dan bantuan isian dari CMS (`bantuanInput`) diteruskan ke `hitung` lewat `teks`, jadi pesan galat memakai label yang sama dengan form. Angka hasil baru memakai animasi CSS, tanpa GSAP.
  @@ -51,7 +53,7 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Tautan internal lewat komponen `Tautan` (`next/link` untuk path situs). Warna pilar lewat atribut `data-warna` (nilai field `warna` pilar) dan selalu bersama nama pilarnya. Ikon lewat `Ikon` (path Lucide yang disalin, tanpa paket ikon).
   - Copy UI: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru. Angka lewat `Intl.NumberFormat('id-ID')` (`teksAngka` modul hitung); rupiah dari `Intl` memakai spasi tak putus setelah "Rp", jadi di kode dan tes tulis `\u00a0`, jangan karakter aslinya. Begitu juga em dash dan en dash yang dibutuhkan kode dan tes (pembersih dan cek pola asisten AI): tulis `\u2014` dan `\u2013`.
   - Tes unit di `tests/unit/*.test.ts`, tes integrasi di `tests/int/*.int.spec.ts` dan memakai `getTestPayload()` + `unik()` dari `tests/int/helpers.ts`.
  -- Tes E2E di `tests/e2e/*.spec.ts` memakai `cegatCloudinary()` (gambar tanpa jaringan) dan `periksaAxe()` (WCAG 2.2 AA) dari `tests/e2e/bantu.ts`; data contohnya di `tests/e2e/siapkan.ts` (termasuk klik Google contoh `KLIK_CONTOH` dan total harian `HARI_CONTOH` untuk "Paling dicari" dan dashboard SEO). Anggaran JavaScript (total di bawah 160 KiB per halaman, hanya skrip dari situs sendiri, spesifikasi §12) dijaga `motion.spec.ts` untuk setiap jenis halaman; jenis halaman baru ditambahkan ke daftarnya. JS kalkulator di atas JS artikel dijaga di bawah 25 KB, chunk JS tata letak milik point. (banner persetujuan, pemuat iklan, animasi masuk, menu aktif) di bawah 8 KiB, dan keduanya bersama di bawah 25 KB. Kalkulator diuji di `kalkulator.spec.ts` (enam tools dari `TOOLS_CONTOH` di tiga ukuran layar) dan `hitung.spec.ts` (contoh resmi DJP lewat form).
  +- Tes E2E di `tests/e2e/*.spec.ts` memakai `cegatCloudinary()` (gambar tanpa jaringan) dan `periksaAxe()` (WCAG 2.2 AA) dari `tests/e2e/bantu.ts`; data contohnya di `tests/e2e/siapkan.ts` (termasuk klik Google contoh `KLIK_CONTOH` dan total harian `HARI_CONTOH` untuk "Paling dicari" dan dashboard SEO, dan `PAGINASI_E2E`: 50 tulisan lama di subkategori Persiapan ujian pilar Belajar, bertanggal terbit 2025 dan dibuat sebelum tulisan lain, supaya daftar artikel admin halaman pertama, tulisan terbaru, dan rubrik Uang & Karier tidak berubah). Isi 404 Next 16.3.3 kadang tidak dirender (cangkang `<html id="__next_error__">`, sekitar 0,5% kunjungan 404 di E2E penuh; stylesheet yang dibatalkan saat React mengganti dokumen tidak diminta ulang): tes yang membuka path 404 dan gagal dengan cangkang itu atau beacon `/api/log-404/catat` yang tidak terkirim diulang sekali lewat `pnpm test:e2e`, tanpa menaikkan timeout. `pantau-aksi.spec.ts` (Cek sekarang dan Pindai ulang sekarang menjalankan antrean Mesin Indexing) berjalan setelah `indexing.spec.ts`. Anggaran JavaScript (total di bawah 160 KiB per halaman, hanya skrip dari situs sendiri, spesifikasi §12) dijaga `motion.spec.ts` untuk setiap jenis halaman; jenis halaman baru ditambahkan ke daftarnya. JS kalkulator di atas JS artikel dijaga di bawah 25 KB, chunk JS tata letak milik point. (banner persetujuan, pemuat iklan, animasi masuk, menu aktif) di bawah 8 KiB, dan keduanya bersama di bawah 25 KB. Kalkulator diuji di `kalkulator.spec.ts` (enam tools dari `TOOLS_CONTOH` di tiga ukuran layar) dan `hitung.spec.ts` (contoh resmi DJP lewat form).
   
   ## Batasan
   - Jangan commit `.env`. `.env.test` boleh di-commit karena hanya untuk database tes lokal dan tidak boleh berisi `CLOUDINARY_*`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `CRON_SECRET`, `INDEXER_ADAPTER=asli`, `ANTHROPIC_API_KEY`, atau `AI_ADAPTER=asli`. Kredensial Google dan kunci API Claude hanya di env server Vercel, tidak pernah di CMS, log, atau tes.
  ```

  ```diff
  diff --git a/docs/superpowers/specs/2026-11-03-point-lat-design.md b/docs/superpowers/specs/2026-11-03-point-lat-design.md
  index 949e2f4..0799e8f 100644
  --- a/docs/superpowers/specs/2026-11-03-point-lat-design.md
  +++ b/docs/superpowers/specs/2026-11-03-point-lat-design.md
  @@ -215,16 +215,16 @@ Validasi: kotak Intinya wajib sebelum terbit; alt gambar wajib; gambar utama ≥
   |---|---|
   | `/` | beranda |
   | `/{slug}` | artikel (semua tipe kecuali glosarium) |
  -| `/{pilar}` dan `/{pilar}/{subkategori}` | halaman rubrik |
  +| `/{pilar}` dan `/{pilar}/{subkategori}` | halaman rubrik; tulisan lebih lama di `/{pilar}/halaman/{n}` dan `/{pilar}/{subkategori}/halaman/{n}` (24 per halaman, `/halaman/1` dialihkan ke alamat rubrik) |
   | `/tools` dan `/tools/{slug}` | indeks tools dan kalkulator |
   | `/glosarium` dan `/glosarium/{slug}` | glosarium |
   | `/video` dan `/video/{slug}` | video |
  -| `/penulis/{slug}` | profil penulis |
  +| `/penulis/{slug}` | profil penulis; tulisan lebih lama di `/penulis/{slug}/halaman/{n}` |
   | `/cari` | pencarian (noindex) |
   | `/tentang`, `/kebijakan-redaksi`, `/pedoman-media-siber`, `/pasang-iklan`, `/kontak` | halaman statis |
   | `/sitemap.xml`, `/sitemap/{jenis}.xml`, `/news-sitemap.xml`, `/robots.txt`, `/feed.xml`, `/ads.txt`, `/{indexnow-key}.txt` | teknis |
   
  -Slug pilar, subkategori, dan halaman tidak boleh bentrok dengan slug artikel (divalidasi di CMS). Mengganti slug membuat redirect 301 otomatis, termasuk `/{pilar}/{subkategori}` saat slug subkategori berganti, subkategori pindah pilar, atau slug pilar berganti.
  +Slug pilar, subkategori, dan halaman tidak boleh bentrok dengan slug artikel (divalidasi di CMS), dan slug `halaman` dicadangkan untuk paginasi. Halaman paginasi punya judul (", halaman N") dan canonical sendiri, tetap diindeks, tetapi tidak masuk sitemap dan tidak dikabarkan Mesin Indexing; setiap artikel sudah ada di sitemap (panduan paginasi Google: jangan jadikan halaman 1 canonical seluruh urutan). Mengganti slug membuat redirect 301 otomatis, termasuk `/{pilar}/{subkategori}` saat slug subkategori berganti, subkategori pindah pilar, atau slug pilar berganti.
   
   ## 8. SEO
   
  @@ -248,7 +248,7 @@ Slug pilar, subkategori, dan halaman tidak boleh bentrok dengan slug artikel (di
   - JSON-LD: `Article`/`NewsArticle` (explainer), `BreadcrumbList`, `Organization` (+ logo), `Person` (penulis), `VideoObject`, `WebSite`, `WebApplication` untuk tools. FAQ tetap ditulis sebagai isi; rich result FAQ (dihapus Google Mei 2026) dan HowTo (dihapus 2023) tidak diandalkan.
   - Halaman yatim (tanpa link masuk) dilaporkan di dashboard: artikel dan halaman terbit (tidak noindex) tanpa tautan dari isi dokumen terbit lain, relasi pilihan editor (artikel terkait, tools, video), menu header dan footer, atau pilihan beranda. Daftar otomatis (rubrik, tulisan terbaru, artikel terkait otomatis, sitemap) tidak dihitung karena isinya berganti. Dihitung pindai harian di cron.
   - Pengecek link rusak: tautan internal dicocokkan dengan database setiap hari (dokumen terbit, halaman indeks, redirect; tautan ke alamat lama yang dialihkan ikut dilaporkan); tautan ke situs lain dicek seminggu sekali (HEAD, GET bila HEAD ditolak, batas 10 detik, paling banyak 10 URL per jalan cron). 404 dan 410 atau domain hilang berarti rusak; kode lain dan batas waktu "perlu dicek manual".
  -- Log 404 dengan tombol "buat redirect" (form redirect dengan path terisi).
  +- Log 404 dengan tombol "buat redirect" (form redirect dengan path terisi). Beacon pencatatnya dibatasi tanpa menyimpan IP: isian paling besar 2 KB, hanya dari halaman situs sendiri, paling banyak 200 path baru per 24 jam; batas laju per IP lewat aturan rate limit Vercel Firewall.
   
   ### Mesin Indexing
   
  @@ -260,7 +260,7 @@ Pemicu: `terbit`, `ubah-besar`, `hapus` (artikel, tools, video, halaman, pilar),
   | 2. Search Console | `sitemaps.submit` untuk sitemap index, maksimal sekali per 30 menit sejak kiriman berhasil terakhir (kabar di antaranya menunggu dan tergabung) |
   | 3. IndexNow | POST daftar URL ke `api.indexnow.org` dengan key dari CMS dan file `/{key}.txt`, satu POST untuk semua URL yang antre, maksimal sekali per 5 menit |
   | 4. Google Indexing API (opsional) | hanya jika saklar aktif; `URL_UPDATED`/`URL_DELETED`; berhenti saat kuota harian (dari CMS, default 200) tercapai; banner peringatan bahwa penggunaan untuk artikel di luar ketentuan Google |
  -| 5. Cek status | URL Inspection API pada +6 jam, +24 jam, +3 hari, +7 hari, +14 hari, +30 hari (dua tahap terakhir keputusan pemilik 2026-11-05, karena domain baru sering belum dikenal Google lebih dari seminggu); berhenti saat Terindeks; cek di atas batas harian (CMS, bawaan 1.000 dari kuota Google 2.000 per properti) ditunda ke hari berikutnya |
  +| 5. Cek status | URL Inspection API pada +6 jam, +24 jam, +3 hari, +7 hari, +14 hari, +30 hari (dua tahap terakhir keputusan pemilik 2026-11-05, karena domain baru sering belum dikenal Google lebih dari seminggu); berhenti saat Terindeks; cek di atas batas harian (CMS, bawaan 1.000 dari kuota Google 2.000 per properti) ditunda ke hari berikutnya. Tombol "Cek sekarang" di daftar Status indeks (hanya admin) memajukan cek satu URL lewat antrean, dibatasi kuota harian yang sama dan jeda 10 menit per URL |
   | 6. Log | setiap langkah ke `logIndexing` |
   
   Kegagalan: retry 3 kali dengan jeda 1, 5, 30 menit; setelah itu status Gagal di log (cek status: status indeks Error) dan peringatan di dashboard. Kuota Google habis (429): ditunda ke awal hari kuota berikutnya (tengah malam waktu Pasifik). Penghapusan dan batal terbit: URL keluar dari sitemap, halaman menjawab 404, atau 308 ke tujuan bila ada redirect (keputusan pemilik di Rencana 4A: redirect lewat `permanentRedirect()`, kode 410 di CMS menjawab 404), IndexNow tetap dikabari, dan `URL_DELETED` bila Indexing API aktif.
  @@ -271,7 +271,7 @@ Prasyarat: properti domain `point.lat` di Search Console; akun layanan Google Cl
   
   ### Dashboard SEO (di admin)
   
  -View admin `/admin/seo` dengan tautan di atas menu, hanya untuk admin: klik, impresi, CTR, dan posisi 28 hari (kartu angka dan grafik klik harian dengan tabel angkanya), halaman teratas per URL (Search Analytics API `searchanalytics.query`, data final, disinkron sekali sehari; data Google baru final 2 sampai 3 hari kemudian); ringkasan status indeks; log indexing terbaru dan jumlah langkah gagal 7 hari; tautan rusak; halaman yatim; 404 teratas dengan tombol "buat redirect"; status setiap tugas harian. Tanpa data (akun layanan belum diatur, adapter palsu, domain baru) dan saat sinkron gagal, setiap bagian menjelaskan sebabnya. Fase 2: daftar "perlu diperbarui" berdasarkan penurunan klik.
  +View admin `/admin/seo` dengan tautan di atas menu, hanya untuk admin: klik, impresi, CTR, dan posisi 28 hari (kartu angka dan grafik klik harian dengan tabel angkanya), halaman teratas per URL (Search Analytics API `searchanalytics.query`, data final, disinkron sekali sehari; data Google baru final 2 sampai 3 hari kemudian); ringkasan status indeks; log indexing terbaru dan jumlah langkah gagal 7 hari; tautan rusak; halaman yatim; 404 teratas dengan tombol "buat redirect"; status setiap tugas harian, dengan tombol "Pindai ulang sekarang" untuk pindai tautan (jeda 10 menit sejak pindai terakhir dimulai). Tanpa data (akun layanan belum diatur, adapter palsu, domain baru) dan saat sinkron gagal, setiap bagian menjelaskan sebabnya. Fase 2: daftar "perlu diperbarui" berdasarkan penurunan klik.
   
   ## 9. Media: Cloudinary
   
  ```

- [ ] **Langkah 2: Halaman berikutnya masuk anggaran JS**

  ```diff
  diff --git a/tests/e2e/motion.spec.ts b/tests/e2e/motion.spec.ts
  index dca17b6..b37542b 100644
  --- a/tests/e2e/motion.spec.ts
  +++ b/tests/e2e/motion.spec.ts
  @@ -10,13 +10,18 @@ import { SLUG, SLUG_SUB, SLUG_VIDEO } from './data'
    */
   const ANGGARAN_JS = 160 * 1024
   
  -/** Setiap jenis halaman publik: beranda, artikel, rubrik, halaman statis, penulis, video, tools, kalkulator, cari. */
  +/**
  + * Setiap jenis halaman publik: beranda, artikel, rubrik, halaman statis, penulis, video, tools, kalkulator, cari,
  + * dan halaman berikutnya rubrik dan profil penulis (paginasi, rute penulis tersendiri).
  + */
   const HALAMAN_ANGGARAN = [
     '/',
     `/${SLUG.panduan}`,
     `/uang-karier/${SLUG_SUB.pajak}`,
     '/tentang',
     '/penulis/redaksi',
  +  '/belajar/halaman/2',
  +  '/penulis/redaksi/halaman/2',
     '/video',
     `/video/${SLUG_VIDEO.pph21}`,
     '/tools',
  ```

  Tes anggaran adalah satu tes yang memeriksa setiap path di daftar, jadi jumlah tes E2E tidak berubah. Probe: kedua halaman berikutnya 140,5 KiB, sama dengan `/uang-karier/pajak` dan `/penulis/redaksi` (komponen `Paginasi` server component tanpa JS tambahan).

- [ ] **Langkah 3: Pemeriksaan lengkap**

  Jalankan:

  ```bash
  pnpm generate:types && git diff --stat src/payload-types.ts
  pnpm generate:importmap && git diff --stat "src/app/(payload)/admin/importMap.js"
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:int
  pnpm test:e2e
  pnpm test:e2e
  pnpm seed
  pnpm build
  git status --short
  ```

  Hasil yang diharapkan: `payload-types.ts` dan import map tidak berubah; type check dan lint bersih; unit 523 tes (76 file); integrasi 158 tes (47 file) dua kali (putaran kedua di database tes yang sudah berisi data putaran pertama: tes mencari dokumennya sendiri lewat ID atau `unik()`, tes `catat404` memakai path unik dan menghitung batasnya dari baris yang sudah ada, tes "Cek sekarang" memakai baris status indeks miliknya sendiri, dan tes "Pindai ulang" mengosongkan `tugas-seo` sebelum setiap tes); E2E 150 tes dua kali berturut-turut (putaran kedua memakai database E2E yang sama tanpa dibuang: `siapkan.ts` menghapus konten lama lalu membuat ulang subkategori Persiapan ujian dan 50 tulisannya, dan `pantau-aksi.spec.ts` menghapus baris tugas pindai tautan sebelum mulai); build mencantumkan rute baru `● /penulis/[slug]/halaman/[nomor]` sementara `○ /`, `● /[...jalur]`, dan `● /penulis/[slug]` tetap; `git status` hanya menunjukkan tiga file Langkah 1 dan 2.

- [ ] **Langkah 4: Uji visual di tiga ukuran layar**

  Bangun dan jalankan build dengan database E2E yang sudah berisi konten contoh dari langkah 3:

  ```bash
  set -a && . ./.env.test && set +a
  DATABASE_URL="${DATABASE_URL%%\?*}_e2e" CLOUDINARY_CLOUD_NAME=e2e CLOUDINARY_API_KEY=e2e CLOUDINARY_API_SECRET=e2e INDEXER_ADAPTER=palsu AI_ADAPTER=palsu NEXT_PUBLIC_SITE_URL=http://localhost:3200 pnpm build
  (DATABASE_URL="${DATABASE_URL%%\?*}_e2e" CLOUDINARY_CLOUD_NAME=e2e CLOUDINARY_API_KEY=e2e CLOUDINARY_API_SECRET=e2e INDEXER_ADAPTER=palsu AI_ADAPTER=palsu NEXT_PUBLIC_SITE_URL=http://localhost:3200 PORT=3200 pnpm start > /tmp/point-lat-start.log 2>&1 &)
  timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'
  ```

  Periksa di 375, 768, dan 1440 px (DevTools) halaman 1, 2, dan 3 dari `/belajar`, `/belajar/persiapan-ujian`, dan `/penulis/redaksi`, masing-masing sebelum memilih (banner persetujuan tampil) dan setelah "Izinkan semua" (slot rubrik di bawah navigasi halaman): posisi "Halaman N dari M", "Sebelumnya" dan "Berikutnya" sejajar dalam satu baris di 375 px dan nomor di bawahnya, arah di kiri dan nomor di kanan mulai 768 px, halaman yang dibuka berwarna tombol, setiap tautan paling kecil 44 x 44 px, judul tab berakhiran ", halaman N", tidak ada geser horizontal, cincin fokus terlihat saat menekan Tab, dan profil penulis halaman 2 tanpa bio. Ulangi satu halaman dengan reduced motion (DevTools, Rendering). Lalu masuk ke `http://localhost:3200/admin` dengan akun E2E (`ADMIN_E2E` di `tests/e2e/data.ts`) dan periksa di 375 dan 1440 px, tema terang dan gelap (halaman Akun, Tema Admin): daftar Status indeks (kolom "Cek sekarang": siap, sedang dicek, selesai dengan label status, lalu klik lagi untuk pesan batas berwaktu WIB), Dashboard SEO (tombol "Pindai ulang sekarang" di bagian tautan: siap, memindai, selesai dengan ringkasan, lalu dibatasi), dan global Iklan (label baris slot). Pastikan pesan dibacakan (`role="status"`), fokus tetap di tombol yang ditekan, dan tidak ada geser horizontal. Hentikan server dengan `fuser -k 3200/tcp`, lalu `pnpm build` lagi dengan env biasa.

- [ ] **Langkah 5: Commit**

  Bila build menambahkan blok "nextjs-agent-rules" ke `CLAUDE.md`, hapus blok itu saja (perubahan langkah 1 tetap ada), lalu:

  ```bash
  git add CLAUDE.md docs/superpowers/specs/2026-11-03-point-lat-design.md tests/e2e/motion.spec.ts
  git commit -m "docs: paginasi berbasis path, Cek sekarang dan Pindai ulang sekarang, penjaga beacon log 404, dan isi 404 Next di CLAUDE.md dan spesifikasi; halaman berikutnya rubrik dan profil penulis masuk anggaran JS"
  ```

---

## Selesai bila

- `pnpm test` lulus (unit 523 tes (76 file), integrasi 158 tes (47 file), juga di database tes yang sudah berisi data putaran sebelumnya), `pnpm test:e2e` lulus (150 tes) dua kali berturut-turut tanpa membuang database E2E, `pnpm typecheck` dan `pnpm lint` bersih, `pnpm build` berhasil dengan rute baru `● /penulis/[slug]/halaman/[nomor]` sementara `○ /`, `● /[...jalur]`, dan `● /penulis/[slug]` tetap, semuanya tanpa jaringan.
- Rubrik pilar dan subkategori serta profil penulis dengan lebih dari 24 tulisan punya halaman berikutnya di `/halaman/{n}`: setiap tulisan tampil tepat sekali di seluruh halaman, `/halaman/1` dialihkan 308 ke alamat daftar, nomor tidak sah atau di luar jangkauan 404, slug `halaman` ditolak di semua koleksi.
- Setiap halaman berikutnya punya judul ", halaman N", canonical ke dirinya sendiri, remah roti "Halaman N", dan tidak masuk sitemap; intro pilar, bio penulis, dan ProfilePage hanya di halaman 1; pindai tautan tidak melaporkan tautan ke halaman berikutnya sebagai rusak.
- Navigasi halaman bisa dirayapi (`<a href>`), dipakai dengan keyboard, dibacakan pembaca layar ("Halaman 2 dari 3", `aria-current`), lolos axe di 375, 768, dan 1440 px dengan banner persetujuan dan slot iklan menyala, tanpa geser horizontal, setiap tautan paling kecil 44 x 44 px, dan slot iklan rubrik di bawahnya.
- Admin bisa menekan "Cek sekarang" di daftar Status indeks dan "Pindai ulang sekarang" di dashboard SEO: pekerjaan berjalan lewat antrean dan `after()`, klik ganda atau dua admin bersamaan hanya menjalankan sekali, batas kuota harian dan jeda 10 menit dijawab 429 dengan waktu boleh lagi, umpan balik dibacakan lewat `role="status"` di tema terang dan gelap, dan bukan admin atau permintaan dari situs lain ditolak.
- Beacon log 404 menolak isian lebih dari 2 KB, mengabaikan kiriman dari situs lain dan path baru di atas 200 per 24 jam dengan jawaban 204 yang sama, menghitung kunjungan bersamaan tanpa kehilangan hitungan, dan tidak menyimpan IP.
- Baris slot di global Iklan berlabel ID slot dan posisinya.
- `CLAUDE.md` dan spesifikasi memuat aturan paginasi, aksi admin, beacon 404, dan aturan ulang sekali untuk isi 404 yang tidak dirender.

## Setup dari pemilik (setelah rencana ini terpasang)

- [ ] **Aturan rate limit beacon 404 di Vercel Firewall** (setelah proyek Vercel produksi ada, Rencana 8C). Di dashboard Vercel: pilih proyek point.lat, buka **Firewall**, pilih **Configure**, lalu **+ New Rule**. Nama: "Batas beacon log 404". Kondisi **If** (semua harus benar): path permintaan sama dengan `/api/log-404/catat`, dan metode `POST`. **Then**: Rate Limit, algoritma Fixed Window, Time Window 60 detik, Request Limit 10, kunci IP. Aksi: mulai dengan **Log** selama beberapa hari untuk melihat lalu lintas tanpa memblokir, lalu ganti ke **Default (429)**. Pilih **Save Rule**, lalu **Review Changes** dan **Publish** (berlaku tanpa deploy ulang). Lewat terminal, perintah `vercel firewall rules` menyiapkan aturan yang sama sebagai draf yang baru berlaku setelah `vercel firewall publish`. Kebanyakan pembaca mengirim satu beacon per halaman 404 yang dibuka, jadi 10 per menit per IP longgar untuk pembaca biasa; pembaca di belakang IP bersama (jaringan seluler dan kantor) yang melewati batas hanya kehilangan sebagian hitungan log, tidak melihat galat.
- [ ] **Pilih aturan bila memakai paket Hobby:** Hobby hanya punya satu aturan rate limit per proyek (Pro 40). Bila produksi memakai Hobby, putuskan apakah satu aturan itu untuk beacon 404 (penjaga aplikasi tetap berlaku tanpa aturan ini) atau untuk `/cari` (satu-satunya halaman dinamis). Keputusan paket ada di Rencana 8C.
- [ ] **Kredensial Google sudah dari Rencana 6A dan 6B.** "Cek sekarang" dan "Pindai ulang sekarang" memakai adapter yang sama dengan cron (`INDEXER_ADAPTER=asli` dan akun layanan hanya di env server Vercel produksi). Di dev, tes, dan pratinjau tombol berjalan dengan adapter palsu ("Belum dikenal Google").
- [ ] **Keputusan upgrade Next:** setujui atau tolak naik ke Next 16.3.8 (dan `eslint-config-next` 16.3.8) di Rencana 8C (lihat Dependensi baru).

## Cakupan yang ditunda (dengan alasan)

| Butir | Ditunda ke | Alasan |
|---|---|---|
| Naik ke Next 16.3.8 | Rencana 8C (persiapan rilis), butuh persetujuan pemilik | Perbaikan keamanan di 16.3.4 sampai 16.3.8; tidak terbukti memperbaiki isi 404 (lihat Keputusan teknis). Diuji bersama build dan Lighthouse produksi. |
| Naik ke Next 16.4.x (terbaru 16.4.5) | belum direncanakan | Versi minor dengan fitur baru; rentang peer Payload 3.92.1 menerimanya, tetapi belum diuji di probe. |
| Laporan isu isi 404 kosong ke Next.js | belum direncanakan (butuh reproduksi yang konsisten) | Reproduksi terisolasi 0 gagal dari 1.000 kunjungan (lima putaran 200) dan 400 tes runner; satu jejak kegagalan alami ada (Temuan review), tetapi laporan isu butuh langkah yang bisa diulang orang lain. |
| Paginasi `/video` | belum direncanakan (bila video terbit lebih dari 60) | `MAKS_VIDEO_INDEKS` 60 cukup untuk MVP. Slug `halaman` sudah dicadangkan, jadi `/video/halaman/{n}` kelak tidak bentrok dengan slug video; aturan dan komponen paginasi rencana ini bisa dipakai ulang. |
| Paginasi `/cari` | Fase 2 | 20 hasil teratas, halaman dinamis dan noindex; pembaca memperjelas kata kunci. |
| Paginasi `/glosarium` dan `/tools` | tidak direncanakan | Indeks lengkap di satu halaman (dikelompokkan abjad dan pilar), bukan daftar kronologis. |
| Form newsletter sematan | Fase 2 atau setelah pemilik memilih penyedia | Penyedia belum dipilih; beranda tetap menautkan form penyedia (Rencana 4B). |
| "Cek sekarang" untuk beberapa halaman sekaligus, atau dari form dokumen | belum direncanakan | Kuota harian dipakai bersama cek terjadwal; daftar Status indeks sudah bisa difilter per path. |
| Batas laju `/cari` dan endpoint publik lain | Rencana 8C (bersama keputusan paket Vercel) | Butuh aturan Firewall pemilik; di Hobby hanya ada satu aturan. |
| Pelanggaran axe bawaan admin Payload di array Slot iklan (`aria-command-name` pada pegangan geser baris) | belum direncanakan (sudah tercatat di Rencana 8A) | Komponen bawaan Payload; label baris buatan rencana ini sendiri bersih. |

## Risiko dan pertanyaan terbuka

| Risiko | Mitigasi |
|---|---|
| Isi 404 Next 16.3.3 kadang tidak dirender (sekitar 0,5% kunjungan 404 di E2E penuh); di browser pembaca halaman itu bisa tampil kosong sampai dimuat ulang. | Tidak terbukti diperbaiki 16.3.8 dan tidak bisa direproduksi terisolasi; aturan ulang sekali di tes; jejak tersimpan untuk laporan. **Pertanyaan:** pantau di produksi (8C) dulu, atau naik 16.3.8 lebih awal? |
| Penyerang bisa menghabiskan kuota 200 path baru per 24 jam lebih dulu, sehingga 404 asli hari itu tidak tercatat. | Aturan rate limit Firewall per IP memperlambat pengisian; kunjungan ke path yang sudah tercatat tetap dihitung; kuota pulih dalam 24 jam. **Pertanyaan:** angka 200 per 24 jam dan 10 per menit per IP sudah sesuai? |
| Di bawah kiriman bersamaan, batas path baru bisa terlewati beberapa baris (dua transaksi menghitung sebelum keduanya menulis). | Batas itu rem, bukan kuota pasti; tidak ada data pribadi yang tersimpan. |
| Hitungan rate limit Vercel per region, jadi lalu lintas dari banyak region bisa melewati batas satu region. | Penjaga aplikasi tidak bergantung region. |
| "Cek sekarang" memakai kuota cek harian yang sama dengan cek terjadwal, jadi klik manual yang banyak bisa menunda cek terjadwal ke hari berikutnya. | Kuota bawaan 1.000 dari 2.000 per properti per hari; jeda 10 menit per halaman; pesan menyebut kapan kuota pulih. |
| Halaman berikutnya diindeks dan bisa muncul di hasil cari bersama halaman 1. | Panduan Google memperlakukan setiap halaman sebagai halaman terpisah dan melarang canonical ke halaman 1; judul berakhiran nomor halaman. **Pertanyaan:** tetap `index, follow` (rekomendasi rencana ini) atau `noindex, follow` untuk halaman 2 dan seterusnya? |
| Kolom baru `diminta_pada` di `status_indeks`. | Aditif dan boleh kosong; dev dan tes memakai push skema Payload; migrasi produksi Payload di Rencana 8C mencakup kolom ini. |
| Dokumen lama dengan slug `halaman` akan gagal validasi saat disimpan ulang. | Belum ada data produksi; seed dan data contoh tidak memakai slug itu. |

## Temuan review sebelum eksekusi

| Temuan | Tindakan |
|---|---|
| Spec E2E lain membaca daftar artikel admin halaman pertama (urut `-createdAt`), tulisan terbaru, news sitemap 48 jam, "Paling dicari pekan ini", dan rubrik Uang & Karier. | Sudah masuk Task 4: 50 tulisan paginasi dibuat sebelum tulisan lain, bertanggal terbit Januari sampai Februari 2025, di subkategori khusus Persiapan ujian (pilar Belajar). Spec lama lulus tanpa diubah karena data ini. |
| Uji visual probe Task 4: navigasi dalam satu baris yang membungkus (arah dan nomor bercampur) tampil tidak rapi di 375 px. | Sudah masuk Task 4: arah di satu baris selebar kontainer dan nomor di baris kedua; mulai 768 px arah di kiri dan nomor di kanan. E2E mengukur tinggi tautan dan geser horizontal di tiga ukuran. |
| Parameter tool mengubah escape `\u2026` (elipsis jeda) menjadi karakter aslinya di komponen dan tesnya. | Ditulis ulang lewat skrip; komponen dan tes memakai escape. Pemindaian akhir rencana dan diff probe tanpa em dash, en dash, dan spasi tak putus asli. |
| Lint `react-hooks/purity` menolak `Date.now()` di sel "Cek sekarang". | Sudah masuk Task 6: keadaan awal dihitung `jedaCekManual(dimintaPada, sekarang = new Date())`, fungsi murni yang diuji unit. |
| Tes unit dashboard SEO gagal "invariant expected app router to be mounted" setelah tombol klien ditambahkan. | Sudah masuk Task 7: `vi.mock('next/navigation')` di `pantau-dashboard.test.ts`; aturannya di Global Constraints. |
| Pesan tes gagal Task 7 dipotong Vitest di tengah HTML. | Pesan yang diharapkan ditulis sebagai awalan yang benar-benar tercetak. Semua pesan "tes gagal dulu" Task 1 sampai 9 dicocokkan dengan keluaran nyata di probe. |
| Verifikasi Task 4: satu kegagalan alami isi 404 (`cari.spec.ts` "cari dari halaman 404"). Jejak Playwright: permintaan pertama dijawab 307 ke URL yang sama lalu 404 (cache HIT); dua stylesheet dan font Archivo dibatalkan (`ERR_ABORTED`) sekitar 33 ms setelah diminta; satu stylesheet diminta ulang (200), yang lain tidak pernah diminta lagi; konsol mencatat "preloaded but not used"; isi 404 tidak pernah dirender. | Putaran ulang lulus 142 tes. Aturan ulang sekali diperluas ke semua tes yang membuka path 404 (Global Constraints dan `CLAUDE.md`). Jejak disimpan untuk laporan isu (Cakupan yang ditunda). |
| Reproduksi isi 404 di build produksi probe (Chromium Playwright, konteks baru per kunjungan, 4 paralel). | Next 16.3.3: 0 gagal dari 200 (path unik), 0 dari 200 (path sama), 0 dari 200 (CPU 4x lebih lambat), 0 dari 200 (jaringan 150 ms, 200 kBps); beacon terkirim di semua kunjungan. Next 16.3.8: 0 dari 200. Runner E2E (`galat.spec.ts` dan View Transitions, `--repeat-each 40`, 4 worker): 200 tes lulus di 16.3.3 dan 200 di 16.3.8. E2E penuh di 16.3.8: 136 lulus. Riwayat log E2E penuh: 4 kegagalan dari 143 putaran (tiga "halaman 404 1440px", satu beacon habis waktu). |
| Rute profil penulis berhalaman adalah rute baru, tetapi belum ada di daftar anggaran JS (`motion.spec.ts`). | Sudah masuk Task 10: `/belajar/halaman/2` dan `/penulis/redaksi/halaman/2` di `HALAMAN_ANGGARAN`; probe 140,5 KiB, sama dengan `/uang-karier/pajak` dan `/penulis/redaksi`. |
| Uji visual dengan data E2E (build produksi, port 3200): rubrik pilar, subkategori, dan profil penulis halaman 1, 2, dan 3 di 375, 768, dan 1440 px, sebelum memilih persetujuan dan setelah Izinkan semua (skrip iklan tiruan); reduced motion; admin "Cek sekarang" dan "Pindai ulang sekarang" dalam keadaan siap, berjalan, selesai, dan dibatasi di 375 dan 1440 px, tema terang dan gelap; label baris slot. | Halaman publik: 54 keadaan, semua 200, axe halaman penuh dan axe navigasi bersih, CLS 0, tanpa geser horizontal, tanpa permintaan ke luar, semua tautan navigasi paling kecil 44 x 44 px, banner tampil sebelum memilih, slot rubrik terisi setelah Izinkan semua di halaman rubrik (profil penulis tidak punya slot). Reduced motion: transisi 0,00001 detik, cincin fokus solid. Admin: 32 keadaan, axe pada bagian buatan rencana ini bersih, tombol 44 px dengan `aria-disabled` saat berjalan dan dibatasi, tanpa teks Inggris, tanpa geser horizontal, tanpa permintaan ke luar. Label baris "artikel-akhir · Artikel, setelah isi"; axe bawaan Payload pada pegangan geser baris dicatat di Cakupan yang ditunda. |
| Uji operasi massal untuk tulisan baru ke tabel berkunci unik (rencana ini tanpa koleksi dan hook baru), di database dev probe lewat Local API. | Dua status indeks yang sudah diklaim "Cek sekarang" (`diminta_pada` terisi, baris `cek-status` antre) dihapus massal tanpa galat. Dua baris log 404 dari `catat404` diubah massal (`jumlah` 5), lalu kunjungan bersamaan menambah hitungan menjadi 6, keduanya dihapus massal tanpa galat, dan path yang sama dicatat ulang dari 1. |
| Verifikasi penuh per commit di salinan terpisah (database tes dibuat ulang per commit): type check, lint, unit, integrasi, dan E2E (build produksi). | Semua hijau di setiap commit: type check dan lint bersih (tanpa error dan warning), unit, integrasi, dan E2E sesuai tabel "Jumlah tes yang diharapkan". Satu-satunya kegagalan adalah E2E pertama Task 4 (isi 404, baris di atas); putaran ulang 142 tes lulus. |
| Putaran tambahan di commit terakhir: E2E kedua di database E2E yang sama tanpa dibuang, lalu integrasi dan unit di database tes yang sudah berisi data. | Semua hijau di commit Task 10: E2E kedua 150 tes tanpa membuang database E2E; integrasi kedua 158 tes (47 file) di database tes yang sudah berisi 95 artikel dari putaran pertama; unit kedua 523 tes (76 file). Build probe dengan database dev setelah `pnpm seed`: rute baru `● /penulis/[slug]/halaman/[nomor]`, sementara `○ /`, `● /[...jalur]`, dan `● /penulis/[slug]` tetap; `git status` bersih. |
| Blok kode rencana ini diterapkan ulang ke salinan bersih `master` (`becb67d`), task demi task. | 10 dari 10 task identik: pohon setiap commit hasil penerapan sama dengan pohon commit probe, termasuk `payload-types.ts` dan import map yang dibuat ulang lewat `pnpm generate:types` dan `pnpm generate:importmap`. |

## Sumber riset

Semua diakses 6 November 2026 lewat pembacaan web, registry npm, atau kode terpasang (bukan dari ingatan).

- Google Search Central, Pagination, incremental page loading, and their impact on Google Search (tautkan setiap halaman dengan `<a href>`, tautan balik ke halaman 1 boleh, "Don't use the first page of a paginated sequence as the canonical page", `rel=next/prev` tidak dipakai Google, judul dan deskripsi boleh sama, jangan memakai fragmen): https://developers.google.com/search/docs/specialty/ecommerce/pagination-and-incremental-page-loading
- Google Search Central, Build and submit a sitemap ("Include the URLs in your sitemap that you want to see in Google's search results", `lastmod` dipakai bila konsisten bisa diverifikasi; tidak membahas paginasi): https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Google Search Central, Consolidate duplicate URLs (URL di sitemap diusulkan sebagai canonical; jangan memberi canonical berbeda lewat cara berbeda): https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Search Console API, Usage limits (URL Inspection: 2.000 kueri per hari dan 600 per menit per situs; 10.000.000 per hari dan 15.000 per menit per proyek): https://developers.google.com/webmaster-tools/limits
- Vercel, WAF Rate Limiting (tersedia di semua paket, Fixed Window di semua paket dan Token Bucket di Enterprise, jendela bawaan 60 detik, aksi bawaan 429 atau Log, Deny, Challenge, Review Changes lalu Publish, hitungan per region; diperbarui 28 Agustus 2026): https://vercel.com/docs/security/vercel-waf/rate-limiting
- Vercel, Rate Limiting SDK (`@vercel/firewall`, `checkRateLimit` membutuhkan aturan dashboard berkondisi `@vercel/firewall`; diperbarui 23 Juli 2026): https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting-sdk
- Vercel KB, Add rate limiting with Vercel (aturan berkondisi path, berlaku tanpa deploy ulang): https://vercel.com/kb/guide/add-rate-limiting-vercel
- Vercel CLI, `vercel firewall` (aturan kustom disiapkan sebagai draf sampai `publish`; diperbarui 16 September 2026): https://vercel.com/docs/cli/firewall
- Vercel changelog 23 Mei 2025, Rate limiting now available on Hobby ("Hobby teams also get 1 free rate limit rule per project"; 1.000.000 permintaan rate limit yang diizinkan per bulan termasuk): https://vercel.com/changelog/rate-limiting-now-available-on-hobby-with-higher-included-usage-on-pro
- Registry npm: `npm view @vercel/firewall` (1.2.6, terbit 5 Oktober 2026, sekitar 22 KB terurai) dan `npm view next time dist-tags` (16.3.8 terbit 30 September 2026 sebagai patch terakhir 16.3; terbaru 16.4.5, 3 November 2026).
- Next.js 16.3 (rilis Agustus 2026): https://nextjs.org/blog/next-16-3
- Riwayat commit Next.js `v16.3.3..v16.3.8` (tag diambil dengan `git fetch` dari https://github.com/vercel/next.js): tanpa commit `notFound`, `__next_error__`, atau stylesheet; "Fix unset crossOrigin in Turbopack manifests" di 16.3.4; perbaikan keamanan (DNS rebinding server MCP, `use cache` di draft mode, kunci cache respons per rute, DNS pinning `next/image`, SVG `next/og`, path data peka huruf besar).
- Payload 3.92.1 (kode terpasang): `payload/dist/collections/config/defaults.js` (cookie auth `sameSite: 'Lax'`), `payload/dist/auth/extractJWT.js` (dengan `csrf` kosong, cookie diterima dari asal mana pun), urutan bawaan `-createdAt` (daftar admin), `@payloadcms/ui` `useRowLabel` (`forms/RowLabel/Context`) dan `admin.components.RowLabel` field array.
- WCAG 2.2: 1.3.2 urutan bermakna, 2.4.4 tujuan tautan, 2.5.8 ukuran target, 4.1.3 pesan status (dipakai lewat skill accessibility-review).
- Skill: writing-plans, codebase-design (antarmuka paginasi dan aksi admin), web-search, ux-copy (navigasi halaman, label tombol, pesan batas), accessibility-review dan design-audit (navigasi halaman dan tombol admin).
- Probe workspace: branch `probe/rencana-8b` (satu commit per task; pohon setiap task identik dengan blok kode rencana ini).

Rencana berikutnya: **Rencana 8C (rilis: migrasi Payload produksi, Vercel dan Supabase, Lighthouse CI, backup mingguan, database pratinjau, password admin produksi, runbook uji langsung)**.
