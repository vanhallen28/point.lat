import type { CollectionConfig } from 'payload'

import { isAdmin, nobody } from '@/access'

/**
 * Total klik, impresi, CTR, dan posisi seluruh properti per hari (Search Analytics dimensi `date`),
 * untuk ringkasan dan grafik dashboard SEO. Disimpan 16 bulan seperti riwayat Search Console.
 */
export const AnalitikSitus: CollectionConfig = {
  slug: 'analitik-situs',
  labels: { singular: 'Performa situs harian', plural: 'Performa situs harian' },
  defaultSort: '-tanggal',
  admin: { useAsTitle: 'tanggal', group: 'SEO', hidden: true },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  fields: [
    { name: 'tanggal', type: 'text', required: true, unique: true, index: true, admin: { description: 'YYYY-MM-DD, waktu Pasifik.' } },
    { name: 'klik', type: 'number', required: true },
    { name: 'impresi', type: 'number', required: true },
    { name: 'ctr', type: 'number', required: true },
    { name: 'posisi', type: 'number', required: true },
  ],
}
