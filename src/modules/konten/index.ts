/**
 * Modul konten publik: data siap render untuk halaman situs (Rencana 4).
 *
 * - `muat*()` dipanggil halaman dan layout: query Payload yang di-cache dengan tag `TAG`.
 * - `ambil*(payload)` versi tanpa cache untuk tes integrasi dan skrip.
 * - `muatJalur(jalur)` untuk rute catch-all: artikel, rubrik pilar dan subkategori, halaman statis.
 * - `tanganiTidakAda(path)` untuk path tanpa dokumen: redirect 301 dari CMS atau 404.
 * - Fungsi murni (`susunHeader`, `susunArtikel`, `tanggalIndonesia`, ...) menerjemahkan dokumen
 *   Payload ke tipe di `tipe.ts`, supaya komponen tidak membaca relasi Payload mentah.
 */
export {
  muatArtikel,
  muatFooter,
  muatGlosarium,
  muatHalaman,
  muatHeader,
  muatRedirect,
  muatRubrik,
  muatSitus,
  muatTerbaru,
  TAG_ARTIKEL,
} from './cache'
export { ambilArtikel, ambilFooter, ambilGlosarium, ambilHalaman, ambilHeader, ambilRubrik, ambilTerbaru, cariRedirect } from './data'
export { JUDUL_FAQ, susunHalaman } from './halaman'
export { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
export { muatJalur, type HasilJalur } from './jalur'
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
