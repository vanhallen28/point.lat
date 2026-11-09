# Catatan perubahan point.lat

Setiap pembaruan yang dikirim ke pemilik punya nomor versi `vX.Y.Z`, dipakai di nama zip (`point-lat-vX.Y.Z.zip`), tag git, dan `package.json`.

- **Z** (angka terakhir) naik untuk perbaikan kecil, misalnya `v1.0.0` ke `v1.0.1`.
- **Y** (angka tengah) naik untuk fitur atau perubahan baru, misalnya `v1.0.1` ke `v1.1.0`.
- **X** (angka pertama) naik untuk perubahan besar yang mengubah cara kerja atau cara memasang, misalnya `v1.4.2` ke `v2.0.0`.

Versi yang terpasang di komputer: jalankan `git describe --tags` di folder proyek. Versi yang jalan di Vercel: lihat commit deploy di Deployments, sama dengan commit tag versinya.

## v1.1.0 (9 November 2026)

Tanpa Docker, logo baru, dan dokumen disesuaikan dengan keputusan pemilik: Vercel gratis, npm, kiriman zip.

- **Tanpa Docker:** `docker-compose.yml`, `Dockerfile`, dan folder `docker/` dihapus. Proyek hanya memakai Next.js, Vercel, dan Supabase. Pratinjau di komputer (`npm run dev`) memakai proyek Supabase kedua (`point-lat-pratinjau`), bukan Postgres di Docker; langkah sekali jalannya ada di runbook rilis C6. Tes di GitHub memakai Postgres bawaan server GitHub (`scripts/ci-postgres.sh`).
- **Logo baru:** logo POINT. dari file kamu dipasang di header (tinggi 32 px), footer, dan favicon, digambar ulang sebagai SVG supaya tajam dan tanpa unduhan tambahan. Warna biru merek `#2F6BFF` hanya untuk logo.
- **Dokumen:** spesifikasi, 12 rencana, runbook rilis dan pemulihan, README, dan CLAUDE.md memakai Vercel paket gratis (Hobby), perintah npm, alur zip + perintah terminal, dan tanpa Docker. Spesifikasi menambah aturan pemakaian logo, peta semua skill per tahap, alur pembaruan, dan saran trafik.
- **Jadwal 10 menit tanpa Vercel Pro (opsional):** runbook rilis H5 memasang Supabase Cron yang memanggil `/api/jobs/run` setiap 10 menit, jadi artikel terjadwal terbit tepat waktu walau Vercel Hobby hanya menjalankan cron sekali sehari.
- **`.env.example`:** `DATABASE_URL` dan `DATABASE_CA` kini contoh Supabase (Transaction pooler), bukan Postgres lokal.

## v1.0.0 (7 November 2026)

Versi pertama yang dirilis ke Vercel.

- **Isi situs dan admin:** CMS Payload berbahasa Indonesia; artikel, pilar, subkategori, glosarium, video, penulis, dan halaman statis; beranda yang diatur dari CMS; enam kalkulator; SEO (metadata, JSON-LD, sitemap, news sitemap, robots, feed); Mesin Indexing (Search Console, IndexNow, cek status indeks); Dashboard SEO; Asisten AI (Claude) dengan batas anggaran; iklan AdSense dengan persetujuan cookie; paginasi rubrik dan penulis; gambar dan video lewat Cloudinary.
- **Rilis dan keamanan:** migrasi database, penjaga lingkungan deploy, syarat password admin, header keamanan, backup mingguan terenkripsi, CI GitHub Actions (tes unit, integrasi, E2E, axe, Lighthouse), runbook rilis dan pemulihan.
- **Lingkungan:** Node 26 dan npm 11 (pindah dari pnpm, versi paket sama persis), Next.js 16.3.8, Payload 3.92.1, Supabase region Singapura, Vercel Hobby dengan cron sekali sehari sekitar 06.00 WIB.
