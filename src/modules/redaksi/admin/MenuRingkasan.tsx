import type { ServerProps } from 'payload'

import { PATH_ADMIN } from '@/lib/admin'
import { TautanNav } from '@/modules/pantau/admin/TautanNav'

import { LogoMenu } from './Grafik'

/**
 * Bagian atas menu admin (`admin.components.beforeNavLinks`, spesifikasi §23): logo point. terbalik, grup
 * Ringkasan (Beranda admin dan, untuk admin, Dashboard SEO), dan jumlah pesan baru di samping menu Pesan masuk.
 * Angka itu dipasang lewat CSS `::after` pada tautan koleksi bawaan Payload (`#nav-pesan-masuk`), karena menu
 * koleksi dirender Payload; nilainya hanya angka dari database.
 */
export async function MenuRingkasan({ user, payload }: ServerProps) {
  const admin = (user as { peran?: string | null } | undefined)?.peran === 'admin'
  const pesanBaru = user
    ? (await payload.count({ collection: 'pesan-masuk', where: { status: { equals: 'baru' } }, overrideAccess: true })).totalDocs
    : 0
  return (
    <div className="redaksi-menu">
      {/* Nama tautan dari isinya ("point. Ruang redaksi"), jadi sama dengan teks yang terlihat (WCAG 2.5.3). */}
      <a className="redaksi-menu__merek" href={PATH_ADMIN}>
        <LogoMenu />
        <span>Ruang redaksi</span>
      </a>
      <p className="redaksi-menu__grup">Ringkasan</p>
      <TautanNav href={PATH_ADMIN} label="Beranda admin" id="nav-beranda-admin" />
      {admin && <TautanNav href={`${PATH_ADMIN}/seo`} label="Dashboard SEO" id="nav-dashboard-seo" />}
      {pesanBaru > 0 && (
        <style>{`#nav-pesan-masuk::after{content:"${Math.min(pesanBaru, 99)}${pesanBaru > 99 ? '+' : ''}" / ""}#nav-pesan-masuk .nav__link-label::after{content:", ${pesanBaru} baru";position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}`}</style>
      )}
    </div>
  )
}
