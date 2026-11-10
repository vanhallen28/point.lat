# Rencana 12: Statistik kunjungan (v1.5.0)

**Tujuan:** pemilik melihat kunjungan sungguhan di beranda admin: hari ini, 7 hari, 30 hari, total, rentang kalender yang bisa diunduh, negara, sumber, dan halaman yang dibaca.

Permintaan pemilik 10 November 2026: "di beranda admin tolong tambahkan statistik kunjungan ke website secara real dan detail dari ini 7 hari 30 hari dan total kunjungan tambahkan kalender nya juga agar bisa tarik data, dari negara mana sumber kunjungan dari mana dan mengunjungi halaman mana, jika ada tambahan dari anda untuk lebih melengkapi nya tolong tambahkan".

**Spesifikasi:** §26 di `docs/superpowers/specs/2026-11-03-point-lat-design.md`.

**Skill:** dataviz untuk grafik dan palet (divalidasi `validate_palette.js` di tema terang dan gelap).

## Keputusan

- **First-party, bukan layanan analitik.** Tanpa dependensi dan tanpa pihak ketiga: data di Supabase milik pemilik, sesuai "hanya Next.js, Vercel, dan Supabase". Vercel Web Analytics Hobby hanya 50.000 peristiwa dan sebulan data, dan tidak bisa ditampilkan di admin.
- **Tanpa cookie, tanpa IP tersimpan.** Sidik HMAC harian, jadi tidak butuh banner persetujuan.
- **Skrip sebaris**, bukan komponen klien: anggaran JavaScript §12 tools sudah di batas.
- **Dua tabel:** baris mentah 13 bulan untuk rincian, total per hari selamanya untuk Total dan grafik panjang.
- **Saklar di Fitur** karena setiap tayangan memanggil fungsi Vercel (kuota Hobby).

## Tugas

1. **Aturan murni** (`src/modules/kunjungan/aturan.ts`):
   - bot, perangkat, peramban;
   - sumber dan kanal (`utm_source`, aplikasi Android, domain dikenal, AI sebelum Google);
   - path dan isian beacon, sidik harian, negara dan kota;
   - rentang (`bacaRentang`, `rentangSebelumnya`, `paramRentang`), CSV, dan skrip pelacak.
2. **Koleksi dan migrasi:**
   - `kunjungan` (tersembunyi, endpoint `catat` dan `csv`, indeks `sidik` + `tanggal`) dan `kunjungan-harian`;
   - saklar `fitur.statistikKunjungan`;
   - migrasi `kunjungan` dengan pencabutan hak Data API Supabase.
3. **Pencatatan:** `catatKunjungan` (satu pernyataan SQL, batas per menit dan per hari) dan endpoint `POST /api/kunjungan/catat`. Skrip di layout publik dan penanda 404.
4. **Data admin:** `ambilKunjungan` (ringkas dengan pembanding, total, seri per jam, hari, atau bulan, online, sembilan rincian, judul halaman) dan `barisCsvKunjungan`. `bersihkanKunjungan` di cron harian.
5. **Tampilan admin:** `StatistikKunjungan` dan `GrafikKunjungan` dengan `kunjungan.scss` (container query `redaksi`), dipasang di `BerandaAdmin` hanya untuk admin. Tautan periode Google mempertahankan rentang.
6. **Tes:**
   - unit: aturan, rentang, CSV, skrip, label grafik;
   - integrasi: pencatatan, batas, pembersihan, endpoint, angka dan rincian, grafik per jam, CSV;
   - E2E: beacon saat dimuat, pindah halaman, dan kembali; diam di 404, peramban otomatis, dan GPC; bagian admin dengan kalender, CSV, axe, dan 375 px; editor tidak melihatnya.
7. **Dokumen.** Spesifikasi §26, CHANGELOG, CLAUDE.md, runbook rilis bagian N (cek, paragraf Kebijakan Privasi, kuota Vercel), dan log keputusan.

## Pemeriksaan

- **Tes otomatis:** type check, lint, unit, integrasi, cek migrasi, dan E2E penuh.
- **Migrasi diuji di dua database:** database kosong seperti CI, dan database bentukan v1.4.0 seperti produksi (baris Fitur yang sudah ada mendapat saklar menyala).
- **Tangkapan layar** beranda admin dengan data contoh di 1440 px dan 390 px, terang dan gelap, tanpa geser horizontal.
