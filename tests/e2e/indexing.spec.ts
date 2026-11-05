import { expect, test } from '@playwright/test'

import { periksaAxe } from './bantu'
import { ADMIN_E2E, JUDUL_PANDUAN, KUNCI_INDEXNOW } from './data'

test('file kunci IndexNow di /{kunci}.txt berisi kunci dari pengaturan SEO; kunci lain 404', async ({ request }) => {
  const jawaban = await request.get(`/${KUNCI_INDEXNOW}.txt`)
  expect(jawaban.status()).toBe(200)
  expect(jawaban.headers()['content-type']).toBe('text/plain; charset=utf-8')
  expect(await jawaban.text()).toBe(KUNCI_INDEXNOW)

  expect((await request.get('/kunci-yang-salah-2026.txt')).status()).toBe(404)
  expect((await request.get('/robots.txt')).status()).toBe(200)
})

test('admin: status pemasangan, peringatan Indexing API, dan kolom status indeks di daftar artikel', async ({ page }) => {
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  await page.goto('/admin/globals/pengaturan-seo')
  const pemasangan = page.getByRole('region', { name: 'Status pemasangan Mesin Indexing' })
  await expect(pemasangan).toContainText('Palsu: tidak ada yang dikirim ke luar.')
  await expect(pemasangan).toContainText(`Kunci tersimpan dan dilayani di /${KUNCI_INDEXNOW}.txt.`)
  const peringatan = page.getByRole('note', { name: 'Indexing API bukan untuk artikel' })
  await expect(peringatan.getByRole('link', { name: 'Baca ketentuan Indexing API' })).toHaveAttribute(
    'href',
    'https://developers.google.com/search/apis/indexing-api/v3/using-api',
  )
  await expect(page.getByRole('checkbox', { name: 'Kabari Google lewat Indexing API' })).not.toBeChecked()
  await periksaAxe(page, '.indexing-pemasangan', '.indexing-peringatan')

  // Tab dari isian sebelumnya sampai tautan ketentuan: cincin fokus terlihat (CSS admin Payload menghapusnya).
  await page.getByLabel('Batas cek status per hari').focus()
  await page.keyboard.press('Tab')
  const tautan = peringatan.getByRole('link', { name: 'Baca ketentuan Indexing API' })
  await expect(tautan).toBeFocused()
  expect(await tautan.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid')

  await page.goto('/admin/collections/artikel')
  await expect(page.getByRole('columnheader', { name: 'Status indeks' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: JUDUL_PANDUAN })).toContainText('Belum dicek')
})
