import { Ikon } from '@/components/dasar/Ikon'
import { Tautan } from '@/components/dasar/Tautan'
import { PATH_INDEKS } from '@/lib/paths'
import type { BagianBeranda } from '@/modules/konten/tipe'

import gaya from './Beranda.module.css'

/**
 * Blok Strip kalkulator (spesifikasi §25): pita krem selebar layar berisi kartu setiap kalkulator terbit, dengan
 * titik dan nama pilarnya, ringkasan, dan tautan ke semua tools.
 */
export function StripTools({ strip }: { strip: Extract<BagianBeranda, { jenis: 'tools' }> }) {
  const idJudul = `${strip.id}-judul`
  return (
    <section aria-labelledby={idJudul} className={`${gaya.bagian} ${gaya.pitaTools}`}>
      <div className={`kontainer ${gaya.pitaIsi}`}>
        <div className={gaya.pitaKepala}>
          <div>
            <h2 id={idJudul} className={gaya.pitaJudul}>
              {strip.judul}
            </h2>
            {strip.teks && <p className={gaya.pitaTeks}>{strip.teks}</p>}
          </div>
          <Tautan href={PATH_INDEKS.tools} className={gaya.semua}>
            Semua kalkulator
            <Ikon nama="arrow-right" ukuran={18} />
          </Tautan>
        </div>
        <ul className={gaya.pitaDaftar}>
          {strip.tools.map((t) => (
            <li key={t.id} data-masuk="">
              <Tautan href={t.href} className={gaya.alat} data-warna={t.pilar.warna}>
                <span className={gaya.alatPilar}>
                  <span className={gaya.rubrikTitik} aria-hidden="true" />
                  {t.pilar.nama}
                </span>
                <span className={gaya.alatNama}>{t.nama}</span>
                <span className={gaya.alatRingkas}>{t.ringkasan}</span>
                <span className={gaya.alatAksi}>
                  Hitung
                  <Ikon nama="arrow-right" ukuran={18} />
                </span>
              </Tautan>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
