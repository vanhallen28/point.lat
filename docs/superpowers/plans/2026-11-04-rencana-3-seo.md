# Rencana 3: Modul SEO inti point.lat

> **Catatan revisi 9 November 2026 (v1.1.0, keputusan pemilik).** Rencana ini sudah selesai dieksekusi; teksnya disesuaikan supaya tidak bertentangan dengan keputusan terbaru:
> 1. Hosting **Vercel paket gratis (Hobby)**: cron Vercel sekali sehari, jadwal 10 menit opsional lewat Supabase Cron (runbook rilis H5), Pro hanya saat iklan dinyalakan.
> 2. **Full Next.js dengan perintah npm**: semua perintah `pnpm` diganti padanan npm (`npm run <skrip>`, `npm run <skrip> -- <argumen>`, `npx`, `npm install`, `npm ci`), `pnpm-lock.yaml` menjadi `package-lock.json`. Potongan `package.json` lama yang masih memuat pengaturan khusus pnpm (`onlyBuiltDependencies`) adalah catatan sejarah; versi sekarang memakai `allowScripts`.
> 3. **Setiap pembaruan dikirim sebagai zip + perintah terminal** (spesifikasi §21).
> 4. **Tanpa Docker, hanya Next.js, Vercel, dan Supabase**: `docker-compose.yml`, `Dockerfile`, dan `docker/` dihapus di v1.1.0. Langkah yang dulu membuat file itu dibiarkan sebagai sejarah. Tes memakai Postgres di mesin itu sendiri (Postgres bawaan runner GitHub di CI, Postgres sistem di sesi Claude); komputer pemilik memakai proyek Supabase pratinjau.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun modul `src/modules/seo/` (`metadata`, `jsonLd`, `analisis`), rute teknis `/sitemap.xml`, `/sitemap/{jenis}.xml`, `/news-sitemap.xml`, `/robots.txt`, `/feed.xml` dengan cache bertag dan revalidasi otomatis, serta panel SEO di editor artikel (checklist, kanibalisasi, saran link internal, pratinjau Google dan kartu sosial), semuanya teruji tanpa jaringan.

**Architecture:** Semua aturan SEO adalah fungsi murni di `src/modules/seo/` yang menerima dokumen Payload ter-populate (tipe longgar `MasukanSeo`) dan pengaturan situs (`Situs`), lalu mengembalikan `Metadata` Next.js, graf JSON-LD, daftar cek, atau teks XML. Rute teknis di `src/app/(frontend)/` hanya mengambil data lewat `data.ts` yang dibungkus `unstable_cache` bertag; hook `revalidasiPublik` di tujuh koleksi publik dan global `pengaturan-seo` memanggil `revalidateTag` untuk tag yang terdampak. Panel SEO adalah field `ui` di tab SEO artikel: komponen klien membaca isian form, memanggil endpoint `POST /api/artikel/panel-seo` untuk data server (artikel lain, media, pengaturan), lalu merender hasil fungsi murni yang sama.

**Tech Stack:** Next.js 16.3.3 (App Router, route handler, `next/cache`), Payload 3.92.1 (`@payloadcms/ui`, `payload/shared`), modul media Rencana 2 (`bangunUrl`, `urlOg`, `klienMedia`), Vitest 4, PostgreSQL 16/17, npm 11, Node 22.23.4+.

**Spesifikasi:** `docs/superpowers/specs/2026-11-03-point-lat-design.md` (§5 modul `seo` dan "Rendering", §7 rute teknis, §8 "Panel SEO per artikel" dan "Tingkat situs", §12, §16 tes `seo`).

**Rencana sebelumnya:** `docs/superpowers/plans/2026-11-04-rencana-1-fondasi.md`, `docs/superpowers/plans/2026-11-04-rencana-2-media-cloudinary.md` (baseline: 102 tes unit, 32 tes integrasi).

## Global Constraints

- Node `^22.23.4 || >=24.22.1`, npm 11. Versi dikunci: Next `16.3.3`, Payload `3.92.1`.
- **Tidak ada dependensi baru.** Semua yang dipakai sudah terpasang: `next/cache` (`unstable_cache`, `revalidateTag`), `@payloadcms/ui` (hook form admin), `payload/shared` (`reduceFieldsToValues`, `formatAdminURL`), `sass` bawaan admin untuk `PanelSeo.scss`. JSON Lexical dibaca tanpa paket `lexical`.
- Nama domain berbahasa Indonesia seperti Rencana 1 dan 2 (`metadata`, `jsonLd`, `analisis` dari spesifikasi §5; `remahRoti`, `kanibalisasi`, `sarankanLink`, `ambilSitus`). Nama teknis framework tetap bahasa Inggris (hook, endpoint, route handler).
- Copy UI dan pesan: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru. Pesan checklist dikunci tes.
- Path publik selalu lewat `pathFor()` (`src/lib/paths.ts`); URL media selalu lewat `src/modules/media` (`bangunUrl`, `urlOg`). URL absolut dibangun dari `urlSitus` global `pengaturan-seo`.
- **Perubahan skema harus aditif.** Rencana ini tidak menambah kolom: hanya hook, endpoint, dan field `ui` (tidak disimpan). Setiap task yang menyentuh koleksi memeriksa `npm run generate:types && git diff --stat src/payload-types.ts` tetap tanpa perubahan. Bila Payload macet di "Pulling schema from database...", reset database yang bersangkutan seperti di Rencana 2.
- Setiap kali menambah komponen admin: `npm run generate:importmap`. Setiap kali koleksi berubah: `npm run generate:types` lalu `npm run typecheck`.
- Tes tidak memanggil jaringan dan memakai `.env.test` (database `pointlat_test`). Tes integrasi butuh Postgres jalan.
- Halaman publik tidak dibangun di sini (Rencana 4). Rencana ini menyediakan fungsi untuk `generateMetadata`, JSON-LD, breadcrumb, dan tag cache yang akan dipakai halaman.
- `next dev` di Next 16.3 menambahkan blok "nextjs-agent-rules" ke `CLAUDE.md` bila mendeteksi agen AI. Kembalikan dengan `git checkout CLAUDE.md` sebelum commit (kecuali Task 9 yang memang mengubah `CLAUDE.md`; buang blok itu saja).

## Keputusan teknis (hasil riset, dipakai di semua task)

| Topik | Keputusan | Dasar |
|---|---|---|
| Masukan modul | Union `MasukanSeo` (`{ jenis: 'artikel', doc }`, pilar, subkategori, tools, video, penulis, halaman, `beranda`, `statis`) dengan relasi `ID atau dokumen`, plus `Situs = PengaturanSitus & { cloudName }`. Pemanggil mengirim dokumen depth 1. Tidak ada akses database di fungsi SEO. | spesifikasi §5 ("fungsi murni, tidak ada seam") |
| Judul | `seo.judulSEO` dipakai apa adanya; bila kosong, `polaJudul` (`%s · point.`) membungkus judul/nama. Selalu `title.absolute`. | spesifikasi §6 (pola judul di `pengaturanSEO`), Next `Metadata.title` |
| Robots | `index, follow, max-image-preview:large` untuk halaman terindeks; `noindex, follow` bila `seo.noindex`. | spesifikasi §8 |
| Gambar OG | unggahan editor (preset `og` 1200x630) lalu gambar OG default situs (hanya dokumen tanpa pilar) lalu `urlOg` otomatis warna pilar. | spesifikasi §9, Rencana 2 Task 2 |
| JSON-LD | Satu `@graph`: `Organization` + `WebSite` selalu, node utama, `BreadcrumbList`. Explainer otomatis `NewsArticle`. `Article.image` tiga rasio (16:9, 4:3, 1:1). `WebApplication` dengan `offers.price: 0` tanpa rating (rich result aplikasi mensyaratkan `aggregateRating`/`review`; rating palsu tidak dibuat). `VideoObject` dengan `uploadDate = createdAt`. Tanpa `FAQPage` dan `HowTo`. | Google: Article, Video, Software app structured data; spesifikasi §8 |
| Rute teknis | Route handler biasa (`app/(frontend)/sitemap.xml/route.ts`, dst.), bukan konvensi `sitemap.ts`: `generateSitemaps` Next 16 tidak membuat sitemap index dan `MetadataRoute.Sitemap` tidak punya namespace Google News. | `node_modules/next/dist/docs` (`generate-sitemaps.md`, `metadata/sitemap.md`, `route.md`) |
| `lastmod` | Artikel `diperbaruiBesar ?? terbitPada`; koleksi lain `updatedAt` (tidak punya `diperbaruiBesar`). Tanpa `changefreq`/`priority`. Index: `lastmod` terbaru per jenis. | spesifikasi §8; protokol sitemap |
| News sitemap | `terbitPada` dalam 48 jam terakhir dan tidak di masa depan, maks 1.000, `news:language` `id`, `news:name` = nama situs. | Google News sitemap ("two days", 1.000 `news:news`, ISO 639) |
| robots.txt | `Allow: /`, `Allow: /api/media/file/`, `Disallow: /admin`, `/api/`, `/cari`, lalu `robotsTambahan` (baris `Sitemap:` dari CMS dibuang), lalu `Sitemap:` index dan news. | spesifikasi §7, §8 |
| Cache | Data rute di `unstable_cache(fn, key, { tags, revalidate: 3600 })`, rute `dynamic = 'force-dynamic'` (tidak dirender saat build). Revalidasi `revalidateTag(tag, { expire: 0 })`; di luar server Next galat "static generation store missing" diabaikan. | Next 16 `revalidateTag.md`, `caching-without-cache-components.md`, `unstable_cache.md` |
| Tag | `{koleksi}`, `{koleksi}:{id}`, `pilar:{slug}`, `beranda`, `sitemap`, `pengaturan-seo` (spesifikasi menulis `article:{id}` dan `home`; diganti nama Indonesia sesuai konvensi). | spesifikasi §5 "Rendering" |
| Draf | Simpan draf dan autosave tidak merevalidasi. Batal terbit tetap merevalidasi: status dokumen utama dicatat di `beforeChange` (pola `redirectSaatPathBerubah`), karena `previousDoc` di `afterChange` adalah versi terakhir. | sumber `payload@3.92.1` `collections/operations/utilities/update.js` |
| Panel SEO | Field `ui` `panelSeo` di tab SEO artikel + endpoint `POST /api/artikel/panel-seo` (pengguna masuk). Isian form dibaca dengan `useAllFormFields` + `reduceFieldsToValues`, dirapikan (`rapikanIsian`), dikirim setelah jeda 0,8 detik. | Payload docs UI field dan React hooks |
| Kemiripan keyphrase | Kata kunci = kata ternormalisasi tanpa kata umum dan angka tahun. `sama` bila identik; `mirip` bila Jaccard minimal 0,6 atau satu frasa memuat frasa lain (minimal dua kata). Saran: 2 poin per kata bersama, 1 bila sepilar. | spesifikasi §8 butir 3-4 |

## Struktur file setelah rencana ini

```
src/modules/seo/
  teks.ts         normalisasi, hitung kata, kalimat, potong, cocok frasa
  lexical.ts      teks, subjudul, tautan, gambar dari JSON Lexical; isiDenganMedia
  tipe.ts         MasukanSeo, PengaturanSitus, Situs, tipe dokumen
  dokumen.ts      path, judul, deskripsi, warna, noindex, gambar OG per dokumen
  metadata.ts     metadata() -> Metadata Next.js, canonicalDokumen, PATH_FEED
  jsonld.ts       jsonLd(), remahRoti(), serialisasiJsonLd(), tipeSchemaArtikel()
  analisis.ts     analisis() -> 12 cek hijau/kuning, skor, BATAS
  xml.ts          sitemap index, urlset, news sitemap, robots.txt, RSS
  sitemap.ts      lastmod, kelayakan sitemap, entri dari dokumen
  data.ts         query Payload untuk rute teknis, TAG_RUTE
  rute.ts         isi rute dengan unstable_cache bertag, respons()
  kemiripan.ts    kanibalisasi dan saran link internal
  pratinjau.ts    teks pratinjau Google desktop/HP dan kartu sosial
  panel.ts        isian form -> masukan endpoint; jawaban -> checklist + pratinjau
  endpoint.ts     POST /api/artikel/panel-seo
  PanelSeo.tsx    komponen klien panel SEO (+ PanelSeo.scss)
  situs.ts        ambilSitus(payload)
  index.ts        ekspor publik
src/lib/tag.ts                       TAG, tagRevalidasi
src/hooks/revalidasiPublik.ts        hook revalidasi koleksi publik dan pengaturan SEO
src/app/(frontend)/sitemap.xml/route.ts, sitemap/[jenis]/route.ts, news-sitemap.xml/route.ts,
  robots.txt/route.ts, feed.xml/route.ts
src/collections/{Artikel,Pilar,Subkategori,Penulis,Tools,Video,Halaman}.ts   + hook revalidasi
src/collections/Artikel.ts           + endpoint panel SEO, field ui panelSeo
src/globals/PengaturanSEO.ts         + hook revalidasi
tests/unit/seo-*.test.ts, tests/unit/tag.test.ts, tests/unit/seo-contoh.ts (data contoh)
tests/int/revalidasi.int.spec.ts, tests/int/sitemap.int.spec.ts, tests/int/panel-seo.int.spec.ts
```

## Jumlah tes yang diharapkan

| Setelah task | Unit (file) | Integrasi (file) |
|---|---|---|
| Baseline Rencana 2 | 102 (17) | 32 (10) |
| 1 Teks dan Lexical | 114 (18) | 32 (10) |
| 2 `metadata()` | 131 (19) | 32 (10) |
| 3 `jsonLd()` | 143 (20) | 32 (10) |
| 4 `analisis()` | 158 (21) | 32 (10) |
| 5 Pembentuk XML dan teks | 173 (22) | 32 (10) |
| 6 Tag dan revalidasi | 178 (23) | 37 (11) |
| 7 Rute teknis | 181 (24) | 44 (12) |
| 8 Panel SEO | 203 (27) | 48 (13) |
| 9 Ekspor dan dokumentasi | 203 (27) | 49 (13) |

---

### Task 1: Utilitas teks dan pembaca isi Lexical

**Files:**
- Create: `src/modules/seo/teks.ts`, `src/modules/seo/lexical.ts`, `tests/unit/seo-contoh.ts` (pembuat data contoh, bukan file tes)
- Test: `tests/unit/seo-teks.test.ts`

**Interfaces:**
- Consumes: tidak ada (fungsi murni, tanpa paket Lexical, aman untuk komponen admin).
- Produces:
  - `src/modules/seo/teks.ts`: `normalisasi(teks): string`, `hitungKata(teks): number`, `pecahKalimat(teks): string[]`, `rataPanjangKalimat(teks): number`, `potongKata(teks, maks): string`, `mengandungFrasa(teks, frasa): boolean`.
  - `src/modules/seo/lexical.ts`: `type IsiDokumen`, `type Subjudul = { level; teks }`, `type TautanIsi` (internal dengan `url` atau `docId` + `relationTo`, eksternal dengan `url`), `type GambarIsi = { id?; alt?; width? }`, `teksNode(node)`, `teksIsi(isi): string[]`, `judulBagian(isi): Subjudul[]`, `tautanIsi(isi, urlSitus): TautanIsi[]`, `gambarIsi(isi): GambarIsi[]`, `idGambarIsi(isi)`, `isiDenganMedia(isi, media)`.
  - `tests/unit/seo-contoh.ts`: `p`, `h`, `tautan`, `tautanInternal`, `unggahan`, `isiLexical`, `kalimatPanjang` (Task 2 menambah dokumen contoh).

Analisis SEO (Task 4) dan panel admin (Task 8) membaca isi artikel dari JSON Lexical yang disimpan Payload: `heading` dengan `tag` `h1`-`h6`, `link`/`autolink` dengan `fields.linkType` `custom` (`fields.url`) atau `internal` (`fields.doc.relationTo` + `fields.doc.value`), dan `upload` dengan `relationTo: 'media'` dan `value` berupa ID atau dokumen media. Pembaca ini sengaja tidak memakai paket `lexical` supaya komponen admin tidak membawa kode editor tambahan. Tautan dihitung internal bila menunjuk dokumen, berupa path relatif, atau berada di domain `urlSitus`; jangkar `#`, `mailto:`, dan `tel:` diabaikan. Form admin menyimpan node upload sebagai ID, jadi `isiDenganMedia` dipakai panel untuk menyisipkan dokumen media (alt, lebar) sebelum dianalisis.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/seo-contoh.ts`

  ```ts
  /**
   * Pembuat data contoh untuk tes modul SEO. Bukan file tes (tidak berakhiran `.test.ts`).
   * Bentuk node mengikuti JSON Lexical yang disimpan Payload 3.92 (`paragraph`, `heading`,
   * `link`, `upload`).
   */

  type Anak = string | Record<string, unknown>

  const teks = (text: string) => ({ type: 'text', text, format: 0, detail: 0, mode: 'normal', style: '', version: 1 })

  const anak = (isi: Anak[]) => isi.map((a) => (typeof a === 'string' ? teks(a) : a))

  export const p = (...isi: Anak[]) => ({ type: 'paragraph', version: 1, children: anak(isi) })

  export const h = (tag: 'h1' | 'h2' | 'h3' | 'h4', ...isi: Anak[]) => ({ type: 'heading', tag, version: 1, children: anak(isi) })

  export const tautan = (url: string, label: string) => ({
    type: 'link',
    version: 3,
    fields: { linkType: 'custom', newTab: false, url },
    children: [teks(label)],
  })

  export const tautanInternal = (id: number, label: string, relationTo = 'artikel') => ({
    type: 'link',
    version: 3,
    fields: { linkType: 'internal', newTab: false, doc: { relationTo, value: id } },
    children: [teks(label)],
  })

  export const unggahan = (media: number | { id: number; alt?: string | null; width?: number | null }) => ({
    type: 'upload',
    version: 3,
    id: 'node-unggahan',
    fields: {},
    relationTo: 'media',
    value: media,
  })

  export const isiLexical = (children: Record<string, unknown>[]) => ({
    root: { type: 'root', version: 1, direction: 'ltr' as const, format: '' as const, indent: 0, children },
  })

  /** Paragraf berisi `jumlah` kata "kata". */
  export const kalimatPanjang = (jumlah: number) => `${Array.from({ length: jumlah }, () => 'kata').join(' ')}.`
  ```

  `tests/unit/seo-teks.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { gambarIsi, isiDenganMedia, judulBagian, tautanIsi, teksIsi } from '@/modules/seo/lexical'
  import {
    hitungKata,
    mengandungFrasa,
    normalisasi,
    pecahKalimat,
    potongKata,
    rataPanjangKalimat,
  } from '@/modules/seo/teks'

  import { h, isiLexical, p, tautan, tautanInternal, unggahan } from './seo-contoh'

  describe('normalisasi', () => {
    it('huruf kecil, tanpa diakritik, tanda baca jadi spasi', () => {
      expect(normalisasi('  Cara Hitung THR: Gaji Pokok + Tunjangan  ')).toBe('cara hitung thr gaji pokok tunjangan')
      expect(normalisasi('Café & résumé')).toBe('cafe resume')
      expect(normalisasi('Rp5.000.000')).toBe('rp5 000 000')
    })
  })

  describe('hitungKata dan kalimat', () => {
    it('menghitung kata yang berisi huruf atau angka', () => {
      expect(hitungKata('Gaji bersih Rp5.000.000 per bulan , ya')).toBe(6)
      expect(hitungKata('   ')).toBe(0)
    })

    it('memecah kalimat di titik, tanda tanya, tanda seru, dan baris baru tanpa memecah angka', () => {
      expect(pecahKalimat('Gaji kamu Rp5.000.000. Berapa pajaknya? Hitung di sini\nLangkah kedua')).toEqual([
        'Gaji kamu Rp5.000.000.',
        'Berapa pajaknya?',
        'Hitung di sini',
        'Langkah kedua',
      ])
    })

    it('rata-rata panjang kalimat dalam kata', () => {
      expect(rataPanjangKalimat('Satu dua tiga. Empat lima.')).toBe(2.5)
      expect(rataPanjangKalimat('')).toBe(0)
    })
  })

  describe('potongKata', () => {
    it('memotong di batas kata dan menambah elipsis', () => {
      expect(potongKata('Potongan PPh 21 dan BPJS dihitung langkah demi langkah', 30)).toBe('Potongan PPh 21 dan BPJS...')
      expect(potongKata('Pendek saja', 30)).toBe('Pendek saja')
      expect(potongKata('  spasi   ganda  ', 30)).toBe('spasi ganda')
    })
  })

  describe('mengandungFrasa', () => {
    it('mencocokkan frasa utuh tanpa peduli huruf besar dan tanda baca', () => {
      expect(mengandungFrasa('Cara Hitung Gaji Bersih, lengkap', 'gaji bersih')).toBe(true)
      expect(mengandungFrasa('Penggajian bersih', 'gaji bersih')).toBe(false)
      expect(mengandungFrasa('apa saja', '')).toBe(false)
    })
  })

  describe('membaca isi Lexical', () => {
    const isi = isiLexical([
      p('Paragraf pembuka dengan ', tautan('https://pajak.go.id/pph21', 'aturan DJP'), '.'),
      h('h2', 'Cara menghitung'),
      p('Lihat ', tautanInternal(42, 'artikel THR'), ' dan ', tautan('/tools/gaji-bersih', 'kalkulator'), '.'),
      h('h3', 'Contoh'),
      unggahan({ id: 7, alt: 'Slip gaji', width: 1600 }),
      p(tautan('https://point.lat/glosarium/ptkp', 'PTKP'), ' dan ', tautan('#contoh', 'lompat')),
    ])

    it('teks per blok, termasuk teks di dalam tautan', () => {
      expect(teksIsi(isi)).toEqual([
        'Paragraf pembuka dengan aturan DJP.',
        'Cara menghitung',
        'Lihat artikel THR dan kalkulator.',
        'Contoh',
        'PTKP dan lompat',
      ])
    })

    it('daftar subjudul dengan levelnya', () => {
      expect(judulBagian(isi)).toEqual([
        { level: 2, teks: 'Cara menghitung' },
        { level: 3, teks: 'Contoh' },
      ])
    })

    it('tautan internal dan eksternal; tautan jangkar diabaikan', () => {
      expect(tautanIsi(isi, 'https://point.lat')).toEqual([
        { internal: false, url: 'https://pajak.go.id/pph21', teks: 'aturan DJP' },
        { internal: true, docId: 42, relationTo: 'artikel', teks: 'artikel THR' },
        { internal: true, url: '/tools/gaji-bersih', teks: 'kalkulator' },
        { internal: true, url: 'https://point.lat/glosarium/ptkp', teks: 'PTKP' },
      ])
    })

    it('gambar di dalam isi', () => {
      expect(gambarIsi(isi)).toEqual([{ id: 7, alt: 'Slip gaji', width: 1600 }])
    })

    it('melengkapi node gambar yang baru berisi ID dengan dokumen media', () => {
      const mentah = isiLexical([p('Pembuka'), unggahan(9), unggahan(10)])
      const terisi = isiDenganMedia(mentah, { 9: { id: 9, alt: 'Grafik', width: 1400 } })
      expect(gambarIsi(terisi)).toEqual([{ id: 9, alt: 'Grafik', width: 1400 }, { id: 10 }])
      expect(gambarIsi(mentah)).toEqual([{ id: 9 }, { id: 10 }])
    })

    it('isi kosong atau tidak valid', () => {
      expect(teksIsi(null)).toEqual([])
      expect(judulBagian(undefined)).toEqual([])
      expect(tautanIsi({ root: { children: [] } }, 'https://point.lat')).toEqual([])
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/seo-teks.test.ts` dengan `Cannot find package '@/modules/seo/lexical'`.

- [ ] **Langkah 3: Implementasi**

  `src/modules/seo/teks.ts`

  ```ts
  /**
   * Utilitas teks untuk analisis SEO. Fungsi murni, aman dipakai di server dan di komponen admin.
   */

  /** Huruf kecil, tanpa diakritik, tanda baca menjadi spasi, spasi dirapikan. Dipakai untuk mencocokkan frasa. */
  export function normalisasi(teks: string): string {
    return teks
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
  }

  /** Jumlah kata: potongan yang berisi minimal satu huruf atau angka. */
  export function hitungKata(teks: string): number {
    return teks.split(/\s+/).filter((kata) => /[\p{L}\p{N}]/u.test(kata)).length
  }

  /**
   * Memecah teks menjadi kalimat di titik, tanda tanya, tanda seru, dan baris baru. Titik di antara
   * angka (Rp5.000.000) tidak memecah kalimat karena pemisah harus diikuti spasi.
   */
  export function pecahKalimat(teks: string): string[] {
    return teks
      .split(/\n+|(?<=[.!?])\s+/)
      .map((kalimat) => kalimat.trim())
      .filter((kalimat) => hitungKata(kalimat) > 0)
  }

  /** Rata-rata kata per kalimat, dibulatkan satu angka di belakang koma. 0 bila tidak ada kalimat. */
  export function rataPanjangKalimat(teks: string): number {
    const kalimat = pecahKalimat(teks)
    if (kalimat.length === 0) return 0
    const total = kalimat.reduce((jumlah, k) => jumlah + hitungKata(k), 0)
    return Math.round((total / kalimat.length) * 10) / 10
  }

  /** Memotong teks di batas kata supaya panjangnya (termasuk "...") tidak melebihi `maks`. */
  export function potongKata(teks: string, maks: number): string {
    const rapi = teks.replace(/\s+/g, ' ').trim()
    if (rapi.length <= maks) return rapi
    const potong = rapi.slice(0, maks - 2)
    const batas = potong.lastIndexOf(' ')
    const dasar = batas > 0 ? potong.slice(0, batas) : rapi.slice(0, maks - 3)
    return `${dasar.replace(/[\s.,:;]+$/, '')}...`
  }

  /** Frasa muncul utuh di teks (dibandingkan setelah normalisasi, per kata). */
  export function mengandungFrasa(teks: string, frasa: string): boolean {
    const target = normalisasi(frasa)
    if (!target) return false
    return ` ${normalisasi(teks)} `.includes(` ${target} `)
  }
  ```

  `src/modules/seo/lexical.ts`

  ```ts
  /**
   * Pembaca JSON Lexical (Payload 3.92) untuk analisis SEO: teks per blok, subjudul, tautan, gambar.
   * Tidak bergantung pada paket Lexical supaya bisa dipakai di komponen admin tanpa menambah bundel.
   *
   * Node yang dikenali: `heading` (`tag` h1-h6), `link`/`autolink` (`fields.linkType` custom/internal,
   * `fields.url`, `fields.doc`), `upload` (`relationTo`, `value` berupa ID atau dokumen media),
   * `text`, `linebreak`, `tab`. Node lain (paragraf, list, quote, blok) ditelusuri anaknya.
   */

  type NodeLexical = {
    type?: string
    text?: string
    tag?: string
    children?: NodeLexical[]
    fields?: { linkType?: string; url?: string; doc?: { relationTo?: string; value?: unknown } | null }
    relationTo?: string
    value?: unknown
  }

  export type IsiDokumen = { root?: { children?: unknown[] } } | null | undefined

  export type Subjudul = { level: number; teks: string }

  export type TautanIsi =
    | { internal: true; teks: string; url: string }
    | { internal: true; teks: string; docId: number | string; relationTo: string }
    | { internal: false; teks: string; url: string }

  export type GambarIsi = { id?: number | string; alt?: string | null; width?: number | null }

  const BLOK = new Set(['paragraph', 'heading', 'quote', 'listitem'])

  function akar(isi: IsiDokumen): NodeLexical[] {
    const anak = isi?.root?.children
    return Array.isArray(anak) ? (anak as NodeLexical[]) : []
  }

  function jelajah(nodes: NodeLexical[], kunjungi: (node: NodeLexical) => boolean | void): void {
    for (const node of nodes) {
      if (kunjungi(node) === false) continue
      if (Array.isArray(node.children)) jelajah(node.children, kunjungi)
    }
  }

  /** Teks polos sebuah node beserta seluruh anaknya. */
  export function teksNode(node: NodeLexical): string {
    if (node.type === 'text') return node.text ?? ''
    if (node.type === 'linebreak') return '\n'
    if (node.type === 'tab') return ' '
    return (node.children ?? []).map(teksNode).join('')
  }

  /** Teks per blok (paragraf, subjudul, kutipan, butir list), sesuai urutan tampil. */
  export function teksIsi(isi: IsiDokumen): string[] {
    const hasil: string[] = []
    jelajah(akar(isi), (node) => {
      if (!node.type || !BLOK.has(node.type)) return
      const teks = teksNode(node).trim()
      if (teks) hasil.push(teks)
      return false
    })
    return hasil
  }

  export function judulBagian(isi: IsiDokumen): Subjudul[] {
    const hasil: Subjudul[] = []
    jelajah(akar(isi), (node) => {
      if (node.type !== 'heading') return
      const level = Number(/^h([1-6])$/.exec(node.tag ?? '')?.[1])
      if (level) hasil.push({ level, teks: teksNode(node).trim() })
      return false
    })
    return hasil
  }

  function asalSitus(urlSitus: string): string | null {
    try {
      return new URL(urlSitus).origin
    } catch {
      return null
    }
  }

  /**
   * Tautan di isi. Internal bila menunjuk dokumen (linkType internal), path relatif, atau domain situs.
   * Tautan jangkar (`#...`), `mailto:`, dan `tel:` diabaikan.
   */
  export function tautanIsi(isi: IsiDokumen, urlSitus: string): TautanIsi[] {
    const asal = asalSitus(urlSitus)
    const hasil: TautanIsi[] = []
    jelajah(akar(isi), (node) => {
      if (node.type !== 'link' && node.type !== 'autolink') return
      const teks = teksNode(node).trim()
      const fields = node.fields ?? {}
      if (fields.linkType === 'internal' && fields.doc?.relationTo) {
        const nilai = fields.doc.value
        const docId = typeof nilai === 'object' && nilai ? (nilai as { id: number | string }).id : (nilai as number | string)
        if (docId !== undefined && docId !== null) {
          hasil.push({ internal: true, docId, relationTo: fields.doc.relationTo, teks })
        }
        return false
      }
      const url = (fields.url ?? '').trim()
      if (!url || url.startsWith('#') || /^(mailto|tel):/i.test(url)) return false
      if (url.startsWith('/') && !url.startsWith('//')) {
        hasil.push({ internal: true, url, teks })
        return false
      }
      try {
        const tujuan = new URL(url)
        hasil.push({ internal: tujuan.origin === asal, url, teks } as TautanIsi)
      } catch {
        // URL tidak valid tidak dihitung.
      }
      return false
    })
    return hasil
  }

  /** Gambar di isi. Node yang baru berisi ID (belum di-populate) hanya mengembalikan `id`. */
  export function gambarIsi(isi: IsiDokumen): GambarIsi[] {
    const hasil: GambarIsi[] = []
    jelajah(akar(isi), (node) => {
      if (node.type !== 'upload' || node.relationTo !== 'media') return
      const nilai = node.value
      if (nilai && typeof nilai === 'object') {
        const media = nilai as GambarIsi
        hasil.push({ id: media.id, alt: media.alt, width: media.width })
      } else if (nilai !== undefined && nilai !== null) {
        hasil.push({ id: nilai as number | string })
      }
      return false
    })
    return hasil
  }

  /** ID media yang dipakai node gambar di isi dan belum di-populate. */
  export function idGambarIsi(isi: IsiDokumen): (number | string)[] {
    return gambarIsi(isi)
      .filter((g) => g.alt === undefined && g.width === undefined && g.id !== undefined)
      .map((g) => g.id as number | string)
  }

  /**
   * Salinan isi dengan node gambar yang berisi ID diganti dokumen media dari `media`. Dipakai panel
   * SEO: form admin menyimpan upload Lexical sebagai ID, sedangkan analisis butuh alt dan lebar.
   */
  export function isiDenganMedia<T extends IsiDokumen>(isi: T, media: Record<string, GambarIsi>): T {
    if (!isi?.root) return isi
    const ganti = (node: NodeLexical): NodeLexical => {
      if (node.type === 'upload' && node.relationTo === 'media' && (typeof node.value === 'number' || typeof node.value === 'string')) {
        const doc = media[String(node.value)]
        return doc ? { ...node, value: doc } : node
      }
      return Array.isArray(node.children) ? { ...node, children: node.children.map(ganti) } : node
    }
    return { ...isi, root: { ...isi.root, children: akar(isi).map(ganti) } }
  }
  ```

- [ ] **Langkah 4: Jalankan tes, type check, lint**

  Jalankan:

  ```bash
  npm run test:unit
  npm run typecheck
  npm run lint
  ```

  Hasil yang diharapkan: unit `Test Files 18 passed (18)`, `Tests 114 passed (114)`; type check dan lint tanpa error.

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/modules/seo/teks.ts src/modules/seo/lexical.ts tests/unit/seo-contoh.ts tests/unit/seo-teks.test.ts
  git commit -m "feat(seo): utilitas teks dan pembaca isi Lexical untuk analisis"
  ```


### Task 2: Tipe masukan dan `metadata()`

**Files:**
- Create: `src/modules/seo/tipe.ts`, `src/modules/seo/dokumen.ts`, `src/modules/seo/metadata.ts`, `src/modules/seo/index.ts`
- Modify: `tests/unit/seo-contoh.ts` (dokumen contoh)
- Test: `tests/unit/seo-metadata.test.ts`

**Interfaces:**
- Consumes: `pathFor` (`src/lib/paths.ts`), `judulHalaman` (`src/lib/seo-dasar.ts`), `WarnaPilar`, `TipeArtikel`, `ToolId` (`src/lib/konstanta.ts`), `urlOg` (`src/modules/media/og.ts`), `bangunUrl`, `UKURAN_OG`, `JenisMedia` (`src/modules/media/url.ts`); `potongKata` (Task 1).
- Produces:
  - `src/modules/seo/tipe.ts`: `type Relasi<T>`, `MediaSeo`, `GrupSeo`, `TipeSchema`, `PilarSeo`, `SubkategoriSeo`, `PenulisSeo`, `ArtikelSeo`, `ToolsSeo`, `VideoSeo`, `HalamanSeo`, `MasukanSeo` (union `{ jenis, doc }` per koleksi + `{ jenis: 'beranda' }` + `{ jenis: 'statis', judul, path, deskripsi?, noindex? }`), `PengaturanSitus` (isi global `pengaturan-seo`), `Situs = PengaturanSitus & { cloudName }`.
  - `src/modules/seo/dokumen.ts`: `MAKS_DESKRIPSI = 160`, `ambil(relasi)`, `urlAbsolut(situs, path)`, `pathDokumen(masukan)`, `judulDokumen`, `judulSeo`, `deskripsiDokumen`, `warnaDokumen`, `noindexDokumen`, `type GambarOg`, `gambarOgDokumen(masukan, situs)`.
  - `src/modules/seo/metadata.ts`: `PATH_FEED = '/feed.xml'`, `canonicalDokumen(masukan, situs)`, `metadata(masukan: MasukanSeo, situs: Situs): Metadata`. Ini `metadata(doc)` dari spesifikasi §5; Rencana 4 memanggilnya dari `generateMetadata`.

Tipe masukan sengaja lebih longgar dari `payload-types.ts`: relasi boleh ID atau dokumen (`Relasi<T>`), field opsional boleh `null`. Dengan begitu hasil `payload.find({ depth: 1 })` langsung bisa dipakai, dan tes cukup memakai objek kecil. Aturan yang dikunci tes:

| Bagian | Aturan |
|---|---|
| Judul | `seo.judulSEO` dipakai apa adanya (editor menulis judul lengkap untuk Google); bila kosong, judul atau nama dibungkus `polaJudul` (`%s · point.`). Beranda memakai `judulDefault` atau `namaSitus`. Selalu `title.absolute` supaya template layout tidak membungkus dua kali. |
| Meta description | `seo.metaDeskripsi`; bila kosong, deck (artikel), ringkasan (tools), deskripsi (pilar, subkategori), transkrip (video), bio (penulis), lalu `metaDefault`, dipotong di batas kata maksimal 160 karakter. |
| Canonical | `seo.canonical` bila diisi; selain itu `urlSitus` + `pathFor()`. |
| Robots | `index, follow, max-image-preview:large`; `noindex` menjadi `noindex, follow` (tanpa `max-image-preview`). |
| Open Graph | `article` (dengan `publishedTime`, `modifiedTime = diperbaruiBesar ?? terbitPada`, `authors`, `section`), `profile` (penulis), `video.other` (video), selain itu `website`. Locale `id_ID`. |
| Gambar OG | unggahan editor (`seo.gambarOG`, preset `og` 1200x630; video memakai poster `so_auto`), lalu gambar OG default situs untuk dokumen tanpa pilar, lalu `urlOg` otomatis dengan warna pilar (hijau bila tanpa pilar). |
| Beranda | `alternates.types` RSS `/feed.xml` dan kode verifikasi Google/Bing (`msvalidate.01`). |

- [ ] **Langkah 1: Tulis tes yang gagal**

  Tambahkan dokumen contoh di akhir `tests/unit/seo-contoh.ts`:

  ```diff
  diff --git a/tests/unit/seo-contoh.ts b/tests/unit/seo-contoh.ts
  index 9355658..c69f115 100644
  --- a/tests/unit/seo-contoh.ts
  +++ b/tests/unit/seo-contoh.ts
  @@ -43,3 +43,38 @@ export const isiLexical = (children: Record<string, unknown>[]) => ({
   
   /** Paragraf berisi `jumlah` kata "kata". */
   export const kalimatPanjang = (jumlah: number) => `${Array.from({ length: jumlah }, () => 'kata').join(' ')}.`
  +
  +// Dokumen contoh (bentuk hasil `find` Payload dengan depth 1).
  +
  +export const situs = {
  +  namaSitus: 'point.',
  +  urlSitus: 'https://point.lat',
  +  polaJudul: '%s · point.',
  +  metaDefault: 'Intinya dulu. Uang, karier, teknologi, pendidikan, dan kesehatan dijelaskan dari intinya.',
  +  organisasi: { nama: 'point.lat', logo: { id: 1, publicId: 'point/gambar/logo', alt: 'Logo point.', width: 512, height: 512 }, sameAs: ['https://www.instagram.com/point.lat'] },
  +  verifikasi: { google: 'kode-google', bing: null },
  +  cloudName: 'demo',
  +}
  +
  +export const pilarUang = { id: 1, nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau' as const, deskripsi: 'Gaji, pajak, tabungan, utang, dan karier.' }
  +
  +export const penulis = { id: 3, nama: 'Rani Wulandari', slug: 'rani-wulandari', bio: 'Menulis soal pajak dan gaji.', keahlian: ['Pajak penghasilan'], tautan: [{ label: 'LinkedIn', url: 'https://www.linkedin.com/in/rani' }] }
  +
  +export const gambarUtama = { id: 5, publicId: 'point/gambar/slip-gaji-1a2b3c4d', jenis: 'gambar' as const, alt: 'Slip gaji karyawan', width: 1600, height: 900 }
  +
  +export const artikel = {
  +  id: 10,
  +  judul: 'Cara hitung gaji bersih',
  +  slug: 'cara-hitung-gaji-bersih',
  +  tipe: 'panduan' as const,
  +  deck: 'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS. Begini cara menghitungnya langkah demi langkah, lengkap dengan contoh untuk karyawan tetap berstatus lajang tanpa tanggungan.',
  +  pilar: pilarUang,
  +  subkategori: { id: 2, nama: 'Pajak', slug: 'pajak', pilar: pilarUang },
  +  penulis,
  +  gambarUtama,
  +  terbitPada: '2026-11-02T03:00:00.000Z',
  +  diperbaruiBesar: null,
  +  createdAt: '2026-11-01T10:00:00.000Z',
  +  updatedAt: '2026-11-03T08:00:00.000Z',
  +  seo: { keyphrase: 'gaji bersih', tipeSchema: 'otomatis' as const },
  +}
  ```

  `tests/unit/seo-metadata.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { metadata } from '@/modules/seo/metadata'

  import { artikel, gambarUtama, penulis, pilarUang, situs } from './seo-contoh'

  const OG_HIJAU = 'https://res.cloudinary.com/demo/image/upload/w_1200,h_630,c_scale,e_colorize:100,co_rgb:1F7A4D'

  describe('metadata artikel', () => {
    const m = metadata({ jenis: 'artikel', doc: artikel }, situs)

    it('judul memakai pola judul situs', () => {
      expect(m.title).toEqual({ absolute: 'Cara hitung gaji bersih · point.' })
    })

    it('meta description jatuh ke deck yang dipotong di batas kata (maks 160 karakter)', () => {
      expect(m.description).toBe(
        'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS. Begini cara menghitungnya langkah demi langkah, lengkap dengan contoh untuk karyawan tetap...',
      )
      expect((m.description as string).length).toBeLessThanOrEqual(160)
    })

    it('canonical absolut dari urlSitus dan pathFor', () => {
      expect(m.alternates).toEqual({ canonical: 'https://point.lat/cara-hitung-gaji-bersih' })
      expect(m.metadataBase?.toString()).toBe('https://point.lat/')
    })

    it('robots index dengan max-image-preview:large', () => {
      expect(m.robots).toEqual({ index: true, follow: true, 'max-image-preview': 'large' })
    })

    it('Open Graph artikel dengan gambar otomatis warna pilar', () => {
      expect(m.openGraph).toMatchObject({
        type: 'article',
        title: 'Cara hitung gaji bersih · point.',
        url: 'https://point.lat/cara-hitung-gaji-bersih',
        siteName: 'point.',
        locale: 'id_ID',
        publishedTime: '2026-11-02T03:00:00.000Z',
        modifiedTime: '2026-11-02T03:00:00.000Z',
        authors: ['https://point.lat/penulis/rani-wulandari'],
        section: 'Uang & Karier',
      })
      const [gambar] = (m.openGraph as { images: { url: string; width: number; height: number; alt: string }[] }).images
      expect(gambar.url.startsWith(OG_HIJAU)).toBe(true)
      expect(gambar).toMatchObject({ width: 1200, height: 630, alt: 'Cara hitung gaji bersih' })
    })

    it('kartu X summary_large_image memakai gambar yang sama', () => {
      expect(m.twitter).toMatchObject({ card: 'summary_large_image', title: 'Cara hitung gaji bersih · point.' })
      expect((m.twitter as { images: string[] }).images[0].startsWith(OG_HIJAU)).toBe(true)
    })
  })

  describe('metadata dengan isian SEO editor', () => {
    const doc = {
      ...artikel,
      tipe: 'glosarium' as const,
      slug: 'ptkp',
      diperbaruiBesar: '2026-11-03T05:00:00.000Z',
      seo: {
        judulSEO: 'PTKP 2026: arti, besaran, dan cara pakainya',
        metaDeskripsi: 'Penghasilan Tidak Kena Pajak.',
        canonical: 'https://contoh.id/ptkp',
        noindex: true,
        gambarOG: gambarUtama,
      },
    }
    const m = metadata({ jenis: 'artikel', doc }, situs)

    it('judul SEO dipakai apa adanya tanpa pola', () => {
      expect(m.title).toEqual({ absolute: 'PTKP 2026: arti, besaran, dan cara pakainya' })
    })

    it('meta, canonical, dan noindex dari editor', () => {
      expect(m.description).toBe('Penghasilan Tidak Kena Pajak.')
      expect(m.alternates).toEqual({ canonical: 'https://contoh.id/ptkp' })
      expect(m.robots).toEqual({ index: false, follow: true })
    })

    it('gambar OG unggahan memakai preset og Cloudinary', () => {
      expect((m.openGraph as { images: unknown[] }).images[0]).toEqual({
        url: 'https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1200,h_630/f_auto,q_auto/point/gambar/slip-gaji-1a2b3c4d',
        width: 1200,
        height: 630,
        alt: 'Slip gaji karyawan',
      })
      expect(m.openGraph).toMatchObject({ modifiedTime: '2026-11-03T05:00:00.000Z' })
    })

    it('canonical glosarium dari pathFor bila editor tidak mengisi', () => {
      const tanpa = metadata({ jenis: 'artikel', doc: { ...doc, seo: {} } }, situs)
      expect(tanpa.alternates).toEqual({ canonical: 'https://point.lat/glosarium/ptkp' })
    })
  })

  describe('metadata jenis lain', () => {
    it('pilar: deskripsi pilar, path tingkat atas, warna pilar sendiri', () => {
      const m = metadata({ jenis: 'pilar', doc: { ...pilarUang, warna: 'kuning', nama: 'Belajar', slug: 'belajar' } }, situs)
      expect(m.title).toEqual({ absolute: 'Belajar · point.' })
      expect(m.description).toBe('Gaji, pajak, tabungan, utang, dan karier.')
      expect(m.alternates).toEqual({ canonical: 'https://point.lat/belajar' })
      expect((m.openGraph as { images: { url: string }[] }).images[0].url).toContain('co_rgb:F2C230/')
    })

    it('subkategori berada di bawah pilarnya', () => {
      const m = metadata({ jenis: 'subkategori', doc: { nama: 'Pajak', slug: 'pajak', pilar: pilarUang } }, situs)
      expect(m.alternates).toEqual({ canonical: 'https://point.lat/uang-karier/pajak' })
      expect(m.description).toBe('Gaji, pajak, tabungan, utang, dan karier.')
    })

    it('tools memakai ringkasan sebagai meta default', () => {
      const m = metadata(
        { jenis: 'tools', doc: { nama: 'Kalkulator Gaji Bersih', slug: 'gaji-bersih', toolId: 'gaji-bersih', ringkasan: 'Hitung gaji bersih setelah PPh 21 dan BPJS.', pilar: pilarUang } },
        situs,
      )
      expect(m.alternates).toEqual({ canonical: 'https://point.lat/tools/gaji-bersih' })
      expect(m.description).toBe('Hitung gaji bersih setelah PPh 21 dan BPJS.')
      expect(m.openGraph).toMatchObject({ type: 'website' })
    })

    it('penulis: Open Graph profile, gambar OG default situs bila ada', () => {
      const dengan = { ...situs, gambarOgDefault: gambarUtama }
      const m = metadata({ jenis: 'penulis', doc: penulis }, dengan)
      expect(m.openGraph).toMatchObject({ type: 'profile', url: 'https://point.lat/penulis/rani-wulandari' })
      expect((m.openGraph as { images: { url: string }[] }).images[0].url).toContain('/c_fill,g_auto,w_1200,h_630/')
    })

    it('video: poster unggahan memakai so_auto', () => {
      const m = metadata(
        {
          jenis: 'video',
          doc: {
            judul: 'PPh 21 dalam 45 detik',
            slug: 'pph-21',
            transkrip: 'Halo.',
            pilar: pilarUang,
            seo: { gambarOG: { publicId: 'point/video/pph-21-aa11bb22', jenis: 'video' } },
          },
        },
        situs,
      )
      expect(m.openGraph).toMatchObject({ type: 'video.other' })
      expect((m.openGraph as { images: { url: string }[] }).images[0].url).toBe(
        'https://res.cloudinary.com/demo/video/upload/so_auto/q_auto/point/video/pph-21-aa11bb22.jpg',
      )
    })

    it('beranda: judul default, meta default, RSS, dan kode verifikasi', () => {
      const m = metadata({ jenis: 'beranda' }, { ...situs, judulDefault: 'point. Intinya dulu.', verifikasi: { google: 'kode-google', bing: 'kode-bing' } })
      expect(m.title).toEqual({ absolute: 'point. Intinya dulu.' })
      expect(m.description).toBe(situs.metaDefault)
      expect(m.alternates).toEqual({
        canonical: 'https://point.lat/',
        types: { 'application/rss+xml': 'https://point.lat/feed.xml' },
      })
      expect(m.verification).toEqual({ google: 'kode-google', other: { 'msvalidate.01': 'kode-bing' } })
    })

    it('halaman statis tanpa dokumen, misal pencarian noindex', () => {
      const m = metadata({ jenis: 'statis', judul: 'Cari', path: '/cari', noindex: true }, situs)
      expect(m.title).toEqual({ absolute: 'Cari · point.' })
      expect(m.alternates).toEqual({ canonical: 'https://point.lat/cari' })
      expect(m.robots).toEqual({ index: false, follow: true })
      expect(m.description).toBe(situs.metaDefault)
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/seo-metadata.test.ts` dengan `Cannot find package '@/modules/seo/metadata'`.

- [ ] **Langkah 3: Tulis tipe masukan**

  `src/modules/seo/tipe.ts`

  ```ts
  import type { TipeArtikel, ToolId, WarnaPilar } from '@/lib/konstanta'
  import type { JenisMedia } from '@/modules/media/url'

  /**
   * Tipe masukan modul SEO. Sengaja lebih longgar dari `payload-types.ts` supaya dokumen Payload
   * (hasil `find` dengan depth 1) dan data form admin sama-sama bisa dipakai tanpa konversi.
   */

  /** Relasi Payload: dokumen bila di-populate (depth >= 1), ID bila tidak. */
  export type Relasi<T> = T | number | string | null | undefined

  export type MediaSeo = {
    id?: number | string
    publicId?: string | null
    jenis?: JenisMedia | null
    alt?: string | null
    width?: number | null
    height?: number | null
  }

  export type TipeSchema = 'otomatis' | 'Article' | 'NewsArticle'

  export type GrupSeo = {
    keyphrase?: string | null
    keyphraseSekunder?: string[] | null
    judulSEO?: string | null
    metaDeskripsi?: string | null
    gambarOG?: Relasi<MediaSeo>
    canonical?: string | null
    tipeSchema?: TipeSchema | null
    noindex?: boolean | null
  }

  type Dasar = { id?: number | string; slug?: string | null; seo?: GrupSeo | null; createdAt?: string; updatedAt?: string }

  export type PilarSeo = Dasar & { nama: string; warna: WarnaPilar; deskripsi?: string | null }

  export type SubkategoriSeo = Dasar & { nama: string; deskripsi?: string | null; pilar: Relasi<PilarSeo> }

  export type PenulisSeo = Dasar & {
    nama: string
    bio?: string | null
    foto?: Relasi<MediaSeo>
    keahlian?: string[] | null
    tautan?: { label: string; url: string }[] | null
  }

  export type ArtikelSeo = Dasar & {
    judul: string
    tipe: TipeArtikel
    deck?: string | null
    pilar: Relasi<PilarSeo>
    subkategori?: Relasi<SubkategoriSeo>
    penulis: Relasi<PenulisSeo>
    gambarUtama?: Relasi<MediaSeo>
    terbitPada?: string | null
    diperbaruiBesar?: string | null
  }

  export type ToolsSeo = Dasar & { nama: string; toolId: ToolId; ringkasan?: string | null; pilar: Relasi<PilarSeo> }

  export type VideoSeo = Dasar & {
    judul: string
    transkrip?: string | null
    durasiDetik?: number | null
    file?: Relasi<MediaSeo & { durasi?: number | null }>
    poster?: Relasi<MediaSeo>
    pilar: Relasi<PilarSeo>
  }

  export type HalamanSeo = Dasar & { judul: string }

  /** Halaman yang SEO-nya dibangun modul ini. `statis` untuk halaman indeks tanpa dokumen (`/tools`, `/cari`). */
  export type MasukanSeo =
    | { jenis: 'artikel'; doc: ArtikelSeo }
    | { jenis: 'pilar'; doc: PilarSeo }
    | { jenis: 'subkategori'; doc: SubkategoriSeo }
    | { jenis: 'tools'; doc: ToolsSeo }
    | { jenis: 'video'; doc: VideoSeo }
    | { jenis: 'penulis'; doc: PenulisSeo }
    | { jenis: 'halaman'; doc: HalamanSeo }
    | { jenis: 'beranda' }
    | { jenis: 'statis'; judul: string; path: string; deskripsi?: string | null; noindex?: boolean }

  /** Isi global `pengaturan-seo` yang dipakai modul ini (hasil `findGlobal` depth 1). */
  export type PengaturanSitus = {
    namaSitus: string
    urlSitus: string
    polaJudul: string
    judulDefault?: string | null
    metaDefault?: string | null
    gambarOgDefault?: Relasi<MediaSeo>
    organisasi?: { nama?: string | null; logo?: Relasi<MediaSeo>; sameAs?: string[] | null } | null
    verifikasi?: { google?: string | null; bing?: string | null } | null
    robotsTambahan?: string | null
  }

  /**
   * Pengaturan situs ditambah cloud name Cloudinary (`klienMedia().cloudName`) untuk URL gambar OG,
   * logo, dan gambar JSON-LD. Rute teknis (sitemap, robots, RSS) cukup memakai `PengaturanSitus`.
   */
  export type Situs = PengaturanSitus & { cloudName: string }
  ```

- [ ] **Langkah 4: Tulis aturan per dokumen**

  `src/modules/seo/dokumen.ts`

  ```ts
  import { judulHalaman } from '@/lib/seo-dasar'
  import type { WarnaPilar } from '@/lib/konstanta'
  import { pathFor } from '@/lib/paths'
  import { urlOg } from '@/modules/media/og'
  import { bangunUrl, UKURAN_OG } from '@/modules/media/url'

  import { potongKata } from './teks'
  import type { MasukanSeo, MediaSeo, PengaturanSitus, PilarSeo, Relasi, Situs } from './tipe'

  /** Batas meta description yang dipakai saat membuat deskripsi otomatis (spesifikasi §8: 150-160). */
  export const MAKS_DESKRIPSI = 160

  /** Isi relasi bila sudah di-populate, `null` bila masih ID atau kosong. */
  export function ambil<T extends object>(relasi: Relasi<T>): T | null {
    return relasi && typeof relasi === 'object' ? relasi : null
  }

  /** URL absolut dari path publik, berdasarkan `urlSitus` di pengaturan SEO. */
  export function urlAbsolut(situs: Pick<PengaturanSitus, 'urlSitus'>, path: string): string {
    return new URL(path, situs.urlSitus).toString()
  }

  /** Path publik dokumen, selalu lewat `pathFor()`. */
  export function pathDokumen(masukan: MasukanSeo): string {
    switch (masukan.jenis) {
      case 'beranda':
        return '/'
      case 'statis':
        return masukan.path
      case 'artikel':
        return pathFor({ jenis: 'artikel', slug: masukan.doc.slug ?? '', tipe: masukan.doc.tipe })
      case 'subkategori':
        return pathFor({
          jenis: 'subkategori',
          slug: masukan.doc.slug ?? '',
          pilarSlug: ambil(masukan.doc.pilar)?.slug ?? '',
        })
      default:
        return pathFor({ jenis: masukan.jenis, slug: masukan.doc.slug ?? '' })
    }
  }

  /** Judul dokumen tanpa pola situs: judul SEO bila diisi, selain itu judul atau nama. */
  export function judulDokumen(masukan: MasukanSeo, situs: PengaturanSitus): string {
    if (masukan.jenis === 'beranda') return situs.judulDefault || situs.namaSitus
    if (masukan.jenis === 'statis') return masukan.judul
    const doc = masukan.doc
    const seo = doc.seo?.judulSEO?.trim()
    if (seo) return seo
    return 'judul' in doc ? doc.judul : doc.nama
  }

  /**
   * Judul `<title>` yang tampil di Google. Judul SEO dipakai apa adanya (editor mengatur judul lengkap);
   * judul biasa dibungkus pola judul situs (`%s · point.`). Beranda memakai judul default.
   */
  export function judulSeo(masukan: MasukanSeo, situs: PengaturanSitus): string {
    if (masukan.jenis === 'beranda') return judulDokumen(masukan, situs)
    if (masukan.jenis !== 'statis' && masukan.doc.seo?.judulSEO?.trim()) return judulDokumen(masukan, situs)
    return judulHalaman(situs.polaJudul, judulDokumen(masukan, situs))
  }

  function deskripsiCadangan(masukan: MasukanSeo, situs: PengaturanSitus): string | null | undefined {
    switch (masukan.jenis) {
      case 'artikel':
        return masukan.doc.deck
      case 'pilar':
        return masukan.doc.deskripsi
      case 'subkategori':
        return masukan.doc.deskripsi || ambil(masukan.doc.pilar)?.deskripsi
      case 'tools':
        return masukan.doc.ringkasan
      case 'video':
        return masukan.doc.transkrip
      case 'penulis':
        return masukan.doc.bio
      case 'statis':
        return masukan.deskripsi
      default:
        return situs.metaDefault
    }
  }

  /** Meta description: isian editor, atau deck/ringkasan/deskripsi yang dipotong di batas kata. */
  export function deskripsiDokumen(masukan: MasukanSeo, situs: PengaturanSitus): string {
    const isian = masukan.jenis === 'beranda' || masukan.jenis === 'statis' ? null : masukan.doc.seo?.metaDeskripsi
    const teks = isian?.trim() || deskripsiCadangan(masukan, situs)?.trim() || situs.metaDefault?.trim() || ''
    return isian?.trim() ? teks : potongKata(teks, MAKS_DESKRIPSI)
  }

  /** Warna pilar dokumen untuk gambar OG otomatis. `null` untuk dokumen tanpa pilar. */
  export function warnaDokumen(masukan: MasukanSeo): WarnaPilar | null {
    switch (masukan.jenis) {
      case 'pilar':
        return masukan.doc.warna
      case 'artikel':
      case 'tools':
      case 'video':
      case 'subkategori':
        return ambil<PilarSeo>(masukan.doc.pilar)?.warna ?? null
      default:
        return null
    }
  }

  export function noindexDokumen(masukan: MasukanSeo): boolean {
    if (masukan.jenis === 'beranda') return false
    if (masukan.jenis === 'statis') return Boolean(masukan.noindex)
    return Boolean(masukan.doc.seo?.noindex)
  }

  export type GambarOg = { url: string; width: number; height: number; alt: string }

  function dariMedia(media: MediaSeo | null, situs: Situs, alt: string): GambarOg | null {
    if (!media?.publicId) return null
    return {
      url: bangunUrl(situs.cloudName, media.publicId, media.jenis === 'video' ? 'poster' : 'og'),
      ...UKURAN_OG,
      alt: media.alt || alt,
    }
  }

  /**
   * Gambar OG: unggahan editor di grup SEO, lalu (untuk dokumen tanpa pilar) gambar OG default situs,
   * lalu gambar teks otomatis Cloudinary dengan warna pilar (hijau bila tanpa pilar).
   */
  export function gambarOgDokumen(masukan: MasukanSeo, situs: Situs): GambarOg {
    const judul = judulDokumen(masukan, situs)
    const unggahan = masukan.jenis === 'beranda' || masukan.jenis === 'statis' ? null : ambil(masukan.doc.seo?.gambarOG ?? null)
    const warna = warnaDokumen(masukan)
    return (
      dariMedia(unggahan, situs, judul) ??
      (warna ? null : dariMedia(ambil(situs.gambarOgDefault ?? null), situs, judul)) ?? {
        url: urlOg(situs.cloudName, { judul, warna: warna ?? 'hijau' }),
        ...UKURAN_OG,
        alt: judul,
      }
    )
  }
  ```

- [ ] **Langkah 5: Tulis `metadata()` dan indeks modul**

  `src/modules/seo/metadata.ts`

  ```ts
  import type { Metadata } from 'next'

  import { pathFor } from '@/lib/paths'

  import {
    ambil,
    deskripsiDokumen,
    gambarOgDokumen,
    judulSeo,
    noindexDokumen,
    pathDokumen,
    urlAbsolut,
  } from './dokumen'
  import type { MasukanSeo, PengaturanSitus, Situs } from './tipe'

  /** Path RSS, dirujuk dari beranda lewat `<link rel="alternate" type="application/rss+xml">`. */
  export const PATH_FEED = '/feed.xml'

  /** Canonical: isian editor bila ada, selain itu URL absolut dokumen sendiri. */
  export function canonicalDokumen(masukan: MasukanSeo, situs: Pick<PengaturanSitus, 'urlSitus'>): string {
    const isian = masukan.jenis === 'beranda' || masukan.jenis === 'statis' ? null : masukan.doc.seo?.canonical?.trim()
    return isian || urlAbsolut(situs, pathDokumen(masukan))
  }

  function openGraph(masukan: MasukanSeo, situs: PengaturanSitus, dasar: NonNullable<Metadata['openGraph']>): Metadata['openGraph'] {
    if (masukan.jenis === 'artikel') {
      const { doc } = masukan
      const penulis = ambil(doc.penulis)
      const pilar = ambil(doc.pilar)
      return {
        ...dasar,
        type: 'article',
        publishedTime: doc.terbitPada ?? undefined,
        modifiedTime: doc.diperbaruiBesar ?? doc.terbitPada ?? undefined,
        authors: penulis?.slug ? [urlAbsolut(situs, pathFor({ jenis: 'penulis', slug: penulis.slug }))] : undefined,
        section: pilar?.nama,
      }
    }
    if (masukan.jenis === 'penulis') return { ...dasar, type: 'profile' }
    if (masukan.jenis === 'video') return { ...dasar, type: 'video.other' }
    return { ...dasar, type: 'website' }
  }

  /**
   * `Metadata` Next.js untuk satu halaman. Dipanggil `generateMetadata` halaman publik (Rencana 4)
   * dengan dokumen yang sudah di-populate (depth 1) dan pengaturan situs dari `ambilSitus()`.
   */
  export function metadata(masukan: MasukanSeo, situs: Situs): Metadata {
    const judul = judulSeo(masukan, situs)
    const deskripsi = deskripsiDokumen(masukan, situs)
    const canonical = canonicalDokumen(masukan, situs)
    const gambar = gambarOgDokumen(masukan, situs)
    const noindex = noindexDokumen(masukan)

    const hasil: Metadata = {
      metadataBase: new URL(situs.urlSitus),
      title: { absolute: judul },
      description: deskripsi,
      alternates: { canonical },
      robots: noindex
        ? { index: false, follow: true }
        : { index: true, follow: true, 'max-image-preview': 'large' },
      openGraph: openGraph(masukan, situs, {
        title: judul,
        description: deskripsi,
        url: canonical,
        siteName: situs.namaSitus,
        locale: 'id_ID',
        images: [gambar],
      }),
      twitter: { card: 'summary_large_image', title: judul, description: deskripsi, images: [gambar.url] },
    }

    if (masukan.jenis === 'beranda') {
      hasil.alternates = { canonical, types: { 'application/rss+xml': urlAbsolut(situs, PATH_FEED) } }
      const google = situs.verifikasi?.google?.trim()
      const bing = situs.verifikasi?.bing?.trim()
      if (google || bing) {
        hasil.verification = { ...(google ? { google } : {}), ...(bing ? { other: { 'msvalidate.01': bing } } : {}) }
      }
    }
    return hasil
  }
  ```

  `src/modules/seo/index.ts`

  ```ts
  /**
   * Modul SEO (spesifikasi §5): antarmuka kecil, fungsi murni.
   * - `metadata(masukan, situs)` untuk `generateMetadata` halaman publik.
   */
  export { metadata, canonicalDokumen, PATH_FEED } from './metadata'
  export { judulSeo, deskripsiDokumen, gambarOgDokumen, pathDokumen, urlAbsolut } from './dokumen'
  export type * from './tipe'
  ```

- [ ] **Langkah 6: Jalankan tes, type check, lint**

  Jalankan:

  ```bash
  npm run test:unit
  npm run typecheck
  npm run lint
  ```

  Hasil yang diharapkan: unit `Test Files 19 passed (19)`, `Tests 131 passed (131)`; type check dan lint tanpa error.

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/modules/seo/tipe.ts src/modules/seo/dokumen.ts src/modules/seo/metadata.ts src/modules/seo/index.ts \
    tests/unit/seo-contoh.ts tests/unit/seo-metadata.test.ts
  git commit -m "feat(seo): metadata Next.js (judul, meta, canonical, robots, Open Graph, kartu X)"
  ```


### Task 3: `jsonLd()` untuk semua tipe schema

**Files:**
- Create: `src/modules/seo/jsonld.ts`
- Modify: `src/modules/seo/index.ts`
- Test: `tests/unit/seo-jsonld.test.ts`

**Interfaces:**
- Consumes: `ambil`, `deskripsiDokumen`, `pathDokumen`, `urlAbsolut` (Task 2), `canonicalDokumen` (Task 2), `pathFor`, `bangunUrl`, `ToolId`.
- Produces:
  - `type NodeJsonLd`, `type JsonLd = { '@context': 'https://schema.org'; '@graph': NodeJsonLd[] }`, `type RemahRoti = { nama; path }`.
  - `jsonLd(masukan: MasukanSeo, situs: Situs): JsonLd` (spesifikasi §5 `jsonLd(doc)`).
  - `remahRoti(masukan): RemahRoti[]` (Rencana 4 merender breadcrumb tampil dari fungsi yang sama, jadi tampilan dan schema selalu cocok).
  - `tipeSchemaArtikel(doc): 'Article' | 'NewsArticle'`, `durasiIso(detik)`, `serialisasiJsonLd(data): string`.

Setiap halaman mendapat satu `@graph`: `Organization` (dengan logo dan `sameAs` dari pengaturan SEO) dan `WebSite` selalu ada, lalu node utama dan `BreadcrumbList`. Node saling merujuk lewat `@id` (`https://point.lat/#organisasi`, `https://point.lat/#situs`, `/penulis/{slug}#orang`).

| Halaman | Node utama | Catatan |
|---|---|---|
| Artikel | `Article`, atau `NewsArticle` bila `tipeSchema` otomatis dan tipe `explainer` | `headline`, `image` tiga rasio (16:9, 4:3, 1:1, lebar 1200) sesuai panduan Google, `datePublished`, `dateModified = diperbaruiBesar ?? terbitPada`, `author` Person dengan `url`, `publisher` Organization |
| Tools | `WebApplication` | `offers.price: 0`, `isAccessibleForFree`, `applicationCategory` per kalkulator. Tanpa rating: Google mensyaratkan `aggregateRating`/`review` untuk rich result aplikasi, dan rating palsu melanggar pedoman. Schema tetap berguna untuk pemahaman halaman. |
| Video | `VideoObject` | `name`, `thumbnailUrl`, `uploadDate` (wajib Google), `duration` ISO 8601, `contentUrl` MP4, `transcript`. Koleksi video tidak punya tanggal terbit, jadi `uploadDate` = `createdAt`. |
| Penulis | `ProfilePage` dengan `mainEntity` `Person` | `knowsAbout` dari keahlian, `sameAs` dari tautan |
| Beranda | (tidak ada) | hanya Organization + WebSite |

FAQ tetap ditulis sebagai isi, tetapi `FAQPage` dan `HowTo` tidak dibuat (spesifikasi §8). `serialisasiJsonLd` meng-escape `<` supaya judul atau transkrip tidak bisa menutup tag `<script>`.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/seo-jsonld.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { durasiIso, jsonLd, remahRoti, serialisasiJsonLd, tipeSchemaArtikel } from '@/modules/seo/jsonld'

  import { artikel, penulis, pilarUang, situs } from './seo-contoh'

  const GAMBAR = 'https://res.cloudinary.com/demo/image/upload'

  describe('jsonLd artikel', () => {
    it('graf lengkap: Organization, WebSite, Article, BreadcrumbList', () => {
      expect(jsonLd({ jenis: 'artikel', doc: artikel }, situs)).toEqual({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': 'https://point.lat/#organisasi',
            name: 'point.lat',
            url: 'https://point.lat/',
            logo: { '@type': 'ImageObject', url: `${GAMBAR}/f_auto,q_auto/point/gambar/logo`, width: 512, height: 512 },
            sameAs: ['https://www.instagram.com/point.lat'],
          },
          {
            '@type': 'WebSite',
            '@id': 'https://point.lat/#situs',
            url: 'https://point.lat/',
            name: 'point.',
            alternateName: 'point.lat',
            inLanguage: 'id-ID',
            publisher: { '@id': 'https://point.lat/#organisasi' },
          },
          {
            '@type': 'Article',
            '@id': 'https://point.lat/cara-hitung-gaji-bersih#artikel',
            headline: 'Cara hitung gaji bersih',
            description:
              'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS. Begini cara menghitungnya langkah demi langkah, lengkap dengan contoh untuk karyawan tetap...',
            url: 'https://point.lat/cara-hitung-gaji-bersih',
            mainEntityOfPage: 'https://point.lat/cara-hitung-gaji-bersih',
            inLanguage: 'id-ID',
            image: [
              `${GAMBAR}/c_fill,g_auto,ar_16:9/c_limit,w_1200,f_auto,q_auto/point/gambar/slip-gaji-1a2b3c4d`,
              `${GAMBAR}/c_fill,g_auto,ar_4:3/c_limit,w_1200,f_auto,q_auto/point/gambar/slip-gaji-1a2b3c4d`,
              `${GAMBAR}/c_fill,g_auto,ar_1:1/c_limit,w_1200,f_auto,q_auto/point/gambar/slip-gaji-1a2b3c4d`,
            ],
            datePublished: '2026-11-02T03:00:00.000Z',
            dateModified: '2026-11-02T03:00:00.000Z',
            author: [
              {
                '@type': 'Person',
                '@id': 'https://point.lat/penulis/rani-wulandari#orang',
                name: 'Rani Wulandari',
                url: 'https://point.lat/penulis/rani-wulandari',
              },
            ],
            publisher: { '@id': 'https://point.lat/#organisasi' },
            isPartOf: { '@id': 'https://point.lat/#situs' },
            articleSection: 'Uang & Karier',
          },
          {
            '@type': 'BreadcrumbList',
            '@id': 'https://point.lat/cara-hitung-gaji-bersih#remah',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Beranda', item: 'https://point.lat/' },
              { '@type': 'ListItem', position: 2, name: 'Uang & Karier', item: 'https://point.lat/uang-karier' },
              { '@type': 'ListItem', position: 3, name: 'Pajak', item: 'https://point.lat/uang-karier/pajak' },
              { '@type': 'ListItem', position: 4, name: 'Cara hitung gaji bersih', item: 'https://point.lat/cara-hitung-gaji-bersih' },
            ],
          },
        ],
      })
    })

    it('explainer otomatis NewsArticle; editor bisa memaksa tipe schema', () => {
      expect(tipeSchemaArtikel({ tipe: 'explainer', seo: { tipeSchema: 'otomatis' } })).toBe('NewsArticle')
      expect(tipeSchemaArtikel({ tipe: 'panduan', seo: null })).toBe('Article')
      expect(tipeSchemaArtikel({ tipe: 'explainer', seo: { tipeSchema: 'Article' } })).toBe('Article')
      expect(tipeSchemaArtikel({ tipe: 'daftar', seo: { tipeSchema: 'NewsArticle' } })).toBe('NewsArticle')
    })

    it('dateModified memakai diperbaruiBesar', () => {
      const graf = jsonLd({ jenis: 'artikel', doc: { ...artikel, diperbaruiBesar: '2026-11-04T01:00:00.000Z' } }, situs)['@graph']
      expect(graf[2]).toMatchObject({ datePublished: '2026-11-02T03:00:00.000Z', dateModified: '2026-11-04T01:00:00.000Z' })
    })

    it('tidak membuat FAQPage atau HowTo', () => {
      const tipe = jsonLd({ jenis: 'artikel', doc: artikel }, situs)['@graph'].map((n) => n['@type'])
      expect(tipe).not.toContain('FAQPage')
      expect(tipe).not.toContain('HowTo')
    })
  })

  describe('jsonLd jenis lain', () => {
    it('tools: WebApplication gratis tanpa rating palsu', () => {
      const graf = jsonLd(
        { jenis: 'tools', doc: { nama: 'Kalkulator BMI', slug: 'bmi', toolId: 'bmi-kalori', ringkasan: 'Hitung BMI.', pilar: pilarUang } },
        situs,
      )['@graph']
      expect(graf[2]).toEqual({
        '@type': 'WebApplication',
        '@id': 'https://point.lat/tools/bmi#aplikasi',
        name: 'Kalkulator BMI',
        url: 'https://point.lat/tools/bmi',
        description: 'Hitung BMI.',
        applicationCategory: 'HealthApplication',
        operatingSystem: 'Semua',
        browserRequirements: 'Membutuhkan JavaScript',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: 0 },
        inLanguage: 'id-ID',
        publisher: { '@id': 'https://point.lat/#organisasi' },
      })
      expect(graf[3]['itemListElement']).toHaveLength(3)
    })

    it('video: VideoObject dengan poster, durasi ISO 8601, dan MP4', () => {
      const graf = jsonLd(
        {
          jenis: 'video',
          doc: {
            judul: 'PPh 21 dalam 45 detik',
            slug: 'pph-21',
            transkrip: 'PPh 21 dipotong pemberi kerja.',
            durasiDetik: 45,
            file: { publicId: 'point/video/pph-21-aa11bb22', jenis: 'video', durasi: 44.8 },
            pilar: pilarUang,
            createdAt: '2026-11-01T02:00:00.000Z',
          },
        },
        situs,
      )['@graph']
      expect(graf[2]).toEqual({
        '@type': 'VideoObject',
        '@id': 'https://point.lat/video/pph-21#video',
        name: 'PPh 21 dalam 45 detik',
        description: 'PPh 21 dipotong pemberi kerja.',
        thumbnailUrl: ['https://res.cloudinary.com/demo/video/upload/so_auto/q_auto/point/video/pph-21-aa11bb22.jpg'],
        uploadDate: '2026-11-01T02:00:00.000Z',
        duration: 'PT45S',
        contentUrl: 'https://res.cloudinary.com/demo/video/upload/q_auto/point/video/pph-21-aa11bb22.mp4',
        transcript: 'PPh 21 dipotong pemberi kerja.',
        inLanguage: 'id-ID',
        publisher: { '@id': 'https://point.lat/#organisasi' },
      })
    })

    it('penulis: ProfilePage dengan Person', () => {
      const graf = jsonLd({ jenis: 'penulis', doc: penulis }, situs)['@graph']
      expect(graf[2]).toEqual({
        '@type': 'ProfilePage',
        '@id': 'https://point.lat/penulis/rani-wulandari',
        url: 'https://point.lat/penulis/rani-wulandari',
        inLanguage: 'id-ID',
        mainEntity: {
          '@type': 'Person',
          '@id': 'https://point.lat/penulis/rani-wulandari#orang',
          name: 'Rani Wulandari',
          url: 'https://point.lat/penulis/rani-wulandari',
          description: 'Menulis soal pajak dan gaji.',
          knowsAbout: ['Pajak penghasilan'],
          sameAs: ['https://www.linkedin.com/in/rani'],
          worksFor: { '@id': 'https://point.lat/#organisasi' },
        },
      })
    })

    it('beranda hanya Organization dan WebSite; logo opsional', () => {
      const graf = jsonLd({ jenis: 'beranda' }, { ...situs, organisasi: null })['@graph']
      expect(graf.map((n) => n['@type'])).toEqual(['Organization', 'WebSite'])
      expect(graf[0]).toEqual({ '@type': 'Organization', '@id': 'https://point.lat/#organisasi', name: 'point.', url: 'https://point.lat/' })
    })
  })

  describe('remahRoti', () => {
    it('glosarium, halaman, dan statis', () => {
      expect(remahRoti({ jenis: 'artikel', doc: { ...artikel, tipe: 'glosarium', slug: 'ptkp', judul: 'PTKP' } })).toEqual([
        { nama: 'Beranda', path: '/' },
        { nama: 'Glosarium', path: '/glosarium' },
        { nama: 'PTKP', path: '/glosarium/ptkp' },
      ])
      expect(remahRoti({ jenis: 'halaman', doc: { judul: 'Tentang', slug: 'tentang' } })).toEqual([
        { nama: 'Beranda', path: '/' },
        { nama: 'Tentang', path: '/tentang' },
      ])
      expect(remahRoti({ jenis: 'beranda' })).toEqual([])
    })

    it('artikel tanpa subkategori: beranda, pilar, artikel', () => {
      expect(remahRoti({ jenis: 'artikel', doc: { ...artikel, subkategori: null } }).map((r) => r.path)).toEqual([
        '/',
        '/uang-karier',
        '/cara-hitung-gaji-bersih',
      ])
    })
  })

  describe('utilitas', () => {
    it('durasiIso', () => {
      expect(durasiIso(45)).toBe('PT45S')
      expect(durasiIso(65)).toBe('PT1M5S')
      expect(durasiIso(120)).toBe('PT2M')
      expect(durasiIso(0)).toBe('PT0S')
    })

    it('serialisasiJsonLd meng-escape < supaya tidak bisa menutup tag script', () => {
      const teks = serialisasiJsonLd({
        '@context': 'https://schema.org',
        '@graph': [{ '@type': 'Thing', name: '</script><script>alert(1)</script>' }],
      })
      expect(teks).not.toContain('</script>')
      expect(JSON.parse(teks)['@graph'][0].name).toBe('</script><script>alert(1)</script>')
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/seo-jsonld.test.ts` dengan `Cannot find package '@/modules/seo/jsonld'`.

- [ ] **Langkah 3: Implementasi**

  `src/modules/seo/jsonld.ts`

  ```ts
  import type { ToolId } from '@/lib/konstanta'
  import { pathFor } from '@/lib/paths'
  import { bangunUrl } from '@/modules/media/url'

  import { ambil, deskripsiDokumen, pathDokumen, urlAbsolut } from './dokumen'
  import { canonicalDokumen } from './metadata'
  import type { ArtikelSeo, MasukanSeo, PenulisSeo, Situs, ToolsSeo, VideoSeo } from './tipe'

  /**
   * JSON-LD per halaman (spesifikasi §8): satu `@graph` berisi Organization dan WebSite (selalu),
   * node utama sesuai jenis, dan BreadcrumbList. FAQPage dan HowTo sengaja tidak dibuat karena rich
   * result-nya sudah dihapus Google. Tidak ada rating palsu untuk WebApplication.
   */

  export type NodeJsonLd = { '@type': string; '@id'?: string } & Record<string, unknown>
  export type JsonLd = { '@context': 'https://schema.org'; '@graph': NodeJsonLd[] }

  export type RemahRoti = { nama: string; path: string }

  const BAHASA = 'id-ID'

  const idOrganisasi = (situs: Situs) => urlAbsolut(situs, '/#organisasi')
  const idSitus = (situs: Situs) => urlAbsolut(situs, '/#situs')
  const idPenulis = (situs: Situs, slug: string) => `${urlAbsolut(situs, pathFor({ jenis: 'penulis', slug }))}#orang`

  /** Kategori Google untuk WebApplication per kalkulator. */
  const KATEGORI_TOOL: Record<ToolId, string> = {
    'gaji-bersih': 'FinanceApplication',
    thr: 'FinanceApplication',
    'cicilan-kpr': 'FinanceApplication',
    'dana-darurat': 'FinanceApplication',
    'bmi-kalori': 'HealthApplication',
    ipk: 'EducationalApplication',
  }

  /** Durasi ISO 8601 (`PT1M5S`) dari detik. */
  export function durasiIso(detik: number): string {
    const total = Math.max(0, Math.round(detik))
    const menit = Math.floor(total / 60)
    const sisa = total % 60
    return `PT${menit ? `${menit}M` : ''}${sisa || !menit ? `${sisa}S` : ''}`
  }

  /**
   * Remah roti dari beranda sampai dokumen. Dipakai untuk schema BreadcrumbList dan untuk tampilan
   * di halaman (Rencana 4), jadi keduanya selalu sama.
   */
  export function remahRoti(masukan: MasukanSeo): RemahRoti[] {
    const beranda: RemahRoti = { nama: 'Beranda', path: '/' }
    switch (masukan.jenis) {
      case 'beranda':
        return []
      case 'statis':
        return [beranda, { nama: masukan.judul, path: masukan.path }]
      case 'artikel': {
        const { doc } = masukan
        const sendiri = { nama: doc.judul, path: pathDokumen(masukan) }
        if (doc.tipe === 'glosarium') return [beranda, { nama: 'Glosarium', path: '/glosarium' }, sendiri]
        const pilar = ambil(doc.pilar)
        const sub = ambil(doc.subkategori)
        const hasil = [beranda]
        if (pilar?.slug) hasil.push({ nama: pilar.nama, path: pathFor({ jenis: 'pilar', slug: pilar.slug }) })
        if (pilar?.slug && sub?.slug) {
          hasil.push({ nama: sub.nama, path: pathFor({ jenis: 'subkategori', slug: sub.slug, pilarSlug: pilar.slug }) })
        }
        return [...hasil, sendiri]
      }
      case 'subkategori': {
        const pilar = ambil(masukan.doc.pilar)
        const atas = pilar?.slug ? [{ nama: pilar.nama, path: pathFor({ jenis: 'pilar', slug: pilar.slug }) }] : []
        return [beranda, ...atas, { nama: masukan.doc.nama, path: pathDokumen(masukan) }]
      }
      case 'tools':
        return [beranda, { nama: 'Tools', path: '/tools' }, { nama: masukan.doc.nama, path: pathDokumen(masukan) }]
      case 'video':
        return [beranda, { nama: 'Video', path: '/video' }, { nama: masukan.doc.judul, path: pathDokumen(masukan) }]
      case 'pilar':
      case 'penulis':
        return [beranda, { nama: masukan.doc.nama, path: pathDokumen(masukan) }]
      case 'halaman':
        return [beranda, { nama: masukan.doc.judul, path: pathDokumen(masukan) }]
    }
  }

  function organisasi(situs: Situs): NodeJsonLd {
    const logo = ambil(situs.organisasi?.logo ?? null)
    const sameAs = situs.organisasi?.sameAs?.filter(Boolean) ?? []
    return {
      '@type': 'Organization',
      '@id': idOrganisasi(situs),
      name: situs.organisasi?.nama || situs.namaSitus,
      url: urlAbsolut(situs, '/'),
      ...(logo?.publicId
        ? {
            logo: {
              '@type': 'ImageObject',
              url: bangunUrl(situs.cloudName, logo.publicId),
              ...(logo.width ? { width: logo.width } : {}),
              ...(logo.height ? { height: logo.height } : {}),
            },
          }
        : {}),
      ...(sameAs.length ? { sameAs } : {}),
    }
  }

  function situsWeb(situs: Situs): NodeJsonLd {
    return {
      '@type': 'WebSite',
      '@id': idSitus(situs),
      url: urlAbsolut(situs, '/'),
      name: situs.namaSitus,
      ...(situs.organisasi?.nama && situs.organisasi.nama !== situs.namaSitus ? { alternateName: situs.organisasi.nama } : {}),
      inLanguage: BAHASA,
      publisher: { '@id': idOrganisasi(situs) },
    }
  }

  function orang(penulis: PenulisSeo, situs: Situs): NodeJsonLd {
    const foto = ambil(penulis.foto ?? null)
    const sameAs = penulis.tautan?.map((t) => t.url).filter(Boolean) ?? []
    return {
      '@type': 'Person',
      '@id': idPenulis(situs, penulis.slug ?? ''),
      name: penulis.nama,
      url: urlAbsolut(situs, pathFor({ jenis: 'penulis', slug: penulis.slug ?? '' })),
      ...(penulis.bio ? { description: penulis.bio } : {}),
      ...(foto?.publicId ? { image: bangunUrl(situs.cloudName, foto.publicId, 'thumbnail', { lebar: 400 }) } : {}),
      ...(penulis.keahlian?.length ? { knowsAbout: penulis.keahlian } : {}),
      ...(sameAs.length ? { sameAs } : {}),
      worksFor: { '@id': idOrganisasi(situs) },
    }
  }

  /** Explainer otomatis menjadi NewsArticle; tipe lain Article. Editor bisa memaksa lewat `tipeSchema`. */
  export function tipeSchemaArtikel(doc: Pick<ArtikelSeo, 'tipe' | 'seo'>): 'Article' | 'NewsArticle' {
    const pilihan = doc.seo?.tipeSchema
    if (pilihan === 'Article' || pilihan === 'NewsArticle') return pilihan
    return doc.tipe === 'explainer' ? 'NewsArticle' : 'Article'
  }

  function nodeArtikel(doc: ArtikelSeo, masukan: MasukanSeo, situs: Situs): NodeJsonLd[] {
    const url = canonicalDokumen(masukan, situs)
    const gambar = ambil(doc.gambarUtama ?? null)
    const penulis = ambil(doc.penulis)
    const pilar = ambil(doc.pilar)
    const terbit = doc.terbitPada ?? undefined
    const artikel: NodeJsonLd = {
      '@type': tipeSchemaArtikel(doc),
      '@id': `${url}#artikel`,
      headline: doc.judul,
      description: deskripsiDokumen(masukan, situs),
      url,
      mainEntityOfPage: url,
      inLanguage: BAHASA,
      ...(gambar?.publicId
        ? {
            // Google meminta beberapa rasio (16x9, 4x3, 1x1) dengan resolusi tinggi.
            image: (['hero', 'kartu', 'thumbnail'] as const).map((preset) =>
              bangunUrl(situs.cloudName, gambar.publicId as string, preset, { lebar: 1200 }),
            ),
          }
        : {}),
      ...(terbit ? { datePublished: terbit, dateModified: doc.diperbaruiBesar ?? terbit } : {}),
      ...(penulis?.slug
        ? {
            author: [
              {
                '@type': 'Person',
                '@id': idPenulis(situs, penulis.slug),
                name: penulis.nama,
                url: urlAbsolut(situs, pathFor({ jenis: 'penulis', slug: penulis.slug })),
              },
            ],
          }
        : {}),
      publisher: { '@id': idOrganisasi(situs) },
      isPartOf: { '@id': idSitus(situs) },
      ...(pilar?.nama ? { articleSection: pilar.nama } : {}),
    }
    return [artikel]
  }

  function nodeTools(doc: ToolsSeo, masukan: MasukanSeo, situs: Situs): NodeJsonLd[] {
    return [
      {
        '@type': 'WebApplication',
        '@id': `${canonicalDokumen(masukan, situs)}#aplikasi`,
        name: doc.nama,
        url: canonicalDokumen(masukan, situs),
        description: deskripsiDokumen(masukan, situs),
        applicationCategory: KATEGORI_TOOL[doc.toolId],
        operatingSystem: 'Semua',
        browserRequirements: 'Membutuhkan JavaScript',
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: 0 },
        inLanguage: BAHASA,
        publisher: { '@id': idOrganisasi(situs) },
      },
    ]
  }

  function nodeVideo(doc: VideoSeo, masukan: MasukanSeo, situs: Situs): NodeJsonLd[] {
    const file = ambil(doc.file ?? null)
    const poster = ambil(doc.poster ?? null)
    const durasi = doc.durasiDetik ?? file?.durasi
    const thumbnail = poster?.publicId
      ? bangunUrl(situs.cloudName, poster.publicId, 'og')
      : file?.publicId
        ? bangunUrl(situs.cloudName, file.publicId, 'poster')
        : undefined
    return [
      {
        '@type': 'VideoObject',
        '@id': `${canonicalDokumen(masukan, situs)}#video`,
        name: doc.judul,
        description: deskripsiDokumen(masukan, situs),
        ...(thumbnail ? { thumbnailUrl: [thumbnail] } : {}),
        // Koleksi video tidak punya tanggal terbit sendiri: tanggal dokumen dibuat dipakai sebagai tanggal unggah.
        ...(doc.createdAt ? { uploadDate: doc.createdAt } : {}),
        ...(durasi ? { duration: durasiIso(durasi) } : {}),
        ...(file?.publicId ? { contentUrl: bangunUrl(situs.cloudName, file.publicId, 'mp4') } : {}),
        ...(doc.transkrip ? { transcript: doc.transkrip } : {}),
        inLanguage: BAHASA,
        publisher: { '@id': idOrganisasi(situs) },
      },
    ]
  }

  function nodeRemahRoti(masukan: MasukanSeo, situs: Situs): NodeJsonLd[] {
    const remah = remahRoti(masukan)
    if (remah.length < 2) return []
    return [
      {
        '@type': 'BreadcrumbList',
        '@id': `${urlAbsolut(situs, pathDokumen(masukan))}#remah`,
        itemListElement: remah.map((r, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: r.nama,
          item: urlAbsolut(situs, r.path),
        })),
      },
    ]
  }

  /** JSON-LD satu halaman. Hasilnya dirender Rencana 4 lewat `serialisasiJsonLd` di `<script type="application/ld+json">`. */
  export function jsonLd(masukan: MasukanSeo, situs: Situs): JsonLd {
    const utama: NodeJsonLd[] = (() => {
      switch (masukan.jenis) {
        case 'artikel':
          return nodeArtikel(masukan.doc, masukan, situs)
        case 'tools':
          return nodeTools(masukan.doc, masukan, situs)
        case 'video':
          return nodeVideo(masukan.doc, masukan, situs)
        case 'penulis': {
          const url = canonicalDokumen(masukan, situs)
          return [{ '@type': 'ProfilePage', '@id': url, url, inLanguage: BAHASA, mainEntity: orang(masukan.doc, situs) }]
        }
        default:
          return []
      }
    })()
    return {
      '@context': 'https://schema.org',
      '@graph': [organisasi(situs), situsWeb(situs), ...utama, ...nodeRemahRoti(masukan, situs)],
    }
  }

  /** JSON aman untuk `<script>`: `<` di-escape supaya isi dokumen tidak bisa menutup tag skrip. */
  export function serialisasiJsonLd(data: JsonLd): string {
    return JSON.stringify(data).replace(/</g, '\\u003c')
  }
  ```

  Perbarui `src/modules/seo/index.ts`:

  ```diff
  diff --git a/src/modules/seo/index.ts b/src/modules/seo/index.ts
  index 443c80c..b0d6016 100644
  --- a/src/modules/seo/index.ts
  +++ b/src/modules/seo/index.ts
  @@ -1,7 +1,10 @@
   /**
    * Modul SEO (spesifikasi §5): antarmuka kecil, fungsi murni.
    * - `metadata(masukan, situs)` untuk `generateMetadata` halaman publik.
  + * - `jsonLd(masukan, situs)` untuk `<script type="application/ld+json">` (pakai `serialisasiJsonLd`).
    */
   export { metadata, canonicalDokumen, PATH_FEED } from './metadata'
  +export { jsonLd, remahRoti, serialisasiJsonLd, tipeSchemaArtikel } from './jsonld'
  +export type { JsonLd, NodeJsonLd, RemahRoti } from './jsonld'
   export { judulSeo, deskripsiDokumen, gambarOgDokumen, pathDokumen, urlAbsolut } from './dokumen'
   export type * from './tipe'
  ```

- [ ] **Langkah 4: Jalankan tes, type check, lint**

  Jalankan:

  ```bash
  npm run test:unit
  npm run typecheck
  npm run lint
  ```

  Hasil yang diharapkan: unit `Test Files 20 passed (20)`, `Tests 143 passed (143)`; type check dan lint tanpa error.

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/modules/seo/jsonld.ts src/modules/seo/index.ts tests/unit/seo-jsonld.test.ts
  git commit -m "feat(seo): JSON-LD Article/NewsArticle, BreadcrumbList, Organization, Person, VideoObject, WebSite, WebApplication"
  ```


### Task 4: `analisis()` untuk checklist panel SEO

**Files:**
- Create: `src/modules/seo/analisis.ts`
- Modify: `src/modules/seo/index.ts`
- Test: `tests/unit/seo-analisis.test.ts`

**Interfaces:**
- Consumes: `teksIsi`, `judulBagian`, `tautanIsi`, `gambarIsi`, `IsiDokumen` (Task 1), `hitungKata`, `mengandungFrasa`, `normalisasi`, `rataPanjangKalimat` (Task 1), `ambil`, `GrupSeo`, `MediaSeo`, `Relasi` (Task 2), `LEBAR_MINIMAL_GAMBAR_UTAMA` (`src/lib/media.ts`).
- Produces:
  - `type StatusCek = 'hijau' | 'kuning'`, `type IdCek` (12 id), `type Cek = { id; label; status; pesan }`.
  - `type ArtikelAnalisis` (judul, slug, intinya, isi, sumber, gambarUtama, seo; semua opsional supaya draf kosong bisa dianalisis).
  - `BATAS` (rentang judul 50-60, meta 150-160, link internal 3-5, sumber 2-3, 100 kata pembuka, rata-rata kalimat 20 kata).
  - `analisis(doc: ArtikelAnalisis, opsi: { urlSitus: string }): Cek[]` (spesifikasi §5 `analisis(doc) → daftar cek`), `skor(cek): { hijau; total }`.

Urutan dan isi cek mengikuti spesifikasi §8 butir 2. Semua cek hanya hijau atau kuning dan tidak memblokir terbit; aturan yang memblokir (Intinya 2-4 poin, alt, lebar gambar utama) sudah divalidasi koleksi di Rencana 1. Pesan memberi angka dan langkah perbaikan, tanpa em dash, en dash, dan tanda seru (dikunci tes).

| Cek | Hijau bila |
|---|---|
| `judul-seo` | judul SEO (atau judul artikel bila kosong) 50-60 karakter |
| `meta` | meta description 150-160 karakter |
| `keyphrase-h1`, `keyphrase-slug`, `keyphrase-pembuka` | keyphrase utama muncul utuh (tanpa peduli huruf besar dan tanda baca) di judul, slug, dan 100 kata pertama isi |
| `hierarki` | ada subjudul, tidak ada H1 di isi, dan level tidak melompat (H2 ke H4, atau langsung H3) |
| `intinya` | 2-4 poin terisi |
| `link-internal` | 3-5 link internal di isi |
| `sumber-eksternal` | minimal 2 URL unik dari blok sumber dan link keluar di isi |
| `alt-gambar` | gambar utama dan gambar di isi punya alt (gambar yang belum terbaca dilaporkan kuning) |
| `panjang-kalimat` | rata-rata maksimal 20 kata per kalimat |
| `gambar-utama` | lebar minimal 1200px |

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/seo-analisis.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { analisis, skor, type ArtikelAnalisis, type Cek } from '@/modules/seo/analisis'

  import { gambarUtama, h, isiLexical, kalimatPanjang, p, tautan, tautanInternal, unggahan } from './seo-contoh'

  const OPSI = { urlSitus: 'https://point.lat' }

  /** Artikel yang lolos semua cek. Tes lain mengubah satu bagian saja. */
  const lengkap: ArtikelAnalisis = {
    judul: 'Cara hitung gaji bersih karyawan tetap 2026',
    slug: 'cara-hitung-gaji-bersih',
    intinya: [{ poin: 'Gaji bersih = gaji kotor dikurangi PPh 21 dan BPJS.' }, { poin: 'Tarif PPh 21 memakai TER.' }],
    gambarUtama,
    sumber: [{ url: 'https://pajak.go.id/pph21' }, { url: 'https://bpjs-kesehatan.go.id/iuran' }],
    seo: {
      keyphrase: 'gaji bersih',
      judulSEO: 'Cara hitung gaji bersih 2026: potongan PPh 21 TER dan BPJS',
      metaDeskripsi:
        'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS. Pelajari rumus TER 2026, contoh hitungan, dan kalkulator gratis untuk karyawan tetap di sini.',
    },
    isi: isiLexical([
      p('Gaji bersih adalah uang yang benar-benar kamu terima. Hitungannya sederhana.'),
      h('h2', 'Rumus gaji bersih'),
      p('Kurangi gaji kotor dengan ', tautanInternal(11, 'PPh 21'), ' dan ', tautan('/glosarium/bpjs', 'BPJS'), '.'),
      h('h3', 'Contoh'),
      unggahan({ id: 8, alt: 'Tabel contoh', width: 1400 }),
      p('Lihat ', tautan('https://point.lat/tools/gaji-bersih', 'kalkulator'), ' dan ', tautan('https://kemnaker.go.id', 'Kemnaker'), '.'),
      h('h2', 'Kesalahan umum'),
      p('Jangan lupa iuran pensiun.'),
    ]),
  }

  const cari = (hasil: Cek[], id: Cek['id']) => hasil.find((c) => c.id === id) as Cek

  describe('analisis (checklist panel SEO)', () => {
    it('artikel lengkap: semua hijau, urutan sesuai spesifikasi', () => {
      const hasil = analisis(lengkap, OPSI)
      expect(hasil.map((c) => c.id)).toEqual([
        'judul-seo',
        'meta',
        'keyphrase-h1',
        'keyphrase-slug',
        'keyphrase-pembuka',
        'hierarki',
        'intinya',
        'link-internal',
        'sumber-eksternal',
        'alt-gambar',
        'panjang-kalimat',
        'gambar-utama',
      ])
      expect(hasil.filter((c) => c.status === 'kuning')).toEqual([])
      expect(skor(hasil)).toEqual({ hijau: 12, total: 12 })
    })

    it('pesan hijau menyebut angka', () => {
      const hasil = analisis(lengkap, OPSI)
      expect(cari(hasil, 'judul-seo').pesan).toBe('58 karakter. Pas.')
      expect(cari(hasil, 'meta').pesan).toBe('156 karakter. Pas.')
      expect(cari(hasil, 'link-internal').pesan).toBe('3 link internal.')
      expect(cari(hasil, 'sumber-eksternal').pesan).toBe('3 sumber eksternal.')
      expect(cari(hasil, 'alt-gambar').pesan).toBe('Semua 2 gambar punya alt.')
      expect(cari(hasil, 'gambar-utama').pesan).toBe('Lebar 1600px.')
    })

    it('judul SEO dan meta di luar rentang menjadi kuning, tidak memblokir', () => {
      const hasil = analisis({ ...lengkap, seo: { ...lengkap.seo, judulSEO: null, metaDeskripsi: 'Terlalu pendek.' } }, OPSI)
      expect(cari(hasil, 'judul-seo')).toMatchObject({
        status: 'kuning',
        pesan: '43 karakter (dari judul artikel). Tambah sampai 50-60 karakter.',
      })
      expect(cari(hasil, 'meta')).toMatchObject({ status: 'kuning', pesan: '15 karakter. Tambah sampai 150-160 karakter.' })

      const panjang = analisis({ ...lengkap, seo: { ...lengkap.seo, judulSEO: 'x'.repeat(61), metaDeskripsi: '' } }, OPSI)
      expect(cari(panjang, 'judul-seo').pesan).toBe('61 karakter. Pangkas ke 50-60 karakter supaya tidak terpotong di Google.')
      expect(cari(panjang, 'meta').pesan).toBe('Meta description masih kosong. Tulis 150-160 karakter yang menjawab pencarian.')
    })

    it('keyphrase belum ada di judul, slug, atau pembuka', () => {
      const hasil = analisis({ ...lengkap, judul: 'Cara hitung take home pay', slug: 'take-home-pay', isi: isiLexical([p('Pembuka tanpa frasanya.')]) }, OPSI)
      expect(cari(hasil, 'keyphrase-h1').pesan).toBe('"gaji bersih" belum ada di judul artikel.')
      expect(cari(hasil, 'keyphrase-slug').pesan).toBe('Slug belum memuat "gaji-bersih".')
      expect(cari(hasil, 'keyphrase-pembuka').pesan).toBe('Sebut "gaji bersih" di paragraf pembuka.')
    })

    it('keyphrase setelah 100 kata pertama tidak dihitung', () => {
      const isi = isiLexical([p(kalimatPanjang(100)), p('Baru sekarang gaji bersih disebut.')])
      expect(cari(analisis({ ...lengkap, isi }, OPSI), 'keyphrase-pembuka').status).toBe('kuning')
    })

    it('keyphrase kosong membuat tiga cek keyphrase kuning', () => {
      const hasil = analisis({ ...lengkap, seo: { ...lengkap.seo, keyphrase: '' } }, OPSI)
      expect(hasil.filter((c) => c.id.startsWith('keyphrase')).map((c) => c.pesan)).toEqual([
        'Isi keyphrase utama dulu.',
        'Isi keyphrase utama dulu.',
        'Isi keyphrase utama dulu.',
      ])
    })

    it('hierarki: loncat H2 ke H4, H1 di isi, atau tanpa subjudul', () => {
      const loncat = isiLexical([p('gaji bersih'), h('h2', 'Rumus'), h('h4', 'Detail')])
      expect(cari(analisis({ ...lengkap, isi: loncat }, OPSI), 'hierarki').pesan).toBe('"Detail" melompat dari H2 ke H4. Pakai H3.')
      const h1 = isiLexical([h('h1', 'Judul lagi')])
      expect(cari(analisis({ ...lengkap, isi: h1 }, OPSI), 'hierarki').pesan).toBe('"Judul lagi" memakai H1. Judul artikel sudah H1, pakai H2 di isi.')
      const h3dulu = isiLexical([h('h3', 'Langsung H3')])
      expect(cari(analisis({ ...lengkap, isi: h3dulu }, OPSI), 'hierarki').pesan).toBe('"Langsung H3" melompat dari H1 ke H3. Pakai H2.')
      expect(cari(analisis({ ...lengkap, isi: isiLexical([p('Tanpa subjudul.')]) }, OPSI), 'hierarki').pesan).toBe(
        'Belum ada subjudul. Pecah isi dengan H2 supaya mudah dipindai.',
      )
    })

    it('kotak Intinya kosong atau terlalu banyak', () => {
      expect(cari(analisis({ ...lengkap, intinya: [] }, OPSI), 'intinya').pesan).toBe('Isi 2-4 poin (sekarang 0).')
      expect(cari(analisis({ ...lengkap, intinya: [{ poin: 'satu' }, { poin: ' ' }] }, OPSI), 'intinya').status).toBe('kuning')
    })

    it('link internal kurang atau berlebih', () => {
      const sedikit = isiLexical([p('gaji bersih ', tautan('/a', 'a'))])
      expect(cari(analisis({ ...lengkap, isi: sedikit }, OPSI), 'link-internal').pesan).toBe(
        '1 link internal. Tambah sampai 3-5, lihat saran di bawah.',
      )
      const banyak = isiLexical([p(...['/a', '/b', '/c', '/d', '/e', '/f'].map((u) => tautan(u, u)))])
      expect(cari(analisis({ ...lengkap, isi: banyak }, OPSI), 'link-internal').pesan).toBe(
        '6 link internal. Cukup 3-5 yang paling relevan.',
      )
    })

    it('sumber eksternal: blok sumber dan link keluar digabung tanpa duplikat', () => {
      const satu = { ...lengkap, sumber: [{ url: 'https://pajak.go.id/pph21' }], isi: isiLexical([p(tautan('https://pajak.go.id/pph21', 'DJP'))]) }
      expect(cari(analisis(satu, OPSI), 'sumber-eksternal').pesan).toBe('1 sumber. Rujuk 2-3 sumber resmi atau tepercaya.')
      const empat = { ...lengkap, sumber: [{ url: 'https://a.id' }, { url: 'https://b.id' }, { url: 'https://c.id' }, { url: 'https://d.id' }] }
      expect(cari(analisis(empat, OPSI), 'sumber-eksternal').pesan).toBe('5 sumber eksternal, sudah lebih dari cukup.')
    })

    it('alt gambar kosong, atau gambar yang belum bisa diperiksa', () => {
      const tanpaAlt = isiLexical([unggahan({ id: 9, alt: '', width: 1300 })])
      expect(cari(analisis({ ...lengkap, isi: tanpaAlt }, OPSI), 'alt-gambar').pesan).toBe('1 gambar belum punya alt.')
      const belum = isiLexical([unggahan(9)])
      expect(cari(analisis({ ...lengkap, isi: belum }, OPSI), 'alt-gambar').pesan).toBe(
        '1 gambar belum bisa diperiksa. Simpan dulu lalu muat ulang.',
      )
    })

    it('kalimat terlalu panjang rata-ratanya', () => {
      const isi = isiLexical([p(`gaji bersih ${kalimatPanjang(30)}`)])
      expect(cari(analisis({ ...lengkap, isi }, OPSI), 'panjang-kalimat').pesan).toBe(
        '32 kata per kalimat. Pecah kalimat panjang, usahakan di bawah 20.',
      )
      expect(cari(analisis({ ...lengkap, isi: isiLexical([p('Satu dua tiga. Empat lima.')]) }, OPSI), 'panjang-kalimat').pesan).toBe(
        '2,5 kata per kalimat. Enak dibaca.',
      )
    })

    it('gambar utama kecil, belum dimuat, atau kosong', () => {
      expect(cari(analisis({ ...lengkap, gambarUtama: { ...gambarUtama, width: 1000 } }, OPSI), 'gambar-utama').pesan).toBe(
        'Lebar 1000px. Minimal 1200px supaya tampil besar di Google Discover.',
      )
      expect(cari(analisis({ ...lengkap, gambarUtama: 5 }, OPSI), 'gambar-utama').pesan).toBe(
        'Ukuran gambar belum terbaca. Simpan dulu lalu muat ulang.',
      )
      expect(cari(analisis({ ...lengkap, gambarUtama: null }, OPSI), 'gambar-utama').pesan).toBe('Belum ada gambar utama.')
    })

    it('draf kosong tidak melempar galat', () => {
      const hasil = analisis({}, OPSI)
      expect(hasil).toHaveLength(12)
      expect(skor(hasil).hijau).toBe(0)
    })

    it('pesan tanpa em dash, en dash, dan tanda seru', () => {
      const semua = [analisis(lengkap, OPSI), analisis({}, OPSI)].flat().map((c) => `${c.label} ${c.pesan}`)
      for (const pesan of semua) expect(pesan).not.toMatch(/[\u2013\u2014!]/)
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/seo-analisis.test.ts` dengan `Cannot find package '@/modules/seo/analisis'`.

- [ ] **Langkah 3: Implementasi**

  `src/modules/seo/analisis.ts`

  ```ts
  import { LEBAR_MINIMAL_GAMBAR_UTAMA } from '@/lib/media'

  import { ambil } from './dokumen'
  import { gambarIsi, judulBagian, tautanIsi, teksIsi, type IsiDokumen } from './lexical'
  import { hitungKata, mengandungFrasa, normalisasi, rataPanjangKalimat } from './teks'
  import type { GrupSeo, MediaSeo, Relasi } from './tipe'

  /**
   * Checklist panel SEO (spesifikasi §8). Hijau berarti sudah sesuai, kuning berarti perlu dilihat.
   * Tidak ada yang memblokir terbit: aturan wajib (Intinya, alt, lebar gambar) sudah divalidasi koleksi.
   */

  export type StatusCek = 'hijau' | 'kuning'

  export type IdCek =
    | 'judul-seo'
    | 'meta'
    | 'keyphrase-h1'
    | 'keyphrase-slug'
    | 'keyphrase-pembuka'
    | 'hierarki'
    | 'intinya'
    | 'link-internal'
    | 'sumber-eksternal'
    | 'alt-gambar'
    | 'panjang-kalimat'
    | 'gambar-utama'

  export type Cek = { id: IdCek; label: string; status: StatusCek; pesan: string }

  /** Data artikel yang dianalisis: dokumen tersimpan atau isian form admin yang belum disimpan. */
  export type ArtikelAnalisis = {
    judul?: string | null
    slug?: string | null
    intinya?: { poin?: string | null }[] | null
    isi?: IsiDokumen
    sumber?: { url?: string | null }[] | null
    gambarUtama?: Relasi<MediaSeo>
    seo?: GrupSeo | null
  }

  export const BATAS = {
    judulSeo: { min: 50, maks: 60 },
    meta: { min: 150, maks: 160 },
    linkInternal: { min: 3, maks: 5 },
    sumberEksternal: { min: 2, maks: 3 },
    kataPembuka: 100,
    /** Rata-rata kata per kalimat yang masih nyaman dibaca di layar HP. */
    rataKalimat: 20,
  } as const

  const hijau = (id: IdCek, label: string, pesan: string): Cek => ({ id, label, status: 'hijau', pesan })
  const kuning = (id: IdCek, label: string, pesan: string): Cek => ({ id, label, status: 'kuning', pesan })

  function cekRentang(id: IdCek, label: string, panjang: number, rentang: { min: number; maks: number }, sumber: string): Cek {
    const teks = `${panjang} karakter${sumber}`
    if (panjang >= rentang.min && panjang <= rentang.maks) return hijau(id, label, `${teks}. Pas.`)
    if (panjang < rentang.min) return kuning(id, label, `${teks}. Tambah sampai ${rentang.min}-${rentang.maks} karakter.`)
    return kuning(id, label, `${teks}. Pangkas ke ${rentang.min}-${rentang.maks} karakter supaya tidak terpotong di Google.`)
  }

  function cekJudulSeo(doc: ArtikelAnalisis): Cek {
    const isian = doc.seo?.judulSEO?.trim()
    const judul = isian || doc.judul?.trim() || ''
    return cekRentang('judul-seo', 'Panjang judul SEO', judul.length, BATAS.judulSeo, isian ? '' : ' (dari judul artikel)')
  }

  function cekMeta(doc: ArtikelAnalisis): Cek {
    const meta = doc.seo?.metaDeskripsi?.trim() ?? ''
    if (!meta) return kuning('meta', 'Panjang meta description', 'Meta description masih kosong. Tulis 150-160 karakter yang menjawab pencarian.')
    return cekRentang('meta', 'Panjang meta description', meta.length, BATAS.meta, '')
  }

  /** Kata pertama isi artikel (paragraf pertama dan seterusnya), dipotong di `jumlah` kata. */
  function kataPembuka(isi: IsiDokumen, jumlah: number): string {
    return teksIsi(isi).join(' ').split(/\s+/).slice(0, jumlah).join(' ')
  }

  function cekKeyphrase(doc: ArtikelAnalisis): Cek[] {
    const kp = doc.seo?.keyphrase?.trim()
    const label = { h1: 'Keyphrase di judul (H1)', slug: 'Keyphrase di slug', pembuka: 'Keyphrase di 100 kata pertama' }
    if (!kp) {
      const pesan = 'Isi keyphrase utama dulu.'
      return [kuning('keyphrase-h1', label.h1, pesan), kuning('keyphrase-slug', label.slug, pesan), kuning('keyphrase-pembuka', label.pembuka, pesan)]
    }
    const diSlug = mengandungFrasa((doc.slug ?? '').replace(/-/g, ' '), kp)
    return [
      mengandungFrasa(doc.judul ?? '', kp)
        ? hijau('keyphrase-h1', label.h1, `"${kp}" ada di judul.`)
        : kuning('keyphrase-h1', label.h1, `"${kp}" belum ada di judul artikel.`),
      diSlug
        ? hijau('keyphrase-slug', label.slug, `"${kp}" ada di slug.`)
        : kuning('keyphrase-slug', label.slug, `Slug belum memuat "${normalisasi(kp).replace(/ /g, '-')}".`),
      mengandungFrasa(kataPembuka(doc.isi, BATAS.kataPembuka), kp)
        ? hijau('keyphrase-pembuka', label.pembuka, `"${kp}" muncul di pembuka.`)
        : kuning('keyphrase-pembuka', label.pembuka, `Sebut "${kp}" di paragraf pembuka.`),
    ]
  }

  function cekHierarki(doc: ArtikelAnalisis): Cek {
    const label = 'Hierarki subjudul'
    const bagian = judulBagian(doc.isi)
    if (bagian.length === 0) return kuning('hierarki', label, 'Belum ada subjudul. Pecah isi dengan H2 supaya mudah dipindai.')
    const h1 = bagian.find((b) => b.level === 1)
    if (h1) return kuning('hierarki', label, `"${h1.teks}" memakai H1. Judul artikel sudah H1, pakai H2 di isi.`)
    let sebelumnya = 1
    for (const b of bagian) {
      if (b.level > sebelumnya + 1) {
        return kuning('hierarki', label, `"${b.teks}" melompat dari H${sebelumnya} ke H${b.level}. Pakai H${sebelumnya + 1}.`)
      }
      sebelumnya = b.level
    }
    return hijau('hierarki', label, `${bagian.length} subjudul berurutan tanpa loncat.`)
  }

  function cekIntinya(doc: ArtikelAnalisis): Cek {
    const poin = (doc.intinya ?? []).filter((p) => p.poin?.trim()).length
    return poin >= 2 && poin <= 4
      ? hijau('intinya', 'Kotak Intinya', `${poin} poin terisi.`)
      : kuning('intinya', 'Kotak Intinya', `Isi 2-4 poin (sekarang ${poin}).`)
  }

  function cekLinkInternal(doc: ArtikelAnalisis, urlSitus: string): Cek {
    const jumlah = tautanIsi(doc.isi, urlSitus).filter((t) => t.internal).length
    const { min, maks } = BATAS.linkInternal
    const label = 'Link internal'
    if (jumlah < min) return kuning('link-internal', label, `${jumlah} link internal. Tambah sampai ${min}-${maks}, lihat saran di bawah.`)
    if (jumlah > maks) return kuning('link-internal', label, `${jumlah} link internal. Cukup ${min}-${maks} yang paling relevan.`)
    return hijau('link-internal', label, `${jumlah} link internal.`)
  }

  function cekSumber(doc: ArtikelAnalisis, urlSitus: string): Cek {
    const url = new Set<string>()
    for (const s of doc.sumber ?? []) if (s.url?.trim()) url.add(s.url.trim())
    for (const t of tautanIsi(doc.isi, urlSitus)) if (!t.internal) url.add(t.url)
    const jumlah = url.size
    const { min, maks } = BATAS.sumberEksternal
    const label = 'Sumber eksternal'
    if (jumlah < min) return kuning('sumber-eksternal', label, `${jumlah} sumber. Rujuk ${min}-${maks} sumber resmi atau tepercaya.`)
    return hijau('sumber-eksternal', label, `${jumlah} sumber eksternal${jumlah > maks ? ', sudah lebih dari cukup' : ''}.`)
  }

  function cekAlt(doc: ArtikelAnalisis): Cek {
    const label = 'Alt gambar'
    const utama = ambil(doc.gambarUtama ?? null)
    const semua = [...(utama ? [utama] : []), ...gambarIsi(doc.isi)]
    const belumDimuat = semua.filter((g) => g.alt === undefined).length
    const kosong = semua.filter((g) => g.alt !== undefined && !g.alt?.trim()).length
    if (kosong > 0) return kuning('alt-gambar', label, `${kosong} gambar belum punya alt.`)
    if (belumDimuat > 0) return kuning('alt-gambar', label, `${belumDimuat} gambar belum bisa diperiksa. Simpan dulu lalu muat ulang.`)
    if (semua.length === 0) return kuning('alt-gambar', label, 'Belum ada gambar.')
    return hijau('alt-gambar', label, `Semua ${semua.length} gambar punya alt.`)
  }

  function cekKalimat(doc: ArtikelAnalisis): Cek {
    const label = 'Rata-rata panjang kalimat'
    const teks = teksIsi(doc.isi).join('\n')
    if (hitungKata(teks) === 0) return kuning('panjang-kalimat', label, 'Isi artikel masih kosong.')
    const rata = rataPanjangKalimat(teks)
    const angka = rata.toLocaleString('id-ID')
    return rata <= BATAS.rataKalimat
      ? hijau('panjang-kalimat', label, `${angka} kata per kalimat. Enak dibaca.`)
      : kuning('panjang-kalimat', label, `${angka} kata per kalimat. Pecah kalimat panjang, usahakan di bawah ${BATAS.rataKalimat}.`)
  }

  function cekGambarUtama(doc: ArtikelAnalisis): Cek {
    const label = 'Gambar utama'
    const media = ambil(doc.gambarUtama ?? null)
    if (!doc.gambarUtama) return kuning('gambar-utama', label, 'Belum ada gambar utama.')
    if (!media || typeof media.width !== 'number') return kuning('gambar-utama', label, 'Ukuran gambar belum terbaca. Simpan dulu lalu muat ulang.')
    return media.width >= LEBAR_MINIMAL_GAMBAR_UTAMA
      ? hijau('gambar-utama', label, `Lebar ${media.width}px.`)
      : kuning('gambar-utama', label, `Lebar ${media.width}px. Minimal ${LEBAR_MINIMAL_GAMBAR_UTAMA}px supaya tampil besar di Google Discover.`)
  }

  /** Daftar cek panel SEO, urutannya sama dengan spesifikasi §8 butir 2. */
  export function analisis(doc: ArtikelAnalisis, opsi: { urlSitus: string }): Cek[] {
    return [
      cekJudulSeo(doc),
      cekMeta(doc),
      ...cekKeyphrase(doc),
      cekHierarki(doc),
      cekIntinya(doc),
      cekLinkInternal(doc, opsi.urlSitus),
      cekSumber(doc, opsi.urlSitus),
      cekAlt(doc),
      cekKalimat(doc),
      cekGambarUtama(doc),
    ]
  }

  /** Ringkasan untuk judul panel: jumlah cek hijau dari seluruh cek. */
  export function skor(cek: Cek[]): { hijau: number; total: number } {
    return { hijau: cek.filter((c) => c.status === 'hijau').length, total: cek.length }
  }
  ```

  Perbarui `src/modules/seo/index.ts`:

  ```diff
  diff --git a/src/modules/seo/index.ts b/src/modules/seo/index.ts
  index b0d6016..10058ec 100644
  --- a/src/modules/seo/index.ts
  +++ b/src/modules/seo/index.ts
  @@ -2,9 +2,12 @@
    * Modul SEO (spesifikasi §5): antarmuka kecil, fungsi murni.
    * - `metadata(masukan, situs)` untuk `generateMetadata` halaman publik.
    * - `jsonLd(masukan, situs)` untuk `<script type="application/ld+json">` (pakai `serialisasiJsonLd`).
  + * - `analisis(artikel, { urlSitus })` untuk checklist panel SEO di editor.
    */
   export { metadata, canonicalDokumen, PATH_FEED } from './metadata'
   export { jsonLd, remahRoti, serialisasiJsonLd, tipeSchemaArtikel } from './jsonld'
   export type { JsonLd, NodeJsonLd, RemahRoti } from './jsonld'
  +export { analisis, skor, BATAS } from './analisis'
  +export type { ArtikelAnalisis, Cek, IdCek, StatusCek } from './analisis'
   export { judulSeo, deskripsiDokumen, gambarOgDokumen, pathDokumen, urlAbsolut } from './dokumen'
   export type * from './tipe'
  ```

- [ ] **Langkah 4: Jalankan tes, type check, lint**

  Jalankan:

  ```bash
  npm run test:unit
  npm run typecheck
  npm run lint
  ```

  Hasil yang diharapkan: unit `Test Files 21 passed (21)`, `Tests 158 passed (158)`; type check dan lint tanpa error.

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/modules/seo/analisis.ts src/modules/seo/index.ts tests/unit/seo-analisis.test.ts
  git commit -m "feat(seo): analisis checklist panel SEO dengan status hijau/kuning"
  ```


### Task 5: Pembentuk sitemap, news sitemap, robots.txt, dan RSS

**Files:**
- Create: `src/modules/seo/xml.ts`, `src/modules/seo/sitemap.ts`
- Modify: `src/modules/seo/index.ts`
- Test: `tests/unit/seo-xml.test.ts`

**Interfaces:**
- Consumes: `ambil`, `deskripsiDokumen`, `pathDokumen`, `urlAbsolut`, `canonicalDokumen`, `ArtikelSeo`, `MasukanSeo`, `PengaturanSitus` (Task 2).
- Produces:
  - `src/modules/seo/xml.ts`: `JENIS_SITEMAP` (`artikel`, `pilar`, `tools`, `video`, `penulis`, `halaman`), `type JenisSitemap`, `isJenisSitemap`, `PATH_SITEMAP_INDEX = '/sitemap.xml'`, `PATH_NEWS_SITEMAP = '/news-sitemap.xml'`, `pathSitemap(jenis)` (`/sitemap/{jenis}.xml`), `MAKS_URL_SITEMAP`, `MAKS_URL_NEWS`, `JENDELA_NEWS_MS`, `type EntriSitemap`, `EntriIndex`, `EntriNews`, `EntriFeed`, `escapeXml`, `tanggalW3c`, `terbaru`, `xmlSitemapIndex`, `xmlSitemap`, `saringNews(entri, sekarang)`, `xmlNewsSitemap(entri, { nama, bahasa? })`, `ROBOTS_BAWAAN`, `teksRobots({ urlSitus, tambahan })`, `tanggalRss`, `xmlFeed(kanal, entri)`.
  - `src/modules/seo/sitemap.ts`: `lastmodDokumen(masukan)`, `layakSitemap(masukan, situs)`, `entriSitemap(masukan[], situs)`, `entriNews(docs, situs)`, `entriFeed(docs, situs)`.

Keputusan yang dikunci tes:

- `lastmod` artikel = `diperbaruiBesar ?? terbitPada`, jadi hanya berubah saat editor menandai perubahan besar (spesifikasi §8). Pilar, subkategori, tools, video, penulis, dan halaman tidak punya tanggal itu, jadi memakai `updatedAt`. Untuk koleksi tanpa draf (pilar, penulis) `updatedAt` berubah di setiap simpan; ini diterima karena koleksi itu jarang diubah dan perubahannya memang tampil di halaman.
- Masuk sitemap hanya dokumen terbit (disaring di query rute, Task 7), punya slug, tidak `noindex`, dan canonical-nya menunjuk dirinya sendiri (halaman ber-canonical ke URL lain bukan URL kanonis).
- `changefreq` dan `priority` tidak ditulis karena diabaikan Google.
- News sitemap: artikel yang `terbitPada`-nya dalam 48 jam terakhir dan tidak di masa depan (jadwal terbit), terbaru dulu, maksimal 1.000 URL. `news:language` = `id` (ISO 639), `news:name` = nama situs.
- robots.txt: aturan bawaan (`Allow: /`, `Allow: /api/media/file/`, `Disallow: /admin`, `/api/`, `/cari`), lalu `robotsTambahan` dari CMS baris per baris (baris `Sitemap:` dari CMS dibuang supaya rujukan sitemap hanya dari sistem), lalu `Sitemap:` index dan news sitemap.
- RSS 2.0 dengan `atom:link rel="self"`, `dc:creator` penulis, `category` pilar, deskripsi = meta description.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/seo-xml.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { entriFeed, entriNews, entriSitemap, lastmodDokumen, layakSitemap } from '@/modules/seo/sitemap'
  import {
    escapeXml,
    isJenisSitemap,
    saringNews,
    tanggalW3c,
    teksRobots,
    terbaru,
    xmlFeed,
    xmlNewsSitemap,
    xmlSitemap,
    xmlSitemapIndex,
  } from '@/modules/seo/xml'

  import { artikel, pilarUang, situs } from './seo-contoh'

  describe('utilitas XML', () => {
    it('escapeXml mengamankan karakter khusus dan membuang karakter kontrol', () => {
      expect(escapeXml(`Gaji & "THR" <2026> it's\u0007`)).toBe('Gaji &amp; &quot;THR&quot; &lt;2026&gt; it&apos;s')
    })

    it('tanggalW3c tanpa milidetik, null bila tidak valid', () => {
      expect(tanggalW3c('2026-11-02T03:00:00.123Z')).toBe('2026-11-02T03:00:00Z')
      expect(tanggalW3c('bukan tanggal')).toBeNull()
      expect(tanggalW3c(null)).toBeNull()
    })

    it('terbaru memilih tanggal paling akhir', () => {
      expect(terbaru(['2026-11-01T00:00:00Z', null, '2026-11-03T00:00:00Z', '2026-11-02T00:00:00Z'])).toBe('2026-11-03T00:00:00Z')
      expect(terbaru([])).toBeNull()
    })

    it('isJenisSitemap hanya menerima enam jenis', () => {
      expect(['artikel', 'pilar', 'tools', 'video', 'penulis', 'halaman'].every(isJenisSitemap)).toBe(true)
      expect(isJenisSitemap('subkategori')).toBe(false)
    })
  })

  describe('sitemap', () => {
    it('index menunjuk sitemap per jenis dengan lastmod', () => {
      expect(
        xmlSitemapIndex([
          { loc: 'https://point.lat/sitemap/artikel.xml', lastmod: '2026-11-02T03:00:00.000Z' },
          { loc: 'https://point.lat/sitemap/penulis.xml', lastmod: null },
        ]),
      ).toBe(
        '<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
          '<sitemap><loc>https://point.lat/sitemap/artikel.xml</loc><lastmod>2026-11-02T03:00:00Z</lastmod></sitemap>' +
          '<sitemap><loc>https://point.lat/sitemap/penulis.xml</loc></sitemap></sitemapindex>\n',
      )
    })

    it('urlset tanpa changefreq dan priority', () => {
      const xml = xmlSitemap([{ loc: 'https://point.lat/a?x=1&y=2', lastmod: '2026-11-02T03:00:00Z' }])
      expect(xml).toBe(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
          '<url><loc>https://point.lat/a?x=1&amp;y=2</loc><lastmod>2026-11-02T03:00:00Z</lastmod></url></urlset>\n',
      )
      expect(xml).not.toMatch(/changefreq|priority/)
    })
  })

  describe('entri sitemap dari dokumen', () => {
    it('lastmod artikel = diperbaruiBesar ?? terbitPada; koleksi lain updatedAt', () => {
      expect(lastmodDokumen({ jenis: 'artikel', doc: artikel })).toBe('2026-11-02T03:00:00.000Z')
      expect(lastmodDokumen({ jenis: 'artikel', doc: { ...artikel, diperbaruiBesar: '2026-11-04T00:00:00.000Z' } })).toBe(
        '2026-11-04T00:00:00.000Z',
      )
      expect(lastmodDokumen({ jenis: 'pilar', doc: { ...pilarUang, updatedAt: '2026-11-01T00:00:00.000Z' } })).toBe(
        '2026-11-01T00:00:00.000Z',
      )
    })

    it('dokumen noindex, tanpa slug, atau ber-canonical ke URL lain tidak masuk sitemap', () => {
      expect(layakSitemap({ jenis: 'artikel', doc: artikel }, situs)).toBe(true)
      expect(layakSitemap({ jenis: 'artikel', doc: { ...artikel, seo: { noindex: true } } }, situs)).toBe(false)
      expect(layakSitemap({ jenis: 'artikel', doc: { ...artikel, slug: null } }, situs)).toBe(false)
      expect(layakSitemap({ jenis: 'artikel', doc: { ...artikel, seo: { canonical: 'https://contoh.id/asli' } } }, situs)).toBe(false)
      expect(
        layakSitemap({ jenis: 'artikel', doc: { ...artikel, seo: { canonical: 'https://point.lat/cara-hitung-gaji-bersih' } } }, situs),
      ).toBe(true)
    })

    it('entriSitemap memakai pathFor (glosarium di /glosarium)', () => {
      expect(
        entriSitemap(
          [
            { jenis: 'artikel', doc: artikel },
            { jenis: 'artikel', doc: { ...artikel, tipe: 'glosarium', slug: 'ptkp' } },
            { jenis: 'artikel', doc: { ...artikel, slug: 'rahasia', seo: { noindex: true } } },
          ],
          situs,
        ),
      ).toEqual([
        { loc: 'https://point.lat/cara-hitung-gaji-bersih', lastmod: '2026-11-02T03:00:00.000Z' },
        { loc: 'https://point.lat/glosarium/ptkp', lastmod: '2026-11-02T03:00:00.000Z' },
      ])
    })
  })

  describe('news sitemap', () => {
    const sekarang = new Date('2026-11-04T03:00:00Z')
    const entri = [
      { loc: 'https://point.lat/lama', judul: 'Lama', terbitPada: '2026-11-01T03:00:00Z' },
      { loc: 'https://point.lat/kemarin', judul: 'Kemarin', terbitPada: '2026-11-03T03:00:00Z' },
      { loc: 'https://point.lat/baru', judul: 'Baru & hangat', terbitPada: '2026-11-04T02:00:00Z' },
      { loc: 'https://point.lat/jadwal', judul: 'Terjadwal', terbitPada: '2026-11-05T03:00:00Z' },
    ]

    it('hanya artikel 48 jam terakhir, terbaru dulu, tanpa yang dijadwalkan', () => {
      expect(saringNews(entri, sekarang).map((e) => e.judul)).toEqual(['Baru & hangat', 'Kemarin'])
    })

    it('format Google News dengan bahasa id', () => {
      expect(xmlNewsSitemap(saringNews(entri, sekarang).slice(0, 1), { nama: 'point.' })).toBe(
        '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
          'xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"><url><loc>https://point.lat/baru</loc>' +
          '<news:news><news:publication><news:name>point.</news:name><news:language>id</news:language></news:publication>' +
          '<news:publication_date>2026-11-04T02:00:00Z</news:publication_date><news:title>Baru &amp; hangat</news:title>' +
          '</news:news></url></urlset>\n',
      )
    })

    it('entriNews dari dokumen: hanya yang punya terbitPada dan layak sitemap', () => {
      expect(
        entriNews([artikel, { ...artikel, slug: 'draf', terbitPada: null }, { ...artikel, slug: 'x', seo: { noindex: true } }], situs),
      ).toEqual([{ loc: 'https://point.lat/cara-hitung-gaji-bersih', judul: 'Cara hitung gaji bersih', terbitPada: '2026-11-02T03:00:00.000Z' }])
    })
  })

  describe('robots.txt', () => {
    it('aturan bawaan, tambahan CMS, lalu sitemap', () => {
      expect(teksRobots({ urlSitus: 'https://point.lat', tambahan: 'User-agent: GPTBot\r\nDisallow: /\n\nSitemap: https://lain.id/s.xml' })).toBe(
        [
          'User-agent: *',
          'Allow: /',
          'Allow: /api/media/file/',
          'Disallow: /admin',
          'Disallow: /api/',
          'Disallow: /cari',
          '',
          'User-agent: GPTBot',
          'Disallow: /',
          '',
          'Sitemap: https://point.lat/sitemap.xml',
          'Sitemap: https://point.lat/news-sitemap.xml',
          '',
        ].join('\n'),
      )
    })

    it('tanpa tambahan', () => {
      expect(teksRobots({ urlSitus: 'https://point.lat', tambahan: null })).toContain('Disallow: /cari\n\nSitemap: https://point.lat/sitemap.xml')
    })
  })

  describe('RSS', () => {
    it('kanal dan item dari artikel', () => {
      const entri = entriFeed([artikel], situs)
      expect(entri).toEqual([
        {
          judul: 'Cara hitung gaji bersih',
          link: 'https://point.lat/cara-hitung-gaji-bersih',
          deskripsi:
            'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS. Begini cara menghitungnya langkah demi langkah, lengkap dengan contoh untuk karyawan tetap...',
          terbitPada: '2026-11-02T03:00:00.000Z',
          penulis: 'Rani Wulandari',
          kategori: 'Uang & Karier',
        },
      ])
      expect(
        xmlFeed(
          { judul: 'point.', link: 'https://point.lat/', deskripsi: 'Intinya dulu.', urlFeed: 'https://point.lat/feed.xml' },
          [{ ...entri[0], deskripsi: 'Ringkas.' }],
        ),
      ).toBe(
        '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">' +
          '<channel><title>point.</title><link>https://point.lat/</link><description>Intinya dulu.</description><language>id-ID</language>' +
          '<atom:link href="https://point.lat/feed.xml" rel="self" type="application/rss+xml"/>' +
          '<lastBuildDate>Mon, 02 Nov 2026 03:00:00 GMT</lastBuildDate>' +
          '<item><title>Cara hitung gaji bersih</title><link>https://point.lat/cara-hitung-gaji-bersih</link>' +
          '<guid isPermaLink="true">https://point.lat/cara-hitung-gaji-bersih</guid><description>Ringkas.</description>' +
          '<pubDate>Mon, 02 Nov 2026 03:00:00 GMT</pubDate><dc:creator>Rani Wulandari</dc:creator><category>Uang &amp; Karier</category></item>' +
          '</channel></rss>\n',
      )
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/seo-xml.test.ts` dengan `Cannot find package '@/modules/seo/sitemap'`.

- [ ] **Langkah 3: Tulis pembentuk XML dan teks**

  `src/modules/seo/xml.ts`

  ```ts
  /**
   * Pembentuk XML dan teks untuk rute teknis (spesifikasi §7, §8 "Tingkat situs"). Fungsi murni:
   * rute di `src/app/(frontend)/` hanya mengambil data lalu memanggil fungsi ini.
   */

  export const JENIS_SITEMAP = ['artikel', 'pilar', 'tools', 'video', 'penulis', 'halaman'] as const
  export type JenisSitemap = (typeof JENIS_SITEMAP)[number]

  export function isJenisSitemap(nilai: string): nilai is JenisSitemap {
    return (JENIS_SITEMAP as readonly string[]).includes(nilai)
  }

  export const PATH_SITEMAP_INDEX = '/sitemap.xml'
  export const PATH_NEWS_SITEMAP = '/news-sitemap.xml'
  export const pathSitemap = (jenis: JenisSitemap) => `/sitemap/${jenis}.xml`

  /** Batas protokol sitemap per file. */
  export const MAKS_URL_SITEMAP = 50_000
  /** Batas Google News per sitemap. */
  export const MAKS_URL_NEWS = 1_000
  /** Google News: hanya artikel yang terbit dua hari terakhir. */
  export const JENDELA_NEWS_MS = 48 * 60 * 60 * 1000

  export type EntriSitemap = { loc: string; lastmod?: string | null }
  export type EntriIndex = { loc: string; lastmod?: string | null }
  export type EntriNews = { loc: string; judul: string; terbitPada: string }
  export type EntriFeed = { judul: string; link: string; deskripsi: string; terbitPada: string; penulis?: string | null; kategori?: string | null }

  const DEKLARASI = '<?xml version="1.0" encoding="UTF-8"?>'
  const NS_SITEMAP = 'http://www.sitemaps.org/schemas/sitemap/0.9'
  const NS_NEWS = 'http://www.google.com/schemas/sitemap-news/0.9'

  /** Escape teks untuk isi elemen XML. Karakter kontrol yang dilarang XML 1.0 dibuang. */
  export function escapeXml(teks: string): string {
    return teks
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  /** Tanggal W3C Datetime (ISO 8601 UTC tanpa milidetik), `null` bila tidak valid. */
  export function tanggalW3c(nilai: string | Date | null | undefined): string | null {
    if (!nilai) return null
    const waktu = new Date(nilai)
    if (Number.isNaN(waktu.getTime())) return null
    return waktu.toISOString().replace(/\.\d{3}Z$/, 'Z')
  }

  /** Tanggal terbaru dari daftar, untuk `lastmod` sitemap index. */
  export function terbaru(tanggal: (string | null | undefined)[]): string | null {
    let hasil: number | null = null
    for (const t of tanggal) {
      const waktu = t ? new Date(t).getTime() : Number.NaN
      if (!Number.isNaN(waktu) && (hasil === null || waktu > hasil)) hasil = waktu
    }
    return hasil === null ? null : tanggalW3c(new Date(hasil))
  }

  const lastmod = (nilai?: string | null) => {
    const t = tanggalW3c(nilai)
    return t ? `<lastmod>${t}</lastmod>` : ''
  }

  /** Sitemap index yang menunjuk sitemap per jenis. */
  export function xmlSitemapIndex(entri: EntriIndex[]): string {
    const isi = entri.map((e) => `<sitemap><loc>${escapeXml(e.loc)}</loc>${lastmod(e.lastmod)}</sitemap>`).join('')
    return `${DEKLARASI}\n<sitemapindex xmlns="${NS_SITEMAP}">${isi}</sitemapindex>\n`
  }

  /**
   * Sitemap URL. `changefreq` dan `priority` tidak ditulis karena diabaikan Google; `lastmod` hanya
   * bila diketahui.
   */
  export function xmlSitemap(entri: EntriSitemap[]): string {
    const isi = entri
      .slice(0, MAKS_URL_SITEMAP)
      .map((e) => `<url><loc>${escapeXml(e.loc)}</loc>${lastmod(e.lastmod)}</url>`)
      .join('')
    return `${DEKLARASI}\n<urlset xmlns="${NS_SITEMAP}">${isi}</urlset>\n`
  }

  /** Artikel untuk news sitemap: terbit dalam 48 jam terakhir (dan tidak di masa depan), terbaru dulu. */
  export function saringNews(entri: EntriNews[], sekarang: Date): EntriNews[] {
    const batas = sekarang.getTime() - JENDELA_NEWS_MS
    return entri
      .filter((e) => {
        const waktu = new Date(e.terbitPada).getTime()
        return waktu >= batas && waktu <= sekarang.getTime()
      })
      .sort((a, b) => new Date(b.terbitPada).getTime() - new Date(a.terbitPada).getTime())
      .slice(0, MAKS_URL_NEWS)
  }

  /** News sitemap Google. `news:language` memakai kode ISO 639 bahasa Indonesia (`id`). */
  export function xmlNewsSitemap(entri: EntriNews[], publikasi: { nama: string; bahasa?: string }): string {
    const nama = escapeXml(publikasi.nama)
    const bahasa = publikasi.bahasa ?? 'id'
    const isi = entri
      .map(
        (e) =>
          `<url><loc>${escapeXml(e.loc)}</loc><news:news><news:publication><news:name>${nama}</news:name>` +
          `<news:language>${bahasa}</news:language></news:publication>` +
          `<news:publication_date>${tanggalW3c(e.terbitPada)}</news:publication_date>` +
          `<news:title>${escapeXml(e.judul)}</news:title></news:news></url>`,
      )
      .join('')
    return `${DEKLARASI}\n<urlset xmlns="${NS_SITEMAP}" xmlns:news="${NS_NEWS}">${isi}</urlset>\n`
  }

  /**
   * Aturan bawaan robots.txt: semua boleh dirayapi kecuali admin, API, dan pencarian internal.
   * `/api/media/file/` tetap boleh karena mengarah ke gambar.
   */
  export const ROBOTS_BAWAAN = ['User-agent: *', 'Allow: /', 'Allow: /api/media/file/', 'Disallow: /admin', 'Disallow: /api/', 'Disallow: /cari']

  /** robots.txt: aturan bawaan, aturan tambahan dari CMS, lalu rujukan sitemap index dan news sitemap. */
  export function teksRobots(opsi: { urlSitus: string; tambahan?: string | null }): string {
    const tambahan = (opsi.tambahan ?? '')
      .split(/\r?\n/)
      .map((baris) => baris.trim())
      .filter((baris) => baris && !/^sitemap\s*:/i.test(baris))
    const sitemap = [PATH_SITEMAP_INDEX, PATH_NEWS_SITEMAP].map((p) => `Sitemap: ${new URL(p, opsi.urlSitus).toString()}`)
    return [...ROBOTS_BAWAAN, ...(tambahan.length ? ['', ...tambahan] : []), '', ...sitemap, ''].join('\n')
  }

  /** Tanggal RFC 822 untuk RSS (`Mon, 02 Nov 2026 03:00:00 GMT`). */
  export function tanggalRss(nilai: string): string {
    return new Date(nilai).toUTCString()
  }

  /** RSS 2.0 untuk `/feed.xml`. */
  export function xmlFeed(
    kanal: { judul: string; link: string; deskripsi: string; urlFeed: string; bahasa?: string },
    entri: EntriFeed[],
  ): string {
    const item = entri
      .map(
        (e) =>
          `<item><title>${escapeXml(e.judul)}</title><link>${escapeXml(e.link)}</link>` +
          `<guid isPermaLink="true">${escapeXml(e.link)}</guid>` +
          `<description>${escapeXml(e.deskripsi)}</description><pubDate>${tanggalRss(e.terbitPada)}</pubDate>` +
          (e.penulis ? `<dc:creator>${escapeXml(e.penulis)}</dc:creator>` : '') +
          (e.kategori ? `<category>${escapeXml(e.kategori)}</category>` : '') +
          '</item>',
      )
      .join('')
    const terakhir = entri[0] ? `<lastBuildDate>${tanggalRss(entri[0].terbitPada)}</lastBuildDate>` : ''
    return (
      `${DEKLARASI}\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">` +
      `<channel><title>${escapeXml(kanal.judul)}</title><link>${escapeXml(kanal.link)}</link>` +
      `<description>${escapeXml(kanal.deskripsi)}</description><language>${kanal.bahasa ?? 'id-ID'}</language>` +
      `<atom:link href="${escapeXml(kanal.urlFeed)}" rel="self" type="application/rss+xml"/>${terakhir}${item}</channel></rss>\n`
    )
  }
  ```

- [ ] **Langkah 4: Tulis pemilih entri dari dokumen**

  `src/modules/seo/sitemap.ts`

  ```ts
  import { ambil, deskripsiDokumen, pathDokumen, urlAbsolut } from './dokumen'
  import { canonicalDokumen } from './metadata'
  import type { ArtikelSeo, MasukanSeo, PengaturanSitus } from './tipe'
  import type { EntriFeed, EntriNews, EntriSitemap } from './xml'

  type SitusUrl = Pick<PengaturanSitus, 'urlSitus'>

  /**
   * `lastmod` sitemap. Artikel: `diperbaruiBesar ?? terbitPada`, jadi hanya berubah saat perubahan
   * besar (spesifikasi §8). Koleksi lain tidak punya tanggal itu: dipakai `updatedAt`.
   */
  export function lastmodDokumen(masukan: MasukanSeo): string | null {
    if (masukan.jenis === 'beranda' || masukan.jenis === 'statis') return null
    if (masukan.jenis === 'artikel') return masukan.doc.diperbaruiBesar ?? masukan.doc.terbitPada ?? null
    return masukan.doc.updatedAt ?? null
  }

  /**
   * Dokumen masuk sitemap bila punya slug, tidak noindex, dan canonical-nya menunjuk dirinya sendiri.
   * Status terbit disaring di query (`_status: published`).
   */
  export function layakSitemap(masukan: MasukanSeo, situs: SitusUrl): boolean {
    if (masukan.jenis === 'beranda' || masukan.jenis === 'statis') return true
    if (!masukan.doc.slug || masukan.doc.seo?.noindex) return false
    if (masukan.jenis === 'subkategori' && !ambil(masukan.doc.pilar)?.slug) return false
    const sendiri = urlAbsolut(situs, pathDokumen(masukan))
    return canonicalDokumen(masukan, situs) === sendiri
  }

  export function entriSitemap(masukan: MasukanSeo[], situs: SitusUrl): EntriSitemap[] {
    return masukan
      .filter((m) => layakSitemap(m, situs))
      .map((m) => ({ loc: urlAbsolut(situs, pathDokumen(m)), lastmod: lastmodDokumen(m) }))
  }

  const artikelTerbit = (docs: ArtikelSeo[], situs: SitusUrl) =>
    docs.filter((doc) => doc.terbitPada && layakSitemap({ jenis: 'artikel', doc }, situs))

  export function entriNews(docs: ArtikelSeo[], situs: SitusUrl): EntriNews[] {
    return artikelTerbit(docs, situs).map((doc) => ({
      loc: urlAbsolut(situs, pathDokumen({ jenis: 'artikel', doc })),
      judul: doc.judul,
      terbitPada: doc.terbitPada as string,
    }))
  }

  export function entriFeed(docs: ArtikelSeo[], situs: PengaturanSitus): EntriFeed[] {
    return artikelTerbit(docs, situs).map((doc) => ({
      judul: doc.judul,
      link: urlAbsolut(situs, pathDokumen({ jenis: 'artikel', doc })),
      deskripsi: deskripsiDokumen({ jenis: 'artikel', doc }, situs),
      terbitPada: doc.terbitPada as string,
      penulis: ambil(doc.penulis)?.nama ?? null,
      kategori: ambil(doc.pilar)?.nama ?? null,
    }))
  }
  ```

  Perbarui `src/modules/seo/index.ts`:

  ```diff
  diff --git a/src/modules/seo/index.ts b/src/modules/seo/index.ts
  index 10058ec..b10924f 100644
  --- a/src/modules/seo/index.ts
  +++ b/src/modules/seo/index.ts
  @@ -3,11 +3,14 @@
    * - `metadata(masukan, situs)` untuk `generateMetadata` halaman publik.
    * - `jsonLd(masukan, situs)` untuk `<script type="application/ld+json">` (pakai `serialisasiJsonLd`).
    * - `analisis(artikel, { urlSitus })` untuk checklist panel SEO di editor.
  + * - Pembentuk sitemap, news sitemap, robots.txt, dan RSS untuk rute teknis.
    */
   export { metadata, canonicalDokumen, PATH_FEED } from './metadata'
   export { jsonLd, remahRoti, serialisasiJsonLd, tipeSchemaArtikel } from './jsonld'
   export type { JsonLd, NodeJsonLd, RemahRoti } from './jsonld'
   export { analisis, skor, BATAS } from './analisis'
   export type { ArtikelAnalisis, Cek, IdCek, StatusCek } from './analisis'
  +export { entriFeed, entriNews, entriSitemap, lastmodDokumen, layakSitemap } from './sitemap'
  +export * from './xml'
   export { judulSeo, deskripsiDokumen, gambarOgDokumen, pathDokumen, urlAbsolut } from './dokumen'
   export type * from './tipe'
  ```

- [ ] **Langkah 5: Jalankan tes, type check, lint**

  Jalankan:

  ```bash
  npm run test:unit
  npm run typecheck
  npm run lint
  ```

  Hasil yang diharapkan: unit `Test Files 22 passed (22)`, `Tests 173 passed (173)`; type check dan lint tanpa error.

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/modules/seo/xml.ts src/modules/seo/sitemap.ts src/modules/seo/index.ts tests/unit/seo-xml.test.ts
  git commit -m "feat(seo): pembentuk sitemap, news sitemap, robots.txt, dan RSS"
  ```


### Task 6: Tag cache dan revalidasi saat konten publik berubah

**Files:**
- Create: `src/lib/tag.ts`, `src/hooks/revalidasiPublik.ts`
- Modify: `src/collections/Artikel.ts`, `src/collections/Pilar.ts`, `src/collections/Subkategori.ts`, `src/collections/Penulis.ts`, `src/collections/Tools.ts`, `src/collections/Video.ts`, `src/collections/Halaman.ts`, `src/globals/PengaturanSEO.ts`
- Test: `tests/unit/tag.test.ts`, `tests/int/revalidasi.int.spec.ts`

**Interfaces:**
- Consumes: `revalidateTag` (`next/cache`), tipe hook Payload.
- Produces:
  - `src/lib/tag.ts`: `KOLEKSI_PUBLIK`, `type KoleksiPublik`, `TAG = { beranda: 'beranda', sitemap: 'sitemap', pengaturanSeo: 'pengaturan-seo', dokumen(koleksi, id) => '{koleksi}:{id}', pilar(slug) => 'pilar:{slug}' }`, `tagRevalidasi(koleksi, doc, slugPilar?): string[]`.
  - `src/hooks/revalidasiPublik.ts`: `type PemicuRevalidasi = (tag: string) => void`, `pakaiPemicuRevalidasi(baru | null)` (tes), `revalidasi(tag[])`, `revalidasiPublik(koleksi): { beforeChange, afterChange, afterDelete }`, `revalidasiPengaturanSeo` (hook global).
  - Rencana 4 memberi tag yang sama pada data halaman (`unstable_cache(..., { tags: [TAG.dokumen('artikel', id), TAG.pilar(slug)] })`); Rencana 6 (Mesin Indexing) memanggil `revalidasi()` sebagai langkah 1 sebelum mengabari mesin pencari.

Nama tag mengikuti spesifikasi §5 "Rendering" dengan nama koleksi berbahasa Indonesia: `artikel:{id}` (spesifikasi menulis `article:{id}`), `pilar:{slug}`, `beranda` (spesifikasi `home`), `sitemap`; ditambah `{koleksi}` untuk halaman indeks (`/tools`, `/glosarium`, `/video`) dan `pengaturan-seo` untuk robots.txt dan metadata situs.

| Perubahan | Tag |
|---|---|
| Artikel terbit, batal terbit, dihapus | `artikel`, `artikel:{id}`, `pilar:{slug lama}`, `pilar:{slug baru}`, `beranda`, `sitemap` |
| Pilar disimpan | `pilar`, `pilar:{id}`, `pilar:{slug baru}`, `pilar:{slug lama}`, `beranda`, `sitemap` |
| Video, tools, subkategori | `{koleksi}`, `{koleksi}:{id}`, `pilar:{slug}`, (`beranda` untuk video), `sitemap` |
| Penulis, halaman | `{koleksi}`, `{koleksi}:{id}`, `sitemap` |
| Global pengaturan SEO | `pengaturan-seo`, `sitemap` |

Koleksi dengan draf (artikel, tools, video, halaman) tidak merevalidasi saat menyimpan draf atau autosave, karena halaman publik tidak berubah. Batal terbit harus tetap merevalidasi, tetapi di `afterChange` dokumen utama sudah tertimpa dan `previousDoc` berisi versi terakhir (bisa draf). Karena itu `beforeChange` mencatat apakah dokumen utama tadinya terbit di `req.context` (pola yang sama dengan `redirectSaatPathBerubah` dari Rencana 1); bila versi terakhir sudah terbit, query dilewati. `afterChange` lalu membaca status dokumen utama sekali lagi hanya bila dokumen tadinya terbit dan yang disimpan bukan terbit.

`revalidateTag(tag, { expire: 0 })`: data langsung kedaluwarsa sehingga permintaan berikutnya, termasuk crawler yang dikabari Mesin Indexing tepat setelah terbit, mendapat data baru. Bentuk dua argumen ini dianjurkan dokumentasi Next 16 untuk revalidasi dari route handler (bentuk satu argumen sudah usang). Di luar server Next (`npm run seed`, tes, `payload run`) `revalidateTag` melempar "static generation store missing"; galat itu diabaikan karena tidak ada cache yang perlu dibuang. Tes memasang pemicu palsu lewat `pakaiPemicuRevalidasi`.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/tag.test.ts`

  ```ts
  import { afterEach, describe, expect, it } from 'vitest'

  import { pakaiPemicuRevalidasi, revalidasi } from '@/hooks/revalidasiPublik'
  import { TAG, tagRevalidasi } from '@/lib/tag'

  describe('TAG', () => {
    it('nama tag tetap supaya halaman dan hook memakai string yang sama', () => {
      expect(TAG.dokumen('artikel', 12)).toBe('artikel:12')
      expect(TAG.pilar('uang-karier')).toBe('pilar:uang-karier')
      expect([TAG.beranda, TAG.sitemap, TAG.pengaturanSeo]).toEqual(['beranda', 'sitemap', 'pengaturan-seo'])
    })
  })

  describe('tagRevalidasi', () => {
    it('artikel: daftar, dokumen, pilar lama dan baru, beranda, sitemap', () => {
      expect(tagRevalidasi('artikel', { id: 12 }, ['uang-karier', 'tekno', 'uang-karier', null])).toEqual([
        'artikel',
        'artikel:12',
        'pilar:uang-karier',
        'pilar:tekno',
        'beranda',
        'sitemap',
      ])
    })

    it('koleksi yang tidak tampil di beranda tidak merevalidasi beranda', () => {
      expect(tagRevalidasi('penulis', { id: 3 })).toEqual(['penulis', 'penulis:3', 'sitemap'])
      expect(tagRevalidasi('halaman', { id: 4 })).toEqual(['halaman', 'halaman:4', 'sitemap'])
      expect(tagRevalidasi('tools', { id: 5 }, ['uang-karier'])).toEqual(['tools', 'tools:5', 'pilar:uang-karier', 'sitemap'])
    })
  })

  describe('revalidasi', () => {
    afterEach(() => {
      pakaiPemicuRevalidasi(null)
    })

    it('memanggil pemicu sekali per tag', () => {
      const terpanggil: string[] = []
      pakaiPemicuRevalidasi((tag) => terpanggil.push(tag))
      revalidasi(['sitemap', 'artikel:1', 'sitemap'])
      expect(terpanggil).toEqual(['sitemap', 'artikel:1'])
    })

    it('di luar server Next (tes, seed) pemicu bawaan tidak melempar galat', () => {
      expect(() => revalidasi(['sitemap'])).not.toThrow()
    })
  })
  ```

  `tests/int/revalidasi.int.spec.ts`

  ```ts
  import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

  import { pakaiPemicuRevalidasi } from '@/hooks/revalidasiPublik'

  import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
  import { getTestPayload, unik } from './helpers'

  let tag: string[] = []

  describe('revalidasi tag saat konten berubah', () => {
    beforeAll(() => {
      pakaiPemicuRevalidasi((t) => tag.push(t))
    })

    afterAll(() => {
      pakaiPemicuRevalidasi(null)
    })

    beforeEach(() => {
      tag = []
    })

    it('terbit artikel merevalidasi artikel, pilarnya, beranda, dan sitemap', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      tag = []
      const artikel = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      expect(tag).toEqual(['artikel', `artikel:${artikel.id}`, `pilar:${relasi.pilar.slug}`, 'beranda', 'sitemap'])
    })

    it('menyimpan draf tidak merevalidasi; batal terbit dan hapus merevalidasi', async () => {
      const payload = await getTestPayload()
      const draf = await payload.create({ collection: 'artikel', draft: true, data: { judul: unik('Draf') } })
      expect(tag).toEqual([])

      const relasi = await siapkanRelasiArtikel(payload)
      const terbit = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      tag = []
      await payload.update({ collection: 'artikel', id: terbit.id, draft: true, data: { judul: `${terbit.judul} revisi` } })
      expect(tag).toEqual([])

      await payload.update({ collection: 'artikel', id: terbit.id, data: { _status: 'draft' } })
      expect(tag).toContain(`artikel:${terbit.id}`)
      expect(tag).toContain('sitemap')

      tag = []
      await payload.delete({ collection: 'artikel', id: draf.id })
      expect(tag).toContain(`artikel:${draf.id}`)
    })

    it('artikel pindah pilar merevalidasi pilar lama dan baru', async () => {
      const payload = await getTestPayload()
      const relasi = await siapkanRelasiArtikel(payload)
      const artikel = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      const pilarBaru = await payload.create({ collection: 'pilar', data: { nama: unik('Tekno'), warna: 'oranye', deskripsi: 'Tekno.' } })
      tag = []
      await payload.update({ collection: 'artikel', id: artikel.id, data: { _status: 'published', pilar: pilarBaru.id } })
      expect(tag).toEqual(expect.arrayContaining([`pilar:${relasi.pilar.slug}`, `pilar:${pilarBaru.slug}`]))
    })

    it('pilar ganti slug merevalidasi slug lama dan baru; penulis tidak menyentuh beranda', async () => {
      const payload = await getTestPayload()
      const pilar = await payload.create({ collection: 'pilar', data: { nama: unik('Sehat'), warna: 'koral', deskripsi: 'Sehat.' } })
      tag = []
      const slugBaru = unik('sehat-baru')
      await payload.update({ collection: 'pilar', id: pilar.id, data: { slug: slugBaru } })
      expect(tag).toEqual(['pilar', `pilar:${pilar.id}`, `pilar:${slugBaru}`, `pilar:${pilar.slug}`, 'beranda', 'sitemap'])

      tag = []
      const penulis = await payload.create({ collection: 'penulis', data: { nama: unik('Penulis'), bio: 'Bio.' } })
      expect(tag).toEqual(['penulis', `penulis:${penulis.id}`, 'sitemap'])
    })

    it('pengaturan SEO merevalidasi robots dan sitemap', async () => {
      const payload = await getTestPayload()
      await payload.updateGlobal({ slug: 'pengaturan-seo', data: { robotsTambahan: 'User-agent: GPTBot\nDisallow: /' } })
      expect(tag).toEqual(['pengaturan-seo', 'sitemap'])
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/tag.test.ts` dengan `Cannot find package '@/hooks/revalidasiPublik'`.

- [ ] **Langkah 3: Tulis tag dan hook revalidasi**

  `src/lib/tag.ts`

  ```ts
  /**
   * Tag cache halaman publik dan rute teknis (spesifikasi §5 "Rendering"). Halaman dan rute memberi
   * tag ini pada data yang di-cache; hook koleksi memanggil `revalidateTag` untuk tag yang terdampak.
   *
   * - `{koleksi}`: daftar dokumen koleksi itu (indeks tools, glosarium, video).
   * - `{koleksi}:{id}`: satu dokumen (halaman artikel, tools, video, penulis, halaman statis).
   * - `pilar:{slug}`: halaman rubrik `/{pilar}` dan `/{pilar}/{subkategori}`.
   * - `beranda`, `sitemap` (sitemap, news sitemap, RSS), `pengaturan-seo` (robots.txt, metadata situs).
   */

  export const KOLEKSI_PUBLIK = ['artikel', 'pilar', 'subkategori', 'penulis', 'tools', 'video', 'halaman'] as const
  export type KoleksiPublik = (typeof KOLEKSI_PUBLIK)[number]

  export const TAG = {
    beranda: 'beranda',
    sitemap: 'sitemap',
    pengaturanSeo: 'pengaturan-seo',
    dokumen: (koleksi: KoleksiPublik, id: number | string) => `${koleksi}:${id}`,
    pilar: (slug: string) => `pilar:${slug}`,
  } as const

  /** Koleksi yang tampil di beranda (mozaik artikel, strip video, menu pilar). */
  const DI_BERANDA: ReadonlySet<KoleksiPublik> = new Set(['artikel', 'pilar', 'video'])

  export type DokumenTag = { id: number | string; slug?: string | null }

  /**
   * Tag yang harus direvalidasi saat dokumen berubah. `slugPilar` berisi slug pilar dokumen sekarang
   * dan sebelumnya (artikel pindah pilar, pilar ganti slug), sudah di-resolve pemanggil.
   */
  export function tagRevalidasi(koleksi: KoleksiPublik, doc: DokumenTag, slugPilar: (string | null | undefined)[] = []): string[] {
    const tag = new Set<string>([koleksi, TAG.dokumen(koleksi, doc.id)])
    for (const slug of slugPilar) if (slug) tag.add(TAG.pilar(slug))
    if (DI_BERANDA.has(koleksi)) tag.add(TAG.beranda)
    tag.add(TAG.sitemap)
    return [...tag]
  }
  ```

  `src/hooks/revalidasiPublik.ts`

  ```ts
  import { revalidateTag } from 'next/cache'
  import type {
    CollectionAfterChangeHook,
    CollectionAfterDeleteHook,
    CollectionBeforeChangeHook,
    GlobalAfterChangeHook,
    PayloadRequest,
  } from 'payload'

  import { TAG, tagRevalidasi, type KoleksiPublik } from '@/lib/tag'

  export type PemicuRevalidasi = (tag: string) => void

  /**
   * `{ expire: 0 }`: data langsung kedaluwarsa, permintaan berikutnya (termasuk crawler yang dipanggil
   * Mesin Indexing tepat setelah terbit) menunggu data baru, bukan menerima versi lama. Dokumentasi
   * Next 16 menyarankan bentuk ini untuk revalidasi dari luar Server Action (route handler Payload).
   *
   * Di luar server Next (`npm run seed`, tes, skrip `payload run`) tidak ada cache yang perlu dibuang dan
   * `revalidateTag` melempar "static generation store missing"; galat itu sengaja diabaikan.
   */
  const pemicuNext: PemicuRevalidasi = (tag) => {
    try {
      revalidateTag(tag, { expire: 0 })
    } catch (galat) {
      if (!String((galat as Error)?.message).includes('static generation store missing')) throw galat
    }
  }

  let pemicu: PemicuRevalidasi = pemicuNext

  /** Mengganti pemicu (tes). Mengembalikan pemicu sebelumnya supaya bisa dipulihkan. */
  export function pakaiPemicuRevalidasi(baru: PemicuRevalidasi | null): PemicuRevalidasi {
    const lama = pemicu
    pemicu = baru ?? pemicuNext
    return lama
  }

  export function revalidasi(tag: string[]): void {
    for (const t of new Set(tag)) pemicu(t)
  }

  type DokumenPublik = {
    id: number | string
    slug?: string | null
    _status?: 'draft' | 'published' | null
    pilar?: unknown
  }

  /** Slug pilar dari relasi (ID atau dokumen). ID di-resolve dengan satu query kecil. */
  async function slugPilar(req: PayloadRequest, relasi: unknown[]): Promise<string[]> {
    const slug: string[] = []
    const id: (number | string)[] = []
    for (const r of relasi) {
      if (r && typeof r === 'object') {
        const s = (r as { slug?: string | null }).slug
        if (s) slug.push(s)
      } else if (typeof r === 'number' || typeof r === 'string') {
        id.push(r)
      }
    }
    if (id.length) {
      const { docs } = await req.payload.find({
        collection: 'pilar',
        where: { id: { in: id } },
        depth: 0,
        limit: id.length,
        select: { slug: true },
        req,
      })
      for (const d of docs) if (d.slug) slug.push(d.slug)
    }
    return slug
  }

  async function tagDokumen(koleksi: KoleksiPublik, doc: DokumenPublik, sebelumnya: DokumenPublik | undefined, req: PayloadRequest) {
    const pilar =
      koleksi === 'pilar'
        ? [doc.slug, sebelumnya?.slug]
        : await slugPilar(req, [doc.pilar, sebelumnya?.pilar])
    return tagRevalidasi(koleksi, doc, pilar)
  }

  const kunciKonteks = (koleksi: string, id: unknown) => `publikSebelumnya:${koleksi}:${String(id)}`

  /** Status dokumen utama (versi publik), bukan versi draf terakhir. */
  async function statusUtama(req: PayloadRequest, koleksi: string, id: number | string) {
    const utama = await req.payload.findByID({ collection: koleksi as 'artikel', id, draft: false, depth: 0, req, disableErrors: true })
    return utama?._status
  }

  /**
   * Hook revalidasi untuk koleksi publik.
   *
   * Koleksi dengan draf: menyimpan draf (termasuk autosave) tidak mengubah halaman publik, jadi tidak
   * merevalidasi. Yang merevalidasi hanya terbit, batal terbit, dan hapus. Status dokumen utama (versi
   * publik) dicatat di `beforeChange` karena di `afterChange` dokumen utama sudah tertimpa dan
   * `previousDoc` berisi versi terakhir (bisa draf), pola yang sama dengan `redirectSaatPathBerubah`.
   */
  export function revalidasiPublik(koleksi: KoleksiPublik): {
    beforeChange: CollectionBeforeChangeHook
    afterChange: CollectionAfterChangeHook
    afterDelete: CollectionAfterDeleteHook
  } {
    const beforeChange: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, req, collection }) => {
      if (!collection.versions?.drafts || operation !== 'update' || !originalDoc) return data
      if (data._status === 'published') return data
      // `originalDoc` adalah versi terakhir. Bila versi itu terbit, dokumen utama pasti terbit.
      const tadinyaPublik =
        originalDoc._status === 'published' || (await statusUtama(req, collection.slug, originalDoc.id)) === 'published'
      req.context[kunciKonteks(collection.slug, originalDoc.id)] = tadinyaPublik
      return data
    }

    const afterChange: CollectionAfterChangeHook = async ({ doc, previousDoc, req, collection, operation }) => {
      const publik = doc as DokumenPublik
      const lama = previousDoc as DokumenPublik | undefined
      if (collection.versions?.drafts && publik._status !== 'published') {
        const kunci = kunciKonteks(collection.slug, publik.id)
        const tadinyaPublik = req.context[kunci] === true
        delete req.context[kunci]
        // Batal terbit: dokumen utama tadinya terbit dan sekarang draf. Selain itu hanya simpan draf.
        if (operation === 'create' || !tadinyaPublik || (await statusUtama(req, collection.slug, publik.id)) === 'published') return doc
      }
      revalidasi(await tagDokumen(koleksi, publik, lama, req))
      return doc
    }

    const afterDelete: CollectionAfterDeleteHook = async ({ doc, req }) => {
      revalidasi(await tagDokumen(koleksi, doc as DokumenPublik, undefined, req))
      return doc
    }

    return { beforeChange, afterChange, afterDelete }
  }

  /** Pengaturan SEO memengaruhi robots.txt, metadata semua halaman, dan URL absolut di sitemap. */
  export const revalidasiPengaturanSeo: GlobalAfterChangeHook = ({ doc }) => {
    revalidasi([TAG.pengaturanSeo, TAG.sitemap])
    return doc
  }
  ```

- [ ] **Langkah 4: Pasang hook di koleksi publik dan global pengaturan SEO**

  ```diff
  diff --git a/src/collections/Artikel.ts b/src/collections/Artikel.ts
  index d3f2a9f..b074e93 100644
  --- a/src/collections/Artikel.ts
  +++ b/src/collections/Artikel.ts
  @@ -8,6 +8,7 @@ import { seoField } from '@/fields/seo'
   import { slugField } from '@/fields/slug'
   import { catatTanggalArtikel } from '@/hooks/catatTanggalArtikel'
   import { redirectSaatPathBerubah } from '@/hooks/redirectSaatPathBerubah'
  +import { revalidasiPublik } from '@/hooks/revalidasiPublik'
   import { LABEL_TIPE_ARTIKEL, TIPE_ARTIKEL, type TipeArtikel } from '@/lib/konstanta'
   import { validasiLebarGambar } from '@/lib/media'
   import type { TargetPath } from '@/lib/paths'
  @@ -23,6 +24,7 @@ const targetArtikel = (doc: { slug?: string | null; tipe?: unknown }): TargetPat
     doc.slug && doc.tipe ? { jenis: 'artikel', slug: doc.slug, tipe: doc.tipe as TipeArtikel } : null
   
   const redirect = redirectSaatPathBerubah(targetArtikel)
  +const revalidasi = revalidasiPublik('artikel')
   
   export const Artikel: CollectionConfig = {
     slug: 'artikel',
  @@ -38,8 +40,9 @@ export const Artikel: CollectionConfig = {
       maxPerDoc: 50,
     },
     hooks: {
  -    beforeChange: [catatTanggalArtikel, redirect.catatPathPublik],
  -    afterChange: [redirect.buatRedirect],
  +    beforeChange: [catatTanggalArtikel, redirect.catatPathPublik, revalidasi.beforeChange],
  +    afterChange: [redirect.buatRedirect, revalidasi.afterChange],
  +    afterDelete: [revalidasi.afterDelete],
     },
     fields: [
       { name: 'judul', type: 'text', required: true },
  ```

  ```diff
  diff --git a/src/collections/Pilar.ts b/src/collections/Pilar.ts
  index 8b31ec7..147816d 100644
  --- a/src/collections/Pilar.ts
  +++ b/src/collections/Pilar.ts
  @@ -4,9 +4,11 @@ import { anyone, isAdmin } from '@/access'
   import { seoField } from '@/fields/seo'
   import { slugField } from '@/fields/slug'
   import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
  +import { revalidasiPublik } from '@/hooks/revalidasiPublik'
   import { WARNA_PILAR } from '@/lib/konstanta'
   
   const redirect = redirectSaatPathBerubah(targetSederhana('pilar'))
  +const revalidasi = revalidasiPublik('pilar')
   
   export const Pilar: CollectionConfig = {
     slug: 'pilar',
  @@ -20,7 +22,8 @@ export const Pilar: CollectionConfig = {
     access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
     hooks: {
       beforeChange: [redirect.catatPathPublik],
  -    afterChange: [redirect.buatRedirect],
  +    afterChange: [redirect.buatRedirect, revalidasi.afterChange],
  +    afterDelete: [revalidasi.afterDelete],
     },
     fields: [
       { name: 'nama', type: 'text', required: true },
  ```

  ```diff
  diff --git a/src/collections/Subkategori.ts b/src/collections/Subkategori.ts
  index f51cb8e..aa2ccc6 100644
  --- a/src/collections/Subkategori.ts
  +++ b/src/collections/Subkategori.ts
  @@ -3,12 +3,16 @@ import type { CollectionConfig } from 'payload'
   import { anyone, isAdmin } from '@/access'
   import { seoField } from '@/fields/seo'
   import { slugField } from '@/fields/slug'
  +import { revalidasiPublik } from '@/hooks/revalidasiPublik'
  +
  +const revalidasi = revalidasiPublik('subkategori')
   
   export const Subkategori: CollectionConfig = {
     slug: 'subkategori',
     labels: { singular: 'Subkategori', plural: 'Subkategori' },
     admin: { useAsTitle: 'nama', defaultColumns: ['nama', 'pilar', 'slug'], group: 'Konten' },
     access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  +  hooks: { afterChange: [revalidasi.afterChange], afterDelete: [revalidasi.afterDelete] },
     fields: [
       { name: 'nama', type: 'text', required: true },
       slugField('nama'),
  ```

  ```diff
  diff --git a/src/collections/Penulis.ts b/src/collections/Penulis.ts
  index 75cf4fe..84d7042 100644
  --- a/src/collections/Penulis.ts
  +++ b/src/collections/Penulis.ts
  @@ -4,9 +4,11 @@ import { anyone, isLoggedIn } from '@/access'
   import { seoField } from '@/fields/seo'
   import { slugField } from '@/fields/slug'
   import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
  +import { revalidasiPublik } from '@/hooks/revalidasiPublik'
   import { validasiUrlOpsional } from '@/lib/validasi'
   
   const redirect = redirectSaatPathBerubah(targetSederhana('penulis'))
  +const revalidasi = revalidasiPublik('penulis')
   
   export const Penulis: CollectionConfig = {
     slug: 'penulis',
  @@ -15,7 +17,8 @@ export const Penulis: CollectionConfig = {
     access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
     hooks: {
       beforeChange: [redirect.catatPathPublik],
  -    afterChange: [redirect.buatRedirect],
  +    afterChange: [redirect.buatRedirect, revalidasi.afterChange],
  +    afterDelete: [revalidasi.afterDelete],
     },
     fields: [
       { name: 'nama', type: 'text', required: true },
  ```

  ```diff
  diff --git a/src/collections/Tools.ts b/src/collections/Tools.ts
  index 7d5914b..feb9312 100644
  --- a/src/collections/Tools.ts
  +++ b/src/collections/Tools.ts
  @@ -5,9 +5,11 @@ import { faqField, sumberField } from '@/fields/konten'
   import { seoField } from '@/fields/seo'
   import { slugField } from '@/fields/slug'
   import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
  +import { revalidasiPublik } from '@/hooks/revalidasiPublik'
   import { LABEL_TOOL, TOOL_IDS } from '@/lib/konstanta'
   
   const redirect = redirectSaatPathBerubah(targetSederhana('tools'))
  +const revalidasi = revalidasiPublik('tools')
   
   export const Tools: CollectionConfig = {
     slug: 'tools',
  @@ -15,8 +17,9 @@ export const Tools: CollectionConfig = {
     admin: { useAsTitle: 'nama', defaultColumns: ['nama', 'toolId', 'pilar', '_status'], group: 'Tools' },
     access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
     hooks: {
  -    beforeChange: [redirect.catatPathPublik],
  -    afterChange: [redirect.buatRedirect],
  +    beforeChange: [redirect.catatPathPublik, revalidasi.beforeChange],
  +    afterChange: [redirect.buatRedirect, revalidasi.afterChange],
  +    afterDelete: [revalidasi.afterDelete],
     },
     versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 50 },
     fields: [
  ```

  ```diff
  diff --git a/src/collections/Video.ts b/src/collections/Video.ts
  index 2226369..545e88d 100644
  --- a/src/collections/Video.ts
  +++ b/src/collections/Video.ts
  @@ -4,9 +4,11 @@ import { isLoggedIn, publishedOrLoggedIn } from '@/access'
   import { seoField } from '@/fields/seo'
   import { slugField } from '@/fields/slug'
   import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
  +import { revalidasiPublik } from '@/hooks/revalidasiPublik'
   
   /** Artikel induk tidak disimpan di sini: frontend mencari artikel yang `videoTerkait`-nya video ini. */
   const redirect = redirectSaatPathBerubah(targetSederhana('video'))
  +const revalidasi = revalidasiPublik('video')
   
   export const Video: CollectionConfig = {
     slug: 'video',
  @@ -14,8 +16,9 @@ export const Video: CollectionConfig = {
     admin: { useAsTitle: 'judul', defaultColumns: ['judul', 'pilar', 'durasiDetik', '_status'], group: 'Konten' },
     access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
     hooks: {
  -    beforeChange: [redirect.catatPathPublik],
  -    afterChange: [redirect.buatRedirect],
  +    beforeChange: [redirect.catatPathPublik, revalidasi.beforeChange],
  +    afterChange: [redirect.buatRedirect, revalidasi.afterChange],
  +    afterDelete: [revalidasi.afterDelete],
     },
     versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 30 },
     fields: [
  ```

  ```diff
  diff --git a/src/collections/Halaman.ts b/src/collections/Halaman.ts
  index b1ba271..c1ae147 100644
  --- a/src/collections/Halaman.ts
  +++ b/src/collections/Halaman.ts
  @@ -5,8 +5,10 @@ import { blokHalaman } from '@/blocks/halaman'
   import { seoField } from '@/fields/seo'
   import { slugField } from '@/fields/slug'
   import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
  +import { revalidasiPublik } from '@/hooks/revalidasiPublik'
   
   const redirect = redirectSaatPathBerubah(targetSederhana('halaman'))
  +const revalidasi = revalidasiPublik('halaman')
   
   export const Halaman: CollectionConfig = {
     slug: 'halaman',
  @@ -15,8 +17,9 @@ export const Halaman: CollectionConfig = {
     access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
     versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 30 },
     hooks: {
  -    beforeChange: [redirect.catatPathPublik],
  -    afterChange: [redirect.buatRedirect],
  +    beforeChange: [redirect.catatPathPublik, revalidasi.beforeChange],
  +    afterChange: [redirect.buatRedirect, revalidasi.afterChange],
  +    afterDelete: [revalidasi.afterDelete],
     },
     fields: [
       { name: 'judul', type: 'text', required: true },
  ```

  ```diff
  diff --git a/src/globals/PengaturanSEO.ts b/src/globals/PengaturanSEO.ts
  index 5c3c28e..d1b73aa 100644
  --- a/src/globals/PengaturanSEO.ts
  +++ b/src/globals/PengaturanSEO.ts
  @@ -1,6 +1,7 @@
   import type { GlobalConfig } from 'payload'
   
   import { anyone, isAdmin } from '@/access'
  +import { revalidasiPengaturanSeo } from '@/hooks/revalidasiPublik'
   import { validasiPolaJudul } from '@/lib/seo-dasar'
   import { validasiUrlOpsional } from '@/lib/validasi'
   
  @@ -10,6 +11,7 @@ export const PengaturanSEO: GlobalConfig = {
     label: 'Pengaturan SEO',
     admin: { group: 'SEO' },
     access: { read: anyone, update: isAdmin },
  +  hooks: { afterChange: [revalidasiPengaturanSeo] },
     fields: [
       { name: 'namaSitus', type: 'text', required: true, defaultValue: 'point.' },
       {
  ```

- [ ] **Langkah 5: Pastikan skema tidak berubah, jalankan semua tes**

  Jalankan:

  ```bash
  npm run generate:types && git diff --stat src/payload-types.ts
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: `payload-types.ts` tidak berubah (hanya hook yang ditambah); type check dan lint bersih; unit `Test Files 23 passed (23)`, `Tests 178 passed (178)`; integrasi `Test Files 11 passed (11)`, `Tests 37 passed (37)`.

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/lib/tag.ts src/hooks/revalidasiPublik.ts src/collections/Artikel.ts src/collections/Pilar.ts \
    src/collections/Subkategori.ts src/collections/Penulis.ts src/collections/Tools.ts src/collections/Video.ts \
    src/collections/Halaman.ts src/globals/PengaturanSEO.ts tests/unit/tag.test.ts tests/int/revalidasi.int.spec.ts
  git commit -m "feat(seo): tag cache dan revalidasi saat konten publik berubah"
  ```


### Task 7: Rute sitemap index, sitemap per jenis, news sitemap, robots.txt, dan RSS

**Files:**
- Create: `src/modules/seo/data.ts`, `src/modules/seo/rute.ts`, `src/app/(frontend)/sitemap.xml/route.ts`, `src/app/(frontend)/sitemap/[jenis]/route.ts`, `src/app/(frontend)/news-sitemap.xml/route.ts`, `src/app/(frontend)/robots.txt/route.ts`, `src/app/(frontend)/feed.xml/route.ts`
- Test: `tests/unit/seo-data.test.ts`, `tests/int/sitemap.int.spec.ts`

**Interfaces:**
- Consumes: Task 5 (`xml.ts`, `sitemap.ts`), `PATH_FEED` (Task 2), `TAG` (Task 6), `unstable_cache` (`next/cache`), `getPayload` + `@payload-config`.
- Produces:
  - `src/modules/seo/data.ts`: `JUMLAH_FEED = 30`, `syaratSitemap(jenis): Where`, `syaratNews(sekarang): Where`, `ambilPengaturan(payload): Promise<PengaturanSitus>`, `ambilEntriSitemap(payload, jenis, situs)`, `ambilIndexSitemap(payload, situs)`, `ambilEntriNews(payload, situs, sekarang)`, `ambilEntriFeed(payload, situs)`, `TAG_RUTE = { sitemap: ['sitemap', 'pengaturan-seo'], robots: ['pengaturan-seo'] }`.
  - `src/modules/seo/rute.ts`: `isiSitemapIndex()`, `isiSitemap(jenis)`, `isiNewsSitemap()`, `isiRobots()`, `isiFeed()` (semuanya `unstable_cache` bertag), `respons(isi, 'xml' | 'rss' | 'teks'): Response`.
  - Rute publik: `GET /sitemap.xml`, `GET /sitemap/{artikel|pilar|tools|video|penulis|halaman}.xml` (selain itu 404), `GET /news-sitemap.xml`, `GET /robots.txt`, `GET /feed.xml`.

Keputusan:

- **Route handler biasa, bukan konvensi `sitemap.ts`/`robots.ts` Next.** `generateSitemaps` di Next 16 hanya menghasilkan `/sitemap/{id}.xml` tanpa sitemap index (dokumentasi `generate-sitemaps.md`), dan `MetadataRoute.Sitemap` tidak mendukung namespace Google News. Folder bernama `sitemap.xml`, `robots.txt`, `feed.xml` di `app/` berisi `route.ts` biasa; Next mengenalinya sebagai rute biasa dan build mencantumkannya sebagai `ƒ /sitemap.xml` dan seterusnya. Segmen dinamis `/sitemap/[jenis]` menerima `artikel.xml` lalu membuang akhiran `.xml`.
- **Cache bertag di level data**, bukan di level rute. Proyek belum memakai Cache Components, jadi data dibungkus `unstable_cache(fn, key, { tags, revalidate: 3600 })` (dokumentasi Next 16 "Caching (Previous Model)"). Rute memakai `dynamic = 'force-dynamic'` supaya build tidak mencoba merender rute ini (database belum tentu ada saat build); `force-dynamic` tidak mematikan `unstable_cache` (hanya `fetchCache = 'force-no-store'` yang mematikannya). `revalidate: 3600` menjaga news sitemap tetap segar karena jendelanya bergantung jam, dan menjadi jaring pengaman bila revalidasi terlewat. Saat proyek beralih ke `'use cache'`, cukup `rute.ts` yang diganti.
- **Query:** koleksi dengan draf memakai `_status: published` (dokumen utama, jadi draf di atas versi terbit tidak menghapus URL dari sitemap); semua menolak `seo.noindex`. Depth 0 untuk sitemap (path cukup slug dan tipe). RSS memakai `select` + `populate` supaya hanya nama penulis dan nama pilar yang dimuat: media tidak ikut dimuat, sehingga rute tidak membangun URL Cloudinary (di `next start` tanpa kredensial, membangun URL media melempar galat produksi dari modul media).
- **Header:** `Content-Type` XML/RSS/teks dengan `charset=utf-8`, `Cache-Control: public, max-age=0, s-maxage=300, stale-while-revalidate=600`.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/seo-data.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { syaratNews, syaratSitemap, TAG_RUTE } from '@/modules/seo/data'

  describe('query rute teknis', () => {
    it('koleksi dengan draf hanya mengambil versi terbit; semua menolak noindex', () => {
      expect(syaratSitemap('artikel')).toEqual({
        and: [{ 'seo.noindex': { not_equals: true } }, { _status: { equals: 'published' } }],
      })
      expect(syaratSitemap('pilar')).toEqual({ and: [{ 'seo.noindex': { not_equals: true } }] })
      expect(syaratSitemap('penulis')).toEqual({ and: [{ 'seo.noindex': { not_equals: true } }] })
    })

    it('news sitemap: 48 jam terakhir sampai sekarang', () => {
      expect(syaratNews(new Date('2026-11-04T03:00:00.000Z'))).toEqual({
        and: [
          { _status: { equals: 'published' } },
          { 'seo.noindex': { not_equals: true } },
          { terbitPada: { greater_than_equal: '2026-11-02T03:00:00.000Z' } },
          { terbitPada: { less_than_equal: '2026-11-04T03:00:00.000Z' } },
        ],
      })
    })

    it('rute sitemap dan RSS ikut tag sitemap; robots ikut pengaturan SEO', () => {
      expect(TAG_RUTE).toEqual({ sitemap: ['sitemap', 'pengaturan-seo'], robots: ['pengaturan-seo'] })
    })
  })
  ```

  `tests/int/sitemap.int.spec.ts`

  ```ts
  import { beforeAll, describe, expect, it } from 'vitest'

  import { ambilEntriFeed, ambilEntriNews, ambilEntriSitemap, ambilIndexSitemap, ambilPengaturan } from '@/modules/seo/data'
  import type { PengaturanSitus } from '@/modules/seo/tipe'
  import { saringNews } from '@/modules/seo/xml'

  import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
  import { getTestPayload, unik } from './helpers'

  let situs: PengaturanSitus
  const url = (path: string) => new URL(path, situs.urlSitus).toString()

  describe('data rute teknis dari Payload', () => {
    let terbit: { slug?: string | null; id: number }
    let glosarium: { slug?: string | null }
    let noindex: { slug?: string | null }
    let draf: { slug?: string | null }

    beforeAll(async () => {
      const payload = await getTestPayload()
      situs = await ambilPengaturan(payload)
      const relasi = await siapkanRelasiArtikel(payload)
      terbit = await payload.create({ collection: 'artikel', data: dataArtikelTerbit(relasi) })
      glosarium = await payload.create({
        collection: 'artikel',
        data: { ...dataArtikelTerbit(relasi), tipe: 'glosarium', judul: unik('PTKP') },
      })
      noindex = await payload.create({
        collection: 'artikel',
        data: { ...dataArtikelTerbit(relasi), seo: { noindex: true } },
      })
      draf = await payload.create({ collection: 'artikel', draft: true, data: { judul: unik('Draf sitemap') } })
    })

    it('pengaturan SEO memakai nilai bawaan global', () => {
      expect(situs).toMatchObject({ namaSitus: 'point.', urlSitus: 'https://point.lat', polaJudul: '%s · point.' })
    })

    it('sitemap artikel: hanya terbit dan tidak noindex, glosarium di /glosarium', async () => {
      const payload = await getTestPayload()
      const entri = await ambilEntriSitemap(payload, 'artikel', situs)
      const loc = entri.map((e) => e.loc)
      expect(loc).toContain(url(`/${terbit.slug}`))
      expect(loc).toContain(url(`/glosarium/${glosarium.slug}`))
      expect(loc).not.toContain(url(`/${noindex.slug}`))
      expect(loc).not.toContain(url(`/${draf.slug}`))
      expect(entri.find((e) => e.loc === url(`/${terbit.slug}`))?.lastmod).toBeTruthy()
    })

    it('perubahan besar menggeser lastmod; simpan biasa tidak', async () => {
      const payload = await getTestPayload()
      const sebelum = (await ambilEntriSitemap(payload, 'artikel', situs)).find((e) => e.loc === url(`/${terbit.slug}`))
      await payload.update({ collection: 'artikel', id: terbit.id, data: { _status: 'published', deck: 'Deck baru.' } })
      const biasa = (await ambilEntriSitemap(payload, 'artikel', situs)).find((e) => e.loc === url(`/${terbit.slug}`))
      expect(biasa?.lastmod).toBe(sebelum?.lastmod)

      await payload.update({ collection: 'artikel', id: terbit.id, data: { _status: 'published', perubahanBesar: true } })
      const besar = (await ambilEntriSitemap(payload, 'artikel', situs)).find((e) => e.loc === url(`/${terbit.slug}`))
      expect(new Date(besar?.lastmod as string).getTime()).toBeGreaterThan(new Date(sebelum?.lastmod as string).getTime())
    })

    it('draf yang ditulis di atas versi terbit tidak menghapus URL dari sitemap', async () => {
      const payload = await getTestPayload()
      await payload.update({ collection: 'artikel', id: terbit.id, draft: true, data: { judul: 'Revisi belum terbit' } })
      const loc = (await ambilEntriSitemap(payload, 'artikel', situs)).map((e) => e.loc)
      expect(loc).toContain(url(`/${terbit.slug}`))
    })

    it('sitemap index mencantumkan enam jenis', async () => {
      const payload = await getTestPayload()
      const index = await ambilIndexSitemap(payload, situs)
      expect(index.map((e) => e.loc)).toEqual(
        ['artikel', 'pilar', 'tools', 'video', 'penulis', 'halaman'].map((j) => url(`/sitemap/${j}.xml`)),
      )
      expect(index[0].lastmod).toBeTruthy()
    })

    it('halaman draf dari seed tidak masuk sitemap halaman', async () => {
      const payload = await getTestPayload()
      const halaman = await payload.create({ collection: 'halaman', draft: true, data: { judul: unik('Draf halaman') } })
      const loc = (await ambilEntriSitemap(payload, 'halaman', situs)).map((e) => e.loc)
      expect(loc).not.toContain(url(`/${halaman.slug}`))
    })

    it('news sitemap dan RSS memuat artikel baru', async () => {
      const payload = await getTestPayload()
      const sekarang = new Date()
      const news = saringNews(await ambilEntriNews(payload, situs, sekarang), sekarang)
      expect(news.map((e) => e.loc)).toContain(url(`/${terbit.slug}`))
      expect(news.map((e) => e.loc)).not.toContain(url(`/${noindex.slug}`))

      const feed = await ambilEntriFeed(payload, situs)
      const item = feed.find((e) => e.link === url(`/glosarium/${glosarium.slug}`))
      expect(item?.penulis).toBeTruthy()
      expect(item?.kategori).toBeTruthy()
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/seo-data.test.ts` dengan `Cannot find package '@/modules/seo/data'`.

- [ ] **Langkah 3: Tulis pengambil data**

  `src/modules/seo/data.ts`

  ```ts
  import type { Payload, Where } from 'payload'

  import { TAG } from '@/lib/tag'

  import { entriFeed, entriNews, entriSitemap } from './sitemap'
  import type { ArtikelSeo, MasukanSeo, PengaturanSitus } from './tipe'
  import {
    JENDELA_NEWS_MS,
    JENIS_SITEMAP,
    MAKS_URL_NEWS,
    MAKS_URL_SITEMAP,
    pathSitemap,
    terbaru,
    type EntriFeed,
    type EntriIndex,
    type EntriNews,
    type EntriSitemap,
    type JenisSitemap,
  } from './xml'

  /**
   * Data untuk rute teknis. Fungsi di sini membaca Payload; pembentukan XML ada di `xml.ts`.
   * Rute membungkusnya dengan `unstable_cache` bertag (lihat `cache.ts`).
   */

  /** Koleksi dengan draf: hanya versi terbit yang masuk sitemap. Pilar dan penulis tanpa draf. */
  const PAKAI_DRAF: Record<JenisSitemap, boolean> = {
    artikel: true,
    pilar: false,
    tools: true,
    video: true,
    penulis: false,
    halaman: true,
  }

  /** Jumlah artikel di RSS. */
  export const JUMLAH_FEED = 30

  /** Filter query sitemap: terbit dan tidak noindex. Disaring lagi di `layakSitemap` (canonical). */
  export function syaratSitemap(jenis: JenisSitemap): Where {
    const syarat: Where[] = [{ 'seo.noindex': { not_equals: true } }]
    if (PAKAI_DRAF[jenis]) syarat.push({ _status: { equals: 'published' } })
    return { and: syarat }
  }

  /** Artikel terbit (non-glosarium tetap ikut) dalam jendela news sitemap. */
  export function syaratNews(sekarang: Date): Where {
    return {
      and: [
        { _status: { equals: 'published' } },
        { 'seo.noindex': { not_equals: true } },
        { terbitPada: { greater_than_equal: new Date(sekarang.getTime() - JENDELA_NEWS_MS).toISOString() } },
        { terbitPada: { less_than_equal: sekarang.toISOString() } },
      ],
    }
  }

  export async function ambilPengaturan(payload: Payload): Promise<PengaturanSitus> {
    return (await payload.findGlobal({ slug: 'pengaturan-seo', depth: 1 })) as PengaturanSitus
  }

  const tipePath: Record<JenisSitemap, MasukanSeo['jenis']> = {
    artikel: 'artikel',
    pilar: 'pilar',
    tools: 'tools',
    video: 'video',
    penulis: 'penulis',
    halaman: 'halaman',
  }

  /** Entri satu sitemap jenis. Depth 0 cukup: path artikel hanya butuh slug dan tipe. */
  export async function ambilEntriSitemap(payload: Payload, jenis: JenisSitemap, situs: Pick<PengaturanSitus, 'urlSitus'>): Promise<EntriSitemap[]> {
    const { docs } = await payload.find({
      collection: jenis,
      where: syaratSitemap(jenis),
      depth: 0,
      limit: MAKS_URL_SITEMAP,
      pagination: false,
      sort: '-updatedAt',
    })
    const masukan = docs.map((doc) => ({ jenis: tipePath[jenis], doc }) as MasukanSeo)
    return entriSitemap(masukan, situs)
  }

  /** Isi sitemap index: semua jenis, `lastmod` = entri terbaru jenis itu. Jenis kosong tetap dicantumkan. */
  export async function ambilIndexSitemap(payload: Payload, situs: Pick<PengaturanSitus, 'urlSitus'>): Promise<EntriIndex[]> {
    const hasil: EntriIndex[] = []
    for (const jenis of JENIS_SITEMAP) {
      const entri = await ambilEntriSitemap(payload, jenis, situs)
      hasil.push({ loc: new URL(pathSitemap(jenis), situs.urlSitus).toString(), lastmod: terbaru(entri.map((e) => e.lastmod)) })
    }
    return hasil
  }

  export async function ambilEntriNews(payload: Payload, situs: Pick<PengaturanSitus, 'urlSitus'>, sekarang: Date): Promise<EntriNews[]> {
    const { docs } = await payload.find({
      collection: 'artikel',
      where: syaratNews(sekarang),
      depth: 0,
      limit: MAKS_URL_NEWS,
      pagination: false,
      sort: '-terbitPada',
    })
    return entriNews(docs as ArtikelSeo[], situs)
  }

  /**
   * RSS hanya butuh teks, nama penulis, dan nama pilar. `select` dan `populate` membatasi relasi supaya
   * media (gambar utama, foto penulis, gambar OG) tidak ikut dimuat: lebih ringan, dan URL media tidak
   * dibangun sama sekali.
   */
  export async function ambilEntriFeed(payload: Payload, situs: PengaturanSitus): Promise<EntriFeed[]> {
    const { docs } = await payload.find({
      collection: 'artikel',
      where: { and: [{ _status: { equals: 'published' } }, { 'seo.noindex': { not_equals: true } }] },
      depth: 1,
      limit: JUMLAH_FEED,
      sort: '-terbitPada',
      select: {
        judul: true,
        slug: true,
        tipe: true,
        deck: true,
        terbitPada: true,
        penulis: true,
        pilar: true,
        seo: { metaDeskripsi: true, canonical: true, noindex: true },
      },
      populate: { penulis: { nama: true }, pilar: { nama: true } },
    })
    return entriFeed(docs as ArtikelSeo[], situs)
  }

  /** Tag cache tiap rute teknis. `sitemap` direvalidasi setiap konten publik berubah (Task 6). */
  export const TAG_RUTE = {
    sitemap: [TAG.sitemap, TAG.pengaturanSeo],
    robots: [TAG.pengaturanSeo],
  } as const
  ```

- [ ] **Langkah 4: Tulis isi rute bertag cache**

  `src/modules/seo/rute.ts`

  ```ts
  import config from '@payload-config'
  import { unstable_cache } from 'next/cache'
  import { getPayload } from 'payload'

  import { PATH_FEED } from './metadata'
  import { ambilEntriFeed, ambilEntriNews, ambilEntriSitemap, ambilIndexSitemap, ambilPengaturan, TAG_RUTE } from './data'
  import {
    saringNews,
    teksRobots,
    xmlFeed,
    xmlNewsSitemap,
    xmlSitemap,
    xmlSitemapIndex,
    type JenisSitemap,
  } from './xml'

  /**
   * Isi rute teknis, di-cache dengan tag supaya hook revalidasi (Task 6) dan Mesin Indexing
   * (Rencana 6) bisa membuangnya. `unstable_cache` dipakai karena proyek belum memakai Cache
   * Components; saat beralih ke `'use cache'`, cukup ganti pembungkus di file ini.
   *
   * `revalidate: 3600` adalah jaring pengaman: news sitemap bergantung pada jam (jendela 48 jam),
   * jadi isinya tetap segar walau tidak ada artikel baru yang memicu revalidasi.
   */
  const SEJAM = 3600

  const payload = () => getPayload({ config })

  export const isiSitemapIndex = unstable_cache(
    async () => {
      const p = await payload()
      const situs = await ambilPengaturan(p)
      return xmlSitemapIndex(await ambilIndexSitemap(p, situs))
    },
    ['seo', 'sitemap-index'],
    { tags: [...TAG_RUTE.sitemap], revalidate: SEJAM },
  )

  export const isiSitemap = unstable_cache(
    async (jenis: JenisSitemap) => {
      const p = await payload()
      const situs = await ambilPengaturan(p)
      return xmlSitemap(await ambilEntriSitemap(p, jenis, situs))
    },
    ['seo', 'sitemap-jenis'],
    { tags: [...TAG_RUTE.sitemap], revalidate: SEJAM },
  )

  export const isiNewsSitemap = unstable_cache(
    async () => {
      const p = await payload()
      const situs = await ambilPengaturan(p)
      const sekarang = new Date()
      const entri = saringNews(await ambilEntriNews(p, situs, sekarang), sekarang)
      return xmlNewsSitemap(entri, { nama: situs.namaSitus })
    },
    ['seo', 'news-sitemap'],
    { tags: [...TAG_RUTE.sitemap], revalidate: SEJAM },
  )

  export const isiRobots = unstable_cache(
    async () => {
      const situs = await ambilPengaturan(await payload())
      return teksRobots({ urlSitus: situs.urlSitus, tambahan: situs.robotsTambahan })
    },
    ['seo', 'robots'],
    { tags: [...TAG_RUTE.robots], revalidate: SEJAM },
  )

  export const isiFeed = unstable_cache(
    async () => {
      const p = await payload()
      const situs = await ambilPengaturan(p)
      const beranda = new URL('/', situs.urlSitus).toString()
      return xmlFeed(
        {
          judul: situs.namaSitus,
          link: beranda,
          deskripsi: situs.metaDefault ?? situs.namaSitus,
          urlFeed: new URL(PATH_FEED, situs.urlSitus).toString(),
        },
        await ambilEntriFeed(p, situs),
      )
    },
    ['seo', 'feed'],
    { tags: [...TAG_RUTE.sitemap], revalidate: SEJAM },
  )

  /** Header respons rute teknis. CDN boleh menyimpan sebentar; isi sebenarnya dijaga cache bertag. */
  export function respons(isi: string, jenis: 'xml' | 'rss' | 'teks'): Response {
    const tipe = { xml: 'application/xml', rss: 'application/rss+xml', teks: 'text/plain' }[jenis]
    return new Response(isi, {
      headers: {
        'Content-Type': `${tipe}; charset=utf-8`,
        'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
      },
    })
  }
  ```

- [ ] **Langkah 5: Tulis lima route handler**

  `src/app/(frontend)/sitemap.xml/route.ts`

  ```ts
  import { isiSitemapIndex, respons } from '@/modules/seo/rute'

  /** Sitemap index (spesifikasi §7): menunjuk `/sitemap/{jenis}.xml`. Dirujuk dari robots.txt. */
  export const dynamic = 'force-dynamic'

  export async function GET() {
    return respons(await isiSitemapIndex(), 'xml')
  }
  ```

  `src/app/(frontend)/sitemap/[jenis]/route.ts`

  ```ts
  import { isiSitemap, respons } from '@/modules/seo/rute'
  import { isJenisSitemap } from '@/modules/seo/xml'

  /**
   * `/sitemap/{jenis}.xml`. Segmen `[jenis]` menerima `artikel.xml` dan seterusnya; akhiran `.xml`
   * dibuang lalu dicocokkan dengan `JENIS_SITEMAP`. Jenis lain menjawab 404.
   */
  export const dynamic = 'force-dynamic'

  export async function GET(_req: Request, { params }: { params: Promise<{ jenis: string }> }) {
    const { jenis: segmen } = await params
    const jenis = segmen.replace(/\.xml$/, '')
    if (!segmen.endsWith('.xml') || !isJenisSitemap(jenis)) return new Response('Sitemap tidak ditemukan.', { status: 404 })
    return respons(await isiSitemap(jenis), 'xml')
  }
  ```

  `src/app/(frontend)/news-sitemap.xml/route.ts`

  ```ts
  import { isiNewsSitemap, respons } from '@/modules/seo/rute'

  /** Google News sitemap: artikel terbit 48 jam terakhir. */
  export const dynamic = 'force-dynamic'

  export async function GET() {
    return respons(await isiNewsSitemap(), 'xml')
  }
  ```

  `src/app/(frontend)/robots.txt/route.ts`

  ```ts
  import { isiRobots, respons } from '@/modules/seo/rute'

  /** robots.txt: aturan bawaan + `robotsTambahan` dari pengaturan SEO + rujukan sitemap. */
  export const dynamic = 'force-dynamic'

  export async function GET() {
    return respons(await isiRobots(), 'teks')
  }
  ```

  `src/app/(frontend)/feed.xml/route.ts`

  ```ts
  import { isiFeed, respons } from '@/modules/seo/rute'

  /** RSS 2.0: 30 artikel terbit terbaru. */
  export const dynamic = 'force-dynamic'

  export async function GET() {
    return respons(await isiFeed(), 'rss')
  }
  ```

- [ ] **Langkah 6: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: type check dan lint bersih; unit `Test Files 24 passed (24)`, `Tests 181 passed (181)`; integrasi `Test Files 12 passed (12)`, `Tests 44 passed (44)`.

- [ ] **Langkah 7: Build dan uji asap rute teknis**

  Jalankan (database dev `pointlat`; seed membuat pilar, penulis redaksi, dan halaman draf):

  ```bash
  npm run build
  npm run seed
  cat > src/contoh-terbit.ts <<'TS'
  import config from '@payload-config'
  import { getPayload } from 'payload'
  import sharp from 'sharp'

  import { paragrafLexical } from '@/lib/lexical'

  const payload = await getPayload({ config })
  const pilar = (await payload.find({ collection: 'pilar', where: { slug: { equals: 'uang-karier' } }, limit: 1 })).docs[0]
  const penulis = (await payload.find({ collection: 'penulis', where: { slug: { equals: 'redaksi' } }, limit: 1 })).docs[0]
  const data = await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#1F7A4D' } }).png().toBuffer()
  const gambar = await payload.create({
    collection: 'media',
    data: { alt: 'Slip gaji contoh' },
    file: { data, mimetype: 'image/png', name: 'slip-gaji.png', size: data.length },
  })
  const artikel = await payload.create({
    collection: 'artikel',
    data: {
      _status: 'published',
      judul: 'Cara hitung gaji bersih & PPh 21',
      tipe: 'panduan',
      pilar: pilar.id,
      penulis: penulis.id,
      deck: 'Potongan PPh 21 dan BPJS dihitung langkah demi langkah.',
      intinya: [{ poin: 'Gaji bersih = gaji kotor dikurangi PPh 21 dan BPJS.' }, { poin: 'Tarif PPh 21 memakai TER.' }],
      gambarUtama: gambar.id,
      isi: paragrafLexical(['Gaji bersih adalah uang yang kamu terima.']),
    },
  })
  payload.logger.info(`Artikel contoh: /${artikel.slug} terbit ${artikel.terbitPada}`)
  process.exit(0)
  TS
  npm run payload -- run src/contoh-terbit.ts && rm src/contoh-terbit.ts
  (PORT=3113 npm run start > /tmp/point-lat-start.log 2>&1 &) && sleep 20   # sama dengan uji asap Rencana 2
  for p in /sitemap.xml /sitemap/artikel.xml /sitemap/pilar.xml /sitemap/halaman.xml /sitemap/lain.xml /news-sitemap.xml /robots.txt /feed.xml; do
    echo "== $p"; curl -s -D - "http://localhost:3113$p" | grep -iE '^HTTP|^content-type|<loc>|<news:title>|^Sitemap:|<item>' | head -12
  done
  ```

  Hasil yang diharapkan (tanggal mengikuti waktu menjalankan):
  - Build mencantumkan `ƒ /feed.xml`, `ƒ /news-sitemap.xml`, `ƒ /robots.txt`, `ƒ /sitemap.xml`, `ƒ /sitemap/[jenis]`.
  - `/sitemap.xml`: `200`, `application/xml; charset=utf-8`, enam `<sitemap>` (`artikel`, `pilar`, `tools`, `video`, `penulis`, `halaman`); `lastmod` hanya untuk jenis yang berisi.
  - `/sitemap/artikel.xml`: `<loc>https://point.lat/cara-hitung-gaji-bersih-dan-pph-21</loc>` dengan `lastmod` = waktu terbit.
  - `/sitemap/pilar.xml`: empat pilar seed. `/sitemap/halaman.xml`: `<urlset>` kosong (halaman seed masih draf). `/sitemap/lain.xml`: `404` dengan teks `Sitemap tidak ditemukan.`
  - `/news-sitemap.xml`: satu `<url>` dengan `<news:name>point.</news:name>`, `<news:language>id</news:language>`, `<news:title>Cara hitung gaji bersih &amp; PPh 21</news:title>`.
  - `/robots.txt`: `text/plain; charset=utf-8`, aturan bawaan lalu `Sitemap: https://point.lat/sitemap.xml` dan `Sitemap: https://point.lat/news-sitemap.xml`.
  - `/feed.xml`: `application/rss+xml; charset=utf-8`, satu `<item>` dengan `<dc:creator>Redaksi point.</dc:creator>` dan `<category>Uang &amp; Karier</category>`.

  Hentikan server (Ctrl+C di terminalnya, atau `pkill -f "next start"` dari terminal lain). Revalidasi saat terbit, simpan draf, dan batal terbit diuji di server dev pada Langkah 8, karena `next start` tanpa `CLOUDINARY_*` menolak membuat media (perlindungan produksi dari Rencana 2).

- [ ] **Langkah 8: Uji revalidasi di server yang berjalan**

  Jalankan `PORT=3114 npm run dev` di terminal lain, tunggu sampai `http://localhost:3114/robots.txt` menjawab, lalu:

  ```bash
  set -a && . ./.env && set +a
  B=http://localhost:3114
  TOKEN=$(curl -s -X POST $B/api/pengguna/login -H 'Content-Type: application/json' \
    -d "{\"email\":\"$SEED_ADMIN_EMAIL\",\"password\":\"$SEED_ADMIN_PASSWORD\"}" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).token))")
  curl -s $B/news-sitemap.xml | grep -o '<news:title>[^<]*'
  curl -s -o /tmp/baru.json -w "terbit %{http_code}\n" -X POST $B/api/artikel -H "Authorization: JWT $TOKEN" -H 'Content-Type: application/json' \
    -d '{"_status":"published","judul":"Explainer THR 2026","tipe":"explainer","pilar":1,"penulis":1,"deck":"THR wajib dibayar paling lambat tujuh hari sebelum hari raya.","intinya":[{"poin":"THR wajib untuk karyawan dengan masa kerja minimal satu bulan."},{"poin":"Besarnya satu bulan gaji untuk masa kerja 12 bulan."}],"gambarUtama":1,"isi":{"root":{"type":"root","format":"","indent":0,"version":1,"direction":"ltr","children":[{"type":"paragraph","format":"","indent":0,"version":1,"direction":"ltr","textFormat":0,"children":[{"type":"text","text":"THR adalah hak karyawan.","format":0,"detail":0,"mode":"normal","style":"","version":1}]}]}}}'
  ID=$(node -e "console.log(JSON.parse(require('fs').readFileSync('/tmp/baru.json','utf8')).doc.id)")
  curl -s $B/news-sitemap.xml | grep -o '<news:title>[^<]*'
  curl -s -o /dev/null -w "draf %{http_code}\n" -X PATCH "$B/api/artikel/$ID?draft=true" -H "Authorization: JWT $TOKEN" -H 'Content-Type: application/json' -d '{"judul":"Explainer THR 2026 revisi"}'
  curl -s $B/feed.xml | grep -o '<item><title>[^<]*'
  curl -s -o /dev/null -w "batal terbit %{http_code}\n" -X PATCH "$B/api/artikel/$ID" -H "Authorization: JWT $TOKEN" -H 'Content-Type: application/json' -d '{"_status":"draft"}'
  curl -s $B/sitemap/artikel.xml | grep -o '<loc>[^<]*'
  ```

  (`SEED_ADMIN_EMAIL` dan `SEED_ADMIN_PASSWORD` dibaca dari `.env`; ID pilar, penulis, dan media 1 berasal dari seed dan artikel contoh Langkah 7.) Hasil yang diharapkan: `terbit 201` lalu news sitemap langsung memuat `Explainer THR 2026` di atas artikel contoh (cache sitemap dibuang hook revalidasi); `draf 200` dan RSS tetap menampilkan judul terbit `Explainer THR 2026` (draf tidak merevalidasi dan tidak bocor); `batal terbit 200` lalu sitemap artikel tinggal satu URL. Hentikan server dev. `next dev` menambah blok agent-rules Next ke `CLAUDE.md`; kembalikan dengan `git checkout CLAUDE.md` sebelum commit.

- [ ] **Langkah 9: Commit**

  ```bash
  git add src/modules/seo/data.ts src/modules/seo/rute.ts "src/app/(frontend)/sitemap.xml/route.ts" \
    "src/app/(frontend)/sitemap/[jenis]/route.ts" "src/app/(frontend)/news-sitemap.xml/route.ts" \
    "src/app/(frontend)/robots.txt/route.ts" "src/app/(frontend)/feed.xml/route.ts" \
    tests/unit/seo-data.test.ts tests/int/sitemap.int.spec.ts
  git commit -m "feat(seo): rute sitemap index, sitemap per jenis, news sitemap, robots.txt, dan RSS"
  ```


### Task 8: Panel SEO di editor artikel

**Files:**
- Create: `src/modules/seo/kemiripan.ts`, `src/modules/seo/pratinjau.ts`, `src/modules/seo/panel.ts`, `src/modules/seo/endpoint.ts`, `src/modules/seo/PanelSeo.tsx`, `src/modules/seo/PanelSeo.scss`
- Modify: `src/collections/Artikel.ts`, `src/app/(payload)/admin/importMap.js` (generate)
- Test: `tests/unit/seo-kemiripan.test.ts`, `tests/unit/seo-pratinjau.test.ts`, `tests/unit/seo-panel.test.ts`, `tests/int/panel-seo.int.spec.ts`

**Interfaces:**
- Consumes: `analisis`, `skor` (Task 4), `judulSeo`, `deskripsiDokumen`, `gambarOgDokumen`, `pathDokumen`, `urlAbsolut`, `canonicalDokumen` (Task 2), `tautanIsi`, `idGambarIsi`, `isiDenganMedia` (Task 1), `normalisasi`, `potongKata` (Task 1), `klienMedia` (Rencana 2), dari `@payloadcms/ui`: `useAllFormFields`, `useConfig`, `useDebounce`, `useDocumentInfo`; dari `payload/shared`: `formatAdminURL`, `reduceFieldsToValues`.
- Produces:
  - `src/modules/seo/kemiripan.ts`: `kataKunci(frasa): Set<string>`, `jaccard(a, b)`, `AMBANG_MIRIP = 0.6`, `type TingkatMirip = 'sama' | 'mirip' | null`, `tingkatMirip(a, b)`, `type ArtikelLain = { id; judul; path; pilarId?; keyphrase?; keyphraseSekunder? }`, `type Kanibalisasi`, `cariKanibalisasi(keyphrase, lain)`, `type SaranLink`, `JUMLAH_SARAN = 5`, `sarankanLink(doc, lain, { sudahDitautkan?, jumlah? })`.
  - `src/modules/seo/pratinjau.ts`: `POTONG`, `type Perangkat = 'desktop' | 'hp' | 'sosial'`, `urlTampil(url)`, `type TeksPratinjau`, `teksPratinjau({ judul, deskripsi, url }, perangkat)`.
  - `src/modules/seo/panel.ts` (aman untuk komponen klien): `type MasukanPanel`, `type DataPanel`, `type IsianArtikel`, `rapikanIsian(nilai)`, `masukanPanel(isian): MasukanPanel`, `type HasilPanel`, `hasilPanel(isian, data): HasilPanel`.
  - `src/modules/seo/endpoint.ts`: `PATH_PANEL_SEO = '/panel-seo'`, `bacaMasukan(body): MasukanPanel`, `endpointPanelSeo: Endpoint` (`POST /api/artikel/panel-seo`, hanya pengguna masuk).
  - `src/modules/seo/PanelSeo.tsx`: komponen klien `PanelSeo` (path import map `@/modules/seo/PanelSeo#PanelSeo`), dipasang sebagai field `ui` `panelSeo` di tab SEO artikel.

Cakupan spesifikasi §8 "Panel SEO per artikel":

| Butir | Dikerjakan di sini |
|---|---|
| 1. Keyphrase utama dan sekunder | sudah ada di grup `seo` (Rencana 1); dipakai checklist, kanibalisasi, dan saran |
| 2. Checklist hijau/kuning | `analisis()` (Task 4) atas isian form yang belum disimpan, ditambah alt dan lebar media dari server |
| 3. Peringatan kanibalisasi | `cariKanibalisasi`: keyphrase sama (tahun, kata umum, urutan, huruf besar diabaikan) atau sangat mirip (Jaccard minimal 0,6 atau satu frasa memuat seluruh kata frasa lain, minimal dua kata), dengan tautan ke artikel di admin. Artikel draf ikut dibandingkan supaya bentrok terlihat sebelum terbit. |
| 4. Saran link internal | `sarankanLink`: skor 2 per kata keyphrase yang sama (utama dan sekunder), 1 bila sepilar; artikel yang sudah ditautkan dan kandidat kanibalisasi tidak disarankan; maksimal 5 |
| 5. Pratinjau Google (desktop/HP) dan kartu sosial | `teksPratinjau` + gambar OG dari `gambarOgDokumen` (unggahan atau otomatis warna pilar) |
| 6. Canonical, index/noindex, tipe schema, saklar perubahan besar | field sudah ada (grup `seo` dan sidebar, Rencana 1); panel menampilkan canonical efektif dan peringatan noindex |

Batasan yang disengaja (YAGNI): panel hanya untuk artikel (koleksi lain tetap punya grup `seo` tanpa panel); pembanding maksimal 500 artikel terbaru (cukup untuk MVP, bisa dipindah ke indeks saat Rencana 6); pratinjau memakai batas karakter, bukan lebar piksel; tidak ada tombol "sisipkan link" otomatis.

Catatan form admin: `reduceFieldsToValues(fields, true)` menyimpan field array tanpa baris sebagai jumlah barisnya (`0`), bukan `[]`. `rapikanIsian` mengubahnya ke array sebelum dianalisis; ditemukan saat uji di browser (galat `number 0 is not iterable` di `cekSumber`) dan dikunci tes unit. Node upload Lexical di form berisi ID media, jadi panel mengirim ID media (gambar utama, gambar OG, gambar di isi) ke endpoint dan menyisipkan dokumen media dengan `isiDenganMedia` sebelum analisis. Endpoint dipanggil ulang setelah isian berhenti berubah 0,8 detik (`useDebounce`); `AbortController` membatalkan permintaan lama.

Gaya panel memakai variabel tema admin Payload (`--theme-elevation-*`, `--base`) supaya ikut mode gelap admin; setiap cek punya teks "Sesuai" atau "Perlu dilihat" sehingga status tidak hanya disampaikan warna. Tidak ada dependensi baru: admin sudah mengompilasi SCSS (`custom.scss`).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/seo-kemiripan.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { cariKanibalisasi, jaccard, kataKunci, sarankanLink, tingkatMirip, type ArtikelLain } from '@/modules/seo/kemiripan'

  const lain: ArtikelLain[] = [
    { id: 1, judul: 'Gaji bersih 2025', path: '/gaji-bersih-2025', pilarId: 1, keyphrase: 'Gaji Bersih 2025' },
    { id: 2, judul: 'Gaji bersih karyawan', path: '/gaji-bersih-karyawan', pilarId: 1, keyphrase: 'gaji bersih karyawan' },
    { id: 3, judul: 'Cara hitung PPh 21', path: '/pph-21', pilarId: 1, keyphrase: 'hitung pph 21', keyphraseSekunder: ['potongan gaji'] },
    { id: 4, judul: 'Tabungan darurat', path: '/dana-darurat', pilarId: 1, keyphrase: 'dana darurat' },
    { id: 5, judul: 'Belajar Python', path: '/python', pilarId: 2, keyphrase: 'belajar python' },
    { id: 6, judul: 'BPJS Kesehatan', path: '/bpjs', pilarId: 4, keyphrase: 'iuran bpjs', keyphraseSekunder: ['gaji'] },
  ]

  describe('kataKunci dan jaccard', () => {
    it('membuang kata umum dan angka tahun', () => {
      expect([...kataKunci('Cara Hitung Gaji Bersih 2026 untuk Karyawan')]).toEqual(['hitung', 'gaji', 'bersih', 'karyawan'])
    })

    it('jaccard', () => {
      expect(jaccard(new Set(['a', 'b']), new Set(['a', 'b']))).toBe(1)
      expect(jaccard(new Set(['a', 'b']), new Set(['b', 'c']))).toBeCloseTo(1 / 3)
      expect(jaccard(new Set(), new Set(['a']))).toBe(0)
    })
  })

  describe('tingkatMirip', () => {
    it('sama: urutan, huruf besar, tahun, dan kata umum diabaikan', () => {
      expect(tingkatMirip('gaji bersih', 'Gaji Bersih 2025')).toBe('sama')
      expect(tingkatMirip('cara hitung THR', 'hitung thr')).toBe('sama')
      expect(tingkatMirip('bersih gaji', 'gaji bersih')).toBe('sama')
    })

    it('mirip: satu frasa memuat frasa lain, atau Jaccard minimal 0,6', () => {
      expect(tingkatMirip('gaji bersih', 'gaji bersih karyawan')).toBe('mirip')
      expect(tingkatMirip('hitung gaji bersih bulanan', 'hitung gaji bersih tahunan')).toBe('mirip')
    })

    it('tidak mirip: satu kata sama tidak cukup', () => {
      expect(tingkatMirip('gaji bersih', 'gaji pokok')).toBeNull()
      expect(tingkatMirip('gaji', 'gaji bersih')).toBeNull()
      expect(tingkatMirip('', 'gaji')).toBeNull()
    })
  })

  describe('cariKanibalisasi', () => {
    it('daftar artikel yang keyphrase-nya sama di atas yang mirip', () => {
      expect(cariKanibalisasi('gaji bersih', lain).map((a) => [a.id, a.tingkat])).toEqual([
        [1, 'sama'],
        [2, 'mirip'],
      ])
    })

    it('keyphrase kosong tidak memeriksa apa pun', () => {
      expect(cariKanibalisasi(' ', lain)).toEqual([])
    })
  })

  describe('sarankanLink', () => {
    const doc = { pilarId: 1, keyphrase: 'gaji bersih', keyphraseSekunder: ['potongan pph 21'] }

    it('mengurutkan keyphrase terkait lalu sepilar; kandidat kanibalisasi tidak disarankan', () => {
      expect(sarankanLink(doc, lain).map((s) => [s.id, s.skor, s.alasan])).toEqual([
        [3, 9, 'keyphrase terkait: gaji, potongan, pph, 21, sepilar'],
        [6, 2, 'keyphrase terkait: gaji'],
        [4, 1, 'sepilar'],
      ])
    })

    it('artikel yang sudah ditautkan dilewati dan jumlah saran dibatasi', () => {
      expect(sarankanLink(doc, lain, { sudahDitautkan: [3] }).map((s) => s.id)).toEqual([6, 4])
      expect(sarankanLink(doc, lain, { jumlah: 1 }).map((s) => s.id)).toEqual([3])
    })

    it('tanpa pilar dan keyphrase tidak ada saran', () => {
      expect(sarankanLink({}, lain)).toEqual([])
    })
  })
  ```

  `tests/unit/seo-pratinjau.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { teksPratinjau, urlTampil } from '@/modules/seo/pratinjau'

  const data = {
    judul: 'Cara hitung gaji bersih 2026: potongan PPh 21 TER, BPJS Kesehatan, dan BPJS Ketenagakerjaan',
    deskripsi:
      'Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS. Pelajari rumus TER 2026, contoh hitungan, dan kalkulator gratis untuk karyawan tetap di sini.',
    url: 'https://point.lat/glosarium/ptkp',
  }

  describe('pratinjau hasil Google dan kartu sosial', () => {
    it('URL tampilan Google memakai remah path', () => {
      expect(urlTampil('https://point.lat/glosarium/ptkp')).toBe('point.lat › glosarium › ptkp')
      expect(urlTampil('https://point.lat/')).toBe('point.lat')
      expect(urlTampil('bukan url')).toBe('bukan url')
    })

    it('desktop memotong judul sekitar 60 karakter, HP sekitar 70', () => {
      const desktop = teksPratinjau(data, 'desktop')
      const hp = teksPratinjau(data, 'hp')
      expect(desktop.judul).toBe('Cara hitung gaji bersih 2026: potongan PPh 21 TER, BPJS...')
      expect(hp.judul).toBe('Cara hitung gaji bersih 2026: potongan PPh 21 TER, BPJS Kesehatan...')
      expect(desktop.deskripsi).toBe(data.deskripsi)
      expect(hp.deskripsi.length).toBeLessThanOrEqual(120)
      expect(desktop.url).toBe('point.lat › glosarium › ptkp')
    })

    it('kartu sosial menampilkan domain huruf besar seperti WhatsApp dan Facebook', () => {
      const sosial = teksPratinjau(data, 'sosial')
      expect(sosial.url).toBe('POINT.LAT')
      expect(sosial.domain).toBe('point.lat')
      expect(sosial.judul.length).toBeLessThanOrEqual(65)
    })
  })
  ```

  `tests/unit/seo-panel.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { bacaMasukan } from '@/modules/seo/endpoint'
  import { hasilPanel, masukanPanel, rapikanIsian, type DataPanel, type IsianArtikel } from '@/modules/seo/panel'

  import { h, isiLexical, p, tautan, tautanInternal, unggahan } from './seo-contoh'

  const isian: IsianArtikel = {
    id: 10,
    judul: 'Cara hitung gaji bersih',
    slug: 'cara-hitung-gaji-bersih',
    tipe: 'panduan',
    deck: 'Potongan PPh 21 dan BPJS dihitung langkah demi langkah.',
    pilar: 1,
    gambarUtama: 5,
    intinya: [{ poin: 'Satu.' }, { poin: 'Dua.' }],
    isi: isiLexical([
      p('Gaji bersih dihitung dari gaji kotor.'),
      h('h2', 'Rumus'),
      p(tautanInternal(11, 'PPh 21'), tautanInternal(11, 'lagi'), tautanInternal(3, 'tools', 'tools'), tautan('/a', 'a')),
      unggahan(7),
    ]),
    seo: { keyphrase: 'gaji bersih', keyphraseSekunder: ['pph 21'], gambarOG: 8 },
  }

  const data: DataPanel = {
    situs: { namaSitus: 'point.', urlSitus: 'https://point.lat', polaJudul: '%s · point.', metaDefault: 'Intinya dulu.', cloudName: 'demo' },
    pilar: { id: 1, nama: 'Uang & Karier', slug: 'uang-karier', warna: 'hijau' },
    media: {
      5: { id: 5, alt: 'Slip gaji', width: 1600, height: 900, publicId: 'point/gambar/slip-gaji', jenis: 'gambar' },
      7: { id: 7, alt: '', width: 800, height: 600, publicId: 'point/gambar/tabel', jenis: 'gambar' },
    },
    kanibalisasi: [],
    saran: [],
  }

  describe('masukanPanel', () => {
    it('mengambil ID dari isian form: artikel yang ditautkan dan media yang dipakai', () => {
      expect(masukanPanel(isian)).toEqual({
        id: 10,
        pilar: 1,
        keyphrase: 'gaji bersih',
        keyphraseSekunder: ['pph 21'],
        tertaut: [11],
        media: [5, 8, 7],
      })
    })

    it('relasi yang sudah berupa dokumen juga dikenali', () => {
      expect(masukanPanel({ pilar: { id: 2 }, gambarUtama: { id: 9 } })).toMatchObject({ pilar: 2, media: [9] })
    })
  })

  describe('rapikanIsian', () => {
    it('array kosong dari form admin tersimpan sebagai angka 0: diubah ke []', () => {
      expect(rapikanIsian({ judul: 'Draf', intinya: 0, sumber: 0, seo: { keyphrase: 'gaji' } })).toEqual({
        judul: 'Draf',
        intinya: [],
        sumber: [],
        seo: { keyphrase: 'gaji', keyphraseSekunder: [] },
      })
      expect(rapikanIsian({}).seo).toEqual({ keyphraseSekunder: [] })
    })

    it('isian yang sudah dirapikan bisa dianalisis tanpa galat', () => {
      expect(() => hasilPanel(rapikanIsian({ judul: 'Draf', intinya: 0, sumber: 0 }), data)).not.toThrow()
    })
  })

  describe('bacaMasukan (endpoint)', () => {
    it('membuang ID yang tidak valid dan nilai yang bukan teks', () => {
      expect(bacaMasukan({ id: '12', pilar: 'x', keyphrase: 5, keyphraseSekunder: ['a', 3], tertaut: [1, '2', 'x', -1], media: [3.5, 4] })).toEqual({
        id: 12,
        pilar: null,
        keyphrase: null,
        keyphraseSekunder: ['a'],
        tertaut: [1, 2],
        media: [4],
      })
      expect(bacaMasukan(null)).toMatchObject({ id: null, tertaut: [], media: [] })
    })
  })

  describe('hasilPanel', () => {
    const hasil = hasilPanel(isian, data)

    it('checklist memakai alt dan lebar media dari server', () => {
      const alt = hasil.cek.find((c) => c.id === 'alt-gambar')
      expect(alt).toMatchObject({ status: 'kuning', pesan: '1 gambar belum punya alt.' })
      expect(hasil.cek.find((c) => c.id === 'gambar-utama')).toMatchObject({ status: 'hijau', pesan: 'Lebar 1600px.' })
      expect(hasil.cek.find((c) => c.id === 'link-internal')?.pesan).toBe('4 link internal.')
    })

    it('pratinjau Google dan kartu sosial dari judul, meta, dan URL dokumen', () => {
      expect(hasil.pratinjau.desktop).toEqual({
        judul: 'Cara hitung gaji bersih · point.',
        deskripsi: 'Potongan PPh 21 dan BPJS dihitung langkah demi langkah.',
        url: 'point.lat › cara-hitung-gaji-bersih',
        domain: 'point.lat',
      })
      expect(hasil.pratinjau.sosial.url).toBe('POINT.LAT')
      expect(hasil.canonical).toBe('https://point.lat/cara-hitung-gaji-bersih')
      expect(hasil.noindex).toBe(false)
    })

    it('gambar OG otomatis warna pilar bila gambar OG unggahan belum terbaca', () => {
      expect(hasil.gambarOg.url).toContain('co_rgb:1F7A4D')
      const denganOg = hasilPanel(isian, {
        ...data,
        media: { ...data.media, 8: { id: 8, alt: 'OG', width: 1200, height: 630, publicId: 'point/gambar/og', jenis: 'gambar' } },
      })
      expect(denganOg.gambarOg.url).toBe('https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,w_1200,h_630/f_auto,q_auto/point/gambar/og')
    })

    it('draf baru tanpa slug tetap bisa dipratinjau', () => {
      const baru = hasilPanel({ judul: 'Draf' }, { ...data, pilar: null })
      expect(baru.pratinjau.desktop.url).toBe('point.lat')
      expect(baru.cek).toHaveLength(12)
    })
  })
  ```

  `tests/int/panel-seo.int.spec.ts`

  ```ts
  import config from '@payload-config'
  import { handleEndpoints } from 'payload'
  import { beforeAll, describe, expect, it } from 'vitest'

  import type { DataPanel } from '@/modules/seo/panel'

  import { dataArtikelTerbit, siapkanRelasiArtikel } from './fixtures'
  import { getTestPayload, unik } from './helpers'

  const BASIS = 'http://localhost:3000/api'

  async function panel(body: unknown, token?: string) {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    if (token) headers.set('Authorization', `JWT ${token}`)
    const respons = await handleEndpoints({
      config,
      request: new Request(`${BASIS}/artikel/panel-seo`, { method: 'POST', headers, body: JSON.stringify(body) }),
    })
    return { status: respons.status, data: (await respons.json()) as DataPanel & { errors?: { message: string }[] } }
  }

  describe('endpoint panel SEO', () => {
    let token = ''
    let relasi: Awaited<ReturnType<typeof siapkanRelasiArtikel>>
    let kata = ''
    let sama: { id: number }
    let terkait: { id: number }

    beforeAll(async () => {
      const payload = await getTestPayload()
      const email = `${unik('editor')}@tes.local`
      await payload.create({ collection: 'pengguna', data: { email, password: 'rahasia-123', nama: 'Editor SEO' } })
      token = (await payload.login({ collection: 'pengguna', data: { email, password: 'rahasia-123' } })).token!

      relasi = await siapkanRelasiArtikel(payload)
      kata = unik('zakat').replace(/-/g, '')
      sama = await payload.create({
        collection: 'artikel',
        data: { ...dataArtikelTerbit(relasi), seo: { keyphrase: `${kata} profesi 2025` } },
      })
      terkait = await payload.create({
        collection: 'artikel',
        draft: true,
        data: { judul: unik('Draf terkait'), pilar: relasi.pilar.id, seo: { keyphrase: `hitung ${kata} emas` } },
      })
    })

    it('menolak pengguna yang belum masuk', async () => {
      const { status, data } = await panel({ keyphrase: 'gaji' })
      expect(status).toBe(401)
      expect(data.errors?.[0].message).toBe('Masuk dulu untuk memakai panel SEO.')
    })

    it('kanibalisasi: keyphrase sama (tahun diabaikan) dengan tautan ke artikelnya', async () => {
      const { status, data } = await panel({ keyphrase: `${kata} profesi`, pilar: relasi.pilar.id }, token)
      expect(status).toBe(200)
      expect(data.kanibalisasi).toEqual([
        expect.objectContaining({ id: sama.id, tingkat: 'sama', urlAdmin: `/admin/collections/artikel/${sama.id}` }),
      ])
    })

    it('saran link: artikel sepilar dan berkeyphrase terkait, termasuk draf; dokumen sendiri dan yang sudah ditautkan dilewati', async () => {
      const { data } = await panel({ id: sama.id, keyphrase: `${kata} profesi`, pilar: relasi.pilar.id }, token)
      expect(data.kanibalisasi).toEqual([])
      const ids = data.saran.map((s) => s.id)
      expect(ids[0]).toBe(terkait.id)
      expect(ids).not.toContain(sama.id)
      expect(data.saran[0].alasan).toBe(`keyphrase terkait: ${kata}, sepilar`)

      const lagi = await panel({ id: sama.id, keyphrase: `${kata} profesi`, pilar: relasi.pilar.id, tertaut: [terkait.id] }, token)
      expect(lagi.data.saran.map((s) => s.id)).not.toContain(terkait.id)
    })

    it('mengembalikan pengaturan situs, pilar, dan media untuk pratinjau dan analisis', async () => {
      const { data } = await panel({ pilar: relasi.pilar.id, media: [relasi.gambar.id, 'bukan-id-valid'] }, token)
      expect(data.situs).toMatchObject({ namaSitus: 'point.', urlSitus: 'https://point.lat', polaJudul: '%s · point.', cloudName: 'palsu' })
      expect(data.pilar).toMatchObject({ id: relasi.pilar.id, warna: 'hijau' })
      expect(data.media[String(relasi.gambar.id)]).toMatchObject({ alt: 'Gambar contoh 1600px', width: 1600, height: 900 })
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/seo-kemiripan.test.ts`, `tests/unit/seo-pratinjau.test.ts`, dan `tests/unit/seo-panel.test.ts` dengan `Cannot find package '@/modules/seo/...'`.

- [ ] **Langkah 3: Tulis kemiripan keyphrase dan pratinjau**

  `src/modules/seo/kemiripan.ts`

  ```ts
  import { normalisasi } from './teks'

  /**
   * Kemiripan keyphrase untuk peringatan kanibalisasi dan saran link internal (spesifikasi §8 butir 3-4).
   * Fungsi murni: data artikel lain diambil endpoint panel SEO, perhitungannya di sini.
   */

  /** Kata fungsi bahasa Indonesia yang tidak membedakan topik. */
  const KATA_UMUM = new Set([
    'dan', 'atau', 'di', 'ke', 'dari', 'yang', 'untuk', 'dengan', 'pada', 'dalam', 'itu', 'ini', 'cara',
    'apa', 'adalah', 'bagi', 'agar', 'supaya', 'serta', 'juga', 'per', 'vs', 'versi', 'terbaru',
  ])

  /** Kata unik keyphrase setelah normalisasi, tanpa kata umum dan angka tahun (2026 tidak membedakan topik). */
  export function kataKunci(frasa: string): Set<string> {
    return new Set(
      normalisasi(frasa)
        .split(' ')
        .filter((kata) => kata && !KATA_UMUM.has(kata) && !/^(19|20)\d{2}$/.test(kata)),
    )
  }

  /** Indeks Jaccard dua himpunan kata (0 sampai 1). */
  export function jaccard(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 || b.size === 0) return 0
    let irisan = 0
    for (const kata of a) if (b.has(kata)) irisan++
    return irisan / (a.size + b.size - irisan)
  }

  export type TingkatMirip = 'sama' | 'mirip' | null

  /** Ambang "sangat mirip": dua dari tiga kata kunci sama (mis. "gaji bersih" vs "gaji bersih karyawan"). */
  export const AMBANG_MIRIP = 0.6

  /**
   * `sama` bila kata kuncinya identik (urutan, huruf besar, tahun, dan kata umum diabaikan),
   * `mirip` bila Jaccard minimal `AMBANG_MIRIP` atau satu frasa memuat seluruh kata frasa lain.
   */
  export function tingkatMirip(a: string, b: string): TingkatMirip {
    const ka = kataKunci(a)
    const kb = kataKunci(b)
    if (ka.size === 0 || kb.size === 0) return null
    const nilai = jaccard(ka, kb)
    if (nilai === 1) return 'sama'
    const memuat = [...ka].every((k) => kb.has(k)) || [...kb].every((k) => ka.has(k))
    return nilai >= AMBANG_MIRIP || (memuat && Math.min(ka.size, kb.size) >= 2) ? 'mirip' : null
  }

  /** Artikel lain sebagai kandidat kanibalisasi dan saran link. */
  export type ArtikelLain = {
    id: number | string
    judul: string
    path: string
    pilarId?: number | string | null
    keyphrase?: string | null
    keyphraseSekunder?: string[] | null
  }

  export type Kanibalisasi = ArtikelLain & { tingkat: Exclude<TingkatMirip, null> }

  /** Artikel lain yang keyphrase utamanya sama atau sangat mirip. Yang `sama` di atas. */
  export function cariKanibalisasi(keyphrase: string | null | undefined, lain: ArtikelLain[]): Kanibalisasi[] {
    if (!keyphrase?.trim()) return []
    const hasil: Kanibalisasi[] = []
    for (const artikel of lain) {
      const tingkat = artikel.keyphrase ? tingkatMirip(keyphrase, artikel.keyphrase) : null
      if (tingkat) hasil.push({ ...artikel, tingkat })
    }
    return hasil.sort((a, b) => (a.tingkat === b.tingkat ? 0 : a.tingkat === 'sama' ? -1 : 1))
  }

  export type SaranLink = ArtikelLain & { skor: number; alasan: string }

  /** Jumlah saran yang ditampilkan panel. */
  export const JUMLAH_SARAN = 5

  /**
   * Saran link internal: artikel sepilar dan artikel yang keyphrase-nya berbagi kata dengan keyphrase
   * utama atau sekunder dokumen ini. Artikel yang sudah ditautkan dan kandidat kanibalisasi tidak
   * disarankan (menautkan dua artikel yang berebut kata kunci tidak menyelesaikan masalahnya).
   */
  export function sarankanLink(
    doc: { pilarId?: number | string | null; keyphrase?: string | null; keyphraseSekunder?: string[] | null },
    lain: ArtikelLain[],
    opsi: { sudahDitautkan?: (number | string)[]; jumlah?: number } = {},
  ): SaranLink[] {
    const kata = new Set([doc.keyphrase ?? '', ...(doc.keyphraseSekunder ?? [])].flatMap((f) => [...kataKunci(f)]))
    const tertaut = new Set((opsi.sudahDitautkan ?? []).map(String))
    const kanibal = new Set(cariKanibalisasi(doc.keyphrase, lain).map((a) => String(a.id)))
    const hasil: SaranLink[] = []
    for (const artikel of lain) {
      if (tertaut.has(String(artikel.id)) || kanibal.has(String(artikel.id))) continue
      const kataLain = new Set(
        [artikel.keyphrase ?? '', ...(artikel.keyphraseSekunder ?? [])].flatMap((f) => [...kataKunci(f)]),
      )
      const bersama = [...kata].filter((k) => kataLain.has(k))
      const sepilar = doc.pilarId !== undefined && doc.pilarId !== null && String(artikel.pilarId) === String(doc.pilarId)
      const skor = bersama.length * 2 + (sepilar ? 1 : 0)
      if (skor === 0) continue
      const alasan = [
        bersama.length ? `keyphrase terkait: ${bersama.join(', ')}` : null,
        sepilar ? 'sepilar' : null,
      ]
        .filter(Boolean)
        .join(', ')
      hasil.push({ ...artikel, skor, alasan })
    }
    return hasil
      .sort((a, b) => b.skor - a.skor || a.judul.localeCompare(b.judul, 'id'))
      .slice(0, opsi.jumlah ?? JUMLAH_SARAN)
  }
  ```

  `src/modules/seo/pratinjau.ts`

  ```ts
  import { potongKata } from './teks'

  /**
   * Teks pratinjau hasil Google dan kartu sosial di panel SEO (spesifikasi §8 butir 5).
   *
   * Google memotong judul berdasarkan lebar piksel, bukan jumlah karakter, jadi batas di sini adalah
   * perkiraan yang lazim dipakai plugin SEO: judul sekitar 60 karakter di desktop dan 70 di HP, meta
   * sekitar 160 karakter di desktop dan 120 di HP. Pratinjau memberi gambaran, bukan jaminan.
   */
  export const POTONG = {
    desktop: { judul: 60, deskripsi: 160 },
    hp: { judul: 70, deskripsi: 120 },
    /** WhatsApp, Facebook, dan X menampilkan judul lebih pendek di kartu tautan. */
    sosial: { judul: 65, deskripsi: 110 },
  } as const

  export type Perangkat = keyof typeof POTONG

  /** URL tampilan Google: domain lalu remah path dipisah " › ", tanpa protokol. */
  export function urlTampil(url: string): string {
    try {
      const u = new URL(url)
      const bagian = u.pathname.split('/').filter(Boolean).map(decodeURIComponent)
      return [u.host, ...bagian].join(' › ')
    } catch {
      return url
    }
  }

  export type TeksPratinjau = { judul: string; deskripsi: string; url: string; domain: string }

  export function teksPratinjau(
    data: { judul: string; deskripsi: string; url: string },
    perangkat: Perangkat,
  ): TeksPratinjau {
    const batas = POTONG[perangkat]
    let domain = data.url
    try {
      domain = new URL(data.url).host
    } catch {
      // URL tidak valid ditampilkan apa adanya.
    }
    return {
      judul: potongKata(data.judul, batas.judul),
      deskripsi: potongKata(data.deskripsi, batas.deskripsi),
      url: perangkat === 'sosial' ? domain.toUpperCase() : urlTampil(data.url),
      domain,
    }
  }
  ```

- [ ] **Langkah 4: Tulis logika panel dan endpoint**

  `src/modules/seo/panel.ts`

  ```ts
  import type { WarnaPilar } from '@/lib/konstanta'

  import { analisis, type ArtikelAnalisis, type Cek } from './analisis'
  import { deskripsiDokumen, gambarOgDokumen, judulSeo, pathDokumen, urlAbsolut, type GambarOg } from './dokumen'
  import type { Kanibalisasi, SaranLink } from './kemiripan'
  import { idGambarIsi, isiDenganMedia, tautanIsi, type GambarIsi, type IsiDokumen } from './lexical'
  import { canonicalDokumen } from './metadata'
  import { teksPratinjau, type TeksPratinjau } from './pratinjau'
  import type { ArtikelSeo, MediaSeo, Relasi, Situs, TipeSchema } from './tipe'

  /**
   * Logika panel SEO di editor yang tidak butuh React: mengubah isian form admin menjadi masukan
   * endpoint, lalu menggabungkan jawaban endpoint menjadi checklist dan pratinjau. Komponen
   * `PanelSeo.tsx` hanya merender hasilnya. File ini dipakai komponen klien, jadi tidak boleh
   * mengimpor modul server (Payload, SDK Cloudinary).
   */

  /** Body `POST /api/artikel/panel-seo`. */
  export type MasukanPanel = {
    id?: number | string | null
    pilar?: number | string | null
    keyphrase?: string | null
    keyphraseSekunder?: string[] | null
    /** ID artikel yang sudah ditautkan dari isi (link internal ke dokumen). */
    tertaut?: (number | string)[]
    /** ID media yang dipakai gambar utama, gambar OG, dan gambar di isi. */
    media?: (number | string)[]
  }

  export type DataPanel = {
    situs: Pick<Situs, 'namaSitus' | 'urlSitus' | 'polaJudul' | 'metaDefault' | 'cloudName'>
    pilar: { id: number | string; nama: string; slug?: string | null; warna: WarnaPilar } | null
    media: Record<string, GambarIsi & Pick<MediaSeo, 'publicId' | 'jenis' | 'height'>>
    kanibalisasi: (Kanibalisasi & { urlAdmin: string })[]
    saran: (SaranLink & { urlAdmin: string; url: string })[]
  }

  /** Isian form admin artikel (hasil `reduceFieldsToValues(fields, true)`). Relasi berupa ID. */
  export type IsianArtikel = {
    id?: number | string
    judul?: string | null
    slug?: string | null
    tipe?: ArtikelSeo['tipe'] | null
    deck?: string | null
    pilar?: Relasi<{ id: number | string }>
    intinya?: { poin?: string | null }[] | null
    isi?: IsiDokumen
    sumber?: { url?: string | null }[] | null
    gambarUtama?: Relasi<MediaSeo>
    seo?: {
      keyphrase?: string | null
      keyphraseSekunder?: string[] | null
      judulSEO?: string | null
      metaDeskripsi?: string | null
      gambarOG?: Relasi<MediaSeo>
      canonical?: string | null
      tipeSchema?: TipeSchema | null
      noindex?: boolean | null
    } | null
  }

  const daftar = <T>(nilai: unknown): T[] => (Array.isArray(nilai) ? (nilai as T[]) : [])

  /**
   * Merapikan hasil `reduceFieldsToValues(fields, true)` dari form admin. Field array yang belum
   * punya baris tersimpan sebagai jumlah barisnya (`0`), bukan `[]`, karena state form array memakai
   * `disableFormData`. Field array dan hasMany diubah ke array supaya analisis tidak salah membaca.
   */
  export function rapikanIsian(nilai: Record<string, unknown>): IsianArtikel {
    const isian = nilai as IsianArtikel & Record<string, unknown>
    const seo = (isian.seo && typeof isian.seo === 'object' ? isian.seo : {}) as NonNullable<IsianArtikel['seo']>
    return {
      ...isian,
      intinya: daftar(isian.intinya),
      sumber: daftar(isian.sumber),
      seo: { ...seo, keyphraseSekunder: daftar<string>(seo.keyphraseSekunder) },
    }
  }

  const idRelasi = (r: unknown): number | string | null =>
    r && typeof r === 'object' ? ((r as { id?: number | string }).id ?? null) : typeof r === 'number' || typeof r === 'string' ? r : null

  /** Masukan endpoint dari isian form: ID dokumen, pilar, keyphrase, artikel yang sudah ditautkan, media. */
  export function masukanPanel(isian: IsianArtikel): MasukanPanel {
    // Hanya tautan ke dokumen (linkType internal) yang punya ID; domain situs tidak berpengaruh di sini.
    const tertaut = tautanIsi(isian.isi, '').flatMap((t) => ('docId' in t && t.relationTo === 'artikel' ? [t.docId] : []))
    const media = [idRelasi(isian.gambarUtama), idRelasi(isian.seo?.gambarOG), ...idGambarIsi(isian.isi)].filter(
      (id): id is number | string => id !== null,
    )
    return {
      id: isian.id ?? null,
      pilar: idRelasi(isian.pilar),
      keyphrase: isian.seo?.keyphrase ?? null,
      keyphraseSekunder: isian.seo?.keyphraseSekunder ?? [],
      tertaut: [...new Set(tertaut)],
      media: [...new Set(media)],
    }
  }

  const mediaDari = (r: unknown, media: DataPanel['media']): MediaSeo | null => {
    const id = idRelasi(r)
    return id === null ? null : (media[String(id)] ?? { id })
  }

  export type HasilPanel = {
    cek: Cek[]
    pratinjau: { desktop: TeksPratinjau; hp: TeksPratinjau; sosial: TeksPratinjau }
    gambarOg: GambarOg
    canonical: string
    noindex: boolean
  }

  /** Checklist dan pratinjau dari isian form ditambah data server. */
  export function hasilPanel(isian: IsianArtikel, data: DataPanel): HasilPanel {
    const situs: Situs = data.situs
    const gambarUtama = mediaDari(isian.gambarUtama, data.media)
    const doc: ArtikelSeo = {
      id: isian.id,
      judul: isian.judul ?? '',
      slug: isian.slug,
      tipe: isian.tipe ?? 'panduan',
      deck: isian.deck,
      pilar: data.pilar,
      penulis: null,
      gambarUtama,
      seo: { ...isian.seo, gambarOG: mediaDari(isian.seo?.gambarOG, data.media) },
    }
    const masukan = { jenis: 'artikel' as const, doc }
    const artikel: ArtikelAnalisis = {
      judul: isian.judul,
      slug: isian.slug,
      intinya: isian.intinya,
      isi: isiDenganMedia(isian.isi, data.media),
      sumber: isian.sumber,
      gambarUtama,
      seo: isian.seo,
    }
    const url = isian.slug ? urlAbsolut(situs, pathDokumen(masukan)) : urlAbsolut(situs, '/')
    const teks = { judul: judulSeo(masukan, situs), deskripsi: deskripsiDokumen(masukan, situs), url }
    return {
      cek: analisis(artikel, { urlSitus: situs.urlSitus }),
      pratinjau: {
        desktop: teksPratinjau(teks, 'desktop'),
        hp: teksPratinjau(teks, 'hp'),
        sosial: teksPratinjau(teks, 'sosial'),
      },
      gambarOg: gambarOgDokumen(masukan, situs),
      canonical: canonicalDokumen(masukan, situs),
      noindex: Boolean(isian.seo?.noindex),
    }
  }
  ```

  `src/modules/seo/endpoint.ts`

  ```ts
  import { APIError, type Endpoint, type PayloadRequest, type Where } from 'payload'

  import { pathFor } from '@/lib/paths'
  import { klienMedia } from '@/modules/media'

  import { urlAbsolut } from './dokumen'
  import { cariKanibalisasi, sarankanLink, type ArtikelLain } from './kemiripan'
  import type { DataPanel, MasukanPanel } from './panel'
  import type { PengaturanSitus } from './tipe'

  /** Path endpoint di bawah `/api/artikel`, dipanggil komponen panel SEO. */
  export const PATH_PANEL_SEO = '/panel-seo'

  /** Jumlah artikel lain yang dibandingkan. Cukup untuk MVP; Rencana 6 bisa memindahkannya ke indeks. */
  const BATAS_PEMBANDING = 500

  /** ID dokumen Postgres: bilangan bulat positif (angka atau teks angka dari form admin). */
  function idValid(nilai: unknown): number | null {
    const angka = typeof nilai === 'string' && /^\d+$/.test(nilai) ? Number(nilai) : nilai
    return typeof angka === 'number' && Number.isInteger(angka) && angka > 0 ? angka : null
  }

  const daftarId = (nilai: unknown): number[] =>
    Array.isArray(nilai) ? nilai.map(idValid).filter((v): v is number => v !== null) : []

  /** Membaca dan merapikan body permintaan. Nilai yang bukan ID valid dibuang. */
  export function bacaMasukan(body: unknown): MasukanPanel {
    const b = (body ?? {}) as Record<string, unknown>
    const teks = (v: unknown) => (typeof v === 'string' ? v : null)
    const id = idValid
    return {
      id: id(b.id),
      pilar: id(b.pilar),
      keyphrase: teks(b.keyphrase),
      keyphraseSekunder: Array.isArray(b.keyphraseSekunder) ? b.keyphraseSekunder.filter((k): k is string => typeof k === 'string') : [],
      tertaut: daftarId(b.tertaut),
      media: daftarId(b.media).slice(0, 50),
    }
  }

  async function artikelLain(req: PayloadRequest, id: MasukanPanel['id']): Promise<ArtikelLain[]> {
    const where: Where = id ? { id: { not_equals: id } } : {}
    const { docs } = await req.payload.find({
      collection: 'artikel',
      where,
      depth: 0,
      limit: BATAS_PEMBANDING,
      pagination: false,
      draft: true,
      sort: '-updatedAt',
      select: { judul: true, slug: true, tipe: true, pilar: true, seo: { keyphrase: true, keyphraseSekunder: true } },
      req,
    })
    return docs.map((doc) => ({
      id: doc.id,
      judul: doc.judul || 'Tanpa judul',
      path: doc.slug ? pathFor({ jenis: 'artikel', slug: doc.slug, tipe: doc.tipe ?? 'panduan' }) : '',
      pilarId: typeof doc.pilar === 'object' ? doc.pilar?.id : doc.pilar,
      keyphrase: doc.seo?.keyphrase,
      keyphraseSekunder: doc.seo?.keyphraseSekunder,
    }))
  }

  /**
   * `POST /api/artikel/panel-seo`: data server untuk panel SEO. Hanya pengguna yang masuk. Membaca
   * artikel lain (termasuk draf, supaya kanibalisasi terlihat sebelum terbit), media yang dipakai
   * dokumen, dan pengaturan situs. Logika pemilihan ada di `kemiripan.ts`.
   */
  export const endpointPanelSeo: Endpoint = {
    path: PATH_PANEL_SEO,
    method: 'post',
    handler: async (req) => {
      if (!req.user) throw new APIError('Masuk dulu untuk memakai panel SEO.', 401)
      const masukan = bacaMasukan(await req.json?.().catch(() => null))
      const admin = req.payload.config.routes.admin

      const [pengaturan, lain, pilarDoc, mediaDocs] = await Promise.all([
        req.payload.findGlobal({ slug: 'pengaturan-seo', depth: 0, req }) as Promise<PengaturanSitus>,
        artikelLain(req, masukan.id),
        masukan.pilar
          ? req.payload.findByID({ collection: 'pilar', id: masukan.pilar, depth: 0, req, disableErrors: true })
          : Promise.resolve(null),
        masukan.media?.length
          ? req.payload
              .find({
                collection: 'media',
                where: { id: { in: masukan.media } },
                depth: 0,
                limit: masukan.media.length,
                select: { alt: true, width: true, height: true, publicId: true, jenis: true },
                req,
              })
              .then((r) => r.docs)
          : Promise.resolve([]),
      ])

      const urlAdmin = (id: number | string) => `${admin}/collections/artikel/${id}`
      const situs = { urlSitus: pengaturan.urlSitus }
      const data: DataPanel = {
        situs: {
          namaSitus: pengaturan.namaSitus,
          urlSitus: pengaturan.urlSitus,
          polaJudul: pengaturan.polaJudul,
          metaDefault: pengaturan.metaDefault,
          cloudName: klienMedia().cloudName,
        },
        pilar: pilarDoc ? { id: pilarDoc.id, nama: pilarDoc.nama, slug: pilarDoc.slug, warna: pilarDoc.warna } : null,
        media: Object.fromEntries(
          mediaDocs.map((m) => [String(m.id), { id: m.id, alt: m.alt ?? null, width: m.width, height: m.height, publicId: m.publicId, jenis: m.jenis }]),
        ),
        kanibalisasi: cariKanibalisasi(masukan.keyphrase, lain).map((a) => ({ ...a, urlAdmin: urlAdmin(a.id) })),
        saran: sarankanLink({ pilarId: masukan.pilar, keyphrase: masukan.keyphrase, keyphraseSekunder: masukan.keyphraseSekunder }, lain, {
          sudahDitautkan: masukan.tertaut,
        }).map((s) => ({ ...s, urlAdmin: urlAdmin(s.id), url: s.path ? urlAbsolut(situs, s.path) : '' })),
      }
      return Response.json(data)
    },
  }
  ```

- [ ] **Langkah 5: Tulis komponen admin**

  `src/modules/seo/PanelSeo.tsx`

  ```tsx
  'use client'

  import { useAllFormFields, useConfig, useDebounce, useDocumentInfo } from '@payloadcms/ui'
  import { formatAdminURL, reduceFieldsToValues } from 'payload/shared'
  import { useEffect, useMemo, useState } from 'react'

  import { skor } from './analisis'
  import { hasilPanel, masukanPanel, rapikanIsian, type DataPanel } from './panel'

  import './PanelSeo.scss'

  type Status = { tahap: 'memuat' } | { tahap: 'siap'; data: DataPanel } | { tahap: 'galat'; pesan: string }

  const JEDA_MS = 800

  /**
   * Panel SEO di tab SEO editor artikel (spesifikasi §8): checklist dari `seo.analisis`, peringatan
   * kanibalisasi, saran link internal, pratinjau hasil Google (desktop dan HP) dan kartu sosial.
   * Data server (artikel lain, media, pengaturan situs) diambil dari `POST /api/artikel/panel-seo`
   * setiap isian berhenti berubah selama 0,8 detik.
   */
  export function PanelSeo() {
    const [fields] = useAllFormFields()
    const { id } = useDocumentInfo()
    const {
      config: {
        routes: { api },
        serverURL,
      },
    } = useConfig()

    const isian = useMemo(() => ({ ...rapikanIsian(reduceFieldsToValues(fields, true)), id }), [fields, id])
    const masukan = useDebounce(JSON.stringify(masukanPanel(isian)), JEDA_MS)
    const [status, setStatus] = useState<Status>({ tahap: 'memuat' })

    useEffect(() => {
      const kendali = new AbortController()
      fetch(formatAdminURL({ apiRoute: api, path: '/artikel/panel-seo', serverURL }), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: masukan,
        signal: kendali.signal,
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(`status ${r.status}`)
          setStatus({ tahap: 'siap', data: (await r.json()) as DataPanel })
        })
        .catch((galat: Error) => {
          if (galat.name !== 'AbortError') setStatus({ tahap: 'galat', pesan: 'Data panel SEO gagal dimuat. Simpan dulu atau muat ulang halaman.' })
        })
      return () => kendali.abort()
    }, [api, serverURL, masukan])

    if (status.tahap === 'memuat') return <div className="panel-seo">Memuat panel SEO...</div>
    if (status.tahap === 'galat') return <div className="panel-seo panel-seo__galat">{status.pesan}</div>

    const { data } = status
    const hasil = hasilPanel(isian, data)
    const nilai = skor(hasil.cek)

    return (
      <div className="panel-seo">
        <section className="panel-seo__bagian">
          <h3>
            Checklist SEO <span className="panel-seo__skor">{nilai.hijau} dari {nilai.total} sudah sesuai</span>
          </h3>
          <p className="panel-seo__catatan">Kuning berarti perlu dilihat. Tidak ada yang menghalangi terbit.</p>
          <ul className="panel-seo__cek">
            {hasil.cek.map((c) => (
              <li key={c.id} className={`panel-seo__cek-${c.status}`}>
                <span className="panel-seo__titik" aria-hidden="true" />
                <strong>{c.label}</strong>
                <span className="panel-seo__status">{c.status === 'hijau' ? 'Sesuai' : 'Perlu dilihat'}</span>
                <span>{c.pesan}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel-seo__bagian">
          <h3>Kanibalisasi keyphrase</h3>
          {data.kanibalisasi.length === 0 ? (
            <p>Belum ada artikel lain dengan keyphrase yang sama atau sangat mirip.</p>
          ) : (
            <ul className="panel-seo__daftar">
              {data.kanibalisasi.map((a) => (
                <li key={a.id}>
                  <span className="panel-seo__label-kuning">{a.tingkat === 'sama' ? 'Sama' : 'Sangat mirip'}</span>{' '}
                  <a href={a.urlAdmin} target="_blank" rel="noreferrer">
                    {a.judul}
                  </a>{' '}
                  memakai keyphrase &quot;{a.keyphrase}&quot;. Gabungkan, atau bedakan sudut bahasannya.
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel-seo__bagian">
          <h3>Saran link internal</h3>
          {data.saran.length === 0 ? (
            <p>Belum ada saran. Isi pilar dan keyphrase dulu.</p>
          ) : (
            <ul className="panel-seo__daftar">
              {data.saran.map((s) => (
                <li key={s.id}>
                  <a href={s.urlAdmin} target="_blank" rel="noreferrer">
                    {s.judul}
                  </a>{' '}
                  <span className="panel-seo__redup">
                    {s.path || 'belum punya slug'}, {s.alasan}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel-seo__bagian">
          <h3>Pratinjau hasil Google</h3>
          <div className="panel-seo__google-wadah">
            {(['desktop', 'hp'] as const).map((perangkat) => {
              const t = hasil.pratinjau[perangkat]
              return (
                <figure key={perangkat} className={`panel-seo__google panel-seo__google-${perangkat}`}>
                  <figcaption>{perangkat === 'desktop' ? 'Desktop' : 'HP'}</figcaption>
                  <div className="panel-seo__google-situs">{data.situs.namaSitus}</div>
                  <div className="panel-seo__google-url">{t.url}</div>
                  <div className="panel-seo__google-judul">{t.judul}</div>
                  <div className="panel-seo__google-deskripsi">{t.deskripsi}</div>
                </figure>
              )
            })}
          </div>
          {hasil.noindex ? <p className="panel-seo__label-kuning">Halaman ini noindex: tidak akan tampil di Google.</p> : null}
          <p className="panel-seo__redup">Canonical: {hasil.canonical}</p>
        </section>

        <section className="panel-seo__bagian">
          <h3>Kartu sosial (WhatsApp, Facebook, X)</h3>
          <figure className="panel-seo__kartu">
            {/* Pratinjau admin memakai <img> biasa: URL Cloudinary sudah berukuran tetap 1200x630. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hasil.gambarOg.url} alt={hasil.gambarOg.alt} width={hasil.gambarOg.width} height={hasil.gambarOg.height} />
            <figcaption>
              <span className="panel-seo__redup">{hasil.pratinjau.sosial.url}</span>
              <strong>{hasil.pratinjau.sosial.judul}</strong>
              <span>{hasil.pratinjau.sosial.deskripsi}</span>
            </figcaption>
          </figure>
        </section>
      </div>
    )
  }
  ```

  `src/modules/seo/PanelSeo.scss`

  ```scss
  // Panel SEO di admin. Memakai variabel tema Payload supaya ikut mode terang dan gelap admin.
  // Status tidak hanya ditandai warna: setiap cek punya teks "Sesuai" atau "Perlu dilihat".

  .panel-seo {
    display: grid;
    gap: calc(var(--base) * 1.5);
    margin-bottom: calc(var(--base) * 2);
    font-size: 14px;
    line-height: 1.5;

    h3 {
      margin: 0 0 calc(var(--base) * 0.5);
      font-size: 16px;
    }

    p {
      margin: 0 0 calc(var(--base) * 0.5);
    }

    a {
      text-decoration: underline;
    }
  }

  .panel-seo__bagian {
    padding: var(--base);
    border: 1px solid var(--theme-elevation-150);
    border-radius: 14px;
  }

  .panel-seo__skor,
  .panel-seo__redup,
  .panel-seo__catatan {
    color: var(--theme-elevation-600);
    font-weight: 400;
  }

  .panel-seo__skor {
    margin-left: calc(var(--base) * 0.5);
  }

  .panel-seo__cek,
  .panel-seo__daftar {
    display: grid;
    gap: calc(var(--base) * 0.5);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .panel-seo__cek li {
    display: grid;
    grid-template-columns: 12px 1fr auto;
    column-gap: calc(var(--base) * 0.5);
    align-items: baseline;

    > span:last-child {
      grid-column: 2 / -1;
      color: var(--theme-elevation-800);
    }
  }

  .panel-seo__titik {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .panel-seo__cek-hijau .panel-seo__titik {
    background: #1f7a4d;
  }

  .panel-seo__cek-kuning .panel-seo__titik {
    background: #f2c230;
  }

  .panel-seo__status {
    font-size: 12px;
    color: var(--theme-elevation-600);
  }

  .panel-seo__label-kuning {
    display: inline-block;
    padding: 0 6px;
    border-radius: 6px;
    background: #f2c230;
    color: #111111;
    font-weight: 700;
  }

  .panel-seo__google-wadah {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: var(--base);
    margin-bottom: calc(var(--base) * 0.5);
  }

  .panel-seo__google {
    margin: 0;
    padding: var(--base);
    border-radius: 14px;
    background: #ffffff;
    color: #202124;
    font-family: Arial, sans-serif;

    figcaption {
      margin-bottom: 6px;
      font-size: 12px;
      color: #5c5852;
    }
  }

  .panel-seo__google-hp {
    max-width: 380px;
  }

  .panel-seo__google-situs {
    font-size: 14px;
  }

  .panel-seo__google-url {
    font-size: 12px;
    color: #4d5156;
  }

  .panel-seo__google-judul {
    margin: 4px 0;
    font-size: 20px;
    line-height: 1.3;
    color: #1a0dab;
  }

  .panel-seo__google-hp .panel-seo__google-judul {
    font-size: 18px;
  }

  .panel-seo__google-deskripsi {
    font-size: 14px;
    color: #4d5156;
  }

  .panel-seo__kartu {
    max-width: 500px;
    margin: 0;
    overflow: hidden;
    border: 1px solid var(--theme-elevation-150);
    border-radius: 14px;

    img {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 1200 / 630;
      object-fit: cover;
      background: var(--theme-elevation-100);
    }

    figcaption {
      display: grid;
      gap: 2px;
      padding: var(--base);
    }
  }

  .panel-seo__galat {
    color: var(--theme-error-500);
  }
  ```

- [ ] **Langkah 6: Pasang endpoint dan panel di koleksi artikel**

  ```diff
  diff --git a/src/collections/Artikel.ts b/src/collections/Artikel.ts
  index b074e93..6af2611 100644
  --- a/src/collections/Artikel.ts
  +++ b/src/collections/Artikel.ts
  @@ -12,6 +12,7 @@ import { revalidasiPublik } from '@/hooks/revalidasiPublik'
   import { LABEL_TIPE_ARTIKEL, TIPE_ARTIKEL, type TipeArtikel } from '@/lib/konstanta'
   import { validasiLebarGambar } from '@/lib/media'
   import type { TargetPath } from '@/lib/paths'
  +import { endpointPanelSeo } from '@/modules/seo/endpoint'
   
   async function validasiGambarUtama(value: unknown, { req }: { req: PayloadRequest }) {
     if (!value) return 'Gambar utama wajib diisi.'
  @@ -35,6 +36,7 @@ export const Artikel: CollectionConfig = {
       group: 'Konten',
     },
     access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  +  endpoints: [endpointPanelSeo],
     versions: {
       drafts: { autosave: { interval: 1500 }, schedulePublish: true },
       maxPerDoc: 50,
  @@ -102,7 +104,17 @@ export const Artikel: CollectionConfig = {
               },
             ],
           },
  -        { label: 'SEO', fields: [seoField] },
  +        {
  +          label: 'SEO',
  +          fields: [
  +            {
  +              name: 'panelSeo',
  +              type: 'ui',
  +              admin: { components: { Field: '@/modules/seo/PanelSeo#PanelSeo' } },
  +            },
  +            seoField,
  +          ],
  +        },
         ],
       },
       slugField('judul', {
  ```

- [ ] **Langkah 7: Perbarui import map dan tipe, jalankan semua pemeriksaan**

  Jalankan:

  ```bash
  npm run generate:importmap
  grep -n "PanelSeo" "src/app/(payload)/admin/importMap.js"
  npm run generate:types && git diff --stat src/payload-types.ts
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run build
  ```

  Hasil yang diharapkan: import map berisi dua baris `PanelSeo` (import dan entri `"@/modules/seo/PanelSeo#PanelSeo"`); `payload-types.ts` tidak berubah (field `ui` tidak disimpan); type check dan lint bersih; unit `Test Files 27 passed (27)`, `Tests 203 passed (203)`; integrasi `Test Files 13 passed (13)`, `Tests 48 passed (48)`; build selesai. Log tes integrasi berisi satu `APIError: Masuk dulu untuk memakai panel SEO.` yang memang diharapkan.

- [ ] **Langkah 8: Periksa panel di browser**

  Jalankan `npm run dev`, masuk ke `http://localhost:3000/admin`, buka artikel contoh dari Task 7, klik tab **SEO**.

  Hasil yang diharapkan: di atas field SEO tampil lima kotak: "Checklist SEO" (12 cek dengan titik hijau/kuning, teks "Sesuai"/"Perlu dilihat", dan ringkasan "N dari 12 sudah sesuai"), "Kanibalisasi keyphrase", "Saran link internal" (artikel lain sepilar dengan alasan), "Pratinjau hasil Google" (Desktop dan HP, judul `... · point.`, URL `point.lat › slug`, canonical), dan "Kartu sosial (WhatsApp, Facebook, X)". Mengetik keyphrase yang sama dengan artikel lain memunculkan label "Sama" dengan tautan ke artikel itu dalam sekitar satu detik. Di tab Network, setiap perubahan memanggil `POST /api/artikel/panel-seo` (200). Gambar kartu sosial kosong tanpa kredensial Cloudinary (URL `res.cloudinary.com/palsu/...`), itu wajar. Kembalikan `CLAUDE.md` dengan `git checkout CLAUDE.md` bila `next dev` menambahkan blok agent-rules.

- [ ] **Langkah 9: Commit**

  ```bash
  git add "src/app/(payload)/admin/importMap.js" src/collections/Artikel.ts src/modules/seo/PanelSeo.scss \
    src/modules/seo/PanelSeo.tsx src/modules/seo/endpoint.ts src/modules/seo/kemiripan.ts src/modules/seo/panel.ts \
    src/modules/seo/pratinjau.ts tests/int/panel-seo.int.spec.ts tests/unit/seo-kemiripan.test.ts \
    tests/unit/seo-panel.test.ts tests/unit/seo-pratinjau.test.ts
  git commit -m "feat(seo): panel SEO di editor artikel (checklist, kanibalisasi, saran link, pratinjau)"
  ```


### Task 9: Ekspor modul, `ambilSitus`, dan aturan SEO di CLAUDE.md

**Files:**
- Create: `src/modules/seo/situs.ts`
- Modify: `src/modules/seo/index.ts`, `CLAUDE.md`, `tests/int/sitemap.int.spec.ts`

**Interfaces:**
- Consumes: `ambilPengaturan` (Task 7), `klienMedia` (Rencana 2).
- Produces: `ambilSitus(payload): Promise<Situs>`; indeks modul `@/modules/seo` berisi `metadata`, `jsonLd`, `serialisasiJsonLd`, `remahRoti`, `tipeSchemaArtikel`, `analisis`, `skor`, `BATAS`, pembentuk sitemap/robots/RSS, `ambilSitus`, dan semua tipe masukan. Rencana 4 memakainya seperti ini:

  ```ts
  export async function generateMetadata({ params }) {
    const payload = await getPayload({ config })
    const doc = await ambilArtikel(payload, (await params).slug) // depth 1, di-cache dengan TAG.dokumen('artikel', id)
    return metadata({ jenis: 'artikel', doc }, await ambilSitus(payload))
  }
  ```

- [ ] **Langkah 1: Tulis tes yang gagal**

  Tambahkan di akhir `tests/int/sitemap.int.spec.ts` (dan import `ambilSitus`):

  ```diff
  diff --git a/tests/int/sitemap.int.spec.ts b/tests/int/sitemap.int.spec.ts
  index 036fe19..2ea8f29 100644
  --- a/tests/int/sitemap.int.spec.ts
  +++ b/tests/int/sitemap.int.spec.ts
  @@ -1,6 +1,7 @@
   import { beforeAll, describe, expect, it } from 'vitest'
   
   import { ambilEntriFeed, ambilEntriNews, ambilEntriSitemap, ambilIndexSitemap, ambilPengaturan } from '@/modules/seo/data'
  +import { ambilSitus } from '@/modules/seo/situs'
   import type { PengaturanSitus } from '@/modules/seo/tipe'
   import { saringNews } from '@/modules/seo/xml'
   
  @@ -95,3 +96,11 @@ describe('data rute teknis dari Payload', () => {
       expect(item?.kategori).toBeTruthy()
     })
   })
  +
  +describe('ambilSitus', () => {
  +  it('menggabungkan pengaturan SEO dengan cloud name klien media', async () => {
  +    const payload = await getTestPayload()
  +    const hasil = await ambilSitus(payload)
  +    expect(hasil).toMatchObject({ namaSitus: 'point.', urlSitus: 'https://point.lat', cloudName: 'palsu' })
  +  })
  +})
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:int
  ```

  Hasil yang diharapkan: FAIL di `tests/int/sitemap.int.spec.ts` dengan `Cannot find module '@/modules/seo/situs'` (atau `Failed to load url`).

- [ ] **Langkah 3: Implementasi dan dokumentasi**

  `src/modules/seo/situs.ts`

  ```ts
  import type { Payload } from 'payload'

  import { klienMedia } from '@/modules/media'

  import { ambilPengaturan } from './data'
  import type { Situs } from './tipe'

  /**
   * Pengaturan situs untuk `metadata()` dan `jsonLd()`: global `pengaturan-seo` (depth 1, supaya logo
   * dan gambar OG default berupa dokumen media) ditambah cloud name Cloudinary dari modul media.
   * Rencana 4 membungkusnya dengan cache bertag `TAG.pengaturanSeo`.
   */
  export async function ambilSitus(payload: Payload): Promise<Situs> {
    return { ...(await ambilPengaturan(payload)), cloudName: klienMedia().cloudName }
  }
  ```

  `src/modules/seo/index.ts`

  ```ts
  /**
   * Modul SEO (spesifikasi §5): antarmuka kecil, fungsi murni.
   *
   * - `metadata(masukan, situs)` untuk `generateMetadata` halaman publik (Rencana 4).
   * - `jsonLd(masukan, situs)` untuk `<script type="application/ld+json">`, dirender dengan `serialisasiJsonLd`.
   * - `analisis(artikel, { urlSitus })` untuk checklist panel SEO di editor.
   * - `remahRoti(masukan)` untuk breadcrumb tampil (sama dengan schema BreadcrumbList).
   * - `ambilSitus(payload)` mengisi argumen `situs` dari global `pengaturan-seo`.
   *
   * Rute teknis (`/sitemap.xml`, `/sitemap/{jenis}.xml`, `/news-sitemap.xml`, `/robots.txt`,
   * `/feed.xml`) ada di `src/app/(frontend)/` dan memakai `rute.ts`. Ekspor ini aman untuk server;
   * komponen admin mengimpor `panel.ts` langsung.
   */
  export { metadata, canonicalDokumen, PATH_FEED } from './metadata'
  export { jsonLd, remahRoti, serialisasiJsonLd, tipeSchemaArtikel } from './jsonld'
  export type { JsonLd, NodeJsonLd, RemahRoti } from './jsonld'
  export { analisis, skor, BATAS } from './analisis'
  export type { ArtikelAnalisis, Cek, IdCek, StatusCek } from './analisis'
  export { entriFeed, entriNews, entriSitemap, lastmodDokumen, layakSitemap } from './sitemap'
  export * from './xml'
  export { judulSeo, deskripsiDokumen, gambarOgDokumen, pathDokumen, urlAbsolut } from './dokumen'
  export { ambilSitus } from './situs'
  export type * from './tipe'
  ```

  Tambahkan dua aturan di bagian Konvensi `CLAUDE.md`:

  ```diff
  diff --git a/CLAUDE.md b/CLAUDE.md
  index 804822f..d2ecf51 100644
  --- a/CLAUDE.md
  +++ b/CLAUDE.md
  @@ -27,6 +27,8 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Logika bisnis ditulis sebagai fungsi murni di `src/lib/` atau `src/modules/` dan diuji unit. Config Payload hanya merangkai.
   - Satu file satu tanggung jawab. Koleksi di `src/collections/`, global di `src/globals/`, blok di `src/blocks/`, field bersama di `src/fields/`, hook di `src/hooks/`, akses di `src/access/`.
   - Path publik selalu dibangun lewat `pathFor()` di `src/lib/paths.ts`, jangan merangkai string URL manual.
  +- SEO selalu lewat `src/modules/seo`: `metadata()` untuk `generateMetadata`, `jsonLd()` + `serialisasiJsonLd()` untuk JSON-LD, `remahRoti()` untuk breadcrumb, `ambilSitus()` untuk pengaturan situs. Jangan menulis `<title>`, canonical, robots, atau JSON-LD manual di halaman. Rute teknis (`/sitemap.xml`, `/sitemap/{jenis}.xml`, `/news-sitemap.xml`, `/robots.txt`, `/feed.xml`) ada di `src/app/(frontend)/` dan hanya merangkai fungsi modul.
  +- Tag cache di `src/lib/tag.ts` (`TAG`): data halaman publik di-cache dengan tag yang sama dengan yang direvalidasi hook `revalidasiPublik` (`{koleksi}:{id}`, `pilar:{slug}`, `beranda`, `sitemap`, `pengaturan-seo`). Koleksi publik baru wajib memasang `revalidasiPublik(koleksi)`.
   - URL media selalu lewat `src/modules/media` (`bangunUrl`, `propsGambar`, `urlOg`), jangan merangkai URL Cloudinary manual. `next/image` memakai loader kustom Cloudinary, jadi `src` harus URL dari `bangunUrl`/`propsGambar` dan `width`/`height` wajib diisi.
   - Media disimpan di Cloudinary (folder `point/gambar`, `point/video`). Tanpa `CLOUDINARY_*` di env (lokal, tes) dipakai klien palsu dalam memori: file tidak tersimpan permanen. Tes tidak boleh memanggil jaringan.
   - Copy UI: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru.
  ```

- [ ] **Langkah 4: Jalankan semua pemeriksaan**

  Jalankan:

  ```bash
  npm run generate:types && git diff --stat src/payload-types.ts
  npm run generate:importmap && git diff --stat "src/app/(payload)/admin/importMap.js"
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run build
  ```

  Hasil yang diharapkan: `payload-types.ts` dan import map tidak berubah; type check dan lint bersih; unit `Test Files 27 passed (27)`, `Tests 203 passed (203)`; integrasi `Test Files 13 passed (13)`, `Tests 49 passed (49)`; build mencantumkan `ƒ /feed.xml`, `ƒ /news-sitemap.xml`, `ƒ /robots.txt`, `ƒ /sitemap.xml`, `ƒ /sitemap/[jenis]`.

- [ ] **Langkah 5: Commit**

  ```bash
  git add CLAUDE.md src/modules/seo/index.ts src/modules/seo/situs.ts tests/int/sitemap.int.spec.ts
  git commit -m "docs(seo): ekspor modul SEO, ambilSitus, dan aturan SEO di CLAUDE.md"
  ```


---

## Selesai bila

- `npm test` lulus (203 unit, 49 integrasi), `npm run typecheck` dan `npm run lint` bersih, `npm run build` berhasil dan mencantumkan lima rute teknis, semuanya tanpa kredensial Cloudinary dan tanpa jaringan.
- Uji asap Task 7: `/sitemap.xml` (enam jenis), `/sitemap/artikel.xml`, `/news-sitemap.xml`, `/robots.txt`, `/feed.xml` menjawab 200 dengan tipe konten yang benar; jenis sitemap lain 404; terbit, simpan draf, dan batal terbit tercermin sesuai aturan di server yang berjalan.
- Panel SEO tampil di tab SEO artikel dengan 12 cek, kanibalisasi, saran link, pratinjau Google desktop/HP, dan kartu sosial; endpoint menolak pengguna yang belum masuk.
- `payload-types.ts` tidak berubah (tidak ada perubahan skema).

## Cakupan yang ditunda (dengan alasan)

| Butir spesifikasi | Ditunda ke | Alasan |
|---|---|---|
| Halaman publik memanggil `metadata()`/`jsonLd()`, breadcrumb tampil, data halaman di-cache dengan `TAG` | Rencana 4 | halaman belum ada; fungsi, tag, dan contoh pemakaian (Task 9) sudah siap |
| `/`, `/tools`, `/glosarium`, `/video`, dan halaman subkategori di sitemap | Rencana 4 | bukan dokumen di enam jenis sitemap spesifikasi §8 dan halamannya belum ada; menambahkan URL yang masih 404 merugikan. Tambahkan ke `halaman.xml`/`pilar.xml` saat halamannya dibuat. |
| `/ads.txt` | Rencana 8 | bagian modul iklan (global `iklan`) |
| `/{indexnow-key}.txt`, submit sitemap ke Search Console, langkah revalidasi Mesin Indexing | Rencana 6 | bagian modul `indexer`; Rencana 6 memanggil `revalidasi()` dari `src/hooks/revalidasiPublik.ts` |
| Halaman yatim, link rusak, log 404, dashboard SEO | Rencana 6 | dashboard dan job berkala |
| Panel SEO untuk tools, video, pilar, penulis, halaman | tidak direncanakan | spesifikasi §8 menyebut panel "per artikel"; koleksi lain tetap punya grup `seo` dan memakai `metadata()`/`jsonLd()` yang sama |
| Tes `seo` "dengan snapshot" (spesifikasi §16) | diganti | dipakai `toEqual` dengan nilai harapan eksplisit di file tes, supaya nilai yang dikunci terbaca dan direview di rencana ini; file snapshot hasil generate tidak bisa direview sebelum dibuat |

## Risiko dan pertanyaan terbuka

| Risiko | Mitigasi |
|---|---|
| `unstable_cache` berstatus usang di Next 16 (digantikan `'use cache'` + Cache Components) | Proyek belum mengaktifkan `cacheComponents`; semua pembungkus ada di satu file (`rute.ts`). Migrasi dicatat untuk Rencana 4 bila halaman memakai Cache Components. |
| Galat `revalidateTag` di luar server Next dikenali dari teks pesannya | Tes unit `revalidasi` "di luar server Next tidak melempar galat" akan gagal bila teks itu berubah saat upgrade Next. |
| `lastmod` pilar, penulis, tools, video, halaman memakai `updatedAt` sehingga berubah di setiap simpan (pilar dan penulis tanpa draf) | Diterima untuk MVP. Pertanyaan untuk pemilik: perlu saklar "perubahan besar" (`diperbaruiBesar`) di koleksi lain? Itu perubahan skema aditif kecil. |
| `news:name` harus sama persis dengan nama publikasi di Google News | Memakai `namaSitus` ("point."). Pemilik perlu memastikan nama di Google Publisher Center sebelum mendaftar; ubah `namaSitus` bila berbeda. |
| `WebApplication` tanpa rating tidak memenuhi syarat rich result aplikasi | Disengaja; schema tetap membantu pemahaman halaman. Rating hanya ditambah bila kelak ada ulasan pengguna sungguhan. |
| Kanibalisasi dan saran link membandingkan maksimal 500 artikel terbaru per permintaan | Cukup untuk MVP; Rencana 6 bisa memakai indeks keyphrase bila koleksi membesar. |
| Pratinjau Google memakai batas karakter, sedangkan Google memotong berdasarkan lebar piksel | Ditulis sebagai perkiraan di panel; checklist tetap memakai rentang 50-60 dan 150-160 dari spesifikasi. |
| `ambilSitus()` memanggil `klienMedia()`, yang di `next start` tanpa `CLOUDINARY_*` sengaja melempar galat (Rencana 2) | Rute teknis tidak memakai `cloudName` sehingga tetap jalan tanpa kredensial; halaman Rencana 4 butuh kredensial di produksi seperti media. |
| Sitemap sudah merujuk URL artikel, pilar, dan penulis yang halamannya baru dibuat di Rencana 4 | Situs belum live dan submit sitemap baru dilakukan Rencana 6; jangan mendaftarkan sitemap ke Search Console sebelum Rencana 4 selesai. |

## Sumber riset

- Next.js 16.3.3 (dokumentasi terpasang di `node_modules/next/dist/docs/`, sama dengan nextjs.org): `revalidateTag` (https://nextjs.org/docs/app/api-reference/functions/revalidateTag), `unstable_cache` (https://nextjs.org/docs/app/api-reference/functions/unstable_cache), Caching (Previous Model) (https://nextjs.org/docs/app/guides/caching-without-cache-components), `generateSitemaps` (https://nextjs.org/docs/app/api-reference/functions/generate-sitemaps), `sitemap.xml` (https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap), Route Handlers (https://nextjs.org/docs/app/getting-started/route-handlers, https://nextjs.org/docs/app/api-reference/file-conventions/route); sumber `next@16.3.3` `server/web/spec-extension/revalidate.js`, `unstable-cache.js`, `server/route-modules/app-route/module.js`, `lib/metadata/is-metadata-route.js`, `server/lib/generate-agent-files.js`.
- Google News sitemap: https://developers.google.com/search/docs/advanced/sitemaps/news-sitemap?hl=en
- Article structured data: https://developers.google.com/search/docs/data-types/article
- Video structured data: https://developers.google.com/search/docs/appearance/structured-data/video
- Software app structured data: https://developers.google.com/structured-data/rich-snippets/sw-app
- Protokol sitemap: https://www.sitemaps.org/protocol.html
- FAQ dan HowTo rich result dihapus: https://www.searchenginejournal.com/google-drops-faq-rich-results-from-search/574429/, https://www.searchenginejournal.com/google-completely-removes-how-to-rich-results/496479/
- Payload UI field: https://payloadcms.com/docs/v3/fields/ui.md; React hooks admin: https://payloadcms.com/docs/v3/admin/react-hooks.md; sumber `payload@3.92.1` (`utilities/reduceFieldsToValues.js`, `utilities/unflatten.js`, `collections/operations/utilities/update.js`, `versions/getLatestCollectionVersion.js`), `@payloadcms/ui@3.92.1` (`forms/Form`, `elements/PublishButton`, `elements/UnpublishButton`), `@payloadcms/richtext-lexical@3.92.1` (tipe node `link`, `upload`, `heading`).

Rencana berikutnya: **Rencana 4 (Frontend publik & design system)**, memakai `metadata`, `jsonLd`, `remahRoti`, `ambilSitus`, dan `TAG` dari rencana ini.
