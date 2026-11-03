import type { GlobalConfig } from 'payload'

import { anyone, isAdmin } from '@/access'

export const Header: GlobalConfig = {
  slug: 'header',
  label: 'Header',
  admin: { group: 'Tampilan' },
  access: { read: anyone, update: isAdmin },
  fields: [
    {
      name: 'menu',
      type: 'array',
      labels: { singular: 'Menu', plural: 'Menu' },
      fields: [
        { name: 'label', type: 'text', required: true },
        {
          name: 'jenis',
          type: 'select',
          required: true,
          defaultValue: 'pilar',
          options: [
            { label: 'Pilar', value: 'pilar' },
            { label: 'Tautan', value: 'tautan' },
          ],
        },
        {
          name: 'pilar',
          type: 'relationship',
          relationTo: 'pilar',
          admin: { condition: (_, siblingData) => siblingData?.jenis === 'pilar' },
        },
        {
          name: 'url',
          type: 'text',
          admin: { condition: (_, siblingData) => siblingData?.jenis === 'tautan' },
        },
      ],
    },
    {
      name: 'tombolTools',
      type: 'group',
      fields: [
        { name: 'label', type: 'text', defaultValue: 'Tools' },
        { name: 'url', type: 'text', defaultValue: '/tools' },
      ],
    },
  ],
}
