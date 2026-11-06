'use client'

import { useRowLabel } from '@payloadcms/ui'

import { labelBarisSlot } from '../aturan'

/** Label baris array Slot iklan di global Iklan: ID slot dan posisinya, bukan "Slot 01" (Rencana 8B). */
export function LabelSlot() {
  const { data, rowNumber } = useRowLabel<{ idSlot?: string; posisi?: string; aktif?: boolean }>()
  return <span>{labelBarisSlot(data, rowNumber ?? 0)}</span>
}
