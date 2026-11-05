import { expect, test } from '@playwright/test'

import { ADMIN_E2E } from './data'

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
