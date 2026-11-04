import { Ikon } from '@/components/dasar/Ikon'
import { Tautan } from '@/components/dasar/Tautan'
import { KartuArtikel } from '@/components/kartu/KartuArtikel'
import { PATH_INDEKS } from '@/lib/paths'
import type { BagianBeranda, ItemTools } from '@/modules/konten/tipe'

import gaya from './Beranda.module.css'

function KotakTools({ tools, tingkat }: { tools: ItemTools[]; tingkat: 'h2' | 'h3' }) {
  const Judul = tingkat
  return (
    <div className={gaya.tools} data-masuk="">
      <div className={gaya.toolsKepala}>
        <Judul className={gaya.toolsJudul}>Hitung sendiri</Judul>
        <Tautan href={PATH_INDEKS.tools} className={gaya.semua}>
          Semua tools
          <Ikon nama="arrow-right" ukuran={18} />
        </Tautan>
      </div>
      <ul className={gaya.toolsDaftar}>
        {tools.map((t) => (
          <li key={t.id}>
            <Tautan href={t.href}>{t.nama}</Tautan>
          </li>
        ))}
      </ul>
      <p className={gaya.toolsCatatan}>Setiap kalkulator disertai penjelasan rumus dan sumber aturannya.</p>
    </div>
  )
}

/**
 * Mozaik pilihan redaksi: kartu pertama paling besar, dua berikutnya bertumpuk di sampingnya, sisanya
 * di baris kedua bersama kotak "Hitung sendiri". Baris memakai flex-wrap, jadi jumlah kartu berapa pun
 * (1-5) tidak meninggalkan sel grid kosong.
 */
export function MozaikPilihan({ mozaik }: { mozaik: Extract<BagianBeranda, { jenis: 'mozaik' }> }) {
  const [utama, ...lain] = mozaik.artikel
  const samping = lain.slice(0, 2)
  const bawah = lain.slice(2)
  const tingkat = mozaik.judul ? 'h3' : 'h2'
  return (
    <section
      aria-labelledby={mozaik.judul ? `${mozaik.id}-judul` : undefined}
      aria-label={mozaik.judul ? undefined : 'Pilihan redaksi'}
      className={`kontainer ${gaya.bagian} ${gaya.mozaik}`}
    >
      {mozaik.judul && (
        <h2 id={`${mozaik.id}-judul`} className={gaya.subjudul}>
          {mozaik.judul}
        </h2>
      )}
      <div className={gaya.baris}>
        <div className={gaya.utama}>
          <KartuArtikel kartu={utama} tingkat={tingkat} ukuran="besar" />
        </div>
        {samping.length > 0 && (
          <div className={gaya.kolom}>
            {samping.map((k) => (
              <KartuArtikel key={k.id} kartu={k} tingkat={tingkat} />
            ))}
          </div>
        )}
      </div>
      {(bawah.length > 0 || mozaik.tools.length > 0) && (
        <div className={`${gaya.baris} ${gaya.bawah}`}>
          {bawah.map((k) => (
            <div key={k.id} className={gaya.sedang} data-masuk="">
              <KartuArtikel kartu={k} tingkat={tingkat} ukuran="sedang" />
            </div>
          ))}
          {mozaik.tools.length > 0 && <KotakTools tools={mozaik.tools} tingkat={tingkat} />}
        </div>
      )}
    </section>
  )
}
