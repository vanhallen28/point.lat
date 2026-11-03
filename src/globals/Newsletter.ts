import type { GlobalConfig } from 'payload'

import { anyone, isAdmin } from '@/access'
import { validasiUrlOpsional } from '@/lib/validasi'

export const Newsletter: GlobalConfig = {
  slug: 'newsletter',
  label: 'Newsletter',
  admin: { group: 'Tampilan' },
  access: { read: anyone, update: isAdmin },
  fields: [
    { name: 'aktif', type: 'checkbox', defaultValue: false },
    {
      name: 'penyedia',
      type: 'select',
      defaultValue: 'belum',
      options: [
        { label: 'Belum dipilih', value: 'belum' },
        { label: 'Kit', value: 'kit' },
        { label: 'Mailchimp', value: 'mailchimp' },
        { label: 'Brevo', value: 'brevo' },
        { label: 'Lainnya', value: 'lainnya' },
      ],
    },
    {
      name: 'urlForm',
      type: 'text',
      label: 'URL form penyedia',
      validate: (value: unknown) => validasiUrlOpsional(value),
    },
    { name: 'judul', type: 'text', defaultValue: 'Intinya, tiap Senin.' },
    { name: 'deskripsi', type: 'textarea', defaultValue: 'Lima tulisan terbaik pekan ini, langsung ke email.' },
    { name: 'tautanArsip', type: 'text', validate: (value: unknown) => validasiUrlOpsional(value) },
  ],
}
