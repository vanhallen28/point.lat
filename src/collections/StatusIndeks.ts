import type { CollectionConfig } from 'payload'

import { isAdmin, nobody } from '@/access'
import { endpointCekSekarang } from '@/modules/indexer/endpoint'
import { LABEL_STATUS_INDEKS, STATUS_INDEKS } from '@/modules/indexer/tipe'

/**
 * Status indeks Google per path publik (spesifikasi §6 `statusIndeks`), diisi cek status URL
 * Inspection +6 jam sampai +30 hari setelah terbit. Path yang dihapus atau pindah keluar dari sini.
 * Kolom "Cek sekarang" memajukan cek satu halaman lewat `POST /api/status-indeks/{id}/cek` (Rencana 8B).
 */
export const StatusIndeks: CollectionConfig = {
  slug: 'status-indeks',
  labels: { singular: 'Status indeks', plural: 'Status indeks' },
  defaultSort: '-updatedAt',
  admin: {
    useAsTitle: 'path',
    defaultColumns: ['path', 'status', 'cekTerakhir', 'cekBerikutnya', 'cekSekarang', 'detail'],
    group: 'SEO',
    description: 'Status di Google untuk setiap halaman yang terbit, dicek otomatis sampai 30 hari setelah terbit atau perubahan besar.',
  },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  endpoints: [endpointCekSekarang],
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
    // Permintaan "Cek sekarang" terakhir; jeda 10 menit dihitung dari sini (klaim atomik di modul indexer).
    { name: 'dimintaPada', type: 'date', label: 'Cek manual terakhir', admin: { readOnly: true, date: { pickerAppearance: 'dayAndTime' } } },
    {
      name: 'cekSekarang',
      type: 'ui',
      label: 'Cek sekarang',
      admin: { components: { Cell: '@/modules/indexer/admin/SelCekSekarang#SelCekSekarang' } },
    },
  ],
}
