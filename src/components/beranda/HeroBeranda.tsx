import { Fragment, type CSSProperties } from 'react'

import { FormCari } from '@/components/cari/FormCari'
import type { BagianBeranda } from '@/modules/konten/tipe'

import gaya from './Beranda.module.css'

/**
 * Judul raksasa, kalimat pembuka, dan pencarian besar (mockup Kartu Intinya). Satu-satunya H1 beranda.
 * Judul dipecah per kata untuk reveal CSS (spesifikasi §13): kata naik dan muncul berurutan sejak
 * paint pertama, tanpa JavaScript, jadi judul tidak menunggu skrip dan LCP tidak tertunda. Spasi
 * antarkata tetap teks biasa supaya judul dibaca utuh oleh pembaca layar.
 */
export function HeroBeranda({ hero }: { hero: Extract<BagianBeranda, { jenis: 'hero' }> }) {
  return (
    <section aria-labelledby="judul-beranda" className={`kontainer ${gaya.hero}`}>
      <h1 id="judul-beranda" className={gaya.judulRaksasa}>
        {hero.judul.split(/\s+/).map((kata, i) => (
          <Fragment key={i}>
            {i > 0 && ' '}
            <span className={gaya.kata} style={{ '--urutan': i } as CSSProperties}>
              {kata}
            </span>
          </Fragment>
        ))}
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
