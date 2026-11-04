import { JUDUL_FAQ } from '@/modules/konten/halaman'
import { paragrafTeks } from '@/modules/konten/isi'
import type { Faq as DataFaq } from '@/modules/konten/tipe'

import gaya from './Artikel.module.css'

/**
 * FAQ sebagai isi biasa (rich result FAQ sudah dihapus Google), bisa dibuka tanpa JavaScript. Blok FAQ
 * halaman statis memberi judul dan `id` sendiri supaya beberapa blok di satu halaman tidak bentrok.
 */
export function Faq({ faq, judul = JUDUL_FAQ, id = 'faq' }: { faq: DataFaq[]; judul?: string; id?: string }) {
  if (faq.length === 0) return null
  return (
    <section aria-labelledby={id} className={gaya.bagian}>
      <h2 id={id} className={gaya.subjudul}>
        {judul}
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
