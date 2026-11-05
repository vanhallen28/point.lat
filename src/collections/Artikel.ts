import { BlocksFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import type { CollectionConfig, PayloadRequest } from 'payload'

import { isLoggedIn, publishedOrLoggedIn } from '@/access'
import { blokArtikel } from '@/blocks/artikel'
import { faqField, sumberField } from '@/fields/konten'
import { seoField } from '@/fields/seo'
import { slugField } from '@/fields/slug'
import { catatTanggalArtikel } from '@/hooks/catatTanggalArtikel'
import { kabariMesinPencari } from '@/hooks/kabariMesinPencari'
import { redirectSaatPathBerubah } from '@/hooks/redirectSaatPathBerubah'
import { revalidasiPublik } from '@/hooks/revalidasiPublik'
import { LABEL_TIPE_ARTIKEL, TIPE_ARTIKEL, type TipeArtikel } from '@/lib/konstanta'
import { validasiLebarGambar } from '@/lib/media'
import type { TargetPath } from '@/lib/paths'
import { endpointAsisten, endpointStatusAsisten } from '@/modules/ai/endpoint'
import { endpointPanelSeo } from '@/modules/seo/endpoint'

async function validasiGambarUtama(value: unknown, { req }: { req: PayloadRequest }) {
  if (!value) return 'Gambar utama wajib diisi.'
  const id = typeof value === 'object' ? (value as { id: number }).id : (value as number)
  const media = await req.payload.findByID({ collection: 'media', id, depth: 0, req })
  return validasiLebarGambar(media.width)
}

const targetArtikel = (doc: { slug?: string | null; tipe?: unknown }): TargetPath | null =>
  doc.slug && doc.tipe ? { jenis: 'artikel', slug: doc.slug, tipe: doc.tipe as TipeArtikel } : null

const redirect = redirectSaatPathBerubah(targetArtikel)
const revalidasi = revalidasiPublik('artikel')
/** `diperbaruiBesar` berubah hanya saat editor menandai perubahan besar (lastmod sitemap ikut berubah). */
const kabar = kabariMesinPencari(targetArtikel, { tanda: (doc) => doc.diperbaruiBesar as string | null })

export const Artikel: CollectionConfig = {
  slug: 'artikel',
  labels: { singular: 'Artikel', plural: 'Artikel' },
  admin: {
    useAsTitle: 'judul',
    defaultColumns: ['judul', 'tipe', 'pilar', '_status', 'statusIndeks', 'updatedAt'],
    group: 'Konten',
  },
  access: { read: publishedOrLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  endpoints: [endpointPanelSeo, endpointAsisten, endpointStatusAsisten],
  versions: {
    drafts: { autosave: { interval: 1500 }, schedulePublish: true },
    maxPerDoc: 50,
  },
  hooks: {
    beforeChange: [catatTanggalArtikel, redirect.catatPathPublik, revalidasi.beforeChange, kabar.beforeChange],
    afterChange: [redirect.buatRedirect, revalidasi.afterChange, kabar.afterChange],
    afterDelete: [revalidasi.afterDelete, kabar.afterDelete],
  },
  fields: [
    { name: 'judul', type: 'text', required: true },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Konten',
          fields: [
            { name: 'deck', type: 'textarea', required: true, admin: { description: 'Satu-dua kalimat di bawah judul.' } },
            {
              name: 'intinya',
              type: 'array',
              label: 'Intinya',
              required: true,
              minRows: 2,
              maxRows: 4,
              labels: { singular: 'Poin', plural: 'Poin' },
              admin: { description: 'Dua sampai empat poin jawaban langsung. Wajib sebelum terbit.' },
              fields: [{ name: 'poin', type: 'text', required: true, maxLength: 220 }],
            },
            {
              name: 'gambarUtama',
              type: 'upload',
              relationTo: 'media',
              required: true,
              filterOptions: { mimeType: { contains: 'image' } },
              admin: { description: 'Minimal 1200px lebarnya.' },
              validate: validasiGambarUtama,
            },
            {
              name: 'isi',
              type: 'richText',
              required: true,
              editor: lexicalEditor({
                features: ({ defaultFeatures }) => [
                  ...defaultFeatures,
                  BlocksFeature({ blocks: blokArtikel }),
                ],
              }),
            },
            faqField,
            sumberField(),
          ],
        },
        {
          label: 'Relasi',
          fields: [
            { name: 'videoTerkait', type: 'relationship', relationTo: 'video' },
            { name: 'toolsTerkait', type: 'relationship', relationTo: 'tools', hasMany: true },
            {
              name: 'artikelTerkait',
              type: 'relationship',
              relationTo: 'artikel',
              hasMany: true,
              filterOptions: ({ id }) => (id ? { id: { not_equals: id } } : true),
            },
          ],
        },
        {
          label: 'SEO',
          fields: [
            {
              name: 'panelSeo',
              type: 'ui',
              admin: { components: { Field: '@/modules/seo/PanelSeo#PanelSeo' } },
            },
            seoField,
          ],
        },
      ],
    },
    slugField('judul', {
      tingkatAtas: { koleksi: 'artikel', berlaku: (data) => data?.tipe !== 'glosarium' },
    }),
    {
      name: 'tipe',
      type: 'select',
      required: true,
      defaultValue: 'panduan',
      options: TIPE_ARTIKEL.map((value) => ({ value, label: LABEL_TIPE_ARTIKEL[value] })),
      admin: { position: 'sidebar' },
    },
    { name: 'pilar', type: 'relationship', relationTo: 'pilar', required: true, admin: { position: 'sidebar' } },
    {
      name: 'subkategori',
      type: 'relationship',
      relationTo: 'subkategori',
      admin: { position: 'sidebar' },
      filterOptions: ({ data }) => (data?.pilar ? { pilar: { equals: data.pilar } } : true),
    },
    { name: 'penulis', type: 'relationship', relationTo: 'penulis', required: true, admin: { position: 'sidebar' } },
    {
      name: 'perubahanBesar',
      type: 'checkbox',
      label: 'Perubahan besar',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Centang bila isi berubah signifikan. Tanggal "Diperbarui" dan lastmod sitemap ikut berubah saat terbit.',
      },
    },
    { name: 'terbitPada', type: 'date', admin: { position: 'sidebar', readOnly: true } },
    { name: 'diperbaruiBesar', type: 'date', label: 'Diperbarui', admin: { position: 'sidebar', readOnly: true } },
    {
      name: 'statusIndeks',
      type: 'ui',
      label: 'Status indeks',
      admin: { components: { Cell: '@/modules/indexer/admin/SelStatusIndeks#SelStatusIndeks' } },
    },
  ],
}
