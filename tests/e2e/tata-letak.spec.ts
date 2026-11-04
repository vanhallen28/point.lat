import { expect, test } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { UKURAN_LAYAR } from './data'

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

test('header berisi rubrik dari CMS, tombol Tools, dan bahasa halaman Indonesia', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('lang', 'id')
  const rubrik = page.getByRole('navigation', { name: 'Rubrik' }).getByRole('link')
  await expect(rubrik).toHaveText(['Uang & Karier', 'Tekno', 'Belajar', 'Sehat'])
  await expect(rubrik.first()).toHaveAttribute('href', '/uang-karier')
  await expect(page.getByRole('banner').getByRole('link', { name: 'Tools' })).toHaveAttribute('href', '/tools')
  await expect(page.getByRole('contentinfo').getByRole('navigation', { name: 'Tentang point.' }).getByRole('link')).toHaveCount(6)
})

test('skip link muncul saat Tab pertama dan menuju isi', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const lewati = page.getByRole('link', { name: 'Langsung ke isi' })
  await expect(lewati).toBeFocused()
  await expect(lewati).toBeInViewport()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#isi$/)
})

test('font Archivo satu file subset, di-preload', async ({ page }) => {
  const font: string[] = []
  page.on('response', (r) => {
    if (r.request().resourceType() === 'font') font.push(r.url())
  })
  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  await expect(page.locator('link[rel="preload"][as="font"]')).toHaveCount(1)
  expect(font).toHaveLength(1)
  expect(font[0]).toMatch(/archivo_latin_standard_normal.*\.woff2$/)
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`tata letak ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    await page.goto('/')
    await periksaTanpaGeserHorizontal(page)
    await periksaAxe(page)
  })
}
