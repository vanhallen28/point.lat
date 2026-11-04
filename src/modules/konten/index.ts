/**
 * Modul konten publik: data siap render untuk halaman situs (Rencana 4).
 *
 * - `muat*()` dipanggil halaman dan layout: query Payload yang di-cache dengan tag `TAG`.
 * - `ambil*(payload)` versi tanpa cache untuk tes integrasi dan skrip.
 * - Fungsi murni (`susunHeader`, `susunArtikel`, `tanggalIndonesia`, ...) menerjemahkan dokumen
 *   Payload ke tipe di `tipe.ts`, supaya komponen tidak membaca relasi Payload mentah.
 */
export { muatArtikel, muatFooter, muatGlosarium, muatHeader, muatSitus, TAG_ARTIKEL } from './cache'
export { ambilArtikel, ambilFooter, ambilGlosarium, ambilHeader } from './data'
export { kelompokkanIstilah } from './glosarium'
export { HAK_CIPTA_BAWAAN, LABEL_SOSIAL, susunFooter, susunHeader, tautanInternal, TOOLS_BAWAAN } from './tampilan'
export {
  gabungTerkait,
  kartuArtikel,
  KATA_PER_MENIT,
  MAKS_TERKAIT,
  mediaTampil,
  MIN_DAFTAR_ISI,
  penulisRingkas,
  pilarRingkas,
  susunArtikel,
  tandaiSubjudul,
  tanggalIndonesia,
  waktuBaca,
} from './artikel'
export type * from './tipe'
