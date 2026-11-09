import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { TAG } from '@/lib/tag'

import { ambilFitur, ambilFiturArtikel } from './data'

/** Jaring pengaman bila revalidasi terlewat, sama dengan data halaman publik lain. */
const SEJAM = 3600

/**
 * Saklar fitur untuk halaman publik (artikel, halaman statis, beranda). Tag `fitur` dibuang hook global `fitur`,
 * jadi semua halaman yang memakainya dirender ulang saat saklar berubah.
 */
export const muatFitur = unstable_cache(async () => ambilFitur(await getPayload({ config })), ['fitur'], {
  tags: [TAG.fitur],
  revalidate: SEJAM,
})

/**
 * Fitur halaman artikel (saklar dan kotak newsletter akhir artikel). Tag `fitur` dibuang saat saklar berubah, tag
 * `beranda` saat global `newsletter` berubah (hook `revalidasiNewsletter`).
 */
export const muatFiturArtikel = unstable_cache(async () => ambilFiturArtikel(await getPayload({ config })), ['fitur', 'artikel'], {
  tags: [TAG.fitur, TAG.beranda],
  revalidate: SEJAM,
})
