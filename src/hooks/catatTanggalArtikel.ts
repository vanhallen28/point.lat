import type { CollectionBeforeChangeHook } from 'payload'

type DataTanggal = {
  _status?: 'draft' | 'published' | null
  perubahanBesar?: boolean | null
  terbitPada?: string | null
}

type PerubahanTanggal = {
  terbitPada?: string
  diperbaruiBesar?: string
  perubahanBesar?: false
}

/**
 * Tanggal hanya berubah saat dokumen diterbitkan.
 * `diperbaruiBesar` menjadi `lastmod` sitemap, jadi hanya diisi bila editor menandai perubahan besar.
 */
export function hitungTanggal(
  data: DataTanggal,
  sebelumnya: DataTanggal | undefined,
  sekarang: string,
): PerubahanTanggal {
  if (data._status !== 'published') return {}
  const hasil: PerubahanTanggal = {}
  if (!sebelumnya?.terbitPada && !data.terbitPada) hasil.terbitPada = sekarang
  if (data.perubahanBesar === true) {
    hasil.diperbaruiBesar = sekarang
    hasil.perubahanBesar = false
  }
  return hasil
}

export const catatTanggalArtikel: CollectionBeforeChangeHook = ({ data, originalDoc }) => ({
  ...data,
  ...hitungTanggal(data, originalDoc, new Date().toISOString()),
})
