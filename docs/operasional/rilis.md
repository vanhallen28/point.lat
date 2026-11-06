# Runbook: Rilis point.lat dan uji langsung

**Pemilik:** pemilik point.lat | **Frekuensi:** sekali saat rilis (bagian A sampai I); bagian J saat AdSense menyetujui situs; cek di bagian I diulang setelah perubahan besar di layanan luar.
**Diperbarui:** 7 November 2026 (Rencana 8C) | **Dijalankan terakhir:** belum (lihat Riwayat).

## Tujuan

Membawa point.lat dari repo `vanhallen28/point.lat` sampai live di `https://point.lat`, lalu menguji langsung semua layanan luar yang di tes otomatis hanya memakai tiruan (Supabase, Vercel, Cloudinary, Google, IndexNow, Claude, AdSense). Setiap langkah punya hasil yang diharapkan; lanjut ke langkah berikutnya hanya bila hasilnya sesuai.

| Bagian | Isi |
|---|---|
| A | Prasyarat |
| B | Repo dan CI |
| C | Supabase produksi dan pratinjau (termasuk migrasi dan data awal) |
| D | Proyek Vercel, env, dan deploy produksi pertama |
| E | Domain `point.lat` |
| F | Admin, Cloudinary, dan halaman wajib |
| G | Google Search Console, akun layanan, dan IndexNow |
| H | Asisten AI, Firewall, backup, dan deploy pratinjau |
| I | Rilis dan cek pasca-rilis |
| J | AdSense |

**Aturan rahasia.** Password database, connection string, kunci API, `PAYLOAD_SECRET`, `CRON_SECRET`, dan isi kunci JSON Google hanya diketik di dashboard layanan, di pengelola password, atau di shell pemilik lewat `read -rs` (tidak tampil di layar dan tidak masuk riwayat shell). Jangan menempelnya di file repo, tiket, chat, atau email. Sertifikat CA Supabase dan publishable key Supabase bukan rahasia.

## A. Prasyarat

- [ ] Akses Owner di organisasi Supabase berpaket Pro, tim Vercel berpaket Pro, admin repo GitHub `vanhallen28/point.lat`, dan pengelola DNS domain `point.lat`.
- [ ] Akun Cloudinary, akun Google (Search Console dan Google Cloud), Claude Console, dan nanti AdSense.
- [ ] Komputer dengan `git`, Node 22.23.4 atau lebih baru (atau 24.22.1 ke atas), `pnpm`, `psql`, `openssl`, `curl`, dan `gpg`, serta salinan repo yang biasa dipakai untuk pengembangan lokal (berisi `.env` lokal; bila belum ada, `cp .env.example .env`).
- [ ] Pengelola password untuk menyimpan setiap rahasia yang dibuat di runbook ini.

## B. Repo dan CI

### B1. Master hijau

Di GitHub, repo `vanhallen28/point.lat`, tab Actions, workflow **CI**: run terakhir di `master` hijau untuk kedua job, "Type check, lint, unit, migrasi, integrasi, build" dan "E2E (build produksi, Playwright, axe) dan Lighthouse".

**Hasil yang diharapkan:** kedua job hijau di commit yang akan dirilis.
**Bila gagal:** buka log job. E2E yang gagal hanya karena isi 404 Next yang dikenal (cangkang `__next_error__` atau beacon 404 yang tidak terkirim) dijalankan ulang sekali lewat **Re-run failed jobs**; kegagalan lain diperbaiki dulu.

### B2. Salinan lokal sama dengan master

```bash
git switch master
git pull
pnpm install
```

**Hasil yang diharapkan:** `git log -1 --oneline` sama dengan commit yang hijau di B1, dan `ls src/migrations` menampilkan `20261106_152942_awal.ts` dan `20261106_163351_kunci_data_api.ts`.

### B3. Aturan branch `master` (opsional)

Aturan branch untuk repo privat butuh GitHub Pro, Team, atau Enterprise. Bila tersedia: Settings, Branches (atau Rules, Rulesets), aturan baru untuk `master`, nyalakan **Require status checks to pass** dengan kedua job di B1.

**Hasil yang diharapkan:** pull request ke `master` menampilkan kedua pemeriksaan sebagai wajib. Bila paket tidak mendukung, lewati langkah ini; CI tetap berjalan di setiap push dan pull request.

## C. Supabase produksi dan pratinjau

Fungsi Vercel berjalan di `sin1` (Singapura, `vercel.json`), dekat database. Aplikasi terhubung lewat **Transaction pooler** (Supavisor, port 6543, IPv4); koneksi langsung Supabase hanya IPv6 dan tidak dipakai.

### C1. Proyek produksi

Di organisasi Supabase berpaket Pro: **New project**, nama `point-lat`, region **Southeast Asia (Singapore)** (`ap-southeast-1`). Buat password database dengan tombol generate, simpan di pengelola password sebagai "Supabase produksi, password postgres".

**Hasil yang diharapkan:** proyek aktif; Settings, Infrastructure menampilkan region Singapura dan versi Postgres. Bila versi utamanya bukan 17, ubah `PG_MAJOR` di `.github/workflows/backup.yml` (runbook pemulihan A5).

### C2. Wajibkan SSL dan unduh sertifikat CA

Database Settings, bagian SSL Configuration: nyalakan **Enforce SSL on incoming connections** (database restart singkat), lalu **Download certificate**. Simpan file itu sebagai `~/point-lat-ca-produksi.crt`.

**Hasil yang diharapkan:** setelan menyatakan SSL diwajibkan; `head -1 ~/point-lat-ca-produksi.crt` mencetak `-----BEGIN CERTIFICATE-----`.

### C3. Matikan Data API

Aplikasi tidak memakai Data API Supabase (REST dan GraphQL otomatis). Integrations, Data API, Overview: matikan **Enable Data API**. Migrasi `20261106_163351_kunci_data_api` juga mencabut hak `anon` dan `authenticated` atas tabel Payload, jadi dua lapis ini saling menjaga.

**Hasil yang diharapkan:** halaman Data API menyatakan Data API mati. Pemeriksaan dari luar ada di I7.

### C4. Connection string transaction pooler

Tombol **Connect** di dashboard proyek, pilih **Transaction pooler**, salin URI (port 6543), ganti `[YOUR-PASSWORD]` dengan password C1, lalu simpan di pengelola password sebagai "DATABASE_URL produksi". Periksa dari komputer:

```bash
read -rs DATABASE_URL && export DATABASE_URL
psql "$DATABASE_URL" -c "select version()"
```

(tempel URI setelah perintah pertama, lalu Enter; tidak ada yang tampil.)

**Hasil yang diharapkan:** satu baris `PostgreSQL 17...`.
**Bila gagal:** `password authentication failed` berarti password di URI salah.

### C5. Migrasi dan data awal produksi dari komputer pemilik

Migrasi pertama dan seed dijalankan dari komputer sebelum deploy pertama, supaya build pertama langsung merender halaman dari data awal (halaman yang dibangun dari database kosong baru berganti setelah revalidasi). Setelah ini, migrasi hanya berjalan lewat build Vercel. Di shell yang sama dengan C4 (`DATABASE_URL` masih ter-export), dari root repo:

```bash
export DATABASE_CA="$(cat ~/point-lat-ca-produksi.crt)"
pnpm migrate
read -r SEED_ADMIN_EMAIL && export SEED_ADMIN_EMAIL
read -rs SEED_ADMIN_PASSWORD && export SEED_ADMIN_PASSWORD
pnpm seed
unset DATABASE_URL DATABASE_CA SEED_ADMIN_EMAIL SEED_ADMIN_PASSWORD
```

Email admin diketik setelah perintah `read -r`, password setelah `read -rs`. Password admin: frasa baru minimal 15 karakter dari pengelola password (misalnya empat kata acak), tanpa kata `point`, `password`, `admin`, atau bagian depan email. Env di shell mengalahkan `.env` lokal, jadi `.env` tidak perlu diubah.

**Hasil yang diharapkan:** keluaran memuat baris berikut (waktu dan durasi berbeda):

```
INFO: Reading migration files from .../src/migrations
INFO: Migrating: 20261106_152942_awal
INFO: Migrated:  20261106_152942_awal (...ms)
INFO: Migrating: 20261106_163351_kunci_data_api
INFO: Migrated:  20261106_163351_kunci_data_api (...ms)
INFO: Done.
INFO: Seed selesai. Admin: dibuat. Pilar: 4. Halaman draf: 6. Tools baru: 6. Parameter baru: 22.
```

**Bila gagal:** `Seed dihentikan. password: ...` berarti password ditolak aturan password produksi; buat frasa lain dan ulangi dua perintah `read` dan `pnpm seed`. Bila `pnpm migrate` bertanya soal data loss atau migrasi `dev`, hentikan (Ctrl+C) dan pastikan `DATABASE_URL` menunjuk proyek Supabase yang baru dibuat, bukan database lokal.

### C6. Proyek pratinjau di organisasi Free terpisah

Deploy pratinjau Vercel memakai database sendiri, tidak pernah database produksi. Buat organisasi Supabase baru berpaket **Free** (paket organisasi Pro tidak bisa berisi proyek Free), lalu proyek `point-lat-pratinjau` di region **Southeast Asia (Singapore)**. Ulangi C2 (simpan sertifikat sebagai `~/point-lat-ca-pratinjau.crt`), C3, dan C4 (simpan sebagai "DATABASE_URL pratinjau"), lalu C5 dengan `~/point-lat-ca-pratinjau.crt` dan password admin pratinjau yang berbeda dari produksi.

**Hasil yang diharapkan:** keluaran sama dengan C5 di proyek pratinjau.
Proyek Free dijeda bila aktivitas database selama 7 hari terlalu sedikit (Supabase mengirim email peringatan sekitar seminggu sebelumnya); build pratinjau gagal sampai proyek dilanjutkan lewat **Resume project** di dashboard (bisa sampai 90 hari setelah dijeda, data dan setelan kembali utuh).

## D. Proyek Vercel, env, dan deploy produksi pertama

### D1. Impor repo

Di tim Vercel berpaket Pro: **Add New**, **Project**, **Import Git Repository**. Bila diminta, pasang Vercel GitHub App hanya untuk repo `vanhallen28/point.lat`. Framework terdeteksi Next.js; perintah build diambil dari `vercel.json` (`pnpm build:vercel`). Jangan isi env di layar impor. Pilih **Deploy**.

**Hasil yang diharapkan:** deploy pertama **gagal** di langkah `pnpm periksa:rilis` dengan `Env deploy belum benar:` dan daftar yang diawali `DATABASE_URL belum diisi.` Ini bukti penjaga lingkungan aktif dan `VERCEL_ENV` terbaca; database belum tersentuh.
**Bila gagal dengan galat lain:** `missing secret key. A secret key is needed to secure Payload.` berarti `VERCEL_ENV` tidak terbaca (penjaga mati); lanjutkan ke D2 dulu.

### D2. System Environment Variables

Settings, Environment Variables: pastikan **Automatically expose System Environment Variables** dicentang. `VERCEL_ENV` (`production` atau `preview`) menyalakan semua pemeriksaan di `src/modules/lingkungan`.

**Hasil yang diharapkan:** kotak tercentang.

### D3. Env per lingkungan

Settings, Environment Variables, **Add New**, satu per baris, dengan centang lingkungan sesuai kolom. Tandai **Sensitive** untuk `DATABASE_URL`, `PAYLOAD_SECRET`, `CLOUDINARY_API_SECRET`, `CRON_SECRET`, `GOOGLE_SERVICE_ACCOUNT_JSON`, dan `ANTHROPIC_API_KEY`. Nilai acak dibuat dengan `openssl rand -hex 32` (satu nilai baru untuk setiap baris yang memintanya; jangan dipakai ulang antarlingkungan).

| Nama | Production | Preview | Development |
|---|---|---|---|
| `DATABASE_URL` | "DATABASE_URL produksi" (C4) | "DATABASE_URL pratinjau" (C6) | tidak diisi |
| `DATABASE_CA` | seluruh isi `~/point-lat-ca-produksi.crt` | seluruh isi `~/point-lat-ca-pratinjau.crt` | tidak diisi |
| `PAYLOAD_SECRET` | hasil `openssl rand -hex 32` | hasil `openssl rand -hex 32` yang lain | tidak diisi |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | dari Cloudinary, Settings, API Keys | sama dengan Production | tidak diisi |
| `INDEXER_ADAPTER` | `palsu` dulu, diganti `asli` di G4 | `palsu` | tidak diisi |
| `AI_ADAPTER` | `palsu` dulu, diganti `asli` di H1 | `palsu` | tidak diisi |
| `CRON_SECRET` | hasil `openssl rand -hex 32` | tidak diisi | tidak diisi |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | ditambahkan di G4 | **tidak pernah** | tidak diisi |
| `ANTHROPIC_API_KEY` | ditambahkan di H1 | **tidak pernah** | tidak diisi |

Development tidak dipakai: pengembangan lokal memakai `.env` dan database lokal. `NEXT_PUBLIC_SITE_URL`, `SEED_ADMIN_EMAIL`, dan `SEED_ADMIN_PASSWORD` tidak diisi di Vercel (URL situs dibaca dari Pengaturan SEO; akun admin dibuat di C5). Iklan di pratinjau mati karena database pratinjau punya global Iklan sendiri dengan "Tampilkan iklan" mati.

**Hasil yang diharapkan:** daftar env menampilkan setiap nama dengan lingkungan sesuai tabel. Penjaga menolak deploy pratinjau yang memegang `GOOGLE_SERVICE_ACCOUNT_JSON`, `ANTHROPIC_API_KEY`, atau adapter `asli`.

### D4. Deploy produksi

Deployments, deploy yang gagal di D1, menu titik tiga, **Redeploy**.

**Hasil yang diharapkan:** log build memuat urutan ini, lalu build Next selesai dan deploy berstatus **Ready** sebagai Production:

```
INFO: Lingkungan produksi siap: env dan database cocok.
INFO: Reading migration files from .../src/migrations
INFO: Done.
INFO: Lingkungan produksi siap: env dan database cocok.
```

(`Done.` tanpa baris `Migrating`, karena kedua migrasi sudah dijalankan di C5.) Di Supabase produksi, SQL Editor:

```sql
select name, batch from payload_migrations order by name;
select data->>'lingkungan' as lingkungan from payload_kv where key = 'lingkungan-database';
select has_table_privilege('anon', 'public.artikel', 'select') as anon_bisa_baca;
```

hasilnya dua migrasi dengan batch 1, `produksi`, dan `false`.
**Bila gagal:** lihat Pemecahan masalah. `Lingkungan lokal siap` di log berarti `VERCEL_ENV` tidak terbaca (D2).

### D5. Cron, region, dan perlindungan pratinjau

- Settings, Cron Jobs: `/api/jobs/run` dengan jadwal `*/10 * * * *`. Cron hanya berjalan untuk deploy Production.
- Settings, Functions: region fungsi Singapura (`sin1`).
- Settings, Deployment Protection: **Vercel Authentication** aktif untuk deploy pratinjau, jadi URL pratinjau hanya bisa dibuka anggota tim.

**Hasil yang diharapkan:** ketiganya sesuai. Dalam 10 menit, Logs dengan filter path `/api/jobs/run` menampilkan permintaan berstatus 200.

## E. Domain point.lat

### E1. Tambah domain

Settings, Domains: tambahkan `point.lat`, lalu `www.point.lat` dengan pilihan redirect ke `point.lat`. Isi record DNS di pengelola domain persis seperti yang ditampilkan Vercel untuk masing-masing domain.

**Hasil yang diharapkan:** kedua domain berstatus **Valid Configuration** dan sertifikat terbit (bisa beberapa menit sampai beberapa jam setelah DNS menyebar).

### E2. Periksa HTTPS dan header keamanan

```bash
curl -sI https://point.lat/ | grep -iE '^(HTTP|strict-transport-security|x-content-type-options|referrer-policy|x-frame-options|permissions-policy|content-security-policy)'
curl -sI http://point.lat/ | grep -iE '^(HTTP|location)'
curl -sI https://www.point.lat/ | grep -iE '^(HTTP|location)'
```

**Hasil yang diharapkan:** perintah pertama `HTTP/2 200` dengan `strict-transport-security: max-age=63072000` (dipasang Vercel untuk domain kustom), `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`, `x-frame-options: SAMEORIGIN`, `permissions-policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`, dan `content-security-policy: base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'`. Perintah kedua dan ketiga mengalihkan (status 3xx) ke `https://point.lat/`.

## F. Admin, Cloudinary, dan halaman wajib

### F1. Masuk admin

Buka `https://point.lat/admin`, masuk dengan akun C5.

**Hasil yang diharapkan:** dashboard admin berbahasa Indonesia. Global Pengaturan SEO berisi URL situs `https://point.lat` (bawaan; tidak perlu diubah).

### F2. Aset sistem Cloudinary (sekali per akun)

Dari root repo di komputer:

```bash
read -r CLOUDINARY_CLOUD_NAME && export CLOUDINARY_CLOUD_NAME
read -rs CLOUDINARY_API_KEY && export CLOUDINARY_API_KEY
read -rs CLOUDINARY_API_SECRET && export CLOUDINARY_API_SECRET
pnpm media:siapkan
pnpm media:siapkan
unset CLOUDINARY_CLOUD_NAME CLOUDINARY_API_KEY CLOUDINARY_API_SECRET
```

**Hasil yang diharapkan:** `Cloudinary siap. Kanvas OG: dibuat.` lalu `Cloudinary siap. Kanvas OG: sudah-ada.`

### F3. Uji langsung Cloudinary

Ikuti Rencana 2 Task 8 langkah 2 sampai 6 (`docs/superpowers/plans/2026-11-04-rencana-2-media-cloudinary.md`) dengan `https://point.lat/admin` sebagai alamat admin: unggah gambar di atas 4,5 MB, periksa URL dan `f_auto`, unggah video kecil dan periksa poster serta HLS, periksa gambar OG, lalu hapus kedua dokumen uji.

**Hasil yang diharapkan:** sesuai hasil yang diharapkan di setiap langkah Task 8; catat hasilnya di log keputusan.

### F4. Halaman wajib dan footer

Seed membuat halaman statis sebagai draf (antara lain `/kontak`, `/pasang-iklan`, `/pedoman-media-siber`, dan `/kebijakan-privasi`). Tulis isinya lalu terbitkan. Kebijakan Privasi wajib terbit sebelum iklan dinyalakan; cakupan isinya ada di Setup dari pemilik Rencana 8A. Tambahkan juga kebijakan penggunaan AI ke Kebijakan Redaksi (Setup dari pemilik Rencana 7).

**Hasil yang diharapkan:** setiap tautan di footer menjawab 200 di `https://point.lat`.

## G. Google Search Console, akun layanan, dan IndexNow

Urutan rinci dan alasannya ada di Setup dari pemilik Rencana 6A dan 6B.

### G1. Properti Search Console

Tambahkan properti **domain** `point.lat` dan verifikasi lewat record TXT di pengelola domain.

**Hasil yang diharapkan:** properti `point.lat` terverifikasi. Pengaturan SEO tetap memakai properti `sc-domain:point.lat`.

### G2. Akun layanan

Di Google Cloud: buat proyek, aktifkan **Google Search Console API**, buat akun layanan, lalu buat dan unduh **kunci JSON** (Google hanya memberikannya sekali; simpan di pengelola password, hapus file unduhannya). Biarkan Web Search Indexing API mati.

**Hasil yang diharapkan:** kunci JSON tersimpan; field `client_email` berakhiran `iam.gserviceaccount.com`.

### G3. Akun layanan sebagai Owner

Search Console, properti `point.lat`, Setelan, Pengguna dan izin: tambahkan `client_email` akun layanan sebagai **Pemilik** (Owner).

**Hasil yang diharapkan:** akun layanan tercantum sebagai Pemilik.

### G4. Env Google dan adapter asli

Vercel, Environment Variables, Production saja: tambahkan `GOOGLE_SERVICE_ACCOUNT_JSON` berisi seluruh isi kunci JSON (Sensitive), dan ubah `INDEXER_ADAPTER` Production menjadi `asli`. Lalu Redeploy produksi.

**Hasil yang diharapkan:** log build `Lingkungan produksi siap`; Admin, Pengaturan SEO, Mesin Indexing, Status pemasangan menandai butir Google sebagai "Siap".

### G5. Kunci IndexNow

```bash
openssl rand -hex 16
```

Isi hasilnya di Admin, Pengaturan SEO, Mesin Indexing, **Kunci IndexNow**, lalu Simpan. Jangan mengganti kunci setelah dipakai.

**Hasil yang diharapkan:** `https://point.lat/<kunci>.txt` berisi kunci itu, dan keempat butir Status pemasangan berstatus "Siap". Biarkan saklar "Kabari Google lewat Indexing API" mati.

## H. Asisten AI, Firewall, backup, dan deploy pratinjau

### H1. Kunci Claude dengan batas belanja

Di Claude Console: buat workspace untuk point.lat, pasang batas belanja bulanan workspace sedikit di atas anggaran Asisten AI, lalu buat kunci API di workspace itu. Di Vercel, Production saja: tambahkan `ANTHROPIC_API_KEY` (Sensitive) dan ubah `AI_ADAPTER` menjadi `asli`, lalu Redeploy produksi.

**Hasil yang diharapkan:** Admin, Pengaturan, Asisten AI: Status pemasangan "Siap" untuk Mode (Asli), Kunci API Claude, dan ketiga tugas. Cocokkan tabel harga dengan halaman harga Claude saat itu dan atur anggaran bulanan (Setup dari pemilik Rencana 7).

### H2. Aturan Firewall

Vercel, proyek point.lat, **Firewall**, **Configure**, **+ New Rule**, dua aturan:

| Nama | Kondisi **If** (semua benar) | **Then** |
|---|---|---|
| Batas beacon log 404 | path sama dengan `/api/log-404/catat`, metode `POST` | Rate Limit, Fixed Window, 60 detik, 10 permintaan, kunci IP |
| Batas pencarian | path sama dengan `/cari`, metode `GET` | Rate Limit, Fixed Window, 60 detik, 30 permintaan, kunci IP |

Mulai dengan aksi **Log** selama beberapa hari, lalu ganti ke **Default (429)**. Setiap perubahan: **Save Rule**, **Review Changes**, **Publish** (berlaku tanpa deploy ulang). `/cari` satu-satunya halaman yang dirender per permintaan; 30 pencarian per menit per IP longgar untuk pembaca biasa.

**Hasil yang diharapkan:** kedua aturan tampil aktif; setelah beberapa hari, Firewall menampilkan lalu lintas yang cocok dengan setiap aturan.

### H3. Backup mingguan

Jalankan bagian A runbook `docs/operasional/pemulihan-database.md` (kunci GPG, role baca saja, secret GitHub Actions, run pertama), lalu bagian B (uji pulih) dalam minggu pertama.

**Hasil yang diharapkan:** run **Backup mingguan** hijau dengan artifact `cadangan-database-<nomor>`, dan uji pulih tercatat di Riwayat runbook itu.

### H4. Deploy pratinjau pertama

```bash
git switch -c uji-pratinjau
git commit --allow-empty -m "chore: uji deploy pratinjau"
git push -u origin uji-pratinjau
```

**Hasil yang diharapkan:** Vercel membuat deploy **Preview**; log build memuat `Lingkungan pratinjau siap: env dan database cocok.` dua kali. URL pratinjau meminta login Vercel; setelah login, `/admin` menerima akun admin pratinjau (C6), bukan akun produksi. Di Supabase pratinjau, `select data->>'lingkungan' from payload_kv where key = 'lingkungan-database';` menghasilkan `pratinjau`.

Lalu hapus branch uji:

```bash
git switch master
git push origin --delete uji-pratinjau
git branch -D uji-pratinjau
```

## I. Rilis dan cek pasca-rilis

### I1. Terbitkan tulisan pertama

Terbitkan satu artikel, lalu buka Admin, Log indexing.

**Hasil yang diharapkan:** baris "Revalidasi cache", "Kirim sitemap ke Search Console" (adapter `searchConsole`), dan "IndexNow" (adapter `indexNow`) berstatus Berhasil. Artikel tampil di beranda dan rubriknya.
**Bila gagal:** Google 403 berarti akun layanan belum Owner (G3); IndexNow 403 berarti file kunci tidak cocok (G5).

### I2. robots.txt dan sitemap

```bash
curl -s https://point.lat/robots.txt
curl -s https://point.lat/sitemap.xml | head -20
curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://point.lat/news-sitemap.xml
```

**Hasil yang diharapkan:** robots memuat `User-agent: *`, `Allow: /`, `Allow: /api/media/file/`, `Disallow: /admin`, `Disallow: /api/`, `Disallow: /cari`, lalu `Sitemap: https://point.lat/sitemap.xml` dan `Sitemap: https://point.lat/news-sitemap.xml`. Sitemap index berisi `https://point.lat/sitemap/...xml`; news sitemap menjawab `200` dengan tipe XML. Di Search Console, Sitemaps, status sitemap "Berhasil".

### I3. Rich Results Test

Uji URL artikel I1 di Rich Results Test Google.

**Hasil yang diharapkan:** item Artikel (Article atau NewsArticle untuk explainer) dan Breadcrumb valid tanpa galat.

### I4. Performa di produksi

PageSpeed Insights, mode seluler, untuk beranda, artikel I1, satu rubrik, dan `https://point.lat/tools/gaji-bersih`.

**Hasil yang diharapkan:** Performance minimal 90 dan CLS paling banyak 0,1 (anggaran spesifikasi §12, sama dengan Lighthouse CI). LCP sekitar 2,5 detik wajar untuk kunjungan pertama (teks banner persetujuan; spesifikasi §19). Data lapangan baru muncul setelah situs cukup ramai.

### I5. Cron dan durasi fungsi

Vercel, Logs, filter path `/api/jobs/run`, satu jam terakhir. Admin, Dashboard SEO.

**Hasil yang diharapkan:** enam permintaan per jam berstatus 200, masing-masing jauh di bawah batas 300 detik fungsi Vercel Pro. Dalam satu jalan cron, baris "Sinkron Search Console" dan "Pindai tautan" di Dashboard SEO berhasil (data Google untuk domain baru muncul beberapa hari kemudian). Bila durasi mendekati 300 detik, catat untuk Fase 2 (`maxDuration` di `vercel.json`).

### I6. Log 404

Buka `https://point.lat/halaman-uji-404-rilis` di browser.

**Hasil yang diharapkan:** halaman 404 point. dengan form cari; dalam satu menit path itu muncul di Admin, Log 404.

### I7. Data API Supabase tertutup

Project URL dan publishable key ada di dashboard Supabase produksi (tombol Connect, atau Settings, API Keys). Keduanya bukan rahasia.

```bash
read -r SUPABASE_URL
read -r KUNCI_PUBLIK
curl -s -o /dev/null -w "%{http_code}\n" "$SUPABASE_URL/rest/v1/artikel?select=id&limit=1" -H "apikey: $KUNCI_PUBLIK"
```

**Hasil yang diharapkan:** kode selain `200`. Bila `200`, ulangi C3 dan periksa kueri D4 (`anon_bisa_baca` harus `false`).

### I8. Asisten AI dengan kunci asli

Di artikel draf: buat brief, satu draf bagian, dan saran meta.

**Hasil yang diharapkan:** ketiganya menjawab; Admin, log AI mencatat token, biaya, dan durasi; pemakaian bulan ini di global Asisten AI bertambah sesuai biaya.

### I9. Backup dan CI setelah rilis

**Hasil yang diharapkan:** run Backup mingguan berikutnya (Minggu 02.23 WIB) hijau; CI tetap hijau di commit `master` berikutnya.

## J. AdSense

Ikuti Setup dari pemilik Rencana 8A setelah Kebijakan Privasi terbit (F4) dan konten cukup.

### J1. Daftarkan situs dan ID penerbit

Daftarkan `point.lat` di AdSense, Sites. Isi ID penerbit di Admin, global Iklan, dengan "Tampilkan iklan" tetap mati.

**Hasil yang diharapkan:** `https://point.lat/ads.txt` memuat baris AdSense; status ads.txt di AdSense, Sites menjadi "Authorized".

### J2. Unit iklan dan menyalakan

Buat unit display berukuran tetap (300 x 250, 336 x 280, atau 320 x 100) sesuai slot, isi ID unitnya di global Iklan, biarkan Auto ads mati. Setelah AdSense menyetujui situs, nyalakan "Tampilkan iklan" dengan "Mode uji" mati.

**Hasil yang diharapkan:** di jendela privat, banner persetujuan tampil; setelah "Izinkan semua", kotak berlabel "Advertisements" muncul dan terisi.

### J3. Lighthouse dengan iklan nyata

Di Chrome biasa (bukan privat), buka satu artikel, pilih "Izinkan semua", lalu DevTools, Lighthouse, mode Mobile, kategori Performance, dengan **Clear storage** dimatikan di setelan Lighthouse supaya pilihan persetujuan tetap ada. Jalankan **Analyze page load**.

**Hasil yang diharapkan:** iklan termuat selama pengukuran dan CLS paling banyak 0,1 (slot memesan tinggi). Catat skor Performance; skor di bawah 90 karena skrip iklan dicatat di log keputusan untuk dibahas, bukan alasan mematikan iklan.

## Verifikasi

- [ ] Deploy Production terakhir **Ready** dan log build memuat `Lingkungan produksi siap: env dan database cocok.`
- [ ] `https://point.lat` menjawab 200 dengan HSTS dan lima header keamanan (E2).
- [ ] Log indexing tulisan pertama Berhasil untuk Search Console dan IndexNow (I1).
- [ ] Cron `/api/jobs/run` 200 setiap 10 menit (I5).
- [ ] Data API Supabase tidak menjawab data (I7).
- [ ] Backup mingguan hijau dan uji pulih tercatat (H3).
- [ ] Deploy pratinjau memakai database pratinjau (H4).

## Pemecahan masalah

| Gejala | Kemungkinan penyebab | Perbaikan |
|---|---|---|
| Build: `Env deploy belum benar:` dengan daftar | Env lingkungan itu belum lengkap atau salah | Perbaiki setiap butir sesuai pesannya (D3), lalu Redeploy |
| Build: `Database ini milik Production, tetapi deploy ini Preview` | `DATABASE_URL` Preview menunjuk database produksi | Ganti `DATABASE_URL` dan `DATABASE_CA` Preview ke proyek pratinjau (C6), lalu Redeploy. Database produksi tidak diubah karena penjaga berhenti sebelum migrasi |
| Build: `Lingkungan lokal siap`, atau `missing secret key` sebelum env diisi | `VERCEL_ENV` tidak terbaca, jadi penjaga lingkungan mati | Centang Automatically expose System Environment Variables (D2), lalu Redeploy |
| Build: `unable to verify the first certificate` atau `self-signed certificate in certificate chain` | `DATABASE_CA` bukan sertifikat proyek itu, atau terpotong | Tempel ulang seluruh isi file sertifikat proyek yang sama dengan `DATABASE_URL` |
| Build: `password authentication failed` | Password di `DATABASE_URL` salah | Salin ulang URI transaction pooler (C4) |
| Build pratinjau gagal terhubung setelah lama tidak dipakai | Proyek Free dijeda | Dashboard Supabase, organisasi pratinjau, proyek pratinjau, **Resume project** |
| `pnpm seed` mencetak `Seed dihentikan. password: ...` | Password admin ditolak | Pakai frasa lain minimal 15 karakter (C5) |
| Cron di Logs berstatus 401 | `CRON_SECRET` berubah tanpa deploy ulang | Redeploy produksi |
| Log indexing: Google 403 | Akun layanan belum Owner | G3 |
| Log indexing: IndexNow 403 | File kunci tidak cocok | Buka `https://point.lat/<kunci>.txt`, cocokkan dengan Pengaturan SEO (G5) |
| AdSense: ads.txt "Not found" atau "Unauthorized" | ID penerbit belum diisi atau salah | Cocokkan isi `https://point.lat/ads.txt` dengan ID penerbit (J1) |

## Rollback

- **Kode:** Vercel, Deployments, deploy Production sebelumnya, **Instant Rollback**. Migrasi yang sudah berjalan tetap ada; perubahan skema selalu aditif (CLAUDE.md), jadi kode lama tetap berjalan di skema baru.
- **Env:** kembalikan nilai lama di Settings, Environment Variables, lalu Redeploy.
- **Data:** runbook `docs/operasional/pemulihan-database.md`, bagian C.
- **Iklan, Indexing API, atau Asisten AI bermasalah:** matikan saklarnya di admin (global Iklan, Pengaturan SEO, global Asisten AI); berlaku tanpa deploy.
- **Situs harus turun total:** Settings, Domains, hapus `point.lat` dari proyek (DNS tetap di pengelola domain untuk dipasang lagi).

## Eskalasi

| Situasi | Kontak | Cara |
|---|---|---|
| Build, domain, cron, atau Firewall bermasalah di sisi Vercel | Dukungan Vercel (paket Pro) | Dashboard Vercel, Help |
| Database, pooler, atau SSL bermasalah di sisi Supabase | Dukungan Supabase (paket Pro) | Dashboard Supabase, Support, tiket baru |
| Search Console atau akun layanan | Bantuan Search Console | support.google.com/webmasters |
| Cloudinary menolak unggah atau transformasi | Dukungan Cloudinary | Dashboard Cloudinary, Support |
| Claude API galat terus-menerus | Dukungan Anthropic | Claude Console, Help |

## Riwayat

| Tanggal | Oleh | Catatan |
|---|---|---|
| 7 November 2026 | Probe Rencana 8C (Postgres 16 lokal, PgBouncer mode transaksi dengan TLS dan CA tiruan sebagai pengganti Supabase) | C5 diuji: `pnpm migrate` dan `pnpm seed` dari shell dengan `DATABASE_URL` dan `DATABASE_CA` ter-export (nilai lewat `read -rs`) mengenai database pooler, bukan database di `.env` lokal; tanpa baris push `dev`; admin hasil seed bisa login dengan `PAYLOAD_SECRET` lain (seperti runtime Vercel), password salah ditolak. D1 diuji tanpa `.env`: dengan `VERCEL_ENV=production` dan tanpa env lain `pnpm periksa:rilis` menolak dengan enam butir yang diawali `DATABASE_URL belum diisi.`; tanpa `VERCEL_ENV` galatnya `missing secret key`. D4 diuji dengan `pnpm build:vercel` ber-`VERCEL_ENV=production` setelah C5: penanda `produksi`, migrasi hanya `Done.`, build berhasil, server menjawab 200 untuk beranda, rubrik, `/tools`, robots, sitemap, dan login admin dengan menu pilar dari seed, header keamanan, dan robots persis seperti I2. Penjaga, header, migrasi, dan backup juga diuji di task kode Rencana 8C. Langkah di layanan luar belum dijalankan. |
