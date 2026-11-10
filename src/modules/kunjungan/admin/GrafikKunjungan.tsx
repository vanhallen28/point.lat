import type { CSSProperties } from 'react'

import { batasSumbu, teksJumlah } from '@/modules/pantau/format'

import type { TitikSeri } from '../tipe'

/**
 * Grafik kunjungan beranda admin (spesifikasi §26, skill dataviz): batang biru = kunjungan, garis oranye 2 px =
 * tayangan, satu sumbu (keduanya hitungan, tayangan selalu >= kunjungan). Batang dan label HTML supaya ukuran huruf
 * tetap terbaca di HP; garis SVG `preserveAspectRatio="none"` dengan goresan tak ikut melar. Setiap kolom punya
 * tooltip bawaan (`title`) seluas tinggi grafik, dan tabel tersembunyi untuk pembaca layar. Palet biru #2f6bff dan
 * oranye #c2410c (terang) atau #e8692c (gelap) lolos validator dataviz.
 */

const HARI_PANJANG = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const HARI_PENDEK = new Intl.DateTimeFormat('id-ID', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
const TANGGAL_PENDEK = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const BULAN_PANJANG = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const BULAN_PENDEK = new Intl.DateTimeFormat('id-ID', { month: 'short', year: '2-digit', timeZone: 'UTC' })

/** Angka garis bantu: batas sumbu kecil bisa pecahan (5 / 2 = 2,5), jadi satu desimal bila perlu. */
const SUMBU = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 })

const tgl = (kunci: string) => new Date(`${kunci.length === 7 ? `${kunci}-01` : kunci}T00:00:00.000Z`)

/** Satuan titik dari panjang kuncinya: `HH` jam, `YYYY-MM` bulan, `YYYY-MM-DD` hari. */
export function satuanSeri(seri: TitikSeri[]): 'jam' | 'hari' | 'bulan' {
  const k = seri[0]?.kunci ?? ''
  return k.length === 2 ? 'jam' : k.length === 7 ? 'bulan' : 'hari'
}

/** Label sumbu X yang ditampilkan: paling banyak 7 supaya tidak bertumpuk di HP; titik terakhir selalu berlabel. */
export function indeksLabel(n: number): Set<number> {
  const langkah = Math.max(1, Math.ceil(n / 7))
  const hasil = new Set<number>()
  for (let i = n - 1; i >= 0; i -= langkah) hasil.add(i)
  return hasil
}

export function labelTitik(t: TitikSeri, satuan: 'jam' | 'hari' | 'bulan', n: number, panjang = false, tanggal?: string): string {
  if (satuan === 'jam') return panjang ? `${tanggal ? `${HARI_PANJANG.format(tgl(tanggal))}, ` : ''}pukul ${t.kunci}.00 sampai ${t.kunci}.59 WIB` : t.kunci
  if (satuan === 'bulan') return (panjang ? BULAN_PANJANG : BULAN_PENDEK).format(tgl(t.kunci))
  if (panjang) return HARI_PANJANG.format(tgl(t.kunci))
  return (n <= 7 ? HARI_PENDEK : TANGGAL_PENDEK).format(tgl(t.kunci))
}

export function GrafikKunjungan({ seri, tanggal }: { seri: TitikSeri[]; tanggal: string }) {
  const n = seri.length
  const satuan = satuanSeri(seri)
  const batas = batasSumbu(Math.max(...seri.map((t) => Math.max(t.tayangan, t.kunjungan)), 0))
  const persen = (v: number) => (v / batas) * 100
  const label = indeksLabel(n)
  const totalK = seri.reduce((a, t) => a + t.kunjungan, 0)
  const totalT = seri.reduce((a, t) => a + t.tayangan, 0)
  const puncak = seri.reduce((m, t, i) => (t.kunjungan > seri[m].kunjungan ? i : m), 0)
  const per = satuan === 'jam' ? 'per jam' : satuan === 'bulan' ? 'per bulan' : 'per hari'
  const ringkasan =
    `Kunjungan dan tayangan ${per}, ${labelTitik(seri[0], satuan, n, true, tanggal)} sampai ${labelTitik(seri[n - 1], satuan, n, true, tanggal)}: ` +
    `${teksJumlah(totalK)} kunjungan dan ${teksJumlah(totalT)} tayangan; tertinggi ${labelTitik(seri[puncak], satuan, n, true, tanggal)} ` +
    `dengan ${teksJumlah(seri[puncak].kunjungan)} kunjungan.`
  const garis = seri.map((t, i) => `${(i + 0.5) * 10},${(100 - persen(t.tayangan)).toFixed(2)}`).join(' ')

  return (
    <figure className="kunjungan-grafik">
      <div className="kunjungan-grafik__legenda" aria-hidden="true">
        <span>
          <i className="kunjungan-grafik__contoh-batang" />
          Kunjungan
        </span>
        <span>
          <i className="kunjungan-grafik__contoh-garis" />
          Tayangan
        </span>
        <span className="kunjungan-grafik__per">{per}</span>
      </div>
      <div className="kunjungan-grafik__plot" role="img" aria-label={ringkasan}>
        {[batas, batas / 2].map((g) => (
          <div key={g} className="kunjungan-grafik__bantu" style={{ bottom: `${persen(g)}%` }}>
            <span>{SUMBU.format(g)}</span>
          </div>
        ))}
        <div className="kunjungan-grafik__kolom" style={{ '--n': n } as CSSProperties}>
          {seri.map((t) => (
            <div
              key={t.kunci}
              className="kunjungan-grafik__sel"
              title={`${labelTitik(t, satuan, n, true, tanggal)}: ${teksJumlah(t.kunjungan)} kunjungan, ${teksJumlah(t.tayangan)} tayangan`}
            >
              {t.kunjungan > 0 && <i style={{ height: `${persen(t.kunjungan)}%` }} />}
            </div>
          ))}
        </div>
        <svg className="kunjungan-grafik__garis" viewBox={`0 0 ${n * 10} 100`} preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <polyline points={garis} fill="none" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
      <div className="kunjungan-grafik__sumbu" style={{ '--n': n } as CSSProperties} aria-hidden="true">
        {seri.map((t, i) => (
          <span key={t.kunci}>{label.has(i) ? labelTitik(t, satuan, n) : ''}</span>
        ))}
      </div>
      <table className="redaksi-sr">
        <caption>Kunjungan dan tayangan {per}</caption>
        <thead>
          <tr>
            <th scope="col">{satuan === 'jam' ? 'Jam' : satuan === 'bulan' ? 'Bulan' : 'Tanggal'}</th>
            <th scope="col">Kunjungan</th>
            <th scope="col">Tayangan</th>
          </tr>
        </thead>
        <tbody>
          {seri.map((t) => (
            <tr key={t.kunci}>
              <th scope="row">{labelTitik(t, satuan, n, true)}</th>
              <td>{teksJumlah(t.kunjungan)}</td>
              <td>{teksJumlah(t.tayangan)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
