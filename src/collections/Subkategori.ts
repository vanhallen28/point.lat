import type { CollectionConfig } from 'payload'

import { anyone, isAdmin } from '@/access'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { buatRedirectSubkategori, catatPathSubkategori } from '@/hooks/redirectSubkategori'
import { revalidasiPublik } from '@/hooks/revalidasiPublik'

const revalidasi = revalidasiPublik('subkategori')

export const Subkategori: CollectionConfig = {
  slug: 'subkategori',
  labels: { singular: 'Subkategori', plural: 'Subkategori' },
  admin: { useAsTitle: 'nama', defaultColumns: ['nama', 'pilar', 'slug'], group: 'Konten' },
  access: { read: anyone, create: isAdmin, update: isAdmin, delete: isAdmin },
  hooks: {
    beforeChange: [catatPathSubkategori],
    afterChange: [buatRedirectSubkategori, revalidasi.afterChange],
    afterDelete: [revalidasi.afterDelete],
  },
  fields: [
    { name: 'nama', type: 'text', required: true },
    slugField('nama'),
    { name: 'pilar', type: 'relationship', relationTo: 'pilar', required: true },
    { name: 'deskripsi', type: 'textarea' },
    seoField,
  ],
}
