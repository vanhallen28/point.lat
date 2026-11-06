import { expect, test } from '@playwright/test'

import { periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { ADMIN_E2E, SLUG } from './data'

/**
 * Aksi admin Pantau SEO (Rencana 8B). Nama file berjalan setelah `indexing.spec.ts`: "Cek sekarang" menjalankan
 * antrean Mesin Indexing setelah respons, termasuk kiriman IndexNow yang masih antre, dan jendela kirim 5 menit
 * akan menunda kiriman yang ditunggu `indexing.spec.ts`.
 */

test('daftar Status indeks: "Cek sekarang" mengecek satu halaman lewat antrean, hasilnya tampil, lalu dibatasi 10 menit', async ({ page }) => {
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  const path = `/${SLUG.sehat}`
  const { docs } = await (await page.request.get(`/api/status-indeks?where[path][equals]=${path}&depth=0`)).json()
  const daftar = `/admin/collections/status-indeks?where[path][equals]=${encodeURIComponent(path)}`
  await page.goto(daftar)
  await expect(page.getByRole('columnheader', { name: 'Cek sekarang' })).toBeVisible()
  const baris = page.getByRole('row').filter({ hasText: path })
  const tombol = baris.getByRole('button', { name: `Cek sekarang ${path}` })
  await expect(tombol).toHaveAttribute('aria-disabled', 'false')
  await periksaAxe(page, '.indexing-cek')

  await tombol.click()
  await expect(baris.getByRole('status')).toHaveText('Selesai dicek: Belum dikenal Google.')
  await expect(baris).toContainText('Belum dikenal Google')
  await expect(tombol).toHaveAttribute('aria-disabled', 'true')
  await expect(tombol).toBeFocused()

  // Jeda 10 menit berlaku juga setelah halaman dimuat ulang dan untuk permintaan langsung ke endpoint.
  await page.reload()
  await expect(baris.getByRole('status')).toHaveText(/^Baru saja diminta dicek\. Bisa dicek lagi mulai \d{1,2} \w{3} \d{4}, \d{2}\.\d{2} WIB\.$/)
  await expect(baris.getByRole('button', { name: `Cek sekarang ${path}` })).toHaveAttribute('aria-disabled', 'true')
  const ulang = await page.request.post(`/api/status-indeks/${docs[0].id}/cek`)
  expect(ulang.status()).toBe(429)
  expect((await ulang.json()).alasan).toBe('jeda')
  await periksaAxe(page, '.indexing-cek')

  // Tanpa login: ditolak.
  await page.context().clearCookies()
  expect((await page.request.post(`/api/status-indeks/${docs[0].id}/cek`)).status()).toBe(401)
})

test('dashboard SEO: "Pindai ulang sekarang" memindai tautan setelah respons, hasilnya tampil, lalu dibatasi 10 menit', async ({ page }) => {
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  // Mulai dari keadaan belum pernah dipindai (spec lain bisa sudah menjalankan cron).
  expect((await page.request.delete('/api/tugas-seo?where[jenis][equals]=tautan')).ok()).toBe(true)
  await page.goto('/admin/seo')
  const bagian = page.getByRole('region', { name: 'Tautan rusak' })
  await expect(bagian).toContainText('Pindai tautan: belum pernah berjalan.')
  const tombol = bagian.getByRole('button', { name: 'Pindai ulang sekarang' })
  await expect(tombol).toHaveAttribute('aria-disabled', 'false')
  await periksaAxe(page, '.pantau-aksi')

  await tombol.click()
  await expect(bagian.getByRole('status')).toHaveText(/^Pindai selesai\. \d+ tautan dipindai: /)
  await expect(bagian).toContainText('Pindai tautan: berhasil')
  await expect(tombol).toHaveAttribute('aria-disabled', 'true')
  await expect(tombol).toBeFocused()

  await page.reload()
  await expect(bagian.getByRole('status')).toHaveText(/^Pindai tautan baru saja dijalankan\. Bisa dipindai lagi mulai \d{1,2} \w{3} \d{4}, \d{2}\.\d{2} WIB\.$/)
  const ulang = await page.request.post('/api/tugas-seo/pindai')
  expect(ulang.status()).toBe(429)
  expect((await ulang.json()).alasan).toBe('jeda')
  await periksaAxe(page, '.pantau-aksi')
})

for (const tema of ['light', 'dark'] as const) {
  test(`tombol "Cek sekarang" dan "Pindai ulang sekarang" tema ${tema}: lolos axe dan cincin fokus terlihat, tanpa geser horizontal di 375 px`, async ({ page }) => {
    await page.context().addCookies([{ name: 'payload-theme', value: tema, domain: 'localhost', path: '/' }])
    await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
    await page.goto(`/admin/collections/status-indeks?where[path][equals]=${encodeURIComponent(`/${SLUG.tekno}`)}`)
    const tombol = page.getByRole('button', { name: `Cek sekarang /${SLUG.tekno}` })
    await tombol.focus()
    expect(await tombol.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid')
    await periksaAxe(page, '.indexing-cek')
    await page.setViewportSize({ width: 375, height: 812 })
    await periksaTanpaGeserHorizontal(page)

    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/admin/seo')
    const pindai = page.getByRole('button', { name: /^(Pindai ulang sekarang|Memindai)$/ })
    await pindai.focus()
    expect(await pindai.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid')
    await periksaAxe(page, '.pantau-aksi')
    await page.setViewportSize({ width: 375, height: 812 })
    await periksaTanpaGeserHorizontal(page)
  })
}
