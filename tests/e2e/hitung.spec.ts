import { expect, test, type Page } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

const hasil = (page: Page) => page.getByRole('region', { name: /Contoh hasil|Hasil hitunganmu/ })
const angkaUtama = (page: Page) => hasil(page).locator('p[style*="--panjang"]')
const ringkasan = (page: Page, label: string) => hasil(page).locator('dl > div').filter({ has: page.getByText(label, { exact: true }) }).locator('dd')
const gaji = (page: Page) => page.getByRole('textbox', { name: 'Gaji pokok dan tunjangan tetap per bulan dalam rupiah' })

test('kalkulator gaji menghasilkan angka contoh resmi DJP (K/0, gaji Rp15.000.000, iuran pensiun Rp150.000)', async ({ page }) => {
  await page.goto('/tools/gaji-bersih')
  await gaji(page).fill('15.000.000')
  await page.getByRole('radio', { name: 'K/0: kawin, tanpa tanggungan' }).check()
  await page.getByText('Atur tunjangan, BPJS, dan iuran lain').click()
  await page.getByRole('checkbox', { name: 'Ikut BPJS Kesehatan lewat kantor' }).uncheck()
  await page.getByRole('checkbox', { name: 'Ikut BPJS Ketenagakerjaan lewat kantor' }).uncheck()
  await page.getByRole('textbox', { name: 'Iuran pensiun lain atau zakat lewat kantor per bulan dalam rupiah' }).fill('150.000')
  await page.getByRole('button', { name: 'Hitung gaji bersih' }).click()

  await expect(hasil(page).getByRole('heading', { level: 2 })).toHaveText('Hasil hitunganmu')
  await expect(ringkasan(page, 'PPh 21 per bulan (TER 6%)')).toHaveText('Rp\u00a0900.000')
  await expect(ringkasan(page, 'PPh 21 setahun')).toHaveText('Rp\u00a011.055.000')
  await expect(angkaUtama(page)).toHaveText('Rp\u00a013.950.000')
  await hasil(page).getByText('Lihat rincian hitungan').click()
  await expect(hasil(page).locator('dl > div').filter({ has: page.getByText('PPh 21 Desember', { exact: true }) }).locator('dd')).toHaveText('Rp\u00a01.155.000')
  await expect(page.getByRole('status')).toHaveText(
    'Gaji bersih per bulan Rp\u00a013.950.000. Januari sampai November, setelah PPh 21 dan iuran.',
  )
})

test('galat di bawah isian, fokus ke isian pertama yang salah, rupiah dirapikan saat ditinggalkan', async ({ page }) => {
  await page.goto('/tools/gaji-bersih')
  await gaji(page).fill('')
  await page.getByRole('button', { name: 'Hitung gaji bersih' }).click()
  await expect(gaji(page)).toBeFocused()
  await expect(gaji(page)).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#kalkulator-gaji-galat')).toHaveText('Gaji pokok dan tunjangan tetap per bulan belum diisi. Tulis angkanya, misalnya 8.000.000.')
  await expect(hasil(page).getByRole('heading', { level: 2 })).toHaveText('Contoh hasil')
  await expect(page.getByRole('status')).toHaveText('Periksa 1 isian yang ditandai.')

  await gaji(page).fill('12500000')
  await gaji(page).press('Tab')
  await expect(gaji(page)).toHaveValue('12.500.000')
  await expect(gaji(page)).not.toHaveAttribute('aria-invalid')
  await expect(page.locator('#kalkulator-gaji-galat')).toHaveText('')

  // Isian yang salah di dalam bagian tertutup: bagiannya dibuka dan isiannya mendapat fokus.
  await page.getByText('Atur tunjangan, BPJS, dan iuran lain').click()
  const tunjangan = page.getByRole('textbox', { name: 'Tunjangan tidak tetap per bulan dalam rupiah' })
  await tunjangan.fill('satu juta')
  await page.getByText('Atur tunjangan, BPJS, dan iuran lain').click()
  await gaji(page).press('Enter')
  await expect(tunjangan).toBeFocused()
  await expect(page.locator('#kalkulator-tunjanganLain-galat')).toHaveText('Tulis tunjangan tidak tetap per bulan dengan angka saja, misalnya 0.')
})

test('IPK: tambah dan hapus mata kuliah dengan fokus yang tepat, lalu hitung', async ({ page }) => {
  await page.goto('/tools/ipk')
  const daftar = page.getByRole('group', { name: 'Mata kuliah semester ini' }).getByRole('listitem')
  await page.getByRole('button', { name: 'Tambah mata kuliah' }).click()
  await expect(daftar).toHaveCount(6)
  const sksBaru = page.getByRole('textbox', { name: 'Mata kuliah 6 SKS' })
  await expect(sksBaru).toBeFocused()
  await sksBaru.fill('4')
  await page.getByRole('combobox', { name: 'Mata kuliah 6 Nilai huruf' }).selectOption('A')
  await page.getByRole('button', { name: 'Hapus mata kuliah 1' }).click()
  await expect(daftar).toHaveCount(5)
  await expect(page.getByRole('button', { name: 'Tambah mata kuliah' })).toBeFocused()
  await page.getByRole('button', { name: 'Hitung IPK' }).click()
  // (3 x 3,3 + 2 x 3,7 + 3 x 3 + 2 x 4 + 4 x 4) / 14 = 50,3 / 14 = 3,59
  await expect(angkaUtama(page)).toHaveText('3,59')
  await expect(page.getByRole('status')).toHaveText('IPK 3,59. Dari 14 SKS yang kamu isi.')

  await page.getByRole('textbox', { name: 'Mata kuliah 2 SKS' }).fill('')
  await page.getByRole('button', { name: 'Hitung IPK' }).click()
  await expect(page.getByRole('textbox', { name: 'Mata kuliah 2 SKS' })).toBeFocused()
  await expect(daftar.nth(1)).toContainText('SKS mata kuliah 2 belum diisi. Tulis angkanya, misalnya 3.')
})

test('angka panjang: gaji Rp10.000.000.000 tetap satu baris dan muat di layar 375 px', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/tools/gaji-bersih')
  await gaji(page).fill('10.000.000.000')
  await page.getByRole('button', { name: 'Hitung gaji bersih' }).click()
  await expect(angkaUtama(page)).toHaveText(/^Rp\u00a06\.\d{3}\.\d{3}\.\d{3}$/)
  const ukuran = await angkaUtama(page).evaluate((el) => {
    const jangkauan = document.createRange()
    jangkauan.selectNodeContents(el)
    return { teks: jangkauan.getBoundingClientRect().width, kotak: el.getBoundingClientRect().width, baris: jangkauan.getClientRects().length }
  })
  expect(ukuran.baris).toBe(1)
  expect(ukuran.teks).toBeLessThanOrEqual(ukuran.kotak)
  await periksaTanpaGeserHorizontal(page)
  // Hasil digulir ke layar karena di HP letaknya di bawah form.
  await expect(hasil(page)).toBeInViewport()
  await periksaAxe(page)
})

test('hasil baru tidak menggeser form dan kotak hasil di desktop', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/tools/cicilan-kpr')
  // Diukur dari puncak halaman: klik tombol menggulir halaman, dan kotak hasil menempel (sticky) saat digulir.
  const posisi = () =>
    page.evaluate(() => {
      window.scrollTo(0, 0)
      return ['form#kalkulator', 'section[aria-labelledby="kalkulator-hasil"]'].map((s) => {
        const k = document.querySelector(s)!.getBoundingClientRect()
        return [k.left, k.top, k.width]
      })
    })
  const sebelum = await posisi()
  await page.getByRole('textbox', { name: 'Bunga per tahun dalam persen' }).fill('11')
  await page.getByRole('button', { name: 'Hitung cicilan' }).click()
  await expect(hasil(page).getByRole('heading', { level: 2 })).toHaveText('Hasil hitunganmu')
  expect(await posisi()).toEqual(sebelum)
})

test('angka hasil baru muncul dengan animasi CSS, dan diam saat reduced motion', async ({ browser }) => {
  for (const [gerak, nama] of [
    ['no-preference', 'muncul'],
    ['reduce', 'none'],
  ] as const) {
    const konteks = await browser.newContext({ reducedMotion: gerak })
    const page = await konteks.newPage()
    await cegatCloudinary(page)
    await page.goto('/tools/bmi-kalori')
    await expect(angkaUtama(page)).toHaveCSS('animation-name', 'none')
    await page.getByRole('textbox', { name: 'Berat badan dalam kilogram' }).fill('70')
    await page.getByRole('button', { name: 'Hitung IMT dan kalori' }).click()
    await expect(angkaUtama(page)).toHaveText('25,7')
    await expect(angkaUtama(page)).toHaveCSS('animation-name', new RegExp(nama))
    await konteks.close()
  }
})
