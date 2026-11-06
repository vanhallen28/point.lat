import type { CollectionConfig } from 'payload'

import { isAdmin, nobody } from '@/access'
import { endpointPindaiUlang } from '@/modules/pantau/endpoint'
import { JENIS_TUGAS, LABEL_STATUS_TUGAS, LABEL_TUGAS, STATUS_TUGAS } from '@/modules/pantau/tipe'

/**
 * Tugas berkala Pantau SEO (satu baris per jenis): kapan terakhir berjalan, hasilnya, dan kapan
 * berikutnya. Cron mengklaim baris ini secara atomik, jadi cron yang terkirim dua kali tidak menjalankan
 * tugas yang sama dua kali. Hasilnya tampil di dashboard SEO, dengan tombol "Pindai ulang sekarang"
 * (`POST /api/tugas-seo/pindai`, Rencana 8B).
 */
export const TugasSeo: CollectionConfig = {
  slug: 'tugas-seo',
  labels: { singular: 'Tugas SEO', plural: 'Tugas SEO' },
  admin: { useAsTitle: 'jenis', group: 'SEO', hidden: true },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  endpoints: [endpointPindaiUlang],
  fields: [
    { name: 'jenis', type: 'select', required: true, unique: true, options: JENIS_TUGAS.map((value) => ({ value, label: LABEL_TUGAS[value] })) },
    { name: 'status', type: 'select', options: STATUS_TUGAS.map((value) => ({ value, label: LABEL_STATUS_TUGAS[value] })) },
    { name: 'mulai', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'selesai', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'berikutnya', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'pesan', type: 'textarea' },
    { name: 'versi', type: 'number', defaultValue: 0, admin: { hidden: true } },
  ],
}
