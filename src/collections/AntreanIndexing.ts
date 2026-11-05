import type { CollectionConfig } from 'payload'

import { isAdmin, nobody } from '@/access'
import { JENIS_KABAR, LABEL_JENIS, LABEL_LANGKAH, LANGKAH, type Langkah } from '@/modules/indexer/tipe'

const LANGKAH_ANTREAN = LANGKAH.filter((l): l is Exclude<Langkah, 'revalidasi'> => l !== 'revalidasi')

/**
 * Antrean Mesin Indexing (spesifikasi §5: antrean job di Postgres). Satu baris per langkah dan path
 * (`kunci` unik, jadi kabar berulang tergabung), dihapus setelah selesai; riwayatnya di `log-indexing`.
 * Ditulis hanya oleh modul indexer. Admin bisa melihat dan menghapus baris untuk membatalkan kabar.
 */
export const AntreanIndexing: CollectionConfig = {
  slug: 'antrean-indexing',
  labels: { singular: 'Antrean indexing', plural: 'Antrean indexing' },
  defaultSort: 'jadwal',
  admin: {
    useAsTitle: 'path',
    defaultColumns: ['langkah', 'path', 'jenis', 'jadwal', 'percobaan'],
    group: 'SEO',
    description: 'Kabar yang menunggu dikirim ke mesin pencari. Baris hilang setelah selesai; hasilnya ada di Log indexing.',
  },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  fields: [
    { name: 'kunci', type: 'text', required: true, unique: true, index: true, admin: { hidden: true } },
    { name: 'langkah', type: 'select', required: true, options: LANGKAH_ANTREAN.map((value) => ({ value, label: LABEL_LANGKAH[value] })) },
    { name: 'path', type: 'text', required: true },
    { name: 'jenis', type: 'select', required: true, options: JENIS_KABAR.map((value) => ({ value, label: LABEL_JENIS[value] })) },
    { name: 'jadwal', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'percobaan', type: 'number', defaultValue: 0, admin: { description: 'Jumlah percobaan yang gagal.' } },
    { name: 'tahap', type: 'number', defaultValue: 0, admin: { description: 'Cek status: 0 = +6 jam, 1 = +24 jam, 2 = +3 hari, 3 = +7 hari, 4 = +14 hari, 5 = +30 hari.' } },
    { name: 'dasar', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' }, description: 'Cek status: waktu kabar, dasar jadwal.' } },
    { name: 'versi', type: 'number', defaultValue: 0, admin: { hidden: true } },
  ],
}
