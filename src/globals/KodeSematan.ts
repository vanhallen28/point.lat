import type { GlobalConfig } from 'payload'

import { isAdmin } from '@/access'
import { revalidasiKodeSematan } from '@/hooks/revalidasiPublik'
import { JENIS_SEMATAN, LABEL_JENIS_SEMATAN, LABEL_POSISI_SEMATAN, MAKS_KODE, POSISI_SEMATAN } from '@/modules/sematan/tipe'
import { validasiKuki } from '@/modules/sematan/aturan'

/**
 * Kode sematan (spesifikasi §23): tempat menempel kode pihak ketiga (Google Analytics, Meta Pixel, chat)
 * seperti plugin "header dan footer" WordPress. Hanya admin, karena kode di sini berjalan di browser setiap
 * pembaca. Dirender layout publik sebagai data dan dipasang pemuat kecil di browser; kode jenis "Butuh
 * persetujuan" baru dipasang setelah pembaca memilih "Izinkan semua".
 */
export const KodeSematan: GlobalConfig = {
  slug: 'kode-sematan',
  label: 'Kode sematan',
  admin: {
    group: 'Pengaturan',
    description:
      'Kode dari layanan lain (Google Analytics, Meta Pixel, widget chat). Setiap kode memperlambat situs dan bisa membaca isi halaman: tempel hanya kode dari layanan yang kamu percaya.',
  },
  access: { read: isAdmin, update: isAdmin },
  hooks: { afterChange: [revalidasiKodeSematan] },
  fields: [
    {
      name: 'kode',
      type: 'array',
      label: 'Daftar kode',
      labels: { singular: 'Kode', plural: 'Kode' },
      admin: { initCollapsed: false, components: { RowLabel: '@/modules/sematan/admin/LabelBaris#LabelBaris' } },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'nama', type: 'text', required: true, admin: { width: '50%', description: 'Misalnya "Google Analytics".' } },
            { name: 'aktif', type: 'checkbox', defaultValue: true, admin: { width: '50%', style: { alignSelf: 'center' } } },
          ],
        },
        {
          type: 'row',
          fields: [
            {
              name: 'posisi',
              type: 'select',
              required: true,
              defaultValue: 'head',
              options: POSISI_SEMATAN.map((value) => ({ value, label: LABEL_POSISI_SEMATAN[value] })),
              admin: { width: '50%', description: 'Ikuti petunjuk layanannya. Kebanyakan kode analitik di dalam <head>.' },
            },
            {
              name: 'jenis',
              type: 'select',
              required: true,
              defaultValue: 'persetujuan',
              options: JENIS_SEMATAN.map((value) => ({ value, label: LABEL_JENIS_SEMATAN[value] })),
              admin: {
                width: '50%',
                description: 'Analitik, iklan, dan pelacak wajib "Butuh persetujuan" (UU PDP). "Wajib" hanya untuk kode yang tidak memakai cookie atau data pembaca.',
              },
            },
          ],
        },
        {
          name: 'kuki',
          type: 'text',
          label: 'Cookie yang dipakai',
          validate: (value: unknown) => validasiKuki(value),
          admin: {
            description: 'Nama cookie dipisah koma, misalnya _ga, _ga_* , _fbp. Dihapus saat pembaca menarik persetujuan. Tanda * untuk awalan.',
          },
        },
        {
          name: 'kode',
          type: 'code',
          label: 'Kode HTML',
          required: true,
          maxLength: MAKS_KODE,
          admin: { language: 'html', description: 'Tempel persis seperti dari layanannya, termasuk tag <script>.' },
        },
      ],
    },
  ],
}
