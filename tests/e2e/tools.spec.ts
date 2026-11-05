import { expect, test } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { UKURAN_LAYAR } from './data'

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

test('tombol Tools di header membuka indeks kalkulator per pilar', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('banner').getByRole('link', { name: 'Tools' }).click()
  await expect(page).toHaveURL('/tools')
  await expect(page).toHaveTitle('Tools · point.')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tools')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Uang & Karier', 'Belajar', 'Sehat'])
  await expect(page.getByRole('heading', { level: 3 })).toHaveText(['Cicilan & KPR', 'Dana Darurat', 'Gaji Bersih', 'THR', 'IPK', 'BMI & Kalori'])
  await expect(page.getByRole('link', { name: /Hitung Gaji Bersih/ })).toHaveAttribute('href', '/tools/gaji-bersih')
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`indeks tools ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    await page.goto('/tools')
    await periksaTanpaGeserHorizontal(page)
    await periksaAxe(page)
  })
}
