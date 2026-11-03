import type { CollectionConfig } from 'payload'

import { isLoggedIn, publishedOrLoggedIn } from '@/access'
import { faqField, sumberField } from '@/fields/konten'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
import { LABEL_TOOL, TOOL_IDS } from '@/lib/konstanta'

const redirect = redirectSaatPathBerubah(targetSederhana('tools'))

export const Tools: CollectionConfig = {
  slug: 'tools',
  labels: { singular: 'Tool', plural: 'Tools' },
  admin: { useAsTitle: 'nama', defaultColumns: ['nama', 'toolId', 'pilar', '_status'], group: 'Tools' },
  access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  hooks: {
    beforeChange: [redirect.catatPathPublik],
    afterChange: [redirect.buatRedirect],
  },
  versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 50 },
  fields: [
    { name: 'nama', type: 'text', required: true },
    slugField('nama'),
    { name: 'pilar', type: 'relationship', relationTo: 'pilar', required: true },
    {
      name: 'toolId',
      type: 'select',
      label: 'Kalkulator',
      required: true,
      unique: true,
      options: TOOL_IDS.map((id) => ({ value: id, label: LABEL_TOOL[id] })),
      admin: { description: 'Rumus kalkulator yang dipakai halaman ini (modul hitung, Rencana 5).' },
    },
    {
      name: 'ringkasan',
      type: 'textarea',
      required: true,
      admin: { description: 'Satu-dua kalimat di atas kalkulator. Dipakai juga sebagai meta default.' },
    },
    {
      name: 'bantuanInput',
      type: 'array',
      label: 'Bantuan per input',
      fields: [
        { name: 'kunci', type: 'text', required: true, admin: { description: 'Nama input di modul hitung.' } },
        { name: 'label', type: 'text', required: true },
        { name: 'bantuan', type: 'textarea' },
      ],
    },
    { name: 'penjelasan', type: 'richText', label: 'Penjelasan rumus' },
    faqField,
    sumberField('sumberAturan', 'Sumber aturan'),
    seoField,
  ],
}
