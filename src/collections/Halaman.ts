import type { CollectionConfig } from 'payload'

import { isLoggedIn, publishedOrLoggedIn } from '@/access'
import { blokHalaman } from '@/blocks/halaman'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
import { revalidasiPublik } from '@/hooks/revalidasiPublik'

const redirect = redirectSaatPathBerubah(targetSederhana('halaman'))
const revalidasi = revalidasiPublik('halaman')

export const Halaman: CollectionConfig = {
  slug: 'halaman',
  labels: { singular: 'Halaman', plural: 'Halaman' },
  admin: { useAsTitle: 'judul', defaultColumns: ['judul', 'slug', '_status'], group: 'Konten' },
  access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 30 },
  hooks: {
    beforeChange: [redirect.catatPathPublik, revalidasi.beforeChange],
    afterChange: [redirect.buatRedirect, revalidasi.afterChange],
    afterDelete: [revalidasi.afterDelete],
  },
  fields: [
    { name: 'judul', type: 'text', required: true },
    slugField('judul', { tingkatAtas: { koleksi: 'halaman' } }),
    { name: 'tataLetak', type: 'blocks', label: 'Tata letak', blocks: blokHalaman },
    seoField,
  ],
}
