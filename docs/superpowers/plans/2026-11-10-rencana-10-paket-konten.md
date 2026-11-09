# Rencana 10: Paket konten awal (v1.3.0)

**Tujuan:** situs tidak sepi. Pemilik meminta "agar website terisi penuh tidak sepi seperti sekarang" (10 November 2026) dan memilih:
- cakupan: 6 tools dan 12 artikel;
- cara masuk: tombol Impor di admin;
- gambar: kartu sampul bergaya point.;
- pilar: Uang & Karier dan Belajar.

**Spesifikasi:** §24 di `docs/superpowers/specs/2026-11-03-point-lat-design.md`.

## Tugas

1. **Pengubah markdown ke Lexical** (`src/modules/paket/markdown.ts`, fungsi murni).
   - Mencakup heading, daftar, tabel, callout, sematan tools, Baca juga, format teks, dan tautan internal.
   - Tes unit: setiap bentuk menghasilkan node yang sama dengan editor Payload, dan tautan di callout atau tabel ditolak.
2. **Data paket** (`src/modules/paket/artikel/`, `paket-awal.ts`, `tipe.ts`).
   - 12 artikel dengan sumber resmi bertanggal akses 10 November 2026.
   - Tes unit per artikel:
     - panel SEO hijau;
     - aturan copy;
     - panjang paling sedikit 600 kata (panduan) atau 550 (explainer);
     - Intinya, FAQ, sumber, dan sampul lengkap;
     - tujuan tautan internal ada di paket atau di tools.
3. **Kartu sampul.**
   - `scripts/buat-sampul-paket.ts` merender 12 PNG 1920 x 1080 dengan Playwright, lalu hasilnya di-commit.
   - Diperiksa di potongan 16:9, 4:3, dan 1:1.
   - Ditambah `outputFileTracingIncludes` untuk `/api/[...slug]`.
4. **Penjelasan kalkulator.** `src/seed/tools.ts` diperluas menjadi sekitar 600 kata per tools, dan sumber baru ditambahkan.
5. **Impor** (`impor.ts`, `kunci.ts`, `status.ts`, `endpoint.ts`).
   - Dua tahap: dokumen dulu, lalu isi dan artikel terkait.
   - Idempoten lewat slug.
   - Aturan tools dan mozaik sebagai fungsi murni, diuji unit.
   - Kunci `payload_kv` 15 menit.
   - Tes integrasi:
     - impor lengkap dan impor ulang;
     - terbit tanpa review ditolak;
     - galat pilar;
     - kunci dan endpoint.
6. **Kartu admin** (`admin/KartuPaket.tsx`, `TombolImpor.tsx`, `paket.scss`).
   - Hanya admin, hilang setelah semua terbit.
   - Tes E2E dengan jawaban server ditiru, plus axe, dan editor tidak melihat kartu.
7. **Dokumen.**
   - Spesifikasi §24, CHANGELOG, CLAUDE.md, dan runbook rilis bagian L.
   - Versi 1.3.0 dan log keputusan.

## Pemeriksaan sebelum kirim

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`.
- Impor manual di server dev: 12 draf masuk, dua diterbitkan, dan halaman publiknya merender tabel, callout, kartu tools, dan tautan dengan benar.
- Fakta yang tidak bisa dipastikan sumbernya dihapus dari artikel. Contohnya larangan mengganti makan lembur dengan uang, yang hanya ada di Kepmenakertrans 102/2004 dan belum jelas statusnya setelah PP 35/2021.
