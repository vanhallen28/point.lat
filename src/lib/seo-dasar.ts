const PESAN_POLA = 'Pola judul harus memuat %s satu kali, contoh: %s · point.'

export function validasiPolaJudul(nilai: unknown): true | string {
  if (typeof nilai !== 'string') return PESAN_POLA
  return nilai.split('%s').length === 2 ? true : PESAN_POLA
}

export function judulHalaman(pola: string, judul: string): string {
  return pola.replace('%s', judul)
}
