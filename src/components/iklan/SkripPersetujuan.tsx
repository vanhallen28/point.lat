import { skripAwal } from '@/modules/iklan/persetujuan'

/**
 * Skrip awal persetujuan di `<head>` (spesifikasi §11): Consent Mode v2 bawaan ditolak sebelum skrip iklan
 * apa pun, dan atribut `<html data-persetujuan>` dari cookie sebelum `<body>` digambar. Skrip sebaris kecil
 * tanpa berkas terpisah, jadi berjalan sebelum paint pertama.
 */
export function SkripPersetujuan() {
  return <script dangerouslySetInnerHTML={{ __html: skripAwal() }} />
}
