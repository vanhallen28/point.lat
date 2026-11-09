import { batasSumbu, teksJumlah, teksTanggal } from '@/modules/pantau/format'

import type { PekanKlik } from '../tipe'

import { Ikon } from './IkonRedaksi'

/**
 * Grafik beranda admin sebagai SVG tanpa pustaka (spesifikasi §23, skill dataviz): satu seri per grafik, garis 2 px,
 * batang dengan ujung membulat 4 px yang berdiri di garis dasar, label angka selektif, garis bantu redup, dan
 * tabel tersembunyi untuk pembaca layar. Tooltip memakai `<title>` bawaan SVG.
 */

/** Garis kecil di kartu angka. Dekoratif: angka dan perbandingannya ditulis di kartu. */
export function GarisKecil({ nilai, warna }: { nilai: number[]; warna: string }) {
  if (nilai.length < 2) return null
  const maks = Math.max(...nilai, 1)
  const titik = nilai.map((v, i) => `${((i / (nilai.length - 1)) * 100).toFixed(2)},${(28 - (v / maks) * 24).toFixed(2)}`).join(' ')
  return (
    <svg className="redaksi-garis-kecil" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <polyline points={titik} fill="none" stroke={warna} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

const LEBAR = 300
const DASAR = 120
const ATAS = 18

/** Klik per pekan: 8 batang biru merek, label angka di batang terakhir dan tertinggi, sumbu dua garis bantu. */
export function GrafikPekan({ pekan }: { pekan: PekanKlik[] }) {
  const maks = Math.max(...pekan.map((p) => p.klik), 0)
  const batas = batasSumbu(maks)
  const langkah = LEBAR / pekan.length
  const lebarBatang = Math.min(26, langkah - 10)
  const tertinggi = pekan.reduce((m, p, i) => (p.klik > pekan[m].klik ? i : m), 0)
  const y = (v: number) => DASAR - (v / batas) * (DASAR - ATAS)
  const total = pekan.reduce((n, p) => n + p.klik, 0)
  const ringkasan = `Klik per pekan, ${teksTanggal(pekan[0].dari)} sampai ${teksTanggal(pekan.at(-1)!.sampai)}: total ${teksJumlah(total)}, pekan terakhir ${teksJumlah(pekan.at(-1)!.klik)}.`
  return (
    <figure className="redaksi-grafik">
      <svg viewBox={`0 0 ${LEBAR} 144`} role="img" aria-label={ringkasan} focusable="false">
        {[batas, batas / 2].map((g) => (
          <g key={g}>
            <line className="redaksi-grafik__bantu" x1={0} x2={LEBAR} y1={y(g)} y2={y(g)} />
            <text className="redaksi-grafik__sumbu" x={0} y={y(g) - 4}>
              {teksJumlah(g)}
            </text>
          </g>
        ))}
        {pekan.map((p, i) => {
          const x = i * langkah + (langkah - lebarBatang) / 2
          const atas = y(p.klik)
          const tinggi = DASAR - atas
          const r = Math.min(4, tinggi / 2)
          const d =
            tinggi <= 0
              ? ''
              : `M${x},${DASAR}V${atas + r}a${r},${r} 0 0 1 ${r},${-r}h${lebarBatang - 2 * r}a${r},${r} 0 0 1 ${r},${r}V${DASAR}Z`
          const label = i === pekan.length - 1 || i === tertinggi
          return (
            <g key={p.sampai}>
              {/* Area sentuh setinggi grafik, lebih besar dari batangnya. */}
              <rect className="redaksi-grafik__sentuh" x={i * langkah} y={0} width={langkah} height={DASAR}>
                <title>{`${teksTanggal(p.dari, true)} sampai ${teksTanggal(p.sampai, true)}: ${teksJumlah(p.klik)} klik`}</title>
              </rect>
              {d && <path className="redaksi-grafik__batang" d={d} />}
              {label && (
                <text className="redaksi-grafik__nilai" x={x + lebarBatang / 2} y={atas - 6} textAnchor="middle">
                  {teksJumlah(p.klik)}
                </text>
              )}
              {i % 2 === 1 && (
                <text className="redaksi-grafik__sumbu" x={x + lebarBatang / 2} y={138} textAnchor="middle">
                  {teksTanggal(p.sampai, true)}
                </text>
              )}
            </g>
          )
        })}
        <line className="redaksi-grafik__dasar" x1={0} x2={LEBAR} y1={DASAR} y2={DASAR} />
      </svg>
      <table className="redaksi-sr">
        <caption>Klik per pekan</caption>
        <thead>
          <tr>
            <th scope="col">Pekan</th>
            <th scope="col">Klik</th>
          </tr>
        </thead>
        <tbody>
          {pekan.map((p) => (
            <tr key={p.sampai}>
              <th scope="row">{`${teksTanggal(p.dari, true)} sampai ${teksTanggal(p.sampai, true)}`}</th>
              <td>{teksJumlah(p.klik)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}

/** Donat status indeks: tiga bagian warna status dengan celah 2 px, total di tengah, legenda berikon dan berangka. */
export function DonatIndeks({ terindeks, menunggu, bermasalah }: { terindeks: number; menunggu: number; bermasalah: number }) {
  const total = terindeks + menunggu + bermasalah
  const r = 48
  const keliling = 2 * Math.PI * r
  const bagian = [
    { kunci: 'baik', jumlah: terindeks, label: 'Terindeks', ikon: 'centangBulat' as const },
    { kunci: 'waspada', jumlah: menunggu, label: 'Menunggu Google', ikon: 'jam' as const },
    { kunci: 'kritis', jumlah: bermasalah, label: 'Bermasalah', ikon: 'silangBulat' as const },
  ]
  const isi = bagian.filter((b) => b.jumlah > 0)
  const celah = isi.length > 1 ? 2.5 : 0
  let geser = 0
  return (
    <div className="redaksi-donat">
      <svg viewBox="0 0 120 120" width={112} height={112} aria-hidden="true" focusable="false">
        <circle cx={60} cy={60} r={r} fill="none" className="redaksi-donat__alas" strokeWidth={16} />
        {total > 0 &&
          isi.map((b) => {
            const panjang = (keliling * b.jumlah) / total
            const el = (
              <circle
                key={b.kunci}
                cx={60}
                cy={60}
                r={r}
                fill="none"
                className={`redaksi-donat__${b.kunci}`}
                strokeWidth={16}
                strokeDasharray={`${Math.max(panjang - celah, 0.01)} ${keliling}`}
                strokeDashoffset={-geser}
                transform="rotate(-90 60 60)"
              />
            )
            geser += panjang
            return el
          })}
        <text x={60} y={58} textAnchor="middle" className="redaksi-donat__total">
          {teksJumlah(total)}
        </text>
        <text x={60} y={75} textAnchor="middle" className="redaksi-grafik__sumbu">
          halaman
        </text>
      </svg>
      <ul className="redaksi-donat__legenda">
        {bagian.map((b) => (
          <li key={b.kunci} data-status={b.kunci}>
            <Ikon nama={b.ikon} />
            <span>{b.label}</span>
            <strong>{teksJumlah(b.jumlah)}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
