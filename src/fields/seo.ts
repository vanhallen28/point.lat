import type { Field } from 'payload'

import { validasiUrlOpsional } from '@/lib/validasi'

/** Grup SEO yang dipakai semua dokumen publik. Analisis & pratinjau ditambahkan di Rencana 3. */
export const seoField: Field = {
  name: 'seo',
  type: 'group',
  label: 'SEO',
  fields: [
    { name: 'keyphrase', type: 'text', label: 'Keyphrase utama' },
    { name: 'keyphraseSekunder', type: 'text', hasMany: true, label: 'Keyphrase sekunder' },
    {
      name: 'judulSEO',
      type: 'text',
      label: 'Judul SEO',
      admin: { description: 'Ideal 50-60 karakter. Kosongkan untuk memakai judul.' },
    },
    {
      name: 'metaDeskripsi',
      type: 'textarea',
      label: 'Meta description',
      admin: { description: 'Ideal 150-160 karakter.' },
    },
    {
      name: 'gambarOG',
      type: 'upload',
      relationTo: 'media',
      label: 'Gambar OG',
      admin: { description: 'Kosongkan untuk dibuat otomatis.' },
    },
    {
      name: 'canonical',
      type: 'text',
      label: 'Canonical URL',
      validate: (value: unknown) => validasiUrlOpsional(value),
    },
    {
      name: 'tipeSchema',
      type: 'select',
      label: 'Tipe schema',
      defaultValue: 'otomatis',
      options: [
        { label: 'Otomatis', value: 'otomatis' },
        { label: 'Article', value: 'Article' },
        { label: 'NewsArticle', value: 'NewsArticle' },
      ],
    },
    { name: 'noindex', type: 'checkbox', label: 'Jangan indeks halaman ini', defaultValue: false },
  ],
}
