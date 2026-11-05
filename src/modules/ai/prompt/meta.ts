import { slugify } from '@/lib/slug'
import { BATAS } from '@/modules/seo/analisis'

import { BATAS_TUGAS, potongTeks } from '../aturan'

import { daftarTeks, objek, pembersih, SKEMA_TEKS, skemaObjek, teksMasukan, type DefinisiTugas } from './bantu'
import { ATURAN_BAHAN, bungkus, GAYA_POINT } from './dasar'

/**
 * Generator meta (spesifikasi §10 butir 3): judul SEO, meta description, slug, alt gambar utama, kotak
 * Intinya, dan FAQ dari isi artikel yang sedang ditulis. Model bawaan Haiku: tugasnya meringkas teks yang
 * sudah ada. Editor memilih isian mana yang diterapkan.
 */

export type MasukanMeta = { judul: string; keyphrase: string; teks: string; dipotong: boolean }

export type HasilMeta = {
  judulSeo: string
  metaDeskripsi: string
  slug: string
  altGambarUtama: string
  intinya: string[]
  faq: { pertanyaan: string; jawaban: string }[]
  /** Peringatan untuk editor: panjang di luar checklist panel SEO, tanda pisah yang diganti, isi yang dipotong. */
  catatan: string[]
}

/** Batas kotak Intinya (koleksi artikel): 2 sampai 4 poin, 220 karakter per poin. */
const INTINYA = { maks: 4, karakter: 220 }
const FAQ_MAKS = 5

const SISTEM = [
  'Kamu editor SEO di point., media edukasi praktis berbahasa Indonesia. Tugasmu menyusun isian meta dari artikel yang sedang ditulis editor. Editor memilih sendiri isian mana yang dipakai.',
  GAYA_POINT,
  ATURAN_BAHAN,
  [
    'Isian:',
    `- judulSeo: ${BATAS.judulSeo.min} sampai ${BATAS.judulSeo.maks} karakter, memuat keyphrase utama sedekat mungkin ke awal, tanpa nama situs.`,
    `- metaDeskripsi: ${BATAS.meta.min} sampai ${BATAS.meta.maks} karakter, menjawab pencarian dan menyebut apa yang didapat pembaca.`,
    '- slug: huruf kecil dan tanda hubung, paling banyak enam kata, memuat keyphrase utama.',
    '- altGambarUtama: satu kalimat pendek tentang gambar yang paling mungkin menyertai artikel, tanpa awalan "gambar" atau "foto". Kamu tidak melihat gambarnya, jadi tulis yang aman dan umum.',
    `- intinya: 2 sampai ${INTINYA.maks} poin jawaban langsung, masing-masing paling banyak 200 karakter, hanya dari isi artikel.`,
    `- faq: 3 sampai ${FAQ_MAKS} pertanyaan yang benar-benar dijawab artikel, jawaban 1 sampai 3 kalimat dari isi artikel.`,
  ].join('\n'),
].join('\n\n')

export const definisiMeta: DefinisiTugas<MasukanMeta, HasilMeta> = {
  baca(body) {
    const b = objek(body)
    if (!b) return 'Masukan generator meta tidak terbaca.'
    const isi = teksMasukan(b.teks, BATAS_TUGAS.meta.maksKarakter)
    if (!isi.teks) return 'Isi artikel masih kosong. Tulis isinya dulu, lalu buat saran meta.'
    return {
      judul: teksMasukan(b.judul, 300).teks,
      keyphrase: teksMasukan(b.keyphrase, 120).teks,
      teks: isi.teks,
      dipotong: isi.dipotong,
    }
  },

  prompt(m) {
    return {
      sistem: SISTEM,
      pesan: [`Keyphrase utama: ${m.keyphrase || '(belum diisi, ambil dari judul)'}`, `Judul artikel: ${m.judul || '(belum diisi)'}`, bungkus('artikel', m.teks)].join('\n\n'),
      ringkasan: (m.judul || m.keyphrase || 'Tanpa judul').slice(0, 160),
    }
  },

  skema: skemaObjek({
    judulSeo: SKEMA_TEKS,
    metaDeskripsi: SKEMA_TEKS,
    slug: SKEMA_TEKS,
    altGambarUtama: SKEMA_TEKS,
    intinya: daftarTeks('2 sampai 4 poin'),
    faq: { type: 'array', items: skemaObjek({ pertanyaan: SKEMA_TEKS, jawaban: SKEMA_TEKS }), description: '3 sampai 5 pertanyaan' },
  }),

  periksa(json, m) {
    const j = objek(json)
    if (!j) return 'jawaban bukan objek'
    const b = pembersih()
    const judulSeo = b.teks(j.judulSeo, 200)
    const metaDeskripsi = b.teks(j.metaDeskripsi, 400)
    const altGambarUtama = b.teks(j.altGambarUtama, 300)
    const slug = slugify(typeof j.slug === 'string' && j.slug.trim() ? j.slug : (judulSeo ?? ''))
    if (!judulSeo || !metaDeskripsi || !slug || !Array.isArray(j.intinya) || !Array.isArray(j.faq)) return 'isian wajib kosong atau salah bentuk'
    const semuaPoin = b.daftar(j.intinya, 1_000)
    const intinya = semuaPoin.slice(0, INTINYA.maks).map((p) => potongTeks(p, INTINYA.karakter).teks)
    const faq = j.faq
      .map(objek)
      .map((f) => ({ pertanyaan: b.teks(f?.pertanyaan, 300), jawaban: b.teks(f?.jawaban, 1_000) }))
      .filter((f): f is HasilMeta['faq'][number] => Boolean(f.pertanyaan && f.jawaban))
      .slice(0, FAQ_MAKS)
    const catatan = [...b.catatan()]
    const di = (n: number, r: { min: number; maks: number }) => n < r.min || n > r.maks
    if (di(judulSeo.length, BATAS.judulSeo)) catatan.push(`Judul SEO ${judulSeo.length} karakter, di luar saran ${BATAS.judulSeo.min}-${BATAS.judulSeo.maks}.`)
    if (di(metaDeskripsi.length, BATAS.meta)) catatan.push(`Meta description ${metaDeskripsi.length} karakter, di luar saran ${BATAS.meta.min}-${BATAS.meta.maks}.`)
    if (semuaPoin.some((p) => p.length > INTINYA.karakter)) catatan.push(`Poin Intinya yang lebih dari ${INTINYA.karakter} karakter dipotong.`)
    if (m.dipotong) catatan.push(`Isi artikel lebih dari ${BATAS_TUGAS.meta.maksKarakter.toLocaleString('id-ID')} karakter; hanya bagian awal yang dibaca.`)
    return { judulSeo, metaDeskripsi, slug, altGambarUtama: altGambarUtama ?? '', intinya, faq, catatan }
  },
}
