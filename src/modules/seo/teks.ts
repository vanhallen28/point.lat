/**
 * Utilitas teks untuk analisis SEO. Fungsi murni, aman dipakai di server dan di komponen admin.
 */

/** Huruf kecil, tanpa diakritik, tanda baca menjadi spasi, spasi dirapikan. Dipakai untuk mencocokkan frasa. */
export function normalisasi(teks: string): string {
  return teks
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** Jumlah kata: potongan yang berisi minimal satu huruf atau angka. */
export function hitungKata(teks: string): number {
  return teks.split(/\s+/).filter((kata) => /[\p{L}\p{N}]/u.test(kata)).length
}

/**
 * Memecah teks menjadi kalimat di titik, tanda tanya, tanda seru, dan baris baru. Titik di antara
 * angka (Rp5.000.000) tidak memecah kalimat karena pemisah harus diikuti spasi.
 */
export function pecahKalimat(teks: string): string[] {
  return teks
    .split(/\n+|(?<=[.!?])\s+/)
    .map((kalimat) => kalimat.trim())
    .filter((kalimat) => hitungKata(kalimat) > 0)
}

/** Rata-rata kata per kalimat, dibulatkan satu angka di belakang koma. 0 bila tidak ada kalimat. */
export function rataPanjangKalimat(teks: string): number {
  const kalimat = pecahKalimat(teks)
  if (kalimat.length === 0) return 0
  const total = kalimat.reduce((jumlah, k) => jumlah + hitungKata(k), 0)
  return Math.round((total / kalimat.length) * 10) / 10
}

/** Memotong teks di batas kata supaya panjangnya (termasuk "...") tidak melebihi `maks`. */
export function potongKata(teks: string, maks: number): string {
  const rapi = teks.replace(/\s+/g, ' ').trim()
  if (rapi.length <= maks) return rapi
  const potong = rapi.slice(0, maks - 2)
  const batas = potong.lastIndexOf(' ')
  const dasar = batas > 0 ? potong.slice(0, batas) : rapi.slice(0, maks - 3)
  return `${dasar.replace(/[\s.,:;]+$/, '')}...`
}

/** Frasa muncul utuh di teks (dibandingkan setelah normalisasi, per kata). */
export function mengandungFrasa(teks: string, frasa: string): boolean {
  const target = normalisasi(frasa)
  if (!target) return false
  return ` ${normalisasi(teks)} `.includes(` ${target} `)
}
