import { expect, test, type Page } from '@playwright/test'

import { periksaAxe, periksaTanpaGeserHorizontal } from './bantu'
import { ADMIN_E2E, h2, isi, p, UKURAN_LAYAR } from './data'

/**
 * Draf buatan tes di file ini, dihapus setelah setiap tes supaya daftar artikel admin di spec lain (kolom status indeks di
 * `indexing.spec.ts`) tetap berisi contoh E2E saja. `overrideLock`: draf masih terkunci untuk pengguna yang membukanya.
 */
const drafTes: number[] = []

test.afterEach(async ({ page }) => {
  await page.goto('about:blank')
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  for (const id of drafTes.splice(0)) expect((await page.request.delete(`/api/artikel/${id}?overrideLock=true`)).status()).toBe(200)
})

/**
 * Masuk sebagai editor baru. Asisten membatasi 6 permintaan AI per menit per pengguna, jadi setiap tes yang
 * memanggil AI memakai penggunanya sendiri (sekaligus menguji bahwa editor, bukan hanya admin, boleh memakai).
 */
async function masukEditor(page: Page) {
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  const email = `editor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@point.lat`
  const password = 'e2e-editor-hanya-untuk-tes'
  expect((await page.request.post('/api/pengguna', { data: { email, password, nama: 'Editor E2E', peran: 'editor' } })).status()).toBe(201)
  await page.request.post('/api/pengguna/login', { data: { email, password } })
}

/** Draf artikel baru lewat REST oleh pengguna yang sedang masuk (draf tidak divalidasi, jadi cukup isian yang diuji). */
async function drafBaru(page: Page, data: Record<string, unknown> = {}, sebagai: 'admin' | 'editor' = 'editor'): Promise<number> {
  if (sebagai === 'admin') await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  else await masukEditor(page)
  const jawaban = await page.request.post('/api/artikel?draft=true', { data: { judul: `Draf asisten ${Date.now()}`, _status: 'draft', ...data } })
  expect(jawaban.status()).toBe(201)
  const id = ((await jawaban.json()) as { doc: { id: number } }).doc.id
  drafTes.push(id)
  return id
}

async function idPilar(page: Page, slug: string): Promise<number> {
  const jawaban = await page.request.get(`/api/pilar?where[slug][equals]=${slug}&depth=0`)
  return ((await jawaban.json()) as { docs: { id: number }[] }).docs[0].id
}

const ISI_ARTIKEL = {
  deck: 'Cara menghitung gaji bersih bulanan.',
  intinya: [{ poin: 'Poin lama pertama.' }, { poin: 'Poin lama kedua.' }],
  isi: isi(h2('Apa itu gaji bersih'), p('Gaji bersih adalah gaji kotor dikurangi PPh 21 dan iuran BPJS.')),
}

async function bukaAsisten(page: Page, id: number) {
  await page.goto(`/admin/collections/artikel/${id}`)
  const panel = page.getByRole('region', { name: 'Asisten AI' })
  await panel.scrollIntoViewIfNeeded()
  return panel
}

/** Isian dari state form admin (`name` input Payload sama dengan path field). */
const nilaiInput = (page: Page, awalan: string) =>
  page.evaluate((a) => [...document.querySelectorAll<HTMLInputElement>(`[name^="${a}"]`)].filter((e) => !e.name.endsWith('.id')).map((e) => e.value), awalan)

test('artikel yang memakai draf AI: tombol terbit nonaktif sampai ketiga butir review dicentang', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  const id = await drafBaru(page, { pakaiDrafAi: true }, 'admin')
  await page.goto(`/admin/collections/artikel/${id}`)
  const terbit = page.locator('#action-save')
  await expect(terbit).toBeDisabled()
  await periksaTanpaGeserHorizontal(page)
  await expect(terbit).toHaveAccessibleName('Publikasikan perubahan. Artikel ini memakai draf AI. Centang ketiga butir Review sebelum terbit di sidebar dulu.')
  await expect(page.getByRole('checkbox', { name: 'Memakai draf AI' })).toBeDisabled()
  // Payload baru merender isi grup saat grup terlihat di layar (RenderIfInViewport).
  await page.locator('#field-reviewAi').scrollIntoViewIfNeeded()
  await expect(page.locator('#petunjuk-review-ai p')).toHaveText(
    'Artikel ini memakai draf AI. Centang ketiga butir di bawah setelah kamu memeriksanya; tombol terbit aktif setelah semuanya dicentang.',
  )
  await expect(page.locator('#petunjuk-review-ai li')).toHaveCount(3)
  await periksaAxe(page, '.field-description-pakaiDrafAi', '#field-reviewAi')

  for (const label of ['Sumber sudah dicek', 'Angka sudah dicek']) await page.getByRole('checkbox', { name: label, exact: true }).check()
  await expect(terbit).toBeDisabled()
  await page.getByRole('checkbox', { name: 'Insight atau pengalaman penulis sudah ditambahkan', exact: true }).check()
  await expect(terbit).toBeEnabled()
  await expect(terbit).toHaveAccessibleName('Publikasikan perubahan')
})

test('artikel tanpa draf AI: checklist review tidak tampil dan tombol terbit aktif', async ({ page }) => {
  const id = await drafBaru(page, {}, 'admin')
  await page.goto(`/admin/collections/artikel/${id}`)
  await expect(page.locator('#action-save')).toBeEnabled()
  await expect(page.getByRole('checkbox', { name: 'Sumber sudah dicek', exact: true })).toHaveCount(0)
  await periksaAxe(page, '.field-description-pakaiDrafAi')
})

test('saran meta dari adapter palsu: judul SEO dan Intinya diterapkan hanya lewat tombol, Intinya menandai draf AI, dan Batalkan mengembalikan poin lama', async ({ page }) => {
  const id = await drafBaru(page, ISI_ARTIKEL)
  const panel = await bukaAsisten(page, id)
  await expect(panel).toContainText('Mode palsu: hasil AI berupa contoh, bukan dari Claude.')
  await expect(panel).toContainText(
    'Tombol AI mengirim teks yang dibutuhkan tugasnya ke Claude (Anthropic) untuk diproses. Jangan tulis data pribadi di catatan penulis.',
  )
  await expect(panel).toContainText(/Anggaran bulan ini: US\$[\d,]+ dari US\$10,00 terpakai\./)

  await panel.getByRole('button', { name: 'Buat saran meta' }).click()
  await expect(panel.getByRole('status').filter({ hasText: 'Saran meta siap' })).toHaveText('Saran meta siap. Pilih isian yang mau kamu pakai.')
  await expect(page.getByRole('checkbox', { name: 'Memakai draf AI' })).not.toBeChecked()
  await periksaAxe(page, '.asisten')

  await panel.getByRole('button', { name: 'Pakai judul SEO ini' }).click()
  await expect(panel.getByRole('button', { name: 'Batalkan Judul SEO' })).toBeFocused()
  await panel.getByRole('button', { name: 'Ganti poin Intinya' }).click()
  await expect
    .poll(() => nilaiInput(page, 'intinya.'))
    .toEqual(['Poin pertama contoh dari adapter palsu.', 'Poin kedua contoh dari adapter palsu.', 'Poin ketiga contoh dari adapter palsu.'])
  await expect(page.getByRole('checkbox', { name: 'Memakai draf AI' })).toBeChecked()
  await expect(page.locator('#action-save')).toBeDisabled()

  await panel.getByRole('button', { name: 'Batalkan Intinya' }).click()
  await expect.poll(() => nilaiInput(page, 'intinya.')).toEqual(['Poin lama pertama.', 'Poin lama kedua.'])
  await page.locator('.tabs-field__tab-button', { hasText: 'SEO' }).click()
  await expect(page.getByLabel('Judul SEO', { exact: true })).toHaveValue('Contoh judul SEO dari adapter palsu untuk uji asisten')
})

test('brief dari keyword: perkiraan Claude terpisah dari data point., sumber resmi pilar, dan brief tersimpan bersama draf', async ({ page }) => {
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  const pilar = await idPilar(page, 'uang-karier')
  const id = await drafBaru(page, { ...ISI_ARTIKEL, pilar, tipe: 'explainer', seo: { keyphrase: 'cara hitung gaji bersih' } })
  const panel = await bukaAsisten(page, id)
  await expect(panel.getByLabel('Keyword')).toHaveValue('cara hitung gaji bersih')
  await panel.getByRole('button', { name: 'Buat brief' }).click()
  await expect(panel.getByRole('status').filter({ hasText: 'Brief siap' })).toHaveText('Brief siap dan tersimpan bersama draf artikel.')
  const brief = panel.locator('details', { hasText: 'Brief untuk "cara hitung gaji bersih"' })
  await expect(brief.getByRole('heading', { name: 'Perkiraan Claude, perlu kamu nilai' })).toBeVisible()
  await expect(brief).toContainText('Contoh bagian pertama dari adapter palsu')
  await expect(brief).toContainText('Brief menyarankan format Panduan, sedangkan tipe artikel sekarang Explainer.')
  await expect(brief.getByRole('heading', { name: 'Dari database point.' })).toBeVisible()
  await expect(brief.getByRole('link', { name: 'Direktorat Jenderal Pajak (DJP)' })).toHaveAttribute('href', 'https://www.pajak.go.id')
  // Saran link internal sepilar menautkan dokumen di admin (artikel contoh E2E di Uang & Karier).
  await expect(brief.locator('a[href^="/admin/collections/artikel/"]').first()).toBeVisible()
  await periksaAxe(page, '.asisten')

  // Brief ikut autosave draf: setelah halaman dibuka lagi, brief masih ada.
  await expect.poll(async () => ((await (await page.request.get(`/api/artikel/${id}?draft=true&depth=0`)).json()) as { briefAi?: unknown }).briefAi ?? null).not.toBeNull()
  const lagi = await bukaAsisten(page, id)
  await expect(lagi.getByText('Brief untuk "cara hitung gaji bersih"')).toBeVisible()
  await expect(lagi.getByRole('button', { name: 'Buat ulang brief' })).toBeEnabled()
})

test('draf per bagian: H2 dari outline brief dan catatan penulis, pratinjau, lalu Salin draf mengisi papan klip dan menandai draf AI', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const id = await drafBaru(page, ISI_ARTIKEL)
  const panel = await bukaAsisten(page, id)
  await panel.getByLabel('Keyword').fill('cara hitung gaji bersih')
  await panel.getByRole('button', { name: 'Buat brief' }).click()
  await expect(panel.getByRole('status').filter({ hasText: 'Brief siap' })).toBeVisible()

  await panel.getByLabel('Bagian dari brief').selectOption('Contoh bagian kedua dari adapter palsu')
  await expect(panel.getByLabel('Subjudul (H2)')).toHaveValue('Contoh bagian kedua dari adapter palsu')
  await panel.getByLabel('Catatan penulis').fill('Gaji pokok Rp10.000.000, sudah dicek di slip.')
  await panel.getByRole('button', { name: 'Tulis draf bagian' }).click()
  await expect(panel.getByRole('status').filter({ hasText: 'Draf bagian siap' })).toHaveText('Draf bagian siap. Salin, tempel di editor isi, lalu tulis ulang.')
  const draf = panel.locator('.asisten-draf')
  await expect(draf.locator('.asisten-draf__h2')).toHaveText('Contoh bagian kedua dari adapter palsu')
  await expect(draf).toContainText('Paragraf contoh dari adapter palsu, bukan tulisan Claude.')
  await expect(panel).toContainText('1 em dash atau en dash diganti koma atau tanda hubung.')
  await expect(page.getByRole('checkbox', { name: 'Memakai draf AI' })).not.toBeChecked()
  await periksaAxe(page, '.asisten')

  await panel.getByRole('button', { name: 'Salin draf' }).click()
  await expect(panel.getByRole('status').filter({ hasText: 'Tersalin' })).toHaveText('Tersalin.')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'Contoh bagian kedua dari adapter palsu\n\nParagraf contoh dari adapter palsu, bukan tulisan Claude.\n\nContoh subbagian dari adapter palsu\n\n- Butir contoh pertama.\n\n- Butir contoh kedua.',
  )
  await expect(page.getByRole('checkbox', { name: 'Memakai draf AI' })).toBeChecked()
  await expect(page.locator('#action-save')).toBeDisabled()
})

test('galat API Claude: pesan jelas di sidebar, editor tetap bisa menulis', async ({ page }) => {
  const id = await drafBaru(page, { ...ISI_ARTIKEL, isi: isi(p('Teks uji [uji galat] untuk adapter palsu.')) })
  const panel = await bukaAsisten(page, id)
  await panel.getByRole('button', { name: 'Buat saran meta' }).click()
  await expect(panel.getByRole('status').filter({ hasText: 'Claude' })).toHaveText('Claude sedang sibuk atau bermasalah (529, overloaded_error). Coba lagi beberapa menit lagi.')
  await expect(panel.getByRole('button', { name: 'Buat saran meta' })).toBeEnabled()
  await expect(page.getByLabel('Deck')).toBeEditable()
  await periksaAxe(page, '.asisten')
})

test('anggaran habis: tombol AI nonaktif dengan alasannya, cek pola dan cek klaim tetap bisa dipakai', async ({ page }) => {
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  expect((await page.request.post('/api/globals/asisten-ai', { data: { anggaranBulanan: 0 } })).status()).toBe(200)
  try {
    const id = await drafBaru(page, ISI_ARTIKEL)
    const panel = await bukaAsisten(page, id)
    await expect(panel).toContainText('Anggaran AI bulan ini sudah habis. Tombol AI aktif lagi awal bulan depan, atau setelah admin menaikkan anggaran.')
    await expect(panel.getByRole('button', { name: 'Buat saran meta' })).toBeDisabled()
    await panel.getByRole('button', { name: 'Cek pola tulisan' }).click()
    await expect(panel.getByRole('status').filter({ hasText: 'kalimat' })).toHaveText('Tidak ada tanda di 5 kalimat.')
    await periksaAxe(page, '.asisten')
  } finally {
    await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
    await page.request.post('/api/globals/asisten-ai', { data: { anggaranBulanan: 10 } })
  }
})

test('cek pola dan cek klaim di browser: tanda per kalimat dengan letak dan alasan, klaim tanpa sumber di atas', async ({ page }) => {
  const id = await drafBaru(page, {
    ...ISI_ARTIKEL,
    isi: isi(
      p('Di era digital ini, gaji dibayar lewat bank \u2014 cepat dan aman. Tak hanya itu, slip gaji juga digital.'),
      p('Menurut penelitian, 70 persen karyawan tidak membaca slip gaji.'),
      h2('Kesimpulan'),
      p('Semoga bermanfaat.'),
    ),
  })
  const panel = await bukaAsisten(page, id)
  await panel.getByRole('button', { name: 'Cek pola tulisan' }).click()
  await expect(panel.getByRole('status').filter({ hasText: 'tanda di' })).toHaveText('5 tanda di 8 kalimat.')
  const pola = panel.getByRole('list').filter({ hasText: 'Frasa klise' })
  await expect(pola.getByRole('listitem')).toHaveCount(5)
  await expect(pola.getByRole('listitem').first()).toContainText('Paragraf 1')
  await expect(pola.getByRole('listitem').first()).toContainText('"Di era digital ini": Pembuka klise yang sering muncul di tulisan AI. Langsung ke jawabannya.')

  await panel.getByRole('button', { name: 'Cek klaim' }).click()
  await expect(panel.getByRole('status').filter({ hasText: 'klaim perlu dicek' })).toHaveText('1 dari 1 klaim perlu dicek. Blok Sumber masih kosong.')
  await expect(panel.getByRole('list').filter({ hasText: '70 persen' }).getByRole('listitem')).toContainText('Tanpa sumber')
  await periksaAxe(page, '.asisten')
})

for (const { lebar, tinggi } of UKURAN_LAYAR) {
  test(`sidebar Asisten AI ${lebar}px dengan hasil: tanpa geser horizontal dan lolos axe`, async ({ page }) => {
    await page.setViewportSize({ width: lebar, height: tinggi })
    const id = await drafBaru(page, ISI_ARTIKEL)
    const panel = await bukaAsisten(page, id)
    await panel.getByRole('button', { name: 'Buat saran meta' }).click()
    await expect(panel.getByRole('button', { name: 'Tambahkan ke FAQ' })).toBeVisible()
    await panel.getByRole('button', { name: 'Cek klaim' }).click()
    await expect(panel.getByRole('status').filter({ hasText: 'klaim' })).toHaveText('Tidak ada angka atau klaim beratribusi.')
    await periksaTanpaGeserHorizontal(page)
    await periksaAxe(page, '.asisten')
  })
}
