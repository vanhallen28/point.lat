# Rencana 8A: Iklan, persetujuan cookie, dan admin berbahasa Indonesia point.lat

> **Catatan revisi 9 November 2026 (v1.1.0, keputusan pemilik).** Rencana ini sudah selesai dieksekusi; teksnya disesuaikan supaya tidak bertentangan dengan keputusan terbaru:
> 1. Hosting **Vercel paket gratis (Hobby)**: cron Vercel sekali sehari, jadwal 10 menit opsional lewat Supabase Cron (runbook rilis H5), Pro hanya saat iklan dinyalakan.
> 2. **Full Next.js dengan perintah npm**: semua perintah `pnpm` diganti padanan npm (`npm run <skrip>`, `npm run <skrip> -- <argumen>`, `npx`, `npm install`, `npm ci`), `pnpm-lock.yaml` menjadi `package-lock.json`. Potongan `package.json` lama yang masih memuat pengaturan khusus pnpm (`onlyBuiltDependencies`) adalah catatan sejarah; versi sekarang memakai `allowScripts`.
> 3. **Setiap pembaruan dikirim sebagai zip + perintah terminal** (spesifikasi §21).
> 4. **Tanpa Docker, hanya Next.js, Vercel, dan Supabase**: `docker-compose.yml`, `Dockerfile`, dan `docker/` dihapus di v1.1.0. Langkah yang dulu membuat file itu dibiarkan sebagai sejarah. Tes memakai Postgres di mesin itu sendiri (Postgres bawaan runner GitHub di CI, Postgres sistem di sesi Claude); komputer pemilik memakai proyek Supabase pratinjau.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Melengkapi spesifikasi §11 (iklan dan privasi) dan keputusan pemilik soal bahasa admin: slot iklan AdSense yang diatur editor dari global `iklan` tanpa kode, ruang iklan yang dipesan sehingga tidak ada pergeseran tata letak, banner persetujuan cookie (UU PDP No. 27/2022) dengan "Hanya yang perlu" dan "Izinkan semua" yang setara, Google Consent Mode v2 yang menolak semua sinyal sebelum skrip iklan apa pun, `/ads.txt` dari CMS, dan admin Payload berbahasa Indonesia; tanpa dependensi baru, tanpa jaringan di tes, dan halaman publik tetap ISR.

**Architecture:** Modul baru `src/modules/iklan` dengan antarmuka kecil. Server: `muatIklan()` (global `iklan`, cache bertag `iklan`) dan `pilihSlot(pengaturan, posisi, id?)`, satu-satunya aturan apakah slot tampil; halaman meneruskan pengaturan ke komponennya dan `SlotIklan` (server component) memesan kotak berukuran tetap. Browser: skrip awal sebaris di `<head>` (`skripAwal()`) menjalankan `gtag('consent', 'default', ...)` dengan semua sinyal ditolak lalu menandai `<html data-persetujuan="belum|perlu|semua">` dari cookie pilihan, sebelum paint pertama; CSS memakai atribut itu untuk menampilkan banner (`PanelPersetujuan`) atau slot, jadi markup sama untuk semua pengunjung dan halaman tetap statis. `PemuatIklan` (sekali di layout) memuat `adsbygoogle.js` hanya setelah "Izinkan semua" dan saat slot hampir terlihat. Kode penyedia hanya di `adsense.ts`; tes memotong domain Google di browser. `/ads.txt` dirangkai dari global. Admin: `i18n` dengan bahasa Indonesia saja (`payload/i18n/id`) ditambah terjemahan editor Lexical yang belum ada.

**Tech Stack:** Next.js 16.3.3 (App Router, ISR, route handler `force-dynamic` dengan `unstable_cache` bertag), Payload 3.92.1 (global dengan array dan `admin.condition`, field `ui`, `useFormFields`, `i18n.supportedLanguages`/`fallbackLanguage`/`translations`, `admin.avatar`, `admin.dateFormat`, `custom.scss`), Google AdSense (kode unit display berukuran tetap, `adsbygoogle.push`, `data-adtest`), Google Consent Mode v2 (`dataLayer`, `gtag('consent', ...)`), IAB ads.txt 1.1, `IntersectionObserver`, `PerformanceObserver` (`layout-shift`), `document.cookie`, `node:vm` (tes skrip awal), Vitest 4, Playwright 1.63 + `@axe-core/playwright` 4.14, npm 11, Node 22.23.4+.

**Spesifikasi:** `docs/superpowers/specs/2026-11-03-point-lat-design.md` (§3 aturan copy; §5 modul `iklan`; §6 global `iklan` dan `beranda` (blok slot iklan); §7 `/ads.txt`; §11 iklan dan privasi; §12 performa (CLS di bawah 0,1, JS milik point. di luar kerangka di bawah 25 KB tanpa skrip iklan); §14 aksesibilitas; §16 testing ("banner persetujuan menahan iklan"); §18 butir 8 akun AdSense).

**Rencana sebelumnya:** `docs/superpowers/plans/2026-11-04-rencana-1-fondasi.md` sampai `docs/superpowers/plans/2026-11-05-rencana-7-asisten-ai.md`, ditambah commit lanjutan Rencana 7 sampai `45c07f7`. Rencana ini memakai `revalidasiGlobal` dan pola cache bertag (Rencana 3 dan 4), `respons` rute teknis (`seo/rute.ts`), blok `slotIklan` di global `beranda` dan `susunBeranda` (Rencana 4B), `IsiArtikel` (konverter Lexical), `pathFor`, `Tautan`, token desain `src/styles/tokens.css`, halaman draf "Kebijakan Privasi" dari seed, `TombolTerbit` (Rencana 7, labelnya dari terjemahan Payload), dan anggaran JS `motion.spec.ts`. Baseline: 476 tes unit di 69 file, 138 tes integrasi di 41 file, 112 tes E2E.

**Pembagian Rencana 8 (keputusan pengawas):** 8A (rencana ini): iklan, persetujuan cookie, dan admin berbahasa Indonesia, ditambah satu task terakhir yang bisa dilepas (kontras deskripsi field bawaan Payload). 8B: paginasi berbasis path, tombol "Cek sekarang" status indeks dan "Pindai ulang sekarang", rate limit beacon 404, pemeriksaan ulang render 404 di patch Next terbaru. 8C: rilis (migrasi Payload produksi, Vercel dan Supabase, Lighthouse CI, backup mingguan, database pratinjau, password admin produksi, runbook uji langsung).

## Dependensi baru (butuh persetujuan pemilik)

**Rencana ini tidak menambah dependensi.**

| Paket | Keputusan rencana ini |
|---|---|
| `@payloadcms/translations` | **Tidak dijadikan dependensi langsung.** Paket ini terpasang sebagai dependensi `payload` (3.92.1, versi sama), dan `payload` sendiri mengekspor setiap bahasa lewat `payload/i18n/*` (`export { id } from '@payloadcms/translations/languages/id'`). Jadi `import { id } from 'payload/i18n/id'` bekerja dengan npm ketat tanpa menambah paket. Bila kelak dibutuhkan langsung (misalnya utilitas terjemahan), versinya harus persis sama dengan Payload (3.92.1); berkas bahasa Indonesianya sekitar 33 KB. |
| CMP pihak ketiga (CookieYes, Cookiebot, dan sejenisnya) | **Tidak dipasang.** Banner sendiri dan pemuat iklan hanya menambah sekitar 1,9 KiB gzip ke chunk JS tata letak (probe: 4,3 KiB di `45c07f7` menjadi 6,2 KiB), cukup untuk pengunjung Indonesia, dan tidak memuat skrip pihak ketiga sebelum pengunjung memilih. Untuk pengunjung EEA, Inggris, dan Swiss, iklan personalisasi mensyaratkan CMP bersertifikat Google yang terintegrasi IAB TCF; CMP Google sendiri (pesan European regulations di AdSense, Privacy & messaging) termasuk yang bersertifikat dan tidak butuh paket (lihat Setup dari pemilik). |
| Pustaka cookie (`js-cookie`) dan komponen AdSense untuk Next (`next-google-adsense` dan sejenisnya) | **Tidak dipasang.** Satu cookie dengan format tetap cukup dibaca regex (`bacaPersetujuan`), dan kode unit AdSense hanya tiga atribut dan satu `push` (`adsense.ts`, `PemuatIklan`). |

## Global Constraints

- Node `^22.23.4 || >=24.22.1`, npm 11. Versi dikunci: Next `16.3.3`, Payload `3.92.1`, `@playwright/test` `1.63.0`. **Tanpa dependensi baru.**
- Nama domain berbahasa Indonesia (`iklan`, `pilihSlot`, `SlotIklan`, `PemuatIklan`, `PanelPersetujuan`, `persetujuan`, `idPenerbit`, `idSlot`). Nama dari pihak luar tetap seperti aslinya (`adsbygoogle`, `data-ad-client`, `data-ad-slot`, `data-adtest`, `ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`, `ads.txt`, `DIRECT`, `RESELLER`).
- Copy situs dan admin buatan rencana ini: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash (juga di komentar), tanpa tanda seru. Teks bawaan Payload berbahasa Indonesia tidak ditimpa kecuali yang memakai em dash (Task 1).
- **Tes tidak pernah memanggil jaringan.** Skrip AdSense dimuat hanya setelah "Izinkan semua"; tes E2E yang sampai ke sana memakai `cegatIklan(page)` (Task 7), yang menjawab `adsbygoogle.js` dengan skrip tiruan dan menolak domain iklan Google lain. Gambar Cloudinary tetap lewat `cegatCloudinary`. Admin memakai avatar bawaan tanpa Gravatar (Task 1).
- **ID penerbit di tes, contoh, dan rencana ini hanya `ca-pub-0000000000000000`** (jelas palsu); unit `1111111111` sampai `5555555555` dan domain `contoh-iklan.test` juga tiruan. ID penerbit asli diisi pemilik di global Iklan, tidak pernah di kode, tes, atau env.
- **Halaman publik tetap ISR.** Server tidak membaca cookie persetujuan; pilihan dibaca skrip awal di browser dan ditulis ke atribut `<html>`. Jangan memindahkan pembacaan cookie ke server component atau `generateMetadata` (halaman menjadi dinamis).
- Path publik lewat `pathFor` (`/kebijakan-privasi` untuk tautan banner). Warna dari token semantik `src/styles/tokens.css`; animasi hanya `transform` dan mati di reduced motion.
- **Perubahan skema harus aditif.** Rencana ini menambah global `iklan` (tabel `iklan` dan `iklan_slot`) dan mengubah deskripsi blok Slot iklan (tanpa kolom baru). Setelah mengubah field: `npm run generate:types`, lalu `npm run seed` sebelum `npm run build` (build membaca database dev). Bila Payload macet di "Pulling schema from database..." (pertanyaan DATA LOSS), jangan menjawab; reset database yang bersangkutan seperti Rencana 2 (`DROP DATABASE ... WITH (FORCE)` lalu `CREATE DATABASE`). Probe: menjalankan E2E di commit yang lebih lama dari skema database E2E membuat server E2E menunggu pertanyaan itu sampai `webServer` habis waktu (600 detik); buang database `_e2e` dulu.
- **Operasi massal.** Global tidak punya hapus atau update massal, dan rencana ini tidak menambah koleksi atau hook yang menulis tabel berkunci unik, jadi tidak ada uji operasi massal baru; uji operasi massal lama tetap lulus.
- `npm run build` membaca database dev (`pointlat` dari `.env`). Postgres harus jalan (`pg_ctlcluster 16 main start` bila mati).
- Tes unit dan integrasi memakai `.env.test` (database `pointlat_test`). E2E memakai `pointlat_test_e2e` (dibuat dan diisi ulang `tests/e2e/siapkan.ts`), build produksi di port 3100. Mulai Task 6 global Iklan menyala di database E2E, jadi semua spec berjalan dengan banner persetujuan; `siapkan.ts` menyetel ulang global itu setiap run, karena blok `finally` tidak berjalan bila tes habis waktu. E2E menjalankan `next build` sendiri sehingga isi `.next/` diganti; setelah E2E, jalankan `npm run build` lagi sebelum `npm run start` biasa.
- Server manual memakai port 3200 dan dihentikan dengan `fuser -k 3200/tcp`, jangan `pkill -f` dengan pola luas. Menunggu server: `timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'`. Jangan meninggalkan proses latar belakang setelah task selesai.
- `next dev` dan `next build` di Next 16.3 bisa menambahkan blok "nextjs-agent-rules" ke `CLAUDE.md`. Periksa `git status` sebelum commit; buang blok itu dengan `git checkout CLAUDE.md` (Task 9 dan Task 10 sengaja mengubah `CLAUDE.md`; di task itu buang blok itu saja). Build yang tertinggal dari commit lain bisa meninggalkan `.next/types` yang menunjuk rute yang tidak ada (`TS2307 ... ads.txt/route.js`); hapus `.next` lalu ulangi `npm run typecheck`.
- Jalankan `npm run typecheck` dan `npm run lint` di setiap task; keduanya harus bersih (tanpa error dan tanpa warning). Setiap task diakhiri unit, integrasi, dan E2E yang hijau. Keluaran tes integrasi ditulis ke file log dan dibaca utuh (jangan disaring `tail`), supaya pertanyaan DATA LOSS tidak tersembunyi.
- **Tulis `req.context` setelah `await`** (Rencana 6A); rencana ini tidak menulis `req.context`.
- Tes integrasi berbagi database dan berjalan berurutan dengan urutan file yang tidak pasti. Pengguna pertama di database selalu admin (`tetapkanPeranAwal`), jadi tes yang butuh editor membuat admin dulu. Tes yang mengubah global `iklan` mengembalikannya di `afterAll`. Tes mencari dokumennya sendiri lewat ID atau `unik()`.
- E2E berjalan berurutan di satu database dan spec lain membaca daftar artikel admin halaman pertama (10 baris). Rencana ini tidak membuat artikel di E2E. Tes yang menyimpan global Iklan lewat REST mengembalikannya di `finally`.
- **Kegagalan E2E halaman 404 yang jarang (warisan Rencana 4A).** Tes yang membuka `/halaman-yang-tidak-ada` (`galat.spec.ts` "halaman 404 ... lolos axe" dan `motion.spec.ts` "kartu ke artikel memakai View Transitions") sesekali gagal dengan `locator resolved to <html id="__next_error__">` atau atribut `lang` kosong karena isi 404 tidak dirender di browser. Bila salah satu tes itu gagal dengan pesan tersebut, jalankan `npm run test:e2e` sekali lagi; bila gagal lagi, atau tes lain yang gagal, berhenti dan laporkan. Jangan menaikkan timeout atau melemahkan tesnya.
- Next 16.3.3 kadang mengirim header `Location` dua kali pada redirect pertama sebuah path ISR (`/a, /a`); tes redirect memakai `toContain`, bukan `toBe`.
- **Admin Payload 3.92.** CSS admin menghapus outline (cincin fokus ditulis sendiri di komponen admin buatan rencana); view kustom tidak memeriksa akses; menu admin dirender terbuka lalu ditutup saat hidrasi (tunggu `nav--nav-hydrated`); ukuran huruf dasar admin lebih kecil dari 16 px; deskripsi field bawaan gagal kontras (penjelasan global Iklan ditulis di komponen sendiri; Task 10 memperbaiki semuanya bila disetujui); isi grup di sidebar baru dirender saat terlihat (`RenderIfInViewport`); tooltip `Button` Payload yang tersembunyi tetap memakan tempat; id `field-{nama}` pada checkbox ada di input, bukan di pembungkus. Nama field `id` di dalam array dipakai Payload sebagai kunci baris, jadi baris slot memakai `idSlot`. Tema admin dipilih cookie `payload-theme` (`light` atau `dark`).
- Karakter yang dibutuhkan kode (spasi tak putus, em dash, en dash) ditulis sebagai escape `\u00a0`, `\u2014`, `\u2013`; rencana ini tanpa karakter aslinya. Salin blok kode rencana ini apa adanya.

## Keputusan teknis (hasil riset dan probe, dipakai di semua task)

| Topik | Keputusan | Dasar |
|---|---|---|
| Batas rencana | 10 task. Task 1 sampai 9 berdiri sendiri; Task 10 (kontras deskripsi field bawaan Payload di seluruh admin) butuh persetujuan pemilik dan bisa dilepas tanpa mengubah task lain. Admin berbahasa Indonesia didahulukan (Task 1) supaya semua tes admin sesudahnya memakai label Indonesia. | Patokan 10 sampai 12 task dari pengawas. Probe menulis semua task dan memverifikasinya per commit. |
| Antarmuka modul `iklan` | Server: `muatIklan()` (pengaturan dari global, cache bertag `iklan`), `pilihSlot(pengaturan, posisi, id?)` (satu-satunya aturan apakah slot tampil, menghasilkan `SlotSiap` berisi ukuran piksel, ID penerbit, unit, mode uji, nomor paragraf), `sisipkanIklanTengah(isi, slot)`, `isiAdsTxt(pengaturan)`. Komponen: `SlotIklan({ slot })` (server), `PanelPersetujuan`, `SkripPersetujuan`, `PemuatIklan` (layout). Browser: `persetujuan.ts` (cookie, sinyal, skrip awal; murni) dan `peramban.ts` (`simpanPilihan`). Kode penyedia hanya di `adsense.ts`. Halaman meneruskan `iklan={await muatIklan()}` ke komponennya; beranda lewat `susunBeranda` (`sumber.iklan`). | Skill codebase-design: satu aturan di balik antarmuka kecil (`pilihSlot`) dipakai lima tempat; komponen tetap sinkron sehingga tes `renderToStaticMarkup` lama jalan, dan prop `iklan` opsional. Hanya satu penyedia, jadi tidak ada antarmuka adapter (satu adapter berarti seam yang belum nyata); seam tes adalah domain Google yang dicegat di browser. Spesifikasi §5 menulis `<SlotIklan id="..."/>`; slot dipilih dari pengaturan yang dimuat halaman supaya komponen tetap server component sinkron. |
| Posisi dan ukuran | Posisi menyatukan "halaman" dan "posisi" spesifikasi §6: `artikel-tengah` (setelah paragraf berteks ke-N di tingkat atas isi, N 2 sampai 10, bawaan 3, bila masih ada dua paragraf sesudahnya), `artikel-akhir` (setelah isi, sebelum catatan, sumber, dan FAQ), `rubrik` (setelah daftar tulisan), `tools` (setelah penjelasan, di luar kalkulator), `beranda` (blok Slot iklan yang diatur editor). Satu slot aktif per posisi kecuali beranda. Ukuran tetap: 300 x 250, 336 x 280, 320 x 100. | Spesifikasi §11 melarang iklan di kotak Intinya, di atas H1, dan di dalam kalkulator; tidak ada posisi untuk itu. Kebijakan penempatan AdSense: hati-hati di dekat tautan dan tombol navigasi, jadi slot rubrik setelah daftar (bukan dekat pil subkategori) dan slot tools setelah penjelasan (bukan tepat di bawah tombol hitung). Ukuran tetap supaya ruangnya bisa dipesan persis; lebar paling besar 336 px muat di layar 375 px (kontainer 343 px). |
| Ruang dipesan dan unit kosong | `SlotIklan` merender kotak dengan `width` dan `height` ukuran slot di HTML, dengan label "Iklan" di atasnya. Unit yang tidak diisi AdSense tetap berukuran sama (latar `--permukaan`), tidak diciutkan. Slot yang lebih lebar dari layar disembunyikan dengan media query. | Google Publisher Tag "Minimize layout shift": satu-satunya cara pasti adalah memesan ruang dengan CSS, bukan JavaScript, dan menciutkan slot kosong menambah pergeseran. Bantuan AdSense (`data-ad-status`): unit hanya diciutkan bila tidak menyebabkan reflow, dan unit tersembunyi tidak diminta. Label: kebijakan penempatan AdSense hanya mengizinkan label "Advertisements" atau "Sponsored Links"; "Iklan" padanan Indonesianya. |
| Pemuat iklan | `PemuatIklan` berjalan setelah hidrasi, hanya bila `<html data-persetujuan="semua">`, mengamati kotak dengan `IntersectionObserver` (jarak 200 px), lalu menambah `adsbygoogle.js?client=` sekali ke `<head>`, membuat `<ins class="adsbygoogle">` berukuran tetap (`style` di elemen itu sendiri, `data-ad-client`, `data-ad-slot`, `data-adtest="on"` di mode uji) di kotak yang hampir terlihat, dan memanggil `adsbygoogle.push({})`. Diulang setiap pindah halaman dan setelah peristiwa `persetujuan`. | Spesifikasi §11 ("memuat skrip penyedia setelah halaman interaktif dan slot terlihat"); audit Publisher Ads "Lazily load ads below the fold". Bantuan AdSense: ukuran pasti lewat CSS boleh, tetapi lewat stylesheet luar tidak didukung resmi, jadi ukuran di atribut `style`. `<ins>` dibuat saat dibutuhkan karena `push({})` mengisi unit kosong pertama di dokumen. `data-adtest` dibaca implementasi AdSense AMP sebagai `adtest=on`; Bantuan AdSense tidak mendokumentasikannya untuk tag biasa, jadi mode uji hanya untuk pratinjau. |
| Banner persetujuan | `PanelPersetujuan` di atas header (setelah skip link, di dalam alur halaman), `section` bernama "Cookie dan iklan", penjelasan tujuan, masa simpan, cara mengubah, tautan "Baca Kebijakan Privasi" (`/kebijakan-privasi`), dua tombol setara ("Hanya yang perlu", "Izinkan semua"; sama warna, tinggi, dan lebar, sejajar di semua lebar). Tombol "Pengaturan cookie" di footer membukanya lagi dengan fokus ke banner, menyebut pilihan sekarang, Escape menutup, fokus kembali ke tombol. Tampil hanya bila iklan dinyalakan dan tanpa JavaScript tidak tampil. | Brief pengawas: bisa dibaca pembaca layar, dipakai dengan keyboard, tidak menutupi isi di 375 px, dua pilihan setara. Di dalam alur halaman tidak pernah menutupi isi (banner melayang di bawah menutup bagian bawah layar HP), dan pengguna keyboard mencapainya tepat setelah skip link. UU PDP Pasal 20 ayat (2) huruf a (persetujuan eksplisit untuk tujuan yang disampaikan) dan Pasal 21 (informasi tujuan, jenis data, retensi, hak): ringkas di banner, lengkap di Kebijakan Privasi. Pasal 22 ayat (4) dan (5): persetujuan dibedakan jelas, mudah dipahami, bahasa sederhana. |
| Penyimpanan pilihan | Cookie pihak pertama `persetujuan=1.semua.2026-11-06` (versi, pilihan, tanggal UTC), `Path=/`, `Max-Age` 365 hari, `SameSite=Lax`, `Secure` di HTTPS. Versi lain, lebih dari 365 hari, atau rusak dianggap belum memilih. | Pasal 22 ayat (1): persetujuan tertulis atau terekam; versi dan tanggal adalah rekamannya, dan menaikkan versi meminta persetujuan ulang saat tujuan berubah. UU PDP tidak menyebut masa berlaku; 12 bulan dipilih supaya pengunjung ditanya ulang secara berkala. Cookie ini termasuk "yang perlu". |
| Hanya yang perlu | Tidak ada skrip iklan sama sekali, slot tidak tampil, tidak ada permintaan ke Google. | Bantuan AdSense (setelan personalisasi di tag iklan): iklan non-personalisasi tetap memakai cookie untuk pembatasan frekuensi dan laporan gabungan, jadi tidak termasuk "yang perlu". Limited ads (tanpa cookie) hanya untuk permintaan EEA, Inggris, dan Swiss dengan sinyal TCF. Konsekuensi: pengunjung yang memilih ini tidak menghasilkan pendapatan iklan. **Keputusan pemilik (6 November 2026): setuju, tanpa iklan.** |
| Consent Mode v2 | Skrip awal sebaris di `<head>` menjalankan `gtag('consent', 'default', {ad_storage, ad_user_data, ad_personalization, analytics_storage: 'denied'})` sebelum skrip lain, lalu `update` iklan `granted` bila pilihan tersimpan "Izinkan semua"; klik "Izinkan semua" mengirim `update` yang sama sebelum skrip iklan dimuat; "Hanya yang perlu" mengirim `update` semua `denied`. `analytics_storage` tetap `denied` karena point. tidak memasang alat analitik. | Dokumentasi Consent Mode: `default` dipanggil di setiap halaman sebelum perintah lain ("If your consent code is called out of order, consent defaults won't work"). Halaman ringkasan Consent Mode membedakan mode dasar (tag Google tidak dimuat sampai pengunjung berinteraksi dengan banner) dan mode lanjutan; rencana ini memakai mode dasar. Dokumentasi Consent Mode tidak menyebut AdSense di produk yang membaca sinyal, jadi penahan utama tetap tidak memuat skrip iklan sebelum persetujuan; sinyal dipasang supaya tag Google apa pun yang ditambah kelak sudah benar. |
| Pengunjung EEA, Inggris, Swiss | Banner sendiri dipakai untuk semua pengunjung. Untuk iklan personalisasi di wilayah itu, pemilik menyalakan pesan European regulations (CMP Google) di AdSense; pesan itu tampil setelah skrip AdSense dimuat (setelah Izinkan semua). | Persyaratan CMP Google (Ad Manager Help 13554116): CMP bersertifikat yang terintegrasi TCF wajib untuk iklan personalisasi di EEA dan Inggris (16 Januari 2024) dan Swiss (31 Juli 2024); "Google LLC CMP" (ID 300) dan pesan European regulations di Privacy & messaging bersertifikat; tanpa itu hanya iklan non-personalisasi atau limited ads. point. menargetkan pembaca Indonesia, jadi pemasangan TCF sendiri tidak sebanding. |
| Menarik persetujuan | Dari "Izinkan semua" ke "Hanya yang perlu": cookie pilihan ditulis ulang, `update` semua `denied`, cookie yang ditulis AdSense di domain situs (`__gads`, `__gpi`, `__gpi_optout`, `__eoi`) dihapus (dengan dan tanpa `Domain`), lalu halaman dimuat ulang. | UU PDP Pasal 9 (hak menarik persetujuan) dan Pasal 40 ayat (1) (pemrosesan wajib berhenti). Skrip iklan yang sudah berjalan tidak bisa dihentikan dari luar; memuat ulang halaman memastikannya. Daftar Google "Our advertising and measurement cookies": cookie AdSense yang ditulis di domain situs ("Set from partner domain") adalah `__gads` dan `__gpi` (iklan dan keamanan, 13 bulan), `__gpi_optout` (iklan), dan `__eoi` (keamanan, 6 bulan). Tanpa persetujuan skrip AdSense tidak dimuat, jadi tidak ada yang membutuhkannya. |
| Halaman tetap ISR | Markup banner dan slot sama untuk semua pengunjung; keputusan tampil ada di CSS dari atribut `<html data-persetujuan>` yang ditulis skrip awal sebelum paint pertama. `<html suppressHydrationWarning>` karena atribut itu ditulis sebelum React hidrasi. | Brief pengawas dan pelajaran Rencana 4: membaca cookie di server membuat halaman dinamis. Build probe: `○ /`, `● /[...jalur]`, `● /tools/[slug]` tetap seperti sebelumnya, ditambah `ƒ /ads.txt`. |
| `ads.txt` | Rute `/ads.txt` (`force-dynamic`, data `muatAdsTxt` bertag `iklan`, sama dengan `robots.txt`), `text/plain; charset=utf-8`. Isi: baris AdSense otomatis dari ID penerbit (`google.com, pub-..., DIRECT, f08c47fec0942fa0`), juga sebelum iklan dinyalakan, lalu baris tambahan editor yang divalidasi per baris (3 atau 4 isian, `DIRECT`/`RESELLER`, komentar `#`, variabel IAB). Tanpa baris: 404. | Bantuan AdSense "Panduan ads.txt" (format baris, file di akar domain, status "Not found" dan "Unauthorized"). Spesifikasi IAB ads.txt 1.1: 404 berarti tidak ada deklarasi (§3.1), file tanpa baris data tidak sah (§3.2.1), jenis konten wajib `text/plain`. Baris otomatis menghindari salah ketik ID dan membuat AdSense bisa memeriksa situs lewat `ads.txt` sebelum iklan tayang. |
| Anggaran JS dan CLS | `byteJs` hanya menghitung skrip dari situs sendiri. Probe: Turbopack menggabungkan banner, pemuat iklan, animasi masuk kartu, dan penanda menu aktif dalam satu chunk tata letak di setiap halaman (6,1 KiB terkirim; 4,3 KiB gzip sebelum rencana ini, 6,2 KiB sesudahnya). Tes: chunk itu di bawah 8 KiB, dan bersama JS kalkulator (13,2 KiB) di bawah 25 KB. CLS diukur `PerformanceObserver` di halaman artikel sebelum memilih, setelah Izinkan semua dengan unit terisi, dan setelah muat ulang: 0. | Spesifikasi §12 (CLS di bawah 0,1; JS milik point. di luar kerangka di bawah 25 KB tanpa skrip iklan). Mematikan iklan tidak mengubah JS halaman karena chunk tata letak tetap dimuat, jadi yang diukur chunk itu sendiri (dicari dari isinya, karena namanya berubah setiap build). |
| Admin bahasa Indonesia | `i18n.supportedLanguages: { id }`, `fallbackLanguage: 'id'`, `translations.id` (seluruh teks editor Lexical dan `general:sorryNotFound` tanpa em dash). `admin.dateFormat: 'd MMMM yyyy, HH.mm'` dan `admin.avatar: 'default'`. | Keputusan pemilik (6 November 2026). `getRequestLanguage` Payload memilih di antara bahasa yang didukung saja, jadi satu bahasa berarti selalu Indonesia. Lexical 3.92.1 tidak punya terjemahan Indonesia (probe: toolbar menampilkan kunci mentah). Format tanggal bawaan menghasilkan "November ke-6 2026, 8:21 AM". Avatar bawaan memanggil Gravatar dengan hash email admin (tes E2E admin memanggil jaringan). |
| Copy bawaan Payload | Ditimpa hanya `general:sorryNotFound` (em dash). 60 teks bawaan yang menyapa "Anda" dan label berhuruf kapital tiap kata tidak ditimpa. | Menimpa puluhan kunci berarti merawat salinan terjemahan sendiri setiap kali Payload naik versi; teks admin hanya dibaca redaksi, bukan pembaca. Tidak ada tanda seru di terjemahan bawaan (dijaga tes integrasi). |
| Kontras deskripsi field (Task 10) | Satu aturan `.field-description { color: var(--theme-elevation-650) }` di `src/app/(payload)/custom.scss`, dijaga axe di form artikel, global Asisten AI, dan Pengaturan SEO, tema terang dan gelap. | Dokumentasi Payload "Customizing CSS": CSS global admin di `custom.scss`, gaya bawaan di `@layer payload-default` sehingga aturan tanpa layer menang. Rencana 7 menunda perbaikan ini ke Rencana 8 bila pemilik setuju. |

## Struktur file setelah rencana ini

```
src/lib/bahasa-admin.ts               TERJEMAHAN_ADMIN (Lexical dan general:sorryNotFound), BAHASA_ADMIN (i18n admin)
src/modules/iklan/
  index.ts         ekspor server: muatIklan, muatAdsTxt, ambilIklan, susunPengaturan, pilihSlot, iklanSiap,
                   sisipkanIklanTengah, isiAdsTxt, tipe PengaturanIklan, PosisiIklan, SlotSiap
  tipe.ts          POSISI_IKLAN, UKURAN_IKLAN, DIMENSI_IKLAN, label posisi dan ukuran, PengaturanSlot, PengaturanIklan, SlotSiap
  aturan.ts        pola ID (penerbit, slot, unit), PARAGRAF_IKLAN, NODE_IKLAN, iklanSiap, pilihSlot, letakIklanTengah,
                   sisipkanIklanTengah, validasi (ID penerbit, ID slot, unit, daftar slot, baris ads.txt), barisAdsense,
                   isiAdsTxt (fungsi murni)
  persetujuan.ts   cookie pilihan (nilaiKuki, bacaPersetujuan, tulisKuki, hapusKuki), atribut <html>, sinyal Consent Mode,
                   skripAwal (skrip sebaris di <head>; murni)
  adsense.ts       ASAL_ADSENSE, urlSkrip, atributUnit (satu-satunya kode penyedia)
  peramban.ts      simpanPilihan (cookie, gtag consent update, atribut <html>, menarik persetujuan), PERISTIWA_PERSETUJUAN
  data.ts          susunPengaturan, ambilIklan (global iklan tanpa cache)
  cache.ts         muatIklan, muatAdsTxt (unstable_cache bertag iklan)
  rute.ts          responsAdsTxt (text/plain atau 404)
  admin/           PetunjukIklan.tsx, PratinjauAdsTxt.tsx, iklan.scss
src/globals/Iklan.ts                  global iklan (grup Tampilan): saklar, ID penerbit, mode uji, slot, baris ads.txt tambahan
src/components/iklan/
  SlotIklan.tsx, SlotIklan.module.css   wadah berlabel "Iklan" dengan kotak berukuran tetap (server component)
  PemuatIklan.tsx                       pemuat skrip dan unit AdSense setelah Izinkan semua (klien, sekali di layout)
  PanelPersetujuan.tsx, Persetujuan.module.css, SkripPersetujuan.tsx   banner persetujuan dan skrip awal
src/app/(frontend)/ads.txt/route.ts   /ads.txt dari global
src/app/(payload)/custom.scss         kontras deskripsi field bawaan Payload (Task 10, bila disetujui)
tests/unit/iklan-*.test.ts, tests/int/iklan.int.spec.ts, tests/int/admin-bahasa.int.spec.ts,
tests/e2e/iklan.spec.ts, tests/e2e/admin.spec.ts, cegatIklan di tests/e2e/bantu.ts
```

Diubah: `payload.config.ts` (i18n, avatar, format tanggal, global Iklan), layout publik (skrip awal, banner, pemuat), `Footer` (tombol Pengaturan cookie), `HalamanArtikel`, `IsiArtikel`, `HalamanRubrik`, `HalamanTool`, `Beranda` dan `susunBeranda` (slot iklan), `TAG.iklan`, `revalidasiIklan`, `motion.spec.ts` (anggaran JS tata letak), `siapkan.ts` (global Iklan di database E2E), tiga tes lama yang membaca label admin berbahasa Inggris, `CLAUDE.md`, dan spesifikasi.

## Jumlah tes yang diharapkan

| Setelah task | Unit | Integrasi | E2E |
|---|---|---|---|
| Baseline (`45c07f7`) | 476 tes (69 file) | 138 tes (41 file) | 112 tes |
| 1 Admin berbahasa Indonesia | 476 tes (69 file) | 142 tes (42 file) | 113 tes |
| 2 Aturan iklan dan ads.txt | 486 tes (70 file) | 142 tes (42 file) | 113 tes |
| 3 Persetujuan dan kode AdSense | 492 tes (71 file) | 142 tes (42 file) | 113 tes |
| 4 Global Iklan dan data | 492 tes (71 file) | 145 tes (43 file) | 114 tes |
| 5 Rute `/ads.txt` | 493 tes (72 file) | 145 tes (43 file) | 115 tes |
| 6 Banner persetujuan | 496 tes (73 file) | 145 tes (43 file) | 121 tes |
| 7 SlotIklan, pemuat, artikel | 498 tes (73 file) | 145 tes (43 file) | 127 tes |
| 8 Rubrik, tools, beranda | 499 tes (73 file) | 145 tes (43 file) | 133 tes |
| 9 CLAUDE.md, spesifikasi, pemeriksaan akhir | 499 tes (73 file) | 145 tes (43 file) | 133 tes |
| 10 Kontras deskripsi field (bisa dilepas) | 499 tes (73 file) | 145 tes (43 file) | 135 tes |
| Commit lanjutan pengawas (label "Advertisements" dan penjaga Kebijakan Privasi, keputusan pemilik) | 500 tes (73 file) | 146 tes (43 file) | 136 tes |

---

### Task 1: Admin Payload berbahasa Indonesia

**Files:**
- Create: `src/lib/bahasa-admin.ts`, `tests/int/admin-bahasa.int.spec.ts`, `tests/e2e/admin.spec.ts`
- Modify: `src/payload.config.ts`, `tests/int/indexer-antrean.int.spec.ts`, `tests/e2e/asisten.spec.ts`, `tests/e2e/pantau.spec.ts`
- Test: `tests/int/admin-bahasa.int.spec.ts`, `tests/e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `id` dari `payload/i18n/id` (ekspor paket `payload` yang meneruskan `@payloadcms/translations/languages/id` versi 3.92.1, jadi tanpa dependensi langsung baru), `Config['i18n']`, `createLocalReq` (`payload`), `getTestPayload` (tes integrasi), `ADMIN_E2E`, `SLUG` (E2E).
- Produces: `TERJEMAHAN_ADMIN` (tambahan terjemahan Indonesia: seluruh teks editor Lexical dan `general:sorryNotFound` tanpa em dash) dan `BAHASA_ADMIN` (`supportedLanguages: { id }`, `fallbackLanguage: 'id'`, `translations`), dipasang di `buildConfig({ i18n })`; `admin.avatar: 'default'`. Semua tes E2E admin sesudahnya memakai label Indonesia.

Keputusan pemilik (6 November 2026): admin Payload berbahasa Indonesia. Payload memilih bahasa dari cookie `payload-lng`, lalu header `Accept-Language`, lalu `fallbackLanguage` (kode `getRequestLanguage` 3.92.1), tetapi hanya di antara bahasa yang didukung. Dengan `supportedLanguages: { id }` saja, admin selalu berbahasa Indonesia untuk semua pengguna dan semua browser (termasuk Chromium tes yang meminta `en-US`), dan pemilih bahasa di halaman akun tidak tampil. Pesan galat Local API dan REST ikut berbahasa Indonesia, jadi satu tes integrasi lama yang mencocokkan pesan Inggris disesuaikan.

Probe menemukan dua hal yang harus ditambah sendiri:
- **Editor Lexical 3.92.1 belum punya terjemahan Indonesia sama sekali** (15 file `i18n.js` fitur dan `i18n.js` umum hanya punya bahasa lain). Tanpa tambahan, `t()` Payload mengembalikan kuncinya, sehingga toolbar dan menu garis miring menampilkan `lexical:heading:label`. `TERJEMAHAN_ADMIN.lexical` mengisi semua kunci yang dipakai fitur bawaan; tes integrasi membandingkan semua kunci `lexical` Inggris di konfigurasi yang sudah disanitasi dengan kunci Indonesia, jadi fitur Lexical baru tanpa terjemahan langsung ketahuan.
- **Satu teks bawaan memakai em dash** (`general:sorryNotFound`: "Maaf\u2014tidak ada ...", ditulis di sini dengan escape). Teks itu ditimpa tanpa em dash. Teks bawaan lain tidak memakai tanda seru.

Temuan yang tidak diubah (dicatat di "Cakupan yang ditunda"): 60 teks bawaan menyapa "Anda", bukan "kamu" (misalnya "Anda tidak diizinkan melakukan tindakan ini."), dan banyak label memakai huruf kapital di setiap kata ("Buat Baru", "Simpan Draf"). Mengubahnya berarti menimpa puluhan kunci dan merawat salinan terjemahan sendiri setiap kali Payload naik versi.

Avatar admin diganti `'default'`: bawaan Payload (`avatar: 'gravatar'`) memuat gambar dari `www.gravatar.com` dengan hash email admin, jadi setiap halaman admin memanggil layanan pihak ketiga dan tes E2E admin memanggil jaringan (probe: 17 koneksi ke `www.gravatar.com` ditolak proxy dalam satu putaran E2E penuh, dari spec admin yang sudah ada). Tes E2E admin baru mencatat setiap permintaan ke luar `localhost` dan memastikan tidak ada, dengan gambar Cloudinary di form artikel dicegat `cegatCloudinary`.

Probe juga menemukan pemilih label yang bentrok: `getByLabel('Ke')` di `pantau.spec.ts` sekarang juga cocok dengan tautan menu "Keluar" (`aria-label`), jadi dibuat `exact`. Nama tombol "Open Menu" menjadi "Buka Menu" (`general:open` + `general:menu`), "Save" menjadi "Simpan", dan nama aksesibel tombol terbit nonaktif Rencana 7 (`TombolTerbit` memakai `t('version:publishChanges')`) menjadi "Publikasikan perubahan. Artikel ini memakai draf AI. ...". Tombol "Buat Baru" di daftar artikel bernama aksesibel "Buat Artikel baru".

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/int/admin-bahasa.int.spec.ts`

  ```ts
  import { createLocalReq } from 'payload'
  import { describe, expect, it } from 'vitest'

  import { getTestPayload } from './helpers'

  type Terjemahan = { [kunci: string]: Terjemahan | string }

  /** Semua kunci `a:b:c` dan nilainya dari objek terjemahan bersarang. */
  function rata(objek: Terjemahan, awalan = ''): [string, string][] {
    return Object.entries(objek).flatMap(([k, v]) => (typeof v === 'string' ? [[`${awalan}${k}`, v] as [string, string]] : rata(v, `${awalan}${k}:`)))
  }

  describe('admin Payload berbahasa Indonesia', () => {
    it('hanya bahasa Indonesia yang didukung, jadi admin selalu berbahasa Indonesia apa pun bahasa browser', async () => {
      const payload = await getTestPayload()
      expect(Object.keys(payload.config.i18n.supportedLanguages)).toEqual(['id'])
      expect(payload.config.i18n.fallbackLanguage).toBe('id')
    })

    it('setiap teks editor Lexical yang terpasang punya terjemahan Indonesia (tanpa kunci mentah di toolbar)', async () => {
      const payload = await getTestPayload()
      const terjemahan = payload.config.i18n.translations as Record<string, Terjemahan>
      const inggris = rata(terjemahan.en.lexical as Terjemahan).map(([k]) => k)
      const indonesia = new Set(rata(terjemahan.id.lexical as Terjemahan).map(([k]) => k))
      expect(inggris.length).toBeGreaterThan(20)
      expect(inggris.filter((k) => !indonesia.has(k))).toEqual([])
    })

    it('teks admin (bawaan dan tambahan) tanpa em dash, en dash, dan tanda seru', async () => {
      const payload = await getTestPayload()
      const bawaan = payload.config.i18n.supportedLanguages.id!.translations as unknown as Terjemahan
      const tambahan = (payload.config.i18n.translations as Record<string, Terjemahan>).id
      const melanggar = [...rata(bawaan), ...rata(tambahan)].filter(([k, v]) => /[\u2014\u2013!]/.test(v) && k !== 'general:sorryNotFound')
      expect(melanggar).toEqual([])
      expect(rata(tambahan).find(([k]) => k === 'general:sorryNotFound')?.[1]).toBe('Maaf, tidak ada yang sesuai dengan permintaan Anda.')
    })

    it('permintaan Local API dan REST memakai teks Indonesia, termasuk editor Lexical dan pesan galat', async () => {
      const payload = await getTestPayload()
      const req = await createLocalReq({}, payload)
      expect(req.i18n.language).toBe('id')
      expect(req.t('general:save')).toBe('Simpan')
      expect(req.t('version:publishChanges')).toBe('Publikasikan perubahan')
      expect(req.t('general:sorryNotFound')).toBe('Maaf, tidak ada yang sesuai dengan permintaan Anda.')
      expect(req.t('lexical:heading:label' as never, { headingLevel: 2 })).toBe('Judul 2')
      await expect(payload.find({ collection: 'log-ai', overrideAccess: false })).rejects.toThrow('Anda tidak diizinkan melakukan tindakan ini.')
    })
  })
  ```

  `tests/e2e/admin.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { cegatCloudinary } from './bantu'
  import { ADMIN_E2E, SLUG } from './data'

  /**
   * Admin Payload hanya berbahasa Indonesia (Rencana 8A): browser yang meminta bahasa Inggris tetap mendapat
   * admin berbahasa Indonesia, termasuk editor Lexical yang terjemahannya ditambahkan proyek. Admin juga tidak
   * memanggil layanan luar (tanpa Gravatar).
   */
  test('admin berbahasa Indonesia walau browser meminta bahasa Inggris: menu, daftar, tombol terbit, dan editor tanpa kunci mentah', async ({ browser }) => {
    const konteks = await browser.newContext({ locale: 'en-US', extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' } })
    const page = await konteks.newPage()
    // Admin tidak memanggil layanan luar: gambar Cloudinary dicegat tes, avatar tanpa Gravatar.
    await cegatCloudinary(page)
    const luar: string[] = []
    page.on('request', (r) => {
      const url = new URL(r.url())
      if (url.hostname !== 'localhost' && url.protocol !== 'data:' && url.hostname !== 'res.cloudinary.com') luar.push(r.url())
    })
    await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })

    await page.goto('/admin/collections/artikel')
    await expect(page.locator('html')).toHaveAttribute('lang', 'id')
    await expect(page.locator('.nav')).toHaveClass(/nav--nav-hydrated/)
    await expect(page.getByRole('button', { name: /^(Buka|Tutup) Menu$/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Buat Artikel baru' })).toBeVisible()
    // Tanggal admin berformat Indonesia (admin.dateFormat), bukan bawaan "November ke-6 2026, 8:21 AM".
    const bulan = 'Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember'
    await expect(page.getByRole('cell', { name: new RegExp(`^\\d{1,2} (${bulan}) \\d{4}, \\d{2}\\.\\d{2}$`) }).first()).toBeVisible()

    const { docs } = await (await page.request.get(`/api/artikel?where[slug][equals]=${SLUG.panduan}&depth=0`)).json()
    await page.goto(`/admin/collections/artikel/${docs[0].id}`)
    // Artikel memakai autosave draf, jadi tombolnya hanya terbit (nonaktif selama belum ada perubahan).
    await expect(page.locator('#action-save')).toHaveText('Publikasikan perubahan')
    await expect(page.getByRole('button', { name: 'Ciutkan Semua' }).first()).toBeVisible()
    await expect(page.locator('.rich-text-lexical').first()).toBeVisible()
    await expect(page.locator('body')).not.toContainText('lexical:')
    expect(luar).toEqual([])
    await konteks.close()
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:int
  ```

  Hasil yang diharapkan: FAIL di `tests/int/admin-bahasa.int.spec.ts`, keempat tes gagal; yang pertama dengan `AssertionError: expected [ 'en' ] to deeply equal [ 'id' ]`, yang kedua dengan `TypeError: Cannot read properties of undefined (reading 'lexical')`.

- [ ] **Langkah 3: Bahasa admin dan terjemahan tambahan**

  `src/lib/bahasa-admin.ts`

  ```ts
  import { id } from 'payload/i18n/id'
  import type { Config } from 'payload'

  /**
   * Bahasa admin Payload (keputusan pemilik, Rencana 8A): hanya bahasa Indonesia, jadi semua pengguna
   * melihat admin berbahasa Indonesia apa pun bahasa browsernya. Terjemahan bawaan dari `payload/i18n/id`
   * (paket `@payloadcms/translations` versi yang sama dengan Payload, tanpa dependensi baru).
   *
   * Tambahan di sini hanya untuk yang belum diterjemahkan atau melanggar aturan copy point.:
   * - Editor Lexical 3.92.1 belum punya terjemahan Indonesia sama sekali, sehingga tanpa tambahan ini
   *   toolbar menampilkan kunci mentah seperti `lexical:heading:label`.
   * - Satu teks bawaan memakai em dash (`general:sorryNotFound`).
   *
   * Teks bawaan lain yang menyapa "Anda" (bukan "kamu") dan memakai huruf kapital di setiap kata tidak
   * ditimpa: menimpa puluhan kunci berarti merawat salinan terjemahan sendiri setiap kali Payload naik versi.
   */
  export const TERJEMAHAN_ADMIN = {
    general: {
      sorryNotFound: 'Maaf, tidak ada yang sesuai dengan permintaan Anda.',
    },
    lexical: {
      general: {
        placeholder: "Mulai mengetik, atau tekan '/' untuk perintah...",
        slashMenuBasicGroupLabel: 'Dasar',
        slashMenuListGroupLabel: 'Daftar',
        toolbarItemsActive: '{{count}} aktif',
      },
      align: {
        alignCenterLabel: 'Rata tengah',
        alignJustifyLabel: 'Rata kiri dan kanan',
        alignLeftLabel: 'Rata kiri',
        alignRightLabel: 'Rata kanan',
      },
      blockquote: { label: 'Kutipan' },
      blocks: {
        inlineBlocks: {
          create: 'Buat {{label}}',
          edit: 'Ubah {{label}}',
          label: 'Blok sebaris',
          remove: 'Hapus {{label}}',
        },
        label: 'Blok',
      },
      heading: { label: 'Judul {{headingLevel}}' },
      horizontalRule: { label: 'Garis pemisah' },
      indent: { decreaseLabel: 'Kurangi indentasi', increaseLabel: 'Tambah indentasi' },
      link: { label: 'Tautan', loadingWithEllipsis: 'Memuat...' },
      checklist: { label: 'Daftar centang' },
      orderedList: { label: 'Daftar bernomor' },
      unorderedList: { label: 'Daftar berbutir' },
      paragraph: { label: 'Paragraf', label2: 'Teks biasa' },
      relationship: { label: 'Relasi' },
      textState: { defaultStyle: 'Gaya bawaan' },
      upload: { label: 'Unggahan' },
    },
  }

  export const BAHASA_ADMIN: NonNullable<Config['i18n']> = {
    supportedLanguages: { id },
    fallbackLanguage: 'id',
    translations: { id: TERJEMAHAN_ADMIN },
  }
  ```

  ```diff
  diff --git a/src/payload.config.ts b/src/payload.config.ts
  index e910b23..69e71fa 100644
  --- a/src/payload.config.ts
  +++ b/src/payload.config.ts
  @@ -33,6 +33,7 @@ import { Footer } from './globals/Footer'
   import { Header } from './globals/Header'
   import { Newsletter } from './globals/Newsletter'
   import { PengaturanSEO } from './globals/PengaturanSEO'
  +import { BAHASA_ADMIN } from './lib/bahasa-admin'
   import { endpointJalankanJob } from './modules/indexer/endpoint'
   import { klienMedia } from './modules/media'
   import { mediaCloudinary } from './modules/media/plugin'
  @@ -43,6 +44,10 @@ const dirname = path.dirname(filename)
   export default buildConfig({
     admin: {
       user: Pengguna.slug,
  +    // Avatar bawaan Payload memanggil Gravatar dengan hash email admin (pihak ketiga); ikon bawaan cukup.
  +    avatar: 'default',
  +    // Tanggal di admin seperti tulisan Indonesia (6 November 2026, 08.21), bukan bawaan "November ke-6 2026, 8:21 AM".
  +    dateFormat: 'd MMMM yyyy, HH.mm',
       importMap: { baseDir: path.resolve(dirname) },
       components: {
         // Dashboard SEO (spesifikasi §8) di /admin/seo, dengan tautan di atas menu admin.
  @@ -87,6 +92,8 @@ export default buildConfig({
     // `GET /api/jobs/run`: cron Vercel setiap 10 menit (vercel.json), jadwal terbit, Mesin Indexing, dan Pantau SEO.
     endpoints: [endpointJalankanJob],
     editor: lexicalEditor(),
  +  // Admin hanya berbahasa Indonesia (keputusan pemilik, Rencana 8A).
  +  i18n: BAHASA_ADMIN,
     secret: process.env.PAYLOAD_SECRET || '',
     typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
     db: postgresAdapter({
  ```

- [ ] **Langkah 4: Sesuaikan tes lama ke label Indonesia**

  ```diff
  diff --git a/tests/int/indexer-antrean.int.spec.ts b/tests/int/indexer-antrean.int.spec.ts
  index acc79a2..783390c 100644
  --- a/tests/int/indexer-antrean.int.spec.ts
  +++ b/tests/int/indexer-antrean.int.spec.ts
  @@ -82,8 +82,8 @@ describe('kabari: antrean, log revalidasi, dan status indeks', () => {
       const editor = await payload.create({ collection: 'pengguna', data: pengguna() })
       expect(editor.peran).toBe('editor')
       for (const collection of ['log-indexing', 'antrean-indexing', 'status-indeks'] as const) {
  -      await expect(payload.find({ collection, overrideAccess: false, user: { ...editor, collection: 'pengguna' } })).rejects.toThrow('You are not allowed to perform this action.')
  -      await expect(payload.find({ collection, overrideAccess: false })).rejects.toThrow('You are not allowed to perform this action.')
  +      await expect(payload.find({ collection, overrideAccess: false, user: { ...editor, collection: 'pengguna' } })).rejects.toThrow('Anda tidak diizinkan melakukan tindakan ini.')
  +      await expect(payload.find({ collection, overrideAccess: false })).rejects.toThrow('Anda tidak diizinkan melakukan tindakan ini.')
       }
     })
   })
  ```

  ```diff
  diff --git a/tests/e2e/asisten.spec.ts b/tests/e2e/asisten.spec.ts
  index a475ea1..ffc2cff 100644
  --- a/tests/e2e/asisten.spec.ts
  +++ b/tests/e2e/asisten.spec.ts
  @@ -67,7 +67,7 @@ test('artikel yang memakai draf AI: tombol terbit nonaktif sampai ketiga butir r
     const terbit = page.locator('#action-save')
     await expect(terbit).toBeDisabled()
     await periksaTanpaGeserHorizontal(page)
  -  await expect(terbit).toHaveAccessibleName('Publish changes. Artikel ini memakai draf AI. Centang ketiga butir Review sebelum terbit di sidebar dulu.')
  +  await expect(terbit).toHaveAccessibleName('Publikasikan perubahan. Artikel ini memakai draf AI. Centang ketiga butir Review sebelum terbit di sidebar dulu.')
     await expect(page.getByRole('checkbox', { name: 'Memakai draf AI' })).toBeDisabled()
     // Payload baru merender isi grup saat grup terlihat di layar (RenderIfInViewport).
     await page.locator('#field-reviewAi').scrollIntoViewIfNeeded()
  @@ -81,7 +81,7 @@ test('artikel yang memakai draf AI: tombol terbit nonaktif sampai ketiga butir r
     await expect(terbit).toBeDisabled()
     await page.getByRole('checkbox', { name: 'Insight atau pengalaman penulis sudah ditambahkan', exact: true }).check()
     await expect(terbit).toBeEnabled()
  -  await expect(terbit).toHaveAccessibleName('Publish changes')
  +  await expect(terbit).toHaveAccessibleName('Publikasikan perubahan')
   })
   
   test('artikel tanpa draf AI: checklist review tidak tampil dan tombol terbit aktif', async ({ page }) => {
  ```

  ```diff
  diff --git a/tests/e2e/pantau.spec.ts b/tests/e2e/pantau.spec.ts
  index fc36acf..edd3937 100644
  --- a/tests/e2e/pantau.spec.ts
  +++ b/tests/e2e/pantau.spec.ts
  @@ -13,8 +13,9 @@ test('log 404: "Buat redirect" membuka form redirect dengan path terisi; setelah
     await page.getByRole('link', { name: `Buat redirect untuk ${path}` }).click()
     await expect(page).toHaveURL(/\/admin\/collections\/redirect\/create\?dari=/)
     await expect(page.getByLabel('Dari')).toHaveValue(path)
  -  await page.getByLabel('Ke').fill('/tentang')
  -  await page.getByRole('button', { name: 'Save' }).click()
  +  // `exact`: tautan "Keluar" di menu admin juga berlabel diawali "Ke".
  +  await page.getByLabel('Ke', { exact: true }).fill('/tentang')
  +  await page.getByRole('button', { name: 'Simpan' }).click()
     await expect(page).toHaveURL(/\/admin\/collections\/redirect\/\d+/)
   
     await page.goto(daftar)
  @@ -35,10 +36,10 @@ test('dashboard SEO dari menu admin: performa Google, halaman teratas, status in
     expect((await page.request.get('/api/jobs/run')).status()).toBe(200)
     await page.goto('/admin')
     // Server merender menu admin terbuka; saat hidrasi (kelas nav--nav-hydrated) Payload menutupnya di layar 1440 px
  -  // ke bawah. Tombol Open Menu baru diklik setelah keadaan itu tetap, supaya klik tidak hilang sebelum hidrasi.
  +  // ke bawah. Tombol Buka Menu baru diklik setelah keadaan itu tetap, supaya klik tidak hilang sebelum hidrasi.
     const nav = page.locator('.nav')
     await expect(nav).toHaveClass(/nav--nav-hydrated/)
  -  if (!(await nav.getAttribute('class'))?.includes('nav--nav-open')) await page.getByRole('button', { name: 'Open Menu' }).click()
  +  if (!(await nav.getAttribute('class'))?.includes('nav--nav-open')) await page.getByRole('button', { name: 'Buka Menu' }).click()
     await expect(nav).toHaveClass(/nav--nav-open/)
     await page.getByRole('link', { name: 'Dashboard SEO' }).click()
     await expect(page).toHaveURL(/\/admin\/seo$/)
  ```

- [ ] **Langkah 5: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 476 tes (69 file); integrasi 142 tes (42 file); E2E 113 tes.

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/lib/bahasa-admin.ts src/payload.config.ts tests/int/admin-bahasa.int.spec.ts tests/int/indexer-antrean.int.spec.ts tests/e2e/admin.spec.ts tests/e2e/asisten.spec.ts tests/e2e/pantau.spec.ts
  git commit -m "feat(admin): admin Payload berbahasa Indonesia (payload/i18n/id), terjemahan editor Lexical yang belum ada, dan teks bawaan tanpa em dash"
  ```

---

### Task 2: Aturan iklan sebagai fungsi murni

**Files:**
- Create: `src/modules/iklan/tipe.ts`, `src/modules/iklan/aturan.ts`
- Test: `tests/unit/iklan-aturan.test.ts`

**Interfaces:**
- Consumes: `IsiDokumen` (`seo/lexical`), `h`, `isiLexical`, `p` (`tests/unit/seo-contoh.ts`).
- Produces:
  - `tipe.ts`: `POSISI_IKLAN` (`artikel-tengah`, `artikel-akhir`, `rubrik`, `tools`, `beranda`) dan `LABEL_POSISI_IKLAN`, `UKURAN_IKLAN` (`persegi` 300 x 250, `persegi-besar` 336 x 280, `banner` 320 x 100), `DIMENSI_IKLAN`, `LABEL_UKURAN_IKLAN`, tipe `PosisiIklan`, `UkuranIklan`, `PengaturanSlot`, `PengaturanIklan`, `SlotSiap`.
  - `aturan.ts`: `POLA_ID_PENERBIT`, `POLA_ID_SLOT`, `POLA_UNIT`, `PARAGRAF_IKLAN` (2 sampai 10, bawaan 3), `MIN_PARAGRAF_SESUDAH` (2), `NODE_IKLAN` (`slotIklan`), `ID_OTORITAS_GOOGLE`, `iklanSiap(p)`, `pilihSlot(p, posisi, id?)`, `letakIklanTengah(isi, n)`, `sisipkanIklanTengah(isi, slot)`, `validasiIdPenerbit(nilai, aktif)`, `validasiIdSlot`, `validasiUnit`, `BarisSlot` dan `validasiDaftarSlot(baris)`, `periksaAdsTxt(teks)`, `validasiAdsTxt`, `barisAdsense(id)`, `isiAdsTxt(p)`.

Semua aturan iklan yang bisa diuji tanpa database ada di sini; komponen, global, rute, dan pemuat di task berikutnya hanya memanggilnya. `pilihSlot` satu-satunya tempat yang memutuskan apakah sebuah slot tampil: tanpa iklan bila global mati, penyedia bukan AdSense, ID penerbit kosong atau salah, slot nonaktif, unit salah, atau posisi (dan untuk beranda, ID) tidak cocok. Hasilnya `SlotSiap` yang sudah memuat ukuran piksel, ID penerbit, unit, mode uji, dan nomor paragraf.

Posisi menyatukan "halaman" dan "posisi" dari spesifikasi §6: setiap posisi milik satu jenis halaman, jadi editor tidak bisa memilih pasangan yang tidak ada. Tidak ada posisi di dalam kotak Intinya, di atas H1, atau di dalam kalkulator (spesifikasi §11); tes menjaganya. Ukuran hanya ukuran tetap yang lebarnya paling banyak 336 px: muat di layar 375 px (kontainer 343 px), dan tingginya pasti sehingga ruangnya bisa dipesan tanpa pergeseran (iklan responsif bisa lebih tinggi dari ruang yang dipesan).

Iklan tengah artikel disisipkan sebagai node Lexical `slotIklan` setelah paragraf berteks ke-N di tingkat atas isi, hanya bila masih ada paling sedikit dua paragraf sesudahnya; node di dalam daftar, tabel, callout, dan blok lain tidak dihitung. `validasiDaftarSlot` menerima baris form (`idSlot`, karena nama `id` dipakai Payload untuk kunci baris array, temuan probe Task 4). `isiAdsTxt` menulis baris AdSense dari ID penerbit (format Bantuan AdSense "Panduan ads.txt"), lalu baris tambahan editor tanpa duplikat, dan mengembalikan `null` bila tidak ada baris data: menurut spesifikasi IAB ads.txt 1.1, 404 berarti situs tidak mendeklarasikan penjual, sedangkan file tanpa baris data tidak sah. ID penerbit di tes dan contoh adalah `ca-pub-0000000000000000`, jelas palsu.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/iklan-aturan.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import {
    barisAdsense,
    iklanSiap,
    isiAdsTxt,
    letakIklanTengah,
    periksaAdsTxt,
    pilihSlot,
    sisipkanIklanTengah,
    validasiAdsTxt,
    validasiDaftarSlot,
    validasiIdPenerbit,
    validasiIdSlot,
    validasiUnit,
  } from '@/modules/iklan/aturan'
  import { POSISI_IKLAN, type PengaturanIklan } from '@/modules/iklan/tipe'

  import { h, isiLexical, p } from './seo-contoh'

  /** ID penerbit tiruan yang jelas palsu (bukan milik siapa pun). */
  const PENERBIT = 'ca-pub-0000000000000000'

  const pengaturan = (ubah: Partial<PengaturanIklan> = {}): PengaturanIklan => ({
    aktif: true,
    penyedia: 'adsense',
    idPenerbit: PENERBIT,
    modeUji: false,
    adsTxtTambahan: null,
    slot: [
      { id: 'artikel-tengah', posisi: 'artikel-tengah', ukuran: 'persegi', unit: '1111111111', setelahParagraf: 3, aktif: true },
      { id: 'artikel-akhir', posisi: 'artikel-akhir', ukuran: 'persegi-besar', unit: '2222222222', aktif: true },
      { id: 'beranda-samping', posisi: 'beranda', ukuran: 'banner', unit: '3333333333', aktif: true },
      { id: 'beranda-mati', posisi: 'beranda', ukuran: 'banner', unit: '4444444444', aktif: false },
    ],
    ...ubah,
  })

  describe('slot yang tampil', () => {
    it('slot aktif menjadi slot siap dengan ukuran tetap, ID penerbit, unit, dan mode uji', () => {
      expect(pilihSlot(pengaturan({ modeUji: true }), 'artikel-akhir')).toEqual({
        id: 'artikel-akhir',
        posisi: 'artikel-akhir',
        lebar: 336,
        tinggi: 280,
        klien: PENERBIT,
        unit: '2222222222',
        uji: true,
        setelahParagraf: 3,
      })
      expect(pilihSlot(pengaturan(), 'beranda', 'beranda-samping')).toMatchObject({ lebar: 320, tinggi: 100, unit: '3333333333' })
    })

    it('tanpa iklan bila global mati, ID penerbit kosong atau salah, slot nonaktif, unit salah, atau posisi tidak cocok', () => {
      expect(pilihSlot(pengaturan({ aktif: false }), 'artikel-akhir')).toBeNull()
      expect(pilihSlot(pengaturan({ idPenerbit: null }), 'artikel-akhir')).toBeNull()
      expect(pilihSlot(pengaturan({ idPenerbit: 'pub-0000000000000000' }), 'artikel-akhir')).toBeNull()
      expect(pilihSlot(pengaturan(), 'beranda', 'beranda-mati')).toBeNull()
      expect(pilihSlot(pengaturan(), 'beranda', 'tidak-ada')).toBeNull()
      expect(pilihSlot(pengaturan(), 'rubrik')).toBeNull()
      expect(pilihSlot(pengaturan({ slot: [{ id: 'a', posisi: 'tools', ukuran: 'persegi', unit: 'abc', aktif: true }] }), 'tools')).toBeNull()
      expect(pilihSlot(null, 'artikel-akhir')).toBeNull()
      expect(iklanSiap(pengaturan())).toBe(true)
    })

    it('tidak ada posisi di dalam kotak Intinya, di atas H1, atau di dalam kalkulator', () => {
      expect(POSISI_IKLAN).toEqual(['artikel-tengah', 'artikel-akhir', 'rubrik', 'tools', 'beranda'])
      expect(POSISI_IKLAN.filter((posisi) => /intinya|atas|judul|kalkulator|header/.test(posisi))).toEqual([])
    })
  })

  describe('iklan di tengah isi artikel', () => {
    const isi = isiLexical([
      p('Satu.'),
      h('h2', 'Bagian'),
      p('Dua.'),
      { type: 'block', version: 2, fields: { blockType: 'callout' } },
      p('Tiga.'),
      p(''),
      p('Empat.'),
      { type: 'list', version: 1, children: [{ type: 'listitem', version: 1, children: [{ type: 'text', text: 'Butir', version: 1 }] }] },
      p('Lima.'),
    ])

    it('setelah paragraf berteks ke-N di tingkat atas, asal masih ada dua paragraf sesudahnya', () => {
      expect(letakIklanTengah(isi, 3)).toBe(4)
      expect(letakIklanTengah(isi, 2)).toBe(2)
      expect(letakIklanTengah(isi, 4)).toBeNull()
      expect(letakIklanTengah(isiLexical([p('Satu.'), p('Dua.')]), 2)).toBeNull()
      expect(letakIklanTengah(null, 3)).toBeNull()
    })

    it('node slotIklan membawa slotnya; isi pendek atau tanpa slot tidak berubah', () => {
      const slot = pilihSlot(pengaturan(), 'artikel-tengah')!
      const hasil = sisipkanIklanTengah(isi, slot)!.root!.children!
      expect(hasil).toHaveLength(10)
      expect(hasil[5]).toEqual({ type: 'slotIklan', version: 1, slot })
      expect(sisipkanIklanTengah(isi, null)).toBe(isi)
      const pendek = isiLexical([p('Satu.'), p('Dua.'), p('Tiga.')])
      expect(sisipkanIklanTengah(pendek, slot)).toBe(pendek)
    })

    it('posisi paragraf dari editor dibatasi 2 sampai 10, bawaan 3', () => {
      const satu = (setelahParagraf: number | null) =>
        pilihSlot(pengaturan({ slot: [{ id: 't', posisi: 'artikel-tengah', ukuran: 'persegi', unit: '1111111111', setelahParagraf, aktif: true }] }), 'artikel-tengah')
      expect(satu(1)?.setelahParagraf).toBe(2)
      expect(satu(25)?.setelahParagraf).toBe(10)
      expect(satu(null)?.setelahParagraf).toBe(3)
    })
  })

  describe('validasi global iklan', () => {
    it('ID penerbit ca-pub- dengan 16 angka, wajib saat iklan dinyalakan', () => {
      expect(validasiIdPenerbit(PENERBIT, true)).toBe(true)
      expect(validasiIdPenerbit('', false)).toBe(true)
      expect(validasiIdPenerbit('', true)).toBe('Isi ID penerbit AdSense sebelum menyalakan iklan.')
      expect(validasiIdPenerbit('pub-0000000000000000', false)).toBe('ID penerbit AdSense berbentuk ca-pub- diikuti 16 angka. Salin dari Akun, Informasi akun di AdSense.')
    })

    it('ID slot, unit iklan, dan daftar slot', () => {
      expect(validasiIdSlot('artikel-akhir')).toBe(true)
      expect(validasiIdSlot('Artikel Akhir')).toBe('ID slot 2 sampai 40 karakter: huruf kecil, angka, dan tanda hubung, misalnya artikel-akhir.')
      expect(validasiUnit('1234567890')).toBe(true)
      expect(validasiUnit('12ab')).toBe('Unit iklan berupa angka data-ad-slot dari kode unit iklan di AdSense.')
      const baris = pengaturan().slot.map(({ id, ...s }) => ({ idSlot: id, ...s }))
      expect(validasiDaftarSlot(baris)).toBe(true)
      expect(validasiDaftarSlot([...baris, { idSlot: 'artikel-akhir', posisi: 'rubrik', aktif: false }])).toBe(
        'ID slot "artikel-akhir" dipakai lebih dari sekali. Beri setiap slot ID sendiri.',
      )
      expect(validasiDaftarSlot([...baris, { idSlot: 'akhir-2', posisi: 'artikel-akhir', aktif: true }])).toBe(
        'Posisi "Artikel: setelah isi, sebelum sumber dan FAQ" sudah dipakai slot "artikel-akhir". Matikan salah satunya.',
      )
    })
  })

  describe('ads.txt', () => {
    it('baris AdSense dari ID penerbit, lalu baris tambahan tanpa duplikat; tanpa baris sama sekali berarti tidak ada file', () => {
      expect(barisAdsense(PENERBIT)).toBe('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0')
      expect(isiAdsTxt({ penyedia: 'adsense', idPenerbit: PENERBIT, adsTxtTambahan: null })).toBe('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n')
      expect(
        isiAdsTxt({
          penyedia: 'adsense',
          idPenerbit: PENERBIT,
          adsTxtTambahan: '# jaringan lain\ngoogle.com,pub-0000000000000000,DIRECT,f08c47fec0942fa0\ncontoh-iklan.test, 12345, RESELLER\n\ncontact=redaksi@point.lat',
        }),
      ).toBe('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n# jaringan lain\ncontoh-iklan.test, 12345, RESELLER\ncontact=redaksi@point.lat\n')
      expect(isiAdsTxt({ penyedia: 'adsense', idPenerbit: null, adsTxtTambahan: '' })).toBeNull()
      expect(isiAdsTxt({ penyedia: 'adsense', idPenerbit: null, adsTxtTambahan: '# hanya komentar' })).toBeNull()
      expect(isiAdsTxt(null)).toBeNull()
    })

    it('baris tambahan diperiksa per baris dengan nomor barisnya', () => {
      expect(periksaAdsTxt('# komentar\n\ngoogle.com, pub-1, DIRECT # catatan\nOWNERDOMAIN=point.lat')).toEqual([])
      expect(periksaAdsTxt('google.com pub-1 DIRECT\ngoogle.com, pub-1, LANGSUNG\nbukan domain, 1, DIRECT\nwarna=biru\ngoogle.com, , DIRECT')).toEqual([
        'Baris 1: tulis 3 atau 4 isian dipisah koma, misalnya google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0.',
        'Baris 2: isian ketiga harus DIRECT atau RESELLER.',
        'Baris 3: isian pertama harus domain sistem iklan, misalnya google.com.',
        'Baris 4: variabel "warna" tidak dikenal ads.txt.',
        'Baris 5: isian kedua harus ID akun tanpa spasi.',
      ])
      expect(validasiAdsTxt('')).toBe(true)
      expect(validasiAdsTxt('google.com, pub-1, direct, ')).toBe('Baris 1: isian keempat (ID otoritas) kosong. Hapus koma terakhir atau isi ID-nya.')
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/iklan-aturan.test.ts` dengan `Error: Cannot find package '@/modules/iklan/aturan'`.

- [ ] **Langkah 3: Tipe dan aturan iklan**

  `src/modules/iklan/tipe.ts`

  ```ts
  /**
   * Tipe bersama modul iklan (spesifikasi §11). Aman dipakai di server, komponen publik, dan admin.
   */

  /**
   * Tempat slot iklan. Setiap posisi milik satu jenis halaman, jadi editor tidak bisa memilih pasangan
   * halaman dan posisi yang tidak ada. Tidak ada posisi di dalam kotak Intinya, di atas H1, atau di dalam
   * kalkulator (spesifikasi §11).
   */
  export const POSISI_IKLAN = ['artikel-tengah', 'artikel-akhir', 'rubrik', 'tools', 'beranda'] as const
  export type PosisiIklan = (typeof POSISI_IKLAN)[number]

  export const LABEL_POSISI_IKLAN: Record<PosisiIklan, string> = {
    'artikel-tengah': 'Artikel: di tengah isi, setelah paragraf ke-N',
    'artikel-akhir': 'Artikel: setelah isi, sebelum sumber dan FAQ',
    rubrik: 'Rubrik: setelah daftar tulisan',
    tools: 'Tools: setelah penjelasan, di luar kalkulator',
    beranda: 'Beranda: di tempat blok Slot iklan',
  }

  /**
   * Ukuran tetap dari daftar ukuran iklan display AdSense. Lebar paling besar 336 px supaya muat di layar
   * 375 px (kontainer 343 px), dan tinggi tetap supaya ruangnya bisa dipesan tanpa pergeseran tata letak.
   */
  export const UKURAN_IKLAN = ['persegi', 'persegi-besar', 'banner'] as const
  export type UkuranIklan = (typeof UKURAN_IKLAN)[number]

  export const DIMENSI_IKLAN: Record<UkuranIklan, { lebar: number; tinggi: number }> = {
    persegi: { lebar: 300, tinggi: 250 },
    'persegi-besar': { lebar: 336, tinggi: 280 },
    banner: { lebar: 320, tinggi: 100 },
  }

  export const LABEL_UKURAN_IKLAN: Record<UkuranIklan, string> = {
    persegi: 'Persegi 300 x 250',
    'persegi-besar': 'Persegi besar 336 x 280',
    banner: 'Banner 320 x 100',
  }

  /** Satu slot di global `iklan`. */
  export type PengaturanSlot = {
    id: string
    posisi: PosisiIklan
    ukuran: UkuranIklan
    /** `data-ad-slot` unit iklan AdSense. */
    unit: string
    /** Hanya untuk `artikel-tengah`: iklan dipasang setelah paragraf ke berapa. */
    setelahParagraf?: number | null
    aktif: boolean
  }

  /** Isi global `iklan` yang dipakai situs. */
  export type PengaturanIklan = {
    aktif: boolean
    penyedia: 'adsense'
    /** ID penerbit AdSense, `ca-pub-` diikuti 16 angka. */
    idPenerbit: string | null
    /** `data-adtest="on"`: permintaan uji (pratinjau), bukan tayangan sungguhan. */
    modeUji: boolean
    slot: PengaturanSlot[]
    adsTxtTambahan: string | null
  }

  /** Slot yang lolos semua syarat dan siap dirender `SlotIklan`. */
  export type SlotSiap = {
    id: string
    posisi: PosisiIklan
    lebar: number
    tinggi: number
    /** `data-ad-client`: ID penerbit. */
    klien: string
    unit: string
    uji: boolean
    setelahParagraf: number
  }
  ```

  `src/modules/iklan/aturan.ts`

  ```ts
  import type { IsiDokumen } from '@/modules/seo/lexical'

  import { DIMENSI_IKLAN, LABEL_POSISI_IKLAN, type PengaturanIklan, type PosisiIklan, type SlotSiap } from './tipe'

  /**
   * Aturan iklan sebagai fungsi murni (spesifikasi §11): syarat slot tampil, penempatan di isi artikel,
   * validasi isian global `iklan`, dan isi `ads.txt`. Aman dipakai di server dan admin.
   */

  /** ID penerbit AdSense: `ca-pub-` diikuti 16 angka. */
  export const POLA_ID_PENERBIT = /^ca-pub-\d{16}$/

  /** ID slot dipakai blok beranda dan atribut `data-slot-iklan`: huruf kecil, angka, dan tanda hubung. */
  export const POLA_ID_SLOT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

  /** `data-ad-slot` unit iklan AdSense: angka saja. */
  export const POLA_UNIT = /^\d{4,20}$/

  /** Iklan tengah artikel paling cepat setelah paragraf ke-2, paling lambat ke-10; bawaan ke-3. */
  export const PARAGRAF_IKLAN = { min: 2, maks: 10, bawaan: 3 } as const

  /** Paragraf yang harus tersisa setelah iklan tengah, supaya iklan tidak menempel di akhir isi. */
  export const MIN_PARAGRAF_SESUDAH = 2

  /** Jenis node Lexical yang menandai tempat iklan tengah di isi artikel (dirender `IsiArtikel`). */
  export const NODE_IKLAN = 'slotIklan'

  /** Baris `ads.txt` AdSense (Bantuan AdSense "Panduan ads.txt"); `pub-` adalah ID penerbit tanpa `ca-`. */
  export const ID_OTORITAS_GOOGLE = 'f08c47fec0942fa0'

  /** Iklan siap tampil bila dinyalakan, penyedianya AdSense, dan ID penerbitnya valid. */
  export function iklanSiap(p: PengaturanIklan | null | undefined): p is PengaturanIklan & { idPenerbit: string } {
    return Boolean(p?.aktif && p.penyedia === 'adsense' && p.idPenerbit && POLA_ID_PENERBIT.test(p.idPenerbit))
  }

  /**
   * Slot aktif untuk satu posisi (dan ID untuk beranda), atau `null`: tidak ada iklan bila global mati,
   * ID penerbit kosong atau salah, slot nonaktif, unitnya salah, atau posisinya tidak cocok.
   */
  export function pilihSlot(p: PengaturanIklan | null | undefined, posisi: PosisiIklan, id?: string | null): SlotSiap | null {
    if (!iklanSiap(p)) return null
    const slot = p.slot.find((s) => s.aktif && s.posisi === posisi && (posisi !== 'beranda' || s.id === id) && POLA_UNIT.test(s.unit))
    if (!slot) return null
    const { lebar, tinggi } = DIMENSI_IKLAN[slot.ukuran]
    const n = slot.setelahParagraf ?? PARAGRAF_IKLAN.bawaan
    return {
      id: slot.id,
      posisi: slot.posisi,
      lebar,
      tinggi,
      klien: p.idPenerbit,
      unit: slot.unit,
      uji: p.modeUji,
      setelahParagraf: Math.min(PARAGRAF_IKLAN.maks, Math.max(PARAGRAF_IKLAN.min, Math.round(n))),
    }
  }

  type NodeIsi = { type?: string; children?: NodeIsi[]; text?: string }

  const adaTeks = (node: NodeIsi): boolean => (node.type === 'text' ? Boolean(node.text?.trim()) : (node.children ?? []).some(adaTeks))

  /**
   * Indeks node tingkat atas isi tempat iklan tengah disisipkan sesudahnya: paragraf berteks ke-N, asal
   * masih ada paling sedikit `MIN_PARAGRAF_SESUDAH` paragraf berteks sesudahnya. Hanya node tingkat atas,
   * jadi iklan tidak pernah masuk ke daftar, tabel, callout, atau blok lain. `null` bila isi terlalu pendek.
   */
  export function letakIklanTengah(isi: IsiDokumen, setelahParagraf: number): number | null {
    const anak = isi?.root?.children
    if (!Array.isArray(anak)) return null
    const paragraf = (anak as NodeIsi[]).flatMap((node, i) => (node.type === 'paragraph' && adaTeks(node) ? [i] : []))
    if (paragraf.length < setelahParagraf + MIN_PARAGRAF_SESUDAH) return null
    return paragraf[setelahParagraf - 1]
  }

  /** Isi artikel dengan node `slotIklan` (membawa slotnya) setelah paragraf ke-N; tanpa slot atau isi pendek: isi apa adanya. */
  export function sisipkanIklanTengah(isi: IsiDokumen, slot: SlotSiap | null): IsiDokumen {
    if (!slot || !isi?.root) return isi
    const letak = letakIklanTengah(isi, slot.setelahParagraf)
    if (letak === null) return isi
    const anak = [...(isi.root.children ?? [])]
    anak.splice(letak + 1, 0, { type: NODE_IKLAN, version: 1, slot })
    return { ...isi, root: { ...isi.root, children: anak } }
  }

  /** Validasi field global `iklan`: ID penerbit wajib dan berformat benar saat iklan dinyalakan. */
  export function validasiIdPenerbit(nilai: unknown, aktif: unknown): true | string {
    const teks = typeof nilai === 'string' ? nilai.trim() : ''
    if (!teks) return aktif ? 'Isi ID penerbit AdSense sebelum menyalakan iklan.' : true
    return POLA_ID_PENERBIT.test(teks) ? true : 'ID penerbit AdSense berbentuk ca-pub- diikuti 16 angka. Salin dari Akun, Informasi akun di AdSense.'
  }

  export function validasiIdSlot(nilai: unknown): true | string {
    const teks = typeof nilai === 'string' ? nilai : ''
    if (teks.length < 2 || teks.length > 40 || !POLA_ID_SLOT.test(teks)) return 'ID slot 2 sampai 40 karakter: huruf kecil, angka, dan tanda hubung, misalnya artikel-akhir.'
    return true
  }

  export function validasiUnit(nilai: unknown): true | string {
    return typeof nilai === 'string' && POLA_UNIT.test(nilai) ? true : 'Unit iklan berupa angka data-ad-slot dari kode unit iklan di AdSense.'
  }

  /** Baris array `slot` di form global `iklan` (field `idSlot`, karena `id` dipakai Payload untuk kunci baris). */
  export type BarisSlot = { idSlot?: string | null; posisi?: PosisiIklan | null; aktif?: boolean | null }

  /** ID slot unik dan satu slot aktif per posisi (kecuali beranda, yang dipilih per blok lewat ID). */
  export function validasiDaftarSlot(daftar: unknown): true | string {
    if (!Array.isArray(daftar)) return true
    const slot = daftar as BarisSlot[]
    const terpakai = new Set<string>()
    for (const s of slot) {
      if (!s.idSlot) continue
      if (terpakai.has(s.idSlot)) return `ID slot "${s.idSlot}" dipakai lebih dari sekali. Beri setiap slot ID sendiri.`
      terpakai.add(s.idSlot)
    }
    const perPosisi = new Map<PosisiIklan, string>()
    for (const s of slot) {
      if (!s.aktif || !s.posisi || s.posisi === 'beranda') continue
      const lain = perPosisi.get(s.posisi)
      if (lain) return `Posisi "${LABEL_POSISI_IKLAN[s.posisi]}" sudah dipakai slot "${lain}". Matikan salah satunya.`
      perPosisi.set(s.posisi, s.idSlot ?? '')
    }
    return true
  }

  /** Variabel `ads.txt` yang dikenal spesifikasi IAB ads.txt 1.1. */
  const VARIABEL_ADS_TXT = new Set(['contact', 'subdomain', 'inventorypartnerdomain', 'ownerdomain', 'managerdomain'])

  /**
   * Memeriksa baris tambahan `ads.txt` (spesifikasi IAB ads.txt 1.1): baris kosong dan komentar `#` boleh;
   * baris data berisi 3 atau 4 isian dipisah koma (domain sistem iklan, ID akun, `DIRECT` atau `RESELLER`,
   * ID otoritas opsional); baris variabel `NAMA=nilai`. Mengembalikan pesan per baris yang salah.
   */
  export function periksaAdsTxt(teks: string): string[] {
    const salah: string[] = []
    teks.split(/\r?\n/).forEach((mentah, i) => {
      const baris = mentah.replace(/#.*$/, '').trim()
      if (!baris) return
      const variabel = /^([A-Za-z]+)=(.+)$/.exec(baris)
      if (variabel) {
        if (!VARIABEL_ADS_TXT.has(variabel[1].toLowerCase())) salah.push(`Baris ${i + 1}: variabel "${variabel[1]}" tidak dikenal ads.txt.`)
        return
      }
      const isian = baris.split(',').map((s) => s.trim())
      if (isian.length < 3 || isian.length > 4) {
        salah.push(`Baris ${i + 1}: tulis 3 atau 4 isian dipisah koma, misalnya google.com, pub-0000000000000000, DIRECT, ${ID_OTORITAS_GOOGLE}.`)
      } else if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(isian[0])) {
        salah.push(`Baris ${i + 1}: isian pertama harus domain sistem iklan, misalnya google.com.`)
      } else if (!isian[1] || /\s/.test(isian[1])) {
        salah.push(`Baris ${i + 1}: isian kedua harus ID akun tanpa spasi.`)
      } else if (!/^(direct|reseller)$/i.test(isian[2])) {
        salah.push(`Baris ${i + 1}: isian ketiga harus DIRECT atau RESELLER.`)
      } else if (isian.length === 4 && !isian[3]) {
        salah.push(`Baris ${i + 1}: isian keempat (ID otoritas) kosong. Hapus koma terakhir atau isi ID-nya.`)
      }
    })
    return salah
  }

  export function validasiAdsTxt(nilai: unknown): true | string {
    if (typeof nilai !== 'string' || !nilai.trim()) return true
    const salah = periksaAdsTxt(nilai)
    return salah.length ? salah.join(' ') : true
  }

  /** Baris AdSense untuk ID penerbit ini (tanpa awalan `ca-`). */
  export function barisAdsense(idPenerbit: string): string {
    return `google.com, ${idPenerbit.replace(/^ca-/, '')}, DIRECT, ${ID_OTORITAS_GOOGLE}`
  }

  const kunciBaris = (baris: string) => baris.replace(/\s+/g, '').toLowerCase()

  /**
   * Isi `/ads.txt`: baris AdSense dari ID penerbit (juga saat iklan belum dinyalakan, supaya AdSense bisa
   * memeriksa situs sebelum iklan tayang), lalu baris tambahan editor tanpa duplikat. `null` bila tidak ada
   * baris sama sekali: rute menjawab 404, yang menurut spesifikasi IAB berarti situs tidak mendeklarasikan
   * penjual (file kosong tidak sah).
   */
  export function isiAdsTxt(p: Pick<PengaturanIklan, 'penyedia' | 'idPenerbit' | 'adsTxtTambahan'> | null | undefined): string | null {
    const baris: string[] = []
    const id = p?.idPenerbit?.trim()
    if (p?.penyedia === 'adsense' && id && POLA_ID_PENERBIT.test(id)) baris.push(barisAdsense(id))
    const ada = new Set(baris.map(kunciBaris))
    for (const mentah of (p?.adsTxtTambahan ?? '').split(/\r?\n/)) {
      const b = mentah.trim()
      if (!b || ada.has(kunciBaris(b))) continue
      ada.add(kunciBaris(b))
      baris.push(b)
    }
    return baris.some((b) => !b.startsWith('#')) ? `${baris.join('\n')}\n` : null
  }
  ```

- [ ] **Langkah 4: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 486 tes (70 file); integrasi 142 tes (42 file); E2E 113 tes.

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/modules/iklan tests/unit/iklan-aturan.test.ts
  git commit -m "feat(iklan): aturan iklan sebagai fungsi murni: posisi dan ukuran tetap, syarat slot tampil, iklan tengah artikel setelah paragraf ke-N, validasi global iklan, dan isi ads.txt"
  ```

---

### Task 3: Aturan persetujuan cookie, Consent Mode v2, dan kode AdSense

**Files:**
- Create: `src/modules/iklan/persetujuan.ts`, `src/modules/iklan/adsense.ts`
- Test: `tests/unit/iklan-persetujuan.test.ts`

**Interfaces:**
- Consumes: `SlotSiap` (Task 2), `runInNewContext` (`node:vm`, hanya di tes).
- Produces:
  - `persetujuan.ts`: `NAMA_KUKI` (`persetujuan`), `VERSI_PERSETUJUAN` (1), `UMUR_PERSETUJUAN_HARI` (365), `PILIHAN_PERSETUJUAN` (`perlu`, `semua`), tipe `PilihanPersetujuan`, `KeadaanPersetujuan` (`belum`, `perlu`, `semua`), `Persetujuan`, `Sinyal`, `ATRIBUT_PERSETUJUAN` (`data-persetujuan`), `ATRIBUT_PANEL` (`data-panel-persetujuan`), `ATRIBUT_BUKA` (`data-buka-persetujuan`), `nilaiKuki`, `bacaPersetujuan(kuki, sekarang)`, `tulisKuki(pilihan, sekarang, https)`, `KUKI_IKLAN_SITUS` (`__gads`, `__gpi`, `__gpi_optout`, `__eoi`), `hapusKuki(nama)`, `sinyalPersetujuan(keadaan)`, `skripAwal()`.
  - `adsense.ts`: `ASAL_ADSENSE`, `urlSkrip(klien)`, `atributUnit(slot)`.

Pilihan pengunjung disimpan di cookie pihak pertama `persetujuan` berisi versi, pilihan, dan tanggal (`1.semua.2026-11-06`), berlaku 12 bulan, `SameSite=Lax`, dan `Secure` di HTTPS. Cookie ini sendiri termasuk "yang perlu" karena tanpa itu pilihan tidak bisa dihormati. Pilihan dengan versi lain, lebih tua dari 365 hari, atau rusak dianggap belum memilih, jadi banner tampil lagi; menaikkan `VERSI_PERSETUJUAN` (misalnya saat menambah alat analitik) meminta persetujuan ulang. UU PDP No. 27/2022 Pasal 20 ayat (2) huruf a meminta persetujuan eksplisit untuk tujuan yang disampaikan, Pasal 22 meminta persetujuan terekam, dan Pasal 9 serta Pasal 40 memberi hak menarik persetujuan dan mewajibkan pemrosesan berhenti; cookie bertanggal dan berversi adalah rekamannya, dan menarik persetujuan ditangani Task 6 dan Task 7.

Sinyal Google Consent Mode v2: sebelum memilih dan untuk "Hanya yang perlu" keempat sinyal `denied`; "Izinkan semua" membuka `ad_storage`, `ad_user_data`, dan `ad_personalization`, sedangkan `analytics_storage` tetap `denied` karena point. tidak memasang alat analitik (banner hanya meminta izin untuk iklan). `skripAwal()` adalah skrip sebaris di `<head>` (Task 6) yang berjalan sebelum `<body>` diurai: `gtag('consent', 'default', ...)` lebih dulu (dokumentasi Consent Mode: perintah `default` sebelum perintah lain), lalu `<html data-persetujuan="belum|perlu|semua">` dari cookie, lalu `update` bila pilihan tersimpan "Izinkan semua". Karena keputusan tampil atau tidaknya banner dan slot diambil sebelum paint pertama lewat CSS, halaman publik tetap ISR (server tidak membaca cookie) dan tidak ada pergeseran tata letak. Logika skrip ditulis sebagai teks (tanpa pustaka), jadi tes menjalankannya di `node:vm` dengan `document` dan `Date` tiruan dan memastikan hasilnya sama dengan `bacaPersetujuan` untuk versi, umur, dan nilai rusak.

`adsense.ts` memegang kode penyedia (Bantuan AdSense "kode unit iklan"): URL `adsbygoogle.js?client=` dan atribut `<ins class="adsbygoogle">` berukuran tetap di atribut `style` elemennya sendiri (dokumentasi AdSense menyebut ukuran pasti lewat CSS boleh, tetapi lewat stylesheet luar tidak didukung resmi), ditambah `data-adtest="on"` di mode uji. Hanya ada satu penyedia, jadi tidak ada antarmuka adapter (satu adapter berarti seam yang belum nyata); tes memotong permintaan ke domain Google di browser (Task 7).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/iklan-persetujuan.test.ts`

  ```ts
  import { runInNewContext } from 'node:vm'
  import { describe, expect, it } from 'vitest'

  import { atributUnit, urlSkrip } from '@/modules/iklan/adsense'
  import {
    bacaPersetujuan,
    hapusKuki,
    nilaiKuki,
    sinyalPersetujuan,
    skripAwal,
    tulisKuki,
    type Sinyal,
  } from '@/modules/iklan/persetujuan'

  const SEKARANG = new Date('2026-11-06T08:00:00.000Z')

  /** Menjalankan skrip awal di lingkungan tiruan: atribut `<html>` dan isi `dataLayer` setelahnya. */
  function jalankanSkripAwal(kuki: string, sekarang = SEKARANG) {
    const atribut: Record<string, string> = {}
    const window: { dataLayer?: ArrayLike<unknown>[] } = {}
    const document = { cookie: kuki, documentElement: { setAttribute: (nama: string, nilai: string) => (atribut[nama] = nilai) } }
    class Tanggal extends Date {
      static now() {
        return sekarang.getTime()
      }
    }
    runInNewContext(skripAwal(), { window, document, Date: Tanggal })
    return { atribut, dataLayer: (window.dataLayer ?? []).map((a) => Array.from(a)) }
  }

  const DITOLAK: Sinyal = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }
  const IKLAN_DIIZINKAN: Sinyal = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'denied' }

  describe('cookie persetujuan', () => {
    it('menyimpan versi, pilihan, dan tanggal; berlaku 12 bulan, Secure hanya di HTTPS', () => {
      expect(nilaiKuki('semua', SEKARANG)).toBe('1.semua.2026-11-06')
      expect(tulisKuki('perlu', SEKARANG, true)).toBe('persetujuan=1.perlu.2026-11-06; Path=/; Max-Age=31536000; SameSite=Lax; Secure')
      expect(tulisKuki('semua', SEKARANG, false)).toBe('persetujuan=1.semua.2026-11-06; Path=/; Max-Age=31536000; SameSite=Lax')
      expect(hapusKuki('__gads')).toBe('__gads=; Path=/; Max-Age=0; SameSite=Lax')
    })

    it('pilihan dibaca dari document.cookie; versi lama, kedaluwarsa, dan nilai rusak dianggap belum memilih', () => {
      expect(bacaPersetujuan('a=1; persetujuan=1.semua.2026-11-01; b=2', SEKARANG)).toEqual({ versi: 1, pilihan: 'semua', tanggal: '2026-11-01' })
      expect(bacaPersetujuan('persetujuan=1.perlu.2025-11-07', SEKARANG)?.pilihan).toBe('perlu')
      expect(bacaPersetujuan('persetujuan=1.perlu.2025-11-05', SEKARANG)).toBeNull()
      expect(bacaPersetujuan('persetujuan=0.semua.2026-11-01', SEKARANG)).toBeNull()
      expect(bacaPersetujuan('persetujuan=1.semuanya.2026-11-01', SEKARANG)).toBeNull()
      expect(bacaPersetujuan('xpersetujuan=1.semua.2026-11-01', SEKARANG)).toBeNull()
      expect(bacaPersetujuan('', SEKARANG)).toBeNull()
    })

    it('Consent Mode v2: semua sinyal ditolak sebelum memilih dan untuk Hanya yang perlu; Izinkan semua membuka sinyal iklan saja', () => {
      expect(sinyalPersetujuan('belum')).toEqual(DITOLAK)
      expect(sinyalPersetujuan('perlu')).toEqual(DITOLAK)
      expect(sinyalPersetujuan('semua')).toEqual(IKLAN_DIIZINKAN)
    })
  })

  describe('skrip awal di head', () => {
    it('consent default ditolak lebih dulu, lalu atribut html dari cookie; update hanya untuk Izinkan semua', () => {
      expect(jalankanSkripAwal('')).toEqual({ atribut: { 'data-persetujuan': 'belum' }, dataLayer: [['consent', 'default', DITOLAK]] })
      expect(jalankanSkripAwal('persetujuan=1.perlu.2026-11-01')).toEqual({ atribut: { 'data-persetujuan': 'perlu' }, dataLayer: [['consent', 'default', DITOLAK]] })
      expect(jalankanSkripAwal('x=1; persetujuan=1.semua.2026-11-01')).toEqual({
        atribut: { 'data-persetujuan': 'semua' },
        dataLayer: [
          ['consent', 'default', DITOLAK],
          ['consent', 'update', IKLAN_DIIZINKAN],
        ],
      })
    })

    it('aturan skrip sama dengan bacaPersetujuan untuk versi, umur, dan nilai rusak', () => {
      for (const kuki of ['persetujuan=1.semua.2025-11-07', 'persetujuan=1.semua.2025-11-05', 'persetujuan=1.perlu.2026-11-07', 'persetujuan=1.perlu.2026-11-09', 'persetujuan=2.semua.2026-11-01', 'persetujuan=1.semua.20261101']) {
        expect(jalankanSkripAwal(kuki).atribut['data-persetujuan'], kuki).toBe(bacaPersetujuan(kuki, SEKARANG)?.pilihan ?? 'belum')
      }
    })
  })

  describe('kode AdSense', () => {
    it('satu skrip adsbygoogle.js per ID penerbit dan elemen ins berukuran tetap; data-adtest hanya di mode uji', () => {
      expect(urlSkrip('ca-pub-0000000000000000')).toBe('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0000000000000000')
      const slot = { lebar: 300, tinggi: 250, klien: 'ca-pub-0000000000000000', unit: '1111111111', uji: false }
      expect(atributUnit(slot)).toEqual({
        class: 'adsbygoogle',
        style: 'display:inline-block;width:300px;height:250px',
        'data-ad-client': 'ca-pub-0000000000000000',
        'data-ad-slot': '1111111111',
      })
      expect(atributUnit({ ...slot, uji: true })['data-adtest']).toBe('on')
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/iklan-persetujuan.test.ts` dengan `Error: Cannot find package '@/modules/iklan/adsense'`.

- [ ] **Langkah 3: Aturan persetujuan dan kode AdSense**

  `src/modules/iklan/persetujuan.ts`

  ```ts
  /**
   * Aturan persetujuan cookie sebagai fungsi murni (spesifikasi §11, UU PDP No. 27/2022): bentuk cookie
   * pilihan, masa berlakunya, sinyal Google Consent Mode v2 per pilihan, dan skrip awal di `<head>`.
   * Aman dipakai di server dan browser.
   *
   * Pilihan dibaca di browser, bukan di server, supaya halaman publik tetap ISR (statis per path).
   */

  /** Cookie pihak pertama yang menyimpan pilihan pengunjung. Cookie ini sendiri termasuk "yang perlu". */
  export const NAMA_KUKI = 'persetujuan'

  /**
   * Versi teks persetujuan. Naikkan bila tujuan pemrosesan berubah (misalnya menambah analitik): pilihan
   * dengan versi lama tidak berlaku lagi dan banner tampil kembali.
   */
  export const VERSI_PERSETUJUAN = 1

  /** Pilihan berlaku 12 bulan, lalu pengunjung ditanya lagi. */
  export const UMUR_PERSETUJUAN_HARI = 365

  export const PILIHAN_PERSETUJUAN = ['perlu', 'semua'] as const
  export type PilihanPersetujuan = (typeof PILIHAN_PERSETUJUAN)[number]

  /** Keadaan di atribut `<html data-persetujuan>`: `belum` sampai pengunjung memilih. */
  export type KeadaanPersetujuan = PilihanPersetujuan | 'belum'

  export const ATRIBUT_PERSETUJUAN = 'data-persetujuan'

  /** Atribut `<html>` saat banner dibuka lagi lewat "Pengaturan cookie" (pilihan lama tetap berlaku). */
  export const ATRIBUT_PANEL = 'data-panel-persetujuan'

  /** Penanda tombol yang membuka banner lagi (tautan "Pengaturan cookie" di footer). */
  export const ATRIBUT_BUKA = 'data-buka-persetujuan'

  export type Persetujuan = { versi: number; pilihan: PilihanPersetujuan; tanggal: string }

  const SEHARI = 86_400_000

  /** Nilai cookie: versi, pilihan, dan tanggal (UTC), misalnya `1.semua.2026-11-06`. */
  export function nilaiKuki(pilihan: PilihanPersetujuan, sekarang: Date): string {
    return `${VERSI_PERSETUJUAN}.${pilihan}.${sekarang.toISOString().slice(0, 10)}`
  }

  /** Pilihan yang masih berlaku dari `document.cookie`, atau `null` (belum memilih, versi lama, kedaluwarsa, rusak). */
  export function bacaPersetujuan(kuki: string, sekarang: Date): Persetujuan | null {
    const cocok = new RegExp(`(?:^|;\\s*)${NAMA_KUKI}=(\\d+)\\.(perlu|semua)\\.(\\d{4}-\\d{2}-\\d{2})(?:;|$)`).exec(kuki)
    if (!cocok || Number(cocok[1]) !== VERSI_PERSETUJUAN) return null
    const umur = (sekarang.getTime() - Date.parse(`${cocok[3]}T00:00:00Z`)) / SEHARI
    if (!(umur >= -1 && umur <= UMUR_PERSETUJUAN_HARI)) return null
    return { versi: VERSI_PERSETUJUAN, pilihan: cocok[2] as PilihanPersetujuan, tanggal: cocok[3] }
  }

  /** String `document.cookie` untuk menyimpan pilihan: berlaku 12 bulan, `SameSite=Lax`, `Secure` di HTTPS. */
  export function tulisKuki(pilihan: PilihanPersetujuan, sekarang: Date, https: boolean): string {
    return `${NAMA_KUKI}=${nilaiKuki(pilihan, sekarang)}; Path=/; Max-Age=${UMUR_PERSETUJUAN_HARI * 86_400}; SameSite=Lax${https ? '; Secure' : ''}`
  }

  /**
   * Cookie yang ditulis skrip AdSense di domain situs dan dihapus saat pengunjung menarik persetujuan. Daftar
   * Google "Our advertising and measurement cookies" (AdSense, "Set from partner domain"): `__gads` dan
   * `__gpi` (iklan, 13 bulan), `__gpi_optout` (iklan), dan `__eoi` (keamanan, 6 bulan). Tanpa persetujuan
   * skrip AdSense tidak dimuat, jadi tidak ada yang membutuhkannya.
   */
  export const KUKI_IKLAN_SITUS = ['__gads', '__gpi', '__gpi_optout', '__eoi'] as const

  /** String `document.cookie` yang menghapus satu cookie di path `/`. */
  export function hapusKuki(nama: string): string {
    return `${nama}=; Path=/; Max-Age=0; SameSite=Lax`
  }

  export type JenisSinyal = 'ad_storage' | 'ad_user_data' | 'ad_personalization' | 'analytics_storage'
  export type Sinyal = Record<JenisSinyal, 'granted' | 'denied'>

  /**
   * Sinyal Google Consent Mode v2. Sebelum memilih dan untuk "Hanya yang perlu": semuanya `denied`.
   * "Izinkan semua": ketiga sinyal iklan `granted`; `analytics_storage` tetap `denied` karena point. tidak
   * memasang alat analitik (menambahkannya berarti teks banner dan `VERSI_PERSETUJUAN` ikut berubah).
   */
  export function sinyalPersetujuan(keadaan: KeadaanPersetujuan): Sinyal {
    const iklan = keadaan === 'semua' ? 'granted' : 'denied'
    return { ad_storage: iklan, ad_user_data: iklan, ad_personalization: iklan, analytics_storage: 'denied' }
  }

  /**
   * Skrip awal di `<head>`, berjalan sebelum `<body>` diurai dan sebelum skrip lain:
   * 1. Consent Mode v2 bawaan `denied` (`gtag('consent', 'default', ...)` lewat `dataLayer`), lalu `update`
   *    `granted` bila pilihan tersimpan "Izinkan semua". Skrip AdSense baru dimuat setelahnya.
   * 2. Atribut `<html data-persetujuan="belum|perlu|semua">` dari cookie, sehingga CSS menampilkan banner
   *    atau slot iklan sejak paint pertama (tanpa pergeseran tata letak) dan halaman tetap ISR.
   * Tanpa JavaScript atribut ini tidak ada: banner dan slot iklan tidak tampil, iklan tidak dimuat.
   * Aturannya sama dengan `bacaPersetujuan` (dijaga tes unit yang menjalankan keduanya).
   */
  export function skripAwal(): string {
    const bawaan = JSON.stringify(sinyalPersetujuan('belum'))
    const semua = JSON.stringify(sinyalPersetujuan('semua'))
    return [
      '(function(){',
      'var w=window,d=document;',
      'w.dataLayer=w.dataLayer||[];',
      'function gtag(){w.dataLayer.push(arguments)}',
      `gtag('consent','default',${bawaan});`,
      `var m=/(?:^|;\\s*)${NAMA_KUKI}=(\\d+)\\.(perlu|semua)\\.(\\d{4}-\\d{2}-\\d{2})(?:;|$)/.exec(d.cookie),k='belum';`,
      `if(m&&+m[1]===${VERSI_PERSETUJUAN}){var u=(Date.now()-Date.parse(m[3]+'T00:00:00Z'))/${SEHARI};if(u>=-1&&u<=${UMUR_PERSETUJUAN_HARI})k=m[2]}`,
      `d.documentElement.setAttribute('${ATRIBUT_PERSETUJUAN}',k);`,
      `if(k==='semua')gtag('consent','update',${semua});`,
      '})()',
    ].join('')
  }
  ```

  `src/modules/iklan/adsense.ts`

  ```ts
  import type { SlotSiap } from './tipe'

  /**
   * Kode iklan AdSense (Bantuan AdSense "Kode unit iklan display"): satu skrip `adsbygoogle.js?client=` per
   * halaman, lalu satu elemen `<ins class="adsbygoogle">` per unit yang diisi lewat `adsbygoogle.push({})`.
   * Ukuran tetap ditulis di atribut `style` elemen itu sendiri (bukan stylesheet luar), cara yang disebut
   * dokumentasi AdSense untuk unit berukuran pasti. Fungsi murni, dipakai `PemuatIklan` di browser.
   */

  export const ASAL_ADSENSE = 'https://pagead2.googlesyndication.com'

  /** URL skrip AdSense untuk ID penerbit ini. */
  export function urlSkrip(klien: string): string {
    return `${ASAL_ADSENSE}/pagead/js/adsbygoogle.js?client=${encodeURIComponent(klien)}`
  }

  /** Atribut elemen `<ins>` satu unit berukuran tetap; `data-adtest="on"` hanya di mode uji. */
  export function atributUnit(slot: Pick<SlotSiap, 'lebar' | 'tinggi' | 'klien' | 'unit' | 'uji'>): Record<string, string> {
    return {
      class: 'adsbygoogle',
      style: `display:inline-block;width:${slot.lebar}px;height:${slot.tinggi}px`,
      'data-ad-client': slot.klien,
      'data-ad-slot': slot.unit,
      ...(slot.uji ? { 'data-adtest': 'on' } : {}),
    }
  }
  ```

- [ ] **Langkah 4: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 492 tes (71 file); integrasi 142 tes (42 file); E2E 113 tes.

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/modules/iklan/persetujuan.ts src/modules/iklan/adsense.ts tests/unit/iklan-persetujuan.test.ts
  git commit -m "feat(iklan): aturan persetujuan cookie: cookie pilihan bertanggal dan berversi (12 bulan), sinyal Consent Mode v2 per pilihan, skrip awal di head yang menolak semua sinyal sebelum skrip iklan, dan kode unit AdSense berukuran tetap"
  ```

---

### Task 4: Global Iklan, tag cache `iklan`, dan admin

**Files:**
- Create: `src/globals/Iklan.ts`, `src/modules/iklan/data.ts`, `src/modules/iklan/cache.ts`, `src/modules/iklan/index.ts`, `src/modules/iklan/admin/PetunjukIklan.tsx`, `src/modules/iklan/admin/PratinjauAdsTxt.tsx`, `src/modules/iklan/admin/iklan.scss`, `tests/int/iklan.int.spec.ts`, `tests/e2e/iklan.spec.ts`
- Modify: `src/lib/tag.ts`, `src/hooks/revalidasiPublik.ts`, `src/payload.config.ts`, `src/payload-types.ts` (dibuat ulang), `src/app/(payload)/admin/importMap.js` (dibuat ulang), `tests/unit/tag.test.ts`, `tests/e2e/data.ts`, `tests/e2e/siapkan.ts`
- Test: `tests/unit/tag.test.ts`, `tests/int/iklan.int.spec.ts`, `tests/e2e/iklan.spec.ts`

**Interfaces:**
- Consumes: aturan dan tipe Task 2, `anyone`, `isAdmin` (`src/access`), `revalidasiGlobal`, `pakaiPemicuRevalidasi` (`src/hooks/revalidasiPublik.ts`), `useFormFields` (`@payloadcms/ui`), `pesanGalat`, `unik` (tes integrasi), `periksaAxe`, `ADMIN_E2E` (E2E).
- Produces:
  - Global `iklan` (grup Tampilan): `petunjuk` (ui), `aktif` (bawaan mati), `penyedia` (`adsense`), `idPenerbit`, `modeUji`, `slot` (array `idSlot`, `posisi`, `setelahParagraf` untuk `artikel-tengah`, `ukuran`, `unit`, `aktif`), `adsTxtTambahan`, `pratinjauAdsTxt` (ui). Dibaca siapa saja, diubah admin saja.
  - `TAG.iklan` (`iklan`) dan hook `revalidasiIklan`.
  - `data.ts`: `susunPengaturan(doc)`, `ambilIklan(payload)`; `cache.ts`: `muatIklan()` dan `muatAdsTxt()` (cache bertag `iklan`); `index.ts` mengekspor antarmuka modul.
  - E2E: `PENERBIT_E2E` (`ca-pub-0000000000000000`), `ADS_TXT_E2E` (`contoh-iklan.test, 12345, RESELLER`); `siapkan.ts` menyetel ulang global `iklan` setiap run (iklan masih mati di task ini).

Global `iklan` memenuhi spesifikasi §6 (penyedia, ID penerbit, slot, `ads.txt`). Semua isinya publik (ID penerbit tampil di kode iklan dan `/ads.txt`), jadi `read: anyone` seperti `beranda` dan `footer`. Penjelasan untuk editor ditulis komponen `PetunjukIklan` dengan warna teks utama tema, bukan `admin.description` (deskripsi bawaan Payload gagal kontras; lihat Task 10), dan `PratinjauAdsTxt` menampilkan isi `/ads.txt` dari isian yang sedang diubah, termasuk baris AdSense yang dibuat otomatis dari ID penerbit. Field baris slot bernama `idSlot` karena `id` di dalam array dipakai Payload sebagai kunci baris (probe). Validasi memakai fungsi Task 2: ID penerbit wajib saat iklan dinyalakan, ID slot dan unit berformat benar, satu slot aktif per posisi (kecuali beranda), dan baris `ads.txt` per baris dengan nomor barisnya.

Menyimpan global membuang tag `iklan`; layout, halaman berslot iklan, beranda, dan `/ads.txt` (task berikutnya) memakai `muatIklan` atau `muatAdsTxt` yang di-cache dengan tag itu. Global tidak punya hapus atau update massal dan tidak menulis tabel berkunci unik, jadi tidak ada uji operasi massal untuk task ini.

- [ ] **Langkah 1: Tulis tes yang gagal**

  ```diff
  diff --git a/tests/unit/tag.test.ts b/tests/unit/tag.test.ts
  index 1988b3a..3664c93 100644
  --- a/tests/unit/tag.test.ts
  +++ b/tests/unit/tag.test.ts
  @@ -14,6 +14,7 @@ describe('TAG', () => {
       expect([TAG.header, TAG.footer]).toEqual(['header', 'footer'])
       expect(TAG.koleksi('penulis')).toBe('penulis')
       expect(TAG.parameterTools).toBe('parameter-tools')
  +    expect(TAG.iklan).toBe('iklan')
     })
   })
   
  ```

  `tests/int/iklan.int.spec.ts`

  ```ts
  import type { Payload } from 'payload'
  import { afterAll, describe, expect, it } from 'vitest'

  import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'
  import { ambilIklan, isiAdsTxt, pilihSlot } from '@/modules/iklan'

  import { getTestPayload, pesanGalat, unik } from './helpers'

  /** ID penerbit tiruan yang jelas palsu. */
  const PENERBIT = 'ca-pub-0000000000000000'
  const BAWAAN = { aktif: false, idPenerbit: '', modeUji: false, slot: [], adsTxtTambahan: '' }

  async function pengguna(payload: Payload, peran: 'admin' | 'editor') {
    const buat = (p: 'admin' | 'editor') =>
      payload.create({ collection: 'pengguna', data: { email: `${unik(p)}@tes.local`, password: 'rahasia-123', nama: p, peran: p } })
    if (peran === 'editor') await buat('admin')
    const doc = await buat(peran)
    expect(doc.peran).toBe(peran)
    return doc
  }

  describe('global iklan', () => {
    afterAll(async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'iklan', data: BAWAAN })
    })

    it('bawaan aman: iklan mati dan penyedia AdSense; dibaca siapa saja, diubah admin saja', async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'iklan', data: BAWAAN })
      await expect(payload.findGlobal({ slug: 'iklan', overrideAccess: false })).resolves.toMatchObject({ aktif: false, penyedia: 'adsense', slot: [] })
      const editor = await pengguna(payload, 'editor')
      await expect(payload.updateGlobal({ slug: 'iklan', data: { modeUji: true }, user: editor, overrideAccess: false })).rejects.toThrow('Anda tidak diizinkan melakukan tindakan ini.')
      const admin = await pengguna(payload, 'admin')
      await expect(payload.updateGlobal({ slug: 'iklan', data: { modeUji: true }, user: admin, overrideAccess: false })).resolves.toMatchObject({ modeUji: true })
    })

    it('validasi: ID penerbit wajib saat iklan menyala, ID slot, unit, satu slot aktif per posisi, dan baris ads.txt', async () => {
      const payload = await getTestPayload()
      expect(await pesanGalat(payload.updateGlobal({ slug: 'iklan', data: { aktif: true, idPenerbit: '' } }))).toBe(
        'idPenerbit: Isi ID penerbit AdSense sebelum menyalakan iklan.',
      )
      const slot = (idSlot: string, posisi: 'artikel-akhir' | 'rubrik') => ({ idSlot, posisi, ukuran: 'persegi' as const, unit: '1111111111', aktif: true })
      expect(await pesanGalat(payload.updateGlobal({ slug: 'iklan', data: { slot: [slot('akhir', 'artikel-akhir'), slot('akhir-2', 'artikel-akhir')] } }))).toBe(
        'slot: Posisi "Artikel: setelah isi, sebelum sumber dan FAQ" sudah dipakai slot "akhir". Matikan salah satunya.',
      )
      expect(await pesanGalat(payload.updateGlobal({ slug: 'iklan', data: { slot: [{ ...slot('Slot Satu', 'rubrik'), unit: 'abc' }] } }))).toBe(
        'slot.0.idSlot: ID slot 2 sampai 40 karakter: huruf kecil, angka, dan tanda hubung, misalnya artikel-akhir. | slot.0.unit: Unit iklan berupa angka data-ad-slot dari kode unit iklan di AdSense.',
      )
      expect(await pesanGalat(payload.updateGlobal({ slug: 'iklan', data: { adsTxtTambahan: 'google.com, pub-1, LANGSUNG' } }))).toBe(
        'adsTxtTambahan: Baris 1: isian ketiga harus DIRECT atau RESELLER.',
      )
    })

    it('menyimpan global membuang tag iklan; slot dan ads.txt dibaca dari isian tersimpan', async () => {
      const payload = await getTestPayload()
      const tag: string[] = []
      const lama = pakaiPemicuRevalidasi((t) => tag.push(t))
      try {
        await payload.updateGlobal({
          slug: 'iklan',
          data: {
            aktif: true,
            idPenerbit: PENERBIT,
            slot: [
              { idSlot: 'tengah', posisi: 'artikel-tengah', setelahParagraf: 4, ukuran: 'persegi', unit: '1111111111', aktif: true },
              { idSlot: 'beranda-1', posisi: 'beranda', ukuran: 'banner', unit: '2222222222', aktif: true },
            ],
            adsTxtTambahan: 'contoh-iklan.test, 12345, RESELLER',
          },
        })
      } finally {
        pakaiPemicuRevalidasi(lama)
      }
      expect(tag).toEqual(['iklan'])
      const pengaturan = await ambilIklan(payload)
      expect(pilihSlot(pengaturan, 'artikel-tengah')).toMatchObject({ id: 'tengah', setelahParagraf: 4, lebar: 300, tinggi: 250, klien: PENERBIT })
      expect(pilihSlot(pengaturan, 'beranda', 'beranda-1')).toMatchObject({ lebar: 320, tinggi: 100 })
      expect(pilihSlot(pengaturan, 'artikel-akhir')).toBeNull()
      expect(isiAdsTxt(pengaturan)).toBe('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\ncontoh-iklan.test, 12345, RESELLER\n')
    })
  })
  ```

  `tests/e2e/iklan.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { periksaAxe } from './bantu'
  import { ADMIN_E2E, ADS_TXT_E2E, PENERBIT_E2E } from './data'

  test('admin global Iklan: petunjuk terbaca dan pratinjau ads.txt mengikuti isian sebelum disimpan', async ({ page }) => {
    await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
    await page.goto('/admin/globals/iklan')
    await expect(page.locator('.iklan-petunjuk')).toContainText('Iklan hanya dimuat untuk pengunjung yang memilih Izinkan semua di banner cookie.')
    const pratinjau = page.getByRole('region', { name: 'Isi /ads.txt setelah disimpan' }).locator('pre')
    const idPenerbit = page.getByLabel('ID penerbit AdSense (ca-pub-...)')
    await expect(idPenerbit).toHaveValue(PENERBIT_E2E)
    await expect(pratinjau).toContainText('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0')
    await expect(pratinjau).toContainText(ADS_TXT_E2E)

    await idPenerbit.fill('')
    await expect(pratinjau).not.toContainText('google.com')
    await page.getByLabel('Baris ads.txt tambahan').fill('')
    await expect(page.getByRole('region', { name: 'Isi /ads.txt setelah disimpan' })).toContainText('Belum ada baris, jadi /ads.txt menjawab 404.')
    await periksaAxe(page, '.iklan-petunjuk', '.iklan-adstxt')
  })
  ```

  ```diff
  diff --git a/tests/e2e/data.ts b/tests/e2e/data.ts
  index 22272fa..d9b7e1d 100644
  --- a/tests/e2e/data.ts
  +++ b/tests/e2e/data.ts
  @@ -61,6 +61,12 @@ export const HARI_CONTOH = Array.from({ length: 28 }, (_, i) => {
     return { tanggal, klik, impresi: klik * 150, ctr: 1 / 150, posisi: 8 - i / 10 }
   })
   
  +/** ID penerbit AdSense tiruan yang jelas palsu (global Iklan database E2E); tes tidak pernah memanggil Google. */
  +export const PENERBIT_E2E = 'ca-pub-0000000000000000'
  +
  +/** Baris ads.txt tambahan di global Iklan database E2E (domain `.test` tidak pernah ada). */
  +export const ADS_TXT_E2E = 'contoh-iklan.test, 12345, RESELLER'
  +
   /** Kunci IndexNow di pengaturan SEO database E2E, dilayani di `/{kunci}.txt`. */
   export const KUNCI_INDEXNOW = 'e2e-kunci-indexnow-2026'
   
  ```

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index 3f44fc6..6086a3b 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -7,7 +7,25 @@ import type { Halaman } from '@/payload-types'
   import { klienPalsu } from '@/modules/media/palsu'
   import { seed } from '@/seed/seed'
   
  -import { ADMIN_E2E, blok, gambar, h2, HARI_CONTOH, isi, JUDUL_PANDUAN, KLIK_CONTOH, KUNCI_INDEXNOW, p, SLUG, SLUG_HALAMAN, SLUG_SUB, SLUG_VIDEO, tautanKe } from './data'
  +import {
  +  ADMIN_E2E,
  +  ADS_TXT_E2E,
  +  blok,
  +  gambar,
  +  h2,
  +  HARI_CONTOH,
  +  isi,
  +  JUDUL_PANDUAN,
  +  KLIK_CONTOH,
  +  KUNCI_INDEXNOW,
  +  p,
  +  PENERBIT_E2E,
  +  SLUG,
  +  SLUG_HALAMAN,
  +  SLUG_SUB,
  +  SLUG_VIDEO,
  +  tautanKe,
  +} from './data'
   
   /**
    * Mengisi database E2E sebelum server dibangun dan dinyalakan (`webServer` di playwright.config.ts).
  @@ -301,6 +319,11 @@ const tekno = await payload.create({
   await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kunciIndexNow: KUNCI_INDEXNOW } } })
   // Asisten AI menyala dengan anggaran bawaan, apa pun yang diubah tes sebelumnya (E2E kedua memakai database yang sama).
   await payload.updateGlobal({ slug: 'asisten-ai', data: { aktif: true, anggaranBulanan: 10 } })
  +// Iklan dengan ID penerbit tiruan, apa pun yang diubah tes sebelumnya (E2E kedua memakai database yang sama).
  +await payload.updateGlobal({
  +  slug: 'iklan',
  +  data: { aktif: false, penyedia: 'adsense', idPenerbit: PENERBIT_E2E, modeUji: true, slot: [], adsTxtTambahan: ADS_TXT_E2E },
  +})
   await payload.updateGlobal({
     slug: 'newsletter',
     data: { aktif: true, penyedia: 'kit', urlForm: 'https://point.kit.com/intinya', judul: 'Intinya, tiap Senin.', deskripsi: 'Lima tulisan terbaik pekan ini, langsung ke email.' },
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/tag.test.ts` dengan `AssertionError: expected undefined to be 'iklan' // Object.is equality` dan di `tests/int/iklan.int.spec.ts` dengan `Error: Cannot find package '@/modules/iklan'`.

- [ ] **Langkah 3: Tag cache dan hook revalidasi**

  ```diff
  diff --git a/src/lib/tag.ts b/src/lib/tag.ts
  index 18e3afa..825527a 100644
  --- a/src/lib/tag.ts
  +++ b/src/lib/tag.ts
  @@ -11,6 +11,7 @@
    * - `redirect`: tabel redirect yang dibaca halaman saat path tidak cocok dengan dokumen.
    * - `parameter-tools`: angka aturan kalkulator yang dibaca halaman `/tools/{slug}`.
    * - `analitik`: klik Search Console per halaman ("Paling dicari pekan ini"), dibuang setiap sinkron harian.
  + * - `iklan`: global iklan (slot, banner persetujuan, `ads.txt`) yang dibaca layout dan halaman berslot iklan.
    */
   
   export const KOLEKSI_PUBLIK = ['artikel', 'pilar', 'subkategori', 'penulis', 'tools', 'video', 'halaman'] as const
  @@ -26,6 +27,7 @@ export const TAG = {
     redirect: 'redirect',
     parameterTools: 'parameter-tools',
     analitik: 'analitik',
  +  iklan: 'iklan',
     koleksi: (koleksi: KoleksiPublik) => koleksi,
     dokumen: (koleksi: KoleksiPublik, id: number | string) => `${koleksi}:${id}`,
     pilar: (slug: string) => `pilar:${slug}`,
  ```

  ```diff
  diff --git a/src/hooks/revalidasiPublik.ts b/src/hooks/revalidasiPublik.ts
  index a9d872a..68e93e9 100644
  --- a/src/hooks/revalidasiPublik.ts
  +++ b/src/hooks/revalidasiPublik.ts
  @@ -174,3 +174,6 @@ export const revalidasiNewsletter = revalidasiGlobal([TAG.beranda])
   /** Header dan footer dirender layout di semua halaman publik. */
   export const revalidasiHeader = revalidasiGlobal([TAG.header])
   export const revalidasiFooter = revalidasiGlobal([TAG.footer])
  +
  +/** Global iklan dibaca layout (banner persetujuan), halaman berslot iklan, beranda, dan `/ads.txt`. */
  +export const revalidasiIklan = revalidasiGlobal([TAG.iklan])
  ```

- [ ] **Langkah 4: Global Iklan, data, dan cache**

  `src/globals/Iklan.ts`

  ```ts
  import type { GlobalConfig } from 'payload'

  import { anyone, isAdmin } from '@/access'
  import { revalidasiIklan } from '@/hooks/revalidasiPublik'
  import { PARAGRAF_IKLAN, validasiAdsTxt, validasiDaftarSlot, validasiIdPenerbit, validasiIdSlot, validasiUnit } from '@/modules/iklan/aturan'
  import { LABEL_POSISI_IKLAN, LABEL_UKURAN_IKLAN, POSISI_IKLAN, UKURAN_IKLAN } from '@/modules/iklan/tipe'

  /**
   * Pengaturan iklan (spesifikasi §6 `iklan`, §11): saklar, penyedia, ID penerbit, mode uji, slot (ID,
   * posisi, ukuran, unit, aktif), dan baris `ads.txt` tambahan. Penjelasan untuk editor ditulis komponen
   * `PetunjukIklan`, bukan `admin.description` (warna deskripsi bawaan Payload gagal kontras).
   * Semua isinya publik (ID penerbit tampil di kode iklan dan `ads.txt`), jadi boleh dibaca siapa saja.
   */
  export const Iklan: GlobalConfig = {
    slug: 'iklan',
    label: 'Iklan',
    admin: { group: 'Tampilan' },
    access: { read: anyone, update: isAdmin },
    hooks: { afterChange: [revalidasiIklan] },
    fields: [
      { name: 'petunjuk', type: 'ui', admin: { components: { Field: '@/modules/iklan/admin/PetunjukIklan#PetunjukIklan' } } },
      { name: 'aktif', type: 'checkbox', label: 'Tampilkan iklan', defaultValue: false },
      {
        name: 'penyedia',
        type: 'select',
        label: 'Penyedia iklan',
        required: true,
        defaultValue: 'adsense',
        options: [{ label: 'Google AdSense', value: 'adsense' }],
      },
      {
        name: 'idPenerbit',
        type: 'text',
        label: 'ID penerbit AdSense (ca-pub-...)',
        validate: (nilai: unknown, { siblingData }: { siblingData: Partial<{ aktif: boolean }> }) => validasiIdPenerbit(nilai, siblingData?.aktif),
      },
      { name: 'modeUji', type: 'checkbox', label: 'Mode uji: minta iklan uji (data-adtest), bukan tayangan sungguhan', defaultValue: false },
      {
        name: 'slot',
        type: 'array',
        label: 'Slot iklan',
        labels: { singular: 'Slot', plural: 'Slot' },
        validate: (nilai: unknown) => validasiDaftarSlot(nilai),
        fields: [
          // Bukan `id`: nama itu dipakai Payload sebagai kunci baris array.
          { name: 'idSlot', type: 'text', label: 'ID slot', required: true, validate: (nilai: unknown) => validasiIdSlot(nilai) },
          {
            name: 'posisi',
            type: 'select',
            label: 'Posisi',
            required: true,
            options: POSISI_IKLAN.map((value) => ({ value, label: LABEL_POSISI_IKLAN[value] })),
          },
          {
            name: 'setelahParagraf',
            type: 'number',
            label: 'Setelah paragraf ke',
            min: PARAGRAF_IKLAN.min,
            max: PARAGRAF_IKLAN.maks,
            defaultValue: PARAGRAF_IKLAN.bawaan,
            admin: { condition: (_, slot) => slot?.posisi === 'artikel-tengah' },
          },
          {
            name: 'ukuran',
            type: 'select',
            label: 'Ukuran',
            required: true,
            defaultValue: 'persegi',
            options: UKURAN_IKLAN.map((value) => ({ value, label: LABEL_UKURAN_IKLAN[value] })),
          },
          { name: 'unit', type: 'text', label: 'Unit iklan (angka data-ad-slot)', required: true, validate: (nilai: unknown) => validasiUnit(nilai) },
          { name: 'aktif', type: 'checkbox', label: 'Aktif', defaultValue: true },
        ],
      },
      {
        name: 'adsTxtTambahan',
        type: 'textarea',
        label: 'Baris ads.txt tambahan',
        validate: (nilai: unknown) => validasiAdsTxt(nilai),
      },
      { name: 'pratinjauAdsTxt', type: 'ui', admin: { components: { Field: '@/modules/iklan/admin/PratinjauAdsTxt#PratinjauAdsTxt' } } },
    ],
  }
  ```

  `src/modules/iklan/data.ts`

  ```ts
  import type { Payload } from 'payload'

  import type { Iklan } from '@/payload-types'

  import type { PengaturanIklan } from './tipe'

  /** Dokumen global `iklan` menjadi `PengaturanIklan` (isian kosong dirapikan). */
  export function susunPengaturan(doc: Partial<Iklan>): PengaturanIklan {
    return {
      aktif: doc.aktif === true,
      penyedia: 'adsense',
      idPenerbit: doc.idPenerbit?.trim() || null,
      modeUji: doc.modeUji === true,
      slot: (doc.slot ?? []).map((s) => ({
        id: s.idSlot.trim(),
        posisi: s.posisi,
        ukuran: s.ukuran,
        unit: s.unit.trim(),
        setelahParagraf: s.setelahParagraf ?? null,
        aktif: s.aktif !== false,
      })),
      adsTxtTambahan: doc.adsTxtTambahan ?? null,
    }
  }

  /** Pengaturan iklan dari database (tanpa cache; halaman memakai `muatIklan`). */
  export async function ambilIklan(payload: Payload): Promise<PengaturanIklan> {
    return susunPengaturan(await payload.findGlobal({ slug: 'iklan', depth: 0 }))
  }
  ```

  `src/modules/iklan/cache.ts`

  ```ts
  import config from '@payload-config'
  import { unstable_cache } from 'next/cache'
  import { getPayload } from 'payload'

  import { TAG } from '@/lib/tag'

  import { isiAdsTxt } from './aturan'
  import { ambilIklan } from './data'

  /** Jaring pengaman bila revalidasi terlewat, sama dengan data halaman publik lain. */
  const SEJAM = 3600

  /**
   * Pengaturan iklan untuk layout (banner persetujuan, pemuat iklan) dan halaman berslot iklan. Tag `iklan`
   * dibuang hook global `iklan`, jadi semua halaman yang memakainya dirender ulang saat pengaturan berubah.
   */
  export const muatIklan = unstable_cache(async () => ambilIklan(await getPayload({ config })), ['iklan', 'pengaturan'], {
    tags: [TAG.iklan],
    revalidate: SEJAM,
  })

  /** Isi `/ads.txt`, atau `null` bila tidak ada baris (rute menjawab 404). */
  export const muatAdsTxt = unstable_cache(async () => isiAdsTxt(await ambilIklan(await getPayload({ config }))), ['iklan', 'ads-txt'], {
    tags: [TAG.iklan],
    revalidate: SEJAM,
  })
  ```

  `src/modules/iklan/index.ts`

  ```ts
  /**
   * Modul iklan dan persetujuan cookie (spesifikasi §5 dan §11): antarmuka kecil, isi dalam.
   *
   * - `muatIklan()` pengaturan dari global `iklan` (cache bertag `iklan`); `ambilIklan(payload)` tanpa cache.
   * - `pilihSlot(pengaturan, posisi, id?)` satu-satunya aturan apakah slot tampil; `sisipkanIklanTengah`
   *   menaruh iklan tengah artikel setelah paragraf ke-N; `isiAdsTxt` dan `muatAdsTxt()` untuk `/ads.txt`.
   * - Persetujuan dibaca di browser (`persetujuan.ts`): skrip awal di `<head>` menolak semua sinyal Consent
   *   Mode v2 dan menandai `<html data-persetujuan>`; halaman publik tetap ISR.
   * - Kode penyedia (AdSense) hanya di `adsense.ts`; tes memotong permintaan ke domainnya.
   */
  export { muatAdsTxt, muatIklan } from './cache'
  export { ambilIklan, susunPengaturan } from './data'
  export { iklanSiap, isiAdsTxt, pilihSlot, sisipkanIklanTengah } from './aturan'
  export type { PengaturanIklan, PosisiIklan, SlotSiap } from './tipe'
  ```

  ```diff
  diff --git a/src/payload.config.ts b/src/payload.config.ts
  index 69e71fa..1c98e90 100644
  --- a/src/payload.config.ts
  +++ b/src/payload.config.ts
  @@ -31,6 +31,7 @@ import { AsistenAi } from './globals/AsistenAi'
   import { Beranda } from './globals/Beranda'
   import { Footer } from './globals/Footer'
   import { Header } from './globals/Header'
  +import { Iklan } from './globals/Iklan'
   import { Newsletter } from './globals/Newsletter'
   import { PengaturanSEO } from './globals/PengaturanSEO'
   import { BAHASA_ADMIN } from './lib/bahasa-admin'
  @@ -88,7 +89,7 @@ export default buildConfig({
       LogAi,
       PemakaianAi,
     ],
  -  globals: [Header, Footer, Beranda, PengaturanSEO, Newsletter, AsistenAi],
  +  globals: [Header, Footer, Beranda, PengaturanSEO, Newsletter, AsistenAi, Iklan],
     // `GET /api/jobs/run`: cron Vercel setiap 10 menit (vercel.json), jadwal terbit, Mesin Indexing, dan Pantau SEO.
     endpoints: [endpointJalankanJob],
     editor: lexicalEditor(),
  ```

- [ ] **Langkah 5: Petunjuk dan pratinjau ads.txt di admin**

  `src/modules/iklan/admin/PetunjukIklan.tsx`

  ```tsx
  import './iklan.scss'

  /**
   * Penjelasan di atas global Iklan (field `ui`). Ditulis di komponen, bukan `admin.description`, supaya
   * warnanya memakai teks utama tema (deskripsi bawaan Payload gagal kontras).
   */
  export function PetunjukIklan() {
    return (
      <div className="iklan-petunjuk">
        <p>
          Iklan hanya dimuat untuk pengunjung yang memilih <strong>Izinkan semua</strong> di banner cookie. Pengunjung yang memilih{' '}
          <strong>Hanya yang perlu</strong> tidak melihat iklan.
        </p>
        <ul>
          <li>Nyalakan Tampilkan iklan setelah situs disetujui AdSense dan halaman Kebijakan Privasi terbit.</li>
          <li>Buat unit iklan display berukuran tetap di AdSense dengan ukuran yang sama dengan slot, lalu salin angka data-ad-slot ke Unit iklan.</li>
          <li>Satu slot aktif per posisi. Slot beranda dipasang lewat blok Slot iklan di global Beranda dengan ID slot yang sama.</li>
          <li>Iklan tidak pernah tampil di kotak Intinya, di atas judul, atau di dalam kalkulator.</li>
        </ul>
      </div>
    )
  }
  ```

  `src/modules/iklan/admin/PratinjauAdsTxt.tsx`

  ```tsx
  'use client'

  import { useFormFields } from '@payloadcms/ui'

  import { isiAdsTxt } from '../aturan'

  import './iklan.scss'

  /** Pratinjau `/ads.txt` dari isian form yang sedang diubah (baris AdSense dibuat otomatis dari ID penerbit). */
  export function PratinjauAdsTxt() {
    const isi = useFormFields(([fields]) =>
      isiAdsTxt({
        penyedia: 'adsense',
        idPenerbit: typeof fields.idPenerbit?.value === 'string' ? fields.idPenerbit.value : null,
        adsTxtTambahan: typeof fields.adsTxtTambahan?.value === 'string' ? fields.adsTxtTambahan.value : null,
      }),
    )
    return (
      <section className="iklan-adstxt" aria-labelledby="iklan-adstxt-judul">
        <p id="iklan-adstxt-judul" className="iklan-adstxt__judul">
          Isi /ads.txt setelah disimpan
        </p>
        {isi ? <pre>{isi}</pre> : <p>Belum ada baris, jadi /ads.txt menjawab 404. Isi ID penerbit AdSense supaya baris AdSense dibuat otomatis.</p>}
      </section>
    )
  }
  ```

  `src/modules/iklan/admin/iklan.scss`

  ```scss
  // Komponen global Iklan. Variabel tema Payload supaya ikut mode terang dan gelap; teks memakai warna teks
  // utama (kontras penuh).
  .iklan-petunjuk,
  .iklan-adstxt {
    margin: 0 0 calc(var(--base) * 1.25);
    padding: calc(var(--base) * 0.75);
    border: 1px solid var(--theme-elevation-150);
    border-radius: 14px;
    color: var(--theme-text);
    font-size: 14px;
    line-height: 1.5;

    p {
      margin: 0 0 calc(var(--base) * 0.5);
    }

    ul {
      margin: 0;
      padding-left: calc(var(--base) * 1.1);
    }

    pre {
      margin: 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-size: 13px;
    }
  }

  .iklan-adstxt__judul {
    font-weight: 700;
  }
  ```

  Buat ulang tipe dan import map, lalu dorong kolom baru ke database dev:

  ```bash
  npm run generate:types
  npm run generate:importmap
  npm run seed
  ```

- [ ] **Langkah 6: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 492 tes (71 file); integrasi 145 tes (43 file); E2E 114 tes. Baca log integrasi utuh: tidak ada pertanyaan DATA LOSS (skema hanya bertambah tabel `iklan` dan `iklan_slot`).

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/globals/Iklan.ts src/modules/iklan "src/app/(payload)/admin/importMap.js" src/hooks/revalidasiPublik.ts src/lib/tag.ts src/payload-types.ts src/payload.config.ts tests/unit/tag.test.ts tests/int/iklan.int.spec.ts tests/e2e/iklan.spec.ts tests/e2e/data.ts tests/e2e/siapkan.ts
  git commit -m "feat(iklan): global Iklan (saklar, AdSense, ID penerbit, mode uji, slot dengan posisi dan ukuran tetap, baris ads.txt tambahan) dengan petunjuk dan pratinjau ads.txt di admin, tag cache iklan, dan muatIklan"
  ```

---

### Task 5: Rute `/ads.txt` dari CMS

**Files:**
- Create: `src/app/(frontend)/ads.txt/route.ts`, `src/modules/iklan/rute.ts`
- Modify: `tests/e2e/iklan.spec.ts`
- Test: `tests/unit/iklan-rute.test.ts`, `tests/e2e/iklan.spec.ts`

**Interfaces:**
- Consumes: `muatAdsTxt` (Task 4), `respons` (`seo/rute.ts`, Rencana 3), `ADS_TXT_E2E`, `ADMIN_E2E` (E2E).
- Produces: `responsAdsTxt(isi)` dan rute `GET /ads.txt` (spesifikasi §7 dan §11).

`/ads.txt` dirangkai sama dengan `/robots.txt` (Rencana 3): data di cache bertag (`muatAdsTxt`, tag `iklan`) dan rute `force-dynamic` supaya build tidak merender rute ini dari database dev; header `Cache-Control` sama dengan rute teknis lain. Isinya baris AdSense otomatis dari ID penerbit (juga sebelum iklan dinyalakan, supaya AdSense bisa memeriksa situs lewat `ads.txt`) dan baris tambahan editor, sebagai `text/plain; charset=utf-8` (spesifikasi IAB ads.txt: jenis konten lain diabaikan). Tanpa baris sama sekali rute menjawab 404, bukan teks kosong: spesifikasi IAB ads.txt 1.1 §3.1 membaca 404 sebagai "tidak ada deklarasi", sedangkan file tanpa baris data tidak sah (§3.2.1), dan AdSense menampilkan status "Not found" yang jelas untuk pemilik. Rewrite `/{kunci}.txt` IndexNow (8 sampai 128 karakter) tidak menangkap `/ads.txt`.

E2E menyimpan global lewat REST lalu memastikan `/ads.txt` berubah (cache bertag dibuang hook global), dan mengembalikannya di `finally`; `siapkan.ts` juga menyetel ulang global ini setiap run.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/iklan-rute.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { responsAdsTxt } from '@/modules/iklan/rute'

  describe('/ads.txt', () => {
    it('isi sebagai teks polos dengan cache rute teknis; tanpa baris menjawab 404', async () => {
      const ada = responsAdsTxt('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n')
      expect(ada.status).toBe(200)
      expect(ada.headers.get('content-type')).toBe('text/plain; charset=utf-8')
      expect(ada.headers.get('cache-control')).toBe('public, max-age=0, s-maxage=300, stale-while-revalidate=600')
      expect(await ada.text()).toBe('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n')

      const kosong = responsAdsTxt(null)
      expect(kosong.status).toBe(404)
      expect(kosong.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    })
  })
  ```

  ```diff
  diff --git a/tests/e2e/iklan.spec.ts b/tests/e2e/iklan.spec.ts
  index ac1892c..2581180 100644
  --- a/tests/e2e/iklan.spec.ts
  +++ b/tests/e2e/iklan.spec.ts
  @@ -19,3 +19,18 @@ test('admin global Iklan: petunjuk terbaca dan pratinjau ads.txt mengikuti isian
     await expect(page.getByRole('region', { name: 'Isi /ads.txt setelah disimpan' })).toContainText('Belum ada baris, jadi /ads.txt menjawab 404.')
     await periksaAxe(page, '.iklan-petunjuk', '.iklan-adstxt')
   })
  +
  +test('/ads.txt dari global Iklan: baris AdSense dan baris tambahan sebagai teks polos, berubah setelah global disimpan', async ({ request }) => {
  +  const jawaban = await request.get('/ads.txt')
  +  expect(jawaban.status()).toBe(200)
  +  expect(jawaban.headers()['content-type']).toBe('text/plain; charset=utf-8')
  +  expect(await jawaban.text()).toBe(`google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n${ADS_TXT_E2E}\n`)
  +
  +  await request.post('/api/pengguna/login', { data: ADMIN_E2E })
  +  try {
  +    expect((await request.post('/api/globals/iklan', { data: { adsTxtTambahan: `${ADS_TXT_E2E}\ncontact=redaksi@point.lat` } })).status()).toBe(200)
  +    expect(await (await request.get('/ads.txt')).text()).toContain('\ncontact=redaksi@point.lat\n')
  +  } finally {
  +    await request.post('/api/globals/iklan', { data: { adsTxtTambahan: ADS_TXT_E2E } })
  +  }
  +})
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/iklan-rute.test.ts` dengan `Error: Cannot find package '@/modules/iklan/rute'`.

- [ ] **Langkah 3: Jawaban dan rute ads.txt**

  `src/modules/iklan/rute.ts`

  ```ts
  import { respons } from '@/modules/seo/rute'

  /**
   * Jawaban `/ads.txt`: isi teks polos (`text/plain`, syarat spesifikasi IAB ads.txt) dengan header cache
   * rute teknis lain, atau 404 bila tidak ada baris. Menurut spesifikasi IAB, 404 berarti situs tidak
   * mendeklarasikan penjual; file kosong tidak sah.
   */
  export function responsAdsTxt(isi: string | null): Response {
    if (!isi) return new Response('Tidak ditemukan.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
    return respons(isi, 'teks')
  }
  ```

  `src/app/(frontend)/ads.txt/route.ts`

  ```ts
  import { muatAdsTxt } from '@/modules/iklan'
  import { responsAdsTxt } from '@/modules/iklan/rute'

  /** ads.txt (spesifikasi §7 dan §11): baris AdSense dari ID penerbit di global Iklan dan baris tambahan editor. */
  export const dynamic = 'force-dynamic'

  export async function GET() {
    return responsAdsTxt(await muatAdsTxt())
  }
  ```

- [ ] **Langkah 4: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 493 tes (72 file); integrasi 145 tes (43 file); E2E 115 tes.

- [ ] **Langkah 5: Commit**

  ```bash
  git add "src/app/(frontend)/ads.txt/route.ts" src/modules/iklan/rute.ts tests/unit/iklan-rute.test.ts tests/e2e/iklan.spec.ts
  git commit -m "feat(iklan): rute /ads.txt dari global Iklan (baris AdSense otomatis dari ID penerbit dan baris tambahan editor) sebagai teks polos bertag cache iklan, 404 bila tidak ada baris"
  ```

---

### Task 6: Banner persetujuan cookie dan "Pengaturan cookie" di footer

**Files:**
- Create: `src/modules/iklan/peramban.ts`, `src/components/iklan/PanelPersetujuan.tsx`, `src/components/iklan/Persetujuan.module.css`, `src/components/iklan/SkripPersetujuan.tsx`, `tests/unit/iklan-komponen.test.ts`
- Modify: `src/app/(frontend)/layout.tsx`, `src/components/tata-letak/Footer.tsx`, `src/components/tata-letak/Footer.module.css`, `tests/e2e/siapkan.ts`, `tests/e2e/iklan.spec.ts`
- Test: `tests/unit/iklan-komponen.test.ts`, `tests/e2e/iklan.spec.ts`

**Interfaces:**
- Consumes: `persetujuan.ts` (Task 3), `iklanSiap`, `muatIklan` (Task 2 dan 4), `pathFor` (`src/lib/paths.ts`), `Tautan`, token `src/styles/tokens.css`, `cegatCloudinary`, `periksaAxe`, `periksaTanpaGeserHorizontal`, `UKURAN_LAYAR`, `SLUG` (E2E).
- Produces:
  - `peramban.ts`: `PERISTIWA_PERSETUJUAN` (peristiwa `persetujuan` di `window`) dan `simpanPilihan(pilihan)` (cookie, `gtag('consent', 'update', ...)`, atribut `<html>`, peristiwa; menarik persetujuan menghapus cookie AdSense di domain situs (`KUKI_IKLAN_SITUS`) dan memuat ulang halaman). Task 7 mendengarkan peristiwanya.
  - `SkripPersetujuan` (skrip sebaris di `<head>`), `PanelPersetujuan` (banner, klien), `Footer` dengan prop `persetujuan` (tombol "Pengaturan cookie").
  - Layout: banner, skrip awal, dan tombol footer hanya bila `iklanSiap(muatIklan())`.
  - E2E: global `iklan` menyala di database E2E (`siapkan.ts`), jadi semua spec berjalan dengan banner.

Banner (spesifikasi §11, UU PDP No. 27/2022) dirender di server untuk semua pengunjung dan tersembunyi lewat CSS sampai skrip awal Task 3 menandai `<html data-persetujuan="belum">`; pengunjung yang sudah memilih tidak pernah melihatnya berkedip, dan halaman tetap ISR. Tanpa JavaScript banner dan tombol footer tidak tampil, karena tanpa JavaScript iklan juga tidak pernah dimuat. `suppressHydrationWarning` di `<html>` karena skrip awal menulis atributnya sebelum React hidrasi. Banner hanya ada saat iklan dinyalakan dengan ID penerbit yang valid: tanpa iklan, situs hanya memakai yang perlu dan tidak perlu meminta persetujuan.

Tata letak dan akses:
- **Di dalam alur halaman, di atas header, setelah skip link**, bukan melayang: tidak menutupi isi di 375 px atau lebar mana pun, dan pembaca layar serta pengguna keyboard mencapainya tepat setelah "Langsung ke isi" (skip link tetap fokus pertama). Saat pengunjung memilih, banner hilang dan isi naik; pergeseran itu terjadi tepat setelah klik, jadi tidak dihitung CLS (`hadRecentInput`), dan saat halaman dimuat tidak ada pergeseran sama sekali.
- **`section` bernama "Cookie dan iklan"** (`aria-labelledby` ke paragraf judul, bukan heading, supaya H1 halaman tetap heading pertama), penjelasan tujuan (cookie yang perlu, AdSense dan iklan yang disesuaikan, akibat Hanya yang perlu, masa simpan 12 bulan, cara mengubah), dan tautan "Baca Kebijakan Privasi" (`/kebijakan-privasi`, halaman draf dari seed yang ditulis pemilik). Teks ini memenuhi informasi tujuan dan jenis data UU PDP Pasal 21 secara ringkas; rinciannya di Kebijakan Privasi.
- **Dua tombol setara dan sejajar**: "Hanya yang perlu" dan "Izinkan semua", sama lebar, warna, dan tinggi (paling sedikit 44 px), dua kolom bahkan di 375 px; mulai 1024 px masing-masing 11rem (probe: kolom `auto` membuat tombol selebar teksnya masing-masing, "Hanya yang perlu" lebih lebar). "Hanya yang perlu" didahulukan dalam urutan tab. Tes E2E membandingkan posisi dan lebar keduanya di 375, 768, dan 1440 px.
- **Mengubah pilihan nanti**: tombol "Pengaturan cookie" di footer (di samping hak cipta, di luar navigasi "Tentang point." supaya jumlah tautannya tetap). Klik atau Enter membuka banner lagi (`data-panel-persetujuan`), fokus pindah ke banner (pembaca layar membacakan namanya), banner menyebut "Pilihanmu sekarang: ...", Escape menutup tanpa mengubah pilihan, dan fokus kembali ke tombol footer setelah memilih atau menutup. Penarikan persetujuan (dari Izinkan semua ke Hanya yang perlu) menghapus cookie yang ditulis AdSense di domain situs (`__gads`, `__gpi`, `__gpi_optout`, `__eoi`) dan memuat ulang halaman supaya skrip iklan yang sudah berjalan berhenti (UU PDP Pasal 9 dan Pasal 40).
- Warna dari token (`--permukaan`, `--teks`, `--tombol`, `--tombol-teks`), cincin fokus global situs, animasi tekan hanya `transform` dan mati saat reduced motion.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/iklan-komponen.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it, vi } from 'vitest'

  import { PanelPersetujuan } from '@/components/iklan/PanelPersetujuan'
  import { SkripPersetujuan } from '@/components/iklan/SkripPersetujuan'
  import { Footer } from '@/components/tata-letak/Footer'
  import { skripAwal } from '@/modules/iklan/persetujuan'

  vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

  const footer = { tautan: [], sosial: [], whatsapp: null, hakCipta: '© 2026 point.lat' }

  describe('banner persetujuan cookie', () => {
    it('region bernama, penjelasan tujuan, tautan Kebijakan Privasi, dan dua tombol setara berurutan', () => {
      const html = renderToStaticMarkup(h(PanelPersetujuan, { kebijakan: '/kebijakan-privasi' }))
      expect(html).toMatch(/^<section tabindex="-1" aria-labelledby="persetujuan-judul" class="[^"]+">/)
      expect(html).toContain('<p id="persetujuan-judul" class="')
      expect(html).toContain('>Cookie dan iklan</p>')
      expect(html).toContain('Google AdSense memakai cookie untuk menampilkan iklan')
      expect(html).toContain('Dengan Hanya yang perlu, iklan tidak dimuat.')
      expect(html).toMatch(/<a href="\/kebijakan-privasi">Baca Kebijakan Privasi<\/a>/)
      expect([...html.matchAll(/<button type="button" class="([^"]+)">([^<]+)<\/button>/g)].map((m) => [m[1], m[2]])).toEqual([
        [expect.any(String), 'Hanya yang perlu'],
        [expect.any(String), 'Izinkan semua'],
      ])
      expect(new Set([...html.matchAll(/<button type="button" class="([^"]+)">/g)].map((m) => m[1])).size).toBe(1)
    })

    it('skrip awal sebaris di head, tanpa berkas terpisah', () => {
      expect(renderToStaticMarkup(h(SkripPersetujuan))).toBe(`<script>${skripAwal()}</script>`)
    })

    it('footer memuat tombol Pengaturan cookie hanya bila banner aktif', () => {
      expect(renderToStaticMarkup(h(Footer, { data: footer, persetujuan: true }))).toMatch(
        /<button type="button" class="[^"]+" data-buka-persetujuan="">Pengaturan cookie<\/button>/,
      )
      expect(renderToStaticMarkup(h(Footer, { data: footer }))).not.toContain('Pengaturan cookie')
    })
  })
  ```

  ```diff
  diff --git a/tests/e2e/iklan.spec.ts b/tests/e2e/iklan.spec.ts
  index 2581180..4ba2f1f 100644
  --- a/tests/e2e/iklan.spec.ts
  +++ b/tests/e2e/iklan.spec.ts
  @@ -1,7 +1,22 @@
  -import { expect, test } from '@playwright/test'
  +import { expect, test, type BrowserContext, type Page } from '@playwright/test'
   
  -import { periksaAxe } from './bantu'
  -import { ADMIN_E2E, ADS_TXT_E2E, PENERBIT_E2E } from './data'
  +import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  +import { ADMIN_E2E, ADS_TXT_E2E, PENERBIT_E2E, SLUG, UKURAN_LAYAR } from './data'
  +
  +const DITOLAK = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }
  +const IKLAN_DIIZINKAN = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'denied' }
  +
  +/** Pilihan tersimpan seolah dari kunjungan sebelumnya (cookie pihak pertama berversi dan bertanggal). */
  +async function sudahMemilih(konteks: BrowserContext, pilihan: 'perlu' | 'semua') {
  +  await konteks.addCookies([{ name: 'persetujuan', value: `1.${pilihan}.${new Date().toISOString().slice(0, 10)}`, domain: 'localhost', path: '/' }])
  +}
  +
  +/** Perintah `gtag()` di `dataLayer` (objek `arguments`) sebagai array. */
  +const dataLayer = (page: Page) => page.evaluate(() => ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? []).map((a) => Array.from(a)))
  +
  +test.beforeEach(async ({ page }) => {
  +  await cegatCloudinary(page)
  +})
   
   test('admin global Iklan: petunjuk terbaca dan pratinjau ads.txt mengikuti isian sebelum disimpan', async ({ page }) => {
     await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  @@ -34,3 +49,94 @@ test('/ads.txt dari global Iklan: baris AdSense dan baris tambahan sebagai teks
       await request.post('/api/globals/iklan', { data: { adsTxtTambahan: ADS_TXT_E2E } })
     }
   })
  +
  +test('banner persetujuan tampil sebelum memilih di atas header, dipakai dengan keyboard, dan pilihan tersimpan setelah muat ulang', async ({ page }) => {
  +  await page.setViewportSize({ width: 375, height: 812 })
  +  await page.goto(`/${SLUG.panduan}`)
  +  const banner = page.getByRole('region', { name: 'Cookie dan iklan' })
  +  await expect(banner).toBeVisible()
  +  await expect(page.locator('html')).toHaveAttribute('data-persetujuan', 'belum')
  +  expect(await dataLayer(page)).toEqual([['consent', 'default', DITOLAK]])
  +  expect((await banner.boundingBox())!.y + (await banner.boundingBox())!.height).toBeLessThanOrEqual((await page.getByRole('banner').boundingBox())!.y)
  +  await expect(banner.getByRole('link', { name: 'Baca Kebijakan Privasi' })).toHaveAttribute('href', '/kebijakan-privasi')
  +  const [perlu, semua] = [banner.getByRole('button', { name: 'Hanya yang perlu' }), banner.getByRole('button', { name: 'Izinkan semua' })]
  +  const [kotakPerlu, kotakSemua] = [(await perlu.boundingBox())!, (await semua.boundingBox())!]
  +  expect(Math.round(kotakPerlu.y)).toBe(Math.round(kotakSemua.y))
  +  expect(Math.round(kotakPerlu.width)).toBe(Math.round(kotakSemua.width))
  +  expect(kotakPerlu.height).toBeGreaterThanOrEqual(44)
  +  await expect(perlu).toHaveCSS('background-color', await semua.evaluate((el) => getComputedStyle(el).backgroundColor))
  +
  +  await page.keyboard.press('Tab')
  +  await expect(page.getByRole('link', { name: 'Langsung ke isi' })).toBeFocused()
  +  await page.keyboard.press('Tab')
  +  await expect(banner.getByRole('link', { name: 'Baca Kebijakan Privasi' })).toBeFocused()
  +  await page.keyboard.press('Tab')
  +  await expect(perlu).toBeFocused()
  +  await page.keyboard.press('Tab')
  +  await expect(semua).toBeFocused()
  +  await page.keyboard.press('Enter')
  +  await expect(banner).toBeHidden()
  +  await expect(page.locator('html')).toHaveAttribute('data-persetujuan', 'semua')
  +  expect((await page.context().cookies()).find((k) => k.name === 'persetujuan')?.value).toMatch(/^1\.semua\.\d{4}-\d{2}-\d{2}$/)
  +  expect(await dataLayer(page)).toEqual([
  +    ['consent', 'default', DITOLAK],
  +    ['consent', 'update', IKLAN_DIIZINKAN],
  +  ])
  +
  +  await page.reload()
  +  await expect(page.locator('html')).toHaveAttribute('data-persetujuan', 'semua')
  +  await expect(banner).toBeHidden()
  +  expect(await dataLayer(page)).toEqual([
  +    ['consent', 'default', DITOLAK],
  +    ['consent', 'update', IKLAN_DIIZINKAN],
  +  ])
  +})
  +
  +test('Pengaturan cookie di footer membuka banner lagi: fokus pindah, pilihan sekarang disebut, Escape menutup, dan pilihan baru tersimpan', async ({ page }) => {
  +  await sudahMemilih(page.context(), 'perlu')
  +  await page.goto('/tentang')
  +  const banner = page.getByRole('region', { name: 'Cookie dan iklan' })
  +  await expect(banner).toBeHidden()
  +  const pengaturan = page.getByRole('contentinfo').getByRole('button', { name: 'Pengaturan cookie' })
  +  await pengaturan.focus()
  +  await page.keyboard.press('Enter')
  +  await expect(banner).toBeVisible()
  +  await expect(banner).toBeFocused()
  +  await expect(banner).toContainText('Pilihanmu sekarang: Hanya yang perlu.')
  +  await page.keyboard.press('Escape')
  +  await expect(banner).toBeHidden()
  +  await expect(pengaturan).toBeFocused()
  +  await expect(page.locator('html')).toHaveAttribute('data-persetujuan', 'perlu')
  +
  +  await pengaturan.click()
  +  await banner.getByRole('button', { name: 'Izinkan semua' }).click()
  +  await expect(banner).toBeHidden()
  +  await expect(pengaturan).toBeFocused()
  +  await page.reload()
  +  await expect(page.locator('html')).toHaveAttribute('data-persetujuan', 'semua')
  +})
  +
  +test('tanpa JavaScript banner dan tombol Pengaturan cookie tidak tampil (tanpa JavaScript iklan juga tidak dimuat)', async ({ browser }) => {
  +  const konteks = await browser.newContext({ javaScriptEnabled: false })
  +  const page = await konteks.newPage()
  +  await cegatCloudinary(page)
  +  await page.goto('/')
  +  await expect(page.getByRole('region', { name: 'Cookie dan iklan' })).toBeHidden()
  +  await expect(page.getByRole('button', { name: 'Pengaturan cookie' })).toBeHidden()
  +  await konteks.close()
  +})
  +
  +for (const { lebar, tinggi } of UKURAN_LAYAR) {
  +  test(`banner persetujuan ${lebar}px lolos axe, tanpa geser horizontal, tidak menutupi isi, dan kedua pilihan sejajar dan sama lebar`, async ({ page }) => {
  +    await page.setViewportSize({ width: lebar, height: tinggi })
  +    await page.goto('/')
  +    const banner = page.getByRole('region', { name: 'Cookie dan iklan' })
  +    await expect(banner).toBeVisible()
  +    await expect(banner).toHaveCSS('position', 'static')
  +    const perlu = (await banner.getByRole('button', { name: 'Hanya yang perlu' }).boundingBox())!
  +    const semua = (await banner.getByRole('button', { name: 'Izinkan semua' }).boundingBox())!
  +    expect([Math.round(perlu.y), Math.round(perlu.width)]).toEqual([Math.round(semua.y), Math.round(semua.width)])
  +    await periksaTanpaGeserHorizontal(page)
  +    await periksaAxe(page)
  +  })
  +}
  ```

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index 6086a3b..d00c1bb 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -319,10 +319,12 @@ const tekno = await payload.create({
   await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kunciIndexNow: KUNCI_INDEXNOW } } })
   // Asisten AI menyala dengan anggaran bawaan, apa pun yang diubah tes sebelumnya (E2E kedua memakai database yang sama).
   await payload.updateGlobal({ slug: 'asisten-ai', data: { aktif: true, anggaranBulanan: 10 } })
  -// Iklan dengan ID penerbit tiruan, apa pun yang diubah tes sebelumnya (E2E kedua memakai database yang sama).
  +// Iklan menyala dengan ID penerbit tiruan, apa pun yang diubah tes sebelumnya (E2E kedua memakai database yang
  +// sama). Semua spec berjalan dengan banner persetujuan; skrip AdSense hanya dimuat setelah Izinkan semua, dan
  +// tes yang memilihnya mencegat domain Google, jadi tidak ada permintaan jaringan.
   await payload.updateGlobal({
     slug: 'iklan',
  -  data: { aktif: false, penyedia: 'adsense', idPenerbit: PENERBIT_E2E, modeUji: true, slot: [], adsTxtTambahan: ADS_TXT_E2E },
  +  data: { aktif: true, penyedia: 'adsense', idPenerbit: PENERBIT_E2E, modeUji: true, slot: [], adsTxtTambahan: ADS_TXT_E2E },
   })
   await payload.updateGlobal({
     slug: 'newsletter',
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/iklan-komponen.test.ts` dengan `Error: Cannot find package '@/components/iklan/PanelPersetujuan'`.

- [ ] **Langkah 3: Penyimpan pilihan di browser**

  `src/modules/iklan/peramban.ts`

  ```ts
  import { ATRIBUT_PANEL, ATRIBUT_PERSETUJUAN, hapusKuki, KUKI_IKLAN_SITUS, sinyalPersetujuan, tulisKuki, type PilihanPersetujuan } from './persetujuan'

  /**
   * Bagian persetujuan yang berjalan di browser: menyimpan pilihan, mengirim sinyal Consent Mode, dan memberi
   * tahu pemuat iklan. Hanya dipanggil komponen klien setelah pengunjung menekan tombol.
   */

  /** Peristiwa di `window` setelah pengunjung memilih; `PemuatIklan` mendengarkannya. */
  export const PERISTIWA_PERSETUJUAN = 'persetujuan'

  /** `gtag()` standar: perintah masuk `dataLayer` sebagai objek `arguments` (bentuk yang dibaca tag Google). */
  function gtag(..._perintah: unknown[]): void {
    const w = window as unknown as { dataLayer?: unknown[] }
    w.dataLayer = w.dataLayer ?? []
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer.push(arguments)
  }

  /**
   * Menyimpan pilihan: cookie pihak pertama (12 bulan), `gtag('consent', 'update', ...)`, dan atribut
   * `<html data-persetujuan>` (CSS menyembunyikan banner dan menampilkan atau menyembunyikan slot iklan).
   * Menarik persetujuan (dari Izinkan semua ke Hanya yang perlu) menghapus cookie iklan di domain situs lalu
   * memuat ulang halaman, supaya skrip iklan yang sudah berjalan berhenti (UU PDP Pasal 40).
   */
  export function simpanPilihan(pilihan: PilihanPersetujuan, sekarang = new Date()): void {
    const html = document.documentElement
    const sebelumnya = html.getAttribute(ATRIBUT_PERSETUJUAN)
    document.cookie = tulisKuki(pilihan, sekarang, location.protocol === 'https:')
    gtag('consent', 'update', sinyalPersetujuan(pilihan))
    html.setAttribute(ATRIBUT_PERSETUJUAN, pilihan)
    html.removeAttribute(ATRIBUT_PANEL)
    if (sebelumnya === 'semua' && pilihan === 'perlu') {
      for (const nama of KUKI_IKLAN_SITUS) {
        document.cookie = hapusKuki(nama)
        document.cookie = `${hapusKuki(nama)}; Domain=${location.hostname}`
      }
      location.reload()
      return
    }
    window.dispatchEvent(new Event(PERISTIWA_PERSETUJUAN))
  }
  ```

- [ ] **Langkah 4: Banner, skrip awal, dan tombol footer**

  `src/components/iklan/PanelPersetujuan.tsx`

  ```tsx
  'use client'

  import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

  import { Tautan } from '@/components/dasar/Tautan'
  import { simpanPilihan } from '@/modules/iklan/peramban'
  import { ATRIBUT_BUKA, ATRIBUT_PANEL, ATRIBUT_PERSETUJUAN, type PilihanPersetujuan } from '@/modules/iklan/persetujuan'

  import gaya from './Persetujuan.module.css'

  const LABEL: Record<PilihanPersetujuan, string> = { perlu: 'Hanya yang perlu', semua: 'Izinkan semua' }

  /**
   * Banner persetujuan cookie (spesifikasi §11, UU PDP No. 27/2022) di atas header, dalam alur halaman
   * (tidak menutupi isi). Tampil atau tersembunyi lewat CSS dari atribut `<html>` yang ditulis skrip awal,
   * jadi markup sama untuk semua pengunjung (halaman tetap ISR) dan tidak ada pergeseran tata letak saat
   * halaman dimuat. Dua pilihan setara; tombol "Pengaturan cookie" di footer membukanya lagi, dengan fokus
   * pindah ke banner dan kembali ke tombol itu setelah memilih atau menekan Escape.
   */
  export function PanelPersetujuan({ kebijakan }: { kebijakan: string }) {
    const panel = useRef<HTMLElement>(null)
    const pembuka = useRef<HTMLElement | null>(null)
    const [sekarang, setSekarang] = useState<PilihanPersetujuan | null>(null)

    useEffect(() => {
      const buka = (e: MouseEvent) => {
        const tombol = e.target instanceof Element ? e.target.closest<HTMLElement>(`[${ATRIBUT_BUKA}]`) : null
        if (!tombol) return
        pembuka.current = tombol
        const keadaan = document.documentElement.getAttribute(ATRIBUT_PERSETUJUAN)
        setSekarang(keadaan === 'perlu' || keadaan === 'semua' ? keadaan : null)
        document.documentElement.setAttribute(ATRIBUT_PANEL, '')
        panel.current?.focus()
      }
      document.addEventListener('click', buka)
      return () => document.removeEventListener('click', buka)
    }, [])

    const kembali = () => {
      setSekarang(null)
      pembuka.current?.focus()
      pembuka.current = null
    }

    const pilih = (pilihan: PilihanPersetujuan) => {
      simpanPilihan(pilihan)
      kembali()
    }

    const tutup = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !document.documentElement.hasAttribute(ATRIBUT_PANEL)) return
      document.documentElement.removeAttribute(ATRIBUT_PANEL)
      kembali()
    }

    return (
      <section ref={panel} tabIndex={-1} aria-labelledby="persetujuan-judul" className={gaya.panel} onKeyDown={tutup}>
        <div className={`kontainer ${gaya.isi}`}>
          <div className={gaya.teks}>
            <p id="persetujuan-judul" className={gaya.judul}>
              Cookie dan iklan
            </p>
            <p>
              point. memakai cookie yang perlu supaya situs berjalan, termasuk untuk mengingat pilihanmu. Bila kamu pilih Izinkan semua,
              Google AdSense memakai cookie untuk menampilkan iklan, termasuk iklan yang disesuaikan dengan minatmu. Dengan Hanya yang
              perlu, iklan tidak dimuat.
            </p>
            <p>
              Pilihanmu disimpan 12 bulan dan bisa kamu ubah kapan saja lewat Pengaturan cookie di bagian bawah halaman.{' '}
              <Tautan href={kebijakan}>Baca Kebijakan Privasi</Tautan>
            </p>
            {sekarang && <p className={gaya.sekarang}>Pilihanmu sekarang: {LABEL[sekarang]}.</p>}
          </div>
          <div className={gaya.pilihan}>
            <button type="button" className={gaya.tombol} onClick={() => pilih('perlu')}>
              {LABEL.perlu}
            </button>
            <button type="button" className={gaya.tombol} onClick={() => pilih('semua')}>
              {LABEL.semua}
            </button>
          </div>
        </div>
      </section>
    )
  }
  ```

  `src/components/iklan/Persetujuan.module.css`

  ```css
  /*
   * Banner persetujuan cookie (spesifikasi §11). Tersembunyi sampai skrip awal di <head> menandai
   * `<html data-persetujuan="belum">` (belum memilih) atau banner dibuka lagi (`data-panel-persetujuan`).
   * Tanpa JavaScript tidak tampil, karena tanpa JavaScript iklan juga tidak dimuat. Di dalam alur halaman,
   * di atas header: tidak menutupi isi di layar mana pun.
   */
  .panel {
    display: none;
    border-bottom: var(--garis-tebal) solid var(--garis);
    background: var(--permukaan);
  }

  :global(html[data-persetujuan='belum']) .panel,
  :global(html[data-panel-persetujuan]) .panel {
    display: block;
  }

  .panel:focus-visible {
    outline-offset: calc(var(--fokus-tebal) * -2);
  }

  .isi {
    display: grid;
    gap: var(--ruang-4);
    padding-block: var(--ruang-5);
    font-size: var(--teks-kecil);
    line-height: 1.5;
  }

  .teks {
    display: grid;
    gap: var(--ruang-2);
    max-width: 72ch;
  }

  .judul {
    font-size: var(--teks-isi);
    font-weight: 800;
  }

  .teks a {
    font-weight: 700;
  }

  .sekarang {
    font-weight: 700;
  }

  /* Dua pilihan sejajar dan setara: lebar, warna, dan urutan tab sama bobotnya. */
  .pilihan {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--ruang-3);
  }

  .tombol {
    min-height: var(--sentuh-min);
    padding: var(--ruang-2) var(--ruang-4);
    border: 0;
    border-radius: var(--radius-kontrol);
    background: var(--tombol);
    color: var(--tombol-teks);
    font-weight: 700;
    line-height: 1.25;
    cursor: pointer;
    transition: transform var(--durasi-cepat) var(--kurva);
  }

  .tombol:hover {
    text-decoration: underline;
  }

  .tombol:active {
    transform: scale(0.98);
  }

  @media (min-width: 64rem) {
    .isi {
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      column-gap: var(--ruang-10);
    }

    /* Lebar tetap yang sama untuk kedua tombol: kolom `auto` membuat tombol selebar teksnya masing-masing. */
    .pilihan {
      grid-template-columns: repeat(2, 11rem);
    }
  }
  ```

  `src/components/iklan/SkripPersetujuan.tsx`

  ```tsx
  import { skripAwal } from '@/modules/iklan/persetujuan'

  /**
   * Skrip awal persetujuan di `<head>` (spesifikasi §11): Consent Mode v2 bawaan ditolak sebelum skrip iklan
   * apa pun, dan atribut `<html data-persetujuan>` dari cookie sebelum `<body>` digambar. Skrip sebaris kecil
   * tanpa berkas terpisah, jadi berjalan sebelum paint pertama.
   */
  export function SkripPersetujuan() {
    return <script dangerouslySetInnerHTML={{ __html: skripAwal() }} />
  }
  ```

  ```diff
  diff --git a/src/components/tata-letak/Footer.tsx b/src/components/tata-letak/Footer.tsx
  index 038d98e..1b259bb 100644
  --- a/src/components/tata-letak/Footer.tsx
  +++ b/src/components/tata-letak/Footer.tsx
  @@ -1,10 +1,15 @@
   import { Logo } from '@/components/dasar/Logo'
   import { Tautan } from '@/components/dasar/Tautan'
  +import { ATRIBUT_BUKA } from '@/modules/iklan/persetujuan'
   import type { DataFooter } from '@/modules/konten/tipe'
   
   import gaya from './Footer.module.css'
   
  -export function Footer({ data }: { data: DataFooter }) {
  +/**
  + * `persetujuan`: banner persetujuan cookie aktif (iklan dinyalakan), jadi footer memuat tombol "Pengaturan
  + * cookie" yang membukanya lagi. Tombol itu tampil hanya bila JavaScript berjalan (CSS dari atribut `<html>`).
  + */
  +export function Footer({ data, persetujuan = false }: { data: DataFooter; persetujuan?: boolean }) {
     const sosial = data.whatsapp ? [...data.sosial, { label: 'Saluran WhatsApp', href: data.whatsapp }] : data.sosial
     return (
       <footer className={gaya.footer}>
  @@ -33,7 +38,14 @@ export function Footer({ data }: { data: DataFooter }) {
               ))}
             </ul>
           )}
  -        <p className={gaya.hakCipta}>{data.hakCipta}</p>
  +        <div className={gaya.bawah}>
  +          <p className={gaya.hakCipta}>{data.hakCipta}</p>
  +          {persetujuan && (
  +            <button type="button" className={gaya.pengaturan} {...{ [ATRIBUT_BUKA]: '' }}>
  +              Pengaturan cookie
  +            </button>
  +          )}
  +        </div>
         </div>
       </footer>
     )
  ```

  ```diff
  diff --git a/src/components/tata-letak/Footer.module.css b/src/components/tata-letak/Footer.module.css
  index 2ffcdfb..2070207 100644
  --- a/src/components/tata-letak/Footer.module.css
  +++ b/src/components/tata-letak/Footer.module.css
  @@ -38,10 +38,37 @@
     text-decoration: underline;
   }
   
  +.bawah {
  +  display: flex;
  +  flex-wrap: wrap;
  +  align-items: center;
  +  gap: 0 var(--ruang-5);
  +}
  +
   .hakCipta {
     color: var(--teks-sekunder);
   }
   
  +/* Membuka lagi banner persetujuan cookie; hanya bila JavaScript berjalan (skrip awal menulis atribut ini). */
  +.pengaturan {
  +  display: none;
  +  align-items: center;
  +  min-height: var(--sentuh-min);
  +  padding: 0;
  +  border: 0;
  +  background: none;
  +  color: inherit;
  +  font: inherit;
  +  text-decoration: underline;
  +  text-decoration-thickness: var(--garis-tipis);
  +  text-underline-offset: 0.18em;
  +  cursor: pointer;
  +}
  +
  +:global(html[data-persetujuan]) .pengaturan {
  +  display: inline-flex;
  +}
  +
   @media (min-width: 64rem) {
     .isi {
       grid-template-columns: auto 1fr auto;
  @@ -53,7 +80,7 @@
       justify-self: center;
     }
   
  -  .hakCipta {
  +  .bawah {
       grid-column: 1 / -1;
     }
   }
  ```

  ```diff
  diff --git a/src/app/(frontend)/layout.tsx b/src/app/(frontend)/layout.tsx
  index ac15759..24c34f0 100644
  --- a/src/app/(frontend)/layout.tsx
  +++ b/src/app/(frontend)/layout.tsx
  @@ -4,9 +4,13 @@ import React from 'react'
   import '@/styles/tokens.css'
   import '@/styles/dasar.css'
   
  +import { PanelPersetujuan } from '@/components/iklan/PanelPersetujuan'
  +import { SkripPersetujuan } from '@/components/iklan/SkripPersetujuan'
   import { PemicuMasuk } from '@/components/motion/PemicuMasuk'
   import { Footer } from '@/components/tata-letak/Footer'
   import { Header } from '@/components/tata-letak/Header'
  +import { pathFor } from '@/lib/paths'
  +import { iklanSiap, muatIklan } from '@/modules/iklan'
   import { muatFooter, muatHeader } from '@/modules/konten'
   
   import { archivo } from './font'
  @@ -16,17 +20,29 @@ export const metadata: Metadata = {
     description: 'Intinya dulu.',
   }
   
  +/**
  + * Banner persetujuan cookie hanya bila iklan dinyalakan dengan ID penerbit yang valid: tanpa iklan, situs
  + * hanya memakai yang perlu. Pilihan pengunjung dibaca skrip awal di browser, jadi halaman tetap ISR;
  + * `suppressHydrationWarning` karena skrip itu menulis atribut `<html>` sebelum React hidrasi.
  + */
   export default async function RootLayout({ children }: { children: React.ReactNode }) {
  -  const [header, footer] = await Promise.all([muatHeader(), muatFooter()])
  +  const [header, footer, iklan] = await Promise.all([muatHeader(), muatFooter(), muatIklan()])
  +  const persetujuan = iklanSiap(iklan)
     return (
  -    <html lang="id" className={archivo.variable}>
  +    <html lang="id" className={archivo.variable} suppressHydrationWarning>
  +      {persetujuan && (
  +        <head>
  +          <SkripPersetujuan />
  +        </head>
  +      )}
         <body>
           <a className="lewati" href="#isi">
             Langsung ke isi
           </a>
  +        {persetujuan && <PanelPersetujuan kebijakan={pathFor({ jenis: 'halaman', slug: 'kebijakan-privasi' })} />}
           <Header data={header} />
           <main id="isi">{children}</main>
  -        <Footer data={footer} />
  +        <Footer data={footer} persetujuan={persetujuan} />
           <PemicuMasuk />
         </body>
       </html>
  ```

- [ ] **Langkah 5: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 496 tes (73 file); integrasi 145 tes (43 file); E2E 121 tes. Spec lain tetap lulus dengan banner di atas header (skip link tetap fokus pertama, jarak antarbagian beranda tidak berubah, axe semua halaman tetap bersih).

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/modules/iklan/peramban.ts src/components/iklan "src/app/(frontend)/layout.tsx" src/components/tata-letak/Footer.tsx src/components/tata-letak/Footer.module.css tests/unit/iklan-komponen.test.ts tests/e2e/iklan.spec.ts tests/e2e/siapkan.ts
  git commit -m "feat(iklan): banner persetujuan cookie di atas header (Hanya yang perlu dan Izinkan semua setara, tautan Kebijakan Privasi), skrip awal Consent Mode di head, dan Pengaturan cookie di footer untuk mengubah atau menarik pilihan"
  ```

---

### Task 7: SlotIklan, pemuat iklan, iklan di artikel, dan anggaran JS dan CLS

**Files:**
- Create: `src/components/iklan/SlotIklan.tsx`, `src/components/iklan/SlotIklan.module.css`, `src/components/iklan/PemuatIklan.tsx`
- Modify: `src/components/artikel/HalamanArtikel.tsx`, `src/components/isi/IsiArtikel.tsx`, `src/components/isi/Isi.module.css`, `src/app/(frontend)/[...jalur]/page.tsx`, `src/app/(frontend)/layout.tsx`, `tests/e2e/bantu.ts`, `tests/e2e/siapkan.ts`, `tests/e2e/iklan.spec.ts`, `tests/e2e/motion.spec.ts`, `tests/unit/iklan-komponen.test.ts`
- Test: `tests/unit/iklan-komponen.test.ts`, `tests/e2e/iklan.spec.ts`, `tests/e2e/motion.spec.ts`

**Interfaces:**
- Consumes: `pilihSlot`, `sisipkanIklanTengah`, `NODE_IKLAN` (Task 2), `atributUnit`, `urlSkrip`, `ATRIBUT_PERSETUJUAN` (Task 3), `muatIklan` (Task 4), `PERISTIWA_PERSETUJUAN` (Task 6), `usePathname`, `IntersectionObserver`.
- Produces:
  - `SlotIklan({ slot, className? })` (server): wadah berlabel "Iklan" dengan kotak berukuran tetap dan data unit (`data-kotak-iklan`, `data-klien`, `data-unit`, `data-lebar`, `data-tinggi`, `data-uji`); `null` tanpa slot. Task 8 memakainya di rubrik, tools, dan beranda.
  - `PemuatIklan()` (klien, sekali di layout).
  - `HalamanArtikel` menerima `iklan?: PengaturanIklan | null` (opsional, jadi tes komponen lama tetap jalan); `IsiArtikel` merender node `slotIklan`.
  - E2E: `cegatIklan(page)` di `bantu.ts` (skrip AdSense tiruan, catatan permintaan), slot `artikel-tengah` dan `artikel-akhir` di database E2E; anggaran JS tata letak di `motion.spec.ts`.

`SlotIklan` adalah server component: kotak dengan `width` dan `height` dari ukuran tetap slot dipesan di HTML, jadi unit yang terisi belakangan tidak menggeser isi (GPT "Minimize layout shift": ruang dipesan dengan CSS, bukan JavaScript). Wadah tersembunyi (`display: none`) kecuali `<html data-persetujuan="semua">`, jadi sebelum memilih dan untuk "Hanya yang perlu" slot tidak menempati ruang dan tidak pernah diminta; karena atribut itu ditulis skrip awal sebelum paint pertama, pengunjung yang kembali dengan "Izinkan semua" melihat ruang iklan sejak awal (CLS 0), dan munculnya slot tepat setelah klik "Izinkan semua" tidak dihitung CLS (`hadRecentInput`). Bila AdSense tidak mengisi unit, kotak tetap berukuran sama dengan latar `--permukaan` dan label "Iklan" di atasnya: tidak diciutkan, karena menciutkan menggeser isi di bawahnya (Bantuan AdSense: unit hanya diciutkan bila tidak menyebabkan reflow). Label "Iklan" padanan "Advertisements", label yang diizinkan kebijakan penempatan AdSense; tanpa judul yang menyesatkan. Slot yang lebih lebar dari layar (di bawah 375 px) disembunyikan lewat media query, jadi iklan tidak terpotong dan unit tersembunyi tidak diminta.

`PemuatIklan` hanya berjalan setelah hidrasi (halaman interaktif) dan hanya bila `<html data-persetujuan="semua">`: kotak diamati `IntersectionObserver` dengan jarak 200 px; saat hampir terlihat, skrip `adsbygoogle.js?client=` ditambahkan sekali ke `<head>`, lalu satu `<ins class="adsbygoogle">` dibuat di kotak itu dan `adsbygoogle.push({})` dipanggil. `<ins>` dibuat saat dibutuhkan (bukan dirender server) karena `push({})` mengisi unit kosong pertama di dokumen; dengan cara ini urutan isi selalu sama dengan urutan kotak yang terlihat. Pemuat diulang setiap pindah halaman (`usePathname`) dan setelah peristiwa `persetujuan`. Consent Mode sudah diatur skrip awal (bawaan ditolak, lalu `update` saat Izinkan semua) sebelum skrip iklan dimuat; tes membuktikannya lewat isi `dataLayer` yang dicatat skrip tiruan saat dimuat.

Iklan tengah artikel memakai node `slotIklan` yang disisipkan `sisipkanIklanTengah` setelah paragraf ke-N dan dirender `IsiArtikel` di antara blok tingkat atas, dengan jarak 32 px di atas dan bawah (lebih lebar dari jarak antarparagraf). Iklan akhir di kolom isi, setelah isi dan sebelum catatan, sumber, dan FAQ (jarak dari `gap` kisi yang sama). Tidak ada slot di kotak Intinya, di kepala artikel (di atas H1), atau di kalkulator.

Anggaran (spesifikasi §12): `byteJs` di `motion.spec.ts` hanya menghitung skrip dari situs sendiri (skrip penyedia iklan tidak dihitung). Probe: Turbopack menggabungkan banner persetujuan, pemuat iklan, animasi masuk kartu, dan penanda menu aktif dalam satu chunk tata letak yang dimuat setiap halaman, jadi mematikan iklan tidak mengubah JS halaman; tes mengukur chunk itu (dicari dari isinya) di bawah 8 KiB dan, bersama JS kalkulator, di bawah 25 KB. Hasil probe: chunk tata letak 6,1 KiB, JS kalkulator 13,2 KiB, total halaman artikel 140,5 KiB. CLS diukur `PerformanceObserver` (`layout-shift`, tanpa `hadRecentInput`) di halaman artikel 375 px sebelum memilih, setelah Izinkan semua dengan kedua unit terisi, dan setelah muat ulang dengan pilihan tersimpan: 0 di ketiganya.

E2E memakai `cegatIklan(page)`: permintaan ke domain iklan Google lain ditolak dan dicatat, `adsbygoogle.js` dijawab skrip tiruan yang mencatat jumlah muat, isi `dataLayer` saat dimuat, menulis `__gads` dan `__gpi`, dan mengisi setiap unit dengan kotak hijau. Rute yang lebih spesifik didaftarkan terakhir (Playwright menjalankan rute yang cocok mulai dari yang terakhir didaftarkan). `beforeEach` di `iklan.spec.ts` selalu memanggilnya, jadi tidak ada tes yang memanggil Google.

- [ ] **Langkah 1: Tulis tes yang gagal**

  ```diff
  diff --git a/tests/unit/iklan-komponen.test.ts b/tests/unit/iklan-komponen.test.ts
  index 4160fe0..fe9a492 100644
  --- a/tests/unit/iklan-komponen.test.ts
  +++ b/tests/unit/iklan-komponen.test.ts
  @@ -4,10 +4,18 @@ import { describe, expect, it, vi } from 'vitest'
   
   import { PanelPersetujuan } from '@/components/iklan/PanelPersetujuan'
   import { SkripPersetujuan } from '@/components/iklan/SkripPersetujuan'
  +import { SlotIklan } from '@/components/iklan/SlotIklan'
  +import { IsiArtikel } from '@/components/isi/IsiArtikel'
   import { Footer } from '@/components/tata-letak/Footer'
  +import { sisipkanIklanTengah } from '@/modules/iklan/aturan'
   import { skripAwal } from '@/modules/iklan/persetujuan'
  +import type { SlotSiap } from '@/modules/iklan/tipe'
  +
  +import { isiLexical, p } from './seo-contoh'
   
   vi.mock('next/navigation', () => ({ usePathname: () => '/' }))
  +// next/image butuh konfigurasi loader dari next.config; isi tes ini tanpa gambar.
  +vi.mock('next/image', () => ({ default: () => null }))
   
   const footer = { tautan: [], sosial: [], whatsapp: null, hakCipta: '© 2026 point.lat' }
   
  @@ -38,3 +46,20 @@ describe('banner persetujuan cookie', () => {
       expect(renderToStaticMarkup(h(Footer, { data: footer }))).not.toContain('Pengaturan cookie')
     })
   })
  +
  +describe('slot iklan', () => {
  +  const slot: SlotSiap = { id: 'artikel-akhir', posisi: 'artikel-akhir', lebar: 336, tinggi: 280, klien: 'ca-pub-0000000000000000', unit: '2222222222', uji: true, setelahParagraf: 3 }
  +
  +  it('wadah berlabel Iklan dengan kotak berukuran tetap dan data untuk pemuat; tanpa slot tidak merender apa pun', () => {
  +    expect(renderToStaticMarkup(h(SlotIklan, { slot }))).toMatch(
  +      /^<div class="[^"]+" data-slot-iklan="artikel-akhir" data-lebar="336"><p class="[^"]+">Iklan<\/p><div class="[^"]+" style="width:336px;height:280px" data-kotak-iklan="" data-klien="ca-pub-0000000000000000" data-unit="2222222222" data-lebar="336" data-tinggi="280" data-uji="on"><\/div><\/div>$/,
  +    )
  +    expect(renderToStaticMarkup(h(SlotIklan, { slot: { ...slot, uji: false } }))).not.toContain('data-uji')
  +    expect(renderToStaticMarkup(h(SlotIklan, { slot: null }))).toBe('')
  +  })
  +
  +  it('iklan tengah dirender IsiArtikel di antara paragraf tingkat atas, bukan di dalamnya', () => {
  +    const isi = sisipkanIklanTengah(isiLexical([p('Satu.'), p('Dua.'), p('Tiga.'), p('Empat.'), p('Lima.')]), { ...slot, id: 'tengah', posisi: 'artikel-tengah' })
  +    expect(renderToStaticMarkup(h(IsiArtikel, { isi, cloudName: 'demo' }))).toMatch(/<p>Tiga\.<\/p><div class="[^"]+" data-slot-iklan="tengah" data-lebar="336">/)
  +  })
  +})
  ```

  ```diff
  diff --git a/tests/e2e/bantu.ts b/tests/e2e/bantu.ts
  index 654de23..296c161 100644
  --- a/tests/e2e/bantu.ts
  +++ b/tests/e2e/bantu.ts
  @@ -18,6 +18,49 @@ export async function cegatCloudinary(page: Page): Promise<void> {
     )
   }
   
  +/**
  + * Skrip AdSense tiruan, dilayani tes untuk `pagead2.googlesyndication.com` (tes tidak boleh memanggil
  + * jaringan). Mencatat berapa kali dimuat, isi `dataLayer` saat dimuat (Consent Mode harus sudah diatur),
  + * menulis cookie `__gads` dan `__gpi` seperti AdSense, dan mengisi setiap `<ins class="adsbygoogle">` dengan
  + * kotak hijau seukuran unit. Permintaan lain ke domain iklan Google ditolak dan dicatat.
  + */
  +const SKRIP_ADSENSE_TIRUAN = `(function () {
  +  var c = (window.__iklanTiruan = window.__iklanTiruan || { dimuat: 0, diisi: 0, dataLayer: [] })
  +  c.dimuat++
  +  c.dataLayer = (window.dataLayer || []).map(function (a) { return Array.prototype.slice.call(a) })
  +  document.cookie = '__gads=tiruan; Path=/; SameSite=Lax'
  +  document.cookie = '__gpi=tiruan; Path=/; SameSite=Lax'
  +  function isi() {
  +    document.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])').forEach(function (ins) {
  +      ins.setAttribute('data-adsbygoogle-status', 'done')
  +      ins.setAttribute('data-ad-status', 'filled')
  +      ins.innerHTML = '<div data-iklan-tiruan style="width:100%;height:100%;background:#1f7a4d"></div>'
  +      c.diisi++
  +    })
  +  }
  +  var antre = window.adsbygoogle || []
  +  window.adsbygoogle = { loaded: true, push: isi }
  +  if (antre.length) isi()
  +})()`
  +
  +export type CatatanIklan = { skrip: string[]; lain: string[] }
  +
  +export async function cegatIklan(page: Page): Promise<CatatanIklan> {
  +  const catatan: CatatanIklan = { skrip: [], lain: [] }
  +  for (const pola of ['https://*.googlesyndication.com/**', 'https://*.doubleclick.net/**', 'https://*.google.com/**', 'https://*.googletagmanager.com/**']) {
  +    await page.route(pola, (route) => {
  +      catatan.lain.push(route.request().url())
  +      return route.abort()
  +    })
  +  }
  +  // Didaftarkan terakhir supaya didahulukan Playwright (rute yang cocok dijalankan dari yang terakhir didaftarkan).
  +  await page.route('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js*', (route) => {
  +    catatan.skrip.push(route.request().url())
  +    return route.fulfill({ status: 200, contentType: 'text/javascript', body: SKRIP_ADSENSE_TIRUAN })
  +  })
  +  return catatan
  +}
  +
   /** `bagian`: selector yang diperiksa saja, misalnya komponen kustom di admin Payload. Tanpa itu: seluruh halaman. */
   export async function periksaAxe(page: Page, ...bagian: string[]): Promise<void> {
     let axe = new AxeBuilder({ page }).withTags(TAG_WCAG)
  ```

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index d00c1bb..938ee8c 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -324,7 +324,17 @@ await payload.updateGlobal({ slug: 'asisten-ai', data: { aktif: true, anggaranBu
   // tes yang memilihnya mencegat domain Google, jadi tidak ada permintaan jaringan.
   await payload.updateGlobal({
     slug: 'iklan',
  -  data: { aktif: true, penyedia: 'adsense', idPenerbit: PENERBIT_E2E, modeUji: true, slot: [], adsTxtTambahan: ADS_TXT_E2E },
  +  data: {
  +    aktif: true,
  +    penyedia: 'adsense',
  +    idPenerbit: PENERBIT_E2E,
  +    modeUji: true,
  +    slot: [
  +      { idSlot: 'artikel-tengah', posisi: 'artikel-tengah', setelahParagraf: 3, ukuran: 'persegi', unit: '1111111111', aktif: true },
  +      { idSlot: 'artikel-akhir', posisi: 'artikel-akhir', ukuran: 'persegi-besar', unit: '2222222222', aktif: true },
  +    ],
  +    adsTxtTambahan: ADS_TXT_E2E,
  +  },
   })
   await payload.updateGlobal({
     slug: 'newsletter',
  ```

  ```diff
  diff --git a/tests/e2e/iklan.spec.ts b/tests/e2e/iklan.spec.ts
  index 4ba2f1f..3c9bc06 100644
  --- a/tests/e2e/iklan.spec.ts
  +++ b/tests/e2e/iklan.spec.ts
  @@ -1,6 +1,6 @@
   import { expect, test, type BrowserContext, type Page } from '@playwright/test'
   
  -import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  +import { cegatCloudinary, cegatIklan, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
   import { ADMIN_E2E, ADS_TXT_E2E, PENERBIT_E2E, SLUG, UKURAN_LAYAR } from './data'
   
   const DITOLAK = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }
  @@ -11,11 +11,40 @@ async function sudahMemilih(konteks: BrowserContext, pilihan: 'perlu' | 'semua')
     await konteks.addCookies([{ name: 'persetujuan', value: `1.${pilihan}.${new Date().toISOString().slice(0, 10)}`, domain: 'localhost', path: '/' }])
   }
   
  +/** Menggulir sampai bawah halaman setahap demi setahap, supaya setiap slot sempat hampir terlihat. */
  +const gulirSampaiBawah = (page: Page) =>
  +  page.evaluate(async () => {
  +    for (let y = 0; y <= document.documentElement.scrollHeight; y += 300) {
  +      window.scrollTo(0, y)
  +      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  +    }
  +  })
  +
  +/** Jumlah layout shift sejak halaman dimuat, tanpa pergeseran sesaat setelah klik atau tombol (definisi CLS). */
  +const cls = (page: Page) =>
  +  page.evaluate(
  +    () =>
  +      new Promise<number>((selesai) => {
  +        let jumlah = 0
  +        new PerformanceObserver((daftar) => {
  +          for (const e of daftar.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) jumlah += e.value
  +        }).observe({ type: 'layout-shift', buffered: true })
  +        requestAnimationFrame(() => requestAnimationFrame(() => selesai(jumlah)))
  +      }),
  +  )
  +
  +/** Catatan skrip AdSense tiruan: isi `dataLayer` saat skrip dimuat dan jumlah unit yang diisi. */
  +const iklanTiruan = (page: Page) =>
  +  page.evaluate(() => (window as unknown as { __iklanTiruan?: { dimuat: number; diisi: number; dataLayer: unknown[] } }).__iklanTiruan ?? null)
  +
   /** Perintah `gtag()` di `dataLayer` (objek `arguments`) sebagai array. */
   const dataLayer = (page: Page) => page.evaluate(() => ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? []).map((a) => Array.from(a)))
   
   test.beforeEach(async ({ page }) => {
     await cegatCloudinary(page)
  +  // Setelah Izinkan semua, halaman berslot iklan memuat skrip AdSense: selalu dicegat, tidak pernah ke jaringan.
  +  // Tes yang memeriksa permintaannya memanggil `cegatIklan` lagi (rute terakhir didahulukan).
  +  await cegatIklan(page)
   })
   
   test('admin global Iklan: petunjuk terbaca dan pratinjau ads.txt mengikuti isian sebelum disimpan', async ({ page }) => {
  @@ -140,3 +169,111 @@ for (const { lebar, tinggi } of UKURAN_LAYAR) {
       await periksaAxe(page)
     })
   }
  +
  +test('sebelum memilih dan dengan Hanya yang perlu: tanpa permintaan skrip iklan dan slot tidak menempati ruang', async ({ page }) => {
  +  const catatan = await cegatIklan(page)
  +  await page.goto(`/${SLUG.panduan}`)
  +  const slot = page.locator('[data-slot-iklan]')
  +  await expect(slot).toHaveCount(2)
  +  await gulirSampaiBawah(page)
  +  await page.waitForLoadState('networkidle')
  +  for (const s of await slot.all()) await expect(s).toBeHidden()
  +  await page.getByRole('region', { name: 'Cookie dan iklan' }).getByRole('button', { name: 'Hanya yang perlu' }).click()
  +  await expect(page.locator('html')).toHaveAttribute('data-persetujuan', 'perlu')
  +  await gulirSampaiBawah(page)
  +  await page.waitForLoadState('networkidle')
  +  for (const s of await slot.all()) await expect(s).toBeHidden()
  +  expect(catatan).toEqual({ skrip: [], lain: [] })
  +  expect(await iklanTiruan(page)).toBeNull()
  +})
  +
  +test('Izinkan semua: Consent Mode diatur sebelum skrip iklan, skrip dimuat sekali saat slot hampir terlihat, dan ukuran wadah dipesan sebelum iklan terisi', async ({ page }) => {
  +  const catatan = await cegatIklan(page)
  +  await page.setViewportSize({ width: 375, height: 812 })
  +  await page.goto(`/${SLUG.panduan}`)
  +  await page.getByRole('region', { name: 'Cookie dan iklan' }).getByRole('button', { name: 'Izinkan semua' }).click()
  +  const akhir = page.locator('[data-slot-iklan="artikel-akhir"]')
  +  await expect(akhir).toBeVisible()
  +  await expect(akhir.getByText('Iklan', { exact: true })).toBeVisible()
  +  const kotak = akhir.locator('[data-kotak-iklan]')
  +  expect(await kotak.boundingBox()).toMatchObject({ width: 336, height: 280 })
  +  await expect(kotak.locator('ins')).toHaveCount(0)
  +
  +  await akhir.scrollIntoViewIfNeeded()
  +  const ins = kotak.locator('ins.adsbygoogle')
  +  await expect(ins).toHaveAttribute('data-ad-status', 'filled')
  +  await expect(ins).toHaveAttribute('data-ad-client', PENERBIT_E2E)
  +  await expect(ins).toHaveAttribute('data-ad-slot', '2222222222')
  +  await expect(ins).toHaveAttribute('data-adtest', 'on')
  +  expect(await kotak.boundingBox()).toMatchObject({ width: 336, height: 280 })
  +  await gulirSampaiBawah(page)
  +  await expect(page.locator('ins[data-ad-status="filled"]')).toHaveCount(2)
  +  expect(catatan).toEqual({ skrip: [`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PENERBIT_E2E}`], lain: [] })
  +  expect((await iklanTiruan(page))?.dataLayer).toEqual([
  +    ['consent', 'default', DITOLAK],
  +    ['consent', 'update', IKLAN_DIIZINKAN],
  +  ])
  +})
  +
  +test('tidak ada iklan di kotak Intinya atau di atas H1; iklan tengah setelah paragraf ketiga dan iklan akhir sebelum sumber', async ({ page }) => {
  +  await sudahMemilih(page.context(), 'semua')
  +  await cegatIklan(page)
  +  await page.goto(`/${SLUG.panduan}`)
  +  await expect(page.locator('[data-slot-iklan]')).toHaveCount(2)
  +  await expect(page.getByRole('region', { name: 'Intinya' }).locator('[data-slot-iklan]')).toHaveCount(0)
  +  const h1 = (await page.getByRole('heading', { level: 1 }).boundingBox())!
  +  const intinya = (await page.getByRole('region', { name: 'Intinya' }).boundingBox())!
  +  for (const slot of await page.locator('[data-slot-iklan]').all()) {
  +    expect((await slot.boundingBox())!.y).toBeGreaterThan(Math.max(h1.y + h1.height, intinya.y + intinya.height))
  +  }
  +  const tengah = page.locator('[data-slot-iklan="artikel-tengah"]')
  +  expect(await tengah.evaluate((el) => el.previousElementSibling?.textContent)).toMatch(/^Kategori TER ditentukan status PTKP/)
  +  // Jarak 32 px dari isi di atas dan di bawahnya, lebih lebar dari jarak antarparagraf.
  +  const jarak = await tengah.evaluate((el) => {
  +    const s = el.getBoundingClientRect()
  +    return [s.top - el.previousElementSibling!.getBoundingClientRect().bottom, el.nextElementSibling!.getBoundingClientRect().top - s.bottom]
  +  })
  +  expect(jarak.map(Math.round)).toEqual([32, 32])
  +  const akhir = (await page.locator('[data-slot-iklan="artikel-akhir"]').boundingBox())!
  +  expect(akhir.y).toBeLessThan((await page.getByRole('region', { name: 'Sumber' }).boundingBox())!.y)
  +})
  +
  +test('CLS 0 di halaman berslot iklan: sebelum memilih, setelah Izinkan semua, dan saat kembali dengan pilihan tersimpan', async ({ page }) => {
  +  await cegatIklan(page)
  +  await page.setViewportSize({ width: 375, height: 812 })
  +  await page.goto(`/${SLUG.panduan}`)
  +  await gulirSampaiBawah(page)
  +  expect(await cls(page)).toBe(0)
  +
  +  await page.evaluate(() => window.scrollTo(0, 0))
  +  await page.getByRole('region', { name: 'Cookie dan iklan' }).getByRole('button', { name: 'Izinkan semua' }).click()
  +  await gulirSampaiBawah(page)
  +  await expect(page.locator('ins[data-ad-status="filled"]')).toHaveCount(2)
  +  expect(await cls(page)).toBe(0)
  +
  +  await page.reload()
  +  await gulirSampaiBawah(page)
  +  await expect(page.locator('ins[data-ad-status="filled"]')).toHaveCount(2)
  +  expect(await cls(page)).toBe(0)
  +})
  +
  +test('menarik persetujuan: Hanya yang perlu setelah Izinkan semua menghapus cookie iklan, memuat ulang halaman, dan iklan tidak dimuat lagi', async ({ page }) => {
  +  await sudahMemilih(page.context(), 'semua')
  +  const catatan = await cegatIklan(page)
  +  await page.goto(`/${SLUG.panduan}`)
  +  await gulirSampaiBawah(page)
  +  await expect(page.locator('ins[data-ad-status="filled"]')).toHaveCount(2)
  +  expect((await page.context().cookies()).map((k) => k.name)).toEqual(expect.arrayContaining(['__gads', '__gpi']))
  +
  +  await page.getByRole('button', { name: 'Pengaturan cookie' }).click()
  +  await Promise.all([page.waitForEvent('load'), page.getByRole('region', { name: 'Cookie dan iklan' }).getByRole('button', { name: 'Hanya yang perlu' }).click()])
  +  await expect(page.locator('html')).toHaveAttribute('data-persetujuan', 'perlu')
  +  const sisa = (await page.context().cookies()).map((k) => k.name)
  +  expect(sisa).not.toContain('__gads')
  +  expect(sisa).not.toContain('__gpi')
  +  await gulirSampaiBawah(page)
  +  await page.waitForLoadState('networkidle')
  +  for (const s of await page.locator('[data-slot-iklan]').all()) await expect(s).toBeHidden()
  +  expect(catatan.skrip).toHaveLength(1)
  +  expect(await iklanTiruan(page)).toBeNull()
  +})
  ```

  ```diff
  diff --git a/tests/e2e/motion.spec.ts b/tests/e2e/motion.spec.ts
  index b91a2ef..dca17b6 100644
  --- a/tests/e2e/motion.spec.ts
  +++ b/tests/e2e/motion.spec.ts
  @@ -28,7 +28,17 @@ const HALAMAN_ANGGARAN = [
   /** JS milik point. di luar kerangka Next/React (spesifikasi §12): kalkulator dan modul hitung. */
   const ANGGARAN_KALKULATOR = 25 * 1024
   
  -/** Byte JS halaman di konteks baru (tanpa cache browser dari halaman sebelumnya). */
  +/**
  + * JS milik point. yang dimuat tata letak di setiap halaman: banner persetujuan cookie, pemuat iklan, animasi
  + * masuk kartu, dan penanda menu aktif (satu chunk). Bersama JS kalkulator tetap di bawah 25 KB (spesifikasi §12).
  + */
  +const ANGGARAN_TATA_LETAK = 8 * 1024
  +
  +/**
  + * Byte JS halaman di konteks baru (tanpa cache browser dari halaman sebelumnya). Hanya skrip dari situs
  + * sendiri: skrip penyedia iklan tidak dihitung anggaran (spesifikasi §12), dan tanpa persetujuan memang
  + * tidak dimuat.
  + */
   async function byteJs(browser: Browser, path: string): Promise<number> {
     const konteks = await browser.newContext()
     const page = await konteks.newPage()
  @@ -37,7 +47,7 @@ async function byteJs(browser: Browser, path: string): Promise<number> {
     const byte = await page.evaluate(() =>
       performance
         .getEntriesByType('resource')
  -      .filter((e) => (e as PerformanceResourceTiming).initiatorType === 'script')
  +      .filter((e) => (e as PerformanceResourceTiming).initiatorType === 'script' && e.name.startsWith(location.origin))
         .reduce((jumlah, e) => jumlah + (e as PerformanceResourceTiming).encodedBodySize, 0),
     )
     await konteks.close()
  @@ -107,6 +117,35 @@ test('JavaScript kalkulator (komponen dan modul hitung) di bawah 25 KB di atas J
     }
   })
   
  +/**
  + * Byte terkompresi chunk JS yang memuat banner persetujuan cookie. Nama chunk berubah setiap build, jadi chunk
  + * dicari dari isinya (id judul banner).
  + */
  +async function byteTataLetak(browser: Browser): Promise<number> {
  +  const konteks = await browser.newContext()
  +  const page = await konteks.newPage()
  +  await cegatCloudinary(page)
  +  const isi: Promise<[string, string]>[] = []
  +  page.on('response', (r) => {
  +    if (r.request().resourceType() === 'script') isi.push(r.text().then((teks) => [r.url(), teks]))
  +  })
  +  await page.goto(`/${SLUG.panduan}`)
  +  await page.waitForLoadState('networkidle')
  +  const url = (await Promise.all(isi)).filter(([, teks]) => teks.includes('persetujuan-judul')).map(([u]) => u)
  +  expect(url).toHaveLength(1)
  +  const byte = await page.evaluate((u) => (performance.getEntriesByName(u)[0] as PerformanceResourceTiming).encodedBodySize, url[0])
  +  await konteks.close()
  +  return byte
  +}
  +
  +test('JS tata letak milik point. (banner persetujuan, pemuat iklan, animasi masuk, menu aktif) di bawah 8 KiB, dan bersama JS kalkulator di bawah 25 KB', async ({ browser }) => {
  +  const tataLetak = await byteTataLetak(browser)
  +  const kalkulator = (await byteJs(browser, '/tools/gaji-bersih')) - (await byteJs(browser, `/${SLUG.panduan}`))
  +  test.info().annotations.push({ type: 'JS tata letak', description: `${(tataLetak / 1024).toFixed(1)} KiB` })
  +  expect(tataLetak).toBeLessThan(ANGGARAN_TATA_LETAK)
  +  expect(tataLetak + kalkulator).toBeLessThan(ANGGARAN_KALKULATOR)
  +})
  +
   test('reveal judul beranda tanpa JavaScript tambahan: JS beranda tidak melebihi JS artikel', async ({ browser }) => {
     expect(await byteJs(browser, '/')).toBeLessThanOrEqual(await byteJs(browser, `/${SLUG.panduan}`))
   })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/iklan-komponen.test.ts` dengan `Error: Cannot find package '@/components/iklan/SlotIklan'`.

- [ ] **Langkah 3: Wadah slot dan pemuat iklan**

  `src/components/iklan/SlotIklan.tsx`

  ```tsx
  import type { SlotSiap } from '@/modules/iklan/tipe'

  import gaya from './SlotIklan.module.css'

  /**
   * Wadah satu unit iklan (spesifikasi §11), server component. Tinggi dan lebar dipesan dari ukuran tetap
   * slot, jadi iklan yang dimuat belakangan tidak menggeser isi (CLS 0). Tampil hanya bila pengunjung memilih
   * Izinkan semua (CSS dari atribut `<html data-persetujuan>`); selain itu tidak menempati ruang. Label
   * "Iklan" terbaca dan terlihat. Bila AdSense tidak mengisi unit, kotak tetap berukuran sama dengan latar
   * permukaan dan label "Iklan" (tidak diciutkan, supaya isi di bawahnya tidak bergeser).
   * `PemuatIklan` membaca data di kotak saat kotak hampir terlihat.
   */
  export function SlotIklan({ slot, className }: { slot: SlotSiap | null; className?: string }) {
    if (!slot) return null
    return (
      <div className={className ? `${gaya.slot} ${className}` : gaya.slot} data-slot-iklan={slot.id} data-lebar={slot.lebar}>
        <p className={gaya.label}>Iklan</p>
        <div
          className={gaya.kotak}
          style={{ width: slot.lebar, height: slot.tinggi }}
          data-kotak-iklan=""
          data-klien={slot.klien}
          data-unit={slot.unit}
          data-lebar={slot.lebar}
          data-tinggi={slot.tinggi}
          data-uji={slot.uji ? 'on' : undefined}
        />
      </div>
    )
  }
  ```

  `src/components/iklan/SlotIklan.module.css`

  ```css
  /*
   * Slot iklan (spesifikasi §11). Tidak menempati ruang sampai pengunjung memilih Izinkan semua; sesudahnya
   * kotak berukuran tetap dipesan sejak paint pertama. Slot yang lebih lebar dari layar (di bawah 375 px)
   * disembunyikan: unit tersembunyi tidak pernah diminta (Bantuan AdSense), dan iklan tidak terpotong.
   */
  .slot {
    display: none;
    justify-items: center;
    gap: var(--ruang-2);
  }

  :global(html[data-persetujuan='semua']) .slot {
    display: grid;
  }

  @media (max-width: 22.99rem) {
    :global(html[data-persetujuan='semua']) .slot[data-lebar='336'] {
      display: none;
    }
  }

  @media (max-width: 21.99rem) {
    :global(html[data-persetujuan='semua']) .slot[data-lebar='320'] {
      display: none;
    }
  }

  @media (max-width: 20.74rem) {
    :global(html[data-persetujuan='semua']) .slot[data-lebar='300'] {
      display: none;
    }
  }

  .label {
    color: var(--teks-sekunder);
    font-size: var(--teks-label);
    font-weight: 800;
    letter-spacing: var(--jarak-label);
    line-height: 1.2;
    text-transform: uppercase;
  }

  .kotak {
    background: var(--permukaan);
  }
  ```

  `src/components/iklan/PemuatIklan.tsx`

  ```tsx
  'use client'

  import { usePathname } from 'next/navigation'
  import { useEffect } from 'react'

  import { atributUnit, urlSkrip } from '@/modules/iklan/adsense'
  import { PERISTIWA_PERSETUJUAN } from '@/modules/iklan/peramban'
  import { ATRIBUT_PERSETUJUAN } from '@/modules/iklan/persetujuan'

  /** Unit diminta saat kotak tinggal 200 px dari layar, supaya iklan sudah ada saat kotak terlihat. */
  const JARAK_MUAT = '200px 0px'

  /**
   * Pemuat iklan (spesifikasi §11), sekali di layout. Setelah halaman interaktif dan hanya bila pengunjung
   * memilih Izinkan semua, setiap kotak `SlotIklan` diamati; saat hampir terlihat, skrip AdSense dimuat
   * (sekali per halaman) dan unit diisi. Kotak tersembunyi (Hanya yang perlu, layar terlalu sempit) tidak
   * pernah terlihat, jadi tidak pernah diminta. Diulang setiap pindah halaman dan setelah pengunjung memilih.
   */
  export function PemuatIklan() {
    const path = usePathname()
    useEffect(() => {
      let pengamat: IntersectionObserver | null = null
      const mulai = () => {
        if (pengamat || document.documentElement.getAttribute(ATRIBUT_PERSETUJUAN) !== 'semua') return
        const kotak = document.querySelectorAll<HTMLElement>('[data-kotak-iklan]:not([data-dimuat])')
        if (kotak.length === 0) return
        const amati = new IntersectionObserver(
          (entri) => {
            for (const e of entri) {
              if (!e.isIntersecting) continue
              amati.unobserve(e.target)
              isiKotak(e.target as HTMLElement)
            }
          },
          { rootMargin: JARAK_MUAT },
        )
        for (const k of kotak) amati.observe(k)
        pengamat = amati
      }
      mulai()
      window.addEventListener(PERISTIWA_PERSETUJUAN, mulai)
      return () => {
        window.removeEventListener(PERISTIWA_PERSETUJUAN, mulai)
        pengamat?.disconnect()
      }
    }, [path])
    return null
  }

  /** Memuat skrip AdSense bila belum, lalu menambah satu `<ins>` berukuran tetap ke kotak dan memintanya diisi. */
  function isiKotak(kotak: HTMLElement) {
    const { klien, unit, uji, lebar, tinggi } = kotak.dataset
    if (!klien || !unit) return
    kotak.dataset.dimuat = ''
    if (!document.querySelector('script[data-skrip-iklan]')) {
      const skrip = document.createElement('script')
      skrip.async = true
      skrip.crossOrigin = 'anonymous'
      skrip.src = urlSkrip(klien)
      skrip.dataset.skripIklan = ''
      document.head.append(skrip)
    }
    const ins = document.createElement('ins')
    for (const [nama, nilai] of Object.entries(atributUnit({ klien, unit, uji: uji === 'on', lebar: Number(lebar), tinggi: Number(tinggi) }))) {
      ins.setAttribute(nama, nilai)
    }
    kotak.append(ins)
    const w = window as unknown as { adsbygoogle?: object[] }
    w.adsbygoogle = w.adsbygoogle ?? []
    w.adsbygoogle.push({})
  }
  ```

  ```diff
  diff --git a/src/app/(frontend)/layout.tsx b/src/app/(frontend)/layout.tsx
  index 24c34f0..a1454c9 100644
  --- a/src/app/(frontend)/layout.tsx
  +++ b/src/app/(frontend)/layout.tsx
  @@ -5,6 +5,7 @@ import '@/styles/tokens.css'
   import '@/styles/dasar.css'
   
   import { PanelPersetujuan } from '@/components/iklan/PanelPersetujuan'
  +import { PemuatIklan } from '@/components/iklan/PemuatIklan'
   import { SkripPersetujuan } from '@/components/iklan/SkripPersetujuan'
   import { PemicuMasuk } from '@/components/motion/PemicuMasuk'
   import { Footer } from '@/components/tata-letak/Footer'
  @@ -21,7 +22,7 @@ export const metadata: Metadata = {
   }
   
   /**
  - * Banner persetujuan cookie hanya bila iklan dinyalakan dengan ID penerbit yang valid: tanpa iklan, situs
  + * Banner persetujuan cookie dan pemuat iklan hanya bila iklan dinyalakan dengan ID penerbit yang valid: tanpa iklan, situs
    * hanya memakai yang perlu. Pilihan pengunjung dibaca skrip awal di browser, jadi halaman tetap ISR;
    * `suppressHydrationWarning` karena skrip itu menulis atribut `<html>` sebelum React hidrasi.
    */
  @@ -44,6 +45,7 @@ export default async function RootLayout({ children }: { children: React.ReactNo
           <main id="isi">{children}</main>
           <Footer data={footer} persetujuan={persetujuan} />
           <PemicuMasuk />
  +        {persetujuan && <PemuatIklan />}
         </body>
       </html>
     )
  ```

- [ ] **Langkah 4: Iklan di artikel**

  ```diff
  diff --git a/src/components/isi/IsiArtikel.tsx b/src/components/isi/IsiArtikel.tsx
  index 18f0c32..c6e465e 100644
  --- a/src/components/isi/IsiArtikel.tsx
  +++ b/src/components/isi/IsiArtikel.tsx
  @@ -4,6 +4,9 @@ import { RichText, type JSXConverter, type JSXConvertersFunction } from '@payloa
   import type { ReactNode } from 'react'
   
   import { Tautan } from '@/components/dasar/Tautan'
  +import { SlotIklan } from '@/components/iklan/SlotIklan'
  +import { NODE_IKLAN } from '@/modules/iklan/aturan'
  +import type { SlotSiap } from '@/modules/iklan/tipe'
   import { mediaTampil } from '@/modules/konten/artikel'
   import { hrefDokumen } from '@/modules/konten/isi'
   import type { IsiDokumen } from '@/modules/seo/lexical'
  @@ -66,6 +69,8 @@ function konverter(cloudName: string): JSXConvertersFunction {
         embedTool: ({ node }: { node: { fields: BlokEmbedTool } }) => <KartuTool tool={node.fields.tool} />,
         embedVideo: ({ node }: { node: { fields: BlokEmbedVideo } }) => <VideoSemat video={node.fields.video} cloudName={cloudName} />,
       },
  +    // Iklan tengah artikel: node yang disisipkan `sisipkanIklanTengah`, bukan bagian dari isi tersimpan.
  +    [NODE_IKLAN]: ({ node }) => <SlotIklan slot={(node as unknown as { slot: SlotSiap }).slot} />,
       // Node yang tidak dikenal tidak dirender (bawaan Payload menulis "unknown node").
       unknown: () => null,
     })
  ```

  ```diff
  diff --git a/src/components/isi/Isi.module.css b/src/components/isi/Isi.module.css
  index 363be5f..09e0722 100644
  --- a/src/components/isi/Isi.module.css
  +++ b/src/components/isi/Isi.module.css
  @@ -39,6 +39,12 @@
     margin-top: 0;
   }
   
  +/* Slot iklan di tengah isi (`SlotIklan`): jarak lebih lebar dari antarparagraf supaya iklan jelas terpisah
  +   dari isi. Margin vertikal berdempet dengan margin paragraf di sekitarnya. */
  +.prosa > [data-slot-iklan] {
  +  margin-block: var(--ruang-8);
  +}
  +
   .prosa a {
     text-decoration: underline;
     text-decoration-thickness: var(--garis-tipis);
  ```

  ```diff
  diff --git a/src/components/artikel/HalamanArtikel.tsx b/src/components/artikel/HalamanArtikel.tsx
  index c551cdf..7e3220a 100644
  --- a/src/components/artikel/HalamanArtikel.tsx
  +++ b/src/components/artikel/HalamanArtikel.tsx
  @@ -4,12 +4,15 @@ import { ChipPilar } from '@/components/dasar/ChipPilar'
   import { Ikon } from '@/components/dasar/Ikon'
   import { JsonLd } from '@/components/dasar/JsonLd'
   import { RemahRoti } from '@/components/dasar/RemahRoti'
  +import { SlotIklan } from '@/components/iklan/SlotIklan'
   import { Tautan } from '@/components/dasar/Tautan'
   import { Keterangan, UKURAN_KOLOM_ISI } from '@/components/isi/GambarIsi'
   import { IsiArtikel } from '@/components/isi/IsiArtikel'
   import { DaftarKartu } from '@/components/kartu/KartuArtikel'
   import { JudulBersama } from '@/components/motion/JudulBersama'
   import { LABEL_TIPE_ARTIKEL } from '@/lib/konstanta'
  +import { pilihSlot, sisipkanIklanTengah } from '@/modules/iklan/aturan'
  +import type { PengaturanIklan } from '@/modules/iklan/tipe'
   import { tanggalIndonesia } from '@/modules/konten/artikel'
   import type { DataArtikel } from '@/modules/konten/tipe'
   import { propsGambar } from '@/modules/media/props'
  @@ -28,8 +31,11 @@ import { ProfilPenulis } from './ProfilPenulis'
    * Halaman artikel (keempat tipe, termasuk glosarium) dengan urutan dari spesifikasi §4: kicker
    * pilar, H1, deck, byline, kotak Intinya, daftar isi, isi, sumber, FAQ, artikel terkait, profil
    * penulis. Breadcrumb dan JSON-LD dibangun modul SEO dari dokumen yang sama.
  + *
  + * Iklan (spesifikasi §11) hanya di dua tempat: di tengah isi setelah paragraf ke-N (`sisipkanIklanTengah`)
  + * dan setelah isi, sebelum catatan, sumber, dan FAQ. Tidak pernah di atas H1 atau di dalam kotak Intinya.
    */
  -export function HalamanArtikel({ artikel, situs }: { artikel: DataArtikel; situs: Situs }) {
  +export function HalamanArtikel({ artikel, situs, iklan = null }: { artikel: DataArtikel; situs: Situs; iklan?: PengaturanIklan | null }) {
     const masukan = { jenis: 'artikel', doc: artikel.seo } as const
     const gambar = propsGambar(artikel.gambar, 'hero', { cloudName: situs.cloudName, lebar: 1440 })
     return (
  @@ -78,7 +84,8 @@ export function HalamanArtikel({ artikel, situs }: { artikel: DataArtikel; situs
                 <Keterangan media={artikel.gambar} />
               </figure>
             )}
  -          <IsiArtikel isi={artikel.isi} cloudName={situs.cloudName} />
  +          <IsiArtikel isi={sisipkanIklanTengah(artikel.isi, pilihSlot(iklan, 'artikel-tengah'))} cloudName={situs.cloudName} />
  +          <SlotIklan slot={pilihSlot(iklan, 'artikel-akhir')} />
             <Catatan teks={artikel.pilar?.disclaimer ?? null} />
             <BlokSumber sumber={artikel.sumber} />
             <Faq faq={artikel.faq} />
  ```

  ```diff
  diff --git a/src/app/(frontend)/[...jalur]/page.tsx b/src/app/(frontend)/[...jalur]/page.tsx
  index 4cb2ccf..528eaee 100644
  --- a/src/app/(frontend)/[...jalur]/page.tsx
  +++ b/src/app/(frontend)/[...jalur]/page.tsx
  @@ -4,6 +4,7 @@ import { cache } from 'react'
   import { HalamanArtikel } from '@/components/artikel/HalamanArtikel'
   import { HalamanStatis } from '@/components/halaman/HalamanStatis'
   import { HalamanRubrik } from '@/components/rubrik/HalamanRubrik'
  +import { muatIklan } from '@/modules/iklan'
   import { muatJalur, muatSitus, pathDariSegmen, tanganiTidakAda } from '@/modules/konten'
   import { metadata, metadataTidakDitemukan } from '@/modules/seo'
   
  @@ -46,7 +47,7 @@ export default async function Halaman({ params }: Props) {
     const hasil = await cari(jalur)
     switch (hasil?.jenis) {
       case 'artikel':
  -      return <HalamanArtikel artikel={hasil.artikel} situs={await muatSitus()} />
  +      return <HalamanArtikel artikel={hasil.artikel} situs={await muatSitus()} iklan={await muatIklan()} />
       case 'rubrik':
         return <HalamanRubrik rubrik={hasil.rubrik} situs={await muatSitus()} />
       case 'halaman':
  ```

- [ ] **Langkah 5: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 498 tes (73 file); integrasi 145 tes (43 file); E2E 127 tes.

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/components/iklan src/components/isi/Isi.module.css "src/app/(frontend)/[...jalur]/page.tsx" "src/app/(frontend)/layout.tsx" src/components/artikel/HalamanArtikel.tsx src/components/isi/IsiArtikel.tsx tests/e2e/bantu.ts tests/e2e/iklan.spec.ts tests/e2e/motion.spec.ts tests/e2e/siapkan.ts tests/unit/iklan-komponen.test.ts
  git commit -m "feat(iklan): SlotIklan berukuran tetap berlabel Iklan dan PemuatIklan (skrip AdSense hanya setelah Izinkan semua, saat slot hampir terlihat), iklan tengah artikel setelah paragraf ke-N dan iklan setelah isi, tanpa pergeseran tata letak"
  ```

---

### Task 8: Iklan di rubrik, tools, dan beranda

**Files:**
- Modify: `src/components/rubrik/HalamanRubrik.tsx`, `src/components/tools/HalamanTool.tsx`, `src/components/beranda/Beranda.tsx`, `src/modules/konten/beranda.ts`, `src/modules/konten/tipe.ts`, `src/modules/konten/data.ts`, `src/modules/konten/cache.ts`, `src/blocks/beranda.ts`, `src/payload-types.ts` (dibuat ulang), `src/app/(frontend)/[...jalur]/page.tsx`, `src/app/(frontend)/tools/[slug]/page.tsx`, `tests/unit/beranda.test.ts`, `tests/e2e/siapkan.ts`, `tests/e2e/iklan.spec.ts`
- Test: `tests/unit/beranda.test.ts`, `tests/e2e/iklan.spec.ts`

**Interfaces:**
- Consumes: `SlotIklan` (Task 7), `pilihSlot` (Task 2), `ambilIklan`, `muatIklan`, `TAG.iklan` (Task 4).
- Produces: `HalamanRubrik` dan `HalamanTool` menerima `iklan?: PengaturanIklan | null`; `SumberBeranda.iklan`, bagian beranda `{ jenis: 'iklan', id, slot }`; `muatBeranda` bertag `iklan`; slot `rubrik`, `tools`, dan `beranda-samping` di database E2E.

Penempatan mengikuti spesifikasi §11 dan kebijakan penempatan AdSense (iklan tidak berdempetan dengan navigasi atau tombol, supaya tidak memancing klik tidak sengaja):
- **Rubrik:** setelah daftar "Tulisan terbaru", jauh dari pil navigasi subkategori. Jarak dari `gap` kisi halaman rubrik.
- **Tools:** di kolom penjelasan, setelah artikel penjelasan rumus dan sebelum angka aturan; di luar form kalkulator dan tidak tepat di bawah tombol hitung. Jarak dari `gap` kolom itu.
- **Beranda:** di tempat blok Slot iklan yang diatur editor di global Beranda, hanya bila ID slotnya aktif di global Iklan dengan posisi Beranda (`susunBeranda` memakai `pilihSlot`). Slot yang tidak aktif tidak menjadi bagian, jadi tidak memisahkan tulisan terbaru dari newsletter di kolom sampingnya. Bagian iklan memakai kelas jarak `.bagian` yang sama dengan bagian lain (56 px), sesuai aturan tata letak yang diatur editor tidak bergantung jumlah elemen, dan tes E2E mengukurnya. Data beranda (`ambilBeranda`) kini membaca global Iklan, jadi `muatBeranda` ikut tag `iklan`.

Halaman rubrik dan tools meneruskan `iklan={await muatIklan()}`, sama dengan artikel. Database E2E menaruh blok Slot iklan setelah newsletter: probe menunjukkan blok slot di antara "Paling dicari pekan ini" dan newsletter membuat newsletter berdiri sendiri, sehingga tes beranda yang memeriksa newsletter di kolom samping (`complementary` "Newsletter") gagal. Deskripsi blok Slot iklan diperbarui (tanpa perubahan kolom database), jadi tipe dibuat ulang.

- [ ] **Langkah 1: Tulis tes yang gagal**

  ```diff
  diff --git a/tests/unit/beranda.test.ts b/tests/unit/beranda.test.ts
  index ba60e3c..2cd54fd 100644
  --- a/tests/unit/beranda.test.ts
  +++ b/tests/unit/beranda.test.ts
  @@ -1,5 +1,6 @@
   import { describe, expect, it } from 'vitest'
   
  +import type { PengaturanIklan } from '@/modules/iklan/tipe'
   import { daftarPopuler, HERO_BAWAAN, JUDUL_POPULER, JUDUL_TERBARU, susunBeranda, susunNewsletter, type SumberBeranda } from '@/modules/konten/beranda'
   import type { KartuArtikel, KartuVideo } from '@/modules/konten/tipe'
   import type { Artikel, Beranda, Media, Pilar, Video } from '@/payload-types'
  @@ -52,7 +53,7 @@ describe('susunNewsletter', () => {
   })
   
   describe('susunBeranda', () => {
  -  it('urutan editor dipertahankan; mozaik tanpa draf, dengan tools; video cadangan terbaru; iklan belum dirender', () => {
  +  it('urutan editor dipertahankan; mozaik tanpa draf, dengan tools; video cadangan terbaru; slot iklan tanpa pengaturan iklan dilewati', () => {
       const bagian = susunBeranda([blok.hero, blok.mozaik, blok.video, blok.palingDibaca, blok.newsletter, blok.iklan], sumber)
       expect(bagian.map((b) => b.jenis)).toEqual(['hero', 'mozaik', 'video', 'terbaru'])
       expect(bagian[0]).toEqual({ jenis: 'hero', id: 'h', judul: 'Intinya dulu.', subjudul: 'Uang, karier, dan kesehatan.', placeholder: 'misal: cara hitung THR' })
  @@ -89,6 +90,24 @@ describe('susunBeranda', () => {
       expect(susunBeranda([blok.hero, blok.newsletter], { ...sumber, newsletter: null })).toHaveLength(1)
     })
   
  +  it('slot iklan hanya bila ID slotnya aktif di global iklan; slot yang dilewati tidak memisahkan tulisan terbaru dari newsletter', () => {
  +    const iklan: PengaturanIklan = {
  +      aktif: true,
  +      penyedia: 'adsense',
  +      idPenerbit: 'ca-pub-0000000000000000',
  +      modeUji: false,
  +      adsTxtTambahan: null,
  +      slot: [{ id: 'beranda-samping', posisi: 'beranda', ukuran: 'banner', unit: '5555555555', aktif: true }],
  +    }
  +    const tata = [blok.hero, blok.palingDibaca, blok.iklan, blok.newsletter]
  +    const bagian = susunBeranda(tata, { ...sumber, iklan })
  +    expect(bagian.map((b) => b.jenis)).toEqual(['hero', 'terbaru', 'iklan', 'newsletter'])
  +    expect(bagian[2]).toMatchObject({ jenis: 'iklan', id: 'i', slot: { id: 'beranda-samping', lebar: 320, tinggi: 100, unit: '5555555555' } })
  +    const mati = susunBeranda(tata, { ...sumber, iklan: { ...iklan, slot: [{ ...iklan.slot[0], aktif: false }] } })
  +    expect(mati.map((b) => b.jenis)).toEqual(['hero', 'terbaru'])
  +    expect(mati[1]).toMatchObject({ jenis: 'terbaru', newsletter })
  +  })
  +
     it('tanpa hero: hero bawaan di atas; hero kedua dibuang; blok kosong dilewati', () => {
       const kosong: SumberBeranda = { terbaru: [], populer: [], video: [], tools: [], newsletter: null }
       const bagian = susunBeranda([blok.video, blok.palingDibaca, { ...blok.mozaik, artikel: [artikel(5, 'draft')] }], kosong)
  ```

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index 938ee8c..4013549 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -332,6 +332,9 @@ await payload.updateGlobal({
       slot: [
         { idSlot: 'artikel-tengah', posisi: 'artikel-tengah', setelahParagraf: 3, ukuran: 'persegi', unit: '1111111111', aktif: true },
         { idSlot: 'artikel-akhir', posisi: 'artikel-akhir', ukuran: 'persegi-besar', unit: '2222222222', aktif: true },
  +      { idSlot: 'rubrik', posisi: 'rubrik', ukuran: 'persegi', unit: '3333333333', aktif: true },
  +      { idSlot: 'tools', posisi: 'tools', ukuran: 'persegi', unit: '4444444444', aktif: true },
  +      { idSlot: 'beranda-samping', posisi: 'beranda', ukuran: 'banner', unit: '5555555555', aktif: true },
       ],
       adsTxtTambahan: ADS_TXT_E2E,
     },
  @@ -353,8 +356,9 @@ await payload.updateGlobal({
         { blockType: 'mozaikPilihan', artikel: [panduan.id, belajar.id, sehat.id, tekno.id] },
         { blockType: 'stripVideo', judul: 'Intinya dalam 45 detik' },
         { blockType: 'palingDibaca', judul: 'Paling dicari pekan ini', jumlah: 4 },
  -      { blockType: 'slotIklan', idSlot: 'beranda-samping' },
         { blockType: 'newsletterBlok' },
  +      // Setelah newsletter: slot di antara tulisan terbaru dan newsletter akan memisahkan kolom samping newsletter.
  +      { blockType: 'slotIklan', idSlot: 'beranda-samping' },
       ],
     },
   })
  ```

  ```diff
  diff --git a/tests/e2e/iklan.spec.ts b/tests/e2e/iklan.spec.ts
  index 3c9bc06..97bb770 100644
  --- a/tests/e2e/iklan.spec.ts
  +++ b/tests/e2e/iklan.spec.ts
  @@ -277,3 +277,58 @@ test('menarik persetujuan: Hanya yang perlu setelah Izinkan semua menghapus cook
     expect(catatan.skrip).toHaveLength(1)
     expect(await iklanTiruan(page)).toBeNull()
   })
  +
  +test('iklan rubrik setelah daftar tulisan, iklan tools setelah penjelasan dan di luar kalkulator, iklan beranda di tempat blok Slot iklan', async ({ page }) => {
  +  await sudahMemilih(page.context(), 'semua')
  +  await cegatIklan(page)
  +  const kotak = async (lokasi: ReturnType<Page['locator']>) => (await lokasi.boundingBox())!
  +
  +  await page.goto('/uang-karier')
  +  const rubrik = page.locator('[data-slot-iklan="rubrik"]')
  +  await expect(rubrik).toBeVisible()
  +  const tulisan = await kotak(page.getByRole('region', { name: 'Tulisan terbaru' }))
  +  expect((await kotak(rubrik)).y).toBeGreaterThan(tulisan.y + tulisan.height)
  +
  +  await page.goto('/tools/gaji-bersih')
  +  const tools = page.locator('[data-slot-iklan="tools"]')
  +  await expect(tools).toBeVisible()
  +  await expect(page.locator('#kalkulator [data-slot-iklan]')).toHaveCount(0)
  +  const kalkulator = await kotak(page.locator('#kalkulator'))
  +  expect((await kotak(tools)).y).toBeGreaterThan(kalkulator.y + kalkulator.height)
  +
  +  await page.goto('/')
  +  const beranda = page.locator('[data-slot-iklan="beranda-samping"]')
  +  await expect(beranda).toBeVisible()
  +  expect(await kotak(beranda.locator('[data-kotak-iklan]'))).toMatchObject({ width: 320, height: 100 })
  +  const populer = await kotak(page.getByRole('region', { name: 'Paling dicari pekan ini' }))
  +  const newsletter = await kotak(page.getByRole('complementary', { name: 'Newsletter' }))
  +  expect((await kotak(beranda)).y).toBeGreaterThan(Math.max(populer.y + populer.height, newsletter.y + newsletter.height))
  +})
  +
  +test('jarak slot iklan beranda sama dengan jarak antarbagian lain (56 px) di 375 dan 1440 px', async ({ page }) => {
  +  await sudahMemilih(page.context(), 'semua')
  +  await cegatIklan(page)
  +  for (const lebar of [375, 1440]) {
  +    await page.setViewportSize({ width: lebar, height: 900 })
  +    await page.goto('/')
  +    // Bagian sebelumnya: tulisan terbaru dengan newsletter di kolom sampingnya (di bawahnya di layar sempit).
  +    const populer = (await page.getByRole('region', { name: 'Paling dicari pekan ini' }).boundingBox())!
  +    const newsletter = (await page.getByRole('complementary', { name: 'Newsletter' }).boundingBox())!
  +    const bawah = Math.max(populer.y + populer.height, newsletter.y + newsletter.height)
  +    const iklan = (await page.locator('[data-slot-iklan="beranda-samping"]').boundingBox())!
  +    expect(Math.round(iklan.y - bawah), `${lebar}px`).toBe(56)
  +  }
  +})
  +
  +for (const path of ['/', '/uang-karier', `/${SLUG.panduan}`, '/tools/gaji-bersih']) {
  +  test(`halaman ${path} dengan iklan terisi di 375 px lolos axe dan tanpa geser horizontal`, async ({ page }) => {
  +    await sudahMemilih(page.context(), 'semua')
  +    await cegatIklan(page)
  +    await page.setViewportSize({ width: 375, height: 812 })
  +    await page.goto(path)
  +    await gulirSampaiBawah(page)
  +    await expect(page.locator('[data-slot-iklan] ins[data-ad-status="filled"]').first()).toBeAttached()
  +    await periksaTanpaGeserHorizontal(page)
  +    await periksaAxe(page)
  +  })
  +}
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/beranda.test.ts` ("slot iklan hanya bila ID slotnya aktif ...") dengan `AssertionError: expected [ 'hero', 'terbaru' ] to deeply equal [ 'hero', 'terbaru', 'iklan', …(1) ]`.

- [ ] **Langkah 3: Slot di rubrik dan tools**

  ```diff
  diff --git a/src/components/rubrik/HalamanRubrik.tsx b/src/components/rubrik/HalamanRubrik.tsx
  index 8fbd284..6a5413f 100644
  --- a/src/components/rubrik/HalamanRubrik.tsx
  +++ b/src/components/rubrik/HalamanRubrik.tsx
  @@ -1,8 +1,11 @@
   import { JsonLd } from '@/components/dasar/JsonLd'
   import { RemahRoti } from '@/components/dasar/RemahRoti'
   import { Tautan } from '@/components/dasar/Tautan'
  +import { SlotIklan } from '@/components/iklan/SlotIklan'
   import { IsiArtikel } from '@/components/isi/IsiArtikel'
   import { DaftarKartu } from '@/components/kartu/KartuArtikel'
  +import { pilihSlot } from '@/modules/iklan/aturan'
  +import type { PengaturanIklan } from '@/modules/iklan/tipe'
   import type { DataRubrik } from '@/modules/konten/tipe'
   import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
   import type { Situs } from '@/modules/seo/tipe'
  @@ -11,9 +14,10 @@ import gaya from './Rubrik.module.css'
   
   /**
    * Halaman rubrik `/{pilar}` dan `/{pilar}/{subkategori}`: kepala berwarna pilar (nama selalu
  - * tertulis), navigasi subkategori, intro pilar dari CMS, lalu kartu tulisan terbaru.
  + * tertulis), navigasi subkategori, intro pilar dari CMS, lalu kartu tulisan terbaru. Slot iklan rubrik
  + * (spesifikasi §11) setelah daftar tulisan, jauh dari navigasi subkategori.
    */
  -export function HalamanRubrik({ rubrik, situs }: { rubrik: DataRubrik; situs: Situs }) {
  +export function HalamanRubrik({ rubrik, situs, iklan = null }: { rubrik: DataRubrik; situs: Situs; iklan?: PengaturanIklan | null }) {
     const subkategori = rubrik.seo.jenis === 'subkategori'
     return (
       <div className={`kontainer ${gaya.halaman}`}>
  @@ -48,6 +52,7 @@ export function HalamanRubrik({ rubrik, situs }: { rubrik: DataRubrik; situs: Si
             <p className={gaya.kosong}>Belum ada tulisan di rubrik ini. Tulisan baru tampil di sini setelah terbit.</p>
           )}
         </section>
  +      <SlotIklan slot={pilihSlot(iklan, 'rubrik')} />
       </div>
     )
   }
  ```

  ```diff
  diff --git a/src/components/tools/HalamanTool.tsx b/src/components/tools/HalamanTool.tsx
  index e8b60a5..ef908b9 100644
  --- a/src/components/tools/HalamanTool.tsx
  +++ b/src/components/tools/HalamanTool.tsx
  @@ -2,11 +2,14 @@ import { ChipPilar } from '@/components/dasar/ChipPilar'
   import { Ikon } from '@/components/dasar/Ikon'
   import { JsonLd } from '@/components/dasar/JsonLd'
   import { RemahRoti } from '@/components/dasar/RemahRoti'
  +import { SlotIklan } from '@/components/iklan/SlotIklan'
   import { BlokSumber } from '@/components/artikel/BlokSumber'
   import { Catatan } from '@/components/artikel/Catatan'
   import { Faq } from '@/components/artikel/Faq'
   import { IsiArtikel } from '@/components/isi/IsiArtikel'
   import type { Hasil, Kalkulator as DataKalkulator } from '@/modules/hitung'
  +import { pilihSlot } from '@/modules/iklan/aturan'
  +import type { PengaturanIklan } from '@/modules/iklan/tipe'
   import { tanggalIndonesia } from '@/modules/konten/artikel'
   import type { DataTool } from '@/modules/konten/tipe'
   import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
  @@ -23,9 +26,22 @@ export const ID_KALKULATOR = 'kalkulator'
    * Halaman `/tools/{slug}` (spesifikasi §4): kalkulator di atas lipatan dengan hasil besar, lalu artikel
    * penjelasan rumus, angka aturan yang dipakai, catatan pilar, sumber aturan, dan FAQ. JSON-LD
    * WebApplication dari modul SEO. Kalkulator menghitung di browser; tanpa JavaScript, form dan hasil
  - * contoh dari server tetap tampil.
  + * contoh dari server tetap tampil. Slot iklan tools (spesifikasi §11) setelah penjelasan rumus: di luar
  + * kalkulator dan tidak berdempetan dengan tombolnya.
    */
  -export function HalamanTool({ tool, kalkulator, contoh, situs }: { tool: DataTool; kalkulator: DataKalkulator; contoh: Hasil | null; situs: Situs }) {
  +export function HalamanTool({
  +  tool,
  +  kalkulator,
  +  contoh,
  +  situs,
  +  iklan = null,
  +}: {
  +  tool: DataTool
  +  kalkulator: DataKalkulator
  +  contoh: Hasil | null
  +  situs: Situs
  +  iklan?: PengaturanIklan | null
  +}) {
     const masukan = { jenis: 'tools', doc: tool.seo } as const
     const pesan = kalkulator.pesan ?? (contoh && !contoh.ok ? contoh.pesan : null)
     return (
  @@ -69,6 +85,7 @@ export function HalamanTool({ tool, kalkulator, contoh, situs }: { tool: DataToo
   
         <div className={gaya.badan}>
           <IsiArtikel isi={tool.penjelasan} cloudName={situs.cloudName} />
  +        <SlotIklan slot={pilihSlot(iklan, 'tools')} />
           <AturanTool dasar={kalkulator.dasar} />
           <Catatan teks={tool.pilar?.disclaimer ?? null} />
           <BlokSumber sumber={tool.sumber} />
  ```

  ```diff
  diff --git a/src/app/(frontend)/[...jalur]/page.tsx b/src/app/(frontend)/[...jalur]/page.tsx
  index 528eaee..3a72b9a 100644
  --- a/src/app/(frontend)/[...jalur]/page.tsx
  +++ b/src/app/(frontend)/[...jalur]/page.tsx
  @@ -49,7 +49,7 @@ export default async function Halaman({ params }: Props) {
       case 'artikel':
         return <HalamanArtikel artikel={hasil.artikel} situs={await muatSitus()} iklan={await muatIklan()} />
       case 'rubrik':
  -      return <HalamanRubrik rubrik={hasil.rubrik} situs={await muatSitus()} />
  +      return <HalamanRubrik rubrik={hasil.rubrik} situs={await muatSitus()} iklan={await muatIklan()} />
       case 'halaman':
         return <HalamanStatis halaman={hasil.halaman} situs={await muatSitus()} />
       default:
  ```

  ```diff
  diff --git a/src/app/(frontend)/tools/[slug]/page.tsx b/src/app/(frontend)/tools/[slug]/page.tsx
  index 4ef6191..cb9f717 100644
  --- a/src/app/(frontend)/tools/[slug]/page.tsx
  +++ b/src/app/(frontend)/tools/[slug]/page.tsx
  @@ -3,6 +3,7 @@ import { cache } from 'react'
   
   import { HalamanTool } from '@/components/tools/HalamanTool'
   import { pathFor } from '@/lib/paths'
  +import { muatIklan } from '@/modules/iklan'
   import { muatSitus, muatTool, susunKalkulator, tanganiTidakAda } from '@/modules/konten'
   import { metadata, metadataTidakDitemukan } from '@/modules/seo'
   
  @@ -30,5 +31,5 @@ export default async function Tool({ params }: Props) {
     const { kalkulator, contoh } = susunKalkulator(tool, new Date())
     for (const peringatan of kalkulator.peringatan) console.warn(`[hitung] ${tool.toolId}: ${peringatan}`)
     if (kalkulator.pesan) console.error(`[hitung] ${tool.toolId}: ${kalkulator.pesan}`)
  -  return <HalamanTool tool={tool} kalkulator={kalkulator} contoh={contoh} situs={await muatSitus()} />
  +  return <HalamanTool tool={tool} kalkulator={kalkulator} contoh={contoh} situs={await muatSitus()} iklan={await muatIklan()} />
   }
  ```

- [ ] **Langkah 4: Slot di beranda**

  ```diff
  diff --git a/src/modules/konten/tipe.ts b/src/modules/konten/tipe.ts
  index b770952..d9518f9 100644
  --- a/src/modules/konten/tipe.ts
  +++ b/src/modules/konten/tipe.ts
  @@ -1,5 +1,6 @@
   import type { TipeArtikel, ToolId, WarnaPilar } from '@/lib/konstanta'
   import type { ParameterTersimpan, TeksIsian } from '@/modules/hitung'
  +import type { SlotSiap } from '@/modules/iklan/tipe'
   import type { IsiDokumen } from '@/modules/seo/lexical'
   import type { ArtikelSeo, HalamanSeo, PenulisSeo, PilarSeo, SubkategoriSeo, ToolsSeo, VideoSeo } from '@/modules/seo/tipe'
   import type { Video } from '@/payload-types'
  @@ -159,3 +160,4 @@ export type BagianBeranda =
     | { jenis: 'video'; id: string; judul: string; video: KartuVideo[] }
     | { jenis: 'terbaru'; id: string; judul: string; artikel: KartuArtikel[]; newsletter: DataNewsletter | null }
     | { jenis: 'newsletter'; id: string; newsletter: DataNewsletter }
  +  | { jenis: 'iklan'; id: string; slot: SlotSiap }
  ```

  ```diff
  diff --git a/src/modules/konten/beranda.ts b/src/modules/konten/beranda.ts
  index 8696f5e..0132b1f 100644
  --- a/src/modules/konten/beranda.ts
  +++ b/src/modules/konten/beranda.ts
  @@ -1,3 +1,5 @@
  +import { pilihSlot } from '@/modules/iklan/aturan'
  +import type { PengaturanIklan } from '@/modules/iklan/tipe'
   import type { Artikel, Beranda, Newsletter, Video } from '@/payload-types'
   
   import { kartuArtikel } from './artikel'
  @@ -42,6 +44,8 @@ export type SumberBeranda = {
     video: KartuVideo[]
     tools: ItemTools[]
     newsletter: DataNewsletter | null
  +  /** Global iklan: blok Slot iklan hanya menjadi bagian bila slotnya aktif (`pilihSlot`). */
  +  iklan?: PengaturanIklan | null
   }
   
   type Blok = NonNullable<Beranda['tataLetak']>[number]
  @@ -82,7 +86,8 @@ function kartuStrip(relasi: (number | Video)[] | null | undefined): KartuVideo[]
    *   ikut. Bila belum cukup: tulisan terbaru di luar mozaik dengan judul `JUDUL_TERBARU`.
    * - Newsletter hanya bila global `newsletter` aktif; bila tepat setelah tulisan terbaru, ia menjadi
    *   kolom samping blok itu (seperti mockup).
  - * - Slot iklan belum dirender (Rencana 8) supaya tidak ada ruang kosong.
  + * - Slot iklan hanya bila ID slotnya aktif di global iklan dengan posisi beranda; selain itu dilewati,
  + *   jadi blok slot yang tidak dipakai tidak memisahkan tulisan terbaru dari newsletter.
    * - Blok yang isinya kosong dilewati.
    */
   export function susunBeranda(tataLetak: Blok[], sumber: SumberBeranda): BagianBeranda[] {
  @@ -135,8 +140,11 @@ export function susunBeranda(tataLetak: Blok[], sumber: SumberBeranda): BagianBe
           else bagian.push({ jenis: 'newsletter', id, newsletter })
           break
         }
  -      case 'slotIklan':
  +      case 'slotIklan': {
  +        const slot = pilihSlot(sumber.iklan, 'beranda', blok.idSlot)
  +        if (slot) bagian.push({ jenis: 'iklan', id, slot })
           break
  +      }
       }
     }
     if (!adaHero) bagian.unshift({ jenis: 'hero', id: 'hero-bawaan', ...HERO_BAWAAN })
  ```

  ```diff
  diff --git a/src/modules/konten/data.ts b/src/modules/konten/data.ts
  index 3c5ff9e..c61f9fb 100644
  --- a/src/modules/konten/data.ts
  +++ b/src/modules/konten/data.ts
  @@ -3,6 +3,7 @@ import type { Payload, Where } from 'payload'
   import type { Artikel } from '@/payload-types'
   import { validasiFormatSlug } from '@/lib/slug'
   import { sumberParameter } from '@/modules/hitung'
  +import { ambilIklan } from '@/modules/iklan/data'
   
   import { gabungTerkait, kartuArtikel, MAKS_TERKAIT, susunArtikel } from './artikel'
   import { MAKS_TERBARU_BERANDA, MAKS_VIDEO_BERANDA, susunBeranda, susunNewsletter } from './beranda'
  @@ -388,6 +389,7 @@ export async function ambilBeranda(payload: Payload): Promise<BagianBeranda[]> {
       video: await kartuVideoTerbit(payload, [], MAKS_VIDEO_BERANDA),
       tools: (await ambilTools(payload)).flatMap((k) => k.tools),
       newsletter: susunNewsletter(newsletter),
  +    iklan: await ambilIklan(payload),
     })
   }
   
  ```

  ```diff
  diff --git a/src/modules/konten/cache.ts b/src/modules/konten/cache.ts
  index a2763a1..038a1f7 100644
  --- a/src/modules/konten/cache.ts
  +++ b/src/modules/konten/cache.ts
  @@ -158,10 +158,10 @@ export const muatCari = unstable_cache(async (kueri: string) => cariArtikel(awai
   /**
    * Beranda. Tag `beranda` dibuang saat global beranda atau newsletter disimpan dan saat artikel, pilar,
    * video, atau tools terbit (`tagRevalidasi`); `media` untuk poster video; `analitik` setiap sinkron
  - * Search Analytics ("Paling dicari pekan ini").
  + * Search Analytics ("Paling dicari pekan ini"); `iklan` saat global iklan disimpan (blok Slot iklan).
    */
   export const muatBeranda = unstable_cache(async () => ambilBeranda(await payload()), ['konten', 'beranda'], {
  -  tags: [TAG.beranda, TAG.media, TAG.analitik],
  +  tags: [TAG.beranda, TAG.media, TAG.analitik, TAG.iklan],
     revalidate: SEJAM,
   })
   
  ```

  ```diff
  diff --git a/src/components/beranda/Beranda.tsx b/src/components/beranda/Beranda.tsx
  index 1ea95f7..1be958f 100644
  --- a/src/components/beranda/Beranda.tsx
  +++ b/src/components/beranda/Beranda.tsx
  @@ -1,4 +1,5 @@
   import { JsonLd } from '@/components/dasar/JsonLd'
  +import { SlotIklan } from '@/components/iklan/SlotIklan'
   import type { BagianBeranda } from '@/modules/konten/tipe'
   import { jsonLd } from '@/modules/seo/jsonld'
   import type { Situs } from '@/modules/seo/tipe'
  @@ -13,7 +14,8 @@ import { TerbaruBeranda } from './TerbaruBeranda'
   /**
    * Beranda "Kartu Intinya": bagian dirender sesuai urutan editor. Setiap bagian membawa kontainernya
    * sendiri (strip video selebar layar) dan jarak atas yang sama, jadi urutan apa pun tidak membuat
  - * celah ganda.
  + * celah ganda. Slot iklan memakai kelas jarak yang sama dan tidak menempati ruang sebelum pengunjung
  + * memilih Izinkan semua.
    */
   export function Beranda({ bagian, situs }: { bagian: BagianBeranda[]; situs: Situs }) {
     return (
  @@ -35,6 +37,8 @@ export function Beranda({ bagian, situs }: { bagian: BagianBeranda[]; situs: Sit
                   <KotakNewsletter newsletter={b.newsletter} id={b.id} lepas />
                 </div>
               )
  +          case 'iklan':
  +            return <SlotIklan key={b.id} slot={b.slot} className={`kontainer ${gaya.bagian}`} />
           }
         })}
       </>
  ```

  ```diff
  diff --git a/src/blocks/beranda.ts b/src/blocks/beranda.ts
  index c6e25c8..242b505 100644
  --- a/src/blocks/beranda.ts
  +++ b/src/blocks/beranda.ts
  @@ -84,7 +84,7 @@ export const BlokSlotIklan: Block = {
         name: 'idSlot',
         type: 'text',
         required: true,
  -      admin: { description: 'ID slot dari pengaturan iklan (Rencana 8).' },
  +      admin: { description: 'ID slot di global Iklan dengan posisi Beranda. Slot yang tidak aktif tidak ditampilkan.' },
       },
     ],
   }
  ```

  Buat ulang tipe (deskripsi blok berubah):

  ```bash
  npm run generate:types
  ```

- [ ] **Langkah 5: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 499 tes (73 file); integrasi 145 tes (43 file); E2E 133 tes.

- [ ] **Langkah 6: Commit**

  ```bash
  git add "src/app/(frontend)/[...jalur]/page.tsx" "src/app/(frontend)/tools/[slug]/page.tsx" src/blocks/beranda.ts src/components/beranda/Beranda.tsx src/components/rubrik/HalamanRubrik.tsx src/components/tools/HalamanTool.tsx src/modules/konten/beranda.ts src/modules/konten/cache.ts src/modules/konten/data.ts src/modules/konten/tipe.ts src/payload-types.ts tests/e2e/iklan.spec.ts tests/e2e/siapkan.ts tests/unit/beranda.test.ts
  git commit -m "feat(iklan): slot iklan rubrik setelah daftar tulisan, tools setelah penjelasan (di luar kalkulator), dan beranda di tempat blok Slot iklan bila slotnya aktif"
  ```

---

### Task 9: Iklan, persetujuan, dan admin Indonesia di CLAUDE.md dan spesifikasi, lalu pemeriksaan akhir

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-11-03-point-lat-design.md`

**Interfaces:**
- Consumes: semua task sebelumnya.
- Produces: aturan proyek untuk agen dan pengembang berikutnya (modul `iklan`: `muatIklan`, `pilihSlot`, posisi dan ukuran tetap, slot dari halaman, persetujuan di browser lewat skrip awal dan atribut `<html>`, banner dan "Pengaturan cookie", "Hanya yang perlu" tanpa skrip iklan, pemuat setelah persetujuan, `/ads.txt`, `cegatIklan` dan ID penerbit tiruan di tes; admin hanya berbahasa Indonesia, label tes admin, `getByLabel` dengan `exact`, avatar tanpa Gravatar, format tanggal admin; tag `iklan`; anggaran JS tata letak), dan spesifikasi yang sesuai keputusan rencana ini (§5 modul `iklan`, §6 global `iklan`, §11, §18 butir 8).

- [ ] **Langkah 1: Perbarui CLAUDE.md dan spesifikasi**

  ```diff
  diff --git a/CLAUDE.md b/CLAUDE.md
  index aa9e517..67a31f3 100644
  --- a/CLAUDE.md
  +++ b/CLAUDE.md
  @@ -31,25 +31,27 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Satu file satu tanggung jawab. Koleksi di `src/collections/`, global di `src/globals/`, blok di `src/blocks/`, field bersama di `src/fields/`, hook di `src/hooks/`, akses di `src/access/`.
   - Path publik selalu dibangun lewat `pathFor()` di `src/lib/paths.ts`, jangan merangkai string URL manual. Halaman indeks memakai `PATH_INDEKS` (`/cari`, `/glosarium`, `/tools`, `/video`).
   - SEO selalu lewat `src/modules/seo`: `metadata()` untuk `generateMetadata`, `jsonLd()` + `serialisasiJsonLd()` untuk JSON-LD, `remahRoti()` untuk breadcrumb, `ambilSitus()` untuk pengaturan situs. Jangan menulis `<title>`, canonical, robots, atau JSON-LD manual di halaman. Rute teknis (`/sitemap.xml`, `/sitemap/{jenis}.xml`, `/news-sitemap.xml`, `/robots.txt`, `/feed.xml`) ada di `src/app/(frontend)/` dan hanya merangkai fungsi modul.
  -- Tag cache di `src/lib/tag.ts` (`TAG`): data halaman publik di-cache dengan tag yang sama dengan yang direvalidasi hook `revalidasiPublik` (`{koleksi}`, `{koleksi}:{id}`, `pilar:{slug}`, `beranda`, `sitemap`, `pengaturan-seo`, `header`, `footer`, `media`, `redirect`, `parameter-tools`, `analitik`). Koleksi publik baru wajib memasang `revalidasiPublik(koleksi)`. Tag `beranda` dibuang global `beranda` dan `newsletter` serta terbitnya artikel, pilar, video, dan tools; koleksi yang baru tampil di beranda ditambahkan ke `DI_BERANDA`.
  +- Tag cache di `src/lib/tag.ts` (`TAG`): data halaman publik di-cache dengan tag yang sama dengan yang direvalidasi hook `revalidasiPublik` (`{koleksi}`, `{koleksi}:{id}`, `pilar:{slug}`, `beranda`, `sitemap`, `pengaturan-seo`, `header`, `footer`, `media`, `redirect`, `parameter-tools`, `analitik`, `iklan`). Koleksi publik baru wajib memasang `revalidasiPublik(koleksi)`. Tag `beranda` dibuang global `beranda` dan `newsletter` serta terbitnya artikel, pilar, video, dan tools; koleksi yang baru tampil di beranda ditambahkan ke `DI_BERANDA`. Tag `iklan` dibuang global `iklan` (layout, halaman berslot iklan, beranda, `/ads.txt`).
   - Mesin Indexing di `src/modules/indexer`: `kabari(payload, kabar, { req })` memasukkan kabar ke antrean Postgres (koleksi `antrean-indexing`), `jalankanIndexer(payload)` mengirimnya (cron `GET /api/jobs/run` dengan `CRON_SECRET` setiap 10 menit, dan `after()` setelah simpan), log di `log-indexing`, status Google di `status-indeks`. Ketiga koleksi itu hanya ditulis modul indexer dan hanya dibaca admin. Koleksi berhalaman publik baru memasang `kabariMesinPencari(keTarget)` dari `src/hooks/kabariMesinPencari.ts` setelah hook revalidasi (beforeChange, afterChange, afterDelete). Aturan (jendela kirim, jeda ulang, kuota, jadwal cek) sebagai fungsi murni di `aturan.ts` dengan waktu sebagai argumen. Semua panggilan ke Google dan IndexNow lewat adapter (`asli.ts` dengan `fetch` dan JWT akun layanan tanpa pustaka, `palsu.ts` dalam memori), dipilih env `INDEXER_ADAPTER` (`asli` hanya di produksi; dev dan tes memakai palsu; build produksi yang dijalankan tanpa nilai itu ditolak). Tes memakai `adapterPalsu()` + `pakaiAdapterIndexer()` dan opsi `sekarang`. Hapus dan update massal Payload menjalankan hook setiap dokumen secara paralel dalam satu transaksi: `kabari` dengan `req` yang sama berjalan bergiliran, baris antrean baru dibuat lewat `INSERT ... ON CONFLICT DO NOTHING` di sesi transaksi `req` (jangan `payload.create` untuk koleksi dengan kunci unik yang bisa ditulis bersamaan), dan SQL langsung di dalam hook wajib memakai sesi transaksi itu, bukan koneksi pool lain (deadlock). Tes `indexer-bersamaan.int.spec.ts` menjaganya.
   - Pantau SEO di `src/modules/pantau` (spesifikasi §8 "Dashboard SEO"): `jalankanPantau(payload)` dipanggil cron yang sama setelah Mesin Indexing dan menjalankan tugas harian yang jatuh tempo (sinkron Search Analytics beserta retensi log indexing 90 hari, dan pindai tautan), lalu memeriksa paling banyak 10 tautan luar yang jatuh tempo per jalan (masing-masing seminggu sekali). Tugas diklaim atomik di `tugas-seo` (cron dobel tidak menjalankan dua kali). Data di koleksi tersembunyi `analitik-halaman`, `analitik-situs`, `tugas-seo`, `temuan-tautan`, dan `tautan-luar`: hanya ditulis modul pantau, dibaca dashboard admin `/admin/seo` lewat `ambilDashboard()` (tautan di atas menu admin dan kartu di halaman awal admin lewat `beforeDashboard`; kisi dashboard paling banyak dua kolom), kecuali `analitik-halaman` yang juga dibaca modul konten (`ambilPopuler`, tag `analitik`) untuk "Paling dicari pekan ini". Search Analytics dan pemeriksa tautan lewat adapter pantau (`asli.ts` memakai token akun layanan dari `indexer/google.ts`, `palsu.ts` dalam memori), dengan saklar `INDEXER_ADAPTER` yang sama; adapter palsu melewati sinkron (data tersimpan tidak tertimpa). Tes memakai `adapterPalsu()` (`dataAnalitik`, `jawabanTautan`), opsi `sekarang`, dan opsi `tugas`. Tanggal Search Analytics adalah tanggal kalender waktu Pasifik (`tanggalPasifik`). Tautan masuk untuk halaman yatim dihitung dari isi Lexical dokumen terbit, relasi pilihan editor, menu header dan footer, dan pilihan beranda; daftar otomatis (rubrik, terbaru, terkait otomatis) tidak dihitung. URL halaman admin lewat `urlAdmin` di `src/lib/admin.ts`.
   - Asisten AI di `src/modules/ai` (spesifikasi §10): `jalankan(payload, tugas, masukan, opsi)` satu-satunya pintu ke Claude untuk tugas `brief`, `draf`, dan `meta` (endpoint `POST /api/artikel/asisten`, status di `GET /api/artikel/asisten`, hanya admin dan editor). Di dalamnya: saklar global `asisten-ai`, batas 6 permintaan per menit per pengguna (dihitung dari `log-ai`), harga model dari global, cadangan anggaran atomik di koleksi tersembunyi `pemakaian-ai` (satu baris per bulan waktu Jakarta, `UPDATE ... WHERE terpakai + cadangan <= batas RETURNING` lewat koneksi pool, bukan transaksi `req`), log `log-ai` (tanpa teks masukan dan keluaran, disimpan 13 bulan), lalu pemeriksa jawaban. Prompt, skema JSON (structured outputs: semua properti wajib, `additionalProperties: false`, tanpa batasan panjang), dan pemeriksa per tugas di `prompt/{brief,draf,meta}.ts` sebagai fungsi murni; data database untuk brief di `brief-data.ts` (memakai `artikelLain`, `cariKanibalisasi`, dan `sarankanLink` panel SEO). Prompt dan keluaran mengikuti aturan copy: keluaran model dibersihkan dari em dash dan en dash (`bersihkanTanda`) dan editor diberi tahu jumlahnya. Cek pola tulisan AI (`pola.ts`) dan cek klaim (`klaim.ts`) fungsi murni yang berjalan di browser dari isian form (`blokArtikel`), tanpa API dan tanpa log. Adapter dipilih env `AI_ADAPTER` (`asli` lewat `fetch` ke Messages API dengan `ANTHROPIC_API_KEY`, `palsu` dalam memori; dev dan tes palsu, produksi tanpa nilai itu ditolak dengan pesan), terpisah dari `INDEXER_ADAPTER`. Model per tugas lewat `AI_MODEL_{BRIEF,DRAF,META}` atau `AI_MODEL` (bawaan Sonnet untuk brief dan draf, Haiku untuk meta). Tes memakai `adapterPalsu()` + `pakaiAdapterAi()` dan opsi `sekarang` (bulan lampau supaya baris anggaran milik tes sendiri); E2E memakai pengguna editor baru per tes yang memanggil AI dan menghapus draf buatannya setelah setiap tes (spec lain membaca daftar artikel admin). AI hanya memberi saran: sidebar (`admin/AsistenAi.tsx`) menerapkan isian hanya lewat tombol dengan Batalkan, draf per bagian disalin (bukan disisipkan), dan menerapkan Intinya atau FAQ atau menyalin draf menyalakan `pakaiDrafAi` (setelah tersimpan menyala tidak bisa dimatikan lagi, juga lewat API dan update massal: hook `beforeValidate` `tetapPakaiDrafAi`); artikel itu wajib mencentang checklist `reviewAi` sebelum terbit (validasi field, jadi berlaku juga untuk terbit massal dan terjadwal) dan tombol terbit nonaktif sampai lengkap (`admin/TombolTerbit.tsx`). Sidebar menyebut bahwa teks dikirim ke Claude (Anthropic).
  +- Iklan dan persetujuan cookie di `src/modules/iklan` (spesifikasi §11): pengaturan dari global `iklan` lewat `muatIklan()` (cache bertag `iklan`), dan `pilihSlot(pengaturan, posisi, id?)` satu-satunya aturan apakah slot tampil (global menyala, AdSense, ID penerbit `ca-pub-` 16 angka, slot aktif, unit angka). Posisi tetap per jenis halaman (`artikel-tengah` setelah paragraf ke-N lewat `sisipkanIklanTengah` dan node Lexical `slotIklan`, `artikel-akhir`, `rubrik`, `tools`, dan `beranda` lewat blok Slot iklan); tidak ada posisi di kotak Intinya, di atas H1, atau di dalam kalkulator. Ukuran tetap (300 x 250, 336 x 280, 320 x 100), jadi `SlotIklan` memesan ruangnya dan iklan tidak menggeser isi (CLS 0); halaman meneruskan `iklan={await muatIklan()}` ke komponennya, beranda lewat `susunBeranda` (`sumber.iklan`). Persetujuan dibaca di browser, bukan di server, supaya halaman tetap ISR: skrip awal di `<head>` (`SkripPersetujuan`, `skripAwal()`) menolak semua sinyal Consent Mode v2 lalu menandai `<html data-persetujuan="belum|perlu|semua">` dari cookie `persetujuan` (versi, pilihan, tanggal; 12 bulan), dan CSS menampilkan banner atau slot dari atribut itu sejak paint pertama. Banner (`PanelPersetujuan`) di atas header, dua pilihan setara; "Hanya yang perlu" berarti tanpa skrip iklan sama sekali; "Pengaturan cookie" di footer membukanya lagi, dan menarik persetujuan menghapus cookie AdSense di domain situs (`KUKI_IKLAN_SITUS`: `__gads`, `__gpi`, `__gpi_optout`, `__eoi`) lalu memuat ulang halaman. `PemuatIklan` (layout) memuat `adsbygoogle.js` hanya setelah "Izinkan semua" dan saat slot hampir terlihat; kode penyedia hanya di `adsense.ts`. Banner, skrip awal, dan pemuat hanya ada bila `iklanSiap`. `/ads.txt` dari global (baris AdSense otomatis dari ID penerbit dan baris tambahan editor), 404 bila tidak ada baris. Tes tidak memanggil Google: E2E memakai `cegatIklan()` (skrip AdSense tiruan yang mencatat `dataLayer` dan mengisi unit) dan ID penerbit tiruan `ca-pub-0000000000000000`; database E2E menyalakan iklan, jadi semua spec berjalan dengan banner.
  +- Admin Payload hanya berbahasa Indonesia (`src/lib/bahasa-admin.ts`, `payload/i18n/id`); teks editor Lexical yang belum diterjemahkan Payload ditambahkan di sana (tes integrasi `admin-bahasa` menjaga tidak ada kunci mentah). Tes E2E admin memakai label Indonesia ("Simpan", "Buka Menu", "Publikasikan perubahan"), dan `getByLabel` dengan `exact` bila label pendek (tautan menu "Keluar"). Avatar admin `'default'` (admin tidak memanggil Gravatar) dan tanggal admin `d MMMM yyyy, HH.mm`.
   - Deskripsi field bawaan Payload (`admin.description`) memakai warna redup yang gagal kontras axe; teks penjelasan di komponen admin buatan sendiri ditulis di komponen dengan warna tema `--theme-text` atau `--theme-elevation-650`, dan field baru yang tetap memakai `admin.description` diberi warna lewat kelas `.field-description-{nama}` (contoh `pakaiDrafAi` di `admin/review.scss`). Axe E2E untuk deskripsi itu memakai kelas tersebut: id `field-{nama}` pada checkbox ada di input, bukan di pembungkus field. State form admin menyimpan field array tanpa baris sebagai angka 0, bukan array kosong: periksa `Array.isArray` sebelum memakai nilai dari `getData()`. Isi grup di sidebar Payload baru dirender saat terlihat (`RenderIfInViewport`), jadi tes E2E menggulirnya dulu.
   - Nilai di `req.context` yang dihitung dengan `await` operasi Payload ditulis setelah `await` selesai (simpan ke variabel dulu): operasi Payload dengan `req` bisa mengganti objek `req.context`, sehingga `req.context[k] = await ...` hilang.
   - URL media selalu lewat `src/modules/media` (`bangunUrl`, `propsGambar`, `urlOg`), jangan merangkai URL Cloudinary manual. `next/image` memakai loader kustom Cloudinary, jadi `src` harus URL dari `bangunUrl`/`propsGambar` dan `width`/`height` wajib diisi.
   - Media disimpan di Cloudinary (folder `point/gambar`, `point/video`). Tanpa `CLOUDINARY_*` di env (lokal, tes) dipakai klien palsu dalam memori: file tidak tersimpan permanen. Tes tidak boleh memanggil jaringan.
   - Halaman publik di `src/app/(frontend)/` dirender ISR: rute dinamis memakai `generateStaticParams` yang mengembalikan `[]`, dan data diambil lewat `muat*()` dari `src/modules/konten` (cache bertag `TAG`). Path tanpa dokumen diakhiri `tanganiTidakAda(path)` di komponen halaman (redirect dari koleksi `redirect` atau 404), sedangkan `generateMetadata` mengembalikan `metadataTidakDitemukan()` untuk path itu.
   - Rute catch-all `[...jalur]` mencari dokumen lewat `muatJalur()`: satu segmen artikel, pilar, lalu halaman statis; dua segmen subkategori di bawah pilarnya. Redirect otomatis saat path berubah lewat `terapkanRedirect` (`src/hooks/redirectSaatPathBerubah.ts`): koleksi berpath sederhana memakai `redirectSaatPathBerubah`, subkategori (path bergantung slug pilar) memakai `src/hooks/redirectSubkategori.ts`, termasuk saat pilar berganti slug. Jenis halaman tingkat atas baru ditambahkan di `muatJalur`, bukan sebagai rute bersaudara. `/cari` satu-satunya halaman dinamis (membaca `searchParams`, noindex); hasilnya di-cache per kueri.
  -- Beranda dirender dari global `beranda` lewat `susunBeranda()`: urutan blok dari editor, tanpa data palsu (blok "Paling dicari" menampilkan artikel dengan klik Google 7 hari terbanyak bila datanya cukup untuk semua tempat, selain itu tulisan terbaru dengan judul "Tulisan terbaru", aturan `daftarPopuler` yang juga dipakai halaman 404; newsletter hanya tautan ke form penyedia, slot iklan belum dirender).
  +- Beranda dirender dari global `beranda` lewat `susunBeranda()`: urutan blok dari editor, tanpa data palsu (blok "Paling dicari" menampilkan artikel dengan klik Google 7 hari terbanyak bila datanya cukup untuk semua tempat, selain itu tulisan terbaru dengan judul "Tulisan terbaru", aturan `daftarPopuler` yang juga dipakai halaman 404; newsletter hanya tautan ke form penyedia, blok Slot iklan dirender bila slotnya aktif di global `iklan`).
   - Kalkulator: semua rumus di `src/modules/hitung` sebagai fungsi murni. `hitung(toolId, masukan, tanggal, parameter, teks)` satu-satunya titik masuk perhitungan (dipakai sama di server dan browser), `siapkanKalkulator` untuk halaman, `periksaParameter` untuk validasi koleksi `parameter-tools`. Rumus per tool di file sendiri (`gaji-bersih.ts`, `thr.ts`, ...). Angka aturan (tarif, PTKP, batas iuran, kategori, konversi) tidak pernah ditulis sebagai konstanta di kode: definisikan kuncinya di `parameter` rumusnya, isi nilainya lewat `src/seed/parameter-tools.ts` dengan sumber resmi dan tanggal berlaku, dan uji dengan contoh perhitungan dari sumber resmi. Parameter yang tidak berlaku untuk tanggal hitung memakai parameter terakhir yang valid dengan peringatan.
   - Halaman `/tools/{slug}` ISR: hasil contoh untuk isi form awal dirender server (tampil tanpa JavaScript), `Kalkulator` (klien) menghitung di browser. Label dan bantuan isian dari CMS (`bantuanInput`) diteruskan ke `hitung` lewat `teks`, jadi pesan galat memakai label yang sama dengan form. Angka hasil baru memakai animasi CSS, tanpa GSAP.
  -- Komponen UI publik di `src/components/`, server component kecuali benar-benar butuh browser (`'use client'` seperti `Catat404`, `PemicuMasuk`, `Kalkulator`, dan `TautanAktif`). Gaya di CSS Module di sebelah komponen dan memakai token semantik dari `src/styles/tokens.css` (`--teks`, `--latar`, `--permukaan`, `--latar-terbalik`, `--teks-terbalik`, `--pilar`, `--ruang-*`, `--durasi-*`), bukan hex atau token primitif. Animasi hanya `transform` dan `opacity`, dan semuanya mati di `prefers-reduced-motion: reduce`. Reveal judul beranda memakai animasi CSS, tanpa JavaScript.
  +- Komponen UI publik di `src/components/`, server component kecuali benar-benar butuh browser (`'use client'` seperti `Catat404`, `PemicuMasuk`, `Kalkulator`, `TautanAktif`, `PanelPersetujuan`, dan `PemuatIklan`). Gaya di CSS Module di sebelah komponen dan memakai token semantik dari `src/styles/tokens.css` (`--teks`, `--latar`, `--permukaan`, `--latar-terbalik`, `--teks-terbalik`, `--pilar`, `--ruang-*`, `--durasi-*`), bukan hex atau token primitif. Animasi hanya `transform` dan `opacity`, dan semuanya mati di `prefers-reduced-motion: reduce`. Reveal judul beranda memakai animasi CSS, tanpa JavaScript.
   - Tata letak yang isinya diatur editor (jumlah blok, kartu, atau bagian berubah) tidak boleh bergantung pada jumlah elemen, misalnya `grid-row: span N`. Jarak antarbagian hanya dari `gap` atau satu kelas margin, dan dijaga tes E2E yang mengukur jaraknya.
   - Tautan internal lewat komponen `Tautan` (`next/link` untuk path situs). Warna pilar lewat atribut `data-warna` (nilai field `warna` pilar) dan selalu bersama nama pilarnya. Ikon lewat `Ikon` (path Lucide yang disalin, tanpa paket ikon).
   - Copy UI: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru. Angka lewat `Intl.NumberFormat('id-ID')` (`teksAngka` modul hitung); rupiah dari `Intl` memakai spasi tak putus setelah "Rp", jadi di kode dan tes tulis `\u00a0`, jangan karakter aslinya. Begitu juga em dash dan en dash yang dibutuhkan kode dan tes (pembersih dan cek pola asisten AI): tulis `\u2014` dan `\u2013`.
   - Tes unit di `tests/unit/*.test.ts`, tes integrasi di `tests/int/*.int.spec.ts` dan memakai `getTestPayload()` + `unik()` dari `tests/int/helpers.ts`.
  -- Tes E2E di `tests/e2e/*.spec.ts` memakai `cegatCloudinary()` (gambar tanpa jaringan) dan `periksaAxe()` (WCAG 2.2 AA) dari `tests/e2e/bantu.ts`; data contohnya di `tests/e2e/siapkan.ts` (termasuk klik Google contoh `KLIK_CONTOH` dan total harian `HARI_CONTOH` untuk "Paling dicari" dan dashboard SEO). Anggaran JavaScript (total di bawah 160 KiB per halaman, spesifikasi §12) dijaga `motion.spec.ts` untuk setiap jenis halaman; jenis halaman baru ditambahkan ke daftarnya. JS kalkulator di atas JS artikel dijaga di bawah 25 KB. Kalkulator diuji di `kalkulator.spec.ts` (enam tools dari `TOOLS_CONTOH` di tiga ukuran layar) dan `hitung.spec.ts` (contoh resmi DJP lewat form).
  +- Tes E2E di `tests/e2e/*.spec.ts` memakai `cegatCloudinary()` (gambar tanpa jaringan) dan `periksaAxe()` (WCAG 2.2 AA) dari `tests/e2e/bantu.ts`; data contohnya di `tests/e2e/siapkan.ts` (termasuk klik Google contoh `KLIK_CONTOH` dan total harian `HARI_CONTOH` untuk "Paling dicari" dan dashboard SEO). Anggaran JavaScript (total di bawah 160 KiB per halaman, hanya skrip dari situs sendiri, spesifikasi §12) dijaga `motion.spec.ts` untuk setiap jenis halaman; jenis halaman baru ditambahkan ke daftarnya. JS kalkulator di atas JS artikel dijaga di bawah 25 KB, chunk JS tata letak milik point. (banner persetujuan, pemuat iklan, animasi masuk, menu aktif) di bawah 8 KiB, dan keduanya bersama di bawah 25 KB. Kalkulator diuji di `kalkulator.spec.ts` (enam tools dari `TOOLS_CONTOH` di tiga ukuran layar) dan `hitung.spec.ts` (contoh resmi DJP lewat form).
   
   ## Batasan
   - Jangan commit `.env`. `.env.test` boleh di-commit karena hanya untuk database tes lokal dan tidak boleh berisi `CLOUDINARY_*`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `CRON_SECRET`, `INDEXER_ADAPTER=asli`, `ANTHROPIC_API_KEY`, atau `AI_ADAPTER=asli`. Kredensial Google dan kunci API Claude hanya di env server Vercel, tidak pernah di CMS, log, atau tes.
  ```

  ```diff
  diff --git a/docs/superpowers/specs/2026-11-03-point-lat-design.md b/docs/superpowers/specs/2026-11-03-point-lat-design.md
  index 4e67851..62e83dd 100644
  --- a/docs/superpowers/specs/2026-11-03-point-lat-design.md
  +++ b/docs/superpowers/specs/2026-11-03-point-lat-design.md
  @@ -145,7 +145,7 @@ Vercel Cron ──► /api/jobs/run setiap 10 menit (header rahasia)
   | `seo` | `metadata(doc)`, `jsonLd(doc)`, `analisis(doc) → daftar cek` | aturan judul/meta, canonical, robots, schema per tipe, skor checklist | (tidak ada seam, fungsi murni) |
   | `hitung` | `hitung(toolId, input, tanggal) → hasil + rincian` | rumus per tool, pemilihan parameter sesuai tanggal berlaku | (fungsi murni, parameter dari CMS) |
   | `media` | `unggah(file) → {publicId, meta}`, `url(publicId, preset)` | tanda tangan upload, preset transformasi, OG image | `cloudinary` (adapter `@payloadcms/plugin-cloud-storage`), `palsu` untuk tes |
  -| `iklan` | `<SlotIklan id="..."/>` | baca pengaturan slot, cek persetujuan, lazy-load saat terlihat, tinggi dipesan | penyedia iklan (AdSense) |
  +| `iklan` | `pilihSlot(pengaturan, posisi, id?)` dan `<SlotIklan slot={...}/>` (pengaturan dari `muatIklan()`); `skripAwal()`, banner persetujuan, dan `PemuatIklan` di layout; `isiAdsTxt` untuk `/ads.txt` | syarat slot tampil, posisi dan ukuran tetap, iklan tengah artikel setelah paragraf ke-N, persetujuan di browser (cookie bertanggal dan berversi, Consent Mode v2), lazy-load setelah persetujuan dan saat slot hampir terlihat, ruang dipesan | penyedia iklan AdSense (`adsense.ts`; tes mencegat domainnya di browser) |
   | `ai` | `jalankan(payload, tugas, masukan, opsi)` untuk brief, draf per bagian, dan generator meta (endpoint `/api/artikel/asisten`); `periksaPola(blok)` dan `periksaKlaim(blok, sumber)` di browser | prompt, skema JSON, dan pemeriksa per tugas, batas 6 permintaan per menit per pengguna, cadangan anggaran bulanan atomik (US$, waktu Jakarta), log, pembersih em dash dan en dash | `asli` (Messages API lewat `fetch` dengan `ANTHROPIC_API_KEY`), `palsu` untuk tes, dev, dan pratinjau (dipilih `AI_ADAPTER`) |
   
   ### Struktur folder (rencana)
  @@ -203,7 +203,7 @@ point-lat/
   | `footer` | tautan, teks hak cipta, tautan sosial, saluran WhatsApp |
   | `beranda` | urutan & isi blok homepage (hero, mozaik pilihan redaksi, strip video, paling dibaca, newsletter, slot iklan) |
   | `pengaturanSEO` | nama situs, judul default, pola judul, meta default, gambar OG default, organisasi (logo, sameAs), kode verifikasi, robots.txt; grup Mesin Indexing: status pemasangan (mode adapter, akun layanan Google, `CRON_SECRET`, kunci IndexNow; rahasia tidak ditampilkan), IndexNow key, properti Search Console, batas cek status per hari (bawaan 1.000), saklar Indexing API (mati) dengan peringatan, batas Indexing API (bawaan 200). Kredensial Google hanya di env server |
  -| `iklan` | penyedia, ID penerbit, slot (id, ukuran, posisi, halaman, aktif), `ads.txt` |
  +| `iklan` | aktif (bawaan mati), penyedia (AdSense), ID penerbit (`ca-pub-` 16 angka), mode uji (`data-adtest`), slot (ID, posisi yang sekaligus menentukan jenis halaman: artikel tengah setelah paragraf ke-N, artikel akhir, rubrik, tools, beranda; ukuran tetap 300 x 250, 336 x 280, atau 320 x 100; unit `data-ad-slot`; aktif; satu slot aktif per posisi kecuali beranda), baris `ads.txt` tambahan (baris AdSense dibuat otomatis dari ID penerbit) |
   | `asistenAI` | status pemasangan (mode adapter, kunci API terpasang atau belum, model per tugas dari env, pemakaian bulan ini), aktif, anggaran bulanan (US$, bawaan 10), harga per model (US$ per juta token), sumber resmi per pilar untuk brief, frasa klise tambahan untuk cek pola |
   | `newsletter` | penyedia, teks form, tautan arsip |
   
  @@ -308,11 +308,14 @@ Pengaman:
   
   ## 11. Iklan & privasi
   
  -- Slot dikelola dari global `iklan`; komponen `SlotIklan` memesan tinggi sesuai ukuran slot (CLS 0), memuat skrip penyedia setelah halaman interaktif dan slot terlihat.
  -- Banner persetujuan cookie (UU PDP No. 27/2022): pilihan "Hanya yang perlu" dan "Izinkan semua". Iklan personalisasi hanya setelah persetujuan.
  +- Slot dikelola dari global `iklan`; komponen `SlotIklan` memesan lebar dan tinggi sesuai ukuran tetap slot (CLS 0) dengan label "Iklan", dan skrip AdSense dimuat setelah halaman interaktif, setelah pengunjung memilih "Izinkan semua", dan saat slot hampir terlihat. Unit yang tidak terisi tetap berukuran sama (tidak diciutkan).
  +- Posisi: artikel (setelah paragraf ke-N di tingkat atas isi, bila masih ada dua paragraf sesudahnya, dan setelah isi sebelum sumber dan FAQ), rubrik (setelah daftar tulisan), tools (setelah penjelasan, di luar kalkulator), dan beranda (blok Slot iklan).
  +- Banner persetujuan cookie (UU PDP No. 27/2022) di atas header, di dalam alur halaman (tidak menutupi isi): pilihan "Hanya yang perlu" dan "Izinkan semua", setara dan sejajar, dengan tautan Kebijakan Privasi. "Hanya yang perlu" berarti iklan tidak dimuat sama sekali (iklan non-personalisasi AdSense tetap memakai cookie untuk pembatasan frekuensi). Pilihan disimpan di cookie pihak pertama berversi dan bertanggal selama 12 bulan, dibaca di browser (halaman tetap statis), dan bisa diubah atau ditarik lewat "Pengaturan cookie" di footer; menarik persetujuan menghapus cookie iklan di domain situs dan memuat ulang halaman.
  +- Google Consent Mode v2: keempat sinyal ditolak sebelum skrip iklan apa pun; "Izinkan semua" membuka sinyal iklan (`ad_storage`, `ad_user_data`, `ad_personalization`), `analytics_storage` tetap ditolak selama situs tanpa alat analitik.
  +- Pengunjung EEA, Inggris, dan Swiss: iklan personalisasi di sana mensyaratkan CMP bersertifikat Google (TCF); pemilik memakai pesan European regulations di AdSense, Privacy & messaging.
   - Tidak ada iklan di dalam kotak Intinya, di atas H1, atau di dalam kalkulator.
  -- `ads.txt` dari CMS.
  -- Halaman Kebijakan Privasi.
  +- `ads.txt` dari CMS: baris AdSense dari ID penerbit dan baris tambahan, 404 bila kosong.
  +- Halaman Kebijakan Privasi (teks hukum ditulis pemilik).
   
   ## 12. Performa
   
  @@ -381,7 +384,7 @@ WCAG 2.2 AA: kontras sesuai §4, fokus terlihat (`:focus-visible`, ring 2px ink
   5. Google Cloud: proyek, aktifkan Search Console API (dan Indexing API bila nanti dipakai), akun layanan dengan kunci JSON, tambahkan email akun layanan (`client_email`) sebagai Owner di Search Console.
   6. Env Vercel untuk Mesin Indexing: `INDEXER_ADAPTER=asli` (Production) dan `palsu` (Preview), `GOOGLE_SERVICE_ACCOUNT_JSON` berisi seluruh file kunci JSON (Production saja), `CRON_SECRET` acak minimal 16 karakter. Kunci IndexNow diisi di Pengaturan SEO; status pemasangan tampil di halaman yang sama.
   7. Kunci Claude API: env Vercel `AI_ADAPTER=asli` dan `ANTHROPIC_API_KEY` (Production), `AI_ADAPTER=palsu` (Preview). Anggaran bulanan, harga per model, dan sumber resmi per pilar di Pengaturan, Asisten AI.
  -8. Akun AdSense (setelah konten cukup) dan penyedia newsletter.
  +8. Akun AdSense (setelah konten cukup): ID penerbit dan unit iklan display berukuran tetap di global Iklan, pesan European regulations di Privacy & messaging, Kebijakan Privasi terbit sebelum iklan dinyalakan. Penyedia newsletter.
   
   ## 19. Risiko & mitigasi
   
  ```

- [ ] **Langkah 2: Pemeriksaan lengkap**

  Jalankan:

  ```bash
  npm run generate:types && git diff --stat src/payload-types.ts
  npm run generate:importmap && git diff --stat "src/app/(payload)/admin/importMap.js"
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:int
  npm run test:e2e
  npm run test:e2e
  npm run seed
  npm run build
  git status --short
  ```

  Hasil yang diharapkan: `payload-types.ts` dan import map tidak berubah; type check dan lint bersih; unit 499 tes (73 file); integrasi 145 tes (43 file) dua kali (putaran kedua di database tes yang sudah berisi data putaran pertama: tes mencari dokumennya sendiri lewat ID atau `unik()`, dan tes global Iklan menyetel ulang globalnya); E2E 133 tes dua kali berturut-turut (putaran kedua memakai database E2E yang sama tanpa dibuang: `siapkan.ts` menyetel ulang global Iklan, dan tes yang menyimpan global mengembalikannya); build mencantumkan rute baru `ƒ /ads.txt` di samping rute lama; `git status` hanya menunjukkan dua file Langkah 1.

- [ ] **Langkah 3: Uji visual di tiga ukuran layar**

  Bangun dan jalankan build dengan database E2E yang sudah berisi konten contoh dari langkah 2 (sama dengan Rencana 7):

  ```bash
  set -a && . ./.env.test && set +a
  DATABASE_URL="${DATABASE_URL%%\?*}_e2e" CLOUDINARY_CLOUD_NAME=e2e CLOUDINARY_API_KEY=e2e CLOUDINARY_API_SECRET=e2e INDEXER_ADAPTER=palsu AI_ADAPTER=palsu NEXT_PUBLIC_SITE_URL=http://localhost:3200 npm run build
  (DATABASE_URL="${DATABASE_URL%%\?*}_e2e" CLOUDINARY_CLOUD_NAME=e2e CLOUDINARY_API_KEY=e2e CLOUDINARY_API_SECRET=e2e INDEXER_ADAPTER=palsu AI_ADAPTER=palsu NEXT_PUBLIC_SITE_URL=http://localhost:3200 PORT=3200 npm run start > /tmp/point-lat-start.log 2>&1 &)
  timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'
  ```

  Periksa di 375, 768, dan 1440 px (DevTools): beranda, artikel `cara-hitung-gaji-bersih`, rubrik `uang-karier`, dan `tools/gaji-bersih`, masing-masing (a) sebelum memilih (banner di atas header, dua tombol sama lebar dan sejajar, tidak menutupi isi), (b) setelah "Hanya yang perlu" (banner hilang, tidak ada ruang iklan, tidak ada permintaan ke domain Google di tab Network), dan (c) setelah "Izinkan semua". Di browser biasa unit iklan tidak terisi karena ID penerbit tiruan: pastikan kotak berlabel "Iklan" tetap berukuran sama dan isi di bawahnya tidak bergeser. Ulangi dengan reduced motion (DevTools, Rendering). Lalu masuk ke `http://localhost:3200/admin` dengan akun E2E (`ADMIN_E2E` di `tests/e2e/data.ts`) dan periksa admin berbahasa Indonesia di tema terang dan gelap (halaman Akun, Tema Admin): daftar artikel, form artikel, sidebar Asisten AI, global Iklan (petunjuk dan pratinjau ads.txt), dan Dashboard SEO. Pastikan tidak ada kunci mentah (`lexical:...`), tidak ada geser horizontal di halaman publik, cincin fokus terlihat saat menekan Tab di banner, dan tombol Pengaturan cookie di footer membuka banner lagi. Hentikan server dengan `fuser -k 3200/tcp`, lalu `npm run build` lagi dengan env biasa.

- [ ] **Langkah 4: Commit**

  Bila build menambahkan blok "nextjs-agent-rules" ke `CLAUDE.md`, hapus blok itu saja (perubahan langkah 1 tetap ada), lalu:

  ```bash
  git add CLAUDE.md docs/superpowers/specs/2026-11-03-point-lat-design.md
  git commit -m "docs: iklan, persetujuan cookie, dan admin berbahasa Indonesia di CLAUDE.md dan spesifikasi"
  ```

---

### Task 10 (butuh persetujuan pemilik, bisa dilepas): Kontras deskripsi field bawaan Payload di seluruh admin

**Files:**
- Modify: `src/app/(payload)/custom.scss`, `tests/e2e/admin.spec.ts`, `CLAUDE.md`
- Test: `tests/e2e/admin.spec.ts`

**Interfaces:**
- Consumes: `periksaAxe`, `cegatCloudinary`, `ADMIN_E2E`, `SLUG` (E2E), cookie tema Payload `payload-theme` (`light` atau `dark`, dibaca `ThemeProvider` Payload 3.92.1).
- Produces: satu aturan `.field-description` (warna `--theme-elevation-650`) untuk semua deskripsi field bawaan di admin, dan aturan proyek yang diperbarui di `CLAUDE.md`.

Ditunda dari Rencana 7 ("bila pemilik setuju"): deskripsi field bawaan Payload (`admin.description`) memakai `--theme-elevation-400` di `@layer payload-default`, dan axe melaporkan `color-contrast` di tema terang pada setiap form yang memakainya (probe: delapan deskripsi di form artikel saja). `custom.scss` adalah tempat CSS global admin menurut dokumentasi Payload ("Customizing CSS"); aturan di luar layer `payload-default` menang atas gaya bawaan tanpa `!important`. `--theme-elevation-650` sudah lolos kontras di tema terang dan gelap untuk deskripsi `pakaiDrafAi` (Rencana 7), dan Payload membalik skala elevation di tema gelap. Aturan per field `.field-description-pakaiDrafAi` di `review.scss` dibiarkan (warnanya sama), jadi task ini bisa dilepas tanpa mengubah task lain: tanpa task ini, global Iklan tetap lolos karena penjelasannya di komponen sendiri.

Task ini butuh persetujuan pemilik karena mengubah tampilan semua form admin, bukan hanya komponen rencana ini. Probe juga mencatat pelanggaran axe bawaan Payload lain yang tidak disentuh (lihat "Cakupan yang ditunda").

- [ ] **Langkah 1: Tulis tes yang gagal**

  ```diff
  diff --git a/tests/e2e/admin.spec.ts b/tests/e2e/admin.spec.ts
  index edbaa17..8846643 100644
  --- a/tests/e2e/admin.spec.ts
  +++ b/tests/e2e/admin.spec.ts
  @@ -1,6 +1,6 @@
   import { expect, test } from '@playwright/test'
   
  -import { cegatCloudinary } from './bantu'
  +import { cegatCloudinary, periksaAxe } from './bantu'
   import { ADMIN_E2E, SLUG } from './data'
   
   /**
  @@ -39,3 +39,26 @@ test('admin berbahasa Indonesia walau browser meminta bahasa Inggris: menu, daft
     expect(luar).toEqual([])
     await konteks.close()
   })
  +
  +/**
  + * Deskripsi field bawaan Payload (`admin.description`) memakai `--theme-elevation-400` yang gagal kontras
  + * WCAG AA di tema terang. Satu aturan di `custom.scss` berlaku untuk semua form admin; diperiksa axe di
  + * form artikel dan dua global yang banyak memakai deskripsi, di kedua tema.
  + */
  +for (const tema of ['light', 'dark'] as const) {
  +  test(`deskripsi field bawaan Payload lolos kontras di tema ${tema === 'light' ? 'terang' : 'gelap'}: form artikel, Asisten AI, dan Pengaturan SEO`, async ({ browser }) => {
  +    const konteks = await browser.newContext()
  +    await konteks.addCookies([{ name: 'payload-theme', value: tema, domain: 'localhost', path: '/' }])
  +    const page = await konteks.newPage()
  +    await cegatCloudinary(page)
  +    await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  +    const { docs } = await (await page.request.get(`/api/artikel?where[slug][equals]=${SLUG.panduan}&depth=0`)).json()
  +    for (const path of [`/admin/collections/artikel/${docs[0].id}`, '/admin/globals/asisten-ai', '/admin/globals/pengaturan-seo']) {
  +      await page.goto(path)
  +      await expect(page.locator('html')).toHaveAttribute('data-theme', tema)
  +      await expect(page.locator('.field-description').first()).toBeVisible()
  +      await periksaAxe(page, '.field-description')
  +    }
  +    await konteks.close()
  +  })
  +}
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:e2e -- tests/e2e/admin.spec.ts
  ```

  Hasil yang diharapkan: tes tema terang FAIL di `periksaAxe` dengan `+   "color-contrast: .field-description-deck, .field-description-intinya, .field-description-gambarUtama, .field-description-sumber, .field-description-sumber__0__penerbit, .field-description-sumber__1__penerbit, .field-description-slug, .field-description-perubahanBesar",`; tes tema gelap lulus.

- [ ] **Langkah 3: Satu aturan kontras untuk semua deskripsi field**

  ```diff
  diff --git a/src/app/(payload)/custom.scss b/src/app/(payload)/custom.scss
  index e69de29..6a3262e 100644
  --- a/src/app/(payload)/custom.scss
  +++ b/src/app/(payload)/custom.scss
  @@ -0,0 +1,6 @@
  +// Deskripsi field bawaan Payload (`admin.description`) memakai `--theme-elevation-400`, yang gagal kontras
  +// WCAG AA di tema terang. Aturan ini di luar `@layer payload-default`, jadi berlaku di semua form admin
  +// (Rencana 8A); tema gelap ikut karena Payload membalik skala elevation.
  +.field-description {
  +  color: var(--theme-elevation-650);
  +}
  ```

  ```diff
  diff --git a/CLAUDE.md b/CLAUDE.md
  index 67a31f3..2d368f5 100644
  --- a/CLAUDE.md
  +++ b/CLAUDE.md
  @@ -37,7 +37,7 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Asisten AI di `src/modules/ai` (spesifikasi §10): `jalankan(payload, tugas, masukan, opsi)` satu-satunya pintu ke Claude untuk tugas `brief`, `draf`, dan `meta` (endpoint `POST /api/artikel/asisten`, status di `GET /api/artikel/asisten`, hanya admin dan editor). Di dalamnya: saklar global `asisten-ai`, batas 6 permintaan per menit per pengguna (dihitung dari `log-ai`), harga model dari global, cadangan anggaran atomik di koleksi tersembunyi `pemakaian-ai` (satu baris per bulan waktu Jakarta, `UPDATE ... WHERE terpakai + cadangan <= batas RETURNING` lewat koneksi pool, bukan transaksi `req`), log `log-ai` (tanpa teks masukan dan keluaran, disimpan 13 bulan), lalu pemeriksa jawaban. Prompt, skema JSON (structured outputs: semua properti wajib, `additionalProperties: false`, tanpa batasan panjang), dan pemeriksa per tugas di `prompt/{brief,draf,meta}.ts` sebagai fungsi murni; data database untuk brief di `brief-data.ts` (memakai `artikelLain`, `cariKanibalisasi`, dan `sarankanLink` panel SEO). Prompt dan keluaran mengikuti aturan copy: keluaran model dibersihkan dari em dash dan en dash (`bersihkanTanda`) dan editor diberi tahu jumlahnya. Cek pola tulisan AI (`pola.ts`) dan cek klaim (`klaim.ts`) fungsi murni yang berjalan di browser dari isian form (`blokArtikel`), tanpa API dan tanpa log. Adapter dipilih env `AI_ADAPTER` (`asli` lewat `fetch` ke Messages API dengan `ANTHROPIC_API_KEY`, `palsu` dalam memori; dev dan tes palsu, produksi tanpa nilai itu ditolak dengan pesan), terpisah dari `INDEXER_ADAPTER`. Model per tugas lewat `AI_MODEL_{BRIEF,DRAF,META}` atau `AI_MODEL` (bawaan Sonnet untuk brief dan draf, Haiku untuk meta). Tes memakai `adapterPalsu()` + `pakaiAdapterAi()` dan opsi `sekarang` (bulan lampau supaya baris anggaran milik tes sendiri); E2E memakai pengguna editor baru per tes yang memanggil AI dan menghapus draf buatannya setelah setiap tes (spec lain membaca daftar artikel admin). AI hanya memberi saran: sidebar (`admin/AsistenAi.tsx`) menerapkan isian hanya lewat tombol dengan Batalkan, draf per bagian disalin (bukan disisipkan), dan menerapkan Intinya atau FAQ atau menyalin draf menyalakan `pakaiDrafAi` (setelah tersimpan menyala tidak bisa dimatikan lagi, juga lewat API dan update massal: hook `beforeValidate` `tetapPakaiDrafAi`); artikel itu wajib mencentang checklist `reviewAi` sebelum terbit (validasi field, jadi berlaku juga untuk terbit massal dan terjadwal) dan tombol terbit nonaktif sampai lengkap (`admin/TombolTerbit.tsx`). Sidebar menyebut bahwa teks dikirim ke Claude (Anthropic).
   - Iklan dan persetujuan cookie di `src/modules/iklan` (spesifikasi §11): pengaturan dari global `iklan` lewat `muatIklan()` (cache bertag `iklan`), dan `pilihSlot(pengaturan, posisi, id?)` satu-satunya aturan apakah slot tampil (global menyala, AdSense, ID penerbit `ca-pub-` 16 angka, slot aktif, unit angka). Posisi tetap per jenis halaman (`artikel-tengah` setelah paragraf ke-N lewat `sisipkanIklanTengah` dan node Lexical `slotIklan`, `artikel-akhir`, `rubrik`, `tools`, dan `beranda` lewat blok Slot iklan); tidak ada posisi di kotak Intinya, di atas H1, atau di dalam kalkulator. Ukuran tetap (300 x 250, 336 x 280, 320 x 100), jadi `SlotIklan` memesan ruangnya dan iklan tidak menggeser isi (CLS 0); halaman meneruskan `iklan={await muatIklan()}` ke komponennya, beranda lewat `susunBeranda` (`sumber.iklan`). Persetujuan dibaca di browser, bukan di server, supaya halaman tetap ISR: skrip awal di `<head>` (`SkripPersetujuan`, `skripAwal()`) menolak semua sinyal Consent Mode v2 lalu menandai `<html data-persetujuan="belum|perlu|semua">` dari cookie `persetujuan` (versi, pilihan, tanggal; 12 bulan), dan CSS menampilkan banner atau slot dari atribut itu sejak paint pertama. Banner (`PanelPersetujuan`) di atas header, dua pilihan setara; "Hanya yang perlu" berarti tanpa skrip iklan sama sekali; "Pengaturan cookie" di footer membukanya lagi, dan menarik persetujuan menghapus cookie AdSense di domain situs (`KUKI_IKLAN_SITUS`: `__gads`, `__gpi`, `__gpi_optout`, `__eoi`) lalu memuat ulang halaman. `PemuatIklan` (layout) memuat `adsbygoogle.js` hanya setelah "Izinkan semua" dan saat slot hampir terlihat; kode penyedia hanya di `adsense.ts`. Banner, skrip awal, dan pemuat hanya ada bila `iklanSiap`. `/ads.txt` dari global (baris AdSense otomatis dari ID penerbit dan baris tambahan editor), 404 bila tidak ada baris. Tes tidak memanggil Google: E2E memakai `cegatIklan()` (skrip AdSense tiruan yang mencatat `dataLayer` dan mengisi unit) dan ID penerbit tiruan `ca-pub-0000000000000000`; database E2E menyalakan iklan, jadi semua spec berjalan dengan banner.
   - Admin Payload hanya berbahasa Indonesia (`src/lib/bahasa-admin.ts`, `payload/i18n/id`); teks editor Lexical yang belum diterjemahkan Payload ditambahkan di sana (tes integrasi `admin-bahasa` menjaga tidak ada kunci mentah). Tes E2E admin memakai label Indonesia ("Simpan", "Buka Menu", "Publikasikan perubahan"), dan `getByLabel` dengan `exact` bila label pendek (tautan menu "Keluar"). Avatar admin `'default'` (admin tidak memanggil Gravatar) dan tanggal admin `d MMMM yyyy, HH.mm`.
  -- Deskripsi field bawaan Payload (`admin.description`) memakai warna redup yang gagal kontras axe; teks penjelasan di komponen admin buatan sendiri ditulis di komponen dengan warna tema `--theme-text` atau `--theme-elevation-650`, dan field baru yang tetap memakai `admin.description` diberi warna lewat kelas `.field-description-{nama}` (contoh `pakaiDrafAi` di `admin/review.scss`). Axe E2E untuk deskripsi itu memakai kelas tersebut: id `field-{nama}` pada checkbox ada di input, bukan di pembungkus field. State form admin menyimpan field array tanpa baris sebagai angka 0, bukan array kosong: periksa `Array.isArray` sebelum memakai nilai dari `getData()`. Isi grup di sidebar Payload baru dirender saat terlihat (`RenderIfInViewport`), jadi tes E2E menggulirnya dulu.
  +- Deskripsi field bawaan Payload (`admin.description`) memakai warna redup (`--theme-elevation-400`) yang gagal kontras axe; satu aturan `.field-description` di `src/app/(payload)/custom.scss` menggantinya dengan `--theme-elevation-650` di semua form admin (dijaga axe di `admin.spec.ts`, tema terang dan gelap). Teks penjelasan di komponen admin buatan sendiri tetap memakai warna tema `--theme-text` atau `--theme-elevation-650`. Axe E2E untuk deskripsi satu field memakai kelas `.field-description-{nama}`: id `field-{nama}` pada checkbox ada di input, bukan di pembungkus field. State form admin menyimpan field array tanpa baris sebagai angka 0, bukan array kosong: periksa `Array.isArray` sebelum memakai nilai dari `getData()`. Isi grup di sidebar Payload baru dirender saat terlihat (`RenderIfInViewport`), jadi tes E2E menggulirnya dulu.
   - Nilai di `req.context` yang dihitung dengan `await` operasi Payload ditulis setelah `await` selesai (simpan ke variabel dulu): operasi Payload dengan `req` bisa mengganti objek `req.context`, sehingga `req.context[k] = await ...` hilang.
   - URL media selalu lewat `src/modules/media` (`bangunUrl`, `propsGambar`, `urlOg`), jangan merangkai URL Cloudinary manual. `next/image` memakai loader kustom Cloudinary, jadi `src` harus URL dari `bangunUrl`/`propsGambar` dan `width`/`height` wajib diisi.
   - Media disimpan di Cloudinary (folder `point/gambar`, `point/video`). Tanpa `CLOUDINARY_*` di env (lokal, tes) dipakai klien palsu dalam memori: file tidak tersimpan permanen. Tes tidak boleh memanggil jaringan.
  ```

- [ ] **Langkah 4: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit 499 tes (73 file); integrasi 145 tes (43 file); E2E 135 tes dua kali berturut-turut tanpa membuang database E2E.

- [ ] **Langkah 5: Commit**

  ```bash
  git add "src/app/(payload)/custom.scss" tests/e2e/admin.spec.ts CLAUDE.md
  git commit -m "fix(admin): deskripsi field bawaan Payload lolos kontras di semua form admin (satu aturan di custom.scss), dijaga axe di tema terang dan gelap"
  ```

---

## Selesai bila

- `npm test` lulus (unit 499 tes (73 file), integrasi 145 tes (43 file), juga di database tes yang sudah berisi data putaran sebelumnya), `npm run test:e2e` lulus (135 tes, atau 133 tes bila Task 10 dilepas) dua kali berturut-turut tanpa membuang database E2E, `npm run typecheck` dan `npm run lint` bersih, `npm run build` berhasil dengan rute baru `ƒ /ads.txt` sementara `○ /`, `● /[...jalur]`, dan `● /tools/[slug]` tetap statis, semuanya tanpa jaringan dan tanpa ID penerbit asli.
- Admin Payload berbahasa Indonesia apa pun bahasa browser: menu, daftar, tombol terbit ("Publikasikan perubahan"), toolbar dan menu editor Lexical tanpa kunci mentah, tanggal "6 November 2026, 08.21", tanpa permintaan ke Gravatar.
- Editor mengatur iklan tanpa kode di global Iklan (grup Tampilan): saklar, ID penerbit, mode uji, slot dengan posisi dan ukuran tetap, dan baris `ads.txt` tambahan, semuanya divalidasi dengan pesan berbahasa Indonesia; perubahan langsung terlihat di halaman publik dan `/ads.txt` (tag `iklan`).
- `/ads.txt` memuat baris AdSense dari ID penerbit dan baris tambahan editor sebagai `text/plain`, dan 404 bila tidak ada baris.
- Banner persetujuan tampil hanya bila iklan siap, di atas header tanpa menutupi isi di 375 px, dengan dua pilihan setara, bisa dipakai dengan keyboard dan dibacakan pembaca layar, lolos axe di 375, 768, dan 1440 px, dan dibuka lagi lewat "Pengaturan cookie" di footer.
- Sebelum memilih dan dengan "Hanya yang perlu": tidak ada permintaan ke domain Google dan slot tidak menempati ruang. Dengan "Izinkan semua": Consent Mode bawaan ditolak lalu `update` diizinkan sebelum `adsbygoogle.js` dimuat, dan unit diisi saat hampir terlihat. Menarik persetujuan menghapus cookie AdSense di domain situs dan memuat ulang halaman.
- Iklan hanya di posisi tetap (tengah dan akhir artikel, rubrik, tools, beranda), tidak pernah di kotak Intinya, di atas H1, atau di dalam kalkulator; CLS 0 di ketiga keadaan; chunk JS tata letak di bawah 8 KiB dan bersama JS kalkulator di bawah 25 KB.
- Bila Task 10 disetujui: deskripsi field bawaan Payload lolos kontras di seluruh admin, tema terang dan gelap.

## Setup dari pemilik (setelah rencana ini terpasang)

- [ ] **Kebijakan Privasi dulu:** tulis dan terbitkan halaman "Kebijakan Privasi" (draf dari seed, path `/kebijakan-privasi`) sebelum menyalakan iklan, karena banner menautkannya. Saklar "Tampilkan iklan" ditolak selama halaman itu belum terbit, dan banner serta iklan berhenti tampil bila halaman itu ditarik dari terbit (commit lanjutan, keputusan pemilik). Teks hukumnya milik pemilik; rencana ini tidak menulisnya. Hal yang perlu dicakup supaya cocok dengan perilaku situs (UU PDP Pasal 21): identitas dan kontak pengelola point.; cookie `persetujuan` (menyimpan pilihan, 12 bulan, termasuk yang perlu); iklan Google AdSense yang hanya dimuat setelah "Izinkan semua", cookie yang ditulis AdSense di domain point.lat (`__gads`, `__gpi`, `__gpi_optout`, `__eoi`) dan cookie Google di domain Google, serta tautan ke kebijakan Google tentang iklan; Google Consent Mode; cara mengubah atau menarik pilihan lewat tombol "Pengaturan cookie" di footer dan akibatnya; pihak lain yang menerima data teknis pengunjung (gambar dari Cloudinary, hosting); hak subjek data (akses, pembetulan, penghapusan, menarik persetujuan) dan cara memintanya; masa simpan.
- [ ] **Akun AdSense (spesifikasi §18 butir 8):** daftarkan point.lat di AdSense (Sites). Isi ID penerbit di admin (grup Tampilan, Iklan) dengan "Tampilkan iklan" tetap mati: `/ads.txt` langsung memuat baris AdSense, jadi AdSense bisa memeriksanya. Status ads.txt di halaman Sites harus "Authorized" (bila "Not found" atau "Unauthorized", buka `https://point.lat/ads.txt` dan cocokkan ID penerbit).
- [ ] **Unit iklan:** di AdSense (Ads, By ad unit, Display ads) buat unit berukuran tetap (Fixed) dengan ukuran yang sama dengan slot: 300 x 250, 336 x 280, atau 320 x 100. Salin angka `data-ad-slot` dari kode unit ke kolom "Unit iklan" di slotnya. Untuk slot beranda, ID slot di global Iklan harus sama dengan ID di blok Slot iklan global Beranda.
- [ ] **Iklan otomatis (Auto ads) tetap mati** untuk point.lat di AdSense: skrip yang sama bisa menaruh iklan di mana saja, termasuk di atas judul dan di sekitar kalkulator, tanpa ruang yang dipesan.
- [ ] **Pengunjung EEA, Inggris, dan Swiss (opsional):** bila ingin iklan personalisasi di wilayah itu, buat dan terbitkan pesan European regulations di Privacy & messaging AdSense. Tanpa pesan itu, AdSense tidak menayangkan iklan personalisasi di sana.
- [ ] **Menyalakan:** setelah situs disetujui AdSense dan Kebijakan Privasi terbit, nyalakan "Tampilkan iklan". Buka satu artikel di jendela privat: banner tampil; setelah "Izinkan semua", kotak berlabel "Advertisements" muncul dan terisi. "Mode uji" hanya untuk pratinjau; matikan di produksi.

## Cakupan yang ditunda (dengan alasan)

| Butir | Ditunda ke | Alasan |
|---|---|---|
| Uji langsung dengan ID penerbit asli: unit terisi iklan nyata, status ads.txt "Authorized", pesan European regulations, dan CLS dengan iklan nyata di Lighthouse CI | Rencana 8C (rilis dan runbook uji langsung) | Butuh akun AdSense yang disetujui dan domain produksi; workspace tidak bisa menghubungi Google, jadi tes memakai skrip tiruan. |
| Unit responsif atau ukuran per lebar layar (misalnya 728 x 90 di desktop) | belum direncanakan | Ukuran tetap membuat ruang bisa dipesan persis (CLS 0); tinggi unit responsif baru diketahui setelah AdSense menjawab. |
| Iklan otomatis, In-article, dan Multiplex AdSense | belum direncanakan | Penempatannya diatur AdSense, tidak mengikuti larangan spesifikasi §11, dan ruangnya tidak bisa dipesan. |
| CMP bersertifikat TCF milik sendiri | belum direncanakan | Pembaca point. di Indonesia; pesan European regulations Google cukup untuk EEA, Inggris, dan Swiss. |
| Persetujuan analitik (`analytics_storage` diizinkan) | Fase 2 (bila alat analitik pengunjung dipasang) | point. belum memasang alat analitik pengunjung; sinyalnya sudah ditolak sejak awal. |
| Label baris slot di admin (ID slot dan posisi, bukan "Slot 01") | belum direncanakan | Kenyamanan admin; pratinjau ads.txt dan validasi sudah menyebut ID slot. |
| Pelanggaran axe bawaan admin Payload lain: `aria-command-name` (pegangan geser baris array), `label` (checkbox pilih baris), `target-size` dan `color-contrast` (tombol urut daftar), `label-content-name-mismatch` (tombol buat baru), `list`, `button-name`, `image-alt`, `color-contrast` pada tombol tab dan metadata unggahan | belum direncanakan (dilaporkan ke Payload) | Komponen bawaan Payload; memperbaikinya berarti menimpa banyak komponen dan gaya Payload. Komponen buatan rencana ini lolos axe. |
| Kartu unggahan editor Lexical melebar di 375 px bila gambarnya lebar (geser 93 px dengan gambar contoh 1.600 px) | belum direncanakan | Bawaan Payload dan sudah ada sebelum rencana ini; hanya di admin. |
| Copy bawaan admin Payload yang menyapa "Anda" dan label berhuruf kapital tiap kata | belum direncanakan | Lihat Keputusan teknis (Copy bawaan Payload). |
| Banner dan halaman publik berbahasa Inggris untuk pengunjung luar negeri | belum direncanakan | Situs berbahasa Indonesia. |
| Laporan pendapatan AdSense dan status ads.txt di dashboard admin | Fase 2 (dashboard analitik lanjutan) | Butuh AdSense Management API dan OAuth pemilik. |

## Risiko dan pertanyaan terbuka

| Risiko | Mitigasi |
|---|---|
| "Hanya yang perlu" berarti tanpa iklan sama sekali, jadi pengunjung yang memilihnya tidak menghasilkan pendapatan, dan dua tombol setara biasanya menurunkan tingkat persetujuan. | Iklan non-personalisasi AdSense tetap memakai cookie, jadi tidak bisa disebut "yang perlu"; limited ads hanya untuk EEA, Inggris, dan Swiss lewat TCF. **Keputusan pemilik (6 November 2026): setuju.** |
| Kebijakan penempatan AdSense menyebut label "Advertisements" atau "Sponsored Links" (halaman kebijakan hanya berbahasa Inggris). | Label "Iklan" adalah padanan Indonesianya dan tidak menyesatkan. **Keputusan pemilik (6 November 2026): "Advertisements"**, persis teks kebijakan (halaman `hl=id` pun hanya berbahasa Inggris), dengan `lang="en"`; dikerjakan di commit lanjutan setelah Task 10. |
| `data-adtest="on"` tidak didokumentasikan Bantuan AdSense untuk tag biasa (hanya terlihat di implementasi AdSense AMP). | Mode uji bawaannya mati dan hanya untuk pratinjau; tes tidak bergantung padanya. |
| Pengunjung EEA, Inggris, dan Swiss bisa ditanya dua kali (banner point. lalu pesan European regulations setelah Izinkan semua). | Pesan Google opsional dan hanya untuk wilayah itu. **Pertanyaan:** pasang pesan itu, atau terima iklan non-personalisasi di sana? |
| Dokumentasi Consent Mode tidak menyebut AdSense di produk yang membaca sinyalnya. | Penahan utama adalah tidak memuat skrip iklan sebelum "Izinkan semua" (mode dasar); sinyal tetap dipasang untuk tag Google lain kelak. |
| Iklan otomatis yang dinyalakan di AdSense menaruh iklan di luar slot. | Langkah setup "Iklan otomatis tetap mati"; skrip tetap hanya dimuat setelah persetujuan. |
| Tautan banner ke Kebijakan Privasi 404 bila halamannya belum terbit. | Petunjuk di global Iklan dan setup meminta halaman terbit sebelum iklan dinyalakan. **Keputusan pemilik (6 November 2026): ya.** Commit lanjutan setelah Task 10: saklar ditolak selama halaman itu belum terbit, dan `iklanSiap` memeriksa `kebijakanTerbit`, jadi banner dan iklan berhenti bila halaman itu ditarik dari terbit. |
| Admin hanya berbahasa Indonesia; editor tidak bisa memilih bahasa Inggris. | Keputusan pemilik (6 November 2026). |
| Naik versi Payload bisa menambah kunci terjemahan Lexical yang belum ada dalam bahasa Indonesia. | Tes integrasi memastikan setiap kunci `en.lexical` ada di `id.lexical`, jadi kunci baru langsung ketahuan. |
| Daftar cookie AdSense di domain situs bisa berubah. | `KUKI_IKLAN_SITUS` mengikuti daftar Google per 6 November 2026; halaman dimuat ulang saat persetujuan ditarik, jadi skrip iklan berhenti; cookie di domain Google tidak bisa dihapus situs (dijelaskan di Kebijakan Privasi). |
| Task 10 mengubah warna deskripsi semua form admin. | **Disetujui pemilik (6 November 2026)** dan dijalankan. |
| Komponen klien baru di tata letak bisa membesarkan chunk JS tata letak. | `motion.spec.ts` menjaga chunk itu di bawah 8 KiB. |

## Temuan review sebelum eksekusi

| Temuan | Tindakan |
|---|---|
| Probe Task 1: toolbar dan menu editor Lexical menampilkan kunci mentah (`lexical:heading:label` dan sejenisnya) karena `@payloadcms/richtext-lexical` 3.92.1 tidak punya terjemahan Indonesia; satu teks bawaan Payload Indonesia memakai em dash (`general:sorryNotFound`). | Sudah masuk Task 1: `TERJEMAHAN_ADMIN` berisi semua kunci Lexical dan `sorryNotFound` tanpa em dash; tes integrasi memeriksa kelengkapan kunci, tanpa em dash, en dash, dan tanda seru. |
| Probe Task 1: tes E2E lama membaca label admin berbahasa Inggris ("Save", "Open Menu", "Publish changes"); `getByLabel('Ke')` juga cocok dengan tombol "Keluar". | Sudah masuk Task 1: label Indonesia ("Simpan", "Buka Menu", "Publikasikan perubahan") dan `getByLabel('Ke', { exact: true })`; aturannya di `CLAUDE.md` (Task 9). |
| Uji visual: format tanggal bawaan admin menghasilkan "November ke-6 2026, 8:21 AM". | Sudah masuk Task 1: `admin.dateFormat: 'd MMMM yyyy, HH.mm'`, dijaga E2E daftar artikel. |
| Pemeriksaan jaringan E2E (proxy workspace): admin memanggil `www.gravatar.com` 17 kali (avatar bawaan Payload dari hash email) dan `res.cloudinary.com` sekali (`admin.spec.ts` membuka konteks baru tanpa `cegatCloudinary`). | Sudah masuk Task 1: `admin.avatar: 'default'`, `cegatCloudinary` di konteks baru, dan tes admin memastikan tidak ada permintaan ke luar `localhost`. |
| Probe Task 4: field array bernama `id` dipakai Payload sebagai kunci baris, sehingga ID slot hilang atau bentrok. | Sudah masuk Task 2 dan 4: field `idSlot` dan validasi `validasiDaftarSlot` per baris; aturannya di Global Constraints. |
| Probe Task 7: rute Playwright yang lebih umum menelan permintaan `adsbygoogle.js` karena rute yang didaftarkan terakhir dijalankan lebih dulu. | Sudah masuk Task 7: `cegatIklan` mendaftarkan rute skrip tiruan paling akhir. |
| Probe Task 7: mematikan iklan tidak mengubah JS halaman, karena Turbopack menggabungkan semua komponen klien tata letak dalam satu chunk. | Sudah masuk Task 7: anggaran mengukur chunk tata letak itu sendiri (dicari dari isinya): 4.366 B gzip di `45c07f7`, 6.302 B gzip setelah rencana ini. |
| Probe Task 8: blok Slot iklan di antara "Paling dicari pekan ini" dan newsletter membuat newsletter keluar dari kolom samping, sehingga tes beranda lama gagal. | Sudah masuk Task 8: di database E2E blok slot ditaruh setelah newsletter; bagian iklan memakai jarak `.bagian` yang sama, diukur E2E. |
| Uji visual: tombol banner tidak sama lebar di 1440 px; jarak iklan tengah artikel dari paragraf terlalu rapat. | Sudah masuk Task 6 (kolom tombol sama lebar, E2E membandingkan lebar di tiga ukuran) dan Task 7 (jarak 32 px di atas dan bawah, diukur E2E). |
| Riset cookie (6 November 2026): daftar Google "Our advertising and measurement cookies" menyebut empat cookie AdSense di domain situs (`__gads`, `__gpi`, `__gpi_optout`, `__eoi`), sedangkan probe awal hanya menghapus `__gads`. | Sudah masuk Task 3 (`KUKI_IKLAN_SITUS`) dan Task 7 (skrip tiruan menulis `__gads` dan `__gpi`, E2E menarik persetujuan memastikan keduanya terhapus). |
| Verifikasi di commit lama dengan database E2E berskema lebih baru: Payload menunggu pertanyaan DATA LOSS sampai `webServer` habis waktu (600 detik); build sisa commit lain meninggalkan `.next/types` ke rute yang tidak ada (`TS2307`). | Dicatat di Global Constraints (buang database `_e2e` dulu; hapus `.next`). |
| Probe Task 10: axe `color-contrast` pada delapan deskripsi field bawaan di form artikel (tema terang), lolos di tema gelap. | Task 10 (butuh persetujuan pemilik): satu aturan di `custom.scss`, E2E tema terang dan gelap. |
| Pemeriksaan rencana: tes Task 1 sempat memuat karakter em dash dan en dash asli di regex. | Ditulis sebagai escape (perilaku sama). Pemindaian akhir: rencana ini dan diff probe `45c07f7..` tanpa em dash, en dash, dan spasi tak putus asli. |
| Uji visual dengan data E2E (build produksi, port 3200): beranda, artikel, rubrik, dan tools di 375, 768, dan 1440 px dalam tiga keadaan (sebelum memilih, Hanya yang perlu, Izinkan semua dengan skrip tiruan); reduced motion; admin di tema terang dan gelap (daftar artikel, form artikel, sidebar Asisten AI, global Iklan, Dashboard SEO). | Halaman publik: 36 keadaan (4 halaman, 3 lebar, 3 keadaan) lolos axe, CLS 0, tanpa geser horizontal; sebelum memilih dan dengan Hanya yang perlu tidak ada permintaan ke luar dan slot tersembunyi; dengan Izinkan semua skrip iklan dimuat sekali dan semua slot terisi. Reduced motion: transisi tombol banner 0,00001 detik, CLS 0, axe bersih. Admin: 20 keadaan berbahasa Indonesia tanpa kunci mentah dan tanpa permintaan ke luar, axe pada komponen rencana ini (petunjuk dan pratinjau global Iklan, sidebar Asisten AI) bersih, dan tidak ada `color-contrast` pada deskripsi field setelah Task 10. Sisa pelanggaran axe bawaan Payload dan kartu unggahan Lexical yang melebar di 375 px dicatat di "Cakupan yang ditunda". |
| Verifikasi penuh per commit di salinan terpisah (database tes dibuat ulang per commit): type check, lint, unit, integrasi, dan E2E (build produksi). | Semua hijau; jumlah tes per task di tabel "Jumlah tes yang diharapkan". |
| Putaran tambahan di commit terakhir: E2E kedua di database E2E yang sama tanpa dibuang, lalu integrasi dan unit di database tes yang sudah berisi data. | Semua hijau di commit Task 10: E2E kedua 135 tes tanpa membuang database E2E; integrasi kedua 145 tes (43 file) di database tes yang sudah berisi 67 artikel dari putaran pertama; unit kedua 499 tes (73 file). |
| Blok kode rencana ini diterapkan ulang ke salinan bersih `master` (`45c07f7`), task demi task. | 10 dari 10 task identik: pohon setiap commit hasil penerapan sama dengan pohon commit probe, termasuk `payload-types.ts` dan import map yang dibuat ulang lewat `npm run generate:types` dan `npm run generate:importmap`. |
| Review pengawas setelah rencana selesai: dua fakta yang menentukan keputusan pemilik dicek ulang ke sumber (6 November 2026). | Bantuan AdSense 7670312: iklan non-personalisasi tetap memakai cookie untuk pembatasan frekuensi dan laporan gabungan. Kebijakan penempatan AdSense 1346295 (juga `hl=id`, yang tetap berbahasa Inggris): "Publishers can only label Google ads with either 'Advertisements' or 'Sponsored links'". Keduanya dibawa ke pemilik sebagai pertanyaan. |
| Keputusan pemilik (6 November 2026): jalankan dengan Task 10; "Hanya yang perlu" tanpa iklan; label "Advertisements"; penjaga supaya iklan tidak bisa dinyalakan sebelum Kebijakan Privasi terbit. | Task 1 sampai 10 dijalankan subagen apa adanya; setiap commit identik dengan commit probe (diff kosong, termasuk spesifikasi). Label dan penjaga dikerjakan pengawas sebagai satu commit lanjutan setelah Task 10 (tes ditulis dulu dan gagal dengan pesan yang benar): `SlotIklan` berlabel "Advertisements" dengan `lang="en"`; `PengaturanIklan.kebijakanTerbit` dari `kebijakanPrivasiTerbit` (dokumen utama halaman `kebijakan-privasi`), dipakai `iklanSiap`; validasi `validasiTampilkanIklan` di saklar global Iklan; `muatIklan` dan `muatBeranda` juga bertag `halaman`; petunjuk admin menyebut penjaga itu; `siapkan.ts` menerbitkan Kebijakan Privasi sebelum menyalakan iklan. Tes: unit (iklanSiap dan validasi), integrasi (saklar ditolak saat draf, iklan berhenti saat ditarik dari terbit), E2E `privasi.spec.ts` (banner, skrip awal, slot, dan tombol Pengaturan cookie hilang setelah batal terbit, kembali setelah terbit lagi). |
| E2E pertama commit lanjutan: `indexing.spec.ts` gagal menunggu log "indexnow terbit berhasil", lalu `rubrik.spec.ts` gagal karena artikel tes indexing tidak sempat dibatalkan terbit. Penyebab: tes penjaga di `iklan.spec.ts` membatalkan dan menerbitkan halaman, sehingga `after()` mengirim IndexNow, dan jendela kirim IndexNow 5 menit menunda kiriman yang ditunggu `indexing.spec.ts`. | Tes penjaga dipindah ke `privasi.spec.ts`, yang berjalan setelah `indexing.spec.ts`; aturannya dicatat di `CLAUDE.md`. |

## Sumber riset

Semua diakses 6 November 2026 lewat pembacaan web (bukan dari ingatan).

- Bantuan AdSense, kode unit display (`adsbygoogle.js?client=`, `<ins class="adsbygoogle">`, `data-ad-client`, `data-ad-slot`, `push({})`; contoh ID penerbit tiruan): https://support.google.com/adsense/answer/9183460?hl=en
- Bantuan AdSense, mengubah kode unit (ukuran pasti lewat CSS boleh; ukuran lewat stylesheet luar tidak didukung resmi; contoh 320 x 100): https://support.google.com/adsense/answer/9183363?hl=en
- Bantuan AdSense, unit tidak terisi (`data-ad-status`, unit hanya diciutkan bila tidak menyebabkan reflow, unit tersembunyi): https://support.google.com/adsense/answer/10762946?hl=en
- Kebijakan penempatan iklan AdSense (label "Advertisements" atau "Sponsored Links", judul menyesatkan, hati-hati di dekat tautan dan tombol navigasi, tidak mendorong klik): https://support.google.com/adsense/answer/1346295?hl=en dan https://support.google.com/adsense/answer/1346295?hl=id
- Bantuan AdSense, Panduan ads.txt (baris `google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0`, file di akar domain, teks polos): https://support.google.com/adsense/answer/12171612?hl=en
- IAB Tech Lab ads.txt 1.1 (404 berarti tidak ada deklarasi §3.1, file wajib punya setidaknya satu baris data §3.2.1, isian baris §3.3, `text/plain`, komentar, variabel): https://iabtechlab.com/wp-content/uploads/2022/04/Ads.txt-1.1.pdf (dibaca lewat salinan https://dcmpx.remotevs.com/com/iabtechlab/SL/wp-content/uploads/2022/04/Ads.txt-1.1.pdf karena alamat asli tidak bisa dibuka dari workspace)
- Google Publisher Tag, Minimize layout shift (pesan ruang dengan CSS, bukan JavaScript; menciutkan slot kosong berisiko menggeser): https://developers.google.com/publisher-tag/guides/minimize-layout-shift?hl=en
- Publisher Ads audits, ads in viewport ("Lazily load ads that are positioned below the fold"): https://developers.google.com/publisher-ads-audits/reference/audits/ads-in-viewport
- Consent Mode, panduan pemasangan (`gtag('consent', 'default', ...)` di setiap halaman sebelum perintah lain, urutan kode, `update` setelah pengunjung memilih): https://developers.google.com/tag-platform/security/guides/consent?hl=en
- Consent Mode, ringkasan (jenis sinyal `ad_storage`, `ad_user_data`, `ad_personalization`, `analytics_storage`; mode dasar dan lanjutan): https://developers.google.com/tag-platform/security/concepts/consent-mode?hl=en
- Persyaratan CMP bersertifikat (EEA dan Inggris 16 Januari 2024, Swiss 31 Juli 2024; "Google LLC CMP" ID 300; pesan European regulations bersertifikat; tanpa CMP bersertifikat hanya non-personalisasi atau limited ads): https://support.google.com/admanager/answer/13554116 dan https://support.google.com/adsense/answer/13554020?hl=en-GB
- Pesan privasi AdSense (European regulations di Privacy & messaging): https://support.google.com/adsense/answer/14325056?hl=en dan https://support.google.com/adsense/answer/16918505
- Limited ads (tanpa data pribadi untuk personalisasi, EEA, Inggris, dan Swiss, sinyal TCF): https://support.google.com/adsense/answer/14210870
- Setelan personalisasi di tag iklan (`requestNonPersonalizedAds`; iklan non-personalisasi tetap memakai cookie untuk pembatasan frekuensi dan laporan gabungan): https://support.google.com/adsense/answer/7670312?hl=en-GB
- Daftar cookie iklan Google, "Our advertising and measurement cookies" (AdSense, "Set from partner domain": `__gads`, `__gpi`, `__gpi_optout`, `__eoi`): https://business.safety.google/adscookies/
- How Google uses cookies (cookie iklan di domain situs yang dikunjungi, masa 13 bulan): https://policies.google.com/technologies/cookies?hl=en-IN
- Implementasi AdSense AMP (`data-adtest` menjadi parameter `adtest=on`): https://github.com/ampproject/amphtml/blob/69b4c0ea4202d0006fe1e7f9c9bde9cdf8a1225a/extensions/amp-ad-network-adsense-impl/0.1/amp-ad-network-adsense-impl.js
- UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (Pasal 9, Pasal 20 ayat (2) huruf a, Pasal 21, Pasal 22 ayat (1) sampai (3), Pasal 40 ayat (1)): https://pasal.id/akn/id/act/uu/2022/27
- Persetujuan tertulis atau terekam dan syarat permintaan persetujuan (Pasal 22 ayat (4) dan (5)): https://www.hukumonline.com/berita/a/persetujuan-pemrosesan-data-pribadi-dilakukan-melalui-persetujuan-tertulis-atau-terekam-lt6565d6fcdac34/
- Payload, I18n (`supportedLanguages`, `fallbackLanguage`, deteksi bahasa dari permintaan, `translations`): https://payloadcms.com/docs/v3/configuration/i18n.md
- Payload, Customizing CSS (`custom.scss`, `@layer payload-default`, variabel `--theme-elevation` di tema gelap): https://payloadcms.com/docs/v3/admin/customizing-css.md
- Payload 3.92.1 (kode terpasang): `payload/dist/exports/i18n/id.js` (ekspor `payload/i18n/id`), `@payloadcms/translations/dist/languages/id.js` (teks bawaan Indonesia), `payload/dist/utilities/getRequestLanguage.js` (pilihan bahasa hanya di antara yang didukung), `@payloadcms/richtext-lexical/dist/**/i18n.js` (15 file terjemahan tanpa Indonesia), `@payloadcms/ui/dist/graphics/Account/Gravatar` (avatar bawaan `admin.avatar: 'gravatar'`), `@payloadcms/ui/dist/fields/FieldDescription/index.scss` (`--theme-elevation-400`), `@payloadcms/ui/dist/providers/Theme` (cookie `payload-theme` dari `cookiePrefix`).
- Skill: codebase-design (antarmuka modul `iklan`, tanpa adapter untuk satu penyedia), ux-copy (teks banner, label slot, petunjuk admin, pesan validasi), dan accessibility-review (banner, tombol Pengaturan cookie, slot berlabel).
- Probe workspace: branch `probe/rencana-8a` (satu commit per task; pohon setiap task identik dengan blok kode rencana ini).

Rencana berikutnya: **Rencana 8B (paginasi berbasis path, "Cek sekarang" status indeks dan "Pindai ulang sekarang", rate limit beacon 404, pemeriksaan ulang render 404)**.
