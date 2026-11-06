import { expect, test } from '@playwright/test'

import { periksaAxe } from './bantu'
import { ADMIN_E2E, ADS_TXT_E2E, PENERBIT_E2E } from './data'

test('admin global Iklan: petunjuk terbaca dan pratinjau ads.txt mengikuti isian sebelum disimpan', async ({ page }) => {
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  await page.goto('/admin/globals/iklan')
  await expect(page.locator('.iklan-petunjuk')).toContainText('Iklan hanya dimuat untuk pengunjung yang memilih Izinkan semua di banner cookie.')
  const pratinjau = page.getByRole('region', { name: 'Isi /ads.txt setelah disimpan' }).locator('pre')
  const idPenerbit = page.getByLabel('ID penerbit AdSense (ca-pub-...)')
  await expect(idPenerbit).toHaveValue(PENERBIT_E2E)
  await expect(pratinjau).toContainText('google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0')
  await expect(pratinjau).toContainText(ADS_TXT_E2E)

  await idPenerbit.fill('')
  await expect(pratinjau).not.toContainText('google.com')
  await page.getByLabel('Baris ads.txt tambahan').fill('')
  await expect(page.getByRole('region', { name: 'Isi /ads.txt setelah disimpan' })).toContainText('Belum ada baris, jadi /ads.txt menjawab 404.')
  await periksaAxe(page, '.iklan-petunjuk', '.iklan-adstxt')
})
