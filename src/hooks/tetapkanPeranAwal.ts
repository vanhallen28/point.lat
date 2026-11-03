import type { CollectionBeforeChangeHook } from 'payload'

export type Peran = 'admin' | 'editor'

export function peranAwal(jumlahPenggunaSebelumnya: number, diminta?: string | null): Peran {
  if (jumlahPenggunaSebelumnya === 0) return 'admin'
  return diminta === 'admin' ? 'admin' : 'editor'
}

/** Pengguna pertama otomatis admin supaya pemilik tidak terkunci dari panel. */
export const tetapkanPeranAwal: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation !== 'create') return data
  const { totalDocs } = await req.payload.count({ collection: 'pengguna', req })
  return { ...data, peran: peranAwal(totalDocs, data.peran) }
}
