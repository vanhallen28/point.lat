import { expect, test } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { SLUG, SLUG_SUB, UKURAN_LAYAR } from './data'

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

test('rubrik pilar: kepala, subkategori, intro, dan tulisan terbaru tanpa glosarium', async ({ page }) => {
  await page.goto('/uang-karier')
  await expect(page).toHaveTitle('Uang & Karier · point.')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Uang & Karier')
  const sub = page.getByRole('navigation', { name: 'Subkategori Uang & Karier' }).getByRole('link')
  await expect(sub).toHaveText(['Semua', 'Pajak'])
  await expect(sub.first()).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('Mulai dari gaji bersih, lalu atur tabungan dan utang.')).toBeVisible()
  const kartu = page.getByRole('region', { name: 'Tulisan terbaru' }).getByRole('link')
  await expect(kartu).toHaveCount(3)
  expect(await kartu.evaluateAll((a) => a.map((el) => el.getAttribute('href')))).toEqual([
    `/${SLUG.danaDarurat}`,
    `/${SLUG.panduan}`,
    `/${SLUG.explainer}`,
  ])
})

test('rubrik subkategori di bawah pilarnya; subkategori di pilar lain menjawab 404', async ({ page, request }) => {
  await page.goto(`/uang-karier/${SLUG_SUB.pajak}`)
  await expect(page).toHaveTitle('Pajak · point.')
  await expect(page.getByRole('navigation', { name: 'Remah roti' }).getByRole('link')).toHaveText(['Beranda', 'Uang & Karier'])
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Pajak')
  await expect(page.getByRole('link', { name: 'Pajak', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('region', { name: 'Tulisan terbaru' }).getByRole('link')).toHaveCount(2)
  for (const path of [`/tekno/${SLUG_SUB.pajak}`, '/uang-karier/tidak-ada', `/uang-karier/${SLUG_SUB.pajak}/lagi`]) {
    expect((await request.get(path)).status(), path).toBe(404)
  }
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`rubrik ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    for (const path of ['/uang-karier', `/uang-karier/${SLUG_SUB.pajak}`, '/tekno']) {
      await page.goto(path)
      await periksaTanpaGeserHorizontal(page)
      await periksaAxe(page)
    }
  })
}
