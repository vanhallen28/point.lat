import { expect, test } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { SLUG_SUB, UKURAN_LAYAR } from './data'

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
  await expect(page.getByRole('contentinfo').getByRole('navigation', { name: 'Tentang point.' }).getByRole('link')).toHaveCount(7)
  await expect(page.getByRole('contentinfo').getByRole('navigation', { name: 'Jelajahi' }).getByRole('link')).toHaveText([
    'Uang & Karier',
    'Tekno',
    'Belajar',
    'Sehat',
    'Tools',
  ])
})

test('baris atas header: tanggal hari ini (WIB) dan Topik hangat dari subkategori tulisan terbaru', async ({ page }) => {
  await page.goto('/')
  const hariIni = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date())
  await expect(page.locator('#tanggal-hari-ini')).toHaveAttribute('data-tanggal', hariIni)
  await expect(page.locator('#tanggal-hari-ini')).toBeVisible()
  const topik = page.getByRole('navigation', { name: 'Topik hangat' }).getByRole('link')
  await expect(topik.first()).toBeVisible()
  expect(await topik.count()).toBeLessThanOrEqual(5)
  expect(await topik.evaluateAll((a) => a.map((el) => el.getAttribute('href')))).toContain(`/uang-karier/${SLUG_SUB.pajak}`)
})

test('tanpa JavaScript baris tanggal tidak tampil (bukan tanggal basi dari server)', async ({ browser }) => {
  const konteks = await browser.newContext({ javaScriptEnabled: false })
  const page = await konteks.newPage()
  await page.goto('/')
  await expect(page.locator('#tanggal-hari-ini')).toBeHidden()
  await expect(page.getByRole('navigation', { name: 'Topik hangat' })).toBeVisible()
  await konteks.close()
})

test('header menandai rubrik dan Tools yang sedang dibuka, juga sebelum JavaScript jalan', async ({ page, browser }) => {
  const rubrik = page.getByRole('navigation', { name: 'Rubrik' })
  const tools = page.getByRole('banner').getByRole('link', { name: 'Tools' })
  await page.goto('/')
  await expect(page.getByRole('banner').locator('[aria-current]')).toHaveCount(0)
  await page.goto('/uang-karier')
  await expect(rubrik.getByRole('link', { name: 'Uang & Karier' })).toHaveAttribute('aria-current', 'page')
  await rubrik.getByRole('link', { name: 'Sehat' }).click()
  await expect(page).toHaveURL('/sehat')
  await expect(rubrik.getByRole('link', { name: 'Sehat' })).toHaveAttribute('aria-current', 'page')
  await expect(rubrik.getByRole('link', { name: 'Uang & Karier' })).not.toHaveAttribute('aria-current')
  await page.goto('/tools/gaji-bersih')
  await expect(tools).toHaveAttribute('aria-current', 'true')

  const tanpaJs = await browser.newContext({ javaScriptEnabled: false })
  const halaman = await tanpaJs.newPage()
  await cegatCloudinary(halaman)
  await halaman.goto('/uang-karier/pajak')
  await expect(halaman.getByRole('navigation', { name: 'Rubrik' }).getByRole('link', { name: 'Uang & Karier' })).toHaveAttribute('aria-current', 'true')
  await tanpaJs.close()
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
