import localFont from 'next/font/local'

/**
 * Archivo variable (sumbu `wdth` 62-125 dan `wght`), satu file subset Latin dari paket
 * `@fontsource-variable/archivo` (lisensi OFL). `next/font` menyalinnya ke `/_next/static/media`,
 * membuat `@font-face` dengan `font-display: swap`, mem-preload file itu, dan membuat font cadangan
 * berukuran sama supaya tidak ada CLS saat font selesai dimuat (spesifikasi §4, §12).
 */
export const archivo = localFont({
  src: '../../../node_modules/@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2',
  variable: '--font-archivo',
  weight: '400 900',
  style: 'normal',
  display: 'swap',
  declarations: [{ prop: 'font-stretch', value: '62% 125%' }],
  adjustFontFallback: 'Arial',
})
