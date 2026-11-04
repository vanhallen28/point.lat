import type { CollectionConfig } from 'payload'

import { isLoggedIn, publishedOrLoggedIn } from '@/access'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
import { revalidasiPublik } from '@/hooks/revalidasiPublik'
import { validasiVtt } from '@/lib/validasi'

/** Artikel induk tidak disimpan di sini: frontend mencari artikel yang `videoTerkait`-nya video ini. */
const redirect = redirectSaatPathBerubah(targetSederhana('video'))
const revalidasi = revalidasiPublik('video')

export const Video: CollectionConfig = {
  slug: 'video',
  labels: { singular: 'Video', plural: 'Video' },
  admin: { useAsTitle: 'judul', defaultColumns: ['judul', 'pilar', 'durasiDetik', '_status'], group: 'Konten' },
  access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  hooks: {
    beforeChange: [redirect.catatPathPublik, revalidasi.beforeChange],
    afterChange: [redirect.buatRedirect, revalidasi.afterChange],
    afterDelete: [revalidasi.afterDelete],
  },
  versions: { drafts: { autosave: { interval: 1500 } }, maxPerDoc: 30 },
  fields: [
    { name: 'judul', type: 'text', required: true },
    slugField('judul'),
    {
      name: 'file',
      type: 'upload',
      relationTo: 'media',
      required: true,
      filterOptions: { mimeType: { contains: 'video' } },
      admin: { description: 'Video vertikal 9:16, 30-60 detik.' },
    },
    {
      name: 'poster',
      type: 'upload',
      relationTo: 'media',
      filterOptions: { mimeType: { contains: 'image' } },
    },
    { name: 'pilar', type: 'relationship', relationTo: 'pilar', required: true },
    { name: 'durasiDetik', type: 'number', label: 'Durasi (detik)', min: 1 },
    { name: 'transkrip', type: 'textarea', required: true },
    {
      name: 'takarir',
      type: 'textarea',
      label: 'Takarir (WebVTT)',
      validate: (value: unknown) => validasiVtt(value),
      admin: {
        description: 'Opsional. Tempel isi berkas .vtt (baris pertama WEBVTT, lalu cue bertanda waktu). Transkrip tetap tampil di bawah video.',
      },
    },
    seoField,
  ],
}
