import { PATH_SITEMAP_INDEX } from '@/modules/seo/xml'

import type {
  BarisAntrean,
  HasilIndeks,
  HasilPanggilan,
  Kabar,
  LangkahAntrean,
  StatusIndeks,
  StatusLog,
  VersiPublik,
} from './tipe'

/**
 * Aturan Mesin Indexing sebagai fungsi murni (spesifikasi §8): kapan kabar dibuat, bagaimana antrean
 * digabung, jeda ulang, jadwal cek status, jendela kirim, kuota harian, dan arti hasil URL Inspection.
 * Waktu selalu masuk sebagai argumen supaya tes bisa memakai waktu tiruan.
 */

export const MENIT = 60_000
export const JAM = 60 * MENIT
export const HARI = 24 * JAM

/** Gagal: diulang 3 kali dengan jeda 1, 5, lalu 30 menit; setelah itu status Gagal. */
export const JEDA_ULANG_MS = [MENIT, 5 * MENIT, 30 * MENIT] as const

/** Cek status pada +6 jam, +24 jam, +3 hari, dan +7 hari setelah kabar; berhenti saat Terindeks. */
export const JADWAL_CEK_MS = [6 * JAM, 24 * JAM, 3 * HARI, 7 * HARI] as const

/** Jarak minimal antarpengiriman: sitemap paling sering 30 menit sekali, IndexNow 5 menit sekali. */
export const JENDELA_KIRIM_MS = { sitemap: 30 * MENIT, indexnow: 5 * MENIT } as const

/** Baris sitemap di antrean: satu untuk seluruh situs, yang dikirim adalah sitemap index. */
export const PATH_SITEMAP = PATH_SITEMAP_INDEX

/**
 * Kabar dari dua versi publik sebuah dokumen (sebelum dan sesudah disimpan). `null` berarti tidak
 * publik: draf, batal terbit, dihapus, atau noindex.
 */
export function bandingkanVersi(lama: VersiPublik | null, baru: VersiPublik | null): Kabar[] {
  if (!lama && !baru) return []
  if (!lama) return [{ path: baru!.path, jenis: 'terbit' }]
  if (!baru) return [{ path: lama.path, jenis: 'hapus' }]
  if (lama.path !== baru.path) {
    return [
      { path: lama.path, jenis: 'pindah' },
      { path: baru.path, jenis: 'terbit' },
    ]
  }
  if (baru.tanda && baru.tanda !== lama.tanda) return [{ path: baru.path, jenis: 'ubah-besar' }]
  return []
}

/**
 * Baris antrean untuk satu kabar dan langkah yang dibatalkan. Sitemap dan IndexNow selalu; Indexing API
 * hanya bila saklarnya aktif dan bukan path yang pindah; cek status hanya untuk URL yang (masih) publik.
 */
export function rencanaKabar(
  kabar: Kabar,
  opsi: { pakaiIndexingApi: boolean },
  sekarang: Date,
): { simpan: BarisAntrean[]; batal: LangkahAntrean[] } {
  const dasar: Omit<BarisAntrean, 'langkah'> = { path: kabar.path, jenis: kabar.jenis, jadwal: sekarang, percobaan: 0, tahap: 0, dasar: null }
  const simpan: BarisAntrean[] = [
    { ...dasar, langkah: 'sitemap', path: PATH_SITEMAP },
    { ...dasar, langkah: 'indexnow' },
  ]
  if (opsi.pakaiIndexingApi && kabar.jenis !== 'pindah') simpan.push({ ...dasar, langkah: 'indexing-api' })
  const publik = kabar.jenis === 'terbit' || kabar.jenis === 'ubah-besar'
  if (publik) simpan.push({ ...dasar, langkah: 'cek-status', jadwal: jadwalCek(sekarang, 0)!, dasar: sekarang })
  const batal: LangkahAntrean[] = publik ? [] : kabar.jenis === 'pindah' ? ['indexing-api', 'cek-status'] : ['cek-status']
  return { simpan, batal }
}

/**
 * Dedup: kabar baru untuk langkah dan path yang sudah antre menggabungkan diri ke baris lama. Jenis
 * diambil dari kabar terbaru; jadwal dan percobaan lama dipertahankan (jeda ulang dan penundaan kuota
 * tetap berlaku). Cek status mulai lagi dari +6 jam karena isinya baru berubah.
 */
export function gabungBaris(lama: BarisAntrean, baru: BarisAntrean): BarisAntrean {
  if (baru.langkah === 'cek-status') return baru
  return { ...lama, jenis: baru.jenis }
}

/** Jadwal cek status ke-`tahap` (0 = +6 jam), `null` setelah tahap terakhir (+7 hari). */
export function jadwalCek(dasar: Date, tahap: number): Date | null {
  const jeda = JADWAL_CEK_MS[tahap]
  return jeda === undefined ? null : new Date(dasar.getTime() + jeda)
}

/** Jadwal ulang setelah gagal ke-(`percobaan` + 1), `null` bila sudah diulang 3 kali. */
export function jadwalUlang(percobaan: number, sekarang: Date): Date | null {
  const jeda = JEDA_ULANG_MS[percobaan]
  return jeda === undefined ? null : new Date(sekarang.getTime() + jeda)
}

/** Waktu paling cepat boleh mengirim lagi, atau `null` bila boleh sekarang. */
export function tundaSampai(terakhir: Date | null, jendelaMs: number, sekarang: Date): Date | null {
  if (!terakhir) return null
  const boleh = terakhir.getTime() + jendelaMs
  return sekarang.getTime() < boleh ? new Date(boleh) : null
}

const PASIFIK = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Los_Angeles',
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
})

/** Selisih jam Pasifik terhadap UTC pada waktu `t` (milidetik, negatif). */
function selisihPasifik(t: Date): number {
  const b = Object.fromEntries(PASIFIK.formatToParts(t).map((p) => [p.type, Number(p.value)]))
  const lokal = Date.UTC(b.year, b.month - 1, b.day, b.hour, b.minute, b.second)
  return lokal - Math.floor(t.getTime() / 1000) * 1000
}

/**
 * Awal hari kuota Google: tengah malam waktu Pasifik (dokumentasi kuota Indexing API). Selisih dihitung
 * dua kali karena pergantian jam musim panas terjadi pukul 02.00, setelah tengah malam.
 */
export function awalHariPasifik(t: Date): Date {
  const lokal = new Date(t.getTime() + selisihPasifik(t))
  const tengahMalam = Date.UTC(lokal.getUTCFullYear(), lokal.getUTCMonth(), lokal.getUTCDate())
  const kira = new Date(tengahMalam - selisihPasifik(t))
  return new Date(tengahMalam - selisihPasifik(kira))
}

/** Awal hari kuota berikutnya. Hari Pasifik panjangnya 23 sampai 25 jam, jadi +25 jam selalu jatuh di hari berikutnya. */
export function besokPasifik(t: Date): Date {
  return awalHariPasifik(new Date(awalHariPasifik(t).getTime() + 25 * JAM))
}

/**
 * Status indeks dari `indexStatusResult` URL Inspection API. `verdict` adalah enum resmi; `coverageState`
 * berupa teks bebas berbahasa Inggris (permintaan memakai bahasa bawaan en-US), jadi dicocokkan dengan
 * kata kuncinya. Teks aslinya disimpan sebagai detail.
 */
export function statusDariInspeksi(indeks: HasilIndeks | undefined): { status: StatusIndeks; detail: string } {
  const cakupan = indeks?.coverageState?.trim() ?? ''
  const c = cakupan.toLowerCase()
  const ambil = indeks?.pageFetchState && indeks.pageFetchState !== 'SUCCESSFUL' ? `pengambilan halaman: ${indeks.pageFetchState}` : null
  const detail = [cakupan || indeks?.verdict || null, ambil].filter(Boolean).join('; ')
  let status: StatusIndeks = 'belum-dicek'
  if (indeks?.verdict === 'PASS') status = 'terindeks'
  else if (c.includes('unknown to google')) status = 'tidak-dikenal'
  else if (c.includes('discovered')) status = 'ditemukan'
  else if (c.includes('crawled')) status = 'dirayapi'
  else if (indeks?.verdict === 'FAIL') status = 'galat'
  else if (indeks?.verdict === 'NEUTRAL') status = 'dikecualikan'
  return { status, detail }
}

/** Keadaan baris berikutnya setelah satu panggilan adapter. `berikut: null` berarti baris selesai. */
export type Lanjutan = {
  log: StatusLog
  berikut: Pick<BarisAntrean, 'jadwal' | 'percobaan' | 'tahap'> | null
}

/**
 * Langkah antrean setelah adapter menjawab (spesifikasi §8 dan §15):
 * - berhasil: selesai, kecuali cek status yang belum Terindeks lanjut ke jadwal berikutnya;
 * - kuota Google habis: ditunda ke awal hari kuota berikutnya, percobaan tidak bertambah;
 * - gagal: diulang 1, 5, lalu 30 menit kemudian; setelah itu Gagal (cek status tetap lanjut ke jadwal
 *   berikutnya bila masih ada);
 * - dilewati (kredensial, kunci, atau saklar belum diatur): selesai.
 */
export function setelahPanggilan(baris: BarisAntrean, hasil: HasilPanggilan, sekarang: Date): Lanjutan {
  const tahapBerikut = (): Lanjutan['berikut'] => {
    const jadwal = baris.dasar ? jadwalCek(baris.dasar, baris.tahap + 1) : null
    return jadwal ? { jadwal, percobaan: 0, tahap: baris.tahap + 1 } : null
  }
  if (hasil.status === 'dilewati') return { log: 'dilewati', berikut: null }
  if (hasil.status === 'berhasil') {
    if (baris.langkah !== 'cek-status' || statusDariInspeksi(hasil.indeks).status === 'terindeks') return { log: 'berhasil', berikut: null }
    return { log: 'berhasil', berikut: tahapBerikut() }
  }
  if (hasil.kuotaHabis) return { log: 'ditunda', berikut: { jadwal: besokPasifik(sekarang), percobaan: baris.percobaan, tahap: baris.tahap } }
  const ulang = jadwalUlang(baris.percobaan, sekarang)
  if (ulang) return { log: 'diulang', berikut: { jadwal: ulang, percobaan: baris.percobaan + 1, tahap: baris.tahap } }
  return { log: 'gagal', berikut: baris.langkah === 'cek-status' ? tahapBerikut() : null }
}
