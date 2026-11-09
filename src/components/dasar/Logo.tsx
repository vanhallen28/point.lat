import { LOGO_BIRU, LOGO_TINTA, LOGO_VIEWBOX } from '@/lib/merek'

import gaya from './Logo.module.css'

/**
 * Logo point. (spesifikasi §3): logotype "POINT." dengan huruf O berupa tanda (cincin, panah naik dari sebuah
 * titik) dan titik biru di akhir. Digambar ulang sebagai SVG dari file logo pemilik (`logo-dark.png`), jadi tajam
 * di semua ukuran tanpa unduhan tambahan. Bagian tinta mengikuti `currentColor`, bagian biru token `--merek-biru`.
 * Nama yang dibacakan tetap "point.".
 */

export function Logo({ ukuran = 'besar' }: { ukuran?: 'besar' | 'kecil' }) {
  return (
    <svg className={`${gaya.logo} ${gaya[ukuran]}`} viewBox={LOGO_VIEWBOX} role="img" aria-label="point." focusable="false">
      <path d={LOGO_TINTA} fill="currentColor" fillRule="evenodd" />
      <path d={LOGO_BIRU} className={gaya.biru} fillRule="evenodd" />
    </svg>
  )
}
