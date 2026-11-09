import { Ikon } from '@/components/dasar/Ikon'
import { Tautan } from '@/components/dasar/Tautan'
import { FormNewsletter } from '@/components/pembaca/FormNewsletter'
import type { DataNewsletter } from '@/modules/konten/tipe'

import gaya from './Beranda.module.css'

/**
 * Ajakan newsletter (spesifikasi §23). Cara `form`: form point. yang menyimpan email di database dengan
 * persetujuan; cara `penyedia`: tautan ke form penyedia (URL dari global `newsletter`). `lepas`: berdiri sendiri,
 * bukan kolom samping. `asal`: path halaman tempat form ini, untuk kembali setelah mendaftar tanpa JavaScript.
 */
export function KotakNewsletter({ newsletter, id, lepas = false, asal = '/' }: { newsletter: DataNewsletter; id: string; lepas?: boolean; asal?: string }) {
  return (
    <section aria-labelledby={`${id}-judul`} className={lepas ? `${gaya.newsletter} ${gaya.lepas}` : gaya.newsletter}>
      <h2 id={`${id}-judul`} className={gaya.newsletterJudul}>
        {newsletter.judul}
      </h2>
      {newsletter.teks && <p>{newsletter.teks}</p>}
      {newsletter.cara === 'form' ? (
        <FormNewsletter id={id} asal={asal} />
      ) : (
        <Tautan href={newsletter.href} className={gaya.tombol}>
          Langganan gratis
          <span className="sr"> (form penyedia newsletter)</span>
          <Ikon nama="arrow-up-right" />
        </Tautan>
      )}
    </section>
  )
}
