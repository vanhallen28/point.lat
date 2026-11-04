import { expect, test } from '@playwright/test'

import { cegatCloudinary } from './bantu'
import { SLUG } from './data'

/**
 * Anggaran JavaScript halaman artikel (byte gzip yang diunduh). Spesifikasi §12 menulis 70 KB, tetapi
 * kerangka Next 16 + React 19 saja sudah sekitar 135 KB; angka ini menjaga supaya JS milik point.
 * tetap kecil di atas kerangka itu. Lihat bagian Risiko Rencana 4A.
 */
const ANGGARAN_JS_ARTIKEL = 160 * 1024

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

test('kartu di bawah layar masuk sekali saat pertama terlihat', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`/${SLUG.panduan}`)
  const kartu = page.getByRole('region', { name: 'Baca juga' }).getByRole('listitem').first()
  await expect(kartu).toHaveAttribute('data-masuk', 'tunggu')
  await expect(kartu).toHaveCSS('opacity', '0')
  await kartu.scrollIntoViewIfNeeded()
  await expect(kartu).toHaveAttribute('data-masuk', 'terlihat')
  await expect(kartu).toHaveCSS('opacity', '1')
})

test('reduced motion: kartu langsung tampil dan transisi dimatikan', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`/${SLUG.panduan}`)
  const kartu = page.getByRole('region', { name: 'Baca juga' }).getByRole('listitem').first()
  await expect(kartu).toHaveAttribute('data-masuk', '')
  await expect(kartu).toHaveCSS('opacity', '1')
  await expect(kartu.getByRole('link')).toHaveCSS('transition-duration', /^(0s|1e-05s)$/)
})

test('kartu ke artikel memakai View Transitions dengan judul sebagai elemen bersama', async ({ page }) => {
  await page.goto('/halaman-yang-tidak-ada')
  await page.evaluate(() => {
    const w = window as Window & { namaTransisi?: string[] }
    const asli = document.startViewTransition.bind(document)
    document.startViewTransition = ((...arg: Parameters<typeof asli>) => {
      w.namaTransisi = [...document.querySelectorAll('h1, h2, h3')]
        .map((el) => getComputedStyle(el).viewTransitionName)
        .filter((nama) => nama && nama !== 'none')
      return asli(...arg)
    }) as typeof document.startViewTransition
  })
  const kartu = page.getByRole('region', { name: 'Tulisan terbaru' }).getByRole('link').first()
  const judul = await kartu.getByRole('heading').textContent()
  await kartu.click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(judul ?? '')
  const nama = await page.evaluate(() => (window as Window & { namaTransisi?: string[] }).namaTransisi ?? [])
  expect(nama.some((n) => n.startsWith('judul-artikel-'))).toBe(true)
})

test('JavaScript halaman artikel di bawah anggaran', async ({ page }) => {
  await page.goto(`/${SLUG.panduan}`)
  const byte = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((e) => (e as PerformanceResourceTiming).initiatorType === 'script')
      .reduce((jumlah, e) => jumlah + (e as PerformanceResourceTiming).encodedBodySize, 0),
  )
  test.info().annotations.push({ type: 'JS artikel (gzip)', description: `${Math.round(byte / 1024)} KB` })
  expect(byte).toBeGreaterThan(0)
  expect(byte).toBeLessThan(ANGGARAN_JS_ARTIKEL)
})
