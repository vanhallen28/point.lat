import { muatArtikel, muatHalaman, muatRubrik } from './cache'
import type { DataArtikel, DataHalaman, DataRubrik } from './tipe'

/** Dokumen di balik path rute catch-all `[...jalur]`. */
export type HasilJalur =
  | { jenis: 'artikel'; artikel: DataArtikel }
  | { jenis: 'rubrik'; rubrik: DataRubrik }
  | { jenis: 'halaman'; halaman: DataHalaman }

/**
 * Mencari dokumen untuk path tingkat atas. Satu segmen: artikel (bukan glosarium), pilar, lalu
 * halaman statis. Dua segmen: subkategori di bawah pilarnya. Slug artikel, pilar, dan halaman unik
 * lintas koleksi (validasi CMS), jadi urutan hanya menentukan query mana yang dijalankan dulu: yang
 * paling sering diminta lebih dulu. `null` berarti redirect atau 404.
 */
export async function muatJalur(jalur: string[]): Promise<HasilJalur | null> {
  if (jalur.length === 1) {
    const artikel = await muatArtikel(jalur[0], false)
    if (artikel) return { jenis: 'artikel', artikel }
    const rubrik = await muatRubrik(jalur[0], null)
    if (rubrik) return { jenis: 'rubrik', rubrik }
    const halaman = await muatHalaman(jalur[0])
    return halaman ? { jenis: 'halaman', halaman } : null
  }
  if (jalur.length === 2) {
    const rubrik = await muatRubrik(jalur[0], jalur[1])
    return rubrik ? { jenis: 'rubrik', rubrik } : null
  }
  return null
}
