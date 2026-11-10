import type { GlobalConfig } from 'payload'

import { isAdmin } from '@/access'
import { DRAF_PER_HARI, HARI, JAM_SLOT, LABEL_HARI, LABEL_JAM, SLOT_BAWAAN } from '@/modules/otomasi/aturan'
import { JUMLAH_USULAN } from '@/modules/ai/prompt/usulan'

/**
 * Pengaturan Otomasi artikel (spesifikasi §27), hanya admin: saklar, jumlah draf per hari, usulan sekali minta,
 * pilar, penulis, arahan untuk AI, dan slot jadwal terbit. Biaya Claude memakai anggaran bulanan Asisten AI.
 */
export const OtomasiArtikel: GlobalConfig = {
  slug: 'otomasi-artikel',
  label: 'Otomasi artikel',
  admin: {
    group: 'Pengaturan',
    description:
      'AI mengusulkan topik, kamu menyetujui, AI menulis draf lengkap dengan kartu sampul, kamu review, lalu draf terbit sendiri di slot jadwal dan dikabarkan ke Google. Biaya memakai anggaran Asisten AI.',
  },
  access: { read: isAdmin, update: isAdmin },
  fields: [
    {
      name: 'aktif',
      type: 'checkbox',
      label: 'Nyalakan otomasi',
      defaultValue: false,
      admin: { description: 'Mati: tidak ada usulan, draf, atau antrean otomatis. Draf yang sudah terjadwal tetap terbit sesuai jadwalnya.' },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'drafPerHari',
          type: 'number',
          label: 'Draf per hari',
          required: true,
          min: DRAF_PER_HARI.min,
          max: DRAF_PER_HARI.maks,
          defaultValue: DRAF_PER_HARI.bawaan,
          admin: { description: `0 sampai ${DRAF_PER_HARI.maks}. Hanya dari topik yang sudah kamu setujui.` },
        },
        {
          name: 'jumlahUsulan',
          type: 'number',
          label: 'Usulan sekali minta',
          required: true,
          min: JUMLAH_USULAN.min,
          max: JUMLAH_USULAN.maks,
          defaultValue: 8,
          admin: { description: 'Usulan baru diminta otomatis bila usulan yang menunggu sudah habis.' },
        },
      ],
    },
    {
      name: 'pilar',
      type: 'relationship',
      relationTo: 'pilar',
      hasMany: true,
      label: 'Pilar yang diotomasi',
      admin: { description: 'Kosongkan untuk semua pilar.' },
    },
    {
      name: 'penulis',
      type: 'relationship',
      relationTo: 'penulis',
      admin: { description: 'Penulis draf otomatis. Kosongkan untuk Redaksi point.' },
    },
    {
      name: 'arahan',
      type: 'textarea',
      label: 'Arahan untuk AI',
      admin: {
        description:
          'Opsional, dibaca saat mengusulkan dan menulis. Contoh: fokus pekerja baru dan mahasiswa, hindari topik kripto, contoh hitung memakai gaji UMR Jakarta.',
      },
    },
    {
      name: 'slotTerbit',
      type: 'group',
      label: 'Slot jadwal terbit',
      admin: {
        description:
          'Draf yang sudah kamu review masuk ke slot kosong berikutnya. Jam mengikuti jadwal otomatis server (Vercel gratis): terbit antara jam itu sampai 59 menit sesudahnya.',
      },
      fields: [
        {
          name: 'hari',
          type: 'select',
          hasMany: true,
          defaultValue: SLOT_BAWAAN.hari,
          options: HARI.map((value) => ({ value, label: LABEL_HARI[value] })),
        },
        {
          name: 'jam',
          type: 'select',
          hasMany: true,
          label: 'Jam (WIB)',
          defaultValue: SLOT_BAWAAN.jam,
          options: JAM_SLOT.map((value) => ({ value, label: LABEL_JAM[value] })),
        },
      ],
    },
    {
      name: 'antreOtomatis',
      type: 'checkbox',
      label: 'Antre terbit otomatis setelah review',
      defaultValue: true,
      admin: {
        description:
          'Draf otomatis yang checklist review-nya lengkap, tanpa penanda [cek angka], dan bergambar utama masuk slot berikutnya. Matikan bila kamu ingin menjadwalkan sendiri lewat tombol Jadwalkan di editor.',
      },
    },
  ],
}
