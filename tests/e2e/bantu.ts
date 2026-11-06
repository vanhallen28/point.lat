import AxeBuilder from '@axe-core/playwright'
import { expect, type Page } from '@playwright/test'

/** Aturan axe untuk WCAG 2.2 AA (spesifikasi §14). */
const TAG_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

/**
 * Gambar Cloudinary dilayani dari tes: server E2E membangun URL `res.cloudinary.com/e2e/...`, dan
 * tes tidak boleh memanggil jaringan. Gambar pengganti berukuran sama sehingga tata letak tetap.
 */
export async function cegatCloudinary(page: Page): Promise<void> {
  await page.route('https://res.cloudinary.com/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="100%" height="100%" fill="#c9c3b8"/></svg>',
    }),
  )
}

/**
 * Skrip AdSense tiruan, dilayani tes untuk `pagead2.googlesyndication.com` (tes tidak boleh memanggil
 * jaringan). Mencatat berapa kali dimuat, isi `dataLayer` saat dimuat (Consent Mode harus sudah diatur),
 * menulis cookie `__gads` dan `__gpi` seperti AdSense, dan mengisi setiap `<ins class="adsbygoogle">` dengan
 * kotak hijau seukuran unit. Permintaan lain ke domain iklan Google ditolak dan dicatat.
 */
const SKRIP_ADSENSE_TIRUAN = `(function () {
  var c = (window.__iklanTiruan = window.__iklanTiruan || { dimuat: 0, diisi: 0, dataLayer: [] })
  c.dimuat++
  c.dataLayer = (window.dataLayer || []).map(function (a) { return Array.prototype.slice.call(a) })
  document.cookie = '__gads=tiruan; Path=/; SameSite=Lax'
  document.cookie = '__gpi=tiruan; Path=/; SameSite=Lax'
  function isi() {
    document.querySelectorAll('ins.adsbygoogle:not([data-adsbygoogle-status])').forEach(function (ins) {
      ins.setAttribute('data-adsbygoogle-status', 'done')
      ins.setAttribute('data-ad-status', 'filled')
      ins.innerHTML = '<div data-iklan-tiruan style="width:100%;height:100%;background:#1f7a4d"></div>'
      c.diisi++
    })
  }
  var antre = window.adsbygoogle || []
  window.adsbygoogle = { loaded: true, push: isi }
  if (antre.length) isi()
})()`

export type CatatanIklan = { skrip: string[]; lain: string[] }

export async function cegatIklan(page: Page): Promise<CatatanIklan> {
  const catatan: CatatanIklan = { skrip: [], lain: [] }
  for (const pola of ['https://*.googlesyndication.com/**', 'https://*.doubleclick.net/**', 'https://*.google.com/**', 'https://*.googletagmanager.com/**']) {
    await page.route(pola, (route) => {
      catatan.lain.push(route.request().url())
      return route.abort()
    })
  }
  // Didaftarkan terakhir supaya didahulukan Playwright (rute yang cocok dijalankan dari yang terakhir didaftarkan).
  await page.route('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js*', (route) => {
    catatan.skrip.push(route.request().url())
    return route.fulfill({ status: 200, contentType: 'text/javascript', body: SKRIP_ADSENSE_TIRUAN })
  })
  return catatan
}

/** `bagian`: selector yang diperiksa saja, misalnya komponen kustom di admin Payload. Tanpa itu: seluruh halaman. */
export async function periksaAxe(page: Page, ...bagian: string[]): Promise<void> {
  let axe = new AxeBuilder({ page }).withTags(TAG_WCAG)
  for (const selector of bagian) axe = axe.include(selector)
  const hasil = await axe.analyze()
  expect(hasil.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
}

/** Halaman tidak boleh bergeser horizontal (spesifikasi §4: uji layar 375/768/1440). */
export async function periksaTanpaGeserHorizontal(page: Page): Promise<void> {
  const [lebarIsi, lebarLayar] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  expect(lebarIsi).toBeLessThanOrEqual(lebarLayar)
}
