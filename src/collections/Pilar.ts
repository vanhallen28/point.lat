import type { CollectionConfig } from 'payload'

import { anyone, isAdmin } from '@/access'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { WARNA_PILAR } from '@/lib/konstanta'

export const Pilar: CollectionConfig = {
  slug: 'pilar',
  labels: { singular: 'Pilar', plural: 'Pilar' },
  defaultSort: 'urutan',
  admin: {
    useAsTitle: 'nama',
    defaultColumns: ['nama', 'slug', 'warna', 'urutan'],
    group: 'Konten',
  },
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  fields: [
    { name: 'nama', type: 'text', required: true },
    slugField('nama'),
    {
      name: 'warna',
      type: 'select',
      required: true,
      options: Object.entries(WARNA_PILAR).map(([value, warna]) => ({ value, label: warna.label })),
    },
    { name: 'deskripsi', type: 'textarea', required: true },
    { name: 'intro', type: 'richText', label: 'Intro halaman rubrik' },
    { name: 'urutan', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
    seoField,
  ],
}
