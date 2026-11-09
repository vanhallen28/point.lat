import { expect, test } from '@playwright/test'

import { cegatCloudinary, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { POPULER, SLUG_VIDEO, UKURAN_LAYAR } from './data'

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

test('hero: judul raksasa, kalimat pembuka, dan pencarian besar ke /cari', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', /\/feed\.xml$/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Intinya dulu.')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('text-transform', 'uppercase')
  await expect(page.getByText('Dijelaskan dari intinya, lalu bisa langsung kamu hitung.')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Cari topik' }).fill('thr')
  await page.getByRole('button', { name: 'Cari' }).click()
  await expect(page).toHaveURL('/cari?q=thr')
})

test('mozaik pilihan redaksi: kartu besar dulu, kotak Hitung sendiri dengan tools terbit', async ({ page }) => {
  await page.goto('/')
  const mozaik = page.getByRole('region', { name: 'Pilihan redaksi' })
  await expect(mozaik.getByRole('heading', { level: 2 })).toHaveText([
    'Cara hitung gaji bersih setelah PPh 21 dan BPJS',
    'Jadwal SNBT 2027 dan apa yang berubah',
    'Butuh tidur berapa jam? Beda per usia',
    'Cara mengenali penipuan yang memakai suara AI',
    'Hitung sendiri',
  ])
  const besar = await mozaik.getByRole('link', { name: /Cara hitung gaji bersih/ }).boundingBox()
  const kecil = await mozaik.getByRole('link', { name: /Jadwal SNBT/ }).boundingBox()
  expect(besar!.height).toBeGreaterThan(kecil!.height)
  await expect(mozaik.getByRole('list').getByRole('link')).toHaveText(['Cicilan & KPR', 'Dana Darurat', 'Gaji Bersih', 'THR', 'IPK', 'BMI & Kalori'])
  await expect(mozaik.getByRole('link', { name: 'Semua tools' })).toHaveAttribute('href', '/tools')
})

test('mozaik di tablet 768 px: kartu samping berdampingan, kotak Hitung sendiri sebaris dengan kartu keempat', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/')
  const mozaik = page.getByRole('region', { name: 'Pilihan redaksi' })
  const kotak = async (nama: RegExp) => (await mozaik.getByRole('link', { name: nama }).boundingBox())!
  expect(Math.round((await kotak(/Jadwal SNBT/)).y)).toBe(Math.round((await kotak(/Butuh tidur/)).y))
  const tekno = await kotak(/penipuan yang memakai suara AI/)
  const tools = (await mozaik.getByRole('heading', { name: 'Hitung sendiri' }).boundingBox())!.y
  expect(tools).toBeGreaterThan(tekno.y)
  expect(tools).toBeLessThan(tekno.y + tekno.height)
})

test('strip video gelap, paling dibaca pekan ini dari klik Google, dan form newsletter point.', async ({ page }) => {
  await page.goto('/')
  const strip = page.getByRole('region', { name: 'Intinya dalam 45 detik' })
  await expect(strip).toHaveCSS('background-color', 'rgb(17, 17, 17)')
  await expect(strip.getByRole('listitem').getByRole('link')).toHaveCount(2)
  await expect(strip.getByRole('link', { name: /PPh 21 dijelaskan/ })).toHaveAttribute('href', `/video/${SLUG_VIDEO.pph21}`)
  await expect(strip.getByRole('link', { name: 'Semua video' })).toHaveAttribute('href', '/video')

  const populer = page.getByRole('region', { name: 'Paling dicari pekan ini' })
  await expect(populer.getByRole('link')).toHaveCount(4)
  expect(await populer.getByRole('link').evaluateAll((a) => a.map((el) => el.getAttribute('href')))).toEqual(POPULER.map((slug) => `/${slug}`))
  await expect(page.getByRole('region', { name: 'Tulisan terbaru' })).toHaveCount(0)

  const newsletter = page.getByRole('complementary', { name: 'Newsletter' })
  await expect(newsletter.getByRole('heading', { level: 2 })).toHaveText('Intinya, tiap Senin.')
  const form = newsletter.getByRole('form', { name: 'Daftar newsletter' })
  await expect(form.getByLabel('Email', { exact: true })).toHaveAttribute('type', 'email')
  await expect(form.getByRole('checkbox', { name: /Saya setuju email ini disimpan/ })).toBeVisible()
  await expect(form.getByRole('link', { name: 'berhenti kapan saja' })).toHaveAttribute('href', '/newsletter/berhenti')
  await expect(form.getByRole('button', { name: 'Langganan gratis' })).toBeVisible()
})

test('jarak antarbagian beranda tetap, tanpa celah kosong, di 375 dan 1440 px', async ({ page }) => {
  for (const lebar of [375, 1440]) {
    await page.setViewportSize({ width: lebar, height: 900 })
    await page.goto('/')
    const kotak = async (nama: string) => (await page.getByRole('region', { name: nama }).boundingBox())!
    const hero = await kotak('Intinya dulu.')
    const mozaik = await kotak('Pilihan redaksi')
    const strip = await kotak('Intinya dalam 45 detik')
    const populer = await kotak('Paling dicari pekan ini')
    const jarak = [mozaik.y - (hero.y + hero.height), strip.y - (mozaik.y + mozaik.height), populer.y - (strip.y + strip.height)]
    expect(jarak.map(Math.round), `${lebar}px`).toEqual([32, 56, 56])
    // Strip kalkulator dan baris rubrik memakai jarak antarbagian yang sama (slot iklan tidak menempati ruang tanpa persetujuan).
    const newsletter = (await page.getByRole('complementary', { name: 'Newsletter' }).boundingBox())!
    const pita = await kotak('Kalkulator point.')
    const rubrikPertama = await kotak('Uang & Karier')
    expect(Math.round(pita.y - Math.max(populer.y + populer.height, newsletter.y + newsletter.height)), `${lebar}px`).toBe(56)
    expect(Math.round(rubrikPertama.y - (pita.y + pita.height)), `${lebar}px`).toBe(56)
  }
})

test('strip kalkulator dan baris rubrik: kalkulator terbit per pilar, satu baris per pilar tanpa mengulang mozaik', async ({ page }) => {
  await page.goto('/')
  const pita = page.getByRole('region', { name: 'Kalkulator point.' })
  await expect(pita).toHaveCSS('background-color', 'rgb(244, 241, 236)')
  await expect(pita.getByText('Rumus dan sumber aturannya ada di setiap kalkulator.')).toBeVisible()
  await expect(pita.getByRole('listitem')).toHaveCount(6)
  await expect(pita.getByRole('link', { name: /Gaji Bersih/ })).toHaveAttribute('href', '/tools/gaji-bersih')
  await expect(pita.getByRole('link', { name: 'Semua kalkulator' })).toHaveAttribute('href', '/tools')

  const uang = page.getByRole('region', { name: 'Uang & Karier', exact: true })
  await expect(uang.getByRole('link', { name: 'Semua tulisan Uang & Karier' })).toHaveAttribute('href', '/uang-karier')
  const kartu = uang.getByRole('listitem')
  expect(await kartu.count()).toBeGreaterThan(0)
  expect(await kartu.count()).toBeLessThanOrEqual(3)
  // Berita utama mozaik tidak muncul lagi di baris rubriknya.
  await expect(uang.getByRole('link', { name: /Cara hitung gaji bersih/ })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Belajar', exact: true }).getByRole('link', { name: 'Semua tulisan Belajar' })).toHaveAttribute('href', '/belajar')
})

test('kartu artikel bergambar: gambar 16:9, tanggal terbit, dan penulis; kartu ringkas di Paling dicari', async ({ page }) => {
  await page.goto('/')
  const mozaik = page.getByRole('region', { name: 'Pilihan redaksi' })
  const utama = mozaik.getByRole('link', { name: /Cara hitung gaji bersih/ })
  await expect(utama.locator('time')).toHaveText(/^\d{1,2} \w+ 20\d\d$/)
  const media = utama.locator('img').first()
  const kotak = (await media.boundingBox())!
  expect(Math.abs(kotak.width / kotak.height - 16 / 9)).toBeLessThan(0.05)
  const populer = page.getByRole('region', { name: 'Paling dicari pekan ini' })
  await expect(populer.getByRole('list')).toHaveJSProperty('tagName', 'OL')
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`beranda ${lebar}px tanpa geser horizontal dan lolos axe`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    await page.goto('/')
    await periksaTanpaGeserHorizontal(page)
    await periksaAxe(page)
  })
}
