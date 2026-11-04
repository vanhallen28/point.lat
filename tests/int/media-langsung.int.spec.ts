import config from '@payload-config'
import { handleEndpoints } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { klienMedia } from '@/modules/media'
import type { KlienPalsu } from '@/modules/media/palsu'
import { PATH_TANDA_TANGAN } from '@/modules/media/tandaTangan'

import { gambarPng, videoMp4 } from './fixtures'
import { getTestPayload, unik } from './helpers'

const klien = () => klienMedia() as KlienPalsu
const BASIS = 'http://localhost:3000/api'

let token = ''

async function api(path: string, init: RequestInit & { json?: unknown } = {}) {
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `JWT ${token}`)
  let body = init.body
  if (init.json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(init.json)
  }
  const respons = await handleEndpoints({
    config,
    request: new Request(`${BASIS}${path}`, { method: init.method ?? 'POST', headers, body }),
  })
  return { status: respons.status, data: await respons.json().catch(() => null) }
}

type Persiapan = {
  urlUnggah: string
  field: Record<string, string>
  clientUploadContext: { publicId: string; signedReceipt: string }
}

/** Langkah browser: minta tanda tangan, unggah langsung ke "Cloudinary", lalu buat dokumen. */
async function unggahLangsung(berkas: { data: Buffer; mimetype: string; name: string }, alt?: string) {
  const persiapan = await api(PATH_TANDA_TANGAN, {
    json: { collectionSlug: 'media', filename: berkas.name, filesize: berkas.data.length, mimeType: berkas.mimetype },
  })
  expect(persiapan.status).toBe(200)
  const { field, urlUnggah, clientUploadContext } = persiapan.data as Persiapan
  await klien().unggahDariBrowser(field, {
    buffer: berkas.data,
    mimeType: berkas.mimetype,
    ...(berkas.mimetype.startsWith('image/') ? { width: 3000, height: 2000 } : {}),
  })

  const form = new FormData()
  form.append('_payload', JSON.stringify(alt ? { alt } : {}))
  form.append(
    'file',
    JSON.stringify({
      clientUploadContext,
      collectionSlug: 'media',
      filename: berkas.name,
      mimeType: berkas.mimetype,
      size: berkas.data.length,
    }),
  )
  const dibuat = await api('/media', { body: form })
  return { dibuat, urlUnggah, field, publicId: clientUploadContext.publicId }
}

describe('unggah langsung dari browser ke Cloudinary', () => {
  beforeAll(async () => {
    const payload = await getTestPayload()
    const email = `${unik('editor')}@tes.local`
    await payload.create({
      collection: 'pengguna',
      data: { email, password: 'rahasia-123', nama: 'Editor Media' },
    })
    const masuk = await payload.login({ collection: 'pengguna', data: { email, password: 'rahasia-123' } })
    token = masuk.token!
  })

  it('menolak permintaan tanda tangan tanpa login', async () => {
    const simpan = token
    token = ''
    const hasil = await api(PATH_TANDA_TANGAN, {
      json: { collectionSlug: 'media', filename: 'a.png', filesize: 10, mimeType: 'image/png' },
    })
    token = simpan
    expect(hasil.status).toBe(403)
  })

  it('menolak jenis file di luar daftar', async () => {
    const hasil = await api(PATH_TANDA_TANGAN, {
      json: { collectionSlug: 'media', filename: 'film.mov', filesize: 10, mimeType: 'video/quicktime' },
    })
    expect(hasil.status).toBe(400)
    expect(JSON.stringify(hasil.data)).toContain('Jenis file tidak didukung')
  })

  it('gambar: browser mengunggah sendiri, server hanya menyimpan metadata Cloudinary', async () => {
    const berkas = await gambarPng(3000, 2000)
    const { dibuat, urlUnggah, field, publicId } = await unggahLangsung(berkas, 'Grafik dari browser')

    expect(urlUnggah).toBe('https://api.cloudinary.com/v1_1/palsu/image/upload')
    expect(field).toMatchObject({
      api_key: 'kunci-palsu',
      overwrite: 'false',
      transformation: 'c_limit,w_2560,q_auto',
      allowed_formats: 'jpg,png,webp,avif,gif',
    })
    expect(field.signature).toMatch(/^[0-9a-f]{40}$/)

    expect(dibuat.status).toBe(201)
    const doc = (dibuat.data as { doc: Record<string, unknown> }).doc
    expect(doc).toMatchObject({ publicId, jenis: 'gambar', width: 2560, height: 1707, alt: 'Grafik dari browser' })
    expect(doc.url).toBe(`https://res.cloudinary.com/palsu/image/upload/f_auto,q_auto/${publicId}`)
    // Tidak diunggah ulang oleh server.
    expect(klien().aset.get(publicId)?.lewat).toBe('browser')
  })

  it('video: turunan HLS, poster, dan MP4 diminta eager async', async () => {
    const { dibuat, urlUnggah, field, publicId } = await unggahLangsung(videoMp4())
    expect(urlUnggah).toBe('https://api.cloudinary.com/v1_1/palsu/video/upload')
    expect(field).toMatchObject({ eager: 'sp_auto/m3u8|so_auto/q_auto/jpg|q_auto/mp4', eager_async: 'true' })
    expect(dibuat.status).toBe(201)
    const doc = (dibuat.data as { doc: Record<string, unknown> }).doc
    expect(doc).toMatchObject({ publicId, jenis: 'video', durasi: 30, width: 1080, height: 1920 })
    expect(klien().aset.get(publicId)?.lewat).toBe('browser')
  })

  it('mengubah alt lewat REST tidak bisa mengganti publicId', async () => {
    const { dibuat, publicId } = await unggahLangsung(await gambarPng(1000, 800), 'Alt lama')
    const id = (dibuat.data as { doc: { id: number } }).doc.id
    const diubah = await api(`/media/${id}`, {
      method: 'PATCH',
      json: { alt: 'Alt baru', publicId: 'point/gambar/milik-orang-lain' },
    })
    expect(diubah.status).toBe(200)
    expect((diubah.data as { doc: Record<string, unknown> }).doc).toMatchObject({ alt: 'Alt baru', publicId })
  })

  it('menolak dokumen bila file tidak pernah sampai di Cloudinary', async () => {
    const berkas = await gambarPng(800, 600)
    const persiapan = await api(PATH_TANDA_TANGAN, {
      json: { collectionSlug: 'media', filename: berkas.name, filesize: berkas.size, mimeType: 'image/png' },
    })
    const { clientUploadContext } = persiapan.data as Persiapan
    const form = new FormData()
    form.append('_payload', JSON.stringify({ alt: 'Tidak pernah diunggah' }))
    form.append(
      'file',
      JSON.stringify({ clientUploadContext, collectionSlug: 'media', filename: berkas.name, mimeType: 'image/png', size: berkas.size }),
    )
    const hasil = await api('/media', { body: form })
    expect(hasil.status).toBeGreaterThanOrEqual(400)
  })

  it('menolak receipt yang publicId-nya diubah browser', async () => {
    const berkas = await gambarPng(800, 600)
    const persiapan = await api(PATH_TANDA_TANGAN, {
      json: { collectionSlug: 'media', filename: berkas.name, filesize: berkas.size, mimeType: 'image/png' },
    })
    const { clientUploadContext } = persiapan.data as Persiapan
    const [isi, tanda] = clientUploadContext.signedReceipt.split('.')
    const receipt = JSON.parse(Buffer.from(isi!, 'base64url').toString())
    receipt.context.publicId = 'point/gambar/milik-orang-lain'
    const palsu = `${Buffer.from(JSON.stringify(receipt)).toString('base64url')}.${tanda}`

    const form = new FormData()
    form.append('_payload', JSON.stringify({ alt: 'Dipalsukan' }))
    form.append(
      'file',
      JSON.stringify({
        clientUploadContext: { ...clientUploadContext, signedReceipt: palsu },
        collectionSlug: 'media',
        filename: berkas.name,
        mimeType: 'image/png',
        size: berkas.size,
      }),
    )
    const hasil = await api('/media', { body: form })
    expect(hasil.status).toBe(400)
    expect(JSON.stringify(hasil.data)).toContain('Invalid or expired client upload reference')
  })
})
