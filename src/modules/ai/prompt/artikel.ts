import { TOOL_IDS, type TipeArtikel, type ToolId } from '@/lib/konstanta'
import { isReservedSlug, slugify } from '@/lib/slug'
import { GalatMarkdown, markdownKeLexical, type CariDokumen } from '@/modules/paket/markdown'
import { BATAS } from '@/modules/seo/analisis'
import { hitungKata } from '@/modules/seo/teks'

import { bersihkanTanda, potongTeks } from '../aturan'

import { daftarTeks, objek, pembersih, SKEMA_TEKS, skemaObjek, type DefinisiTugas } from './bantu'
import { ATURAN_BAHAN, bungkus, GAYA_POINT } from './dasar'

/**
 * Draf artikel lengkap Otomasi artikel (spesifikasi §27): satu panggilan menghasilkan judul, deck, Intinya, isi
 * markdown paket (`paket/markdown.ts`), FAQ, sumber, dan isian SEO, untuk topik yang sudah disetujui pemilik.
 * Hasilnya masuk sebagai draf ber-`pakaiDrafAi`, jadi checklist review manusia tetap wajib sebelum terbit. Angka
 * aturan yang tidak ada di bahan ditandai `[cek angka]`, dan antrean terbit menolak draf yang masih memuatnya.
 */

export const PENANDA_CEK_ANGKA = '[cek angka]'

export type MasukanArtikel = {
  tanggal: string
  topik: {
    judul: string
    kataKunci: string
    tipe: Exclude<TipeArtikel, 'glosarium'>
    alasan: string
    pilar: { slug: string; nama: string }
    subkategori: { slug: string; nama: string } | null
  }
  /** Tulisan terbit yang boleh ditautkan, dengan slug-nya (tautan `/slug`). */
  linkInternal: { slug: string; judul: string }[]
  tools: { id: ToolId; nama: string }[]
  /** Kalkulator yang paling relevan (dari usulan). */
  toolsUtama: ToolId[]
  sumberResmi: { nama: string; url: string }[]
  arahan: string
}

export type HasilArtikel = {
  judul: string
  slug: string
  deck: string
  intinya: string[]
  isi: string
  faq: { pertanyaan: string; jawaban: string }[]
  sumber: { judul: string; url: string; penerbit: string }[]
  seo: { keyphrase: string; keyphraseSekunder: string[]; judulSEO: string; metaDeskripsi: string }
  tools: ToolId[]
  /** Slug tulisan yang ditautkan di isi, untuk "Baca juga". */
  terkait: string[]
  sampul: { kata: string; alt: string }
  perluDicek: string[]
  /** Jumlah penanda `[cek angka]` di seluruh teks. */
  cekAngka: number
  catatan: string[]
}

const PANJANG = { kataMin: 600, h2Min: 3 }

const FORMAT_ISI = [
  'Format isi (markdown terbatas, satu blok per baris kosong):',
  '- Subjudul hanya "## " (H2) dan "### " (H3). Jangan menulis judul artikel (H1) di isi.',
  '- Daftar butir "- " dan daftar bernomor "1. ".',
  '- Tabel pipa: baris "Tabel: Judul tabel", lalu baris judul kolom, baris pemisah "|---|---|", lalu baris isi. Setiap kolom berjudul dan setiap sel berisi (tulis "-" bila kosong). Jangan ada tautan di tabel.',
  '- Kotak catatan: "> [!info] Judul", "> [!tips] Judul", atau "> [!peringatan] Judul", lalu baris "> isi". Jangan ada tautan di kotak catatan.',
  '- Kalkulator point. disematkan dengan baris sendiri "[[tool:ID]]", hanya ID dari daftar kalkulator.',
  '- Tautan di paragraf atau butir: "[teks](/slug)" ke tulisan point. dari daftar, "[teks](/tools/ID)" ke kalkulator, "[teks](https://...)" ke sumber resmi.',
  '- Tanpa huruf tebal, tanpa HTML, tanpa gambar.',
].join('\n')

function sistem(m: MasukanArtikel): string {
  const struktur: Record<MasukanArtikel['topik']['tipe'], string> = {
    panduan: 'Panduan: jawaban singkat di paragraf pertama, lalu langkah berurutan, contoh hitung lengkap dengan tabel bila ada angka, kesalahan yang sering terjadi, dan langkah berikutnya.',
    explainer: 'Penjelasan: jawaban singkat di paragraf pertama, lalu apa itu, kenapa penting bagi pembaca, cara kerjanya, contoh nyata, dan hal yang sering disalahpahami.',
    daftar: 'Daftar: jawaban singkat di paragraf pertama, lalu butir-butir bernomor sebagai H2 atau H3, masing-masing dengan penjelasan praktis dan kapan cocok dipakai.',
  }
  return [
    'Kamu penulis senior point., media edukasi praktis berbahasa Indonesia. Tugasmu menulis draf artikel lengkap untuk topik yang sudah disetujui pemilik. Draf ini direview manusia sebelum terbit.',
    GAYA_POINT,
    ATURAN_BAHAN,
    [
      'Aturan isi:',
      `- ${struktur[m.topik.tipe]}`,
      `- Panjang isi 900 sampai 1.500 kata, minimal ${PANJANG.h2Min} subjudul H2. Paragraf pendek, dua sampai empat kalimat.`,
      '- Keyphrase utama muncul di judul, di paragraf pertama (dalam 100 kata pertama), dan wajar di satu subjudul.',
      '- Tautkan 3 sampai 5 tulisan point. yang relevan dari daftar tautan internal, di tempat yang alami. Jangan membuat slug sendiri.',
      '- Sematkan kalkulator yang relevan dengan [[tool:ID]] bila ada, tepat setelah bagian yang membahas hitungannya.',
      `- Angka aturan (tarif, persentase, batas, nominal rupiah, tanggal berlaku, nomor peraturan) boleh ditulis dari pengetahuanmu hanya bila kamu cukup yakin, dan setiap angka seperti itu langsung diikuti ${PENANDA_CEK_ANGKA} supaya editor memeriksanya ke sumber resmi. Angka contoh hitung yang kamu karang sendiri (misalnya gaji contoh) tidak perlu ditandai. Bila tidak yakin, jelaskan caranya tanpa angka.`,
      '- Sumber: 2 sampai 3 sumber resmi. Pakai URL dari daftar sumber resmi; boleh URL lain hanya dari situs lembaga pemerintah atau lembaga resmi yang kamu yakini ada. Jangan mengarang URL halaman yang mendalam.',
      '- perluDicek: daftar singkat hal yang wajib diperiksa editor sebelum terbit (angka, aturan, tanggal, nama program).',
    ].join('\n'),
    FORMAT_ISI,
    [
      'Isian lain:',
      '- judul: judul artikel (H1), paling banyak 70 karakter, memuat keyphrase utama.',
      '- slug: huruf kecil dan tanda hubung, paling banyak enam kata, memuat keyphrase utama.',
      '- deck: satu kalimat ringkas di bawah judul, paling banyak 160 karakter.',
      '- intinya: 3 poin jawaban langsung, masing-masing paling banyak 200 karakter.',
      '- faq: 3 sampai 5 pertanyaan yang benar-benar dicari orang, jawaban 1 sampai 3 kalimat.',
      `- judulSeo: tiga kandidat ${BATAS.judulSeo.min} sampai ${BATAS.judulSeo.maks} karakter, keyphrase sedekat mungkin ke awal, tanpa nama situs.`,
      `- metaDeskripsi: tiga kandidat ${BATAS.meta.min} sampai ${BATAS.meta.maks} karakter.`,
      '- keyphraseSekunder: 2 sampai 4 frasa turunan.',
      '- kataSampul: satu sampai tiga kata inti topik untuk kartu sampul, paling banyak 22 huruf.',
      '- altSampul: teks alternatif kartu sampul, misalnya "Kartu bertuliskan Dana Darurat di atas warna pilar Uang & Karier".',
      '- tools: ID kalkulator yang ditautkan atau disematkan.',
    ].join('\n'),
  ].join('\n\n')
}

/** Cari dokumen tiruan untuk memeriksa isi tanpa database: slug di daftar tautan internal dan ID kalkulator. */
function cariUji(m: MasukanArtikel): CariDokumen {
  const slug = new Map(m.linkInternal.map((l, i) => [l.slug, i + 1]))
  return {
    artikel: (s) => slug.get(s) ?? null,
    tools: (id) => ((TOOL_IDS as readonly string[]).includes(id) ? id : null),
  }
}

/** Kandidat yang panjangnya di rentang, atau yang paling dekat ke rentang. */
export function pilihKandidat(kandidat: string[], r: { min: number; maks: number }): string | null {
  const jarak = (t: string) => (t.length < r.min ? r.min - t.length : t.length > r.maks ? t.length - r.maks : 0)
  return [...kandidat].sort((a, b) => jarak(a) - jarak(b))[0] ?? null
}

/** Isi markdown dibersihkan per baris (baris kosong pemisah blok tetap ada). */
function bersihkanIsi(isi: string): { teks: string; diganti: number } {
  let diganti = 0
  const baris = isi
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((b) => {
      const hasil = bersihkanTanda(b.replace(/[ \t]+$/g, ''))
      diganti += hasil.diganti
      return hasil.teks
    })
  return { teks: baris.join('\n').replace(/\n{3,}/g, '\n\n').trim(), diganti }
}

export function hitungCekAngka(...teks: string[]): number {
  return teks.reduce((n, t) => n + (t.split(PENANDA_CEK_ANGKA).length - 1), 0)
}

export const definisiArtikel: DefinisiTugas<MasukanArtikel, HasilArtikel> = {
  baca(body) {
    const b = objek(body) as MasukanArtikel | null
    if (!b || !objek(b.topik) || !b.topik.judul || !b.topik.kataKunci) return 'Topik artikel tidak lengkap.'
    return { ...b, arahan: potongTeks(typeof b.arahan === 'string' ? b.arahan : '', 1_500).teks }
  },

  prompt(m) {
    const t = m.topik
    const pesan = [
      `Tanggal hari ini: ${m.tanggal}.`,
      bungkus(
        'topik',
        [
          `Judul kerja: ${t.judul}`,
          `Keyphrase utama: ${t.kataKunci}`,
          `Tipe: ${t.tipe}`,
          `Pilar: ${t.pilar.nama}`,
          `Subkategori: ${t.subkategori?.nama ?? '-'}`,
          `Alasan dari usulan: ${t.alasan}`,
        ].join('\n'),
      ),
      bungkus('tautan_internal', m.linkInternal.map((l) => `/${l.slug}: ${l.judul}`).join('\n') || '(belum ada tulisan lain yang relevan)'),
      bungkus('kalkulator', m.tools.map((x) => `${x.id}: ${x.nama}${m.toolsUtama.includes(x.id) ? ' (paling relevan)' : ''}`).join('\n')),
      bungkus('sumber_resmi', m.sumberResmi.map((s) => `${s.nama}: ${s.url}`).join('\n') || '(belum diisi pemilik)'),
      m.arahan ? bungkus('arahan_pemilik', m.arahan) : '',
    ]
      .filter(Boolean)
      .join('\n\n')
    return { sistem: sistem(m), pesan, ringkasan: t.judul.slice(0, 160) }
  },

  skema: skemaObjek({
    judul: SKEMA_TEKS,
    slug: SKEMA_TEKS,
    deck: SKEMA_TEKS,
    intinya: daftarTeks('3 poin'),
    isi: { type: 'string', description: 'markdown terbatas point.' },
    faq: { type: 'array', items: skemaObjek({ pertanyaan: SKEMA_TEKS, jawaban: SKEMA_TEKS }) },
    sumber: { type: 'array', items: skemaObjek({ judul: SKEMA_TEKS, url: SKEMA_TEKS, penerbit: SKEMA_TEKS }) },
    judulSeo: daftarTeks('tiga kandidat'),
    metaDeskripsi: daftarTeks('tiga kandidat'),
    keyphraseSekunder: daftarTeks(),
    kataSampul: SKEMA_TEKS,
    altSampul: SKEMA_TEKS,
    tools: daftarTeks('ID kalkulator'),
    perluDicek: daftarTeks(),
  }),

  periksa(json, m) {
    const j = objek(json)
    if (!j) return 'jawaban bukan objek'
    const b = pembersih()
    const judul = b.teks(j.judul, 120)
    const deck = b.teks(j.deck, 300)
    if (!judul || !deck || typeof j.isi !== 'string') return 'judul, deck, atau isi kosong'
    const isi = bersihkanIsi(j.isi)
    try {
      markdownKeLexical(isi.teks, cariUji(m), 'periksa')
    } catch (galat) {
      if (galat instanceof GalatMarkdown) return `isi tidak sesuai format: ${galat.message}`
      throw galat
    }
    const kata = hitungKata(isi.teks)
    const h2 = isi.teks.split('\n').filter((baris) => baris.startsWith('## ')).length
    if (kata < PANJANG.kataMin || h2 < PANJANG.h2Min) return `isi terlalu pendek (${kata} kata, ${h2} subjudul H2)`

    const intinya = b.daftar(j.intinya, 1_000).slice(0, 4).map((p) => potongTeks(p, 220).teks)
    const faq = (Array.isArray(j.faq) ? j.faq : [])
      .map(objek)
      .map((f) => ({ pertanyaan: b.teks(f?.pertanyaan, 300), jawaban: b.teks(f?.jawaban, 1_000) }))
      .filter((f): f is HasilArtikel['faq'][number] => Boolean(f.pertanyaan && f.jawaban))
      .slice(0, 5)
    if (intinya.length < 2 || faq.length < 2) return 'Intinya atau FAQ kurang'

    const sumber = (Array.isArray(j.sumber) ? j.sumber : [])
      .map(objek)
      .map((s) => ({ judul: b.teks(s?.judul, 200), url: typeof s?.url === 'string' ? s.url.trim() : '', penerbit: b.teks(s?.penerbit, 100) ?? '' }))
      .filter((s): s is HasilArtikel['sumber'][number] => Boolean(s.judul) && /^https:\/\/[^\s]+$/.test(s.url))
      .slice(0, 3)

    const judulSEO = pilihKandidat(b.daftar(j.judulSeo, 200), BATAS.judulSeo) ?? judul
    const metaDeskripsi = pilihKandidat(b.daftar(j.metaDeskripsi, 400), BATAS.meta) ?? deck
    let slug = slugify(typeof j.slug === 'string' && j.slug.trim() ? j.slug : m.topik.kataKunci)
    if (!slug || isReservedSlug(slug)) slug = slugify(`${m.topik.kataKunci} panduan`)

    const tools = [...new Set(b.daftar(j.tools, 60).filter((t): t is ToolId => (TOOL_IDS as readonly string[]).includes(t)))]
    const slugTautan = new Set(m.linkInternal.map((l) => l.slug))
    const terkait = [...new Set([...isi.teks.matchAll(/\]\(\/([a-z0-9-]+)\)/g)].map((c) => c[1]).filter((s) => slugTautan.has(s)))].slice(0, 3)
    const kataSampul = potongTeks(b.teks(j.kataSampul, 60) ?? m.topik.kataKunci, 22).teks
    const altSampul = b.teks(j.altSampul, 200) ?? `Kartu bertuliskan ${kataSampul} di atas warna pilar ${m.topik.pilar.nama}`
    const perluDicek = b.daftar(j.perluDicek, 300).slice(0, 12)

    const catatan = [...b.catatan()]
    if (isi.diganti) catatan.push(`${isi.diganti} em dash atau en dash di isi diganti.`)
    if (sumber.length < BATAS.sumberEksternal.min) catatan.push(`Sumber resmi baru ${sumber.length}; tambahkan sampai ${BATAS.sumberEksternal.min}.`)
    const cekAngka = hitungCekAngka(isi.teks, ...intinya, ...faq.flatMap((f) => [f.pertanyaan, f.jawaban]), deck)
    return {
      judul,
      slug,
      deck,
      intinya,
      isi: isi.teks,
      faq,
      sumber,
      seo: { keyphrase: m.topik.kataKunci, keyphraseSekunder: b.daftar(j.keyphraseSekunder, 80).slice(0, 4), judulSEO, metaDeskripsi },
      tools,
      terkait,
      sampul: { kata: kataSampul, alt: altSampul },
      perluDicek,
      cekAngka,
      catatan,
    }
  },
}
