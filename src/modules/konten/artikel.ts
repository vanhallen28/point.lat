import type { Artikel, Media, Penuli, Pilar } from '@/payload-types'
import { pathFor } from '@/lib/paths'
import { slugify } from '@/lib/slug'
import { teksIsi, teksNode, type IsiDokumen } from '@/modules/seo/lexical'
import { hitungKata } from '@/modules/seo/teks'
import type { ArtikelSeo } from '@/modules/seo/tipe'

import type { DataArtikel, KartuArtikel, MediaTampil, PenulisRingkas, PilarRingkas, Subjudul } from './tipe'

/** Kecepatan baca untuk label "N menit baca". */
export const KATA_PER_MENIT = 200

/** Jumlah artikel terkait di bawah artikel. */
export const MAKS_TERKAIT = 3

/** Daftar isi tampil bila artikel punya minimal sekian H2. */
export const MIN_DAFTAR_ISI = 3

/** Id elemen halaman yang tidak boleh dipakai jangkar subjudul. */
const ID_HALAMAN = ['isi', 'intinya', 'daftar-isi', 'sumber', 'faq', 'terkait', 'penulis']

type Relasi<T> = T | number | null | undefined

const ambil = <T extends object>(relasi: Relasi<T>): T | null => (relasi && typeof relasi === 'object' ? relasi : null)

export function waktuBaca(isi: IsiDokumen): number {
  const kata = teksIsi(isi).reduce((jumlah, teks) => jumlah + hitungKata(teks), 0)
  return Math.max(1, Math.ceil(kata / KATA_PER_MENIT))
}

type NodeIsi = Parameters<typeof teksNode>[0] & Record<string, unknown>

/**
 * Memberi setiap heading isi atribut `idJangkar` (dari teksnya, unik di halaman) dan mengumpulkan H2
 * untuk daftar isi. H1 di isi diturunkan menjadi H2 karena H1 halaman adalah judul artikel.
 */
export function tandaiSubjudul(isi: IsiDokumen): { isi: IsiDokumen; daftarIsi: Subjudul[] } {
  const anak = isi?.root?.children
  if (!isi?.root || !Array.isArray(anak)) return { isi, daftarIsi: [] }
  const terpakai = new Map<string, number>(ID_HALAMAN.map((id) => [id, 1]))
  const daftarIsi: Subjudul[] = []
  const children = (anak as NodeIsi[]).map((node) => {
    if (node.type !== 'heading') return node
    const teks = teksNode(node).trim()
    const dasar = slugify(teks) || 'bagian'
    const urutan = (terpakai.get(dasar) ?? 0) + 1
    terpakai.set(dasar, urutan)
    const id = urutan === 1 ? dasar : `${dasar}-${urutan}`
    const tag = node.tag === 'h1' ? 'h2' : node.tag
    if (tag === 'h2' && teks) daftarIsi.push({ id, teks })
    return { ...node, tag, idJangkar: id }
  })
  return { isi: { ...isi, root: { ...isi.root, children } }, daftarIsi }
}

const FORMAT_TANGGAL = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Jakarta',
})

/** Tanggal untuk pembaca Indonesia (WIB), contoh "4 November 2026". */
export function tanggalIndonesia(iso: string): string {
  return FORMAT_TANGGAL.format(new Date(iso))
}

export function pilarRingkas(relasi: Relasi<Pilar>): PilarRingkas | null {
  const pilar = ambil(relasi)
  if (!pilar?.slug) return null
  return {
    nama: pilar.nama,
    slug: pilar.slug,
    href: pathFor({ jenis: 'pilar', slug: pilar.slug }),
    warna: pilar.warna,
    disclaimer: pilar.disclaimer?.trim() || null,
  }
}

/** Media yang belum lengkap (tanpa publicId atau ukuran) tidak ditampilkan, supaya tidak ada CLS. */
export function mediaTampil(relasi: Relasi<Media>): MediaTampil | null {
  const media = ambil(relasi)
  if (!media?.publicId || !media.width || !media.height) return null
  return {
    publicId: media.publicId,
    jenis: media.jenis === 'video' ? 'video' : 'gambar',
    alt: media.alt ?? '',
    width: media.width,
    height: media.height,
    caption: media.caption?.trim() || null,
    kredit: media.kredit?.trim() || null,
  }
}

export function penulisRingkas(relasi: Relasi<Penuli>): PenulisRingkas | null {
  const penulis = ambil(relasi)
  if (!penulis?.slug) return null
  return {
    nama: penulis.nama,
    href: pathFor({ jenis: 'penulis', slug: penulis.slug }),
    bio: penulis.bio?.trim() || null,
    keahlian: penulis.keahlian ?? [],
    foto: mediaTampil(penulis.foto),
  }
}

type ArtikelUntukKartu = Pick<Artikel, 'id' | 'judul' | 'slug' | 'tipe' | 'pilar' | 'intinya'> &
  Partial<Pick<Artikel, 'gambarUtama' | 'terbitPada' | 'penulis'>>

/**
 * Kartu artikel untuk semua daftar. Gambar, tanggal terbit, dan penulis dibaca bila query memuatnya
 * (`SELECT_KARTU` di `data.ts`); tanpa itu kartu tetap sah dengan panel warna pilar.
 */
export function kartuArtikel(doc: ArtikelUntukKartu): KartuArtikel | null {
  if (!doc.slug) return null
  const gambar = mediaTampil(doc.gambarUtama ?? null)
  return {
    id: doc.id,
    judul: doc.judul,
    href: pathFor({ jenis: 'artikel', slug: doc.slug, tipe: doc.tipe }),
    tipe: doc.tipe,
    pilar: pilarRingkas(doc.pilar),
    intinya: doc.intinya?.[0]?.poin ?? null,
    gambar: gambar?.jenis === 'gambar' ? gambar : null,
    terbit: doc.terbitPada ?? null,
    penulis: ambil(doc.penulis ?? null)?.nama ?? null,
  }
}

/** Artikel terkait pilihan editor yang sudah terbit, lalu artikel sepilar terbaru, tanpa duplikat. */
export function gabungTerkait(id: number, manual: Relasi<Artikel>[], sepilar: ArtikelUntukKartu[]): KartuArtikel[] {
  const hasil: KartuArtikel[] = []
  const terpakai = new Set<number>([id])
  const pilihan = manual.map((r) => ambil(r)).filter((d): d is Artikel => d?._status === 'published')
  for (const doc of [...pilihan, ...sepilar]) {
    if (hasil.length >= MAKS_TERKAIT || terpakai.has(doc.id)) continue
    const kartu = kartuArtikel(doc)
    if (!kartu) continue
    terpakai.add(doc.id)
    hasil.push(kartu)
  }
  return hasil
}

/** Field dokumen artikel yang dibaca modul SEO (tanpa isi, FAQ, sumber). */
function untukSeo(doc: Artikel): ArtikelSeo {
  const { id, judul, slug, tipe, deck, pilar, subkategori, penulis, gambarUtama, terbitPada, diperbaruiBesar, seo, createdAt, updatedAt } =
    doc
  return { id, judul, slug, tipe, deck, pilar, subkategori, penulis, gambarUtama, terbitPada, diperbaruiBesar, seo, createdAt, updatedAt } as ArtikelSeo
}

/** Dokumen artikel terbit (depth 2) menjadi data halaman. */
export function susunArtikel(doc: Artikel, terkait: KartuArtikel[]): DataArtikel {
  const { isi, daftarIsi } = tandaiSubjudul(doc.isi as IsiDokumen)
  return {
    id: doc.id,
    judul: doc.judul,
    tipe: doc.tipe,
    href: pathFor({ jenis: 'artikel', slug: doc.slug ?? '', tipe: doc.tipe }),
    deck: doc.deck,
    intinya: (doc.intinya ?? []).map((i) => i.poin),
    terbit: doc.terbitPada ?? null,
    diperbarui: doc.diperbaruiBesar ?? doc.terbitPada ?? null,
    waktuBaca: waktuBaca(doc.isi as IsiDokumen),
    pilar: pilarRingkas(doc.pilar),
    penulis: penulisRingkas(doc.penulis),
    gambar: mediaTampil(doc.gambarUtama),
    isi,
    daftarIsi: daftarIsi.length >= MIN_DAFTAR_ISI ? daftarIsi : [],
    faq: (doc.faq ?? []).map(({ pertanyaan, jawaban }) => ({ pertanyaan, jawaban })),
    sumber: (doc.sumber ?? []).map((s) => ({
      judul: s.judul,
      url: s.url,
      penerbit: s.penerbit?.trim() || null,
      diaksesPada: s.diaksesPada ?? null,
    })),
    terkait,
    seo: untukSeo(doc),
  }
}
