import type { CollectionConfig } from 'payload'

import { isAdmin, nobody } from '@/access'
import {
  JENIS_KABAR,
  LABEL_JENIS,
  LABEL_LANGKAH,
  LABEL_STATUS_LOG,
  LANGKAH,
  NAMA_ADAPTER,
  STATUS_LOG,
} from '@/modules/indexer/tipe'

/**
 * Log Mesin Indexing (spesifikasi §6 `logIndexing`, §8 langkah 6): satu baris per langkah per URL,
 * termasuk percobaan yang gagal. Hanya admin yang bisa membaca; isinya ditulis modul indexer.
 */
export const LogIndexing: CollectionConfig = {
  slug: 'log-indexing',
  labels: { singular: 'Log indexing', plural: 'Log indexing' },
  defaultSort: '-waktu',
  admin: {
    useAsTitle: 'url',
    defaultColumns: ['waktu', 'langkah', 'status', 'url', 'pesan'],
    group: 'SEO',
    description: 'Setiap kabar ke mesin pencari dan hasilnya. Status Gagal berarti langkah itu sudah dicoba empat kali.',
  },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  fields: [
    { name: 'waktu', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'url', type: 'text', required: true, index: true, label: 'URL' },
    { name: 'jenis', type: 'select', options: JENIS_KABAR.map((value) => ({ value, label: LABEL_JENIS[value] })) },
    { name: 'langkah', type: 'select', required: true, index: true, options: LANGKAH.map((value) => ({ value, label: LABEL_LANGKAH[value] })) },
    { name: 'adapter', type: 'select', required: true, options: NAMA_ADAPTER.map((value) => ({ value, label: value })) },
    { name: 'status', type: 'select', required: true, index: true, options: STATUS_LOG.map((value) => ({ value, label: LABEL_STATUS_LOG[value] })) },
    { name: 'kodeHttp', type: 'number', label: 'Status HTTP' },
    { name: 'pesan', type: 'textarea' },
    { name: 'percobaan', type: 'number', label: 'Percobaan ke' },
  ],
}
