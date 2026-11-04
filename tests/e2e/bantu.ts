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

export async function periksaAxe(page: Page): Promise<void> {
  const hasil = await new AxeBuilder({ page }).withTags(TAG_WCAG).analyze()
  expect(hasil.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([])
}

/** Halaman tidak boleh bergeser horizontal (spesifikasi §4: uji layar 375/768/1440). */
export async function periksaTanpaGeserHorizontal(page: Page): Promise<void> {
  const [lebarIsi, lebarLayar] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  expect(lebarIsi).toBeLessThanOrEqual(lebarLayar)
}
