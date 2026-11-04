import { expect, test } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { SLUG, UKURAN_LAYAR } from './data'

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

test('indeks glosarium: istilah per huruf dengan definisi', async ({ page }) => {
  await page.goto('/glosarium')
  await expect(page).toHaveTitle('Glosarium · point.')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Glosarium')
  await expect(page.getByRole('navigation', { name: 'Huruf' }).getByRole('link')).toHaveText(['B', 'P', 'T'])
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['B', 'P', 'T'])
  await expect(page.getByRole('definition').first()).toHaveText(/^BMI adalah indeks massa tubuh/)
  await page.getByRole('navigation', { name: 'Huruf' }).getByRole('link', { name: 'T' }).click()
  await expect(page).toHaveURL(/#huruf-t$/)
})

test('istilah glosarium di /glosarium/{slug}, tidak di /{slug}', async ({ page, request }) => {
  await page.goto('/glosarium/ptkp')
  await expect(page.getByRole('navigation', { name: 'Remah roti' }).getByRole('link')).toHaveText(['Beranda', 'Glosarium'])
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('PTKP')
  await expect(page.getByText('Glosarium', { exact: true }).first()).toBeVisible()
  // Pilihan editor (panduan) dulu, lalu artikel sepilar terbaru melengkapi.
  await expect(page.getByRole('region', { name: 'Baca juga' }).getByRole('link')).toHaveCount(2)
  await expect(page.getByRole('region', { name: 'Baca juga' }).getByRole('link').first()).toHaveAttribute('href', `/${SLUG.panduan}`)
  expect((await request.get('/ptkp')).status()).toBe(404)
  expect((await request.get(`/glosarium/${SLUG.panduan}`)).status()).toBe(404)
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`glosarium ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    for (const path of ['/glosarium', '/glosarium/ter']) {
      await page.goto(path)
      await periksaTanpaGeserHorizontal(page)
      await periksaAxe(page)
    }
  })
}
