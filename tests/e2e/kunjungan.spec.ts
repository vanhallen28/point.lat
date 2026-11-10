import { expect, test, type Browser, type Page } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { ADMIN_E2E, JUDUL_PANDUAN, SLUG, UA_PEMBACA } from './data'

type Kiriman = { p: string; r: string; s: string }

/**
 * Beacon kunjungan dicegat (tidak sampai ke server) dan dicatat isinya. `navigator.webdriver` dibuat `false`
 * karena skrip pelacak sengaja diam di peramban otomatis (Playwright, Lighthouse).
 */
async function sadap(page: Page): Promise<Kiriman[]> {
  const kiriman: Kiriman[] = []
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }))
  await page.route('**/api/kunjungan/catat', async (route) => {
    kiriman.push(JSON.parse(route.request().postData() ?? '{}'))
    await route.fulfill({ status: 204 })
  })
  return kiriman
}

test('pelacak kunjungan: satu beacon per halaman, juga saat pindah halaman tanpa muat ulang; halaman 404 tidak dicatat', async ({ page }) => {
  await cegatCloudinary(page)
  const kiriman = await sadap(page)
  await page.goto('/?utm_source=newsletter')
  await expect.poll(() => kiriman.length).toBe(1)
  expect(kiriman[0]).toEqual({ p: '/', r: '', s: 'newsletter' })

  await page.getByRole('link', { name: JUDUL_PANDUAN }).first().click()
  await expect(page).toHaveURL(new RegExp(`/${SLUG.panduan}$`))
  await expect.poll(() => kiriman.length).toBe(2)
  expect(kiriman[1]).toEqual({ p: `/${SLUG.panduan}`, r: new URL('/', page.url()).toString(), s: '' })

  await page.goBack()
  await expect.poll(() => kiriman.length).toBe(3)
  expect(kiriman[2].p).toBe('/')

  await page.goto('/halaman-yang-tidak-ada')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.waitForTimeout(400)
  expect(kiriman.map((k) => k.p)).not.toContain('/halaman-yang-tidak-ada')
})

test('pelacak kunjungan diam di peramban otomatis dan bila pembaca mengaktifkan Global Privacy Control', async ({ page }) => {
  await cegatCloudinary(page)
  let jumlah = 0
  await page.route('**/api/kunjungan/catat', async (route) => {
    jumlah++
    await route.fulfill({ status: 204 })
  })
  await page.goto('/')
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false })
    Object.defineProperty(Navigator.prototype, 'globalPrivacyControl', { get: () => true })
  })
  await page.goto('/tools')
  await page.waitForTimeout(400)
  expect(jumlah).toBe(0)
})

async function bukaAdmin(browser: Browser, lebar = 1512) {
  const konteks = await browser.newContext({ viewport: { width: lebar, height: 1000 } })
  const page = await konteks.newPage()
  await cegatCloudinary(page)
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  return { page, tutup: () => konteks.close() }
}

test('statistik kunjungan di beranda admin: kartu ringkas, sedang online, grafik, rincian, kalender, dan Unduh CSV', async ({ browser, request }) => {
  // Satu pembaca sungguhan lewat endpoint (UA peramban biasa, tanpa cookie admin), supaya ada yang sedang online.
  const jawab = await request.post('/api/kunjungan/catat', {
    headers: { 'user-agent': UA_PEMBACA, 'sec-fetch-site': 'same-origin', 'content-type': 'text/plain', 'x-vercel-ip-country': 'ID' },
    data: JSON.stringify({ p: `/${SLUG.panduan}`, r: 'https://www.google.com/', s: '' }),
  })
  expect(jawab.status()).toBe(204)

  const { page, tutup } = await bukaAdmin(browser)
  await page.goto('/admin')
  const statistik = page.getByRole('region', { name: 'Statistik kunjungan' })
  await expect(statistik).toBeVisible()
  const kartu = statistik.getByRole('list').first().getByRole('link')
  await expect(kartu).toHaveCount(4)
  for (const [i, label] of ['Hari ini', '7 hari', '30 hari', 'Total'].entries()) await expect(kartu.nth(i)).toContainText(label)
  await expect(kartu.nth(1)).toHaveAttribute('aria-current', 'true')
  await expect(statistik.getByText(/\d+ sedang online/)).toContainText(/[1-9]\d* sedang online/)
  await expect(page.getByRole('region', { name: 'Sedang dibaca' })).toContainText(JUDUL_PANDUAN)
  await expect(page.getByRole('img', { name: /^Kunjungan dan tayangan per hari, / })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Negara' })).toContainText('Indonesia')
  await expect(page.getByRole('region', { name: 'Kota' })).toContainText('Jakarta')
  await expect(page.getByRole('region', { name: 'Sumber kunjungan' })).toContainText('Mesin pencari')
  await expect(page.getByRole('region', { name: 'Mesin pencari, media sosial, dan AI' })).toContainText('Google')
  await expect(page.getByRole('region', { name: 'Halaman paling banyak dibuka' })).toContainText(JUDUL_PANDUAN)
  await expect(page.getByRole('region', { name: 'Perangkat' })).toContainText('HP')
  await periksaAxe(page, '.kunjungan')

  // Unduh CSV memakai rentang yang sama dengan yang dilihat.
  const csv = statistik.getByRole('link', { name: 'Unduh CSV' })
  const href = await csv.getAttribute('href')
  expect(href).toMatch(/^\/api\/kunjungan\/csv\?dari=\d{4}-\d{2}-\d{2}&sampai=\d{4}-\d{2}-\d{2}$/)
  const unduhan = await page.request.get(href!)
  expect(unduhan.status()).toBe(200)
  expect((await unduhan.text()).replace(/^﻿/, '').split(/\r?\n/)[0]).toBe('tanggal,halaman,negara,kota,kanal,sumber,perujuk,perangkat,peramban,tayangan,kunjungan')

  // Pilihan 30 hari dan kalender; periode Google tetap dipertahankan.
  await page.goto('/admin?periode=28')
  await page.getByRole('navigation', { name: 'Pilihan rentang kunjungan' }).getByRole('link', { name: '30 hari' }).click()
  await expect(page).toHaveURL(/\/admin\?periode=28&kunjungan=30#statistik-kunjungan$/)
  await expect(page.getByRole('img', { name: /^Kunjungan dan tayangan per hari, / })).toBeVisible()
  // Satu hari (hari ini, yang pasti berisi kunjungan contoh): grafik per jam.
  const hariIni = await page.getByLabel('Sampai', { exact: true }).inputValue()
  await page.getByLabel('Dari', { exact: true }).fill(hariIni)
  await page.getByRole('button', { name: 'Tampilkan' }).click()
  await expect(page).toHaveURL(new RegExp(`\\?periode=28&dari=${hariIni}&sampai=${hariIni}#statistik-kunjungan$`))
  await expect(page.getByRole('img', { name: /^Kunjungan dan tayangan per jam, / })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Periode angka Google' }).getByRole('link', { name: '7 hari' })).toHaveAttribute(
    'href',
    `/admin?dari=${hariIni}&sampai=${hariIni}`,
  )
  await tutup()
})

test('statistik kunjungan 375px tanpa geser horizontal', async ({ browser }) => {
  const { page, tutup } = await bukaAdmin(browser, 375)
  await page.goto('/admin')
  await expect(page.getByRole('region', { name: 'Statistik kunjungan' })).toBeVisible()
  await periksaTanpaGeserHorizontal(page)
  await tutup()
})
