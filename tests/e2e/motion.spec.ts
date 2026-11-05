import { expect, test, type Browser } from '@playwright/test'

import { cegatCloudinary } from './bantu'
import { SLUG, SLUG_SUB, SLUG_VIDEO } from './data'

/**
 * Anggaran JavaScript per halaman (byte terkompresi yang diunduh), spesifikasi §12: total di bawah
 * 160 KiB. Kerangka Next 16 + React 19 sendiri sekitar 140 KB, jadi angka ini juga menjaga JS milik
 * point. tetap kecil di atasnya.
 */
const ANGGARAN_JS = 160 * 1024

/** Setiap jenis halaman publik: beranda, artikel, rubrik, halaman statis, penulis, video, tools, kalkulator, cari. */
const HALAMAN_ANGGARAN = [
  '/',
  `/${SLUG.panduan}`,
  `/uang-karier/${SLUG_SUB.pajak}`,
  '/tentang',
  '/penulis/redaksi',
  '/video',
  `/video/${SLUG_VIDEO.pph21}`,
  '/tools',
  '/tools/gaji-bersih',
  '/tools/ipk',
  '/cari?q=gaji',
]

/** JS milik point. di luar kerangka Next/React (spesifikasi §12): kalkulator dan modul hitung. */
const ANGGARAN_KALKULATOR = 25 * 1024

/** Byte JS halaman di konteks baru (tanpa cache browser dari halaman sebelumnya). */
async function byteJs(browser: Browser, path: string): Promise<number> {
  const konteks = await browser.newContext()
  const page = await konteks.newPage()
  await cegatCloudinary(page)
  await page.goto(path)
  const byte = await page.evaluate(() =>
    performance
      .getEntriesByType('resource')
      .filter((e) => (e as PerformanceResourceTiming).initiatorType === 'script')
      .reduce((jumlah, e) => jumlah + (e as PerformanceResourceTiming).encodedBodySize, 0),
  )
  await konteks.close()
  return byte
}

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
  const kartu = page.getByRole('region', { name: 'Paling dicari pekan ini' }).getByRole('link').first()
  const judul = await kartu.getByRole('heading').textContent()
  await kartu.click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(judul ?? '')
  const nama = await page.evaluate(() => (window as Window & { namaTransisi?: string[] }).namaTransisi ?? [])
  expect(nama.some((n) => n.startsWith('judul-artikel-'))).toBe(true)
})

test('JavaScript setiap jenis halaman di bawah anggaran', async ({ browser }) => {
  for (const path of HALAMAN_ANGGARAN) {
    const byte = await byteJs(browser, path)
    test.info().annotations.push({ type: `JS ${path}`, description: `${(byte / 1024).toFixed(1)} KiB` })
    expect(byte, path).toBeGreaterThan(0)
    expect(byte, path).toBeLessThan(ANGGARAN_JS)
  }
})

test('JavaScript kalkulator (komponen dan modul hitung) di bawah 25 KB di atas JavaScript artikel', async ({ browser }) => {
  const artikel = await byteJs(browser, `/${SLUG.panduan}`)
  for (const path of ['/tools/gaji-bersih', '/tools/ipk']) {
    const tambahan = (await byteJs(browser, path)) - artikel
    test.info().annotations.push({ type: `JS kalkulator ${path}`, description: `${(tambahan / 1024).toFixed(1)} KiB` })
    expect(tambahan, path).toBeLessThan(ANGGARAN_KALKULATOR)
  }
})

test('reveal judul beranda tanpa JavaScript tambahan: JS beranda tidak melebihi JS artikel', async ({ browser }) => {
  expect(await byteJs(browser, '/')).toBeLessThanOrEqual(await byteJs(browser, `/${SLUG.panduan}`))
})

test('judul raksasa beranda muncul per kata walau JavaScript mati, dan diam saat reduced motion', async ({ browser }) => {
  const tanpaJs = await browser.newContext({ javaScriptEnabled: false })
  const halaman = await tanpaJs.newPage()
  await cegatCloudinary(halaman)
  await halaman.goto('/')
  const kata = halaman.getByRole('heading', { level: 1 }).locator('span')
  await expect(kata).toHaveText(['Intinya', 'dulu.'])
  await expect(kata.first()).toHaveCSS('animation-name', /muncul/)
  await expect(kata.last()).toHaveCSS('opacity', '1')
  await tanpaJs.close()

  const tenang = await browser.newContext({ reducedMotion: 'reduce' })
  const halamanTenang = await tenang.newPage()
  await cegatCloudinary(halamanTenang)
  await halamanTenang.goto('/')
  await expect(halamanTenang.getByRole('heading', { level: 1 }).locator('span').first()).toHaveCSS('animation-name', 'none')
  await tenang.close()
})
