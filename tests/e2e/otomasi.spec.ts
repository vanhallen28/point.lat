import { expect, test } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { ADMIN_E2E, USULAN_E2E } from './data'

/**
 * Kartu Otomasi artikel di beranda admin (spesifikasi §27). Setujui dan tolak memakai endpoint sungguhan (hanya
 * mengubah status usulan contoh); Tulis 1 draf ditiru supaya database E2E tidak mendapat artikel baru.
 */
test('kartu otomasi artikel: usulan menunggu, setujui, tolak, tulis draf, pengaturan, dan axe', async ({ browser }) => {
  const konteks = await browser.newContext({ viewport: { width: 1512, height: 1000 } })
  const page = await konteks.newPage()
  await cegatCloudinary(page)
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  await page.goto('/admin')

  const kartu = page.getByRole('region', { name: 'Otomasi artikel' })
  await expect(kartu).toBeVisible()
  await expect(kartu.getByRole('link', { name: 'Mati' })).toHaveAttribute('href', '/admin/globals/otomasi-artikel')
  const usulan = kartu.getByRole('region', { name: /^Usulan menunggu/ })
  for (const u of USULAN_E2E) await expect(usulan).toContainText(u.judul)
  for (const nama of [/^Draf menunggu review/, /^Antrean terbit/]) await expect(kartu.getByRole('region', { name: nama })).toBeVisible()
  await expect(kartu.getByRole('link', { name: 'Tambah topik sendiri' })).toHaveAttribute('href', '/admin/collections/usulan-topik/create')
  await periksaAxe(page, '.otomasi')

  await usulan.getByRole('button', { name: `Setujui ${USULAN_E2E[0].judul}` }).click()
  await expect(usulan).not.toContainText(USULAN_E2E[0].judul)
  await expect(kartu.getByRole('region', { name: /^Draf menunggu review/ })).toContainText('1 topik antre ditulis')
  await usulan.getByRole('button', { name: `Tolak ${USULAN_E2E[1].judul}` }).click()
  await expect(usulan).toContainText('Belum ada usulan.')

  let tulis = 0
  await page.route('**/api/usulan-topik/aksi', async (route) => {
    tulis++
    await route.fulfill({ status: 200, json: { status: 'selesai', pesan: 'Draf ditulis.' } })
  })
  await kartu.getByRole('button', { name: 'Tulis 1 draf sekarang' }).click()
  await expect.poll(() => tulis).toBe(1)

  await page.goto('/admin/globals/otomasi-artikel')
  for (const label of ['Nyalakan otomasi', 'Antre terbit otomatis setelah review']) await expect(page.getByLabel(label, { exact: true })).toBeVisible()
  // Isian wajib berlabel dengan tanda bintang, jadi dicari lewat peran dan awal namanya.
  for (const nama of [/^Draf per hari/, /^Usulan sekali minta/]) await expect(page.getByRole('spinbutton', { name: nama })).toBeVisible()
  await konteks.close()
})

test('kartu otomasi artikel 375px tanpa geser horizontal', async ({ browser }) => {
  const konteks = await browser.newContext({ viewport: { width: 375, height: 900 } })
  const page = await konteks.newPage()
  await cegatCloudinary(page)
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  await page.goto('/admin')
  await expect(page.getByRole('region', { name: 'Otomasi artikel' })).toBeVisible()
  await periksaTanpaGeserHorizontal(page)
  await konteks.close()
})
