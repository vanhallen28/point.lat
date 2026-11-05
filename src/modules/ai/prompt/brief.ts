import { LABEL_TIPE_ARTIKEL, TIPE_ARTIKEL, type TipeArtikel } from '@/lib/konstanta'

import { BATAS_TUGAS } from '../aturan'

import { daftarTeks, objek, pembersih, SKEMA_TEKS, skemaObjek, teksMasukan, type DefinisiTugas } from './bantu'
import { ATURAN_BAHAN, bungkus, GAYA_POINT } from './dasar'

/**
 * Brief dari keyword (spesifikasi §10 butir 1), mengikuti template skill seo-content-brief: target, intent,
 * format, outline H2/H3, pertanyaan, sudut pembeda, dan tautan internal. Model tidak bisa membuka hasil
 * pencarian, jadi brief memisahkan dua sumber dengan jujur: perkiraan model (intent, format, outline,
 * pertanyaan) dan data dari database point. (artikel yang sudah memakai keyword itu, saran link internal,
 * sumber resmi per pilar, panjang acuan per format). Analisis pesaing di Google tetap langkah manual editor.
 */

export const INTENT = ['informasional', 'komersial', 'transaksional', 'navigasional'] as const
export type Intent = (typeof INTENT)[number]

/** Panjang acuan per format (spesifikasi §3 "Format konten"); acuan, bukan kuota. */
export const PANJANG_ACUAN: Record<TipeArtikel, string> = {
  panduan: '1.500 sampai 2.500 kata',
  explainer: '600 sampai 900 kata',
  daftar: '1.200 sampai 2.000 kata',
  glosarium: '300 sampai 800 kata',
}

/** Langkah yang tidak bisa dikerjakan model, selalu tampil di brief. */
export const CEK_MANUAL = [
  'Buka 3 sampai 5 hasil teratas Google untuk keyword ini. Cocokkan intent, format, dan panjangnya dengan brief.',
  'Catat subtopik yang dibahas semua hasil teratas dan yang belum dibahas siapa pun.',
  'Lihat kotak "Orang juga bertanya" untuk pertanyaan FAQ.',
  'Buka setiap sumber resmi di bawah dan catat angka serta tanggal berlakunya.',
]

/** Data dari database point. yang ditambahkan sebelum prompt disusun (`lengkapiBrief`). */
export type KonteksBrief = {
  pilar: string | null
  kanibalisasi: { id: number | string; judul: string; keyphrase: string; tingkat: 'sama' | 'mirip'; urlAdmin: string }[]
  linkInternal: { id: number | string; judul: string; path: string; alasan: string; urlAdmin: string }[]
  sumberResmi: { nama: string; url: string }[]
}

export type MasukanBrief = { keyword: string; tipe: TipeArtikel; pilar: number | null; artikel: number | null; konteks?: KonteksBrief }

export type BagianOutline = { h2: string; h3: string[]; catatan: string }

export type HasilBrief = {
  keyword: string
  /** Perkiraan Claude dari keyword: perlu dinilai editor. */
  dariModel: {
    judulKerja: string
    intent: Intent
    alasanIntent: string
    format: TipeArtikel
    alasanFormat: string
    keyphraseSekunder: string[]
    outline: BagianOutline[]
    pertanyaan: string[]
    sudutPembeda: string
    perluDicek: string[]
  }
  /** Data dari database point., bukan dari model. */
  dariPoint: KonteksBrief & { panjangAcuan: string }
  cekManual: string[]
  catatan: string[]
}

const BATAS_BRIEF = { keyphraseSekunder: 5, outline: 8, h3: 4, pertanyaan: 6, perluDicek: 8 }

const SISTEM = [
  'Kamu perencana konten SEO di point., media edukasi praktis berbahasa Indonesia untuk pembaca 18 sampai 35 tahun. Tugasmu menyusun brief untuk satu artikel dari keyword yang diberikan editor.',
  [
    'Batas yang harus kamu jaga:',
    '- Kamu tidak bisa membuka hasil pencarian Google atau situs apa pun. Jangan menyebut peringkat, volume pencarian, jumlah kata pesaing, atau isi halaman pesaing.',
    '- Intent, format, outline, dan pertanyaan adalah perkiraanmu dari keyword. Editor akan mencocokkannya dengan hasil teratas Google.',
    '- Jangan menulis URL dan jangan menyebut sumber yang tidak ada di bahan. Daftar sumber resmi disiapkan point. dari database.',
    '- Angka, tarif, tanggal, dan aturan yang mungkin dibutuhkan artikel masuk ke perluDicek sebagai hal yang harus dicek, bukan ditulis sebagai fakta.',
  ].join('\n'),
  GAYA_POINT,
  ATURAN_BAHAN,
  [
    'Isian:',
    '- judulKerja: judul artikel 50 sampai 70 karakter yang memuat keyword.',
    '- intent dan alasanIntent: informasional, komersial, transaksional, atau navigasional, dengan alasan satu kalimat.',
    '- format dan alasanFormat: panduan, explainer, daftar, atau glosarium, dengan alasan satu kalimat. Panjang acuan tiap format ada di bahan.',
    `- keyphraseSekunder: 3 sampai ${BATAS_BRIEF.keyphraseSekunder} frasa terkait yang wajar diketik pembaca Indonesia.`,
    `- outline: 4 sampai ${BATAS_BRIEF.outline} bagian H2 berurutan, masing-masing dengan 0 sampai ${BATAS_BRIEF.h3} H3 dan catatan satu kalimat tentang isinya. H2 pertama langsung menjawab pertanyaan utama. Jangan membuat bagian penutup berjudul Kesimpulan.`,
    `- pertanyaan: 4 sampai ${BATAS_BRIEF.pertanyaan} pertanyaan yang kemungkinan dicari pembaca, untuk FAQ.`,
    '- sudutPembeda: satu atau dua kalimat tentang hal yang membuat artikel ini lebih berguna dari tulisan lain, misalnya contoh hitungan, kalkulator point., atau pengalaman penulis.',
    `- perluDicek: paling banyak ${BATAS_BRIEF.perluDicek} angka, aturan, atau klaim yang harus dicek editor ke sumber resmi sebelum menulis.`,
    '- Bila bahan menyebut artikel point. yang sudah memakai keyword yang sama, buat sudut yang jelas berbeda dan sebut perbedaannya di sudutPembeda.',
  ].join('\n'),
].join('\n\n')

const tanpaUrl = (teks: string) => teks.replace(/https?:\/\/\S+/g, '').replace(/\s{2,}/g, ' ').trim()

export const definisiBrief: DefinisiTugas<MasukanBrief, HasilBrief> = {
  baca(body) {
    const b = objek(body)
    if (!b) return 'Masukan brief tidak terbaca.'
    const keyword = teksMasukan(b.keyword, 120).teks
    if (!keyword) return 'Isi keyword dulu, lalu buat brief.'
    const id = (v: unknown) => (typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : null)
    return {
      keyword,
      tipe: TIPE_ARTIKEL.includes(b.tipe as TipeArtikel) ? (b.tipe as TipeArtikel) : 'panduan',
      pilar: id(b.pilar),
      artikel: id(b.artikel),
    }
  },

  prompt(m) {
    const k = m.konteks
    const terkait = k?.linkInternal.length ? k.linkInternal.map((a) => `- ${a.judul}`).join('\n') : '- (belum ada)'
    const sama = k?.kanibalisasi.length ? k.kanibalisasi.map((a) => `- ${a.judul} (keyphrase "${a.keyphrase}")`).join('\n') : '- (tidak ada)'
    const acuan = TIPE_ARTIKEL.map((t) => `- ${t}: ${PANJANG_ACUAN[t]}`).join('\n')
    const pesan = [
      `Keyword: ${m.keyword}`,
      `Pilar: ${k?.pilar ?? '(belum dipilih)'}`,
      `Format yang dipilih editor sekarang: ${m.tipe} (${LABEL_TIPE_ARTIKEL[m.tipe]})`,
      `Panjang acuan per format:\n${acuan}`,
      bungkus('artikel_terkait', `Artikel point. yang terkait:\n${terkait}`),
      bungkus('keyword_sudah_dipakai', `Artikel point. yang sudah memakai keyword ini atau yang sangat mirip:\n${sama}`),
    ].join('\n\n')
    return { sistem: SISTEM, pesan: teksMasukan(pesan, BATAS_TUGAS.brief.maksKarakter).teks, ringkasan: m.keyword }
  },

  skema: skemaObjek({
    judulKerja: SKEMA_TEKS,
    intent: { type: 'string', enum: [...INTENT] },
    alasanIntent: SKEMA_TEKS,
    format: { type: 'string', enum: [...TIPE_ARTIKEL] },
    alasanFormat: SKEMA_TEKS,
    keyphraseSekunder: daftarTeks(),
    outline: { type: 'array', items: skemaObjek({ h2: SKEMA_TEKS, h3: daftarTeks(), catatan: SKEMA_TEKS }) },
    pertanyaan: daftarTeks(),
    sudutPembeda: SKEMA_TEKS,
    perluDicek: daftarTeks(),
  }),

  periksa(json, m) {
    const j = objek(json)
    if (!j) return 'jawaban bukan objek'
    const b = pembersih()
    const teks = (v: unknown, maks?: number) => {
      const t = b.teks(v, maks)
      return t ? tanpaUrl(t) || null : null
    }
    const daftar = (v: unknown, n: number) => b.daftar(v, 300).map(tanpaUrl).filter(Boolean).slice(0, n)
    const intent = INTENT.find((i) => i === j.intent)
    const format = TIPE_ARTIKEL.find((t) => t === j.format)
    const judulKerja = teks(j.judulKerja, 200)
    const outline = (Array.isArray(j.outline) ? j.outline : [])
      .map(objek)
      .map((o) => ({ h2: teks(o?.h2, 200), h3: daftar(o?.h3, BATAS_BRIEF.h3), catatan: teks(o?.catatan, 400) ?? '' }))
      .filter((o): o is BagianOutline => Boolean(o.h2))
      .slice(0, BATAS_BRIEF.outline)
    if (!judulKerja || !intent || !format || outline.length === 0) return 'judul, intent, format, atau outline kosong atau salah bentuk'
    const konteks = m.konteks ?? { pilar: null, kanibalisasi: [], linkInternal: [], sumberResmi: [] }
    const catatan = [...b.catatan()]
    if (format !== m.tipe) catatan.push(`Brief menyarankan format ${LABEL_TIPE_ARTIKEL[format]}, sedangkan tipe artikel sekarang ${LABEL_TIPE_ARTIKEL[m.tipe]}.`)
    if (konteks.kanibalisasi.length) catatan.push('Keyword ini sudah dipakai artikel lain. Bedakan sudutnya, atau gabungkan ke artikel yang sudah ada.')
    return {
      keyword: m.keyword,
      dariModel: {
        judulKerja,
        intent,
        alasanIntent: teks(j.alasanIntent, 400) ?? '',
        format,
        alasanFormat: teks(j.alasanFormat, 400) ?? '',
        keyphraseSekunder: daftar(j.keyphraseSekunder, BATAS_BRIEF.keyphraseSekunder),
        outline,
        pertanyaan: daftar(j.pertanyaan, BATAS_BRIEF.pertanyaan),
        sudutPembeda: teks(j.sudutPembeda, 600) ?? '',
        perluDicek: daftar(j.perluDicek, BATAS_BRIEF.perluDicek),
      },
      dariPoint: { ...konteks, panjangAcuan: PANJANG_ACUAN[format] },
      cekManual: CEK_MANUAL,
      catatan,
    }
  },
}
