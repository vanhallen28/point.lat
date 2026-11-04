import { RemahRoti } from '@/components/dasar/RemahRoti'
import { DaftarKartu } from '@/components/kartu/KartuArtikel'
import type { KartuArtikel } from '@/modules/konten/tipe'
import { remahRoti } from '@/modules/seo/jsonld'
import type { MasukanSeo } from '@/modules/seo/tipe'

import gaya from './Cari.module.css'
import { FormCari } from './FormCari'

export const JUDUL_CARI = 'Cari'
export const DESKRIPSI_CARI = 'Cari panduan, explainer, dan istilah di point.'

/**
 * `/cari` (noindex): form berisi kueri, lalu jumlah hasil dan kartunya. Tanpa kueri ada contoh topik;
 * tanpa hasil ada saran memperluas kata kunci.
 */
export function HalamanCari({ kueri, hasil, masukan }: { kueri: string; hasil: KartuArtikel[]; masukan: MasukanSeo }) {
  return (
    <div className={`kontainer ${gaya.halaman}`}>
      <header className={gaya.kepala}>
        <RemahRoti remah={remahRoti(masukan)} />
        <h1 className={gaya.judul}>{JUDUL_CARI}</h1>
        <FormCari nilai={kueri} />
      </header>
      {kueri ? (
        <section aria-labelledby="hasil-cari" className={gaya.hasil}>
          <h2 id="hasil-cari" className={gaya.status}>
            {hasil.length > 0 ? `${hasil.length} tulisan untuk “${kueri}”` : `Tidak ada tulisan untuk “${kueri}”`}
          </h2>
          {hasil.length > 0 ? (
            <DaftarKartu kartu={hasil} />
          ) : (
            <p className={gaya.petunjuk}>Coba kata yang lebih umum atau periksa ejaannya. Kamu juga bisa membuka rubrik di bagian atas halaman.</p>
          )}
        </section>
      ) : (
        <p className={gaya.petunjuk}>Ketik topik yang ingin kamu pahami, misalnya gaji bersih, BPJS, atau beasiswa.</p>
      )}
    </div>
  )
}
