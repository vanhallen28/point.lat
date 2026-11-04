/**
 * Modul konten publik: data siap render untuk halaman situs (Rencana 4).
 *
 * - `muat*()` dipanggil halaman dan layout: query Payload yang di-cache dengan tag `TAG`.
 * - `ambil*(payload)` versi tanpa cache untuk tes integrasi dan skrip.
 * - `tanganiTidakAda(path)` untuk path tanpa dokumen: redirect 301 dari CMS atau 404.
 * - Fungsi murni (`susunHeader`, `susunArtikel`, `tanggalIndonesia`, ...) menerjemahkan dokumen
 *   Payload ke tipe di `tipe.ts`, supaya komponen tidak membaca relasi Payload mentah.
 */
export { muatArtikel, muatFooter, muatGlosarium, muatHeader, muatRedirect, muatSitus, muatTerbaru, TAG_ARTIKEL } from './cache'
export { ambilArtikel, ambilFooter, ambilGlosarium, ambilHeader, ambilTerbaru, cariRedirect } from './data'
export { tanganiTidakAda } from './navigasi'
export { pathDariSegmen, tujuanRedirect } from './redirect'
export { catat404, rapikanLog404 } from './log404'
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
