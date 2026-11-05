import { FormCari } from '@/components/cari/FormCari'
import { Ikon } from '@/components/dasar/Ikon'
import { Tautan } from '@/components/dasar/Tautan'
import { DaftarKartu } from '@/components/kartu/KartuArtikel'
import type { DaftarPopuler } from '@/modules/konten/beranda'

import { Catat404 } from './Catat404'
import gaya from './TidakDitemukan.module.css'

/**
 * Isi halaman 404 (spesifikasi §15): penjelasan singkat, pencarian, jalan kembali, dan artikel populer
 * (paling banyak dibaca pekan ini, atau tulisan terbaru selama data klik belum cukup).
 */
export function TidakDitemukan({ daftar }: { daftar: DaftarPopuler }) {
  return (
    <div className={`kontainer ${gaya.halaman}`}>
      <p className={gaya.kode}>Galat 404</p>
      <h1 className={gaya.judul}>Halaman ini tidak ada.</h1>
      <p className={gaya.teks}>
        Mungkin tautannya salah ketik, atau tulisannya sudah pindah alamat. Cari topiknya, mulai lagi dari beranda, atau pilih
        salah satu tulisan di bawah.
      </p>
      <FormCari />
      <Tautan href="/" className={gaya.tombol}>
        Kembali ke beranda
        <Ikon nama="arrow-right" />
      </Tautan>
      {daftar.artikel.length > 0 && (
        <section aria-labelledby="daftar-tulisan" className={gaya.terbaru}>
          <h2 id="daftar-tulisan" className={gaya.subjudul}>
            {daftar.judul}
          </h2>
          <DaftarKartu kartu={daftar.artikel} />
        </section>
      )}
      <Catat404 />
    </div>
  )
}
