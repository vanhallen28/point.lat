import { besokPasifik, HARI, JAM, MENIT } from '@/modules/indexer/aturan'

import type {
  BarisAnalitik,
  HariSitus,
  HasilTautan,
  Href,
  JawabanTautan,
  PermintaanAnalitik,
  RingkasanHalaman,
  StatusTautan,
} from './tipe'

/**
 * Aturan Pantau SEO sebagai fungsi murni: tanggal Search Analytics (waktu Pasifik), ringkasan klik,
 * impresi, CTR, dan posisi, jadwal tugas berkala, pembacaan tautan, dan arti jawaban pemeriksa tautan.
 * Waktu selalu masuk sebagai argumen supaya tes bisa memakai waktu tiruan.
 */

/** Kueri total harian mencakup 35 hari sampai kemarin: cukup untuk 28 hari walau data final terlambat beberapa hari. */
export const RENTANG_HARIAN = 35

/** Ringkasan per halaman: 28 hari (tabel dashboard) dan 7 hari ("Paling dicari pekan ini"). */
export const HARI_RINGKASAN = 28
export const HARI_PEKAN = 7

/** Batas baris per permintaan Search Analytics (dokumentasi: 1 sampai 25.000). */
export const BARIS_PER_PERMINTAAN = 25_000

/** Search Console memberi paling banyak 50.000 baris per hari per jenis pencarian, jadi dua halaman cukup; empat sebagai pengaman. */
export const MAKS_PERMINTAAN_PER_KUERI = 4

/** Log indexing disimpan 90 hari: dashboard membaca 7 hari terakhir, satu siklus cek status paling lama 30 hari. */
export const RETENSI_LOG_INDEXING_HARI = 90

/** Total harian disimpan 16 bulan, sama dengan riwayat Search Console, untuk perbandingan di Fase 2. */
export const RETENSI_ANALITIK_SITUS_HARI = 480

/** Tautan ke situs lain yang dicek per jalan cron (10 menit sekali), dan berapa yang dicek bersamaan. */
export const BATAS_TAUTAN_PER_JALAN = 10
export const TAUTAN_BERSAMAAN = 5

/** Batas tunggu satu tautan. */
export const BATAS_TUNGGU_TAUTAN_MS = 10_000

const FORMAT_PASIFIK = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Los_Angeles',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Tanggal kalender waktu Pasifik (zona tanggal Search Analytics), bentuk `YYYY-MM-DD`. */
export function tanggalPasifik(t: Date): string {
  const b = Object.fromEntries(FORMAT_PASIFIK.formatToParts(t).map((p) => [p.type, p.value]))
  return `${b.year}-${b.month}-${b.day}`
}

/** Tanggal `YYYY-MM-DD` digeser sejumlah hari. */
export function geserTanggal(tanggal: string, hari: number): string {
  const t = new Date(`${tanggal}T00:00:00.000Z`)
  t.setUTCDate(t.getUTCDate() + hari)
  return t.toISOString().slice(0, 10)
}

/** Rentang `jumlah` hari yang berakhir di `akhir`, keduanya termasuk (seperti `startDate` dan `endDate` API). */
export function rentang(akhir: string, jumlah: number): Pick<PermintaanAnalitik, 'startDate' | 'endDate'> {
  return { startDate: geserTanggal(akhir, -(jumlah - 1)), endDate: akhir }
}

/** Rentang kueri total harian: 35 hari sampai kemarin waktu Pasifik. */
export function rentangHarian(sekarang: Date): Pick<PermintaanAnalitik, 'startDate' | 'endDate'> {
  return rentang(geserTanggal(tanggalPasifik(sekarang), -1), RENTANG_HARIAN)
}

/** Badan permintaan: hanya data final (`dataState: final`), pencarian web, satu dimensi. */
export function permintaanAnalitik(
  r: Pick<PermintaanAnalitik, 'startDate' | 'endDate'>,
  dimensi: 'date' | 'page',
  startRow = 0,
): PermintaanAnalitik {
  return { ...r, dimensions: [dimensi], type: 'web', dataState: 'final', rowLimit: BARIS_PER_PERMINTAAN, startRow }
}

/** Path tanpa garis miring di akhir, kecuali beranda. */
export function rapikanPath(path: string): string {
  return path.length > 1 ? path.replace(/\/+$/, '') || '/' : path
}

const hostSitus = (url: URL) => url.hostname.replace(/^www\./, '')

/**
 * Path dari URL laporan Search Console. Properti domain mencakup semua subdomain dan protokol, jadi hanya
 * host situs (dengan atau tanpa `www.`) yang dipakai. Query dan fragmen dibuang.
 */
export function pathDariUrl(url: string, urlSitus: string): string | null {
  try {
    const u = new URL(url)
    if (!/^https?:$/.test(u.protocol) || hostSitus(u) !== hostSitus(new URL(urlSitus))) return null
    return rapikanPath(u.pathname)
  } catch {
    return null
  }
}

type Akumulasi = { klik: number; impresi: number; bobot: number }

function kumpulkan(baris: BarisAnalitik[], urlSitus: string): Map<string, Akumulasi> {
  const hasil = new Map<string, Akumulasi>()
  for (const b of baris) {
    const path = pathDariUrl(b.keys[0] ?? '', urlSitus)
    if (!path) continue
    const a = hasil.get(path) ?? { klik: 0, impresi: 0, bobot: 0 }
    a.klik += b.clicks
    a.impresi += b.impressions
    a.bobot += b.position * b.impressions
    hasil.set(path, a)
  }
  return hasil
}

/**
 * Ringkasan per path dari baris dimensi `page` untuk 28 dan 7 hari. Beberapa URL bisa menjadi satu path
 * (http dan https, `www.`, query): klik dan impresi dijumlah, posisi ditimbang impresi. Urutan: klik
 * 28 hari terbanyak, lalu impresi, lalu path.
 */
export function ringkasHalaman(baris28: BarisAnalitik[], baris7: BarisAnalitik[], urlSitus: string): RingkasanHalaman[] {
  const a28 = kumpulkan(baris28, urlSitus)
  const a7 = kumpulkan(baris7, urlSitus)
  const nol: Akumulasi = { klik: 0, impresi: 0, bobot: 0 }
  return [...new Set([...a28.keys(), ...a7.keys()])]
    .map((path) => {
      const b = a28.get(path) ?? nol
      const p = a7.get(path) ?? nol
      return {
        path,
        klik7: p.klik,
        impresi7: p.impresi,
        klik28: b.klik,
        impresi28: b.impresi,
        ctr28: b.impresi ? b.klik / b.impresi : 0,
        posisi28: b.impresi ? b.bobot / b.impresi : 0,
      }
    })
    .sort((x, y) => y.klik28 - x.klik28 || y.impresi28 - x.impresi28 || x.path.localeCompare(y.path))
}

/** Baris dimensi `date` menjadi total harian properti. */
export function hariSitus(baris: BarisAnalitik[]): HariSitus[] {
  return baris
    .filter((b) => /^\d{4}-\d{2}-\d{2}$/.test(b.keys[0] ?? ''))
    .map((b) => ({ tanggal: b.keys[0], klik: b.clicks, impresi: b.impressions, ctr: b.ctr, posisi: b.position }))
}

export type RingkasanSitus = {
  klik: number
  impresi: number
  ctr: number
  /** `null` bila tidak ada impresi. */
  posisi: number | null
  /** Satu titik per hari, hari tanpa data bernilai 0 (Search Analytics tidak mengirim hari kosong). */
  seri: { tanggal: string; klik: number; impresi: number }[]
}

/** Total properti `jumlah` hari sampai `akhir`: klik, impresi, CTR, posisi ditimbang impresi, dan seri harian. */
export function ringkasSitus(hari: HariSitus[], akhir: string, jumlah = HARI_RINGKASAN): RingkasanSitus {
  const per = new Map(hari.map((h) => [h.tanggal, h]))
  const seri = Array.from({ length: jumlah }, (_, i) => {
    const tanggal = geserTanggal(akhir, i - (jumlah - 1))
    const h = per.get(tanggal)
    return { tanggal, klik: h?.klik ?? 0, impresi: h?.impresi ?? 0 }
  })
  const klik = seri.reduce((n, h) => n + h.klik, 0)
  const impresi = seri.reduce((n, h) => n + h.impresi, 0)
  const bobot = seri.reduce((n, h) => n + (per.get(h.tanggal)?.posisi ?? 0) * h.impresi, 0)
  return { klik, impresi, ctr: impresi ? klik / impresi : 0, posisi: impresi ? bobot / impresi : null, seri }
}

export type HasilTugas = 'berhasil' | 'dilewati' | 'gagal' | 'kuota-habis'

/**
 * Jadwal tugas harian berikutnya. Berhasil, dilewati (kredensial belum diatur), atau kuota Search Console
 * habis: awal hari waktu Pasifik berikutnya, jadi cron 10 menit sekali menjalankannya sekali sehari.
 * Gagal karena hal lain: dicoba lagi satu jam kemudian.
 */
export function jadwalTugas(hasil: HasilTugas, sekarang: Date): Date {
  if (hasil === 'gagal') return new Date(sekarang.getTime() + JAM)
  return besokPasifik(sekarang)
}

/**
 * Jeda minimal antara dua pindai tautan yang diminta manual ("Pindai ulang sekarang"), dihitung dari mulai
 * pindai terakhir (manual atau cron). Satu pindai membaca semua konten terbit dan memeriksa sampai 10 tautan
 * luar, jadi klik berulang dibatasi tanpa menghalangi pemeriksaan ulang setelah tautan diperbaiki.
 */
export const JEDA_PINDAI_MANUAL_MS = 10 * MENIT

export type BatasPindai = { boleh: true } | { boleh: false; alasan: 'berjalan' | 'jeda'; bolehLagi: Date }

/**
 * Apakah "Pindai ulang sekarang" boleh dijalankan: tidak sedang berjalan (sewa tugas masih berlaku), dan
 * pindai terakhir dimulai lebih dari `JEDA_PINDAI_MANUAL_MS` lalu. `tugas`: baris `tugas-seo` jenis `tautan`.
 */
export function batasPindaiManual(
  tugas: { status?: string | null; mulai?: string | null; berikutnya?: string | null } | null,
  sekarang: Date,
): BatasPindai {
  const berikutnya = tugas?.berikutnya ? new Date(tugas.berikutnya) : null
  if (tugas?.status === 'berjalan' && berikutnya && berikutnya > sekarang) return { boleh: false, alasan: 'berjalan', bolehLagi: berikutnya }
  const jeda = tugas?.mulai ? new Date(tugas.mulai).getTime() + JEDA_PINDAI_MANUAL_MS : 0
  return jeda > sekarang.getTime() ? { boleh: false, alasan: 'jeda', bolehLagi: new Date(jeda) } : { boleh: true }
}

/**
 * Tujuan tautan dari isian CMS (URL menu, tombol, sumber, tautan Lexical). Path situs dan URL lengkap
 * ke host situs menjadi `internal`; `http(s)` lain menjadi `luar`. Jangkar, `mailto:`, `tel:`, dan isian
 * yang bukan URL diabaikan.
 */
export function hrefDari(nilai: unknown, urlSitus: string): Href | null {
  if (typeof nilai !== 'string') return null
  const href = nilai.trim()
  if (!href || href.startsWith('#') || /^(mailto|tel):/i.test(href)) return null
  if (href.startsWith('/') && !href.startsWith('//')) return { jenis: 'internal', path: rapikanPath(href.split(/[?#]/)[0]) }
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  if (!/^https?:$/.test(url.protocol)) return null
  const path = pathDariUrl(href, urlSitus)
  return path ? { jenis: 'internal', path } : { jenis: 'luar', url: url.toString() }
}

/**
 * Arti jawaban pemeriksa tautan. 404 dan 410, atau domain yang tidak ada, berarti rusak. Kode galat lain
 * (401, 403, 429, 5xx) dan batas waktu belum tentu rusak: banyak situs menolak pemeriksa otomatis atau
 * sedang sibuk, jadi editor diminta memastikan sendiri.
 */
export function statusTautan(j: JawabanTautan): HasilTautan {
  const { kodeHttp } = j
  if (kodeHttp !== null) {
    if (kodeHttp < 400) return { status: 'baik', kodeHttp, pesan: `Bisa dibuka (${kodeHttp}).` }
    if (kodeHttp === 404) return { status: 'rusak', kodeHttp, pesan: 'Halaman tidak ditemukan (404). Ganti atau hapus tautannya.' }
    if (kodeHttp === 410) return { status: 'rusak', kodeHttp, pesan: 'Halaman sudah dihapus pemiliknya (410). Ganti atau hapus tautannya.' }
    return {
      status: 'tidak-pasti',
      kodeHttp,
      pesan: `Server menjawab ${kodeHttp}. Buka tautannya untuk memastikan; sebagian situs menolak pemeriksa otomatis.`,
    }
  }
  if (j.kodeGalat === 'ENOTFOUND') return { status: 'rusak', kodeHttp: null, pesan: 'Domain tidak ditemukan. Ganti atau hapus tautannya.' }
  if (j.kodeGalat === 'TimeoutError') {
    return { status: 'tidak-pasti', kodeHttp: null, pesan: `Situs tidak menjawab dalam ${BATAS_TUNGGU_TAUTAN_MS / 1000} detik.` }
  }
  return { status: 'tidak-pasti', kodeHttp: null, pesan: `Tidak bisa dihubungi: ${(j.galat ?? 'galat tidak dikenal').replace(/\.$/, '')}.` }
}

/** Cek ulang tautan luar: seminggu sekali (spesifikasi §8), atau besok bila hasilnya belum pasti. */
export function jadwalCekTautan(status: StatusTautan, sekarang: Date): Date {
  return new Date(sekarang.getTime() + (status === 'tidak-pasti' ? HARI : 7 * HARI))
}
