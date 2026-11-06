/**
 * Modul konten publik: data siap render untuk halaman situs (Rencana 4).
 *
 * - `muat*()` dipanggil halaman dan layout: query Payload yang di-cache dengan tag `TAG`.
 * - `ambil*(payload)` versi tanpa cache untuk tes integrasi dan skrip.
 * - `muatJalur(jalur)` untuk rute catch-all: artikel, rubrik pilar dan subkategori, halaman statis.
 * - `susunPaginasi`, `pisahHalaman`, `bacaNomor`: paginasi berbasis path (`{path}/halaman/{n}`) untuk daftar kartu.
 * - `tanganiTidakAda(path)` untuk path tanpa dokumen: redirect 301 dari CMS atau 404.
 * - Fungsi murni (`susunHeader`, `susunArtikel`, `tanggalIndonesia`, ...) menerjemahkan dokumen
 *   Payload ke tipe di `tipe.ts`, supaya komponen tidak membaca relasi Payload mentah.
 */
export {
  muatArtikel,
  muatBeranda,
  muatCari,
  muatDaftarVideo,
  muatFooter,
  muatGlosarium,
  muatHalaman,
  muatHeader,
  muatPenulis,
  muatPopuler,
  muatRedirect,
  muatRubrik,
  muatSitus,
  muatTakarir,
  muatTerbaru,
  muatTool,
  muatTools,
  muatVideo,
  TAG_ARTIKEL,
} from './cache'
export {
  ambilArtikel,
  ambilBeranda,
  ambilDaftarVideo,
  ambilFooter,
  ambilGlosarium,
  ambilHalaman,
  ambilHeader,
  ambilPenulis,
  ambilPopuler,
  ambilRubrik,
  ambilTakarir,
  ambilTerbaru,
  ambilTool,
  ambilTools,
  ambilVideo,
  cariArtikel,
  cariRedirect,
} from './data'
export { kataKueri, MAKS_HASIL_CARI, MAKS_KATA, MAKS_KUERI, rapikanKueri, urutkanHasil } from './cari'
export {
  daftarPopuler,
  HERO_BAWAAN,
  JUDUL_POPULER,
  JUDUL_TERBARU,
  JUDUL_VIDEO_BAWAAN,
  JUMLAH_TERBARU_BAWAAN,
  MAKS_TERBARU_BERANDA,
  MAKS_VIDEO_BERANDA,
  susunBeranda,
  susunNewsletter,
  type DaftarPopuler,
  type SumberBeranda,
} from './beranda'
export { itemTools, kelompokkanTools, parameterTersimpan, susunKalkulator, susunTool } from './tools'
export { kartuVideo, labelDurasi, MAKS_VIDEO_INDEKS, MAKS_VIDEO_LAIN, pathTakarir, susunVideo } from './video'
export { MAKS_ARTIKEL_PENULIS, susunPenulis } from './penulis'
export { JUDUL_FAQ, susunHalaman } from './halaman'
export { MAKS_ARTIKEL_RUBRIK, susunRubrik } from './rubrik'
export { bacaNomor, pisahHalaman, susunPaginasi, UKURAN_HALAMAN, type Paginasi, type SegmenBerhalaman, type TautanHalaman } from './paginasi'
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
