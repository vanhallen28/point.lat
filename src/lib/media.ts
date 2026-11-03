export const LEBAR_MINIMAL_GAMBAR_UTAMA = 1200

export function validasiAlt(alt: unknown, mimeType: unknown): true | string {
  const gambar = typeof mimeType === 'string' && mimeType.startsWith('image/')
  if (!gambar) return true
  return typeof alt === 'string' && alt.trim() ? true : 'Alt wajib diisi untuk gambar.'
}

export function validasiLebarGambar(
  lebar: number | null | undefined,
  minimal = LEBAR_MINIMAL_GAMBAR_UTAMA,
): true | string {
  if (typeof lebar !== 'number') return 'Ukuran gambar tidak diketahui. Unggah ulang gambarnya.'
  if (lebar >= minimal) return true
  return `Gambar utama minimal ${minimal}px lebarnya (sekarang ${lebar}px), syarat tampil besar di Google Discover.`
}
