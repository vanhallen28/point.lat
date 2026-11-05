import type { CSSProperties, Ref } from 'react'

import { Ikon } from '@/components/dasar/Ikon'
import type { HasilBerhasil } from '@/modules/hitung'

import gaya from './Kalkulator.module.css'

/**
 * Hasil kalkulator: angka utama besar (Archivo tebal seperti judul raksasa beranda), ringkasan, lalu
 * rincian langkah hitung yang bisa dibuka. Ukuran angka menyesuaikan panjang teksnya (`--panjang`)
 * dan lebar kotak, jadi Rp10 miliar tetap satu baris di layar 375 px. Angka baru muncul dengan
 * animasi CSS (naik + opacity); hasil contoh dari server tidak dianimasikan.
 */
export function HasilKalkulator({
  id,
  hasil,
  baru,
  tombol,
  urutan = 0,
  ref,
}: {
  id: string
  hasil: HasilBerhasil
  baru: boolean
  tombol: string
  urutan?: number
  ref?: Ref<HTMLElement>
}) {
  const { utama } = hasil
  return (
    <section ref={ref} className={gaya.hasil} aria-labelledby={`${id}-hasil`}>
      <h2 id={`${id}-hasil`} className={gaya.kicker}>
        <span className={gaya.titik} aria-hidden="true" />
        {baru ? 'Hasil hitunganmu' : 'Contoh hasil'}
      </h2>
      <p className={gaya.status}>{baru ? 'Untuk angka yang kamu isi.' : `Untuk angka contoh di form. Ganti angkanya, lalu tekan ${tombol}.`}</p>
      <div className={gaya.utama}>
        <p className={gaya.labelUtama}>{utama.label}</p>
        <p key={urutan} className={baru ? `${gaya.angka} ${gaya.baru}` : gaya.angka} style={{ '--panjang': utama.teks.length } as CSSProperties}>
          {utama.teks}
        </p>
        {utama.keterangan && <p className={gaya.keterangan}>{utama.keterangan}</p>}
      </div>
      {hasil.ringkasan.length > 0 && (
        <dl className={gaya.ringkasan}>
          {hasil.ringkasan.map((a) => (
            <div key={a.label}>
              <dt>{a.label}</dt>
              <dd>{a.teks}</dd>
            </div>
          ))}
        </dl>
      )}
      {hasil.peringatan.map((p) => (
        <p key={p} role="note" className={gaya.peringatan}>
          <Ikon nama="triangle-alert" ukuran={18} />
          {p}
        </p>
      ))}
      {hasil.catatan && <p className={gaya.catatan}>{hasil.catatan}</p>}
      {hasil.rincian.length > 0 && (
        <details className={gaya.rincian}>
          <summary>
            Lihat rincian hitungan
            <Ikon nama="chevron-down" className={gaya.panah} />
          </summary>
          {hasil.rincian.map((b) => (
            <div key={b.judul} className={gaya.bagianRincian}>
              <h3>{b.judul}</h3>
              <dl className={gaya.slip}>
                {b.langkah.map((l, n) => (
                  <div key={n}>
                    <dt>
                      {l.label}
                      {l.catatan && <span>{l.catatan}</span>}
                    </dt>
                    <dd>{l.teks}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </details>
      )}
    </section>
  )
}
