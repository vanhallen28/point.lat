import type { Paginasi as DataPaginasi } from '@/modules/konten/paginasi'

import { Ikon } from './Ikon'
import gaya from './Paginasi.module.css'
import { Tautan } from './Tautan'

/**
 * Navigasi halaman daftar tulisan (rubrik dan profil penulis): posisi halaman, "Sebelumnya" dan
 * "Berikutnya", lalu nomor halaman, dalam urutan yang sama di semua lebar layar (di layar sempit nomor turun
 * ke baris kedua). Semua tautan `<a href>` biasa supaya mesin pencari bisa menelusuri setiap halaman
 * (panduan paginasi Google); halaman yang sedang dibuka ditandai `aria-current`, nomor dibacakan
 * "Halaman 2", dan setiap tautan setinggi target sentuh 44 px. Tidak dirender bila daftar hanya satu halaman.
 */
export function Paginasi({ paginasi, label = 'Halaman tulisan' }: { paginasi: DataPaginasi; label?: string }) {
  if (paginasi.jumlah < 2) return null
  return (
    <nav aria-label={label} className={gaya.paginasi}>
      <p className={gaya.posisi}>
        Halaman {paginasi.nomor} dari {paginasi.jumlah}
      </p>
      <div className={gaya.baris}>
        <ul className={gaya.arah}>
          {paginasi.sebelumnya && (
            <li>
              <Tautan href={paginasi.sebelumnya} rel="prev" className={gaya.tombol}>
                <Ikon nama="chevron-left" ukuran={18} />
                Sebelumnya
              </Tautan>
            </li>
          )}
          {paginasi.berikutnya && (
            <li>
              <Tautan href={paginasi.berikutnya} rel="next" className={gaya.tombol}>
                Berikutnya
                <Ikon nama="chevron-right" ukuran={18} />
              </Tautan>
            </li>
          )}
        </ul>
        <ul className={gaya.nomor}>
          {paginasi.halaman.map((h, i) =>
            h ? (
              <li key={h.nomor}>
                <Tautan href={h.href} aria-current={h.aktif ? 'page' : undefined} className={gaya.tombol}>
                  <span className="sr">Halaman </span>
                  {h.nomor}
                </Tautan>
              </li>
            ) : (
              <li key={`jeda-${i}`} aria-hidden="true" className={gaya.jeda}>
                {'\u2026'}
              </li>
            ),
          )}
        </ul>
      </div>
    </nav>
  )
}
