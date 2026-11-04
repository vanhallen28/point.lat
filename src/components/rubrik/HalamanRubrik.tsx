import { JsonLd } from '@/components/dasar/JsonLd'
import { RemahRoti } from '@/components/dasar/RemahRoti'
import { Tautan } from '@/components/dasar/Tautan'
import { IsiArtikel } from '@/components/isi/IsiArtikel'
import { DaftarKartu } from '@/components/kartu/KartuArtikel'
import type { DataRubrik } from '@/modules/konten/tipe'
import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
import type { Situs } from '@/modules/seo/tipe'

import gaya from './Rubrik.module.css'

/**
 * Halaman rubrik `/{pilar}` dan `/{pilar}/{subkategori}`: kepala berwarna pilar (nama selalu
 * tertulis), navigasi subkategori, intro pilar dari CMS, lalu kartu tulisan terbaru.
 */
export function HalamanRubrik({ rubrik, situs }: { rubrik: DataRubrik; situs: Situs }) {
  const subkategori = rubrik.seo.jenis === 'subkategori'
  return (
    <div className={`kontainer ${gaya.halaman}`}>
      <JsonLd data={jsonLd(rubrik.seo, situs)} />
      <RemahRoti remah={remahRoti(rubrik.seo)} />
      <header className={gaya.kepala} data-warna={rubrik.pilar.warna}>
        <p className={gaya.label}>{subkategori ? rubrik.pilar.nama : 'Rubrik'}</p>
        <h1 className={gaya.judul}>{rubrik.judul}</h1>
        {rubrik.deskripsi && <p className={gaya.deskripsi}>{rubrik.deskripsi}</p>}
      </header>
      {rubrik.subkategori.length > 0 && (
        <nav aria-label={`Subkategori ${rubrik.pilar.nama}`} className={gaya.navigasi}>
          <ul>
            {rubrik.subkategori.map((s) => (
              <li key={s.href}>
                <Tautan href={s.href} aria-current={s.aktif ? 'page' : undefined} className={gaya.pil}>
                  {s.label}
                </Tautan>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {rubrik.intro && <IsiArtikel isi={rubrik.intro} cloudName={situs.cloudName} />}
      <section aria-labelledby="tulisan-rubrik" className={gaya.tulisan}>
        <h2 id="tulisan-rubrik" className={gaya.subjudul}>
          Tulisan terbaru
        </h2>
        {rubrik.artikel.length > 0 ? (
          <DaftarKartu kartu={rubrik.artikel} />
        ) : (
          <p className={gaya.kosong}>Belum ada tulisan di rubrik ini. Tulisan baru tampil di sini setelah terbit.</p>
        )}
      </section>
    </div>
  )
}
