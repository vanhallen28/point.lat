import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { getPayload } from 'payload'

import { TAG } from '@/lib/tag'

import { isiAdsTxt } from './aturan'
import { ambilIklan } from './data'

/** Jaring pengaman bila revalidasi terlewat, sama dengan data halaman publik lain. */
const SEJAM = 3600

/**
 * Pengaturan iklan untuk layout (banner persetujuan, pemuat iklan) dan halaman berslot iklan. Tag `iklan`
 * dibuang hook global `iklan`, dan tag `halaman` dibuang saat halaman statis terbit, batal terbit, atau dihapus
 * (status Kebijakan Privasi ikut menentukan `iklanSiap`), jadi semua halaman yang memakainya dirender ulang.
 */
export const muatIklan = unstable_cache(async () => ambilIklan(await getPayload({ config })), ['iklan', 'pengaturan'], {
  tags: [TAG.iklan, TAG.koleksi('halaman')],
  revalidate: SEJAM,
})

/** Isi `/ads.txt`, atau `null` bila tidak ada baris (rute menjawab 404). */
export const muatAdsTxt = unstable_cache(async () => isiAdsTxt(await ambilIklan(await getPayload({ config }))), ['iklan', 'ads-txt'], {
  tags: [TAG.iklan],
  revalidate: SEJAM,
})
