import type { CollectionConfig } from 'payload'

import { isLoggedIn } from '@/access'

/** Diisi server saat halaman 404 dirender (Rencana 4). Editor bisa menjadikannya redirect. */
export const Log404: CollectionConfig = {
  slug: 'log-404',
  labels: { singular: 'Log 404', plural: 'Log 404' },
  defaultSort: '-jumlah',
  admin: { useAsTitle: 'path', defaultColumns: ['path', 'jumlah', 'terakhir', 'referer'], group: 'SEO' },
  access: { read: isLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  fields: [
    { name: 'path', type: 'text', required: true, unique: true, index: true },
    { name: 'jumlah', type: 'number', defaultValue: 1 },
    { name: 'terakhir', type: 'date' },
    { name: 'referer', type: 'text' },
  ],
}
