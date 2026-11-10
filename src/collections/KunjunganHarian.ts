import type { CollectionConfig } from 'payload'

import { isAdmin, nobody } from '@/access'

/**
 * Total tayangan dan pengunjung per hari WIB (spesifikasi §26), ditambah satu per tayangan oleh beacon kunjungan
 * (`INSERT ... ON CONFLICT DO UPDATE`). Tidak ikut dibersihkan, jadi angka "Total" dan grafik rentang panjang tetap
 * ada setelah baris kunjungan mentah lewat 13 bulan.
 */
export const KunjunganHarian: CollectionConfig = {
  slug: 'kunjungan-harian',
  labels: { singular: 'Kunjungan harian', plural: 'Kunjungan harian' },
  defaultSort: '-tanggal',
  admin: { useAsTitle: 'tanggal', group: 'SEO', hidden: true },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  fields: [
    { name: 'tanggal', type: 'text', required: true, unique: true, index: true, admin: { description: 'YYYY-MM-DD, WIB.' } },
    { name: 'tayangan', type: 'number', required: true, defaultValue: 0 },
    { name: 'pengunjung', type: 'number', required: true, defaultValue: 0 },
  ],
}
