import { Ikon } from '@/components/dasar/Ikon'
import { Tautan } from '@/components/dasar/Tautan'
import { DaftarVideo } from '@/components/video/KartuVideo'
import { PATH_INDEKS } from '@/lib/paths'
import type { BagianBeranda } from '@/modules/konten/tipe'

import gaya from './Beranda.module.css'

/** Strip video 9:16 berlatar gelap selebar layar ("Intinya dalam 45 detik"). */
export function StripVideo({ strip, cloudName }: { strip: Extract<BagianBeranda, { jenis: 'video' }>; cloudName: string }) {
  return (
    <section aria-labelledby={`${strip.id}-judul`} className={`${gaya.bagian} ${gaya.strip}`}>
      <div className={`kontainer ${gaya.stripIsi}`}>
        <div className={gaya.stripKepala}>
          <h2 id={`${strip.id}-judul`} className={gaya.stripJudul}>
            {strip.judul}
          </h2>
          <Tautan href={PATH_INDEKS.video} className={gaya.semua}>
            Semua video
            <Ikon nama="arrow-right" ukuran={18} />
          </Tautan>
        </div>
        <DaftarVideo video={strip.video} cloudName={cloudName} gelap />
      </div>
    </section>
  )
}
