import type { GlobalConfig } from 'payload'

import { anyone, isAdmin } from '@/access'
import { revalidasiFitur } from '@/hooks/revalidasiPublik'
import { FITUR_BAWAAN } from '@/modules/fitur/data'

/**
 * Halaman Fitur (spesifikasi §23): pengganti halaman Plugin WordPress. Setiap saklar menyalakan fitur bawaan
 * point. di situs; fitur baru datang lewat zip pembaruan, bukan unggahan. Ringkasan di atas menampilkan fitur
 * yang diatur di halaman lain (Iklan, Asisten AI, Mesin Indexing, Kode sematan).
 */
export const Fitur: GlobalConfig = {
  slug: 'fitur',
  label: 'Fitur',
  admin: {
    group: 'Pengaturan',
    description: 'Nyalakan atau matikan fitur situs tanpa menyentuh kode. Perubahan tampil di situs setelah disimpan.',
  },
  access: { read: anyone, update: isAdmin },
  hooks: { afterChange: [revalidasiFitur] },
  fields: [
    { name: 'ringkasan', type: 'ui', admin: { components: { Field: '@/modules/fitur/admin/RingkasanFitur#RingkasanFitur' } } },
    {
      name: 'formKontak',
      type: 'checkbox',
      label: 'Form kontak',
      defaultValue: FITUR_BAWAAN.formKontak,
      admin: {
        description:
          'Blok "Form kontak" di halaman statis (misalnya halaman Kontak) tampil dan menerima pesan. Pesan masuk ke Pembaca, Pesan masuk, tanpa email.',
      },
    },
    {
      name: 'newsletter',
      type: 'checkbox',
      label: 'Newsletter',
      defaultValue: FITUR_BAWAAN.newsletter,
      admin: {
        description: 'Kotak newsletter di beranda (dan di akhir artikel bila dipilih di Tampilan, Newsletter). Caranya diatur di Tampilan, Newsletter.',
      },
    },
    {
      name: 'tombolBagikan',
      type: 'checkbox',
      label: 'Tombol bagikan',
      defaultValue: FITUR_BAWAAN.tombolBagikan,
      admin: { description: 'WhatsApp, Telegram, X, Facebook, dan Salin tautan di akhir artikel. Tanpa skrip pihak ketiga.' },
    },
    {
      name: 'daftarIsi',
      type: 'checkbox',
      label: 'Daftar isi artikel',
      defaultValue: FITUR_BAWAAN.daftarIsi,
      admin: { description: 'Daftar subjudul di awal artikel yang panjang.' },
    },
    {
      name: 'waktuBaca',
      type: 'checkbox',
      label: 'Waktu baca',
      defaultValue: FITUR_BAWAAN.waktuBaca,
      admin: { description: 'Perkiraan "N menit baca" di bawah judul artikel.' },
    },
    {
      name: 'statistikKunjungan',
      type: 'checkbox',
      label: 'Statistik kunjungan',
      defaultValue: FITUR_BAWAAN.statistikKunjungan,
      admin: {
        description:
          'Mencatat halaman yang dibuka pembaca untuk Statistik kunjungan di beranda admin, tanpa cookie dan tanpa menyimpan IP. Setiap halaman yang dibuka memakai satu pemanggilan fungsi Vercel; matikan bila kuota Vercel bulan ini hampir habis.',
      },
    },
  ],
}
