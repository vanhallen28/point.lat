import type { CollectionConfig } from 'payload'

import { isAdmin, nobody } from '@/access'
import { endpointBerhenti, endpointCsv, endpointDaftar } from '@/modules/pembaca/endpoint'

/**
 * Pelanggan newsletter yang mendaftar lewat form point. (spesifikasi §23, keputusan pemilik: disimpan di
 * database point.). Hanya admin yang melihat dan mengunduh CSV-nya; berhenti langganan menghapus baris.
 * Belum ada pengiriman email: daftar diimpor ke penyedia, yang mengirim konfirmasi dua langkah.
 */
export const PelangganNewsletter: CollectionConfig = {
  slug: 'pelanggan-newsletter',
  labels: { singular: 'Pelanggan newsletter', plural: 'Pelanggan newsletter' },
  defaultSort: '-createdAt',
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'sumber', 'createdAt'],
    group: 'Pembaca',
    description:
      'Email yang mendaftar lewat form newsletter situs, dengan persetujuan. Unduh CSV untuk diimpor ke penyedia email (Kit, Mailchimp, Brevo).',
    components: { beforeListTable: ['@/modules/pembaca/admin/TombolCsv#TombolCsv'] },
  },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  endpoints: [endpointDaftar, endpointBerhenti, endpointCsv],
  fields: [
    { name: 'email', type: 'email', required: true, unique: true, index: true },
    { name: 'sumber', type: 'text', label: 'Mendaftar dari halaman' },
    { name: 'disetujuiPada', type: 'date', required: true, label: 'Persetujuan', admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'sidik', type: 'text', index: true, access: { read: () => false }, admin: { hidden: true } },
  ],
}
