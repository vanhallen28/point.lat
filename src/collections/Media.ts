import type { CollectionConfig, FieldAccess } from 'payload'

import { anyone, isLoggedIn } from '@/access'
import { revalidasiKoleksi } from '@/hooks/revalidasiPublik'
import { validasiAlt } from '@/lib/media'
import { TAG } from '@/lib/tag'
import { JENIS_FILE } from '@/modules/media/unggah'

/** Field yang hanya boleh diisi sistem (adapter Cloudinary), tidak lewat API atau form admin. */
const hanyaSistem: FieldAccess = () => false

/** Alt, caption, dan kredit tampil di halaman publik: perubahan media membuang cache halaman. */
const revalidasi = revalidasiKoleksi([TAG.media])

/**
 * File disimpan di Cloudinary lewat adapter `src/modules/media/adapter.ts` yang dipasang di
 * `payload.config.ts` (plugin cloud storage, `disableLocalStorage: true`). Field lama tetap.
 */
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Media', plural: 'Media' },
  admin: {
    useAsTitle: 'alt',
    defaultColumns: ['filename', 'alt', 'jenis', 'width', 'mimeType'],
    group: 'Konten',
  },
  access: { read: anyone, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  hooks: { afterChange: [revalidasi.afterChange], afterDelete: [revalidasi.afterDelete] },
  upload: {
    mimeTypes: [...JENIS_FILE],
    // Potongan dibuat Cloudinary (g_auto), bukan sharp. Focal point dibiarkan aktif supaya kolom
    // focal_x/focal_y dari Rencana 1 tetap ada (perubahan skema harus aditif).
    crop: false,
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
    {
      name: 'publicId',
      type: 'text',
      label: 'Public ID Cloudinary',
      index: true,
      access: { create: hanyaSistem, update: hanyaSistem },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'jenis',
      type: 'select',
      options: [
        { label: 'Gambar', value: 'gambar' },
        { label: 'Video', value: 'video' },
      ],
      access: { create: hanyaSistem, update: hanyaSistem },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'durasi',
      type: 'number',
      label: 'Durasi (detik)',
      access: { create: hanyaSistem, update: hanyaSistem },
      admin: { readOnly: true, position: 'sidebar', condition: (data) => data?.jenis === 'video' },
    },
  ],
}
