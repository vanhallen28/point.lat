import { teksJumlah } from '@/modules/pantau/format'

import type { Bandingan } from '../tipe'

import { Ikon } from './IkonRedaksi'

const PERSEN_TANDA = new Intl.NumberFormat('id-ID', { style: 'percent', maximumFractionDigits: 0, signDisplay: 'exceptZero' })

/**
 * Perubahan dibanding periode sebelumnya (beranda admin dan Dashboard SEO): panah, tanda +/-, dan warna, jadi arah
 * terbaca tanpa warna. `terbalik`: angka yang makin kecil makin baik (posisi rata-rata Google), warnanya dibalik.
 * `format` untuk nilai sebelumnya di tooltip.
 */
export function Perubahan({
  b,
  satuan,
  terbalik = false,
  format = teksJumlah,
}: {
  b: Bandingan
  satuan: string
  terbalik?: boolean
  format?: (n: number) => string
}) {
  if (b.sebelumnya === null) return <span className="redaksi-perubahan">belum cukup data</span>
  const teks = b.persen === null ? (b.arah === 'tetap' ? '0%' : 'baru') : PERSEN_TANDA.format(b.persen)
  const baik = b.arah === 'tetap' ? null : (b.arah === 'naik') !== terbalik
  const kelas = baik === null ? 'tetap' : baik ? 'naik' : 'turun'
  return (
    <span className={`redaksi-perubahan redaksi-perubahan--${kelas}`} title={`Periode sebelumnya: ${format(b.sebelumnya)} ${satuan}`}>
      {b.arah === 'naik' && <Ikon nama="naik" ukuran={13} />}
      {b.arah === 'turun' && <Ikon nama="turun" ukuran={13} />}
      {teks}
      <span className="redaksi-sr"> dibanding periode sebelumnya</span>
    </span>
  )
}
