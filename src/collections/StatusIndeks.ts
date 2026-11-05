import type { CollectionConfig } from 'payload'

import { isAdmin, nobody } from '@/access'
import { LABEL_STATUS_INDEKS, STATUS_INDEKS } from '@/modules/indexer/tipe'

/**
 * Status indeks Google per path publik (spesifikasi §6 `statusIndeks`), diisi cek status URL
 * Inspection +6 jam sampai +30 hari setelah terbit. Path yang dihapus atau pindah keluar dari sini.
 */
export const StatusIndeks: CollectionConfig = {
  slug: 'status-indeks',
  labels: { singular: 'Status indeks', plural: 'Status indeks' },
  defaultSort: '-updatedAt',
  admin: {
    useAsTitle: 'path',
    defaultColumns: ['path', 'status', 'cekTerakhir', 'cekBerikutnya', 'detail'],
    group: 'SEO',
    description: 'Status di Google untuk setiap halaman yang terbit, dicek otomatis sampai 30 hari setelah terbit atau perubahan besar.',
  },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  fields: [
    { name: 'path', type: 'text', required: true, unique: true, index: true },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'belum-dicek',
      index: true,
      options: STATUS_INDEKS.map((value) => ({ value, label: LABEL_STATUS_INDEKS[value] })),
    },
    { name: 'detail', type: 'text', admin: { description: 'Keterangan dari Google (coverageState), atau pesan galat.' } },
    { name: 'tautanInspeksi', type: 'text', label: 'Laporan di Search Console' },
    { name: 'dirayapiPada', type: 'date', label: 'Dirayapi Google', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'cekTerakhir', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'cekBerikutnya', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
  ],
}
