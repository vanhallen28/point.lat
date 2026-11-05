import { expect, test, type Page } from '@playwright/test'

import { periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { ADMIN_E2E } from './data'

/**
 * Draf buatan tes di file ini, dihapus setelah setiap tes supaya daftar artikel admin di spec lain (kolom status indeks di
 * `indexing.spec.ts`) tetap berisi contoh E2E saja. `overrideLock`: draf masih terkunci untuk pengguna yang membukanya.
 */
const drafTes: number[] = []

test.afterEach(async ({ page }) => {
  await page.goto('about:blank')
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  for (const id of drafTes.splice(0)) expect((await page.request.delete(`/api/artikel/${id}?overrideLock=true`)).status()).toBe(200)
})

/** Draf artikel baru lewat REST (hanya judul; draf tidak divalidasi). */
async function drafBaru(page: Page, data: Record<string, unknown> = {}): Promise<number> {
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  const jawaban = await page.request.post('/api/artikel?draft=true', { data: { judul: `Draf asisten ${Date.now()}`, _status: 'draft', ...data } })
  expect(jawaban.status()).toBe(201)
  const id = ((await jawaban.json()) as { doc: { id: number } }).doc.id
  drafTes.push(id)
  return id
}

test('artikel yang memakai draf AI: tombol terbit nonaktif sampai ketiga butir review dicentang', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const id = await drafBaru(page, { pakaiDrafAi: true })
  await page.goto(`/admin/collections/artikel/${id}`)
  const terbit = page.locator('#action-save')
  await expect(terbit).toBeDisabled()
  await periksaTanpaGeserHorizontal(page)
  await expect(terbit).toHaveAccessibleName('Publish changes. Artikel ini memakai draf AI. Centang ketiga butir Review sebelum terbit di sidebar dulu.')
  await expect(page.getByRole('checkbox', { name: 'Memakai draf AI' })).toBeDisabled()
  // Payload baru merender isi grup saat grup terlihat di layar (RenderIfInViewport).
  await page.locator('#field-reviewAi').scrollIntoViewIfNeeded()
  await expect(page.locator('#petunjuk-review-ai p')).toHaveText(
    'Artikel ini memakai draf AI. Centang ketiga butir di bawah setelah kamu memeriksanya; tombol terbit aktif setelah semuanya dicentang.',
  )
  await expect(page.locator('#petunjuk-review-ai li')).toHaveCount(3)
  await periksaAxe(page, '.field-description-pakaiDrafAi', '#field-reviewAi')

  for (const label of ['Sumber sudah dicek', 'Angka sudah dicek']) await page.getByRole('checkbox', { name: label, exact: true }).check()
  await expect(terbit).toBeDisabled()
  await page.getByRole('checkbox', { name: 'Insight atau pengalaman penulis sudah ditambahkan', exact: true }).check()
  await expect(terbit).toBeEnabled()
  await expect(terbit).toHaveAccessibleName('Publish changes')
})

test('artikel tanpa draf AI: checklist review tidak tampil dan tombol terbit aktif', async ({ page }) => {
  const id = await drafBaru(page)
  await page.goto(`/admin/collections/artikel/${id}`)
  await expect(page.locator('#action-save')).toBeEnabled()
  await expect(page.getByRole('checkbox', { name: 'Sumber sudah dicek', exact: true })).toHaveCount(0)
  await periksaAxe(page, '.field-description-pakaiDrafAi')
})
