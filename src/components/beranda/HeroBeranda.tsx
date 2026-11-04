import { FormCari } from '@/components/cari/FormCari'
import type { BagianBeranda } from '@/modules/konten/tipe'

import gaya from './Beranda.module.css'

/** Judul raksasa, kalimat pembuka, dan pencarian besar (mockup Kartu Intinya). Satu-satunya H1 beranda. */
export function HeroBeranda({ hero }: { hero: Extract<BagianBeranda, { jenis: 'hero' }> }) {
  return (
    <section aria-labelledby="judul-beranda" className={`kontainer ${gaya.hero}`}>
      <h1 id="judul-beranda" className={gaya.judulRaksasa}>
        {hero.judul}
      </h1>
      <div className={gaya.heroBaris}>
        {hero.subjudul && <p className={gaya.pembuka}>{hero.subjudul}</p>}
        <div className={gaya.heroCari}>
          <FormCari besar placeholder={hero.placeholder} />
        </div>
      </div>
    </section>
  )
}
