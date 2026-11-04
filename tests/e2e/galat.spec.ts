import { expect, test, type APIRequestContext } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { ADMIN_E2E, SLUG, UKURAN_LAYAR } from './data'

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

/**
 * Tujuan redirect dari header `Location`. Next 16.3.3 mengirim header ini dua kali (nilainya sama)
 * pada render ISR pertama sebuah redirect; respons dari cache berikutnya hanya sekali. Browser
 * menerima keduanya, jadi tes memeriksa nilainya saja.
 */
function tujuan(lokasi: string | undefined): string[] {
  return [...new Set((lokasi ?? '').split(', '))]
}

test('slug lama mengarah permanen ke slug baru', async ({ page, request }) => {
  const jawaban = await request.get(`/${SLUG.danaDaruratLama}`, { maxRedirects: 0 })
  expect(jawaban.status()).toBe(308)
  expect(tujuan(jawaban.headers()['location'])).toEqual([`/${SLUG.danaDarurat}`])
  await page.goto(`/${SLUG.danaDaruratLama}`)
  await expect(page).toHaveURL(`/${SLUG.danaDarurat}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Cara menyiapkan dana darurat')
})

test('redirect manual dari CMS, termasuk di bawah /glosarium; kode 410 menjawab 404', async ({ request }) => {
  for (const [dari, ke] of [
    ['/promo-lama', '/glosarium'],
    ['/glosarium/ptkp-lama', '/glosarium/ptkp'],
  ]) {
    const jawaban = await request.get(dari, { maxRedirects: 0 })
    expect(jawaban.status(), dari).toBe(308)
    expect(tujuan(jawaban.headers()['location'])).toEqual([ke])
  }
  expect((await request.get('/tulisan-dihapus', { maxRedirects: 0 })).status()).toBe(404)
})

async function jumlahLog(request: APIRequestContext, path: string): Promise<number> {
  const masuk = await request.post('/api/pengguna/login', { data: ADMIN_E2E })
  const { token } = await masuk.json()
  const log = await request.get(`/api/log-404?where[path][equals]=${encodeURIComponent(path)}`, {
    headers: { Authorization: `JWT ${token}` },
  })
  return (await log.json()).docs[0]?.jumlah ?? 0
}

test('halaman 404: judul, jalan kembali, tulisan terbaru, dan setiap kunjungan tercatat', async ({ page, request }) => {
  const path = `/jalan-buntu-${Date.now()}`
  for (let i = 0; i < 2; i++) {
    const beacon = page.waitForRequest((r) => r.url().endsWith('/api/log-404/catat') && r.method() === 'POST')
    const jawaban = await page.goto(path)
    expect(jawaban?.status()).toBe(404)
    expect((await beacon).postDataJSON()).toMatchObject({ path })
  }
  await expect(page).toHaveTitle('Halaman tidak ditemukan · point.')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Halaman ini tidak ada.')
  await expect(page.getByRole('link', { name: 'Kembali ke beranda' })).toHaveAttribute('href', '/')
  await expect(page.getByRole('region', { name: 'Tulisan terbaru' }).getByRole('link')).toHaveCount(3)
  await expect.poll(() => jumlahLog(request, path)).toBe(2)
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`halaman 404 ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    await page.goto('/halaman-yang-tidak-ada')
    // Next 16.3.3 mengirim `notFound()` sebagai cangkang `<html id="__next_error__">` lalu merender
    // halaman 404 di browser; tunggu layout point. (lang id) terpasang sebelum diperiksa.
    await expect(page.locator('html')).toHaveAttribute('lang', 'id')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await periksaTanpaGeserHorizontal(page)
    await periksaAxe(page)
  })
}
