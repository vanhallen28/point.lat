import { expect, test } from '@playwright/test'

import { cegatCloudinary, cegatIklan, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { PAGINASI_E2E, UKURAN_LAYAR } from './data'

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

const SUB = `/${PAGINASI_E2E.pilar}/${PAGINASI_E2E.sub}`

/**
 * Tujuan redirect dari header `Location`. Next 16.3.3 mengirim header ini dua kali (nilainya sama) pada render
 * ISR pertama sebuah redirect; respons dari cache berikutnya hanya sekali.
 */
const tujuan = (lokasi: string | undefined) => [...new Set((lokasi ?? '').split(', '))]

test('rubrik subkategori tiga halaman: navigasi halaman, judul, canonical, remah roti, dan setiap tulisan tampil sekali', async ({ page }) => {
  const dilihat: string[] = []
  // Kartu saja: navigasi halaman juga ada di dalam bagian tulisan.
  const kartu = page.getByRole('region', { name: /^Tulisan (terbaru|lebih lama)$/ }).locator('ul').first().getByRole('link')
  const nav = page.getByRole('navigation', { name: 'Halaman tulisan' })

  await page.goto(SUB)
  await expect(page).toHaveTitle(`${PAGINASI_E2E.namaSub} · point.`)
  await expect(page.getByRole('heading', { level: 2, name: 'Tulisan terbaru' })).toBeVisible()
  await expect(kartu).toHaveCount(24)
  dilihat.push(...(await kartu.evaluateAll((a) => a.map((el) => el.getAttribute('href') ?? ''))))
  await expect(nav).toContainText('Halaman 1 dari 3')
  await expect(nav.getByRole('link', { name: 'Halaman 1', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Sebelumnya' })).toHaveCount(0)

  await nav.getByRole('link', { name: 'Berikutnya' }).click()
  await expect(page).toHaveURL(`${SUB}/halaman/2`)
  await expect(page).toHaveTitle(`${PAGINASI_E2E.namaSub}, halaman 2 · point.`)
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://point.lat${SUB}/halaman/2`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(PAGINASI_E2E.namaSub)
  await expect(page.getByRole('heading', { level: 2, name: 'Tulisan lebih lama' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Remah roti' }).getByRole('listitem').last()).toHaveText('Halaman 2')
  await expect(nav.getByRole('link', { name: 'Halaman 2', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(nav.getByRole('link', { name: 'Sebelumnya' })).toHaveAttribute('href', SUB)
  await expect(kartu).toHaveCount(24)
  dilihat.push(...(await kartu.evaluateAll((a) => a.map((el) => el.getAttribute('href') ?? ''))))

  await nav.getByRole('link', { name: 'Halaman 3', exact: true }).click()
  await expect(page).toHaveURL(`${SUB}/halaman/3`)
  await expect(nav).toContainText('Halaman 3 dari 3')
  await expect(nav.getByRole('link', { name: 'Berikutnya' })).toHaveCount(0)
  await expect(kartu).toHaveCount(2)
  dilihat.push(...(await kartu.evaluateAll((a) => a.map((el) => el.getAttribute('href') ?? ''))))
  expect(new Set(dilihat).size).toBe(PAGINASI_E2E.jumlah)
  // Tulisan tertua (terbit paling awal) ada di halaman terakhir.
  expect(dilihat.at(-1)).toBe('/latihan-soal-penalaran-umum-01')
})

test('halaman 1 dialihkan permanen ke alamat rubrik; nomor di luar jangkauan atau tidak sah menjawab 404; sitemap hanya halaman 1', async ({ request }) => {
  for (const [dari, ke] of [
    [`/${PAGINASI_E2E.pilar}/halaman/1`, `/${PAGINASI_E2E.pilar}`],
    [`${SUB}/halaman/1`, SUB],
  ]) {
    const jawaban = await request.get(dari, { maxRedirects: 0 })
    expect(jawaban.status(), dari).toBe(308)
    expect(tujuan(jawaban.headers()['location'])).toEqual([ke])
  }
  expect((await request.get(`/${PAGINASI_E2E.pilar}/halaman/3`)).status()).toBe(200)
  for (const path of [`/${PAGINASI_E2E.pilar}/halaman/4`, `${SUB}/halaman/4`, `${SUB}/halaman/02`, `${SUB}/halaman/0`, '/uang-karier/halaman/2', `/${PAGINASI_E2E.pilar}/halaman`, '/halaman/2']) {
    expect((await request.get(path)).status(), path).toBe(404)
  }
  const sitemap = await (await request.get('/sitemap/pilar.xml')).text()
  expect(sitemap).toContain(`<loc>https://point.lat/${PAGINASI_E2E.pilar}</loc>`)
  expect(sitemap).not.toContain('/halaman/')
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`rubrik berhalaman ${lebar}px: halaman pertama, tengah, dan terakhir tanpa geser horizontal dan lolos axe, tautan setinggi target sentuh`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    for (const path of [SUB, `${SUB}/halaman/2`, `/${PAGINASI_E2E.pilar}/halaman/3`]) {
      await page.goto(path)
      const tautan = page.getByRole('navigation', { name: 'Halaman tulisan' }).getByRole('link')
      await expect(tautan.first()).toBeVisible()
      for (const kotak of await tautan.evaluateAll((a) => a.map((el) => el.getBoundingClientRect().toJSON() as DOMRect))) {
        expect(kotak.height, path).toBeGreaterThanOrEqual(44)
        expect(kotak.width, path).toBeGreaterThanOrEqual(44)
      }
      await periksaTanpaGeserHorizontal(page)
      await periksaAxe(page)
    }
  })
}

test('profil penulis berhalaman: profil lengkap di halaman 1, halaman berikutnya hanya daftar tulisan; /halaman/1 dialihkan, di luar jangkauan 404', async ({ page, request }) => {
  await page.goto('/penulis/redaksi')
  const nav = page.getByRole('navigation', { name: 'Halaman tulisan' })
  await expect(nav).toContainText('Halaman 1 dari 3')
  await expect(page.getByRole('list', { name: 'Keahlian' })).toBeVisible()
  await nav.getByRole('link', { name: 'Berikutnya' }).click()
  await expect(page).toHaveURL('/penulis/redaksi/halaman/2')
  await expect(page).toHaveTitle('Redaksi point., halaman 2 · point.')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://point.lat/penulis/redaksi/halaman/2')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Redaksi point.')
  await expect(page.getByRole('list', { name: 'Keahlian' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Halaman 2', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('region', { name: 'Tulisan Redaksi point.' }).locator('ul').first().getByRole('link')).toHaveCount(24)
  expect(await page.locator('script[type="application/ld+json"]').textContent()).not.toContain('ProfilePage')

  const jawaban = await request.get('/penulis/redaksi/halaman/1', { maxRedirects: 0 })
  expect(jawaban.status()).toBe(308)
  expect(tujuan(jawaban.headers()['location'])).toEqual(['/penulis/redaksi'])
  for (const path of ['/penulis/redaksi/halaman/4', '/penulis/redaksi/halaman/01', '/penulis/tidak-ada/halaman/2']) {
    expect((await request.get(path)).status(), path).toBe(404)
  }
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`profil penulis halaman 2 dan 3 ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    for (const path of ['/penulis/redaksi/halaman/2', '/penulis/redaksi/halaman/3']) {
      await page.goto(path)
      await expect(page.getByRole('navigation', { name: 'Halaman tulisan' })).toBeVisible()
      await periksaTanpaGeserHorizontal(page)
      await periksaAxe(page)
    }
  })
}

test('rubrik halaman tengah dengan iklan terisi di 375 px: slot setelah navigasi halaman, lolos axe, tanpa geser horizontal', async ({ page }) => {
  await page.context().addCookies([{ name: 'persetujuan', value: `1.semua.${new Date().toISOString().slice(0, 10)}`, domain: 'localhost', path: '/' }])
  await cegatIklan(page)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`${SUB}/halaman/2`)
  const slot = page.locator('[data-slot-iklan="rubrik"]')
  await slot.scrollIntoViewIfNeeded()
  await expect(slot.locator('ins[data-ad-status="filled"]')).toBeAttached()
  const nav = (await page.getByRole('navigation', { name: 'Halaman tulisan' }).boundingBox())!
  expect((await slot.boundingBox())!.y).toBeGreaterThan(nav.y + nav.height)
  await periksaTanpaGeserHorizontal(page)
  await periksaAxe(page)
})
