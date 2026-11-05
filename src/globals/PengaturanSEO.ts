import type { GlobalConfig } from 'payload'

import { anyone, isAdmin } from '@/access'
import { revalidasiPengaturanSeo } from '@/hooks/revalidasiPublik'
import { validasiPolaJudul } from '@/lib/seo-dasar'
import { validasiUrlOpsional } from '@/lib/validasi'
import { validasiKunciIndexNow, validasiPropertiSearchConsole } from '@/modules/indexer/kunci'

/**
 * Pengaturan SEO tingkat situs dan Mesin Indexing (spesifikasi §6 `pengaturanSEO`). Kredensial Google
 * tidak disimpan di sini: akun layanan dibaca dari env server `GOOGLE_SERVICE_ACCOUNT_JSON`.
 */
export const PengaturanSEO: GlobalConfig = {
  slug: 'pengaturan-seo',
  label: 'Pengaturan SEO',
  admin: { group: 'SEO' },
  access: { read: anyone, update: isAdmin },
  hooks: { afterChange: [revalidasiPengaturanSeo] },
  fields: [
    { name: 'namaSitus', type: 'text', required: true, defaultValue: 'point.' },
    {
      name: 'urlSitus',
      type: 'text',
      required: true,
      defaultValue: 'https://point.lat',
      validate: (value: unknown) => validasiUrlOpsional(value),
    },
    {
      name: 'polaJudul',
      type: 'text',
      required: true,
      defaultValue: '%s · point.',
      validate: (value: unknown) => validasiPolaJudul(value),
      admin: { description: '%s diganti judul halaman.' },
    },
    { name: 'metaDefault', type: 'textarea', defaultValue: 'Intinya dulu. Uang, karier, teknologi, pendidikan, dan kesehatan dijelaskan dari intinya.' },
    { name: 'gambarOgDefault', type: 'upload', relationTo: 'media' },
    {
      name: 'organisasi',
      type: 'group',
      fields: [
        { name: 'nama', type: 'text', defaultValue: 'point.lat' },
        { name: 'logo', type: 'upload', relationTo: 'media' },
        { name: 'sameAs', type: 'text', hasMany: true, admin: { description: 'URL akun resmi point.' } },
      ],
    },
    {
      name: 'verifikasi',
      type: 'group',
      fields: [
        { name: 'google', type: 'text', label: 'Kode verifikasi Google' },
        { name: 'bing', type: 'text', label: 'Kode verifikasi Bing' },
      ],
    },
    {
      name: 'robotsTambahan',
      type: 'textarea',
      label: 'Aturan robots.txt tambahan',
      admin: { description: 'Ditambahkan di bawah aturan bawaan (Rencana 3).' },
    },
    {
      name: 'indexing',
      type: 'group',
      label: 'Mesin Indexing',
      admin: {
        description:
          'Setiap konten terbit, berubah besar, atau dihapus, situs mengabari mesin pencari dan memeriksa status indeksnya di Google.',
      },
      fields: [
        {
          name: 'kunciIndexNow',
          type: 'text',
          label: 'Kunci IndexNow',
          validate: (value: unknown) => validasiKunciIndexNow(value),
          admin: {
            description:
              'Kunci ini tampil di point.lat/{kunci}.txt supaya Bing dan mesin pencari lain percaya kabar dari situs ini. Buat sekali (8 sampai 128 huruf, angka, atau tanda hubung) dan jangan diganti. Kosongkan untuk melewati IndexNow.',
          },
        },
        {
          name: 'propertiSearchConsole',
          type: 'text',
          label: 'Properti Search Console',
          defaultValue: 'sc-domain:point.lat',
          validate: (value: unknown) => validasiPropertiSearchConsole(value),
          admin: { description: 'Properti tempat akun layanan Google ditambahkan sebagai pemilik.' },
        },
        {
          name: 'kuotaInspeksi',
          type: 'number',
          label: 'Batas cek status per hari',
          defaultValue: 1000,
          min: 1,
          max: 2000,
          admin: {
            description:
              'Google mengizinkan 2.000 cek status (URL Inspection) per hari per properti. Batas bawaan 1.000 menyisakan separuh untuk alat lain. Cek di atas batas ditunda ke hari berikutnya.',
          },
        },
        {
          name: 'pakaiIndexingApi',
          type: 'checkbox',
          label: 'Kabari Google lewat Indexing API',
          defaultValue: false,
          admin: {
            description:
              'Biarkan mati. Google hanya mengizinkan Indexing API untuk halaman lowongan kerja (JobPosting) dan siaran langsung (BroadcastEvent), bukan artikel. Sitemap dan cek status tetap berjalan tanpa ini.',
          },
        },
        {
          name: 'kuotaIndexingApi',
          type: 'number',
          label: 'Batas Indexing API per hari',
          defaultValue: 200,
          min: 0,
          admin: {
            description: 'Kuota bawaan Google 200 permintaan per hari per proyek. Kabar di atas batas ditunda ke hari berikutnya.',
            condition: (_, siblingData) => siblingData?.pakaiIndexingApi === true,
          },
        },
      ],
    },
  ],
}
