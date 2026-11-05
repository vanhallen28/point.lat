/**
 * Modul asisten AI (spesifikasi §5 dan §10): antarmuka kecil, isi dalam.
 *
 * - `jalankan(payload, tugas, masukan, opsi)` satu-satunya pintu ke Claude untuk brief, draf per bagian,
 *   dan generator meta: anggaran, batas per menit, log, prompt, dan pemeriksaan jawaban ada di dalamnya.
 *   Dipanggil endpoint `POST /api/artikel/asisten`; status untuk sidebar di `GET /api/artikel/asisten`.
 * - `periksaPola(blok)` dan `periksaKlaim(blok, sumber)` fungsi murni tanpa API (cek pola tulisan AI dan
 *   cek klaim), dipakai langsung di browser lewat `blokArtikel(isian)`.
 * - Adapter dipilih env `AI_ADAPTER` (`asli` lewat `fetch` dengan `ANTHROPIC_API_KEY`, `palsu` dalam
 *   memori). Tes memakai `adapterPalsu()` + `pakaiAdapterAi()` dan opsi `sekarang`.
 *
 * Komponen admin mengimpor `pola.ts`, `klaim.ts`, dan `teks.ts` langsung (aman untuk browser).
 */
export { jalankan } from './jalankan'
export type { AlasanGagal, HasilJalankan, OpsiJalankan, PenggunaAi } from './jalankan'
export { adapterAi, adapterDariEnv, pakaiAdapterAi } from './adapter'
export type { AdapterAi, JawabanClaude, KeadaanAdapter, PermintaanClaude } from './adapter'
export { adapterPalsu, PEMICU_GALAT_PALSU } from './palsu'
export type { AdapterAiPalsu } from './palsu'
export { statusAsisten } from './status'
export type { StatusAsisten } from './status'
export { endpointAsisten, endpointStatusAsisten, PATH_ASISTEN } from './endpoint'
export * from './tipe'
