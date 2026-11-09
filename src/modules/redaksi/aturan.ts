/**
 * Aturan beranda admin (spesifikasi §23) sebagai fungsi murni: perbandingan periode, pekan waktu Jakarta,
 * kalender konten, klik per pekan, dan urutan "Perlu perhatian". Waktu selalu argumen, jadi bisa diuji.
 */
import { geserTanggal } from '@/modules/pantau/aturan'
import type { HariSitus } from '@/modules/pantau/tipe'

import type { Bandingan, ChipKalender, ItemPerhatian, KolomKalender, PekanKlik, StatusChip } from './tipe'

const JAM = 3_600_000
const HARI = 24 * JAM
/** Jakarta UTC+7 sepanjang tahun (tanpa jam musim panas). */
const SELISIH_JAKARTA = 7 * JAM

/** Periode yang bisa dipilih di beranda admin. */
export const PERIODE_BERANDA = [7, 28] as const
export type PeriodeBeranda = (typeof PERIODE_BERANDA)[number]

/** `?periode=` dari URL menjadi periode yang sah (bawaan 7 hari). */
export function bacaPeriode<T extends number>(nilai: unknown, pilihan: readonly T[], bawaan: T): T {
  const n = Number(Array.isArray(nilai) ? nilai[0] : nilai)
  return (pilihan as readonly number[]).includes(n) ? (n as T) : bawaan
}

/** Sapaan sesuai jam Jakarta. */
export function sapaan(sekarang: Date): string {
  const jam = new Date(sekarang.getTime() + SELISIH_JAKARTA).getUTCHours()
  if (jam < 4) return 'Selamat malam'
  if (jam < 11) return 'Selamat pagi'
  if (jam < 15) return 'Selamat siang'
  if (jam < 18) return 'Selamat sore'
  return 'Selamat malam'
}

/** Awal pekan (Senin 00.00 WIB) yang memuat `t`, sebagai waktu UTC. */
export function awalPekanJakarta(t: Date): Date {
  const lokal = new Date(t.getTime() + SELISIH_JAKARTA)
  const mundur = (lokal.getUTCDay() + 6) % 7
  const senin = Date.UTC(lokal.getUTCFullYear(), lokal.getUTCMonth(), lokal.getUTCDate() - mundur)
  return new Date(senin - SELISIH_JAKARTA)
}

/**
 * Perbandingan angka periode ini dengan periode sebelumnya. `persen` `null` bila periode sebelumnya tidak ada
 * datanya (belum cukup data) atau bernilai 0; `arah` dari selisih angka.
 */
export function bandingkan(sekarang: number, sebelumnya: number | null): Bandingan {
  if (sebelumnya === null) return { sekarang, sebelumnya: null, persen: null, arah: null }
  const selisih = sekarang - sebelumnya
  const arah = selisih > 0 ? 'naik' : selisih < 0 ? 'turun' : 'tetap'
  return { sekarang, sebelumnya, persen: sebelumnya > 0 ? selisih / sebelumnya : null, arah }
}

export type JumlahPeriode = {
  klik: Bandingan
  impresi: Bandingan
  /** Klik dan impresi per hari periode ini, hari tanpa data bernilai 0. */
  seriKlik: number[]
  seriImpresi: number[]
}

/**
 * Total klik dan impresi `panjang` hari sampai `akhir` (tanggal data terakhir), dibanding `panjang` hari sebelumnya.
 * Periode sebelumnya dianggap belum cukup data bila data tersimpan paling lama lebih baru dari awal periode itu.
 */
export function jumlahPeriode(hari: HariSitus[], akhir: string, panjang: number): JumlahPeriode {
  const per = new Map(hari.map((h) => [h.tanggal, h]))
  const seri = (mulai: number) => Array.from({ length: panjang }, (_, i) => per.get(geserTanggal(akhir, mulai + i)))
  const ini = seri(-(panjang - 1))
  const lalu = seri(-(2 * panjang - 1))
  const tertua = hari.reduce<string | null>((m, h) => (m === null || h.tanggal < m ? h.tanggal : m), null)
  const cukup = tertua !== null && tertua <= geserTanggal(akhir, -(2 * panjang - 1))
  const total = (daftar: (HariSitus | undefined)[], k: 'klik' | 'impresi') => daftar.reduce((n, h) => n + (h?.[k] ?? 0), 0)
  return {
    klik: bandingkan(total(ini, 'klik'), cukup ? total(lalu, 'klik') : null),
    impresi: bandingkan(total(ini, 'impresi'), cukup ? total(lalu, 'impresi') : null),
    seriKlik: ini.map((h) => h?.klik ?? 0),
    seriImpresi: ini.map((h) => h?.impresi ?? 0),
  }
}

/** Klik per blok 7 hari, `jumlah` blok yang berakhir di `akhir` (tanggal data terakhir), urut dari yang lama. */
export function klikPerPekan(hari: HariSitus[], akhir: string, jumlah = 8): PekanKlik[] {
  const per = new Map(hari.map((h) => [h.tanggal, h.klik]))
  return Array.from({ length: jumlah }, (_, i) => {
    const sampai = geserTanggal(akhir, -7 * (jumlah - 1 - i))
    const dari = geserTanggal(sampai, -6)
    let klik = 0
    for (let d = 0; d < 7; d++) klik += per.get(geserTanggal(dari, d)) ?? 0
    return { dari, sampai, klik }
  })
}

/** Status Google ringkas untuk chip: terindeks, menunggu (belum dicek sampai dirayapi), atau bermasalah. */
export function chipIndeks(status: string | null | undefined): StatusChip | null {
  if (!status) return null
  if (status === 'terindeks') return 'baik'
  if (status === 'dikecualikan' || status === 'galat') return 'kritis'
  return 'waspada'
}

export type ArtikelKalender = {
  id: number | string
  judul: string
  href: string
  pilar: number | string | null
  /** `terbit` (waktu = terbitPada), `terjadwal` (waktu = jadwal terbit), atau `draf` (waktu = terakhir diubah). */
  keadaan: ChipKalender['keadaan']
  waktu: string | null
}

/** Paling banyak chip per sel kalender; sisanya ditulis "+N lagi". */
export const MAKS_CHIP_SEL = 3

/**
 * Kalender konten: kolom pekan lalu, pekan ini, pekan depan (Senin sampai Minggu WIB), lalu kolom Draf. Artikel
 * terbit dan terjadwal masuk kolom pekannya bila waktunya di dalam tiga pekan itu; draf (tanpa jadwal) masuk kolom
 * Draf, yang terbaru diubah dulu.
 */
export function susunKalender(artikel: ArtikelKalender[], pilar: (number | string)[], sekarang: Date) {
  const ini = awalPekanJakarta(sekarang).getTime()
  const kolom: KolomKalender[] = [-1, 0, 1].map((n) => ({
    jenis: 'pekan' as const,
    mulai: new Date(ini + n * 7 * HARI).toISOString(),
    akhir: new Date(ini + (n + 1) * 7 * HARI - 1).toISOString(),
    ini: n === 0,
  }))
  const indeksKolom = (a: ArtikelKalender): number | null => {
    if (a.keadaan === 'draf') return 3
    if (!a.waktu) return null
    const n = Math.floor((Date.parse(a.waktu) - ini) / (7 * HARI))
    return n >= -1 && n <= 1 ? n + 1 : null
  }
  const baris = pilar.map((id) => {
    const sel: { chip: ChipKalender[]; sisa: number }[] = Array.from({ length: 4 }, () => ({ chip: [], sisa: 0 }))
    const milik = artikel.filter((a) => a.pilar === id)
    const urut = [...milik].sort((a, b) => (a.keadaan === 'draf' ? (b.waktu ?? '').localeCompare(a.waktu ?? '') : (a.waktu ?? '').localeCompare(b.waktu ?? '')))
    for (const a of urut) {
      const k = indeksKolom(a)
      if (k === null) continue
      if (sel[k].chip.length < MAKS_CHIP_SEL) sel[k].chip.push({ id: a.id, judul: a.judul, href: a.href, keadaan: a.keadaan, waktu: a.waktu })
      else sel[k].sisa++
    }
    return { pilar: id, sel }
  })
  return { kolom, baris }
}

const URUTAN_TINGKAT: Record<ItemPerhatian['tingkat'], number> = { segera: 0, pekan: 1, aman: 2 }

/** "Perlu perhatian": yang mendesak dulu, lalu jumlah terbanyak; yang nol selalu "aman" di bawah. */
export function urutkanPerhatian(item: ItemPerhatian[]): ItemPerhatian[] {
  return item
    .map((i) => (i.jumlah === 0 ? { ...i, tingkat: 'aman' as const } : i))
    .sort((a, b) => URUTAN_TINGKAT[a.tingkat] - URUTAN_TINGKAT[b.tingkat] || b.jumlah - a.jumlah)
}

/** Rasio 0 sampai 1, atau `null` bila tidak ada yang dihitung. */
export function rasio(bagian: number, total: number): number | null {
  return total > 0 ? Math.min(1, Math.max(0, bagian / total)) : null
}
