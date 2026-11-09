# Rencana 11: Tampilan media (v1.4.0)

**Tujuan:** situs terlihat seperti media.

Pemilik bertanya "apa lagi yang kurang agar terlihat benar benar seperti media ?", lalu meminta "kerjakan yang belum dikerjakan dan belum berfungsi" (10 November 2026).

**Spesifikasi:** §25 di `docs/superpowers/specs/2026-11-03-point-lat-design.md`.

**Skill:** frontend-design untuk arah visual. Arah 3 "Kartu Intinya" tetap dipakai, dengan kepadatan dan sinyal media ditambah.

## Tugas

1. **Kartu bergambar.**
   - `KartuArtikel` mendapat gambar 16:9 (atau panel warna pilar), baris pilar dan tipe, Intinya, tanggal terbit, dan penulis.
   - Ukuran `besar`, `sedang`, dan `baris`.
   - Data `kartuArtikel` membaca gambar utama, tanggal, dan penulis (`SELECT_KARTU`, `POPULATE_KARTU`).
2. **Beranda portal.**
   - Kop ringkas, berita utama, dan daftar ringkas bernomor untuk Paling dicari.
   - Blok baru `stripTools` dan `barisRubrik` (`susunBarisRubrik`, `ambilRubrikBeranda`).
   - Migrasi `beranda_portal`.
3. **Pemasangan otomatis.**
   - `rencanaBeranda` dan `adaPerubahanTertunda` (fungsi murni), `pasangBerandaPortal` untuk impor paket dan migrasi.
   - Beranda berstatus draf dari data awal ikut dipasang bila tidak ada perubahan tertunda. Di v1.3.0, beranda seperti ini membuat mozaik dilewati.
4. **Header dan footer.**
   - Header: tanggal hari ini (skrip sebaris `skripTanggal`), Topik hangat (`susunTopik`), dan pilar tanpa tulisan terbit disembunyikan.
   - Footer berkolom.
5. **Artikel dan Redaksi.** "Terbit {tanggal}" di byline. Draf halaman Redaksi lewat data awal dan migrasi.
6. **Perbaikan yang belum berfungsi.**
   - Tabel THR dengan kolom tanpa judul gagal terbit: konverter menolaknya, dan migrasi memperbaiki draf yang sudah masuk.
   - Tes integrasi menerbitkan setiap artikel paket.
   - Pesan "sudah kamu sunting" yang salah pada impor ulang tools diperbaiki.
7. **Dokumen.** Spesifikasi §25, CHANGELOG, CLAUDE.md, runbook rilis bagian M, dan log keputusan.

## Pemeriksaan

- **Tes otomatis:** type check, lint, unit, integrasi, cek migrasi, dan E2E penuh.
- **Migrasi diuji di dua database:**
  - database kosong seperti CI: tata letak dilewati;
  - database bentukan v1.3.1 seperti produksi: data awal, impor paket, dan beranda draf. Hasilnya tata letak ditambah, draf Redaksi dibuat, tabel THR diperbaiki, dan THR bisa terbit.
- **Tangkapan layar** beranda, artikel, dan rubrik di 1440 px dan 390 px, tanpa geser horizontal.
- **Beranda produksi yang tidak diperbarui setelah artikel terbit:** di server lokal (`next start`) beranda langsung berubah, jadi penyebabnya di Vercel. Pemilik diminta menjalankan tes Publikasikan perubahan beranda dan memeriksa log Vercel. Deploy v1.4.0 membangun ulang beranda dan /tools.
