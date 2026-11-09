import type { GlobalConfig } from 'payload'

import { anyone, isAdmin } from '@/access'
import { revalidasiNewsletter } from '@/hooks/revalidasiPublik'
import { validasiUrlOpsional } from '@/lib/validasi'

export const Newsletter: GlobalConfig = {
  slug: 'newsletter',
  label: 'Newsletter',
  admin: { group: 'Tampilan' },
  access: { read: anyone, update: isAdmin },
  hooks: { afterChange: [revalidasiNewsletter] },
  fields: [
    // Saklar lama (sebelum v1.2.0): diganti saklar Newsletter di Pengaturan, Fitur. Kolomnya tetap (migrasi aditif) dan
    // nilainya disalin ke global `fitur` oleh migrasi `ruang_redaksi`; tidak dibaca lagi.
    { name: 'aktif', type: 'checkbox', defaultValue: false, admin: { hidden: true } },
    {
      name: 'cara',
      type: 'select',
      required: true,
      defaultValue: 'form',
      options: [
        { label: 'Form point. (email disimpan di database point.)', value: 'form' },
        { label: 'Tautan ke form penyedia', value: 'penyedia' },
      ],
      admin: {
        description:
          'Form point.: pembaca mendaftar di situs dan email tersimpan di Pembaca, Pelanggan newsletter (unduh CSV untuk penyedia). Nyalakan newsletter di Pengaturan, Fitur.',
      },
    },
    {
      name: 'diArtikel',
      type: 'checkbox',
      label: 'Tampilkan juga di akhir artikel',
      defaultValue: false,
    },
    {
      name: 'penyedia',
      type: 'select',
      defaultValue: 'belum',
      admin: { condition: (data) => data?.cara === 'penyedia' },
      options: [
        { label: 'Belum dipilih', value: 'belum' },
        { label: 'Kit', value: 'kit' },
        { label: 'Mailchimp', value: 'mailchimp' },
        { label: 'Brevo', value: 'brevo' },
        { label: 'Lainnya', value: 'lainnya' },
      ],
    },
    {
      name: 'urlForm',
      type: 'text',
      label: 'URL form penyedia',
      admin: { condition: (data) => data?.cara === 'penyedia' },
      validate: (value: unknown) => validasiUrlOpsional(value),
    },
    { name: 'judul', type: 'text', defaultValue: 'Intinya, tiap Senin.' },
    { name: 'deskripsi', type: 'textarea', defaultValue: 'Lima tulisan terbaik pekan ini, langsung ke email.' },
    { name: 'tautanArsip', type: 'text', validate: (value: unknown) => validasiUrlOpsional(value) },
  ],
}
