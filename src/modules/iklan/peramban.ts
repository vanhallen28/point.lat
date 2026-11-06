import { ATRIBUT_PANEL, ATRIBUT_PERSETUJUAN, hapusKuki, KUKI_IKLAN_SITUS, sinyalPersetujuan, tulisKuki, type PilihanPersetujuan } from './persetujuan'

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

/**
 * Menyimpan pilihan: cookie pihak pertama (12 bulan), `gtag('consent', 'update', ...)`, dan atribut
 * `<html data-persetujuan>` (CSS menyembunyikan banner dan menampilkan atau menyembunyikan slot iklan).
 * Menarik persetujuan (dari Izinkan semua ke Hanya yang perlu) menghapus cookie iklan di domain situs lalu
 * memuat ulang halaman, supaya skrip iklan yang sudah berjalan berhenti (UU PDP Pasal 40).
 */
export function simpanPilihan(pilihan: PilihanPersetujuan, sekarang = new Date()): void {
  const html = document.documentElement
  const sebelumnya = html.getAttribute(ATRIBUT_PERSETUJUAN)
  document.cookie = tulisKuki(pilihan, sekarang, location.protocol === 'https:')
  gtag('consent', 'update', sinyalPersetujuan(pilihan))
  html.setAttribute(ATRIBUT_PERSETUJUAN, pilihan)
  html.removeAttribute(ATRIBUT_PANEL)
  if (sebelumnya === 'semua' && pilihan === 'perlu') {
    for (const nama of KUKI_IKLAN_SITUS) {
      document.cookie = hapusKuki(nama)
      document.cookie = `${hapusKuki(nama)}; Domain=${location.hostname}`
    }
    location.reload()
    return
  }
  window.dispatchEvent(new Event(PERISTIWA_PERSETUJUAN))
}
