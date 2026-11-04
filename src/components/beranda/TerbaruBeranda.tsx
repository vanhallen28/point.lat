import { Tautan } from '@/components/dasar/Tautan'
import type { BagianBeranda } from '@/modules/konten/tipe'

import gaya from './Beranda.module.css'
import { KotakNewsletter } from './KotakNewsletter'

/**
 * Daftar tulisan terbaru bertitik warna pilar (posisi "Paling dibaca" di mockup, sampai data kunjungan
 * ada di Rencana 6), dengan newsletter di kolom samping bila editor meletakkannya tepat setelahnya.
 */
export function TerbaruBeranda({ terbaru }: { terbaru: Extract<BagianBeranda, { jenis: 'terbaru' }> }) {
  return (
    <div className={`kontainer ${gaya.bagian} ${gaya.terbaruBaris}`}>
      <section aria-labelledby={`${terbaru.id}-judul`} className={gaya.terbaru}>
        <h2 id={`${terbaru.id}-judul`} className={gaya.subjudul}>
          {terbaru.judul}
        </h2>
        <ul className={gaya.daftar}>
          {terbaru.artikel.map((k) => (
            <li key={k.id}>
              <Tautan href={k.href} className={gaya.item}>
                <span className={gaya.titik} data-warna={k.pilar?.warna} aria-hidden="true" />
                <span className={gaya.itemTeks}>
                  <span className={gaya.itemJudul}>{k.judul}</span>
                  {k.pilar && <span className={gaya.itemPilar}>{k.pilar.nama}</span>}
                </span>
              </Tautan>
            </li>
          ))}
        </ul>
      </section>
      {terbaru.newsletter && (
        <aside className={gaya.samping} aria-label="Newsletter">
          <KotakNewsletter newsletter={terbaru.newsletter} id={`${terbaru.id}-newsletter`} />
        </aside>
      )}
    </div>
  )
}
