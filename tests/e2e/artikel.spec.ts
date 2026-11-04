import { expect, test } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { JUDUL_PANDUAN, SLUG, UKURAN_LAYAR } from './data'

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

test('artikel panduan: urutan bagian sesuai spesifikasi §4', async ({ page }) => {
  await page.goto(`/${SLUG.panduan}`)
  const remah = page.getByRole('navigation', { name: 'Remah roti' })
  await expect(remah.getByRole('link')).toHaveText(['Beranda', 'Uang & Karier'])
  await expect(remah.locator('[aria-current="page"]')).toHaveText(JUDUL_PANDUAN)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(JUDUL_PANDUAN)
  await expect(page.getByText('Panduan', { exact: true })).toBeVisible()
  await expect(page.getByText(/^Diperbarui \d{1,2} \w+ 20\d\d$/)).toBeVisible()
  await expect(page.getByText('1 menit baca')).toBeVisible()

  const intinya = page.getByRole('region', { name: 'Intinya' })
  await expect(intinya.getByRole('listitem')).toHaveCount(3)

  const daftarIsi = page.getByRole('navigation', { name: 'Daftar isi' })
  await expect(daftarIsi.getByRole('link')).toHaveText(['Komponen potongan gaji', 'Cara menghitung PPh 21 dengan TER', 'Contoh hitung'])

  await expect(page.getByRole('note').filter({ hasText: 'Tips' })).toContainText('Siapkan slip gaji')
  await expect(page.getByRole('region', { name: 'Status PTKP dan kategori TER' }).getByRole('rowheader')).toHaveText(['TK/0', 'K/1', 'K/3'])
  await expect(page.getByRole('link', { name: 'artikel tentang TER' })).toHaveAttribute('href', `/${SLUG.explainer}`)
  await expect(page.getByRole('note').filter({ hasText: 'Catatan' })).toContainText('bukan saran keuangan')

  const sumber = page.getByRole('region', { name: 'Sumber' })
  await expect(sumber.getByRole('link')).toHaveText(['Direktorat Jenderal Pajak', 'BPJS Ketenagakerjaan'])
  await expect(sumber).toContainText('DJP, diakses 1 November 2026')

  const faq = page.getByRole('region', { name: 'Pertanyaan yang sering muncul' })
  await faq.getByText('Apakah THR ikut dipotong PPh 21?').click()
  await expect(faq.getByText(/THR menambah penghasilan bruto/)).toBeVisible()

  await expect(page.getByRole('region', { name: 'Baca juga' }).getByRole('link')).toHaveAttribute('href', `/${SLUG.explainer}`)
  const penulis = page.getByRole('region', { name: 'Tentang penulis' })
  await expect(penulis.getByRole('link', { name: 'Redaksi point.' })).toHaveAttribute('href', '/penulis/redaksi')
})

test('daftar isi melompat ke subjudul', async ({ page }) => {
  await page.goto(`/${SLUG.panduan}`)
  await page.getByRole('navigation', { name: 'Daftar isi' }).getByRole('link', { name: 'Contoh hitung' }).click()
  await expect(page).toHaveURL(/#contoh-hitung$/)
  await expect(page.getByRole('heading', { level: 2, name: 'Contoh hitung' })).toBeInViewport()
})

test('metadata, canonical, robots, dan JSON-LD dari modul SEO', async ({ page }) => {
  await page.goto(`/${SLUG.panduan}`)
  await expect(page).toHaveTitle(`${JUDUL_PANDUAN} · point.`)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://point.lat/${SLUG.panduan}`)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index, follow, max-image-preview:large')
  const graf = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}')
  expect(graf['@graph'].map((n: { '@type': string }) => n['@type'])).toEqual(['Organization', 'WebSite', 'Article', 'BreadcrumbList'])
})

test('gambar utama dari Cloudinary dengan ukuran tetap', async ({ page }) => {
  await page.goto(`/${SLUG.panduan}`)
  const gambar = page.getByRole('img', { name: 'Slip gaji karyawan' }).first()
  await expect(gambar).toHaveAttribute('src', /^https:\/\/res\.cloudinary\.com\/e2e\/image\/upload\/c_fill,g_auto,ar_16:9\//)
  await expect(gambar).toHaveAttribute('width', '1440')
  await expect(gambar).toHaveAttribute('height', '810')
})

test('artikel pilar Sehat menampilkan disclaimer pilarnya', async ({ page }) => {
  await page.goto(`/${SLUG.sehat}`)
  await expect(page.getByRole('note').filter({ hasText: 'Catatan' })).toContainText('bukan pengganti diagnosis')
})

test('draf dan path yang tidak ada menjawab 404', async ({ request }) => {
  for (const path of [`/${SLUG.draf}`, '/tidak/ada/sama-sekali', '/favicon.ico']) {
    expect((await request.get(path)).status(), path).toBe(404)
  }
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`artikel ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    await page.goto(`/${SLUG.panduan}`)
    await periksaTanpaGeserHorizontal(page)
    await periksaAxe(page)
  })
}
