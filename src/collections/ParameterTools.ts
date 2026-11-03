import type { CollectionConfig } from 'payload'

import { isLoggedIn } from '@/access'
import { LABEL_TOOL, TOOL_IDS } from '@/lib/konstanta'
import { validasiRentangTanggal, validasiUrlOpsional } from '@/lib/validasi'

/** Angka aturan (PTKP, tarif, batas iuran) yang bisa berubah. Dibaca modul hitung sesuai tanggal. */
export const ParameterTools: CollectionConfig = {
  slug: 'parameter-tools',
  labels: { singular: 'Parameter tools', plural: 'Parameter tools' },
  admin: {
    useAsTitle: 'kunci',
    defaultColumns: ['toolId', 'kunci', 'nilai', 'berlakuMulai', 'berlakuSampai'],
    group: 'Tools',
  },
  access: { read: isLoggedIn, create: isLoggedIn, update: isLoggedIn, delete: isLoggedIn },
  fields: [
    {
      name: 'toolId',
      type: 'select',
      required: true,
      options: TOOL_IDS.map((id) => ({ value: id, label: LABEL_TOOL[id] })),
    },
    { name: 'kunci', type: 'text', required: true, admin: { description: 'Contoh: ptkp-tk0' } },
    { name: 'nilai', type: 'number', required: true },
    { name: 'berlakuMulai', type: 'date', required: true },
    {
      name: 'berlakuSampai',
      type: 'date',
      admin: { description: 'Kosongkan bila masih berlaku.' },
      validate: (
        value: unknown,
        { siblingData }: { siblingData: Partial<{ berlakuMulai: string | null }> },
      ) => validasiRentangTanggal(siblingData?.berlakuMulai, value as string | null | undefined),
    },
    {
      name: 'sumber',
      type: 'group',
      fields: [
        { name: 'judul', type: 'text' },
        { name: 'url', type: 'text', validate: (value: unknown) => validasiUrlOpsional(value) },
      ],
    },
    { name: 'catatan', type: 'textarea' },
  ],
}
