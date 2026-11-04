import { paragrafTeks } from '@/modules/konten/isi'
import type { Faq as DataFaq } from '@/modules/konten/tipe'

import gaya from './Artikel.module.css'

/** FAQ sebagai isi biasa (rich result FAQ sudah dihapus Google), bisa dibuka tanpa JavaScript. */
export function Faq({ faq }: { faq: DataFaq[] }) {
  if (faq.length === 0) return null
  return (
    <section aria-labelledby="faq" className={gaya.bagian}>
      <h2 id="faq" className={gaya.subjudul}>
        Pertanyaan yang sering muncul
      </h2>
      <div className={gaya.faq}>
        {faq.map((f, i) => (
          <details key={i}>
            <summary>{f.pertanyaan}</summary>
            {paragrafTeks(f.jawaban).map((teks, j) => (
              <p key={j}>{teks}</p>
            ))}
          </details>
        ))}
      </div>
    </section>
  )
}
