/**
 * Kunci IndexNow (dokumentasi IndexNow): 8 sampai 128 karakter huruf, angka, atau tanda hubung. File
 * `/{kunci}.txt` di akar situs membuktikan kepemilikan semua URL situs.
 */
export const POLA_KUNCI_INDEXNOW = /^[A-Za-z0-9-]{8,128}$/

export function validasiKunciIndexNow(nilai: unknown): true | string {
  if (nilai === undefined || nilai === null || nilai === '') return true
  if (typeof nilai === 'string' && POLA_KUNCI_INDEXNOW.test(nilai)) return true
  return 'Kunci IndexNow harus 8 sampai 128 karakter: huruf, angka, atau tanda hubung (-).'
}

/** Path file kunci di akar situs (spesifikasi §7). */
export const pathFileKunci = (kunci: string) => `/${kunci}.txt`

/**
 * Properti Search Console (dokumentasi Search Console API, `siteUrl`): properti domain
 * `sc-domain:point.lat`, atau properti awalan URL lengkap dengan garis miring di akhir.
 */
export function validasiPropertiSearchConsole(nilai: unknown): true | string {
  if (typeof nilai === 'string' && /^sc-domain:[a-z0-9.-]+\.[a-z]{2,}$/i.test(nilai)) return true
  if (typeof nilai === 'string' && /^https?:\/\/[^/\s]+\/(?:\S*\/)?$/.test(nilai)) return true
  return 'Tulis properti domain (sc-domain:point.lat) atau awalan URL lengkap yang diakhiri garis miring (https://point.lat/).'
}
