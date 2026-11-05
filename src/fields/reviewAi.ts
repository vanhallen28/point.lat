import type { Field } from 'payload'

import { BUTIR_REVIEW, validasiButirReview } from '@/modules/ai/review'

/**
 * Tanda artikel yang memakai draf AI. Hanya bisa dinyalakan sidebar Asisten AI (saat editor menyalin draf
 * bagian atau menerapkan Intinya atau FAQ), jadi editor tidak bisa melepasnya diam-diam dari form.
 */
export const pakaiDrafAiField: Field = {
  name: 'pakaiDrafAi',
  type: 'checkbox',
  label: 'Memakai draf AI',
  defaultValue: false,
  admin: {
    position: 'sidebar',
    readOnly: true,
    description: 'Ditandai otomatis saat kamu menyalin draf bagian atau menerapkan Intinya atau FAQ dari Asisten AI.',
  },
}

/** Checklist review manusia, tampil hanya untuk artikel yang memakai draf AI dan wajib lengkap saat terbit. */
export const reviewAiField: Field = {
  name: 'reviewAi',
  type: 'group',
  label: 'Review sebelum terbit',
  admin: { position: 'sidebar', condition: (data) => Boolean(data?.pakaiDrafAi) },
  fields: [
    // Petunjuk dan arti setiap butir dirender komponen sendiri: deskripsi field bawaan Payload memakai warna
    // redup yang gagal kontras WCAG (axe color-contrast).
    { name: 'petunjuk', type: 'ui', admin: { components: { Field: '@/modules/ai/admin/PetunjukReview#PetunjukReview' } } },
    ...BUTIR_REVIEW.map((b): Field => ({ name: b.name, type: 'checkbox', label: b.label, defaultValue: false, validate: validasiButirReview })),
  ],
}
