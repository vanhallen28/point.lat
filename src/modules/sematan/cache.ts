import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { TAG } from '@/lib/tag'

import { ambilKodeSematan } from './data'

/** Jaring pengaman bila revalidasi terlewat, sama dengan data halaman publik lain. */
const SEJAM = 3600

/**
 * Kode sematan untuk layout publik. Tag `kode-sematan` dibuang hook global itu; tag `halaman` dibuang saat halaman
 * statis berubah status, karena kode "Butuh persetujuan" bergantung pada Kebijakan Privasi yang terbit.
 */
export const muatKodeSematan = unstable_cache(async () => ambilKodeSematan(await getPayload({ config })), ['kode-sematan'], {
  tags: [TAG.kodeSematan, TAG.koleksi('halaman')],
  revalidate: SEJAM,
})
