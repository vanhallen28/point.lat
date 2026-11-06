import { expect, test, type BrowserContext, type Page } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { ADMIN_E2E, ADS_TXT_E2E, PENERBIT_E2E, SLUG, UKURAN_LAYAR } from './data'

const DITOLAK = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }
const IKLAN_DIIZINKAN = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'denied' }

/** Pilihan tersimpan seolah dari kunjungan sebelumnya (cookie pihak pertama berversi dan bertanggal). */
async function sudahMemilih(konteks: BrowserContext, pilihan: 'perlu' | 'semua') {
  await konteks.addCookies([{ name: 'persetujuan', value: `1.${pilihan}.${new Date().toISOString().slice(0, 10)}`, domain: 'localhost', path: '/' }])
}

/** Perintah `gtag()` di `dataLayer` (objek `arguments`) sebagai array. */
const dataLayer = (page: Page) => page.evaluate(() => ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? []).map((a) => Array.from(a)))

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

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

test('banner persetujuan tampil sebelum memilih di atas header, dipakai dengan keyboard, dan pilihan tersimpan setelah muat ulang', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`/${SLUG.panduan}`)
  const banner = page.getByRole('region', { name: 'Cookie dan iklan' })
  await expect(banner).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-persetujuan', 'belum')
  expect(await dataLayer(page)).toEqual([['consent', 'default', DITOLAK]])
  expect((await banner.boundingBox())!.y + (await banner.boundingBox())!.height).toBeLessThanOrEqual((await page.getByRole('banner').boundingBox())!.y)
  await expect(banner.getByRole('link', { name: 'Baca Kebijakan Privasi' })).toHaveAttribute('href', '/kebijakan-privasi')
  const [perlu, semua] = [banner.getByRole('button', { name: 'Hanya yang perlu' }), banner.getByRole('button', { name: 'Izinkan semua' })]
  const [kotakPerlu, kotakSemua] = [(await perlu.boundingBox())!, (await semua.boundingBox())!]
  expect(Math.round(kotakPerlu.y)).toBe(Math.round(kotakSemua.y))
  expect(Math.round(kotakPerlu.width)).toBe(Math.round(kotakSemua.width))
  expect(kotakPerlu.height).toBeGreaterThanOrEqual(44)
  await expect(perlu).toHaveCSS('background-color', await semua.evaluate((el) => getComputedStyle(el).backgroundColor))

  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Langsung ke isi' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(banner.getByRole('link', { name: 'Baca Kebijakan Privasi' })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(perlu).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(semua).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(banner).toBeHidden()
  await expect(page.locator('html')).toHaveAttribute('data-persetujuan', 'semua')
  expect((await page.context().cookies()).find((k) => k.name === 'persetujuan')?.value).toMatch(/^1\.semua\.\d{4}-\d{2}-\d{2}$/)
  expect(await dataLayer(page)).toEqual([
    ['consent', 'default', DITOLAK],
    ['consent', 'update', IKLAN_DIIZINKAN],
  ])

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-persetujuan', 'semua')
  await expect(banner).toBeHidden()
  expect(await dataLayer(page)).toEqual([
    ['consent', 'default', DITOLAK],
    ['consent', 'update', IKLAN_DIIZINKAN],
  ])
})

test('Pengaturan cookie di footer membuka banner lagi: fokus pindah, pilihan sekarang disebut, Escape menutup, dan pilihan baru tersimpan', async ({ page }) => {
  await sudahMemilih(page.context(), 'perlu')
  await page.goto('/tentang')
  const banner = page.getByRole('region', { name: 'Cookie dan iklan' })
  await expect(banner).toBeHidden()
  const pengaturan = page.getByRole('contentinfo').getByRole('button', { name: 'Pengaturan cookie' })
  await pengaturan.focus()
  await page.keyboard.press('Enter')
  await expect(banner).toBeVisible()
  await expect(banner).toBeFocused()
  await expect(banner).toContainText('Pilihanmu sekarang: Hanya yang perlu.')
  await page.keyboard.press('Escape')
  await expect(banner).toBeHidden()
  await expect(pengaturan).toBeFocused()
  await expect(page.locator('html')).toHaveAttribute('data-persetujuan', 'perlu')

  await pengaturan.click()
  await banner.getByRole('button', { name: 'Izinkan semua' }).click()
  await expect(banner).toBeHidden()
  await expect(pengaturan).toBeFocused()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-persetujuan', 'semua')
})

test('tanpa JavaScript banner dan tombol Pengaturan cookie tidak tampil (tanpa JavaScript iklan juga tidak dimuat)', async ({ browser }) => {
  const konteks = await browser.newContext({ javaScriptEnabled: false })
  const page = await konteks.newPage()
  await cegatCloudinary(page)
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Cookie dan iklan' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Pengaturan cookie' })).toBeHidden()
  await konteks.close()
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`banner persetujuan ${lebar}px lolos axe, tanpa geser horizontal, tidak menutupi isi, dan kedua pilihan sejajar dan sama lebar`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    await page.goto('/')
    const banner = page.getByRole('region', { name: 'Cookie dan iklan' })
    await expect(banner).toBeVisible()
    await expect(banner).toHaveCSS('position', 'static')
    const perlu = (await banner.getByRole('button', { name: 'Hanya yang perlu' }).boundingBox())!
    const semua = (await banner.getByRole('button', { name: 'Izinkan semua' }).boundingBox())!
    expect([Math.round(perlu.y), Math.round(perlu.width)]).toEqual([Math.round(semua.y), Math.round(semua.width)])
    await periksaTanpaGeserHorizontal(page)
    await periksaAxe(page)
  })
}
