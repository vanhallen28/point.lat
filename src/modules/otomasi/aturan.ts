import { PENANDA_CEK_ANGKA } from '@/modules/ai/prompt/artikel'

/**
 * Aturan Otomasi artikel (spesifikasi §27) sebagai fungsi murni: slot jadwal terbit, syarat draf masuk antrean
 * terbit, batas harian, anggaran waktu satu jalan cron, dan ukuran huruf kartu sampul. Waktu selalu argumen.
 */

const JAM_MS = 3_600_000
const HARI_MS = 86_400_000
/** WIB = UTC+7, tanpa musim panas. */
const SELISIH_WIB_MS = 7 * JAM_MS

/** Hari dalam urutan `getUTCDay()` (0 = Minggu). */
export const HARI = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'] as const
export type Hari = (typeof HARI)[number]
export const LABEL_HARI: Record<Hari, string> = {
  minggu: 'Minggu',
  senin: 'Senin',
  selasa: 'Selasa',
  rabu: 'Rabu',
  kamis: 'Kamis',
  jumat: 'Jumat',
  sabtu: 'Sabtu',
}

/**
 * Jam slot terbit (WIB) = jam cron `/api/jobs/run` di `vercel.json` (UTC 23, 2, 5, 8, 11, 14). Vercel Hobby
 * menjalankan cron sekali sehari per entri dengan ketepatan per jam, jadi slot 09.00 terbit antara 09.00 dan 09.59.
 */
export const JAM_SLOT = ['06', '09', '12', '15', '18', '21'] as const
export type JamSlot = (typeof JAM_SLOT)[number]
export const LABEL_JAM: Record<JamSlot, string> = { '06': '06.00', '09': '09.00', '12': '12.00', '15': '15.00', '18': '18.00', '21': '21.00' }

export type SlotTerbit = { hari: Hari[]; jam: JamSlot[] }

export const SLOT_BAWAAN: SlotTerbit = { hari: ['senin', 'rabu', 'jumat'], jam: ['06'] }

/** Draf otomatis per hari, paling banyak satu per jalan cron menulis (lima jalan sehari). */
export const DRAF_PER_HARI = { min: 0, maks: 5, bawaan: 1 }

/** Slot paling cepat sekian menit dari sekarang, supaya draf yang baru diantre tidak terbit seketika. */
export const JEDA_SLOT_MENIT = 30
/** Jarak pencarian slot berikutnya. */
const CARI_HARI = 60

/** Tanggal kalender WIB `YYYY-MM-DD`. */
export function tanggalWib(t: Date): string {
  return new Date(t.getTime() + SELISIH_WIB_MS).toISOString().slice(0, 10)
}

/** Awal hari WIB (00.00 WIB) dalam UTC. */
export function awalHariWib(t: Date): Date {
  return new Date(Date.parse(`${tanggalWib(t)}T00:00:00.000Z`) - SELISIH_WIB_MS)
}

/** Waktu slot `jam` WIB pada tanggal WIB `tanggal`. */
export function waktuSlot(tanggal: string, jam: JamSlot): Date {
  return new Date(Date.parse(`${tanggal}T${jam}:00:00.000Z`) - SELISIH_WIB_MS)
}

/** Slot dari isian global, hanya nilai yang dikenal; kosong berarti tidak ada slot. */
export function rapikanSlot(hari: unknown, jam: unknown): SlotTerbit {
  const daftar = (v: unknown) => (Array.isArray(v) ? v.map(String) : [])
  return {
    hari: HARI.filter((h) => daftar(hari).includes(h)),
    jam: JAM_SLOT.filter((j) => daftar(jam).includes(j)),
  }
}

/**
 * `jumlah` slot terbit kosong berikutnya, paling cepat `JEDA_SLOT_MENIT` dari `sekarang`. Slot yang sudah dipakai
 * jadwal lain (`terpakai`, waktu ISO) dilewati. Kosong bila tidak ada hari atau jam yang dipilih.
 */
export function slotBerikutnya(slot: SlotTerbit, terpakai: string[], sekarang: Date, jumlah = 1): Date[] {
  if (slot.hari.length === 0 || slot.jam.length === 0 || jumlah < 1) return []
  const dipakai = new Set(terpakai.map((t) => Math.floor(Date.parse(t) / 60_000)))
  const paling = sekarang.getTime() + JEDA_SLOT_MENIT * 60_000
  const hasil: Date[] = []
  const mulai = tanggalWib(sekarang)
  for (let i = 0; i <= CARI_HARI && hasil.length < jumlah; i++) {
    const tanggal = new Date(Date.parse(`${mulai}T00:00:00.000Z`) + i * HARI_MS).toISOString().slice(0, 10)
    const hari = HARI[new Date(`${tanggal}T00:00:00.000Z`).getUTCDay()]
    if (!slot.hari.includes(hari)) continue
    for (const jam of slot.jam) {
      const w = waktuSlot(tanggal, jam)
      if (w.getTime() < paling || dipakai.has(Math.floor(w.getTime() / 60_000))) continue
      hasil.push(w)
      if (hasil.length >= jumlah) break
    }
  }
  return hasil
}

/** Data draf yang dibaca syarat antrean terbit. */
export type DrafAntre = {
  judul?: string | null
  deck?: string | null
  intinya?: { poin?: string | null }[] | null
  isi?: unknown
  faq?: { pertanyaan?: string | null; jawaban?: string | null }[] | null
  gambarUtama?: unknown
  pakaiDrafAi?: boolean | null
  reviewAi?: { sumberDicek?: boolean | null; angkaDicek?: boolean | null; pengalamanDitambah?: boolean | null } | null
}

/**
 * Jumlah penanda `[cek angka]` yang masih ada di teks draf. Isi Lexical dicari di JSON-nya, jadi penanda di blok
 * tabel dan callout ikut terhitung.
 */
export function sisaCekAngka(d: DrafAntre): number {
  const teks = [
    d.judul ?? '',
    d.deck ?? '',
    ...(d.intinya ?? []).map((i) => i.poin ?? ''),
    d.isi ? JSON.stringify(d.isi) : '',
    ...(d.faq ?? []).flatMap((f) => [f.pertanyaan ?? '', f.jawaban ?? '']),
  ]
  return teks.reduce((n, t) => n + (t.split(PENANDA_CEK_ANGKA).length - 1), 0)
}

/**
 * Alasan draf otomatis belum boleh masuk antrean terbit, atau daftar kosong bila siap: checklist review lengkap
 * (artikel draf AI), tanpa penanda `[cek angka]`, dan punya gambar utama. Validasi koleksi tetap berjalan lagi
 * saat terbit, jadi ini pengaman tambahan, bukan satu-satunya.
 */
export function alasanBelumSiap(d: DrafAntre): string[] {
  const alasan: string[] = []
  const r = d.reviewAi ?? {}
  if (d.pakaiDrafAi !== false && !(r.sumberDicek && r.angkaDicek && r.pengalamanDitambah)) alasan.push('Checklist review belum lengkap.')
  const sisa = sisaCekAngka(d)
  if (sisa > 0) alasan.push(`Masih ada ${sisa} penanda ${PENANDA_CEK_ANGKA}.`)
  if (!d.gambarUtama) alasan.push('Belum ada gambar utama.')
  return alasan
}

/** Draf otomatis hari ini masih boleh ditulis. */
export function bolehTulis(sudahHariIni: number, drafPerHari: number): boolean {
  return sudahHariIni < Math.min(DRAF_PER_HARI.maks, Math.max(DRAF_PER_HARI.min, drafPerHari))
}

/**
 * Batas waktu satu jalan: fungsi Vercel Hobby berhenti di 300 detik, dan satu draf lengkap bisa makan 200 detik
 * (`BATAS_TUGAS.artikel.batasMs`). Draf baru hanya dimulai bila jalan ini belum lebih dari 70 detik.
 */
export const MULAI_TULIS_MAKS_MS = 70_000

export function masihSempat(mulai: number, sekarang: number): boolean {
  return sekarang - mulai <= MULAI_TULIS_MAKS_MS
}

/** Usulan baru diminta bila usulan yang menunggu dan yang disetujui tinggal sedikit. */
export function perluUsulan(menunggu: number, disetujui: number, drafPerHari: number): boolean {
  return menunggu === 0 && disetujui < Math.max(2, drafPerHari * 2)
}

/** Usulan otomatis paling sering sekali per 20 jam (tombol admin tidak dibatasi ini). */
export const JEDA_USULAN_MS = 20 * JAM_MS

// Kartu sampul ------------------------------------------------------------------------------------------

/** Lebar kata di kartu sampul (px) dan perkiraan lebar satu huruf Archivo 900 lebar 72% (em). */
const LEBAR_KATA = 1000
const LEBAR_HURUF_EM = 0.6
const UKURAN = { maks: 300, min: 110 }

/**
 * Kata sampul dipecah paling banyak dua baris (sepanjang mungkin seimbang) dan ukurannya sebesar mungkin sampai
 * 300 px, sehingga baris terpanjang muat 1000 px. Satori tidak bisa mengukur teks sebelum menggambar, jadi
 * lebar huruf diperkirakan dari Archivo yang sama dengan kartu paket.
 */
export function aturKataSampul(kata: string): { baris: string[]; ukuran: number } {
  const kataKata = kata.trim().toUpperCase().split(/\s+/).filter(Boolean)
  if (kataKata.length === 0) return { baris: ['POINT.'], ukuran: UKURAN.maks }
  let terbaik = [kataKata.join(' ')]
  let panjang = terbaik[0].length
  for (let i = 1; i < kataKata.length; i++) {
    const baris = [kataKata.slice(0, i).join(' '), kataKata.slice(i).join(' ')]
    const p = Math.max(...baris.map((b) => b.length))
    if (p < panjang) {
      terbaik = baris
      panjang = p
    }
  }
  const ukuran = Math.max(UKURAN.min, Math.min(UKURAN.maks, Math.floor(LEBAR_KATA / (LEBAR_HURUF_EM * panjang))))
  return { baris: terbaik, ukuran }
}
