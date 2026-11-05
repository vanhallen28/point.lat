import type { CollectionConfig } from 'payload'

import { isAdmin, nobody } from '@/access'
import { LABEL_STATUS_LOG_AI, LABEL_TUGAS_AI, STATUS_LOG_AI, TUGAS_AI } from '@/modules/ai/tipe'

/**
 * Log asisten AI (spesifikasi §6 `logAI`, §10 "Semua pemanggilan dicatat"): satu baris per permintaan ke
 * Claude, termasuk yang ditolak karena anggaran habis. Teks masukan dan keluaran tidak disimpan, hanya
 * ringkasan pendek (keyword atau subjudul): draf dan catatan penulis sudah ada di riwayat versi artikel,
 * dan log tetap kecil. Disimpan 13 bulan. Hanya admin yang membaca; isinya ditulis modul AI.
 */
export const LogAi: CollectionConfig = {
  slug: 'log-ai',
  labels: { singular: 'Log AI', plural: 'Log AI' },
  defaultSort: '-waktu',
  admin: {
    useAsTitle: 'ringkasan',
    defaultColumns: ['waktu', 'tugas', 'status', 'pengguna', 'model', 'biaya'],
    group: 'Pengaturan',
    description: 'Setiap permintaan ke asisten AI: siapa, tugas apa, model, token, dan perkiraan biaya. Disimpan 13 bulan.',
  },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  fields: [
    { name: 'waktu', type: 'date', required: true, index: true, admin: { date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'tugas', type: 'select', required: true, options: TUGAS_AI.map((value) => ({ value, label: LABEL_TUGAS_AI[value] })) },
    { name: 'status', type: 'select', required: true, index: true, options: STATUS_LOG_AI.map((value) => ({ value, label: LABEL_STATUS_LOG_AI[value] })) },
    { name: 'pengguna', type: 'relationship', relationTo: 'pengguna', index: true },
    { name: 'dokumen', type: 'relationship', relationTo: 'artikel', label: 'Artikel' },
    { name: 'ringkasan', type: 'text', admin: { description: 'Keyword brief, subjudul draf, atau judul artikel.' } },
    { name: 'model', type: 'text' },
    { name: 'mode', type: 'select', options: [{ value: 'asli', label: 'asli' }, { value: 'palsu', label: 'palsu' }] },
    { name: 'tokenMasuk', type: 'number', label: 'Token masuk' },
    { name: 'tokenKeluar', type: 'number', label: 'Token keluar' },
    { name: 'biaya', type: 'number', label: 'Biaya (US$)' },
    { name: 'durasiMs', type: 'number', label: 'Durasi (ms)' },
    { name: 'pesan', type: 'textarea' },
  ],
}
