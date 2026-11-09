import { expect, test, type Browser } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { ADMIN_E2E, UKURAN_LAYAR } from './data'

/** Halaman admin dengan tema tertentu (cookie `payload-theme`), sudah masuk sebagai `akun`. */
async function bukaAdmin(browser: Browser, akun: { email: string; password: string }, tema: 'light' | 'dark' = 'light', lebar = 1512) {
  const konteks = await browser.newContext({ viewport: { width: lebar, height: 1000 } })
  await konteks.addCookies([{ name: 'payload-theme', value: tema, domain: 'localhost', path: '/' }])
  const page = await konteks.newPage()
  await cegatCloudinary(page)
  await page.request.post('/api/pengguna/login', { data: akun })
  return { page, tutup: () => konteks.close() }
}

test('halaman masuk admin memakai logo point.', async ({ page }) => {
  await page.goto('/admin/login')
  await expect(page.getByRole('img', { name: 'point.' }).first()).toBeVisible()
  await periksaAxe(page)
})

for (const tema of ['light', 'dark'] as const) {
  test(`beranda admin (${tema === 'light' ? 'terang' : 'gelap'}): kepala, empat kartu angka, kalender, Google, terbit terbaru, kesehatan, perlu perhatian`, async ({ browser }) => {
    const { page, tutup } = await bukaAdmin(browser, ADMIN_E2E, tema)
    await page.goto('/admin')
    await expect(page.locator('html')).toHaveAttribute('data-theme', tema)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Selamat (pagi|siang|sore|malam), /)
    for (const nama of ['Klik dari Google', 'Impresi', 'Artikel terbit', 'Terindeks Google']) await expect(page.getByRole('region', { name: nama })).toBeVisible()
    for (const nama of ['Kalender konten per pilar', 'Klik per pekan', 'Status indeks', 'Terbit terbaru', 'Kesehatan situs', 'Perlu perhatian']) {
      await expect(page.getByRole('region', { name: nama })).toBeVisible()
    }
    await expect(page.getByRole('img', { name: /^Klik per pekan, / })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Tulis artikel' })).toHaveAttribute('href', '/admin/collections/artikel/create')
    await expect(page.getByRole('navigation', { name: 'Periode angka Google' }).getByRole('link', { name: '7 hari' })).toHaveAttribute('aria-current', 'true')
    await periksaAxe(page, '.redaksi', '.nav')
    await tutup()
  })
}

test('beranda admin: periode 28 hari, menu Ringkasan, dan baris Perlu perhatian membuka daftar tersaring', async ({ browser }) => {
  const { page, tutup } = await bukaAdmin(browser, ADMIN_E2E)
  await page.goto('/admin?periode=28')
  await expect(page.getByRole('navigation', { name: 'Periode angka Google' }).getByRole('link', { name: '28 hari' })).toHaveAttribute('aria-current', 'true')
  await expect(page.getByRole('region', { name: 'Klik dari Google' })).toContainText('28 hari')
  await expect(page.getByRole('link', { name: 'Beranda admin', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('link', { name: 'point. Ruang redaksi' })).toHaveAttribute('href', '/admin')
  await expect(page.getByRole('link', { name: 'Dashboard SEO', exact: true })).toHaveAttribute('href', '/admin/seo')
  const perhatian = page.getByRole('region', { name: 'Perlu perhatian' })
  await expect(perhatian.locator('ol > li')).toHaveCount(5)
  await perhatian.getByRole('link', { name: /Pesan masuk belum dibaca/ }).click()
  await expect(page).toHaveURL(/\/admin\/collections\/pesan-masuk\?where%5Bstatus%5D%5Bequals%5D=baru|\/admin\/collections\/pesan-masuk\?where\[status\]\[equals\]=baru/)
  await tutup()
})

test('beranda admin untuk editor: bagian konten saja, tanpa data Google, kode sematan, dan pelanggan newsletter', async ({ browser, page: p }) => {
  const email = `editor-${Date.now()}@point.lat`
  const password = 'editor-e2e-rahasia-panjang'
  await p.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  expect((await p.request.post('/api/pengguna', { data: { email, password, nama: 'Editor Redaksi', peran: 'editor' } })).status()).toBe(201)
  const { page, tutup } = await bukaAdmin(browser, { email, password })
  await page.goto('/admin')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/, Editor$/)
  for (const nama of ['Artikel terbit', 'Draf', 'Terjadwal', 'Pesan baru']) await expect(page.getByRole('region', { name: nama })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Klik dari Google' })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Kesehatan situs' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Dashboard SEO' })).toHaveCount(0)
  await expect(page.locator('#nav-global-kode-sematan')).toHaveCount(0)
  await expect(page.locator('#nav-pelanggan-newsletter')).toHaveCount(0)
  await expect(page.locator('#nav-pesan-masuk')).toHaveCount(1)
  await periksaAxe(page, '.redaksi')
  await tutup()
})

test('halaman Fitur: ringkasan fitur lain dan saklar fitur situs; Pelanggan newsletter punya tombol Unduh CSV', async ({ browser }) => {
  const { page, tutup } = await bukaAdmin(browser, ADMIN_E2E)
  await page.goto('/admin/globals/fitur')
  const ringkas = page.getByRole('region', { name: 'Diatur di halaman lain' })
  for (const nama of ['Iklan', 'Asisten AI', 'Mesin Indexing', 'Kode sematan']) await expect(ringkas.getByRole('link', { name: new RegExp(`^${nama}`) })).toBeVisible()
  for (const label of ['Form kontak', 'Newsletter', 'Tombol bagikan', 'Daftar isi artikel', 'Waktu baca']) await expect(page.getByLabel(label, { exact: true })).toBeVisible()
  await periksaAxe(page, '.fitur-ringkas')
  await page.goto('/admin/collections/pelanggan-newsletter')
  await expect(page.getByRole('link', { name: 'Unduh CSV' })).toHaveAttribute('href', '/api/pelanggan-newsletter/csv')
  await tutup()
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`beranda admin ${lebar}px tanpa geser horizontal`, async ({ browser }) => {
    const { page, tutup } = await bukaAdmin(browser, ADMIN_E2E, 'light', lebar)
    await page.setViewportSize({ width: lebar, height: tinggi })
    await page.goto('/admin')
    await expect(page.getByRole('region', { name: 'Perlu perhatian' })).toBeVisible()
    await periksaTanpaGeserHorizontal(page)
    await tutup()
  })
}
