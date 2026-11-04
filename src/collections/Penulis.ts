import type { CollectionConfig } from 'payload'

import { anyone, isLoggedIn } from '@/access'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
import { revalidasiPublik } from '@/hooks/revalidasiPublik'
import { validasiUrlOpsional } from '@/lib/validasi'

const redirect = redirectSaatPathBerubah(targetSederhana('penulis'))
const revalidasi = revalidasiPublik('penulis')

export const Penulis: CollectionConfig = {
  slug: 'penulis',
  labels: { singular: 'Penulis', plural: 'Penulis' },
  admin: { useAsTitle: 'nama', defaultColumns: ['nama', 'slug'], group: 'Konten' },
  access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  hooks: {
    beforeChange: [redirect.catatPathPublik],
    afterChange: [redirect.buatRedirect, revalidasi.afterChange],
    afterDelete: [revalidasi.afterDelete],
  },
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
