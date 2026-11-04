import { JsonLd } from '@/components/dasar/JsonLd'
import type { BagianBeranda } from '@/modules/konten/tipe'
import { jsonLd } from '@/modules/seo/jsonld'
import type { Situs } from '@/modules/seo/tipe'

import gaya from './Beranda.module.css'
import { HeroBeranda } from './HeroBeranda'
import { KotakNewsletter } from './KotakNewsletter'
import { MozaikPilihan } from './MozaikPilihan'
import { StripVideo } from './StripVideo'
import { TerbaruBeranda } from './TerbaruBeranda'

/**
 * Beranda "Kartu Intinya": bagian dirender sesuai urutan editor. Setiap bagian membawa kontainernya
 * sendiri (strip video selebar layar) dan jarak atas yang sama, jadi urutan apa pun tidak membuat
 * celah ganda.
 */
export function Beranda({ bagian, situs }: { bagian: BagianBeranda[]; situs: Situs }) {
  return (
    <>
      <JsonLd data={jsonLd({ jenis: 'beranda' }, situs)} />
      {bagian.map((b) => {
        switch (b.jenis) {
          case 'hero':
            return <HeroBeranda key={b.id} hero={b} />
          case 'mozaik':
            return <MozaikPilihan key={b.id} mozaik={b} />
          case 'video':
            return <StripVideo key={b.id} strip={b} cloudName={situs.cloudName} />
          case 'terbaru':
            return <TerbaruBeranda key={b.id} terbaru={b} />
          case 'newsletter':
            return (
              <div key={b.id} className={`kontainer ${gaya.bagian}`}>
                <KotakNewsletter newsletter={b.newsletter} id={b.id} lepas />
              </div>
            )
        }
      })}
    </>
  )
}
