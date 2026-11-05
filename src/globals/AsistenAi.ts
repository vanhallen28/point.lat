import type { GlobalConfig } from 'payload'

import { isAdmin, isLoggedIn } from '@/access'
import { ANGGARAN_BAWAAN, HARGA_BAWAAN } from '@/modules/ai/aturan'

/**
 * Pengaturan asisten AI (spesifikasi §6 `asistenAI`): saklar, anggaran bulanan, harga per model, dan frasa
 * tambahan untuk cek pola tulisan. Kunci API dan nama model tidak disimpan di sini: keduanya di env
 * server (`ANTHROPIC_API_KEY`, `AI_MODEL`), dan statusnya tampil di bagian atas.
 */
export const AsistenAi: GlobalConfig = {
  slug: 'asisten-ai',
  label: 'Asisten AI',
  admin: { group: 'Pengaturan' },
  access: { read: isLoggedIn, update: isAdmin },
  fields: [
    {
      name: 'statusPemasangan',
      type: 'ui',
      admin: { components: { Field: '@/modules/ai/admin/StatusAsisten#StatusAsisten' } },
    },
    {
      name: 'aktif',
      type: 'checkbox',
      label: 'Asisten AI aktif',
      defaultValue: true,
      admin: { description: 'Matikan untuk menonaktifkan semua tombol AI di editor. Cek pola tulisan dan cek klaim tetap bisa dipakai.' },
    },
    {
      name: 'anggaranBulanan',
      type: 'number',
      label: 'Anggaran bulanan (US$)',
      required: true,
      min: 0,
      defaultValue: ANGGARAN_BAWAAN,
      admin: {
        description:
          'Biaya dihitung dari token setiap permintaan dikali harga di bawah, dan direset setiap awal bulan waktu Jakarta. Saat anggaran habis, tombol AI nonaktif.',
      },
    },
    {
      name: 'harga',
      type: 'array',
      label: 'Harga model (US$ per juta token)',
      labels: { singular: 'Model', plural: 'Model' },
      defaultValue: HARGA_BAWAAN,
      admin: {
        description: 'Sesuaikan bila harga di halaman Pricing Claude berubah. Model yang tidak ada di daftar ini tidak akan dipanggil.',
      },
      fields: [
        { name: 'model', type: 'text', required: true, admin: { description: 'ID model API, misalnya claude-sonnet-5-5.' } },
        { name: 'masuk', type: 'number', required: true, min: 0, label: 'Token masuk' },
        { name: 'keluar', type: 'number', required: true, min: 0, label: 'Token keluar' },
      ],
    },
    {
      name: 'frasaKlise',
      type: 'text',
      hasMany: true,
      label: 'Frasa tambahan untuk cek pola tulisan AI',
      admin: { description: 'Ditandai bersama frasa bawaan, misalnya frasa yang sering muncul di draf.' },
    },
  ],
}
