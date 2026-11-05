import { expect, test, type Page } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { TOOLS_CONTOH, UKURAN_LAYAR } from './data'

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

const hasil = (page: Page) => page.getByRole('region', { name: /Contoh hasil|Hasil hitunganmu/ })

/** Angka utama hasil (paragraf yang ukurannya diatur `--panjang`), bukan angka yang sama di rincian. */
const angkaUtama = (page: Page) => hasil(page).locator('p[style*="--panjang"]')

/** Lebar teks angka utama (bukan lebar elemennya) dibanding lebar kotak hasil, dan jumlah barisnya. */
async function ukurAngka(page: Page) {
  return page.evaluate(() => {
    const angka = document.querySelector('section[aria-labelledby="kalkulator-hasil"] p[style*="--panjang"]') as HTMLElement
    const jangkauan = document.createRange()
    jangkauan.selectNodeContents(angka)
    return {
      teks: jangkauan.getBoundingClientRect().width,
      kotak: angka.getBoundingClientRect().width,
      baris: jangkauan.getClientRects().length,
    }
  })
}

test('kartu di /tools membuka kalkulator: judul, hasil contoh dari server, penjelasan, sumber, dan JSON-LD', async ({ page }) => {
  await page.goto('/tools')
  await page.getByRole('link', { name: /Hitung Gaji Bersih/ }).click()
  await expect(page).toHaveURL('/tools/gaji-bersih')
  await expect(page).toHaveTitle('Kalkulator Gaji Bersih 2026 dengan PPh 21 TER dan BPJS')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Kalkulator Gaji Bersih')
  await expect(page.getByRole('navigation', { name: 'Remah roti' }).getByRole('link')).toHaveText(['Beranda', 'Tools'])
  await expect(page.getByRole('textbox', { name: 'Gaji pokok dan tunjangan tetap per bulan dalam rupiah' })).toHaveValue('8.000.000')
  await expect(page.getByRole('radio', { name: 'TK/0: tidak kawin, tanpa tanggungan' })).toBeChecked()
  await expect(hasil(page).getByRole('heading', { level: 2 })).toHaveText('Contoh hasil')
  await expect(angkaUtama(page)).toHaveText('Rp\u00a07.554.552')
  await expect(page.getByRole('heading', { level: 2, name: 'Rumus gaji bersih' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Angka aturan yang dipakai' }).getByText('Rp\u00a011.086.300')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Sumber' }).getByRole('link').first()).toHaveAttribute('href', /pajak\.go\.id/)
  const jsonLd = await page.locator('script[type="application/ld+json"]').textContent()
  expect(JSON.parse(jsonLd ?? '{}')['@graph'].map((n: { '@type': string }) => n['@type'])).toContain('WebApplication')
})

test('keenam kalkulator terbit dengan hasil contoh dari server', async ({ page }) => {
  for (const tool of TOOLS_CONTOH) {
    const respons = await page.goto(`/tools/${tool.slug}`)
    expect(respons?.status(), tool.slug).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Kalkulator ${tool.nama}`)
    await expect(angkaUtama(page)).toHaveText(tool.utama)
  }
  expect((await page.goto('/tools/kalkulator-yang-tidak-ada'))?.status()).toBe(404)
})

test('tanpa JavaScript: form dan hasil contoh tetap tampil, dengan pesan bahwa kalkulator butuh JavaScript', async ({ browser }) => {
  const konteks = await browser.newContext({ javaScriptEnabled: false })
  const page = await konteks.newPage()
  await cegatCloudinary(page)
  await page.goto('/tools/ipk')
  await expect(page.getByRole('group', { name: 'Mata kuliah semester ini' }).getByRole('listitem')).toHaveCount(5)
  await expect(angkaUtama(page)).toHaveText('3,56')
  // Playwright mematikan JavaScript lewat emulasi, jadi isi <noscript> tidak digambar; cukup pastikan pesannya ada di HTML.
  expect(await page.content()).toContain('Kalkulator ini butuh JavaScript untuk menghitung angkamu.')
  await konteks.close()
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`kalkulator ${lebar}px: tanpa geser horizontal, tombol satu baris, angka hasil muat, jarak bagian 40 px, lolos axe`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    for (const tool of TOOLS_CONTOH) {
      await page.goto(`/tools/${tool.slug}`)
      await periksaTanpaGeserHorizontal(page)
      const tombol = page.getByRole('button', { name: /^Hitung / })
      expect((await tombol.boundingBox())!.height, tool.slug).toBeLessThanOrEqual(56)
      const angka = await ukurAngka(page)
      expect(angka.baris, tool.slug).toBe(1)
      expect(angka.teks, tool.slug).toBeLessThanOrEqual(angka.kotak)
      const form = (await page.locator('form#kalkulator').boundingBox())!
      const kotakHasil = (await hasil(page).boundingBox())!
      // Mulai 1024 px form dan hasil berdampingan; di bawahnya hasil tepat di bawah form.
      if (lebar >= 1024) expect(kotakHasil.x, tool.slug).toBeGreaterThan(form.x + form.width)
      else expect(Math.round(kotakHasil.y - (form.y + form.height)), tool.slug).toBe(16)
      const jarak = await page.evaluate(() => {
        const bagian = [...document.querySelectorAll('main article > :not(script)')].map((el) => el.getBoundingClientRect())
        return bagian.slice(1).map((b, i) => Math.round(b.top - bagian[i].bottom))
      })
      expect(jarak, tool.slug).toEqual([40, 40])
      await periksaAxe(page)
    }
  })
}
