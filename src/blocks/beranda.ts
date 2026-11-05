import type { Block } from 'payload'

export const BlokHeroBeranda: Block = {
  slug: 'heroBeranda',
  interfaceName: 'BlokHeroBeranda',
  labels: { singular: 'Hero beranda', plural: 'Hero beranda' },
  fields: [
    { name: 'judul', type: 'text', required: true, defaultValue: 'Intinya dulu.' },
    { name: 'subjudul', type: 'textarea' },
    { name: 'placeholderCari', type: 'text', defaultValue: 'misal: cara hitung THR' },
  ],
}

export const BlokMozaikPilihan: Block = {
  slug: 'mozaikPilihan',
  interfaceName: 'BlokMozaikPilihan',
  labels: { singular: 'Mozaik pilihan redaksi', plural: 'Mozaik pilihan redaksi' },
  fields: [
    { name: 'judul', type: 'text' },
    {
      name: 'artikel',
      type: 'relationship',
      relationTo: 'artikel',
      hasMany: true,
      required: true,
      minRows: 1,
      maxRows: 5,
      admin: { description: 'Urutan pertama tampil paling besar.' },
    },
    {
      name: 'tampilkanTools',
      type: 'checkbox',
      label: 'Tampilkan kotak "Hitung sendiri"',
      defaultValue: true,
      admin: { description: 'Daftar kalkulator terbit di baris kedua mozaik.' },
    },
  ],
}

export const BlokStripVideo: Block = {
  slug: 'stripVideo',
  interfaceName: 'BlokStripVideo',
  labels: { singular: 'Strip video', plural: 'Strip video' },
  fields: [
    { name: 'judul', type: 'text', defaultValue: 'Intinya dalam 45 detik' },
    { name: 'video', type: 'relationship', relationTo: 'video', hasMany: true, maxRows: 4 },
  ],
}

export const BlokPalingDibaca: Block = {
  slug: 'palingDibaca',
  interfaceName: 'BlokPalingDibaca',
  labels: { singular: 'Paling dicari', plural: 'Paling dicari' },
  fields: [
    {
      name: 'judul',
      type: 'text',
      defaultValue: 'Paling dicari pekan ini',
      admin: {
        description:
          'Diisi artikel dengan klik Google terbanyak 7 hari terakhir (disinkron harian). Bila datanya belum cukup untuk semua tempat, blok ini menampilkan tulisan terbaru dengan judul "Tulisan terbaru".',
      },
    },
    { name: 'jumlah', type: 'number', defaultValue: 4, min: 1, max: 10 },
  ],
}

export const BlokNewsletter: Block = {
  slug: 'newsletterBlok',
  interfaceName: 'BlokNewsletter',
  labels: { singular: 'Newsletter', plural: 'Newsletter' },
  fields: [
    { name: 'judul', type: 'text', defaultValue: 'Intinya, tiap Senin.' },
    { name: 'teks', type: 'textarea' },
  ],
}

export const BlokSlotIklan: Block = {
  slug: 'slotIklan',
  interfaceName: 'BlokSlotIklan',
  labels: { singular: 'Slot iklan', plural: 'Slot iklan' },
  fields: [
    {
      name: 'idSlot',
      type: 'text',
      required: true,
      admin: { description: 'ID slot dari pengaturan iklan (Rencana 8).' },
    },
  ],
}

/** Blok yang menyusun beranda. Urutannya bisa diubah editor. */
export const blokBeranda: Block[] = [
  BlokHeroBeranda,
  BlokMozaikPilihan,
  BlokStripVideo,
  BlokPalingDibaca,
  BlokNewsletter,
  BlokSlotIklan,
]
