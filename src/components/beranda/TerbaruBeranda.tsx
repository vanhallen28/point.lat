import { KartuArtikel } from '@/components/kartu/KartuArtikel'
import type { BagianBeranda } from '@/modules/konten/tipe'

import gaya from './Beranda.module.css'
import { KotakNewsletter } from './KotakNewsletter'

/**
 * Blok "Paling dicari pekan ini" (klik Google 7 hari, bernomor peringkat), atau tulisan terbaru selama datanya
 * belum cukup: daftar kartu ringkas bergambar kecil dengan tanggal terbit, dua kolom di layar lebar, dengan
 * newsletter di kolom samping bila editor meletakkannya tepat setelahnya.
 */
export function TerbaruBeranda({ terbaru }: { terbaru: Extract<BagianBeranda, { jenis: 'terbaru' }> }) {
  const Daftar = terbaru.peringkat ? 'ol' : 'ul'
  return (
    <div className={`kontainer ${gaya.bagian} ${gaya.terbaruBaris}`}>
      <section aria-labelledby={`${terbaru.id}-judul`} className={gaya.terbaru}>
        <h2 id={`${terbaru.id}-judul`} className={gaya.subjudul}>
          {terbaru.judul}
        </h2>
        <Daftar className={`${gaya.daftar} ${terbaru.newsletter ? '' : gaya.daftarLebar} ${terbaru.peringkat ? gaya.peringkat : ''}`}>
          {terbaru.artikel.map((k) => (
            <li key={k.id} className={gaya.item}>
              <KartuArtikel kartu={k} ukuran="baris" />
            </li>
          ))}
        </Daftar>
      </section>
      {terbaru.newsletter && (
        <aside className={gaya.samping} aria-label="Newsletter">
          <KotakNewsletter newsletter={terbaru.newsletter} id={`${terbaru.id}-newsletter`} />
        </aside>
      )}
    </div>
  )
}
