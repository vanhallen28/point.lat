export type RedirectAda = { id: number | string; dari: string; ke?: string | null }

export type RencanaRedirect = {
  buat: { dari: string; ke: string }[]
  ubah: { id: RedirectAda['id']; ke: string }[]
  hapus: RedirectAda['id'][]
}

/**
 * Menghitung perubahan tabel redirect saat path publik sebuah dokumen berubah.
 * Menjaga tiga hal: path lama mengarah ke path baru, tidak ada rantai redirect, tidak ada putaran.
 */
export function rencanaRedirect(
  pathLama: string,
  pathBaru: string,
  ada: RedirectAda[],
): RencanaRedirect {
  const rencana: RencanaRedirect = { buat: [], ubah: [], hapus: [] }
  if (pathLama === pathBaru) return rencana

  for (const r of ada) {
    if (r.dari === pathBaru) rencana.hapus.push(r.id)
  }

  const tersisa = ada.filter((r) => r.dari !== pathBaru)
  for (const r of tersisa) {
    if (r.dari === pathLama || r.ke === pathLama) {
      if (r.ke !== pathBaru) rencana.ubah.push({ id: r.id, ke: pathBaru })
    }
  }

  if (!tersisa.some((r) => r.dari === pathLama)) {
    rencana.buat.push({ dari: pathLama, ke: pathBaru })
  }

  return rencana
}

export function validasiPathRedirect(nilai: unknown): true | string {
  if (typeof nilai !== 'string' || !nilai.startsWith('/') || nilai.startsWith('//')) {
    return 'Tulis path yang diawali "/", contoh: /judul-lama'
  }
  if (nilai.length > 1 && nilai.endsWith('/')) return 'Hapus garis miring di akhir path.'
  return true
}

/**
 * Path redirect dari kueri URL form admin (`/admin/collections/redirect/create?dari=/path`), dipakai tombol
 * "Buat redirect" di log 404 dan dashboard SEO. Isian yang bukan path redirect yang sah diabaikan.
 */
export function pathDariKueri(nilai: unknown): string | undefined {
  return typeof nilai === 'string' && validasiPathRedirect(nilai) === true ? nilai : undefined
}
