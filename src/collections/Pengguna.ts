import type { CollectionConfig } from 'payload'

import { isAdmin, isAdminField, isAdminOrSelf, isLoggedIn } from '@/access'
import { tetapkanPeranAwal } from '@/hooks/tetapkanPeranAwal'
import { tolakPasswordLemah } from '@/hooks/tolakPasswordLemah'

export const Pengguna: CollectionConfig = {
  slug: 'pengguna',
  labels: { singular: 'Pengguna', plural: 'Pengguna' },
  auth: true,
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['nama', 'email', 'peran'],
    group: 'Pengaturan',
  },
  access: {
    read: isLoggedIn,
    create: isAdmin,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  hooks: {
    // Deploy Vercel dan database Supabase: password minimal 15 karakter, bukan contoh .env.example (Rencana 8C).
    beforeValidate: [tolakPasswordLemah],
    beforeChange: [tetapkanPeranAwal],
  },
  fields: [
    { name: 'nama', type: 'text', required: true },
    {
      name: 'peran',
      type: 'select',
      defaultValue: 'editor',
      saveToJWT: true,
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
      ],
      access: { update: isAdminField },
    },
  ],
}
