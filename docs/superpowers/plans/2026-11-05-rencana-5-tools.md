# Rencana 5: Tools point.lat (modul `hitung` dan enam kalkulator)

> **Catatan revisi 9 November 2026 (v1.1.0, keputusan pemilik).** Rencana ini sudah selesai dieksekusi; teksnya disesuaikan supaya tidak bertentangan dengan keputusan terbaru:
> 1. Hosting **Vercel paket gratis (Hobby)**: cron Vercel sekali sehari, jadwal 10 menit opsional lewat Supabase Cron (runbook rilis H5), Pro hanya saat iklan dinyalakan.
> 2. **Full Next.js dengan perintah npm**: semua perintah `pnpm` diganti padanan npm (`npm run <skrip>`, `npm run <skrip> -- <argumen>`, `npx`, `npm install`, `npm ci`), `pnpm-lock.yaml` menjadi `package-lock.json`. Potongan `package.json` lama yang masih memuat pengaturan khusus pnpm (`onlyBuiltDependencies`) adalah catatan sejarah; versi sekarang memakai `allowScripts`.
> 3. **Setiap pembaruan dikirim sebagai zip + perintah terminal** (spesifikasi §21).
> 4. **Tanpa Docker, hanya Next.js, Vercel, dan Supabase**: `docker-compose.yml`, `Dockerfile`, dan `docker/` dihapus di v1.1.0. Langkah yang dulu membuat file itu dibiarkan sebagai sejarah. Tes memakai Postgres di mesin itu sendiri (Postgres bawaan runner GitHub di CI, Postgres sistem di sesi Claude); komputer pemilik memakai proyek Supabase pratinjau.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun modul `hitung` dan enam kalkulator MVP (Gaji Bersih, THR, Cicilan & KPR, Dana Darurat, BMI & Kalori, IPK) dengan angka aturan bertanggal dari CMS, halaman `/tools/{slug}` yang menghitung di browser dengan hasil contoh dari server, seed enam tools draf beserta parameternya dari sumber resmi, dan penanda halaman aktif di header, semuanya diuji dengan contoh resmi, tanpa jaringan, dan tanpa dependensi baru.

**Architecture:** `src/modules/hitung` adalah modul dalam dengan antarmuka kecil: `hitung(toolId, masukan, tanggal, parameter, teks?)` untuk menghitung, `siapkanKalkulator(...)` untuk halaman, `periksaParameter(doc)` untuk validasi CMS, dan `sumberParameter(toolId)` untuk pemuat data. Rumus, isian form, pembacaan teks masukan, pemilihan parameter sesuai tanggal, cadangan "parameter terakhir yang valid", dan format angka Indonesia semuanya di dalam modul. Modul ini fungsi murni tanpa database, jadi kode yang sama jalan di server (hasil contoh, log) dan di browser (kalkulator). Koleksi `parameter-tools` diperluas secara aditif (tabel bertanggal) dan divalidasi oleh modul `hitung`. Halaman `/tools/{slug}` adalah server component ISR seperti halaman lain (data lewat `muatTool`, tag `parameter-tools`), dengan satu komponen klien `Kalkulator` yang membaca form dan memanggil `hitung` di browser.

**Tech Stack:** Next.js 16.3.3 (App Router, ISR, `unstable_cache`, client component), Payload 3.92.1 (Local API, field `array`, validasi field, hook revalidasi), React 19, CSS Module + custom properties (container query, `@media (prefers-reduced-motion)`), `Intl.NumberFormat('id-ID')`, Vitest 4 (unit + integrasi, `react-dom/server` untuk tes render), Playwright 1.63 + `@axe-core/playwright` 4.14, PostgreSQL 16/17, npm 11, Node 22.23.4+.

**Spesifikasi:** `docs/superpowers/specs/2026-11-03-point-lat-design.md` (§3 aturan copy dan tipe konten Tools; §4 pola halaman tools; §5 modul `hitung`; §6 koleksi `tools` dan `parameterTools`; §7 URL `/tools/{slug}`; §12 Performa; §13 Motion (angka hasil kalkulator); §14 Aksesibilitas (label terlihat, pesan error di bawah field dengan `aria-live`, target 44 px); §15 Input kalkulator tidak valid dan parameter tools tidak ada untuk tanggal; §16 Testing (contoh perhitungan dari sumber resmi, kalkulator gaji menghasilkan angka contoh resmi); §17 Cakupan (tools 6)).

**Rencana sebelumnya:** `docs/superpowers/plans/2026-11-04-rencana-1-fondasi.md` sampai `docs/superpowers/plans/2026-11-04-rencana-4b-frontend.md` beserta perbaikan sesudahnya (sampai commit `34aa23a`). Rencana ini memakai koleksi `tools` dan `parameter-tools` (Rencana 1), JSON-LD WebApplication dan `ToolsSeo` (Rencana 3), `PATH_INDEKS.tools`, `ItemTools`, indeks `/tools`, kotak "Hitung sendiri" beranda, dan pola halaman ISR (Rencana 4A dan 4B). Baseline: 287 tes unit di 44 file, 73 tes integrasi di 25 file, 74 tes E2E.

## Dependensi baru (butuh persetujuan pemilik)

**Rencana ini tidak menambah dependensi.** Spesifikasi §13 dulu meminta GSAP untuk angka hasil kalkulator; Rencana 4B sudah mengukurnya dan rencana ini mengukur sisi kalkulatornya.

| Paket | Versi persis | Alasan | Ukuran terukur | Keputusan rencana ini |
|---|---|---|---|---|
| `gsap` | 3.15.0 (diukur Rencana 4B) | Animasi angka hasil kalkulator (spesifikasi §13 sebelum rencana ini) | Bundel `gsap` 27,5 KB gzip; inti saja (`gsap/gsap-core`) 20,0 KB. Kalkulator dan modul `hitung` di probe: chunk 13.511 byte gzip. Anggaran §12: JS milik point. di luar kerangka di bawah 25 KB. GSAP saja sudah melewatinya, dan bersama kalkulator menjadi sekitar 33 sampai 41 KB. | **Tidak dipasang.** Angka hasil baru muncul dengan animasi CSS (naik 0,3em + opacity, 250 ms, kurva token), 0 KB JavaScript tambahan, mati dengan `prefers-reduced-motion: reduce`. Task 11 mencatat keputusan ini di spesifikasi §13. |

Tidak ada pustaka format angka, validasi form, atau matematika keuangan: `Intl.NumberFormat('id-ID')`, `FormData`, dan rumus anuitas cukup.

## Global Constraints

- Node `^22.23.4 || >=24.22.1`, npm 11. Versi dikunci: Next `16.3.3`, Payload `3.92.1`, `@playwright/test` `1.63.0`. **Tanpa dependensi baru** (lihat bagian sebelumnya).
- Nama domain berbahasa Indonesia seperti rencana sebelumnya (`hitung`, `siapkanKalkulator`, `parameterTersimpan`, `HalamanTool`, `Kalkulator`, `TautanAktif`). Nama teknis framework tetap bahasa Inggris.
- Copy UI, pesan galat, dan teks seed: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash (juga di teks seed dan komentar), tanpa tanda seru. CTA menyebut hasilnya ("Hitung gaji bersih", "Hitung IPK"). Pesan galat isian: penyebab + cara memperbaiki ("Gaji pokok dan tunjangan tetap per bulan belum diisi. Tulis angkanya, misalnya 8.000.000.").
- Angka ditulis cara Indonesia lewat `Intl.NumberFormat('id-ID')` di `src/modules/hitung/format.ts` ("Rp 8.000.000", "1,5%", "22,0"). Spasi tak putus di kode ditulis sebagai escape `\u00a0`, jangan karakter harfiah (tidak terlihat saat review).
- **Semua rumus dan angka aturan ada di `src/modules/hitung`.** Komponen, halaman, dan seed tidak menghitung sendiri. Angka aturan (PTKP, TER, iuran, batas upah, kategori IMT, konversi nilai) hanya dari koleksi `parameter-tools`; yang boleh ada di kode hanya cara hitungnya dan konstanta ilmiah rumus (koefisien Mifflin-St Jeor).
- Path publik lewat `pathFor()` atau `PATH_INDEKS` (`src/lib/paths.ts`); SEO lewat `src/modules/seo` (`metadata`, `jsonLd`, `remahRoti`, `metadataTidakDitemukan`). Path tanpa dokumen diakhiri `tanganiTidakAda(path)` di komponen halaman; `generateMetadata` mengembalikan `metadataTidakDitemukan()` (jangan memanggil `tanganiTidakAda` di `generateMetadata`: Next 16.3.3 mengirim header `Location` dua kali).
- Warna, tipografi, radius, spasi, dan motion dari token Rencana 4A; komponen hanya memakai token semantik. Warna pilar selalu bersama nama pilarnya. Kuning dan koral tidak dipakai sebagai warna teks di latar terang. Dilarang: gradien biru-ungu, teks gradien, efek kaca, glow.
- Motion: hanya `transform` dan `opacity`, kurva dan durasi dari token, tanpa animasi yang berjalan terus; `prefers-reduced-motion: reduce` mematikan semuanya.
- Tata letak tidak boleh bergantung jumlah elemen. Label yang berisi isian di dalam flex atau grid diberi `min-width: 0` supaya isian tidak melebar keluar kolom. Setiap tata letak baru dijaga tes E2E yang mengukurnya (tanpa geser horizontal, tombol satu baris, angka hasil muat, jarak bagian).
- **Perubahan skema harus aditif.** Rencana ini hanya membuat `parameter_tools.nilai` boleh kosong dan menambah tabel `parameter_tools_tabel` (Task 2). Setelah mengubah field: `npm run generate:types`, lalu `npm run seed` sebelum `npm run build` (build membaca database dev). Bila Payload macet di "Pulling schema from database..." (pertanyaan DATA LOSS), jangan menjawab; reset database yang bersangkutan seperti Rencana 2 (`DROP DATABASE ... WITH (FORCE)` lalu `CREATE DATABASE`).
- `npm run build` membaca database dev (`pointlat` dari `.env`). Postgres harus jalan (`pg_ctlcluster 16 main start` bila mati). `/tools/{slug}` tidak dirender saat build (`generateStaticParams` kosong), tetapi layout dan halaman statis lain tetap dirender.
- Tes tidak memanggil jaringan. Unit dan integrasi memakai `.env.test` (database `pointlat_test`). E2E memakai database `pointlat_test_e2e` (dibuat dan diisi ulang `tests/e2e/siapkan.ts`), build produksi di port 3100, kredensial Cloudinary palsu `e2e`, dan permintaan ke `res.cloudinary.com` dicegat browser tes. URL sumber aturan di seed hanya disimpan sebagai teks, tidak pernah dibuka tes.
- E2E menjalankan `next build` sendiri sehingga isi `.next/` diganti build E2E. Setelah E2E, jalankan `npm run build` lagi sebelum `npm run start` biasa.
- Server manual memakai port 3200 dan dihentikan dengan `fuser -k 3200/tcp`, jangan `pkill -f` dengan pola luas. Menunggu server: `timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'`. Jangan meninggalkan proses latar belakang setelah task selesai.
- `next dev` dan `next build` di Next 16.3 bisa menambahkan blok "nextjs-agent-rules" ke `CLAUDE.md` bila mendeteksi agen AI. Periksa `git status` sebelum commit; buang blok itu dengan `git checkout CLAUDE.md` (Task 11 sengaja mengubah `CLAUDE.md`; di task itu buang blok itu saja).
- Jalankan `npm run typecheck` dan `npm run lint` di setiap task; keduanya harus bersih (lint tanpa error dan tanpa warning). Setiap task diakhiri unit, integrasi, dan E2E yang hijau.
- **Kegagalan E2E halaman 404 yang jarang (warisan Rencana 4A).** Tes yang membuka `/halaman-yang-tidak-ada` (`galat.spec.ts` "halaman 404 ... lolos axe" dan `motion.spec.ts` "kartu ke artikel memakai View Transitions") sesekali gagal dengan `locator resolved to <html id="__next_error__">` karena isi 404 tidak dirender di browser (lihat Risiko). Bila salah satu tes itu gagal dengan pesan tersebut, jalankan `npm run test:e2e` sekali lagi; bila gagal lagi, atau tes lain yang gagal, berhenti dan laporkan. Jangan menaikkan timeout atau melemahkan tesnya.

## Keputusan teknis (hasil riset dan probe, dipakai di semua task)

| Topik | Keputusan | Dasar |
|---|---|---|
| Antarmuka modul `hitung` | Empat fungsi: `hitung(toolId, masukan, tanggal, parameter, teks?) → Hasil`, `siapkanKalkulator(toolId, parameter, tanggal, teks?) → Kalkulator`, `periksaParameter(doc) → GalatParameter`, `sumberParameter(toolId) → ToolId[]`, ditambah `teksAngka` dan `teksRibuan` untuk format. Spesifikasi menulis `hitung(toolId, input, tanggal)`; `parameter` ditambahkan sebagai argumen supaya modul tetap fungsi murni tanpa Payload, jadi bisa jalan di browser dan diuji tanpa database. Rumus per kalkulator (`Rumus`: tombol, isian, definisi parameter, kalkulator sumber, fungsi hitung) adalah seam internal di registri `RUMUS: Record<ToolId, Rumus>`, tidak diekspor. | Spesifikasi §5 (tabel modul: "fungsi murni, parameter dari CMS"); prinsip modul dalam (antarmuka kecil, implementasi dalam): halaman, seed, koleksi, dan tes hanya mengenal empat fungsi itu |
| Hasil | `Hasil` = `{ ok: true, utama, ringkasan, rincian, catatan, peringatan }` atau `{ ok: false, galat: Record<kunci, pesan>, pesan }`. Semua angka hasil sudah membawa teks tampilan Indonesia (`teks`), jadi komponen tidak memformat angka. Galat kolom baris IPK memakai kunci `sks.2`. | Spesifikasi §5 ("hasil + rincian"), §15 (pesan di bawah field) |
| Masukan | Teks apa adanya dari form (`Masukan = Record<string, string \| string[]>`). Pembaca boleh menulis "Rp 8.000.000", "8000000", "65,5", "7.5"; satuan di belakang ("kg", "%") diabaikan. Rupiah: titik pemisah ribuan, koma desimal. Pesan galat memakai label isian dari CMS bila ada (`teks`). | Kebiasaan menulis angka di Indonesia; spesifikasi §15 (penyebab + cara memperbaiki) |
| Parameter bertanggal | Untuk setiap kunci dipilih dokumen yang berlaku pada tanggal kalender Jakarta (`berlakuMulai <= tanggal <= berlakuSampai`), yang mulai paling akhir bila tumpang tindih. Bila tidak ada yang berlaku, dipakai dokumen terakhir yang mulai sebelum tanggal itu (atau yang paling awal bila semuanya baru berlaku nanti) dan hasil membawa `peringatan` ("Angka ... untuk 15 Maret 2027 belum diperbarui. Hitungan ini memakai angka yang berlaku ..."); halaman mencatatnya dengan `console.warn` di server. Kunci tanpa dokumen sah: kalkulator menampilkan "Kalkulator ini sedang diperbarui: angka ... belum tersedia. Coba lagi nanti." dan halaman mencatat `console.error`. Dokumen yang bentuknya tidak cocok diabaikan. | Spesifikasi §5 ("pemilihan parameter sesuai tanggal berlaku"), §15 ("memakai parameter terakhir yang valid, dicatat") |
| Skema `parameter-tools` | Aditif: `nilai` tidak lagi wajib (Postgres `DROP NOT NULL`), array baru `tabel` (`label`, `batas`, `nilai`) untuk tarif berlapis, tabel TER, kategori, dan konversi nilai. Validasi field memakai `periksaParameter` (kunci harus dikenal kalkulatornya; angka wajib `nilai`; tabel wajib baris dengan kolom yang diminta, batas naik, batas kosong hanya di baris terakhir), setelah validasi bawaan Payload. Simpan dan hapus membuang tag baru `parameter-tools`. Push skema di probe berjalan tanpa pertanyaan DATA LOSS. | Spesifikasi §6 ("nilai atau tabel ... divalidasi modul `hitung`", diperbarui Task 11); Global Constraints (skema aditif) |
| Persen dan pembulatan | Persen disimpan seperti di peraturan (`1.5` = 1,5%). `persenDari` membulatkan ke 4 desimal supaya 0,24% x 8.000.000 tepat 19.200. PPh dibulatkan ke bawah ke rupiah, PKP ke bawah ke ribuan, premi, iuran, dan cicilan dibulatkan biasa ke rupiah, IMT ke 1 desimal, IPK ke 2 desimal, setoran dana darurat per bulan dibulatkan ke atas. | Contoh DJP (Leaflet TER) dan PMK 168/2023; probe: semua contoh resmi cocok sampai rupiah |
| Gaji Bersih | PPh 21 pegawai tetap: Januari sampai November `TER x bruto`, bruto = gaji + tunjangan tetap + premi JKK, JKM, dan BPJS Kesehatan yang dibayar kantor; Desember dihitung ulang setahun (bruto setahun, biaya jabatan 5% maks Rp6.000.000, iuran JHT, JP, dan iuran pensiun lain dikurangkan, PTKP, PKP dibulatkan ribuan, tarif Pasal 17) dikurangi PPh Januari sampai November. Gaji bersih = gaji + tunjangan dikurangi PPh dan iuran karyawan (BPJS Kesehatan 1% dengan batas upah Rp12.000.000, JHT 2%, JP 1% dengan batas upah JP). Hasil utama gaji bersih bulan biasa; ringkasan memuat PPh bulanan, PPh Desember, dan PPh setahun. PPh 21 DTP (insentif pemerintah) tidak dimodelkan. | PP 58/2023, PMK 168/2023, UU HPP Pasal 17, Perpres 64/2020, halaman iuran resmi BPJS Ketenagakerjaan; contoh Leaflet TER DJP |
| THR | Masa kerja kurang dari 1 bulan: belum berhak. 1 sampai 11 bulan: masa kerja / 12 x upah sebulan. 12 bulan atau lebih: 1 x upah. PPh tambahan di bulan THR = TER atas (bruto bulan biasa + THR) dikurangi TER bulan biasa; THR tidak menambah premi BPJS. | Permenaker 6/2016 Pasal 2 dan 3; SE Menaker M/3/HK.04.00/III/2026; contoh DJP THR (TK/0, Rp6.500.000: 1% lalu 5%) |
| Cicilan & KPR | Pokok = harga dikurangi uang muka (persen). Anuitas: `P x r / (1 - (1 + r)^-n)`, r bunga tahunan / 12; flat: (pokok + pokok x bunga x tahun) / bulan. Rincian: bunga dan pokok bulan pertama, total bunga, total bayar. Bunga mengambang tidak dimodelkan; keterangan hasil menyebut bunga tetap. | Rumus anuitas standar; contoh Kompas (Rp120.000.000, 11%, 120 bulan: Rp1.653.000) |
| Dana Darurat | Target = pengeluaran bulanan x kelipatan dari tabel parameter (lajang tanpa tanggungan 6, menikah tanpa anak 9, menikah dengan anak atau punya tanggungan 12); kekurangan = target dikurangi tabungan; setoran per bulan = kekurangan / jangka (dibulatkan ke atas). | OJK Sikapi Uangmu (lajang 6 kali; berkeluarga atau punya tanggungan 9 sampai 12 kali) |
| BMI & Kalori | IMT = berat / tinggi² dibulatkan 1 desimal, kategori dari tabel parameter (batas atas termasuk: sangat kurus sampai 16,9, kurus sampai 18,4, normal sampai 25,0, gemuk sampai 27,0, obesitas di atasnya). Kebutuhan kalori = BMR Mifflin-St Jeor (koefisien di kode) x faktor aktivitas dari tabel parameter (ringan 1,53, sedang 1,76, berat 2,25). Usia 18 sampai 100 tahun; di bawah 18 ditolak dengan penjelasan (IMT anak memakai grafik umur). | Klasifikasi IMT dewasa Indonesia (BPS SIRUSA, metadata indikator Kemenkes), WHO GHO sebagai pembanding; Mifflin dkk. 1990; FAO/WHO/UNU Human Energy Requirements bab 5 |
| IPK | IPK = jumlah (SKS x bobot) / jumlah SKS, bobot dari tabel konversi parameter (A 4, A- 3,7, B+ 3,3, B 3, B- 2,7, C+ 2,3, C 2, D 1, E 0), dibulatkan 2 desimal. Bisa digabung dengan IPK dan SKS sebelumnya (keduanya harus diisi bersama). Baris yang kedua kolomnya kosong dilewati; maksimal 30 baris. | Permendikbud 3/2020 Pasal 26; Permendiktisaintek 39/2025 (nilai antara diperbolehkan); contoh kampus (UGM Grading System) |
| Rendering `/tools/{slug}` | ISR seperti artikel: `generateStaticParams` mengembalikan `[]` (halaman dibangun saat kunjungan pertama lalu di-cache), data lewat `muatTool(slug)` bertag `TAG_ARTIKEL` + `parameter-tools`. Hasil contoh dihitung server untuk tanggal render, jadi HTML awal sudah berisi angka (tanpa JavaScript tetap berguna, dan tanpa lompatan tata letak). Tidak ada halaman dinamis: hitungan pembaca terjadi di browser, dan perubahan aturan di CMS membuang cache lewat tag. | Spesifikasi §5 (halaman publik statis dengan tag, JavaScript klien hanya untuk kalkulator), §12 |
| Komponen klien | Hanya `Kalkulator` (`'use client'`): isian tidak terkontrol dibaca lewat `FormData` saat kirim dan saat isian ditinggalkan, hasil dan galat di state. Form, hasil, angka aturan, dan penjelasan adalah server component. Label dan bantuan isian dari CMS (`bantuanInput`) dikirim sebagai `teks` ke `hitung`, jadi pesan galat memakai label yang sama dengan form. | Anggaran JS §12; spesifikasi §6 (`tools`: label dan bantuan input) |
| Isian dan validasi | Label terlihat; satuan rupiah dibacakan ("dalam rupiah"); `inputmode="numeric"` untuk rupiah dan angka bulat, `decimal` untuk desimal; `aria-describedby` ke bantuan dan galat; galat di bawah field dalam `<p aria-live="polite">` dan `aria-invalid`. Validasi saat tombol ditekan (fokus ke isian pertama yang salah, membuka bagian lanjutan bila perlu, menggulir ke tengah layar) dan saat isian ditinggalkan (isian kosong yang belum pernah salah tidak ditandai). Isian rupiah dirapikan menjadi "8.000.000" saat ditinggalkan. Pilihan sampai 4 opsi memakai radio, status PTKP memakai kisi radio dengan kode terlihat ("TK/0") dan label lengkap untuk pembaca layar, selebihnya `<select>`. Target sentuh 44 px. | Spesifikasi §14, §15; WCAG 2.2 (3.3.1, 3.3.3, 4.1.3, 2.5.8); probe: `<select>` status terpotong di 375 px |
| Pengumuman hasil | Satu wilayah `role="status"` (kosong saat halaman dimuat) mengumumkan hasil utama atau jumlah isian yang salah. Hasil baru di HP digulir sampai terlihat (tanpa animasi gulir bila reduced motion). | WCAG 2.2 SC 4.1.3 Status Messages |
| Angka hasil | Satu baris, ukuran huruf `min(5.5rem, 100cqi / (panjang x 0,44))` dengan container query, jadi Rp 10.000.000.000 tetap muat di 375 px tanpa terpotong. Hasil baru muncul dengan animasi CSS `muncul` (naik 0,3em + opacity, 250 ms) di dalam `prefers-reduced-motion: no-preference`; hasil contoh dari server tidak dianimasikan. Kotak hasil `position: sticky` di samping form di desktop, dan hasil baru tidak menggeser form. | Spesifikasi §4 (hasil besar), §13; probe: tes E2E angka panjang dan posisi form sebelum dan sesudah hitung |
| Seed | `npm run seed` membuat enam tools **draf** (penjelasan rumus dengan contoh hitung, FAQ, sumber aturan dengan tanggal akses 5 November 2026, SEO, label dan bantuan isian awal) dan 22 dokumen parameter dengan sumber dan catatan. Dokumen yang sudah ada (tools per `toolId`, parameter per `toolId` + `kunci` + `berlakuMulai`) tidak ditimpa. Pemilik menerbitkan tools setelah memeriksa isinya. | Spesifikasi §3 (aturan diverifikasi ke sumber resmi), §18 (pemilik mengisi konten) |
| Header aktif | Pill rubrik dan tombol Tools memakai `aria-current` (`page` untuk path yang sama, `true` untuk path di bawahnya) lewat komponen klien kecil `TautanAktif` (`usePathname`). Penandanya ada di HTML hasil prerender, jadi tetap terlihat tanpa JavaScript. | Ditunda dari Rencana 4B; WCAG 2.2 SC 1.4.1 (penanda tidak hanya warna: latar dan teks tebal di pill, garis bawah di tombol Tools) |
| Anggaran JS | Diukur di probe (byte terkompresi yang diunduh, build produksi): artikel 138,6 KiB (sama dengan beranda, rubrik, dan `/tools`), `/tools/gaji-bersih` dan `/tools/ipk` 151,9 KiB; chunk kalkulator + modul `hitung` 13.530 byte gzip. `motion.spec.ts` menjaga total di bawah 160 KiB untuk kedua halaman kalkulator dan selisih kalkulator terhadap artikel di bawah 25 KB. Klik "Hitung" di CPU 4x lebih lambat: Event Timing paling lama 96 ms pada klik pertama dan 16 sampai 32 ms pada klik berikutnya (4 putaran) (INP di bawah 200 ms). | Spesifikasi §12 |

## Angka aturan di seed (diverifikasi 5 November 2026)

| Kalkulator | Kunci | Nilai | Berlaku | Sumber | Kepastian |
|---|---|---|---|---|---|
| Gaji Bersih, THR | `ptkp-dasar`, `ptkp-kawin`, `ptkp-tanggungan` | Rp54.000.000; Rp4.500.000; Rp4.500.000 per tanggungan (maks 3) | sejak 1 Januari 2016 | DJP, halaman PTKP (PMK 101/2016) | Pasti |
| Gaji Bersih, THR | `ter-a`, `ter-b`, `ter-c` | 44, 40, dan 41 lapis tarif efektif bulanan (0% sampai 34%) | sejak 1 Januari 2024 | Lampiran PP 58/2023 (pajak.go.id) | Pasti; diuji dengan contoh DJP dan batas setiap lapis yang dipakai contoh |
| Gaji Bersih | `tarif-pasal-17` | 5% sampai Rp60 juta, 15% sampai Rp250 juta, 25% sampai Rp500 juta, 30% sampai Rp5 miliar, 35% di atasnya | sejak tahun pajak 2022 | DJP (UU HPP) | Pasti |
| Gaji Bersih | `biaya-jabatan`, `biaya-jabatan-maks` | 5%, maks Rp6.000.000 setahun | sejak 1 Januari 2024 | PMK 168/2023 Pasal 10 | Pasti |
| Gaji Bersih | `bpjs-kesehatan-kantor`, `bpjs-kesehatan-karyawan`, `bpjs-kesehatan-batas` | 4%, 1%, batas upah Rp12.000.000 | sejak 6 Mei 2020 | Perpres 64/2020 Pasal 30 dan 32 (JDIH Kemenkeu) | Pasti per Oktober 2026 (rencana perubahan iuran belum ditetapkan) |
| Gaji Bersih | `jht-karyawan`, `jp-karyawan`, `jkk`, `jkm` | 2%, 1%, 0,24% (risiko sangat rendah), 0,3% | sejak 1 Juli 2015 | BPJS Ketenagakerjaan (artikel resmi iuran) | Pasti; JKK tergantung tingkat risiko perusahaan (lihat Risiko) |
| Gaji Bersih | `jp-batas` | Rp10.547.400 (1 Maret 2025 sampai 28 Februari 2026), Rp11.086.300 (1 Maret 2026 sampai 28 Februari 2027) | lihat kolom nilai | Surat BPJS Ketenagakerjaan B/1226/022026 (salinan di portal pihak ketiga) | **Perlu dicek pemilik**: angka 2026 dari salinan surat, bukan dari situs BPJS (lihat Risiko) |
| Dana Darurat | `kelipatan` | lajang tanpa tanggungan 6; menikah tanpa anak 9; menikah dengan anak atau punya tanggungan 12 | 1 Januari 2026 | OJK Sikapi Uangmu | Aturan praktis, bukan peraturan; pembagian 9 dan 12 adalah tafsiran rencana ini (lihat Risiko) |
| BMI & Kalori | `kategori-imt` | sampai 16,9 sangat kurus; sampai 18,4 kurus; sampai 25,0 normal; sampai 27,0 gemuk; di atasnya obesitas | 1 Januari 2026 | BPS SIRUSA (metadata indikator IMT, klasifikasi Kemenkes) | Batas 25,0 dan 25,1 perlu dicek pemilik (lihat Risiko) |
| BMI & Kalori | `faktor-aktivitas` | ringan 1,53; sedang 1,76; berat 2,25 | 1 Januari 2026 | FAO/WHO/UNU 2001, bab 5 | Pasti (nilai contoh resmi per kelompok) |
| IPK | `konversi-nilai` | A 4; A- 3,7; B+ 3,3; B 3; B- 2,7; C+ 2,3; C 2; D 1; E 0 | 1 Januari 2026 | Permendikbud 3/2020 Pasal 26 | A, B, C, D, E pasti; nilai antara mengikuti pola umum kampus dan berbeda per kampus |

## Struktur file setelah rencana ini

```
src/modules/hitung/
  index.ts         hitung, siapkanKalkulator, periksaParameter, sumberParameter, registri RUMUS (internal)
  tipe.ts          Masukan, Isian (angka, pilihan, centang, baris), Hasil, ParameterTersimpan, TeksIsian, Kalkulator, ParameterTampil
  format.ts        teksAngka, teksRibuan, teksTanggal, kunciTanggal (tanggal Jakarta), tengahKalimat
  masukan.ts       bacaMasukan (teks form ke angka + pesan galat), contohMasukan
  parameter.ts     buatAturan (pilih per tanggal, cadangan, peringatan), periksaDokumen, ParameterKosong
  rumus.ts         tipe Rumus (seam internal), persenDari
  pajak.ts         status PTKP, kategori TER, tarifTer, pajakPasal17, premiDanIuran, isian bersama Gaji Bersih dan THR
  gaji-bersih.ts, thr.ts, cicilan-kpr.ts, dana-darurat.ts, bmi-kalori.ts, ipk.ts
src/seed/parameter-tools.ts   PARAMETER_AWAL (22 dokumen dengan sumber dan catatan)
src/seed/tools.ts             TOOLS_AWAL (6 tools draf), seedTools
src/collections/ParameterTools.ts   tabel bertanggal, validasi dari modul hitung, revalidasi tag parameter-tools
src/modules/konten/  tools.ts (parameterTersimpan, susunTool, susunKalkulator), data.ts (ambilTool), cache.ts (muatTool), tipe.ts (DataTool)
src/app/(frontend)/tools/[slug]/page.tsx   halaman kalkulator (ISR)
src/components/tools/
  HalamanTool.tsx      kepala, kalkulator, penjelasan, angka aturan, sumber, FAQ, JSON-LD
  Kalkulator.tsx       komponen klien: baca form, hitung di browser, galat, fokus, pengumuman
  FormKalkulator.tsx   isian angka, pilihan (radio, kisi, select), centang, baris IPK, bagian lanjutan
  HasilKalkulator.tsx  angka utama, ringkasan, rincian langkah, catatan, peringatan
  AturanTool.tsx       angka aturan yang dipakai, tanggal berlaku, sumber
  Kalkulator.module.css, Tool.module.css
src/components/tata-letak/TautanAktif.tsx   pill header dengan aria-current
src/components/dasar/Ikon.tsx (+ chevron-down, plus, x), src/lib/tag.ts (+ parameterTools)
src/modules/konten/tampilan.ts (+ tandaAktif)
tests/unit, tests/int, tests/e2e (baru dan diperluas)
```

## Jumlah tes yang diharapkan

| Setelah task | Unit (file) | Integrasi (file) | E2E |
|---|---|---|---|
| Baseline (`34aa23a`) | 287 (44) | 73 (25) | 74 |
| 1 Modul hitung dan Gaji Bersih | 307 (46) | 73 (25) | 74 |
| 2 Parameter tabel di CMS | 307 (46) | 76 (26) | 74 |
| 3 THR | 313 (47) | 76 (26) | 74 |
| 4 Cicilan & KPR, Dana Darurat | 321 (48) | 76 (26) | 74 |
| 5 BMI & Kalori, IPK | 330 (49) | 76 (26) | 74 |
| 6 Seed enam tools | 330 (49) | 77 (26) | 74 |
| 7 Data halaman kalkulator | 335 (50) | 78 (27) | 74 |
| 8 Halaman /tools/{slug} | 341 (51) | 78 (27) | 80 |
| 9 Kalkulator di browser | 342 (51) | 78 (27) | 87 |
| 10 Header aktif | 344 (51) | 78 (27) | 88 |
| 11 CLAUDE.md dan pemeriksaan akhir | 344 (51) | 78 (27) | 88 |

---

### Task 1: Modul `hitung` dengan parameter bertanggal dan kalkulator Gaji Bersih

**Files:**
- Create: `src/modules/hitung/tipe.ts`, `src/modules/hitung/format.ts`, `src/modules/hitung/masukan.ts`, `src/modules/hitung/parameter.ts`, `src/modules/hitung/rumus.ts`, `src/modules/hitung/pajak.ts`, `src/modules/hitung/gaji-bersih.ts`, `src/modules/hitung/index.ts`, `src/seed/parameter-tools.ts`
- Test: `tests/unit/hitung-bantu.ts`, `tests/unit/hitung-inti.test.ts`, `tests/unit/hitung-gaji.test.ts`

**Interfaces:**
- Consumes: `ToolId`, `TOOL_IDS` (`src/lib/konstanta.ts`, Rencana 1).
- Produces:
  - `@/modules/hitung`: `hitung(toolId, masukan, tanggal, parameter): Hasil`, `siapkanKalkulator(toolId, parameter, tanggal): Kalkulator`, `periksaParameter(doc): GalatParameter`, `sumberParameter(toolId): ToolId[]`, `teksAngka(nilai, satuan)`, `teksRibuan(nilai)`, dan semua tipe di `tipe.ts` (`Masukan`, `BarisTabel`, `ParameterTersimpan`, `Satuan`, `Isian*`, `Angka`, `HasilBerhasil`, `HasilGagal`, `Hasil`, `DefinisiParameter`, `ParameterTampil`, `Kalkulator`). Task 7 menambah argumen opsional `teks`.
  - Seam internal (hanya dipakai file di dalam modul dan tesnya): `Rumus`, `HasilRumus`, `persenDari` (`rumus.ts`); `buatAturan`, `Aturan`, `ParameterKosong`, `periksaDokumen` (`parameter.ts`); `bacaMasukan`, `contohMasukan`, `NilaiMasukan` (`masukan.ts`); `kunciTanggal`, `teksTanggal`, `tengahKalimat` (`format.ts`); `PARAMETER_PAJAK`, `STATUS_PTKP`, `kategoriTer`, `tarifTer`, `ptkpSetahun`, `pajakPasal17`, `premiDanIuran`, `isianStatus`, `isianBpjsKesehatan`, `isianBpjsKetenagakerjaan` (`pajak.ts`, dipakai THR di Task 3).
  - `src/seed/parameter-tools.ts`: `ParameterAwal`, `PARAMETER_GAJI` (18 dokumen), `PARAMETER_AWAL`. Task 4 dan 5 menambah parameter kalkulator lain.
  - Tes: `berhasil(hasil)`, `ringkasan(hasil, label)`, `langkah(hasil, label)`, `rp(teks)` di `tests/unit/hitung-bantu.ts`.

Modul `hitung` adalah satu-satunya tempat rumus dan pemilihan angka aturan. Antarmukanya kecil (lihat Keputusan teknis): pemanggil mengirim `toolId`, teks form apa adanya, tanggal hitung, dan dokumen `parameter-tools`; modul membaca dan memvalidasi teks (pesan galat siap tampil per isian), memilih parameter yang berlaku pada tanggal itu, menghitung, dan mengembalikan hasil dengan teks tampilan Indonesia dan rincian langkah. Bila parameter untuk tanggal itu belum ada, modul memakai parameter terakhir yang valid dan menaruh kalimat peringatan di hasil (spesifikasi §15).

Setiap kalkulator adalah satu `Rumus` di registri internal: teks tombol, daftar isian (dibangun dari parameter, misalnya pilihan status PTKP), definisi parameter yang dibacanya (untuk validasi CMS dan tampilan "angka aturan"), kalkulator yang dokumen parameternya dibaca (`sumber`; THR memakai parameter Gaji Bersih), dan fungsi hitung. Registri di task ini baru berisi Gaji Bersih; kalkulator lain menjawab "Kalkulator ini belum tersedia." sampai task-nya.

Gaji Bersih mengikuti PP 58/2023 dan PMK 168/2023: Januari sampai November PPh 21 = TER bulanan x bruto (gaji + tunjangan tetap + premi JKK, JKM, dan BPJS Kesehatan bagian kantor), Desember dihitung ulang setahun dengan tarif Pasal 17. Angka aturan (PTKP, tiga tabel TER, lapisan Pasal 17, biaya jabatan, iuran dan batas upah BPJS) disimpan di `src/seed/parameter-tools.ts` dengan sumber dan catatan; tes memakai data yang sama dengan yang di-seed ke CMS di Task 6.

Tes Gaji Bersih memakai contoh resmi DJP: Leaflet PPh 21 TER (Tuan R, K/0, gaji Rp15.000.000, iuran pensiun Rp150.000: TER 6% = Rp900.000 sebulan, PPh setahun Rp11.055.000, Desember Rp1.155.000) dan penjelasan DJP (gaji Rp10.000.000, K/0, iuran Rp100.000: TER 2% = Rp200.000, setahun Rp2.715.000, Desember Rp515.000). Contoh dengan BPJS (Rp8.000.000, TK/0) dihitung tangan dari aturan yang sama: bruto Rp8.363.200 (premi JKK Rp19.200, JKM Rp24.000, BPJS Kesehatan kantor Rp320.000), TER A 1,5% = Rp125.448, iuran karyawan Rp320.000 (1% + 2% + 1%), gaji bersih Rp7.554.552.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/hitung-bantu.ts`

  ```ts
  import { expect } from 'vitest'

  import type { Hasil, HasilBerhasil } from '@/modules/hitung'

  /** Hasil yang diharapkan berhasil (gagal tes dengan galatnya bila tidak). */
  export function berhasil(hasil: Hasil): HasilBerhasil {
    if (!hasil.ok) expect.fail(`hitung gagal: ${JSON.stringify(hasil)}`)
    return hasil
  }

  /** Nilai angka ringkasan yang labelnya diawali `label`. */
  export function ringkasan(hasil: HasilBerhasil, label: string): number | undefined {
    return hasil.ringkasan.find((a) => a.label.startsWith(label))?.nilai
  }

  /** Teks langkah rincian dengan label persis `label` (bagian pertama yang memuatnya). */
  export function langkah(hasil: HasilBerhasil, label: string): string | undefined {
    return hasil.rincian.flatMap((b) => b.langkah).find((l) => l.label === label)?.teks
  }

  /** Teks rupiah Intl memakai spasi tak putus setelah "Rp". */
  export const rp = (teks: string) => teks.replace('Rp ', 'Rp\u00a0')
  ```

  `tests/unit/hitung-inti.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { periksaParameter } from '@/modules/hitung'
  import { kunciTanggal, teksAngka, teksTanggal } from '@/modules/hitung/format'
  import { bacaMasukan } from '@/modules/hitung/masukan'
  import { buatAturan, ParameterKosong } from '@/modules/hitung/parameter'
  import type { DefinisiParameter, IsianAngka, IsianBaris, ParameterTersimpan } from '@/modules/hitung'

  import { rp } from './hitung-bantu'

  describe('format Indonesia', () => {
    it('rupiah, persen, satuan, dan desimal dengan koma', () => {
      expect(teksAngka(7_554_552, 'rupiah')).toBe(rp('Rp 7.554.552'))
      expect(teksAngka(-375_000, 'rupiah')).toBe('-' + rp('Rp 375.000'))
      expect(teksAngka(0.24, 'persen')).toBe('0,24%')
      expect(teksAngka(65.5, 'kg')).toBe('65,5 kg')
      expect(teksAngka(22.04, 'imt')).toBe('22,0')
      expect(teksAngka(3.5615, 'ipk')).toBe('3,56')
      expect(teksAngka(2058.2, 'kkal')).toBe('2.058 kkal')
      expect(teksAngka(9, 'kali')).toBe('9 kali')
    })

    it('tanggal kalender WIB dari waktu UTC yang disimpan Payload', () => {
      expect(kunciTanggal('2026-03-01T00:00:00.000Z')).toBe('2026-03-01')
      expect(kunciTanggal('2026-02-28T17:00:00.000Z')).toBe('2026-03-01')
      expect(kunciTanggal(new Date('2026-11-04T18:30:00.000Z'))).toBe('2026-11-05')
      expect(kunciTanggal('2026-11-05')).toBe('2026-11-05')
      expect(teksTanggal('2027-02-28')).toBe('28 Februari 2027')
    })
  })

  const berat: IsianAngka = { jenis: 'angka', kunci: 'berat', label: 'Berat badan', bantuan: null, satuan: 'kg', desimal: true, wajib: true, min: 20, maks: 300, contoh: '60' }
  const usia: IsianAngka = { ...berat, kunci: 'usia', label: 'Usia', satuan: 'tahun', desimal: false, min: 18, maks: 100, contoh: '25' }
  const matkul: IsianBaris = {
    jenis: 'baris',
    kunci: 'matkul',
    label: 'Mata kuliah',
    bantuan: null,
    labelBaris: 'Mata kuliah',
    maks: 30,
    contoh: [['3', 'A']],
    kolom: [
      { ...usia, kunci: 'sks', label: 'SKS', satuan: 'sks', min: 1, maks: 24, contoh: '3' },
      { jenis: 'pilihan', kunci: 'nilai', label: 'Nilai huruf', bantuan: null, opsi: [{ nilai: 'A', label: 'A' }, { nilai: 'B', label: 'B' }], contoh: 'A' },
    ],
  }

  describe('bacaMasukan', () => {
    it('desimal dengan koma atau titik, satuan di belakang angka diabaikan, angka bulat', () => {
      expect(bacaMasukan([berat, usia], { berat: '65,5 kg', usia: '30' })).toEqual({ nilai: { berat: 65.5, usia: 30 }, galat: {} })
      expect(bacaMasukan([berat], { berat: '65.5' }).nilai.berat).toBe(65.5)
      expect(bacaMasukan([usia], { usia: '30,5' }).galat).toEqual({ usia: 'Tulis usia dengan angka bulat, misalnya 25.' })
      expect(bacaMasukan([usia], { usia: '15' }).galat).toEqual({ usia: 'Usia paling sedikit 18 tahun.' })
      expect(bacaMasukan([berat], { berat: 'enam puluh' }).galat).toEqual({
        berat: 'Tulis berat badan dengan angka, misalnya 60. Pakai koma untuk desimal.',
      })
    })

    it('isian baris: baris kosong dilewati, galat per sel, minimal satu baris', () => {
      expect(bacaMasukan([matkul], { sks: ['3', '', '2'], nilai: ['A', '', 'B'] })).toEqual({ nilai: { sks: [3, 2], nilai: ['A', 'B'] }, galat: {} })
      expect(bacaMasukan([matkul], { sks: ['3', ''], nilai: ['A', 'B'] }).galat).toEqual({
        'sks.1': 'SKS mata kuliah 2 belum diisi. Tulis angkanya, misalnya 3.',
      })
      expect(bacaMasukan([matkul], { sks: ['3'], nilai: ['C'] }).galat).toEqual({ 'nilai.0': 'Pilih nilai huruf mata kuliah 1 dari daftar.' })
      expect(bacaMasukan([matkul], { sks: [''], nilai: [''] }).galat).toEqual({ 'sks.0': 'Isi minimal satu mata kuliah: SKS dan nilai huruf.' })
    })
  })

  const DEFINISI: DefinisiParameter[] = [
    { kunci: 'batas', label: 'Batas upah', jenis: 'angka', satuan: 'rupiah' },
    { kunci: 'tarif', label: 'Tarif', jenis: 'tabel', kolom: { batas: { judul: 'Sampai', satuan: 'rupiah' }, nilai: { judul: 'Tarif', satuan: 'persen' } } },
  ]
  const doc = (nilai: number, berlakuMulai: string, berlakuSampai?: string): ParameterTersimpan => ({
    toolId: 'gaji-bersih',
    kunci: 'batas',
    nilai,
    berlakuMulai,
    berlakuSampai,
  })

  describe('pemilihan parameter sesuai tanggal', () => {
    const daftar = [doc(1, '2025-03-01', '2026-02-28'), doc(2, '2026-03-01'), doc(3, '2026-06-01', '2026-06-30')]

    it('memilih yang berlaku; bila tumpang tindih, yang mulai berlaku paling baru', () => {
      expect(buatAturan(DEFINISI, daftar, '2025-12-31').angka('batas')).toBe(1)
      expect(buatAturan(DEFINISI, daftar, '2026-03-01').angka('batas')).toBe(2)
      expect(buatAturan(DEFINISI, daftar, '2026-06-15').angka('batas')).toBe(3)
      expect(buatAturan(DEFINISI, daftar, '2026-07-01').angka('batas')).toBe(2)
    })

    it('sebelum semua parameter berlaku: yang paling awal, dengan peringatan', () => {
      const aturan = buatAturan(DEFINISI, daftar, '2024-01-01')
      expect(aturan.angka('batas')).toBe(1)
      expect(aturan.peringatan).toEqual([
        'Angka batas upah untuk 1 Januari 2024 belum diperbarui. Hitungan ini memakai angka yang berlaku 1 Maret 2025 sampai 28 Februari 2026.',
      ])
    })

    it('dokumen yang bentuknya tidak cocok diabaikan; tanpa dokumen sah melempar ParameterKosong', () => {
      const rusak = { ...doc(9, '2026-01-01'), nilai: null }
      expect(() => buatAturan(DEFINISI, [rusak], '2026-11-05').angka('batas')).toThrow(ParameterKosong)
      expect(buatAturan(DEFINISI, [rusak, doc(4, '2020-01-01')], '2026-11-05').angka('batas')).toBe(4)
    })
  })

  describe('periksaParameter (validasi CMS)', () => {
    const ter = (tabel: ParameterTersimpan['tabel']) => periksaParameter({ toolId: 'gaji-bersih', kunci: 'ter-a', tabel })

    it('kunci harus dikenal kalkulatornya', () => {
      expect(periksaParameter({ toolId: 'gaji-bersih', kunci: 'ptkp', nilai: 1 }).kunci).toMatch(/^Kunci "ptkp" tidak dipakai kalkulator ini\. Pilih salah satu: ptkp-dasar, ptkp-kawin/)
    })

    it('angka tunggal butuh nilai dan tabel kosong', () => {
      expect(periksaParameter({ toolId: 'gaji-bersih', kunci: 'jkk', nilai: 0.24 })).toEqual({})
      expect(periksaParameter({ toolId: 'gaji-bersih', kunci: 'jkk', nilai: null, tabel: [{ nilai: 1 }] })).toEqual({
        nilai: 'Isi nilai premi JKK dari kantor.',
        tabel: 'Parameter ini berupa satu angka. Kosongkan tabel dan isi Nilai.',
      })
    })

    it('tabel: kolom wajib, batas naik, batas boleh kosong hanya di baris terakhir', () => {
      expect(ter([{ batas: 100, nilai: 0 }, { batas: null, nilai: 1 }])).toEqual({})
      expect(ter([])).toEqual({ tabel: 'Isi baris tabel tarif efektif bulanan kategori A.' })
      expect(ter([{ batas: 100 }, { batas: null, nilai: 1 }])).toEqual({ tabel: 'Baris 1: isi kolom Tarif.' })
      expect(ter([{ batas: null, nilai: 0 }, { batas: null, nilai: 1 }])).toEqual({ tabel: 'Baris 1: isi kolom Bruto sebulan sampai.' })
      expect(ter([{ batas: 100, nilai: 0 }, { batas: 100, nilai: 1 }])).toEqual({
        tabel: 'Baris 2: Bruto sebulan sampai harus lebih besar dari baris sebelumnya.',
      })
    })
  })
  ```

  `tests/unit/hitung-gaji.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { hitung, siapkanKalkulator } from '@/modules/hitung'
  import { PARAMETER_AWAL } from '@/seed/parameter-tools'

  import { berhasil, langkah, ringkasan, rp } from './hitung-bantu'

  const HARI_INI = '2026-11-05'
  const tanpaBpjs = { bpjsKesehatan: '', bpjsKetenagakerjaan: '' }
  const gaji = (masukan: Record<string, string>, tanggal = HARI_INI) => hitung('gaji-bersih', masukan, tanggal, PARAMETER_AWAL)

  describe('Gaji Bersih: contoh resmi DJP', () => {
    it('leaflet PPh 21 TER (Tuan R, K/0, gaji Rp15.000.000, iuran pensiun Rp150.000): 900.000 per bulan, Desember 1.155.000', () => {
      const h = berhasil(gaji({ gaji: '15.000.000', status: 'K/0', ...tanpaBpjs, iuranLain: '150.000' }))
      expect(langkah(h, 'Kategori TER')).toBe('A (status K/0)')
      expect(langkah(h, 'Tarif efektif bulanan')).toBe('6%')
      expect(ringkasan(h, 'PPh 21 per bulan')).toBe(900_000)
      expect(langkah(h, 'Biaya jabatan 5%')).toBe(rp('Rp 6.000.000'))
      expect(langkah(h, 'Penghasilan neto setahun')).toBe(rp('Rp 172.200.000'))
      expect(langkah(h, 'PTKP K/0')).toBe(rp('Rp 58.500.000'))
      expect(langkah(h, 'Penghasilan kena pajak')).toBe(rp('Rp 113.700.000'))
      expect(ringkasan(h, 'PPh 21 setahun')).toBe(11_055_000)
      expect(langkah(h, 'Sudah dipotong Januari sampai November')).toBe(rp('Rp 9.900.000'))
      expect(langkah(h, 'PPh 21 Desember')).toBe(rp('Rp 1.155.000'))
    })

    it('penjelasan DJP (gaji Rp10.000.000, K/0, iuran pensiun Rp100.000): TER 2% = 200.000, setahun 2.715.000, Desember 515.000', () => {
      const h = berhasil(gaji({ gaji: '10.000.000', status: 'K/0', ...tanpaBpjs, iuranLain: '100.000' }))
      expect(langkah(h, 'Tarif efektif bulanan')).toBe('2%')
      expect(ringkasan(h, 'PPh 21 per bulan')).toBe(200_000)
      expect(langkah(h, 'Penghasilan kena pajak')).toBe(rp('Rp 54.300.000'))
      expect(ringkasan(h, 'PPh 21 setahun')).toBe(2_715_000)
      expect(langkah(h, 'PPh 21 Desember')).toBe(rp('Rp 515.000'))
      expect(h.utama.nilai).toBe(10_000_000 - 200_000 - 100_000)
    })
  })

  describe('Gaji Bersih: premi dan iuran BPJS', () => {
    it('Rp8.000.000 TK/0: premi kantor masuk bruto, iuran karyawan 4%, gaji bersih dan Desember', () => {
      const h = berhasil(gaji({ gaji: '8.000.000', status: 'TK/0', bpjsKesehatan: 'ya', bpjsKetenagakerjaan: 'ya' }))
      // Bruto = 8.000.000 + JKK 0,24% (19.200) + JKM 0,3% (24.000) + BPJS Kesehatan 4% (320.000).
      expect(langkah(h, 'Penghasilan bruto')).toBe(rp('Rp 8.363.200'))
      expect(langkah(h, 'Tarif efektif bulanan')).toBe('1,5%')
      expect(ringkasan(h, 'PPh 21 per bulan')).toBe(125_448)
      expect(ringkasan(h, 'Iuran yang dipotong')).toBe(80_000 + 160_000 + 80_000)
      expect(h.utama).toMatchObject({ label: 'Gaji bersih per bulan', nilai: 7_554_552, teks: rp('Rp 7.554.552') })
      // Setahun: bruto 100.358.400, biaya jabatan 5.017.920, JHT+JP 2.880.000, PTKP 54.000.000, PKP 38.460.000.
      expect(langkah(h, 'Penghasilan kena pajak')).toBe(rp('Rp 38.460.000'))
      expect(ringkasan(h, 'PPh 21 setahun')).toBe(1_923_000)
      expect(langkah(h, 'PPh 21 Desember')).toBe(rp('Rp 543.072'))
      expect(ringkasan(h, 'Gaji bersih Desember')).toBe(7_136_928)
      expect(h.peringatan).toEqual([])
    })

    it('batas upah BPJS Kesehatan Rp12 juta dan batas upah JP sesuai tanggal berlaku', () => {
      const masukan = { gaji: '20.000.000', status: 'K/1', bpjsKesehatan: 'ya', bpjsKetenagakerjaan: 'ya' }
      const sekarang = berhasil(gaji(masukan))
      expect(langkah(sekarang, 'BPJS Kesehatan 1%')).toBe(rp('Rp 120.000'))
      expect(langkah(sekarang, 'Jaminan Pensiun 1%')).toBe(rp('Rp 110.863'))
      expect(langkah(sekarang, 'Kategori TER')).toBe('B (status K/1)')
      const februari = berhasil(gaji(masukan, '2026-02-15'))
      expect(langkah(februari, 'Jaminan Pensiun 1%')).toBe(rp('Rp 105.474'))
    })

    it('tanpa parameter yang berlaku memakai parameter terakhir yang valid dengan peringatan', () => {
      const h = berhasil(gaji({ gaji: '20.000.000', status: 'TK/0', bpjsKesehatan: 'ya', bpjsKetenagakerjaan: 'ya' }, '2027-03-15'))
      expect(langkah(h, 'Jaminan Pensiun 1%')).toBe(rp('Rp 110.863'))
      expect(h.peringatan).toEqual([
        'Angka batas upah iuran JP untuk 15 Maret 2027 belum diperbarui. Hitungan ini memakai angka yang berlaku 1 Maret 2026 sampai 28 Februari 2027.',
      ])
    })

    it('PPh 21 Desember minus menjadi kelebihan potong yang dikembalikan', () => {
      const h = berhasil(gaji({ gaji: '6.000.000', status: 'TK/0', ...tanpaBpjs, iuranLain: '1.000.000' }))
      expect(langkah(h, 'PPh 21 Desember')).toBe('-' + rp('Rp 375.000'))
      expect(h.rincian.flatMap((b) => b.langkah).find((l) => l.label === 'PPh 21 Desember')?.catatan).toMatch(/kelebihan potong/)
    })
  })

  describe('Gaji Bersih: tabel TER dan isian', () => {
    it('tabel TER sesuai lampiran PP 58/2023: 44, 40, dan 41 baris; batas atas termasuk', () => {
      const jumlah = ['ter-a', 'ter-b', 'ter-c'].map((k) => PARAMETER_AWAL.find((p) => p.kunci === k)?.tabel?.length)
      expect(jumlah).toEqual([44, 40, 41])
      const tarif = (bruto: string) => langkah(berhasil(gaji({ gaji: bruto, status: 'TK/0', ...tanpaBpjs })), 'Tarif efektif bulanan')
      expect(tarif('5.400.000')).toBe('0%')
      expect(tarif('5.400.001')).toBe('0,25%')
      expect(tarif('1.400.000.001')).toBe('34%')
    })

    it('pesan galat di bawah field: kosong, bukan angka, terlalu besar, status di luar daftar', () => {
      expect(gaji({ gaji: '', status: 'TK/0' })).toEqual({
        ok: false,
        pesan: null,
        galat: { gaji: 'Gaji pokok dan tunjangan tetap per bulan belum diisi. Tulis angkanya, misalnya 8.000.000.' },
      })
      const galat = (masukan: Record<string, string>) => {
        const h = gaji(masukan)
        return h.ok ? null : h.galat
      }
      expect(galat({ gaji: 'delapan juta', status: 'TK/0' })?.gaji).toBe(
        'Tulis gaji pokok dan tunjangan tetap per bulan dengan angka saja, misalnya 8.000.000.',
      )
      expect(galat({ gaji: '20.000.000.000', status: 'TK/0' })?.gaji).toBe(
        `Gaji pokok dan tunjangan tetap per bulan paling banyak ${rp('Rp 10.000.000.000')}.`,
      )
      expect(galat({ gaji: '8.000.000', status: 'K/4' })).toEqual({ status: 'Pilih status PTKP dari daftar.' })
      expect(ringkasan(berhasil(gaji({ gaji: 'Rp 8.000.000', status: 'TK/0' })), 'PPh 21 per bulan')).toBe(
        ringkasan(berhasil(gaji({ gaji: '8000000', status: 'TK/0' })), 'PPh 21 per bulan'),
      )
    })

    it('tanpa parameter di CMS: pesan, bukan hasil', () => {
      expect(hitung('gaji-bersih', { gaji: '8.000.000', status: 'TK/0' }, HARI_INI, [])).toEqual({
        ok: false,
        galat: {},
        pesan: 'Kalkulator ini sedang diperbarui: angka batas upah iuran BPJS Kesehatan belum tersedia. Coba lagi nanti.',
      })
    })

    it('siapkanKalkulator: isian, contoh, tombol, dan angka aturan yang berlaku', () => {
      const k = siapkanKalkulator('gaji-bersih', PARAMETER_AWAL, HARI_INI)
      expect(k.isian.map((i) => [i.kunci, i.lanjutan ?? false])).toEqual([
        ['gaji', false],
        ['status', false],
        ['tunjanganLain', true],
        ['bpjsKesehatan', true],
        ['bpjsKetenagakerjaan', true],
        ['iuranLain', true],
      ])
      expect(k.contoh).toEqual({ gaji: '8.000.000', status: 'TK/0', tunjanganLain: '0', bpjsKesehatan: 'ya', bpjsKetenagakerjaan: 'ya', iuranLain: '0' })
      expect(k.tombol).toBe('Hitung gaji bersih')
      expect(k.pesan).toBeNull()
      const terA = k.dasar.find((d) => d.kunci === 'ter-a')
      expect(terA).toMatchObject({ label: 'Tarif efektif bulanan kategori A', berlaku: 'mulai 1 Januari 2024', kolom: ['Bruto sebulan sampai', 'Tarif'] })
      expect(terA?.jenis === 'tabel' && terA.baris.at(-1)).toEqual(['tanpa batas', '34%'])
      expect(k.dasar.find((d) => d.kunci === 'jp-batas')).toMatchObject({
        jenis: 'angka',
        teks: rp('Rp 11.086.300'),
        berlaku: '1 Maret 2026 sampai 28 Februari 2027',
      })
      expect(k.dasar).toHaveLength(17)
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/hitung-gaji.test.ts` dan `tests/unit/hitung-inti.test.ts`, keduanya dengan `Error: Cannot find package '@/modules/hitung'`.

- [ ] **Langkah 3: Tipe, format, dan pembacaan masukan**

  `src/modules/hitung/tipe.ts`

  ```ts
  import type { ToolId } from '@/lib/konstanta'

  /**
   * Tipe modul hitung. Masukan berupa teks apa adanya dari form (pembaca bisa mengetik "Rp 8.000.000"
   * atau "65,5"); hasil sudah membawa teks tampilan berformat Indonesia supaya komponen tidak memformat
   * angka sendiri.
   */

  /** Nilai form per kunci isian: teks, atau daftar teks untuk kolom isian baris (IPK). */
  export type Masukan = Record<string, string | string[] | undefined>

  /** Satu baris tabel parameter: tabel TER, lapisan Pasal 17, kategori IMT, faktor aktivitas, konversi nilai. */
  export type BarisTabel = { label?: string | null; batas?: number | null; nilai?: number | null }

  /** Dokumen koleksi `parameter-tools` dalam bentuk yang dibaca modul ini (hasil `find` Payload cocok langsung). */
  export type ParameterTersimpan = {
    toolId: ToolId
    kunci: string
    nilai?: number | null
    tabel?: BarisTabel[] | null
    berlakuMulai: string
    berlakuSampai?: string | null
    sumber?: { judul?: string | null; url?: string | null } | null
  }

  export type Satuan = 'rupiah' | 'persen' | 'kali' | 'bulan' | 'tahun' | 'kg' | 'cm' | 'kkal' | 'imt' | 'ipk' | 'sks' | 'angka'

  export type Opsi = { nilai: string; label: string }

  type IsianDasar = {
    kunci: string
    label: string
    bantuan: string | null
    /** Isian tambahan yang disimpan di bagian "Atur rincian" supaya form utama tetap pendek. */
    lanjutan?: boolean
  }

  export type IsianAngka = IsianDasar & {
    jenis: 'angka'
    satuan: Satuan
    desimal: boolean
    wajib: boolean
    min: number
    maks: number
    contoh: string
  }

  export type IsianPilihan = IsianDasar & { jenis: 'pilihan'; opsi: Opsi[]; contoh: string }

  export type IsianCentang = IsianDasar & { jenis: 'centang'; contoh: boolean }

  /** Daftar baris dengan dua kolom (SKS dan nilai huruf). Masukan setiap kolom berupa daftar teks. */
  export type IsianBaris = IsianDasar & {
    jenis: 'baris'
    kolom: [IsianAngka, IsianPilihan]
    contoh: [string, string][]
    maks: number
    labelBaris: string
  }

  export type Isian = IsianAngka | IsianPilihan | IsianCentang | IsianBaris

  /** Angka hasil beserta teks tampilannya (misalnya "Rp 7.554.552", "1,5%", "22,0"). */
  export type Angka = { label: string; nilai: number; satuan: Satuan; teks: string }

  export type Langkah = { label: string; teks: string; catatan?: string }

  export type BagianRincian = { judul: string; langkah: Langkah[] }

  export type HasilBerhasil = {
    ok: true
    utama: Angka & { keterangan: string | null }
    ringkasan: Angka[]
    rincian: BagianRincian[]
    /** Batasan hitungan yang perlu dibaca bersama hasil (misalnya "bukan pengganti tenaga kesehatan"). */
    catatan: string | null
    /** Parameter yang tidak ada untuk tanggal hitung sehingga dipakai parameter terakhir yang valid (spesifikasi §15). */
    peringatan: string[]
  }

  /** `galat`: pesan per kunci isian (kolom baris memakai `kunci.indeks`). `pesan`: masalah di luar isian. */
  export type HasilGagal = { ok: false; galat: Record<string, string>; pesan: string | null }

  export type Hasil = HasilBerhasil | HasilGagal

  export type KolomTabel = { judul: string; satuan?: Satuan }

  /** Definisi parameter yang dibaca satu kalkulator. Dipakai validasi CMS, seed, dan tampilan "angka aturan". */
  export type DefinisiParameter =
    | { kunci: string; label: string; jenis: 'angka'; satuan: Satuan }
    | {
        kunci: string
        label: string
        jenis: 'tabel'
        /** Kolom yang wajib diisi di setiap baris. Kolom `batas` boleh kosong di baris terakhir (tanpa batas). */
        kolom: { label?: KolomTabel; batas?: KolomTabel; nilai?: KolomTabel }
      }

  /** Parameter yang berlaku pada tanggal hitung, siap ditampilkan di halaman tools. */
  export type ParameterTampil = {
    kunci: string
    label: string
    berlaku: string
    sumber: { judul: string; url: string } | null
  } & ({ jenis: 'angka'; teks: string } | { jenis: 'tabel'; kolom: string[]; baris: string[][] })

  /** Semua yang dibutuhkan halaman sebelum pembaca mengisi apa pun. */
  export type Kalkulator = {
    isian: Isian[]
    contoh: Masukan
    tombol: string
    dasar: ParameterTampil[]
    peringatan: string[]
    /** Terisi bila parameter wajib belum ada sama sekali di CMS: kalkulator tidak bisa dipakai. */
    pesan: string | null
  }
  ```

  `src/modules/hitung/format.ts`

  ```ts
  import type { Satuan } from './tipe'

  /** Format angka dan tanggal Indonesia untuk hasil kalkulator (spesifikasi §3: angka ditulis cara Indonesia). */

  const RUPIAH = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const BULAT = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })
  const SAMPAI_SATU = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 })
  const SAMPAI_DUA = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 })
  const SATU = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const DUA = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  /** Teks tampilan satu angka, misalnya "Rp 8.000.000", "1,5%", "65,5 kg", "3,56". */
  export function teksAngka(nilai: number, satuan: Satuan): string {
    switch (satuan) {
      case 'rupiah':
        return RUPIAH.format(nilai)
      case 'persen':
        return `${SAMPAI_DUA.format(nilai)}%`
      case 'kali':
        return `${SAMPAI_DUA.format(nilai)} kali`
      case 'bulan':
        return `${BULAT.format(nilai)} bulan`
      case 'tahun':
        return `${BULAT.format(nilai)} tahun`
      case 'kg':
        return `${SAMPAI_SATU.format(nilai)} kg`
      case 'cm':
        return `${SAMPAI_SATU.format(nilai)} cm`
      case 'kkal':
        return `${BULAT.format(nilai)} kkal`
      case 'imt':
        return SATU.format(nilai)
      case 'ipk':
        return DUA.format(nilai)
      case 'sks':
        return `${BULAT.format(nilai)} SKS`
      case 'angka':
        return SAMPAI_DUA.format(nilai)
    }
  }

  /** Huruf pertama label dikecilkan di tengah kalimat, kecuali singkatan ("SKS", "IPK sebelumnya", "PTKP"). */
  export function tengahKalimat(label: string): string {
    return /^[A-Z][a-z]/.test(label) ? label[0].toLowerCase() + label.slice(1) : label
  }

  /** Angka tanpa satuan dengan pemisah ribuan, untuk isian rupiah yang dirapikan saat blur ("8.000.000"). */
  export function teksRibuan(nilai: number): string {
    return BULAT.format(nilai)
  }

  const FORMAT_KUNCI = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })
  const FORMAT_TANGGAL = new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })

  /**
   * Tanggal kalender WIB (`YYYY-MM-DD`). Field tanggal Payload menyimpan waktu UTC (misalnya
   * `2026-03-01T00:00:00.000Z`, atau pukul 17.00 hari sebelumnya bila dipilih dari zona WIB), jadi
   * perbandingan berlaku mulai/sampai selalu memakai tanggal kalender di Jakarta.
   */
  export function kunciTanggal(nilai: Date | string): string {
    if (typeof nilai === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(nilai)) return nilai
    return FORMAT_KUNCI.format(new Date(nilai))
  }

  /** "1 Maret 2026" dari kunci tanggal. */
  export function teksTanggal(kunci: string): string {
    return FORMAT_TANGGAL.format(new Date(`${kunci}T00:00:00Z`))
  }
  ```

  `src/modules/hitung/masukan.ts`

  ```ts
  import { teksAngka, tengahKalimat } from './format'
  import type { Isian, IsianAngka, IsianPilihan, Masukan } from './tipe'

  /**
   * Membaca teks form menjadi angka dengan pesan galat yang bisa langsung ditampilkan di bawah field
   * (spesifikasi §15: penyebab + cara memperbaiki). Pembaca boleh mengetik "Rp 8.000.000", "8000000",
   * "65,5", atau "7.5"; satuan di belakang angka ("kg", "%") diabaikan.
   */

  export type NilaiMasukan = Record<string, number | string | boolean | null | number[] | string[]>

  type Bacaan = { nilai: number | null; galat?: undefined } | { galat: string; nilai?: undefined }

  function bacaAngka(teks: string | undefined, isian: IsianAngka, label = isian.label): Bacaan {
    const bersih = (teks ?? '')
      .replace(/[\s\u00a0]/g, '')
      .replace(/^rp\.?/i, '')
      .replace(/(%|kg|cm|tahun|bulan|sks|kali)$/i, '')
    if (bersih === '') {
      return isian.wajib ? { galat: `${label} belum diisi. Tulis angkanya, misalnya ${isian.contoh}.` } : { nilai: null }
    }
    let angka: number
    if (isian.satuan === 'rupiah') {
      if (!/^(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/.test(bersih)) {
        return { galat: `Tulis ${tengahKalimat(label)} dengan angka saja, misalnya ${isian.contoh}.` }
      }
      angka = Math.round(Number(bersih.replace(/\./g, '').replace(',', '.')))
    } else if (isian.desimal) {
      if (!/^\d+([.,]\d+)?$/.test(bersih)) {
        return { galat: `Tulis ${tengahKalimat(label)} dengan angka, misalnya ${isian.contoh}. Pakai koma untuk desimal.` }
      }
      angka = Number(bersih.replace(',', '.'))
    } else {
      if (!/^\d+$/.test(bersih)) return { galat: `Tulis ${tengahKalimat(label)} dengan angka bulat, misalnya ${isian.contoh}.` }
      angka = Number(bersih)
    }
    if (angka < isian.min) return { galat: `${label} paling sedikit ${teksAngka(isian.min, isian.satuan)}.` }
    if (angka > isian.maks) return { galat: `${label} paling banyak ${teksAngka(isian.maks, isian.satuan)}.` }
    return { nilai: angka }
  }

  function bacaPilihan(teks: string | undefined, isian: IsianPilihan, label = isian.label): { nilai: string } | { galat: string } {
    return isian.opsi.some((o) => o.nilai === teks) ? { nilai: teks as string } : { galat: `Pilih ${tengahKalimat(label)} dari daftar.` }
  }

  const daftar = (nilai: string | string[] | undefined): string[] => (Array.isArray(nilai) ? nilai : nilai === undefined ? [] : [nilai])

  /**
   * Semua isian sekaligus. `galat` berisi pesan per kunci isian, atau `kunci.indeks` untuk kolom isian
   * baris; baris yang kedua kolomnya kosong dilewati.
   */
  export function bacaMasukan(isian: Isian[], masukan: Masukan): { nilai: NilaiMasukan; galat: Record<string, string> } {
    const nilai: NilaiMasukan = {}
    const galat: Record<string, string> = {}
    for (const i of isian) {
      const teks = masukan[i.kunci]
      switch (i.jenis) {
        case 'angka': {
          const hasil = bacaAngka(typeof teks === 'string' ? teks : undefined, i)
          if (hasil.galat) galat[i.kunci] = hasil.galat
          else nilai[i.kunci] = hasil.nilai ?? null
          break
        }
        case 'pilihan': {
          const hasil = bacaPilihan(typeof teks === 'string' ? teks : undefined, i)
          if ('galat' in hasil) galat[i.kunci] = hasil.galat
          else nilai[i.kunci] = hasil.nilai
          break
        }
        case 'centang':
          nilai[i.kunci] = teks === 'ya'
          break
        case 'baris': {
          const [kolomAngka, kolomPilihan] = i.kolom
          const kiri = daftar(masukan[kolomAngka.kunci])
          const kanan = daftar(masukan[kolomPilihan.kunci])
          const angka: number[] = []
          const pilihan: string[] = []
          for (let b = 0; b < Math.min(Math.max(kiri.length, kanan.length), i.maks); b++) {
            if (!kiri[b]?.trim() && !kanan[b]) continue
            const nomor = `${i.labelBaris.toLowerCase()} ${b + 1}`
            const a = bacaAngka(kiri[b], { ...kolomAngka, wajib: true }, `${kolomAngka.label} ${nomor}`)
            const p = bacaPilihan(kanan[b], kolomPilihan, `${kolomPilihan.label.toLowerCase()} ${nomor}`)
            if (a.galat) galat[`${kolomAngka.kunci}.${b}`] = a.galat
            if ('galat' in p) galat[`${kolomPilihan.kunci}.${b}`] = p.galat
            if (!a.galat && !('galat' in p)) {
              angka.push(a.nilai as number)
              pilihan.push(p.nilai)
            }
          }
          if (angka.length === 0 && !Object.keys(galat).some((k) => k.startsWith(`${kolomAngka.kunci}.`) || k.startsWith(`${kolomPilihan.kunci}.`))) {
            galat[`${kolomAngka.kunci}.0`] = `Isi minimal satu ${i.labelBaris.toLowerCase()}: ${kolomAngka.label} dan ${kolomPilihan.label.toLowerCase()}.`
          }
          nilai[kolomAngka.kunci] = angka
          nilai[kolomPilihan.kunci] = pilihan
          break
        }
      }
    }
    return { nilai, galat }
  }

  /** Isi form awal dari contoh setiap isian. Dipakai halaman (hasil contoh tanpa JavaScript) dan seed. */
  export function contohMasukan(isian: Isian[]): Masukan {
    const masukan: Masukan = {}
    for (const i of isian) {
      if (i.jenis === 'centang') masukan[i.kunci] = i.contoh ? 'ya' : ''
      else if (i.jenis === 'baris') {
        masukan[i.kolom[0].kunci] = i.contoh.map((b) => b[0])
        masukan[i.kolom[1].kunci] = i.contoh.map((b) => b[1])
      } else masukan[i.kunci] = i.contoh
    }
    return masukan
  }
  ```

- [ ] **Langkah 4: Pemilihan parameter sesuai tanggal**

  `src/modules/hitung/parameter.ts`

  ```ts
  import { kunciTanggal, teksAngka, teksTanggal, tengahKalimat } from './format'
  import type { BarisTabel, DefinisiParameter, KolomTabel, ParameterTampil, ParameterTersimpan } from './tipe'

  /**
   * Pemilihan parameter sesuai tanggal berlaku (spesifikasi §5) dan "parameter terakhir yang valid"
   * bila tidak ada yang berlaku (spesifikasi §15). Dokumen yang bentuknya tidak cocok dengan definisinya
   * (misalnya baris tabel tanpa tarif) diabaikan, sama dengan validasi CMS.
   */

  /** Parameter wajib yang sama sekali belum ada: kalkulator tidak bisa dipakai. */
  export class ParameterKosong extends Error {
    constructor(readonly label: string) {
      super(`Parameter "${label}" belum ada.`)
    }
  }

  export type GalatParameter = Partial<Record<'kunci' | 'nilai' | 'tabel', string>>

  const KOLOM = ['label', 'batas', 'nilai'] as const

  /** Memeriksa satu dokumen parameter terhadap definisinya. Dipakai validasi field koleksi `parameter-tools`. */
  export function periksaDokumen(
    definisi: DefinisiParameter | undefined,
    doc: Pick<ParameterTersimpan, 'kunci' | 'nilai' | 'tabel'>,
    kunciDikenal: string[],
  ): GalatParameter {
    if (!definisi) {
      return {
        kunci: kunciDikenal.length
          ? `Kunci "${doc.kunci}" tidak dipakai kalkulator ini. Pilih salah satu: ${kunciDikenal.join(', ')}.`
          : 'Kalkulator ini tidak memakai parameter tersimpan.',
      }
    }
    const baris = doc.tabel ?? []
    if (definisi.jenis === 'angka') {
      const galat: GalatParameter = {}
      if (typeof doc.nilai !== 'number' || !Number.isFinite(doc.nilai)) galat.nilai = `Isi nilai ${tengahKalimat(definisi.label)}.`
      if (baris.length > 0) galat.tabel = 'Parameter ini berupa satu angka. Kosongkan tabel dan isi Nilai.'
      return galat
    }
    if (baris.length === 0) return { tabel: `Isi baris tabel ${tengahKalimat(definisi.label)}.` }
    for (const [i, b] of baris.entries()) {
      for (const kolom of KOLOM) {
        const def = definisi.kolom[kolom]
        if (!def) continue
        const isi = b[kolom]
        const kosong = isi === null || isi === undefined || isi === ''
        if (kolom === 'batas' && kosong && i === baris.length - 1) continue
        if (kosong) return { tabel: `Baris ${i + 1}: isi kolom ${def.judul}.` }
      }
      const sebelumnya = baris[i - 1]?.batas
      if (definisi.kolom.batas && i > 0 && typeof b.batas === 'number' && typeof sebelumnya === 'number' && b.batas <= sebelumnya) {
        return { tabel: `Baris ${i + 1}: ${definisi.kolom.batas.judul} harus lebih besar dari baris sebelumnya.` }
      }
    }
    return {}
  }

  const sah = (definisi: DefinisiParameter, doc: ParameterTersimpan) => Object.keys(periksaDokumen(definisi, doc, [])).length === 0

  function labelBerlaku(doc: ParameterTersimpan): string {
    const mulai = teksTanggal(kunciTanggal(doc.berlakuMulai))
    return doc.berlakuSampai ? `${mulai} sampai ${teksTanggal(kunciTanggal(doc.berlakuSampai))}` : `mulai ${mulai}`
  }

  export type Aturan = {
    angka(kunci: string): number
    tabel(kunci: string): BarisTabel[]
    /** Parameter yang tidak berlaku pada tanggal hitung, sebagai kalimat untuk pembaca. */
    readonly peringatan: string[]
    /** Semua parameter definisi yang berhasil dipilih, siap ditampilkan. */
    tampil(): ParameterTampil[]
  }

  /**
   * Akses parameter untuk satu tanggal. Untuk setiap kunci dipilih dokumen yang berlaku pada tanggal itu
   * (berlaku mulai terbaru bila tumpang tindih). Bila tidak ada, dipakai dokumen terakhir yang mulai
   * berlaku sebelum tanggal itu, atau yang paling awal bila semuanya baru berlaku nanti, dan satu
   * peringatan dicatat. Kunci tanpa dokumen sah melempar `ParameterKosong`.
   */
  export function buatAturan(definisi: DefinisiParameter[], parameter: ParameterTersimpan[], tanggal: Date | string): Aturan {
    const hari = kunciTanggal(tanggal)
    const peringatan: string[] = []
    const terpilih = new Map<string, ParameterTersimpan>()

    function pilih(kunci: string): { def: DefinisiParameter; doc: ParameterTersimpan } {
      const def = definisi.find((d) => d.kunci === kunci)
      if (!def) throw new Error(`Kunci parameter tidak didefinisikan: ${kunci}`)
      const ada = terpilih.get(kunci)
      if (ada) return { def, doc: ada }
      const calon = parameter
        .filter((p) => p.kunci === kunci && sah(def, p))
        .sort((a, b) => kunciTanggal(b.berlakuMulai).localeCompare(kunciTanggal(a.berlakuMulai)))
      const berlaku = calon.find((p) => kunciTanggal(p.berlakuMulai) <= hari && (!p.berlakuSampai || kunciTanggal(p.berlakuSampai) >= hari))
      const doc = berlaku ?? calon.find((p) => kunciTanggal(p.berlakuMulai) <= hari) ?? calon.at(-1)
      if (!doc) throw new ParameterKosong(def.label)
      if (!berlaku) {
        peringatan.push(
          `Angka ${tengahKalimat(def.label)} untuk ${teksTanggal(hari)} belum diperbarui. Hitungan ini memakai angka yang berlaku ${labelBerlaku(doc)}.`,
        )
      }
      terpilih.set(kunci, doc)
      return { def, doc }
    }

    return {
      angka: (kunci) => pilih(kunci).doc.nilai as number,
      tabel: (kunci) => pilih(kunci).doc.tabel ?? [],
      peringatan,
      tampil() {
        const hasil: ParameterTampil[] = []
        for (const d of definisi) {
          let doc: ParameterTersimpan
          try {
            doc = pilih(d.kunci).doc
          } catch (galat) {
            if (galat instanceof ParameterKosong) continue
            throw galat
          }
          const sumber = doc.sumber?.judul && doc.sumber.url ? { judul: doc.sumber.judul, url: doc.sumber.url } : null
          const dasar = { kunci: d.kunci, label: d.label, berlaku: labelBerlaku(doc), sumber }
          if (d.jenis === 'angka') {
            hasil.push({ ...dasar, jenis: 'angka', teks: teksAngka(doc.nilai as number, d.satuan) })
            continue
          }
          const kolom = KOLOM.filter((k) => d.kolom[k]).map((k) => [k, d.kolom[k] as KolomTabel] as const)
          hasil.push({
            ...dasar,
            jenis: 'tabel',
            kolom: kolom.map(([, k]) => k.judul),
            baris: (doc.tabel ?? []).map((b) =>
              kolom.map(([nama, k]) => {
                const isi = b[nama]
                if (nama === 'label') return String(isi ?? '')
                if (typeof isi !== 'number') return 'tanpa batas'
                return k.satuan ? teksAngka(isi, k.satuan) : String(isi)
              }),
            ),
          })
        }
        return hasil
      },
    }
  }
  ```

  `src/modules/hitung/rumus.ts`

  ```ts
  import type { ToolId } from '@/lib/konstanta'

  import type { NilaiMasukan } from './masukan'
  import type { Aturan } from './parameter'
  import type { DefinisiParameter, HasilBerhasil, Isian } from './tipe'

  export type HasilRumus = Omit<HasilBerhasil, 'ok' | 'peringatan'>

  /** Satu kalkulator di dalam modul: isian form, parameter yang dibacanya, dan rumusnya. */
  export type Rumus = {
    /** Teks tombol yang menyebut hasilnya, misalnya "Hitung gaji bersih". */
    tombol: string
    /** Kalkulator yang dokumen parameternya dibaca (THR memakai PTKP dan TER milik Gaji Bersih). */
    sumber: ToolId[]
    /** Parameter milik kalkulator ini di koleksi `parameter-tools`. */
    parameter: DefinisiParameter[]
    isian(aturan: Aturan): Isian[]
    /** Dipanggil setelah semua isian lolos dibaca; `galat` untuk aturan yang melibatkan beberapa isian. */
    hitung(nilai: NilaiMasukan, aturan: Aturan): HasilRumus | { galat: Record<string, string> }
  }

  /** Bagian dari persen dengan pembulatan 4 desimal, supaya 0,24% x 8.000.000 tepat 19.200 (bukan 19199,999...). */
  export function persenDari(nilai: number, persen: number): number {
    return Math.round(nilai * persen * 100) / 10_000
  }
  ```

- [ ] **Langkah 5: PPh 21, iuran BPJS, dan kalkulator Gaji Bersih**

  `src/modules/hitung/pajak.ts`

  ```ts
  import { teksAngka } from './format'
  import type { Aturan } from './parameter'
  import { persenDari } from './rumus'
  import type { DefinisiParameter, IsianCentang, IsianPilihan } from './tipe'

  /**
   * PPh 21 pegawai tetap dan iuran BPJS bagian karyawan, dipakai Gaji Bersih dan THR. Semua angka
   * aturan dibaca dari parameter (milik kalkulator Gaji Bersih); yang ada di kode hanya cara hitungnya:
   * PP 58/2023 (TER bulanan), PMK 168/2023 (bruto, biaya jabatan, Desember), UU PPh Pasal 17.
   */

  export const STATUS_PTKP = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'] as const
  export type StatusPtkp = (typeof STATUS_PTKP)[number]
  export type KategoriTer = 'A' | 'B' | 'C'

  /** Kategori TER per status PTKP (PP 58/2023 dan lampirannya). */
  const KATEGORI_TER: Record<StatusPtkp, KategoriTer> = {
    'TK/0': 'A',
    'TK/1': 'A',
    'K/0': 'A',
    'TK/2': 'B',
    'TK/3': 'B',
    'K/1': 'B',
    'K/2': 'B',
    'K/3': 'C',
  }

  const tabelTer = (judul: string): DefinisiParameter => ({
    kunci: `ter-${judul.toLowerCase()}`,
    label: `Tarif efektif bulanan kategori ${judul}`,
    jenis: 'tabel',
    kolom: { batas: { judul: 'Bruto sebulan sampai', satuan: 'rupiah' }, nilai: { judul: 'Tarif', satuan: 'persen' } },
  })

  export const PARAMETER_PAJAK: DefinisiParameter[] = [
    { kunci: 'ptkp-dasar', label: 'PTKP wajib pajak', jenis: 'angka', satuan: 'rupiah' },
    { kunci: 'ptkp-kawin', label: 'Tambahan PTKP kawin', jenis: 'angka', satuan: 'rupiah' },
    { kunci: 'ptkp-tanggungan', label: 'Tambahan PTKP per tanggungan', jenis: 'angka', satuan: 'rupiah' },
    tabelTer('A'),
    tabelTer('B'),
    tabelTer('C'),
    {
      kunci: 'tarif-pasal-17',
      label: 'Tarif Pasal 17',
      jenis: 'tabel',
      kolom: { batas: { judul: 'PKP setahun sampai', satuan: 'rupiah' }, nilai: { judul: 'Tarif', satuan: 'persen' } },
    },
    { kunci: 'biaya-jabatan', label: 'Biaya jabatan', jenis: 'angka', satuan: 'persen' },
    { kunci: 'biaya-jabatan-maks', label: 'Batas biaya jabatan setahun', jenis: 'angka', satuan: 'rupiah' },
    { kunci: 'bpjs-kesehatan-kantor', label: 'Iuran BPJS Kesehatan dari kantor', jenis: 'angka', satuan: 'persen' },
    { kunci: 'bpjs-kesehatan-karyawan', label: 'Iuran BPJS Kesehatan dari gaji', jenis: 'angka', satuan: 'persen' },
    { kunci: 'bpjs-kesehatan-batas', label: 'Batas upah iuran BPJS Kesehatan', jenis: 'angka', satuan: 'rupiah' },
    { kunci: 'jht-karyawan', label: 'Iuran JHT dari gaji', jenis: 'angka', satuan: 'persen' },
    { kunci: 'jp-karyawan', label: 'Iuran JP dari gaji', jenis: 'angka', satuan: 'persen' },
    { kunci: 'jp-batas', label: 'Batas upah iuran JP', jenis: 'angka', satuan: 'rupiah' },
    { kunci: 'jkk', label: 'Premi JKK dari kantor', jenis: 'angka', satuan: 'persen' },
    { kunci: 'jkm', label: 'Premi JKM dari kantor', jenis: 'angka', satuan: 'persen' },
  ]

  const LABEL_STATUS: Record<StatusPtkp, string> = {
    'TK/0': 'TK/0: tidak kawin, tanpa tanggungan',
    'TK/1': 'TK/1: tidak kawin, 1 tanggungan',
    'TK/2': 'TK/2: tidak kawin, 2 tanggungan',
    'TK/3': 'TK/3: tidak kawin, 3 tanggungan',
    'K/0': 'K/0: kawin, tanpa tanggungan',
    'K/1': 'K/1: kawin, 1 tanggungan',
    'K/2': 'K/2: kawin, 2 tanggungan',
    'K/3': 'K/3: kawin, 3 tanggungan',
  }

  export const isianStatus: IsianPilihan = {
    jenis: 'pilihan',
    kunci: 'status',
    label: 'Status PTKP',
    bantuan: 'Tanggungan adalah keluarga sedarah atau semenda yang kamu biayai, paling banyak 3 orang.',
    opsi: STATUS_PTKP.map((s) => ({ nilai: s, label: LABEL_STATUS[s] })),
    contoh: 'TK/0',
  }

  export const isianBpjsKesehatan: IsianCentang = {
    jenis: 'centang',
    kunci: 'bpjsKesehatan',
    label: 'Ikut BPJS Kesehatan lewat kantor',
    bantuan: null,
    lanjutan: true,
    contoh: true,
  }

  export const isianBpjsKetenagakerjaan: IsianCentang = {
    jenis: 'centang',
    kunci: 'bpjsKetenagakerjaan',
    label: 'Ikut BPJS Ketenagakerjaan lewat kantor',
    bantuan: 'Jaminan Hari Tua (JHT), Jaminan Pensiun (JP), Jaminan Kecelakaan Kerja (JKK), dan Jaminan Kematian (JKM).',
    lanjutan: true,
    contoh: true,
  }

  export const kategoriTer = (status: StatusPtkp): KategoriTer => KATEGORI_TER[status]

  /** Tarif efektif bulanan untuk bruto sebulan: baris pertama yang batasnya mencakup bruto. */
  export function tarifTer(status: StatusPtkp, bruto: number, aturan: Aturan): { kategori: KategoriTer; tarif: number; pajak: number } {
    const kategori = kategoriTer(status)
    const baris = aturan.tabel(`ter-${kategori.toLowerCase()}`).find((b) => typeof b.batas !== 'number' || bruto <= b.batas)
    const tarif = baris?.nilai ?? 0
    return { kategori, tarif, pajak: Math.floor(persenDari(bruto, tarif)) }
  }

  export function ptkpSetahun(status: StatusPtkp, aturan: Aturan): number {
    const [kawin, tanggungan] = status.split('/')
    return aturan.angka('ptkp-dasar') + (kawin === 'K' ? aturan.angka('ptkp-kawin') : 0) + Number(tanggungan) * aturan.angka('ptkp-tanggungan')
  }

  /** PPh 21 setahun dengan tarif berlapis Pasal 17 atas PKP, beserta uraian lapisannya. */
  export function pajakPasal17(pkp: number, aturan: Aturan): { pajak: number; uraian: string } {
    let bawah = 0
    let pajak = 0
    const uraian: string[] = []
    for (const b of aturan.tabel('tarif-pasal-17')) {
      const atas = typeof b.batas === 'number' ? b.batas : Infinity
      const lapisan = Math.min(pkp, atas) - bawah
      if (lapisan <= 0) break
      pajak += persenDari(lapisan, b.nilai ?? 0)
      uraian.push(`${teksAngka(b.nilai ?? 0, 'persen')} x ${teksAngka(lapisan, 'rupiah')}`)
      bawah = atas
    }
    return { pajak: Math.floor(pajak), uraian: uraian.join(' + ') || 'PKP nol' }
  }

  export type Ikut = { kesehatan: boolean; ketenagakerjaan: boolean }

  /**
   * Premi yang dibayar kantor (masuk bruto PPh 21, PMK 168/2023 Pasal 5) dan iuran yang dipotong dari
   * gaji. Dasar iuran adalah gaji pokok + tunjangan tetap, dengan batas upah BPJS Kesehatan dan JP.
   */
  export function premiDanIuran(upah: number, ikut: Ikut, aturan: Aturan) {
    const upahKesehatan = Math.min(upah, aturan.angka('bpjs-kesehatan-batas'))
    const upahJp = Math.min(upah, aturan.angka('jp-batas'))
    const kes = ikut.kesehatan
    const tk = ikut.ketenagakerjaan
    return {
      jkk: tk ? Math.round(persenDari(upah, aturan.angka('jkk'))) : 0,
      jkm: tk ? Math.round(persenDari(upah, aturan.angka('jkm'))) : 0,
      kesehatanKantor: kes ? Math.round(persenDari(upahKesehatan, aturan.angka('bpjs-kesehatan-kantor'))) : 0,
      kesehatan: kes ? Math.round(persenDari(upahKesehatan, aturan.angka('bpjs-kesehatan-karyawan'))) : 0,
      jht: tk ? Math.round(persenDari(upah, aturan.angka('jht-karyawan'))) : 0,
      jp: tk ? Math.round(persenDari(upahJp, aturan.angka('jp-karyawan'))) : 0,
    }
  }
  ```

  `src/modules/hitung/gaji-bersih.ts`

  ```ts
  import { teksAngka } from './format'
  import type { NilaiMasukan } from './masukan'
  import {
    isianBpjsKesehatan,
    isianBpjsKetenagakerjaan,
    isianStatus,
    PARAMETER_PAJAK,
    pajakPasal17,
    premiDanIuran,
    ptkpSetahun,
    tarifTer,
    type Ikut,
    type StatusPtkp,
  } from './pajak'
  import type { Aturan } from './parameter'
  import { persenDari, type Rumus } from './rumus'
  import type { Angka, IsianAngka, Satuan } from './tipe'

  /**
   * Gaji bersih pegawai tetap: gaji dikurangi PPh 21 (TER bulanan Januari sampai November, hitung ulang
   * setahun dengan tarif Pasal 17 di Desember) dan iuran BPJS bagian karyawan.
   */

  export const rp = (nilai: number) => teksAngka(nilai, 'rupiah')

  export const angka = (label: string, nilai: number, satuan: Satuan = 'rupiah'): Angka => ({ label, nilai, satuan, teks: teksAngka(nilai, satuan) })

  /** Batas atas isian rupiah: cukup untuk gaji sangat besar, tetap muat di layar 375 px. */
  export const MAKS_RUPIAH = 10_000_000_000

  export const isianRupiah = (isian: Omit<IsianAngka, 'jenis' | 'satuan' | 'desimal' | 'maks'> & { maks?: number }): IsianAngka => ({
    jenis: 'angka',
    satuan: 'rupiah',
    desimal: false,
    maks: MAKS_RUPIAH,
    ...isian,
  })

  /** Bruto sebulan (gaji, tunjangan tidak tetap, premi yang dibayar kantor) dan PPh 21 TER-nya. */
  export function brutoDanTer(upah: number, tambahan: number, status: StatusPtkp, ikut: Ikut, aturan: Aturan) {
    const premi = premiDanIuran(upah, ikut, aturan)
    const bruto = upah + tambahan + premi.jkk + premi.jkm + premi.kesehatanKantor
    return { premi, bruto, ter: tarifTer(status, bruto, aturan) }
  }

  const persen = (aturan: Aturan, kunci: string) => teksAngka(aturan.angka(kunci), 'persen')

  function hitungGajiBersih(nilai: NilaiMasukan, aturan: Aturan) {
    const gaji = nilai.gaji as number
    const tunjangan = (nilai.tunjanganLain as number | null) ?? 0
    const iuranLain = (nilai.iuranLain as number | null) ?? 0
    const status = nilai.status as StatusPtkp
    const ikut = { kesehatan: nilai.bpjsKesehatan === true, ketenagakerjaan: nilai.bpjsKetenagakerjaan === true }

    const { premi, bruto, ter } = brutoDanTer(gaji, tunjangan, status, ikut, aturan)
    const iuranBpjs = premi.kesehatan + premi.jht + premi.jp
    const potongan = iuranBpjs + iuranLain
    const bersih = gaji + tunjangan - ter.pajak - potongan

    const brutoSetahun = bruto * 12
    const biayaJabatan = Math.min(Math.floor(persenDari(brutoSetahun, aturan.angka('biaya-jabatan'))), aturan.angka('biaya-jabatan-maks'))
    const pengurang = (premi.jht + premi.jp + iuranLain) * 12
    const neto = brutoSetahun - biayaJabatan - pengurang
    const ptkp = ptkpSetahun(status, aturan)
    const pkp = Math.max(0, Math.floor((neto - ptkp) / 1000) * 1000)
    const setahun = pajakPasal17(pkp, aturan)
    const sudahDipotong = ter.pajak * 11
    const desember = setahun.pajak - sudahDipotong
    const bersihDesember = gaji + tunjangan - desember - potongan

    const bulanan = { gaji, tunjangan, iuranLain, status, ikut, premi, bruto, ter, iuranBpjs, bersih }
    return { ...bulanan, brutoSetahun, biayaJabatan, pengurang, neto, ptkp, pkp, setahun, sudahDipotong, desember, bersihDesember }
  }

  export const gajiBersih: Rumus = {
    tombol: 'Hitung gaji bersih',
    sumber: ['gaji-bersih'],
    parameter: PARAMETER_PAJAK,
    isian: () => [
      isianRupiah({
        kunci: 'gaji',
        label: 'Gaji pokok dan tunjangan tetap per bulan',
        bantuan: 'Angka sebelum dipotong apa pun, seperti di kontrak kerja atau slip gaji.',
        wajib: true,
        min: 1,
        contoh: '8.000.000',
      }),
      isianStatus,
      isianRupiah({
        kunci: 'tunjanganLain',
        label: 'Tunjangan tidak tetap per bulan',
        bantuan: 'Misalnya uang makan atau transport yang dibayar menurut hari masuk. Ikut kena PPh 21, tetapi bukan dasar iuran BPJS.',
        lanjutan: true,
        wajib: false,
        min: 0,
        contoh: '0',
      }),
      isianBpjsKesehatan,
      isianBpjsKetenagakerjaan,
      isianRupiah({
        kunci: 'iuranLain',
        label: 'Iuran pensiun lain atau zakat lewat kantor per bulan',
        bantuan: 'Misalnya iuran DPLK atau zakat yang dipotong dari gaji. Mengurangi PPh 21 setahun.',
        lanjutan: true,
        wajib: false,
        min: 0,
        contoh: '0',
      }),
    ],
    hitung(nilai, aturan) {
      const h = hitungGajiBersih(nilai, aturan)
      const { premi } = h
      const tarif = teksAngka(h.ter.tarif, 'persen')
      const kesehatan = h.ikut.kesehatan
      const tk = h.ikut.ketenagakerjaan
      return {
        utama: { ...angka('Gaji bersih per bulan', h.bersih), keterangan: 'Januari sampai November, setelah PPh 21 dan iuran.' },
        ringkasan: [
          angka(`PPh 21 per bulan (TER ${tarif})`, h.ter.pajak),
          angka('Iuran yang dipotong dari gajimu', h.iuranBpjs + h.iuranLain),
          angka('Gaji bersih Desember', h.bersihDesember),
          angka('PPh 21 setahun', h.setahun.pajak),
        ],
        rincian: [
          {
            judul: 'Penghasilan bruto sebulan',
            langkah: [
              { label: 'Gaji pokok dan tunjangan tetap', teks: rp(h.gaji) },
              ...(h.tunjangan > 0 ? [{ label: 'Tunjangan tidak tetap', teks: rp(h.tunjangan) }] : []),
              ...(tk
                ? [
                    { label: `Premi JKK ${persen(aturan, 'jkk')} dibayar kantor`, teks: rp(premi.jkk) },
                    { label: `Premi JKM ${persen(aturan, 'jkm')} dibayar kantor`, teks: rp(premi.jkm) },
                  ]
                : []),
              ...(kesehatan
                ? [
                    {
                      label: `BPJS Kesehatan ${persen(aturan, 'bpjs-kesehatan-kantor')} dibayar kantor`,
                      teks: rp(premi.kesehatanKantor),
                      catatan: `Dari upah paling tinggi ${rp(aturan.angka('bpjs-kesehatan-batas'))}.`,
                    },
                  ]
                : []),
              { label: 'Penghasilan bruto', teks: rp(h.bruto), catatan: 'Premi yang dibayar kantor ikut dihitung sebagai penghasilan.' },
            ],
          },
          {
            judul: 'PPh 21 Januari sampai November',
            langkah: [
              { label: 'Kategori TER', teks: `${h.ter.kategori} (status ${h.status})` },
              { label: 'Tarif efektif bulanan', teks: tarif },
              { label: 'PPh 21 per bulan', teks: rp(h.ter.pajak), catatan: `${tarif} x ${rp(h.bruto)}` },
            ],
          },
          {
            judul: 'Potongan dari gajimu',
            langkah: [
              ...(kesehatan ? [{ label: `BPJS Kesehatan ${persen(aturan, 'bpjs-kesehatan-karyawan')}`, teks: rp(premi.kesehatan) }] : []),
              ...(tk
                ? [
                    { label: `Jaminan Hari Tua ${persen(aturan, 'jht-karyawan')}`, teks: rp(premi.jht) },
                    {
                      label: `Jaminan Pensiun ${persen(aturan, 'jp-karyawan')}`,
                      teks: rp(premi.jp),
                      catatan: `Dari upah paling tinggi ${rp(aturan.angka('jp-batas'))}.`,
                    },
                  ]
                : []),
              ...(h.iuranLain > 0 ? [{ label: 'Iuran pensiun lain atau zakat', teks: rp(h.iuranLain) }] : []),
              { label: 'PPh 21 per bulan', teks: rp(h.ter.pajak) },
              { label: 'Gaji bersih per bulan', teks: rp(h.bersih), catatan: 'Gaji dan tunjangan dikurangi PPh 21 dan semua potongan.' },
            ],
          },
          {
            judul: 'PPh 21 Desember: dihitung ulang setahun',
            langkah: [
              { label: 'Penghasilan bruto setahun', teks: rp(h.brutoSetahun), catatan: `12 x ${rp(h.bruto)}` },
              {
                label: `Biaya jabatan ${persen(aturan, 'biaya-jabatan')}`,
                teks: rp(h.biayaJabatan),
                catatan: `Paling banyak ${rp(aturan.angka('biaya-jabatan-maks'))} setahun.`,
              },
              ...(h.pengurang > 0 ? [{ label: 'Iuran JHT, JP, dan pensiun lain setahun', teks: rp(h.pengurang) }] : []),
              { label: 'Penghasilan neto setahun', teks: rp(h.neto) },
              { label: `PTKP ${h.status}`, teks: rp(h.ptkp) },
              { label: 'Penghasilan kena pajak', teks: rp(h.pkp), catatan: 'Dibulatkan ke bawah ke ribuan penuh.' },
              { label: 'PPh 21 setahun (tarif Pasal 17)', teks: rp(h.setahun.pajak), catatan: h.setahun.uraian },
              { label: 'Sudah dipotong Januari sampai November', teks: rp(h.sudahDipotong), catatan: `11 x ${rp(h.ter.pajak)}` },
              {
                label: 'PPh 21 Desember',
                teks: rp(h.desember),
                ...(h.desember < 0 ? { catatan: 'Minus berarti kelebihan potong yang dikembalikan kantor di bulan Desember.' } : {}),
              },
              { label: 'Gaji bersih Desember', teks: rp(h.bersihDesember) },
            ],
          },
        ],
        catatan: 'Untuk pegawai tetap dengan gaji yang sama setiap bulan. Bonus, lembur, dan THR menaikkan PPh 21 di bulan diterimanya.',
      }
    },
  }
  ```

  `src/modules/hitung/index.ts`

  ```ts
  import type { ToolId } from '@/lib/konstanta'

  import { gajiBersih } from './gaji-bersih'
  import { tengahKalimat } from './format'
  import { bacaMasukan, contohMasukan } from './masukan'
  import { buatAturan, ParameterKosong, periksaDokumen, type GalatParameter } from './parameter'
  import type { Rumus } from './rumus'
  import type { DefinisiParameter, Hasil, Kalkulator, Masukan, ParameterTersimpan } from './tipe'

  /**
   * Modul hitung (spesifikasi §5): `hitung(toolId, masukan, tanggal, parameter)` adalah satu-satunya
   * titik masuk perhitungan. Fungsi murni tanpa akses database, jadi dipakai sama persis di server
   * (hasil contoh, log parameter) dan di browser (kalkulator). Parameter dari CMS dikirim pemanggil;
   * pemilihan parameter sesuai tanggal dan cadangan "parameter terakhir yang valid" ada di sini.
   *
   * - `siapkanKalkulator` untuk halaman: isian form, contoh masukan, teks tombol, parameter yang berlaku.
   * - `periksaParameter` untuk validasi koleksi `parameter-tools`.
   * - `sumberParameter` untuk pemuat data: kalkulator mana saja yang dokumen parameternya dibaca.
   */

  const RUMUS: Partial<Record<ToolId, Rumus>> = {
    'gaji-bersih': gajiBersih,
  }

  const BELUM_TERSEDIA = 'Kalkulator ini belum tersedia.'

  const definisiDari = (rumus: Rumus): DefinisiParameter[] => rumus.sumber.flatMap((id) => RUMUS[id]?.parameter ?? [])

  function aturanUntuk(rumus: Rumus, parameter: ParameterTersimpan[], tanggal: Date | string) {
    return buatAturan(definisiDari(rumus), parameter.filter((p) => rumus.sumber.includes(p.toolId)), tanggal)
  }

  const pesanKosong = (galat: ParameterKosong) =>
    `Kalkulator ini sedang diperbarui: angka ${tengahKalimat(galat.label)} belum tersedia. Coba lagi nanti.`

  export function hitung(toolId: ToolId, masukan: Masukan, tanggal: Date | string, parameter: ParameterTersimpan[]): Hasil {
    const rumus = RUMUS[toolId]
    if (!rumus) return { ok: false, galat: {}, pesan: BELUM_TERSEDIA }
    const aturan = aturanUntuk(rumus, parameter, tanggal)
    try {
      const { nilai, galat } = bacaMasukan(rumus.isian(aturan), masukan)
      if (Object.keys(galat).length > 0) return { ok: false, galat, pesan: null }
      const hasil = rumus.hitung(nilai, aturan)
      if ('galat' in hasil) return { ok: false, galat: hasil.galat, pesan: null }
      return { ok: true, ...hasil, peringatan: [...aturan.peringatan] }
    } catch (galat) {
      if (galat instanceof ParameterKosong) return { ok: false, galat: {}, pesan: pesanKosong(galat) }
      throw galat
    }
  }

  export function siapkanKalkulator(toolId: ToolId, parameter: ParameterTersimpan[], tanggal: Date | string): Kalkulator {
    const rumus = RUMUS[toolId]
    if (!rumus) return { isian: [], contoh: {}, tombol: '', dasar: [], peringatan: [], pesan: BELUM_TERSEDIA }
    const aturan = aturanUntuk(rumus, parameter, tanggal)
    try {
      const isian = rumus.isian(aturan)
      const dasar = aturan.tampil()
      return { isian, contoh: contohMasukan(isian), tombol: rumus.tombol, dasar, peringatan: [...aturan.peringatan], pesan: null }
    } catch (galat) {
      if (!(galat instanceof ParameterKosong)) throw galat
      return { isian: [], contoh: {}, tombol: rumus.tombol, dasar: aturan.tampil(), peringatan: [...aturan.peringatan], pesan: pesanKosong(galat) }
    }
  }

  /** Kalkulator yang dokumen parameternya dibaca `toolId` (untuk query `parameter-tools`). */
  export function sumberParameter(toolId: ToolId): ToolId[] {
    return RUMUS[toolId]?.sumber ?? [toolId]
  }

  /** Validasi satu dokumen `parameter-tools`: kunci dikenal kalkulatornya dan bentuk nilai atau tabelnya cocok. */
  export function periksaParameter(doc: Pick<ParameterTersimpan, 'toolId' | 'kunci' | 'nilai' | 'tabel'>): GalatParameter {
    const definisi = RUMUS[doc.toolId]?.parameter ?? []
    return periksaDokumen(
      definisi.find((d) => d.kunci === doc.kunci),
      doc,
      definisi.map((d) => d.kunci),
    )
  }

  export { teksAngka, teksRibuan } from './format'
  export type * from './tipe'
  ```

- [ ] **Langkah 6: Parameter awal Gaji Bersih dengan sumbernya**

  `src/seed/parameter-tools.ts`

  ```ts
  import type { ParameterTersimpan } from '@/modules/hitung'

  /**
   * Parameter awal kalkulator (spesifikasi §3: aturan pajak dan iuran diverifikasi ke sumber resmi dan
   * disimpan sebagai parameter bertanggal). Persen ditulis seperti di peraturan (1,5 berarti 1,5%).
   * Diverifikasi 5 November 2026; sumber dan catatan ikut tersimpan di CMS supaya pemilik tahu kapan
   * harus memperbarui. Tes unit modul hitung memakai data yang sama.
   */
  export type ParameterAwal = ParameterTersimpan & { sumber: { judul: string; url: string }; catatan?: string }

  const SUMBER = {
    ter: {
      judul: 'Lampiran PP 58 Tahun 2023 tentang Tarif Pemotongan PPh Pasal 21 (DJP)',
      url: 'https://www.pajak.go.id/sites/default/files/lampiran/Lampiran%20PP58TAHUN2023.pdf',
    },
    ptkp: { judul: 'Penghasilan Tidak Kena Pajak (DJP)', url: 'https://pajak.go.id/penghasilan-tidak-kena-pajak' },
    pasal17: {
      judul: 'Memotret Keberpihakan UU HPP pada Rakyat Kecil (DJP)',
      url: 'https://www.pajak.go.id/id/artikel/memotret-keberpihakan-uu-hpp-pada-rakyat-kecil',
    },
    pmk168: { judul: 'PMK 168 Tahun 2023 Pasal 10 (JDIH)', url: 'https://peraturan.go.id/files/permenkeu-no-168-tahun-2023.pdf' },
    bpjsKesehatan: {
      judul: 'Perpres 64 Tahun 2020 Pasal 30 dan 32 (JDIH Kemenkeu)',
      url: 'https://jdih.kemenkeu.go.id/download/179608f7-a2a0-41c0-aaec-e7d60eb36054/64TAHUN2020PERPRES.pdf',
    },
    bpjsTk: {
      judul: 'Berapa Besaran Iuran JHT, JKK, JKM, JP dan JKP? (BPJS Ketenagakerjaan)',
      url: 'https://www.bpjsketenagakerjaan.go.id/artikel/18913/artikel-berapa-besaran-iuran-jht,-jkk,-jkm,-jp-dan-jkp',
    },
    jp2026: {
      judul: 'Surat BPJS Ketenagakerjaan B/1226/022026: Batas Upah dan Manfaat Jaminan Pensiun 2026',
      url: 'https://494075.fs1.hubspotusercontent-na1.net/hubfs/494075/compliance-portal/notification-number-b1226022026.pdf',
    },
  }

  /** Baris tabel dari pasangan [batas atas, tarif]; batas `null` berarti tanpa batas. */
  const tabel = (baris: [number | null, number][]) => baris.map(([batas, nilai]) => ({ batas: batas === null ? null : Math.round(batas), nilai }))

  const JT = 1_000_000

  export const PARAMETER_GAJI: ParameterAwal[] = [
    { toolId: 'gaji-bersih', kunci: 'ptkp-dasar', nilai: 54 * JT, berlakuMulai: '2016-01-01', sumber: SUMBER.ptkp, catatan: 'PMK 101/PMK.010/2016, berlaku sejak tahun pajak 2016.' },
    { toolId: 'gaji-bersih', kunci: 'ptkp-kawin', nilai: 4_500_000, berlakuMulai: '2016-01-01', sumber: SUMBER.ptkp },
    { toolId: 'gaji-bersih', kunci: 'ptkp-tanggungan', nilai: 4_500_000, berlakuMulai: '2016-01-01', sumber: SUMBER.ptkp, catatan: 'Paling banyak 3 tanggungan.' },
    {
      toolId: 'gaji-bersih',
      kunci: 'ter-a',
      berlakuMulai: '2024-01-01',
      sumber: SUMBER.ter,
      catatan: 'Status TK/0, TK/1, dan K/0.',
      tabel: tabel([
        [5.4 * JT, 0], [5.65 * JT, 0.25], [5.95 * JT, 0.5], [6.3 * JT, 0.75], [6.75 * JT, 1], [7.5 * JT, 1.25], [8.55 * JT, 1.5],
        [9.65 * JT, 1.75], [10.05 * JT, 2], [10.35 * JT, 2.25], [10.7 * JT, 2.5], [11.05 * JT, 3], [11.6 * JT, 3.5], [12.5 * JT, 4],
        [13.75 * JT, 5], [15.1 * JT, 6], [16.95 * JT, 7], [19.75 * JT, 8], [24.15 * JT, 9], [26.45 * JT, 10], [28 * JT, 11],
        [30.05 * JT, 12], [32.4 * JT, 13], [35.4 * JT, 14], [39.1 * JT, 15], [43.85 * JT, 16], [47.8 * JT, 17], [51.4 * JT, 18],
        [56.3 * JT, 19], [62.2 * JT, 20], [68.6 * JT, 21], [77.5 * JT, 22], [89 * JT, 23], [103 * JT, 24], [125 * JT, 25],
        [157 * JT, 26], [206 * JT, 27], [337 * JT, 28], [454 * JT, 29], [550 * JT, 30], [695 * JT, 31], [910 * JT, 32],
        [1400 * JT, 33], [null, 34],
      ]),
    },
    {
      toolId: 'gaji-bersih',
      kunci: 'ter-b',
      berlakuMulai: '2024-01-01',
      sumber: SUMBER.ter,
      catatan: 'Status TK/2, TK/3, K/1, dan K/2.',
      tabel: tabel([
        [6.2 * JT, 0], [6.5 * JT, 0.25], [6.85 * JT, 0.5], [7.3 * JT, 0.75], [9.2 * JT, 1], [10.75 * JT, 1.5], [11.25 * JT, 2],
        [11.6 * JT, 2.5], [12.6 * JT, 3], [13.6 * JT, 4], [14.95 * JT, 5], [16.4 * JT, 6], [18.45 * JT, 7], [21.85 * JT, 8],
        [26 * JT, 9], [27.7 * JT, 10], [29.35 * JT, 11], [31.45 * JT, 12], [33.95 * JT, 13], [37.1 * JT, 14], [41.1 * JT, 15],
        [45.8 * JT, 16], [49.5 * JT, 17], [53.8 * JT, 18], [58.5 * JT, 19], [64 * JT, 20], [71 * JT, 21], [80 * JT, 22],
        [93 * JT, 23], [109 * JT, 24], [129 * JT, 25], [163 * JT, 26], [211 * JT, 27], [374 * JT, 28], [459 * JT, 29],
        [555 * JT, 30], [704 * JT, 31], [957 * JT, 32], [1405 * JT, 33], [null, 34],
      ]),
    },
    {
      toolId: 'gaji-bersih',
      kunci: 'ter-c',
      berlakuMulai: '2024-01-01',
      sumber: SUMBER.ter,
      catatan: 'Status K/3.',
      tabel: tabel([
        [6.6 * JT, 0], [6.95 * JT, 0.25], [7.35 * JT, 0.5], [7.8 * JT, 0.75], [8.85 * JT, 1], [9.8 * JT, 1.25], [10.95 * JT, 1.5],
        [11.2 * JT, 1.75], [12.05 * JT, 2], [12.95 * JT, 3], [14.15 * JT, 4], [15.55 * JT, 5], [17.05 * JT, 6], [19.5 * JT, 7],
        [22.7 * JT, 8], [26.6 * JT, 9], [28.1 * JT, 10], [30.1 * JT, 11], [32.6 * JT, 12], [35.4 * JT, 13], [38.9 * JT, 14],
        [43 * JT, 15], [47.4 * JT, 16], [51.2 * JT, 17], [55.8 * JT, 18], [60.4 * JT, 19], [66.7 * JT, 20], [74.5 * JT, 21],
        [83.2 * JT, 22], [95.6 * JT, 23], [110 * JT, 24], [134 * JT, 25], [169 * JT, 26], [221 * JT, 27], [390 * JT, 28],
        [463 * JT, 29], [561 * JT, 30], [709 * JT, 31], [965 * JT, 32], [1419 * JT, 33], [null, 34],
      ]),
    },
    {
      toolId: 'gaji-bersih',
      kunci: 'tarif-pasal-17',
      berlakuMulai: '2022-01-01',
      sumber: SUMBER.pasal17,
      catatan: 'UU 7/2021 (HPP), berlaku sejak tahun pajak 2022.',
      tabel: tabel([[60 * JT, 5], [250 * JT, 15], [500 * JT, 25], [5000 * JT, 30], [null, 35]]),
    },
    { toolId: 'gaji-bersih', kunci: 'biaya-jabatan', nilai: 5, berlakuMulai: '2024-01-01', sumber: SUMBER.pmk168 },
    { toolId: 'gaji-bersih', kunci: 'biaya-jabatan-maks', nilai: 6 * JT, berlakuMulai: '2024-01-01', sumber: SUMBER.pmk168, catatan: 'Rp500.000 sebulan.' },
    { toolId: 'gaji-bersih', kunci: 'bpjs-kesehatan-kantor', nilai: 4, berlakuMulai: '2020-05-06', sumber: SUMBER.bpjsKesehatan },
    { toolId: 'gaji-bersih', kunci: 'bpjs-kesehatan-karyawan', nilai: 1, berlakuMulai: '2020-05-06', sumber: SUMBER.bpjsKesehatan },
    {
      toolId: 'gaji-bersih',
      kunci: 'bpjs-kesehatan-batas',
      nilai: 12 * JT,
      berlakuMulai: '2020-05-06',
      sumber: SUMBER.bpjsKesehatan,
      catatan: 'Batas bawahnya upah minimum kabupaten atau kota. Per Oktober 2026 iuran belum berubah.',
    },
    { toolId: 'gaji-bersih', kunci: 'jht-karyawan', nilai: 2, berlakuMulai: '2015-07-01', sumber: SUMBER.bpjsTk, catatan: 'Kantor menambah 3,7%.' },
    { toolId: 'gaji-bersih', kunci: 'jp-karyawan', nilai: 1, berlakuMulai: '2015-07-01', sumber: SUMBER.bpjsTk, catatan: 'Kantor menambah 2%.' },
    {
      toolId: 'gaji-bersih',
      kunci: 'jp-batas',
      nilai: 10_547_400,
      berlakuMulai: '2025-03-01',
      berlakuSampai: '2026-02-28',
      sumber: SUMBER.jp2026,
      catatan: 'Batas tahun 2025, disebut di surat batas upah 2026.',
    },
    {
      toolId: 'gaji-bersih',
      kunci: 'jp-batas',
      nilai: 11_086_300,
      berlakuMulai: '2026-03-01',
      berlakuSampai: '2027-02-28',
      sumber: SUMBER.jp2026,
      catatan: 'Disesuaikan setiap Maret dengan pertumbuhan PDB (PP 45/2015 Pasal 29). Tambahkan batas 2027 setelah BPJS Ketenagakerjaan mengumumkannya.',
    },
    {
      toolId: 'gaji-bersih',
      kunci: 'jkk',
      nilai: 0.24,
      berlakuMulai: '2015-07-01',
      sumber: SUMBER.bpjsTk,
      catatan: 'Tingkat risiko sangat rendah (kerja kantor). Tingkat lain: 0,54%, 0,89%, 1,27%, 1,74%.',
    },
    { toolId: 'gaji-bersih', kunci: 'jkm', nilai: 0.3, berlakuMulai: '2015-07-01', sumber: SUMBER.bpjsTk },
  ]

  export const PARAMETER_AWAL: ParameterAwal[] = [...PARAMETER_GAJI]
  ```

- [ ] **Langkah 7: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 46 passed (46)`, `Tests 307 passed (307)`; integrasi `Test Files 25 passed (25)`, `Tests 73 passed (73)` (tidak berubah); E2E `74 passed` (tidak berubah).

- [ ] **Langkah 8: Commit**

  ```bash
  git add src/modules/hitung src/seed/parameter-tools.ts tests/unit/hitung-bantu.ts tests/unit/hitung-inti.test.ts tests/unit/hitung-gaji.test.ts
  git commit -m "feat(hitung): modul hitung dengan parameter bertanggal dan kalkulator gaji bersih"
  ```

### Task 2: Parameter tabel bertanggal di CMS, validasi dari modul `hitung`, dan revalidasi halaman tools

**Files:**
- Modify: `src/collections/ParameterTools.ts`, `src/lib/tag.ts`, `src/payload-types.ts` (hasil `npm run generate:types`), `tests/unit/tag.test.ts`, `tests/int/tools.int.spec.ts`
- Test: `tests/int/parameter-tools.int.spec.ts`

**Interfaces:**
- Consumes: `periksaParameter`, `ParameterTersimpan`, `BarisTabel` (Task 1); `revalidasiKoleksi` (`src/hooks/revalidasiPublik.ts`, Rencana 4A); validasi field bawaan `text`, `number`, `array` dari `payload/shared`.
- Produces:
  - Koleksi `parameter-tools`: `nilai` opsional, array `tabel` (`label`, `batas`, `nilai`), validasi bentuk dan kunci lewat `periksaParameter`, hook `afterChange` dan `afterDelete` yang membuang tag `parameter-tools`.
  - `TAG.parameterTools = 'parameter-tools'` (`src/lib/tag.ts`), dipakai `muatTool` di Task 7.
  - Tipe `ParameterTool` di `payload-types.ts`: `nilai?: number | null`, `tabel?: { label?; batas?; nilai?; id? }[] | null`.

Koleksi `parameter-tools` dari Rencana 1 hanya bisa menyimpan satu angka wajib, padahal TER, Pasal 17, kategori IMT, faktor aktivitas, kelipatan dana darurat, dan konversi nilai berbentuk tabel. Perubahan ini aditif: `nilai` menjadi opsional (kolom Postgres `DROP NOT NULL`, data lama tetap sah) dan ada tabel anak baru `parameter_tools_tabel`. Push skema di database dev dan tes berjalan tanpa pertanyaan DATA LOSS.

Validasi koleksi tidak menyalin aturan: field `kunci`, `nilai`, dan `tabel` menjalankan validasi bawaan Payload dulu, lalu `periksaParameter` dari modul `hitung` atas dokumen lengkap (gabungan data baru dan dokumen lama saat update sebagian). Kunci yang tidak dikenal ditolak beserta daftar kunci yang benar, parameter angka wajib punya `nilai`, dan tabel wajib punya kolom yang diminta definisinya, batas yang naik, dan batas kosong hanya di baris terakhir. Pesan muncul di field terkait di admin (spesifikasi §15).

Menyimpan atau menghapus parameter membuang tag `parameter-tools`, jadi halaman kalkulator (Task 7 dan 8) memakai angka baru tanpa deploy. Tes lama `tools.int.spec.ts` membuat parameter dengan kunci acak; kini memakai kunci yang dikenal (`jkk`) supaya tetap menguji aturan tanggal akhir, dengan pesan persis.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/int/parameter-tools.int.spec.ts`

  ```ts
  import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

  import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'

  import { getTestPayload, pesanGalat } from './helpers'

  let tag: string[] = []

  describe('parameter-tools: angka dan tabel bertanggal', () => {
    beforeAll(() => {
      pakaiPemicuRevalidasi((t) => tag.push(t))
    })

    afterAll(() => {
      pakaiPemicuRevalidasi(null)
    })

    beforeEach(() => {
      tag = []
    })

    it('menyimpan tabel berurutan dengan batas kosong di baris terakhir', async () => {
      const payload = await getTestPayload()
      const doc = await payload.create({
        collection: 'parameter-tools',
        data: {
          toolId: 'gaji-bersih',
          kunci: 'tarif-pasal-17',
          berlakuMulai: '2022-01-01',
          tabel: [
            { batas: 60_000_000, nilai: 5 },
            { batas: 250_000_000, nilai: 15 },
            { batas: null, nilai: 35 },
          ],
          sumber: { judul: 'UU HPP', url: 'https://www.pajak.go.id/' },
        },
      })
      const dibaca = await payload.findByID({ collection: 'parameter-tools', id: doc.id })
      expect(dibaca.nilai).toBeNull()
      expect(dibaca.tabel?.map((b) => [b.batas, b.nilai])).toEqual([
        [60_000_000, 5],
        [250_000_000, 15],
        [null, 35],
      ])
      await payload.delete({ collection: 'parameter-tools', id: doc.id })
    })

    it('menolak kunci yang tidak dikenal, angka tanpa nilai, dan baris tabel tanpa tarif', async () => {
      const payload = await getTestPayload()
      const dasar = { toolId: 'gaji-bersih' as const, berlakuMulai: '2026-01-01' }
      expect(await pesanGalat(payload.create({ collection: 'parameter-tools', data: { ...dasar, kunci: 'ptkp-tk0', nilai: 1 } }))).toMatch(
        /^kunci: Kunci "ptkp-tk0" tidak dipakai kalkulator ini\. Pilih salah satu: ptkp-dasar, ptkp-kawin, ptkp-tanggungan, ter-a/,
      )
      expect(await pesanGalat(payload.create({ collection: 'parameter-tools', data: { ...dasar, kunci: 'jkm' } }))).toBe(
        'nilai: Isi nilai premi JKM dari kantor.',
      )
      expect(
        await pesanGalat(
          payload.create({ collection: 'parameter-tools', data: { ...dasar, kunci: 'ter-c', tabel: [{ batas: 6_600_000 }, { nilai: 0.25 }] } }),
        ),
      ).toBe('tabel: Baris 1: isi kolom Tarif.')
    })

    it('mengubah satu field memeriksa dokumen lengkap; simpan dan hapus merevalidasi halaman tools', async () => {
      const payload = await getTestPayload()
      const doc = await payload.create({
        collection: 'parameter-tools',
        data: { toolId: 'gaji-bersih', kunci: 'jp-batas', nilai: 11_086_300, berlakuMulai: '2026-03-01', berlakuSampai: '2027-02-28' },
      })
      expect(tag).toEqual(['parameter-tools'])
      const ubah = await payload.update({ collection: 'parameter-tools', id: doc.id, data: { nilai: 11_086_400 } })
      expect(ubah.nilai).toBe(11_086_400)
      expect(await pesanGalat(payload.update({ collection: 'parameter-tools', id: doc.id, data: { tabel: [{ batas: 1, nilai: 1 }] } }))).toBe(
        'tabel: Parameter ini berupa satu angka. Kosongkan tabel dan isi Nilai.',
      )
      tag = []
      await payload.delete({ collection: 'parameter-tools', id: doc.id })
      expect(tag).toEqual(['parameter-tools'])
    })
  })
  ```

  ```diff
  diff --git a/tests/unit/tag.test.ts b/tests/unit/tag.test.ts
  index 787a8ff..1988b3a 100644
  --- a/tests/unit/tag.test.ts
  +++ b/tests/unit/tag.test.ts
  @@ -13,6 +13,7 @@ describe('TAG', () => {
     it('tag tampilan dan tag koleksi untuk data halaman publik', () => {
       expect([TAG.header, TAG.footer]).toEqual(['header', 'footer'])
       expect(TAG.koleksi('penulis')).toBe('penulis')
  +    expect(TAG.parameterTools).toBe('parameter-tools')
     })
   })
   
  ```

  ```diff
  diff --git a/tests/int/tools.int.spec.ts b/tests/int/tools.int.spec.ts
  index 1dfe0ff..d95438f 100644
  --- a/tests/int/tools.int.spec.ts
  +++ b/tests/int/tools.int.spec.ts
  @@ -38,14 +38,14 @@ describe('tools dan parameter', () => {
         payload.create({
           collection: 'parameter-tools',
           data: {
  -          toolId: 'thr',
  -          kunci: unik('contoh'),
  -          nilai: 1,
  +          toolId: 'gaji-bersih',
  +          kunci: 'jkk',
  +          nilai: 0.24,
             berlakuMulai: '2026-06-01',
             berlakuSampai: '2026-01-01',
           },
         }),
       )
  -    expect(pesan).toMatch(/Tanggal akhir/)
  +    expect(pesan).toBe('berlakuSampai: Tanggal akhir harus sama atau sesudah tanggal mulai.')
     })
   })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: unit FAIL di `tests/unit/tag.test.ts` dengan `AssertionError: expected undefined to be 'parameter-tools' // Object.is equality`; integrasi FAIL tiga tes di `tests/int/parameter-tools.int.spec.ts`: "menyimpan tabel berurutan ..." dengan `ValidationError: The following field is invalid: Nilai`, "menolak kunci yang tidak dikenal ..." dengan `Error: Operasi diharapkan gagal, tetapi berhasil.`, dan "mengubah satu field ..." dengan `AssertionError: expected [] to deeply equal [ 'parameter-tools' ]`.

- [ ] **Langkah 3: Tag dan koleksi**

  ```diff
  diff --git a/src/lib/tag.ts b/src/lib/tag.ts
  index 8e5d3f6..15babc8 100644
  --- a/src/lib/tag.ts
  +++ b/src/lib/tag.ts
  @@ -9,6 +9,7 @@
    * - `header`, `footer`: global tampilan yang dirender layout di setiap halaman publik.
    * - `media`: dokumen media (alt, caption, kredit, ukuran) yang ditampilkan halaman.
    * - `redirect`: tabel redirect yang dibaca halaman saat path tidak cocok dengan dokumen.
  + * - `parameter-tools`: angka aturan kalkulator yang dibaca halaman `/tools/{slug}`.
    */
   
   export const KOLEKSI_PUBLIK = ['artikel', 'pilar', 'subkategori', 'penulis', 'tools', 'video', 'halaman'] as const
  @@ -22,6 +23,7 @@ export const TAG = {
     footer: 'footer',
     media: 'media',
     redirect: 'redirect',
  +  parameterTools: 'parameter-tools',
     koleksi: (koleksi: KoleksiPublik) => koleksi,
     dokumen: (koleksi: KoleksiPublik, id: number | string) => `${koleksi}:${id}`,
     pilar: (slug: string) => `pilar:${slug}`,
  ```

  ```diff
  diff --git a/src/collections/ParameterTools.ts b/src/collections/ParameterTools.ts
  index 20f3c6a..aa1da7d 100644
  --- a/src/collections/ParameterTools.ts
  +++ b/src/collections/ParameterTools.ts
  @@ -1,10 +1,30 @@
   import type { CollectionConfig } from 'payload'
  +import { array, number, text } from 'payload/shared'
   
   import { isLoggedIn } from '@/access'
  -import { LABEL_TOOL, TOOL_IDS } from '@/lib/konstanta'
  +import { revalidasiKoleksi } from '@/hooks/revalidasiPublik'
  +import { LABEL_TOOL, TOOL_IDS, type ToolId } from '@/lib/konstanta'
  +import { TAG } from '@/lib/tag'
   import { validasiRentangTanggal, validasiUrlOpsional } from '@/lib/validasi'
  +import { periksaParameter, type BarisTabel } from '@/modules/hitung'
   
  -/** Angka aturan (PTKP, tarif, batas iuran) yang bisa berubah. Dibaca modul hitung sesuai tanggal. */
  +type DataParameter = Partial<{ toolId: ToolId; kunci: string; nilai: number | null; tabel: BarisTabel[] | null }>
  +
  +/** Pesan modul hitung untuk satu field, dari data dokumen lengkap (kunci, nilai, tabel saling bergantung). */
  +function pesan(field: 'kunci' | 'nilai' | 'tabel', data: DataParameter, nilaiField: unknown): string | true {
  +  if (!data?.toolId) return true
  +  const doc = { toolId: data.toolId, kunci: data.kunci ?? '', nilai: data.nilai, tabel: data.tabel, [field]: nilaiField }
  +  return periksaParameter(doc)[field] ?? true
  +}
  +
  +/** Halaman tools membaca parameter lewat cache bertag `parameter-tools`, jadi perubahan langsung tampil. */
  +const revalidasi = revalidasiKoleksi([TAG.parameterTools])
  +
  +/**
  + * Angka aturan (PTKP, tarif TER, batas iuran, kategori IMT) yang bisa berubah. Dibaca modul hitung
  + * sesuai tanggal berlaku. Satu angka di `nilai`, tabel (tarif berlapis, daftar pilihan) di `tabel`.
  + * Kunci dan bentuknya divalidasi modul hitung supaya dokumen yang tersimpan selalu bisa dipakai.
  + */
   export const ParameterTools: CollectionConfig = {
     slug: 'parameter-tools',
     labels: { singular: 'Parameter tools', plural: 'Parameter tools' },
  @@ -12,8 +32,11 @@ export const ParameterTools: CollectionConfig = {
       useAsTitle: 'kunci',
       defaultColumns: ['toolId', 'kunci', 'nilai', 'berlakuMulai', 'berlakuSampai'],
       group: 'Tools',
  +    description:
  +      'Untuk mengganti angka yang berubah (misalnya batas upah JP tahun depan), buat dokumen baru dengan kunci yang sama dan tanggal berlaku baru, lalu isi tanggal akhir dokumen lama.',
     },
     access: { read: isLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  +  hooks: { afterChange: [revalidasi.afterChange], afterDelete: [revalidasi.afterDelete] },
     fields: [
       {
         name: 'toolId',
  @@ -21,8 +44,43 @@ export const ParameterTools: CollectionConfig = {
         required: true,
         options: TOOL_IDS.map((id) => ({ value: id, label: LABEL_TOOL[id] })),
       },
  -    { name: 'kunci', type: 'text', required: true, admin: { description: 'Contoh: ptkp-tk0' } },
  -    { name: 'nilai', type: 'number', required: true },
  +    {
  +      name: 'kunci',
  +      type: 'text',
  +      required: true,
  +      admin: { description: 'Nama parameter di modul hitung, misalnya ptkp-dasar atau ter-a. Kunci yang tidak dikenal ditolak beserta daftar kunci yang benar.' },
  +      validate: (value: unknown, opsi: Parameters<typeof text>[1]) => {
  +        const dasar = text(value as string, opsi)
  +        return dasar === true ? pesan('kunci', opsi.data as DataParameter, value) : dasar
  +      },
  +    },
  +    {
  +      name: 'nilai',
  +      type: 'number',
  +      admin: { description: 'Untuk parameter satu angka. Persen ditulis seperti di peraturan: 1,5 berarti 1,5%.' },
  +      validate: (value: unknown, opsi: Parameters<typeof number>[1]) => {
  +        const dasar = number(value as number, opsi)
  +        return dasar === true ? pesan('nilai', opsi.data as DataParameter, value) : dasar
  +      },
  +    },
  +    {
  +      name: 'tabel',
  +      type: 'array',
  +      labels: { singular: 'Baris', plural: 'Baris' },
  +      admin: {
  +        description:
  +          'Untuk parameter berbentuk tabel: tarif TER, lapisan Pasal 17, kategori IMT, faktor aktivitas, kelipatan dana darurat, konversi nilai. Batas berarti "sampai dengan"; kosongkan batas baris terakhir untuk tanpa batas.',
  +      },
  +      validate: (value: unknown, opsi: Parameters<typeof array>[1]) => {
  +        const dasar = array(value as unknown[], opsi)
  +        return dasar === true ? pesan('tabel', opsi.data as DataParameter, value) : dasar
  +      },
  +      fields: [
  +        { name: 'label', type: 'text' },
  +        { name: 'batas', type: 'number' },
  +        { name: 'nilai', type: 'number' },
  +      ],
  +    },
       { name: 'berlakuMulai', type: 'date', required: true },
       {
         name: 'berlakuSampai',
  ```

- [ ] **Langkah 4: Tipe Payload dan database dev**

  Jalankan:

  ```bash
  npm run generate:types
  git diff --stat src/payload-types.ts
  npm run seed
  ```

  Hasil yang diharapkan: `src/payload-types.ts | 28 ++++++++++++++++++++++++++--` (`nilai` opsional dan field `tabel` di `ParameterTool` dan `ParameterToolsSelect`, plus deskripsi admin baru); `npm run seed` selesai tanpa pertanyaan DATA LOSS (skema aditif terdorong ke database dev sebelum build).

- [ ] **Langkah 5: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 46 passed (46)`, `Tests 307 passed (307)`; integrasi `Test Files 26 passed (26)`, `Tests 76 passed (76)`; E2E `74 passed`.

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/collections/ParameterTools.ts src/lib/tag.ts src/payload-types.ts tests/unit/tag.test.ts tests/int/tools.int.spec.ts tests/int/parameter-tools.int.spec.ts
  git commit -m "feat(tools): parameter tabel bertanggal, validasi dari modul hitung, dan revalidasi halaman tools"
  ```

### Task 3: Kalkulator THR keagamaan dan PPh 21 di bulan THR

**Files:**
- Create: `src/modules/hitung/thr.ts`
- Modify: `src/modules/hitung/index.ts`
- Test: `tests/unit/hitung-thr.test.ts`

**Interfaces:**
- Consumes: `Rumus` (Task 1); dari `gaji-bersih.ts`: `angka`, `brutoDanTer`, `isianRupiah`, `rp`; dari `pajak.ts`: `isianStatus`, `isianBpjsKesehatan`, `isianBpjsKetenagakerjaan`, `StatusPtkp`; `PARAMETER_GAJI` dan bantuan tes (Task 1).
- Produces: `hitung('thr', ...)` dan `siapkanKalkulator('thr', ...)` (tombol "Hitung THR", isian upah sebulan, masa kerja dalam bulan, status PTKP, kepesertaan BPJS). `sumberParameter('thr')` = `['gaji-bersih']`: THR tidak punya parameter sendiri.

Besar THR mengikuti Permenaker 6/2016 Pasal 2 dan 3 (ditegaskan lagi SE Menaker M/3/HK.04.00/III/2026): masa kerja kurang dari 1 bulan belum berhak, 1 sampai 11 bulan mendapat masa kerja/12 x upah sebulan, 12 bulan atau lebih mendapat 1 bulan upah. Hasil utama adalah THR; ringkasan memuat PPh 21 tambahan di bulan THR, yaitu TER atas (bruto bulan biasa + THR) dikurangi TER bulan biasa, memakai parameter PTKP dan TER milik Gaji Bersih. THR tidak menambah premi BPJS (iuran dihitung dari upah bulanan).

Tes memakai contoh infografis pemerintah indonesiabaik.id (masa kerja 3 tahun, upah Rp7.000.000: THR Rp7.000.000; 6 bulan, Rp5.000.000: Rp2.500.000) dan penjelasan DJP tentang THR dengan skema TER (TK/0, gaji Rp6.500.000, THR Rp6.500.000: PPh bulan biasa 1% = Rp65.000, bulan THR 5% x Rp13.000.000 = Rp650.000, tambahan Rp585.000).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/hitung-thr.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { hitung, siapkanKalkulator } from '@/modules/hitung'
  import { PARAMETER_AWAL } from '@/seed/parameter-tools'

  import { berhasil, langkah, ringkasan, rp } from './hitung-bantu'

  const HARI_INI = '2026-11-05'
  const tanpaBpjs = { bpjsKesehatan: '', bpjsKetenagakerjaan: '' }
  const thr = (masukan: Record<string, string>) => hitung('thr', masukan, HARI_INI, PARAMETER_AWAL)

  describe('THR: besar menurut Permenaker 6/2016', () => {
    it('contoh indonesiabaik.id: masa kerja 3 tahun, upah Rp7.000.000, THR Rp7.000.000', () => {
      const h = berhasil(thr({ upah: '7.000.000', masaKerja: '36', status: 'TK/0', ...tanpaBpjs }))
      expect(h.utama).toMatchObject({ label: 'THR kamu', nilai: 7_000_000, keterangan: '1 bulan upah, karena masa kerjamu 12 bulan atau lebih.' })
    })

    it('contoh indonesiabaik.id: masa kerja 6 bulan, upah Rp5.000.000, THR 6/12 x upah = Rp2.500.000', () => {
      const h = berhasil(thr({ upah: '5.000.000', masaKerja: '6', status: 'TK/0', ...tanpaBpjs }))
      expect(h.utama.nilai).toBe(2_500_000)
      expect(h.utama.keterangan).toBe('6/12 dari upah sebulan, karena masa kerjamu 6 bulan.')
      expect(h.rincian[0].langkah.find((l) => l.label === 'THR')?.catatan).toBe(`6/12 x ${rp('Rp 5.000.000')}`)
    })

    it('masa kerja kurang dari 1 bulan belum berhak THR', () => {
      const h = berhasil(thr({ upah: '5.000.000', masaKerja: '0', status: 'TK/0' }))
      expect(h.utama).toMatchObject({ nilai: 0, keterangan: 'Masa kerja belum 1 bulan, jadi kamu belum berhak THR keagamaan.' })
      expect(h.ringkasan).toEqual([])
    })
  })

  describe('THR: PPh 21 di bulan THR', () => {
    it('contoh DJP (TK/0, gaji Rp6.500.000, THR Rp6.500.000): TER 1% di bulan biasa, 5% di bulan THR', () => {
      const h = berhasil(thr({ upah: '6.500.000', masaKerja: '12', status: 'TK/0', ...tanpaBpjs }))
      expect(langkah(h, 'PPh 21 bulan biasa')).toBe(rp('Rp 65.000'))
      expect(langkah(h, 'Bruto bulan THR')).toBe(rp('Rp 13.000.000'))
      expect(langkah(h, 'PPh 21 bulan THR')).toBe(rp('Rp 650.000'))
      expect(ringkasan(h, 'Tambahan PPh 21')).toBe(585_000)
      expect(ringkasan(h, 'Perkiraan THR yang kamu terima')).toBe(5_915_000)
    })

    it('contoh form dengan BPJS: premi kantor ikut bruto bulan biasa dan bulan THR', () => {
      const k = siapkanKalkulator('thr', PARAMETER_AWAL, HARI_INI)
      expect(k.tombol).toBe('Hitung THR')
      expect(k.contoh).toEqual({ upah: '6.500.000', masaKerja: '12', status: 'TK/0', bpjsKesehatan: 'ya', bpjsKetenagakerjaan: 'ya' })
      const h = berhasil(hitung('thr', k.contoh, HARI_INI, PARAMETER_AWAL))
      // Bruto biasa 6.500.000 + JKK 15.600 + JKM 19.500 + BPJS Kesehatan 260.000 = 6.795.100 (TER A 1,25%).
      expect(langkah(h, 'Bruto bulan biasa')).toBe(rp('Rp 6.795.100'))
      expect(langkah(h, 'PPh 21 bulan biasa')).toBe(rp('Rp 84.938'))
      expect(langkah(h, 'PPh 21 bulan THR')).toBe(rp('Rp 664.755'))
      expect(ringkasan(h, 'Tambahan PPh 21')).toBe(579_817)
      expect(k.dasar.map((d) => d.kunci)).toContain('ter-a')
    })

    it('masa kerja wajib angka bulat', () => {
      expect(thr({ upah: '5.000.000', masaKerja: '6,5', status: 'TK/0' })).toEqual({
        ok: false,
        pesan: null,
        galat: { masaKerja: 'Tulis masa kerja sampai hari raya dengan angka bulat, misalnya 12.' },
      })
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: 6 tes FAIL di `tests/unit/hitung-thr.test.ts`; empat tes contoh dengan `AssertionError: hitung gagal: {"ok":false,"galat":{},"pesan":"Kalkulator ini belum tersedia."}`, tes contoh form dengan `AssertionError: expected '' to be 'Hitung THR' // Object.is equality`, dan tes masa kerja dengan `AssertionError: expected { ok: false, galat: {}, …(1) } to deeply equal { ok: false, pesan: null, …(1) }`.

- [ ] **Langkah 3: Kalkulator THR**

  `src/modules/hitung/thr.ts`

  ```ts
  import { angka, brutoDanTer, isianRupiah, rp } from './gaji-bersih'
  import { teksAngka } from './format'
  import { isianBpjsKesehatan, isianBpjsKetenagakerjaan, isianStatus, type StatusPtkp } from './pajak'
  import type { Rumus } from './rumus'

  /**
   * THR keagamaan (Permenaker 6/2016 Pasal 3, SE Menaker M/3/HK.04.00/III/2026): masa kerja 12 bulan
   * atau lebih mendapat 1 bulan upah; 1 sampai kurang dari 12 bulan proporsional masa kerja/12. PPh 21
   * bulan THR memakai TER atas gaji ditambah THR (PP 58/2023), dengan parameter milik Gaji Bersih.
   */

  /** Masa kerja minimal dan masa kerja untuk THR penuh, dalam bulan (Permenaker 6/2016 Pasal 2 dan 3). */
  const MASA_MINIMAL = 1
  const MASA_PENUH = 12

  export const thr: Rumus = {
    tombol: 'Hitung THR',
    sumber: ['gaji-bersih'],
    parameter: [],
    isian: () => [
      isianRupiah({
        kunci: 'upah',
        label: 'Upah sebulan',
        bantuan: 'Gaji pokok ditambah tunjangan tetap. Pekerja harian lepas memakai rata-rata upah sebulan.',
        wajib: true,
        min: 1,
        contoh: '6.500.000',
      }),
      {
        jenis: 'angka',
        kunci: 'masaKerja',
        label: 'Masa kerja sampai hari raya',
        bantuan: 'Dalam bulan penuh. Sudah setahun atau lebih? Tulis 12.',
        satuan: 'bulan',
        desimal: false,
        wajib: true,
        min: 0,
        maks: 600,
        contoh: '12',
      },
      isianStatus,
      isianBpjsKesehatan,
      isianBpjsKetenagakerjaan,
    ],
    hitung(nilai, aturan) {
      const upah = nilai.upah as number
      const masa = nilai.masaKerja as number
      const status = nilai.status as StatusPtkp
      const catatan =
        'PPh 21 bulan THR memakai TER atas gaji ditambah THR. Di bulan Desember pajak setahun dihitung ulang, jadi potongan tambahan ini bukan pajak baru.'
      if (masa < MASA_MINIMAL) {
        return {
          utama: { ...angka('THR kamu', 0), keterangan: 'Masa kerja belum 1 bulan, jadi kamu belum berhak THR keagamaan.' },
          ringkasan: [],
          rincian: [
            {
              judul: 'Besar THR',
              langkah: [
                { label: 'Masa kerja', teks: teksAngka(masa, 'bulan') },
                { label: 'Syarat', teks: 'Masa kerja 1 bulan terus-menerus atau lebih' },
              ],
            },
          ],
          catatan,
        }
      }
      const bulan = Math.min(masa, MASA_PENUH)
      const besar = Math.round((upah * bulan) / MASA_PENUH)
      const ikut = { kesehatan: nilai.bpjsKesehatan === true, ketenagakerjaan: nilai.bpjsKetenagakerjaan === true }
      const biasa = brutoDanTer(upah, 0, status, ikut, aturan)
      const denganThr = brutoDanTer(upah, besar, status, ikut, aturan)
      const tambahan = denganThr.ter.pajak - biasa.ter.pajak
      const penuh = masa >= MASA_PENUH
      return {
        utama: {
          ...angka('THR kamu', besar),
          keterangan: penuh
            ? '1 bulan upah, karena masa kerjamu 12 bulan atau lebih.'
            : `${bulan}/12 dari upah sebulan, karena masa kerjamu ${bulan} bulan.`,
        },
        ringkasan: [angka('Tambahan PPh 21 di bulan THR', tambahan), angka('Perkiraan THR yang kamu terima', besar - tambahan)],
        rincian: [
          {
            judul: 'Besar THR',
            langkah: [
              { label: 'Upah sebulan', teks: rp(upah) },
              { label: 'Masa kerja', teks: teksAngka(masa, 'bulan') },
              { label: 'THR', teks: rp(besar), catatan: penuh ? '1 bulan upah' : `${bulan}/12 x ${rp(upah)}` },
            ],
          },
          {
            judul: 'PPh 21 di bulan THR',
            langkah: [
              { label: 'Bruto bulan biasa', teks: rp(biasa.bruto), catatan: 'Upah ditambah premi yang dibayar kantor.' },
              { label: 'PPh 21 bulan biasa', teks: rp(biasa.ter.pajak), catatan: `TER ${biasa.ter.kategori} ${teksAngka(biasa.ter.tarif, 'persen')}` },
              { label: 'Bruto bulan THR', teks: rp(denganThr.bruto), catatan: `${rp(biasa.bruto)} + THR ${rp(besar)}` },
              {
                label: 'PPh 21 bulan THR',
                teks: rp(denganThr.ter.pajak),
                catatan: `TER ${denganThr.ter.kategori} ${teksAngka(denganThr.ter.tarif, 'persen')}`,
              },
              { label: 'Tambahan PPh 21 karena THR', teks: rp(tambahan) },
              { label: 'Perkiraan THR yang kamu terima', teks: rp(besar - tambahan) },
            ],
          },
        ],
        catatan,
      }
    },
  }
  ```

  ```diff
  diff --git a/src/modules/hitung/index.ts b/src/modules/hitung/index.ts
  index 8dd857c..15dac1f 100644
  --- a/src/modules/hitung/index.ts
  +++ b/src/modules/hitung/index.ts
  @@ -5,6 +5,7 @@ import { tengahKalimat } from './format'
   import { bacaMasukan, contohMasukan } from './masukan'
   import { buatAturan, ParameterKosong, periksaDokumen, type GalatParameter } from './parameter'
   import type { Rumus } from './rumus'
  +import { thr } from './thr'
   import type { DefinisiParameter, Hasil, Kalkulator, Masukan, ParameterTersimpan } from './tipe'
   
   /**
  @@ -20,6 +21,7 @@ import type { DefinisiParameter, Hasil, Kalkulator, Masukan, ParameterTersimpan
   
   const RUMUS: Partial<Record<ToolId, Rumus>> = {
     'gaji-bersih': gajiBersih,
  +  thr,
   }
   
   const BELUM_TERSEDIA = 'Kalkulator ini belum tersedia.'
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

  Hasil yang diharapkan: bersih; unit `Test Files 47 passed (47)`, `Tests 313 passed (313)`; integrasi `Test Files 26 passed (26)`, `Tests 76 passed (76)`; E2E `74 passed`.

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/modules/hitung tests/unit/hitung-thr.test.ts
  git commit -m "feat(hitung): kalkulator THR keagamaan dan PPh 21 di bulan THR"
  ```

### Task 4: Kalkulator Cicilan & KPR (anuitas dan flat) dan Dana Darurat

**Files:**
- Create: `src/modules/hitung/cicilan-kpr.ts`, `src/modules/hitung/dana-darurat.ts`
- Modify: `src/modules/hitung/index.ts`, `src/seed/parameter-tools.ts`
- Test: `tests/unit/hitung-cicilan-darurat.test.ts`

**Interfaces:**
- Consumes: `Rumus`, `persenDari` (Task 1); dari `gaji-bersih.ts`: `angka`, `isianRupiah`, `rp`; bantuan tes (Task 1).
- Produces:
  - `hitung('cicilan-kpr', ...)`: isian `harga`, `uangMuka` (persen), `bunga` per tahun (persen), `tenor` (lama cicilan dalam tahun), `metode` (`anuitas` atau `flat`); hasil utama cicilan per bulan, ringkasan pokok pinjaman, total bunga, total yang dibayar; rincian bunga dan pokok bulan pertama. Tanpa parameter CMS (`parameter: []`).
  - `hitung('dana-darurat', ...)`: isian `pengeluaran` bulanan, `kondisi` (dari tabel `kelipatan`), `terkumpul`, `jangka` (bulan); hasil utama target dana darurat, ringkasan kekurangan dan setoran per bulan.
  - `PARAMETER_DANA_DARURAT` (1 dokumen, tabel `kelipatan`) di `src/seed/parameter-tools.ts`, ikut `PARAMETER_AWAL`.

Cicilan anuitas memakai rumus baku `P x r / (1 - (1 + r)^-n)` dengan `r` bunga tahunan dibagi 12; bunga 0% membagi pokok rata. Flat menghitung bunga dari pokok awal: (pokok + pokok x bunga x tahun) / bulan. Uang muka 100% ditolak karena tidak ada pinjaman. Kalkulator ini tidak punya angka aturan di CMS (bunga diisi pembaca), dan catatan hasil menjelaskan bahwa bunga dianggap tetap sepanjang tenor; bunga mengambang KPR setelah masa promo tidak dimodelkan (lihat Cakupan yang ditunda).

Dana darurat memakai aturan praktis OJK (Sikapi Uangmu): lajang 6 kali pengeluaran bulanan, berkeluarga atau punya tanggungan 9 sampai 12 kali. Tabel `kelipatan` memecahnya menjadi tiga kondisi (lajang tanpa tanggungan 6, menikah tanpa anak 9, menikah dengan anak atau punya tanggungan 12). Pilihan kondisi di form dibangun dari tabel itu, jadi pemilik bisa mengubah label dan kelipatannya dari CMS. Setoran per bulan dibulatkan ke atas supaya target tercapai.

Tes cicilan memakai contoh Kompas (pokok Rp120.000.000, bunga 11%, 120 bulan: cicilan Rp1.653.000, bunga bulan pertama Rp1.100.000, pokok bulan pertama Rp553.000). Contoh form (harga Rp500.000.000, uang muka 20%, bunga 7,5%, 15 tahun) menghasilkan Rp3.708.049 per bulan.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/hitung-cicilan-darurat.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { hitung, siapkanKalkulator, type ParameterTersimpan } from '@/modules/hitung'
  import { PARAMETER_AWAL } from '@/seed/parameter-tools'

  import { berhasil, langkah, ringkasan, rp } from './hitung-bantu'

  const HARI_INI = '2026-11-05'

  describe('Cicilan & KPR', () => {
    const kpr = (masukan: Record<string, string>) => hitung('cicilan-kpr', masukan, HARI_INI, PARAMETER_AWAL)

    it('anuitas, contoh Kompas: pokok Rp120.000.000, bunga 11%, 120 bulan: cicilan Rp1.653.000, bunga bulan pertama Rp1.100.000', () => {
      const h = berhasil(kpr({ harga: '120.000.000', uangMuka: '0', bunga: '11', tenor: '10', metode: 'anuitas' }))
      expect(h.utama.nilai).toBe(1_653_000)
      expect(langkah(h, 'Bunga bulan pertama')).toBe(rp('Rp 1.100.000'))
      expect(langkah(h, 'Pokok bulan pertama')).toBe(rp('Rp 553.000'))
      expect(ringkasan(h, 'Total yang dibayar')).toBe(1_653_000 * 120)
    })

    it('flat: bunga dari pokok awal, Rp1.000.000 pokok + Rp1.100.000 bunga', () => {
      const h = berhasil(kpr({ harga: '120.000.000', uangMuka: '0', bunga: '11', tenor: '10', metode: 'flat' }))
      expect(h.utama.nilai).toBe(2_100_000)
      expect(langkah(h, 'Bunga setiap bulan')).toBe(rp('Rp 1.100.000'))
      expect(ringkasan(h, 'Total bunga')).toBe(132_000_000)
    })

    it('contoh form: harga Rp500.000.000, uang muka 20%, bunga 7,5%, 15 tahun', () => {
      const k = siapkanKalkulator('cicilan-kpr', PARAMETER_AWAL, HARI_INI)
      expect(k.tombol).toBe('Hitung cicilan')
      expect(k.dasar).toEqual([])
      const h = berhasil(hitung('cicilan-kpr', k.contoh, HARI_INI, []))
      expect(ringkasan(h, 'Pokok pinjaman')).toBe(400_000_000)
      expect(h.utama.nilai).toBe(3_708_049)
      expect(langkah(h, 'Bunga per bulan')).toBe('0,625%')
      expect(h.utama.keterangan).toBe('Selama 180 bulan dengan bunga anuitas 7,5% per tahun yang tetap.')
    })

    it('bunga 0: pokok dibagi rata; uang muka 100% ditolak', () => {
      expect(berhasil(kpr({ harga: '12.000.000', uangMuka: '0', bunga: '0', tenor: '1', metode: 'anuitas' })).utama.nilai).toBe(1_000_000)
      expect(kpr({ harga: '12.000.000', uangMuka: '100', bunga: '0', tenor: '1', metode: 'flat' })).toEqual({
        ok: false,
        pesan: null,
        galat: { uangMuka: 'Uang muka paling banyak 99%.' },
      })
    })
  })

  describe('Dana Darurat', () => {
    const darurat = (masukan: Record<string, string>, parameter: ParameterTersimpan[] = PARAMETER_AWAL) =>
      hitung('dana-darurat', masukan, HARI_INI, parameter)

    it('lajang 6 kali pengeluaran (OJK); kekurangan dibagi jangka, dibulatkan ke atas', () => {
      const h = berhasil(darurat({ pengeluaran: '5.000.000', kondisi: 'Lajang tanpa tanggungan', terkumpul: '5.000.000', jangka: '12' }))
      expect(h.utama).toMatchObject({ nilai: 30_000_000, keterangan: '6 kali pengeluaran wajib sebulan.' })
      expect(ringkasan(h, 'Sudah terkumpul')).toBe(16)
      expect(ringkasan(h, 'Kekurangan')).toBe(25_000_000)
      expect(ringkasan(h, 'Sisihkan per bulan')).toBe(2_083_334)
    })

    it('berkeluarga 9 dan 12 kali; target tercapai tanpa setoran', () => {
      expect(berhasil(darurat({ pengeluaran: '8.000.000', kondisi: 'Menikah tanpa anak', jangka: '24' })).utama.nilai).toBe(72_000_000)
      const h = berhasil(darurat({ pengeluaran: '8.000.000', kondisi: 'Menikah dengan anak atau punya tanggungan', terkumpul: '100.000.000', jangka: '6' }))
      expect(h.utama).toMatchObject({ nilai: 96_000_000, keterangan: 'Dana daruratmu sudah mencapai target.' })
      expect(ringkasan(h, 'Sisihkan per bulan')).toBe(0)
    })

    it('pilihan kondisi berasal dari tabel parameter, jadi bisa diubah dari CMS', () => {
      const ubahan: ParameterTersimpan[] = [
        { toolId: 'dana-darurat', kunci: 'kelipatan', berlakuMulai: '2026-01-01', tabel: [{ label: 'Pekerja lepas', nilai: 12 }] },
      ]
      const k = siapkanKalkulator('dana-darurat', ubahan, HARI_INI)
      expect(k.isian.find((i) => i.kunci === 'kondisi')).toMatchObject({ opsi: [{ nilai: 'Pekerja lepas', label: 'Pekerja lepas' }], contoh: 'Pekerja lepas' })
      expect(berhasil(darurat({ pengeluaran: '4.000.000', kondisi: 'Pekerja lepas', jangka: '12' }, ubahan)).utama.nilai).toBe(48_000_000)
      expect(darurat({ pengeluaran: '4.000.000', kondisi: 'Lajang tanpa tanggungan', jangka: '12' }, ubahan)).toEqual({
        ok: false,
        pesan: null,
        galat: { kondisi: 'Pilih kondisimu dari daftar.' },
      })
    })

    it('tanpa tabel kelipatan: kalkulator tidak bisa dipakai, dengan pesan', () => {
      expect(siapkanKalkulator('dana-darurat', [], HARI_INI)).toMatchObject({
        isian: [],
        pesan: 'Kalkulator ini sedang diperbarui: angka kelipatan dana darurat belum tersedia. Coba lagi nanti.',
      })
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: 8 tes FAIL di `tests/unit/hitung-cicilan-darurat.test.ts`, di antaranya tes anuitas Kompas dengan `AssertionError: hitung gagal: {"ok":false,"galat":{},"pesan":"Kalkulator ini belum tersedia."}` dan tes contoh form dengan `AssertionError: expected '' to be 'Hitung cicilan' // Object.is equality`.

- [ ] **Langkah 3: Kalkulator Cicilan & KPR**

  `src/modules/hitung/cicilan-kpr.ts`

  ```ts
  import { angka, isianRupiah, rp } from './gaji-bersih'
  import { teksAngka } from './format'
  import { persenDari, type Rumus } from './rumus'

  /**
   * Cicilan pinjaman dengan bunga tetap sepanjang tenor. Anuitas (umum untuk KPR): cicilan sama setiap
   * bulan, P x r / (1 - (1 + r)^-n) dengan r bunga per bulan. Flat (umum untuk kendaraan dan KTA): bunga
   * dihitung dari pokok awal, P / n + P x r. Bunga mengambang dan biaya lain di luar perhitungan.
   */

  const PERSEN_BULANAN = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 })

  export const cicilanKpr: Rumus = {
    tombol: 'Hitung cicilan',
    sumber: ['cicilan-kpr'],
    parameter: [],
    isian: () => [
      isianRupiah({ kunci: 'harga', label: 'Harga rumah atau barang', bantuan: 'Harga jual sebelum dikurangi uang muka.', wajib: true, min: 1, contoh: '500.000.000' }),
      {
        jenis: 'angka',
        kunci: 'uangMuka',
        label: 'Uang muka',
        bantuan: 'Persen dari harga. Tulis 0 bila tanpa uang muka.',
        satuan: 'persen',
        desimal: true,
        wajib: true,
        min: 0,
        maks: 99,
        contoh: '20',
      },
      {
        jenis: 'angka',
        kunci: 'bunga',
        label: 'Bunga per tahun',
        bantuan: 'Lihat di penawaran bank atau leasing. Tulis 0 untuk cicilan tanpa bunga.',
        satuan: 'persen',
        desimal: true,
        wajib: true,
        min: 0,
        maks: 50,
        contoh: '7,5',
      },
      { jenis: 'angka', kunci: 'tenor', label: 'Lama cicilan', bantuan: null, satuan: 'tahun', desimal: false, wajib: true, min: 1, maks: 30, contoh: '15' },
      {
        jenis: 'pilihan',
        kunci: 'metode',
        label: 'Cara hitung bunga',
        bantuan: 'Anuitas umum untuk KPR, flat umum untuk kendaraan dan pinjaman tanpa agunan. Tanyakan ke pemberi pinjaman bila ragu.',
        opsi: [
          { nilai: 'anuitas', label: 'Anuitas: cicilan tetap, porsi bunga besar di awal' },
          { nilai: 'flat', label: 'Flat: bunga dari pokok awal setiap bulan' },
        ],
        contoh: 'anuitas',
      },
    ],
    hitung(nilai) {
      const harga = nilai.harga as number
      const uangMuka = nilai.uangMuka as number
      const bunga = nilai.bunga as number
      const tenor = nilai.tenor as number
      const anuitas = nilai.metode === 'anuitas'

      const muka = Math.round(persenDari(harga, uangMuka))
      const pokok = harga - muka
      const n = tenor * 12
      const r = bunga / 100 / 12
      const tepat = anuitas ? (r === 0 ? pokok / n : (pokok * r) / (1 - Math.pow(1 + r, -n))) : pokok / n + pokok * r
      const cicilan = Math.round(tepat)
      const bungaPertama = Math.round(pokok * r)
      const total = cicilan * n
      const totalBunga = total - pokok
      const tarif = teksAngka(bunga, 'persen')

      return {
        utama: {
          ...angka('Cicilan per bulan', cicilan),
          keterangan: `Selama ${n} bulan dengan bunga ${anuitas ? 'anuitas' : 'flat'} ${tarif} per tahun yang tetap.`,
        },
        ringkasan: [angka('Pokok pinjaman', pokok), angka('Total bunga', totalBunga), angka('Total yang dibayar', total)],
        rincian: [
          {
            judul: 'Pokok pinjaman',
            langkah: [
              { label: 'Harga', teks: rp(harga) },
              { label: `Uang muka ${teksAngka(uangMuka, 'persen')}`, teks: rp(muka) },
              { label: 'Pokok pinjaman', teks: rp(pokok) },
            ],
          },
          {
            judul: 'Cicilan',
            langkah: [
              { label: 'Bunga per bulan', teks: `${PERSEN_BULANAN.format(bunga / 12)}%`, catatan: `${tarif} dibagi 12` },
              { label: 'Jumlah cicilan', teks: teksAngka(n, 'bulan'), catatan: `${teksAngka(tenor, 'tahun')} x 12` },
              {
                label: 'Cicilan per bulan',
                teks: rp(cicilan),
                catatan: anuitas
                  ? 'Pokok x bunga per bulan / (1 - (1 + bunga per bulan) pangkat minus jumlah cicilan)'
                  : 'Pokok / jumlah cicilan + pokok x bunga per bulan',
              },
              {
                label: anuitas ? 'Bunga bulan pertama' : 'Bunga setiap bulan',
                teks: rp(bungaPertama),
                ...(anuitas ? { catatan: 'Turun setiap bulan karena sisa pokok berkurang.' } : {}),
              },
              { label: anuitas ? 'Pokok bulan pertama' : 'Pokok setiap bulan', teks: rp(cicilan - bungaPertama) },
            ],
          },
          {
            judul: 'Total',
            langkah: [
              { label: 'Total yang dibayar', teks: rp(total), catatan: `${n} x ${rp(cicilan)}` },
              { label: 'Total bunga', teks: rp(totalBunga) },
            ],
          },
        ],
        catatan:
          'Bunga dianggap tetap sepanjang tenor. Bunga mengambang (floating) setelah masa bunga tetap mengubah cicilan. Biaya provisi, administrasi, asuransi, dan notaris belum dihitung.',
      }
    },
  }
  ```

- [ ] **Langkah 4: Kalkulator Dana Darurat dan parameternya**

  `src/modules/hitung/dana-darurat.ts`

  ```ts
  import { angka, isianRupiah, rp } from './gaji-bersih'
  import { teksAngka } from './format'
  import type { Rumus } from './rumus'

  /**
   * Dana darurat sebagai kelipatan pengeluaran wajib sebulan. Kelipatan per kondisi adalah aturan
   * praktis (OJK, Sikapi Uangmu), disimpan sebagai tabel parameter: label menjadi pilihan di form.
   */

  export const danaDarurat: Rumus = {
    tombol: 'Hitung dana darurat',
    sumber: ['dana-darurat'],
    parameter: [
      {
        kunci: 'kelipatan',
        label: 'Kelipatan dana darurat',
        jenis: 'tabel',
        kolom: { label: { judul: 'Kondisi' }, nilai: { judul: 'Kelipatan pengeluaran', satuan: 'kali' } },
      },
    ],
    isian: (aturan) => {
      const kondisi = aturan.tabel('kelipatan').map((b) => ({ nilai: b.label ?? '', label: b.label ?? '' }))
      return [
        isianRupiah({
          kunci: 'pengeluaran',
          label: 'Pengeluaran wajib per bulan',
          bantuan: 'Yang tetap harus dibayar walau penghasilan berhenti: makan, tempat tinggal, transport, tagihan, dan cicilan.',
          wajib: true,
          min: 1,
          contoh: '5.000.000',
        }),
        { jenis: 'pilihan', kunci: 'kondisi', label: 'Kondisimu', bantuan: null, opsi: kondisi, contoh: kondisi[0]?.nilai ?? '' },
        isianRupiah({
          kunci: 'terkumpul',
          label: 'Dana darurat yang sudah ada',
          bantuan: 'Tabungan yang bisa dicairkan kapan saja, di luar tabungan untuk tujuan lain.',
          wajib: false,
          min: 0,
          contoh: '5.000.000',
        }),
        { jenis: 'angka', kunci: 'jangka', label: 'Target terkumpul dalam', bantuan: null, satuan: 'bulan', desimal: false, wajib: true, min: 1, maks: 120, contoh: '12' },
      ]
    },
    hitung(nilai, aturan) {
      const pengeluaran = nilai.pengeluaran as number
      const kondisi = nilai.kondisi as string
      const terkumpul = (nilai.terkumpul as number | null) ?? 0
      const jangka = nilai.jangka as number
      const kali = aturan.tabel('kelipatan').find((b) => b.label === kondisi)?.nilai ?? 0
      const target = pengeluaran * kali
      const kurang = Math.max(0, target - terkumpul)
      const perBulan = Math.ceil(kurang / jangka)
      const persen = target > 0 ? Math.min(100, Math.floor((terkumpul / target) * 100)) : 100
      return {
        utama: {
          ...angka('Target dana darurat', target),
          keterangan: kurang === 0 ? 'Dana daruratmu sudah mencapai target.' : `${teksAngka(kali, 'kali')} pengeluaran wajib sebulan.`,
        },
        ringkasan: [angka('Sudah terkumpul', persen, 'persen'), angka('Kekurangan', kurang), angka(`Sisihkan per bulan selama ${jangka} bulan`, perBulan)],
        rincian: [
          {
            judul: 'Target',
            langkah: [
              { label: 'Pengeluaran wajib per bulan', teks: rp(pengeluaran) },
              { label: 'Kelipatan', teks: teksAngka(kali, 'kali'), catatan: kondisi },
              { label: 'Target dana darurat', teks: rp(target) },
            ],
          },
          {
            judul: 'Cara mencapainya',
            langkah: [
              { label: 'Sudah terkumpul', teks: rp(terkumpul) },
              { label: 'Kekurangan', teks: rp(kurang) },
              { label: 'Sisihkan per bulan', teks: rp(perBulan), catatan: `Kekurangan dibagi ${jangka} bulan, dibulatkan ke atas.` },
            ],
          },
        ],
        catatan: 'Simpan dana darurat terpisah dari tabungan lain, di produk yang mudah dicairkan dan diawasi OJK, bukan di investasi berisiko.',
      }
    },
  }
  ```

  ```diff
  diff --git a/src/modules/hitung/index.ts b/src/modules/hitung/index.ts
  index 15dac1f..dc15689 100644
  --- a/src/modules/hitung/index.ts
  +++ b/src/modules/hitung/index.ts
  @@ -1,5 +1,7 @@
   import type { ToolId } from '@/lib/konstanta'
   
  +import { cicilanKpr } from './cicilan-kpr'
  +import { danaDarurat } from './dana-darurat'
   import { gajiBersih } from './gaji-bersih'
   import { tengahKalimat } from './format'
   import { bacaMasukan, contohMasukan } from './masukan'
  @@ -22,6 +24,8 @@ import type { DefinisiParameter, Hasil, Kalkulator, Masukan, ParameterTersimpan
   const RUMUS: Partial<Record<ToolId, Rumus>> = {
     'gaji-bersih': gajiBersih,
     thr,
  +  'cicilan-kpr': cicilanKpr,
  +  'dana-darurat': danaDarurat,
   }
   
   const BELUM_TERSEDIA = 'Kalkulator ini belum tersedia.'
  ```

  ```diff
  diff --git a/src/seed/parameter-tools.ts b/src/seed/parameter-tools.ts
  index edcab67..9cd2c34 100644
  --- a/src/seed/parameter-tools.ts
  +++ b/src/seed/parameter-tools.ts
  @@ -139,4 +139,22 @@ export const PARAMETER_GAJI: ParameterAwal[] = [
     { toolId: 'gaji-bersih', kunci: 'jkm', nilai: 0.3, berlakuMulai: '2015-07-01', sumber: SUMBER.bpjsTk },
   ]
   
  -export const PARAMETER_AWAL: ParameterAwal[] = [...PARAMETER_GAJI]
  +export const PARAMETER_DANA_DARURAT: ParameterAwal[] = [
  +  {
  +    toolId: 'dana-darurat',
  +    kunci: 'kelipatan',
  +    berlakuMulai: '2026-01-01',
  +    sumber: {
  +      judul: 'Tidak Ada Kata Terlambat untuk Dana Darurat (OJK, Sikapi Uangmu)',
  +      url: 'https://sikapiuangmu.ojk.go.id/FrontEnd/CMS/Article/20586',
  +    },
  +    catatan: 'Aturan praktis, bukan peraturan. OJK: lajang 6 kali, berkeluarga atau punya tanggungan 9 sampai 12 kali pengeluaran bulanan.',
  +    tabel: [
  +      { label: 'Lajang tanpa tanggungan', nilai: 6 },
  +      { label: 'Menikah tanpa anak', nilai: 9 },
  +      { label: 'Menikah dengan anak atau punya tanggungan', nilai: 12 },
  +    ],
  +  },
  +]
  +
  +export const PARAMETER_AWAL: ParameterAwal[] = [...PARAMETER_GAJI, ...PARAMETER_DANA_DARURAT]
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

  Hasil yang diharapkan: bersih; unit `Test Files 48 passed (48)`, `Tests 321 passed (321)`; integrasi `Test Files 26 passed (26)`, `Tests 76 passed (76)`; E2E `74 passed`.

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/modules/hitung src/seed/parameter-tools.ts tests/unit/hitung-cicilan-darurat.test.ts
  git commit -m "feat(hitung): kalkulator cicilan dan KPR (anuitas, flat) dan dana darurat"
  ```

### Task 5: Kalkulator BMI & Kalori dan IPK, parameter awal semua kalkulator

**Files:**
- Create: `src/modules/hitung/bmi-kalori.ts`, `src/modules/hitung/ipk.ts`
- Modify: `src/modules/hitung/index.ts`, `src/modules/hitung/masukan.ts`, `src/modules/hitung/tipe.ts`, `src/seed/parameter-tools.ts`
- Test: `tests/unit/hitung-bmi-ipk.test.ts`

**Interfaces:**
- Consumes: `Rumus`, `angka` (Task 1); bantuan tes (Task 1).
- Produces:
  - `hitung('bmi-kalori', ...)`: isian `berat` (kg), `tinggi` (cm), `usia` (18 sampai 100 tahun), `jenisKelamin`, `aktivitas` (dari tabel `faktor-aktivitas`); hasil utama IMT dengan kategori, ringkasan energi basal, kebutuhan kalori per hari, dan rentang berat badan normal untuk tinggi itu.
  - `hitung('ipk', ...)`: isian baris `matkul` (kolom `sks` dan `nilai`, maksimal 30 baris), `ipkLama` dan `sksLama` di bagian lanjutan; hasil utama IPK (IPK baru bila digabung), ringkasan jumlah SKS dan angka mutu.
  - `IsianAngka.petunjuk?: string` (contoh di pesan galat untuk isian opsional yang `contoh`-nya kosong).
  - Registri lengkap `RUMUS: Record<ToolId, Rumus>`: keenam `toolId` punya kalkulator.
  - `PARAMETER_BMI` (`kategori-imt`, `faktor-aktivitas`), `PARAMETER_IPK` (`konversi-nilai`), dan `PARAMETER_AWAL` lengkap (22 dokumen) di `src/seed/parameter-tools.ts`.

IMT = berat / tinggi² dibulatkan satu desimal, lalu dicocokkan ke tabel `kategori-imt` dengan batas atas termasuk (klasifikasi IMT dewasa Indonesia dari Kemenkes, dikutip metadata indikator BPS SIRUSA: sangat kurus di bawah 17,0, kurus 17,0 sampai 18,4, normal 18,5 sampai 25,0, gemuk 25,1 sampai 27,0, obesitas di atas 27,0). Kebutuhan kalori = energi basal Mifflin-St Jeor (10 x berat + 6,25 x tinggi - 5 x usia, + 5 untuk laki-laki atau - 161 untuk perempuan; koefisien ilmiah, jadi tetap di kode) x faktor aktivitas dari tabel `faktor-aktivitas` (nilai PAL contoh FAO/WHO/UNU: ringan 1,53, sedang 1,76, berat 2,25). Usia di bawah 18 ditolak, dan bantuan isian menjelaskan bahwa anak dan remaja memakai grafik IMT menurut umur. Catatan hasil menegaskan bahwa ini perkiraan, bukan pengganti tenaga kesehatan.

IPK = jumlah (SKS x bobot nilai huruf) / jumlah SKS, bobot dari tabel `konversi-nilai` (Permendikbud 3/2020 Pasal 26: A 4, B 3, C 2, D 1, E 0; nilai antara A-, B+, B-, C+ mengikuti pola umum kampus). Pilihan nilai huruf di form dibangun dari tabel itu. IPK lama dan SKS lama di bagian lanjutan harus diisi berdua; hasilnya IPK gabungan. Baris yang kedua kolomnya kosong dilewati, galat per sel memakai kunci `sks.2`.

Tes BMI memakai contoh form (60 kg, 165 cm, 25 tahun, perempuan, ringan: IMT 22,0 normal, energi basal 1.345, kebutuhan 2.058 kkal), selisih 166 kkal Mifflin antara laki-laki dan perempuan, dan batas setiap kategori (tinggi 200 cm supaya IMT = berat / 4). Tes IPK memakai contoh form (13 SKS, mutu 46,3: IPK 3,56) dan gabungan dengan IPK 3,40 dari 40 SKS (3,44). Tes terakhir memastikan ke-22 dokumen `PARAMETER_AWAL` lolos `periksaParameter`, jadi seed di Task 6 tidak bisa ditolak validasi CMS.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/hitung-bmi-ipk.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { hitung, periksaParameter, siapkanKalkulator } from '@/modules/hitung'
  import { PARAMETER_AWAL } from '@/seed/parameter-tools'

  import { berhasil, langkah, ringkasan } from './hitung-bantu'

  const HARI_INI = '2026-11-05'

  describe('BMI & Kalori', () => {
    const bmi = (masukan: Record<string, string>) => hitung('bmi-kalori', masukan, HARI_INI, PARAMETER_AWAL)
    const ringan = 'Ringan: kerja duduk, jarang olahraga'

    it('contoh form: 60 kg, 165 cm, 25 tahun, perempuan, aktivitas ringan', () => {
      const k = siapkanKalkulator('bmi-kalori', PARAMETER_AWAL, HARI_INI)
      expect(k.contoh).toEqual({ berat: '60', tinggi: '165', usia: '25', jenisKelamin: 'perempuan', aktivitas: ringan })
      const h = berhasil(hitung('bmi-kalori', k.contoh, HARI_INI, PARAMETER_AWAL))
      // IMT 60 / 1,65^2 = 22,04; energi basal 10 x 60 + 6,25 x 165 - 5 x 25 - 161 = 1.345,25; x 1,53 = 2.058.
      expect(h.utama).toMatchObject({ label: 'IMT kamu', teks: '22,0', keterangan: 'Kategori: normal.' })
      expect(ringkasan(h, 'Energi basal')).toBe(1_345)
      expect(ringkasan(h, 'Kebutuhan kalori per hari')).toBe(2_058)
      expect(h.ringkasan.find((a) => a.label === 'Berat badan normal untuk tinggimu')?.teks).toBe('50,4 sampai 68,1 kg')
    })

    it('Mifflin-St Jeor: laki-laki 166 kkal lebih tinggi dari perempuan dengan data sama', () => {
      const dasar = { berat: '70', tinggi: '175', usia: '30', aktivitas: ringan }
      const pria = ringkasan(berhasil(bmi({ ...dasar, jenisKelamin: 'laki-laki' })), 'Energi basal')
      const wanita = ringkasan(berhasil(bmi({ ...dasar, jenisKelamin: 'perempuan' })), 'Energi basal')
      expect(pria).toBe(1_649)
      expect((pria ?? 0) - (wanita ?? 0)).toBe(166)
    })

    it('batas kategori IMT dewasa Indonesia: batas atas termasuk setelah dibulatkan satu desimal', () => {
      // Tinggi 200 cm: IMT = berat / 4.
      const kategori = (berat: string) => langkah(berhasil(bmi({ berat, tinggi: '200', usia: '30', jenisKelamin: 'perempuan', aktivitas: ringan })), 'Kategori')
      expect(['67,6', '68', '73,6', '74', '100', '100,4', '108', '108,4'].map(kategori)).toEqual([
        'Sangat kurus',
        'Kurus',
        'Kurus',
        'Normal',
        'Normal',
        'Gemuk',
        'Gemuk',
        'Obesitas',
      ])
    })

    it('usia di bawah 18 tahun ditolak dengan penjelasan', () => {
      expect(bmi({ berat: '50', tinggi: '160', usia: '16', jenisKelamin: 'perempuan', aktivitas: ringan })).toEqual({
        ok: false,
        pesan: null,
        galat: { usia: 'Usia paling sedikit 18 tahun.' },
      })
    })
  })

  describe('IPK', () => {
    const ipk = (masukan: Record<string, string | string[]>) => hitung('ipk', masukan, HARI_INI, PARAMETER_AWAL)

    it('rata-rata berbobot SKS: contoh form 13 SKS, mutu 46,3, IPK 3,56', () => {
      const k = siapkanKalkulator('ipk', PARAMETER_AWAL, HARI_INI)
      expect(k.contoh).toEqual({ sks: ['3', '3', '2', '3', '2'], nilai: ['A', 'B+', 'A-', 'B', 'A'], ipkLama: '', sksLama: '' })
      const h = berhasil(hitung('ipk', k.contoh, HARI_INI, PARAMETER_AWAL))
      expect(h.utama).toMatchObject({ label: 'IPK', teks: '3,56', keterangan: 'Dari 13 SKS yang kamu isi.' })
      expect(ringkasan(h, 'Total mutu')).toBe(46.3)
      expect(langkah(h, 'Mata kuliah 2: 3 SKS, nilai B+')).toBe('9,9')
    })

    it('digabung dengan IPK sebelumnya: (3,40 x 40 + 46,3) / 53 = 3,44', () => {
      const h = berhasil(ipk({ sks: ['3', '3', '2', '3', '2'], nilai: ['A', 'B+', 'A-', 'B', 'A'], ipkLama: '3,40', sksLama: '40' }))
      expect(h.utama).toMatchObject({ label: 'IPK baru', teks: '3,44', keterangan: 'Gabungan 53 SKS.' })
      expect(ringkasan(h, 'IP semester ini')).toBe(3.56)
    })

    it('IPK sebelumnya dan SKS sebelumnya harus diisi berdua', () => {
      expect(ipk({ sks: ['3'], nilai: ['A'], ipkLama: '3,4', sksLama: '' })).toEqual({
        ok: false,
        pesan: null,
        galat: { sksLama: 'Isi SKS yang sudah ditempuh, atau kosongkan IPK sebelumnya.' },
      })
      expect(ipk({ sks: ['3'], nilai: ['A'], ipkLama: '4,5', sksLama: '40' })).toMatchObject({ galat: { ipkLama: 'IPK sebelumnya paling banyak 4,00.' } })
      expect(ipk({ sks: ['3'], nilai: ['A'], ipkLama: 'tiga', sksLama: '40' })).toMatchObject({
        galat: { ipkLama: 'Tulis IPK sebelumnya dengan angka, misalnya 3,40. Pakai koma untuk desimal.' },
      })
    })

    it('pilihan nilai huruf dan validasi CMS dari tabel konversi', () => {
      const k = siapkanKalkulator('ipk', PARAMETER_AWAL, HARI_INI)
      const baris = k.isian.find((i) => i.jenis === 'baris')
      expect(baris?.jenis === 'baris' && baris.kolom[1].opsi.map((o) => o.nilai)).toEqual(['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'E'])
      expect(periksaParameter({ toolId: 'ipk', kunci: 'konversi-nilai', tabel: [{ label: 'A' }] })).toEqual({ tabel: 'Baris 1: isi kolom Angka mutu.' })
    })
  })

  describe('semua parameter awal sah', () => {
    it('setiap dokumen seed lolos validasi CMS', () => {
      expect(PARAMETER_AWAL.map((p) => [p.kunci, periksaParameter(p)]).filter(([, g]) => Object.keys(g).length > 0)).toEqual([])
      expect(PARAMETER_AWAL).toHaveLength(22)
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: 9 tes FAIL di `tests/unit/hitung-bmi-ipk.test.ts`; tes contoh form BMI dengan `AssertionError: expected {} to deeply equal { berat: '60', tinggi: '165', …(3) }`, tes Mifflin dan batas kategori dengan `AssertionError: hitung gagal: {"ok":false,"galat":{},"pesan":"Kalkulator ini belum tersedia."}`.

- [ ] **Langkah 3: Petunjuk contoh untuk isian opsional**

  ```diff
  diff --git a/src/modules/hitung/tipe.ts b/src/modules/hitung/tipe.ts
  index ee2f13e..4baa337 100644
  --- a/src/modules/hitung/tipe.ts
  +++ b/src/modules/hitung/tipe.ts
  @@ -42,7 +42,10 @@ export type IsianAngka = IsianDasar & {
     wajib: boolean
     min: number
     maks: number
  +  /** Isi awal form. Kosong untuk isian opsional yang sebaiknya dibiarkan kosong. */
     contoh: string
  +  /** Contoh di pesan galat bila `contoh` kosong. */
  +  petunjuk?: string
   }
   
   export type IsianPilihan = IsianDasar & { jenis: 'pilihan'; opsi: Opsi[]; contoh: string }
  ```

  ```diff
  diff --git a/src/modules/hitung/masukan.ts b/src/modules/hitung/masukan.ts
  index c18626b..4388486 100644
  --- a/src/modules/hitung/masukan.ts
  +++ b/src/modules/hitung/masukan.ts
  @@ -12,26 +12,27 @@ export type NilaiMasukan = Record<string, number | string | boolean | null | num
   type Bacaan = { nilai: number | null; galat?: undefined } | { galat: string; nilai?: undefined }
   
   function bacaAngka(teks: string | undefined, isian: IsianAngka, label = isian.label): Bacaan {
  +  const misal = isian.petunjuk ?? isian.contoh
     const bersih = (teks ?? '')
       .replace(/[\s\u00a0]/g, '')
       .replace(/^rp\.?/i, '')
       .replace(/(%|kg|cm|tahun|bulan|sks|kali)$/i, '')
     if (bersih === '') {
  -    return isian.wajib ? { galat: `${label} belum diisi. Tulis angkanya, misalnya ${isian.contoh}.` } : { nilai: null }
  +    return isian.wajib ? { galat: `${label} belum diisi. Tulis angkanya, misalnya ${misal}.` } : { nilai: null }
     }
     let angka: number
     if (isian.satuan === 'rupiah') {
       if (!/^(\d{1,3}(\.\d{3})+|\d+)(,\d+)?$/.test(bersih)) {
  -      return { galat: `Tulis ${tengahKalimat(label)} dengan angka saja, misalnya ${isian.contoh}.` }
  +      return { galat: `Tulis ${tengahKalimat(label)} dengan angka saja, misalnya ${misal}.` }
       }
       angka = Math.round(Number(bersih.replace(/\./g, '').replace(',', '.')))
     } else if (isian.desimal) {
       if (!/^\d+([.,]\d+)?$/.test(bersih)) {
  -      return { galat: `Tulis ${tengahKalimat(label)} dengan angka, misalnya ${isian.contoh}. Pakai koma untuk desimal.` }
  +      return { galat: `Tulis ${tengahKalimat(label)} dengan angka, misalnya ${misal}. Pakai koma untuk desimal.` }
       }
       angka = Number(bersih.replace(',', '.'))
     } else {
  -    if (!/^\d+$/.test(bersih)) return { galat: `Tulis ${tengahKalimat(label)} dengan angka bulat, misalnya ${isian.contoh}.` }
  +    if (!/^\d+$/.test(bersih)) return { galat: `Tulis ${tengahKalimat(label)} dengan angka bulat, misalnya ${misal}.` }
       angka = Number(bersih)
     }
     if (angka < isian.min) return { galat: `${label} paling sedikit ${teksAngka(isian.min, isian.satuan)}.` }
  ```

- [ ] **Langkah 4: Kalkulator BMI & Kalori dan IPK**

  `src/modules/hitung/bmi-kalori.ts`

  ```ts
  import { angka } from './gaji-bersih'
  import { teksAngka } from './format'
  import type { Rumus } from './rumus'

  /**
   * IMT (berat / tinggi kuadrat) dengan kategori dari tabel parameter (batas atas termasuk, IMT
   * dibulatkan satu desimal), dan kebutuhan kalori: energi basal Mifflin-St Jeor (1990) dikali faktor
   * aktivitas (PAL, FAO/WHO/UNU). Koefisien rumus ada di kode; batas kategori dan faktor di CMS.
   */

  /** Mifflin-St Jeor bentuk sederhana: 10 x berat + 6,25 x tinggi - 5 x usia + 5 (laki-laki) atau - 161 (perempuan). */
  const MIFFLIN = { berat: 10, tinggi: 6.25, usia: 5, lakiLaki: 5, perempuan: -161 }

  const satuDesimal = (n: number) => Math.round(n * 10) / 10

  export const bmiKalori: Rumus = {
    tombol: 'Hitung IMT dan kalori',
    sumber: ['bmi-kalori'],
    parameter: [
      { kunci: 'kategori-imt', label: 'Kategori IMT', jenis: 'tabel', kolom: { label: { judul: 'Kategori' }, batas: { judul: 'IMT sampai', satuan: 'imt' } } },
      { kunci: 'faktor-aktivitas', label: 'Faktor aktivitas', jenis: 'tabel', kolom: { label: { judul: 'Aktivitas' }, nilai: { judul: 'Faktor', satuan: 'angka' } } },
    ],
    isian: (aturan) => {
      const aktivitas = aturan.tabel('faktor-aktivitas').map((b) => ({ nilai: b.label ?? '', label: b.label ?? '' }))
      return [
        { jenis: 'angka', kunci: 'berat', label: 'Berat badan', bantuan: null, satuan: 'kg', desimal: true, wajib: true, min: 20, maks: 300, contoh: '60' },
        { jenis: 'angka', kunci: 'tinggi', label: 'Tinggi badan', bantuan: null, satuan: 'cm', desimal: true, wajib: true, min: 100, maks: 250, contoh: '165' },
        {
          jenis: 'angka',
          kunci: 'usia',
          label: 'Usia',
          bantuan: 'Untuk usia 18 tahun ke atas. Anak dan remaja memakai grafik IMT menurut umur.',
          satuan: 'tahun',
          desimal: false,
          wajib: true,
          min: 18,
          maks: 100,
          contoh: '25',
        },
        {
          jenis: 'pilihan',
          kunci: 'jenisKelamin',
          label: 'Jenis kelamin',
          bantuan: 'Rumus energi basal membedakan laki-laki dan perempuan.',
          opsi: [
            { nilai: 'perempuan', label: 'Perempuan' },
            { nilai: 'laki-laki', label: 'Laki-laki' },
          ],
          contoh: 'perempuan',
        },
        { jenis: 'pilihan', kunci: 'aktivitas', label: 'Aktivitas harian', bantuan: null, opsi: aktivitas, contoh: aktivitas[0]?.nilai ?? '' },
      ]
    },
    hitung(nilai, aturan) {
      const berat = nilai.berat as number
      const tinggi = nilai.tinggi as number
      const usia = nilai.usia as number
      const lakiLaki = nilai.jenisKelamin === 'laki-laki'
      const meter = tinggi / 100

      const imt = satuDesimal(berat / (meter * meter))
      const kategori = aturan.tabel('kategori-imt')
      const indeks = kategori.findIndex((b) => typeof b.batas !== 'number' || imt <= b.batas)
      const label = kategori[indeks]?.label ?? ''
      const normal = kategori.findIndex((b) => b.label?.toLowerCase() === 'normal')
      const bawah = normal > 0 ? (kategori[normal - 1].batas as number) + 0.1 : null
      const atas = normal >= 0 ? kategori[normal].batas : null

      const konstanta = lakiLaki ? MIFFLIN.lakiLaki : MIFFLIN.perempuan
      const basal = MIFFLIN.berat * berat + MIFFLIN.tinggi * tinggi - MIFFLIN.usia * usia + konstanta
      const faktor = aturan.tabel('faktor-aktivitas').find((b) => b.label === nilai.aktivitas)?.nilai ?? 0
      const kalori = Math.round(basal * faktor)

      const rentang =
        bawah !== null && typeof atas === 'number'
          ? [
              {
                label: 'Berat badan normal untuk tinggimu',
                nilai: satuDesimal(bawah * meter * meter),
                satuan: 'kg' as const,
                teks: `${teksAngka(satuDesimal(bawah * meter * meter), 'kg').replace(' kg', '')} sampai ${teksAngka(satuDesimal(atas * meter * meter), 'kg')}`,
              },
            ]
          : []

      return {
        utama: { ...angka('IMT kamu', imt, 'imt'), keterangan: `Kategori: ${label.toLowerCase()}.` },
        ringkasan: [angka('Kebutuhan kalori per hari', kalori, 'kkal'), angka('Energi basal (BMR)', Math.round(basal), 'kkal'), ...rentang],
        rincian: [
          {
            judul: 'Indeks massa tubuh',
            langkah: [
              { label: 'Berat badan', teks: teksAngka(berat, 'kg') },
              { label: 'Tinggi badan', teks: `${teksAngka(meter, 'angka')} m` },
              { label: 'IMT', teks: teksAngka(imt, 'imt'), catatan: `${teksAngka(berat, 'angka')} / (${teksAngka(meter, 'angka')} x ${teksAngka(meter, 'angka')}), satu desimal` },
              { label: 'Kategori', teks: label },
            ],
          },
          {
            judul: 'Kebutuhan kalori',
            langkah: [
              {
                label: 'Energi basal (Mifflin-St Jeor)',
                teks: teksAngka(Math.round(basal), 'kkal'),
                catatan: `10 x ${teksAngka(berat, 'angka')} + 6,25 x ${teksAngka(tinggi, 'angka')} - 5 x ${usia} ${lakiLaki ? '+ 5' : '- 161'}`,
              },
              { label: 'Faktor aktivitas', teks: teksAngka(faktor, 'angka'), catatan: String(nilai.aktivitas) },
              { label: 'Kebutuhan kalori per hari', teks: teksAngka(kalori, 'kkal'), catatan: 'Energi basal x faktor aktivitas' },
            ],
          },
        ],
        catatan:
          'Perkiraan untuk orang dewasa sehat, bukan pengganti pemeriksaan tenaga kesehatan. IMT tidak membedakan otot dan lemak dan tidak dipakai untuk ibu hamil.',
      }
    },
  }
  ```

  `src/modules/hitung/ipk.ts`

  ```ts
  import { angka } from './gaji-bersih'
  import { teksAngka } from './format'
  import type { HasilRumus, Rumus } from './rumus'

  /**
   * IP dan IPK: jumlah SKS x angka mutu dibagi jumlah SKS (Permendikbud 3/2020 Pasal 26). Konversi nilai
   * huruf ke angka ada di tabel parameter karena berbeda antarkampus; hurufnya menjadi pilihan di form.
   */

  const duaDesimal = (n: number) => Math.round(n * 100) / 100

  export const ipk: Rumus = {
    tombol: 'Hitung IPK',
    sumber: ['ipk'],
    parameter: [
      {
        kunci: 'konversi-nilai',
        label: 'Konversi nilai huruf',
        jenis: 'tabel',
        kolom: { label: { judul: 'Huruf' }, nilai: { judul: 'Angka mutu', satuan: 'ipk' } },
      },
    ],
    isian: (aturan) => {
      const huruf = aturan.tabel('konversi-nilai').map((b) => ({ nilai: b.label ?? '', label: b.label ?? '' }))
      return [
        {
          jenis: 'baris',
          kunci: 'matkul',
          label: 'Mata kuliah semester ini',
          bantuan: 'Isi SKS dan nilai huruf setiap mata kuliah. Baris yang kosong dilewati.',
          labelBaris: 'Mata kuliah',
          maks: 30,
          contoh: [
            ['3', 'A'],
            ['3', 'B+'],
            ['2', 'A-'],
            ['3', 'B'],
            ['2', 'A'],
          ],
          kolom: [
            { jenis: 'angka', kunci: 'sks', label: 'SKS', bantuan: null, satuan: 'sks', desimal: false, wajib: true, min: 1, maks: 24, contoh: '3' },
            { jenis: 'pilihan', kunci: 'nilai', label: 'Nilai huruf', bantuan: null, opsi: huruf, contoh: huruf[0]?.nilai ?? '' },
          ],
        },
        {
          jenis: 'angka',
          kunci: 'ipkLama',
          label: 'IPK sebelumnya',
          bantuan: 'Isi bersama SKS yang sudah ditempuh untuk menghitung IPK baru. Kosongkan bila ini semester pertama.',
          lanjutan: true,
          satuan: 'ipk',
          desimal: true,
          wajib: false,
          min: 0,
          maks: 4,
          contoh: '',
          petunjuk: '3,40',
        },
        {
          jenis: 'angka',
          kunci: 'sksLama',
          label: 'SKS yang sudah ditempuh',
          bantuan: null,
          lanjutan: true,
          satuan: 'sks',
          desimal: false,
          wajib: false,
          min: 0,
          maks: 300,
          contoh: '',
          petunjuk: '40',
        },
      ]
    },
    hitung(nilai, aturan): HasilRumus | { galat: Record<string, string> } {
      const sks = nilai.sks as number[]
      const huruf = nilai.nilai as string[]
      const ipkLama = nilai.ipkLama as number | null
      const sksLama = nilai.sksLama as number | null
      if (ipkLama === null && sksLama !== null) return { galat: { ipkLama: 'Isi IPK sebelumnya, atau kosongkan SKS yang sudah ditempuh.' } }
      if (ipkLama !== null && sksLama === null) return { galat: { sksLama: 'Isi SKS yang sudah ditempuh, atau kosongkan IPK sebelumnya.' } }
      const konversi = aturan.tabel('konversi-nilai')
      const bobot = huruf.map((h) => konversi.find((b) => b.label === h)?.nilai ?? 0)
      const mutu = duaDesimal(sks.reduce((jumlah, s, i) => jumlah + s * bobot[i], 0))
      const totalSks = sks.reduce((a, b) => a + b, 0)
      const ip = duaDesimal(mutu / totalSks)
      const lama = ipkLama !== null && sksLama !== null && sksLama > 0
      const mutuLama = lama ? duaDesimal(ipkLama * sksLama) : 0
      const semuaSks = totalSks + (lama ? sksLama : 0)
      const ipkBaru = duaDesimal((mutu + mutuLama) / semuaSks)

      const matkul = sks.map((s, i) => ({
        label: `Mata kuliah ${i + 1}: ${s} SKS, nilai ${huruf[i]}`,
        teks: teksAngka(duaDesimal(s * bobot[i]), 'angka'),
        catatan: `${s} x ${teksAngka(bobot[i], 'ipk')}`,
      }))

      return {
        utama: lama
          ? { ...angka('IPK baru', ipkBaru, 'ipk'), keterangan: `Gabungan ${semuaSks} SKS.` }
          : { ...angka('IPK', ip, 'ipk'), keterangan: `Dari ${totalSks} SKS yang kamu isi.` },
        ringkasan: lama
          ? [angka('IP semester ini', ip, 'ipk'), angka('SKS semester ini', totalSks, 'sks'), angka('Total SKS', semuaSks, 'sks')]
          : [angka('Total SKS', totalSks, 'sks'), angka('Total mutu', mutu, 'angka')],
        rincian: [
          { judul: 'Mutu per mata kuliah', langkah: matkul },
          {
            judul: lama ? 'IP semester ini' : 'IPK',
            langkah: [
              { label: 'Total mutu', teks: teksAngka(mutu, 'angka') },
              { label: 'Total SKS', teks: teksAngka(totalSks, 'sks') },
              { label: lama ? 'IP semester ini' : 'IPK', teks: teksAngka(ip, 'ipk'), catatan: 'Total mutu dibagi total SKS, dua desimal' },
            ],
          },
          ...(lama
            ? [
                {
                  judul: 'IPK baru',
                  langkah: [
                    { label: 'Mutu sebelumnya', teks: teksAngka(mutuLama, 'angka'), catatan: `${teksAngka(ipkLama, 'ipk')} x ${sksLama} SKS` },
                    { label: 'Total mutu', teks: teksAngka(duaDesimal(mutu + mutuLama), 'angka') },
                    { label: 'Total SKS', teks: teksAngka(semuaSks, 'sks') },
                    { label: 'IPK baru', teks: teksAngka(ipkBaru, 'ipk') },
                  ],
                },
              ]
            : []),
        ],
        catatan:
          'Konversi nilai huruf ke angka berbeda antarkampus, begitu juga pembulatannya. Cek peraturan akademik kampusmu sebelum memakai angka ini untuk syarat beasiswa atau kelulusan.',
      }
    },
  }
  ```

  ```diff
  diff --git a/src/modules/hitung/index.ts b/src/modules/hitung/index.ts
  index dc15689..17b2ab4 100644
  --- a/src/modules/hitung/index.ts
  +++ b/src/modules/hitung/index.ts
  @@ -1,8 +1,10 @@
   import type { ToolId } from '@/lib/konstanta'
   
  +import { bmiKalori } from './bmi-kalori'
   import { cicilanKpr } from './cicilan-kpr'
   import { danaDarurat } from './dana-darurat'
   import { gajiBersih } from './gaji-bersih'
  +import { ipk } from './ipk'
   import { tengahKalimat } from './format'
   import { bacaMasukan, contohMasukan } from './masukan'
   import { buatAturan, ParameterKosong, periksaDokumen, type GalatParameter } from './parameter'
  @@ -21,11 +23,13 @@ import type { DefinisiParameter, Hasil, Kalkulator, Masukan, ParameterTersimpan
    * - `sumberParameter` untuk pemuat data: kalkulator mana saja yang dokumen parameternya dibaca.
    */
   
  -const RUMUS: Partial<Record<ToolId, Rumus>> = {
  +const RUMUS: Record<ToolId, Rumus> = {
     'gaji-bersih': gajiBersih,
     thr,
     'cicilan-kpr': cicilanKpr,
     'dana-darurat': danaDarurat,
  +  'bmi-kalori': bmiKalori,
  +  ipk,
   }
   
   const BELUM_TERSEDIA = 'Kalkulator ini belum tersedia.'
  ```

- [ ] **Langkah 5: Parameter awal BMI dan IPK**

  ```diff
  diff --git a/src/seed/parameter-tools.ts b/src/seed/parameter-tools.ts
  index 9cd2c34..0355464 100644
  --- a/src/seed/parameter-tools.ts
  +++ b/src/seed/parameter-tools.ts
  @@ -157,4 +157,59 @@ export const PARAMETER_DANA_DARURAT: ParameterAwal[] = [
     },
   ]
   
  -export const PARAMETER_AWAL: ParameterAwal[] = [...PARAMETER_GAJI, ...PARAMETER_DANA_DARURAT]
  +export const PARAMETER_BMI: ParameterAwal[] = [
  +  {
  +    toolId: 'bmi-kalori',
  +    kunci: 'kategori-imt',
  +    berlakuMulai: '2026-01-01',
  +    sumber: { judul: 'Metadata indikator Indeks Massa Tubuh (BPS SIRUSA)', url: 'https://sirusa.web.bps.go.id/metadata/indikator/21524' },
  +    catatan:
  +      'Klasifikasi IMT dewasa Indonesia (Kemenkes): batas atas termasuk, IMT dibulatkan satu desimal. WHO memakai 25 untuk berat badan lebih dan 30 untuk obesitas. Label Normal dipakai untuk rentang berat normal.',
  +    tabel: [
  +      { label: 'Sangat kurus', batas: 16.9 },
  +      { label: 'Kurus', batas: 18.4 },
  +      { label: 'Normal', batas: 25 },
  +      { label: 'Gemuk', batas: 27 },
  +      { label: 'Obesitas', batas: null },
  +    ],
  +  },
  +  {
  +    toolId: 'bmi-kalori',
  +    kunci: 'faktor-aktivitas',
  +    berlakuMulai: '2026-01-01',
  +    sumber: { judul: 'Human Energy Requirements, FAO/WHO/UNU Expert Consultation, bab 5', url: 'https://www.fao.org/4/Y5686e/y5686e07.htm' },
  +    catatan: 'Nilai PAL contoh FAO untuk gaya hidup ringan (1,40 sampai 1,69), sedang (1,70 sampai 1,99), dan berat (2,00 sampai 2,40).',
  +    tabel: [
  +      { label: 'Ringan: kerja duduk, jarang olahraga', nilai: 1.53 },
  +      { label: 'Sedang: kerja tidak berat, olahraga sekitar satu jam sehari', nilai: 1.76 },
  +      { label: 'Berat: kerja fisik berat atau olahraga berat sekitar dua jam sehari', nilai: 2.25 },
  +    ],
  +  },
  +]
  +
  +export const PARAMETER_IPK: ParameterAwal[] = [
  +  {
  +    toolId: 'ipk',
  +    kunci: 'konversi-nilai',
  +    berlakuMulai: '2026-01-01',
  +    sumber: {
  +      judul: 'Permendikbud 3 Tahun 2020 Pasal 26 (LLDIKTI Wilayah III)',
  +      url: 'https://lldikti3.kemdiktisaintek.go.id/wp-content/uploads/2024/07/Permendikbud-No.-3-Tahun-2020-Standar-Nasional-Pendidikan-Tinggi.pdf',
  +    },
  +    catatan:
  +      'A = 4 sampai E = 0 dari Permendikbud 3/2020; Permendiktisaintek 39/2025 tetap membolehkan nilai antara. Nilai antara di sini pola yang umum, sesuaikan dengan kampus.',
  +    tabel: [
  +      { label: 'A', nilai: 4 },
  +      { label: 'A-', nilai: 3.7 },
  +      { label: 'B+', nilai: 3.3 },
  +      { label: 'B', nilai: 3 },
  +      { label: 'B-', nilai: 2.7 },
  +      { label: 'C+', nilai: 2.3 },
  +      { label: 'C', nilai: 2 },
  +      { label: 'D', nilai: 1 },
  +      { label: 'E', nilai: 0 },
  +    ],
  +  },
  +]
  +
  +export const PARAMETER_AWAL: ParameterAwal[] = [...PARAMETER_GAJI, ...PARAMETER_DANA_DARURAT, ...PARAMETER_BMI, ...PARAMETER_IPK]
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

  Hasil yang diharapkan: bersih; unit `Test Files 49 passed (49)`, `Tests 330 passed (330)`; integrasi `Test Files 26 passed (26)`, `Tests 76 passed (76)`; E2E `74 passed`.

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/modules/hitung src/seed/parameter-tools.ts tests/unit/hitung-bmi-ipk.test.ts
  git commit -m "feat(hitung): kalkulator BMI dan kebutuhan kalori, IPK, dan parameter awal semua kalkulator"
  ```

### Task 6: Seed enam kalkulator draf dengan penjelasan, FAQ, sumber aturan, dan parameter

**Files:**
- Create: `src/seed/tools.ts`
- Modify: `src/seed/seed.ts`, `src/seed/run.ts`, `tests/int/tools.int.spec.ts`, `tests/e2e/siapkan.ts`
- Test: `tests/int/seed.int.spec.ts`

**Interfaces:**
- Consumes: `siapkanKalkulator` (isian untuk bantuan awal), `PARAMETER_AWAL` (Task 1 sampai 5), `PILAR_AWAL` dan `seed` (Rencana 1), field koleksi `tools` (Rencana 1: `penjelasan` Lexical, `faq`, `sumberAturan`, `bantuanInput`, `seo`).
- Produces:
  - `src/seed/tools.ts`: `TOOLS_AWAL` (6 tools: nama, toolId, slug pilar, ringkasan, penjelasan, FAQ, sumber aturan, SEO), `seedTools(payload): Promise<{ tools: number; parameter: number }>` (jumlah dokumen baru).
  - `HasilSeed` kini `{ admin; pilar; halaman; tools; parameter }`; `npm run seed` mencetak jumlah tools dan parameter baru.
  - Database E2E: keenam tools dari seed (dengan parameternya); Gaji Bersih, THR, dan BMI & Kalori diterbitkan, sisanya draf (Task 8 menerbitkan semuanya).

`npm run seed` kini mengisi enam kalkulator sebagai **draf** dan 22 dokumen parameter. Pemilik memeriksa, melengkapi, lalu menerbitkan tools dari admin; tidak ada kalkulator yang terbit otomatis. Setiap tools berisi ringkasan, penjelasan rumus berupa artikel Lexical (H2 rumus, aturan yang dipakai, "Contoh hitung" dengan angka nyata, dan batasan kalkulator), 2 sampai 3 FAQ, sumber aturan (judul, URL, penerbit, diakses 5 November 2026), SEO (judul dan deskripsi), dan label serta bantuan isian awal yang diambil dari isian modul `hitung` (`bantuanInput`, per kunci isian termasuk kolom baris IPK), jadi editor bisa mengganti teks form tanpa kode. Pilar: Gaji Bersih, THR, Cicilan & KPR, dan Dana Darurat di Uang & Karier; BMI & Kalori di Sehat; IPK di Belajar.

Seed tidak menimpa apa pun: tools dicari per `toolId` (termasuk draf), parameter per `toolId` + `kunci` + `berlakuMulai`. Pilar dicari lewat `slug` (bukan `limit` tertentu): database tes yang dipakai bersama tes lain bisa berisi ratusan pilar, dan probe menemukan pilar seed terlewat saat dicari dengan `limit: 100`.

Semua teks seed mengikuti aturan copy (sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru). Penjelasan rumus di seed adalah titik awal sekitar 230 sampai 590 kata per tools; spesifikasi §3 meminta 600 sampai 1.200 kata, jadi pemilik melengkapinya sebelum terbit (lihat Risiko).

`tests/e2e/siapkan.ts` kini menghapus `parameter-tools` sebelum seed dan tidak lagi membuat tools sendiri; tiga tools seed diterbitkan supaya tes `/tools` dan beranda Rencana 4B tetap sama. `tools.int.spec.ts` menghapus tools `gaji-bersih` lama dulu, karena tes seed kini membuat tools dengan slug yang sama.

- [ ] **Langkah 1: Tulis tes yang gagal**

  ```diff
  diff --git a/tests/int/seed.int.spec.ts b/tests/int/seed.int.spec.ts
  index 95af266..502e9a6 100644
  --- a/tests/int/seed.int.spec.ts
  +++ b/tests/int/seed.int.spec.ts
  @@ -1,6 +1,8 @@
   import { describe, expect, it } from 'vitest'
   
  +import { PARAMETER_AWAL } from '@/seed/parameter-tools'
   import { PILAR_AWAL, seed } from '@/seed/seed'
  +import { TOOLS_AWAL } from '@/seed/tools'
   
   import { getTestPayload } from './helpers'
   
  @@ -39,4 +41,40 @@ describe('seed', () => {
       const beranda = await payload.findGlobal({ slug: 'beranda' })
       expect(beranda.tataLetak?.[0]?.blockType).toBe('heroBeranda')
     })
  +
  +  it('membuat enam tools draf dan parameternya sekali saja', async () => {
  +    const payload = await getTestPayload()
  +    // Tes lain membuat dan menghapus tools dengan toolId yang sama, jadi seed diulang dari keadaan bersih.
  +    await payload.delete({ collection: 'tools', where: { toolId: { in: TOOLS_AWAL.map((t) => t.toolId) } } })
  +    await payload.delete({ collection: 'parameter-tools', where: { id: { exists: true } } })
  +
  +    const pertama = await seed(payload)
  +    expect([pertama.tools, pertama.parameter]).toEqual([6, PARAMETER_AWAL.length])
  +    const kedua = await seed(payload)
  +    expect([kedua.tools, kedua.parameter]).toEqual([0, 0])
  +
  +    const { docs } = await payload.find({ collection: 'tools', draft: true, depth: 1, sort: 'slug', limit: 10 })
  +    expect(docs.map((d) => [d.slug, d._status, typeof d.pilar === 'object' ? d.pilar.slug : null])).toEqual([
  +      ['bmi-kalori', 'draft', 'sehat'],
  +      ['cicilan-kpr', 'draft', 'uang-karier'],
  +      ['dana-darurat', 'draft', 'uang-karier'],
  +      ['gaji-bersih', 'draft', 'uang-karier'],
  +      ['ipk', 'draft', 'belajar'],
  +      ['thr', 'draft', 'uang-karier'],
  +    ])
  +    const gaji = docs.find((d) => d.slug === 'gaji-bersih')
  +    expect(gaji?.bantuanInput?.map((b) => b.kunci)).toEqual(['gaji', 'status', 'tunjanganLain', 'bpjsKesehatan', 'bpjsKetenagakerjaan', 'iuranLain'])
  +    expect(gaji?.sumberAturan?.[0]?.url).toBe('https://www.pajak.go.id/sites/default/files/lampiran/Lampiran%20PP58TAHUN2023.pdf')
  +    expect(gaji?.seo?.judulSEO).toBe('Kalkulator Gaji Bersih 2026 dengan PPh 21 TER dan BPJS')
  +    const ipk = docs.find((d) => d.slug === 'ipk')
  +    expect(ipk?.bantuanInput?.map((b) => b.kunci)).toEqual(['matkul', 'sks', 'nilai', 'ipkLama', 'sksLama'])
  +
  +    const terA = await payload.find({ collection: 'parameter-tools', where: { kunci: { equals: 'ter-a' } }, limit: 1 })
  +    expect(terA.docs[0]?.tabel).toHaveLength(44)
  +    const jp = await payload.find({ collection: 'parameter-tools', where: { kunci: { equals: 'jp-batas' } }, sort: 'berlakuMulai' })
  +    expect(jp.docs.map((d) => [d.nilai, d.berlakuMulai.slice(0, 10)])).toEqual([
  +      [10_547_400, '2025-03-01'],
  +      [11_086_300, '2026-03-01'],
  +    ])
  +  })
   })
  ```

  ```diff
  diff --git a/tests/int/tools.int.spec.ts b/tests/int/tools.int.spec.ts
  index d95438f..c10e18e 100644
  --- a/tests/int/tools.int.spec.ts
  +++ b/tests/int/tools.int.spec.ts
  @@ -5,6 +5,8 @@ import { getTestPayload, pesanGalat, unik } from './helpers'
   describe('tools dan parameter', () => {
     it('menyimpan tools sebagai draf lalu menerbitkannya', async () => {
       const payload = await getTestPayload()
  +    // `toolId` unik: tools Gaji Bersih dari seed atau sisa tes sebelumnya dibersihkan dulu.
  +    await payload.delete({ collection: 'tools', where: { toolId: { equals: 'gaji-bersih' } } })
       const pilar = await payload.create({
         collection: 'pilar',
         data: { nama: unik('Uang'), warna: 'hijau', deskripsi: 'Uang.' },
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:int
  ```

  Hasil yang diharapkan: FAIL di `tests/int/seed.int.spec.ts` dengan `Error: Cannot find package '@/seed/tools'`.

- [ ] **Langkah 3: Enam tools draf dan seed parameter**

  `src/seed/tools.ts`

  ```ts
  import type { Payload } from 'payload'

  import type { ToolId } from '@/lib/konstanta'
  import type { IsiLexical } from '@/lib/lexical'
  import { siapkanKalkulator, type Isian } from '@/modules/hitung'
  import type { Tool } from '@/payload-types'

  import { PARAMETER_AWAL } from './parameter-tools'

  /**
   * Enam kalkulator MVP (spesifikasi §3) sebagai draf: ringkasan, bantuan input, penjelasan rumus,
   * contoh hitung, FAQ, dan sumber aturan yang sudah diverifikasi 5 November 2026. Pemilik membaca
   * ulang lalu menerbitkannya dari admin. Angka contoh sama dengan hasil kalkulator untuk isi form awal.
   */

  type Node = IsiLexical['root']['children'][number]

  const teks = (text: string): Node => ({ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 })
  const dasar = { format: '', indent: 0, version: 1, direction: 'ltr' }
  const p = (isi: string): Node => ({ type: 'paragraph', ...dasar, textFormat: 0, textStyle: '', children: [teks(isi)] })
  const h2 = (judul: string): Node => ({ type: 'heading', tag: 'h2', ...dasar, children: [teks(judul)] })
  const daftar = (butir: string[], urut = false): Node => ({
    type: 'list',
    listType: urut ? 'number' : 'bullet',
    start: 1,
    tag: urut ? 'ol' : 'ul',
    ...dasar,
    children: butir.map((b, i) => ({ type: 'listitem', value: i + 1, ...dasar, children: [teks(b)] })),
  })
  const isi = (...children: Node[]): IsiLexical => ({ root: { type: 'root', ...dasar, direction: 'ltr', format: '', children } })

  const DIAKSES = '2026-11-05T00:00:00.000Z'

  type Sumber = NonNullable<Tool['sumberAturan']>[number]
  const sumber = (judul: string, url: string, penerbit: string): Sumber => ({ judul, url, penerbit, diaksesPada: DIAKSES })

  const S = {
    ter: sumber('Lampiran PP 58 Tahun 2023: tarif efektif PPh Pasal 21', 'https://www.pajak.go.id/sites/default/files/lampiran/Lampiran%20PP58TAHUN2023.pdf', 'DJP'),
    leaflet: sumber('Leaflet PPh 21 dengan tarif efektif rata-rata', 'https://pajak.go.id/sites/default/files/2024-02/Leaflet%20PPh%2021%20TER.pdf', 'DJP'),
    pmk168: sumber('PMK 168 Tahun 2023 tentang pemotongan pajak atas penghasilan', 'https://peraturan.go.id/files/permenkeu-no-168-tahun-2023.pdf', 'Kementerian Keuangan'),
    ptkp: sumber('Penghasilan Tidak Kena Pajak', 'https://pajak.go.id/penghasilan-tidak-kena-pajak', 'DJP'),
    pasal17: sumber('Memotret Keberpihakan UU HPP pada Rakyat Kecil', 'https://www.pajak.go.id/id/artikel/memotret-keberpihakan-uu-hpp-pada-rakyat-kecil', 'DJP'),
    perpres64: sumber(
      'Perpres 64 Tahun 2020 tentang Jaminan Kesehatan',
      'https://jdih.kemenkeu.go.id/download/179608f7-a2a0-41c0-aaec-e7d60eb36054/64TAHUN2020PERPRES.pdf',
      'JDIH Kementerian Keuangan',
    ),
    iuranTk: sumber(
      'Berapa Besaran Iuran JHT, JKK, JKM, JP dan JKP?',
      'https://www.bpjsketenagakerjaan.go.id/artikel/18913/artikel-berapa-besaran-iuran-jht,-jkk,-jkm,-jp-dan-jkp',
      'BPJS Ketenagakerjaan',
    ),
    jp2026: sumber(
      'Surat B/1226/022026: Ketentuan Batas Upah dan Manfaat Jaminan Pensiun Tahun 2026',
      'https://494075.fs1.hubspotusercontent-na1.net/hubfs/494075/compliance-portal/notification-number-b1226022026.pdf',
      'BPJS Ketenagakerjaan',
    ),
    permenaker6: sumber('Permenaker Nomor 6 Tahun 2016 tentang THR Keagamaan', 'https://peraturan.bpk.go.id/Download/252116/Kemnaker%20No.%206%20Tahun%202016.pdf', 'JDIH BPK'),
    seThr: sumber(
      'Surat Edaran Menaker Nomor M/3/HK.04.00/III/2026',
      'https://jdih.kemnaker.go.id/peraturan/detail/2983/surat-edaran-menteri-nomor-m-3-hk-04-00-iii-2026',
      'Kementerian Ketenagakerjaan',
    ),
    setneg: sumber(
      'Terbitkan Edaran THR Keagamaan 2026, Menaker: Harus Dibayar Penuh, Tak Boleh Dicicil',
      'https://www.setneg.go.id/baca/index/terbitkan_edaran_thr_keagamaan_2026_menaker_harus_dibayar_penuh_tak_boleh_dicicil',
      'Kementerian Sekretariat Negara',
    ),
    indonesiabaik: sumber('Yuk Hitung, Kamu Bakal Dapat THR Lebaran Berapa?', 'https://indonesiabaik.id/infografis/yuk-hitung-kamu-bakal-dapat-thr-lebaran-berapa', 'Indonesiabaik.id'),
    djpThr: sumber('DJP Jelaskan Soal PPh 21 untuk THR dengan Skema TER', 'https://ikpi.or.id/djp-jelaskan-soal-pph-21-untuk-thr-dengan-skema-ter/', 'IKPI'),
    kompasAnuitas: sumber(
      'Bunga Anuitas: Pengertian, Contoh, dan Cara Hitung',
      'https://money.kompas.com/read/2021/09/30/183144426/bunga-anuitas-pengertian-contoh-dan-cara-hitung?page=all',
      'Kompas.com',
    ),
    ojkDarurat: sumber('Tidak Ada Kata Terlambat untuk Dana Darurat', 'https://sikapiuangmu.ojk.go.id/FrontEnd/CMS/Article/20586', 'OJK, Sikapi Uangmu'),
    bps: sumber('Metadata indikator Indeks Massa Tubuh (IMT)', 'https://sirusa.web.bps.go.id/metadata/indikator/21524', 'BPS'),
    who: sumber('BMI among adults', 'https://www.who.int/data/gho/data/themes/topics/indicator-groups/indicator-group-details/GHO/bmi-among-adults', 'WHO'),
    mifflin: sumber(
      'A new predictive equation for resting energy expenditure in healthy individuals (Mifflin dkk., 1990)',
      'https://agris.fao.org/search/ar/records/65de26fe7c7033e84be9ee76',
      'American Journal of Clinical Nutrition',
    ),
    fao: sumber('Human Energy Requirements, bab 5', 'https://www.fao.org/4/Y5686e/y5686e07.htm', 'FAO, WHO, UNU'),
    sndikti: sumber(
      'Permendikbud Nomor 3 Tahun 2020 tentang Standar Nasional Pendidikan Tinggi',
      'https://lldikti3.kemdiktisaintek.go.id/wp-content/uploads/2024/07/Permendikbud-No.-3-Tahun-2020-Standar-Nasional-Pendidikan-Tinggi.pdf',
      'LLDIKTI Wilayah III',
    ),
    permen39: sumber(
      'Materi Permendiktisaintek Nomor 39 Tahun 2025 tentang Penjaminan Mutu Pendidikan Tinggi',
      'https://lldikti6.id/wp-content/uploads/2025/11/01.-MATERI-1-SNDIKTI-Permen-39-2025.pdf',
      'LLDIKTI Wilayah VI',
    ),
    ugm: sumber('Grading System', 'https://admission.ugm.ac.id/wp-content/uploads/sites/330/2025/04/Grading-System.pdf', 'Universitas Gadjah Mada'),
  }

  type ToolAwal = {
    toolId: ToolId
    nama: string
    pilar: string
    ringkasan: string
    penjelasan: IsiLexical
    faq: { pertanyaan: string; jawaban: string }[]
    sumberAturan: Sumber[]
    seo: { keyphrase: string; judulSEO: string; metaDeskripsi: string }
  }

  export const TOOLS_AWAL: ToolAwal[] = [
    {
      toolId: 'gaji-bersih',
      nama: 'Gaji Bersih',
      pilar: 'uang-karier',
      ringkasan: 'Hitung gaji yang masuk rekening setelah PPh 21 dan iuran BPJS, lengkap dengan potongan di bulan Desember.',
      penjelasan: isi(
        h2('Rumus gaji bersih'),
        p(
          'Gaji bersih adalah gaji pokok dan tunjangan dikurangi PPh 21 dan iuran yang dipotong dari gajimu. Kalkulator ini menghitungnya untuk pegawai tetap dengan aturan yang berlaku pada tanggal kamu menghitung.',
        ),
        daftar([
          'Gaji bersih per bulan = gaji pokok + tunjangan tetap + tunjangan tidak tetap - PPh 21 bulanan - iuran BPJS bagian karyawan - iuran pensiun lain atau zakat.',
          'PPh 21 Januari sampai November = tarif efektif bulanan (TER) x penghasilan bruto sebulan.',
          'PPh 21 Desember = PPh 21 setahun dengan tarif Pasal 17 - PPh 21 yang sudah dipotong Januari sampai November.',
        ]),
        h2('Apa saja yang masuk penghasilan bruto'),
        p(
          'Sejak 2024, PPh 21 bulanan pegawai tetap dihitung dengan TER sesuai PP 58 Tahun 2023 dan PMK 168 Tahun 2023. Penghasilan bruto bukan hanya gaji: premi Jaminan Kecelakaan Kerja (JKK), Jaminan Kematian (JKM), dan iuran BPJS Kesehatan yang dibayar kantor ikut dihitung. Iuran Jaminan Hari Tua dan Jaminan Pensiun bagian kantor tidak ikut.',
        ),
        p(
          'Kategori TER mengikuti status PTKP: kategori A untuk TK/0, TK/1, dan K/0; kategori B untuk TK/2, TK/3, K/1, dan K/2; kategori C untuk K/3. Setiap kategori punya tabel tarif dari 0% sampai 34% menurut besar penghasilan bruto sebulan.',
        ),
        h2('Iuran yang dipotong dari gajimu'),
        daftar([
          'BPJS Kesehatan 1% dari gaji, dengan batas upah Rp12.000.000 sebulan. Kantor menambah 4%.',
          'Jaminan Hari Tua (JHT) 2% dari gaji. Kantor menambah 3,7%.',
          'Jaminan Pensiun (JP) 1% dari gaji, dengan batas upah Rp11.086.300 sebulan mulai Maret 2026. Kantor menambah 2%.',
        ]),
        p('Premi JKK (0,24% untuk pekerjaan berisiko sangat rendah) dan JKM (0,3%) dibayar penuh oleh kantor.'),
        h2('Kenapa gaji Desember berbeda'),
        p(
          'TER hanya cara memotong pajak setiap bulan. Di masa pajak terakhir, kantor menghitung ulang pajak setahun: penghasilan bruto setahun dikurangi biaya jabatan 5% (paling banyak Rp6.000.000 setahun) serta iuran JHT dan JP yang kamu bayar, lalu dikurangi PTKP. Hasilnya, penghasilan kena pajak, dibulatkan ke bawah ke ribuan penuh dan dikenai tarif Pasal 17: 5% sampai Rp60 juta, 15% sampai Rp250 juta, 25% sampai Rp500 juta, 30% sampai Rp5 miliar, dan 35% di atasnya.',
        ),
        p('PPh 21 Desember adalah selisih pajak setahun dengan yang sudah dipotong. Bila hasilnya minus, kelebihan potong itu dikembalikan kantor.'),
        h2('Contoh hitung'),
        p('Gaji Rp8.000.000 sebulan, status TK/0, ikut BPJS Kesehatan dan BPJS Ketenagakerjaan:'),
        daftar(
          [
            'Penghasilan bruto: Rp8.000.000 + JKK Rp19.200 + JKM Rp24.000 + BPJS Kesehatan dari kantor Rp320.000 = Rp8.363.200.',
            'TER kategori A untuk bruto di atas Rp7.500.000 sampai Rp8.550.000 adalah 1,5%, jadi PPh 21 sebulan Rp125.448.',
            'Iuran yang dipotong: BPJS Kesehatan Rp80.000, JHT Rp160.000, dan JP Rp80.000, total Rp320.000.',
            'Gaji bersih Januari sampai November: Rp8.000.000 - Rp125.448 - Rp320.000 = Rp7.554.552.',
            'Desember: penghasilan kena pajak setahun Rp38.460.000, PPh 21 setahun Rp1.923.000, sudah dipotong Rp1.379.928, jadi PPh 21 Desember Rp543.072 dan gaji bersih Desember Rp7.136.928.',
          ],
          true,
        ),
        p(
          'Contoh resmi DJP untuk pegawai berstatus K/0 dengan gaji Rp15.000.000 dan iuran pensiun Rp150.000 sebulan menghasilkan PPh 21 Rp900.000 sebulan (TER 6%) dan Rp1.155.000 di bulan Desember. Kamu bisa mencobanya: matikan kedua pilihan BPJS dan isi iuran pensiun lain Rp150.000.',
        ),
        h2('Batasan kalkulator'),
        daftar([
          'Untuk pegawai tetap dengan gaji yang sama setiap bulan. Bonus, lembur, dan THR menaikkan PPh 21 di bulan diterimanya.',
          'Premi JKK memakai tingkat risiko sangat rendah. Bila tempat kerjamu berisiko lebih tinggi, tarif JKK 0,54% sampai 1,74% dan penghasilan brutomu sedikit lebih besar.',
          'Pegawai di industri alas kaki, tekstil dan pakaian jadi, furnitur, kulit dan barang dari kulit, serta pariwisata yang penghasilan brutonya paling banyak Rp10 juta sebulan bisa mendapat PPh 21 ditanggung pemerintah selama 2026 (PMK 105 Tahun 2025). Kalkulator ini menghitung PPh 21 sebelum insentif itu.',
          'Angka di sini perkiraan. Slip gajimu bisa berbeda karena komponen lain, misalnya potongan koperasi.',
        ]),
      ),
      faq: [
        {
          pertanyaan: 'Kenapa potongan PPh 21 di slip gajiku berbeda dengan hitungan ini?',
          jawaban:
            'Kantor menghitung dari semua komponen gaji bulan itu, termasuk lembur, bonus, dan tunjangan tidak tetap, serta tarif JKK sesuai risiko tempat kerja. Cocokkan setiap komponen di slip gajimu dengan isian kalkulator.',
        },
        {
          pertanyaan: 'Apakah iuran BPJS mengurangi pajak?',
          jawaban:
            'Iuran JHT dan JP yang dipotong dari gajimu mengurangi penghasilan neto saat pajak setahun dihitung di bulan Desember. Iuran BPJS Kesehatan bagian karyawan tidak mengurangi pajak.',
        },
        {
          pertanyaan: 'Apa beda TK/0 dan K/0?',
          jawaban:
            'TK berarti tidak kawin dan K berarti kawin. Angka di belakangnya jumlah tanggungan keluarga, paling banyak 3. PTKP TK/0 Rp54.000.000 setahun, dan setiap status kawin atau tanggungan menambah Rp4.500.000.',
        },
      ],
      sumberAturan: [S.ter, S.leaflet, S.pmk168, S.ptkp, S.pasal17, S.perpres64, S.iuranTk, S.jp2026],
      seo: {
        keyphrase: 'kalkulator gaji bersih',
        judulSEO: 'Kalkulator Gaji Bersih 2026 dengan PPh 21 TER dan BPJS',
        metaDeskripsi:
          'Hitung gaji bersih setelah PPh 21 TER dan iuran BPJS 2026, termasuk potongan di bulan Desember. Lengkap dengan rumus, contoh hitung, dan sumber aturan resmi.',
      },
    },
    {
      toolId: 'thr',
      nama: 'THR',
      pilar: 'uang-karier',
      ringkasan: 'Hitung THR keagamaan sesuai masa kerja, termasuk THR proporsional dan tambahan PPh 21 di bulan THR.',
      penjelasan: isi(
        h2('Rumus THR'),
        p(
          'Tunjangan hari raya (THR) keagamaan wajib dibayar kantor kepada pekerja yang sudah bekerja 1 bulan terus-menerus atau lebih, baik dengan perjanjian kerja waktu tidak tertentu maupun waktu tertentu (kontrak). Besarnya diatur Permenaker Nomor 6 Tahun 2016 dan ditegaskan lagi dalam Surat Edaran Menteri Ketenagakerjaan Nomor M/3/HK.04.00/III/2026.',
        ),
        daftar([
          'Masa kerja 12 bulan atau lebih: THR = 1 bulan upah.',
          'Masa kerja 1 bulan sampai kurang dari 12 bulan: THR = masa kerja (bulan) / 12 x 1 bulan upah.',
          'Masa kerja kurang dari 1 bulan: belum berhak THR.',
        ]),
        h2('Upah yang dipakai'),
        p(
          'Upah 1 bulan adalah upah tanpa tunjangan (upah bersih) atau upah pokok ditambah tunjangan tetap. Untuk pekerja harian lepas dengan masa kerja 12 bulan atau lebih, upah sebulan adalah rata-rata upah 12 bulan terakhir sebelum hari raya; bila kurang dari 12 bulan, rata-rata upah setiap bulan selama masa kerja.',
        ),
        p('Bila perjanjian kerja, peraturan perusahaan, perjanjian kerja bersama, atau kebiasaan di kantormu memberi THR lebih besar, yang berlaku adalah yang lebih besar.'),
        h2('Kapan THR dibayar'),
        p('THR wajib dibayar paling lambat 7 hari sebelum hari raya keagamaan. Surat edaran 2026 menegaskan THR dibayar penuh dan tidak boleh dicicil.'),
        h2('PPh 21 atas THR'),
        p(
          'THR adalah penghasilan, jadi ikut dipotong PPh 21. Di bulan THR dibayar, kantor menjumlahkan gaji dan THR, lalu memakai tarif efektif bulanan (TER) untuk jumlah itu. Karena brutonya lebih besar, tarifnya ikut naik. Contoh dari DJP: pegawai TK/0 dengan bruto Rp6.500.000 dipotong 1% di bulan biasa; di bulan THR brutonya Rp13.000.000 sehingga tarifnya 5%.',
        ),
        p('Potongan yang lebih besar itu bukan pajak baru. Di bulan Desember pajak setahun dihitung ulang dengan tarif Pasal 17, jadi beban pajak setahunmu tidak bertambah karena cara potong ini.'),
        h2('Contoh hitung'),
        daftar(
          [
            'Upah Rp6.500.000, masa kerja 12 bulan: THR Rp6.500.000.',
            'Upah Rp5.000.000, masa kerja 6 bulan: THR 6/12 x Rp5.000.000 = Rp2.500.000.',
            'PPh 21 untuk status TK/0 yang ikut BPJS: bruto bulan biasa Rp6.795.100 dipotong 1,25% atau Rp84.938. Di bulan THR brutonya Rp13.295.100 dan dipotong 5% atau Rp664.755. Tambahan potongannya Rp579.817, jadi THR yang kamu terima sekitar Rp5.920.183.',
          ],
          true,
        ),
        h2('Batasan kalkulator'),
        daftar([
          'Masa kerja dihitung dalam bulan penuh sampai hari raya.',
          'Perkiraan PPh 21 memakai gaji bulanan yang sama dengan upah THR. Bila bulan itu ada lembur atau bonus, potongannya lebih besar.',
        ]),
      ),
      faq: [
        {
          pertanyaan: 'Apakah pekerja kontrak berhak THR?',
          jawaban: 'Berhak. Permenaker 6/2016 berlaku untuk pekerja dengan perjanjian kerja waktu tidak tertentu maupun waktu tertentu, asalkan masa kerjanya sudah 1 bulan atau lebih.',
        },
        { pertanyaan: 'Apakah THR boleh dicicil?', jawaban: 'Tidak. Surat Edaran Menaker 2026 menegaskan THR dibayar penuh, paling lambat 7 hari sebelum hari raya.' },
        {
          pertanyaan: 'Kenapa THR yang masuk rekening lebih kecil dari satu bulan gaji?',
          jawaban: 'Karena PPh 21 bulan itu dihitung dari gaji ditambah THR dengan tarif TER yang lebih tinggi. Selisihnya disesuaikan saat pajak setahun dihitung ulang di bulan Desember.',
        },
      ],
      sumberAturan: [S.permenaker6, S.seThr, S.setneg, S.indonesiabaik, S.djpThr, S.ter],
      seo: {
        keyphrase: 'kalkulator THR',
        judulSEO: 'Kalkulator THR 2026: THR Proporsional dan Potongan PPh 21',
        metaDeskripsi:
          'Hitung THR keagamaan 2026 sesuai masa kerja, termasuk THR proporsional untuk karyawan baru dan tambahan PPh 21 di bulan THR, dengan rumus dari Permenaker.',
      },
    },
    {
      toolId: 'cicilan-kpr',
      nama: 'Cicilan & KPR',
      pilar: 'uang-karier',
      ringkasan: 'Hitung cicilan bulanan KPR, kendaraan, atau pinjaman dengan bunga anuitas atau flat, beserta total bunganya.',
      penjelasan: isi(
        h2('Rumus cicilan'),
        p('Cicilan bulanan bergantung pada pokok pinjaman, bunga, lama cicilan, dan cara pemberi pinjaman menghitung bunga. Pokok pinjaman adalah harga dikurangi uang muka.'),
        daftar([
          'Anuitas: cicilan = P x r / (1 - (1 + r) pangkat -n). P pokok pinjaman, r bunga per bulan (bunga per tahun dibagi 12), n jumlah bulan. Cicilan sama setiap bulan; di awal sebagian besar untuk bunga, lalu porsi pokok makin besar.',
          'Flat: cicilan = P / n + P x r. Bunga selalu dihitung dari pokok awal, jadi total bunganya lebih besar daripada anuitas dengan angka bunga yang sama.',
        ]),
        h2('Contoh hitung'),
        p('Pinjaman Rp120.000.000 dengan bunga 11% per tahun selama 10 tahun (120 bulan):'),
        daftar([
          'Anuitas: cicilan Rp1.653.000. Bunga bulan pertama Rp120.000.000 x 11% / 12 = Rp1.100.000, jadi pokok yang terbayar Rp553.000. Total bunga selama 10 tahun Rp78.360.000.',
          'Flat: cicilan Rp1.000.000 pokok + Rp1.100.000 bunga = Rp2.100.000 setiap bulan. Total bunganya Rp132.000.000.',
        ]),
        p('Contoh di form: rumah Rp500.000.000 dengan uang muka 20% berarti pokok Rp400.000.000. Dengan bunga anuitas 7,5% per tahun selama 15 tahun, cicilannya Rp3.708.049 dan total bunganya Rp267.448.820.'),
        h2('Bunga tetap dan mengambang'),
        p(
          'Banyak KPR memakai bunga tetap untuk beberapa tahun pertama, lalu bunga mengambang yang mengikuti suku bunga pasar. Kalkulator ini menganggap bunga tetap sepanjang tenor. Untuk memperkirakan cicilan setelah masa bunga tetap, hitung lagi dengan bunga mengambang yang tertulis di perjanjian kreditmu.',
        ),
        h2('Sebelum mengambil pinjaman'),
        daftar([
          'Tanyakan cara hitung bunganya. Dengan angka bunga yang sama, bunga flat jauh lebih mahal daripada anuitas, seperti di contoh di atas.',
          'Hitung juga biaya lain: provisi, administrasi, asuransi, appraisal, dan notaris.',
          'Pastikan pemberi pinjaman berizin dan diawasi OJK.',
        ]),
      ),
      faq: [
        {
          pertanyaan: 'Apa beda bunga anuitas dan bunga efektif?',
          jawaban: 'Keduanya menghitung bunga dari sisa pokok. Pada anuitas cicilannya dibuat sama setiap bulan; pada bunga efektif biasa angsuran pokoknya yang sama, sehingga cicilan turun setiap bulan.',
        },
        {
          pertanyaan: 'Bisakah kalkulator ini dipakai untuk kredit motor?',
          jawaban: 'Bisa. Kredit kendaraan dan pinjaman tanpa agunan sering memakai bunga flat. Pilih Flat, lalu isi harga, uang muka, bunga, dan lama cicilannya.',
        },
      ],
      sumberAturan: [S.kompasAnuitas],
      seo: {
        keyphrase: 'kalkulator cicilan KPR',
        judulSEO: 'Kalkulator Cicilan KPR: Bunga Anuitas dan Flat per Bulan',
        metaDeskripsi:
          'Hitung cicilan KPR, kredit kendaraan, atau pinjaman per bulan dengan bunga anuitas atau flat, lengkap dengan total bunga, rumus, dan contoh hitungnya.',
      },
    },
    {
      toolId: 'dana-darurat',
      nama: 'Dana Darurat',
      pilar: 'uang-karier',
      ringkasan: 'Hitung target dana darurat dari pengeluaran wajib dan kondisimu, lalu berapa yang perlu disisihkan tiap bulan.',
      penjelasan: isi(
        h2('Rumus dana darurat'),
        p('Dana darurat adalah tabungan untuk kejadian mendadak, misalnya kehilangan penghasilan, sakit, atau perbaikan yang tidak bisa ditunda. Besarnya diukur dari pengeluaran wajib sebulan, bukan dari gaji.'),
        daftar([
          'Target = pengeluaran wajib per bulan x kelipatan sesuai kondisimu.',
          'Setoran per bulan = (target - dana yang sudah ada) / jumlah bulan, dibulatkan ke atas.',
        ]),
        h2('Berapa kali pengeluaran'),
        p(
          'OJK lewat Sikapi Uangmu menyarankan dana darurat 6 kali pengeluaran bulanan untuk yang masih lajang, dan 9 sampai 12 kali untuk yang sudah berkeluarga atau punya tanggungan. Kalkulator ini memakai 9 kali untuk menikah tanpa anak dan 12 kali untuk yang punya anak atau tanggungan lain.',
        ),
        h2('Pengeluaran wajib itu apa saja'),
        daftar([
          'Makan dan kebutuhan rumah tangga.',
          'Sewa atau cicilan rumah.',
          'Transport untuk bekerja dan sekolah.',
          'Tagihan listrik, air, internet, dan pulsa.',
          'Cicilan utang dan premi asuransi.',
          'Biaya sekolah atau pengasuhan anak.',
        ]),
        p('Belanja yang bisa ditunda, seperti hiburan dan langganan, tidak perlu dihitung.'),
        h2('Di mana menyimpannya'),
        p(
          'OJK menyarankan rekening tabungan terpisah yang mudah dicairkan dan setoran awalnya kecil, di produk keuangan yang legal dan diawasi OJK. Hindari menaruh dana darurat di investasi berisiko seperti saham, karena nilainya bisa turun tepat saat kamu membutuhkannya.',
        ),
        h2('Contoh hitung'),
        p('Pengeluaran wajib Rp5.000.000 sebulan, lajang, sudah punya Rp5.000.000, target terkumpul dalam 12 bulan:'),
        daftar(
          [
            'Target: 6 x Rp5.000.000 = Rp30.000.000.',
            'Kekurangan: Rp30.000.000 - Rp5.000.000 = Rp25.000.000.',
            'Setoran: Rp25.000.000 / 12 = Rp2.083.334 per bulan, dibulatkan ke atas.',
          ],
          true,
        ),
      ),
      faq: [
        {
          pertanyaan: 'Apakah dana darurat sama dengan tabungan biasa?',
          jawaban: 'Tidak. Dana darurat hanya untuk kejadian mendadak dan disimpan terpisah supaya tidak terpakai untuk belanja atau tujuan lain.',
        },
        {
          pertanyaan: 'Bagaimana kalau targetnya terasa terlalu besar?',
          jawaban: 'Mulai dari target kecil, misalnya satu bulan pengeluaran, lalu tambah sedikit demi sedikit. Perpanjang jangka di kalkulator untuk melihat setoran yang lebih ringan.',
        },
      ],
      sumberAturan: [S.ojkDarurat],
      seo: {
        keyphrase: 'kalkulator dana darurat',
        judulSEO: 'Kalkulator Dana Darurat: Berapa yang Perlu Kamu Siapkan',
        metaDeskripsi:
          'Hitung target dana darurat dari pengeluaran wajib sebulan dan kondisimu, sesuai saran OJK, lalu berapa yang perlu disisihkan setiap bulan untuk mencapainya.',
      },
    },
    {
      toolId: 'bmi-kalori',
      nama: 'BMI & Kalori',
      pilar: 'sehat',
      ringkasan: 'Hitung indeks massa tubuh dengan kategori dewasa Indonesia dan perkiraan kebutuhan kalori harianmu.',
      penjelasan: isi(
        h2('Rumus IMT'),
        p('Indeks massa tubuh (IMT, atau BMI dalam bahasa Inggris) adalah berat badan dalam kilogram dibagi kuadrat tinggi badan dalam meter. IMT dipakai untuk skrining status gizi orang dewasa, bukan untuk diagnosis.'),
        daftar(['IMT = berat (kg) / (tinggi (m) x tinggi (m)).']),
        h2('Kategori IMT dewasa Indonesia'),
        p(
          'Kalkulator memakai batas IMT dewasa yang dipakai di Indonesia: sangat kurus di bawah 17,0; kurus 17,0 sampai 18,4; normal 18,5 sampai 25,0; gemuk 25,1 sampai 27,0; dan obesitas di atas 27,0. IMT dibulatkan satu desimal sebelum dikategorikan.',
        ),
        p(
          'WHO memakai batas lain untuk perbandingan antarnegara: berat badan kurang di bawah 18,5, berat badan lebih mulai 25, dan obesitas mulai 30. Karena itu IMT 28 sudah termasuk obesitas menurut batas Indonesia, tetapi masih berat badan lebih menurut WHO.',
        ),
        h2('Kebutuhan kalori'),
        p('Kebutuhan kalori harian diperkirakan dari energi basal (BMR), yaitu energi untuk fungsi tubuh saat istirahat, dikali faktor aktivitas.'),
        daftar([
          'Laki-laki: BMR = 10 x berat (kg) + 6,25 x tinggi (cm) - 5 x usia (tahun) + 5.',
          'Perempuan: BMR = 10 x berat (kg) + 6,25 x tinggi (cm) - 5 x usia (tahun) - 161.',
        ]),
        p(
          'Rumus energi basal ini dari Mifflin dan St Jeor (American Journal of Clinical Nutrition, 1990). Faktor aktivitasnya memakai tingkat aktivitas fisik (PAL) dari laporan FAO, WHO, dan UNU tentang kebutuhan energi manusia: 1,53 untuk aktivitas ringan, 1,76 untuk sedang, dan 2,25 untuk berat.',
        ),
        h2('Contoh hitung'),
        p('Perempuan 25 tahun, berat 60 kg, tinggi 165 cm, aktivitas ringan:'),
        daftar(
          [
            'IMT = 60 / (1,65 x 1,65) = 22,0, kategori normal.',
            'BMR = 10 x 60 + 6,25 x 165 - 5 x 25 - 161 = 1.345 kkal.',
            'Kebutuhan kalori = 1.345,25 x 1,53 = sekitar 2.058 kkal per hari.',
            'Berat normal untuk tinggi 165 cm: 18,5 x 1,65 x 1,65 sampai 25,0 x 1,65 x 1,65, yaitu 50,4 sampai 68,1 kg.',
          ],
          true,
        ),
        h2('Batasan kalkulator'),
        daftar([
          'Untuk orang dewasa 18 tahun ke atas. Anak dan remaja dinilai dengan grafik IMT menurut umur.',
          'IMT tidak membedakan otot dan lemak, jadi orang yang sangat berotot bisa tergolong gemuk.',
          'Tidak dipakai untuk ibu hamil.',
          'Angka kalori adalah perkiraan. Kebutuhan yang tepat, terutama bila kamu punya penyakit tertentu, sebaiknya ditentukan bersama dokter atau ahli gizi.',
        ]),
      ),
      faq: [
        { pertanyaan: 'Berapa IMT yang normal?', jawaban: 'Untuk orang dewasa di Indonesia, IMT normal 18,5 sampai 25,0. WHO memakai 18,5 sampai di bawah 25.' },
        {
          pertanyaan: 'Apakah kebutuhan kalori ini untuk menurunkan berat badan?',
          jawaban: 'Angka ini perkiraan untuk mempertahankan berat badan saat ini. Untuk menurunkan atau menaikkan berat badan, bicarakan target yang aman dengan tenaga kesehatan.',
        },
      ],
      sumberAturan: [S.bps, S.who, S.mifflin, S.fao],
      seo: {
        keyphrase: 'kalkulator BMI',
        judulSEO: 'Kalkulator BMI dan Kebutuhan Kalori Harian Orang Dewasa',
        metaDeskripsi:
          'Hitung indeks massa tubuh (BMI) dengan kategori dewasa Indonesia dan perkiraan kebutuhan kalori harian dengan rumus Mifflin-St Jeor dan faktor aktivitas.',
      },
    },
    {
      toolId: 'ipk',
      nama: 'IPK',
      pilar: 'belajar',
      ringkasan: 'Hitung IP semester dan IPK dari SKS dan nilai huruf, atau gabungkan dengan IPK sebelumnya.',
      penjelasan: isi(
        h2('Rumus IP dan IPK'),
        p('Indeks prestasi (IP) adalah rata-rata nilai yang dibobot SKS. Setiap nilai huruf diubah menjadi angka mutu, dikali SKS mata kuliahnya, lalu dijumlahkan dan dibagi jumlah SKS.'),
        daftar([
          'IP semester = jumlah (SKS x angka mutu) semester itu / jumlah SKS semester itu.',
          'IPK = jumlah (SKS x angka mutu) semua mata kuliah yang sudah ditempuh / jumlah SKS yang sudah ditempuh.',
        ]),
        p(
          'Rumus ini tertulis di Permendikbud Nomor 3 Tahun 2020 tentang Standar Nasional Pendidikan Tinggi. Peraturan yang berlaku sekarang, Permendiktisaintek Nomor 39 Tahun 2025, tetap memakai nilai huruf A sampai E dan membolehkan nilai antara.',
        ),
        h2('Konversi nilai huruf'),
        p(
          'Permendikbud 3/2020 menetapkan A setara 4, B setara 3, C setara 2, D setara 1, dan E setara 0. Nilai antara seperti A- atau B+ ditentukan masing-masing kampus. Kalkulator ini memakai A- 3,7; B+ 3,3; B- 2,7; dan C+ 2,3. Kampus lain bisa berbeda, misalnya UGM memakai A- 3,75 dan B+ 3,25.',
        ),
        h2('Menggabungkan dengan IPK sebelumnya'),
        p(
          'Bila kamu tahu IPK dan jumlah SKS sebelumnya, kalkulator menggabungkannya: mutu lama (IPK x SKS lama) ditambah mutu semester ini, lalu dibagi total SKS. Hasilnya sama dengan menghitung ulang semua mata kuliah, selama IPK lama yang kamu isi tidak dibulatkan terlalu jauh.',
        ),
        h2('Contoh hitung'),
        daftar(
          [
            'Lima mata kuliah: 3 SKS nilai A, 3 SKS B+, 2 SKS A-, 3 SKS B, dan 2 SKS A.',
            'Mutu: 3 x 4 + 3 x 3,3 + 2 x 3,7 + 3 x 3 + 2 x 4 = 46,3.',
            'IP = 46,3 / 13 = 3,56.',
            'Dengan IPK sebelumnya 3,40 dari 40 SKS: (3,40 x 40 + 46,3) / 53 = 3,44.',
          ],
          true,
        ),
        h2('Batasan kalkulator'),
        daftar([
          'Mata kuliah yang hanya dinilai lulus atau tidak lulus, tanpa nilai huruf, tidak dihitung dalam IP dan IPK.',
          'Sebagian kampus memotong IPK ke dua desimal, bukan membulatkan. Kalkulator ini membulatkan.',
        ]),
      ),
      faq: [
        {
          pertanyaan: 'Berapa IPK minimal untuk lulus?',
          jawaban: 'Permendiktisaintek 39/2025 mensyaratkan IPK paling rendah 2,00 untuk program diploma, sarjana, dan sarjana terapan, dan 3,00 untuk program profesi, magister, dan doktor.',
        },
        {
          pertanyaan: 'Kenapa IPK di sini berbeda dengan sistem akademik kampusku?',
          jawaban: 'Biasanya karena konversi nilai antara atau cara pembulatan. Cocokkan tabel konversi nilai huruf di halaman ini dengan peraturan akademik kampusmu.',
        },
      ],
      sumberAturan: [S.sndikti, S.permen39, S.ugm],
      seo: {
        keyphrase: 'kalkulator IPK',
        judulSEO: 'Kalkulator IPK: Hitung IP Semester dan IPK dari Nilai SKS',
        metaDeskripsi:
          'Hitung IP semester dan IPK dari SKS dan nilai huruf, atau gabungkan dengan IPK sebelumnya. Lengkap dengan rumus, konversi nilai huruf, dan contoh hitung.',
      },
    },
  ]

  /** Bantuan input awal dari definisi isian modul hitung; pemilik bisa mengubah label dan bantuannya di CMS. */
  function bantuanAwal(toolId: ToolId): NonNullable<Tool['bantuanInput']> {
    const { isian } = siapkanKalkulator(toolId, PARAMETER_AWAL, '2026-11-05')
    return isian
      .flatMap((i): Isian[] => (i.jenis === 'baris' ? [i, ...i.kolom] : [i]))
      .map((i) => ({ kunci: i.kunci, label: i.label, bantuan: i.bantuan }))
  }

  /**
   * Membuat tools yang belum ada (dicari lewat `toolId`, termasuk draf) dan parameter yang belum ada
   * (dicari lewat `toolId`, `kunci`, dan `berlakuMulai`). Aman dijalankan berkali-kali dan tidak menimpa
   * isian pemilik.
   */
  export async function seedTools(payload: Payload): Promise<{ tools: number; parameter: number }> {
    const slugPilar = [...new Set(TOOLS_AWAL.map((t) => t.pilar))]
    const { docs: daftarPilar } = await payload.find({
      collection: 'pilar',
      where: { slug: { in: slugPilar } },
      limit: slugPilar.length,
      depth: 0,
      select: { slug: true },
    })
    const idPilar = new Map(daftarPilar.map((d) => [d.slug, d.id]))
    let tools = 0
    for (const t of TOOLS_AWAL) {
      const ada = await payload.find({ collection: 'tools', where: { toolId: { equals: t.toolId } }, draft: true, limit: 1, depth: 0 })
      const pilar = idPilar.get(t.pilar)
      if (ada.totalDocs > 0 || !pilar) continue
      await payload.create({
        collection: 'tools',
        draft: true,
        data: { ...t, _status: 'draft', slug: t.toolId, pilar, bantuanInput: bantuanAwal(t.toolId) },
      })
      tools++
    }
    let parameter = 0
    for (const p of PARAMETER_AWAL) {
      const ada = await payload.find({
        collection: 'parameter-tools',
        where: { and: [{ toolId: { equals: p.toolId } }, { kunci: { equals: p.kunci } }, { berlakuMulai: { equals: p.berlakuMulai } }] },
        limit: 1,
        depth: 0,
      })
      if (ada.totalDocs > 0) continue
      await payload.create({ collection: 'parameter-tools', data: p })
      parameter++
    }
    return { tools, parameter }
  }
  ```

  ```diff
  diff --git a/src/seed/seed.ts b/src/seed/seed.ts
  index 817ae05..dca01ff 100644
  --- a/src/seed/seed.ts
  +++ b/src/seed/seed.ts
  @@ -3,6 +3,8 @@ import type { Payload } from 'payload'
   import type { WarnaPilar } from '@/lib/konstanta'
   import { paragrafLexical } from '@/lib/lexical'
   
  +import { seedTools } from './tools'
  +
   export const PILAR_AWAL: {
     nama: string
     slug: string
  @@ -45,7 +47,7 @@ export const HALAMAN_AWAL = [
   
   export type OpsiSeed = { emailAdmin?: string; passwordAdmin?: string }
   
  -export type HasilSeed = { admin: 'dibuat' | 'sudah-ada' | 'dilewati'; pilar: number; halaman: number }
  +export type HasilSeed = { admin: 'dibuat' | 'sudah-ada' | 'dilewati'; pilar: number; halaman: number; tools: number; parameter: number }
   
   /** Mengisi data awal. Aman dijalankan berkali-kali: dokumen dicari lewat slug dulu. */
   export async function seed(payload: Payload, opsi: OpsiSeed = {}): Promise<HasilSeed> {
  @@ -63,6 +65,9 @@ export async function seed(payload: Payload, opsi: OpsiSeed = {}): Promise<Hasil
       idPilar.push(doc.id)
     }
   
  +  // Kalkulator (draf) dan parameternya; tools butuh pilar yang sudah ada.
  +  const kalkulator = await seedTools(payload)
  +
     const redaksi = await payload.find({ collection: 'penulis', where: { slug: { equals: 'redaksi' } }, limit: 1 })
     if (redaksi.totalDocs === 0) {
       await payload.create({
  @@ -128,7 +133,7 @@ export async function seed(payload: Payload, opsi: OpsiSeed = {}): Promise<Hasil
       },
     })
   
  -  return { admin, pilar: PILAR_AWAL.length, halaman: HALAMAN_AWAL.length }
  +  return { admin, pilar: PILAR_AWAL.length, halaman: HALAMAN_AWAL.length, ...kalkulator }
   }
   
   async function siapkanAdmin(payload: Payload, opsi: OpsiSeed): Promise<HasilSeed['admin']> {
  ```

  ```diff
  diff --git a/src/seed/run.ts b/src/seed/run.ts
  index eb9d42a..ecc8c3c 100644
  --- a/src/seed/run.ts
  +++ b/src/seed/run.ts
  @@ -10,6 +10,6 @@ const hasil = await seed(payload, {
   })
   
   payload.logger.info(
  -  `Seed selesai. Admin: ${hasil.admin}. Pilar: ${hasil.pilar}. Halaman draf: ${hasil.halaman}.`,
  +  `Seed selesai. Admin: ${hasil.admin}. Pilar: ${hasil.pilar}. Halaman draf: ${hasil.halaman}. Tools baru: ${hasil.tools}. Parameter baru: ${hasil.parameter}.`,
   )
   process.exit(0)
  ```

- [ ] **Langkah 4: Jalankan tes unit dan integrasi, lalu isi database dev**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run seed
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 49 passed (49)`, `Tests 330 passed (330)`; integrasi `Test Files 26 passed (26)`, `Tests 77 passed (77)`; `npm run seed` pertama mencetak `Tools baru: 6. Parameter baru: 22.` (bila database dev sudah punya parameter dengan kunci dan tanggal yang sama dari percobaan sebelumnya, angkanya lebih kecil), dan seed kedua mencetak `Tools baru: 0. Parameter baru: 0.`

- [ ] **Langkah 5: Tools E2E dari seed**

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index e7abbdd..2b9f432 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -17,7 +17,7 @@ import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, p, SLUG, SLUG_HALAMAN,
   pakaiKlien(klienPalsu('e2e'))
   const payload = await getPayload({ config })
   
  -for (const koleksi of ['artikel', 'tools', 'video', 'subkategori', 'redirect', 'log-404', 'media'] as const) {
  +for (const koleksi of ['artikel', 'tools', 'parameter-tools', 'video', 'subkategori', 'redirect', 'log-404', 'media'] as const) {
     await payload.delete({ collection: koleksi, where: { id: { exists: true } } })
   }
   await seed(payload, { emailAdmin: ADMIN_E2E.email, passwordAdmin: ADMIN_E2E.password })
  @@ -218,18 +218,10 @@ const danaDarurat = await payload.create({
   })
   await payload.update({ collection: 'artikel', id: danaDarurat.id, data: { _status: 'published', slug: SLUG.danaDarurat } })
   
  -// Kalkulator: tiga terbit di dua pilar, satu draf. Halaman `/tools/{slug}` dibangun di Rencana 5.
  -for (const [toolId, nama, slugPilar, status] of [
  -  ['gaji-bersih', 'Gaji Bersih', 'uang-karier', 'published'],
  -  ['thr', 'THR', 'uang-karier', 'published'],
  -  ['bmi-kalori', 'BMI & Kalori', 'sehat', 'published'],
  -  ['ipk', 'IPK', 'belajar', 'draft'],
  -] as const) {
  -  await payload.create({
  -    collection: 'tools',
  -    draft: status === 'draft',
  -    data: { _status: status, nama, slug: toolId, toolId, pilar: pilar[slugPilar], ringkasan: `Hitung ${nama} dengan rumus dan sumber aturan resmi.` },
  -  })
  +// Kalkulator dari seed (draf, lengkap dengan parameter): tiga diterbitkan di dua pilar, sisanya tetap draf.
  +for (const toolId of ['gaji-bersih', 'thr', 'bmi-kalori']) {
  +  const { docs } = await payload.find({ collection: 'tools', where: { toolId: { equals: toolId } }, draft: true, limit: 1 })
  +  await payload.update({ collection: 'tools', id: docs[0].id, data: { _status: 'published' } })
   }
   
   // Halaman statis dari seed (draf) diterbitkan dengan blok page builder.
  ```

  Jalankan:

  ```bash
  npm run test:e2e
  ```

  Hasil yang diharapkan: `74 passed` (tidak berubah: `/tools` dan beranda tetap menampilkan tiga tools terbit).

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/seed tests/int/seed.int.spec.ts tests/int/tools.int.spec.ts tests/e2e/siapkan.ts
  git commit -m "feat(tools): seed enam kalkulator draf dengan penjelasan rumus, contoh, FAQ, sumber aturan, dan parameter"
  ```

### Task 7: Data halaman kalkulator: tools terbit, parameter sumbernya, teks isian dari CMS, dan hasil contoh

**Files:**
- Modify: `src/modules/hitung/index.ts`, `src/modules/hitung/tipe.ts`, `src/modules/konten/tipe.ts`, `src/modules/konten/tools.ts`, `src/modules/konten/data.ts`, `src/modules/konten/cache.ts`, `src/modules/konten/index.ts`
- Test: `tests/unit/tools-halaman.test.ts`, `tests/int/tools-halaman.int.spec.ts`

**Interfaces:**
- Consumes: `hitung`, `siapkanKalkulator`, `sumberParameter`, `ParameterTersimpan` (Task 1); `TAG.parameterTools` (Task 2); `pilarRingkas`, `tandaiSubjudul`, `POPULATE_ARTIKEL`, `terbit`, `TAG_ARTIKEL` (Rencana 4A); `ToolsSeo` (Rencana 3); `pathFor` tools (Rencana 4B).
- Produces:
  - `@/modules/hitung`: tipe `TeksIsian = Record<string, { label: string; bantuan: string | null }>`; argumen opsional `teks?: TeksIsian` di `hitung(...)` dan `siapkanKalkulator(...)` (label CMS menimpa label bawaan, label kosong diabaikan, bantuan kosong berarti tanpa bantuan, kolom baris ikut). `siapkanKalkulator` kini memeriksa semua parameter definisinya, jadi parameter yang hilang langsung menjadi `pesan`, bukan galat saat pembaca menghitung.
  - `src/modules/konten/tipe.ts`: `DataTool = { id; nama; toolId; href; ringkasan; pilar; bantuan: TeksIsian; penjelasan; faq; sumber; diperiksa: string | null; parameter: ParameterTersimpan[]; seo: ToolsSeo }`.
  - `src/modules/konten/tools.ts`: `parameterTersimpan(doc)`, `susunTool(doc, parameter): DataTool`, `susunKalkulator(tool, tanggal): { kalkulator: Kalkulator; contoh: Hasil | null }`.
  - `ambilTool(payload, slug): Promise<DataTool | null>` (`data.ts`), `muatTool(slug)` (`cache.ts`, tag `TAG_ARTIKEL` + `parameter-tools`), diekspor lewat `@/modules/konten`.

Halaman kalkulator (Task 8) butuh satu data siap pakai. `ambilTool` mengambil tools terbit dengan slug itu (depth 2 seperti artikel, karena penjelasan rumus bisa menautkan artikel lain) dan **semua** dokumen parameter milik kalkulator sumbernya (`sumberParameter`: THR membaca parameter Gaji Bersih), dengan semua tanggal berlaku. Pemilihan per tanggal tetap di modul `hitung`, jadi halaman yang di-cache tetap memakai aturan yang benar bila dihitung di tanggal lain (misalnya batas upah JP berganti 1 Maret).

`susunTool` menerjemahkan dokumen Payload: `bantuanInput` menjadi `TeksIsian` per kunci, subjudul penjelasan diberi id (daftar isi dan tautan), `diperiksa` adalah tanggal akses sumber aturan yang paling baru (ditampilkan "Aturan diperiksa ..."), dan parameter dibuang id-nya serta cap waktunya (`parameterTersimpan`; tabel kosong dari Payload menjadi `null`). `susunKalkulator` menyiapkan kalkulator untuk tanggal render dan menghitung contohnya, supaya HTML halaman sudah berisi hasil sebelum JavaScript jalan.

Label dan bantuan dari CMS juga dipakai pesan galat (tes: editor mengganti label isian `gaji` menjadi "Gaji kotor sebulan", pesan galatnya "Gaji kotor sebulan belum diisi. Tulis angkanya, misalnya 8.000.000."), karena keduanya lewat modul `hitung`.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/tools-halaman.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { susunKalkulator, susunTool } from '@/modules/konten/tools'
  import type { DataTool } from '@/modules/konten/tipe'
  import type { ParameterTool, Pilar, Tool } from '@/payload-types'
  import { PARAMETER_AWAL } from '@/seed/parameter-tools'

  const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
  const uang: Pilar = { id: 1, nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau', deskripsi: 'Uang.', urutan: 1, disclaimer: 'Bukan saran keuangan.', ...waktu }

  const tool: Tool = {
    id: 7,
    nama: 'Gaji Bersih',
    slug: 'gaji-bersih',
    pilar: uang,
    toolId: 'gaji-bersih',
    ringkasan: 'Hitung gaji bersih.',
    bantuanInput: [
      { id: 'a', kunci: 'gaji', label: 'Gaji kotor sebulan', bantuan: 'Dari slip gaji.' },
      { id: 'b', kunci: 'status', label: 'Status PTKP', bantuan: '' },
    ],
    penjelasan: {
      root: {
        type: 'root',
        format: '',
        indent: 0,
        version: 1,
        direction: 'ltr',
        children: [{ type: 'heading', tag: 'h2', version: 1, children: [{ type: 'text', text: 'Rumus gaji bersih', version: 1 }] }],
      },
    },
    faq: [{ id: 'f', pertanyaan: 'Apa itu TER?', jawaban: 'Tarif efektif rata-rata.' }],
    sumberAturan: [
      { id: 's1', judul: 'PP 58/2023', url: 'https://www.pajak.go.id/', penerbit: 'DJP', diaksesPada: '2026-10-01T00:00:00.000Z' },
      { id: 's2', judul: 'BPJS', url: 'https://www.bpjsketenagakerjaan.go.id/', penerbit: ' ', diaksesPada: '2026-11-05T00:00:00.000Z' },
    ],
    seo: { judulSEO: 'Kalkulator Gaji Bersih' },
    _status: 'published',
    ...waktu,
  }

  const parameterDoc = (p: (typeof PARAMETER_AWAL)[number], i: number): ParameterTool => ({
    id: i + 1,
    ...p,
    tabel: p.tabel?.map((b, j) => ({ id: `${i}-${j}`, label: b.label ?? null, batas: b.batas ?? null, nilai: b.nilai ?? null })) ?? null,
    ...waktu,
  })

  describe('susunTool', () => {
    it('data halaman: path, pilar, bantuan per kunci, subjudul bertanda, sumber, tanggal diperiksa, SEO', () => {
      const data = susunTool(tool, [])
      expect(data).toMatchObject({ id: 7, nama: 'Gaji Bersih', toolId: 'gaji-bersih', href: '/tools/gaji-bersih', ringkasan: 'Hitung gaji bersih.' })
      expect(data.pilar).toEqual({ nama: 'Uang & Karier', slug: 'uang-karier', href: '/uang-karier', warna: 'hijau', disclaimer: 'Bukan saran keuangan.' })
      expect(data.bantuan).toEqual({ gaji: { label: 'Gaji kotor sebulan', bantuan: 'Dari slip gaji.' }, status: { label: 'Status PTKP', bantuan: null } })
      expect(JSON.stringify(data.penjelasan)).toContain('"idJangkar":"rumus-gaji-bersih"')
      expect(data.sumber[1]).toEqual({ judul: 'BPJS', url: 'https://www.bpjsketenagakerjaan.go.id/', penerbit: null, diaksesPada: '2026-11-05T00:00:00.000Z' })
      expect(data.diperiksa).toBe('2026-11-05T00:00:00.000Z')
      expect(data.seo).toMatchObject({ nama: 'Gaji Bersih', toolId: 'gaji-bersih', slug: 'gaji-bersih', seo: { judulSEO: 'Kalkulator Gaji Bersih' } })
    })

    it('parameter tanpa id dan cap waktu, baris tabel tanpa id', () => {
      const data = susunTool(tool, PARAMETER_AWAL.map(parameterDoc))
      expect(data.parameter).toHaveLength(PARAMETER_AWAL.length)
      expect(data.parameter.find((p) => p.kunci === 'tarif-pasal-17')).toEqual({
        toolId: 'gaji-bersih',
        kunci: 'tarif-pasal-17',
        nilai: null,
        tabel: [
          { label: null, batas: 60_000_000, nilai: 5 },
          { label: null, batas: 250_000_000, nilai: 15 },
          { label: null, batas: 500_000_000, nilai: 25 },
          { label: null, batas: 5_000_000_000, nilai: 30 },
          { label: null, batas: null, nilai: 35 },
        ],
        berlakuMulai: '2022-01-01',
        berlakuSampai: null,
        sumber: {
          judul: 'Memotret Keberpihakan UU HPP pada Rakyat Kecil (DJP)',
          url: 'https://www.pajak.go.id/id/artikel/memotret-keberpihakan-uu-hpp-pada-rakyat-kecil',
        },
      })
    })
  })

  describe('susunKalkulator', () => {
    const data: DataTool = susunTool(tool, PARAMETER_AWAL.map(parameterDoc))

    it('label dan bantuan dari CMS dipakai di isian dan di pesan galat; bantuan kosong berarti tanpa bantuan', () => {
      const { kalkulator, contoh } = susunKalkulator(data, '2026-11-05')
      expect(kalkulator.isian.slice(0, 2).map((i) => [i.label, i.bantuan])).toEqual([
        ['Gaji kotor sebulan', 'Dari slip gaji.'],
        ['Status PTKP', null],
      ])
      expect(contoh?.ok && contoh.utama.nilai).toBe(7_554_552)
    })

    it('hitung memakai label CMS untuk pesan galat', async () => {
      const { hitung } = await import('@/modules/hitung')
      expect(hitung('gaji-bersih', { gaji: '', status: 'TK/0' }, '2026-11-05', data.parameter, data.bantuan)).toMatchObject({
        galat: { gaji: 'Gaji kotor sebulan belum diisi. Tulis angkanya, misalnya 8.000.000.' },
      })
    })

    it('tanpa parameter: pesan, tanpa hasil contoh', () => {
      const { kalkulator, contoh } = susunKalkulator({ ...data, parameter: [] }, '2026-11-05')
      expect(kalkulator.pesan).toMatch(/^Kalkulator ini sedang diperbarui/)
      expect(contoh).toBeNull()
    })
  })
  ```

  `tests/int/tools-halaman.int.spec.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { ambilTool } from '@/modules/konten/data'

  import { getTestPayload, unik } from './helpers'

  describe('ambilTool', () => {
    it('tools terbit dengan parameter kalkulator sumbernya; draf dan slug tidak dikenal null', async () => {
      const payload = await getTestPayload()
      const pilar = await payload.create({ collection: 'pilar', data: { nama: unik('Uang'), warna: 'hijau', deskripsi: 'Uang.' } })
      // `toolId` unik: tools THR dari seed atau sisa tes sebelumnya dibersihkan dulu.
      await payload.delete({ collection: 'tools', where: { toolId: { equals: 'thr' } } })
      const thr = await payload.create({
        collection: 'tools',
        data: {
          _status: 'published',
          nama: unik('THR'),
          toolId: 'thr',
          pilar: pilar.id,
          ringkasan: 'Hitung THR.',
          bantuanInput: [{ kunci: 'upah', label: 'Upah sebulan', bantuan: 'Gaji pokok dan tunjangan tetap.' }],
        },
      })
      // Tanggal berlaku 2001 tidak dipakai seed, jadi dokumen ini bisa dikenali, termasuk sisa tes yang gagal.
      await payload.delete({ collection: 'parameter-tools', where: { berlakuMulai: { equals: '2001-01-01' } } })
      const milikGaji = await payload.create({
        collection: 'parameter-tools',
        data: { toolId: 'gaji-bersih', kunci: 'jkm', nilai: 0.3, berlakuMulai: '2001-01-01', sumber: { judul: 'BPJS', url: 'https://www.bpjsketenagakerjaan.go.id/' } },
      })
      const milikIpk = await payload.create({
        collection: 'parameter-tools',
        data: { toolId: 'ipk', kunci: 'konversi-nilai', berlakuMulai: '2001-01-01', tabel: [{ label: 'A', nilai: 4 }] },
      })

      const data = await ambilTool(payload, thr.slug ?? '')
      expect(data).toMatchObject({ nama: thr.nama, toolId: 'thr', href: `/tools/${thr.slug}`, bantuan: { upah: { label: 'Upah sebulan' } } })
      expect(data?.pilar?.slug).toBe(pilar.slug)
      const tahun2001 = data?.parameter.filter((p) => p.berlakuMulai.startsWith('2001-01-01'))
      expect(tahun2001).toEqual([
        {
          toolId: 'gaji-bersih',
          kunci: 'jkm',
          nilai: 0.3,
          tabel: null,
          berlakuMulai: '2001-01-01T00:00:00.000Z',
          berlakuSampai: null,
          sumber: { judul: 'BPJS', url: 'https://www.bpjsketenagakerjaan.go.id/' },
        },
      ])

      expect(await ambilTool(payload, 'tidak-ada-tools-ini')).toBeNull()
      await payload.update({ collection: 'tools', id: thr.id, data: { _status: 'draft' } })
      expect(await ambilTool(payload, thr.slug ?? '')).toBeNull()

      await payload.delete({ collection: 'tools', id: thr.id })
      await payload.delete({ collection: 'parameter-tools', where: { id: { in: [milikGaji.id, milikIpk.id] } } })
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: unit FAIL di `tests/unit/tools-halaman.test.ts` dengan `TypeError: (0 , __vite_ssr_import_1__.susunTool) is not a function`; integrasi FAIL di `tests/int/tools-halaman.int.spec.ts` dengan `TypeError: (0 , __vite_ssr_import_1__.ambilTool) is not a function`.

- [ ] **Langkah 3: Teks isian dari CMS di modul `hitung`**

  ```diff
  diff --git a/src/modules/hitung/tipe.ts b/src/modules/hitung/tipe.ts
  index 4baa337..e7d744c 100644
  --- a/src/modules/hitung/tipe.ts
  +++ b/src/modules/hitung/tipe.ts
  @@ -63,6 +63,9 @@ export type IsianBaris = IsianDasar & {
   
   export type Isian = IsianAngka | IsianPilihan | IsianCentang | IsianBaris
   
  +/** Label dan bantuan isian dari CMS (field `bantuanInput` tools), menimpa teks bawaan per kunci isian. */
  +export type TeksIsian = Record<string, { label: string; bantuan: string | null }>
  +
   /** Angka hasil beserta teks tampilannya (misalnya "Rp 7.554.552", "1,5%", "22,0"). */
   export type Angka = { label: string; nilai: number; satuan: Satuan; teks: string }
   
  ```

  ```diff
  diff --git a/src/modules/hitung/index.ts b/src/modules/hitung/index.ts
  index 17b2ab4..1ff7b35 100644
  --- a/src/modules/hitung/index.ts
  +++ b/src/modules/hitung/index.ts
  @@ -7,10 +7,10 @@ import { gajiBersih } from './gaji-bersih'
   import { ipk } from './ipk'
   import { tengahKalimat } from './format'
   import { bacaMasukan, contohMasukan } from './masukan'
  -import { buatAturan, ParameterKosong, periksaDokumen, type GalatParameter } from './parameter'
  +import { buatAturan, ParameterKosong, periksaDokumen, type Aturan, type GalatParameter } from './parameter'
   import type { Rumus } from './rumus'
   import { thr } from './thr'
  -import type { DefinisiParameter, Hasil, Kalkulator, Masukan, ParameterTersimpan } from './tipe'
  +import type { DefinisiParameter, Hasil, Isian, Kalkulator, Masukan, ParameterTersimpan, TeksIsian } from './tipe'
   
   /**
    * Modul hitung (spesifikasi §5): `hitung(toolId, masukan, tanggal, parameter)` adalah satu-satunya
  @@ -19,6 +19,8 @@ import type { DefinisiParameter, Hasil, Kalkulator, Masukan, ParameterTersimpan
    * pemilihan parameter sesuai tanggal dan cadangan "parameter terakhir yang valid" ada di sini.
    *
    * - `siapkanKalkulator` untuk halaman: isian form, contoh masukan, teks tombol, parameter yang berlaku.
  + * - `teks` (opsional, di kedua fungsi): label dan bantuan isian dari CMS. Pesan galat ikut memakai
  + *   label itu, jadi yang dibaca pembaca selalu sama dengan yang tertulis di form.
    * - `periksaParameter` untuk validasi koleksi `parameter-tools`.
    * - `sumberParameter` untuk pemuat data: kalkulator mana saja yang dokumen parameternya dibaca.
    */
  @@ -40,15 +42,32 @@ function aturanUntuk(rumus: Rumus, parameter: ParameterTersimpan[], tanggal: Dat
     return buatAturan(definisiDari(rumus), parameter.filter((p) => rumus.sumber.includes(p.toolId)), tanggal)
   }
   
  +/** Label dan bantuan dari CMS menimpa teks bawaan, termasuk kolom isian baris. Label kosong diabaikan. */
  +function timpaTeks<T extends Isian>(isian: T, teks: TeksIsian | undefined): T {
  +  const cms = teks?.[isian.kunci]
  +  const hasil = cms ? { ...isian, label: cms.label.trim() || isian.label, bantuan: cms.bantuan?.trim() || null } : isian
  +  if (hasil.jenis !== 'baris') return hasil
  +  return { ...hasil, kolom: [timpaTeks(hasil.kolom[0], teks), timpaTeks(hasil.kolom[1], teks)] }
  +}
  +
  +const isianDengan = (rumus: Rumus, aturan: Aturan, teks: TeksIsian | undefined) =>
  +  rumus.isian(aturan).map((i) => timpaTeks(i, teks))
  +
   const pesanKosong = (galat: ParameterKosong) =>
     `Kalkulator ini sedang diperbarui: angka ${tengahKalimat(galat.label)} belum tersedia. Coba lagi nanti.`
   
  -export function hitung(toolId: ToolId, masukan: Masukan, tanggal: Date | string, parameter: ParameterTersimpan[]): Hasil {
  +export function hitung(
  +  toolId: ToolId,
  +  masukan: Masukan,
  +  tanggal: Date | string,
  +  parameter: ParameterTersimpan[],
  +  teks?: TeksIsian,
  +): Hasil {
     const rumus = RUMUS[toolId]
     if (!rumus) return { ok: false, galat: {}, pesan: BELUM_TERSEDIA }
     const aturan = aturanUntuk(rumus, parameter, tanggal)
     try {
  -    const { nilai, galat } = bacaMasukan(rumus.isian(aturan), masukan)
  +    const { nilai, galat } = bacaMasukan(isianDengan(rumus, aturan, teks), masukan)
       if (Object.keys(galat).length > 0) return { ok: false, galat, pesan: null }
       const hasil = rumus.hitung(nilai, aturan)
       if ('galat' in hasil) return { ok: false, galat: hasil.galat, pesan: null }
  @@ -59,12 +78,17 @@ export function hitung(toolId: ToolId, masukan: Masukan, tanggal: Date | string,
     }
   }
   
  -export function siapkanKalkulator(toolId: ToolId, parameter: ParameterTersimpan[], tanggal: Date | string): Kalkulator {
  +export function siapkanKalkulator(toolId: ToolId, parameter: ParameterTersimpan[], tanggal: Date | string, teks?: TeksIsian): Kalkulator {
     const rumus = RUMUS[toolId]
     if (!rumus) return { isian: [], contoh: {}, tombol: '', dasar: [], peringatan: [], pesan: BELUM_TERSEDIA }
     const aturan = aturanUntuk(rumus, parameter, tanggal)
     try {
  -    const isian = rumus.isian(aturan)
  +    const isian = isianDengan(rumus, aturan, teks)
  +    // Semua parameter wajib ada; yang pertama kosong melempar `ParameterKosong`.
  +    for (const d of definisiDari(rumus)) {
  +      if (d.jenis === 'angka') aturan.angka(d.kunci)
  +      else aturan.tabel(d.kunci)
  +    }
       const dasar = aturan.tampil()
       return { isian, contoh: contohMasukan(isian), tombol: rumus.tombol, dasar, peringatan: [...aturan.peringatan], pesan: null }
     } catch (galat) {
  ```

- [ ] **Langkah 4: Data tools di modul konten**

  ```diff
  diff --git a/src/modules/konten/tipe.ts b/src/modules/konten/tipe.ts
  index f336851..b770952 100644
  --- a/src/modules/konten/tipe.ts
  +++ b/src/modules/konten/tipe.ts
  @@ -1,6 +1,7 @@
  -import type { TipeArtikel, WarnaPilar } from '@/lib/konstanta'
  +import type { TipeArtikel, ToolId, WarnaPilar } from '@/lib/konstanta'
  +import type { ParameterTersimpan, TeksIsian } from '@/modules/hitung'
   import type { IsiDokumen } from '@/modules/seo/lexical'
  -import type { ArtikelSeo, HalamanSeo, PenulisSeo, PilarSeo, SubkategoriSeo, VideoSeo } from '@/modules/seo/tipe'
  +import type { ArtikelSeo, HalamanSeo, PenulisSeo, PilarSeo, SubkategoriSeo, ToolsSeo, VideoSeo } from '@/modules/seo/tipe'
   import type { Video } from '@/payload-types'
   
   /**
  @@ -126,6 +127,28 @@ export type ItemTools = { id: number; nama: string; href: string; ringkasan: str
   /** Kalkulator per pilar di `/tools`, urut sesuai urutan pilar di CMS. */
   export type KelompokTools = { pilar: PilarRingkas; tools: ItemTools[] }
   
  +/**
  + * Halaman `/tools/{slug}`: dokumen tools terbit dan semua dokumen parameter yang dibaca kalkulatornya.
  + * Parameter dikirim utuh (semua tanggal berlaku) karena modul hitung memilihnya sesuai tanggal hitung.
  + */
  +export type DataTool = {
  +  id: number
  +  nama: string
  +  toolId: ToolId
  +  href: string
  +  ringkasan: string
  +  pilar: PilarRingkas | null
  +  /** Label dan bantuan isian dari `bantuanInput`, per kunci isian. */
  +  bantuan: TeksIsian
  +  penjelasan: IsiDokumen
  +  faq: Faq[]
  +  sumber: Sumber[]
  +  /** Tanggal akses sumber aturan yang paling baru: kapan aturannya terakhir diperiksa. */
  +  diperiksa: string | null
  +  parameter: ParameterTersimpan[]
  +  seo: ToolsSeo
  +}
  +
   /** Ajakan newsletter: pendaftaran di form penyedia (global `newsletter`), bukan di point. */
   export type DataNewsletter = { judul: string; teks: string | null; href: string }
   
  ```

  ```diff
  diff --git a/src/modules/konten/tools.ts b/src/modules/konten/tools.ts
  index 805aa61..982959b 100644
  --- a/src/modules/konten/tools.ts
  +++ b/src/modules/konten/tools.ts
  @@ -1,8 +1,11 @@
  -import type { Pilar, Tool } from '@/payload-types'
  +import type { ParameterTool, Pilar, Tool } from '@/payload-types'
   import { pathFor } from '@/lib/paths'
  +import { hitung, siapkanKalkulator, type Hasil, type Kalkulator, type ParameterTersimpan } from '@/modules/hitung'
  +import type { IsiDokumen } from '@/modules/seo/lexical'
  +import type { ToolsSeo } from '@/modules/seo/tipe'
   
  -import { pilarRingkas } from './artikel'
  -import type { ItemTools, KelompokTools } from './tipe'
  +import { pilarRingkas, tandaiSubjudul } from './artikel'
  +import type { DataTool, ItemTools, KelompokTools } from './tipe'
   
   type ToolsUntukIndeks = Pick<Tool, 'id' | 'nama' | 'slug' | 'ringkasan' | 'pilar'>
   
  @@ -32,3 +35,56 @@ export function kelompokkanTools(docs: ToolsUntukIndeks[]): KelompokTools[] {
       .sort((a, b) => a.urutan - b.urutan || a.pilar.nama.localeCompare(b.pilar.nama, 'id'))
       .map(({ pilar, tools }) => ({ pilar, tools: tools.sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' })) }))
   }
  +
  +type ParameterUntukTool = Pick<ParameterTool, 'toolId' | 'kunci' | 'nilai' | 'tabel' | 'berlakuMulai' | 'berlakuSampai' | 'sumber'>
  +
  +/** Dokumen `parameter-tools` (depth 0) dalam bentuk yang dibaca modul hitung, tanpa id dan cap waktu. */
  +export function parameterTersimpan(doc: ParameterUntukTool): ParameterTersimpan {
  +  return {
  +    toolId: doc.toolId,
  +    kunci: doc.kunci,
  +    nilai: doc.nilai ?? null,
  +    tabel: doc.tabel?.length ? doc.tabel.map((b) => ({ label: b.label ?? null, batas: b.batas ?? null, nilai: b.nilai ?? null })) : null,
  +    berlakuMulai: doc.berlakuMulai,
  +    berlakuSampai: doc.berlakuSampai ?? null,
  +    sumber: { judul: doc.sumber?.judul ?? null, url: doc.sumber?.url ?? null },
  +  }
  +}
  +
  +/** Dokumen tools terbit (depth 2) dan parameternya menjadi data halaman `/tools/{slug}`. */
  +export function susunTool(doc: Tool, parameter: ParameterUntukTool[]): DataTool {
  +  const sumber = (doc.sumberAturan ?? []).map((s) => ({
  +    judul: s.judul,
  +    url: s.url,
  +    penerbit: s.penerbit?.trim() || null,
  +    diaksesPada: s.diaksesPada ?? null,
  +  }))
  +  const tanggalAkses = sumber.map((s) => s.diaksesPada).filter((t): t is string => Boolean(t))
  +  const { id, nama, slug, toolId, ringkasan, pilar, seo, createdAt, updatedAt } = doc
  +  return {
  +    id,
  +    nama,
  +    toolId,
  +    href: pathFor({ jenis: 'tools', slug: slug ?? '' }),
  +    ringkasan,
  +    pilar: pilarRingkas(pilar as Pilar | number),
  +    bantuan: Object.fromEntries((doc.bantuanInput ?? []).map((b) => [b.kunci, { label: b.label, bantuan: b.bantuan?.trim() || null }])),
  +    penjelasan: tandaiSubjudul(doc.penjelasan as IsiDokumen).isi,
  +    faq: (doc.faq ?? []).map(({ pertanyaan, jawaban }) => ({ pertanyaan, jawaban })),
  +    sumber,
  +    diperiksa: tanggalAkses.length ? tanggalAkses.reduce((a, b) => (a > b ? a : b)) : null,
  +    parameter: parameter.map(parameterTersimpan),
  +    seo: { id, slug, nama, toolId, ringkasan, pilar, seo, createdAt, updatedAt } as ToolsSeo,
  +  }
  +}
  +
  +/**
  + * Kalkulator untuk satu tanggal: isian (dengan label dan bantuan dari CMS), contoh masukan, parameter
  + * yang berlaku, dan hasil untuk contoh itu. Hasil contoh dirender server, jadi halaman sudah berisi
  + * angka sebelum JavaScript jalan (`null` bila kalkulator belum bisa dipakai).
  + */
  +export function susunKalkulator(tool: DataTool, tanggal: Date | string): { kalkulator: Kalkulator; contoh: Hasil | null } {
  +  const kalkulator = siapkanKalkulator(tool.toolId, tool.parameter, tanggal, tool.bantuan)
  +  if (kalkulator.pesan) return { kalkulator, contoh: null }
  +  return { kalkulator, contoh: hitung(tool.toolId, kalkulator.contoh, tanggal, tool.parameter, tool.bantuan) }
  +}
  ```

  ```diff
  diff --git a/src/modules/konten/data.ts b/src/modules/konten/data.ts
  index cdfc4ad..5d45e4e 100644
  --- a/src/modules/konten/data.ts
  +++ b/src/modules/konten/data.ts
  @@ -2,6 +2,7 @@ import type { Payload, Where } from 'payload'
   
   import type { Artikel } from '@/payload-types'
   import { validasiFormatSlug } from '@/lib/slug'
  +import { sumberParameter } from '@/modules/hitung'
   
   import { gabungTerkait, kartuArtikel, MAKS_TERKAIT, susunArtikel } from './artikel'
   import { MAKS_TERBARU_BERANDA, MAKS_VIDEO_BERANDA, susunBeranda, susunNewsletter } from './beranda'
  @@ -13,7 +14,7 @@ import { MAKS_PATH } from './log404'
   import type { RedirectTersimpan } from './redirect'
   import { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
   import { susunFooter, susunHeader } from './tampilan'
  -import { kelompokkanTools } from './tools'
  +import { kelompokkanTools, susunTool } from './tools'
   import { kartuVideo, MAKS_VIDEO_INDEKS, MAKS_VIDEO_LAIN, susunVideo } from './video'
   import type {
     BagianBeranda,
  @@ -23,6 +24,7 @@ import type {
     DataHeader,
     DataPenulis,
     DataRubrik,
  +  DataTool,
     DataVideo,
     KartuArtikel,
     KartuVideo,
  @@ -285,6 +287,33 @@ export async function ambilTools(payload: Payload): Promise<KelompokTools[]> {
     return kelompokkanTools(docs)
   }
   
  +/**
  + * Tools terbit dengan slug ini (depth 2 seperti artikel, untuk tautan di penjelasan) dan semua dokumen
  + * parameter yang dibaca kalkulatornya, misalnya THR membaca PTKP dan TER milik Gaji Bersih.
  + */
  +export async function ambilTool(payload: Payload, slug: string): Promise<DataTool | null> {
  +  if (validasiFormatSlug(slug) !== true) return null
  +  const { docs } = await payload.find({
  +    collection: 'tools',
  +    where: { and: [{ slug: { equals: slug } }, terbit] },
  +    depth: 2,
  +    limit: 1,
  +    pagination: false,
  +    populate: POPULATE_ARTIKEL,
  +  })
  +  const doc = docs[0]
  +  if (!doc) return null
  +  const { docs: parameter } = await payload.find({
  +    collection: 'parameter-tools',
  +    where: { toolId: { in: sumberParameter(doc.toolId) } },
  +    depth: 0,
  +    limit: 1000,
  +    pagination: false,
  +    select: { toolId: true, kunci: true, nilai: true, tabel: true, berlakuMulai: true, berlakuSampai: true, sumber: true },
  +  })
  +  return susunTool(doc, parameter)
  +}
  +
   /** Kolom yang dicari `/cari`: judul, deck, poin Intinya, dan keyphrase SEO. */
   const KOLOM_CARI = ['judul', 'deck', 'intinya.poin', 'seo.keyphrase'] as const
   
  ```

  ```diff
  diff --git a/src/modules/konten/cache.ts b/src/modules/konten/cache.ts
  index 9b85bf2..01b7a67 100644
  --- a/src/modules/konten/cache.ts
  +++ b/src/modules/konten/cache.ts
  @@ -17,6 +17,7 @@ import {
     ambilRubrik,
     ambilTakarir,
     ambilTerbaru,
  +  ambilTool,
     ambilTools,
     ambilVideo,
     cariArtikel,
  @@ -132,6 +133,15 @@ export const muatTools = unstable_cache(async () => ambilTools(await payload()),
     revalidate: SEJAM,
   })
   
  +/**
  + * Halaman kalkulator: penjelasan bisa menautkan dokumen apa pun (tag sama dengan artikel), dan angka
  + * aturannya dari koleksi `parameter-tools` (hook koleksi itu membuang tag `parameter-tools`).
  + */
  +export const muatTool = unstable_cache(async (slug: string) => ambilTool(await payload(), slug), ['konten', 'tool'], {
  +  tags: [...TAG_ARTIKEL, TAG.parameterTools],
  +  revalidate: SEJAM,
  +})
  +
   /** Hasil `/cari` per kueri (sudah dirapikan `rapikanKueri`), dibuang saat artikel atau pilar berubah. */
   export const muatCari = unstable_cache(async (kueri: string) => cariArtikel(await payload(), kueri), ['konten', 'cari'], {
     tags: [TAG.koleksi('artikel'), TAG.koleksi('pilar')],
  ```

  ```diff
  diff --git a/src/modules/konten/index.ts b/src/modules/konten/index.ts
  index 5cbd33a..746c7f9 100644
  --- a/src/modules/konten/index.ts
  +++ b/src/modules/konten/index.ts
  @@ -23,6 +23,7 @@ export {
     muatSitus,
     muatTakarir,
     muatTerbaru,
  +  muatTool,
     muatTools,
     muatVideo,
     TAG_ARTIKEL,
  @@ -39,6 +40,7 @@ export {
     ambilRubrik,
     ambilTakarir,
     ambilTerbaru,
  +  ambilTool,
     ambilTools,
     ambilVideo,
     cariArtikel,
  @@ -56,7 +58,7 @@ export {
     susunNewsletter,
     type SumberBeranda,
   } from './beranda'
  -export { itemTools, kelompokkanTools } from './tools'
  +export { itemTools, kelompokkanTools, parameterTersimpan, susunKalkulator, susunTool } from './tools'
   export { kartuVideo, labelDurasi, MAKS_VIDEO_INDEKS, MAKS_VIDEO_LAIN, pathTakarir, susunVideo } from './video'
   export { MAKS_ARTIKEL_PENULIS, susunPenulis } from './penulis'
   export { JUDUL_FAQ, susunHalaman } from './halaman'
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

  Hasil yang diharapkan: bersih; unit `Test Files 50 passed (50)`, `Tests 335 passed (335)`; integrasi `Test Files 27 passed (27)`, `Tests 78 passed (78)`; E2E `74 passed`.

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/modules/hitung src/modules/konten tests/unit/tools-halaman.test.ts tests/int/tools-halaman.int.spec.ts
  git commit -m "feat(konten): data halaman tools dengan parameter kalkulator, teks isian dari CMS, dan hasil contoh"
  ```

### Task 8: Halaman kalkulator `/tools/{slug}`: form, hasil contoh dari server, penjelasan rumus, dan angka aturan

**Files:**
- Create: `src/app/(frontend)/tools/[slug]/page.tsx`, `src/components/tools/HalamanTool.tsx`, `src/components/tools/FormKalkulator.tsx`, `src/components/tools/HasilKalkulator.tsx`, `src/components/tools/AturanTool.tsx`, `src/components/tools/Kalkulator.module.css`, `src/components/tools/Tool.module.css`
- Modify: `src/components/dasar/Ikon.tsx`, `src/modules/hitung/tipe.ts`, `src/modules/hitung/rumus.ts`, `src/modules/hitung/index.ts`, `src/modules/hitung/pajak.ts`, `src/modules/hitung/gaji-bersih.ts`, `src/modules/hitung/thr.ts`, `src/modules/hitung/ipk.ts`, `tests/e2e/data.ts`, `tests/e2e/siapkan.ts`, `tests/e2e/tools.spec.ts`, `tests/e2e/beranda.spec.ts`
- Test: `tests/unit/halaman-tool.test.ts`, `tests/e2e/kalkulator.spec.ts`

**Interfaces:**
- Consumes: `muatTool`, `susunKalkulator`, `DataTool` (Task 7); `Kalkulator`, `Hasil`, `Isian`, `ParameterTampil` (Task 1); `muatSitus`, `tanganiTidakAda`, `tanggalIndonesia`, `IsiArtikel`, `Catatan`, `BlokSumber`, `Faq`, `ChipPilar`, `RemahRoti`, `JsonLd`, `Ikon` (Rencana 4A dan 4B); `metadata`, `metadataTidakDitemukan`, `jsonLd`, `remahRoti` (Rencana 3); `periksaAxe`, `periksaTanpaGeserHorizontal`, `cegatCloudinary`, `UKURAN_LAYAR` (`tests/e2e/bantu.ts`, `data.ts`).
- Produces:
  - Rute `/tools/[slug]` (ISR, `generateStaticParams` kosong) dan komponen `HalamanTool({ tool, kalkulator, contoh, situs })`, `ID_KALKULATOR = 'kalkulator'`.
  - `FormKalkulator(props: PropsForm)` dengan `PropsForm = { id; isian; nilai: Masukan; galat: Record<string, string>; tombol; lanjutan; baris: Record<string, number[]>; onSubmit?; onBlur?; onTambah?; onHapus? }`, `idIsian(idForm, kunci, idBaris?)`, `barisAwal(isian)`, `MAKS_RADIO = 4`. Task 9 memakai handler opsionalnya.
  - `HasilKalkulator({ id, hasil: HasilBerhasil, baru, tombol, urutan? })` dan `AturanTool({ dasar })`.
  - Modul `hitung`: `Kalkulator.lanjutan: string | null` dari `Rumus.lanjutan?` (judul bagian isian tambahan: Gaji Bersih "Atur tunjangan, BPJS, dan iuran lain", THR "Atur kepesertaan BPJS", IPK "Gabungkan dengan IPK sebelumnya"); `IsianPilihan.tampilan?: 'kisi'` untuk status PTKP.
  - Ikon `chevron-down`, `plus`, `x` (Lucide, path disalin seperti ikon lain).
  - E2E: `TOOLS_CONTOH` (slug, nama, angka utama hasil contoh) di `tests/e2e/data.ts`; keenam tools seed diterbitkan di database E2E.

Halaman mengikuti pola tools di spesifikasi §4: kalkulator di atas lipatan dengan hasil besar, lalu artikel penjelasan rumus. Urutannya: kepala (remah roti, chip pilar, H1 "Kalkulator {nama}", ringkasan, "Aturan diperiksa {tanggal}"), kalkulator (form dan kotak hasil; berdampingan mulai 1024 px dengan hasil `sticky`, bertumpuk di bawahnya), lalu badan artikel (penjelasan rumus, "Angka aturan yang dipakai" dengan tanggal berlaku dan sumber setiap parameter, catatan pilar, sumber aturan, FAQ). JSON-LD WebApplication dan metadata dari modul SEO. Jarak antarbagian hanya dari `gap` 40 px (diuji E2E).

Task ini membangun semua bagian sebagai server component, jadi HTML awal sudah berisi form terisi contoh dan hasil contoh dari server (judul kotak "Contoh hasil"); Task 9 menambah komponen klien yang membuat tombol "Hitung" bekerja. Tanpa JavaScript, form dan hasil contoh tetap tampil dengan pesan `<noscript>` "Kalkulator ini butuh JavaScript untuk menghitung angkamu. Hasil yang tampil memakai angka contoh di form." Bila parameter wajib belum ada di CMS, kalkulator diganti pesan dari modul `hitung` dan artikel tetap tampil.

Form (`FormKalkulator`) mengikuti spesifikasi §14:

| Isian | Tampilan |
|---|---|
| Angka | Label terlihat; satuan rupiah dibacakan " dalam rupiah" (teks khusus pembaca layar), satuan lain tampil di ujung isian (kg, cm, %, tahun); `inputmode` `numeric` atau `decimal`; bantuan dan galat lewat `aria-describedby`; galat di `<p aria-live="polite">` di bawah isian dan `aria-invalid`. |
| Pilihan sampai 4 opsi | Radio dalam `fieldset` dengan `legend`. |
| Status PTKP (`tampilan: 'kisi'`) | Kisi 4 kolom radio dengan kode terlihat ("TK/0") dan label lengkap untuk pembaca layar ("TK/0: tidak kawin, tanpa tanggungan"); `<select>` dengan label panjang terpotong di 375 px pada probe awal. |
| Pilihan lebih dari 4 opsi | `<select>` dengan chevron. |
| Centang | Checkbox dengan target 44 px. |
| Baris (IPK) | Daftar baris "Mata kuliah 1", "Mata kuliah 2", dan seterusnya dengan SKS dan nilai huruf, tombol hapus per baris (ikon x dengan nama "Hapus mata kuliah 2") dan tombol "Tambah mata kuliah". |
| Isian `lanjutan` | Di dalam `<details>` berjudul `lanjutan`, supaya form utama pendek. |

Kotak hasil (`HasilKalkulator`) adalah `<section>` berlabel "Contoh hasil" (hasil dari server) atau "Hasil hitunganmu", dengan angka utama satu baris yang ukurannya mengikuti panjang teksnya (`--panjang`, container query; Rp10.000.000.000 tetap muat di 375 px), keterangan, ringkasan (`<dl>`), rincian langkah di `<details>`, catatan, dan peringatan parameter. Kotak hasil berlatar warna pilar versi lembut (`data-warna`), form bergaris seperti kartu tools.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/halaman-tool.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it } from 'vitest'

  import { HalamanTool } from '@/components/tools/HalamanTool'
  import type { ToolId } from '@/lib/konstanta'
  import { susunKalkulator, susunTool } from '@/modules/konten/tools'
  import type { Pilar, Tool } from '@/payload-types'
  import { PARAMETER_AWAL } from '@/seed/parameter-tools'
  import { TOOLS_AWAL } from '@/seed/tools'

  import { situs } from './seo-contoh'

  const waktu = { createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-02T00:00:00.000Z' }
  const PILAR: Record<string, Pilar> = {
    'uang-karier': { id: 1, nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau', deskripsi: 'Uang.', urutan: 1, disclaimer: 'Bukan saran keuangan.', ...waktu },
    belajar: { id: 3, nama: 'Belajar', slug: 'belajar', warna: 'kuning', deskripsi: 'Belajar.', urutan: 3, ...waktu },
  }

  /** Dokumen tools terbit dari data seed, dirender seperti halaman `/tools/{slug}` pada 5 November 2026. */
  function render(toolId: ToolId, parameter = PARAMETER_AWAL) {
    const awal = TOOLS_AWAL.find((t) => t.toolId === toolId)!
    const doc = { id: 9, ...awal, slug: toolId, pilar: PILAR[awal.pilar], _status: 'published', ...waktu } as unknown as Tool
    const tool = susunTool(
      doc,
      parameter.map((p, i) => ({ ...p, id: i, ...waktu, tabel: p.tabel?.map((b, j) => ({ ...b, id: `${i}-${j}` })) })),
    )
    const { kalkulator, contoh } = susunKalkulator(tool, '2026-11-05')
    return renderToStaticMarkup(h(HalamanTool, { tool, kalkulator, contoh, situs }))
  }

  describe('HalamanTool', () => {
    const html = render('gaji-bersih')

    it('kepala: remah roti, chip pilar, H1 kalkulator, ringkasan, tanggal aturan diperiksa, JSON-LD WebApplication', () => {
      expect(html.match(/<h1/g)).toHaveLength(1)
      expect(html).toMatch(/<h1 class="[^"]*">Kalkulator Gaji Bersih<\/h1>/)
      expect(html).toContain('<span aria-current="page"')
      expect(html).toMatch(/data-warna="hijau">Uang &amp; Karier<\/span><span>Kalkulator<\/span>/)
      expect(html).toContain('Aturan diperiksa <time dateTime="2026-11-05T00:00:00.000Z">5 November 2026</time>')
      expect(html).toContain('"@type":"WebApplication"')
      expect(html).toContain('"applicationCategory":"FinanceApplication"')
    })

    it('form: label terlihat, satuan dibacakan, kisi status PTKP, isian tambahan di details, tombol menyebut hasil', () => {
      expect(html).toMatch(
        /<label for="kalkulator-gaji" class="[^"]*">Gaji pokok dan tunjangan tetap per bulan<span class="sr"> dalam rupiah<\/span><\/label>/,
      )
      expect(html).toMatch(/<input id="kalkulator-gaji" type="text" inputMode="numeric" autoComplete="off" required="" aria-describedby="kalkulator-gaji-bantuan kalkulator-gaji-galat" name="gaji" value="8.000.000"\/>/)
      expect(html).toMatch(/<p id="kalkulator-gaji-galat" class="[^"]*" aria-live="polite"><\/p>/)
      expect(html).toMatch(/<input id="kalkulator-status" type="radio" name="status" checked="" value="TK\/0"\/><span aria-hidden="true">TK\/0<\/span><span class="sr">TK\/0: tidak kawin, tanpa tanggungan<\/span>/)
      expect(html.match(/name="status"/g)).toHaveLength(8)
      expect(html).toMatch(/<summary>Atur tunjangan, BPJS, dan iuran lain<svg/)
      expect(html).toMatch(/<input id="kalkulator-bpjsKesehatan" type="checkbox" name="bpjsKesehatan" checked="" value="ya"\/>/)
      expect(html).toMatch(/<button type="submit" class="[^"]*">Hitung gaji bersih<\/button>/)
      expect(html).toContain('<noscript>')
    })

    it('hasil contoh dari server: angka besar dengan panjang teks, ringkasan, dan rincian langkah', () => {
      expect(html).toMatch(/<h2 id="kalkulator-hasil" class="[^"]*"><span class="[^"]*" aria-hidden="true"><\/span>Contoh hasil<\/h2>/)
      expect(html).toContain('Untuk angka contoh di form. Ganti angkanya, lalu tekan Hitung gaji bersih.')
      expect(html).toMatch(/<p class="[^"]*" style="--panjang:12">Rp\u00a07.554.552<\/p>/)
      expect(html).toContain('<dt>PPh 21 per bulan (TER 1,5%)</dt><dd>Rp\u00a0125.448</dd>')
      expect(html).toMatch(/<summary>Lihat rincian hitungan<svg/)
      expect(html).toContain('<h3>PPh 21 Desember: dihitung ulang setahun</h3>')
    })

    it('artikel: penjelasan rumus, angka aturan dengan tabel TER, catatan pilar, sumber, FAQ', () => {
      expect(html).toContain('<h2 id="rumus-gaji-bersih">Rumus gaji bersih</h2>')
      expect(html).toMatch(/<h2 id="angka-aturan" class="[^"]*">Angka aturan yang dipakai<\/h2>/)
      expect(html).toContain('<dt>Batas upah iuran JP</dt>')
      expect(html).toContain('Berlaku 1 Maret 2026 sampai 28 Februari 2027.')
      expect(html).toMatch(/<caption class="sr">Tarif efektif bulanan kategori A<\/caption><thead><tr><th scope="col">Bruto sebulan sampai<\/th><th scope="col">Tarif<\/th><\/tr><\/thead><tbody>(<tr>.*?<\/tr>){44}<\/tbody>/)
      expect(html).toContain('Bukan saran keuangan.')
      expect(html).toMatch(/<h2 id="sumber" class="[^"]*">Sumber<\/h2>/)
      expect(html).toMatch(/<h2 id="faq" class="[^"]*">Pertanyaan yang sering muncul<\/h2>/)
    })

    it('IPK: baris mata kuliah dengan nama isian per kolom dan tombol tambah; pilar Belajar', () => {
      const ipk = render('ipk')
      expect(ipk).toMatch(/<span id="kalkulator-matkul-0-judul" class="[^"]*">Mata kuliah 1<\/span>/)
      expect(ipk).toMatch(/<input id="kalkulator-sks-0" type="text" inputMode="numeric" autoComplete="off" required="" aria-labelledby="kalkulator-matkul-0-judul kalkulator-sks-0-label" aria-describedby="kalkulator-matkul-0-galat" name="sks" value="3"\/>/)
      expect(ipk.match(/name="nilai"/g)).toHaveLength(5)
      expect(ipk).toMatch(/aria-label="Hapus mata kuliah 5"/)
      expect(ipk).toMatch(/<button type="button" class="[^"]*"><svg[^>]*>.*?<\/svg>Tambah mata kuliah<\/button>/)
      expect(ipk).toMatch(/<p class="[^"]*" style="--panjang:4">3,56<\/p>/)
      expect(ipk).toContain('data-warna="kuning"')
    })

    it('tanpa parameter: pesan pengganti kalkulator, artikel tetap tampil', () => {
      const kosong = render('gaji-bersih', [])
      expect(kosong).not.toContain('<form')
      expect(kosong).toMatch(/<p role="note" class="[^"]*"><svg[^>]*>.*?<\/svg>Kalkulator ini sedang diperbarui: angka/)
      expect(kosong).toContain('<h2 id="rumus-gaji-bersih">Rumus gaji bersih</h2>')
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/halaman-tool.test.ts` dengan `Error: Cannot find package '@/components/tools/HalamanTool'`.

- [ ] **Langkah 3: Bagian lanjutan dan kisi status di modul `hitung`**

  ```diff
  diff --git a/src/modules/hitung/tipe.ts b/src/modules/hitung/tipe.ts
  index e7d744c..9717dbb 100644
  --- a/src/modules/hitung/tipe.ts
  +++ b/src/modules/hitung/tipe.ts
  @@ -48,7 +48,13 @@ export type IsianAngka = IsianDasar & {
     petunjuk?: string
   }
   
  -export type IsianPilihan = IsianDasar & { jenis: 'pilihan'; opsi: Opsi[]; contoh: string }
  +export type IsianPilihan = IsianDasar & {
  +  jenis: 'pilihan'
  +  opsi: Opsi[]
  +  contoh: string
  +  /** `kisi`: nilai pendek (misalnya "TK/0") tampil sebagai kisi tombol; labelnya dibacakan pembaca layar. */
  +  tampilan?: 'kisi'
  +}
   
   export type IsianCentang = IsianDasar & { jenis: 'centang'; contoh: boolean }
   
  @@ -115,6 +121,8 @@ export type Kalkulator = {
     isian: Isian[]
     contoh: Masukan
     tombol: string
  +  /** Judul bagian isian tambahan, `null` bila semua isian tampil langsung. */
  +  lanjutan: string | null
     dasar: ParameterTampil[]
     peringatan: string[]
     /** Terisi bila parameter wajib belum ada sama sekali di CMS: kalkulator tidak bisa dipakai. */
  ```

  ```diff
  diff --git a/src/modules/hitung/rumus.ts b/src/modules/hitung/rumus.ts
  index 299d926..8ccaf7f 100644
  --- a/src/modules/hitung/rumus.ts
  +++ b/src/modules/hitung/rumus.ts
  @@ -10,6 +10,8 @@ export type HasilRumus = Omit<HasilBerhasil, 'ok' | 'peringatan'>
   export type Rumus = {
     /** Teks tombol yang menyebut hasilnya, misalnya "Hitung gaji bersih". */
     tombol: string
  +  /** Judul bagian isian tambahan (`lanjutan`), misalnya "Atur tunjangan, BPJS, dan iuran lain". */
  +  lanjutan?: string
     /** Kalkulator yang dokumen parameternya dibaca (THR memakai PTKP dan TER milik Gaji Bersih). */
     sumber: ToolId[]
     /** Parameter milik kalkulator ini di koleksi `parameter-tools`. */
  ```

  ```diff
  diff --git a/src/modules/hitung/index.ts b/src/modules/hitung/index.ts
  index 1ff7b35..2cc607b 100644
  --- a/src/modules/hitung/index.ts
  +++ b/src/modules/hitung/index.ts
  @@ -80,7 +80,7 @@ export function hitung(
   
   export function siapkanKalkulator(toolId: ToolId, parameter: ParameterTersimpan[], tanggal: Date | string, teks?: TeksIsian): Kalkulator {
     const rumus = RUMUS[toolId]
  -  if (!rumus) return { isian: [], contoh: {}, tombol: '', dasar: [], peringatan: [], pesan: BELUM_TERSEDIA }
  +  if (!rumus) return { isian: [], contoh: {}, tombol: '', lanjutan: null, dasar: [], peringatan: [], pesan: BELUM_TERSEDIA }
     const aturan = aturanUntuk(rumus, parameter, tanggal)
     try {
       const isian = isianDengan(rumus, aturan, teks)
  @@ -90,10 +90,12 @@ export function siapkanKalkulator(toolId: ToolId, parameter: ParameterTersimpan[
         else aturan.tabel(d.kunci)
       }
       const dasar = aturan.tampil()
  -    return { isian, contoh: contohMasukan(isian), tombol: rumus.tombol, dasar, peringatan: [...aturan.peringatan], pesan: null }
  +    const lanjutan = rumus.lanjutan ?? null
  +    return { isian, contoh: contohMasukan(isian), tombol: rumus.tombol, lanjutan, dasar, peringatan: [...aturan.peringatan], pesan: null }
     } catch (galat) {
       if (!(galat instanceof ParameterKosong)) throw galat
  -    return { isian: [], contoh: {}, tombol: rumus.tombol, dasar: aturan.tampil(), peringatan: [...aturan.peringatan], pesan: pesanKosong(galat) }
  +    const dasar = aturan.tampil()
  +    return { isian: [], contoh: {}, tombol: rumus.tombol, lanjutan: null, dasar, peringatan: [...aturan.peringatan], pesan: pesanKosong(galat) }
     }
   }
   
  ```

  ```diff
  diff --git a/src/modules/hitung/pajak.ts b/src/modules/hitung/pajak.ts
  index d6eb45c..53c8fb8 100644
  --- a/src/modules/hitung/pajak.ts
  +++ b/src/modules/hitung/pajak.ts
  @@ -72,7 +72,8 @@ export const isianStatus: IsianPilihan = {
     jenis: 'pilihan',
     kunci: 'status',
     label: 'Status PTKP',
  -  bantuan: 'Tanggungan adalah keluarga sedarah atau semenda yang kamu biayai, paling banyak 3 orang.',
  +  bantuan: 'TK berarti tidak kawin, K berarti kawin. Angka di belakangnya jumlah tanggungan keluarga yang kamu biayai, paling banyak 3.',
  +  tampilan: 'kisi',
     opsi: STATUS_PTKP.map((s) => ({ nilai: s, label: LABEL_STATUS[s] })),
     contoh: 'TK/0',
   }
  ```

  ```diff
  diff --git a/src/modules/hitung/gaji-bersih.ts b/src/modules/hitung/gaji-bersih.ts
  index a51d8fe..d6d2dbf 100644
  --- a/src/modules/hitung/gaji-bersih.ts
  +++ b/src/modules/hitung/gaji-bersih.ts
  @@ -74,6 +74,7 @@ function hitungGajiBersih(nilai: NilaiMasukan, aturan: Aturan) {
   
   export const gajiBersih: Rumus = {
     tombol: 'Hitung gaji bersih',
  +  lanjutan: 'Atur tunjangan, BPJS, dan iuran lain',
     sumber: ['gaji-bersih'],
     parameter: PARAMETER_PAJAK,
     isian: () => [
  ```

  ```diff
  diff --git a/src/modules/hitung/thr.ts b/src/modules/hitung/thr.ts
  index 4a8a766..7482a6b 100644
  --- a/src/modules/hitung/thr.ts
  +++ b/src/modules/hitung/thr.ts
  @@ -15,6 +15,7 @@ const MASA_PENUH = 12
   
   export const thr: Rumus = {
     tombol: 'Hitung THR',
  +  lanjutan: 'Atur kepesertaan BPJS',
     sumber: ['gaji-bersih'],
     parameter: [],
     isian: () => [
  ```

  ```diff
  diff --git a/src/modules/hitung/ipk.ts b/src/modules/hitung/ipk.ts
  index 7b55f9c..027691c 100644
  --- a/src/modules/hitung/ipk.ts
  +++ b/src/modules/hitung/ipk.ts
  @@ -11,6 +11,7 @@ const duaDesimal = (n: number) => Math.round(n * 100) / 100
   
   export const ipk: Rumus = {
     tombol: 'Hitung IPK',
  +  lanjutan: 'Gabungkan dengan IPK sebelumnya',
     sumber: ['ipk'],
     parameter: [
       {
  ```

- [ ] **Langkah 4: Ikon baru**

  ```diff
  diff --git a/src/components/dasar/Ikon.tsx b/src/components/dasar/Ikon.tsx
  index 3d1e1fb..88e6fe0 100644
  --- a/src/components/dasar/Ikon.tsx
  +++ b/src/components/dasar/Ikon.tsx
  @@ -3,7 +3,7 @@ import type { ReactNode } from 'react'
   /*
    * Ikon stroke dari Lucide 1.68.0 (https://lucide.dev), disalin sebagai path supaya tanpa dependensi
    * dan tanpa JavaScript klien. Lisensi: ISC, Copyright (c) 2026 Lucide Icons and Contributors;
  - * arrow-right, arrow-up-right, calendar, chevron-right, clock, dan info berasal dari Feather
  + * arrow-right, arrow-up-right, calendar, chevron-down, chevron-right, clock, info, plus, dan x berasal dari Feather
    * (MIT, Copyright (c) 2013-present Cole Bemis). Teks lisensi lengkap: paket `lucide-static`.
    */
   const PATH = {
  @@ -41,6 +41,7 @@ const PATH = {
         <path d="M3 9h18" />
       </>
     ),
  +  'chevron-down': <path d="m6 9 6 6 6-6" />,
     'chevron-right': <path d="m9 18 6-6-6-6" />,
     clock: (
       <>
  @@ -62,6 +63,12 @@ const PATH = {
         <path d="M10 22h4" />
       </>
     ),
  +  plus: (
  +    <>
  +      <path d="M5 12h14" />
  +      <path d="M12 5v14" />
  +    </>
  +  ),
     play: <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />,
     'triangle-alert': (
       <>
  @@ -70,6 +77,12 @@ const PATH = {
         <path d="M12 17h.01" />
       </>
     ),
  +  x: (
  +    <>
  +      <path d="M18 6 6 18" />
  +      <path d="m6 6 12 12" />
  +    </>
  +  ),
   } satisfies Record<string, ReactNode>
   
   export type NamaIkon = keyof typeof PATH
  ```

- [ ] **Langkah 5: Form, hasil, dan angka aturan**

  `src/components/tools/Kalkulator.module.css`

  ```css
  /*
   * Kalkulator (spesifikasi §4: di atas lipatan, hasil besar; §14: label terlihat, galat di bawah field,
   * target sentuh 44 px). Form bergaris seperti kartu tools, hasil di kartu warna pilar versi lembut.
   * HP dan tablet: form lalu hasil. Mulai 1024 px: berdampingan, hasil menempel saat digulir.
   */
  .kalkulator {
    display: grid;
    gap: var(--ruang-4);
    align-items: start;
  }

  .kalkulator > * {
    min-width: 0;
  }

  @media (min-width: 64rem) {
    .kalkulator {
      grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
      gap: var(--ruang-6);
    }

    .hasil {
      position: sticky;
      top: var(--ruang-6);
    }
  }

  /* Form */
  .form {
    display: grid;
    gap: var(--ruang-6);
    padding: var(--ruang-5);
    border: var(--garis-tebal) solid var(--garis);
    border-radius: var(--radius-kartu);
  }

  @media (min-width: 48rem) {
    .form {
      padding: var(--ruang-8);
    }
  }

  .isian {
    display: flex;
    flex-direction: column;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }

  .label {
    padding: 0;
    font-weight: 700;
    line-height: 1.3;
  }

  .bantuan {
    margin-top: var(--ruang-1);
    color: var(--teks-sekunder);
    font-size: var(--teks-kecil);
    line-height: 1.45;
  }

  .kotak,
  .pilih {
    position: relative;
    display: flex;
    align-items: center;
    min-width: 0;
    min-height: 56px;
    margin-top: var(--ruang-2);
    border: var(--garis-tebal) solid var(--garis);
    border-radius: var(--radius-kontrol);
    background: var(--latar);
  }

  .kotak:focus-within,
  .pilih:focus-within {
    outline: var(--fokus-tebal) solid var(--fokus);
    outline-offset: var(--fokus-jarak);
  }

  .kotak input,
  .pilih select {
    flex: 1;
    min-width: 0;
    height: 52px;
    padding: 0 var(--ruang-4);
    border: 0;
    border-radius: var(--radius-kontrol);
    background: transparent;
    font-size: 18px;
    font-variant-numeric: tabular-nums;
  }

  .kotak input:focus-visible,
  .pilih select:focus-visible {
    outline: none;
  }

  .kotak:has([aria-invalid='true']),
  .pilih:has([aria-invalid='true']) {
    box-shadow: inset 0 0 0 var(--garis-tebal) var(--garis);
  }

  .satuan {
    flex: none;
    padding-inline: var(--ruang-4);
    color: var(--teks-sekunder);
    font-weight: 600;
  }

  .satuan:first-child {
    padding-right: 0;
  }

  .satuan:last-child {
    padding-left: 0;
  }

  .pilih select {
    appearance: none;
    padding-right: var(--ruang-12);
    text-overflow: ellipsis;
    cursor: pointer;
  }

  .panah {
    flex: none;
    pointer-events: none;
  }

  .pilih .panah {
    position: absolute;
    right: var(--ruang-4);
  }

  /* Pilihan sampai empat: tombol radio dan centang dengan label yang boleh turun baris. */
  .opsi {
    display: grid;
    gap: var(--ruang-2);
    margin-top: var(--ruang-2);
  }

  .opsiItem {
    display: flex;
    align-items: center;
    gap: var(--ruang-3);
    min-width: 0;
    min-height: var(--sentuh-min);
    padding: var(--ruang-2) var(--ruang-4);
    border: var(--garis-tipis) solid var(--garis);
    border-radius: var(--radius-kontrol);
    line-height: 1.35;
    cursor: pointer;
  }

  .opsiItem:has(input:checked) {
    box-shadow: inset 0 0 0 1px var(--garis);
    background: var(--permukaan);
    font-weight: 600;
  }

  .opsiItem input {
    flex: none;
    width: 20px;
    height: 20px;
    margin: 0;
    accent-color: var(--teks);
  }

  /* Kisi pilihan pendek (status PTKP): empat kolom, pilihan aktif terisi gelap. */
  .kisi {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--ruang-2);
    margin-top: var(--ruang-2);
  }

  .kisiItem {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: var(--sentuh-min);
    border: var(--garis-tipis) solid var(--garis);
    border-radius: var(--radius-kontrol);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }

  .kisiItem input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }

  .kisiItem:has(input:checked) {
    border-color: var(--tombol);
    background: var(--tombol);
    color: var(--tombol-teks);
  }

  .kisiItem:has(input:focus-visible) {
    outline: var(--fokus-tebal) solid var(--fokus);
    outline-offset: var(--fokus-jarak);
  }

  .galat {
    display: flex;
    align-items: flex-start;
    gap: var(--ruang-2);
    font-size: var(--teks-kecil);
    font-weight: 700;
    line-height: 1.4;
  }

  .galat:not(:empty) {
    margin-top: var(--ruang-2);
  }

  .galat svg {
    flex: none;
    margin-top: 1px;
  }

  /* Isian baris (IPK): judul baris, SKS, nilai huruf, dan tombol hapus. */
  .daftarBaris {
    display: grid;
    gap: var(--ruang-3);
    margin-top: var(--ruang-3);
    padding: 0;
    list-style: none;
  }

  .baris {
    display: grid;
    grid-template-columns: minmax(0, 5rem) minmax(0, 1fr) var(--sentuh-min);
    grid-template-areas:
      'judul judul judul'
      'angka pilihan hapus'
      'galat galat galat';
    column-gap: var(--ruang-3);
    align-items: end;
    padding-bottom: var(--ruang-3);
    border-bottom: 1px solid var(--garis);
  }

  .judulBaris {
    grid-area: judul;
    font-size: var(--teks-kecil);
    font-weight: 700;
  }

  .selAngka,
  .selPilihan {
    min-width: 0;
  }

  .selAngka {
    grid-area: angka;
  }

  .selPilihan {
    grid-area: pilihan;
  }

  .baris .galat {
    grid-area: galat;
  }

  .labelKecil {
    display: block;
    color: var(--teks-sekunder);
    font-size: var(--teks-label);
    font-weight: 700;
  }

  .hapus,
  .tambah {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--ruang-2);
    min-width: var(--sentuh-min);
    min-height: var(--sentuh-min);
    border: var(--garis-tipis) solid var(--garis);
    border-radius: var(--radius-kontrol);
    background: var(--latar);
    font-weight: 700;
    cursor: pointer;
  }

  .hapus {
    grid-area: hapus;
    margin-bottom: 6px;
  }

  .tambah {
    align-self: flex-start;
    margin-top: var(--ruang-3);
    padding: 0 var(--ruang-4);
  }

  .hapus:disabled,
  .tambah:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  /* Isian tambahan */
  .lanjutan {
    border-top: var(--garis-tipis) solid var(--garis);
    border-bottom: var(--garis-tipis) solid var(--garis);
  }

  .lanjutan summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ruang-3);
    min-height: 56px;
    font-weight: 700;
    line-height: 1.35;
    list-style: none;
    cursor: pointer;
  }

  .lanjutan summary::-webkit-details-marker {
    display: none;
  }

  .lanjutan[open] > summary .panah,
  .rincian[open] > summary .panah {
    transform: rotate(180deg);
  }

  .lanjutanIsi {
    display: grid;
    gap: var(--ruang-5);
    padding-bottom: var(--ruang-5);
  }

  .tombol {
    min-height: 56px;
    padding: 0 var(--ruang-6);
    border: 0;
    border-radius: var(--radius-kontrol);
    background: var(--tombol);
    color: var(--tombol-teks);
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    transition: transform var(--durasi-cepat) var(--kurva);
  }

  .tombol:active {
    transform: scale(0.98);
  }

  .tanpaJs {
    color: var(--teks-sekunder);
    font-size: var(--teks-kecil);
  }

  /* Hasil */
  .hasil {
    container-type: inline-size;
    display: grid;
    gap: var(--ruang-4);
    padding: var(--ruang-6);
    border-radius: var(--radius-kartu);
    background: var(--pilar-lembut, var(--permukaan));
  }

  .kicker {
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

  .status {
    margin-top: calc(var(--ruang-2) * -1);
    font-size: var(--teks-kecil);
    line-height: 1.45;
  }

  .utama {
    display: grid;
    gap: var(--ruang-2);
  }

  .labelUtama {
    font-weight: 700;
  }

  /* Angka hasil: sebesar mungkin sampai 88 px, tetapi selalu muat satu baris di lebar kotak. Satu
     karakter Archivo lebar 68% dengan angka tabular sekitar 0,39 em; 0,44 memberi ruang untuk "Rp". */
  .angka {
    font-size: min(5.5rem, calc(100cqi / (var(--panjang, 10) * 0.44)));
    font-stretch: var(--lebar-display);
    font-weight: 900;
    font-variant-numeric: tabular-nums;
    line-height: 1;
    letter-spacing: -0.02em;
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: no-preference) {
    .baru {
      animation: muncul var(--durasi-sedang) var(--kurva) both;
    }
  }

  @keyframes muncul {
    from {
      opacity: 0;
      transform: translateY(0.3em);
    }
  }

  .keterangan {
    font-size: var(--teks-kecil);
    line-height: 1.45;
  }

  .ringkasan {
    border-top: var(--garis-tebal) solid var(--garis);
  }

  .ringkasan > div,
  .slip > div {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--ruang-1) var(--ruang-4);
    padding-block: var(--ruang-3);
    border-bottom: 1px solid var(--garis);
  }

  .ringkasan dt,
  .slip dt {
    flex: 1 1 12rem;
    min-width: 0;
    line-height: 1.35;
  }

  .ringkasan dd,
  .slip dd {
    margin: 0 0 0 auto;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    text-align: right;
    overflow-wrap: anywhere;
  }

  .peringatan {
    display: flex;
    gap: var(--ruang-2);
    padding: var(--ruang-3) var(--ruang-4);
    border: var(--garis-tipis) solid var(--garis);
    border-radius: var(--radius-kontrol);
    background: var(--latar);
    font-size: var(--teks-kecil);
    line-height: 1.45;
  }

  .peringatan svg {
    flex: none;
    margin-top: 2px;
  }

  .catatan {
    color: var(--teks);
    font-size: var(--teks-kecil);
    line-height: 1.45;
  }

  .rincian summary {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: var(--sentuh-min);
    font-weight: 700;
    list-style: none;
    cursor: pointer;
  }

  .rincian summary::-webkit-details-marker {
    display: none;
  }

  .bagianRincian {
    margin-top: var(--ruang-4);
  }

  .bagianRincian h3 {
    font-size: var(--teks-label);
    font-weight: 800;
    letter-spacing: var(--jarak-label);
    text-transform: uppercase;
  }

  .slip > div {
    border-bottom-style: dashed;
    font-size: var(--teks-kecil);
  }

  .slip dt span {
    display: block;
    margin-top: 2px;
    font-size: var(--teks-label);
    overflow-wrap: anywhere;
  }
  ```

  `src/components/tools/FormKalkulator.tsx`

  ```tsx
  import type { FocusEventHandler, FormEventHandler } from 'react'

  import { Ikon } from '@/components/dasar/Ikon'
  import type { Isian, IsianAngka, IsianBaris, IsianCentang, IsianPilihan, Masukan, Satuan } from '@/modules/hitung'

  import gaya from './Kalkulator.module.css'

  /** Simbol di dalam kotak isian (disembunyikan dari pembaca layar) dan teks yang dibacakan sebagai gantinya. */
  const SATUAN: Partial<Record<Satuan, { simbol: string; dibaca: string; depan?: boolean }>> = {
    rupiah: { simbol: 'Rp', dibaca: 'dalam rupiah', depan: true },
    persen: { simbol: '%', dibaca: 'dalam persen' },
    kg: { simbol: 'kg', dibaca: 'dalam kilogram' },
    cm: { simbol: 'cm', dibaca: 'dalam sentimeter' },
    tahun: { simbol: 'tahun', dibaca: 'dalam tahun' },
    bulan: { simbol: 'bulan', dibaca: 'dalam bulan' },
  }

  /** Sampai 4 pilihan tampil sebagai tombol radio supaya label panjang tetap terbaca; lebih dari itu sebagai daftar. */
  export const MAKS_RADIO = 4

  /** Id elemen isian; isian baris memakai id barisnya. Dipakai juga untuk memindahkan fokus ke isian yang salah. */
  export const idIsian = (idForm: string, kunci: string, idBaris?: number) => (idBaris === undefined ? `${idForm}-${kunci}` : `${idForm}-${kunci}-${idBaris}`)

  /** Id baris awal setiap isian baris: 0 sampai jumlah contoh dikurangi 1, sesuai urutan nilai awal. */
  export function barisAwal(isian: Isian[]): Record<string, number[]> {
    return Object.fromEntries(isian.filter((i): i is IsianBaris => i.jenis === 'baris').map((i) => [i.kunci, i.contoh.map((_, n) => n)]))
  }

  export type PropsForm = {
    id: string
    isian: Isian[]
    /** Nilai awal isian (input tidak dikendalikan React; nilai terbaru dibaca dari form). */
    nilai: Masukan
    galat: Record<string, string>
    tombol: string
    lanjutan: string | null
    baris: Record<string, number[]>
    onSubmit?: FormEventHandler<HTMLFormElement>
    onBlur?: FocusEventHandler<HTMLFormElement>
    onTambah?: (kunci: string) => void
    onHapus?: (kunci: string, idBaris: number) => void
  }

  function Galat({ id, pesan }: { id: string; pesan?: string }) {
    return (
      <p id={id} className={gaya.galat} aria-live="polite">
        {pesan && (
          <>
            <Ikon nama="triangle-alert" ukuran={18} />
            {pesan}
          </>
        )}
      </p>
    )
  }

  const keterangan = (...id: (string | false | null)[]) => id.filter(Boolean).join(' ')

  type PropsKotak = { id: string; nilai: string; galat?: string; describedBy: string; labelledBy?: string }

  function KotakAngka({ i, id, nilai, galat, describedBy, labelledBy }: PropsKotak & { i: IsianAngka }) {
    const satuan = SATUAN[i.satuan]
    return (
      <div className={gaya.kotak}>
        {satuan?.depan && (
          <span className={gaya.satuan} aria-hidden="true">
            {satuan.simbol}
          </span>
        )}
        <input
          id={id}
          name={i.kunci}
          type="text"
          inputMode={i.desimal ? 'decimal' : 'numeric'}
          autoComplete="off"
          defaultValue={nilai}
          required={i.wajib}
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          aria-invalid={galat ? true : undefined}
        />
        {satuan && !satuan.depan && (
          <span className={gaya.satuan} aria-hidden="true">
            {satuan.simbol}
          </span>
        )}
      </div>
    )
  }

  function Daftar({ i, id, nilai, galat, describedBy, labelledBy, kosong }: PropsKotak & { i: IsianPilihan; kosong?: boolean }) {
    return (
      <div className={gaya.pilih}>
        <select
          id={id}
          name={i.kunci}
          defaultValue={nilai}
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          aria-invalid={galat ? true : undefined}
        >
          {kosong && <option value="">Pilih</option>}
          {i.opsi.map((o) => (
            <option key={o.nilai} value={o.nilai}>
              {o.label}
            </option>
          ))}
        </select>
        <Ikon nama="chevron-down" className={gaya.panah} />
      </div>
    )
  }

  function Bantuan({ id, teks }: { id: string; teks: string | null }) {
    return teks ? (
      <p id={`${id}-bantuan`} className={gaya.bantuan}>
        {teks}
      </p>
    ) : null
  }

  function IsianTunggal({ i, idForm, nilai, galat }: { i: IsianAngka | IsianPilihan | IsianCentang; idForm: string; nilai: Masukan; galat: Record<string, string> }) {
    const id = idIsian(idForm, i.kunci)
    const teks = typeof nilai[i.kunci] === 'string' ? (nilai[i.kunci] as string) : ''
    if (i.jenis === 'centang') {
      return (
        <div className={gaya.isian}>
          <label className={gaya.opsiItem}>
            <input id={id} type="checkbox" name={i.kunci} value="ya" defaultChecked={teks === 'ya'} aria-describedby={i.bantuan ? `${id}-bantuan` : undefined} />
            <span>{i.label}</span>
          </label>
          <Bantuan id={id} teks={i.bantuan} />
        </div>
      )
    }
    if (i.jenis === 'pilihan' && i.tampilan === 'kisi') {
      return (
        <fieldset className={gaya.isian} aria-describedby={keterangan(Boolean(i.bantuan) && `${id}-bantuan`, `${id}-galat`)}>
          <legend className={gaya.label}>{i.label}</legend>
          <Bantuan id={id} teks={i.bantuan} />
          <div className={gaya.kisi}>
            {i.opsi.map((o, n) => (
              <label key={o.nilai} className={gaya.kisiItem}>
                <input id={n === 0 ? id : `${id}-${n}`} type="radio" name={i.kunci} value={o.nilai} defaultChecked={o.nilai === teks} />
                <span aria-hidden="true">{o.nilai}</span>
                <span className="sr">{o.label}</span>
              </label>
            ))}
          </div>
          <Galat id={`${id}-galat`} pesan={galat[i.kunci]} />
        </fieldset>
      )
    }
    if (i.jenis === 'pilihan' && i.opsi.length <= MAKS_RADIO) {
      return (
        <fieldset className={gaya.isian} aria-describedby={keterangan(Boolean(i.bantuan) && `${id}-bantuan`, `${id}-galat`)}>
          <legend className={gaya.label}>{i.label}</legend>
          <Bantuan id={id} teks={i.bantuan} />
          <div className={gaya.opsi}>
            {i.opsi.map((o, n) => (
              <label key={o.nilai} className={gaya.opsiItem}>
                <input id={n === 0 ? id : `${id}-${n}`} type="radio" name={i.kunci} value={o.nilai} defaultChecked={o.nilai === teks} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
          <Galat id={`${id}-galat`} pesan={galat[i.kunci]} />
        </fieldset>
      )
    }
    const satuan = i.jenis === 'angka' ? SATUAN[i.satuan] : undefined
    const describedBy = keterangan(Boolean(i.bantuan) && `${id}-bantuan`, `${id}-galat`)
    return (
      <div className={gaya.isian}>
        <label htmlFor={id} className={gaya.label}>
          {i.label}
          {satuan && <span className="sr"> {satuan.dibaca}</span>}
        </label>
        <Bantuan id={id} teks={i.bantuan} />
        {i.jenis === 'angka' ? (
          <KotakAngka i={i} id={id} nilai={teks} galat={galat[i.kunci]} describedBy={describedBy} />
        ) : (
          <Daftar i={i} id={id} nilai={teks} galat={galat[i.kunci]} describedBy={describedBy} />
        )}
        <Galat id={`${id}-galat`} pesan={galat[i.kunci]} />
      </div>
    )
  }

  function IsianDaftarBaris({ i, idForm, nilai, galat, baris, onTambah, onHapus }: { i: IsianBaris; idForm: string } & Pick<PropsForm, 'nilai' | 'galat' | 'baris' | 'onTambah' | 'onHapus'>) {
    const [kolomAngka, kolomPilihan] = i.kolom
    const daftar = baris[i.kunci] ?? []
    const awal = (kunci: string, idBaris: number) => (nilai[kunci] as string[] | undefined)?.[idBaris] ?? ''
    const id = idIsian(idForm, i.kunci)
    const nama = i.labelBaris.toLowerCase()
    return (
      <fieldset className={gaya.isian} aria-describedby={i.bantuan ? `${id}-bantuan` : undefined}>
        <legend className={gaya.label}>{i.label}</legend>
        <Bantuan id={id} teks={i.bantuan} />
        <ol className={gaya.daftarBaris}>
          {daftar.map((idBaris, n) => {
            const judul = `${id}-${idBaris}-judul`
            const idAngka = idIsian(idForm, kolomAngka.kunci, idBaris)
            const idPilihan = idIsian(idForm, kolomPilihan.kunci, idBaris)
            const pesan = [galat[`${kolomAngka.kunci}.${n}`], galat[`${kolomPilihan.kunci}.${n}`]].filter(Boolean).join(' ')
            const idGalat = `${id}-${idBaris}-galat`
            return (
              <li key={idBaris} className={gaya.baris}>
                <span id={judul} className={gaya.judulBaris}>
                  {i.labelBaris} {n + 1}
                </span>
                <div className={gaya.selAngka}>
                  <label id={`${idAngka}-label`} htmlFor={idAngka} className={gaya.labelKecil}>
                    {kolomAngka.label}
                  </label>
                  <KotakAngka
                    i={kolomAngka}
                    id={idAngka}
                    nilai={awal(kolomAngka.kunci, idBaris)}
                    galat={galat[`${kolomAngka.kunci}.${n}`]}
                    describedBy={idGalat}
                    labelledBy={`${judul} ${idAngka}-label`}
                  />
                </div>
                <div className={gaya.selPilihan}>
                  <label id={`${idPilihan}-label`} htmlFor={idPilihan} className={gaya.labelKecil}>
                    {kolomPilihan.label}
                  </label>
                  <Daftar
                    i={kolomPilihan}
                    id={idPilihan}
                    nilai={awal(kolomPilihan.kunci, idBaris)}
                    galat={galat[`${kolomPilihan.kunci}.${n}`]}
                    describedBy={idGalat}
                    labelledBy={`${judul} ${idPilihan}-label`}
                    kosong
                  />
                </div>
                <button
                  type="button"
                  className={gaya.hapus}
                  aria-label={`Hapus ${nama} ${n + 1}`}
                  disabled={daftar.length === 1}
                  onClick={onHapus ? () => onHapus(i.kunci, idBaris) : undefined}
                >
                  <Ikon nama="x" />
                </button>
                {/* Satu pesan galat per baris; kedua kolom merujuknya. */}
                <Galat id={idGalat} pesan={pesan} />
              </li>
            )
          })}
        </ol>
        <button type="button" className={gaya.tambah} disabled={daftar.length >= i.maks} onClick={onTambah ? () => onTambah(i.kunci) : undefined}>
          <Ikon nama="plus" />
          Tambah {nama}
        </button>
      </fieldset>
    )
  }

  /**
   * Form kalkulator dari definisi isian modul hitung. Input tidak dikendalikan React: nilai awal dari
   * contoh, nilai terbaru dibaca dari form saat dikirim. Tanpa JavaScript form tetap tampil lengkap
   * (hasil contoh dirender server); `Kalkulator` memasang perilakunya. Isian tambahan ada di `<details>`.
   */
  export function FormKalkulator({ id, isian, nilai, galat, tombol, lanjutan, baris, onSubmit, onBlur, onTambah, onHapus }: PropsForm) {
    const tampil = (i: Isian) =>
      i.jenis === 'baris' ? (
        <IsianDaftarBaris key={i.kunci} i={i} idForm={id} nilai={nilai} galat={galat} baris={baris} onTambah={onTambah} onHapus={onHapus} />
      ) : (
        <IsianTunggal key={i.kunci} i={i} idForm={id} nilai={nilai} galat={galat} />
      )
    const tambahan = isian.filter((i) => i.lanjutan)
    return (
      <form id={id} className={gaya.form} noValidate onSubmit={onSubmit} onBlur={onBlur}>
        {isian.filter((i) => !i.lanjutan).map(tampil)}
        {tambahan.length > 0 && (
          <details className={gaya.lanjutan}>
            <summary>
              {lanjutan ?? 'Isian lain'}
              <Ikon nama="chevron-down" className={gaya.panah} />
            </summary>
            <div className={gaya.lanjutanIsi}>{tambahan.map(tampil)}</div>
          </details>
        )}
        <button type="submit" className={gaya.tombol}>
          {tombol}
        </button>
        <noscript>
          <p className={gaya.tanpaJs}>Kalkulator ini butuh JavaScript untuk menghitung angkamu. Hasil yang tampil memakai angka contoh di form.</p>
        </noscript>
      </form>
    )
  }
  ```

  `src/components/tools/HasilKalkulator.tsx`

  ```tsx
  import type { CSSProperties } from 'react'

  import { Ikon } from '@/components/dasar/Ikon'
  import type { HasilBerhasil } from '@/modules/hitung'

  import gaya from './Kalkulator.module.css'

  /**
   * Hasil kalkulator: angka utama besar (Archivo tebal seperti judul raksasa beranda), ringkasan, lalu
   * rincian langkah hitung yang bisa dibuka. Ukuran angka menyesuaikan panjang teksnya (`--panjang`)
   * dan lebar kotak, jadi Rp10 miliar tetap satu baris di layar 375 px. Angka baru muncul dengan
   * animasi CSS (naik + opacity); hasil contoh dari server tidak dianimasikan.
   */
  export function HasilKalkulator({ id, hasil, baru, tombol, urutan = 0 }: { id: string; hasil: HasilBerhasil; baru: boolean; tombol: string; urutan?: number }) {
    const { utama } = hasil
    return (
      <section className={gaya.hasil} aria-labelledby={`${id}-hasil`}>
        <h2 id={`${id}-hasil`} className={gaya.kicker}>
          <span className={gaya.titik} aria-hidden="true" />
          {baru ? 'Hasil hitunganmu' : 'Contoh hasil'}
        </h2>
        <p className={gaya.status}>{baru ? 'Untuk angka yang kamu isi.' : `Untuk angka contoh di form. Ganti angkanya, lalu tekan ${tombol}.`}</p>
        <div className={gaya.utama}>
          <p className={gaya.labelUtama}>{utama.label}</p>
          <p key={urutan} className={baru ? `${gaya.angka} ${gaya.baru}` : gaya.angka} style={{ '--panjang': utama.teks.length } as CSSProperties}>
            {utama.teks}
          </p>
          {utama.keterangan && <p className={gaya.keterangan}>{utama.keterangan}</p>}
        </div>
        {hasil.ringkasan.length > 0 && (
          <dl className={gaya.ringkasan}>
            {hasil.ringkasan.map((a) => (
              <div key={a.label}>
                <dt>{a.label}</dt>
                <dd>{a.teks}</dd>
              </div>
            ))}
          </dl>
        )}
        {hasil.peringatan.map((p) => (
          <p key={p} role="note" className={gaya.peringatan}>
            <Ikon nama="triangle-alert" ukuran={18} />
            {p}
          </p>
        ))}
        {hasil.catatan && <p className={gaya.catatan}>{hasil.catatan}</p>}
        {hasil.rincian.length > 0 && (
          <details className={gaya.rincian}>
            <summary>
              Lihat rincian hitungan
              <Ikon nama="chevron-down" className={gaya.panah} />
            </summary>
            {hasil.rincian.map((b) => (
              <div key={b.judul} className={gaya.bagianRincian}>
                <h3>{b.judul}</h3>
                <dl className={gaya.slip}>
                  {b.langkah.map((l, n) => (
                    <div key={n}>
                      <dt>
                        {l.label}
                        {l.catatan && <span>{l.catatan}</span>}
                      </dt>
                      <dd>{l.teks}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </details>
        )}
      </section>
    )
  }
  ```

  `src/components/tools/AturanTool.tsx`

  ```tsx
  import type { ParameterTampil } from '@/modules/hitung'

  import gaya from './Tool.module.css'

  /**
   * Parameter yang berlaku pada tanggal hitung, lengkap dengan tanggal berlaku dan sumbernya (rambu
   * kredibilitas, spesifikasi §3). Satu baris per angka; tabel panjang (tarif TER) bisa dibuka.
   */
  export function AturanTool({ dasar }: { dasar: ParameterTampil[] }) {
    if (dasar.length === 0) return null
    return (
      <section aria-labelledby="angka-aturan" className={gaya.aturan}>
        <h2 id="angka-aturan" className={gaya.subjudul}>
          Angka aturan yang dipakai
        </h2>
        <p className={gaya.pengantar}>Angka ini tersimpan bersama tanggal berlaku dan sumbernya, dan diperbarui saat aturannya berubah.</p>
        <dl className={gaya.daftarAturan}>
          {dasar.map((d) => (
            <div key={d.kunci}>
              <dt>{d.label}</dt>
              <dd className={gaya.nilaiAturan}>{d.jenis === 'angka' ? d.teks : `${d.baris.length} baris`}</dd>
              <dd className={gaya.metaAturan}>
                Berlaku {d.berlaku}.
                {d.sumber && (
                  <>
                    {' '}
                    Sumber:{' '}
                    <a href={d.sumber.url} rel="noopener">
                      {d.sumber.judul}
                    </a>
                  </>
                )}
              </dd>
              {d.jenis === 'tabel' && (
                <dd className={gaya.metaAturan}>
                  <details className={gaya.tabelAturan}>
                    <summary>
                      Lihat tabel<span className="sr"> {d.label}</span>
                    </summary>
                    <table>
                      <caption className="sr">{d.label}</caption>
                      <thead>
                        <tr>
                          {d.kolom.map((k) => (
                            <th key={k} scope="col">
                              {k}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {d.baris.map((b, n) => (
                          <tr key={n}>
                            {b.map((sel, m) => (
                              <td key={m}>{sel}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                </dd>
              )}
            </div>
          ))}
        </dl>
      </section>
    )
  }
  ```

- [ ] **Langkah 6: Halaman dan rute**

  `src/components/tools/Tool.module.css`

  ```css
  /* Halaman kalkulator: kepala seperti artikel, kalkulator, lalu artikel penjelasan satu kolom. Jarak
     antarbagian hanya dari `gap`. */
  .halaman {
    display: grid;
    gap: var(--ruang-10);
    padding-top: var(--ruang-4);
  }

  .halaman > * {
    min-width: 0;
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
    margin-top: var(--ruang-4);
    font-size: var(--teks-kecil);
    font-weight: 600;
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

  .diperiksa {
    display: inline-flex;
    align-items: center;
    gap: var(--ruang-2);
    color: var(--teks-sekunder);
    font-size: var(--teks-kecil);
  }

  .pesan {
    display: flex;
    gap: var(--ruang-3);
    max-width: var(--baris-isi);
    padding: var(--ruang-5);
    border: var(--garis-tebal) solid var(--garis);
    border-radius: var(--radius-kartu);
    font-weight: 600;
  }

  .pesan svg {
    flex: none;
  }

  .badan {
    display: grid;
    gap: var(--ruang-10);
    max-width: 720px;
  }

  .badan > * {
    min-width: 0;
  }

  .aturan {
    max-width: var(--baris-isi);
  }

  .subjudul {
    font-size: var(--teks-h2);
    font-stretch: var(--lebar-h2);
    font-weight: 900;
  }

  .pengantar {
    margin-top: var(--ruang-3);
    color: var(--teks-sekunder);
    font-size: var(--teks-kecil);
  }

  .daftarAturan {
    margin-top: var(--ruang-4);
    border-top: var(--garis-tipis) solid var(--garis);
  }

  .daftarAturan > div {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: var(--ruang-1) var(--ruang-4);
    padding-block: var(--ruang-3);
    border-bottom: 1px solid var(--garis);
  }

  .daftarAturan dt {
    flex: 1 1 14rem;
    min-width: 0;
    font-weight: 700;
  }

  .daftarAturan dd {
    margin: 0;
  }

  .nilaiAturan {
    margin-left: auto;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .metaAturan {
    flex-basis: 100%;
    min-width: 0;
    color: var(--teks-sekunder);
    font-size: var(--teks-kecil);
    line-height: 1.45;
  }

  .metaAturan a {
    color: var(--teks);
    font-weight: 600;
  }

  .tabelAturan summary {
    display: inline-flex;
    align-items: center;
    min-height: var(--sentuh-min);
    color: var(--teks);
    font-weight: 700;
    cursor: pointer;
  }

  .tabelAturan table {
    width: 100%;
    margin-block: var(--ruang-2);
    border-collapse: collapse;
    font-size: var(--teks-kecil);
    font-variant-numeric: tabular-nums;
  }

  .tabelAturan th,
  .tabelAturan td {
    padding: var(--ruang-2) var(--ruang-3) var(--ruang-2) 0;
    border-bottom: 1px solid var(--garis);
    text-align: left;
  }

  .tabelAturan th {
    font-weight: 800;
  }
  ```

  `src/components/tools/HalamanTool.tsx`

  ```tsx
  import { ChipPilar } from '@/components/dasar/ChipPilar'
  import { Ikon } from '@/components/dasar/Ikon'
  import { JsonLd } from '@/components/dasar/JsonLd'
  import { RemahRoti } from '@/components/dasar/RemahRoti'
  import { BlokSumber } from '@/components/artikel/BlokSumber'
  import { Catatan } from '@/components/artikel/Catatan'
  import { Faq } from '@/components/artikel/Faq'
  import { IsiArtikel } from '@/components/isi/IsiArtikel'
  import type { Hasil, Kalkulator } from '@/modules/hitung'
  import { tanggalIndonesia } from '@/modules/konten/artikel'
  import type { DataTool } from '@/modules/konten/tipe'
  import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
  import type { Situs } from '@/modules/seo/tipe'

  import { AturanTool } from './AturanTool'
  import { barisAwal, FormKalkulator } from './FormKalkulator'
  import { HasilKalkulator } from './HasilKalkulator'
  import gayaKalkulator from './Kalkulator.module.css'
  import gaya from './Tool.module.css'

  /** Id form kalkulator; satu kalkulator per halaman. */
  export const ID_KALKULATOR = 'kalkulator'

  /**
   * Halaman `/tools/{slug}` (spesifikasi §4): kalkulator di atas lipatan dengan hasil besar, lalu artikel
   * penjelasan rumus, angka aturan yang dipakai, catatan pilar, sumber aturan, dan FAQ. JSON-LD
   * WebApplication dari modul SEO. Tanpa JavaScript, form dan hasil contoh dari server tetap tampil.
   */
  export function HalamanTool({ tool, kalkulator, contoh, situs }: { tool: DataTool; kalkulator: Kalkulator; contoh: Hasil | null; situs: Situs }) {
    const masukan = { jenis: 'tools', doc: tool.seo } as const
    const pesan = kalkulator.pesan ?? (contoh && !contoh.ok ? contoh.pesan : null)
    return (
      <article className={`kontainer ${gaya.halaman}`}>
        <JsonLd data={jsonLd(masukan, situs)} />
        <header className={gaya.kepala}>
          <RemahRoti remah={remahRoti(masukan)} />
          <p className={gaya.kicker}>
            {tool.pilar && <ChipPilar pilar={tool.pilar} />}
            <span>Kalkulator</span>
          </p>
          <h1 className={gaya.judul}>Kalkulator {tool.nama}</h1>
          <p className={gaya.deck}>{tool.ringkasan}</p>
          {tool.diperiksa && (
            <p className={gaya.diperiksa}>
              <Ikon nama="calendar" ukuran={18} />
              Aturan diperiksa <time dateTime={tool.diperiksa}>{tanggalIndonesia(tool.diperiksa)}</time>
            </p>
          )}
        </header>

        {pesan || !contoh?.ok ? (
          <p role="note" className={gaya.pesan}>
            <Ikon nama="triangle-alert" />
            {pesan ?? 'Kalkulator ini sedang diperbarui. Coba lagi nanti.'}
          </p>
        ) : (
          <div className={gayaKalkulator.kalkulator} data-warna={tool.pilar?.warna}>
            <FormKalkulator
              id={ID_KALKULATOR}
              isian={kalkulator.isian}
              nilai={kalkulator.contoh}
              galat={{}}
              tombol={kalkulator.tombol}
              lanjutan={kalkulator.lanjutan}
              baris={barisAwal(kalkulator.isian)}
            />
            <HasilKalkulator id={ID_KALKULATOR} hasil={contoh} baru={false} tombol={kalkulator.tombol} />
          </div>
        )}

        <div className={gaya.badan}>
          <IsiArtikel isi={tool.penjelasan} cloudName={situs.cloudName} />
          <AturanTool dasar={kalkulator.dasar} />
          <Catatan teks={tool.pilar?.disclaimer ?? null} />
          <BlokSumber sumber={tool.sumber} />
          <Faq faq={tool.faq} />
        </div>
      </article>
    )
  }
  ```

  `src/app/(frontend)/tools/[slug]/page.tsx`

  ```tsx
  import type { Metadata } from 'next'
  import { cache } from 'react'

  import { HalamanTool } from '@/components/tools/HalamanTool'
  import { pathFor } from '@/lib/paths'
  import { muatSitus, muatTool, susunKalkulator, tanganiTidakAda } from '@/modules/konten'
  import { metadata, metadataTidakDitemukan } from '@/modules/seo'

  type Props = { params: Promise<{ slug: string }> }

  /** `/tools/{slug}`: satu kalkulator (ISR). */
  export function generateStaticParams() {
    return []
  }

  const cari = cache(async (slug: string) => muatTool(slug))

  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const tool = await cari((await params).slug)
    if (!tool) return metadataTidakDitemukan(await muatSitus())
    return metadata({ jenis: 'tools', doc: tool.seo }, await muatSitus())
  }

  export default async function Tool({ params }: Props) {
    const { slug } = await params
    const tool = await cari(slug)
    if (!tool) return tanganiTidakAda(pathFor({ jenis: 'tools', slug }))
    // Hasil contoh memakai aturan yang berlaku saat halaman dirender. Parameter yang tidak berlaku
    // untuk tanggal ini (dipakai parameter terakhir yang valid) dicatat ke log server (spesifikasi §15).
    const { kalkulator, contoh } = susunKalkulator(tool, new Date())
    for (const peringatan of kalkulator.peringatan) console.warn(`[hitung] ${tool.toolId}: ${peringatan}`)
    if (kalkulator.pesan) console.error(`[hitung] ${tool.toolId}: ${kalkulator.pesan}`)
    return <HalamanTool tool={tool} kalkulator={kalkulator} contoh={contoh} situs={await muatSitus()} />
  }
  ```

- [ ] **Langkah 7: Jalankan tes unit dan integrasi**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 51 passed (51)`, `Tests 341 passed (341)`; integrasi `Test Files 27 passed (27)`, `Tests 78 passed (78)`.

- [ ] **Langkah 8: Keenam tools terbit di E2E dan tes halaman kalkulator**

  ```diff
  diff --git a/tests/e2e/data.ts b/tests/e2e/data.ts
  index e15437a..3cc7e3f 100644
  --- a/tests/e2e/data.ts
  +++ b/tests/e2e/data.ts
  @@ -19,6 +19,16 @@ export const SLUG = {
     danaDaruratLama: 'dana-darurat-lama',
   } as const
   
  +/** Enam kalkulator dari seed, diterbitkan `siapkan.ts`, dengan angka utama hasil contoh dari server. */
  +export const TOOLS_CONTOH = [
  +  { slug: 'gaji-bersih', nama: 'Gaji Bersih', utama: 'Rp\u00a07.554.552' },
  +  { slug: 'thr', nama: 'THR', utama: 'Rp\u00a06.500.000' },
  +  { slug: 'cicilan-kpr', nama: 'Cicilan & KPR', utama: 'Rp\u00a03.708.049' },
  +  { slug: 'dana-darurat', nama: 'Dana Darurat', utama: 'Rp\u00a030.000.000' },
  +  { slug: 'bmi-kalori', nama: 'BMI & Kalori', utama: '22,0' },
  +  { slug: 'ipk', nama: 'IPK', utama: '3,56' },
  +] as const
  +
   /** Subkategori contoh di bawah pilar Uang & Karier. */
   export const SLUG_SUB = { pajak: 'pajak' } as const
   
  ```

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index 2b9f432..2628ca3 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -218,8 +218,8 @@ const danaDarurat = await payload.create({
   })
   await payload.update({ collection: 'artikel', id: danaDarurat.id, data: { _status: 'published', slug: SLUG.danaDarurat } })
   
  -// Kalkulator dari seed (draf, lengkap dengan parameter): tiga diterbitkan di dua pilar, sisanya tetap draf.
  -for (const toolId of ['gaji-bersih', 'thr', 'bmi-kalori']) {
  +// Kalkulator dari seed (draf, lengkap dengan penjelasan dan parameter): keenamnya diterbitkan.
  +for (const toolId of ['gaji-bersih', 'thr', 'cicilan-kpr', 'dana-darurat', 'bmi-kalori', 'ipk']) {
     const { docs } = await payload.find({ collection: 'tools', where: { toolId: { equals: toolId } }, draft: true, limit: 1 })
     await payload.update({ collection: 'tools', id: docs[0].id, data: { _status: 'published' } })
   }
  ```

  Indeks `/tools` dan kotak "Hitung sendiri" beranda kini menampilkan keenam tools:

  ```diff
  diff --git a/tests/e2e/tools.spec.ts b/tests/e2e/tools.spec.ts
  index 0cc8982..3d93744 100644
  --- a/tests/e2e/tools.spec.ts
  +++ b/tests/e2e/tools.spec.ts
  @@ -13,10 +13,9 @@ test('tombol Tools di header membuka indeks kalkulator per pilar', async ({ page
     await expect(page).toHaveURL('/tools')
     await expect(page).toHaveTitle('Tools · point.')
     await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tools')
  -  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Uang & Karier', 'Sehat'])
  -  await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Gaji Bersih', 'THR', 'BMI & Kalori'])
  +  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Uang & Karier', 'Belajar', 'Sehat'])
  +  await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Cicilan & KPR', 'Dana Darurat', 'Gaji Bersih', 'THR', 'IPK', 'BMI & Kalori'])
     await expect(page.getByRole('link', { name: /Hitung Gaji Bersih/ })).toHaveAttribute('href', '/tools/gaji-bersih')
  -  await expect(page.getByText('IPK', { exact: true })).toHaveCount(0)
   })
   
   for (const { lebar, tinggi } of UKURAN_LAYAR) {
  ```

  ```diff
  diff --git a/tests/e2e/beranda.spec.ts b/tests/e2e/beranda.spec.ts
  index 87ed2db..e4d1e3e 100644
  --- a/tests/e2e/beranda.spec.ts
  +++ b/tests/e2e/beranda.spec.ts
  @@ -31,7 +31,7 @@ test('mozaik pilihan redaksi: kartu besar dulu, kotak Hitung sendiri dengan tool
     const besar = await mozaik.getByRole('link', { name: /Cara hitung gaji bersih/ }).boundingBox()
     const kecil = await mozaik.getByRole('link', { name: /Jadwal SNBT/ }).boundingBox()
     expect(besar!.height).toBeGreaterThan(kecil!.height)
  -  await expect(mozaik.getByRole('list').getByRole('link')).toHaveText(['Gaji Bersih', 'THR', 'BMI & Kalori'])
  +  await expect(mozaik.getByRole('list').getByRole('link')).toHaveText(['Cicilan & KPR', 'Dana Darurat', 'Gaji Bersih', 'THR', 'IPK', 'BMI & Kalori'])
     await expect(mozaik.getByRole('link', { name: 'Semua tools' })).toHaveAttribute('href', '/tools')
   })
   
  ```

  `tests/e2e/kalkulator.spec.ts`

  ```ts
  import { expect, test, type Page } from '@playwright/test'

  import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  import { TOOLS_CONTOH, UKURAN_LAYAR } from './data'

  test.beforeEach(async ({ page }) => {
    await cegatCloudinary(page)
  })

  const hasil = (page: Page) => page.getByRole('region', { name: /Contoh hasil|Hasil hitunganmu/ })

  /** Angka utama hasil (paragraf yang ukurannya diatur `--panjang`), bukan angka yang sama di rincian. */
  const angkaUtama = (page: Page) => hasil(page).locator('p[style*="--panjang"]')

  /** Lebar teks angka utama (bukan lebar elemennya) dibanding lebar kotak hasil, dan jumlah barisnya. */
  async function ukurAngka(page: Page) {
    return page.evaluate(() => {
      const angka = document.querySelector('section[aria-labelledby="kalkulator-hasil"] p[style*="--panjang"]') as HTMLElement
      const jangkauan = document.createRange()
      jangkauan.selectNodeContents(angka)
      return {
        teks: jangkauan.getBoundingClientRect().width,
        kotak: angka.getBoundingClientRect().width,
        baris: jangkauan.getClientRects().length,
      }
    })
  }

  test('kartu di /tools membuka kalkulator: judul, hasil contoh dari server, penjelasan, sumber, dan JSON-LD', async ({ page }) => {
    await page.goto('/tools')
    await page.getByRole('link', { name: /Hitung Gaji Bersih/ }).click()
    await expect(page).toHaveURL('/tools/gaji-bersih')
    await expect(page).toHaveTitle('Kalkulator Gaji Bersih 2026 dengan PPh 21 TER dan BPJS')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kalkulator Gaji Bersih')
    await expect(page.getByRole('navigation', { name: 'Remah roti' }).getByRole('link')).toHaveText(['Beranda', 'Tools'])
    await expect(page.getByRole('textbox', { name: 'Gaji pokok dan tunjangan tetap per bulan dalam rupiah' })).toHaveValue('8.000.000')
    await expect(page.getByRole('radio', { name: 'TK/0: tidak kawin, tanpa tanggungan' })).toBeChecked()
    await expect(hasil(page).getByRole('heading', { level: 2 })).toHaveText('Contoh hasil')
    await expect(angkaUtama(page)).toHaveText('Rp\u00a07.554.552')
    await expect(page.getByRole('heading', { level: 2, name: 'Rumus gaji bersih' })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Angka aturan yang dipakai' }).getByText('Rp\u00a011.086.300')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Sumber' }).getByRole('link').first()).toHaveAttribute('href', /pajak\.go\.id/)
    const jsonLd = await page.locator('script[type="application/ld+json"]').textContent()
    expect(JSON.parse(jsonLd ?? '{}')['@graph'].map((n: { '@type': string }) => n['@type'])).toContain('WebApplication')
  })

  test('keenam kalkulator terbit dengan hasil contoh dari server', async ({ page }) => {
    for (const tool of TOOLS_CONTOH) {
      const respons = await page.goto(`/tools/${tool.slug}`)
      expect(respons?.status(), tool.slug).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Kalkulator ${tool.nama}`)
      await expect(angkaUtama(page)).toHaveText(tool.utama)
    }
    expect((await page.goto('/tools/kalkulator-yang-tidak-ada'))?.status()).toBe(404)
  })

  test('tanpa JavaScript: form dan hasil contoh tetap tampil, dengan pesan bahwa kalkulator butuh JavaScript', async ({ browser }) => {
    const konteks = await browser.newContext({ javaScriptEnabled: false })
    const page = await konteks.newPage()
    await cegatCloudinary(page)
    await page.goto('/tools/ipk')
    await expect(page.getByRole('group', { name: 'Mata kuliah semester ini' }).getByRole('listitem')).toHaveCount(5)
    await expect(angkaUtama(page)).toHaveText('3,56')
    // Playwright mematikan JavaScript lewat emulasi, jadi isi <noscript> tidak digambar; cukup pastikan pesannya ada di HTML.
    expect(await page.content()).toContain('Kalkulator ini butuh JavaScript untuk menghitung angkamu.')
    await konteks.close()
  })

  for (const { lebar, tinggi } of UKURAN_LAYAR) {
    test(`kalkulator ${lebar}px: tanpa geser horizontal, tombol satu baris, angka hasil muat, jarak bagian 40 px, lolos axe`, async ({ page }) => {
      await page.setViewportSize({ width: lebar, height: tinggi })
      for (const tool of TOOLS_CONTOH) {
        await page.goto(`/tools/${tool.slug}`)
        await periksaTanpaGeserHorizontal(page)
        const tombol = page.getByRole('button', { name: /^Hitung / })
        expect((await tombol.boundingBox())!.height, tool.slug).toBeLessThanOrEqual(56)
        const angka = await ukurAngka(page)
        expect(angka.baris, tool.slug).toBe(1)
        expect(angka.teks, tool.slug).toBeLessThanOrEqual(angka.kotak)
        const form = (await page.locator('form#kalkulator').boundingBox())!
        const kotakHasil = (await hasil(page).boundingBox())!
        // Mulai 1024 px form dan hasil berdampingan; di bawahnya hasil tepat di bawah form.
        if (lebar >= 1024) expect(kotakHasil.x, tool.slug).toBeGreaterThan(form.x + form.width)
        else expect(Math.round(kotakHasil.y - (form.y + form.height)), tool.slug).toBe(16)
        const jarak = await page.evaluate(() => {
          const bagian = [...document.querySelectorAll('main article > :not(script)')].map((el) => el.getBoundingClientRect())
          return bagian.slice(1).map((b, i) => Math.round(b.top - bagian[i].bottom))
        })
        expect(jarak, tool.slug).toEqual([40, 40])
        await periksaAxe(page)
      }
    })
  }
  ```

  Jalankan:

  ```bash
  npm run test:e2e
  ```

  Hasil yang diharapkan: `80 passed`. Di 375, 768, dan 1440 px keenam halaman kalkulator tanpa geser horizontal, tombol "Hitung ..." satu baris (tinggi paling banyak 56 px), angka hasil satu baris dan muat di kotaknya, jarak bagian 40 px, dan lolos axe.

- [ ] **Langkah 9: Commit**

  ```bash
  git add "src/app/(frontend)/tools/[slug]" src/components/tools src/components/dasar/Ikon.tsx src/modules/hitung tests/unit/halaman-tool.test.ts tests/e2e
  git commit -m "feat(ui): halaman kalkulator /tools/{slug} dengan form, hasil contoh dari server, penjelasan rumus, dan angka aturan"
  ```

### Task 9: Kalkulator menghitung di browser: galat, fokus, pengumuman hasil, animasi angka CSS, dan anggaran JS

**Files:**
- Create: `src/components/tools/Kalkulator.tsx`
- Modify: `src/components/tools/HalamanTool.tsx`, `src/components/tools/HasilKalkulator.tsx`, `src/components/tools/FormKalkulator.tsx`, `tests/unit/halaman-tool.test.ts`, `tests/e2e/motion.spec.ts`
- Test: `tests/e2e/hitung.spec.ts`

**Interfaces:**
- Consumes: `hitung`, `teksRibuan`, `HasilBerhasil`, `Isian`, `Masukan`, `ParameterTersimpan`, `TeksIsian` (Task 1 dan 7); `FormKalkulator`, `idIsian`, `barisAwal`, `HasilKalkulator`, `ID_KALKULATOR` (Task 8); `TOOLS_CONTOH` (Task 8).
- Produces:
  - Komponen klien `Kalkulator({ id, toolId, isian, contoh, tombol, lanjutan, parameter, teks, hasilContoh, warna })` (`'use client'`), dipakai `HalamanTool`.
  - `HasilKalkulator` menerima `ref?: Ref<HTMLElement>`; tombol tambah baris punya id `{idForm}-{kunci}-tambah` (tujuan fokus setelah baris dihapus).
  - `motion.spec.ts`: `/tools/gaji-bersih` dan `/tools/ipk` masuk anggaran 160 KiB, dan tes baru "JS kalkulator di bawah 25 KB di atas JS artikel".

`Kalkulator` adalah satu-satunya JavaScript klien rencana ini. Ia membungkus form dan kotak hasil dari Task 8 dan menyimpan state hasil, galat, baris IPK, dan pengumuman. Isian tidak terkontrol: nilai dibaca dari form lewat `FormData` saat tombol ditekan atau saat isian ditinggalkan, lalu dihitung dengan `hitung(toolId, masukan, new Date(), parameter, teks)` di browser, sama persis dengan hitungan contoh di server.

| Kejadian | Perilaku |
|---|---|
| Tombol "Hitung ..." | Hasil baru menggantikan contoh, judul kotak menjadi "Hasil hitunganmu", angka utama muncul dengan animasi CSS `muncul` (naik 0,3em + opacity, 250 ms) hanya bila `prefers-reduced-motion: no-preference`. Wilayah `role="status"` mengumumkan label, angka, dan keterangan hasil utama ("Gaji bersih per bulan Rp 13.950.000. Januari sampai November, setelah PPh 21 dan iuran."). Di HP, bila kotak hasil di bawah layar, halaman digulir ke hasil (langsung tanpa animasi saat reduced motion). |
| Ada isian salah | Pesan di bawah setiap isian yang salah, fokus ke isian pertama yang salah (membuka `<details>` bila perlu, isian digulir ke tengah layar supaya tidak tertutup header), pengumuman "Periksa {jumlah} isian yang ditandai." Pesan parameter kosong dari modul `hitung` diumumkan apa adanya. |
| Isian ditinggalkan | Isian rupiah yang berisi angka polos dirapikan ("8000000" menjadi "8.000.000"). Isian itu divalidasi sendiri: galatnya muncul atau hilang. Isian kosong yang belum pernah salah tidak ditandai saat hanya dilewati dengan Tab. |
| Tambah atau hapus mata kuliah | Baris baru mendapat fokus di isian SKS-nya; setelah baris dihapus fokus pindah ke tombol "Tambah mata kuliah". Galat baris dibuang karena nomor barisnya bergeser. |

Animasi hanya `transform` dan `opacity` dan kotak hasil berdiri di posisi yang sama, jadi hasil baru tidak menggeser form (diuji E2E di 1440 px). GSAP tidak dipakai (lihat Dependensi baru): kalkulator dan modul `hitung` sudah 13.530 byte gzip.

Tes E2E `hitung.spec.ts` menjalankan contoh resmi DJP lewat form (spesifikasi §16: "kalkulator gaji menghasilkan angka contoh resmi"): Tuan R, K/0, gaji Rp15.000.000, iuran pensiun Rp150.000, kedua centang BPJS dimatikan seperti contoh DJP: TER 6% Rp900.000, PPh setahun Rp11.055.000, Desember Rp1.155.000, gaji bersih Rp13.950.000. Tes lain: galat dan fokus, rupiah dirapikan saat ditinggalkan, tambah dan hapus mata kuliah dengan fokus yang tepat (IPK 3,59), angka Rp10.000.000.000 satu baris dan muat di 375 px, form tidak bergeser saat hasil baru tampil, dan animasi `muncul` jalan tanpa reduced motion dan mati dengan reduced motion.

- [ ] **Langkah 1: Tulis tes yang gagal**

  ```diff
  diff --git a/tests/unit/halaman-tool.test.ts b/tests/unit/halaman-tool.test.ts
  index 310f523..96f8529 100644
  --- a/tests/unit/halaman-tool.test.ts
  +++ b/tests/unit/halaman-tool.test.ts
  @@ -65,6 +65,10 @@ describe('HalamanTool', () => {
       expect(html).toContain('<h3>PPh 21 Desember: dihitung ulang setahun</h3>')
     })
   
  +  it('kalkulator di browser: wilayah status untuk mengumumkan hasil, kosong sebelum pembaca menghitung', () => {
  +    expect(html).toMatch(/<\/section><p class="sr" role="status"><\/p><\/div>/)
  +  })
  +
     it('artikel: penjelasan rumus, angka aturan dengan tabel TER, catatan pilar, sumber, FAQ', () => {
       expect(html).toContain('<h2 id="rumus-gaji-bersih">Rumus gaji bersih</h2>')
       expect(html).toMatch(/<h2 id="angka-aturan" class="[^"]*">Angka aturan yang dipakai<\/h2>/)
  @@ -82,7 +86,7 @@ describe('HalamanTool', () => {
       expect(ipk).toMatch(/<input id="kalkulator-sks-0" type="text" inputMode="numeric" autoComplete="off" required="" aria-labelledby="kalkulator-matkul-0-judul kalkulator-sks-0-label" aria-describedby="kalkulator-matkul-0-galat" name="sks" value="3"\/>/)
       expect(ipk.match(/name="nilai"/g)).toHaveLength(5)
       expect(ipk).toMatch(/aria-label="Hapus mata kuliah 5"/)
  -    expect(ipk).toMatch(/<button type="button" class="[^"]*"><svg[^>]*>.*?<\/svg>Tambah mata kuliah<\/button>/)
  +    expect(ipk).toMatch(/<button type="button" id="kalkulator-matkul-tambah" class="[^"]*"><svg[^>]*>.*?<\/svg>Tambah mata kuliah<\/button>/)
       expect(ipk).toMatch(/<p class="[^"]*" style="--panjang:4">3,56<\/p>/)
       expect(ipk).toContain('data-warna="kuning"')
     })
  ```

  `tests/e2e/hitung.spec.ts`

  ```ts
  import { expect, test, type Page } from '@playwright/test'

  import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'

  test.beforeEach(async ({ page }) => {
    await cegatCloudinary(page)
  })

  const hasil = (page: Page) => page.getByRole('region', { name: /Contoh hasil|Hasil hitunganmu/ })
  const angkaUtama = (page: Page) => hasil(page).locator('p[style*="--panjang"]')
  const ringkasan = (page: Page, label: string) => hasil(page).locator('dl > div').filter({ has: page.getByText(label, { exact: true }) }).locator('dd')
  const gaji = (page: Page) => page.getByRole('textbox', { name: 'Gaji pokok dan tunjangan tetap per bulan dalam rupiah' })

  test('kalkulator gaji menghasilkan angka contoh resmi DJP (K/0, gaji Rp15.000.000, iuran pensiun Rp150.000)', async ({ page }) => {
    await page.goto('/tools/gaji-bersih')
    await gaji(page).fill('15.000.000')
    await page.getByRole('radio', { name: 'K/0: kawin, tanpa tanggungan' }).check()
    await page.getByText('Atur tunjangan, BPJS, dan iuran lain').click()
    await page.getByRole('checkbox', { name: 'Ikut BPJS Kesehatan lewat kantor' }).uncheck()
    await page.getByRole('checkbox', { name: 'Ikut BPJS Ketenagakerjaan lewat kantor' }).uncheck()
    await page.getByRole('textbox', { name: 'Iuran pensiun lain atau zakat lewat kantor per bulan dalam rupiah' }).fill('150.000')
    await page.getByRole('button', { name: 'Hitung gaji bersih' }).click()

    await expect(hasil(page).getByRole('heading', { level: 2 })).toHaveText('Hasil hitunganmu')
    await expect(ringkasan(page, 'PPh 21 per bulan (TER 6%)')).toHaveText('Rp\u00a0900.000')
    await expect(ringkasan(page, 'PPh 21 setahun')).toHaveText('Rp\u00a011.055.000')
    await expect(angkaUtama(page)).toHaveText('Rp\u00a013.950.000')
    await hasil(page).getByText('Lihat rincian hitungan').click()
    await expect(hasil(page).locator('dl > div').filter({ has: page.getByText('PPh 21 Desember', { exact: true }) }).locator('dd')).toHaveText('Rp\u00a01.155.000')
    await expect(page.getByRole('status')).toHaveText(
      'Gaji bersih per bulan Rp\u00a013.950.000. Januari sampai November, setelah PPh 21 dan iuran.',
    )
  })

  test('galat di bawah isian, fokus ke isian pertama yang salah, rupiah dirapikan saat ditinggalkan', async ({ page }) => {
    await page.goto('/tools/gaji-bersih')
    await gaji(page).fill('')
    await page.getByRole('button', { name: 'Hitung gaji bersih' }).click()
    await expect(gaji(page)).toBeFocused()
    await expect(gaji(page)).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator('#kalkulator-gaji-galat')).toHaveText('Gaji pokok dan tunjangan tetap per bulan belum diisi. Tulis angkanya, misalnya 8.000.000.')
    await expect(hasil(page).getByRole('heading', { level: 2 })).toHaveText('Contoh hasil')
    await expect(page.getByRole('status')).toHaveText('Periksa 1 isian yang ditandai.')

    await gaji(page).fill('12500000')
    await gaji(page).press('Tab')
    await expect(gaji(page)).toHaveValue('12.500.000')
    await expect(gaji(page)).not.toHaveAttribute('aria-invalid')
    await expect(page.locator('#kalkulator-gaji-galat')).toHaveText('')

    // Isian yang salah di dalam bagian tertutup: bagiannya dibuka dan isiannya mendapat fokus.
    await page.getByText('Atur tunjangan, BPJS, dan iuran lain').click()
    const tunjangan = page.getByRole('textbox', { name: 'Tunjangan tidak tetap per bulan dalam rupiah' })
    await tunjangan.fill('satu juta')
    await page.getByText('Atur tunjangan, BPJS, dan iuran lain').click()
    await gaji(page).press('Enter')
    await expect(tunjangan).toBeFocused()
    await expect(page.locator('#kalkulator-tunjanganLain-galat')).toHaveText('Tulis tunjangan tidak tetap per bulan dengan angka saja, misalnya 0.')
  })

  test('IPK: tambah dan hapus mata kuliah dengan fokus yang tepat, lalu hitung', async ({ page }) => {
    await page.goto('/tools/ipk')
    const daftar = page.getByRole('group', { name: 'Mata kuliah semester ini' }).getByRole('listitem')
    await page.getByRole('button', { name: 'Tambah mata kuliah' }).click()
    await expect(daftar).toHaveCount(6)
    const sksBaru = page.getByRole('textbox', { name: 'Mata kuliah 6 SKS' })
    await expect(sksBaru).toBeFocused()
    await sksBaru.fill('4')
    await page.getByRole('combobox', { name: 'Mata kuliah 6 Nilai huruf' }).selectOption('A')
    await page.getByRole('button', { name: 'Hapus mata kuliah 1' }).click()
    await expect(daftar).toHaveCount(5)
    await expect(page.getByRole('button', { name: 'Tambah mata kuliah' })).toBeFocused()
    await page.getByRole('button', { name: 'Hitung IPK' }).click()
    // (3 x 3,3 + 2 x 3,7 + 3 x 3 + 2 x 4 + 4 x 4) / 14 = 50,3 / 14 = 3,59
    await expect(angkaUtama(page)).toHaveText('3,59')
    await expect(page.getByRole('status')).toHaveText('IPK 3,59. Dari 14 SKS yang kamu isi.')

    await page.getByRole('textbox', { name: 'Mata kuliah 2 SKS' }).fill('')
    await page.getByRole('button', { name: 'Hitung IPK' }).click()
    await expect(page.getByRole('textbox', { name: 'Mata kuliah 2 SKS' })).toBeFocused()
    await expect(daftar.nth(1)).toContainText('SKS mata kuliah 2 belum diisi. Tulis angkanya, misalnya 3.')
  })

  test('angka panjang: gaji Rp10.000.000.000 tetap satu baris dan muat di layar 375 px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/tools/gaji-bersih')
    await gaji(page).fill('10.000.000.000')
    await page.getByRole('button', { name: 'Hitung gaji bersih' }).click()
    await expect(angkaUtama(page)).toHaveText(/^Rp\u00a06\.\d{3}\.\d{3}\.\d{3}$/)
    const ukuran = await angkaUtama(page).evaluate((el) => {
      const jangkauan = document.createRange()
      jangkauan.selectNodeContents(el)
      return { teks: jangkauan.getBoundingClientRect().width, kotak: el.getBoundingClientRect().width, baris: jangkauan.getClientRects().length }
    })
    expect(ukuran.baris).toBe(1)
    expect(ukuran.teks).toBeLessThanOrEqual(ukuran.kotak)
    await periksaTanpaGeserHorizontal(page)
    // Hasil digulir ke layar karena di HP letaknya di bawah form.
    await expect(hasil(page)).toBeInViewport()
    await periksaAxe(page)
  })

  test('hasil baru tidak menggeser form dan kotak hasil di desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/tools/cicilan-kpr')
    // Diukur dari puncak halaman: klik tombol menggulir halaman, dan kotak hasil menempel (sticky) saat digulir.
    const posisi = () =>
      page.evaluate(() => {
        window.scrollTo(0, 0)
        return ['form#kalkulator', 'section[aria-labelledby="kalkulator-hasil"]'].map((s) => {
          const k = document.querySelector(s)!.getBoundingClientRect()
          return [k.left, k.top, k.width]
        })
      })
    const sebelum = await posisi()
    await page.getByRole('textbox', { name: 'Bunga per tahun dalam persen' }).fill('11')
    await page.getByRole('button', { name: 'Hitung cicilan' }).click()
    await expect(hasil(page).getByRole('heading', { level: 2 })).toHaveText('Hasil hitunganmu')
    expect(await posisi()).toEqual(sebelum)
  })

  test('angka hasil baru muncul dengan animasi CSS, dan diam saat reduced motion', async ({ browser }) => {
    for (const [gerak, nama] of [
      ['no-preference', 'muncul'],
      ['reduce', 'none'],
    ] as const) {
      const konteks = await browser.newContext({ reducedMotion: gerak })
      const page = await konteks.newPage()
      await cegatCloudinary(page)
      await page.goto('/tools/bmi-kalori')
      await expect(angkaUtama(page)).toHaveCSS('animation-name', 'none')
      await page.getByRole('textbox', { name: 'Berat badan dalam kilogram' }).fill('70')
      await page.getByRole('button', { name: 'Hitung IMT dan kalori' }).click()
      await expect(angkaUtama(page)).toHaveText('25,7')
      await expect(angkaUtama(page)).toHaveCSS('animation-name', new RegExp(nama))
      await konteks.close()
    }
  })
  ```

  ```diff
  diff --git a/tests/e2e/motion.spec.ts b/tests/e2e/motion.spec.ts
  index 67d7d36..18d29dc 100644
  --- a/tests/e2e/motion.spec.ts
  +++ b/tests/e2e/motion.spec.ts
  @@ -10,7 +10,7 @@ import { SLUG, SLUG_SUB, SLUG_VIDEO } from './data'
    */
   const ANGGARAN_JS = 160 * 1024
   
  -/** Setiap jenis halaman publik: beranda, artikel, rubrik, halaman statis, penulis, video, tools, cari. */
  +/** Setiap jenis halaman publik: beranda, artikel, rubrik, halaman statis, penulis, video, tools, kalkulator, cari. */
   const HALAMAN_ANGGARAN = [
     '/',
     `/${SLUG.panduan}`,
  @@ -20,9 +20,14 @@ const HALAMAN_ANGGARAN = [
     '/video',
     `/video/${SLUG_VIDEO.pph21}`,
     '/tools',
  +  '/tools/gaji-bersih',
  +  '/tools/ipk',
     '/cari?q=gaji',
   ]
   
  +/** JS milik point. di luar kerangka Next/React (spesifikasi §12): kalkulator dan modul hitung. */
  +const ANGGARAN_KALKULATOR = 25 * 1024
  +
   /** Byte JS halaman di konteks baru (tanpa cache browser dari halaman sebelumnya). */
   async function byteJs(browser: Browser, path: string): Promise<number> {
     const konteks = await browser.newContext()
  @@ -93,6 +98,15 @@ test('JavaScript setiap jenis halaman di bawah anggaran', async ({ browser }) =>
     }
   })
   
  +test('JavaScript kalkulator (komponen dan modul hitung) di bawah 25 KB di atas JavaScript artikel', async ({ browser }) => {
  +  const artikel = await byteJs(browser, `/${SLUG.panduan}`)
  +  for (const path of ['/tools/gaji-bersih', '/tools/ipk']) {
  +    const tambahan = (await byteJs(browser, path)) - artikel
  +    test.info().annotations.push({ type: `JS kalkulator ${path}`, description: `${(tambahan / 1024).toFixed(1)} KiB` })
  +    expect(tambahan, path).toBeLessThan(ANGGARAN_KALKULATOR)
  +  }
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

  Hasil yang diharapkan: 2 tes FAIL di `tests/unit/halaman-tool.test.ts`: "kalkulator di browser: wilayah status ..." dengan `AssertionError: expected '<article class="kontainer _halaman_6e…' to match /…/section><p class="sr" role="status"><\`, dan tes IPK karena tombol tambah belum punya id.

- [ ] **Langkah 3: Komponen klien Kalkulator**

  ```diff
  diff --git a/src/components/tools/FormKalkulator.tsx b/src/components/tools/FormKalkulator.tsx
  index 27e555f..eb1d3ca 100644
  --- a/src/components/tools/FormKalkulator.tsx
  +++ b/src/components/tools/FormKalkulator.tsx
  @@ -251,7 +251,13 @@ function IsianDaftarBaris({ i, idForm, nilai, galat, baris, onTambah, onHapus }:
             )
           })}
         </ol>
  -      <button type="button" className={gaya.tambah} disabled={daftar.length >= i.maks} onClick={onTambah ? () => onTambah(i.kunci) : undefined}>
  +      <button
  +        type="button"
  +        id={`${id}-tambah`}
  +        className={gaya.tambah}
  +        disabled={daftar.length >= i.maks}
  +        onClick={onTambah ? () => onTambah(i.kunci) : undefined}
  +      >
           <Ikon nama="plus" />
           Tambah {nama}
         </button>
  ```

  ```diff
  diff --git a/src/components/tools/HasilKalkulator.tsx b/src/components/tools/HasilKalkulator.tsx
  index 8eca2af..c48cb9f 100644
  --- a/src/components/tools/HasilKalkulator.tsx
  +++ b/src/components/tools/HasilKalkulator.tsx
  @@ -1,4 +1,4 @@
  -import type { CSSProperties } from 'react'
  +import type { CSSProperties, Ref } from 'react'
   
   import { Ikon } from '@/components/dasar/Ikon'
   import type { HasilBerhasil } from '@/modules/hitung'
  @@ -11,10 +11,24 @@ import gaya from './Kalkulator.module.css'
    * dan lebar kotak, jadi Rp10 miliar tetap satu baris di layar 375 px. Angka baru muncul dengan
    * animasi CSS (naik + opacity); hasil contoh dari server tidak dianimasikan.
    */
  -export function HasilKalkulator({ id, hasil, baru, tombol, urutan = 0 }: { id: string; hasil: HasilBerhasil; baru: boolean; tombol: string; urutan?: number }) {
  +export function HasilKalkulator({
  +  id,
  +  hasil,
  +  baru,
  +  tombol,
  +  urutan = 0,
  +  ref,
  +}: {
  +  id: string
  +  hasil: HasilBerhasil
  +  baru: boolean
  +  tombol: string
  +  urutan?: number
  +  ref?: Ref<HTMLElement>
  +}) {
     const { utama } = hasil
     return (
  -    <section className={gaya.hasil} aria-labelledby={`${id}-hasil`}>
  +    <section ref={ref} className={gaya.hasil} aria-labelledby={`${id}-hasil`}>
         <h2 id={`${id}-hasil`} className={gaya.kicker}>
           <span className={gaya.titik} aria-hidden="true" />
           {baru ? 'Hasil hitunganmu' : 'Contoh hasil'}
  ```

  `src/components/tools/Kalkulator.tsx`

  ```tsx
  'use client'

  import { useEffect, useRef, useState, type FocusEvent, type FormEvent } from 'react'

  import type { ToolId, WarnaPilar } from '@/lib/konstanta'
  import { hitung, teksRibuan, type HasilBerhasil, type Isian, type Masukan, type ParameterTersimpan, type TeksIsian } from '@/modules/hitung'

  import { barisAwal, FormKalkulator, idIsian } from './FormKalkulator'
  import { HasilKalkulator } from './HasilKalkulator'
  import gaya from './Kalkulator.module.css'

  type Props = {
    id: string
    toolId: ToolId
    isian: Isian[]
    contoh: Masukan
    tombol: string
    lanjutan: string | null
    parameter: ParameterTersimpan[]
    teks: TeksIsian
    /** Hasil untuk contoh, dirender server; ditampilkan sampai pembaca menghitung sendiri. */
    hasilContoh: HasilBerhasil
    warna: WarnaPilar | null
  }

  /** Teks rupiah tanpa desimal ("8000000", "Rp 8.000.000") yang dirapikan saat isian ditinggalkan. `\s` mencakup spasi tak putus. */
  const RUPIAH_POLOS = /^\s*(rp\.?)?\s*\d[\d.\s]*$/i

  /**
   * Kalkulator di browser: membaca form, memanggil modul hitung dengan parameter dari CMS dan tanggal
   * hari ini, lalu menampilkan hasil atau galat. Galat tampil di bawah field (`aria-live`), fokus pindah
   * ke isian pertama yang salah, dan hasil diumumkan lewat `role="status"`. Validasi juga jalan saat
   * isian ditinggalkan; isian rupiah dirapikan saat itu.
   */
  export function Kalkulator({ id, toolId, isian, contoh, tombol, lanjutan, parameter, teks, hasilContoh, warna }: Props) {
    const [hasil, setHasil] = useState(hasilContoh)
    const [urutan, setUrutan] = useState(0)
    const [galat, setGalat] = useState<Record<string, string>>({})
    const [baris, setBaris] = useState(() => barisAwal(isian))
    const [pengumuman, setPengumuman] = useState('')
    const kotakHasil = useRef<HTMLElement>(null)
    const fokusBerikut = useRef<string | null>(null)

    // Fokus dipindah setelah React menggambar ulang: ke baris baru, ke tombol tambah setelah baris
    // dihapus, atau ke isian salah pertama (bagian `<details>` yang menyimpannya dibuka dulu).
    useEffect(() => {
      const target = fokusBerikut.current
      if (!target) return
      fokusBerikut.current = null
      const el = document.getElementById(target)
      const lipat = el?.closest('details')
      if (lipat) lipat.open = true
      // Isian diletakkan di tengah layar supaya label dan pesan galatnya ikut terlihat.
      el?.focus({ preventScroll: true })
      el?.scrollIntoView({ block: 'center' })
    })

    const rupiah = new Set(isian.filter((i) => i.jenis === 'angka' && i.satuan === 'rupiah').map((i) => i.kunci))
    const kolom = new Set(isian.flatMap((i) => (i.jenis === 'baris' ? i.kolom.map((k) => k.kunci) : [])))

    /** Nilai form saat ini dalam bentuk yang dibaca modul hitung; kolom baris berupa daftar sesuai urutan baris. */
    function baca(form: HTMLFormElement): Masukan {
      const data = new FormData(form)
      const masukan: Masukan = {}
      for (const i of isian) {
        if (i.jenis === 'baris') for (const k of i.kolom) masukan[k.kunci] = data.getAll(k.kunci).map(String)
        else masukan[i.kunci] = String(data.get(i.kunci) ?? '')
      }
      return masukan
    }

    /** Id elemen untuk kunci galat (`gaji`, atau `sks.2` untuk baris ketiga). */
    function idUntuk(kunciGalat: string): string {
      const [kunci, posisi] = kunciGalat.split('.')
      if (posisi === undefined) return idIsian(id, kunci)
      const induk = isian.find((i) => i.jenis === 'baris' && i.kolom.some((k) => k.kunci === kunci))
      return idIsian(id, kunci, baris[induk?.kunci ?? '']?.[Number(posisi)] ?? 0)
    }

    function kirim(e: FormEvent<HTMLFormElement>) {
      e.preventDefault()
      const h = hitung(toolId, baca(e.currentTarget), new Date(), parameter, teks)
      if (!h.ok) {
        setGalat(h.galat)
        const jumlah = Object.keys(h.galat).length
        setPengumuman(h.pesan ?? `Periksa ${jumlah} isian yang ditandai.`)
        // Urutan kunci galat mengikuti urutan isian di form, jadi yang pertama adalah isian paling atas.
        const pertama = Object.keys(h.galat)[0]
        if (pertama) fokusBerikut.current = idUntuk(pertama)
        return
      }
      setGalat({})
      setHasil(h)
      setUrutan((u) => u + 1)
      setPengumuman(`${h.utama.label} ${h.utama.teks}. ${h.utama.keterangan ?? ''}`.trim())
      // Di HP hasil ada di bawah form: gulir sampai hasil terlihat.
      const kotak = kotakHasil.current
      if (kotak && kotak.getBoundingClientRect().top > window.innerHeight - 160) {
        const tenang = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        kotak.scrollIntoView({ behavior: tenang ? 'auto' : 'smooth', block: 'start' })
      }
    }

    function tinggalkan(e: FocusEvent<HTMLFormElement>) {
      const el = e.target
      if (!(el instanceof HTMLInputElement) || el.type !== 'text') return
      if (rupiah.has(el.name) && RUPIAH_POLOS.test(el.value)) el.value = teksRibuan(Number(el.value.replace(/\D/g, '')))
      const kunciGalat = kolom.has(el.name)
        ? `${el.name}.${[...e.currentTarget.querySelectorAll(`[name="${el.name}"]`)].indexOf(el)}`
        : el.name
      // Isian kosong yang belum pernah salah tidak langsung ditandai saat dilewati dengan Tab.
      if (el.value.trim() === '' && !galat[kunciGalat]) return
      const h = hitung(toolId, baca(e.currentTarget), new Date(), parameter, teks)
      const pesan = h.ok ? undefined : h.galat[kunciGalat]
      setGalat((lama) => {
        const baru = { ...lama }
        if (pesan) baru[kunciGalat] = pesan
        else delete baru[kunciGalat]
        return baru
      })
    }

    /** Galat baris memakai posisi baris, jadi dibuang saat baris bertambah atau berkurang. */
    const tanpaGalatBaris = () => setGalat((lama) => Object.fromEntries(Object.entries(lama).filter(([k]) => !kolom.has(k.split('.')[0]))))

    function tambah(kunci: string) {
      const induk = isian.find((i) => i.kunci === kunci)
      if (induk?.jenis !== 'baris') return
      const baru = Math.max(-1, ...baris[kunci]) + 1
      setBaris((lama) => ({ ...lama, [kunci]: [...lama[kunci], baru] }))
      tanpaGalatBaris()
      fokusBerikut.current = idIsian(id, induk.kolom[0].kunci, baru)
    }

    function hapus(kunci: string, idBaris: number) {
      setBaris((lama) => ({ ...lama, [kunci]: lama[kunci].filter((b) => b !== idBaris) }))
      tanpaGalatBaris()
      fokusBerikut.current = `${idIsian(id, kunci)}-tambah`
    }

    return (
      <div className={gaya.kalkulator} data-warna={warna ?? undefined}>
        <FormKalkulator
          id={id}
          isian={isian}
          nilai={contoh}
          galat={galat}
          tombol={tombol}
          lanjutan={lanjutan}
          baris={baris}
          onSubmit={kirim}
          onBlur={tinggalkan}
          onTambah={tambah}
          onHapus={hapus}
        />
        <HasilKalkulator ref={kotakHasil} id={id} hasil={hasil} baru={urutan > 0} tombol={tombol} urutan={urutan} />
        <p className="sr" role="status">
          {pengumuman}
        </p>
      </div>
    )
  }
  ```

  ```diff
  diff --git a/src/components/tools/HalamanTool.tsx b/src/components/tools/HalamanTool.tsx
  index 0d7ce3d..e8b60a5 100644
  --- a/src/components/tools/HalamanTool.tsx
  +++ b/src/components/tools/HalamanTool.tsx
  @@ -6,16 +6,14 @@ import { BlokSumber } from '@/components/artikel/BlokSumber'
   import { Catatan } from '@/components/artikel/Catatan'
   import { Faq } from '@/components/artikel/Faq'
   import { IsiArtikel } from '@/components/isi/IsiArtikel'
  -import type { Hasil, Kalkulator } from '@/modules/hitung'
  +import type { Hasil, Kalkulator as DataKalkulator } from '@/modules/hitung'
   import { tanggalIndonesia } from '@/modules/konten/artikel'
   import type { DataTool } from '@/modules/konten/tipe'
   import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
   import type { Situs } from '@/modules/seo/tipe'
   
   import { AturanTool } from './AturanTool'
  -import { barisAwal, FormKalkulator } from './FormKalkulator'
  -import { HasilKalkulator } from './HasilKalkulator'
  -import gayaKalkulator from './Kalkulator.module.css'
  +import { Kalkulator } from './Kalkulator'
   import gaya from './Tool.module.css'
   
   /** Id form kalkulator; satu kalkulator per halaman. */
  @@ -24,9 +22,10 @@ export const ID_KALKULATOR = 'kalkulator'
   /**
    * Halaman `/tools/{slug}` (spesifikasi §4): kalkulator di atas lipatan dengan hasil besar, lalu artikel
    * penjelasan rumus, angka aturan yang dipakai, catatan pilar, sumber aturan, dan FAQ. JSON-LD
  - * WebApplication dari modul SEO. Tanpa JavaScript, form dan hasil contoh dari server tetap tampil.
  + * WebApplication dari modul SEO. Kalkulator menghitung di browser; tanpa JavaScript, form dan hasil
  + * contoh dari server tetap tampil.
    */
  -export function HalamanTool({ tool, kalkulator, contoh, situs }: { tool: DataTool; kalkulator: Kalkulator; contoh: Hasil | null; situs: Situs }) {
  +export function HalamanTool({ tool, kalkulator, contoh, situs }: { tool: DataTool; kalkulator: DataKalkulator; contoh: Hasil | null; situs: Situs }) {
     const masukan = { jenis: 'tools', doc: tool.seo } as const
     const pesan = kalkulator.pesan ?? (contoh && !contoh.ok ? contoh.pesan : null)
     return (
  @@ -54,18 +53,18 @@ export function HalamanTool({ tool, kalkulator, contoh, situs }: { tool: DataToo
             {pesan ?? 'Kalkulator ini sedang diperbarui. Coba lagi nanti.'}
           </p>
         ) : (
  -        <div className={gayaKalkulator.kalkulator} data-warna={tool.pilar?.warna}>
  -          <FormKalkulator
  -            id={ID_KALKULATOR}
  -            isian={kalkulator.isian}
  -            nilai={kalkulator.contoh}
  -            galat={{}}
  -            tombol={kalkulator.tombol}
  -            lanjutan={kalkulator.lanjutan}
  -            baris={barisAwal(kalkulator.isian)}
  -          />
  -          <HasilKalkulator id={ID_KALKULATOR} hasil={contoh} baru={false} tombol={kalkulator.tombol} />
  -        </div>
  +        <Kalkulator
  +          id={ID_KALKULATOR}
  +          toolId={tool.toolId}
  +          isian={kalkulator.isian}
  +          contoh={kalkulator.contoh}
  +          tombol={kalkulator.tombol}
  +          lanjutan={kalkulator.lanjutan}
  +          parameter={tool.parameter}
  +          teks={tool.bantuan}
  +          hasilContoh={contoh}
  +          warna={tool.pilar?.warna ?? null}
  +        />
         )}
   
         <div className={gaya.badan}>
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

  Hasil yang diharapkan: bersih; unit `Test Files 51 passed (51)`, `Tests 342 passed (342)`; integrasi `Test Files 27 passed (27)`, `Tests 78 passed (78)`; E2E `87 passed`. Anotasi tes anggaran mencatat JS kalkulator di atas artikel sekitar 13,3 KiB.

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/components/tools tests/unit/halaman-tool.test.ts tests/e2e/hitung.spec.ts tests/e2e/motion.spec.ts
  git commit -m "feat(ui): kalkulator menghitung di browser: galat di bawah isian, fokus, pengumuman hasil, animasi angka CSS, dan anggaran JS"
  ```

### Task 10: Penanda rubrik dan Tools aktif di header (`aria-current`)

**Files:**
- Create: `src/components/tata-letak/TautanAktif.tsx`
- Modify: `src/components/tata-letak/Header.tsx`, `src/components/tata-letak/Header.module.css`, `src/modules/konten/tampilan.ts`, `tests/unit/komponen-tata-letak.test.ts`, `tests/e2e/tata-letak.spec.ts`

**Interfaces:**
- Consumes: `Tautan`, `tautanInternal` (Rencana 4A), `Header` dan `DataHeader` (Rencana 4A).
- Produces:
  - `tandaAktif(path: string | null, href: string): 'page' | 'true' | undefined` di `src/modules/konten/tampilan.ts`: `page` bila path sama dengan href, `true` bila path berada di bawahnya (`/uang-karier/pajak` untuk `/uang-karier`, `/tools/gaji-bersih` untuk `/tools`), kosong untuk path lain dan URL luar; `/` tidak pernah menjadi induk path lain.
  - Komponen klien `TautanAktif({ href, className, children })` (`usePathname`), dipakai pill rubrik dan tombol Tools di `Header`.

Rencana 4B menunda penanda rubrik aktif karena header dirender layout yang tidak tahu path halaman. `TautanAktif` membaca path lewat `usePathname`. Saat halaman dirender di server (prerender dan ISR) path sudah tersedia, jadi `aria-current` sudah ada di HTML awal dan tetap benar tanpa JavaScript (diuji E2E dengan JavaScript mati); navigasi di klien memperbaruinya. Biayanya kecil karena hanya satu komponen yang memanggil hook.

Tampilan aktif tidak hanya warna: pill rubrik aktif berlatar `--permukaan` (sand) dengan garis tipis dan teks tebal (800), tombol Tools aktif bergaris bawah setebal `--garis-tebal`. Logika pencocokan path ada di fungsi murni `tandaAktif` dan diuji unit; komponen diuji render dengan `next/navigation` di-mock.

- [ ] **Langkah 1: Tulis tes yang gagal**

  ```diff
  diff --git a/tests/unit/komponen-tata-letak.test.ts b/tests/unit/komponen-tata-letak.test.ts
  index 633ec0b..311ccf0 100644
  --- a/tests/unit/komponen-tata-letak.test.ts
  +++ b/tests/unit/komponen-tata-letak.test.ts
  @@ -1,10 +1,14 @@
   import { createElement as h } from 'react'
   import { renderToStaticMarkup } from 'react-dom/server'
  -import { describe, expect, it } from 'vitest'
  +import { describe, expect, it, vi } from 'vitest'
   
   import { Ikon } from '@/components/dasar/Ikon'
   import { Footer } from '@/components/tata-letak/Footer'
   import { Header } from '@/components/tata-letak/Header'
  +import { tandaAktif } from '@/modules/konten/tampilan'
  +
  +const path = vi.hoisted(() => ({ sekarang: null as string | null }))
  +vi.mock('next/navigation', () => ({ usePathname: () => path.sekarang }))
   
   describe('Ikon', () => {
     it('dekoratif disembunyikan dari pembaca layar; dengan label dibaca sebagai gambar', () => {
  @@ -37,12 +41,39 @@ describe('Header', () => {
       expect(html).toMatch(/href="\/tools"[^>]*>Tools<\/a>/)
     })
   
  +  it('menandai rubrik dan Tools yang sedang dibuka dengan aria-current', () => {
  +    const data = {
  +      menu: [
  +        { label: 'Uang & Karier', href: '/uang-karier', warna: 'hijau' as const },
  +        { label: 'Sehat', href: '/sehat', warna: 'koral' as const },
  +      ],
  +      tools: { label: 'Tools', href: '/tools' },
  +    }
  +    path.sekarang = '/uang-karier/pajak'
  +    expect(renderToStaticMarkup(h(Header, { data })).match(/aria-current="[^"]*"/g)).toEqual(['aria-current="true"'])
  +    path.sekarang = '/tools/gaji-bersih'
  +    expect(renderToStaticMarkup(h(Header, { data }))).toMatch(/aria-current="true" href="\/tools">Tools<\/a>/)
  +    path.sekarang = null
  +  })
  +
     it('tanpa menu tidak merender nav kosong', () => {
       const html = renderToStaticMarkup(h(Header, { data: { menu: [], tools: { label: 'Tools', href: '/tools' } } }))
       expect(html).not.toContain('<nav')
     })
   })
   
  +describe('tandaAktif', () => {
  +  it('page untuk path yang sama, true untuk path di bawahnya, kosong untuk beranda dan URL luar', () => {
  +    expect(tandaAktif('/uang-karier', '/uang-karier')).toBe('page')
  +    expect(tandaAktif('/uang-karier/pajak', '/uang-karier')).toBe('true')
  +    expect(tandaAktif('/uang-karierku', '/uang-karier')).toBeUndefined()
  +    expect(tandaAktif('/tools', '/')).toBeUndefined()
  +    expect(tandaAktif('/', '/')).toBe('page')
  +    expect(tandaAktif('/tools', 'https://point.kit.com/tools')).toBeUndefined()
  +    expect(tandaAktif(null, '/tools')).toBeUndefined()
  +  })
  +})
  +
   describe('Footer', () => {
     it('tautan situs, sosial, saluran WhatsApp, dan hak cipta', () => {
       const html = renderToStaticMarkup(
  ```

  ```diff
  diff --git a/tests/e2e/tata-letak.spec.ts b/tests/e2e/tata-letak.spec.ts
  index 795347f..6998600 100644
  --- a/tests/e2e/tata-letak.spec.ts
  +++ b/tests/e2e/tata-letak.spec.ts
  @@ -17,6 +17,28 @@ test('header berisi rubrik dari CMS, tombol Tools, dan bahasa halaman Indonesia'
     await expect(page.getByRole('contentinfo').getByRole('navigation', { name: 'Tentang point.' }).getByRole('link')).toHaveCount(6)
   })
   
  +test('header menandai rubrik dan Tools yang sedang dibuka, juga sebelum JavaScript jalan', async ({ page, browser }) => {
  +  const rubrik = page.getByRole('navigation', { name: 'Rubrik' })
  +  const tools = page.getByRole('banner').getByRole('link', { name: 'Tools' })
  +  await page.goto('/')
  +  await expect(page.getByRole('banner').locator('[aria-current]')).toHaveCount(0)
  +  await page.goto('/uang-karier')
  +  await expect(rubrik.getByRole('link', { name: 'Uang & Karier' })).toHaveAttribute('aria-current', 'page')
  +  await rubrik.getByRole('link', { name: 'Sehat' }).click()
  +  await expect(page).toHaveURL('/sehat')
  +  await expect(rubrik.getByRole('link', { name: 'Sehat' })).toHaveAttribute('aria-current', 'page')
  +  await expect(rubrik.getByRole('link', { name: 'Uang & Karier' })).not.toHaveAttribute('aria-current')
  +  await page.goto('/tools/gaji-bersih')
  +  await expect(tools).toHaveAttribute('aria-current', 'true')
  +
  +  const tanpaJs = await browser.newContext({ javaScriptEnabled: false })
  +  const halaman = await tanpaJs.newPage()
  +  await cegatCloudinary(halaman)
  +  await halaman.goto('/uang-karier/pajak')
  +  await expect(halaman.getByRole('navigation', { name: 'Rubrik' }).getByRole('link', { name: 'Uang & Karier' })).toHaveAttribute('aria-current', 'true')
  +  await tanpaJs.close()
  +})
  +
   test('skip link muncul saat Tab pertama dan menuju isi', async ({ page }) => {
     await page.goto('/')
     await page.keyboard.press('Tab')
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: 2 tes FAIL di `tests/unit/komponen-tata-letak.test.ts`: "Header > menandai rubrik dan Tools yang sedang dibuka dengan aria-current" dengan `AssertionError: expected null to deeply equal [ 'aria-current="true"' ]`, dan "tandaAktif > ..." dengan `TypeError: __vi_import_5__.tandaAktif is not a function`.

- [ ] **Langkah 3: Fungsi tandaAktif dan komponen TautanAktif**

  ```diff
  diff --git a/src/modules/konten/tampilan.ts b/src/modules/konten/tampilan.ts
  index 9b9dbc4..11e1232 100644
  --- a/src/modules/konten/tampilan.ts
  +++ b/src/modules/konten/tampilan.ts
  @@ -47,6 +47,17 @@ export function susunFooter(footer: Pick<Footer, 'tautan' | 'sosial' | 'saluranW
     }
   }
   
  +/**
  + * Penanda tautan header untuk path yang sedang dibuka: `page` bila path sama persis, `true` bila path
  + * berada di bawahnya (rubrik `/uang-karier` saat membuka `/uang-karier/pajak`, Tools saat membuka
  + * `/tools/gaji-bersih`). Beranda dan URL luar tidak pernah ditandai sebagai induk.
  + */
  +export function tandaAktif(path: string | null, href: string): 'page' | 'true' | undefined {
  +  if (!path || !tautanInternal(href)) return undefined
  +  if (path === href) return 'page'
  +  return href !== '/' && path.startsWith(`${href}/`) ? 'true' : undefined
  +}
  +
   /** Tautan internal (path situs) dirender dengan `next/link`; selain itu `<a>` biasa. */
   export function tautanInternal(href: string): boolean {
     return href.startsWith('/') && !href.startsWith('//')
  ```

  `src/components/tata-letak/TautanAktif.tsx`

  ```tsx
  'use client'

  import { usePathname } from 'next/navigation'
  import type { ReactNode } from 'react'

  import { Tautan } from '@/components/dasar/Tautan'
  import { tandaAktif } from '@/modules/konten/tampilan'

  /**
   * Tautan header yang menandai rubrik atau bagian yang sedang dibuka (`aria-current`). Path dibaca di
   * klien lewat `usePathname`, karena layout yang merender header tidak tahu path halaman; saat
   * prerender, path halaman sudah tersedia, jadi penandanya ada di HTML awal.
   */
  export function TautanAktif({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
    return (
      <Tautan href={href} className={className} aria-current={tandaAktif(usePathname(), href)}>
        {children}
      </Tautan>
    )
  }
  ```

  ```diff
  diff --git a/src/components/tata-letak/Header.tsx b/src/components/tata-letak/Header.tsx
  index 4f7a587..fe71ade 100644
  --- a/src/components/tata-letak/Header.tsx
  +++ b/src/components/tata-letak/Header.tsx
  @@ -3,8 +3,12 @@ import { Tautan } from '@/components/dasar/Tautan'
   import type { DataHeader } from '@/modules/konten/tipe'
   
   import gaya from './Header.module.css'
  +import { TautanAktif } from './TautanAktif'
   
  -/** Header situs: logo, pill rubrik dengan titik warna pilar, dan tombol Tools hitam (spesifikasi §4). */
  +/**
  + * Header situs: logo, pill rubrik dengan titik warna pilar, dan tombol Tools hitam (spesifikasi §4).
  + * Pill dan tombol Tools menandai bagian yang sedang dibuka (`aria-current`).
  + */
   export function Header({ data }: { data: DataHeader }) {
     return (
       <header className={gaya.header}>
  @@ -18,18 +22,18 @@ export function Header({ data }: { data: DataHeader }) {
               <ul className={gaya.daftar}>
                 {data.menu.map((item) => (
                   <li key={item.href}>
  -                  <Tautan href={item.href} className={gaya.pil}>
  +                  <TautanAktif href={item.href} className={gaya.pil}>
                       {item.warna && <span className={gaya.titik} data-warna={item.warna} aria-hidden="true" />}
                       {item.label}
  -                  </Tautan>
  +                  </TautanAktif>
                   </li>
                 ))}
               </ul>
             </nav>
           )}
  -        <Tautan href={data.tools.href} className={gaya.tools}>
  +        <TautanAktif href={data.tools.href} className={gaya.tools}>
             {data.tools.label}
  -        </Tautan>
  +        </TautanAktif>
         </div>
       </header>
     )
  ```

  ```diff
  diff --git a/src/components/tata-letak/Header.module.css b/src/components/tata-letak/Header.module.css
  index ac03e70..13b6947 100644
  --- a/src/components/tata-letak/Header.module.css
  +++ b/src/components/tata-letak/Header.module.css
  @@ -82,6 +82,19 @@
     text-decoration: underline;
   }
   
  +/* Bagian yang sedang dibuka: pill tebal berlatar sand, tombol Tools bergaris bawah. Tidak hanya warna. */
  +.pil[aria-current] {
  +  box-shadow: inset 0 0 0 1px var(--garis);
  +  background: var(--permukaan);
  +  font-weight: 800;
  +}
  +
  +.tools[aria-current] {
  +  text-decoration: underline;
  +  text-decoration-thickness: var(--garis-tebal);
  +  text-underline-offset: 0.2em;
  +}
  +
   .pil:active,
   .tools:active {
     transform: scale(0.97);
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

  Hasil yang diharapkan: bersih; unit `Test Files 51 passed (51)`, `Tests 344 passed (344)`; integrasi `Test Files 27 passed (27)`, `Tests 78 passed (78)`; E2E `88 passed` (termasuk anggaran JS semua jenis halaman dengan `TautanAktif` di header).

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/components/tata-letak src/modules/konten/tampilan.ts tests/unit/komponen-tata-letak.test.ts tests/e2e/tata-letak.spec.ts
  git commit -m "feat(ui): penanda rubrik dan Tools aktif di header (aria-current)"
  ```

### Task 11: Aturan modul `hitung` dan halaman kalkulator di CLAUDE.md, keputusan angka hasil di spesifikasi, dan pemeriksaan akhir

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-11-03-point-lat-design.md`

**Interfaces:**
- Consumes: semua task sebelumnya.
- Produces: aturan proyek untuk agen dan pengembang berikutnya: semua rumus di `src/modules/hitung`, angka aturan hanya lewat `parameter-tools` dengan sumber dan tanggal berlaku, tag `parameter-tools`, pola halaman `/tools/{slug}` (hasil contoh server, hitung di browser, teks isian dari CMS), `Kalkulator` dan `TautanAktif` sebagai komponen klien, angka lewat `Intl` dengan `\u00a0`, dan anggaran JS kalkulator. Spesifikasi §6 mencatat bentuk `parameterTools` (nilai atau tabel), §13 mencatat keputusan angka hasil dengan CSS.

- [ ] **Langkah 1: Perbarui CLAUDE.md dan spesifikasi**

  ```diff
  diff --git a/CLAUDE.md b/CLAUDE.md
  index 5f7094d..a1fd64e 100644
  --- a/CLAUDE.md
  +++ b/CLAUDE.md
  @@ -20,7 +20,7 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Type check: `npm run typecheck`
   - Tipe Payload: `npm run generate:types` (jalankan setiap kali field berubah)
   - Import map admin: `npm run generate:importmap` (jalankan setiap kali menambah fitur Lexical atau komponen admin)
  -- Data awal: `npm run seed`
  +- Data awal: `npm run seed` (pilar, penulis, halaman draf, global, dan enam kalkulator draf beserta parameternya; dokumen yang sudah ada tidak ditimpa)
   - Aset sistem Cloudinary (sekali per akun, butuh kredensial): `npm run media:siapkan`
   
   ## Konvensi
  @@ -30,18 +30,20 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Satu file satu tanggung jawab. Koleksi di `src/collections/`, global di `src/globals/`, blok di `src/blocks/`, field bersama di `src/fields/`, hook di `src/hooks/`, akses di `src/access/`.
   - Path publik selalu dibangun lewat `pathFor()` di `src/lib/paths.ts`, jangan merangkai string URL manual. Halaman indeks memakai `PATH_INDEKS` (`/cari`, `/glosarium`, `/tools`, `/video`).
   - SEO selalu lewat `src/modules/seo`: `metadata()` untuk `generateMetadata`, `jsonLd()` + `serialisasiJsonLd()` untuk JSON-LD, `remahRoti()` untuk breadcrumb, `ambilSitus()` untuk pengaturan situs. Jangan menulis `<title>`, canonical, robots, atau JSON-LD manual di halaman. Rute teknis (`/sitemap.xml`, `/sitemap/{jenis}.xml`, `/news-sitemap.xml`, `/robots.txt`, `/feed.xml`) ada di `src/app/(frontend)/` dan hanya merangkai fungsi modul.
  -- Tag cache di `src/lib/tag.ts` (`TAG`): data halaman publik di-cache dengan tag yang sama dengan yang direvalidasi hook `revalidasiPublik` (`{koleksi}`, `{koleksi}:{id}`, `pilar:{slug}`, `beranda`, `sitemap`, `pengaturan-seo`, `header`, `footer`, `media`, `redirect`). Koleksi publik baru wajib memasang `revalidasiPublik(koleksi)`. Tag `beranda` dibuang global `beranda` dan `newsletter` serta terbitnya artikel, pilar, video, dan tools; koleksi yang baru tampil di beranda ditambahkan ke `DI_BERANDA`.
  +- Tag cache di `src/lib/tag.ts` (`TAG`): data halaman publik di-cache dengan tag yang sama dengan yang direvalidasi hook `revalidasiPublik` (`{koleksi}`, `{koleksi}:{id}`, `pilar:{slug}`, `beranda`, `sitemap`, `pengaturan-seo`, `header`, `footer`, `media`, `redirect`, `parameter-tools`). Koleksi publik baru wajib memasang `revalidasiPublik(koleksi)`. Tag `beranda` dibuang global `beranda` dan `newsletter` serta terbitnya artikel, pilar, video, dan tools; koleksi yang baru tampil di beranda ditambahkan ke `DI_BERANDA`.
   - URL media selalu lewat `src/modules/media` (`bangunUrl`, `propsGambar`, `urlOg`), jangan merangkai URL Cloudinary manual. `next/image` memakai loader kustom Cloudinary, jadi `src` harus URL dari `bangunUrl`/`propsGambar` dan `width`/`height` wajib diisi.
   - Media disimpan di Cloudinary (folder `point/gambar`, `point/video`). Tanpa `CLOUDINARY_*` di env (lokal, tes) dipakai klien palsu dalam memori: file tidak tersimpan permanen. Tes tidak boleh memanggil jaringan.
   - Halaman publik di `src/app/(frontend)/` dirender ISR: rute dinamis memakai `generateStaticParams` yang mengembalikan `[]`, dan data diambil lewat `muat*()` dari `src/modules/konten` (cache bertag `TAG`). Path tanpa dokumen diakhiri `tanganiTidakAda(path)` di komponen halaman (redirect dari koleksi `redirect` atau 404), sedangkan `generateMetadata` mengembalikan `metadataTidakDitemukan()` untuk path itu.
   - Rute catch-all `[...jalur]` mencari dokumen lewat `muatJalur()`: satu segmen artikel, pilar, lalu halaman statis; dua segmen subkategori di bawah pilarnya. Jenis halaman tingkat atas baru ditambahkan di `muatJalur`, bukan sebagai rute bersaudara. `/cari` satu-satunya halaman dinamis (membaca `searchParams`, noindex); hasilnya di-cache per kueri.
   - Beranda dirender dari global `beranda` lewat `susunBeranda()`: urutan blok dari editor, tanpa data palsu (blok "Paling dibaca" menampilkan tulisan terbaru dengan judul "Tulisan terbaru" sampai data kunjungan ada, newsletter hanya tautan ke form penyedia, slot iklan belum dirender).
  -- Komponen UI publik di `src/components/`, server component kecuali benar-benar butuh browser (`'use client'` seperti `Catat404` dan `PemicuMasuk`). Gaya di CSS Module di sebelah komponen dan memakai token semantik dari `src/styles/tokens.css` (`--teks`, `--latar`, `--permukaan`, `--latar-terbalik`, `--teks-terbalik`, `--pilar`, `--ruang-*`, `--durasi-*`), bukan hex atau token primitif. Animasi hanya `transform` dan `opacity`, dan semuanya mati di `prefers-reduced-motion: reduce`. Reveal judul beranda memakai animasi CSS, tanpa JavaScript.
  +- Kalkulator: semua rumus di `src/modules/hitung` sebagai fungsi murni. `hitung(toolId, masukan, tanggal, parameter, teks)` satu-satunya titik masuk perhitungan (dipakai sama di server dan browser), `siapkanKalkulator` untuk halaman, `periksaParameter` untuk validasi koleksi `parameter-tools`. Rumus per tool di file sendiri (`gaji-bersih.ts`, `thr.ts`, ...). Angka aturan (tarif, PTKP, batas iuran, kategori, konversi) tidak pernah ditulis sebagai konstanta di kode: definisikan kuncinya di `parameter` rumusnya, isi nilainya lewat `src/seed/parameter-tools.ts` dengan sumber resmi dan tanggal berlaku, dan uji dengan contoh perhitungan dari sumber resmi. Parameter yang tidak berlaku untuk tanggal hitung memakai parameter terakhir yang valid dengan peringatan.
  +- Halaman `/tools/{slug}` ISR: hasil contoh untuk isi form awal dirender server (tampil tanpa JavaScript), `Kalkulator` (klien) menghitung di browser. Label dan bantuan isian dari CMS (`bantuanInput`) diteruskan ke `hitung` lewat `teks`, jadi pesan galat memakai label yang sama dengan form. Angka hasil baru memakai animasi CSS, tanpa GSAP.
  +- Komponen UI publik di `src/components/`, server component kecuali benar-benar butuh browser (`'use client'` seperti `Catat404`, `PemicuMasuk`, `Kalkulator`, dan `TautanAktif`). Gaya di CSS Module di sebelah komponen dan memakai token semantik dari `src/styles/tokens.css` (`--teks`, `--latar`, `--permukaan`, `--latar-terbalik`, `--teks-terbalik`, `--pilar`, `--ruang-*`, `--durasi-*`), bukan hex atau token primitif. Animasi hanya `transform` dan `opacity`, dan semuanya mati di `prefers-reduced-motion: reduce`. Reveal judul beranda memakai animasi CSS, tanpa JavaScript.
   - Tata letak yang isinya diatur editor (jumlah blok, kartu, atau bagian berubah) tidak boleh bergantung pada jumlah elemen, misalnya `grid-row: span N`. Jarak antarbagian hanya dari `gap` atau satu kelas margin, dan dijaga tes E2E yang mengukur jaraknya.
   - Tautan internal lewat komponen `Tautan` (`next/link` untuk path situs). Warna pilar lewat atribut `data-warna` (nilai field `warna` pilar) dan selalu bersama nama pilarnya. Ikon lewat `Ikon` (path Lucide yang disalin, tanpa paket ikon).
  -- Copy UI: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru.
  +- Copy UI: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru. Angka lewat `Intl.NumberFormat('id-ID')` (`teksAngka` modul hitung); rupiah dari `Intl` memakai spasi tak putus setelah "Rp", jadi di kode dan tes tulis `\u00a0`, jangan karakter aslinya.
   - Tes unit di `tests/unit/*.test.ts`, tes integrasi di `tests/int/*.int.spec.ts` dan memakai `getTestPayload()` + `unik()` dari `tests/int/helpers.ts`.
  -- Tes E2E di `tests/e2e/*.spec.ts` memakai `cegatCloudinary()` (gambar tanpa jaringan) dan `periksaAxe()` (WCAG 2.2 AA) dari `tests/e2e/bantu.ts`; data contohnya di `tests/e2e/siapkan.ts`. Anggaran JavaScript (total di bawah 160 KiB per halaman, spesifikasi §12) dijaga `motion.spec.ts` untuk setiap jenis halaman; jenis halaman baru ditambahkan ke daftarnya.
  +- Tes E2E di `tests/e2e/*.spec.ts` memakai `cegatCloudinary()` (gambar tanpa jaringan) dan `periksaAxe()` (WCAG 2.2 AA) dari `tests/e2e/bantu.ts`; data contohnya di `tests/e2e/siapkan.ts`. Anggaran JavaScript (total di bawah 160 KiB per halaman, spesifikasi §12) dijaga `motion.spec.ts` untuk setiap jenis halaman; jenis halaman baru ditambahkan ke daftarnya. JS kalkulator di atas JS artikel dijaga di bawah 25 KB. Kalkulator diuji di `kalkulator.spec.ts` (enam tools dari `TOOLS_CONTOH` di tiga ukuran layar) dan `hitung.spec.ts` (contoh resmi DJP lewat form).
   
   ## Batasan
   - Jangan commit `.env`. `.env.test` boleh di-commit karena hanya untuk database tes lokal dan tidak boleh berisi `CLOUDINARY_*`.
  ```

  ```diff
  diff --git a/docs/superpowers/specs/2026-11-03-point-lat-design.md b/docs/superpowers/specs/2026-11-03-point-lat-design.md
  index 96b1877..78fbc21 100644
  --- a/docs/superpowers/specs/2026-11-03-point-lat-design.md
  +++ b/docs/superpowers/specs/2026-11-03-point-lat-design.md
  @@ -175,7 +175,7 @@ point-lat/
   | `pilar` | nama, slug, warna, deskripsi, intro halaman rubrik, SEO, urutan |
   | `subkategori` | nama, slug, pilar induk, deskripsi |
   | `tools` | nama, slug, pilar, kalkulator (`toolId` yang dipetakan ke modul `hitung`), label & bantuan input, artikel penjelasan (blok), FAQ, sumber aturan, SEO |
  -| `parameterTools` | `toolId`, kunci (mis. PTKP TK/0), nilai, berlaku mulai, berlaku sampai, sumber |
  +| `parameterTools` | `toolId`, kunci (mis. `ptkp-dasar`, `ter-a`), nilai (satu angka) atau tabel (baris: label, batas, nilai; untuk tarif berlapis dan daftar pilihan), berlaku mulai, berlaku sampai, sumber, catatan. Kunci dan bentuknya divalidasi modul `hitung` |
   | `video` | judul, slug, media Cloudinary (9:16), poster, transkrip, takarir WebVTT (opsional, dilayani `/video/{slug}/takarir.vtt`), durasi, artikel induk, pilar, SEO |
   | `penulis` | nama, slug, foto, bio, keahlian, tautan (LinkedIn dsb.), artikel |
   | `halaman` | judul, slug, page builder (blok: hero, teks, kartu, CTA, FAQ, embed tool), SEO |
  @@ -320,7 +320,7 @@ Lighthouse CI menolak build bila skor Performance HP < 90 di halaman contoh (ber
   - Masuk kartu: naik 12px + opacity, berurutan 40 ms, total < 300 ms, hanya sekali saat pertama terlihat.
   - Perpindahan halaman: View Transitions API (CSS), elemen bersama untuk kartu → judul artikel.
   - Reveal judul raksasa beranda: animasi CSS per kata (naik 0,3em + opacity, 400 ms, berurutan 80 ms), tanpa JavaScript, judul tampil di paint pertama. Diubah pemilik 2026-11-05 dari GSAP, karena GSAP membuat JS beranda 168,6 KiB (di atas anggaran §12) dan membuat judul menunggu skrip atau berkedip.
  -- Angka hasil kalkulator: GSAP atau CSS diputuskan di Rencana 5 dengan anggaran §12 yang sama.
  +- Angka hasil kalkulator: animasi CSS saat hasil baru muncul (naik 0,3em + opacity, 250 ms), tanpa JavaScript animasi; hasil contoh dari server tidak dianimasikan. Diputuskan Rencana 5, karena GSAP (27,5 KB gzip) saja sudah melewati anggaran JS milik point. 25 KB, sedangkan kalkulator dan modul `hitung` sudah sekitar 13 KB.
   - Tidak ada animasi berjalan terus (ambient). Hanya `transform` dan `opacity`.
   - `prefers-reduced-motion: reduce` mematikan semua animasi dan View Transitions; konten tetap utuh.
   
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
  npm run seed
  npm run build
  git status --short
  ```

  Hasil yang diharapkan: `payload-types.ts` dan import map tidak berubah; type check dan lint bersih; unit `Test Files 51 passed (51)`, `Tests 344 passed (344)`; integrasi `Test Files 27 passed (27)`, `Tests 78 passed (78)`; E2E `88 passed`; build mencantumkan `● /tools/[slug]` di samping rute Rencana 4B (`○ /`, `○ /glosarium`, `○ /tools`, `○ /video`, `● /[...jalur]`, `● /glosarium/[slug]`, `● /penulis/[slug]`, `● /video/[slug]`, `ƒ /cari`); `git status` hanya menunjukkan `CLAUDE.md` dan spesifikasi (buang blok "nextjs-agent-rules" bila build menambahkannya, lihat Global Constraints).

- [ ] **Langkah 3: Uji visual di tiga ukuran layar**

  Bangun dan jalankan build dengan database E2E, yang sudah berisi enam kalkulator terbit dari `npm run test:e2e` di langkah 2 (`set -a` memuat `PAYLOAD_SECRET` dari `.env.test`; nama database diambil dari `DATABASE_URL` tes tanpa query lalu ditambah `_e2e`, sama dengan `playwright.config.ts`):

  ```bash
  set -a && . ./.env.test && set +a
  DATABASE_URL="${DATABASE_URL%%\?*}_e2e" CLOUDINARY_CLOUD_NAME=e2e CLOUDINARY_API_KEY=e2e CLOUDINARY_API_SECRET=e2e npm run build
  (DATABASE_URL="${DATABASE_URL%%\?*}_e2e" CLOUDINARY_CLOUD_NAME=e2e CLOUDINARY_API_KEY=e2e CLOUDINARY_API_SECRET=e2e PORT=3200 npm run start > /tmp/point-lat-start.log 2>&1 &)
  timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'
  ```

  Buka `/tools/gaji-bersih`, `/tools/thr`, `/tools/cicilan-kpr`, `/tools/dana-darurat`, `/tools/bmi-kalori`, dan `/tools/ipk` di 375, 768, dan 1440 px (DevTools) dan dengan "Emulate CSS prefers-reduced-motion: reduce". Untuk setiap halaman periksa empat keadaan: awal (contoh hasil dari server), hasil (ubah satu isian lalu tekan tombol "Hitung ..."), galat (kosongkan isian pertama lalu tekan tombol), dan fokus keyboard (Tab dari awal halaman sampai tombol "Hitung ...": cincin fokus terlihat di setiap isian, radio, centang, ringkasan bagian lanjutan, dan tombol). Harus terlihat: tanpa geser horizontal; tombol satu baris dan tidak melebar penuh kecuali tombol utama; kisi status PTKP 4 kolom tanpa teks terpotong; angka hasil satu baris (coba gaji Rp10.000.000.000 di 375 px); tidak ada ruang kosong besar di dalam kotak hasil atau di antara bagian; hasil baru muncul dengan gerak naik singkat, dan tanpa gerak saat reduced motion. Buka juga `/uang-karier` dan `/uang-karier/pajak` untuk melihat pill Uang & Karier aktif, dan `/tools/ipk` untuk tombol Tools aktif. Hentikan server dengan `fuser -k 3200/tcp`, lalu jalankan `npm run build` lagi dengan env biasa.

- [ ] **Langkah 4: Commit**

  ```bash
  git add CLAUDE.md docs/superpowers/specs/2026-11-03-point-lat-design.md
  git commit -m "docs: modul hitung, halaman kalkulator, dan angka hasil CSS di CLAUDE.md dan spesifikasi"
  ```

---

## Selesai bila

- `npm test` lulus (344 tes unit di 51 file dan 78 tes integrasi di 27 file), `npm run test:e2e` lulus (88 tes E2E, axe tanpa pelanggaran WCAG 2.2 AA untuk keenam halaman kalkulator di 375, 768, dan 1440 px), `npm run typecheck` dan `npm run lint` bersih, `npm run build` berhasil, semuanya tanpa jaringan dan tanpa kredensial Cloudinary asli.
- Modul `hitung` menghasilkan angka contoh resmi: Leaflet PPh 21 TER DJP (Rp900.000 sebulan, Rp11.055.000 setahun, Rp1.155.000 Desember), penjelasan DJP gaji Rp10.000.000 (Rp200.000, Rp2.715.000, Rp515.000), THR DJP (1% lalu 5%), THR indonesiabaik.id, dan cicilan anuitas Kompas (Rp1.653.000). Contoh Leaflet DJP juga lulus lewat form di browser (`hitung.spec.ts`).
- `/tools/{slug}` untuk tools terbit menampilkan kalkulator dengan hasil contoh di HTML awal, penjelasan rumus, angka aturan beserta tanggal berlaku dan sumbernya, sumber aturan, dan FAQ, dengan metadata dan JSON-LD WebApplication dari modul SEO; tools draf dan slug tidak dikenal menjawab 404.
- Menyimpan atau menghapus dokumen `parameter-tools` membuang cache halaman kalkulator (tag `parameter-tools`); dokumen dengan kunci atau bentuk yang salah ditolak di admin dengan pesan di field-nya.
- `npm run seed` membuat enam tools draf dan 22 parameter bersumber, dan tidak menimpa apa pun bila dijalankan lagi.
- Halaman kalkulator memuat JavaScript di bawah 160 KiB dan kalkulator menambah kurang dari 25 KB di atas artikel; tanpa dependensi baru.
- Skema hanya berubah aditif (`parameter_tools.nilai` boleh kosong, tabel `parameter_tools_tabel`); `payload-types.ts` hanya berubah di Task 2.
- Pill rubrik dan tombol Tools di header menandai halaman yang sedang dibuka dengan `aria-current`, juga tanpa JavaScript.

## Cakupan yang ditunda (dengan alasan)

| Butir | Ditunda ke | Alasan |
|---|---|---|
| PPh 21 DTP (insentif pemerintah 2026, PMK 105/2025: pegawai di sektor tertentu dengan bruto sampai Rp10 juta sebulan) | Keputusan pemilik (lihat Risiko) | Berlaku untuk sektor dan pemberi kerja tertentu, jadi butuh isian sektor dan aturan kelayakan. Kalkulator menghitung PPh yang dipotong menurut PP 58/2023; untuk pegawai yang mendapat DTP, gaji bersih nyatanya lebih besar sebesar PPh itu. |
| Pilihan tingkat risiko JKK (0,24% sampai 1,74%) di form | Setelah ada masukan pembaca | Selisihnya kecil (paling banyak 1,5% upah masuk bruto) dan pembaca jarang tahu tingkat risiko kantornya. Parameter `jkk` bisa diubah menjadi tabel pilihan tanpa mengubah antarmuka modul. |
| PPh 21 pegawai tidak tetap, bukan pegawai, pensiunan, dan pesangon | Fase 2 | Aturan dan isiannya berbeda (TER harian, tarif final). MVP fokus ke pegawai tetap (spesifikasi §17: 6 tools). |
| KPR dengan bunga berjenjang atau mengambang, biaya provisi, dan asuransi | Setelah ada masukan pembaca | Butuh isian per periode bunga; kalkulator menyatakan bunga tetap di keterangan hasil dan penjelasannya. |
| IMT anak dan remaja (IMT menurut umur) | belum direncanakan | Butuh tabel pertumbuhan WHO per umur dan jenis kelamin; form menolak usia di bawah 18 dengan penjelasan. |
| Tabel konversi nilai per kampus | Setelah ada masukan pembaca | Nilai antara berbeda per kampus; satu tabel di CMS bisa diubah pemilik, dan FAQ meminta pembaca mencocokkan dengan peraturan kampusnya. |
| Hasil yang bisa dibagikan lewat URL (`?gaji=...`) | belum direncanakan | Membaca `searchParams` membuat halaman dinamis; membacanya di klien menambah JavaScript. Tidak ada di spesifikasi. |
| Kabari mesin pencari saat tools terbit atau parameter berubah | Rencana 6 | Mesin Indexing. Sitemap `tools.xml` (Rencana 3) sudah memuat tools terbit. |
| Lighthouse CI untuk halaman tools (spesifikasi §12) | Rencana 8 | Sesuai peta rencana; JS dan INP sudah diukur di probe (Keputusan teknis). |

## Risiko dan pertanyaan terbuka

| Risiko | Mitigasi |
|---|---|
| **Batas upah JP 2026 (Rp11.086.300) diambil dari salinan surat BPJS Ketenagakerjaan B/1226/022026 di portal pihak ketiga** (`hubspotusercontent`), karena situs BPJS Ketenagakerjaan tidak memuat surat itu. Angka 2025 (Rp10.547.400) disebut di surat yang sama. | Selisihnya hanya memengaruhi iuran JP karyawan dengan upah di atas Rp10,5 juta (paling banyak sekitar Rp5.400 sebulan). **Pertanyaan untuk pemilik:** konfirmasi angka ini ke BPJS Ketenagakerjaan atau HR sebelum menerbitkan Gaji Bersih; bila berbeda, cukup ubah dokumen `jp-batas` di admin. |
| Dokumen `jp-batas` 2026 berlaku sampai 28 Februari 2027. Mulai 1 Maret 2027 kalkulator Gaji Bersih dan THR memakai angka itu dengan peringatan "belum diperbarui" (spesifikasi §15) dan server mencatat `console.warn`. | Disengaja: pemilik menambah dokumen `jp-batas` baru setiap Maret (catatan dokumen menyebutnya). Bila tidak ingin peringatan, kosongkan `berlakuSampai`. |
| **Klasifikasi IMT** diambil dari metadata indikator BPS SIRUSA yang mengutip Kemenkes; halaman P2PTM Kemenkes sendiri tidak berhasil dibuka saat riset. Label di seed (sangat kurus, kurus, normal, gemuk, obesitas) menyederhanakan istilah Kemenkes (kurus tingkat berat dan ringan, gemuk tingkat ringan dan berat). IMT dibulatkan satu desimal, jadi 25,05 sampai 25,09 masuk gemuk. | **Pertanyaan:** pemilik atau editor kesehatan memeriksa label dan batas di dokumen `kategori-imt` sebelum BMI & Kalori diterbitkan; semua bisa diubah di admin tanpa kode. |
| Dana darurat: OJK menulis "berkeluarga atau punya tanggungan 9 sampai 12 kali". Pembagian menjadi menikah tanpa anak 9 dan menikah dengan anak atau punya tanggungan 12 adalah tafsiran rencana ini. | Catatan dokumen `kelipatan` menyebutnya aturan praktis. **Pertanyaan:** setuju dengan pembagian ini, atau pakai satu kondisi "berkeluarga" 12 kali? |
| Contoh cicilan anuitas dari Kompas (media), bukan regulator: buku OJK tentang perbankan diblokir `robots.txt` untuk alat riset. | Rumus anuitas baku dan diuji dengan dua contoh (Kompas dan contoh form yang dihitung ulang dari rumus); penjelasan menyebut sumbernya. |
| Konversi nilai antara IPK (A- 3,7, B+ 3,3, dan seterusnya) berbeda per kampus; Permendikbud 3/2020 hanya menetapkan A sampai E. | Ditulis di penjelasan, catatan parameter, dan FAQ; pemilik bisa mengubah tabel `konversi-nilai`. |
| **Isi seed adalah draf**: penjelasan rumus sekitar 230 sampai 590 kata per tools (spesifikasi §3 meminta 600 sampai 1.200 kata), 2 sampai 3 FAQ. | Tools tidak pernah terbit otomatis. Pemilik melengkapi dan memeriksa isi serta angka sebelum menerbitkan; E2E menerbitkan tools hanya di database tesnya. |
| PPh 21 DTP 2026 tidak dimodelkan dan belum disebut di penjelasan Gaji Bersih. | **Pertanyaan:** tambahkan satu FAQ di admin ("Bagaimana bila kantorku memberi PPh 21 DTP?") dengan tautan ke peraturan yang berlaku, atau buat isian DTP di rencana lanjutan? |
| Iuran BPJS Kesehatan sedang dibahas untuk diubah. | Angka di parameter bertanggal; perubahan cukup dokumen baru dengan `berlakuMulai` baru, tanpa deploy. |
| Kalkulator memakai tanggal perangkat pembaca (`new Date()` di browser) untuk memilih parameter; halaman di-cache sampai 1 jam. | Pemilihan per tanggal ada di modul, jadi halaman lama tetap menghitung dengan aturan yang benar untuk tanggal pembaca. Jam perangkat yang salah hanya mengubah pilihan parameter di sekitar tanggal pergantian. |
| `TautanAktif` menjadikan header komponen dengan JavaScript klien di setiap halaman. | Diukur di probe: chunk bersama halaman naik 391 byte (3.979 menjadi 4.370 byte), JS artikel dan beranda 138,6 KiB (sebelum Task 10: 138,3 KiB). Anggaran semua jenis halaman tetap dijaga `motion.spec.ts`. |
| **Isi halaman 404 kadang tidak muncul** (warisan Rencana 4A, lihat Rencana 4B). | Petunjuk ulangi sekali ada di Global Constraints. Verifikasi penuh rencana ini (11 run E2E): 1 kegagalan dengan pola itu (Task 8, tes 404 1440 px di `galat.spec.ts`); E2E penuh Task 8 lulus saat diulang. |

## Temuan review sebelum eksekusi

| Temuan | Tindakan |
|---|---|
| Probe awal: `<select>` status PTKP dengan label panjang ("TK/0: tidak kawin, tanpa tanggungan") terpotong di 375 px dan butuh dua ketukan. | Sudah masuk Task 8: kisi radio 4 kolom dengan kode terlihat dan label lengkap untuk pembaca layar (`tampilan: 'kisi'`), bantuan isian menjelaskan arti TK dan K. |
| Probe awal: tombol "Tambah mata kuliah" melebar penuh, nilai ringkasan hasil tidak rata kanan, dan tabel angka aturan TER (44 baris) membuat halaman sangat panjang. | Sudah masuk Task 8: tombol `align-self: flex-start`, `dd` ringkasan `margin-left: auto`, tabel aturan di dalam `<details>` "Lihat tabel" dengan nama parameter untuk pembaca layar. |
| Probe awal: angka hasil panjang (Rp10.000.000.000) turun ke dua baris di 375 px. | Sudah masuk Task 8: ukuran huruf dari panjang teks dan lebar kotak (faktor 0,44, container query), dijaga tes E2E di Task 8 dan Task 9. |
| Probe awal: isian yang salah di bawah header sticky tertutup header setelah fokus pindah. | Sudah masuk Task 9: fokus dengan `preventScroll`, lalu isian digulir ke tengah layar. |
| Probe awal: nama aksesibel isian rupiah terbaca "... per bulan , dalam rupiah". | Sudah masuk Task 8: teks pembaca layar " dalam rupiah" tanpa koma; tes E2E memakai nama lengkapnya. |
| Probe awal: `seedTools` mencari pilar dengan `limit: 100` dan melewatkan pilar seed di database tes yang berisi ratusan pilar dari tes lain. | Sudah masuk Task 6: pilar dicari lewat `slug in`. |
| Probe awal: `siapkanKalkulator` baru tahu parameter hilang saat pembaca menekan tombol; Payload mengembalikan `tabel: []` untuk parameter angka. | Sudah masuk Task 7: semua parameter definisi diperiksa saat menyiapkan kalkulator, dan tabel kosong dinormalkan menjadi `null` di `parameterTersimpan`. |
| Probe awal: spasi tak putus dari `Intl` tertulis sebagai karakter harfiah di kode dan tes (tidak terlihat saat review). | Sudah masuk semua task: ditulis `\u00a0`; aturannya masuk CLAUDE.md di Task 11. |
| Verifikasi penuh per commit di probe (11 commit, database tes dibuat ulang per commit): type check, lint, unit, integrasi, dan E2E hijau, kecuali E2E Task 8 (1 gagal dari 80) di tes "halaman 404 1440px ... lolos axe" dengan `<html id="__next_error__">`. | Penyebabnya perilaku 404 Next 16.3.3 dari Rencana 4A (lihat Risiko), bukan kode rencana ini. E2E penuh Task 8 lulus saat diulang (80 lulus). Petunjuk untuk pelaksana ada di Global Constraints. |
| Uji visual akhir di probe (build produksi dengan data E2E; 375, 768, 1440 px, dan 375 px reduced motion; keadaan awal, hasil, galat, dan fokus keyboard untuk keenam kalkulator; header aktif dengan dan tanpa JavaScript). | 96 tangkapan layar kalkulator dan 12 tangkapan header: axe tanpa pelanggaran di semua 72 keadaan yang diperiksa dan header, tanpa geser horizontal, angka hasil satu baris, tombol "Hitung" setinggi 56 px. Tidak ada perubahan kode. |
| Review independen setelah rencana ditulis (sebelum eksekusi): tabel TER A, B, dan C (44, 40, dan 41 lapis) dan pembagian statusnya, PTKP, tarif Pasal 17, biaya jabatan, serta iuran BPJS di seed dicocokkan baris demi baris dengan PP 58/2023, UU HPP, PMK 168/2023, dan Perpres 64/2020. Contoh Rp8.000.000 TK/0 dihitung ulang manual (bruto Rp8.363.200, TER A 1,5%, PPh Rp125.448, gaji bersih Rp7.554.552; PKP setahun Rp38.460.000, PPh setahun Rp1.923.000, gaji bersih Desember Rp7.136.928) dan contoh IPK (46,3 / 13 = 3,56). Batas upah JP 2026 Rp11.086.300 didukung sumber kedua yang terpisah (Mondaq, "Socialization Of Pension Wage Limit Regulations For The Year 2026"): Rp10.547.400 x (1 + 5,11% pertumbuhan PDB 2025) = Rp11.086.372, dibulatkan, sesuai PP 45/2015 Pasal 29 ayat 3. | Semua cocok; tidak ada perubahan kode. Angka JP tetap ditandai "perlu dicek pemilik" karena belum dari situs BPJS Ketenagakerjaan sendiri, dan bisa diubah di admin tanpa deploy. |

## Sumber riset

Semua diakses 5 November 2026 lewat pencarian dan pembacaan web (bukan dari ingatan). Penerbit di dalam kurung.

- Lampiran PP 58 Tahun 2023, tarif efektif rata-rata PPh 21 kategori A (44 lapis), B (40), C (41) (Direktorat Jenderal Pajak): https://www.pajak.go.id/sites/default/files/lampiran/Lampiran%20PP58TAHUN2023.pdf
- Leaflet PPh 21 dengan tarif efektif rata-rata, contoh Tuan R (Direktorat Jenderal Pajak): https://pajak.go.id/sites/default/files/2024-02/Leaflet%20PPh%2021%20TER.pdf
- PMK 168 Tahun 2023 tentang pemotongan PPh 21 (Kementerian Keuangan, JDIH): https://peraturan.go.id/files/permenkeu-no-168-tahun-2023.pdf
- Penghasilan Tidak Kena Pajak (Direktorat Jenderal Pajak): https://pajak.go.id/penghasilan-tidak-kena-pajak
- Memotret Keberpihakan UU HPP pada Rakyat Kecil, lapisan tarif Pasal 17 (Direktorat Jenderal Pajak): https://www.pajak.go.id/id/artikel/memotret-keberpihakan-uu-hpp-pada-rakyat-kecil
- Penjelasan DJP soal PPh 21 THR dengan skema TER, contoh TK/0 Rp6.500.000 (IKPI, mengutip DJP): https://ikpi.or.id/djp-jelaskan-soal-pph-21-untuk-thr-dengan-skema-ter/
- Perpres 64 Tahun 2020 Pasal 30 dan 32, iuran dan batas upah BPJS Kesehatan (JDIH Kementerian Keuangan): https://jdih.kemenkeu.go.id/download/179608f7-a2a0-41c0-aaec-e7d60eb36054/64TAHUN2020PERPRES.pdf
- Berapa Besaran Iuran JHT, JKK, JKM, JP dan JKP? (BPJS Ketenagakerjaan): https://www.bpjsketenagakerjaan.go.id/artikel/18913/artikel-berapa-besaran-iuran-jht,-jkk,-jkm,-jp-dan-jkp
- Surat BPJS Ketenagakerjaan B/1226/022026 tentang batas upah dan manfaat Jaminan Pensiun 2026 (salinan di portal kepatuhan pihak ketiga): https://494075.fs1.hubspotusercontent-na1.net/hubfs/494075/compliance-portal/notification-number-b1226022026.pdf
- Permenaker Nomor 6 Tahun 2016 tentang THR Keagamaan (JDIH BPK): https://peraturan.bpk.go.id/Download/252116/Kemnaker%20No.%206%20Tahun%202016.pdf
- SE Menaker M/3/HK.04.00/III/2026 tentang THR 2026 (JDIH Kementerian Ketenagakerjaan): https://jdih.kemnaker.go.id/peraturan/detail/2983/surat-edaran-menteri-nomor-m-3-hk-04-00-iii-2026
- Terbitkan edaran THR keagamaan 2026 (Kementerian Sekretariat Negara): https://www.setneg.go.id/baca/index/terbitkan_edaran_thr_keagamaan_2026_menaker_harus_dibayar_penuh_tak_boleh_dicicil
- Yuk Hitung, Kamu Bakal Dapat THR Lebaran Berapa? (Indonesiabaik.id): https://indonesiabaik.id/infografis/yuk-hitung-kamu-bakal-dapat-thr-lebaran-berapa
- Bunga anuitas: pengertian, contoh, dan cara hitung (Kompas.com): https://money.kompas.com/read/2021/09/30/183144426/bunga-anuitas-pengertian-contoh-dan-cara-hitung?page=all
- Tidak Ada Kata Terlambat untuk Dana Darurat (OJK, Sikapi Uangmu): https://sikapiuangmu.ojk.go.id/FrontEnd/CMS/Article/20586
- Metadata indikator Indeks Massa Tubuh (Badan Pusat Statistik, SIRUSA): https://sirusa.web.bps.go.id/metadata/indikator/21524
- BMI among adults (WHO Global Health Observatory): https://www.who.int/data/gho/data/themes/topics/indicator-groups/indicator-group-details/GHO/bmi-among-adults
- Mifflin dkk. 1990, A new predictive equation for resting energy expenditure in healthy individuals (abstrak di FAO AGRIS): https://agris.fao.org/search/ar/records/65de26fe7c7033e84be9ee76
- Human Energy Requirements, bab 5, nilai PAL (FAO, WHO, UNU): https://www.fao.org/4/Y5686e/y5686e07.htm
- Permendikbud 3 Tahun 2020 tentang SN Dikti, Pasal 26 (LLDIKTI Wilayah III): https://lldikti3.kemdiktisaintek.go.id/wp-content/uploads/2024/07/Permendikbud-No.-3-Tahun-2020-Standar-Nasional-Pendidikan-Tinggi.pdf
- Materi SN Dikti Permendiktisaintek 39 Tahun 2025 (LLDIKTI Wilayah VI): https://lldikti6.id/wp-content/uploads/2025/11/01.-MATERI-1-SNDIKTI-Permen-39-2025.pdf
- Grading System (Universitas Gadjah Mada): https://admission.ugm.ac.id/wp-content/uploads/sites/330/2025/04/Grading-System.pdf
- WCAG 2.2 (W3C): SC 1.3.1, 2.4.7, 2.5.8, 3.3.1, 3.3.2, 3.3.3, 4.1.3: https://www.w3.org/TR/WCAG22/
- Next.js 16.3.3 (dokumentasi terpasang di `node_modules/next/dist/docs/`): `generateStaticParams`, `'use client'`, `usePathname`; Payload 3.92.1: field `array`, `validate` dengan validator bawaan dari `payload/shared`.
- Probe workspace: branch `probe/rencana-5` (satu commit per task; tree setiap task identik dengan blok kode rencana ini).

Rencana berikutnya: **Rencana 6 (Mesin Indexing dan dashboard SEO)**.
