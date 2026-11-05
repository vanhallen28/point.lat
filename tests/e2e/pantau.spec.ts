import { expect, test } from '@playwright/test'

import { periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { ADMIN_E2E, HARI_CONTOH, KLIK_CONTOH, UKURAN_LAYAR } from './data'

test('log 404: "Buat redirect" membuka form redirect dengan path terisi; setelah disimpan menjadi "Lihat redirect" dan path itu dialihkan', async ({ page }) => {
  const path = `/jalan-lama-${Date.now()}`
  expect((await page.request.post('/api/log-404/catat', { data: { path } })).status()).toBe(204)
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  const daftar = `/admin/collections/log-404?where[path][equals]=${encodeURIComponent(path)}`

  await page.goto(daftar)
  await page.getByRole('link', { name: `Buat redirect untuk ${path}` }).click()
  await expect(page).toHaveURL(/\/admin\/collections\/redirect\/create\?dari=/)
  await expect(page.getByLabel('Dari')).toHaveValue(path)
  await page.getByLabel('Ke').fill('/tentang')
  await page.getByRole('button', { name: 'Save' }).click()
  await expect(page).toHaveURL(/\/admin\/collections\/redirect\/\d+/)

  await page.goto(daftar)
  await expect(page.getByRole('link', { name: `Lihat redirect untuk ${path}` })).toBeVisible()
  const jawaban = await page.request.get(path, { maxRedirects: 0 })
  expect(jawaban.status()).toBe(308)
  expect(jawaban.headers().location).toContain('/tentang')
})

test('dashboard SEO hanya untuk yang masuk: tanpa login diarahkan ke halaman masuk', async ({ page }) => {
  await page.goto('/admin/seo')
  await expect(page).toHaveURL(/\/admin\/login/)
})

test('dashboard SEO dari menu admin: performa Google, halaman teratas, status indeks, log, tautan rusak, halaman yatim, dan 404 teratas', async ({ page }) => {
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  // Cron sebagai admin: pindai tautan harian berjalan bila belum (sinkron Search Console sudah tercatat di siapkan.ts).
  expect((await page.request.get('/api/jobs/run')).status()).toBe(200)
  await page.goto('/admin')
  // Server merender menu admin terbuka; saat hidrasi (kelas nav--nav-hydrated) Payload menutupnya di layar 1440 px
  // ke bawah. Tombol Open Menu baru diklik setelah keadaan itu tetap, supaya klik tidak hilang sebelum hidrasi.
  const nav = page.locator('.nav')
  await expect(nav).toHaveClass(/nav--nav-hydrated/)
  if (!(await nav.getAttribute('class'))?.includes('nav--nav-open')) await page.getByRole('button', { name: 'Open Menu' }).click()
  await expect(nav).toHaveClass(/nav--nav-open/)
  await page.getByRole('link', { name: 'Dashboard SEO' }).click()
  await expect(page).toHaveURL(/\/admin\/seo$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard SEO')
  await expect(page.getByRole('link', { name: 'Dashboard SEO' })).toHaveAttribute('aria-current', 'page')

  const google = page.getByRole('region', { name: 'Performa di Google' })
  await expect(google).toContainText('Sinkron Search Console: berhasil')
  await expect(google).toContainText('28 hari sampai 2 Nov 2026.')
  const klik = HARI_CONTOH.reduce((n, h) => n + h.klik, 0)
  await expect(google.getByRole('definition').first()).toHaveText(klik.toLocaleString('id-ID'))
  await expect(google.getByRole('img', { name: /^Klik per hari, 6 Okt 2026 sampai 2 Nov 2026: total / })).toBeVisible()
  const teratas = google.getByRole('region', { name: 'Halaman teratas di Google, 28 hari' })
  await expect(teratas.getByRole('row')).toHaveCount(KLIK_CONTOH.length + 1)
  await expect(teratas.getByRole('rowheader').first()).toHaveText('/')

  await expect(page.getByRole('region', { name: 'Status indeks' })).toContainText('halaman terbit dipantau di Google.')
  await expect(page.getByRole('region', { name: 'Log indexing terbaru' }).getByRole('link', { name: 'Buka Log indexing' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Tautan rusak' })).toContainText('Pindai tautan: berhasil')
  await expect(page.getByRole('region', { name: 'Halaman yatim' })).toBeVisible()
  await expect(page.getByRole('region', { name: '404 teratas' }).getByRole('link', { name: 'Buka Log 404' })).toBeVisible()
  await periksaAxe(page, '.pantau')
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`dashboard SEO ${lebar}px tanpa geser horizontal`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
    await page.goto('/admin/seo')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard SEO')
    await periksaTanpaGeserHorizontal(page)
  })
}
