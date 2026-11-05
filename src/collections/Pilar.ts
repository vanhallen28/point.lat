import type { CollectionConfig } from 'payload'

import { anyone, isAdmin } from '@/access'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { kabariMesinPencari } from '@/hooks/kabariMesinPencari'
import { redirectSaatPathBerubah, targetSederhana } from '@/hooks/redirectSaatPathBerubah'
import { redirectSubkategoriPilar } from '@/hooks/redirectSubkategori'
import { revalidasiPublik } from '@/hooks/revalidasiPublik'
import { WARNA_PILAR } from '@/lib/konstanta'

const redirect = redirectSaatPathBerubah(targetSederhana('pilar'))
const revalidasi = revalidasiPublik('pilar')
const kabar = kabariMesinPencari(targetSederhana('pilar'))

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
  hooks: {
    beforeChange: [redirect.catatPathPublik, kabar.beforeChange],
    afterChange: [redirect.buatRedirect, redirectSubkategoriPilar, revalidasi.afterChange, kabar.afterChange],
    afterDelete: [revalidasi.afterDelete, kabar.afterDelete],
  },
  fields: [
    { name: 'nama', type: 'text', required: true },
    slugField('nama', { tingkatAtas: { koleksi: 'pilar' } }),
    {
      name: 'warna',
      type: 'select',
      required: true,
      options: Object.entries(WARNA_PILAR).map(([value, warna]) => ({ value, label: warna.label })),
    },
    { name: 'deskripsi', type: 'textarea', required: true },
    { name: 'intro', type: 'richText', label: 'Intro halaman rubrik' },
    {
      name: 'disclaimer',
      type: 'textarea',
      admin: { description: 'Tampil di akhir setiap artikel pilar ini (wajib untuk Uang & Karier dan Sehat). Kosongkan bila tidak perlu.' },
    },
    { name: 'urutan', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
    seoField,
  ],
}
