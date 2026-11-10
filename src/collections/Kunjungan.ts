import type { CollectionConfig } from 'payload'

import { isAdmin, nobody } from '@/access'
import { endpointCatatKunjungan, endpointCsvKunjungan } from '@/modules/kunjungan/endpoint'

/**
 * Satu baris per halaman yang dibuka pembaca (spesifikasi §26), diisi beacon `POST /api/kunjungan/catat` lewat SQL
 * atomik dan dibaca Statistik kunjungan di beranda admin. Tanpa IP dan tanpa cookie: `sidik` adalah HMAC harian
 * (IP, user agent, tanggal), jadi pengunjung yang sama di hari berbeda tidak bisa dicocokkan. Disimpan 13 bulan
 * (`SIMPAN_HARI`, pembersihan cron harian); total harian disimpan selamanya di `kunjungan-harian`.
 */
export const Kunjungan: CollectionConfig = {
  slug: 'kunjungan',
  labels: { singular: 'Kunjungan', plural: 'Kunjungan' },
  defaultSort: '-waktu',
  admin: { useAsTitle: 'path', group: 'SEO', hidden: true },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  endpoints: [endpointCatatKunjungan, endpointCsvKunjungan],
  indexes: [{ fields: ['sidik', 'tanggal'] }],
  fields: [
    { name: 'waktu', type: 'date', required: true, index: true },
    { name: 'tanggal', type: 'text', required: true, index: true, admin: { description: 'YYYY-MM-DD, WIB.' } },
    { name: 'path', type: 'text', required: true },
    { name: 'negara', type: 'text', admin: { description: 'Kode ISO 2 huruf dari geolokasi Vercel.' } },
    { name: 'kota', type: 'text' },
    { name: 'kanal', type: 'text', required: true },
    { name: 'sumber', type: 'text', required: true },
    { name: 'perujuk', type: 'text', admin: { description: 'Domain halaman sebelumnya, tanpa path.' } },
    { name: 'perangkat', type: 'text', required: true },
    { name: 'peramban', type: 'text', required: true },
    { name: 'sidik', type: 'text', required: true },
    { name: 'baru', type: 'checkbox', admin: { description: 'Tayangan pertama sidik ini hari itu.' } },
    { name: 'masuk', type: 'checkbox', admin: { description: 'Halaman pertama sebuah kunjungan (perujuk bukan point.).' } },
  ],
}
