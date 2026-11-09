import { butuhPersetujuan, cocokKuki } from '@/modules/sematan/aturan'
import { ID_DATA_SEMATAN, type KodeTerpasang } from '@/modules/sematan/tipe'

import {
  ATRIBUT_PANEL,
  ATRIBUT_PERSETUJUAN,
  hapusKuki,
  KUKI_IKLAN_SITUS,
  sinyalPersetujuan,
  tulisKuki,
  versiPersetujuan,
  type PilihanPersetujuan,
} from './persetujuan'

/**
 * Bagian persetujuan yang berjalan di browser: menyimpan pilihan, mengirim sinyal Consent Mode, dan memberi
 * tahu pemuat iklan. Hanya dipanggil komponen klien setelah pengunjung menekan tombol.
 */

/** Peristiwa di `window` setelah pengunjung memilih; `PemuatIklan` mendengarkannya. */
export const PERISTIWA_PERSETUJUAN = 'persetujuan'

/** `gtag()` standar: perintah masuk `dataLayer` sebagai objek `arguments` (bentuk yang dibaca tag Google). */
function gtag(..._perintah: unknown[]): void {
  const w = window as unknown as { dataLayer?: unknown[] }
  w.dataLayer = w.dataLayer ?? []
  // eslint-disable-next-line prefer-rest-params
  w.dataLayer.push(arguments)
}

/** Kode sematan di halaman ini (data JSON yang dirender layout), atau daftar kosong. */
function kodeDiHalaman(): KodeTerpasang[] {
  try {
    return JSON.parse(document.getElementById(ID_DATA_SEMATAN)?.textContent || '[]') as KodeTerpasang[]
  } catch {
    return []
  }
}

/** Nama cookie di `document.cookie` yang cocok dengan salah satu pola (nama persis atau awalan `*`). */
function kukiCocok(pola: readonly string[]): string[] {
  const ada = document.cookie.split(';').map((c) => c.split('=')[0].trim()).filter(Boolean)
  return ada.filter((nama) => pola.some((p) => cocokKuki(nama, p)))
}

/**
 * Menyimpan pilihan: cookie pihak pertama (12 bulan), `gtag('consent', 'update', ...)`, dan atribut
 * `<html data-persetujuan>` (CSS menyembunyikan banner dan menampilkan atau menyembunyikan slot iklan).
 * Menarik persetujuan (dari Izinkan semua ke Hanya yang perlu) menghapus cookie iklan dan cookie yang didaftarkan
 * di Kode sematan (spesifikasi §23) di domain situs, lalu memuat ulang halaman, supaya skrip iklan dan analitik
 * yang sudah berjalan berhenti (UU PDP Pasal 40).
 */
export function simpanPilihan(pilihan: PilihanPersetujuan, sekarang = new Date()): void {
  const html = document.documentElement
  const sebelumnya = html.getAttribute(ATRIBUT_PERSETUJUAN)
  const kode = kodeDiHalaman()
  const analitik = butuhPersetujuan(kode)
  document.cookie = tulisKuki(pilihan, sekarang, location.protocol === 'https:', versiPersetujuan(analitik))
  gtag('consent', 'update', sinyalPersetujuan(pilihan, analitik))
  html.setAttribute(ATRIBUT_PERSETUJUAN, pilihan)
  html.removeAttribute(ATRIBUT_PANEL)
  if (sebelumnya === 'semua' && pilihan === 'perlu') {
    const sematan = kode.filter((k) => k.jenis === 'persetujuan').flatMap((k) => k.kuki)
    for (const nama of [...KUKI_IKLAN_SITUS, ...kukiCocok(sematan)]) {
      document.cookie = hapusKuki(nama)
      document.cookie = `${hapusKuki(nama)}; Domain=${location.hostname}`
    }
    location.reload()
    return
  }
  window.dispatchEvent(new Event(PERISTIWA_PERSETUJUAN))
}
