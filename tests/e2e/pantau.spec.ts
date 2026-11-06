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
  // `exact`: tautan "Keluar" di menu admin juga berlabel diawali "Ke".
  await page.getByLabel('Ke', { exact: true }).fill('/tentang')
  await page.getByRole('button', { name: 'Simpan' }).click()
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
  // ke bawah. Tombol Buka Menu baru diklik setelah keadaan itu tetap, supaya klik tidak hilang sebelum hidrasi.
  const nav = page.locator('.nav')
  await expect(nav).toHaveClass(/nav--nav-hydrated/)
  if (!(await nav.getAttribute('class'))?.includes('nav--nav-open')) await page.getByRole('button', { name: 'Buka Menu' }).click()
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

test('halaman awal admin punya kartu Dashboard SEO yang membuka /admin/seo', async ({ page }) => {
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  await page.goto('/admin')
  const kartu = page.getByRole('region', { name: 'Dashboard SEO' })
  await expect(kartu).toContainText('Klik dari Google, status indeks, tautan rusak, dan 404 teratas')
  await periksaAxe(page, '.pantau-kartu')
  await kartu.getByRole('link', { name: 'Buka dashboard' }).click()
  await expect(page).toHaveURL(/\/admin\/seo$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard SEO')
})

// Paling banyak dua kolom: baris dua kartu (Status indeks + Log, Halaman yatim + 404) selalu terisi penuh,
// tanpa kolom ketiga kosong di layar lebar (temuan review Rencana 6B).
for (const lebar of [1440, 1920]) {
  test(`dashboard SEO ${lebar}px: kartu berpasangan mengisi lebar penuh`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: 900 })
    await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
    await page.goto('/admin/seo')
    const kotak = async (nama: string) => (await page.getByRole('region', { name: nama }).boundingBox())!
    const google = await kotak('Performa di Google')
    for (const [kiri, kanan] of [['Status indeks', 'Log indexing terbaru'], ['Halaman yatim', '404 teratas']]) {
      const a = await kotak(kiri)
      const b = await kotak(kanan)
      expect(Math.round(a.x)).toBe(Math.round(google.x))
      expect(Math.round(b.x + b.width)).toBe(Math.round(google.x + google.width))
      expect(Math.round(a.y)).toBe(Math.round(b.y))
    }
  })
}

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`dashboard SEO ${lebar}px tanpa geser horizontal`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
    await page.goto('/admin/seo')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Dashboard SEO')
    await periksaTanpaGeserHorizontal(page)
  })
}
