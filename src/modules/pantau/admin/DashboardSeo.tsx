import { DefaultTemplate } from '@payloadcms/next/templates'
import { Gutter } from '@payloadcms/ui'
import { redirect } from 'next/navigation'
import type { AdminViewServerProps } from 'payload'

import { PATH_ADMIN } from '@/lib/admin'

import { ambilDashboard } from '../dashboard'
import { Bagian404, BagianLog, BagianSearchConsole, BagianStatusIndeks, BagianTautan, BagianYatim } from './BagianDashboard'

import './dashboard.scss'

/** Path dashboard di admin (`admin.components.views` di payload.config.ts). */
export const PATH_DASHBOARD_SEO = '/seo'

/**
 * Dashboard SEO di admin (spesifikasi §8): performa di Google (klik, impresi, CTR, posisi, halaman
 * teratas), status indeks, log indexing terbaru, tautan rusak, halaman yatim, dan 404 teratas. View
 * kustom Payload tidak memeriksa akses admin sendiri, jadi pengguna yang belum masuk diarahkan ke login
 * dan selain admin hanya melihat pesan.
 */
export async function DashboardSeo({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, locale, visibleEntities } = initPageResult
  const pengguna = req.user as ({ peran?: string | null } & NonNullable<typeof req.user>) | null
  if (!pengguna) redirect(`${PATH_ADMIN}/login?redirect=${encodeURIComponent(`${PATH_ADMIN}${PATH_DASHBOARD_SEO}`)}`)
  const data = pengguna.peran === 'admin' ? await ambilDashboard(req.payload) : null
  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={req.payload}
      permissions={permissions}
      searchParams={searchParams}
      user={req.user ?? undefined}
      visibleEntities={visibleEntities}
    >
      <Gutter className="pantau">
        <header className="pantau-kepala">
          <h1>Dashboard SEO</h1>
          <p>Performa di Google, status indeks, dan kesehatan tautan situs. Data diperbarui otomatis sekali sehari.</p>
        </header>
        {data ? (
          <div className="pantau-kisi">
            <BagianSearchConsole analitik={data.analitik} tugas={data.tugas} />
            <BagianStatusIndeks statusIndeks={data.statusIndeks} />
            <BagianLog log={data.log} />
            <BagianTautan tautan={data.tautan} tugas={data.tugas} />
            <BagianYatim yatim={data.yatim} tugas={data.tugas} />
            <Bagian404 log404={data.log404} />
          </div>
        ) : (
          <p className="pantau-kosong">Dashboard SEO hanya untuk admin.</p>
        )}
      </Gutter>
    </DefaultTemplate>
  )
}
