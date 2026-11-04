import { Ikon } from '@/components/dasar/Ikon'
import { Tautan } from '@/components/dasar/Tautan'
import type { DataNewsletter } from '@/modules/konten/tipe'

import gaya from './Beranda.module.css'

/**
 * Ajakan newsletter. Pendaftaran terjadi di form penyedia (URL dari global `newsletter`), jadi point.
 * tidak menyimpan email pembaca dan tidak ada form palsu. `lepas`: berdiri sendiri, bukan kolom samping.
 */
export function KotakNewsletter({ newsletter, id, lepas = false }: { newsletter: DataNewsletter; id: string; lepas?: boolean }) {
  return (
    <section aria-labelledby={`${id}-judul`} className={lepas ? `${gaya.newsletter} ${gaya.lepas}` : gaya.newsletter}>
      <h2 id={`${id}-judul`} className={gaya.newsletterJudul}>
        {newsletter.judul}
      </h2>
      {newsletter.teks && <p>{newsletter.teks}</p>}
      <Tautan href={newsletter.href} className={gaya.tombol}>
        Langganan gratis
        <span className="sr"> (form penyedia newsletter)</span>
        <Ikon nama="arrow-up-right" />
      </Tautan>
    </section>
  )
}
