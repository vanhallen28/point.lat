import { Ikon } from '@/components/dasar/Ikon'
import { JsonLd } from '@/components/dasar/JsonLd'
import { RemahRoti } from '@/components/dasar/RemahRoti'
import { Tautan } from '@/components/dasar/Tautan'
import type { KelompokTools } from '@/modules/konten/tipe'
import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
import type { MasukanSeo, Situs } from '@/modules/seo/tipe'

import gaya from './Tools.module.css'

export const JUDUL_TOOLS = 'Tools'
export const DESKRIPSI_TOOLS =
  'Kalkulator untuk menghitung sendiri gaji, cicilan, dan kebutuhan harianmu. Setiap kalkulator disertai rumus dan sumber aturannya.'

/** Indeks `/tools`: kalkulator per pilar. Halaman kalkulator `/tools/{slug}` dibangun di Rencana 5. */
export function IndeksTools({ kelompok, masukan, situs }: { kelompok: KelompokTools[]; masukan: MasukanSeo; situs: Situs }) {
  return (
    <div className={`kontainer ${gaya.halaman}`}>
      <JsonLd data={jsonLd(masukan, situs)} />
      <header className={gaya.kepala}>
        <RemahRoti remah={remahRoti(masukan)} />
        <h1 className={gaya.judul}>{JUDUL_TOOLS}</h1>
        <p className={gaya.deck}>{DESKRIPSI_TOOLS}</p>
      </header>
      {kelompok.length === 0 && <p className={gaya.kosong}>Belum ada kalkulator yang terbit. Kalkulator baru tampil di sini setelah terbit.</p>}
      {kelompok.map((k) => (
        <section key={k.pilar.slug} aria-labelledby={`tools-${k.pilar.slug}`} className={gaya.kelompok}>
          <h2 id={`tools-${k.pilar.slug}`} className={gaya.subjudul}>
            <span className={gaya.titik} data-warna={k.pilar.warna} aria-hidden="true" />
            {k.pilar.nama}
          </h2>
          <ul className={gaya.daftar}>
            {k.tools.map((t) => (
              <li key={t.id}>
                <Tautan href={t.href} className={gaya.kartu}>
                  <Ikon nama="calculator" ukuran={28} />
                  <h3 className={gaya.nama}>{t.nama}</h3>
                  <p>{t.ringkasan}</p>
                  <span className={gaya.ajakan}>
                    Hitung {t.nama}
                    <Ikon nama="arrow-right" />
                  </span>
                </Tautan>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
