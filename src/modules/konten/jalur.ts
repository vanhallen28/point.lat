import { muatArtikel, muatHalaman, muatRubrik } from './cache'
import { pisahHalaman } from './paginasi'
import type { DataArtikel, DataHalaman, DataRubrik } from './tipe'

/** Dokumen di balik path rute catch-all `[...jalur]`, atau alamat tujuan untuk `/halaman/1` (308). */
export type HasilJalur =
  | { jenis: 'artikel'; artikel: DataArtikel }
  | { jenis: 'rubrik'; rubrik: DataRubrik }
  | { jenis: 'halaman'; halaman: DataHalaman }
  | { jenis: 'alihkan'; ke: string }

/**
 * Mencari dokumen untuk path tingkat atas. Satu segmen: artikel (bukan glosarium), pilar, lalu
 * halaman statis. Dua segmen: subkategori di bawah pilarnya. Slug artikel, pilar, dan halaman unik
 * lintas koleksi (validasi CMS), jadi urutan hanya menentukan query mana yang dijalankan dulu: yang
 * paling sering diminta lebih dulu. Akhiran `/halaman/{n}` hanya untuk rubrik: halaman ke-n tulisannya,
 * `/halaman/1` dialihkan ke alamat rubrik, nomor tidak sah atau di luar jangkauan 404. `null` berarti
 * redirect atau 404.
 */
export async function muatJalur(segmen: string[]): Promise<HasilJalur | null> {
  const halaman = pisahHalaman(segmen)
  if (!halaman) return null
  const { jalur, nomor, tertulis } = halaman
  if (tertulis) {
    if (jalur.length !== 1 && jalur.length !== 2) return null
    const rubrik = await muatRubrik(jalur[0], jalur[1] ?? null, nomor)
    if (!rubrik) return null
    return nomor === 1 ? { jenis: 'alihkan', ke: rubrik.href } : { jenis: 'rubrik', rubrik }
  }
  if (jalur.length === 1) {
    const artikel = await muatArtikel(jalur[0], false)
    if (artikel) return { jenis: 'artikel', artikel }
    const rubrik = await muatRubrik(jalur[0], null, 1)
    if (rubrik) return { jenis: 'rubrik', rubrik }
    const halaman = await muatHalaman(jalur[0])
    return halaman ? { jenis: 'halaman', halaman } : null
  }
  if (jalur.length === 2) {
    const rubrik = await muatRubrik(jalur[0], jalur[1], 1)
    return rubrik ? { jenis: 'rubrik', rubrik } : null
  }
  return null
}
