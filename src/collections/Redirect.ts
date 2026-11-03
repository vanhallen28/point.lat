import type { CollectionConfig } from 'payload'

import { isLoggedIn } from '@/access'
import { validasiPathRedirect } from '@/lib/redirect'
import { validasiUrlOpsional } from '@/lib/validasi'

export const Redirect: CollectionConfig = {
  slug: 'redirect',
  labels: { singular: 'Redirect', plural: 'Redirect' },
  admin: { useAsTitle: 'dari', defaultColumns: ['dari', 'ke', 'kode', 'sumber', 'jumlahHit'], group: 'SEO' },
  access: { read: isLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  fields: [
    {
      name: 'dari',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      validate: (value: unknown) => validasiPathRedirect(value),
    },
    {
      name: 'kode',
      type: 'select',
      required: true,
      defaultValue: '301',
      options: [
        { label: '301 Pindah permanen', value: '301' },
        { label: '410 Dihapus permanen', value: '410' },
      ],
    },
    {
      name: 'ke',
      type: 'text',
      admin: { condition: (_, siblingData) => siblingData?.kode !== '410' },
      validate: (value: unknown, { siblingData }: { siblingData: Partial<{ kode: string }> }) => {
        if (siblingData?.kode === '410') return true
        if (typeof value === 'string' && value.startsWith('http')) return validasiUrlOpsional(value)
        return validasiPathRedirect(value)
      },
    },
    {
      name: 'sumber',
      type: 'select',
      defaultValue: 'manual',
      options: [
        { label: 'Otomatis', value: 'otomatis' },
        { label: 'Manual', value: 'manual' },
      ],
      admin: { position: 'sidebar', readOnly: true },
    },
    { name: 'jumlahHit', type: 'number', defaultValue: 0, admin: { position: 'sidebar', readOnly: true } },
  ],
}
