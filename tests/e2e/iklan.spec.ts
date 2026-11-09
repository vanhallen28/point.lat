import { expect, test, type BrowserContext, type Page } from '@playwright/test'

import { cegatCloudinary, cegatIklan, periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { ADMIN_E2E, ADS_TXT_E2E, PENERBIT_E2E, SLUG, UKURAN_LAYAR } from './data'

const DITOLAK = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' }
const IKLAN_DIIZINKAN = { ad_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted', analytics_storage: 'denied' }

/** Pilihan tersimpan seolah dari kunjungan sebelumnya (cookie pihak pertama berversi dan bertanggal). */
async function sudahMemilih(konteks: BrowserContext, pilihan: 'perlu' | 'semua') {
  await konteks.addCookies([{ name: 'persetujuan', value: `1.${pilihan}.${new Date().toISOString().slice(0, 10)}`, domain: 'localhost', path: '/' }])
}

/** Menggulir sampai bawah halaman setahap demi setahap, supaya setiap slot sempat hampir terlihat. */
const gulirSampaiBawah = (page: Page) =>
  page.evaluate(async () => {
    for (let y = 0; y <= document.documentElement.scrollHeight; y += 300) {
      window.scrollTo(0, y)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    }
  })

/** Jumlah layout shift sejak halaman dimuat, tanpa pergeseran sesaat setelah klik atau tombol (definisi CLS). */
const cls = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((selesai) => {
        let jumlah = 0
        new PerformanceObserver((daftar) => {
          for (const e of daftar.getEntries() as (PerformanceEntry & { value: number; hadRecentInput: boolean })[]) if (!e.hadRecentInput) jumlah += e.value
        }).observe({ type: 'layout-shift', buffered: true })
        requestAnimationFrame(() => requestAnimationFrame(() => selesai(jumlah)))
      }),
  )

/** Catatan skrip AdSense tiruan: isi `dataLayer` saat skrip dimuat dan jumlah unit yang diisi. */
const iklanTiruan = (page: Page) =>
  page.evaluate(() => (window as unknown as { __iklanTiruan?: { dimuat: number; diisi: number; dataLayer: unknown[] } }).__iklanTiruan ?? null)

/** Perintah `gtag()` di `dataLayer` (objek `arguments`) sebagai array. */
const dataLayer = (page: Page) => page.evaluate(() => ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? []).map((a) => Array.from(a)))

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
  // Setelah Izinkan semua, halaman berslot iklan memuat skrip AdSense: selalu dicegat, tidak pernah ke jaringan.
  // Tes yang memeriksa permintaannya memanggil `cegatIklan` lagi (rute terakhir didahulukan).
  await cegatIklan(page)
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

  // Label baris slot: ID slot dan posisinya, bukan "Slot 01" (Rencana 8B).
  const slot = page.locator('#field-slot')
  await slot.scrollIntoViewIfNeeded()
  await expect(slot.getByText('artikel-tengah · Artikel, tengah isi', { exact: true })).toBeVisible()
  await expect(slot.getByText('beranda-samping · Beranda', { exact: true })).toBeVisible()
  await expect(slot.getByText(/^Slot \d{2}$/)).toHaveCount(0)

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

test('sebelum memilih dan dengan Hanya yang perlu: tanpa permintaan skrip iklan dan slot tidak menempati ruang', async ({ page }) => {
  const catatan = await cegatIklan(page)
  await page.goto(`/${SLUG.panduan}`)
  const slot = page.locator('[data-slot-iklan]')
  await expect(slot).toHaveCount(2)
  await gulirSampaiBawah(page)
  await page.waitForLoadState('networkidle')
  for (const s of await slot.all()) await expect(s).toBeHidden()
  await page.getByRole('region', { name: 'Cookie dan iklan' }).getByRole('button', { name: 'Hanya yang perlu' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-persetujuan', 'perlu')
  await gulirSampaiBawah(page)
  await page.waitForLoadState('networkidle')
  for (const s of await slot.all()) await expect(s).toBeHidden()
  expect(catatan).toEqual({ skrip: [], lain: [] })
  expect(await iklanTiruan(page)).toBeNull()
})

test('Izinkan semua: Consent Mode diatur sebelum skrip iklan, skrip dimuat sekali saat slot hampir terlihat, dan ukuran wadah dipesan sebelum iklan terisi', async ({ page }) => {
  const catatan = await cegatIklan(page)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`/${SLUG.panduan}`)
  await page.getByRole('region', { name: 'Cookie dan iklan' }).getByRole('button', { name: 'Izinkan semua' }).click()
  const akhir = page.locator('[data-slot-iklan="artikel-akhir"]')
  await expect(akhir).toBeVisible()
  await expect(akhir.getByText('Advertisements', { exact: true })).toBeVisible()
  const kotak = akhir.locator('[data-kotak-iklan]')
  expect(await kotak.boundingBox()).toMatchObject({ width: 336, height: 280 })
  await expect(kotak.locator('ins')).toHaveCount(0)

  await akhir.scrollIntoViewIfNeeded()
  const ins = kotak.locator('ins.adsbygoogle')
  await expect(ins).toHaveAttribute('data-ad-status', 'filled')
  await expect(ins).toHaveAttribute('data-ad-client', PENERBIT_E2E)
  await expect(ins).toHaveAttribute('data-ad-slot', '2222222222')
  await expect(ins).toHaveAttribute('data-adtest', 'on')
  expect(await kotak.boundingBox()).toMatchObject({ width: 336, height: 280 })
  await gulirSampaiBawah(page)
  await expect(page.locator('ins[data-ad-status="filled"]')).toHaveCount(2)
  expect(catatan).toEqual({ skrip: [`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${PENERBIT_E2E}`], lain: [] })
  expect((await iklanTiruan(page))?.dataLayer).toEqual([
    ['consent', 'default', DITOLAK],
    ['consent', 'update', IKLAN_DIIZINKAN],
  ])
})

test('tidak ada iklan di kotak Intinya atau di atas H1; iklan tengah setelah paragraf ketiga dan iklan akhir sebelum sumber', async ({ page }) => {
  await sudahMemilih(page.context(), 'semua')
  await cegatIklan(page)
  await page.goto(`/${SLUG.panduan}`)
  await expect(page.locator('[data-slot-iklan]')).toHaveCount(2)
  await expect(page.getByRole('region', { name: 'Intinya', exact: true }).locator('[data-slot-iklan]')).toHaveCount(0)
  const h1 = (await page.getByRole('heading', { level: 1 }).boundingBox())!
  const intinya = (await page.getByRole('region', { name: 'Intinya', exact: true }).boundingBox())!
  for (const slot of await page.locator('[data-slot-iklan]').all()) {
    expect((await slot.boundingBox())!.y).toBeGreaterThan(Math.max(h1.y + h1.height, intinya.y + intinya.height))
  }
  const tengah = page.locator('[data-slot-iklan="artikel-tengah"]')
  expect(await tengah.evaluate((el) => el.previousElementSibling?.textContent)).toMatch(/^Kategori TER ditentukan status PTKP/)
  // Jarak 32 px dari isi di atas dan di bawahnya, lebih lebar dari jarak antarparagraf.
  const jarak = await tengah.evaluate((el) => {
    const s = el.getBoundingClientRect()
    return [s.top - el.previousElementSibling!.getBoundingClientRect().bottom, el.nextElementSibling!.getBoundingClientRect().top - s.bottom]
  })
  expect(jarak.map(Math.round)).toEqual([32, 32])
  const akhir = (await page.locator('[data-slot-iklan="artikel-akhir"]').boundingBox())!
  expect(akhir.y).toBeLessThan((await page.getByRole('region', { name: 'Sumber' }).boundingBox())!.y)
})

test('CLS 0 di halaman berslot iklan: sebelum memilih, setelah Izinkan semua, dan saat kembali dengan pilihan tersimpan', async ({ page }) => {
  await cegatIklan(page)
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`/${SLUG.panduan}`)
  await gulirSampaiBawah(page)
  expect(await cls(page)).toBe(0)

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.getByRole('region', { name: 'Cookie dan iklan' }).getByRole('button', { name: 'Izinkan semua' }).click()
  await gulirSampaiBawah(page)
  await expect(page.locator('ins[data-ad-status="filled"]')).toHaveCount(2)
  expect(await cls(page)).toBe(0)

  await page.reload()
  await gulirSampaiBawah(page)
  await expect(page.locator('ins[data-ad-status="filled"]')).toHaveCount(2)
  expect(await cls(page)).toBe(0)
})

test('menarik persetujuan: Hanya yang perlu setelah Izinkan semua menghapus cookie iklan, memuat ulang halaman, dan iklan tidak dimuat lagi', async ({ page }) => {
  await sudahMemilih(page.context(), 'semua')
  const catatan = await cegatIklan(page)
  await page.goto(`/${SLUG.panduan}`)
  await gulirSampaiBawah(page)
  await expect(page.locator('ins[data-ad-status="filled"]')).toHaveCount(2)
  expect((await page.context().cookies()).map((k) => k.name)).toEqual(expect.arrayContaining(['__gads', '__gpi']))

  await page.getByRole('button', { name: 'Pengaturan cookie' }).click()
  await Promise.all([page.waitForEvent('load'), page.getByRole('region', { name: 'Cookie dan iklan' }).getByRole('button', { name: 'Hanya yang perlu' }).click()])
  await expect(page.locator('html')).toHaveAttribute('data-persetujuan', 'perlu')
  const sisa = (await page.context().cookies()).map((k) => k.name)
  expect(sisa).not.toContain('__gads')
  expect(sisa).not.toContain('__gpi')
  await gulirSampaiBawah(page)
  await page.waitForLoadState('networkidle')
  for (const s of await page.locator('[data-slot-iklan]').all()) await expect(s).toBeHidden()
  expect(catatan.skrip).toHaveLength(1)
  expect(await iklanTiruan(page)).toBeNull()
})

test('iklan rubrik setelah daftar tulisan, iklan tools setelah penjelasan dan di luar kalkulator, iklan beranda di tempat blok Slot iklan', async ({ page }) => {
  await sudahMemilih(page.context(), 'semua')
  await cegatIklan(page)
  const kotak = async (lokasi: ReturnType<Page['locator']>) => (await lokasi.boundingBox())!

  await page.goto('/uang-karier')
  const rubrik = page.locator('[data-slot-iklan="rubrik"]')
  await expect(rubrik).toBeVisible()
  const tulisan = await kotak(page.getByRole('region', { name: 'Tulisan terbaru' }))
  expect((await kotak(rubrik)).y).toBeGreaterThan(tulisan.y + tulisan.height)

  await page.goto('/tools/gaji-bersih')
  const tools = page.locator('[data-slot-iklan="tools"]')
  await expect(tools).toBeVisible()
  await expect(page.locator('#kalkulator [data-slot-iklan]')).toHaveCount(0)
  const kalkulator = await kotak(page.locator('#kalkulator'))
  expect((await kotak(tools)).y).toBeGreaterThan(kalkulator.y + kalkulator.height)

  await page.goto('/')
  const beranda = page.locator('[data-slot-iklan="beranda-samping"]')
  await expect(beranda).toBeVisible()
  expect(await kotak(beranda.locator('[data-kotak-iklan]'))).toMatchObject({ width: 320, height: 100 })
  const populer = await kotak(page.getByRole('region', { name: 'Paling dicari pekan ini' }))
  const newsletter = await kotak(page.getByRole('complementary', { name: 'Newsletter' }))
  expect((await kotak(beranda)).y).toBeGreaterThan(Math.max(populer.y + populer.height, newsletter.y + newsletter.height))
})

test('jarak slot iklan beranda sama dengan jarak antarbagian lain (56 px) di 375 dan 1440 px', async ({ page }) => {
  await sudahMemilih(page.context(), 'semua')
  await cegatIklan(page)
  for (const lebar of [375, 1440]) {
    await page.setViewportSize({ width: lebar, height: 900 })
    await page.goto('/')
    // Bagian sebelumnya: tulisan terbaru dengan newsletter di kolom sampingnya (di bawahnya di layar sempit).
    const populer = (await page.getByRole('region', { name: 'Paling dicari pekan ini' }).boundingBox())!
    const newsletter = (await page.getByRole('complementary', { name: 'Newsletter' }).boundingBox())!
    const bawah = Math.max(populer.y + populer.height, newsletter.y + newsletter.height)
    const iklan = (await page.locator('[data-slot-iklan="beranda-samping"]').boundingBox())!
    expect(Math.round(iklan.y - bawah), `${lebar}px`).toBe(56)
  }
})

for (const path of ['/', '/uang-karier', `/${SLUG.panduan}`, '/tools/gaji-bersih']) {
  test(`halaman ${path} dengan iklan terisi di 375 px lolos axe dan tanpa geser horizontal`, async ({ page }) => {
    await sudahMemilih(page.context(), 'semua')
    await cegatIklan(page)
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto(path)
    await gulirSampaiBawah(page)
    await expect(page.locator('[data-slot-iklan] ins[data-ad-status="filled"]').first()).toBeAttached()
    await periksaTanpaGeserHorizontal(page)
    await periksaAxe(page)
  })
}
