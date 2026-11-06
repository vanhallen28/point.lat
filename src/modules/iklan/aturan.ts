import type { IsiDokumen } from '@/modules/seo/lexical'

import { DIMENSI_IKLAN, LABEL_POSISI_IKLAN, type PengaturanIklan, type PosisiIklan, type SlotSiap } from './tipe'

/**
 * Aturan iklan sebagai fungsi murni (spesifikasi §11): syarat slot tampil, penempatan di isi artikel,
 * validasi isian global `iklan`, dan isi `ads.txt`. Aman dipakai di server dan admin.
 */

/** ID penerbit AdSense: `ca-pub-` diikuti 16 angka. */
export const POLA_ID_PENERBIT = /^ca-pub-\d{16}$/

/** ID slot dipakai blok beranda dan atribut `data-slot-iklan`: huruf kecil, angka, dan tanda hubung. */
export const POLA_ID_SLOT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** `data-ad-slot` unit iklan AdSense: angka saja. */
export const POLA_UNIT = /^\d{4,20}$/

/** Iklan tengah artikel paling cepat setelah paragraf ke-2, paling lambat ke-10; bawaan ke-3. */
export const PARAGRAF_IKLAN = { min: 2, maks: 10, bawaan: 3 } as const

/** Paragraf yang harus tersisa setelah iklan tengah, supaya iklan tidak menempel di akhir isi. */
export const MIN_PARAGRAF_SESUDAH = 2

/** Jenis node Lexical yang menandai tempat iklan tengah di isi artikel (dirender `IsiArtikel`). */
export const NODE_IKLAN = 'slotIklan'

/** Baris `ads.txt` AdSense (Bantuan AdSense "Panduan ads.txt"); `pub-` adalah ID penerbit tanpa `ca-`. */
export const ID_OTORITAS_GOOGLE = 'f08c47fec0942fa0'

/** Iklan siap tampil bila dinyalakan, penyedianya AdSense, dan ID penerbitnya valid. */
export function iklanSiap(p: PengaturanIklan | null | undefined): p is PengaturanIklan & { idPenerbit: string } {
  return Boolean(p?.aktif && p.penyedia === 'adsense' && p.idPenerbit && POLA_ID_PENERBIT.test(p.idPenerbit))
}

/**
 * Slot aktif untuk satu posisi (dan ID untuk beranda), atau `null`: tidak ada iklan bila global mati,
 * ID penerbit kosong atau salah, slot nonaktif, unitnya salah, atau posisinya tidak cocok.
 */
export function pilihSlot(p: PengaturanIklan | null | undefined, posisi: PosisiIklan, id?: string | null): SlotSiap | null {
  if (!iklanSiap(p)) return null
  const slot = p.slot.find((s) => s.aktif && s.posisi === posisi && (posisi !== 'beranda' || s.id === id) && POLA_UNIT.test(s.unit))
  if (!slot) return null
  const { lebar, tinggi } = DIMENSI_IKLAN[slot.ukuran]
  const n = slot.setelahParagraf ?? PARAGRAF_IKLAN.bawaan
  return {
    id: slot.id,
    posisi: slot.posisi,
    lebar,
    tinggi,
    klien: p.idPenerbit,
    unit: slot.unit,
    uji: p.modeUji,
    setelahParagraf: Math.min(PARAGRAF_IKLAN.maks, Math.max(PARAGRAF_IKLAN.min, Math.round(n))),
  }
}

type NodeIsi = { type?: string; children?: NodeIsi[]; text?: string }

const adaTeks = (node: NodeIsi): boolean => (node.type === 'text' ? Boolean(node.text?.trim()) : (node.children ?? []).some(adaTeks))

/**
 * Indeks node tingkat atas isi tempat iklan tengah disisipkan sesudahnya: paragraf berteks ke-N, asal
 * masih ada paling sedikit `MIN_PARAGRAF_SESUDAH` paragraf berteks sesudahnya. Hanya node tingkat atas,
 * jadi iklan tidak pernah masuk ke daftar, tabel, callout, atau blok lain. `null` bila isi terlalu pendek.
 */
export function letakIklanTengah(isi: IsiDokumen, setelahParagraf: number): number | null {
  const anak = isi?.root?.children
  if (!Array.isArray(anak)) return null
  const paragraf = (anak as NodeIsi[]).flatMap((node, i) => (node.type === 'paragraph' && adaTeks(node) ? [i] : []))
  if (paragraf.length < setelahParagraf + MIN_PARAGRAF_SESUDAH) return null
  return paragraf[setelahParagraf - 1]
}

/** Isi artikel dengan node `slotIklan` (membawa slotnya) setelah paragraf ke-N; tanpa slot atau isi pendek: isi apa adanya. */
export function sisipkanIklanTengah(isi: IsiDokumen, slot: SlotSiap | null): IsiDokumen {
  if (!slot || !isi?.root) return isi
  const letak = letakIklanTengah(isi, slot.setelahParagraf)
  if (letak === null) return isi
  const anak = [...(isi.root.children ?? [])]
  anak.splice(letak + 1, 0, { type: NODE_IKLAN, version: 1, slot })
  return { ...isi, root: { ...isi.root, children: anak } }
}

/** Validasi field global `iklan`: ID penerbit wajib dan berformat benar saat iklan dinyalakan. */
export function validasiIdPenerbit(nilai: unknown, aktif: unknown): true | string {
  const teks = typeof nilai === 'string' ? nilai.trim() : ''
  if (!teks) return aktif ? 'Isi ID penerbit AdSense sebelum menyalakan iklan.' : true
  return POLA_ID_PENERBIT.test(teks) ? true : 'ID penerbit AdSense berbentuk ca-pub- diikuti 16 angka. Salin dari Akun, Informasi akun di AdSense.'
}

export function validasiIdSlot(nilai: unknown): true | string {
  const teks = typeof nilai === 'string' ? nilai : ''
  if (teks.length < 2 || teks.length > 40 || !POLA_ID_SLOT.test(teks)) return 'ID slot 2 sampai 40 karakter: huruf kecil, angka, dan tanda hubung, misalnya artikel-akhir.'
  return true
}

export function validasiUnit(nilai: unknown): true | string {
  return typeof nilai === 'string' && POLA_UNIT.test(nilai) ? true : 'Unit iklan berupa angka data-ad-slot dari kode unit iklan di AdSense.'
}

/** Baris array `slot` di form global `iklan` (field `idSlot`, karena `id` dipakai Payload untuk kunci baris). */
export type BarisSlot = { idSlot?: string | null; posisi?: PosisiIklan | null; aktif?: boolean | null }

/** ID slot unik dan satu slot aktif per posisi (kecuali beranda, yang dipilih per blok lewat ID). */
export function validasiDaftarSlot(daftar: unknown): true | string {
  if (!Array.isArray(daftar)) return true
  const slot = daftar as BarisSlot[]
  const terpakai = new Set<string>()
  for (const s of slot) {
    if (!s.idSlot) continue
    if (terpakai.has(s.idSlot)) return `ID slot "${s.idSlot}" dipakai lebih dari sekali. Beri setiap slot ID sendiri.`
    terpakai.add(s.idSlot)
  }
  const perPosisi = new Map<PosisiIklan, string>()
  for (const s of slot) {
    if (!s.aktif || !s.posisi || s.posisi === 'beranda') continue
    const lain = perPosisi.get(s.posisi)
    if (lain) return `Posisi "${LABEL_POSISI_IKLAN[s.posisi]}" sudah dipakai slot "${lain}". Matikan salah satunya.`
    perPosisi.set(s.posisi, s.idSlot ?? '')
  }
  return true
}

/** Variabel `ads.txt` yang dikenal spesifikasi IAB ads.txt 1.1. */
const VARIABEL_ADS_TXT = new Set(['contact', 'subdomain', 'inventorypartnerdomain', 'ownerdomain', 'managerdomain'])

/**
 * Memeriksa baris tambahan `ads.txt` (spesifikasi IAB ads.txt 1.1): baris kosong dan komentar `#` boleh;
 * baris data berisi 3 atau 4 isian dipisah koma (domain sistem iklan, ID akun, `DIRECT` atau `RESELLER`,
 * ID otoritas opsional); baris variabel `NAMA=nilai`. Mengembalikan pesan per baris yang salah.
 */
export function periksaAdsTxt(teks: string): string[] {
  const salah: string[] = []
  teks.split(/\r?\n/).forEach((mentah, i) => {
    const baris = mentah.replace(/#.*$/, '').trim()
    if (!baris) return
    const variabel = /^([A-Za-z]+)=(.+)$/.exec(baris)
    if (variabel) {
      if (!VARIABEL_ADS_TXT.has(variabel[1].toLowerCase())) salah.push(`Baris ${i + 1}: variabel "${variabel[1]}" tidak dikenal ads.txt.`)
      return
    }
    const isian = baris.split(',').map((s) => s.trim())
    if (isian.length < 3 || isian.length > 4) {
      salah.push(`Baris ${i + 1}: tulis 3 atau 4 isian dipisah koma, misalnya google.com, pub-0000000000000000, DIRECT, ${ID_OTORITAS_GOOGLE}.`)
    } else if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(isian[0])) {
      salah.push(`Baris ${i + 1}: isian pertama harus domain sistem iklan, misalnya google.com.`)
    } else if (!isian[1] || /\s/.test(isian[1])) {
      salah.push(`Baris ${i + 1}: isian kedua harus ID akun tanpa spasi.`)
    } else if (!/^(direct|reseller)$/i.test(isian[2])) {
      salah.push(`Baris ${i + 1}: isian ketiga harus DIRECT atau RESELLER.`)
    } else if (isian.length === 4 && !isian[3]) {
      salah.push(`Baris ${i + 1}: isian keempat (ID otoritas) kosong. Hapus koma terakhir atau isi ID-nya.`)
    }
  })
  return salah
}

export function validasiAdsTxt(nilai: unknown): true | string {
  if (typeof nilai !== 'string' || !nilai.trim()) return true
  const salah = periksaAdsTxt(nilai)
  return salah.length ? salah.join(' ') : true
}

/** Baris AdSense untuk ID penerbit ini (tanpa awalan `ca-`). */
export function barisAdsense(idPenerbit: string): string {
  return `google.com, ${idPenerbit.replace(/^ca-/, '')}, DIRECT, ${ID_OTORITAS_GOOGLE}`
}

const kunciBaris = (baris: string) => baris.replace(/\s+/g, '').toLowerCase()

/**
 * Isi `/ads.txt`: baris AdSense dari ID penerbit (juga saat iklan belum dinyalakan, supaya AdSense bisa
 * memeriksa situs sebelum iklan tayang), lalu baris tambahan editor tanpa duplikat. `null` bila tidak ada
 * baris sama sekali: rute menjawab 404, yang menurut spesifikasi IAB berarti situs tidak mendeklarasikan
 * penjual (file kosong tidak sah).
 */
export function isiAdsTxt(p: Pick<PengaturanIklan, 'penyedia' | 'idPenerbit' | 'adsTxtTambahan'> | null | undefined): string | null {
  const baris: string[] = []
  const id = p?.idPenerbit?.trim()
  if (p?.penyedia === 'adsense' && id && POLA_ID_PENERBIT.test(id)) baris.push(barisAdsense(id))
  const ada = new Set(baris.map(kunciBaris))
  for (const mentah of (p?.adsTxtTambahan ?? '').split(/\r?\n/)) {
    const b = mentah.trim()
    if (!b || ada.has(kunciBaris(b))) continue
    ada.add(kunciBaris(b))
    baris.push(b)
  }
  return baris.some((b) => !b.startsWith('#')) ? `${baris.join('\n')}\n` : null
}
