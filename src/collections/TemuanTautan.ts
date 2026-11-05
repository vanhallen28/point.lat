import type { CollectionConfig } from 'payload'

import { isAdmin, nobody } from '@/access'
import { JENIS_TEMUAN, LABEL_JENIS_TEMUAN } from '@/modules/pantau/tipe'

/**
 * Hasil pindai tautan harian modul pantau (spesifikasi §8 "Tingkat situs"): tautan internal yang rusak
 * atau menuju alamat lama, dan halaman yatim. Diganti seluruhnya setiap pindai; tampil di dashboard SEO
 * dengan tautan ke dokumen yang perlu diperbaiki.
 */
export const TemuanTautan: CollectionConfig = {
  slug: 'temuan-tautan',
  labels: { singular: 'Temuan tautan', plural: 'Temuan tautan' },
  defaultSort: 'jenis',
  admin: { useAsTitle: 'tujuan', group: 'SEO', hidden: true },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  fields: [
    { name: 'jenis', type: 'select', required: true, index: true, options: JENIS_TEMUAN.map((value) => ({ value, label: LABEL_JENIS_TEMUAN[value] })) },
    { name: 'tujuan', type: 'text', required: true, admin: { description: 'Path tujuan tautan, path halaman yatim, atau dokumen yang belum terbit.' } },
    { name: 'pesan', type: 'text', required: true },
    { name: 'sumberKoleksi', type: 'text', required: true },
    { name: 'sumberId', type: 'text' },
    { name: 'sumberJudul', type: 'text', required: true },
    { name: 'sumberPath', type: 'text' },
    { name: 'ditemukan', type: 'date', required: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
  ],
}
