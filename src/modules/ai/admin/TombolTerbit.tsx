'use client'

import { FormSubmit, PublishButton, useFormFields, useTranslation } from '@payloadcms/ui'
import type { PublishButtonClientProps } from 'payload'

import { BUTIR_REVIEW, PETUNJUK_TERBIT, reviewLengkap } from '../review'

/**
 * Tombol terbit artikel (`admin.components.edit.PublishButton`): tombol bawaan Payload, kecuali selama
 * artikel memakai draf AI dan checklist review belum lengkap. Saat itu tombol tampil nonaktif dengan
 * petunjuk sebagai nama aksesibel; petunjuk yang terlihat ada di atas checklist di sidebar. Tanpa tooltip:
 * tooltip Payload yang tersembunyi tetap memakan tempat di kanan tombol dan membuat halaman bergeser
 * horizontal. Validasi koleksi tetap menolak terbit lewat API atau terbit massal (spesifikasi §10).
 */
export function TombolTerbit(props: PublishButtonClientProps) {
  const lengkap = useFormFields(([fields]) =>
    reviewLengkap(
      fields.pakaiDrafAi?.value,
      Object.fromEntries(BUTIR_REVIEW.map((b) => [b.name, fields[`reviewAi.${b.name}`]?.value === true])),
    ),
  )
  const { t } = useTranslation()
  if (lengkap) return <PublishButton {...props} />
  const label = t('version:publishChanges')
  return (
    <FormSubmit aria-label={`${label}. ${PETUNJUK_TERBIT}`} buttonId="action-save" disabled size="medium">
      {label}
    </FormSubmit>
  )
}
