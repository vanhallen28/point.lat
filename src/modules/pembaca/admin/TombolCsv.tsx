import { PATH_PEMBACA } from '../endpoint'

import './pembaca.scss'

/**
 * Tombol "Unduh CSV" di atas daftar Pelanggan newsletter (`admin.components.beforeListTable`). Tautan biasa ke
 * endpoint CSV (hanya admin), jadi browser langsung menyimpan file tanpa JavaScript.
 */
export function TombolCsv() {
  return (
    <div className="pembaca-csv">
      <a className="pembaca-csv__tombol" href={`/api/pelanggan-newsletter${PATH_PEMBACA.csv}`} download>
        Unduh CSV
      </a>
      <p>Berisi email, halaman tempat mendaftar, dan tanggal daftar. Impor ke penyedia email untuk mengirim newsletter.</p>
    </div>
  )
}
