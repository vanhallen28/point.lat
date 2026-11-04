'use client'

import type { ImageLoaderProps } from 'next/image'

import { lebarkan } from './url'

/** Kualitas bawaan next/image. Diterjemahkan ke q_auto supaya Cloudinary memilih kompresi terbaik. */
const KUALITAS_BAWAAN = 75

/**
 * Image loader kustom Next.js (`images.loader: 'custom'`, `loaderFile` di next.config.ts).
 * `src` adalah URL Cloudinary dari `bangunUrl`; lebar dari srcset disisipkan sebagai `c_limit,w_<n>`
 * sehingga gambar tidak pernah diperbesar dan tetap `f_auto`.
 */
export default function loaderCloudinary({ src, width, quality }: ImageLoaderProps): string {
  return lebarkan(src, width, quality && quality !== KUALITAS_BAWAAN ? quality : undefined)
}
