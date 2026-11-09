# Rencana 9: Ruang redaksi (admin bermerek, beranda admin, Dashboard SEO) dan fitur pembaca (Fitur, Kode sematan, form kontak, newsletter, tombol bagikan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin point. tampil profesional mengikuti gambar referensi pemilik, dan situs mendapat fitur yang biasanya dipasang lewat plugin WordPress, tanpa plugin unggahan dan tanpa dependensi baru. Hasilnya dirilis sebagai v1.2.0.

**Spesifikasi:** `docs/superpowers/specs/2026-11-03-point-lat-design.md` §23, ditambah §6 (global), §11 (Consent Mode), dan §12 (anggaran JS).

**Keputusan pemilik (9 November 2026):**
- Cakupan admin: merek, halaman awal, dan SEO.
- Gaya mengikuti gambar referensi dashboard korporat dari pemilik.
- Plugin diganti halaman Fitur dan Kode sematan.
- Form kontak hanya disimpan di admin.
- Newsletter disimpan di database point. (Supabase).

**Architecture:**
- **Tema admin:** `src/app/(payload)/custom.scss`, dengan token admin dan menu gelap; font Archivo dari `src/app/(payload)/layout.tsx`.
  - Logo dan ikon lewat `admin.components.graphics` (`src/modules/redaksi/admin/Grafik.tsx`).
  - Kartu "Sinkron Google" dan pengguna di bawah menu lewat `admin.components.afterNavLinks`.
- **Beranda admin:** `admin.components.views.dashboard` diganti `src/modules/redaksi/admin/BerandaAdmin.tsx`.
  - Data dari `ambilRuangRedaksi(payload, pengguna, opsi)` di `src/modules/redaksi/data.ts`.
  - Hitungan murni di `src/modules/redaksi/aturan.ts`: pekan Jakarta, perbandingan periode, kalender, persen, urutan perlu perhatian.
  - Komponen grafik SVG di `src/modules/redaksi/admin/`, tanpa pustaka.
- **Dashboard SEO:** memakai komponen kartu yang sama, dengan `periode` dari `searchParams` (7, 28, 90). Hitungan perbandingan dari `analitik-situs` di `src/modules/pantau/aturan.ts` (`bandingkanPeriode`).
- **Fitur:** global `fitur` (`src/globals/Fitur.ts`), dibaca `muatFitur()` di `src/modules/fitur` dengan cache bertag `fitur`.
  - Komponen publik membaca saklarnya: daftar isi, waktu baca, tombol bagikan, blok form kontak, newsletter.
- **Kode sematan:** global `kode-sematan`. `muatKodeSematan()` (tag `kode-sematan`) dibaca layout publik dan dirender sebagai JSON.
  - Pemuat `PemuatKodeSematan` (klien) memasang kode Wajib langsung, dan kode Butuh persetujuan setelah persetujuan `semua`.
  - `sinyalPersetujuan` menerima `analitik` untuk `analytics_storage`.
  - Banner persetujuan tampil bila `iklanSiap` atau ada kode Butuh persetujuan aktif dan Kebijakan Privasi terbit (`persetujuanDibutuhkan`).
- **Form kontak:** koleksi `pesan-masuk`, endpoint `POST /api/pesan-masuk/kirim` (`src/modules/pembaca`).
  - Aturan murni untuk validasi isian, sidik pengirim (HMAC), dan batas kiriman.
  - Blok halaman `formKontak` dirender komponen `FormKontak`, yang berfungsi tanpa JavaScript.
  - Retensi 12 bulan dan sidik 24 jam dijalankan cron (`jalankanPantau` memanggil `bersihkanPembaca`).
- **Newsletter:** koleksi `pelanggan-newsletter`, dengan endpoint `daftar`, `berhenti`, dan `csv`.
  - Global `newsletter` mendapat `cara` dan `diArtikel`.
  - Form `FormNewsletter` di beranda dan akhir artikel.
  - Halaman `/newsletter/berhenti`.
- **Tombol bagikan:** komponen `TombolBagikan` (tautan biasa) dan `SalinTautan` (klien kecil) di halaman artikel.

## Global Constraints

- Tanpa dependensi baru. Node 26, npm 11, Next 16.3.8, Payload 3.92.1 tetap.
- Nama domain bahasa Indonesia. Copy UI bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru.
- Migrasi aditif: kolom `newsletter.aktif` tidak dihapus (disembunyikan); nilainya disalin ke `fitur.newsletter` di migrasi.
- Tes tidak memanggil jaringan. Halaman publik tetap ISR; form tanpa JS bekerja dengan redirect 303 dan `:target`.
- Kode sematan dan daftar pelanggan hanya untuk admin. Pesan masuk dibaca admin dan editor.

## Task 1: Tema admin dan grafik merek

**Files:**
- Modify: `src/app/(payload)/custom.scss`, `src/app/(payload)/layout.tsx`, `src/payload.config.ts`, `src/lib/bahasa-admin.ts`
- Create: `src/modules/redaksi/admin/Grafik.tsx`, `src/modules/redaksi/admin/KakiMenu.tsx`, `src/modules/redaksi/admin/ikon-menu.scss`
- Collections and globals: `admin.group` disusun ulang ke Konten, Pembaca, Tools, SEO, Tampilan, Pengaturan.

Steps:
- [ ] Token admin (`--redaksi-*`) dengan nilai terang dan gelap (`html[data-theme='dark']`). Menu gelap, bidang krem, kartu putih, tombol utama biru aksi.
- [ ] Logo terbalik di menu dan logo tinta di halaman masuk; tanda point. sebagai ikon.
- [ ] Ikon per menu lewat `mask-image` pada `#nav-{slug}` dan `#nav-global-{slug}`.
- [ ] Kartu Sinkron Google dan pengguna (`afterNavLinks`), hanya admin untuk kartu sinkron.
- [ ] Axe di `admin.spec.ts` tetap lolos di tema terang dan gelap.

## Task 2: Data beranda admin (modul `redaksi`)

**Files:**
- Create: `src/modules/redaksi/{aturan,data,tipe,index}.ts`
- Tests: `tests/unit/redaksi-aturan.test.ts`, `tests/int/redaksi.int.spec.ts`

Steps:
- [ ] Fungsi murni:
  - `awalPekanJakarta`
  - `bandingkan(sekarang, sebelumnya)` dengan persen dan arah, atau `null` bila data sebelumnya kosong
  - `kelompokkanPekan`
  - `susunKalender`
  - `persen`
  - `urutkanPerhatian`
  - `sapaan(jam)`
  - Diuji dengan waktu sebagai argumen.
- [ ] `ambilRuangRedaksi` membaca:
  - artikel (terbit, draf, terjadwal dari `payload-jobs` `schedulePublish`)
  - `analitik-situs`, `analitik-halaman`, `status-indeks`, `temuan-tautan`
  - `log-404` (baru 7 hari), `log-indexing` (gagal 7 hari dan 24 jam), `tugas-seo`
  - `pemakaian-ai` dan global `asisten-ai`
  - `pesan-masuk` (baru)
  - Bagian khusus admin dikosongkan untuk editor.
- [ ] Tes integrasi dengan data contoh, untuk admin dan editor.

## Task 3: View beranda admin

**Files:**
- Create: `src/modules/redaksi/admin/{BerandaAdmin,KartuAngka,KalenderKonten,GrafikPekan,DonatIndeks,TabelTerbit,KesehatanSitus,PerluPerhatian,Ikon}.tsx`, `src/modules/redaksi/admin/redaksi.scss`
- Modify: `src/payload.config.ts` (`views.dashboard`; hapus `beforeDashboard` KartuDashboard yang digantikan beranda baru)

Steps:
- [ ] Tata letak kisi: 4 kartu angka; kalender dan kolom kanan (klik per pekan, status indeks); lalu terbit terbaru, kesehatan, perlu perhatian. Satu kolom di layar sempit.
- [ ] Grafik SVG mengikuti skill dataviz:
  - batang 4 px membulat, satu seri biru merek, label selektif, `<title>` per batang;
  - donat dengan celah 2 px dan legenda berikon;
  - tabel tersembunyi untuk pembaca layar.
- [ ] Tes E2E `redaksi.spec.ts`: beranda admin untuk admin dan editor, angka dari `siapkan.ts`, tautan Perlu perhatian, dan axe di tema terang dan gelap.

## Task 4: Dashboard SEO dengan periode

**Files:**
- Modify: `src/modules/pantau/{aturan,dashboard}.ts`, `src/modules/pantau/admin/{DashboardSeo,BagianDashboard,GrafikKlik}.tsx`, `dashboard.scss`
- Tests: `tests/unit/pantau-aturan.test.ts`, `tests/e2e/dashboard-seo.spec.ts`

Steps:
- [ ] `bandingkanPeriode(hari, sampai, panjang)` untuk 7, 28, atau 90 hari, dengan nilai sebelumnya atau `belumCukup`.
- [ ] Pilihan periode sebagai tautan `?periode=`; chip status berikon; kartu dan warna sama dengan beranda admin.

## Task 5: Global Fitur dan saklar di halaman publik

**Files:**
- Create: `src/globals/Fitur.ts`, `src/modules/fitur/{index,data}.ts`, `src/modules/fitur/admin/RingkasanFitur.tsx`
- Modify:
  - `src/lib/tag.ts` (`fitur`)
  - `src/hooks/revalidasiPublik.ts`
  - halaman artikel (daftar isi, waktu baca)
  - `src/globals/Newsletter.ts` (`aktif` disembunyikan)
- Tests: integrasi revalidasi dan E2E saklar.

## Task 6: Kode sematan

**Files:**
- Create: `src/globals/KodeSematan.ts`, `src/modules/sematan/{aturan,data,index}.ts`, `src/components/PemuatKodeSematan.tsx`
- Modify: `src/modules/iklan/persetujuan.ts` (`sinyalPersetujuan(keadaan, { analitik })`, cookie tambahan saat menarik), layout publik, `PanelPersetujuan`
- Tests: unit untuk aturan pilih kode, posisi, dan persetujuan; E2E untuk kode Wajib terpasang, kode Butuh persetujuan baru terpasang setelah Izinkan semua, dan tanpa kode tidak ada skrip tambahan (anggaran JS tetap).

## Task 7: Form kontak dan Pesan masuk

**Files:**
- Create: `src/collections/PesanMasuk.ts`, `src/modules/pembaca/{aturan,kirim,endpoint,bersihkan,index}.ts`, `src/components/pembaca/FormKontak.tsx` (+ CSS), blok `formKontak` di `src/blocks/halaman.ts`
- Tests:
  - unit: validasi, sidik, batas
  - integrasi: endpoint (JSON dan form), jebakan, batas 5 per jam, `Sec-Fetch-Site`, retensi
  - E2E: kirim dengan JS dan tanpa JS, pesan muncul di admin, axe

## Task 8: Newsletter tersimpan

**Files:**
- Create: `src/collections/PelangganNewsletter.ts`, endpoint `daftar`, `berhenti`, `csv`, `src/components/pembaca/FormNewsletter.tsx`, `src/app/(frontend)/newsletter/berhenti/page.tsx`, `src/modules/pembaca/admin/TombolCsv.tsx`
- Modify: `src/globals/Newsletter.ts` (`cara`, `diArtikel`), `KotakNewsletter`, halaman artikel, slug cadangan `newsletter`
- Tests:
  - integrasi: daftar ganda tidak membocorkan, CSV hanya admin, berhenti menghapus
  - E2E: daftar dari beranda tanpa JS dan dengan JS, berhenti, axe

## Task 9: Tombol bagikan

**Files:**
- Create: `src/components/artikel/TombolBagikan.tsx`, `SalinTautan.tsx` (+ CSS)
- Tests: unit untuk URL bagikan; E2E untuk tautan dan salin; anggaran JS artikel tetap.

## Task 10: Migrasi, dokumen, rilis v1.2.0

Steps:
- [ ] `npm run generate:types`, `npm run generate:importmap`, `npm run payload -- migrate:create ruang_redaksi`, dengan SQL salin `newsletter.aktif` ke `fitur.newsletter`. Uji di `pointlat_migrasi`.
- [ ] `CLAUDE.md`, CHANGELOG v1.2.0, `npm version 1.2.0 --no-git-tag-version`.
- [ ] Draf Kebijakan Privasi diperbarui.
- [ ] Jalankan `npm test`, `npm run test:e2e`, `npm run typecheck`, dan `npm run lint`.
- [ ] Commit, tag `v1.2.0`, lalu buat `point-lat-v1.2.0.zip` dan blok perintah tanpa `#`.
