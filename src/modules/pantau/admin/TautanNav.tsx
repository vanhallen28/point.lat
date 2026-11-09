'use client'

import { usePathname } from 'next/navigation'

/**
 * Tautan menu admin dengan kelas dan penanda aktif yang sama dengan tautan koleksi Payload (`nav__link`),
 * ditambah `aria-current` saat halamannya terbuka. `id` dipakai CSS ikon menu (`nav-{nama}`).
 */
export function TautanNav({ href, label, id }: { href: string; label: string; id: string }) {
  const aktif = usePathname() === href
  return (
    <a className="nav__link" href={href} id={id} aria-current={aktif ? 'page' : undefined}>
      {aktif && <div className="nav__link-indicator" />}
      <span className="nav__link-label">{label}</span>
    </a>
  )
}
