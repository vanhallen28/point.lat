import type { CollectionConfig } from 'payload'

import { isAdmin, nobody } from '@/access'

/**
 * Pemakaian anggaran asisten AI per bulan (waktu Jakarta): satu baris per bulan dengan total biaya yang
 * terpakai, termasuk cadangan permintaan yang sedang berjalan. Hanya ditulis modul AI lewat SQL atomik
 * (`anggaran.ts`); tampil di global Asisten AI.
 */
export const PemakaianAi: CollectionConfig = {
  slug: 'pemakaian-ai',
  labels: { singular: 'Pemakaian AI', plural: 'Pemakaian AI' },
  admin: { useAsTitle: 'bulan', group: 'Pengaturan', hidden: true },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  fields: [
    { name: 'bulan', type: 'text', required: true, unique: true, admin: { description: 'YYYY-MM, waktu Jakarta.' } },
    { name: 'terpakai', type: 'number', required: true, defaultValue: 0, label: 'Terpakai (US$)' },
  ],
}
