import { expect, test } from '@playwright/test'

import { KUNCI_INDEXNOW } from './data'

test('file kunci IndexNow di /{kunci}.txt berisi kunci dari pengaturan SEO; kunci lain 404', async ({ request }) => {
  const jawaban = await request.get(`/${KUNCI_INDEXNOW}.txt`)
  expect(jawaban.status()).toBe(200)
  expect(jawaban.headers()['content-type']).toBe('text/plain; charset=utf-8')
  expect(await jawaban.text()).toBe(KUNCI_INDEXNOW)

  expect((await request.get('/kunci-yang-salah-2026.txt')).status()).toBe(404)
  expect((await request.get('/robots.txt')).status()).toBe(200)
})
