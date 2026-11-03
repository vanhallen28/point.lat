import type { CollectionConfig } from 'payload'

import { anyone, isLoggedIn } from '@/access'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { validasiUrlOpsional } from '@/lib/validasi'

export const Penulis: CollectionConfig = {
  slug: 'penulis',
  labels: { singular: 'Penulis', plural: 'Penulis' },
  admin: { useAsTitle: 'nama', defaultColumns: ['nama', 'slug'], group: 'Konten' },
  access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  fields: [
    { name: 'nama', type: 'text', required: true },
    slugField('nama'),
    { name: 'foto', type: 'upload', relationTo: 'media' },
    { name: 'bio', type: 'textarea', required: true },
    { name: 'keahlian', type: 'text', hasMany: true },
    {
      name: 'tautan',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true, validate: (value: unknown) => validasiUrlOpsional(value) },
      ],
    },
    seoField,
  ],
}
