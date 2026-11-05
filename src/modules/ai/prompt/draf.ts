import { BATAS_TUGAS } from '../aturan'

import { daftarTeks, objek, pembersih, SKEMA_TEKS, skemaObjek, teksMasukan, type DefinisiTugas } from './bantu'
import { ATURAN_BAHAN, bungkus, GAYA_POINT } from './dasar'

/**
 * Draf per bagian (spesifikasi §10 butir 2): satu H2 per permintaan, dari poin brief dan catatan penulis.
 * Hasilnya tidak disisipkan ke editor isi: editor menyalinnya (HTML dan teks polos, jadi subjudul dan daftar
 * tetap terbentuk saat ditempel) ke posisi yang dia pilih, lalu menulis ulang. Menyalin menandai artikel
 * memakai draf AI.
 */

export const JENIS_BLOK_DRAF = ['paragraf', 'h3', 'butir'] as const
export type BlokDraf = { jenis: (typeof JENIS_BLOK_DRAF)[number]; teks: string }

export type MasukanDraf = { judul: string; keyphrase: string; h2: string; poin: string[]; outline: string[]; catatan: string }

export type HasilDraf = { h2: string; blok: BlokDraf[]; perluDicek: string[]; catatan: string[] }

/** Penanda yang diminta prompt untuk angka yang belum ada di catatan penulis. */
export const PENANDA_ANGKA = '[cek angka]'

const BATAS_DRAF = { blok: 20, perluDicek: 8, poin: 10, outline: 12, catatan: 4_000 }

const SISTEM = [
  'Kamu penulis pendamping di point., media edukasi praktis berbahasa Indonesia. Tugasmu menulis draf satu bagian artikel (satu H2) yang akan diperiksa dan ditulis ulang editor.',
  [
    'Batas yang harus kamu jaga:',
    '- Tulis hanya bagian yang diminta. Jangan menulis pembuka artikel, bagian lain, atau penutup.',
    `- Catatan penulis adalah bahan utama. Angka, tarif, tanggal, dan aturan hanya boleh diambil dari catatan penulis; selain itu tulis ${PENANDA_ANGKA} di tempat angkanya dan masukkan hal itu ke perluDicek.`,
    '- Jangan mengarang pengalaman pribadi, kutipan, nama narasumber, atau hasil penelitian. Bagian yang butuh pengalaman penulis ditandai [isi pengalamanmu].',
    '- Jangan menulis URL.',
  ].join('\n'),
  GAYA_POINT,
  ATURAN_BAHAN,
  [
    'Isian:',
    '- blok: urutan isi bagian. Jenis paragraf berisi 2 sampai 4 kalimat; jenis h3 adalah subjudul di dalam bagian ini, dipakai bila poin brief membutuhkannya; jenis butir adalah satu butir daftar, dan butir yang berurutan menjadi satu daftar. Panjang seluruh blok 150 sampai 400 kata.',
    `- perluDicek: paling banyak ${BATAS_DRAF.perluDicek} angka, aturan, atau klaim di draf yang harus dicek editor ke sumber resmi.`,
  ].join('\n'),
].join('\n\n')

const daftarMasukan = (v: unknown, n: number, maks: number) =>
  (Array.isArray(v) ? v : [])
    .map((x) => teksMasukan(x, maks).teks)
    .filter(Boolean)
    .slice(0, n)

export const definisiDraf: DefinisiTugas<MasukanDraf, HasilDraf> = {
  baca(body) {
    const b = objek(body)
    if (!b) return 'Masukan draf tidak terbaca.'
    const h2 = teksMasukan(b.h2, 200).teks
    if (!h2) return 'Isi subjudul (H2) bagian yang mau ditulis dulu.'
    return {
      judul: teksMasukan(b.judul, 300).teks,
      keyphrase: teksMasukan(b.keyphrase, 120).teks,
      h2,
      poin: daftarMasukan(b.poin, BATAS_DRAF.poin, 300),
      outline: daftarMasukan(b.outline, BATAS_DRAF.outline, 200),
      catatan: teksMasukan(b.catatan, BATAS_DRAF.catatan).teks,
    }
  },

  prompt(m) {
    const pesan = [
      `Judul artikel: ${m.judul || '(belum diisi)'}`,
      `Keyphrase utama: ${m.keyphrase || '(belum diisi)'}`,
      `Bagian yang ditulis (H2): ${m.h2}`,
      `Outline artikel, untuk konteks saja:\n${m.outline.length ? m.outline.map((o) => `- ${o}`).join('\n') : '- (tidak ada)'}`,
      bungkus('poin_brief', m.poin.length ? m.poin.map((p) => `- ${p}`).join('\n') : '(tidak ada)'),
      bungkus('catatan_penulis', m.catatan || '(tidak ada; semua angka ditulis sebagai penanda)'),
    ].join('\n\n')
    return { sistem: SISTEM, pesan: teksMasukan(pesan, BATAS_TUGAS.draf.maksKarakter).teks, ringkasan: m.h2 }
  },

  skema: skemaObjek({
    blok: { type: 'array', items: skemaObjek({ jenis: { type: 'string', enum: [...JENIS_BLOK_DRAF] }, teks: SKEMA_TEKS }) },
    perluDicek: daftarTeks(),
  }),

  periksa(json, m) {
    const j = objek(json)
    if (!j || !Array.isArray(j.blok)) return 'blok kosong atau salah bentuk'
    const b = pembersih()
    const blok = j.blok
      .map(objek)
      .map((x) => ({ jenis: JENIS_BLOK_DRAF.find((k) => k === x?.jenis), teks: b.teks(x?.teks, 2_000)?.replace(/https?:\/\/\S+/g, '').trim() }))
      .filter((x): x is BlokDraf => Boolean(x.jenis && x.teks))
      .slice(0, BATAS_DRAF.blok)
    if (!blok.some((x) => x.jenis === 'paragraf')) return 'draf tanpa paragraf'
    const catatan = [...b.catatan()]
    const penanda = blok.reduce((n, x) => n + x.teks.split(PENANDA_ANGKA).length - 1, 0)
    if (penanda) catatan.push(`${penanda} penanda ${PENANDA_ANGKA} perlu kamu isi dari sumber resmi.`)
    // Subjudul bagian selalu yang diminta editor, bukan rumusan ulang model.
    return { h2: m.h2, blok, perluDicek: b.daftar(j.perluDicek, 300).slice(0, BATAS_DRAF.perluDicek), catatan }
  },
}

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Draf sebagai HTML untuk papan klip: H2, paragraf, H3, dan butir berurutan dalam satu daftar. */
export function htmlDraf(d: Pick<HasilDraf, 'h2' | 'blok'>): string {
  const bagian: string[] = [`<h2>${escape(d.h2)}</h2>`]
  let daftar: string[] = []
  const tutupDaftar = () => {
    if (daftar.length) bagian.push(`<ul>${daftar.join('')}</ul>`)
    daftar = []
  }
  for (const b of d.blok) {
    if (b.jenis === 'butir') {
      daftar.push(`<li>${escape(b.teks)}</li>`)
      continue
    }
    tutupDaftar()
    bagian.push(b.jenis === 'h3' ? `<h3>${escape(b.teks)}</h3>` : `<p>${escape(b.teks)}</p>`)
  }
  tutupDaftar()
  return bagian.join('')
}

/** Draf sebagai teks polos untuk papan klip (penempelan di tempat yang tidak menerima HTML). */
export function teksDraf(d: Pick<HasilDraf, 'h2' | 'blok'>): string {
  return [d.h2, ...d.blok.map((b) => (b.jenis === 'butir' ? `- ${b.teks}` : b.teks))].join('\n\n')
}
