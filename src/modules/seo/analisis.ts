import { LEBAR_MINIMAL_GAMBAR_UTAMA } from '@/lib/media'

import { ambil } from './dokumen'
import { gambarIsi, judulBagian, tautanIsi, teksIsi, type IsiDokumen } from './lexical'
import { hitungKata, mengandungFrasa, normalisasi, rataPanjangKalimat } from './teks'
import type { GrupSeo, MediaSeo, Relasi } from './tipe'

/**
 * Checklist panel SEO (spesifikasi §8). Hijau berarti sudah sesuai, kuning berarti perlu dilihat.
 * Tidak ada yang memblokir terbit: aturan wajib (Intinya, alt, lebar gambar) sudah divalidasi koleksi.
 */

export type StatusCek = 'hijau' | 'kuning'

export type IdCek =
  | 'judul-seo'
  | 'meta'
  | 'keyphrase-h1'
  | 'keyphrase-slug'
  | 'keyphrase-pembuka'
  | 'hierarki'
  | 'intinya'
  | 'link-internal'
  | 'sumber-eksternal'
  | 'alt-gambar'
  | 'panjang-kalimat'
  | 'gambar-utama'

export type Cek = { id: IdCek; label: string; status: StatusCek; pesan: string }

/** Data artikel yang dianalisis: dokumen tersimpan atau isian form admin yang belum disimpan. */
export type ArtikelAnalisis = {
  judul?: string | null
  slug?: string | null
  intinya?: { poin?: string | null }[] | null
  isi?: IsiDokumen
  sumber?: { url?: string | null }[] | null
  gambarUtama?: Relasi<MediaSeo>
  seo?: GrupSeo | null
}

export const BATAS = {
  judulSeo: { min: 50, maks: 60 },
  meta: { min: 150, maks: 160 },
  linkInternal: { min: 3, maks: 5 },
  sumberEksternal: { min: 2, maks: 3 },
  kataPembuka: 100,
  /** Rata-rata kata per kalimat yang masih nyaman dibaca di layar HP. */
  rataKalimat: 20,
} as const

const hijau = (id: IdCek, label: string, pesan: string): Cek => ({ id, label, status: 'hijau', pesan })
const kuning = (id: IdCek, label: string, pesan: string): Cek => ({ id, label, status: 'kuning', pesan })

function cekRentang(id: IdCek, label: string, panjang: number, rentang: { min: number; maks: number }, sumber: string): Cek {
  const teks = `${panjang} karakter${sumber}`
  if (panjang >= rentang.min && panjang <= rentang.maks) return hijau(id, label, `${teks}. Pas.`)
  if (panjang < rentang.min) return kuning(id, label, `${teks}. Tambah sampai ${rentang.min}-${rentang.maks} karakter.`)
  return kuning(id, label, `${teks}. Pangkas ke ${rentang.min}-${rentang.maks} karakter supaya tidak terpotong di Google.`)
}

function cekJudulSeo(doc: ArtikelAnalisis): Cek {
  const isian = doc.seo?.judulSEO?.trim()
  const judul = isian || doc.judul?.trim() || ''
  return cekRentang('judul-seo', 'Panjang judul SEO', judul.length, BATAS.judulSeo, isian ? '' : ' (dari judul artikel)')
}

function cekMeta(doc: ArtikelAnalisis): Cek {
  const meta = doc.seo?.metaDeskripsi?.trim() ?? ''
  if (!meta) return kuning('meta', 'Panjang meta description', 'Meta description masih kosong. Tulis 150-160 karakter yang menjawab pencarian.')
  return cekRentang('meta', 'Panjang meta description', meta.length, BATAS.meta, '')
}

/** Kata pertama isi artikel (paragraf pertama dan seterusnya), dipotong di `jumlah` kata. */
function kataPembuka(isi: IsiDokumen, jumlah: number): string {
  return teksIsi(isi).join(' ').split(/\s+/).slice(0, jumlah).join(' ')
}

function cekKeyphrase(doc: ArtikelAnalisis): Cek[] {
  const kp = doc.seo?.keyphrase?.trim()
  const label = { h1: 'Keyphrase di judul (H1)', slug: 'Keyphrase di slug', pembuka: 'Keyphrase di 100 kata pertama' }
  if (!kp) {
    const pesan = 'Isi keyphrase utama dulu.'
    return [kuning('keyphrase-h1', label.h1, pesan), kuning('keyphrase-slug', label.slug, pesan), kuning('keyphrase-pembuka', label.pembuka, pesan)]
  }
  const diSlug = mengandungFrasa((doc.slug ?? '').replace(/-/g, ' '), kp)
  return [
    mengandungFrasa(doc.judul ?? '', kp)
      ? hijau('keyphrase-h1', label.h1, `"${kp}" ada di judul.`)
      : kuning('keyphrase-h1', label.h1, `"${kp}" belum ada di judul artikel.`),
    diSlug
      ? hijau('keyphrase-slug', label.slug, `"${kp}" ada di slug.`)
      : kuning('keyphrase-slug', label.slug, `Slug belum memuat "${normalisasi(kp).replace(/ /g, '-')}".`),
    mengandungFrasa(kataPembuka(doc.isi, BATAS.kataPembuka), kp)
      ? hijau('keyphrase-pembuka', label.pembuka, `"${kp}" muncul di pembuka.`)
      : kuning('keyphrase-pembuka', label.pembuka, `Sebut "${kp}" di paragraf pembuka.`),
  ]
}

function cekHierarki(doc: ArtikelAnalisis): Cek {
  const label = 'Hierarki subjudul'
  const bagian = judulBagian(doc.isi)
  if (bagian.length === 0) return kuning('hierarki', label, 'Belum ada subjudul. Pecah isi dengan H2 supaya mudah dipindai.')
  const h1 = bagian.find((b) => b.level === 1)
  if (h1) return kuning('hierarki', label, `"${h1.teks}" memakai H1. Judul artikel sudah H1, pakai H2 di isi.`)
  let sebelumnya = 1
  for (const b of bagian) {
    if (b.level > sebelumnya + 1) {
      return kuning('hierarki', label, `"${b.teks}" melompat dari H${sebelumnya} ke H${b.level}. Pakai H${sebelumnya + 1}.`)
    }
    sebelumnya = b.level
  }
  return hijau('hierarki', label, `${bagian.length} subjudul berurutan tanpa loncat.`)
}

function cekIntinya(doc: ArtikelAnalisis): Cek {
  const poin = (doc.intinya ?? []).filter((p) => p.poin?.trim()).length
  return poin >= 2 && poin <= 4
    ? hijau('intinya', 'Kotak Intinya', `${poin} poin terisi.`)
    : kuning('intinya', 'Kotak Intinya', `Isi 2-4 poin (sekarang ${poin}).`)
}

function cekLinkInternal(doc: ArtikelAnalisis, urlSitus: string): Cek {
  const jumlah = tautanIsi(doc.isi, urlSitus).filter((t) => t.internal).length
  const { min, maks } = BATAS.linkInternal
  const label = 'Link internal'
  if (jumlah < min) return kuning('link-internal', label, `${jumlah} link internal. Tambah sampai ${min}-${maks}, lihat saran di bawah.`)
  if (jumlah > maks) return kuning('link-internal', label, `${jumlah} link internal. Cukup ${min}-${maks} yang paling relevan.`)
  return hijau('link-internal', label, `${jumlah} link internal.`)
}

function cekSumber(doc: ArtikelAnalisis, urlSitus: string): Cek {
  const url = new Set<string>()
  for (const s of doc.sumber ?? []) if (s.url?.trim()) url.add(s.url.trim())
  for (const t of tautanIsi(doc.isi, urlSitus)) if (!t.internal) url.add(t.url)
  const jumlah = url.size
  const { min, maks } = BATAS.sumberEksternal
  const label = 'Sumber eksternal'
  if (jumlah < min) return kuning('sumber-eksternal', label, `${jumlah} sumber. Rujuk ${min}-${maks} sumber resmi atau tepercaya.`)
  return hijau('sumber-eksternal', label, `${jumlah} sumber eksternal${jumlah > maks ? ', sudah lebih dari cukup' : ''}.`)
}

function cekAlt(doc: ArtikelAnalisis): Cek {
  const label = 'Alt gambar'
  const utama = ambil(doc.gambarUtama ?? null)
  const semua = [...(utama ? [utama] : []), ...gambarIsi(doc.isi)]
  const belumDimuat = semua.filter((g) => g.alt === undefined).length
  const kosong = semua.filter((g) => g.alt !== undefined && !g.alt?.trim()).length
  if (kosong > 0) return kuning('alt-gambar', label, `${kosong} gambar belum punya alt.`)
  if (belumDimuat > 0) return kuning('alt-gambar', label, `${belumDimuat} gambar belum bisa diperiksa. Simpan dulu lalu muat ulang.`)
  if (semua.length === 0) return kuning('alt-gambar', label, 'Belum ada gambar.')
  return hijau('alt-gambar', label, `Semua ${semua.length} gambar punya alt.`)
}

function cekKalimat(doc: ArtikelAnalisis): Cek {
  const label = 'Rata-rata panjang kalimat'
  const teks = teksIsi(doc.isi).join('\n')
  if (hitungKata(teks) === 0) return kuning('panjang-kalimat', label, 'Isi artikel masih kosong.')
  const rata = rataPanjangKalimat(teks)
  const angka = rata.toLocaleString('id-ID')
  return rata <= BATAS.rataKalimat
    ? hijau('panjang-kalimat', label, `${angka} kata per kalimat. Enak dibaca.`)
    : kuning('panjang-kalimat', label, `${angka} kata per kalimat. Pecah kalimat panjang, usahakan di bawah ${BATAS.rataKalimat}.`)
}

function cekGambarUtama(doc: ArtikelAnalisis): Cek {
  const label = 'Gambar utama'
  const media = ambil(doc.gambarUtama ?? null)
  if (!doc.gambarUtama) return kuning('gambar-utama', label, 'Belum ada gambar utama.')
  if (!media || typeof media.width !== 'number') return kuning('gambar-utama', label, 'Ukuran gambar belum terbaca. Simpan dulu lalu muat ulang.')
  return media.width >= LEBAR_MINIMAL_GAMBAR_UTAMA
    ? hijau('gambar-utama', label, `Lebar ${media.width}px.`)
    : kuning('gambar-utama', label, `Lebar ${media.width}px. Minimal ${LEBAR_MINIMAL_GAMBAR_UTAMA}px supaya tampil besar di Google Discover.`)
}

/** Daftar cek panel SEO, urutannya sama dengan spesifikasi §8 butir 2. */
export function analisis(doc: ArtikelAnalisis, opsi: { urlSitus: string }): Cek[] {
  return [
    cekJudulSeo(doc),
    cekMeta(doc),
    ...cekKeyphrase(doc),
    cekHierarki(doc),
    cekIntinya(doc),
    cekLinkInternal(doc, opsi.urlSitus),
    cekSumber(doc, opsi.urlSitus),
    cekAlt(doc),
    cekKalimat(doc),
    cekGambarUtama(doc),
  ]
}

/** Ringkasan untuk judul panel: jumlah cek hijau dari seluruh cek. */
export function skor(cek: Cek[]): { hijau: number; total: number } {
  return { hijau: cek.filter((c) => c.status === 'hijau').length, total: cek.length }
}
