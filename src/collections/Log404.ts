import type { CollectionConfig } from 'payload'

import { isLoggedIn } from '@/access'
import { endpointCatat404 } from '@/modules/konten/endpoint'

/**
 * Diisi beacon halaman 404 lewat `POST /api/log-404/catat` (Rencana 4). Kolom Tindakan membuka form redirect
 * dengan path terisi (spesifikasi §8: log 404 dengan tombol "buat redirect"), atau redirect yang sudah ada.
 */
export const Log404: CollectionConfig = {
  slug: 'log-404',
  labels: { singular: 'Log 404', plural: 'Log 404' },
  defaultSort: '-jumlah',
  admin: { useAsTitle: 'path', defaultColumns: ['path', 'jumlah', 'terakhir', 'referer', 'tindakan'], group: 'SEO' },
  access: { read: isLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  endpoints: [endpointCatat404],
  fields: [
    { name: 'path', type: 'text', required: true, unique: true, index: true },
    { name: 'jumlah', type: 'number', defaultValue: 1 },
    { name: 'terakhir', type: 'date' },
    { name: 'referer', type: 'text' },
    {
      name: 'tindakan',
      type: 'ui',
      label: 'Tindakan',
      admin: { components: { Cell: '@/modules/pantau/admin/SelBuatRedirect#SelBuatRedirect' } },
    },
  ],
}
