import { artikelGajiBersih } from './artikel/gaji-bersih'
import { artikelIpk } from './artikel/ipk'
import { artikelKipKuliah } from './artikel/kip-kuliah'
import { artikelKpr } from './artikel/kpr'
import { artikelLembur } from './artikel/lembur'
import { artikelPotonganBpjs } from './artikel/potongan-bpjs'
import { artikelPph21Ter } from './artikel/pph-21-ter'
import { artikelPtkp } from './artikel/ptkp'
import { artikelSnbp } from './artikel/snbp'
import { artikelSptCoretax } from './artikel/spt-coretax'
import { artikelThr } from './artikel/thr'
import { artikelUtbkSnbt } from './artikel/utbk-snbt'
import type { ArtikelPaket } from './tipe'

/**
 * Paket konten awal (v1.3.0, spesifikasi §24): 12 artikel pilar Uang & Karier dan Belajar di sekitar enam
 * kalkulator dan musim pencarian (THR Lebaran 2027, SPT Tahunan, SNBP dan UTBK 2027). Fakta dan angka
 * diperiksa 10 November 2026; contoh hitung sama dengan hasil kalkulator pada tanggal itu.
 */
export const PAKET_AWAL: ArtikelPaket[] = [
  artikelGajiBersih,
  artikelPph21Ter,
  artikelPtkp,
  artikelPotonganBpjs,
  artikelThr,
  artikelLembur,
  artikelSptCoretax,
  artikelKpr,
  artikelIpk,
  artikelSnbp,
  artikelUtbkSnbt,
  artikelKipKuliah,
]

/** Nama paket yang tampil di beranda admin. */
export const NAMA_PAKET = 'Paket konten awal'

/** Pilihan redaksi untuk blok mozaik beranda (urutan pertama tampil paling besar). */
export const MOZAIK_PAKET = ['cara-menghitung-gaji-bersih', 'cara-menghitung-thr', 'cara-lapor-spt-tahunan-coretax', 'snbp-2027', 'cara-menghitung-ipk']
