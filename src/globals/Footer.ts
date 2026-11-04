import type { GlobalConfig } from 'payload'

import { anyone, isAdmin } from '@/access'
import { revalidasiFooter } from '@/hooks/revalidasiPublik'
import { validasiUrlOpsional } from '@/lib/validasi'

export const Footer: GlobalConfig = {
  slug: 'footer',
  label: 'Footer',
  admin: { group: 'Tampilan' },
  access: { read: anyone, update: isAdmin },
  hooks: { afterChange: [revalidasiFooter] },
  fields: [
    {
      name: 'tautan',
      type: 'array',
      labels: { singular: 'Tautan', plural: 'Tautan' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
      ],
    },
    {
      name: 'sosial',
      type: 'array',
      labels: { singular: 'Akun sosial', plural: 'Akun sosial' },
      fields: [
        {
          name: 'platform',
          type: 'select',
          required: true,
          options: ['instagram', 'tiktok', 'youtube', 'x', 'facebook', 'threads', 'linkedin'].map(
            (value) => ({ value, label: value }),
          ),
        },
        { name: 'url', type: 'text', required: true, validate: (value: unknown) => validasiUrlOpsional(value) },
      ],
    },
    {
      name: 'saluranWhatsApp',
      type: 'text',
      label: 'Saluran WhatsApp',
      validate: (value: unknown) => validasiUrlOpsional(value),
    },
    { name: 'teksHakCipta', type: 'text', defaultValue: '© 2026 point.lat' },
  ],
}
