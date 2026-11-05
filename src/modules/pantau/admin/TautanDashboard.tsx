import type { ServerProps } from 'payload'

import { PATH_ADMIN } from '@/lib/admin'

import { TautanNav } from './TautanNav'

import './nav.scss'

/** Tautan "Dashboard SEO" di atas menu admin (`admin.components.beforeNavLinks`), hanya untuk admin. */
export function TautanDashboard({ user }: ServerProps) {
  if ((user as { peran?: string | null } | undefined)?.peran !== 'admin') return null
  return <TautanNav href={`${PATH_ADMIN}/seo`} label="Dashboard SEO" />
}
