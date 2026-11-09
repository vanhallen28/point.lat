# Rencana 6A: Mesin Indexing point.lat (kabar ke mesin pencari, antrean, log, status indeks, dan cron)

> **Catatan revisi 9 November 2026 (v1.1.0, keputusan pemilik).** Rencana ini sudah selesai dieksekusi; teksnya disesuaikan supaya tidak bertentangan dengan keputusan terbaru:
> 1. Hosting **Vercel paket gratis (Hobby)**: cron Vercel sekali sehari, jadwal 10 menit opsional lewat Supabase Cron (runbook rilis H5), Pro hanya saat iklan dinyalakan.
> 2. **Full Next.js dengan perintah npm**: semua perintah `pnpm` diganti padanan npm (`npm run <skrip>`, `npm run <skrip> -- <argumen>`, `npx`, `npm install`, `npm ci`), `pnpm-lock.yaml` menjadi `package-lock.json`. Potongan `package.json` lama yang masih memuat pengaturan khusus pnpm (`onlyBuiltDependencies`) adalah catatan sejarah; versi sekarang memakai `allowScripts`.
> 3. **Setiap pembaruan dikirim sebagai zip + perintah terminal** (spesifikasi §21).
> 4. **Tanpa Docker, hanya Next.js, Vercel, dan Supabase**: `docker-compose.yml`, `Dockerfile`, dan `docker/` dihapus di v1.1.0. Langkah yang dulu membuat file itu dibiarkan sebagai sejarah. Tes memakai Postgres di mesin itu sendiri (Postgres bawaan runner GitHub di CI, Postgres sistem di sesi Claude); komputer pemilik memakai proyek Supabase pratinjau.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun Mesin Indexing (spesifikasi §8): setiap artikel, tools, video, halaman, dan pilar yang terbit, berubah besar, pindah alamat, batal terbit, atau dihapus dicatat di antrean Postgres, lalu dikirim ke Search Console (`sitemaps.submit`), IndexNow, dan (bila saklarnya dinyalakan) Google Indexing API, status indeksnya dicek dengan URL Inspection API pada +6 jam sampai +7 hari, dan setiap langkah tercatat di log; dijalankan Vercel Cron setiap 10 menit lewat `GET /api/jobs/run` dan langsung lewat `after()` saat terbit, dengan adapter palsu di tes dan dev, tanpa jaringan di tes, dan tanpa dependensi baru.

**Architecture:** `src/modules/indexer` adalah modul dalam dengan antarmuka kecil: `kabari(payload, kabar, { req })` (dipanggil hook koleksi) dan `jalankanIndexer(payload, { sekarang, adapter })` (dipanggil cron dan `after()`). Di dalamnya: aturan murni (`aturan.ts`: kabar dari dua versi publik, dedup antrean, jendela kirim, jeda ulang 1/5/30 menit, hari kuota Google, jadwal cek status, arti hasil inspeksi), penyimpanan di tiga koleksi Payload (`antrean.ts`), pelari antrean (`jalan.ts`), dan seam adapter (`adapter.ts`) dengan dua adapter: `asli.ts` (`fetch` + JWT RS256 akun layanan dari `node:crypto`) dan `palsu.ts` (dalam memori). Hook `kabariMesinPencari` membandingkan versi publik sebelum dan sesudah simpan (pola `req.context` yang sama dengan `redirectSaatPathBerubah` dan `revalidasiPublik`). Admin melihat log, antrean, status indeks, kolom status di daftar artikel, serta status pemasangan dan peringatan Indexing API di Pengaturan SEO.

**Tech Stack:** Next.js 16.3.3 (route handler, `rewrites`, `after()` dari `next/server`), Payload 3.92.1 (koleksi, hook, root endpoint, field `ui` dengan komponen server admin, Jobs Queue bawaan untuk `schedulePublish`), PostgreSQL 16/17 (satu `UPDATE ... RETURNING` lewat `sql` dari `@payloadcms/db-postgres` untuk klaim antrean), `node:crypto` (`createSign`, `timingSafeEqual`), `fetch` dan `AbortSignal.timeout`, `Intl.DateTimeFormat` zona `America/Los_Angeles`, Vitest 4, Playwright 1.63 + `@axe-core/playwright` 4.14, Vercel Cron, npm 11, Node 22.23.4+.

**Spesifikasi:** `docs/superpowers/specs/2026-11-03-point-lat-design.md` (§1 kriteria sukses 2; §2 Indexing dan Vercel Pro; §5 Arsitektur, Penjadwal, dan modul `indexer`; §6 `logIndexing`, `statusIndeks`, `pengaturanSEO`; §7 `/{indexnow-key}.txt`; §8 Mesin Indexing; §15 langkah indexing gagal dan kuota Google habis; §16 tes `indexer` dengan adapter palsu dan E2E "buat artikel, terbitkan, sitemap, news sitemap, log indexing"; §17 Cakupan; §18 Setup dari pemilik; §19 Risiko).

**Rencana sebelumnya:** `docs/superpowers/plans/2026-11-04-rencana-1-fondasi.md` sampai `docs/superpowers/plans/2026-11-05-rencana-5-tools.md` (sampai commit `6bc161a`). Rencana ini memakai `pathFor()` dan `TargetPath` (Rencana 1), `redirectSaatPathBerubah` dan pola `req.context` di `beforeChange` (Rencana 1 dan 3), hook `revalidasiPublik` dan `TAG` (Rencana 3; langkah 1 Mesin Indexing), sitemap index, news sitemap, `urlAbsolut`, `ambilEntriSitemap`, dan `respons()` (Rencana 3), koleksi `log-404` dan `redirect` (Rencana 4A), `sumberParameter` (Rencana 5). Baseline: 344 tes unit di 51 file, 78 tes integrasi di 27 file, 88 tes E2E.

**Rencana 6 dibagi dua.** Mesin Indexing dan dashboard SEO bersama-sama lebih dari 20 task yang sehat (setiap butir dashboard butuh adapter, job berkala, data, dan view admin sendiri). Rencana ini (6A) berisi inti yang didahulukan spesifikasi: pemicu, antrean, adapter, cron, log, status indeks, pengaturan dan setup pemilik. **Rencana 6B** (ditulis setelah 6A dieksekusi) berisi dashboard SEO: sinkron Search Analytics harian, klik, impresi, CTR, dan posisi per URL, ringkasan status indeks dan peringatan dari log, halaman yatim, link rusak mingguan, 404 teratas dengan tombol "buat redirect", "Paling dibaca pekan ini" dan artikel populer di 404, paginasi berbasis path, dan redirect otomatis slug subkategori. Rinciannya di "Cakupan yang ditunda".

## Dependensi baru (butuh persetujuan pemilik)

**Rencana ini tidak menambah dependensi.** Otorisasi akun layanan Google cukup JWT RS256 dari `node:crypto` ditambah satu POST ke `oauth2.googleapis.com/token` (dokumentasi resmi menjelaskan bentuknya), dan setiap API cukup satu `fetch`.

| Paket | Versi persis (registry npm, 5 November 2026) | Ukuran | Keputusan rencana ini |
|---|---|---|---|
| `googleapis` | 189.0.0 | 247 MB terurai (semua API Google) | **Tidak dipasang.** Hanya dua API Google yang dipakai (Search Console dan Indexing), masing-masing satu atau dua endpoint. |
| `google-auth-library` | 11.3.3 | 784 KB terurai, ditambah `gaxios`, `gcp-metadata`, `jws`, dan tiga paket lain | **Tidak dipasang.** `src/modules/indexer/google.ts` (sekitar 70 baris) membuat JWT dan menyimpan token per scope; diuji dengan kunci RSA sekali pakai dan `fetch` tiruan. Bila kelak pemilik ingin memakai pustaka resmi (misalnya untuk Workload Identity tanpa file kunci), cukup mengganti `penyediaToken` di `google.ts`; adapter lain tidak berubah. |
| `@googleapis/searchconsole` | 11.0.1 | 259 KB terurai, ditambah `googleapis-common` | **Tidak dipasang**, alasan sama. |

## Global Constraints

- Node `^22.23.4 || >=24.22.1`, npm 11. Versi dikunci: Next `16.3.3`, Payload `3.92.1`, `@playwright/test` `1.63.0`. **Tanpa dependensi baru** (lihat bagian sebelumnya).
- Nama domain berbahasa Indonesia seperti rencana sebelumnya (`kabari`, `jalankanIndexer`, `antrean-indexing`, `kunciIndexNow`, `kabariMesinPencari`). Nama teknis framework dan nama field API luar tetap seperti aslinya (`inspectionUrl`, `urlList`, `URL_UPDATED`).
- Copy admin dan pesan log: bahasa Indonesia, sapaan "kamu" bila menyapa, tanpa em dash dan en dash (juga di komentar), tanpa tanda seru. Pesan galat menyebut penyebab dan cara memperbaikinya ("Kunci IndexNow belum diisi di Pengaturan SEO.").
- **Tes tidak pernah memanggil jaringan.** Unit memakai `fetch` tiruan; integrasi dan E2E memakai adapter palsu (`adapterPalsu()` dan `pakaiAdapterIndexer()`, atau env `INDEXER_ADAPTER=palsu` di server E2E). Waktu di tes selalu lewat opsi `sekarang` (waktu tiruan), tidak pernah menunggu sungguhan.
- **Kredensial hanya di env server**: `GOOGLE_SERVICE_ACCOUNT_JSON`, `CRON_SECRET`, `INDEXER_ADAPTER`. Jangan pernah menuliskannya di kode, tes, log, atau CMS; panel admin hanya menyebut terpasang atau belum. Kunci IndexNow boleh di CMS (spesifikasi §6) karena memang publik di `/{kunci}.txt`.
- Path publik lewat `pathFor()` (`src/lib/paths.ts`), URL absolut lewat `urlAbsolut()` dari `src/modules/seo/dokumen`. Jangan merangkai URL manual.
- **Perubahan skema harus aditif.** Rencana ini menambah tiga koleksi (`antrean-indexing`, `log-indexing`, `status-indeks`) dan grup `indexing` di global `pengaturan-seo`, tanpa field `required` baru di tabel lama. Setelah mengubah field: `npm run generate:types`, lalu `npm run seed` sebelum `npm run build` (build membaca database dev). Bila Payload macet di "Pulling schema from database..." (pertanyaan DATA LOSS), jangan menjawab; reset database yang bersangkutan seperti Rencana 2 (`DROP DATABASE ... WITH (FORCE)` lalu `CREATE DATABASE`).
- `npm run build` membaca database dev (`pointlat` dari `.env`). Postgres harus jalan (`pg_ctlcluster 16 main start` bila mati).
- Tes unit dan integrasi memakai `.env.test` (database `pointlat_test`). E2E memakai database `pointlat_test_e2e` (dibuat dan diisi ulang `tests/e2e/siapkan.ts`), build produksi di port 3100, kredensial Cloudinary palsu `e2e`, dan (mulai Task 9) `INDEXER_ADAPTER=palsu`.
- E2E menjalankan `next build` sendiri sehingga isi `.next/` diganti build E2E. Setelah E2E, jalankan `npm run build` lagi sebelum `npm run start` biasa.
- Server manual memakai port 3200 dan dihentikan dengan `fuser -k 3200/tcp`, jangan `pkill -f` dengan pola luas. Menunggu server: `timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'`. Jangan meninggalkan proses latar belakang setelah task selesai.
- `next dev` dan `next build` di Next 16.3 bisa menambahkan blok "nextjs-agent-rules" ke `CLAUDE.md` bila mendeteksi agen AI. Periksa `git status` sebelum commit; buang blok itu dengan `git checkout CLAUDE.md` (Task 10 sengaja mengubah `CLAUDE.md`; di task itu buang blok itu saja).
- Jalankan `npm run typecheck` dan `npm run lint` di setiap task; keduanya harus bersih (lint tanpa error dan tanpa warning). Setiap task diakhiri unit, integrasi, dan E2E yang hijau.
- **Tulis `req.context` setelah `await`.** Operasi Payload yang menerima `req` (misalnya `findByID({ req })`) bisa mengganti objek `req.context`, jadi `req.context[k] = await ...` kehilangan nilainya. Simpan hasil ke variabel dulu, lalu tulis (ditemukan di probe Task 6).
- Tes integrasi berbagi database dan berjalan berurutan dengan urutan file yang tidak pasti. Tes Mesin Indexing yang menjalankan pelari antrean mengosongkan antrean, log, dan status indeks lebih dulu, lalu mengembalikan pengaturan SEO yang diubahnya.
- **Kegagalan E2E halaman 404 yang jarang (warisan Rencana 4A).** Tes yang membuka `/halaman-yang-tidak-ada` (`galat.spec.ts` "halaman 404 ... lolos axe" dan `motion.spec.ts` "kartu ke artikel memakai View Transitions") sesekali gagal dengan `locator resolved to <html id="__next_error__">` karena isi 404 tidak dirender di browser. Bila salah satu tes itu gagal dengan pesan tersebut, jalankan `npm run test:e2e` sekali lagi; bila gagal lagi, atau tes lain yang gagal, berhenti dan laporkan. Jangan menaikkan timeout atau melemahkan tesnya.

## Keputusan teknis (hasil riset dan probe, dipakai di semua task)

| Topik | Keputusan | Dasar |
|---|---|---|
| Pembagian | 6A Mesin Indexing (10 task), 6B dashboard SEO dan butir tunda frontend. | Batas rencana sehat sekitar 10 sampai 12 task; inti indexing didahulukan karena kriteria sukses 2 dan §16 bergantung padanya. |
| Antrean | Koleksi Payload `antrean-indexing` di Postgres, bukan Payload Jobs Queue. Satu baris per langkah dan path (`kunci` unik `"{langkah} {path}"`, jadi kabar berulang tergabung), dihapus setelah selesai. Langkah: `sitemap` (satu baris untuk seluruh situs, path `/sitemap.xml`), `indexnow`, `indexing-api`, `cek-status`. | Jobs Queue Payload 3.92 (`node_modules/payload/dist/queues`) hanya punya backoff `fixed` dan `exponential` (jeda 1/5/30 menit tidak bisa), satu job per tugas (IndexNow harus satu POST untuk banyak URL), tanpa kuota harian bersama, dan memakai `new Date()` di dalam (waktu tiruan di tes tidak bisa). Jobs Queue tetap dipakai untuk `schedulePublish` bawaan Payload. |
| Jadwal terbit | `GET /api/jobs/run` juga menjalankan `payload.jobs.run({ allQueues: true })`. | Probe: tabel `payload_jobs` sudah ada sejak Rencana 1 karena `schedulePublish: true` di artikel, tetapi tidak ada yang menjalankannya, jadi jadwal terbit belum pernah bekerja. Artikel yang terbit terjadwal langsung dikabarkan pada jalan yang sama. |
| Endpoint cron | Root endpoint Payload `GET /api/jobs/run` (path sesuai §5), menerima `Authorization: Bearer CRON_SECRET` (dibandingkan `timingSafeEqual`) atau admin yang masuk; jawabannya ringkasan `{ jadwalTerbit, indexer }`. Tanpa `CRON_SECRET` di env, permintaan anonim selalu 401. `vercel.json`: `*/10 * * * *`. Lokal tanpa Vercel: `npm run indexer` (skrip `payload run`) atau buka endpoint itu sebagai admin. | Dokumentasi Vercel Cron: GET ke deployment produksi, user agent `vercel-cron/1.0`, header `Authorization: Bearer <CRON_SECRET>`, zona UTC, dan pengiriman bisa terlewat atau dobel (harus idempoten). Endpoint `/api/*` dilayani rute Payload, jadi root endpoint lebih sederhana daripada rute Next bersaudara. |
| `after()` | Hook memanggil `jalankanSetelahRespons(payload)`: `after(() => jalankanIndexer(payload))`. Di luar permintaan Next (seed, tes, `payload run`) `after` melempar "outside a request scope" dan galat itu diabaikan; antrean menunggu cron. Galat pelari dicatat `payload.logger.error`, tidak pernah menggagalkan simpan. | Spesifikasi §5 ("job pertama langsung dijalankan lewat `after()`"); `node_modules/next/dist/docs/.../after.md` dan `next/dist/server/after/after.js` (melempar E468 di luar request). Probe E2E: IndexNow terkirim lewat `after()` setelah REST `PATCH` terbit. |
| Pemicu | Hook `kabariMesinPencari(keTarget, { tanda })` di artikel, tools, video, halaman, pilar, dipasang setelah hook revalidasi. `beforeChange` mencatat versi publik (path dari `pathFor`, tanda perubahan besar) di `req.context`; `afterChange` membandingkannya dengan versi publik sesudah simpan (`bandingkanVersi`): belum publik ke publik `terbit`, publik ke tidak publik `hapus`, path berubah `pindah` (path lama) + `terbit` (path baru), tanda berubah `ubah-besar`. Simpan draf dan suntingan kecil tidak dikabarkan. Noindex dianggap tidak publik. `afterDelete` dokumen publik `hapus`. Artikel memakai `diperbaruiBesar` sebagai tanda; koleksi lain tidak punya saklar perubahan besar, jadi hanya terbit, pindah, dan hapus. Parameter tools yang disimpan atau dihapus mengabari `ubah-besar` untuk tools terbit yang memakainya (`sumberParameter`). | Spesifikasi §8 (pemicu `terbit`, `ubah-besar`, `hapus` untuk lima koleksi); Rencana 3 (pola `req.context` di `beforeChange`, karena di `afterChange` dokumen utama sudah tertimpa dan `previousDoc` bisa draf); Rencana 5 "Cakupan yang ditunda" (kabari saat tools terbit atau parameter berubah). |
| Jenis `pindah` | Jenis keempat di samping tiga jenis spesifikasi: path lama setelah slug berganti. Dikabarkan ke sitemap dan IndexNow, tidak ke Indexing API, dan cek status serta status indeksnya dibuang. | Path lama kini dialihkan 308, sedangkan dokumentasi Indexing API meminta `URL_DELETED` hanya untuk halaman 404, 410, atau noindex. FAQ IndexNow meminta URL yang dialihkan ikut dikirim. |
| Langkah 1 (revalidasi) | Tetap dikerjakan `revalidasiPublik` saat simpan (Rencana 3). `kabari` mencatatnya di log (`langkah: revalidasi`, adapter `next`) karena hook indexing berjalan setelah hook revalidasi yang sudah berhasil. | Spesifikasi §8 langkah 1 dan 6; menghindari dua kali `revalidateTag`. |
| Jendela kirim | Sitemap index paling sering sekali per 30 menit, IndexNow sekali per 5 menit, dihitung dari kiriman **berhasil** terakhir di log. Kabar di dalam jendela ditunda ke akhir jendela dan tergabung; kabar pertama dikirim langsung. Satu POST IndexNow membawa semua URL yang antre (maksimal 10.000). | Spesifikasi §8 ("debounce maksimal sekali per 30 menit", "digabung per 5 menit"); FAQ IndexNow (jeda minimal 5 menit, maksimal 10.000 URL per POST). Ulangan setelah gagal tidak terhalang jendela karena mengikuti jeda 1/5/30 menit. |
| Gagal dan kuota | Gagal: diulang 1, 5, lalu 30 menit kemudian; percobaan keempat yang gagal menjadi status Gagal di log (cek status: status indeks Error, jadwal cek berikutnya tetap jalan). Jawaban 429 atau `RESOURCE_EXHAUSTED` dari Google: ditunda ke awal hari kuota berikutnya tanpa menambah percobaan. Kuota harian dihitung dari log sejak tengah malam waktu Pasifik: Indexing API (bawaan 200, dari CMS) dan cek status (bawaan 1.000, dari CMS, maksimal 2.000); baris di atas kuota ditunda dan dicatat sekali. | Spesifikasi §8 dan §15; dokumentasi kuota Indexing API (200 per hari per proyek, reset tengah malam waktu Pasifik); Search Console API usage limits (URL Inspection 2.000 per hari dan 600 per menit per properti). |
| Cek status | +6 jam, +24 jam, +3 hari, +7 hari dari waktu kabar; berhenti saat Terindeks atau setelah +7 hari. Status dari `indexStatusResult`: `verdict` PASS Terindeks; `coverageState` memuat "unknown to Google" Belum dikenal Google, "discovered" Ditemukan, "crawled" Dirayapi; FAIL Error; NEUTRAL lain Dikecualikan Google. Teks asli disimpan sebagai detail, ditambah `inspectionResultLink` dan `lastCrawlTime`. Permintaan memakai bahasa bawaan (`en-US`) supaya kata kunci stabil. | Spesifikasi §6 dan §8. Dokumentasi `UrlInspectionResult`: `verdict` adalah enum, `coverageState` string bebas. Status "Belum dikenal Google" dan "Dikecualikan Google" ditambahkan ke daftar spesifikasi karena paling sering muncul untuk domain baru dan tidak boleh dilabeli Error. |
| Konkurensi | Sebelum memanggil adapter, baris diklaim dengan satu `UPDATE antrean_indexing SET jadwal = sewa, versi = versi + 1 WHERE id = $1 AND versi = $2 RETURNING id` (sewa 10 menit; bila proses mati, baris muncul lagi). Penyelesaian dan penundaan memakai syarat `versi` yang sama, jadi kabar baru yang tergabung selama pengiriman tidak hilang. | Vercel Cron bisa terkirim dua kali dan `after()` bisa bertepatan dengan cron. `payload.update({ where })` mencari dulu lalu menulis per id; probe: dengan klaim lewat Payload, tes "dua pelari bersamaan" gagal 2 dari 3 kali (IndexNow terkirim dua kali), dengan `UPDATE ... RETURNING` lulus setiap kali. |
| Adapter | Seam `AdapterIndexer` = `{ searchConsole: { kirimSitemap, periksaUrl }, indexNow: { kirim }, googleIndexing: { kabari } }`, masing-masing dengan `nama` untuk log (`searchConsole`, `indexNow`, `googleIndexing`, `palsu`). Adapter tidak pernah melempar galat: jaringan putus menjadi `gagal` tanpa kode HTTP. Dipilih env `INDEXER_ADAPTER`: `asli` (produksi), `palsu` (pratinjau, E2E), kosong di dev dan tes = palsu; build produksi yang dijalankan tanpa nilai itu melempar galat yang jelas. Asli tanpa `GOOGLE_SERVICE_ACCOUNT_JSON`: langkah Google `dilewati` dengan alasan di log; IndexNow tanpa kunci di CMS: `dilewati`. | Spesifikasi §5 (adapter `searchConsole`, `indexNow`, `googleIndexing`, `palsu`); pola klien palsu Rencana 2. Kredensial tidak bisa menjadi saklar seperti Cloudinary karena IndexNow tidak punya kredensial env; mode eksplisit mencegah pratinjau dan E2E mengirim kabar sungguhan. |
| Bentuk API | `sitemaps.submit`: `PUT https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/sitemaps/{feedpath}` tanpa badan (keduanya di-encode), scope `webmasters`. `urlInspection.index.inspect`: `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect` `{ inspectionUrl, siteUrl }`. Indexing API: `POST https://indexing.googleapis.com/v3/urlNotifications:publish` `{ url, type }`, scope `indexing`. Token: JWT `{ iss, scope, aud: https://oauth2.googleapis.com/token, iat, exp: iat + 3600 }` RS256, `POST` form `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=...`, disimpan per scope sampai 60 detik sebelum `expires_in`. IndexNow: `POST https://api.indexnow.org/indexnow` `Content-Type: application/json; charset=utf-8` `{ host, key, keyLocation, urlList }`; 200 dan 202 berhasil, 400, 403, 422, 429 dijelaskan di log. Batas tunggu 15 detik per permintaan. | Dokumentasi resmi yang dibaca 5 November 2026 (lihat Sumber riset). |
| File kunci IndexNow | `next.config.ts` menulis ulang `/:kunci([A-Za-z0-9-]{8,128})\\.txt` ke route handler `src/app/(frontend)/kunci-indexnow/[kunci]/route.ts`, yang menjawab kunci dari pengaturan SEO (cache bertag `pengaturan-seo`) atau 404. Pola panjang 8 sampai 128 membuat `/robots.txt` (dan `/ads.txt` kelak) tidak ikut tertulis ulang. | Spesifikasi §7; dokumentasi IndexNow (kunci 8 sampai 128 karakter `a-zA-Z0-9-`, file `{kunci}.txt` UTF-8 di akar situs supaya berlaku untuk semua URL). Rute `[kunci]` bersaudara dengan `[...jalur]` tidak mungkin tanpa merebut path artikel; docs `rewrites.md` terpasang (rewrite `afterFiles` dicek sebelum rute dinamis, titik di-escape). Probe: `/e2e-kunci-indexnow-2026.txt` 200 `text/plain`, `/kunci-yang-salah-2026.txt` 404, `/robots.txt` tetap. |
| Pengaturan | Grup `indexing` di global `pengaturan-seo`: `kunciIndexNow` (validasi pola IndexNow), `propertiSearchConsole` (bawaan `sc-domain:point.lat`, validasi properti domain atau awalan URL berakhiran `/`), `kuotaInspeksi` (bawaan 1.000, maksimal 2.000), `pakaiIndexingApi` (bawaan mati), `kuotaIndexingApi` (bawaan 200, tampil bila saklar nyala), ditambah field `ui` status pemasangan dan peringatan. Tanpa field `required` baru (aditif). | Spesifikasi §6 (`pengaturanSEO`: IndexNow key, kredensial Google sebagai referensi env, saklar Indexing API, batas kuota). Probe: Payload memberi nilai bawaan saat membaca baris global lama. |
| Log, antrean, status | Ketiga koleksi di grup SEO admin: baca dan hapus hanya admin, buat dan ubah hanya sistem (akses `nobody`, Local API). Log: `waktu`, `url` (absolut), `jenis`, `langkah`, `adapter`, `status` (Berhasil / Gagal, dicoba lagi / Gagal / Dilewati / Ditunda), `kodeHttp`, `pesan`, `percobaan`. Status indeks per path: `status`, `detail`, `tautanInspeksi`, `dirayapiPada`, `cekTerakhir`, `cekBerikutnya`; path yang dihapus atau pindah dibuang. | Spesifikasi §6 (`logIndexing` dan `statusIndeks`, hanya admin). Status disimpan per path supaya kolom di daftar artikel cukup `pathFor`. |
| Admin | Field `ui` server component: "Status pemasangan" (mode adapter, akun layanan, `CRON_SECRET`, kunci IndexNow; rahasia hanya disebut terpasang atau belum) dan "Indexing API bukan untuk artikel" (`role="note"`, tautan ke ketentuan Google) tepat di atas saklar; kolom "Status indeks" di daftar artikel (sel server component, satu query kecil per baris). Gaya memakai variabel tema Payload (`--theme-warning-*`, `--theme-success-*`), status selalu dengan teks. | Spesifikasi §1 kriteria sukses 2, §8 langkah 4 (banner peringatan); `@payloadcms/ui` `buildColumnState` (field `ui` boleh menjadi kolom dengan `Cell` kustom). Probe visual 375, 768, 1440 px: axe tanpa pelanggaran di komponen rencana ini. |
| Dashboard SEO | Tidak di rencana ini (Rencana 6B). | Lihat "Rencana 6 dibagi dua". |

## Struktur file setelah rencana ini

```
src/modules/indexer/
  index.ts       kabari, jalankanIndexer, jalankanSetelahRespons, bandingkanVersi, adapterIndexer, pakaiAdapterIndexer, adapterPalsu
  tipe.ts        JenisKabar, Kabar, VersiPublik, Langkah, StatusLog, StatusIndeks, BarisAntrean, PengaturanIndexing, HasilPanggilan, label
  aturan.ts      bandingkanVersi, rencanaKabar, gabungBaris, jadwalCek, jadwalUlang, tundaSampai, awalHariPasifik, besokPasifik,
                 statusDariInspeksi, setelahPanggilan (fungsi murni, waktu sebagai argumen)
  antrean.ts     penyimpanan: simpanBaris (dedup), klaimBaris (UPDATE ... RETURNING), selesaikanBaris, catatLog, catatStatus, kuota
  jalan.ts       jalankanIndexer (sitemap, IndexNow, Indexing API, cek status), jalankanSetelahRespons (after)
  adapter.ts     seam AdapterIndexer, adapterDariEnv (INDEXER_ADAPTER), adapterIndexer, pakaiAdapterIndexer
  google.ts      bacaAkunLayanan, buatJwt (RS256), penyediaToken (cache per scope)
  asli.ts        adapterAsli: Search Console, URL Inspection, Indexing API, IndexNow lewat fetch
  palsu.ts       adapterPalsu: dalam memori, panggilan tercatat, jawaban bisa diatur
  kunci.ts       validasiKunciIndexNow, validasiPropertiSearchConsole, pathFileKunci
  rute.ts        isiKunciIndexNow (cache bertag pengaturan-seo)
  endpoint.ts    izinCron, jalankanJadwal, endpointJalankanJob (GET /api/jobs/run)
  pemasangan.ts  ringkasPemasangan (status pemasangan tanpa rahasia)
  admin/         StatusPemasangan.tsx, PeringatanIndexingApi.tsx, SelStatusIndeks.tsx, indexing.scss
src/collections/AntreanIndexing.ts, LogIndexing.ts, StatusIndeks.ts
src/hooks/kabariMesinPencari.ts            pemicu di lima koleksi dan parameter tools
src/app/(frontend)/kunci-indexnow/[kunci]/route.ts   /{kunci}.txt lewat rewrite di next.config.ts
src/scripts/jalankan-indexer.ts            npm run indexer
vercel.json                                cron */10 * * * * ke /api/jobs/run
src/globals/PengaturanSEO.ts (+ grup indexing), src/collections/{Artikel,Tools,Video,Halaman,Pilar,ParameterTools}.ts (+ hook)
tests/unit/indexer-*.test.ts, tests/int/indexer-*.int.spec.ts, tests/e2e/indexing.spec.ts
```

## Jumlah tes yang diharapkan

| Setelah task | Unit (file) | Integrasi (file) | E2E |
|---|---|---|---|
| Baseline (`6bc161a`) | 344 (51) | 78 (27) | 88 |
| 1 Pengaturan dan file kunci IndexNow | 348 (52) | 79 (27) | 89 |
| 2 Aturan murni | 366 (53) | 79 (27) | 89 |
| 3 Adapter asli dan palsu | 379 (54) | 79 (27) | 89 |
| 4 Antrean, log, status, kabari | 379 (54) | 83 (28) | 89 |
| 5 Pelari antrean | 379 (54) | 90 (29) | 89 |
| 6 Pemicu di koleksi | 379 (54) | 93 (30) | 89 |
| 7 Cron dan jadwal terbit | 381 (55) | 95 (31) | 89 |
| 8 Admin | 383 (56) | 95 (31) | 90 |
| 9 E2E alur editor | 383 (56) | 95 (31) | 91 |
| 10 CLAUDE.md dan pemeriksaan akhir | 383 (56) | 95 (31) | 91 |

---

### Task 1: Pengaturan Mesin Indexing di CMS dan file kunci IndexNow `/{kunci}.txt`

**Files:**
- Create: `src/modules/indexer/kunci.ts`, `src/modules/indexer/rute.ts`, `src/app/(frontend)/kunci-indexnow/[kunci]/route.ts`
- Modify: `src/globals/PengaturanSEO.ts`, `next.config.ts`, `src/payload-types.ts` (dibuat ulang), `tests/e2e/data.ts`, `tests/e2e/siapkan.ts`
- Test: `tests/unit/indexer-kunci.test.ts`, `tests/int/global.int.spec.ts`, `tests/e2e/indexing.spec.ts`

**Interfaces:**
- Consumes: global `pengaturan-seo` (Rencana 1 dan 3), `respons()` dari `src/modules/seo/rute.ts` (Rencana 3), `TAG.pengaturanSeo` (`src/lib/tag.ts`).
- Produces:
  - `src/modules/indexer/kunci.ts`: `POLA_KUNCI_INDEXNOW`, `validasiKunciIndexNow(nilai): true | string`, `validasiPropertiSearchConsole(nilai): true | string`, `pathFileKunci(kunci): string` (`/{kunci}.txt`, dipakai IndexNow di Task 5 dan status pemasangan di Task 8).
  - `src/modules/indexer/rute.ts`: `isiKunciIndexNow(): Promise<string | null>` (cache bertag `pengaturan-seo`).
  - Global `pengaturan-seo` grup `indexing`: `kunciIndexNow`, `propertiSearchConsole` (bawaan `sc-domain:point.lat`), `kuotaInspeksi` (bawaan 1.000), `pakaiIndexingApi` (bawaan `false`), `kuotaIndexingApi` (bawaan 200). Tipe `PengaturanSeo['indexing']` di `payload-types.ts`.
  - `KUNCI_INDEXNOW` di `tests/e2e/data.ts` (kunci di database E2E).

Pengaturan Mesin Indexing tinggal di global `pengaturan-seo` (spesifikasi §6). Kunci IndexNow boleh di CMS karena memang publik: IndexNow memeriksanya di `https://point.lat/{kunci}.txt` (dokumentasi IndexNow: 8 sampai 128 karakter huruf, angka, atau tanda hubung, file di akar situs supaya berlaku untuk semua URL). Kredensial Google tidak disimpan di sini, hanya di env server (Task 3).

File kunci dilayani route handler `/kunci-indexnow/[kunci]` dan `next.config.ts` menulis ulang `/{kunci}.txt` ke sana. Rute bersaudara `[kunci]` di samping `[...jalur]` tidak bisa (akan merebut path artikel satu segmen), dan Next tidak mendukung segmen dinamis dengan akhiran `.txt`. Pola rewrite memakai panjang 8 sampai 128, jadi `/robots.txt` tetap dilayani rutenya sendiri. Kunci yang tidak cocok, atau kunci yang belum diisi, menjawab 404.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/indexer-kunci.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { validasiKunciIndexNow, validasiPropertiSearchConsole } from '@/modules/indexer/kunci'

  describe('validasiKunciIndexNow', () => {
    it('kosong boleh (IndexNow dilewati); isi 8 sampai 128 huruf, angka, atau tanda hubung', () => {
      expect(validasiKunciIndexNow('')).toBe(true)
      expect(validasiKunciIndexNow(null)).toBe(true)
      expect(validasiKunciIndexNow('a1b2c3d4')).toBe(true)
      expect(validasiKunciIndexNow('Kunci-Point-2026-' + 'x'.repeat(111))).toBe(true)
    })

    it('menolak kunci terlalu pendek, terlalu panjang, atau berkarakter lain', () => {
      const pesan = 'Kunci IndexNow harus 8 sampai 128 karakter: huruf, angka, atau tanda hubung (-).'
      expect(validasiKunciIndexNow('abc123')).toBe(pesan)
      expect(validasiKunciIndexNow('x'.repeat(129))).toBe(pesan)
      expect(validasiKunciIndexNow('kunci_point_2026')).toBe(pesan)
      expect(validasiKunciIndexNow('kunci point 2026')).toBe(pesan)
    })
  })

  describe('validasiPropertiSearchConsole', () => {
    it('menerima properti domain dan properti awalan URL dengan garis miring di akhir', () => {
      expect(validasiPropertiSearchConsole('sc-domain:point.lat')).toBe(true)
      expect(validasiPropertiSearchConsole('https://point.lat/')).toBe(true)
    })

    it('menjelaskan bentuk yang benar untuk isian lain', () => {
      const pesan = 'Tulis properti domain (sc-domain:point.lat) atau awalan URL lengkap yang diakhiri garis miring (https://point.lat/).'
      expect(validasiPropertiSearchConsole('point.lat')).toBe(pesan)
      expect(validasiPropertiSearchConsole('https://point.lat')).toBe(pesan)
      expect(validasiPropertiSearchConsole('sc-domain:')).toBe(pesan)
      expect(validasiPropertiSearchConsole('')).toBe(pesan)
    })
  })
  ```

  Tambahkan tes pengaturan di `tests/int/global.int.spec.ts`:

  ```diff
  diff --git a/tests/int/global.int.spec.ts b/tests/int/global.int.spec.ts
  index 97ff888..4026489 100644
  --- a/tests/int/global.int.spec.ts
  +++ b/tests/int/global.int.spec.ts
  @@ -30,6 +30,20 @@ describe('global situs', () => {
       expect(pesan).toMatch(/^polaJudul:/)
     })
   
  +  it('pengaturan Mesin Indexing: bawaan aman, kunci IndexNow dan properti divalidasi', async () => {
  +    const payload = await getTestPayload()
  +    const { indexing } = await payload.findGlobal({ slug: 'pengaturan-seo' })
  +    expect(indexing).toMatchObject({ propertiSearchConsole: 'sc-domain:point.lat', pakaiIndexingApi: false, kuotaIndexingApi: 200, kuotaInspeksi: 1000 })
  +
  +    const pesan = await pesanGalat(
  +      payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kunciIndexNow: 'kunci_salah', propertiSearchConsole: 'point.lat' } } }),
  +    )
  +    expect(pesan).toBe(
  +      'indexing.kunciIndexNow: Kunci IndexNow harus 8 sampai 128 karakter: huruf, angka, atau tanda hubung (-). | ' +
  +        'indexing.propertiSearchConsole: Tulis properti domain (sc-domain:point.lat) atau awalan URL lengkap yang diakhiri garis miring (https://point.lat/).',
  +    )
  +  })
  +
     it('beranda menyimpan urutan blok', async () => {
       const payload = await getTestPayload()
       const beranda = await payload.updateGlobal({
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: unit FAIL di `tests/unit/indexer-kunci.test.ts` dengan `Error: Cannot find package '@/modules/indexer/kunci'`; integrasi FAIL satu tes di `tests/int/global.int.spec.ts` ("pengaturan Mesin Indexing: bawaan aman ...") dengan `AssertionError: expected undefined to match object { …(4) }`.

- [ ] **Langkah 3: Validasi kunci dan properti, lalu grup Mesin Indexing di Pengaturan SEO**

  `src/modules/indexer/kunci.ts`

  ```ts
  /**
   * Kunci IndexNow (dokumentasi IndexNow): 8 sampai 128 karakter huruf, angka, atau tanda hubung. File
   * `/{kunci}.txt` di akar situs membuktikan kepemilikan semua URL situs.
   */
  export const POLA_KUNCI_INDEXNOW = /^[A-Za-z0-9-]{8,128}$/

  export function validasiKunciIndexNow(nilai: unknown): true | string {
    if (nilai === undefined || nilai === null || nilai === '') return true
    if (typeof nilai === 'string' && POLA_KUNCI_INDEXNOW.test(nilai)) return true
    return 'Kunci IndexNow harus 8 sampai 128 karakter: huruf, angka, atau tanda hubung (-).'
  }

  /** Path file kunci di akar situs (spesifikasi §7). */
  export const pathFileKunci = (kunci: string) => `/${kunci}.txt`

  /**
   * Properti Search Console (dokumentasi Search Console API, `siteUrl`): properti domain
   * `sc-domain:point.lat`, atau properti awalan URL lengkap dengan garis miring di akhir.
   */
  export function validasiPropertiSearchConsole(nilai: unknown): true | string {
    if (typeof nilai === 'string' && /^sc-domain:[a-z0-9.-]+\.[a-z]{2,}$/i.test(nilai)) return true
    if (typeof nilai === 'string' && /^https?:\/\/[^/\s]+\/(?:\S*\/)?$/.test(nilai)) return true
    return 'Tulis properti domain (sc-domain:point.lat) atau awalan URL lengkap yang diakhiri garis miring (https://point.lat/).'
  }
  ```

  ```diff
  diff --git a/src/globals/PengaturanSEO.ts b/src/globals/PengaturanSEO.ts
  index d1b73aa..f414d53 100644
  --- a/src/globals/PengaturanSEO.ts
  +++ b/src/globals/PengaturanSEO.ts
  @@ -4,8 +4,12 @@ import { anyone, isAdmin } from '@/access'
   import { revalidasiPengaturanSeo } from '@/hooks/revalidasiPublik'
   import { validasiPolaJudul } from '@/lib/seo-dasar'
   import { validasiUrlOpsional } from '@/lib/validasi'
  +import { validasiKunciIndexNow, validasiPropertiSearchConsole } from '@/modules/indexer/kunci'
   
  -/** Pengaturan SEO tingkat situs. Rencana 6 menambahkan pengaturan Mesin Indexing di sini. */
  +/**
  + * Pengaturan SEO tingkat situs dan Mesin Indexing (spesifikasi §6 `pengaturanSEO`). Kredensial Google
  + * tidak disimpan di sini: akun layanan dibaca dari env server `GOOGLE_SERVICE_ACCOUNT_JSON`.
  + */
   export const PengaturanSEO: GlobalConfig = {
     slug: 'pengaturan-seo',
     label: 'Pengaturan SEO',
  @@ -54,5 +58,67 @@ export const PengaturanSEO: GlobalConfig = {
         label: 'Aturan robots.txt tambahan',
         admin: { description: 'Ditambahkan di bawah aturan bawaan (Rencana 3).' },
       },
  +    {
  +      name: 'indexing',
  +      type: 'group',
  +      label: 'Mesin Indexing',
  +      admin: {
  +        description:
  +          'Setiap konten terbit, berubah besar, atau dihapus, situs mengabari mesin pencari dan memeriksa status indeksnya di Google.',
  +      },
  +      fields: [
  +        {
  +          name: 'kunciIndexNow',
  +          type: 'text',
  +          label: 'Kunci IndexNow',
  +          validate: (value: unknown) => validasiKunciIndexNow(value),
  +          admin: {
  +            description:
  +              'Kunci ini tampil di point.lat/{kunci}.txt supaya Bing dan mesin pencari lain percaya kabar dari situs ini. Buat sekali (8 sampai 128 huruf, angka, atau tanda hubung) dan jangan diganti. Kosongkan untuk melewati IndexNow.',
  +          },
  +        },
  +        {
  +          name: 'propertiSearchConsole',
  +          type: 'text',
  +          label: 'Properti Search Console',
  +          defaultValue: 'sc-domain:point.lat',
  +          validate: (value: unknown) => validasiPropertiSearchConsole(value),
  +          admin: { description: 'Properti tempat akun layanan Google ditambahkan sebagai pemilik.' },
  +        },
  +        {
  +          name: 'kuotaInspeksi',
  +          type: 'number',
  +          label: 'Batas cek status per hari',
  +          defaultValue: 1000,
  +          min: 1,
  +          max: 2000,
  +          admin: {
  +            description:
  +              'Google mengizinkan 2.000 cek status (URL Inspection) per hari per properti. Batas bawaan 1.000 menyisakan separuh untuk alat lain. Cek di atas batas ditunda ke hari berikutnya.',
  +          },
  +        },
  +        {
  +          name: 'pakaiIndexingApi',
  +          type: 'checkbox',
  +          label: 'Kabari Google lewat Indexing API',
  +          defaultValue: false,
  +          admin: {
  +            description:
  +              'Biarkan mati. Google hanya mengizinkan Indexing API untuk halaman lowongan kerja (JobPosting) dan siaran langsung (BroadcastEvent), bukan artikel. Sitemap dan cek status tetap berjalan tanpa ini.',
  +          },
  +        },
  +        {
  +          name: 'kuotaIndexingApi',
  +          type: 'number',
  +          label: 'Batas Indexing API per hari',
  +          defaultValue: 200,
  +          min: 0,
  +          admin: {
  +            description: 'Kuota bawaan Google 200 permintaan per hari per proyek. Kabar di atas batas ditunda ke hari berikutnya.',
  +            condition: (_, siblingData) => siblingData?.pakaiIndexingApi === true,
  +          },
  +        },
  +      ],
  +    },
     ],
   }
  ```

- [ ] **Langkah 4: Tipe Payload dan database dev**

  Jalankan:

  ```bash
  npm run generate:types
  git diff --stat src/payload-types.ts
  npm run seed
  ```

  Hasil yang diharapkan: `src/payload-types.ts | 34 ++++++++++++++++++++++++++++++++++` (grup `indexing` di `PengaturanSeo` dan `PengaturanSeoSelect`); `npm run seed` selesai tanpa pertanyaan DATA LOSS (kolom baru tanpa `NOT NULL`).

- [ ] **Langkah 5: File kunci `/{kunci}.txt`**

  `src/modules/indexer/rute.ts`

  ```ts
  import config from '@payload-config'
  import { unstable_cache } from 'next/cache'
  import { getPayload } from 'payload'

  import { TAG } from '@/lib/tag'

  /**
   * Kunci IndexNow dari pengaturan SEO untuk rute `/{kunci}.txt`, di-cache dengan tag `pengaturan-seo`
   * (dibuang saat pengaturan disimpan), sama dengan robots.txt.
   */
  export const isiKunciIndexNow = unstable_cache(
    async (): Promise<string | null> => {
      const payload = await getPayload({ config })
      const pengaturan = await payload.findGlobal({ slug: 'pengaturan-seo', depth: 0 })
      return pengaturan.indexing?.kunciIndexNow?.trim() || null
    },
    ['indexer', 'kunci-indexnow'],
    { tags: [TAG.pengaturanSeo], revalidate: 3600 },
  )
  ```

  `src/app/(frontend)/kunci-indexnow/[kunci]/route.ts`

  ```ts
  import { isiKunciIndexNow } from '@/modules/indexer/rute'
  import { respons } from '@/modules/seo/rute'

  /**
   * File kunci IndexNow `/{kunci}.txt` (spesifikasi §7). `next.config.ts` menulis ulang path itu ke
   * rute ini. Isinya kunci dari pengaturan SEO; kunci lain, atau kunci yang belum diisi, menjawab 404.
   */
  export const dynamic = 'force-dynamic'

  export async function GET(_req: Request, { params }: { params: Promise<{ kunci: string }> }) {
    const { kunci } = await params
    const tersimpan = await isiKunciIndexNow()
    if (!tersimpan || kunci !== tersimpan) return new Response('Tidak ditemukan.', { status: 404 })
    return respons(tersimpan, 'teks')
  }
  ```

  ```diff
  diff --git a/next.config.ts b/next.config.ts
  index 0dfbc83..c1a6312 100644
  --- a/next.config.ts
  +++ b/next.config.ts
  @@ -13,6 +13,11 @@ const nextConfig: NextConfig = {
       loader: 'custom',
       loaderFile: './src/modules/media/loader.ts',
     },
  +  // File kunci IndexNow `/{kunci}.txt` di akar situs (spesifikasi §7). Pola kunci sama dengan
  +  // `POLA_KUNCI_INDEXNOW` (8 sampai 128 karakter), jadi `/robots.txt` tidak ikut tertulis ulang.
  +  async rewrites() {
  +    return [{ source: '/:kunci([A-Za-z0-9-]{8,128})\\.txt', destination: '/kunci-indexnow/:kunci' }]
  +  },
     webpack: (webpackConfig) => {
       webpackConfig.resolve.extensionAlias = {
         '.cjs': ['.cts', '.cjs'],
  ```

- [ ] **Langkah 6: Kunci di database E2E dan tes file kunci**

  ```diff
  diff --git a/tests/e2e/data.ts b/tests/e2e/data.ts
  index 3cc7e3f..06e6e13 100644
  --- a/tests/e2e/data.ts
  +++ b/tests/e2e/data.ts
  @@ -38,6 +38,9 @@ export const SLUG_HALAMAN = { tentang: 'tentang', kebijakanRedaksi: 'kebijakan-r
   /** Video contoh: dua terbit (PPh 21 lebih dulu dibuat), satu draf. */
   export const SLUG_VIDEO = { pph21: 'pph-21-satu-slip-gaji', otp: 'kode-otp-jangan-dibagikan', draf: 'video-draf' } as const
   
  +/** Kunci IndexNow di pengaturan SEO database E2E, dilayani di `/{kunci}.txt`. */
  +export const KUNCI_INDEXNOW = 'e2e-kunci-indexnow-2026'
  +
   export const JUDUL_PANDUAN = 'Cara hitung gaji bersih setelah PPh 21 dan BPJS'
   
   // Pembuat JSON Lexical minimal (bentuk yang disimpan Payload 3.92).
  ```

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index 2628ca3..109a628 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -7,7 +7,7 @@ import type { Halaman } from '@/payload-types'
   import { klienPalsu } from '@/modules/media/palsu'
   import { seed } from '@/seed/seed'
   
  -import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, p, SLUG, SLUG_HALAMAN, SLUG_SUB, SLUG_VIDEO, tautanKe } from './data'
  +import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, KUNCI_INDEXNOW, p, SLUG, SLUG_HALAMAN, SLUG_SUB, SLUG_VIDEO, tautanKe } from './data'
   
   /**
    * Mengisi database E2E sebelum server dibangun dan dinyalakan (`webServer` di playwright.config.ts).
  @@ -280,6 +280,7 @@ const tekno = await payload.create({
       isi: isi(p('Penipu cukup butuh beberapa detik rekaman suara.')),
     },
   })
  +await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kunciIndexNow: KUNCI_INDEXNOW } } })
   await payload.updateGlobal({
     slug: 'newsletter',
     data: { aktif: true, penyedia: 'kit', urlForm: 'https://point.kit.com/intinya', judul: 'Intinya, tiap Senin.', deskripsi: 'Lima tulisan terbaik pekan ini, langsung ke email.' },
  ```

  `tests/e2e/indexing.spec.ts`

  ```ts
  import { expect, test } from '@playwright/test'

  import { KUNCI_INDEXNOW } from './data'

  test('file kunci IndexNow di /{kunci}.txt berisi kunci dari pengaturan SEO; kunci lain 404', async ({ request }) => {
    const jawaban = await request.get(`/${KUNCI_INDEXNOW}.txt`)
    expect(jawaban.status()).toBe(200)
    expect(jawaban.headers()['content-type']).toBe('text/plain; charset=utf-8')
    expect(await jawaban.text()).toBe(KUNCI_INDEXNOW)

    expect((await request.get('/kunci-yang-salah-2026.txt')).status()).toBe(404)
    expect((await request.get('/robots.txt')).status()).toBe(200)
  })
  ```

- [ ] **Langkah 7: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 52 passed (52)`, `Tests 348 passed (348)`; integrasi `Test Files 27 passed (27)`, `Tests 79 passed (79)`; E2E `89 passed`. Build mencantumkan `ƒ /kunci-indexnow/[kunci]`.

- [ ] **Langkah 8: Commit**

  ```bash
  git add src/modules/indexer src/globals/PengaturanSEO.ts src/payload-types.ts "src/app/(frontend)/kunci-indexnow" next.config.ts tests/unit/indexer-kunci.test.ts tests/int/global.int.spec.ts tests/e2e
  git commit -m "feat(indexer): pengaturan Mesin Indexing di CMS dan file kunci IndexNow /{kunci}.txt"
  ```

---

### Task 2: Aturan Mesin Indexing sebagai fungsi murni

**Files:**
- Create: `src/modules/indexer/tipe.ts`, `src/modules/indexer/aturan.ts`
- Test: `tests/unit/indexer-aturan.test.ts`

**Interfaces:**
- Consumes: `PATH_SITEMAP_INDEX` (`src/modules/seo/xml.ts`, Rencana 3).
- Produces:
  - `tipe.ts`: `JENIS_KABAR` / `JenisKabar` (`terbit`, `ubah-besar`, `pindah`, `hapus`), `Kabar = { path, jenis }`, `VersiPublik = { path, tanda }`, `LANGKAH` / `Langkah` (`revalidasi`, `sitemap`, `indexnow`, `indexing-api`, `cek-status`), `LangkahAntrean`, `NAMA_ADAPTER` / `NamaAdapter`, `STATUS_LOG` / `StatusLog`, `STATUS_INDEKS` / `StatusIndeks`, label `LABEL_JENIS`, `LABEL_LANGKAH`, `LABEL_STATUS_LOG`, `LABEL_STATUS_INDEKS`, `BarisAntrean`, `PengaturanIndexing`, `HasilIndeks`, `HasilPanggilan` (`berhasil` dengan `indeks` opsional, `gagal` dengan `kuotaHabis` opsional, `dilewati`).
  - `aturan.ts`: `MENIT`, `JAM`, `HARI`, `JEDA_ULANG_MS`, `JADWAL_CEK_MS`, `JENDELA_KIRIM_MS`, `PATH_SITEMAP`, `bandingkanVersi(lama, baru): Kabar[]`, `rencanaKabar(kabar, { pakaiIndexingApi }, sekarang): { simpan: BarisAntrean[]; batal: LangkahAntrean[] }`, `gabungBaris(lama, baru)`, `jadwalCek(dasar, tahap)`, `jadwalUlang(percobaan, sekarang)`, `tundaSampai(terakhir, jendelaMs, sekarang)`, `awalHariPasifik(t)`, `besokPasifik(t)`, `statusDariInspeksi(indeks): { status, detail }`, `Lanjutan`, `setelahPanggilan(baris, hasil, sekarang): Lanjutan`.

Semua keputusan Mesin Indexing yang tidak menyentuh database atau jaringan ada di sini, dengan waktu sebagai argumen, jadi aturan spesifikasi §8 dan §16 (dedup, debounce, retry, kuota, urutan cek status) diuji tanpa database dan tanpa menunggu:

- `bandingkanVersi`: kabar dari versi publik sebelum dan sesudah simpan (Task 6 memakainya di hook). `pindah` adalah jenis keempat untuk path lama setelah slug berganti (lihat Keputusan teknis).
- `rencanaKabar` dan `gabungBaris`: baris antrean per kabar dan cara kabar berulang tergabung (jenis terbaru dipakai, jadwal dan percobaan lama tetap; cek status mulai lagi dari +6 jam).
- `jadwalUlang` (1, 5, 30 menit), `jadwalCek` (+6 jam, +24 jam, +3 hari, +7 hari), `tundaSampai` (jendela kirim).
- `awalHariPasifik` dan `besokPasifik`: hari kuota Google mulai tengah malam waktu Pasifik (dokumentasi kuota Indexing API). Selisih zona dihitung dengan `Intl.DateTimeFormat`, dua kali karena jam musim panas berganti pukul 02.00.
- `statusDariInspeksi`: arti `indexStatusResult` (lihat Keputusan teknis).
- `setelahPanggilan`: keadaan baris setelah adapter menjawab, termasuk penundaan kuota dan cek status yang lanjut ke jadwal berikutnya.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/indexer-aturan.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import {
    awalHariPasifik,
    bandingkanVersi,
    besokPasifik,
    gabungBaris,
    jadwalCek,
    jadwalUlang,
    rencanaKabar,
    setelahPanggilan,
    statusDariInspeksi,
    tundaSampai,
  } from '@/modules/indexer/aturan'
  import type { BarisAntrean } from '@/modules/indexer/tipe'

  const t = (iso: string) => new Date(iso)
  const SEKARANG = t('2026-11-05T03:00:00.000Z')

  describe('bandingkanVersi: kabar dari versi publik sebelum dan sesudah simpan', () => {
    const v = (path: string, tanda: string | null = null) => ({ path, tanda })

    it('terbit, batal terbit atau hapus, dan simpan draf', () => {
      expect(bandingkanVersi(null, v('/gaji'))).toEqual([{ path: '/gaji', jenis: 'terbit' }])
      expect(bandingkanVersi(v('/gaji'), null)).toEqual([{ path: '/gaji', jenis: 'hapus' }])
      expect(bandingkanVersi(null, null)).toEqual([])
    })

    it('ganti slug: path lama pindah, path baru terbit', () => {
      expect(bandingkanVersi(v('/gaji'), v('/gaji-bersih'))).toEqual([
        { path: '/gaji', jenis: 'pindah' },
        { path: '/gaji-bersih', jenis: 'terbit' },
      ])
    })

    it('perubahan besar hanya bila tanda berubah; suntingan kecil tidak dikabarkan', () => {
      expect(bandingkanVersi(v('/gaji', '2026-11-01'), v('/gaji', '2026-11-05'))).toEqual([{ path: '/gaji', jenis: 'ubah-besar' }])
      expect(bandingkanVersi(v('/gaji', '2026-11-01'), v('/gaji', '2026-11-01'))).toEqual([])
      expect(bandingkanVersi(v('/tools/thr'), v('/tools/thr'))).toEqual([])
    })
  })

  describe('rencanaKabar: langkah antrean per jenis kabar', () => {
    const langkah = (r: ReturnType<typeof rencanaKabar>) => r.simpan.map((b) => `${b.langkah} ${b.path}`)

    it('terbit: sitemap index, IndexNow, dan cek status +6 jam; Indexing API hanya bila saklarnya aktif', () => {
      const mati = rencanaKabar({ path: '/gaji', jenis: 'terbit' }, { pakaiIndexingApi: false }, SEKARANG)
      expect(langkah(mati)).toEqual(['sitemap /sitemap.xml', 'indexnow /gaji', 'cek-status /gaji'])
      expect(mati.simpan[2]).toMatchObject({ jadwal: t('2026-11-05T09:00:00.000Z'), dasar: SEKARANG, tahap: 0 })
      expect(mati.batal).toEqual([])
      const aktif = rencanaKabar({ path: '/gaji', jenis: 'ubah-besar' }, { pakaiIndexingApi: true }, SEKARANG)
      expect(langkah(aktif)).toEqual(['sitemap /sitemap.xml', 'indexnow /gaji', 'indexing-api /gaji', 'cek-status /gaji'])
    })

    it('hapus membatalkan cek status; pindah juga tanpa Indexing API (path lama dialihkan, bukan 404)', () => {
      const hapus = rencanaKabar({ path: '/gaji', jenis: 'hapus' }, { pakaiIndexingApi: true }, SEKARANG)
      expect(langkah(hapus)).toEqual(['sitemap /sitemap.xml', 'indexnow /gaji', 'indexing-api /gaji'])
      expect(hapus.batal).toEqual(['cek-status'])
      const pindah = rencanaKabar({ path: '/gaji', jenis: 'pindah' }, { pakaiIndexingApi: true }, SEKARANG)
      expect(langkah(pindah)).toEqual(['sitemap /sitemap.xml', 'indexnow /gaji'])
      expect(pindah.batal).toEqual(['indexing-api', 'cek-status'])
    })
  })

  const baris = (isi: Partial<BarisAntrean>): BarisAntrean => ({
    langkah: 'indexnow',
    path: '/gaji',
    jenis: 'terbit',
    jadwal: SEKARANG,
    percobaan: 0,
    tahap: 0,
    dasar: null,
    ...isi,
  })

  describe('gabungBaris: dedup per langkah dan path', () => {
    it('jenis ikut kabar terbaru, jadwal dan percobaan lama tetap (jeda ulang dan penundaan kuota berlaku)', () => {
      const lama = baris({ langkah: 'indexing-api', jadwal: t('2026-11-05T03:05:00.000Z'), percobaan: 2 })
      expect(gabungBaris(lama, baris({ langkah: 'indexing-api', jenis: 'hapus', jadwal: SEKARANG }))).toEqual({ ...lama, jenis: 'hapus' })
    })

    it('cek status mulai lagi dari +6 jam', () => {
      const lama = baris({ langkah: 'cek-status', tahap: 2, dasar: t('2026-11-01T00:00:00.000Z') })
      const baru = baris({ langkah: 'cek-status', jenis: 'ubah-besar', jadwal: t('2026-11-05T09:00:00.000Z'), dasar: SEKARANG })
      expect(gabungBaris(lama, baru)).toEqual(baru)
    })
  })

  describe('jadwal ulang dan jadwal cek status', () => {
    it('gagal diulang 1, 5, lalu 30 menit kemudian, lalu berhenti', () => {
      expect([0, 1, 2, 3].map((p) => jadwalUlang(p, SEKARANG)?.toISOString() ?? null)).toEqual([
        '2026-11-05T03:01:00.000Z',
        '2026-11-05T03:05:00.000Z',
        '2026-11-05T03:30:00.000Z',
        null,
      ])
    })

    it('cek status +6 jam, +24 jam, +3 hari, +7 hari dari waktu kabar', () => {
      expect([0, 1, 2, 3, 4].map((tahap) => jadwalCek(SEKARANG, tahap)?.toISOString() ?? null)).toEqual([
        '2026-11-05T09:00:00.000Z',
        '2026-11-06T03:00:00.000Z',
        '2026-11-08T03:00:00.000Z',
        '2026-11-12T03:00:00.000Z',
        null,
      ])
    })

    it('jendela kirim: sitemap 30 menit, IndexNow 5 menit sejak kiriman terakhir', () => {
      expect(tundaSampai(null, 30 * 60_000, SEKARANG)).toBeNull()
      expect(tundaSampai(t('2026-11-05T02:40:00.000Z'), 30 * 60_000, SEKARANG)).toEqual(t('2026-11-05T03:10:00.000Z'))
      expect(tundaSampai(t('2026-11-05T02:55:00.000Z'), 5 * 60_000, SEKARANG)).toBeNull()
    })
  })

  describe('hari kuota Google: tengah malam waktu Pasifik', () => {
    it('PST (UTC-8) dan PDT (UTC-7)', () => {
      expect(awalHariPasifik(t('2026-11-05T12:00:00Z'))).toEqual(t('2026-11-05T08:00:00Z'))
      expect(awalHariPasifik(t('2026-11-05T07:59:00Z'))).toEqual(t('2026-11-04T08:00:00Z'))
      expect(awalHariPasifik(t('2026-07-01T10:00:00Z'))).toEqual(t('2026-07-01T07:00:00Z'))
    })

    it('hari pergantian jam musim panas (8 Maret dan 1 November 2026)', () => {
      expect(awalHariPasifik(t('2026-03-08T20:00:00Z'))).toEqual(t('2026-03-08T08:00:00Z'))
      expect(besokPasifik(t('2026-03-08T20:00:00Z'))).toEqual(t('2026-03-09T07:00:00Z'))
      expect(awalHariPasifik(t('2026-11-01T20:00:00Z'))).toEqual(t('2026-11-01T07:00:00Z'))
      expect(besokPasifik(t('2026-11-01T20:00:00Z'))).toEqual(t('2026-11-02T08:00:00Z'))
    })
  })

  describe('statusDariInspeksi: hasil URL Inspection API', () => {
    it('verdict PASS terindeks; coverageState menentukan ditemukan, dirayapi, dan belum dikenal', () => {
      expect(statusDariInspeksi({ verdict: 'PASS', coverageState: 'Submitted and indexed' })).toEqual({ status: 'terindeks', detail: 'Submitted and indexed' })
      expect(statusDariInspeksi({ verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' }).status).toBe('ditemukan')
      expect(statusDariInspeksi({ verdict: 'NEUTRAL', coverageState: 'Crawled - currently not indexed' }).status).toBe('dirayapi')
      expect(statusDariInspeksi({ verdict: 'NEUTRAL', coverageState: 'URL is unknown to Google' }).status).toBe('tidak-dikenal')
    })

    it('FAIL menjadi Error, NEUTRAL lain dikecualikan, detail menyebut masalah pengambilan halaman', () => {
      expect(statusDariInspeksi({ verdict: 'FAIL', coverageState: 'Server error (5xx)', pageFetchState: 'SERVER_ERROR' })).toEqual({
        status: 'galat',
        detail: 'Server error (5xx); pengambilan halaman: SERVER_ERROR',
      })
      expect(statusDariInspeksi({ verdict: 'NEUTRAL', coverageState: "Excluded by 'noindex' tag" }).status).toBe('dikecualikan')
      expect(statusDariInspeksi(undefined)).toEqual({ status: 'belum-dicek', detail: '' })
    })
  })

  describe('setelahPanggilan: keadaan antrean setelah adapter menjawab', () => {
    const berhasil = { status: 'berhasil' as const, kodeHttp: 200, pesan: 'OK' }
    const gagal = { status: 'gagal' as const, kodeHttp: 503, pesan: 'Tidak tersedia' }

    it('berhasil dan dilewati menyelesaikan baris', () => {
      expect(setelahPanggilan(baris({}), berhasil, SEKARANG)).toEqual({ log: 'berhasil', berikut: null })
      expect(setelahPanggilan(baris({}), { status: 'dilewati', pesan: 'Kunci belum diisi.' }, SEKARANG)).toEqual({ log: 'dilewati', berikut: null })
    })

    it('gagal diulang tiga kali, lalu Gagal', () => {
      expect(setelahPanggilan(baris({ percobaan: 0 }), gagal, SEKARANG)).toEqual({
        log: 'diulang',
        berikut: { jadwal: t('2026-11-05T03:01:00.000Z'), percobaan: 1, tahap: 0 },
      })
      expect(setelahPanggilan(baris({ percobaan: 2 }), gagal, SEKARANG).berikut?.jadwal).toEqual(t('2026-11-05T03:30:00.000Z'))
      expect(setelahPanggilan(baris({ percobaan: 3 }), gagal, SEKARANG)).toEqual({ log: 'gagal', berikut: null })
    })

    it('kuota Google habis: ditunda ke awal hari kuota berikutnya tanpa menambah percobaan', () => {
      const habis = { ...gagal, kodeHttp: 429, kuotaHabis: true }
      expect(setelahPanggilan(baris({ langkah: 'indexing-api', percobaan: 1 }), habis, SEKARANG)).toEqual({
        log: 'ditunda',
        berikut: { jadwal: t('2026-11-05T08:00:00.000Z'), percobaan: 1, tahap: 0 },
      })
    })

    it('cek status: lanjut ke jadwal berikutnya sampai Terindeks atau sampai +7 hari', () => {
      const cek = (tahap: number) => baris({ langkah: 'cek-status', tahap, dasar: SEKARANG })
      const ditemukan = { ...berhasil, indeks: { verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' } }
      const terindeks = { ...berhasil, indeks: { verdict: 'PASS', coverageState: 'Submitted and indexed' } }
      expect(setelahPanggilan(cek(0), ditemukan, SEKARANG).berikut).toEqual({ jadwal: t('2026-11-06T03:00:00.000Z'), percobaan: 0, tahap: 1 })
      expect(setelahPanggilan(cek(1), terindeks, SEKARANG)).toEqual({ log: 'berhasil', berikut: null })
      expect(setelahPanggilan(cek(3), ditemukan, SEKARANG)).toEqual({ log: 'berhasil', berikut: null })
      // Cek yang gagal tiga kali tidak menghentikan jadwal berikutnya.
      expect(setelahPanggilan({ ...cek(1), percobaan: 3 }, gagal, SEKARANG)).toEqual({
        log: 'gagal',
        berikut: { jadwal: t('2026-11-08T03:00:00.000Z'), percobaan: 0, tahap: 2 },
      })
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/indexer-aturan.test.ts` dengan `Error: Cannot find package '@/modules/indexer/aturan'`.

- [ ] **Langkah 3: Tipe Mesin Indexing**

  `src/modules/indexer/tipe.ts`

  ```ts
  /**
   * Tipe Mesin Indexing (spesifikasi §8). Nilai `select` koleksi `antrean-indexing`, `log-indexing`, dan
   * `status-indeks` diambil dari daftar di sini supaya kode dan skema tidak berbeda.
   */

  /**
   * Jenis kabar. Spesifikasi menulis `terbit`, `ubah-besar`, dan `hapus`; `pindah` ditambahkan untuk path
   * lama setelah slug berganti: path itu kini dialihkan (308), jadi IndexNow dan sitemap dikabari, tetapi
   * Indexing API tidak (`URL_DELETED` hanya untuk halaman 404, 410, atau noindex).
   */
  export const JENIS_KABAR = ['terbit', 'ubah-besar', 'pindah', 'hapus'] as const
  export type JenisKabar = (typeof JENIS_KABAR)[number]

  /** Satu perubahan URL publik yang dikabarkan ke mesin pencari. Path selalu dari `pathFor()`. */
  export type Kabar = { path: string; jenis: JenisKabar }

  /** Versi publik sebuah dokumen: path-nya, dan tanda perubahan besar (artikel: `diperbaruiBesar`). */
  export type VersiPublik = { path: string; tanda: string | null }

  export const LANGKAH = ['revalidasi', 'sitemap', 'indexnow', 'indexing-api', 'cek-status'] as const
  export type Langkah = (typeof LANGKAH)[number]

  /** Langkah yang lewat antrean. Revalidasi terjadi saat dokumen disimpan, jadi langsung dicatat. */
  export type LangkahAntrean = Exclude<Langkah, 'revalidasi'>

  /** Nama adapter di log (spesifikasi §5: `searchConsole`, `indexNow`, `googleIndexing`, `palsu`). */
  export const NAMA_ADAPTER = ['next', 'searchConsole', 'indexNow', 'googleIndexing', 'palsu'] as const
  export type NamaAdapter = (typeof NAMA_ADAPTER)[number]

  export const STATUS_LOG = ['berhasil', 'diulang', 'gagal', 'dilewati', 'ditunda'] as const
  export type StatusLog = (typeof STATUS_LOG)[number]

  export const STATUS_INDEKS = ['belum-dicek', 'tidak-dikenal', 'ditemukan', 'dirayapi', 'terindeks', 'dikecualikan', 'galat'] as const
  export type StatusIndeks = (typeof STATUS_INDEKS)[number]

  export const LABEL_JENIS: Record<JenisKabar, string> = {
    terbit: 'Terbit',
    'ubah-besar': 'Perubahan besar',
    pindah: 'Pindah alamat',
    hapus: 'Dihapus',
  }

  export const LABEL_LANGKAH: Record<Langkah, string> = {
    revalidasi: 'Revalidasi cache',
    sitemap: 'Kirim sitemap ke Search Console',
    indexnow: 'IndexNow',
    'indexing-api': 'Google Indexing API',
    'cek-status': 'Cek status indeks',
  }

  export const LABEL_STATUS_LOG: Record<StatusLog, string> = {
    berhasil: 'Berhasil',
    diulang: 'Gagal, dicoba lagi',
    gagal: 'Gagal',
    dilewati: 'Dilewati',
    ditunda: 'Ditunda',
  }

  export const LABEL_STATUS_INDEKS: Record<StatusIndeks, string> = {
    'belum-dicek': 'Belum dicek',
    'tidak-dikenal': 'Belum dikenal Google',
    ditemukan: 'Ditemukan, belum dirayapi',
    dirayapi: 'Dirayapi, belum diindeks',
    terindeks: 'Terindeks',
    dikecualikan: 'Dikecualikan Google',
    galat: 'Error',
  }

  /** Satu baris antrean. Satu baris per langkah dan path (dedup), dihapus setelah selesai. */
  export type BarisAntrean = {
    langkah: LangkahAntrean
    path: string
    jenis: JenisKabar
    jadwal: Date
    /** Jumlah percobaan yang sudah gagal. */
    percobaan: number
    /** Cek status: urutan jadwal berikutnya (0 = +6 jam). */
    tahap: number
    /** Cek status: waktu kabar, dasar jadwal +6 jam sampai +7 hari. */
    dasar: Date | null
  }

  /** Pengaturan Mesin Indexing dari global `pengaturan-seo`, sudah diberi nilai bawaan. */
  export type PengaturanIndexing = {
    urlSitus: string
    kunciIndexNow: string | null
    propertiSearchConsole: string
    kuotaInspeksi: number
    pakaiIndexingApi: boolean
    kuotaIndexingApi: number
  }

  /** Hasil index status dari URL Inspection API (`indexStatusResult`), hanya yang dipakai. */
  export type HasilIndeks = {
    verdict?: string | null
    coverageState?: string | null
    pageFetchState?: string | null
    lastCrawlTime?: string | null
    tautan?: string | null
  }

  /** Hasil satu panggilan adapter. `dilewati`: tidak dipanggil (kredensial atau kunci belum diatur). */
  export type HasilPanggilan =
    | { status: 'berhasil'; kodeHttp: number | null; pesan: string; indeks?: HasilIndeks }
    | { status: 'gagal'; kodeHttp: number | null; pesan: string; kuotaHabis?: boolean }
    | { status: 'dilewati'; pesan: string }
  ```

- [ ] **Langkah 4: Aturan**

  `src/modules/indexer/aturan.ts`

  ```ts
  import { PATH_SITEMAP_INDEX } from '@/modules/seo/xml'

  import type {
    BarisAntrean,
    HasilIndeks,
    HasilPanggilan,
    Kabar,
    LangkahAntrean,
    StatusIndeks,
    StatusLog,
    VersiPublik,
  } from './tipe'

  /**
   * Aturan Mesin Indexing sebagai fungsi murni (spesifikasi §8): kapan kabar dibuat, bagaimana antrean
   * digabung, jeda ulang, jadwal cek status, jendela kirim, kuota harian, dan arti hasil URL Inspection.
   * Waktu selalu masuk sebagai argumen supaya tes bisa memakai waktu tiruan.
   */

  export const MENIT = 60_000
  export const JAM = 60 * MENIT
  export const HARI = 24 * JAM

  /** Gagal: diulang 3 kali dengan jeda 1, 5, lalu 30 menit; setelah itu status Gagal. */
  export const JEDA_ULANG_MS = [MENIT, 5 * MENIT, 30 * MENIT] as const

  /** Cek status pada +6 jam, +24 jam, +3 hari, dan +7 hari setelah kabar; berhenti saat Terindeks. */
  export const JADWAL_CEK_MS = [6 * JAM, 24 * JAM, 3 * HARI, 7 * HARI] as const

  /** Jarak minimal antarpengiriman: sitemap paling sering 30 menit sekali, IndexNow 5 menit sekali. */
  export const JENDELA_KIRIM_MS = { sitemap: 30 * MENIT, indexnow: 5 * MENIT } as const

  /** Baris sitemap di antrean: satu untuk seluruh situs, yang dikirim adalah sitemap index. */
  export const PATH_SITEMAP = PATH_SITEMAP_INDEX

  /**
   * Kabar dari dua versi publik sebuah dokumen (sebelum dan sesudah disimpan). `null` berarti tidak
   * publik: draf, batal terbit, dihapus, atau noindex.
   */
  export function bandingkanVersi(lama: VersiPublik | null, baru: VersiPublik | null): Kabar[] {
    if (!lama && !baru) return []
    if (!lama) return [{ path: baru!.path, jenis: 'terbit' }]
    if (!baru) return [{ path: lama.path, jenis: 'hapus' }]
    if (lama.path !== baru.path) {
      return [
        { path: lama.path, jenis: 'pindah' },
        { path: baru.path, jenis: 'terbit' },
      ]
    }
    if (baru.tanda && baru.tanda !== lama.tanda) return [{ path: baru.path, jenis: 'ubah-besar' }]
    return []
  }

  /**
   * Baris antrean untuk satu kabar dan langkah yang dibatalkan. Sitemap dan IndexNow selalu; Indexing API
   * hanya bila saklarnya aktif dan bukan path yang pindah; cek status hanya untuk URL yang (masih) publik.
   */
  export function rencanaKabar(
    kabar: Kabar,
    opsi: { pakaiIndexingApi: boolean },
    sekarang: Date,
  ): { simpan: BarisAntrean[]; batal: LangkahAntrean[] } {
    const dasar: Omit<BarisAntrean, 'langkah'> = { path: kabar.path, jenis: kabar.jenis, jadwal: sekarang, percobaan: 0, tahap: 0, dasar: null }
    const simpan: BarisAntrean[] = [
      { ...dasar, langkah: 'sitemap', path: PATH_SITEMAP },
      { ...dasar, langkah: 'indexnow' },
    ]
    if (opsi.pakaiIndexingApi && kabar.jenis !== 'pindah') simpan.push({ ...dasar, langkah: 'indexing-api' })
    const publik = kabar.jenis === 'terbit' || kabar.jenis === 'ubah-besar'
    if (publik) simpan.push({ ...dasar, langkah: 'cek-status', jadwal: jadwalCek(sekarang, 0)!, dasar: sekarang })
    const batal: LangkahAntrean[] = publik ? [] : kabar.jenis === 'pindah' ? ['indexing-api', 'cek-status'] : ['cek-status']
    return { simpan, batal }
  }

  /**
   * Dedup: kabar baru untuk langkah dan path yang sudah antre menggabungkan diri ke baris lama. Jenis
   * diambil dari kabar terbaru; jadwal dan percobaan lama dipertahankan (jeda ulang dan penundaan kuota
   * tetap berlaku). Cek status mulai lagi dari +6 jam karena isinya baru berubah.
   */
  export function gabungBaris(lama: BarisAntrean, baru: BarisAntrean): BarisAntrean {
    if (baru.langkah === 'cek-status') return baru
    return { ...lama, jenis: baru.jenis }
  }

  /** Jadwal cek status ke-`tahap` (0 = +6 jam), `null` setelah tahap terakhir (+7 hari). */
  export function jadwalCek(dasar: Date, tahap: number): Date | null {
    const jeda = JADWAL_CEK_MS[tahap]
    return jeda === undefined ? null : new Date(dasar.getTime() + jeda)
  }

  /** Jadwal ulang setelah gagal ke-(`percobaan` + 1), `null` bila sudah diulang 3 kali. */
  export function jadwalUlang(percobaan: number, sekarang: Date): Date | null {
    const jeda = JEDA_ULANG_MS[percobaan]
    return jeda === undefined ? null : new Date(sekarang.getTime() + jeda)
  }

  /** Waktu paling cepat boleh mengirim lagi, atau `null` bila boleh sekarang. */
  export function tundaSampai(terakhir: Date | null, jendelaMs: number, sekarang: Date): Date | null {
    if (!terakhir) return null
    const boleh = terakhir.getTime() + jendelaMs
    return sekarang.getTime() < boleh ? new Date(boleh) : null
  }

  const PASIFIK = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  })

  /** Selisih jam Pasifik terhadap UTC pada waktu `t` (milidetik, negatif). */
  function selisihPasifik(t: Date): number {
    const b = Object.fromEntries(PASIFIK.formatToParts(t).map((p) => [p.type, Number(p.value)]))
    const lokal = Date.UTC(b.year, b.month - 1, b.day, b.hour, b.minute, b.second)
    return lokal - Math.floor(t.getTime() / 1000) * 1000
  }

  /**
   * Awal hari kuota Google: tengah malam waktu Pasifik (dokumentasi kuota Indexing API). Selisih dihitung
   * dua kali karena pergantian jam musim panas terjadi pukul 02.00, setelah tengah malam.
   */
  export function awalHariPasifik(t: Date): Date {
    const lokal = new Date(t.getTime() + selisihPasifik(t))
    const tengahMalam = Date.UTC(lokal.getUTCFullYear(), lokal.getUTCMonth(), lokal.getUTCDate())
    const kira = new Date(tengahMalam - selisihPasifik(t))
    return new Date(tengahMalam - selisihPasifik(kira))
  }

  /** Awal hari kuota berikutnya. Hari Pasifik panjangnya 23 sampai 25 jam, jadi +25 jam selalu jatuh di hari berikutnya. */
  export function besokPasifik(t: Date): Date {
    return awalHariPasifik(new Date(awalHariPasifik(t).getTime() + 25 * JAM))
  }

  /**
   * Status indeks dari `indexStatusResult` URL Inspection API. `verdict` adalah enum resmi; `coverageState`
   * berupa teks bebas berbahasa Inggris (permintaan memakai bahasa bawaan en-US), jadi dicocokkan dengan
   * kata kuncinya. Teks aslinya disimpan sebagai detail.
   */
  export function statusDariInspeksi(indeks: HasilIndeks | undefined): { status: StatusIndeks; detail: string } {
    const cakupan = indeks?.coverageState?.trim() ?? ''
    const c = cakupan.toLowerCase()
    const ambil = indeks?.pageFetchState && indeks.pageFetchState !== 'SUCCESSFUL' ? `pengambilan halaman: ${indeks.pageFetchState}` : null
    const detail = [cakupan || indeks?.verdict || null, ambil].filter(Boolean).join('; ')
    let status: StatusIndeks = 'belum-dicek'
    if (indeks?.verdict === 'PASS') status = 'terindeks'
    else if (c.includes('unknown to google')) status = 'tidak-dikenal'
    else if (c.includes('discovered')) status = 'ditemukan'
    else if (c.includes('crawled')) status = 'dirayapi'
    else if (indeks?.verdict === 'FAIL') status = 'galat'
    else if (indeks?.verdict === 'NEUTRAL') status = 'dikecualikan'
    return { status, detail }
  }

  /** Keadaan baris berikutnya setelah satu panggilan adapter. `berikut: null` berarti baris selesai. */
  export type Lanjutan = {
    log: StatusLog
    berikut: Pick<BarisAntrean, 'jadwal' | 'percobaan' | 'tahap'> | null
  }

  /**
   * Langkah antrean setelah adapter menjawab (spesifikasi §8 dan §15):
   * - berhasil: selesai, kecuali cek status yang belum Terindeks lanjut ke jadwal berikutnya;
   * - kuota Google habis: ditunda ke awal hari kuota berikutnya, percobaan tidak bertambah;
   * - gagal: diulang 1, 5, lalu 30 menit kemudian; setelah itu Gagal (cek status tetap lanjut ke jadwal
   *   berikutnya bila masih ada);
   * - dilewati (kredensial, kunci, atau saklar belum diatur): selesai.
   */
  export function setelahPanggilan(baris: BarisAntrean, hasil: HasilPanggilan, sekarang: Date): Lanjutan {
    const tahapBerikut = (): Lanjutan['berikut'] => {
      const jadwal = baris.dasar ? jadwalCek(baris.dasar, baris.tahap + 1) : null
      return jadwal ? { jadwal, percobaan: 0, tahap: baris.tahap + 1 } : null
    }
    if (hasil.status === 'dilewati') return { log: 'dilewati', berikut: null }
    if (hasil.status === 'berhasil') {
      if (baris.langkah !== 'cek-status' || statusDariInspeksi(hasil.indeks).status === 'terindeks') return { log: 'berhasil', berikut: null }
      return { log: 'berhasil', berikut: tahapBerikut() }
    }
    if (hasil.kuotaHabis) return { log: 'ditunda', berikut: { jadwal: besokPasifik(sekarang), percobaan: baris.percobaan, tahap: baris.tahap } }
    const ulang = jadwalUlang(baris.percobaan, sekarang)
    if (ulang) return { log: 'diulang', berikut: { jadwal: ulang, percobaan: baris.percobaan + 1, tahap: baris.tahap } }
    return { log: 'gagal', berikut: baris.langkah === 'cek-status' ? tahapBerikut() : null }
  }
  ```

- [ ] **Langkah 5: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 53 passed (53)`, `Tests 366 passed (366)`; integrasi `Test Files 27 passed (27)`, `Tests 79 passed (79)`; E2E `89 passed`.

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/modules/indexer/tipe.ts src/modules/indexer/aturan.ts tests/unit/indexer-aturan.test.ts
  git commit -m "feat(indexer): aturan Mesin Indexing: kabar, dedup antrean, jeda ulang, jadwal cek status, hari kuota, dan arti hasil inspeksi"
  ```

---

### Task 3: Adapter Search Console, Indexing API, dan IndexNow lewat `fetch`, akun layanan Google tanpa pustaka, dan adapter palsu

**Files:**
- Create: `src/modules/indexer/adapter.ts`, `src/modules/indexer/google.ts`, `src/modules/indexer/asli.ts`, `src/modules/indexer/palsu.ts`
- Test: `tests/unit/indexer-adapter.test.ts`

**Interfaces:**
- Consumes: `HasilPanggilan`, `HasilIndeks`, `NamaAdapter` (Task 2).
- Produces:
  - `adapter.ts`: `AdapterIndexer = { searchConsole: { nama, kirimSitemap(properti, urlSitemap), periksaUrl(properti, url) }, indexNow: { nama, kirim(kiriman) }, googleIndexing: { nama, kabari(url, jenis) } }` (semua mengembalikan `Promise<HasilPanggilan>` dan tidak pernah melempar), `KirimanIndexNow = { host, key, keyLocation, urlList }`, `JenisIndexingApi = 'URL_UPDATED' | 'URL_DELETED'`, `adapterDariEnv(env)`, `adapterIndexer()`, `pakaiAdapterIndexer(adapter | null)`.
  - `google.ts`: `URL_TOKEN`, `SCOPE_WEBMASTERS`, `SCOPE_INDEXING`, `AkunLayanan`, `bacaAkunLayanan(teks): AkunLayanan | { alasan }`, `buatJwt(akun, scope, iat)`, `Fetch`, `BATAS_TUNGGU_MS`, `penyediaToken(akun, { fetch, sekarang })`.
  - `asli.ts`: `adapterAsli({ akun, fetch?, sekarang? })`, `URL_SEARCH_CONSOLE`, `URL_INSPEKSI`, `URL_INDEXING_API`, `URL_INDEXNOW`.
  - `palsu.ts`: `adapterPalsu(): AdapterPalsu` dengan `panggilan` (tercatat berurutan), `indeks` (hasil inspeksi per URL; bawaan "URL is unknown to Google"), `jawab(aksi, ...hasil)`, `reset()`.

Seam modul indexer (spesifikasi §5): tiga layanan luar dengan satu antarmuka, versi asli dan versi palsu. Adapter asli memakai `fetch` dan tidak memakai pustaka Google: token akses didapat dari JWT RS256 yang ditandatangani `private_key` akun layanan (`createSign('RSA-SHA256')`), ditukar di `https://oauth2.googleapis.com/token` (dokumentasi "Using OAuth 2.0 for Server to Server Applications"), dan disimpan per scope sampai 60 detik sebelum kedaluwarsa. Bentuk setiap permintaan mengikuti dokumentasi resmi (lihat Keputusan teknis "Bentuk API"). Semua jawaban, termasuk jaringan putus, menjadi `HasilPanggilan` dengan pesan yang menunjuk perbaikannya (403 menyarankan memeriksa akun layanan sebagai Owner properti; 429 dan `RESOURCE_EXHAUSTED` ditandai `kuotaHabis`).

`INDEXER_ADAPTER` memilih adapter: `asli` di produksi, `palsu` di pratinjau dan E2E, kosong di dev dan tes berarti palsu. Build produksi yang dijalankan tanpa nilai itu melempar galat yang jelas (pola pengaman yang sama dengan kredensial Cloudinary di Rencana 2). Tes unit memakai kunci RSA sekali pakai dari `generateKeyPairSync` dan `fetch` tiruan yang mencatat setiap permintaan, jadi bentuk URL, metode, header, dan badan diperiksa tanpa jaringan.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/indexer-adapter.test.ts`

  ```ts
  import { createVerify, generateKeyPairSync } from 'crypto'
  import { describe, expect, it } from 'vitest'

  import { adapterDariEnv } from '@/modules/indexer/adapter'
  import { adapterAsli, URL_INDEXING_API, URL_INDEXNOW, URL_INSPEKSI } from '@/modules/indexer/asli'
  import { bacaAkunLayanan, buatJwt, SCOPE_INDEXING, SCOPE_WEBMASTERS, URL_TOKEN, type Fetch } from '@/modules/indexer/google'
  import { adapterPalsu } from '@/modules/indexer/palsu'

  // Kunci RSA sekali pakai untuk tes: bentuknya sama dengan `private_key` di file JSON akun layanan.
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  })
  const AKUN = { client_email: 'indexer@point-lat.iam.gserviceaccount.com', private_key: privateKey }

  type Permintaan = { url: string; method: string; headers: Record<string, string>; body: string | null }

  /** `fetch` tiruan: mencatat permintaan dan menjawab dari daftar (token dulu, lalu API). */
  function fetchTiruan(...jawaban: (Response | Error)[]) {
    const permintaan: Permintaan[] = []
    const ambil: Fetch = async (input, init) => {
      permintaan.push({
        url: String(input),
        method: init?.method ?? 'GET',
        headers: Object.fromEntries(new Headers(init?.headers).entries()),
        body: (init?.body as string | undefined) ?? null,
      })
      const berikut = jawaban.shift()
      if (!berikut) throw new Error('Permintaan tidak terduga')
      if (berikut instanceof Error) throw berikut
      return berikut
    }
    return { ambil, permintaan }
  }

  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
  const token = (access_token = 'token-1') => json({ access_token, expires_in: 3599, token_type: 'Bearer' })

  describe('akun layanan Google tanpa pustaka', () => {
    it('membaca file kunci JSON dari env, atau menjelaskan kenapa tidak bisa', () => {
      expect(bacaAkunLayanan(JSON.stringify({ type: 'service_account', ...AKUN }))).toEqual(AKUN)
      expect(bacaAkunLayanan(undefined)).toEqual({ alasan: 'Akun layanan Google belum diatur (env GOOGLE_SERVICE_ACCOUNT_JSON kosong).' })
      expect(bacaAkunLayanan('{"client_email":"a@b"}')).toEqual({
        alasan: 'GOOGLE_SERVICE_ACCOUNT_JSON bukan file kunci JSON akun layanan (client_email dan private_key tidak ditemukan).',
      })
    })

    it('JWT RS256: klaim iss, scope, aud, iat, exp 1 jam, dan tanda tangan sah', () => {
      const jwt = buatJwt(AKUN, SCOPE_WEBMASTERS, 1_793_000_000)
      const [kepala, klaim, tanda] = jwt.split('.')
      expect(JSON.parse(Buffer.from(kepala, 'base64url').toString())).toEqual({ alg: 'RS256', typ: 'JWT' })
      expect(JSON.parse(Buffer.from(klaim, 'base64url').toString())).toEqual({
        iss: AKUN.client_email,
        scope: SCOPE_WEBMASTERS,
        aud: URL_TOKEN,
        iat: 1_793_000_000,
        exp: 1_793_003_600,
      })
      expect(createVerify('RSA-SHA256').update(`${kepala}.${klaim}`).verify(publicKey, tanda, 'base64url')).toBe(true)
    })

    it('token ditukar sekali per scope dan dipakai ulang sampai hampir kedaluwarsa', async () => {
      let jam = 1_793_000_000_000
      const { ambil, permintaan } = fetchTiruan(token('token-1'), new Response(null, { status: 200 }), new Response(null, { status: 200 }), token('token-2'), new Response(null, { status: 200 }))
      const adapter = adapterAsli({ akun: AKUN, fetch: ambil, sekarang: () => jam })
      await adapter.searchConsole.kirimSitemap('sc-domain:point.lat', 'https://point.lat/sitemap.xml')
      await adapter.searchConsole.kirimSitemap('sc-domain:point.lat', 'https://point.lat/sitemap.xml')
      jam += 3600 * 1000
      await adapter.searchConsole.kirimSitemap('sc-domain:point.lat', 'https://point.lat/sitemap.xml')
      expect(permintaan.map((p) => p.url.split('?')[0].slice(0, 40))).toEqual([
        URL_TOKEN,
        'https://www.googleapis.com/webmasters/v3',
        'https://www.googleapis.com/webmasters/v3',
        URL_TOKEN,
        'https://www.googleapis.com/webmasters/v3',
      ])
      expect(permintaan[0]).toMatchObject({ method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' } })
      const form = new URLSearchParams(permintaan[0].body ?? '')
      expect(form.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:jwt-bearer')
      expect(form.get('assertion')?.split('.')).toHaveLength(3)
      expect(permintaan[4].headers.authorization).toBe('Bearer token-2')
    })

    it('akun ditolak Google: gagal dengan pesan yang menunjuk env', async () => {
      const { ambil } = fetchTiruan(json({ error: 'invalid_grant', error_description: 'Invalid JWT Signature.' }, 400))
      const hasil = await adapterAsli({ akun: AKUN, fetch: ambil }).searchConsole.kirimSitemap('sc-domain:point.lat', 'https://point.lat/sitemap.xml')
      expect(hasil).toEqual({
        status: 'gagal',
        kodeHttp: 400,
        pesan: 'Google menolak akun layanan (400 invalid_grant: Invalid JWT Signature). Periksa isi GOOGLE_SERVICE_ACCOUNT_JSON.',
      })
    })
  })

  describe('Search Console API', () => {
    it('sitemaps.submit: PUT ke sites/{siteUrl}/sitemaps/{feedpath} tanpa badan', async () => {
      const { ambil, permintaan } = fetchTiruan(token(), new Response(null, { status: 200 }))
      const hasil = await adapterAsli({ akun: AKUN, fetch: ambil }).searchConsole.kirimSitemap('sc-domain:point.lat', 'https://point.lat/sitemap.xml')
      expect(permintaan[1]).toEqual({
        url: 'https://www.googleapis.com/webmasters/v3/sites/sc-domain%3Apoint.lat/sitemaps/https%3A%2F%2Fpoint.lat%2Fsitemap.xml',
        method: 'PUT',
        headers: { authorization: 'Bearer token-1' },
        body: null,
      })
      expect(hasil).toEqual({ status: 'berhasil', kodeHttp: 200, pesan: 'Search Console menerima sitemap index.' })
    })

    it('urlInspection.index.inspect: POST inspectionUrl dan siteUrl, hasil indexStatusResult', async () => {
      const { ambil, permintaan } = fetchTiruan(
        token(),
        json({
          inspectionResult: {
            inspectionResultLink: 'https://search.google.com/search-console/inspect?resource_id=sc-domain:point.lat&id=abc',
            indexStatusResult: {
              verdict: 'NEUTRAL',
              coverageState: 'Discovered - currently not indexed',
              robotsTxtState: 'ALLOWED',
              indexingState: 'INDEXING_ALLOWED',
              pageFetchState: 'PAGE_FETCH_STATE_UNSPECIFIED',
            },
          },
        }),
      )
      const hasil = await adapterAsli({ akun: AKUN, fetch: ambil }).searchConsole.periksaUrl('sc-domain:point.lat', 'https://point.lat/gaji')
      expect(permintaan[1]).toMatchObject({ url: URL_INSPEKSI, method: 'POST', headers: { 'content-type': 'application/json' } })
      expect(JSON.parse(permintaan[1].body ?? '')).toEqual({ inspectionUrl: 'https://point.lat/gaji', siteUrl: 'sc-domain:point.lat' })
      expect(hasil).toEqual({
        status: 'berhasil',
        kodeHttp: 200,
        pesan: 'Hasil inspeksi diterima.',
        indeks: {
          verdict: 'NEUTRAL',
          coverageState: 'Discovered - currently not indexed',
          pageFetchState: 'PAGE_FETCH_STATE_UNSPECIFIED',
          lastCrawlTime: null,
          tautan: 'https://search.google.com/search-console/inspect?resource_id=sc-domain:point.lat&id=abc',
        },
      })
    })

    it('403 memberi saran pemilik properti; galat jaringan tanpa kode HTTP', async () => {
      const { ambil } = fetchTiruan(token(), json({ error: { code: 403, message: 'User does not have sufficient permission for site.', status: 'PERMISSION_DENIED' } }, 403), new Error('connect ETIMEDOUT'))
      const adapter = adapterAsli({ akun: AKUN, fetch: ambil })
      expect(await adapter.searchConsole.periksaUrl('sc-domain:point.lat', 'https://point.lat/gaji')).toEqual({
        status: 'gagal',
        kodeHttp: 403,
        kuotaHabis: false,
        pesan:
          'Google menjawab 403: User does not have sufficient permission for site. Pastikan email akun layanan terdaftar sebagai pemilik (Owner) properti di Search Console dan API-nya sudah diaktifkan di Google Cloud.',
      })
      expect(await adapter.searchConsole.periksaUrl('sc-domain:point.lat', 'https://point.lat/gaji')).toEqual({
        status: 'gagal',
        kodeHttp: null,
        pesan: 'Tidak bisa menghubungi Google: connect ETIMEDOUT.',
      })
    })
  })

  describe('Google Indexing API', () => {
    it('urlNotifications.publish: POST url dan type; 429 berarti kuota habis', async () => {
      const { ambil, permintaan } = fetchTiruan(token(), json({ urlNotificationMetadata: { url: 'https://point.lat/gaji' } }), json({ error: { code: 429, message: 'Quota exceeded', status: 'RESOURCE_EXHAUSTED' } }, 429))
      const adapter = adapterAsli({ akun: AKUN, fetch: ambil })
      expect(await adapter.googleIndexing.kabari('https://point.lat/gaji', 'URL_UPDATED')).toEqual({ status: 'berhasil', kodeHttp: 200, pesan: 'Indexing API menerima URL_UPDATED.' })
      const assertion = new URLSearchParams(permintaan[0].body ?? '').get('assertion') ?? ''
      expect(JSON.parse(Buffer.from(assertion.split('.')[1], 'base64url').toString()).scope).toBe(SCOPE_INDEXING)
      expect(permintaan[1]).toMatchObject({ url: URL_INDEXING_API, method: 'POST' })
      expect(JSON.parse(permintaan[1].body ?? '')).toEqual({ url: 'https://point.lat/gaji', type: 'URL_UPDATED' })
      expect(await adapter.googleIndexing.kabari('https://point.lat/lama', 'URL_DELETED')).toMatchObject({ status: 'gagal', kodeHttp: 429, kuotaHabis: true })
    })

    it('tanpa akun layanan: semua langkah Google dilewati tanpa permintaan', async () => {
      const { ambil, permintaan } = fetchTiruan()
      const adapter = adapterAsli({ akun: bacaAkunLayanan(''), fetch: ambil })
      const dilewati = { status: 'dilewati', pesan: 'Akun layanan Google belum diatur (env GOOGLE_SERVICE_ACCOUNT_JSON kosong).' }
      expect(await adapter.googleIndexing.kabari('https://point.lat/gaji', 'URL_UPDATED')).toEqual(dilewati)
      expect(await adapter.searchConsole.kirimSitemap('sc-domain:point.lat', 'https://point.lat/sitemap.xml')).toEqual(dilewati)
      expect(permintaan).toEqual([])
    })
  })

  describe('IndexNow', () => {
    const kiriman = { host: 'point.lat', key: 'kunci-point-2026', keyLocation: 'https://point.lat/kunci-point-2026.txt', urlList: ['https://point.lat/gaji', 'https://point.lat/thr'] }

    it('POST JSON ke api.indexnow.org/indexnow; 202 berarti kunci sedang divalidasi', async () => {
      const { ambil, permintaan } = fetchTiruan(new Response(null, { status: 202 }))
      expect(await adapterAsli({ akun: AKUN, fetch: ambil }).indexNow.kirim(kiriman)).toEqual({
        status: 'berhasil',
        kodeHttp: 202,
        pesan: 'IndexNow menerima daftar URL; kunci sedang divalidasi.',
      })
      expect(permintaan).toEqual([{ url: URL_INDEXNOW, method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(kiriman) }])
    })

    it('403 dan 422 dijelaskan', async () => {
      const { ambil } = fetchTiruan(new Response(null, { status: 403 }), new Response(null, { status: 422 }))
      const adapter = adapterAsli({ akun: AKUN, fetch: ambil })
      expect((await adapter.indexNow.kirim(kiriman)).pesan).toBe('IndexNow menolak kunci (403). Pastikan file kunci bisa dibuka dan isinya sama dengan kunci di pengaturan SEO.')
      expect(await adapter.indexNow.kirim(kiriman)).toEqual({ status: 'gagal', kodeHttp: 422, pesan: 'IndexNow menolak URL (422): URL harus di host situs dan kunci harus cocok.' })
    })
  })

  describe('adapter palsu dan pemilihan adapter', () => {
    it('palsu mencatat panggilan, menjawab berhasil, dan bisa diatur gagal per aksi', async () => {
      const palsu = adapterPalsu()
      palsu.jawab('kirimIndexNow', { status: 'gagal', kodeHttp: 503, pesan: 'Tidak tersedia' })
      expect((await palsu.indexNow.kirim({ host: 'point.lat', key: 'k', keyLocation: 'l', urlList: ['u'] })).status).toBe('gagal')
      expect((await palsu.indexNow.kirim({ host: 'point.lat', key: 'k', keyLocation: 'l', urlList: ['u'] })).status).toBe('berhasil')
      const inspeksi = await palsu.searchConsole.periksaUrl('sc-domain:point.lat', 'https://point.lat/gaji')
      expect(inspeksi.status === 'berhasil' && inspeksi.indeks?.coverageState).toBe('URL is unknown to Google')
      expect(palsu.panggilan.map((p) => p.aksi)).toEqual(['kirimIndexNow', 'kirimIndexNow', 'periksaUrl'])
      expect(palsu.searchConsole.nama).toBe('palsu')
    })

    it('INDEXER_ADAPTER memilih asli atau palsu; produksi tanpa pilihan ditolak', () => {
      expect(adapterDariEnv({ INDEXER_ADAPTER: 'asli' }).searchConsole.nama).toBe('searchConsole')
      expect(adapterDariEnv({ INDEXER_ADAPTER: 'palsu', NODE_ENV: 'production' }).searchConsole.nama).toBe('palsu')
      expect(adapterDariEnv({ NODE_ENV: 'test' }).indexNow.nama).toBe('palsu')
      expect(() => adapterDariEnv({ NODE_ENV: 'production' })).toThrow('INDEXER_ADAPTER wajib diisi di produksi')
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/indexer-adapter.test.ts` dengan `Error: Cannot find package '@/modules/indexer/adapter'`.

- [ ] **Langkah 3: Seam adapter dan pemilihannya**

  `src/modules/indexer/adapter.ts`

  ```ts
  import { adapterAsli } from './asli'
  import { bacaAkunLayanan } from './google'
  import { adapterPalsu } from './palsu'
  import type { HasilPanggilan, NamaAdapter } from './tipe'

  /**
   * Seam modul indexer (spesifikasi §5): tiga adapter layanan luar dengan antarmuka yang sama untuk
   * versi asli (`asli.ts`, lewat `fetch`) dan versi palsu (`palsu.ts`, dalam memori untuk tes dan dev).
   * Adapter tidak pernah melempar galat: semua jawaban, termasuk galat jaringan, menjadi `HasilPanggilan`.
   */

  /** Badan POST IndexNow (dokumentasi IndexNow, nama field sama dengan API). */
  export type KirimanIndexNow = { host: string; key: string; keyLocation: string; urlList: string[] }

  export type JenisIndexingApi = 'URL_UPDATED' | 'URL_DELETED'

  export type AdapterIndexer = {
    searchConsole: {
      nama: NamaAdapter
      /** `sitemaps.submit`: mendaftarkan atau mengirim ulang sitemap index ke properti. */
      kirimSitemap(properti: string, urlSitemap: string): Promise<HasilPanggilan>
      /** `urlInspection.index.inspect`: status indeks satu URL, hasilnya di `indeks`. */
      periksaUrl(properti: string, url: string): Promise<HasilPanggilan>
    }
    indexNow: {
      nama: NamaAdapter
      kirim(kiriman: KirimanIndexNow): Promise<HasilPanggilan>
    }
    googleIndexing: {
      nama: NamaAdapter
      /** `urlNotifications.publish`. */
      kabari(url: string, jenis: JenisIndexingApi): Promise<HasilPanggilan>
    }
  }

  /**
   * Memilih adapter dari env server. `INDEXER_ADAPTER=asli` (produksi Vercel) memanggil Google dan
   * IndexNow; akun layanan dibaca dari `GOOGLE_SERVICE_ACCOUNT_JSON`, dan tanpa akun itu langkah Google
   * dilewati dengan pesan di log. `palsu` (atau kosong di dev dan tes) tidak memanggil jaringan. Di build
   * produksi yang dijalankan (`next start`, termasuk deploy pratinjau) env ini wajib diisi supaya mode
   * tidak pernah tertebak.
   */
  export function adapterDariEnv(env: Record<string, string | undefined> = process.env): AdapterIndexer {
    if (env.INDEXER_ADAPTER === 'asli') return adapterAsli({ akun: bacaAkunLayanan(env.GOOGLE_SERVICE_ACCOUNT_JSON) })
    if (env.INDEXER_ADAPTER === 'palsu') return adapterPalsu()
    if (env.NODE_ENV === 'production' && env.NEXT_PHASE !== 'phase-production-build') {
      throw new Error('INDEXER_ADAPTER wajib diisi di produksi: asli (situs live) atau palsu (pratinjau dan uji lokal).')
    }
    return adapterPalsu()
  }

  let adapter: AdapterIndexer | undefined

  /** Adapter bersama untuk satu proses. Tes menggantinya lewat `pakaiAdapterIndexer`. */
  export function adapterIndexer(): AdapterIndexer {
    adapter ??= adapterDariEnv()
    return adapter
  }

  /** Mengganti adapter (tes). `null` kembali ke adapter dari env. */
  export function pakaiAdapterIndexer(baru: AdapterIndexer | null): void {
    adapter = baru ?? undefined
  }
  ```

- [ ] **Langkah 4: Akun layanan Google tanpa pustaka**

  `src/modules/indexer/google.ts`

  ```ts
  import { createSign } from 'crypto'

  /**
   * Otorisasi akun layanan Google tanpa pustaka (dokumentasi "Using OAuth 2.0 for Server to Server
   * Applications"): JWT RS256 ditandatangani kunci privat akun layanan, ditukar dengan token akses di
   * `oauth2.googleapis.com/token`. Token disimpan sampai satu menit sebelum kedaluwarsa.
   */

  export const URL_TOKEN = 'https://oauth2.googleapis.com/token'
  export const SCOPE_WEBMASTERS = 'https://www.googleapis.com/auth/webmasters'
  export const SCOPE_INDEXING = 'https://www.googleapis.com/auth/indexing'

  /** Bagian file kunci JSON akun layanan yang dipakai. */
  export type AkunLayanan = { client_email: string; private_key: string }

  /** Isi env `GOOGLE_SERVICE_ACCOUNT_JSON` (seluruh file kunci JSON), atau alasan bila tidak bisa dipakai. */
  export function bacaAkunLayanan(teks: string | undefined): AkunLayanan | { alasan: string } {
    if (!teks?.trim()) return { alasan: 'Akun layanan Google belum diatur (env GOOGLE_SERVICE_ACCOUNT_JSON kosong).' }
    try {
      const data = JSON.parse(teks) as Partial<AkunLayanan>
      if (typeof data.client_email === 'string' && typeof data.private_key === 'string' && data.private_key.includes('PRIVATE KEY')) {
        return { client_email: data.client_email, private_key: data.private_key }
      }
    } catch {
      // jatuh ke pesan di bawah
    }
    return { alasan: 'GOOGLE_SERVICE_ACCOUNT_JSON bukan file kunci JSON akun layanan (client_email dan private_key tidak ditemukan).' }
  }

  const base64url = (teks: string) => Buffer.from(teks).toString('base64url')

  /** JWT untuk permintaan token: berlaku 1 jam (batas maksimal Google) sejak `iat` (detik). */
  export function buatJwt(akun: AkunLayanan, scope: string, iat: number): string {
    const kepala = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    const klaim = base64url(JSON.stringify({ iss: akun.client_email, scope, aud: URL_TOKEN, iat, exp: iat + 3600 }))
    const tanda = createSign('RSA-SHA256').update(`${kepala}.${klaim}`).sign(akun.private_key).toString('base64url')
    return `${kepala}.${klaim}.${tanda}`
  }

  export type Fetch = typeof fetch

  /** Batas tunggu setiap permintaan ke layanan luar. */
  export const BATAS_TUNGGU_MS = 15_000

  export type PenyediaToken = (scope: string) => Promise<{ token: string } | { galat: string; kodeHttp: number | null }>

  /** Penyedia token akses per scope dengan cache dalam memori proses. */
  export function penyediaToken(akun: AkunLayanan, opsi: { fetch: Fetch; sekarang?: () => number }): PenyediaToken {
    const sekarang = opsi.sekarang ?? Date.now
    const simpanan = new Map<string, { token: string; sampai: number }>()
    return async (scope) => {
      const ada = simpanan.get(scope)
      if (ada && ada.sampai > sekarang()) return { token: ada.token }
      const iat = Math.floor(sekarang() / 1000)
      try {
        const jawaban = await opsi.fetch(URL_TOKEN, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: buatJwt(akun, scope, iat) }).toString(),
          signal: AbortSignal.timeout(BATAS_TUNGGU_MS),
        })
        const data = (await jawaban.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string; error_description?: string }
        if (!jawaban.ok || !data.access_token) {
          const sebab = [data.error, data.error_description?.replace(/\.$/, '')].filter(Boolean).join(': ')
          return { galat: `Google menolak akun layanan (${jawaban.status}${sebab ? ` ${sebab}` : ''}). Periksa isi GOOGLE_SERVICE_ACCOUNT_JSON.`, kodeHttp: jawaban.status }
        }
        simpanan.set(scope, { token: data.access_token, sampai: sekarang() + ((data.expires_in ?? 3600) - 60) * 1000 })
        return { token: data.access_token }
      } catch (galat) {
        return { galat: `Tidak bisa meminta token Google: ${(galat as Error).message}.`, kodeHttp: null }
      }
    }
  }
  ```

- [ ] **Langkah 5: Adapter asli dan adapter palsu**

  `src/modules/indexer/asli.ts`

  ```ts
  import type { AdapterIndexer, KirimanIndexNow } from './adapter'
  import { BATAS_TUNGGU_MS, penyediaToken, SCOPE_INDEXING, SCOPE_WEBMASTERS, type AkunLayanan, type Fetch } from './google'
  import type { HasilIndeks, HasilPanggilan } from './tipe'

  /**
   * Adapter asli (lewat `fetch`, tanpa pustaka Google). Bentuk permintaan dan jawaban mengikuti
   * dokumentasi resmi: Search Console API (`sitemaps.submit`, `urlInspection.index.inspect`), Indexing
   * API (`urlNotifications.publish`), dan IndexNow (POST JSON ke api.indexnow.org).
   */

  export const URL_SEARCH_CONSOLE = 'https://www.googleapis.com/webmasters/v3'
  export const URL_INSPEKSI = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect'
  export const URL_INDEXING_API = 'https://indexing.googleapis.com/v3/urlNotifications:publish'
  export const URL_INDEXNOW = 'https://api.indexnow.org/indexnow'

  type GalatGoogle = { error?: { code?: number; message?: string; status?: string } }

  const SARAN_403 =
    ' Pastikan email akun layanan terdaftar sebagai pemilik (Owner) properti di Search Console dan API-nya sudah diaktifkan di Google Cloud.'

  /** Galat dari API Google. 429 atau `RESOURCE_EXHAUSTED` berarti kuota habis (ditunda ke hari berikutnya). */
  function galatGoogle(kodeHttp: number, data: GalatGoogle): HasilPanggilan {
    const pesan = data.error?.message?.slice(0, 300).replace(/\.$/, '')
    const kuotaHabis = kodeHttp === 429 || data.error?.status === 'RESOURCE_EXHAUSTED'
    return {
      status: 'gagal',
      kodeHttp,
      kuotaHabis,
      pesan: `Google menjawab ${kodeHttp}${pesan ? `: ${pesan}` : ''}.${kodeHttp === 403 ? SARAN_403 : ''}`,
    }
  }

  const PESAN_INDEXNOW: Record<number, string> = {
    200: 'IndexNow menerima daftar URL.',
    202: 'IndexNow menerima daftar URL; kunci sedang divalidasi.',
    400: 'IndexNow menolak format kiriman (400).',
    403: 'IndexNow menolak kunci (403). Pastikan file kunci bisa dibuka dan isinya sama dengan kunci di pengaturan SEO.',
    422: 'IndexNow menolak URL (422): URL harus di host situs dan kunci harus cocok.',
    429: 'IndexNow membatasi kiriman (429). Dicoba lagi nanti.',
  }

  export type OpsiAdapterAsli = {
    /** Akun layanan dari `bacaAkunLayanan`, atau alasan tidak ada (langkah Google dilewati). */
    akun: AkunLayanan | { alasan: string }
    fetch?: Fetch
    sekarang?: () => number
  }

  export function adapterAsli(opsi: OpsiAdapterAsli): AdapterIndexer {
    const ambil = opsi.fetch ?? fetch
    const token = 'alasan' in opsi.akun ? null : penyediaToken(opsi.akun, { fetch: ambil, sekarang: opsi.sekarang })
    const alasan = 'alasan' in opsi.akun ? opsi.akun.alasan : ''

    async function google(
      scope: string,
      url: string,
      metode: 'PUT' | 'POST',
      badan: unknown,
      berhasil: (data: Record<string, unknown>, kodeHttp: number) => HasilPanggilan,
    ): Promise<HasilPanggilan> {
      if (!token) return { status: 'dilewati', pesan: alasan }
      const akses = await token(scope)
      if ('galat' in akses) return { status: 'gagal', kodeHttp: akses.kodeHttp, pesan: akses.galat }
      try {
        const jawaban = await ambil(url, {
          method: metode,
          headers: { Authorization: `Bearer ${akses.token}`, ...(badan ? { 'Content-Type': 'application/json' } : {}) },
          body: badan ? JSON.stringify(badan) : undefined,
          signal: AbortSignal.timeout(BATAS_TUNGGU_MS),
        })
        const teks = await jawaban.text()
        let data: Record<string, unknown> = {}
        try {
          data = teks ? (JSON.parse(teks) as Record<string, unknown>) : {}
        } catch {
          // jawaban bukan JSON: cukup kode HTTP-nya
        }
        return jawaban.ok ? berhasil(data, jawaban.status) : galatGoogle(jawaban.status, data as GalatGoogle)
      } catch (galat) {
        return { status: 'gagal', kodeHttp: null, pesan: `Tidak bisa menghubungi Google: ${(galat as Error).message}.` }
      }
    }

    return {
      searchConsole: {
        nama: 'searchConsole',
        kirimSitemap: (properti, urlSitemap) =>
          google(
            SCOPE_WEBMASTERS,
            `${URL_SEARCH_CONSOLE}/sites/${encodeURIComponent(properti)}/sitemaps/${encodeURIComponent(urlSitemap)}`,
            'PUT',
            null,
            (_data, kodeHttp) => ({ status: 'berhasil', kodeHttp, pesan: 'Search Console menerima sitemap index.' }),
          ),
        periksaUrl: (properti, url) =>
          google(SCOPE_WEBMASTERS, URL_INSPEKSI, 'POST', { inspectionUrl: url, siteUrl: properti }, (data, kodeHttp) => {
            const hasil = (data.inspectionResult ?? {}) as { inspectionResultLink?: string; indexStatusResult?: Record<string, string> }
            const status = hasil.indexStatusResult ?? {}
            const indeks: HasilIndeks = {
              verdict: status.verdict ?? null,
              coverageState: status.coverageState ?? null,
              pageFetchState: status.pageFetchState ?? null,
              lastCrawlTime: status.lastCrawlTime ?? null,
              tautan: hasil.inspectionResultLink ?? null,
            }
            return { status: 'berhasil', kodeHttp, pesan: 'Hasil inspeksi diterima.', indeks }
          }),
      },
      indexNow: {
        nama: 'indexNow',
        async kirim(kiriman: KirimanIndexNow) {
          try {
            const jawaban = await ambil(URL_INDEXNOW, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json; charset=utf-8' },
              body: JSON.stringify(kiriman),
              signal: AbortSignal.timeout(BATAS_TUNGGU_MS),
            })
            const pesan = PESAN_INDEXNOW[jawaban.status] ?? `IndexNow menjawab ${jawaban.status}.`
            return jawaban.ok ? { status: 'berhasil', kodeHttp: jawaban.status, pesan } : { status: 'gagal', kodeHttp: jawaban.status, pesan }
          } catch (galat) {
            return { status: 'gagal', kodeHttp: null, pesan: `Tidak bisa menghubungi IndexNow: ${(galat as Error).message}.` }
          }
        },
      },
      googleIndexing: {
        nama: 'googleIndexing',
        kabari: (url, jenis) =>
          google(SCOPE_INDEXING, URL_INDEXING_API, 'POST', { url, type: jenis }, (_data, kodeHttp) => ({
            status: 'berhasil',
            kodeHttp,
            pesan: `Indexing API menerima ${jenis}.`,
          })),
      },
    }
  }
  ```

  `src/modules/indexer/palsu.ts`

  ```ts
  import type { AdapterIndexer, JenisIndexingApi, KirimanIndexNow } from './adapter'
  import type { HasilIndeks, HasilPanggilan } from './tipe'

  export type AksiPalsu = 'kirimSitemap' | 'periksaUrl' | 'kirimIndexNow' | 'kabariGoogle'

  export type PanggilanPalsu =
    | { aksi: 'kirimSitemap'; properti: string; url: string }
    | { aksi: 'periksaUrl'; properti: string; url: string }
    | { aksi: 'kirimIndexNow'; kiriman: KirimanIndexNow }
    | { aksi: 'kabariGoogle'; url: string; jenis: JenisIndexingApi }

  export type AdapterPalsu = AdapterIndexer & {
    /** Semua panggilan, berurutan. Tes memeriksa isi ini. */
    readonly panggilan: PanggilanPalsu[]
    /** Hasil inspeksi per URL. URL lain: belum dikenal Google. */
    readonly indeks: Map<string, HasilIndeks>
    /** Jawaban untuk panggilan berikutnya dari aksi itu, berurutan. Tanpa antrean jawaban: berhasil. */
    jawab(aksi: AksiPalsu, ...hasil: HasilPanggilan[]): void
    /** Mengosongkan panggilan, jawaban, dan hasil inspeksi. */
    reset(): void
  }

  const BELUM_DIKENAL: HasilIndeks = { verdict: 'NEUTRAL', coverageState: 'URL is unknown to Google', pageFetchState: null, lastCrawlTime: null, tautan: null }

  /**
   * Adapter dalam memori untuk tes dan pengembangan (spesifikasi §5, adapter `palsu`). Tidak memanggil
   * jaringan; log mencatat adapter `palsu`, jadi kiriman palsu tidak tertukar dengan kiriman asli.
   */
  export function adapterPalsu(): AdapterPalsu {
    const panggilan: PanggilanPalsu[] = []
    const indeks = new Map<string, HasilIndeks>()
    const antrean = new Map<AksiPalsu, HasilPanggilan[]>()

    const jawaban = (aksi: AksiPalsu, bawaan: HasilPanggilan): HasilPanggilan => antrean.get(aksi)?.shift() ?? bawaan

    return {
      panggilan,
      indeks,
      jawab(aksi, ...hasil) {
        antrean.set(aksi, [...(antrean.get(aksi) ?? []), ...hasil])
      },
      reset() {
        panggilan.length = 0
        indeks.clear()
        antrean.clear()
      },
      searchConsole: {
        nama: 'palsu',
        async kirimSitemap(properti, url) {
          panggilan.push({ aksi: 'kirimSitemap', properti, url })
          return jawaban('kirimSitemap', { status: 'berhasil', kodeHttp: 200, pesan: 'Sitemap index diterima (adapter palsu).' })
        },
        async periksaUrl(properti, url) {
          panggilan.push({ aksi: 'periksaUrl', properti, url })
          return jawaban('periksaUrl', {
            status: 'berhasil',
            kodeHttp: 200,
            pesan: 'Hasil inspeksi diterima (adapter palsu).',
            indeks: indeks.get(url) ?? BELUM_DIKENAL,
          })
        },
      },
      indexNow: {
        nama: 'palsu',
        async kirim(kiriman) {
          panggilan.push({ aksi: 'kirimIndexNow', kiriman })
          return jawaban('kirimIndexNow', { status: 'berhasil', kodeHttp: 200, pesan: 'Daftar URL diterima (adapter palsu).' })
        },
      },
      googleIndexing: {
        nama: 'palsu',
        async kabari(url, jenis) {
          panggilan.push({ aksi: 'kabariGoogle', url, jenis })
          return jawaban('kabariGoogle', { status: 'berhasil', kodeHttp: 200, pesan: `${jenis} diterima (adapter palsu).` })
        },
      },
    }
  }
  ```

- [ ] **Langkah 6: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 54 passed (54)`, `Tests 379 passed (379)`; integrasi `Test Files 27 passed (27)`, `Tests 79 passed (79)`; E2E `89 passed`.

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/modules/indexer/adapter.ts src/modules/indexer/google.ts src/modules/indexer/asli.ts src/modules/indexer/palsu.ts tests/unit/indexer-adapter.test.ts
  git commit -m "feat(indexer): adapter Search Console, Indexing API, dan IndexNow lewat fetch dengan akun layanan Google tanpa pustaka, dan adapter palsu"
  ```

---

### Task 4: Antrean, log, dan status indeks di Postgres, dan `kabari()`

**Files:**
- Create: `src/collections/AntreanIndexing.ts`, `src/collections/LogIndexing.ts`, `src/collections/StatusIndeks.ts`, `src/modules/indexer/antrean.ts`, `src/modules/indexer/index.ts`
- Modify: `src/access/index.ts`, `src/payload.config.ts`, `src/payload-types.ts` (dibuat ulang), `tests/e2e/siapkan.ts`
- Test: `tests/int/indexer-antrean.int.spec.ts`

**Interfaces:**
- Consumes: `rencanaKabar`, `gabungBaris`, tipe dan label (Task 2); `urlAbsolut` (`src/modules/seo/dokumen.ts`); `isAdmin` (`src/access`).
- Produces:
  - Akses `nobody` di `src/access/index.ts` (koleksi yang hanya ditulis sistem lewat Local API).
  - Koleksi `antrean-indexing` (`kunci` unik, `langkah`, `path`, `jenis`, `jadwal`, `percobaan`, `tahap`, `dasar`, `versi`), `log-indexing` (`waktu`, `url`, `jenis`, `langkah`, `adapter`, `status`, `kodeHttp`, `pesan`, `percobaan`), `status-indeks` (`path` unik, `status`, `detail`, `tautanInspeksi`, `dirayapiPada`, `cekTerakhir`, `cekBerikutnya`). Semua: baca dan hapus hanya admin.
  - `antrean.ts`: `kunciAntrean(langkah, path)`, `BarisTersimpan`, `dariDokumen(doc)`, `simpanBaris(payload, baris, req?)` (dedup lewat `gabungBaris`), `batalkanBaris(payload, langkah, path, req?)`, `EntriLog`, `catatLog(payload, entri, req?)`, `DataStatus`, `catatStatus(payload, path, data, req?)` (dibuat bila belum ada), `hapusStatus(payload, path, req?)`, `ambilPengaturanIndexing(payload, req?): PengaturanIndexing`. Task 5 menambah fungsi pelari antrean di file ini.
  - `@/modules/indexer`: `kabari(payload, kabar: Kabar[], { req?, sekarang? }): Promise<void>`, tipe `JenisKabar`, `Kabar`, `StatusIndeks`.

`kabari` adalah pintu masuk modul untuk hook koleksi (Task 6). Untuk setiap kabar ia mencatat langkah 1 (revalidasi, sudah dikerjakan hook `revalidasiPublik` saat simpan) di log, memasukkan langkah berikutnya ke antrean menurut `rencanaKabar`, membatalkan cek status untuk path yang dihapus atau pindah, dan menyiapkan baris status indeks "Belum dicek" dengan jadwal cek pertama. `req` diteruskan supaya antrean dan log ikut transaksi simpan dokumen: bila simpan gagal, kabarnya ikut batal. `simpanBaris` memperbarui baris lewat `where` (bukan `id`), jadi bila pelari antrean baru saja menyelesaikan baris yang sama, tidak ada galat dan baris dibuat lagi.

Ketiga koleksi tampil di grup SEO admin. Antrean dan log hanya bisa dibaca dan dihapus admin (menghapus baris antrean membatalkan kabar), dan hanya modul indexer yang menulisnya (`create` dan `update` memakai akses `nobody`; Local API melewati akses).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/int/indexer-antrean.int.spec.ts`

  ```ts
  import type { Payload } from 'payload'
  import { afterAll, describe, expect, it } from 'vitest'

  import { kabari } from '@/modules/indexer'

  import { getTestPayload, unik } from './helpers'

  const SEKARANG = new Date('2026-11-05T03:00:00.000Z')

  async function antrean(payload: Payload, path: string) {
    const { docs } = await payload.find({ collection: 'antrean-indexing', where: { path: { in: [path, '/sitemap.xml'] } }, depth: 0 })
    return docs
      .map((d) => ({ langkah: d.langkah, path: d.path, jenis: d.jenis, jadwal: d.jadwal, versi: d.versi }))
      .sort((a, b) => a.langkah.localeCompare(b.langkah))
  }

  async function status(payload: Payload, path: string) {
    return (await payload.find({ collection: 'status-indeks', where: { path: { equals: path } }, depth: 0 })).docs[0]
  }

  describe('kabari: antrean, log revalidasi, dan status indeks', () => {
    afterAll(async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { pakaiIndexingApi: false } } })
    })

    it('terbit: log revalidasi, antrean sitemap, IndexNow, dan cek status +6 jam, status Belum dicek', async () => {
      const payload = await getTestPayload()
      const path = `/${unik('gaji')}`
      await kabari(payload, [{ path, jenis: 'terbit' }], { sekarang: SEKARANG })

      const { docs: log } = await payload.find({ collection: 'log-indexing', where: { url: { equals: `https://point.lat${path}` } }, depth: 0 })
      expect(log.map((l) => [l.langkah, l.adapter, l.status, l.jenis, l.waktu])).toEqual([['revalidasi', 'next', 'berhasil', 'terbit', SEKARANG.toISOString()]])

      const baris = await antrean(payload, path)
      expect(baris.filter((b) => b.path === path)).toEqual([
        { langkah: 'cek-status', path, jenis: 'terbit', jadwal: '2026-11-05T09:00:00.000Z', versi: 0 },
        { langkah: 'indexnow', path, jenis: 'terbit', jadwal: SEKARANG.toISOString(), versi: 0 },
      ])
      expect(baris.filter((b) => b.langkah === 'sitemap')).toHaveLength(1)
      expect(await status(payload, path)).toMatchObject({ status: 'belum-dicek', cekBerikutnya: '2026-11-05T09:00:00.000Z' })
    })

    it('dedup: kabar berulang untuk path yang sama tergabung ke satu baris per langkah', async () => {
      const payload = await getTestPayload()
      const path = `/${unik('thr')}`
      await kabari(payload, [{ path, jenis: 'terbit' }], { sekarang: SEKARANG })
      await kabari(payload, [{ path, jenis: 'ubah-besar' }], { sekarang: new Date('2026-11-05T03:02:00.000Z') })
      const baris = (await antrean(payload, path)).filter((b) => b.path === path)
      expect(baris).toEqual([
        { langkah: 'cek-status', path, jenis: 'ubah-besar', jadwal: '2026-11-05T09:02:00.000Z', versi: 1 },
        { langkah: 'indexnow', path, jenis: 'ubah-besar', jadwal: SEKARANG.toISOString(), versi: 1 },
      ])
    })

    it('hapus: IndexNow tetap dikabari, cek status dan status indeks dibuang; Indexing API mengikuti saklar', async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { pakaiIndexingApi: true } } })
      const path = `/${unik('kpr')}`
      await kabari(payload, [{ path, jenis: 'terbit' }], { sekarang: SEKARANG })
      expect((await antrean(payload, path)).map((b) => b.langkah)).toContain('indexing-api')

      await kabari(payload, [{ path, jenis: 'hapus' }], { sekarang: SEKARANG })
      const baris = (await antrean(payload, path)).filter((b) => b.path === path)
      expect(baris.map((b) => [b.langkah, b.jenis])).toEqual([
        ['indexing-api', 'hapus'],
        ['indexnow', 'hapus'],
      ])
      expect(await status(payload, path)).toBeUndefined()

      const pindah = `/${unik('lama')}`
      await kabari(payload, [{ path: pindah, jenis: 'terbit' }], { sekarang: SEKARANG })
      await kabari(payload, [{ path: pindah, jenis: 'pindah' }], { sekarang: SEKARANG })
      expect((await antrean(payload, pindah)).filter((b) => b.path === pindah).map((b) => [b.langkah, b.jenis])).toEqual([['indexnow', 'pindah']])
    })

    it('log, antrean, dan status indeks hanya untuk admin', async () => {
      const payload = await getTestPayload()
      // Pengguna pertama database selalu admin (tetapkanPeranAwal), jadi editor dibuat sesudah satu pengguna lain.
      const pengguna = () => ({ nama: 'Editor', email: `${unik('editor')}@point.lat`, password: 'rahasia-editor-123', peran: 'editor' as const })
      await payload.create({ collection: 'pengguna', data: pengguna() })
      const editor = await payload.create({ collection: 'pengguna', data: pengguna() })
      expect(editor.peran).toBe('editor')
      for (const collection of ['log-indexing', 'antrean-indexing', 'status-indeks'] as const) {
        await expect(payload.find({ collection, overrideAccess: false, user: { ...editor, collection: 'pengguna' } })).rejects.toThrow('You are not allowed to perform this action.')
        await expect(payload.find({ collection, overrideAccess: false })).rejects.toThrow('You are not allowed to perform this action.')
      }
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:int
  ```

  Hasil yang diharapkan: FAIL di `tests/int/indexer-antrean.int.spec.ts` dengan `Error: Cannot find package '@/modules/indexer'`.

- [ ] **Langkah 3: Akses dan koleksi**

  ```diff
  diff --git a/src/access/index.ts b/src/access/index.ts
  index ae45c88..a4da92a 100644
  --- a/src/access/index.ts
  +++ b/src/access/index.ts
  @@ -7,6 +7,9 @@ const pengguna = (user: unknown): PenggunaMasuk | undefined =>
   
   export const anyone: Access = () => true
   
  +/** Tidak lewat admin atau REST: koleksi ini hanya ditulis sistem lewat Local API (Mesin Indexing). */
  +export const nobody: Access = () => false
  +
   export const isLoggedIn: Access = ({ req }) => Boolean(req.user)
   
   export const isAdmin: Access = ({ req }) => pengguna(req.user)?.peran === 'admin'
  ```

  `src/collections/AntreanIndexing.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isAdmin, nobody } from '@/access'
  import { JENIS_KABAR, LABEL_JENIS, LABEL_LANGKAH, LANGKAH, type Langkah } from '@/modules/indexer/tipe'

  const LANGKAH_ANTREAN = LANGKAH.filter((l): l is Exclude<Langkah, 'revalidasi'> => l !== 'revalidasi')

  /**
   * Antrean Mesin Indexing (spesifikasi §5: antrean job di Postgres). Satu baris per langkah dan path
   * (`kunci` unik, jadi kabar berulang tergabung), dihapus setelah selesai; riwayatnya di `log-indexing`.
   * Ditulis hanya oleh modul indexer. Admin bisa melihat dan menghapus baris untuk membatalkan kabar.
   */
  export const AntreanIndexing: CollectionConfig = {
    slug: 'antrean-indexing',
    labels: { singular: 'Antrean indexing', plural: 'Antrean indexing' },
    defaultSort: 'jadwal',
    admin: {
      useAsTitle: 'path',
      defaultColumns: ['langkah', 'path', 'jenis', 'jadwal', 'percobaan'],
      group: 'SEO',
      description: 'Kabar yang menunggu dikirim ke mesin pencari. Baris hilang setelah selesai; hasilnya ada di Log indexing.',
    },
    access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
    fields: [
      { name: 'kunci', type: 'text', required: true, unique: true, index: true, admin: { hidden: true } },
      { name: 'langkah', type: 'select', required: true, options: LANGKAH_ANTREAN.map((value) => ({ value, label: LABEL_LANGKAH[value] })) },
      { name: 'path', type: 'text', required: true },
      { name: 'jenis', type: 'select', required: true, options: JENIS_KABAR.map((value) => ({ value, label: LABEL_JENIS[value] })) },
      { name: 'jadwal', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'percobaan', type: 'number', defaultValue: 0, admin: { description: 'Jumlah percobaan yang gagal.' } },
      { name: 'tahap', type: 'number', defaultValue: 0, admin: { description: 'Cek status: 0 = +6 jam, 1 = +24 jam, 2 = +3 hari, 3 = +7 hari.' } },
      { name: 'dasar', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'Cek status: waktu kabar, dasar jadwal.' } },
      { name: 'versi', type: 'number', defaultValue: 0, admin: { hidden: true } },
    ],
  }
  ```

  `src/collections/LogIndexing.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isAdmin, nobody } from '@/access'
  import {
    JENIS_KABAR,
    LABEL_JENIS,
    LABEL_LANGKAH,
    LABEL_STATUS_LOG,
    LANGKAH,
    NAMA_ADAPTER,
    STATUS_LOG,
  } from '@/modules/indexer/tipe'

  /**
   * Log Mesin Indexing (spesifikasi §6 `logIndexing`, §8 langkah 6): satu baris per langkah per URL,
   * termasuk percobaan yang gagal. Hanya admin yang bisa membaca; isinya ditulis modul indexer.
   */
  export const LogIndexing: CollectionConfig = {
    slug: 'log-indexing',
    labels: { singular: 'Log indexing', plural: 'Log indexing' },
    defaultSort: '-waktu',
    admin: {
      useAsTitle: 'url',
      defaultColumns: ['waktu', 'langkah', 'status', 'url', 'pesan'],
      group: 'SEO',
      description: 'Setiap kabar ke mesin pencari dan hasilnya. Status Gagal berarti langkah itu sudah dicoba empat kali.',
    },
    access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
    fields: [
      { name: 'waktu', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'url', type: 'text', required: true, index: true, label: 'URL' },
      { name: 'jenis', type: 'select', options: JENIS_KABAR.map((value) => ({ value, label: LABEL_JENIS[value] })) },
      { name: 'langkah', type: 'select', required: true, index: true, options: LANGKAH.map((value) => ({ value, label: LABEL_LANGKAH[value] })) },
      { name: 'adapter', type: 'select', required: true, options: NAMA_ADAPTER.map((value) => ({ value, label: value })) },
      { name: 'status', type: 'select', required: true, index: true, options: STATUS_LOG.map((value) => ({ value, label: LABEL_STATUS_LOG[value] })) },
      { name: 'kodeHttp', type: 'number', label: 'Status HTTP' },
      { name: 'pesan', type: 'textarea' },
      { name: 'percobaan', type: 'number', label: 'Percobaan ke' },
    ],
  }
  ```

  `src/collections/StatusIndeks.ts`

  ```ts
  import type { CollectionConfig } from 'payload'

  import { isAdmin, nobody } from '@/access'
  import { LABEL_STATUS_INDEKS, STATUS_INDEKS } from '@/modules/indexer/tipe'

  /**
   * Status indeks Google per path publik (spesifikasi §6 `statusIndeks`), diisi cek status URL
   * Inspection +6 jam sampai +7 hari setelah terbit. Path yang dihapus atau pindah keluar dari sini.
   */
  export const StatusIndeks: CollectionConfig = {
    slug: 'status-indeks',
    labels: { singular: 'Status indeks', plural: 'Status indeks' },
    defaultSort: '-cekTerakhir',
    admin: {
      useAsTitle: 'path',
      defaultColumns: ['path', 'status', 'cekTerakhir', 'cekBerikutnya', 'detail'],
      group: 'SEO',
      description: 'Status di Google untuk setiap halaman yang terbit, dicek otomatis sampai 7 hari setelah terbit atau perubahan besar.',
    },
    access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
    fields: [
      { name: 'path', type: 'text', required: true, unique: true, index: true },
      {
        name: 'status',
        type: 'select',
        required: true,
        defaultValue: 'belum-dicek',
        index: true,
        options: STATUS_INDEKS.map((value) => ({ value, label: LABEL_STATUS_INDEKS[value] })),
      },
      { name: 'detail', type: 'text', admin: { description: 'Keterangan dari Google (coverageState), atau pesan galat.' } },
      { name: 'tautanInspeksi', type: 'text', label: 'Laporan di Search Console' },
      { name: 'dirayapiPada', type: 'date', label: 'Dirayapi Google', admin: { date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'cekTerakhir', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
      { name: 'cekBerikutnya', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    ],
  }
  ```

  ```diff
  diff --git a/src/payload.config.ts b/src/payload.config.ts
  index 215b283..2c06472 100644
  --- a/src/payload.config.ts
  +++ b/src/payload.config.ts
  @@ -5,15 +5,18 @@ import { buildConfig } from 'payload'
   import sharp from 'sharp'
   import { fileURLToPath } from 'url'
   
  +import { AntreanIndexing } from './collections/AntreanIndexing'
   import { Artikel } from './collections/Artikel'
   import { Halaman } from './collections/Halaman'
   import { Log404 } from './collections/Log404'
  +import { LogIndexing } from './collections/LogIndexing'
   import { Media } from './collections/Media'
   import { ParameterTools } from './collections/ParameterTools'
   import { Pengguna } from './collections/Pengguna'
   import { Penulis } from './collections/Penulis'
   import { Pilar } from './collections/Pilar'
   import { Redirect } from './collections/Redirect'
  +import { StatusIndeks } from './collections/StatusIndeks'
   import { Subkategori } from './collections/Subkategori'
   import { Tools } from './collections/Tools'
   import { Video } from './collections/Video'
  @@ -46,6 +49,9 @@ export default buildConfig({
       Halaman,
       Redirect,
       Log404,
  +    AntreanIndexing,
  +    LogIndexing,
  +    StatusIndeks,
     ],
     globals: [Header, Footer, Beranda, PengaturanSEO, Newsletter],
     editor: lexicalEditor(),
  ```

- [ ] **Langkah 4: Penyimpanan dan `kabari`**

  `src/modules/indexer/antrean.ts`

  ```ts
  import type { Payload, PayloadRequest } from 'payload'

  import type { AntreanIndexing } from '@/payload-types'

  import { gabungBaris } from './aturan'
  import type {
    BarisAntrean,
    JenisKabar,
    Langkah,
    LangkahAntrean,
    NamaAdapter,
    PengaturanIndexing,
    StatusIndeks,
    StatusLog,
  } from './tipe'

  /**
   * Penyimpanan Mesin Indexing di koleksi Payload: antrean (`antrean-indexing`), log (`log-indexing`),
   * dan status indeks (`status-indeks`). `req` diteruskan supaya kabar dari hook ikut transaksi simpan
   * dokumen: bila simpan gagal, antrean dan log ikut batal.
   */

  const ANTREAN = 'antrean-indexing' as const

  /** Kunci dedup antrean: satu baris per langkah dan path. */
  export const kunciAntrean = (langkah: LangkahAntrean, path: string) => `${langkah} ${path}`

  /** Baris antrean tersimpan, dengan `versi` yang naik setiap kabar baru tergabung ke baris ini. */
  export type BarisTersimpan = BarisAntrean & { id: number; versi: number }

  export function dariDokumen(doc: AntreanIndexing): BarisTersimpan {
    return {
      id: doc.id,
      versi: doc.versi ?? 0,
      langkah: doc.langkah,
      path: doc.path,
      jenis: doc.jenis,
      jadwal: new Date(doc.jadwal),
      percobaan: doc.percobaan ?? 0,
      tahap: doc.tahap ?? 0,
      dasar: doc.dasar ? new Date(doc.dasar) : null,
    }
  }

  const keData = (baris: BarisAntrean) => ({
    langkah: baris.langkah,
    path: baris.path,
    jenis: baris.jenis,
    jadwal: baris.jadwal.toISOString(),
    percobaan: baris.percobaan,
    tahap: baris.tahap,
    dasar: baris.dasar?.toISOString() ?? null,
  })

  /** Menambah baris, atau menggabungkannya ke baris yang sudah antre untuk langkah dan path yang sama. */
  export async function simpanBaris(payload: Payload, baris: BarisAntrean, req?: PayloadRequest): Promise<void> {
    const kunci = kunciAntrean(baris.langkah, baris.path)
    const { docs } = await payload.find({ collection: ANTREAN, where: { kunci: { equals: kunci } }, limit: 1, depth: 0, req })
    const ada = docs[0]
    if (!ada) {
      await payload.create({ collection: ANTREAN, data: { kunci, ...keData(baris), versi: 0 }, req })
      return
    }
    const lama = dariDokumen(ada)
    await payload.update({ collection: ANTREAN, id: ada.id, data: { ...keData(gabungBaris(lama, baris)), versi: lama.versi + 1 }, req })
  }

  export async function batalkanBaris(payload: Payload, langkah: LangkahAntrean, path: string, req?: PayloadRequest): Promise<void> {
    await payload.delete({ collection: ANTREAN, where: { kunci: { equals: kunciAntrean(langkah, path) } }, req })
  }

  export type EntriLog = {
    url: string
    jenis?: JenisKabar | null
    langkah: Langkah
    adapter: NamaAdapter
    status: StatusLog
    kodeHttp?: number | null
    pesan: string
    percobaan: number
    waktu: Date
  }

  export async function catatLog(payload: Payload, entri: EntriLog, req?: PayloadRequest): Promise<void> {
    await payload.create({ collection: 'log-indexing', data: { ...entri, waktu: entri.waktu.toISOString() }, req })
  }

  export type DataStatus = Partial<{
    status: StatusIndeks
    detail: string | null
    tautanInspeksi: string | null
    dirayapiPada: string | null
    cekTerakhir: string | null
    cekBerikutnya: string | null
  }>

  /** Menyimpan status indeks satu path (dibuat bila belum ada, dengan status Belum dicek). */
  export async function catatStatus(payload: Payload, path: string, data: DataStatus, req?: PayloadRequest): Promise<void> {
    const { docs } = await payload.find({ collection: 'status-indeks', where: { path: { equals: path } }, limit: 1, depth: 0, req })
    if (docs[0]) await payload.update({ collection: 'status-indeks', id: docs[0].id, data, req })
    else await payload.create({ collection: 'status-indeks', data: { path, status: 'belum-dicek', ...data }, req })
  }

  export async function hapusStatus(payload: Payload, path: string, req?: PayloadRequest): Promise<void> {
    await payload.delete({ collection: 'status-indeks', where: { path: { equals: path } }, req })
  }

  /**
   * Pengaturan Mesin Indexing dari global `pengaturan-seo`. Nilai cadangan sama dengan `defaultValue`
   * field-nya, untuk isian yang dikosongkan editor.
   */
  export async function ambilPengaturanIndexing(payload: Payload, req?: PayloadRequest): Promise<PengaturanIndexing> {
    const global = await payload.findGlobal({ slug: 'pengaturan-seo', depth: 0, req })
    const isian = global.indexing ?? {}
    return {
      urlSitus: global.urlSitus,
      kunciIndexNow: isian.kunciIndexNow?.trim() || null,
      propertiSearchConsole: isian.propertiSearchConsole?.trim() || 'sc-domain:point.lat',
      kuotaInspeksi: isian.kuotaInspeksi ?? 1000,
      pakaiIndexingApi: isian.pakaiIndexingApi === true,
      kuotaIndexingApi: isian.kuotaIndexingApi ?? 200,
    }
  }
  ```

  `src/modules/indexer/index.ts`

  ```ts
  import type { Payload, PayloadRequest } from 'payload'

  import { urlAbsolut } from '@/modules/seo/dokumen'

  import { ambilPengaturanIndexing, batalkanBaris, catatLog, catatStatus, hapusStatus, simpanBaris } from './antrean'
  import { rencanaKabar } from './aturan'
  import type { Kabar } from './tipe'

  /**
   * Mesin Indexing (spesifikasi §5 dan §8). Antarmuka modul:
   *
   * - `kabari(payload, kabar, opsi)`: dipanggil hook koleksi saat URL publik terbit, berubah besar, pindah,
   *   atau dihapus. Mencatat langkah revalidasi (sudah dikerjakan hook `revalidasiPublik` saat simpan) dan
   *   memasukkan langkah berikutnya ke antrean: sitemap, IndexNow, Indexing API (bila aktif), cek status.
   *
   * Antrean disimpan di Postgres (`antrean.ts`) dan dikirim terpisah dari penyimpanan dokumen, jadi
   * publikasi tidak pernah menunggu atau gagal karena mesin pencari.
   */
  export async function kabari(payload: Payload, daftar: Kabar[], opsi: { req?: PayloadRequest; sekarang?: Date } = {}): Promise<void> {
    if (!daftar.length) return
    const { req } = opsi
    const sekarang = opsi.sekarang ?? new Date()
    const pengaturan = await ambilPengaturanIndexing(payload, req)
    for (const kabar of daftar) {
      await catatLog(
        payload,
        {
          url: urlAbsolut(pengaturan, kabar.path),
          jenis: kabar.jenis,
          langkah: 'revalidasi',
          adapter: 'next',
          status: 'berhasil',
          pesan: 'Cache halaman dan sitemap sudah dibuang saat dokumen disimpan.',
          percobaan: 1,
          waktu: sekarang,
        },
        req,
      )
      const rencana = rencanaKabar(kabar, pengaturan, sekarang)
      for (const baris of rencana.simpan) await simpanBaris(payload, baris, req)
      for (const langkah of rencana.batal) await batalkanBaris(payload, langkah, kabar.path, req)
      const cek = rencana.simpan.find((b) => b.langkah === 'cek-status')
      if (cek) await catatStatus(payload, kabar.path, { cekBerikutnya: cek.jadwal.toISOString() }, req)
      else await hapusStatus(payload, kabar.path, req)
    }
  }

  export type { JenisKabar, Kabar, StatusIndeks } from './tipe'
  ```

- [ ] **Langkah 5: Tipe Payload, database dev, dan data E2E**

  ```bash
  npm run generate:types
  git diff --stat src/payload-types.ts
  npm run seed
  ```

  Hasil yang diharapkan: `1 file changed, 137 insertions(+)` (tipe `AntreanIndexing`, `LogIndexing`, `StatusIndeks`, select-nya, dan relasi `payload-locked-documents`); `npm run seed` selesai tanpa pertanyaan DATA LOSS (tiga tabel baru).

  Data E2E dibersihkan setiap run, termasuk tiga koleksi baru (kabar dari konten contoh dibuat ulang saat `siapkan.ts` menerbitkannya mulai Task 6):

  ```diff
  diff --git a/tests/e2e/siapkan.ts b/tests/e2e/siapkan.ts
  index 109a628..2b02260 100644
  --- a/tests/e2e/siapkan.ts
  +++ b/tests/e2e/siapkan.ts
  @@ -17,7 +17,7 @@ import { ADMIN_E2E, blok, gambar, h2, isi, JUDUL_PANDUAN, KUNCI_INDEXNOW, p, SLU
   pakaiKlien(klienPalsu('e2e'))
   const payload = await getPayload({ config })
   
  -for (const koleksi of ['artikel', 'tools', 'parameter-tools', 'video', 'subkategori', 'redirect', 'log-404', 'media'] as const) {
  +for (const koleksi of ['artikel', 'tools', 'parameter-tools', 'video', 'subkategori', 'redirect', 'log-404', 'media', 'antrean-indexing', 'log-indexing', 'status-indeks'] as const) {
     await payload.delete({ collection: koleksi, where: { id: { exists: true } } })
   }
   await seed(payload, { emailAdmin: ADMIN_E2E.email, passwordAdmin: ADMIN_E2E.password })
  ```

- [ ] **Langkah 6: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 54 passed (54)`, `Tests 379 passed (379)`; integrasi `Test Files 28 passed (28)`, `Tests 83 passed (83)`; E2E `89 passed`.

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/access/index.ts src/collections/AntreanIndexing.ts src/collections/LogIndexing.ts src/collections/StatusIndeks.ts src/modules/indexer src/payload.config.ts src/payload-types.ts tests/int/indexer-antrean.int.spec.ts tests/e2e/siapkan.ts
  git commit -m "feat(indexer): antrean, log, dan status indeks di Postgres, dan kabari() dengan dedup per langkah dan path"
  ```

---

### Task 5: Pelari antrean: jendela kirim, satu POST IndexNow, kuota harian Google, jeda ulang, cek status bertahap, dan klaim atomik

**Files:**
- Create: `src/modules/indexer/jalan.ts`
- Modify: `src/modules/indexer/antrean.ts`, `src/modules/indexer/index.ts`
- Test: `tests/int/indexer-jalan.int.spec.ts`

**Interfaces:**
- Consumes: `setelahPanggilan`, `tundaSampai`, `awalHariPasifik`, `besokPasifik`, `statusDariInspeksi`, `JENDELA_KIRIM_MS`, `PATH_SITEMAP` (Task 2); `AdapterIndexer`, `adapterIndexer` (Task 3); `pathFileKunci` (Task 1); penyimpanan dan `kabari` (Task 4).
- Produces:
  - `antrean.ts` (tambahan): `barisJatuhTempo(payload, sekarang, batas)`, `klaimBaris(payload, daftar, sampai)` (satu `UPDATE ... RETURNING` per baris), `selesaikanBaris(payload, baris, berikut)`, `tundaBaris(payload, baris, jadwal)`, `kirimanBerhasilTerakhir(payload, langkah)`, `panggilanSejak(payload, langkah, sejak)`, `perbaruiStatus(payload, path, data)`.
  - `jalan.ts`: `BATAS_PER_JALAN` (200), `RingkasanJalan = Record<StatusLog, number> & { diproses }`, `jalankanIndexer(payload, { sekarang?, adapter? }): Promise<RingkasanJalan>`.
  - `@/modules/indexer` (tambahan): `jalankanIndexer`, `RingkasanJalan`, `adapterIndexer`, `pakaiAdapterIndexer`, `AdapterIndexer`, `adapterPalsu`, `AdapterPalsu`.

`jalankanIndexer` mengambil paling banyak 200 baris yang jatuh tempo (urut jadwal, lalu urutan masuk), lalu menjalankan langkah 2 sampai 6 spesifikasi §8 secara berurutan:

1. **Sitemap**: bila kiriman berhasil terakhir kurang dari 30 menit lalu, baris ditunda ke akhir jendela; selain itu `sitemaps.submit` untuk sitemap index ke properti dari pengaturan.
2. **IndexNow**: semua URL yang antre dalam satu POST (maksimal 10.000), dengan `keyLocation` file kunci Task 1; jendela 5 menit. Tanpa kunci di pengaturan: dilewati.
3. **Indexing API** (hanya bila saklar aktif; bila dimatikan setelah kabar masuk, baris dilewati): `URL_UPDATED`, atau `URL_DELETED` untuk kabar hapus, sebanyak sisa kuota hari ini.
4. **Cek status**: URL Inspection sebanyak sisa kuota hari ini; hasilnya mengisi `status-indeks` dan menentukan jadwal berikutnya.

Kuota dihitung dari log sejak tengah malam waktu Pasifik (panggilan berhasil atau gagal); baris di atas kuota ditunda ke hari kuota berikutnya dan dicatat "Ditunda" sekali. Sebelum adapter dipanggil, baris diklaim dengan satu `UPDATE ... WHERE versi = ... RETURNING` di Postgres (`sql` dari `@payloadcms/db-postgres`), karena `payload.update({ where })` mencari dulu lalu menulis per id, sehingga dua pelari yang bersamaan (cron terkirim dua kali, atau `after()` bertepatan dengan cron) bisa sama-sama merasa menang. Baris yang diklaim dijadwalkan ulang 10 menit (sewa), jadi bila proses mati di tengah jalan, baris muncul lagi. Penyelesaian memakai syarat `versi` yang sama, sehingga kabar baru yang tergabung selama pengiriman tetap dikirim.

Tes integrasi memakai adapter palsu dan waktu tiruan (`sekarang`): satu kabar dijalankan berkali-kali pada menit yang berbeda, lalu panggilan adapter, log, antrean, dan status indeks diperiksa. Antrean, log, dan status indeks dikosongkan sebelum setiap tes karena jendela kirim dan kuota dibaca dari log.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/int/indexer-jalan.int.spec.ts`

  ```ts
  import type { Payload } from 'payload'
  import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

  import { adapterPalsu, jalankanIndexer, kabari } from '@/modules/indexer'

  import { getTestPayload, unik } from './helpers'

  const T0 = new Date('2026-11-05T03:00:00.000Z')
  const nanti = (menit: number) => new Date(T0.getTime() + menit * 60_000)
  const KUNCI = 'kunci-tes-indexnow-2026'
  const palsu = adapterPalsu()
  const url = (path: string) => `https://point.lat${path}`

  async function kosongkan(payload: Payload) {
    for (const collection of ['antrean-indexing', 'log-indexing', 'status-indeks'] as const) {
      await payload.delete({ collection, where: { id: { exists: true } } })
    }
  }

  async function log(payload: Payload, langkah: string) {
    const { docs } = await payload.find({ collection: 'log-indexing', where: { langkah: { equals: langkah } }, sort: ['waktu', 'id'], limit: 100, depth: 0 })
    return docs.map((d) => ({ url: d.url, status: d.status, percobaan: d.percobaan, waktu: d.waktu, adapter: d.adapter }))
  }

  async function antrean(payload: Payload) {
    const { docs } = await payload.find({ collection: 'antrean-indexing', limit: 100, depth: 0 })
    return docs.map((d) => `${d.langkah} ${d.path} ${d.jadwal}`).sort()
  }

  const jalan = (payload: Payload, menit: number) => jalankanIndexer(payload, { sekarang: nanti(menit), adapter: palsu })

  describe('jalankanIndexer dengan adapter palsu dan waktu tiruan', () => {
    beforeAll(async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kunciIndexNow: KUNCI, kuotaInspeksi: 1000, pakaiIndexingApi: false } } })
    })

    afterAll(async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kunciIndexNow: '', kuotaInspeksi: 1000, pakaiIndexingApi: false, kuotaIndexingApi: 200 } } })
      await kosongkan(payload)
    })

    beforeEach(async () => {
      palsu.reset()
      await kosongkan(await getTestPayload())
    })

    it('terbit: sitemap index ke Search Console dan semua URL dalam satu POST IndexNow; cek status menunggu +6 jam', async () => {
      const payload = await getTestPayload()
      const [a, b] = [`/${unik('gaji')}`, `/${unik('thr')}`]
      await kabari(payload, [{ path: a, jenis: 'terbit' }, { path: b, jenis: 'terbit' }], { sekarang: T0 })

      const ringkasan = await jalan(payload, 0)
      expect(palsu.panggilan).toEqual([
        { aksi: 'kirimSitemap', properti: 'sc-domain:point.lat', url: 'https://point.lat/sitemap.xml' },
        { aksi: 'kirimIndexNow', kiriman: { host: 'point.lat', key: KUNCI, keyLocation: `https://point.lat/${KUNCI}.txt`, urlList: [url(a), url(b)] } },
      ])
      expect(ringkasan).toEqual({ diproses: 3, berhasil: 3, diulang: 0, gagal: 0, dilewati: 0, ditunda: 0 })
      expect((await log(payload, 'indexnow')).map((l) => [l.url, l.status, l.adapter])).toEqual([
        [url(a), 'berhasil', 'palsu'],
        [url(b), 'berhasil', 'palsu'],
      ])
      expect(await antrean(payload)).toEqual([`cek-status ${a} 2026-11-05T09:00:00.000Z`, `cek-status ${b} 2026-11-05T09:00:00.000Z`].sort())
    })

    it('jendela kirim: kabar baru ditahan sampai 5 menit (IndexNow) dan 30 menit (sitemap) sejak kiriman terakhir, lalu digabung', async () => {
      const payload = await getTestPayload()
      const [a, b, c] = [`/${unik('a')}`, `/${unik('b')}`, `/${unik('c')}`]
      await kabari(payload, [{ path: a, jenis: 'terbit' }], { sekarang: T0 })
      await jalan(payload, 0)
      await kabari(payload, [{ path: b, jenis: 'terbit' }], { sekarang: nanti(2) })
      await jalan(payload, 2)
      await kabari(payload, [{ path: c, jenis: 'ubah-besar' }], { sekarang: nanti(3) })
      await jalan(payload, 3)
      expect(palsu.panggilan.map((p) => p.aksi)).toEqual(['kirimSitemap', 'kirimIndexNow'])
      expect((await antrean(payload)).filter((b) => !b.startsWith('cek-status'))).toEqual(
        [`indexnow ${b} 2026-11-05T03:05:00.000Z`, `indexnow ${c} 2026-11-05T03:05:00.000Z`, 'sitemap /sitemap.xml 2026-11-05T03:30:00.000Z'].sort(),
      )

      await jalan(payload, 5)
      await jalan(payload, 30)
      expect(palsu.panggilan.map((p) => (p.aksi === 'kirimIndexNow' ? p.kiriman.urlList.length : p.aksi))).toEqual(['kirimSitemap', 1, 2, 'kirimSitemap'])
    })

    it('gagal: diulang 1, 5, lalu 30 menit kemudian, lalu Gagal; publikasi lain tetap jalan', async () => {
      const payload = await getTestPayload()
      const path = `/${unik('kpr')}`
      const gagal = { status: 'gagal' as const, kodeHttp: 503, pesan: 'IndexNow menjawab 503.' }
      palsu.jawab('kirimIndexNow', gagal, gagal, gagal, gagal)
      await kabari(payload, [{ path, jenis: 'terbit' }], { sekarang: T0 })
      for (const menit of [0, 1, 6, 36]) await jalan(payload, menit)

      const hasil = await log(payload, 'indexnow')
      expect(hasil.map((l) => [l.status, l.percobaan, l.waktu])).toEqual([
        ['diulang', 1, '2026-11-05T03:00:00.000Z'],
        ['diulang', 2, '2026-11-05T03:01:00.000Z'],
        ['diulang', 3, '2026-11-05T03:06:00.000Z'],
        ['gagal', 4, '2026-11-05T03:36:00.000Z'],
      ])
      const { docs } = await payload.find({ collection: 'log-indexing', where: { status: { equals: 'diulang' } }, sort: 'waktu', limit: 1 })
      expect(docs[0].pesan).toBe('IndexNow menjawab 503. Dicoba lagi 1 menit lagi.')
      expect((await antrean(payload)).filter((b) => b.startsWith('indexnow'))).toEqual([])
      expect((await log(payload, 'sitemap')).map((l) => l.status)).toEqual(['berhasil'])
    })

    it('cek status: +6 jam lalu +24 jam, berhenti saat Terindeks, status indeks tercatat', async () => {
      const payload = await getTestPayload()
      const path = `/${unik('dana-darurat')}`
      await kabari(payload, [{ path, jenis: 'terbit' }], { sekarang: T0 })
      palsu.indeks.set(url(path), { verdict: 'NEUTRAL', coverageState: 'Discovered - currently not indexed' })
      await jalan(payload, 0)
      await jalan(payload, 6 * 60)
      await jalan(payload, 7 * 60)
      let status = (await payload.find({ collection: 'status-indeks', where: { path: { equals: path } } })).docs[0]
      expect(status).toMatchObject({ status: 'ditemukan', detail: 'Discovered - currently not indexed', cekTerakhir: '2026-11-05T09:00:00.000Z', cekBerikutnya: '2026-11-06T03:00:00.000Z' })

      palsu.indeks.set(url(path), { verdict: 'PASS', coverageState: 'Submitted and indexed', lastCrawlTime: '2026-11-05T20:11:00Z', tautan: 'https://search.google.com/search-console/inspect?id=1' })
      await jalan(payload, 24 * 60)
      status = (await payload.find({ collection: 'status-indeks', where: { path: { equals: path } } })).docs[0]
      expect(status).toMatchObject({
        status: 'terindeks',
        dirayapiPada: '2026-11-05T20:11:00.000Z',
        tautanInspeksi: 'https://search.google.com/search-console/inspect?id=1',
        cekBerikutnya: null,
      })
      expect(palsu.panggilan.filter((p) => p.aksi === 'periksaUrl')).toHaveLength(2)
      expect((await log(payload, 'cek-status')).map((l) => l.status)).toEqual(['berhasil', 'berhasil'])
      const { docs } = await payload.find({ collection: 'log-indexing', where: { langkah: { equals: 'cek-status' } }, sort: ['waktu', 'id'] })
      expect(docs.map((d) => d.pesan)).toEqual(['Ditemukan, belum dirayapi: Discovered - currently not indexed.', 'Terindeks: Submitted and indexed.'])
      expect(await antrean(payload)).toEqual([])
    })

    it('kuota harian: cek status di atas batas ditunda ke tengah malam waktu Pasifik', async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kuotaInspeksi: 2 } } })
      const daftar = [`/${unik('k1')}`, `/${unik('k2')}`, `/${unik('k3')}`]
      await kabari(payload, daftar.map((path) => ({ path, jenis: 'terbit' as const })), { sekarang: T0 })
      const ringkasan = await jalan(payload, 6 * 60)
      expect(ringkasan.ditunda).toBe(1)
      expect(palsu.panggilan.filter((p) => p.aksi === 'periksaUrl')).toHaveLength(2)
      // 09.00 UTC 5 November = 01.00 PST; hari kuota berikutnya mulai 6 November 00.00 PST (08.00 UTC).
      expect((await antrean(payload)).filter((b) => b.startsWith(`cek-status ${daftar[2]}`))).toEqual([`cek-status ${daftar[2]} 2026-11-06T08:00:00.000Z`])
      const ditunda = (await log(payload, 'cek-status')).filter((l) => l.status === 'ditunda')
      expect(ditunda.map((l) => l.url)).toEqual([url(daftar[2])])
      await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { kuotaInspeksi: 1000 } } })
    })

    it('Indexing API: URL_UPDATED saat terbit, URL_DELETED saat dihapus; dilewati bila saklar dimatikan', async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { pakaiIndexingApi: true, kuotaIndexingApi: 200 } } })
      const [a, b, c] = [`/${unik('lowongan')}`, `/${unik('siaran')}`, `/${unik('acara')}`]
      await kabari(payload, [{ path: a, jenis: 'terbit' }], { sekarang: T0 })
      await jalan(payload, 0)
      await kabari(payload, [{ path: a, jenis: 'hapus' }, { path: b, jenis: 'terbit' }], { sekarang: nanti(10) })
      await jalan(payload, 10)
      await kabari(payload, [{ path: c, jenis: 'terbit' }], { sekarang: nanti(20) })
      await payload.updateGlobal({ slug: 'pengaturan-seo', data: { indexing: { pakaiIndexingApi: false } } })
      await jalan(payload, 20)
      expect(palsu.panggilan.filter((p) => p.aksi === 'kabariGoogle')).toEqual([
        { aksi: 'kabariGoogle', url: url(a), jenis: 'URL_UPDATED' },
        { aksi: 'kabariGoogle', url: url(a), jenis: 'URL_DELETED' },
        { aksi: 'kabariGoogle', url: url(b), jenis: 'URL_UPDATED' },
      ])
      expect((await log(payload, 'indexing-api')).map((l) => [l.url, l.status])).toEqual([
        [url(a), 'berhasil'],
        [url(a), 'berhasil'],
        [url(b), 'berhasil'],
        [url(c), 'dilewati'],
      ])
    })

    it('dua pelari bersamaan (cron terkirim dua kali) tidak mengirim baris yang sama dua kali', async () => {
      const payload = await getTestPayload()
      await kabari(payload, [{ path: `/${unik('ganda')}`, jenis: 'terbit' }], { sekarang: T0 })
      const [satu, dua] = await Promise.all([jalan(payload, 0), jalan(payload, 0)])
      expect(satu.diproses + dua.diproses).toBe(2)
      expect(palsu.panggilan.map((p) => p.aksi).sort()).toEqual(['kirimIndexNow', 'kirimSitemap'])
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:int
  ```

  Hasil yang diharapkan: FAIL di `tests/int/indexer-jalan.int.spec.ts` dengan `TypeError: (0 , __vite_ssr_import_1__.adapterPalsu) is not a function`.

- [ ] **Langkah 3: Penyimpanan untuk pelari antrean**

  ```diff
  diff --git a/src/modules/indexer/antrean.ts b/src/modules/indexer/antrean.ts
  index ffa7f22..d762f96 100644
  --- a/src/modules/indexer/antrean.ts
  +++ b/src/modules/indexer/antrean.ts
  @@ -1,4 +1,5 @@
  -import type { Payload, PayloadRequest } from 'payload'
  +import { sql } from '@payloadcms/db-postgres'
  +import type { Payload, PayloadRequest, Where } from 'payload'
   
   import type { AntreanIndexing } from '@/payload-types'
   
  @@ -57,18 +58,80 @@ export async function simpanBaris(payload: Payload, baris: BarisAntrean, req?: P
     const kunci = kunciAntrean(baris.langkah, baris.path)
     const { docs } = await payload.find({ collection: ANTREAN, where: { kunci: { equals: kunci } }, limit: 1, depth: 0, req })
     const ada = docs[0]
  -  if (!ada) {
  -    await payload.create({ collection: ANTREAN, data: { kunci, ...keData(baris), versi: 0 }, req })
  -    return
  +  if (ada) {
  +    const lama = dariDokumen(ada)
  +    // `where`, bukan `id`: bila pelari antrean baru saja menyelesaikan baris ini, tidak ada galat dan baris dibuat lagi.
  +    const { docs: diubah } = await payload.update({
  +      collection: ANTREAN,
  +      where: { id: { equals: ada.id } },
  +      data: { ...keData(gabungBaris(lama, baris)), versi: lama.versi + 1 },
  +      depth: 0,
  +      req,
  +    })
  +    if (diubah.length) return
     }
  -  const lama = dariDokumen(ada)
  -  await payload.update({ collection: ANTREAN, id: ada.id, data: { ...keData(gabungBaris(lama, baris)), versi: lama.versi + 1 }, req })
  +  await payload.create({ collection: ANTREAN, data: { kunci, ...keData(baris), versi: 0 }, req })
   }
   
   export async function batalkanBaris(payload: Payload, langkah: LangkahAntrean, path: string, req?: PayloadRequest): Promise<void> {
     await payload.delete({ collection: ANTREAN, where: { kunci: { equals: kunciAntrean(langkah, path) } }, req })
   }
   
  +/** Baris yang jatuh tempo, paling lama dulu; jadwal yang sama menurut urutan masuk antrean. */
  +export async function barisJatuhTempo(payload: Payload, sekarang: Date, batas: number): Promise<BarisTersimpan[]> {
  +  const { docs } = await payload.find({
  +    collection: ANTREAN,
  +    where: { jadwal: { less_than_equal: sekarang.toISOString() } },
  +    sort: ['jadwal', 'id'],
  +    limit: batas,
  +    depth: 0,
  +  })
  +  return docs.map(dariDokumen)
  +}
  +
  +/** Syarat baris yang belum berubah sejak diambil (tidak diklaim proses lain, tidak tergabung kabar baru). */
  +const tetap = (baris: BarisTersimpan): Where => ({ and: [{ id: { equals: baris.id } }, { versi: { equals: baris.versi } }] })
  +
  +/**
  + * Mengklaim baris sebelum adapter dipanggil: jadwalnya dimundurkan sebentar (sewa) supaya proses lain
  + * (cron yang terkirim dua kali, `after()` saat terbit) tidak mengirim baris yang sama. Klaim memakai satu
  + * `UPDATE ... WHERE versi = ... RETURNING` di Postgres karena update Payload dengan `where` mencari dulu
  + * lalu menulis, sehingga dua proses bisa sama-sama merasa menang. Bila proses berhenti di tengah jalan,
  + * baris muncul lagi setelah sewa habis.
  + */
  +export async function klaimBaris(payload: Payload, daftar: BarisTersimpan[], sampai: Date): Promise<BarisTersimpan[]> {
  +  const hasil: BarisTersimpan[] = []
  +  for (const baris of daftar) {
  +    const { rows } = await payload.db.drizzle.execute(sql`
  +      update antrean_indexing set jadwal = ${sampai.toISOString()}, versi = versi + 1, updated_at = now()
  +      where id = ${baris.id} and versi = ${baris.versi}
  +      returning id`)
  +    if (rows.length) hasil.push({ ...baris, jadwal: sampai, versi: baris.versi + 1 })
  +  }
  +  return hasil
  +}
  +
  +/**
  + * Menyelesaikan baris yang sudah diklaim: dihapus (`berikut: null`) atau dijadwalkan lagi. Bila kabar
  + * baru tergabung selama adapter dipanggil (versi berubah), baris dibiarkan supaya kabar itu tetap dikirim.
  + */
  +export async function selesaikanBaris(
  +  payload: Payload,
  +  baris: BarisTersimpan,
  +  berikut: Pick<BarisAntrean, 'jadwal' | 'percobaan' | 'tahap'> | null,
  +): Promise<void> {
  +  if (berikut) {
  +    const data = { jadwal: berikut.jadwal.toISOString(), percobaan: berikut.percobaan, tahap: berikut.tahap }
  +    await payload.update({ collection: ANTREAN, where: tetap(baris), data, depth: 0 })
  +  }
  +  else await payload.delete({ collection: ANTREAN, where: tetap(baris) })
  +}
  +
  +/** Menunda baris tanpa memanggil adapter (jendela kirim atau kuota). */
  +export async function tundaBaris(payload: Payload, baris: BarisTersimpan, jadwal: Date): Promise<void> {
  +  await payload.update({ collection: ANTREAN, where: tetap(baris), data: { jadwal: jadwal.toISOString() }, depth: 0 })
  +}
  +
   export type EntriLog = {
     url: string
     jenis?: JenisKabar | null
  @@ -85,6 +148,36 @@ export async function catatLog(payload: Payload, entri: EntriLog, req?: PayloadR
     await payload.create({ collection: 'log-indexing', data: { ...entri, waktu: entri.waktu.toISOString() }, req })
   }
   
  +/**
  + * Waktu kiriman terakhir yang berhasil untuk jendela kirim (sitemap 30 menit, IndexNow 5 menit). Kiriman
  + * yang gagal tidak dihitung: ulangannya mengikuti jeda 1, 5, dan 30 menit.
  + */
  +export async function kirimanBerhasilTerakhir(payload: Payload, langkah: Langkah): Promise<Date | null> {
  +  const { docs } = await payload.find({
  +    collection: 'log-indexing',
  +    where: { and: [{ langkah: { equals: langkah } }, { status: { equals: 'berhasil' } }] },
  +    sort: '-waktu',
  +    limit: 1,
  +    depth: 0,
  +  })
  +  return docs[0] ? new Date(docs[0].waktu) : null
  +}
  +
  +/** Jumlah panggilan (berhasil atau gagal) untuk satu langkah sejak `sejak`, untuk kuota harian. */
  +export async function panggilanSejak(payload: Payload, langkah: Langkah, sejak: Date): Promise<number> {
  +  const { totalDocs } = await payload.count({
  +    collection: 'log-indexing',
  +    where: {
  +      and: [
  +        { langkah: { equals: langkah } },
  +        { status: { in: ['berhasil', 'diulang', 'gagal'] } },
  +        { waktu: { greater_than_equal: sejak.toISOString() } },
  +      ],
  +    },
  +  })
  +  return totalDocs
  +}
  +
   export type DataStatus = Partial<{
     status: StatusIndeks
     detail: string | null
  @@ -101,6 +194,11 @@ export async function catatStatus(payload: Payload, path: string, data: DataStat
     else await payload.create({ collection: 'status-indeks', data: { path, status: 'belum-dicek', ...data }, req })
   }
   
  +/** Memperbarui status indeks path yang masih tercatat (path yang sudah dihapus tidak dibuat lagi). */
  +export async function perbaruiStatus(payload: Payload, path: string, data: DataStatus): Promise<void> {
  +  await payload.update({ collection: 'status-indeks', where: { path: { equals: path } }, data, depth: 0 })
  +}
  +
   export async function hapusStatus(payload: Payload, path: string, req?: PayloadRequest): Promise<void> {
     await payload.delete({ collection: 'status-indeks', where: { path: { equals: path } }, req })
   }
  ```

- [ ] **Langkah 4: Pelari antrean**

  `src/modules/indexer/jalan.ts`

  ```ts
  import type { Payload } from 'payload'

  import { urlAbsolut } from '@/modules/seo/dokumen'

  import { adapterIndexer, type AdapterIndexer } from './adapter'
  import {
    ambilPengaturanIndexing,
    barisJatuhTempo,
    catatLog,
    kirimanBerhasilTerakhir,
    klaimBaris,
    panggilanSejak,
    perbaruiStatus,
    selesaikanBaris,
    tundaBaris,
    type BarisTersimpan,
  } from './antrean'
  import {
    awalHariPasifik,
    besokPasifik,
    JENDELA_KIRIM_MS,
    MENIT,
    PATH_SITEMAP,
    setelahPanggilan,
    statusDariInspeksi,
    tundaSampai,
    type Lanjutan,
  } from './aturan'
  import { pathFileKunci } from './kunci'
  import { LABEL_STATUS_INDEKS, type HasilPanggilan, type NamaAdapter, type PengaturanIndexing, type StatusLog } from './tipe'

  /** Baris paling banyak per jalan. Cron 10 menit sekali menghabiskan sisanya di jalan berikutnya. */
  export const BATAS_PER_JALAN = 200

  /** Sewa baris yang sedang dikirim; bila proses berhenti, baris dicoba lagi setelah sewa habis. */
  const SEWA_MS = 10 * MENIT

  /** IndexNow menerima paling banyak 10.000 URL per POST. */
  const MAKS_URL_INDEXNOW = 10_000

  export type RingkasanJalan = Record<StatusLog, number> & { diproses: number }

  type Konteks = {
    payload: Payload
    adapter: AdapterIndexer
    pengaturan: PengaturanIndexing
    sekarang: Date
    ringkasan: RingkasanJalan
  }

  function pesanLanjutan(pesan: string, lanjut: Lanjutan, baris: BarisTersimpan, sekarang: Date): string {
    if (lanjut.log === 'diulang' && lanjut.berikut) {
      return `${pesan} Dicoba lagi ${Math.round((lanjut.berikut.jadwal.getTime() - sekarang.getTime()) / MENIT)} menit lagi.`
    }
    if (lanjut.log === 'ditunda') return `${pesan} Kuota harian Google habis; dicoba lagi setelah tengah malam waktu Pasifik.`
    if (lanjut.log === 'gagal') return `${pesan} Sudah dicoba ${baris.percobaan + 1} kali.`
    return pesan
  }

  /** Mencatat hasil satu baris ke log dan menyelesaikan atau menjadwalkan ulang barisnya. */
  async function selesai(k: Konteks, baris: BarisTersimpan, hasil: HasilPanggilan, adapter: NamaAdapter, url: string, pesan = hasil.pesan): Promise<Lanjutan> {
    const lanjut = setelahPanggilan(baris, hasil, k.sekarang)
    await catatLog(k.payload, {
      url,
      jenis: baris.jenis,
      langkah: baris.langkah,
      adapter,
      status: lanjut.log,
      kodeHttp: 'kodeHttp' in hasil ? hasil.kodeHttp : null,
      pesan: pesanLanjutan(pesan, lanjut, baris, k.sekarang),
      percobaan: baris.percobaan + 1,
      waktu: k.sekarang,
    })
    await selesaikanBaris(k.payload, baris, lanjut.berikut)
    k.ringkasan[lanjut.log] += 1
    k.ringkasan.diproses += 1
    return lanjut
  }

  /** Langkah dengan jendela kirim: bila kiriman berhasil terakhir terlalu dekat, semua baris ditunda. */
  async function tundaBilaDalamJendela(k: Konteks, langkah: 'sitemap' | 'indexnow', daftar: BarisTersimpan[]): Promise<boolean> {
    const sampai = tundaSampai(await kirimanBerhasilTerakhir(k.payload, langkah), JENDELA_KIRIM_MS[langkah], k.sekarang)
    if (!sampai) return false
    for (const baris of daftar) await tundaBaris(k.payload, baris, sampai)
    return true
  }

  const sewa = (k: Konteks) => new Date(k.sekarang.getTime() + SEWA_MS)

  /** Langkah 2: sitemap index ke Search Console, paling sering sekali per 30 menit. */
  async function kirimSitemap(k: Konteks, daftar: BarisTersimpan[]): Promise<void> {
    if (!daftar.length || (await tundaBilaDalamJendela(k, 'sitemap', daftar))) return
    const url = urlAbsolut(k.pengaturan, PATH_SITEMAP)
    for (const baris of await klaimBaris(k.payload, daftar, sewa(k))) {
      await selesai(k, baris, await k.adapter.searchConsole.kirimSitemap(k.pengaturan.propertiSearchConsole, url), k.adapter.searchConsole.nama, url)
    }
  }

  /** Langkah 3: semua URL yang antre dikirim dalam satu POST IndexNow, paling sering sekali per 5 menit. */
  async function kirimIndexNow(k: Konteks, daftar: BarisTersimpan[]): Promise<void> {
    if (!daftar.length) return
    const kunci = k.pengaturan.kunciIndexNow
    if (kunci && (await tundaBilaDalamJendela(k, 'indexnow', daftar))) return
    const klaim = await klaimBaris(k.payload, daftar.slice(0, MAKS_URL_INDEXNOW), sewa(k))
    if (!klaim.length) return
    const url = (baris: BarisTersimpan) => urlAbsolut(k.pengaturan, baris.path)
    const hasil: HasilPanggilan = kunci
      ? await k.adapter.indexNow.kirim({
          host: new URL(k.pengaturan.urlSitus).host,
          key: kunci,
          keyLocation: urlAbsolut(k.pengaturan, pathFileKunci(kunci)),
          urlList: klaim.map(url),
        })
      : { status: 'dilewati', pesan: 'Kunci IndexNow belum diisi di Pengaturan SEO.' }
    for (const baris of klaim) await selesai(k, baris, hasil, k.adapter.indexNow.nama, url(baris))
  }

  /**
   * Langkah per URL dengan kuota harian Google (hari kuota mulai tengah malam waktu Pasifik). Baris di atas
   * kuota ditunda ke hari berikutnya dan dicatat sekali.
   */
  async function kirimPerUrl(
    k: Konteks,
    daftar: BarisTersimpan[],
    kuota: number,
    nama: NamaAdapter,
    panggil: (baris: BarisTersimpan, url: string) => Promise<HasilPanggilan>,
    setelah?: (baris: BarisTersimpan, hasil: HasilPanggilan, lanjut: Lanjutan) => Promise<void>,
  ): Promise<void> {
    if (!daftar.length) return
    const terpakai = await panggilanSejak(k.payload, daftar[0].langkah, awalHariPasifik(k.sekarang))
    const sisa = Math.max(0, kuota - terpakai)
    for (const baris of daftar.slice(sisa)) {
      const besok = besokPasifik(k.sekarang)
      await catatLog(k.payload, {
        url: urlAbsolut(k.pengaturan, baris.path),
        jenis: baris.jenis,
        langkah: baris.langkah,
        adapter: nama,
        status: 'ditunda',
        pesan: `Batas ${kuota} panggilan per hari sudah tercapai; dicoba lagi setelah tengah malam waktu Pasifik.`,
        percobaan: baris.percobaan + 1,
        waktu: k.sekarang,
      })
      await tundaBaris(k.payload, baris, besok)
      if (baris.langkah === 'cek-status') await perbaruiStatus(k.payload, baris.path, { cekBerikutnya: besok.toISOString() })
      k.ringkasan.ditunda += 1
      k.ringkasan.diproses += 1
    }
    for (const baris of await klaimBaris(k.payload, daftar.slice(0, sisa), sewa(k))) {
      const url = urlAbsolut(k.pengaturan, baris.path)
      const hasil = await panggil(baris, url)
      let pesan = hasil.pesan
      if (hasil.status === 'berhasil' && baris.langkah === 'cek-status') {
        const { status, detail } = statusDariInspeksi(hasil.indeks)
        pesan = `${LABEL_STATUS_INDEKS[status]}${detail ? `: ${detail}` : ''}.`
      }
      const lanjut = await selesai(k, baris, hasil, nama, url, pesan)
      await setelah?.(baris, hasil, lanjut)
    }
  }

  /** Status indeks setelah cek: hasil Google, Error setelah gagal empat kali, dan jadwal cek berikutnya. */
  async function catatHasilCek(k: Konteks, baris: BarisTersimpan, hasil: HasilPanggilan, lanjut: Lanjutan): Promise<void> {
    const cekBerikutnya = lanjut.berikut?.jadwal.toISOString() ?? null
    if (hasil.status === 'berhasil') {
      const { status, detail } = statusDariInspeksi(hasil.indeks)
      await perbaruiStatus(k.payload, baris.path, {
        status,
        detail,
        tautanInspeksi: hasil.indeks?.tautan ?? null,
        dirayapiPada: hasil.indeks?.lastCrawlTime ?? null,
        cekTerakhir: k.sekarang.toISOString(),
        cekBerikutnya,
      })
    } else if (lanjut.log === 'gagal') {
      await perbaruiStatus(k.payload, baris.path, { status: 'galat', detail: hasil.pesan, cekTerakhir: k.sekarang.toISOString(), cekBerikutnya })
    } else {
      await perbaruiStatus(k.payload, baris.path, { cekBerikutnya, ...(hasil.status === 'dilewati' ? { detail: hasil.pesan } : {}) })
    }
  }

  /**
   * Menjalankan antrean yang jatuh tempo (spesifikasi §8 langkah 2 sampai 6): sitemap, IndexNow, Indexing
   * API, lalu cek status, masing-masing dengan jendela kirim, kuota, dan jeda ulang dari `aturan.ts`.
   * Dipanggil cron setiap 10 menit dan lewat `after()` setelah konten terbit. Aman dipanggil berulang atau
   * bersamaan: baris diklaim sebelum dikirim, dan baris yang selesai dihapus.
   */
  export async function jalankanIndexer(payload: Payload, opsi: { sekarang?: Date; adapter?: AdapterIndexer } = {}): Promise<RingkasanJalan> {
    const k: Konteks = {
      payload,
      adapter: opsi.adapter ?? adapterIndexer(),
      pengaturan: await ambilPengaturanIndexing(payload),
      sekarang: opsi.sekarang ?? new Date(),
      ringkasan: { diproses: 0, berhasil: 0, diulang: 0, gagal: 0, dilewati: 0, ditunda: 0 },
    }
    const jatuhTempo = await barisJatuhTempo(payload, k.sekarang, BATAS_PER_JALAN)
    const per = (langkah: BarisTersimpan['langkah']) => jatuhTempo.filter((b) => b.langkah === langkah)

    await kirimSitemap(k, per('sitemap'))
    await kirimIndexNow(k, per('indexnow'))
    const { googleIndexing, searchConsole } = k.adapter
    if (k.pengaturan.pakaiIndexingApi) {
      await kirimPerUrl(k, per('indexing-api'), k.pengaturan.kuotaIndexingApi, googleIndexing.nama, (baris, url) =>
        googleIndexing.kabari(url, baris.jenis === 'hapus' ? 'URL_DELETED' : 'URL_UPDATED'),
      )
    } else {
      for (const baris of await klaimBaris(payload, per('indexing-api'), sewa(k))) {
        await selesai(k, baris, { status: 'dilewati', pesan: 'Indexing API dimatikan di Pengaturan SEO.' }, googleIndexing.nama, urlAbsolut(k.pengaturan, baris.path))
      }
    }
    await kirimPerUrl(
      k,
      per('cek-status'),
      k.pengaturan.kuotaInspeksi,
      searchConsole.nama,
      (_baris, url) => searchConsole.periksaUrl(k.pengaturan.propertiSearchConsole, url),
      (baris, hasil, lanjut) => catatHasilCek(k, baris, hasil, lanjut),
    )
    return k.ringkasan
  }
  ```

  ```diff
  diff --git a/src/modules/indexer/index.ts b/src/modules/indexer/index.ts
  index b7ec367..6a1cbe8 100644
  --- a/src/modules/indexer/index.ts
  +++ b/src/modules/indexer/index.ts
  @@ -13,6 +13,9 @@ import type { Kabar } from './tipe'
    *   atau dihapus. Mencatat langkah revalidasi (sudah dikerjakan hook `revalidasiPublik` saat simpan) dan
    *   memasukkan langkah berikutnya ke antrean: sitemap, IndexNow, Indexing API (bila aktif), cek status.
    *
  + * - `jalankanIndexer(payload, opsi)`: mengirim antrean yang jatuh tempo (cron dan `after()`), lalu
  + *   mencatat setiap langkah di log dan hasil cek status di `status-indeks`.
  + *
    * Antrean disimpan di Postgres (`antrean.ts`) dan dikirim terpisah dari penyimpanan dokumen, jadi
    * publikasi tidak pernah menunggu atau gagal karena mesin pencari.
    */
  @@ -45,4 +48,7 @@ export async function kabari(payload: Payload, daftar: Kabar[], opsi: { req?: Pa
     }
   }
   
  +export { jalankanIndexer, type RingkasanJalan } from './jalan'
  +export { adapterIndexer, pakaiAdapterIndexer, type AdapterIndexer } from './adapter'
  +export { adapterPalsu, type AdapterPalsu } from './palsu'
   export type { JenisKabar, Kabar, StatusIndeks } from './tipe'
  ```

- [ ] **Langkah 5: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 54 passed (54)`, `Tests 379 passed (379)`; integrasi `Test Files 29 passed (29)`, `Tests 90 passed (90)`; E2E `89 passed`. Jalankan `tests/int/indexer-jalan.int.spec.ts` tiga kali (`npx vitest run --config ./vitest.int.config.mts tests/int/indexer-jalan.int.spec.ts`); tes "dua pelari bersamaan" harus lulus setiap kali.

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/modules/indexer tests/int/indexer-jalan.int.spec.ts
  git commit -m "feat(indexer): pelari antrean dengan jendela kirim, satu POST IndexNow, kuota harian Google, jeda ulang, cek status bertahap, dan klaim atomik"
  ```

---

### Task 6: Pemicu di koleksi: terbit, perubahan besar, pindah alamat, batal terbit, hapus, dan angka aturan berubah

**Files:**
- Create: `src/hooks/kabariMesinPencari.ts`
- Modify: `src/modules/indexer/jalan.ts`, `src/modules/indexer/index.ts`, `src/hooks/redirectSaatPathBerubah.ts`, `src/collections/Artikel.ts`, `src/collections/Tools.ts`, `src/collections/Video.ts`, `src/collections/Halaman.ts`, `src/collections/Pilar.ts`, `src/collections/ParameterTools.ts`
- Test: `tests/int/indexer-hook.int.spec.ts`

**Interfaces:**
- Consumes: `kabari`, `jalankanIndexer` (Task 4 dan 5), `bandingkanVersi`, `VersiPublik` (Task 2), `pathFor`, `KeTarget` dan `targetSederhana` (`src/hooks/redirectSaatPathBerubah.ts`, Rencana 1), `sumberParameter` (`@/modules/hitung`, Rencana 5), `TOOL_IDS`.
- Produces:
  - `jalan.ts` (tambahan): `jalankanSetelahRespons(payload): void` (`after()` Next; di luar permintaan galat "outside a request scope" diabaikan).
  - `@/modules/indexer` (tambahan): `jalankanSetelahRespons`, `bandingkanVersi`, tipe `VersiPublik`.
  - `KeTarget` diekspor dari `redirectSaatPathBerubah.ts`.
  - `src/hooks/kabariMesinPencari.ts`: `kabariMesinPencari(keTarget, { tanda? }): { beforeChange, afterChange, afterDelete }`, `kabariParameterTools: { afterChange, afterDelete }`.

Hook ini menerapkan pemicu spesifikasi §8 di artikel, tools, video, halaman, dan pilar. Polanya sama dengan `redirectSaatPathBerubah` dan `revalidasiPublik` (Rencana 1 dan 3): `beforeChange` mencatat versi publik dokumen di `req.context`, karena di `afterChange` dokumen utama sudah tertimpa dan `previousDoc` bisa berisi draf. Versi publik adalah path dari `pathFor` (lewat `keTarget` yang sama dengan redirect) dan tanda perubahan besar (`diperbaruiBesar` untuk artikel), atau `null` untuk draf, batal terbit, dan noindex. Setelah simpan, `bandingkanVersi` mengubah selisihnya menjadi kabar; simpan draf (termasuk autosave) dan suntingan kecil tidak menghasilkan kabar. Hook dipasang setelah hook revalidasi di setiap array, jadi saat kabar dicatat, langkah 1 sudah selesai.

**Probe menemukan jebakan `req.context`:** `req.context[k] = await versiUtama(...)` kehilangan nilainya, karena `findByID` dengan `req` mengganti objek `req.context` saat `await` berjalan (ruas kiri sudah menunjuk objek lama). Hasil `await` disimpan ke variabel dulu, baru ditulis (Global Constraints).

Setelah kabar dicatat, `jalankanSetelahRespons` menjadwalkan pelari antrean lewat `after()`, jadi kabar pertama tidak menunggu cron. Di tes, seed, dan skrip `payload run` tidak ada request Next: `after` melempar "outside a request scope", galat itu diabaikan, dan antrean menunggu cron.

Parameter tools yang disimpan atau dihapus mengubah angka aturan dan hasil contoh di halaman kalkulator, jadi tools terbit yang memakainya (`sumberParameter`: THR memakai parameter Gaji Bersih) dikabarkan sebagai perubahan besar.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/int/indexer-hook.int.spec.ts`

  ```ts
  import type { Payload } from 'payload'
  import { describe, expect, it } from 'vitest'

  import { ambilEntriSitemap } from '@/modules/seo/data'

  import { dataArtikelTerbit, siapkanRelasiArtikel, videoMp4 } from './fixtures'
  import { getTestPayload, unik } from './helpers'

  /** Jenis kabar untuk satu path, berurutan: setiap kabar mencatat satu langkah revalidasi. */
  async function kabarUntuk(payload: Payload, path: string): Promise<string[]> {
    const { docs } = await payload.find({
      collection: 'log-indexing',
      where: { and: [{ url: { equals: `https://point.lat${path}` } }, { langkah: { equals: 'revalidasi' } }] },
      sort: ['waktu', 'id'],
      limit: 50,
      depth: 0,
    })
    return docs.map((d) => d.jenis ?? '')
  }

  async function diSitemap(payload: Payload, path: string): Promise<boolean> {
    const entri = await ambilEntriSitemap(payload, 'artikel', { urlSitus: 'https://point.lat' })
    return entri.some((e) => e.loc === `https://point.lat${path}`)
  }

  describe('pemicu Mesin Indexing di koleksi', () => {
    it('artikel: terbit, simpan draf dan suntingan kecil tidak, perubahan besar, batal terbit, terbit lagi, hapus', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const artikel = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      const path = `/${artikel.slug}`
      expect(await kabarUntuk(payload, path)).toEqual(['terbit'])

      await payload.update({ collection: 'artikel', id: artikel.id, draft: true, data: { judul: `${artikel.judul} draf` } })
      await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'published', deck: 'Deck baru yang sedikit berbeda.' } })
      expect(await kabarUntuk(payload, path)).toEqual(['terbit'])

      await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'published', perubahanBesar: true } })
      expect(await kabarUntuk(payload, path)).toEqual(['terbit', 'ubah-besar'])

      await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'draft' } })
      expect(await kabarUntuk(payload, path)).toEqual(['terbit', 'ubah-besar', 'hapus'])
      expect(await diSitemap(payload, path)).toBe(false)
      expect((await payload.find({ collection: 'status-indeks', where: { path: { equals: path } } })).docs).toEqual([])

      await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'published' } })
      expect(await diSitemap(payload, path)).toBe(true)
      await payload.delete({ collection: 'artikel', id: artikel.id })
      expect(await kabarUntuk(payload, path)).toEqual(['terbit', 'ubah-besar', 'hapus', 'terbit', 'hapus'])
      const { docs } = await payload.find({ collection: 'antrean-indexing', where: { path: { equals: path } }, depth: 0 })
      expect(docs.map((d) => [d.langkah, d.jenis])).toEqual([['indexnow', 'hapus']])
    })

    it('ganti slug: path lama pindah dan path baru terbit; noindex berarti keluar dari indeks', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const artikel = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      const slugBaru = unik('gaji-bersih-baru')
      await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'published', slug: slugBaru } })
      expect(await kabarUntuk(payload, `/${artikel.slug}`)).toEqual(['terbit', 'pindah'])
      expect(await kabarUntuk(payload, `/${slugBaru}`)).toEqual(['terbit'])

      await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'published', seo: { noindex: true } } })
      expect(await kabarUntuk(payload, `/${slugBaru}`)).toEqual(['terbit', 'hapus'])
    })

    it('pilar, halaman, video, dan tools ikut dikabarkan; angka aturan berubah mengabari kalkulator yang memakainya', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      expect(await kabarUntuk(payload, `/${relasi.pilar.slug}`)).toEqual(['terbit'])

      const halaman = await payload.create({ collection: 'halaman', data: { _status: 'published', judul: unik('Tentang') } })
      expect(await kabarUntuk(payload, `/${halaman.slug}`)).toEqual(['terbit'])

      const file = await payload.create({ collection: 'media', data: {}, file: videoMp4() })
      const video = await payload.create({
        collection: 'video',
        data: { _status: 'published', judul: unik('Video PPh 21'), file: file.id, pilar: relasi.pilar.id, transkrip: 'Transkrip.' },
      })
      expect(await kabarUntuk(payload, `/video/${video.slug}`)).toEqual(['terbit'])

      // `toolId` unik: tools Dana Darurat dari seed atau sisa tes sebelumnya dibersihkan dulu.
      await payload.delete({ collection: 'tools', where: { toolId: { equals: 'dana-darurat' } } })
      const tools = await payload.create({
        collection: 'tools',
        data: { _status: 'published', nama: unik('Dana Darurat'), toolId: 'dana-darurat', pilar: relasi.pilar.id, ringkasan: 'Hitung dana darurat.' },
      })
      const parameter = await payload.create({
        collection: 'parameter-tools',
        data: { toolId: 'dana-darurat', kunci: 'kelipatan', berlakuMulai: '2001-01-01', tabel: [{ label: 'Lajang tanpa tanggungan', nilai: 6 }] },
      })
      expect(await kabarUntuk(payload, `/tools/${tools.slug}`)).toEqual(['terbit', 'ubah-besar'])
      await payload.delete({ collection: 'parameter-tools', id: parameter.id })
      await payload.delete({ collection: 'tools', id: tools.id })
      expect(await kabarUntuk(payload, `/tools/${tools.slug}`)).toEqual(['terbit', 'ubah-besar', 'ubah-besar', 'hapus'])
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:int
  ```

  Hasil yang diharapkan: FAIL tiga tes di `tests/int/indexer-hook.int.spec.ts`: "artikel: terbit, ..." dengan `AssertionError: expected [] to deeply equal [ 'terbit' ]`, "ganti slug: ..." dengan `AssertionError: expected [] to deeply equal [ 'terbit', 'pindah' ]`, dan "pilar, halaman, video, dan tools ..." dengan `AssertionError: expected [] to deeply equal [ 'terbit' ]`.

- [ ] **Langkah 3: Jalankan antrean setelah respons**

  ```diff
  diff --git a/src/modules/indexer/jalan.ts b/src/modules/indexer/jalan.ts
  index b9ec0de..2f5b10e 100644
  --- a/src/modules/indexer/jalan.ts
  +++ b/src/modules/indexer/jalan.ts
  @@ -1,3 +1,4 @@
  +import { after } from 'next/server'
   import type { Payload } from 'payload'
   
   import { urlAbsolut } from '@/modules/seo/dokumen'
  @@ -219,3 +220,23 @@ export async function jalankanIndexer(payload: Payload, opsi: { sekarang?: Date;
     )
     return k.ringkasan
   }
  +
  +/**
  + * Menjalankan antrean setelah respons simpan terkirim (`after()` Next), supaya kabar pertama tidak
  + * menunggu cron (spesifikasi §5). Di luar permintaan Next (seed, tes, `payload run`) `after` melempar
  + * galat "outside a request scope": galat itu diabaikan dan antrean menunggu cron. Galat pelari
  + * dicatat ke log server, tidak pernah menggagalkan simpan.
  + */
  +export function jalankanSetelahRespons(payload: Payload): void {
  +  try {
  +    after(async () => {
  +      try {
  +        await jalankanIndexer(payload)
  +      } catch (galat) {
  +        payload.logger.error({ err: galat, msg: 'Mesin Indexing gagal dijalankan setelah simpan.' })
  +      }
  +    })
  +  } catch (galat) {
  +    if (!String((galat as Error)?.message).includes('outside a request scope')) throw galat
  +  }
  +}
  ```

  ```diff
  diff --git a/src/modules/indexer/index.ts b/src/modules/indexer/index.ts
  index 6a1cbe8..71b7c8a 100644
  --- a/src/modules/indexer/index.ts
  +++ b/src/modules/indexer/index.ts
  @@ -48,7 +48,8 @@ export async function kabari(payload: Payload, daftar: Kabar[], opsi: { req?: Pa
     }
   }
   
  -export { jalankanIndexer, type RingkasanJalan } from './jalan'
  +export { jalankanIndexer, jalankanSetelahRespons, type RingkasanJalan } from './jalan'
  +export { bandingkanVersi } from './aturan'
   export { adapterIndexer, pakaiAdapterIndexer, type AdapterIndexer } from './adapter'
   export { adapterPalsu, type AdapterPalsu } from './palsu'
  -export type { JenisKabar, Kabar, StatusIndeks } from './tipe'
  +export type { JenisKabar, Kabar, StatusIndeks, VersiPublik } from './tipe'
  ```

- [ ] **Langkah 4: Hook pemicu**

  ```diff
  diff --git a/src/hooks/redirectSaatPathBerubah.ts b/src/hooks/redirectSaatPathBerubah.ts
  index edb409b..9067ed7 100644
  --- a/src/hooks/redirectSaatPathBerubah.ts
  +++ b/src/hooks/redirectSaatPathBerubah.ts
  @@ -8,7 +8,7 @@ type DokumenBerpath = { slug?: string | null; _status?: 'draft' | 'published' |
     unknown
   >
   
  -type KeTarget = (doc: DokumenBerpath) => TargetPath | null
  +export type KeTarget = (doc: DokumenBerpath) => TargetPath | null
   
   const kunciKonteks = (koleksi: string, id: unknown) => `pathPublik:${koleksi}:${String(id)}`
   
  ```

  `src/hooks/kabariMesinPencari.ts`

  ```ts
  import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionBeforeChangeHook, PayloadRequest } from 'payload'

  import { TOOL_IDS, type ToolId } from '@/lib/konstanta'
  import { pathFor } from '@/lib/paths'
  import { sumberParameter } from '@/modules/hitung'
  import { bandingkanVersi, jalankanSetelahRespons, kabari, type Kabar, type VersiPublik } from '@/modules/indexer'

  import type { KeTarget } from './redirectSaatPathBerubah'

  type DokumenPublik = {
    id: number | string
    slug?: string | null
    _status?: 'draft' | 'published' | null
    seo?: { noindex?: boolean | null } | null
  } & Record<string, unknown>

  const kunciKonteks = (koleksi: string, id: unknown) => `indexerSebelumnya:${koleksi}:${String(id)}`

  async function kirim(req: PayloadRequest, kabar: Kabar[]): Promise<void> {
    if (!kabar.length) return
    await kabari(req.payload, kabar, { req })
    jalankanSetelahRespons(req.payload)
  }

  /**
   * Pemicu Mesin Indexing (spesifikasi §8: terbit, ubah besar, hapus) untuk koleksi berhalaman publik.
   *
   * Polanya sama dengan `redirectSaatPathBerubah` dan `revalidasiPublik`: versi publik dokumen (path dan
   * tanda perubahan besar) dicatat di `req.context` saat `beforeChange`, karena di `afterChange` dokumen
   * utama sudah tertimpa dan `previousDoc` bisa berisi draf. Setelah simpan, kedua versi dibandingkan
   * (`bandingkanVersi`): terbit pertama, batal terbit, ganti slug (path lama pindah), dan perubahan besar
   * menjadi kabar; simpan draf dan suntingan kecil tidak. Dokumen noindex tidak dianggap publik.
   * Dipasang setelah hook revalidasi, jadi langkah 1 (revalidasi) sudah terjadi saat kabar dicatat.
   */
  export function kabariMesinPencari(
    keTarget: KeTarget,
    opsi: { tanda?: (doc: DokumenPublik) => string | null | undefined } = {},
  ): {
    beforeChange: CollectionBeforeChangeHook
    afterChange: CollectionAfterChangeHook
    afterDelete: CollectionAfterDeleteHook
  } {
    function versiPublik(doc: DokumenPublik | null | undefined, pakaiDraf: boolean): VersiPublik | null {
      if (!doc || (pakaiDraf && doc._status !== 'published') || doc.seo?.noindex) return null
      const target = keTarget(doc)
      return target ? { path: pathFor(target), tanda: opsi.tanda?.(doc) ?? null } : null
    }

    async function versiUtama(req: PayloadRequest, koleksi: string, id: number | string) {
      const utama = await req.payload.findByID({ collection: koleksi as 'artikel', id, draft: false, depth: 0, req, disableErrors: true })
      return versiPublik(utama as DokumenPublik | null, true)
    }

    const beforeChange: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req, collection }) => {
      if (operation !== 'update' || !originalDoc) return data
      const pakaiDraf = Boolean(collection.versions?.drafts)
      // `originalDoc` adalah versi terakhir. Bila versi itu terbit (atau koleksi tanpa draf), itulah versi publik.
      const versi =
        !pakaiDraf || originalDoc._status === 'published' ? versiPublik(originalDoc, pakaiDraf) : await versiUtama(req, collection.slug, originalDoc.id)
      // Ditulis setelah `await`: operasi Payload dengan `req` bisa mengganti objek `req.context`.
      req.context[kunciKonteks(collection.slug, originalDoc.id)] = versi
      return data
    }

    const afterChange: CollectionAfterChangeHook = async ({ doc, req, collection }) => {
      const kunci = kunciKonteks(collection.slug, doc.id)
      const lama = (req.context[kunci] as VersiPublik | null | undefined) ?? null
      delete req.context[kunci]
      const pakaiDraf = Boolean(collection.versions?.drafts)
      // Simpan draf atau batal terbit: versi publik sekarang adalah dokumen utama.
      const baru = pakaiDraf && doc._status !== 'published' ? (lama ? await versiUtama(req, collection.slug, doc.id) : null) : versiPublik(doc, pakaiDraf)
      await kirim(req, bandingkanVersi(lama, baru))
      return doc
    }

    const afterDelete: CollectionAfterDeleteHook = async ({ doc, req, collection }) => {
      const lama = versiPublik(doc, Boolean(collection.versions?.drafts))
      if (lama) await kirim(req, [{ path: lama.path, jenis: 'hapus' }])
      return doc
    }

    return { beforeChange, afterChange, afterDelete }
  }

  /**
   * Angka aturan berubah: halaman kalkulator terbit yang memakai parameter itu berubah isinya (angka
   * aturan dan hasil contoh), jadi dikabarkan sebagai perubahan besar. THR ikut Gaji Bersih (`sumberParameter`).
   */
  async function kabariToolsTerdampak(req: PayloadRequest, toolId: (ToolId | null | undefined)[]): Promise<void> {
    const terdampak = TOOL_IDS.filter((t) => sumberParameter(t).some((s) => toolId.includes(s)))
    if (!terdampak.length) return
    const { docs } = await req.payload.find({
      collection: 'tools',
      where: { and: [{ toolId: { in: terdampak } }, { _status: { equals: 'published' } }, { 'seo.noindex': { not_equals: true } }] },
      depth: 0,
      limit: TOOL_IDS.length,
      select: { slug: true },
      req,
    })
    await kirim(
      req,
      docs.flatMap((d) => (d.slug ? [{ path: pathFor({ jenis: 'tools', slug: d.slug }), jenis: 'ubah-besar' as const }] : [])),
    )
  }

  export const kabariParameterTools: { afterChange: CollectionAfterChangeHook; afterDelete: CollectionAfterDeleteHook } = {
    afterChange: async ({ doc, previousDoc, req }) => {
      await kabariToolsTerdampak(req, [doc.toolId, previousDoc?.toolId])
      return doc
    },
    afterDelete: async ({ doc, req }) => {
      await kabariToolsTerdampak(req, [doc.toolId])
      return doc
    },
  }
  ```

- [ ] **Langkah 5: Pasang di koleksi**

  ```diff
  diff --git a/src/collections/Artikel.ts b/src/collections/Artikel.ts
  index 6af2611..0db7370 100644
  --- a/src/collections/Artikel.ts
  +++ b/src/collections/Artikel.ts
  @@ -7,6 +7,7 @@ import { faqField, sumberField } from '@/fields/konten'
   import { seoField } from '@/fields/seo'
   import { slugField } from '@/fields/slug'
   import { catatTanggalArtikel } from '@/hooks/catatTanggalArtikel'
  +import { kabariMesinPencari } from '@/hooks/kabariMesinPencari'
   import { redirectSaatPathBerubah } from '@/hooks/redirectSaatPathBerubah'
   import { revalidasiPublik } from '@/hooks/revalidasiPublik'
   import { LABEL_TIPE_ARTIKEL, TIPE_ARTIKEL, type TipeArtikel } from '@/lib/konstanta'
  @@ -26,6 +27,8 @@ const targetArtikel = (doc: { slug?: string | null; tipe?: unknown }): TargetPat
   
   const redirect = redirectSaatPathBerubah(targetArtikel)
   const revalidasi = revalidasiPublik('artikel')
  +/** `diperbaruiBesar` berubah hanya saat editor menandai perubahan besar (lastmod sitemap ikut berubah). */
  +const kabar = kabariMesinPencari(targetArtikel, { tanda: (doc) => doc.diperbaruiBesar as string | null })
   
   export const Artikel: CollectionConfig = {
     slug: 'artikel',
  @@ -42,9 +45,9 @@ export const Artikel: CollectionConfig = {
       maxPerDoc: 50,
     },
     hooks: {
  -    beforeChange: [catatTanggalArtikel, redirect.catatPathPublik, revalidasi.beforeChange],
  -    afterChange: [redirect.buatRedirect, revalidasi.afterChange],
  -    afterDelete: [revalidasi.afterDelete],
  +    beforeChange: [catatTanggalArtikel, redirect.catatPathPublik, revalidasi.beforeChange, kabar.beforeChange],
  +    afterChange: [redirect.buatRedirect, revalidasi.afterChange, kabar.afterChange],
  +    afterDelete: [revalidasi.afterDelete, kabar.afterDelete],
     },
     fields: [
       { name: 'judul', type: 'text', required: true },
  ```

  ```diff
  diff --git a/src/collections/Tools.ts b/src/collections/Tools.ts
  index feb9312..b88581e 100644
  --- a/src/collections/Tools.ts
  +++ b/src/collections/Tools.ts
  @@ -4,12 +4,14 @@ import { isLoggedIn, publishedOrLoggedIn } from '@/access'
   import { faqField, sumberField } from '@/fields/konten'
   import { seoField } from '@/fields/seo'
   import { slugField } from '@/fields/slug'
  +import { kabariMesinPencari } from '@/hooks/kabariMesinPencari'
   import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
   import { revalidasiPublik } from '@/hooks/revalidasiPublik'
   import { LABEL_TOOL, TOOL_IDS } from '@/lib/konstanta'
   
   const redirect = redirectSaatPathBerubah(targetSederhana('tools'))
   const revalidasi = revalidasiPublik('tools')
  +const kabar = kabariMesinPencari(targetSederhana('tools'))
   
   export const Tools: CollectionConfig = {
     slug: 'tools',
  @@ -17,9 +19,9 @@ export const Tools: CollectionConfig = {
     admin: { useAsTitle: 'nama', defaultColumns: ['nama', 'toolId', 'pilar', '_status'], group: 'Tools' },
     access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
     hooks: {
  -    beforeChange: [redirect.catatPathPublik, revalidasi.beforeChange],
  -    afterChange: [redirect.buatRedirect, revalidasi.afterChange],
  -    afterDelete: [revalidasi.afterDelete],
  +    beforeChange: [redirect.catatPathPublik, revalidasi.beforeChange, kabar.beforeChange],
  +    afterChange: [redirect.buatRedirect, revalidasi.afterChange, kabar.afterChange],
  +    afterDelete: [revalidasi.afterDelete, kabar.afterDelete],
     },
     versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 50 },
     fields: [
  ```

  ```diff
  diff --git a/src/collections/Video.ts b/src/collections/Video.ts
  index 6d40878..93e8482 100644
  --- a/src/collections/Video.ts
  +++ b/src/collections/Video.ts
  @@ -3,6 +3,7 @@ import type { CollectionConfig } from 'payload'
   import { isLoggedIn, publishedOrLoggedIn } from '@/access'
   import { seoField } from '@/fields/seo'
   import { slugField } from '@/fields/slug'
  +import { kabariMesinPencari } from '@/hooks/kabariMesinPencari'
   import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
   import { revalidasiPublik } from '@/hooks/revalidasiPublik'
   import { validasiVtt } from '@/lib/validasi'
  @@ -10,6 +11,7 @@ import { validasiVtt } from '@/lib/validasi'
   /** Artikel induk tidak disimpan di sini: frontend mencari artikel yang `videoTerkait`-nya video ini. */
   const redirect = redirectSaatPathBerubah(targetSederhana('video'))
   const revalidasi = revalidasiPublik('video')
  +const kabar = kabariMesinPencari(targetSederhana('video'))
   
   export const Video: CollectionConfig = {
     slug: 'video',
  @@ -17,9 +19,9 @@ export const Video: CollectionConfig = {
     admin: { useAsTitle: 'judul', defaultColumns: ['judul', 'pilar', 'durasiDetik', '_status'], group: 'Konten' },
     access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
     hooks: {
  -    beforeChange: [redirect.catatPathPublik, revalidasi.beforeChange],
  -    afterChange: [redirect.buatRedirect, revalidasi.afterChange],
  -    afterDelete: [revalidasi.afterDelete],
  +    beforeChange: [redirect.catatPathPublik, revalidasi.beforeChange, kabar.beforeChange],
  +    afterChange: [redirect.buatRedirect, revalidasi.afterChange, kabar.afterChange],
  +    afterDelete: [revalidasi.afterDelete, kabar.afterDelete],
     },
     versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 30 },
     fields: [
  ```

  ```diff
  diff --git a/src/collections/Halaman.ts b/src/collections/Halaman.ts
  index c1ae147..678ed1a 100644
  --- a/src/collections/Halaman.ts
  +++ b/src/collections/Halaman.ts
  @@ -4,11 +4,13 @@ import { isLoggedIn, publishedOrLoggedIn } from '@/access'
   import { blokHalaman } from '@/blocks/halaman'
   import { seoField } from '@/fields/seo'
   import { slugField } from '@/fields/slug'
  +import { kabariMesinPencari } from '@/hooks/kabariMesinPencari'
   import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
   import { revalidasiPublik } from '@/hooks/revalidasiPublik'
   
   const redirect = redirectSaatPathBerubah(targetSederhana('halaman'))
   const revalidasi = revalidasiPublik('halaman')
  +const kabar = kabariMesinPencari(targetSederhana('halaman'))
   
   export const Halaman: CollectionConfig = {
     slug: 'halaman',
  @@ -17,9 +19,9 @@ export const Halaman: CollectionConfig = {
     access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
     versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 30 },
     hooks: {
  -    beforeChange: [redirect.catatPathPublik, revalidasi.beforeChange],
  -    afterChange: [redirect.buatRedirect, revalidasi.afterChange],
  -    afterDelete: [revalidasi.afterDelete],
  +    beforeChange: [redirect.catatPathPublik, revalidasi.beforeChange, kabar.beforeChange],
  +    afterChange: [redirect.buatRedirect, revalidasi.afterChange, kabar.afterChange],
  +    afterDelete: [revalidasi.afterDelete, kabar.afterDelete],
     },
     fields: [
       { name: 'judul', type: 'text', required: true },
  ```

  ```diff
  diff --git a/src/collections/Pilar.ts b/src/collections/Pilar.ts
  index b6363f9..28a40a9 100644
  --- a/src/collections/Pilar.ts
  +++ b/src/collections/Pilar.ts
  @@ -3,12 +3,14 @@ import type { CollectionConfig } from 'payload'
   import { anyone, isAdmin } from '@/access'
   import { seoField } from '@/fields/seo'
   import { slugField } from '@/fields/slug'
  +import { kabariMesinPencari } from '@/hooks/kabariMesinPencari'
   import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
   import { revalidasiPublik } from '@/hooks/revalidasiPublik'
   import { WARNA_PILAR } from '@/lib/konstanta'
   
   const redirect = redirectSaatPathBerubah(targetSederhana('pilar'))
   const revalidasi = revalidasiPublik('pilar')
  +const kabar = kabariMesinPencari(targetSederhana('pilar'))
   
   export const Pilar: CollectionConfig = {
     slug: 'pilar',
  @@ -21,9 +23,9 @@ export const Pilar: CollectionConfig = {
     },
     access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
     hooks: {
  -    beforeChange: [redirect.catatPathPublik],
  -    afterChange: [redirect.buatRedirect, revalidasi.afterChange],
  -    afterDelete: [revalidasi.afterDelete],
  +    beforeChange: [redirect.catatPathPublik, kabar.beforeChange],
  +    afterChange: [redirect.buatRedirect, revalidasi.afterChange, kabar.afterChange],
  +    afterDelete: [revalidasi.afterDelete, kabar.afterDelete],
     },
     fields: [
       { name: 'nama', type: 'text', required: true },
  ```

  ```diff
  diff --git a/src/collections/ParameterTools.ts b/src/collections/ParameterTools.ts
  index aa1da7d..32855fd 100644
  --- a/src/collections/ParameterTools.ts
  +++ b/src/collections/ParameterTools.ts
  @@ -2,6 +2,7 @@ import type { CollectionConfig } from 'payload'
   import { array, number, text } from 'payload/shared'
   
   import { isLoggedIn } from '@/access'
  +import { kabariParameterTools } from '@/hooks/kabariMesinPencari'
   import { revalidasiKoleksi } from '@/hooks/revalidasiPublik'
   import { LABEL_TOOL, TOOL_IDS, type ToolId } from '@/lib/konstanta'
   import { TAG } from '@/lib/tag'
  @@ -36,7 +37,10 @@ export const ParameterTools: CollectionConfig = {
         'Untuk mengganti angka yang berubah (misalnya batas upah JP tahun depan), buat dokumen baru dengan kunci yang sama dan tanggal berlaku baru, lalu isi tanggal akhir dokumen lama.',
     },
     access: { read: isLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  -  hooks: { afterChange: [revalidasi.afterChange], afterDelete: [revalidasi.afterDelete] },
  +  hooks: {
  +    afterChange: [revalidasi.afterChange, kabariParameterTools.afterChange],
  +    afterDelete: [revalidasi.afterDelete, kabariParameterTools.afterDelete],
  +  },
     fields: [
       {
         name: 'toolId',
  ```

- [ ] **Langkah 6: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 54 passed (54)`, `Tests 379 passed (379)`; integrasi `Test Files 30 passed (30)`, `Tests 93 passed (93)`; E2E `89 passed`. Skema tidak berubah (`npm run generate:types` tidak mengubah `payload-types.ts`).

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/hooks src/modules/indexer src/collections tests/int/indexer-hook.int.spec.ts
  git commit -m "feat(indexer): kabari mesin pencari saat artikel, tools, video, halaman, dan pilar terbit, berubah besar, pindah alamat, atau dihapus, dan saat angka aturan kalkulator berubah"
  ```

---

### Task 7: Cron `GET /api/jobs/run` dengan `CRON_SECRET`, jadwal terbit, `vercel.json`, dan `npm run indexer`

**Files:**
- Create: `src/modules/indexer/endpoint.ts`, `src/scripts/jalankan-indexer.ts`, `vercel.json`
- Modify: `src/payload.config.ts`, `package.json`
- Test: `tests/unit/indexer-cron.test.ts`, `tests/int/indexer-cron.int.spec.ts`

**Interfaces:**
- Consumes: `jalankanIndexer`, `RingkasanJalan`, `adapterPalsu`, `pakaiAdapterIndexer` (Task 5); `payload.jobs.run` dan task `schedulePublish` bawaan Payload (aktif karena `schedulePublish: true` di artikel sejak Rencana 1).
- Produces:
  - `endpoint.ts`: `izinCron(header, rahasia): boolean`, `HasilJadwal = { jadwalTerbit: number; indexer: RingkasanJalan }`, `jalankanJadwal(payload, opsi?): Promise<HasilJadwal>`, `endpointJalankanJob` (root endpoint `GET /api/jobs/run`).
  - Skrip `npm run indexer` (`src/scripts/jalankan-indexer.ts`).
  - `vercel.json`: cron `*/10 * * * *` ke `/api/jobs/run`.

Vercel Cron memanggil `GET` ke deployment produksi dan, bila env `CRON_SECRET` ada, mengirim `Authorization: Bearer <CRON_SECRET>` (dokumentasi Vercel "Managing Cron Jobs"). Endpoint membandingkan header itu dengan `timingSafeEqual`; tanpa `CRON_SECRET`, permintaan anonim selalu 401. Admin yang sedang masuk juga boleh membukanya (menjalankan antrean sekarang, berguna di lokal). Vercel juga mengingatkan bahwa cron bisa terlewat atau terkirim dua kali: pelari antrean sudah aman untuk itu (klaim atomik dan baris yang selesai dihapus, Task 5).

Endpoint ini juga menjalankan job Payload yang jatuh tempo (`payload.jobs.run({ allQueues: true })`). Tabel `payload_jobs` sudah ada sejak Rencana 1 karena artikel memakai `schedulePublish: true`, tetapi belum ada yang menjalankannya, jadi jadwal terbit di admin belum pernah bekerja. Job jalan lebih dulu, sehingga artikel yang terbit terjadwal langsung masuk antrean dan dikabarkan pada jalan yang sama.

Tanpa Vercel (lokal): `npm run indexer` menjalankan pekerjaan yang sama sekali lalu mencetak ringkasannya, atau buka `http://localhost:3000/api/jobs/run` sebagai admin.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/indexer-cron.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { izinCron } from '@/modules/indexer/endpoint'

  describe('izinCron: header Vercel Cron', () => {
    it('menerima Authorization: Bearer CRON_SECRET yang persis sama', () => {
      expect(izinCron('Bearer rahasia-cron-panjang-2026', 'rahasia-cron-panjang-2026')).toBe(true)
    })

    it('menolak rahasia lain, tanpa awalan Bearer, tanpa header, dan bila CRON_SECRET belum diatur', () => {
      expect(izinCron('Bearer rahasia-lain-panjang-2026', 'rahasia-cron-panjang-2026')).toBe(false)
      expect(izinCron('rahasia-cron-panjang-2026', 'rahasia-cron-panjang-2026')).toBe(false)
      expect(izinCron(null, 'rahasia-cron-panjang-2026')).toBe(false)
      expect(izinCron('Bearer ', '')).toBe(false)
      expect(izinCron('Bearer undefined', undefined)).toBe(false)
    })
  })
  ```

  `tests/int/indexer-cron.int.spec.ts`

  ```ts
  import type { PayloadRequest } from 'payload'
  import { afterAll, beforeAll, describe, expect, it } from 'vitest'

  import { adapterPalsu, pakaiAdapterIndexer } from '@/modules/indexer'
  import { endpointJalankanJob } from '@/modules/indexer/endpoint'

  import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
  import { getTestPayload } from './helpers'

  const RAHASIA = 'rahasia-cron-tes-yang-cukup-panjang'
  const palsu = adapterPalsu()

  async function panggil(headers: Record<string, string>, user: PayloadRequest['user'] = null) {
    const payload = await getTestPayload()
    const req = { payload, headers: new Headers(headers), user } as unknown as PayloadRequest
    return endpointJalankanJob.handler(req)
  }

  describe('GET /api/jobs/run (Vercel Cron)', () => {
    beforeAll(() => {
      pakaiAdapterIndexer(palsu)
    })

    afterAll(() => {
      pakaiAdapterIndexer(null)
      delete process.env.CRON_SECRET
    })

    it('menolak tanpa CRON_SECRET yang cocok; menerima Bearer CRON_SECRET dan admin yang masuk', async () => {
      delete process.env.CRON_SECRET
      expect((await panggil({ authorization: 'Bearer ' })).status).toBe(401)
      process.env.CRON_SECRET = RAHASIA
      const ditolak = await panggil({ authorization: 'Bearer salah' })
      expect(ditolak.status).toBe(401)
      expect(await ditolak.json()).toEqual({ pesan: 'Butuh header Authorization: Bearer CRON_SECRET, atau masuk sebagai admin.' })
      expect((await panggil({ authorization: `Bearer ${RAHASIA}` })).status).toBe(200)
      expect((await panggil({}, { id: 1, peran: 'admin', collection: 'pengguna' } as unknown as PayloadRequest['user'])).status).toBe(200)
    })

    it('jadwal terbit artikel berjalan lewat cron, lalu artikelnya langsung dikabarkan', async () => {
      const payload = await getTestPayload()
      process.env.CRON_SECRET = RAHASIA
      // Antrean sisa tes lain dikosongkan supaya artikel ini masuk batas satu jalan.
      await payload.delete({ collection: 'antrean-indexing', where: { id: { exists: true } } })
      const relasi = await siapkanRelasiArtikel(payload)
      const draf = await payload.create({ collection: 'artikel', draft: true, data: { ...dataArtikelTerbit(relasi), _status: 'draft' } })
      await payload.jobs.queue({
        task: 'schedulePublish',
        input: { type: 'publish', doc: { relationTo: 'artikel', value: draf.id } },
        waitUntil: new Date(Date.now() - 60_000),
      })
      palsu.reset()

      const jawaban = await panggil({ authorization: `Bearer ${RAHASIA}` })
      const hasil = await jawaban.json()
      expect(hasil.jadwalTerbit).toBeGreaterThanOrEqual(1)
      expect((await payload.findByID({ collection: 'artikel', id: draf.id }))._status).toBe('published')
      const url = `https://point.lat/${draf.slug}`
      const { docs } = await payload.find({ collection: 'log-indexing', where: { url: { equals: url } }, sort: ['waktu', 'id'] })
      expect(docs.map((d) => [d.langkah, d.status])).toEqual([
        ['revalidasi', 'berhasil'],
        ['indexnow', 'dilewati'],
      ])
      expect(palsu.panggilan.filter((p) => p.aksi === 'kirimIndexNow')).toEqual([])
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: unit FAIL di `tests/unit/indexer-cron.test.ts` dengan `Error: Cannot find package '@/modules/indexer/endpoint'`; integrasi FAIL di `tests/int/indexer-cron.int.spec.ts` dengan pesan yang sama untuk file itu.

- [ ] **Langkah 3: Endpoint cron**

  `src/modules/indexer/endpoint.ts`

  ```ts
  import { timingSafeEqual } from 'crypto'
  import type { Endpoint, Payload } from 'payload'

  import { jalankanIndexer, type RingkasanJalan } from './jalan'

  /**
   * Header dari Vercel Cron: `Authorization: Bearer <CRON_SECRET>` (dokumentasi Vercel "Securing cron
   * jobs"). Tanpa `CRON_SECRET` di env, permintaan tanpa login admin selalu ditolak. Dibandingkan dengan
   * waktu tetap supaya rahasia tidak bisa ditebak dari lama jawaban.
   */
  export function izinCron(header: string | null | undefined, rahasia: string | undefined): boolean {
    if (!rahasia || !header) return false
    const diterima = Buffer.from(header)
    const diharapkan = Buffer.from(`Bearer ${rahasia}`)
    return diterima.length === diharapkan.length && timingSafeEqual(diterima, diharapkan)
  }

  export type HasilJadwal = { jadwalTerbit: number; indexer: RingkasanJalan }

  /**
   * Pekerjaan berkala (spesifikasi §5 "Penjadwal"): job Payload yang jatuh tempo (jadwal terbit artikel,
   * `schedulePublish`), lalu antrean Mesin Indexing. Urutan ini membuat artikel yang terbit terjadwal
   * langsung dikabarkan pada jalan yang sama.
   */
  export async function jalankanJadwal(payload: Payload, opsi: Parameters<typeof jalankanIndexer>[1] = {}): Promise<HasilJadwal> {
    const job = await payload.jobs.run({ allQueues: true, overrideAccess: true, silent: true })
    const indexer = await jalankanIndexer(payload, opsi)
    return { jadwalTerbit: Object.keys(job.jobStatus ?? {}).length, indexer }
  }

  /**
   * `GET /api/jobs/run`: dipanggil Vercel Cron setiap 10 menit (`vercel.json`). GET karena Vercel Cron
   * hanya mengirim GET. Boleh juga dibuka admin yang sedang masuk (menjalankan antrean sekarang).
   */
  export const endpointJalankanJob: Endpoint = {
    path: '/jobs/run',
    method: 'get',
    handler: async (req) => {
      const admin = (req.user as { peran?: string | null } | null | undefined)?.peran === 'admin'
      if (!admin && !izinCron(req.headers.get('authorization'), process.env.CRON_SECRET)) {
        return Response.json({ pesan: 'Butuh header Authorization: Bearer CRON_SECRET, atau masuk sebagai admin.' }, { status: 401 })
      }
      return Response.json(await jalankanJadwal(req.payload))
    },
  }
  ```

  ```diff
  diff --git a/src/payload.config.ts b/src/payload.config.ts
  index 2c06472..24a8847 100644
  --- a/src/payload.config.ts
  +++ b/src/payload.config.ts
  @@ -25,6 +25,7 @@ import { Footer } from './globals/Footer'
   import { Header } from './globals/Header'
   import { Newsletter } from './globals/Newsletter'
   import { PengaturanSEO } from './globals/PengaturanSEO'
  +import { endpointJalankanJob } from './modules/indexer/endpoint'
   import { klienMedia } from './modules/media'
   import { mediaCloudinary } from './modules/media/plugin'
   
  @@ -54,6 +55,8 @@ export default buildConfig({
       StatusIndeks,
     ],
     globals: [Header, Footer, Beranda, PengaturanSEO, Newsletter],
  +  // `GET /api/jobs/run`: cron Vercel setiap 10 menit (vercel.json), jadwal terbit dan Mesin Indexing.
  +  endpoints: [endpointJalankanJob],
     editor: lexicalEditor(),
     secret: process.env.PAYLOAD_SECRET || '',
     typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
  ```

- [ ] **Langkah 4: Jadwal Vercel dan skrip lokal**

  `vercel.json`

  ```json
  {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    "crons": [{ "path": "/api/jobs/run", "schedule": "*/10 * * * *" }]
  }
  ```

  `src/scripts/jalankan-indexer.ts`

  ```ts
  import config from '@payload-config'
  import { getPayload } from 'payload'

  import { jalankanJadwal } from '@/modules/indexer/endpoint'

  /**
   * `npm run indexer`: menjalankan sekali pekerjaan cron (jadwal terbit dan antrean Mesin Indexing) tanpa
   * Vercel. Adapter mengikuti `INDEXER_ADAPTER` (lokal: palsu, tanpa jaringan).
   */
  const payload = await getPayload({ config })
  const { jadwalTerbit, indexer } = await jalankanJadwal(payload)
  payload.logger.info(
    `Jadwal terbit: ${jadwalTerbit} job. Mesin Indexing: ${indexer.diproses} langkah (berhasil ${indexer.berhasil}, ` +
      `dicoba lagi ${indexer.diulang}, gagal ${indexer.gagal}, dilewati ${indexer.dilewati}, ditunda ${indexer.ditunda}).`,
  )
  process.exit(0)
  ```

  ```diff
  diff --git a/package.json b/package.json
  index dbc8ad0..d101492 100644
  --- a/package.json
  +++ b/package.json
  @@ -19,7 +19,8 @@
       "test:e2e": "playwright test",
       "typecheck": "tsc --noEmit",
       "seed": "cross-env NODE_OPTIONS=--no-deprecation payload run src/seed/run.ts",
  -    "media:siapkan": "cross-env NODE_OPTIONS=--no-deprecation payload run src/scripts/siapkan-media.ts"
  +    "media:siapkan": "cross-env NODE_OPTIONS=--no-deprecation payload run src/scripts/siapkan-media.ts",
  +    "indexer": "cross-env NODE_OPTIONS=--no-deprecation payload run src/scripts/jalankan-indexer.ts"
     },
     "dependencies": {
       "@payloadcms/db-postgres": "3.92.1",
  ```

  Coba di database dev:

  ```bash
  npm run indexer
  ```

  Hasil yang diharapkan: satu baris log yang diawali `Jadwal terbit: 0 job. Mesin Indexing:` lalu jumlah langkah per status (berhasil, dicoba lagi, gagal, dilewati, ditunda). Adapter palsu, tanpa jaringan.

- [ ] **Langkah 5: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 55 passed (55)`, `Tests 381 passed (381)`; integrasi `Test Files 31 passed (31)`, `Tests 95 passed (95)`; E2E `89 passed`.

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/modules/indexer/endpoint.ts src/scripts/jalankan-indexer.ts src/payload.config.ts package.json vercel.json tests/unit/indexer-cron.test.ts tests/int/indexer-cron.int.spec.ts
  git commit -m "feat(indexer): cron /api/jobs/run dengan CRON_SECRET untuk jadwal terbit dan Mesin Indexing, vercel.json setiap 10 menit, dan npm run indexer untuk lokal"
  ```

---

### Task 8: Admin: status pemasangan dan peringatan Indexing API di Pengaturan SEO, kolom status indeks di daftar artikel

**Files:**
- Create: `src/modules/indexer/pemasangan.ts`, `src/modules/indexer/admin/StatusPemasangan.tsx`, `src/modules/indexer/admin/PeringatanIndexingApi.tsx`, `src/modules/indexer/admin/SelStatusIndeks.tsx`, `src/modules/indexer/admin/indexing.scss`
- Modify: `src/globals/PengaturanSEO.ts`, `src/collections/Artikel.ts`, `src/collections/StatusIndeks.ts`, `src/app/(payload)/admin/importMap.js` (dibuat ulang), `tests/e2e/bantu.ts`, `tests/e2e/indexing.spec.ts`
- Test: `tests/unit/indexer-pemasangan.test.ts`, `tests/e2e/indexing.spec.ts`

**Interfaces:**
- Consumes: `bacaAkunLayanan` (Task 3), `pathFileKunci` (Task 1), `ambilPengaturanIndexing` (Task 4), `LABEL_STATUS_INDEKS` (Task 2), `pathFor`.
- Produces:
  - `pemasangan.ts`: `ButirPemasangan = { label, siap, teks }`, `ringkasPemasangan(env, { kunciIndexNow }): ButirPemasangan[]` (Pengiriman, Akun layanan Google, Cron, IndexNow; tanpa isi rahasia).
  - Komponen admin (server component): `StatusPemasangan` (field `ui` `indexing.statusPemasangan`), `PeringatanIndexingApi` (field `ui` `indexing.peringatanIndexingApi`, `role="note"`), `SelStatusIndeks` (sel field `ui` `statusIndeks` di artikel), `URL_KETENTUAN_INDEXING_API`.
  - `periksaAxe(page, ...bagian)` di `tests/e2e/bantu.ts`: tanpa `bagian` seperti sebelumnya (seluruh halaman); dengan selector, axe hanya memeriksa bagian itu (komponen kustom di admin Payload).

Pemilik perlu tahu tiga hal tanpa membuka log: apakah pemasangan sudah lengkap, kenapa Indexing API sebaiknya tetap mati, dan apakah artikelnya sudah terindeks (spesifikasi §1 kriteria sukses 2, §8 langkah 4, §18).

- **Status pemasangan** di atas grup Mesin Indexing: mode pengiriman (`INDEXER_ADAPTER`), akun layanan Google (`GOOGLE_SERVICE_ACCOUNT_JSON` terbaca atau alasannya), `CRON_SECRET`, dan kunci IndexNow. Setiap butir bertanda teks "Siap" atau "Perlu diatur" (tidak hanya warna) dan menyebut cara mengaturnya. Isi rahasia tidak pernah ditampilkan. Komponen server membaca env dan pengaturan yang tersimpan, jadi setelah menyimpan, muat ulang halaman untuk melihat status baru.
- **Peringatan Indexing API** tepat di atas saklar: Google hanya mengizinkan API ini untuk halaman lowongan kerja (JobPosting) dan siaran langsung (BroadcastEvent di dalam VideoObject), dengan tautan ke ketentuan resmi.
- **Kolom "Status indeks"** di daftar artikel: field `ui` dengan `Cell` kustom (`@payloadcms/ui` merender field `ui` sebagai kolom bila punya `Cell`). Sel membaca `status-indeks` untuk path artikel (satu query kecil per baris): label status, "Belum dicek", "Belum terbit", atau "Noindex".

Gaya memakai variabel tema Payload (`--theme-warning-*`, `--theme-success-*`, `--theme-elevation-*`) seperti `PanelSeo.scss`, jadi ikut mode terang dan gelap admin. Daftar status pemasangan memakai satu kisi untuk semua butir (`dl` grid, `div` pembungkus `display: contents`) supaya kolom label sejajar; di bawah 600 px menjadi satu kolom. Uji visual dan keyboard di probe (375, 768, 1440 px) menemukan empat hal yang sudah diperbaiki di kode di bawah: label status pemasangan tidak sejajar saat setiap baris menjadi kisi sendiri; urutan bawaan `-cekTerakhir` di `status-indeks` menaruh baris yang belum pernah dicek (tanggal kosong) di atas, jadi diganti `-updatedAt`; CSS admin Payload menghapus outline tautan, jadi tautan peringatan tidak punya cincin fokus (WCAG 2.4.7) sampai `a:focus-visible` diberi outline sendiri; dan tanda "Siap" menempel pada teks berikutnya ("SiapKunci ..." bagi pembaca layar) sampai diberi spasi sungguhan. Tes E2E admin menjaga cincin fokus itu.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/indexer-pemasangan.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { ringkasPemasangan } from '@/modules/indexer/pemasangan'

  const AKUN = JSON.stringify({ client_email: 'indexer@point-lat.iam.gserviceaccount.com', private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n' })

  describe('ringkasPemasangan: status pemasangan di Pengaturan SEO', () => {
    it('lokal tanpa env: semua butir perlu diatur dan dijelaskan cara mengaturnya', () => {
      expect(ringkasPemasangan({}, { kunciIndexNow: null })).toEqual([
        { label: 'Pengiriman', siap: false, teks: 'Palsu: tidak ada yang dikirim ke luar. Isi INDEXER_ADAPTER=asli di env produksi Vercel.' },
        { label: 'Akun layanan Google', siap: false, teks: 'Akun layanan Google belum diatur (env GOOGLE_SERVICE_ACCOUNT_JSON kosong).' },
        { label: 'Cron', siap: false, teks: 'CRON_SECRET belum diatur, jadi Vercel Cron ditolak. Isi minimal 16 karakter acak di env Vercel.' },
        { label: 'IndexNow', siap: false, teks: 'Kunci belum diisi, jadi IndexNow dilewati.' },
      ])
    })

    it('produksi lengkap: siap tanpa menampilkan isi rahasia', () => {
      const butir = ringkasPemasangan(
        { INDEXER_ADAPTER: 'asli', GOOGLE_SERVICE_ACCOUNT_JSON: AKUN, CRON_SECRET: 'rahasia-cron-panjang-2026' },
        { kunciIndexNow: 'kunci-point-2026' },
      )
      expect(butir.every((b) => b.siap)).toBe(true)
      expect(butir.map((b) => b.teks).join(' ')).not.toMatch(/rahasia-cron|PRIVATE KEY|iam\.gserviceaccount/)
      expect(butir[3].teks).toBe('Kunci tersimpan dan dilayani di /kunci-point-2026.txt.')
    })
  })
  ```

  Tes E2E admin (masuk lewat REST, cookie dipakai halaman) dan pilihan bagian untuk axe:

  ```diff
  diff --git a/tests/e2e/bantu.ts b/tests/e2e/bantu.ts
  index cb82f1d..654de23 100644
  --- a/tests/e2e/bantu.ts
  +++ b/tests/e2e/bantu.ts
  @@ -18,8 +18,11 @@ export async function cegatCloudinary(page: Page): Promise<void> {
     )
   }
   
  -export async function periksaAxe(page: Page): Promise<void> {
  -  const hasil = await new AxeBuilder({ page }).withTags(TAG_WCAG).analyze()
  +/** `bagian`: selector yang diperiksa saja, misalnya komponen kustom di admin Payload. Tanpa itu: seluruh halaman. */
  +export async function periksaAxe(page: Page, ...bagian: string[]): Promise<void> {
  +  let axe = new AxeBuilder({ page }).withTags(TAG_WCAG)
  +  for (const selector of bagian) axe = axe.include(selector)
  +  const hasil = await axe.analyze()
     expect(hasil.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
   }
   
  ```

  ```diff
  diff --git a/tests/e2e/indexing.spec.ts b/tests/e2e/indexing.spec.ts
  index fbf8b8b..8478f91 100644
  --- a/tests/e2e/indexing.spec.ts
  +++ b/tests/e2e/indexing.spec.ts
  @@ -1,6 +1,7 @@
   import { expect, test } from '@playwright/test'
   
  -import { KUNCI_INDEXNOW } from './data'
  +import { periksaAxe } from './bantu'
  +import { ADMIN_E2E, JUDUL_PANDUAN, KUNCI_INDEXNOW } from './data'
   
   test('file kunci IndexNow di /{kunci}.txt berisi kunci dari pengaturan SEO; kunci lain 404', async ({ request }) => {
     const jawaban = await request.get(`/${KUNCI_INDEXNOW}.txt`)
  @@ -11,3 +12,29 @@ test('file kunci IndexNow di /{kunci}.txt berisi kunci dari pengaturan SEO; kunc
     expect((await request.get('/kunci-yang-salah-2026.txt')).status()).toBe(404)
     expect((await request.get('/robots.txt')).status()).toBe(200)
   })
  +
  +test('admin: status pemasangan, peringatan Indexing API, dan kolom status indeks di daftar artikel', async ({ page }) => {
  +  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  +  await page.goto('/admin/globals/pengaturan-seo')
  +  const pemasangan = page.getByRole('region', { name: 'Status pemasangan Mesin Indexing' })
  +  await expect(pemasangan).toContainText('Palsu: tidak ada yang dikirim ke luar.')
  +  await expect(pemasangan).toContainText(`Kunci tersimpan dan dilayani di /${KUNCI_INDEXNOW}.txt.`)
  +  const peringatan = page.getByRole('note', { name: 'Indexing API bukan untuk artikel' })
  +  await expect(peringatan.getByRole('link', { name: 'Baca ketentuan Indexing API' })).toHaveAttribute(
  +    'href',
  +    'https://developers.google.com/search/apis/indexing-api/v3/using-api',
  +  )
  +  await expect(page.getByRole('checkbox', { name: 'Kabari Google lewat Indexing API' })).not.toBeChecked()
  +  await periksaAxe(page, '.indexing-pemasangan', '.indexing-peringatan')
  +
  +  // Tab dari isian sebelumnya sampai tautan ketentuan: cincin fokus terlihat (CSS admin Payload menghapusnya).
  +  await page.getByLabel('Batas cek status per hari').focus()
  +  await page.keyboard.press('Tab')
  +  const tautan = peringatan.getByRole('link', { name: 'Baca ketentuan Indexing API' })
  +  await expect(tautan).toBeFocused()
  +  expect(await tautan.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid')
  +
  +  await page.goto('/admin/collections/artikel')
  +  await expect(page.getByRole('columnheader', { name: 'Status indeks' })).toBeVisible()
  +  await expect(page.getByRole('row').filter({ hasText: JUDUL_PANDUAN })).toContainText('Belum dicek')
  +})
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/indexer-pemasangan.test.ts` dengan `Error: Cannot find package '@/modules/indexer/pemasangan'`. (Tes E2E admin baru dijalankan di Langkah 5; sebelum komponen ada, tes itu gagal dengan `Error: expect(locator).toContainText(expected) failed` untuk `getByRole('region', { name: 'Status pemasangan Mesin Indexing' })` (`Error: element(s) not found`).)

- [ ] **Langkah 3: Ringkasan pemasangan dan komponen admin**

  `src/modules/indexer/pemasangan.ts`

  ```ts
  import { bacaAkunLayanan } from './google'
  import { pathFileKunci } from './kunci'
  import type { PengaturanIndexing } from './tipe'

  export type ButirPemasangan = { label: string; siap: boolean; teks: string }

  /**
   * Ringkasan pemasangan Mesin Indexing untuk admin (spesifikasi §18 "Setup dari pemilik"): mode adapter,
   * akun layanan Google, rahasia cron, dan kunci IndexNow. Hanya menyebut terpasang atau belum; isi
   * rahasia tidak pernah ditampilkan.
   */
  export function ringkasPemasangan(
    env: Record<string, string | undefined>,
    pengaturan: Pick<PengaturanIndexing, 'kunciIndexNow'>,
  ): ButirPemasangan[] {
    const akun = bacaAkunLayanan(env.GOOGLE_SERVICE_ACCOUNT_JSON)
    const asli = env.INDEXER_ADAPTER === 'asli'
    return [
      {
        label: 'Pengiriman',
        siap: asli,
        teks: asli
          ? 'Asli: kabar dikirim ke Google dan IndexNow.'
          : 'Palsu: tidak ada yang dikirim ke luar. Isi INDEXER_ADAPTER=asli di env produksi Vercel.',
      },
      {
        label: 'Akun layanan Google',
        siap: !('alasan' in akun),
        teks: 'alasan' in akun ? akun.alasan : 'Terpasang. Pastikan email akun layanan menjadi pemilik (Owner) properti di Search Console.',
      },
      {
        label: 'Cron',
        siap: Boolean(env.CRON_SECRET),
        teks: env.CRON_SECRET
          ? 'CRON_SECRET terpasang. Vercel Cron menjalankan antrean setiap 10 menit.'
          : 'CRON_SECRET belum diatur, jadi Vercel Cron ditolak. Isi minimal 16 karakter acak di env Vercel.',
      },
      {
        label: 'IndexNow',
        siap: Boolean(pengaturan.kunciIndexNow),
        teks: pengaturan.kunciIndexNow
          ? `Kunci tersimpan dan dilayani di ${pathFileKunci(pengaturan.kunciIndexNow)}.`
          : 'Kunci belum diisi, jadi IndexNow dilewati.',
      },
    ]
  }
  ```

  `src/modules/indexer/admin/indexing.scss`

  ```scss
  // Komponen admin Mesin Indexing. Memakai variabel tema Payload supaya ikut mode terang dan gelap admin.
  // Status tidak hanya ditandai warna: setiap butir punya teks "Siap" atau "Perlu diatur".

  .indexing-pemasangan,
  .indexing-peringatan {
    margin-bottom: calc(var(--base) * 1.5);
    padding: var(--base);
    border-radius: 14px;
    font-size: 14px;
    line-height: 1.5;
  }

  .indexing-pemasangan {
    border: 1px solid var(--theme-elevation-150);

    // Satu kisi untuk semua butir supaya kolom label sejajar; `div` pembungkus dt/dd tidak membuat kotak.
    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: calc(var(--base) * 0.5) calc(var(--base) * 0.75);
      margin: 0;
    }

    dl > div {
      display: contents;
    }

    dt {
      font-weight: 700;
    }

    dd {
      margin: 0;
      min-width: 0;
      overflow-wrap: anywhere;
    }
  }

  .indexing-pemasangan__judul,
  .indexing-peringatan__judul {
    margin: 0 0 calc(var(--base) * 0.5);
    font-weight: 700;
  }

  .indexing-pemasangan__tanda {
    display: inline-block;
    margin-right: calc(var(--base) * 0.25);
    padding: 0 6px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
  }

  .indexing-pemasangan__tanda--siap {
    background: var(--theme-success-150);
    color: var(--theme-success-800);
  }

  .indexing-pemasangan__tanda--belum {
    background: var(--theme-warning-150);
    color: var(--theme-warning-800);
  }

  .indexing-peringatan {
    border-left: 4px solid var(--theme-warning-650);
    background: var(--theme-warning-100);
    color: var(--theme-text);

    p {
      margin: 0 0 calc(var(--base) * 0.5);
    }

    p:last-child {
      margin-bottom: 0;
    }

    a {
      color: inherit;
      text-decoration: underline;
    }

    // CSS admin Payload menghapus outline tautan; cincin fokus dikembalikan (WCAG 2.4.7).
    a:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 2px;
      border-radius: 2px;
    }
  }

  @media (max-width: 600px) {
    .indexing-pemasangan dl {
      grid-template-columns: 1fr;
      row-gap: 2px;
    }

    .indexing-pemasangan dd {
      margin-bottom: calc(var(--base) * 0.5);
    }
  }
  ```

  `src/modules/indexer/admin/StatusPemasangan.tsx`

  ```tsx
  import type { Payload } from 'payload'

  import { ambilPengaturanIndexing } from '../antrean'
  import { ringkasPemasangan } from '../pemasangan'

  import './indexing.scss'

  /**
   * Field `ui` di Pengaturan SEO (server component): status pemasangan Mesin Indexing dari env server dan
   * pengaturan yang tersimpan. Rahasia hanya disebut terpasang atau belum.
   */
  export async function StatusPemasangan({ payload }: { payload: Payload }) {
    const butir = ringkasPemasangan(process.env, await ambilPengaturanIndexing(payload))
    return (
      <section className="indexing-pemasangan" aria-label="Status pemasangan Mesin Indexing">
        <p className="indexing-pemasangan__judul">Status pemasangan</p>
        <dl>
          {butir.map((b) => (
            <div key={b.label}>
              <dt>{b.label}</dt>
              <dd>
                <span className={`indexing-pemasangan__tanda indexing-pemasangan__tanda--${b.siap ? 'siap' : 'belum'}`}>
                  {b.siap ? 'Siap' : 'Perlu diatur'}
                </span>{' '}
                {b.teks}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    )
  }
  ```

  `src/modules/indexer/admin/PeringatanIndexingApi.tsx`

  ```tsx
  import './indexing.scss'

  /** Dokumentasi resmi Indexing API (diperiksa 5 November 2026). */
  export const URL_KETENTUAN_INDEXING_API = 'https://developers.google.com/search/apis/indexing-api/v3/using-api'

  /**
   * Peringatan tepat di atas saklar Indexing API (spesifikasi §8 langkah 4): Google hanya mengizinkan
   * API ini untuk halaman JobPosting dan BroadcastEvent, jadi saklarnya mati secara bawaan.
   */
  export function PeringatanIndexingApi() {
    return (
      <div className="indexing-peringatan" role="note" aria-labelledby="indexing-peringatan-judul">
        <p className="indexing-peringatan__judul" id="indexing-peringatan-judul">
          Indexing API bukan untuk artikel
        </p>
        <p>
          Google hanya mengizinkannya untuk halaman lowongan kerja (JobPosting) dan siaran langsung (BroadcastEvent di dalam
          VideoObject). Menyalakannya untuk artikel, tools, atau halaman lain berada di luar ketentuan Google.
        </p>
        <p>
          <a href={URL_KETENTUAN_INDEXING_API}>Baca ketentuan Indexing API</a>
        </p>
      </div>
    )
  }
  ```

  `src/modules/indexer/admin/SelStatusIndeks.tsx`

  ```tsx
  import type { Payload } from 'payload'

  import type { TipeArtikel } from '@/lib/konstanta'
  import { pathFor } from '@/lib/paths'

  import { LABEL_STATUS_INDEKS } from '../tipe'

  type BarisArtikel = {
    slug?: string | null
    tipe?: TipeArtikel | null
    _status?: string | null
    seo?: { noindex?: boolean | null } | null
  }

  /**
   * Sel kolom "Status indeks" di daftar artikel (spesifikasi §1 kriteria sukses 2): status Google dari
   * koleksi `status-indeks` untuk path publik artikel. Server component, satu query kecil per baris.
   */
  export async function SelStatusIndeks({ rowData, payload }: { rowData?: BarisArtikel; payload: Payload }) {
    if (rowData?.seo?.noindex) return <span>Noindex</span>
    if (!rowData?.slug || !rowData.tipe) return <span>Belum terbit</span>
    const path = pathFor({ jenis: 'artikel', slug: rowData.slug, tipe: rowData.tipe })
    const { docs } = await payload.find({ collection: 'status-indeks', where: { path: { equals: path } }, limit: 1, depth: 0, select: { status: true } })
    const status = docs[0]?.status
    return <span>{status ? LABEL_STATUS_INDEKS[status] : rowData._status === 'published' ? 'Belum dicek' : 'Belum terbit'}</span>
  }
  ```

- [ ] **Langkah 4: Pasang di Pengaturan SEO dan daftar artikel, lalu import map**

  ```diff
  diff --git a/src/globals/PengaturanSEO.ts b/src/globals/PengaturanSEO.ts
  index f414d53..bbe1b9e 100644
  --- a/src/globals/PengaturanSEO.ts
  +++ b/src/globals/PengaturanSEO.ts
  @@ -67,6 +67,11 @@ export const PengaturanSEO: GlobalConfig = {
             'Setiap konten terbit, berubah besar, atau dihapus, situs mengabari mesin pencari dan memeriksa status indeksnya di Google.',
         },
         fields: [
  +        {
  +          name: 'statusPemasangan',
  +          type: 'ui',
  +          admin: { components: { Field: '@/modules/indexer/admin/StatusPemasangan#StatusPemasangan' } },
  +        },
           {
             name: 'kunciIndexNow',
             type: 'text',
  @@ -97,6 +102,11 @@ export const PengaturanSEO: GlobalConfig = {
                 'Google mengizinkan 2.000 cek status (URL Inspection) per hari per properti. Batas bawaan 1.000 menyisakan separuh untuk alat lain. Cek di atas batas ditunda ke hari berikutnya.',
             },
           },
  +        {
  +          name: 'peringatanIndexingApi',
  +          type: 'ui',
  +          admin: { components: { Field: '@/modules/indexer/admin/PeringatanIndexingApi#PeringatanIndexingApi' } },
  +        },
           {
             name: 'pakaiIndexingApi',
             type: 'checkbox',
  ```

  ```diff
  diff --git a/src/collections/Artikel.ts b/src/collections/Artikel.ts
  index 0db7370..da88bf1 100644
  --- a/src/collections/Artikel.ts
  +++ b/src/collections/Artikel.ts
  @@ -35,7 +35,7 @@ export const Artikel: CollectionConfig = {
     labels: { singular: 'Artikel', plural: 'Artikel' },
     admin: {
       useAsTitle: 'judul',
  -    defaultColumns: ['judul', 'tipe', 'pilar', '_status', 'updatedAt'],
  +    defaultColumns: ['judul', 'tipe', 'pilar', '_status', 'statusIndeks', 'updatedAt'],
       group: 'Konten',
     },
     access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  @@ -152,5 +152,11 @@ export const Artikel: CollectionConfig = {
       },
       { name: 'terbitPada', type: 'date', admin: { position: 'sidebar', readOnly: true } },
       { name: 'diperbaruiBesar', type: 'date', label: 'Diperbarui', admin: { position: 'sidebar', readOnly: true } },
  +    {
  +      name: 'statusIndeks',
  +      type: 'ui',
  +      label: 'Status indeks',
  +      admin: { components: { Cell: '@/modules/indexer/admin/SelStatusIndeks#SelStatusIndeks' } },
  +    },
     ],
   }
  ```

  ```diff
  diff --git a/src/collections/StatusIndeks.ts b/src/collections/StatusIndeks.ts
  index 90e3c80..7a0a76d 100644
  --- a/src/collections/StatusIndeks.ts
  +++ b/src/collections/StatusIndeks.ts
  @@ -10,7 +10,7 @@ import { LABEL_STATUS_INDEKS, STATUS_INDEKS } from '@/modules/indexer/tipe'
   export const StatusIndeks: CollectionConfig = {
     slug: 'status-indeks',
     labels: { singular: 'Status indeks', plural: 'Status indeks' },
  -  defaultSort: '-cekTerakhir',
  +  defaultSort: '-updatedAt',
     admin: {
       useAsTitle: 'path',
       defaultColumns: ['path', 'status', 'cekTerakhir', 'cekBerikutnya', 'detail'],
  ```

  ```bash
  npm run generate:importmap
  git diff --stat "src/app/(payload)/admin/importMap.js"
  npm run generate:types
  git diff --stat src/payload-types.ts
  ```

  Hasil yang diharapkan: `importMap.js | 6 ++++++` (tiga komponen baru); `payload-types.ts` tidak berubah (field `ui` tidak disimpan).

- [ ] **Langkah 5: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 56 passed (56)`, `Tests 383 passed (383)`; integrasi `Test Files 31 passed (31)`, `Tests 95 passed (95)`; E2E `90 passed` (axe tanpa pelanggaran di `.indexing-pemasangan` dan `.indexing-peringatan`, tautan peringatan bercincin fokus setelah Tab).

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/modules/indexer src/globals/PengaturanSEO.ts src/collections/Artikel.ts src/collections/StatusIndeks.ts "src/app/(payload)/admin/importMap.js" tests/unit/indexer-pemasangan.test.ts tests/e2e/bantu.ts tests/e2e/indexing.spec.ts
  git commit -m "feat(indexer): status pemasangan dan peringatan Indexing API di Pengaturan SEO, dan kolom status indeks di daftar artikel"
  ```

---

### Task 9: E2E alur editor: buat dan terbitkan artikel, sitemap dan news sitemap, log indexing, dan batal terbit

**Files:**
- Modify: `playwright.config.ts`, `tests/e2e/indexing.spec.ts`
- Test: `tests/e2e/indexing.spec.ts`

**Interfaces:**
- Consumes: semua task sebelumnya lewat server E2E (REST Payload, hook, `after()`, rute sitemap Rencana 3); `ADMIN_E2E`, `isi`, `p` (`tests/e2e/data.ts`).
- Produces: env `INDEXER_ADAPTER=palsu` untuk server E2E; tes alur spesifikasi §16.

Tes E2E spesifikasi §16: "buat artikel, terbitkan, URL ada di sitemap dan news sitemap, log indexing tercatat". Artikel dibuat lewat REST Payload sebagai admin (jalur yang sama dengan tombol Simpan dan Terbitkan di admin: route handler `/api/artikel`, hook koleksi, transaksi), sebagai draf dulu lalu diterbitkan dengan `PATCH`. Tes memeriksa:

1. Draf tidak ada di sitemap; setelah terbit, URL ada di `/sitemap/artikel.xml` dan `/news-sitemap.xml`.
2. Log: langkah 1 (revalidasi, adapter `next`) tercatat saat simpan, lalu IndexNow (adapter `palsu`) dikirim `after()` setelah respons, tanpa cron. Status indeks "Belum dicek" dan cek status antre +6 jam.
3. Batal terbit: URL keluar dari sitemap, kabar `hapus` tercatat, IndexNow untuk kabar itu menunggu jendela 5 menit (baris antrean `indexnow` jenis `hapus`), status indeks dibuang, dan halaman menjawab 404.

Server E2E adalah build produksi, jadi tanpa `INDEXER_ADAPTER` pelari antrean menolak berjalan (pengaman Task 3) dan IndexNow tidak pernah tercatat. `playwright.config.ts` memberi `INDEXER_ADAPTER=palsu`: tidak ada panggilan jaringan, dan log mencatat adapter `palsu`.

- [ ] **Langkah 1: Tulis tes yang gagal**

  ```diff
  diff --git a/tests/e2e/indexing.spec.ts b/tests/e2e/indexing.spec.ts
  index 8478f91..326b7a5 100644
  --- a/tests/e2e/indexing.spec.ts
  +++ b/tests/e2e/indexing.spec.ts
  @@ -1,7 +1,16 @@
  -import { expect, test } from '@playwright/test'
  +import { expect, test, type APIRequestContext } from '@playwright/test'
   
   import { periksaAxe } from './bantu'
  -import { ADMIN_E2E, JUDUL_PANDUAN, KUNCI_INDEXNOW } from './data'
  +import { ADMIN_E2E, isi, JUDUL_PANDUAN, KUNCI_INDEXNOW, p } from './data'
  +
  +async function masuk(request: APIRequestContext): Promise<Record<string, string>> {
  +  const { token } = await (await request.post('/api/pengguna/login', { data: ADMIN_E2E })).json()
  +  return { Authorization: `JWT ${token}` }
  +}
  +
  +async function dokumenPertama(request: APIRequestContext, auth: Record<string, string>, path: string) {
  +  return (await (await request.get(path, { headers: auth })).json()).docs[0]
  +}
   
   test('file kunci IndexNow di /{kunci}.txt berisi kunci dari pengaturan SEO; kunci lain 404', async ({ request }) => {
     const jawaban = await request.get(`/${KUNCI_INDEXNOW}.txt`)
  @@ -38,3 +47,56 @@ test('admin: status pemasangan, peringatan Indexing API, dan kolom status indeks
     await expect(page.getByRole('columnheader', { name: 'Status indeks' })).toBeVisible()
     await expect(page.getByRole('row').filter({ hasText: JUDUL_PANDUAN })).toContainText('Belum dicek')
   })
  +
  +test('alur editor: buat dan terbitkan artikel, URL masuk sitemap dan news sitemap, log indexing tercatat; batal terbit mengeluarkannya', async ({
  +  request,
  +}) => {
  +  const auth = await masuk(request)
  +  const pilar = await dokumenPertama(request, auth, '/api/pilar?where[slug][equals]=uang-karier')
  +  const penulis = await dokumenPertama(request, auth, '/api/penulis?where[slug][equals]=redaksi')
  +  const gambar = await dokumenPertama(request, auth, '/api/media?where[alt][equals]=Slip gaji karyawan')
  +  const slug = `lapor-spt-tahunan-${Date.now()}`
  +  const url = `https://point.lat/${slug}`
  +
  +  const draf = await request.post('/api/artikel?draft=true', {
  +    headers: auth,
  +    data: {
  +      _status: 'draft',
  +      judul: 'Cara lapor SPT tahunan karyawan',
  +      slug,
  +      tipe: 'panduan',
  +      pilar: pilar.id,
  +      penulis: penulis.id,
  +      deck: 'Langkah lapor SPT 1770 S lewat Coretax, dari bukti potong sampai bukti terima.',
  +      intinya: [{ poin: 'Siapkan bukti potong 1721-A1 dari kantor.' }, { poin: 'Lapor paling lambat 31 Maret.' }],
  +      gambarUtama: gambar.id,
  +      isi: isi(p('Lapor SPT tahunan bisa selesai dalam lima belas menit.')),
  +    },
  +  })
  +  expect(draf.status()).toBe(201)
  +  const { doc } = await draf.json()
  +  expect((await request.get('/sitemap/artikel.xml')).ok()).toBe(true)
  +  expect(await (await request.get('/sitemap/artikel.xml')).text()).not.toContain(url)
  +
  +  const terbit = await request.patch(`/api/artikel/${doc.id}`, { headers: auth, data: { _status: 'published' } })
  +  expect(terbit.status()).toBe(200)
  +  await expect.poll(async () => (await request.get('/sitemap/artikel.xml')).text()).toContain(`<loc>${url}</loc>`)
  +  await expect.poll(async () => (await request.get('/news-sitemap.xml')).text()).toContain(`<loc>${url}</loc>`)
  +
  +  // Langkah 1 dicatat saat simpan; IndexNow dikirim `after()` setelah respons (adapter palsu di E2E).
  +  const log = async () => {
  +    const { docs } = await (await request.get(`/api/log-indexing?where[url][equals]=${encodeURIComponent(url)}&sort=waktu&limit=20`, { headers: auth })).json()
  +    return docs.map((d: { langkah: string; jenis: string; status: string; adapter: string }) => `${d.langkah} ${d.jenis} ${d.status} ${d.adapter}`)
  +  }
  +  await expect.poll(log).toEqual(['revalidasi terbit berhasil next', 'indexnow terbit berhasil palsu'])
  +  expect(await dokumenPertama(request, auth, `/api/status-indeks?where[path][equals]=/${slug}`)).toMatchObject({ status: 'belum-dicek' })
  +  expect((await dokumenPertama(request, auth, `/api/antrean-indexing?where[path][equals]=/${slug}`)).langkah).toBe('cek-status')
  +
  +  // Batal terbit: keluar dari sitemap, dicatat sebagai hapus; IndexNow menunggu jendela 5 menit sejak kiriman tadi.
  +  expect((await request.patch(`/api/artikel/${doc.id}`, { headers: auth, data: { _status: 'draft' } })).status()).toBe(200)
  +  await expect.poll(async () => (await request.get('/sitemap/artikel.xml')).text()).not.toContain(url)
  +  await expect.poll(log).toEqual(['revalidasi terbit berhasil next', 'indexnow terbit berhasil palsu', 'revalidasi hapus berhasil next'])
  +  expect(await dokumenPertama(request, auth, `/api/antrean-indexing?where[path][equals]=/${slug}`)).toMatchObject({ langkah: 'indexnow', jenis: 'hapus' })
  +  expect(await dokumenPertama(request, auth, `/api/status-indeks?where[path][equals]=/${slug}`)).toBeUndefined()
  +  expect((await request.get(`/${slug}`)).status()).toBe(404)
  +})
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:e2e
  ```

  Hasil yang diharapkan: tes "alur editor: ..." FAIL di `expect.poll(log)` dengan `Error: expect(received).toEqual(expected) // deep equality` (baris `"indexnow terbit berhasil palsu"` tidak pernah muncul, `Timeout 5000ms exceeded while waiting on the predicate`); log server memuat `Mesin Indexing gagal dijalankan setelah simpan.` dengan galat `INDEXER_ADAPTER wajib diisi di produksi`. Tes lain lulus.

- [ ] **Langkah 3: Adapter palsu untuk server E2E**

  ```diff
  diff --git a/playwright.config.ts b/playwright.config.ts
  index 8fb822c..b821e82 100644
  --- a/playwright.config.ts
  +++ b/playwright.config.ts
  @@ -43,6 +43,8 @@ export default defineConfig({
         CLOUDINARY_CLOUD_NAME: 'e2e',
         CLOUDINARY_API_KEY: 'e2e',
         CLOUDINARY_API_SECRET: 'e2e',
  +      // Mesin Indexing tanpa jaringan: kabar dikirim ke adapter palsu dan tercatat di log dengan adapter `palsu`.
  +      INDEXER_ADAPTER: 'palsu',
       },
     },
   })
  ```

- [ ] **Langkah 4: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  ```

  Hasil yang diharapkan: bersih; unit `Test Files 56 passed (56)`, `Tests 383 passed (383)`; integrasi `Test Files 31 passed (31)`, `Tests 95 passed (95)`; E2E `91 passed`.

- [ ] **Langkah 5: Commit**

  ```bash
  git add playwright.config.ts tests/e2e/indexing.spec.ts
  git commit -m "test(indexer): E2E alur editor: terbit, sitemap dan news sitemap, log indexing lewat after(), dan batal terbit"
  ```

---

### Task 10: Mesin Indexing di CLAUDE.md, spesifikasi, dan `.env.example`, lalu pemeriksaan akhir

**Files:**
- Modify: `CLAUDE.md`, `docs/superpowers/specs/2026-11-03-point-lat-design.md`, `.env.example`

**Interfaces:**
- Consumes: semua task sebelumnya.
- Produces: aturan proyek untuk agen dan pengembang berikutnya (modul `indexer`, hook `kabariMesinPencari` untuk koleksi berhalaman publik baru, `INDEXER_ADAPTER`, cron, tes dengan adapter palsu dan waktu tiruan, jebakan `req.context`), spesifikasi yang sesuai keputusan rencana ini (§5 modul `indexer`, §6 `antreanIndexing`, `logIndexing`, `statusIndeks`, `pengaturanSEO`, §8 pemicu `pindah`, jendela kirim, kuota, penghapusan 404 atau 308 sesuai keputusan pemilik Rencana 4A, cron dan `after()`, §18 env Vercel), dan contoh env.

- [ ] **Langkah 1: Perbarui CLAUDE.md, spesifikasi, dan contoh env**

  ```diff
  diff --git a/CLAUDE.md b/CLAUDE.md
  index a1fd64e..a9671ad 100644
  --- a/CLAUDE.md
  +++ b/CLAUDE.md
  @@ -22,6 +22,7 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Import map admin: `npm run generate:importmap` (jalankan setiap kali menambah fitur Lexical atau komponen admin)
   - Data awal: `npm run seed` (pilar, penulis, halaman draf, global, dan enam kalkulator draf beserta parameternya; dokumen yang sudah ada tidak ditimpa)
   - Aset sistem Cloudinary (sekali per akun, butuh kredensial): `npm run media:siapkan`
  +- Pekerjaan cron sekali jalan tanpa Vercel (jadwal terbit dan antrean Mesin Indexing): `npm run indexer`
   
   ## Konvensi
   - Nama domain memakai bahasa Indonesia, sama dengan spesifikasi: slug koleksi (`artikel`, `pilar`), nama field (`judul`, `intinya`), nama fungsi modul (`kabari`, `hitung`, `pathFor` adalah pengecualian yang sudah ada).
  @@ -31,6 +32,8 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Path publik selalu dibangun lewat `pathFor()` di `src/lib/paths.ts`, jangan merangkai string URL manual. Halaman indeks memakai `PATH_INDEKS` (`/cari`, `/glosarium`, `/tools`, `/video`).
   - SEO selalu lewat `src/modules/seo`: `metadata()` untuk `generateMetadata`, `jsonLd()` + `serialisasiJsonLd()` untuk JSON-LD, `remahRoti()` untuk breadcrumb, `ambilSitus()` untuk pengaturan situs. Jangan menulis `<title>`, canonical, robots, atau JSON-LD manual di halaman. Rute teknis (`/sitemap.xml`, `/sitemap/{jenis}.xml`, `/news-sitemap.xml`, `/robots.txt`, `/feed.xml`) ada di `src/app/(frontend)/` dan hanya merangkai fungsi modul.
   - Tag cache di `src/lib/tag.ts` (`TAG`): data halaman publik di-cache dengan tag yang sama dengan yang direvalidasi hook `revalidasiPublik` (`{koleksi}`, `{koleksi}:{id}`, `pilar:{slug}`, `beranda`, `sitemap`, `pengaturan-seo`, `header`, `footer`, `media`, `redirect`, `parameter-tools`). Koleksi publik baru wajib memasang `revalidasiPublik(koleksi)`. Tag `beranda` dibuang global `beranda` dan `newsletter` serta terbitnya artikel, pilar, video, dan tools; koleksi yang baru tampil di beranda ditambahkan ke `DI_BERANDA`.
  +- Mesin Indexing di `src/modules/indexer`: `kabari(payload, kabar, { req })` memasukkan kabar ke antrean Postgres (koleksi `antrean-indexing`), `jalankanIndexer(payload)` mengirimnya (cron `GET /api/jobs/run` dengan `CRON_SECRET` setiap 10 menit, dan `after()` setelah simpan), log di `log-indexing`, status Google di `status-indeks`. Ketiga koleksi itu hanya ditulis modul indexer dan hanya dibaca admin. Koleksi berhalaman publik baru memasang `kabariMesinPencari(keTarget)` dari `src/hooks/kabariMesinPencari.ts` setelah hook revalidasi (beforeChange, afterChange, afterDelete). Aturan (jendela kirim, jeda ulang, kuota, jadwal cek) sebagai fungsi murni di `aturan.ts` dengan waktu sebagai argumen. Semua panggilan ke Google dan IndexNow lewat adapter (`asli.ts` dengan `fetch` dan JWT akun layanan tanpa pustaka, `palsu.ts` dalam memori), dipilih env `INDEXER_ADAPTER` (`asli` hanya di produksi; dev dan tes memakai palsu; build produksi yang dijalankan tanpa nilai itu ditolak). Tes memakai `adapterPalsu()` + `pakaiAdapterIndexer()` dan opsi `sekarang`.
  +- Nilai di `req.context` yang dihitung dengan `await` operasi Payload ditulis setelah `await` selesai (simpan ke variabel dulu): operasi Payload dengan `req` bisa mengganti objek `req.context`, sehingga `req.context[k] = await ...` hilang.
   - URL media selalu lewat `src/modules/media` (`bangunUrl`, `propsGambar`, `urlOg`), jangan merangkai URL Cloudinary manual. `next/image` memakai loader kustom Cloudinary, jadi `src` harus URL dari `bangunUrl`/`propsGambar` dan `width`/`height` wajib diisi.
   - Media disimpan di Cloudinary (folder `point/gambar`, `point/video`). Tanpa `CLOUDINARY_*` di env (lokal, tes) dipakai klien palsu dalam memori: file tidak tersimpan permanen. Tes tidak boleh memanggil jaringan.
   - Halaman publik di `src/app/(frontend)/` dirender ISR: rute dinamis memakai `generateStaticParams` yang mengembalikan `[]`, dan data diambil lewat `muat*()` dari `src/modules/konten` (cache bertag `TAG`). Path tanpa dokumen diakhiri `tanganiTidakAda(path)` di komponen halaman (redirect dari koleksi `redirect` atau 404), sedangkan `generateMetadata` mengembalikan `metadataTidakDitemukan()` untuk path itu.
  @@ -46,7 +49,7 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Tes E2E di `tests/e2e/*.spec.ts` memakai `cegatCloudinary()` (gambar tanpa jaringan) dan `periksaAxe()` (WCAG 2.2 AA) dari `tests/e2e/bantu.ts`; data contohnya di `tests/e2e/siapkan.ts`. Anggaran JavaScript (total di bawah 160 KiB per halaman, spesifikasi §12) dijaga `motion.spec.ts` untuk setiap jenis halaman; jenis halaman baru ditambahkan ke daftarnya. JS kalkulator di atas JS artikel dijaga di bawah 25 KB. Kalkulator diuji di `kalkulator.spec.ts` (enam tools dari `TOOLS_CONTOH` di tiga ukuran layar) dan `hitung.spec.ts` (contoh resmi DJP lewat form).
   
   ## Batasan
  -- Jangan commit `.env`. `.env.test` boleh di-commit karena hanya untuk database tes lokal dan tidak boleh berisi `CLOUDINARY_*`.
  +- Jangan commit `.env`. `.env.test` boleh di-commit karena hanya untuk database tes lokal dan tidak boleh berisi `CLOUDINARY_*`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `CRON_SECRET`, atau `INDEXER_ADAPTER=asli`. Kredensial Google hanya di env server Vercel, tidak pernah di CMS, log, atau tes.
   - Tanya dulu sebelum menambah dependensi baru di luar rencana.
   - Jalankan `npm run generate:types` lalu `npm run typecheck` setelah mengubah koleksi atau global.
   - Jalankan `npm test` sebelum commit, dan `npm run test:e2e` bila halaman publik berubah.
  ```

  ```diff
  diff --git a/docs/superpowers/specs/2026-11-03-point-lat-design.md b/docs/superpowers/specs/2026-11-03-point-lat-design.md
  index 78fbc21..e738a5b 100644
  --- a/docs/superpowers/specs/2026-11-03-point-lat-design.md
  +++ b/docs/superpowers/specs/2026-11-03-point-lat-design.md
  @@ -140,7 +140,7 @@ Vercel Cron ──► /api/jobs/run setiap 10 menit (header rahasia)
   
   | Modul | Antarmuka | Di dalamnya | Adapter |
   |---|---|---|---|
  -| `indexer` | `kabari(url, jenis)` dengan jenis `terbit` / `ubah-besar` / `hapus`; `cekStatus(url)` | antrean job, dedup per URL, debounce submit sitemap, retry backoff, log, kuota | `searchConsole`, `indexNow`, `googleIndexing` (opsional), `palsu` untuk tes |
  +| `indexer` | `kabari(payload, kabar[])` dengan jenis `terbit` / `ubah-besar` / `pindah` / `hapus` (dipanggil hook koleksi); `jalankanIndexer(payload)` (cron dan `after()`) | antrean job di Postgres, dedup per URL dan langkah, jendela kirim sitemap dan IndexNow, retry 1/5/30 menit, kuota harian Google, cek status bertahap, klaim atomik, log | `searchConsole`, `indexNow`, `googleIndexing` (opsional), `palsu` untuk tes dan pratinjau (dipilih `INDEXER_ADAPTER`) |
   | `seo` | `metadata(doc)`, `jsonLd(doc)`, `analisis(doc) → daftar cek` | aturan judul/meta, canonical, robots, schema per tipe, skor checklist | (tidak ada seam, fungsi murni) |
   | `hitung` | `hitung(toolId, input, tanggal) → hasil + rincian` | rumus per tool, pemilihan parameter sesuai tanggal berlaku | (fungsi murni, parameter dari CMS) |
   | `media` | `unggah(file) → {publicId, meta}`, `url(publicId, preset)` | tanda tangan upload, preset transformasi, OG image | `cloudinary` (adapter `@payloadcms/plugin-cloud-storage`), `palsu` untuk tes |
  @@ -182,8 +182,9 @@ point-lat/
   | `media` | publicId Cloudinary, jenis, lebar, tinggi, durasi, alt (wajib untuk gambar), caption, kredit |
   | `redirect` | dari, ke, kode (301/410), dibuat otomatis/manual, jumlah hit |
   | `log404` | path, jumlah, terakhir, referer |
  -| `logIndexing` | URL, jenis, langkah, adapter, status HTTP, pesan, percobaan ke, waktu |
  -| `statusIndeks` | URL, status (Terindeks / Ditemukan / Dirayapi belum diindeks / Error / Belum dicek), cek berikutnya, cek terakhir, detail |
  +| `antreanIndexing` | langkah, path, jenis, jadwal, percobaan, tahap cek status (satu baris per langkah dan path, dihapus setelah selesai; hanya ditulis modul `indexer`) |
  +| `logIndexing` | URL, jenis, langkah, adapter, status (Berhasil / Gagal, dicoba lagi / Gagal / Dilewati / Ditunda), status HTTP, pesan, percobaan ke, waktu; hanya admin yang membaca |
  +| `statusIndeks` | path, status (Terindeks / Ditemukan, belum dirayapi / Dirayapi, belum diindeks / Belum dikenal Google / Dikecualikan Google / Error / Belum dicek), cek berikutnya, cek terakhir, dirayapi Google, tautan laporan Search Console, detail; tampil juga sebagai kolom di daftar artikel |
   | `logAI` | pengguna, tugas, dokumen, token, biaya perkiraan, waktu |
   | `pengguna` | email, nama, peran (`admin`, `editor`; MVP hanya admin) |
   
  @@ -194,7 +195,7 @@ point-lat/
   | `header` | logo, menu (pilar + tautan bebas), tombol Tools |
   | `footer` | tautan, teks hak cipta, tautan sosial, saluran WhatsApp |
   | `beranda` | urutan & isi blok homepage (hero, mozaik pilihan redaksi, strip video, paling dibaca, newsletter, slot iklan) |
  -| `pengaturanSEO` | nama situs, judul default, pola judul, meta default, gambar OG default, organisasi (logo, sameAs), kode verifikasi, robots.txt, IndexNow key, kredensial Google (referensi ke env), saklar Indexing API, batas kuota |
  +| `pengaturanSEO` | nama situs, judul default, pola judul, meta default, gambar OG default, organisasi (logo, sameAs), kode verifikasi, robots.txt; grup Mesin Indexing: status pemasangan (mode adapter, akun layanan Google, `CRON_SECRET`, kunci IndexNow; rahasia tidak ditampilkan), IndexNow key, properti Search Console, batas cek status per hari (bawaan 1.000), saklar Indexing API (mati) dengan peringatan, batas Indexing API (bawaan 200). Kredensial Google hanya di env server |
   | `iklan` | penyedia, ID penerbit, slot (id, ukuran, posisi, halaman, aktif), `ads.txt` |
   | `asistenAI` | aktif, anggaran bulanan, model (dari env), daftar frasa klise yang dicek |
   | `newsletter` | penyedia, teks form, tautan arsip |
  @@ -243,20 +244,22 @@ Slug pilar, subkategori, dan halaman tidak boleh bentrok dengan slug artikel (di
   
   ### Mesin Indexing
   
  -Pemicu: `terbit`, `ubah-besar`, `hapus` (artikel, tools, video, halaman, pilar).
  +Pemicu: `terbit`, `ubah-besar`, `hapus` (artikel, tools, video, halaman, pilar), ditambah `pindah` untuk path lama saat slug berganti (path itu kini dialihkan, jadi tidak dikabarkan ke Indexing API). Perubahan besar artikel ditandai saklar "perubahan besar"; koleksi lain dikabarkan saat terbit, pindah, dan dihapus. Perubahan parameter kalkulator dikabarkan sebagai perubahan besar halaman tools yang memakainya. Dokumen noindex dianggap tidak publik.
   
   | Langkah | Detail |
   |---|---|
   | 1. Revalidasi | `revalidateTag` halaman, rubrik, beranda, sitemap |
  -| 2. Search Console | `sitemaps.submit` untuk sitemap index, debounce maksimal sekali per 30 menit |
  -| 3. IndexNow | POST daftar URL ke `api.indexnow.org` dengan key dari CMS, digabung per 5 menit |
  +| 2. Search Console | `sitemaps.submit` untuk sitemap index, maksimal sekali per 30 menit sejak kiriman berhasil terakhir (kabar di antaranya menunggu dan tergabung) |
  +| 3. IndexNow | POST daftar URL ke `api.indexnow.org` dengan key dari CMS dan file `/{key}.txt`, satu POST untuk semua URL yang antre, maksimal sekali per 5 menit |
   | 4. Google Indexing API (opsional) | hanya jika saklar aktif; `URL_UPDATED`/`URL_DELETED`; berhenti saat kuota harian (dari CMS, default 200) tercapai; banner peringatan bahwa penggunaan untuk artikel di luar ketentuan Google |
  -| 5. Cek status | URL Inspection API pada +6 jam, +24 jam, +3 hari, +7 hari; berhenti saat Terindeks; jadwal dibatasi agar tidak melewati kuota harian properti |
  +| 5. Cek status | URL Inspection API pada +6 jam, +24 jam, +3 hari, +7 hari; berhenti saat Terindeks; cek di atas batas harian (CMS, bawaan 1.000 dari kuota Google 2.000 per properti) ditunda ke hari berikutnya |
   | 6. Log | setiap langkah ke `logIndexing` |
   
  -Kegagalan: retry 3 kali dengan jeda 1, 5, 30 menit; setelah itu status Error dan peringatan di dashboard. Penghapusan: URL keluar dari sitemap, halaman mengembalikan 410 (atau 301 jika ada redirect).
  +Kegagalan: retry 3 kali dengan jeda 1, 5, 30 menit; setelah itu status Gagal di log (cek status: status indeks Error) dan peringatan di dashboard. Kuota Google habis (429): ditunda ke awal hari kuota berikutnya (tengah malam waktu Pasifik). Penghapusan dan batal terbit: URL keluar dari sitemap, halaman menjawab 404, atau 308 ke tujuan bila ada redirect (keputusan pemilik di Rencana 4A: redirect lewat `permanentRedirect()`, kode 410 di CMS menjawab 404), IndexNow tetap dikabari, dan `URL_DELETED` bila Indexing API aktif.
   
  -Prasyarat: properti domain `point.lat` di Search Console; akun layanan Google Cloud dengan Search Console API + Indexing API aktif, ditambahkan sebagai **Owner** properti. Kredensial disimpan di env Vercel.
  +Antrean ada di Postgres. Vercel Cron memanggil `GET /api/jobs/run` (header `Authorization: Bearer CRON_SECRET`) setiap 10 menit; endpoint itu juga menjalankan job Payload yang jatuh tempo (jadwal terbit artikel). Saat konten terbit, antrean langsung dijalankan lewat `after()`. Lokal tanpa Vercel: `npm run indexer`. Adapter dipilih env `INDEXER_ADAPTER` (`asli` di produksi, `palsu` di pratinjau, lokal, dan tes).
  +
  +Prasyarat: properti domain `point.lat` di Search Console; akun layanan Google Cloud dengan Search Console API aktif (Indexing API hanya bila saklarnya kelak dipakai), ditambahkan sebagai **Owner** properti. Kredensial disimpan di env Vercel (`GOOGLE_SERVICE_ACCOUNT_JSON`), tanpa pustaka Google: token akses dari JWT RS256 akun layanan.
   
   ### Dashboard SEO (di admin)
   
  @@ -364,9 +367,10 @@ WCAG 2.2 AA: kontras sesuai §4, fokus terlihat (`:focus-visible`, ring 2px ink
   2. Proyek Supabase (region Singapura untuk latensi Indonesia) dan repo GitHub untuk kode + backup mingguan.
   3. Akun Cloudinary: cloud name, API key, API secret.
   4. Google Search Console: properti domain `point.lat` (verifikasi DNS).
  -5. Google Cloud: proyek, aktifkan Search Console API (dan Indexing API bila nanti dipakai), akun layanan, tambahkan email akun layanan sebagai Owner di Search Console.
  -6. Kunci Claude API.
  -7. Akun AdSense (setelah konten cukup) dan penyedia newsletter.
  +5. Google Cloud: proyek, aktifkan Search Console API (dan Indexing API bila nanti dipakai), akun layanan dengan kunci JSON, tambahkan email akun layanan (`client_email`) sebagai Owner di Search Console.
  +6. Env Vercel untuk Mesin Indexing: `INDEXER_ADAPTER=asli` (Production) dan `palsu` (Preview), `GOOGLE_SERVICE_ACCOUNT_JSON` berisi seluruh file kunci JSON (Production saja), `CRON_SECRET` acak minimal 16 karakter. Kunci IndexNow diisi di Pengaturan SEO; status pemasangan tampil di halaman yang sama.
  +7. Kunci Claude API.
  +8. Akun AdSense (setelah konten cukup) dan penyedia newsletter.
   
   ## 19. Risiko & mitigasi
   
  ```

  ```diff
  diff --git a/.env.example b/.env.example
  index 0626438..c99405a 100644
  --- a/.env.example
  +++ b/.env.example
  @@ -8,3 +8,9 @@ SEED_ADMIN_PASSWORD=ganti-password-ini
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
  +# Mesin Indexing (hanya server). Lokal dan tes: biarkan kosong, adapter palsu tidak memanggil jaringan.
  +# Produksi Vercel: INDEXER_ADAPTER=asli, GOOGLE_SERVICE_ACCOUNT_JSON berisi seluruh file kunci JSON akun
  +# layanan Google, CRON_SECRET acak minimal 16 karakter (Vercel Cron mengirimnya sebagai Bearer). Pratinjau: palsu.
  +INDEXER_ADAPTER=
  +GOOGLE_SERVICE_ACCOUNT_JSON=
  +CRON_SECRET=
  ```

- [ ] **Langkah 2: Pemeriksaan lengkap**

  Jalankan:

  ```bash
  npm run generate:types && git diff --stat src/payload-types.ts
  npm run generate:importmap && git diff --stat "src/app/(payload)/admin/importMap.js"
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run test:e2e
  npm run seed
  npm run build
  git status --short
  ```

  Hasil yang diharapkan: `payload-types.ts` dan import map tidak berubah; type check dan lint bersih; unit `Test Files 56 passed (56)`, `Tests 383 passed (383)`; integrasi `Test Files 31 passed (31)`, `Tests 95 passed (95)`; E2E `91 passed`; build mencantumkan `ƒ /kunci-indexnow/[kunci]` di samping rute sebelumnya (`○ /`, `● /[...jalur]`, `ƒ /api/[...slug]`, `● /tools/[slug]`, dan seterusnya); `git status` hanya menunjukkan tiga file langkah 1 (buang blok "nextjs-agent-rules" bila build menambahkannya, lihat Global Constraints).

- [ ] **Langkah 3: Uji visual admin di tiga ukuran layar**

  Bangun dan jalankan build dengan database E2E, yang sudah berisi konten contoh, kunci IndexNow, dan antrean dari `npm run test:e2e` di langkah 2 (`set -a` memuat `PAYLOAD_SECRET` dari `.env.test`; nama database diambil dari `DATABASE_URL` tes tanpa query lalu ditambah `_e2e`, sama dengan `playwright.config.ts`):

  ```bash
  set -a && . ./.env.test && set +a
  DATABASE_URL="${DATABASE_URL%%\?*}_e2e" CLOUDINARY_CLOUD_NAME=e2e CLOUDINARY_API_KEY=e2e CLOUDINARY_API_SECRET=e2e INDEXER_ADAPTER=palsu npm run build
  (DATABASE_URL="${DATABASE_URL%%\?*}_e2e" CLOUDINARY_CLOUD_NAME=e2e CLOUDINARY_API_KEY=e2e CLOUDINARY_API_SECRET=e2e INDEXER_ADAPTER=palsu PORT=3200 npm run start > /tmp/point-lat-start.log 2>&1 &)
  timeout 90 sh -c 'until curl -s -o /dev/null http://localhost:3200/robots.txt; do sleep 1; done'
  ```

  Masuk ke `http://localhost:3200/admin` dengan akun E2E (`ADMIN_E2E` di `tests/e2e/data.ts`), lalu buka di 375, 768, dan 1440 px (DevTools): Pengaturan SEO (grup Mesin Indexing), Artikel, Log indexing, Status indeks, dan Antrean indexing. Harus terlihat: status pemasangan dengan label sejajar di 768 dan 1440 px dan satu kolom di 375 px, setiap butir bertanda teks "Siap" atau "Perlu diatur"; peringatan Indexing API tepat di atas saklar yang mati, tautannya bisa dicapai dengan Tab dan cincin fokusnya terlihat; kolom "Status indeks" di daftar artikel ("Belum dicek" untuk artikel terbit, "Belum terbit" untuk draf); log dengan URL panjang terbungkus dan pesan panjang terpotong rapi; daftar kosong (misalnya Status indeks dengan filter path yang tidak ada) menampilkan keadaan kosong Payload; tanpa geser horizontal halaman. Lalu panggil cron sebagai admin di tab yang sama: `http://localhost:3200/api/jobs/run` menjawab JSON berisi `jadwalTerbit` dan ringkasan `indexer` (`diproses`, `berhasil`, `diulang`, `gagal`, `dilewati`, `ditunda`), dan tanpa login (jendela privat) menjawab 401. Hentikan server dengan `fuser -k 3200/tcp`, lalu jalankan `npm run build` lagi dengan env biasa.

- [ ] **Langkah 4: Commit**

  ```bash
  git add CLAUDE.md docs/superpowers/specs/2026-11-03-point-lat-design.md .env.example
  git commit -m "docs: Mesin Indexing di CLAUDE.md, spesifikasi, dan .env.example"
  ```

---

## Selesai bila

- `npm test` lulus (383 tes unit di 56 file dan 95 tes integrasi di 31 file), `npm run test:e2e` lulus (91 tes E2E, termasuk alur editor dan axe untuk komponen admin Mesin Indexing), `npm run typecheck` dan `npm run lint` bersih, `npm run build` berhasil, semuanya tanpa jaringan dan tanpa kredensial Google.
- Artikel, tools, video, halaman, dan pilar yang terbit, berubah besar (artikel), pindah alamat, batal terbit, atau dihapus tercatat di log (langkah revalidasi) dan antrean; simpan draf dan suntingan kecil tidak. Perubahan angka aturan kalkulator mengabari halaman tools yang memakainya.
- `after()` mengirim antrean langsung setelah simpan; cron `GET /api/jobs/run` (Bearer `CRON_SECRET`, selain itu 401 kecuali admin) mengirim sisanya setiap 10 menit (`vercel.json`) dan menjalankan jadwal terbit Payload; `npm run indexer` menjalankannya lokal.
- Sitemap index dikirim ke Search Console paling sering sekali per 30 menit dan IndexNow sekali per 5 menit dengan semua URL yang antre dalam satu POST; gagal diulang 1, 5, dan 30 menit lalu Gagal; kuota harian Google (Indexing API dan cek status, dari CMS) ditunda ke tengah malam waktu Pasifik; dua pelari bersamaan tidak mengirim baris yang sama dua kali.
- Cek status +6 jam, +24 jam, +3 hari, +7 hari mengisi `status-indeks` dan berhenti saat Terindeks; statusnya tampil di daftar artikel.
- URL yang batal terbit atau dihapus keluar dari sitemap, menjawab 404 (atau 308 bila ada redirect), tetap dikabarkan ke IndexNow, dan `URL_DELETED` bila Indexing API aktif. Indexing API mati secara bawaan, dengan peringatan di atas saklarnya.
- `/{kunci}.txt` melayani kunci IndexNow dari Pengaturan SEO; Pengaturan SEO menampilkan status pemasangan tanpa isi rahasia.
- Log, antrean, dan status indeks hanya bisa dibaca admin. Skema hanya bertambah (tiga tabel baru dan kolom grup `indexing`); tanpa dependensi baru.

## Setup dari pemilik (sebelum Mesin Indexing asli dinyalakan)

Langkah ini dikerjakan pemilik di layanan luar; kode rencana ini sudah siap memakainya. Urutannya mengikuti dokumentasi prasyarat Indexing API dan spesifikasi §18.

- [ ] **Search Console:** tambahkan properti **domain** `point.lat` dan verifikasi lewat DNS (catatan TXT di pengelola domain). Biarkan properti di Pengaturan SEO tetap `sc-domain:point.lat`.
- [ ] **Google Cloud:** buat proyek, aktifkan **Google Search Console API**. Aktifkan **Web Search Indexing API** hanya bila kelak saklar Indexing API dinyalakan (tidak disarankan untuk artikel).
- [ ] **Akun layanan:** di proyek yang sama buat akun layanan, lalu buat **kunci JSON** dan unduh (Google hanya memberikannya sekali; simpan di pengelola kata sandi, jangan dikirim lewat chat atau email).
- [ ] **Akun layanan sebagai Owner:** di Search Console, properti `point.lat`, menu Setelan lalu Pengguna dan izin (atau daftar pemilik terverifikasi, "Add an owner" di dokumentasi prasyarat), tambahkan email akun layanan (field `client_email` di file JSON, berakhiran `iam.gserviceaccount.com`) sebagai **Pemilik** (Owner).
- [ ] **Kunci IndexNow:** buat kunci acak, misalnya hasil `openssl rand -hex 16` (32 karakter), isi di Admin, Pengaturan SEO, Mesin Indexing, lalu Simpan. Buka `https://point.lat/{kunci}.txt` dan pastikan isinya kunci itu. Jangan mengganti kunci setelah dipakai.
- [ ] **Env Vercel** (Project, Settings, Environment Variables), lalu deploy ulang:
  - `INDEXER_ADAPTER` = `asli` untuk **Production**, `palsu` untuk **Preview** (pratinjau tidak boleh mengabari mesin pencari).
  - `GOOGLE_SERVICE_ACCOUNT_JSON` = seluruh isi file kunci JSON (tempel apa adanya, termasuk `\n` di `private_key`), **Production** saja, tandai Sensitive.
  - `CRON_SECRET` = string acak minimal 16 karakter (misalnya `openssl rand -hex 32`), **Production**. Vercel mengirimnya otomatis sebagai `Authorization: Bearer` ke cron.
- [ ] **Paket Vercel gratis (Hobby)** sesuai keputusan pemilik: cron Vercel sekali sehari (`0 23 * * *`); jadwal 10 menit opsional lewat Supabase Cron (runbook rilis H5). Setelah deploy produksi, pastikan `/api/jobs/run` tercantum di Settings, Cron Jobs.
- [ ] **Periksa Status pemasangan** di Pengaturan SEO: keempat butir bertanda "Siap".
- [ ] **Uji pertama:** terbitkan satu halaman, lalu buka Log indexing. Harus ada "Revalidasi cache", "Kirim sitemap ke Search Console" (adapter `searchConsole`), dan "IndexNow" (adapter `indexNow`) berstatus Berhasil. Bila Google menjawab 403, periksa izin Owner akun layanan; bila IndexNow menjawab 403, periksa file kunci.
- [ ] **Biarkan saklar Indexing API mati.**
- [ ] **Jadwal terbit lama:** sebelum deploy pertama Mesin Indexing, lihat job terjadwal yang tertunda (Admin, menu Payload Jobs bila ditampilkan, atau tabel `payload_jobs`); job yang waktunya sudah lewat akan menerbitkan artikelnya pada cron pertama.

## Cakupan yang ditunda (dengan alasan)

| Butir | Ditunda ke | Alasan |
|---|---|---|
| Dashboard SEO di admin (view kustom `admin.components.views` dengan `AdminViewConfig` `{ Component, path: '/seo', exact }`, tersedia di Payload 3.92.1): klik, impresi, CTR, dan posisi per URL; ringkasan status indeks; log terbaru dan peringatan langkah Gagal; halaman yatim; link rusak; 404 teratas dengan tombol "buat redirect" | Rencana 6B | Setiap butir butuh data dan job sendiri; 6A menyiapkan fondasinya (log, status indeks, cron, adapter `searchConsole`). Sampai 6B, admin memakai daftar Log indexing, Status indeks, Antrean indexing, Log 404, dan kolom status di daftar artikel. |
| Sinkron Search Analytics harian ke koleksi lokal (`searchanalytics.query`: `POST https://www.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query`, `startDate` dan `endDate` waktu Pasifik, dimensi `page` dan `date`, `rowLimit` sampai 25.000, `startRow` untuk halaman berikutnya, `dataState` final) | Rencana 6B | Bentuknya sudah diperiksa (Sumber riset). Tambahan adapter `searchConsole.analitik` dan job harian di cron yang sama. |
| "Paling dibaca pekan ini" di beranda dan artikel populer di halaman 404 | Rencana 6B | Butuh data klik Search Analytics. Rencana 4B: cukup mengganti sumber `terbaru` di `ambilBeranda` dan judul `JUDUL_TERBARU`. |
| Halaman yatim (tanpa link masuk dari isi Lexical) dan pengecek link rusak mingguan | Rencana 6B | Butuh indeks link internal dari semua isi; link eksternal butuh jaringan, jadi pengecek memakai adapter (asli `fetch` HEAD dengan batas waktu, palsu di tes) dan job mingguan di cron yang sama. |
| Paginasi rubrik, profil penulis, indeks video, dan hasil cari berbasis path | Rencana 6B | Tidak terkait Mesin Indexing; Rencana 4B mensyaratkannya sebelum satu pilar melewati 24 tulisan. |
| Redirect otomatis saat slug subkategori atau slug pilar berganti untuk `/{pilar}/{subkategori}` | Rencana 6B | Butuh hook redirect di subkategori (path butuh slug pilar) dan pembaruan path subkategori saat pilar ganti slug. Subkategori juga bukan pemicu Mesin Indexing di spesifikasi §8. |
| Tombol "Cek sekarang" (cek status manual satu URL) | Rencana 6B | Spesifikasi §5 menyebut `cekStatus(url)`; di 6A cek status adalah langkah antrean terjadwal. Tombolnya cukup memasukkan baris `cek-status` berjadwal sekarang. |
| Uji langsung dengan kredensial pemilik: token akun layanan, `sitemaps.submit` dijawab 200, URL Inspection satu URL terbit, Indexing API (bila pernah dinyalakan), IndexNow 200 atau 202 dengan file kunci di domain asli, dan 403 saat akun layanan belum Owner | Rencana 8, bersama uji Cloudinary asli Rencana 2 Task 8 | Workspace tidak bisa menghubungi Google dan IndexNow; tes memakai `fetch` tiruan dengan bentuk dari dokumentasi resmi. |
| Retensi log (menghapus log lebih tua dari, misalnya, 180 hari) | Rencana 6B | Volume awal kecil: sekitar 4 baris per kabar ditambah sampai 4 cek status. Dashboard 6B yang membaca log menentukan berapa lama riwayat dibutuhkan. |
| Penulis, subkategori, dan global beranda sebagai pemicu | belum direncanakan | Spesifikasi §8 hanya lima koleksi. Halaman itu tetap ada di sitemap; kabar berikutnya (artikel terbit) ikut mengirim sitemap index. |
| Pembersihan aset Cloudinary yatim (Rencana 2 menyarankan job runner) | Rencana 8 | Cron sudah ada; pembersihan butuh kredensial Cloudinary asli untuk diuji. |

## Risiko dan pertanyaan terbuka

| Risiko | Mitigasi |
|---|---|
| `coverageState` URL Inspection berupa teks bebas, bukan enum. Status Ditemukan, Dirayapi, dan Belum dikenal Google dibaca dari kata kuncinya ("discovered", "crawled", "unknown to Google"). | `verdict` (enum resmi) tetap menentukan Terindeks dan Error. Teks asli selalu disimpan di detail dan log. Uji langsung Rencana 8 memeriksa teks yang benar-benar dikirim Google. |
| **Domain baru sering berstatus "Belum dikenal Google" lebih dari 7 hari**, dan cek status berhenti setelah +7 hari. | Status terakhir tetap tampil di daftar artikel; perubahan besar menjadwalkan cek ulang. **Pertanyaan untuk pemilik:** perlu tahap tambahan (+14 dan +30 hari) selama bulan-bulan pertama? Cukup menambah nilai di `JADWAL_CEK_MS`. |
| Klaim antrean memakai SQL langsung ke tabel `antrean_indexing` (nama tabel dari slug koleksi). | Satu-satunya SQL langsung di proyek, dengan komentar alasannya. Mengganti slug koleksi memecahkan tes "dua pelari bersamaan". Satu pernyataan `UPDATE`, jadi aman untuk pooler Supabase mode transaksi. |
| `after()` dan cron berjalan dalam batas durasi fungsi Vercel. Satu jalan paling banyak 200 baris; setiap permintaan ke luar dibatasi 15 detik, jadi Google yang lambat bisa membuat satu jalan lama. | Baris yang belum selesai diklaim dengan sewa 10 menit dan muncul lagi di jalan berikutnya. Rencana 8 mengukur durasi nyata dan menambah `maxDuration` bila perlu. |
| **Deploy pratinjau yang memakai database produksi** akan memasukkan kabar dari admin pratinjau ke antrean yang sama, lalu dikirim cron produksi (URL tetap dari `urlSitus`, jadi tetap `point.lat`). | `INDEXER_ADAPTER=palsu` di Preview mencegah pratinjau mengirim sendiri. **Pertanyaan:** apakah pratinjau memakai database terpisah (disarankan, diputuskan di Rencana 8)? |
| Jadwal terbit Payload baru benar-benar berjalan mulai rencana ini. Job yang sudah lama antre di `payload_jobs` akan menerbitkan artikelnya pada cron pertama. | Langkah terakhir "Setup dari pemilik". Tes integrasi Task 7 memastikan job terjadwal diterbitkan dan dikabarkan. |
| Spesifikasi §8 dulu menulis halaman yang dihapus mengembalikan 410 (atau 301). | Diikuti keputusan pemilik di Rencana 4A: redirect 308 lewat `permanentRedirect()`, kode 410 di CMS menjawab 404. Task 10 memperbarui kalimat spesifikasi itu. IndexNow tetap menerima URL 404 dan URL yang dialihkan (FAQ IndexNow). |
| Kabar yang tergabung tepat saat pelari menyelesaikan baris yang sama (jeda milidetik). | Penyelesaian bersyarat `versi`, dan `simpanBaris` membuat baris lagi bila baris lama sudah selesai, jadi kabar tidak hilang dan simpan tidak gagal. |
| Axe di halaman admin penuh menemukan pelanggaran milik UI Payload (kontras label kolom dan deskripsi field, checkbox baris tanpa label, target tombol urut). | Komponen rencana ini diperiksa terpisah dan bersih. Temuan UI Payload dicatat untuk design-audit Rencana 8 (admin hanya dipakai pemilik, spesifikasi §19). |
| Pemakaian Indexing API untuk artikel di luar ketentuan Google. | Saklar mati secara bawaan, peringatan tepat di atasnya dengan tautan ketentuan, dan kuotanya terpisah. |

## Temuan review sebelum eksekusi

| Temuan | Tindakan |
|---|---|
| Probe Task 6: `req.context[k] = await versiUtama(...)` kehilangan nilainya (afterChange tidak menemukan versi lama, artikel yang diterbitkan setelah simpan draf dikabarkan "terbit" dua kali). Penyebabnya `findByID({ req })` mengganti objek `req.context` saat `await`. | Sudah masuk Task 6: hasil `await` disimpan ke variabel dulu. Aturannya masuk Global Constraints dan CLAUDE.md (Task 10). |
| Probe Task 5: klaim baris lewat `payload.update({ where })` tidak atomik; tes "dua pelari bersamaan" gagal 2 dari 3 kali (IndexNow terkirim dua kali). | Sudah masuk Task 5: satu `UPDATE ... WHERE versi = ... RETURNING`; tes lulus setiap kali (dijalankan berulang). |
| Probe Task 5: baris dengan jadwal sama diambil dalam urutan acak, jadi baris yang ditunda karena kuota tidak pasti. Kolom `select` diurutkan Postgres menurut urutan enum, bukan abjad. | Sudah masuk Task 5: `sort: ['jadwal', 'id']`; tes mengurutkan hasil di JavaScript. |
| Probe: tabel `payload_jobs` ada sejak Rencana 1 (`schedulePublish`) tetapi tidak pernah dijalankan, jadi jadwal terbit tidak bekerja. | Sudah masuk Task 7: cron menjalankan `payload.jobs.run` sebelum antrean. |
| Uji visual Task 8 (375, 768, 1440 px): label status pemasangan tidak sejajar karena setiap baris kisi sendiri; urutan bawaan `-cekTerakhir` menaruh baris belum dicek di atas. | Sudah masuk Task 8: satu kisi `dl` dengan `display: contents`, urutan `-updatedAt`. Tangkapan setelah perbaikan: label sejajar, satu kolom di 375 px, axe bersih di komponen rencana ini. |
| Uji keyboard Task 8: Tab sampai tautan "Baca ketentuan Indexing API" tidak menampilkan cincin fokus (`outline-style: none` dari CSS admin Payload); tanda "Siap" atau "Perlu diatur" menempel pada teks sesudahnya tanpa spasi. | Sudah masuk Task 8: `a:focus-visible` dengan outline 2 px dan spasi sungguhan setelah tanda. Tes E2E admin memeriksa tautan terfokus setelah Tab dan `outline-style: solid`. |
| Pesan galat Google yang sudah berakhiran titik menjadi "site.." di log. | Sudah masuk Task 3: titik terakhir dari Google dibuang sebelum dirangkai. |
| Tes akses admin bisa gagal bila pengguna editor menjadi pengguna pertama database (otomatis admin, `tetapkanPeranAwal`). | Sudah masuk Task 4: tes membuat satu pengguna lain lebih dulu dan memeriksa peran editor. |
| Uji alur waktu nyata di build E2E probe (adapter palsu, cron dipanggil admin setiap 30 detik selama 6,5 menit): artikel A terbit saat jendela IndexNow masih berjalan, artikel B satu menit kemudian. | Kabar A dan B serta kabar hapus dari tes E2E sebelumnya tergabung dan terkirim dalam **satu** POST IndexNow tepat setelah jendela 5 menit habis; cek status keduanya antre +6 jam dan status indeks "Belum dicek". Sesuai spesifikasi, tidak ada perubahan kode. |
| Verifikasi penuh per commit di probe (10 commit, database tes dibuat ulang per commit): type check, lint, unit, integrasi, dan E2E. | Semua hijau pada percobaan pertama. Jumlah tes per task di tabel "Jumlah tes yang diharapkan". Tidak ada perubahan kode. |
| Blok kode rencana ini diterapkan ulang ke salinan bersih `master` (`6bc161a`), task demi task. | Tree setiap task identik dengan commit probe-nya (10 dari 10). |
| Review independen setelah rencana ditulis: pindai rahasia di rencana dan diff probe, dependensi, dan antrean jadwal terbit di database dev. | Tidak ada kredensial baru dan tidak ada dependensi (hanya skrip `indexer` di `package.json`). Satu nilai yang sama dengan `.env` lokal adalah contoh `SEED_ADMIN_PASSWORD` di `.env.example` yang sudah di-commit sejak Rencana 1 dan muncul sebagai konteks diff Task 10; password admin produksi wajib berbeda (dicatat untuk Rencana 8). `payload_jobs` di database dev kosong, jadi cron pertama tidak menerbitkan apa pun di lokal. |

## Sumber riset

Semua diakses 5 November 2026 lewat pencarian dan pembacaan web (bukan dari ingatan). Tanggal "diperbarui" adalah yang tertulis di halaman.

- Search Console API, Sitemaps: submit (Google for Developers, diperbarui 23 Juli 2024): https://developers.google.com/webmaster-tools/v1/sitemaps/submit
- Search Console API, URL Inspection `index.inspect` (diperbarui 23 Juli 2024): https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect
- Search Console API, `UrlInspectionResult` (verdict, coverageState, pageFetchState): https://developers.google.com/webmaster-tools/v1/urlInspection.index/UrlInspectionResult
- Search Console API, Search Analytics: query (diperbarui 11 Agustus 2026, untuk Rencana 6B): https://developers.google.com/webmaster-tools/v1/searchanalytics/query
- Search Console API, Usage Limits (URL Inspection 2.000 per hari dan 600 per menit per properti; diperbarui 28 Agustus 2025): https://developers.google.com/webmaster-tools/limits
- Indexing API, Using the API (hanya JobPosting dan BroadcastEvent dalam VideoObject; `URL_UPDATED`, `URL_DELETED`; diperbarui 16 Oktober 2026): https://developers.google.com/search/apis/indexing-api/v3/using-api
- Indexing API, Quota and pricing (200 publikasi per hari per proyek, reset tengah malam waktu Pasifik; diperbarui 16 Oktober 2026): https://developers.google.com/search/apis/indexing-api/v3/quota
- Indexing API, Prerequisites (akun layanan, kunci JSON, Owner di Search Console, scope `indexing`; diperbarui 16 Juli 2026): https://developers.google.com/search/apis/indexing-api/v3/prereqs
- Using OAuth 2.0 for Server to Server Applications (JWT RS256, `aud` token endpoint, `exp` maksimal 1 jam, `grant_type` jwt-bearer; diperbarui 23 Maret 2026): https://developers.google.com/identity/protocols/oauth2/service-account (dibaca lewat alamat lamanya https://developers.google.com/accounts/docs/OAuth2ServiceAccount)
- IndexNow, Documentation (kunci, file kunci di akar, POST JSON, kode jawaban): https://www.indexnow.org/documentation
- IndexNow, FAQ (endpoint `api.indexnow.org/indexnow`, kirim juga URL yang dialihkan dan 404/410, jeda 5 menit, 10.000 URL): https://www.indexnow.org/faq
- Vercel, Cron Jobs (GET ke deployment produksi, `vercel-cron/1.0`, UTC; diperbarui 16 September 2026): https://vercel.com/docs/cron-jobs
- Vercel, Managing Cron Jobs (`CRON_SECRET` sebagai Bearer, pengiriman terlewat atau dobel, idempoten; diperbarui 11 Agustus 2026): https://vercel.com/docs/cron-jobs/manage-cron-jobs
- Registry npm (5 November 2026): `googleapis` 189.0.0, `google-auth-library` 11.3.3, `@googleapis/searchconsole` 11.0.1 (dinilai, tidak dipasang).
- Next.js 16.3.3 (dokumentasi terpasang di `node_modules/next/dist/docs/`): `after`, `rewrites` (urutan `afterFiles` dan regex parameter), route handler. Payload 3.92.1 (kode terpasang): Jobs Queue (`queues/config/types`, `endpoints/run.js`, `versions/schedule/job.js`), `@payloadcms/ui` `buildColumnState` (kolom field `ui` dengan `Cell`), `sql` dari `@payloadcms/db-postgres`.
- Probe workspace: branch `probe/rencana-6` (satu commit per task; tree setiap task identik dengan blok kode rencana ini).

Rencana berikutnya: **Rencana 6B (dashboard SEO, Search Analytics, dan butir tunda frontend)**.
