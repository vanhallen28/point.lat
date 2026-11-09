# Rencana 2: Media Cloudinary point.lat

> **Catatan revisi 9 November 2026 (v1.1.0, keputusan pemilik).** Rencana ini sudah selesai dieksekusi; teksnya disesuaikan supaya tidak bertentangan dengan keputusan terbaru:
> 1. Hosting **Vercel paket gratis (Hobby)**: cron Vercel sekali sehari, jadwal 10 menit opsional lewat Supabase Cron (runbook rilis H5), Pro hanya saat iklan dinyalakan.
> 2. **Full Next.js dengan perintah npm**: semua perintah `pnpm` diganti padanan npm (`npm run <skrip>`, `npm run <skrip> -- <argumen>`, `npx`, `npm install`, `npm ci`), `pnpm-lock.yaml` menjadi `package-lock.json`. Potongan `package.json` lama yang masih memuat pengaturan khusus pnpm (`onlyBuiltDependencies`) adalah catatan sejarah; versi sekarang memakai `allowScripts`.
> 3. **Setiap pembaruan dikirim sebagai zip + perintah terminal** (spesifikasi §21).
> 4. **Tanpa Docker, hanya Next.js, Vercel, dan Supabase**: `docker-compose.yml`, `Dockerfile`, dan `docker/` dihapus di v1.1.0. Langkah yang dulu membuat file itu dibiarkan sebagai sejarah. Tes memakai Postgres di mesin itu sendiri (Postgres bawaan runner GitHub di CI, Postgres sistem di sesi Claude); komputer pemilik memakai proyek Supabase pratinjau.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memindahkan semua gambar dan video koleksi `media` ke Cloudinary: unggah langsung dari browser (signed upload), incoming transformation, URL pengiriman per preset, video HLS + poster otomatis, image loader Next.js, dan URL gambar OG, semuanya teruji tanpa jaringan.

**Architecture:** Modul `src/modules/media/` berisi fungsi murni (URL, OG, opsi unggah) dan seam `KlienCloudinary` dengan dua implementasi: SDK `cloudinary` (server) dan klien palsu dalam memori. Adapter `GeneratedAdapter` untuk `@payloadcms/plugin-cloud-storage` menyimpan lewat klien itu dengan `disableLocalStorage: true`. Unggah dari admin memakai mekanisme `clientUploads` plugin (pola `@payloadcms/storage-s3`): endpoint server membuat tanda tangan Cloudinary + receipt Payload, browser mengirim file langsung ke `api.cloudinary.com`, lalu Payload memverifikasi receipt dan menyimpan metadata dari Cloudinary.

**Tech Stack:** Next.js 16.3.3, Payload 3.92.1, `@payloadcms/plugin-cloud-storage` 3.92.1, SDK `cloudinary` 2.11.0, Vitest 4, PostgreSQL 16/17, npm 11, Node 22.23.4+.

**Spesifikasi:** `docs/superpowers/specs/2026-11-03-point-lat-design.md` (§5 modul `media`, §6 koleksi `media`, §9 Media Cloudinary, §12 performa gambar, §15 upload gagal, §16 tes `media.url`).

**Rencana sebelumnya:** `docs/superpowers/plans/2026-11-04-rencana-1-fondasi.md` (baseline: 49 tes unit, 21 tes integrasi).

## Global Constraints

- Node `^22.23.4 || >=24.22.1`, npm 11. Versi dikunci: Payload `3.92.1`, `@payloadcms/plugin-cloud-storage` `3.92.1`, `cloudinary` `2.11.0`, Next `16.3.3`.
- Dependensi baru hanya dua: `@payloadcms/plugin-cloud-storage@3.92.1` (sudah disebut spesifikasi §5/§9) dan `cloudinary@2.11.0` (SDK server, disetujui). Tidak ada dependensi klien tambahan: unggah dari browser memakai `fetch` + `FormData` biasa.
- Kredensial hanya lewat env server: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Tidak ada `NEXT_PUBLIC_` untuk Cloudinary. API key dikirim ke browser hanya sebagai field signed upload (memang publik menurut Cloudinary); API secret tidak pernah keluar dari server.
- Tanpa ketiga env itu (lokal, `.env.test`, CI) aplikasi memakai **klien palsu dalam memori**. Tes tidak boleh memanggil jaringan. `tests/int/setup.ts` menghapus `CLOUDINARY_*` dari `process.env` supaya `.env` pengembang tidak bocor ke tes.
- Folder Cloudinary: `point/gambar` dan `point/video`. Ini penyederhanaan dari daftar folder spesifikasi §9 (`point/artikel`, `point/video`, `point/penulis`, `point/og`) karena satu koleksi `media` dipakai bersama artikel, penulis, dan SEO; OG dibuat sebagai URL transformasi, tidak diunggah. Aset sistem: `point/sistem/kanvas`.
- Incoming transformation: gambar `c_limit,w_2560,q_auto`; video `c_limit,w_1920,h_1920,br_6m,q_auto`. Video juga meminta turunan eager async `sp_auto/m3u8|so_auto/q_auto/jpg|q_auto/mp4`.
- Pengiriman gambar selalu `f_auto,q_auto`; preset `asli`, `kartu` (4:3), `hero` (16:9), `thumbnail` (1:1), `og` (1200x630), semuanya `c_fill,g_auto`. Lebar responsif lewat image loader kustom Next.js (`images.loader: 'custom'`). `width`/`height` selalu diisi.
- Nama domain berbahasa Indonesia seperti Rencana 1 (`unggah`, `bangunUrl`, `publicId`, `jenis`, `durasi`). Nama teknis framework tetap bahasa Inggris (adapter, hook, handler).
- Copy UI dan pesan galat: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru.
- **Perubahan skema harus aditif.** Rencana ini hanya menambah kolom `public_id`, `jenis` (enum), `durasi`, `_objectkey` di tabel `media`. Kolom lama (`alt`, `caption`, `kredit`, `url`, `thumbnail_u_r_l`, `filename`, `mime_type`, `filesize`, `width`, `height`, `focal_x`, `focal_y`) tetap; karena itu `focalPoint` **tidak** dimatikan. Bila Payload macet di "Pulling schema from database...", reset database yang bersangkutan:
  `PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -c "DROP DATABASE pointlat_test WITH (FORCE)" -c "CREATE DATABASE pointlat_test"` (tanpa Docker: `PGPASSWORD=postgres psql -h 127.0.0.1 -U postgres -c ...`).
- Setiap kali field koleksi berubah: `npm run generate:types`, lalu `npm run typecheck`. Setiap kali menambah komponen admin: `npm run generate:importmap`.
- Tes integrasi butuh Postgres jalan dan memakai `.env.test` (database `pointlat_test`).

## Keputusan teknis (hasil riset, dipakai di semua task)

| Topik | Keputusan | Dasar |
|---|---|---|
| Unggah langsung dari browser | Pakai mekanisme `clientUploads` plugin-cloud-storage: `initClientUploads` mendaftarkan endpoint server dan komponen klien yang dibuat dengan `createClientUploadHandler`; adapter mengaktifkan `clientUploads: true` dan `requiresClientUploadReceipt: true`. Endpoint membuat `public_id` di server, menandatangani parameter Cloudinary (`api_sign_request`, SHA-1), dan menerbitkan receipt Payload (`createClientUploadReceipt`) berisi `{ publicId }`. Saat dokumen dibuat, Payload memverifikasi receipt (HMAC dengan PAYLOAD_SECRET, terikat pengguna, koleksi, dan nama file) lalu memanggil `staticHandler` adapter dengan `clientUploadContext` untuk mengambil header file; adapter mengambil metadata aset lewat Admin API dan mencatatnya di `req.context`. Plugin melewati `handleUpload` untuk file yang membawa `clientUploadContext`, jadi file tidak diunggah ulang. | Sumber `@payloadcms/plugin-cloud-storage@3.92.1` (`initClientUploads`, `createClientUploadHandler`, `hooks/afterChange.js`), `@payloadcms/storage-s3@3.92.1` (`generateSignedURL.js`, `S3ClientUploadHandler.js`), `payload@3.92.1` (`addDataAndFileToRequest.js`, `getFileFromClientUpload.js`, `clientUploadReceipt.js`) |
| Plugin komunitas | Dinilai `@jhb.software/payload-cloudinary-plugin@0.5.0` (aktif, mendukung signed client upload). Tidak dipakai: butuh dua endpoint (tanda tangan + konfirmasi), menyuntik field `cloudinaryPublicId`, menimpa `adminThumbnail`, dan tidak punya seam klien untuk tes tanpa jaringan. Adapter sendiri lebih tipis dan mengikuti keputusan "default adapter sendiri". | npm registry, isi paket 0.5.0 |
| Unggah > 100 MB | Browser memecah file per 20 MB dengan header `X-Unique-Upload-Id` dan `Content-Range` (wajib Cloudinary untuk > 100 MB). Server memakai `upload_chunked_stream` untuk file > 99 MB atau temp file. | cloudinary.com/documentation/upload_images |
| `sp_auto` | Bisa on the fly ("processed for streaming ... on first request"), tetapi dokumentasi menyarankan eager untuk produksi dan on the fly hanya untuk video kecil (< 60 MB turunan). Dipilih: URL pengiriman `sp_auto/<id>.m3u8` + eager async `sp_auto/m3u8` saat unggah supaya penonton pertama tidak menunggu transkode. Dokumentasi tidak memberi contoh eager khusus `sp_auto`; bila Cloudinary menolaknya, Task 8 mencatat dan fallback ke eager `sp_full_hd/m3u8` (lihat Risiko). | cloudinary.com/documentation/adaptive_bitrate_streaming |
| Poster | `so_auto` (frame dipilih otomatis berdasarkan distribusi warna) dengan ekstensi `.jpg`: `so_auto/q_auto/<id>.jpg`. | cloudinary.com/documentation/video_previews_and_posters |
| Font OG | Archivo didukung lewat Google Fonts `l_text:Archivo@google_<ukuran>_<berat>:<teks>`; berat harus numerik (900). Sumbu `wdth` font variable tidak bisa diatur di text overlay, jadi OG memakai Archivo lebar normal (bukan wdth 68/80 seperti situs). Fallback bila suatu saat ditolak: unggah `Archivo-Black.ttf` sebagai raw authenticated dan pakai `l_text:Archivo-Black.ttf_72:...`. | cloudinary.com/documentation/image_text_layer_fonts |
| Latar OG | Kanvas PNG 1x1 putih `point/sistem/kanvas` (diunggah sekali dengan `npm run media:siapkan`), diregangkan `w_1200,h_630,c_scale` lalu `e_colorize:100,co_rgb:<warna pilar>`. Teks dikodekan ganda (`%252C` untuk koma, dst.). | cloudinary.com/documentation/image_text_layers, image_text_layer_advanced_options |
| Incoming gambar | `c_limit,w_2560,q_auto`: lebar maksimal 2560px sesuai keputusan, tinggi bebas supaya gambar potret tidak jatuh di bawah syarat lebar 1200px gambar utama. | cloudinary.com/documentation/eager_and_incoming_transformations |
| Incoming video | `c_limit,w_1920,h_1920,br_6m,q_auto`: 9:16 menjadi 1080x1920 (sama dengan batas default `sp_auto` 1080p), bitrate maks 6 Mbps (representasi 1080p H.264 Cloudinary 5,5 Mbps). Format diizinkan lewat `allowed_formats` (ikut ditandatangani). | cloudinary.com/documentation/adaptive_bitrate_streaming (tabel profil), video_optimization (`br_`) |
| `url` dokumen | `disablePayloadAccessControl: true` sehingga field `url` berisi URL CDN Cloudinary (gambar `f_auto,q_auto`, video MP4 `q_auto`). `/api/media/file/<nama>` mengarah 302 ke CDN. | `plugin-cloud-storage` `hooks/afterRead.js`, `beforeChange.js` |
| Batas paket gratis | Free: gambar maks 10 MB, video maks 100 MB, transformasi video maks 40 MB. Plus: 20 MB / 2 GB / 300 MB. File di atas batas ditolak Cloudinary dengan pesan yang ditampilkan di dialog unggah. | cloudinary.com/documentation/pricing |

## Struktur file setelah rencana ini

```
src/modules/media/
  url.ts             bangunUrl (preset gambar & video), lebarkan, urlDokumen, dimensiPreset, EAGER_VIDEO
  og.ts              urlOg, kodekanTeks, KANVAS_OG
  klien.ts           seam KlienCloudinary + tipe
  palsu.ts           klien palsu dalam memori (tes, dev tanpa kredensial)
  unggah.ts          folder, incoming transformation, publicId, tanda tangan, unggah(file) -> { publicId, meta }
  cloudinary.ts      klien sungguhan di atas SDK cloudinary (server)
  index.ts           klienDariEnv, klienMedia, pakaiKlien + ekspor publik
  adapter.ts         GeneratedAdapter untuk plugin-cloud-storage
  plugin.ts          mediaCloudinary(): plugin cloud storage + clientUploads
  tandaTangan.ts     endpoint POST /api/media-cloudinary-tanda-tangan
  unggahLangsung.ts  hook beforeOperation/beforeChange untuk unggahan langsung
  kirim.ts           kirimKeCloudinary (browser, chunk > 100 MB)
  UnggahLangsung.tsx komponen klien admin (createClientUploadHandler)
  loader.ts          image loader kustom Next.js
  props.ts           propsGambar untuk next/image
  siapkan.ts         siapkanCloudinary (kanvas OG)
src/scripts/siapkan-media.ts   CLI npm run media:siapkan
src/collections/Media.ts       + publicId, jenis, durasi; mimeTypes eksplisit
tests/unit/media-*.test.ts     url, og, unggah, adapter, kirim, loader, siapkan
tests/int/media.int.spec.ts, tests/int/media-langsung.int.spec.ts
```

## Jumlah tes yang diharapkan

| Setelah task | Unit | Integrasi |
|---|---|---|
| Baseline Rencana 1 | 49 | 21 |
| 1 URL & preset | 60 | 21 |
| 2 OG | 66 | 21 |
| 3 Seam klien & opsi unggah | 79 | 21 |
| 4 Adapter + koleksi | 88 | 25 |
| 5 Unggah langsung | 96 | 32 |
| 6 Image loader | 101 | 32 |
| 7 Skrip & dokumentasi | 102 | 32 |
| 8 Verifikasi langsung (butuh kredensial) | 102 | 32 |

---

### Task 1: Pembangun URL pengiriman dan preset

**Files:**
- Create: `src/modules/media/url.ts`
- Test: `tests/unit/media-url.test.ts`

**Interfaces:**
- Consumes: tidak ada (fungsi murni tanpa SDK, aman untuk server, komponen klien, dan image loader).
- Produces:
  - `type JenisMedia = 'gambar' | 'video'`; `type PresetGambar = 'asli' | 'kartu' | 'hero' | 'thumbnail' | 'og'`; `type PresetVideo = 'hls' | 'mp4' | 'poster'`; `type Preset = PresetGambar | PresetVideo`.
  - `UKURAN_OG = { width: 1200, height: 630 }`; `EAGER_VIDEO = 'sp_auto/m3u8|so_auto/q_auto/jpg|q_auto/mp4'`.
  - `asal(cloudName: string, jenis: JenisMedia): string` (basis `https://res.cloudinary.com/<cloud>/<image|video>/upload`).
  - `bangunUrl(cloudName: string, publicId: string, preset?: Preset, opsi?: { lebar?: number }): string`. Ini `url(publicId, preset)` dari spesifikasi §5.
  - `lebarkan(src: string, lebar: number, kualitas?: number): string` (dipakai loader Task 6).
  - `urlDokumen(cloudName: string, doc: { publicId?: string | null; jenis?: JenisMedia | null }): string` (isi field `url`: gambar utuh atau MP4).
  - `dimensiPreset(preset: PresetGambar, asli: { width: number; height: number }, opsi?: { lebar?: number }): { width: number; height: number }`.

URL pengiriman diuji dengan string persis supaya preset tidak berubah diam-diam (spesifikasi §16: "`media.url` untuk setiap preset"). Turunan video yang dibuat eager (Task 3) memakai teks transformasi yang sama persis dengan URL pengiriman, jadi permintaan pertama pembaca langsung kena cache.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/media-url.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { bangunUrl, dimensiPreset, EAGER_VIDEO, lebarkan, urlDokumen } from '@/modules/media/url'

  const GAMBAR = 'https://res.cloudinary.com/demo/image/upload'
  const VIDEO = 'https://res.cloudinary.com/demo/video/upload'
  const ID = 'point/gambar/slip-gaji-1a2b3c4d'
  const ID_VIDEO = 'point/video/cara-hitung-thr-5e6f7a8b'

  describe('bangunUrl untuk gambar', () => {
    it('tanpa preset mengirim gambar utuh dengan f_auto,q_auto', () => {
      expect(bangunUrl('demo', ID)).toBe(`${GAMBAR}/f_auto,q_auto/${ID}`)
    })

    it('membangun URL untuk setiap preset', () => {
      expect(bangunUrl('demo', ID, 'kartu')).toBe(`${GAMBAR}/c_fill,g_auto,ar_4:3/f_auto,q_auto/${ID}`)
      expect(bangunUrl('demo', ID, 'hero')).toBe(`${GAMBAR}/c_fill,g_auto,ar_16:9/f_auto,q_auto/${ID}`)
      expect(bangunUrl('demo', ID, 'thumbnail')).toBe(`${GAMBAR}/c_fill,g_auto,ar_1:1/f_auto,q_auto/${ID}`)
      expect(bangunUrl('demo', ID, 'og')).toBe(`${GAMBAR}/c_fill,g_auto,w_1200,h_630/f_auto,q_auto/${ID}`)
    })

    it('membatasi lebar tanpa memperbesar gambar', () => {
      expect(bangunUrl('demo', ID, 'kartu', { lebar: 640 })).toBe(
        `${GAMBAR}/c_fill,g_auto,ar_4:3/c_limit,w_640,f_auto,q_auto/${ID}`,
      )
    })
  })

  describe('bangunUrl untuk video', () => {
    it('menyediakan HLS adaptif, MP4 cadangan, dan poster dari frame otomatis', () => {
      expect(bangunUrl('demo', ID_VIDEO, 'hls')).toBe(`${VIDEO}/sp_auto/${ID_VIDEO}.m3u8`)
      expect(bangunUrl('demo', ID_VIDEO, 'mp4')).toBe(`${VIDEO}/q_auto/${ID_VIDEO}.mp4`)
      expect(bangunUrl('demo', ID_VIDEO, 'poster')).toBe(`${VIDEO}/so_auto/q_auto/${ID_VIDEO}.jpg`)
    })

    it('turunan eager sama persis dengan URL pengiriman', () => {
      expect(EAGER_VIDEO).toBe('sp_auto/m3u8|so_auto/q_auto/jpg|q_auto/mp4')
    })

    it('poster bisa dibatasi lebarnya', () => {
      expect(bangunUrl('demo', ID_VIDEO, 'poster', { lebar: 300 })).toBe(
        `${VIDEO}/so_auto/c_limit,w_300,q_auto/${ID_VIDEO}.jpg`,
      )
    })
  })

  describe('lebarkan (dipakai image loader Next.js)', () => {
    it('menyisipkan lebar dan kualitas ke URL Cloudinary', () => {
      const kartu = bangunUrl('demo', ID, 'kartu')
      expect(lebarkan(kartu, 640)).toBe(`${GAMBAR}/c_fill,g_auto,ar_4:3/c_limit,w_640,f_auto,q_auto/${ID}`)
      expect(lebarkan(kartu, 640, 60)).toBe(`${GAMBAR}/c_fill,g_auto,ar_4:3/c_limit,w_640,f_auto,q_60/${ID}`)
      expect(lebarkan(bangunUrl('demo', ID, 'kartu', { lebar: 1200 }), 320)).toBe(
        `${GAMBAR}/c_fill,g_auto,ar_4:3/c_limit,w_320,f_auto,q_auto/${ID}`,
      )
      expect(lebarkan(bangunUrl('demo', ID_VIDEO, 'poster'), 480)).toBe(
        `${VIDEO}/so_auto/c_limit,w_480,q_auto/${ID_VIDEO}.jpg`,
      )
    })

    it('menambah parameter w ke URL di luar Cloudinary', () => {
      expect(lebarkan('/logo.svg', 640)).toBe('/logo.svg?w=640')
      expect(lebarkan('/gambar.png?v=2', 320)).toBe('/gambar.png?v=2&w=320')
    })
  })

  describe('urlDokumen', () => {
    it('memilih URL sesuai jenis media, kosong bila belum ada publicId', () => {
      expect(urlDokumen('demo', { publicId: ID, jenis: 'gambar' })).toBe(`${GAMBAR}/f_auto,q_auto/${ID}`)
      expect(urlDokumen('demo', { publicId: ID_VIDEO, jenis: 'video' })).toBe(
        `${VIDEO}/q_auto/${ID_VIDEO}.mp4`,
      )
      expect(urlDokumen('demo', { publicId: null, jenis: null })).toBe('')
    })
  })

  describe('dimensiPreset', () => {
    it('menghitung ukuran hasil potong sesuai rasio preset', () => {
      expect(dimensiPreset('kartu', { width: 1600, height: 900 })).toEqual({ width: 1200, height: 900 })
      expect(dimensiPreset('hero', { width: 1200, height: 1600 })).toEqual({ width: 1200, height: 675 })
      expect(dimensiPreset('thumbnail', { width: 800, height: 600 })).toEqual({ width: 600, height: 600 })
      expect(dimensiPreset('asli', { width: 800, height: 600 })).toEqual({ width: 800, height: 600 })
    })

    it('memakai ukuran tetap untuk og dan menyesuaikan lebar yang diminta', () => {
      expect(dimensiPreset('og', { width: 400, height: 300 })).toEqual({ width: 1200, height: 630 })
      expect(dimensiPreset('hero', { width: 2560, height: 1440 }, { lebar: 800 })).toEqual({ width: 800, height: 450 })
      expect(dimensiPreset('kartu', { width: 400, height: 300 }, { lebar: 800 })).toEqual({ width: 400, height: 300 })
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/media-url.test.ts` dengan `Cannot find package '@/modules/media/url'`.

- [ ] **Langkah 3: Implementasi**

  `src/modules/media/url.ts`

  ```ts
  /**
   * Pembangun URL pengiriman Cloudinary. Fungsi murni tanpa SDK supaya aman dipakai di server,
   * di komponen klien, dan di image loader Next.js.
   *
   * Dokumentasi: https://cloudinary.com/documentation/image_optimization,
   * https://cloudinary.com/documentation/adaptive_bitrate_streaming,
   * https://cloudinary.com/documentation/video_previews_and_posters
   */

  export type JenisMedia = 'gambar' | 'video'

  export type PresetGambar = 'asli' | 'kartu' | 'hero' | 'thumbnail' | 'og'
  export type PresetVideo = 'hls' | 'mp4' | 'poster'
  export type Preset = PresetGambar | PresetVideo

  export const UKURAN_OG = { width: 1200, height: 630 } as const

  /** Potongan transformasi per preset gambar. Segmen pengiriman (f_auto,q_auto) selalu terakhir. */
  const POTONGAN_GAMBAR: Record<PresetGambar, string | null> = {
    asli: null,
    kartu: 'c_fill,g_auto,ar_4:3',
    hero: 'c_fill,g_auto,ar_16:9',
    thumbnail: 'c_fill,g_auto,ar_1:1',
    og: `c_fill,g_auto,w_${UKURAN_OG.width},h_${UKURAN_OG.height}`,
  }

  const RASIO: Record<'kartu' | 'hero' | 'thumbnail', number> = {
    kartu: 4 / 3,
    hero: 16 / 9,
    thumbnail: 1,
  }

  /**
   * Turunan video. `hls` memakai sp_auto (Cloudinary memilih profil streaming, maks 1080p),
   * `mp4` cadangan progresif, `poster` frame yang dipilih otomatis (so_auto). Resolusi dan bitrate
   * asli sudah dibatasi incoming transformation saat unggah.
   */
  const VIDEO: Record<PresetVideo, { transformasi: string; format: string }> = {
    hls: { transformasi: 'sp_auto', format: 'm3u8' },
    mp4: { transformasi: 'q_auto', format: 'mp4' },
    poster: { transformasi: 'so_auto/q_auto', format: 'jpg' },
  }

  /**
   * Turunan yang dibuat Cloudinary di latar belakang saat video diunggah (eager, async). Teksnya
   * sama persis dengan URL pengiriman supaya permintaan pertama pembaca langsung kena cache.
   * Dokumentasi adaptive streaming menyarankan eager untuk produksi.
   */
  export const EAGER_VIDEO = (['hls', 'poster', 'mp4'] as const)
    .map((preset) => `${VIDEO[preset].transformasi}/${VIDEO[preset].format}`)
    .join('|')

  const PRESET_VIDEO: ReadonlySet<string> = new Set(Object.keys(VIDEO))

  export function isPresetVideo(preset: Preset): preset is PresetVideo {
    return PRESET_VIDEO.has(preset)
  }

  export function asal(cloudName: string, jenis: JenisMedia): string {
    return `https://res.cloudinary.com/${cloudName}/${jenis === 'video' ? 'video' : 'image'}/upload`
  }

  /** Segmen pengiriman: `c_limit,w_<lebar>` (tidak pernah memperbesar), format, lalu kualitas. */
  function segmenKirim(opsi: { lebar?: number; kualitas?: number; format: boolean }): string {
    return [
      opsi.lebar ? `c_limit,w_${Math.round(opsi.lebar)}` : null,
      opsi.format ? 'f_auto' : null,
      opsi.kualitas ? `q_${Math.round(opsi.kualitas)}` : 'q_auto',
    ]
      .filter(Boolean)
      .join(',')
  }

  /**
   * `url(publicId, preset)` dari spesifikasi §5. Gambar selalu `f_auto,q_auto`. Video: `hls`
   * (adaptive streaming), `mp4` (cadangan), `poster` (gambar dari frame video).
   */
  export function bangunUrl(
    cloudName: string,
    publicId: string,
    preset: Preset = 'asli',
    opsi: { lebar?: number } = {},
  ): string {
    if (isPresetVideo(preset)) {
      const { format } = VIDEO[preset]
      const transformasi =
        preset === 'poster' && opsi.lebar
          ? `so_auto/${segmenKirim({ lebar: opsi.lebar, format: false })}`
          : VIDEO[preset].transformasi
      return `${asal(cloudName, 'video')}/${transformasi}/${publicId}.${format}`
    }
    const kirim = segmenKirim({ lebar: opsi.lebar, format: true })
    return [asal(cloudName, 'gambar'), POTONGAN_GAMBAR[preset], kirim, publicId].filter(Boolean).join('/')
  }

  const POLA_KIRIM = /\/(?:c_limit,w_\d+,)?(f_auto,)?q_(?:auto|\d+)\//

  /**
   * Mengganti segmen pengiriman dengan lebar (dan kualitas) baru. Dipakai image loader Next.js untuk
   * `srcset`. URL di luar Cloudinary diberi parameter `w` supaya loader tetap memakai lebar.
   */
  export function lebarkan(src: string, lebar: number, kualitas?: number): string {
    if (src.startsWith('https://res.cloudinary.com/') && POLA_KIRIM.test(src)) {
      return src.replace(POLA_KIRIM, (_semua, format?: string) => {
        return `/${segmenKirim({ lebar, kualitas, format: Boolean(format) })}/`
      })
    }
    return `${src}${src.includes('?') ? '&' : '?'}w=${lebar}`
  }

  /** URL utama yang disimpan di field `url` dokumen media: gambar utuh atau MP4 cadangan. */
  export function urlDokumen(
    cloudName: string,
    doc: { publicId?: string | null; jenis?: JenisMedia | null },
  ): string {
    if (!doc.publicId) return ''
    return bangunUrl(cloudName, doc.publicId, doc.jenis === 'video' ? 'mp4' : 'asli')
  }

  /** Ukuran hasil preset untuk atribut `width`/`height` supaya tidak ada CLS. */
  export function dimensiPreset(
    preset: PresetGambar,
    asli: { width: number; height: number },
    opsi: { lebar?: number } = {},
  ): { width: number; height: number } {
    if (preset === 'og') return { ...UKURAN_OG }
    let { width, height } = asli
    if (preset !== 'asli') {
      const target = RASIO[preset]
      if (width / height > target) width = Math.round(height * target)
      else height = Math.round(width / target)
    }
    if (opsi.lebar && opsi.lebar < width) {
      height = Math.round((height * opsi.lebar) / width)
      width = opsi.lebar
    }
    return { width, height }
  }
  ```

- [ ] **Langkah 4: Jalankan tes, type check, lint**

  Jalankan:

  ```bash
  npm run test:unit
  npm run typecheck
  npm run lint
  ```

  Hasil yang diharapkan: unit `Test Files 11 passed (11)`, `Tests 60 passed (60)`; type check dan lint tanpa error.

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/modules/media/url.ts tests/unit/media-url.test.ts
  git commit -m "feat(media): pembangun URL pengiriman Cloudinary dan preset"
  ```


### Task 2: URL gambar OG dari transformasi teks

**Files:**
- Create: `src/modules/media/og.ts`
- Test: `tests/unit/media-og.test.ts`

**Interfaces:**
- Consumes: `asal`, `UKURAN_OG` dari `src/modules/media/url.ts` (Task 1); `WARNA_PILAR`, `WarnaPilar` dari `src/lib/konstanta.ts` (Rencana 1: `hijau` #1F7A4D teks #FFFFFF, `oranye` #C2410C teks #FFFFFF, `kuning` #F2C230 teks #111111, `koral` #FF8A80 teks #111111).
- Produces:
  - `KANVAS_OG = 'point/sistem/kanvas'` (diunggah di Task 7).
  - `kodekanTeks(teks: string): string`.
  - `type DataOg = { judul: string; warna: WarnaPilar }`; `urlOg(cloudName: string, data: DataOg, opsi?: { kanvas?: string }): string`.

Rencana ini hanya membangun URL dan mengujinya. Halaman belum memakainya; Rencana 3 (`seo.metadata`) memakai `urlOg` bila editor tidak mengunggah gambar OG. Bentuk URL: kanvas 1x1 diregangkan ke 1200x630, diwarnai warna pilar, judul Archivo 900 ukuran 72 dibungkus otomatis di lebar 1040px (`c_fit,w_1040`), logo `point.` Archivo 900 ukuran 44 di kiri bawah. Judul dipotong di batas kata maksimal 80 karakter. Teks layer dikodekan ganda untuk koma, garis miring, titik dua, persen, tanda tanya, dan tanda kurung, sesuai dokumentasi text layer Cloudinary; em dash, en dash, dan emoji dibuang karena tidak bisa dirender dan melanggar aturan copy.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/media-og.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { kodekanTeks, urlOg } from '@/modules/media/og'

  describe('kodekanTeks (teks untuk layer l_text Cloudinary)', () => {
    it('mengodekan ganda karakter khusus sesuai aturan Cloudinary', () => {
      expect(kodekanTeks('Gaji 5,5 juta?')).toBe('Gaji%205%252C5%20juta%253F')
      expect(kodekanTeks('PPh 21/2026: 100%')).toBe('PPh%2021%252F2026%253A%20100%2525')
      expect(kodekanTeks('Gaji (bersih)!')).toBe('Gaji%20%2528bersih%2529%2521')
    })

    it('membuang em dash, en dash, dan emoji yang tidak bisa dirender', () => {
      expect(kodekanTeks('THR \u2014 cara hitung \u2013 cepat 💸')).toBe('THR%20cara%20hitung%20cepat')
    })
  })

  describe('urlOg', () => {
    const awal = 'https://res.cloudinary.com/demo/image/upload'

    it('pilar hijau: latar #1F7A4D, teks putih, judul Archivo 900, logo point.', () => {
      expect(urlOg('demo', { judul: 'Cara hitung gaji bersih', warna: 'hijau' })).toBe(
        `${awal}/w_1200,h_630,c_scale,e_colorize:100,co_rgb:1F7A4D` +
          '/l_text:Archivo@google_72_900:Cara%20hitung%20gaji%20bersih,co_rgb:FFFFFF,c_fit,w_1040' +
          '/fl_layer_apply,g_north_west,x_80,y_96' +
          '/l_text:Archivo@google_44_900:point.,co_rgb:FFFFFF/fl_layer_apply,g_south_west,x_80,y_64' +
          '/f_png/point/sistem/kanvas',
      )
    })

    it('pilar kuning dan koral memakai teks ink', () => {
      const kuning = urlOg('demo', { judul: 'IPK', warna: 'kuning' })
      expect(kuning).toContain('co_rgb:F2C230/')
      expect(kuning).toContain(':IPK,co_rgb:111111,')
      expect(urlOg('demo', { judul: 'BMI', warna: 'koral' })).toContain('co_rgb:FF8A80/')
    })

    it('memotong judul yang terlalu panjang di batas kata', () => {
      const judul = 'Panduan lengkap menghitung PPh 21 untuk karyawan tetap dengan status kawin dan dua tanggungan anak'
      const url = urlOg('demo', { judul, warna: 'oranye' })
      expect(url).toContain(
        ':Panduan%20lengkap%20menghitung%20PPh%2021%20untuk%20karyawan%20tetap%20dengan%20status%20kawin%20dan...,',
      )
      expect(url).toContain('co_rgb:C2410C/')
    })

    it('bisa memakai kanvas lain', () => {
      expect(urlOg('demo', { judul: 'Tes', warna: 'hijau' }, { kanvas: 'lain/kanvas' })).toMatch(/\/f_png\/lain\/kanvas$/)
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/media-og.test.ts` dengan `Cannot find package '@/modules/media/og'`.

- [ ] **Langkah 3: Implementasi**

  `src/modules/media/og.ts`

  ```ts
  import { WARNA_PILAR, type WarnaPilar } from '@/lib/konstanta'

  import { asal, UKURAN_OG } from './url'

  /**
   * Gambar OG otomatis lewat transformasi teks Cloudinary (spesifikasi §9).
   *
   * Basis gambar adalah kanvas PNG 1x1 putih (`point/sistem/kanvas`, diunggah sekali dengan
   * `npm run media:siapkan`) yang diregangkan ke 1200x630 lalu diwarnai warna pilar.
   * Judul memakai Google Font Archivo lewat sintaks `@google` dengan berat numerik 900
   * (https://cloudinary.com/documentation/image_text_layer_fonts). Sumbu lebar (`wdth`) font
   * variable tidak bisa diatur di text overlay, jadi OG memakai Archivo lebar normal.
   */
  export const KANVAS_OG = 'point/sistem/kanvas'

  const FONT = 'Archivo@google'
  const MAKS_JUDUL = 80
  const TEPI_X = 80

  /**
   * Teks layer harus dikodekan UTF-8 dan karakter khusus (koma, garis miring, titik dua, persen,
   * tanda tanya) dikodekan ganda (https://cloudinary.com/documentation/image_text_layers).
   * Spasi cukup `%20`. Emoji tidak bisa dirender, dan copy point. tidak memakai em dash atau en dash.
   */
  export function kodekanTeks(teks: string): string {
    const bersih = teks
      .replace(/[\u2013\u2014]/g, ' ')
      .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
      .replace(/\s+/g, ' ')
      .trim()
    return encodeURIComponent(bersih)
      .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
      .replace(/%(?!20)/g, '%25')
  }

  function potongJudul(judul: string): string {
    const rapi = judul.replace(/\s+/g, ' ').trim()
    if (rapi.length <= MAKS_JUDUL) return rapi
    const potong = rapi.slice(0, MAKS_JUDUL + 1)
    const batas = potong.lastIndexOf(' ')
    return `${(batas > 0 ? potong.slice(0, batas) : rapi.slice(0, MAKS_JUDUL)).replace(/[\s.,:;]+$/, '')}...`
  }

  const hex = (warna: string) => warna.replace('#', '').toUpperCase()

  export type DataOg = { judul: string; warna: WarnaPilar }

  export function urlOg(cloudName: string, data: DataOg, opsi: { kanvas?: string } = {}): string {
    const pilar = WARNA_PILAR[data.warna]
    const latar = hex(pilar.hex)
    const teks = hex(pilar.teks)
    const lebarJudul = UKURAN_OG.width - TEPI_X * 2
    return [
      asal(cloudName, 'gambar'),
      `w_${UKURAN_OG.width},h_${UKURAN_OG.height},c_scale,e_colorize:100,co_rgb:${latar}`,
      `l_text:${FONT}_72_900:${kodekanTeks(potongJudul(data.judul))},co_rgb:${teks},c_fit,w_${lebarJudul}`,
      `fl_layer_apply,g_north_west,x_${TEPI_X},y_96`,
      `l_text:${FONT}_44_900:point.,co_rgb:${teks}`,
      `fl_layer_apply,g_south_west,x_${TEPI_X},y_64`,
      'f_png',
      opsi.kanvas ?? KANVAS_OG,
    ].join('/')
  }
  ```

- [ ] **Langkah 4: Jalankan tes, type check, lint**

  Jalankan:

  ```bash
  npm run test:unit
  npm run typecheck
  npm run lint
  ```

  Hasil yang diharapkan: unit `Test Files 12 passed (12)`, `Tests 66 passed (66)`; type check dan lint tanpa error.

- [ ] **Langkah 5: Commit**

  ```bash
  git add src/modules/media/og.ts tests/unit/media-og.test.ts
  git commit -m "feat(media): URL gambar OG dari transformasi teks Cloudinary"
  ```


### Task 3: Seam klien Cloudinary, klien palsu, dan opsi unggah

**Files:**
- Create: `src/modules/media/klien.ts`, `src/modules/media/palsu.ts`, `src/modules/media/unggah.ts`
- Test: `tests/unit/media-unggah.test.ts`

**Interfaces:**
- Consumes: `EAGER_VIDEO`, `JenisMedia` (Task 1); `slugify` dari `src/lib/slug.ts` (Rencana 1).
- Produces:
  - `src/modules/media/klien.ts`: `type ResourceType = 'image' | 'video'`; `type OpsiUnggahan = { public_id; resource_type; overwrite: false; transformation; allowed_formats; eager?; eager_async?: true }`; `type BerkasUnggahan = { buffer: Buffer; mimeType: string; tempFilePath?: string; width?: number | null; height?: number | null }`; `type AsetCloudinary = { publicId; resourceType; version; format; bytes; width?; height?; duration? }`; `interface KlienCloudinary { cloudName; apiKey; unggah(berkas, opsi): Promise<AsetCloudinary>; ambil(publicId, resourceType): Promise<AsetCloudinary | null>; hapus(publicId, resourceType): Promise<void>; unduh(aset): Promise<Response>; tandaTangan(parameter: Record<string, string>): string }`.
  - `src/modules/media/palsu.ts`: `klienPalsu(cloudName = 'palsu'): KlienPalsu` dengan tambahan `aset: Map<string, AsetPalsu>` (`lewat: 'server' | 'browser'`, `opsi`, `isi`, `mimeType`), `unggahDariBrowser(field, berkas)`, `gagalSekali(pesan)`. API key palsu `kunci-palsu`.
  - `src/modules/media/unggah.ts`: `FOLDER`, `TRANSFORMASI_MASUK`, `JENIS_FILE`, `FORMAT_DIIZINKAN`, `mimeDiizinkan(mimeType: unknown)`, `PESAN_JENIS_DITOLAK`, `jenisDariMime(mimeType)`, `resourceType(jenis)`, `jenisDariPublicId(publicId)`, `publicIdBaru(namaFile, mimeType, akhiran?)`, `opsiUnggahan(publicId, jenis): OpsiUnggahan`, `parameterTandaTangan(publicId, jenis, timestamp): Record<string, string>`, `type PersiapanUnggahan`, `siapkanUnggahan(klien, { namaFile, mimeType, waktu, akhiran? }): PersiapanUnggahan`, `type MetaMedia = { jenis; width; height; bytes; durasi; format }`, `metaDariAset(aset): MetaMedia`, dan `unggah(klien, berkas & { namaFile; publicId? }): Promise<{ publicId: string; meta: MetaMedia }>`. Ini `unggah(file) -> { publicId, meta }` dari spesifikasi §5.

Seam ini satu-satunya jalan ke Cloudinary, jadi adapter (Task 4) dan endpoint tanda tangan (Task 5) bisa diuji dengan klien palsu tanpa jaringan. Klien palsu meniru batas ukuran incoming transformation dan pemeriksaan tanda tangan signed upload; ukuran video yang tidak diketahui dianggap 1080x1920, 30 detik.

`parameterTandaTangan` berisi semua parameter yang dikirim browser kecuali `file`, `cloud_name`, `resource_type`, dan `api_key`, sesuai aturan tanda tangan Cloudinary. `overwrite: 'false'` ikut ditandatangani supaya tanda tangan tidak bisa dipakai menimpa aset lain, dan `allowed_formats` membuat Cloudinary sendiri menolak format di luar daftar. `publicId` selalu dibuat server: `point/<jenis>/<slug-nama-file>-<8 hex acak>`.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/media-unggah.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { klienPalsu } from '@/modules/media/palsu'
  import {
    FOLDER,
    jenisDariPublicId,
    mimeDiizinkan,
    opsiUnggahan,
    parameterTandaTangan,
    publicIdBaru,
    siapkanUnggahan,
    TRANSFORMASI_MASUK,
    unggah,
  } from '@/modules/media/unggah'
  import { EAGER_VIDEO } from '@/modules/media/url'

  describe('publicIdBaru', () => {
    it('memakai folder per jenis, nama file yang di-slug, dan akhiran acak', () => {
      expect(publicIdBaru('Slip Gaji Mei.PNG', 'image/png', () => 'a1b2c3d4')).toBe(
        'point/gambar/slip-gaji-mei-a1b2c3d4',
      )
      expect(publicIdBaru('THR 2026.mp4', 'video/mp4', () => 'e5f6a7b8')).toBe('point/video/thr-2026-e5f6a7b8')
      expect(publicIdBaru('😀.jpg', 'image/jpeg', () => '00000000')).toBe('point/gambar/media-00000000')
      expect(publicIdBaru('a.png', 'image/png')).toMatch(/^point\/gambar\/a-[0-9a-f]{8}$/)
    })

    it('folder sesuai keputusan: point/gambar dan point/video', () => {
      expect(FOLDER).toEqual({ gambar: 'point/gambar', video: 'point/video' })
      expect(jenisDariPublicId('point/video/thr-2026-e5f6a7b8')).toBe('video')
      expect(jenisDariPublicId('point/gambar/slip-gaji-mei-a1b2c3d4')).toBe('gambar')
    })
  })

  describe('mimeDiizinkan', () => {
    it('menerima gambar raster umum serta video MP4 dan WebM', () => {
      expect(mimeDiizinkan('image/png')).toBe(true)
      expect(mimeDiizinkan('image/avif')).toBe(true)
      expect(mimeDiizinkan('video/mp4')).toBe(true)
      expect(mimeDiizinkan('video/webm')).toBe(true)
      expect(mimeDiizinkan('image/svg+xml')).toBe(false)
      expect(mimeDiizinkan('image/heic')).toBe(false)
      expect(mimeDiizinkan('video/quicktime')).toBe(false)
      expect(mimeDiizinkan('application/pdf')).toBe(false)
      expect(mimeDiizinkan(undefined)).toBe(false)
    })
  })

  describe('opsiUnggahan', () => {
    it('gambar dibatasi lebar 2560px dengan q_auto sebelum disimpan', () => {
      expect(TRANSFORMASI_MASUK.gambar).toBe('c_limit,w_2560,q_auto')
      expect(opsiUnggahan('point/gambar/a-1', 'gambar')).toEqual({
        public_id: 'point/gambar/a-1',
        resource_type: 'image',
        overwrite: false,
        transformation: 'c_limit,w_2560,q_auto',
        allowed_formats: 'jpg,png,webp,avif,gif',
      })
    })

    it('video dibatasi 1920px sisi terpanjang dan 6 Mbps, lalu turunan dibuat eager async', () => {
      expect(TRANSFORMASI_MASUK.video).toBe('c_limit,w_1920,h_1920,br_6m,q_auto')
      expect(opsiUnggahan('point/video/b-2', 'video')).toEqual({
        public_id: 'point/video/b-2',
        resource_type: 'video',
        overwrite: false,
        transformation: 'c_limit,w_1920,h_1920,br_6m,q_auto',
        allowed_formats: 'mp4,webm',
        eager: EAGER_VIDEO,
        eager_async: true,
      })
    })
  })

  describe('parameterTandaTangan', () => {
    it('berisi persis parameter yang dikirim browser, tanpa file, api_key, dan resource_type', () => {
      expect(parameterTandaTangan('point/video/b-2', 'video', 1793744000)).toEqual({
        allowed_formats: 'mp4,webm',
        eager: 'sp_auto/m3u8|so_auto/q_auto/jpg|q_auto/mp4',
        eager_async: 'true',
        overwrite: 'false',
        public_id: 'point/video/b-2',
        timestamp: '1793744000',
        transformation: 'c_limit,w_1920,h_1920,br_6m,q_auto',
      })
      expect(parameterTandaTangan('point/gambar/a-1', 'gambar', 1793744000)).toEqual({
        allowed_formats: 'jpg,png,webp,avif,gif',
        overwrite: 'false',
        public_id: 'point/gambar/a-1',
        timestamp: '1793744000',
        transformation: 'c_limit,w_2560,q_auto',
      })
    })
  })

  describe('siapkanUnggahan', () => {
    it('mengarahkan browser ke endpoint unggah sesuai jenis dengan field bertanda tangan', () => {
      const klien = klienPalsu('demo')
      const hasil = siapkanUnggahan(klien, {
        namaFile: 'Infografis PPh.png',
        mimeType: 'image/png',
        waktu: 1793744000,
        akhiran: () => 'abcd1234',
      })
      const parameter = parameterTandaTangan('point/gambar/infografis-pph-abcd1234', 'gambar', 1793744000)
      expect(hasil).toEqual({
        publicId: 'point/gambar/infografis-pph-abcd1234',
        jenis: 'gambar',
        urlUnggah: 'https://api.cloudinary.com/v1_1/demo/image/upload',
        field: { ...parameter, api_key: 'kunci-palsu', signature: klien.tandaTangan(parameter) },
      })
      expect(siapkanUnggahan(klien, { namaFile: 'a.mp4', mimeType: 'video/mp4', waktu: 1 }).urlUnggah).toBe(
        'https://api.cloudinary.com/v1_1/demo/video/upload',
      )
    })
  })

  describe('unggah', () => {
    it('mengunggah lewat klien dan mengembalikan publicId serta metadata hasil Cloudinary', async () => {
      const klien = klienPalsu()
      const hasil = await unggah(klien, {
        namaFile: 'Grafik Inflasi.png',
        mimeType: 'image/png',
        buffer: Buffer.from('png'),
        width: 3000,
        height: 1500,
      })
      expect(hasil.publicId).toMatch(/^point\/gambar\/grafik-inflasi-[0-9a-f]{8}$/)
      expect(hasil.meta).toEqual({ jenis: 'gambar', width: 2560, height: 1280, bytes: 3, durasi: null, format: 'png' })
      expect(klien.aset.get(hasil.publicId)?.opsi).toEqual(opsiUnggahan(hasil.publicId, 'gambar'))
    })

    it('memakai publicId yang sudah ditentukan dan mengisi durasi video', async () => {
      const klien = klienPalsu()
      const hasil = await unggah(klien, {
        namaFile: 'thr.mp4',
        mimeType: 'video/mp4',
        buffer: Buffer.alloc(4),
        publicId: 'point/video/thr-12345678',
      })
      expect(hasil).toEqual({
        publicId: 'point/video/thr-12345678',
        meta: { jenis: 'video', width: 1080, height: 1920, bytes: 4, durasi: 30, format: 'mp4' },
      })
    })

    it('meneruskan galat Cloudinary', async () => {
      const klien = klienPalsu()
      klien.gagalSekali('File terlalu besar')
      await expect(
        unggah(klien, { namaFile: 'a.png', mimeType: 'image/png', buffer: Buffer.alloc(1) }),
      ).rejects.toThrow('File terlalu besar')
      expect(klien.aset.size).toBe(0)
    })
  })

  describe('klienPalsu', () => {
    it('menyimpan aset di memori, menerapkan batas lebar, dan bisa menghapus', async () => {
      const klien = klienPalsu()
      const hasil = await klien.unggah(
        { buffer: Buffer.from('isi'), mimeType: 'image/png', width: 4000, height: 2000 },
        opsiUnggahan('point/gambar/a-1', 'gambar'),
      )
      expect(hasil).toMatchObject({ publicId: 'point/gambar/a-1', resourceType: 'image', width: 2560, height: 1280, bytes: 3 })
      const potret = await klien.unggah(
        { buffer: Buffer.from('p'), mimeType: 'image/jpeg', width: 1500, height: 4000 },
        opsiUnggahan('point/gambar/p-1', 'gambar'),
      )
      expect(potret).toMatchObject({ width: 1500, height: 4000 })
      await klien.hapus('point/gambar/p-1', 'image')
      expect(klien.aset.get('point/gambar/a-1')).toMatchObject({ lewat: 'server' })
      await expect(klien.ambil('point/gambar/a-1', 'image')).resolves.toEqual(hasil)

      const unduhan = await klien.unduh(hasil)
      expect(unduhan.headers.get('content-type')).toBe('image/png')
      expect(await unduhan.text()).toBe('isi')

      await klien.hapus('point/gambar/a-1', 'image')
      expect(klien.aset.size).toBe(0)
      await expect(klien.ambil('point/gambar/a-1', 'image')).resolves.toBeNull()
      expect((await klien.unduh(hasil)).status).toBe(404)
    })

    it('meniru signed upload dari browser: tanda tangan diperiksa, transformasi diterapkan', async () => {
      const klien = klienPalsu()
      const { field } = siapkanUnggahan(klien, { namaFile: 'thr.mp4', mimeType: 'video/mp4', waktu: 1793744000 })
      const hasil = await klien.unggahDariBrowser(field, { buffer: Buffer.alloc(8), mimeType: 'video/mp4' })
      expect(hasil).toMatchObject({ resourceType: 'video', width: 1080, height: 1920, duration: 30, bytes: 8 })
      expect(klien.aset.get(field.public_id)).toMatchObject({
        lewat: 'browser',
        opsi: opsiUnggahan(field.public_id, 'video'),
      })

      const palsu = { ...field, public_id: 'point/video/lain-00000000' }
      await expect(
        klien.unggahDariBrowser(palsu, { buffer: Buffer.alloc(8), mimeType: 'video/mp4' }),
      ).rejects.toThrow('Invalid Signature')
    })

    it('tanda tangan palsu deterministik dan tidak bergantung urutan', () => {
      const klien = klienPalsu()
      expect(klien.tandaTangan({ b: '2', a: '1' })).toBe(klien.tandaTangan({ a: '1', b: '2' }))
      expect(klien.cloudName).toBe('palsu')
      expect(klien.apiKey).toBe('kunci-palsu')
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/media-unggah.test.ts` dengan `Cannot find package '@/modules/media/palsu'`.

- [ ] **Langkah 3: Tulis seam klien**

  `src/modules/media/klien.ts`

  ```ts
  /**
   * Seam modul media: semua akses ke Cloudinary lewat antarmuka kecil ini supaya adapter
   * penyimpanan bisa diuji dengan klien palsu tanpa jaringan.
   */

  export type ResourceType = 'image' | 'video'

  /** Opsi Upload API Cloudinary yang dipakai point. (nama parameter sama dengan API). */
  export type OpsiUnggahan = {
    public_id: string
    resource_type: ResourceType
    overwrite: false
    /** Incoming transformation: diterapkan ke file asli sebelum disimpan. */
    transformation: string
    /** Cloudinary menolak file di luar format ini, termasuk unggahan langsung dari browser. */
    allowed_formats: string
    eager?: string
    eager_async?: true
  }

  export type BerkasUnggahan = {
    buffer: Buffer
    mimeType: string
    /** Bila diisi, file dibaca dari disk dan `buffer` diabaikan. */
    tempFilePath?: string
    /** Ukuran asli yang sudah dibaca Payload; klien palsu memakainya untuk meniru incoming transformation. */
    width?: number | null
    height?: number | null
  }

  export type AsetCloudinary = {
    publicId: string
    resourceType: ResourceType
    version: number
    format: string
    bytes: number
    width?: number
    height?: number
    /** Detik, hanya untuk video. */
    duration?: number
  }

  export interface KlienCloudinary {
    readonly cloudName: string
    readonly apiKey: string
    /** Upload API dari server. */
    unggah(berkas: BerkasUnggahan, opsi: OpsiUnggahan): Promise<AsetCloudinary>
    /** Admin API: metadata aset, `null` bila tidak ada. */
    ambil(publicId: string, resourceType: ResourceType): Promise<AsetCloudinary | null>
    hapus(publicId: string, resourceType: ResourceType): Promise<void>
    /** Mengambil file asli yang tersimpan. Payload memakainya untuk memeriksa isi unggahan langsung dari browser. */
    unduh(aset: AsetCloudinary): Promise<Response>
    /** Tanda tangan Upload API: SHA-1 atas parameter terurut ditambah API secret. */
    tandaTangan(parameter: Record<string, string>): string
  }
  ```

- [ ] **Langkah 4: Tulis klien palsu**

  `src/modules/media/palsu.ts`

  ```ts
  import { createHash } from 'crypto'
  import { readFile } from 'fs/promises'

  import type { AsetCloudinary, BerkasUnggahan, KlienCloudinary, OpsiUnggahan } from './klien'

  export type AsetPalsu = AsetCloudinary & {
    /** `server`: lewat Upload API dari server. `browser`: signed upload langsung dari browser. */
    lewat: 'server' | 'browser'
    opsi: OpsiUnggahan
    isi: Buffer
    mimeType: string
  }

  export type KlienPalsu = KlienCloudinary & {
    /** Aset yang "tersimpan", dikunci publicId. Tes memeriksa isi ini. */
    readonly aset: Map<string, AsetPalsu>
    /**
     * Meniru Cloudinary menerima signed upload dari browser: API key dan tanda tangan diperiksa,
     * lalu aset disimpan dengan incoming transformation dari field yang ditandatangani.
     */
    unggahDariBrowser(field: Record<string, string>, berkas: BerkasUnggahan): Promise<AsetCloudinary>
    /** Unggahan berikutnya gagal dengan pesan ini (meniru Cloudinary menolak file). */
    gagalSekali(pesan: string): void
  }

  /** Ukuran video contoh bila tidak diketahui: vertikal 9:16, 30 detik. */
  const VIDEO_CONTOH = { width: 1080, height: 1920, duration: 30 }

  const RAHASIA = 'rahasia-palsu'

  /** Skala dari `c_limit,w_<n>[,h_<n>]` di incoming transformation (tidak pernah memperbesar). */
  function skalaBatas(transformasi: string, width: number, height: number): number {
    const w = /c_limit,w_(\d+)/.exec(transformasi)
    const h = /c_limit,w_\d+,h_(\d+)/.exec(transformasi)
    return Math.min(1, w ? Number(w[1]) / width : 1, h ? Number(h[1]) / height : 1)
  }

  /**
   * Klien Cloudinary dalam memori untuk tes dan pengembangan tanpa kredensial. Tidak memanggil
   * jaringan. Meniru batas ukuran incoming transformation supaya tes bisa memeriksa ukuran tersimpan.
   */
  export function klienPalsu(cloudName = 'palsu'): KlienPalsu {
    const aset = new Map<string, AsetPalsu>()
    let versi = 1_700_000_000
    let galat: string | undefined

    const tanpaInternal = ({ lewat: _l, opsi: _o, isi: _i, mimeType: _m, ...data }: AsetPalsu): AsetCloudinary =>
      data

    function tandaTangan(parameter: Record<string, string>) {
      const teks = Object.keys(parameter)
        .sort()
        .map((k) => `${k}=${parameter[k]}`)
        .join('&')
      return createHash('sha1').update(`${teks}${RAHASIA}`).digest('hex')
    }

    async function simpan(berkas: BerkasUnggahan, opsi: OpsiUnggahan, lewat: AsetPalsu['lewat']) {
      if (galat) {
        const pesan = galat
        galat = undefined
        throw new Error(pesan)
      }
      const isi = berkas.tempFilePath ? await readFile(berkas.tempFilePath) : berkas.buffer
      const video = opsi.resource_type === 'video'
      let width = berkas.width ?? (video ? VIDEO_CONTOH.width : undefined)
      let height = berkas.height ?? (video ? VIDEO_CONTOH.height : undefined)
      if (width && height) {
        const skala = skalaBatas(opsi.transformation, width, height)
        width = Math.round(width * skala)
        height = Math.round(height * skala)
      }
      const data: AsetPalsu = {
        publicId: opsi.public_id,
        resourceType: opsi.resource_type,
        version: ++versi,
        format: berkas.mimeType.split('/')[1] ?? 'bin',
        bytes: isi.length,
        width,
        height,
        ...(video ? { duration: VIDEO_CONTOH.duration } : {}),
        lewat,
        opsi,
        isi,
        mimeType: berkas.mimeType,
      }
      aset.set(opsi.public_id, data)
      return tanpaInternal(data)
    }

    return {
      cloudName,
      apiKey: 'kunci-palsu',
      aset,
      tandaTangan,

      unggah: (berkas, opsi) => simpan(berkas, opsi, 'server'),

      async unggahDariBrowser(field, berkas) {
        const { api_key: kunci, signature, ...parameter } = field
        if (kunci !== 'kunci-palsu' || signature !== tandaTangan(parameter)) {
          throw new Error('Invalid Signature')
        }
        const opsi: OpsiUnggahan = {
          public_id: parameter.public_id,
          resource_type: berkas.mimeType.startsWith('video/') ? 'video' : 'image',
          overwrite: false,
          transformation: parameter.transformation,
          allowed_formats: parameter.allowed_formats,
          ...(parameter.eager ? { eager: parameter.eager, eager_async: true as const } : {}),
        }
        return simpan(berkas, opsi, 'browser')
      },

      async ambil(publicId, resourceType) {
        const ada = aset.get(publicId)
        return ada && ada.resourceType === resourceType ? tanpaInternal(ada) : null
      },

      async hapus(publicId) {
        aset.delete(publicId)
      },

      async unduh(data) {
        const ada = aset.get(data.publicId)
        if (!ada) return new Response(null, { status: 404 })
        return new Response(new Uint8Array(ada.isi), { headers: { 'Content-Type': ada.mimeType } })
      },

      gagalSekali(pesan) {
        galat = pesan
      },
    }
  }
  ```

- [ ] **Langkah 5: Tulis opsi unggah dan `unggah()`**

  `src/modules/media/unggah.ts`

  ```ts
  import { randomBytes } from 'crypto'

  import { slugify } from '@/lib/slug'

  import type { AsetCloudinary, BerkasUnggahan, KlienCloudinary, OpsiUnggahan, ResourceType } from './klien'
  import { EAGER_VIDEO, type JenisMedia } from './url'

  /**
   * Folder Cloudinary per jenis. Penyederhanaan dari daftar folder di spesifikasi §9
   * (`point/artikel`, `point/video`, `point/penulis`, `point/og`): koleksi `media` dipakai bersama
   * oleh artikel, penulis, dan SEO, jadi saat unggah belum diketahui dipakai di mana. OG dibuat
   * sebagai URL transformasi, tidak diunggah.
   */
  export const FOLDER: Record<JenisMedia, string> = {
    gambar: 'point/gambar',
    video: 'point/video',
  }

  /**
   * Incoming transformation (https://cloudinary.com/documentation/eager_and_incoming_transformations).
   * Gambar: lebar maks 2560px, q_auto (tinggi bebas supaya gambar potret tidak jatuh di bawah syarat
   * lebar 1200px). Video: sisi terpanjang maks 1920px (9:16 menjadi 1080x1920, sama dengan batas
   * default sp_auto 1080p) dan bitrate maks 6 Mbps (sedikit di atas 5,5 Mbps representasi 1080p di
   * tabel adaptive streaming Cloudinary). c_limit tidak pernah memperbesar.
   */
  export const TRANSFORMASI_MASUK: Record<JenisMedia, string> = {
    gambar: 'c_limit,w_2560,q_auto',
    video: 'c_limit,w_1920,h_1920,br_6m,q_auto',
  }

  /**
   * Jenis file koleksi media. Daftar eksplisit (bukan `image/*`) supaya SVG, HEIC, dan format lain
   * yang tidak bisa diproses tidak lolos lewat unggahan langsung.
   */
  export const JENIS_FILE = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'video/mp4',
    'video/webm',
  ] as const

  /** Format yang sama dalam penamaan Cloudinary, ditandatangani sebagai `allowed_formats`. */
  export const FORMAT_DIIZINKAN: Record<JenisMedia, string> = {
    gambar: 'jpg,png,webp,avif,gif',
    video: 'mp4,webm',
  }

  export function mimeDiizinkan(mimeType: unknown): mimeType is (typeof JENIS_FILE)[number] {
    return typeof mimeType === 'string' && (JENIS_FILE as readonly string[]).includes(mimeType)
  }

  export const PESAN_JENIS_DITOLAK =
    'Jenis file tidak didukung. Unggah gambar JPG, PNG, WebP, AVIF, atau GIF, atau video MP4 atau WebM.'

  export function jenisDariMime(mimeType: string): JenisMedia {
    return mimeType.startsWith('video/') ? 'video' : 'gambar'
  }

  export function resourceType(jenis: JenisMedia): ResourceType {
    return jenis === 'video' ? 'video' : 'image'
  }

  /** Jenis dibaca dari folder publicId (`point/video/...` atau `point/gambar/...`). */
  export function jenisDariPublicId(publicId: string): JenisMedia {
    return publicId.startsWith(`${FOLDER.video}/`) ? 'video' : 'gambar'
  }

  const acak = () => randomBytes(4).toString('hex')

  /** `point/<jenis>/<slug-nama-file>-<8 hex>`. Akhiran acak mencegah tabrakan antarunggahan. */
  export function publicIdBaru(namaFile: string, mimeType: string, akhiran: () => string = acak): string {
    const dasar = slugify(namaFile.replace(/\.[^.]+$/, '')).slice(0, 60).replace(/-+$/, '') || 'media'
    return `${FOLDER[jenisDariMime(mimeType)]}/${dasar}-${akhiran()}`
  }

  /** Opsi unggah dari server. Video juga meminta turunan HLS, poster, dan MP4 secara eager async. */
  export function opsiUnggahan(publicId: string, jenis: JenisMedia): OpsiUnggahan {
    const dasar: OpsiUnggahan = {
      public_id: publicId,
      resource_type: resourceType(jenis),
      overwrite: false,
      transformation: TRANSFORMASI_MASUK[jenis],
      allowed_formats: FORMAT_DIIZINKAN[jenis],
    }
    return jenis === 'video' ? { ...dasar, eager: EAGER_VIDEO, eager_async: true } : dasar
  }

  /**
   * Parameter yang ditandatangani server dan dikirim apa adanya oleh browser. Sesuai
   * https://cloudinary.com/documentation/authentication_signatures: semua parameter kecuali
   * `file`, `cloud_name`, `resource_type`, dan `api_key` ikut ditandatangani.
   */
  export function parameterTandaTangan(
    publicId: string,
    jenis: JenisMedia,
    timestamp: number,
  ): Record<string, string> {
    const opsi = opsiUnggahan(publicId, jenis)
    const parameter: Record<string, string> = {
      allowed_formats: opsi.allowed_formats,
      overwrite: 'false',
      public_id: opsi.public_id,
      timestamp: String(timestamp),
      transformation: opsi.transformation,
    }
    if (opsi.eager) {
      parameter.eager = opsi.eager
      parameter.eager_async = 'true'
    }
    return parameter
  }

  export type PersiapanUnggahan = {
    publicId: string
    jenis: JenisMedia
    /** `https://api.cloudinary.com/v1_1/<cloud>/<image|video>/upload` */
    urlUnggah: string
    /** Field form yang dikirim browser bersama file. */
    field: Record<string, string>
  }

  /** Semua yang dibutuhkan browser untuk signed upload langsung ke Cloudinary. */
  export function siapkanUnggahan(
    klien: Pick<KlienCloudinary, 'cloudName' | 'apiKey' | 'tandaTangan'>,
    masukan: { namaFile: string; mimeType: string; waktu: number; akhiran?: () => string },
  ): PersiapanUnggahan {
    const jenis = jenisDariMime(masukan.mimeType)
    const publicId = publicIdBaru(masukan.namaFile, masukan.mimeType, masukan.akhiran)
    const parameter = parameterTandaTangan(publicId, jenis, masukan.waktu)
    return {
      publicId,
      jenis,
      urlUnggah: `https://api.cloudinary.com/v1_1/${klien.cloudName}/${resourceType(jenis)}/upload`,
      field: { ...parameter, api_key: klien.apiKey, signature: klien.tandaTangan(parameter) },
    }
  }

  /** Metadata yang disimpan di dokumen media, diambil dari hasil Cloudinary (sesudah incoming transformation). */
  export type MetaMedia = {
    jenis: JenisMedia
    width: number | null
    height: number | null
    bytes: number
    /** Detik, dibulatkan ke 0,1. Hanya video. */
    durasi: number | null
    format: string
  }

  export function metaDariAset(aset: AsetCloudinary): MetaMedia {
    return {
      jenis: aset.resourceType === 'video' ? 'video' : 'gambar',
      width: aset.width ?? null,
      height: aset.height ?? null,
      bytes: aset.bytes,
      durasi: typeof aset.duration === 'number' ? Math.round(aset.duration * 10) / 10 : null,
      format: aset.format,
    }
  }

  /**
   * `unggah(file) → { publicId, meta }` dari spesifikasi §5, untuk unggahan lewat server
   * (Local API, seed, file kecil dari admin). `publicId` boleh sudah ditentukan pemanggil.
   */
  export async function unggah(
    klien: KlienCloudinary,
    berkas: BerkasUnggahan & { namaFile: string; publicId?: string },
  ): Promise<{ publicId: string; meta: MetaMedia }> {
    const jenis = jenisDariMime(berkas.mimeType)
    const publicId = berkas.publicId ?? publicIdBaru(berkas.namaFile, berkas.mimeType)
    const aset = await klien.unggah(berkas, opsiUnggahan(publicId, jenis))
    return { publicId: aset.publicId, meta: metaDariAset(aset) }
  }
  ```

- [ ] **Langkah 6: Jalankan tes, type check, lint**

  Jalankan:

  ```bash
  npm run test:unit
  npm run typecheck
  npm run lint
  ```

  Hasil yang diharapkan: unit `Test Files 13 passed (13)`, `Tests 79 passed (79)`; type check dan lint tanpa error.

- [ ] **Langkah 7: Commit**

  ```bash
  git add src/modules/media/klien.ts src/modules/media/palsu.ts src/modules/media/unggah.ts tests/unit/media-unggah.test.ts
  git commit -m "feat(media): seam klien Cloudinary, klien palsu, dan opsi unggah"
  ```


### Task 4: Adapter Cloudinary di atas plugin cloud storage (unggah lewat server)

**Files:**
- Create: `src/modules/media/cloudinary.ts`, `src/modules/media/index.ts`, `src/modules/media/adapter.ts`, `src/modules/media/plugin.ts`
- Modify: `package.json`, `package-lock.json` (lewat `npm install`), `src/collections/Media.ts`, `src/payload.config.ts`, `src/payload-types.ts` (generate), `tests/int/setup.ts`, `tests/int/fixtures.ts`, `tests/int/media.int.spec.ts` (ganti seluruh isi)
- Test: `tests/unit/media-adapter.test.ts`, `tests/int/media.int.spec.ts`

**Interfaces:**
- Consumes: semua ekspor Task 1 dan Task 3; `anyone`, `isLoggedIn` dari `src/access` dan `validasiAlt` dari `src/lib/media.ts` (Rencana 1); fixture `gambarPng(lebar, tinggi)` dan helper `getTestPayload()`, `pesanGalat()` (Rencana 1).
- Produces:
  - `src/modules/media/cloudinary.ts`: `type KredensialCloudinary`; `klienCloudinary(kredensial): KlienCloudinary` (SDK `cloudinary` v2).
  - `src/modules/media/index.ts`: `klienDariEnv(env?): KlienCloudinary`, `klienMedia(): KlienCloudinary` (klien bersama satu proses), `pakaiKlien(baru)`, plus ekspor ulang `bangunUrl`, `dimensiPreset`, `lebarkan`, `UKURAN_OG`, `urlOg` dan tipe preset.
  - `src/modules/media/adapter.ts`: `NAMA_ADAPTER = 'cloudinary'`, `PESAN_UNGGAH_GAGAL`, `adapterCloudinary({ klien: () => KlienCloudinary }): Adapter`.
  - `src/modules/media/plugin.ts`: `mediaCloudinary({ klien }): Plugin`.
  - Koleksi `media`: field baru `publicId` (text, index), `jenis` (`gambar` | `video`), `durasi` (number), ketiganya hanya diisi sistem; field lama tetap. Plugin menambah `_objectKey`.
  - Fixture `videoMp4()` di `tests/int/fixtures.ts`.

Klien dipilih dari env: ketiga `CLOUDINARY_*` ada berarti SDK sungguhan, selain itu klien palsu. Di produksi tanpa kredensial aplikasi menolak jalan (kecuali saat `next build`, ditandai `NEXT_PHASE=phase-production-build`), supaya tidak diam-diam memakai penyimpanan sementara. `klienDariEnv` membaca env saat dipanggil pertama, jadi `tests/int/setup.ts` cukup menghapus `CLOUDINARY_*` sebelum Payload dimuat.

`handleUpload` dipakai untuk unggahan lewat server (Local API, seed, REST multipart). Plugin mengirim `data` yang sudah berisi `width`/`height` hasil baca Payload; klien palsu memakainya untuk meniru incoming transformation, sedangkan Cloudinary sungguhan mengembalikan ukuran setelah transformasi. Metadata yang dikembalikan `handleUpload` disimpan plugin lewat `payload.update` internal. `disablePayloadAccessControl: true` membuat field `url` berisi URL CDN Cloudinary (lewat `generateURL`), bukan `/api/media/file/...`. `staticHandler` mengarahkan `/api/media/file/<nama>` ke CDN (302).

Field `publicId`, `jenis`, `durasi` memakai field access `create`/`update` yang selalu `false`: Payload membuang nilai kiriman pengguna di `beforeValidate`, sedangkan hook dan update internal plugin (`overrideAccess`) tetap bisa mengisinya. `crop: false` karena potongan dibuat Cloudinary (`g_auto`). `focalPoint` dibiarkan aktif supaya kolom `focal_x`/`focal_y` Rencana 1 tidak hilang (skema aditif). `mimeTypes` diganti daftar eksplisit dari `JENIS_FILE` (tidak lagi `image/*`) supaya SVG dan HEIC tidak lolos.

- [ ] **Langkah 1: Pasang dependensi**

  Jalankan:

  ```bash
  npm install @payloadcms/plugin-cloud-storage@3.92.1 cloudinary@2.11.0
  ```

  Hasil yang diharapkan: `+ @payloadcms/plugin-cloud-storage 3.92.1` dan `+ cloudinary 2.11.0`. Diff `package.json` (npm juga mengurutkan ulang `@payloadcms/db-postgres`):

  ```diff
  diff --git a/package.json b/package.json
  index 39566c2..3fbaf1d 100644
  --- a/package.json
  +++ b/package.json
  @@ -20,9 +20,12 @@
       "seed": "cross-env NODE_OPTIONS=--no-deprecation payload run src/seed/run.ts"
     },
     "dependencies": {
  +    "@payloadcms/db-postgres": "3.92.1",
       "@payloadcms/next": "3.92.1",
  +    "@payloadcms/plugin-cloud-storage": "3.92.1",
       "@payloadcms/richtext-lexical": "3.92.1",
       "@payloadcms/ui": "3.92.1",
  +    "cloudinary": "2.11.0",
       "cross-env": "^7.0.3",
       "dotenv": "16.4.7",
       "graphql": "^16.8.1",
  @@ -30,8 +33,7 @@
       "payload": "3.92.1",
       "react": "19.2.6",
       "react-dom": "19.2.6",
  -    "sharp": "0.35.4",
  -    "@payloadcms/db-postgres": "3.92.1"
  +    "sharp": "0.35.4"
     },
     "devDependencies": {
       "@playwright/test": "1.63.0",
  ```

- [ ] **Langkah 2: Tulis tes unit adapter yang gagal**

  `tests/unit/media-adapter.test.ts`

  ```ts
  import type { CollectionConfig, PayloadRequest } from 'payload'
  import { describe, expect, it, vi } from 'vitest'

  import { klienDariEnv } from '@/modules/media'
  import { adapterCloudinary, NAMA_ADAPTER, PESAN_UNGGAH_GAGAL } from '@/modules/media/adapter'
  import { klienPalsu } from '@/modules/media/palsu'

  const koleksi = { slug: 'media', fields: [] } as unknown as CollectionConfig

  function reqPalsu() {
    const logger = { error: vi.fn(), warn: vi.fn() }
    return { req: { payload: { logger } } as unknown as PayloadRequest, logger }
  }

  function siapkan() {
    const klien = klienPalsu('demo')
    const adapter = adapterCloudinary({ klien: () => klien })({ collection: koleksi })
    return { klien, adapter }
  }

  const berkas = (mimeType: string, filename: string, isi = 'isi') => ({
    buffer: Buffer.from(isi),
    filename,
    filesize: isi.length,
    mimeType,
  })

  describe('adapterCloudinary', () => {
    it('bernama cloudinary dan tidak menyimpan ke disk lokal', () => {
      const { adapter } = siapkan()
      expect(adapter.name).toBe(NAMA_ADAPTER)
      expect(NAMA_ADAPTER).toBe('cloudinary')
    })

    it('handleUpload mengunggah lewat klien dan mengembalikan metadata Cloudinary', async () => {
      const { klien, adapter } = siapkan()
      const { req } = reqPalsu()
      const hasil = (await adapter.handleUpload({
        clientUploadContext: undefined,
        collection: koleksi,
        data: { filename: 'grafik.png', mimeType: 'image/png', width: 4000, height: 3000 },
        file: berkas('image/png', 'grafik.png'),
        req,
        storageFilePath: 'grafik.png',
      })) as Record<string, unknown>

      expect(hasil.publicId).toMatch(/^point\/gambar\/grafik-[0-9a-f]{8}$/)
      expect(hasil).toMatchObject({ jenis: 'gambar', width: 2560, height: 1920, filesize: 3, durasi: null })
      expect(hasil.url).toBe(`https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/${hasil.publicId}`)
      expect(klien.aset.get(hasil.publicId as string)?.lewat).toBe('server')
    })

    it('handleUpload video mengisi durasi dan URL MP4', async () => {
      const { adapter } = siapkan()
      const { req } = reqPalsu()
      const hasil = (await adapter.handleUpload({
        clientUploadContext: undefined,
        collection: koleksi,
        data: { filename: 'thr.mp4', mimeType: 'video/mp4' },
        file: berkas('video/mp4', 'thr.mp4'),
        req,
        storageFilePath: 'thr.mp4',
      })) as Record<string, unknown>
      expect(hasil).toMatchObject({ jenis: 'video', width: 1080, height: 1920, durasi: 30 })
      expect(hasil.url).toBe(`https://res.cloudinary.com/demo/video/upload/q_auto/${hasil.publicId}.mp4`)
    })

    it('handleUpload mengubah galat Cloudinary menjadi pesan berbahasa Indonesia', async () => {
      const { klien, adapter } = siapkan()
      const { req, logger } = reqPalsu()
      klien.gagalSekali('Invalid image file')
      await expect(
        adapter.handleUpload({
          clientUploadContext: undefined,
          collection: koleksi,
          data: { filename: 'rusak.png', mimeType: 'image/png' },
          file: berkas('image/png', 'rusak.png'),
          req,
          storageFilePath: 'rusak.png',
        }),
      ).rejects.toThrow(PESAN_UNGGAH_GAGAL)
      expect(logger.error).toHaveBeenCalledOnce()
      expect(PESAN_UNGGAH_GAGAL).toBe('Unggahan ke Cloudinary gagal. Coba unggah ulang filenya.')
    })

    it('generateURL dan staticHandler memakai publicId dari dokumen', async () => {
      const { adapter } = siapkan()
      const { req } = reqPalsu()
      const data = { publicId: 'point/gambar/a-1', jenis: 'gambar', filename: 'a.png' }
      expect(await adapter.generateURL?.({ collection: koleksi, data, filename: 'a.png' })).toBe(
        'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/point/gambar/a-1',
      )
      const respons = await adapter.staticHandler(req, {
        doc: data as never,
        params: { collection: 'media', filename: 'a.png' },
      })
      expect(respons.status).toBe(302)
      expect(respons.headers.get('location')).toBe(
        'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/point/gambar/a-1',
      )
      const kosong = await adapter.staticHandler(req, { params: { collection: 'media', filename: 'x.png' } })
      expect(kosong.status).toBe(404)
    })

    it('handleDelete menghapus aset, dan galat hapus hanya dicatat', async () => {
      const { klien, adapter } = siapkan()
      const { req, logger } = reqPalsu()
      klien.aset.set('point/video/v-1', {
        publicId: 'point/video/v-1',
        resourceType: 'video',
        version: 1,
        format: 'mp4',
        bytes: 1,
        lewat: 'server',
        opsi: { public_id: 'point/video/v-1', resource_type: 'video', overwrite: false, transformation: '', allowed_formats: '' },
        isi: Buffer.alloc(1),
        mimeType: 'video/mp4',
      })
      await adapter.handleDelete({
        collection: koleksi,
        doc: { id: 1, publicId: 'point/video/v-1', mimeType: 'video/mp4' } as never,
        filename: 'v.mp4',
        req,
        storageFilePath: 'v.mp4',
      })
      expect(klien.aset.has('point/video/v-1')).toBe(false)

      klien.hapus = async () => {
        throw new Error('jaringan putus')
      }
      await adapter.handleDelete({
        collection: koleksi,
        doc: { id: 2, publicId: 'point/gambar/g-2', mimeType: 'image/png' } as never,
        filename: 'g.png',
        req,
        storageFilePath: 'g.png',
      })
      expect(logger.warn).toHaveBeenCalledOnce()
    })
  })

  describe('klienDariEnv', () => {
    it('memakai klien palsu bila kredensial tidak lengkap', () => {
      expect(klienDariEnv({}).cloudName).toBe('palsu')
      expect(klienDariEnv({ CLOUDINARY_CLOUD_NAME: 'x', CLOUDINARY_API_KEY: 'y' }).cloudName).toBe('palsu')
    })

    it('memakai klien Cloudinary sungguhan bila ketiga kredensial ada (tanpa memanggil jaringan)', () => {
      const klien = klienDariEnv({
        CLOUDINARY_CLOUD_NAME: 'awan-tes',
        CLOUDINARY_API_KEY: '123',
        CLOUDINARY_API_SECRET: 'abcd',
      })
      expect(klien.cloudName).toBe('awan-tes')
      expect(klien.apiKey).toBe('123')
      // Contoh resmi https://cloudinary.com/documentation/authentication_signatures
      expect(
        klien.tandaTangan({
          eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop',
          public_id: 'sample_image',
          timestamp: '1315060510',
        }),
      ).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e')
    })

    it('menolak jalan di produksi tanpa kredensial, kecuali saat next build', () => {
      expect(() => klienDariEnv({ NODE_ENV: 'production' })).toThrow(/wajib diisi di produksi/)
      expect(klienDariEnv({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' }).cloudName).toBe('palsu')
    })
  })
  ```

- [ ] **Langkah 3: Tulis tes integrasi yang gagal**

  Tambahkan fixture video ke `tests/int/fixtures.ts`:

  ```diff
  diff --git a/tests/int/fixtures.ts b/tests/int/fixtures.ts
  index b19a6ec..5d70883 100644
  --- a/tests/int/fixtures.ts
  +++ b/tests/int/fixtures.ts
  @@ -14,6 +14,22 @@ export async function gambarPng(lebar: number, tinggi: number) {
     return { data, mimetype: 'image/png', name: `${unik('tes')}.png`, size: data.length }
   }
   
  +/**
  + * MP4 terkecil yang lolos pemeriksaan Payload (kotak `ftyp` lalu `free`). Isinya tidak diputar:
  + * klien palsu tidak mentranskode, cukup jenis file yang benar.
  + */
  +export function videoMp4() {
  +  const data = Buffer.concat([
  +    Buffer.from([0, 0, 0, 24]),
  +    Buffer.from('ftypisom'),
  +    Buffer.from([0, 0, 2, 0]),
  +    Buffer.from('isommp41'),
  +    Buffer.from([0, 0, 0, 8]),
  +    Buffer.from('free'),
  +  ])
  +  return { data, mimetype: 'video/mp4', name: `${unik('video')}.mp4`, size: data.length }
  +}
  +
   export async function buatGambar(payload: Payload, lebar = 1600, tinggi = 900) {
     return payload.create({
       collection: 'media',
  ```

  Ganti `tests/int/setup.ts` supaya kredensial di `.env` pengembang tidak pernah terbaca tes:

  `tests/int/setup.ts`

  ```ts
  import { config } from 'dotenv'

  // Tes integrasi selalu memakai database tes, tidak pernah database dev.
  config({ path: '.env.test', override: true })

  // Tes tidak boleh memanggil Cloudinary: tanpa kredensial, modul media memakai klien palsu.
  for (const kunci of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']) {
    delete process.env[kunci]
  }
  ```

  Ganti seluruh isi `tests/int/media.int.spec.ts`:

  `tests/int/media.int.spec.ts`

  ```ts
  import { existsSync, readdirSync } from 'fs'
  import path from 'path'
  import { beforeAll, describe, expect, it } from 'vitest'

  import { klienMedia } from '@/modules/media'
  import type { KlienPalsu } from '@/modules/media/palsu'

  import { gambarPng, videoMp4 } from './fixtures'
  import { getTestPayload, pesanGalat } from './helpers'

  /** `.env.test` tidak berisi kredensial Cloudinary, jadi Payload memakai klien palsu. */
  const klien = () => klienMedia() as KlienPalsu

  const isiFolderMedia = () => {
    const folder = path.resolve('media')
    return existsSync(folder) ? readdirSync(folder) : []
  }

  describe('koleksi media', () => {
    let sebelum: string[]
    beforeAll(async () => {
      await getTestPayload()
      sebelum = isiFolderMedia()
    })

    it('memakai klien palsu karena env Cloudinary kosong', () => {
      expect(process.env.CLOUDINARY_API_SECRET).toBeUndefined()
      expect(klien().cloudName).toBe('palsu')
      expect(klien().aset).toBeInstanceOf(Map)
    })

    it('menyimpan gambar lewat adapter Cloudinary, bukan disk lokal', async () => {
      const payload = await getTestPayload()
      const media = await payload.create({
        collection: 'media',
        data: { alt: 'Kotak hijau contoh' },
        file: await gambarPng(1300, 800),
      })

      expect(media.publicId).toMatch(/^point\/gambar\/tes-[a-z0-9-]+-[0-9a-f]{8}$/)
      expect(media.jenis).toBe('gambar')
      expect(media.width).toBe(1300)
      expect(media.height).toBe(800)
      expect(media.mimeType).toBe('image/png')
      expect(media.url).toBe(`https://res.cloudinary.com/palsu/image/upload/f_auto,q_auto/${media.publicId}`)

      const tersimpan = klien().aset.get(media.publicId!)
      expect(tersimpan?.lewat).toBe('server')
      expect(tersimpan?.opsi.transformation).toBe('c_limit,w_2560,q_auto')
      expect(isiFolderMedia()).toEqual(sebelum)
    })

    it('gambar di atas 2560px disimpan dengan ukuran hasil incoming transformation', async () => {
      const payload = await getTestPayload()
      const media = await payload.create({
        collection: 'media',
        data: { alt: 'Gambar besar' },
        file: await gambarPng(3200, 1800),
      })
      expect(media.width).toBe(2560)
      expect(media.height).toBe(1440)
    })

    it('menyimpan video dengan jenis, durasi, dan URL MP4', async () => {
      const payload = await getTestPayload()
      const media = await payload.create({ collection: 'media', data: {}, file: videoMp4() })
      expect(media.jenis).toBe('video')
      expect(media.publicId).toMatch(/^point\/video\//)
      expect(media.durasi).toBe(30)
      expect(media.url).toBe(`https://res.cloudinary.com/palsu/video/upload/q_auto/${media.publicId}.mp4`)
      expect(klien().aset.get(media.publicId!)?.opsi.eager).toBe('sp_auto/m3u8|so_auto/q_auto/jpg|q_auto/mp4')
    })

    it('menghapus aset di Cloudinary saat dokumen dihapus', async () => {
      const payload = await getTestPayload()
      const media = await payload.create({
        collection: 'media',
        data: { alt: 'Akan dihapus' },
        file: await gambarPng(400, 300),
      })
      expect(klien().aset.has(media.publicId!)).toBe(true)
      await payload.delete({ collection: 'media', id: media.id })
      expect(klien().aset.has(media.publicId!)).toBe(false)
    })

    it('menolak gambar tanpa alt', async () => {
      const payload = await getTestPayload()
      const pesan = await pesanGalat(
        payload.create({ collection: 'media', data: {}, file: await gambarPng(400, 300) }),
      )
      expect(pesan).toMatch(/Alt wajib/)
    })
  })
  ```

- [ ] **Langkah 4: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/media-adapter.test.ts` dengan `Cannot find package '@/modules/media'`.

- [ ] **Langkah 5: Tulis klien Cloudinary sungguhan**

  `raw_transformation` dipakai karena SDK menganggap `transformation` berupa string sebagai nama transformasi tersimpan (`t_<nama>`). Diperiksa offline: `cloudinary.utils.build_upload_params({ raw_transformation: 'c_limit,w_2560,q_auto' })` menghasilkan `transformation: 'c_limit,w_2560,q_auto'`.

  `src/modules/media/cloudinary.ts`

  ```ts
  import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary'
  import { createReadStream } from 'fs'
  import { Readable } from 'stream'

  import type { AsetCloudinary, BerkasUnggahan, KlienCloudinary, OpsiUnggahan, ResourceType } from './klien'

  export type KredensialCloudinary = { cloudName: string; apiKey: string; apiSecret: string }

  /** Di atas ini dipakai unggah bertahap (Upload API mewajibkan chunk untuk file > 100 MB). */
  const AMBANG_CHUNK = 99 * 1024 * 1024

  function keAset(hasil: UploadApiResponse | Record<string, unknown>): AsetCloudinary {
    const r = hasil as Record<string, unknown>
    return {
      publicId: String(r.public_id),
      resourceType: r.resource_type === 'video' ? 'video' : 'image',
      version: Number(r.version),
      format: String(r.format ?? ''),
      bytes: Number(r.bytes ?? 0),
      width: typeof r.width === 'number' ? r.width : undefined,
      height: typeof r.height === 'number' ? r.height : undefined,
      duration: typeof r.duration === 'number' ? r.duration : undefined,
    }
  }

  /** Klien Cloudinary sungguhan di atas SDK `cloudinary` v2. Hanya dipakai di server. */
  export function klienCloudinary({ cloudName, apiKey, apiSecret }: KredensialCloudinary): KlienCloudinary {
    const auth = { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true }

    return {
      cloudName,
      apiKey,

      unggah(berkas: BerkasUnggahan, opsi: OpsiUnggahan) {
        const besar = berkas.tempFilePath ? true : berkas.buffer.length > AMBANG_CHUNK
        // `raw_transformation` dikirim apa adanya; `transformation` berupa string akan dianggap nama
        // transformasi tersimpan (`t_...`) oleh SDK.
        const { transformation, ...lain } = opsi
        const opsiSdk: Record<string, unknown> = { ...auth, ...lain, raw_transformation: transformation }
        return new Promise<AsetCloudinary>((selesai, gagal) => {
          const tujuan = (besar ? cloudinary.uploader.upload_chunked_stream : cloudinary.uploader.upload_stream)(
            opsiSdk as UploadApiOptions,
            (galat, hasil) => (galat || !hasil ? gagal(galat ?? new Error('Hasil unggah kosong')) : selesai(keAset(hasil))),
          )
          const sumber = berkas.tempFilePath ? createReadStream(berkas.tempFilePath) : Readable.from(berkas.buffer)
          sumber.on('error', gagal).pipe(tujuan)
        })
      },

      async ambil(publicId: string, resourceType: ResourceType) {
        try {
          return keAset(await cloudinary.api.resource(publicId, { ...auth, resource_type: resourceType }))
        } catch (galat) {
          if ((galat as { error?: { http_code?: number } }).error?.http_code === 404) return null
          throw galat
        }
      },

      async hapus(publicId: string, resourceType: ResourceType) {
        await cloudinary.uploader.destroy(publicId, { ...auth, resource_type: resourceType, invalidate: true })
      },

      unduh(aset: AsetCloudinary) {
        const url = cloudinary.url(aset.publicId, {
          ...auth,
          resource_type: aset.resourceType,
          version: aset.version,
          format: aset.format,
        })
        return fetch(url)
      },

      tandaTangan(parameter: Record<string, string>) {
        return cloudinary.utils.api_sign_request(parameter, apiSecret)
      },
    }
  }
  ```

- [ ] **Langkah 6: Tulis pemilih klien**

  `src/modules/media/index.ts`

  ```ts
  import { klienCloudinary } from './cloudinary'
  import type { KlienCloudinary } from './klien'
  import { klienPalsu } from './palsu'

  export type { JenisMedia, Preset, PresetGambar, PresetVideo } from './url'
  export { bangunUrl, dimensiPreset, lebarkan, UKURAN_OG } from './url'
  export { urlOg } from './og'

  /**
   * Memilih klien dari env server. Tanpa ketiga kredensial (mis. `.env.test`, CI, mesin tanpa
   * akses Cloudinary) dipakai klien palsu dalam memori supaya tes dan dev tidak memanggil jaringan.
   * Produksi wajib mengisi kredensial: klien palsu tidak menyimpan file secara permanen.
   */
  export function klienDariEnv(env: Record<string, string | undefined> = process.env): KlienCloudinary {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = env
    if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
      return klienCloudinary({
        cloudName: CLOUDINARY_CLOUD_NAME,
        apiKey: CLOUDINARY_API_KEY,
        apiSecret: CLOUDINARY_API_SECRET,
      })
    }
    if (env.NODE_ENV === 'production' && env.NEXT_PHASE !== 'phase-production-build') {
      throw new Error('CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET wajib diisi di produksi.')
    }
    return klienPalsu()
  }

  let klien: KlienCloudinary | undefined

  /** Klien bersama untuk satu proses. Tes bisa menggantinya lewat `pakaiKlien`. */
  export function klienMedia(): KlienCloudinary {
    klien ??= klienDariEnv()
    return klien
  }

  export function pakaiKlien(baru: KlienCloudinary): void {
    klien = baru
  }
  ```

- [ ] **Langkah 7: Tulis adapter dan plugin**

  `src/modules/media/adapter.ts`

  ```ts
  import type { Adapter, GeneratedAdapter } from '@payloadcms/plugin-cloud-storage/types'
  import { APIError } from 'payload'

  import type { KlienCloudinary } from './klien'
  import { jenisDariMime, jenisDariPublicId, resourceType, unggah } from './unggah'
  import { urlDokumen } from './url'

  export const NAMA_ADAPTER = 'cloudinary'

  export const PESAN_UNGGAH_GAGAL = 'Unggahan ke Cloudinary gagal. Coba unggah ulang filenya.'

  /** Field dokumen media yang dibaca adapter. */
  type DokumenMedia = {
    publicId?: string | null
    jenis?: 'gambar' | 'video' | null
    mimeType?: string | null
    width?: number | null
    height?: number | null
  }

  /**
   * Adapter penyimpanan Cloudinary untuk `@payloadcms/plugin-cloud-storage` (antarmuka
   * `GeneratedAdapter`). Klien disuntikkan lewat fungsi supaya tes memakai klien palsu dan klien
   * sungguhan baru dibuat saat dibutuhkan.
   *
   * Unggahan langsung dari browser tidak lewat `handleUpload`: plugin melewatinya bila file membawa
   * `clientUploadContext`. Metadata unggahan itu diisi hook koleksi (Task 5).
   */
  export function adapterCloudinary({ klien }: { klien: () => KlienCloudinary }): Adapter {
    return (): GeneratedAdapter => ({
      name: NAMA_ADAPTER,

      generateURL: ({ data }) => urlDokumen(klien().cloudName, (data ?? {}) as DokumenMedia),

      handleUpload: async ({ data, file, req }) => {
        const doc = data as DokumenMedia
        try {
          const { publicId, meta } = await unggah(klien(), {
            namaFile: file.filename,
            mimeType: file.mimeType,
            buffer: file.buffer,
            tempFilePath: file.tempFilePath,
            width: doc.width,
            height: doc.height,
          })
          return {
            publicId,
            jenis: meta.jenis,
            durasi: meta.durasi,
            filesize: meta.bytes,
            ...(meta.width && meta.height ? { width: meta.width, height: meta.height } : {}),
            url: urlDokumen(klien().cloudName, { publicId, jenis: meta.jenis }),
          }
        } catch (galat) {
          req.payload.logger.error({ err: galat, msg: `Unggah ${file.filename} ke Cloudinary gagal` })
          throw new APIError(PESAN_UNGGAH_GAGAL, 502)
        }
      },

      handleDelete: async ({ doc, req }) => {
        const { publicId, mimeType } = doc as DokumenMedia
        if (!publicId) return
        const jenis = mimeType ? jenisDariMime(mimeType) : jenisDariPublicId(publicId)
        try {
          await klien().hapus(publicId, resourceType(jenis))
        } catch (galat) {
          // Dokumen tetap terhapus; aset yatim di Cloudinary tidak merusak situs.
          req.payload.logger.warn({ err: galat, msg: `Gagal menghapus ${publicId} dari Cloudinary` })
        }
      },

      /** `/api/media/file/<nama>` diarahkan ke CDN Cloudinary, file tidak pernah dialirkan lewat server. */
      staticHandler: async (_req, { doc }) => {
        const publicId = (doc as DokumenMedia | undefined)?.publicId
        if (!publicId) return new Response(null, { status: 404 })
        return Response.redirect(urlDokumen(klien().cloudName, { publicId, jenis: jenisDariPublicId(publicId) }), 302)
      },
    })
  }
  ```

  `src/modules/media/plugin.ts`

  ```ts
  import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
  import type { Plugin } from 'payload'

  import { adapterCloudinary } from './adapter'
  import type { KlienCloudinary } from './klien'

  /**
   * Memasang adapter Cloudinary ke koleksi `media`.
   * - `disableLocalStorage: true`: tidak ada file di disk server.
   * - `disablePayloadAccessControl: true`: field `url` berisi URL CDN Cloudinary langsung
   *   (lewat `generateURL`), bukan `/api/media/file/...`. Media situs ini publik.
   */
  export function mediaCloudinary({ klien }: { klien: () => KlienCloudinary }): Plugin {
    return cloudStoragePlugin({
      collections: {
        media: {
          adapter: adapterCloudinary({ klien }),
          disableLocalStorage: true,
          disablePayloadAccessControl: true,
        },
      },
    })
  }
  ```

- [ ] **Langkah 8: Perbarui koleksi media dan config**

  Ganti seluruh isi `src/collections/Media.ts`:

  `src/collections/Media.ts`

  ```ts
  import type { CollectionConfig, FieldAccess } from 'payload'

  import { anyone, isLoggedIn } from '@/access'
  import { validasiAlt } from '@/lib/media'
  import { JENIS_FILE } from '@/modules/media/unggah'

  /** Field yang hanya boleh diisi sistem (adapter Cloudinary), tidak lewat API atau form admin. */
  const hanyaSistem: FieldAccess = () => false

  /**
   * File disimpan di Cloudinary lewat adapter `src/modules/media/adapter.ts` yang dipasang di
   * `payload.config.ts` (plugin cloud storage, `disableLocalStorage: true`). Field lama tetap.
   */
  export const Media: CollectionConfig = {
    slug: 'media',
    labels: { singular: 'Media', plural: 'Media' },
    admin: {
      useAsTitle: 'alt',
      defaultColumns: ['filename', 'alt', 'jenis', 'width', 'mimeType'],
      group: 'Konten',
    },
    access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
    upload: {
      mimeTypes: [...JENIS_FILE],
      // Potongan dibuat Cloudinary (g_auto), bukan sharp. Focal point dibiarkan aktif supaya kolom
      // focal_x/focal_y dari Rencana 1 tetap ada (perubahan skema harus aditif).
      crop: false,
    },
    fields: [
      {
        name: 'alt',
        type: 'text',
        label: 'Teks alternatif',
        admin: { description: 'Jelaskan isi gambar untuk pembaca layar. Wajib untuk gambar.' },
        validate: (value: unknown, { data }: { data: Partial<{ mimeType: string | null }> }) =>
          validasiAlt(value, data?.mimeType),
      },
      { name: 'caption', type: 'text' },
      { name: 'kredit', type: 'text', admin: { description: 'Contoh: Foto: Nama Fotografer / Sumber' } },
      {
        name: 'publicId',
        type: 'text',
        label: 'Public ID Cloudinary',
        index: true,
        access: { create: hanyaSistem, update: hanyaSistem },
        admin: { readOnly: true, position: 'sidebar' },
      },
      {
        name: 'jenis',
        type: 'select',
        options: [
          { label: 'Gambar', value: 'gambar' },
          { label: 'Video', value: 'video' },
        ],
        access: { create: hanyaSistem, update: hanyaSistem },
        admin: { readOnly: true, position: 'sidebar' },
      },
      {
        name: 'durasi',
        type: 'number',
        label: 'Durasi (detik)',
        access: { create: hanyaSistem, update: hanyaSistem },
        admin: { readOnly: true, position: 'sidebar', condition: (data) => data?.jenis === 'video' },
      },
    ],
  }
  ```

  Ubah `src/payload.config.ts`:

  ```diff
  diff --git a/src/payload.config.ts b/src/payload.config.ts
  index acb6663..215b283 100644
  --- a/src/payload.config.ts
  +++ b/src/payload.config.ts
  @@ -22,6 +22,8 @@ import { Footer } from './globals/Footer'
   import { Header } from './globals/Header'
   import { Newsletter } from './globals/Newsletter'
   import { PengaturanSEO } from './globals/PengaturanSEO'
  +import { klienMedia } from './modules/media'
  +import { mediaCloudinary } from './modules/media/plugin'
   
   const filename = fileURLToPath(import.meta.url)
   const dirname = path.dirname(filename)
  @@ -53,5 +55,5 @@ export default buildConfig({
       pool: { connectionString: process.env.DATABASE_URL || '' },
     }),
     sharp,
  -  plugins: [],
  +  plugins: [mediaCloudinary({ klien: klienMedia })],
   })
  ```

- [ ] **Langkah 9: Perbarui tipe dan pastikan skema hanya bertambah**

  Jalankan:

  ```bash
  npm run generate:types
  git diff src/payload-types.ts | grep '^[-+] '
  npm run typecheck
  ```

  Hasil yang diharapkan: diff tipe hanya baris tambahan (`+  publicId?`, `+  jenis?`, `+  durasi?`, `+  _objectKey?`, dua kali: `Media` dan `MediaSelect`), tidak ada baris `-`. Type check bersih.

- [ ] **Langkah 10: Jalankan semua tes**

  Jalankan:

  ```bash
  npm run test:unit
  npm run test:int
  npm run lint
  ```

  Hasil yang diharapkan: unit `Test Files 14 passed (14)`, `Tests 88 passed (88)`; integrasi `Test Files 9 passed (9)`, `Tests 25 passed (25)`; lint tanpa error. Tes `buatGambar` dan `seed` dari Rencana 1 tetap lulus karena sekarang memakai adapter. Folder `media/` tidak bertambah.

- [ ] **Langkah 11: Commit**

  ```bash
  git add package.json package-lock.json src/collections/Media.ts src/payload.config.ts src/payload-types.ts \
    src/modules/media/cloudinary.ts src/modules/media/index.ts src/modules/media/adapter.ts src/modules/media/plugin.ts \
    tests/int/setup.ts tests/int/fixtures.ts tests/int/media.int.spec.ts tests/unit/media-adapter.test.ts
  git commit -m "feat(media): adapter Cloudinary di atas plugin cloud storage, unggah lewat server"
  ```


### Task 5: Unggah langsung dari browser ke Cloudinary (signed upload)

**Files:**
- Create: `src/modules/media/kirim.ts`, `src/modules/media/tandaTangan.ts`, `src/modules/media/unggahLangsung.ts`, `src/modules/media/UnggahLangsung.tsx`
- Modify: `src/modules/media/adapter.ts`, `src/modules/media/plugin.ts`, `tests/unit/media-adapter.test.ts`, `src/app/(payload)/admin/importMap.js` (generate)
- Test: `tests/unit/media-kirim.test.ts`, `tests/unit/media-adapter.test.ts`, `tests/int/media-langsung.int.spec.ts`

**Interfaces:**
- Consumes: `siapkanUnggahan`, `mimeDiizinkan`, `PESAN_JENIS_DITOLAK`, `metaDariAset`, `jenisDariPublicId`, `resourceType` (Task 3); `adapterCloudinary`, `mediaCloudinary`, `klienMedia` (Task 4); dari Payload: `createClientUploadReceipt`, `assertClientUploadAccess`, `assertClientUploadAllowed`, `assertClientUploadFileSize` (`payload/internal`), `initClientUploads` (`@payloadcms/plugin-cloud-storage/utilities`), `createClientUploadHandler` (`@payloadcms/plugin-cloud-storage/client`), `formatAdminURL` (`payload/shared`), `handleEndpoints` (`payload`, untuk tes REST).
- Produces:
  - `src/modules/media/kirim.ts` (aman untuk browser): `AMBANG_CHUNK = 100 MB`, `UKURAN_CHUNK = 20 MB`, `type PersiapanKirim = { urlUnggah; field }`, `pesanDariRespons(data)`, `kirimKeCloudinary(berkas: Blob, persiapan, opsi?): Promise<HasilCloudinary>`.
  - `src/modules/media/tandaTangan.ts`: `PATH_TANDA_TANGAN = '/media-cloudinary-tanda-tangan'`, `type KonteksUnggahLangsung = { publicId: string }`, `isKonteksUnggahLangsung(nilai)`, `endpointTandaTangan({ klien }): PayloadHandler`.
  - `src/modules/media/unggahLangsung.ts`: `KUNCI_ASET_LANGSUNG`, `PESAN_BELUM_ADA`, `asetLangsung(context)`, hook `periksaUnggahLangsung` (beforeOperation) dan `isiMetaUnggahLangsung` (beforeChange).
  - `src/modules/media/UnggahLangsung.tsx`: komponen klien `UnggahLangsung` (path import map `@/modules/media/UnggahLangsung#UnggahLangsung`).
  - Endpoint `POST /api/media-cloudinary-tanda-tangan` dengan body `{ collectionSlug: 'media', filename, filesize, mimeType }` yang mengembalikan `{ urlUnggah, field, clientUploadContext: { publicId, signedReceipt } }`.

Alur di admin (sama dengan `@payloadcms/storage-s3`, hanya tujuan unggahnya berbeda):

1. Form upload Payload memanggil handler `UnggahLangsung` (didaftarkan `initClientUploads` sebagai provider admin untuk koleksi `media`).
2. Handler meminta `POST /api/media-cloudinary-tanda-tangan`. Server memeriksa login dan akses `create`/`update` koleksi, jenis file (`assertClientUploadAllowed` menolak SVG/XML, `mimeDiizinkan` menolak selain daftar), dan ukuran, lalu membuat `publicId`, menandatangani parameter Cloudinary, dan menerbitkan receipt Payload berisi `{ publicId }`.
3. Browser mengirim file langsung ke `https://api.cloudinary.com/v1_1/<cloud>/<image|video>/upload` (dipecah per 20 MB bila > 100 MB). File tidak lewat server Vercel, jadi batas 4,5 MB tidak berlaku.
4. Form mengirim dokumen ke `POST /api/media` dengan field `file` berisi JSON `{ clientUploadContext, collectionSlug, filename, mimeType, size }`. Payload memverifikasi receipt (`requiresClientUploadReceipt: true`), lalu memanggil `staticHandler` adapter dengan `clientUploadContext` untuk mengambil file (header gambar atau seluruh file kecil) demi pemeriksaan jenis. `staticHandler` mengambil aset lewat Admin API (404 bila tidak ada), mencatatnya di `req.context`, dan mengalirkan file dari CDN.
5. `periksaUnggahLangsung` menolak operasi bila aset tidak tercatat atau publicId-nya tidak sama dengan receipt. `isiMetaUnggahLangsung` mengisi `publicId`, `jenis`, `durasi`, `filesize`, `width`, `height` dari Cloudinary (ukuran setelah incoming transformation). Plugin melewati `handleUpload` untuk file dengan `clientUploadContext`; untuk GIF/WebP yang konteksnya dihapus sharp, `handleUpload` mengembalikan `{}` bila aset langsung sudah tercatat, jadi file tidak pernah diunggah dua kali.

Bila unggahan gagal (Cloudinary menolak, koneksi putus, receipt kedaluwarsa), `kirimKeCloudinary` melempar pesan berbahasa Indonesia yang tampil sebagai toast di dialog unggah, dan dokumen tidak tersimpan (spesifikasi §15). Editor cukup menekan simpan lagi. Tombol "ulangi" khusus tidak dibuat karena form Payload sudah mempertahankan file dan isian; dicatat di Risiko.

Tes integrasi memanggil REST API sungguhan lewat `handleEndpoints` dengan token JWT editor, dan meniru langkah 3 dengan `klienPalsu().unggahDariBrowser` (memeriksa tanda tangan seperti Cloudinary).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/media-kirim.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import { kirimKeCloudinary, pesanDariRespons } from '@/modules/media/kirim'

  const persiapan = {
    urlUnggah: 'https://api.cloudinary.com/v1_1/demo/image/upload',
    field: { public_id: 'point/gambar/a-1', timestamp: '1', signature: 'abc', api_key: 'k' },
  }

  type Panggilan = { url: string; body: FormData; headers: Record<string, string> }

  function fetchPalsu(jawab: (p: Panggilan, ke: number) => Response) {
    const panggilan: Panggilan[] = []
    const fn = (async (url: string, init: RequestInit) => {
      const p = { url, body: init.body as FormData, headers: (init.headers ?? {}) as Record<string, string> }
      panggilan.push(p)
      return jawab(p, panggilan.length)
    }) as unknown as typeof fetch
    return { fn, panggilan }
  }

  const ok = (data: unknown) => new Response(JSON.stringify(data), { status: 200 })

  describe('kirimKeCloudinary', () => {
    it('mengirim file kecil sekali jalan dengan semua field bertanda tangan', async () => {
      const { fn, panggilan } = fetchPalsu(() => ok({ public_id: 'point/gambar/a-1', version: 2 }))
      const hasil = await kirimKeCloudinary(new Blob(['isi'], { type: 'image/png' }), persiapan, { fetch: fn })

      expect(hasil).toEqual({ public_id: 'point/gambar/a-1', version: 2 })
      expect(panggilan).toHaveLength(1)
      expect(panggilan[0]?.url).toBe(persiapan.urlUnggah)
      const body = panggilan[0]!.body
      for (const [k, v] of Object.entries(persiapan.field)) expect(body.get(k)).toBe(v)
      expect(body.get('file')).toBeInstanceOf(Blob)
    })

    it('memecah file besar menjadi chunk dengan X-Unique-Upload-Id dan Content-Range', async () => {
      const { fn, panggilan } = fetchPalsu((_p, ke) =>
        ok(ke < 3 ? { done: false } : { public_id: 'point/gambar/a-1', version: 3, done: true }),
      )
      const berkas = new Blob([new Uint8Array(25)], { type: 'video/mp4' })
      const hasil = await kirimKeCloudinary(berkas, persiapan, { fetch: fn, ambangChunk: 10, ukuranChunk: 10 })

      expect(hasil).toMatchObject({ public_id: 'point/gambar/a-1', done: true })
      expect(panggilan.map((p) => p.headers['Content-Range'])).toEqual([
        'bytes 0-9/25',
        'bytes 10-19/25',
        'bytes 20-24/25',
      ])
      const id = panggilan[0]?.headers['X-Unique-Upload-Id']
      expect(id).toMatch(/^[0-9a-f-]{36}$/)
      expect(panggilan.every((p) => p.headers['X-Unique-Upload-Id'] === id)).toBe(true)
    })

    it('menerjemahkan penolakan Cloudinary menjadi pesan berbahasa Indonesia', async () => {
      const { fn } = fetchPalsu(() => new Response(JSON.stringify({ error: { message: 'Invalid Signature' } }), { status: 401 }))
      await expect(kirimKeCloudinary(new Blob(['x']), persiapan, { fetch: fn })).rejects.toThrow(
        'Cloudinary menolak file (Invalid Signature). Coba unggah ulang.',
      )
    })

    it('melaporkan koneksi putus dan public_id yang tidak sesuai', async () => {
      const putus = (async () => {
        throw new TypeError('Failed to fetch')
      }) as unknown as typeof fetch
      await expect(kirimKeCloudinary(new Blob(['x']), persiapan, { fetch: putus })).rejects.toThrow(
        'Koneksi ke Cloudinary terputus. Periksa internet lalu simpan ulang.',
      )

      const { fn } = fetchPalsu(() => ok({ public_id: 'point/gambar/lain' }))
      await expect(kirimKeCloudinary(new Blob(['x']), persiapan, { fetch: fn })).rejects.toThrow(
        'Cloudinary mengembalikan file yang berbeda. Coba unggah ulang.',
      )
    })
  })

  describe('pesanDariRespons', () => {
    it('membaca pesan galat Payload dan Cloudinary', () => {
      expect(pesanDariRespons({ errors: [{ message: 'Satu' }, { message: 'Dua' }] })).toBe('Satu Dua')
      expect(pesanDariRespons({ error: { message: 'Format salah' } })).toBe('Format salah')
      expect(pesanDariRespons(null)).toBeUndefined()
    })
  })
  ```

  Tambahkan ke `tests/unit/media-adapter.test.ts` (import, `context` di `reqPalsu`, dan blok `describe` baru di akhir file):

  ```diff
  diff --git a/tests/unit/media-adapter.test.ts b/tests/unit/media-adapter.test.ts
  index 0129755..e3bde7f 100644
  --- a/tests/unit/media-adapter.test.ts
  +++ b/tests/unit/media-adapter.test.ts
  @@ -4,12 +4,14 @@ import { describe, expect, it, vi } from 'vitest'
   import { klienDariEnv } from '@/modules/media'
   import { adapterCloudinary, NAMA_ADAPTER, PESAN_UNGGAH_GAGAL } from '@/modules/media/adapter'
   import { klienPalsu } from '@/modules/media/palsu'
  +import { siapkanUnggahan } from '@/modules/media/unggah'
  +import { KUNCI_ASET_LANGSUNG } from '@/modules/media/unggahLangsung'
   
   const koleksi = { slug: 'media', fields: [] } as unknown as CollectionConfig
   
   function reqPalsu() {
     const logger = { error: vi.fn(), warn: vi.fn() }
  -  return { req: { payload: { logger } } as unknown as PayloadRequest, logger }
  +  return { req: { context: {}, payload: { logger } } as unknown as PayloadRequest, logger }
   }
   
   function siapkan() {
  @@ -168,3 +170,46 @@ describe('klienDariEnv', () => {
       expect(klienDariEnv({ NODE_ENV: 'production', NEXT_PHASE: 'phase-production-build' }).cloudName).toBe('palsu')
     })
   })
  +
  +describe('adapterCloudinary untuk unggahan langsung', () => {
  +  it('mengaktifkan clientUploads dengan receipt wajib', () => {
  +    const { adapter } = siapkan()
  +    expect(adapter.clientUploads).toBe(true)
  +    expect(adapter.requiresClientUploadReceipt).toBe(true)
  +  })
  +
  +  it('staticHandler mengambil file dari Cloudinary dan mencatat asetnya', async () => {
  +    const { klien, adapter } = siapkan()
  +    const { req } = reqPalsu()
  +    const { field } = siapkanUnggahan(klien, { namaFile: 'a.png', mimeType: 'image/png', waktu: 1 })
  +    await klien.unggahDariBrowser(field, { buffer: Buffer.from('png'), mimeType: 'image/png', width: 10, height: 10 })
  +
  +    const respons = await adapter.staticHandler(req, {
  +      params: { collection: 'media', filename: 'a.png', clientUploadContext: { publicId: field.public_id } },
  +    })
  +    expect(respons.status).toBe(200)
  +    expect(await respons.text()).toBe('png')
  +    expect(req.context[KUNCI_ASET_LANGSUNG]).toMatchObject({ publicId: field.public_id, width: 10 })
  +
  +    const hilang = await adapter.staticHandler(req, {
  +      params: { collection: 'media', filename: 'b.png', clientUploadContext: { publicId: 'point/gambar/tidak-ada-1' } },
  +    })
  +    expect(hilang.status).toBe(404)
  +  })
  +
  +  it('handleUpload tidak mengunggah ulang aset yang sudah dikirim browser', async () => {
  +    const { klien, adapter } = siapkan()
  +    const { req } = reqPalsu()
  +    req.context[KUNCI_ASET_LANGSUNG] = { publicId: 'point/gambar/a-1', resourceType: 'image' }
  +    const hasil = await adapter.handleUpload({
  +      clientUploadContext: undefined,
  +      collection: koleksi,
  +      data: { filename: 'a.gif', mimeType: 'image/gif' },
  +      file: berkas('image/gif', 'a.gif'),
  +      req,
  +      storageFilePath: 'a.gif',
  +    })
  +    expect(hasil).toEqual({})
  +    expect(klien.aset.size).toBe(0)
  +  })
  +})
  ```

  `tests/int/media-langsung.int.spec.ts`

  ```ts
  import config from '@payload-config'
  import { handleEndpoints } from 'payload'
  import { beforeAll, describe, expect, it } from 'vitest'

  import { klienMedia } from '@/modules/media'
  import type { KlienPalsu } from '@/modules/media/palsu'
  import { PATH_TANDA_TANGAN } from '@/modules/media/tandaTangan'

  import { gambarPng, videoMp4 } from './fixtures'
  import { getTestPayload, unik } from './helpers'

  const klien = () => klienMedia() as KlienPalsu
  const BASIS = 'http://localhost:3000/api'

  let token = ''

  async function api(path: string, init: RequestInit & { json?: unknown } = {}) {
    const headers = new Headers(init.headers)
    if (token) headers.set('Authorization', `JWT ${token}`)
    let body = init.body
    if (init.json !== undefined) {
      headers.set('Content-Type', 'application/json')
      body = JSON.stringify(init.json)
    }
    const respons = await handleEndpoints({
      config,
      request: new Request(`${BASIS}${path}`, { method: init.method ?? 'POST', headers, body }),
    })
    return { status: respons.status, data: await respons.json().catch(() => null) }
  }

  type Persiapan = {
    urlUnggah: string
    field: Record<string, string>
    clientUploadContext: { publicId: string; signedReceipt: string }
  }

  /** Langkah browser: minta tanda tangan, unggah langsung ke "Cloudinary", lalu buat dokumen. */
  async function unggahLangsung(berkas: { data: Buffer; mimetype: string; name: string }, alt?: string) {
    const persiapan = await api(PATH_TANDA_TANGAN, {
      json: { collectionSlug: 'media', filename: berkas.name, filesize: berkas.data.length, mimeType: berkas.mimetype },
    })
    expect(persiapan.status).toBe(200)
    const { field, urlUnggah, clientUploadContext } = persiapan.data as Persiapan
    await klien().unggahDariBrowser(field, {
      buffer: berkas.data,
      mimeType: berkas.mimetype,
      ...(berkas.mimetype.startsWith('image/') ? { width: 3000, height: 2000 } : {}),
    })

    const form = new FormData()
    form.append('_payload', JSON.stringify(alt ? { alt } : {}))
    form.append(
      'file',
      JSON.stringify({
        clientUploadContext,
        collectionSlug: 'media',
        filename: berkas.name,
        mimeType: berkas.mimetype,
        size: berkas.data.length,
      }),
    )
    const dibuat = await api('/media', { body: form })
    return { dibuat, urlUnggah, field, publicId: clientUploadContext.publicId }
  }

  describe('unggah langsung dari browser ke Cloudinary', () => {
    beforeAll(async () => {
      const payload = await getTestPayload()
      const email = `${unik('editor')}@tes.local`
      await payload.create({
        collection: 'pengguna',
        data: { email, password: 'rahasia-123', nama: 'Editor Media' },
      })
      const masuk = await payload.login({ collection: 'pengguna', data: { email, password: 'rahasia-123' } })
      token = masuk.token!
    })

    it('menolak permintaan tanda tangan tanpa login', async () => {
      const simpan = token
      token = ''
      const hasil = await api(PATH_TANDA_TANGAN, {
        json: { collectionSlug: 'media', filename: 'a.png', filesize: 10, mimeType: 'image/png' },
      })
      token = simpan
      expect(hasil.status).toBe(403)
    })

    it('menolak jenis file di luar daftar', async () => {
      const hasil = await api(PATH_TANDA_TANGAN, {
        json: { collectionSlug: 'media', filename: 'film.mov', filesize: 10, mimeType: 'video/quicktime' },
      })
      expect(hasil.status).toBe(400)
      expect(JSON.stringify(hasil.data)).toContain('Jenis file tidak didukung')
    })

    it('gambar: browser mengunggah sendiri, server hanya menyimpan metadata Cloudinary', async () => {
      const berkas = await gambarPng(3000, 2000)
      const { dibuat, urlUnggah, field, publicId } = await unggahLangsung(berkas, 'Grafik dari browser')

      expect(urlUnggah).toBe('https://api.cloudinary.com/v1_1/palsu/image/upload')
      expect(field).toMatchObject({
        api_key: 'kunci-palsu',
        overwrite: 'false',
        transformation: 'c_limit,w_2560,q_auto',
        allowed_formats: 'jpg,png,webp,avif,gif',
      })
      expect(field.signature).toMatch(/^[0-9a-f]{40}$/)

      expect(dibuat.status).toBe(201)
      const doc = (dibuat.data as { doc: Record<string, unknown> }).doc
      expect(doc).toMatchObject({ publicId, jenis: 'gambar', width: 2560, height: 1707, alt: 'Grafik dari browser' })
      expect(doc.url).toBe(`https://res.cloudinary.com/palsu/image/upload/f_auto,q_auto/${publicId}`)
      // Tidak diunggah ulang oleh server.
      expect(klien().aset.get(publicId)?.lewat).toBe('browser')
    })

    it('video: turunan HLS, poster, dan MP4 diminta eager async', async () => {
      const { dibuat, urlUnggah, field, publicId } = await unggahLangsung(videoMp4())
      expect(urlUnggah).toBe('https://api.cloudinary.com/v1_1/palsu/video/upload')
      expect(field).toMatchObject({ eager: 'sp_auto/m3u8|so_auto/q_auto/jpg|q_auto/mp4', eager_async: 'true' })
      expect(dibuat.status).toBe(201)
      const doc = (dibuat.data as { doc: Record<string, unknown> }).doc
      expect(doc).toMatchObject({ publicId, jenis: 'video', durasi: 30, width: 1080, height: 1920 })
      expect(klien().aset.get(publicId)?.lewat).toBe('browser')
    })

    it('mengubah alt lewat REST tidak bisa mengganti publicId', async () => {
      const { dibuat, publicId } = await unggahLangsung(await gambarPng(1000, 800), 'Alt lama')
      const id = (dibuat.data as { doc: { id: number } }).doc.id
      const diubah = await api(`/media/${id}`, {
        method: 'PATCH',
        json: { alt: 'Alt baru', publicId: 'point/gambar/milik-orang-lain' },
      })
      expect(diubah.status).toBe(200)
      expect((diubah.data as { doc: Record<string, unknown> }).doc).toMatchObject({ alt: 'Alt baru', publicId })
    })

    it('menolak dokumen bila file tidak pernah sampai di Cloudinary', async () => {
      const berkas = await gambarPng(800, 600)
      const persiapan = await api(PATH_TANDA_TANGAN, {
        json: { collectionSlug: 'media', filename: berkas.name, filesize: berkas.size, mimeType: 'image/png' },
      })
      const { clientUploadContext } = persiapan.data as Persiapan
      const form = new FormData()
      form.append('_payload', JSON.stringify({ alt: 'Tidak pernah diunggah' }))
      form.append(
        'file',
        JSON.stringify({ clientUploadContext, collectionSlug: 'media', filename: berkas.name, mimeType: 'image/png', size: berkas.size }),
      )
      const hasil = await api('/media', { body: form })
      expect(hasil.status).toBeGreaterThanOrEqual(400)
    })

    it('menolak receipt yang publicId-nya diubah browser', async () => {
      const berkas = await gambarPng(800, 600)
      const persiapan = await api(PATH_TANDA_TANGAN, {
        json: { collectionSlug: 'media', filename: berkas.name, filesize: berkas.size, mimeType: 'image/png' },
      })
      const { clientUploadContext } = persiapan.data as Persiapan
      const [isi, tanda] = clientUploadContext.signedReceipt.split('.')
      const receipt = JSON.parse(Buffer.from(isi!, 'base64url').toString())
      receipt.context.publicId = 'point/gambar/milik-orang-lain'
      const palsu = `${Buffer.from(JSON.stringify(receipt)).toString('base64url')}.${tanda}`

      const form = new FormData()
      form.append('_payload', JSON.stringify({ alt: 'Dipalsukan' }))
      form.append(
        'file',
        JSON.stringify({
          clientUploadContext: { ...clientUploadContext, signedReceipt: palsu },
          collectionSlug: 'media',
          filename: berkas.name,
          mimeType: 'image/png',
          size: berkas.size,
        }),
      )
      const hasil = await api('/media', { body: form })
      expect(hasil.status).toBe(400)
      expect(JSON.stringify(hasil.data)).toContain('Invalid or expired client upload reference')
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  npx cross-env NODE_OPTIONS=--no-deprecation vitest run --config ./vitest.int.config.mts tests/int/media-langsung.int.spec.ts
  ```

  Hasil yang diharapkan: unit FAIL di `tests/unit/media-kirim.test.ts` dan `tests/unit/media-adapter.test.ts` (modul `@/modules/media/kirim` dan `@/modules/media/unggahLangsung` belum ada). Integrasi FAIL karena modul `@/modules/media/tandaTangan` belum ada.

- [ ] **Langkah 3: Tulis pengirim browser**

  `src/modules/media/kirim.ts`

  ```ts
  /**
   * Unggahan dari browser langsung ke Cloudinary (signed upload). Dipakai komponen admin
   * `UnggahLangsung`, tanpa dependensi server supaya aman masuk bundle klien.
   *
   * Cloudinary mewajibkan unggah bertahap untuk file di atas 100 MB: setiap potongan membawa
   * header `X-Unique-Upload-Id` yang sama dan `Content-Range` (https://cloudinary.com/documentation/upload_images).
   */

  export const AMBANG_CHUNK = 100 * 1024 * 1024
  export const UKURAN_CHUNK = 20 * 1024 * 1024

  export type PersiapanKirim = { urlUnggah: string; field: Record<string, string> }

  export type HasilCloudinary = { public_id: string; [kunci: string]: unknown }

  export function pesanDariRespons(data: unknown): string | undefined {
    const d = data as { errors?: { message?: string }[]; error?: { message?: string } } | null
    const daftar = d?.errors?.map((e) => e.message).filter(Boolean)
    if (daftar?.length) return daftar.join(' ')
    return d?.error?.message
  }

  async function kirim(
    fetchFn: typeof fetch,
    url: string,
    field: Record<string, string>,
    potongan: Blob,
    headers: Record<string, string> = {},
  ): Promise<Record<string, unknown>> {
    const body = new FormData()
    for (const [kunci, nilai] of Object.entries(field)) body.append(kunci, nilai)
    body.append('file', potongan)

    let respons: Response
    try {
      respons = await fetchFn(url, { method: 'POST', body, headers })
    } catch {
      throw new Error('Koneksi ke Cloudinary terputus. Periksa internet lalu simpan ulang.')
    }
    const data = (await respons.json().catch(() => null)) as Record<string, unknown> | null
    if (!respons.ok) {
      const alasan = pesanDariRespons(data) ?? `status ${respons.status}`
      throw new Error(`Cloudinary menolak file (${alasan}). Coba unggah ulang.`)
    }
    return data ?? {}
  }

  export async function kirimKeCloudinary(
    berkas: Blob,
    persiapan: PersiapanKirim,
    opsi: { fetch?: typeof fetch; ambangChunk?: number; ukuranChunk?: number } = {},
  ): Promise<HasilCloudinary> {
    const fetchFn = opsi.fetch ?? fetch
    const ambang = opsi.ambangChunk ?? AMBANG_CHUNK
    const ukuran = opsi.ukuranChunk ?? UKURAN_CHUNK

    let hasil: Record<string, unknown>
    if (berkas.size <= ambang) {
      hasil = await kirim(fetchFn, persiapan.urlUnggah, persiapan.field, berkas)
    } else {
      const idUnggah = crypto.randomUUID()
      hasil = {}
      for (let awal = 0; awal < berkas.size; awal += ukuran) {
        const akhir = Math.min(awal + ukuran, berkas.size)
        hasil = await kirim(fetchFn, persiapan.urlUnggah, persiapan.field, berkas.slice(awal, akhir), {
          'X-Unique-Upload-Id': idUnggah,
          'Content-Range': `bytes ${awal}-${akhir - 1}/${berkas.size}`,
        })
      }
    }

    if (hasil.public_id !== persiapan.field.public_id) {
      throw new Error('Cloudinary mengembalikan file yang berbeda. Coba unggah ulang.')
    }
    return hasil as HasilCloudinary
  }
  ```

- [ ] **Langkah 4: Tulis endpoint tanda tangan**

  `src/modules/media/tandaTangan.ts`

  ```ts
  import { APIError, type PayloadHandler, type PayloadRequest } from 'payload'
  import {
    assertClientUploadAccess,
    assertClientUploadAllowed,
    assertClientUploadFileSize,
    createClientUploadReceipt,
  } from 'payload/internal'

  import type { KlienCloudinary } from './klien'
  import { mimeDiizinkan, PESAN_JENIS_DITOLAK, siapkanUnggahan } from './unggah'

  export const PATH_TANDA_TANGAN = '/media-cloudinary-tanda-tangan'

  /**
   * Konteks unggahan langsung yang dibawa receipt Payload. Payload menandatangani receipt dengan
   * PAYLOAD_SECRET, mengikatnya ke pengguna, koleksi, dan nama file, lalu memverifikasinya saat
   * dokumen dibuat (`requiresClientUploadReceipt`). Browser tidak bisa memalsukan publicId.
   */
  export type KonteksUnggahLangsung = { publicId: string }

  export function isKonteksUnggahLangsung(nilai: unknown): nilai is KonteksUnggahLangsung {
    const publicId = (nilai as Partial<KonteksUnggahLangsung> | null)?.publicId
    return typeof publicId === 'string' && /^point\/(gambar|video)\/[a-z0-9-]+$/.test(publicId)
  }

  type Masukan = { collectionSlug?: unknown; filename?: unknown; filesize?: unknown; mimeType?: unknown }

  /**
   * Endpoint `POST /api/media-cloudinary-tanda-tangan`, pola yang sama dengan generateSignedURL di
   * `@payloadcms/storage-s3`: cek akses, cek jenis file, buat kunci di server, terbitkan receipt.
   * Bedanya, yang dikembalikan adalah field signed upload Cloudinary, bukan presigned URL S3.
   */
  export function endpointTandaTangan({ klien }: { klien: () => KlienCloudinary }): PayloadHandler {
    return async (req: PayloadRequest) => {
      const masukan = ((await req.json?.().catch(() => null)) ?? {}) as Masukan
      const { collectionSlug, filename, filesize, mimeType } = masukan
      if (collectionSlug !== 'media' || typeof filename !== 'string') {
        throw new APIError('Permintaan tanda tangan tidak valid.', 400)
      }
      await assertClientUploadAccess({ collectionSlug, req })
      assertClientUploadAllowed({ collection: req.payload.collections.media.config, filename, mimeType })
      assertClientUploadFileSize(filesize)
      if (!mimeDiizinkan(mimeType)) throw new APIError(PESAN_JENIS_DITOLAK, 400)

      const persiapan = siapkanUnggahan(klien(), {
        namaFile: filename,
        mimeType,
        waktu: Math.floor(Date.now() / 1000),
      })
      const konteks: KonteksUnggahLangsung = { publicId: persiapan.publicId }
      const signedReceipt = createClientUploadReceipt({ collectionSlug, context: konteks, filename, req })

      return Response.json({
        urlUnggah: persiapan.urlUnggah,
        field: persiapan.field,
        clientUploadContext: { ...konteks, signedReceipt },
      })
    }
  }
  ```

- [ ] **Langkah 5: Tulis hook unggahan langsung**

  `src/modules/media/unggahLangsung.ts`

  ```ts
  import { APIError, type CollectionBeforeChangeHook, type CollectionBeforeOperationHook } from 'payload'

  import type { AsetCloudinary } from './klien'
  import { isKonteksUnggahLangsung } from './tandaTangan'
  import { metaDariAset } from './unggah'

  /**
   * Kunci `req.context` berisi aset Cloudinary dari unggahan langsung pada permintaan ini. Diisi
   * `staticHandler` adapter saat Payload mengambil file untuk diperiksa, sebelum operasi berjalan.
   */
  export const KUNCI_ASET_LANGSUNG = 'mediaAsetLangsung'

  export const PESAN_BELUM_ADA = 'File belum sampai di Cloudinary. Unggah ulang filenya.'

  export function asetLangsung(context: Record<string, unknown>): AsetCloudinary | undefined {
    return context[KUNCI_ASET_LANGSUNG] as AsetCloudinary | undefined
  }

  /**
   * beforeOperation: unggahan langsung hanya diterima bila asetnya benar-benar ada di Cloudinary
   * dengan publicId dari receipt. Dokumen tidak pernah menyimpan media rusak (spesifikasi §15).
   * Operasi tanpa unggahan langsung (unggah lewat server, update metadata) membersihkan kuncinya.
   */
  export const periksaUnggahLangsung: CollectionBeforeOperationHook = ({ operation, req }) => {
    if (operation !== 'create' && operation !== 'update') return
    const konteks = req.file?.clientUploadContext
    if (!isKonteksUnggahLangsung(konteks)) {
      delete req.context[KUNCI_ASET_LANGSUNG]
      return
    }
    if (asetLangsung(req.context)?.publicId !== konteks.publicId) throw new APIError(PESAN_BELUM_ADA, 400)
  }

  /** beforeChange: metadata dokumen diambil dari aset Cloudinary (ukuran setelah incoming transformation). */
  export const isiMetaUnggahLangsung: CollectionBeforeChangeHook = ({ data, req }) => {
    const aset = asetLangsung(req.context)
    if (!aset) return data
    const meta = metaDariAset(aset)
    return {
      ...data,
      publicId: aset.publicId,
      jenis: meta.jenis,
      durasi: meta.durasi,
      filesize: meta.bytes,
      ...(meta.width && meta.height ? { width: meta.width, height: meta.height } : {}),
    }
  }
  ```

- [ ] **Langkah 6: Tulis komponen klien admin**

  `src/modules/media/UnggahLangsung.tsx`

  ```tsx
  'use client'

  import { createClientUploadHandler } from '@payloadcms/plugin-cloud-storage/client'
  import { formatAdminURL } from 'payload/shared'

  import { kirimKeCloudinary, pesanDariRespons, type PersiapanKirim } from './kirim'

  /**
   * Pengunggah admin: minta tanda tangan ke server, kirim file langsung dari browser ke Cloudinary,
   * lalu kembalikan receipt ke form Payload. File tidak lewat server Vercel (batas sekitar 4,5 MB).
   * Pesan galat tampil sebagai toast di dialog unggah; dokumen tidak tersimpan bila gagal.
   */
  export const UnggahLangsung = createClientUploadHandler({
    handler: async ({ apiRoute, collectionSlug, file, serverHandlerPath, serverURL }) => {
      const respons = await fetch(formatAdminURL({ apiRoute, path: serverHandlerPath, serverURL }), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionSlug, filename: file.name, filesize: file.size, mimeType: file.type }),
      })
      const data = (await respons.json().catch(() => null)) as
        | (PersiapanKirim & { clientUploadContext: unknown })
        | null
      if (!respons.ok || !data) {
        throw new Error(pesanDariRespons(data) ?? 'Tanda tangan unggah tidak didapat. Coba lagi.')
      }
      await kirimKeCloudinary(file, data)
      return data.clientUploadContext
    },
  })
  ```

- [ ] **Langkah 7: Aktifkan client upload di adapter dan plugin**

  Ganti seluruh isi `src/modules/media/adapter.ts`:

  `src/modules/media/adapter.ts`

  ```ts
  import type { Adapter, GeneratedAdapter } from '@payloadcms/plugin-cloud-storage/types'
  import { APIError } from 'payload'

  import type { KlienCloudinary } from './klien'
  import { isKonteksUnggahLangsung } from './tandaTangan'
  import { jenisDariMime, jenisDariPublicId, resourceType, unggah } from './unggah'
  import { asetLangsung, KUNCI_ASET_LANGSUNG } from './unggahLangsung'
  import { urlDokumen } from './url'

  export const NAMA_ADAPTER = 'cloudinary'

  export const PESAN_UNGGAH_GAGAL = 'Unggahan ke Cloudinary gagal. Coba unggah ulang filenya.'

  /** Field dokumen media yang dibaca adapter. */
  type DokumenMedia = {
    publicId?: string | null
    jenis?: 'gambar' | 'video' | null
    mimeType?: string | null
    width?: number | null
    height?: number | null
  }

  /**
   * Adapter penyimpanan Cloudinary untuk `@payloadcms/plugin-cloud-storage` (antarmuka
   * `GeneratedAdapter`). Klien disuntikkan lewat fungsi supaya tes memakai klien palsu dan klien
   * sungguhan baru dibuat saat dibutuhkan.
   */
  export function adapterCloudinary({ klien }: { klien: () => KlienCloudinary }): Adapter {
    return (): GeneratedAdapter => ({
      name: NAMA_ADAPTER,
      clientUploads: true,
      // Payload memverifikasi receipt dari endpoint tanda tangan sebelum menerima unggahan langsung.
      requiresClientUploadReceipt: true,

      generateURL: ({ data }) => urlDokumen(klien().cloudName, (data ?? {}) as DokumenMedia),

      handleUpload: async ({ data, file, req }) => {
        // Unggahan langsung sudah ada di Cloudinary. Plugin melewatinya, kecuali bila sharp
        // memproses ulang GIF/WebP dan menghapus konteksnya; aset dari browser tetap dipakai.
        if (asetLangsung(req.context)) return {}

        const doc = data as DokumenMedia
        try {
          const { publicId, meta } = await unggah(klien(), {
            namaFile: file.filename,
            mimeType: file.mimeType,
            buffer: file.buffer,
            tempFilePath: file.tempFilePath,
            width: doc.width,
            height: doc.height,
          })
          return {
            publicId,
            jenis: meta.jenis,
            durasi: meta.durasi,
            filesize: meta.bytes,
            ...(meta.width && meta.height ? { width: meta.width, height: meta.height } : {}),
            url: urlDokumen(klien().cloudName, { publicId, jenis: meta.jenis }),
          }
        } catch (galat) {
          req.payload.logger.error({ err: galat, msg: `Unggah ${file.filename} ke Cloudinary gagal` })
          throw new APIError(PESAN_UNGGAH_GAGAL, 502)
        }
      },

      handleDelete: async ({ doc, req }) => {
        const { publicId, mimeType } = doc as DokumenMedia
        if (!publicId) return
        const jenis = mimeType ? jenisDariMime(mimeType) : jenisDariPublicId(publicId)
        try {
          await klien().hapus(publicId, resourceType(jenis))
        } catch (galat) {
          // Dokumen tetap terhapus; aset yatim di Cloudinary tidak merusak situs.
          req.payload.logger.warn({ err: galat, msg: `Gagal menghapus ${publicId} dari Cloudinary` })
        }
      },

      staticHandler: async (req, { doc, params }) => {
        // Unggahan langsung: Payload mengambil file untuk memeriksa jenis dan ukurannya sebelum
        // dokumen dibuat. Aset dicatat di req.context supaya hook tidak memanggil Admin API lagi.
        if (!doc && isKonteksUnggahLangsung(params.clientUploadContext)) {
          const { publicId } = params.clientUploadContext
          const aset = await klien().ambil(publicId, resourceType(jenisDariPublicId(publicId)))
          if (!aset) return new Response(null, { status: 404 })
          req.context[KUNCI_ASET_LANGSUNG] = aset
          return klien().unduh(aset)
        }
        // `/api/media/file/<nama>` diarahkan ke CDN Cloudinary, file tidak dialirkan lewat server.
        const publicId = (doc as DokumenMedia | undefined)?.publicId
        if (!publicId) return new Response(null, { status: 404 })
        return Response.redirect(urlDokumen(klien().cloudName, { publicId, jenis: jenisDariPublicId(publicId) }), 302)
      },
    })
  }
  ```

  Ganti seluruh isi `src/modules/media/plugin.ts`:

  `src/modules/media/plugin.ts`

  ```ts
  import { cloudStoragePlugin } from '@payloadcms/plugin-cloud-storage'
  import { initClientUploads } from '@payloadcms/plugin-cloud-storage/utilities'
  import type { CollectionConfig, Config, Plugin } from 'payload'

  import { adapterCloudinary } from './adapter'
  import type { KlienCloudinary } from './klien'
  import { endpointTandaTangan, PATH_TANDA_TANGAN } from './tandaTangan'
  import { isiMetaUnggahLangsung, periksaUnggahLangsung } from './unggahLangsung'

  /** Komponen admin yang mendaftarkan pengunggah langsung untuk koleksi `media`. */
  export const KOMPONEN_UNGGAH_LANGSUNG = '@/modules/media/UnggahLangsung#UnggahLangsung'

  type Opsi = { klien: () => KlienCloudinary }

  function pasangHook(koleksi: CollectionConfig): CollectionConfig {
    if (koleksi.slug !== 'media') return koleksi
    const hooks = koleksi.hooks ?? {}
    return {
      ...koleksi,
      hooks: {
        ...hooks,
        beforeOperation: [periksaUnggahLangsung, ...(hooks.beforeOperation ?? [])],
        beforeChange: [isiMetaUnggahLangsung, ...(hooks.beforeChange ?? [])],
      },
    }
  }

  /**
   * Memasang Cloudinary ke koleksi `media`:
   * - `disableLocalStorage: true`: tidak ada file di disk server.
   * - `disablePayloadAccessControl: true`: field `url` berisi URL CDN Cloudinary langsung
   *   (lewat `generateURL`). Media situs ini publik.
   * - unggah langsung dari browser: endpoint tanda tangan dan komponen klien didaftarkan lewat
   *   `initClientUploads`, pola yang sama dengan `@payloadcms/storage-s3` dan `storage-vercel-blob`.
   */
  export function mediaCloudinary(opsi: Opsi): Plugin {
    return (incoming: Config): Config => {
      const config: Config = { ...incoming, collections: incoming.collections?.map(pasangHook) }
      initClientUploads({
        clientHandler: KOMPONEN_UNGGAH_LANGSUNG,
        collections: { media: true },
        config,
        enabled: true,
        serverHandler: endpointTandaTangan(opsi),
        serverHandlerPath: PATH_TANDA_TANGAN,
      })
      return cloudStoragePlugin({
        collections: {
          media: {
            adapter: adapterCloudinary(opsi),
            disableLocalStorage: true,
            disablePayloadAccessControl: true,
          },
        },
      })(config)
    }
  }
  ```

- [ ] **Langkah 8: Perbarui import map, jalankan semua pemeriksaan**

  Jalankan:

  ```bash
  npm run generate:importmap
  grep -n "UnggahLangsung" "src/app/(payload)/admin/importMap.js"
  npm run generate:types && git diff --stat src/payload-types.ts
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  ```

  Hasil yang diharapkan: import map berisi dua baris `UnggahLangsung` (import dan entri `"@/modules/media/UnggahLangsung#UnggahLangsung"`); `payload-types.ts` tidak berubah; type check dan lint bersih; unit `Test Files 15 passed (15)`, `Tests 96 passed (96)`; integrasi `Test Files 10 passed (10)`, `Tests 32 passed (32)`. Log tes integrasi berisi baris `ERROR` yang memang diharapkan (jenis file ditolak, file belum sampai, receipt dipalsukan).

- [ ] **Langkah 9: Build dan uji asap endpoint**

  Jalankan (tanpa `CLOUDINARY_*` di `.env`, klien palsu dipakai):

  ```bash
  npm run build
  (PORT=3107 npm run start > /tmp/point-lat-start.log 2>&1 &) && sleep 20
  curl -s -o /dev/null -w "admin %{http_code}\n" http://localhost:3107/admin/login
  curl -s -X POST -H "Content-Type: application/json" \
    -d '{"collectionSlug":"media","filename":"a.png","filesize":10,"mimeType":"image/png"}' \
    -w "\ntanda-tangan %{http_code}\n" http://localhost:3107/api/media-cloudinary-tanda-tangan
  pkill -f "next start"
  ```

  Hasil yang diharapkan: build selesai; `admin 200`; endpoint tanpa login menjawab `{"errors":[{"message":"You are not allowed to perform this action."}]}` dan `tanda-tangan 403`.

- [ ] **Langkah 10: Commit**

  ```bash
  git add src/modules/media/kirim.ts src/modules/media/tandaTangan.ts src/modules/media/unggahLangsung.ts \
    src/modules/media/UnggahLangsung.tsx src/modules/media/adapter.ts src/modules/media/plugin.ts \
    "src/app/(payload)/admin/importMap.js" tests/unit/media-kirim.test.ts tests/unit/media-adapter.test.ts \
    tests/int/media-langsung.int.spec.ts
  git commit -m "feat(media): unggah langsung dari browser ke Cloudinary dengan signed upload"
  ```


### Task 6: Image loader Next.js kustom dan props gambar

**Files:**
- Create: `src/modules/media/loader.ts`, `src/modules/media/props.ts`
- Modify: `next.config.ts`
- Test: `tests/unit/media-loader.test.ts`

**Interfaces:**
- Consumes: `lebarkan`, `bangunUrl`, `dimensiPreset`, `JenisMedia`, `PresetGambar` (Task 1).
- Produces:
  - `src/modules/media/loader.ts`: default export `loaderCloudinary({ src, width, quality }: ImageLoaderProps): string`.
  - `src/modules/media/props.ts`: `type MediaUntukGambar`, `type PropsGambar = { src; width; height; alt }`, `propsGambar(media, preset, { cloudName, lebar? }): PropsGambar | null`. Rencana 4 memakai ini: `<Image {...propsGambar(media, 'kartu', { cloudName })} sizes="..." />`.

Dengan `images.loader: 'custom'`, `next/image` tidak lagi memakai `/_next/image`; setiap lebar `srcset` menjadi URL Cloudinary `c_limit,w_<lebar>,f_auto,q_auto` (tidak pernah memperbesar). `localPatterns` untuk `/api/media/file/**` dari Rencana 1 dihapus karena gambar tidak lagi dikirim lewat Payload. Kualitas bawaan `next/image` (75) diterjemahkan ke `q_auto`. `width`/`height` selalu terisi dari `propsGambar` sehingga tidak ada CLS; video memakai poster `so_auto`. Gambar di bawah lipatan memakai `loading="lazy"` bawaan `next/image`; hero memakai `priority` di Rencana 4.

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/media-loader.test.ts`

  ```ts
  import { describe, expect, it } from 'vitest'

  import loaderCloudinary from '@/modules/media/loader'
  import { propsGambar } from '@/modules/media/props'
  import { bangunUrl } from '@/modules/media/url'

  const ID = 'point/gambar/slip-gaji-1a2b3c4d'

  describe('image loader Next.js', () => {
    it('menyisipkan lebar srcset ke URL Cloudinary dan memakai q_auto bila kualitas default', () => {
      const src = bangunUrl('demo', ID, 'kartu')
      expect(loaderCloudinary({ src, width: 640 })).toBe(
        `https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,ar_4:3/c_limit,w_640,f_auto,q_auto/${ID}`,
      )
      expect(loaderCloudinary({ src, width: 640, quality: 75 })).toContain('/c_limit,w_640,f_auto,q_auto/')
      expect(loaderCloudinary({ src, width: 640, quality: 50 })).toContain('/c_limit,w_640,f_auto,q_50/')
    })

    it('URL lokal tetap diberi lebar', () => {
      expect(loaderCloudinary({ src: '/logo.png', width: 256 })).toBe('/logo.png?w=256')
    })
  })

  describe('propsGambar', () => {
    const media = { publicId: ID, jenis: 'gambar' as const, alt: 'Slip gaji', width: 2560, height: 1440 }

    it('selalu mengisi width, height, dan alt untuk next/image', () => {
      expect(propsGambar(media, 'hero', { cloudName: 'demo' })).toEqual({
        src: `https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,ar_16:9/f_auto,q_auto/${ID}`,
        width: 2560,
        height: 1440,
        alt: 'Slip gaji',
      })
      expect(propsGambar(media, 'kartu', { cloudName: 'demo' })).toMatchObject({ width: 1920, height: 1440 })
      expect(propsGambar(media, 'og', { cloudName: 'demo' })).toMatchObject({ width: 1200, height: 630 })
    })

    it('video memakai poster sebagai gambar', () => {
      const video = { publicId: 'point/video/thr-1', jenis: 'video' as const, alt: null, width: 1080, height: 1920 }
      expect(propsGambar(video, 'asli', { cloudName: 'demo' })).toEqual({
        src: 'https://res.cloudinary.com/demo/video/upload/so_auto/q_auto/point/video/thr-1.jpg',
        width: 1080,
        height: 1920,
        alt: '',
      })
    })

    it('null bila media belum punya publicId atau ukuran', () => {
      expect(propsGambar({ ...media, publicId: null }, 'hero', { cloudName: 'demo' })).toBeNull()
      expect(propsGambar({ ...media, width: null }, 'hero', { cloudName: 'demo' })).toBeNull()
      expect(propsGambar(null, 'hero', { cloudName: 'demo' })).toBeNull()
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/media-loader.test.ts` dengan `Cannot find package '@/modules/media/loader'`.

- [ ] **Langkah 3: Implementasi loader dan props**

  `src/modules/media/loader.ts`

  ```ts
  'use client'

  import type { ImageLoaderProps } from 'next/image'

  import { lebarkan } from './url'

  /** Kualitas bawaan next/image. Diterjemahkan ke q_auto supaya Cloudinary memilih kompresi terbaik. */
  const KUALITAS_BAWAAN = 75

  /**
   * Image loader kustom Next.js (`images.loader: 'custom'`, `loaderFile` di next.config.ts).
   * `src` adalah URL Cloudinary dari `bangunUrl`; lebar dari srcset disisipkan sebagai `c_limit,w_<n>`
   * sehingga gambar tidak pernah diperbesar dan tetap `f_auto`.
   */
  export default function loaderCloudinary({ src, width, quality }: ImageLoaderProps): string {
    return lebarkan(src, width, quality && quality !== KUALITAS_BAWAAN ? quality : undefined)
  }
  ```

  `src/modules/media/props.ts`

  ```ts
  import { bangunUrl, dimensiPreset, type JenisMedia, type PresetGambar } from './url'

  export type MediaUntukGambar = {
    publicId?: string | null
    jenis?: JenisMedia | null
    alt?: string | null
    width?: number | null
    height?: number | null
  }

  export type PropsGambar = { src: string; width: number; height: number; alt: string }

  /**
   * Props untuk `next/image` dari dokumen media. `width`/`height` selalu terisi dari ukuran hasil
   * preset supaya tidak ada CLS (spesifikasi §9). Video memakai posternya. `null` bila media belum
   * lengkap, supaya halaman tidak merender gambar tanpa ukuran.
   */
  export function propsGambar(
    media: MediaUntukGambar | null | undefined,
    preset: PresetGambar,
    opsi: { cloudName: string; lebar?: number },
  ): PropsGambar | null {
    if (!media?.publicId || !media.width || !media.height) return null
    const video = media.jenis === 'video'
    const src = video
      ? bangunUrl(opsi.cloudName, media.publicId, 'poster', { lebar: opsi.lebar })
      : bangunUrl(opsi.cloudName, media.publicId, preset, { lebar: opsi.lebar })
    const ukuran = dimensiPreset(video ? 'asli' : preset, { width: media.width, height: media.height }, opsi)
    return { src, ...ukuran, alt: media.alt ?? '' }
  }
  ```

- [ ] **Langkah 4: Pakai loader di `next.config.ts`**

  ```diff
  diff --git a/next.config.ts b/next.config.ts
  index db244d5..0dfbc83 100644
  --- a/next.config.ts
  +++ b/next.config.ts
  @@ -8,11 +8,10 @@ const dirname = path.dirname(__filename)
   
   const nextConfig: NextConfig = {
     images: {
  -    localPatterns: [
  -      {
  -        pathname: '/api/media/file/**',
  -      },
  -    ],
  +    // Semua gambar dikirim Cloudinary (f_auto,q_auto, lebar srcset lewat c_limit). Next tidak
  +    // mengoptimasi ulang, jadi tidak ada /_next/image dan tidak ada biaya Image Optimization Vercel.
  +    loader: 'custom',
  +    loaderFile: './src/modules/media/loader.ts',
     },
     webpack: (webpackConfig) => {
       webpackConfig.resolve.extensionAlias = {
  ```

- [ ] **Langkah 5: Jalankan tes dan pemeriksaan**

  Jalankan:

  ```bash
  npm run test:unit
  npm run typecheck
  npm run lint
  npm run test:int
  ```

  Hasil yang diharapkan: unit `Test Files 16 passed (16)`, `Tests 101 passed (101)`; type check dan lint bersih; integrasi `Tests 32 passed (32)`.

- [ ] **Langkah 6: Periksa srcset hasil build (halaman sementara, tidak di-commit)**

  Buat `src/app/(frontend)/cek-gambar/page.tsx`:

  ```tsx
  import Image from 'next/image'

  import { propsGambar } from '@/modules/media/props'

  export default function CekGambar() {
    const props = propsGambar(
      { publicId: 'point/gambar/contoh-1a2b3c4d', jenis: 'gambar', alt: 'Contoh', width: 2560, height: 1440 },
      'kartu',
      { cloudName: 'demo' },
    )
    return props ? <Image {...props} sizes="(min-width: 1024px) 400px, 100vw" /> : null
  }
  ```

  Jalankan:

  ```bash
  npm run build
  (PORT=3108 npm run start > /tmp/point-lat-start.log 2>&1 &) && sleep 20
  curl -s http://localhost:3108/cek-gambar | grep -o '<img[^>]*>' | head -1
  pkill -f "next start"
  rm -rf "src/app/(frontend)/cek-gambar"
  npm run build
  ```

  Hasil yang diharapkan: tag `<img>` berisi `width="1920" height="1440"`, `loading="lazy"`, dan `srcSet` dengan entri seperti `https://res.cloudinary.com/demo/image/upload/c_fill,g_auto,ar_4:3/c_limit,w_640,f_auto,q_auto/point/gambar/contoh-1a2b3c4d 640w` sampai `... c_limit,w_3840,... 3840w`. Build kedua (setelah halaman dihapus) menyegarkan `.next/types` supaya `npm run typecheck` tidak mencari halaman yang sudah dihapus.

- [ ] **Langkah 7: Commit**

  ```bash
  git add next.config.ts src/modules/media/loader.ts src/modules/media/props.ts tests/unit/media-loader.test.ts
  git commit -m "feat(media): image loader Next.js kustom untuk Cloudinary dan props gambar"
  ```


### Task 7: Skrip `media:siapkan`, env contoh, dan aturan media di CLAUDE.md

**Files:**
- Create: `src/modules/media/siapkan.ts`, `src/scripts/siapkan-media.ts`
- Modify: `package.json` (skrip), `.env.example`, `CLAUDE.md`
- Test: `tests/unit/media-siapkan.test.ts`

**Interfaces:**
- Consumes: `KANVAS_OG` (Task 2), `KlienCloudinary` (Task 3), `klienDariEnv` (Task 4), `klienPalsu` (Task 3).
- Produces: `type HasilSiapkan = { kanvas: 'dibuat' | 'sudah-ada' }`; `siapkanCloudinary(klien): Promise<HasilSiapkan>`; skrip `npm run media:siapkan`.

Kanvas OG diunggah tanpa incoming transformation (`transformation: ''`) supaya tetap 1x1. Skrip menolak jalan tanpa kredensial (klien palsu tidak menyimpan apa pun secara permanen).

- [ ] **Langkah 1: Tulis tes yang gagal**

  `tests/unit/media-siapkan.test.ts`

  ```ts
  import sharp from 'sharp'
  import { describe, expect, it } from 'vitest'

  import { KANVAS_OG } from '@/modules/media/og'
  import { klienPalsu } from '@/modules/media/palsu'
  import { siapkanCloudinary } from '@/modules/media/siapkan'

  describe('siapkanCloudinary', () => {
    it('mengunggah kanvas OG 1x1 putih sekali, lalu melewatinya bila sudah ada', async () => {
      const klien = klienPalsu()
      expect(await siapkanCloudinary(klien)).toEqual({ kanvas: 'dibuat' })

      const kanvas = klien.aset.get(KANVAS_OG)
      expect(kanvas).toMatchObject({ resourceType: 'image', format: 'png', lewat: 'server' })
      expect(kanvas?.opsi.transformation).toBe('')
      const meta = await sharp(kanvas!.isi).metadata()
      expect([meta.width, meta.height]).toEqual([1, 1])

      expect(await siapkanCloudinary(klien)).toEqual({ kanvas: 'sudah-ada' })
      expect(klien.aset.size).toBe(1)
    })
  })
  ```

- [ ] **Langkah 2: Pastikan tes gagal**

  Jalankan:

  ```bash
  npm run test:unit
  ```

  Hasil yang diharapkan: FAIL di `tests/unit/media-siapkan.test.ts` dengan `Cannot find package '@/modules/media/siapkan'`.

- [ ] **Langkah 3: Implementasi**

  `src/modules/media/siapkan.ts`

  ```ts
  import sharp from 'sharp'

  import type { KlienCloudinary } from './klien'
  import { KANVAS_OG } from './og'

  export type HasilSiapkan = { kanvas: 'dibuat' | 'sudah-ada' }

  /**
   * Menyiapkan aset sistem di Cloudinary. Aman dijalankan berkali-kali. Saat ini hanya kanvas
   * PNG 1x1 putih untuk gambar OG (diregangkan dan diwarnai di URL, lihat `og.ts`).
   */
  export async function siapkanCloudinary(klien: KlienCloudinary): Promise<HasilSiapkan> {
    if (await klien.ambil(KANVAS_OG, 'image')) return { kanvas: 'sudah-ada' }
    const buffer = await sharp({
      create: { width: 1, height: 1, channels: 3, background: '#FFFFFF' },
    })
      .png()
      .toBuffer()
    await klien.unggah(
      { buffer, mimeType: 'image/png', width: 1, height: 1 },
      {
        public_id: KANVAS_OG,
        resource_type: 'image',
        overwrite: false,
        transformation: '',
        allowed_formats: 'png',
      },
    )
    return { kanvas: 'dibuat' }
  }
  ```

  `src/scripts/siapkan-media.ts`

  ```ts
  import { klienDariEnv } from '@/modules/media'
  import { siapkanCloudinary } from '@/modules/media/siapkan'

  const klien = klienDariEnv()
  if (klien.cloudName === 'palsu') {
    console.error('Isi CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET di .env dulu.')
    process.exit(1)
  }

  const hasil = await siapkanCloudinary(klien)
  console.log(`Cloudinary siap. Kanvas OG: ${hasil.kanvas}.`)
  process.exit(0)
  ```

  Tambah skrip di `package.json`:

  ```diff
  diff --git a/package.json b/package.json
  index 3fbaf1d..97c7402 100644
  --- a/package.json
  +++ b/package.json
  @@ -17,7 +17,8 @@
       "test:int": "cross-env NODE_OPTIONS=--no-deprecation vitest run --config ./vitest.int.config.mts",
       "test:unit": "vitest run --config ./vitest.unit.config.mts",
       "typecheck": "tsc --noEmit",
  -    "seed": "cross-env NODE_OPTIONS=--no-deprecation payload run src/seed/run.ts"
  +    "seed": "cross-env NODE_OPTIONS=--no-deprecation payload run src/seed/run.ts",
  +    "media:siapkan": "cross-env NODE_OPTIONS=--no-deprecation payload run src/scripts/siapkan-media.ts"
     },
     "dependencies": {
       "@payloadcms/db-postgres": "3.92.1",
  ```

- [ ] **Langkah 4: Dokumentasikan env dan aturan**

  `.env.example` (nilai kosong; jangan pernah menulis kredensial asli di file yang di-commit):

  ```diff
  diff --git a/.env.example b/.env.example
  index 26b57c1..0626438 100644
  --- a/.env.example
  +++ b/.env.example
  @@ -3,3 +3,8 @@ PAYLOAD_SECRET=ganti-dengan-string-acak-minimal-32-karakter
   NEXT_PUBLIC_SITE_URL=http://localhost:3000
   SEED_ADMIN_EMAIL=admin@point.lat
   SEED_ADMIN_PASSWORD=ganti-password-ini
  +# Cloudinary (hanya server). Kosongkan di lokal/tes: aplikasi memakai klien palsu dalam memori.
  +# Wajib diisi di produksi (Vercel). Lalu jalankan sekali: npm run media:siapkan
  +CLOUDINARY_CLOUD_NAME=
  +CLOUDINARY_API_KEY=
  +CLOUDINARY_API_SECRET=
  ```

  `CLAUDE.md`:

  ```diff
  diff --git a/CLAUDE.md b/CLAUDE.md
  index c1cc7bc..804822f 100644
  --- a/CLAUDE.md
  +++ b/CLAUDE.md
  @@ -19,6 +19,7 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Tipe Payload: `npm run generate:types` (jalankan setiap kali field berubah)
   - Import map admin: `npm run generate:importmap` (jalankan setiap kali menambah fitur Lexical atau komponen admin)
   - Data awal: `npm run seed`
  +- Aset sistem Cloudinary (sekali per akun, butuh kredensial): `npm run media:siapkan`
   
   ## Konvensi
   - Nama domain memakai bahasa Indonesia, sama dengan spesifikasi: slug koleksi (`artikel`, `pilar`), nama field (`judul`, `intinya`), nama fungsi modul (`kabari`, `hitung`, `pathFor` adalah pengecualian yang sudah ada).
  @@ -26,11 +27,13 @@ Media edukasi praktis berbahasa Indonesia. Spesifikasi: `docs/superpowers/specs/
   - Logika bisnis ditulis sebagai fungsi murni di `src/lib/` atau `src/modules/` dan diuji unit. Config Payload hanya merangkai.
   - Satu file satu tanggung jawab. Koleksi di `src/collections/`, global di `src/globals/`, blok di `src/blocks/`, field bersama di `src/fields/`, hook di `src/hooks/`, akses di `src/access/`.
   - Path publik selalu dibangun lewat `pathFor()` di `src/lib/paths.ts`, jangan merangkai string URL manual.
  +- URL media selalu lewat `src/modules/media` (`bangunUrl`, `propsGambar`, `urlOg`), jangan merangkai URL Cloudinary manual. `next/image` memakai loader kustom Cloudinary, jadi `src` harus URL dari `bangunUrl`/`propsGambar` dan `width`/`height` wajib diisi.
  +- Media disimpan di Cloudinary (folder `point/gambar`, `point/video`). Tanpa `CLOUDINARY_*` di env (lokal, tes) dipakai klien palsu dalam memori: file tidak tersimpan permanen. Tes tidak boleh memanggil jaringan.
   - Copy UI: bahasa Indonesia, sapaan "kamu", tanpa em dash dan en dash, tanpa tanda seru.
   - Tes unit di `tests/unit/*.test.ts`, tes integrasi di `tests/int/*.int.spec.ts` dan memakai `getTestPayload()` + `unik()` dari `tests/int/helpers.ts`.
   
   ## Batasan
  -- Jangan commit `.env`. `.env.test` boleh di-commit karena hanya untuk database tes lokal.
  +- Jangan commit `.env`. `.env.test` boleh di-commit karena hanya untuk database tes lokal dan tidak boleh berisi `CLOUDINARY_*`.
   - Tanya dulu sebelum menambah dependensi baru di luar rencana.
   - Jalankan `npm run generate:types` lalu `npm run typecheck` setelah mengubah koleksi atau global.
   - Jalankan `npm test` sebelum commit.
  ```

- [ ] **Langkah 5: Jalankan semua pemeriksaan**

  Jalankan:

  ```bash
  npm run typecheck
  npm run lint
  npm run test:unit
  npm run test:int
  npm run build
  env -u CLOUDINARY_CLOUD_NAME -u CLOUDINARY_API_KEY -u CLOUDINARY_API_SECRET npm run media:siapkan; echo "exit $?"
  npm run seed
  ```

  Hasil yang diharapkan: type check dan lint bersih; unit `Test Files 17 passed (17)`, `Tests 102 passed (102)`; integrasi `Test Files 10 passed (10)`, `Tests 32 passed (32)`; build selesai dengan rute `/`, `/admin/[[...segments]]`, `/api/[...slug]`. `media:siapkan` tanpa kredensial mencetak `Isi CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, dan CLOUDINARY_API_SECRET di .env dulu.` dan keluar dengan kode 1. Seed tetap `Seed selesai. Admin: sudah-ada. Pilar: 4. Halaman draf: 6.`

- [ ] **Langkah 6: Commit**

  ```bash
  git add src/modules/media/siapkan.ts src/scripts/siapkan-media.ts package.json .env.example CLAUDE.md tests/unit/media-siapkan.test.ts
  git commit -m "chore(media): skrip media:siapkan, env contoh, dan aturan media di CLAUDE.md"
  ```


### Task 8: Verifikasi langsung dengan akun Cloudinary (BUTUH KREDENSIAL)

> **Task ini hanya dijalankan bila pemilik sudah mengisi kredensial Cloudinary** dan mesinnya bisa menjangkau `api.cloudinary.com` dan `res.cloudinary.com` (Vercel preview atau komputer pemilik). Workspace pengembangan tanpa akses keluar ke Cloudinary melewati task ini; Task 1 sampai 7 tetap selesai dan hijau dengan klien palsu. Jangan menyalin kredensial ke file yang di-commit, ke rencana, atau ke laporan.

**Files:**
- Tidak ada perubahan kode. Bila langkah 4 menemukan Cloudinary menolak eager `sp_auto/m3u8`, perbaiki `EAGER_VIDEO` di `src/modules/media/url.ts` dan tesnya (lihat langkah 4).

**Interfaces:**
- Consumes: `npm run media:siapkan` (Task 7), admin `/admin/collections/media` dengan unggah langsung (Task 5), `bangunUrl`, `urlOg` (Task 1, 2).
- Produces: catatan hasil verifikasi di deskripsi PR atau di log keputusan `claude/point-lat-decisions.md`.

- [ ] **Langkah 1: Isi kredensial dan siapkan aset sistem**

  Isi di `.env` lokal (atau Environment Variables Vercel untuk Preview dan Production): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Lalu jalankan:

  ```bash
  npm run media:siapkan
  npm run media:siapkan
  ```

  Hasil yang diharapkan: baris pertama `Cloudinary siap. Kanvas OG: dibuat.`, baris kedua `Kanvas OG: sudah-ada.`

- [ ] **Langkah 2: Unggah gambar di atas 4,5 MB dari admin**

  Buat gambar uji 6000x4000 (sekitar 19 MB, di bawah batas 20 MB paket Plus; untuk paket Free pakai `quality: 80` supaya di bawah 10 MB tetapi tetap di atas 4,5 MB):

  ```bash
  node -e "require('sharp')({create:{width:6000,height:4000,channels:3,background:'#888',noise:{type:'gaussian',mean:128,sigma:60}}}).jpeg({quality:92}).toFile('/tmp/besar.jpg').then(i=>console.log(i.width,i.height,i.size))"
  npm run dev
  ```

  Di `http://localhost:3000/admin/collections/media/create` (atau URL preview Vercel), unggah `/tmp/besar.jpg`, isi alt, simpan. Di DevTools tab Network periksa:
  - Ada `POST /api/media-cloudinary-tanda-tangan` (200) lalu `POST https://api.cloudinary.com/v1_1/<cloud>/image/upload` (200) yang membawa file; `POST /api/media` hanya membawa JSON kecil (tanpa isi file).

  Hasil yang diharapkan: dokumen tersimpan dengan `publicId` `point/gambar/besar-<8 hex>`, `jenis` gambar, `width` 2560, `height` sekitar 1707 (incoming transformation `c_limit,w_2560,q_auto`; pembulatan Cloudinary bisa 1706), `filesize` jauh lebih kecil dari file asli.

- [ ] **Langkah 3: Periksa URL dan f_auto**

  Ambil `url` dokumen dari `GET /api/media/<id>`, lalu jalankan:

  ```bash
  URL='<url dokumen>'
  curl -sI -H 'Accept: image/avif,image/webp,*/*' "$URL" | grep -i '^content-type'
  curl -sI -H 'Accept: image/webp,*/*' "$URL" | grep -i '^content-type'
  curl -sI -H 'Accept: image/jpeg' "$URL" | grep -i '^content-type'
  curl -sI "${URL/f_auto,q_auto/c_fill,g_auto,ar_4:3\/c_limit,w_640,f_auto,q_auto}" | grep -iE '^(HTTP|content-type)'
  ```

  Hasil yang diharapkan: URL berbentuk `https://res.cloudinary.com/<cloud>/image/upload/f_auto,q_auto/point/gambar/...`; `content-type` berganti sesuai `Accept` (`image/avif`, `image/webp`, `image/jpeg`); varian preset kartu 640px menjawab `HTTP/2 200`.

- [ ] **Langkah 4: Unggah video kecil, periksa poster dan HLS**

  Buat video uji 9:16 berdurasi 10 detik (butuh ffmpeg):

  ```bash
  ffmpeg -f lavfi -i testsrc2=s=1080x1920:d=10:r=30 -c:v libx264 -pix_fmt yuv420p -movflags +faststart /tmp/kecil.mp4
  ```

  Unggah `/tmp/kecil.mp4` lewat admin (alt boleh kosong untuk video), simpan. Tunggu 1 sampai 3 menit (eager async), lalu:

  ```bash
  ID='<publicId dokumen video>'; C='<cloud name>'
  curl -sI "https://res.cloudinary.com/$C/video/upload/so_auto/q_auto/$ID.jpg" | grep -iE '^(HTTP|content-type)'
  curl -s "https://res.cloudinary.com/$C/video/upload/sp_auto/$ID.m3u8" | head -20
  curl -sI "https://res.cloudinary.com/$C/video/upload/q_auto/$ID.mp4" | grep -iE '^(HTTP|content-type)'
  ```

  Hasil yang diharapkan: dokumen berisi `jenis` video, `durasi` sekitar 10, `width` 1080, `height` 1920. Poster `HTTP/2 200` dengan `content-type: image/jpeg`; manifest dimulai `#EXTM3U` dan berisi beberapa `#EXT-X-STREAM-INF` dengan `RESOLUTION` tertinggi `1080x1920`; MP4 `HTTP/2 200` dengan `content-type: video/mp4`. Di Media Library Cloudinary, aset video menampilkan turunan eager (m3u8, jpg, mp4).

  Bila Cloudinary menolak unggahan karena eager `sp_auto/m3u8` (pesan galat di dialog unggah menyebut `sp_auto` atau `streaming profile`): ganti `EAGER_VIDEO` di `src/modules/media/url.ts` menjadi turunan `sp_full_hd/m3u8` (profil manual, contoh eager resmi di dokumentasi adaptive streaming), perbarui tes `EAGER_VIDEO` dan `parameterTandaTangan` di `tests/unit/media-url.test.ts`, `tests/unit/media-unggah.test.ts`, `tests/unit/media-adapter.test.ts`, `tests/int/media.int.spec.ts`, `tests/int/media-langsung.int.spec.ts`, jalankan `npm test`, commit `fix(media): eager HLS memakai profil full_hd`, dan catat di log keputusan. URL pengiriman `sp_auto/<id>.m3u8` tetap.

- [ ] **Langkah 5: Periksa gambar OG**

  ```bash
  URL=$(CLOUDINARY_CLOUD_NAME='<cloud name>' npx tsx -e "import { urlOg } from './src/modules/media/og'; console.log(urlOg(process.env.CLOUDINARY_CLOUD_NAME ?? '', { judul: 'Cara hitung gaji bersih 2026', warna: 'hijau' }))")
  echo "$URL"
  curl -s -o /tmp/og.png -w "%{http_code} %{content_type}\n" "$URL"
  node -e "require('sharp')('/tmp/og.png').metadata().then(m=>console.log(m.width,m.height))"
  ```

  Buka `/tmp/og.png`. Hasil yang diharapkan: `200 image/png`, ukuran `1200 630`, latar hijau #1F7A4D, judul putih Archivo tebal di kiri atas, `point.` di kiri bawah. Ulangi dengan `warna: 'kuning'` (teks #111111). Bila judul tampil dengan font cadangan atau URL menjawab 400 dengan header `x-cld-error` yang menyebut font, pakai fallback di tabel Keputusan teknis (unggah Archivo sebagai raw authenticated) dan catat.

- [ ] **Langkah 6: Hapus dan catat hasil**

  Hapus kedua dokumen uji di admin. Hasil yang diharapkan: aset `point/gambar/besar-...` dan `point/video/kecil-...` hilang dari Media Library Cloudinary (adapter `handleDelete`). Catat hasil langkah 1 sampai 6 (lulus/gagal, ukuran, waktu tunggu HLS) di `claude/point-lat-decisions.md`.

---

## Selesai bila

- `npm test` lulus (102 unit, 32 integrasi), `npm run typecheck` dan `npm run lint` bersih, `npm run build` berhasil, semuanya tanpa kredensial Cloudinary dan tanpa akses jaringan ke Cloudinary.
- Koleksi `media` menyimpan file lewat adapter Cloudinary (`disableLocalStorage: true`); folder `media/` lokal tidak bertambah; field `url` berisi URL `https://res.cloudinary.com/...`.
- Admin mengunggah langsung dari browser ke Cloudinary lewat endpoint tanda tangan; receipt yang dipalsukan dan file yang tidak pernah sampai ditolak.
- Skema database hanya bertambah (`public_id`, `jenis`, `durasi`, `_objectkey`).
- Task 8 dijalankan dan dicatat begitu kredensial dan akses jaringan tersedia.

## Risiko dan pertanyaan terbuka

| Risiko | Mitigasi |
|---|---|
| Eager `sp_auto/m3u8` belum terbukti diterima Cloudinary (dokumentasi hanya memberi contoh eager untuk profil bernama) | Task 8 langkah 4 menguji; fallback `sp_full_hd/m3u8` sudah dirinci. URL pengiriman `sp_auto` tetap bekerja on the fly. |
| Archivo lewat `@google` dirender dengan lebar normal, bukan wdth 68/80 seperti situs | Diterima untuk OG; bila perlu identik, unggah varian Archivo statis (mis. Archivo ExtraCondensed Black) sebagai raw authenticated. |
| Batas paket Free (gambar 10 MB, video 100 MB, transformasi video 40 MB) | Pesan galat Cloudinary tampil di dialog unggah. Video > 40 MB di paket Free tidak bisa ditranskode sinkron; eager async sudah dipakai. Pertimbangkan paket Plus sebelum pipeline video Fase 2. |
| Aset yatim bila editor membatalkan setelah file terkirim ke Cloudinary tetapi sebelum dokumen tersimpan | Diterima untuk MVP (biaya penyimpanan kecil). Pembersihan berkala berdasarkan `public_id` yang tidak ada di tabel `media` bisa ditambah di Rencana 6 (job runner). |
| Tidak ada tombol "ulangi" khusus di dialog unggah (spesifikasi §15) | Form Payload mempertahankan file dan isian; editor menekan simpan lagi. Pesan galat menyebut langkahnya. Komponen dialog khusus bisa ditambah bila pemilik menginginkannya. |
| `payload/internal` (receipt, assert) bukan API publik dan bisa berubah tanpa major version | Versi Payload dikunci 3.92.1. Saat upgrade, jalankan `tests/int/media-langsung.int.spec.ts` lebih dulu; tes itu memeriksa jalur receipt end to end. |
| Klien palsu dipakai diam-diam di Preview Vercel bila env lupa diisi | Di `NODE_ENV=production` tanpa kredensial aplikasi menolak jalan (kecuali saat build). Task 8 langkah 1 memastikan env terisi. |

## Sumber riset

- Payload storage adapters: https://payloadcms.com/docs/v3/upload/storage-adapters
- Sumber `@payloadcms/plugin-cloud-storage@3.92.1`, `@payloadcms/storage-s3@3.92.1`, `@payloadcms/storage-vercel-blob@3.92.1`, `@payloadcms/storage-uploadthing@3.92.1`, `payload@3.92.1` (registry npm; repo https://github.com/payloadcms/payload tag v3.92.1)
- Plugin komunitas yang dinilai: `@jhb.software/payload-cloudinary-plugin@0.5.0` (https://github.com/jhb-software/payload-plugins)
- Tanda tangan Upload API: https://cloudinary.com/documentation/authentication_signatures
- Unggah dari browser: https://cloudinary.com/documentation/client_side_uploading
- Unggah dan chunk > 100 MB: https://cloudinary.com/documentation/upload_images
- Upload preset dan prioritas parameter: https://cloudinary.com/documentation/upload_presets
- Incoming dan eager transformation: https://cloudinary.com/documentation/eager_and_incoming_transformations
- Parameter `async` dan `eager_async`: https://cloudinary.com/documentation/upload_parameters_processing
- Adaptive bitrate streaming dan `sp_auto`: https://cloudinary.com/documentation/adaptive_bitrate_streaming
- Poster dan `so_auto`: https://cloudinary.com/documentation/video_previews_and_posters
- Bitrate `br_`, `q_auto` video: https://cloudinary.com/documentation/video_optimization
- Transformasi video dan batas durasi on the fly: https://cloudinary.com/documentation/video_manipulation_and_delivery
- Text overlay dan font: https://cloudinary.com/documentation/image_text_layers, https://cloudinary.com/documentation/video_text_layers, https://cloudinary.com/documentation/image_text_layer_fonts, https://cloudinary.com/documentation/image_text_layer_advanced_options
- Mode folder (dynamic folders): https://cloudinary.com/documentation/folder_modes
- Batas paket: https://cloudinary.com/documentation/pricing
- Next.js image loader kustom: konfigurasi `images.loader`/`loaderFile` (diperiksa di `next@16.3.3` `get-img-props.js`)

Rencana berikutnya: **Rencana 3 (Modul SEO inti)**, memakai `urlOg` dan `propsGambar` dari rencana ini.
