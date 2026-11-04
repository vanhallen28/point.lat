import { Ikon } from '@/components/dasar/Ikon'

import gaya from './Artikel.module.css'

/** Disclaimer pilar (Uang & Karier, Sehat) yang tampil otomatis di akhir isi artikel. */
export function Catatan({ teks }: { teks: string | null }) {
  if (!teks) return null
  return (
    <div role="note" className={gaya.catatan}>
      <Ikon nama="info" />
      <div>
        <p className={gaya.label}>Catatan</p>
        <p>{teks}</p>
      </div>
    </div>
  )
}
