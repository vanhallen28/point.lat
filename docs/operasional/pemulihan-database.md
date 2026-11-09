# Runbook: Cadangan dan pemulihan database point.lat

**Pemilik:** pemilik point.lat | **Frekuensi:** cadangan otomatis setiap minggu; uji pulih setiap 3 bulan dan setelah Postgres Supabase dinaikkan versinya; pemulihan saat dibutuhkan.
**Diperbarui:** 9 November 2026 (v1.1.0: tanpa Docker) | **Uji pulih terakhir:** 6 November 2026, probe Rencana 8C (lihat Riwayat).

## Tujuan

Database produksi (Supabase, Singapura) punya dua lapis cadangan. Di paket Free hanya lapis kedua yang ada, jadi cadangan mingguan wajib berjalan:

| Lapis | Isi | Disimpan | Dipakai bila |
|---|---|---|---|
| Backup harian bawaan Supabase (hanya paket Pro) | Seluruh proyek (fisik) | 7 hari, di Supabase | Data salah atau terhapus dalam 7 hari terakhir dan proyek Supabase masih ada |
| Cadangan mingguan GitHub Actions (`.github/workflows/backup.yml`) | Skema `public` (semua tabel Payload), `pg_dump` format custom, terenkripsi GPG | 90 hari, artifact repo `vanhallen28/point.lat` (terenkripsi, jadi tetap aman bila repo publik) | Proyek Supabase hilang atau terhapus (backup harian ikut terhapus bersama proyek), atau data yang dibutuhkan lebih lama dari 7 hari |

Cadangan mingguan dienkripsi ke kunci publik GPG pemilik sebelum disimpan. Kunci rahasia untuk membukanya tidak pernah ada di GitHub, jadi artifact yang bocor tidak bisa dibaca. Media (gambar dan video) ada di Cloudinary, bukan di database; cadangan ini hanya menyimpan URL dan metadatanya.

## Prasyarat

- [ ] Akses Owner di organisasi Supabase dan admin di repo GitHub `vanhallen28/point.lat`.
- [ ] Komputer dengan `gpg` (GnuPG 2.2 atau lebih baru), Node dan npm, serta salinan repo. Tanpa Docker: untuk pemeriksaan A3 dan bagian B dan C pasang **Postgres.app** (postgresapp.com, aplikasi Mac biasa yang mendukung Mac Intel) dengan versi utama sama dengan Postgres Supabase (Settings, Infrastructure). Postgres.app menyediakan `psql` dan `pg_restore`, dan servernya hanya dinyalakan selama uji pulih. Lalu di setiap Terminal: `export PG_BIN=/Applications/Postgres.app/Contents/Versions/17/bin` dan `export PATH="$PG_BIN:$PATH"` (ganti 17 bila versinya lain).
- [ ] Kunci rahasia GPG cadangan di pengelola password pemilik (dibuat di bagian A).

## A. Penyiapan sekali

### A1. Buat kunci GPG khusus cadangan

```bash
gpg --quick-generate-key "Cadangan point.lat <email-pemilik>" ed25519 sign never
gpg --list-keys --with-colons "Cadangan point.lat" | awk -F: '/^fpr/{print $10; exit}'
gpg --quick-add-key <sidik-jari-dari-perintah-sebelumnya> cv25519 encr never
gpg --armor --export "Cadangan point.lat" > kunci-publik-cadangan.asc
gpg --armor --export-secret-keys "Cadangan point.lat" > kunci-rahasia-cadangan.asc
```

GPG meminta passphrase; buat passphrase panjang dan simpan di pengelola password. Simpan isi `kunci-rahasia-cadangan.asc` sebagai catatan aman di pengelola password, lalu hapus file itu dari disk.

**Hasil yang diharapkan:** `gpg --list-keys "Cadangan point.lat"` menampilkan baris `sub cv25519 ... [E]`.
**Bila gagal:** pastikan versi GnuPG 2.2 atau lebih baru (`gpg --version`).

### A2. Role baca saja untuk cadangan di Supabase

Supabase menyarankan satu role untuk setiap layanan luar, bukan password `postgres`. Di dashboard Supabase proyek produksi, buka SQL Editor dan jalankan (password dibuat pengelola password; hindari simbol supaya tidak perlu di-encode di URL):

```sql
create role cadangan_baca with login password '<password-acak-dari-pengelola-password>';
grant usage on schema public to cadangan_baca;
grant select on all tables in schema public to cadangan_baca;
grant select on all sequences in schema public to cadangan_baca;
alter default privileges for role postgres in schema public grant select on tables to cadangan_baca;
alter default privileges for role postgres in schema public grant select on sequences to cadangan_baca;
```

`alter default privileges` membuat tabel dari migrasi berikutnya ikut terbaca role ini.

**Hasil yang diharapkan:** setiap pernyataan selesai tanpa galat.

### A3. Connection string session pooler role itu

Di Supabase, Connect, pilih **Session pooler** (port 5432, IPv4; runner GitHub hanya IPv4, dan `pg_dump` butuh sesi utuh sehingga mode transaksi port 6543 tidak cukup). Ganti nama pengguna `postgres.<ref>` dengan `cadangan_baca.<ref>` dan passwordnya dengan password A2. Periksa dari komputer:

```bash
psql "<url-session-pooler-cadangan_baca>" -c "select count(*) from artikel"
psql "<url-session-pooler-cadangan_baca>" -c "insert into pilar (nama) values ('uji')"
```

**Hasil yang diharapkan:** perintah pertama mencetak jumlah artikel; perintah kedua ditolak `permission denied for table pilar`.

### A4. Secret GitHub Actions

Di repo `vanhallen28/point.lat`: Settings, Secrets and variables, Actions, **New repository secret**:

| Nama | Isi |
|---|---|
| `BACKUP_DATABASE_URL` | URL session pooler `cadangan_baca` dari A3 |
| `BACKUP_KUNCI_PUBLIK` | seluruh isi `kunci-publik-cadangan.asc` (dari `-----BEGIN PGP PUBLIC KEY BLOCK-----` sampai `-----END PGP PUBLIC KEY BLOCK-----`) |

### A5. Versi Postgres

Bila Supabase menampilkan versi utama selain 17 (Settings, Infrastructure), ubah `PG_MAJOR` di `.github/workflows/backup.yml` lewat commit biasa. Skrip menolak `pg_dump` yang lebih lama dari server dengan pesan yang menyebut kedua versi.

### A6. Jalankan sekali dari GitHub

Actions, **Backup mingguan**, **Run workflow** (branch `master`).

**Hasil yang diharapkan:** run hijau; log langkah "Dump dan enkripsi" berakhir dengan `Cadangan cadangan/pointlat-<waktu UTC>.dump.gpg: data <n> tabel, <ukuran> byte terenkripsi.`; di halaman run ada artifact `cadangan-database-<nomor run>` berisi `pointlat-<waktu>.dump.gpg` dan `.sha256`.
**Bila gagal:** lihat Pemecahan masalah.

Jadwal otomatis: setiap Minggu pukul 02.23 WIB (GitHub dapat menundanya saat sibuk). Artifact disimpan 90 hari (13 cadangan); batas repo privat bisa dinaikkan sampai 400 hari di Settings, Actions, General.

## B. Uji pulih (setiap 3 bulan)

Uji ini memakai database lokal, jadi tidak menyentuh produksi.

### B1. Unduh cadangan terbaru

Actions, run **Backup mingguan** terakhir yang hijau, Artifacts, unduh `cadangan-database-<nomor>`, lalu ekstrak zip-nya ke folder kerja.

### B2. Impor kunci rahasia

```bash
gpg --import kunci-rahasia-cadangan.asc
```

(salin isi catatan pengelola password ke file sementara, impor, lalu hapus file itu.)

### B3. Pulihkan ke database lokal kosong

Buka Postgres.app, pilih **Initialize** (hanya pertama kali) atau **Start**. Server ini hanya untuk uji pulih di komputer, menerima koneksi lokal tanpa password, dan dimatikan lagi di B5.

```bash
psql postgres://127.0.0.1:5432/postgres -c "create database pointlat_pulih"
scripts/pulihkan-database.sh pointlat-<waktu>.dump.gpg postgres://127.0.0.1:5432/pointlat_pulih
```

`PG_BIN` dari Prasyarat menunjuk klien Postgres.app; versinya harus sama atau lebih baru dari Postgres Supabase. GPG meminta passphrase kunci.

**Hasil yang diharapkan:** checksum cocok, lalu `Dipulihkan: <n> tabel. Migrasi tercatat: <daftar migrasi>.` dengan daftar migrasi sama dengan isi `src/migrations/index.ts` saat cadangan dibuat.
**Bila gagal:** `Database tujuan sudah berisi ...` berarti database tidak kosong; buat database baru.

### B4. Jalankan situs dari database hasil pulih

```bash
DATABASE_URL=postgres://127.0.0.1:5432/pointlat_pulih npm run migrate
DATABASE_URL=postgres://127.0.0.1:5432/pointlat_pulih npm run build
DATABASE_URL=postgres://127.0.0.1:5432/pointlat_pulih INDEXER_ADAPTER=palsu AI_ADAPTER=palsu \
  CLOUDINARY_CLOUD_NAME=<cloud-name-produksi> CLOUDINARY_API_KEY=uji-pulih CLOUDINARY_API_SECRET=uji-pulih PORT=3200 npm run start
```

Cloud name asli membuat gambar tampil dari CDN Cloudinary; API key dan secret tiruan cukup karena uji pulih tidak mengunggah apa pun. Adapter palsu memastikan uji ini tidak mengabari Google atau memanggil Claude.

**Hasil yang diharapkan:** `npm run migrate` hanya mencetak `Done.` (semua migrasi sudah tercatat, kecuali migrasi yang lebih baru dari cadangan); build berhasil; `http://localhost:3200/`, satu artikel, satu rubrik, satu tools, `/sitemap.xml`, dan `/admin/login` menjawab 200; login admin dengan akun produksi berhasil; jumlah artikel di admin sama dengan produksi saat cadangan dibuat.

### B5. Bersihkan

```bash
psql postgres://127.0.0.1:5432/postgres -c "drop database pointlat_pulih"
gpg --delete-secret-keys "Cadangan point.lat"
```

Di Postgres.app pilih **Stop**. Hapus file cadangan yang diunduh. Catat hasilnya di Riwayat.

## C. Pemulihan produksi

### C1. Data salah atau terhapus dalam 7 hari terakhir, proyek Supabase masih ada

Supabase, Database, Backups, pilih backup harian sebelum kejadian, **Restore**. Proyek tidak bisa diakses selama pemulihan (situs publik tetap tampil dari cache ISR, admin dan halaman yang belum tercache galat).

Setelah selesai: Vercel, Deployments, deployment produksi terakhir, **Redeploy**. Build menjalankan `npm run build:vercel`, jadi migrasi yang lebih baru dari backup diterapkan ulang.

Password role buatan sendiri tidak ikut backup Supabase. Setelah pemulihan, di SQL Editor jalankan `alter role cadangan_baca with password '<password-cadangan_baca-dari-pengelola-password>';` dengan password yang sama seperti di A2, supaya secret `BACKUP_DATABASE_URL` tetap berlaku.

**Periksa:** beranda, satu artikel, admin login, dan Dashboard SEO (cron berjalan pada jadwal berikutnya, sekali sehari selama di Hobby).

### C2. Proyek Supabase hilang, atau backup harian tidak cukup

1. Buat proyek Supabase baru (organisasi Pro, region Singapura `ap-southeast-1`), lalu matikan Data API seperti saat rilis (Integrations, Data API, **Enable Data API** dimatikan).
2. Pulihkan cadangan mingguan terbaru ke proyek baru lewat session pooler role `postgres` (skema `public` proyek baru masih kosong):

   ```bash
   scripts/pulihkan-database.sh pointlat-<waktu>.dump.gpg "<url-session-pooler-postgres-proyek-baru>"
   ```

3. Ulangi A2 sampai A4 untuk proyek baru (role tidak ikut tercadang).
4. Di Vercel, ganti `DATABASE_URL` Production (transaction pooler proyek baru, port 6543) dan `DATABASE_CA` (sertifikat proyek baru), lalu **Redeploy** produksi.

**Periksa:** sama dengan C1. Penanda `lingkungan-database` ikut terpulihkan sebagai produksi, jadi deploy produksi lolos dan deploy pratinjau tetap ditolak memakai database ini. Data sejak cadangan mingguan itu hilang; terbitkan ulang perubahan yang dibuat sesudahnya.

## Verifikasi

- [ ] Run Backup mingguan terakhir hijau dan berumur paling lama 7 hari.
- [ ] Artifact berisi `.dump.gpg` dan `.sha256`.
- [ ] Uji pulih B dalam 3 bulan terakhir tercatat di Riwayat dan hasilnya sesuai.

## Pemecahan masalah

| Gejala | Kemungkinan penyebab | Perbaikan |
|---|---|---|
| `pg_dump 16 lebih lama dari server Postgres 17` | Supabase dinaikkan versinya | Ubah `PG_MAJOR` di `backup.yml` (A5) |
| `permission denied for table ...` saat dump | Tabel dibuat role lain atau sebelum `alter default privileges` | Jalankan ulang tiga `grant` di A2 |
| `password authentication failed` | Password role atau format pengguna `cadangan_baca.<ref>` salah | Periksa URL di A3, lalu perbarui secret |
| `Cadangan tidak berisi data tabel.` | URL menunjuk database lain atau role tanpa hak baca | Periksa URL dan A2 |
| `gpg: public key decryption failed: No secret key` saat pulih | Kunci rahasia belum diimpor atau kunci berbeda | Ulangi B2 dengan kunci dari pengelola password |
| `Database tujuan sudah berisi ...` | Database tujuan tidak kosong | Pakai database baru |
| Run terjadwal tidak muncul tepat waktu | Jadwal GitHub tertunda saat sibuk | Tunggu, atau Run workflow manual |
| Artifact hilang | Lewat 90 hari | Wajar; cadangan baru dibuat setiap minggu |

## Rollback

Pemulihan C1 dan C2 bisa diulang dari cadangan lain yang lebih lama. Sebelum C1, unduh dulu cadangan mingguan terbaru (A6 atau Run workflow) supaya keadaan sekarang ikut tersimpan.

## Eskalasi

| Situasi | Kontak | Cara |
|---|---|---|
| Restore dashboard Supabase gagal atau macet | Dukungan Supabase (paket Pro) | Dashboard Supabase, Support, tiket baru |
| Run workflow atau artifact bermasalah di sisi GitHub | Dukungan GitHub | support.github.com |

## Riwayat

| Tanggal | Oleh | Catatan |
|---|---|---|
| 9 November 2026 | Sesi Claude (v1.1.0) | Runbook disesuaikan: tanpa Docker; klien dan server uji pulih dari Postgres.app (dinyalakan hanya selama uji); di Supabase Free cadangan mingguan satu-satunya cadangan. Uji pulih belum dijalankan ulang. |
| 6 November 2026 | Probe Rencana 8C (Postgres 16 lokal, kunci GPG uji) | Sumber: database hasil migrasi berisi data contoh E2E (108 tabel, 1.244 baris, 60 artikel). Langkah workflow dijalankan lokal: cadangan 101.783 byte, terenkripsi ke subkunci pemilik, tanpa teks tabel terbaca. Kunci lain ditolak (`No secret key`); `pg_dump` yang lebih lama dari server ditolak. Pulih ke database kosong: 108 tabel, jumlah baris setiap tabel dan skema sama dengan sumber; `npm run migrate` tanpa langkah; build dan server dari database hasil pulih menjawab 200 untuk enam path dan lulus 23 tes E2E (header, artikel, rubrik, tools). |
