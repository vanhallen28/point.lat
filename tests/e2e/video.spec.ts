import { expect, test } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { SLUG, SLUG_VIDEO, UKURAN_LAYAR } from './data'

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

test('indeks video: kartu 9:16 terbaru dulu, draf tidak tampil', async ({ page }) => {
  await page.goto('/video')
  await expect(page).toHaveTitle('Video · point.')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Video')
  await expect(page.getByRole('heading', { level: 2 })).toHaveText(['Kenapa kode OTP tidak boleh dibagikan', 'PPh 21 dijelaskan dengan satu slip gaji'])
  const kartu = page.getByRole('link', { name: /Kenapa kode OTP/ })
  await expect(kartu).toHaveAttribute('href', `/video/${SLUG_VIDEO.otp}`)
  await expect(kartu).toContainText('38 detik')
  const poster = await kartu.locator('img').boundingBox()
  expect(Math.round((poster!.height / poster!.width) * 9)).toBe(16)
})

test('halaman video: pemutar, transkrip terbuka, penjelasan lengkap, dan video lain', async ({ page, request }) => {
  await page.goto('/video')
  await page.getByRole('link', { name: /PPh 21 dijelaskan dengan satu slip gaji/ }).click()
  await expect(page).toHaveURL(`/video/${SLUG_VIDEO.pph21}`)
  await expect(page.getByRole('navigation', { name: 'Remah roti' }).getByRole('link')).toHaveText(['Beranda', 'Video'])
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('PPh 21 dijelaskan dengan satu slip gaji')
  const pemutar = page.locator('video[aria-label="PPh 21 dijelaskan dengan satu slip gaji"]')
  await expect(pemutar).toHaveAttribute('preload', 'none')
  // Poster tes berukuran 16:9, tetapi ruang pemutar mengikuti rasio file video (9:16).
  const kotak = await pemutar.boundingBox()
  expect(Math.round((kotak!.height / kotak!.width) * 9)).toBe(16)
  await expect(page.getByText('Cari baris PPh 21 di slip gajimu.')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Baca penjelasan lengkap' }).getByRole('link')).toHaveAttribute('href', `/${SLUG.panduan}`)
  await expect(page.getByRole('region', { name: 'Video lain' }).getByRole('link')).toHaveAttribute('href', `/video/${SLUG_VIDEO.otp}`)
  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent()
  expect(jsonLd).toContain('"@type":"VideoObject"')
  expect((await request.get(`/video/${SLUG_VIDEO.draf}`)).status()).toBe(404)
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`video ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    for (const path of ['/video', `/video/${SLUG_VIDEO.pph21}`]) {
      await page.goto(path)
      await periksaTanpaGeserHorizontal(page)
      await periksaAxe(page)
    }
  })
}
