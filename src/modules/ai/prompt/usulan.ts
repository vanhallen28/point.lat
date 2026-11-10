import { TIPE_ARTIKEL, TOOL_IDS, type TipeArtikel, type ToolId } from '@/lib/konstanta'
import { slugify } from '@/lib/slug'
import { tingkatMirip } from '@/modules/seo/kemiripan'

import { BATAS_TUGAS, potongTeks } from '../aturan'

import { daftarTeks, objek, pembersih, SKEMA_TEKS, skemaObjek, type DefinisiTugas } from './bantu'
import { ATURAN_BAHAN, bungkus, GAYA_POINT } from './dasar'

/**
 * Usulan topik Otomasi artikel (spesifikasi §27): Claude mengusulkan topik dari pilar, subkategori, tulisan yang
 * sudah ada, halaman paling banyak diklik dari Google, kalkulator, dan arahan pemilik. Pemilik menyetujui atau
 * menolak setiap usulan sebelum ada yang ditulis. Masukan disusun server (`otomasi/data.ts`), bukan editor.
 */

export type PilarUsulan = { slug: string; nama: string; subkategori: { slug: string; nama: string }[] }

export type MasukanUsulan = {
  /** Tanggal WIB `YYYY-MM-DD`, supaya topik musiman (THR, SPT, pendaftaran kampus) tepat waktu. */
  tanggal: string
  jumlah: number
  pilar: PilarUsulan[]
  /** Judul dan keyphrase tulisan yang sudah ada (terbit dan draf), supaya tidak mengulang. */
  artikelAda: { judul: string; keyphrase: string }[]
  /** Usulan sebelumnya (menunggu, disetujui, ditolak, ditulis); yang ditolak menandai selera pemilik. */
  usulanAda: { judul: string; kataKunci: string; status: string }[]
  /** Halaman dengan klik Google terbanyak 7 hari terakhir. */
  populer: { judul: string; klik: number }[]
  tools: { id: ToolId; nama: string }[]
  arahan: string
}

export type UsulanTopik = {
  judul: string
  kataKunci: string
  pilar: string
  /** Slug subkategori yang sudah ada, atau `null` bila usulan membawa subkategori baru. */
  subkategori: string | null
  subkategoriBaru: { slug: string; nama: string; deskripsi: string } | null
  tipe: Exclude<TipeArtikel, 'glosarium'>
  alasan: string
  tools: ToolId[]
}

export type HasilUsulan = { usulan: UsulanTopik[]; catatan: string[] }

export const JUMLAH_USULAN = { min: 3, maks: 15 }

const SISTEM = [
  'Kamu redaktur pelaksana point., media edukasi praktis berbahasa Indonesia untuk pembaca 18 sampai 35 tahun. Pilarnya uang dan karier, teknologi, belajar, dan kesehatan. Tugasmu mengusulkan topik artikel baru yang paling berguna bagi pembaca dan paling mungkin dicari di Google, lalu pemilik memilih mana yang ditulis.',
  GAYA_POINT,
  ATURAN_BAHAN,
  [
    'Aturan usulan:',
    '- Satu usulan menjawab satu pertanyaan atau satu kebutuhan yang jelas, misalnya cara menghitung, syarat, langkah, perbandingan, atau arti istilah. Hindari topik berita harian, gosip, prediksi harga, dan saran investasi spesifik.',
    '- Jangan mengulang tulisan yang sudah ada atau usulan sebelumnya, termasuk yang sekadar beda kata. Usulan yang ditolak menandai topik yang tidak diinginkan pemilik; hindari yang serupa.',
    '- Utamakan topik yang bisa ditautkan ke tulisan yang sudah ada dan ke kalkulator point., dan topik musiman yang jatuh dalam satu sampai tiga bulan dari tanggal hari ini.',
    '- judul: judul kerja yang jelas, paling banyak 70 karakter.',
    '- kataKunci: keyphrase utama yang diketik orang di Google, 2 sampai 6 kata, huruf kecil.',
    '- pilar: slug dari daftar pilar. subkategori: slug subkategori yang sudah ada di pilar itu, atau string kosong bila perlu subkategori baru. subkategoriBaru: isi slug, nama, dan deskripsi satu kalimat bila subkategori kosong; bila tidak, isi ketiganya dengan string kosong.',
    `- tipe: ${TIPE_ARTIKEL.filter((t) => t !== 'glosarium').join(', ')}.`,
    '- alasan: satu sampai dua kalimat, kenapa topik ini dicari dan apa yang didapat pembaca.',
    '- tools: id kalkulator point. yang relevan dari daftar, atau daftar kosong.',
  ].join('\n'),
].join('\n\n')

export const definisiUsulan: DefinisiTugas<MasukanUsulan, HasilUsulan> = {
  baca(body) {
    const b = objek(body) as MasukanUsulan | null
    if (!b || !Array.isArray(b.pilar) || b.pilar.length === 0) return 'Belum ada pilar untuk diusulkan topiknya.'
    const jumlah = Math.min(JUMLAH_USULAN.maks, Math.max(JUMLAH_USULAN.min, Math.round(Number(b.jumlah) || JUMLAH_USULAN.min)))
    return { ...b, jumlah, arahan: potongTeks(typeof b.arahan === 'string' ? b.arahan : '', 1_500).teks }
  },

  prompt(m) {
    const baris = (xs: string[], kosong: string) => (xs.length ? xs.join('\n') : kosong)
    const bahan = [
      `Tanggal hari ini: ${m.tanggal}. Buat ${m.jumlah} usulan.`,
      bungkus(
        'pilar',
        m.pilar.map((p) => `${p.slug} (${p.nama}): subkategori ${p.subkategori.map((s) => `${s.slug} (${s.nama})`).join(', ') || 'belum ada'}`).join('\n'),
      ),
      bungkus('tulisan_yang_sudah_ada', baris(m.artikelAda.map((a) => `- ${a.judul} [${a.keyphrase}]`), '(belum ada)')),
      bungkus('usulan_sebelumnya', baris(m.usulanAda.map((u) => `- ${u.judul} [${u.kataKunci}] status ${u.status}`), '(belum ada)')),
      bungkus('paling_banyak_diklik_dari_google', baris(m.populer.map((p) => `- ${p.judul}: ${p.klik} klik`), '(belum ada data Search Console)')),
      bungkus('kalkulator', m.tools.map((t) => `${t.id}: ${t.nama}`).join('\n')),
      m.arahan ? bungkus('arahan_pemilik', m.arahan) : '',
    ]
    // Bahan dibatasi supaya cadangan anggaran tetap kecil walau tulisan sudah ratusan.
    const pesan = potongTeks(bahan.filter(Boolean).join('\n\n'), BATAS_TUGAS.usulan.maksKarakter).teks
    return { sistem: SISTEM, pesan, ringkasan: `${m.jumlah} usulan topik` }
  },

  skema: skemaObjek({
    usulan: {
      type: 'array',
      items: skemaObjek({
        judul: SKEMA_TEKS,
        kataKunci: SKEMA_TEKS,
        pilar: SKEMA_TEKS,
        subkategori: SKEMA_TEKS,
        subkategoriBaru: skemaObjek({ slug: SKEMA_TEKS, nama: SKEMA_TEKS, deskripsi: SKEMA_TEKS }),
        tipe: SKEMA_TEKS,
        alasan: SKEMA_TEKS,
        tools: daftarTeks('id kalkulator'),
      }),
    },
  }),

  periksa(json, m) {
    const j = objek(json)
    if (!j || !Array.isArray(j.usulan)) return 'jawaban tanpa daftar usulan'
    const b = pembersih()
    const pilar = new Map(m.pilar.map((p) => [p.slug, p]))
    const sudah = [...m.artikelAda.map((a) => a.keyphrase), ...m.usulanAda.map((u) => u.kataKunci)].filter(Boolean)
    const hasil: UsulanTopik[] = []
    let dibuang = 0
    for (const mentah of j.usulan) {
      const u = objek(mentah)
      const judul = b.teks(u?.judul, 120)
      const kataKunci = b.teks(u?.kataKunci, 80)?.toLowerCase() ?? null
      const p = pilar.get(String(u?.pilar ?? ''))
      const alasan = b.teks(u?.alasan, 500)
      if (!u || !judul || !kataKunci || !p || !alasan) {
        dibuang++
        continue
      }
      // Topik yang sama atau sangat mirip dengan tulisan, usulan lama, atau usulan lain di jawaban ini dibuang.
      if ([...sudah, ...hasil.map((h) => h.kataKunci)].some((k) => tingkatMirip(kataKunci, k) !== null)) {
        dibuang++
        continue
      }
      const subAda = p.subkategori.find((s) => s.slug === u.subkategori)
      const baru = objek(u.subkategoriBaru)
      const namaBaru = b.teks(baru?.nama, 60)
      const subkategoriBaru =
        !subAda && namaBaru ? { slug: slugify(String(baru?.slug || namaBaru)), nama: namaBaru, deskripsi: b.teks(baru?.deskripsi, 200) ?? namaBaru } : null
      const tipe = (['panduan', 'explainer', 'daftar'] as const).find((t) => t === u.tipe) ?? 'panduan'
      const tools = (Array.isArray(u.tools) ? u.tools : []).filter((t): t is ToolId => (TOOL_IDS as readonly string[]).includes(String(t)))
      hasil.push({ judul, kataKunci, pilar: p.slug, subkategori: subAda?.slug ?? null, subkategoriBaru, tipe, alasan, tools: [...new Set(tools)] })
      if (hasil.length >= m.jumlah) break
    }
    if (hasil.length === 0) return 'tidak ada usulan yang sah atau semuanya sudah pernah ada'
    const catatan = [...b.catatan(), ...(dibuang ? [`${dibuang} usulan dibuang karena tidak lengkap atau sudah pernah ada.`] : [])]
    return { usulan: hasil, catatan }
  },
}
