'use client'

import { useRowLabel } from '@payloadcms/ui'

/** Label baris kode sematan di admin: nama kode dan statusnya, supaya daftar yang dilipat tetap terbaca. */
export function LabelBaris() {
  const { data, rowNumber } = useRowLabel<{ nama?: string; aktif?: boolean; jenis?: string }>()
  const nama = data?.nama?.trim() || `Kode ${(rowNumber ?? 0) + 1}`
  const status = data?.aktif === false ? 'mati' : data?.jenis === 'wajib' ? 'aktif, wajib' : 'aktif, butuh persetujuan'
  return (
    <span>
      {nama} ({status})
    </span>
  )
}
