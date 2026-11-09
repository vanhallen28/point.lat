/**
 * Ikon beranda admin (Lucide, digambar ulang tanpa paket ikon). Selalu dekoratif: label teks di sebelahnya yang
 * membawa arti, jadi `aria-hidden`.
 */
const PATH = {
  plus: <path d="M5 12h14M12 5v14" />,
  kalender: (
    <>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  centang: <path d="M20 6 9 17l-5-5" />,
  centangBulat: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  jam: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  silang: <path d="M18 6 6 18M6 6l12 12" />,
  silangBulat: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6M9 9l6 6" />
    </>
  ),
  seru: <path d="M12 7v6M12 17h.01" />,
  segitiga: (
    <>
      <path d="m21.7 18-8-14a2 2 0 0 0-3.5 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  naik: <path d="m5 12 7-7 7 7M12 19V5" />,
  turun: <path d="M12 5v14M19 12l-7 7-7-7" />,
  bintang: <path d="M9.9 15.5A2 2 0 0 0 8.5 14.1l-6.1-1.6a.5.5 0 0 1 0-1l6.1-1.6A2 2 0 0 0 9.9 8.5l1.6-6.1a.5.5 0 0 1 1 0l1.6 6.1a2 2 0 0 0 1.4 1.4l6.1 1.6a.5.5 0 0 1 0 1l-6.1 1.6a2 2 0 0 0-1.4 1.4l-1.6 6.1a.5.5 0 0 1-1 0z" />,
  luar: <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />,
  kanan: <path d="m9 18 6-6-6-6" />,
} as const

export type NamaIkon = keyof typeof PATH

export function Ikon({ nama, ukuran = 16 }: { nama: NamaIkon; ukuran?: number }) {
  return (
    <svg
      className="redaksi-ikon-ui"
      width={ukuran}
      height={ukuran}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATH[nama]}
    </svg>
  )
}
