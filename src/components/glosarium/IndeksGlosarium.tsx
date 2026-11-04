import { JsonLd } from '@/components/dasar/JsonLd'
import { RemahRoti } from '@/components/dasar/RemahRoti'
import { Tautan } from '@/components/dasar/Tautan'
import type { KelompokIstilah } from '@/modules/konten/tipe'
import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
import type { MasukanSeo, Situs } from '@/modules/seo/tipe'

import gaya from './Glosarium.module.css'

export const JUDUL_GLOSARIUM = 'Glosarium'
export const DESKRIPSI_GLOSARIUM =
  'Istilah uang, karier, teknologi, pendidikan, dan kesehatan, dijelaskan dalam satu kalimat dulu lalu ditautkan ke panduannya.'

/** `/glosarium`: istilah per huruf dengan navigasi huruf. Definisi tampil langsung di indeks. */
export function IndeksGlosarium({ kelompok, masukan, situs }: { kelompok: KelompokIstilah[]; masukan: MasukanSeo; situs: Situs }) {
  return (
    <div className={`kontainer ${gaya.halaman}`}>
      <JsonLd data={jsonLd(masukan, situs)} />
      <header className={gaya.kepala}>
        <RemahRoti remah={remahRoti(masukan)} />
        <h1 className={gaya.judul}>{JUDUL_GLOSARIUM}</h1>
        <p className={gaya.deck}>{DESKRIPSI_GLOSARIUM}</p>
        {kelompok.length > 1 && (
          <nav aria-label="Huruf" className={gaya.huruf}>
            <ul>
              {kelompok.map((k) => (
                <li key={k.id}>
                  <a href={`#${k.id}`}>{k.huruf}</a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      {kelompok.length === 0 && <p className={gaya.kosong}>Belum ada istilah. Istilah baru tampil di sini setelah terbit.</p>}
      {kelompok.map((k) => (
        <section key={k.id} id={k.id} aria-labelledby={`${k.id}-judul`} className={gaya.kelompok}>
          <h2 id={`${k.id}-judul`} className={gaya.kelompokJudul}>
            {k.huruf}
          </h2>
          <dl className={gaya.daftar}>
            {k.istilah.map((i) => (
              <div key={i.href} className={gaya.istilah}>
                <dt>
                  <Tautan href={i.href}>{i.judul}</Tautan>
                </dt>
                <dd>{i.definisi}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  )
}
