import type { Field } from 'payload'

import { buatSlug, validasiFormatSlug } from '@/lib/slug'

/**
 * Field slug standar: dibuat dari `sumber` bila kosong, unik per koleksi, format divalidasi.
 * Tidak memakai `required` supaya tipe data boleh tanpa slug; `validasiFormatSlug` yang menolak slug kosong.
 */
export function slugField(sumber = 'judul'): Field {
  return {
    name: 'slug',
    type: 'text',
    unique: true,
    index: true,
    admin: {
      position: 'sidebar',
      description: 'Dibuat otomatis dari judul. Mengubahnya setelah terbit membuat redirect 301.',
    },
    hooks: {
      beforeValidate: [
        ({ value, data, originalDoc }) =>
          buatSlug(value, data?.[sumber] ?? originalDoc?.[sumber]),
      ],
    },
    validate: (value: unknown) => validasiFormatSlug(value),
  }
}
