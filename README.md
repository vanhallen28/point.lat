# point.lat

Media edukasi praktis berbahasa Indonesia, dengan tagline "Intinya dulu.". Proyek ini satu aplikasi Next.js 16 (App Router) dan Payload CMS 3: situs publik dan CMS jalan bersama, di-hosting di Vercel paket gratis (Hobby), dan database-nya Supabase Postgres. Tidak ada Docker. Semua perintah memakai npm.

- Spesifikasi: `docs/superpowers/specs/2026-11-03-point-lat-design.md`
- Rencana implementasi: `docs/superpowers/plans/`
- Runbook rilis dan uji langsung: `docs/operasional/rilis.md`
- Runbook cadangan dan pemulihan database: `docs/operasional/pemulihan-database.md`
- Riwayat versi: `CHANGELOG.md`
- Aturan kerja untuk agen dan pengembang: `CLAUDE.md`

## Menjalankan di komputer sendiri

Yang dibutuhkan: Node 26 (`nvm install` di folder ini memakai `.nvmrc`; npm ikut terpasang) dan proyek Supabase khusus pratinjau. Jangan pakai proyek produksi untuk pengembangan.

```bash
cp .env.example .env    # isi DATABASE_URL dan DATABASE_CA dari proyek Supabase pratinjau, PAYLOAD_SECRET, SEED_ADMIN_*
npm ci                  # pasang dependensi sesuai package-lock.json
npm run migrate         # buat atau perbarui tabel di Supabase lewat migrasi Payload
npm run seed            # data awal, sekali saja (dokumen yang sudah ada tidak ditimpa)
npm run dev             # situs di http://localhost:3000, CMS di http://localhost:3000/admin
```

Konten asli diedit di CMS produksi (`https://point.lat/admin`), bukan di komputer.

## Pembaruan

Setiap pembaruan dikirim sebagai `point-lat-vX.Y.Z.zip` beserta perintah terminal untuk memasangnya. Isinya repo lengkap tanpa `.env`. Setelah dipasang dan di-push ke GitHub (`git push origin master`), Vercel membangun dan merilis otomatis: build Vercel menjalankan migrasi database sebelum `next build`.

## Tes

Tes otomatis jalan di GitHub Actions setiap push (`.github/workflows/ci.yml`) dengan PostgreSQL bawaan runner, tanpa Docker dan tanpa rahasia. Perintahnya ada di `CLAUDE.md`, bagian Perintah.
