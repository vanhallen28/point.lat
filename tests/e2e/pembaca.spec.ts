import { expect, test } from '@playwright/test'

import { cegatCloudinary, periksaAxe } from './bantu'
import { ADMIN_E2E, SLUG, SLUG_HALAMAN } from './data'

const KONTAK = `/${SLUG_HALAMAN.kontak}`

test('form kontak dengan JavaScript: terkirim, diumumkan, dan masuk ke Pesan masuk di admin', async ({ page }) => {
  await cegatCloudinary(page)
  await page.goto(KONTAK)
  const form = page.getByRole('form', { name: 'Kirim pesan' })
  const nama = `Pembaca E2E ${Date.now()}`
  await form.getByLabel('Nama', { exact: true }).fill(nama)
  await form.getByLabel('Email', { exact: true }).fill('pembaca-e2e@contoh.com')
  await form.getByLabel('Topik', { exact: true }).selectOption('koreksi')
  await form.getByLabel('Pesan', { exact: true }).fill('Angka PTKP di paragraf kedua sepertinya keliru, mohon dicek.')
  await form.getByRole('checkbox', { name: /Saya setuju nama, email, dan pesan/ }).check()
  await periksaAxe(page, 'main')
  await form.getByRole('button', { name: 'Kirim pesan' }).click()
  await expect(form.getByRole('status')).toHaveText('Pesanmu sudah kami terima. Terima kasih.')
  await expect(form.getByLabel('Nama', { exact: true })).toHaveValue('')

  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  await page.goto(`/admin/collections/pesan-masuk?where[nama][equals]=${encodeURIComponent(nama)}`)
  await expect(page.getByRole('link', { name: nama })).toBeVisible()
  await expect(page.locator('#nav-pesan-masuk')).toBeVisible()
})

test('form kontak: isian yang ditolak server ditandai dan diumumkan', async ({ page }) => {
  await page.goto(KONTAK)
  const form = page.getByRole('form', { name: 'Kirim pesan' })
  // Lewati validasi browser supaya pemeriksaan server yang diuji.
  await form.evaluate((f: HTMLFormElement) => (f.noValidate = true))
  await form.getByLabel('Nama', { exact: true }).fill('Budi')
  await form.getByLabel('Email', { exact: true }).fill('bukan-email')
  await form.getByRole('button', { name: 'Kirim pesan' }).click()
  await expect(form.getByRole('status')).toContainText('Periksa lagi isianmu.')
  await expect(form.getByRole('status')).toContainText('Tulis alamat email yang benar')
  await expect(form.getByLabel('Email', { exact: true })).toHaveAttribute('aria-invalid', 'true')
  await expect(form.getByLabel('Email', { exact: true })).toBeFocused()
})

test('form kontak dan berhenti langganan tanpa JavaScript: kembali ke halaman dengan pesan hasil', async ({ browser }) => {
  const konteks = await browser.newContext({ javaScriptEnabled: false })
  const page = await konteks.newPage()
  await cegatCloudinary(page)
  await page.goto(KONTAK)
  await page.fill('input[name=nama]', 'Tanpa JS')
  await page.fill('input[name=email]', 'tanpa-js@contoh.com')
  await page.selectOption('select[name=topik]', 'kerja-sama')
  await page.fill('textarea[name=pesan]', 'Halo, kami ingin bekerja sama untuk konten edukasi pajak.')
  await page.check('input[name=setuju]')
  await page.click('button[type=submit]')
  await expect(page).toHaveURL(`${KONTAK}#pesan-terkirim`)
  await expect(page.locator('#pesan-terkirim')).toBeVisible()
  await expect(page.locator('#pesan-gagal')).toBeHidden()

  await page.goto('/newsletter/berhenti')
  await page.fill('input[name=email]', 'tidak-terdaftar@contoh.com')
  await page.click('button[type=submit]')
  await expect(page).toHaveURL('/newsletter/berhenti#berhenti-berhasil')
  await expect(page.locator('#berhenti-berhasil')).toBeVisible()
  await konteks.close()
})

test('newsletter beranda: mendaftar dengan persetujuan, lalu berhenti langganan', async ({ page }) => {
  await cegatCloudinary(page)
  await page.goto('/')
  const form = page.getByRole('form', { name: 'Daftar newsletter' })
  const email = `pembaca-${Date.now()}@contoh.com`
  await form.getByLabel('Email', { exact: true }).fill(email)
  await form.getByRole('checkbox', { name: /Saya setuju email ini disimpan/ }).check()
  await form.getByRole('button', { name: 'Langganan gratis' }).click()
  await expect(form.getByRole('status')).toHaveText('Kamu sudah terdaftar. Terima kasih.')

  await page.goto('/newsletter/berhenti')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Berhenti langganan newsletter')
  await periksaAxe(page, 'main')
  const berhenti = page.getByRole('form', { name: 'Berhenti langganan newsletter' })
  await berhenti.getByLabel('Email', { exact: true }).fill(email)
  await berhenti.getByRole('button', { name: 'Hapus email saya' }).click()
  await expect(berhenti.getByRole('status')).toHaveText('Email itu sudah tidak ada di daftar newsletter.')
})

test('artikel: tombol bagikan (tautan biasa, tab baru) dan Salin tautan', async ({ browser }) => {
  const konteks = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] })
  const page = await konteks.newPage()
  await cegatCloudinary(page)
  await page.goto(`/${SLUG.panduan}`)
  const bagikan = page.getByRole('region', { name: 'Bagikan tulisan ini' })
  await expect(bagikan.getByRole('link', { name: /^WhatsApp/ })).toHaveAttribute('href', /^https:\/\/wa\.me\/\?text=/)
  await expect(bagikan.getByRole('link', { name: /^Facebook/ })).toHaveAttribute('target', '_blank')
  await expect(bagikan.getByRole('link', { name: /^Facebook/ })).toHaveAttribute('rel', 'noopener noreferrer')
  await bagikan.getByRole('button', { name: 'Salin tautan' }).click()
  await expect(bagikan.getByRole('status')).toHaveText('Tautan disalin.')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(new RegExp(`/${SLUG.panduan}$`))
  await expect(page.getByRole('form', { name: 'Daftar newsletter' })).toBeVisible()
  await periksaAxe(page, 'main')
  await konteks.close()
})
