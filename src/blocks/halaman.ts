import type { Block } from 'payload'

import { faqField } from '@/fields/konten'

import { BlokEmbedTool } from './artikel'

export const BlokHero: Block = {
  slug: 'hero',
  interfaceName: 'BlokHero',
  labels: { singular: 'Hero', plural: 'Hero' },
  fields: [
    { name: 'judul', type: 'text', required: true },
    { name: 'subjudul', type: 'textarea' },
    { name: 'gambar', type: 'upload', relationTo: 'media' },
  ],
}

export const BlokTeks: Block = {
  slug: 'teks',
  interfaceName: 'BlokTeks',
  labels: { singular: 'Teks', plural: 'Teks' },
  fields: [{ name: 'isi', type: 'richText', required: true }],
}

export const BlokKartu: Block = {
  slug: 'kartu',
  interfaceName: 'BlokKartu',
  labels: { singular: 'Kartu', plural: 'Kartu' },
  fields: [
    { name: 'judul', type: 'text' },
    {
      name: 'kartu',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        { name: 'judul', type: 'text', required: true },
        { name: 'teks', type: 'textarea' },
        { name: 'tautan', type: 'text' },
      ],
    },
  ],
}

export const BlokCta: Block = {
  slug: 'cta',
  interfaceName: 'BlokCta',
  labels: { singular: 'Ajakan (CTA)', plural: 'Ajakan (CTA)' },
  fields: [
    { name: 'judul', type: 'text', required: true },
    { name: 'teks', type: 'textarea' },
    { name: 'labelTombol', type: 'text', required: true },
    { name: 'tautan', type: 'text', required: true },
  ],
}

export const BlokFaq: Block = {
  slug: 'faqBlok',
  interfaceName: 'BlokFaq',
  labels: { singular: 'FAQ', plural: 'FAQ' },
  fields: [{ name: 'judul', type: 'text' }, faqField],
}

export const BlokFormKontak: Block = {
  slug: 'formKontak',
  interfaceName: 'BlokFormKontak',
  labels: { singular: 'Form kontak', plural: 'Form kontak' },
  admin: {
    // Penjelasan di form blok: blok baru tampil di situs bila saklarnya menyala (spesifikasi §23).
    disableBlockName: true,
  },
  fields: [
    { name: 'judul', type: 'text', defaultValue: 'Kirim pesan' },
    {
      name: 'pengantar',
      type: 'textarea',
      defaultValue: 'Untuk koreksi, hak jawab, atau kerja sama. Kami membaca setiap pesan dan membalas lewat email bila perlu.',
      admin: { description: 'Form tampil di situs bila Form kontak dinyalakan di Pengaturan, Fitur. Pesan masuk ke Pembaca, Pesan masuk.' },
    },
  ],
}

/** Blok page builder untuk koleksi halaman. */
export const blokHalaman: Block[] = [BlokHero, BlokTeks, BlokKartu, BlokCta, BlokFaq, BlokEmbedTool, BlokFormKontak]
