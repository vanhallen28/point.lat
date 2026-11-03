import type { GlobalConfig } from 'payload'

import { anyone, isAdmin } from '@/access'
import { validasiPolaJudul } from '@/lib/seo-dasar'
import { validasiUrlOpsional } from '@/lib/validasi'

/** Pengaturan SEO tingkat situs. Rencana 6 menambahkan pengaturan Mesin Indexing di sini. */
export const PengaturanSEO: GlobalConfig = {
  slug: 'pengaturan-seo',
  label: 'Pengaturan SEO',
  admin: { group: 'SEO' },
  access: { read: anyone, update: isAdmin },
  fields: [
    { name: 'namaSitus', type: 'text', required: true, defaultValue: 'point.' },
    {
      name: 'urlSitus',
      type: 'text',
      required: true,
      defaultValue: 'https://point.lat',
      validate: (value: unknown) => validasiUrlOpsional(value),
    },
    {
      name: 'polaJudul',
      type: 'text',
      required: true,
      defaultValue: '%s · point.',
      validate: (value: unknown) => validasiPolaJudul(value),
      admin: { description: '%s diganti judul halaman.' },
    },
    { name: 'metaDefault', type: 'textarea', defaultValue: 'Intinya dulu. Uang, karier, teknologi, pendidikan, dan kesehatan dijelaskan dari intinya.' },
    { name: 'gambarOgDefault', type: 'upload', relationTo: 'media' },
    {
      name: 'organisasi',
      type: 'group',
      fields: [
        { name: 'nama', type: 'text', defaultValue: 'point.lat' },
        { name: 'logo', type: 'upload', relationTo: 'media' },
        { name: 'sameAs', type: 'text', hasMany: true, admin: { description: 'URL akun resmi point.' } },
      ],
    },
    {
      name: 'verifikasi',
      type: 'group',
      fields: [
        { name: 'google', type: 'text', label: 'Kode verifikasi Google' },
        { name: 'bing', type: 'text', label: 'Kode verifikasi Bing' },
      ],
    },
    {
      name: 'robotsTambahan',
      type: 'textarea',
      label: 'Aturan robots.txt tambahan',
      admin: { description: 'Ditambahkan di bawah aturan bawaan (Rencana 3).' },
    },
  ],
}
