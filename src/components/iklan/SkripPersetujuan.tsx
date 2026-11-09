import { skripAwal } from '@/modules/iklan/persetujuan'

/**
 * Skrip awal persetujuan di `<head>` (spesifikasi §11): Consent Mode v2 bawaan ditolak sebelum skrip iklan
 * apa pun, dan atribut `<html data-persetujuan>` dari cookie sebelum `<body>` digambar. Skrip sebaris kecil
 * tanpa berkas terpisah, jadi berjalan sebelum paint pertama. `analitik`: ada Kode sematan yang menunggu persetujuan
 * (versi pilihan 2 dan `analytics_storage` ikut dibuka).
 */
export function SkripPersetujuan({ analitik = false }: { analitik?: boolean }) {
  return <script dangerouslySetInnerHTML={{ __html: skripAwal(analitik) }} />
}
