import type { Subjudul } from '@/modules/konten/tipe'

import gaya from './Artikel.module.css'

/** Daftar isi dari H2 isi artikel. Tautannya jangkar ke `id` heading yang sama. */
export function DaftarIsi({ subjudul }: { subjudul: Subjudul[] }) {
  if (subjudul.length === 0) return null
  return (
    <nav aria-labelledby="daftar-isi" className={gaya.daftarIsi}>
      <h2 id="daftar-isi" className={gaya.label}>
        Daftar isi
      </h2>
      <ol>
        {subjudul.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`}>{s.teks}</a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
