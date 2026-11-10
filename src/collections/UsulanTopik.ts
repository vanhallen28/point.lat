import type { CollectionConfig } from 'payload'

import { isAdmin } from '@/access'
import { LABEL_TIPE_ARTIKEL, LABEL_TOOL, TOOL_IDS } from '@/lib/konstanta'
import { endpointOtomasi } from '@/modules/otomasi/endpoint'
import { LABEL_STATUS_USULAN, STATUS_USULAN } from '@/modules/otomasi/tipe'

const bacaSaja = { readOnly: true }

/**
 * Usulan topik Otomasi artikel (spesifikasi §27): diusulkan Claude atau ditambah pemilik, disetujui atau ditolak
 * pemilik, lalu ditulis menjadi draf artikel, direview, dan terbit di slot jadwal. Hanya admin. Topik yang
 * ditambah pemilik sendiri langsung berstatus disetujui.
 */
export const UsulanTopik: CollectionConfig = {
  slug: 'usulan-topik',
  labels: { singular: 'Usulan topik', plural: 'Usulan topik' },
  defaultSort: '-createdAt',
  admin: {
    useAsTitle: 'judul',
    group: 'Konten',
    defaultColumns: ['judul', 'pilar', 'status', 'sumber', 'updatedAt'],
    listSearchableFields: ['judul', 'kataKunci'],
    description:
      'Topik untuk draf artikel otomatis. Setujui usulan yang ingin ditulis, atau tambah topikmu sendiri. Pengaturan ada di Pengaturan, Otomasi artikel.',
  },
  access: { read: isAdmin, create: isAdmin, update: isAdmin, delete: isAdmin },
  endpoints: endpointOtomasi,
  fields: [
    { name: 'judul', type: 'text', required: true, label: 'Judul kerja' },
    { name: 'kataKunci', type: 'text', required: true, label: 'Keyphrase utama', admin: { description: 'Kata yang diketik orang di Google, 2 sampai 6 kata.' } },
    {
      type: 'row',
      fields: [
        { name: 'pilar', type: 'relationship', relationTo: 'pilar', required: true },
        { name: 'subkategori', type: 'relationship', relationTo: 'subkategori', admin: { description: 'Kosongkan bila memakai subkategori baru di bawah.' } },
      ],
    },
    {
      name: 'subkategoriBaru',
      type: 'group',
      label: 'Subkategori baru (usulan AI)',
      admin: { condition: (data) => !data?.subkategori, description: 'Dibuat saat draf ditulis bila slug-nya belum ada.' },
      fields: [
        { name: 'nama', type: 'text' },
        { name: 'slug', type: 'text' },
        { name: 'deskripsi', type: 'text' },
      ],
    },
    {
      name: 'tipe',
      type: 'select',
      required: true,
      defaultValue: 'panduan',
      options: (['panduan', 'explainer', 'daftar'] as const).map((value) => ({ value, label: LABEL_TIPE_ARTIKEL[value] })),
    },
    { name: 'alasan', type: 'textarea', admin: { description: 'Kenapa topik ini dicari dan apa yang didapat pembaca. Ikut dibaca AI saat menulis.' } },
    { name: 'tools', type: 'select', hasMany: true, label: 'Kalkulator terkait', options: TOOL_IDS.map((value) => ({ value, label: LABEL_TOOL[value] })) },
    {
      name: 'status',
      type: 'select',
      required: true,
      index: true,
      defaultValue: 'disetujui',
      options: STATUS_USULAN.map((value) => ({ value, label: LABEL_STATUS_USULAN[value] })),
      admin: { position: 'sidebar', description: 'Ubah ke Disetujui supaya ditulis, atau Ditolak supaya tidak diusulkan lagi.' },
    },
    {
      name: 'sumber',
      type: 'select',
      defaultValue: 'pemilik',
      options: [
        { value: 'ai', label: 'Usulan AI' },
        { value: 'pemilik', label: 'Ditambah pemilik' },
      ],
      admin: { position: 'sidebar', ...bacaSaja },
    },
    { name: 'artikel', type: 'relationship', relationTo: 'artikel', label: 'Draf artikel', admin: { position: 'sidebar', ...bacaSaja } },
    { name: 'jadwal', type: 'date', label: 'Jadwal terbit', admin: { position: 'sidebar', ...bacaSaja, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'waktuDitulis', type: 'date', label: 'Ditulis pada', index: true, admin: { position: 'sidebar', ...bacaSaja, date: { pickerAppearance: 'dayAndTime' } } },
    { name: 'skorSeo', type: 'text', label: 'Panel SEO', admin: { position: 'sidebar', ...bacaSaja, description: 'Cek hijau dari seluruh cek panel SEO saat draf ditulis.' } },
    { name: 'cekAngka', type: 'number', label: 'Penanda [cek angka]', admin: { position: 'sidebar', ...bacaSaja } },
    { name: 'percobaan', type: 'number', defaultValue: 0, admin: { position: 'sidebar', ...bacaSaja } },
    {
      name: 'catatan',
      type: 'textarea',
      label: 'Yang perlu dicek',
      admin: { ...bacaSaja, description: 'Daftar dari AI untuk review: angka, aturan, tanggal, dan nama program yang wajib diperiksa ke sumber resmi.' },
    },
    { name: 'pesan', type: 'textarea', label: 'Pesan terakhir', admin: { ...bacaSaja } },
  ],
}
