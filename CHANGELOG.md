# Catatan perubahan point.lat

Setiap pembaruan yang dikirim ke pemilik punya nomor versi `vX.Y.Z`, dipakai di nama zip (`point-lat-vX.Y.Z.zip`), tag git, dan `package.json`.

- **Z** (angka terakhir) naik untuk perbaikan kecil, misalnya `v1.0.0` ke `v1.0.1`.
- **Y** (angka tengah) naik untuk fitur atau perubahan baru, misalnya `v1.0.1` ke `v1.1.0`.
- **X** (angka pertama) naik untuk perubahan besar yang mengubah cara kerja atau cara memasang, misalnya `v1.4.2` ke `v2.0.0`.

Versi yang terpasang di komputer: jalankan `git describe --tags` di folder proyek. Versi yang jalan di Vercel: lihat commit deploy di Deployments, sama dengan commit tag versinya.

## v1.0.0 (7 November 2026)

Versi pertama yang dirilis ke Vercel.

- **Isi situs dan admin:** CMS Payload berbahasa Indonesia; artikel, pilar, subkategori, glosarium, video, penulis, dan halaman statis; beranda yang diatur dari CMS; enam kalkulator; SEO (metadata, JSON-LD, sitemap, news sitemap, robots, feed); Mesin Indexing (Search Console, IndexNow, cek status indeks); Dashboard SEO; Asisten AI (Claude) dengan batas anggaran; iklan AdSense dengan persetujuan cookie; paginasi rubrik dan penulis; gambar dan video lewat Cloudinary.
- **Rilis dan keamanan:** migrasi database, penjaga lingkungan deploy, syarat password admin, header keamanan, backup mingguan terenkripsi, CI GitHub Actions (tes unit, integrasi, E2E, axe, Lighthouse), runbook rilis dan pemulihan.
- **Lingkungan:** Node 26 dan npm 11 (pindah dari pnpm, versi paket sama persis), Next.js 16.3.8, Payload 3.92.1, Supabase region Singapura, Vercel Hobby dengan cron sekali sehari sekitar 06.00 WIB.
