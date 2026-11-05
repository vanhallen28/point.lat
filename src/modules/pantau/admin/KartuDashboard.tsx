import type { ServerProps } from 'payload'

import { PATH_ADMIN } from '@/lib/admin'

import './kartu.scss'

/**
 * Kartu "Dashboard SEO" di halaman awal admin (`admin.components.beforeDashboard`), hanya untuk admin.
 * Di layar laptop menu admin tertutup, jadi tautan menu baru terlihat setelah menu dibuka; kartu ini
 * membuat dashboard langsung terlihat (keputusan pemilik Rencana 6B). Teks tautannya sengaja berbeda
 * dari tautan menu "Dashboard SEO".
 */
export function KartuDashboard({ user }: ServerProps) {
  if ((user as { peran?: string | null } | undefined)?.peran !== 'admin') return null
  return (
    <section className="pantau-kartu" aria-labelledby="pantau-kartu-judul">
      <h2 id="pantau-kartu-judul">Dashboard SEO</h2>
      <p>Klik dari Google, status indeks, tautan rusak, dan 404 teratas, diperbarui otomatis sekali sehari.</p>
      <a href={`${PATH_ADMIN}/seo`}>Buka dashboard</a>
    </section>
  )
}
