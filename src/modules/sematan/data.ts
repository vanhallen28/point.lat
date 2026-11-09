import type { Payload } from 'payload'

import { kebijakanPrivasiTerbit } from '@/modules/iklan/data'

import { susunKode } from './aturan'
import type { KodeTerpasang } from './tipe'

/** Kode sematan yang dipasang di situs, dari database tanpa cache. Layout memakai `muatKodeSematan`. */
export async function ambilKodeSematan(payload: Payload): Promise<KodeTerpasang[]> {
  const [doc, kebijakanTerbit] = await Promise.all([payload.findGlobal({ slug: 'kode-sematan', depth: 0 }), kebijakanPrivasiTerbit(payload)])
  return susunKode(doc, kebijakanTerbit)
}
