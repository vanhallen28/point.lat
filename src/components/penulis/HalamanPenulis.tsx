import Image from 'next/image'

import { Ikon } from '@/components/dasar/Ikon'
import { JsonLd } from '@/components/dasar/JsonLd'
import { RemahRoti } from '@/components/dasar/RemahRoti'
import { Tautan } from '@/components/dasar/Tautan'
import { DaftarKartu } from '@/components/kartu/KartuArtikel'
import type { DataPenulis } from '@/modules/konten/tipe'
import { propsGambar } from '@/modules/media/props'
import { jsonLd, remahRoti } from '@/modules/seo/jsonld'
import type { Situs } from '@/modules/seo/tipe'

import gaya from './Penulis.module.css'

/**
 * Profil penulis `/penulis/{slug}`: foto, nama, bio, keahlian, tautan profesional (`rel="me"`), dan
 * tulisan terbarunya. JSON-LD ProfilePage + Person dari modul SEO.
 */
export function HalamanPenulis({ penulis, situs }: { penulis: DataPenulis; situs: Situs }) {
  const masukan = { jenis: 'penulis', doc: penulis.seo } as const
  const foto = propsGambar(penulis.foto, 'thumbnail', { cloudName: situs.cloudName, lebar: 320 })
  return (
    <div className={`kontainer ${gaya.halaman}`}>
      <JsonLd data={jsonLd(masukan, situs)} />
      <RemahRoti remah={remahRoti(masukan)} />
      <header className={gaya.kepala}>
        {foto && <Image {...foto} alt="" sizes="160px" className={gaya.foto} />}
        <div className={gaya.identitas}>
          <p className={gaya.label}>Penulis</p>
          <h1 className={gaya.judul}>{penulis.nama}</h1>
          {penulis.bio && <p className={gaya.bio}>{penulis.bio}</p>}
          {penulis.keahlian.length > 0 && (
            <ul aria-label="Keahlian" className={gaya.keahlian}>
              {penulis.keahlian.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          )}
          {penulis.tautan.length > 0 && (
            <ul aria-label={`Tautan ${penulis.nama}`} className={gaya.tautan}>
              {penulis.tautan.map((t) => (
                <li key={t.href}>
                  <Tautan href={t.href} rel="me noopener">
                    {t.label}
                    <Ikon nama="arrow-up-right" ukuran={18} />
                  </Tautan>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>
      <section aria-labelledby="tulisan-penulis" className={gaya.tulisan}>
        <h2 id="tulisan-penulis" className={gaya.subjudul}>
          Tulisan {penulis.nama}
        </h2>
        {penulis.artikel.length > 0 ? (
          <DaftarKartu kartu={penulis.artikel} />
        ) : (
          <p className={gaya.kosong}>Belum ada tulisan yang terbit. Tulisan baru tampil di sini setelah terbit.</p>
        )}
      </section>
    </div>
  )
}
