import { Ikon } from '@/components/dasar/Ikon'
import { tanggalIndonesia } from '@/modules/konten/artikel'
import type { Sumber } from '@/modules/konten/tipe'

import gaya from './Artikel.module.css'

/** Blok sumber di setiap artikel (rambu kredibilitas YMYL, spesifikasi §3). */
export function BlokSumber({ sumber }: { sumber: Sumber[] }) {
  if (sumber.length === 0) return null
  return (
    <section aria-labelledby="sumber" className={gaya.bagian}>
      <h2 id="sumber" className={gaya.subjudul}>
        Sumber
      </h2>
      <ol className={gaya.sumber}>
        {sumber.map((s, i) => (
          <li key={i}>
            <a href={s.url} rel="noopener">
              {s.judul}
              <Ikon nama="arrow-up-right" ukuran={16} />
            </a>
            {(s.penerbit || s.diaksesPada) && (
              <span className={gaya.meta}>
                {s.penerbit && `, ${s.penerbit}`}
                {s.diaksesPada && `, diakses ${tanggalIndonesia(s.diaksesPada)}`}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
