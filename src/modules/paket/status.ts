import type { Payload } from 'payload'

import { bacaHasil, sedangBerjalan } from './kunci'
import { NAMA_PAKET, PAKET_AWAL } from './paket-awal'
import type { HasilImpor } from './tipe'

export type StatusPaket = {
  nama: string
  total: number
  /** Artikel paket yang sudah ada di situs (draf atau terbit). */
  ada: number
  terbit: number
  /** Waktu mulai impor yang sedang berjalan. */
  berjalan: string | null
  terakhir: HasilImpor | null
  slug: string[]
}

/** Keadaan paket untuk kartu beranda admin dan tombol Impor: dibaca dari artikel dengan slug paket. */
export async function statusPaket(payload: Payload, sekarang = new Date()): Promise<StatusPaket> {
  const slug = PAKET_AWAL.map((a) => a.slug)
  const { docs } = await payload.find({
    collection: 'artikel',
    draft: true,
    where: { slug: { in: slug } },
    limit: slug.length,
    depth: 0,
    select: { slug: true, _status: true },
    overrideAccess: true,
  })
  const { docs: terbit } = await payload.find({
    collection: 'artikel',
    where: { and: [{ slug: { in: slug } }, { _status: { equals: 'published' } }] },
    limit: slug.length,
    depth: 0,
    select: {},
    overrideAccess: true,
  })
  const [berjalan, terakhir] = await Promise.all([sedangBerjalan(payload, sekarang), bacaHasil(payload)])
  return { nama: NAMA_PAKET, total: slug.length, ada: docs.length, terbit: terbit.length, berjalan, terakhir, slug }
}
