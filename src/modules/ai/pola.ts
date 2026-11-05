import { hitungKata } from '@/modules/seo/teks'

import { kalimatBlok, type Blok } from './teks'

/**
 * Cek pola tulisan AI (spesifikasi §10 butir 4): fungsi murni tanpa API, jadi gratis, langsung, dan
 * berjalan di browser. Polanya diambil dari panduan "Signs of AI writing" (skill humanizer) lalu
 * disesuaikan dengan bahasa Indonesia: frasa klise, em dash dan en dash, "bukan hanya X, tetapi juga Y",
 * daftar serba tiga, kesimpulan generik, dan panjang kalimat yang seragam. Satu tanda bukan bukti; yang
 * perlu dilihat adalah tanda yang berkumpul. Frasa di dalam tanda kutip tidak ditandai.
 */

export const JENIS_POLA = ['klise', 'tanda-pisah', 'paralel-negatif', 'serba-tiga', 'kesimpulan', 'kalimat-seragam', 'frasa-tambahan'] as const
export type JenisPola = (typeof JENIS_POLA)[number]

export const LABEL_POLA: Record<JenisPola, string> = {
  klise: 'Frasa klise',
  'tanda-pisah': 'Em dash atau en dash',
  'paralel-negatif': 'Bukan hanya X, tetapi Y',
  'serba-tiga': 'Serba tiga',
  kesimpulan: 'Kesimpulan generik',
  'kalimat-seragam': 'Panjang kalimat seragam',
  'frasa-tambahan': 'Frasa dari daftar Asisten AI',
}

export type TemuanPola = { jenis: JenisPola; letak: string; kutipan: string; alasan: string }

export type HasilPola = { temuan: TemuanPola[]; jumlahKalimat: number; ringkasan: Partial<Record<JenisPola, number>> }

const ALASAN = {
  pembuka: 'Pembuka klise yang sering muncul di tulisan AI. Langsung ke jawabannya.',
  pengumuman: 'Mengumumkan isi, bukan menyampaikannya. Hapus dan mulai dari isinya.',
  penghubung: 'Penghubung klise yang biasanya bisa dihapus tanpa mengubah arti.',
  penekanan: 'Penekanan berlebihan. Tunjukkan pentingnya lewat fakta atau contoh.',
  kosakata: 'Kata yang jauh lebih sering dipakai tulisan AI. Pakai kata sehari-hari.',
  kesimpulan: 'Penutup generik. Akhiri dengan langkah konkret atau fakta yang berguna.',
} as const

/** Frasa klise bahasa Indonesia (spesifikasi §10 ditambah padanan pola humanizer) dan alasannya. */
export const FRASA_KLISE: [frasa: string, alasan: string, jenis: 'klise' | 'kesimpulan'][] = [
  ['di era digital ini', ALASAN.pembuka, 'klise'],
  ['di era digital seperti sekarang', ALASAN.pembuka, 'klise'],
  ['di era serba digital', ALASAN.pembuka, 'klise'],
  ['di era modern ini', ALASAN.pembuka, 'klise'],
  ['di zaman sekarang ini', ALASAN.pembuka, 'klise'],
  ['dalam dunia yang terus berkembang', ALASAN.pembuka, 'klise'],
  ['seiring perkembangan zaman', ALASAN.pembuka, 'klise'],
  ['seiring dengan perkembangan zaman', ALASAN.pembuka, 'klise'],
  ['tidak dapat dipungkiri', ALASAN.pembuka, 'klise'],
  ['tak dapat dipungkiri', ALASAN.pembuka, 'klise'],
  ['tidak bisa dipungkiri', ALASAN.pembuka, 'klise'],
  ['mari kita bahas', ALASAN.pengumuman, 'klise'],
  ['mari kita simak', ALASAN.pengumuman, 'klise'],
  ['mari kita selami', ALASAN.pengumuman, 'klise'],
  ['mari kita lihat', ALASAN.pengumuman, 'klise'],
  ['simak ulasan berikut', ALASAN.pengumuman, 'klise'],
  ['berikut ulasan lengkapnya', ALASAN.pengumuman, 'klise'],
  ['artikel ini akan membahas', ALASAN.pengumuman, 'klise'],
  ['tanpa basa-basi', ALASAN.pengumuman, 'klise'],
  ['tak hanya itu', ALASAN.penghubung, 'klise'],
  ['tidak hanya itu', ALASAN.penghubung, 'klise'],
  ['perlu diingat bahwa', ALASAN.penghubung, 'klise'],
  ['penting untuk dicatat', ALASAN.penghubung, 'klise'],
  ['penting untuk diingat', ALASAN.penghubung, 'klise'],
  ['perlu dicatat bahwa', ALASAN.penghubung, 'klise'],
  ['sangat penting untuk', ALASAN.penekanan, 'klise'],
  ['memainkan peran penting', ALASAN.penekanan, 'klise'],
  ['memegang peran penting', ALASAN.penekanan, 'klise'],
  ['peran yang sangat penting', ALASAN.penekanan, 'klise'],
  ['menjadi bukti nyata', ALASAN.penekanan, 'klise'],
  ['merupakan bukti nyata', ALASAN.penekanan, 'klise'],
  ['tidak kalah penting', ALASAN.penekanan, 'klise'],
  ['krusial', ALASAN.kosakata, 'klise'],
  ['lanskap', ALASAN.kosakata, 'klise'],
  ['menyelami', ALASAN.kosakata, 'klise'],
  ['esensial', ALASAN.kosakata, 'klise'],
  ['holistik', ALASAN.kosakata, 'klise'],
  ['kesimpulannya', ALASAN.kesimpulan, 'kesimpulan'],
  ['sebagai kesimpulan', ALASAN.kesimpulan, 'kesimpulan'],
  ['secara keseluruhan', ALASAN.kesimpulan, 'kesimpulan'],
  ['pada akhirnya', ALASAN.kesimpulan, 'kesimpulan'],
  ['semoga bermanfaat', ALASAN.kesimpulan, 'kesimpulan'],
  ['semoga artikel ini bermanfaat', ALASAN.kesimpulan, 'kesimpulan'],
  ['semoga informasi ini bermanfaat', ALASAN.kesimpulan, 'kesimpulan'],
  ['masa depan yang cerah', ALASAN.kesimpulan, 'kesimpulan'],
]

/** Paragraf dengan sedikitnya 4 kalimat yang panjangnya hampir sama (koefisien variasi di bawah 0,2). */
const SERAGAM_PARAGRAF = { kalimat: 4, variasi: 0.2 }
/** Seluruh tulisan dengan sedikitnya 10 kalimat dan koefisien variasi di bawah 0,3. */
const SERAGAM_TULISAN = { kalimat: 10, variasi: 0.3 }

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Pola satu frasa: utuh per kata, tanpa membedakan huruf besar. */
const polaFrasa = (frasa: string) => new RegExp(`(?<![\\p{L}\\p{N}])${escape(frasa.trim()).replace(/\s+/g, '\\s+')}(?![\\p{L}\\p{N}])`, 'iu')

/** Teks di dalam tanda kutip diganti spasi: frasa yang sedang dikutip atau dibahas tidak ditandai. */
const tanpaKutipan = (teks: string) => teks.replace(/"[^"]*"|“[^”]*”/g, (m) => ' '.repeat(m.length))

const POLA_PARALEL = /(?<![\p{L}])(bukan|tidak|tak)\s+(hanya|sekadar|cuma)(?![\p{L}])[^.?!]*?(?<![\p{L}])(tetapi|tapi|melainkan|namun)(?![\p{L}])/iu
/** Daftar tiga butir pendek (paling banyak tiga kata per butir) yang diakhiri "dan", "serta", atau "atau". */
const POLA_TIGA = /[\p{L}\p{N}-]+(?:\s+[\p{L}\p{N}-]+){0,2},\s+[\p{L}\p{N}-]+(?:\s+[\p{L}\p{N}-]+){0,2},?\s+(dan|serta|atau)\s+[\p{L}\p{N}-]+/u
const POLA_PISAH = /[\u2013\u2014]|\s--\s/
const POLA_JUDUL_PENUTUP = /^(kesimpulan|penutup)(?![\p{L}])/iu

const kutip = (teks: string) => (teks.length > 160 ? `${teks.slice(0, 157).trimEnd()}...` : teks)

function variasi(panjang: number[]): number {
  const rata = panjang.reduce((a, b) => a + b, 0) / panjang.length
  if (rata === 0) return 0
  const ragam = panjang.reduce((a, b) => a + (b - rata) ** 2, 0) / panjang.length
  return Math.sqrt(ragam) / rata
}

/** Kalimat yang dihitung untuk keseragaman: paragraf dan jawaban FAQ, minimal lima kata. */
const kalimatProsa = (blok: Blok) => (blok.jenis === 'paragraf' || blok.jenis === 'faq' ? kalimatBlok(blok).filter((k) => hitungKata(k) >= 5) : [])

/**
 * Menandai pola tulisan AI per kalimat (frasa, tanda pisah, paralel negatif), per blok (serba tiga,
 * kalimat seragam, subjudul penutup), dan untuk seluruh tulisan (kalimat seragam). `frasaTambahan`
 * berasal dari global Asisten AI.
 */
export function periksaPola(blok: Blok[], opsi: { frasaTambahan?: string[] } = {}): HasilPola {
  const daftarFrasa = [
    ...FRASA_KLISE.map(([frasa, alasan, jenis]) => ({ pola: polaFrasa(frasa), frasa, alasan, jenis: jenis as JenisPola })),
    ...(opsi.frasaTambahan ?? [])
      .map((f) => f.trim())
      .filter(Boolean)
      .map((frasa) => ({ pola: polaFrasa(frasa), frasa, alasan: 'Ada di daftar frasa Asisten AI.', jenis: 'frasa-tambahan' as JenisPola })),
  ]
  const temuan: TemuanPola[] = []
  let jumlahKalimat = 0
  const semuaPanjang: number[] = []

  for (const b of blok) {
    const kalimat = kalimatBlok(b)
    jumlahKalimat += kalimat.length
    if (b.jenis === 'subjudul' && POLA_JUDUL_PENUTUP.test(b.teks)) {
      temuan.push({ jenis: 'kesimpulan', letak: b.label, kutipan: b.teks, alasan: 'Subjudul penutup yang mengulang isi jarang berguna. Ganti dengan langkah berikutnya, atau hapus.' })
    }
    let tiga = 0
    for (const k of kalimat) {
      const bersih = tanpaKutipan(k)
      for (const f of daftarFrasa) {
        const cocok = f.pola.exec(bersih)
        if (cocok) temuan.push({ jenis: f.jenis, letak: b.label, kutipan: kutip(k), alasan: `"${k.slice(cocok.index, cocok.index + cocok[0].length)}": ${f.alasan}` })
      }
      if (POLA_PISAH.test(k)) {
        temuan.push({ jenis: 'tanda-pisah', letak: b.label, kutipan: kutip(k), alasan: 'Aturan copy point. tanpa em dash dan en dash. Ganti dengan titik, koma, atau titik dua.' })
      }
      if (POLA_PARALEL.test(bersih)) {
        temuan.push({ jenis: 'paralel-negatif', letak: b.label, kutipan: kutip(k), alasan: 'Pola "bukan hanya X, tetapi Y" membuat kalimat berputar. Sampaikan poinnya langsung.' })
      }
      if (POLA_TIGA.test(bersih)) tiga++
    }
    if (tiga >= 2) {
      temuan.push({ jenis: 'serba-tiga', letak: b.label, kutipan: kutip(b.teks), alasan: `${tiga} daftar tiga hal dalam satu blok. Pola serba tiga terasa dibuat-buat; pertahankan yang memang tiga.` })
    }
    const prosa = kalimatProsa(b)
    const panjang = prosa.map(hitungKata)
    semuaPanjang.push(...panjang)
    if (panjang.length >= SERAGAM_PARAGRAF.kalimat && variasi(panjang) < SERAGAM_PARAGRAF.variasi) {
      temuan.push({
        jenis: 'kalimat-seragam',
        letak: b.label,
        kutipan: kutip(b.teks),
        alasan: `Panjang kalimat hampir sama (${panjang.join(', ')} kata). Selingi kalimat pendek dan panjang.`,
      })
    }
  }

  if (semuaPanjang.length >= SERAGAM_TULISAN.kalimat && variasi(semuaPanjang) < SERAGAM_TULISAN.variasi) {
    const rata = Math.round(semuaPanjang.reduce((a, b) => a + b, 0) / semuaPanjang.length)
    temuan.push({
      jenis: 'kalimat-seragam',
      letak: 'Seluruh tulisan',
      kutipan: `${semuaPanjang.length} kalimat, rata-rata ${rata} kata`,
      alasan: 'Hampir semua kalimat sama panjangnya. Tulisan manusia biasanya berselang-seling antara kalimat pendek dan panjang.',
    })
  }

  const ringkasan: HasilPola['ringkasan'] = {}
  for (const t of temuan) ringkasan[t.jenis] = (ringkasan[t.jenis] ?? 0) + 1
  return { temuan, jumlahKalimat, ringkasan }
}
