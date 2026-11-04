import { muatArtikel, muatRubrik } from './cache'
import type { DataArtikel, DataRubrik } from './tipe'

/** Dokumen di balik path rute catch-all `[...jalur]`. */
export type HasilJalur = { jenis: 'artikel'; artikel: DataArtikel } | { jenis: 'rubrik'; rubrik: DataRubrik }

/**
 * Mencari dokumen untuk path tingkat atas. Satu segmen: artikel (bukan glosarium), lalu pilar. Dua
 * segmen: subkategori di bawah pilarnya. Slug artikel dan pilar unik lintas koleksi (validasi CMS),
 * jadi urutan hanya menentukan query mana yang dijalankan dulu. `null` berarti redirect atau 404.
 */
export async function muatJalur(jalur: string[]): Promise<HasilJalur | null> {
  if (jalur.length === 1) {
    const artikel = await muatArtikel(jalur[0], false)
    if (artikel) return { jenis: 'artikel', artikel }
    const rubrik = await muatRubrik(jalur[0], null)
    return rubrik ? { jenis: 'rubrik', rubrik } : null
  }
  if (jalur.length === 2) {
    const rubrik = await muatRubrik(jalur[0], jalur[1])
    return rubrik ? { jenis: 'rubrik', rubrik } : null
  }
  return null
}
