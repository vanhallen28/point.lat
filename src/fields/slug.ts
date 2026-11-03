import type { Field, PayloadRequest } from 'payload'

import { cariBentrokTingkatAtas, type KoleksiTingkatAtas } from '@/hooks/slugTingkatAtas'
import { buatSlug, validasiFormatSlug } from '@/lib/slug'

export type OpsiSlug = {
  /** Isi untuk koleksi yang path-nya `/{slug}`. `berlaku` menentukan dokumen mana yang dicek. */
  tingkatAtas?: {
    koleksi: KoleksiTingkatAtas
    berlaku?: (data: Partial<Record<string, unknown>>) => boolean
  }
}

type OpsiValidasi = {
  data: Partial<Record<string, unknown>>
  id?: number | string
  req: PayloadRequest
  event?: 'onChange' | 'submit'
}

/**
 * Field slug standar: dibuat dari `sumber` bila kosong, unik per koleksi, format divalidasi.
 * Tidak memakai `required` supaya tipe data boleh tanpa slug; `validasiFormatSlug` yang menolak slug kosong.
 */
export function slugField(sumber = 'judul', opsi: OpsiSlug = {}): Field {
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
    validate: async (value: unknown, { data, id, req, event }: OpsiValidasi) => {
      const format = validasiFormatSlug(value)
      if (format !== true) return format

      const tingkatAtas = opsi.tingkatAtas
      if (!tingkatAtas || event === 'onChange') return true
      if (tingkatAtas.berlaku && !tingkatAtas.berlaku(data)) return true

      const bentrok = await cariBentrokTingkatAtas(req, value as string, {
        koleksi: tingkatAtas.koleksi,
        id,
      })
      return bentrok ?? true
    },
  }
}
