import { normalisasi } from './teks'

/**
 * Kemiripan keyphrase untuk peringatan kanibalisasi dan saran link internal (spesifikasi §8 butir 3-4).
 * Fungsi murni: data artikel lain diambil endpoint panel SEO, perhitungannya di sini.
 */

/** Kata fungsi bahasa Indonesia yang tidak membedakan topik. */
const KATA_UMUM = new Set([
  'dan', 'atau', 'di', 'ke', 'dari', 'yang', 'untuk', 'dengan', 'pada', 'dalam', 'itu', 'ini', 'cara',
  'apa', 'adalah', 'bagi', 'agar', 'supaya', 'serta', 'juga', 'per', 'vs', 'versi', 'terbaru',
])

/** Kata unik keyphrase setelah normalisasi, tanpa kata umum dan angka tahun (2026 tidak membedakan topik). */
export function kataKunci(frasa: string): Set<string> {
  return new Set(
    normalisasi(frasa)
      .split(' ')
      .filter((kata) => kata && !KATA_UMUM.has(kata) && !/^(19|20)\d{2}$/.test(kata)),
  )
}

/** Indeks Jaccard dua himpunan kata (0 sampai 1). */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let irisan = 0
  for (const kata of a) if (b.has(kata)) irisan++
  return irisan / (a.size + b.size - irisan)
}

export type TingkatMirip = 'sama' | 'mirip' | null

/** Ambang "sangat mirip": dua dari tiga kata kunci sama (mis. "gaji bersih" vs "gaji bersih karyawan"). */
export const AMBANG_MIRIP = 0.6

/**
 * `sama` bila kata kuncinya identik (urutan, huruf besar, tahun, dan kata umum diabaikan),
 * `mirip` bila Jaccard minimal `AMBANG_MIRIP` atau satu frasa memuat seluruh kata frasa lain.
 */
export function tingkatMirip(a: string, b: string): TingkatMirip {
  const ka = kataKunci(a)
  const kb = kataKunci(b)
  if (ka.size === 0 || kb.size === 0) return null
  const nilai = jaccard(ka, kb)
  if (nilai === 1) return 'sama'
  const memuat = [...ka].every((k) => kb.has(k)) || [...kb].every((k) => ka.has(k))
  return nilai >= AMBANG_MIRIP || (memuat && Math.min(ka.size, kb.size) >= 2) ? 'mirip' : null
}

/** Artikel lain sebagai kandidat kanibalisasi dan saran link. */
export type ArtikelLain = {
  id: number | string
  judul: string
  path: string
  pilarId?: number | string | null
  keyphrase?: string | null
  keyphraseSekunder?: string[] | null
}

export type Kanibalisasi = ArtikelLain & { tingkat: Exclude<TingkatMirip, null> }

/** Artikel lain yang keyphrase utamanya sama atau sangat mirip. Yang `sama` di atas. */
export function cariKanibalisasi(keyphrase: string | null | undefined, lain: ArtikelLain[]): Kanibalisasi[] {
  if (!keyphrase?.trim()) return []
  const hasil: Kanibalisasi[] = []
  for (const artikel of lain) {
    const tingkat = artikel.keyphrase ? tingkatMirip(keyphrase, artikel.keyphrase) : null
    if (tingkat) hasil.push({ ...artikel, tingkat })
  }
  return hasil.sort((a, b) => (a.tingkat === b.tingkat ? 0 : a.tingkat === 'sama' ? -1 : 1))
}

export type SaranLink = ArtikelLain & { skor: number; alasan: string }

/** Jumlah saran yang ditampilkan panel. */
export const JUMLAH_SARAN = 5

/**
 * Saran link internal: artikel sepilar dan artikel yang keyphrase-nya berbagi kata dengan keyphrase
 * utama atau sekunder dokumen ini. Artikel yang sudah ditautkan dan kandidat kanibalisasi tidak
 * disarankan (menautkan dua artikel yang berebut kata kunci tidak menyelesaikan masalahnya).
 */
export function sarankanLink(
  doc: { pilarId?: number | string | null; keyphrase?: string | null; keyphraseSekunder?: string[] | null },
  lain: ArtikelLain[],
  opsi: { sudahDitautkan?: (number | string)[]; jumlah?: number } = {},
): SaranLink[] {
  const kata = new Set([doc.keyphrase ?? '', ...(doc.keyphraseSekunder ?? [])].flatMap((f) => [...kataKunci(f)]))
  const tertaut = new Set((opsi.sudahDitautkan ?? []).map(String))
  const kanibal = new Set(cariKanibalisasi(doc.keyphrase, lain).map((a) => String(a.id)))
  const hasil: SaranLink[] = []
  for (const artikel of lain) {
    if (tertaut.has(String(artikel.id)) || kanibal.has(String(artikel.id))) continue
    const kataLain = new Set(
      [artikel.keyphrase ?? '', ...(artikel.keyphraseSekunder ?? [])].flatMap((f) => [...kataKunci(f)]),
    )
    const bersama = [...kata].filter((k) => kataLain.has(k))
    const sepilar = doc.pilarId !== undefined && doc.pilarId !== null && String(artikel.pilarId) === String(doc.pilarId)
    const skor = bersama.length * 2 + (sepilar ? 1 : 0)
    if (skor === 0) continue
    const alasan = [
      bersama.length ? `keyphrase terkait: ${bersama.join(', ')}` : null,
      sepilar ? 'sepilar' : null,
    ]
      .filter(Boolean)
      .join(', ')
    hasil.push({ ...artikel, skor, alasan })
  }
  return hasil
    .sort((a, b) => b.skor - a.skor || a.judul.localeCompare(b.judul, 'id'))
    .slice(0, opsi.jumlah ?? JUMLAH_SARAN)
}
