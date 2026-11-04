import gaya from './Logo.module.css'

/** Tanda `point.`: titik adalah logonya (spesifikasi §3). */
export function Logo({ ukuran = 'besar' }: { ukuran?: 'besar' | 'kecil' }) {
  return <span className={`${gaya.logo} ${gaya[ukuran]}`}>point.</span>
}
