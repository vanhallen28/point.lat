/**
 * Modul konten publik: data siap render untuk halaman situs (Rencana 4).
 *
 * - `muat*()` dipanggil halaman dan layout: query Payload yang di-cache dengan tag `TAG`.
 * - `ambil*(payload)` versi tanpa cache untuk tes integrasi dan skrip.
 * - Fungsi murni (`susunHeader`, `susunFooter`, ...) menerjemahkan dokumen Payload ke tipe di `tipe.ts`.
 */
export { muatFooter, muatHeader } from './cache'
export { ambilFooter, ambilHeader } from './data'
export { HAK_CIPTA_BAWAAN, LABEL_SOSIAL, susunFooter, susunHeader, tautanInternal, TOOLS_BAWAAN } from './tampilan'
export type * from './tipe'
