import { Ikon } from '@/components/dasar/Ikon'
import { Tautan } from '@/components/dasar/Tautan'
import { KartuArtikel } from '@/components/kartu/KartuArtikel'
import type { BagianBeranda } from '@/modules/konten/tipe'

import gaya from './Beranda.module.css'

/**
 * Blok Baris rubrik (spesifikasi §25): satu bagian per pilar dengan judul bertitik warna pilar, tautan ke rubriknya,
 * dan kartu bergambar tulisan terbarunya. Pilar tanpa tulisan sudah dilewati `susunBarisRubrik`.
 */
export function RubrikBeranda({ rubrik }: { rubrik: Extract<BagianBeranda, { jenis: 'rubrik' }> }) {
  return (
    <div className={`kontainer ${gaya.bagian} ${gaya.rubrik}`}>
      {rubrik.baris.map(({ pilar, artikel }) => {
        const idJudul = `${rubrik.id}-${pilar.slug}`
        return (
          <section key={pilar.slug} aria-labelledby={idJudul} className={gaya.rubrikBaris} data-warna={pilar.warna}>
            <div className={gaya.rubrikKepala}>
              <h2 id={idJudul} className={gaya.rubrikJudul}>
                <span className={gaya.rubrikTitik} aria-hidden="true" />
                {pilar.nama}
              </h2>
              <Tautan href={pilar.href} className={gaya.semua}>
                Semua tulisan {pilar.nama}
                <Ikon nama="arrow-right" ukuran={18} />
              </Tautan>
            </div>
            <ul className={gaya.rubrikDaftar}>
              {artikel.map((k) => (
                <li key={k.id} data-masuk="">
                  <KartuArtikel kartu={k} />
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
