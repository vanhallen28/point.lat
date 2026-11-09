/** Id paragraf tanggal di baris atas header. */
export const ID_TANGGAL = 'tanggal-hari-ini'

/**
 * Skrip sebaris yang menulis tanggal hari ini (WIB) ke atribut `data-tanggal` paragraf tanggal header; CSS
 * menampilkannya lewat `::after`. Header dirender sekali untuk banyak pengunjung (ISR), jadi tanggal ditulis di
 * browser. Atribut, bukan teks anak, supaya hidrasi React tidak menyentuhnya, dan tanpa berkas JavaScript (anggaran
 * JavaScript halaman, spesifikasi §12). Tanpa JavaScript barisnya tidak tampil, bukan tanggal basi.
 */
export function skripTanggal(): string {
  return `(function(){var e=document.getElementById(${JSON.stringify(ID_TANGGAL)});if(!e)return;try{e.setAttribute('data-tanggal',new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date()))}catch(_){}})()`
}
