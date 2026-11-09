# Rencana 4B: Frontend publik lanjutan point.lat (beranda, rubrik, penulis, video, pencarian, halaman statis, indeks tools)

> **Catatan revisi 9 November 2026 (v1.1.0, keputusan pemilik).** Rencana ini sudah selesai dieksekusi; teksnya disesuaikan supaya tidak bertentangan dengan keputusan terbaru:
> 1. Hosting **Vercel paket gratis (Hobby)**: cron Vercel sekali sehari, jadwal 10 menit opsional lewat Supabase Cron (runbook rilis H5), Pro hanya saat iklan dinyalakan.
> 2. **Full Next.js dengan perintah npm**: semua perintah `pnpm` diganti padanan npm (`npm run <skrip>`, `npm run <skrip> -- <argumen>`, `npx`, `npm install`, `npm ci`), `pnpm-lock.yaml` menjadi `package-lock.json`. Potongan `package.json` lama yang masih memuat pengaturan khusus pnpm (`onlyBuiltDependencies`) adalah catatan sejarah; versi sekarang memakai `allowScripts`.
> 3. **Setiap pembaruan dikirim sebagai zip + perintah terminal** (spesifikasi §21).
> 4. **Tanpa Docker, hanya Next.js, Vercel, dan Supabase**: `docker-compose.yml`, `Dockerfile`, dan `docker/` dihapus di v1.1.0. Langkah yang dulu membuat file itu dibiarkan sebagai sejarah. Tes memakai Postgres di mesin itu sendiri (Postgres bawaan runner GitHub di CI, Postgres sistem di sesi Claude); komputer pemilik memakai proyek Supabase pratinjau.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Melengkapi semua halaman publik MVP di atas fondasi Rencana 4A: beranda dari global `beranda` sesuai mockup Arah 3 "Kartu Intinya" (judul raksasa dengan reveal, pencarian besar, mozaik pilihan redaksi dengan kotak "Hitung sendiri", strip video 9:16 gelap, tulisan terbaru, newsletter), rubrik pilar dan subkategori, halaman statis dari page builder, profil penulis, indeks dan halaman video, indeks tools, dan pencarian `/cari`, lengkap dengan sitemap, revalidasi, E2E + axe di tiga ukuran layar, tes jarak tata letak, dan anggaran JavaScript untuk setiap jenis halaman, semuanya tanpa jaringan, tanpa kredensial Cloudinary, dan tanpa dependensi baru.

**Architecture:** Polanya sama dengan Rencana 4A. Halaman di `src/app/(frontend)/` adalah server component ISR; data lewat `src/modules/konten` (`muat*()` = query Payload di `unstable_cache` bertag `TAG`, `ambil*(payload)` untuk tes integrasi, fungsi murni `susun*` yang menerjemahkan dokumen Payload ke tipe tampilan). Rute catch-all `[...jalur]` kini mencari lewat satu fungsi `muatJalur()` (artikel, pilar, halaman statis; dua segmen: subkategori), rute indeks baru (`/tools`, `/video`) statis lalu ISR, rute dokumen baru (`/penulis/{slug}`, `/video/{slug}`) ISR, dan `/cari` satu-satunya halaman dinamis. Beranda adalah hasil `susunBeranda()` atas blok global `beranda` dengan aturan yang jujur terhadap data yang belum ada (paling dibaca, iklan, newsletter). Komponen baru memakai CSS Module dan token semantik; tidak ada JavaScript klien baru (reveal judul beranda memakai animasi CSS).

**Tech Stack:** Next.js 16.3.3 (App Router, ISR, `unstable_cache`, route handler), Payload 3.92.1 (Local API, operator `like`, global dengan draf), CSS Module + custom properties, Vitest 4 (unit + integrasi, `react-dom/server` untuk tes render), Playwright 1.63 + `@axe-core/playwright` 4.14, PostgreSQL 16/17, npm 11, Node 22.23.4+.

**Spesifikasi:** `docs/superpowers/specs/2026-11-03-point-lat-design.md` (§3 Brand, rambu kredibilitas, video explainer; §4 Visual "Kartu Intinya" dan pola beranda; §5 Rendering; §6 global `beranda` dan `newsletter`, koleksi `halaman`, `penulis`, `video`, `subkategori`, `tools`; §7 URL `/`, `/{pilar}`, `/{pilar}/{subkategori}`, `/penulis/{slug}`, `/video`, `/video/{slug}`, `/cari`, `/tools`, halaman statis; §8 sitemap; §9 Video; §12 Performa; §13 Motion; §14 Aksesibilitas; §15 404 dengan pencarian; §16 Testing; §17 Cakupan; §20 skill).

**Rencana sebelumnya:** `docs/superpowers/plans/2026-11-04-rencana-1-fondasi.md`, `...-rencana-2-media-cloudinary.md`, `...-rencana-3-seo.md`, dan `docs/superpowers/plans/2026-11-04-rencana-4a-frontend.md` beserta perbaikan sesudahnya (commit `32f977b`: isi artikel sesudah kotak Intinya dibungkus `.utama`). Baseline: 248 tes unit di 35 file, 60 tes integrasi di 17 file, 31 tes E2E.

## Dependensi baru (butuh persetujuan pemilik)

**Rencana ini tidak menambah dependensi.** Spesifikasi §13 meminta GSAP untuk reveal judul raksasa beranda; paket itu diukur di probe dan tidak dipakai. Keputusan akhir ada di pemilik.

| Paket | Versi persis | Alasan | Ukuran terukur | Keputusan rencana ini |
|---|---|---|---|---|
| `gsap` | 3.15.0 (dependency, lisensi "Standard no charge license" GSAP; 3.15.1 terbit 2026-11-04 dan belum dipakai karena baru beberapa jam) | Spesifikasi §13: "GSAP hanya untuk reveal judul raksasa beranda dan angka hasil kalkulator. Dimuat dinamis hanya di dua halaman itu." | Bundel `gsap` (inti + CSSPlugin) 27,5 KB gzip (esbuild, minify); inti saja (`gsap/gsap-core`, tanpa CSSPlugin) 20,0 KB. Di build produksi probe dengan `import('gsap')` dinamis: chunk GSAP 27,2 KB (26,5 KiB), JS beranda 168,6 KiB, padahal anggaran §12 (keputusan pemilik 2026-11-04) total di bawah 160 KiB dan JS milik point. di luar kerangka di bawah 25 KB. | **Tidak dipasang.** Task 9 memakai reveal CSS murni: 0 KB JavaScript, JS beranda 141,8 KiB sama dengan artikel, judul tampil di paint pertama (LCP tidak menunggu skrip), tetap jalan tanpa JavaScript. |

**Bila pemilik tetap memilih GSAP untuk beranda**, langkah yang berubah hanya di Task 9 (kode lengkapnya ada di branch `probe/rencana-4b-gsap`, commit `912c382`, sudah lolos type check, lint, dan build):

1. Pasang paketnya: `npm install --save-exact gsap@3.15.0`.
2. Langkah 3 Task 9 diganti: `HeroBeranda` memberi H1 `data-reveal=""` dan merender komponen klien baru `src/components/motion/RevealJudul.tsx` (memuat `import('gsap')` di `useEffect`, berhenti bila `prefers-reduced-motion: reduce`, lalu `gsap.from(kata, { opacity: 0, y: '0.3em', duration: 0.4, ease: 'power3.out', stagger: 0.08 })`), dan `.kata` di `Beranda.module.css` cukup `display: inline-block` tanpa keyframes.
3. Langkah 1 Task 9 berubah: tes "judul raksasa ... walau JavaScript mati" diganti tes bahwa animasi tidak berjalan dengan reduced motion, dan tes "JS beranda tidak melebihi JS artikel" dihapus.
4. Anggaran harus diputuskan ulang: dengan GSAP, tes anggaran 160 KiB gagal di beranda (168,6 KiB). Pilihannya menaikkan anggaran beranda (misalnya 175 KiB) atau memakai `gsap/gsap-core` dengan `onUpdate` yang menulis `transform` sendiri (20,0 KB; beranda sekitar 161 KiB, tetap di atas 160 KiB).
5. Judul raksasa sudah dirender server, jadi GSAP menyembunyikannya lalu memunculkannya ulang setelah skrip dimuat (kedip yang terlihat di koneksi lambat). Menyembunyikannya sejak awal dengan CSS menghilangkan kedip tetapi menunda LCP beranda sampai JavaScript jalan.

Angka hasil kalkulator (Rencana 5) tidak terkena masalah LCP karena muncul setelah input pembaca, tetapi tetap terkena anggaran 25 KB; keputusan GSAP untuk Rencana 5 sebaiknya diambil bersamaan.

## Global Constraints

- Node `^22.23.4 || >=24.22.1`, npm 11. Versi dikunci: Next `16.3.3`, Payload `3.92.1`, `@playwright/test` `1.63.0`. **Tanpa dependensi baru** (lihat bagian sebelumnya).
- Nama domain berbahasa Indonesia seperti rencana sebelumnya (`muatJalur`, `susunBeranda`, `kartuTerbit`, `HalamanRubrik`, `KotakNewsletter`, token `--latar-terbalik`). Nama teknis framework tetap bahasa Inggris.
- Copy UI dan pesan: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru. CTA menyebut hasilnya ("Langganan gratis", "Hitung Gaji Bersih", "Baca kebijakan redaksi").
- Path publik selalu lewat `pathFor()` atau `PATH_INDEKS` (`src/lib/paths.ts`); URL media lewat `src/modules/media` (`propsGambar`, `bangunUrl`); SEO lewat `src/modules/seo` (`metadata`, `jsonLd`, `remahRoti`, `metadataTidakDitemukan`). Tidak ada `<title>`, canonical, robots, atau JSON-LD manual di halaman.
- Data halaman lewat `src/modules/konten` (`muat*` di halaman, `ambil*` di tes integrasi, `susun*` murni dan diuji unit). Path tanpa dokumen diakhiri `tanganiTidakAda(path)` di komponen halaman; `generateMetadata` mengembalikan `metadataTidakDitemukan()` (jangan memanggil `tanganiTidakAda` di `generateMetadata`: Next 16.3.3 mengirim header `Location` dua kali).
- Warna, tipografi, radius, spasi, dan motion dari token Rencana 4A; komponen hanya memakai token semantik. Warna pilar selalu bersama nama pilarnya. Kuning dan koral tidak dipakai sebagai warna teks di latar terang. Dilarang: gradien biru-ungu, teks gradien, efek kaca, glow.
- **Tata letak yang isinya diatur editor tidak boleh bergantung jumlah elemen** (misalnya `grid-row: span N`, temuan jarak kosong Rencana 4A). Jarak antarbagian hanya dari `gap` atau satu kelas margin, dan setiap tata letak baru dijaga tes E2E yang mengukur jaraknya.
- Motion: hanya `transform` dan `opacity`, kurva dan durasi dari token, tanpa animasi yang berjalan terus; `prefers-reduced-motion: reduce` mematikan semuanya.
- **Perubahan skema harus aditif.** Rencana ini hanya menambah kolom `tampilkan_tools` (blok mozaik, Task 7) dan, bila Task 11 dijalankan, `takarir` (koleksi `video`). Setelah mengubah field: `npm run generate:types`, lalu `npm run seed` sebelum `npm run build` (build membaca database dev). Bila Payload macet di "Pulling schema from database..." (pertanyaan DATA LOSS), jangan menjawab; reset database yang bersangkutan seperti Rencana 2 (`DROP DATABASE ... WITH (FORCE)` lalu `CREATE DATABASE`).
- `npm run build` membaca database dev (`pointlat` dari `.env`): layout, `/`, `/glosarium`, `/tools`, `/video`, dan 404 dirender saat build. Postgres harus jalan.
- Tes tidak memanggil jaringan. Unit dan integrasi memakai `.env.test` (database `pointlat_test`). E2E memakai database `pointlat_test_e2e` (dibuat dan diisi ulang `tests/e2e/siapkan.ts`), build produksi di port 3100, kredensial Cloudinary palsu `e2e`, dan permintaan ke `res.cloudinary.com` dicegat browser tes. Tautan contoh ke penyedia newsletter (`https://point.kit.com/intinya`) hanya diperiksa atributnya, tidak pernah dibuka.
- E2E menjalankan `next build` sendiri sehingga isi `.next/` diganti build E2E. Setelah E2E, jalankan `npm run build` lagi sebelum `npm run start` biasa.
- Server manual memakai port 3200 dan dihentikan dengan `fuser -k 3200/tcp`, jangan `pkill -f` dengan pola luas. Menunggu server: `timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'`.
- `next dev` dan `next build` di Next 16.3 bisa menambahkan blok "nextjs-agent-rules" ke `CLAUDE.md` bila mendeteksi agen AI. Periksa `git status` sebelum commit; buang blok itu dengan `git checkout CLAUDE.md` (Task 10 sengaja mengubah `CLAUDE.md`; buang blok itu saja).
- Jalankan `npm run typecheck` dan `npm run lint` di setiap task; keduanya harus bersih (lint tanpa error dan tanpa warning baru). Setiap task diakhiri unit, integrasi, dan E2E yang hijau.
- **Kegagalan E2E halaman 404 yang jarang (warisan Rencana 4A).** Tes yang membuka `/halaman-yang-tidak-ada` (`galat.spec.ts` "halaman 404 ... lolos axe" dan `motion.spec.ts` "kartu ke artikel memakai View Transitions") sesekali gagal dengan `locator resolved to <html id="__next_error__">` karena isi 404 tidak dirender di browser (lihat Risiko). Bila salah satu tes itu gagal dengan pesan tersebut, jalankan `npm run test:e2e` sekali lagi; bila gagal lagi, atau tes lain yang gagal, berhenti dan laporkan. Jangan menaikkan timeout atau melemahkan tesnya.

## Keputusan teknis (hasil riset dan probe, dipakai di semua task)

| Topik | Keputusan | Dasar |
|---|---|---|
| Rute tingkat atas | `[...jalur]` memanggil `muatJalur(jalur)`: satu segmen mencoba artikel (bukan glosarium), pilar, lalu halaman statis; dua segmen subkategori di bawah pilar dengan slug segmen pertama; tiga segmen atau lebih langsung `null` (redirect atau 404). Urutan hanya menentukan query yang jalan dulu karena slug artikel, pilar, dan halaman unik lintas koleksi. | Keputusan rute Rencana 4A (Next menolak segmen dinamis bersaudara); `slugTingkatAtas` dan `RESERVED_SLUGS` Rencana 1 (`video`, `penulis`, `tools`, `cari`, `glosarium` tidak bisa menjadi slug konten) |
| Tag cache per halaman | Rubrik dan halaman statis: `TAG_ARTIKEL` (intro dan blok bisa menautkan dokumen apa pun). Penulis: `penulis`, `artikel`, `pilar`, `media`. Indeks video: `video`, `pilar`, `media`; halaman video menambah `artikel` (artikel induk). Indeks tools: `tools`, `pilar`. Cari: `artikel`, `pilar`. Beranda: `beranda`, `media`; tag `beranda` dibuang global `beranda` (+ `sitemap`) dan `newsletter` (hook baru) serta `tagRevalidasi` artikel, pilar, video, dan kini tools. | Konvensi `TAG` Rencana 3 dan 4A; invalidasi berlebih murah, halaman basi tidak |
| Daftar kartu | Satu query `kartuTerbit(payload, syarat, jumlah)`: artikel terbit bukan glosarium, terbaru dulu, dengan pilar ter-populate. Dipakai 404, rubrik (24), penulis (24), artikel induk video, dan beranda. Paginasi ditunda (lihat Cakupan yang ditunda). | Menghindari query kartu ganda; spesifikasi §5 |
| Rubrik | Kepala berwarna pilar dengan nama dan deskripsi, navigasi subkategori ("Semua" + semua subkategori pilar, `aria-current`), intro pilar hanya bila ada teksnya, 24 tulisan terbaru. Subkategori milik pilar lain menjawab 404. Subkategori masuk `pilar.xml`. | Spesifikasi §4, §6 (`intro` pilar), §7, §8 (tidak ada jenis sitemap subkategori) |
| Halaman statis | Hero pertama di posisi teratas memegang H1, selain itu judul halaman menjadi H1; hero lain H2. Satu kolom 880 px, jarak hanya dari `gap` 40 px; `.prosa > :first-child` tanpa margin atas supaya blok teks yang dibuka subjudul tidak menambah jarak. FAQ kosong dan tool draf tidak dirender. | Spesifikasi §6 page builder; satu H1 (§14); temuan jarak Rencana 4A |
| Penulis | Foto, nama (H1), bio, keahlian, tautan `rel="me noopener"`, 24 tulisan terbaru. Penulis tanpa tulisan tetap punya halaman. | Spesifikasi §3 (rambu kredibilitas), JSON-LD ProfilePage + Person Rencana 3 |
| Video | Kartu 9:16 (poster editor atau frame Cloudinary, durasi editor atau durasi file). Halaman video memakai ulang `VideoSemat` (HLS + MP4 tanpa JavaScript) dengan prop `utama` (transkrip terbuka, tanpa keterangan ganda) dan `aspect-ratio` dari ukuran file. Artikel induk = artikel terbit yang `videoTerkait`-nya video ini. | Spesifikasi §9; catatan koleksi `video` Rencana 1; anggaran JS §12 |
| Tools | Indeks per pilar (urutan pilar CMS), kartu menautkan `/tools/{slug}` yang dibangun Rencana 5. | Spesifikasi §7, §17 |
| Pencarian | Form GET tanpa JavaScript, label terlihat. Operator `like` Payload (adapter Postgres: `ILIKE '%kata%'` per kata) di judul, deck, poin Intinya, dan keyphrase; wildcard `%`, `_`, `\` dibuang; maksimal 80 karakter, 6 kata, 20 hasil; judul yang memuat semua kata di atas. Halaman dinamis (`searchParams`), hasil per kueri di-cache. `noindex, follow`. | Spesifikasi §7, §15; `@payloadcms/drizzle` 3.92.1 `queries/parseParams.js`; dokumentasi Next `page.md` (searchParams memilih rendering dinamis) |
| Beranda | `susunBeranda` murni: urutan editor, satu H1 (hero bawaan bila editor menghapus hero), mozaik tanpa draf + kotak "Hitung sendiri" (tools terbit, bisa dimatikan lewat field aditif `tampilkanTools`), strip video pilihan editor atau 4 terbaru, blok kosong dilewati. | Spesifikasi §4 "Pola tata letak", kriteria sukses 1 (beranda bisa diubah dari CMS) |
| "Paling dibaca pekan ini" | Data kunjungan per URL baru ada di Rencana 6. Sampai saat itu blok ini menampilkan **tulisan terbaru di luar mozaik dengan judul tetap "Tulisan terbaru"** (judul isian editor diabaikan dan deskripsi field di admin menjelaskannya), bukan tulisan terbaru yang diberi label "paling dibaca". | Kejujuran isi; Rencana 4A menunda data ini ke Rencana 6 |
| Newsletter | Tampil hanya bila global `newsletter` aktif dan `urlForm` berupa URL `https`: kotak sand dengan tombol "Langganan gratis" ke form penyedia (ikon panah keluar dan teks pembaca layar). point. tidak menyimpan email. Form email sematan seperti mockup ditunda karena tiap penyedia memakai URL aksi dan nama field berbeda yang belum bisa diverifikasi tanpa akun, dan menyimpan email di koleksi sendiri berarti menyimpan data pribadi tanpa mekanisme kirim, berhenti langganan, dan kebijakan privasi (UU PDP). | Spesifikasi §6 global `newsletter`, §17 ("newsletter form (penyedia eksternal)"; newsletter otomatis Fase 2), §11 |
| Slot iklan | Blok `slotIklan` belum dirender sama sekali: tanpa penyedia dan tanpa ukuran slot, kotak kosong hanya menjadi ruang mati. `SlotIklan` yang memesan tinggi (CLS 0) dibangun Rencana 8 bersama global `iklan`. | Spesifikasi §11 (`SlotIklan` memesan tinggi sesuai ukuran slot dari global `iklan`) |
| Mozaik | Dua baris `flex-wrap` dengan basis lebar seperti mockup (kartu besar `2 1 520px`, kolom samping `1 1 320px`, baris kedua `1 1 280px` dan kotak tools `2 1 400px`), bukan grid seragam dan bukan `grid-row: span`. Kolom samping juga `flex-wrap`, jadi dua kartunya bertumpuk saat kolom sempit dan berdampingan di tablet. | Mockup `Kartu.dc.html`; temuan jarak Rencana 4A; probe screenshot 375/768/1440 |
| Jarak beranda | Setiap bagian membawa kontainernya sendiri; jarak hanya dari `margin-top` kelas `.bagian` (56 px, 40 px tepat setelah hero). Tes E2E mengukur `[40, 56, 56]` di 375 dan 1440 px. | Mockup (40/36 dan 56 px); editor bisa mengubah urutan blok |
| Reveal judul beranda | Animasi CSS per kata (naik 0,3em + opacity, 400 ms, kata berikutnya 80 ms), di dalam `@media (prefers-reduced-motion: no-preference)`. Tanpa JavaScript dan tanpa dependensi. GSAP diukur dan tidak dipakai (lihat "Dependensi baru"). | Spesifikasi §12, §13; probe build produksi: LCP beranda = FCP (412 px, juga dengan throttling Slow 4G + CPU 4x), JS beranda 141,8 KiB |
| Anggaran JS | Diukur di probe (byte terkompresi yang diunduh): beranda, artikel, rubrik, halaman statis, penulis, indeks video, halaman video, tools, dan cari semuanya 141,8 KiB, karena semua halaman baru adalah server component dan tidak menambah JavaScript klien. JS milik point. di luar kerangka di bawah 1 KB (`PemicuMasuk`). `motion.spec.ts` menjaga total di bawah 160 KiB untuk kesembilan jenis halaman dan beranda tidak melebihi artikel. | Spesifikasi §12 (anggaran yang diubah pemilik 2026-11-04) |
| Permukaan gelap | Token semantik baru `--latar-terbalik` (ink) dan `--teks-terbalik` (paper); di strip video `--fokus` diganti warna terang supaya cincin fokus tetap terlihat (18,88:1). | Spesifikasi §4, §14; mode gelap Fase 2 cukup mengganti lapis semantik |
| Takarir (opsional) | Task 11 terpisah: field aditif `takarir` (teks WebVTT) di `video`, dilayani `GET /video/{slug}/takarir.vtt`, `<track kind="captions" srcLang="id">` di `VideoSemat`. Tanpa unggahan berkas ke Cloudinary. | WCAG 2.2 1.2.2; Risiko Rencana 4A; menunggu persetujuan pemilik |

## Struktur file setelah rencana ini

```
src/app/(frontend)/
  page.tsx                                 beranda dari global beranda (menggantikan beranda sementara)
  [...jalur]/page.tsx                      artikel, rubrik pilar dan subkategori, halaman statis (lewat muatJalur)
  penulis/[slug]/page.tsx                  profil penulis (ISR)
  video/page.tsx, video/[slug]/page.tsx    indeks video (statis lalu ISR) dan halaman video (ISR)
  video/[slug]/takarir.vtt/route.ts        takarir WebVTT (Task 11, opsional)
  tools/page.tsx                           indeks tools (statis lalu ISR)
  cari/page.tsx                            pencarian (dinamis, noindex)
src/components/
  beranda/   Beranda, HeroBeranda, MozaikPilihan, StripVideo, TerbaruBeranda, KotakNewsletter (+ CSS Module)
  rubrik/    HalamanRubrik
  halaman/   HalamanStatis
  penulis/   HalamanPenulis
  video/     KartuVideo, DaftarVideo, IndeksVideo, HalamanVideo
  tools/     IndeksTools
  cari/      FormCari, HalamanCari
  kartu/KartuArtikel (+ ukuran besar dan sedang), isi/VideoSemat (+ utama, takarir), isi/KartuTool (+ TautanTool),
  artikel/Faq (+ judul dan id), galat/TidakDitemukan (+ form cari)
src/modules/konten/
  jalur.ts      muatJalur, HasilJalur
  rubrik.ts     susunRubrik, MAKS_ARTIKEL_RUBRIK
  halaman.ts    susunHalaman, JUDUL_FAQ
  penulis.ts    susunPenulis, MAKS_ARTIKEL_PENULIS
  video.ts      kartuVideo, susunVideo, labelDurasi, pathTakarir (Task 11)
  tools.ts      itemTools, kelompokkanTools
  cari.ts       rapikanKueri, kataKueri, urutkanHasil
  beranda.ts    susunBeranda, susunNewsletter, HERO_BAWAAN, JUDUL_TERBARU
  data.ts       kartuTerbit, kartuVideoTerbit, ambilRubrik, ambilHalaman, ambilPenulis, ambilDaftarVideo, ambilVideo,
                ambilTools, cariArtikel, ambilBeranda, ambilTakarir (Task 11)
  cache.ts      muatRubrik, muatHalaman, muatPenulis, muatDaftarVideo, muatVideo, muatTools, muatCari, muatBeranda,
                muatTakarir (Task 11)
src/blocks/beranda.ts (+ tampilkanTools), src/globals/Beranda.ts, Newsletter.ts (+ hook revalidasi)
src/hooks/revalidasiPublik.ts (+ revalidasiBeranda, revalidasiNewsletter), src/lib/tag.ts (DI_BERANDA + tools)
src/lib/paths.ts (PATH_INDEKS: cari, glosarium, tools, video), src/modules/seo/data.ts (/, /tools, /video, subkategori)
src/styles/tokens.css (+ --latar-terbalik, --teks-terbalik)
src/collections/Video.ts, src/lib/validasi.ts (+ takarir, Task 11)
tests/unit, tests/int, tests/e2e (baru dan diperluas)
```

## Jumlah tes yang diharapkan

Task 11 opsional dan berdiri sendiri: tanpa Task 11, angka akhir adalah baris Task 10.

| Setelah task | Unit (file) | Integrasi (file) | E2E |
|---|---|---|---|
| Baseline Rencana 4A | 248 (35) | 60 (17) | 31 |
| 1 Rubrik pilar dan subkategori | 253 (36) | 62 (18) | 36 |
| 2 Halaman statis | 257 (37) | 63 (19) | 42 |
| 3 Profil penulis | 260 (38) | 64 (20) | 47 |
| 4 Indeks dan halaman video | 265 (39) | 66 (21) | 52 |
| 5 Indeks tools | 268 (40) | 68 (22) | 56 |
| 6 Pencarian | 274 (41) | 69 (23) | 62 |
| 7 Data beranda | 281 (42) | 72 (24) | 62 |
| 8 Tampilan beranda | 285 (43) | 72 (24) | 70 |
| 9 Reveal judul dan anggaran JS | 285 (43) | 72 (24) | 72 |
| 10 CLAUDE.md dan pemeriksaan akhir | 285 (43) | 72 (24) | 72 |
| 11 Takarir WebVTT (opsional) | 287 (44) | 73 (25) | 74 |

---

### Task 1: Rubrik pilar dan subkategori di rute catch-all, subkategori di sitemap pilar

**Files:**
- Create: `src/modules/konten/rubrik.ts`, `src/modules/konten/jalur.ts`, `src/components/rubrik/HalamanRubrik.tsx`, `src/components/rubrik/Rubrik.module.css`
- Modify: `src/modules/konten/tipe.ts`, `src/modules/konten/data.ts`, `src/modules/konten/cache.ts`, `src/modules/konten/index.ts`, `src/modules/seo/data.ts`, `src/app/(frontend)/[...jalur]/page.tsx`, `tests/int/sitemap.int.spec.ts`, `tests/e2e/data.ts`, `tests/e2e/siapkan.ts`, `tests/e2e/artikel.spec.ts`
- Test: `tests/unit/rubrik.test.ts`, `tests/int/rubrik.int.spec.ts`, `tests/e2e/rubrik.spec.ts`

**Interfaces:**
- Consumes: `pilarRingkas`, `kartuArtikel`, `POPULATE_ARTIKEL`, `TAG_ARTIKEL`, `muatArtikel`, `tanganiTidakAda`, `pathDariSegmen` (Rencana 4A); `DaftarKartu`, `IsiArtikel`, `RemahRoti`, `JsonLd`, `Tautan` (4A); `remahRoti`, `jsonLd`, `metadata`, `entriSitemap`, `syaratSitemap` (Rencana 3).
- Produces:
  - `src/modules/konten/tipe.ts`: `TautanRubrik = Tautan & { aktif: boolean }`, `DataRubrik = { judul; href; deskripsi: string | null; intro: IsiDokumen; pilar: PilarRingkas; subkategori: TautanRubrik[]; artikel: KartuArtikel[]; seo: { jenis: 'pilar'; doc: PilarSeo } | { jenis: 'subkategori'; doc: SubkategoriSeo } }`.
  - `src/modules/konten/rubrik.ts`: `MAKS_ARTIKEL_RUBRIK = 24`, `susunRubrik(pilar, sub, daftarSub, artikel): DataRubrik | null`.
  - `src/modules/konten/data.ts`: fungsi internal `kartuTerbit(payload, syarat: Where[], jumlah)` (kartu artikel terbit bukan glosarium, terbaru dulu; dipakai semua daftar kartu berikutnya), `ambilRubrik(payload, pilarSlug, subSlug | null)`; `ambilTerbaru` kini memakai `kartuTerbit`.
  - `src/modules/konten/cache.ts`: `muatRubrik(pilarSlug, subSlug)` (tag `TAG_ARTIKEL`).
  - `src/modules/konten/jalur.ts`: `HasilJalur` (union `{ jenis: 'artikel'; artikel } | { jenis: 'rubrik'; rubrik }`, Task 2 menambah `halaman`) dan `muatJalur(jalur: string[]): Promise<HasilJalur | null>`.
  - Komponen `HalamanRubrik({ rubrik, situs })`.
  - Sitemap `pilar.xml` memuat `/{pilar}/{subkategori}` setelah entri pilar.
  - E2E: `SLUG_SUB = { pajak: 'pajak' }` di `tests/e2e/data.ts`; subkategori Pajak di bawah Uang & Karier berisi panduan dan explainer; intro pilar Uang & Karier.

Rute `[...jalur]` dari Rencana 4A hanya mengenali artikel. Sekarang pencariannya dipindah ke `muatJalur`: satu segmen dicoba sebagai artikel (bukan glosarium), lalu pilar; dua segmen sebagai subkategori di bawah pilar dengan slug segmen pertama; tiga segmen atau lebih langsung `null`. Slug artikel, pilar, dan halaman sudah unik lintas koleksi (validasi `slugTingkatAtas` Rencana 1), jadi urutan hanya menentukan query mana yang jalan dulu: yang paling sering diminta lebih dulu. Halaman mendapat `metadata` dan isi sesuai jenis, dan `null` tetap berakhir di `tanganiTidakAda` (redirect dari CMS atau 404). Subkategori milik pilar lain menjawab 404.

Halaman rubrik: remah roti (Beranda, pilar, subkategori), kepala berlatar warna pilar dengan nama dan deskripsi (warna selalu bersama nama), navigasi subkategori berbentuk pil ("Semua" lalu semua subkategori pilar itu, yang sedang dibuka `aria-current="page"`), intro pilar dari CMS (field `intro`, hanya di halaman pilar dan hanya bila ada teksnya), lalu "Tulisan terbaru": maksimal 24 artikel terbit bukan glosarium, terbaru dulu (glosarium punya indeks sendiri). Intro bisa menautkan dokumen apa pun, jadi data rubrik di-cache dengan `TAG_ARTIKEL` seperti halaman artikel.

Rencana 3 menunda halaman subkategori di sitemap sampai halamannya ada. Spesifikasi §8 tidak punya jenis sitemap subkategori, jadi subkategori masuk `pilar.xml` (keduanya halaman rubrik), dengan aturan `layakSitemap` yang sudah ada (butuh slug pilar, tidak noindex, canonical ke dirinya).

Artikel contoh E2E kini punya subkategori, jadi remah roti panduan menjadi Beranda, Uang & Karier, Pajak; tes artikel Rencana 4A disesuaikan.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/rubrik.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it } from 'vitest'

  import { HalamanRubrik } from '@/components/rubrik/HalamanRubrik'
  import { susunRubrik } from '@/modules/konten/rubrik'
  import type { KartuArtikel } from '@/modules/konten/tipe'
  import type { Pilar, Subkategori } from '@/payload-types'

  import { isiLexical, p, situs } from './seo-contoh'

  const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }

  const pilar: Pilar = {
    id: 1,
    nama: 'Uang & Karier',
    slug: 'uang-karier',
    warna: 'hijau',
    deskripsi: 'Gaji, pajak, tabungan, utang, dan karier.',
    intro: isiLexical([p('Mulai dari gaji bersih, lalu atur tabungan.')]) as Pilar['intro'],
    disclaimer: 'Bukan saran keuangan.',
    ...waktu,
  }

  const pajak: Subkategori = { id: 7, nama: 'Pajak', slug: 'pajak', pilar: 1, deskripsi: 'PPh 21, PTKP, dan lapor SPT.', ...waktu }
  const daftarSub = [pajak, { id: 8, nama: 'Tabungan', slug: 'tabungan' }]

  const kartu: KartuArtikel = {
    id: 10,
    judul: 'Cara hitung gaji bersih',
    href: '/cara-hitung-gaji-bersih',
    tipe: 'panduan',
    pilar: { nama: 'Uang & Karier', slug: 'uang-karier', href: '/uang-karier', warna: 'hijau', disclaimer: null },
    intinya: 'Gaji kotor dikurangi PPh 21 dan BPJS.',
  }

  describe('susunRubrik', () => {
    it('pilar: intro, navigasi subkategori dengan "Semua" aktif, dan masukan SEO pilar', () => {
      const rubrik = susunRubrik(pilar, null, daftarSub, [kartu])
      expect(rubrik).toMatchObject({ judul: 'Uang & Karier', href: '/uang-karier', deskripsi: 'Gaji, pajak, tabungan, utang, dan karier.' })
      expect(rubrik?.intro).toEqual(pilar.intro)
      expect(rubrik?.subkategori).toEqual([
        { label: 'Semua', href: '/uang-karier', aktif: true },
        { label: 'Pajak', href: '/uang-karier/pajak', aktif: false },
        { label: 'Tabungan', href: '/uang-karier/tabungan', aktif: false },
      ])
      expect(rubrik?.seo).toMatchObject({ jenis: 'pilar', doc: { slug: 'uang-karier' } })
    })

    it('subkategori: tanpa intro pilar, subkategori aktif, dan SEO subkategori di bawah pilarnya', () => {
      const rubrik = susunRubrik(pilar, pajak, daftarSub, [])
      expect(rubrik).toMatchObject({ judul: 'Pajak', href: '/uang-karier/pajak', deskripsi: 'PPh 21, PTKP, dan lapor SPT.', intro: null, artikel: [] })
      expect(rubrik?.subkategori.filter((s) => s.aktif).map((s) => s.label)).toEqual(['Pajak'])
      expect(rubrik?.seo).toMatchObject({ jenis: 'subkategori', doc: { slug: 'pajak', pilar: { slug: 'uang-karier' } } })
    })

    it('intro kosong tidak ditampilkan; pilar tanpa slug tidak punya halaman', () => {
      expect(susunRubrik({ ...pilar, intro: isiLexical([p('  ')]) as Pilar['intro'] }, null, [], [])?.intro).toBeNull()
      expect(susunRubrik({ ...pilar, slug: null }, null, [], [])).toBeNull()
    })
  })

  describe('HalamanRubrik', () => {
    it('remah roti, kepala berwarna pilar, navigasi subkategori, intro, dan kartu', () => {
      const rubrik = susunRubrik(pilar, null, daftarSub, [kartu])!
      const html = renderToStaticMarkup(h(HalamanRubrik, { rubrik, situs }))
      expect(html).toMatch(/<header class="[^"]*" data-warna="hijau"><p class="[^"]*">Rubrik<\/p><h1 class="[^"]*">Uang &amp; Karier<\/h1>/)
      expect(html).toContain('<nav aria-label="Subkategori Uang &amp; Karier"')
      expect(html).toMatch(/<a aria-current="page" class="[^"]*" href="\/uang-karier">Semua<\/a>/)
      expect(html).toContain('Mulai dari gaji bersih, lalu atur tabungan.')
      expect(html).toContain('<h2 id="tulisan-rubrik"')
      expect(html).toContain('href="/cara-hitung-gaji-bersih"')
      expect(html).toContain('"@type":"BreadcrumbList"')
    })

    it('subkategori tanpa tulisan: kicker nama pilar dan pesan kosong', () => {
      const rubrik = susunRubrik(pilar, pajak, [], [])!
      const html = renderToStaticMarkup(h(HalamanRubrik, { rubrik, situs }))
      expect(html).toMatch(/<p class="[^"]*">Uang &amp; Karier<\/p><h1 class="[^"]*">Pajak<\/h1>/)
      expect(html).not.toContain('aria-label="Subkategori')
      expect(html).toContain('Belum ada tulisan di rubrik ini. Tulisan baru tampil di sini setelah terbit.')
    })
  })
  ```

  `tests/int/rubrik.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { ambilRubrik } from '@/modules/konten/data'

  import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
  import { getTestPayload, unik } from './helpers'

  describe('ambilRubrik', () => {
    it('pilar dan subkategori: tulisan terbit terbaru tanpa glosarium dan draf, subkategori milik pilar itu saja', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const lain = await payload.create({ collection: 'pilar', data: { nama: unik('Tekno'), warna: 'oranye', deskripsi: 'Tekno.' } })
      const pajak = await payload.create({ collection: 'subkategori', data: { nama: unik('Pajak'), pilar: relasi.pilar.id } })
      const subLain = await payload.create({ collection: 'subkategori', data: { nama: unik('AI'), pilar: lain.id } })

      const lama = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), subkategori: pajak.id } })
      const baru = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium' } })
      await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft', subkategori: pajak.id } })

      const pilar = await ambilRubrik(payload, relasi.pilar.slug as string, null)
      expect(pilar?.judul).toBe(relasi.pilar.nama)
      expect(pilar?.artikel.map((k) => k.id)).toEqual([baru.id, lama.id])
      expect(pilar?.subkategori.map((s) => s.label)).toEqual(['Semua', pajak.nama])

      const sub = await ambilRubrik(payload, relasi.pilar.slug as string, pajak.slug as string)
      expect(sub?.judul).toBe(pajak.nama)
      expect(sub?.artikel.map((k) => k.id)).toEqual([lama.id])

      expect(await ambilRubrik(payload, relasi.pilar.slug as string, subLain.slug as string)).toBeNull()
      expect(await ambilRubrik(payload, relasi.pilar.slug as string, 'tidak-ada')).toBeNull()
      expect(await ambilRubrik(payload, 'favicon.ico', null)).toBeNull()
    })
  })
  ```

  Tambahkan tes sitemap di `tests/int/sitemap.int.spec.ts`:

  ```diff
  diff --git a/tests/int/sitemap.int.spec.ts b/tests/int/sitemap.int.spec.ts
  index 5754b89..43fd74f 100644
  --- a/tests/int/sitemap.int.spec.ts
  +++ b/tests/int/sitemap.int.spec.ts
  @@ -84,6 +84,15 @@ describe('data rute teknis dari Payload', () => {
       expect(entri?.lastmod).toBe(terbaru([istilah.terbitPada]))
     })
   
  +  it('sitemap pilar memuat halaman subkategori di bawah pilarnya', async () => {
  +    const payload = await getTestPayload()
  +    const relasi = await siapkanRelasiArtikel(payload)
  +    const sub = await payload.create({ collection: 'subkategori', data: { nama: unik('Pajak'), pilar: relasi.pilar.id } })
  +    const loc = (await ambilEntriSitemap(payload, 'pilar', situs)).map((e) => e.loc)
  +    expect(loc).toContain(url(`/${relasi.pilar.slug}`))
  +    expect(loc).toContain(url(`/${relasi.pilar.slug}/${sub.slug}`))
  +  })
  +
     it('halaman draf dari seed tidak masuk sitemap halaman', async () => {
       const payload = await getTestPayload()
       const halaman = await payload.create({ collection: 'halaman', draft: true, data: { judul: unik('Draf halaman') } })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/rubrik.test.ts` dengan `Cannot find package '@/components/rubrik/HalamanRubrik'`.

- [ ] **Langkah 3: Data rubrik**

  Tambahkan tipe di akhir `src/modules/konten/tipe.ts` (dan impor tipe SEO-nya):

  ```diff
  diff --git a/src/modules/konten/tipe.ts b/src/modules/konten/tipe.ts
  index f4bb589..640b905 100644
  --- a/src/modules/konten/tipe.ts
  +++ b/src/modules/konten/tipe.ts
  @@ -1,6 +1,6 @@
   import type { TipeArtikel, WarnaPilar } from '@/lib/konstanta'
   import type { IsiDokumen } from '@/modules/seo/lexical'
  -import type { ArtikelSeo } from '@/modules/seo/tipe'
  +import type { ArtikelSeo, PilarSeo, SubkategoriSeo } from '@/modules/seo/tipe'
   
   /**
    * Data tampilan yang sudah siap dirender komponen publik. Komponen tidak membaca dokumen Payload
  @@ -77,3 +77,18 @@ export type Istilah = { judul: string; href: string; definisi: string }
   
   /** Istilah glosarium per huruf awal; `id` dipakai jangkar navigasi huruf. */
   export type KelompokIstilah = { huruf: string; id: string; istilah: Istilah[] }
  +
  +/** Tautan navigasi subkategori di halaman rubrik; `aktif` untuk halaman yang sedang dibuka. */
  +export type TautanRubrik = Tautan & { aktif: boolean }
  +
  +/** Halaman rubrik `/{pilar}` dan `/{pilar}/{subkategori}`. `seo` dipakai `metadata()`, `jsonLd()`, `remahRoti()`. */
  +export type DataRubrik = {
  +  judul: string
  +  href: string
  +  deskripsi: string | null
  +  intro: IsiDokumen
  +  pilar: PilarRingkas
  +  subkategori: TautanRubrik[]
  +  artikel: KartuArtikel[]
  +  seo: { jenis: 'pilar'; doc: PilarSeo } | { jenis: 'subkategori'; doc: SubkategoriSeo }
  +}
  ```

  `src/modules/konten/rubrik.ts`

  ```ts
  import type { Pilar, Subkategori } from '@/payload-types'
  import { pathFor } from '@/lib/paths'
  import { teksIsi, type IsiDokumen } from '@/modules/seo/lexical'
  import type { PilarSeo, SubkategoriSeo } from '@/modules/seo/tipe'

  import { pilarRingkas } from './artikel'
  import type { DataRubrik, KartuArtikel } from './tipe'

  /** Jumlah tulisan terbaru di halaman rubrik. Paginasi menyusul bila satu pilar melewati angka ini. */
  export const MAKS_ARTIKEL_RUBRIK = 24

  type SubkategoriRingkas = Pick<Subkategori, 'id' | 'nama' | 'slug'>

  /** Intro rubrik hanya tampil bila ada teksnya (editor bisa menyisakan paragraf kosong). */
  function introBerisi(intro: IsiDokumen): IsiDokumen {
    return teksIsi(intro).join('').trim() ? intro : null
  }

  /**
   * Data halaman rubrik pilar (`sub` `null`) atau subkategori. Navigasi berisi "Semua" (pilar) lalu
   * semua subkategori pilar itu, dengan halaman yang sedang dibuka ditandai `aktif`. Intro pilar
   * hanya tampil di halaman pilar. `null` bila pilar belum punya slug.
   */
  export function susunRubrik(
    pilar: Pilar,
    sub: Subkategori | null,
    daftarSub: SubkategoriRingkas[],
    artikel: KartuArtikel[],
  ): DataRubrik | null {
    const ringkas = pilarRingkas(pilar)
    if (!ringkas) return null
    const subkategori = daftarSub
      .filter((s) => s.slug)
      .map((s) => ({
        label: s.nama,
        href: pathFor({ jenis: 'subkategori', slug: s.slug as string, pilarSlug: ringkas.slug }),
        aktif: s.id === sub?.id,
      }))
    const navigasi = subkategori.length > 0 ? [{ label: 'Semua', href: ringkas.href, aktif: !sub }, ...subkategori] : []
    if (sub?.slug) {
      const doc = { ...sub, pilar } as SubkategoriSeo
      return {
        judul: sub.nama,
        href: pathFor({ jenis: 'subkategori', slug: sub.slug, pilarSlug: ringkas.slug }),
        deskripsi: sub.deskripsi?.trim() || null,
        intro: null,
        pilar: ringkas,
        subkategori: navigasi,
        artikel,
        seo: { jenis: 'subkategori', doc },
      }
    }
    return {
      judul: pilar.nama,
      href: ringkas.href,
      deskripsi: pilar.deskripsi?.trim() || null,
      intro: introBerisi(pilar.intro as IsiDokumen),
      pilar: ringkas,
      subkategori: navigasi,
      artikel,
      seo: { jenis: 'pilar', doc: pilar as PilarSeo },
    }
  }
  ```

  `kartuTerbit` menjadi satu-satunya query kartu artikel; `ambilTerbaru` (404) memakainya:

  ```diff
  diff --git a/src/modules/konten/data.ts b/src/modules/konten/data.ts
  index 7334894..27e40ff 100644
  --- a/src/modules/konten/data.ts
  +++ b/src/modules/konten/data.ts
  @@ -7,8 +7,9 @@ import { gabungTerkait, kartuArtikel, MAKS_TERKAIT, susunArtikel } from './artik
   import { kelompokkanIstilah } from './glosarium'
   import { MAKS_PATH } from './log404'
   import type { RedirectTersimpan } from './redirect'
  +import { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
   import { susunFooter, susunHeader } from './tampilan'
  -import type { DataArtikel, DataFooter, DataHeader, KartuArtikel, KelompokIstilah } from './tipe'
  +import type { DataArtikel, DataFooter, DataHeader, DataRubrik, KartuArtikel, KelompokIstilah } from './tipe'
   
   /**
    * Query Payload untuk halaman publik. Fungsi di sini menerima `payload` supaya bisa diuji integrasi;
  @@ -125,11 +126,14 @@ export async function cariRedirect(payload: Payload, path: string): Promise<Redi
     return docs[0] ? { kode: docs[0].kode, ke: docs[0].ke ?? null } : null
   }
   
  -/** Artikel terbit terbaru (bukan glosarium) untuk halaman 404. */
  -export async function ambilTerbaru(payload: Payload, jumlah: number): Promise<KartuArtikel[]> {
  +/**
  + * Kartu artikel terbit (bukan glosarium) yang memenuhi `syarat`, terbaru dulu. Dipakai semua daftar
  + * kartu: 404, rubrik, dan seterusnya.
  + */
  +async function kartuTerbit(payload: Payload, syarat: Where[], jumlah: number): Promise<KartuArtikel[]> {
     const { docs } = await payload.find({
       collection: 'artikel',
  -    where: { and: [terbit, { tipe: { not_equals: 'glosarium' } }] },
  +    where: { and: [terbit, { tipe: { not_equals: 'glosarium' } }, ...syarat] },
       sort: '-terbitPada',
       limit: jumlah,
       depth: 1,
  @@ -139,3 +143,41 @@ export async function ambilTerbaru(payload: Payload, jumlah: number): Promise<Ka
     })
     return docs.map(kartuArtikel).filter((k): k is KartuArtikel => k !== null)
   }
  +
  +/** Artikel terbit terbaru (bukan glosarium) untuk halaman 404. */
  +export async function ambilTerbaru(payload: Payload, jumlah: number): Promise<KartuArtikel[]> {
  +  return kartuTerbit(payload, [], jumlah)
  +}
  +
  +/**
  + * Halaman rubrik `/{pilar}` (`subSlug` `null`) atau `/{pilar}/{subkategori}`. `null` bila pilar
  + * tidak ada, atau subkategori tidak ada atau milik pilar lain. Intro pilar dimuat seperti isi
  + * artikel (depth 2) supaya tautan dan gambar di dalamnya bisa dirender.
  + */
  +export async function ambilRubrik(payload: Payload, pilarSlug: string, subSlug: string | null): Promise<DataRubrik | null> {
  +  if (validasiFormatSlug(pilarSlug) !== true || (subSlug !== null && validasiFormatSlug(subSlug) !== true)) return null
  +  const { docs } = await payload.find({
  +    collection: 'pilar',
  +    where: { slug: { equals: pilarSlug } },
  +    depth: 2,
  +    limit: 1,
  +    pagination: false,
  +    populate: POPULATE_ARTIKEL,
  +  })
  +  const pilar = docs[0]
  +  if (!pilar) return null
  +  // Subkategori sedikit per pilar: semuanya dimuat sekali untuk navigasi dan untuk halaman subkategori.
  +  const { docs: daftarSub } = await payload.find({
  +    collection: 'subkategori',
  +    where: { pilar: { equals: pilar.id } },
  +    sort: 'nama',
  +    depth: 1,
  +    limit: 100,
  +    pagination: false,
  +    populate: { pilar: POPULATE_ARTIKEL.pilar, media: POPULATE_ARTIKEL.media },
  +  })
  +  const sub = subSlug === null ? null : daftarSub.find((s) => s.slug === subSlug)
  +  if (sub === undefined) return null
  +  const syarat: Where[] = [{ pilar: { equals: pilar.id } }, ...(sub ? [{ subkategori: { equals: sub.id } }] : [])]
  +  return susunRubrik(pilar, sub, daftarSub, await kartuTerbit(payload, syarat, MAKS_ARTIKEL_RUBRIK))
  +}
  ```

  ```diff
  diff --git a/src/modules/konten/cache.ts b/src/modules/konten/cache.ts
  index 54c1664..ecfdc16 100644
  --- a/src/modules/konten/cache.ts
  +++ b/src/modules/konten/cache.ts
  @@ -5,7 +5,7 @@ import { getPayload } from 'payload'
   import { TAG } from '@/lib/tag'
   import { ambilSitus } from '@/modules/seo/situs'
   
  -import { ambilArtikel, ambilFooter, ambilGlosarium, ambilHeader, ambilTerbaru, cariRedirect } from './data'
  +import { ambilArtikel, ambilFooter, ambilGlosarium, ambilHeader, ambilRubrik, ambilTerbaru, cariRedirect } from './data'
   
   /**
    * Data halaman publik yang di-cache dengan tag (spesifikasi §5 "Rendering"). Halaman dirender statis
  @@ -75,3 +75,13 @@ export const muatTerbaru = unstable_cache(async (jumlah: number) => ambilTerbaru
     tags: [TAG.koleksi('artikel'), TAG.koleksi('pilar')],
     revalidate: SEJAM,
   })
  +
  +/**
  + * Halaman rubrik pilar dan subkategori. Intro pilar bisa menautkan dokumen apa pun, jadi tagnya sama
  + * dengan halaman artikel.
  + */
  +export const muatRubrik = unstable_cache(
  +  async (pilarSlug: string, subSlug: string | null) => ambilRubrik(await payload(), pilarSlug, subSlug),
  +  ['konten', 'rubrik'],
  +  { tags: TAG_ARTIKEL, revalidate: SEJAM },
  +)
  ```

  `src/modules/konten/jalur.ts`

  ```ts
  import { muatArtikel, muatRubrik } from './cache'
  import type { DataArtikel, DataRubrik } from './tipe'

  /** Dokumen di balik path rute catch-all `[...jalur]`. */
  export type HasilJalur = { jenis: 'artikel'; artikel: DataArtikel } | { jenis: 'rubrik'; rubrik: DataRubrik }

  /**
   * Mencari dokumen untuk path tingkat atas. Satu segmen: artikel (bukan glosarium), lalu pilar. Dua
   * segmen: subkategori di bawah pilarnya. Slug artikel dan pilar unik lintas koleksi (validasi CMS),
   * jadi urutan hanya menentukan query mana yang dijalankan dulu. `null` berarti redirect atau 404.
   */
  export async function muatJalur(jalur: string[]): Promise<HasilJalur | null> {
    if (jalur.length === 1) {
      const artikel = await muatArtikel(jalur[0], false)
      if (artikel) return { jenis: 'artikel', artikel }
      const rubrik = await muatRubrik(jalur[0], null)
      return rubrik ? { jenis: 'rubrik', rubrik } : null
    }
    if (jalur.length === 2) {
      const rubrik = await muatRubrik(jalur[0], jalur[1])
      return rubrik ? { jenis: 'rubrik', rubrik } : null
    }
    return null
  }
  ```

  ```diff
  diff --git a/src/modules/konten/index.ts b/src/modules/konten/index.ts
  index ed6b889..41b3fe0 100644
  --- a/src/modules/konten/index.ts
  +++ b/src/modules/konten/index.ts
  @@ -3,12 +3,15 @@
    *
    * - `muat*()` dipanggil halaman dan layout: query Payload yang di-cache dengan tag `TAG`.
    * - `ambil*(payload)` versi tanpa cache untuk tes integrasi dan skrip.
  + * - `muatJalur(jalur)` untuk rute catch-all: artikel, rubrik pilar dan subkategori.
    * - `tanganiTidakAda(path)` untuk path tanpa dokumen: redirect 301 dari CMS atau 404.
    * - Fungsi murni (`susunHeader`, `susunArtikel`, `tanggalIndonesia`, ...) menerjemahkan dokumen
    *   Payload ke tipe di `tipe.ts`, supaya komponen tidak membaca relasi Payload mentah.
    */
  -export { muatArtikel, muatFooter, muatGlosarium, muatHeader, muatRedirect, muatSitus, muatTerbaru, TAG_ARTIKEL } from './cache'
  -export { ambilArtikel, ambilFooter, ambilGlosarium, ambilHeader, ambilTerbaru, cariRedirect } from './data'
  +export { muatArtikel, muatFooter, muatGlosarium, muatHeader, muatRedirect, muatRubrik, muatSitus, muatTerbaru, TAG_ARTIKEL } from './cache'
  +export { ambilArtikel, ambilFooter, ambilGlosarium, ambilHeader, ambilRubrik, ambilTerbaru, cariRedirect } from './data'
  +export { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
  +export { muatJalur, type HasilJalur } from './jalur'
   export { tanganiTidakAda } from './navigasi'
   export { pathDariSegmen, tujuanRedirect } from './redirect'
   export { catat404, rapikanLog404 } from './log404'
  ```

- [ ] **Langkah 4: Subkategori di sitemap pilar**

  ```diff
  diff --git a/src/modules/seo/data.ts b/src/modules/seo/data.ts
  index c83355e..e3160a5 100644
  --- a/src/modules/seo/data.ts
  +++ b/src/modules/seo/data.ts
  @@ -81,9 +81,30 @@ export async function ambilEntriSitemap(payload: Payload, jenis: JenisSitemap, s
     })
     const masukan = docs.map((doc) => ({ jenis: tipePath[jenis], doc }) as MasukanSeo)
     const entri = entriSitemap(masukan, situs)
  +  if (jenis === 'pilar') return [...entri, ...(await ambilEntriSubkategori(payload, situs))]
     return jenis === 'halaman' ? [...(await ambilEntriIndeks(payload, situs)), ...entri] : entri
   }
   
  +/**
  + * Halaman subkategori `/{pilar}/{subkategori}` adalah halaman rubrik, jadi ikut sitemap pilar
  + * (spesifikasi §8 tidak punya jenis sitemap subkategori). Path butuh slug pilar: depth 1.
  + */
  +async function ambilEntriSubkategori(payload: Payload, situs: Pick<PengaturanSitus, 'urlSitus'>): Promise<EntriSitemap[]> {
  +  const { docs } = await payload.find({
  +    collection: 'subkategori',
  +    where: { 'seo.noindex': { not_equals: true } },
  +    depth: 1,
  +    limit: MAKS_URL_SITEMAP,
  +    pagination: false,
  +    sort: '-updatedAt',
  +    populate: { pilar: { slug: true } },
  +  })
  +  return entriSitemap(
  +    docs.map((doc) => ({ jenis: 'subkategori', doc }) as MasukanSeo),
  +    situs,
  +  )
  +}
  +
   /**
    * Halaman indeks tanpa dokumen sendiri ikut sitemap halaman bila ada isinya. `/glosarium`:
    * `lastmod` = istilah terbaru (`diperbaruiBesar ?? terbitPada`), sama dengan aturan artikel.
  ```

- [ ] **Langkah 5: Komponen dan rute**

  `src/components/rubrik/Rubrik.module.css`

  ```css
  /* Halaman rubrik pilar dan subkategori. */
  .halaman {
    display: grid;
    gap: var(--ruang-6);
    padding-top: var(--ruang-4);
  }

  .kepala {
    display: grid;
    gap: var(--ruang-3);
    padding: var(--ruang-8) var(--ruang-6);
    border-radius: var(--radius-kartu);
    background: var(--pilar);
    color: var(--pilar-teks);
  }

  .label {
    font-size: var(--teks-label);
    font-weight: 800;
    letter-spacing: var(--jarak-label);
    text-transform: uppercase;
  }

  .judul {
    font-size: var(--teks-h1);
    font-stretch: var(--lebar-h1);
    line-height: var(--tinggi-h1);
    letter-spacing: -0.02em;
  }

  .deskripsi {
    max-width: 60ch;
    font-size: var(--teks-deck);
    line-height: 1.45;
  }

  .navigasi ul {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ruang-2);
    padding: 0;
    list-style: none;
  }

  .pil {
    display: inline-flex;
    align-items: center;
    min-height: var(--sentuh-min);
    padding: 0 var(--ruang-4);
    border: var(--garis-tipis) solid var(--garis);
    border-radius: var(--radius-pil);
    font-size: var(--teks-kecil);
    font-weight: 600;
    text-decoration: none;
    transition: transform var(--durasi-cepat) var(--kurva);
  }

  .pil:hover {
    text-decoration: underline;
  }

  .pil:active {
    transform: scale(0.97);
  }

  .pil[aria-current='page'] {
    background: var(--tombol);
    color: var(--tombol-teks);
  }

  .tulisan {
    display: grid;
    gap: var(--ruang-6);
    margin-top: var(--ruang-4);
  }

  .subjudul {
    font-size: var(--teks-h2);
    font-stretch: var(--lebar-h2);
  }

  .kosong {
    max-width: 60ch;
    padding: var(--ruang-6);
    border-radius: var(--radius-kartu);
    background: var(--permukaan);
  }

  @media (min-width: 48rem) {
    .kepala {
      padding: var(--ruang-10);
    }
  }
  ```

  `src/components/rubrik/HalamanRubrik.tsx`

  ```tsx
  import { JsonLd } from '@/components/dasar/JsonLd'
  import { RemahRoti } from '@/components/dasar/RemahRoti'
  import { Tautan } from '@/components/dasar/Tautan'
  import { IsiArtikel } from '@/components/isi/IsiArtikel'
  import { DaftarKartu } from '@/components/kartu/KartuArtikel'
  import type { DataRubrik } from '@/modules/konten/tipe'
  import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
  import type { Situs } from '@/modules/seo/tipe'

  import gaya from './Rubrik.module.css'

  /**
   * Halaman rubrik `/{pilar}` dan `/{pilar}/{subkategori}`: kepala berwarna pilar (nama selalu
   * tertulis), navigasi subkategori, intro pilar dari CMS, lalu kartu tulisan terbaru.
   */
  export function HalamanRubrik({ rubrik, situs }: { rubrik: DataRubrik; situs: Situs }) {
    const subkategori = rubrik.seo.jenis === 'subkategori'
    return (
      <div className={`kontainer ${gaya.halaman}`}>
        <JsonLd data={jsonLd(rubrik.seo, situs)} />
        <RemahRoti remah={remahRoti(rubrik.seo)} />
        <header className={gaya.kepala} data-warna={rubrik.pilar.warna}>
          <p className={gaya.label}>{subkategori ? rubrik.pilar.nama : 'Rubrik'}</p>
          <h1 className={gaya.judul}>{rubrik.judul}</h1>
          {rubrik.deskripsi && <p className={gaya.deskripsi}>{rubrik.deskripsi}</p>}
        </header>
        {rubrik.subkategori.length > 0 && (
          <nav aria-label={`Subkategori ${rubrik.pilar.nama}`} className={gaya.navigasi}>
            <ul>
              {rubrik.subkategori.map((s) => (
                <li key={s.href}>
                  <Tautan href={s.href} aria-current={s.aktif ? 'page' : undefined} className={gaya.pil}>
                    {s.label}
                  </Tautan>
                </li>
              ))}
            </ul>
          </nav>
        )}
        {rubrik.intro && <IsiArtikel isi={rubrik.intro} cloudName={situs.cloudName} />}
        <section aria-labelledby="tulisan-rubrik" className={gaya.tulisan}>
          <h2 id="tulisan-rubrik" className={gaya.subjudul}>
            Tulisan terbaru
          </h2>
          {rubrik.artikel.length > 0 ? (
            <DaftarKartu kartu={rubrik.artikel} />
          ) : (
            <p className={gaya.kosong}>Belum ada tulisan di rubrik ini. Tulisan baru tampil di sini setelah terbit.</p>
          )}
        </section>
      </div>
    )
  }
  ```

  `src/app/(frontend)/[...jalur]/page.tsx` diganti seluruhnya:

  `src/app/(frontend)/[...jalur]/page.tsx`

  ```tsx
  import type { Metadata } from 'next'
  import { cache } from 'react'

  import { HalamanArtikel } from '@/components/artikel/HalamanArtikel'
  import { HalamanRubrik } from '@/components/rubrik/HalamanRubrik'
  import { muatJalur, muatSitus, pathDariSegmen, tanganiTidakAda } from '@/modules/konten'
  import { metadata, metadataTidakDitemukan } from '@/modules/seo'

  type Props = { params: Promise<{ jalur: string[] }> }

  /**
   * Semua path publik yang tidak ditangani rute yang lebih spesifik: artikel `/{slug}`, rubrik
   * `/{pilar}` dan `/{pilar}/{subkategori}`. Halaman dirender saat pertama diminta lalu disimpan
   * (ISR); tag cache data membuangnya saat konten berubah. Path tanpa dokumen diteruskan ke
   * `tanganiTidakAda` (redirect dari CMS atau 404), hasilnya juga disimpan.
   */
  export function generateStaticParams() {
    return []
  }

  /** Satu pencarian per permintaan untuk `generateMetadata` dan halaman. */
  const cari = cache(muatJalur)

  /**
   * Path tanpa dokumen: metadata 404 di sini (sama dengan `not-found.tsx`, supaya judul tetap setelah
   * hidrasi), sedangkan keputusan redirect atau 404 hanya di halaman.
   */
  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const hasil = await cari((await params).jalur)
    const situs = await muatSitus()
    switch (hasil?.jenis) {
      case 'artikel':
        return metadata({ jenis: 'artikel', doc: hasil.artikel.seo }, situs)
      case 'rubrik':
        return metadata(hasil.rubrik.seo, situs)
      default:
        return metadataTidakDitemukan(situs)
    }
  }

  export default async function Halaman({ params }: Props) {
    const { jalur } = await params
    const hasil = await cari(jalur)
    switch (hasil?.jenis) {
      case 'artikel':
        return <HalamanArtikel artikel={hasil.artikel} situs={await muatSitus()} />
      case 'rubrik':
        return <HalamanRubrik rubrik={hasil.rubrik} situs={await muatSitus()} />
      default:
        return tanganiTidakAda(pathDariSegmen(jalur))
    }
  }
  ```

- [ ] **Langkah 6: Jalankan tes unit dan integrasi**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 36 passed (36)`, `Tests 253 passed (253)`; integrasi `Test Files 18 passed (18)`, `Tests 62 passed (62)`.

- [ ] **Langkah 7: Konten contoh dan tes E2E rubrik**

  ```diff
  diff --git a/tests/e2e/data.ts b/tests/e2e/data.ts
  index 589af39..902687a 100644
  --- a/tests/e2e/data.ts
  +++ b/tests/e2e/data.ts
  @@ -17,6 +17,9 @@ export const SLUG = {
     danaDaruratLama: 'dana-darurat-lama',
   } as const
   
  +/** Subkategori contoh di bawah pilar Uang & Karier. */
  +export const SLUG_SUB = { pajak: 'pajak' } as const
  +
   export const JUDUL_PANDUAN = 'Cara hitung gaji bersih setelah PPh 21 dan BPJS'
   
   // Pembuat JSON Lexical minimal (bentuk yang disimpan Payload 3.92).
  ```

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index 6a05ca3..6dae137 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -6,7 +6,7 @@ import { pakaiKlien } from '@/modules/media'
   import { klienPalsu } from '@/modules/media/palsu'
   import { seed } from '@/seed/seed'
   
  -import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, p, SLUG, tautanKe } from './data'
  +import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, p, SLUG, SLUG_SUB, tautanKe } from './data'
   
   /**
    * Mengisi database E2E sebelum server dibangun dan dinyalakan (`webServer` di playwright.config.ts).
  @@ -16,7 +16,7 @@ import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, p, SLUG, tautanKe } fr
   pakaiKlien(klienPalsu('e2e'))
   const payload = await getPayload({ config })
   
  -for (const koleksi of ['artikel', 'redirect', 'log-404', 'media'] as const) {
  +for (const koleksi of ['artikel', 'subkategori', 'redirect', 'log-404', 'media'] as const) {
     await payload.delete({ collection: koleksi, where: { id: { exists: true } } })
   }
   await seed(payload, { emailAdmin: ADMIN_E2E.email, passwordAdmin: ADMIN_E2E.password })
  @@ -24,6 +24,16 @@ await seed(payload, { emailAdmin: ADMIN_E2E.email, passwordAdmin: ADMIN_E2E.pass
   const pilar = Object.fromEntries((await payload.find({ collection: 'pilar', limit: 10 })).docs.map((d) => [d.slug, d.id]))
   const redaksi = (await payload.find({ collection: 'penulis', where: { slug: { equals: 'redaksi' } }, limit: 1 })).docs[0]
   
  +await payload.update({
  +  collection: 'pilar',
  +  id: pilar['uang-karier'],
  +  data: { intro: isi(p('Mulai dari gaji bersih, lalu atur tabungan dan utang. Setiap panduan punya contoh hitung.')) },
  +})
  +const pajak = await payload.create({
  +  collection: 'subkategori',
  +  data: { nama: 'Pajak', slug: SLUG_SUB.pajak, pilar: pilar['uang-karier'], deskripsi: 'PPh 21, PTKP, dan lapor SPT tahunan.' },
  +})
  +
   async function buatGambar(alt: string, warna: string) {
     const data = await sharp({ create: { width: 1600, height: 900, channels: 3, background: warna } }).png().toBuffer()
     return payload.create({
  @@ -46,6 +56,7 @@ const explainer = await payload.create({
       slug: SLUG.explainer,
       tipe: 'explainer',
       pilar: pilar['uang-karier'],
  +    subkategori: pajak.id,
       deck: 'Sejak 2024 pemotongan PPh 21 bulanan memakai tarif efektif rata-rata. Ini yang berubah di slip gajimu.',
       intinya: [
         { poin: 'TER adalah tarif efektif rata-rata untuk memotong PPh 21 setiap bulan.' },
  @@ -63,6 +74,7 @@ const panduan = await payload.create({
       slug: SLUG.panduan,
       tipe: 'panduan',
       pilar: pilar['uang-karier'],
  +    subkategori: pajak.id,
       deck: 'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS. Begini cara menghitungnya langkah demi langkah.',
       intinya: [
         { poin: 'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS yang ditanggung karyawan.' },
  ```

  Remah roti panduan kini memuat subkategorinya:

  ```diff
  diff --git a/tests/e2e/artikel.spec.ts b/tests/e2e/artikel.spec.ts
  index 50d2c69..add9046 100644
  --- a/tests/e2e/artikel.spec.ts
  +++ b/tests/e2e/artikel.spec.ts
  @@ -1,7 +1,7 @@
   import { expect, test } from '@playwright/test'
   
   import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  -import { JUDUL_PANDUAN, SLUG, UKURAN_LAYAR } from './data'
  +import { JUDUL_PANDUAN, SLUG, SLUG_SUB, UKURAN_LAYAR } from './data'
   
   test.beforeEach(async ({ page }) => {
     await cegatCloudinary(page)
  @@ -10,7 +10,8 @@ test.beforeEach(async ({ page }) => {
   test('artikel panduan: urutan bagian sesuai spesifikasi §4', async ({ page }) => {
     await page.goto(`/${SLUG.panduan}`)
     const remah = page.getByRole('navigation', { name: 'Remah roti' })
  -  await expect(remah.getByRole('link')).toHaveText(['Beranda', 'Uang & Karier'])
  +  await expect(remah.getByRole('link')).toHaveText(['Beranda', 'Uang & Karier', 'Pajak'])
  +  await expect(remah.getByRole('link', { name: 'Pajak' })).toHaveAttribute('href', `/uang-karier/${SLUG_SUB.pajak}`)
     await expect(remah.locator('[aria-current="page"]')).toHaveText(JUDUL_PANDUAN)
     await expect(page.getByRole('heading', { level: 1 })).toHaveText(JUDUL_PANDUAN)
     await expect(page.getByRole('article').locator('header').getByText('Panduan', { exact: true })).toBeVisible()
  ```

  `tests/e2e/rubrik.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  import { SLUG, SLUG_SUB, UKURAN_LAYAR } from './data'

  test.beforeEach(async ({ page }) => {
    await cegatCloudinary(page)
  })

  test('rubrik pilar: kepala, subkategori, intro, dan tulisan terbaru tanpa glosarium', async ({ page }) => {
    await page.goto('/uang-karier')
    await expect(page).toHaveTitle('Uang & Karier · point.')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uang & Karier')
    const sub = page.getByRole('navigation', { name: 'Subkategori Uang & Karier' }).getByRole('link')
    await expect(sub).toHaveText(['Semua', 'Pajak'])
    await expect(sub.first()).toHaveAttribute('aria-current', 'page')
    await expect(page.getByText('Mulai dari gaji bersih, lalu atur tabungan dan utang.')).toBeVisible()
    const kartu = page.getByRole('region', { name: 'Tulisan terbaru' }).getByRole('link')
    await expect(kartu).toHaveCount(3)
    expect(await kartu.evaluateAll((a) => a.map((el) => el.getAttribute('href')))).toEqual([
      `/${SLUG.danaDarurat}`,
      `/${SLUG.panduan}`,
      `/${SLUG.explainer}`,
    ])
  })

  test('rubrik subkategori di bawah pilarnya; subkategori di pilar lain menjawab 404', async ({ page, request }) => {
    await page.goto(`/uang-karier/${SLUG_SUB.pajak}`)
    await expect(page).toHaveTitle('Pajak · point.')
    await expect(page.getByRole('navigation', { name: 'Remah roti' }).getByRole('link')).toHaveText(['Beranda', 'Uang & Karier'])
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pajak')
    await expect(page.getByRole('link', { name: 'Pajak', exact: true })).toHaveAttribute('aria-current', 'page')
    await expect(page.getByRole('region', { name: 'Tulisan terbaru' }).getByRole('link')).toHaveCount(2)
    for (const path of [`/tekno/${SLUG_SUB.pajak}`, '/uang-karier/tidak-ada', `/uang-karier/${SLUG_SUB.pajak}/lagi`]) {
      expect((await request.get(path)).status(), path).toBe(404)
    }
  })

  for (const { lebar, tinggi } of UKURAN_LAYAR) {
    test(`rubrik ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: tinggi })
      for (const path of ['/uang-karier', `/uang-karier/${SLUG_SUB.pajak}`, '/tekno']) {
        await page.goto(path)
        await periksaTanpaGeserHorizontal(page)
        await periksaAxe(page)
      }
    })
  }
  ```

  Jalankan:

  ```bash
  npm run test:e2e
  ```

  Hasil yang diharapkan: `36 passed`. `/uang-karier` menampilkan navigasi "Semua, Pajak" dan tiga kartu (dana darurat, panduan, explainer; istilah glosarium tidak ikut); `/uang-karier/pajak` berremah roti Beranda, Uang & Karier; `/tekno/pajak` menjawab 404.

- [ ] **Langkah 8: Commit**

  ```bash
  git add src/modules/konten src/modules/seo/data.ts src/components/rubrik "src/app/(frontend)/[...jalur]/page.tsx" tests/unit/rubrik.test.ts tests/int/rubrik.int.spec.ts tests/int/sitemap.int.spec.ts tests/e2e
  git commit -m "feat(ui): rubrik pilar dan subkategori di rute catch-all, subkategori di sitemap pilar"
  ```

### Task 2: Halaman statis dari page builder di rute catch-all

**Files:**
- Create: `src/modules/konten/halaman.ts`, `src/components/halaman/HalamanStatis.tsx`, `src/components/halaman/Halaman.module.css`
- Modify: `src/modules/konten/tipe.ts`, `src/modules/konten/data.ts`, `src/modules/konten/cache.ts`, `src/modules/konten/index.ts`, `src/modules/konten/jalur.ts`, `src/app/(frontend)/[...jalur]/page.tsx`, `src/components/artikel/Faq.tsx`, `src/components/isi/KartuTool.tsx`, `src/components/isi/Isi.module.css`, `tests/e2e/data.ts`, `tests/e2e/siapkan.ts`
- Test: `tests/unit/halaman-statis.test.ts`, `tests/int/halaman.int.spec.ts`, `tests/e2e/halaman.spec.ts`

**Interfaces:**
- Consumes: `muatJalur`, `HasilJalur` (Task 1); `mediaTampil`, `tandaiSubjudul`, `hrefDokumen`, `POPULATE_ARTIKEL`, `TAG_ARTIKEL`, `Faq`, `IsiArtikel`, `KartuTool` (Rencana 4A).
- Produces:
  - `src/modules/konten/tipe.ts`: `KartuHalaman = { judul; teks: string | null; href: string | null }`, `BlokTampil` (union `hero` dengan `utama`, `teks`, `kartu`, `cta`, `faq`, `tool`), `DataHalaman = { judul; href; heroUtama: boolean; blok: BlokTampil[]; seo: HalamanSeo }`.
  - `src/modules/konten/halaman.ts`: `JUDUL_FAQ = 'Pertanyaan yang sering muncul'`, `susunHalaman(doc: Halaman): DataHalaman`.
  - `ambilHalaman(payload, slug)`, `muatHalaman(slug)` (tag `TAG_ARTIKEL`); `HasilJalur` mendapat `{ jenis: 'halaman'; halaman: DataHalaman }`.
  - `Faq({ faq, judul?, id? })` (bawaan tetap "Pertanyaan yang sering muncul" dan `id="faq"`); `TautanTool({ nama, ringkasan, href })` di `src/components/isi/KartuTool.tsx`, dipakai `KartuTool`.
  - Komponen `HalamanStatis({ halaman, situs })`.
  - `.prosa > :first-child { margin-top: 0 }` di `Isi.module.css`.
  - E2E: `SLUG_HALAMAN = { tentang, kebijakanRedaksi, draf: 'pasang-iklan' }`; Tentang dan Kebijakan Redaksi dari seed diterbitkan dengan blok.

Halaman statis (Tentang, Kebijakan Redaksi, Pedoman Media Siber, dan seterusnya, spesifikasi §3 dan §7) adalah koleksi `halaman` dengan page builder Rencana 1: blok hero, teks, kartu, CTA, FAQ, dan embed tool. `muatJalur` mencoba halaman setelah artikel dan pilar. `susunHalaman` memastikan halaman punya tepat satu H1: bila blok pertama hero, judul hero menjadi H1 (`heroUtama`); bila tidak, judul halaman ditulis sebagai H1 di atas blok. Hero berikutnya menjadi H2. Blok teks ditandai `tandaiSubjudul` (jangkar subjudul, H1 di isi turun ke H2), blok FAQ kosong dan tool yang belum terbit tidak dirender, tautan kartu dan CTA boleh path situs atau URL luar (`Tautan`).

Tata letak satu kolom baca selebar 880 px, dan jarak antarblok hanya dari `gap` 40 px. Isi Lexical yang dibuka subjudul tidak boleh menambah jarak: `.prosa h2` punya `margin-top` 48 px untuk subjudul di tengah isi, jadi anak pertama `.prosa` diberi `margin-top: 0` (artikel yang isinya dibuka H2 ikut rapi). Tes E2E mengukur jarak hero ke subjudul pertama (40 px di 375 dan 1440 px), pelajaran dari temuan jarak kosong di Rencana 4A.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/halaman-statis.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it, vi } from 'vitest'

  import { HalamanStatis } from '@/components/halaman/HalamanStatis'
  import { susunHalaman } from '@/modules/konten/halaman'
  import type { Halaman } from '@/payload-types'

  import { gambarUtama, isiLexical, h as judul, p, situs } from './seo-contoh'

  vi.mock('next/image', () => ({
    default: (props: Record<string, unknown>) => h('img', { src: props.src, alt: props.alt, width: props.width, height: props.height }),
  }))

  const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
  const tool = { id: 4, nama: 'Gaji Bersih', slug: 'gaji-bersih', ringkasan: 'Hitung gaji bersih setelah PPh 21 dan BPJS.', toolId: 'gaji-bersih' as const, pilar: 1, ...waktu }

  const tentang: Halaman = {
    id: 1,
    judul: 'Tentang',
    slug: 'tentang',
    _status: 'published',
    ...waktu,
    tataLetak: [
      { blockType: 'hero', id: 'h1', judul: 'Intinya dulu, lalu hitung sendiri', subjudul: 'point. menjelaskan uang dan karier.', gambar: { ...gambarUtama, ...waktu } },
      { blockType: 'teks', id: 't1', isi: isiLexical([judul('h1', 'Siapa kami'), p('Redaksi kecil.')]) as never },
      {
        blockType: 'kartu',
        id: 'k1',
        judul: 'Prinsip kami',
        kartu: [
          { judul: 'Lugas', teks: 'Jawaban di kalimat pertama.', tautan: '/kebijakan-redaksi' },
          { judul: 'Cermat', teks: null, tautan: ' ' },
        ],
      },
      { blockType: 'cta', id: 'c1', judul: 'Punya koreksi?', teks: 'Kabari redaksi.', labelTombol: 'Kirim koreksi', tautan: ' /kontak ' },
      { blockType: 'faqBlok', id: 'f1', judul: null, faq: [{ pertanyaan: 'Apakah gratis?', jawaban: 'Ya.' }] },
      { blockType: 'faqBlok', id: 'f2', judul: 'Kosong', faq: [] },
      { blockType: 'embedTool', id: 'e1', tool: { ...tool, _status: 'published' } },
      { blockType: 'embedTool', id: 'e2', tool: { ...tool, _status: 'draft' } },
      { blockType: 'hero', id: 'h2', judul: 'Bergabung', subjudul: null, gambar: null },
    ],
  }

  describe('susunHalaman', () => {
    it('hero pertama memegang H1, hero berikutnya H2; FAQ kosong dan tool draf dilewati', () => {
      const halaman = susunHalaman(tentang)
      expect(halaman.heroUtama).toBe(true)
      expect(halaman.href).toBe('/tentang')
      expect(halaman.blok.map((b) => b.jenis)).toEqual(['hero', 'teks', 'kartu', 'cta', 'faq', 'tool', 'hero'])
      expect(halaman.blok.filter((b) => b.jenis === 'hero').map((b) => b.utama)).toEqual([true, false])
      expect(halaman.blok[2]).toMatchObject({ kartu: [{ href: '/kebijakan-redaksi' }, { teks: null, href: null }] })
      expect(halaman.blok[3]).toMatchObject({ label: 'Kirim koreksi', href: '/kontak' })
      expect(halaman.blok[4]).toMatchObject({ judul: 'Pertanyaan yang sering muncul' })
      expect(halaman.blok[5]).toEqual({ jenis: 'tool', id: 'e1', nama: 'Gaji Bersih', ringkasan: tool.ringkasan, href: '/tools/gaji-bersih' })
    })

    it('tanpa hero di atas: judul halaman menjadi H1', () => {
      const halaman = susunHalaman({ ...tentang, tataLetak: tentang.tataLetak?.slice(1, 2) })
      expect(halaman.heroUtama).toBe(false)
      expect(susunHalaman({ ...tentang, tataLetak: null }).blok).toEqual([])
    })
  })

  describe('HalamanStatis', () => {
    it('satu H1 dari hero, remah roti, kartu bertautan, CTA, FAQ, dan tool', () => {
      const html = renderToStaticMarkup(h(HalamanStatis, { halaman: susunHalaman(tentang), situs }))
      expect(html.match(/<h1/g)).toHaveLength(1)
      expect(html).toMatch(/<h1 class="[^"]*">Intinya dulu, lalu hitung sendiri<\/h1>/)
      expect(html).toMatch(/<span aria-current="page" class="[^"]*">Tentang<\/span>/)
      expect(html).toContain('alt="Slip gaji karyawan"')
      expect(html).toContain('<h2 id="siapa-kami">Siapa kami</h2>')
      expect(html).toContain('<h3 class="')
      expect(html).toContain('<a href="/kebijakan-redaksi">Lugas</a>')
      expect(html).toMatch(/<a class="[^"]*" href="\/kontak">Kirim koreksi/)
      expect(html).toContain('<h2 id="f1-faq"')
      expect(html).toContain('Hitung Gaji Bersih')
      expect(html).toMatch(/<h2 class="[^"]*">Bergabung<\/h2>/)
    })

    it('tanpa hero: judul halaman sebagai H1', () => {
      const html = renderToStaticMarkup(h(HalamanStatis, { halaman: susunHalaman({ ...tentang, tataLetak: [] }), situs }))
      expect(html).toMatch(/<h1 class="[^"]*">Tentang<\/h1>/)
    })
  })
  ```

  `tests/int/halaman.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { paragrafLexical } from '@/lib/lexical'
  import { ambilHalaman } from '@/modules/konten/data'

  import { siapkanRelasiArtikel } from './fixtures'
  import { getTestPayload, unik } from './helpers'

  describe('ambilHalaman', () => {
    it('hanya halaman terbit; blok tool dimuat lengkap untuk tautan', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      // `toolId` unik: sisa tes sebelumnya dibersihkan dulu, dan tool dihapus di akhir tes.
      await payload.delete({ collection: 'tools', where: { toolId: { equals: 'thr' } } })
      const tool = await payload.create({
        collection: 'tools',
        data: { _status: 'published', nama: unik('THR'), toolId: 'thr', pilar: relasi.pilar.id, ringkasan: 'Hitung THR.' },
      })
      const terbit = await payload.create({
        collection: 'halaman',
        data: {
          _status: 'published',
          judul: unik('Tentang'),
          tataLetak: [
            { blockType: 'teks', isi: paragrafLexical(['Redaksi kecil yang menulis dari intinya.']) },
            { blockType: 'embedTool', tool: tool.id },
          ],
        },
      })
      const draf = await payload.create({ collection: 'halaman', draft: true, data: { _status: 'draft', judul: unik('Kontak') } })

      const halaman = await ambilHalaman(payload, terbit.slug as string)
      expect(halaman).toMatchObject({ judul: terbit.judul, heroUtama: false })
      expect(halaman?.blok[1]).toMatchObject({ jenis: 'tool', nama: tool.nama, href: `/tools/${tool.slug}` })
      expect(await ambilHalaman(payload, draf.slug as string)).toBeNull()
      await payload.delete({ collection: 'tools', id: tool.id })
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/halaman-statis.test.ts` dengan `Cannot find package '@/components/halaman/HalamanStatis'`.

- [ ] **Langkah 3: Data halaman statis**

  ```diff
  diff --git a/src/modules/konten/tipe.ts b/src/modules/konten/tipe.ts
  index 640b905..12b46a8 100644
  --- a/src/modules/konten/tipe.ts
  +++ b/src/modules/konten/tipe.ts
  @@ -1,6 +1,6 @@
   import type { TipeArtikel, WarnaPilar } from '@/lib/konstanta'
   import type { IsiDokumen } from '@/modules/seo/lexical'
  -import type { ArtikelSeo, PilarSeo, SubkategoriSeo } from '@/modules/seo/tipe'
  +import type { ArtikelSeo, HalamanSeo, PilarSeo, SubkategoriSeo } from '@/modules/seo/tipe'
   
   /**
    * Data tampilan yang sudah siap dirender komponen publik. Komponen tidak membaca dokumen Payload
  @@ -92,3 +92,17 @@ export type DataRubrik = {
     artikel: KartuArtikel[]
     seo: { jenis: 'pilar'; doc: PilarSeo } | { jenis: 'subkategori'; doc: SubkategoriSeo }
   }
  +
  +export type KartuHalaman = { judul: string; teks: string | null; href: string | null }
  +
  +/** Blok page builder halaman statis yang siap dirender. `utama`: hero yang memegang H1 halaman. */
  +export type BlokTampil =
  +  | { jenis: 'hero'; id: string; judul: string; subjudul: string | null; gambar: MediaTampil | null; utama: boolean }
  +  | { jenis: 'teks'; id: string; isi: IsiDokumen }
  +  | { jenis: 'kartu'; id: string; judul: string | null; kartu: KartuHalaman[] }
  +  | { jenis: 'cta'; id: string; judul: string; teks: string | null; label: string; href: string }
  +  | { jenis: 'faq'; id: string; judul: string; faq: Faq[] }
  +  | { jenis: 'tool'; id: string; nama: string; ringkasan: string; href: string }
  +
  +/** Halaman statis dari koleksi `halaman`. `heroUtama`: blok pertama hero, jadi judul tidak ditulis ulang. */
  +export type DataHalaman = { judul: string; href: string; heroUtama: boolean; blok: BlokTampil[]; seo: HalamanSeo }
  ```

  `src/modules/konten/halaman.ts`

  ```ts
  import type { Halaman } from '@/payload-types'
  import { pathFor } from '@/lib/paths'
  import type { IsiDokumen } from '@/modules/seo/lexical'
  import type { HalamanSeo } from '@/modules/seo/tipe'

  import { mediaTampil, tandaiSubjudul } from './artikel'
  import { hrefDokumen } from './isi'
  import type { BlokTampil, DataHalaman } from './tipe'

  /** Judul blok FAQ bila editor tidak mengisinya (sama dengan FAQ artikel). */
  export const JUDUL_FAQ = 'Pertanyaan yang sering muncul'

  type Blok = NonNullable<Halaman['tataLetak']>[number]

  const teks = (nilai: string | null | undefined) => nilai?.trim() || null

  function susunBlok(blok: Blok, i: number, utama: boolean): BlokTampil | null {
    const id = blok.id ?? `blok-${i}`
    switch (blok.blockType) {
      case 'hero':
        return { jenis: 'hero', id, judul: blok.judul, subjudul: teks(blok.subjudul), gambar: mediaTampil(blok.gambar), utama }
      case 'teks':
        return { jenis: 'teks', id, isi: tandaiSubjudul(blok.isi as IsiDokumen).isi }
      case 'kartu':
        return {
          jenis: 'kartu',
          id,
          judul: teks(blok.judul),
          kartu: blok.kartu.map((k) => ({ judul: k.judul, teks: teks(k.teks), href: teks(k.tautan) })),
        }
      case 'cta':
        return { jenis: 'cta', id, judul: blok.judul, teks: teks(blok.teks), label: blok.labelTombol, href: blok.tautan.trim() }
      case 'faqBlok': {
        const faq = (blok.faq ?? []).map(({ pertanyaan, jawaban }) => ({ pertanyaan, jawaban }))
        return faq.length ? { jenis: 'faq', id, judul: teks(blok.judul) ?? JUDUL_FAQ, faq } : null
      }
      case 'embedTool': {
        const href = hrefDokumen('tools', blok.tool)
        if (!href || typeof blok.tool !== 'object') return null
        return { jenis: 'tool', id, nama: blok.tool.nama, ringkasan: blok.tool.ringkasan, href }
      }
    }
  }

  /**
   * Halaman statis (page builder) terbit menjadi data render. Hero pertama yang menjadi blok paling
   * atas memegang H1 halaman (`heroUtama`); bila tidak ada, halaman menampilkan judulnya sebagai H1.
   * Hero lain menjadi H2, supaya halaman selalu punya tepat satu H1. FAQ kosong dan tool yang belum
   * terbit tidak dirender.
   */
  export function susunHalaman(doc: Halaman): DataHalaman {
    const tataLetak = doc.tataLetak ?? []
    const heroUtama = tataLetak[0]?.blockType === 'hero'
    return {
      judul: doc.judul,
      href: pathFor({ jenis: 'halaman', slug: doc.slug ?? '' }),
      heroUtama,
      blok: tataLetak.map((b, i) => susunBlok(b, i, heroUtama && i === 0)).filter((b): b is BlokTampil => b !== null),
      seo: doc as HalamanSeo,
    }
  }
  ```

  ```diff
  diff --git a/src/modules/konten/data.ts b/src/modules/konten/data.ts
  index 27e40ff..4903448 100644
  --- a/src/modules/konten/data.ts
  +++ b/src/modules/konten/data.ts
  @@ -5,11 +5,12 @@ import { validasiFormatSlug } from '@/lib/slug'
   
   import { gabungTerkait, kartuArtikel, MAKS_TERKAIT, susunArtikel } from './artikel'
   import { kelompokkanIstilah } from './glosarium'
  +import { susunHalaman } from './halaman'
   import { MAKS_PATH } from './log404'
   import type { RedirectTersimpan } from './redirect'
   import { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
   import { susunFooter, susunHeader } from './tampilan'
  -import type { DataArtikel, DataFooter, DataHeader, DataRubrik, KartuArtikel, KelompokIstilah } from './tipe'
  +import type { DataArtikel, DataFooter, DataHalaman, DataHeader, DataRubrik, KartuArtikel, KelompokIstilah } from './tipe'
   
   /**
    * Query Payload untuk halaman publik. Fungsi di sini menerima `payload` supaya bisa diuji integrasi;
  @@ -181,3 +182,17 @@ export async function ambilRubrik(payload: Payload, pilarSlug: string, subSlug:
     const syarat: Where[] = [{ pilar: { equals: pilar.id } }, ...(sub ? [{ subkategori: { equals: sub.id } }] : [])]
     return susunRubrik(pilar, sub, daftarSub, await kartuTerbit(payload, syarat, MAKS_ARTIKEL_RUBRIK))
   }
  +
  +/** Halaman statis terbit dengan slug ini. Blok dimuat seperti isi artikel (depth 2) untuk tautan, gambar, dan tool. */
  +export async function ambilHalaman(payload: Payload, slug: string): Promise<DataHalaman | null> {
  +  if (validasiFormatSlug(slug) !== true) return null
  +  const { docs } = await payload.find({
  +    collection: 'halaman',
  +    where: { and: [{ slug: { equals: slug } }, terbit] },
  +    depth: 2,
  +    limit: 1,
  +    pagination: false,
  +    populate: POPULATE_ARTIKEL,
  +  })
  +  return docs[0] ? susunHalaman(docs[0]) : null
  +}
  ```

  ```diff
  diff --git a/src/modules/konten/cache.ts b/src/modules/konten/cache.ts
  index ecfdc16..4c3d1b8 100644
  --- a/src/modules/konten/cache.ts
  +++ b/src/modules/konten/cache.ts
  @@ -5,7 +5,7 @@ import { getPayload } from 'payload'
   import { TAG } from '@/lib/tag'
   import { ambilSitus } from '@/modules/seo/situs'
   
  -import { ambilArtikel, ambilFooter, ambilGlosarium, ambilHeader, ambilRubrik, ambilTerbaru, cariRedirect } from './data'
  +import { ambilArtikel, ambilFooter, ambilGlosarium, ambilHalaman, ambilHeader, ambilRubrik, ambilTerbaru, cariRedirect } from './data'
   
   /**
    * Data halaman publik yang di-cache dengan tag (spesifikasi §5 "Rendering"). Halaman dirender statis
  @@ -85,3 +85,9 @@ export const muatRubrik = unstable_cache(
     ['konten', 'rubrik'],
     { tags: TAG_ARTIKEL, revalidate: SEJAM },
   )
  +
  +/** Halaman statis: blok teks, CTA, dan tool bisa menautkan dokumen apa pun, jadi tagnya sama dengan artikel. */
  +export const muatHalaman = unstable_cache(async (slug: string) => ambilHalaman(await payload(), slug), ['konten', 'halaman'], {
  +  tags: TAG_ARTIKEL,
  +  revalidate: SEJAM,
  +})
  ```

  ```diff
  diff --git a/src/modules/konten/jalur.ts b/src/modules/konten/jalur.ts
  index 78ba09c..459ce54 100644
  --- a/src/modules/konten/jalur.ts
  +++ b/src/modules/konten/jalur.ts
  @@ -1,20 +1,26 @@
  -import { muatArtikel, muatRubrik } from './cache'
  -import type { DataArtikel, DataRubrik } from './tipe'
  +import { muatArtikel, muatHalaman, muatRubrik } from './cache'
  +import type { DataArtikel, DataHalaman, DataRubrik } from './tipe'
   
   /** Dokumen di balik path rute catch-all `[...jalur]`. */
  -export type HasilJalur = { jenis: 'artikel'; artikel: DataArtikel } | { jenis: 'rubrik'; rubrik: DataRubrik }
  +export type HasilJalur =
  +  | { jenis: 'artikel'; artikel: DataArtikel }
  +  | { jenis: 'rubrik'; rubrik: DataRubrik }
  +  | { jenis: 'halaman'; halaman: DataHalaman }
   
   /**
  - * Mencari dokumen untuk path tingkat atas. Satu segmen: artikel (bukan glosarium), lalu pilar. Dua
  - * segmen: subkategori di bawah pilarnya. Slug artikel dan pilar unik lintas koleksi (validasi CMS),
  - * jadi urutan hanya menentukan query mana yang dijalankan dulu. `null` berarti redirect atau 404.
  + * Mencari dokumen untuk path tingkat atas. Satu segmen: artikel (bukan glosarium), pilar, lalu
  + * halaman statis. Dua segmen: subkategori di bawah pilarnya. Slug artikel, pilar, dan halaman unik
  + * lintas koleksi (validasi CMS), jadi urutan hanya menentukan query mana yang dijalankan dulu: yang
  + * paling sering diminta lebih dulu. `null` berarti redirect atau 404.
    */
   export async function muatJalur(jalur: string[]): Promise<HasilJalur | null> {
     if (jalur.length === 1) {
       const artikel = await muatArtikel(jalur[0], false)
       if (artikel) return { jenis: 'artikel', artikel }
       const rubrik = await muatRubrik(jalur[0], null)
  -    return rubrik ? { jenis: 'rubrik', rubrik } : null
  +    if (rubrik) return { jenis: 'rubrik', rubrik }
  +    const halaman = await muatHalaman(jalur[0])
  +    return halaman ? { jenis: 'halaman', halaman } : null
     }
     if (jalur.length === 2) {
       const rubrik = await muatRubrik(jalur[0], jalur[1])
  ```

  ```diff
  diff --git a/src/modules/konten/index.ts b/src/modules/konten/index.ts
  index 41b3fe0..77920a6 100644
  --- a/src/modules/konten/index.ts
  +++ b/src/modules/konten/index.ts
  @@ -3,13 +3,25 @@
    *
    * - `muat*()` dipanggil halaman dan layout: query Payload yang di-cache dengan tag `TAG`.
    * - `ambil*(payload)` versi tanpa cache untuk tes integrasi dan skrip.
  - * - `muatJalur(jalur)` untuk rute catch-all: artikel, rubrik pilar dan subkategori.
  + * - `muatJalur(jalur)` untuk rute catch-all: artikel, rubrik pilar dan subkategori, halaman statis.
    * - `tanganiTidakAda(path)` untuk path tanpa dokumen: redirect 301 dari CMS atau 404.
    * - Fungsi murni (`susunHeader`, `susunArtikel`, `tanggalIndonesia`, ...) menerjemahkan dokumen
    *   Payload ke tipe di `tipe.ts`, supaya komponen tidak membaca relasi Payload mentah.
    */
  -export { muatArtikel, muatFooter, muatGlosarium, muatHeader, muatRedirect, muatRubrik, muatSitus, muatTerbaru, TAG_ARTIKEL } from './cache'
  -export { ambilArtikel, ambilFooter, ambilGlosarium, ambilHeader, ambilRubrik, ambilTerbaru, cariRedirect } from './data'
  +export {
  +  muatArtikel,
  +  muatFooter,
  +  muatGlosarium,
  +  muatHalaman,
  +  muatHeader,
  +  muatRedirect,
  +  muatRubrik,
  +  muatSitus,
  +  muatTerbaru,
  +  TAG_ARTIKEL,
  +} from './cache'
  +export { ambilArtikel, ambilFooter, ambilGlosarium, ambilHalaman, ambilHeader, ambilRubrik, ambilTerbaru, cariRedirect } from './data'
  +export { JUDUL_FAQ, susunHalaman } from './halaman'
   export { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
   export { muatJalur, type HasilJalur } from './jalur'
   export { tanganiTidakAda } from './navigasi'
  ```

- [ ] **Langkah 4: Komponen dan rute**

  `Faq` menerima judul dan `id` sendiri, dan bagian tampilan `KartuTool` dipisah menjadi `TautanTool` supaya blok tool halaman statis memakai kartu yang sama:

  ```diff
  diff --git a/src/components/artikel/Faq.tsx b/src/components/artikel/Faq.tsx
  index 20a63fe..e9e2b00 100644
  --- a/src/components/artikel/Faq.tsx
  +++ b/src/components/artikel/Faq.tsx
  @@ -1,15 +1,19 @@
  +import { JUDUL_FAQ } from '@/modules/konten/halaman'
   import { paragrafTeks } from '@/modules/konten/isi'
   import type { Faq as DataFaq } from '@/modules/konten/tipe'
   
   import gaya from './Artikel.module.css'
   
  -/** FAQ sebagai isi biasa (rich result FAQ sudah dihapus Google), bisa dibuka tanpa JavaScript. */
  -export function Faq({ faq }: { faq: DataFaq[] }) {
  +/**
  + * FAQ sebagai isi biasa (rich result FAQ sudah dihapus Google), bisa dibuka tanpa JavaScript. Blok FAQ
  + * halaman statis memberi judul dan `id` sendiri supaya beberapa blok di satu halaman tidak bentrok.
  + */
  +export function Faq({ faq, judul = JUDUL_FAQ, id = 'faq' }: { faq: DataFaq[]; judul?: string; id?: string }) {
     if (faq.length === 0) return null
     return (
  -    <section aria-labelledby="faq" className={gaya.bagian}>
  -      <h2 id="faq" className={gaya.subjudul}>
  -        Pertanyaan yang sering muncul
  +    <section aria-labelledby={id} className={gaya.bagian}>
  +      <h2 id={id} className={gaya.subjudul}>
  +        {judul}
         </h2>
         <div className={gaya.faq}>
           {faq.map((f, i) => (
  ```

  ```diff
  diff --git a/src/components/isi/KartuTool.tsx b/src/components/isi/KartuTool.tsx
  index e2b0dc1..3a4323e 100644
  --- a/src/components/isi/KartuTool.tsx
  +++ b/src/components/isi/KartuTool.tsx
  @@ -5,21 +5,26 @@ import type { Tool } from '@/payload-types'
   
   import gaya from './Isi.module.css'
   
  -/** Blok "embed tool": ajakan ke kalkulator. Kalkulator sendiri ada di halaman tools (Rencana 5). */
  -export function KartuTool({ tool }: { tool: number | Pick<Tool, 'nama' | 'slug' | 'ringkasan' | '_status'> }) {
  -  const href = hrefDokumen('tools', tool)
  -  if (!href || typeof tool !== 'object') return null
  +/** Ajakan ke kalkulator: nama, ringkasan, dan "Hitung {nama}". Dipakai blok tool di isi dan di halaman statis. */
  +export function TautanTool({ nama, ringkasan, href }: { nama: string; ringkasan: string; href: string }) {
     return (
       <Tautan href={href} className={gaya.kartuTool}>
         <Ikon nama="calculator" ukuran={28} />
         <span>
  -        <strong>{tool.nama}</strong>
  -        {tool.ringkasan}
  +        <strong>{nama}</strong>
  +        {ringkasan}
         </span>
         <span className={gaya.ajakan}>
  -        Hitung {tool.nama}
  +        Hitung {nama}
           <Ikon nama="arrow-right" />
         </span>
       </Tautan>
     )
   }
  +
  +/** Blok "embed tool": ajakan ke kalkulator. Kalkulator sendiri ada di halaman tools (Rencana 5). */
  +export function KartuTool({ tool }: { tool: number | Pick<Tool, 'nama' | 'slug' | 'ringkasan' | '_status'> }) {
  +  const href = hrefDokumen('tools', tool)
  +  if (!href || typeof tool !== 'object') return null
  +  return <TautanTool nama={tool.nama} ringkasan={tool.ringkasan} href={href} />
  +}
  ```

  ```diff
  diff --git a/src/components/isi/Isi.module.css b/src/components/isi/Isi.module.css
  index 0ba5904..363be5f 100644
  --- a/src/components/isi/Isi.module.css
  +++ b/src/components/isi/Isi.module.css
  @@ -33,6 +33,12 @@
     margin-top: var(--ruang-3);
   }
   
  +/* Isi yang dibuka subjudul (blok teks halaman statis, intro rubrik) tidak mendapat jarak ekstra di
  +   atasnya: jarak ke blok sebelumnya sudah diatur tata letak halaman. */
  +.prosa > :first-child {
  +  margin-top: 0;
  +}
  +
   .prosa a {
     text-decoration: underline;
     text-decoration-thickness: var(--garis-tipis);
  ```

  `src/components/halaman/Halaman.module.css`

  ```css
  /* Halaman statis dari page builder: blok berurutan dalam satu kolom baca selebar 880px. Jarak
     antarblok hanya dari `gap`, jadi tidak bergantung jenis atau jumlah blok. */
  .halaman {
    display: grid;
    gap: var(--ruang-10);
    padding-top: var(--ruang-4);
  }

  .halaman > * {
    min-width: 0;
    max-width: 880px;
  }

  .hero {
    display: grid;
    gap: var(--ruang-4);
  }

  .judul {
    font-size: var(--teks-h1);
    font-stretch: var(--lebar-h1);
    line-height: var(--tinggi-h1);
    letter-spacing: -0.02em;
  }

  .subjudul {
    font-size: var(--teks-h2);
    font-stretch: var(--lebar-h2);
  }

  .deck {
    max-width: 60ch;
    font-size: var(--teks-deck);
    line-height: 1.45;
  }

  .gambar {
    width: 100%;
    height: auto;
    margin-top: var(--ruang-4);
    border-radius: var(--radius-kartu);
  }

  .bagian {
    display: grid;
    gap: var(--ruang-6);
  }

  .kartu {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
    gap: var(--ruang-4);
    padding: 0;
    list-style: none;
  }

  .kartu li {
    display: grid;
    align-content: start;
    gap: var(--ruang-3);
    padding: var(--ruang-6);
    border-radius: var(--radius-kartu);
    background: var(--permukaan);
  }

  .kartuJudul {
    font-size: var(--teks-h3);
    font-stretch: var(--lebar-h3);
    font-weight: 800;
  }

  .kartuJudul a {
    text-decoration-thickness: var(--garis-tebal);
  }

  .cta {
    display: grid;
    justify-items: start;
    gap: var(--ruang-4);
    padding: var(--ruang-8) var(--ruang-6);
    border: var(--garis-tebal) solid var(--garis);
    border-radius: var(--radius-kartu);
  }

  .cta p {
    max-width: 60ch;
  }

  .tombol {
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

  .tombol:hover {
    text-decoration: underline;
  }

  .tombol:active {
    transform: scale(0.98);
  }
  ```

  `src/components/halaman/HalamanStatis.tsx`

  ```tsx
  import Image from 'next/image'

  import { Ikon } from '@/components/dasar/Ikon'
  import { JsonLd } from '@/components/dasar/JsonLd'
  import { RemahRoti } from '@/components/dasar/RemahRoti'
  import { Tautan } from '@/components/dasar/Tautan'
  import { Faq } from '@/components/artikel/Faq'
  import { UKURAN_KOLOM_ISI } from '@/components/isi/GambarIsi'
  import { IsiArtikel } from '@/components/isi/IsiArtikel'
  import { TautanTool } from '@/components/isi/KartuTool'
  import type { BlokTampil, DataHalaman } from '@/modules/konten/tipe'
  import { propsGambar } from '@/modules/media/props'
  import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
  import type { Situs } from '@/modules/seo/tipe'

  import gaya from './Halaman.module.css'

  function Hero({ blok, cloudName }: { blok: Extract<BlokTampil, { jenis: 'hero' }>; cloudName: string }) {
    const Judul = blok.utama ? 'h1' : 'h2'
    const gambar = propsGambar(blok.gambar, 'hero', { cloudName, lebar: 1440 })
    return (
      <div className={gaya.hero}>
        <Judul className={blok.utama ? gaya.judul : gaya.subjudul}>{blok.judul}</Judul>
        {blok.subjudul && <p className={gaya.deck}>{blok.subjudul}</p>}
        {gambar && (
          <Image
            {...gambar}
            alt={gambar.alt}
            sizes={UKURAN_KOLOM_ISI}
            className={gaya.gambar}
            {...(blok.utama ? { fetchPriority: 'high' as const, loading: 'eager' as const } : {})}
          />
        )}
      </div>
    )
  }

  function Blok({ blok, cloudName }: { blok: BlokTampil; cloudName: string }) {
    switch (blok.jenis) {
      case 'hero':
        return <Hero blok={blok} cloudName={cloudName} />
      case 'teks':
        return <IsiArtikel isi={blok.isi} cloudName={cloudName} />
      case 'kartu': {
        const daftar = (
          <ul className={gaya.kartu}>
            {blok.kartu.map((k, i) => (
              <li key={i}>
                <h3 className={gaya.kartuJudul}>{k.href ? <Tautan href={k.href}>{k.judul}</Tautan> : k.judul}</h3>
                {k.teks && <p>{k.teks}</p>}
              </li>
            ))}
          </ul>
        )
        if (!blok.judul) return daftar
        return (
          <section aria-labelledby={`${blok.id}-judul`} className={gaya.bagian}>
            <h2 id={`${blok.id}-judul`} className={gaya.subjudul}>
              {blok.judul}
            </h2>
            {daftar}
          </section>
        )
      }
      case 'cta':
        return (
          <section aria-labelledby={`${blok.id}-judul`} className={gaya.cta}>
            <h2 id={`${blok.id}-judul`} className={gaya.subjudul}>
              {blok.judul}
            </h2>
            {blok.teks && <p>{blok.teks}</p>}
            <Tautan href={blok.href} className={gaya.tombol}>
              {blok.label}
              <Ikon nama="arrow-right" />
            </Tautan>
          </section>
        )
      case 'faq':
        return <Faq faq={blok.faq} judul={blok.judul} id={`${blok.id}-faq`} />
      case 'tool':
        return <TautanTool nama={blok.nama} ringkasan={blok.ringkasan} href={blok.href} />
    }
  }

  /**
   * Halaman statis dari koleksi `halaman` (Tentang, Kebijakan Redaksi, Pedoman Media Siber, dan
   * seterusnya): blok page builder dirender berurutan. Bila blok pertama bukan hero, judul halaman
   * menjadi H1 di atas blok.
   */
  export function HalamanStatis({ halaman, situs }: { halaman: DataHalaman; situs: Situs }) {
    const masukan = { jenis: 'halaman', doc: halaman.seo } as const
    return (
      <article className={`kontainer ${gaya.halaman}`}>
        <JsonLd data={jsonLd(masukan, situs)} />
        <RemahRoti remah={remahRoti(masukan)} />
        {!halaman.heroUtama && <h1 className={gaya.judul}>{halaman.judul}</h1>}
        {halaman.blok.map((b) => (
          <Blok key={b.id} blok={b} cloudName={situs.cloudName} />
        ))}
      </article>
    )
  }
  ```

  ```diff
  diff --git a/src/app/(frontend)/[...jalur]/page.tsx b/src/app/(frontend)/[...jalur]/page.tsx
  index ab70e2c..4cb2ccf 100644
  --- a/src/app/(frontend)/[...jalur]/page.tsx
  +++ b/src/app/(frontend)/[...jalur]/page.tsx
  @@ -2,6 +2,7 @@ import type { Metadata } from 'next'
   import { cache } from 'react'
   
   import { HalamanArtikel } from '@/components/artikel/HalamanArtikel'
  +import { HalamanStatis } from '@/components/halaman/HalamanStatis'
   import { HalamanRubrik } from '@/components/rubrik/HalamanRubrik'
   import { muatJalur, muatSitus, pathDariSegmen, tanganiTidakAda } from '@/modules/konten'
   import { metadata, metadataTidakDitemukan } from '@/modules/seo'
  @@ -10,7 +11,7 @@ type Props = { params: Promise<{ jalur: string[] }> }
   
   /**
    * Semua path publik yang tidak ditangani rute yang lebih spesifik: artikel `/{slug}`, rubrik
  - * `/{pilar}` dan `/{pilar}/{subkategori}`. Halaman dirender saat pertama diminta lalu disimpan
  + * `/{pilar}` dan `/{pilar}/{subkategori}`, halaman statis `/{slug}`. Halaman dirender saat pertama diminta lalu disimpan
    * (ISR); tag cache data membuangnya saat konten berubah. Path tanpa dokumen diteruskan ke
    * `tanganiTidakAda` (redirect dari CMS atau 404), hasilnya juga disimpan.
    */
  @@ -33,6 +34,8 @@ export async function generateMetadata({ params }: Props): Promise<Metadata> {
         return metadata({ jenis: 'artikel', doc: hasil.artikel.seo }, situs)
       case 'rubrik':
         return metadata(hasil.rubrik.seo, situs)
  +    case 'halaman':
  +      return metadata({ jenis: 'halaman', doc: hasil.halaman.seo }, situs)
       default:
         return metadataTidakDitemukan(situs)
     }
  @@ -46,6 +49,8 @@ export default async function Halaman({ params }: Props) {
         return <HalamanArtikel artikel={hasil.artikel} situs={await muatSitus()} />
       case 'rubrik':
         return <HalamanRubrik rubrik={hasil.rubrik} situs={await muatSitus()} />
  +    case 'halaman':
  +      return <HalamanStatis halaman={hasil.halaman} situs={await muatSitus()} />
       default:
         return tanganiTidakAda(pathDariSegmen(jalur))
     }
  ```

- [ ] **Langkah 5: Jalankan tes unit dan integrasi**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 37 passed (37)`, `Tests 257 passed (257)`; integrasi `Test Files 19 passed (19)`, `Tests 63 passed (63)`.

- [ ] **Langkah 6: Halaman contoh dan tes E2E**

  ```diff
  diff --git a/tests/e2e/data.ts b/tests/e2e/data.ts
  index 902687a..a0af0ed 100644
  --- a/tests/e2e/data.ts
  +++ b/tests/e2e/data.ts
  @@ -20,6 +20,9 @@ export const SLUG = {
   /** Subkategori contoh di bawah pilar Uang & Karier. */
   export const SLUG_SUB = { pajak: 'pajak' } as const
   
  +/** Halaman statis dari seed yang diterbitkan `siapkan.ts`; halaman seed lain tetap draf. */
  +export const SLUG_HALAMAN = { tentang: 'tentang', kebijakanRedaksi: 'kebijakan-redaksi', draf: 'pasang-iklan' } as const
  +
   export const JUDUL_PANDUAN = 'Cara hitung gaji bersih setelah PPh 21 dan BPJS'
   
   // Pembuat JSON Lexical minimal (bentuk yang disimpan Payload 3.92).
  ```

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index 6dae137..bfb0519 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -3,10 +3,11 @@ import { getPayload } from 'payload'
   import sharp from 'sharp'
   
   import { pakaiKlien } from '@/modules/media'
  +import type { Halaman } from '@/payload-types'
   import { klienPalsu } from '@/modules/media/palsu'
   import { seed } from '@/seed/seed'
   
  -import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, p, SLUG, SLUG_SUB, tautanKe } from './data'
  +import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, p, SLUG, SLUG_HALAMAN, SLUG_SUB, tautanKe } from './data'
   
   /**
    * Mengisi database E2E sebelum server dibangun dan dinyalakan (`webServer` di playwright.config.ts).
  @@ -167,6 +168,35 @@ const danaDarurat = await payload.create({
   })
   await payload.update({ collection: 'artikel', id: danaDarurat.id, data: { _status: 'published', slug: SLUG.danaDarurat } })
   
  +// Halaman statis dari seed (draf) diterbitkan dengan blok page builder.
  +async function terbitkanHalaman(slug: string, tataLetak: NonNullable<Halaman['tataLetak']>) {
  +  const { docs } = await payload.find({ collection: 'halaman', where: { slug: { equals: slug } }, draft: true, limit: 1 })
  +  await payload.update({ collection: 'halaman', id: docs[0].id, data: { _status: 'published', tataLetak } })
  +}
  +
  +await terbitkanHalaman(SLUG_HALAMAN.tentang, [
  +  {
  +    blockType: 'hero',
  +    judul: 'Intinya dulu, lalu bisa kamu hitung sendiri',
  +    subjudul: 'point. menjelaskan uang, karier, teknologi, pendidikan, dan kesehatan untuk pembaca Indonesia.',
  +  },
  +  { blockType: 'teks', isi: isi(h2('Siapa kami'), p('Redaksi kecil yang menulis dari intinya, dengan sumber yang bisa kamu periksa.')) },
  +  {
  +    blockType: 'kartu',
  +    judul: 'Prinsip kami',
  +    kartu: [
  +      { judul: 'Lugas', teks: 'Jawaban ada di kalimat pertama.' },
  +      { judul: 'Cermat', teks: 'Angka bersumber dan bertanggal.' },
  +      { judul: 'Akrab', teks: 'Bahasa sehari-hari, tanpa istilah yang tidak perlu.' },
  +    ],
  +  },
  +  { blockType: 'cta', judul: 'Ada yang keliru?', teks: 'Kabari redaksi, kami periksa dan perbaiki.', labelTombol: 'Baca kebijakan redaksi', tautan: '/kebijakan-redaksi' },
  +  { blockType: 'faqBlok', judul: 'Tanya jawab', faq: [{ pertanyaan: 'Apakah point. menerima tulisan tamu?', jawaban: 'Belum. Semua tulisan ditulis dan diperiksa redaksi.' }] },
  +])
  +await terbitkanHalaman(SLUG_HALAMAN.kebijakanRedaksi, [
  +  { blockType: 'teks', isi: isi(h2('Sumber dan koreksi'), p('Setiap angka di point. punya sumber. Koreksi dicatat di akhir tulisan.')) },
  +])
  +
   await payload.create({ collection: 'redirect', data: { dari: '/promo-lama', ke: '/glosarium', kode: '301' } })
   await payload.create({ collection: 'redirect', data: { dari: '/glosarium/ptkp-lama', ke: '/glosarium/ptkp', kode: '301' } })
   await payload.create({ collection: 'redirect', data: { dari: '/tulisan-dihapus', kode: '410' } })
  ```

  `tests/e2e/halaman.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  import { SLUG_HALAMAN, UKURAN_LAYAR } from './data'

  test.beforeEach(async ({ page }) => {
    await cegatCloudinary(page)
  })

  test('halaman Tentang dari page builder: hero, teks, kartu, CTA, dan FAQ', async ({ page }) => {
    await page.goto(`/${SLUG_HALAMAN.tentang}`)
    await expect(page).toHaveTitle('Tentang · point.')
    await expect(page.getByRole('navigation', { name: 'Remah roti' }).getByRole('link')).toHaveText(['Beranda'])
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Intinya dulu, lalu bisa kamu hitung sendiri')
    await expect(page.getByRole('heading', { level: 2, name: 'Siapa kami' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Prinsip kami' }).getByRole('heading', { level: 3 })).toHaveText(['Lugas', 'Cermat', 'Akrab'])
    await expect(page.getByRole('link', { name: 'Baca kebijakan redaksi' })).toHaveAttribute('href', `/${SLUG_HALAMAN.kebijakanRedaksi}`)
    const faq = page.getByRole('region', { name: 'Tanya jawab' })
    await faq.getByText('Apakah point. menerima tulisan tamu?').click()
    await expect(faq.getByText('Belum. Semua tulisan ditulis dan diperiksa redaksi.')).toBeVisible()
  })

  test('jarak antarblok halaman statis tetap 40 px, termasuk blok teks yang dibuka subjudul', async ({ page }) => {
    for (const lebar of [375, 1440]) {
      await page.setViewportSize({ width: lebar, height: 900 })
      await page.goto(`/${SLUG_HALAMAN.tentang}`)
      const deck = await page.getByText('point. menjelaskan uang, karier').boundingBox()
      const subjudul = await page.getByRole('heading', { level: 2, name: 'Siapa kami' }).boundingBox()
      expect(Math.round(subjudul!.y - (deck!.y + deck!.height)), `${lebar}px`).toBe(40)
    }
  })

  test('halaman tanpa hero memakai judulnya sebagai H1, terbuka dari footer; halaman draf 404', async ({ page, request }) => {
    await page.goto('/')
    await page.getByRole('contentinfo').getByRole('link', { name: 'Kebijakan Redaksi' }).click()
    await expect(page).toHaveURL(`/${SLUG_HALAMAN.kebijakanRedaksi}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kebijakan Redaksi')
    await expect(page.getByRole('heading', { level: 2, name: 'Sumber dan koreksi' })).toBeVisible()
    expect((await request.get(`/${SLUG_HALAMAN.draf}`)).status()).toBe(404)
  })

  for (const { lebar, tinggi } of UKURAN_LAYAR) {
    test(`halaman statis ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: tinggi })
      for (const slug of [SLUG_HALAMAN.tentang, SLUG_HALAMAN.kebijakanRedaksi]) {
        await page.goto(`/${slug}`)
        await periksaTanpaGeserHorizontal(page)
        await periksaAxe(page)
      }
    })
  }
  ```

  Jalankan:

  ```bash
  npm run test:e2e
  ```

  Hasil yang diharapkan: `42 passed`. `/tentang` punya satu H1 dari hero, kartu "Prinsip kami", CTA ke `/kebijakan-redaksi`, dan FAQ; `/kebijakan-redaksi` (tanpa hero) memakai judulnya sebagai H1 dan terbuka dari tautan footer; `/pasang-iklan` (masih draf) menjawab 404.

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/modules/konten src/components/halaman src/components/artikel/Faq.tsx src/components/isi "src/app/(frontend)/[...jalur]/page.tsx" tests/unit/halaman-statis.test.ts tests/int/halaman.int.spec.ts tests/e2e
  git commit -m "feat(ui): halaman statis dari page builder di rute catch-all"
  ```

### Task 3: Profil penulis di `/penulis/{slug}`

**Files:**
- Create: `src/modules/konten/penulis.ts`, `src/components/penulis/HalamanPenulis.tsx`, `src/components/penulis/Penulis.module.css`, `src/app/(frontend)/penulis/[slug]/page.tsx`
- Modify: `src/modules/konten/tipe.ts`, `src/modules/konten/data.ts`, `src/modules/konten/cache.ts`, `src/modules/konten/index.ts`, `tests/e2e/siapkan.ts`
- Test: `tests/unit/penulis.test.ts`, `tests/int/penulis.int.spec.ts`, `tests/e2e/penulis.spec.ts`

**Interfaces:**
- Consumes: `penulisRingkas`, `POPULATE_ARTIKEL`, `kartuTerbit` (Task 1), `DaftarKartu`, `RemahRoti`, `JsonLd`, `Tautan`, `Ikon`, `tanganiTidakAda` (Rencana 4A); `jsonLd` (ProfilePage + Person), `metadata` (Open Graph `profile`), `pathFor({ jenis: 'penulis' })` (Rencana 3).
- Produces:
  - `src/modules/konten/tipe.ts`: `DataPenulis = PenulisRingkas & { tautan: Tautan[]; artikel: KartuArtikel[]; seo: PenulisSeo }`.
  - `src/modules/konten/penulis.ts`: `MAKS_ARTIKEL_PENULIS = 24`, `susunPenulis(doc, artikel): DataPenulis | null`.
  - `ambilPenulis(payload, slug)`, `muatPenulis(slug)` (tag `penulis`, `artikel`, `pilar`, `media`).
  - Komponen `HalamanPenulis({ penulis, situs })`, rute `/penulis/{slug}` (ISR).
  - E2E: penulis Redaksi point. diberi foto, keahlian (Pajak penghasilan, Gizi), dan tautan Instagram.

Profil penulis adalah rambu kredibilitas (spesifikasi §3, YMYL): byline dan kotak penulis di artikel Rencana 4A sudah menautkannya, dan sitemap penulis Rencana 3 sudah memuat URL-nya. Halaman menampilkan foto (bulat, `thumbnail` 1:1), label "Penulis", nama sebagai H1, bio, keahlian, tautan profesional dengan `rel="me noopener"` (penanda identitas yang sama dengan `sameAs` di JSON-LD Person), lalu "Tulisan {nama}": maksimal 24 tulisan terbit bukan glosarium, terbaru dulu. Penulis tanpa tulisan tetap punya halaman, dengan pesan kosong. Koleksi `penulis` tidak punya draf, jadi semua penulis bisa dibuka; slug yang tidak ada berakhir di `tanganiTidakAda` (redirect otomatis Rencana 1 bila slug berganti, selain itu 404).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/penulis.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it, vi } from 'vitest'

  import { HalamanPenulis } from '@/components/penulis/HalamanPenulis'
  import { susunPenulis } from '@/modules/konten/penulis'
  import type { KartuArtikel } from '@/modules/konten/tipe'
  import type { Penuli } from '@/payload-types'

  import { situs } from './seo-contoh'

  vi.mock('next/image', () => ({
    default: (props: Record<string, unknown>) => h('img', { src: props.src, alt: props.alt, width: props.width, height: props.height }),
  }))

  const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }

  const rani: Penuli = {
    id: 3,
    nama: 'Rani Wulandari',
    slug: 'rani-wulandari',
    bio: 'Menulis soal pajak dan gaji.',
    keahlian: ['Pajak penghasilan', 'BPJS'],
    foto: { id: 9, publicId: 'point/gambar/rani', jenis: 'gambar', alt: 'Rani', width: 800, height: 800, ...waktu },
    tautan: [
      { label: 'LinkedIn', url: 'https://www.linkedin.com/in/rani' },
      { label: 'Kosong', url: ' ' },
    ],
    ...waktu,
  }

  const kartu: KartuArtikel = {
    id: 10,
    judul: 'Cara hitung gaji bersih',
    href: '/cara-hitung-gaji-bersih',
    tipe: 'panduan',
    pilar: { nama: 'Uang & Karier', slug: 'uang-karier', href: '/uang-karier', warna: 'hijau', disclaimer: null },
    intinya: 'Gaji kotor dikurangi PPh 21 dan BPJS.',
  }

  describe('susunPenulis', () => {
    it('data ringkas, tautan berisi URL, tulisan, dan dokumen SEO', () => {
      const penulis = susunPenulis(rani, [kartu])
      expect(penulis).toMatchObject({ nama: 'Rani Wulandari', href: '/penulis/rani-wulandari', keahlian: ['Pajak penghasilan', 'BPJS'] })
      expect(penulis?.tautan).toEqual([{ label: 'LinkedIn', href: 'https://www.linkedin.com/in/rani' }])
      expect(penulis?.foto?.publicId).toBe('point/gambar/rani')
      expect(penulis?.seo.slug).toBe('rani-wulandari')
      expect(susunPenulis({ ...rani, slug: null }, [])).toBeNull()
    })
  })

  describe('HalamanPenulis', () => {
    it('H1 nama, bio, keahlian, tautan rel="me", tulisan, dan JSON-LD ProfilePage', () => {
      const html = renderToStaticMarkup(h(HalamanPenulis, { penulis: susunPenulis(rani, [kartu])!, situs }))
      expect(html).toMatch(/<h1 class="[^"]*">Rani Wulandari<\/h1>/)
      expect(html).toContain('Menulis soal pajak dan gaji.')
      expect(html).toContain('<ul aria-label="Keahlian"')
      expect(html).toMatch(/<a href="https:\/\/www\.linkedin\.com\/in\/rani" rel="me noopener">LinkedIn/)
      expect(html).toContain('<h2 id="tulisan-penulis" class="')
      expect(html).toContain('href="/cara-hitung-gaji-bersih"')
      expect(html).toContain('"@type":"ProfilePage"')
    })

    it('penulis tanpa tulisan terbit', () => {
      const html = renderToStaticMarkup(h(HalamanPenulis, { penulis: susunPenulis({ ...rani, foto: null, tautan: [] }, [])!, situs }))
      expect(html).toContain('Belum ada tulisan yang terbit. Tulisan baru tampil di sini setelah terbit.')
      expect(html).not.toContain('<img')
    })
  })
  ```

  `tests/int/penulis.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { ambilPenulis } from '@/modules/konten/data'

  import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
  import { getTestPayload } from './helpers'

  describe('ambilPenulis', () => {
    it('profil dengan tulisan terbitnya saja, terbaru dulu', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const lain = await siapkanRelasiArtikel(payload)
      const lama = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      const baru = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft' } })
      await payload.create({ collection: 'artikel', data: dataArtikelTerbit(lain) })

      const penulis = await ambilPenulis(payload, relasi.penulis.slug as string)
      expect(penulis?.nama).toBe(relasi.penulis.nama)
      expect(penulis?.artikel.map((k) => k.id)).toEqual([baru.id, lama.id])
      expect(await ambilPenulis(payload, 'tidak-ada-penulis-ini')).toBeNull()
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/penulis.test.ts` dengan `Cannot find package '@/components/penulis/HalamanPenulis'`.

- [ ] **Langkah 3: Data profil penulis**

  ```diff
  diff --git a/src/modules/konten/tipe.ts b/src/modules/konten/tipe.ts
  index 12b46a8..79b35be 100644
  --- a/src/modules/konten/tipe.ts
  +++ b/src/modules/konten/tipe.ts
  @@ -1,6 +1,6 @@
   import type { TipeArtikel, WarnaPilar } from '@/lib/konstanta'
   import type { IsiDokumen } from '@/modules/seo/lexical'
  -import type { ArtikelSeo, HalamanSeo, PilarSeo, SubkategoriSeo } from '@/modules/seo/tipe'
  +import type { ArtikelSeo, HalamanSeo, PenulisSeo, PilarSeo, SubkategoriSeo } from '@/modules/seo/tipe'
   
   /**
    * Data tampilan yang sudah siap dirender komponen publik. Komponen tidak membaca dokumen Payload
  @@ -106,3 +106,6 @@ export type BlokTampil =
   
   /** Halaman statis dari koleksi `halaman`. `heroUtama`: blok pertama hero, jadi judul tidak ditulis ulang. */
   export type DataHalaman = { judul: string; href: string; heroUtama: boolean; blok: BlokTampil[]; seo: HalamanSeo }
  +
  +/** Profil penulis `/penulis/{slug}` (rambu kredibilitas, spesifikasi §3) dengan tulisan terbitnya. */
  +export type DataPenulis = PenulisRingkas & { tautan: Tautan[]; artikel: KartuArtikel[]; seo: PenulisSeo }
  ```

  `src/modules/konten/penulis.ts`

  ```ts
  import type { Penuli } from '@/payload-types'
  import type { PenulisSeo } from '@/modules/seo/tipe'

  import { penulisRingkas } from './artikel'
  import type { DataPenulis, KartuArtikel } from './tipe'

  /** Jumlah tulisan terbaru di profil penulis. Paginasi menyusul bila satu penulis melewati angka ini. */
  export const MAKS_ARTIKEL_PENULIS = 24

  /** Profil penulis (spesifikasi §3, rambu kredibilitas): data ringkas, tautan profesional, dan tulisannya. */
  export function susunPenulis(doc: Penuli, artikel: KartuArtikel[]): DataPenulis | null {
    const ringkas = penulisRingkas(doc)
    if (!ringkas) return null
    return {
      ...ringkas,
      tautan: (doc.tautan ?? []).filter((t) => t.url?.trim()).map((t) => ({ label: t.label, href: t.url.trim() })),
      artikel,
      seo: doc as PenulisSeo,
    }
  }
  ```

  ```diff
  diff --git a/src/modules/konten/data.ts b/src/modules/konten/data.ts
  index 4903448..e922866 100644
  --- a/src/modules/konten/data.ts
  +++ b/src/modules/konten/data.ts
  @@ -6,11 +6,12 @@ import { validasiFormatSlug } from '@/lib/slug'
   import { gabungTerkait, kartuArtikel, MAKS_TERKAIT, susunArtikel } from './artikel'
   import { kelompokkanIstilah } from './glosarium'
   import { susunHalaman } from './halaman'
  +import { MAKS_ARTIKEL_PENULIS, susunPenulis } from './penulis'
   import { MAKS_PATH } from './log404'
   import type { RedirectTersimpan } from './redirect'
   import { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
   import { susunFooter, susunHeader } from './tampilan'
  -import type { DataArtikel, DataFooter, DataHalaman, DataHeader, DataRubrik, KartuArtikel, KelompokIstilah } from './tipe'
  +import type { DataArtikel, DataFooter, DataHalaman, DataHeader, DataPenulis, DataRubrik, KartuArtikel, KelompokIstilah } from './tipe'
   
   /**
    * Query Payload untuk halaman publik. Fungsi di sini menerima `payload` supaya bisa diuji integrasi;
  @@ -196,3 +197,19 @@ export async function ambilHalaman(payload: Payload, slug: string): Promise<Data
     })
     return docs[0] ? susunHalaman(docs[0]) : null
   }
  +
  +/** Profil penulis dengan tulisan terbitnya (bukan glosarium), terbaru dulu. Penulis tidak punya draf. */
  +export async function ambilPenulis(payload: Payload, slug: string): Promise<DataPenulis | null> {
  +  if (validasiFormatSlug(slug) !== true) return null
  +  const { docs } = await payload.find({
  +    collection: 'penulis',
  +    where: { slug: { equals: slug } },
  +    depth: 1,
  +    limit: 1,
  +    pagination: false,
  +    populate: { media: POPULATE_ARTIKEL.media },
  +  })
  +  const penulis = docs[0]
  +  if (!penulis) return null
  +  return susunPenulis(penulis, await kartuTerbit(payload, [{ penulis: { equals: penulis.id } }], MAKS_ARTIKEL_PENULIS))
  +}
  ```

  ```diff
  diff --git a/src/modules/konten/cache.ts b/src/modules/konten/cache.ts
  index 4c3d1b8..9216fc0 100644
  --- a/src/modules/konten/cache.ts
  +++ b/src/modules/konten/cache.ts
  @@ -5,7 +5,17 @@ import { getPayload } from 'payload'
   import { TAG } from '@/lib/tag'
   import { ambilSitus } from '@/modules/seo/situs'
   
  -import { ambilArtikel, ambilFooter, ambilGlosarium, ambilHalaman, ambilHeader, ambilRubrik, ambilTerbaru, cariRedirect } from './data'
  +import {
  +  ambilArtikel,
  +  ambilFooter,
  +  ambilGlosarium,
  +  ambilHalaman,
  +  ambilHeader,
  +  ambilPenulis,
  +  ambilRubrik,
  +  ambilTerbaru,
  +  cariRedirect,
  +} from './data'
   
   /**
    * Data halaman publik yang di-cache dengan tag (spesifikasi §5 "Rendering"). Halaman dirender statis
  @@ -91,3 +101,9 @@ export const muatHalaman = unstable_cache(async (slug: string) => ambilHalaman(a
     tags: TAG_ARTIKEL,
     revalidate: SEJAM,
   })
  +
  +/** Profil penulis: foto (media), kartu tulisan (artikel dan pilar), dan data penulis sendiri. */
  +export const muatPenulis = unstable_cache(async (slug: string) => ambilPenulis(await payload(), slug), ['konten', 'penulis'], {
  +  tags: [TAG.koleksi('penulis'), TAG.koleksi('artikel'), TAG.koleksi('pilar'), TAG.media],
  +  revalidate: SEJAM,
  +})
  ```

  ```diff
  diff --git a/src/modules/konten/index.ts b/src/modules/konten/index.ts
  index 77920a6..24594b7 100644
  --- a/src/modules/konten/index.ts
  +++ b/src/modules/konten/index.ts
  @@ -14,13 +14,25 @@ export {
     muatGlosarium,
     muatHalaman,
     muatHeader,
  +  muatPenulis,
     muatRedirect,
     muatRubrik,
     muatSitus,
     muatTerbaru,
     TAG_ARTIKEL,
   } from './cache'
  -export { ambilArtikel, ambilFooter, ambilGlosarium, ambilHalaman, ambilHeader, ambilRubrik, ambilTerbaru, cariRedirect } from './data'
  +export {
  +  ambilArtikel,
  +  ambilFooter,
  +  ambilGlosarium,
  +  ambilHalaman,
  +  ambilHeader,
  +  ambilPenulis,
  +  ambilRubrik,
  +  ambilTerbaru,
  +  cariRedirect,
  +} from './data'
  +export { MAKS_ARTIKEL_PENULIS, susunPenulis } from './penulis'
   export { JUDUL_FAQ, susunHalaman } from './halaman'
   export { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
   export { muatJalur, type HasilJalur } from './jalur'
  ```

- [ ] **Langkah 4: Komponen dan rute**

  `src/components/penulis/Penulis.module.css`

  ```css
  /* Profil penulis: identitas di kiri foto (desktop), tulisan di bawah. */
  .halaman {
    display: grid;
    gap: var(--ruang-6);
    padding-top: var(--ruang-4);
  }

  .kepala {
    display: grid;
    gap: var(--ruang-6);
    align-items: start;
    padding: var(--ruang-8) var(--ruang-6);
    border-radius: var(--radius-kartu);
    background: var(--permukaan);
  }

  .foto {
    width: 120px;
    height: 120px;
    border-radius: 50%;
  }

  .identitas {
    display: grid;
    gap: var(--ruang-3);
    max-width: 68ch;
  }

  .label {
    font-size: var(--teks-label);
    font-weight: 800;
    letter-spacing: var(--jarak-label);
    text-transform: uppercase;
  }

  .judul {
    font-size: var(--teks-h1);
    font-stretch: var(--lebar-h1);
    line-height: var(--tinggi-h1);
    letter-spacing: -0.02em;
  }

  .bio {
    font-size: var(--teks-deck);
    line-height: 1.45;
  }

  .keahlian,
  .tautan {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ruang-2);
    padding: 0;
    list-style: none;
  }

  .keahlian li {
    padding: var(--ruang-1) var(--ruang-3);
    border-radius: var(--radius-pil);
    background: var(--latar);
    font-size: var(--teks-kecil);
    font-weight: 600;
  }

  .tautan a {
    display: inline-flex;
    align-items: center;
    gap: var(--ruang-1);
    min-height: var(--sentuh-min);
    font-weight: 700;
  }

  .tulisan {
    display: grid;
    gap: var(--ruang-6);
    margin-top: var(--ruang-4);
  }

  .subjudul {
    font-size: var(--teks-h2);
    font-stretch: var(--lebar-h2);
  }

  .kosong {
    max-width: 60ch;
    padding: var(--ruang-6);
    border-radius: var(--radius-kartu);
    background: var(--permukaan);
  }

  @media (min-width: 48rem) {
    .kepala {
      grid-template-columns: 160px 1fr;
      padding: var(--ruang-10);
    }

    .foto {
      width: 160px;
      height: 160px;
    }
  }
  ```

  `src/components/penulis/HalamanPenulis.tsx`

  ```tsx
  import Image from 'next/image'

  import { Ikon } from '@/components/dasar/Ikon'
  import { JsonLd } from '@/components/dasar/JsonLd'
  import { RemahRoti } from '@/components/dasar/RemahRoti'
  import { Tautan } from '@/components/dasar/Tautan'
  import { DaftarKartu } from '@/components/kartu/KartuArtikel'
  import type { DataPenulis } from '@/modules/konten/tipe'
  import { propsGambar } from '@/modules/media/props'
  import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
  import type { Situs } from '@/modules/seo/tipe'

  import gaya from './Penulis.module.css'

  /**
   * Profil penulis `/penulis/{slug}`: foto, nama, bio, keahlian, tautan profesional (`rel="me"`), dan
   * tulisan terbarunya. JSON-LD ProfilePage + Person dari modul SEO.
   */
  export function HalamanPenulis({ penulis, situs }: { penulis: DataPenulis; situs: Situs }) {
    const masukan = { jenis: 'penulis', doc: penulis.seo } as const
    const foto = propsGambar(penulis.foto, 'thumbnail', { cloudName: situs.cloudName, lebar: 320 })
    return (
      <div className={`kontainer ${gaya.halaman}`}>
        <JsonLd data={jsonLd(masukan, situs)} />
        <RemahRoti remah={remahRoti(masukan)} />
        <header className={gaya.kepala}>
          {foto && <Image {...foto} alt="" sizes="160px" className={gaya.foto} />}
          <div className={gaya.identitas}>
            <p className={gaya.label}>Penulis</p>
            <h1 className={gaya.judul}>{penulis.nama}</h1>
            {penulis.bio && <p className={gaya.bio}>{penulis.bio}</p>}
            {penulis.keahlian.length > 0 && (
              <ul aria-label="Keahlian" className={gaya.keahlian}>
                {penulis.keahlian.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            )}
            {penulis.tautan.length > 0 && (
              <ul aria-label={`Tautan ${penulis.nama}`} className={gaya.tautan}>
                {penulis.tautan.map((t) => (
                  <li key={t.href}>
                    <Tautan href={t.href} rel="me noopener">
                      {t.label}
                      <Ikon nama="arrow-up-right" ukuran={18} />
                    </Tautan>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>
        <section aria-labelledby="tulisan-penulis" className={gaya.tulisan}>
          <h2 id="tulisan-penulis" className={gaya.subjudul}>
            Tulisan {penulis.nama}
          </h2>
          {penulis.artikel.length > 0 ? (
            <DaftarKartu kartu={penulis.artikel} />
          ) : (
            <p className={gaya.kosong}>Belum ada tulisan yang terbit. Tulisan baru tampil di sini setelah terbit.</p>
          )}
        </section>
      </div>
    )
  }
  ```

  `src/app/(frontend)/penulis/[slug]/page.tsx`

  ```tsx
  import type { Metadata } from 'next'
  import { cache } from 'react'

  import { HalamanPenulis } from '@/components/penulis/HalamanPenulis'
  import { pathFor } from '@/lib/paths'
  import { muatPenulis, muatSitus, tanganiTidakAda } from '@/modules/konten'
  import { metadata, metadataTidakDitemukan } from '@/modules/seo'

  type Props = { params: Promise<{ slug: string }> }

  /** `/penulis/{slug}`: profil penulis (ISR). */
  export function generateStaticParams() {
    return []
  }

  const cari = cache(async (slug: string) => muatPenulis(slug))

  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const penulis = await cari((await params).slug)
    if (!penulis) return metadataTidakDitemukan(await muatSitus())
    return metadata({ jenis: 'penulis', doc: penulis.seo }, await muatSitus())
  }

  export default async function Penulis({ params }: Props) {
    const { slug } = await params
    const penulis = await cari(slug)
    if (!penulis) return tanganiTidakAda(pathFor({ jenis: 'penulis', slug }))
    return <HalamanPenulis penulis={penulis} situs={await muatSitus()} />
  }
  ```

- [ ] **Langkah 5: Jalankan tes unit dan integrasi**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 38 passed (38)`, `Tests 260 passed (260)`; integrasi `Test Files 20 passed (20)`, `Tests 64 passed (64)`.

- [ ] **Langkah 6: Profil contoh dan tes E2E**

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index bfb0519..2081985 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -46,6 +46,14 @@ async function buatGambar(alt: string, warna: string) {
   
   const slip = await buatGambar('Slip gaji karyawan', '#1F7A4D')
   const kasur = await buatGambar('Kamar tidur yang gelap', '#FF8A80')
  +const logo = await buatGambar('Logo redaksi point.', '#111111')
  +
  +// Profil penulis lengkap untuk halaman /penulis/redaksi.
  +await payload.update({
  +  collection: 'penulis',
  +  id: redaksi.id,
  +  data: { foto: logo.id, keahlian: ['Pajak penghasilan', 'Gizi'], tautan: [{ label: 'Instagram', url: 'https://www.instagram.com/point.lat' }] },
  +})
   
   const dasar = { _status: 'published' as const, penulis: redaksi.id, gambarUtama: slip.id }
   
  ```

  `tests/e2e/penulis.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  import { SLUG, UKURAN_LAYAR } from './data'

  test.beforeEach(async ({ page }) => {
    await cegatCloudinary(page)
  })

  test('byline artikel membuka profil penulis dengan keahlian, tautan, dan tulisannya', async ({ page }) => {
    await page.goto(`/${SLUG.panduan}`)
    await page.getByRole('article').locator('header').getByRole('link', { name: 'Redaksi point.' }).click()
    await expect(page).toHaveURL('/penulis/redaksi')
    await expect(page).toHaveTitle('Redaksi point. · point.')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Redaksi point.')
    await expect(page.getByRole('list', { name: 'Keahlian' }).getByRole('listitem')).toHaveText(['Pajak penghasilan', 'Gizi'])
    await expect(page.getByRole('link', { name: 'Instagram' })).toHaveAttribute('rel', 'me noopener')
    const tulisan = page.getByRole('region', { name: 'Tulisan Redaksi point.' })
    await expect(tulisan.getByRole('link', { name: /Cara hitung gaji bersih/ })).toHaveAttribute('href', `/${SLUG.panduan}`)
    await expect(tulisan.getByRole('link', { name: /^PTKP/ })).toHaveCount(0)
  })

  test('penulis yang tidak ada menjawab 404', async ({ request }) => {
    expect((await request.get('/penulis/tidak-ada')).status()).toBe(404)
  })

  for (const { lebar, tinggi } of UKURAN_LAYAR) {
    test(`profil penulis ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: tinggi })
      await page.goto('/penulis/redaksi')
      await periksaTanpaGeserHorizontal(page)
      await periksaAxe(page)
    })
  }
  ```

  Jalankan:

  ```bash
  npm run test:e2e
  ```

  Hasil yang diharapkan: `47 passed`. Byline panduan membuka `/penulis/redaksi` dengan keahlian, tautan Instagram `rel="me noopener"`, dan tulisan redaksi tanpa istilah glosarium; `/penulis/tidak-ada` menjawab 404.

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/modules/konten src/components/penulis "src/app/(frontend)/penulis" tests/unit/penulis.test.ts tests/int/penulis.int.spec.ts tests/e2e
  git commit -m "feat(ui): profil penulis di /penulis/{slug}"
  ```

### Task 4: Indeks dan halaman video, `/video` di sitemap halaman

**Files:**
- Create: `src/modules/konten/video.ts`, `src/components/video/KartuVideo.tsx`, `src/components/video/HalamanVideo.tsx`, `src/components/video/Video.module.css`, `src/app/(frontend)/video/page.tsx`, `src/app/(frontend)/video/[slug]/page.tsx`
- Modify: `src/lib/paths.ts`, `src/modules/konten/tipe.ts`, `src/modules/konten/data.ts`, `src/modules/konten/cache.ts`, `src/modules/konten/index.ts`, `src/modules/seo/data.ts`, `src/components/isi/VideoSemat.tsx`, `tests/int/sitemap.int.spec.ts`, `tests/e2e/data.ts`, `tests/e2e/siapkan.ts`
- Test: `tests/unit/video.test.ts`, `tests/int/video.int.spec.ts`, `tests/e2e/video.spec.ts`

**Interfaces:**
- Consumes: `mediaTampil`, `pilarRingkas`, `kartuTerbit` (Task 1), `VideoSemat`, `KartuArtikel`, `ChipPilar`, `propsGambar` (Rencana 2 dan 4A); `jsonLd` (VideoObject), `metadata` (Open Graph `video.other`) (Rencana 3).
- Produces:
  - `src/lib/paths.ts`: `PATH_INDEKS.video = '/video'` (dipakai `pathFor` video).
  - `src/modules/konten/tipe.ts`: `KartuVideo = { id; judul; href; durasi: number | null; pilar: PilarRingkas | null; poster: MediaTampil | null }`, `VideoUntukSemat`, `DataVideo = KartuVideo & { semat; induk: KartuArtikel | null; lain: KartuVideo[]; seo: VideoSeo }`.
  - `src/modules/konten/video.ts`: `MAKS_VIDEO_INDEKS = 60`, `MAKS_VIDEO_LAIN = 4`, `labelDurasi(detik)`, `kartuVideo(doc)`, `susunVideo(doc, induk, lain)`.
  - `src/modules/konten/data.ts`: `POPULATE_VIDEO`, fungsi internal `kartuVideoTerbit(payload, syarat, jumlah)`, `ambilDaftarVideo(payload)`, `ambilVideo(payload, slug)`; cache `muatDaftarVideo()`, `muatVideo(slug)`.
  - Komponen `KartuVideo({ video, cloudName, tingkat? })`, `DaftarVideo({ video, cloudName, tingkat? })`, `IndeksVideo`, `HalamanVideo`, `JUDUL_VIDEO`, `DESKRIPSI_VIDEO`; `VideoSemat` mendapat prop `utama`.
  - Sitemap `halaman.xml` memuat `/video` bila ada video terbit.
  - E2E: `SLUG_VIDEO = { pph21, otp, draf }`; dua video terbit (PPh 21 di Uang & Karier 45 detik, OTP di Tekno 38 detik) dan satu draf; panduan memakai video PPh 21 sebagai `videoTerkait`.

Video adalah explainer vertikal 9:16 (spesifikasi §3, §9). Indeks `/video` menampilkan semua video terbit, terbaru dulu (koleksi `video` tidak punya tanggal terbit, jadi `createdAt`), sebagai kartu 9:16: poster unggahan editor, atau frame video dari Cloudinary bila tanpa poster, dengan label durasi ("45 detik"). Durasi isian editor dipakai lebih dulu, cadangannya durasi file media. Grid dua kolom di HP, empat kolom mulai 768 px.

Halaman `/video/{slug}` memakai ulang `VideoSemat` Rencana 4A (HLS + MP4 tanpa JavaScript, `preload="none"`, poster). Prop baru `utama`: judul sudah menjadi H1, jadi keterangan di bawah video tidak diulang, dan transkrip langsung terbuka (video belum punya takarir, lihat Task 11). Ruang pemutar memakai rasio file video (`aspect-ratio` dari lebar dan tinggi media), bukan rasio poster, supaya tidak ada CLS. "Baca penjelasan lengkap" menautkan artikel induk (artikel terbit yang `videoTerkait`-nya video ini, catatan di koleksi `video` Rencana 1) dan berada di samping video mulai 1024 px, lalu "Video lain" (maksimal 4). JSON-LD VideoObject dari modul SEO. Halaman video ikut dibuang saat artikel berubah karena memuat artikel induk.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/video.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it, vi } from 'vitest'

  import { HalamanVideo, IndeksVideo } from '@/components/video/HalamanVideo'
  import type { KartuArtikel } from '@/modules/konten/tipe'
  import { kartuVideo, labelDurasi, susunVideo } from '@/modules/konten/video'
  import type { Media, Video } from '@/payload-types'

  import { situs } from './seo-contoh'

  vi.mock('next/image', () => ({
    default: (props: Record<string, unknown>) => h('img', { src: props.src, alt: props.alt, width: props.width, height: props.height }),
  }))

  const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
  const file: Media = { id: 20, publicId: 'point/video/slip', jenis: 'video', alt: null, width: 1080, height: 1920, durasi: 44.6, ...waktu }
  const pilar = { id: 1, nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau' as const, deskripsi: 'Uang.', ...waktu }

  const video: Video = {
    id: 5,
    judul: 'PPh 21 dijelaskan dengan satu slip gaji',
    slug: 'pph-21-satu-slip-gaji',
    file,
    poster: null,
    pilar,
    durasiDetik: null,
    transkrip: 'Ambil slip gajimu.\n\nCari baris PPh 21.',
    _status: 'published',
    ...waktu,
  }

  const induk: KartuArtikel = {
    id: 10,
    judul: 'Cara hitung gaji bersih',
    href: '/cara-hitung-gaji-bersih',
    tipe: 'panduan',
    pilar: { nama: 'Uang & Karier', slug: 'uang-karier', href: '/uang-karier', warna: 'hijau', disclaimer: null },
    intinya: 'Gaji kotor dikurangi PPh 21 dan BPJS.',
  }

  describe('labelDurasi', () => {
    it('detik dan menit dalam bahasa Indonesia', () => {
      expect([labelDurasi(45), labelDurasi(60), labelDurasi(65), labelDurasi(0.4)]).toEqual(['45 detik', '1 menit', '1 menit 5 detik', '1 detik'])
    })
  })

  describe('kartuVideo dan susunVideo', () => {
    it('poster dari frame video bila tanpa poster unggahan; durasi file sebagai cadangan', () => {
      const kartu = kartuVideo(video)
      expect(kartu).toMatchObject({ href: '/video/pph-21-satu-slip-gaji', durasi: 44.6, pilar: { warna: 'hijau' } })
      expect(kartu?.poster).toMatchObject({ publicId: 'point/video/slip', jenis: 'video' })
      const poster: Media = { id: 21, publicId: 'point/gambar/poster', jenis: 'gambar', alt: 'Slip', width: 900, height: 1600, ...waktu }
      expect(kartuVideo({ ...video, poster, durasiDetik: 45 })).toMatchObject({ durasi: 45, poster: { publicId: 'point/gambar/poster' } })
      expect(kartuVideo({ ...video, slug: null })).toBeNull()
    })

    it('halaman video membawa dokumen untuk pemutar, artikel induk, dan video lain', () => {
      const data = susunVideo(video, induk, [])
      expect(data?.semat).toMatchObject({ judul: video.judul, transkrip: video.transkrip, _status: 'published' })
      expect(data?.induk?.href).toBe('/cara-hitung-gaji-bersih')
      expect(data?.seo.slug).toBe('pph-21-satu-slip-gaji')
    })
  })

  describe('IndeksVideo dan HalamanVideo', () => {
    it('indeks: kartu 9:16 dengan judul H2 dan durasi', () => {
      const masukan = { jenis: 'statis', judul: 'Video', path: '/video' } as const
      const html = renderToStaticMarkup(h(IndeksVideo, { video: [kartuVideo(video)!], masukan, situs }))
      expect(html).toMatch(/<h1 class="[^"]*">Video<\/h1>/)
      expect(html).toMatch(/<a class="[^"]*" data-warna="hijau" href="\/video\/pph-21-satu-slip-gaji">/)
      expect(html).toContain('src="https://res.cloudinary.com/demo/video/upload/so_auto/c_limit,w_480,q_auto/point/video/slip.jpg"')
      expect(html).toContain('45 detik')
      expect(html).toMatch(/<h2 class="[^"]*">PPh 21 dijelaskan dengan satu slip gaji<\/h2>/)
      expect(renderToStaticMarkup(h(IndeksVideo, { video: [], masukan, situs }))).toContain('Belum ada video. Video baru tampil di sini setelah terbit.')
    })

    it('halaman: H1, pemutar tanpa keterangan ganda, transkrip terbuka, penjelasan, dan JSON-LD VideoObject', () => {
      const html = renderToStaticMarkup(h(HalamanVideo, { video: susunVideo(video, induk, [kartuVideo({ ...video, id: 6, slug: 'lain' })!])!, situs }))
      expect(html).toMatch(/<h1 class="[^"]*">PPh 21 dijelaskan dengan satu slip gaji<\/h1>/)
      expect(html).toContain('<video controls="" playsInline="" preload="none"')
      expect(html).not.toContain('<figcaption')
      expect(html).toMatch(/<details class="[^"]*" open="">/)
      expect(html).toContain('<h2 id="penjelasan"')
      expect(html).toContain('href="/cara-hitung-gaji-bersih"')
      expect(html).toContain('href="/video/lain"')
      expect(html).toContain('"@type":"VideoObject"')
    })
  })
  ```

  `tests/int/video.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { ambilDaftarVideo, ambilVideo } from '@/modules/konten/data'

  import { dataArtikelTerbit, siapkanRelasiArtikel, videoMp4 } from './fixtures'
  import { getTestPayload, unik } from './helpers'

  describe('ambilVideo dan ambilDaftarVideo', () => {
    it('video terbit saja, artikel induk dari videoTerkait, dan video lain tanpa dirinya', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const file = await payload.create({ collection: 'media', data: {}, file: videoMp4() })
      const dataVideo = () => ({ _status: 'published' as const, judul: unik('Video PPh 21'), file: file.id, pilar: relasi.pilar.id, transkrip: 'Transkrip.' })
      const pertama = await payload.create({ collection: 'video', data: dataVideo() })
      const kedua = await payload.create({ collection: 'video', data: { ...dataVideo(), durasiDetik: 45 } })
      const draf = await payload.create({ collection: 'video', draft: true, data: { ...dataVideo(), _status: 'draft' } })
      const induk = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), videoTerkait: pertama.id } })

      const daftar = (await ambilDaftarVideo(payload)).map((v) => v.id)
      expect(daftar.indexOf(kedua.id)).toBeLessThan(daftar.indexOf(pertama.id))
      expect(daftar).not.toContain(draf.id)

      const video = await ambilVideo(payload, pertama.slug as string)
      expect(video).toMatchObject({ judul: pertama.judul, durasi: 30, poster: { jenis: 'video' } })
      expect(video?.induk?.id).toBe(induk.id)
      expect(video?.lain.map((v) => v.id)).toContain(kedua.id)
      expect(video?.lain.map((v) => v.id)).not.toContain(pertama.id)
      expect((await ambilVideo(payload, kedua.slug as string))?.durasi).toBe(45)
      expect(await ambilVideo(payload, draf.slug as string)).toBeNull()
    })
  })
  ```

  Tambahkan tes sitemap:

  ```diff
  diff --git a/tests/int/sitemap.int.spec.ts b/tests/int/sitemap.int.spec.ts
  index 43fd74f..92dae86 100644
  --- a/tests/int/sitemap.int.spec.ts
  +++ b/tests/int/sitemap.int.spec.ts
  @@ -5,7 +5,7 @@ import { ambilSitus } from '@/modules/seo/situs'
   import type { PengaturanSitus } from '@/modules/seo/tipe'
   import { saringNews, terbaru } from '@/modules/seo/xml'
   
  -import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
  +import { dataArtikelTerbit, siapkanRelasiArtikel, videoMp4 } from './fixtures'
   import { getTestPayload, unik } from './helpers'
   
   let situs: PengaturanSitus
  @@ -84,6 +84,18 @@ describe('data rute teknis dari Payload', () => {
       expect(entri?.lastmod).toBe(terbaru([istilah.terbitPada]))
     })
   
  +  it('sitemap halaman memuat indeks /video dengan lastmod video terbaru', async () => {
  +    const payload = await getTestPayload()
  +    const relasi = await siapkanRelasiArtikel(payload)
  +    const file = await payload.create({ collection: 'media', data: {}, file: videoMp4() })
  +    const video = await payload.create({
  +      collection: 'video',
  +      data: { _status: 'published', judul: unik('Video'), file: file.id, pilar: relasi.pilar.id, transkrip: 'Transkrip.' },
  +    })
  +    const entri = (await ambilEntriSitemap(payload, 'halaman', situs)).find((e) => e.loc === url('/video'))
  +    expect(entri?.lastmod).toBe(terbaru([video.updatedAt]))
  +  })
  +
     it('sitemap pilar memuat halaman subkategori di bawah pilarnya', async () => {
       const payload = await getTestPayload()
       const relasi = await siapkanRelasiArtikel(payload)
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/video.test.ts` dengan `Cannot find package '@/components/video/HalamanVideo'`.

- [ ] **Langkah 3: Path indeks, data video, dan sitemap**

  ```diff
  diff --git a/src/lib/paths.ts b/src/lib/paths.ts
  index 78d38c0..dd54331 100644
  --- a/src/lib/paths.ts
  +++ b/src/lib/paths.ts
  @@ -6,7 +6,7 @@ export type TargetPath =
     | { jenis: 'pilar' | 'tools' | 'video' | 'penulis' | 'halaman'; slug: string }
   
   /** Halaman indeks yang tidak mewakili satu dokumen. */
  -export const PATH_INDEKS = { glosarium: '/glosarium' } as const
  +export const PATH_INDEKS = { glosarium: '/glosarium', video: '/video' } as const
   
   /** Satu-satunya tempat path publik dirangkai. Dipakai redirect, SEO, sitemap, dan indexer. */
   export function pathFor(target: TargetPath): string {
  @@ -18,7 +18,7 @@ export function pathFor(target: TargetPath): string {
       case 'tools':
         return `/tools/${target.slug}`
       case 'video':
  -      return `/video/${target.slug}`
  +      return `${PATH_INDEKS.video}/${target.slug}`
       case 'penulis':
         return `/penulis/${target.slug}`
       case 'pilar':
  ```

  ```diff
  diff --git a/src/modules/konten/tipe.ts b/src/modules/konten/tipe.ts
  index 79b35be..784b54c 100644
  --- a/src/modules/konten/tipe.ts
  +++ b/src/modules/konten/tipe.ts
  @@ -1,6 +1,7 @@
   import type { TipeArtikel, WarnaPilar } from '@/lib/konstanta'
   import type { IsiDokumen } from '@/modules/seo/lexical'
  -import type { ArtikelSeo, HalamanSeo, PenulisSeo, PilarSeo, SubkategoriSeo } from '@/modules/seo/tipe'
  +import type { ArtikelSeo, HalamanSeo, PenulisSeo, PilarSeo, SubkategoriSeo, VideoSeo } from '@/modules/seo/tipe'
  +import type { Video } from '@/payload-types'
   
   /**
    * Data tampilan yang sudah siap dirender komponen publik. Komponen tidak membaca dokumen Payload
  @@ -109,3 +110,12 @@ export type DataHalaman = { judul: string; href: string; heroUtama: boolean; blo
   
   /** Profil penulis `/penulis/{slug}` (rambu kredibilitas, spesifikasi §3) dengan tulisan terbitnya. */
   export type DataPenulis = PenulisRingkas & { tautan: Tautan[]; artikel: KartuArtikel[]; seo: PenulisSeo }
  +
  +/** Kartu video vertikal 9:16 untuk indeks `/video` dan "Video lain". `poster`: unggahan editor atau frame video. */
  +export type KartuVideo = { id: number; judul: string; href: string; durasi: number | null; pilar: PilarRingkas | null; poster: MediaTampil | null }
  +
  +/** Dokumen video yang diputar `VideoSemat` (sumber HLS dan MP4, poster, transkrip). */
  +export type VideoUntukSemat = Pick<Video, 'judul' | 'file' | 'poster' | 'transkrip' | '_status'>
  +
  +/** Halaman `/video/{slug}`: video, artikel induknya (yang `videoTerkait`-nya video ini), dan video lain. */
  +export type DataVideo = KartuVideo & { semat: VideoUntukSemat; induk: KartuArtikel | null; lain: KartuVideo[]; seo: VideoSeo }
  ```

  `src/modules/konten/video.ts`

  ```ts
  import type { Video } from '@/payload-types'
  import { pathFor } from '@/lib/paths'
  import type { VideoSeo } from '@/modules/seo/tipe'

  import { mediaTampil, pilarRingkas } from './artikel'
  import type { DataVideo, KartuArtikel, KartuVideo } from './tipe'

  /** Jumlah video di indeks `/video` dan di bagian "Video lain" halaman video. */
  export const MAKS_VIDEO_INDEKS = 60
  export const MAKS_VIDEO_LAIN = 4

  type VideoUntukKartu = Pick<Video, 'id' | 'judul' | 'slug' | 'durasiDetik' | 'pilar' | 'file' | 'poster'>

  /** Lama video untuk pembaca: "45 detik", "1 menit", "1 menit 5 detik". */
  export function labelDurasi(detik: number): string {
    const total = Math.max(1, Math.round(detik))
    const menit = Math.floor(total / 60)
    const sisa = total % 60
    if (!menit) return `${sisa} detik`
    return sisa ? `${menit} menit ${sisa} detik` : `${menit} menit`
  }

  /**
   * Kartu video 9:16. Poster unggahan editor dipakai bila ada, selain itu frame video dari Cloudinary
   * (`propsGambar` membuat URL poster untuk media video). Durasi isian editor, cadangannya durasi file.
   */
  export function kartuVideo(doc: VideoUntukKartu): KartuVideo | null {
    if (!doc.slug) return null
    const file = mediaTampil(doc.file)
    const durasi = doc.durasiDetik ?? (typeof doc.file === 'object' ? doc.file.durasi : null) ?? null
    return {
      id: doc.id,
      judul: doc.judul,
      href: pathFor({ jenis: 'video', slug: doc.slug }),
      durasi,
      pilar: pilarRingkas(doc.pilar),
      poster: mediaTampil(doc.poster) ?? file,
    }
  }

  /** Halaman `/video/{slug}`: video terbit (depth 1), artikel induknya, dan video lain. */
  export function susunVideo(doc: Video, induk: KartuArtikel | null, lain: KartuVideo[]): DataVideo | null {
    const kartu = kartuVideo(doc)
    if (!kartu) return null
    return {
      ...kartu,
      semat: { judul: doc.judul, file: doc.file, poster: doc.poster, transkrip: doc.transkrip, _status: doc._status },
      induk,
      lain,
      seo: doc as VideoSeo,
    }
  }
  ```

  ```diff
  diff --git a/src/modules/konten/data.ts b/src/modules/konten/data.ts
  index e922866..c29bbb3 100644
  --- a/src/modules/konten/data.ts
  +++ b/src/modules/konten/data.ts
  @@ -11,7 +11,19 @@ import { MAKS_PATH } from './log404'
   import type { RedirectTersimpan } from './redirect'
   import { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
   import { susunFooter, susunHeader } from './tampilan'
  -import type { DataArtikel, DataFooter, DataHalaman, DataHeader, DataPenulis, DataRubrik, KartuArtikel, KelompokIstilah } from './tipe'
  +import { kartuVideo, MAKS_VIDEO_INDEKS, MAKS_VIDEO_LAIN, susunVideo } from './video'
  +import type {
  +  DataArtikel,
  +  DataFooter,
  +  DataHalaman,
  +  DataHeader,
  +  DataPenulis,
  +  DataRubrik,
  +  DataVideo,
  +  KartuArtikel,
  +  KartuVideo,
  +  KelompokIstilah,
  +} from './tipe'
   
   /**
    * Query Payload untuk halaman publik. Fungsi di sini menerima `payload` supaya bisa diuji integrasi;
  @@ -213,3 +225,43 @@ export async function ambilPenulis(payload: Payload, slug: string): Promise<Data
     if (!penulis) return null
     return susunPenulis(penulis, await kartuTerbit(payload, [{ penulis: { equals: penulis.id } }], MAKS_ARTIKEL_PENULIS))
   }
  +
  +/** Media video ikut membawa durasi file (cadangan bila editor tidak mengisi durasi). */
  +const POPULATE_VIDEO = { pilar: POPULATE_ARTIKEL.pilar, media: { ...POPULATE_ARTIKEL.media, durasi: true } } as const
  +
  +/** Kartu video terbit yang memenuhi `syarat`, terbaru dulu (video tidak punya tanggal terbit sendiri). */
  +async function kartuVideoTerbit(payload: Payload, syarat: Where[], jumlah: number): Promise<KartuVideo[]> {
  +  const { docs } = await payload.find({
  +    collection: 'video',
  +    where: { and: [terbit, ...syarat] },
  +    sort: '-createdAt',
  +    limit: jumlah,
  +    depth: 1,
  +    pagination: false,
  +    select: { judul: true, slug: true, durasiDetik: true, pilar: true, file: true, poster: true },
  +    populate: POPULATE_VIDEO,
  +  })
  +  return docs.map(kartuVideo).filter((k): k is KartuVideo => k !== null)
  +}
  +
  +/** Semua video terbit untuk `/video`. */
  +export async function ambilDaftarVideo(payload: Payload): Promise<KartuVideo[]> {
  +  return kartuVideoTerbit(payload, [], MAKS_VIDEO_INDEKS)
  +}
  +
  +/** Video terbit dengan slug ini, artikel induknya (yang `videoTerkait`-nya video ini), dan video lain. */
  +export async function ambilVideo(payload: Payload, slug: string): Promise<DataVideo | null> {
  +  if (validasiFormatSlug(slug) !== true) return null
  +  const { docs } = await payload.find({
  +    collection: 'video',
  +    where: { and: [{ slug: { equals: slug } }, terbit] },
  +    depth: 1,
  +    limit: 1,
  +    pagination: false,
  +    populate: POPULATE_VIDEO,
  +  })
  +  const doc = docs[0]
  +  if (!doc) return null
  +  const [induk] = await kartuTerbit(payload, [{ videoTerkait: { equals: doc.id } }], 1)
  +  return susunVideo(doc, induk ?? null, await kartuVideoTerbit(payload, [{ id: { not_equals: doc.id } }], MAKS_VIDEO_LAIN))
  +}
  ```

  ```diff
  diff --git a/src/modules/konten/cache.ts b/src/modules/konten/cache.ts
  index 9216fc0..af886b4 100644
  --- a/src/modules/konten/cache.ts
  +++ b/src/modules/konten/cache.ts
  @@ -7,6 +7,7 @@ import { ambilSitus } from '@/modules/seo/situs'
   
   import {
     ambilArtikel,
  +  ambilDaftarVideo,
     ambilFooter,
     ambilGlosarium,
     ambilHalaman,
  @@ -14,6 +15,7 @@ import {
     ambilPenulis,
     ambilRubrik,
     ambilTerbaru,
  +  ambilVideo,
     cariRedirect,
   } from './data'
   
  @@ -107,3 +109,15 @@ export const muatPenulis = unstable_cache(async (slug: string) => ambilPenulis(a
     tags: [TAG.koleksi('penulis'), TAG.koleksi('artikel'), TAG.koleksi('pilar'), TAG.media],
     revalidate: SEJAM,
   })
  +
  +/** Indeks `/video`: kartu memakai pilar (warna) dan media (poster). */
  +export const muatDaftarVideo = unstable_cache(async () => ambilDaftarVideo(await payload()), ['konten', 'daftar-video'], {
  +  tags: [TAG.koleksi('video'), TAG.koleksi('pilar'), TAG.media],
  +  revalidate: SEJAM,
  +})
  +
  +/** Halaman video memuat artikel induknya, jadi ikut dibuang saat artikel berubah. */
  +export const muatVideo = unstable_cache(async (slug: string) => ambilVideo(await payload(), slug), ['konten', 'video'], {
  +  tags: [TAG.koleksi('video'), TAG.koleksi('artikel'), TAG.koleksi('pilar'), TAG.media],
  +  revalidate: SEJAM,
  +})
  ```

  ```diff
  diff --git a/src/modules/konten/index.ts b/src/modules/konten/index.ts
  index 24594b7..b869a4c 100644
  --- a/src/modules/konten/index.ts
  +++ b/src/modules/konten/index.ts
  @@ -10,6 +10,7 @@
    */
   export {
     muatArtikel,
  +  muatDaftarVideo,
     muatFooter,
     muatGlosarium,
     muatHalaman,
  @@ -19,10 +20,12 @@ export {
     muatRubrik,
     muatSitus,
     muatTerbaru,
  +  muatVideo,
     TAG_ARTIKEL,
   } from './cache'
   export {
     ambilArtikel,
  +  ambilDaftarVideo,
     ambilFooter,
     ambilGlosarium,
     ambilHalaman,
  @@ -30,8 +33,10 @@ export {
     ambilPenulis,
     ambilRubrik,
     ambilTerbaru,
  +  ambilVideo,
     cariRedirect,
   } from './data'
  +export { kartuVideo, labelDurasi, MAKS_VIDEO_INDEKS, MAKS_VIDEO_LAIN, susunVideo } from './video'
   export { MAKS_ARTIKEL_PENULIS, susunPenulis } from './penulis'
   export { JUDUL_FAQ, susunHalaman } from './halaman'
   export { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
  ```

  `ambilEntriIndeks` dibuat umum untuk beberapa halaman indeks (Task 5 dan 7 menambah entrinya):

  ```diff
  diff --git a/src/modules/seo/data.ts b/src/modules/seo/data.ts
  index e3160a5..55ae716 100644
  --- a/src/modules/seo/data.ts
  +++ b/src/modules/seo/data.ts
  @@ -106,11 +106,12 @@ async function ambilEntriSubkategori(payload: Payload, situs: Pick<PengaturanSit
   }
   
   /**
  - * Halaman indeks tanpa dokumen sendiri ikut sitemap halaman bila ada isinya. `/glosarium`:
  - * `lastmod` = istilah terbaru (`diperbaruiBesar ?? terbitPada`), sama dengan aturan artikel.
  + * Halaman indeks tanpa dokumen sendiri ikut sitemap halaman bila ada isinya, dengan `lastmod` isi
  + * terbarunya: `/glosarium` (istilah, `diperbaruiBesar ?? terbitPada` seperti artikel) dan `/video`
  + * (`updatedAt` video, koleksi itu tidak punya tanggal terbit).
    */
   async function ambilEntriIndeks(payload: Payload, situs: Pick<PengaturanSitus, 'urlSitus'>): Promise<EntriSitemap[]> {
  -  const { docs } = await payload.find({
  +  const istilah = await payload.find({
       collection: 'artikel',
       where: { and: [syaratSitemap('artikel'), { tipe: { equals: 'glosarium' } }] },
       depth: 0,
  @@ -118,13 +119,21 @@ async function ambilEntriIndeks(payload: Payload, situs: Pick<PengaturanSitus, '
       pagination: false,
       select: { terbitPada: true, diperbaruiBesar: true },
     })
  -  if (docs.length === 0) return []
  -  return [
  -    {
  -      loc: new URL(PATH_INDEKS.glosarium, situs.urlSitus).toString(),
  -      lastmod: terbaru(docs.map((d) => d.diperbaruiBesar ?? d.terbitPada)),
  -    },
  +  const video = await payload.find({
  +    collection: 'video',
  +    where: syaratSitemap('video'),
  +    depth: 0,
  +    limit: MAKS_URL_SITEMAP,
  +    pagination: false,
  +    select: { updatedAt: true },
  +  })
  +  const indeks: [string, (string | null | undefined)[]][] = [
  +    [PATH_INDEKS.glosarium, istilah.docs.map((d) => d.diperbaruiBesar ?? d.terbitPada)],
  +    [PATH_INDEKS.video, video.docs.map((d) => d.updatedAt)],
     ]
  +  return indeks
  +    .filter(([, tanggal]) => tanggal.length > 0)
  +    .map(([path, tanggal]) => ({ loc: new URL(path, situs.urlSitus).toString(), lastmod: terbaru(tanggal) }))
   }
   
   /** Isi sitemap index: semua jenis, `lastmod` = entri terbaru jenis itu. Jenis kosong tetap dicantumkan. */
  ```

- [ ] **Langkah 4: Komponen dan rute**

  ```diff
  diff --git a/src/components/isi/VideoSemat.tsx b/src/components/isi/VideoSemat.tsx
  index af70190..76af63a 100644
  --- a/src/components/isi/VideoSemat.tsx
  +++ b/src/components/isi/VideoSemat.tsx
  @@ -1,18 +1,17 @@
   import { mediaTampil } from '@/modules/konten/artikel'
   import { paragrafTeks } from '@/modules/konten/isi'
  +import type { VideoUntukSemat } from '@/modules/konten/tipe'
   import { bangunUrl } from '@/modules/media/url'
  -import type { Video } from '@/payload-types'
   
   import gaya from './Isi.module.css'
   
  -type VideoUntukSemat = Pick<Video, 'judul' | 'file' | 'poster' | 'transkrip' | '_status'>
  -
   /**
    * Video vertikal di isi tanpa JavaScript: HLS untuk browser yang memutarnya langsung (Safari, Chrome
    * Android), MP4 cadangan untuk yang lain. Tidak dimuat sebelum diputar (`preload="none"`), dan
  - * transkrip selalu tersedia di bawahnya.
  + * transkrip selalu tersedia di bawahnya. `utama`: video adalah isi utama halaman `/video/{slug}`,
  + * jadi judulnya sudah menjadi H1 (tanpa keterangan) dan transkrip langsung terbuka.
    */
  -export function VideoSemat({ video, cloudName }: { video: number | VideoUntukSemat; cloudName: string }) {
  +export function VideoSemat({ video, cloudName, utama = false }: { video: number | VideoUntukSemat; cloudName: string; utama?: boolean }) {
     if (typeof video !== 'object' || video._status !== 'published') return null
     const file = mediaTampil(video.file)
     if (!file) return null
  @@ -22,12 +21,22 @@ export function VideoSemat({ video, cloudName }: { video: number | VideoUntukSem
       : bangunUrl(cloudName, file.publicId, 'poster', { lebar: 720 })
     return (
       <figure className={gaya.video}>
  -      <video controls playsInline preload="none" poster={urlPoster} width={file.width} height={file.height} aria-label={video.judul}>
  +      <video
  +        controls
  +        playsInline
  +        preload="none"
  +        poster={urlPoster}
  +        width={file.width}
  +        height={file.height}
  +        // Rasio dari ukuran file, bukan dari poster: ruang video tetap benar sebelum diputar (tanpa CLS).
  +        style={{ aspectRatio: `${file.width} / ${file.height}` }}
  +        aria-label={video.judul}
  +      >
           <source src={bangunUrl(cloudName, file.publicId, 'hls')} type="application/vnd.apple.mpegurl" />
           <source src={bangunUrl(cloudName, file.publicId, 'mp4')} type="video/mp4" />
         </video>
  -      <figcaption className={gaya.keterangan}>{video.judul}</figcaption>
  -      <details className={gaya.transkrip}>
  +      {!utama && <figcaption className={gaya.keterangan}>{video.judul}</figcaption>}
  +      <details className={gaya.transkrip} open={utama}>
           <summary>Baca transkrip</summary>
           {paragrafTeks(video.transkrip).map((teks, i) => (
             <p key={i}>{teks}</p>
  ```

  `src/components/video/Video.module.css`

  ```css
  /* Video vertikal 9:16: kartu (indeks, video lain, strip beranda) dan halaman video. */
  .daftar {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--ruang-6) var(--ruang-4);
    padding: 0;
    list-style: none;
  }

  .kartu {
    display: grid;
    align-content: start;
    gap: var(--ruang-3);
    text-decoration: none;
    transition: transform var(--durasi-cepat) var(--kurva);
  }

  .kartu:hover {
    transform: translateY(-2px);
  }

  .kartu:hover .judul {
    text-decoration: underline;
  }

  .kartu:active {
    transform: scale(0.99);
  }

  .poster {
    position: relative;
    display: block;
    aspect-ratio: 9 / 16;
    overflow: hidden;
    border-radius: 18px;
    background: var(--pilar, var(--permukaan));
  }

  .poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .putar {
    position: absolute;
    left: var(--ruang-3);
    bottom: var(--ruang-3);
    display: inline-flex;
    align-items: center;
    gap: var(--ruang-1);
    padding: var(--ruang-1) var(--ruang-3);
    border-radius: var(--radius-pil);
    background: var(--tombol);
    color: var(--tombol-teks);
    font-size: var(--teks-label);
    font-weight: 800;
    line-height: 1.6;
  }

  .judul {
    font-size: 17px;
    font-weight: 700;
    line-height: 1.25;
  }

  .halaman {
    display: grid;
    gap: var(--ruang-6);
    padding-top: var(--ruang-4);
  }

  .kepala {
    display: grid;
    gap: var(--ruang-4);
    max-width: 880px;
  }

  .kicker {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--ruang-3);
    font-size: var(--teks-kecil);
    font-weight: 600;
  }

  .kicker > * {
    display: inline-flex;
    align-items: center;
    gap: var(--ruang-1);
  }

  /* Video (dengan transkrip) dan tulisan penjelasannya: bertumpuk di HP, berdampingan mulai 1024px. */
  .utama {
    display: grid;
    gap: var(--ruang-8);
  }

  .penjelasan {
    display: grid;
    align-content: start;
    gap: var(--ruang-6);
  }

  .judulHalaman {
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

  .bagian {
    display: grid;
    gap: var(--ruang-6);
    margin-top: var(--ruang-6);
  }

  .subjudul {
    font-size: var(--teks-h2);
    font-stretch: var(--lebar-h2);
  }

  .induk {
    max-width: 480px;
  }

  .kosong {
    max-width: 60ch;
    padding: var(--ruang-6);
    border-radius: var(--radius-kartu);
    background: var(--permukaan);
  }

  @media (min-width: 48rem) {
    .daftar {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  @media (min-width: 64rem) {
    .utama {
      grid-template-columns: 360px minmax(0, 1fr);
      align-items: start;
      column-gap: var(--ruang-16);
    }
  }
  ```

  `src/components/video/KartuVideo.tsx`

  ```tsx
  import Image from 'next/image'

  import { Ikon } from '@/components/dasar/Ikon'
  import { Tautan } from '@/components/dasar/Tautan'
  import { labelDurasi } from '@/modules/konten/video'
  import type { KartuVideo as DataKartu } from '@/modules/konten/tipe'
  import { propsGambar } from '@/modules/media/props'

  import gaya from './Video.module.css'

  /** Lebar kartu video di grid: dua kolom di HP, empat kolom mulai tablet. */
  const UKURAN_KARTU = '(min-width: 48rem) 280px, 50vw'

  /**
   * Kartu video vertikal 9:16 (mockup "Intinya dalam 45 detik"): poster, judul, dan durasi. Tanpa
   * poster, kotak berwarna pilar menggantikannya.
   */
  export function KartuVideo({ video, cloudName, tingkat = 'h3' }: { video: DataKartu; cloudName: string; tingkat?: 'h2' | 'h3' }) {
    const Judul = tingkat
    const poster = propsGambar(video.poster, 'asli', { cloudName, lebar: 480 })
    return (
      <Tautan href={video.href} className={gaya.kartu} data-warna={video.pilar?.warna}>
        <span className={gaya.poster}>
          {poster && <Image {...poster} alt="" sizes={UKURAN_KARTU} />}
          <span className={gaya.putar}>
            <Ikon nama="play" ukuran={18} />
            {video.durasi ? labelDurasi(video.durasi) : 'Putar'}
          </span>
        </span>
        <Judul className={gaya.judul}>{video.judul}</Judul>
      </Tautan>
    )
  }

  export function DaftarVideo({ video, cloudName, tingkat }: { video: DataKartu[]; cloudName: string; tingkat?: 'h2' | 'h3' }) {
    return (
      <ul className={gaya.daftar}>
        {video.map((v) => (
          <li key={v.id} data-masuk="">
            <KartuVideo video={v} cloudName={cloudName} tingkat={tingkat} />
          </li>
        ))}
      </ul>
    )
  }
  ```

  `src/components/video/HalamanVideo.tsx`

  ```tsx
  import { ChipPilar } from '@/components/dasar/ChipPilar'
  import { Ikon } from '@/components/dasar/Ikon'
  import { JsonLd } from '@/components/dasar/JsonLd'
  import { RemahRoti } from '@/components/dasar/RemahRoti'
  import { VideoSemat } from '@/components/isi/VideoSemat'
  import { KartuArtikel } from '@/components/kartu/KartuArtikel'
  import type { DataVideo, KartuVideo } from '@/modules/konten/tipe'
  import { labelDurasi } from '@/modules/konten/video'
  import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
  import type { MasukanSeo, Situs } from '@/modules/seo/tipe'

  import { DaftarVideo } from './KartuVideo'
  import gaya from './Video.module.css'

  export const JUDUL_VIDEO = 'Video'
  export const DESKRIPSI_VIDEO = 'Intinya dalam 45 detik: video vertikal singkat, lengkap dengan transkrip dan tulisan penjelasannya.'

  /** Indeks `/video`: semua video terbit, terbaru dulu. */
  export function IndeksVideo({ video, masukan, situs }: { video: KartuVideo[]; masukan: MasukanSeo; situs: Situs }) {
    return (
      <div className={`kontainer ${gaya.halaman}`}>
        <JsonLd data={jsonLd(masukan, situs)} />
        <header className={gaya.kepala}>
          <RemahRoti remah={remahRoti(masukan)} />
          <h1 className={gaya.judulHalaman}>{JUDUL_VIDEO}</h1>
          <p className={gaya.deck}>{DESKRIPSI_VIDEO}</p>
        </header>
        {video.length > 0 ? (
          <DaftarVideo video={video} cloudName={situs.cloudName} tingkat="h2" />
        ) : (
          <p className={gaya.kosong}>Belum ada video. Video baru tampil di sini setelah terbit.</p>
        )}
      </div>
    )
  }

  /**
   * Halaman `/video/{slug}`: video diputar tanpa JavaScript tambahan (`VideoSemat`) dengan transkrip
   * terbuka, tulisan penjelasannya bila ada (di samping video mulai 1024px), lalu video lain. JSON-LD
   * VideoObject dari modul SEO.
   */
  export function HalamanVideo({ video, situs }: { video: DataVideo; situs: Situs }) {
    const masukan = { jenis: 'video', doc: video.seo } as const
    return (
      <article className={`kontainer ${gaya.halaman}`}>
        <JsonLd data={jsonLd(masukan, situs)} />
        <header className={gaya.kepala}>
          <RemahRoti remah={remahRoti(masukan)} />
          <p className={gaya.kicker}>
            {video.pilar && <ChipPilar pilar={video.pilar} />}
            {video.durasi && (
              <span>
                <Ikon nama="clock" ukuran={18} /> {labelDurasi(video.durasi)}
              </span>
            )}
          </p>
          <h1 className={gaya.judulHalaman}>{video.judul}</h1>
        </header>
        <div className={gaya.utama}>
          <VideoSemat video={video.semat} cloudName={situs.cloudName} utama />
          {video.induk && (
            <section aria-labelledby="penjelasan" className={gaya.penjelasan}>
              <h2 id="penjelasan" className={gaya.subjudul}>
                Baca penjelasan lengkap
              </h2>
              <div className={gaya.induk}>
                <KartuArtikel kartu={video.induk} />
              </div>
            </section>
          )}
        </div>
        {video.lain.length > 0 && (
          <section aria-labelledby="video-lain" className={gaya.bagian}>
            <h2 id="video-lain" className={gaya.subjudul}>
              Video lain
            </h2>
            <DaftarVideo video={video.lain} cloudName={situs.cloudName} />
          </section>
        )}
      </article>
    )
  }
  ```

  `src/app/(frontend)/video/page.tsx`

  ```tsx
  import type { Metadata } from 'next'

  import { DESKRIPSI_VIDEO, IndeksVideo, JUDUL_VIDEO } from '@/components/video/HalamanVideo'
  import { PATH_INDEKS } from '@/lib/paths'
  import { muatDaftarVideo, muatSitus } from '@/modules/konten'
  import { metadata, type MasukanSeo } from '@/modules/seo'

  const masukan: MasukanSeo = { jenis: 'statis', judul: JUDUL_VIDEO, path: PATH_INDEKS.video, deskripsi: DESKRIPSI_VIDEO }

  export async function generateMetadata(): Promise<Metadata> {
    return metadata(masukan, await muatSitus())
  }

  export default async function Video() {
    const [video, situs] = await Promise.all([muatDaftarVideo(), muatSitus()])
    return <IndeksVideo video={video} masukan={masukan} situs={situs} />
  }
  ```

  `src/app/(frontend)/video/[slug]/page.tsx`

  ```tsx
  import type { Metadata } from 'next'
  import { cache } from 'react'

  import { HalamanVideo } from '@/components/video/HalamanVideo'
  import { pathFor } from '@/lib/paths'
  import { muatSitus, muatVideo, tanganiTidakAda } from '@/modules/konten'
  import { metadata, metadataTidakDitemukan } from '@/modules/seo'

  type Props = { params: Promise<{ slug: string }> }

  /** `/video/{slug}`: satu video (ISR). */
  export function generateStaticParams() {
    return []
  }

  const cari = cache(async (slug: string) => muatVideo(slug))

  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const video = await cari((await params).slug)
    if (!video) return metadataTidakDitemukan(await muatSitus())
    return metadata({ jenis: 'video', doc: video.seo }, await muatSitus())
  }

  export default async function Video({ params }: Props) {
    const { slug } = await params
    const video = await cari(slug)
    if (!video) return tanganiTidakAda(pathFor({ jenis: 'video', slug }))
    return <HalamanVideo video={video} situs={await muatSitus()} />
  }
  ```

- [ ] **Langkah 5: Jalankan tes unit dan integrasi**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 39 passed (39)`, `Tests 265 passed (265)`; integrasi `Test Files 21 passed (21)`, `Tests 66 passed (66)`.

- [ ] **Langkah 6: Video contoh dan tes E2E**

  File MP4 contoh sama dengan `videoMp4()` di `tests/int/fixtures.ts`; klien palsu `e2e` menyimpannya sebagai video 1080x1920, 30 detik.

  ```diff
  diff --git a/tests/e2e/data.ts b/tests/e2e/data.ts
  index a0af0ed..ec2de13 100644
  --- a/tests/e2e/data.ts
  +++ b/tests/e2e/data.ts
  @@ -23,6 +23,9 @@ export const SLUG_SUB = { pajak: 'pajak' } as const
   /** Halaman statis dari seed yang diterbitkan `siapkan.ts`; halaman seed lain tetap draf. */
   export const SLUG_HALAMAN = { tentang: 'tentang', kebijakanRedaksi: 'kebijakan-redaksi', draf: 'pasang-iklan' } as const
   
  +/** Video contoh: dua terbit (PPh 21 lebih dulu dibuat), satu draf. */
  +export const SLUG_VIDEO = { pph21: 'pph-21-satu-slip-gaji', otp: 'kode-otp-jangan-dibagikan', draf: 'video-draf' } as const
  +
   export const JUDUL_PANDUAN = 'Cara hitung gaji bersih setelah PPh 21 dan BPJS'
   
   // Pembuat JSON Lexical minimal (bentuk yang disimpan Payload 3.92).
  ```

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index 2081985..9a46418 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -7,7 +7,7 @@ import type { Halaman } from '@/payload-types'
   import { klienPalsu } from '@/modules/media/palsu'
   import { seed } from '@/seed/seed'
   
  -import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, p, SLUG, SLUG_HALAMAN, SLUG_SUB, tautanKe } from './data'
  +import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, p, SLUG, SLUG_HALAMAN, SLUG_SUB, SLUG_VIDEO, tautanKe } from './data'
   
   /**
    * Mengisi database E2E sebelum server dibangun dan dinyalakan (`webServer` di playwright.config.ts).
  @@ -17,7 +17,7 @@ import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, p, SLUG, SLUG_HALAMAN,
   pakaiKlien(klienPalsu('e2e'))
   const payload = await getPayload({ config })
   
  -for (const koleksi of ['artikel', 'subkategori', 'redirect', 'log-404', 'media'] as const) {
  +for (const koleksi of ['artikel', 'video', 'subkategori', 'redirect', 'log-404', 'media'] as const) {
     await payload.delete({ collection: koleksi, where: { id: { exists: true } } })
   }
   await seed(payload, { emailAdmin: ADMIN_E2E.email, passwordAdmin: ADMIN_E2E.password })
  @@ -57,6 +57,34 @@ await payload.update({
   
   const dasar = { _status: 'published' as const, penulis: redaksi.id, gambarUtama: slip.id }
   
  +// Video vertikal: file MP4 kecil lewat klien palsu (1080x1920, 30 detik). Tanpa poster unggahan,
  +// kartu memakai frame video dari Cloudinary.
  +async function buatVideo({ pilar: slugPilar, draf = false, ...data }: { judul: string; slug: string; pilar: string; durasiDetik: number; transkrip: string; draf?: boolean }) {
  +  const isiMp4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.from([0, 0, 2, 0]), Buffer.from('isommp41'), Buffer.from([0, 0, 0, 8]), Buffer.from('free')])
  +  const file = await payload.create({ collection: 'media', data: {}, file: { data: isiMp4, mimetype: 'video/mp4', name: `${data.slug}.mp4`, size: isiMp4.length } })
  +  return payload.create({
  +    collection: 'video',
  +    draft: draf,
  +    data: { ...data, _status: draf ? 'draft' : 'published', pilar: pilar[slugPilar], file: file.id },
  +  })
  +}
  +
  +const videoPph21 = await buatVideo({
  +  judul: 'PPh 21 dijelaskan dengan satu slip gaji',
  +  slug: SLUG_VIDEO.pph21,
  +  pilar: 'uang-karier',
  +  durasiDetik: 45,
  +  transkrip: 'Ambil slip gaji bulan lalu.\n\nCari baris PPh 21 di slip gajimu. Angka itu dipotong setiap bulan memakai tarif efektif.',
  +})
  +await buatVideo({
  +  judul: 'Kenapa kode OTP tidak boleh dibagikan',
  +  slug: SLUG_VIDEO.otp,
  +  pilar: 'tekno',
  +  durasiDetik: 38,
  +  transkrip: 'Kode OTP adalah kunci terakhir akunmu.\n\nPetugas resmi tidak pernah memintanya.',
  +})
  +await buatVideo({ judul: 'Video yang belum terbit', slug: SLUG_VIDEO.draf, pilar: 'sehat', durasiDetik: 30, transkrip: 'Draf.', draf: true })
  +
   const explainer = await payload.create({
     collection: 'artikel',
     data: {
  @@ -114,6 +142,7 @@ const panduan = await payload.create({
         { judul: 'BPJS Ketenagakerjaan', url: 'https://www.bpjsketenagakerjaan.go.id/', penerbit: 'BPJS Ketenagakerjaan' },
       ],
       artikelTerkait: [explainer.id],
  +    videoTerkait: videoPph21.id,
     },
   })
   
  ```

  `tests/e2e/video.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  import { SLUG, SLUG_VIDEO, UKURAN_LAYAR } from './data'

  test.beforeEach(async ({ page }) => {
    await cegatCloudinary(page)
  })

  test('indeks video: kartu 9:16 terbaru dulu, draf tidak tampil', async ({ page }) => {
    await page.goto('/video')
    await expect(page).toHaveTitle('Video · point.')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Video')
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Kenapa kode OTP tidak boleh dibagikan', 'PPh 21 dijelaskan dengan satu slip gaji'])
    const kartu = page.getByRole('link', { name: /Kenapa kode OTP/ })
    await expect(kartu).toHaveAttribute('href', `/video/${SLUG_VIDEO.otp}`)
    await expect(kartu).toContainText('38 detik')
    const poster = await kartu.locator('img').boundingBox()
    expect(Math.round((poster!.height / poster!.width) * 9)).toBe(16)
  })

  test('halaman video: pemutar, transkrip terbuka, penjelasan lengkap, dan video lain', async ({ page, request }) => {
    await page.goto('/video')
    await page.getByRole('link', { name: /PPh 21 dijelaskan dengan satu slip gaji/ }).click()
    await expect(page).toHaveURL(`/video/${SLUG_VIDEO.pph21}`)
    await expect(page.getByRole('navigation', { name: 'Remah roti' }).getByRole('link')).toHaveText(['Beranda', 'Video'])
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('PPh 21 dijelaskan dengan satu slip gaji')
    const pemutar = page.locator('video[aria-label="PPh 21 dijelaskan dengan satu slip gaji"]')
    await expect(pemutar).toHaveAttribute('preload', 'none')
    // Poster tes berukuran 16:9, tetapi ruang pemutar mengikuti rasio file video (9:16).
    const kotak = await pemutar.boundingBox()
    expect(Math.round((kotak!.height / kotak!.width) * 9)).toBe(16)
    await expect(page.getByText('Cari baris PPh 21 di slip gajimu.')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Baca penjelasan lengkap' }).getByRole('link')).toHaveAttribute('href', `/${SLUG.panduan}`)
    await expect(page.getByRole('region', { name: 'Video lain' }).getByRole('link')).toHaveAttribute('href', `/video/${SLUG_VIDEO.otp}`)
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent()
    expect(jsonLd).toContain('"@type":"VideoObject"')
    expect((await request.get(`/video/${SLUG_VIDEO.draf}`)).status()).toBe(404)
  })

  for (const { lebar, tinggi } of UKURAN_LAYAR) {
    test(`video ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: tinggi })
      for (const path of ['/video', `/video/${SLUG_VIDEO.pph21}`]) {
        await page.goto(path)
        await periksaTanpaGeserHorizontal(page)
        await periksaAxe(page)
      }
    })
  }
  ```

  Jalankan:

  ```bash
  npm run test:e2e
  ```

  Hasil yang diharapkan: `52 passed`. `/video` menampilkan dua kartu 9:16 (OTP lebih dulu), `/video/pph-21-satu-slip-gaji` punya pemutar 9:16 walau poster tesnya 16:9, transkrip terbuka, penjelasan ke panduan, dan video lain; video draf menjawab 404.

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/lib/paths.ts src/modules/konten src/modules/seo/data.ts src/components/isi/VideoSemat.tsx src/components/video "src/app/(frontend)/video" tests/unit/video.test.ts tests/int/video.int.spec.ts tests/int/sitemap.int.spec.ts tests/e2e
  git commit -m "feat(ui): indeks dan halaman video, /video di sitemap halaman"
  ```

### Task 5: Indeks tools per pilar, `/tools` di sitemap halaman

**Files:**
- Create: `src/modules/konten/tools.ts`, `src/components/tools/IndeksTools.tsx`, `src/components/tools/Tools.module.css`, `src/app/(frontend)/tools/page.tsx`
- Modify: `src/lib/paths.ts`, `src/modules/konten/tipe.ts`, `src/modules/konten/data.ts`, `src/modules/konten/cache.ts`, `src/modules/konten/index.ts`, `src/modules/konten/tampilan.ts`, `src/modules/seo/data.ts`, `tests/int/sitemap.int.spec.ts`, `tests/e2e/siapkan.ts`
- Test: `tests/unit/tools.test.ts`, `tests/int/tools-indeks.int.spec.ts`, `tests/e2e/tools.spec.ts`

**Interfaces:**
- Consumes: `pilarRingkas`, `POPULATE_ARTIKEL` (Rencana 4A), `ambilEntriIndeks` (Task 4), `Ikon`, `Tautan`, `RemahRoti`, `JsonLd`.
- Produces:
  - `src/lib/paths.ts`: `PATH_INDEKS.tools = '/tools'` (dipakai `pathFor` tools dan `TOOLS_BAWAAN`).
  - `src/modules/konten/tipe.ts`: `ItemTools = { id; nama; href; ringkasan }`, `KelompokTools = { pilar: PilarRingkas; tools: ItemTools[] }`.
  - `src/modules/konten/tools.ts`: `itemTools(doc)`, `kelompokkanTools(docs)`.
  - `ambilTools(payload): KelompokTools[]`, `muatTools()` (tag `tools`, `pilar`). Beranda (Task 7) meratakan kelompok ini untuk kotak "Hitung sendiri".
  - Komponen `IndeksTools({ kelompok, masukan, situs })`, `JUDUL_TOOLS`, `DESKRIPSI_TOOLS`; rute `/tools` (statis, dirender saat build lalu ISR).
  - Sitemap `halaman.xml` memuat `/tools` bila ada tools terbit.
  - E2E: tools Gaji Bersih dan THR (Uang & Karier), BMI & Kalori (Sehat) terbit, IPK draf.

Tombol Tools di header (Rencana 4A) menunjuk `/tools` dan sampai sekarang menjawab 404. Indeks ini menampilkan kalkulator terbit dikelompokkan per pilar dengan urutan pilar dari CMS (sama dengan menu header), di dalamnya urut nama. Setiap kartu (garis 2 px, seperti kotak "Hitung sendiri" di mockup) berisi ikon kalkulator, nama sebagai H3, ringkasan, dan ajakan "Hitung {nama}". Kartu menautkan `/tools/{slug}`, halaman kalkulator yang dibangun Rencana 5; tools baru diterbitkan setelah halamannya ada (lihat Risiko). Tanpa tools terbit, halaman menampilkan pesan kosong.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/tools.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it } from 'vitest'

  import { IndeksTools } from '@/components/tools/IndeksTools'
  import { kelompokkanTools } from '@/modules/konten/tools'
  import type { Pilar } from '@/payload-types'

  import { situs } from './seo-contoh'

  const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
  const uang: Pilar = { id: 1, nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau', deskripsi: 'Uang.', urutan: 1, ...waktu }
  const sehat: Pilar = { id: 4, nama: 'Sehat', slug: 'sehat', warna: 'koral', deskripsi: 'Sehat.', urutan: 4, ...waktu }

  const tool = (id: number, nama: string, slug: string | null, pilar: Pilar | number) => ({ id, nama, slug, ringkasan: `Hitung ${nama}.`, pilar })

  describe('kelompokkanTools', () => {
    it('per pilar sesuai urutan pilar, di dalamnya urut nama; tanpa slug atau pilar dilewati', () => {
      const kelompok = kelompokkanTools([
        tool(1, 'BMI & Kalori', 'bmi-kalori', sehat),
        tool(2, 'THR', 'thr', uang),
        tool(3, 'Gaji Bersih', 'gaji-bersih', uang),
        tool(4, 'Tanpa slug', null, uang),
        tool(5, 'Pilar belum dimuat', 'ipk', 9),
      ])
      expect(kelompok.map((k) => [k.pilar.nama, k.tools.map((t) => t.nama)])).toEqual([
        ['Uang & Karier', ['Gaji Bersih', 'THR']],
        ['Sehat', ['BMI & Kalori']],
      ])
      expect(kelompok[0].tools[0]).toEqual({ id: 3, nama: 'Gaji Bersih', href: '/tools/gaji-bersih', ringkasan: 'Hitung Gaji Bersih.' })
    })
  })

  describe('IndeksTools', () => {
    const masukan = { jenis: 'statis', judul: 'Tools', path: '/tools' } as const

    it('H2 per pilar dengan titik warna, kartu H3 dengan ajakan menyebut hasilnya', () => {
      const html = renderToStaticMarkup(h(IndeksTools, { kelompok: kelompokkanTools([tool(3, 'Gaji Bersih', 'gaji-bersih', uang)]), masukan, situs }))
      expect(html).toMatch(/<h1 class="[^"]*">Tools<\/h1>/)
      expect(html).toMatch(/<h2 id="tools-uang-karier" class="[^"]*"><span class="[^"]*" data-warna="hijau" aria-hidden="true"><\/span>Uang &amp; Karier<\/h2>/)
      expect(html).toMatch(/<a class="[^"]*" href="\/tools\/gaji-bersih">/)
      expect(html).toMatch(/<h3 class="[^"]*">Gaji Bersih<\/h3>/)
      expect(html).toContain('Hitung Gaji Bersih')
    })

    it('pesan kosong bila belum ada kalkulator terbit', () => {
      const html = renderToStaticMarkup(h(IndeksTools, { kelompok: [], masukan, situs }))
      expect(html).toContain('Belum ada kalkulator yang terbit. Kalkulator baru tampil di sini setelah terbit.')
    })
  })
  ```

  `tests/int/tools-indeks.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { ambilTools } from '@/modules/konten/data'

  import { getTestPayload, unik } from './helpers'

  describe('ambilTools', () => {
    it('hanya tools terbit, dikelompokkan per pilar', async () => {
      const payload = await getTestPayload()
      const pilar = await payload.create({ collection: 'pilar', data: { nama: unik('Uang'), warna: 'hijau', deskripsi: 'Uang.' } })
      // `toolId` unik: sisa tes sebelumnya dibersihkan dulu, dan tools dihapus di akhir tes.
      await payload.delete({ collection: 'tools', where: { toolId: { in: ['dana-darurat', 'cicilan-kpr'] } } })
      const terbit = await payload.create({
        collection: 'tools',
        data: { _status: 'published', nama: unik('Dana Darurat'), toolId: 'dana-darurat', pilar: pilar.id, ringkasan: 'Hitung dana darurat.' },
      })
      const draf = await payload.create({
        collection: 'tools',
        draft: true,
        data: { _status: 'draft', nama: unik('Cicilan'), toolId: 'cicilan-kpr', pilar: pilar.id, ringkasan: 'Hitung cicilan.' },
      })

      const kelompok = (await ambilTools(payload)).find((k) => k.pilar.slug === pilar.slug)
      expect(kelompok?.tools.map((t) => t.href)).toEqual([`/tools/${terbit.slug}`])
      await payload.delete({ collection: 'tools', where: { id: { in: [terbit.id, draf.id] } } })
    })
  })
  ```

  ```diff
  diff --git a/tests/int/sitemap.int.spec.ts b/tests/int/sitemap.int.spec.ts
  index 92dae86..0683db3 100644
  --- a/tests/int/sitemap.int.spec.ts
  +++ b/tests/int/sitemap.int.spec.ts
  @@ -84,6 +84,19 @@ describe('data rute teknis dari Payload', () => {
       expect(entri?.lastmod).toBe(terbaru([istilah.terbitPada]))
     })
   
  +  it('sitemap halaman memuat indeks /tools bila ada kalkulator terbit', async () => {
  +    const payload = await getTestPayload()
  +    const pilar = await payload.create({ collection: 'pilar', data: { nama: unik('Sehat'), warna: 'koral', deskripsi: 'Sehat.' } })
  +    await payload.delete({ collection: 'tools', where: { toolId: { equals: 'bmi-kalori' } } })
  +    const tool = await payload.create({
  +      collection: 'tools',
  +      data: { _status: 'published', nama: unik('BMI'), toolId: 'bmi-kalori', pilar: pilar.id, ringkasan: 'Hitung BMI.' },
  +    })
  +    const entri = (await ambilEntriSitemap(payload, 'halaman', situs)).find((e) => e.loc === url('/tools'))
  +    expect(entri?.lastmod).toBeTruthy()
  +    await payload.delete({ collection: 'tools', id: tool.id })
  +  })
  +
     it('sitemap halaman memuat indeks /video dengan lastmod video terbaru', async () => {
       const payload = await getTestPayload()
       const relasi = await siapkanRelasiArtikel(payload)
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/tools.test.ts` dengan `Cannot find package '@/components/tools/IndeksTools'`.

- [ ] **Langkah 3: Path indeks, data tools, dan sitemap**

  ```diff
  diff --git a/src/lib/paths.ts b/src/lib/paths.ts
  index dd54331..2f3a333 100644
  --- a/src/lib/paths.ts
  +++ b/src/lib/paths.ts
  @@ -6,7 +6,7 @@ export type TargetPath =
     | { jenis: 'pilar' | 'tools' | 'video' | 'penulis' | 'halaman'; slug: string }
   
   /** Halaman indeks yang tidak mewakili satu dokumen. */
  -export const PATH_INDEKS = { glosarium: '/glosarium', video: '/video' } as const
  +export const PATH_INDEKS = { glosarium: '/glosarium', tools: '/tools', video: '/video' } as const
   
   /** Satu-satunya tempat path publik dirangkai. Dipakai redirect, SEO, sitemap, dan indexer. */
   export function pathFor(target: TargetPath): string {
  @@ -16,7 +16,7 @@ export function pathFor(target: TargetPath): string {
       case 'subkategori':
         return `/${target.pilarSlug}/${target.slug}`
       case 'tools':
  -      return `/tools/${target.slug}`
  +      return `${PATH_INDEKS.tools}/${target.slug}`
       case 'video':
         return `${PATH_INDEKS.video}/${target.slug}`
       case 'penulis':
  ```

  ```diff
  diff --git a/src/modules/konten/tampilan.ts b/src/modules/konten/tampilan.ts
  index 7ca2d07..9b9dbc4 100644
  --- a/src/modules/konten/tampilan.ts
  +++ b/src/modules/konten/tampilan.ts
  @@ -1,9 +1,9 @@
   import type { Footer, Header } from '@/payload-types'
  -import { pathFor } from '@/lib/paths'
  +import { PATH_INDEKS, pathFor } from '@/lib/paths'
   
   import type { DataFooter, DataHeader, ItemMenu, Tautan } from './tipe'
   
  -export const TOOLS_BAWAAN: Tautan = { label: 'Tools', href: '/tools' }
  +export const TOOLS_BAWAAN: Tautan = { label: 'Tools', href: PATH_INDEKS.tools }
   export const HAK_CIPTA_BAWAAN = '© 2026 point.lat'
   
   /** Nama platform sosial seperti ditulis pemiliknya. */
  ```

  ```diff
  diff --git a/src/modules/konten/tipe.ts b/src/modules/konten/tipe.ts
  index 784b54c..1ba2353 100644
  --- a/src/modules/konten/tipe.ts
  +++ b/src/modules/konten/tipe.ts
  @@ -119,3 +119,9 @@ export type VideoUntukSemat = Pick<Video, 'judul' | 'file' | 'poster' | 'transkr
   
   /** Halaman `/video/{slug}`: video, artikel induknya (yang `videoTerkait`-nya video ini), dan video lain. */
   export type DataVideo = KartuVideo & { semat: VideoUntukSemat; induk: KartuArtikel | null; lain: KartuVideo[]; seo: VideoSeo }
  +
  +/** Satu kalkulator di indeks `/tools` dan kotak "Hitung sendiri" beranda. */
  +export type ItemTools = { id: number; nama: string; href: string; ringkasan: string }
  +
  +/** Kalkulator per pilar di `/tools`, urut sesuai urutan pilar di CMS. */
  +export type KelompokTools = { pilar: PilarRingkas; tools: ItemTools[] }
  ```

  `src/modules/konten/tools.ts`

  ```ts
  import type { Pilar, Tool } from '@/payload-types'
  import { pathFor } from '@/lib/paths'

  import { pilarRingkas } from './artikel'
  import type { ItemTools, KelompokTools } from './tipe'

  type ToolsUntukIndeks = Pick<Tool, 'id' | 'nama' | 'slug' | 'ringkasan' | 'pilar'>

  /** Tools terbit yang punya slug, sebagai tautan ke kalkulatornya (`/tools/{slug}`, Rencana 5). */
  export function itemTools(doc: ToolsUntukIndeks): ItemTools | null {
    if (!doc.slug) return null
    return { id: doc.id, nama: doc.nama, href: pathFor({ jenis: 'tools', slug: doc.slug }), ringkasan: doc.ringkasan }
  }

  const urutanPilar = (relasi: ToolsUntukIndeks['pilar']) => (typeof relasi === 'object' ? (relasi.urutan ?? 0) : 0)

  /**
   * Indeks `/tools`: tools dikelompokkan per pilar dengan urutan pilar dari CMS (sama dengan menu
   * header), dan di dalamnya urut nama. Tools yang pilarnya belum dimuat dilewati.
   */
  export function kelompokkanTools(docs: ToolsUntukIndeks[]): KelompokTools[] {
    const kelompok = new Map<string, { urutan: number; pilar: NonNullable<ReturnType<typeof pilarRingkas>>; tools: ItemTools[] }>()
    for (const doc of docs) {
      const pilar = pilarRingkas(doc.pilar as Pilar | number)
      const item = itemTools(doc)
      if (!pilar || !item) continue
      const ada = kelompok.get(pilar.slug) ?? { urutan: urutanPilar(doc.pilar), pilar, tools: [] }
      ada.tools.push(item)
      kelompok.set(pilar.slug, ada)
    }
    return [...kelompok.values()]
      .sort((a, b) => a.urutan - b.urutan || a.pilar.nama.localeCompare(b.pilar.nama, 'id'))
      .map(({ pilar, tools }) => ({ pilar, tools: tools.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' })) }))
  }
  ```

  ```diff
  diff --git a/src/modules/konten/data.ts b/src/modules/konten/data.ts
  index c29bbb3..6f53e3d 100644
  --- a/src/modules/konten/data.ts
  +++ b/src/modules/konten/data.ts
  @@ -11,6 +11,7 @@ import { MAKS_PATH } from './log404'
   import type { RedirectTersimpan } from './redirect'
   import { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
   import { susunFooter, susunHeader } from './tampilan'
  +import { kelompokkanTools } from './tools'
   import { kartuVideo, MAKS_VIDEO_INDEKS, MAKS_VIDEO_LAIN, susunVideo } from './video'
   import type {
     DataArtikel,
  @@ -23,6 +24,7 @@ import type {
     KartuArtikel,
     KartuVideo,
     KelompokIstilah,
  +  KelompokTools,
   } from './tipe'
   
   /**
  @@ -265,3 +267,17 @@ export async function ambilVideo(payload: Payload, slug: string): Promise<DataVi
     const [induk] = await kartuTerbit(payload, [{ videoTerkait: { equals: doc.id } }], 1)
     return susunVideo(doc, induk ?? null, await kartuVideoTerbit(payload, [{ id: { not_equals: doc.id } }], MAKS_VIDEO_LAIN))
   }
  +
  +/** Semua tools terbit untuk `/tools`, dikelompokkan per pilar. */
  +export async function ambilTools(payload: Payload): Promise<KelompokTools[]> {
  +  const { docs } = await payload.find({
  +    collection: 'tools',
  +    where: terbit,
  +    depth: 1,
  +    limit: 100,
  +    pagination: false,
  +    select: { nama: true, slug: true, ringkasan: true, pilar: true },
  +    populate: { pilar: { ...POPULATE_ARTIKEL.pilar, urutan: true } },
  +  })
  +  return kelompokkanTools(docs)
  +}
  ```

  ```diff
  diff --git a/src/modules/konten/cache.ts b/src/modules/konten/cache.ts
  index af886b4..dcb0e26 100644
  --- a/src/modules/konten/cache.ts
  +++ b/src/modules/konten/cache.ts
  @@ -15,6 +15,7 @@ import {
     ambilPenulis,
     ambilRubrik,
     ambilTerbaru,
  +  ambilTools,
     ambilVideo,
     cariRedirect,
   } from './data'
  @@ -121,3 +122,9 @@ export const muatVideo = unstable_cache(async (slug: string) => ambilVideo(await
     tags: [TAG.koleksi('video'), TAG.koleksi('artikel'), TAG.koleksi('pilar'), TAG.media],
     revalidate: SEJAM,
   })
  +
  +/** Indeks `/tools`: nama, ringkasan, dan pilar (nama, warna, urutan) setiap kalkulator terbit. */
  +export const muatTools = unstable_cache(async () => ambilTools(await payload()), ['konten', 'tools'], {
  +  tags: [TAG.koleksi('tools'), TAG.koleksi('pilar')],
  +  revalidate: SEJAM,
  +})
  ```

  ```diff
  diff --git a/src/modules/konten/index.ts b/src/modules/konten/index.ts
  index b869a4c..534da9b 100644
  --- a/src/modules/konten/index.ts
  +++ b/src/modules/konten/index.ts
  @@ -20,6 +20,7 @@ export {
     muatRubrik,
     muatSitus,
     muatTerbaru,
  +  muatTools,
     muatVideo,
     TAG_ARTIKEL,
   } from './cache'
  @@ -33,9 +34,11 @@ export {
     ambilPenulis,
     ambilRubrik,
     ambilTerbaru,
  +  ambilTools,
     ambilVideo,
     cariRedirect,
   } from './data'
  +export { itemTools, kelompokkanTools } from './tools'
   export { kartuVideo, labelDurasi, MAKS_VIDEO_INDEKS, MAKS_VIDEO_LAIN, susunVideo } from './video'
   export { MAKS_ARTIKEL_PENULIS, susunPenulis } from './penulis'
   export { JUDUL_FAQ, susunHalaman } from './halaman'
  ```

  ```diff
  diff --git a/src/modules/seo/data.ts b/src/modules/seo/data.ts
  index 55ae716..5262da5 100644
  --- a/src/modules/seo/data.ts
  +++ b/src/modules/seo/data.ts
  @@ -107,8 +107,8 @@ async function ambilEntriSubkategori(payload: Payload, situs: Pick<PengaturanSit
   
   /**
    * Halaman indeks tanpa dokumen sendiri ikut sitemap halaman bila ada isinya, dengan `lastmod` isi
  - * terbarunya: `/glosarium` (istilah, `diperbaruiBesar ?? terbitPada` seperti artikel) dan `/video`
  - * (`updatedAt` video, koleksi itu tidak punya tanggal terbit).
  + * terbarunya: `/glosarium` (istilah, `diperbaruiBesar ?? terbitPada` seperti artikel), `/tools` dan
  + * `/video` (`updatedAt`, koleksi itu tidak punya tanggal terbit).
    */
   async function ambilEntriIndeks(payload: Payload, situs: Pick<PengaturanSitus, 'urlSitus'>): Promise<EntriSitemap[]> {
     const istilah = await payload.find({
  @@ -119,6 +119,14 @@ async function ambilEntriIndeks(payload: Payload, situs: Pick<PengaturanSitus, '
       pagination: false,
       select: { terbitPada: true, diperbaruiBesar: true },
     })
  +  const tools = await payload.find({
  +    collection: 'tools',
  +    where: syaratSitemap('tools'),
  +    depth: 0,
  +    limit: MAKS_URL_SITEMAP,
  +    pagination: false,
  +    select: { updatedAt: true },
  +  })
     const video = await payload.find({
       collection: 'video',
       where: syaratSitemap('video'),
  @@ -129,6 +137,7 @@ async function ambilEntriIndeks(payload: Payload, situs: Pick<PengaturanSitus, '
     })
     const indeks: [string, (string | null | undefined)[]][] = [
       [PATH_INDEKS.glosarium, istilah.docs.map((d) => d.diperbaruiBesar ?? d.terbitPada)],
  +    [PATH_INDEKS.tools, tools.docs.map((d) => d.updatedAt)],
       [PATH_INDEKS.video, video.docs.map((d) => d.updatedAt)],
     ]
     return indeks
  ```

- [ ] **Langkah 4: Komponen dan rute**

  `src/components/tools/Tools.module.css`

  ```css
  /* Indeks tools: kalkulator per pilar, kartu bergaris seperti kotak "Hitung sendiri" di mockup. */
  .halaman {
    display: grid;
    gap: var(--ruang-10);
    padding-top: var(--ruang-4);
  }

  .kepala {
    display: grid;
    gap: var(--ruang-4);
    max-width: 880px;
  }

  .judul {
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

  .kelompok {
    display: grid;
    gap: var(--ruang-4);
  }

  .subjudul {
    display: flex;
    align-items: center;
    gap: var(--ruang-3);
    font-size: var(--teks-h2);
    font-stretch: var(--lebar-h2);
  }

  .titik {
    flex: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--pilar);
    box-shadow: inset 0 0 0 1px var(--garis);
  }

  .daftar {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    gap: var(--ruang-4);
    padding: 0;
    list-style: none;
  }

  .kartu {
    display: grid;
    align-content: start;
    gap: var(--ruang-3);
    height: 100%;
    padding: var(--ruang-6);
    border: var(--garis-tebal) solid var(--garis);
    border-radius: var(--radius-kartu);
    text-decoration: none;
    transition: transform var(--durasi-cepat) var(--kurva);
  }

  .kartu:hover {
    transform: translateY(-2px);
  }

  .kartu:hover .nama {
    text-decoration: underline;
  }

  .kartu:active {
    transform: scale(0.99);
  }

  .nama {
    font-size: var(--teks-h3);
    font-stretch: var(--lebar-h3);
    font-weight: 800;
  }

  .ajakan {
    display: inline-flex;
    align-items: center;
    gap: var(--ruang-2);
    margin-top: var(--ruang-2);
    font-weight: 700;
  }

  .kosong {
    max-width: 60ch;
    padding: var(--ruang-6);
    border-radius: var(--radius-kartu);
    background: var(--permukaan);
  }
  ```

  `src/components/tools/IndeksTools.tsx`

  ```tsx
  import { Ikon } from '@/components/dasar/Ikon'
  import { JsonLd } from '@/components/dasar/JsonLd'
  import { RemahRoti } from '@/components/dasar/RemahRoti'
  import { Tautan } from '@/components/dasar/Tautan'
  import type { KelompokTools } from '@/modules/konten/tipe'
  import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
  import type { MasukanSeo, Situs } from '@/modules/seo/tipe'

  import gaya from './Tools.module.css'

  export const JUDUL_TOOLS = 'Tools'
  export const DESKRIPSI_TOOLS =
    'Kalkulator untuk menghitung sendiri gaji, cicilan, dan kebutuhan harianmu. Setiap kalkulator disertai rumus dan sumber aturannya.'

  /** Indeks `/tools`: kalkulator per pilar. Halaman kalkulator `/tools/{slug}` dibangun di Rencana 5. */
  export function IndeksTools({ kelompok, masukan, situs }: { kelompok: KelompokTools[]; masukan: MasukanSeo; situs: Situs }) {
    return (
      <div className={`kontainer ${gaya.halaman}`}>
        <JsonLd data={jsonLd(masukan, situs)} />
        <header className={gaya.kepala}>
          <RemahRoti remah={remahRoti(masukan)} />
          <h1 className={gaya.judul}>{JUDUL_TOOLS}</h1>
          <p className={gaya.deck}>{DESKRIPSI_TOOLS}</p>
        </header>
        {kelompok.length === 0 && <p className={gaya.kosong}>Belum ada kalkulator yang terbit. Kalkulator baru tampil di sini setelah terbit.</p>}
        {kelompok.map((k) => (
          <section key={k.pilar.slug} aria-labelledby={`tools-${k.pilar.slug}`} className={gaya.kelompok}>
            <h2 id={`tools-${k.pilar.slug}`} className={gaya.subjudul}>
              <span className={gaya.titik} data-warna={k.pilar.warna} aria-hidden="true" />
              {k.pilar.nama}
            </h2>
            <ul className={gaya.daftar}>
              {k.tools.map((t) => (
                <li key={t.id}>
                  <Tautan href={t.href} className={gaya.kartu}>
                    <Ikon nama="calculator" ukuran={28} />
                    <h3 className={gaya.nama}>{t.nama}</h3>
                    <p>{t.ringkasan}</p>
                    <span className={gaya.ajakan}>
                      Hitung {t.nama}
                      <Ikon nama="arrow-right" />
                    </span>
                  </Tautan>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    )
  }
  ```

  `src/app/(frontend)/tools/page.tsx`

  ```tsx
  import type { Metadata } from 'next'

  import { DESKRIPSI_TOOLS, IndeksTools, JUDUL_TOOLS } from '@/components/tools/IndeksTools'
  import { PATH_INDEKS } from '@/lib/paths'
  import { muatSitus, muatTools } from '@/modules/konten'
  import { metadata, type MasukanSeo } from '@/modules/seo'

  const masukan: MasukanSeo = { jenis: 'statis', judul: JUDUL_TOOLS, path: PATH_INDEKS.tools, deskripsi: DESKRIPSI_TOOLS }

  export async function generateMetadata(): Promise<Metadata> {
    return metadata(masukan, await muatSitus())
  }

  export default async function Tools() {
    const [kelompok, situs] = await Promise.all([muatTools(), muatSitus()])
    return <IndeksTools kelompok={kelompok} masukan={masukan} situs={situs} />
  }
  ```

- [ ] **Langkah 5: Jalankan tes unit dan integrasi**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 40 passed (40)`, `Tests 268 passed (268)`; integrasi `Test Files 22 passed (22)`, `Tests 68 passed (68)`.

- [ ] **Langkah 6: Tools contoh dan tes E2E**

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index 9a46418..060eda5 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -17,7 +17,7 @@ import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, p, SLUG, SLUG_HALAMAN,
   pakaiKlien(klienPalsu('e2e'))
   const payload = await getPayload({ config })
   
  -for (const koleksi of ['artikel', 'video', 'subkategori', 'redirect', 'log-404', 'media'] as const) {
  +for (const koleksi of ['artikel', 'tools', 'video', 'subkategori', 'redirect', 'log-404', 'media'] as const) {
     await payload.delete({ collection: koleksi, where: { id: { exists: true } } })
   }
   await seed(payload, { emailAdmin: ADMIN_E2E.email, passwordAdmin: ADMIN_E2E.password })
  @@ -205,6 +205,20 @@ const danaDarurat = await payload.create({
   })
   await payload.update({ collection: 'artikel', id: danaDarurat.id, data: { _status: 'published', slug: SLUG.danaDarurat } })
   
  +// Kalkulator: tiga terbit di dua pilar, satu draf. Halaman `/tools/{slug}` dibangun di Rencana 5.
  +for (const [toolId, nama, slugPilar, status] of [
  +  ['gaji-bersih', 'Gaji Bersih', 'uang-karier', 'published'],
  +  ['thr', 'THR', 'uang-karier', 'published'],
  +  ['bmi-kalori', 'BMI & Kalori', 'sehat', 'published'],
  +  ['ipk', 'IPK', 'belajar', 'draft'],
  +] as const) {
  +  await payload.create({
  +    collection: 'tools',
  +    draft: status === 'draft',
  +    data: { _status: status, nama, slug: toolId, toolId, pilar: pilar[slugPilar], ringkasan: `Hitung ${nama} dengan rumus dan sumber aturan resmi.` },
  +  })
  +}
  +
   // Halaman statis dari seed (draf) diterbitkan dengan blok page builder.
   async function terbitkanHalaman(slug: string, tataLetak: NonNullable<Halaman['tataLetak']>) {
     const { docs } = await payload.find({ collection: 'halaman', where: { slug: { equals: slug } }, draft: true, limit: 1 })
  ```

  `tests/e2e/tools.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  import { UKURAN_LAYAR } from './data'

  test.beforeEach(async ({ page }) => {
    await cegatCloudinary(page)
  })

  test('tombol Tools di header membuka indeks kalkulator per pilar', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('banner').getByRole('link', { name: 'Tools' }).click()
    await expect(page).toHaveURL('/tools')
    await expect(page).toHaveTitle('Tools · point.')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tools')
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Uang & Karier', 'Sehat'])
    await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Gaji Bersih', 'THR', 'BMI & Kalori'])
    await expect(page.getByRole('link', { name: /Hitung Gaji Bersih/ })).toHaveAttribute('href', '/tools/gaji-bersih')
    await expect(page.getByText('IPK', { exact: true })).toHaveCount(0)
  })

  for (const { lebar, tinggi } of UKURAN_LAYAR) {
    test(`indeks tools ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: tinggi })
      await page.goto('/tools')
      await periksaTanpaGeserHorizontal(page)
      await periksaAxe(page)
    })
  }
  ```

  Jalankan:

  ```bash
  npm run test:e2e
  ```

  Hasil yang diharapkan: `56 passed`. Tombol Tools membuka `/tools` dengan H2 Uang & Karier dan Sehat, tiga kartu kalkulator, tanpa IPK (draf).

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/lib/paths.ts src/modules/konten src/modules/seo/data.ts src/components/tools "src/app/(frontend)/tools" tests/unit/tools.test.ts tests/int/tools-indeks.int.spec.ts tests/int/sitemap.int.spec.ts tests/e2e
  git commit -m "feat(ui): indeks tools per pilar, /tools di sitemap halaman"
  ```

### Task 6: Pencarian `/cari` (noindex) dan form cari di halaman 404

**Files:**
- Create: `src/modules/konten/cari.ts`, `src/components/cari/FormCari.tsx`, `src/components/cari/HalamanCari.tsx`, `src/components/cari/Cari.module.css`, `src/app/(frontend)/cari/page.tsx`
- Modify: `src/lib/paths.ts`, `src/modules/konten/data.ts`, `src/modules/konten/cache.ts`, `src/modules/konten/index.ts`, `src/components/galat/TidakDitemukan.tsx`
- Test: `tests/unit/cari.test.ts`, `tests/int/cari.int.spec.ts`, `tests/e2e/cari.spec.ts`

**Interfaces:**
- Consumes: `kartuArtikel`, `POPULATE_ARTIKEL`, `DaftarKartu`, `RemahRoti`, `TidakDitemukan` (Rencana 4A); `metadata` dengan masukan `statis` + `noindex` (Rencana 3).
- Produces:
  - `src/lib/paths.ts`: `PATH_INDEKS.cari = '/cari'`.
  - `src/modules/konten/cari.ts`: `MAKS_KUERI = 80`, `MAKS_KATA = 6`, `MAKS_HASIL_CARI = 20`, `rapikanKueri(nilai)`, `kataKueri(kueri)`, `urutkanHasil(kueri, hasil)`.
  - `cariArtikel(payload, kueri): KartuArtikel[]`, `muatCari(kueri)` (tag `artikel`, `pilar`).
  - Komponen `FormCari({ nilai?, placeholder?, besar? })` (dipakai beranda di Task 8), `HalamanCari({ kueri, hasil, masukan })`, `JUDUL_CARI`, `DESKRIPSI_CARI`.
  - Rute `/cari` (dinamis, `noindex, follow`); halaman 404 punya form cari.

Spesifikasi §7 meminta `/cari` (noindex) dan §15 meminta halaman 404 dengan pencarian. Form adalah `<form role="search" action="/cari" method="get">` tanpa JavaScript, label "Cari topik" terlihat dan membungkus input (spesifikasi §14), tombol "Cari". Halaman `/cari` membaca `searchParams`, jadi dirender per permintaan (dokumentasi Next `page.md`: `searchParams` memilih rendering dinamis); hasil per kueri di-cache `unstable_cache` bertag `artikel` supaya kueri yang sama tidak menyentuh database lagi sampai ada artikel berubah.

Pencarian memakai operator `like` Payload: adapter Postgres Payload 3.92.1 memecah nilainya per spasi dan menjadikan setiap kata `ILIKE '%kata%'` (`@payloadcms/drizzle` `queries/parseParams.js`). Kueri dirapikan dulu: nilai pertama bila `q` diulang, karakter wildcard `%`, `_`, `\` dibuang (supaya tidak menjadi pola), spasi dirapikan, maksimal 80 karakter dan 6 kata unik. Setiap kata harus ada di salah satu kolom: judul, deck, poin Intinya, atau keyphrase SEO, pada artikel terbit (glosarium ikut, hrefnya `/glosarium/{slug}`). Maksimal 20 hasil terbaru, lalu hasil yang judulnya memuat semua kata naik ke atas. Pencarian teks penuh (stemming, salah ketik) menyusul bila artikel sudah ribuan (lihat Cakupan yang ditunda).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/cari.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it } from 'vitest'

  import { FormCari } from '@/components/cari/FormCari'
  import { HalamanCari } from '@/components/cari/HalamanCari'
  import { TidakDitemukan } from '@/components/galat/TidakDitemukan'
  import { kataKueri, MAKS_KUERI, rapikanKueri, urutkanHasil } from '@/modules/konten/cari'
  import type { KartuArtikel } from '@/modules/konten/tipe'

  const kartu = (id: number, judul: string): KartuArtikel => ({ id, judul, href: `/artikel-${id}`, tipe: 'panduan', pilar: null, intinya: null })

  describe('kueri pencarian', () => {
    it('nilai pertama, wildcard dibuang, spasi dirapikan, dan dipotong', () => {
      expect(rapikanKueri(['  gaji   bersih ', 'thr'])).toBe('gaji bersih')
      expect(rapikanKueri('100%_aman\\')).toBe('100 aman')
      expect(rapikanKueri(undefined)).toBe('')
      expect(rapikanKueri('a'.repeat(200))).toHaveLength(MAKS_KUERI)
    })

    it('kata unik huruf kecil, maksimal enam', () => {
      expect(kataKueri('Gaji gaji BERSIH')).toEqual(['gaji', 'bersih'])
      expect(kataKueri('a b c d e f g h')).toHaveLength(6)
      expect(kataKueri('')).toEqual([])
    })

    it('judul yang memuat semua kata naik ke atas, sisanya tetap urut', () => {
      const hasil = urutkanHasil('gaji bersih', [kartu(1, 'Apa itu TER'), kartu(2, 'Cara hitung gaji bersih'), kartu(3, 'Gaji pokok')])
      expect(hasil.map((k) => k.id)).toEqual([2, 1, 3])
    })
  })

  describe('FormCari dan HalamanCari', () => {
    const masukan = { jenis: 'statis', judul: 'Cari', path: '/cari', noindex: true } as const

    it('form GET ke /cari dengan label yang terlihat', () => {
      const html = renderToStaticMarkup(h(FormCari, { nilai: 'thr' }))
      expect(html).toMatch(/^<form role="search" class="[^"]*" action="\/cari" method="get">/)
      expect(html).toMatch(/<label class="[^"]*">Cari topik<input type="search" placeholder="misal: cara hitung THR" enterKeyHint="search" class="[^"]*" name="q" value="thr"\/><\/label>/)
      expect(html).toContain('<button type="submit" class="')
    })

    it('tanpa kueri: contoh topik; dengan hasil: jumlah dan kartu; tanpa hasil: saran', () => {
      expect(renderToStaticMarkup(h(HalamanCari, { kueri: '', hasil: [], masukan }))).toContain('misalnya gaji bersih, BPJS, atau beasiswa.')
      const ada = renderToStaticMarkup(h(HalamanCari, { kueri: 'gaji', hasil: [kartu(2, 'Cara hitung gaji bersih')], masukan }))
      expect(ada).toContain('<h2 id="hasil-cari" class="')
      expect(ada).toContain('1 tulisan untuk “gaji”')
      expect(ada).toContain('href="/artikel-2"')
      const kosong = renderToStaticMarkup(h(HalamanCari, { kueri: 'zzz', hasil: [], masukan }))
      expect(kosong).toContain('Tidak ada tulisan untuk “zzz”')
      expect(kosong).toContain('Coba kata yang lebih umum')
    })

    it('halaman 404 punya form cari', () => {
      expect(renderToStaticMarkup(h(TidakDitemukan, { terbaru: [] }))).toMatch(/<form role="search" class="[^"]*" action="\/cari" method="get">/)
    })
  })
  ```

  `tests/int/cari.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { cariArtikel } from '@/modules/konten/data'

  import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
  import { getTestPayload, unik } from './helpers'

  describe('cariArtikel', () => {
    it('semua kata harus ada di judul, deck, poin Intinya, atau keyphrase; hanya yang terbit, termasuk glosarium', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const kode = unik('zebra').replace(/-/g, '')
      const judul = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), judul: `Cara menabung ${kode} harian` } })
      const deck = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), deck: `Potongan ${kode} dijelaskan.` } })
      const intinya = await payload.create({
        collection: 'artikel',
        data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium', intinya: [{ poin: `${kode} adalah contoh.` }, { poin: 'Poin kedua.' }] },
      })
      const keyphrase = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), seo: { keyphrase: `${kode} bulanan` } } })
      await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft', judul: `Draf ${kode}` } })

      const id = async (kueri: string) => (await cariArtikel(payload, kueri)).map((k) => k.id)
      expect((await id(kode)).sort()).toEqual([judul.id, deck.id, intinya.id, keyphrase.id].sort())
      expect(await id(`${kode.toUpperCase()} harian`)).toEqual([judul.id])
      expect(await id(`${kode} bulanan`)).toEqual([keyphrase.id])
      expect(await id('')).toEqual([])
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/cari.test.ts` dengan `Cannot find package '@/components/cari/FormCari'`.

- [ ] **Langkah 3: Kueri dan data pencarian**

  ```diff
  diff --git a/src/lib/paths.ts b/src/lib/paths.ts
  index 2f3a333..6ab3a21 100644
  --- a/src/lib/paths.ts
  +++ b/src/lib/paths.ts
  @@ -6,7 +6,7 @@ export type TargetPath =
     | { jenis: 'pilar' | 'tools' | 'video' | 'penulis' | 'halaman'; slug: string }
   
   /** Halaman indeks yang tidak mewakili satu dokumen. */
  -export const PATH_INDEKS = { glosarium: '/glosarium', tools: '/tools', video: '/video' } as const
  +export const PATH_INDEKS = { cari: '/cari', glosarium: '/glosarium', tools: '/tools', video: '/video' } as const
   
   /** Satu-satunya tempat path publik dirangkai. Dipakai redirect, SEO, sitemap, dan indexer. */
   export function pathFor(target: TargetPath): string {
  ```

  `src/modules/konten/cari.ts`

  ```ts
  import type { KartuArtikel } from './tipe'

  /** Panjang kueri (karakter), jumlah kata yang dicari, dan jumlah hasil `/cari`. */
  export const MAKS_KUERI = 80
  export const MAKS_KATA = 6
  export const MAKS_HASIL_CARI = 20

  /**
   * Kueri dari `?q=`: nilai pertama bila parameter diulang, karakter wildcard (`%`, `_`, `\`) diganti
   * spasi karena operator `like` Payload meneruskannya ke ILIKE, spasi dirapikan, lalu dipotong.
   */
  export function rapikanKueri(nilai: string | string[] | undefined): string {
    const teks = Array.isArray(nilai) ? nilai[0] : nilai
    return (teks ?? '')
      .replace(/[%_\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAKS_KUERI)
      .trim()
  }

  /** Kata unik (huruf kecil) yang semuanya harus ditemukan di salah satu kolom pencarian. */
  export function kataKueri(kueri: string): string[] {
    return [...new Set(kueri.toLowerCase().split(' ').filter(Boolean))].slice(0, MAKS_KATA)
  }

  /** Hasil yang judulnya memuat semua kata naik ke atas; urutan terbaru tetap di dalam tiap kelompok. */
  export function urutkanHasil(kueri: string, hasil: KartuArtikel[]): KartuArtikel[] {
    const kata = kataKueri(kueri)
    const diJudul = (k: KartuArtikel) => kata.every((w) => k.judul.toLowerCase().includes(w))
    return [...hasil.filter(diJudul), ...hasil.filter((k) => !diJudul(k))]
  }
  ```

  ```diff
  diff --git a/src/modules/konten/data.ts b/src/modules/konten/data.ts
  index 6f53e3d..35001cb 100644
  --- a/src/modules/konten/data.ts
  +++ b/src/modules/konten/data.ts
  @@ -4,6 +4,7 @@ import type { Artikel } from '@/payload-types'
   import { validasiFormatSlug } from '@/lib/slug'
   
   import { gabungTerkait, kartuArtikel, MAKS_TERKAIT, susunArtikel } from './artikel'
  +import { kataKueri, MAKS_HASIL_CARI, urutkanHasil } from './cari'
   import { kelompokkanIstilah } from './glosarium'
   import { susunHalaman } from './halaman'
   import { MAKS_ARTIKEL_PENULIS, susunPenulis } from './penulis'
  @@ -281,3 +282,27 @@ export async function ambilTools(payload: Payload): Promise<KelompokTools[]> {
     })
     return kelompokkanTools(docs)
   }
  +
  +/** Kolom yang dicari `/cari`: judul, deck, poin Intinya, dan keyphrase SEO. */
  +const KOLOM_CARI = ['judul', 'deck', 'intinya.poin', 'seo.keyphrase'] as const
  +
  +/**
  + * Pencarian `/cari`: artikel terbit (termasuk glosarium) yang memuat setiap kata kueri di salah satu
  + * kolom `KOLOM_CARI` (tanpa beda huruf besar), judul yang memuat semua kata di atas. Pencarian teks
  + * penuh Postgres bisa menggantikannya bila jumlah artikel sudah ribuan.
  + */
  +export async function cariArtikel(payload: Payload, kueri: string): Promise<KartuArtikel[]> {
  +  const kata = kataKueri(kueri)
  +  if (kata.length === 0) return []
  +  const { docs } = await payload.find({
  +    collection: 'artikel',
  +    where: { and: [terbit, ...kata.map((k) => ({ or: KOLOM_CARI.map((kolom) => ({ [kolom]: { like: k } })) }))] },
  +    sort: '-terbitPada',
  +    limit: MAKS_HASIL_CARI,
  +    depth: 1,
  +    pagination: false,
  +    select: { judul: true, slug: true, tipe: true, pilar: true, intinya: true },
  +    populate: { pilar: POPULATE_ARTIKEL.pilar },
  +  })
  +  return urutkanHasil(kueri, docs.map(kartuArtikel).filter((k): k is KartuArtikel => k !== null))
  +}
  ```

  ```diff
  diff --git a/src/modules/konten/cache.ts b/src/modules/konten/cache.ts
  index dcb0e26..38b80b4 100644
  --- a/src/modules/konten/cache.ts
  +++ b/src/modules/konten/cache.ts
  @@ -17,6 +17,7 @@ import {
     ambilTerbaru,
     ambilTools,
     ambilVideo,
  +  cariArtikel,
     cariRedirect,
   } from './data'
   
  @@ -128,3 +129,9 @@ export const muatTools = unstable_cache(async () => ambilTools(await payload()),
     tags: [TAG.koleksi('tools'), TAG.koleksi('pilar')],
     revalidate: SEJAM,
   })
  +
  +/** Hasil `/cari` per kueri (sudah dirapikan `rapikanKueri`), dibuang saat artikel atau pilar berubah. */
  +export const muatCari = unstable_cache(async (kueri: string) => cariArtikel(await payload(), kueri), ['konten', 'cari'], {
  +  tags: [TAG.koleksi('artikel'), TAG.koleksi('pilar')],
  +  revalidate: SEJAM,
  +})
  ```

  ```diff
  diff --git a/src/modules/konten/index.ts b/src/modules/konten/index.ts
  index 534da9b..e6ffdde 100644
  --- a/src/modules/konten/index.ts
  +++ b/src/modules/konten/index.ts
  @@ -10,6 +10,7 @@
    */
   export {
     muatArtikel,
  +  muatCari,
     muatDaftarVideo,
     muatFooter,
     muatGlosarium,
  @@ -36,8 +37,10 @@ export {
     ambilTerbaru,
     ambilTools,
     ambilVideo,
  +  cariArtikel,
     cariRedirect,
   } from './data'
  +export { kataKueri, MAKS_HASIL_CARI, MAKS_KATA, MAKS_KUERI, rapikanKueri, urutkanHasil } from './cari'
   export { itemTools, kelompokkanTools } from './tools'
   export { kartuVideo, labelDurasi, MAKS_VIDEO_INDEKS, MAKS_VIDEO_LAIN, susunVideo } from './video'
   export { MAKS_ARTIKEL_PENULIS, susunPenulis } from './penulis'
  ```

- [ ] **Langkah 4: Komponen, rute, dan form di halaman 404**

  React 19 menulis atribut form dengan urutan `role`, `class`, `action`, `method`; tes unit mencocokkan urutan itu.

  `src/components/cari/Cari.module.css`

  ```css
  /* Form cari (beranda, /cari, 404) dan halaman hasil. */
  .form {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: var(--ruang-2);
    max-width: 640px;
  }

  .label {
    flex: 1 1 200px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 14px;
    font-weight: 700;
  }

  .input {
    min-height: 52px;
    padding: 0 var(--ruang-4);
    border: var(--garis-tebal) solid var(--garis);
    border-radius: var(--radius-kontrol);
    background: var(--latar);
    font-size: 17px;
    font-weight: 400;
  }

  .input::placeholder {
    color: var(--teks-sekunder);
    opacity: 1;
  }

  .tombol {
    min-height: 52px;
    padding: 0 var(--ruang-6);
    border: 0;
    border-radius: var(--radius-kontrol);
    background: var(--tombol);
    color: var(--tombol-teks);
    font-size: 17px;
    font-weight: 700;
    cursor: pointer;
    transition: transform var(--durasi-cepat) var(--kurva);
  }

  .tombol:active {
    transform: scale(0.98);
  }

  .besar .input {
    min-height: 56px;
    padding-inline: 18px;
  }

  .besar .tombol {
    min-height: 60px;
    padding-inline: 26px;
  }

  .halaman {
    display: grid;
    gap: var(--ruang-10);
    padding-top: var(--ruang-4);
  }

  .kepala {
    display: grid;
    gap: var(--ruang-4);
  }

  .judul {
    font-size: var(--teks-h1);
    font-stretch: var(--lebar-h1);
    line-height: var(--tinggi-h1);
    letter-spacing: -0.02em;
  }

  .hasil {
    display: grid;
    gap: var(--ruang-6);
  }

  .status {
    max-width: 40ch;
    font-size: var(--teks-h3);
    font-stretch: var(--lebar-h3);
    font-weight: 800;
  }

  .petunjuk {
    max-width: 60ch;
    padding: var(--ruang-6);
    border-radius: var(--radius-kartu);
    background: var(--permukaan);
  }
  ```

  `src/components/cari/FormCari.tsx`

  ```tsx
  import { PATH_INDEKS } from '@/lib/paths'

  import gaya from './Cari.module.css'

  /**
   * Form pencarian tanpa JavaScript: GET ke `/cari?q=`. Label selalu terlihat (spesifikasi §14) dan
   * membungkus input, jadi tidak butuh `id`. `besar` untuk hero beranda.
   */
  export function FormCari({ nilai = '', placeholder = 'misal: cara hitung THR', besar = false }: { nilai?: string; placeholder?: string; besar?: boolean }) {
    return (
      <form role="search" action={PATH_INDEKS.cari} method="get" className={besar ? `${gaya.form} ${gaya.besar}` : gaya.form}>
        <label className={gaya.label}>
          Cari topik
          <input type="search" name="q" defaultValue={nilai} placeholder={placeholder} enterKeyHint="search" className={gaya.input} />
        </label>
        <button type="submit" className={gaya.tombol}>
          Cari
        </button>
      </form>
    )
  }
  ```

  `src/components/cari/HalamanCari.tsx`

  ```tsx
  import { RemahRoti } from '@/components/dasar/RemahRoti'
  import { DaftarKartu } from '@/components/kartu/KartuArtikel'
  import type { KartuArtikel } from '@/modules/konten/tipe'
  import { remahRoti } from '@/modules/seo/jsonld'
  import type { MasukanSeo } from '@/modules/seo/tipe'

  import gaya from './Cari.module.css'
  import { FormCari } from './FormCari'

  export const JUDUL_CARI = 'Cari'
  export const DESKRIPSI_CARI = 'Cari panduan, explainer, dan istilah di point.'

  /**
   * `/cari` (noindex): form berisi kueri, lalu jumlah hasil dan kartunya. Tanpa kueri ada contoh topik;
   * tanpa hasil ada saran memperluas kata kunci.
   */
  export function HalamanCari({ kueri, hasil, masukan }: { kueri: string; hasil: KartuArtikel[]; masukan: MasukanSeo }) {
    return (
      <div className={`kontainer ${gaya.halaman}`}>
        <header className={gaya.kepala}>
          <RemahRoti remah={remahRoti(masukan)} />
          <h1 className={gaya.judul}>{JUDUL_CARI}</h1>
          <FormCari nilai={kueri} />
        </header>
        {kueri ? (
          <section aria-labelledby="hasil-cari" className={gaya.hasil}>
            <h2 id="hasil-cari" className={gaya.status}>
              {hasil.length > 0 ? `${hasil.length} tulisan untuk “${kueri}”` : `Tidak ada tulisan untuk “${kueri}”`}
            </h2>
            {hasil.length > 0 ? (
              <DaftarKartu kartu={hasil} />
            ) : (
              <p className={gaya.petunjuk}>Coba kata yang lebih umum atau periksa ejaannya. Kamu juga bisa membuka rubrik di bagian atas halaman.</p>
            )}
          </section>
        ) : (
          <p className={gaya.petunjuk}>Ketik topik yang ingin kamu pahami, misalnya gaji bersih, BPJS, atau beasiswa.</p>
        )}
      </div>
    )
  }
  ```

  `src/app/(frontend)/cari/page.tsx`

  ```tsx
  import type { Metadata } from 'next'

  import { DESKRIPSI_CARI, HalamanCari, JUDUL_CARI } from '@/components/cari/HalamanCari'
  import { PATH_INDEKS } from '@/lib/paths'
  import { muatCari, muatSitus, rapikanKueri } from '@/modules/konten'
  import { metadata, type MasukanSeo } from '@/modules/seo'

  type Props = { searchParams: Promise<{ q?: string | string[] }> }

  /** Halaman hasil pencarian tidak diindeks (spesifikasi §7), tetapi tautannya tetap diikuti. */
  const masukan: MasukanSeo = { jenis: 'statis', judul: JUDUL_CARI, path: PATH_INDEKS.cari, deskripsi: DESKRIPSI_CARI, noindex: true }

  export async function generateMetadata(): Promise<Metadata> {
    return metadata(masukan, await muatSitus())
  }

  /** Dirender per permintaan karena membaca `searchParams`; hasil per kueri di-cache bertag `artikel`. */
  export default async function Cari({ searchParams }: Props) {
    const kueri = rapikanKueri((await searchParams).q)
    const hasil = kueri ? await muatCari(kueri) : []
    return <HalamanCari kueri={kueri} hasil={hasil} masukan={masukan} />
  }
  ```

  ```diff
  diff --git a/src/components/galat/TidakDitemukan.tsx b/src/components/galat/TidakDitemukan.tsx
  index e216e8b..165a3fa 100644
  --- a/src/components/galat/TidakDitemukan.tsx
  +++ b/src/components/galat/TidakDitemukan.tsx
  @@ -1,3 +1,4 @@
  +import { FormCari } from '@/components/cari/FormCari'
   import { Ikon } from '@/components/dasar/Ikon'
   import { Tautan } from '@/components/dasar/Tautan'
   import { DaftarKartu } from '@/components/kartu/KartuArtikel'
  @@ -6,16 +7,17 @@ import type { KartuArtikel } from '@/modules/konten/tipe'
   import { Catat404 } from './Catat404'
   import gaya from './TidakDitemukan.module.css'
   
  -/** Isi halaman 404 (spesifikasi §15): penjelasan singkat, jalan kembali, dan tulisan terbaru. */
  +/** Isi halaman 404 (spesifikasi §15): penjelasan singkat, pencarian, jalan kembali, dan tulisan terbaru. */
   export function TidakDitemukan({ terbaru }: { terbaru: KartuArtikel[] }) {
     return (
       <div className={`kontainer ${gaya.halaman}`}>
         <p className={gaya.kode}>Galat 404</p>
         <h1 className={gaya.judul}>Halaman ini tidak ada.</h1>
         <p className={gaya.teks}>
  -        Mungkin tautannya salah ketik, atau tulisannya sudah pindah alamat. Mulai lagi dari beranda, atau baca tulisan terbaru
  -        di bawah.
  +        Mungkin tautannya salah ketik, atau tulisannya sudah pindah alamat. Cari topiknya, mulai lagi dari beranda, atau baca
  +        tulisan terbaru di bawah.
         </p>
  +      <FormCari />
         <Tautan href="/" className={gaya.tombol}>
           Kembali ke beranda
           <Ikon nama="arrow-right" />
  ```

- [ ] **Langkah 5: Jalankan tes unit dan integrasi**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 41 passed (41)`, `Tests 274 passed (274)`; integrasi `Test Files 23 passed (23)`, `Tests 69 passed (69)`.

- [ ] **Langkah 6: Tes E2E pencarian**

  `tests/e2e/cari.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  import { SLUG, UKURAN_LAYAR } from './data'

  test.beforeEach(async ({ page }) => {
    await cegatCloudinary(page)
  })

  test('cari dari halaman 404: hasil dengan judul cocok di atas, halaman noindex', async ({ page }) => {
    await page.goto('/jalan-buntu-cari')
    await expect(page.locator('html')).toHaveAttribute('lang', 'id')
    await page.getByRole('searchbox', { name: 'Cari topik' }).fill('gaji bersih')
    await page.getByRole('button', { name: 'Cari' }).click()
    await expect(page).toHaveURL('/cari?q=gaji+bersih')
    await expect(page).toHaveTitle('Cari · point.')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
    await expect(page.getByRole('searchbox', { name: 'Cari topik' })).toHaveValue('gaji bersih')
    const hasil = page.getByRole('region', { name: /tulisan untuk “gaji bersih”/ })
    await expect(hasil.getByRole('link').first()).toHaveAttribute('href', `/${SLUG.panduan}`)
  })

  test('istilah glosarium ikut dicari; tanpa hasil dan tanpa kueri ada petunjuk', async ({ page }) => {
    await page.goto('/cari?q=penghasilan+tidak+kena+pajak')
    await expect(page.getByRole('region', { name: '1 tulisan untuk “penghasilan tidak kena pajak”' }).getByRole('link')).toHaveAttribute('href', '/glosarium/ptkp')
    await page.goto('/cari?q=zzzzzz')
    await expect(page.getByRole('heading', { level: 2 })).toHaveText('Tidak ada tulisan untuk “zzzzzz”')
    await expect(page.getByText('Coba kata yang lebih umum atau periksa ejaannya.')).toBeVisible()
    await page.goto('/cari')
    await expect(page.getByText('Ketik topik yang ingin kamu pahami')).toBeVisible()
  })

  test('tombol Cari tetap sebaris dengan kolom isian di layar 375 px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/cari')
    const isian = await page.getByRole('searchbox', { name: 'Cari topik' }).boundingBox()
    const tombol = await page.getByRole('button', { name: 'Cari' }).boundingBox()
    expect(Math.round(tombol!.y + tombol!.height)).toBe(Math.round(isian!.y + isian!.height))
  })

  for (const { lebar, tinggi } of UKURAN_LAYAR) {
    test(`cari ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: tinggi })
      for (const path of ['/cari', '/cari?q=gaji']) {
        await page.goto(path)
        await periksaTanpaGeserHorizontal(page)
        await periksaAxe(page)
      }
    })
  }
  ```

  Jalankan:

  ```bash
  npm run test:e2e
  ```

  Hasil yang diharapkan: `62 passed`. Form di halaman 404 membuka `/cari?q=gaji+bersih` dengan panduan di urutan pertama dan `noindex, follow`; "penghasilan tidak kena pajak" menemukan istilah PTKP; tanpa hasil dan tanpa kueri ada petunjuk; tombol Cari sebaris dengan isian di 375 px.

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/lib/paths.ts src/modules/konten src/components/cari src/components/galat "src/app/(frontend)/cari" tests/unit/cari.test.ts tests/int/cari.int.spec.ts tests/e2e/cari.spec.ts
  git commit -m "feat(ui): pencarian /cari (noindex) dan form cari di halaman 404"
  ```

### Task 7: Data beranda dari global `beranda`, revalidasi beranda dan newsletter, `/` di sitemap halaman

**Files:**
- Create: `src/modules/konten/beranda.ts`
- Modify: `src/blocks/beranda.ts`, `src/globals/Beranda.ts`, `src/globals/Newsletter.ts`, `src/hooks/revalidasiPublik.ts`, `src/lib/tag.ts`, `src/modules/konten/tipe.ts`, `src/modules/konten/data.ts`, `src/modules/konten/cache.ts`, `src/modules/konten/index.ts`, `src/modules/seo/data.ts`, `src/payload-types.ts` (hasil `npm run generate:types`), `tests/unit/tag.test.ts`, `tests/int/sitemap.int.spec.ts`
- Test: `tests/unit/beranda.test.ts`, `tests/int/beranda.int.spec.ts`

**Interfaces:**
- Consumes: `kartuArtikel` (4A), `kartuVideo`, `kartuVideoTerbit`, `POPULATE_VIDEO` (Task 4), `ambilTools` (Task 5), `kartuTerbit` (Task 1), `revalidasiGlobal` (4A).
- Produces:
  - Field baru `tampilkanTools` (checkbox, bawaan `true`) di blok `mozaikPilihan`; deskripsi admin di judul blok `palingDibaca`.
  - `revalidasiBeranda` (tag `beranda`, `sitemap`) dan `revalidasiNewsletter` (tag `beranda`) di `src/hooks/revalidasiPublik.ts`, dipasang di global Beranda dan Newsletter. `DI_BERANDA` kini memuat `tools`.
  - `src/modules/konten/tipe.ts`: `DataNewsletter = { judul; teks: string | null; href }`, `BagianBeranda` (union `hero`, `mozaik`, `video`, `terbaru`, `newsletter`).
  - `src/modules/konten/beranda.ts`: `HERO_BAWAAN`, `JUDUL_TERBARU = 'Tulisan terbaru'`, `JUDUL_VIDEO_BAWAAN`, `MAKS_VIDEO_BERANDA = 4`, `JUMLAH_TERBARU_BAWAAN = 4`, `MAKS_TERBARU_BERANDA = 15`, `SumberBeranda`, `susunNewsletter(global)`, `susunBeranda(tataLetak, sumber): BagianBeranda[]`.
  - `ambilBeranda(payload)`, `muatBeranda()` (tag `beranda`, `media`).
  - Sitemap `halaman.xml` selalu dimulai dengan `/`.

Global `beranda` (Rencana 1) menyimpan blok beranda yang bisa diurutkan editor: hero, mozaik pilihan redaksi, strip video, paling dibaca, newsletter, slot iklan. Global ini belum punya hook revalidasi; sekarang menyimpan beranda membuang tag `beranda` (dan `sitemap`, karena `lastmod` beranda ikut tanggal global), dan menyimpan global `newsletter` membuang `beranda`. Tools ikut ke `DI_BERANDA` karena kotak "Hitung sendiri" di beranda menampilkan tools terbit.

`susunBeranda` adalah fungsi murni yang menerjemahkan blok (depth 2) menjadi bagian siap render, dengan aturan yang jujur terhadap data yang belum ada:

| Blok | Tampil sebagai |
|---|---|
| Hero | Hanya hero pertama (satu H1). Tanpa hero, `HERO_BAWAAN` ("Intinya dulu.") dipasang paling atas supaya beranda selalu punya H1 dan pencarian. |
| Mozaik pilihan redaksi | Artikel terbit pilihan editor (draf dilewati), urutan pertama paling besar, ditambah tools terbit untuk kotak "Hitung sendiri" kecuali `tampilkanTools` dimatikan. Tanpa artikel terbit, blok dilewati. |
| Strip video | Video terbit pilihan editor; bila kosong, 4 video terbit terbaru; bila tetap kosong, blok dilewati. |
| Paling dibaca | Data kunjungan per URL baru ada di Rencana 6, jadi blok ini menampilkan tulisan terbaru di luar mozaik dengan judul tetap "Tulisan terbaru", apa pun isian editor. Deskripsi field di admin menjelaskannya. |
| Newsletter | Hanya bila global `newsletter` aktif dan `urlForm` berupa URL `https`: ajakan ke form penyedia, bukan form email di point. Bila tepat setelah tulisan terbaru, newsletter menjadi kolom sampingnya (seperti mockup). |
| Slot iklan | Belum dirender (Rencana 8), supaya tidak ada kotak kosong; slot yang memesan tinggi dibangun bersama penyedia iklan. |

Global dengan draf menyimpan versi publiknya di dokumen utama; `findGlobal` tanpa `draft` membaca dokumen itu (probe: dokumen hasil `updateGlobal` biasa berstatus `draft` di kolom `_status` tetapi tetap dibaca). Simpan draf di admin tidak mengubah dokumen utama, jadi beranda publik tidak berubah sampai editor menerbitkan.

Perubahan skema hanya menambah kolom `tampilkan_tools` (boolean, bawaan `true`) di tabel blok mozaik dan tabel versinya. Setelah `npm run generate:types`, jalankan `npm run seed` supaya kolom terdorong ke database dev sebelum `npm run build`.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/beranda.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { HERO_BAWAAN, JUDUL_TERBARU, susunBeranda, susunNewsletter, type SumberBeranda } from '@/modules/konten/beranda'
  import type { KartuArtikel, KartuVideo } from '@/modules/konten/tipe'
  import type { Artikel, Beranda, Media, Pilar, Video } from '@/payload-types'

  type Blok = NonNullable<Beranda['tataLetak']>[number]

  const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
  const pilar: Pilar = { id: 1, nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau', deskripsi: 'Uang.', ...waktu }

  const artikel = (id: number, status: 'published' | 'draft' = 'published'): Artikel =>
    ({ id, judul: `Artikel ${id}`, slug: `artikel-${id}`, tipe: 'panduan', pilar, intinya: [{ poin: `Intinya ${id}.` }], _status: status, ...waktu }) as Artikel

  const kartu = (id: number): KartuArtikel => ({ id, judul: `Artikel ${id}`, href: `/artikel-${id}`, tipe: 'panduan', pilar: null, intinya: null })

  const file: Media = { id: 30, publicId: 'point/video/a', jenis: 'video', alt: null, width: 1080, height: 1920, durasi: 40, ...waktu }
  const video = (id: number, status: 'published' | 'draft' = 'published'): Video =>
    ({ id, judul: `Video ${id}`, slug: `video-${id}`, file, pilar, transkrip: 'T.', _status: status, ...waktu }) as Video
  const kartuVid = (id: number): KartuVideo => ({ id, judul: `Video ${id}`, href: `/video/video-${id}`, durasi: 40, pilar: null, poster: null })

  const newsletter = { judul: 'Intinya, tiap Senin.', teks: 'Lima tulisan terbaik pekan ini.', href: 'https://contoh.kit.com/point' }

  const sumber: SumberBeranda = {
    terbaru: [1, 2, 3, 4, 5, 6].map(kartu),
    video: [7, 8].map(kartuVid),
    tools: [{ id: 9, nama: 'Gaji Bersih', href: '/tools/gaji-bersih', ringkasan: 'Hitung gaji bersih.' }],
    newsletter,
  }

  const blok = {
    hero: { blockType: 'heroBeranda', id: 'h', judul: 'Intinya dulu.', subjudul: ' Uang, karier, dan kesehatan. ', placeholderCari: 'misal: cara hitung THR' },
    mozaik: { blockType: 'mozaikPilihan', id: 'm', artikel: [artikel(2), artikel(5, 'draft'), artikel(3)], tampilkanTools: true },
    video: { blockType: 'stripVideo', id: 'v', judul: 'Intinya dalam 45 detik', video: [] },
    palingDibaca: { blockType: 'palingDibaca', id: 'p', judul: 'Paling dibaca pekan ini', jumlah: 2 },
    newsletter: { blockType: 'newsletterBlok', id: 'n', judul: null, teks: null },
    iklan: { blockType: 'slotIklan', id: 'i', idSlot: 'beranda-samping' },
  } satisfies Record<string, Blok>

  describe('susunNewsletter', () => {
    it('hanya bila aktif dan URL form penyedia https', () => {
      expect(susunNewsletter({ aktif: true, urlForm: ' https://contoh.kit.com/point ', judul: '', deskripsi: null })).toEqual({
        judul: 'Intinya, tiap Senin.',
        teks: null,
        href: 'https://contoh.kit.com/point',
      })
      expect(susunNewsletter({ aktif: false, urlForm: 'https://contoh.kit.com/point' })).toBeNull()
      expect(susunNewsletter({ aktif: true, urlForm: 'javascript:alert(1)' })).toBeNull()
      expect(susunNewsletter({ aktif: true, urlForm: null })).toBeNull()
    })
  })

  describe('susunBeranda', () => {
    it('urutan editor dipertahankan; mozaik tanpa draf, dengan tools; video cadangan terbaru; iklan belum dirender', () => {
      const bagian = susunBeranda([blok.hero, blok.mozaik, blok.video, blok.palingDibaca, blok.newsletter, blok.iklan], sumber)
      expect(bagian.map((b) => b.jenis)).toEqual(['hero', 'mozaik', 'video', 'terbaru'])
      expect(bagian[0]).toEqual({ jenis: 'hero', id: 'h', judul: 'Intinya dulu.', subjudul: 'Uang, karier, dan kesehatan.', placeholder: 'misal: cara hitung THR' })
      expect(bagian[1]).toMatchObject({ jenis: 'mozaik', judul: null, tools: sumber.tools })
      expect(bagian[1].jenis === 'mozaik' && bagian[1].artikel.map((k) => k.href)).toEqual(['/artikel-2', '/artikel-3'])
      expect(bagian[2].jenis === 'video' && bagian[2].video.map((v) => v.id)).toEqual([7, 8])
    })

    it('"Paling dibaca" jujur: tulisan terbaru di luar mozaik, berjudul tulisan terbaru; newsletter jadi kolom sampingnya', () => {
      const [, , terbaru] = susunBeranda([blok.hero, blok.mozaik, blok.palingDibaca, blok.newsletter], sumber)
      expect(terbaru).toMatchObject({ jenis: 'terbaru', judul: JUDUL_TERBARU, newsletter })
      expect(terbaru.jenis === 'terbaru' && terbaru.artikel.map((k) => k.id)).toEqual([1, 4])
    })

    it('newsletter berdiri sendiri bila tidak tepat setelah tulisan terbaru, judul blok mengganti judul global', () => {
      const bagian = susunBeranda([blok.hero, { ...blok.newsletter, judul: 'Langganan intinya' }], sumber)
      expect(bagian[1]).toEqual({ jenis: 'newsletter', id: 'n', newsletter: { ...newsletter, judul: 'Langganan intinya' } })
      expect(susunBeranda([blok.hero, blok.newsletter], { ...sumber, newsletter: null })).toHaveLength(1)
    })

    it('tanpa hero: hero bawaan di atas; hero kedua dibuang; blok kosong dilewati', () => {
      const kosong: SumberBeranda = { terbaru: [], video: [], tools: [], newsletter: null }
      const bagian = susunBeranda([blok.video, blok.palingDibaca, { ...blok.mozaik, artikel: [artikel(5, 'draft')] }], kosong)
      expect(bagian).toEqual([{ jenis: 'hero', id: 'hero-bawaan', ...HERO_BAWAAN }])
      expect(susunBeranda([blok.hero, { ...blok.hero, id: 'h2' }], kosong).filter((b) => b.jenis === 'hero')).toHaveLength(1)
    })

    it('pilihan video editor dipakai bila ada yang terbit; kotak tools bisa dimatikan', () => {
      const bagian = susunBeranda([blok.hero, { ...blok.video, video: [video(11), video(12, 'draft')] }, { ...blok.mozaik, tampilkanTools: false }], sumber)
      expect(bagian[1].jenis === 'video' && bagian[1].video.map((v) => v.href)).toEqual(['/video/video-11'])
      expect(bagian[2]).toMatchObject({ jenis: 'mozaik', tools: [] })
    })
  })
  ```

  `tests/int/beranda.int.spec.ts`

  ```ts
  import { afterAll, beforeAll, describe, expect, it } from 'vitest'

  import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'
  import { ambilBeranda } from '@/modules/konten/data'

  import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
  import { getTestPayload } from './helpers'

  describe('beranda dari global', () => {
    let tag: string[] = []

    beforeAll(() => {
      pakaiPemicuRevalidasi((t) => tag.push(t))
    })

    afterAll(() => {
      pakaiPemicuRevalidasi(null)
    })

    it('global beranda merevalidasi beranda dan sitemap; global newsletter merevalidasi beranda', async () => {
      const payload = await getTestPayload()
      tag = []
      await payload.updateGlobal({ slug: 'beranda', data: { tataLetak: [{ blockType: 'heroBeranda', judul: 'Intinya dulu.' }] } })
      expect(tag).toEqual(['beranda', 'sitemap'])
      tag = []
      await payload.updateGlobal({ slug: 'newsletter', data: { aktif: false } })
      expect(tag).toEqual(['beranda'])
    })

    it('blok editor dengan artikel terbit, tulisan terbaru di luar mozaik, dan newsletter di sampingnya', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const pilihan = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      const draf = await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft' } })
      const baru = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      await payload.updateGlobal({ slug: 'newsletter', data: { aktif: true, urlForm: 'https://contoh.kit.com/point', judul: 'Intinya, tiap Senin.' } })
      await payload.updateGlobal({
        slug: 'beranda',
        data: {
          tataLetak: [
            { blockType: 'heroBeranda', judul: 'Intinya dulu.', subjudul: 'Dijelaskan dari intinya.' },
            { blockType: 'mozaikPilihan', artikel: [pilihan.id, draf.id] },
            { blockType: 'palingDibaca', judul: 'Paling dibaca pekan ini', jumlah: 3 },
            { blockType: 'newsletterBlok' },
          ],
        },
      })

      const bagian = await ambilBeranda(payload)
      expect(bagian.map((b) => b.jenis)).toEqual(['hero', 'mozaik', 'terbaru'])
      const [, mozaik, terbaru] = bagian
      expect(mozaik.jenis === 'mozaik' && mozaik.artikel.map((k) => k.id)).toEqual([pilihan.id])
      expect(mozaik).toMatchObject({ tools: expect.any(Array) })
      expect(terbaru).toMatchObject({ judul: 'Tulisan terbaru', newsletter: { href: 'https://contoh.kit.com/point' } })
      expect(terbaru.jenis === 'terbaru' && terbaru.artikel[0].id).toBe(baru.id)
      expect(terbaru.jenis === 'terbaru' && terbaru.artikel.map((k) => k.id)).not.toContain(pilihan.id)
      await payload.updateGlobal({ slug: 'newsletter', data: { aktif: false } })
    })
  })
  ```

  Tools kini merevalidasi beranda, dan sitemap halaman selalu memuat beranda:

  ```diff
  diff --git a/tests/unit/tag.test.ts b/tests/unit/tag.test.ts
  index 32dcc58..787a8ff 100644
  --- a/tests/unit/tag.test.ts
  +++ b/tests/unit/tag.test.ts
  @@ -31,7 +31,10 @@ describe('tagRevalidasi', () => {
     it('koleksi yang tidak tampil di beranda tidak merevalidasi beranda', () => {
       expect(tagRevalidasi('penulis', { id: 3 })).toEqual(['penulis', 'penulis:3', 'sitemap'])
       expect(tagRevalidasi('halaman', { id: 4 })).toEqual(['halaman', 'halaman:4', 'sitemap'])
  -    expect(tagRevalidasi('tools', { id: 5 }, ['uang-karier'])).toEqual(['tools', 'tools:5', 'pilar:uang-karier', 'sitemap'])
  +  })
  +
  +  it('tools tampil di kotak "Hitung sendiri" beranda', () => {
  +    expect(tagRevalidasi('tools', { id: 5 }, ['uang-karier'])).toEqual(['tools', 'tools:5', 'pilar:uang-karier', 'beranda', 'sitemap'])
     })
   })
   
  ```

  ```diff
  diff --git a/tests/int/sitemap.int.spec.ts b/tests/int/sitemap.int.spec.ts
  index 0683db3..2df7f82 100644
  --- a/tests/int/sitemap.int.spec.ts
  +++ b/tests/int/sitemap.int.spec.ts
  @@ -76,6 +76,15 @@ describe('data rute teknis dari Payload', () => {
       expect(index[0].lastmod).toBeTruthy()
     })
   
  +  it('sitemap halaman selalu dimulai dengan beranda; lastmod ikut artikel yang terakhir terbit', async () => {
  +    const payload = await getTestPayload()
  +    const relasi = await siapkanRelasiArtikel(payload)
  +    const baru = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
  +    const [beranda] = await ambilEntriSitemap(payload, 'halaman', situs)
  +    expect(beranda.loc).toBe(url('/'))
  +    expect(new Date(beranda.lastmod as string).getTime()).toBeGreaterThanOrEqual(new Date(terbaru([baru.terbitPada]) as string).getTime())
  +  })
  +
     it('sitemap halaman memuat indeks /glosarium dengan lastmod istilah terbaru', async () => {
       const payload = await getTestPayload()
       const relasi = await siapkanRelasiArtikel(payload)
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/beranda.test.ts` dengan `Cannot find package '@/modules/konten/beranda'`, lalu FAIL di `tests/unit/tag.test.ts` (tes "tools tampil di kotak Hitung sendiri beranda") dengan `AssertionError: expected [ 'tools', 'tools:5', …(2) ] to deeply equal [ 'tools', 'tools:5', …(3) ]`.

- [ ] **Langkah 3: Field blok, hook global, dan tag**

  ```diff
  diff --git a/src/blocks/beranda.ts b/src/blocks/beranda.ts
  index d9f4946..e997ed2 100644
  --- a/src/blocks/beranda.ts
  +++ b/src/blocks/beranda.ts
  @@ -27,6 +27,13 @@ export const BlokMozaikPilihan: Block = {
         maxRows: 5,
         admin: { description: 'Urutan pertama tampil paling besar.' },
       },
  +    {
  +      name: 'tampilkanTools',
  +      type: 'checkbox',
  +      label: 'Tampilkan kotak "Hitung sendiri"',
  +      defaultValue: true,
  +      admin: { description: 'Daftar kalkulator terbit di baris kedua mozaik.' },
  +    },
     ],
   }
   
  @@ -45,7 +52,12 @@ export const BlokPalingDibaca: Block = {
     interfaceName: 'BlokPalingDibaca',
     labels: { singular: 'Paling dibaca', plural: 'Paling dibaca' },
     fields: [
  -    { name: 'judul', type: 'text', defaultValue: 'Paling dibaca pekan ini' },
  +    {
  +      name: 'judul',
  +      type: 'text',
  +      defaultValue: 'Paling dibaca pekan ini',
  +      admin: { description: 'Sementara data pembaca belum tersedia, blok ini menampilkan tulisan terbaru dengan judul "Tulisan terbaru".' },
  +    },
       { name: 'jumlah', type: 'number', defaultValue: 4, min: 1, max: 10 },
     ],
   }
  ```

  ```diff
  diff --git a/src/hooks/revalidasiPublik.ts b/src/hooks/revalidasiPublik.ts
  index 996ea02..a9d872a 100644
  --- a/src/hooks/revalidasiPublik.ts
  +++ b/src/hooks/revalidasiPublik.ts
  @@ -162,6 +162,15 @@ export function revalidasiGlobal(tag: string[]): GlobalAfterChangeHook {
   /** Pengaturan SEO memengaruhi robots.txt, metadata semua halaman, dan URL absolut di sitemap. */
   export const revalidasiPengaturanSeo = revalidasiGlobal([TAG.pengaturanSeo, TAG.sitemap])
   
  +/**
  + * Beranda dirender dari global `beranda`; `lastmod` beranda di sitemap halaman ikut tanggal global itu.
  + * Menyimpan draf global juga memicu ini, dan itu murah: beranda hanya dirender ulang sekali.
  + */
  +export const revalidasiBeranda = revalidasiGlobal([TAG.beranda, TAG.sitemap])
  +
  +/** Blok newsletter beranda membaca global `newsletter`. */
  +export const revalidasiNewsletter = revalidasiGlobal([TAG.beranda])
  +
   /** Header dan footer dirender layout di semua halaman publik. */
   export const revalidasiHeader = revalidasiGlobal([TAG.header])
   export const revalidasiFooter = revalidasiGlobal([TAG.footer])
  ```

  ```diff
  diff --git a/src/globals/Beranda.ts b/src/globals/Beranda.ts
  index 52b0f0d..06b4402 100644
  --- a/src/globals/Beranda.ts
  +++ b/src/globals/Beranda.ts
  @@ -2,6 +2,7 @@ import type { GlobalConfig } from 'payload'
   
   import { anyone, isAdmin } from '@/access'
   import { blokBeranda } from '@/blocks/beranda'
  +import { revalidasiBeranda } from '@/hooks/revalidasiPublik'
   
   export const Beranda: GlobalConfig = {
     slug: 'beranda',
  @@ -9,5 +10,6 @@ export const Beranda: GlobalConfig = {
     admin: { group: 'Tampilan' },
     access: { read: anyone, update: isAdmin },
     versions: { drafts: true, max: 20 },
  +  hooks: { afterChange: [revalidasiBeranda] },
     fields: [{ name: 'tataLetak', type: 'blocks', label: 'Tata letak', blocks: blokBeranda }],
   }
  ```

  ```diff
  diff --git a/src/globals/Newsletter.ts b/src/globals/Newsletter.ts
  index fcc2b0f..22d6b99 100644
  --- a/src/globals/Newsletter.ts
  +++ b/src/globals/Newsletter.ts
  @@ -1,6 +1,7 @@
   import type { GlobalConfig } from 'payload'
   
   import { anyone, isAdmin } from '@/access'
  +import { revalidasiNewsletter } from '@/hooks/revalidasiPublik'
   import { validasiUrlOpsional } from '@/lib/validasi'
   
   export const Newsletter: GlobalConfig = {
  @@ -8,6 +9,7 @@ export const Newsletter: GlobalConfig = {
     label: 'Newsletter',
     admin: { group: 'Tampilan' },
     access: { read: anyone, update: isAdmin },
  +  hooks: { afterChange: [revalidasiNewsletter] },
     fields: [
       { name: 'aktif', type: 'checkbox', defaultValue: false },
       {
  ```

  ```diff
  diff --git a/src/lib/tag.ts b/src/lib/tag.ts
  index 0d1e57c..8e5d3f6 100644
  --- a/src/lib/tag.ts
  +++ b/src/lib/tag.ts
  @@ -27,8 +27,8 @@ export const TAG = {
     pilar: (slug: string) => `pilar:${slug}`,
   } as const
   
  -/** Koleksi yang tampil di beranda (mozaik artikel, strip video, menu pilar). */
  -const DI_BERANDA: ReadonlySet<KoleksiPublik> = new Set(['artikel', 'pilar', 'video'])
  +/** Koleksi yang tampil di beranda (mozaik dan tulisan terbaru, strip video, warna pilar, kotak "Hitung sendiri"). */
  +const DI_BERANDA: ReadonlySet<KoleksiPublik> = new Set(['artikel', 'pilar', 'video', 'tools'])
   
   export type DokumenTag = { id: number | string; slug?: string | null }
   
  ```

  Lalu jalankan:

  ```bash
  npm run generate:types
  git diff --stat src/payload-types.ts
  ```

  Hasil yang diharapkan: `src/payload-types.ts | 8 ++++++++` (field `tampilkanTools` di `BlokMozaikPilihan` dan select-nya, deskripsi judul `BlokPalingDibaca`).

- [ ] **Langkah 4: Data beranda dan sitemap**

  ```diff
  diff --git a/src/modules/konten/tipe.ts b/src/modules/konten/tipe.ts
  index 1ba2353..82468c8 100644
  --- a/src/modules/konten/tipe.ts
  +++ b/src/modules/konten/tipe.ts
  @@ -125,3 +125,14 @@ export type ItemTools = { id: number; nama: string; href: string; ringkasan: str
   
   /** Kalkulator per pilar di `/tools`, urut sesuai urutan pilar di CMS. */
   export type KelompokTools = { pilar: PilarRingkas; tools: ItemTools[] }
  +
  +/** Ajakan newsletter: pendaftaran di form penyedia (global `newsletter`), bukan di point. */
  +export type DataNewsletter = { judul: string; teks: string | null; href: string }
  +
  +/** Bagian beranda siap render, urut sesuai global `beranda`. `id` dari blok Payload. */
  +export type BagianBeranda =
  +  | { jenis: 'hero'; id: string; judul: string; subjudul: string | null; placeholder: string }
  +  | { jenis: 'mozaik'; id: string; judul: string | null; artikel: KartuArtikel[]; tools: ItemTools[] }
  +  | { jenis: 'video'; id: string; judul: string; video: KartuVideo[] }
  +  | { jenis: 'terbaru'; id: string; judul: string; artikel: KartuArtikel[]; newsletter: DataNewsletter | null }
  +  | { jenis: 'newsletter'; id: string; newsletter: DataNewsletter }
  ```

  `src/modules/konten/beranda.ts`

  ```ts
  import type { Artikel, Beranda, Newsletter, Video } from '@/payload-types'

  import { kartuArtikel } from './artikel'
  import type { BagianBeranda, DataNewsletter, ItemTools, KartuArtikel, KartuVideo } from './tipe'
  import { kartuVideo } from './video'

  /** Hero bila editor menghapus blok hero: beranda tetap punya H1 dan pencarian. */
  export const HERO_BAWAAN = { judul: 'Intinya dulu.', subjudul: null, placeholder: 'misal: cara hitung THR' } as const

  /**
   * Judul blok "Paling dibaca" selama data kunjungan belum ada (Rencana 6): isinya tulisan terbaru,
   * jadi judulnya juga jujur menyebut itu, apa pun isian editor.
   */
  export const JUDUL_TERBARU = 'Tulisan terbaru'

  export const JUDUL_VIDEO_BAWAAN = 'Intinya dalam 45 detik'
  export const MAKS_VIDEO_BERANDA = 4
  export const JUMLAH_TERBARU_BAWAAN = 4

  /** Kartu terbaru yang dimuat untuk beranda: blok terbaru terbesar (10) ditambah mozaik terbesar (5). */
  export const MAKS_TERBARU_BERANDA = 15

  /** Data yang tidak disimpan di global `beranda` tetapi ditampilkan bloknya. */
  export type SumberBeranda = {
    terbaru: KartuArtikel[]
    video: KartuVideo[]
    tools: ItemTools[]
    newsletter: DataNewsletter | null
  }

  type Blok = NonNullable<Beranda['tataLetak']>[number]

  const ambil = <T extends object>(relasi: T | number | null | undefined): T | null => (relasi && typeof relasi === 'object' ? relasi : null)

  /** Newsletter tampil hanya bila aktif dan punya URL form penyedia (spesifikasi §17: penyedia eksternal). */
  export function susunNewsletter(global: Pick<Newsletter, 'aktif' | 'urlForm' | 'judul' | 'deskripsi'>): DataNewsletter | null {
    const href = global.urlForm?.trim()
    if (!global.aktif || !href || !/^https:\/\//.test(href)) return null
    return { judul: global.judul?.trim() || 'Intinya, tiap Senin.', teks: global.deskripsi?.trim() || null, href }
  }

  function kartuMozaik(relasi: (number | Artikel)[]): KartuArtikel[] {
    return relasi
      .map((r) => ambil(r))
      .filter((d): d is Artikel => d?._status === 'published')
      .map(kartuArtikel)
      .filter((k): k is KartuArtikel => k !== null)
  }

  function kartuStrip(relasi: (number | Video)[] | null | undefined): KartuVideo[] {
    return (relasi ?? [])
      .map((r) => ambil(r))
      .filter((v): v is Video => v?._status === 'published')
      .map(kartuVideo)
      .filter((k): k is KartuVideo => k !== null)
  }

  /**
   * Blok global `beranda` (depth 2) menjadi bagian yang siap dirender, dengan urutan dari editor.
   *
   * - Hanya hero pertama yang dipakai (satu H1); tanpa hero, `HERO_BAWAAN` dipasang paling atas.
   * - Mozaik memakai artikel terbit pilihan editor; kotak "Hitung sendiri" berisi tools terbit.
   * - Strip video memakai pilihan editor, cadangannya video terbit terbaru.
   * - "Paling dibaca" menampilkan tulisan terbaru di luar mozaik dengan judul `JUDUL_TERBARU`.
   * - Newsletter hanya bila global `newsletter` aktif; bila tepat setelah tulisan terbaru, ia menjadi
   *   kolom samping blok itu (seperti mockup).
   * - Slot iklan belum dirender (Rencana 8) supaya tidak ada ruang kosong.
   * - Blok yang isinya kosong dilewati.
   */
  export function susunBeranda(tataLetak: Blok[], sumber: SumberBeranda): BagianBeranda[] {
    const diMozaik = new Set(
      tataLetak.flatMap((b) => (b.blockType === 'mozaikPilihan' ? kartuMozaik(b.artikel).map((k) => k.id) : [])),
    )
    const bagian: BagianBeranda[] = []
    let adaHero = false
    for (const [i, blok] of tataLetak.entries()) {
      const id = blok.id ?? `blok-${i}`
      switch (blok.blockType) {
        case 'heroBeranda':
          if (adaHero) break
          adaHero = true
          bagian.push({
            jenis: 'hero',
            id,
            judul: blok.judul.trim() || HERO_BAWAAN.judul,
            subjudul: blok.subjudul?.trim() || null,
            placeholder: blok.placeholderCari?.trim() || HERO_BAWAAN.placeholder,
          })
          break
        case 'mozaikPilihan': {
          const artikel = kartuMozaik(blok.artikel)
          if (artikel.length === 0) break
          bagian.push({ jenis: 'mozaik', id, judul: blok.judul?.trim() || null, artikel, tools: blok.tampilkanTools === false ? [] : sumber.tools })
          break
        }
        case 'stripVideo': {
          const pilihan = kartuStrip(blok.video)
          const video = pilihan.length > 0 ? pilihan : sumber.video.slice(0, MAKS_VIDEO_BERANDA)
          if (video.length > 0) bagian.push({ jenis: 'video', id, judul: blok.judul?.trim() || JUDUL_VIDEO_BAWAAN, video })
          break
        }
        case 'palingDibaca': {
          const artikel = sumber.terbaru.filter((k) => !diMozaik.has(k.id)).slice(0, blok.jumlah ?? JUMLAH_TERBARU_BAWAAN)
          if (artikel.length > 0) bagian.push({ jenis: 'terbaru', id, judul: JUDUL_TERBARU, artikel, newsletter: null })
          break
        }
        case 'newsletterBlok': {
          if (!sumber.newsletter) break
          const newsletter = {
            ...sumber.newsletter,
            judul: blok.judul?.trim() || sumber.newsletter.judul,
            teks: blok.teks?.trim() || sumber.newsletter.teks,
          }
          const sebelumnya = bagian.at(-1)
          if (sebelumnya?.jenis === 'terbaru' && !sebelumnya.newsletter) sebelumnya.newsletter = newsletter
          else bagian.push({ jenis: 'newsletter', id, newsletter })
          break
        }
        case 'slotIklan':
          break
      }
    }
    if (!adaHero) bagian.unshift({ jenis: 'hero', id: 'hero-bawaan', ...HERO_BAWAAN })
    return bagian
  }
  ```

  ```diff
  diff --git a/src/modules/konten/data.ts b/src/modules/konten/data.ts
  index 35001cb..e16d8cc 100644
  --- a/src/modules/konten/data.ts
  +++ b/src/modules/konten/data.ts
  @@ -4,6 +4,7 @@ import type { Artikel } from '@/payload-types'
   import { validasiFormatSlug } from '@/lib/slug'
   
   import { gabungTerkait, kartuArtikel, MAKS_TERKAIT, susunArtikel } from './artikel'
  +import { MAKS_TERBARU_BERANDA, MAKS_VIDEO_BERANDA, susunBeranda, susunNewsletter } from './beranda'
   import { kataKueri, MAKS_HASIL_CARI, urutkanHasil } from './cari'
   import { kelompokkanIstilah } from './glosarium'
   import { susunHalaman } from './halaman'
  @@ -15,6 +16,7 @@ import { susunFooter, susunHeader } from './tampilan'
   import { kelompokkanTools } from './tools'
   import { kartuVideo, MAKS_VIDEO_INDEKS, MAKS_VIDEO_LAIN, susunVideo } from './video'
   import type {
  +  BagianBeranda,
     DataArtikel,
     DataFooter,
     DataHalaman,
  @@ -306,3 +308,26 @@ export async function cariArtikel(payload: Payload, kueri: string): Promise<Kart
     })
     return urutkanHasil(kueri, docs.map(kartuArtikel).filter((k): k is KartuArtikel => k !== null))
   }
  +
  +/** Relasi blok beranda (depth 2): kartu artikel dengan pilarnya, video dengan file dan posternya. */
  +const POPULATE_BERANDA = {
  +  artikel: POPULATE_ARTIKEL.artikel,
  +  video: { judul: true, slug: true, durasiDetik: true, pilar: true, file: true, poster: true, _status: true },
  +  pilar: POPULATE_ARTIKEL.pilar,
  +  media: POPULATE_VIDEO.media,
  +} as const
  +
  +/**
  + * Beranda: blok global `beranda` (versi yang tersimpan tanpa draf) ditambah data yang tidak disimpan
  + * di global itu: tulisan terbaru, video terbaru (cadangan strip video), tools terbit, dan newsletter.
  + */
  +export async function ambilBeranda(payload: Payload): Promise<BagianBeranda[]> {
  +  const beranda = await payload.findGlobal({ slug: 'beranda', depth: 2, populate: POPULATE_BERANDA })
  +  const newsletter = await payload.findGlobal({ slug: 'newsletter', depth: 0 })
  +  return susunBeranda(beranda.tataLetak ?? [], {
  +    terbaru: await kartuTerbit(payload, [], MAKS_TERBARU_BERANDA),
  +    video: await kartuVideoTerbit(payload, [], MAKS_VIDEO_BERANDA),
  +    tools: (await ambilTools(payload)).flatMap((k) => k.tools),
  +    newsletter: susunNewsletter(newsletter),
  +  })
  +}
  ```

  ```diff
  diff --git a/src/modules/konten/cache.ts b/src/modules/konten/cache.ts
  index 38b80b4..548221b 100644
  --- a/src/modules/konten/cache.ts
  +++ b/src/modules/konten/cache.ts
  @@ -7,6 +7,7 @@ import { ambilSitus } from '@/modules/seo/situs'
   
   import {
     ambilArtikel,
  +  ambilBeranda,
     ambilDaftarVideo,
     ambilFooter,
     ambilGlosarium,
  @@ -135,3 +136,12 @@ export const muatCari = unstable_cache(async (kueri: string) => cariArtikel(awai
     tags: [TAG.koleksi('artikel'), TAG.koleksi('pilar')],
     revalidate: SEJAM,
   })
  +
  +/**
  + * Beranda. Tag `beranda` dibuang saat global beranda atau newsletter disimpan dan saat artikel, pilar,
  + * video, atau tools terbit (`tagRevalidasi`); `media` untuk poster video.
  + */
  +export const muatBeranda = unstable_cache(async () => ambilBeranda(await payload()), ['konten', 'beranda'], {
  +  tags: [TAG.beranda, TAG.media],
  +  revalidate: SEJAM,
  +})
  ```

  ```diff
  diff --git a/src/modules/konten/index.ts b/src/modules/konten/index.ts
  index e6ffdde..500787d 100644
  --- a/src/modules/konten/index.ts
  +++ b/src/modules/konten/index.ts
  @@ -10,6 +10,7 @@
    */
   export {
     muatArtikel,
  +  muatBeranda,
     muatCari,
     muatDaftarVideo,
     muatFooter,
  @@ -27,6 +28,7 @@ export {
   } from './cache'
   export {
     ambilArtikel,
  +  ambilBeranda,
     ambilDaftarVideo,
     ambilFooter,
     ambilGlosarium,
  @@ -41,6 +43,17 @@ export {
     cariRedirect,
   } from './data'
   export { kataKueri, MAKS_HASIL_CARI, MAKS_KATA, MAKS_KUERI, rapikanKueri, urutkanHasil } from './cari'
  +export {
  +  HERO_BAWAAN,
  +  JUDUL_TERBARU,
  +  JUDUL_VIDEO_BAWAAN,
  +  JUMLAH_TERBARU_BAWAAN,
  +  MAKS_TERBARU_BERANDA,
  +  MAKS_VIDEO_BERANDA,
  +  susunBeranda,
  +  susunNewsletter,
  +  type SumberBeranda,
  +} from './beranda'
   export { itemTools, kelompokkanTools } from './tools'
   export { kartuVideo, labelDurasi, MAKS_VIDEO_INDEKS, MAKS_VIDEO_LAIN, susunVideo } from './video'
   export { MAKS_ARTIKEL_PENULIS, susunPenulis } from './penulis'
  ```

  ```diff
  diff --git a/src/modules/seo/data.ts b/src/modules/seo/data.ts
  index 5262da5..53fcc14 100644
  --- a/src/modules/seo/data.ts
  +++ b/src/modules/seo/data.ts
  @@ -106,11 +106,23 @@ async function ambilEntriSubkategori(payload: Payload, situs: Pick<PengaturanSit
   }
   
   /**
  - * Halaman indeks tanpa dokumen sendiri ikut sitemap halaman bila ada isinya, dengan `lastmod` isi
  - * terbarunya: `/glosarium` (istilah, `diperbaruiBesar ?? terbitPada` seperti artikel), `/tools` dan
  - * `/video` (`updatedAt`, koleksi itu tidak punya tanggal terbit).
  + * Halaman indeks tanpa dokumen sendiri ikut sitemap halaman. Beranda `/` selalu ada, dengan `lastmod`
  + * terbaru dari global `beranda` dan artikel yang terakhir terbit (beranda menampilkan tulisan
  + * terbaru). Indeks lain hanya bila ada isinya, dengan `lastmod` isi terbarunya: `/glosarium`
  + * (istilah, `diperbaruiBesar ?? terbitPada` seperti artikel), `/tools` dan `/video` (`updatedAt`,
  + * koleksi itu tidak punya tanggal terbit).
    */
   async function ambilEntriIndeks(payload: Payload, situs: Pick<PengaturanSitus, 'urlSitus'>): Promise<EntriSitemap[]> {
  +  const beranda = await payload.findGlobal({ slug: 'beranda', depth: 0, select: { updatedAt: true } })
  +  const artikelBaru = await payload.find({
  +    collection: 'artikel',
  +    where: syaratSitemap('artikel'),
  +    sort: '-terbitPada',
  +    depth: 0,
  +    limit: 1,
  +    pagination: false,
  +    select: { terbitPada: true },
  +  })
     const istilah = await payload.find({
       collection: 'artikel',
       where: { and: [syaratSitemap('artikel'), { tipe: { equals: 'glosarium' } }] },
  @@ -140,9 +152,12 @@ async function ambilEntriIndeks(payload: Payload, situs: Pick<PengaturanSitus, '
       [PATH_INDEKS.tools, tools.docs.map((d) => d.updatedAt)],
       [PATH_INDEKS.video, video.docs.map((d) => d.updatedAt)],
     ]
  -  return indeks
  -    .filter(([, tanggal]) => tanggal.length > 0)
  -    .map(([path, tanggal]) => ({ loc: new URL(path, situs.urlSitus).toString(), lastmod: terbaru(tanggal) }))
  +  return [
  +    { loc: new URL('/', situs.urlSitus).toString(), lastmod: terbaru([beranda.updatedAt, ...artikelBaru.docs.map((d) => d.terbitPada)]) },
  +    ...indeks
  +      .filter(([, tanggal]) => tanggal.length > 0)
  +      .map(([path, tanggal]) => ({ loc: new URL(path, situs.urlSitus).toString(), lastmod: terbaru(tanggal) })),
  +  ]
   }
   
   /** Isi sitemap index: semua jenis, `lastmod` = entri terbaru jenis itu. Jenis kosong tetap dicantumkan. */
  ```

- [ ] **Langkah 5: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 42 passed (42)`, `Tests 281 passed (281)`; integrasi `Test Files 24 passed (24)`, `Tests 72 passed (72)`.

- [ ] **Langkah 6: Dorong skema ke database dev dan jalankan E2E**

  Jalankan:

  ```bash
  npm run seed
  npm run test:e2e
  ```

  Hasil yang diharapkan: seed selesai tanpa pertanyaan (kolom baru saja); E2E tetap `62 passed` (beranda baru dirender di Task 8).

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/blocks/beranda.ts src/globals src/hooks/revalidasiPublik.ts src/lib/tag.ts src/modules/konten src/modules/seo/data.ts src/payload-types.ts tests/unit/beranda.test.ts tests/unit/tag.test.ts tests/int/beranda.int.spec.ts tests/int/sitemap.int.spec.ts
  git commit -m "feat(konten): data beranda dari global beranda, revalidasi beranda dan newsletter, / di sitemap halaman"
  ```

### Task 8: Beranda dari global `beranda`: hero dan pencarian, mozaik, strip video, tulisan terbaru, newsletter

**Files:**
- Create: `src/components/beranda/Beranda.tsx`, `src/components/beranda/HeroBeranda.tsx`, `src/components/beranda/MozaikPilihan.tsx`, `src/components/beranda/StripVideo.tsx`, `src/components/beranda/TerbaruBeranda.tsx`, `src/components/beranda/KotakNewsletter.tsx`, `src/components/beranda/Beranda.module.css`
- Modify: `src/app/(frontend)/page.tsx`, `src/styles/tokens.css`, `src/components/kartu/KartuArtikel.tsx`, `src/components/kartu/KartuArtikel.module.css`, `src/components/video/KartuVideo.tsx`, `src/components/video/Video.module.css`, `tests/e2e/data.ts`, `tests/e2e/siapkan.ts`
- Delete: `src/app/(frontend)/page.module.css`
- Test: `tests/unit/beranda-tampilan.test.ts`, `tests/e2e/beranda.spec.ts`

**Interfaces:**
- Consumes: `muatBeranda`, `BagianBeranda`, `DataNewsletter`, `ItemTools` (Task 5 dan 7), `FormCari` (Task 6), `DaftarVideo` (Task 4), `KartuArtikel`, `Tautan`, `Ikon`, `JsonLd` (4A), `metadata({ jenis: 'beranda' })` dan `jsonLd({ jenis: 'beranda' })` (Rencana 3: judul default, RSS, kode verifikasi, Organization + WebSite).
- Produces:
  - Token semantik `--latar-terbalik` (ink) dan `--teks-terbalik` (paper) untuk permukaan gelap.
  - `KartuArtikel({ kartu, tingkat?, ukuran?: 'besar' | 'sedang' })`, `KartuVideo` dan `DaftarVideo` dengan prop `gelap`.
  - Komponen `Beranda({ bagian, situs })` dan bagian-bagiannya; beranda `/` menggantikan beranda sementara Rencana 4A.
  - E2E: artikel Belajar (`SLUG.belajar`) dan Tekno (`SLUG.tekno`), global `newsletter` aktif ke `https://point.kit.com/intinya`, dan global `beranda` dengan hero, mozaik (panduan, Belajar, Sehat, Tekno), strip video, paling dibaca, slot iklan, newsletter.

Tata letak mengikuti mockup Arah 3 "Kartu Intinya" (`Kartu.dc.html`):

- **Hero:** "INTINYA DULU." (token display, `uppercase`), kalimat pembuka 34ch, dan `FormCari` besar (input 56 px, tombol 60 px) yang sejajar bawah dengan kalimat pembuka di desktop. Placeholder dari CMS.
- **Mozaik:** baris pertama kartu besar (judul seukuran H1, label pilar berupa pil, judul dan Intinya turun ke bawah kartu, tinggi minimal 440 px) dan dua kartu samping; baris kedua kartu keempat dan kelima (ukuran sedang) bersama kotak "Hitung sendiri" (garis 2 px, pil tools 52 px, "Semua tools" ke `/tools`, catatan rumus dan sumber). Baris memakai `flex-wrap` dengan basis lebar seperti mockup, bukan grid `grid-row: span`, jadi 1 sampai 5 kartu tidak meninggalkan sel kosong. Dua kartu samping bertumpuk di desktop dan HP, berdampingan di tablet. Pil label kartu besar memakai `--pilar-teks` sebagai latar dan `--pilar` sebagai teks: putih/hijau 5,32:1, putih/oranye 5,18:1, ink/kuning 11,27:1, ink/koral 8,27:1.
- **Strip video:** selebar layar, latar `--latar-terbalik`, judul "INTINYA DALAM 45 DETIK" (`clamp(36px, 5vw, 64px)`), "Semua video" ke `/video`, kartu 9:16 dengan teks terang. Di dalam strip, `--fokus` diganti warna terang supaya cincin fokus tetap terlihat.
- **Tulisan terbaru:** daftar bergaris dengan titik warna pilar dan nama pilarnya (warna tidak pernah sendirian), newsletter di kolom samping.
- **Newsletter:** kotak sand dengan judul, teks, dan tombol "Langganan gratis" ke form penyedia (ikon panah keluar dan teks pembaca layar "form penyedia newsletter").

Bagian dirender sesuai urutan editor, masing-masing membawa kontainernya sendiri. Jarak antarbagian hanya dari `margin-top` kelas `.bagian` (56 px, 40 px tepat setelah hero), jadi urutan apa pun tidak menghasilkan celah ganda; tes E2E mengukur jarak hero, mozaik, strip, dan tulisan terbaru di 375 dan 1440 px, serta posisi kartu mozaik di 768 px.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/beranda-tampilan.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it, vi } from 'vitest'

  import { Beranda } from '@/components/beranda/Beranda'
  import type { BagianBeranda, KartuArtikel } from '@/modules/konten/tipe'

  import { situs } from './seo-contoh'

  vi.mock('next/image', () => ({
    default: (props: Record<string, unknown>) => h('img', { src: props.src, alt: props.alt, width: props.width, height: props.height }),
  }))

  const pilar = { nama: 'Uang & Karier', slug: 'uang-karier', href: '/uang-karier', warna: 'hijau' as const, disclaimer: null }
  const kartu = (id: number): KartuArtikel => ({ id, judul: `Artikel ${id}`, href: `/artikel-${id}`, tipe: 'panduan', pilar, intinya: `Intinya ${id}.` })
  const newsletter = { judul: 'Intinya, tiap Senin.', teks: 'Lima tulisan terbaik pekan ini.', href: 'https://point.kit.com/intinya' }

  const bagian: BagianBeranda[] = [
    { jenis: 'hero', id: 'h', judul: 'Intinya dulu.', subjudul: 'Dijelaskan dari intinya.', placeholder: 'misal: cara hitung THR' },
    {
      jenis: 'mozaik',
      id: 'm',
      judul: null,
      artikel: [1, 2, 3, 4].map(kartu),
      tools: [{ id: 9, nama: 'Gaji Bersih', href: '/tools/gaji-bersih', ringkasan: 'Hitung gaji bersih.' }],
    },
    { jenis: 'video', id: 'v', judul: 'Intinya dalam 45 detik', video: [{ id: 7, judul: 'Video 7', href: '/video/video-7', durasi: 45, pilar, poster: null }] },
    { jenis: 'terbaru', id: 't', judul: 'Tulisan terbaru', artikel: [kartu(5)], newsletter },
    { jenis: 'newsletter', id: 'n', newsletter },
  ]

  const html = renderToStaticMarkup(h(Beranda, { bagian, situs }))

  describe('Beranda', () => {
    it('hero: satu H1 dan form cari besar dengan placeholder dari CMS', () => {
      expect(html.match(/<h1/g)).toHaveLength(1)
      expect(html).toMatch(/<section aria-labelledby="judul-beranda" class="kontainer [^"]*"><h1 id="judul-beranda" class="[^"]*">Intinya dulu\.<\/h1>/)
      expect(html).toContain('placeholder="misal: cara hitung THR"')
      expect(html).toContain('"@type":"WebSite"')
    })

    it('mozaik: kartu besar, dua kartu samping, kartu sedang, dan kotak Hitung sendiri', () => {
      expect(html).toContain('<section aria-label="Pilihan redaksi"')
      expect(html.match(/class="[^"]*kartu[^"]* [^"]*besar[^"]*"/g)).toHaveLength(1)
      expect(html.match(/class="[^"]*kartu[^"]* [^"]*sedang[^"]*"/g)).toHaveLength(1)
      expect(html).toMatch(/<h2 class="[^"]*">Hitung sendiri<\/h2><a class="[^"]*" href="\/tools">Semua tools/)
      expect(html).toContain('<a href="/tools/gaji-bersih">Gaji Bersih</a>')
    })

    it('strip video gelap dengan tautan ke semua video', () => {
      expect(html).toMatch(/<section aria-labelledby="v-judul" class="[^"]*strip[^"]*">/)
      expect(html).toMatch(/<a class="[^"]*kartu[^"]* [^"]*gelap[^"]*" data-warna="hijau" href="\/video\/video-7">/)
      expect(html).toMatch(/href="\/video">Semua video/)
    })

    it('tulisan terbaru bertitik warna dengan nama pilar, newsletter di samping dan berdiri sendiri', () => {
      expect(html).toMatch(/<span class="[^"]*" data-warna="hijau" aria-hidden="true"><\/span><span class="[^"]*"><span class="[^"]*">Artikel 5<\/span><span class="[^"]*">Uang &amp; Karier<\/span>/)
      expect(html).toContain('<aside class="')
      expect(html.match(/href="https:\/\/point\.kit\.com\/intinya" rel="noopener"/g)).toHaveLength(2)
      expect(html).toContain('Langganan gratis<span class="sr"> (form penyedia newsletter)</span>')
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/beranda-tampilan.test.ts` dengan `Cannot find package '@/components/beranda/Beranda'`.

- [ ] **Langkah 3: Token, varian kartu, dan kartu video gelap**

  ```diff
  diff --git a/src/styles/tokens.css b/src/styles/tokens.css
  index 253bbac..835d952 100644
  --- a/src/styles/tokens.css
  +++ b/src/styles/tokens.css
  @@ -33,6 +33,9 @@
     --tombol: var(--ink);
     --tombol-teks: var(--paper);
     --fokus: var(--ink);
  +  /* Permukaan gelap: strip video beranda */
  +  --latar-terbalik: var(--ink);
  +  --teks-terbalik: var(--paper);
   
     /* Tipografi: satu keluarga variable (Archivo, sumbu wdth dan wght), di-host sendiri */
     --font-sans: var(--font-archivo), system-ui, sans-serif;
  ```

  ```diff
  diff --git a/src/components/kartu/KartuArtikel.tsx b/src/components/kartu/KartuArtikel.tsx
  index 90a7f1e..12f0326 100644
  --- a/src/components/kartu/KartuArtikel.tsx
  +++ b/src/components/kartu/KartuArtikel.tsx
  @@ -7,12 +7,13 @@ import gaya from './KartuArtikel.module.css'
   
   /**
    * Kartu artikel berlatar warna pilar (Arah 3 "Kartu Intinya"): label pilar, judul, dan poin Intinya
  - * pertama. Seluruh kartu satu tautan; judulnya heading supaya daftar kartu bisa dinavigasi.
  + * pertama. Seluruh kartu satu tautan; judulnya heading supaya daftar kartu bisa dinavigasi. `ukuran`
  + * untuk mozaik beranda: `besar` (kartu utama, judul seukuran H1) dan `sedang` (baris kedua).
    */
  -export function KartuArtikel({ kartu, tingkat = 'h3' }: { kartu: DataKartu; tingkat?: 'h2' | 'h3' }) {
  +export function KartuArtikel({ kartu, tingkat = 'h3', ukuran }: { kartu: DataKartu; tingkat?: 'h2' | 'h3'; ukuran?: 'besar' | 'sedang' }) {
     const Judul = tingkat
     return (
  -    <Tautan href={kartu.href} className={gaya.kartu} data-warna={kartu.pilar?.warna}>
  +    <Tautan href={kartu.href} className={ukuran ? `${gaya.kartu} ${gaya[ukuran]}` : gaya.kartu} data-warna={kartu.pilar?.warna}>
         {kartu.pilar && <span className={gaya.label}>{kartu.pilar.nama}</span>}
         <JudulBersama id={kartu.id}>
           <Judul className={gaya.judul}>{kartu.judul}</Judul>
  ```

  ```diff
  diff --git a/src/components/kartu/KartuArtikel.module.css b/src/components/kartu/KartuArtikel.module.css
  index ae04123..79c9e8b 100644
  --- a/src/components/kartu/KartuArtikel.module.css
  +++ b/src/components/kartu/KartuArtikel.module.css
  @@ -57,3 +57,49 @@
     font-size: var(--teks-kecil);
     font-weight: 600;
   }
  +
  +/* Kartu utama mozaik beranda: label pilar berupa pil, judul dan Intinya turun ke bawah kartu. */
  +.besar {
  +  min-height: 440px;
  +  padding: var(--ruang-8);
  +  gap: var(--ruang-4);
  +}
  +
  +.besar .label {
  +  align-self: flex-start;
  +  padding: 6px var(--ruang-3);
  +  border-radius: var(--radius-pil);
  +  background: var(--pilar-teks);
  +  color: var(--pilar);
  +}
  +
  +.besar .judul {
  +  margin-top: auto;
  +  font-size: var(--teks-h1);
  +  font-weight: 900;
  +  font-stretch: var(--lebar-h1);
  +  line-height: var(--tinggi-h1);
  +  letter-spacing: -0.02em;
  +}
  +
  +.besar .intinya {
  +  max-width: 46ch;
  +  font-size: 18px;
  +}
  +
  +.besar .tipe {
  +  margin-top: var(--ruang-2);
  +}
  +
  +/* Kartu baris kedua mozaik beranda. */
  +.sedang {
  +  min-height: 300px;
  +  padding: 28px;
  +}
  +
  +.sedang .judul {
  +  font-size: 34px;
  +  font-weight: 900;
  +  font-stretch: var(--lebar-h1);
  +  line-height: 1.02;
  +}
  ```

  ```diff
  diff --git a/src/components/video/KartuVideo.tsx b/src/components/video/KartuVideo.tsx
  index 83a2004..f4ad531 100644
  --- a/src/components/video/KartuVideo.tsx
  +++ b/src/components/video/KartuVideo.tsx
  @@ -13,13 +13,23 @@ const UKURAN_KARTU = '(min-width: 48rem) 280px, 50vw'
   
   /**
    * Kartu video vertikal 9:16 (mockup "Intinya dalam 45 detik"): poster, judul, dan durasi. Tanpa
  - * poster, kotak berwarna pilar menggantikannya.
  + * poster, kotak berwarna pilar menggantikannya. `gelap` untuk strip video berlatar ink di beranda.
    */
  -export function KartuVideo({ video, cloudName, tingkat = 'h3' }: { video: DataKartu; cloudName: string; tingkat?: 'h2' | 'h3' }) {
  +export function KartuVideo({
  +  video,
  +  cloudName,
  +  tingkat = 'h3',
  +  gelap = false,
  +}: {
  +  video: DataKartu
  +  cloudName: string
  +  tingkat?: 'h2' | 'h3'
  +  gelap?: boolean
  +}) {
     const Judul = tingkat
     const poster = propsGambar(video.poster, 'asli', { cloudName, lebar: 480 })
     return (
  -    <Tautan href={video.href} className={gaya.kartu} data-warna={video.pilar?.warna}>
  +    <Tautan href={video.href} className={gelap ? `${gaya.kartu} ${gaya.gelap}` : gaya.kartu} data-warna={video.pilar?.warna}>
         <span className={gaya.poster}>
           {poster && <Image {...poster} alt="" sizes={UKURAN_KARTU} />}
           <span className={gaya.putar}>
  @@ -32,12 +42,22 @@ export function KartuVideo({ video, cloudName, tingkat = 'h3' }: { video: DataKa
     )
   }
   
  -export function DaftarVideo({ video, cloudName, tingkat }: { video: DataKartu[]; cloudName: string; tingkat?: 'h2' | 'h3' }) {
  +export function DaftarVideo({
  +  video,
  +  cloudName,
  +  tingkat,
  +  gelap,
  +}: {
  +  video: DataKartu[]
  +  cloudName: string
  +  tingkat?: 'h2' | 'h3'
  +  gelap?: boolean
  +}) {
     return (
       <ul className={gaya.daftar}>
         {video.map((v) => (
           <li key={v.id} data-masuk="">
  -          <KartuVideo video={v} cloudName={cloudName} tingkat={tingkat} />
  +          <KartuVideo video={v} cloudName={cloudName} tingkat={tingkat} gelap={gelap} />
           </li>
         ))}
       </ul>
  ```

  ```diff
  diff --git a/src/components/video/Video.module.css b/src/components/video/Video.module.css
  index 81510c6..062488a 100644
  --- a/src/components/video/Video.module.css
  +++ b/src/components/video/Video.module.css
  @@ -64,6 +64,16 @@
     line-height: 1.25;
   }
   
  +/* Strip video beranda: teks terang di latar gelap, label durasi dibalik. */
  +.gelap {
  +  color: var(--teks-terbalik);
  +}
  +
  +.gelap .putar {
  +  background: var(--teks-terbalik);
  +  color: var(--latar-terbalik);
  +}
  +
   .halaman {
     display: grid;
     gap: var(--ruang-6);
  ```

- [ ] **Langkah 4: Komponen beranda**

  `src/components/beranda/Beranda.module.css`

  ```css
  /*
   * Beranda (mockup Arah 3 "Kartu Intinya"). Jarak antarbagian hanya dari `margin-top` `.bagian`
   * (56px, 40px tepat setelah hero), jadi editor bisa mengubah urutan blok tanpa celah ganda.
   */
  .hero {
    padding-top: var(--ruang-10);
  }

  .bagian {
    margin-top: var(--ruang-14);
  }

  .hero + .bagian {
    margin-top: var(--ruang-10);
  }

  .judulRaksasa {
    font-size: var(--teks-display);
    font-stretch: var(--lebar-display);
    line-height: var(--tinggi-display);
    letter-spacing: -0.035em;
    text-transform: uppercase;
  }

  .heroBaris {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: var(--ruang-6);
    margin-top: var(--ruang-6);
  }

  .pembuka {
    flex: 1 1 360px;
    max-width: 34ch;
    font-size: var(--teks-deck);
    line-height: 1.4;
  }

  .heroCari {
    flex: 1 1 420px;
    min-width: 0;
  }

  .subjudul {
    font-size: var(--teks-h2);
    font-stretch: var(--lebar-h2);
  }

  /* Mozaik: baris flex-wrap seperti mockup, bukan grid kartu seragam. */
  .mozaik {
    display: grid;
    gap: var(--ruang-4);
  }

  .baris {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ruang-4);
  }

  .utama {
    flex: 2 1 520px;
    display: flex;
  }

  .utama > *,
  .sedang > * {
    flex: 1;
  }

  /* Dua kartu samping bertumpuk saat kolomnya sempit (desktop, HP) dan berdampingan saat kolom
     selebar layar (tablet). Baris yang membungkus ikut meregang mengisi tinggi kartu utama. */
  .kolom {
    flex: 1 1 320px;
    display: flex;
    flex-wrap: wrap;
    gap: var(--ruang-4);
  }

  /* Kartu memakai `height: 100%` (KartuArtikel); di sini tinggi diatur baris flex, jadi selektornya
     lebih spesifik supaya tidak bergantung urutan file CSS. */
  .mozaik .kolom > * {
    flex: 1 1 280px;
    height: auto;
  }

  .sedang {
    flex: 1 1 280px;
    display: flex;
  }

  .tools {
    flex: 2 1 400px;
    display: flex;
    flex-direction: column;
    gap: var(--ruang-5);
    padding: 28px;
    border: var(--garis-tebal) solid var(--garis);
    border-radius: var(--radius-kartu);
  }

  .toolsKepala {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--ruang-2);
  }

  .toolsJudul {
    font-size: var(--teks-h2);
    font-stretch: var(--lebar-h2);
  }

  .semua {
    display: inline-flex;
    align-items: center;
    gap: var(--ruang-1);
    min-height: var(--sentuh-min);
    font-size: var(--teks-kecil);
    font-weight: 700;
  }

  .toolsDaftar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding: 0;
    list-style: none;
  }

  .toolsDaftar a {
    display: inline-flex;
    align-items: center;
    min-height: 52px;
    padding: 0 var(--ruang-5);
    border-radius: var(--radius-kontrol);
    background: var(--permukaan);
    font-size: 17px;
    font-weight: 700;
    text-decoration: none;
    transition: transform var(--durasi-cepat) var(--kurva);
  }

  .toolsDaftar a:hover {
    text-decoration: underline;
  }

  .toolsDaftar a:active {
    transform: scale(0.97);
  }

  .toolsCatatan {
    color: var(--teks-sekunder);
    font-size: var(--teks-kecil);
    line-height: 1.5;
  }

  /* Strip video gelap selebar layar. Fokus memakai warna terang supaya tetap terlihat. */
  .strip {
    --fokus: var(--teks-terbalik);
    background: var(--latar-terbalik);
    color: var(--teks-terbalik);
  }

  .stripIsi {
    padding-block: var(--ruang-12) var(--ruang-14);
  }

  .stripKepala {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--ruang-3);
    margin-bottom: var(--ruang-6);
  }

  .stripJudul {
    font-size: clamp(36px, 5vw, 64px);
    font-stretch: var(--lebar-display);
    line-height: 0.95;
    text-transform: uppercase;
  }

  /* Tulisan terbaru dan kolom samping (newsletter). */
  .terbaruBaris {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ruang-10);
  }

  .terbaru {
    flex: 2 1 520px;
    min-width: 0;
  }

  .terbaru .subjudul {
    margin-bottom: var(--ruang-3);
  }

  .daftar {
    padding: 0;
    list-style: none;
    border-bottom: var(--garis-tipis) solid var(--garis);
  }

  .item {
    display: flex;
    align-items: baseline;
    gap: 14px;
    padding-block: var(--ruang-4);
    border-top: var(--garis-tipis) solid var(--garis);
    text-decoration: none;
  }

  .item:hover .itemJudul {
    text-decoration: underline;
  }

  .titik {
    flex: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--pilar, var(--teks));
    box-shadow: inset 0 0 0 1px var(--garis);
  }

  .itemTeks {
    display: grid;
    gap: var(--ruang-1);
  }

  .itemJudul {
    font-size: 21px;
    font-weight: 700;
    line-height: 1.25;
  }

  .itemPilar {
    color: var(--teks-sekunder);
    font-size: var(--teks-label);
    font-weight: 800;
    letter-spacing: var(--jarak-label);
    text-transform: uppercase;
  }

  .samping {
    flex: 1 1 300px;
    display: flex;
    flex-direction: column;
    gap: var(--ruang-4);
  }

  .newsletter {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--ruang-3);
    padding: var(--ruang-6);
    border-radius: var(--radius-kartu);
    background: var(--permukaan);
  }

  .lepas {
    max-width: 640px;
  }

  .newsletterJudul {
    font-size: 26px;
    font-stretch: var(--lebar-h1);
  }

  .tombol {
    display: inline-flex;
    align-items: center;
    gap: var(--ruang-2);
    min-height: 52px;
    margin-top: var(--ruang-1);
    padding: 0 var(--ruang-6);
    border-radius: 12px;
    background: var(--tombol);
    color: var(--tombol-teks);
    font-weight: 700;
    text-decoration: none;
    transition: transform var(--durasi-cepat) var(--kurva);
  }

  .tombol:hover {
    text-decoration: underline;
  }

  .tombol:active {
    transform: scale(0.98);
  }
  ```

  `src/components/beranda/HeroBeranda.tsx`

  ```tsx
  import { FormCari } from '@/components/cari/FormCari'
  import type { BagianBeranda } from '@/modules/konten/tipe'

  import gaya from './Beranda.module.css'

  /** Judul raksasa, kalimat pembuka, dan pencarian besar (mockup Kartu Intinya). Satu-satunya H1 beranda. */
  export function HeroBeranda({ hero }: { hero: Extract<BagianBeranda, { jenis: 'hero' }> }) {
    return (
      <section aria-labelledby="judul-beranda" className={`kontainer ${gaya.hero}`}>
        <h1 id="judul-beranda" className={gaya.judulRaksasa}>
          {hero.judul}
        </h1>
        <div className={gaya.heroBaris}>
          {hero.subjudul && <p className={gaya.pembuka}>{hero.subjudul}</p>}
          <div className={gaya.heroCari}>
            <FormCari besar placeholder={hero.placeholder} />
          </div>
        </div>
      </section>
    )
  }
  ```

  `src/components/beranda/MozaikPilihan.tsx`

  ```tsx
  import { Ikon } from '@/components/dasar/Ikon'
  import { Tautan } from '@/components/dasar/Tautan'
  import { KartuArtikel } from '@/components/kartu/KartuArtikel'
  import { PATH_INDEKS } from '@/lib/paths'
  import type { BagianBeranda, ItemTools } from '@/modules/konten/tipe'

  import gaya from './Beranda.module.css'

  function KotakTools({ tools, tingkat }: { tools: ItemTools[]; tingkat: 'h2' | 'h3' }) {
    const Judul = tingkat
    return (
      <div className={gaya.tools} data-masuk="">
        <div className={gaya.toolsKepala}>
          <Judul className={gaya.toolsJudul}>Hitung sendiri</Judul>
          <Tautan href={PATH_INDEKS.tools} className={gaya.semua}>
            Semua tools
            <Ikon nama="arrow-right" ukuran={18} />
          </Tautan>
        </div>
        <ul className={gaya.toolsDaftar}>
          {tools.map((t) => (
            <li key={t.id}>
              <Tautan href={t.href}>{t.nama}</Tautan>
            </li>
          ))}
        </ul>
        <p className={gaya.toolsCatatan}>Setiap kalkulator disertai penjelasan rumus dan sumber aturannya.</p>
      </div>
    )
  }

  /**
   * Mozaik pilihan redaksi: kartu pertama paling besar, dua berikutnya bertumpuk di sampingnya, sisanya
   * di baris kedua bersama kotak "Hitung sendiri". Baris memakai flex-wrap, jadi jumlah kartu berapa pun
   * (1-5) tidak meninggalkan sel grid kosong.
   */
  export function MozaikPilihan({ mozaik }: { mozaik: Extract<BagianBeranda, { jenis: 'mozaik' }> }) {
    const [utama, ...lain] = mozaik.artikel
    const samping = lain.slice(0, 2)
    const bawah = lain.slice(2)
    const tingkat = mozaik.judul ? 'h3' : 'h2'
    return (
      <section
        aria-labelledby={mozaik.judul ? `${mozaik.id}-judul` : undefined}
        aria-label={mozaik.judul ? undefined : 'Pilihan redaksi'}
        className={`kontainer ${gaya.bagian} ${gaya.mozaik}`}
      >
        {mozaik.judul && (
          <h2 id={`${mozaik.id}-judul`} className={gaya.subjudul}>
            {mozaik.judul}
          </h2>
        )}
        <div className={gaya.baris}>
          <div className={gaya.utama}>
            <KartuArtikel kartu={utama} tingkat={tingkat} ukuran="besar" />
          </div>
          {samping.length > 0 && (
            <div className={gaya.kolom}>
              {samping.map((k) => (
                <KartuArtikel key={k.id} kartu={k} tingkat={tingkat} />
              ))}
            </div>
          )}
        </div>
        {(bawah.length > 0 || mozaik.tools.length > 0) && (
          <div className={`${gaya.baris} ${gaya.bawah}`}>
            {bawah.map((k) => (
              <div key={k.id} className={gaya.sedang} data-masuk="">
                <KartuArtikel kartu={k} tingkat={tingkat} ukuran="sedang" />
              </div>
            ))}
            {mozaik.tools.length > 0 && <KotakTools tools={mozaik.tools} tingkat={tingkat} />}
          </div>
        )}
      </section>
    )
  }
  ```

  `src/components/beranda/StripVideo.tsx`

  ```tsx
  import { Ikon } from '@/components/dasar/Ikon'
  import { Tautan } from '@/components/dasar/Tautan'
  import { DaftarVideo } from '@/components/video/KartuVideo'
  import { PATH_INDEKS } from '@/lib/paths'
  import type { BagianBeranda } from '@/modules/konten/tipe'

  import gaya from './Beranda.module.css'

  /** Strip video 9:16 berlatar gelap selebar layar ("Intinya dalam 45 detik"). */
  export function StripVideo({ strip, cloudName }: { strip: Extract<BagianBeranda, { jenis: 'video' }>; cloudName: string }) {
    return (
      <section aria-labelledby={`${strip.id}-judul`} className={`${gaya.bagian} ${gaya.strip}`}>
        <div className={`kontainer ${gaya.stripIsi}`}>
          <div className={gaya.stripKepala}>
            <h2 id={`${strip.id}-judul`} className={gaya.stripJudul}>
              {strip.judul}
            </h2>
            <Tautan href={PATH_INDEKS.video} className={gaya.semua}>
              Semua video
              <Ikon nama="arrow-right" ukuran={18} />
            </Tautan>
          </div>
          <DaftarVideo video={strip.video} cloudName={cloudName} gelap />
        </div>
      </section>
    )
  }
  ```

  `src/components/beranda/KotakNewsletter.tsx`

  ```tsx
  import { Ikon } from '@/components/dasar/Ikon'
  import { Tautan } from '@/components/dasar/Tautan'
  import type { DataNewsletter } from '@/modules/konten/tipe'

  import gaya from './Beranda.module.css'

  /**
   * Ajakan newsletter. Pendaftaran terjadi di form penyedia (URL dari global `newsletter`), jadi point.
   * tidak menyimpan email pembaca dan tidak ada form palsu. `lepas`: berdiri sendiri, bukan kolom samping.
   */
  export function KotakNewsletter({ newsletter, id, lepas = false }: { newsletter: DataNewsletter; id: string; lepas?: boolean }) {
    return (
      <section aria-labelledby={`${id}-judul`} className={lepas ? `${gaya.newsletter} ${gaya.lepas}` : gaya.newsletter}>
        <h2 id={`${id}-judul`} className={gaya.newsletterJudul}>
          {newsletter.judul}
        </h2>
        {newsletter.teks && <p>{newsletter.teks}</p>}
        <Tautan href={newsletter.href} className={gaya.tombol}>
          Langganan gratis
          <span className="sr"> (form penyedia newsletter)</span>
          <Ikon nama="arrow-up-right" />
        </Tautan>
      </section>
    )
  }
  ```

  `src/components/beranda/TerbaruBeranda.tsx`

  ```tsx
  import { Tautan } from '@/components/dasar/Tautan'
  import type { BagianBeranda } from '@/modules/konten/tipe'

  import gaya from './Beranda.module.css'
  import { KotakNewsletter } from './KotakNewsletter'

  /**
   * Daftar tulisan terbaru bertitik warna pilar (posisi "Paling dibaca" di mockup, sampai data kunjungan
   * ada di Rencana 6), dengan newsletter di kolom samping bila editor meletakkannya tepat setelahnya.
   */
  export function TerbaruBeranda({ terbaru }: { terbaru: Extract<BagianBeranda, { jenis: 'terbaru' }> }) {
    return (
      <div className={`kontainer ${gaya.bagian} ${gaya.terbaruBaris}`}>
        <section aria-labelledby={`${terbaru.id}-judul`} className={gaya.terbaru}>
          <h2 id={`${terbaru.id}-judul`} className={gaya.subjudul}>
            {terbaru.judul}
          </h2>
          <ul className={gaya.daftar}>
            {terbaru.artikel.map((k) => (
              <li key={k.id}>
                <Tautan href={k.href} className={gaya.item}>
                  <span className={gaya.titik} data-warna={k.pilar?.warna} aria-hidden="true" />
                  <span className={gaya.itemTeks}>
                    <span className={gaya.itemJudul}>{k.judul}</span>
                    {k.pilar && <span className={gaya.itemPilar}>{k.pilar.nama}</span>}
                  </span>
                </Tautan>
              </li>
            ))}
          </ul>
        </section>
        {terbaru.newsletter && (
          <aside className={gaya.samping} aria-label="Newsletter">
            <KotakNewsletter newsletter={terbaru.newsletter} id={`${terbaru.id}-newsletter`} />
          </aside>
        )}
      </div>
    )
  }
  ```

  `src/components/beranda/Beranda.tsx`

  ```tsx
  import { JsonLd } from '@/components/dasar/JsonLd'
  import type { BagianBeranda } from '@/modules/konten/tipe'
  import { jsonLd } from '@/modules/seo/jsonld'
  import type { Situs } from '@/modules/seo/tipe'

  import gaya from './Beranda.module.css'
  import { HeroBeranda } from './HeroBeranda'
  import { KotakNewsletter } from './KotakNewsletter'
  import { MozaikPilihan } from './MozaikPilihan'
  import { StripVideo } from './StripVideo'
  import { TerbaruBeranda } from './TerbaruBeranda'

  /**
   * Beranda "Kartu Intinya": bagian dirender sesuai urutan editor. Setiap bagian membawa kontainernya
   * sendiri (strip video selebar layar) dan jarak atas yang sama, jadi urutan apa pun tidak membuat
   * celah ganda.
   */
  export function Beranda({ bagian, situs }: { bagian: BagianBeranda[]; situs: Situs }) {
    return (
      <>
        <JsonLd data={jsonLd({ jenis: 'beranda' }, situs)} />
        {bagian.map((b) => {
          switch (b.jenis) {
            case 'hero':
              return <HeroBeranda key={b.id} hero={b} />
            case 'mozaik':
              return <MozaikPilihan key={b.id} mozaik={b} />
            case 'video':
              return <StripVideo key={b.id} strip={b} cloudName={situs.cloudName} />
            case 'terbaru':
              return <TerbaruBeranda key={b.id} terbaru={b} />
            case 'newsletter':
              return (
                <div key={b.id} className={`kontainer ${gaya.bagian}`}>
                  <KotakNewsletter newsletter={b.newsletter} id={b.id} lepas />
                </div>
              )
          }
        })}
      </>
    )
  }
  ```

- [ ] **Langkah 5: Rute beranda**

  Hapus gaya beranda sementara, lalu ganti `src/app/(frontend)/page.tsx`:

  ```bash
  git rm "src/app/(frontend)/page.module.css"
  ```

  `src/app/(frontend)/page.tsx`

  ```tsx
  import type { Metadata } from 'next'

  import { Beranda } from '@/components/beranda/Beranda'
  import { muatBeranda, muatSitus } from '@/modules/konten'
  import { metadata } from '@/modules/seo'

  export async function generateMetadata(): Promise<Metadata> {
    return metadata({ jenis: 'beranda' }, await muatSitus())
  }

  /**
   * Beranda dari global `beranda` (spesifikasi §4 "Pola tata letak"). Dirender statis saat build lalu
   * dibuang tag `beranda` setiap kali global beranda atau newsletter disimpan dan setiap kali artikel,
   * pilar, video, atau tools terbit.
   */
  export default async function HalamanBeranda() {
    const [bagian, situs] = await Promise.all([muatBeranda(), muatSitus()])
    return <Beranda bagian={bagian} situs={situs} />
  }
  ```

- [ ] **Langkah 6: Jalankan tes unit, type check, lint**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 43 passed (43)`, `Tests 285 passed (285)`; integrasi `Test Files 24 passed (24)`, `Tests 72 passed (72)`.

- [ ] **Langkah 7: Beranda contoh dan tes E2E**

  ```diff
  diff --git a/tests/e2e/data.ts b/tests/e2e/data.ts
  index ec2de13..e15437a 100644
  --- a/tests/e2e/data.ts
  +++ b/tests/e2e/data.ts
  @@ -14,6 +14,8 @@ export const SLUG = {
     sehat: 'butuh-tidur-berapa-jam',
     draf: 'draf-belum-terbit',
     danaDarurat: 'cara-menyiapkan-dana-darurat',
  +  belajar: 'jadwal-snbt-2027',
  +  tekno: 'penipuan-suara-ai',
     danaDaruratLama: 'dana-darurat-lama',
   } as const
   
  ```

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index 060eda5..b45a84e 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -146,7 +146,7 @@ const panduan = await payload.create({
     },
   })
   
  -await payload.create({
  +const sehat = await payload.create({
     collection: 'artikel',
     data: {
       ...dasar,
  @@ -248,6 +248,56 @@ await terbitkanHalaman(SLUG_HALAMAN.kebijakanRedaksi, [
     { blockType: 'teks', isi: isi(h2('Sumber dan koreksi'), p('Setiap angka di point. punya sumber. Koreksi dicatat di akhir tulisan.')) },
   ])
   
  +// Beranda: artikel Belajar dan Tekno untuk mozaik, newsletter aktif ke form penyedia (tidak pernah dibuka tes).
  +const belajar = await payload.create({
  +  collection: 'artikel',
  +  data: {
  +    ...dasar,
  +    judul: 'Jadwal SNBT 2027 dan apa yang berubah',
  +    slug: SLUG.belajar,
  +    tipe: 'explainer',
  +    pilar: pilar.belajar,
  +    deck: 'Pendaftaran SNBT 2027 punya tiga tanggal penting. Ini yang perlu kamu catat.',
  +    intinya: [{ poin: 'Catat tiga tanggal ini sebelum mendaftar.' }, { poin: 'Siapkan akun SNPMB lebih awal.' }],
  +    isi: isi(p('Jadwal resmi diumumkan panitia SNPMB.')),
  +  },
  +})
  +const tekno = await payload.create({
  +  collection: 'artikel',
  +  data: {
  +    ...dasar,
  +    judul: 'Cara mengenali penipuan yang memakai suara AI',
  +    slug: SLUG.tekno,
  +    tipe: 'panduan',
  +    pilar: pilar.tekno,
  +    deck: 'Suara keluarga bisa ditiru AI. Begini cara memastikan yang menelepon benar-benar dia.',
  +    intinya: [{ poin: 'Tutup telepon, lalu hubungi balik lewat nomor resmi.' }, { poin: 'Sepakati kata sandi keluarga.' }],
  +    isi: isi(p('Penipu cukup butuh beberapa detik rekaman suara.')),
  +  },
  +})
  +await payload.updateGlobal({
  +  slug: 'newsletter',
  +  data: { aktif: true, penyedia: 'kit', urlForm: 'https://point.kit.com/intinya', judul: 'Intinya, tiap Senin.', deskripsi: 'Lima tulisan terbaik pekan ini, langsung ke email.' },
  +})
  +await payload.updateGlobal({
  +  slug: 'beranda',
  +  data: {
  +    tataLetak: [
  +      {
  +        blockType: 'heroBeranda',
  +        judul: 'Intinya dulu.',
  +        subjudul: 'Uang, karier, teknologi, pendidikan, dan kesehatan. Dijelaskan dari intinya, lalu bisa langsung kamu hitung.',
  +        placeholderCari: 'misal: cara hitung THR',
  +      },
  +      { blockType: 'mozaikPilihan', artikel: [panduan.id, belajar.id, sehat.id, tekno.id] },
  +      { blockType: 'stripVideo', judul: 'Intinya dalam 45 detik' },
  +      { blockType: 'palingDibaca', judul: 'Paling dibaca pekan ini', jumlah: 4 },
  +      { blockType: 'slotIklan', idSlot: 'beranda-samping' },
  +      { blockType: 'newsletterBlok' },
  +    ],
  +  },
  +})
  +
   await payload.create({ collection: 'redirect', data: { dari: '/promo-lama', ke: '/glosarium', kode: '301' } })
   await payload.create({ collection: 'redirect', data: { dari: '/glosarium/ptkp-lama', ke: '/glosarium/ptkp', kode: '301' } })
   await payload.create({ collection: 'redirect', data: { dari: '/tulisan-dihapus', kode: '410' } })
  ```

  `tests/e2e/beranda.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  import { SLUG, SLUG_VIDEO, UKURAN_LAYAR } from './data'

  test.beforeEach(async ({ page }) => {
    await cegatCloudinary(page)
  })

  test('hero: judul raksasa, kalimat pembuka, dan pencarian besar ke /cari', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', /\/feed\.xml$/)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Intinya dulu.')
    await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('text-transform', 'uppercase')
    await expect(page.getByText('Dijelaskan dari intinya, lalu bisa langsung kamu hitung.')).toBeVisible()
    await page.getByRole('searchbox', { name: 'Cari topik' }).fill('thr')
    await page.getByRole('button', { name: 'Cari' }).click()
    await expect(page).toHaveURL('/cari?q=thr')
  })

  test('mozaik pilihan redaksi: kartu besar dulu, kotak Hitung sendiri dengan tools terbit', async ({ page }) => {
    await page.goto('/')
    const mozaik = page.getByRole('region', { name: 'Pilihan redaksi' })
    await expect(mozaik.getByRole('heading', { level: 2 })).toHaveText([
      'Cara hitung gaji bersih setelah PPh 21 dan BPJS',
      'Jadwal SNBT 2027 dan apa yang berubah',
      'Butuh tidur berapa jam? Beda per usia',
      'Cara mengenali penipuan yang memakai suara AI',
      'Hitung sendiri',
    ])
    const besar = await mozaik.getByRole('link', { name: /Cara hitung gaji bersih/ }).boundingBox()
    const kecil = await mozaik.getByRole('link', { name: /Jadwal SNBT/ }).boundingBox()
    expect(besar!.height).toBeGreaterThan(kecil!.height)
    await expect(mozaik.getByRole('list').getByRole('link')).toHaveText(['Gaji Bersih', 'THR', 'BMI & Kalori'])
    await expect(mozaik.getByRole('link', { name: 'Semua tools' })).toHaveAttribute('href', '/tools')
  })

  test('mozaik di tablet 768 px: kartu samping berdampingan, kotak Hitung sendiri sebaris dengan kartu keempat', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    await page.goto('/')
    const mozaik = page.getByRole('region', { name: 'Pilihan redaksi' })
    const kotak = async (nama: RegExp) => (await mozaik.getByRole('link', { name: nama }).boundingBox())!
    expect(Math.round((await kotak(/Jadwal SNBT/)).y)).toBe(Math.round((await kotak(/Butuh tidur/)).y))
    const tekno = await kotak(/penipuan yang memakai suara AI/)
    const tools = (await mozaik.getByRole('heading', { name: 'Hitung sendiri' }).boundingBox())!.y
    expect(tools).toBeGreaterThan(tekno.y)
    expect(tools).toBeLessThan(tekno.y + tekno.height)
  })

  test('strip video gelap, tulisan terbaru di luar mozaik, dan newsletter ke form penyedia', async ({ page }) => {
    await page.goto('/')
    const strip = page.getByRole('region', { name: 'Intinya dalam 45 detik' })
    await expect(strip).toHaveCSS('background-color', 'rgb(17, 17, 17)')
    await expect(strip.getByRole('listitem').getByRole('link')).toHaveCount(2)
    await expect(strip.getByRole('link', { name: /PPh 21 dijelaskan/ })).toHaveAttribute('href', `/video/${SLUG_VIDEO.pph21}`)
    await expect(strip.getByRole('link', { name: 'Semua video' })).toHaveAttribute('href', '/video')

    const terbaru = page.getByRole('region', { name: 'Tulisan terbaru' })
    await expect(terbaru.getByRole('link')).toHaveCount(2)
    await expect(terbaru.getByRole('link').first()).toHaveAttribute('href', `/${SLUG.danaDarurat}`)
    await expect(terbaru.getByRole('link', { name: /Cara hitung gaji bersih/ })).toHaveCount(0)

    const newsletter = page.getByRole('complementary', { name: 'Newsletter' })
    await expect(newsletter.getByRole('heading', { level: 2 })).toHaveText('Intinya, tiap Senin.')
    await expect(newsletter.getByRole('link', { name: /Langganan gratis/ })).toHaveAttribute('href', 'https://point.kit.com/intinya')
  })

  test('jarak antarbagian beranda tetap, tanpa celah kosong, di 375 dan 1440 px', async ({ page }) => {
    for (const lebar of [375, 1440]) {
      await page.setViewportSize({ width: lebar, height: 900 })
      await page.goto('/')
      const kotak = async (nama: string) => (await page.getByRole('region', { name: nama }).boundingBox())!
      const hero = await kotak('Intinya dulu.')
      const mozaik = await kotak('Pilihan redaksi')
      const strip = await kotak('Intinya dalam 45 detik')
      const terbaru = await kotak('Tulisan terbaru')
      const jarak = [mozaik.y - (hero.y + hero.height), strip.y - (mozaik.y + mozaik.height), terbaru.y - (strip.y + strip.height)]
      expect(jarak.map(Math.round), `${lebar}px`).toEqual([40, 56, 56])
    }
  })

  for (const { lebar, tinggi } of UKURAN_LAYAR) {
    test(`beranda ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: tinggi })
      await page.goto('/')
      await periksaTanpaGeserHorizontal(page)
      await periksaAxe(page)
    })
  }
  ```

  Jalankan:

  ```bash
  npm run test:e2e
  ```

  Hasil yang diharapkan: `70 passed`. Beranda punya satu H1, form cari ke `/cari?q=thr`, mozaik empat kartu plus kotak "Hitung sendiri" (Gaji Bersih, THR, BMI & Kalori), strip video berlatar `rgb(17, 17, 17)` dengan dua video, "Tulisan terbaru" berisi dua tulisan di luar mozaik, dan newsletter ke form penyedia; slot iklan tidak meninggalkan ruang kosong; jarak antarbagian `[40, 56, 56]`.

- [ ] **Langkah 8: Commit**

  ```bash
  git add src/styles/tokens.css src/components "src/app/(frontend)" tests/unit/beranda-tampilan.test.ts tests/e2e
  git commit -m "feat(ui): beranda dari global beranda: hero dan pencarian, mozaik, strip video, tulisan terbaru, newsletter"
  ```

### Task 9: Reveal judul raksasa beranda dengan CSS dan anggaran JavaScript semua jenis halaman

**Files:**
- Modify: `src/components/beranda/HeroBeranda.tsx`, `src/components/beranda/Beranda.module.css`, `tests/unit/beranda-tampilan.test.ts`, `tests/e2e/motion.spec.ts`

**Interfaces:**
- Consumes: `HeroBeranda` (Task 8), token motion `--durasi-halaman`, `--kurva`, `--jeda-urut` (Rencana 4A), `SLUG_SUB` (Task 1), `SLUG_VIDEO` (Task 4).
- Produces:
  - H1 beranda berisi satu `<span>` per kata dengan `--urutan` (spasi antarkata tetap teks biasa); keyframes `muncul` di `Beranda.module.css`.
  - `tests/e2e/motion.spec.ts`: `ANGGARAN_JS = 160 * 1024`, `HALAMAN_ANGGARAN` (sembilan jenis halaman), `byteJs(browser, path)`; tes anggaran semua jenis halaman, tes "JS beranda tidak melebihi JS artikel", dan tes reveal tanpa JavaScript dan dengan reduced motion.

Spesifikasi §13 meminta reveal judul raksasa beranda dengan GSAP yang dimuat dinamis. Rencana ini memakai **animasi CSS** sebagai gantinya dan meminta keputusan pemilik (lihat "Dependensi baru" dan Risiko), karena probe di build produksi dengan data E2E menunjukkan:

| Ukuran | Reveal CSS (rencana ini) | Reveal GSAP 3.15.0 (branch `probe/rencana-4b-gsap`) |
|---|---|---|
| JS beranda (byte terkompresi yang diunduh) | 141,8 KiB, sama dengan artikel | 168,6 KiB, melewati anggaran total 160 KiB |
| JS tambahan milik point. | 0 KB | 27,2 KB (chunk GSAP), sendirian sudah melewati anggaran 25 KB |
| Kapan judul terlihat | paint pertama (LCP beranda = FCP, termasuk dengan throttling Slow 4G + CPU 4x) | sudah dirender server, lalu disembunyikan GSAP dan dimunculkan ulang setelah skrip dimuat (kedip); menyembunyikannya sejak awal justru menunda LCP sampai JavaScript jalan |
| Tanpa JavaScript | judul tetap muncul | judul muncul tanpa animasi |

Reveal CSS: setiap kata naik 0,3em dan muncul, 400 ms (`--durasi-halaman`) dengan kurva khas, kata kedua menyusul 80 ms (dua kali `--jeda-urut`), total 480 ms. Hanya `transform` dan `opacity`. Aturan animasinya ada di dalam `@media (prefers-reduced-motion: no-preference)`, jadi dengan reduced motion tidak ada animasi sama sekali (bukan sekadar dipercepat). Animasi dimulai di paint pertama, sehingga judul tidak menunggu JavaScript; Chrome menghitung LCP saat frame pertama dengan opacity di atas nol.

Anggaran JavaScript spesifikasi §12 (keputusan pemilik 2026-11-04: total di bawah 160 KiB) dijaga untuk setiap jenis halaman, tidak hanya artikel. Setiap halaman diukur di konteks browser baru supaya tidak ada skrip dari cache halaman sebelumnya. Tes tambahan memastikan beranda tidak memuat JavaScript lebih banyak dari artikel: bila suatu saat ada pustaka animasi yang ikut ke beranda, tes ini yang gagal dulu. Hasil probe: semua jenis halaman 141,8 KiB (kerangka Next/React ditambah `PemicuMasuk`), jadi JS milik point. di luar kerangka di bawah 1 KB.

- [ ] **Langkah 1: Tulis tes yang gagal**

  Tes unit beranda kini mengharapkan kata-kata judul dalam `<span>`:

  ```diff
  diff --git a/tests/unit/beranda-tampilan.test.ts b/tests/unit/beranda-tampilan.test.ts
  index a1703db..ca8d881 100644
  --- a/tests/unit/beranda-tampilan.test.ts
  +++ b/tests/unit/beranda-tampilan.test.ts
  @@ -34,7 +34,9 @@ const html = renderToStaticMarkup(h(Beranda, { bagian, situs }))
   describe('Beranda', () => {
     it('hero: satu H1 dan form cari besar dengan placeholder dari CMS', () => {
       expect(html.match(/<h1/g)).toHaveLength(1)
  -    expect(html).toMatch(/<section aria-labelledby="judul-beranda" class="kontainer [^"]*"><h1 id="judul-beranda" class="[^"]*">Intinya dulu\.<\/h1>/)
  +    expect(html).toMatch(
  +      /<h1 id="judul-beranda" class="[^"]*"><span class="[^"]*" style="--urutan:0">Intinya<\/span> <span class="[^"]*" style="--urutan:1">dulu\.<\/span><\/h1>/,
  +    )
       expect(html).toContain('placeholder="misal: cara hitung THR"')
       expect(html).toContain('"@type":"WebSite"')
     })
  ```

  Tes E2E motion: anggaran semua jenis halaman, beranda tanpa JS tambahan, dan reveal:

  ```diff
  diff --git a/tests/e2e/motion.spec.ts b/tests/e2e/motion.spec.ts
  index 22c841c..67d7d36 100644
  --- a/tests/e2e/motion.spec.ts
  +++ b/tests/e2e/motion.spec.ts
  @@ -1,14 +1,43 @@
  -import { expect, test } from '@playwright/test'
  +import { expect, test, type Browser } from '@playwright/test'
   
   import { cegatCloudinary } from './bantu'
  -import { SLUG } from './data'
  +import { SLUG, SLUG_SUB, SLUG_VIDEO } from './data'
   
   /**
  - * Anggaran JavaScript halaman artikel (byte gzip yang diunduh). Spesifikasi §12 menulis 70 KB, tetapi
  - * kerangka Next 16 + React 19 saja sudah sekitar 135 KB; angka ini menjaga supaya JS milik point.
  - * tetap kecil di atas kerangka itu. Lihat bagian Risiko Rencana 4A.
  + * Anggaran JavaScript per halaman (byte terkompresi yang diunduh), spesifikasi §12: total di bawah
  + * 160 KiB. Kerangka Next 16 + React 19 sendiri sekitar 140 KB, jadi angka ini juga menjaga JS milik
  + * point. tetap kecil di atasnya.
    */
  -const ANGGARAN_JS_ARTIKEL = 160 * 1024
  +const ANGGARAN_JS = 160 * 1024
  +
  +/** Setiap jenis halaman publik: beranda, artikel, rubrik, halaman statis, penulis, video, tools, cari. */
  +const HALAMAN_ANGGARAN = [
  +  '/',
  +  `/${SLUG.panduan}`,
  +  `/uang-karier/${SLUG_SUB.pajak}`,
  +  '/tentang',
  +  '/penulis/redaksi',
  +  '/video',
  +  `/video/${SLUG_VIDEO.pph21}`,
  +  '/tools',
  +  '/cari?q=gaji',
  +]
  +
  +/** Byte JS halaman di konteks baru (tanpa cache browser dari halaman sebelumnya). */
  +async function byteJs(browser: Browser, path: string): Promise<number> {
  +  const konteks = await browser.newContext()
  +  const page = await konteks.newPage()
  +  await cegatCloudinary(page)
  +  await page.goto(path)
  +  const byte = await page.evaluate(() =>
  +    performance
  +      .getEntriesByType('resource')
  +      .filter((e) => (e as PerformanceResourceTiming).initiatorType === 'script')
  +      .reduce((jumlah, e) => jumlah + (e as PerformanceResourceTiming).encodedBodySize, 0),
  +  )
  +  await konteks.close()
  +  return byte
  +}
   
   test.beforeEach(async ({ page }) => {
     await cegatCloudinary(page)
  @@ -55,15 +84,34 @@ test('kartu ke artikel memakai View Transitions dengan judul sebagai elemen bers
     expect(nama.some((n) => n.startsWith('judul-artikel-'))).toBe(true)
   })
   
  -test('JavaScript halaman artikel di bawah anggaran', async ({ page }) => {
  -  await page.goto(`/${SLUG.panduan}`)
  -  const byte = await page.evaluate(() =>
  -    performance
  -      .getEntriesByType('resource')
  -      .filter((e) => (e as PerformanceResourceTiming).initiatorType === 'script')
  -      .reduce((jumlah, e) => jumlah + (e as PerformanceResourceTiming).encodedBodySize, 0),
  -  )
  -  test.info().annotations.push({ type: 'JS artikel (gzip)', description: `${Math.round(byte / 1024)} KB` })
  -  expect(byte).toBeGreaterThan(0)
  -  expect(byte).toBeLessThan(ANGGARAN_JS_ARTIKEL)
  +test('JavaScript setiap jenis halaman di bawah anggaran', async ({ browser }) => {
  +  for (const path of HALAMAN_ANGGARAN) {
  +    const byte = await byteJs(browser, path)
  +    test.info().annotations.push({ type: `JS ${path}`, description: `${(byte / 1024).toFixed(1)} KiB` })
  +    expect(byte, path).toBeGreaterThan(0)
  +    expect(byte, path).toBeLessThan(ANGGARAN_JS)
  +  }
  +})
  +
  +test('reveal judul beranda tanpa JavaScript tambahan: JS beranda tidak melebihi JS artikel', async ({ browser }) => {
  +  expect(await byteJs(browser, '/')).toBeLessThanOrEqual(await byteJs(browser, `/${SLUG.panduan}`))
  +})
  +
  +test('judul raksasa beranda muncul per kata walau JavaScript mati, dan diam saat reduced motion', async ({ browser }) => {
  +  const tanpaJs = await browser.newContext({ javaScriptEnabled: false })
  +  const halaman = await tanpaJs.newPage()
  +  await cegatCloudinary(halaman)
  +  await halaman.goto('/')
  +  const kata = halaman.getByRole('heading', { level: 1 }).locator('span')
  +  await expect(kata).toHaveText(['Intinya', 'dulu.'])
  +  await expect(kata.first()).toHaveCSS('animation-name', /muncul/)
  +  await expect(kata.last()).toHaveCSS('opacity', '1')
  +  await tanpaJs.close()
  +
  +  const tenang = await browser.newContext({ reducedMotion: 'reduce' })
  +  const halamanTenang = await tenang.newPage()
  +  await cegatCloudinary(halamanTenang)
  +  await halamanTenang.goto('/')
  +  await expect(halamanTenang.getByRole('heading', { level: 1 }).locator('span').first()).toHaveCSS('animation-name', 'none')
  +  await tenang.close()
   })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/beranda-tampilan.test.ts` dengan `AssertionError: expected '<script type="application/ld+json">{"…' to match /…/` pada tes "hero: satu H1 dan form cari besar dengan placeholder dari CMS" (H1 belum berisi `<span>` per kata`.

- [ ] **Langkah 3: Pecah judul per kata dan animasi CSS**

  ```diff
  diff --git a/src/components/beranda/HeroBeranda.tsx b/src/components/beranda/HeroBeranda.tsx
  index 00245ec..4440a3b 100644
  --- a/src/components/beranda/HeroBeranda.tsx
  +++ b/src/components/beranda/HeroBeranda.tsx
  @@ -1,14 +1,28 @@
  +import { Fragment, type CSSProperties } from 'react'
  +
   import { FormCari } from '@/components/cari/FormCari'
   import type { BagianBeranda } from '@/modules/konten/tipe'
   
   import gaya from './Beranda.module.css'
   
  -/** Judul raksasa, kalimat pembuka, dan pencarian besar (mockup Kartu Intinya). Satu-satunya H1 beranda. */
  +/**
  + * Judul raksasa, kalimat pembuka, dan pencarian besar (mockup Kartu Intinya). Satu-satunya H1 beranda.
  + * Judul dipecah per kata untuk reveal CSS (spesifikasi §13): kata naik dan muncul berurutan sejak
  + * paint pertama, tanpa JavaScript, jadi judul tidak menunggu skrip dan LCP tidak tertunda. Spasi
  + * antarkata tetap teks biasa supaya judul dibaca utuh oleh pembaca layar.
  + */
   export function HeroBeranda({ hero }: { hero: Extract<BagianBeranda, { jenis: 'hero' }> }) {
     return (
       <section aria-labelledby="judul-beranda" className={`kontainer ${gaya.hero}`}>
         <h1 id="judul-beranda" className={gaya.judulRaksasa}>
  -        {hero.judul}
  +        {hero.judul.split(/\s+/).map((kata, i) => (
  +          <Fragment key={i}>
  +            {i > 0 && ' '}
  +            <span className={gaya.kata} style={{ '--urutan': i } as CSSProperties}>
  +              {kata}
  +            </span>
  +          </Fragment>
  +        ))}
         </h1>
         <div className={gaya.heroBaris}>
           {hero.subjudul && <p className={gaya.pembuka}>{hero.subjudul}</p>}
  ```

  ```diff
  diff --git a/src/components/beranda/Beranda.module.css b/src/components/beranda/Beranda.module.css
  index 644775a..b3c1b3c 100644
  --- a/src/components/beranda/Beranda.module.css
  +++ b/src/components/beranda/Beranda.module.css
  @@ -22,6 +22,24 @@
     text-transform: uppercase;
   }
   
  +/* Reveal judul raksasa: setiap kata naik 0,3em dan muncul, 400 ms dengan kurva khas, berurutan 80 ms.
  +   Hanya transform dan opacity, mulai di paint pertama tanpa JavaScript, dan tidak ada sama sekali
  +   saat reduced motion (aturan di dalam `no-preference`). */
  +@keyframes muncul {
  +  from {
  +    opacity: 0;
  +    transform: translateY(0.3em);
  +  }
  +}
  +
  +@media (prefers-reduced-motion: no-preference) {
  +  .kata {
  +    display: inline-block;
  +    animation: muncul var(--durasi-halaman) var(--kurva) both;
  +    animation-delay: calc(var(--urutan, 0) * 2 * var(--jeda-urut));
  +  }
  +}
  +
   .heroBaris {
     display: flex;
     flex-wrap: wrap;
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

  Hasil yang diharapkan: bersih; unit `Test Files 43 passed (43)`, `Tests 285 passed (285)`; integrasi `Test Files 24 passed (24)`, `Tests 72 passed (72)`; E2E `72 passed`. Anotasi tes anggaran mencatat JS setiap halaman (sekitar 142 KiB).

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/components/beranda tests/unit/beranda-tampilan.test.ts tests/e2e/motion.spec.ts
  git commit -m "feat(ui): reveal judul raksasa beranda dengan CSS dan anggaran JavaScript semua jenis halaman"
  ```

### Task 10: Aturan frontend di CLAUDE.md dan pemeriksaan akhir

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: semua task sebelumnya.
- Produces: aturan proyek untuk agen dan pengembang berikutnya (Rencana 5 dan seterusnya): `PATH_INDEKS`, `muatJalur`, beranda dari global `beranda` tanpa data palsu, tag `beranda` dan `DI_BERANDA`, token permukaan gelap, larangan tata letak yang bergantung jumlah elemen beserta tes jaraknya, anggaran JS semua jenis halaman, dan daftar halaman yang dirender saat build.

- [ ] **Langkah 1: Perbarui CLAUDE.md**

  ```diff
  diff --git a/CLAUDE.md b/CLAUDE.md
  index 02aea4f..5f7094d 100644
  --- a/CLAUDE.md
  +++ b/CLAUDE.md
  @@ -28,21 +28,24 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Nama teknis framework tetap bahasa Inggris (hook, access, config).
   - Logika bisnis ditulis sebagai fungsi murni di `src/lib/` atau `src/modules/` dan diuji unit. Config Payload hanya merangkai.
   - Satu file satu tanggung jawab. Koleksi di `src/collections/`, global di `src/globals/`, blok di `src/blocks/`, field bersama di `src/fields/`, hook di `src/hooks/`, akses di `src/access/`.
  -- Path publik selalu dibangun lewat `pathFor()` di `src/lib/paths.ts`, jangan merangkai string URL manual.
  +- Path publik selalu dibangun lewat `pathFor()` di `src/lib/paths.ts`, jangan merangkai string URL manual. Halaman indeks memakai `PATH_INDEKS` (`/cari`, `/glosarium`, `/tools`, `/video`).
   - SEO selalu lewat `src/modules/seo`: `metadata()` untuk `generateMetadata`, `jsonLd()` + `serialisasiJsonLd()` untuk JSON-LD, `remahRoti()` untuk breadcrumb, `ambilSitus()` untuk pengaturan situs. Jangan menulis `<title>`, canonical, robots, atau JSON-LD manual di halaman. Rute teknis (`/sitemap.xml`, `/sitemap/{jenis}.xml`, `/news-sitemap.xml`, `/robots.txt`, `/feed.xml`) ada di `src/app/(frontend)/` dan hanya merangkai fungsi modul.
  -- Tag cache di `src/lib/tag.ts` (`TAG`): data halaman publik di-cache dengan tag yang sama dengan yang direvalidasi hook `revalidasiPublik` (`{koleksi}`, `{koleksi}:{id}`, `pilar:{slug}`, `beranda`, `sitemap`, `pengaturan-seo`, `header`, `footer`, `media`, `redirect`). Koleksi publik baru wajib memasang `revalidasiPublik(koleksi)`.
  +- Tag cache di `src/lib/tag.ts` (`TAG`): data halaman publik di-cache dengan tag yang sama dengan yang direvalidasi hook `revalidasiPublik` (`{koleksi}`, `{koleksi}:{id}`, `pilar:{slug}`, `beranda`, `sitemap`, `pengaturan-seo`, `header`, `footer`, `media`, `redirect`). Koleksi publik baru wajib memasang `revalidasiPublik(koleksi)`. Tag `beranda` dibuang global `beranda` dan `newsletter` serta terbitnya artikel, pilar, video, dan tools; koleksi yang baru tampil di beranda ditambahkan ke `DI_BERANDA`.
   - URL media selalu lewat `src/modules/media` (`bangunUrl`, `propsGambar`, `urlOg`), jangan merangkai URL Cloudinary manual. `next/image` memakai loader kustom Cloudinary, jadi `src` harus URL dari `bangunUrl`/`propsGambar` dan `width`/`height` wajib diisi.
   - Media disimpan di Cloudinary (folder `point/gambar`, `point/video`). Tanpa `CLOUDINARY_*` di env (lokal, tes) dipakai klien palsu dalam memori: file tidak tersimpan permanen. Tes tidak boleh memanggil jaringan.
   - Halaman publik di `src/app/(frontend)/` dirender ISR: rute dinamis memakai `generateStaticParams` yang mengembalikan `[]`, dan data diambil lewat `muat*()` dari `src/modules/konten` (cache bertag `TAG`). Path tanpa dokumen diakhiri `tanganiTidakAda(path)` di komponen halaman (redirect dari koleksi `redirect` atau 404), sedangkan `generateMetadata` mengembalikan `metadataTidakDitemukan()` untuk path itu.
  -- Komponen UI publik di `src/components/`, server component kecuali benar-benar butuh browser (`'use client'` seperti `Catat404` dan `PemicuMasuk`). Gaya di CSS Module di sebelah komponen dan memakai token semantik dari `src/styles/tokens.css` (`--teks`, `--latar`, `--permukaan`, `--pilar`, `--ruang-*`, `--durasi-*`), bukan hex atau token primitif. Animasi hanya `transform` dan `opacity`, dan semuanya mati di `prefers-reduced-motion: reduce`.
  +- Rute catch-all `[...jalur]` mencari dokumen lewat `muatJalur()`: satu segmen artikel, pilar, lalu halaman statis; dua segmen subkategori di bawah pilarnya. Jenis halaman tingkat atas baru ditambahkan di `muatJalur`, bukan sebagai rute bersaudara. `/cari` satu-satunya halaman dinamis (membaca `searchParams`, noindex); hasilnya di-cache per kueri.
  +- Beranda dirender dari global `beranda` lewat `susunBeranda()`: urutan blok dari editor, tanpa data palsu (blok "Paling dibaca" menampilkan tulisan terbaru dengan judul "Tulisan terbaru" sampai data kunjungan ada, newsletter hanya tautan ke form penyedia, slot iklan belum dirender).
  +- Komponen UI publik di `src/components/`, server component kecuali benar-benar butuh browser (`'use client'` seperti `Catat404` dan `PemicuMasuk`). Gaya di CSS Module di sebelah komponen dan memakai token semantik dari `src/styles/tokens.css` (`--teks`, `--latar`, `--permukaan`, `--latar-terbalik`, `--teks-terbalik`, `--pilar`, `--ruang-*`, `--durasi-*`), bukan hex atau token primitif. Animasi hanya `transform` dan `opacity`, dan semuanya mati di `prefers-reduced-motion: reduce`. Reveal judul beranda memakai animasi CSS, tanpa JavaScript.
  +- Tata letak yang isinya diatur editor (jumlah blok, kartu, atau bagian berubah) tidak boleh bergantung pada jumlah elemen, misalnya `grid-row: span N`. Jarak antarbagian hanya dari `gap` atau satu kelas margin, dan dijaga tes E2E yang mengukur jaraknya.
   - Tautan internal lewat komponen `Tautan` (`next/link` untuk path situs). Warna pilar lewat atribut `data-warna` (nilai field `warna` pilar) dan selalu bersama nama pilarnya. Ikon lewat `Ikon` (path Lucide yang disalin, tanpa paket ikon).
   - Copy UI: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru.
   - Tes unit di `tests/unit/*.test.ts`, tes integrasi di `tests/int/*.int.spec.ts` dan memakai `getTestPayload()` + `unik()` dari `tests/int/helpers.ts`.
  -- Tes E2E di `tests/e2e/*.spec.ts` memakai `cegatCloudinary()` (gambar tanpa jaringan) dan `periksaAxe()` (WCAG 2.2 AA) dari `tests/e2e/bantu.ts`; data contohnya di `tests/e2e/siapkan.ts`.
  +- Tes E2E di `tests/e2e/*.spec.ts` memakai `cegatCloudinary()` (gambar tanpa jaringan) dan `periksaAxe()` (WCAG 2.2 AA) dari `tests/e2e/bantu.ts`; data contohnya di `tests/e2e/siapkan.ts`. Anggaran JavaScript (total di bawah 160 KiB per halaman, spesifikasi §12) dijaga `motion.spec.ts` untuk setiap jenis halaman; jenis halaman baru ditambahkan ke daftarnya.
   
   ## Batasan
   - Jangan commit `.env`. `.env.test` boleh di-commit karena hanya untuk database tes lokal dan tidak boleh berisi `CLOUDINARY_*`.
   - Tanya dulu sebelum menambah dependensi baru di luar rencana.
   - Jalankan `npm run generate:types` lalu `npm run typecheck` setelah mengubah koleksi atau global.
   - Jalankan `npm test` sebelum commit, dan `npm run test:e2e` bila halaman publik berubah.
  -- `npm run build` membaca database dev untuk halaman statis (layout, `/glosarium`, 404). Setelah skema berubah, jalankan `npm run seed` dulu supaya kolom baru terdorong ke database dev.
  +- `npm run build` membaca database dev untuk halaman statis (layout, `/`, `/glosarium`, `/tools`, `/video`, 404). Setelah skema berubah, jalankan `npm run seed` dulu supaya kolom baru terdorong ke database dev.
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
  npm run test:e2e
  npm run build
  ```

  Hasil yang diharapkan: `payload-types.ts` dan import map tidak berubah; type check dan lint bersih; unit `Test Files 43 passed (43)`, `Tests 285 passed (285)`; integrasi `Test Files 24 passed (24)`, `Tests 72 passed (72)`; E2E `72 passed`; build mencantumkan `○ /`, `○ /glosarium`, `○ /tools`, `○ /video`, `● /[...jalur]`, `● /glosarium/[slug]`, `● /penulis/[slug]`, `● /video/[slug]`, `ƒ /cari`, dan `ƒ` untuk lima rute teknis Rencana 3.

- [ ] **Langkah 3: Uji visual di tiga ukuran layar**

  Bangun dan jalankan build dengan database E2E, yang sudah berisi konten contoh dari `npm run test:e2e` di langkah 2 (`set -a` memuat `PAYLOAD_SECRET` dari `.env.test`; nama database diambil dari `DATABASE_URL` tes tanpa query lalu ditambah `_e2e`):

  ```bash
  set -a && . ./.env.test && set +a
  DATABASE_URL="${DATABASE_URL%%\?*}_e2e" CLOUDINARY_CLOUD_NAME=e2e CLOUDINARY_API_KEY=e2e CLOUDINARY_API_SECRET=e2e npm run build
  (DATABASE_URL="${DATABASE_URL%%\?*}_e2e" CLOUDINARY_CLOUD_NAME=e2e CLOUDINARY_API_KEY=e2e CLOUDINARY_API_SECRET=e2e PORT=3200 npm run start > /tmp/point-lat-start.log 2>&1 &)
  timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'
  ```

  Buka di browser dan periksa `/`, `/uang-karier`, `/uang-karier/pajak`, `/tentang`, `/kebijakan-redaksi`, `/penulis/redaksi`, `/video`, `/video/pph-21-satu-slip-gaji`, `/tools`, `/cari`, `/cari?q=gaji`, dan `/halaman-yang-tidak-ada` di 375, 768, dan 1440 px (DevTools) dan dengan "Emulate CSS prefers-reduced-motion: reduce". Gambar Cloudinary tidak tampil karena cloud `e2e` palsu. Beranda harus sesuai mockup `Kartu.dc.html`: judul raksasa dengan kalimat pembuka dan pencarian sejajar di desktop, kartu besar hijau dengan pil label putih, dua kartu bertumpuk di sampingnya, kartu Tekno dan kotak "Hitung sendiri" di baris kedua, strip video hitam selebar layar, "Tulisan terbaru" dengan titik warna dan newsletter sand di kanannya. Tidak ada geser horizontal, tidak ada ruang kosong di antara bagian selain jarak 40 dan 56 px, dan reduced motion menampilkan judul tanpa animasi. Hentikan server dengan `fuser -k 3200/tcp`, lalu jalankan `npm run build` lagi dengan env biasa.

- [ ] **Langkah 4: Commit**

  ```bash
  git add CLAUDE.md
  git commit -m "docs(ui): aturan rute catch-all, beranda, tata letak, dan anggaran JS di CLAUDE.md"
  ```

### Task 11: Takarir video WebVTT (opsional, butuh persetujuan pemilik)

> **Lewati task ini bila pemilik belum menyetujui takarir.** Task 1 sampai 10 tidak bergantung padanya, dan tanpa task ini rencana tetap selesai (lihat "Selesai bila"). Bila dijalankan, task ini menambah satu kolom skema (`video.takarir`) dan satu rute teknis.

**Files:**
- Create: `src/app/(frontend)/video/[slug]/takarir.vtt/route.ts`
- Modify: `src/lib/validasi.ts`, `src/collections/Video.ts`, `src/payload-types.ts` (hasil `npm run generate:types`), `src/modules/konten/video.ts`, `src/modules/konten/tipe.ts`, `src/modules/konten/data.ts`, `src/modules/konten/cache.ts`, `src/modules/konten/index.ts`, `src/components/isi/VideoSemat.tsx`, `tests/e2e/siapkan.ts`
- Test: `tests/unit/takarir.test.ts`, `tests/int/takarir.int.spec.ts`, `tests/e2e/takarir.spec.ts`

**Interfaces:**
- Consumes: `VideoSemat`, `VideoUntukSemat`, `susunVideo`, `POPULATE_ARTIKEL` (Rencana 4A dan Task 4), `pathFor`, `pesanGalat` (`tests/int/helpers.ts`).
- Produces:
  - Field `takarir` (textarea, opsional, "Takarir (WebVTT)") di koleksi `video`, divalidasi `validasiVtt(nilai)` dan `MAKS_TAKARIR = 20_000` di `src/lib/validasi.ts`.
  - `pathTakarir(slug)` (`/video/{slug}/takarir.vtt`) di `src/modules/konten/video.ts`; `ambilTakarir(payload, slug)`, `muatTakarir(slug)` (tag `video`).
  - Rute `GET /video/{slug}/takarir.vtt` (`text/vtt; charset=utf-8`, 404 bila video tidak terbit atau tanpa takarir).
  - `VideoUntukSemat` kini memuat `slug` dan `takarir`; `VideoSemat` merender `<track kind="captions" srcLang="id" label="Bahasa Indonesia">` bila ada takarir.

Rencana 4A mencatat video tanpa takarir sebagai risiko WCAG 2.2 1.2.2 (takarir untuk media rekaman) dengan transkrip sebagai pengganti sementara. Pendekatan task ini: takarir disimpan sebagai teks WebVTT di CMS (editor menempel isi berkas `.vtt` dari alat pembuat takarir), lalu dilayani route handler di path video itu sendiri. Tidak ada unggahan berkas ke Cloudinary (modul media dan preset upload tidak berubah), dan `<track>` memakai URL satu origin sehingga tidak butuh CORS. Validasi hanya memeriksa kepala `WEBVTT`, minimal satu cue bertanda waktu, dan panjang maksimal 20.000 karakter (cukup untuk video 30 sampai 60 detik); kesalahan format lain ditangani pemutar dengan mengabaikan cue yang rusak. `<track>` tidak diberi `default`, jadi takarir dinyalakan pembaca dari tombol CC; transkrip tetap tampil seperti sebelumnya.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/takarir.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it } from 'vitest'

  import { VideoSemat } from '@/components/isi/VideoSemat'
  import { validasiVtt } from '@/lib/validasi'
  import { pathTakarir } from '@/modules/konten/video'
  import type { Media } from '@/payload-types'

  const VTT = 'WEBVTT\n\n00:00.000 --> 00:04.000\nAmbil slip gaji bulan lalu.'

  const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
  const file: Media = { id: 20, publicId: 'point/video/slip', jenis: 'video', alt: null, width: 1080, height: 1920, ...waktu }
  const video = { judul: 'PPh 21 dijelaskan', slug: 'pph-21', file, poster: null, transkrip: 'Transkrip.', _status: 'published' as const }

  describe('validasiVtt', () => {
    it('kosong boleh; isi harus diawali WEBVTT dan punya cue bertanda waktu', () => {
      expect(validasiVtt('')).toBe(true)
      expect(validasiVtt(null)).toBe(true)
      expect(validasiVtt(VTT)).toBe(true)
      expect(validasiVtt('﻿WEBVTT - takarir\n\n00:01.000 --> 00:02.000\nHai')).toBe(true)
      expect(validasiVtt('00:00.000 --> 00:04.000\nTanpa kepala')).toBe('Takarir harus diawali baris WEBVTT.')
      expect(validasiVtt('WEBVTTX\n\n00:00.000 --> 00:01.000\nA')).toBe('Takarir harus diawali baris WEBVTT.')
      expect(validasiVtt('WEBVTT\n\nHanya teks.')).toBe('Takarir belum punya cue bertanda waktu (contoh: 00:00.000 --> 00:04.000).')
      expect(validasiVtt(`WEBVTT\n\n00:00.000 --> 00:01.000\n${'a'.repeat(20_000)}`)).toMatch(/^Takarir terlalu panjang/)
    })
  })

  describe('takarir di pemutar', () => {
    it('track takarir bahasa Indonesia hanya bila video punya takarir', () => {
      expect(pathTakarir('pph-21')).toBe('/video/pph-21/takarir.vtt')
      const dengan = renderToStaticMarkup(h(VideoSemat, { video: { ...video, takarir: VTT }, cloudName: 'demo' }))
      expect(dengan).toContain('<track kind="captions" src="/video/pph-21/takarir.vtt" srcLang="id" label="Bahasa Indonesia"/>')
      const tanpa = renderToStaticMarkup(h(VideoSemat, { video: { ...video, takarir: ' ' }, cloudName: 'demo' }))
      expect(tanpa).not.toContain('<track')
    })
  })
  ```

  `tests/int/takarir.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { ambilTakarir } from '@/modules/konten/data'

  import { siapkanRelasiArtikel, videoMp4 } from './fixtures'
  import { getTestPayload, pesanGalat, unik } from './helpers'

  const VTT = 'WEBVTT\n\n00:00.000 --> 00:04.000\nAmbil slip gaji bulan lalu.'

  describe('takarir video', () => {
    it('disimpan sebagai teks WebVTT; hanya video terbit yang takarirnya dilayani', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const file = await payload.create({ collection: 'media', data: {}, file: videoMp4() })
      const data = () => ({ _status: 'published' as const, judul: unik('Video'), file: file.id, pilar: relasi.pilar.id, transkrip: 'Transkrip.' })

      expect(await pesanGalat(payload.create({ collection: 'video', data: { ...data(), takarir: 'Bukan VTT' } }))).toBe(
        'takarir: Takarir harus diawali baris WEBVTT.',
      )
      const terbit = await payload.create({ collection: 'video', data: { ...data(), takarir: VTT } })
      const tanpa = await payload.create({ collection: 'video', data: data() })
      const draf = await payload.create({ collection: 'video', draft: true, data: { ...data(), _status: 'draft', takarir: VTT } })

      expect(await ambilTakarir(payload, terbit.slug as string)).toBe(VTT)
      expect(await ambilTakarir(payload, tanpa.slug as string)).toBeNull()
      expect(await ambilTakarir(payload, draf.slug as string)).toBeNull()
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/takarir.test.ts` dengan `TypeError: (0 , __vite_ssr_import_4__.validasiVtt) is not a function` dan `TypeError: (0 , __vite_ssr_import_5__.pathTakarir) is not a function`.

- [ ] **Langkah 3: Field takarir dan validasinya**

  ```diff
  diff --git a/src/lib/validasi.ts b/src/lib/validasi.ts
  index dbcbf4a..11c9cd3 100644
  --- a/src/lib/validasi.ts
  +++ b/src/lib/validasi.ts
  @@ -20,3 +20,20 @@ export function validasiUrlOpsional(nilai: unknown): true | string {
       return PESAN_URL
     }
   }
  +
  +/** Batas isi takarir WebVTT yang disimpan di CMS (cukup untuk video 30-60 detik). */
  +export const MAKS_TAKARIR = 20_000
  +
  +/**
  + * Takarir opsional berformat WebVTT: baris pertama harus `WEBVTT` (spesifikasi WebVTT), dengan minimal
  + * satu cue bertanda waktu `-->`. Kosong berarti video belum punya takarir.
  + */
  +export function validasiVtt(nilai: unknown): true | string {
  +  if (nilai === undefined || nilai === null || nilai === '') return true
  +  if (typeof nilai !== 'string') return 'Takarir harus berupa teks WebVTT.'
  +  const teks = nilai.replace(/^\uFEFF/, '').trim()
  +  if (!/^WEBVTT(?:[ \t].*)?(?:\r?\n|$)/.test(teks)) return 'Takarir harus diawali baris WEBVTT.'
  +  if (!teks.includes('-->')) return 'Takarir belum punya cue bertanda waktu (contoh: 00:00.000 --> 00:04.000).'
  +  if (teks.length > MAKS_TAKARIR) return `Takarir terlalu panjang (maksimal ${MAKS_TAKARIR} karakter).`
  +  return true
  +}
  ```

  ```diff
  diff --git a/src/collections/Video.ts b/src/collections/Video.ts
  index 545e88d..6d40878 100644
  --- a/src/collections/Video.ts
  +++ b/src/collections/Video.ts
  @@ -5,6 +5,7 @@ import { seoField } from '@/fields/seo'
   import { slugField } from '@/fields/slug'
   import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
   import { revalidasiPublik } from '@/hooks/revalidasiPublik'
  +import { validasiVtt } from '@/lib/validasi'
   
   /** Artikel induk tidak disimpan di sini: frontend mencari artikel yang `videoTerkait`-nya video ini. */
   const redirect = redirectSaatPathBerubah(targetSederhana('video'))
  @@ -41,6 +42,15 @@ export const Video: CollectionConfig = {
       { name: 'pilar', type: 'relationship', relationTo: 'pilar', required: true },
       { name: 'durasiDetik', type: 'number', label: 'Durasi (detik)', min: 1 },
       { name: 'transkrip', type: 'textarea', required: true },
  +    {
  +      name: 'takarir',
  +      type: 'textarea',
  +      label: 'Takarir (WebVTT)',
  +      validate: (value: unknown) => validasiVtt(value),
  +      admin: {
  +        description: 'Opsional. Tempel isi berkas .vtt (baris pertama WEBVTT, lalu cue bertanda waktu). Transkrip tetap tampil di bawah video.',
  +      },
  +    },
       seoField,
     ],
   }
  ```

  Lalu jalankan:

  ```bash
  npm run generate:types
  git diff --stat src/payload-types.ts
  ```

  Hasil yang diharapkan: `src/payload-types.ts | 5 +++++` (field `takarir` di `Video` dan `VideoSelect`).

- [ ] **Langkah 4: Data, rute, dan track di pemutar**

  ```diff
  diff --git a/src/modules/konten/tipe.ts b/src/modules/konten/tipe.ts
  index 82468c8..f336851 100644
  --- a/src/modules/konten/tipe.ts
  +++ b/src/modules/konten/tipe.ts
  @@ -114,8 +114,8 @@ export type DataPenulis = PenulisRingkas & { tautan: Tautan[]; artikel: KartuArt
   /** Kartu video vertikal 9:16 untuk indeks `/video` dan "Video lain". `poster`: unggahan editor atau frame video. */
   export type KartuVideo = { id: number; judul: string; href: string; durasi: number | null; pilar: PilarRingkas | null; poster: MediaTampil | null }
   
  -/** Dokumen video yang diputar `VideoSemat` (sumber HLS dan MP4, poster, transkrip). */
  -export type VideoUntukSemat = Pick<Video, 'judul' | 'file' | 'poster' | 'transkrip' | '_status'>
  +/** Dokumen video yang diputar `VideoSemat` (sumber HLS dan MP4, poster, transkrip, takarir). */
  +export type VideoUntukSemat = Pick<Video, 'judul' | 'slug' | 'file' | 'poster' | 'transkrip' | 'takarir' | '_status'>
   
   /** Halaman `/video/{slug}`: video, artikel induknya (yang `videoTerkait`-nya video ini), dan video lain. */
   export type DataVideo = KartuVideo & { semat: VideoUntukSemat; induk: KartuArtikel | null; lain: KartuVideo[]; seo: VideoSeo }
  ```

  ```diff
  diff --git a/src/modules/konten/video.ts b/src/modules/konten/video.ts
  index b3a7a42..94d050a 100644
  --- a/src/modules/konten/video.ts
  +++ b/src/modules/konten/video.ts
  @@ -11,6 +11,11 @@ export const MAKS_VIDEO_LAIN = 4
   
   type VideoUntukKartu = Pick<Video, 'id' | 'judul' | 'slug' | 'durasiDetik' | 'pilar' | 'file' | 'poster'>
   
  +/** Path takarir WebVTT sebuah video, dilayani `src/app/(frontend)/video/[slug]/takarir.vtt/route.ts`. */
  +export function pathTakarir(slug: string): string {
  +  return `${pathFor({ jenis: 'video', slug })}/takarir.vtt`
  +}
  +
   /** Lama video untuk pembaca: "45 detik", "1 menit", "1 menit 5 detik". */
   export function labelDurasi(detik: number): string {
     const total = Math.max(1, Math.round(detik))
  @@ -44,7 +49,15 @@ export function susunVideo(doc: Video, induk: KartuArtikel | null, lain: KartuVi
     if (!kartu) return null
     return {
       ...kartu,
  -    semat: { judul: doc.judul, file: doc.file, poster: doc.poster, transkrip: doc.transkrip, _status: doc._status },
  +    semat: {
  +      judul: doc.judul,
  +      slug: doc.slug,
  +      file: doc.file,
  +      poster: doc.poster,
  +      transkrip: doc.transkrip,
  +      takarir: doc.takarir,
  +      _status: doc._status,
  +    },
       induk,
       lain,
       seo: doc as VideoSeo,
  ```

  ```diff
  diff --git a/src/modules/konten/data.ts b/src/modules/konten/data.ts
  index e16d8cc..cdfc4ad 100644
  --- a/src/modules/konten/data.ts
  +++ b/src/modules/konten/data.ts
  @@ -59,7 +59,7 @@ const POPULATE_ARTIKEL = {
     media: { alt: true, publicId: true, jenis: true, width: true, height: true, caption: true, kredit: true },
     artikel: { judul: true, slug: true, tipe: true, pilar: true, intinya: true, _status: true },
     tools: { nama: true, slug: true, ringkasan: true, _status: true },
  -  video: { judul: true, slug: true, file: true, poster: true, transkrip: true, _status: true },
  +  video: { judul: true, slug: true, file: true, poster: true, transkrip: true, takarir: true, _status: true },
     halaman: { judul: true, slug: true, _status: true },
   } as const
   
  @@ -331,3 +331,17 @@ export async function ambilBeranda(payload: Payload): Promise<BagianBeranda[]> {
       newsletter: susunNewsletter(newsletter),
     })
   }
  +
  +/** Isi takarir WebVTT video terbit dengan slug ini, `null` bila video tidak ada atau belum punya takarir. */
  +export async function ambilTakarir(payload: Payload, slug: string): Promise<string | null> {
  +  if (validasiFormatSlug(slug) !== true) return null
  +  const { docs } = await payload.find({
  +    collection: 'video',
  +    where: { and: [{ slug: { equals: slug } }, terbit] },
  +    depth: 0,
  +    limit: 1,
  +    pagination: false,
  +    select: { takarir: true },
  +  })
  +  return docs[0]?.takarir?.trim() || null
  +}
  ```

  ```diff
  diff --git a/src/modules/konten/cache.ts b/src/modules/konten/cache.ts
  index 548221b..9b85bf2 100644
  --- a/src/modules/konten/cache.ts
  +++ b/src/modules/konten/cache.ts
  @@ -15,6 +15,7 @@ import {
     ambilHeader,
     ambilPenulis,
     ambilRubrik,
  +  ambilTakarir,
     ambilTerbaru,
     ambilTools,
     ambilVideo,
  @@ -145,3 +146,9 @@ export const muatBeranda = unstable_cache(async () => ambilBeranda(await payload
     tags: [TAG.beranda, TAG.media],
     revalidate: SEJAM,
   })
  +
  +/** Takarir WebVTT per video; dibuang saat video berubah. */
  +export const muatTakarir = unstable_cache(async (slug: string) => ambilTakarir(await payload(), slug), ['konten', 'takarir'], {
  +  tags: [TAG.koleksi('video')],
  +  revalidate: SEJAM,
  +})
  ```

  ```diff
  diff --git a/src/modules/konten/index.ts b/src/modules/konten/index.ts
  index 500787d..5cbd33a 100644
  --- a/src/modules/konten/index.ts
  +++ b/src/modules/konten/index.ts
  @@ -21,6 +21,7 @@ export {
     muatRedirect,
     muatRubrik,
     muatSitus,
  +  muatTakarir,
     muatTerbaru,
     muatTools,
     muatVideo,
  @@ -36,6 +37,7 @@ export {
     ambilHeader,
     ambilPenulis,
     ambilRubrik,
  +  ambilTakarir,
     ambilTerbaru,
     ambilTools,
     ambilVideo,
  @@ -55,7 +57,7 @@ export {
     type SumberBeranda,
   } from './beranda'
   export { itemTools, kelompokkanTools } from './tools'
  -export { kartuVideo, labelDurasi, MAKS_VIDEO_INDEKS, MAKS_VIDEO_LAIN, susunVideo } from './video'
  +export { kartuVideo, labelDurasi, MAKS_VIDEO_INDEKS, MAKS_VIDEO_LAIN, pathTakarir, susunVideo } from './video'
   export { MAKS_ARTIKEL_PENULIS, susunPenulis } from './penulis'
   export { JUDUL_FAQ, susunHalaman } from './halaman'
   export { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
  ```

  ```diff
  diff --git a/src/components/isi/VideoSemat.tsx b/src/components/isi/VideoSemat.tsx
  index 76af63a..2e73085 100644
  --- a/src/components/isi/VideoSemat.tsx
  +++ b/src/components/isi/VideoSemat.tsx
  @@ -1,6 +1,7 @@
   import { mediaTampil } from '@/modules/konten/artikel'
   import { paragrafTeks } from '@/modules/konten/isi'
   import type { VideoUntukSemat } from '@/modules/konten/tipe'
  +import { pathTakarir } from '@/modules/konten/video'
   import { bangunUrl } from '@/modules/media/url'
   
   import gaya from './Isi.module.css'
  @@ -8,7 +9,8 @@ import gaya from './Isi.module.css'
   /**
    * Video vertikal di isi tanpa JavaScript: HLS untuk browser yang memutarnya langsung (Safari, Chrome
    * Android), MP4 cadangan untuk yang lain. Tidak dimuat sebelum diputar (`preload="none"`), dan
  - * transkrip selalu tersedia di bawahnya. `utama`: video adalah isi utama halaman `/video/{slug}`,
  + * transkrip selalu tersedia di bawahnya. Video yang punya takarir WebVTT mendapat `<track>` takarir
  + * bahasa Indonesia (WCAG 2.2 1.2.2), bisa dinyalakan dari tombol CC pemutar. `utama`: video adalah isi utama halaman `/video/{slug}`,
    * jadi judulnya sudah menjadi H1 (tanpa keterangan) dan transkrip langsung terbuka.
    */
   export function VideoSemat({ video, cloudName, utama = false }: { video: number | VideoUntukSemat; cloudName: string; utama?: boolean }) {
  @@ -34,6 +36,7 @@ export function VideoSemat({ video, cloudName, utama = false }: { video: number
         >
           <source src={bangunUrl(cloudName, file.publicId, 'hls')} type="application/vnd.apple.mpegurl" />
           <source src={bangunUrl(cloudName, file.publicId, 'mp4')} type="video/mp4" />
  +        {video.slug && video.takarir?.trim() && <track kind="captions" src={pathTakarir(video.slug)} srcLang="id" label="Bahasa Indonesia" />}
         </video>
         {!utama && <figcaption className={gaya.keterangan}>{video.judul}</figcaption>}
         <details className={gaya.transkrip} open={utama}>
  ```

  `src/app/(frontend)/video/[slug]/takarir.vtt/route.ts`

  ```ts
  import { muatTakarir } from '@/modules/konten'

  /**
   * `/video/{slug}/takarir.vtt`: takarir WebVTT video terbit untuk `<track>` di pemutar. Isinya disimpan
   * di CMS (field `takarir`), jadi tidak ada unggahan berkas ke Cloudinary. Data di-cache bertag `video`.
   */
  export const dynamic = 'force-dynamic'

  export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const takarir = await muatTakarir((await params).slug)
    if (!takarir) return new Response('Takarir tidak ditemukan.', { status: 404 })
    return new Response(`${takarir}\n`, {
      headers: {
        'Content-Type': 'text/vtt; charset=utf-8',
        'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
      },
    })
  }
  ```

- [ ] **Langkah 5: Jalankan tes unit dan integrasi**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 44 passed (44)`, `Tests 287 passed (287)`; integrasi `Test Files 25 passed (25)`, `Tests 73 passed (73)`.

- [ ] **Langkah 6: Takarir contoh, skema dev, dan tes E2E**

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index b45a84e..e7abbdd 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -59,7 +59,19 @@ const dasar = { _status: 'published' as const, penulis: redaksi.id, gambarUtama:
   
   // Video vertikal: file MP4 kecil lewat klien palsu (1080x1920, 30 detik). Tanpa poster unggahan,
   // kartu memakai frame video dari Cloudinary.
  -async function buatVideo({ pilar: slugPilar, draf = false, ...data }: { judul: string; slug: string; pilar: string; durasiDetik: number; transkrip: string; draf?: boolean }) {
  +async function buatVideo({
  +  pilar: slugPilar,
  +  draf = false,
  +  ...data
  +}: {
  +  judul: string
  +  slug: string
  +  pilar: string
  +  durasiDetik: number
  +  transkrip: string
  +  takarir?: string
  +  draf?: boolean
  +}) {
     const isiMp4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.from([0, 0, 2, 0]), Buffer.from('isommp41'), Buffer.from([0, 0, 0, 8]), Buffer.from('free')])
     const file = await payload.create({ collection: 'media', data: {}, file: { data: isiMp4, mimetype: 'video/mp4', name: `${data.slug}.mp4`, size: isiMp4.length } })
     return payload.create({
  @@ -75,6 +87,7 @@ const videoPph21 = await buatVideo({
     pilar: 'uang-karier',
     durasiDetik: 45,
     transkrip: 'Ambil slip gaji bulan lalu.\n\nCari baris PPh 21 di slip gajimu. Angka itu dipotong setiap bulan memakai tarif efektif.',
  +  takarir: 'WEBVTT\n\n00:00.000 --> 00:03.000\nAmbil slip gaji bulan lalu.\n\n00:03.000 --> 00:08.000\nCari baris PPh 21 di slip gajimu.',
   })
   await buatVideo({
     judul: 'Kenapa kode OTP tidak boleh dibagikan',
  ```

  `tests/e2e/takarir.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { cegatCloudinary } from './bantu'
  import { SLUG_VIDEO } from './data'

  test.beforeEach(async ({ page }) => {
    await cegatCloudinary(page)
  })

  test('video bertakarir: track captions bahasa Indonesia dan berkas WebVTT', async ({ page, request }) => {
    await page.goto(`/video/${SLUG_VIDEO.pph21}`)
    const track = page.locator('video track[kind="captions"]')
    await expect(track).toHaveAttribute('srclang', 'id')
    await expect(track).toHaveAttribute('src', `/video/${SLUG_VIDEO.pph21}/takarir.vtt`)
    const vtt = await request.get(`/video/${SLUG_VIDEO.pph21}/takarir.vtt`)
    expect(vtt.status()).toBe(200)
    expect(vtt.headers()['content-type']).toBe('text/vtt; charset=utf-8')
    expect(await vtt.text()).toMatch(/^WEBVTT\n\n00:00\.000 --> 00:03\.000\nAmbil slip gaji bulan lalu\./)
  })

  test('video tanpa takarir: tanpa track dan berkas takarirnya 404', async ({ page, request }) => {
    await page.goto(`/video/${SLUG_VIDEO.otp}`)
    await expect(page.locator('video')).toHaveCount(1)
    await expect(page.locator('video track')).toHaveCount(0)
    expect((await request.get(`/video/${SLUG_VIDEO.otp}/takarir.vtt`)).status()).toBe(404)
    expect((await request.get(`/video/${SLUG_VIDEO.draf}/takarir.vtt`)).status()).toBe(404)
  })
  ```

  Jalankan:

  ```bash
  npm run seed
  npm run test:e2e
  npm run build
  ```

  Hasil yang diharapkan: seed mendorong kolom `takarir` ke database dev tanpa pertanyaan; E2E `74 passed`; build mencantumkan `ƒ /video/[slug]/takarir.vtt`.

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/lib/validasi.ts src/collections/Video.ts src/payload-types.ts src/modules/konten src/components/isi/VideoSemat.tsx "src/app/(frontend)/video" tests/unit/takarir.test.ts tests/int/takarir.int.spec.ts tests/e2e
  git commit -m "feat(ui): takarir video WebVTT dari CMS dan track captions di pemutar"
  ```

---

## Selesai bila

- Tanpa Task 11: `npm test` lulus (285 tes unit di 43 file dan 72 tes integrasi di 24 file), `npm run test:e2e` lulus (72 tes E2E, axe tanpa pelanggaran WCAG 2.2 AA di 375, 768, dan 1440 px untuk beranda, rubrik, halaman statis, penulis, video, tools, cari, dan halaman Rencana 4A), `npm run typecheck` dan `npm run lint` bersih, `npm run build` berhasil, semuanya tanpa jaringan dan tanpa kredensial Cloudinary asli. Dengan Task 11: 287 tes unit di 44 file, 73 tes integrasi di 25 file, 74 tes E2E.
- `/` menampilkan beranda dari global `beranda` sesuai mockup Kartu Intinya; `/{pilar}`, `/{pilar}/{subkategori}`, halaman statis terbit, `/penulis/{slug}`, `/video`, `/video/{slug}`, `/tools`, dan `/cari` tampil dengan metadata, canonical, robots, dan JSON-LD dari modul SEO; halaman 404 punya form cari.
- `sitemap/halaman.xml` dimulai dengan `/` dan memuat `/glosarium`, `/tools`, `/video` bila ada isinya; `sitemap/pilar.xml` memuat halaman subkategori.
- Menyimpan global `beranda` atau `newsletter`, atau menerbitkan artikel, pilar, video, atau tools, membuang cache beranda.
- Setiap jenis halaman publik memuat JavaScript di bawah 160 KiB dan beranda tidak lebih dari artikel; tanpa dependensi baru.
- Skema hanya bertambah kolom `tampilkan_tools` (dan `takarir` bila Task 11 dijalankan); `payload-types.ts` hanya berubah di Task 7 dan Task 11.

## Cakupan yang ditunda (dengan alasan)

| Butir | Ditunda ke | Alasan |
|---|---|---|
| "Paling dibaca pekan ini" dan "artikel populer" di halaman 404 berdasarkan data kunjungan | Rencana 6 | Butuh data klik per URL (Search Analytics). Sampai saat itu blok beranda jujur menampilkan "Tulisan terbaru"; Rencana 6 cukup mengganti sumber `terbaru` di `ambilBeranda` dan judul `JUDUL_TERBARU`. |
| Slot iklan sungguhan (`SlotIklan` yang memesan tinggi sesuai ukuran slot, lazy setelah terlihat, persetujuan cookie) | Rencana 8 | Butuh global `iklan` (ukuran, penyedia) dan banner persetujuan. Blok `slotIklan` beranda sudah tersimpan di CMS dan sekarang dilewati `susunBeranda`. |
| Form email newsletter langsung di halaman (sematan penyedia) | Rencana 8, setelah pemilik memilih penyedia | Tiap penyedia memakai URL aksi dan nama field berbeda yang harus dicek dengan akun asli; menyimpan email sendiri butuh kebijakan privasi dan persetujuan (UU PDP). Sekarang tombol ke form penyedia. Newsletter otomatis tetap Fase 2. |
| Paginasi rubrik, profil penulis, indeks video, dan hasil cari | Rencana 6 (bersama dashboard SEO), atau lebih awal bila satu pilar melewati 24 tulisan | 60 sampai 90 hari pertama fokus di dua pilar dengan satu penulis; semua artikel tetap terjangkau lewat subkategori, sitemap, RSS, dan pencarian. Paginasi berbasis path (bukan `?halaman=`) supaya tetap ISR. |
| Redirect otomatis saat slug subkategori atau slug pilar berganti untuk path `/{pilar}/{subkategori}` | Rencana 6 (Mesin Indexing menangani perubahan URL) | Koleksi `subkategori` belum punya hook `redirectSaatPathBerubah` (path butuh slug pilar). Editor bisa membuat redirect manual di koleksi `redirect`; rute catch-all sudah memeriksanya untuk path dua segmen. |
| Pencarian teks penuh (stemming bahasa Indonesia, salah ketik, peringkat relevansi) | Setelah artikel ratusan, sebelum ribuan | `ILIKE` per kata cukup untuk puluhan sampai ratusan artikel. Pengganti yang direncanakan: kolom `tsvector` Postgres lewat migrasi (Rencana 8 menyiapkan migrasi produksi). |
| Halaman kalkulator `/tools/{slug}` dan angka hasil kalkulator (GSAP atau CSS) | Rencana 5 | Sesuai peta rencana. Kartu di `/tools` dan kotak "Hitung sendiri" sudah menautkan path itu. |
| Penanda rubrik aktif di pill header (`aria-current`) | Rencana 5 | Header dirender layout tanpa path; butuh komponen klien kecil (`usePathname`) atau prop dari halaman. Remah roti dan navigasi subkategori sudah menandai halaman aktif. |
| Indeks `/penulis` | belum direncanakan | Tidak ada di spesifikasi §7; MVP satu penulis. |
| Mode gelap | Fase 2 | Token `--latar-terbalik` dan `--teks-terbalik` mengikuti pola tiga lapis, jadi cukup menambah nilai lapis semantik. |

## Risiko dan pertanyaan terbuka

| Risiko | Mitigasi |
|---|---|
| **Reveal judul beranda tidak memakai GSAP seperti spesifikasi §13.** | Probe: GSAP membuat JS beranda 168,6 KiB (di atas anggaran 160 KiB) dan chunk-nya sendiri 27,2 KB (di atas 25 KB); judul raksasa adalah elemen LCP beranda (probe 412 px tanpa reveal), jadi animasi yang menunggu JavaScript menunda LCP atau berkedip. Reveal CSS memberi gerak yang sama tanpa biaya itu. **Pertanyaan untuk pemilik:** setuju spesifikasi §13 diubah menjadi "reveal judul beranda dengan CSS", dan GSAP diputuskan ulang untuk angka kalkulator di Rencana 5? Bila tidak, ikuti langkah di "Dependensi baru" dan putuskan anggaran beranda. |
| **Blok "Paling dibaca pekan ini" menampilkan "Tulisan terbaru"** sampai Rencana 6. | Judul tetap jujur dan deskripsi field di admin menjelaskannya. **Pertanyaan:** lebih suka blok ini disembunyikan sampai data kunjungan ada? Cukup ubah `susunBeranda` agar melewati `palingDibaca`. |
| **Newsletter hanya tautan ke form penyedia**, bukan isian email seperti mockup. | Tidak ada form palsu dan tidak ada email tersimpan. **Pertanyaan:** penyedia mana yang dipilih (Kit, Mailchimp, Brevo)? Setelah ada akun, form sematan bisa ditambah di Rencana 8 bersama persetujuan cookie. Blok tidak tampil sampai global `newsletter` aktif dan `urlForm` terisi. |
| Kartu tools menautkan `/tools/{slug}` yang baru ada di Rencana 5. | Jangan terbitkan dokumen `tools` sebelum Rencana 5; tanpa tools terbit, `/tools` menampilkan pesan kosong dan kotak "Hitung sendiri" tidak tampil. Sitemap `tools.xml` (Rencana 3) juga hanya memuat tools terbit. |
| `/cari` dirender per permintaan dan memakai `ILIKE`. | Hasil per kueri di-cache bertag `artikel`; kueri dipotong 80 karakter dan 6 kata; halaman `noindex`. Bila disalahgunakan (banyak kueri unik), tambahkan rate limit (Vercel Firewall) di Rencana 8. |
| Global `beranda` memakai draf: dokumen hasil `npm run seed` berstatus `draft` di kolom `_status`, tetapi `findGlobal` tanpa `draft` tetap membacanya sebagai versi publik. | Diuji integrasi (`ambilBeranda`). Menyimpan draf dari admin tidak mengubah dokumen utama, jadi beranda publik baru berubah saat diterbitkan. Hook revalidasi juga jalan saat menyimpan draf; biayanya hanya satu render ulang. |
| `npm run build` kini merender `/`, `/tools`, dan `/video` dari database dev. | Sudah tercatat di CLAUDE.md. Build Vercel punya akses Supabase; Rencana 8 wajib menyiapkan migrasi Payload untuk kolom `tampilkan_tools` (dan `takarir`) sebelum deploy. |
| Strip video dengan kurang dari 4 video menyisakan kolom kosong di kanan (grid 4 kolom). | Kartu tetap 9:16 dengan lebar wajar; pemilik disarankan menerbitkan minimal 4 video sebelum menampilkan strip. Bila kurang, blok strip bisa dihapus dari global `beranda`. |
| Video tanpa takarir (WCAG 2.2 1.2.2). | Transkrip selalu terbuka di halaman video. **Pertanyaan:** jalankan Task 11 (takarir WebVTT dari CMS)? Task itu terpisah dan bisa dilewati tanpa memengaruhi task lain. |
| **Isi halaman 404 kadang tidak muncul** (warisan Rencana 4A, bukan perubahan rencana ini). Next 16.3.3 mengirim `notFound()` sebagai cangkang `<html id="__next_error__">` lalu merender isi 404 di browser. Pada verifikasi penuh probe (11 run E2E, sekitar 70 kunjungan 404 di browser), 2 kunjungan (tes 404 1440 px di Task 2 dan tes View Transitions di Task 5) tetap berupa cangkang kosong selama 5 dan 30 detik batas tesnya. Jejak Playwright: preload CSS dan font dibatalkan browser (`net::ERR_ABORTED`) saat isi 404 mulai dirender, satu CSS tidak pernah diminta ulang, dan React menahan commit sampai stylesheet selesai dimuat (batas tunggu React 19.2.6 di Next: 60 detik). | Status 404, judul, dan `noindex` tetap benar di HTML awal, jadi SEO tidak terdampak; yang terdampak hanya pembaca yang melihat layar kosong (tanpa form cari dan tulisan terbaru). Tidak bisa direproduksi di luar rangkaian E2E: 0 dari 99 kunjungan dengan skrip Playwright terpisah (termasuk CPU 4x lebih lambat, CPU sibuk, dan CSS ditunda 150 ms) dan 0 dari 30 kunjungan 404 di `galat.spec.ts` + `motion.spec.ts` dengan `--repeat-each=5`; E2E penuh Task 2 dan Task 5 lulus saat diulang. **Pertanyaan:** buat rencana perbaikan terpisah (misalnya cek perilaku di patch Next 16.3 berikutnya dan laporkan ke Next.js dengan jejak ini) sebelum peluncuran di Rencana 8? |

## Temuan review sebelum eksekusi

| Temuan | Tindakan |
|---|---|
| Probe awal halaman statis: jarak sekitar 88 px antara hero dan blok teks yang dibuka H2 (`gap` 40 px ditambah `margin-top` 48 px `.prosa h2`). | Sudah masuk Task 2: `.prosa > :first-child { margin-top: 0 }` dan tes E2E jarak 40 px di 375 dan 1440 px. |
| Probe awal mozaik di 768 px: dua kartu samping bertumpuk dengan ruang kosong di bawahnya, dan kartu Tekno serta kotak "Hitung sendiri" masing-masing selebar layar. | Sudah masuk Task 8: kolom samping `flex-wrap` (kartu `1 1 280px`, selektor `.mozaik .kolom > *` supaya `height: auto` mengalahkan `height: 100%` kartu), baris kedua `1 1 280px` dan `2 1 400px`, plus tes E2E posisi kartu di 768 px. |
| Probe awal halaman video: pemutar mengikuti rasio poster (16:9 di tes) dan ikon durasi terpisah dari teksnya; di desktop separuh kanan kosong. | Sudah masuk Task 4: `aspect-ratio` dari ukuran file video, `inline-flex` di kicker, dan kolom penjelasan di samping video mulai 1024 px, plus tes E2E rasio 9:16. |
| Probe awal form cari di 375 px: tombol Cari turun ke baris sendiri. | Sudah masuk Task 6: basis label 200 px, plus tes E2E tombol sebaris dengan isian. |
| Verifikasi penuh per commit: E2E Task 2 (1 gagal dari 42) dan Task 5 (1 gagal dari 56) gagal sekali di tes yang membuka halaman 404, keduanya dengan `<html id="__next_error__">` yang tidak pernah dirender. | Penyebabnya perilaku 404 Next 16.3.3 dari Rencana 4A (lihat Risiko), bukan kode rencana ini. E2E penuh kedua task lulus saat diulang (42 dan 56 lulus). Petunjuk untuk pelaksana ada di Global Constraints. |
| Review screenshot akhir (setelah rencana ditulis): di beranda 375 px tombol Cari pada form besar di hero turun ke baris sendiri, padahal form yang sama di `/cari` dan 404 sebaris. Penyebab: label flex memakai `min-width: auto`, jadi lebar minimumnya mengikuti lebar intrinsik `<input>` (dihitung dari lebar rata-rata glyph Archivo `standard`), dan padding varian `besar` menambah 4 px sampai melewati 343 px. Tes Task 6 hanya memeriksa `/cari`. | Commit perbaikan terpisah setelah Task 10 (sebelum Task 11 bila dijalankan), pola yang sama dengan perbaikan jarak Rencana 4A: di `src/components/cari/Cari.module.css` tambahkan `min-width: 0;` di `.label` serta `width: 100%;` dan `min-width: 0;` di `.input`; tes "tombol Cari tetap sebaris dengan kolom isian di layar 375 px" di `tests/e2e/cari.spec.ts` memeriksa `/cari` dan `/`. Jumlah tes tidak berubah. Sudah direproduksi di replika Playwright dengan berkas font yang sama: tanpa perbaikan tombol turun di 375 px, dengan perbaikan sebaris. Di 320 px kedua varian tetap turun ke baris sendiri, dan itu wajar. |

## Sumber riset

- Next.js 16.3.3 (dokumentasi terpasang di `node_modules/next/dist/docs/`, sama dengan nextjs.org): `page.js` dan `searchParams` sebagai Request-time API yang memilih rendering dinamis (https://nextjs.org/docs/app/api-reference/file-conventions/page), Caching (Previous Model) (https://nextjs.org/docs/app/guides/caching-without-cache-components), ISR (https://nextjs.org/docs/app/guides/incremental-static-regeneration), Route Handlers (https://nextjs.org/docs/app/api-reference/file-conventions/route).
- Payload 3.92.1: operator `like` di adapter Postgres (`@payloadcms/drizzle` `dist/queries/parseParams.js` dan `operatorMap.js`: `ILIKE '%kata%'` per kata), global dengan `versions.drafts` (`findGlobal` membaca dokumen utama), opsi query `select` dan `populate`.
- GSAP 3.15.0 dari registry npm (`npm view gsap`, `npm pack gsap@3.15.0`), lisensi https://gsap.com/standard-license; ukuran diukur dengan esbuild 0.18 dan build produksi Next di probe.
- WebVTT (https://www.w3.org/TR/webvtt1/): kepala `WEBVTT` dan cue bertanda waktu; elemen `<track>` (https://html.spec.whatwg.org/multipage/media.html#the-track-element); WCAG 2.2 SC 1.2.2 Captions (Prerecorded) (https://www.w3.org/TR/WCAG22/#captions-prerecorded).
- React 19.2.6 yang dibundel Next 16.3.3 (`next/dist/compiled/react-dom/cjs/react-dom-client.production.js`, `waitForCommitToBeReady`): commit ditahan sampai stylesheet dimuat, paling lama 60 detik; dipakai untuk menjelaskan jejak kegagalan 404 di Risiko.
- Largest Contentful Paint dan elemen beropasitas nol (https://web.dev/articles/lcp), diukur ulang di probe dengan `PerformanceObserver` pada viewport 412 px, dengan dan tanpa throttling Slow 4G + CPU 4x (CDP `Network.emulateNetworkConditions`, `Emulation.setCPUThrottlingRate`).
- Mockup arah visual "Arah 3 · Kartu Intinya" (kanvas "point.lat · Arah Visual", `Kartu.dc.html`).
- Probe workspace: branch `probe/rencana-4b` (satu commit per task, tree tiap task identik dengan blok kode rencana ini) dan `probe/rencana-4b-gsap` (pembanding GSAP).

Rencana berikutnya: **Rencana 5 (tools dan modul `hitung`)**, memakai `PATH_INDEKS.tools`, `ItemTools`, dan pola halaman dari rencana ini.
