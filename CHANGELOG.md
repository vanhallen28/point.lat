# Catatan perubahan point.lat

Setiap pembaruan yang dikirim ke pemilik punya nomor versi `vX.Y.Z`, dipakai di nama zip (`point-lat-vX.Y.Z.zip`), tag git, dan `package.json`.

- **Z** (angka terakhir) naik untuk perbaikan kecil, misalnya `v1.0.0` ke `v1.0.1`.
- **Y** (angka tengah) naik untuk fitur atau perubahan baru, misalnya `v1.0.1` ke `v1.1.0`.
- **X** (angka pertama) naik untuk perubahan besar yang mengubah cara kerja atau cara memasang, misalnya `v1.4.2` ke `v2.0.0`.

Versi yang terpasang di komputer: jalankan `git describe --tags` di folder proyek. Versi yang jalan di Vercel: lihat commit deploy di Deployments, sama dengan commit tag versinya.

## v1.4.0 (10 November 2026)

Tampilan seperti media: kartu bergambar, beranda bergaya portal, header dan footer lengkap. Ada juga perbaikan untuk artikel THR yang gagal diterbitkan.

- **Kartu artikel bergambar:** setiap kartu kini menampilkan gambar utama, pilar dan jenis tulisan, judul, Intinya, tanggal terbit, dan penulis. Artikel tanpa gambar memakai panel warna pilar dengan cincin dari logo, jadi daftar tetap rapi.
- **Beranda bergaya portal:**
  - kop "Intinya dulu." lebih ringkas, jadi berita utama langsung terlihat;
  - "Pilihan redaksi" tampil sebagai berita utama bergambar besar dengan dua berita di sampingnya;
  - "Tulisan terbaru" dan "Paling dicari" berupa daftar bergambar kecil dan bertanggal. Paling dicari diberi nomor peringkat;
  - blok baru **Strip kalkulator**: pita krem berisi kartu setiap kalkulator yang sudah terbit;
  - blok baru **Baris rubrik**: satu baris per pilar berisi tulisan terbarunya, dengan tautan "Semua tulisan".

  Blok baru ini dipasang otomatis di beranda saat deploy, selama beranda tidak punya perubahan yang belum diterbitkan. Urutannya tetap bisa diatur di Tampilan, Beranda.
- **Header:** baris atas berisi tanggal hari ini dan **Topik hangat**, yaitu subkategori dari tulisan terbaru yang berganti sendiri. Pilar yang belum punya tulisan terbit (sekarang Tekno dan Sehat) disembunyikan dari menu sampai ada isinya.
- **Footer lengkap:** logo, tagline, kolom Jelajahi, kolom Tentang, dan kolom Ikuti. Kolom Ikuti muncul setelah akun sosial diisi di Tampilan, Footer.
- **Artikel:** tanggal terbit kini tampil di bawah judul. Tanggal diperbarui hanya muncul bila berbeda.
- **Halaman Redaksi (draf):** kerangka kotak redaksi berisi penanggung jawab, pemimpin redaksi, penulis, alamat, email, badan hukum, serta koreksi dan hak jawab. Isi bagian dalam kurung siku, terbitkan, lalu tambahkan tautannya di Tampilan, Footer.
- **Perbaikan artikel THR:** tabel PPh 21 di draf THR punya kolom tanpa judul, jadi drafnya gagal diterbitkan ("Isian ini wajib diisi"). Draf yang sudah masuk diperbaiki otomatis saat deploy, dan impor berikutnya menolak tabel dengan sel kosong.
- **Penjelasan kalkulator:** impor ulang kini mengenali penjelasan yang sudah terbaru, bukan menganggapnya "sudah kamu sunting".
- Database: migrasi `beranda_portal` menambah tabel kedua blok baru, lalu memasang tata letak beranda, membuat draf Redaksi, dan memperbaiki draf THR. Tanpa dependensi baru.

## v1.3.1 (10 November 2026)

Pembaruan keamanan. Pasang secepatnya, juga bila v1.3.0 belum sempat di-push (zip ini sudah berisi v1.3.0).

- **Next.js 16.3.8 ke 16.4.5.** Menutup tiga celah Oktober 2026 (dua kritis, salah satunya eksekusi kode lewat optimasi gambar SVG, dan satu yang bisa membuat server sibuk lewat Server Actions, yang dipakai halaman admin) dan tujuh celah sedang November 2026. Celah `use cache` tidak mengenai point. karena fitur itu tidak dipakai, tetapi ikut tertutup.
- **sharp 0.35.4 ke 0.35.5.** Pustaka gambar yang dipakai Payload saat mengunggah gambar di admin; versi lama membawa celah di pembaca SVG.
- **Push lebih dari 1 MiB:** zip kini membawa pengaturan git yang mencegah galat `RPC failed; HTTP 400` saat push. Pemecahannya juga dicatat di runbook rilis.
- Tidak ada perubahan tampilan, isi, atau database.

Sisa peringatan `npm audit` sebagian besar ada di alat tes (Vitest, Lighthouse CI) yang tidak ikut ke Vercel. Sisanya pustaka bawaan Payload yang belum punya versi perbaikan lewat Payload: DOMPurify yang hanya berjalan di editor kode admin (Monaco), dan happy-dom di pengubah HTML ke Lexical yang tidak dipakai point. Jangan menjalankan `npm audit fix --force`: perintah itu menurunkan editor teks Payload ke versi 0.1.9 yang tidak cocok dan merusak admin.

## v1.3.0 (10 November 2026)

Paket konten awal supaya situs tidak sepi: 12 artikel lengkap dan penjelasan yang lebih panjang untuk keenam kalkulator, masuk lewat satu tombol di beranda admin.

- **Tombol Impor paket konten** di beranda admin (hanya admin). Sekali klik, 12 artikel masuk sebagai **draf**, lengkap dengan kartu sampul, Intinya, isi dengan contoh hitung dan tabel, FAQ, sumber resmi, isian SEO yang sudah hijau di panel SEO, kalkulator tersemat, dan tautan antarartikel. Kartu ini menunjukkan berapa artikel sudah masuk dan terbit, lalu hilang sendiri setelah semuanya terbit.
- **12 artikel paket:**
  - Uang & Karier: cara menghitung gaji bersih, PPh 21 TER, PTKP 2026, potongan BPJS di slip gaji, THR Lebaran 2027, upah lembur, lapor SPT Tahunan di Coretax, dan cicilan KPR;
  - Belajar: cara menghitung IPK, SNBP 2027, UTBK-SNBT 2027, dan KIP Kuliah.
- **Subkategori baru** dibuat bila belum ada: Gaji & Pajak, BPJS, Hak Pekerja, KPR & Kredit, Kuliah, Masuk PTN, dan Beasiswa.
- **Kartu sampul bergaya point.:** warna pilar, cincin dari logo, label pilar, dan kata kunci besar. Dipotong otomatis dengan rapi untuk 16:9, 4:3, dan kotak.
- **Penjelasan kalkulator lebih lengkap** (sekitar 600 kata per tools): cara memakai, contoh, kesalahan yang sering terjadi, dan sumber. Hanya kalkulator yang masih draf dan belum kamu sunting yang diperbarui; yang sudah terbit atau sudah kamu ubah tidak disentuh.
- **Blok Pilihan redaksi di beranda** ditambahkan setelah hero bila beranda belum punya blok itu. Kartunya baru tampil setelah artikel pilihannya terbit.
- **Tetap wajib review:** setiap artikel paket ditandai draf AI, jadi tiga centang Review sebelum terbit harus diisi dulu. Draf tidak dikabarkan ke Google sampai kamu menerbitkannya.
- **Aman diklik ulang:** artikel yang sudah ada (draf atau terbit) tidak ditimpa dan sampul tidak diunggah dua kali.
- Tanpa perubahan database dan tanpa dependensi baru.

## v1.2.1 (9 November 2026)

Menu kiri admin: ikon setiap bagian tetap terlihat saat grupnya dilipat.

- **Grup berikon:** Konten, Pembaca, Tools, SEO, Pengaturan, dan Tampilan kini berupa baris dengan ikon, nama, dan panah. Saat grup dilipat, ikonnya tetap ada, jadi menu yang ringkas tetap mudah dikenali.
- **Isi grup menjorok** dengan garis pandu, jadi jelas menu mana milik grup mana.
- **Penanda halaman aktif:** grup yang dilipat tetapi berisi halaman yang sedang kamu buka ditandai garis biru.
- **Pesan baru tetap terlihat:** angka pesan baru pindah ke baris Pembaca saat grup itu dilipat.

## v1.2.0 (9 November 2026)

Admin yang lebih profesional mengikuti gambar referensi kamu, plus fitur yang biasanya dipasang lewat plugin WordPress.

- **Tampilan admin bermerek:** logo point. di halaman masuk dan menu kiri, huruf Archivo, menu kiri gelap dengan ikon, bidang krem dengan kartu putih, dan tombol utama biru. Tema gelap tetap jalan.
- **Beranda admin baru** (`/admin`):
  - empat kartu angka: klik dan impresi Google dibanding periode sebelumnya, artikel terbit, terindeks;
  - kalender konten per pilar untuk pekan lalu, pekan ini, pekan depan, dan draf;
  - grafik klik per pekan dan donat status indeks;
  - tabel terbit terbaru, kesehatan situs, dan anggaran AI;
  - daftar Perlu perhatian, yang setiap barisnya membuka daftar yang tepat.

  Editor hanya melihat bagian konten.
- **Dashboard SEO:** gaya kartu yang sama, pilihan periode 7, 28, atau 90 hari, dan setiap angka dibanding periode sebelumnya.
- **Menu Fitur (pengganti plugin):** saklar Form kontak, Newsletter, Tombol bagikan, Daftar isi, dan Waktu baca, plus ringkasan Iklan, Asisten AI, Mesin Indexing, dan Kode sematan. Plugin yang diunggah tidak didukung: fitur baru datang lewat zip pembaruan seperti ini.
- **Kode sematan:** tempat menempel kode Google Analytics, Meta Pixel, widget chat, dan sejenisnya. Kode jenis "Butuh persetujuan" baru jalan setelah pembaca memilih Izinkan semua, banner cookie ikut menyebut layanannya, dan cookie-nya dihapus saat persetujuan ditarik. Hanya admin yang bisa mengisi.
- **Form kontak:** blok "Form kontak" untuk halaman Kontak. Pesan masuk ke menu Pembaca, Pesan masuk (tanpa email), dengan anti-spam dan batas 5 kiriman per jam per pengirim. Pesan dihapus otomatis setelah 12 bulan.
- **Newsletter tersimpan:**
  - form email dengan persetujuan di beranda, dan opsional di akhir artikel;
  - pelanggan disimpan di Supabase (menu Pembaca, Pelanggan newsletter) dengan tombol Unduh CSV;
  - halaman berhenti langganan di `/newsletter/berhenti`;
  - pilihan lama "tautan ke form penyedia" tetap ada.
- **Tombol bagikan** di akhir artikel: WhatsApp, Telegram, X, Facebook, dan Salin tautan, tanpa skrip pihak ketiga.
- **Data lama aman:** migrasi `ruang_redaksi` hanya menambah tabel. Bila newsletter sudah memakai URL form penyedia, caranya tetap penyedia, dan saklar newsletter lama dipindah ke menu Fitur.
- **Kebijakan Privasi:** draf di dokumen "Draf halaman wajib" sudah diperbarui untuk form kontak, newsletter, pencegahan spam, dan kode pihak ketiga. Baca ulang lalu salin ke admin sebelum menyalakan fitur-fitur ini.

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
