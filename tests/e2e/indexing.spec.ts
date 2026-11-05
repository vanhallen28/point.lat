import { expect, test, type APIRequestContext } from '@playwright/test'

import { periksaAxe } from './bantu'
import { ADMIN_E2E, isi, JUDUL_PANDUAN, KUNCI_INDEXNOW, p } from './data'

async function masuk(request: APIRequestContext): Promise<Record<string, string>> {
  const { token } = await (await request.post('/api/pengguna/login', { data: ADMIN_E2E })).json()
  return { Authorization: `JWT ${token}` }
}

async function dokumenPertama(request: APIRequestContext, auth: Record<string, string>, path: string) {
  return (await (await request.get(path, { headers: auth })).json()).docs[0]
}

test('file kunci IndexNow di /{kunci}.txt berisi kunci dari pengaturan SEO; kunci lain 404', async ({ request }) => {
  const jawaban = await request.get(`/${KUNCI_INDEXNOW}.txt`)
  expect(jawaban.status()).toBe(200)
  expect(jawaban.headers()['content-type']).toBe('text/plain; charset=utf-8')
  expect(await jawaban.text()).toBe(KUNCI_INDEXNOW)

  expect((await request.get('/kunci-yang-salah-2026.txt')).status()).toBe(404)
  expect((await request.get('/robots.txt')).status()).toBe(200)
})

test('admin: status pemasangan, peringatan Indexing API, dan kolom status indeks di daftar artikel', async ({ page }) => {
  await page.request.post('/api/pengguna/login', { data: ADMIN_E2E })
  await page.goto('/admin/globals/pengaturan-seo')
  const pemasangan = page.getByRole('region', { name: 'Status pemasangan Mesin Indexing' })
  await expect(pemasangan).toContainText('Palsu: tidak ada yang dikirim ke luar.')
  await expect(pemasangan).toContainText(`Kunci tersimpan dan dilayani di /${KUNCI_INDEXNOW}.txt.`)
  const peringatan = page.getByRole('note', { name: 'Indexing API bukan untuk artikel' })
  await expect(peringatan.getByRole('link', { name: 'Baca ketentuan Indexing API' })).toHaveAttribute(
    'href',
    'https://developers.google.com/search/apis/indexing-api/v3/using-api',
  )
  await expect(page.getByRole('checkbox', { name: 'Kabari Google lewat Indexing API' })).not.toBeChecked()
  await periksaAxe(page, '.indexing-pemasangan', '.indexing-peringatan')

  // Tab dari isian sebelumnya sampai tautan ketentuan: cincin fokus terlihat (CSS admin Payload menghapusnya).
  await page.getByLabel('Batas cek status per hari').focus()
  await page.keyboard.press('Tab')
  const tautan = peringatan.getByRole('link', { name: 'Baca ketentuan Indexing API' })
  await expect(tautan).toBeFocused()
  expect(await tautan.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid')

  await page.goto('/admin/collections/artikel')
  await expect(page.getByRole('columnheader', { name: 'Status indeks' })).toBeVisible()
  await expect(page.getByRole('row').filter({ hasText: JUDUL_PANDUAN })).toContainText('Belum dicek')
})

test('alur editor: buat dan terbitkan artikel, URL masuk sitemap dan news sitemap, log indexing tercatat; batal terbit mengeluarkannya', async ({
  request,
}) => {
  const auth = await masuk(request)
  const pilar = await dokumenPertama(request, auth, '/api/pilar?where[slug][equals]=uang-karier')
  const penulis = await dokumenPertama(request, auth, '/api/penulis?where[slug][equals]=redaksi')
  const gambar = await dokumenPertama(request, auth, '/api/media?where[alt][equals]=Slip gaji karyawan')
  const slug = `lapor-spt-tahunan-${Date.now()}`
  const url = `https://point.lat/${slug}`

  const draf = await request.post('/api/artikel?draft=true', {
    headers: auth,
    data: {
      _status: 'draft',
      judul: 'Cara lapor SPT tahunan karyawan',
      slug,
      tipe: 'panduan',
      pilar: pilar.id,
      penulis: penulis.id,
      deck: 'Langkah lapor SPT 1770 S lewat Coretax, dari bukti potong sampai bukti terima.',
      intinya: [{ poin: 'Siapkan bukti potong 1721-A1 dari kantor.' }, { poin: 'Lapor paling lambat 31 Maret.' }],
      gambarUtama: gambar.id,
      isi: isi(p('Lapor SPT tahunan bisa selesai dalam lima belas menit.')),
    },
  })
  expect(draf.status()).toBe(201)
  const { doc } = await draf.json()
  expect((await request.get('/sitemap/artikel.xml')).ok()).toBe(true)
  expect(await (await request.get('/sitemap/artikel.xml')).text()).not.toContain(url)

  const terbit = await request.patch(`/api/artikel/${doc.id}`, { headers: auth, data: { _status: 'published' } })
  expect(terbit.status()).toBe(200)
  await expect.poll(async () => (await request.get('/sitemap/artikel.xml')).text()).toContain(`<loc>${url}</loc>`)
  await expect.poll(async () => (await request.get('/news-sitemap.xml')).text()).toContain(`<loc>${url}</loc>`)

  // Langkah 1 dicatat saat simpan; IndexNow dikirim `after()` setelah respons (adapter palsu di E2E).
  const log = async () => {
    const { docs } = await (await request.get(`/api/log-indexing?where[url][equals]=${encodeURIComponent(url)}&sort=waktu&limit=20`, { headers: auth })).json()
    return docs.map((d: { langkah: string; jenis: string; status: string; adapter: string }) => `${d.langkah} ${d.jenis} ${d.status} ${d.adapter}`)
  }
  await expect.poll(log).toEqual(['revalidasi terbit berhasil next', 'indexnow terbit berhasil palsu'])
  expect(await dokumenPertama(request, auth, `/api/status-indeks?where[path][equals]=/${slug}`)).toMatchObject({ status: 'belum-dicek' })
  expect((await dokumenPertama(request, auth, `/api/antrean-indexing?where[path][equals]=/${slug}`)).langkah).toBe('cek-status')

  // Batal terbit: keluar dari sitemap, dicatat sebagai hapus; IndexNow menunggu jendela 5 menit sejak kiriman tadi.
  expect((await request.patch(`/api/artikel/${doc.id}`, { headers: auth, data: { _status: 'draft' } })).status()).toBe(200)
  await expect.poll(async () => (await request.get('/sitemap/artikel.xml')).text()).not.toContain(url)
  await expect.poll(log).toEqual(['revalidasi terbit berhasil next', 'indexnow terbit berhasil palsu', 'revalidasi hapus berhasil next'])
  expect(await dokumenPertama(request, auth, `/api/antrean-indexing?where[path][equals]=/${slug}`)).toMatchObject({ langkah: 'indexnow', jenis: 'hapus' })
  expect(await dokumenPertama(request, auth, `/api/status-indeks?where[path][equals]=/${slug}`)).toBeUndefined()
  expect((await request.get(`/${slug}`)).status()).toBe(404)
})
