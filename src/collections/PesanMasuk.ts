import type { CollectionConfig, FieldAccess } from 'payload'

import { isAdmin, isLoggedIn, nobody } from '@/access'
import { endpointKirimPesan } from '@/modules/pembaca/endpoint'
import { LABEL_STATUS_PESAN, LABEL_TOPIK, STATUS_PESAN, TOPIK_PESAN } from '@/modules/pembaca/tipe'

/** Isi pesan tidak diubah lewat admin atau API: hanya status yang dikelola redaksi. */
const tetap: FieldAccess = () => false

/**
 * Pesan dari form kontak (spesifikasi §23). Dibuat hanya lewat `POST /api/pesan-masuk/kirim` (form publik),
 * tanpa email pemberitahuan (keputusan pemilik). Admin dan editor membaca dan mengubah status, hanya admin
 * menghapus. Dihapus otomatis setelah 12 bulan; sidik pengirim (HMAC alamat IP) setelah 24 jam.
 */
export const PesanMasuk: CollectionConfig = {
  slug: 'pesan-masuk',
  labels: { singular: 'Pesan masuk', plural: 'Pesan masuk' },
  defaultSort: '-createdAt',
  admin: {
    useAsTitle: 'nama',
    defaultColumns: ['nama', 'topik', 'status', 'createdAt'],
    group: 'Pembaca',
    listSearchableFields: ['nama', 'email', 'pesan'],
    description: 'Pesan dari form kontak situs. Tidak ada email pemberitahuan: cek halaman ini atau beranda admin.',
  },
  access: { read: isLoggedIn, create: nobody, update: isLoggedIn, delete: isAdmin },
  endpoints: [endpointKirimPesan],
  fields: [
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'baru',
      index: true,
      options: STATUS_PESAN.map((value) => ({ value, label: LABEL_STATUS_PESAN[value] })),
      admin: { position: 'sidebar' },
    },
    { name: 'nama', type: 'text', required: true, access: { update: tetap }, admin: { readOnly: true } },
    { name: 'email', type: 'email', required: true, access: { update: tetap }, admin: { readOnly: true } },
    {
      name: 'topik',
      type: 'select',
      required: true,
      options: TOPIK_PESAN.map((value) => ({ value, label: LABEL_TOPIK[value] })),
      access: { update: tetap },
      admin: { readOnly: true },
    },
    { name: 'pesan', type: 'textarea', required: true, access: { update: tetap }, admin: { readOnly: true } },
    {
      name: 'asal',
      type: 'text',
      label: 'Dikirim dari halaman',
      access: { update: tetap },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'sidik',
      type: 'text',
      index: true,
      access: { read: tetap, update: tetap },
      admin: { hidden: true },
    },
  ],
}
