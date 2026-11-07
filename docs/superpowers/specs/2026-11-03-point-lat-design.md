# point.lat · Design Spec

**Tanggal:** 2026-11-03
**Status:** desain disetujui per bagian dalam sesi brainstorming, menunggu review spesifikasi tertulis.
**Pemilik:** pemilik point.lat (penulis tunggal, dibantu asisten AI di CMS)
**Kanvas visual:** "point.lat · Arah Visual" (Arah 3 · Kartu Intinya dipilih)
**Log keputusan:** PROJECT WEB `claude/point-lat-decisions.md`

---

## 1. Ringkasan

point.lat adalah media edukasi praktis berbahasa Indonesia untuk pembaca usia 18-35. Isinya menjelaskan uang, karier, teknologi, pendidikan, dan kesehatan mulai dari intinya, lalu memberi alat (kalkulator) untuk langsung menghitung. Situs dibangun dengan Next.js + Payload CMS 3 di Vercel, database Supabase Postgres, dan media lewat Cloudinary. Semua konten dan elemen tampilan bisa diedit dari CMS. Setiap kali konten terbit atau berubah besar, Mesin Indexing memberi tahu mesin pencari secara otomatis dan memantau status indeksnya.

### Kriteria sukses (operasional, bukan target trafik)

1. Pemilik bisa mengubah menu, homepage, footer, slot iklan, pengaturan SEO, parameter rumus kalkulator, dan semua isi tanpa menyentuh kode.
2. Setiap publikasi tercatat di log indexing dengan hasil tiap langkah, dan status indeks tampil di daftar artikel dalam 7 hari.
3. Halaman artikel dan tools memenuhi ambang "baik" Core Web Vitals di uji lab: LCP < 2,5 dtk, INP < 200 ms, CLS < 0,1.
4. Setiap artikel di pilar Uang & Karier dan Sehat punya penulis, minimal satu sumber, tanggal diperbarui, dan disclaimer.
5. Skrip design-audit tidak menemukan temuan Critical sebelum rilis.

## 2. Keputusan

| Topik | Keputusan |
|---|---|
| Arah konten | Hybrid: panduan evergreen + tools + explainer topik hangat |
| Pilar | Uang & Karier, Tekno, Belajar, Sehat. 60-90 hari pertama fokus artikel di Uang & Karier dan Belajar |
| Pengelola | Pemilik sendiri + asisten AI (AI tidak bisa menerbitkan) |
| Bahasa & pasar | Bahasa Indonesia (`id-ID`), pembaca Indonesia, sapaan "kamu" |
| Stack | Next.js (App Router) + Payload CMS 3, satu aplikasi |
| Hosting | Vercel (paket Pro, lihat §19), database Supabase Postgres lewat pooler |
| Media | Cloudinary untuk semua gambar dan video, upload langsung dari browser |
| Monetisasi | Iklan (AdSense dsb.), slot dikelola CMS |
| Visual | Arah 3 · Kartu Intinya |
| URL artikel | `point.lat/{slug}` (datar), rubrik di `/{pilar}` |
| Indexing | Sitemap + Search Console API + IndexNow + URL Inspection. Google Indexing API opsional, mati secara default |
| Mode gelap | Di luar MVP. Token warna disiapkan supaya bisa ditambah |

## 3. Brand & konten

**Positioning:** media edukasi praktis untuk pembaca Indonesia 18-35 yang ingin cepat paham urusan uang, karier, teknologi, pendidikan, dan kesehatan. Setiap halaman dimulai dari intinya, lalu bisa langsung dihitung atau dipraktikkan.

**Nama & tanda:** ditulis `point.` Titik adalah logo dan punya dua makna: "intinya" dan titik koordinat (.lat = latitude).

**Tagline:** "Intinya dulu."

**Suara:**

| Sifat | Artinya | Bukan |
|---|---|---|
| Lugas | jawaban ada di kalimat pertama | dingin, ketus |
| Cermat | angka bersumber, ada tanggal update | kaku seperti jurnal |
| Akrab | bahasa sehari-hari, sapaan "kamu" | alay, penuh slang |

Aturan copy situs: tanpa em dash dan en dash, tanpa tanda seru di UI, kalimat aktif, CTA menyebut hasilnya ("Hitung gaji bersih", bukan "Submit").

**Rubrik (menu utama):** Uang & Karier · Tekno · Belajar · Sehat · Tools. Subkategori dikelola di CMS.

**Format konten** (masing-masing tipe artikel dengan aturan SEO sendiri):

| Format | Panjang acuan | Ciri wajib |
|---|---|---|
| Panduan | 1.500-2.500 kata | kotak Intinya, daftar isi, langkah, FAQ, sumber |
| Explainer | 600-900 kata | kotak Intinya, konteks "kenapa sekarang", sumber |
| Daftar & Perbandingan | 1.200-2.000 kata | tabel perbandingan, kriteria penilaian |
| Glosarium | 300-800 kata | definisi di kalimat pertama, link ke panduan terkait |
| Tools | 600-1.200 kata di bawah kalkulator | rumus, contoh hitung, sumber aturan |
| Video explainer | 30-60 detik | transkrip, artikel induk (Fase 2 untuk pipeline produksi) |

Panjang adalah acuan, bukan kuota. Brief menyesuaikan dengan hasil teratas di Google.

**Tools MVP (6):** Gaji Bersih (PPh 21 + BPJS), THR, Cicilan & KPR, Dana Darurat, BMI & Kebutuhan Kalori, IPK. Aturan pajak dan iuran diverifikasi ke sumber resmi (DJP, BPJS Kesehatan, BPJS Ketenagakerjaan, Kemnaker) saat build, dan disimpan sebagai parameter bertanggal di CMS.

**Rambu kredibilitas (YMYL):** halaman profil penulis, Kebijakan Redaksi (termasuk kebijakan penggunaan AI), Pedoman Media Siber, blok sumber di setiap artikel, label "Diperbarui", disclaimer otomatis untuk artikel di pilar Uang & Karier dan Sehat.

## 4. Visual: Kartu Intinya

### Warna (token)

| Token | Hex | Pemakaian |
|---|---|---|
| `ink` | `#111111` | teks utama, garis, tombol utama |
| `paper` | `#FFFFFF` | latar halaman |
| `sand` | `#F4F1EC` | latar chip, kotak newsletter, permukaan sekunder |
| `muted` | `#5C5852` | teks sekunder |
| `pilar-uang` | `#1F7A4D` | Uang & Karier (teks putih di atasnya) |
| `pilar-tekno` | `#C2410C` | Tekno (teks putih) |
| `pilar-belajar` | `#F2C230` | Belajar (teks ink) |
| `pilar-sehat` | `#FF8A80` | Sehat (teks ink) |

**Kontras terukur:** ink/paper 18,88:1 · ink/sand 16,76:1 · muted/paper 7,06:1 · muted/sand 6,27:1 · putih/uang 5,32:1 · putih/tekno 5,18:1 · ink/belajar 11,27:1 · ink/sehat 8,27:1 · uang sebagai teks di sand 4,72:1. Warna pilar kuning dan koral tidak dipakai sebagai warna teks di latar terang. Warna pilar selalu didampingi label teks, tidak pernah jadi satu-satunya penanda. Dilarang: gradien biru-ungu, teks gradien, efek kaca, glow.

### Tipografi

Archivo (variable, sumbu `wdth` 62-125 dan `wght` 400-900), di-host sendiri dan dipangkas ke karakter Latin.

| Peran | Ukuran | Gaya |
|---|---|---|
| Display hero | clamp(72px, 14vw, 196px) | 900, wdth 68, uppercase, leading 0,86 |
| H1 artikel | clamp(34px, 4.4vw, 58px) | 900, wdth 80, leading 0,98 |
| H2 | 28-34px | 800-900, wdth 80-85 |
| Body | 18px (min 16px di HP) | 400, leading 1,6, lebar baris 60-75 karakter |
| Label/kicker | 13px | 800, uppercase, tracking 0,04em |

### Pola tata letak

- Header: logo `point.` + pill rubrik dengan titik warna pilar + tombol Tools hitam.
- Homepage: judul raksasa "INTINYA DULU.", kalimat pembuka, pencarian besar; mozaik kartu ukuran beragam (bukan grid kartu seragam); strip video 9:16 gelap; "Paling dicari pekan ini" (judul diubah pemilik 2026-11-05 dari "Paling dibaca pekan ini" karena datanya klik dari pencarian Google, bukan semua pembaca; artikel dengan klik Google terbanyak 7 hari terakhir dari sinkron Search Analytics harian; selama datanya belum cukup untuk semua tempat, blok ini menampilkan tulisan terbaru dengan judul "Tulisan terbaru", keputusan pemilik 2026-11-05); slot iklan; newsletter; footer.
- Halaman artikel: kicker pilar, H1, deck, byline + diperbarui + waktu baca, kotak Intinya (latar warna pilar versi lembut atau sand, label "Intinya"), daftar isi, isi, blok sumber, FAQ, artikel terkait, profil penulis.
- Halaman tools: kalkulator di atas lipatan, hasil besar, lalu artikel penjelasan rumus.
- Radius 14px (kontrol), 24px (kartu). Target sentuh minimal 44px. Spasi kelipatan 4px.
- Breakpoint: 375 / 768 / 1024 / 1440. Kontainer maksimal 1200px, gutter clamp(16px, 4vw, 40px).

Ikon: satu set stroke (Lucide), tanpa emoji.

## 5. Arsitektur

```
Browser ──► Vercel (Next.js App Router)
              ├─ Halaman publik (statis + revalidasi per tag)
              ├─ /admin (Payload 3)
              ├─ /api/* (Payload REST/GraphQL, webhook, job runner)
              └─ Modul: indexer · seo · hitung · media · iklan · ai
            ├──► Supabase Postgres (data, antrean job, log)
            ├──► Cloudinary (upload, simpan, transformasi, CDN media)
            ├──► Google Search Console API / URL Inspection API
            ├──► IndexNow (api.indexnow.org)
            └──► Claude API (asisten AI, hanya dari server)
Vercel Cron ──► /api/jobs/run sesuai jadwal vercel.json (header rahasia)
```

**Rendering:** halaman publik dirender statis dan di-cache dengan tag (`article:{id}`, `pilar:{slug}`, `home`, `sitemap`). Hook Payload `afterChange`/`afterDelete` memanggil `revalidateTag` untuk tag yang terdampak. Komponen server sebanyak mungkin, JavaScript klien hanya untuk kalkulator, pencarian, iklan, dan banner persetujuan.

**Penjadwal:** Vercel Cron (jadwal di `vercel.json`: setiap 10 menit di paket Pro; sekali sehari selama di Hobby, keputusan pemilik 2026-11-07) memanggil endpoint job runner Payload untuk pekerjaan berulang: retry indexing, cek status, sinkron Search Analytics harian, cek link rusak mingguan. Saat publikasi, job pertama langsung dijalankan lewat `after()` Next.js supaya tidak menunggu jadwal. Paket Hobby tidak dipakai karena cron-nya hanya sekali sehari dan paket itu untuk penggunaan non-komersial.

**Koneksi database:** Supabase pooler Supavisor mode transaksi (port 6543, IPv4) untuk fungsi Vercel di `sin1` (dekat Supabase Singapura), pool 5 koneksi per instance, koneksi menganggur ditutup 5 detik, TLS terverifikasi dengan sertifikat CA Supabase (`DATABASE_CA`). Skema produksi dan pratinjau hanya lewat migrasi Payload (`src/migrations`) yang dijalankan build Vercel sebelum `next build`; push skema hanya ke database lokal. Data API Supabase dimatikan dan hak `anon` dan `authenticated` atas skema `public` dicabut migrasi. Deploy produksi dan pratinjau menandai databasenya dan menolak database milik lingkungan lain; pratinjau memakai proyek Supabase sendiri. (Rencana 8C)

### Modul (antarmuka kecil, implementasi dalam)

| Modul | Antarmuka | Di dalamnya | Adapter |
|---|---|---|---|
| `indexer` | `kabari(payload, kabar[])` dengan jenis `terbit` / `ubah-besar` / `pindah` / `hapus` (dipanggil hook koleksi); `jalankanIndexer(payload)` (cron dan `after()`) | antrean job di Postgres, dedup per URL dan langkah, jendela kirim sitemap dan IndexNow, retry 1/5/30 menit, kuota harian Google, cek status bertahap, klaim atomik, log | `searchConsole`, `indexNow`, `googleIndexing` (opsional), `palsu` untuk tes dan pratinjau (dipilih `INDEXER_ADAPTER`) |
| `pantau` | `jalankanPantau(payload)` (cron: tugas harian dan cek tautan luar); `ambilDashboard(payload)` (dashboard SEO admin) | sinkron Search Analytics harian (total harian, ringkasan 28 dan 7 hari per halaman), retensi log, pindai tautan (internal rusak, alamat lama, halaman yatim), cek tautan luar mingguan, klaim tugas atomik | Search Analytics (akun layanan yang sama dengan `indexer`), pemeriksa tautan HTTP, `palsu` untuk tes (dipilih `INDEXER_ADAPTER`) |
| `seo` | `metadata(doc)`, `jsonLd(doc)`, `analisis(doc) → daftar cek` | aturan judul/meta, canonical, robots, schema per tipe, skor checklist | (tidak ada seam, fungsi murni) |
| `hitung` | `hitung(toolId, input, tanggal) → hasil + rincian` | rumus per tool, pemilihan parameter sesuai tanggal berlaku | (fungsi murni, parameter dari CMS) |
| `media` | `unggah(file) → {publicId, meta}`, `url(publicId, preset)` | tanda tangan upload, preset transformasi, OG image | `cloudinary` (adapter `@payloadcms/plugin-cloud-storage`), `palsu` untuk tes |
| `iklan` | `pilihSlot(pengaturan, posisi, id?)` dan `<SlotIklan slot={...}/>` (pengaturan dari `muatIklan()`); `skripAwal()`, banner persetujuan, dan `PemuatIklan` di layout; `isiAdsTxt` untuk `/ads.txt` | syarat slot tampil, posisi dan ukuran tetap, iklan tengah artikel setelah paragraf ke-N, persetujuan di browser (cookie bertanggal dan berversi, Consent Mode v2), lazy-load setelah persetujuan dan saat slot hampir terlihat, ruang dipesan | penyedia iklan AdSense (`adsense.ts`; tes mencegat domainnya di browser) |
| `ai` | `jalankan(payload, tugas, masukan, opsi)` untuk brief, draf per bagian, dan generator meta (endpoint `/api/artikel/asisten`); `periksaPola(blok)` dan `periksaKlaim(blok, sumber)` di browser | prompt, skema JSON, dan pemeriksa per tugas, batas 6 permintaan per menit per pengguna, cadangan anggaran bulanan atomik (US$, waktu Jakarta), log, pembersih em dash dan en dash | `asli` (Messages API lewat `fetch` dengan `ANTHROPIC_API_KEY`), `palsu` untuk tes, dev, dan pratinjau (dipilih `AI_ADAPTER`) |

### Struktur folder (rencana)

```
point-lat/
  CLAUDE.md                 aturan proyek (context-engineering)
  docs/superpowers/specs/   spesifikasi
  docs/superpowers/plans/   rencana implementasi
  src/app/(situs)/          halaman publik
  src/app/(payload)/        admin & API Payload
  src/collections/          koleksi Payload
  src/globals/              global Payload
  src/blocks/               blok konten & page builder
  src/modules/{indexer,seo,hitung,media,iklan,ai}/
  src/components/           komponen UI publik
  src/styles/tokens.css     token desain
  tests/                    unit, integrasi, e2e
```

## 6. Model konten (Payload)

### Koleksi

| Koleksi | Field utama |
|---|---|
| `artikel` | judul, slug, tipe (Panduan/Explainer/Daftar/Glosarium), pilar, subkategori, penulis, deck, **intinya** (2-4 poin, wajib), isi (Lexical + blok), FAQ, sumber (judul, URL, penerbit, tanggal akses), gambar utama (≥1200px), video terkait, tools terkait, artikel terkait (manual + saran), SEO (keyphrase, keyphrase sekunder, judul SEO, meta, canonical, index/noindex, tipe schema), status, jadwal terbit, `diperbaruiBesar` (tanggal, diisi saat saklar "perubahan besar"), `pakaiDrafAi` (hanya-baca, dinyalakan Asisten AI) dan checklist `reviewAi` (sumber dicek, angka dicek, insight penulis ditambahkan; wajib saat terbit bila `pakaiDrafAi`), `briefAi` (brief terakhir, tersembunyi), riwayat versi |
| `pilar` | nama, slug, warna, deskripsi, intro halaman rubrik, SEO, urutan |
| `subkategori` | nama, slug, pilar induk, deskripsi |
| `tools` | nama, slug, pilar, kalkulator (`toolId` yang dipetakan ke modul `hitung`), label & bantuan input, artikel penjelasan (blok), FAQ, sumber aturan, SEO |
| `parameterTools` | `toolId`, kunci (mis. `ptkp-dasar`, `ter-a`), nilai (satu angka) atau tabel (baris: label, batas, nilai; untuk tarif berlapis dan daftar pilihan), berlaku mulai, berlaku sampai, sumber, catatan. Kunci dan bentuknya divalidasi modul `hitung` |
| `video` | judul, slug, media Cloudinary (9:16), poster, transkrip, takarir WebVTT (opsional, dilayani `/video/{slug}/takarir.vtt`), durasi, artikel induk, pilar, SEO |
| `penulis` | nama, slug, foto, bio, keahlian, tautan (LinkedIn dsb.), artikel |
| `halaman` | judul, slug, page builder (blok: hero, teks, kartu, CTA, FAQ, embed tool), SEO |
| `media` | publicId Cloudinary, jenis, lebar, tinggi, durasi, alt (wajib untuk gambar), caption, kredit |
| `redirect` | dari, ke, kode (301/410), dibuat otomatis/manual, jumlah hit |
| `log404` | path, jumlah, terakhir, referer |
| `antreanIndexing` | langkah, path, jenis, jadwal, percobaan, tahap cek status (satu baris per langkah dan path, dihapus setelah selesai; hanya ditulis modul `indexer`) |
| `logIndexing` | URL, jenis, langkah, adapter, status (Berhasil / Gagal, dicoba lagi / Gagal / Dilewati / Ditunda), status HTTP, pesan, percobaan ke, waktu; hanya admin yang membaca |
| `statusIndeks` | path, status (Terindeks / Ditemukan, belum dirayapi / Dirayapi, belum diindeks / Belum dikenal Google / Dikecualikan Google / Error / Belum dicek), cek berikutnya, cek terakhir, dirayapi Google, tautan laporan Search Console, detail; tampil juga sebagai kolom di daftar artikel |
| `analitikHalaman` | path, klik/impresi/CTR/posisi 28 hari, klik dan impresi 7 hari, tanggal data terakhir (diganti setiap sinkron; dibaca dashboard dan blok "Paling dicari") |
| `analitikSitus` | tanggal (waktu Pasifik), klik, impresi, CTR, posisi seluruh properti per hari (disimpan 16 bulan) |
| `tugasSeo` | jenis tugas harian (`analitik`, `tautan`), status, mulai, selesai, berikutnya, pesan |
| `temuanTautan` | jenis (tautan internal rusak / alamat lama / halaman yatim), tujuan, pesan, dokumen sumber (diganti setiap pindai) |
| `tautanLuar` | URL situs lain di konten terbit, status (belum dicek / bisa dibuka / rusak / perlu dicek manual), kode HTTP, pesan, dicek pada, cek berikutnya, dokumen sumber |
| `logAI` | waktu, pengguna, tugas (brief / draf / meta), artikel, ringkasan (keyword atau subjudul; teks masukan dan keluaran tidak disimpan), model, mode adapter, token masuk dan keluar, biaya perkiraan (US$), durasi, status (berjalan / berhasil / gagal / anggaran habis), pesan; disimpan 13 bulan, hanya admin yang membaca |
| `pemakaianAI` | bulan (waktu Jakarta), terpakai (US$, termasuk cadangan permintaan yang sedang berjalan); hanya ditulis modul `ai`, tampil di global `asistenAI` |
| `pengguna` | email, nama, peran (`admin`, `editor`; MVP hanya admin) |

### Global

| Global | Isi |
|---|---|
| `header` | logo, menu (pilar + tautan bebas), tombol Tools |
| `footer` | tautan, teks hak cipta, tautan sosial, saluran WhatsApp |
| `beranda` | urutan & isi blok homepage (hero, mozaik pilihan redaksi, strip video, paling dibaca, newsletter, slot iklan) |
| `pengaturanSEO` | nama situs, judul default, pola judul, meta default, gambar OG default, organisasi (logo, sameAs), kode verifikasi, robots.txt; grup Mesin Indexing: status pemasangan (mode adapter, akun layanan Google, `CRON_SECRET`, kunci IndexNow; rahasia tidak ditampilkan), IndexNow key, properti Search Console, batas cek status per hari (bawaan 1.000), saklar Indexing API (mati) dengan peringatan, batas Indexing API (bawaan 200). Kredensial Google hanya di env server |
| `iklan` | aktif (bawaan mati), penyedia (AdSense), ID penerbit (`ca-pub-` 16 angka), mode uji (`data-adtest`), slot (ID, posisi yang sekaligus menentukan jenis halaman: artikel tengah setelah paragraf ke-N, artikel akhir, rubrik, tools, beranda; ukuran tetap 300 x 250, 336 x 280, atau 320 x 100; unit `data-ad-slot`; aktif; satu slot aktif per posisi kecuali beranda), baris `ads.txt` tambahan (baris AdSense dibuat otomatis dari ID penerbit) |
| `asistenAI` | status pemasangan (mode adapter, kunci API terpasang atau belum, model per tugas dari env, pemakaian bulan ini), aktif, anggaran bulanan (US$, bawaan 10), harga per model (US$ per juta token), sumber resmi per pilar untuk brief, frasa klise tambahan untuk cek pola |
| `newsletter` | penyedia, teks form, tautan arsip |

Validasi: kotak Intinya wajib sebelum terbit; alt gambar wajib; gambar utama ≥1200px; panjang judul SEO dan meta di luar rentang hanya peringatan, tidak memblokir.

## 7. URL & routing

| Rute | Isi |
|---|---|
| `/` | beranda |
| `/{slug}` | artikel (semua tipe kecuali glosarium) |
| `/{pilar}` dan `/{pilar}/{subkategori}` | halaman rubrik; tulisan lebih lama di `/{pilar}/halaman/{n}` dan `/{pilar}/{subkategori}/halaman/{n}` (24 per halaman, `/halaman/1` dialihkan ke alamat rubrik) |
| `/tools` dan `/tools/{slug}` | indeks tools dan kalkulator |
| `/glosarium` dan `/glosarium/{slug}` | glosarium |
| `/video` dan `/video/{slug}` | video |
| `/penulis/{slug}` | profil penulis; tulisan lebih lama di `/penulis/{slug}/halaman/{n}` |
| `/cari` | pencarian (noindex) |
| `/tentang`, `/kebijakan-redaksi`, `/pedoman-media-siber`, `/pasang-iklan`, `/kontak` | halaman statis |
| `/sitemap.xml`, `/sitemap/{jenis}.xml`, `/news-sitemap.xml`, `/robots.txt`, `/feed.xml`, `/ads.txt`, `/{indexnow-key}.txt` | teknis |

Slug pilar, subkategori, dan halaman tidak boleh bentrok dengan slug artikel (divalidasi di CMS), dan slug `halaman` dicadangkan untuk paginasi. Halaman paginasi punya judul (", halaman N") dan canonical sendiri, tetap diindeks, tetapi tidak masuk sitemap dan tidak dikabarkan Mesin Indexing; setiap artikel sudah ada di sitemap (panduan paginasi Google: jangan jadikan halaman 1 canonical seluruh urutan). Mengganti slug membuat redirect 301 otomatis, termasuk `/{pilar}/{subkategori}` saat slug subkategori berganti, subkategori pindah pilar, atau slug pilar berganti.

## 8. SEO

### Panel SEO per artikel

1. Keyphrase utama dan sekunder.
2. Checklist (hijau/kuning, tidak memblokir): judul SEO 50-60 karakter; meta 150-160 karakter; keyphrase di H1, slug, dan 100 kata pertama; hierarki H2/H3 tanpa loncat; kotak Intinya terisi; 3-5 link internal; 2-3 sumber eksternal; semua gambar punya alt; rata-rata panjang kalimat; gambar utama ≥1200px.
3. Peringatan kanibalisasi: keyphrase yang sama atau sangat mirip sudah dipakai artikel lain (ditampilkan dengan tautan).
4. Saran link internal dari artikel sepilar dan keyphrase terkait.
5. Pratinjau hasil Google (desktop/HP) dan kartu sosial (WhatsApp, Facebook, X).
6. Canonical, index/noindex, tipe schema, saklar "perubahan besar".

### Tingkat situs

- Sitemap index per jenis (artikel, pilar, tools, video, penulis, halaman) dengan `lastmod` yang hanya berubah saat perubahan besar.
- News sitemap: artikel terbit 48 jam terakhir.
- `robots.txt` dari CMS, merujuk sitemap index.
- Meta `max-image-preview:large` di semua halaman konten.
- RSS `/feed.xml`.
- Breadcrumb tampil dan sebagai schema.
- JSON-LD: `Article`/`NewsArticle` (explainer), `BreadcrumbList`, `Organization` (+ logo), `Person` (penulis), `VideoObject`, `WebSite`, `WebApplication` untuk tools. FAQ tetap ditulis sebagai isi; rich result FAQ (dihapus Google Mei 2026) dan HowTo (dihapus 2023) tidak diandalkan.
- Halaman yatim (tanpa link masuk) dilaporkan di dashboard: artikel dan halaman terbit (tidak noindex) tanpa tautan dari isi dokumen terbit lain, relasi pilihan editor (artikel terkait, tools, video), menu header dan footer, atau pilihan beranda. Daftar otomatis (rubrik, tulisan terbaru, artikel terkait otomatis, sitemap) tidak dihitung karena isinya berganti. Dihitung pindai harian di cron.
- Pengecek link rusak: tautan internal dicocokkan dengan database setiap hari (dokumen terbit, halaman indeks, redirect; tautan ke alamat lama yang dialihkan ikut dilaporkan); tautan ke situs lain dicek seminggu sekali (HEAD, GET bila HEAD ditolak, batas 10 detik, paling banyak 10 URL per jalan cron). 404 dan 410 atau domain hilang berarti rusak; kode lain dan batas waktu "perlu dicek manual".
- Log 404 dengan tombol "buat redirect" (form redirect dengan path terisi). Beacon pencatatnya dibatasi tanpa menyimpan IP: isian paling besar 2 KB, hanya dari halaman situs sendiri, paling banyak 200 path baru per 24 jam; batas laju per IP lewat aturan rate limit Vercel Firewall.

### Mesin Indexing

Pemicu: `terbit`, `ubah-besar`, `hapus` (artikel, tools, video, halaman, pilar), ditambah `pindah` untuk path lama saat slug berganti (path itu kini dialihkan, jadi tidak dikabarkan ke Indexing API). Perubahan besar artikel ditandai saklar "perubahan besar"; koleksi lain dikabarkan saat terbit, pindah, dan dihapus. Perubahan parameter kalkulator dikabarkan sebagai perubahan besar halaman tools yang memakainya. Dokumen noindex dianggap tidak publik.

| Langkah | Detail |
|---|---|
| 1. Revalidasi | `revalidateTag` halaman, rubrik, beranda, sitemap |
| 2. Search Console | `sitemaps.submit` untuk sitemap index, maksimal sekali per 30 menit sejak kiriman berhasil terakhir (kabar di antaranya menunggu dan tergabung) |
| 3. IndexNow | POST daftar URL ke `api.indexnow.org` dengan key dari CMS dan file `/{key}.txt`, satu POST untuk semua URL yang antre, maksimal sekali per 5 menit |
| 4. Google Indexing API (opsional) | hanya jika saklar aktif; `URL_UPDATED`/`URL_DELETED`; berhenti saat kuota harian (dari CMS, default 200) tercapai; banner peringatan bahwa penggunaan untuk artikel di luar ketentuan Google |
| 5. Cek status | URL Inspection API pada +6 jam, +24 jam, +3 hari, +7 hari, +14 hari, +30 hari (dua tahap terakhir keputusan pemilik 2026-11-05, karena domain baru sering belum dikenal Google lebih dari seminggu); berhenti saat Terindeks; cek di atas batas harian (CMS, bawaan 1.000 dari kuota Google 2.000 per properti) ditunda ke hari berikutnya. Tombol "Cek sekarang" di daftar Status indeks (hanya admin) memajukan cek satu URL lewat antrean, dibatasi kuota harian yang sama dan jeda 10 menit per URL |
| 6. Log | setiap langkah ke `logIndexing` |

Kegagalan: retry 3 kali dengan jeda 1, 5, 30 menit; setelah itu status Gagal di log (cek status: status indeks Error) dan peringatan di dashboard. Kuota Google habis (429): ditunda ke awal hari kuota berikutnya (tengah malam waktu Pasifik). Penghapusan dan batal terbit: URL keluar dari sitemap, halaman menjawab 404, atau 308 ke tujuan bila ada redirect (keputusan pemilik di Rencana 4A: redirect lewat `permanentRedirect()`, kode 410 di CMS menjawab 404), IndexNow tetap dikabari, dan `URL_DELETED` bila Indexing API aktif.

Antrean ada di Postgres. Vercel Cron memanggil `GET /api/jobs/run` (header `Authorization: Bearer CRON_SECRET`) sesuai jadwal di `vercel.json`; endpoint itu juga menjalankan job Payload yang jatuh tempo (jadwal terbit artikel). Saat konten terbit, antrean langsung dijalankan lewat `after()`. Lokal tanpa Vercel: `pnpm indexer`. Adapter dipilih env `INDEXER_ADAPTER` (`asli` di produksi, `palsu` di pratinjau, lokal, dan tes).

Prasyarat: properti domain `point.lat` di Search Console; akun layanan Google Cloud dengan Search Console API aktif (Indexing API hanya bila saklarnya kelak dipakai), ditambahkan sebagai **Owner** properti. Kredensial disimpan di env Vercel (`GOOGLE_SERVICE_ACCOUNT_JSON`), tanpa pustaka Google: token akses dari JWT RS256 akun layanan.

### Dashboard SEO (di admin)

View admin `/admin/seo` dengan tautan di atas menu, hanya untuk admin: klik, impresi, CTR, dan posisi 28 hari (kartu angka dan grafik klik harian dengan tabel angkanya), halaman teratas per URL (Search Analytics API `searchanalytics.query`, data final, disinkron sekali sehari; data Google baru final 2 sampai 3 hari kemudian); ringkasan status indeks; log indexing terbaru dan jumlah langkah gagal 7 hari; tautan rusak; halaman yatim; 404 teratas dengan tombol "buat redirect"; status setiap tugas harian, dengan tombol "Pindai ulang sekarang" untuk pindai tautan (jeda 10 menit sejak pindai terakhir dimulai). Tanpa data (akun layanan belum diatur, adapter palsu, domain baru) dan saat sinkron gagal, setiap bagian menjelaskan sebabnya. Fase 2: daftar "perlu diperbarui" berdasarkan penurunan klik.

## 9. Media: Cloudinary

- Upload dari admin langsung ke Cloudinary (signed upload, tanda tangan dari endpoint server). File tidak melewati server Vercel, sehingga batas upload server sekitar 4,5 MB tidak berlaku.
- Upload preset dengan incoming transformation: gambar dibatasi lebar maksimal 2560px, `q_auto`; video dibatasi resolusi dan bitrate wajar.
- Folder Cloudinary per jenis (`point/artikel`, `point/video`, `point/penulis`, `point/og`).
- Pengiriman gambar: `f_auto,q_auto`, `srcset` responsif lewat image loader Next.js khusus Cloudinary, `width`/`height` selalu diisi untuk mencegah CLS, gambar di bawah lipatan lazy.
- Video: adaptive streaming (HLS) dan poster otomatis dari frame.
- Gambar OG otomatis: transformasi teks Cloudinary (latar warna pilar, judul Archivo, logo), dipakai bila editor tidak mengunggah gambar OG.
- Adapter: modul `media` sendiri di atas `@payloadcms/plugin-cloud-storage` (antarmuka `GeneratedAdapter`). Plugin Cloudinary komunitas dinilai saat build; dipakai hanya jika aktif dirawat dan mendukung signed client upload.
- Kredensial (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) hanya di env server.

## 10. Asisten AI

Tugas (sidebar "Asisten AI" di editor artikel):

1. **Brief dari keyword:** search intent, format yang cocok, outline H2/H3, pertanyaan yang sering dicari, saran link internal dari database point, daftar sumber resmi yang wajib dicek. Mengikuti template brief skill seo-content-brief. Claude tidak bisa membuka Google, jadi brief memisahkan perkiraan Claude (intent, format, outline, pertanyaan, sudut pembeda, hal yang perlu dicek) dari data point. (artikel yang sudah memakai keyword itu, saran link internal panel SEO, sumber resmi per pilar dari global `asistenAI`, panjang acuan per format), ditambah langkah cek manual hasil teratas Google. Brief tersimpan bersama draf artikel.
2. **Draf per bagian:** satu H2 per permintaan, berdasarkan brief dan catatan penulis. Angka, tarif, dan tanggal hanya dari catatan penulis; selain itu ditandai `[cek angka]`. Draf disalin (HTML dan teks) ke editor isi, tidak disisipkan otomatis.
3. **Generator meta:** judul SEO, meta description, slug, alt gambar, kotak Intinya, FAQ. Setiap isian diterapkan lewat tombolnya sendiri dan bisa dibatalkan; alt gambar disalin (Claude tidak melihat gambarnya).
4. **Cek pola tulisan AI:** berdasarkan skill humanizer, disesuaikan bahasa Indonesia. Menandai klise ("Di era digital ini", "Tak hanya itu", "Mari kita bahas", "Kesimpulannya", "sangat penting untuk"), em/en dash, pola "bukan hanya X, tetapi Y", pola "serba tiga", kesimpulan generik, kalimat seragam panjangnya, per kalimat atau paragraf dengan alasannya. Daftar frasa bisa ditambah dari global `asistenAI`. Berjalan di browser tanpa API dan tanpa biaya.
5. **Cek klaim:** menandai kalimat berangka (persen, rupiah, jumlah, tanggal) atau beratribusi ("menurut", "penelitian") yang tidak bertaut dan tidak menyebut sumber di blok sumber, termasuk atribusi kabur ("para ahli"). Tanpa API: model tidak bisa membuka sumber, jadi kebenaran angka tetap diperiksa editor.

Model bawaan: brief dan draf `claude-sonnet-5-5`, generator meta `claude-haiku-5-5`; diubah lewat env `AI_MODEL` atau `AI_MODEL_{BRIEF,DRAF,META}`.

Fase 2: naskah video 45 detik + daftar shot (bahan untuk huashu-art-motion / remotion).

Pengaman:
- AI hanya memberi saran ke editor; tidak punya akses menerbitkan.
- Artikel yang memakai draf AI (menyalin draf bagian, menerapkan Intinya atau FAQ) wajib mencentang checklist review manusia (sumber dicek, angka dicek, insight/pengalaman penulis ditambahkan) sebelum tombol Terbitkan aktif. Validasinya juga berlaku untuk terbit massal dan terjadwal, dan tanda "memakai draf AI" yang sudah tersimpan tidak bisa dimatikan lewat form, API, atau update massal.
- Anggaran bulanan (US$, direset awal bulan waktu Jakarta) dihitung dari token setiap panggilan dikali harga per model di global `asistenAI`. Biaya maksimal permintaan dicadangkan sebelum Claude dipanggil, jadi anggaran tidak terlewati walau permintaan berjalan bersamaan. Saat habis, tombol AI nonaktif dengan pesan jelas; cek pola dan cek klaim tetap bisa dipakai.
- Semua pemanggilan dicatat di `logAI`; paling banyak 6 permintaan per menit per pengguna.
- Sidebar menyebut bahwa tombol AI mengirim teks yang dibutuhkan tugasnya ke Claude (Anthropic), dan meminta editor tidak menulis data pribadi di catatan penulis.
- Kunci API dan nama model di env server (`ANTHROPIC_API_KEY`, `AI_ADAPTER`, `AI_MODEL*`).

## 11. Iklan & privasi

- Slot dikelola dari global `iklan`; komponen `SlotIklan` memesan lebar dan tinggi sesuai ukuran tetap slot (CLS 0) dengan label "Advertisements" (keputusan pemilik: kebijakan penempatan AdSense hanya mengizinkan "Advertisements" atau "Sponsored links"; ditandai bahasa Inggris untuk pembaca layar), dan skrip AdSense dimuat setelah halaman interaktif, setelah pengunjung memilih "Izinkan semua", dan saat slot hampir terlihat. Unit yang tidak terisi tetap berukuran sama (tidak diciutkan).
- Posisi: artikel (setelah paragraf ke-N di tingkat atas isi, bila masih ada dua paragraf sesudahnya, dan setelah isi sebelum sumber dan FAQ), rubrik (setelah daftar tulisan), tools (setelah penjelasan, di luar kalkulator), dan beranda (blok Slot iklan).
- Banner persetujuan cookie (UU PDP No. 27/2022) di atas header, di dalam alur halaman (tidak menutupi isi): pilihan "Hanya yang perlu" dan "Izinkan semua", setara dan sejajar, dengan tautan Kebijakan Privasi. "Hanya yang perlu" berarti iklan tidak dimuat sama sekali (iklan non-personalisasi AdSense tetap memakai cookie untuk pembatasan frekuensi). Pilihan disimpan di cookie pihak pertama berversi dan bertanggal selama 12 bulan, dibaca di browser (halaman tetap statis), dan bisa diubah atau ditarik lewat "Pengaturan cookie" di footer; menarik persetujuan menghapus cookie iklan di domain situs dan memuat ulang halaman.
- Google Consent Mode v2: keempat sinyal ditolak sebelum skrip iklan apa pun; "Izinkan semua" membuka sinyal iklan (`ad_storage`, `ad_user_data`, `ad_personalization`), `analytics_storage` tetap ditolak selama situs tanpa alat analitik.
- Pengunjung EEA, Inggris, dan Swiss: iklan personalisasi di sana mensyaratkan CMP bersertifikat Google (TCF); pemilik memakai pesan European regulations di AdSense, Privacy & messaging.
- Tidak ada iklan di dalam kotak Intinya, di atas H1, atau di dalam kalkulator.
- `ads.txt` dari CMS: baris AdSense dari ID penerbit dan baris tambahan, 404 bila kosong.
- Halaman Kebijakan Privasi (teks hukum ditulis pemilik). Keputusan pemilik: saklar "Tampilkan iklan" ditolak selama halaman itu belum terbit, dan bila halaman itu ditarik dari terbit, banner, slot, dan skrip iklan berhenti tampil, jadi tautan banner tidak pernah mengarah ke halaman kosong.

## 12. Performa

| Anggaran | Nilai |
|---|---|
| LCP | < 2,5 dtk (uji lab HP, 4G lambat) |
| INP | < 200 ms |
| CLS | < 0,1 |
| JS klien setiap jenis halaman | Total < 160 KiB gzip, beranda tidak melebihi artikel, dan JS milik point. di luar kerangka Next/React < 25 KB (tanpa skrip iklan). Diubah pemilik 2026-11-04 dari < 70 KB, karena kerangka Next 16 + React 19 saja sudah 139,5 KB. Dijaga tes E2E `motion.spec.ts`. |
| Font | 1 file variable Archivo subset, `font-display: swap`, preload satu file |
| Gambar hero | prioritas tinggi, ukuran tepat, AVIF/WebP |

Lighthouse CI menolak build bila skor Performance HP < 90 di halaman contoh (beranda, artikel, tools). Dijalankan Rencana 8C di job E2E GitHub Actions (`lighthouserc.json`): beranda, artikel, rubrik, dan tools, median 3 kali, data E2E tanpa gambar Cloudinary dan iklan; skor < 90, CLS > 0,1, atau TBT > 200 ms menggagalkan CI, LCP > 2,5 dtk diperingatkan (LCP halaman pertama kunjungan adalah teks banner persetujuan; lihat §19).

## 13. Motion

- Kurva khas: `cubic-bezier(0.2, 0, 0, 1)` untuk 80% animasi; keluar memakai `cubic-bezier(0.3, 0, 1, 1)`.
- Durasi: 150 ms (hover, tekan), 250 ms (kartu, panel), 400 ms (perpindahan halaman).
- Masuk kartu: naik 12px + opacity, berurutan 40 ms, total < 300 ms, hanya sekali saat pertama terlihat.
- Perpindahan halaman: View Transitions API (CSS), elemen bersama untuk kartu → judul artikel.
- Reveal judul raksasa beranda: animasi CSS per kata (naik 0,3em + opacity, 400 ms, berurutan 80 ms), tanpa JavaScript, judul tampil di paint pertama. Diubah pemilik 2026-11-05 dari GSAP, karena GSAP membuat JS beranda 168,6 KiB (di atas anggaran §12) dan membuat judul menunggu skrip atau berkedip.
- Angka hasil kalkulator: animasi CSS saat hasil baru muncul (naik 0,3em + opacity, 250 ms), tanpa JavaScript animasi; hasil contoh dari server tidak dianimasikan. Diputuskan Rencana 5, karena GSAP (27,5 KB gzip) saja sudah melewati anggaran JS milik point. 25 KB, sedangkan kalkulator dan modul `hitung` sudah sekitar 13 KB.
- Tidak ada animasi berjalan terus (ambient). Hanya `transform` dan `opacity`.
- `prefers-reduced-motion: reduce` mematikan semua animasi dan View Transitions; konten tetap utuh.

## 14. Aksesibilitas

WCAG 2.2 AA: kontras sesuai §4, fokus terlihat (`:focus-visible`, ring 2px ink + offset), skip link, urutan heading berurutan, label terlihat di semua input, pesan error di bawah field dengan `aria-live`, target sentuh ≥44px, ikon tanpa teks memakai `aria-label`, `lang="id"`, tidak ada informasi yang hanya disampaikan warna.

## 15. Error handling

| Situasi | Perilaku |
|---|---|
| Validasi CMS gagal | pesan di field terkait, terbit diblokir hanya untuk aturan wajib |
| Langkah indexing gagal | retry backoff, lalu status Error + peringatan dashboard; publikasi tetap berhasil |
| Kuota Google habis | job ditunda ke hari berikutnya, dicatat |
| Upload Cloudinary gagal | pesan di dialog upload dengan tombol ulangi; dokumen tidak menyimpan media rusak |
| Input kalkulator tidak valid | pesan di bawah field (penyebab + cara memperbaiki), fokus ke field pertama yang salah |
| Parameter tools tidak ada untuk tanggal | kalkulator menampilkan pesan dan memakai parameter terakhir yang valid, dicatat |
| AI gagal / anggaran habis | pesan jelas di sidebar, editor tetap bisa menulis |
| 404 | halaman 404 dengan pencarian dan artikel populer, dicatat di `log404` |
| 500 | halaman error statis; error dikirim ke log Vercel |
| Database | backup harian Supabase Pro (7 hari) + GitHub Actions mingguan: `pg_dump` skema `public` lewat session pooler dengan role baca saja, dienkripsi ke kunci publik GPG pemilik, disimpan sebagai artifact privat repo 90 hari; runbook pemulihan `docs/operasional/pemulihan-database.md`. Diubah Rencana 8C dari bucket Supabase Storage: backup di proyek yang sama ikut hilang bila proyek dihapus, dan unggah ke Storage butuh kunci service role |

## 16. Testing & verifikasi

- **Unit:** `hitung` diuji dengan contoh perhitungan dari sumber resmi untuk setiap tool dan tanggal berlaku; `seo` (metadata, JSON-LD, checklist) dengan snapshot; `indexer` dengan adapter palsu (dedup, debounce, retry, kuota, urutan cek status); `media.url` untuk setiap preset.
- **Integrasi:** hook Payload memicu revalidasi dan job; validasi koleksi.
- **E2E (Playwright):** buat artikel → terbitkan → URL ada di sitemap dan news sitemap → log indexing tercatat; ganti slug → redirect 301 bekerja; kalkulator gaji menghasilkan angka contoh resmi; banner persetujuan menahan iklan.
- **Kualitas:** Lighthouse CI (§12), axe untuk aksesibilitas, skrip design-audit (tanpa temuan Critical), uji layar 375 / 768 / 1440 dan reduced motion.
- **CI:** GitHub Actions setiap push ke `master` dan pull request: type check, lint, unit, migrasi sesuai skema, integrasi (Postgres 16), migrasi di database kosong lalu build, E2E, dan Lighthouse, tanpa rahasia produksi (Rencana 8C).

## 17. Cakupan

**MVP:** semua koleksi & global di §6; beranda, rubrik, artikel (4 tipe), tools (6), glosarium, penulis, pencarian, halaman statis; panel & dashboard SEO; Mesin Indexing; Cloudinary; asisten AI tugas 1-5; iklan + persetujuan; newsletter form (penyedia eksternal); RSS.

**Fase 2:** pipeline video explainer (naskah AI → huashu-art-motion/remotion → Cloudinary); newsletter otomatis dari artikel pilihan; deteksi artikel menurun; dashboard analitik lanjutan; mode gelap; peran editor/penulis tambahan.

**Di luar cakupan:** akun pembaca, komentar, forum, multi-bahasa, aplikasi mobile, paywall.

## 18. Setup dari pemilik

1. Akun Vercel (paket Pro) dan hubungkan domain `point.lat` (DNS).
2. Proyek Supabase (region Singapura untuk latensi Indonesia) dan repo GitHub untuk kode + backup mingguan.
3. Akun Cloudinary: cloud name, API key, API secret.
4. Google Search Console: properti domain `point.lat` (verifikasi DNS).
5. Google Cloud: proyek, aktifkan Search Console API (dan Indexing API bila nanti dipakai), akun layanan dengan kunci JSON, tambahkan email akun layanan (`client_email`) sebagai Owner di Search Console.
6. Env Vercel untuk Mesin Indexing: `INDEXER_ADAPTER=asli` (Production) dan `palsu` (Preview), `GOOGLE_SERVICE_ACCOUNT_JSON` berisi seluruh file kunci JSON (Production saja), `CRON_SECRET` acak minimal 16 karakter. Kunci IndexNow diisi di Pengaturan SEO; status pemasangan tampil di halaman yang sama.
7. Kunci Claude API: env Vercel `AI_ADAPTER=asli` dan `ANTHROPIC_API_KEY` (Production), `AI_ADAPTER=palsu` (Preview). Anggaran bulanan, harga per model, dan sumber resmi per pilar di Pengaturan, Asisten AI.
8. Akun AdSense (setelah konten cukup): ID penerbit dan unit iklan display berukuran tetap di global Iklan, pesan European regulations di Privacy & messaging, Kebijakan Privasi terbit sebelum iklan dinyalakan. Penyedia newsletter.
9. Database pratinjau: proyek Supabase kedua di organisasi Free terpisah (Singapura), env Preview Vercel menunjuk ke sana. Data API Supabase dimatikan di kedua proyek.
10. Backup mingguan: kunci GPG khusus cadangan (kunci rahasia di pengelola password), role baca saja `cadangan_baca`, dan secret GitHub Actions `BACKUP_DATABASE_URL` dan `BACKUP_KUNCI_PUBLIK` (runbook pemulihan).

## 19. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Biaya Vercel Pro wajib sejak live (Hobby non-komersial, cron harian) | Pro dipakai sejak domain live; pengembangan awal boleh di Hobby tanpa iklan dan tanpa cron |
| Payload diakuisisi Figma (Juni 2025), arah jangka panjang belum pasti | lisensi MIT, data di Postgres sendiri, logika bisnis di modul terpisah dari Payload |
| Konten AI dianggap spam oleh Google | AI hanya membantu, checklist review manusia wajib, pengalaman/sumber nyata |
| Aturan pajak/BPJS berubah | parameter bertanggal di CMS, sumber dicatat, tes dengan contoh resmi |
| Empat pilar YMYL sekaligus memperlambat otoritas | fokus 60-90 hari pertama di dua pilar |
| Indexing lambat untuk domain baru | sitemap bersih, link internal kuat, distribusi (WhatsApp, newsletter), konten berkualitas; status dipantau |
| Biaya Cloudinary/Claude API naik | incoming transformation, preset terbatas, anggaran AI bulanan, pantau pemakaian |
| Cold start admin di serverless | halaman publik tetap statis; admin hanya dipakai pemilik |
| LCP lab HP kunjungan pertama di sekitar 2,5 dtk (artikel median 2,6 dtk di probe Rencana 8C): elemen LCP adalah teks banner persetujuan, dan font Archivo 90 KB ikut dimuat sebelum paint pertama | Lighthouse CI memperingatkan LCP > 2,5 dtk; font hanya sumbu `wght` (35 KB) menurunkannya ke 2,45 dtk tetapi menghilangkan judul ramping (`font-stretch`); font yang dipangkas ke rentang `wdth` yang dipakai menunggu keputusan pemilik |
| Database pratinjau di organisasi Free dijeda setelah 7 hari sepi | build pratinjau gagal sampai proyek dilanjutkan dari dashboard (data tetap ada 90 hari) |

## 20. Skill per tahap

| Tahap | Skill |
|---|---|
| Spesifikasi & rencana | writing-plans, codebase-design, context-engineering |
| Design system & UI | design:design-system, ui-ux-pro-max, ui-styling, theme-factory, design-an-interface, landing-page-design, magic-ui, css-native, frontend-design |
| Build | executing-plans, ponytail, gsap, gsap-core, gsap-performance, motion-design, data:build-dashboard |
| Konten | seo-content-brief, technical-blog-writing, humanizer, design:ux-copy, copywriting, writing-skills, skill-creator (skill penulisan khas point) |
| Review | design-audit, design:design-critique, code-review |
| Video (Fase 2) | huashu-art-motion, remotion-render |

Catatan: skill `/design` hanya bisa dijalankan langsung oleh pemilik.

## Sumber riset

- Google Indexing API: https://developers.google.com/search/apis/indexing-api
- IndexNow & Google: https://www.searchbloom.com/ai-seo/inclusion/indexnow/
- Ping sitemap dihentikan, aturan lastmod: https://searchengineland.com/google-to-deprecate-sitemaps-ping-endpoint-later-this-year-428661
- FAQ rich results dihapus: https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/
- HowTo rich results dihapus: https://www.searchenginejournal.com/google-completely-removes-how-to-rich-results/496479/
- Payload 2026: https://techsy.io/fi/blog/payload-cms-2026-why-figma-bought-it-and-should-you-adopt-it
- Payload storage adapters: https://payloadcms.com/docs/v3/upload/storage-adapters
- Vercel cron limits: https://vercel.com/docs/cron-jobs/usage-and-pricing
