import type { Payload, PayloadRequest } from 'payload'

import { PAKET_AWAL } from './paket-awal'

type Simpul = { type?: string; fields?: { blockType?: string; kolom?: { label?: string | null }[] }; children?: Simpul[] }
type Isi = { root?: Simpul } | null | undefined

/** Label pengganti kolom tabel yang kosong (kolom pertama tabel PPh 21 THR di v1.3.0). */
export const LABEL_KOLOM_KOSONG = 'Komponen'

/**
 * Isi dengan label kolom Tabel perbandingan yang kosong diganti `LABEL_KOLOM_KOSONG`, atau `null` bila tidak ada yang
 * kosong. Paket v1.3.0 memasukkan artikel THR dengan kolom pertama tanpa judul, sehingga drafnya gagal diterbitkan
 * ("Isian ini wajib diisi").
 */
export function perbaikiKolomKosong(isi: unknown): Isi | null {
  if (!isi || typeof isi !== 'object' || !(isi as { root?: unknown }).root) return null
  let berubah = false
  const salin = structuredClone(isi) as { root: Simpul }
  const jelajah = (s: Simpul) => {
    if (s.type === 'block' && s.fields?.blockType === 'tabelPerbandingan') {
      for (const k of s.fields.kolom ?? []) {
        if (!k.label?.trim()) {
          k.label = LABEL_KOLOM_KOSONG
          berubah = true
        }
      }
    }
    for (const anak of s.children ?? []) jelajah(anak)
  }
  jelajah(salin.root)
  return berubah ? salin : null
}

/** Draf artikel paket yang tabelnya punya kolom tanpa judul diperbaiki (tetap draf). Mengembalikan slug yang diperbaiki. */
export async function perbaikiDrafPaket(payload: Payload, req?: Partial<PayloadRequest>): Promise<string[]> {
  const { docs } = await payload.find({
    collection: 'artikel',
    where: { slug: { in: PAKET_AWAL.map((a) => a.slug) } },
    draft: true,
    depth: 0,
    limit: PAKET_AWAL.length,
    pagination: false,
    req,
  })
  const diperbaiki: string[] = []
  for (const doc of docs) {
    if (doc._status !== 'draft') continue
    const isi = perbaikiKolomKosong(doc.isi)
    if (!isi) continue
    await payload.update({ collection: 'artikel', id: doc.id, draft: true, data: { isi: isi as never }, req })
    diperbaiki.push(doc.slug ?? String(doc.id))
  }
  return diperbaiki
}
