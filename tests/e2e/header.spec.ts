import { expect, test, type Page } from '@playwright/test'

import { HEADER_KEAMANAN } from '@/lib/header-keamanan'

import { cegatCloudinary, cegatIklan } from './bantu'
import { ADMIN_E2E, SLUG, SLUG_SUB, TOOLS_CONTOH } from './data'

/** Setiap header keamanan ada dengan nilai yang sama, dan teknologi situs tidak diumumkan (`X-Powered-By`). */
function periksaHeader(header: Record<string, string>, path: string) {
  for (const { key, value } of HEADER_KEAMANAN) expect(header[key.toLowerCase()], `${path} ${key}`).toBe(value)
  expect(header['x-powered-by'], path).toBeUndefined()
}

/** Pesan konsol browser tentang Content Security Policy (permintaan atau bingkai yang ditolak). */
function catatPelanggaranCsp(page: Page): string[] {
  const pesan: string[] = []
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) pesan.push(m.text())
  })
  return pesan
}

test('header keamanan di halaman publik, rute teknis, API, admin, dan 404; halaman publik tetap statis', async ({ request }) => {
  const statis = ['/', `/${SLUG.panduan}`, `/uang-karier/${SLUG_SUB.pajak}`, `/tools/${TOOLS_CONTOH[0].slug}`]
  for (const path of statis) {
    for (let kunjungan = 0; kunjungan < 2; kunjungan++) {
      const jawaban = await request.get(path)
      expect(jawaban.status(), path).toBe(200)
      periksaHeader(jawaban.headers(), path)
      // ISR: dilayani dari cache dengan s-maxage, bukan dirender per permintaan.
      expect(jawaban.headers()['cache-control'], path).toMatch(/s-maxage=\d+/)
    }
  }
  for (const [path, status] of [
    ['/robots.txt', 200],
    ['/sitemap.xml', 200],
    ['/api/pengguna/me', 200],
    ['/admin/login', 200],
    ['/tidak-ada-di-situs-ini', 404],
  ] as const) {
    const jawaban = await request.get(path)
    expect(jawaban.status(), path).toBe(status)
    periksaHeader(jawaban.headers(), path)
  }
})

test('CSP tidak menahan apa pun: artikel dengan banner, iklan setelah Izinkan semua, dan admin', async ({ page }) => {
  const pelanggaran = catatPelanggaranCsp(page)
  await cegatCloudinary(page)
  await cegatIklan(page)
  await page.goto(`/${SLUG.panduan}`)
  await page.getByRole('region', { name: 'Cookie dan iklan' }).getByRole('button', { name: 'Izinkan semua' }).click()
  const akhir = page.locator('[data-slot-iklan="artikel-akhir"]')
  await akhir.scrollIntoViewIfNeeded()
  await expect(akhir.locator('ins.adsbygoogle')).toHaveAttribute('data-ad-status', 'filled')

  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  await page.goto('/admin/collections/artikel')
  await expect(page.locator('.nav')).toHaveClass(/nav--nav-hydrated/)
  await expect(page.getByRole('link', { name: 'Buat Artikel baru' })).toBeVisible()
  expect(pelanggaran).toEqual([])
})

test('situs hanya bisa dibingkai situs sendiri: asal lain ditolak frame-ancestors', async ({ page, baseURL }) => {
  const pelanggaran = catatPelanggaranCsp(page)
  const bingkai = (asal: string) => `<!doctype html><title>bingkai</title><iframe title="artikel" src="${asal}/${SLUG.panduan}"></iframe>`

  await page.goto('/robots.txt')
  await page.setContent(bingkai(baseURL!))
  await expect(page.frameLocator('iframe').locator('h1')).toBeVisible()
  expect(pelanggaran).toEqual([])

  // Server yang sama lewat 127.0.0.1 adalah asal (origin) lain bagi localhost.
  await page.goto(`${baseURL!.replace('localhost', '127.0.0.1')}/robots.txt`)
  await page.setContent(bingkai(baseURL!))
  await expect.poll(() => pelanggaran.some((p) => p.includes("frame-ancestors 'self'"))).toBe(true)
  await expect(page.frameLocator('iframe').locator('h1')).toHaveCount(0)
})
