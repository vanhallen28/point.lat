import type { TipeArtikel, ToolId } from '@/lib/konstanta'

/**
 * Satu artikel paket konten (spesifikasi §24). Isi ditulis sebagai markdown ringkas (`markdown.ts`) dan
 * diubah ke Lexical saat impor, setelah id dokumen tujuan tautan internal diketahui.
 */
export type ArtikelPaket = {
  slug: string
  judul: string
  tipe: TipeArtikel
  /** Slug pilar (`uang-karier`, `belajar`, ...). */
  pilar: string
  subkategori: SubkategoriPaket
  deck: string
  /** Dua sampai empat poin, masing-masing paling panjang 220 karakter. */
  intinya: string[]
  isi: string
  faq: { pertanyaan: string; jawaban: string }[]
  sumber: SumberPaket[]
  seo: { keyphrase: string; keyphraseSekunder?: string[]; judulSEO: string; metaDeskripsi: string }
  /** Kalkulator yang ditautkan di tab Relasi. */
  tools: ToolId[]
  /** Slug artikel lain (di paket atau sudah ada di situs) untuk "Baca juga" di tab Relasi. */
  terkait: string[]
  sampul: SampulPaket
}

export type SubkategoriPaket = { slug: string; nama: string; deskripsi: string }

export type SumberPaket = { judul: string; url: string; penerbit: string; diaksesPada: string }

/**
 * Kartu sampul: gambar PNG 1920 x 1080 di `src/modules/paket/sampul/{file}`, dibuat dari templat bergaya
 * Kartu Intinya (`scripts/buat-sampul-paket.mjs`). `kata` adalah tulisan besar di tengah kartu.
 */
export type SampulPaket = { file: string; kata: string; alt: string }

/** Ringkasan satu kali impor, ditampilkan di beranda admin. */
export type HasilImpor = {
  selesaiPada: string
  artikel: { dibuat: string[]; sudahAda: string[] }
  subkategori: { dibuat: string[] }
  tools: { diperbarui: string[]; dilewati: { toolId: string; alasan: string }[] }
  beranda: 'ditambah' | 'sudah-ada' | 'dilewati'
  galat: string[]
}
