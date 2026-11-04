import { expect, test } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { SLUG_HALAMAN, UKURAN_LAYAR } from './data'

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

test('halaman Tentang dari page builder: hero, teks, kartu, CTA, dan FAQ', async ({ page }) => {
  await page.goto(`/${SLUG_HALAMAN.tentang}`)
  await expect(page).toHaveTitle('Tentang · point.')
  await expect(page.getByRole('navigation', { name: 'Remah roti' }).getByRole('link')).toHaveText(['Beranda'])
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Intinya dulu, lalu bisa kamu hitung sendiri')
  await expect(page.getByRole('heading', { level: 2, name: 'Siapa kami' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Prinsip kami' }).getByRole('heading', { level: 3 })).toHaveText(['Lugas', 'Cermat', 'Akrab'])
  await expect(page.getByRole('link', { name: 'Baca kebijakan redaksi' })).toHaveAttribute('href', `/${SLUG_HALAMAN.kebijakanRedaksi}`)
  const faq = page.getByRole('region', { name: 'Tanya jawab' })
  await faq.getByText('Apakah point. menerima tulisan tamu?').click()
  await expect(faq.getByText('Belum. Semua tulisan ditulis dan diperiksa redaksi.')).toBeVisible()
})

test('jarak antarblok halaman statis tetap 40 px, termasuk blok teks yang dibuka subjudul', async ({ page }) => {
  for (const lebar of [375, 1440]) {
    await page.setViewportSize({ width: lebar, height: 900 })
    await page.goto(`/${SLUG_HALAMAN.tentang}`)
    const deck = await page.getByText('point. menjelaskan uang, karier').boundingBox()
    const subjudul = await page.getByRole('heading', { level: 2, name: 'Siapa kami' }).boundingBox()
    expect(Math.round(subjudul!.y - (deck!.y + deck!.height)), `${lebar}px`).toBe(40)
  }
})

test('halaman tanpa hero memakai judulnya sebagai H1, terbuka dari footer; halaman draf 404', async ({ page, request }) => {
  await page.goto('/')
  await page.getByRole('contentinfo').getByRole('link', { name: 'Kebijakan Redaksi' }).click()
  await expect(page).toHaveURL(`/${SLUG_HALAMAN.kebijakanRedaksi}`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kebijakan Redaksi')
  await expect(page.getByRole('heading', { level: 2, name: 'Sumber dan koreksi' })).toBeVisible()
  expect((await request.get(`/${SLUG_HALAMAN.draf}`)).status()).toBe(404)
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`halaman statis ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    for (const slug of [SLUG_HALAMAN.tentang, SLUG_HALAMAN.kebijakanRedaksi]) {
      await page.goto(`/${slug}`)
      await periksaTanpaGeserHorizontal(page)
      await periksaAxe(page)
    }
  })
}
