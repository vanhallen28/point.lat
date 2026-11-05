import type { CollectionConfig } from 'payload'

import { isAdmin, nobody } from '@/access'

/**
 * Klik, impresi, CTR, dan posisi per path dari Search Analytics (spesifikasi §8 "Dashboard SEO"):
 * ringkasan 28 hari dan klik 7 hari sampai tanggal terakhir yang datanya final (`sampai`). Diganti
 * seluruhnya setiap sinkron harian modul pantau; path yang tidak lagi muncul di laporan ikut hilang.
 * Dibaca dashboard SEO dan blok "Paling dibaca pekan ini" (lewat modul konten).
 */
export const AnalitikHalaman: CollectionConfig = {
  slug: 'analitik-halaman',
  labels: { singular: 'Performa halaman', plural: 'Performa halaman' },
  defaultSort: '-klik28',
  admin: { useAsTitle: 'path', group: 'SEO', hidden: true },
  access: { read: isAdmin, create: nobody, update: nobody, delete: isAdmin },
  fields: [
    { name: 'path', type: 'text', required: true, unique: true, index: true },
    { name: 'klik28', type: 'number', required: true, index: true },
    { name: 'impresi28', type: 'number', required: true },
    { name: 'ctr28', type: 'number', required: true, admin: { description: 'Rasio klik per impresi, 0 sampai 1.' } },
    { name: 'posisi28', type: 'number', required: true },
    { name: 'klik7', type: 'number', required: true, index: true },
    { name: 'impresi7', type: 'number', required: true },
    { name: 'sampai', type: 'text', required: true, admin: { description: 'Tanggal terakhir data (YYYY-MM-DD, waktu Pasifik).' } },
  ],
}
