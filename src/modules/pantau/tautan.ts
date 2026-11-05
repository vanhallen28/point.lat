import { tautanIsi, type IsiDokumen } from '@/modules/seo/lexical'

import { hrefDari } from './aturan'
import type { Href, JenisTemuan } from './tipe'

/**
 * Tautan di konten terbit sebagai fungsi murni (spesifikasi §8 "Tingkat situs": halaman yatim dan link
 * rusak). `tautanDokumen` membaca tautan satu dokumen atau global (isi Lexical, relasi pilihan editor,
 * menu, tombol, sumber); `nilaiTautan` mencocokkannya dengan peta situs: tautan internal yang rusak atau
 * menuju alamat lama, halaman tanpa tautan masuk (yatim), dan daftar URL situs lain yang perlu dicek.
 */

/** Asal tautan yang dihitung: isi dokumen terbit, menu header dan footer, dan pilihan editor di beranda. */
export type KoleksiSumber = 'artikel' | 'halaman' | 'pilar' | 'tools' | 'penulis' | 'header' | 'footer' | 'beranda'

export type Sumber = { koleksi: KoleksiSumber; id: number | string | null; judul: string; path: string | null }

/** Tujuan tautan: path atau URL, atau dokumen (tautan internal Lexical dan relasi) yang path-nya dicari di peta situs. */
export type Tujuan = Href | { jenis: 'dokumen'; koleksi: string; id: number | string }

export type Tautan = { sumber: Sumber; tujuan: Tujuan }

type Dok = Record<string, unknown>

const daftar = (nilai: unknown): Dok[] => (Array.isArray(nilai) ? (nilai.filter((n) => n && typeof n === 'object') as Dok[]) : [])

/** Relasi (ID atau dokumen, tunggal atau banyak) menjadi tujuan dokumen. */
function relasi(koleksi: string, nilai: unknown): Tujuan[] {
  const isi = Array.isArray(nilai) ? nilai : [nilai]
  return isi.flatMap((r): Tujuan[] => {
    const id = r && typeof r === 'object' ? (r as { id?: number | string }).id : r
    return typeof id === 'number' || typeof id === 'string' ? [{ jenis: 'dokumen', koleksi, id }] : []
  })
}

const href = (nilai: unknown, urlSitus: string): Tujuan[] => {
  const h = hrefDari(nilai, urlSitus)
  return h ? [h] : []
}

/** Blok sematan di isi Lexical (`type: 'block'`) yang dirender sebagai tautan ke halamannya. */
function blokLexical(isi: unknown): Tujuan[] {
  const hasil: Tujuan[] = []
  const jelajah = (nodes: unknown) => {
    for (const node of daftar(nodes)) {
      const fields = node.fields as Dok | undefined
      if (node.type === 'block' && fields?.blockType === 'embedTool') hasil.push(...relasi('tools', fields.tool))
      if (node.type === 'block' && fields?.blockType === 'embedVideo') hasil.push(...relasi('video', fields.video))
      jelajah(node.children)
    }
  }
  jelajah((isi as { root?: { children?: unknown } } | null)?.root?.children)
  return hasil
}

/** Tautan di isi Lexical: link ke URL atau dokumen (`tautanIsi` modul seo) dan sematan tools atau video. */
export function tautanLexical(isi: unknown, urlSitus: string): Tujuan[] {
  const tautan = tautanIsi(isi as IsiDokumen, urlSitus).flatMap((t): Tujuan[] =>
    'docId' in t ? relasi(t.relationTo, t.docId) : href(t.url, urlSitus),
  )
  return [...tautan, ...blokLexical(isi)]
}

/** Semua tujuan tautan satu dokumen atau global (data depth 0, versi terbit). */
export function tautanDokumen(koleksi: KoleksiSumber, doc: Dok, urlSitus: string): Tujuan[] {
  const url = (baris: unknown, kunci = 'url') => daftar(baris).flatMap((b) => href(b[kunci], urlSitus))
  switch (koleksi) {
    case 'artikel':
      return [
        ...tautanLexical(doc.isi, urlSitus),
        ...url(doc.sumber),
        ...relasi('artikel', doc.artikelTerkait),
        ...relasi('tools', doc.toolsTerkait),
        ...relasi('video', doc.videoTerkait),
      ]
    case 'halaman':
      return daftar(doc.tataLetak).flatMap((blok): Tujuan[] => {
        if (blok.blockType === 'teks') return tautanLexical(blok.isi, urlSitus)
        if (blok.blockType === 'kartu') return url(blok.kartu, 'tautan')
        if (blok.blockType === 'cta') return href(blok.tautan, urlSitus)
        if (blok.blockType === 'embedTool') return relasi('tools', blok.tool)
        return []
      })
    case 'pilar':
      return tautanLexical(doc.intro, urlSitus)
    case 'tools':
      return [...tautanLexical(doc.penjelasan, urlSitus), ...url(doc.sumberAturan)]
    case 'penulis':
      return url(doc.tautan)
    case 'header':
      return [
        ...daftar(doc.menu).flatMap((m) => (m.jenis === 'pilar' ? relasi('pilar', m.pilar) : href(m.url, urlSitus))),
        ...href((doc.tombolTools as Dok | undefined)?.url, urlSitus),
      ]
    case 'footer':
      return [...url(doc.tautan), ...url(doc.sosial), ...href(doc.saluranWhatsApp, urlSitus)]
    case 'beranda':
      return daftar(doc.tataLetak).flatMap((blok): Tujuan[] => {
        if (blok.blockType === 'mozaikPilihan') return relasi('artikel', blok.artikel)
        if (blok.blockType === 'stripVideo') return relasi('video', blok.video)
        return []
      })
  }
}

/** Peta situs untuk mencocokkan tautan internal. */
export type PetaSitus = {
  /** Path publik yang ada: dokumen terbit, halaman indeks, dan rute teknis. */
  path: ReadonlySet<string>
  /** `koleksi:id` dokumen terbit ke path-nya. */
  dokumen: ReadonlyMap<string, string>
  /** Redirect per path asal (koleksi `redirect`). */
  redirect: ReadonlyMap<string, { kode: string; ke: string | null }>
}

export type Temuan = { jenis: JenisTemuan; tujuan: string; pesan: string; sumber: Sumber }

/** Halaman yang diharapkan punya tautan masuk: artikel dan halaman statis terbit yang tidak noindex. */
export type Sasaran = { path: string; sumber: Sumber }

export const PESAN_TEMUAN = {
  dokumen: 'Tujuan tautan belum terbit atau sudah dihapus. Ganti atau hapus tautannya.',
  tidakAda: 'Tidak ada halaman terbit di alamat ini. Ganti atau hapus tautannya.',
  dihapus: 'Halaman ini sudah dihapus (410). Hapus atau ganti tautannya.',
  dialihkan: (ke: string) => `Alamat lama, dialihkan ke ${ke}. Ganti tautannya ke alamat baru supaya pembaca dan Google tidak dialihkan.`,
  yatim: 'Belum ada tautan masuk dari tulisan lain, menu, atau beranda. Tautkan dari tulisan yang topiknya berdekatan.',
} as const

const kunciSumber = (s: Sumber) => `${s.koleksi}:${s.id ?? ''}`

/**
 * Mencocokkan tautan dengan peta situs. Tautan ke dokumen yang belum terbit dan path tanpa halaman
 * adalah `rusak`; path dengan redirect 301 adalah `dialihkan` (tujuannya tetap dihitung sebagai tautan
 * masuk). Sasaran tanpa tautan masuk dari sumber lain (tautan ke dirinya sendiri tidak dihitung) adalah
 * `yatim`. URL situs lain dikumpulkan bersama sumbernya untuk pemeriksa tautan.
 */
export function nilaiTautan(tautan: Tautan[], peta: PetaSitus, sasaran: Sasaran[]): { temuan: Temuan[]; luar: Map<string, Sumber[]> } {
  const temuan = new Map<string, Temuan>()
  const masuk = new Map<string, Set<string>>()
  const luar = new Map<string, Sumber[]>()
  const catat = (t: Temuan) => temuan.set(`${t.jenis} ${kunciSumber(t.sumber)} ${t.tujuan}`, t)
  const tandaiMasuk = (path: string, sumber: Sumber) => masuk.set(path, (masuk.get(path) ?? new Set()).add(kunciSumber(sumber)))

  for (const { sumber, tujuan } of tautan) {
    if (tujuan.jenis === 'luar') {
      const ada = luar.get(tujuan.url) ?? []
      if (!ada.some((s) => kunciSumber(s) === kunciSumber(sumber))) ada.push(sumber)
      luar.set(tujuan.url, ada)
      continue
    }
    if (tujuan.jenis === 'dokumen') {
      const path = peta.dokumen.get(`${tujuan.koleksi}:${tujuan.id}`)
      if (path) tandaiMasuk(path, sumber)
      else catat({ jenis: 'rusak', tujuan: `${tujuan.koleksi} #${tujuan.id}`, pesan: PESAN_TEMUAN.dokumen, sumber })
      continue
    }
    if (peta.path.has(tujuan.path)) {
      tandaiMasuk(tujuan.path, sumber)
      continue
    }
    const redirect = peta.redirect.get(tujuan.path)
    if (redirect?.kode === '301' && redirect.ke) {
      catat({ jenis: 'dialihkan', tujuan: tujuan.path, pesan: PESAN_TEMUAN.dialihkan(redirect.ke), sumber })
      tandaiMasuk(redirect.ke, sumber)
    } else {
      catat({ jenis: 'rusak', tujuan: tujuan.path, pesan: redirect?.kode === '410' ? PESAN_TEMUAN.dihapus : PESAN_TEMUAN.tidakAda, sumber })
    }
  }

  for (const s of sasaran) {
    const dari = [...(masuk.get(s.path) ?? [])].filter((k) => k !== kunciSumber(s.sumber))
    if (dari.length === 0) catat({ jenis: 'yatim', tujuan: s.path, pesan: PESAN_TEMUAN.yatim, sumber: s.sumber })
  }
  return { temuan: [...temuan.values()], luar }
}
