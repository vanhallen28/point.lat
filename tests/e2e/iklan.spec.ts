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

test('/ads.txt dari global Iklan: baris AdSense dan baris tambahan sebagai teks polos, berubah setelah global disimpan', async ({ request }) => {
  const jawaban = await request.get('/ads.txt')
  expect(jawaban.status()).toBe(200)
  expect(jawaban.headers()['content-type']).toBe('text/plain; charset=utf-8')
  expect(await jawaban.text()).toBe(`google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n${ADS_TXT_E2E}\n`)

  await request.post('/api/pengguna/login', { data: ADMIN_E2E })
  try {
    expect((await request.post('/api/globals/iklan', { data: { adsTxtTambahan: `${ADS_TXT_E2E}\ncontact=redaksi@point.lat` } })).status()).toBe(200)
    expect(await (await request.get('/ads.txt')).text()).toContain('\ncontact=redaksi@point.lat\n')
  } finally {
    await request.post('/api/globals/iklan', { data: { adsTxtTambahan: ADS_TXT_E2E } })
  }
})
