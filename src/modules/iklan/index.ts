/**
 * Modul iklan dan persetujuan cookie (spesifikasi §5 dan §11): antarmuka kecil, isi dalam.
 *
 * - `muatIklan()` pengaturan dari global `iklan` (cache bertag `iklan`); `ambilIklan(payload)` tanpa cache.
 * - `pilihSlot(pengaturan, posisi, id?)` satu-satunya aturan apakah slot tampil; `sisipkanIklanTengah`
 *   menaruh iklan tengah artikel setelah paragraf ke-N; `isiAdsTxt` dan `muatAdsTxt()` untuk `/ads.txt`.
 * - Persetujuan dibaca di browser (`persetujuan.ts`): skrip awal di `<head>` menolak semua sinyal Consent
 *   Mode v2 dan menandai `<html data-persetujuan>`; halaman publik tetap ISR.
 * - Kode penyedia (AdSense) hanya di `adsense.ts`; tes memotong permintaan ke domainnya.
 */
export { muatAdsTxt, muatIklan } from './cache'
export { ambilIklan, kebijakanPrivasiTerbit, susunPengaturan } from './data'
export { iklanSiap, isiAdsTxt, pilihSlot, sisipkanIklanTengah, SLUG_KEBIJAKAN_PRIVASI } from './aturan'
export type { PengaturanIklan, PosisiIklan, SlotSiap } from './tipe'
