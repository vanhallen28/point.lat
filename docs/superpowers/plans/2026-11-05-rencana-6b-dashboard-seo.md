# Rencana 6B: Dashboard SEO point.lat (Search Analytics harian, Paling dibaca, tautan rusak, halaman yatim, 404, dan redirect subkategori)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Melengkapi spesifikasi §8 "Tingkat situs" dan "Dashboard SEO": klik, impresi, CTR, dan posisi per URL dari Search Analytics yang disinkron sekali sehari lewat cron yang sudah ada, dashboard SEO di admin (`/admin/seo`) dengan ringkasan status indeks, log indexing terbaru, tautan rusak, halaman yatim, dan 404 teratas dengan tombol "Buat redirect", blok "Paling dibaca pekan ini" di beranda dan artikel populer di halaman 404 dari klik Google 7 hari, dan redirect otomatis `/{pilar}/{subkategori}`; tanpa jaringan di tes, tanpa dependensi baru, dan tanpa menambah JavaScript halaman publik.

**Architecture:** Modul baru `src/modules/pantau` dengan antarmuka kecil: `jalankanPantau(payload, { sekarang, adapter, tugas })` (dipanggil cron `GET /api/jobs/run` setelah Mesin Indexing) dan `ambilDashboard(payload)` (dibaca view admin). Di dalamnya: aturan murni (`aturan.ts`: tanggal waktu Pasifik, ringkasan klik dan posisi tertimbang, jadwal tugas, arti jawaban pemeriksa tautan), tautan di konten (`tautan.ts`, murni), sinkron Search Analytics (`analitik.ts`), pindai tautan dan pemeriksa tautan luar (`pindai.ts`), klaim tugas atomik (`tugas.ts`), dan seam adapter (`adapter.ts`) dengan dua adapter: `asli.ts` (`fetch`, token akun layanan dari `indexer/google.ts`) dan `palsu.ts` (dalam memori). Data di lima koleksi tersembunyi yang hanya ditulis modul ini; dashboard adalah UI-nya. Modul konten membaca `analitik-halaman` untuk "Paling dibaca pekan ini" (tag cache `analitik`, dibuang setiap sinkron). Redirect subkategori memakai `terapkanRedirect` yang diekstrak dari `redirectSaatPathBerubah`.

**Tech Stack:** Next.js 16.3.3 (App Router, `unstable_cache`, `revalidateTag`), Payload 3.92.1 (koleksi `admin.hidden`, view admin kustom `admin.components.views` dibungkus `DefaultTemplate` dari `@payloadcms/next/templates`, `beforeNavLinks`, sel kolom `ui`, `defaultValue({ req })` dengan `req.query`, `payload.db` untuk transaksi dan hapus massal), PostgreSQL 16 (`INSERT ... ON CONFLICT DO NOTHING` dan `UPDATE ... RETURNING` lewat `sql` dari `@payloadcms/db-postgres`), `fetch` dan `AbortSignal.timeout`, `Intl` id-ID dan `America/Los_Angeles`, Vitest 4, Playwright 1.63 + `@axe-core/playwright` 4.14, pnpm 10, Node 22.23.4+.

**Spesifikasi:** `docs/superpowers/specs/2026-11-03-point-lat-design.md` (§4 beranda "Paling dibaca pekan ini"; §5 Penjadwal (sinkron Search Analytics harian, cek link rusak mingguan) dan tabel modul; §6 koleksi; §7 redirect 301 saat slug berganti; §8 Tingkat situs (halaman yatim, link rusak mingguan, log 404 dengan tombol "buat redirect") dan Dashboard SEO; §12 anggaran JS; §14 aksesibilitas; §15 404 dengan artikel populer; §16 testing; §17 cakupan; §19 risiko).

**Rencana sebelumnya:** `docs/superpowers/plans/2026-11-04-rencana-1-fondasi.md` sampai `docs/superpowers/plans/2026-11-05-rencana-6a-indexing.md`, ditambah dua commit setelah Rencana 6A (sampai `7b4c1e8`): perbaikan `kabari` bergiliran per `req` dengan `INSERT ... ON CONFLICT DO NOTHING` di sesi transaksi (tes `indexer-bersamaan.int.spec.ts`), dan tahap cek status +14 dan +30 hari (`JADWAL_CEK_MS` enam tahap, keputusan pemilik). Rencana ini memakai `pathFor()` (Rencana 1), `rencanaRedirect` dan `redirectSaatPathBerubah` (Rencana 1), `revalidasi()` dan `TAG` (Rencana 3), `tautanIsi` (Rencana 3, `src/modules/seo/lexical.ts`), modul konten, `log-404`, dan `redirect` (Rencana 4A dan 4B), serta `indexer/google.ts`, `galatGoogle`, `ambilPengaturanIndexing`, `besokPasifik`, dan cron `jalankanJadwal` (Rencana 6A). Baseline: 383 tes unit di 56 file, 98 tes integrasi di 32 file, 91 tes E2E.

## Dependensi baru (butuh persetujuan pemilik)

**Rencana ini tidak menambah dependensi.** Search Analytics cukup satu `fetch` dengan token akun layanan yang sudah ada (Rencana 6A); pemeriksa tautan memakai `fetch` bawaan Node; grafik dashboard adalah HTML dan CSS biasa.

| Paket | Keputusan rencana ini |
|---|---|
| `googleapis`, `@googleapis/searchconsole`, `google-auth-library` | **Tidak dipasang**, alasan sama dengan Rencana 6A: satu endpoint tambahan (`searchanalytics.query`) cukup lewat `fetch`. |
| Pustaka grafik (`recharts`, `chart.js`, `d3`) | **Tidak dipasang.** Dashboard hanya butuh satu grafik kolom satu seri; HTML dan CSS server component tanpa JavaScript, teks sumbu tetap terbaca di 375 px, dan tabel angkanya selalu tersedia. |
| Pemeriksa tautan (`linkinator`, `broken-link-checker`) | **Tidak dipasang.** Keduanya merayapi situs lewat HTTP; rencana ini membaca tautan langsung dari database (isi Lexical, menu, relasi) dan hanya membuka URL situs lain. |

## Global Constraints

- Node `^22.23.4 || >=24.22.1`, pnpm 10. Versi dikunci: Next `16.3.3`, Payload `3.92.1`, `@playwright/test` `1.63.0`. **Tanpa dependensi baru.**
- Nama domain berbahasa Indonesia (`jalankanPantau`, `ambilDashboard`, `pindaiTautan`, `analitik-halaman`, `tautan-luar`). Nama field API luar tetap seperti aslinya (`startDate`, `rowLimit`, `startRow`, `dataState`, `clicks`, `impressions`, `ctr`, `position`).
- Copy admin dan publik: bahasa Indonesia, sapaan "kamu" bila menyapa, tanpa em dash dan en dash (juga di komentar), tanpa tanda seru. Pesan galat dan keadaan kosong menyebut penyebab dan langkah berikutnya. Angka lewat `Intl.NumberFormat('id-ID')`; angka ringkas `Intl` memakai spasi tak putus, jadi di kode dan tes tulis `\u00a0`, jangan karakter aslinya.
- **Tes tidak pernah memanggil jaringan.** Unit memakai `fetch` tiruan; integrasi dan E2E memakai adapter palsu (`adapterPalsu()` dari `@/modules/pantau`, `INDEXER_ADAPTER=palsu` di server E2E). Waktu di tes selalu lewat opsi `sekarang`.
- Kredensial tetap hanya di env server (`GOOGLE_SERVICE_ACCOUNT_JSON`, `CRON_SECRET`, `INDEXER_ADAPTER`); dashboard hanya menampilkan pesan status, tidak pernah isi rahasia.
- Path publik lewat `pathFor()`, path admin lewat `urlAdmin` (`src/lib/admin.ts`, Task 6). Jangan merangkai URL manual.
- **Perubahan skema harus aditif.** Rencana ini menambah lima koleksi (`analitik-halaman`, `analitik-situs`, `tugas-seo`, `temuan-tautan`, `tautan-luar`) tanpa mengubah kolom tabel lama; field `ui` dan `defaultValue` tidak mengubah tabel. Setelah mengubah field: `pnpm generate:types`, lalu `pnpm seed` sebelum `pnpm build` (build membaca database dev). Bila Payload macet di "Pulling schema from database..." (pertanyaan DATA LOSS), jangan menjawab; reset database yang bersangkutan seperti Rencana 2 (`DROP DATABASE ... WITH (FORCE)` lalu `CREATE DATABASE`).
- **Operasi massal.** Hapus dan update massal Payload menjalankan hook setiap dokumen secara paralel dalam satu transaksi. Setiap koleksi baru dengan kunci unik dan setiap hook baru yang menulis ke tabel dengan kunci unik diuji dengan update massal dan hapus massal dua dokumen atau lebih dalam satu operasi.
- `pnpm build` membaca database dev (`pointlat` dari `.env`). Postgres harus jalan (`pg_ctlcluster 16 main start` bila mati).
- Tes unit dan integrasi memakai `.env.test` (database `pointlat_test`). E2E memakai `pointlat_test_e2e` (dibuat dan diisi ulang `tests/e2e/siapkan.ts`), build produksi di port 3100, kredensial Cloudinary palsu `e2e`, dan `INDEXER_ADAPTER=palsu`. E2E menjalankan `next build` sendiri sehingga isi `.next/` diganti; setelah E2E, jalankan `pnpm build` lagi sebelum `pnpm start` biasa.
- Server manual memakai port 3200 dan dihentikan dengan `fuser -k 3200/tcp`, jangan `pkill -f` dengan pola luas. Menunggu server: `timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'`. Jangan meninggalkan proses latar belakang setelah task selesai.
- `next dev` dan `next build` di Next 16.3 bisa menambahkan blok "nextjs-agent-rules" ke `CLAUDE.md`. Periksa `git status` sebelum commit; buang blok itu dengan `git checkout CLAUDE.md` (Task 10 sengaja mengubah `CLAUDE.md`; di task itu buang blok itu saja).
- Jalankan `pnpm typecheck` dan `pnpm lint` di setiap task; keduanya harus bersih (tanpa error dan tanpa warning). Setiap task diakhiri unit, integrasi, dan E2E yang hijau. Keluaran tes integrasi ditulis ke file log dan dibaca utuh (jangan disaring `tail`), supaya pertanyaan DATA LOSS tidak tersembunyi.
- **Tulis `req.context` setelah `await`** (Rencana 6A): simpan hasil operasi Payload ke variabel dulu, lalu tulis ke `req.context`.
- Tes integrasi berbagi database dan berjalan berurutan dengan urutan file yang tidak pasti. Tes Pantau SEO mengosongkan koleksi pantau yang dipakainya lebih dulu, dan membatasi `jalankanPantau` ke tugas yang diuji (opsi `tugas`).
- **Kegagalan E2E halaman 404 yang jarang (warisan Rencana 4A).** Tes yang membuka `/halaman-yang-tidak-ada` (`galat.spec.ts` "halaman 404 ... lolos axe" dan `motion.spec.ts` "kartu ke artikel memakai View Transitions") sesekali gagal dengan `locator resolved to <html id="__next_error__">` atau atribut `lang` kosong karena isi 404 tidak dirender di browser. Bila salah satu tes itu gagal dengan pesan tersebut, jalankan `pnpm test:e2e` sekali lagi; bila gagal lagi, atau tes lain yang gagal, berhenti dan laporkan. Jangan menaikkan timeout atau melemahkan tesnya.
- Next 16.3.3 kadang mengirim header `Location` dua kali pada redirect pertama sebuah path ISR (`/a, /a`); tes redirect memakai `toContain`, bukan `toBe`.

## Keputusan teknis (hasil riset dan probe, dipakai di semua task)

| Topik | Keputusan | Dasar |
|---|---|---|
| Batas rencana | 10 task: Search Analytics, Paling dibaca, pindai tautan, 404 dan "Buat redirect", dashboard (data dan view), redirect subkategori, dokumen. Paginasi berbasis path dan tombol "Cek sekarang" ditunda (lihat "Cakupan yang ditunda"). | Patokan 10 sampai 12 task sehat; urutan prioritas tugas. Paginasi saja butuh dua task (lima jenis halaman, rute, canonical, sitemap) dan belum dibutuhkan sebelum satu rubrik melewati 24 tulisan. |
| Modul | Modul baru `src/modules/pantau`, bukan perluasan `indexer`. Antarmuka: `jalankanPantau()` (cron) dan `ambilDashboard()` (admin); konten hanya membaca koleksi `analitik-halaman`. Memakai ulang dari indexer: `penyediaToken`, `galatGoogle`, `URL_SEARCH_CONSOLE`, `ambilPengaturanIndexing`, `besokPasifik`, dan saklar `modeAdapter()` (diekstrak dari `adapterDariEnv`). | Indexer mengabari mesin pencari (antrean, kuota, jendela kirim); pantau membaca performa dan kesehatan situs (tugas harian, ringkasan, pindai). Tes dan adapter palsunya terpisah, jadi perubahan satu modul tidak menyentuh tes modul lain. Satu saklar `INDEXER_ADAPTER` untuk semua panggilan ke luar mencegah pratinjau menghubungi Google atau situs lain. |
| Adapter | Seam `AdapterPantau = { analitik(properti, permintaan), periksaTautan(url) }`, keduanya tidak pernah melempar. Asli: satu `fetch` per halaman jawaban, token scope `webmasters` yang sama dengan indexer; HEAD dengan `redirect: follow`, GET bila HEAD dijawab 403, 405, atau 501, batas 10 detik, agen `point.lat-pemeriksa-tautan/1.0`. Palsu: Search Analytics **dilewati** bila `dataAnalitik` kosong (bawaan), jadi data contoh E2E dan dev tidak tertimpa data kosong; tautan menjawab 200 kecuali diatur. | Dua adapter nyata (asli dan palsu) di setiap seam. Pemeriksa tautan butuh jaringan, jadi tes dan workspace memakai palsu. |
| Bentuk API | `POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query` dengan `{ startDate, endDate, dimensions: ['date' atau 'page'], type: 'web', dataState: 'final', rowLimit: 25000, startRow }`; jawaban `{ rows: [{ keys, clicks, impressions, ctr, position }] }` (tanpa `rows` bila kosong). Halaman berikutnya `startRow + 25.000` sampai jawaban kurang dari 25.000 baris, paling banyak empat permintaan (Search Console memberi paling banyak 50.000 baris per hari per jenis). 429 atau `RESOURCE_EXHAUSTED` berarti kuota habis. | Dokumentasi `searchanalytics.query` (diperbarui 11 Agustus 2026), "Getting all your data" dan Usage limits (diperbarui 28 Agustus 2025), dibaca 5 November 2026. Tanggal dalam waktu Pasifik; urutan baris klik menurun kecuali dimensi `date` (tanggal naik); hari tanpa data tidak dikirim. |
| Data tertunda | Kueri total harian (dimensi `date`, data final) untuk 35 hari sampai kemarin waktu Pasifik; tanggal terakhir yang berisi menjadi `sampai`. Ringkasan per halaman diminta untuk 28 hari dan 7 hari yang berakhir di `sampai`. Tanpa data final sama sekali dalam 35 hari, ringkasan halaman dikosongkan. | "Data is typically available after 2-3 days" (dokumentasi). Mengandalkan tanggal terakhir yang benar-benar berisi menghindari menebak keterlambatan dan menghindari hari parsial (`dataState: final`). |
| Simpanan | Ringkasan 28 dan 7 hari per path dari Google (`analitik-halaman`, diganti seluruhnya setiap sinkron dalam satu transaksi), total harian properti (`analitik-situs`, upsert per tanggal, disimpan 480 hari), bukan baris per halaman per hari. Beberapa URL yang menjadi satu path (http dan https, `www.`, query) digabung: klik dan impresi dijumlah, posisi ditimbang impresi. Hanya host situs. | Google sendiri yang menghitung posisi rata-rata per halaman dengan benar; tabel kecil (satu baris per halaman yang muncul di Google) dan tanpa agregasi SQL. Riwayat harian per halaman untuk "artikel menurun" ada di Fase 2 (spesifikasi §17). |
| Jadwal dan klaim | Satu baris per tugas di `tugas-seo` (`analitik`, `tautan`). Baris dibuat `INSERT ... ON CONFLICT (jenis) DO NOTHING` (jatuh tempo saat itu juga), lalu diklaim dengan satu `UPDATE ... WHERE berikutnya <= sekarang RETURNING` (sewa 15 menit). Berhasil, dilewati, atau kuota habis: berikutnya awal hari waktu Pasifik besok; gagal: satu jam lagi. | Vercel Cron bisa terkirim dua kali dan cron berjalan setiap 10 menit. Probe: dengan klaim lewat `payload.find` lalu `payload.update`, tes "dua pelari bersamaan" gagal 3 dari 3 kali; dengan `UPDATE ... RETURNING` lulus. |
| Retensi | Tugas harian `analitik` menghapus log indexing lebih dari 90 hari dan total harian lebih dari 480 hari lewat `payload.db.deleteMany` (satu `DELETE`, tanpa hook per dokumen), apa pun hasil sinkronnya. | Dashboard membaca log 7 hari; satu siklus cek status paling lama 30 hari (Rencana 6A menyerahkan lama retensi ke dashboard ini). 480 hari mengikuti riwayat 16 bulan Search Console. |
| Paling dibaca | "Paling dibaca pekan ini" (judul editor, bawaan itu) hanya bila artikel terbit (bukan glosarium) dengan klik 7 hari lebih dari nol cukup untuk semua tempat (`jumlah` blok; 3 di halaman 404); selain itu tetap tulisan terbaru berjudul "Tulisan terbaru". Peringkat apa adanya: artikel mozaik boleh ikut. `muatBeranda` dan `muatPopuler` diberi tag `analitik` yang dibuang setiap sinkron. | Keputusan pemilik Rencana 4B (judul jujur). Daftar campuran populer dan terbaru di bawah judul "Paling dibaca" akan menyesatkan; menyaring artikel mozaik akan membuang artikel terpopuler dari peringkat. Halaman tetap ISR, tanpa JavaScript baru. |
| Halaman yatim | Sasaran: artikel (semua tipe) dan halaman statis terbit yang tidak noindex. Tautan masuk dihitung dari isi Lexical dokumen terbit (artikel, halaman, pilar, tools), relasi pilihan editor (artikel, tools, dan video terkait, sematan tools dan video), menu header dan footer, dan pilihan beranda (mozaik, strip video); tautan ke diri sendiri tidak dihitung; tautan ke alamat lama yang dialihkan dihitung untuk tujuannya. Daftar otomatis (rubrik, tulisan terbaru, artikel terkait otomatis, indeks glosarium, sitemap) tidak dihitung. | Spesifikasi §8 ("tanpa link masuk"); daftar otomatis berganti setiap ada tulisan baru, jadi tidak membuat halaman bisa ditemukan secara tetap. Dihitung oleh pindai harian di cron (membaca semua dokumen terbit sekali sehari), bukan tabel tautan yang diisi hook simpan: tidak ada hook baru yang menulis tabel berkunci unik dalam operasi massal, dan hasilnya selalu konsisten dengan isi terbit. |
| Link rusak | Internal (setiap hari, database): tujuan dicocokkan dengan path dokumen terbit, halaman indeks, dan rute teknis; tautan dokumen Lexical ke dokumen yang belum terbit atau sudah dihapus, path tanpa halaman, dan redirect 410 berarti `rusak`; redirect 301 berarti `dialihkan` (alamat lama). Luar (`tautan-luar`): pindai menambah URL baru (jatuh tempo sekarang) dan membuang yang tidak lagi dipakai; setiap jalan cron memeriksa paling banyak 10 URL jatuh tempo, 5 bersamaan; 404, 410, dan domain tidak ada berarti rusak, kode lain dan batas waktu "perlu dicek manual" (cek ulang besok), selain itu cek ulang seminggu lagi. | Spesifikasi §5 dan §8 ("cek link rusak mingguan"). Batas per jalan menjaga satu jalan cron tetap singkat (paling lama sekitar 20 detik bila semua URL habis waktu) tanpa `maxDuration` khusus; 10 URL per 10 menit cukup untuk 1.440 URL per hari. |
| 404 dan "Buat redirect" | Kolom "Tindakan" (field `ui` dengan sel server) di daftar Log 404 dan tabel 404 teratas di dashboard: "Buat redirect" membuka `/admin/collections/redirect/create?dari=/path`; field `dari` di koleksi `redirect` memakai `defaultValue: ({ req }) => pathDariKueri(req.query.dari)`. Path yang sudah punya redirect menampilkan "Lihat redirect". Nama tautan menyebut path-nya (`aria-label`, diawali teks yang terlihat). | Payload 3.92 membangun state form awal dengan `req` halaman admin yang `query`-nya hasil parse URL (`@payloadcms/next` `views/Root`, `getDefaultValue` menerima `req`). Rate limit beacon 404 tetap di Rencana 8 (Vercel Firewall) seperti dicatat Rencana 4A. |
| View dashboard | `admin.components.views.dashboardSeo = { Component, path: '/seo', exact: true }`; komponen membungkus diri dengan `DefaultTemplate` (view kustom satu segmen tidak diberi template oleh Payload) dan memeriksa akses sendiri (view kustom melewati pemeriksaan `canAccessAdmin`): belum masuk diarahkan ke `/admin/login?redirect=/admin/seo`, selain admin melihat pesan. Tautan "Dashboard SEO" lewat `beforeNavLinks` (server, hanya admin) dengan kelas `nav__link` Payload dan `aria-current`. | `node_modules/@payloadcms/next/dist/views/Root/index.js` dan `getRouteData.js` (Payload 3.92.1): tanpa `templateType` untuk view kustom, dan `isCustomAdminView` dilewatkan dari redirect akses. |
| Grafik | Satu grafik kolom klik per hari (satu seri, satu hue: `--color-blue-500` di tema terang, `--color-blue-450` di tema gelap; keduanya lolos validator dataviz untuk rentang terang, chroma, dan kontras 3:1 terhadap permukaan putih dan `#141414`). Kolom paling lebar 24 px, ujung atas membulat 4 px, garis bantu 1 px di batas atas, label sumbu tanggal pertama dan terakhir, `title` per kolom untuk hover, dan tabel angka per hari di `<details>`. Ringkasan sebagai kartu angka (klik, impresi, CTR, posisi rata-rata), bukan grafik. Status indeks sebagai batang horizontal berperingkat satu warna dengan label dan angka tertulis. | Skill dataviz: bentuk dipilih dulu (stat tile untuk angka utama, kolom untuk tren harian, batang berperingkat untuk bagian dari keseluruhan), satu seri tanpa legenda, warna status hanya untuk status dan selalu bersama teks, informasi tidak pernah hanya lewat hover atau warna. |
| Redirect subkategori | `terapkanRedirect(req, pathLama, pathBaru)` diekstrak dari `redirectSaatPathBerubah` (perilaku sama). Hook subkategori mencatat path `/{pilar}/{subkategori}` di `beforeChange` (slug pilar dibaca dengan `req`) dan menulis redirect di `afterChange` (slug berganti atau pindah pilar). Hook pilar `afterChange` mengalihkan semua `/{slug-lama}/{subkategori}` saat slug pilar berganti (pilar tanpa draf, jadi `previousDoc` adalah versi publik). Artikel tidak perlu: path-nya datar `/{slug}`. | Spesifikasi §7. Probe: update massal dua subkategori pindah pilar dalam satu operasi lulus dengan dan tanpa giliran per `req` (tiga kali), karena setiap dokumen hanya membaca dan menulis redirect untuk path miliknya sendiri; jadi tanpa giliran (berbeda dengan `kabari`, yang berbagi baris sitemap). |

## Struktur file setelah rencana ini

```
src/modules/pantau/
  index.ts       jalankanPantau (cron), RingkasanPantau, ekspor adapter dan palsu
  tipe.ts        JenisTugas, StatusTugas, StatusTautan, JenisTemuan, BarisAnalitik, PermintaanAnalitik, RingkasanHalaman, HariSitus, label
  aturan.ts      tanggalPasifik, geserTanggal, rentang, rentangHarian, permintaanAnalitik, pathDariUrl, ringkasHalaman, hariSitus,
                 ringkasSitus, jadwalTugas, hrefDari, statusTautan, jadwalCekTautan (fungsi murni, waktu sebagai argumen)
  adapter.ts     seam AdapterPantau, adapterDariEnv (INDEXER_ADAPTER), adapterPantau, pakaiAdapterPantau
  asli.ts        Search Analytics lewat fetch dan token akun layanan indexer; pemeriksa tautan HEAD/GET
  palsu.ts       dataAnalitik, jawabanTautan, jawabAnalitik, permintaan, dibuka
  tugas.ts       klaimTugas (INSERT ON CONFLICT + UPDATE RETURNING), selesaikanTugas
  analitik.ts    kueriSemua (startRow), sinkronAnalitik, hapusDataLama (retensi)
  tautan.ts      tautanLexical, tautanDokumen, nilaiTautan (murni: rusak, dialihkan, yatim, URL luar)
  pindai.ts      pindaiTautan (konten terbit, menu, beranda), periksaTautanLuar (10 per jalan)
  format.ts      teksJumlah, teksRingkas, teksPersen, teksPosisi, teksWaktu, teksTanggal, batasSumbu
  dashboard.ts   ambilDashboard, hrefSumber
  admin/         DashboardSeo.tsx, BagianDashboard.tsx, GrafikKlik.tsx, TautanDashboard.tsx, TautanNav.tsx,
                 SelBuatRedirect.tsx, dashboard.scss, nav.scss
src/collections/AnalitikHalaman.ts, AnalitikSitus.ts, TugasSeo.ts, TemuanTautan.ts, TautanLuar.ts
src/hooks/redirectSubkategori.ts            redirect /{pilar}/{subkategori} (subkategori dan pilar)
src/lib/admin.ts                           urlAdmin (path admin Payload)
src/modules/konten (ambilPopuler, muatPopuler, daftarPopuler, JUDUL_POPULER), src/app/(frontend)/not-found.tsx
tests/unit/pantau-*.test.ts, tests/int/pantau-*.int.spec.ts, tests/int/redirect-subkategori.int.spec.ts, tests/e2e/pantau.spec.ts
```

## Jumlah tes yang diharapkan

| Setelah task | Unit (file) | Integrasi (file) | E2E |
|---|---|---|---|
| Baseline (`7b4c1e8`) | 383 (56) | 98 (32) | 91 |
| 1 Aturan Pantau SEO | 394 (57) | 98 (32) | 91 |
| 2 Adapter Search Analytics dan tautan | 401 (58) | 98 (32) | 91 |
| 3 Sinkron harian, tugas, retensi | 401 (58) | 107 (33) | 91 |
| 4 Paling dibaca beranda dan 404 | 403 (58) | 108 (33) | 91 |
| 5 Pindai tautan dan tautan luar | 407 (59) | 111 (34) | 91 |
| 6 Tombol Buat redirect | 408 (59) | 111 (34) | 92 |
| 7 Data dashboard | 412 (60) | 113 (35) | 92 |
| 8 View dashboard SEO | 417 (61) | 113 (35) | 97 |
| 9 Redirect subkategori | 417 (61) | 117 (36) | 98 |
| 10 CLAUDE.md, spesifikasi, pemeriksaan akhir | 417 (61) | 117 (36) | 98 |

---

### Task 1: Aturan Pantau SEO sebagai fungsi murni

**Files:**
- Create: `src/modules/pantau/tipe.ts`, `src/modules/pantau/aturan.ts`
- Test: `tests/unit/pantau-aturan.test.ts`

**Interfaces:**
- Consumes: `besokPasifik`, `HARI`, `JAM` dari `src/modules/indexer/aturan.ts` (Rencana 6A).
- Produces:
  - `tipe.ts`: `JENIS_TUGAS` (`analitik`, `tautan`), `STATUS_TUGAS`, `STATUS_TAUTAN` (`belum`, `baik`, `rusak`, `tidak-pasti`), `JENIS_TEMUAN` (`rusak`, `dialihkan`, `yatim`) beserta labelnya; tipe `BarisAnalitik` dan `PermintaanAnalitik` (nama field API), `RingkasanHalaman`, `HariSitus`, `JawabanTautan`, `HasilTautan`, `Href`.
  - `aturan.ts`: konstanta (`RENTANG_HARIAN` 35, `HARI_RINGKASAN` 28, `HARI_PEKAN` 7, `BARIS_PER_PERMINTAAN` 25.000, `MAKS_PERMINTAAN_PER_KUERI` 4, `RETENSI_LOG_INDEXING_HARI` 90, `RETENSI_ANALITIK_SITUS_HARI` 480, `BATAS_TAUTAN_PER_JALAN` 10, `TAUTAN_BERSAMAAN` 5, `BATAS_TUNGGU_TAUTAN_MS` 10.000) dan fungsi `tanggalPasifik(t)`, `geserTanggal(tanggal, hari)`, `rentang(akhir, jumlah)`, `rentangHarian(sekarang)`, `permintaanAnalitik(rentang, dimensi, startRow?)`, `rapikanPath(path)`, `pathDariUrl(url, urlSitus)`, `ringkasHalaman(baris28, baris7, urlSitus)`, `hariSitus(baris)`, `ringkasSitus(hari, akhir, jumlah?)` (`RingkasanSitus` dengan `seri` harian), `jadwalTugas(hasil, sekarang)` (`HasilTugas` = berhasil, dilewati, gagal, kuota-habis), `hrefDari(nilai, urlSitus)`, `statusTautan(jawaban)`, `jadwalCekTautan(status, sekarang)`.

Semua aturan Pantau SEO yang bisa diuji tanpa database dan tanpa jaringan ada di sini, dengan waktu sebagai argumen. Tanggal Search Analytics adalah tanggal kalender waktu Pasifik (dokumentasi `searchanalytics.query`: "PT time (UTC - 7:00/8:00)"), jadi "kemarin" dihitung di zona itu, bukan WIB. Ringkasan per path menjumlah klik dan impresi URL yang sama path-nya dan menimbang posisi dengan impresi (posisi rata-rata Google adalah rata-rata per impresi). Tugas harian dijadwalkan ke awal hari Pasifik berikutnya (sama dengan hari kuota Google di Rencana 6A), kecuali gagal yang dicoba lagi sejam kemudian. Arti jawaban pemeriksa tautan sengaja hati-hati: hanya 404, 410, dan domain yang tidak ada yang disebut rusak.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/pantau-aturan.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import {
    geserTanggal,
    hariSitus,
    hrefDari,
    jadwalCekTautan,
    jadwalTugas,
    pathDariUrl,
    permintaanAnalitik,
    rentang,
    rentangHarian,
    ringkasHalaman,
    ringkasSitus,
    statusTautan,
    tanggalPasifik,
  } from '@/modules/pantau/aturan'

  const SITUS = 'https://point.lat'
  const baris = (kunci: string, clicks: number, impressions: number, position: number) => ({
    keys: [kunci],
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : 0,
    position,
  })

  describe('tanggal Search Analytics (waktu Pasifik)', () => {
    it('tanggal kalender Pasifik: 5 November 03.00 UTC masih 4 November di Pasifik', () => {
      expect(tanggalPasifik(new Date('2026-11-05T03:00:00.000Z'))).toBe('2026-11-04')
      expect(tanggalPasifik(new Date('2026-11-05T08:00:00.000Z'))).toBe('2026-11-05')
      // Musim panas (PDT, UTC-7): tengah malam Pasifik = 07.00 UTC.
      expect(tanggalPasifik(new Date('2026-07-01T06:59:00.000Z'))).toBe('2026-06-30')
      expect(tanggalPasifik(new Date('2026-07-01T07:00:00.000Z'))).toBe('2026-07-01')
    })

    it('geser tanggal melewati akhir bulan dan tahun; rentang termasuk kedua ujungnya', () => {
      expect(geserTanggal('2026-03-01', -1)).toBe('2026-02-28')
      expect(geserTanggal('2026-12-31', 1)).toBe('2027-01-01')
      expect(rentang('2026-11-02', 28)).toEqual({ startDate: '2026-10-06', endDate: '2026-11-02' })
      expect(rentang('2026-11-02', 7)).toEqual({ startDate: '2026-10-27', endDate: '2026-11-02' })
    })

    it('kueri total harian: 35 hari sampai kemarin; permintaan hanya data final pencarian web', () => {
      expect(rentangHarian(new Date('2026-11-05T03:00:00.000Z'))).toEqual({ startDate: '2026-09-30', endDate: '2026-11-03' })
      expect(permintaanAnalitik({ startDate: '2026-10-06', endDate: '2026-11-02' }, 'page', 25_000)).toEqual({
        startDate: '2026-10-06',
        endDate: '2026-11-02',
        dimensions: ['page'],
        type: 'web',
        dataState: 'final',
        rowLimit: 25_000,
        startRow: 25_000,
      })
    })
  })

  describe('ringkasan klik, impresi, CTR, dan posisi', () => {
    it('path dari URL laporan: host situs dengan atau tanpa www dan http; host lain diabaikan', () => {
      expect(pathDariUrl('https://point.lat/cara-hitung-thr', SITUS)).toBe('/cara-hitung-thr')
      expect(pathDariUrl('http://www.point.lat/cara-hitung-thr/?utm_source=x#a', SITUS)).toBe('/cara-hitung-thr')
      expect(pathDariUrl('https://point.lat/', SITUS)).toBe('/')
      expect(pathDariUrl('https://staging.point.lat/cara-hitung-thr', SITUS)).toBeNull()
      expect(pathDariUrl('bukan url', SITUS)).toBeNull()
    })

    it('URL yang menjadi path yang sama digabung: klik dan impresi dijumlah, posisi ditimbang impresi; urut klik 28 hari', () => {
      const r = ringkasHalaman(
        [
          baris('https://point.lat/a', 10, 100, 4),
          baris('https://www.point.lat/a/', 2, 100, 8),
          baris('https://point.lat/b', 30, 600, 2.5),
          baris('https://point.lat/c', 0, 50, 30),
          baris('https://lain.example/x', 99, 999, 1),
        ],
        [baris('https://point.lat/a', 5, 40, 3), baris('https://point.lat/b', 1, 90, 2)],
        SITUS,
      )
      expect(r).toEqual([
        { path: '/b', klik7: 1, impresi7: 90, klik28: 30, impresi28: 600, ctr28: 0.05, posisi28: 2.5 },
        { path: '/a', klik7: 5, impresi7: 40, klik28: 12, impresi28: 200, ctr28: 0.06, posisi28: 6 },
        { path: '/c', klik7: 0, impresi7: 0, klik28: 0, impresi28: 50, ctr28: 0, posisi28: 30 },
      ])
    })

    it('total harian properti dan ringkasan 28 hari: hari tanpa data bernilai 0, posisi ditimbang impresi', () => {
      const hari = hariSitus([baris('2026-11-01', 4, 100, 10), baris('2026-11-02', 6, 300, 6), baris('2026-10-01', 50, 500, 1)])
      expect(hari[0]).toEqual({ tanggal: '2026-11-01', klik: 4, impresi: 100, ctr: 0.04, posisi: 10 })
      const r = ringkasSitus(hari, '2026-11-02')
      expect(r).toMatchObject({ klik: 10, impresi: 400, ctr: 0.025, posisi: 7 })
      expect(r.seri).toHaveLength(28)
      expect(r.seri[0]).toEqual({ tanggal: '2026-10-06', klik: 0, impresi: 0 })
      expect(r.seri.at(-1)).toEqual({ tanggal: '2026-11-02', klik: 6, impresi: 300 })
      expect(ringkasSitus([], '2026-11-02')).toMatchObject({ klik: 0, impresi: 0, ctr: 0, posisi: null })
    })
  })

  describe('jadwal tugas harian', () => {
    const sekarang = new Date('2026-11-05T03:00:00.000Z')

    it('berhasil, dilewati, dan kuota habis: awal hari Pasifik berikutnya; gagal: satu jam lagi', () => {
      expect(jadwalTugas('berhasil', sekarang).toISOString()).toBe('2026-11-05T08:00:00.000Z')
      expect(jadwalTugas('dilewati', sekarang).toISOString()).toBe('2026-11-05T08:00:00.000Z')
      expect(jadwalTugas('kuota-habis', sekarang).toISOString()).toBe('2026-11-05T08:00:00.000Z')
      expect(jadwalTugas('gagal', sekarang).toISOString()).toBe('2026-11-05T04:00:00.000Z')
    })

    it('tautan luar dicek ulang seminggu sekali, atau besok bila hasilnya belum pasti', () => {
      expect(jadwalCekTautan('baik', sekarang).toISOString()).toBe('2026-11-12T03:00:00.000Z')
      expect(jadwalCekTautan('rusak', sekarang).toISOString()).toBe('2026-11-12T03:00:00.000Z')
      expect(jadwalCekTautan('tidak-pasti', sekarang).toISOString()).toBe('2026-11-06T03:00:00.000Z')
    })
  })

  describe('tautan di isian CMS', () => {
    it('path situs dan URL ke host situs adalah internal; http(s) lain luar; jangkar, mailto, tel, dan isian aneh diabaikan', () => {
      expect(hrefDari('/cara-hitung-thr/', SITUS)).toEqual({ jenis: 'internal', path: '/cara-hitung-thr' })
      expect(hrefDari('/tools?ref=menu#atas', SITUS)).toEqual({ jenis: 'internal', path: '/tools' })
      expect(hrefDari('https://www.point.lat/glosarium/ptkp', SITUS)).toEqual({ jenis: 'internal', path: '/glosarium/ptkp' })
      expect(hrefDari(' https://pajak.go.id/id/pph-21 ', SITUS)).toEqual({ jenis: 'luar', url: 'https://pajak.go.id/id/pph-21' })
      for (const nilai of ['#faq', 'mailto:redaksi@point.lat', 'tel:+6221', '//cdn.example/x', 'ftp://x.example/a', 'bukan url', '', null, 3]) {
        expect(hrefDari(nilai, SITUS)).toBeNull()
      }
    })
  })

  describe('arti jawaban pemeriksa tautan', () => {
    it('2xx dan 3xx bisa dibuka; 404, 410, dan domain hilang rusak', () => {
      expect(statusTautan({ kodeHttp: 200, galat: null })).toEqual({ status: 'baik', kodeHttp: 200, pesan: 'Bisa dibuka (200).' })
      expect(statusTautan({ kodeHttp: 404, galat: null })).toEqual({
        status: 'rusak',
        kodeHttp: 404,
        pesan: 'Halaman tidak ditemukan (404). Ganti atau hapus tautannya.',
      })
      expect(statusTautan({ kodeHttp: 410, galat: null }).status).toBe('rusak')
      expect(statusTautan({ kodeHttp: null, galat: 'getaddrinfo ENOTFOUND hilang.example', kodeGalat: 'ENOTFOUND' })).toEqual({
        status: 'rusak',
        kodeHttp: null,
        pesan: 'Domain tidak ditemukan. Ganti atau hapus tautannya.',
      })
    })

    it('403, 429, 5xx, batas waktu, dan galat jaringan lain belum tentu rusak: minta dicek manual', () => {
      expect(statusTautan({ kodeHttp: 403, galat: null })).toEqual({
        status: 'tidak-pasti',
        kodeHttp: 403,
        pesan: 'Server menjawab 403. Buka tautannya untuk memastikan; sebagian situs menolak pemeriksa otomatis.',
      })
      expect(statusTautan({ kodeHttp: 503, galat: null }).status).toBe('tidak-pasti')
      expect(statusTautan({ kodeHttp: null, galat: 'The operation was aborted due to timeout', kodeGalat: 'TimeoutError' })).toEqual({
        status: 'tidak-pasti',
        kodeHttp: null,
        pesan: 'Situs tidak menjawab dalam 10 detik.',
      })
      expect(statusTautan({ kodeHttp: null, galat: 'fetch failed.', kodeGalat: 'ECONNRESET' }).pesan).toBe('Tidak bisa dihubungi: fetch failed.')
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/pantau-aturan.test.ts` dengan `Error: Cannot find package '@/modules/pantau/aturan'`.

- [ ] **Langkah 3: Tipe dan aturan**

  `src/modules/pantau/tipe.ts`

  ```ts
  /**
   * Tipe Pantau SEO (spesifikasi §8 "Dashboard SEO"). Nilai `select` koleksi `tugas-seo`, `tautan-luar`,
   * dan `temuan-tautan` diambil dari daftar di sini supaya kode dan skema tidak berbeda.
   */

  /** Tugas berkala yang dijalankan cron: sinkron Search Analytics dan pindai tautan, masing-masing sekali sehari. */
  export const JENIS_TUGAS = ['analitik', 'tautan'] as const
  export type JenisTugas = (typeof JENIS_TUGAS)[number]

  export const STATUS_TUGAS = ['berjalan', 'berhasil', 'gagal', 'dilewati'] as const
  export type StatusTugas = (typeof STATUS_TUGAS)[number]

  export const LABEL_TUGAS: Record<JenisTugas, string> = {
    analitik: 'Sinkron Search Console',
    tautan: 'Pindai tautan',
  }

  export const LABEL_STATUS_TUGAS: Record<StatusTugas, string> = {
    berjalan: 'Sedang berjalan',
    berhasil: 'Berhasil',
    gagal: 'Gagal',
    dilewati: 'Dilewati',
  }

  /** Status tautan ke situs lain: `belum` dicek, `baik`, `rusak` (404, 410, domain hilang), atau `tidak-pasti`. */
  export const STATUS_TAUTAN = ['belum', 'baik', 'rusak', 'tidak-pasti'] as const
  export type StatusTautan = (typeof STATUS_TAUTAN)[number]

  export const LABEL_STATUS_TAUTAN: Record<StatusTautan, string> = {
    belum: 'Belum dicek',
    baik: 'Bisa dibuka',
    rusak: 'Rusak',
    'tidak-pasti': 'Perlu dicek manual',
  }

  /** Temuan pindai isi: tautan internal rusak, tautan ke path yang dialihkan, dan halaman yatim. */
  export const JENIS_TEMUAN = ['rusak', 'dialihkan', 'yatim'] as const
  export type JenisTemuan = (typeof JENIS_TEMUAN)[number]

  export const LABEL_JENIS_TEMUAN: Record<JenisTemuan, string> = {
    rusak: 'Tautan internal rusak',
    dialihkan: 'Tautan ke alamat lama',
    yatim: 'Halaman yatim',
  }

  /** Satu baris jawaban Search Analytics (nama field sama dengan API). */
  export type BarisAnalitik = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number }

  /** Badan `searchanalytics.query` yang dipakai (nama field sama dengan API). */
  export type PermintaanAnalitik = {
    startDate: string
    endDate: string
    dimensions: ('date' | 'page')[]
    type: 'web'
    dataState: 'final'
    rowLimit: number
    startRow: number
  }

  /** Ringkasan satu path untuk 28 dan 7 hari terakhir yang datanya sudah final. */
  export type RingkasanHalaman = {
    path: string
    klik7: number
    impresi7: number
    klik28: number
    impresi28: number
    /** 0 sampai 1. */
    ctr28: number
    /** Posisi rata-rata, ditimbang impresi. */
    posisi28: number
  }

  /** Total seluruh properti untuk satu hari (dimensi `date`). */
  export type HariSitus = { tanggal: string; klik: number; impresi: number; ctr: number; posisi: number }

  /** Jawaban mentah pemeriksa tautan: kode HTTP, atau galat jaringan beserta kodenya (`ENOTFOUND`, `TimeoutError`). */
  export type JawabanTautan = { kodeHttp: number | null; galat: string | null; kodeGalat?: string | null }

  export type HasilTautan = { status: Exclude<StatusTautan, 'belum'>; kodeHttp: number | null; pesan: string }

  /** Tautan dari dalam situs (`/path`) atau ke situs lain (URL lengkap). */
  export type Href = { jenis: 'internal'; path: string } | { jenis: 'luar'; url: string }
  ```

  `src/modules/pantau/aturan.ts`

  ```ts
  import { besokPasifik, HARI, JAM } from '@/modules/indexer/aturan'

  import type {
    BarisAnalitik,
    HariSitus,
    HasilTautan,
    Href,
    JawabanTautan,
    PermintaanAnalitik,
    RingkasanHalaman,
    StatusTautan,
  } from './tipe'

  /**
   * Aturan Pantau SEO sebagai fungsi murni: tanggal Search Analytics (waktu Pasifik), ringkasan klik,
   * impresi, CTR, dan posisi, jadwal tugas berkala, pembacaan tautan, dan arti jawaban pemeriksa tautan.
   * Waktu selalu masuk sebagai argumen supaya tes bisa memakai waktu tiruan.
   */

  /** Kueri total harian mencakup 35 hari sampai kemarin: cukup untuk 28 hari walau data final terlambat beberapa hari. */
  export const RENTANG_HARIAN = 35

  /** Ringkasan per halaman: 28 hari (tabel dashboard) dan 7 hari ("Paling dibaca pekan ini"). */
  export const HARI_RINGKASAN = 28
  export const HARI_PEKAN = 7

  /** Batas baris per permintaan Search Analytics (dokumentasi: 1 sampai 25.000). */
  export const BARIS_PER_PERMINTAAN = 25_000

  /** Search Console memberi paling banyak 50.000 baris per hari per jenis pencarian, jadi dua halaman cukup; empat sebagai pengaman. */
  export const MAKS_PERMINTAAN_PER_KUERI = 4

  /** Log indexing disimpan 90 hari: dashboard membaca 7 hari terakhir, satu siklus cek status paling lama 30 hari. */
  export const RETENSI_LOG_INDEXING_HARI = 90

  /** Total harian disimpan 16 bulan, sama dengan riwayat Search Console, untuk perbandingan di Fase 2. */
  export const RETENSI_ANALITIK_SITUS_HARI = 480

  /** Tautan ke situs lain yang dicek per jalan cron (10 menit sekali), dan berapa yang dicek bersamaan. */
  export const BATAS_TAUTAN_PER_JALAN = 10
  export const TAUTAN_BERSAMAAN = 5

  /** Batas tunggu satu tautan. */
  export const BATAS_TUNGGU_TAUTAN_MS = 10_000

  const FORMAT_PASIFIK = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  /** Tanggal kalender waktu Pasifik (zona tanggal Search Analytics), bentuk `YYYY-MM-DD`. */
  export function tanggalPasifik(t: Date): string {
    const b = Object.fromEntries(FORMAT_PASIFIK.formatToParts(t).map((p) => [p.type, p.value]))
    return `${b.year}-${b.month}-${b.day}`
  }

  /** Tanggal `YYYY-MM-DD` digeser sejumlah hari. */
  export function geserTanggal(tanggal: string, hari: number): string {
    const t = new Date(`${tanggal}T00:00:00.000Z`)
    t.setUTCDate(t.getUTCDate() + hari)
    return t.toISOString().slice(0, 10)
  }

  /** Rentang `jumlah` hari yang berakhir di `akhir`, keduanya termasuk (seperti `startDate` dan `endDate` API). */
  export function rentang(akhir: string, jumlah: number): Pick<PermintaanAnalitik, 'startDate' | 'endDate'> {
    return { startDate: geserTanggal(akhir, -(jumlah - 1)), endDate: akhir }
  }

  /** Rentang kueri total harian: 35 hari sampai kemarin waktu Pasifik. */
  export function rentangHarian(sekarang: Date): Pick<PermintaanAnalitik, 'startDate' | 'endDate'> {
    return rentang(geserTanggal(tanggalPasifik(sekarang), -1), RENTANG_HARIAN)
  }

  /** Badan permintaan: hanya data final (`dataState: final`), pencarian web, satu dimensi. */
  export function permintaanAnalitik(
    r: Pick<PermintaanAnalitik, 'startDate' | 'endDate'>,
    dimensi: 'date' | 'page',
    startRow = 0,
  ): PermintaanAnalitik {
    return { ...r, dimensions: [dimensi], type: 'web', dataState: 'final', rowLimit: BARIS_PER_PERMINTAAN, startRow }
  }

  /** Path tanpa garis miring di akhir, kecuali beranda. */
  export function rapikanPath(path: string): string {
    return path.length > 1 ? path.replace(/\/+$/, '') || '/' : path
  }

  const hostSitus = (url: URL) => url.hostname.replace(/^www\./, '')

  /**
   * Path dari URL laporan Search Console. Properti domain mencakup semua subdomain dan protokol, jadi hanya
   * host situs (dengan atau tanpa `www.`) yang dipakai. Query dan fragmen dibuang.
   */
  export function pathDariUrl(url: string, urlSitus: string): string | null {
    try {
      const u = new URL(url)
      if (!/^https?:$/.test(u.protocol) || hostSitus(u) !== hostSitus(new URL(urlSitus))) return null
      return rapikanPath(u.pathname)
    } catch {
      return null
    }
  }

  type Akumulasi = { klik: number; impresi: number; bobot: number }

  function kumpulkan(baris: BarisAnalitik[], urlSitus: string): Map<string, Akumulasi> {
    const hasil = new Map<string, Akumulasi>()
    for (const b of baris) {
      const path = pathDariUrl(b.keys[0] ?? '', urlSitus)
      if (!path) continue
      const a = hasil.get(path) ?? { klik: 0, impresi: 0, bobot: 0 }
      a.klik += b.clicks
      a.impresi += b.impressions
      a.bobot += b.position * b.impressions
      hasil.set(path, a)
    }
    return hasil
  }

  /**
   * Ringkasan per path dari baris dimensi `page` untuk 28 dan 7 hari. Beberapa URL bisa menjadi satu path
   * (http dan https, `www.`, query): klik dan impresi dijumlah, posisi ditimbang impresi. Urutan: klik
   * 28 hari terbanyak, lalu impresi, lalu path.
   */
  export function ringkasHalaman(baris28: BarisAnalitik[], baris7: BarisAnalitik[], urlSitus: string): RingkasanHalaman[] {
    const a28 = kumpulkan(baris28, urlSitus)
    const a7 = kumpulkan(baris7, urlSitus)
    const nol: Akumulasi = { klik: 0, impresi: 0, bobot: 0 }
    return [...new Set([...a28.keys(), ...a7.keys()])]
      .map((path) => {
        const b = a28.get(path) ?? nol
        const p = a7.get(path) ?? nol
        return {
          path,
          klik7: p.klik,
          impresi7: p.impresi,
          klik28: b.klik,
          impresi28: b.impresi,
          ctr28: b.impresi ? b.klik / b.impresi : 0,
          posisi28: b.impresi ? b.bobot / b.impresi : 0,
        }
      })
      .sort((x, y) => y.klik28 - x.klik28 || y.impresi28 - x.impresi28 || x.path.localeCompare(y.path))
  }

  /** Baris dimensi `date` menjadi total harian properti. */
  export function hariSitus(baris: BarisAnalitik[]): HariSitus[] {
    return baris
      .filter((b) => /^\d{4}-\d{2}-\d{2}$/.test(b.keys[0] ?? ''))
      .map((b) => ({ tanggal: b.keys[0], klik: b.clicks, impresi: b.impressions, ctr: b.ctr, posisi: b.position }))
  }

  export type RingkasanSitus = {
    klik: number
    impresi: number
    ctr: number
    /** `null` bila tidak ada impresi. */
    posisi: number | null
    /** Satu titik per hari, hari tanpa data bernilai 0 (Search Analytics tidak mengirim hari kosong). */
    seri: { tanggal: string; klik: number; impresi: number }[]
  }

  /** Total properti `jumlah` hari sampai `akhir`: klik, impresi, CTR, posisi ditimbang impresi, dan seri harian. */
  export function ringkasSitus(hari: HariSitus[], akhir: string, jumlah = HARI_RINGKASAN): RingkasanSitus {
    const per = new Map(hari.map((h) => [h.tanggal, h]))
    const seri = Array.from({ length: jumlah }, (_, i) => {
      const tanggal = geserTanggal(akhir, i - (jumlah - 1))
      const h = per.get(tanggal)
      return { tanggal, klik: h?.klik ?? 0, impresi: h?.impresi ?? 0 }
    })
    const klik = seri.reduce((n, h) => n + h.klik, 0)
    const impresi = seri.reduce((n, h) => n + h.impresi, 0)
    const bobot = seri.reduce((n, h) => n + (per.get(h.tanggal)?.posisi ?? 0) * h.impresi, 0)
    return { klik, impresi, ctr: impresi ? klik / impresi : 0, posisi: impresi ? bobot / impresi : null, seri }
  }

  export type HasilTugas = 'berhasil' | 'dilewati' | 'gagal' | 'kuota-habis'

  /**
   * Jadwal tugas harian berikutnya. Berhasil, dilewati (kredensial belum diatur), atau kuota Search Console
   * habis: awal hari waktu Pasifik berikutnya, jadi cron 10 menit sekali menjalankannya sekali sehari.
   * Gagal karena hal lain: dicoba lagi satu jam kemudian.
   */
  export function jadwalTugas(hasil: HasilTugas, sekarang: Date): Date {
    if (hasil === 'gagal') return new Date(sekarang.getTime() + JAM)
    return besokPasifik(sekarang)
  }

  /**
   * Tujuan tautan dari isian CMS (URL menu, tombol, sumber, tautan Lexical). Path situs dan URL lengkap
   * ke host situs menjadi `internal`; `http(s)` lain menjadi `luar`. Jangkar, `mailto:`, `tel:`, dan isian
   * yang bukan URL diabaikan.
   */
  export function hrefDari(nilai: unknown, urlSitus: string): Href | null {
    if (typeof nilai !== 'string') return null
    const href = nilai.trim()
    if (!href || href.startsWith('#') || /^(mailto|tel):/i.test(href)) return null
    if (href.startsWith('/') && !href.startsWith('//')) return { jenis: 'internal', path: rapikanPath(href.split(/[?#]/)[0]) }
    let url: URL
    try {
      url = new URL(href)
    } catch {
      return null
    }
    if (!/^https?:$/.test(url.protocol)) return null
    const path = pathDariUrl(href, urlSitus)
    return path ? { jenis: 'internal', path } : { jenis: 'luar', url: url.toString() }
  }

  /**
   * Arti jawaban pemeriksa tautan. 404 dan 410, atau domain yang tidak ada, berarti rusak. Kode galat lain
   * (401, 403, 429, 5xx) dan batas waktu belum tentu rusak: banyak situs menolak pemeriksa otomatis atau
   * sedang sibuk, jadi editor diminta memastikan sendiri.
   */
  export function statusTautan(j: JawabanTautan): HasilTautan {
    const { kodeHttp } = j
    if (kodeHttp !== null) {
      if (kodeHttp < 400) return { status: 'baik', kodeHttp, pesan: `Bisa dibuka (${kodeHttp}).` }
      if (kodeHttp === 404) return { status: 'rusak', kodeHttp, pesan: 'Halaman tidak ditemukan (404). Ganti atau hapus tautannya.' }
      if (kodeHttp === 410) return { status: 'rusak', kodeHttp, pesan: 'Halaman sudah dihapus pemiliknya (410). Ganti atau hapus tautannya.' }
      return {
        status: 'tidak-pasti',
        kodeHttp,
        pesan: `Server menjawab ${kodeHttp}. Buka tautannya untuk memastikan; sebagian situs menolak pemeriksa otomatis.`,
      }
    }
    if (j.kodeGalat === 'ENOTFOUND') return { status: 'rusak', kodeHttp: null, pesan: 'Domain tidak ditemukan. Ganti atau hapus tautannya.' }
    if (j.kodeGalat === 'TimeoutError') {
      return { status: 'tidak-pasti', kodeHttp: null, pesan: `Situs tidak menjawab dalam ${BATAS_TUNGGU_TAUTAN_MS / 1000} detik.` }
    }
    return { status: 'tidak-pasti', kodeHttp: null, pesan: `Tidak bisa dihubungi: ${(j.galat ?? 'galat tidak dikenal').replace(/\.$/, '')}.` }
  }

  /** Cek ulang tautan luar: seminggu sekali (spesifikasi §8), atau besok bila hasilnya belum pasti. */
  export function jadwalCekTautan(status: StatusTautan, sekarang: Date): Date {
    return new Date(sekarang.getTime() + (status === 'tidak-pasti' ? HARI : 7 * HARI))
  }
  ```

- [ ] **Langkah 4: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 57 passed (57)`, `Tests 394 passed (394)`; integrasi `Test Files 32 passed (32)`, `Tests 98 passed (98)`; E2E `91 passed`.

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/modules/pantau tests/unit/pantau-aturan.test.ts
  git commit -m "feat(pantau): aturan Pantau SEO: tanggal Search Analytics waktu Pasifik, ringkasan klik, impresi, CTR, dan posisi, jadwal tugas harian, tautan di isian CMS, dan arti jawaban pemeriksa tautan"
  ```

---

### Task 2: Adapter Search Analytics dan pemeriksa tautan, adapter palsu, dan saklar bersama

**Files:**
- Create: `src/modules/pantau/adapter.ts`, `src/modules/pantau/asli.ts`, `src/modules/pantau/palsu.ts`
- Modify: `src/modules/indexer/adapter.ts`, `src/modules/indexer/asli.ts`
- Test: `tests/unit/pantau-adapter.test.ts`

**Interfaces:**
- Consumes: `penyediaToken`, `SCOPE_WEBMASTERS`, `BATAS_TUNGGU_MS`, `AkunLayanan`, `Fetch`, `bacaAkunLayanan` (`indexer/google.ts`), `URL_SEARCH_CONSOLE` (`indexer/asli.ts`), `BATAS_TUNGGU_TAUTAN_MS`, `permintaanAnalitik` (Task 1).
- Produces:
  - `indexer/adapter.ts`: `modeAdapter(env): 'asli' | 'palsu'` (aturan `INDEXER_ADAPTER` yang sama, termasuk galat di produksi tanpa nilai); `adapterDariEnv` indexer memakainya (perilaku tidak berubah).
  - `indexer/asli.ts`: `galatGoogle(kodeHttp, data)` dan tipe `GalatGoogle` diekspor.
  - `pantau/adapter.ts`: `HasilAnalitik`, `AdapterPantau = { analitik(properti, permintaan): Promise<HasilAnalitik>; periksaTautan(url): Promise<JawabanTautan> }`, `adapterDariEnv(env)`, `adapterPantau()`, `pakaiAdapterPantau(adapter | null)`.
  - `pantau/asli.ts`: `adapterAsli({ akun, fetch?, sekarang? })`, `urlAnalitik(properti)`, `AGEN_PEMERIKSA`.
  - `pantau/palsu.ts`: `adapterPalsu(): AdapterPantauPalsu` dengan `permintaan`, `dibuka`, `dataAnalitik`, `jawabanTautan`, `jawabAnalitik(...)`, `reset()`.

Dua panggilan ke luar milik Pantau SEO ada di seam ini. Search Analytics memakai akun layanan, scope `webmasters`, dan penyedia token yang sama dengan Mesin Indexing, dan galatnya dibaca `galatGoogle` yang sama (403 dengan saran izin Owner, 429 atau `RESOURCE_EXHAUSTED` sebagai kuota habis). Adapter hanya mengirim satu halaman jawaban; perulangan `startRow` ada di Task 3. Pemeriksa tautan membuka URL dengan HEAD dan mengikuti redirect; sebagian server menolak HEAD (403, 405, 501), jadi dicoba sekali dengan GET dan isinya dibatalkan. Galat jaringan dikembalikan bersama kodenya (`TimeoutError` dari `AbortSignal.timeout`, `ENOTFOUND` dari `cause.code` undici) untuk `statusTautan` (Task 1).

Saklar `INDEXER_ADAPTER` dipakai bersama: `asli` di produksi, `palsu` di pratinjau, dev, dan tes. Adapter palsu sengaja **melewati** Search Analytics bila `dataAnalitik` tidak diisi, seperti situs tanpa akun layanan, supaya cron di dev dan E2E tidak menimpa data contoh dengan data kosong.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/pantau-adapter.test.ts`

  ```ts
  import { generateKeyPairSync } from 'crypto'
  import { describe, expect, it } from 'vitest'

  import { modeAdapter } from '@/modules/indexer/adapter'
  import { SCOPE_WEBMASTERS, URL_TOKEN, type Fetch } from '@/modules/indexer/google'
  import { adapterDariEnv } from '@/modules/pantau/adapter'
  import { permintaanAnalitik } from '@/modules/pantau/aturan'
  import { adapterAsli, AGEN_PEMERIKSA, urlAnalitik } from '@/modules/pantau/asli'
  import { adapterPalsu } from '@/modules/pantau/palsu'

  // Kunci RSA sekali pakai untuk tes: bentuknya sama dengan `private_key` di file JSON akun layanan.
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } })
  const AKUN = { client_email: 'pantau@point-lat.iam.gserviceaccount.com', private_key: privateKey }

  type Permintaan = { url: string; method: string; headers: Record<string, string>; body: string | null; redirect?: string }

  /** `fetch` tiruan: mencatat permintaan dan menjawab dari daftar, berurutan. */
  function fetchTiruan(...jawaban: (Response | Error)[]) {
    const permintaan: Permintaan[] = []
    const ambil: Fetch = async (input, init) => {
      permintaan.push({
        url: String(input),
        method: init?.method ?? 'GET',
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
        body: (init?.body as string | undefined) ?? null,
        redirect: init?.redirect,
      })
      const berikut = jawaban.shift()
      if (!berikut) throw new Error('Permintaan tidak terduga')
      if (berikut instanceof Error) throw berikut
      return berikut
    }
    return { ambil, permintaan }
  }

  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  const token = () => json({ access_token: 'token-1', expires_in: 3599, token_type: 'Bearer' })
  const PERMINTAAN = permintaanAnalitik({ startDate: '2026-10-06', endDate: '2026-11-02' }, 'page')
  const BARIS = [{ keys: ['https://point.lat/a'], clicks: 3, impressions: 40, ctr: 0.075, position: 5.2 }]

  describe('Search Analytics lewat fetch', () => {
    it('POST searchAnalytics/query ke properti (di-encode) dengan token scope webmasters; jawaban rows', async () => {
      const { ambil, permintaan } = fetchTiruan(token(), json({ rows: BARIS, responseAggregationType: 'byPage' }))
      const hasil = await adapterAsli({ akun: AKUN, fetch: ambil }).analitik('sc-domain:point.lat', PERMINTAAN)
      expect(hasil).toEqual({ status: 'berhasil', baris: BARIS })
      expect(permintaan[0].url).toBe(URL_TOKEN)
      expect(new URLSearchParams(permintaan[0].body ?? '').get('assertion')?.split('.')).toHaveLength(3)
      expect(JSON.parse(Buffer.from(new URLSearchParams(permintaan[0].body ?? '').get('assertion')!.split('.')[1], 'base64url').toString()).scope).toBe(SCOPE_WEBMASTERS)
      expect(permintaan[1]).toMatchObject({
        url: 'https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Apoint.lat/searchAnalytics/query',
        method: 'POST',
        headers: { authorization: 'Bearer token-1', 'content-type': 'application/json' },
      })
      expect(JSON.parse(permintaan[1].body ?? '')).toEqual(PERMINTAAN)
      expect(urlAnalitik('https://point.lat/')).toBe('https://www.googleapis.com/webmasters/v3/sites/https%3A%2F%2Fpoint.lat%2F/searchAnalytics/query')
    })

    it('jawaban tanpa rows (belum ada data) menjadi daftar kosong', async () => {
      const { ambil } = fetchTiruan(token(), json({ responseAggregationType: 'auto' }))
      expect(await adapterAsli({ akun: AKUN, fetch: ambil }).analitik('sc-domain:point.lat', PERMINTAAN)).toEqual({ status: 'berhasil', baris: [] })
    })

    it('403 dengan saran izin Owner, 429 sebagai kuota habis, jaringan putus, dan tanpa akun layanan dilewati', async () => {
      const tolak = fetchTiruan(token(), json({ error: { code: 403, message: 'User does not have sufficient permission for site.', status: 'PERMISSION_DENIED' } }, 403))
      const hasil403 = await adapterAsli({ akun: AKUN, fetch: tolak.ambil }).analitik('sc-domain:point.lat', PERMINTAAN)
      expect(hasil403).toMatchObject({ status: 'gagal', kodeHttp: 403, kuotaHabis: false })
      expect(hasil403.status === 'gagal' && hasil403.pesan).toMatch(/^Google menjawab 403: User does not have sufficient permission for site\. Pastikan email akun layanan/)

      const kuota = fetchTiruan(token(), json({ error: { code: 429, message: 'Search Analytics load quota exceeded', status: 'RESOURCE_EXHAUSTED' } }, 429))
      expect(await adapterAsli({ akun: AKUN, fetch: kuota.ambil }).analitik('sc-domain:point.lat', PERMINTAAN)).toEqual({
        status: 'gagal',
        kodeHttp: 429,
        kuotaHabis: true,
        pesan: 'Google menjawab 429: Search Analytics load quota exceeded.',
      })

      const putus = fetchTiruan(token(), new TypeError('fetch failed'))
      expect(await adapterAsli({ akun: AKUN, fetch: putus.ambil }).analitik('sc-domain:point.lat', PERMINTAAN)).toEqual({
        status: 'gagal',
        kodeHttp: null,
        pesan: 'Tidak bisa menghubungi Google: fetch failed.',
      })

      const tanpaAkun = fetchTiruan()
      expect(await adapterAsli({ akun: { alasan: 'Akun layanan belum diatur.' }, fetch: tanpaAkun.ambil }).analitik('sc-domain:point.lat', PERMINTAAN)).toEqual({
        status: 'dilewati',
        pesan: 'Akun layanan belum diatur.',
      })
      expect(tanpaAkun.permintaan).toHaveLength(0)
    })
  })

  describe('pemeriksa tautan lewat fetch', () => {
    it('HEAD dengan redirect diikuti dan agen pemeriksa; GET bila HEAD ditolak 405', async () => {
      const baik = fetchTiruan(new Response(null, { status: 200 }))
      const adapter = adapterAsli({ akun: AKUN, fetch: baik.ambil })
      expect(await adapter.periksaTautan('https://pajak.go.id/id/pph-21')).toEqual({ kodeHttp: 200, galat: null })
      expect(baik.permintaan[0]).toMatchObject({ method: 'HEAD', redirect: 'follow', headers: { 'user-agent': AGEN_PEMERIKSA } })

      const ditolak = fetchTiruan(new Response(null, { status: 405 }), new Response('isi', { status: 200 }))
      expect(await adapterAsli({ akun: AKUN, fetch: ditolak.ambil }).periksaTautan('https://contoh.example/a')).toEqual({ kodeHttp: 200, galat: null })
      expect(ditolak.permintaan.map((p) => p.method)).toEqual(['HEAD', 'GET'])

      const hilang = fetchTiruan(new Response(null, { status: 404 }))
      expect(await adapterAsli({ akun: AKUN, fetch: hilang.ambil }).periksaTautan('https://contoh.example/hilang')).toEqual({ kodeHttp: 404, galat: null })
    })

    it('batas waktu dan domain yang tidak ada menjadi galat berkode, tidak melempar', async () => {
      const lambat = fetchTiruan(new DOMException('The operation was aborted due to timeout', 'TimeoutError'))
      expect(await adapterAsli({ akun: AKUN, fetch: lambat.ambil }).periksaTautan('https://lambat.example/')).toEqual({
        kodeHttp: null,
        galat: 'The operation was aborted due to timeout',
        kodeGalat: 'TimeoutError',
      })
      const tanpaDomain = fetchTiruan(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } }))
      expect(await adapterAsli({ akun: AKUN, fetch: tanpaDomain.ambil }).periksaTautan('https://hilang.example/')).toEqual({
        kodeHttp: null,
        galat: 'fetch failed',
        kodeGalat: 'ENOTFOUND',
      })
    })
  })

  describe('adapter palsu dan pilihan dari env', () => {
    it('tanpa data dilewati; dengan data dipotong sesuai startRow dan rowLimit; jawaban galat lebih dulu', async () => {
      const palsu = adapterPalsu()
      expect(await palsu.analitik('sc-domain:point.lat', PERMINTAAN)).toEqual({ status: 'dilewati', pesan: 'Adapter palsu tidak mengambil data Search Console.' })
      palsu.dataAnalitik = () => Array.from({ length: 30_000 }, (_, i) => ({ keys: [`https://point.lat/${i}`], clicks: 1, impressions: 1, ctr: 1, position: 1 }))
      const pertama = await palsu.analitik('sc-domain:point.lat', PERMINTAAN)
      const kedua = await palsu.analitik('sc-domain:point.lat', { ...PERMINTAAN, startRow: 25_000 })
      expect(pertama.status === 'berhasil' && pertama.baris.length).toBe(25_000)
      expect(kedua.status === 'berhasil' && kedua.baris.length).toBe(5_000)
      palsu.jawabAnalitik({ status: 'gagal', kodeHttp: 500, pesan: 'Galat.' })
      expect(await palsu.analitik('sc-domain:point.lat', PERMINTAAN)).toEqual({ status: 'gagal', kodeHttp: 500, pesan: 'Galat.' })
      expect(palsu.permintaan).toHaveLength(4)

      palsu.jawabanTautan.set('https://hilang.example/', { kodeHttp: 404, galat: null })
      expect(await palsu.periksaTautan('https://hilang.example/')).toEqual({ kodeHttp: 404, galat: null })
      expect(await palsu.periksaTautan('https://lain.example/')).toEqual({ kodeHttp: 200, galat: null })
      expect(palsu.dibuka).toEqual(['https://hilang.example/', 'https://lain.example/'])
      palsu.reset()
      expect([palsu.permintaan.length, palsu.dibuka.length, palsu.dataAnalitik]).toEqual([0, 0, null])
    })

    it('saklar INDEXER_ADAPTER yang sama dengan Mesin Indexing; asli tanpa akun layanan melewati Search Analytics', async () => {
      expect(modeAdapter({ INDEXER_ADAPTER: 'asli' })).toBe('asli')
      expect(modeAdapter({ INDEXER_ADAPTER: 'palsu', NODE_ENV: 'production' })).toBe('palsu')
      expect(modeAdapter({ NODE_ENV: 'test' })).toBe('palsu')
      expect(() => modeAdapter({ NODE_ENV: 'production' })).toThrow('INDEXER_ADAPTER wajib diisi di produksi')
      expect(await adapterDariEnv({ INDEXER_ADAPTER: 'asli' }).analitik('sc-domain:point.lat', PERMINTAAN)).toEqual({
        status: 'dilewati',
        pesan: 'Akun layanan Google belum diatur (env GOOGLE_SERVICE_ACCOUNT_JSON kosong).',
      })
      expect(await adapterDariEnv({ INDEXER_ADAPTER: 'palsu' }).analitik('sc-domain:point.lat', PERMINTAAN)).toMatchObject({ status: 'dilewati' })
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/pantau-adapter.test.ts` dengan `Error: Cannot find package '@/modules/pantau/adapter'`.

- [ ] **Langkah 3: Saklar bersama dan galat Google dari modul indexer**

  ```diff
  diff --git a/src/modules/indexer/adapter.ts b/src/modules/indexer/adapter.ts
  index 9ea098a..8f38d20 100644
  --- a/src/modules/indexer/adapter.ts
  +++ b/src/modules/indexer/adapter.ts
  @@ -41,12 +41,20 @@ export type AdapterIndexer = {
    * tidak pernah tertebak.
    */
   export function adapterDariEnv(env: Record<string, string | undefined> = process.env): AdapterIndexer {
  -  if (env.INDEXER_ADAPTER === 'asli') return adapterAsli({ akun: bacaAkunLayanan(env.GOOGLE_SERVICE_ACCOUNT_JSON) })
  -  if (env.INDEXER_ADAPTER === 'palsu') return adapterPalsu()
  +  return modeAdapter(env) === 'asli' ? adapterAsli({ akun: bacaAkunLayanan(env.GOOGLE_SERVICE_ACCOUNT_JSON) }) : adapterPalsu()
  +}
  +
  +/**
  + * Mode semua adapter layanan luar dari env `INDEXER_ADAPTER`: Mesin Indexing dan Pantau SEO (Search
  + * Analytics dan pemeriksa tautan) memakai saklar yang sama, jadi pratinjau dengan `palsu` tidak pernah
  + * menghubungi Google atau situs lain.
  + */
  +export function modeAdapter(env: Record<string, string | undefined> = process.env): 'asli' | 'palsu' {
  +  if (env.INDEXER_ADAPTER === 'asli' || env.INDEXER_ADAPTER === 'palsu') return env.INDEXER_ADAPTER
     if (env.NODE_ENV === 'production' && env.NEXT_PHASE !== 'phase-production-build') {
       throw new Error('INDEXER_ADAPTER wajib diisi di produksi: asli (situs live) atau palsu (pratinjau dan uji lokal).')
     }
  -  return adapterPalsu()
  +  return 'palsu'
   }
   
   let adapter: AdapterIndexer | undefined
  ```

  ```diff
  diff --git a/src/modules/indexer/asli.ts b/src/modules/indexer/asli.ts
  index d636d79..f6f234f 100644
  --- a/src/modules/indexer/asli.ts
  +++ b/src/modules/indexer/asli.ts
  @@ -13,13 +13,16 @@ export const URL_INSPEKSI = 'https://searchconsole.googleapis.com/v1/urlInspecti
   export const URL_INDEXING_API = 'https://indexing.googleapis.com/v3/urlNotifications:publish'
   export const URL_INDEXNOW = 'https://api.indexnow.org/indexnow'
   
  -type GalatGoogle = { error?: { code?: number; message?: string; status?: string } }
  +export type GalatGoogle = { error?: { code?: number; message?: string; status?: string } }
   
   const SARAN_403 =
     ' Pastikan email akun layanan terdaftar sebagai pemilik (Owner) properti di Search Console dan API-nya sudah diaktifkan di Google Cloud.'
   
  -/** Galat dari API Google. 429 atau `RESOURCE_EXHAUSTED` berarti kuota habis (ditunda ke hari berikutnya). */
  -function galatGoogle(kodeHttp: number, data: GalatGoogle): HasilPanggilan {
  +/**
  + * Galat dari API Google. 429 atau `RESOURCE_EXHAUSTED` berarti kuota habis (ditunda ke hari berikutnya).
  + * Dipakai juga adapter Search Analytics modul pantau.
  + */
  +export function galatGoogle(kodeHttp: number, data: GalatGoogle): Extract<HasilPanggilan, { status: 'gagal' }> {
     const pesan = data.error?.message?.slice(0, 300).replace(/\.$/, '')
     const kuotaHabis = kodeHttp === 429 || data.error?.status === 'RESOURCE_EXHAUSTED'
     return {
  ```

- [ ] **Langkah 4: Seam, adapter asli, dan adapter palsu**

  `src/modules/pantau/adapter.ts`

  ```ts
  import { modeAdapter } from '@/modules/indexer/adapter'
  import { bacaAkunLayanan } from '@/modules/indexer/google'

  import { adapterAsli } from './asli'
  import { adapterPalsu } from './palsu'
  import type { BarisAnalitik, JawabanTautan, PermintaanAnalitik } from './tipe'

  /** Jawaban satu permintaan Search Analytics. `dilewati`: tidak dipanggil (akun layanan belum diatur, atau adapter palsu). */
  export type HasilAnalitik =
    | { status: 'berhasil'; baris: BarisAnalitik[] }
    | { status: 'gagal'; kodeHttp: number | null; pesan: string; kuotaHabis?: boolean }
    | { status: 'dilewati'; pesan: string }

  /**
   * Seam modul pantau: dua panggilan ke luar dengan versi asli (`asli.ts`, lewat `fetch`) dan palsu
   * (`palsu.ts`, dalam memori untuk tes dan dev). Keduanya tidak pernah melempar galat.
   */
  export type AdapterPantau = {
    /** `searchanalytics.query`: satu halaman jawaban (paling banyak `rowLimit` baris mulai `startRow`). */
    analitik(properti: string, permintaan: PermintaanAnalitik): Promise<HasilAnalitik>
    /** Membuka satu URL situs lain (HEAD, atau GET bila HEAD ditolak) dengan batas waktu. */
    periksaTautan(url: string): Promise<JawabanTautan>
  }

  /** Adapter dari env server, dengan saklar yang sama dengan Mesin Indexing (`INDEXER_ADAPTER`). */
  export function adapterDariEnv(env: Record<string, string | undefined> = process.env): AdapterPantau {
    return modeAdapter(env) === 'asli' ? adapterAsli({ akun: bacaAkunLayanan(env.GOOGLE_SERVICE_ACCOUNT_JSON) }) : adapterPalsu()
  }

  let adapter: AdapterPantau | undefined

  /** Adapter bersama untuk satu proses. Tes menggantinya lewat `pakaiAdapterPantau`. */
  export function adapterPantau(): AdapterPantau {
    adapter ??= adapterDariEnv()
    return adapter
  }

  /** Mengganti adapter (tes). `null` kembali ke adapter dari env. */
  export function pakaiAdapterPantau(baru: AdapterPantau | null): void {
    adapter = baru ?? undefined
  }
  ```

  `src/modules/pantau/asli.ts`

  ```ts
  import { galatGoogle, URL_SEARCH_CONSOLE, type GalatGoogle } from '@/modules/indexer/asli'
  import { BATAS_TUNGGU_MS, penyediaToken, SCOPE_WEBMASTERS, type AkunLayanan, type Fetch } from '@/modules/indexer/google'

  import type { AdapterPantau, HasilAnalitik } from './adapter'
  import { BATAS_TUNGGU_TAUTAN_MS } from './aturan'
  import type { BarisAnalitik, JawabanTautan } from './tipe'

  /**
   * Adapter asli (lewat `fetch`, tanpa pustaka Google). Search Analytics memakai akun layanan dan token
   * yang sama dengan Mesin Indexing (`google.ts`); bentuk permintaan dan jawaban mengikuti dokumentasi
   * `searchanalytics.query`. Pemeriksa tautan membuka URL dengan HEAD, lalu GET bila HEAD ditolak.
   */

  export const urlAnalitik = (properti: string) => `${URL_SEARCH_CONSOLE}/sites/${encodeURIComponent(properti)}/searchAnalytics/query`

  /** Identitas pemeriksa tautan di log server situs lain. */
  export const AGEN_PEMERIKSA = 'Mozilla/5.0 (compatible; point.lat-pemeriksa-tautan/1.0; +https://point.lat)'

  /** HEAD ditolak sebagian server (tidak didukung atau diblokir); dicoba sekali lagi dengan GET. */
  const ULANG_DENGAN_GET = new Set([403, 405, 501])

  export type OpsiAdapterAsli = {
    akun: AkunLayanan | { alasan: string }
    fetch?: Fetch
    sekarang?: () => number
  }

  export function adapterAsli(opsi: OpsiAdapterAsli): AdapterPantau {
    const ambil = opsi.fetch ?? fetch
    const token = 'alasan' in opsi.akun ? null : penyediaToken(opsi.akun, { fetch: ambil, sekarang: opsi.sekarang })
    const alasan = 'alasan' in opsi.akun ? opsi.akun.alasan : ''

    async function buka(url: string, method: 'HEAD' | 'GET'): Promise<number> {
      const jawaban = await ambil(url, {
        method,
        redirect: 'follow',
        headers: { 'User-Agent': AGEN_PEMERIKSA },
        signal: AbortSignal.timeout(BATAS_TUNGGU_TAUTAN_MS),
      })
      // Isi halaman tidak dibutuhkan, hanya kodenya.
      await jawaban.body?.cancel().catch(() => undefined)
      return jawaban.status
    }

    return {
      async analitik(properti, permintaan): Promise<HasilAnalitik> {
        if (!token) return { status: 'dilewati', pesan: alasan }
        const akses = await token(SCOPE_WEBMASTERS)
        if ('galat' in akses) return { status: 'gagal', kodeHttp: akses.kodeHttp, pesan: akses.galat }
        try {
          const jawaban = await ambil(urlAnalitik(properti), {
            method: 'POST',
            headers: { Authorization: `Bearer ${akses.token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(permintaan),
            signal: AbortSignal.timeout(BATAS_TUNGGU_MS),
          })
          const data = (await jawaban.json().catch(() => ({}))) as { rows?: BarisAnalitik[] } & GalatGoogle
          if (!jawaban.ok) return galatGoogle(jawaban.status, data)
          return { status: 'berhasil', baris: Array.isArray(data.rows) ? data.rows : [] }
        } catch (galat) {
          return { status: 'gagal', kodeHttp: null, pesan: `Tidak bisa menghubungi Google: ${(galat as Error).message}.` }
        }
      },

      async periksaTautan(url): Promise<JawabanTautan> {
        try {
          let kodeHttp = await buka(url, 'HEAD')
          if (ULANG_DENGAN_GET.has(kodeHttp)) kodeHttp = await buka(url, 'GET')
          return { kodeHttp, galat: null }
        } catch (galat) {
          const g = galat as Error & { cause?: { code?: string } }
          return { kodeHttp: null, galat: g.message, kodeGalat: g.name === 'TimeoutError' ? 'TimeoutError' : (g.cause?.code ?? null) }
        }
      },
    }
  }
  ```

  `src/modules/pantau/palsu.ts`

  ```ts
  import type { AdapterPantau, HasilAnalitik } from './adapter'
  import type { BarisAnalitik, JawabanTautan, PermintaanAnalitik } from './tipe'

  export type AdapterPantauPalsu = AdapterPantau & {
    /** Semua permintaan Search Analytics, berurutan. */
    readonly permintaan: { properti: string; permintaan: PermintaanAnalitik }[]
    /** Semua URL yang dibuka pemeriksa tautan, berurutan. */
    readonly dibuka: string[]
    /**
     * Data Search Analytics: semua baris untuk satu permintaan (adapter memotongnya sesuai `startRow` dan
     * `rowLimit`). `null` (bawaan): permintaan dilewati, seperti situs tanpa akun layanan.
     */
    dataAnalitik: ((permintaan: PermintaanAnalitik) => BarisAnalitik[]) | null
    /** Jawaban pemeriksa tautan per URL. URL lain: 200. */
    readonly jawabanTautan: Map<string, JawabanTautan>
    /** Jawaban Search Analytics berikutnya, berurutan, mendahului `dataAnalitik` (untuk galat). */
    jawabAnalitik(...hasil: HasilAnalitik[]): void
    reset(): void
  }

  /**
   * Adapter dalam memori untuk tes dan pengembangan. Tidak memanggil jaringan. Tanpa `dataAnalitik`,
   * sinkron Search Analytics dilewati, jadi data yang sudah tersimpan (misalnya data contoh E2E) tidak
   * tertimpa data kosong.
   */
  export function adapterPalsu(): AdapterPantauPalsu {
    const permintaan: AdapterPantauPalsu['permintaan'] = []
    const dibuka: string[] = []
    const jawabanTautan = new Map<string, JawabanTautan>()
    const antrean: HasilAnalitik[] = []

    const palsu: AdapterPantauPalsu = {
      permintaan,
      dibuka,
      jawabanTautan,
      dataAnalitik: null,
      jawabAnalitik(...hasil) {
        antrean.push(...hasil)
      },
      reset() {
        permintaan.length = 0
        dibuka.length = 0
        jawabanTautan.clear()
        antrean.length = 0
        palsu.dataAnalitik = null
      },
      async analitik(properti, p) {
        permintaan.push({ properti, permintaan: p })
        const berikut = antrean.shift()
        if (berikut) return berikut
        if (!palsu.dataAnalitik) return { status: 'dilewati', pesan: 'Adapter palsu tidak mengambil data Search Console.' }
        return { status: 'berhasil', baris: palsu.dataAnalitik(p).slice(p.startRow, p.startRow + p.rowLimit) }
      },
      async periksaTautan(url) {
        dibuka.push(url)
        return jawabanTautan.get(url) ?? { kodeHttp: 200, galat: null }
      },
    }
    return palsu
  }
  ```

- [ ] **Langkah 5: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 58 passed (58)`, `Tests 401 passed (401)`; integrasi `Test Files 32 passed (32)`, `Tests 98 passed (98)`; E2E `91 passed`.

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/modules/indexer/adapter.ts src/modules/indexer/asli.ts src/modules/pantau tests/unit/pantau-adapter.test.ts
  git commit -m "feat(pantau): adapter Search Analytics dan pemeriksa tautan lewat fetch dengan akun layanan yang sama, adapter palsu, dan saklar INDEXER_ADAPTER bersama"
  ```

---

### Task 3: Sinkron Search Analytics harian lewat cron, klaim tugas atomik, dan retensi

**Files:**
- Create: `src/collections/AnalitikHalaman.ts`, `src/collections/AnalitikSitus.ts`, `src/collections/TugasSeo.ts`, `src/modules/pantau/tugas.ts`, `src/modules/pantau/analitik.ts`, `src/modules/pantau/index.ts`
- Modify: `src/payload.config.ts`, `src/lib/tag.ts`, `src/modules/indexer/endpoint.ts`, `src/scripts/jalankan-indexer.ts`, `src/payload-types.ts` (dibuat ulang), `tests/e2e/siapkan.ts`
- Test: `tests/int/pantau-analitik.int.spec.ts`

**Interfaces:**
- Consumes: aturan dan tipe (Task 1), `AdapterPantau`, `adapterPantau`, `adapterPalsu` (Task 2), `ambilPengaturanIndexing` (`indexer/antrean.ts`, memberi `urlSitus` dan `propertiSearchConsole`), `revalidasi` (`src/hooks/revalidasiPublik.ts`), `isAdmin` dan `nobody` (`src/access`).
- Produces:
  - Koleksi tersembunyi (`admin.hidden`, baca dan hapus admin, tulis hanya sistem): `analitik-halaman` (`path` unik, `klik28`, `impresi28`, `ctr28`, `posisi28`, `klik7`, `impresi7`, `sampai`), `analitik-situs` (`tanggal` unik, `klik`, `impresi`, `ctr`, `posisi`), `tugas-seo` (`jenis` unik, `status`, `mulai`, `selesai`, `berikutnya`, `pesan`, `versi`).
  - `TAG.analitik` (`'analitik'`), dibuang setiap sinkron berhasil.
  - `tugas.ts`: `klaimTugas(payload, jenis, sekarang): KlaimTugas | null`, `selesaikanTugas(payload, klaim, hasil, sekarang)`.
  - `analitik.ts`: `kueriSemua(adapter, properti, permintaan)`, `sinkronAnalitik(payload, adapter, pengaturan, sekarang)`, `hapusDataLama(payload, sekarang)`.
  - `@/modules/pantau`: `jalankanPantau(payload, { sekarang?, adapter? }): Promise<RingkasanPantau>`; ekspor ulang `adapterPantau`, `pakaiAdapterPantau`, `adapterPalsu`, tipe `AdapterPantau`, `HasilAnalitik`, `AdapterPantauPalsu`, `JenisTugas`, `RingkasanHalaman`, `StatusTugas`. Task 5 menambah opsi `tugas`.
  - `jalankanJadwal(payload, { sekarang?, adapter?, adapterPantau? })` menjawab `{ jadwalTerbit, indexer, pantau }`.

Sinkron berjalan sekali sehari dari cron yang sudah ada (`GET /api/jobs/run` setiap 10 menit, setelah antrean Mesin Indexing). Satu baris `tugas-seo` per jenis tugas menyimpan jadwal berikutnya; cron mengklaimnya secara atomik (`INSERT ... ON CONFLICT (jenis) DO NOTHING` lalu `UPDATE ... WHERE berikutnya <= sekarang RETURNING`, sewa 15 menit), jadi cron yang terkirim dua kali tidak menjalankan sinkron dua kali, dan proses yang berhenti di tengah jalan dicoba lagi setelah sewa habis. Klaim lewat `payload.find` lalu `payload.update` tidak cukup: probe menjalankan tes "dua pelari bersamaan" dengan cara itu dan gagal 3 dari 3 kali.

Sinkron meminta total harian 35 hari sampai kemarin (waktu Pasifik, data final). Data Search Console baru final 2 sampai 3 hari kemudian, jadi tanggal terakhir yang berisi menjadi akhir ringkasan 28 dan 7 hari per halaman. Hasilnya disimpan dalam satu transaksi lewat adapter database Payload (`payload.db.upsert`, `deleteMany`, `create`), supaya beranda dan dashboard tidak pernah membaca tabel setengah terisi. Bila Google tidak dipanggil (akun layanan belum diatur, adapter palsu) atau gagal, data lama tidak disentuh dan pesannya tercatat di `tugas-seo`. Setiap tugas harian ini juga menghapus log indexing lebih dari 90 hari dan total harian lebih dari 480 hari.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/int/pantau-analitik.int.spec.ts`

  ```ts
  import type { Payload } from 'payload'
  import { beforeEach, describe, expect, it } from 'vitest'

  import { jalankanJadwal } from '@/modules/indexer/endpoint'
  import { adapterPalsu as adapterIndexerPalsu } from '@/modules/indexer/palsu'
  import { adapterPalsu, jalankanPantau } from '@/modules/pantau'
  import { kueriSemua } from '@/modules/pantau/analitik'
  import { permintaanAnalitik } from '@/modules/pantau/aturan'
  import type { BarisAnalitik, PermintaanAnalitik } from '@/modules/pantau/tipe'

  import { getTestPayload } from './helpers'

  /** 5 November 03.00 UTC = 4 November malam waktu Pasifik; data final terakhir 2 November. */
  const T0 = new Date('2026-11-05T03:00:00.000Z')
  const jam = (n: number) => new Date(T0.getTime() + n * 3_600_000)
  const palsu = adapterPalsu()

  const baris = (kunci: string, clicks: number, impressions: number, position: number): BarisAnalitik => ({
    keys: [kunci],
    clicks,
    impressions,
    ctr: clicks / impressions,
    position,
  })

  /** Search Console tiruan: total harian, lalu halaman untuk 28 hari (mulai 6 Oktober) dan 7 hari (mulai 27 Oktober). */
  const dataContoh = (p: PermintaanAnalitik): BarisAnalitik[] => {
    if (p.dimensions[0] === 'date') return [baris('2026-11-01', 4, 100, 10), baris('2026-11-02', 6, 300, 6)]
    if (p.startDate === '2026-10-06') return [baris('https://point.lat/b', 30, 600, 2.5), baris('https://point.lat/a/', 5, 50, 4)]
    return [baris('https://point.lat/a', 2, 20, 3)]
  }

  async function kosongkan(payload: Payload) {
    for (const collection of ['tugas-seo', 'analitik-halaman', 'analitik-situs'] as const) {
      await payload.delete({ collection, where: { id: { exists: true } } })
    }
    palsu.reset()
  }

  async function halaman(payload: Payload) {
    const { docs } = await payload.find({ collection: 'analitik-halaman', sort: '-klik28', limit: 100, depth: 0 })
    return docs.map(({ path, klik7, impresi7, klik28, impresi28, ctr28, posisi28, sampai }) => ({ path, klik7, impresi7, klik28, impresi28, ctr28, posisi28, sampai }))
  }

  async function situs(payload: Payload) {
    const { docs } = await payload.find({ collection: 'analitik-situs', sort: 'tanggal', limit: 100, depth: 0 })
    return docs.map((d) => `${d.tanggal} ${d.klik}/${d.impresi}`)
  }

  async function tugas(payload: Payload) {
    const { docs } = await payload.find({ collection: 'tugas-seo', where: { jenis: { equals: 'analitik' } }, limit: 1, depth: 0 })
    return docs[0]
  }

  const jalan = (payload: Payload, waktu: Date) => jalankanPantau(payload, { sekarang: waktu, adapter: palsu })

  describe('sinkron Search Analytics harian', () => {
    beforeEach(async () => {
      await kosongkan(await getTestPayload())
    })

    it('total per hari, ringkasan 28 dan 7 hari per path, status Berhasil, dan jadwal berikutnya awal hari Pasifik', async () => {
      const payload = await getTestPayload()
      palsu.dataAnalitik = dataContoh
      expect(await jalan(payload, T0)).toEqual({ analitik: { status: 'berhasil', pesan: 'Data sampai 2026-11-02: 2 halaman, 35 klik dalam 28 hari.' } })
      expect(palsu.permintaan.map((p) => [p.properti, p.permintaan.dimensions[0], p.permintaan.startDate, p.permintaan.endDate, p.permintaan.startRow])).toEqual([
        ['sc-domain:point.lat', 'date', '2026-09-30', '2026-11-03', 0],
        ['sc-domain:point.lat', 'page', '2026-10-06', '2026-11-02', 0],
        ['sc-domain:point.lat', 'page', '2026-10-27', '2026-11-02', 0],
      ])
      expect(await halaman(payload)).toEqual([
        { path: '/b', klik7: 0, impresi7: 0, klik28: 30, impresi28: 600, ctr28: 0.05, posisi28: 2.5, sampai: '2026-11-02' },
        { path: '/a', klik7: 2, impresi7: 20, klik28: 5, impresi28: 50, ctr28: 0.1, posisi28: 4, sampai: '2026-11-02' },
      ])
      expect(await situs(payload)).toEqual(['2026-11-01 4/100', '2026-11-02 6/300'])
      expect(await tugas(payload)).toMatchObject({
        status: 'berhasil',
        mulai: T0.toISOString(),
        selesai: T0.toISOString(),
        berikutnya: '2026-11-05T08:00:00.000Z',
      })
    })

    it('tidak berjalan lagi sebelum jadwal; sinkron berikutnya mengganti ringkasan dan memperbarui total harian tanpa baris ganda', async () => {
      const payload = await getTestPayload()
      palsu.dataAnalitik = dataContoh
      await jalan(payload, T0)
      expect(await jalan(payload, jam(1))).toEqual({})
      expect(palsu.permintaan).toHaveLength(3)

      palsu.dataAnalitik = (p) =>
        p.dimensions[0] === 'date'
          ? [baris('2026-11-02', 7, 310, 6), baris('2026-11-03', 1, 50, 9)]
          : [baris('https://point.lat/a', 8, 80, 3)]
      expect((await jalan(payload, jam(6))).analitik?.status).toBe('berhasil')
      expect((await halaman(payload)).map((h) => [h.path, h.klik28, h.sampai])).toEqual([['/a', 8, '2026-11-03']])
      expect(await situs(payload)).toEqual(['2026-11-01 4/100', '2026-11-02 7/310', '2026-11-03 1/50'])
    })

    it('dilewati dan gagal tidak menyentuh data lama; gagal dicoba lagi sejam kemudian, kuota habis besok', async () => {
      const payload = await getTestPayload()
      palsu.dataAnalitik = dataContoh
      await jalan(payload, T0)
      const sebelum = await halaman(payload)

      palsu.dataAnalitik = null
      expect(await jalan(payload, jam(6))).toEqual({ analitik: { status: 'dilewati', pesan: 'Adapter palsu tidak mengambil data Search Console.' } })
      expect(await tugas(payload)).toMatchObject({ status: 'dilewati', berikutnya: '2026-11-06T08:00:00.000Z' })

      palsu.jawabAnalitik({ status: 'gagal', kodeHttp: 503, pesan: 'Google menjawab 503.' })
      expect(await jalan(payload, jam(30))).toEqual({ analitik: { status: 'gagal', pesan: 'Google menjawab 503.' } })
      expect((await tugas(payload))?.berikutnya).toBe(jam(31).toISOString())

      palsu.jawabAnalitik({ status: 'gagal', kodeHttp: 429, kuotaHabis: true, pesan: 'Google menjawab 429: quota exceeded.' })
      expect((await jalan(payload, jam(31))).analitik?.status).toBe('gagal')
      expect((await tugas(payload))?.berikutnya).toBe('2026-11-07T08:00:00.000Z')
      expect(await halaman(payload)).toEqual(sebelum)
    })

    it('tanpa data final 35 hari: ringkasan halaman dikosongkan dan pesannya menjelaskan', async () => {
      const payload = await getTestPayload()
      palsu.dataAnalitik = dataContoh
      await jalan(payload, T0)
      palsu.dataAnalitik = () => []
      expect(await jalan(payload, jam(6))).toEqual({
        analitik: { status: 'berhasil', pesan: 'Search Console belum punya data final untuk 35 hari terakhir.' },
      })
      expect(await halaman(payload)).toEqual([])
    })

    it('dua pelari bersamaan (cron terkirim dua kali): tugas hanya berjalan sekali', async () => {
      const payload = await getTestPayload()
      palsu.dataAnalitik = dataContoh
      const hasil = await Promise.all([jalan(payload, T0), jalan(payload, T0)])
      expect(hasil.filter((h) => h.analitik)).toHaveLength(1)
      expect(palsu.permintaan).toHaveLength(3)
      expect(await halaman(payload)).toHaveLength(2)
    })

    it('retensi harian: log indexing lebih dari 90 hari dan total harian lebih dari 16 bulan dihapus', async () => {
      const payload = await getTestPayload()
      const log = (hari: number, url: string) =>
        payload.create({
          collection: 'log-indexing',
          data: { url, langkah: 'revalidasi', adapter: 'next', status: 'berhasil', pesan: 'Tes retensi.', percobaan: 1, waktu: new Date(T0.getTime() - hari * 86_400_000).toISOString() },
        })
      const lama = await log(91, 'https://point.lat/retensi-lama')
      const baru = await log(89, 'https://point.lat/retensi-baru')
      for (const tanggal of ['2025-07-11', '2025-07-12']) {
        await payload.create({ collection: 'analitik-situs', data: { tanggal, klik: 1, impresi: 1, ctr: 1, posisi: 1 } })
      }
      await jalan(payload, T0)
      const ada = await payload.find({ collection: 'log-indexing', where: { id: { in: [lama.id, baru.id] } }, depth: 0 })
      expect(ada.docs.map((d) => d.url)).toEqual(['https://point.lat/retensi-baru'])
      expect(await situs(payload)).toEqual(['2025-07-12 1/1'])
      await payload.delete({ collection: 'log-indexing', where: { id: { equals: baru.id } } })
    })

    it('cron GET /api/jobs/run ikut menjalankan Pantau SEO', async () => {
      const payload = await getTestPayload()
      const hasil = await jalankanJadwal(payload, { sekarang: T0, adapter: adapterIndexerPalsu(), adapterPantau: palsu })
      expect(hasil.pantau).toEqual({ analitik: { status: 'dilewati', pesan: 'Adapter palsu tidak mengambil data Search Console.' } })
    })

    it('kueri berhalaman: startRow 0, lalu 25.000, sampai jawaban kurang dari 25.000 baris', async () => {
      const lokal = adapterPalsu()
      lokal.dataAnalitik = () => Array.from({ length: 30_000 }, (_, i) => baris(`https://point.lat/${i}`, 1, 1, 1))
      const hasil = await kueriSemua(lokal, 'sc-domain:point.lat', permintaanAnalitik({ startDate: '2026-10-06', endDate: '2026-11-02' }, 'page'))
      expect(hasil.status === 'berhasil' && hasil.baris.length).toBe(30_000)
      expect(lokal.permintaan.map((p) => p.permintaan.startRow)).toEqual([0, 25_000])
    })

    it('operasi massal di koleksi Pantau SEO: dua baris atau lebih diubah dan dihapus dalam satu operasi', async () => {
      const payload = await getTestPayload()
      palsu.dataAnalitik = dataContoh
      await jalan(payload, T0)
      await payload.create({ collection: 'tugas-seo', data: { jenis: 'tautan', berikutnya: T0.toISOString() } })
      const ubah = await payload.update({ collection: 'tugas-seo', where: { id: { exists: true } }, data: { berikutnya: jam(2).toISOString() } })
      expect(ubah.errors).toEqual([])
      expect(ubah.docs).toHaveLength(2)
      for (const collection of ['analitik-halaman', 'analitik-situs', 'tugas-seo'] as const) {
        const hapus = await payload.delete({ collection, where: { id: { exists: true } } })
        expect(hapus.errors).toEqual([])
        expect(hapus.docs.length).toBeGreaterThanOrEqual(2)
      }
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm test:int
  ```

  Hasil yang diharapkan: FAIL di `tests/int/pantau-analitik.int.spec.ts` dengan `Error: Cannot find package '@/modules/pantau'`.

- [ ] **Langkah 3: Koleksi, tag, dan konfigurasi**

  `src/collections/AnalitikHalaman.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isAdmin, nobody } from '@/access'

  /**
   * Klik, impresi, CTR, dan posisi per path dari Search Analytics (spesifikasi §8 "Dashboard SEO"):
   * ringkasan 28 hari dan klik 7 hari sampai tanggal terakhir yang datanya final (`sampai`). Diganti
   * seluruhnya setiap sinkron harian modul pantau; path yang tidak lagi muncul di laporan ikut hilang.
   * Dibaca dashboard SEO dan blok "Paling dibaca pekan ini" (lewat modul konten).
   */
  export const AnalitikHalaman: CollectionConfig = {
    slug: 'analitik-halaman',
    labels: { singular: 'Performa halaman', plural: 'Performa halaman' },
    defaultSort: '-klik28',
    admin: { useAsTitle: 'path', group: 'SEO', hidden: true },
    access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
    fields: [
      { name: 'path', type: 'text', required: true, unique: true, index: true },
      { name: 'klik28', type: 'number', required: true, index: true },
      { name: 'impresi28', type: 'number', required: true },
      { name: 'ctr28', type: 'number', required: true, admin: { description: 'Rasio klik per impresi, 0 sampai 1.' } },
      { name: 'posisi28', type: 'number', required: true },
      { name: 'klik7', type: 'number', required: true, index: true },
      { name: 'impresi7', type: 'number', required: true },
      { name: 'sampai', type: 'text', required: true, admin: { description: 'Tanggal terakhir data (YYYY-MM-DD, waktu Pasifik).' } },
    ],
  }
  ```

  `src/collections/AnalitikSitus.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isAdmin, nobody } from '@/access'

  /**
   * Total klik, impresi, CTR, dan posisi seluruh properti per hari (Search Analytics dimensi `date`),
   * untuk ringkasan dan grafik dashboard SEO. Disimpan 16 bulan seperti riwayat Search Console.
   */
  export const AnalitikSitus: CollectionConfig = {
    slug: 'analitik-situs',
    labels: { singular: 'Performa situs harian', plural: 'Performa situs harian' },
    defaultSort: '-tanggal',
    admin: { useAsTitle: 'tanggal', group: 'SEO', hidden: true },
    access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
    fields: [
      { name: 'tanggal', type: 'text', required: true, unique: true, index: true, admin: { description: 'YYYY-MM-DD, waktu Pasifik.' } },
      { name: 'klik', type: 'number', required: true },
      { name: 'impresi', type: 'number', required: true },
      { name: 'ctr', type: 'number', required: true },
      { name: 'posisi', type: 'number', required: true },
    ],
  }
  ```

  `src/collections/TugasSeo.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isAdmin, nobody } from '@/access'
  import { JENIS_TUGAS, LABEL_STATUS_TUGAS, LABEL_TUGAS, STATUS_TUGAS } from '@/modules/pantau/tipe'

  /**
   * Tugas berkala Pantau SEO (satu baris per jenis): kapan terakhir berjalan, hasilnya, dan kapan
   * berikutnya. Cron mengklaim baris ini secara atomik, jadi cron yang terkirim dua kali tidak menjalankan
   * tugas yang sama dua kali. Hasilnya tampil di dashboard SEO.
   */
  export const TugasSeo: CollectionConfig = {
    slug: 'tugas-seo',
    labels: { singular: 'Tugas SEO', plural: 'Tugas SEO' },
    admin: { useAsTitle: 'jenis', group: 'SEO', hidden: true },
    access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
    fields: [
      { name: 'jenis', type: 'select', required: true, unique: true, options: JENIS_TUGAS.map((value) => ({ value, label: LABEL_TUGAS[value] })) },
      { name: 'status', type: 'select', options: STATUS_TUGAS.map((value) => ({ value, label: LABEL_STATUS_TUGAS[value] })) },
      { name: 'mulai', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'selesai', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'berikutnya', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'pesan', type: 'textarea' },
      { name: 'versi', type: 'number', defaultValue: 0, admin: { hidden: true } },
    ],
  }
  ```

  ```diff
  diff --git a/src/payload.config.ts b/src/payload.config.ts
  index 24a8847..0684ccb 100644
  --- a/src/payload.config.ts
  +++ b/src/payload.config.ts
  @@ -5,6 +5,8 @@ import { buildConfig } from 'payload'
   import sharp from 'sharp'
   import { fileURLToPath } from 'url'
   
  +import { AnalitikHalaman } from './collections/AnalitikHalaman'
  +import { AnalitikSitus } from './collections/AnalitikSitus'
   import { AntreanIndexing } from './collections/AntreanIndexing'
   import { Artikel } from './collections/Artikel'
   import { Halaman } from './collections/Halaman'
  @@ -19,6 +21,7 @@ import { Redirect } from './collections/Redirect'
   import { StatusIndeks } from './collections/StatusIndeks'
   import { Subkategori } from './collections/Subkategori'
   import { Tools } from './collections/Tools'
  +import { TugasSeo } from './collections/TugasSeo'
   import { Video } from './collections/Video'
   import { Beranda } from './globals/Beranda'
   import { Footer } from './globals/Footer'
  @@ -53,9 +56,12 @@ export default buildConfig({
       AntreanIndexing,
       LogIndexing,
       StatusIndeks,
  +    AnalitikHalaman,
  +    AnalitikSitus,
  +    TugasSeo,
     ],
     globals: [Header, Footer, Beranda, PengaturanSEO, Newsletter],
  -  // `GET /api/jobs/run`: cron Vercel setiap 10 menit (vercel.json), jadwal terbit dan Mesin Indexing.
  +  // `GET /api/jobs/run`: cron Vercel setiap 10 menit (vercel.json), jadwal terbit, Mesin Indexing, dan Pantau SEO.
     endpoints: [endpointJalankanJob],
     editor: lexicalEditor(),
     secret: process.env.PAYLOAD_SECRET || '',
  ```

  ```diff
  diff --git a/src/lib/tag.ts b/src/lib/tag.ts
  index 15babc8..5b9950e 100644
  --- a/src/lib/tag.ts
  +++ b/src/lib/tag.ts
  @@ -10,6 +10,7 @@
    * - `media`: dokumen media (alt, caption, kredit, ukuran) yang ditampilkan halaman.
    * - `redirect`: tabel redirect yang dibaca halaman saat path tidak cocok dengan dokumen.
    * - `parameter-tools`: angka aturan kalkulator yang dibaca halaman `/tools/{slug}`.
  + * - `analitik`: klik Search Console per halaman ("Paling dibaca pekan ini"), dibuang setiap sinkron harian.
    */
   
   export const KOLEKSI_PUBLIK = ['artikel', 'pilar', 'subkategori', 'penulis', 'tools', 'video', 'halaman'] as const
  @@ -24,6 +25,7 @@ export const TAG = {
     media: 'media',
     redirect: 'redirect',
     parameterTools: 'parameter-tools',
  +  analitik: 'analitik',
     koleksi: (koleksi: KoleksiPublik) => koleksi,
     dokumen: (koleksi: KoleksiPublik, id: number | string) => `${koleksi}:${id}`,
     pilar: (slug: string) => `pilar:${slug}`,
  ```

- [ ] **Langkah 4: Klaim tugas, sinkron, dan `jalankanPantau`**

  `src/modules/pantau/tugas.ts`

  ```ts
  import { sql } from '@payloadcms/db-postgres'
  import type { Payload } from 'payload'

  import { MENIT } from '@/modules/indexer/aturan'

  import type { JenisTugas, StatusTugas } from './tipe'

  /** Sewa tugas yang sedang berjalan; bila proses berhenti di tengah jalan, tugas dicoba lagi setelahnya. */
  const SEWA_MS = 15 * MENIT

  export type KlaimTugas = { id: number; versi: number }

  /**
   * Mengklaim tugas yang sudah jatuh tempo (`berikutnya <= sekarang`), atau `null` bila belum jatuh tempo
   * atau sedang dijalankan proses lain. Baris dibuat sekali lewat `INSERT ... ON CONFLICT DO NOTHING`
   * (jatuh tempo saat itu juga), lalu diklaim dengan satu `UPDATE ... RETURNING` supaya dua cron yang
   * berjalan bersamaan tidak sama-sama menang (pola yang sama dengan klaim antrean Mesin Indexing).
   */
  export async function klaimTugas(payload: Payload, jenis: JenisTugas, sekarang: Date): Promise<KlaimTugas | null> {
    const db = payload.db.drizzle
    await db.execute(sql`
      insert into tugas_seo (jenis, berikutnya, versi) values (${jenis}, ${sekarang.toISOString()}, 0)
      on conflict (jenis) do nothing`)
    const { rows } = await db.execute(sql`
      update tugas_seo set status = 'berjalan', mulai = ${sekarang.toISOString()}, versi = versi + 1, updated_at = now(),
        berikutnya = ${new Date(sekarang.getTime() + SEWA_MS).toISOString()}
      where jenis = ${jenis} and berikutnya <= ${sekarang.toISOString()}
      returning id, versi`)
    const baris = rows[0] as { id: number; versi: number } | undefined
    return baris ? { id: Number(baris.id), versi: Number(baris.versi) } : null
  }

  /** Mencatat hasil tugas yang sudah diklaim dan jadwal berikutnya. */
  export async function selesaikanTugas(
    payload: Payload,
    klaim: KlaimTugas,
    hasil: { status: Exclude<StatusTugas, 'berjalan'>; pesan: string; berikutnya: Date },
    sekarang: Date,
  ): Promise<void> {
    await payload.update({
      collection: 'tugas-seo',
      where: { and: [{ id: { equals: klaim.id } }, { versi: { equals: klaim.versi } }] },
      data: { status: hasil.status, pesan: hasil.pesan, selesai: sekarang.toISOString(), berikutnya: hasil.berikutnya.toISOString() },
      depth: 0,
    })
  }
  ```

  `src/modules/pantau/analitik.ts`

  ```ts
  import type { Payload, PayloadRequest } from 'payload'

  import { revalidasi } from '@/hooks/revalidasiPublik'
  import { TAG } from '@/lib/tag'
  import { HARI } from '@/modules/indexer/aturan'
  import type { PengaturanIndexing } from '@/modules/indexer/tipe'

  import type { AdapterPantau, HasilAnalitik } from './adapter'
  import {
    BARIS_PER_PERMINTAAN,
    geserTanggal,
    HARI_PEKAN,
    HARI_RINGKASAN,
    hariSitus,
    MAKS_PERMINTAAN_PER_KUERI,
    permintaanAnalitik,
    RENTANG_HARIAN,
    rentang,
    rentangHarian,
    RETENSI_ANALITIK_SITUS_HARI,
    RETENSI_LOG_INDEXING_HARI,
    ringkasHalaman,
    tanggalPasifik,
    type HasilTugas,
  } from './aturan'
  import type { BarisAnalitik, HariSitus, PermintaanAnalitik, RingkasanHalaman } from './tipe'

  /**
   * Semua baris satu kueri: halaman berikutnya diminta dengan `startRow` + 25.000 sampai jawaban berisi
   * kurang dari 25.000 baris (dokumentasi "Getting all your data"), paling banyak empat permintaan.
   */
  export async function kueriSemua(adapter: AdapterPantau, properti: string, permintaan: PermintaanAnalitik): Promise<HasilAnalitik> {
    const baris: BarisAnalitik[] = []
    for (let i = 0; i < MAKS_PERMINTAAN_PER_KUERI; i++) {
      const hasil = await adapter.analitik(properti, { ...permintaan, startRow: i * BARIS_PER_PERMINTAAN })
      if (hasil.status !== 'berhasil') return hasil
      baris.push(...hasil.baris)
      if (hasil.baris.length < BARIS_PER_PERMINTAAN) break
    }
    return { status: 'berhasil', baris }
  }

  export type HasilSinkron = { hasil: HasilTugas; pesan: string }

  const gagal = (h: Exclude<HasilAnalitik, { status: 'berhasil' }>): HasilSinkron =>
    h.status === 'dilewati' ? { hasil: 'dilewati', pesan: h.pesan } : { hasil: h.kuotaHabis ? 'kuota-habis' : 'gagal', pesan: h.pesan }

  /**
   * Menyimpan hasil sinkron dalam satu transaksi: total harian di-upsert per tanggal, ringkasan per
   * halaman diganti seluruhnya. Pembaca (dashboard, beranda) tidak pernah melihat tabel setengah terisi.
   */
  async function simpan(payload: Payload, hari: HariSitus[], halaman: RingkasanHalaman[], sampai: string | null): Promise<void> {
    const transaksi = await payload.db.beginTransaction()
    const req: Partial<PayloadRequest> = transaksi ? { transactionID: transaksi } : {}
    try {
      for (const h of hari) {
        await payload.db.upsert({ collection: 'analitik-situs', where: { tanggal: { equals: h.tanggal } }, data: { ...h }, req, returning: false })
      }
      await payload.db.deleteMany({ collection: 'analitik-halaman', where: { id: { exists: true } }, req })
      for (const h of halaman) {
        await payload.db.create({ collection: 'analitik-halaman', data: { ...h, sampai }, req, returning: false })
      }
      if (transaksi) await payload.db.commitTransaction(transaksi)
    } catch (galat) {
      if (transaksi) await payload.db.rollbackTransaction(transaksi)
      throw galat
    }
  }

  const angka = new Intl.NumberFormat('id-ID')

  /**
   * Sinkron Search Analytics harian (spesifikasi §5 "Penjadwal", §8 "Dashboard SEO"):
   *
   * 1. Total harian properti 35 hari sampai kemarin (dimensi `date`, data final). Data Search Console
   *    biasanya baru final 2 sampai 3 hari kemudian, jadi tanggal terakhir yang berisi menjadi `sampai`.
   * 2. Klik, impresi, CTR, dan posisi per halaman untuk 28 hari dan 7 hari sampai tanggal itu.
   * 3. Disimpan dalam satu transaksi, lalu cache "Paling dibaca pekan ini" dibuang (tag `analitik`).
   *
   * Bila Google tidak dipanggil (akun layanan belum diatur, adapter palsu) atau gagal, data lama tidak
   * disentuh. Bila tidak ada data final sama sekali dalam 35 hari, ringkasan halaman dikosongkan.
   */
  export async function sinkronAnalitik(
    payload: Payload,
    adapter: AdapterPantau,
    pengaturan: Pick<PengaturanIndexing, 'urlSitus' | 'propertiSearchConsole'>,
    sekarang: Date,
  ): Promise<HasilSinkron> {
    const properti = pengaturan.propertiSearchConsole
    const harian = await kueriSemua(adapter, properti, permintaanAnalitik(rentangHarian(sekarang), 'date'))
    if (harian.status !== 'berhasil') return gagal(harian)
    const hari = hariSitus(harian.baris)
    const sampai = hari.map((h) => h.tanggal).sort().at(-1) ?? null
    let halaman: RingkasanHalaman[] = []
    if (sampai) {
      const baris28 = await kueriSemua(adapter, properti, permintaanAnalitik(rentang(sampai, HARI_RINGKASAN), 'page'))
      if (baris28.status !== 'berhasil') return gagal(baris28)
      const baris7 = await kueriSemua(adapter, properti, permintaanAnalitik(rentang(sampai, HARI_PEKAN), 'page'))
      if (baris7.status !== 'berhasil') return gagal(baris7)
      halaman = ringkasHalaman(baris28.baris, baris7.baris, pengaturan.urlSitus)
    }
    await simpan(payload, hari, halaman, sampai)
    revalidasi([TAG.analitik])
    if (!sampai) return { hasil: 'berhasil', pesan: `Search Console belum punya data final untuk ${RENTANG_HARIAN} hari terakhir.` }
    const klik = halaman.reduce((n, h) => n + h.klik28, 0)
    return { hasil: 'berhasil', pesan: `Data sampai ${sampai}: ${angka.format(halaman.length)} halaman, ${angka.format(klik)} klik dalam 28 hari.` }
  }

  /**
   * Retensi harian: log indexing lebih dari 90 hari dan total harian lebih dari 16 bulan dihapus dengan satu
   * `DELETE` masing-masing (lewat adapter database, tanpa hook per dokumen).
   */
  export async function hapusDataLama(payload: Payload, sekarang: Date): Promise<void> {
    const batasLog = new Date(sekarang.getTime() - RETENSI_LOG_INDEXING_HARI * HARI).toISOString()
    await payload.db.deleteMany({ collection: 'log-indexing', where: { waktu: { less_than: batasLog } } })
    const batasSitus = geserTanggal(tanggalPasifik(sekarang), -RETENSI_ANALITIK_SITUS_HARI)
    await payload.db.deleteMany({ collection: 'analitik-situs', where: { tanggal: { less_than: batasSitus } } })
  }
  ```

  `src/modules/pantau/index.ts`

  ```ts
  import type { Payload } from 'payload'

  import { ambilPengaturanIndexing } from '@/modules/indexer/antrean'
  import type { PengaturanIndexing } from '@/modules/indexer/tipe'

  import { adapterPantau, type AdapterPantau } from './adapter'
  import { hapusDataLama, sinkronAnalitik } from './analitik'
  import { jadwalTugas, type HasilTugas } from './aturan'
  import { klaimTugas, selesaikanTugas } from './tugas'
  import type { JenisTugas, StatusTugas } from './tipe'

  /**
   * Pantau SEO (spesifikasi §8 "Tingkat situs" dan "Dashboard SEO"). Antarmuka modul:
   *
   * - `jalankanPantau(payload, opsi)`: dipanggil cron `GET /api/jobs/run` setiap 10 menit. Menjalankan
   *   tugas yang jatuh tempo (masing-masing sekali sehari): sinkron Search Analytics beserta retensi data.
   *
   * Semua panggilan ke luar lewat adapter (`adapter.ts`), dipilih env `INDEXER_ADAPTER` yang sama dengan
   * Mesin Indexing. Hasil setiap tugas tersimpan di `tugas-seo` dan tampil di dashboard SEO.
   */

  type Konteks = { payload: Payload; adapter: AdapterPantau; pengaturan: PengaturanIndexing; sekarang: Date }

  type Pelaksana = (k: Konteks) => Promise<{ hasil: HasilTugas; pesan: string }>

  /** Sinkron Search Analytics, lalu retensi (apa pun hasil sinkronnya). */
  const analitik: Pelaksana = async (k) => {
    const hasil = await sinkronAnalitik(k.payload, k.adapter, k.pengaturan, k.sekarang)
    await hapusDataLama(k.payload, k.sekarang)
    return hasil
  }

  const PELAKSANA: Partial<Record<JenisTugas, Pelaksana>> = { analitik }

  const STATUS: Record<HasilTugas, Exclude<StatusTugas, 'berjalan'>> = {
    berhasil: 'berhasil',
    dilewati: 'dilewati',
    gagal: 'gagal',
    'kuota-habis': 'gagal',
  }

  export type RingkasanPantau = Partial<Record<JenisTugas, { status: Exclude<StatusTugas, 'berjalan'>; pesan: string }>>

  /**
   * Menjalankan tugas Pantau SEO yang jatuh tempo. Aman dipanggil berulang atau bersamaan: tugas diklaim
   * atomik dan hanya berjalan sekali per jadwal. Galat tak terduga dicatat sebagai Gagal (dicoba lagi sejam
   * kemudian) dan tidak menghentikan tugas lain.
   */
  export async function jalankanPantau(payload: Payload, opsi: { sekarang?: Date; adapter?: AdapterPantau } = {}): Promise<RingkasanPantau> {
    const k: Konteks = {
      payload,
      adapter: opsi.adapter ?? adapterPantau(),
      pengaturan: await ambilPengaturanIndexing(payload),
      sekarang: opsi.sekarang ?? new Date(),
    }
    const ringkasan: RingkasanPantau = {}
    for (const [jenis, pelaksana] of Object.entries(PELAKSANA) as [JenisTugas, Pelaksana][]) {
      const klaim = await klaimTugas(payload, jenis, k.sekarang)
      if (!klaim) continue
      let hasil: { hasil: HasilTugas; pesan: string }
      try {
        hasil = await pelaksana(k)
      } catch (galat) {
        payload.logger.error({ err: galat, msg: `Pantau SEO: tugas ${jenis} gagal.` })
        hasil = { hasil: 'gagal', pesan: `Galat di server: ${(galat as Error).message}` }
      }
      const status = STATUS[hasil.hasil]
      await selesaikanTugas(payload, klaim, { status, pesan: hasil.pesan, berikutnya: jadwalTugas(hasil.hasil, k.sekarang) }, k.sekarang)
      ringkasan[jenis] = { status, pesan: hasil.pesan }
    }
    return ringkasan
  }

  export { adapterPantau, pakaiAdapterPantau, type AdapterPantau, type HasilAnalitik } from './adapter'
  export { adapterPalsu, type AdapterPantauPalsu } from './palsu'
  export type { JenisTugas, RingkasanHalaman, StatusTugas } from './tipe'
  ```

- [ ] **Langkah 5: Cron dan `pnpm indexer`**

  ```diff
  diff --git a/src/modules/indexer/endpoint.ts b/src/modules/indexer/endpoint.ts
  index 31765e1..66efe37 100644
  --- a/src/modules/indexer/endpoint.ts
  +++ b/src/modules/indexer/endpoint.ts
  @@ -1,6 +1,8 @@
   import { timingSafeEqual } from 'crypto'
   import type { Endpoint, Payload } from 'payload'
   
  +import { jalankanPantau, type AdapterPantau, type RingkasanPantau } from '@/modules/pantau'
  +
   import { jalankanIndexer, type RingkasanJalan } from './jalan'
   
   /**
  @@ -15,17 +17,21 @@ export function izinCron(header: string | null | undefined, rahasia: string | un
     return diterima.length === diharapkan.length && timingSafeEqual(diterima, diharapkan)
   }
   
  -export type HasilJadwal = { jadwalTerbit: number; indexer: RingkasanJalan }
  +export type HasilJadwal = { jadwalTerbit: number; indexer: RingkasanJalan; pantau: RingkasanPantau }
  +
  +export type OpsiJadwal = NonNullable<Parameters<typeof jalankanIndexer>[1]> & { adapterPantau?: AdapterPantau }
   
   /**
    * Pekerjaan berkala (spesifikasi §5 "Penjadwal"): job Payload yang jatuh tempo (jadwal terbit artikel,
  - * `schedulePublish`), lalu antrean Mesin Indexing. Urutan ini membuat artikel yang terbit terjadwal
  - * langsung dikabarkan pada jalan yang sama.
  + * `schedulePublish`), lalu antrean Mesin Indexing, lalu tugas Pantau SEO yang jatuh tempo (sinkron
  + * Search Analytics harian). Urutan ini membuat artikel yang terbit terjadwal langsung dikabarkan pada
  + * jalan yang sama.
    */
  -export async function jalankanJadwal(payload: Payload, opsi: Parameters<typeof jalankanIndexer>[1] = {}): Promise<HasilJadwal> {
  +export async function jalankanJadwal(payload: Payload, opsi: OpsiJadwal = {}): Promise<HasilJadwal> {
     const job = await payload.jobs.run({ allQueues: true, overrideAccess: true, silent: true })
  -  const indexer = await jalankanIndexer(payload, opsi)
  -  return { jadwalTerbit: Object.keys(job.jobStatus ?? {}).length, indexer }
  +  const indexer = await jalankanIndexer(payload, { sekarang: opsi.sekarang, adapter: opsi.adapter })
  +  const pantau = await jalankanPantau(payload, { sekarang: opsi.sekarang, adapter: opsi.adapterPantau })
  +  return { jadwalTerbit: Object.keys(job.jobStatus ?? {}).length, indexer, pantau }
   }
   
   /**
  ```

  ```diff
  diff --git a/src/scripts/jalankan-indexer.ts b/src/scripts/jalankan-indexer.ts
  index 5c8dc71..825f113 100644
  --- a/src/scripts/jalankan-indexer.ts
  +++ b/src/scripts/jalankan-indexer.ts
  @@ -2,15 +2,18 @@ import config from '@payload-config'
   import { getPayload } from 'payload'
   
   import { jalankanJadwal } from '@/modules/indexer/endpoint'
  +import { LABEL_STATUS_TUGAS, LABEL_TUGAS, type JenisTugas } from '@/modules/pantau/tipe'
   
   /**
  - * `pnpm indexer`: menjalankan sekali pekerjaan cron (jadwal terbit dan antrean Mesin Indexing) tanpa
  - * Vercel. Adapter mengikuti `INDEXER_ADAPTER` (lokal: palsu, tanpa jaringan).
  + * `pnpm indexer`: menjalankan sekali pekerjaan cron (jadwal terbit, antrean Mesin Indexing, dan tugas
  + * Pantau SEO yang jatuh tempo) tanpa Vercel. Adapter mengikuti `INDEXER_ADAPTER` (lokal: palsu, tanpa jaringan).
    */
   const payload = await getPayload({ config })
  -const { jadwalTerbit, indexer } = await jalankanJadwal(payload)
  +const { jadwalTerbit, indexer, pantau } = await jalankanJadwal(payload)
  +const tugas = Object.entries(pantau).map(([jenis, h]) => `${LABEL_TUGAS[jenis as JenisTugas]} ${LABEL_STATUS_TUGAS[h.status].toLowerCase()} (${h.pesan})`)
   payload.logger.info(
     `Jadwal terbit: ${jadwalTerbit} job. Mesin Indexing: ${indexer.diproses} langkah (berhasil ${indexer.berhasil}, ` +
  -    `dicoba lagi ${indexer.diulang}, gagal ${indexer.gagal}, dilewati ${indexer.dilewati}, ditunda ${indexer.ditunda}).`,
  +    `dicoba lagi ${indexer.diulang}, gagal ${indexer.gagal}, dilewati ${indexer.dilewati}, ditunda ${indexer.ditunda}). ` +
  +    `Pantau SEO: ${tugas.join('; ') || 'belum ada tugas yang jatuh tempo'}.`,
   )
   process.exit(0)
  ```

- [ ] **Langkah 6: Tipe Payload, database dev, dan data E2E**

  ```bash
  pnpm generate:types
  git diff --stat src/payload-types.ts
  pnpm seed
  ```

  Hasil yang diharapkan: `1 file changed, 118 insertions(+)` (tipe `AnalitikHalaman`, `AnalitikSitus`, `TugasSeo`, select-nya, dan relasi `payload-locked-documents`); `pnpm seed` selesai tanpa pertanyaan DATA LOSS (tiga tabel baru).

  Data E2E dibersihkan setiap run, termasuk koleksi baru, supaya E2E yang dijalankan dua kali berturut-turut tanpa membuang database tetap sama:

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index 2b02260..3931edf 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -17,7 +17,23 @@ import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, KUNCI_INDEXNOW, p, SLU
   pakaiKlien(klienPalsu('e2e'))
   const payload = await getPayload({ config })
   
  -for (const koleksi of ['artikel', 'tools', 'parameter-tools', 'video', 'subkategori', 'redirect', 'log-404', 'media', 'antrean-indexing', 'log-indexing', 'status-indeks'] as const) {
  +const KOLEKSI_DIBERSIHKAN = [
  +  'artikel',
  +  'tools',
  +  'parameter-tools',
  +  'video',
  +  'subkategori',
  +  'redirect',
  +  'log-404',
  +  'media',
  +  'antrean-indexing',
  +  'log-indexing',
  +  'status-indeks',
  +  'analitik-halaman',
  +  'analitik-situs',
  +  'tugas-seo',
  +] as const
  +for (const koleksi of KOLEKSI_DIBERSIHKAN) {
     await payload.delete({ collection: koleksi, where: { id: { exists: true } } })
   }
   await seed(payload, { emailAdmin: ADMIN_E2E.email, passwordAdmin: ADMIN_E2E.password })
  ```

- [ ] **Langkah 7: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 58 passed (58)`, `Tests 401 passed (401)`; integrasi `Test Files 33 passed (33)`, `Tests 107 passed (107)`; E2E `91 passed`.

- [ ] **Langkah 8: Commit**

  ```bash
  git add src/collections/AnalitikHalaman.ts src/collections/AnalitikSitus.ts src/collections/TugasSeo.ts src/modules/pantau src/payload.config.ts src/payload-types.ts src/lib/tag.ts src/modules/indexer/endpoint.ts src/scripts/jalankan-indexer.ts tests/e2e/siapkan.ts tests/int/pantau-analitik.int.spec.ts
  git commit -m "feat(pantau): sinkron Search Analytics harian lewat cron: total harian, klik, impresi, CTR, dan posisi per halaman 28 dan 7 hari, klaim tugas atomik, dan retensi log indexing"
  ```

---

### Task 4: "Paling dibaca pekan ini" di beranda dan halaman 404

**Files:**
- Modify: `src/modules/konten/beranda.ts`, `src/modules/konten/data.ts`, `src/modules/konten/cache.ts`, `src/modules/konten/index.ts`, `src/app/(frontend)/not-found.tsx`, `src/components/galat/TidakDitemukan.tsx`, `src/components/beranda/TerbaruBeranda.tsx`, `src/blocks/beranda.ts`, `src/payload-types.ts` (dibuat ulang), `tests/e2e/data.ts`, `tests/e2e/siapkan.ts`, `tests/e2e/beranda.spec.ts`, `tests/e2e/galat.spec.ts`, `tests/e2e/motion.spec.ts`
- Test: `tests/unit/beranda.test.ts`, `tests/unit/konten-galat.test.ts`, `tests/unit/cari.test.ts`, `tests/int/beranda.int.spec.ts`

**Interfaces:**
- Consumes: koleksi `analitik-halaman` dan `TAG.analitik` (Task 3), `kartuTerbit` (internal `konten/data.ts`), `KartuArtikel`.
- Produces:
  - `konten/beranda.ts`: `JUDUL_POPULER` (`'Paling dibaca pekan ini'`), `DaftarPopuler = { judul, artikel }`, `daftarPopuler(populer, terbaru, jumlah, judulPopuler?)`; `SumberBeranda.populer`.
  - `konten/data.ts`: `ambilPopuler(payload, jumlah): Promise<KartuArtikel[]>`; `ambilBeranda` mengisi `populer`.
  - `konten/cache.ts`: `muatPopuler(jumlah)` (tag `analitik`, `artikel`, `pilar`); `muatBeranda` ditambah tag `analitik`.
  - `TidakDitemukan` menerima `{ daftar: DaftarPopuler }` (sebelumnya `{ terbaru }`).
  - `tests/e2e/data.ts`: `KLIK_CONTOH` (klik 7 hari contoh per path) dan `POPULER` (urutan artikel yang diharapkan).

Rencana 4B menyiapkan blok ini: cukup mengganti sumber `terbaru` dan judulnya. Aturannya satu fungsi murni, `daftarPopuler`, dipakai beranda dan halaman 404: "Paling dibaca pekan ini" hanya bila artikel terbit dengan klik Google 7 hari terakhir cukup untuk **semua** tempat; selain itu tetap tulisan terbaru berjudul "Tulisan terbaru" (keputusan pemilik di Rencana 4B, judul selalu jujur). Daftar campuran tidak dipakai karena judul "Paling dibaca" di atas tulisan terbaru akan menyesatkan. Peringkat dipakai apa adanya, jadi artikel di mozaik boleh muncul lagi; daftar terbaru tetap menyaring artikel mozaik seperti sebelumnya.

`ambilPopuler` membaca `analitik-halaman` (path dengan klik 7 hari lebih dari nol, terbanyak dulu), mengambil path satu segmen sebagai slug artikel, lalu memuat kartu artikel terbit bukan glosarium dengan slug itu dan mengurutkannya sesuai peringkat. Path lain (beranda, tools, glosarium, rubrik) otomatis terlewat. Halaman tetap ISR: `muatBeranda` dan `muatPopuler` memakai tag `analitik` yang dibuang setiap sinkron harian (Task 3), dan tidak ada JavaScript klien baru.

Data E2E sekarang berisi klik contoh, jadi beranda dan halaman 404 E2E menampilkan "Paling dibaca pekan ini"; keadaan tanpa data diuji di tes unit dan integrasi. Teks halaman 404 diganti supaya cocok untuk kedua judul ("pilih salah satu tulisan di bawah").

- [ ] **Langkah 1: Tulis tes yang gagal**

  ```diff
  diff --git a/tests/unit/beranda.test.ts b/tests/unit/beranda.test.ts
  index 08dff7c..ef78c55 100644
  --- a/tests/unit/beranda.test.ts
  +++ b/tests/unit/beranda.test.ts
  @@ -1,6 +1,6 @@
   import { describe, expect, it } from 'vitest'
   
  -import { HERO_BAWAAN, JUDUL_TERBARU, susunBeranda, susunNewsletter, type SumberBeranda } from '@/modules/konten/beranda'
  +import { daftarPopuler, HERO_BAWAAN, JUDUL_POPULER, JUDUL_TERBARU, susunBeranda, susunNewsletter, type SumberBeranda } from '@/modules/konten/beranda'
   import type { KartuArtikel, KartuVideo } from '@/modules/konten/tipe'
   import type { Artikel, Beranda, Media, Pilar, Video } from '@/payload-types'
   
  @@ -23,6 +23,7 @@ const newsletter = { judul: 'Intinya, tiap Senin.', teks: 'Lima tulisan terbaik
   
   const sumber: SumberBeranda = {
     terbaru: [1, 2, 3, 4, 5, 6].map(kartu),
  +  populer: [],
     video: [7, 8].map(kartuVid),
     tools: [{ id: 9, nama: 'Gaji Bersih', href: '/tools/gaji-bersih', ringkasan: 'Hitung gaji bersih.' }],
     newsletter,
  @@ -66,6 +67,22 @@ describe('susunBeranda', () => {
       expect(terbaru.jenis === 'terbaru' && terbaru.artikel.map((k) => k.id)).toEqual([1, 4])
     })
   
  +  it('"Paling dibaca pekan ini" bila klik 7 hari cukup untuk semua tempat: urutan peringkat, judul editor, artikel mozaik boleh ikut', () => {
  +    const [, , populer] = susunBeranda([blok.hero, blok.mozaik, blok.palingDibaca, blok.newsletter], { ...sumber, populer: [3, 6, 1].map(kartu) })
  +    expect(populer).toMatchObject({ jenis: 'terbaru', judul: 'Paling dibaca pekan ini', newsletter })
  +    expect(populer.jenis === 'terbaru' && populer.artikel.map((k) => k.id)).toEqual([3, 6])
  +    const [, tanpaJudul] = susunBeranda([blok.hero, { ...blok.palingDibaca, judul: ' ' }], { ...sumber, populer: [3, 6].map(kartu) })
  +    expect(tanpaJudul).toMatchObject({ judul: JUDUL_POPULER })
  +  })
  +
  +  it('klik 7 hari belum cukup untuk semua tempat: tetap tulisan terbaru, tidak dicampur', () => {
  +    const [, , terbaru] = susunBeranda([blok.hero, blok.mozaik, blok.palingDibaca], { ...sumber, populer: [6].map(kartu) })
  +    expect(terbaru).toMatchObject({ judul: JUDUL_TERBARU })
  +    expect(terbaru.jenis === 'terbaru' && terbaru.artikel.map((k) => k.id)).toEqual([1, 4])
  +    expect(daftarPopuler([kartu(9)], [kartu(1), kartu(2), kartu(3)], 3)).toEqual({ judul: 'Tulisan terbaru', artikel: [1, 2, 3].map(kartu) })
  +    expect(daftarPopuler([9, 8, 7, 6].map(kartu), [], 3)).toEqual({ judul: 'Paling dibaca pekan ini', artikel: [9, 8, 7].map(kartu) })
  +  })
  +
     it('newsletter berdiri sendiri bila tidak tepat setelah tulisan terbaru, judul blok mengganti judul global', () => {
       const bagian = susunBeranda([blok.hero, { ...blok.newsletter, judul: 'Langganan intinya' }], sumber)
       expect(bagian[1]).toEqual({ jenis: 'newsletter', id: 'n', newsletter: { ...newsletter, judul: 'Langganan intinya' } })
  @@ -73,7 +90,7 @@ describe('susunBeranda', () => {
     })
   
     it('tanpa hero: hero bawaan di atas; hero kedua dibuang; blok kosong dilewati', () => {
  -    const kosong: SumberBeranda = { terbaru: [], video: [], tools: [], newsletter: null }
  +    const kosong: SumberBeranda = { terbaru: [], populer: [], video: [], tools: [], newsletter: null }
       const bagian = susunBeranda([blok.video, blok.palingDibaca, { ...blok.mozaik, artikel: [artikel(5, 'draft')] }], kosong)
       expect(bagian).toEqual([{ jenis: 'hero', id: 'hero-bawaan', ...HERO_BAWAAN }])
       expect(susunBeranda([blok.hero, { ...blok.hero, id: 'h2' }], kosong).filter((b) => b.jenis === 'hero')).toHaveLength(1)
  ```

  ```diff
  diff --git a/tests/unit/konten-galat.test.ts b/tests/unit/konten-galat.test.ts
  index 5d0ecdc..41310c6 100644
  --- a/tests/unit/konten-galat.test.ts
  +++ b/tests/unit/konten-galat.test.ts
  @@ -47,15 +47,19 @@ describe('halaman 404', () => {
       expect(meta).not.toHaveProperty('alternates')
     })
   
  -  it('jalan kembali ke beranda dan tulisan terbaru', () => {
  +  it('jalan kembali ke beranda dan artikel populer dengan judul daftarnya', () => {
       const html = renderToStaticMarkup(
         h(TidakDitemukan, {
  -        terbaru: [{ id: 1, judul: 'Cara hitung THR', href: '/cara-hitung-thr', tipe: 'panduan', pilar: null, intinya: null }],
  +        daftar: {
  +          judul: 'Paling dibaca pekan ini',
  +          artikel: [{ id: 1, judul: 'Cara hitung THR', href: '/cara-hitung-thr', tipe: 'panduan', pilar: null, intinya: null }],
  +        },
         }),
       )
       expect(html).toMatch(/<h1 class="[^"]*">Halaman ini tidak ada\.<\/h1>/)
       expect(html).toMatch(/<a class="[^"]*" href="\/">Kembali ke beranda/)
  +    expect(html).toMatch(/<section aria-labelledby="daftar-tulisan" class="[^"]*"><h2 id="daftar-tulisan" class="[^"]*">Paling dibaca pekan ini<\/h2>/)
       expect(html).toContain('href="/cara-hitung-thr"')
  -    expect(renderToStaticMarkup(h(TidakDitemukan, { terbaru: [] }))).not.toContain('Tulisan terbaru')
  +    expect(renderToStaticMarkup(h(TidakDitemukan, { daftar: { judul: 'Tulisan terbaru', artikel: [] } }))).not.toContain('Tulisan terbaru')
     })
   })
  ```

  ```diff
  diff --git a/tests/unit/cari.test.ts b/tests/unit/cari.test.ts
  index 81c7f53..7511eae 100644
  --- a/tests/unit/cari.test.ts
  +++ b/tests/unit/cari.test.ts
  @@ -52,6 +52,6 @@ describe('FormCari dan HalamanCari', () => {
     })
   
     it('halaman 404 punya form cari', () => {
  -    expect(renderToStaticMarkup(h(TidakDitemukan, { terbaru: [] }))).toMatch(/<form role="search" class="[^"]*" action="\/cari" method="get">/)
  +    expect(renderToStaticMarkup(h(TidakDitemukan, { daftar: { judul: 'Tulisan terbaru', artikel: [] } }))).toMatch(/<form role="search" class="[^"]*" action="\/cari" method="get">/)
     })
   })
  ```

  ```diff
  diff --git a/tests/int/beranda.int.spec.ts b/tests/int/beranda.int.spec.ts
  index d8e026a..225144b 100644
  --- a/tests/int/beranda.int.spec.ts
  +++ b/tests/int/beranda.int.spec.ts
  @@ -1,7 +1,7 @@
   import { afterAll, beforeAll, describe, expect, it } from 'vitest'
   
   import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'
  -import { ambilBeranda } from '@/modules/konten/data'
  +import { ambilBeranda, ambilPopuler } from '@/modules/konten/data'
   
   import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
   import { getTestPayload } from './helpers'
  @@ -56,4 +56,34 @@ describe('beranda dari global', () => {
       expect(terbaru.jenis === 'terbaru' && terbaru.artikel.map((k) => k.id)).not.toContain(pilihan.id)
       await payload.updateGlobal({ slug: 'newsletter', data: { aktif: false } })
     })
  +
  +  it('paling dibaca pekan ini: artikel terbit dengan klik 7 hari terbanyak, tanpa draf, glosarium, dan path lain', async () => {
  +    const payload = await getTestPayload()
  +    await payload.delete({ collection: 'analitik-halaman', where: { id: { exists: true } } })
  +    const relasi = await siapkanRelasiArtikel(payload)
  +    const a = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
  +    const b = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
  +    const c = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
  +    const draf = await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft' } })
  +    const istilah = await payload.create({ collection: 'artikel', data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium' } })
  +    const klik = (path: string, klik7: number, klik28 = klik7) =>
  +      payload.create({ collection: 'analitik-halaman', data: { path, klik7, impresi7: 100, klik28, impresi28: 400, ctr28: 0.1, posisi28: 5, sampai: '2026-11-02' } })
  +    await klik(`/${b.slug}`, 30)
  +    await klik(`/${a.slug}`, 12, 50)
  +    await klik(`/${c.slug}`, 12, 20)
  +    await klik(`/${draf.slug}`, 90)
  +    await klik(`/glosarium/${istilah.slug}`, 80)
  +    await klik('/', 70)
  +    await klik('/tools/gaji-bersih', 60)
  +    await klik(`/${a.slug}-lama`, 0, 9)
  +
  +    expect((await ambilPopuler(payload, 5)).map((k) => k.id)).toEqual([b.id, a.id, c.id])
  +    expect((await ambilPopuler(payload, 2)).map((k) => k.id)).toEqual([b.id, a.id])
  +
  +    await payload.updateGlobal({ slug: 'beranda', data: { tataLetak: [{ blockType: 'palingDibaca', judul: 'Paling dibaca pekan ini', jumlah: 3 }] } })
  +    const [, populer] = await ambilBeranda(payload)
  +    expect(populer).toMatchObject({ jenis: 'terbaru', judul: 'Paling dibaca pekan ini' })
  +    expect(populer.jenis === 'terbaru' && populer.artikel.map((k) => k.id)).toEqual([b.id, a.id, c.id])
  +    await payload.delete({ collection: 'analitik-halaman', where: { id: { exists: true } } })
  +  })
   })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm test:unit
  pnpm test:int
  ```

  Hasil yang diharapkan: unit FAIL 4 tes: `tests/unit/beranda.test.ts` ("Paling dibaca pekan ini" bila klik 7 hari cukup ...) dengan `AssertionError: expected { jenis: 'terbaru', id: 'p', …(3) } to match object { jenis: 'terbaru', …(2) }`, ("klik 7 hari belum cukup ...") dengan `TypeError: (0 , __vite_ssr_import_1__.daftarPopuler) is not a function`, serta `tests/unit/cari.test.ts` ("halaman 404 punya form cari") dan `tests/unit/konten-galat.test.ts` ("jalan kembali ke beranda dan artikel populer ...") dengan `TypeError: Cannot read properties of undefined (reading 'length')`; integrasi FAIL satu tes di `tests/int/beranda.int.spec.ts` dengan `TypeError: (0 , __vite_ssr_import_2__.ambilPopuler) is not a function`.

- [ ] **Langkah 3: Aturan dan data "Paling dibaca"**

  ```diff
  diff --git a/src/modules/konten/beranda.ts b/src/modules/konten/beranda.ts
  index 573fe12..6d19465 100644
  --- a/src/modules/konten/beranda.ts
  +++ b/src/modules/konten/beranda.ts
  @@ -8,11 +8,25 @@ import { kartuVideo } from './video'
   export const HERO_BAWAAN = { judul: 'Intinya dulu.', subjudul: null, placeholder: 'misal: cara hitung THR' } as const
   
   /**
  - * Judul blok "Paling dibaca" selama data kunjungan belum ada (Rencana 6): isinya tulisan terbaru,
  - * jadi judulnya juga jujur menyebut itu, apa pun isian editor.
  + * Judul blok "Paling dibaca" selama data klik belum cukup: isinya tulisan terbaru, jadi judulnya juga
  + * jujur menyebut itu, apa pun isian editor (keputusan pemilik di Rencana 4B).
    */
   export const JUDUL_TERBARU = 'Tulisan terbaru'
   
  +/** Judul daftar tulisan dengan klik Google terbanyak 7 hari terakhir (spesifikasi §4). */
  +export const JUDUL_POPULER = 'Paling dibaca pekan ini'
  +
  +export type DaftarPopuler = { judul: string; artikel: KartuArtikel[] }
  +
  +/**
  + * "Paling dibaca pekan ini" hanya bila klik Google 7 hari terakhir cukup untuk mengisi semua tempat
  + * (`jumlah`); selain itu tulisan terbaru berjudul `JUDUL_TERBARU`. Dipakai blok beranda dan halaman 404.
  + */
  +export function daftarPopuler(populer: KartuArtikel[], terbaru: KartuArtikel[], jumlah: number, judulPopuler = JUDUL_POPULER): DaftarPopuler {
  +  if (populer.length >= jumlah) return { judul: judulPopuler, artikel: populer.slice(0, jumlah) }
  +  return { judul: JUDUL_TERBARU, artikel: terbaru.slice(0, jumlah) }
  +}
  +
   export const JUDUL_VIDEO_BAWAAN = 'Intinya dalam 45 detik'
   export const MAKS_VIDEO_BERANDA = 4
   export const JUMLAH_TERBARU_BAWAAN = 4
  @@ -23,6 +37,8 @@ export const MAKS_TERBARU_BERANDA = 15
   /** Data yang tidak disimpan di global `beranda` tetapi ditampilkan bloknya. */
   export type SumberBeranda = {
     terbaru: KartuArtikel[]
  +  /** Artikel dengan klik Google terbanyak 7 hari terakhir, terbanyak dulu (sinkron Search Analytics). */
  +  populer: KartuArtikel[]
     video: KartuVideo[]
     tools: ItemTools[]
     newsletter: DataNewsletter | null
  @@ -61,7 +77,9 @@ function kartuStrip(relasi: (number | Video)[] | null | undefined): KartuVideo[]
    * - Hanya hero pertama yang dipakai (satu H1); tanpa hero, `HERO_BAWAAN` dipasang paling atas.
    * - Mozaik memakai artikel terbit pilihan editor; kotak "Hitung sendiri" berisi tools terbit.
    * - Strip video memakai pilihan editor, cadangannya video terbit terbaru.
  - * - "Paling dibaca" menampilkan tulisan terbaru di luar mozaik dengan judul `JUDUL_TERBARU`.
  + * - "Paling dibaca" menampilkan artikel dengan klik Google terbanyak 7 hari terakhir (judul editor, bawaan
  + *   `JUDUL_POPULER`) bila datanya cukup untuk semua tempat; peringkat apa adanya, jadi artikel mozaik bisa
  + *   ikut. Bila belum cukup: tulisan terbaru di luar mozaik dengan judul `JUDUL_TERBARU`.
    * - Newsletter hanya bila global `newsletter` aktif; bila tepat setelah tulisan terbaru, ia menjadi
    *   kolom samping blok itu (seperti mockup).
    * - Slot iklan belum dirender (Rencana 8) supaya tidak ada ruang kosong.
  @@ -100,8 +118,9 @@ export function susunBeranda(tataLetak: Blok[], sumber: SumberBeranda): BagianBe
           break
         }
         case 'palingDibaca': {
  -        const artikel = sumber.terbaru.filter((k) => !diMozaik.has(k.id)).slice(0, blok.jumlah ?? JUMLAH_TERBARU_BAWAAN)
  -        if (artikel.length > 0) bagian.push({ jenis: 'terbaru', id, judul: JUDUL_TERBARU, artikel, newsletter: null })
  +        const terbaru = sumber.terbaru.filter((k) => !diMozaik.has(k.id))
  +        const daftar = daftarPopuler(sumber.populer, terbaru, blok.jumlah ?? JUMLAH_TERBARU_BAWAAN, blok.judul?.trim() || JUDUL_POPULER)
  +        if (daftar.artikel.length > 0) bagian.push({ jenis: 'terbaru', id, ...daftar, newsletter: null })
           break
         }
         case 'newsletterBlok': {
  ```

  ```diff
  diff --git a/src/modules/konten/data.ts b/src/modules/konten/data.ts
  index 5d45e4e..3c5ff9e 100644
  --- a/src/modules/konten/data.ts
  +++ b/src/modules/konten/data.ts
  @@ -170,6 +170,34 @@ export async function ambilTerbaru(payload: Payload, jumlah: number): Promise<Ka
     return kartuTerbit(payload, [], jumlah)
   }
   
  +/** Path dengan klik terbanyak yang dibaca: cukup banyak supaya beranda, tools, dan glosarium yang ikut tersaring tidak mengurangi daftar. */
  +const MAKS_PATH_POPULER = 100
  +
  +/**
  + * Artikel terbit (bukan glosarium) dengan klik Google terbanyak 7 hari terakhir, terbanyak dulu. Data dari
  + * koleksi `analitik-halaman` yang diganti setiap sinkron Search Analytics harian (modul pantau); path
  + * yang bukan artikel (beranda, rubrik, tools) dilewati.
  + */
  +export async function ambilPopuler(payload: Payload, jumlah: number): Promise<KartuArtikel[]> {
  +  const { docs } = await payload.find({
  +    collection: 'analitik-halaman',
  +    where: { klik7: { greater_than: 0 } },
  +    sort: ['-klik7', '-klik28', 'path'],
  +    limit: MAKS_PATH_POPULER,
  +    depth: 0,
  +    pagination: false,
  +    select: { path: true },
  +  })
  +  const peringkat = new Map(docs.map((d, i) => [d.path, i]))
  +  const slug = docs.flatMap((d) => /^\/([^/]+)$/.exec(d.path)?.[1] ?? [])
  +  if (slug.length === 0) return []
  +  const kartu = await kartuTerbit(payload, [{ slug: { in: slug } }], slug.length)
  +  return kartu
  +    .filter((k) => peringkat.has(k.href))
  +    .sort((a, b) => peringkat.get(a.href)! - peringkat.get(b.href)!)
  +    .slice(0, jumlah)
  +}
  +
   /**
    * Halaman rubrik `/{pilar}` (`subSlug` `null`) atau `/{pilar}/{subkategori}`. `null` bila pilar
    * tidak ada, atau subkategori tidak ada atau milik pilar lain. Intro pilar dimuat seperti isi
  @@ -348,13 +376,15 @@ const POPULATE_BERANDA = {
   
   /**
    * Beranda: blok global `beranda` (versi yang tersimpan tanpa draf) ditambah data yang tidak disimpan
  - * di global itu: tulisan terbaru, video terbaru (cadangan strip video), tools terbit, dan newsletter.
  + * di global itu: tulisan terbaru, artikel paling banyak diklik pekan ini, video terbaru (cadangan strip
  + * video), tools terbit, dan newsletter.
    */
   export async function ambilBeranda(payload: Payload): Promise<BagianBeranda[]> {
     const beranda = await payload.findGlobal({ slug: 'beranda', depth: 2, populate: POPULATE_BERANDA })
     const newsletter = await payload.findGlobal({ slug: 'newsletter', depth: 0 })
     return susunBeranda(beranda.tataLetak ?? [], {
       terbaru: await kartuTerbit(payload, [], MAKS_TERBARU_BERANDA),
  +    populer: await ambilPopuler(payload, MAKS_TERBARU_BERANDA),
       video: await kartuVideoTerbit(payload, [], MAKS_VIDEO_BERANDA),
       tools: (await ambilTools(payload)).flatMap((k) => k.tools),
       newsletter: susunNewsletter(newsletter),
  ```

  ```diff
  diff --git a/src/modules/konten/cache.ts b/src/modules/konten/cache.ts
  index 01b7a67..ce82bf5 100644
  --- a/src/modules/konten/cache.ts
  +++ b/src/modules/konten/cache.ts
  @@ -14,6 +14,7 @@ import {
     ambilHalaman,
     ambilHeader,
     ambilPenulis,
  +  ambilPopuler,
     ambilRubrik,
     ambilTakarir,
     ambilTerbaru,
  @@ -93,6 +94,12 @@ export const muatTerbaru = unstable_cache(async (jumlah: number) => ambilTerbaru
     revalidate: SEJAM,
   })
   
  +/** Artikel paling banyak diklik pekan ini (halaman 404). Tag `analitik` dibuang setiap sinkron Search Analytics. */
  +export const muatPopuler = unstable_cache(async (jumlah: number) => ambilPopuler(await payload(), jumlah), ['konten', 'populer'], {
  +  tags: [TAG.analitik, TAG.koleksi('artikel'), TAG.koleksi('pilar')],
  +  revalidate: SEJAM,
  +})
  +
   /**
    * Halaman rubrik pilar dan subkategori. Intro pilar bisa menautkan dokumen apa pun, jadi tagnya sama
    * dengan halaman artikel.
  @@ -150,10 +157,11 @@ export const muatCari = unstable_cache(async (kueri: string) => cariArtikel(awai
   
   /**
    * Beranda. Tag `beranda` dibuang saat global beranda atau newsletter disimpan dan saat artikel, pilar,
  - * video, atau tools terbit (`tagRevalidasi`); `media` untuk poster video.
  + * video, atau tools terbit (`tagRevalidasi`); `media` untuk poster video; `analitik` setiap sinkron
  + * Search Analytics ("Paling dibaca pekan ini").
    */
   export const muatBeranda = unstable_cache(async () => ambilBeranda(await payload()), ['konten', 'beranda'], {
  -  tags: [TAG.beranda, TAG.media],
  +  tags: [TAG.beranda, TAG.media, TAG.analitik],
     revalidate: SEJAM,
   })
   
  ```

  ```diff
  diff --git a/src/modules/konten/index.ts b/src/modules/konten/index.ts
  index 746c7f9..5d90a59 100644
  --- a/src/modules/konten/index.ts
  +++ b/src/modules/konten/index.ts
  @@ -18,6 +18,7 @@ export {
     muatHalaman,
     muatHeader,
     muatPenulis,
  +  muatPopuler,
     muatRedirect,
     muatRubrik,
     muatSitus,
  @@ -37,6 +38,7 @@ export {
     ambilHalaman,
     ambilHeader,
     ambilPenulis,
  +  ambilPopuler,
     ambilRubrik,
     ambilTakarir,
     ambilTerbaru,
  @@ -48,7 +50,9 @@ export {
   } from './data'
   export { kataKueri, MAKS_HASIL_CARI, MAKS_KATA, MAKS_KUERI, rapikanKueri, urutkanHasil } from './cari'
   export {
  +  daftarPopuler,
     HERO_BAWAAN,
  +  JUDUL_POPULER,
     JUDUL_TERBARU,
     JUDUL_VIDEO_BAWAAN,
     JUMLAH_TERBARU_BAWAAN,
  @@ -56,6 +60,7 @@ export {
     MAKS_VIDEO_BERANDA,
     susunBeranda,
     susunNewsletter,
  +  type DaftarPopuler,
     type SumberBeranda,
   } from './beranda'
   export { itemTools, kelompokkanTools, parameterTersimpan, susunKalkulator, susunTool } from './tools'
  ```

- [ ] **Langkah 4: Halaman 404, komponen, dan keterangan blok di CMS**

  `src/app/(frontend)/not-found.tsx`

  ```tsx
  import type { Metadata } from 'next'

  import { TidakDitemukan } from '@/components/galat/TidakDitemukan'
  import { daftarPopuler, muatPopuler, muatSitus, muatTerbaru } from '@/modules/konten'
  import { metadataTidakDitemukan } from '@/modules/seo'

  /** Jumlah artikel di halaman 404: paling banyak diklik pekan ini bila datanya cukup, selain itu tulisan terbaru. */
  const JUMLAH_ARTIKEL = 3

  export async function generateMetadata(): Promise<Metadata> {
    return metadataTidakDitemukan(await muatSitus())
  }

  /** Dipakai untuk setiap `notFound()` di halaman publik dan path yang tidak cocok dengan rute mana pun. */
  export default async function HalamanTidakDitemukan() {
    const [populer, terbaru] = await Promise.all([muatPopuler(JUMLAH_ARTIKEL), muatTerbaru(JUMLAH_ARTIKEL)])
    return <TidakDitemukan daftar={daftarPopuler(populer, terbaru, JUMLAH_ARTIKEL)} />
  }
  ```

  ```diff
  diff --git a/src/components/galat/TidakDitemukan.tsx b/src/components/galat/TidakDitemukan.tsx
  index 165a3fa..d46c38f 100644
  --- a/src/components/galat/TidakDitemukan.tsx
  +++ b/src/components/galat/TidakDitemukan.tsx
  @@ -2,32 +2,35 @@ import { FormCari } from '@/components/cari/FormCari'
   import { Ikon } from '@/components/dasar/Ikon'
   import { Tautan } from '@/components/dasar/Tautan'
   import { DaftarKartu } from '@/components/kartu/KartuArtikel'
  -import type { KartuArtikel } from '@/modules/konten/tipe'
  +import type { DaftarPopuler } from '@/modules/konten/beranda'
   
   import { Catat404 } from './Catat404'
   import gaya from './TidakDitemukan.module.css'
   
  -/** Isi halaman 404 (spesifikasi §15): penjelasan singkat, pencarian, jalan kembali, dan tulisan terbaru. */
  -export function TidakDitemukan({ terbaru }: { terbaru: KartuArtikel[] }) {
  +/**
  + * Isi halaman 404 (spesifikasi §15): penjelasan singkat, pencarian, jalan kembali, dan artikel populer
  + * (paling banyak dibaca pekan ini, atau tulisan terbaru selama data klik belum cukup).
  + */
  +export function TidakDitemukan({ daftar }: { daftar: DaftarPopuler }) {
     return (
       <div className={`kontainer ${gaya.halaman}`}>
         <p className={gaya.kode}>Galat 404</p>
         <h1 className={gaya.judul}>Halaman ini tidak ada.</h1>
         <p className={gaya.teks}>
  -        Mungkin tautannya salah ketik, atau tulisannya sudah pindah alamat. Cari topiknya, mulai lagi dari beranda, atau baca
  -        tulisan terbaru di bawah.
  +        Mungkin tautannya salah ketik, atau tulisannya sudah pindah alamat. Cari topiknya, mulai lagi dari beranda, atau pilih
  +        salah satu tulisan di bawah.
         </p>
         <FormCari />
         <Tautan href="/" className={gaya.tombol}>
           Kembali ke beranda
           <Ikon nama="arrow-right" />
         </Tautan>
  -      {terbaru.length > 0 && (
  -        <section aria-labelledby="terbaru" className={gaya.terbaru}>
  -          <h2 id="terbaru" className={gaya.subjudul}>
  -            Tulisan terbaru
  +      {daftar.artikel.length > 0 && (
  +        <section aria-labelledby="daftar-tulisan" className={gaya.terbaru}>
  +          <h2 id="daftar-tulisan" className={gaya.subjudul}>
  +            {daftar.judul}
             </h2>
  -          <DaftarKartu kartu={terbaru} />
  +          <DaftarKartu kartu={daftar.artikel} />
           </section>
         )}
         <Catat404 />
  ```

  ```diff
  diff --git a/src/components/beranda/TerbaruBeranda.tsx b/src/components/beranda/TerbaruBeranda.tsx
  index f805d45..e4d9626 100644
  --- a/src/components/beranda/TerbaruBeranda.tsx
  +++ b/src/components/beranda/TerbaruBeranda.tsx
  @@ -5,8 +5,8 @@ import gaya from './Beranda.module.css'
   import { KotakNewsletter } from './KotakNewsletter'
   
   /**
  - * Daftar tulisan terbaru bertitik warna pilar (posisi "Paling dibaca" di mockup, sampai data kunjungan
  - * ada di Rencana 6), dengan newsletter di kolom samping bila editor meletakkannya tepat setelahnya.
  + * Blok "Paling dibaca pekan ini" (klik Google 7 hari), atau tulisan terbaru selama datanya belum cukup:
  + * daftar bertitik warna pilar, dengan newsletter di kolom samping bila editor meletakkannya tepat setelahnya.
    */
   export function TerbaruBeranda({ terbaru }: { terbaru: Extract<BagianBeranda, { jenis: 'terbaru' }> }) {
     return (
  ```

  ```diff
  diff --git a/src/blocks/beranda.ts b/src/blocks/beranda.ts
  index e997ed2..baf08c3 100644
  --- a/src/blocks/beranda.ts
  +++ b/src/blocks/beranda.ts
  @@ -56,7 +56,10 @@ export const BlokPalingDibaca: Block = {
         name: 'judul',
         type: 'text',
         defaultValue: 'Paling dibaca pekan ini',
  -      admin: { description: 'Sementara data pembaca belum tersedia, blok ini menampilkan tulisan terbaru dengan judul "Tulisan terbaru".' },
  +      admin: {
  +        description:
  +          'Diisi artikel dengan klik Google terbanyak 7 hari terakhir (disinkron harian). Bila datanya belum cukup untuk semua tempat, blok ini menampilkan tulisan terbaru dengan judul "Tulisan terbaru".',
  +      },
       },
       { name: 'jumlah', type: 'number', defaultValue: 4, min: 1, max: 10 },
     ],
  ```

  Keterangan field ikut tertulis di tipe Payload:

  ```bash
  pnpm generate:types
  git diff --stat src/payload-types.ts
  ```

  Hasil yang diharapkan: `1 file changed, 1 insertion(+), 1 deletion(-)`.

- [ ] **Langkah 5: Klik contoh di data E2E dan tes E2E**

  ```diff
  diff --git a/tests/e2e/data.ts b/tests/e2e/data.ts
  index 06e6e13..f3c1a06 100644
  --- a/tests/e2e/data.ts
  +++ b/tests/e2e/data.ts
  @@ -38,6 +38,22 @@ export const SLUG_HALAMAN = { tentang: 'tentang', kebijakanRedaksi: 'kebijakan-r
   /** Video contoh: dua terbit (PPh 21 lebih dulu dibuat), satu draf. */
   export const SLUG_VIDEO = { pph21: 'pph-21-satu-slip-gaji', otp: 'kode-otp-jangan-dibagikan', draf: 'video-draf' } as const
   
  +/**
  + * Klik Google 7 hari contoh (bentuk hasil sinkron Search Analytics) yang diisi `siapkan.ts`. Beranda
  + * dan halaman 404 menampilkan "Paling dibaca pekan ini" dengan urutan `POPULER`; glosarium, beranda,
  + * dan tools tidak ikut karena bukan tulisan.
  + */
  +export const KLIK_CONTOH: [path: string, klik7: number][] = [
  +  ['/', 90],
  +  ['/glosarium/ptkp', 60],
  +  [`/${SLUG.danaDarurat}`, 40],
  +  ['/tools/gaji-bersih', 30],
  +  [`/${SLUG.explainer}`, 25],
  +  [`/${SLUG.tekno}`, 12],
  +  [`/${SLUG.panduan}`, 7],
  +]
  +export const POPULER = [SLUG.danaDarurat, SLUG.explainer, SLUG.tekno, SLUG.panduan] as const
  +
   /** Kunci IndexNow di pengaturan SEO database E2E, dilayani di `/{kunci}.txt`. */
   export const KUNCI_INDEXNOW = 'e2e-kunci-indexnow-2026'
   
  ```

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index 3931edf..5881737 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -7,7 +7,7 @@ import type { Halaman } from '@/payload-types'
   import { klienPalsu } from '@/modules/media/palsu'
   import { seed } from '@/seed/seed'
   
  -import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, KUNCI_INDEXNOW, p, SLUG, SLUG_HALAMAN, SLUG_SUB, SLUG_VIDEO, tautanKe } from './data'
  +import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, KLIK_CONTOH, KUNCI_INDEXNOW, p, SLUG, SLUG_HALAMAN, SLUG_SUB, SLUG_VIDEO, tautanKe } from './data'
   
   /**
    * Mengisi database E2E sebelum server dibangun dan dinyalakan (`webServer` di playwright.config.ts).
  @@ -320,6 +320,13 @@ await payload.updateGlobal({
     },
   })
   
  +for (const [path, klik7] of KLIK_CONTOH) {
  +  await payload.create({
  +    collection: 'analitik-halaman',
  +    data: { path, klik7, impresi7: klik7 * 10, klik28: klik7 * 4, impresi28: klik7 * 40, ctr28: 0.1, posisi28: 6.4, sampai: '2026-11-02' },
  +  })
  +}
  +
   await payload.create({ collection: 'redirect', data: { dari: '/promo-lama', ke: '/glosarium', kode: '301' } })
   await payload.create({ collection: 'redirect', data: { dari: '/glosarium/ptkp-lama', ke: '/glosarium/ptkp', kode: '301' } })
   await payload.create({ collection: 'redirect', data: { dari: '/tulisan-dihapus', kode: '410' } })
  ```

  ```diff
  diff --git a/tests/e2e/beranda.spec.ts b/tests/e2e/beranda.spec.ts
  index e4d1e3e..9c5efbd 100644
  --- a/tests/e2e/beranda.spec.ts
  +++ b/tests/e2e/beranda.spec.ts
  @@ -1,7 +1,7 @@
   import { expect, test } from '@playwright/test'
   
   import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  -import { SLUG, SLUG_VIDEO, UKURAN_LAYAR } from './data'
  +import { POPULER, SLUG_VIDEO, UKURAN_LAYAR } from './data'
   
   test.beforeEach(async ({ page }) => {
     await cegatCloudinary(page)
  @@ -47,7 +47,7 @@ test('mozaik di tablet 768 px: kartu samping berdampingan, kotak Hitung sendiri
     expect(tools).toBeLessThan(tekno.y + tekno.height)
   })
   
  -test('strip video gelap, tulisan terbaru di luar mozaik, dan newsletter ke form penyedia', async ({ page }) => {
  +test('strip video gelap, paling dibaca pekan ini dari klik Google, dan newsletter ke form penyedia', async ({ page }) => {
     await page.goto('/')
     const strip = page.getByRole('region', { name: 'Intinya dalam 45 detik' })
     await expect(strip).toHaveCSS('background-color', 'rgb(17, 17, 17)')
  @@ -55,10 +55,10 @@ test('strip video gelap, tulisan terbaru di luar mozaik, dan newsletter ke form
     await expect(strip.getByRole('link', { name: /PPh 21 dijelaskan/ })).toHaveAttribute('href', `/video/${SLUG_VIDEO.pph21}`)
     await expect(strip.getByRole('link', { name: 'Semua video' })).toHaveAttribute('href', '/video')
   
  -  const terbaru = page.getByRole('region', { name: 'Tulisan terbaru' })
  -  await expect(terbaru.getByRole('link')).toHaveCount(2)
  -  await expect(terbaru.getByRole('link').first()).toHaveAttribute('href', `/${SLUG.danaDarurat}`)
  -  await expect(terbaru.getByRole('link', { name: /Cara hitung gaji bersih/ })).toHaveCount(0)
  +  const populer = page.getByRole('region', { name: 'Paling dibaca pekan ini' })
  +  await expect(populer.getByRole('link')).toHaveCount(4)
  +  expect(await populer.getByRole('link').evaluateAll((a) => a.map((el) => el.getAttribute('href')))).toEqual(POPULER.map((slug) => `/${slug}`))
  +  await expect(page.getByRole('region', { name: 'Tulisan terbaru' })).toHaveCount(0)
   
     const newsletter = page.getByRole('complementary', { name: 'Newsletter' })
     await expect(newsletter.getByRole('heading', { level: 2 })).toHaveText('Intinya, tiap Senin.')
  @@ -73,8 +73,8 @@ test('jarak antarbagian beranda tetap, tanpa celah kosong, di 375 dan 1440 px',
       const hero = await kotak('Intinya dulu.')
       const mozaik = await kotak('Pilihan redaksi')
       const strip = await kotak('Intinya dalam 45 detik')
  -    const terbaru = await kotak('Tulisan terbaru')
  -    const jarak = [mozaik.y - (hero.y + hero.height), strip.y - (mozaik.y + mozaik.height), terbaru.y - (strip.y + strip.height)]
  +    const populer = await kotak('Paling dibaca pekan ini')
  +    const jarak = [mozaik.y - (hero.y + hero.height), strip.y - (mozaik.y + mozaik.height), populer.y - (strip.y + strip.height)]
       expect(jarak.map(Math.round), `${lebar}px`).toEqual([40, 56, 56])
     }
   })
  ```

  ```diff
  diff --git a/tests/e2e/galat.spec.ts b/tests/e2e/galat.spec.ts
  index 98b9e89..27552af 100644
  --- a/tests/e2e/galat.spec.ts
  +++ b/tests/e2e/galat.spec.ts
  @@ -1,7 +1,7 @@
   import { expect, test, type APIRequestContext } from '@playwright/test'
   
   import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  -import { ADMIN_E2E, SLUG, UKURAN_LAYAR } from './data'
  +import { ADMIN_E2E, POPULER, SLUG, UKURAN_LAYAR } from './data'
   
   test.beforeEach(async ({ page }) => {
     await cegatCloudinary(page)
  @@ -46,7 +46,7 @@ async function jumlahLog(request: APIRequestContext, path: string): Promise<numb
     return (await log.json()).docs[0]?.jumlah ?? 0
   }
   
  -test('halaman 404: judul, jalan kembali, tulisan terbaru, dan setiap kunjungan tercatat', async ({ page, request }) => {
  +test('halaman 404: judul, jalan kembali, paling dibaca pekan ini, dan setiap kunjungan tercatat', async ({ page, request }) => {
     const path = `/jalan-buntu-${Date.now()}`
     for (let i = 0; i < 2; i++) {
       const beacon = page.waitForRequest((r) => r.url().endsWith('/api/log-404/catat') && r.method() === 'POST')
  @@ -58,7 +58,9 @@ test('halaman 404: judul, jalan kembali, tulisan terbaru, dan setiap kunjungan t
     await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
     await expect(page.getByRole('heading', { level: 1 })).toHaveText('Halaman ini tidak ada.')
     await expect(page.getByRole('link', { name: 'Kembali ke beranda' })).toHaveAttribute('href', '/')
  -  await expect(page.getByRole('region', { name: 'Tulisan terbaru' }).getByRole('link')).toHaveCount(3)
  +  const populer = page.getByRole('region', { name: 'Paling dibaca pekan ini' })
  +  await expect(populer.getByRole('link')).toHaveCount(3)
  +  await expect(populer.getByRole('link').first()).toHaveAttribute('href', `/${POPULER[0]}`)
     await expect.poll(() => jumlahLog(request, path)).toBe(2)
   })
   
  ```

  ```diff
  diff --git a/tests/e2e/motion.spec.ts b/tests/e2e/motion.spec.ts
  index 18d29dc..e50a2df 100644
  --- a/tests/e2e/motion.spec.ts
  +++ b/tests/e2e/motion.spec.ts
  @@ -81,7 +81,7 @@ test('kartu ke artikel memakai View Transitions dengan judul sebagai elemen bers
         return asli(...arg)
       }) as typeof document.startViewTransition
     })
  -  const kartu = page.getByRole('region', { name: 'Tulisan terbaru' }).getByRole('link').first()
  +  const kartu = page.getByRole('region', { name: 'Paling dibaca pekan ini' }).getByRole('link').first()
     const judul = await kartu.getByRole('heading').textContent()
     await kartu.click()
     await expect(page.getByRole('heading', { level: 1 })).toHaveText(judul ?? '')
  ```

- [ ] **Langkah 6: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 58 passed (58)`, `Tests 403 passed (403)`; integrasi `Test Files 33 passed (33)`, `Tests 108 passed (108)`; E2E `91 passed` (termasuk anggaran JavaScript beranda dan 404 di `motion.spec.ts`, tidak berubah karena semua perubahan di server component).

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/modules/konten "src/app/(frontend)/not-found.tsx" src/components/galat/TidakDitemukan.tsx src/components/beranda/TerbaruBeranda.tsx src/blocks/beranda.ts src/payload-types.ts tests/unit/beranda.test.ts tests/unit/konten-galat.test.ts tests/unit/cari.test.ts tests/int/beranda.int.spec.ts tests/e2e
  git commit -m "feat(konten): \"Paling dibaca pekan ini\" di beranda dan halaman 404 dari klik Google 7 hari, dengan tulisan terbaru selama datanya belum cukup"
  ```

---

### Task 5: Pindai tautan harian (tautan internal rusak, alamat lama, halaman yatim) dan pemeriksa tautan luar mingguan

**Files:**
- Create: `src/modules/pantau/tautan.ts`, `src/modules/pantau/pindai.ts`, `src/collections/TemuanTautan.ts`, `src/collections/TautanLuar.ts`
- Modify: `src/modules/pantau/index.ts`, `src/payload.config.ts`, `src/modules/indexer/endpoint.ts`, `src/scripts/jalankan-indexer.ts`, `src/payload-types.ts` (dibuat ulang), `tests/int/pantau-analitik.int.spec.ts`
- Test: `tests/unit/pantau-tautan.test.ts`, `tests/int/pantau-tautan.int.spec.ts`

**Interfaces:**
- Consumes: `hrefDari`, `statusTautan`, `jadwalCekTautan`, `BATAS_TAUTAN_PER_JALAN`, `TAUTAN_BERSAMAAN`, `HasilTugas` (Task 1), `AdapterPantau.periksaTautan` (Task 2), `klaimTugas` dan `jalankanPantau` (Task 3), `tautanIsi` (`src/modules/seo/lexical.ts`), `pathFor` dan `PATH_INDEKS`, `PATH_FEED`, `PATH_SITEMAP_INDEX`, `PATH_NEWS_SITEMAP`, `JENIS_SITEMAP`, `pathSitemap`.
- Produces:
  - `tautan.ts` (murni): `KoleksiSumber`, `Sumber`, `Tujuan`, `Tautan`, `PetaSitus`, `Temuan`, `Sasaran`, `PESAN_TEMUAN`, `tautanLexical(isi, urlSitus)`, `tautanDokumen(koleksi, doc, urlSitus)`, `nilaiTautan(tautan, peta, sasaran): { temuan, luar }`.
  - `pindai.ts`: `pindaiTautan(payload, urlSitus, sekarang)`, `periksaTautanLuar(payload, adapter, sekarang): Promise<number>`.
  - Koleksi tersembunyi `temuan-tautan` (`jenis`, `tujuan`, `pesan`, `sumberKoleksi`, `sumberId`, `sumberJudul`, `sumberPath`, `ditemukan`) dan `tautan-luar` (`url` unik, `status`, `kodeHttp`, `pesan`, `dicekPada`, `berikutnya`, `sumber` JSON).
  - `jalankanPantau(payload, { sekarang?, adapter?, tugas? })`: tugas `tautan` (harian) dan pemeriksa tautan luar di setiap jalan; `RingkasanPantau.tautanDicek`.

Spesifikasi §8 meminta laporan halaman yatim dan pengecek link rusak mingguan. Keduanya membaca tautan yang sama, jadi satu pindai harian di cron membaca semua konten terbit (artikel, halaman, pilar, tools, penulis), menu header dan footer, dan beranda, lalu:

- tautan internal dicocokkan dengan database: path dokumen terbit (termasuk subkategori, video, dan penulis), halaman indeks, dan rute teknis; tautan ke dokumen yang belum terbit atau sudah dihapus, path tanpa halaman, dan redirect 410 menjadi temuan `rusak`; redirect 301 menjadi `dialihkan` (pembaca dan Google masih sampai, tetapi lewat alamat lama);
- halaman yatim: artikel dan halaman statis terbit yang tidak noindex tanpa tautan masuk dari sumber lain;
- URL situs lain dikumpulkan bersama sumbernya ke `tautan-luar`.

Pindai membaca semua dokumen sekali sehari (bukan tabel tautan yang diisi hook simpan): tidak ada hook baru yang menulis tabel berkunci unik dalam operasi massal, dan hasilnya selalu sesuai isi yang terbit. Daftar otomatis (rubrik, tulisan terbaru, artikel terkait otomatis, sitemap) tidak dihitung sebagai tautan masuk karena isinya berganti setiap ada tulisan baru.

Tautan luar butuh jaringan, jadi dicek sedikit demi sedikit: setiap jalan cron (10 menit) membuka paling banyak 10 URL yang jatuh tempo, 5 bersamaan, lalu menjadwalkan cek berikutnya seminggu lagi (atau besok bila hasilnya belum pasti). Dua cron bersamaan paling buruk membuka URL yang sama dua kali; hasilnya sama, jadi tidak perlu klaim. Tes Task 3 kini membatasi `jalankanPantau` ke tugas `analitik` (opsi `tugas`), karena pindai membaca seluruh database tes.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/pantau-tautan.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { nilaiTautan, PESAN_TEMUAN, tautanDokumen, type PetaSitus, type Sumber } from '@/modules/pantau/tautan'

  const SITUS = 'https://point.lat'

  // Pembuat JSON Lexical minimal (bentuk yang disimpan Payload 3.92).
  const teks = (t: string) => ({ type: 'text', text: t })
  const tautanUrl = (url: string, t = 'tautan') => ({ type: 'link', fields: { linkType: 'custom', url }, children: [teks(t)] })
  const tautanDok = (relationTo: string, value: number) => ({ type: 'link', fields: { linkType: 'internal', doc: { relationTo, value } }, children: [teks('dok')] })
  const blok = (fields: Record<string, unknown>) => ({ type: 'block', fields })
  const isi = (...anak: unknown[]) => ({ root: { type: 'root', children: [{ type: 'paragraph', children: anak }] } })

  describe('tautanDokumen: tautan yang dihitung per jenis sumber', () => {
    it('artikel: link Lexical (path, URL situs, dokumen, situs lain), sematan tools dan video, sumber, dan relasi pilihan editor', () => {
      const tujuan = tautanDokumen(
        'artikel',
        {
          isi: isi(
            tautanUrl('/cara-hitung-thr/'),
            tautanUrl('https://www.point.lat/glosarium/ptkp'),
            tautanDok('artikel', 12),
            tautanUrl('https://pajak.go.id/id/pph-21'),
            tautanUrl('#faq'),
            tautanUrl('mailto:redaksi@point.lat'),
            blok({ blockType: 'embedTool', tool: 3 }),
            blok({ blockType: 'callout', isi: 'Bukan tautan.' }),
          ),
          sumber: [{ judul: 'PMK', url: 'https://jdih.kemenkeu.go.id/pmk-168' }],
          artikelTerkait: [7, { id: 8 }],
          toolsTerkait: [3],
          videoTerkait: 5,
        },
        SITUS,
      )
      expect(tujuan).toEqual([
        { jenis: 'internal', path: '/cara-hitung-thr' },
        { jenis: 'internal', path: '/glosarium/ptkp' },
        { jenis: 'dokumen', koleksi: 'artikel', id: 12 },
        { jenis: 'luar', url: 'https://pajak.go.id/id/pph-21' },
        { jenis: 'dokumen', koleksi: 'tools', id: 3 },
        { jenis: 'luar', url: 'https://jdih.kemenkeu.go.id/pmk-168' },
        { jenis: 'dokumen', koleksi: 'artikel', id: 7 },
        { jenis: 'dokumen', koleksi: 'artikel', id: 8 },
        { jenis: 'dokumen', koleksi: 'tools', id: 3 },
        { jenis: 'dokumen', koleksi: 'video', id: 5 },
      ])
    })

    it('halaman (blok teks, kartu, CTA, sematan tools), menu header dan footer, beranda (mozaik dan strip video)', () => {
      expect(
        tautanDokumen(
          'halaman',
          {
            tataLetak: [
              { blockType: 'hero', judul: 'Tentang' },
              { blockType: 'teks', isi: isi(tautanUrl('/kebijakan-redaksi')) },
              { blockType: 'kartu', kartu: [{ judul: 'A', tautan: '/tools' }, { judul: 'B' }] },
              { blockType: 'cta', tautan: 'https://wa.me/62811' },
              { blockType: 'embedTool', tool: 2 },
            ],
          },
          SITUS,
        ),
      ).toEqual([
        { jenis: 'internal', path: '/kebijakan-redaksi' },
        { jenis: 'internal', path: '/tools' },
        { jenis: 'luar', url: 'https://wa.me/62811' },
        { jenis: 'dokumen', koleksi: 'tools', id: 2 },
      ])
      expect(
        tautanDokumen('header', { menu: [{ jenis: 'pilar', pilar: 1 }, { jenis: 'tautan', url: '/video' }], tombolTools: { url: '/tools' } }, SITUS),
      ).toEqual([
        { jenis: 'dokumen', koleksi: 'pilar', id: 1 },
        { jenis: 'internal', path: '/video' },
        { jenis: 'internal', path: '/tools' },
      ])
      expect(tautanDokumen('footer', { tautan: [{ url: '/tentang' }], sosial: [{ url: 'https://instagram.com/point' }], saluranWhatsApp: null }, SITUS)).toEqual([
        { jenis: 'internal', path: '/tentang' },
        { jenis: 'luar', url: 'https://instagram.com/point' },
      ])
      expect(
        tautanDokumen('beranda', { tataLetak: [{ blockType: 'mozaikPilihan', artikel: [4, 6] }, { blockType: 'stripVideo', video: [9] }, { blockType: 'palingDibaca' }] }, SITUS),
      ).toEqual([
        { jenis: 'dokumen', koleksi: 'artikel', id: 4 },
        { jenis: 'dokumen', koleksi: 'artikel', id: 6 },
        { jenis: 'dokumen', koleksi: 'video', id: 9 },
      ])
    })
  })

  describe('nilaiTautan: rusak, alamat lama, yatim, dan tautan luar', () => {
    const sumber = (id: number, path: string): Sumber => ({ koleksi: 'artikel', id, judul: `Artikel ${id}`, path })
    const menu: Sumber = { koleksi: 'header', id: null, judul: 'Menu header', path: null }
    const a = sumber(1, '/a')
    const b = sumber(2, '/b')
    const c = sumber(3, '/c')
    const peta: PetaSitus = {
      path: new Set(['/', '/a', '/b', '/c', '/tentang', '/tools']),
      dokumen: new Map([
        ['artikel:1', '/a'],
        ['artikel:2', '/b'],
        ['artikel:3', '/c'],
      ]),
      redirect: new Map([
        ['/c-lama', { kode: '301', ke: '/c' }],
        ['/dihapus', { kode: '410', ke: null }],
      ]),
    }
    const sasaran = [
      { path: '/a', sumber: a },
      { path: '/b', sumber: b },
      { path: '/c', sumber: c },
      { path: '/tentang', sumber: { koleksi: 'halaman' as const, id: 10, judul: 'Tentang', path: '/tentang' } },
    ]

    it('dokumen belum terbit, path tanpa halaman, 410 rusak; 301 dialihkan dan tujuannya tetap tautan masuk; tautan ke diri sendiri tidak dihitung', () => {
      const { temuan } = nilaiTautan(
        [
          { sumber: a, tujuan: { jenis: 'dokumen', koleksi: 'artikel', id: 99 } },
          { sumber: a, tujuan: { jenis: 'internal', path: '/tidak-ada' } },
          { sumber: a, tujuan: { jenis: 'internal', path: '/dihapus' } },
          { sumber: a, tujuan: { jenis: 'internal', path: '/c-lama' } },
          { sumber: a, tujuan: { jenis: 'internal', path: '/c-lama' } },
          { sumber: b, tujuan: { jenis: 'internal', path: '/b' } },
          { sumber: c, tujuan: { jenis: 'dokumen', koleksi: 'artikel', id: 1 } },
          { sumber: menu, tujuan: { jenis: 'internal', path: '/tentang' } },
        ],
        peta,
        sasaran,
      )
      expect(temuan).toEqual([
        { jenis: 'rusak', tujuan: 'artikel #99', pesan: PESAN_TEMUAN.dokumen, sumber: a },
        { jenis: 'rusak', tujuan: '/tidak-ada', pesan: PESAN_TEMUAN.tidakAda, sumber: a },
        { jenis: 'rusak', tujuan: '/dihapus', pesan: PESAN_TEMUAN.dihapus, sumber: a },
        { jenis: 'dialihkan', tujuan: '/c-lama', pesan: 'Alamat lama, dialihkan ke /c. Ganti tautannya ke alamat baru supaya pembaca dan Google tidak dialihkan.', sumber: a },
        { jenis: 'yatim', tujuan: '/b', pesan: PESAN_TEMUAN.yatim, sumber: b },
      ])
    })

    it('URL situs lain dikumpulkan sekali per URL dengan semua sumbernya (tanpa sumber ganda)', () => {
      const { luar } = nilaiTautan(
        [
          { sumber: a, tujuan: { jenis: 'luar', url: 'https://pajak.go.id/' } },
          { sumber: a, tujuan: { jenis: 'luar', url: 'https://pajak.go.id/' } },
          { sumber: menu, tujuan: { jenis: 'luar', url: 'https://pajak.go.id/' } },
          { sumber: b, tujuan: { jenis: 'luar', url: 'https://bpjs.go.id/' } },
        ],
        peta,
        [],
      )
      expect([...luar]).toEqual([
        ['https://pajak.go.id/', [a, menu]],
        ['https://bpjs.go.id/', [b]],
      ])
    })
  })
  ```

  `tests/int/pantau-tautan.int.spec.ts`

  ```ts
  import type { Payload } from 'payload'
  import { beforeEach, describe, expect, it } from 'vitest'

  import { adapterPalsu, jalankanPantau } from '@/modules/pantau'
  import { periksaTautanLuar } from '@/modules/pantau/pindai'
  import { PESAN_TEMUAN } from '@/modules/pantau/tautan'
  import type { Artikel } from '@/payload-types'

  import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
  import { getTestPayload, unik } from './helpers'

  const T0 = new Date('2026-11-05T03:00:00.000Z')
  const menit = (n: number) => new Date(T0.getTime() + n * 60_000)
  const palsu = adapterPalsu()

  const teks = (t: string) => ({ type: 'text', text: t, format: 0, detail: 0, mode: 'normal', style: '', version: 1 })
  const tautan = (fields: Record<string, unknown>) => ({ type: 'link', fields, children: [teks('tautan')], direction: null, format: '', indent: 0, version: 3 })
  const isi = (...anak: unknown[]) =>
    ({
      root: { type: 'root', direction: null, format: '', indent: 0, version: 1, children: [{ type: 'paragraph', children: anak, direction: null, format: '', indent: 0, version: 1 }] },
    }) as Artikel['isi']

  async function kosongkan(payload: Payload) {
    for (const collection of ['tugas-seo', 'temuan-tautan', 'tautan-luar'] as const) {
      await payload.delete({ collection, where: { id: { exists: true } } })
    }
    palsu.reset()
  }

  describe('pindai tautan dan pemeriksa tautan luar', () => {
    beforeEach(async () => {
      await kosongkan(await getTestPayload())
    })

    it('pindai harian: tautan internal rusak, ke alamat lama, halaman yatim, dan URL situs lain tercatat dengan sumbernya', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const tujuan = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      const yatim = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      const draf = await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft' } })
      const lama = `/${unik('alamat-lama')}`
      const hilang = `/${unik('tidak-ada')}`
      const luar = `https://${unik('sumber')}.example/pph-21`
      await payload.create({ collection: 'redirect', data: { dari: lama, ke: `/${tujuan.slug}`, kode: '301' } })
      const sumber = await payload.create({
        collection: 'artikel',
        data: {
          ...dataArtikelTerbit(relasi),
          isi: isi(
            tautan({ linkType: 'custom', url: `https://point.lat/${tujuan.slug}` }),
            tautan({ linkType: 'internal', doc: { relationTo: 'artikel', value: draf.id } }),
            tautan({ linkType: 'custom', url: hilang }),
            tautan({ linkType: 'custom', url: lama }),
            tautan({ linkType: 'custom', url: luar }),
          ),
          sumber: [{ judul: 'Sumber contoh', url: luar }],
        },
      })

      const hasil = await jalankanPantau(payload, { sekarang: T0, adapter: palsu, tugas: ['tautan'] })
      expect(hasil.tautan?.status).toBe('berhasil')
      expect(hasil.tautan?.pesan).toMatch(/^[\d.]+ tautan dipindai: [\d.]+ tautan internal rusak, [\d.]+ ke alamat lama, [\d.]+ halaman yatim, [\d.]+ URL situs lain\.$/)

      const { docs: dariSumber } = await payload.find({ collection: 'temuan-tautan', where: { sumberId: { equals: String(sumber.id) } }, sort: 'id', depth: 0 })
      expect(dariSumber.map((t) => [t.jenis, t.tujuan, t.pesan, t.sumberKoleksi, t.sumberJudul, t.sumberPath])).toEqual([
        ['rusak', `artikel #${draf.id}`, PESAN_TEMUAN.dokumen, 'artikel', sumber.judul, `/${sumber.slug}`],
        ['rusak', hilang, PESAN_TEMUAN.tidakAda, 'artikel', sumber.judul, `/${sumber.slug}`],
        ['dialihkan', lama, PESAN_TEMUAN.dialihkan(`/${tujuan.slug}`), 'artikel', sumber.judul, `/${sumber.slug}`],
        ['yatim', `/${sumber.slug}`, PESAN_TEMUAN.yatim, 'artikel', sumber.judul, `/${sumber.slug}`],
      ])
      const { docs: yatimSemua } = await payload.find({ collection: 'temuan-tautan', where: { jenis: { equals: 'yatim' } }, limit: 1000, depth: 0 })
      expect(yatimSemua.map((t) => t.tujuan)).toContain(`/${yatim.slug}`)
      expect(yatimSemua.map((t) => t.tujuan)).not.toContain(`/${tujuan.slug}`)

      const { docs: barisLuar } = await payload.find({ collection: 'tautan-luar', where: { url: { equals: luar } }, depth: 0 })
      expect(barisLuar).toHaveLength(1)
      expect(barisLuar[0]).toMatchObject({ sumber: [{ koleksi: 'artikel', id: sumber.id, judul: sumber.judul, path: `/${sumber.slug}` }] })
      expect(['belum', 'baik']).toContain(barisLuar[0].status)

      expect((await jalankanPantau(payload, { sekarang: menit(60), adapter: palsu, tugas: ['tautan'] })).tautan).toBeUndefined()
    })

    it('pemeriksa tautan luar: 10 per jalan, 404 rusak, 403 dan batas waktu perlu dicek manual, dicek ulang seminggu atau besok', async () => {
      const payload = await getTestPayload()
      const url = (i: number) => `https://cek-${i}.example/`
      for (let i = 0; i < 12; i++) {
        await payload.create({ collection: 'tautan-luar', data: { url: url(i), status: 'belum', berikutnya: menit(i - 12).toISOString(), sumber: [] } })
      }
      palsu.jawabanTautan.set(url(0), { kodeHttp: 404, galat: null })
      palsu.jawabanTautan.set(url(1), { kodeHttp: 403, galat: null })
      palsu.jawabanTautan.set(url(2), { kodeHttp: null, galat: 'The operation was aborted due to timeout', kodeGalat: 'TimeoutError' })

      expect(await periksaTautanLuar(payload, palsu, T0)).toBe(10)
      expect([...palsu.dibuka].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(url).sort())
      const { docs } = await payload.find({ collection: 'tautan-luar', where: { url: { in: [0, 1, 2, 3, 10].map(url) } }, sort: 'url', depth: 0 })
      expect(docs.map((d) => [d.url, d.status, d.kodeHttp, d.berikutnya])).toEqual([
        [url(0), 'rusak', 404, '2026-11-12T03:00:00.000Z'],
        [url(1), 'tidak-pasti', 403, '2026-11-06T03:00:00.000Z'],
        [url(10), 'belum', null, menit(-2).toISOString()],
        [url(2), 'tidak-pasti', null, '2026-11-06T03:00:00.000Z'],
        [url(3), 'baik', 200, '2026-11-12T03:00:00.000Z'],
      ])
      expect(docs.find((d) => d.url === url(2))?.pesan).toBe('Situs tidak menjawab dalam 10 detik.')
      expect(await periksaTautanLuar(payload, palsu, T0)).toBe(2)
      expect(await periksaTautanLuar(payload, palsu, T0)).toBe(0)

      // URL yang tidak lagi dipakai konten terbit dibuang saat pindai berikutnya.
      await jalankanPantau(payload, { sekarang: T0, adapter: palsu, tugas: ['tautan'] })
      expect((await payload.find({ collection: 'tautan-luar', where: { url: { in: [0, 11].map(url) } }, depth: 0 })).docs).toEqual([])
    })

    it('operasi massal di koleksi tautan: dua baris atau lebih diubah dan dihapus dalam satu operasi', async () => {
      const payload = await getTestPayload()
      for (const i of [1, 2]) {
        await payload.create({ collection: 'tautan-luar', data: { url: `https://massal-${i}.example/`, status: 'belum', berikutnya: T0.toISOString() } })
        await payload.create({
          collection: 'temuan-tautan',
          data: { jenis: 'yatim', tujuan: `/massal-${i}`, pesan: PESAN_TEMUAN.yatim, sumberKoleksi: 'artikel', sumberJudul: 'Massal', ditemukan: T0.toISOString() },
        })
      }
      const ubah = await payload.update({ collection: 'tautan-luar', where: { url: { like: 'massal-' } }, data: { berikutnya: menit(5).toISOString() } })
      expect([ubah.errors, ubah.docs.length]).toEqual([[], 2])
      for (const collection of ['tautan-luar', 'temuan-tautan'] as const) {
        const hapus = await payload.delete({ collection, where: { id: { exists: true } } })
        expect([hapus.errors, hapus.docs.length]).toEqual([[], 2])
      }
    })
  })
  ```

  Tes Task 3 dibatasi ke tugas `analitik`, dan tes cron kini juga melihat tugas `tautan`:

  ```diff
  diff --git a/tests/int/pantau-analitik.int.spec.ts b/tests/int/pantau-analitik.int.spec.ts
  index 1216673..6df938d 100644
  --- a/tests/int/pantau-analitik.int.spec.ts
  +++ b/tests/int/pantau-analitik.int.spec.ts
  @@ -52,7 +52,7 @@ async function tugas(payload: Payload) {
     return docs[0]
   }
   
  -const jalan = (payload: Payload, waktu: Date) => jalankanPantau(payload, { sekarang: waktu, adapter: palsu })
  +const jalan = (payload: Payload, waktu: Date) => jalankanPantau(payload, { sekarang: waktu, adapter: palsu, tugas: ['analitik'] })
   
   describe('sinkron Search Analytics harian', () => {
     beforeEach(async () => {
  @@ -159,7 +159,10 @@ describe('sinkron Search Analytics harian', () => {
     it('cron GET /api/jobs/run ikut menjalankan Pantau SEO', async () => {
       const payload = await getTestPayload()
       const hasil = await jalankanJadwal(payload, { sekarang: T0, adapter: adapterIndexerPalsu(), adapterPantau: palsu })
  -    expect(hasil.pantau).toEqual({ analitik: { status: 'dilewati', pesan: 'Adapter palsu tidak mengambil data Search Console.' } })
  +    expect(hasil.pantau).toMatchObject({
  +      analitik: { status: 'dilewati', pesan: 'Adapter palsu tidak mengambil data Search Console.' },
  +      tautan: { status: 'berhasil' },
  +    })
     })
   
     it('kueri berhalaman: startRow 0, lalu 25.000, sampai jawaban kurang dari 25.000 baris', async () => {
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm test:unit
  pnpm test:int
  ```

  Hasil yang diharapkan: unit FAIL di `tests/unit/pantau-tautan.test.ts` dengan `Error: Cannot find package '@/modules/pantau/tautan'`; integrasi FAIL di `tests/int/pantau-tautan.int.spec.ts` dengan `Error: Cannot find package '@/modules/pantau/pindai'`.

- [ ] **Langkah 3: Tautan di konten (murni)**

  `src/modules/pantau/tautan.ts`

  ```ts
  import { tautanIsi, type IsiDokumen } from '@/modules/seo/lexical'

  import { hrefDari } from './aturan'
  import type { Href, JenisTemuan } from './tipe'

  /**
   * Tautan di konten terbit sebagai fungsi murni (spesifikasi §8 "Tingkat situs": halaman yatim dan link
   * rusak). `tautanDokumen` membaca tautan satu dokumen atau global (isi Lexical, relasi pilihan editor,
   * menu, tombol, sumber); `nilaiTautan` mencocokkannya dengan peta situs: tautan internal yang rusak atau
   * menuju alamat lama, halaman tanpa tautan masuk (yatim), dan daftar URL situs lain yang perlu dicek.
   */

  /** Asal tautan yang dihitung: isi dokumen terbit, menu header dan footer, dan pilihan editor di beranda. */
  export type KoleksiSumber = 'artikel' | 'halaman' | 'pilar' | 'tools' | 'penulis' | 'header' | 'footer' | 'beranda'

  export type Sumber = { koleksi: KoleksiSumber; id: number | string | null; judul: string; path: string | null }

  /** Tujuan tautan: path atau URL, atau dokumen (tautan internal Lexical dan relasi) yang path-nya dicari di peta situs. */
  export type Tujuan = Href | { jenis: 'dokumen'; koleksi: string; id: number | string }

  export type Tautan = { sumber: Sumber; tujuan: Tujuan }

  type Dok = Record<string, unknown>

  const daftar = (nilai: unknown): Dok[] => (Array.isArray(nilai) ? (nilai.filter((n) => n && typeof n === 'object') as Dok[]) : [])

  /** Relasi (ID atau dokumen, tunggal atau banyak) menjadi tujuan dokumen. */
  function relasi(koleksi: string, nilai: unknown): Tujuan[] {
    const isi = Array.isArray(nilai) ? nilai : [nilai]
    return isi.flatMap((r): Tujuan[] => {
      const id = r && typeof r === 'object' ? (r as { id?: number | string }).id : r
      return typeof id === 'number' || typeof id === 'string' ? [{ jenis: 'dokumen', koleksi, id }] : []
    })
  }

  const href = (nilai: unknown, urlSitus: string): Tujuan[] => {
    const h = hrefDari(nilai, urlSitus)
    return h ? [h] : []
  }

  /** Blok sematan di isi Lexical (`type: 'block'`) yang dirender sebagai tautan ke halamannya. */
  function blokLexical(isi: unknown): Tujuan[] {
    const hasil: Tujuan[] = []
    const jelajah = (nodes: unknown) => {
      for (const node of daftar(nodes)) {
        const fields = node.fields as Dok | undefined
        if (node.type === 'block' && fields?.blockType === 'embedTool') hasil.push(...relasi('tools', fields.tool))
        if (node.type === 'block' && fields?.blockType === 'embedVideo') hasil.push(...relasi('video', fields.video))
        jelajah(node.children)
      }
    }
    jelajah((isi as { root?: { children?: unknown } } | null)?.root?.children)
    return hasil
  }

  /** Tautan di isi Lexical: link ke URL atau dokumen (`tautanIsi` modul seo) dan sematan tools atau video. */
  export function tautanLexical(isi: unknown, urlSitus: string): Tujuan[] {
    const tautan = tautanIsi(isi as IsiDokumen, urlSitus).flatMap((t): Tujuan[] =>
      'docId' in t ? relasi(t.relationTo, t.docId) : href(t.url, urlSitus),
    )
    return [...tautan, ...blokLexical(isi)]
  }

  /** Semua tujuan tautan satu dokumen atau global (data depth 0, versi terbit). */
  export function tautanDokumen(koleksi: KoleksiSumber, doc: Dok, urlSitus: string): Tujuan[] {
    const url = (baris: unknown, kunci = 'url') => daftar(baris).flatMap((b) => href(b[kunci], urlSitus))
    switch (koleksi) {
      case 'artikel':
        return [
          ...tautanLexical(doc.isi, urlSitus),
          ...url(doc.sumber),
          ...relasi('artikel', doc.artikelTerkait),
          ...relasi('tools', doc.toolsTerkait),
          ...relasi('video', doc.videoTerkait),
        ]
      case 'halaman':
        return daftar(doc.tataLetak).flatMap((blok): Tujuan[] => {
          if (blok.blockType === 'teks') return tautanLexical(blok.isi, urlSitus)
          if (blok.blockType === 'kartu') return url(blok.kartu, 'tautan')
          if (blok.blockType === 'cta') return href(blok.tautan, urlSitus)
          if (blok.blockType === 'embedTool') return relasi('tools', blok.tool)
          return []
        })
      case 'pilar':
        return tautanLexical(doc.intro, urlSitus)
      case 'tools':
        return [...tautanLexical(doc.penjelasan, urlSitus), ...url(doc.sumberAturan)]
      case 'penulis':
        return url(doc.tautan)
      case 'header':
        return [
          ...daftar(doc.menu).flatMap((m) => (m.jenis === 'pilar' ? relasi('pilar', m.pilar) : href(m.url, urlSitus))),
          ...href((doc.tombolTools as Dok | undefined)?.url, urlSitus),
        ]
      case 'footer':
        return [...url(doc.tautan), ...url(doc.sosial), ...href(doc.saluranWhatsApp, urlSitus)]
      case 'beranda':
        return daftar(doc.tataLetak).flatMap((blok): Tujuan[] => {
          if (blok.blockType === 'mozaikPilihan') return relasi('artikel', blok.artikel)
          if (blok.blockType === 'stripVideo') return relasi('video', blok.video)
          return []
        })
    }
  }

  /** Peta situs untuk mencocokkan tautan internal. */
  export type PetaSitus = {
    /** Path publik yang ada: dokumen terbit, halaman indeks, dan rute teknis. */
    path: ReadonlySet<string>
    /** `koleksi:id` dokumen terbit ke path-nya. */
    dokumen: ReadonlyMap<string, string>
    /** Redirect per path asal (koleksi `redirect`). */
    redirect: ReadonlyMap<string, { kode: string; ke: string | null }>
  }

  export type Temuan = { jenis: JenisTemuan; tujuan: string; pesan: string; sumber: Sumber }

  /** Halaman yang diharapkan punya tautan masuk: artikel dan halaman statis terbit yang tidak noindex. */
  export type Sasaran = { path: string; sumber: Sumber }

  export const PESAN_TEMUAN = {
    dokumen: 'Tujuan tautan belum terbit atau sudah dihapus. Ganti atau hapus tautannya.',
    tidakAda: 'Tidak ada halaman terbit di alamat ini. Ganti atau hapus tautannya.',
    dihapus: 'Halaman ini sudah dihapus (410). Hapus atau ganti tautannya.',
    dialihkan: (ke: string) => `Alamat lama, dialihkan ke ${ke}. Ganti tautannya ke alamat baru supaya pembaca dan Google tidak dialihkan.`,
    yatim: 'Belum ada tautan masuk dari tulisan lain, menu, atau beranda. Tautkan dari tulisan yang topiknya berdekatan.',
  } as const

  const kunciSumber = (s: Sumber) => `${s.koleksi}:${s.id ?? ''}`

  /**
   * Mencocokkan tautan dengan peta situs. Tautan ke dokumen yang belum terbit dan path tanpa halaman
   * adalah `rusak`; path dengan redirect 301 adalah `dialihkan` (tujuannya tetap dihitung sebagai tautan
   * masuk). Sasaran tanpa tautan masuk dari sumber lain (tautan ke dirinya sendiri tidak dihitung) adalah
   * `yatim`. URL situs lain dikumpulkan bersama sumbernya untuk pemeriksa tautan.
   */
  export function nilaiTautan(tautan: Tautan[], peta: PetaSitus, sasaran: Sasaran[]): { temuan: Temuan[]; luar: Map<string, Sumber[]> } {
    const temuan = new Map<string, Temuan>()
    const masuk = new Map<string, Set<string>>()
    const luar = new Map<string, Sumber[]>()
    const catat = (t: Temuan) => temuan.set(`${t.jenis} ${kunciSumber(t.sumber)} ${t.tujuan}`, t)
    const tandaiMasuk = (path: string, sumber: Sumber) => masuk.set(path, (masuk.get(path) ?? new Set()).add(kunciSumber(sumber)))

    for (const { sumber, tujuan } of tautan) {
      if (tujuan.jenis === 'luar') {
        const ada = luar.get(tujuan.url) ?? []
        if (!ada.some((s) => kunciSumber(s) === kunciSumber(sumber))) ada.push(sumber)
        luar.set(tujuan.url, ada)
        continue
      }
      if (tujuan.jenis === 'dokumen') {
        const path = peta.dokumen.get(`${tujuan.koleksi}:${tujuan.id}`)
        if (path) tandaiMasuk(path, sumber)
        else catat({ jenis: 'rusak', tujuan: `${tujuan.koleksi} #${tujuan.id}`, pesan: PESAN_TEMUAN.dokumen, sumber })
        continue
      }
      if (peta.path.has(tujuan.path)) {
        tandaiMasuk(tujuan.path, sumber)
        continue
      }
      const redirect = peta.redirect.get(tujuan.path)
      if (redirect?.kode === '301' && redirect.ke) {
        catat({ jenis: 'dialihkan', tujuan: tujuan.path, pesan: PESAN_TEMUAN.dialihkan(redirect.ke), sumber })
        tandaiMasuk(redirect.ke, sumber)
      } else {
        catat({ jenis: 'rusak', tujuan: tujuan.path, pesan: redirect?.kode === '410' ? PESAN_TEMUAN.dihapus : PESAN_TEMUAN.tidakAda, sumber })
      }
    }

    for (const s of sasaran) {
      const dari = [...(masuk.get(s.path) ?? [])].filter((k) => k !== kunciSumber(s.sumber))
      if (dari.length === 0) catat({ jenis: 'yatim', tujuan: s.path, pesan: PESAN_TEMUAN.yatim, sumber: s.sumber })
    }
    return { temuan: [...temuan.values()], luar }
  }
  ```

- [ ] **Langkah 4: Koleksi, pindai, dan pemeriksa tautan luar**

  `src/collections/TemuanTautan.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isAdmin, nobody } from '@/access'
  import { JENIS_TEMUAN, LABEL_JENIS_TEMUAN } from '@/modules/pantau/tipe'

  /**
   * Hasil pindai tautan harian modul pantau (spesifikasi §8 "Tingkat situs"): tautan internal yang rusak
   * atau menuju alamat lama, dan halaman yatim. Diganti seluruhnya setiap pindai; tampil di dashboard SEO
   * dengan tautan ke dokumen yang perlu diperbaiki.
   */
  export const TemuanTautan: CollectionConfig = {
    slug: 'temuan-tautan',
    labels: { singular: 'Temuan tautan', plural: 'Temuan tautan' },
    defaultSort: 'jenis',
    admin: { useAsTitle: 'tujuan', group: 'SEO', hidden: true },
    access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
    fields: [
      { name: 'jenis', type: 'select', required: true, index: true, options: JENIS_TEMUAN.map((value) => ({ value, label: LABEL_JENIS_TEMUAN[value] })) },
      { name: 'tujuan', type: 'text', required: true, admin: { description: 'Path tujuan tautan, path halaman yatim, atau dokumen yang belum terbit.' } },
      { name: 'pesan', type: 'text', required: true },
      { name: 'sumberKoleksi', type: 'text', required: true },
      { name: 'sumberId', type: 'text' },
      { name: 'sumberJudul', type: 'text', required: true },
      { name: 'sumberPath', type: 'text' },
      { name: 'ditemukan', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    ],
  }
  ```

  `src/collections/TautanLuar.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isAdmin, nobody } from '@/access'
  import { LABEL_STATUS_TAUTAN, STATUS_TAUTAN } from '@/modules/pantau/tipe'

  /**
   * Tautan ke situs lain di konten terbit (satu baris per URL) dan hasil pemeriksaan terakhirnya. Pindai
   * harian menambah URL baru dan membuang URL yang tidak lagi dipakai; cron memeriksa beberapa URL yang
   * jatuh tempo setiap jalan, jadi setiap URL dicek seminggu sekali (spesifikasi §8: link rusak mingguan).
   */
  export const TautanLuar: CollectionConfig = {
    slug: 'tautan-luar',
    labels: { singular: 'Tautan luar', plural: 'Tautan luar' },
    defaultSort: 'berikutnya',
    admin: { useAsTitle: 'url', group: 'SEO', hidden: true },
    access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
    fields: [
      { name: 'url', type: 'text', required: true, unique: true, index: true, label: 'URL' },
      {
        name: 'status',
        type: 'select',
        required: true,
        defaultValue: 'belum',
        index: true,
        options: STATUS_TAUTAN.map((value) => ({ value, label: LABEL_STATUS_TAUTAN[value] })),
      },
      { name: 'kodeHttp', type: 'number', label: 'Status HTTP' },
      { name: 'pesan', type: 'text' },
      { name: 'dicekPada', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'berikutnya', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'sumber', type: 'json', admin: { description: 'Dokumen yang memuat tautan ini: koleksi, id, judul, path.' } },
    ],
  }
  ```

  ```diff
  diff --git a/src/payload.config.ts b/src/payload.config.ts
  index 0684ccb..0629a70 100644
  --- a/src/payload.config.ts
  +++ b/src/payload.config.ts
  @@ -20,6 +20,8 @@ import { Pilar } from './collections/Pilar'
   import { Redirect } from './collections/Redirect'
   import { StatusIndeks } from './collections/StatusIndeks'
   import { Subkategori } from './collections/Subkategori'
  +import { TautanLuar } from './collections/TautanLuar'
  +import { TemuanTautan } from './collections/TemuanTautan'
   import { Tools } from './collections/Tools'
   import { TugasSeo } from './collections/TugasSeo'
   import { Video } from './collections/Video'
  @@ -59,6 +61,8 @@ export default buildConfig({
       AnalitikHalaman,
       AnalitikSitus,
       TugasSeo,
  +    TemuanTautan,
  +    TautanLuar,
     ],
     globals: [Header, Footer, Beranda, PengaturanSEO, Newsletter],
     // `GET /api/jobs/run`: cron Vercel setiap 10 menit (vercel.json), jadwal terbit, Mesin Indexing, dan Pantau SEO.
  ```

  `src/modules/pantau/pindai.ts`

  ```ts
  import type { Payload, PayloadRequest, Where } from 'payload'

  import type { TipeArtikel } from '@/lib/konstanta'
  import { PATH_INDEKS, pathFor } from '@/lib/paths'
  import { PATH_FEED } from '@/modules/seo/metadata'
  import { JENIS_SITEMAP, PATH_NEWS_SITEMAP, PATH_SITEMAP_INDEX, pathSitemap } from '@/modules/seo/xml'

  import type { AdapterPantau } from './adapter'
  import { BATAS_TAUTAN_PER_JALAN, jadwalCekTautan, statusTautan, TAUTAN_BERSAMAAN, type HasilTugas } from './aturan'
  import { nilaiTautan, tautanDokumen, type KoleksiSumber, type Sasaran, type Sumber, type Tautan, type Temuan } from './tautan'

  /** Batas dokumen per koleksi yang dipindai sekali jalan; jauh di atas jumlah konten MVP. */
  const MAKS_DOKUMEN = 10_000

  const terbit: Where = { _status: { equals: 'published' } }

  /** Rute yang selalu ada tanpa dokumen: beranda, halaman indeks, dan rute teknis. */
  const PATH_TETAP = ['/', ...Object.values(PATH_INDEKS), PATH_FEED, PATH_SITEMAP_INDEX, PATH_NEWS_SITEMAP, '/robots.txt', ...JENIS_SITEMAP.map(pathSitemap)]

  type Dok = { id: number | string } & Record<string, unknown>

  async function semua(payload: Payload, collection: 'artikel' | 'halaman' | 'pilar' | 'subkategori' | 'tools' | 'video' | 'penulis' | 'redirect', where?: Where): Promise<Dok[]> {
    const { docs } = await payload.find({ collection, where, depth: collection === 'subkategori' ? 1 : 0, limit: MAKS_DOKUMEN, pagination: false, populate: { pilar: { slug: true } } })
    return docs as unknown as Dok[]
  }

  const noindex = (doc: Dok) => (doc.seo as { noindex?: boolean | null } | null | undefined)?.noindex === true

  /**
   * Membaca semua konten terbit, menu, dan beranda, lalu menyusun daftar tautan, peta situs, dan halaman
   * yang diharapkan punya tautan masuk (artikel dan halaman statis terbit yang tidak noindex).
   */
  async function kumpulkan(payload: Payload, urlSitus: string) {
    const dokumen = new Map<string, string>()
    const tautan: Tautan[] = []
    const sasaran: Sasaran[] = []
    const tambah = (koleksi: KoleksiSumber, doc: Dok, sumber: Sumber) => {
      for (const tujuan of tautanDokumen(koleksi, doc, urlSitus)) tautan.push({ sumber, tujuan })
    }
    const daftarkan = (koleksi: string, doc: Dok, path: string | null) => {
      if (path) dokumen.set(`${koleksi}:${doc.id}`, path)
      return path
    }

    for (const doc of await semua(payload, 'artikel', terbit)) {
      const path = daftarkan('artikel', doc, doc.slug && doc.tipe ? pathFor({ jenis: 'artikel', slug: String(doc.slug), tipe: doc.tipe as TipeArtikel }) : null)
      const sumber: Sumber = { koleksi: 'artikel', id: doc.id, judul: String(doc.judul), path }
      tambah('artikel', doc, sumber)
      if (path && !noindex(doc)) sasaran.push({ path, sumber })
    }
    for (const doc of await semua(payload, 'halaman', terbit)) {
      const path = daftarkan('halaman', doc, doc.slug ? pathFor({ jenis: 'halaman', slug: String(doc.slug) }) : null)
      const sumber: Sumber = { koleksi: 'halaman', id: doc.id, judul: String(doc.judul), path }
      tambah('halaman', doc, sumber)
      if (path && !noindex(doc)) sasaran.push({ path, sumber })
    }
    for (const doc of await semua(payload, 'pilar')) {
      const path = daftarkan('pilar', doc, doc.slug ? pathFor({ jenis: 'pilar', slug: String(doc.slug) }) : null)
      tambah('pilar', doc, { koleksi: 'pilar', id: doc.id, judul: String(doc.nama), path })
    }
    for (const doc of await semua(payload, 'subkategori')) {
      const pilarSlug = (doc.pilar as { slug?: string | null } | null)?.slug
      daftarkan('subkategori', doc, doc.slug && pilarSlug ? pathFor({ jenis: 'subkategori', slug: String(doc.slug), pilarSlug }) : null)
    }
    for (const doc of await semua(payload, 'tools', terbit)) {
      const path = daftarkan('tools', doc, doc.slug ? pathFor({ jenis: 'tools', slug: String(doc.slug) }) : null)
      tambah('tools', doc, { koleksi: 'tools', id: doc.id, judul: String(doc.nama), path })
    }
    for (const doc of await semua(payload, 'video', terbit)) {
      daftarkan('video', doc, doc.slug ? pathFor({ jenis: 'video', slug: String(doc.slug) }) : null)
    }
    for (const doc of await semua(payload, 'penulis')) {
      const path = daftarkan('penulis', doc, doc.slug ? pathFor({ jenis: 'penulis', slug: String(doc.slug) }) : null)
      tambah('penulis', doc, { koleksi: 'penulis', id: doc.id, judul: String(doc.nama), path })
    }
    const global: [KoleksiSumber & ('header' | 'footer' | 'beranda'), string, string | null][] = [
      ['header', 'Menu header', null],
      ['footer', 'Footer', null],
      ['beranda', 'Beranda', '/'],
    ]
    for (const [slug, judul, path] of global) {
      const doc = (await payload.findGlobal({ slug, depth: 0 })) as unknown as Dok
      tambah(slug, doc, { koleksi: slug, id: null, judul, path })
    }
    const redirect = new Map(
      (await semua(payload, 'redirect')).map((r) => [String(r.dari), { kode: String(r.kode), ke: (r.ke as string | null | undefined) ?? null }]),
    )
    return { tautan, sasaran, peta: { path: new Set([...PATH_TETAP, ...dokumen.values()]), dokumen, redirect } }
  }

  const dataSumber = (s: Sumber) => ({ sumberKoleksi: s.koleksi, sumberId: s.id === null ? null : String(s.id), sumberJudul: s.judul, sumberPath: s.path })

  /**
   * Menyimpan hasil pindai dalam satu transaksi: temuan diganti seluruhnya; URL situs lain yang baru
   * ditambahkan (jatuh tempo dicek sekarang), yang masih dipakai diperbarui sumbernya, dan yang tidak lagi
   * dipakai dibuang.
   */
  async function simpan(payload: Payload, temuan: Temuan[], luar: Map<string, Sumber[]>, sekarang: Date): Promise<void> {
    const { docs: ada } = await payload.find({ collection: 'tautan-luar', depth: 0, limit: MAKS_DOKUMEN * 10, pagination: false, select: { url: true } })
    const idUrl = new Map(ada.map((d) => [d.url, d.id]))
    const transaksi = await payload.db.beginTransaction()
    const req: Partial<PayloadRequest> = transaksi ? { transactionID: transaksi } : {}
    try {
      await payload.db.deleteMany({ collection: 'temuan-tautan', where: { id: { exists: true } }, req })
      for (const t of temuan) {
        await payload.db.create({
          collection: 'temuan-tautan',
          data: { jenis: t.jenis, tujuan: t.tujuan, pesan: t.pesan, ...dataSumber(t.sumber), ditemukan: sekarang.toISOString() },
          req,
          returning: false,
        })
      }
      const usang = ada.filter((d) => !luar.has(d.url)).map((d) => d.id)
      if (usang.length) await payload.db.deleteMany({ collection: 'tautan-luar', where: { id: { in: usang } }, req })
      for (const [url, sumber] of luar) {
        const id = idUrl.get(url)
        if (id) await payload.db.updateOne({ collection: 'tautan-luar', id, data: { sumber }, req, returning: false })
        else await payload.db.create({ collection: 'tautan-luar', data: { url, status: 'belum', berikutnya: sekarang.toISOString(), sumber }, req, returning: false })
      }
      if (transaksi) await payload.db.commitTransaction(transaksi)
    } catch (galat) {
      if (transaksi) await payload.db.rollbackTransaction(transaksi)
      throw galat
    }
  }

  const angka = new Intl.NumberFormat('id-ID')

  /**
   * Pindai tautan harian (spesifikasi §8 "Tingkat situs"): tautan internal dicocokkan dengan database
   * (dokumen terbit, halaman indeks, redirect), halaman yatim dihitung dari tautan masuk di isi dokumen
   * terbit, menu, dan beranda, dan URL situs lain dikumpulkan untuk `periksaTautanLuar`. Daftar otomatis
   * (rubrik, tulisan terbaru, artikel terkait otomatis, sitemap) tidak dihitung sebagai tautan masuk karena
   * isinya berganti setiap ada tulisan baru.
   */
  export async function pindaiTautan(payload: Payload, urlSitus: string, sekarang: Date): Promise<{ hasil: HasilTugas; pesan: string }> {
    const { tautan, sasaran, peta } = await kumpulkan(payload, urlSitus)
    const { temuan, luar } = nilaiTautan(tautan, peta, sasaran)
    await simpan(payload, temuan, luar, sekarang)
    const jumlah = (jenis: Temuan['jenis']) => angka.format(temuan.filter((t) => t.jenis === jenis).length)
    return {
      hasil: 'berhasil',
      pesan:
        `${angka.format(tautan.length)} tautan dipindai: ${jumlah('rusak')} tautan internal rusak, ${jumlah('dialihkan')} ke alamat lama, ` +
        `${jumlah('yatim')} halaman yatim, ${angka.format(luar.size)} URL situs lain.`,
    }
  }

  /**
   * Memeriksa tautan ke situs lain yang jatuh tempo, paling banyak 10 per jalan cron dan 5 bersamaan, supaya
   * satu jalan tetap singkat. Hasil dan jadwal cek berikutnya (seminggu, atau besok bila belum pasti)
   * disimpan per URL. Mengembalikan jumlah URL yang dicek.
   */
  export async function periksaTautanLuar(payload: Payload, adapter: AdapterPantau, sekarang: Date): Promise<number> {
    const { docs } = await payload.find({
      collection: 'tautan-luar',
      where: { berikutnya: { less_than_equal: sekarang.toISOString() } },
      sort: ['berikutnya', 'id'],
      limit: BATAS_TAUTAN_PER_JALAN,
      depth: 0,
      pagination: false,
      select: { url: true },
    })
    for (let i = 0; i < docs.length; i += TAUTAN_BERSAMAAN) {
      await Promise.all(
        docs.slice(i, i + TAUTAN_BERSAMAAN).map(async (d) => {
          const hasil = statusTautan(await adapter.periksaTautan(d.url))
          await payload.update({
            collection: 'tautan-luar',
            where: { id: { equals: d.id } },
            data: { ...hasil, dicekPada: sekarang.toISOString(), berikutnya: jadwalCekTautan(hasil.status, sekarang).toISOString() },
            depth: 0,
          })
        }),
      )
    }
    return docs.length
  }
  ```

  ```diff
  diff --git a/src/modules/pantau/index.ts b/src/modules/pantau/index.ts
  index c610e7e..d272089 100644
  --- a/src/modules/pantau/index.ts
  +++ b/src/modules/pantau/index.ts
  @@ -6,14 +6,17 @@ import type { PengaturanIndexing } from '@/modules/indexer/tipe'
   import { adapterPantau, type AdapterPantau } from './adapter'
   import { hapusDataLama, sinkronAnalitik } from './analitik'
   import { jadwalTugas, type HasilTugas } from './aturan'
  +import { periksaTautanLuar, pindaiTautan } from './pindai'
   import { klaimTugas, selesaikanTugas } from './tugas'
  -import type { JenisTugas, StatusTugas } from './tipe'
  +import { JENIS_TUGAS, type JenisTugas, type StatusTugas } from './tipe'
   
   /**
    * Pantau SEO (spesifikasi §8 "Tingkat situs" dan "Dashboard SEO"). Antarmuka modul:
    *
    * - `jalankanPantau(payload, opsi)`: dipanggil cron `GET /api/jobs/run` setiap 10 menit. Menjalankan
  - *   tugas yang jatuh tempo (masing-masing sekali sehari): sinkron Search Analytics beserta retensi data.
  + *   tugas yang jatuh tempo (masing-masing sekali sehari): sinkron Search Analytics beserta retensi data,
  + *   dan pindai tautan (tautan internal rusak, halaman yatim, daftar tautan luar). Setiap jalan juga
  + *   memeriksa beberapa tautan luar yang jatuh tempo (masing-masing seminggu sekali).
    *
    * Semua panggilan ke luar lewat adapter (`adapter.ts`), dipilih env `INDEXER_ADAPTER` yang sama dengan
    * Mesin Indexing. Hasil setiap tugas tersimpan di `tugas-seo` dan tampil di dashboard SEO.
  @@ -30,7 +33,9 @@ const analitik: Pelaksana = async (k) => {
     return hasil
   }
   
  -const PELAKSANA: Partial<Record<JenisTugas, Pelaksana>> = { analitik }
  +const tautan: Pelaksana = (k) => pindaiTautan(k.payload, k.pengaturan.urlSitus, k.sekarang)
  +
  +const PELAKSANA: Record<JenisTugas, Pelaksana> = { analitik, tautan }
   
   const STATUS: Record<HasilTugas, Exclude<StatusTugas, 'berjalan'>> = {
     berhasil: 'berhasil',
  @@ -39,14 +44,20 @@ const STATUS: Record<HasilTugas, Exclude<StatusTugas, 'berjalan'>> = {
     'kuota-habis': 'gagal',
   }
   
  -export type RingkasanPantau = Partial<Record<JenisTugas, { status: Exclude<StatusTugas, 'berjalan'>; pesan: string }>>
  +export type RingkasanPantau = Partial<Record<JenisTugas, { status: Exclude<StatusTugas, 'berjalan'>; pesan: string }>> & {
  +  /** Jumlah tautan luar yang dicek jalan ini (hanya bila ada). */
  +  tautanDicek?: number
  +}
   
   /**
    * Menjalankan tugas Pantau SEO yang jatuh tempo. Aman dipanggil berulang atau bersamaan: tugas diklaim
    * atomik dan hanya berjalan sekali per jadwal. Galat tak terduga dicatat sebagai Gagal (dicoba lagi sejam
  - * kemudian) dan tidak menghentikan tugas lain.
  + * kemudian) dan tidak menghentikan tugas lain. `tugas` membatasi tugas yang dijalankan (tes).
    */
  -export async function jalankanPantau(payload: Payload, opsi: { sekarang?: Date; adapter?: AdapterPantau } = {}): Promise<RingkasanPantau> {
  +export async function jalankanPantau(
  +  payload: Payload,
  +  opsi: { sekarang?: Date; adapter?: AdapterPantau; tugas?: readonly JenisTugas[] } = {},
  +): Promise<RingkasanPantau> {
     const k: Konteks = {
       payload,
       adapter: opsi.adapter ?? adapterPantau(),
  @@ -54,7 +65,9 @@ export async function jalankanPantau(payload: Payload, opsi: { sekarang?: Date;
       sekarang: opsi.sekarang ?? new Date(),
     }
     const ringkasan: RingkasanPantau = {}
  -  for (const [jenis, pelaksana] of Object.entries(PELAKSANA) as [JenisTugas, Pelaksana][]) {
  +  const tugas = opsi.tugas ?? JENIS_TUGAS
  +  for (const jenis of tugas) {
  +    const pelaksana = PELAKSANA[jenis]
       const klaim = await klaimTugas(payload, jenis, k.sekarang)
       if (!klaim) continue
       let hasil: { hasil: HasilTugas; pesan: string }
  @@ -68,6 +81,10 @@ export async function jalankanPantau(payload: Payload, opsi: { sekarang?: Date;
       await selesaikanTugas(payload, klaim, { status, pesan: hasil.pesan, berikutnya: jadwalTugas(hasil.hasil, k.sekarang) }, k.sekarang)
       ringkasan[jenis] = { status, pesan: hasil.pesan }
     }
  +  if (tugas.includes('tautan')) {
  +    const dicek = await periksaTautanLuar(payload, k.adapter, k.sekarang)
  +    if (dicek) ringkasan.tautanDicek = dicek
  +  }
     return ringkasan
   }
   
  ```

  ```diff
  diff --git a/src/modules/indexer/endpoint.ts b/src/modules/indexer/endpoint.ts
  index 66efe37..f5187df 100644
  --- a/src/modules/indexer/endpoint.ts
  +++ b/src/modules/indexer/endpoint.ts
  @@ -24,7 +24,7 @@ export type OpsiJadwal = NonNullable<Parameters<typeof jalankanIndexer>[1]> & {
   /**
    * Pekerjaan berkala (spesifikasi §5 "Penjadwal"): job Payload yang jatuh tempo (jadwal terbit artikel,
    * `schedulePublish`), lalu antrean Mesin Indexing, lalu tugas Pantau SEO yang jatuh tempo (sinkron
  - * Search Analytics harian). Urutan ini membuat artikel yang terbit terjadwal langsung dikabarkan pada
  + * Search Analytics dan pindai tautan harian, cek tautan luar). Urutan ini membuat artikel yang terbit terjadwal langsung dikabarkan pada
    * jalan yang sama.
    */
   export async function jalankanJadwal(payload: Payload, opsi: OpsiJadwal = {}): Promise<HasilJadwal> {
  ```

  ```diff
  diff --git a/src/scripts/jalankan-indexer.ts b/src/scripts/jalankan-indexer.ts
  index 825f113..56747a6 100644
  --- a/src/scripts/jalankan-indexer.ts
  +++ b/src/scripts/jalankan-indexer.ts
  @@ -2,7 +2,7 @@ import config from '@payload-config'
   import { getPayload } from 'payload'
   
   import { jalankanJadwal } from '@/modules/indexer/endpoint'
  -import { LABEL_STATUS_TUGAS, LABEL_TUGAS, type JenisTugas } from '@/modules/pantau/tipe'
  +import { JENIS_TUGAS, LABEL_STATUS_TUGAS, LABEL_TUGAS } from '@/modules/pantau/tipe'
   
   /**
    * `pnpm indexer`: menjalankan sekali pekerjaan cron (jadwal terbit, antrean Mesin Indexing, dan tugas
  @@ -10,7 +10,11 @@ import { LABEL_STATUS_TUGAS, LABEL_TUGAS, type JenisTugas } from '@/modules/pant
    */
   const payload = await getPayload({ config })
   const { jadwalTerbit, indexer, pantau } = await jalankanJadwal(payload)
  -const tugas = Object.entries(pantau).map(([jenis, h]) => `${LABEL_TUGAS[jenis as JenisTugas]} ${LABEL_STATUS_TUGAS[h.status].toLowerCase()} (${h.pesan})`)
  +const tugas = JENIS_TUGAS.flatMap((jenis) => {
  +  const h = pantau[jenis]
  +  return h ? [`${LABEL_TUGAS[jenis]} ${LABEL_STATUS_TUGAS[h.status].toLowerCase()} (${h.pesan})`] : []
  +})
  +if (pantau.tautanDicek) tugas.push(`${pantau.tautanDicek} tautan luar dicek`)
   payload.logger.info(
     `Jadwal terbit: ${jadwalTerbit} job. Mesin Indexing: ${indexer.diproses} langkah (berhasil ${indexer.berhasil}, ` +
       `dicoba lagi ${indexer.diulang}, gagal ${indexer.gagal}, dilewati ${indexer.dilewati}, ditunda ${indexer.ditunda}). ` +
  ```

- [ ] **Langkah 5: Tipe Payload dan database dev**

  ```bash
  pnpm generate:types
  git diff --stat src/payload-types.ts
  pnpm seed
  ```

  Hasil yang diharapkan: `1 file changed, 90 insertions(+)`; `pnpm seed` selesai tanpa pertanyaan DATA LOSS (dua tabel baru).

- [ ] **Langkah 6: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 59 passed (59)`, `Tests 407 passed (407)`; integrasi `Test Files 34 passed (34)`, `Tests 111 passed (111)`; E2E `91 passed`.

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/modules/pantau src/collections/TemuanTautan.ts src/collections/TautanLuar.ts src/payload.config.ts src/payload-types.ts src/modules/indexer/endpoint.ts src/scripts/jalankan-indexer.ts tests/unit/pantau-tautan.test.ts tests/int/pantau-tautan.int.spec.ts tests/int/pantau-analitik.int.spec.ts
  git commit -m "feat(pantau): pindai tautan harian (tautan internal rusak, alamat lama, halaman yatim) dan pemeriksa tautan luar mingguan, 10 per jalan cron"
  ```

---

### Task 6: Tombol "Buat redirect" di log 404

**Files:**
- Create: `src/lib/admin.ts`, `src/modules/pantau/admin/SelBuatRedirect.tsx`, `tests/e2e/pantau.spec.ts`
- Modify: `src/lib/redirect.ts`, `src/collections/Redirect.ts`, `src/collections/Log404.ts`, `src/app/(payload)/admin/importMap.js` (dibuat ulang)
- Test: `tests/unit/redirect.test.ts`, `tests/e2e/pantau.spec.ts`

**Interfaces:**
- Consumes: `validasiPathRedirect` (`src/lib/redirect.ts`), koleksi `log-404` dan `redirect` (Rencana 4A).
- Produces:
  - `src/lib/admin.ts`: `PATH_ADMIN` (`'/admin'`), `urlAdmin.daftar(koleksi)`, `urlAdmin.dokumen(koleksi, id)`, `urlAdmin.buat(koleksi, isian?)` (kueri URL), `urlAdmin.global(slug)`.
  - `src/lib/redirect.ts`: `pathDariKueri(nilai): string | undefined`.
  - Field `dari` di `redirect` terisi dari `?dari=/path`; kolom `tindakan` (field `ui`) di daftar Log 404 dengan sel `SelBuatRedirect` ("Buat redirect" atau "Lihat redirect"). Dashboard Task 8 memakai `urlAdmin` yang sama.

Spesifikasi §8: "log 404 dengan tombol buat redirect". Payload 3.92 membangun isi awal form admin dengan `req` halaman, dan `req.query` berisi kueri URL (`@payloadcms/next` `views/Root`, `getDefaultValue` menerima `req`), jadi `defaultValue: ({ req }) => pathDariKueri(req.query.dari)` di field `dari` cukup untuk mengisi path dari tautan `/admin/collections/redirect/create?dari=/path`. Isian kueri yang bukan path redirect sah diabaikan. Sel kolom memeriksa apakah path itu sudah punya redirect (satu query kecil per baris, seperti kolom status indeks Rencana 6A) dan menampilkan "Lihat redirect" bila sudah. Nama tautan menyebut path-nya (`aria-label` yang diawali teks terlihat), supaya pembaca layar bisa membedakan baris.

Rate limit endpoint beacon 404 tidak murah tanpa penyimpanan bersama di serverless; tetap di Rencana 8 (Vercel Firewall), seperti dicatat Rencana 4A.

- [ ] **Langkah 1: Tulis tes yang gagal**

  ```diff
  diff --git a/tests/unit/redirect.test.ts b/tests/unit/redirect.test.ts
  index b081b3d..89e3f43 100644
  --- a/tests/unit/redirect.test.ts
  +++ b/tests/unit/redirect.test.ts
  @@ -1,6 +1,7 @@
   import { describe, expect, it } from 'vitest'
   
  -import { rencanaRedirect, validasiPathRedirect } from '@/lib/redirect'
  +import { urlAdmin } from '@/lib/admin'
  +import { pathDariKueri, rencanaRedirect, validasiPathRedirect } from '@/lib/redirect'
   
   describe('validasiPathRedirect', () => {
     it('menerima path yang diawali garis miring', () => {
  @@ -58,3 +59,14 @@ describe('rencanaRedirect', () => {
       })
     })
   })
  +
  +describe('tombol "Buat redirect"', () => {
  +  it('form redirect baru dengan path asal di kueri; path di kueri hanya dipakai bila sah', () => {
  +    expect(urlAdmin.buat('redirect', { dari: '/jalan-lama' })).toBe('/admin/collections/redirect/create?dari=%2Fjalan-lama')
  +    expect(urlAdmin.buat('redirect')).toBe('/admin/collections/redirect/create')
  +    expect(urlAdmin.dokumen('redirect', 7)).toBe('/admin/collections/redirect/7')
  +    expect(urlAdmin.global('header')).toBe('/admin/globals/header')
  +    expect(pathDariKueri('/jalan-lama')).toBe('/jalan-lama')
  +    for (const nilai of ['jalan-lama', '//evil.example', '/jalan-lama/', ['/a'], undefined]) expect(pathDariKueri(nilai)).toBeUndefined()
  +  })
  +})
  ```

  `tests/e2e/pantau.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { ADMIN_E2E } from './data'

  test('log 404: "Buat redirect" membuka form redirect dengan path terisi; setelah disimpan menjadi "Lihat redirect" dan path itu dialihkan', async ({ page }) => {
    const path = `/jalan-lama-${Date.now()}`
    expect((await page.request.post('/api/log-404/catat', { data: { path } })).status()).toBe(204)
    await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
    const daftar = `/admin/collections/log-404?where[path][equals]=${encodeURIComponent(path)}`

    await page.goto(daftar)
    await page.getByRole('link', { name: `Buat redirect untuk ${path}` }).click()
    await expect(page).toHaveURL(/\/admin\/collections\/redirect\/create\?dari=/)
    await expect(page.getByLabel('Dari')).toHaveValue(path)
    await page.getByLabel('Ke').fill('/tentang')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveURL(/\/admin\/collections\/redirect\/\d+/)

    await page.goto(daftar)
    await expect(page.getByRole('link', { name: `Lihat redirect untuk ${path}` })).toBeVisible()
    const jawaban = await page.request.get(path, { maxRedirects: 0 })
    expect(jawaban.status()).toBe(308)
    expect(jawaban.headers().location).toContain('/tentang')
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/redirect.test.ts` dengan `Error: Cannot find package '@/lib/admin'`.

- [ ] **Langkah 3: URL admin, path dari kueri, dan isian awal `dari`**

  `src/lib/admin.ts`

  ```ts
  /**
   * URL halaman admin Payload (rute bawaan `/admin`), satu-satunya tempat path admin dirangkai. Dipakai
   * dashboard SEO dan sel daftar admin untuk menautkan dokumen yang perlu diperbaiki.
   */
  export const PATH_ADMIN = '/admin'

  export const urlAdmin = {
    daftar: (koleksi: string) => `${PATH_ADMIN}/collections/${koleksi}`,
    dokumen: (koleksi: string, id: number | string) => `${PATH_ADMIN}/collections/${koleksi}/${id}`,
    /** Form dokumen baru; `isian` menjadi kueri URL yang dibaca `defaultValue` field (misalnya `?dari=/path`). */
    buat: (koleksi: string, isian: Record<string, string> = {}) => {
      const kueri = new URLSearchParams(isian).toString()
      return `${PATH_ADMIN}/collections/${koleksi}/create${kueri ? `?${kueri}` : ''}`
    },
    global: (slug: string) => `${PATH_ADMIN}/globals/${slug}`,
  } as const
  ```

  ```diff
  diff --git a/src/lib/redirect.ts b/src/lib/redirect.ts
  index 7c20bbe..2f2a6ce 100644
  --- a/src/lib/redirect.ts
  +++ b/src/lib/redirect.ts
  @@ -43,3 +43,11 @@ export function validasiPathRedirect(nilai: unknown): true | string {
     if (nilai.length > 1 && nilai.endsWith('/')) return 'Hapus garis miring di akhir path.'
     return true
   }
  +
  +/**
  + * Path redirect dari kueri URL form admin (`/admin/collections/redirect/create?dari=/path`), dipakai tombol
  + * "Buat redirect" di log 404 dan dashboard SEO. Isian yang bukan path redirect yang sah diabaikan.
  + */
  +export function pathDariKueri(nilai: unknown): string | undefined {
  +  return typeof nilai === 'string' && validasiPathRedirect(nilai) === true ? nilai : undefined
  +}
  ```

  ```diff
  diff --git a/src/collections/Redirect.ts b/src/collections/Redirect.ts
  index ff68c39..aa6a1e4 100644
  --- a/src/collections/Redirect.ts
  +++ b/src/collections/Redirect.ts
  @@ -2,7 +2,7 @@ import type { CollectionConfig } from 'payload'
   
   import { isLoggedIn } from '@/access'
   import { revalidasiKoleksi } from '@/hooks/revalidasiPublik'
  -import { validasiPathRedirect } from '@/lib/redirect'
  +import { pathDariKueri, validasiPathRedirect } from '@/lib/redirect'
   import { TAG } from '@/lib/tag'
   import { validasiUrlOpsional } from '@/lib/validasi'
   
  @@ -22,6 +22,8 @@ export const Redirect: CollectionConfig = {
         required: true,
         unique: true,
         index: true,
  +      // Tombol "Buat redirect" (log 404, dashboard SEO) membuka form ini dengan `?dari=/path`.
  +      defaultValue: ({ req }) => pathDariKueri(req?.query?.dari),
         validate: (value: unknown) => validasiPathRedirect(value),
       },
       {
  ```

- [ ] **Langkah 4: Kolom Tindakan di daftar Log 404**

  `src/modules/pantau/admin/SelBuatRedirect.tsx`

  ```tsx
  import type { Payload } from 'payload'

  import { urlAdmin } from '@/lib/admin'

  /**
   * Sel kolom "Tindakan" di daftar Log 404 (spesifikasi §8): "Buat redirect" membuka form redirect dengan
   * path terisi, atau "Lihat redirect" bila path itu sudah dialihkan. Nama tautan menyebut path-nya supaya
   * pembaca layar bisa membedakan setiap baris. Server component, satu query kecil per baris.
   */
  export async function SelBuatRedirect({ rowData, payload }: { rowData?: { path?: string | null }; payload: Payload }) {
    const path = rowData?.path
    if (!path) return null
    const { docs } = await payload.find({ collection: 'redirect', where: { dari: { equals: path } }, limit: 1, depth: 0, select: { dari: true } })
    if (docs[0]) {
      return (
        <a href={urlAdmin.dokumen('redirect', docs[0].id)} aria-label={`Lihat redirect untuk ${path}`}>
          Lihat redirect
        </a>
      )
    }
    return (
      <a href={urlAdmin.buat('redirect', { dari: path })} aria-label={`Buat redirect untuk ${path}`}>
        Buat redirect
      </a>
    )
  }
  ```

  ```diff
  diff --git a/src/collections/Log404.ts b/src/collections/Log404.ts
  index 07bd6f1..2711ec9 100644
  --- a/src/collections/Log404.ts
  +++ b/src/collections/Log404.ts
  @@ -3,12 +3,15 @@ import type { CollectionConfig } from 'payload'
   import { isLoggedIn } from '@/access'
   import { endpointCatat404 } from '@/modules/konten/endpoint'
   
  -/** Diisi beacon halaman 404 lewat `POST /api/log-404/catat` (Rencana 4). Editor bisa menjadikannya redirect. */
  +/**
  + * Diisi beacon halaman 404 lewat `POST /api/log-404/catat` (Rencana 4). Kolom Tindakan membuka form redirect
  + * dengan path terisi (spesifikasi §8: log 404 dengan tombol "buat redirect"), atau redirect yang sudah ada.
  + */
   export const Log404: CollectionConfig = {
     slug: 'log-404',
     labels: { singular: 'Log 404', plural: 'Log 404' },
     defaultSort: '-jumlah',
  -  admin: { useAsTitle: 'path', defaultColumns: ['path', 'jumlah', 'terakhir', 'referer'], group: 'SEO' },
  +  admin: { useAsTitle: 'path', defaultColumns: ['path', 'jumlah', 'terakhir', 'referer', 'tindakan'], group: 'SEO' },
     access: { read: isLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
     endpoints: [endpointCatat404],
     fields: [
  @@ -16,5 +19,11 @@ export const Log404: CollectionConfig = {
       { name: 'jumlah', type: 'number', defaultValue: 1 },
       { name: 'terakhir', type: 'date' },
       { name: 'referer', type: 'text' },
  +    {
  +      name: 'tindakan',
  +      type: 'ui',
  +      label: 'Tindakan',
  +      admin: { components: { Cell: '@/modules/pantau/admin/SelBuatRedirect#SelBuatRedirect' } },
  +    },
     ],
   }
  ```

  ```bash
  pnpm generate:importmap
  git diff --stat "src/app/(payload)/admin/importMap.js"
  pnpm generate:types
  git diff --stat src/payload-types.ts
  ```

  Hasil yang diharapkan: import map `1 file changed, 2 insertions(+)` (`SelBuatRedirect`); `payload-types.ts` tidak berubah (field `ui` dan `defaultValue` tidak menambah kolom).

- [ ] **Langkah 5: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 59 passed (59)`, `Tests 408 passed (408)`; integrasi `Test Files 34 passed (34)`, `Tests 111 passed (111)`; E2E `92 passed`.

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/lib/admin.ts src/lib/redirect.ts src/collections/Redirect.ts src/collections/Log404.ts src/modules/pantau/admin/SelBuatRedirect.tsx "src/app/(payload)/admin/importMap.js" tests/unit/redirect.test.ts tests/e2e/pantau.spec.ts
  git commit -m "feat(seo): tombol Buat redirect di log 404 membuka form redirect dengan path terisi"
  ```

---

### Task 7: Data dashboard SEO dalam satu panggilan

**Files:**
- Create: `src/modules/pantau/dashboard.ts`, `src/modules/pantau/format.ts`
- Test: `tests/unit/pantau-format.test.ts`, `tests/int/pantau-dashboard.int.spec.ts`

**Interfaces:**
- Consumes: koleksi `tugas-seo`, `analitik-situs`, `analitik-halaman` (Task 3), `temuan-tautan`, `tautan-luar` (Task 5), `status-indeks` dan `log-indexing` (Rencana 6A), `log-404` dan `redirect` (Rencana 4A), `ringkasSitus`, `geserTanggal`, `tanggalPasifik` (Task 1), `urlAdmin` (Task 6), label indexer (`LABEL_STATUS_INDEKS`, `LABEL_LANGKAH`, `LABEL_STATUS_LOG`).
- Produces:
  - `dashboard.ts`: `ambilDashboard(payload, sekarang?): Promise<DataDashboard>` dengan `tugas` (per jenis, `InfoTugas | null`), `analitik` (`sampai`, `situs: RingkasanSitus | null`, `halaman` 20 teratas, `jumlahHalaman`), `statusIndeks` (status dengan jumlah, terbanyak dulu), `log` (`gagal7Hari`, `terbaru` 8 baris), `tautan` (`TautanBermasalah[]`: `rusak`, `luar-rusak`, `dialihkan`, `luar-cek`, dengan sumber dan tautan perbaikannya), `yatim`, `log404` (10 teratas dengan tautan redirect bila ada); `hrefSumber(sumber)`; konstanta `MAKS_HALAMAN_DASHBOARD` (20), `MAKS_LOG_DASHBOARD` (8), `MAKS_404_DASHBOARD` (10), `MAKS_TEMUAN_DASHBOARD` (50).
  - `format.ts`: `teksJumlah`, `teksRingkas` (ringkas mulai 10.000), `teksPersen`, `teksPosisi`, `teksWaktu` (WIB), `teksTanggal` (tanggal kalender, opsi pendek), `batasSumbu`.

View admin (Task 8) cukup memanggil `ambilDashboard` sekali dan merender hasilnya; semua query dan pengelompokan ada di sini supaya bisa diuji integrasi tanpa browser. Fungsi ini hanya membaca: datanya diisi tugas harian (Task 3 dan 5), Mesin Indexing, dan beacon 404. Tautan bermasalah diurutkan dari yang paling perlu ditangani: tautan internal rusak, tautan luar rusak, alamat lama, lalu tautan luar yang perlu dicek manual. Waktu tampil di WIB karena pemilik di Indonesia, sedangkan tanggal data Search Console tetap tanggal kalender waktu Pasifik apa adanya.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/pantau-format.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { hrefSumber } from '@/modules/pantau/dashboard'
  import { batasSumbu, teksJumlah, teksPersen, teksPosisi, teksRingkas, teksTanggal, teksWaktu } from '@/modules/pantau/format'

  describe('format dashboard SEO', () => {
    it('angka: utuh dengan titik ribuan; ringkas mulai 10.000 dengan spasi tak putus dari Intl', () => {
      expect(teksJumlah(1284)).toBe('1.284')
      expect(teksRingkas(9_999)).toBe('9.999')
      expect(teksRingkas(182_400)).toBe('182,4\u00a0rb')
      expect(teksRingkas(2_500_000)).toBe('2,5\u00a0jt')
      expect(teksPersen(0.0612)).toBe('6,1%')
      expect(teksPersen(0)).toBe('0%')
      expect(teksPosisi(6.43)).toBe('6,4')
      expect(teksPosisi(null)).toBe('-')
    })

    it('waktu di WIB dan tanggal kalender data Search Console', () => {
      expect(teksWaktu('2026-11-05T03:12:00.000Z')).toBe('5 Nov 2026, 10.12 WIB')
      expect(teksTanggal('2026-11-02')).toBe('2 Nov 2026')
      expect(teksTanggal('2026-10-06', true)).toBe('6 Okt')
    })

    it('batas sumbu grafik dibulatkan ke 1, 2, atau 5 kali pangkat sepuluh', () => {
      expect([0, 3, 12, 41, 82, 100, 101, 4_380].map(batasSumbu)).toEqual([1, 5, 20, 50, 100, 100, 200, 5_000])
    })

    it('tautan perbaikan: dokumen koleksi, atau global untuk menu dan beranda', () => {
      expect(hrefSumber({ koleksi: 'artikel', id: 12 })).toBe('/admin/collections/artikel/12')
      expect(hrefSumber({ koleksi: 'header', id: null })).toBe('/admin/globals/header')
      expect(hrefSumber({ koleksi: 'beranda', id: null })).toBe('/admin/globals/beranda')
    })
  })
  ```

  `tests/int/pantau-dashboard.int.spec.ts`

  ```ts
  import type { Payload } from 'payload'
  import { describe, expect, it } from 'vitest'

  import { ambilDashboard, MAKS_HALAMAN_DASHBOARD } from '@/modules/pantau/dashboard'
  import { PESAN_TEMUAN } from '@/modules/pantau/tautan'

  import { getTestPayload, unik } from './helpers'

  const T0 = new Date('2026-11-05T03:00:00.000Z')
  const hariLalu = (n: number) => new Date(T0.getTime() - n * 86_400_000).toISOString()

  async function kosongkan(payload: Payload) {
    const koleksi = ['tugas-seo', 'analitik-situs', 'analitik-halaman', 'status-indeks', 'log-indexing', 'temuan-tautan', 'tautan-luar', 'log-404'] as const
    for (const collection of koleksi) await payload.delete({ collection, where: { id: { exists: true } } })
  }

  describe('data dashboard SEO', () => {
    it('kosong: tugas belum pernah berjalan, tanpa data Search Console, dan semua daftar kosong', async () => {
      const payload = await getTestPayload()
      await kosongkan(payload)
      expect(await ambilDashboard(payload, T0)).toEqual({
        tugas: { analitik: null, tautan: null },
        analitik: { sampai: null, situs: null, halaman: [], jumlahHalaman: 0 },
        statusIndeks: [],
        log: { gagal7Hari: 0, terbaru: [] },
        tautan: [],
        yatim: [],
        log404: [],
      })
    })

    it('terisi: ringkasan 28 hari, 20 halaman teratas, status indeks, log, tautan bermasalah, halaman yatim, dan 404 teratas', async () => {
      const payload = await getTestPayload()
      await kosongkan(payload)
      await payload.create({
        collection: 'tugas-seo',
        data: { jenis: 'analitik', status: 'berhasil', pesan: 'Data sampai 2026-11-02.', selesai: T0.toISOString(), berikutnya: '2026-11-05T08:00:00.000Z' },
      })
      for (const [tanggal, klik, impresi, posisi] of [
        ['2026-10-31', 10, 1000, 8],
        ['2026-11-01', 20, 1000, 6],
        ['2026-11-02', 30, 2000, 5],
      ] as const) {
        await payload.create({ collection: 'analitik-situs', data: { tanggal, klik, impresi, ctr: klik / impresi, posisi } })
      }
      for (let i = 1; i <= MAKS_HALAMAN_DASHBOARD + 2; i++) {
        await payload.create({
          collection: 'analitik-halaman',
          data: { path: `/halaman-${i}`, klik7: i, impresi7: 10 * i, klik28: 100 - i, impresi28: 1000, ctr28: (100 - i) / 1000, posisi28: 5, sampai: '2026-11-02' },
        })
      }
      for (const [path, status] of [
        ['/a', 'terindeks'],
        ['/b', 'terindeks'],
        ['/c', 'tidak-dikenal'],
      ] as const) {
        await payload.create({ collection: 'status-indeks', data: { path, status } })
      }
      const log = (waktu: string, status: 'berhasil' | 'gagal', url: string) =>
        payload.create({ collection: 'log-indexing', data: { waktu, url, langkah: 'indexnow', adapter: 'palsu', status, pesan: `Tes ${status}.`, percobaan: 1 } })
      await log(hariLalu(10), 'gagal', 'https://point.lat/lama')
      await log(hariLalu(2), 'gagal', 'https://point.lat/gagal')
      await log(hariLalu(1), 'berhasil', 'https://point.lat/berhasil')
      const temuan = (jenis: 'rusak' | 'dialihkan' | 'yatim', tujuan: string, sumberKoleksi: string, sumberId: string | null, sumberJudul: string) =>
        payload.create({ collection: 'temuan-tautan', data: { jenis, tujuan, pesan: `Pesan ${jenis}.`, sumberKoleksi, sumberId, sumberJudul, ditemukan: T0.toISOString() } })
      await temuan('dialihkan', '/alamat-lama', 'header', null, 'Menu header')
      await temuan('rusak', '/tidak-ada', 'artikel', '5', 'Cara hitung THR')
      await temuan('yatim', '/tentang', 'halaman', '3', 'Tentang')
      const sumberLuar = [{ koleksi: 'artikel', id: 5, judul: 'Cara hitung THR', path: '/cara-hitung-thr' }]
      await payload.create({ collection: 'tautan-luar', data: { url: 'https://a.example/', status: 'baik', berikutnya: T0.toISOString(), sumber: sumberLuar } })
      await payload.create({ collection: 'tautan-luar', data: { url: 'https://b.example/', status: 'tidak-pasti', pesan: 'Server menjawab 403.', berikutnya: T0.toISOString(), sumber: sumberLuar } })
      await payload.create({ collection: 'tautan-luar', data: { url: 'https://c.example/', status: 'rusak', pesan: PESAN_TEMUAN.tidakAda, berikutnya: T0.toISOString(), sumber: sumberLuar } })
      const sering = `/${unik('sering')}`
      const jarang = `/${unik('jarang')}`
      await payload.create({ collection: 'log-404', data: { path: jarang, jumlah: 2, terakhir: hariLalu(1) } })
      await payload.create({ collection: 'log-404', data: { path: sering, jumlah: 9, terakhir: hariLalu(3) } })
      const redirect = await payload.create({ collection: 'redirect', data: { dari: sering, ke: '/tentang', kode: '301' } })

      const data = await ambilDashboard(payload, T0)
      expect(data.tugas).toEqual({
        analitik: { status: 'berhasil', pesan: 'Data sampai 2026-11-02.', selesai: T0.toISOString(), berikutnya: '2026-11-05T08:00:00.000Z' },
        tautan: null,
      })
      expect(data.analitik).toMatchObject({ sampai: '2026-11-02', jumlahHalaman: 22, situs: { klik: 60, impresi: 4000, ctr: 0.015, posisi: 6 } })
      expect(data.analitik.situs?.seri).toHaveLength(28)
      expect(data.analitik.halaman).toHaveLength(MAKS_HALAMAN_DASHBOARD)
      expect(data.analitik.halaman[0]).toEqual({ path: '/halaman-1', klik7: 1, impresi7: 10, klik28: 99, impresi28: 1000, ctr28: 0.099, posisi28: 5 })
      expect(data.statusIndeks).toEqual([
        { status: 'terindeks', label: 'Terindeks', jumlah: 2 },
        { status: 'tidak-dikenal', label: 'Belum dikenal Google', jumlah: 1 },
      ])
      expect(data.log.gagal7Hari).toBe(1)
      expect(data.log.terbaru.map((l) => [l.url, l.langkah, l.labelStatus])).toEqual([
        ['https://point.lat/berhasil', 'IndexNow', 'Berhasil'],
        ['https://point.lat/gagal', 'IndexNow', 'Gagal'],
        ['https://point.lat/lama', 'IndexNow', 'Gagal'],
      ])
      expect(data.tautan).toEqual([
        { jenis: 'rusak', tujuan: '/tidak-ada', pesan: 'Pesan rusak.', sumber: [{ judul: 'Cara hitung THR', href: '/admin/collections/artikel/5' }] },
        { jenis: 'luar-rusak', tujuan: 'https://c.example/', pesan: PESAN_TEMUAN.tidakAda, sumber: [{ judul: 'Cara hitung THR', href: '/admin/collections/artikel/5' }] },
        { jenis: 'dialihkan', tujuan: '/alamat-lama', pesan: 'Pesan dialihkan.', sumber: [{ judul: 'Menu header', href: '/admin/globals/header' }] },
        { jenis: 'luar-cek', tujuan: 'https://b.example/', pesan: 'Server menjawab 403.', sumber: [{ judul: 'Cara hitung THR', href: '/admin/collections/artikel/5' }] },
      ])
      expect(data.yatim).toEqual([{ path: '/tentang', judul: 'Tentang', href: '/admin/collections/halaman/3' }])
      expect(data.log404).toEqual([
        { path: sering, jumlah: 9, terakhir: hariLalu(3), redirect: `/admin/collections/redirect/${redirect.id}` },
        { path: jarang, jumlah: 2, terakhir: hariLalu(1), redirect: null },
      ])
      await kosongkan(payload)
      await payload.delete({ collection: 'redirect', where: { id: { equals: redirect.id } } })
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm test:unit
  pnpm test:int
  ```

  Hasil yang diharapkan: unit FAIL di `tests/unit/pantau-format.test.ts` dan integrasi FAIL di `tests/int/pantau-dashboard.int.spec.ts`, keduanya dengan `Error: Cannot find package '@/modules/pantau/dashboard'`.

- [ ] **Langkah 3: Format dan data dashboard**

  `src/modules/pantau/format.ts`

  ```ts
  /**
   * Format angka dan waktu dashboard SEO (`Intl` id-ID). Angka ringkas memakai spasi tak putus dari `Intl`
   * ("182,4\u00a0rb"); waktu tampil di zona WIB karena pemilik di Indonesia, sedangkan tanggal data Search
   * Console adalah tanggal kalender waktu Pasifik apa adanya.
   */

  const BULAT = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 })
  const RINGKAS = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 })
  const PERSEN = new Intl.NumberFormat('id-ID', { style: 'percent', maximumFractionDigits: 1 })
  const SATU_DESIMAL = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  const WAKTU = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' })
  const TANGGAL = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
  const TANGGAL_PENDEK = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' })

  /** Angka utuh dengan pemisah ribuan: 1.284. */
  export const teksJumlah = (n: number) => BULAT.format(n)

  /** Angka besar diringkas untuk kartu angka: 1.284, 12,9 rb, 2,5 jt. Di bawah 10.000 ditulis utuh. */
  export const teksRingkas = (n: number) => (Math.abs(n) < 10_000 ? BULAT.format(n) : RINGKAS.format(n))

  /** CTR 0 sampai 1 sebagai persen satu desimal: 6,1%. */
  export const teksPersen = (rasio: number) => PERSEN.format(rasio)

  /** Posisi rata-rata satu desimal: 6,4. */
  export const teksPosisi = (posisi: number | null) => (posisi === null ? '-' : SATU_DESIMAL.format(posisi))

  /** Waktu ISO di zona WIB: 5 Nov 2026, 10.12 WIB. */
  export const teksWaktu = (iso: string) => `${WAKTU.format(new Date(iso))} WIB`

  /** Tanggal kalender `YYYY-MM-DD`: 2 Nov 2026, atau 2 Nov tanpa tahun. */
  export const teksTanggal = (tanggal: string, pendek = false) => (pendek ? TANGGAL_PENDEK : TANGGAL).format(new Date(`${tanggal}T00:00:00.000Z`))

  /** Batas atas sumbu yang bulat (1, 2, 5 kali pangkat 10) supaya garis bantu jatuh di angka rapi. */
  export function batasSumbu(maks: number): number {
    if (maks <= 0) return 1
    const pangkat = 10 ** Math.floor(Math.log10(maks))
    return ([1, 2, 5, 10].find((k) => k * pangkat >= maks) ?? 10) * pangkat
  }
  ```

  `src/modules/pantau/dashboard.ts`

  ```ts
  import type { Payload } from 'payload'

  import { urlAdmin } from '@/lib/admin'
  import { HARI } from '@/modules/indexer/aturan'
  import { LABEL_LANGKAH, LABEL_STATUS_INDEKS, LABEL_STATUS_LOG, STATUS_INDEKS, type StatusIndeks, type StatusLog } from '@/modules/indexer/tipe'

  import { geserTanggal, ringkasSitus, tanggalPasifik, type RingkasanSitus } from './aturan'
  import type { KoleksiSumber, Sumber } from './tautan'
  import { JENIS_TUGAS, type JenisTugas, type RingkasanHalaman, type StatusTugas } from './tipe'

  /** Batas baris tiap bagian dashboard; daftar lengkap tetap di koleksinya. */
  export const MAKS_HALAMAN_DASHBOARD = 20
  export const MAKS_LOG_DASHBOARD = 8
  export const MAKS_404_DASHBOARD = 10
  export const MAKS_TEMUAN_DASHBOARD = 50

  export type InfoTugas = { status: StatusTugas | null; pesan: string | null; selesai: string | null; berikutnya: string }

  export type TautanSumber = { judul: string; href: string }

  export type TautanBermasalah = {
    /** `rusak` dan `dialihkan`: tautan internal; `luar-rusak` dan `luar-cek`: tautan ke situs lain. */
    jenis: 'rusak' | 'luar-rusak' | 'dialihkan' | 'luar-cek'
    tujuan: string
    pesan: string
    sumber: TautanSumber[]
  }

  export type DataDashboard = {
    tugas: Record<JenisTugas, InfoTugas | null>
    analitik: { sampai: string | null; situs: RingkasanSitus | null; halaman: RingkasanHalaman[]; jumlahHalaman: number }
    statusIndeks: { status: StatusIndeks; label: string; jumlah: number }[]
    log: {
      gagal7Hari: number
      terbaru: { id: number; waktu: string; url: string; langkah: string; status: StatusLog; labelStatus: string; pesan: string | null }[]
    }
    tautan: TautanBermasalah[]
    yatim: { path: string; judul: string; href: string }[]
    log404: { path: string; jumlah: number; terakhir: string | null; redirect: string | null }[]
  }

  /** Halaman admin untuk memperbaiki sumber tautan: dokumen koleksi, atau global menu dan beranda. */
  export function hrefSumber(s: Pick<Sumber, 'koleksi' | 'id'>): string {
    const global: Partial<Record<KoleksiSumber, string>> = { header: 'header', footer: 'footer', beranda: 'beranda' }
    const slug = global[s.koleksi]
    return slug ? urlAdmin.global(slug) : urlAdmin.dokumen(s.koleksi, s.id ?? '')
  }

  const URUTAN_TAUTAN: TautanBermasalah['jenis'][] = ['rusak', 'luar-rusak', 'dialihkan', 'luar-cek']

  /**
   * Semua data dashboard SEO (spesifikasi §8 "Dashboard SEO") dalam satu panggilan: ringkasan Search
   * Console 28 hari dan halaman teratas, ringkasan status indeks, log indexing terbaru dan jumlah langkah
   * gagal 7 hari, tautan rusak, halaman yatim, 404 teratas, dan status tugas harian. Hanya membaca; tugas
   * berkala yang mengisi datanya.
   */
  export async function ambilDashboard(payload: Payload, sekarang = new Date()): Promise<DataDashboard> {
    const { docs: tugasDocs } = await payload.find({ collection: 'tugas-seo', depth: 0, limit: JENIS_TUGAS.length, pagination: false })
    const tugas = Object.fromEntries(
      JENIS_TUGAS.map((jenis) => {
        const d = tugasDocs.find((t) => t.jenis === jenis)
        return [jenis, d ? { status: d.status ?? null, pesan: d.pesan ?? null, selesai: d.selesai ?? null, berikutnya: d.berikutnya } : null]
      }),
    ) as Record<JenisTugas, InfoTugas | null>

    const { docs: hari } = await payload.find({
      collection: 'analitik-situs',
      where: { tanggal: { greater_than_equal: geserTanggal(tanggalPasifik(sekarang), -45) } },
      sort: 'tanggal',
      depth: 0,
      limit: 100,
      pagination: false,
    })
    const sampai = hari.at(-1)?.tanggal ?? null
    const halaman = await payload.find({ collection: 'analitik-halaman', sort: ['-klik28', '-impresi28', 'path'], depth: 0, limit: MAKS_HALAMAN_DASHBOARD })

    const statusIndeks = []
    for (const status of STATUS_INDEKS) {
      const { totalDocs } = await payload.count({ collection: 'status-indeks', where: { status: { equals: status } } })
      if (totalDocs) statusIndeks.push({ status, label: LABEL_STATUS_INDEKS[status], jumlah: totalDocs })
    }
    statusIndeks.sort((a, b) => b.jumlah - a.jumlah)

    const { totalDocs: gagal7Hari } = await payload.count({
      collection: 'log-indexing',
      where: { and: [{ status: { equals: 'gagal' } }, { waktu: { greater_than_equal: new Date(sekarang.getTime() - 7 * HARI).toISOString() } }] },
    })
    const { docs: log } = await payload.find({ collection: 'log-indexing', sort: '-waktu', depth: 0, limit: MAKS_LOG_DASHBOARD, pagination: false })

    const { docs: temuan } = await payload.find({ collection: 'temuan-tautan', sort: ['jenis', 'tujuan'], depth: 0, limit: MAKS_TEMUAN_DASHBOARD * 3, pagination: false })
    const { docs: luar } = await payload.find({
      collection: 'tautan-luar',
      where: { status: { in: ['rusak', 'tidak-pasti'] } },
      sort: 'url',
      depth: 0,
      limit: MAKS_TEMUAN_DASHBOARD,
      pagination: false,
    })
    const sumberTemuan = (t: (typeof temuan)[number]): TautanSumber => ({
      judul: t.sumberJudul,
      href: hrefSumber({ koleksi: t.sumberKoleksi as KoleksiSumber, id: t.sumberId ?? null }),
    })
    const tautan: TautanBermasalah[] = [
      ...temuan
        .filter((t) => t.jenis !== 'yatim')
        .map((t) => ({ jenis: t.jenis as 'rusak' | 'dialihkan', tujuan: t.tujuan, pesan: t.pesan, sumber: [sumberTemuan(t)] })),
      ...luar.map((l) => ({
        jenis: l.status === 'rusak' ? ('luar-rusak' as const) : ('luar-cek' as const),
        tujuan: l.url,
        pesan: l.pesan ?? '',
        sumber: (Array.isArray(l.sumber) ? (l.sumber as Sumber[]) : []).map((s) => ({ judul: s.judul, href: hrefSumber(s) })),
      })),
    ]
      .sort((a, b) => URUTAN_TAUTAN.indexOf(a.jenis) - URUTAN_TAUTAN.indexOf(b.jenis))
      .slice(0, MAKS_TEMUAN_DASHBOARD)

    const { docs: log404 } = await payload.find({ collection: 'log-404', sort: ['-jumlah', '-terakhir'], depth: 0, limit: MAKS_404_DASHBOARD, pagination: false })
    const { docs: redirect } = await payload.find({
      collection: 'redirect',
      where: { dari: { in: log404.map((l) => l.path) } },
      depth: 0,
      limit: MAKS_404_DASHBOARD,
      pagination: false,
      select: { dari: true },
    })

    return {
      tugas,
      analitik: {
        sampai,
        situs: sampai ? ringkasSitus(hari.map(({ tanggal, klik, impresi, ctr, posisi }) => ({ tanggal, klik, impresi, ctr, posisi })), sampai) : null,
        halaman: halaman.docs.map(({ path, klik7, impresi7, klik28, impresi28, ctr28, posisi28 }) => ({ path, klik7, impresi7, klik28, impresi28, ctr28, posisi28 })),
        jumlahHalaman: halaman.totalDocs,
      },
      statusIndeks,
      log: {
        gagal7Hari,
        terbaru: log.map((l) => ({
          id: l.id,
          waktu: l.waktu,
          url: l.url,
          langkah: LABEL_LANGKAH[l.langkah],
          status: l.status,
          labelStatus: LABEL_STATUS_LOG[l.status],
          pesan: l.pesan ?? null,
        })),
      },
      tautan,
      yatim: temuan
        .filter((t) => t.jenis === 'yatim')
        .slice(0, MAKS_TEMUAN_DASHBOARD)
        .map((t) => ({ path: t.tujuan, judul: t.sumberJudul, href: sumberTemuan(t).href })),
      log404: log404.map((l) => {
        const r = redirect.find((d) => d.dari === l.path)
        return { path: l.path, jumlah: l.jumlah ?? 0, terakhir: l.terakhir ?? null, redirect: r ? urlAdmin.dokumen('redirect', r.id) : null }
      }),
    }
  }
  ```

- [ ] **Langkah 4: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 60 passed (60)`, `Tests 412 passed (412)`; integrasi `Test Files 35 passed (35)`, `Tests 113 passed (113)`; E2E `92 passed`.

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/modules/pantau/dashboard.ts src/modules/pantau/format.ts tests/unit/pantau-format.test.ts tests/int/pantau-dashboard.int.spec.ts
  git commit -m "feat(pantau): data dashboard SEO dalam satu panggilan: performa Google, status indeks, log, tautan rusak, halaman yatim, dan 404 teratas"
  ```

---

### Task 8: View dashboard SEO di admin `/admin/seo` dengan tautan di menu

**Files:**
- Create: `src/modules/pantau/admin/DashboardSeo.tsx`, `src/modules/pantau/admin/BagianDashboard.tsx`, `src/modules/pantau/admin/GrafikKlik.tsx`, `src/modules/pantau/admin/TautanDashboard.tsx`, `src/modules/pantau/admin/TautanNav.tsx`, `src/modules/pantau/admin/dashboard.scss`, `src/modules/pantau/admin/nav.scss`
- Modify: `src/payload.config.ts`, `src/app/(payload)/admin/importMap.js` (dibuat ulang), `tests/e2e/data.ts`, `tests/e2e/siapkan.ts`, `tests/e2e/pantau.spec.ts`
- Test: `tests/unit/pantau-dashboard.test.ts`, `tests/e2e/pantau.spec.ts`

**Interfaces:**
- Consumes: `ambilDashboard`, `DataDashboard`, `InfoTugas`, `TautanBermasalah`, format (Task 7), `urlAdmin` dan `PATH_ADMIN` (Task 6), `RingkasanSitus` (Task 1), `DefaultTemplate` (`@payloadcms/next/templates`), `Gutter` (`@payloadcms/ui`), `AdminViewServerProps` dan `ServerProps` (`payload`).
- Produces:
  - View `/admin/seo` (`admin.components.views.dashboardSeo`), komponen `DashboardSeo` dan `PATH_DASHBOARD_SEO`; tautan "Dashboard SEO" di atas menu admin (`admin.components.beforeNavLinks`, `TautanDashboard` dan `TautanNav`).
  - Bagian (server component tanpa state, diuji dengan `renderToStaticMarkup`): `BagianSearchConsole`, `BagianStatusIndeks`, `BagianLog`, `BagianTautan`, `BagianYatim`, `Bagian404`; grafik `GrafikKlik`.
  - `tests/e2e/data.ts`: `HARI_CONTOH` (28 total harian sampai 2 November 2026).

Payload 3.92 tidak membungkus view kustom satu segmen dengan template dan tidak memeriksa akses admin untuknya (`views/Root/index.js` dan `getRouteData.js`), jadi `DashboardSeo` membungkus dirinya dengan `DefaultTemplate` dan memeriksa pengguna sendiri: yang belum masuk diarahkan ke `/admin/login?redirect=/admin/seo`, selain admin hanya melihat pesan. Tautan menu memakai kelas `nav__link` Payload dan `aria-current`, dan hanya dirender untuk admin. Menu admin Payload bisa tertutup; tes E2E membukanya lewat tombol "Open Menu" bila terlihat.

Bentuk dipilih per data (skill dataviz): empat kartu angka untuk klik, impresi, CTR, dan posisi rata-rata 28 hari; satu grafik kolom untuk klik per hari (satu seri, satu hue biru Payload yang lolos validator untuk permukaan terang dan gelap, kolom paling lebar 24 px dengan ujung membulat, garis bantu 1 px, `title` per kolom, dan tabel angka per hari); batang horizontal berperingkat satu warna untuk status indeks, dengan label dan angka selalu tertulis. Grafik dibuat dari HTML dan CSS, bukan SVG berskala, supaya teks sumbu tetap 12 px di 375 px. Setiap bagian punya keadaan kosong yang menjelaskan sebabnya (belum pernah disinkron, dilewati dengan alasan dan tautan ke Status pemasangan, domain baru tanpa data, belum dipindai) dan sinkron yang gagal tampil sebagai kotak galat dengan penyebab dan jadwal coba lagi. Tabel panjang bergulir di dalam kotaknya sendiri (`role="region"`, `tabIndex={0}`) dan URL panjang dipatahkan, jadi halaman tidak bergeser horizontal di 375 px.

Data E2E ditambah total harian 28 hari dan baris `tugas-seo` analitik berstatus Berhasil yang jatuh tempo besok, supaya cron selama E2E tidak menjalankan sinkron lagi (adapter palsu akan melewatinya) dan dashboard menampilkan keadaan terisi.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/pantau-dashboard.test.ts`

  ```ts
  import { createElement as h } from 'react'
  import { renderToStaticMarkup } from 'react-dom/server'
  import { describe, expect, it } from 'vitest'

  import { Bagian404, BagianSearchConsole, BagianTautan, BagianYatim } from '@/modules/pantau/admin/BagianDashboard'
  import { ringkasSitus } from '@/modules/pantau/aturan'
  import type { DataDashboard, InfoTugas } from '@/modules/pantau/dashboard'

  /** Teks yang terlihat: tag dibuang, spasi biasa dirapikan (spasi tak putus dari `Intl` dipertahankan). */
  const teks = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[ \t\r\n]+/g, ' ').trim()

  const KOSONG: DataDashboard['analitik'] = { sampai: null, situs: null, halaman: [], jumlahHalaman: 0 }
  const info = (status: InfoTugas['status'], pesan: string): InfoTugas => ({
    status,
    pesan,
    selesai: '2026-11-05T03:00:00.000Z',
    berikutnya: '2026-11-05T04:00:00.000Z',
  })
  const tugas = (analitik: InfoTugas | null, tautan: InfoTugas | null = null): DataDashboard['tugas'] => ({ analitik, tautan })
  const sc = (analitik: DataDashboard['analitik'], t: DataDashboard['tugas']) => renderToStaticMarkup(h(BagianSearchConsole, { analitik, tugas: t }))

  describe('keadaan dashboard SEO', () => {
    it('Search Console belum pernah disinkron: jadwalnya dijelaskan, tanpa angka nol palsu', () => {
      const html = teks(sc(KOSONG, tugas(null)))
      expect(html).toContain('Sinkron Search Console: belum pernah berjalan. Cron menjalankannya sekali sehari.')
      expect(html).toContain('Belum ada data Search Console. Data tampil di sini setelah sinkron harian berhasil.')
      expect(html).toContain('Belum ada halaman yang muncul di hasil Google.')
      expect(html).not.toContain('Posisi rata-rata')
    })

    it('dilewati (akun layanan belum diatur atau adapter palsu): alasan dan tautan ke Status pemasangan', () => {
      const html = sc(KOSONG, tugas(info('dilewati', 'Akun layanan Google belum diatur (env GOOGLE_SERVICE_ACCOUNT_JSON kosong).')))
      expect(teks(html)).toContain(
        'Belum ada data Search Console. Akun layanan Google belum diatur (env GOOGLE_SERVICE_ACCOUNT_JSON kosong). Periksa Status pemasangan di Pengaturan SEO .',
      )
      expect(html).toContain('<a href="/admin/globals/pengaturan-seo">Status pemasangan di Pengaturan SEO</a>')
    })

    it('gagal: kotak galat dengan penyebab dan jadwal coba lagi; berhasil tanpa data: domain baru', () => {
      const gagal = sc(KOSONG, tugas(info('gagal', 'Google menjawab 403: User does not have sufficient permission for site.')))
      expect(gagal).toMatch(/<div class="pantau-pesan pantau-pesan--galat">/)
      expect(teks(gagal)).toContain(
        'Sinkron Search Console gagal. Google menjawab 403: User does not have sufficient permission for site. Dicoba lagi 5 Nov 2026, 11.00 WIB.',
      )
      expect(teks(sc(KOSONG, tugas(info('berhasil', 'Search Console belum punya data final untuk 35 hari terakhir.'))))).toContain(
        'Search Console belum punya data untuk situs ini.',
      )
    })

    it('terisi: empat kartu angka, grafik dengan teks alternatif, dan tabel halaman teratas', () => {
      const situs = ringkasSitus([{ tanggal: '2026-11-02', klik: 1284, impresi: 182_400, ctr: 0.007, posisi: 6.43 }], '2026-11-02')
      const html = sc(
        { sampai: '2026-11-02', situs, halaman: [{ path: '/cara-hitung-thr', klik7: 30, impresi7: 900, klik28: 1284, impresi28: 182_400, ctr28: 0.007, posisi28: 6.43 }], jumlahHalaman: 41 },
        tugas(info('berhasil', 'Data sampai 2026-11-02.')),
      )
      expect(teks(html)).toContain('Klik 1.284 Impresi 182,4\u00a0rb CTR 0,7% Posisi rata-rata 6,4')
      expect(html).toContain('aria-label="Klik per hari, 6 Okt 2026 sampai 2 Nov 2026: total 1.284, tertinggi 1.284 pada 2 Nov 2026."')
      expect(teks(html)).toContain('/cara-hitung-thr 1.284 182.400 0,7% 6,4 30')
      expect(teks(html)).toContain('Menampilkan 1 dari 41 halaman yang muncul di Google.')
    })

    it('tautan rusak, halaman yatim, dan 404: daftar dengan tautan perbaikan, atau keadaan kosong yang jelas', () => {
      const t = tugas(null, info('berhasil', '12 tautan dipindai.'))
      const rusak = renderToStaticMarkup(
        h(BagianTautan, { tautan: [{ jenis: 'rusak', tujuan: '/tidak-ada', pesan: 'Tidak ada halaman.', sumber: [{ judul: 'Cara hitung THR', href: '/admin/collections/artikel/5' }] }], tugas: t }),
      )
      expect(teks(rusak)).toContain('Rusak /tidak-ada Tidak ada halaman. Ada di Cara hitung THR')
      expect(teks(renderToStaticMarkup(h(BagianTautan, { tautan: [], tugas: t })))).toContain('Tidak ada tautan rusak di konten terbit.')
      expect(teks(renderToStaticMarkup(h(BagianYatim, { yatim: [], tugas: tugas(null) })))).toContain('Belum dipindai. Pindai tautan berjalan otomatis sekali sehari.')
      expect(teks(renderToStaticMarkup(h(BagianYatim, { yatim: [], tugas: t })))).toContain('Semua artikel dan halaman terbit sudah punya tautan masuk.')
      const log404 = renderToStaticMarkup(h(Bagian404, { log404: [{ path: '/jalan-lama', jumlah: 3, terakhir: null, redirect: null }] }))
      expect(log404).toContain('<a href="/admin/collections/redirect/create?dari=%2Fjalan-lama" aria-label="Buat redirect untuk /jalan-lama">Buat redirect</a>')
      expect(teks(renderToStaticMarkup(h(Bagian404, { log404: [] })))).toContain('Belum ada kunjungan ke halaman yang tidak ada.')
    })
  })
  ```

  ```diff
  diff --git a/tests/e2e/pantau.spec.ts b/tests/e2e/pantau.spec.ts
  index d838d95..9c2bb95 100644
  --- a/tests/e2e/pantau.spec.ts
  +++ b/tests/e2e/pantau.spec.ts
  @@ -1,6 +1,7 @@
   import { expect, test } from '@playwright/test'
   
  -import { ADMIN_E2E } from './data'
  +import { periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  +import { ADMIN_E2E, HARI_CONTOH, KLIK_CONTOH, UKURAN_LAYAR } from './data'
   
   test('log 404: "Buat redirect" membuka form redirect dengan path terisi; setelah disimpan menjadi "Lihat redirect" dan path itu dialihkan', async ({ page }) => {
     const path = `/jalan-lama-${Date.now()}`
  @@ -22,3 +23,52 @@ test('log 404: "Buat redirect" membuka form redirect dengan path terisi; setelah
     expect(jawaban.status()).toBe(308)
     expect(jawaban.headers().location).toContain('/tentang')
   })
  +
  +test('dashboard SEO hanya untuk yang masuk: tanpa login diarahkan ke halaman masuk', async ({ page }) => {
  +  await page.goto('/admin/seo')
  +  await expect(page).toHaveURL(/\/admin\/login/)
  +})
  +
  +test('dashboard SEO dari menu admin: performa Google, halaman teratas, status indeks, log, tautan rusak, halaman yatim, dan 404 teratas', async ({ page }) => {
  +  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  +  // Cron sebagai admin: pindai tautan harian berjalan bila belum (sinkron Search Console sudah tercatat di siapkan.ts).
  +  expect((await page.request.get('/api/jobs/run')).status()).toBe(200)
  +  await page.goto('/admin')
  +  // Server merender menu admin terbuka; saat hidrasi (kelas nav--nav-hydrated) Payload menutupnya di layar 1440 px
  +  // ke bawah. Tombol Open Menu baru diklik setelah keadaan itu tetap, supaya klik tidak hilang sebelum hidrasi.
  +  const nav = page.locator('.nav')
  +  await expect(nav).toHaveClass(/nav--nav-hydrated/)
  +  if (!(await nav.getAttribute('class'))?.includes('nav--nav-open')) await page.getByRole('button', { name: 'Open Menu' }).click()
  +  await expect(nav).toHaveClass(/nav--nav-open/)
  +  await page.getByRole('link', { name: 'Dashboard SEO' }).click()
  +  await expect(page).toHaveURL(/\/admin\/seo$/)
  +  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard SEO')
  +  await expect(page.getByRole('link', { name: 'Dashboard SEO' })).toHaveAttribute('aria-current', 'page')
  +
  +  const google = page.getByRole('region', { name: 'Performa di Google' })
  +  await expect(google).toContainText('Sinkron Search Console: berhasil')
  +  await expect(google).toContainText('28 hari sampai 2 Nov 2026.')
  +  const klik = HARI_CONTOH.reduce((n, h) => n + h.klik, 0)
  +  await expect(google.getByRole('definition').first()).toHaveText(klik.toLocaleString('id-ID'))
  +  await expect(google.getByRole('img', { name: /^Klik per hari, 6 Okt 2026 sampai 2 Nov 2026: total / })).toBeVisible()
  +  const teratas = google.getByRole('region', { name: 'Halaman teratas di Google, 28 hari' })
  +  await expect(teratas.getByRole('row')).toHaveCount(KLIK_CONTOH.length + 1)
  +  await expect(teratas.getByRole('rowheader').first()).toHaveText('/')
  +
  +  await expect(page.getByRole('region', { name: 'Status indeks' })).toContainText('halaman terbit dipantau di Google.')
  +  await expect(page.getByRole('region', { name: 'Log indexing terbaru' }).getByRole('link', { name: 'Buka Log indexing' })).toBeVisible()
  +  await expect(page.getByRole('region', { name: 'Tautan rusak' })).toContainText('Pindai tautan: berhasil')
  +  await expect(page.getByRole('region', { name: 'Halaman yatim' })).toBeVisible()
  +  await expect(page.getByRole('region', { name: '404 teratas' }).getByRole('link', { name: 'Buka Log 404' })).toBeVisible()
  +  await periksaAxe(page, '.pantau')
  +})
  +
  +for (const { lebar, tinggi } of UKURAN_LAYAR) {
  +  test(`dashboard SEO ${lebar}px tanpa geser horizontal`, async ({ page }) => {
  +    await page.setViewportSize({ width: lebar, height: tinggi })
  +    await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  +    await page.goto('/admin/seo')
  +    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard SEO')
  +    await periksaTanpaGeserHorizontal(page)
  +  })
  +}
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/pantau-dashboard.test.ts` dengan `Error: Cannot find package '@/modules/pantau/admin/BagianDashboard'`.

- [ ] **Langkah 3: Grafik dan bagian dashboard**

  `src/modules/pantau/admin/GrafikKlik.tsx`

  ```tsx
  import type { RingkasanSitus } from '../aturan'
  import { batasSumbu, teksJumlah, teksTanggal } from '../format'

  /**
   * Klik per hari selama 28 hari: satu seri satu warna, kolom tipis (paling lebar 24 px) dengan ujung data
   * membulat dari satu garis dasar, garis bantu tipis di batas atas, tanggal pertama dan terakhir di sumbu.
   * HTML dan CSS biasa (tanpa pustaka dan tanpa JavaScript), jadi teks sumbu tetap terbaca di 375 px.
   * Setiap kolom punya `title` (tanggal, klik, impresi) untuk hover; angka lengkap ada di tabel di bawahnya,
   * jadi tidak ada informasi yang hanya bisa dibaca lewat hover atau warna.
   */
  export function GrafikKlik({ seri }: { seri: RingkasanSitus['seri'] }) {
    const maks = batasSumbu(Math.max(...seri.map((h) => h.klik)))
    const tertinggi = seri.reduce((a, b) => (b.klik > a.klik ? b : a), seri[0])
    const total = seri.reduce((n, h) => n + h.klik, 0)
    const awal = seri[0].tanggal
    const akhir = seri.at(-1)!.tanggal
    const label =
      `Klik per hari, ${teksTanggal(awal)} sampai ${teksTanggal(akhir)}: total ${teksJumlah(total)}, ` +
      `tertinggi ${teksJumlah(tertinggi.klik)} pada ${teksTanggal(tertinggi.tanggal)}.`
    return (
      <figure className="pantau-grafik">
        <figcaption className="pantau-grafik__judul">Klik per hari</figcaption>
        <div className="pantau-grafik__plot" role="img" aria-label={label}>
          <div className="pantau-grafik__sumbu-y">
            <span>{teksJumlah(maks)}</span>
            <span>0</span>
          </div>
          <div className="pantau-grafik__area">
            {seri.map((h) => (
              <span key={h.tanggal} className="pantau-grafik__kolom" title={`${teksTanggal(h.tanggal)}: ${teksJumlah(h.klik)} klik, ${teksJumlah(h.impresi)} impresi`}>
                {h.klik > 0 && <span style={{ height: `${(h.klik / maks) * 100}%` }} />}
              </span>
            ))}
          </div>
          <div className="pantau-grafik__sumbu-x">
            <span>{teksTanggal(awal, true)}</span>
            <span>{teksTanggal(akhir, true)}</span>
          </div>
        </div>
        <details className="pantau-grafik__tabel">
          <summary>Lihat angka per hari</summary>
          <div className="pantau-gulir" role="region" aria-label="Klik dan impresi per hari" tabIndex={0}>
            <table className="pantau-tabel">
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Klik</th>
                  <th scope="col">Impresi</th>
                </tr>
              </thead>
              <tbody>
                {seri.map((h) => (
                  <tr key={h.tanggal}>
                    <th scope="row">{teksTanggal(h.tanggal)}</th>
                    <td>{teksJumlah(h.klik)}</td>
                    <td>{teksJumlah(h.impresi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </figure>
    )
  }
  ```

  `src/modules/pantau/admin/BagianDashboard.tsx`

  ```tsx
  import { urlAdmin } from '@/lib/admin'

  import type { DataDashboard, InfoTugas, TautanBermasalah } from '../dashboard'
  import { teksJumlah, teksPersen, teksPosisi, teksRingkas, teksTanggal, teksWaktu } from '../format'
  import { LABEL_STATUS_TUGAS, LABEL_TUGAS, type JenisTugas } from '../tipe'
  import { GrafikKlik } from './GrafikKlik'

  /** Status tugas harian: kapan terakhir berjalan dan kapan berikutnya; gagal tampil sebagai kotak galat. */
  function StatusTugas({ jenis, info }: { jenis: JenisTugas; info: InfoTugas | null }) {
    if (!info?.status) return <p className="pantau-tugas">{LABEL_TUGAS[jenis]}: belum pernah berjalan. Cron menjalankannya sekali sehari.</p>
    if (info.status === 'gagal') {
      return (
        <div className="pantau-pesan pantau-pesan--galat">
          <p>
            <strong>{LABEL_TUGAS[jenis]} gagal.</strong> {info.pesan} Dicoba lagi {teksWaktu(info.berikutnya)}.
          </p>
        </div>
      )
    }
    return (
      <p className="pantau-tugas">
        {LABEL_TUGAS[jenis]}: {LABEL_STATUS_TUGAS[info.status].toLowerCase()}
        {info.selesai ? `, ${teksWaktu(info.selesai)}` : ''}. Berikutnya {teksWaktu(info.berikutnya)}.
      </p>
    )
  }

  /** Kenapa belum ada data Search Console, dan apa yang perlu dilakukan. */
  function KosongSearchConsole({ info }: { info: InfoTugas | null }) {
    if (info?.status === 'dilewati') {
      return (
        <p className="pantau-kosong">
          Belum ada data Search Console. {info.pesan} Periksa <a href={urlAdmin.global('pengaturan-seo')}>Status pemasangan di Pengaturan SEO</a>.
        </p>
      )
    }
    if (info?.status === 'berhasil') {
      return (
        <p className="pantau-kosong">
          Search Console belum punya data untuk situs ini. Domain baru biasanya baru punya data beberapa hari setelah halaman pertama
          terindeks.
        </p>
      )
    }
    return <p className="pantau-kosong">Belum ada data Search Console. Data tampil di sini setelah sinkron harian berhasil.</p>
  }

  export function BagianSearchConsole({ analitik, tugas }: Pick<DataDashboard, 'analitik' | 'tugas'>) {
    const { situs, sampai, halaman } = analitik
    return (
      <section className="pantau-bagian pantau-bagian--lebar" aria-labelledby="pantau-google">
        <h2 id="pantau-google">Performa di Google</h2>
        <StatusTugas jenis="analitik" info={tugas.analitik} />
        {situs && sampai ? (
          <>
            <p className="pantau-keterangan">
              28 hari sampai {teksTanggal(sampai)}. Data Search Console baru final 2 sampai 3 hari kemudian.
            </p>
            <dl className="pantau-angka">
              <div>
                <dt>Klik</dt>
                <dd>{teksRingkas(situs.klik)}</dd>
              </div>
              <div>
                <dt>Impresi</dt>
                <dd>{teksRingkas(situs.impresi)}</dd>
              </div>
              <div>
                <dt>CTR</dt>
                <dd>{teksPersen(situs.ctr)}</dd>
              </div>
              <div>
                <dt>Posisi rata-rata</dt>
                <dd>{teksPosisi(situs.posisi)}</dd>
              </div>
            </dl>
            <GrafikKlik seri={situs.seri} />
          </>
        ) : (
          <KosongSearchConsole info={tugas.analitik} />
        )}
        <h3>Halaman teratas</h3>
        {halaman.length > 0 ? (
          <>
            <div className="pantau-gulir" role="region" aria-label="Halaman teratas di Google, 28 hari" tabIndex={0}>
              <table className="pantau-tabel">
                <thead>
                  <tr>
                    <th scope="col">Halaman</th>
                    <th scope="col">Klik</th>
                    <th scope="col">Impresi</th>
                    <th scope="col">CTR</th>
                    <th scope="col">Posisi</th>
                    <th scope="col">Klik 7 hari</th>
                  </tr>
                </thead>
                <tbody>
                  {halaman.map((h) => (
                    <tr key={h.path}>
                      <th scope="row">
                        <a href={h.path}>{h.path}</a>
                      </th>
                      <td>{teksJumlah(h.klik28)}</td>
                      <td>{teksJumlah(h.impresi28)}</td>
                      <td>{teksPersen(h.ctr28)}</td>
                      <td>{teksPosisi(h.posisi28)}</td>
                      <td>{teksJumlah(h.klik7)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="pantau-keterangan">
              Menampilkan {teksJumlah(halaman.length)} dari {teksJumlah(analitik.jumlahHalaman)} halaman yang muncul di Google.
            </p>
          </>
        ) : (
          <p className="pantau-kosong">Belum ada halaman yang muncul di hasil Google.</p>
        )}
      </section>
    )
  }

  export function BagianStatusIndeks({ statusIndeks }: Pick<DataDashboard, 'statusIndeks'>) {
    const total = statusIndeks.reduce((n, s) => n + s.jumlah, 0)
    const terbanyak = statusIndeks[0]?.jumlah ?? 1
    return (
      <section className="pantau-bagian" aria-labelledby="pantau-indeks">
        <h2 id="pantau-indeks">Status indeks</h2>
        {total > 0 ? (
          <>
            <p className="pantau-keterangan">{teksJumlah(total)} halaman terbit dipantau di Google.</p>
            <ul className="pantau-batang">
              {statusIndeks.map((s) => (
                <li key={s.status}>
                  <span className="pantau-batang__label">{s.label}</span>
                  <span className="pantau-batang__jalur" aria-hidden="true">
                    <span style={{ width: `${(s.jumlah / terbanyak) * 100}%` }} />
                  </span>
                  <span className="pantau-batang__nilai">{teksJumlah(s.jumlah)}</span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="pantau-kosong">Belum ada halaman yang dipantau. Status tercatat setelah halaman pertama terbit.</p>
        )}
        <p className="pantau-lanjut">
          <a href={urlAdmin.daftar('status-indeks')}>Buka daftar Status indeks</a>
        </p>
      </section>
    )
  }

  export function BagianLog({ log }: Pick<DataDashboard, 'log'>) {
    return (
      <section className="pantau-bagian" aria-labelledby="pantau-log">
        <h2 id="pantau-log">Log indexing terbaru</h2>
        {log.gagal7Hari > 0 && (
          <div className="pantau-pesan pantau-pesan--peringatan">
            <p>
              <strong>{teksJumlah(log.gagal7Hari)} langkah gagal</strong> dalam 7 hari terakhir.{' '}
              <a href={`${urlAdmin.daftar('log-indexing')}?where[status][equals]=gagal`}>Lihat penyebabnya di Log indexing</a>
            </p>
          </div>
        )}
        {log.terbaru.length > 0 ? (
          <ol className="pantau-daftar">
            {log.terbaru.map((l) => (
              <li key={l.id}>
                <span>
                  <span className={`pantau-tanda pantau-tanda--${l.status}`}>{l.labelStatus}</span> {l.langkah}
                </span>
                <span className="pantau-alamat">{l.url}</span>
                <span className="pantau-waktu">{teksWaktu(l.waktu)}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="pantau-kosong">Belum ada kabar ke mesin pencari. Log tercatat saat konten pertama terbit.</p>
        )}
        <p className="pantau-lanjut">
          <a href={urlAdmin.daftar('log-indexing')}>Buka Log indexing</a>
        </p>
      </section>
    )
  }

  const LABEL_TAUTAN: Record<TautanBermasalah['jenis'], string> = {
    rusak: 'Rusak',
    'luar-rusak': 'Rusak, situs lain',
    dialihkan: 'Alamat lama',
    'luar-cek': 'Perlu dicek manual',
  }

  export function BagianTautan({ tautan, tugas }: Pick<DataDashboard, 'tautan' | 'tugas'>) {
    return (
      <section className="pantau-bagian pantau-bagian--lebar" aria-labelledby="pantau-tautan">
        <h2 id="pantau-tautan">Tautan rusak</h2>
        <StatusTugas jenis="tautan" info={tugas.tautan} />
        {tautan.length > 0 ? (
          <ul className="pantau-daftar">
            {tautan.map((t) => (
              <li key={`${t.jenis} ${t.tujuan} ${t.sumber.map((s) => s.href).join(' ')}`}>
                <span className={`pantau-tanda pantau-tanda--${t.jenis}`}>{LABEL_TAUTAN[t.jenis]}</span>
                <span className="pantau-alamat">{t.tujuan}</span>
                <span>{t.pesan}</span>
                <span className="pantau-sumber">
                  Ada di{' '}
                  {t.sumber.map((s, i) => (
                    <span key={s.href}>
                      {i > 0 && ', '}
                      <a href={s.href}>{s.judul}</a>
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          tugas.tautan?.status && <p className="pantau-kosong">Tidak ada tautan rusak di konten terbit.</p>
        )}
      </section>
    )
  }

  export function BagianYatim({ yatim, tugas }: Pick<DataDashboard, 'yatim' | 'tugas'>) {
    return (
      <section className="pantau-bagian" aria-labelledby="pantau-yatim">
        <h2 id="pantau-yatim">Halaman yatim</h2>
        <p className="pantau-keterangan">Artikel dan halaman terbit tanpa tautan masuk dari tulisan lain, menu, atau beranda.</p>
        {yatim.length > 0 ? (
          <ul className="pantau-daftar">
            {yatim.map((y) => (
              <li key={y.path}>
                <a href={y.href}>{y.judul}</a>
                <span className="pantau-alamat">{y.path}</span>
              </li>
            ))}
          </ul>
        ) : tugas.tautan?.status ? (
          <p className="pantau-kosong">Semua artikel dan halaman terbit sudah punya tautan masuk.</p>
        ) : (
          <p className="pantau-kosong">Belum dipindai. Pindai tautan berjalan otomatis sekali sehari.</p>
        )}
      </section>
    )
  }

  export function Bagian404({ log404 }: Pick<DataDashboard, 'log404'>) {
    return (
      <section className="pantau-bagian" aria-labelledby="pantau-404">
        <h2 id="pantau-404">404 teratas</h2>
        {log404.length > 0 ? (
          <div className="pantau-gulir" role="region" aria-label="Path 404 yang paling sering dikunjungi" tabIndex={0}>
            <table className="pantau-tabel">
              <thead>
                <tr>
                  <th scope="col">Path</th>
                  <th scope="col">Kunjungan</th>
                  <th scope="col">Terakhir</th>
                  <th scope="col">Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {log404.map((l) => (
                  <tr key={l.path}>
                    <th scope="row" className="pantau-alamat">
                      {l.path}
                    </th>
                    <td>{teksJumlah(l.jumlah)}</td>
                    <td>{l.terakhir ? teksWaktu(l.terakhir) : '-'}</td>
                    <td>
                      {l.redirect ? (
                        <a href={l.redirect} aria-label={`Lihat redirect untuk ${l.path}`}>
                          Lihat redirect
                        </a>
                      ) : (
                        <a href={urlAdmin.buat('redirect', { dari: l.path })} aria-label={`Buat redirect untuk ${l.path}`}>
                          Buat redirect
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="pantau-kosong">Belum ada kunjungan ke halaman yang tidak ada.</p>
        )}
        <p className="pantau-lanjut">
          <a href={urlAdmin.daftar('log-404')}>Buka Log 404</a>
        </p>
      </section>
    )
  }
  ```

  `src/modules/pantau/admin/dashboard.scss`

  ```scss
  // Dashboard SEO di admin. Memakai variabel tema Payload supaya ikut mode terang dan gelap admin. Warna
  // grafik satu hue (biru Payload), dicek dengan validator dataviz: blue-500 di permukaan putih dan blue-450
  // di permukaan gelap lolos rentang terang dan kontras 3:1. Status selalu bertanda teks, tidak hanya warna.

  .pantau {
    --pantau-grafik: var(--color-blue-500);
    padding-bottom: calc(var(--base) * 3);
    font-variant-numeric: tabular-nums;
    // Pesan Google dan path bisa berisi URL panjang tanpa spasi.
    overflow-wrap: anywhere;

    a:focus-visible,
    summary:focus-visible,
    [tabindex='0']:focus-visible {
      outline: 2px solid var(--theme-text);
      outline-offset: 2px;
      border-radius: 2px;
    }
  }

  html[data-theme='dark'] .pantau {
    --pantau-grafik: var(--color-blue-450);
  }

  .pantau-kepala {
    margin: calc(var(--base) * 1.5) 0;

    h1 {
      margin: 0 0 calc(var(--base) * 0.5);
    }

    p {
      margin: 0;
      max-width: 70ch;
      color: var(--theme-elevation-650);
    }
  }

  .pantau-kisi {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 30rem), 1fr));
    gap: calc(var(--base) * 1.5);
    align-items: start;
  }

  .pantau-bagian {
    min-width: 0;
    padding: var(--base);
    border: 1px solid var(--theme-elevation-150);
    border-radius: 14px;

    h2 {
      margin: 0 0 calc(var(--base) * 0.5);
      font-size: 20px;
    }

    h3 {
      margin: calc(var(--base) * 1.5) 0 calc(var(--base) * 0.5);
      font-size: 16px;
    }
  }

  .pantau-bagian--lebar {
    grid-column: 1 / -1;
  }

  .pantau-tugas,
  .pantau-keterangan,
  .pantau-kosong,
  .pantau-lanjut {
    margin: 0 0 calc(var(--base) * 0.5);
    color: var(--theme-elevation-650);
  }

  .pantau-kosong {
    padding: calc(var(--base) * 0.75);
    border-radius: 10px;
    background: var(--theme-elevation-50);
    color: var(--theme-text);
  }

  .pantau-lanjut {
    margin-top: calc(var(--base) * 0.75);
  }

  .pantau a {
    color: inherit;
    text-decoration: underline;
  }

  .pantau-pesan {
    margin: 0 0 calc(var(--base) * 0.75);
    padding: calc(var(--base) * 0.75);
    border-left: 4px solid;
    border-radius: 10px;
    color: var(--theme-text);

    p {
      margin: 0;
    }
  }

  .pantau-pesan--galat {
    border-color: var(--theme-error-500);
    background: var(--theme-error-100);
  }

  .pantau-pesan--peringatan {
    border-color: var(--theme-warning-650);
    background: var(--theme-warning-100);
  }

  // Kartu angka: label kecil, nilai besar.
  .pantau-angka {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 9rem), 1fr));
    gap: calc(var(--base) * 0.75);
    margin: var(--base) 0;

    div {
      padding: calc(var(--base) * 0.75);
      border-radius: 10px;
      background: var(--theme-elevation-50);
    }

    dt {
      font-size: 13px;
      color: var(--theme-elevation-650);
    }

    dd {
      margin: 0;
      font-size: 30px;
      font-weight: 700;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
  }

  // Grafik kolom: garis dasar dan garis bantu tipis, kolom paling lebar 24 px dengan ujung atas membulat.
  .pantau-grafik {
    margin: 0 0 var(--base);
  }

  .pantau-grafik__judul {
    margin-bottom: calc(var(--base) * 0.5);
    font-weight: 700;
  }

  .pantau-grafik__plot {
    display: grid;
    grid-template-columns: max-content 1fr;
    grid-template-rows: 160px auto;
    column-gap: 8px;
    font-size: 12px;
    color: var(--theme-elevation-650);
  }

  .pantau-grafik__sumbu-y {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: flex-end;
    margin: -0.6em 0;
  }

  .pantau-grafik__area {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: 2px;
    align-items: end;
    border-top: 1px solid var(--theme-elevation-150);
    border-bottom: 1px solid var(--theme-elevation-500);
  }

  .pantau-grafik__kolom {
    display: flex;
    justify-content: center;
    align-items: flex-end;
    height: 100%;

    span {
      width: 100%;
      max-width: 24px;
      min-height: 2px;
      border-radius: 4px 4px 0 0;
      background: var(--pantau-grafik);
    }

    &:hover span {
      opacity: 0.75;
    }
  }

  .pantau-grafik__sumbu-x {
    grid-column: 2;
    display: flex;
    justify-content: space-between;
    padding-top: 4px;
  }

  .pantau-grafik__tabel {
    margin-top: calc(var(--base) * 0.75);

    summary {
      cursor: pointer;
    }
  }

  // Tabel panjang bergulir di dalam kotaknya sendiri, halaman tidak bergeser horizontal.
  .pantau-gulir {
    max-width: 100%;
    overflow-x: auto;
  }

  .pantau-tabel {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;

    th,
    td {
      padding: 6px 8px;
      border-bottom: 1px solid var(--theme-elevation-100);
      text-align: right;
      white-space: nowrap;
    }

    thead th {
      font-size: 13px;
      color: var(--theme-elevation-650);
    }

    th:first-child {
      text-align: left;
      font-weight: 400;
      white-space: normal;
      overflow-wrap: anywhere;
      min-width: 12rem;
    }
  }

  // Batang status indeks: satu warna, label dan angka selalu tertulis.
  .pantau-batang {
    display: grid;
    gap: 6px;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: grid;
      grid-template-columns: minmax(8rem, 12rem) 1fr max-content;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }
  }

  .pantau-batang__jalur {
    height: 12px;

    span {
      display: block;
      height: 100%;
      min-width: 2px;
      border-radius: 0 4px 4px 0;
      background: var(--pantau-grafik);
    }
  }

  .pantau-daftar {
    display: grid;
    gap: calc(var(--base) * 0.5);
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: grid;
      gap: 2px;
      padding-bottom: calc(var(--base) * 0.5);
      border-bottom: 1px solid var(--theme-elevation-100);
      font-size: 14px;
    }
  }

  .pantau-alamat {
    overflow-wrap: anywhere;
    font-family: var(--font-mono, monospace);
    font-size: 13px;
  }

  .pantau-waktu,
  .pantau-sumber {
    color: var(--theme-elevation-650);
    font-size: 13px;
  }

  .pantau-tanda {
    justify-self: start;
    padding: 0 6px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    background: var(--theme-elevation-100);
    color: var(--theme-text);
  }

  .pantau-tanda--berhasil {
    background: var(--theme-success-150);
    color: var(--theme-success-800);
  }

  .pantau-tanda--gagal,
  .pantau-tanda--rusak,
  .pantau-tanda--luar-rusak {
    background: var(--theme-error-150);
    color: var(--theme-error-800);
  }

  .pantau-tanda--diulang,
  .pantau-tanda--ditunda,
  .pantau-tanda--dialihkan,
  .pantau-tanda--luar-cek {
    background: var(--theme-warning-150);
    color: var(--theme-warning-800);
  }

  @media (max-width: 600px) {
    .pantau-batang li {
      grid-template-columns: 1fr max-content;
    }

    .pantau-batang__jalur {
      grid-column: 1 / -1;
      grid-row: 2;
    }

    .pantau-angka dd {
      font-size: 24px;
    }
  }
  ```

- [ ] **Langkah 4: View, akses, dan tautan menu**

  `src/modules/pantau/admin/DashboardSeo.tsx`

  ```tsx
  import { DefaultTemplate } from '@payloadcms/next/templates'
  import { Gutter } from '@payloadcms/ui'
  import { redirect } from 'next/navigation'
  import type { AdminViewServerProps } from 'payload'

  import { PATH_ADMIN } from '@/lib/admin'

  import { ambilDashboard } from '../dashboard'
  import { Bagian404, BagianLog, BagianSearchConsole, BagianStatusIndeks, BagianTautan, BagianYatim } from './BagianDashboard'

  import './dashboard.scss'

  /** Path dashboard di admin (`admin.components.views` di payload.config.ts). */
  export const PATH_DASHBOARD_SEO = '/seo'

  /**
   * Dashboard SEO di admin (spesifikasi §8): performa di Google (klik, impresi, CTR, posisi, halaman
   * teratas), status indeks, log indexing terbaru, tautan rusak, halaman yatim, dan 404 teratas. View
   * kustom Payload tidak memeriksa akses admin sendiri, jadi pengguna yang belum masuk diarahkan ke login
   * dan selain admin hanya melihat pesan.
   */
  export async function DashboardSeo({ initPageResult, params, searchParams }: AdminViewServerProps) {
    const { req, permissions, locale, visibleEntities } = initPageResult
    const pengguna = req.user as ({ peran?: string | null } & NonNullable<typeof req.user>) | null
    if (!pengguna) redirect(`${PATH_ADMIN}/login?redirect=${encodeURIComponent(`${PATH_ADMIN}${PATH_DASHBOARD_SEO}`)}`)
    const data = pengguna.peran === 'admin' ? await ambilDashboard(req.payload) : null
    return (
      <DefaultTemplate
        i18n={req.i18n}
        locale={locale}
        params={params}
        payload={req.payload}
        permissions={permissions}
        searchParams={searchParams}
        user={req.user ?? undefined}
        visibleEntities={visibleEntities}
      >
        <Gutter className="pantau">
          <header className="pantau-kepala">
            <h1>Dashboard SEO</h1>
            <p>Performa di Google, status indeks, dan kesehatan tautan situs. Data diperbarui otomatis sekali sehari.</p>
          </header>
          {data ? (
            <div className="pantau-kisi">
              <BagianSearchConsole analitik={data.analitik} tugas={data.tugas} />
              <BagianStatusIndeks statusIndeks={data.statusIndeks} />
              <BagianLog log={data.log} />
              <BagianTautan tautan={data.tautan} tugas={data.tugas} />
              <BagianYatim yatim={data.yatim} tugas={data.tugas} />
              <Bagian404 log404={data.log404} />
            </div>
          ) : (
            <p className="pantau-kosong">Dashboard SEO hanya untuk admin.</p>
          )}
        </Gutter>
      </DefaultTemplate>
    )
  }
  ```

  `src/modules/pantau/admin/TautanNav.tsx`

  ```tsx
  'use client'

  import { usePathname } from 'next/navigation'

  /**
   * Tautan menu admin dengan kelas dan penanda aktif yang sama dengan tautan koleksi Payload (`nav__link`),
   * ditambah `aria-current` saat halamannya terbuka.
   */
  export function TautanNav({ href, label }: { href: string; label: string }) {
    const aktif = usePathname() === href
    return (
      <a className="nav__link" href={href} id="nav-dashboard-seo" aria-current={aktif ? 'page' : undefined}>
        {aktif && <div className="nav__link-indicator" />}
        <span className="nav__link-label">{label}</span>
      </a>
    )
  }
  ```

  `src/modules/pantau/admin/TautanDashboard.tsx`

  ```tsx
  import type { ServerProps } from 'payload'

  import { PATH_ADMIN } from '@/lib/admin'

  import { TautanNav } from './TautanNav'

  import './nav.scss'

  /** Tautan "Dashboard SEO" di atas menu admin (`admin.components.beforeNavLinks`), hanya untuk admin. */
  export function TautanDashboard({ user }: ServerProps) {
    if ((user as { peran?: string | null } | undefined)?.peran !== 'admin') return null
    return <TautanNav href={`${PATH_ADMIN}/seo`} label="Dashboard SEO" />
  }
  ```

  `src/modules/pantau/admin/nav.scss`

  ```scss
  // Tautan "Dashboard SEO" di atas grup menu admin: berjarak dari grup pertama seperti jarak antargrup.
  #nav-dashboard-seo {
    margin-bottom: calc(var(--base) * 0.75);
    font-weight: 600;
  }
  ```

  ```diff
  diff --git a/src/payload.config.ts b/src/payload.config.ts
  index 0629a70..b95c49e 100644
  --- a/src/payload.config.ts
  +++ b/src/payload.config.ts
  @@ -41,6 +41,18 @@ export default buildConfig({
     admin: {
       user: Pengguna.slug,
       importMap: { baseDir: path.resolve(dirname) },
  +    components: {
  +      // Dashboard SEO (spesifikasi §8) di /admin/seo, dengan tautan di atas menu admin.
  +      beforeNavLinks: ['@/modules/pantau/admin/TautanDashboard#TautanDashboard'],
  +      views: {
  +        dashboardSeo: {
  +          Component: '@/modules/pantau/admin/DashboardSeo#DashboardSeo',
  +          path: '/seo',
  +          exact: true,
  +          meta: { title: 'Dashboard SEO' },
  +        },
  +      },
  +    },
     },
     collections: [
       Pengguna,
  ```

  ```bash
  pnpm generate:importmap
  git diff --stat "src/app/(payload)/admin/importMap.js"
  ```

  Hasil yang diharapkan: `1 file changed, 4 insertions(+)` (`DashboardSeo` dan `TautanDashboard`).

- [ ] **Langkah 5: Data E2E dashboard**

  ```diff
  diff --git a/tests/e2e/data.ts b/tests/e2e/data.ts
  index f3c1a06..efc3aaa 100644
  --- a/tests/e2e/data.ts
  +++ b/tests/e2e/data.ts
  @@ -54,6 +54,13 @@ export const KLIK_CONTOH: [path: string, klik7: number][] = [
   ]
   export const POPULER = [SLUG.danaDarurat, SLUG.explainer, SLUG.tekno, SLUG.panduan] as const
   
  +/** Total harian properti 28 hari sampai 2 November 2026 (data final terakhir) untuk dashboard SEO. */
  +export const HARI_CONTOH = Array.from({ length: 28 }, (_, i) => {
  +  const tanggal = new Date(Date.UTC(2026, 9, 6 + i)).toISOString().slice(0, 10)
  +  const klik = 40 + ((i * 37) % 60)
  +  return { tanggal, klik, impresi: klik * 150, ctr: 1 / 150, posisi: 8 - i / 10 }
  +})
  +
   /** Kunci IndexNow di pengaturan SEO database E2E, dilayani di `/{kunci}.txt`. */
   export const KUNCI_INDEXNOW = 'e2e-kunci-indexnow-2026'
   
  ```

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index 5881737..788ef43 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -7,7 +7,7 @@ import type { Halaman } from '@/payload-types'
   import { klienPalsu } from '@/modules/media/palsu'
   import { seed } from '@/seed/seed'
   
  -import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, KLIK_CONTOH, KUNCI_INDEXNOW, p, SLUG, SLUG_HALAMAN, SLUG_SUB, SLUG_VIDEO, tautanKe } from './data'
  +import { ADMIN_E2E, blok, gambar, h2, HARI_CONTOH, isi, JUDUL_PANDUAN, KLIK_CONTOH, KUNCI_INDEXNOW, p, SLUG, SLUG_HALAMAN, SLUG_SUB, SLUG_VIDEO, tautanKe } from './data'
   
   /**
    * Mengisi database E2E sebelum server dibangun dan dinyalakan (`webServer` di playwright.config.ts).
  @@ -326,6 +326,18 @@ for (const [path, klik7] of KLIK_CONTOH) {
       data: { path, klik7, impresi7: klik7 * 10, klik28: klik7 * 4, impresi28: klik7 * 40, ctr28: 0.1, posisi28: 6.4, sampai: '2026-11-02' },
     })
   }
  +for (const hari of HARI_CONTOH) await payload.create({ collection: 'analitik-situs', data: hari })
  +// Seolah sinkron hari ini sudah berhasil: cron selama E2E tidak menjalankannya lagi (adapter palsu melewatinya).
  +await payload.create({
  +  collection: 'tugas-seo',
  +  data: {
  +    jenis: 'analitik',
  +    status: 'berhasil',
  +    pesan: 'Data sampai 2026-11-02: 7 halaman.',
  +    selesai: new Date().toISOString(),
  +    berikutnya: new Date(Date.now() + 86_400_000).toISOString(),
  +  },
  +})
   
   await payload.create({ collection: 'redirect', data: { dari: '/promo-lama', ke: '/glosarium', kode: '301' } })
   await payload.create({ collection: 'redirect', data: { dari: '/glosarium/ptkp-lama', ke: '/glosarium/ptkp', kode: '301' } })
  ```

- [ ] **Langkah 6: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 61 passed (61)`, `Tests 417 passed (417)`; integrasi `Test Files 35 passed (35)`, `Tests 113 passed (113)`; E2E `97 passed` (termasuk axe pada `.pantau` dan tanpa geser horizontal di 375, 768, dan 1440 px).

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/modules/pantau/admin src/payload.config.ts "src/app/(payload)/admin/importMap.js" tests/unit/pantau-dashboard.test.ts tests/e2e
  git commit -m "feat(pantau): dashboard SEO di admin /admin/seo dengan tautan di menu: performa Google, grafik klik harian, status indeks, log, tautan rusak, halaman yatim, dan 404 teratas"
  ```

---

### Task 9: Redirect otomatis `/{pilar}/{subkategori}`

**Files:**
- Create: `src/hooks/redirectSubkategori.ts`
- Modify: `src/hooks/redirectSaatPathBerubah.ts`, `src/collections/Subkategori.ts`, `src/collections/Pilar.ts`, `tests/e2e/rubrik.spec.ts`
- Test: `tests/int/redirect-subkategori.int.spec.ts`, `tests/e2e/rubrik.spec.ts`

**Interfaces:**
- Consumes: `rencanaRedirect` (`src/lib/redirect.ts`), `pathFor` (`subkategori` butuh `pilarSlug`), pola `req.context` di `beforeChange` (Rencana 1 dan 3).
- Produces:
  - `redirectSaatPathBerubah.ts`: `terapkanRedirect(req, pathLama, pathBaru)` diekspor (isi `buatRedirect` yang lama, perilaku sama).
  - `redirectSubkategori.ts`: `pathSubkategori(req, doc)`, hook `catatPathSubkategori` (beforeChange) dan `buatRedirectSubkategori` (afterChange) untuk subkategori, `redirectSubkategoriPilar` (afterChange) untuk pilar.

Spesifikasi §7: mengganti slug membuat redirect 301 otomatis. Path subkategori `/{pilar}/{subkategori}` bergantung pada slug pilarnya, jadi `redirectSaatPathBerubah` (yang membangun path tanpa query) tidak bisa dipakai langsung. Pola tetap sama: path lama dicatat di `beforeChange` (slug pilar dibaca dengan `req`, hasilnya ditulis ke `req.context` setelah `await`) dan dibandingkan di `afterChange`; subkategori tidak punya draf, jadi dokumen lama adalah versi publik. Tiga kejadian membuat redirect: slug subkategori berganti, subkategori pindah pilar, dan slug pilar berganti (hook pilar mengalihkan setiap subkategorinya). Path pilar sendiri tetap ditangani `redirectSaatPathBerubah`, dan artikel tidak perlu karena path-nya datar (`/{slug}`). Penulisan redirect memakai `terapkanRedirect` yang sama, jadi redirect lama yang menunjuk path subkategori ikut diperbarui tanpa rantai.

Update massal Payload menjalankan hook setiap dokumen secara paralel dalam satu transaksi. Tes integrasi memindahkan dua subkategori ke pilar lain dalam satu `payload.update({ where })`, lalu mengubah dan menghapus dua pilar dan dua subkategori sekaligus. Probe menjalankan tes itu tiga kali dengan dan tanpa giliran per `req` (pola `kabari`): selalu lulus, karena setiap dokumen hanya membaca dan menulis redirect untuk path miliknya sendiri (slug unik per koleksi), jadi tidak ada giliran.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/int/redirect-subkategori.int.spec.ts`

  ```ts
  import type { Payload } from 'payload'
  import { describe, expect, it } from 'vitest'

  import { getTestPayload, unik } from './helpers'

  async function buatPilar(payload: Payload) {
    return payload.create({ collection: 'pilar', data: { nama: unik('Pilar'), warna: 'hijau', deskripsi: 'Pilar tes.' } })
  }

  async function buatSub(payload: Payload, pilar: number) {
    return payload.create({ collection: 'subkategori', data: { nama: unik('Sub'), pilar } })
  }

  /** Redirect yang berasal dari path di `dari`, sebagai `dari -> ke`. */
  async function redirect(payload: Payload, dari: string[]) {
    const { docs } = await payload.find({ collection: 'redirect', where: { dari: { in: dari } }, sort: 'dari', depth: 0, limit: 100 })
    return docs.map((d) => `${d.dari} -> ${d.ke} ${d.kode} ${d.sumber}`)
  }

  describe('redirect otomatis halaman subkategori /{pilar}/{subkategori}', () => {
    it('ganti slug subkategori: path lama dialihkan ke path baru', async () => {
      const payload = await getTestPayload()
      const pilar = await buatPilar(payload)
      const sub = await buatSub(payload, pilar.id)
      const slugBaru = unik('sub-baru')
      await payload.update({ collection: 'subkategori', id: sub.id, data: { slug: slugBaru } })
      expect(await redirect(payload, [`/${pilar.slug}/${sub.slug}`])).toEqual([`/${pilar.slug}/${sub.slug} -> /${pilar.slug}/${slugBaru} 301 otomatis`])
    })

    it('subkategori pindah pilar: path lama dialihkan ke pilar baru; simpan tanpa perubahan path tidak membuat redirect', async () => {
      const payload = await getTestPayload()
      const [lama, baru] = [await buatPilar(payload), await buatPilar(payload)]
      const sub = await buatSub(payload, lama.id)
      await payload.update({ collection: 'subkategori', id: sub.id, data: { deskripsi: 'Hanya deskripsi.' } })
      expect(await redirect(payload, [`/${lama.slug}/${sub.slug}`])).toEqual([])
      await payload.update({ collection: 'subkategori', id: sub.id, data: { pilar: baru.id } })
      expect(await redirect(payload, [`/${lama.slug}/${sub.slug}`])).toEqual([`/${lama.slug}/${sub.slug} -> /${baru.slug}/${sub.slug} 301 otomatis`])
    })

    it('pilar ganti slug: setiap subkategorinya dialihkan, dan redirect lama ke path subkategori diperbarui tanpa rantai', async () => {
      const payload = await getTestPayload()
      const pilar = await buatPilar(payload)
      const [a, b] = [await buatSub(payload, pilar.id), await buatSub(payload, pilar.id)]
      const alamatLama = `/${unik('alamat-lama')}`
      await payload.create({ collection: 'redirect', data: { dari: alamatLama, ke: `/${pilar.slug}/${a.slug}`, kode: '301' } })
      const slugBaru = unik('pilar-baru')
      await payload.update({ collection: 'pilar', id: pilar.id, data: { slug: slugBaru } })
      expect(await redirect(payload, [`/${pilar.slug}`, `/${pilar.slug}/${a.slug}`, `/${pilar.slug}/${b.slug}`, alamatLama])).toEqual(
        [
          `/${pilar.slug} -> /${slugBaru} 301 otomatis`,
          `/${pilar.slug}/${a.slug} -> /${slugBaru}/${a.slug} 301 otomatis`,
          `/${pilar.slug}/${b.slug} -> /${slugBaru}/${b.slug} 301 otomatis`,
          `${alamatLama} -> /${slugBaru}/${a.slug} 301 manual`,
        ].sort(),
      )
    })

    it('operasi massal: dua subkategori pindah pilar dalam satu update (hook paralel dalam satu transaksi) dan dua pilar diubah lalu dihapus sekaligus', async () => {
      const payload = await getTestPayload()
      const [lama, baru] = [await buatPilar(payload), await buatPilar(payload)]
      const [a, b] = [await buatSub(payload, lama.id), await buatSub(payload, lama.id)]
      const pindah = await payload.update({ collection: 'subkategori', where: { id: { in: [a.id, b.id] } }, data: { pilar: baru.id } })
      expect([pindah.errors, pindah.docs.length]).toEqual([[], 2])
      expect(await redirect(payload, [`/${lama.slug}/${a.slug}`, `/${lama.slug}/${b.slug}`])).toEqual(
        [`/${lama.slug}/${a.slug} -> /${baru.slug}/${a.slug} 301 otomatis`, `/${lama.slug}/${b.slug} -> /${baru.slug}/${b.slug} 301 otomatis`].sort(),
      )

      const ubah = await payload.update({ collection: 'pilar', where: { id: { in: [lama.id, baru.id] } }, data: { urutan: 9 } })
      expect([ubah.errors, ubah.docs.length]).toEqual([[], 2])
      const hapusSub = await payload.delete({ collection: 'subkategori', where: { id: { in: [a.id, b.id] } } })
      expect([hapusSub.errors, hapusSub.docs.length]).toEqual([[], 2])
      const hapusPilar = await payload.delete({ collection: 'pilar', where: { id: { in: [lama.id, baru.id] } } })
      expect([hapusPilar.errors, hapusPilar.docs.length]).toEqual([[], 2])
    })
  })
  ```

  ```diff
  diff --git a/tests/e2e/rubrik.spec.ts b/tests/e2e/rubrik.spec.ts
  index 4b5d089..170f083 100644
  --- a/tests/e2e/rubrik.spec.ts
  +++ b/tests/e2e/rubrik.spec.ts
  @@ -1,7 +1,7 @@
   import { expect, test } from '@playwright/test'
   
   import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
  -import { SLUG, SLUG_SUB, UKURAN_LAYAR } from './data'
  +import { ADMIN_E2E, SLUG, SLUG_SUB, UKURAN_LAYAR } from './data'
   
   test.beforeEach(async ({ page }) => {
     await cegatCloudinary(page)
  @@ -46,3 +46,20 @@ for (const { lebar, tinggi } of UKURAN_LAYAR) {
       }
     })
   }
  +
  +test('ganti slug subkategori: path lama /{pilar}/{subkategori} dialihkan permanen ke path baru', async ({ request }) => {
  +  const { token } = await (await request.post('/api/pengguna/login', { data: ADMIN_E2E })).json()
  +  const auth = { Authorization: `JWT ${token}` }
  +  const pilar = (await (await request.get('/api/pilar?where[slug][equals]=uang-karier', { headers: auth })).json()).docs[0]
  +  const slug = `asuransi-${Date.now()}`
  +  const { doc } = await (await request.post('/api/subkategori', { headers: auth, data: { nama: 'Asuransi', slug, pilar: pilar.id } })).json()
  +  expect((await request.get(`/uang-karier/${slug}`)).status()).toBe(200)
  +
  +  const baru = `${slug}-kesehatan`
  +  expect((await request.patch(`/api/subkategori/${doc.id}`, { headers: auth, data: { slug: baru } })).status()).toBe(200)
  +  const lama = await request.get(`/uang-karier/${slug}`, { maxRedirects: 0 })
  +  expect(lama.status()).toBe(308)
  +  expect(lama.headers().location).toContain(`/uang-karier/${baru}`)
  +  expect((await request.get(`/uang-karier/${baru}`)).status()).toBe(200)
  +})
  +
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  pnpm test:int
  ```

  Hasil yang diharapkan: FAIL 4 tes di `tests/int/redirect-subkategori.int.spec.ts`: dua tes pertama dengan `AssertionError: expected [] to deeply equal [ Array(1) ]`, "pilar ganti slug ..." dengan `AssertionError: expected [ …(2) ] to deeply equal [ …(4) ]` (hanya redirect pilar dan redirect manual), dan "operasi massal ..." dengan `AssertionError: expected [] to deeply equal [ …(2) ]`.

- [ ] **Langkah 3: `terapkanRedirect` dan hook subkategori**

  ```diff
  diff --git a/src/hooks/redirectSaatPathBerubah.ts b/src/hooks/redirectSaatPathBerubah.ts
  index 9067ed7..ce70b3b 100644
  --- a/src/hooks/redirectSaatPathBerubah.ts
  +++ b/src/hooks/redirectSaatPathBerubah.ts
  @@ -1,4 +1,4 @@
  -import type { CollectionAfterChangeHook, CollectionBeforeChangeHook } from 'payload'
  +import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, PayloadRequest } from 'payload'
   
   import { pathFor, type TargetPath } from '@/lib/paths'
   import { rencanaRedirect } from '@/lib/redirect'
  @@ -12,6 +12,40 @@ export type KeTarget = (doc: DokumenBerpath) => TargetPath | null
   
   const kunciKonteks = (koleksi: string, id: unknown) => `pathPublik:${koleksi}:${String(id)}`
   
  +/**
  + * Menulis redirect untuk path yang berubah (`rencanaRedirect`: path lama ke path baru, tanpa rantai dan
  + * tanpa putaran). Dipakai juga hook subkategori dan pilar (`redirectSubkategori.ts`). Update massal
  + * menjalankan hook setiap dokumen secara paralel dalam satu transaksi; itu aman di sini karena setiap
  + * dokumen hanya membaca dan menulis baris redirect untuk path miliknya sendiri (slug unik per koleksi).
  + */
  +export async function terapkanRedirect(req: PayloadRequest, pathLama: string, pathBaru: string): Promise<void> {
  +  if (pathLama === pathBaru) return
  +  const { docs } = await req.payload.find({
  +    collection: 'redirect',
  +    where: {
  +      or: [{ dari: { equals: pathBaru } }, { dari: { equals: pathLama } }, { ke: { equals: pathLama } }],
  +    },
  +    limit: 100,
  +    depth: 0,
  +    req,
  +  })
  +  const rencana = rencanaRedirect(pathLama, pathBaru, docs)
  +
  +  for (const id of rencana.hapus) {
  +    await req.payload.delete({ collection: 'redirect', id, req })
  +  }
  +  for (const { id, ke } of rencana.ubah) {
  +    await req.payload.update({ collection: 'redirect', id, data: { ke, kode: '301' }, req })
  +  }
  +  for (const { dari, ke } of rencana.buat) {
  +    await req.payload.create({
  +      collection: 'redirect',
  +      data: { dari, ke, kode: '301', sumber: 'otomatis' },
  +      req,
  +    })
  +  }
  +}
  +
   /**
    * Membuat redirect 301 saat dokumen yang sudah publik diterbitkan dengan path berbeda.
    *
  @@ -59,33 +93,7 @@ export function redirectSaatPathBerubah(keTarget: KeTarget): {
   
       const targetBaru = keTarget(doc)
       if (!targetBaru) return doc
  -    const pathBaru = pathFor(targetBaru)
  -    if (pathLama === pathBaru) return doc
  -
  -    const { docs } = await req.payload.find({
  -      collection: 'redirect',
  -      where: {
  -        or: [{ dari: { equals: pathBaru } }, { dari: { equals: pathLama } }, { ke: { equals: pathLama } }],
  -      },
  -      limit: 100,
  -      depth: 0,
  -      req,
  -    })
  -    const rencana = rencanaRedirect(pathLama, pathBaru, docs)
  -
  -    for (const id of rencana.hapus) {
  -      await req.payload.delete({ collection: 'redirect', id, req })
  -    }
  -    for (const { id, ke } of rencana.ubah) {
  -      await req.payload.update({ collection: 'redirect', id, data: { ke, kode: '301' }, req })
  -    }
  -    for (const { dari, ke } of rencana.buat) {
  -      await req.payload.create({
  -        collection: 'redirect',
  -        data: { dari, ke, kode: '301', sumber: 'otomatis' },
  -        req,
  -      })
  -    }
  +    await terapkanRedirect(req, pathLama, pathFor(targetBaru))
       return doc
     }
   
  ```

  `src/hooks/redirectSubkategori.ts`

  ```ts
  import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, PayloadRequest } from 'payload'

  import { pathFor } from '@/lib/paths'

  import { terapkanRedirect } from './redirectSaatPathBerubah'

  type DokumenSubkategori = { id: number | string; slug?: string | null; pilar?: unknown }

  /** Slug pilar dari relasi (ID atau dokumen). ID dibaca dengan `req` supaya ikut transaksi simpan. */
  async function slugPilar(req: PayloadRequest, pilar: unknown): Promise<string | null> {
    if (pilar && typeof pilar === 'object') return (pilar as { slug?: string | null }).slug ?? null
    if (typeof pilar !== 'number' && typeof pilar !== 'string') return null
    const doc = await req.payload.findByID({ collection: 'pilar', id: pilar, depth: 0, req, disableErrors: true, select: { slug: true } })
    return doc?.slug ?? null
  }

  /** Path `/{pilar}/{subkategori}`, atau `null` bila slug subkategori atau pilarnya belum ada. */
  export async function pathSubkategori(req: PayloadRequest, doc: DokumenSubkategori): Promise<string | null> {
    const pilarSlug = await slugPilar(req, doc.pilar)
    return doc.slug && pilarSlug ? pathFor({ jenis: 'subkategori', slug: doc.slug, pilarSlug }) : null
  }

  const kunciKonteks = (id: unknown) => `pathSubkategori:${String(id)}`

  /**
   * Redirect otomatis halaman subkategori (spesifikasi §7: mengganti slug membuat redirect 301). Path
   * subkategori bergantung pada slug pilarnya, jadi tidak bisa memakai `redirectSaatPathBerubah` yang
   * membangun path tanpa query. Pola sama: path lama dicatat di `beforeChange`, dibandingkan setelah simpan.
   * Subkategori tidak punya draf, jadi `originalDoc` adalah versi publik.
   */
  export const catatPathSubkategori: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req }) => {
    if (operation !== 'update' || !originalDoc) return data
    const path = await pathSubkategori(req, originalDoc as DokumenSubkategori)
    // Ditulis setelah `await`: operasi Payload dengan `req` bisa mengganti objek `req.context`.
    req.context[kunciKonteks(originalDoc.id)] = path
    return data
  }

  /** Slug berganti atau subkategori pindah pilar: path lama dialihkan ke path baru. */
  export const buatRedirectSubkategori: CollectionAfterChangeHook = async ({ doc, req }) => {
    const kunci = kunciKonteks(doc.id)
    const pathLama = req.context[kunci] as string | null | undefined
    delete req.context[kunci]
    if (!pathLama) return doc
    const pathBaru = await pathSubkategori(req, doc as DokumenSubkategori)
    if (pathBaru) await terapkanRedirect(req, pathLama, pathBaru)
    return doc
  }

  /**
   * Pilar berganti slug: path setiap subkategorinya ikut berubah, jadi setiap `/{slug-lama}/{subkategori}`
   * dialihkan ke `/{slug-baru}/{subkategori}`. Pilar tidak punya draf, jadi `previousDoc` adalah versi publik
   * sebelumnya. Path pilar sendiri ditangani `redirectSaatPathBerubah`.
   */
  export const redirectSubkategoriPilar: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
    const lama = previousDoc?.slug as string | null | undefined
    const baru = doc.slug as string | null | undefined
    if (operation !== 'update' || !lama || !baru || lama === baru) return doc
    const { docs } = await req.payload.find({
      collection: 'subkategori',
      where: { pilar: { equals: doc.id } },
      depth: 0,
      limit: 1000,
      pagination: false,
      select: { slug: true },
      req,
    })
    for (const sub of docs) {
      if (!sub.slug) continue
      await terapkanRedirect(req, pathFor({ jenis: 'subkategori', slug: sub.slug, pilarSlug: lama }), pathFor({ jenis: 'subkategori', slug: sub.slug, pilarSlug: baru }))
    }
    return doc
  }
  ```

  ```diff
  diff --git a/src/collections/Subkategori.ts b/src/collections/Subkategori.ts
  index aa2ccc6..8f27cc4 100644
  --- a/src/collections/Subkategori.ts
  +++ b/src/collections/Subkategori.ts
  @@ -3,6 +3,7 @@ import type { CollectionConfig } from 'payload'
   import { anyone, isAdmin } from '@/access'
   import { seoField } from '@/fields/seo'
   import { slugField } from '@/fields/slug'
  +import { buatRedirectSubkategori, catatPathSubkategori } from '@/hooks/redirectSubkategori'
   import { revalidasiPublik } from '@/hooks/revalidasiPublik'
   
   const revalidasi = revalidasiPublik('subkategori')
  @@ -12,7 +13,11 @@ export const Subkategori: CollectionConfig = {
     labels: { singular: 'Subkategori', plural: 'Subkategori' },
     admin: { useAsTitle: 'nama', defaultColumns: ['nama', 'pilar', 'slug'], group: 'Konten' },
     access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  -  hooks: { afterChange: [revalidasi.afterChange], afterDelete: [revalidasi.afterDelete] },
  +  hooks: {
  +    beforeChange: [catatPathSubkategori],
  +    afterChange: [buatRedirectSubkategori, revalidasi.afterChange],
  +    afterDelete: [revalidasi.afterDelete],
  +  },
     fields: [
       { name: 'nama', type: 'text', required: true },
       slugField('nama'),
  ```

  ```diff
  diff --git a/src/collections/Pilar.ts b/src/collections/Pilar.ts
  index 28a40a9..65edfd9 100644
  --- a/src/collections/Pilar.ts
  +++ b/src/collections/Pilar.ts
  @@ -5,6 +5,7 @@ import { seoField } from '@/fields/seo'
   import { slugField } from '@/fields/slug'
   import { kabariMesinPencari } from '@/hooks/kabariMesinPencari'
   import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
  +import { redirectSubkategoriPilar } from '@/hooks/redirectSubkategori'
   import { revalidasiPublik } from '@/hooks/revalidasiPublik'
   import { WARNA_PILAR } from '@/lib/konstanta'
   
  @@ -24,7 +25,7 @@ export const Pilar: CollectionConfig = {
     access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
     hooks: {
       beforeChange: [redirect.catatPathPublik, kabar.beforeChange],
  -    afterChange: [redirect.buatRedirect, revalidasi.afterChange, kabar.afterChange],
  +    afterChange: [redirect.buatRedirect, redirectSubkategoriPilar, revalidasi.afterChange, kabar.afterChange],
       afterDelete: [revalidasi.afterDelete, kabar.afterDelete],
     },
     fields: [
  ```

- [ ] **Langkah 4: Jalankan semua tes**

  Jalankan:

  ```bash
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 61 passed (61)`, `Tests 417 passed (417)`; integrasi `Test Files 36 passed (36)`, `Tests 117 passed (117)` (termasuk `tests/int/slug-redirect.int.spec.ts` yang memakai `terapkanRedirect` lewat `redirectSaatPathBerubah`); E2E `98 passed`.

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/hooks/redirectSaatPathBerubah.ts src/hooks/redirectSubkategori.ts src/collections/Subkategori.ts src/collections/Pilar.ts tests/int/redirect-subkategori.int.spec.ts tests/e2e/rubrik.spec.ts
  git commit -m "feat(seo): redirect otomatis /{pilar}/{subkategori} saat slug subkategori berganti, subkategori pindah pilar, atau pilar berganti slug"
  ```

---

### Task 10: Pantau SEO di CLAUDE.md dan spesifikasi, lalu pemeriksaan akhir

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-11-03-point-lat-design.md`

**Interfaces:**
- Consumes: semua task sebelumnya.
- Produces: aturan proyek untuk agen dan pengembang berikutnya (modul `pantau`, koleksi tersembunyi dan siapa yang membaca, saklar adapter bersama, tes dengan adapter palsu dan opsi `tugas`, tanggal waktu Pasifik, sumber tautan masuk, `urlAdmin`, `terapkanRedirect` dan redirect subkategori, aturan "Paling dibaca", tag `analitik`, data E2E klik contoh), dan spesifikasi yang sesuai keputusan rencana ini (§4 beranda, §5 modul `pantau`, §6 lima koleksi, §7 redirect subkategori, §8 halaman yatim, link rusak, log 404, dan Dashboard SEO).

- [ ] **Langkah 1: Perbarui CLAUDE.md dan spesifikasi**

  ```diff
  diff --git a/CLAUDE.md b/CLAUDE.md
  index fbc77a3..d5b50aa 100644
  --- a/CLAUDE.md
  +++ b/CLAUDE.md
  @@ -22,7 +22,7 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Import map admin: `pnpm generate:importmap` (jalankan setiap kali menambah fitur Lexical atau komponen admin)
   - Data awal: `pnpm seed` (pilar, penulis, halaman draf, global, dan enam kalkulator draf beserta parameternya; dokumen yang sudah ada tidak ditimpa)
   - Aset sistem Cloudinary (sekali per akun, butuh kredensial): `pnpm media:siapkan`
  -- Pekerjaan cron sekali jalan tanpa Vercel (jadwal terbit dan antrean Mesin Indexing): `pnpm indexer`
  +- Pekerjaan cron sekali jalan tanpa Vercel (jadwal terbit, antrean Mesin Indexing, dan tugas Pantau SEO yang jatuh tempo): `pnpm indexer`
   
   ## Konvensi
   - Nama domain memakai bahasa Indonesia, sama dengan spesifikasi: slug koleksi (`artikel`, `pilar`), nama field (`judul`, `intinya`), nama fungsi modul (`kabari`, `hitung`, `pathFor` adalah pengecualian yang sudah ada).
  @@ -31,14 +31,15 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Satu file satu tanggung jawab. Koleksi di `src/collections/`, global di `src/globals/`, blok di `src/blocks/`, field bersama di `src/fields/`, hook di `src/hooks/`, akses di `src/access/`.
   - Path publik selalu dibangun lewat `pathFor()` di `src/lib/paths.ts`, jangan merangkai string URL manual. Halaman indeks memakai `PATH_INDEKS` (`/cari`, `/glosarium`, `/tools`, `/video`).
   - SEO selalu lewat `src/modules/seo`: `metadata()` untuk `generateMetadata`, `jsonLd()` + `serialisasiJsonLd()` untuk JSON-LD, `remahRoti()` untuk breadcrumb, `ambilSitus()` untuk pengaturan situs. Jangan menulis `<title>`, canonical, robots, atau JSON-LD manual di halaman. Rute teknis (`/sitemap.xml`, `/sitemap/{jenis}.xml`, `/news-sitemap.xml`, `/robots.txt`, `/feed.xml`) ada di `src/app/(frontend)/` dan hanya merangkai fungsi modul.
  -- Tag cache di `src/lib/tag.ts` (`TAG`): data halaman publik di-cache dengan tag yang sama dengan yang direvalidasi hook `revalidasiPublik` (`{koleksi}`, `{koleksi}:{id}`, `pilar:{slug}`, `beranda`, `sitemap`, `pengaturan-seo`, `header`, `footer`, `media`, `redirect`, `parameter-tools`). Koleksi publik baru wajib memasang `revalidasiPublik(koleksi)`. Tag `beranda` dibuang global `beranda` dan `newsletter` serta terbitnya artikel, pilar, video, dan tools; koleksi yang baru tampil di beranda ditambahkan ke `DI_BERANDA`.
  +- Tag cache di `src/lib/tag.ts` (`TAG`): data halaman publik di-cache dengan tag yang sama dengan yang direvalidasi hook `revalidasiPublik` (`{koleksi}`, `{koleksi}:{id}`, `pilar:{slug}`, `beranda`, `sitemap`, `pengaturan-seo`, `header`, `footer`, `media`, `redirect`, `parameter-tools`, `analitik`). Koleksi publik baru wajib memasang `revalidasiPublik(koleksi)`. Tag `beranda` dibuang global `beranda` dan `newsletter` serta terbitnya artikel, pilar, video, dan tools; koleksi yang baru tampil di beranda ditambahkan ke `DI_BERANDA`.
   - Mesin Indexing di `src/modules/indexer`: `kabari(payload, kabar, { req })` memasukkan kabar ke antrean Postgres (koleksi `antrean-indexing`), `jalankanIndexer(payload)` mengirimnya (cron `GET /api/jobs/run` dengan `CRON_SECRET` setiap 10 menit, dan `after()` setelah simpan), log di `log-indexing`, status Google di `status-indeks`. Ketiga koleksi itu hanya ditulis modul indexer dan hanya dibaca admin. Koleksi berhalaman publik baru memasang `kabariMesinPencari(keTarget)` dari `src/hooks/kabariMesinPencari.ts` setelah hook revalidasi (beforeChange, afterChange, afterDelete). Aturan (jendela kirim, jeda ulang, kuota, jadwal cek) sebagai fungsi murni di `aturan.ts` dengan waktu sebagai argumen. Semua panggilan ke Google dan IndexNow lewat adapter (`asli.ts` dengan `fetch` dan JWT akun layanan tanpa pustaka, `palsu.ts` dalam memori), dipilih env `INDEXER_ADAPTER` (`asli` hanya di produksi; dev dan tes memakai palsu; build produksi yang dijalankan tanpa nilai itu ditolak). Tes memakai `adapterPalsu()` + `pakaiAdapterIndexer()` dan opsi `sekarang`. Hapus dan update massal Payload menjalankan hook setiap dokumen secara paralel dalam satu transaksi: `kabari` dengan `req` yang sama berjalan bergiliran, baris antrean baru dibuat lewat `INSERT ... ON CONFLICT DO NOTHING` di sesi transaksi `req` (jangan `payload.create` untuk koleksi dengan kunci unik yang bisa ditulis bersamaan), dan SQL langsung di dalam hook wajib memakai sesi transaksi itu, bukan koneksi pool lain (deadlock). Tes `indexer-bersamaan.int.spec.ts` menjaganya.
  +- Pantau SEO di `src/modules/pantau` (spesifikasi §8 "Dashboard SEO"): `jalankanPantau(payload)` dipanggil cron yang sama setelah Mesin Indexing dan menjalankan tugas harian yang jatuh tempo (sinkron Search Analytics beserta retensi log indexing 90 hari, dan pindai tautan), lalu memeriksa paling banyak 10 tautan luar yang jatuh tempo per jalan (masing-masing seminggu sekali). Tugas diklaim atomik di `tugas-seo` (cron dobel tidak menjalankan dua kali). Data di koleksi tersembunyi `analitik-halaman`, `analitik-situs`, `tugas-seo`, `temuan-tautan`, dan `tautan-luar`: hanya ditulis modul pantau, dibaca dashboard admin `/admin/seo` lewat `ambilDashboard()`, kecuali `analitik-halaman` yang juga dibaca modul konten (`ambilPopuler`, tag `analitik`) untuk "Paling dibaca pekan ini". Search Analytics dan pemeriksa tautan lewat adapter pantau (`asli.ts` memakai token akun layanan dari `indexer/google.ts`, `palsu.ts` dalam memori), dengan saklar `INDEXER_ADAPTER` yang sama; adapter palsu melewati sinkron (data tersimpan tidak tertimpa). Tes memakai `adapterPalsu()` (`dataAnalitik`, `jawabanTautan`), opsi `sekarang`, dan opsi `tugas`. Tanggal Search Analytics adalah tanggal kalender waktu Pasifik (`tanggalPasifik`). Tautan masuk untuk halaman yatim dihitung dari isi Lexical dokumen terbit, relasi pilihan editor, menu header dan footer, dan pilihan beranda; daftar otomatis (rubrik, terbaru, terkait otomatis) tidak dihitung. URL halaman admin lewat `urlAdmin` di `src/lib/admin.ts`.
   - Nilai di `req.context` yang dihitung dengan `await` operasi Payload ditulis setelah `await` selesai (simpan ke variabel dulu): operasi Payload dengan `req` bisa mengganti objek `req.context`, sehingga `req.context[k] = await ...` hilang.
   - URL media selalu lewat `src/modules/media` (`bangunUrl`, `propsGambar`, `urlOg`), jangan merangkai URL Cloudinary manual. `next/image` memakai loader kustom Cloudinary, jadi `src` harus URL dari `bangunUrl`/`propsGambar` dan `width`/`height` wajib diisi.
   - Media disimpan di Cloudinary (folder `point/gambar`, `point/video`). Tanpa `CLOUDINARY_*` di env (lokal, tes) dipakai klien palsu dalam memori: file tidak tersimpan permanen. Tes tidak boleh memanggil jaringan.
   - Halaman publik di `src/app/(frontend)/` dirender ISR: rute dinamis memakai `generateStaticParams` yang mengembalikan `[]`, dan data diambil lewat `muat*()` dari `src/modules/konten` (cache bertag `TAG`). Path tanpa dokumen diakhiri `tanganiTidakAda(path)` di komponen halaman (redirect dari koleksi `redirect` atau 404), sedangkan `generateMetadata` mengembalikan `metadataTidakDitemukan()` untuk path itu.
  -- Rute catch-all `[...jalur]` mencari dokumen lewat `muatJalur()`: satu segmen artikel, pilar, lalu halaman statis; dua segmen subkategori di bawah pilarnya. Jenis halaman tingkat atas baru ditambahkan di `muatJalur`, bukan sebagai rute bersaudara. `/cari` satu-satunya halaman dinamis (membaca `searchParams`, noindex); hasilnya di-cache per kueri.
  -- Beranda dirender dari global `beranda` lewat `susunBeranda()`: urutan blok dari editor, tanpa data palsu (blok "Paling dibaca" menampilkan tulisan terbaru dengan judul "Tulisan terbaru" sampai data kunjungan ada, newsletter hanya tautan ke form penyedia, slot iklan belum dirender).
  +- Rute catch-all `[...jalur]` mencari dokumen lewat `muatJalur()`: satu segmen artikel, pilar, lalu halaman statis; dua segmen subkategori di bawah pilarnya. Redirect otomatis saat path berubah lewat `terapkanRedirect` (`src/hooks/redirectSaatPathBerubah.ts`): koleksi berpath sederhana memakai `redirectSaatPathBerubah`, subkategori (path bergantung slug pilar) memakai `src/hooks/redirectSubkategori.ts`, termasuk saat pilar berganti slug. Jenis halaman tingkat atas baru ditambahkan di `muatJalur`, bukan sebagai rute bersaudara. `/cari` satu-satunya halaman dinamis (membaca `searchParams`, noindex); hasilnya di-cache per kueri.
  +- Beranda dirender dari global `beranda` lewat `susunBeranda()`: urutan blok dari editor, tanpa data palsu (blok "Paling dibaca" menampilkan artikel dengan klik Google 7 hari terbanyak bila datanya cukup untuk semua tempat, selain itu tulisan terbaru dengan judul "Tulisan terbaru", aturan `daftarPopuler` yang juga dipakai halaman 404; newsletter hanya tautan ke form penyedia, slot iklan belum dirender).
   - Kalkulator: semua rumus di `src/modules/hitung` sebagai fungsi murni. `hitung(toolId, masukan, tanggal, parameter, teks)` satu-satunya titik masuk perhitungan (dipakai sama di server dan browser), `siapkanKalkulator` untuk halaman, `periksaParameter` untuk validasi koleksi `parameter-tools`. Rumus per tool di file sendiri (`gaji-bersih.ts`, `thr.ts`, ...). Angka aturan (tarif, PTKP, batas iuran, kategori, konversi) tidak pernah ditulis sebagai konstanta di kode: definisikan kuncinya di `parameter` rumusnya, isi nilainya lewat `src/seed/parameter-tools.ts` dengan sumber resmi dan tanggal berlaku, dan uji dengan contoh perhitungan dari sumber resmi. Parameter yang tidak berlaku untuk tanggal hitung memakai parameter terakhir yang valid dengan peringatan.
   - Halaman `/tools/{slug}` ISR: hasil contoh untuk isi form awal dirender server (tampil tanpa JavaScript), `Kalkulator` (klien) menghitung di browser. Label dan bantuan isian dari CMS (`bantuanInput`) diteruskan ke `hitung` lewat `teks`, jadi pesan galat memakai label yang sama dengan form. Angka hasil baru memakai animasi CSS, tanpa GSAP.
   - Komponen UI publik di `src/components/`, server component kecuali benar-benar butuh browser (`'use client'` seperti `Catat404`, `PemicuMasuk`, `Kalkulator`, dan `TautanAktif`). Gaya di CSS Module di sebelah komponen dan memakai token semantik dari `src/styles/tokens.css` (`--teks`, `--latar`, `--permukaan`, `--latar-terbalik`, `--teks-terbalik`, `--pilar`, `--ruang-*`, `--durasi-*`), bukan hex atau token primitif. Animasi hanya `transform` dan `opacity`, dan semuanya mati di `prefers-reduced-motion: reduce`. Reveal judul beranda memakai animasi CSS, tanpa JavaScript.
  @@ -46,7 +47,7 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Tautan internal lewat komponen `Tautan` (`next/link` untuk path situs). Warna pilar lewat atribut `data-warna` (nilai field `warna` pilar) dan selalu bersama nama pilarnya. Ikon lewat `Ikon` (path Lucide yang disalin, tanpa paket ikon).
   - Copy UI: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru. Angka lewat `Intl.NumberFormat('id-ID')` (`teksAngka` modul hitung); rupiah dari `Intl` memakai spasi tak putus setelah "Rp", jadi di kode dan tes tulis `\u00a0`, jangan karakter aslinya.
   - Tes unit di `tests/unit/*.test.ts`, tes integrasi di `tests/int/*.int.spec.ts` dan memakai `getTestPayload()` + `unik()` dari `tests/int/helpers.ts`.
  -- Tes E2E di `tests/e2e/*.spec.ts` memakai `cegatCloudinary()` (gambar tanpa jaringan) dan `periksaAxe()` (WCAG 2.2 AA) dari `tests/e2e/bantu.ts`; data contohnya di `tests/e2e/siapkan.ts`. Anggaran JavaScript (total di bawah 160 KiB per halaman, spesifikasi §12) dijaga `motion.spec.ts` untuk setiap jenis halaman; jenis halaman baru ditambahkan ke daftarnya. JS kalkulator di atas JS artikel dijaga di bawah 25 KB. Kalkulator diuji di `kalkulator.spec.ts` (enam tools dari `TOOLS_CONTOH` di tiga ukuran layar) dan `hitung.spec.ts` (contoh resmi DJP lewat form).
  +- Tes E2E di `tests/e2e/*.spec.ts` memakai `cegatCloudinary()` (gambar tanpa jaringan) dan `periksaAxe()` (WCAG 2.2 AA) dari `tests/e2e/bantu.ts`; data contohnya di `tests/e2e/siapkan.ts` (termasuk klik Google contoh `KLIK_CONTOH` dan total harian `HARI_CONTOH` untuk "Paling dibaca" dan dashboard SEO). Anggaran JavaScript (total di bawah 160 KiB per halaman, spesifikasi §12) dijaga `motion.spec.ts` untuk setiap jenis halaman; jenis halaman baru ditambahkan ke daftarnya. JS kalkulator di atas JS artikel dijaga di bawah 25 KB. Kalkulator diuji di `kalkulator.spec.ts` (enam tools dari `TOOLS_CONTOH` di tiga ukuran layar) dan `hitung.spec.ts` (contoh resmi DJP lewat form).
   
   ## Batasan
   - Jangan commit `.env`. `.env.test` boleh di-commit karena hanya untuk database tes lokal dan tidak boleh berisi `CLOUDINARY_*`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `CRON_SECRET`, atau `INDEXER_ADAPTER=asli`. Kredensial Google hanya di env server Vercel, tidak pernah di CMS, log, atau tes.
  ```

  ```diff
  diff --git a/docs/superpowers/specs/2026-11-03-point-lat-design.md b/docs/superpowers/specs/2026-11-03-point-lat-design.md
  index 951613e..fa28992 100644
  --- a/docs/superpowers/specs/2026-11-03-point-lat-design.md
  +++ b/docs/superpowers/specs/2026-11-03-point-lat-design.md
  @@ -106,7 +106,7 @@ Archivo (variable, sumbu `wdth` 62-125 dan `wght` 400-900), di-host sendiri dan
   ### Pola tata letak
   
   - Header: logo `point.` + pill rubrik dengan titik warna pilar + tombol Tools hitam.
  -- Homepage: judul raksasa "INTINYA DULU.", kalimat pembuka, pencarian besar; mozaik kartu ukuran beragam (bukan grid kartu seragam); strip video 9:16 gelap; "Paling dibaca pekan ini" (sampai data kunjungan ada di Rencana 6, blok ini menampilkan tulisan terbaru dengan judul "Tulisan terbaru", keputusan pemilik 2026-11-05); slot iklan; newsletter; footer.
  +- Homepage: judul raksasa "INTINYA DULU.", kalimat pembuka, pencarian besar; mozaik kartu ukuran beragam (bukan grid kartu seragam); strip video 9:16 gelap; "Paling dibaca pekan ini" (artikel dengan klik Google terbanyak 7 hari terakhir dari sinkron Search Analytics harian; selama datanya belum cukup untuk semua tempat, blok ini menampilkan tulisan terbaru dengan judul "Tulisan terbaru", keputusan pemilik 2026-11-05); slot iklan; newsletter; footer.
   - Halaman artikel: kicker pilar, H1, deck, byline + diperbarui + waktu baca, kotak Intinya (latar warna pilar versi lembut atau sand, label "Intinya"), daftar isi, isi, blok sumber, FAQ, artikel terkait, profil penulis.
   - Halaman tools: kalkulator di atas lipatan, hasil besar, lalu artikel penjelasan rumus.
   - Radius 14px (kontrol), 24px (kartu). Target sentuh minimal 44px. Spasi kelipatan 4px.
  @@ -141,6 +141,7 @@ Vercel Cron ──► /api/jobs/run setiap 10 menit (header rahasia)
   | Modul | Antarmuka | Di dalamnya | Adapter |
   |---|---|---|---|
   | `indexer` | `kabari(payload, kabar[])` dengan jenis `terbit` / `ubah-besar` / `pindah` / `hapus` (dipanggil hook koleksi); `jalankanIndexer(payload)` (cron dan `after()`) | antrean job di Postgres, dedup per URL dan langkah, jendela kirim sitemap dan IndexNow, retry 1/5/30 menit, kuota harian Google, cek status bertahap, klaim atomik, log | `searchConsole`, `indexNow`, `googleIndexing` (opsional), `palsu` untuk tes dan pratinjau (dipilih `INDEXER_ADAPTER`) |
  +| `pantau` | `jalankanPantau(payload)` (cron: tugas harian dan cek tautan luar); `ambilDashboard(payload)` (dashboard SEO admin) | sinkron Search Analytics harian (total harian, ringkasan 28 dan 7 hari per halaman), retensi log, pindai tautan (internal rusak, alamat lama, halaman yatim), cek tautan luar mingguan, klaim tugas atomik | Search Analytics (akun layanan yang sama dengan `indexer`), pemeriksa tautan HTTP, `palsu` untuk tes (dipilih `INDEXER_ADAPTER`) |
   | `seo` | `metadata(doc)`, `jsonLd(doc)`, `analisis(doc) → daftar cek` | aturan judul/meta, canonical, robots, schema per tipe, skor checklist | (tidak ada seam, fungsi murni) |
   | `hitung` | `hitung(toolId, input, tanggal) → hasil + rincian` | rumus per tool, pemilihan parameter sesuai tanggal berlaku | (fungsi murni, parameter dari CMS) |
   | `media` | `unggah(file) → {publicId, meta}`, `url(publicId, preset)` | tanda tangan upload, preset transformasi, OG image | `cloudinary` (adapter `@payloadcms/plugin-cloud-storage`), `palsu` untuk tes |
  @@ -185,6 +186,11 @@ point-lat/
   | `antreanIndexing` | langkah, path, jenis, jadwal, percobaan, tahap cek status (satu baris per langkah dan path, dihapus setelah selesai; hanya ditulis modul `indexer`) |
   | `logIndexing` | URL, jenis, langkah, adapter, status (Berhasil / Gagal, dicoba lagi / Gagal / Dilewati / Ditunda), status HTTP, pesan, percobaan ke, waktu; hanya admin yang membaca |
   | `statusIndeks` | path, status (Terindeks / Ditemukan, belum dirayapi / Dirayapi, belum diindeks / Belum dikenal Google / Dikecualikan Google / Error / Belum dicek), cek berikutnya, cek terakhir, dirayapi Google, tautan laporan Search Console, detail; tampil juga sebagai kolom di daftar artikel |
  +| `analitikHalaman` | path, klik/impresi/CTR/posisi 28 hari, klik dan impresi 7 hari, tanggal data terakhir (diganti setiap sinkron; dibaca dashboard dan blok "Paling dibaca") |
  +| `analitikSitus` | tanggal (waktu Pasifik), klik, impresi, CTR, posisi seluruh properti per hari (disimpan 16 bulan) |
  +| `tugasSeo` | jenis tugas harian (`analitik`, `tautan`), status, mulai, selesai, berikutnya, pesan |
  +| `temuanTautan` | jenis (tautan internal rusak / alamat lama / halaman yatim), tujuan, pesan, dokumen sumber (diganti setiap pindai) |
  +| `tautanLuar` | URL situs lain di konten terbit, status (belum dicek / bisa dibuka / rusak / perlu dicek manual), kode HTTP, pesan, dicek pada, cek berikutnya, dokumen sumber |
   | `logAI` | pengguna, tugas, dokumen, token, biaya perkiraan, waktu |
   | `pengguna` | email, nama, peran (`admin`, `editor`; MVP hanya admin) |
   
  @@ -217,7 +223,7 @@ Validasi: kotak Intinya wajib sebelum terbit; alt gambar wajib; gambar utama ≥
   | `/tentang`, `/kebijakan-redaksi`, `/pedoman-media-siber`, `/pasang-iklan`, `/kontak` | halaman statis |
   | `/sitemap.xml`, `/sitemap/{jenis}.xml`, `/news-sitemap.xml`, `/robots.txt`, `/feed.xml`, `/ads.txt`, `/{indexnow-key}.txt` | teknis |
   
  -Slug pilar, subkategori, dan halaman tidak boleh bentrok dengan slug artikel (divalidasi di CMS). Mengganti slug membuat redirect 301 otomatis.
  +Slug pilar, subkategori, dan halaman tidak boleh bentrok dengan slug artikel (divalidasi di CMS). Mengganti slug membuat redirect 301 otomatis, termasuk `/{pilar}/{subkategori}` saat slug subkategori berganti, subkategori pindah pilar, atau slug pilar berganti.
   
   ## 8. SEO
   
  @@ -239,8 +245,9 @@ Slug pilar, subkategori, dan halaman tidak boleh bentrok dengan slug artikel (di
   - RSS `/feed.xml`.
   - Breadcrumb tampil dan sebagai schema.
   - JSON-LD: `Article`/`NewsArticle` (explainer), `BreadcrumbList`, `Organization` (+ logo), `Person` (penulis), `VideoObject`, `WebSite`, `WebApplication` untuk tools. FAQ tetap ditulis sebagai isi; rich result FAQ (dihapus Google Mei 2026) dan HowTo (dihapus 2023) tidak diandalkan.
  -- Halaman yatim (tanpa link masuk) dilaporkan di dashboard.
  -- Pengecek link rusak mingguan, log 404 dengan tombol "buat redirect".
  +- Halaman yatim (tanpa link masuk) dilaporkan di dashboard: artikel dan halaman terbit (tidak noindex) tanpa tautan dari isi dokumen terbit lain, relasi pilihan editor (artikel terkait, tools, video), menu header dan footer, atau pilihan beranda. Daftar otomatis (rubrik, tulisan terbaru, artikel terkait otomatis, sitemap) tidak dihitung karena isinya berganti. Dihitung pindai harian di cron.
  +- Pengecek link rusak: tautan internal dicocokkan dengan database setiap hari (dokumen terbit, halaman indeks, redirect; tautan ke alamat lama yang dialihkan ikut dilaporkan); tautan ke situs lain dicek seminggu sekali (HEAD, GET bila HEAD ditolak, batas 10 detik, paling banyak 10 URL per jalan cron). 404 dan 410 atau domain hilang berarti rusak; kode lain dan batas waktu "perlu dicek manual".
  +- Log 404 dengan tombol "buat redirect" (form redirect dengan path terisi).
   
   ### Mesin Indexing
   
  @@ -263,7 +270,7 @@ Prasyarat: properti domain `point.lat` di Search Console; akun layanan Google Cl
   
   ### Dashboard SEO (di admin)
   
  -Klik, impresi, CTR, posisi per URL (Search Analytics API, disinkron harian); ringkasan status indeks; log indexing terbaru; halaman yatim; link rusak; 404 teratas. Fase 2: daftar "perlu diperbarui" berdasarkan penurunan klik.
  +View admin `/admin/seo` dengan tautan di atas menu, hanya untuk admin: klik, impresi, CTR, dan posisi 28 hari (kartu angka dan grafik klik harian dengan tabel angkanya), halaman teratas per URL (Search Analytics API `searchanalytics.query`, data final, disinkron sekali sehari; data Google baru final 2 sampai 3 hari kemudian); ringkasan status indeks; log indexing terbaru dan jumlah langkah gagal 7 hari; tautan rusak; halaman yatim; 404 teratas dengan tombol "buat redirect"; status setiap tugas harian. Tanpa data (akun layanan belum diatur, adapter palsu, domain baru) dan saat sinkron gagal, setiap bagian menjelaskan sebabnya. Fase 2: daftar "perlu diperbarui" berdasarkan penurunan klik.
   
   ## 9. Media: Cloudinary
   
  ```

- [ ] **Langkah 2: Pemeriksaan lengkap**

  Jalankan:

  ```bash
  pnpm generate:types && git diff --stat src/payload-types.ts
  pnpm generate:importmap && git diff --stat "src/app/(payload)/admin/importMap.js"
  pnpm typecheck
  pnpm lint
  pnpm test:unit
  pnpm test:int
  pnpm test:e2e
  pnpm test:e2e
  pnpm seed
  pnpm build
  git status --short
  ```

  Hasil yang diharapkan: `payload-types.ts` dan import map tidak berubah; type check dan lint bersih; unit `Test Files 61 passed (61)`, `Tests 417 passed (417)`; integrasi `Test Files 36 passed (36)`, `Tests 117 passed (117)`; E2E `98 passed` dua kali berturut-turut (run kedua memakai database E2E yang sama tanpa dibuang: `siapkan.ts` membersihkan koleksi pantau dan mengisi ulang data contoh); build mencantumkan rute yang sama dengan sebelumnya (`○ /`, `● /[...jalur]`, `ƒ /admin/[[...segments]]`, `ƒ /api/[...slug]`, dan seterusnya; view `/admin/seo` dilayani rute admin); `git status` hanya menunjukkan dua file langkah 1 (buang blok "nextjs-agent-rules" bila build menambahkannya, lihat Global Constraints).

- [ ] **Langkah 3: Uji visual di tiga ukuran layar**

  Bangun dan jalankan build dengan database E2E, yang sudah berisi konten contoh, klik contoh, total harian, dan hasil pindai dari `pnpm test:e2e` di langkah 2 (`set -a` memuat `PAYLOAD_SECRET` dari `.env.test`; nama database diambil dari `DATABASE_URL` tes tanpa query lalu ditambah `_e2e`, sama dengan `playwright.config.ts`):

  ```bash
  set -a && . ./.env.test && set +a
  DATABASE_URL="${DATABASE_URL%%\?*}_e2e" CLOUDINARY_CLOUD_NAME=e2e CLOUDINARY_API_KEY=e2e CLOUDINARY_API_SECRET=e2e INDEXER_ADAPTER=palsu NEXT_PUBLIC_SITE_URL=http://localhost:3200 pnpm build
  (DATABASE_URL="${DATABASE_URL%%\?*}_e2e" CLOUDINARY_CLOUD_NAME=e2e CLOUDINARY_API_KEY=e2e CLOUDINARY_API_SECRET=e2e INDEXER_ADAPTER=palsu NEXT_PUBLIC_SITE_URL=http://localhost:3200 PORT=3200 pnpm start > /tmp/point-lat-start.log 2>&1 &)
  timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'
  ```

  Masuk ke `http://localhost:3200/admin` dengan akun E2E (`ADMIN_E2E` di `tests/e2e/data.ts`), buka menu (Open Menu), klik "Dashboard SEO", lalu periksa di 375, 768, dan 1440 px (DevTools), tema terang dan gelap (menu akun, Theme): kartu angka sejajar (empat kolom di 1440 px, dua di 375 px), grafik kolom dengan label sumbu terbaca dan kolom tidak lebih dari 24 px, "Lihat angka per hari" membuka tabel, tabel halaman teratas dan 404 teratas bergulir di dalam kotaknya di 375 px, URL panjang terbungkus, tautan sumber di "Tautan rusak" dan "Halaman yatim" membuka dokumen yang benar, "Buat redirect" membuka form dengan path terisi, dan tanpa geser horizontal halaman. Lalu periksa beranda dan `/halaman-yang-tidak-ada`: blok "Paling dibaca pekan ini" berisi empat dan tiga artikel dengan urutan klik. Hentikan server dengan `fuser -k 3200/tcp`, lalu jalankan `pnpm build` lagi dengan env biasa.

- [ ] **Langkah 4: Commit**

  ```bash
  git add CLAUDE.md docs/superpowers/specs/2026-11-03-point-lat-design.md
  git commit -m "docs: Pantau SEO, dashboard SEO, Paling dibaca, dan redirect subkategori di CLAUDE.md dan spesifikasi"
  ```

---

## Selesai bila

- `pnpm test` lulus (417 tes unit di 61 file dan 117 tes integrasi di 36 file), `pnpm test:e2e` lulus (98 tes E2E) dua kali berturut-turut tanpa membuang database E2E, `pnpm typecheck` dan `pnpm lint` bersih, `pnpm build` berhasil, semuanya tanpa jaringan dan tanpa kredensial Google.
- Cron `GET /api/jobs/run` menjalankan sinkron Search Analytics sekali sehari (klaim atomik; cron dobel tidak menjalankan dua kali): total harian dan ringkasan 28 dan 7 hari per halaman sampai tanggal data final terakhir, dalam satu transaksi; dilewati atau gagal tidak menyentuh data lama, gagal dicoba lagi sejam kemudian, kuota habis besok; log indexing lebih dari 90 hari dan total harian lebih dari 480 hari dihapus.
- Beranda dan halaman 404 menampilkan "Paling dibaca pekan ini" dari klik Google 7 hari bila datanya cukup untuk semua tempat, selain itu "Tulisan terbaru"; tetap ISR (tag `analitik`) dan JavaScript halaman publik tidak bertambah.
- Pindai harian melaporkan tautan internal rusak, tautan ke alamat lama, dan halaman yatim dengan dokumen sumbernya; tautan ke situs lain dicek seminggu sekali, paling banyak 10 per jalan cron.
- Dashboard `/admin/seo` (hanya admin, tautan di atas menu) menampilkan performa Google (kartu angka, grafik klik harian dengan tabelnya, halaman teratas), status indeks, log indexing terbaru dan langkah gagal 7 hari, tautan rusak, halaman yatim, 404 teratas dengan "Buat redirect", dan status setiap tugas; keadaan kosong dan galat menjelaskan sebabnya; lolos axe dan tanpa geser horizontal di 375, 768, dan 1440 px.
- "Buat redirect" (Log 404 dan dashboard) membuka form redirect dengan path terisi. Mengganti slug subkategori, memindahkan subkategori ke pilar lain, atau mengganti slug pilar membuat redirect 301 untuk `/{pilar}/{subkategori}`.
- Skema hanya bertambah (lima tabel baru); tanpa dependensi baru.

## Setup dari pemilik (setelah Rencana 6A terpasang)

Tidak ada env baru: Search Analytics memakai akun layanan, `INDEXER_ADAPTER`, dan cron yang sudah disiapkan untuk Mesin Indexing.

- [ ] **Izin akun layanan:** Search Analytics butuh akses baca properti; akun layanan yang sudah menjadi **Owner** properti `sc-domain:point.lat` (Setup Rencana 6A) sudah cukup. Search Console API sudah aktif di proyek Google Cloud yang sama.
- [ ] **Setelah deploy:** buka Admin, Dashboard SEO. Dalam satu jalan cron (paling lama 10 menit) baris "Sinkron Search Console" dan "Pindai tautan" berstatus berhasil. Bila sinkron gagal dengan 403, periksa izin Owner; bila berhasil tanpa data, itu wajar untuk domain baru (data Google muncul beberapa hari setelah halaman pertama terindeks dan baru final 2 sampai 3 hari kemudian).
- [ ] **Tautan footer ke halaman draf:** footer bawaan seed menautkan halaman statis yang masih draf (misalnya `/kontak`, `/pasang-iklan`, `/pedoman-media-siber`, `/kebijakan-privasi`). Dashboard melaporkannya sebagai tautan rusak sampai halaman itu diterbitkan atau tautannya diubah di global Footer; ini temuan sungguhan, bukan galat.

## Cakupan yang ditunda (dengan alasan)

| Butir | Ditunda ke | Alasan |
|---|---|---|
| Paginasi berbasis path untuk rubrik, subkategori, penulis, indeks video, dan hasil cari | Rencana 8 (sebelum rilis), atau lebih awal bila satu rubrik melewati 24 tulisan | Butuh dua task sendiri (lima jenis halaman, rute, canonical, sitemap, E2E) dan belum dibutuhkan: 60 sampai 90 hari pertama dua pilar dengan satu penulis, dan semua artikel tetap terjangkau lewat subkategori, sitemap, RSS, dan pencarian. Bentuk yang disarankan dari probe rute: halaman 2 dan seterusnya di segmen tambahan yang tidak dipakai rute lain, `/{pilar}/halaman/{n}` dan `/{pilar}/{subkategori}/halaman/{n}` (tiga dan empat segmen di `[...jalur]`, yang kini hanya memakai satu dan dua), `/penulis/{slug}/halaman/{n}` dan `/video/halaman/{n}` (rute bersaudara baru); halaman 1 tetap tanpa akhiran dan `/…/halaman/1` dialihkan ke sana; slug `halaman` dicadangkan di validasi slug subkategori dan video; canonical setiap halaman menunjuk dirinya sendiri, tanpa `rel` prev/next; sitemap hanya halaman 1; `/cari` tetap dinamis dan noindex, jadi cukup `?halaman=`. |
| Tombol "Cek sekarang" status indeks per URL | Rencana 8 | Butuh aksi POST dari admin (endpoint dengan perlindungan CSRF dan pembatas kuota inspeksi harian) untuk memasukkan baris `cek-status` berjadwal sekarang. Cek otomatis +6 jam sampai +30 hari (Rencana 6A) sudah memenuhi kriteria sukses 2. |
| "Pindai ulang sekarang" dari dashboard | Rencana 8, bersama "Cek sekarang" | Aksi POST yang sama; pindai harian cukup untuk MVP. |
| Rate limit endpoint beacon `POST /api/log-404/catat` | Rencana 8 (Vercel Firewall) | Rate limit yang bermakna di serverless butuh penyimpanan bersama; Rencana 4A sudah mencatatnya untuk Vercel Firewall. Kiriman tetap dirapikan dan dibatasi panjangnya, satu baris per path. |
| Riwayat klik harian per halaman dan daftar "perlu diperbarui" (klik menurun) | Fase 2 (spesifikasi §17) | Rencana ini menyimpan ringkasan 28 dan 7 hari per halaman dari Google dan total harian properti 16 bulan; penurunan per halaman butuh baris per halaman per hari. |
| Filter rentang tanggal dan perbandingan periode di dashboard | Fase 2 (dashboard analitik lanjutan) | Spesifikasi §17. Total harian sudah tersimpan 16 bulan, jadi perbandingan periode cukup menambah tampilan. |
| Uji langsung dengan kredensial pemilik: `searchanalytics.query` dijawab 200 dengan baris nyata, 403 tanpa izin Owner, dan pemeriksa tautan ke beberapa situs sumber resmi | Rencana 8, bersama uji langsung Rencana 6A | Workspace tidak bisa menghubungi Google dan situs lain; tes memakai `fetch` tiruan dengan bentuk dari dokumentasi resmi. |
| Halaman yatim untuk tools, video, dan penulis | belum direncanakan | Ketiganya selalu tertaut dari halaman indeksnya (`/tools`, `/video`) atau byline artikel; spesifikasi menyebut artikel dan halaman. |
| Retensi log 404 | belum direncanakan | Satu baris per path, jadi tumbuh pelan; editor bisa menghapus baris di daftar Log 404. |

## Risiko dan pertanyaan terbuka

| Risiko | Mitigasi |
|---|---|
| "Paling dibaca" sebenarnya "paling banyak diklik dari Google" dan terlambat 2 sampai 3 hari; pembaca dari WhatsApp, newsletter, dan langsung tidak terhitung. | Spesifikasi §8 memilih Search Analytics sebagai sumber data per URL; blok hanya tampil bila datanya cukup untuk semua tempat. **Pertanyaan untuk pemilik:** tetap "Paling dibaca pekan ini", atau "Paling dicari pekan ini" supaya lebih tepat? Mengganti judul cukup lewat isian blok di CMS. |
| Total kartu angka (dimensi `date`, agregasi properti) tidak sama dengan jumlah baris tabel halaman (dimensi `page`, agregasi per halaman dan sebagian kueri anonim dibuang Google). | Dokumentasi Google menjelaskan perbedaan agregasi itu. Tabel menyebut "Menampilkan N dari M halaman yang muncul di Google" dan kartu angka berasal dari total properti, sama dengan laporan Search Console. |
| Pindai membaca semua dokumen terbit sekali sehari (paling banyak 10.000 per koleksi). Dengan ribuan artikel panjang, satu jalan cron makin lama. | Ukuran MVP puluhan sampai ratusan dokumen; satu jalan probe dengan ribuan artikel tes selesai dalam beberapa detik. Rencana 8 mengukur durasi cron nyata (bersama Mesin Indexing) dan menambah `maxDuration` atau memecah pindai bila perlu. |
| Sebagian situs menolak pemeriksa otomatis (403, 429) atau lambat, sehingga daftar "perlu dicek manual" bisa ramai. | HEAD lalu GET, agen yang jelas, batas 10 detik; hanya 404, 410, dan domain hilang yang disebut rusak; hasil tidak pasti dicek ulang besok. |
| Koleksi Pantau SEO disembunyikan dari menu (`admin.hidden`), jadi daftar lengkap (lebih dari 20 halaman teratas atau 50 temuan) hanya lewat dashboard. | Cukup untuk ukuran MVP. **Pertanyaan:** perlu halaman daftar lengkap yang bisa diurutkan dan difilter? Cukup menghapus `hidden` di koleksinya. |
| Di layar 1440 px ke bawah Payload menutup menu admin setelah halaman dimuat (di atasnya menu tampil tetap sebagai sidebar), jadi di laptop "Dashboard SEO" baru terlihat setelah tombol menu dibuka. | Tautan ada di paling atas menu. **Pertanyaan:** perlu kartu "Dashboard SEO" juga di halaman awal admin (`beforeDashboard`)? |
| Tanggal data Search Console adalah tanggal waktu Pasifik, sedangkan waktu sinkron tampil di WIB. | Dashboard menulis "28 hari sampai {tanggal}" dan menjelaskan keterlambatan data; waktu tugas diberi akhiran WIB. |

## Temuan review sebelum eksekusi

| Temuan | Tindakan |
|---|---|
| Probe Task 3: klaim tugas lewat `payload.find` lalu `payload.update` membuat tes "dua pelari bersamaan" gagal 3 dari 3 kali (sinkron berjalan dua kali). | Sudah masuk Task 3: `INSERT ... ON CONFLICT DO NOTHING` lalu satu `UPDATE ... RETURNING`; tes lulus setiap kali. |
| Riset: `searchanalytics.query` tanpa `rows` saat tidak ada data, hari tanpa data tidak dikirim untuk dimensi `date`, dan data biasanya final 2 sampai 3 hari kemudian. | Sudah masuk Task 1 dan 3: `rows` kosong menjadi daftar kosong, seri harian mengisi hari kosong dengan 0, dan akhir ringkasan diambil dari tanggal terakhir yang berisi. |
| Adapter palsu yang menjawab "berhasil tanpa baris" akan membuat cron E2E dan dev mengosongkan data contoh. | Sudah masuk Task 2: palsu melewati sinkron bila `dataAnalitik` kosong; data E2E juga mencatat tugas analitik berhasil yang jatuh tempo besok (Task 8). |
| Payload 3.92 tidak memberi template dan tidak memeriksa akses untuk view kustom satu segmen. | Sudah masuk Task 8: `DefaultTemplate` dan pemeriksaan pengguna di `DashboardSeo`; E2E memastikan tanpa login diarahkan ke halaman masuk. |
| Uji visual Task 8: grafik SVG berskala membuat teks sumbu sekitar 5 px di 375 px; kisi `minmax(26rem)` meninggalkan kolom kosong di 1440 px; pesan galat Google berisi URL panjang membuat halaman bergeser horizontal (lebar isi 388 px di layar 375 px); tautan menu menempel ke grup pertama. | Sudah masuk Task 8: grafik HTML dan CSS (teks sumbu 12 px), kisi `minmax(30rem)` (dua kolom di 1440 px, satu di 768 dan 375 px), `overflow-wrap: anywhere` di dashboard, dan `nav.scss`. Tangkapan setelah perbaikan: tanpa geser di 375, 768, dan 1440 px, tema terang dan gelap; axe tanpa pelanggaran di dashboard dan di halaman admin penuh. |
| Uji visual Task 8 dengan data E2E: pindai melaporkan empat tautan footer ke halaman seed yang masih draf, dan empat halaman yatim (tiga istilah glosarium dan satu artikel). | Perilaku yang benar (definisi halaman yatim dan tautan rusak di Keputusan teknis); dicatat di Setup dari pemilik. |
| Verifikasi Task 8 dan 9: tes E2E dashboard gagal dengan `locator.click: Test timeout of 30000ms exceeded` pada tautan "Dashboard SEO" (`<h2 class="collections__label">Pengaturan</h2> ... intercepts pointer events`). Dilacak dengan Playwright terhadap server produksi: server merender menu admin terbuka, lalu saat hidrasi Payload menutupnya di layar 1440 px ke bawah (`NavProvider`, breakpoint `l`), sedangkan tes membaca keadaan menu sebelum hidrasi. Perbaikan pertama (menunggu tombol menu terlihat) tidak mengubah apa pun. | Sudah masuk Task 8: tes menunggu kelas `nav--nav-hydrated`, membuka menu bila belum berkelas `nav--nav-open`, dan memastikan menu terbuka sebelum mengeklik tautan. Dicoba 6 kali di 1280 px (menu dibuka) dan 6 kali di 1600 px (menu sudah terbuka), lalu verifikasi Task 8 sampai 10 diulang penuh. |
| Probe Task 9: tes update massal dua subkategori pindah pilar dijalankan tiga kali dengan dan tanpa giliran per `req`. | Lulus setiap kali; tanpa giliran (setiap dokumen hanya menulis redirect untuk path miliknya). |
| Alat penulis probe mengubah teks escape `\u00a0` menjadi spasi tak putus asli di satu komentar dan dua tes. | Diganti teks escape sebelum commit (CLAUDE.md: tulis `\u00a0`); pemindaian karakter (em dash, en dash, spasi tak putus) atas rencana dan diff probe bersih. |
| Verifikasi penuh per commit di salinan terpisah (database tes dibuat ulang per commit): type check, lint, unit, integrasi, dan E2E; Task 10 menjalankan E2E dua kali berturut-turut tanpa membuang database E2E. | Semua hijau (E2E task 6 lulus saat diulang setelah satu kegagalan pola 404 warisan Rencana 4A, lihat Global Constraints). Jumlah tes per task di tabel "Jumlah tes yang diharapkan"; E2E kedua Task 10: `98 passed`. |
| JavaScript halaman publik diukur dengan cara `motion.spec.ts` (resource script, `encodedBodySize`) di build `7b4c1e8` dan build Task 10. | Sama di kedua build: 138,6 KiB untuk `/`, `/halaman-yang-tidak-ada`, artikel `/cara-hitung-gaji-bersih`, dan rubrik `/uang-karier` (tiga kali ukur per halaman). "Paling dibaca pekan ini" dirender di server, jadi JavaScript publik tidak bertambah. |
| Blok kode rencana ini diterapkan ulang ke salinan bersih `master` (`7b4c1e8`), task demi task. | 10 dari 10 task identik: pohon setiap commit hasil penerapan sama dengan pohon commit probe (`git rev-parse <commit>^{tree}`), termasuk `payload-types.ts` dan import map yang dibuat ulang lewat `pnpm generate:types` dan `pnpm generate:importmap`. |
| Review independen screenshot akhir (setelah rencana ditulis): di dashboard 1440 px, `.pantau-kisi` membagi lebar menjadi tiga kolom (`minmax(min(100%, 30rem), 1fr)` dengan ukuran huruf dasar admin Payload yang lebih kecil dari 16 px), sehingga baris Status indeks + Log indexing dan baris Halaman yatim + 404 teratas menyisakan sepertiga kolom kosong. | Commit perbaikan terpisah setelah Task 10 (pola yang sama dengan perbaikan Rencana 4A dan 4B): lebar kolom minimal dinaikkan sampai 1440 px memberi dua kolom yang terisi penuh, dan tes E2E dashboard memeriksa tepi kanan kartu Log indexing sejajar dengan kartu Performa di 1440 px. Jumlah tes tidak berubah. |
| Review independen screenshot beranda: mozaik baris kedua dan strip video tampak kosong di screenshot halaman penuh. | Bukan galat: `PemicuMasuk` (Rencana 4A) menahan kartu di bawah layar dalam keadaan `data-masuk="tunggu"` sampai terlihat, dan screenshot halaman penuh tidak menggulir. Tidak ada perubahan. |
| Dashboard pada data probe melaporkan tautan footer `/kebijakan-privasi`, `/kontak`, `/pasang-iklan`, `/pedoman-media-siber` rusak. | Benar: halaman statis dari seed masih draf. Dicatat untuk pemilik: terbitkan halaman itu (Kebijakan Privasi wajib untuk iklan) sebelum peluncuran. |

## Sumber riset

Semua diakses 5 November 2026 lewat pembacaan web (bukan dari ingatan). Tanggal "diperbarui" adalah yang tertulis di halaman.

- Search Console API, Search Analytics: query (metode, `siteUrl`, `startDate`/`endDate` waktu Pasifik, `dimensions`, `type`, `dataState`, `rowLimit` 1 sampai 25.000, `startRow`, `rows[].keys/clicks/impressions/ctr/position`, urutan baris, scope `webmasters` atau `webmasters.readonly`; diperbarui 11 Agustus 2026): https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- Search Console API, Usage Limits (Search Analytics 1.200 QPM per properti dan per pengguna, 30.000.000 QPD per proyek, load quota 10 menit dan harian, kueri mahal: dimensi `page`/`query` dan rentang panjang; diperbarui 28 Agustus 2025): https://developers.google.com/webmaster-tools/limits
- Search Console API, Getting all your data (satu kueri per hari, `startRow` + 25.000 sampai 0 baris, "Data is typically available after 2-3 days", paling banyak 50.000 baris per hari per jenis; diperbarui 28 Agustus 2025): https://developers.google.com/webmaster-tools/v1/how-tos/all-your-data
- Payload 3.92.1 (kode terpasang): `@payloadcms/next/dist/views/Root/index.js` dan `getRouteData.js` (view kustom tanpa template, `isCustomAdminView`), `@payloadcms/next/dist/elements/Nav/index.js` (`beforeNavLinks` menerima `user`), `@payloadcms/next/dist/templates/Default` (`DefaultTemplate`), `payload/dist/fields/getDefaultValue.js` (`defaultValue({ req })`), `payload/dist/collections/config/types.d.ts` (`admin.hidden` menyembunyikan menu dan rute), `payload/dist/database/types.d.ts` (`upsert`, `deleteMany`, transaksi), `@payloadcms/ui/dist/scss/colors.scss` (variabel tema).
- Next.js 16.3.3 (dokumentasi terpasang di `node_modules/next/dist/docs/`): `unstable_cache`, `revalidateTag`.
- Skill dataviz (validator palet): `--color-blue-500` (`#1587BA`) di permukaan `#ffffff` dan `--color-blue-450` (`#1294CC`) di permukaan `#141414` lolos semua pemeriksaan; `--color-blue-400` gagal rentang terang di tema gelap.
- Probe workspace: branch `probe/rencana-6b` (satu commit per task; tree setiap task identik dengan blok kode rencana ini).

Rencana berikutnya: **Rencana 7 (Asisten AI)**.
