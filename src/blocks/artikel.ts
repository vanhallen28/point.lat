import type { Block } from 'payload'

export const BlokCallout: Block = {
  slug: 'callout',
  interfaceName: 'BlokCallout',
  labels: { singular: 'Callout', plural: 'Callout' },
  fields: [
    {
      name: 'gaya',
      type: 'select',
      required: true,
      defaultValue: 'info',
      options: [
        { label: 'Info', value: 'info' },
        { label: 'Tips', value: 'tips' },
        { label: 'Peringatan', value: 'peringatan' },
      ],
    },
    { name: 'judul', type: 'text' },
    { name: 'isi', type: 'textarea', required: true },
  ],
}

export const BlokEmbedTool: Block = {
  slug: 'embedTool',
  interfaceName: 'BlokEmbedTool',
  labels: { singular: 'Embed tool', plural: 'Embed tool' },
  fields: [{ name: 'tool', type: 'relationship', relationTo: 'tools', required: true }],
}

export const BlokEmbedVideo: Block = {
  slug: 'embedVideo',
  interfaceName: 'BlokEmbedVideo',
  labels: { singular: 'Embed video', plural: 'Embed video' },
  fields: [{ name: 'video', type: 'relationship', relationTo: 'video', required: true }],
}

export const BlokTabelPerbandingan: Block = {
  slug: 'tabelPerbandingan',
  interfaceName: 'BlokTabelPerbandingan',
  labels: { singular: 'Tabel perbandingan', plural: 'Tabel perbandingan' },
  fields: [
    { name: 'judul', type: 'text' },
    {
      name: 'kolom',
      type: 'array',
      required: true,
      minRows: 2,
      fields: [{ name: 'label', type: 'text', required: true }],
    },
    {
      name: 'baris',
      type: 'array',
      required: true,
      minRows: 1,
      fields: [
        {
          name: 'sel',
          type: 'array',
          required: true,
          fields: [{ name: 'teks', type: 'text', required: true }],
        },
      ],
    },
  ],
}

/** Blok yang bisa disisipkan di tengah isi artikel. */
export const blokArtikel: Block[] = [BlokCallout, BlokEmbedTool, BlokEmbedVideo, BlokTabelPerbandingan]
