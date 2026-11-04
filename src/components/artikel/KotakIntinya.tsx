import type { WarnaPilar } from '@/lib/konstanta'

import gaya from './Artikel.module.css'

/** Kotak Intinya: jawaban langsung di atas isi, berlatar warna pilar versi lembut (spesifikasi §4). */
export function KotakIntinya({ poin, warna }: { poin: string[]; warna: WarnaPilar | null }) {
  if (poin.length === 0) return null
  return (
    <section aria-labelledby="intinya" className={gaya.intinya} data-warna={warna ?? undefined}>
      <h2 id="intinya" className={gaya.label}>
        <span className={gaya.titik} aria-hidden="true" />
        Intinya
      </h2>
      <ul className={gaya.poin}>
        {poin.map((p, i) => (
          <li key={i}>{p}</li>
        ))}
      </ul>
    </section>
  )
}
