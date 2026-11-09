import { LOGO_BIRU, LOGO_TINTA, LOGO_VIEWBOX, TANDA_BIRU, TANDA_TINTA, TANDA_VIEWBOX } from '@/lib/merek'

/**
 * Logo point. di halaman masuk admin (`admin.components.graphics.Logo`). Bagian tinta mengikuti warna teks tema
 * Payload, jadi tetap terbaca di tema gelap; titik tetap biru merek (spesifikasi §3, §23).
 */
export function LogoAdmin() {
  return (
    <svg className="redaksi-logo" viewBox={LOGO_VIEWBOX} role="img" aria-label="point." focusable="false">
      <path d={LOGO_TINTA} fill="currentColor" fillRule="evenodd" />
      <path d={LOGO_BIRU} fill="#2f6bff" fillRule="evenodd" />
    </svg>
  )
}

/** Tanda point. di remah roti admin (`admin.components.graphics.Icon`), tautan ke beranda admin. */
export function IkonAdmin() {
  return (
    <svg className="redaksi-ikon" viewBox={TANDA_VIEWBOX} role="img" aria-label="point." focusable="false">
      <path d={TANDA_TINTA} fill="currentColor" fillRule="evenodd" />
      <path d={TANDA_BIRU} fill="#2f6bff" fillRule="evenodd" />
    </svg>
  )
}

/** Logo terbalik (tulisan putih, titik biru) di atas menu kiri yang selalu gelap. */
export function LogoMenu() {
  return (
    <svg className="redaksi-logo-menu" viewBox={LOGO_VIEWBOX} role="img" aria-label="point." focusable="false">
      <path d={LOGO_TINTA} fill="#ffffff" fillRule="evenodd" />
      <path d={LOGO_BIRU} fill="#2f6bff" fillRule="evenodd" />
    </svg>
  )
}
