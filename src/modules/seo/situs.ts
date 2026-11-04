import type { Payload } from 'payload'

import { klienMedia } from '@/modules/media'

import { ambilPengaturan } from './data'
import type { Situs } from './tipe'

/**
 * Pengaturan situs untuk `metadata()` dan `jsonLd()`: global `pengaturan-seo` (depth 1, supaya logo
 * dan gambar OG default berupa dokumen media) ditambah cloud name Cloudinary dari modul media.
 * Rencana 4 membungkusnya dengan cache bertag `TAG.pengaturanSeo`.
 */
export async function ambilSitus(payload: Payload): Promise<Situs> {
  return { ...(await ambilPengaturan(payload)), cloudName: klienMedia().cloudName }
}
