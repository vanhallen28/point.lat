/**
 * Aturan persetujuan cookie sebagai fungsi murni (spesifikasi §11, UU PDP No. 27/2022): bentuk cookie
 * pilihan, masa berlakunya, sinyal Google Consent Mode v2 per pilihan, dan skrip awal di `<head>`.
 * Aman dipakai di server dan browser.
 *
 * Pilihan dibaca di browser, bukan di server, supaya halaman publik tetap ISR (statis per path).
 */

/** Cookie pihak pertama yang menyimpan pilihan pengunjung. Cookie ini sendiri termasuk "yang perlu". */
export const NAMA_KUKI = 'persetujuan'

/**
 * Versi teks persetujuan. Naikkan bila tujuan pemrosesan berubah (misalnya menambah analitik): pilihan
 * dengan versi lama tidak berlaku lagi dan banner tampil kembali.
 */
export const VERSI_PERSETUJUAN = 1

/** Pilihan berlaku 12 bulan, lalu pengunjung ditanya lagi. */
export const UMUR_PERSETUJUAN_HARI = 365

export const PILIHAN_PERSETUJUAN = ['perlu', 'semua'] as const
export type PilihanPersetujuan = (typeof PILIHAN_PERSETUJUAN)[number]

/** Keadaan di atribut `<html data-persetujuan>`: `belum` sampai pengunjung memilih. */
export type KeadaanPersetujuan = PilihanPersetujuan | 'belum'

export const ATRIBUT_PERSETUJUAN = 'data-persetujuan'

/** Atribut `<html>` saat banner dibuka lagi lewat "Pengaturan cookie" (pilihan lama tetap berlaku). */
export const ATRIBUT_PANEL = 'data-panel-persetujuan'

/** Penanda tombol yang membuka banner lagi (tautan "Pengaturan cookie" di footer). */
export const ATRIBUT_BUKA = 'data-buka-persetujuan'

export type Persetujuan = { versi: number; pilihan: PilihanPersetujuan; tanggal: string }

const SEHARI = 86_400_000

/** Nilai cookie: versi, pilihan, dan tanggal (UTC), misalnya `1.semua.2026-11-06`. */
export function nilaiKuki(pilihan: PilihanPersetujuan, sekarang: Date): string {
  return `${VERSI_PERSETUJUAN}.${pilihan}.${sekarang.toISOString().slice(0, 10)}`
}

/** Pilihan yang masih berlaku dari `document.cookie`, atau `null` (belum memilih, versi lama, kedaluwarsa, rusak). */
export function bacaPersetujuan(kuki: string, sekarang: Date): Persetujuan | null {
  const cocok = new RegExp(`(?:^|;\\s*)${NAMA_KUKI}=(\\d+)\\.(perlu|semua)\\.(\\d{4}-\\d{2}-\\d{2})(?:;|$)`).exec(kuki)
  if (!cocok || Number(cocok[1]) !== VERSI_PERSETUJUAN) return null
  const umur = (sekarang.getTime() - Date.parse(`${cocok[3]}T00:00:00Z`)) / SEHARI
  if (!(umur >= -1 && umur <= UMUR_PERSETUJUAN_HARI)) return null
  return { versi: VERSI_PERSETUJUAN, pilihan: cocok[2] as PilihanPersetujuan, tanggal: cocok[3] }
}

/** String `document.cookie` untuk menyimpan pilihan: berlaku 12 bulan, `SameSite=Lax`, `Secure` di HTTPS. */
export function tulisKuki(pilihan: PilihanPersetujuan, sekarang: Date, https: boolean): string {
  return `${NAMA_KUKI}=${nilaiKuki(pilihan, sekarang)}; Path=/; Max-Age=${UMUR_PERSETUJUAN_HARI * 86_400}; SameSite=Lax${https ? '; Secure' : ''}`
}

/**
 * Cookie yang ditulis skrip AdSense di domain situs dan dihapus saat pengunjung menarik persetujuan. Daftar
 * Google "Our advertising and measurement cookies" (AdSense, "Set from partner domain"): `__gads` dan
 * `__gpi` (iklan, 13 bulan), `__gpi_optout` (iklan), dan `__eoi` (keamanan, 6 bulan). Tanpa persetujuan
 * skrip AdSense tidak dimuat, jadi tidak ada yang membutuhkannya.
 */
export const KUKI_IKLAN_SITUS = ['__gads', '__gpi', '__gpi_optout', '__eoi'] as const

/** String `document.cookie` yang menghapus satu cookie di path `/`. */
export function hapusKuki(nama: string): string {
  return `${nama}=; Path=/; Max-Age=0; SameSite=Lax`
}

export type JenisSinyal = 'ad_storage' | 'ad_user_data' | 'ad_personalization' | 'analytics_storage'
export type Sinyal = Record<JenisSinyal, 'granted' | 'denied'>

/**
 * Sinyal Google Consent Mode v2. Sebelum memilih dan untuk "Hanya yang perlu": semuanya `denied`.
 * "Izinkan semua": ketiga sinyal iklan `granted`; `analytics_storage` tetap `denied` karena point. tidak
 * memasang alat analitik (menambahkannya berarti teks banner dan `VERSI_PERSETUJUAN` ikut berubah).
 */
export function sinyalPersetujuan(keadaan: KeadaanPersetujuan): Sinyal {
  const iklan = keadaan === 'semua' ? 'granted' : 'denied'
  return { ad_storage: iklan, ad_user_data: iklan, ad_personalization: iklan, analytics_storage: 'denied' }
}

/**
 * Skrip awal di `<head>`, berjalan sebelum `<body>` diurai dan sebelum skrip lain:
 * 1. Consent Mode v2 bawaan `denied` (`gtag('consent', 'default', ...)` lewat `dataLayer`), lalu `update`
 *    `granted` bila pilihan tersimpan "Izinkan semua". Skrip AdSense baru dimuat setelahnya.
 * 2. Atribut `<html data-persetujuan="belum|perlu|semua">` dari cookie, sehingga CSS menampilkan banner
 *    atau slot iklan sejak paint pertama (tanpa pergeseran tata letak) dan halaman tetap ISR.
 * Tanpa JavaScript atribut ini tidak ada: banner dan slot iklan tidak tampil, iklan tidak dimuat.
 * Aturannya sama dengan `bacaPersetujuan` (dijaga tes unit yang menjalankan keduanya).
 */
export function skripAwal(): string {
  const bawaan = JSON.stringify(sinyalPersetujuan('belum'))
  const semua = JSON.stringify(sinyalPersetujuan('semua'))
  return [
    '(function(){',
    'var w=window,d=document;',
    'w.dataLayer=w.dataLayer||[];',
    'function gtag(){w.dataLayer.push(arguments)}',
    `gtag('consent','default',${bawaan});`,
    `var m=/(?:^|;\\s*)${NAMA_KUKI}=(\\d+)\\.(perlu|semua)\\.(\\d{4}-\\d{2}-\\d{2})(?:;|$)/.exec(d.cookie),k='belum';`,
    `if(m&&+m[1]===${VERSI_PERSETUJUAN}){var u=(Date.now()-Date.parse(m[3]+'T00:00:00Z'))/${SEHARI};if(u>=-1&&u<=${UMUR_PERSETUJUAN_HARI})k=m[2]}`,
    `d.documentElement.setAttribute('${ATRIBUT_PERSETUJUAN}',k);`,
    `if(k==='semua')gtag('consent','update',${semua});`,
    '})()',
  ].join('')
}
