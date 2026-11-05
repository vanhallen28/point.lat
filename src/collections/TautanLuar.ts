import type { CollectionConfig } from 'payload'

import { isAdmin, nobody } from '@/access'
import { LABEL_STATUS_TAUTAN, STATUS_TAUTAN } from '@/modules/pantau/tipe'

/**
 * Tautan ke situs lain di konten terbit (satu baris per URL) dan hasil pemeriksaan terakhirnya. Pindai
 * harian menambah URL baru dan membuang URL yang tidak lagi dipakai; cron memeriksa beberapa URL yang
 * jatuh tempo setiap jalan, jadi setiap URL dicek seminggu sekali (spesifikasi §8: link rusak mingguan).
 */
export const TautanLuar: CollectionConfig = {
  slug: 'tautan-luar',
  labels: { singular: 'Tautan luar', plural: 'Tautan luar' },
  defaultSort: 'berikutnya',
  admin: { useAsTitle: 'url', group: 'SEO', hidden: true },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  fields: [
    { name: 'url', type: 'text', required: true, unique: true, index: true, label: 'URL' },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'belum',
      index: true,
      options: STATUS_TAUTAN.map((value) => ({ value, label: LABEL_STATUS_TAUTAN[value] })),
    },
    { name: 'kodeHttp', type: 'number', label: 'Status HTTP' },
    { name: 'pesan', type: 'text' },
    { name: 'dicekPada', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'berikutnya', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'sumber', type: 'json', admin: { description: 'Dokumen yang memuat tautan ini: koleksi, id, judul, path.' } },
  ],
}
