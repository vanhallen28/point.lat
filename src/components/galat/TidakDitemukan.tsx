import { FormCari } from '@/components/cari/FormCari'
import { Ikon } from '@/components/dasar/Ikon'
import { Tautan } from '@/components/dasar/Tautan'
import { DaftarKartu } from '@/components/kartu/KartuArtikel'
import type { KartuArtikel } from '@/modules/konten/tipe'

import { Catat404 } from './Catat404'
import gaya from './TidakDitemukan.module.css'

/** Isi halaman 404 (spesifikasi §15): penjelasan singkat, pencarian, jalan kembali, dan tulisan terbaru. */
export function TidakDitemukan({ terbaru }: { terbaru: KartuArtikel[] }) {
  return (
    <div className={`kontainer ${gaya.halaman}`}>
      <p className={gaya.kode}>Galat 404</p>
      <h1 className={gaya.judul}>Halaman ini tidak ada.</h1>
      <p className={gaya.teks}>
        Mungkin tautannya salah ketik, atau tulisannya sudah pindah alamat. Cari topiknya, mulai lagi dari beranda, atau baca
        tulisan terbaru di bawah.
      </p>
      <FormCari />
      <Tautan href="/" className={gaya.tombol}>
        Kembali ke beranda
        <Ikon nama="arrow-right" />
      </Tautan>
      {terbaru.length > 0 && (
        <section aria-labelledby="terbaru" className={gaya.terbaru}>
          <h2 id="terbaru" className={gaya.subjudul}>
            Tulisan terbaru
          </h2>
          <DaftarKartu kartu={terbaru} />
        </section>
      )}
      <Catat404 />
    </div>
  )
}
