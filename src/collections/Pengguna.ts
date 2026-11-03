import type { CollectionConfig } from 'payload'

/** Versi awal. Peran dan akses ditambahkan di Task 3. */
export const Pengguna: CollectionConfig = {
  slug: 'pengguna',
  labels: { singular: 'Pengguna', plural: 'Pengguna' },
  auth: true,
  admin: { useAsTitle: 'email', group: 'Pengaturan' },
  fields: [{ name: 'nama', type: 'text', required: true }],
}
