import { expect, test } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { SLUG, UKURAN_LAYAR } from './data'

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

test('cari dari halaman 404: hasil dengan judul cocok di atas, halaman noindex', async ({ page }) => {
  await page.goto('/jalan-buntu-cari')
  await expect(page.locator('html')).toHaveAttribute('lang', 'id')
  await page.getByRole('searchbox', { name: 'Cari topik' }).fill('gaji bersih')
  await page.getByRole('button', { name: 'Cari' }).click()
  await expect(page).toHaveURL('/cari?q=gaji+bersih')
  await expect(page).toHaveTitle('Cari · point.')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
  await expect(page.getByRole('searchbox', { name: 'Cari topik' })).toHaveValue('gaji bersih')
  const hasil = page.getByRole('region', { name: /tulisan untuk “gaji bersih”/ })
  await expect(hasil.getByRole('link').first()).toHaveAttribute('href', `/${SLUG.panduan}`)
})

test('istilah glosarium ikut dicari; tanpa hasil dan tanpa kueri ada petunjuk', async ({ page }) => {
  await page.goto('/cari?q=penghasilan+tidak+kena+pajak')
  await expect(page.getByRole('region', { name: '1 tulisan untuk “penghasilan tidak kena pajak”' }).getByRole('link')).toHaveAttribute('href', '/glosarium/ptkp')
  await page.goto('/cari?q=zzzzzz')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Tidak ada tulisan untuk “zzzzzz”')
  await expect(page.getByText('Coba kata yang lebih umum atau periksa ejaannya.')).toBeVisible()
  await page.goto('/cari')
  await expect(page.getByText('Ketik topik yang ingin kamu pahami')).toBeVisible()
})

test('tombol Cari tetap sebaris dengan kolom isian di layar 375 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  // `/` memakai form besar di hero beranda (padding lebih lebar), `/cari` form biasa.
  for (const path of ['/cari', '/']) {
    await page.goto(path)
    const isian = await page.getByRole('searchbox', { name: 'Cari topik' }).boundingBox()
    const tombol = await page.getByRole('button', { name: 'Cari' }).boundingBox()
    expect(Math.round(tombol!.y + tombol!.height), path).toBe(Math.round(isian!.y + isian!.height))
  }
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`cari ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    for (const path of ['/cari', '/cari?q=gaji']) {
      await page.goto(path)
      await periksaTanpaGeserHorizontal(page)
      await periksaAxe(page)
    }
  })
}
