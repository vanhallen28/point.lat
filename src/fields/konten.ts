import type { Field } from 'payload'

import { validasiUrlOpsional } from '@/lib/validasi'

export const faqField: Field = {
  name: 'faq',
  type: 'array',
  label: 'FAQ',
  labels: { singular: 'Pertanyaan', plural: 'Pertanyaan' },
  fields: [
    { name: 'pertanyaan', type: 'text', required: true },
    { name: 'jawaban', type: 'textarea', required: true },
  ],
}

export function sumberField(name = 'sumber', label = 'Sumber'): Field {
  return {
    name,
    type: 'array',
    label,
    labels: { singular: 'Sumber', plural: 'Sumber' },
    admin: { description: 'Sumber resmi atau tepercaya yang dipakai di tulisan ini.' },
    fields: [
      { name: 'judul', type: 'text', required: true },
      {
        name: 'url',
        type: 'text',
        required: true,
        validate: (value: unknown) => validasiUrlOpsional(value),
      },
      { name: 'penerbit', type: 'text', admin: { description: 'Contoh: DJP, BPJS Kesehatan' } },
      { name: 'diaksesPada', type: 'date', label: 'Diakses pada' },
    ],
  }
}
