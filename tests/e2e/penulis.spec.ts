import { expect, test } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { SLUG, UKURAN_LAYAR } from './data'

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

test('byline artikel membuka profil penulis dengan keahlian, tautan, dan tulisannya', async ({ page }) => {
  await page.goto(`/${SLUG.panduan}`)
  await page.getByRole('article').locator('header').getByRole('link', { name: 'Redaksi point.' }).click()
  await expect(page).toHaveURL('/penulis/redaksi')
  await expect(page).toHaveTitle('Redaksi point. · point.')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Redaksi point.')
  await expect(page.getByRole('list', { name: 'Keahlian' }).getByRole('listitem')).toHaveText(['Pajak penghasilan', 'Gizi'])
  await expect(page.getByRole('link', { name: 'Instagram' })).toHaveAttribute('rel', 'me noopener')
  const tulisan = page.getByRole('region', { name: 'Tulisan Redaksi point.' })
  await expect(tulisan.getByRole('link', { name: /Cara hitung gaji bersih/ })).toHaveAttribute('href', `/${SLUG.panduan}`)
  await expect(tulisan.getByRole('link', { name: /^PTKP/ })).toHaveCount(0)
})

test('penulis yang tidak ada menjawab 404', async ({ request }) => {
  expect((await request.get('/penulis/tidak-ada')).status()).toBe(404)
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`profil penulis ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    await page.goto('/penulis/redaksi')
    await periksaTanpaGeserHorizontal(page)
    await periksaAxe(page)
  })
}
