import { expect, test } from '@playwright/test'

import { ADMIN_E2E, SLUG, SLUG_HALAMAN } from './data'

/*
 * Penjaga Kebijakan Privasi (keputusan pemilik Rencana 8A): tanpa halaman itu terbit, banner, skrip awal, dan
 * slot iklan tidak dirender. Spec terpisah dari `iklan.spec.ts` dan sengaja berjalan setelah `indexing.spec.ts`
 * (urutan nama file): membatalkan dan menerbitkan halaman memicu kiriman IndexNow, dan jendela kirim IndexNow
 * 5 menit akan menunda kiriman yang ditunggu `indexing.spec.ts`.
 */

test('Kebijakan Privasi ditarik dari terbit: banner, skrip awal, dan slot iklan berhenti tampil; terbit lagi, banner kembali', async ({ page, request }) => {
  await request.post('/api/pengguna/login', { data: ADMIN_E2E })
  const { docs } = await (await request.get(`/api/halaman?where[slug][equals]=${SLUG_HALAMAN.kebijakanPrivasi}&depth=0`)).json()
  const banner = page.getByRole('region', { name: 'Cookie dan iklan' })
  try {
    expect((await request.patch(`/api/halaman/${docs[0].id}`, { data: { _status: 'draft' } })).status()).toBe(200)
    await expect(async () => {
      await page.goto(`/${SLUG.panduan}`)
      await expect(banner).toHaveCount(0)
    }).toPass()
    await expect(page.locator('html')).not.toHaveAttribute('data-persetujuan')
    await expect(page.locator('[data-slot-iklan]')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Pengaturan cookie' })).toHaveCount(0)
  } finally {
    expect((await request.patch(`/api/halaman/${docs[0].id}`, { data: { _status: 'published' } })).status()).toBe(200)
  }
  await expect(async () => {
    await page.goto(`/${SLUG.panduan}`)
    await expect(banner).toBeVisible()
  }).toPass()
})
