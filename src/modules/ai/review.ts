/**
 * Checklist review manusia untuk artikel yang memakai draf AI (spesifikasi §10 "Pengaman" dan §19 risiko
 * konten AI dianggap spam). Fungsi murni, dipakai validasi koleksi artikel (server) dan tombol Terbitkan
 * (browser).
 */

export const BUTIR_REVIEW = [
  { name: 'sumberDicek', label: 'Sumber sudah dicek', keterangan: 'Setiap sumber sudah kamu buka dan isinya cocok dengan tulisan.' },
  { name: 'angkaDicek', label: 'Angka sudah dicek', keterangan: 'Angka, tanggal, dan aturan sudah dicocokkan dengan sumber resmi.' },
  {
    name: 'pengalamanDitambah',
    label: 'Insight atau pengalaman penulis sudah ditambahkan',
    keterangan: 'Ada contoh, pengalaman, atau sudut pandang penulis yang tidak bisa ditulis AI.',
  },
] as const

export type NamaButirReview = (typeof BUTIR_REVIEW)[number]['name']
export type ReviewAi = Partial<Record<NamaButirReview, boolean | null>> | null | undefined

export const PESAN_REVIEW = 'Centang sebelum terbit: artikel ini memakai draf AI.'

/** Petunjuk di atas checklist di sidebar. */
export const PETUNJUK_REVIEW = 'Artikel ini memakai draf AI. Centang ketiga butir di bawah setelah kamu memeriksanya; tombol terbit aktif setelah semuanya dicentang.'

/** Nama aksesibel tombol terbit yang nonaktif. */
export const PETUNJUK_TERBIT = 'Artikel ini memakai draf AI. Centang ketiga butir Review sebelum terbit di sidebar dulu.'

/** Lengkap bila artikel tidak memakai draf AI, atau ketiga butir sudah dicentang. */
export function reviewLengkap(pakaiDrafAi: unknown, review: ReviewAi): boolean {
  return !pakaiDrafAi || BUTIR_REVIEW.every((b) => review?.[b.name] === true)
}

/**
 * Validasi satu butir checklist. Payload hanya menjalankan validasi saat terbit (simpan draf melewati
 * validasi), jadi draf tetap bisa disimpan dan aturan ini berlaku tepat saat terbit, termasuk terbit
 * massal dari daftar artikel dan terbit terjadwal.
 */
export function validasiButirReview(nilai: unknown, { data }: { data?: { pakaiDrafAi?: unknown } | null }): true | string {
  return !data?.pakaiDrafAi || nilai === true ? true : PESAN_REVIEW
}

/**
 * Hook `beforeValidate` field `pakaiDrafAi`: sekali tersimpan menyala, tanda tetap menyala. Form admin sudah
 * hanya-baca; hook ini menutup jalan lain (REST API, update massal, terbit massal dengan `pakaiDrafAi: false`)
 * supaya checklist review tidak terlewati diam-diam (temuan review Rencana 7). Berjalan sebelum validasi,
 * jadi validasi checklist dokumen yang sama sudah melihat tanda yang menyala.
 */
export function tetapPakaiDrafAi({ value, originalDoc }: { value?: unknown; originalDoc?: { pakaiDrafAi?: unknown } | null }): unknown {
  return originalDoc?.pakaiDrafAi === true ? true : value
}
