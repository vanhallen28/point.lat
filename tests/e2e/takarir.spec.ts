import { expect, test } from '@playwright/test'

import { cegatCloudinary } from './bantu'
import { SLUG_VIDEO } from './data'

test.beforeEach(async ({ page }) => {
  await cegatCloudinary(page)
})

test('video bertakarir: track captions bahasa Indonesia dan berkas WebVTT', async ({ page, request }) => {
  await page.goto(`/video/${SLUG_VIDEO.pph21}`)
  const track = page.locator('video track[kind="captions"]')
  await expect(track).toHaveAttribute('srclang', 'id')
  await expect(track).toHaveAttribute('src', `/video/${SLUG_VIDEO.pph21}/takarir.vtt`)
  const vtt = await request.get(`/video/${SLUG_VIDEO.pph21}/takarir.vtt`)
  expect(vtt.status()).toBe(200)
  expect(vtt.headers()['content-type']).toBe('text/vtt; charset=utf-8')
  expect(await vtt.text()).toMatch(/^WEBVTT\n\n00:00\.000 --> 00:03\.000\nAmbil slip gaji bulan lalu\./)
})

test('video tanpa takarir: tanpa track dan berkas takarirnya 404', async ({ page, request }) => {
  await page.goto(`/video/${SLUG_VIDEO.otp}`)
  await expect(page.locator('video')).toHaveCount(1)
  await expect(page.locator('video track')).toHaveCount(0)
  expect((await request.get(`/video/${SLUG_VIDEO.otp}/takarir.vtt`)).status()).toBe(404)
  expect((await request.get(`/video/${SLUG_VIDEO.draf}/takarir.vtt`)).status()).toBe(404)
})
