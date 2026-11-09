/**
 * Membuat kartu sampul paket konten (spesifikasi §24): PNG 1920 x 1080 bergaya Kartu Intinya untuk setiap
 * artikel di `PAKET_AWAL`, disimpan di `src/modules/paket/sampul/`. Hanya dijalankan pengembang saat isi paket
 * berubah (hasilnya di-commit), tidak di build atau di Vercel:
 *
 *   npx tsx --tsconfig tsconfig.json scripts/buat-sampul-paket.ts
 *
 * Komposisi berpusat di tengah supaya tetap utuh saat dipotong 4:3 (kartu) dan 1:1 (thumbnail) oleh
 * `g_auto` Cloudinary: kata besar paling lebar 1000 px, label pilar di atas, logo point. di bawah.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { chromium } from '@playwright/test'

import { LOGO_BIRU, LOGO_TINTA, LOGO_VIEWBOX } from '@/lib/merek'
import { PAKET_AWAL } from '@/modules/paket/paket-awal'

const AKAR = process.cwd()
const TUJUAN = path.join(AKAR, 'src/modules/paket/sampul')
const FONT = readFileSync(path.join(AKAR, 'node_modules/@fontsource-variable/archivo/files/archivo-latin-standard-normal.woff2')).toString('base64')

/** Warna pilar (spesifikasi §4) dan warna teks di atasnya. */
const WARNA: Record<string, { latar: string; teks: string; cincin: string; label: string }> = {
  'uang-karier': { latar: '#1F7A4D', teks: '#FFFFFF', cincin: 'rgba(255,255,255,0.12)', label: 'Uang & Karier' },
  belajar: { latar: '#F2C230', teks: '#111111', cincin: 'rgba(17,17,17,0.08)', label: 'Belajar' },
  tekno: { latar: '#C2410C', teks: '#FFFFFF', cincin: 'rgba(255,255,255,0.12)', label: 'Tekno' },
  sehat: { latar: '#FF8A80', teks: '#111111', cincin: 'rgba(17,17,17,0.08)', label: 'Sehat' },
}

const halaman = (kata: string, pilar: string) => {
  const w = WARNA[pilar]
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face { font-family: Archivo; src: url(data:font/woff2;base64,${FONT}) format('woff2'); font-weight: 100 900; font-stretch: 62% 125%; }
  * { margin: 0; box-sizing: border-box; }
  body { width: 1920px; height: 1080px; overflow: hidden; background: ${w.latar}; color: ${w.teks}; font-family: Archivo; display: grid; place-items: center; position: relative; }
  .cincin { position: absolute; left: 50%; top: 50%; width: 1500px; height: 1500px; margin: -750px 0 0 -750px; border: 34px solid ${w.cincin}; border-radius: 50%; }
  .cincin.dalam { width: 980px; height: 980px; margin: -490px 0 0 -490px; border-width: 10px; }
  .isi { position: relative; display: flex; flex-direction: column; align-items: center; gap: 44px; width: 1000px; text-align: center; }
  .label { padding: 14px 34px; border: 5px solid currentColor; border-radius: 999px; font-size: 34px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
  .kata { font-weight: 900; font-stretch: 72%; line-height: 0.86; text-transform: uppercase; letter-spacing: -0.01em; max-width: 1000px; overflow-wrap: normal; }
  svg { height: 64px; width: auto; }
  </style></head><body>
  <div class="cincin"></div><div class="cincin dalam"></div>
  <div class="isi">
    <span class="label">${w.label}</span>
    <h1 class="kata">${kata}</h1>
    <svg viewBox="${LOGO_VIEWBOX}" aria-hidden="true"><path fill="currentColor" d="${LOGO_TINTA}"/><path fill="currentColor" d="${LOGO_BIRU}"/></svg>
  </div>
  <script>
    // Kata sebesar mungkin: paling tinggi 300 px, paling lebar 1000 px, paling banyak dua baris. Dibungkus
    // fungsi karena setContent berikutnya memakai realm JavaScript yang sama (const di tingkat atas bentrok).
    window.pasKata = () => {
      const kata = document.querySelector('.kata')
      for (let ukuran = 300; ukuran >= 120; ukuran -= 4) {
        kata.style.fontSize = ukuran + 'px'
        const baris = Math.round(kata.getBoundingClientRect().height / (ukuran * 0.86))
        if (kata.scrollWidth <= 1000 && baris <= 2) break
      }
    }
  </script>
  </body></html>`
}

mkdirSync(TUJUAN, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
for (const a of PAKET_AWAL) {
  await page.setContent(halaman(a.sampul.kata, a.pilar))
  // Ukur setelah Archivo termuat, karena lebar huruf cadangan berbeda.
  await page.evaluate(async () => {
    await document.fonts.ready
    ;(window as unknown as { pasKata: () => void }).pasKata()
  })
  writeFileSync(path.join(TUJUAN, a.sampul.file), await page.screenshot({ type: 'png' }))
  console.log(a.sampul.file)
}
await browser.close()
