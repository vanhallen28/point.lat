/** Kode sematan (spesifikasi §23): posisi dan jenis persetujuan, dipakai skema global dan pemuat. */

export const POSISI_SEMATAN = ['head', 'bodyAwal', 'bodyAkhir'] as const
export type PosisiSematan = (typeof POSISI_SEMATAN)[number]

export const LABEL_POSISI_SEMATAN: Record<PosisiSematan, string> = {
  head: 'Di dalam <head>',
  bodyAwal: 'Awal <body>',
  bodyAkhir: 'Akhir <body>',
}

export const JENIS_SEMATAN = ['persetujuan', 'wajib'] as const
export type JenisSematan = (typeof JENIS_SEMATAN)[number]

export const LABEL_JENIS_SEMATAN: Record<JenisSematan, string> = {
  persetujuan: 'Butuh persetujuan',
  wajib: 'Wajib (tanpa cookie)',
}

/** Panjang kode paling banyak per baris (karakter). */
export const MAKS_KODE = 20_000

/** Satu kode yang dikirim ke browser. */
export type KodeTerpasang = { id: string; nama: string; posisi: PosisiSematan; jenis: JenisSematan; kode: string; kuki: string[] }

/** Id elemen data JSON kode sematan di halaman publik. */
export const ID_DATA_SEMATAN = 'kode-sematan'
