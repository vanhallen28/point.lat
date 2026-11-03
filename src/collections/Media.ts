import type { CollectionConfig } from 'payload'

import { anyone, isLoggedIn } from '@/access'
import { validasiAlt } from '@/lib/media'

/**
 * Sementara menyimpan file di disk lokal (folder `media/`, tidak di-commit).
 * Rencana 2 memindahkan penyimpanan ke Cloudinary tanpa mengubah field di sini.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Media', plural: 'Media' },
  admin: { useAsTitle: 'alt', defaultColumns: ['filename', 'alt', 'width', 'mimeType'], group: 'Konten' },
  access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  upload: {
    mimeTypes: ['image/*', 'video/mp4', 'video/webm'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Teks alternatif',
      admin: { description: 'Jelaskan isi gambar untuk pembaca layar. Wajib untuk gambar.' },
      validate: (value: unknown, { data }: { data: Partial<{ mimeType: string | null }> }) =>
        validasiAlt(value, data?.mimeType),
    },
    { name: 'caption', type: 'text' },
    { name: 'kredit', type: 'text', admin: { description: 'Contoh: Foto: Nama Fotografer / Sumber' } },
  ],
}
