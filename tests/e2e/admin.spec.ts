import { expect, test } from '@playwright/test'

import { cegatCloudinary } from './bantu'
import { ADMIN_E2E, SLUG } from './data'

/**
 * Admin Payload hanya berbahasa Indonesia (Rencana 8A): browser yang meminta bahasa Inggris tetap mendapat
 * admin berbahasa Indonesia, termasuk editor Lexical yang terjemahannya ditambahkan proyek. Admin juga tidak
 * memanggil layanan luar (tanpa Gravatar).
 */
test('admin berbahasa Indonesia walau browser meminta bahasa Inggris: menu, daftar, tombol terbit, dan editor tanpa kunci mentah', async ({ browser }) => {
  const konteks = await browser.newContext({ locale: 'en-US', extraHTTPHeaders: { 'Accept-Language': 'en-US,en;q=0.9' } })
  const page = await konteks.newPage()
  // Admin tidak memanggil layanan luar: gambar Cloudinary dicegat tes, avatar tanpa Gravatar.
  await cegatCloudinary(page)
  const luar: string[] = []
  page.on('request', (r) => {
    const url = new URL(r.url())
    if (url.hostname !== 'localhost' && url.protocol !== 'data:' && url.hostname !== 'res.cloudinary.com') luar.push(r.url())
  })
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })

  await page.goto('/admin/collections/artikel')
  await expect(page.locator('html')).toHaveAttribute('lang', 'id')
  await expect(page.locator('.nav')).toHaveClass(/nav--nav-hydrated/)
  await expect(page.getByRole('button', { name: /^(Buka|Tutup) Menu$/ })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Buat Artikel baru' })).toBeVisible()
  // Tanggal admin berformat Indonesia (admin.dateFormat), bukan bawaan "November ke-6 2026, 8:21 AM".
  const bulan = 'Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember'
  await expect(page.getByRole('cell', { name: new RegExp(`^\\d{1,2} (${bulan}) \\d{4}, \\d{2}\\.\\d{2}$`) }).first()).toBeVisible()

  const { docs } = await (await page.request.get(`/api/artikel?where[slug][equals]=${SLUG.panduan}&depth=0`)).json()
  await page.goto(`/admin/collections/artikel/${docs[0].id}`)
  // Artikel memakai autosave draf, jadi tombolnya hanya terbit (nonaktif selama belum ada perubahan).
  await expect(page.locator('#action-save')).toHaveText('Publikasikan perubahan')
  await expect(page.getByRole('button', { name: 'Ciutkan Semua' }).first()).toBeVisible()
  await expect(page.locator('.rich-text-lexical').first()).toBeVisible()
  await expect(page.locator('body')).not.toContainText('lexical:')
  expect(luar).toEqual([])
  await konteks.close()
})
